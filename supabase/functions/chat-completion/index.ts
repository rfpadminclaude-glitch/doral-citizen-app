// chat-completion — bilingual citizen-assistant turn handler.
//
// Pipeline:
//   1. Upsert conversation + persist user message.
//   2. Embed the user query (Gemini text-embedding-001 @ 768d).
//   3. Retrieve top-K matching document chunks via pgvector cosine RPC.
//   4. Compose system prompt with [Source N] markers.
//   5. Call llm-router (Groq → Gemini fallback) in JSON mode.
//   6. Parse {answer, sentiment, sentiment_score, tone_used, suggested_actions,
//      citations} and persist the assistant message with telemetry.
//   7. Return the assistant payload + sources to the caller.

import { complete } from '../_shared/llm-router.ts';
import { admin } from '../_shared/supabase.ts';
import { audit, hashIp } from '../_shared/audit.ts';
import { embedQuery } from '../_shared/embeddings.ts';

type Body = {
  session_id: string;
  message: string;
  lang?: 'en' | 'es';
  channel?: 'web' | 'sms' | 'whatsapp' | 'facebook';
  forceFail?: 'groq' | 'gemini';
};

type ParsedAnswer = {
  answer: string;
  sentiment: 'positive' | 'neutral' | 'negative' | 'frustrated' | 'urgent';
  sentiment_score: number;
  tone_used: 'warm' | 'empathetic' | 'crisp' | 'reassuring';
  suggested_actions: Array<'book_appointment' | 'create_request' | 'none'>;
  citations: number[];
};

type RetrievedChunk = {
  id: string;
  document_id: string;
  content: string;
  lang: string;
  heading_path: string[] | null;
  similarity: number;
};

type SourceForClient = {
  index: number;
  chunk_id: string;
  document_id: string;
  title: string;
  url?: string | null;
  similarity: number;
};

const SYSTEM_BASE_EN = `You are the City of Doral's bilingual citizen assistant. Reply in English.
Be concise, accurate, and helpful. If the user expresses frustration or urgency, switch to an empathetic tone and proactively offer human follow-up.

GROUNDING RULES:
- Use ONLY the information in the SOURCES section below when stating facts.
- Cite every grounded fact as [1], [2], etc., matching the numbered sources.
- If the sources do not cover the question, say so plainly and suggest calling 311 or the relevant department. Do not invent details.
- Never invent a phone number, address, or fee.

INTENT DETECTION (this rule is strict — respect user intent over your own judgment):
- If the user explicitly asks to book, schedule, reserve, or set up an appointment / consultation / inspection — even if you think it isn't strictly necessary — include "book_appointment" in suggested_actions. Trigger words include "book", "schedule", "appointment", "reserve", "set up a time".
- If the user wants to report an issue, file a complaint, or open a service request, include "create_request" in suggested_actions.
- If no action applies, use ["none"].
- You can include both "book_appointment" and "create_request" when relevant.

OUTPUT FORMAT — STRICT:
Return EXACTLY ONE flat JSON object. Do NOT nest a JSON object inside the "answer" field. Do NOT include code fences. The "answer" field is plain markdown text (with [1] [2] citations), NOT JSON. Example of CORRECT output:

{"answer":"You can renew at [1] ...","sentiment":"neutral","sentiment_score":0,"tone_used":"crisp","suggested_actions":["book_appointment"],"citations":[1]}

Schema:
{
  "answer": string,             // markdown text, English
  "sentiment": "positive"|"neutral"|"negative"|"frustrated"|"urgent",
  "sentiment_score": number,    // -1.0 to 1.0
  "tone_used": "warm"|"empathetic"|"crisp"|"reassuring",
  "suggested_actions": ["book_appointment"|"create_request"|"none"],
  "citations": number[]
}`;

const SYSTEM_BASE_ES = `Eres el asistente bilingüe de la Ciudad de Doral. Responde en español.
Sé conciso, preciso y útil. Si el usuario expresa frustración o urgencia, usa un tono empático y ofrece proactivamente seguimiento humano.

REGLAS DE FUNDAMENTACIÓN:
- Usa SOLO la información en la sección FUENTES a continuación para los hechos.
- Cita cada hecho fundamentado como [1], [2], etc., coincidiendo con las fuentes numeradas.
- Si las fuentes no cubren la pregunta, dilo claramente y sugiere llamar al 311 o al departamento correspondiente. No inventes detalles.
- Nunca inventes un número de teléfono, dirección o tarifa.

DETECCIÓN DE INTENCIÓN (regla estricta — respeta la intención del usuario por encima de tu propio juicio):
- Si el usuario pide explícitamente reservar, programar o agendar una cita / consulta / inspección — incluso si crees que no es estrictamente necesario — incluye "book_appointment" en suggested_actions. Palabras clave: "reservar", "agendar", "programar", "cita", "turno".
- Si el usuario quiere reportar un problema, presentar una queja o abrir una solicitud de servicio, incluye "create_request" en suggested_actions.
- Si no aplica ninguna acción, usa ["none"].

FORMATO DE SALIDA — ESTRICTO:
Devuelve EXACTAMENTE UN objeto JSON plano. NO anides un objeto JSON dentro del campo "answer". NO incluyas bloques de código (\`\`\`). El campo "answer" es texto markdown plano con citas [1] [2], NO es JSON. Ejemplo CORRECTO:

{"answer":"Puedes renovar en [1] ...","sentiment":"neutral","sentiment_score":0,"tone_used":"crisp","suggested_actions":["book_appointment"],"citations":[1]}

Esquema:
{
  "answer": string,             // texto markdown, español
  "sentiment": "positive"|"neutral"|"negative"|"frustrated"|"urgent",
  "sentiment_score": number,    // -1.0 a 1.0
  "tone_used": "warm"|"empathetic"|"crisp"|"reassuring",
  "suggested_actions": ["book_appointment"|"create_request"|"none"],
  "citations": number[]
}`;

const TOP_K = 6;
const MIN_SIMILARITY = 0.45;
const MAX_CONTEXT_CHARS = 4500;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return cors(new Response(null, { status: 204 }));
  if (req.method !== 'POST') return cors(new Response('method not allowed', { status: 405 }));

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return cors(json({ error: 'invalid json' }, 400));
  }

  if (!body.session_id || !body.message?.trim()) {
    return cors(json({ error: 'session_id and message are required' }, 400));
  }

  const lang: 'en' | 'es' = body.lang === 'es' ? 'es' : 'en';
  const channel = body.channel ?? 'web';
  const sb = admin();
  const ipHash = await hashIp(req.headers.get('x-forwarded-for') ?? null);

  // ---------- conversation + user message --------------------------------
  const { data: conv, error: convErr } = await sb
    .from('conversations')
    .upsert(
      { session_id: body.session_id, lang, channel, last_activity_at: new Date().toISOString() },
      { onConflict: 'session_id' }
    )
    .select('id, resident_name')
    .single();
  if (convErr || !conv) {
    return cors(json({ error: 'conversation upsert failed', detail: convErr?.message }, 500));
  }
  const residentName: string | null = (conv as { resident_name?: string | null }).resident_name ?? null;

  const { data: userMsg, error: umErr } = await sb
    .from('messages')
    .insert({
      conversation_id: conv.id,
      role: 'user',
      content: body.message,
      lang
    })
    .select('id')
    .single();
  if (umErr) return cors(json({ error: 'user message insert failed', detail: umErr.message }, 500));

  // ---------- RAG retrieval ----------------------------------------------
  const callStart = Date.now();
  const embed = await embedQuery(body.message);
  let chunks: RetrievedChunk[] = [];

  if (embed) {
    const { data: matches, error: rpcErr } = await sb.rpc('match_chunks', {
      query_embedding: embed.vector,
      match_lang: lang,
      match_count: TOP_K,
      similarity_threshold: MIN_SIMILARITY
    });
    if (rpcErr) {
      console.error('match_chunks rpc failed', rpcErr.message);
    } else if (Array.isArray(matches)) {
      chunks = matches as RetrievedChunk[];
    }
  }

  // Fetch document titles + urls for the chunks we're citing.
  let sources: SourceForClient[] = [];
  if (chunks.length > 0) {
    const docIds = Array.from(new Set(chunks.map((c) => c.document_id)));
    const { data: docs } = await sb
      .from('documents')
      .select('id, title, source_url')
      .in('id', docIds);
    const titleById = new Map<string, { title: string; url: string }>();
    for (const d of docs ?? []) {
      titleById.set(d.id, { title: d.title ?? 'Untitled', url: d.source_url ?? '' });
    }
    sources = chunks.map((c, idx) => ({
      index: idx + 1,
      chunk_id: c.id,
      document_id: c.document_id,
      title: titleById.get(c.document_id)?.title ?? 'Untitled',
      url: titleById.get(c.document_id)?.url ?? null,
      similarity: c.similarity
    }));
  }

  // ---------- prompt assembly --------------------------------------------
  const systemBase = lang === 'es' ? SYSTEM_BASE_ES : SYSTEM_BASE_EN;
  const sourceBlock = formatSources(chunks, sources, lang);
  const nameLine = residentName
    ? (lang === 'es'
        ? `\n\nEl nombre del usuario es "${residentName}". Úsalo con moderación (no en cada respuesta) para personalizar.`
        : `\n\nThe user's name is "${residentName}". Use it sparingly (not in every reply) to personalize.`)
    : '';
  const systemPrompt = `${systemBase}${nameLine}${sourceBlock ? '\n\n' + sourceBlock : ''}`;

  const forceFlag =
    body.forceFail ?? (Deno.env.get('DEMO_FORCE_GROQ_FAIL') === 'true' ? 'groq' : null);

  // ---------- LLM call ---------------------------------------------------
  let routerResult;
  try {
    routerResult = await complete({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: body.message }
      ],
      jsonMode: true,
      temperature: 0.3,
      maxTokens: 1200,
      forceFail: forceFlag
    });
  } catch (e) {
    // All LLM providers exhausted. Try to recover with a RAG-only answer
    // built from the top retrieved chunk before giving up.
    const failureDetail = parseRouterError(e);
    const elapsed = Date.now() - callStart;

    if (chunks.length > 0) {
      const top = chunks[0];
      const topSource = sources[0];
      const answer = buildRagFallbackAnswer(top.content, topSource?.title ?? 'a city resource', lang);

      const { data: msg } = await sb
        .from('messages')
        .insert({
          conversation_id: conv.id,
          role: 'assistant',
          content: answer,
          lang,
          sentiment: 'neutral',
          sentiment_score: 0,
          latency_ms: elapsed,
          llm_provider: 'none',
          retrieved_chunk_ids: chunks.map((c) => c.id)
        })
        .select('id')
        .single();

      await sb
        .from('conversations')
        .update({ overall_sentiment: 'neutral', last_activity_at: new Date().toISOString() })
        .eq('id', conv.id);

      await audit({
        actorType: 'system',
        action: 'llm.rag_fallback',
        entityType: 'message',
        entityId: msg?.id ?? undefined,
        metadata: {
          attempts: failureDetail.attempts,
          chunks_used: chunks.length
        },
        ipHash: ipHash ?? undefined
      });

      return cors(
        json({
          message_id: msg?.id,
          conversation_id: conv.id,
          answer,
          sentiment: 'neutral',
          sentiment_score: 0,
          tone_used: 'crisp',
          suggested_actions: ['none'],
          citations: [1],
          sources,
          provider: 'rag-fallback',
          latency_ms: elapsed,
          fallback: 'rag-only',
          fallback_reason: failureDetail.attempts
        })
      );
    }

    // No chunks AND no LLM — final fail.
    const fallbackText =
      lang === 'es'
        ? 'Nuestro asistente está brevemente fuera de servicio. Por favor inténtalo de nuevo en un momento o llama al 311.'
        : "Our AI assistant is briefly unavailable. Please try again in a moment or call 311.";
    await sb.from('messages').insert({
      conversation_id: conv.id,
      role: 'assistant',
      content: fallbackText,
      lang,
      llm_provider: 'none',
      latency_ms: elapsed
    });
    await audit({
      actorType: 'llm',
      action: 'llm.all_failed',
      entityType: 'conversation',
      entityId: conv.id,
      metadata: { attempts: failureDetail.attempts, message: failureDetail.message },
      ipHash: ipHash ?? undefined
    });
    return cors(
      json(
        {
          error: 'llm unavailable',
          fallback: true,
          fallback_reason: failureDetail.attempts,
          message: fallbackText
        },
        503
      )
    );
  }

  let parsed: ParsedAnswer = safeParseAnswer(routerResult.text);

  // Some models occasionally repeat booking intent in plain language without
  // emitting the structured action. Belt-and-suspenders keyword detection:
  if (!parsed.suggested_actions || parsed.suggested_actions.length === 0) {
    parsed.suggested_actions = ['none'];
  }
  if (!parsed.suggested_actions.includes('book_appointment')) {
    if (detectBookingIntent(body.message, lang)) {
      parsed.suggested_actions = Array.from(
        new Set([...parsed.suggested_actions.filter((a) => a !== 'none'), 'book_appointment'])
      );
    }
  }

  // Only keep citation numbers that map to a real source.
  parsed.citations = (parsed.citations ?? []).filter(
    (n) => Number.isInteger(n) && n >= 1 && n <= sources.length
  );

  // ---------- persist + return -------------------------------------------
  const retrievedChunkIds = chunks.map((c) => c.id);
  const { data: assistantMsg } = await sb
    .from('messages')
    .insert({
      conversation_id: conv.id,
      role: 'assistant',
      content: parsed.answer,
      lang,
      sentiment: parsed.sentiment,
      sentiment_score: parsed.sentiment_score,
      tokens_in: routerResult.tokensIn,
      tokens_out: routerResult.tokensOut,
      latency_ms: routerResult.latencyMs,
      llm_provider: routerResult.provider,
      retrieved_chunk_ids: retrievedChunkIds
    })
    .select('id')
    .single();

  // Update conversation overall sentiment.
  await sb
    .from('conversations')
    .update({
      overall_sentiment: parsed.sentiment,
      last_activity_at: new Date().toISOString()
    })
    .eq('id', conv.id);

  await audit({
    actorType: 'llm',
    action: 'llm.call',
    entityType: 'message',
    entityId: assistantMsg?.id ?? undefined,
    metadata: {
      provider: routerResult.provider,
      model: routerResult.model,
      latency_ms: routerResult.latencyMs,
      tokens_in: routerResult.tokensIn,
      tokens_out: routerResult.tokensOut,
      attempts_before_success: routerResult.attemptLog,
      chunks_retrieved: chunks.length,
      embedding_used: !!embed
    },
    ipHash: ipHash ?? undefined
  });

  return cors(
    json({
      message_id: assistantMsg?.id,
      conversation_id: conv.id,
      answer: parsed.answer,
      sentiment: parsed.sentiment,
      sentiment_score: parsed.sentiment_score,
      tone_used: parsed.tone_used,
      suggested_actions: parsed.suggested_actions,
      citations: parsed.citations,
      sources,
      provider: routerResult.provider,
      model: routerResult.model,
      latency_ms: routerResult.latencyMs,
      attempts_before_success: routerResult.attemptLog.length > 0 ? routerResult.attemptLog : undefined
    })
  );
});

// ============================================================================
// Helpers
// ============================================================================

function parseRouterError(e: unknown): { kind: string; message: string; attempts: string[] } {
  const raw = e instanceof Error ? e.message : String(e);
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return {
        kind: parsed.kind ?? 'unknown',
        message: parsed.message ?? raw,
        attempts: Array.isArray(parsed.attempts) ? parsed.attempts : []
      };
    }
  } catch {
    // Not JSON — treat as a single attempt message.
  }
  return { kind: 'unknown', message: raw, attempts: [raw] };
}

function buildRagFallbackAnswer(content: string, sourceTitle: string, lang: 'en' | 'es'): string {
  const intro =
    lang === 'es'
      ? `Nuestro asistente con IA está brevemente fuera de servicio, pero esto es lo más relevante que encontré en nuestra base de conocimiento (de **${sourceTitle}** [1]):`
      : `Our AI assistant is briefly unavailable, but here is the most relevant excerpt from our knowledge base (from **${sourceTitle}** [1]):`;
  const trimmed = content.length > 900 ? content.slice(0, 900).trimEnd() + '…' : content;
  return `${intro}\n\n${trimmed}`;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Robust answer parser. Handles the common Gemini quirks:
 *   - Plain JSON (the happy path).
 *   - Double-wrapped JSON: outer parses but `answer` itself is a JSON string.
 *   - JSON wrapped in ```json ... ``` code fences.
 *   - Pure-text fallback (worst case).
 */
function safeParseAnswer(raw: string): ParsedAnswer {
  const fallback: ParsedAnswer = {
    answer: raw,
    sentiment: 'neutral',
    sentiment_score: 0,
    tone_used: 'crisp',
    suggested_actions: ['none'],
    citations: []
  };
  if (!raw) return fallback;

  // Strip optional code fences.
  let text = raw.trim();
  const fence = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fence) text = fence[1].trim();

  let outer: unknown;
  try {
    outer = JSON.parse(text);
  } catch {
    return fallback;
  }
  if (!outer || typeof outer !== 'object') return fallback;

  let candidate = outer as Record<string, unknown>;
  // If `answer` is itself a JSON string with the same schema, unwrap once.
  if (typeof candidate.answer === 'string') {
    const inner = candidate.answer.trim();
    if (inner.startsWith('{') && inner.endsWith('}')) {
      try {
        const innerObj = JSON.parse(inner);
        if (innerObj && typeof innerObj === 'object' && typeof (innerObj as any).answer === 'string') {
          candidate = innerObj as Record<string, unknown>;
        }
      } catch {
        // Not actually nested JSON — leave as is.
      }
    }
  }

  return {
    answer: typeof candidate.answer === 'string' ? candidate.answer : fallback.answer,
    sentiment: (candidate.sentiment as ParsedAnswer['sentiment']) ?? fallback.sentiment,
    sentiment_score:
      typeof candidate.sentiment_score === 'number' ? candidate.sentiment_score : 0,
    tone_used: (candidate.tone_used as ParsedAnswer['tone_used']) ?? fallback.tone_used,
    suggested_actions: Array.isArray(candidate.suggested_actions)
      ? (candidate.suggested_actions as ParsedAnswer['suggested_actions'])
      : fallback.suggested_actions,
    citations: Array.isArray(candidate.citations)
      ? (candidate.citations.filter((n) => typeof n === 'number') as number[])
      : fallback.citations
  };
}

const BOOKING_KEYWORDS = {
  en: [
    'book',
    'schedule',
    'reserve',
    'appointment',
    'make an appointment',
    'set up a time',
    'set up a meeting',
    'book a slot',
    'schedule a visit'
  ],
  es: [
    'reservar',
    'agendar',
    'programar',
    'cita',
    'turno',
    'reserva',
    'agendamiento'
  ]
};

function detectBookingIntent(message: string, lang: 'en' | 'es'): boolean {
  const m = message.toLowerCase();
  const keywords = BOOKING_KEYWORDS[lang] ?? BOOKING_KEYWORDS.en;
  return keywords.some((k) => m.includes(k));
}

function formatSources(
  chunks: RetrievedChunk[],
  sources: SourceForClient[],
  lang: 'en' | 'es'
): string {
  if (chunks.length === 0) return '';
  const header = lang === 'es' ? 'FUENTES:' : 'SOURCES:';
  const lines: string[] = [header];
  let totalChars = 0;
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    const title = sources[i]?.title ?? 'Untitled';
    const body = c.content.trim();
    const piece = `[${i + 1}] ${title}\n${body}`;
    if (totalChars + piece.length > MAX_CONTEXT_CHARS && i > 0) break;
    lines.push(piece);
    totalChars += piece.length;
  }
  return lines.join('\n\n');
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

function cors(resp: Response): Response {
  resp.headers.set('access-control-allow-origin', '*');
  resp.headers.set('access-control-allow-methods', 'POST, OPTIONS');
  resp.headers.set('access-control-allow-headers', 'content-type, authorization');
  return resp;
}
