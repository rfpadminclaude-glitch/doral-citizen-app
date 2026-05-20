/**
 * Server-side text extraction helpers used by the "create knowledge document"
 * admin flow. Three input modes:
 *
 *   - extractFromUrl(url)        — fetch a static HTML page and strip chrome
 *   - extractFromPdfBuffer(buf)  — pdf-parse
 *   - extractFromDocxBuffer(buf) — mammoth raw text extraction
 *
 * All three return UTF-8 text capped at TEXT_MAX_BYTES so an oversized upload
 * can't blow past Vercel's function timeout when chunked + embedded.
 */

import * as cheerio from 'cheerio';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';

export const TEXT_MAX_BYTES = 50_000; // ~50 KB after extraction
export const FETCH_TIMEOUT_MS = 10_000;

export class TextTooLargeError extends Error {
  constructor() {
    super('extracted text exceeds the 50 KB limit');
    this.name = 'TextTooLargeError';
  }
}

export class EmptyExtractionError extends Error {
  constructor() {
    super('no text could be extracted from the source');
    this.name = 'EmptyExtractionError';
  }
}

function capAndClean(raw: string): string {
  const collapsed = raw
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
  if (!collapsed) throw new EmptyExtractionError();
  // Byte-length cap (UTF-8 estimate; chars are usually 1 byte in English/Spanish).
  if (collapsed.length > TEXT_MAX_BYTES) throw new TextTooLargeError();
  return collapsed;
}

/**
 * Fetch a static HTML page, strip nav/footer/script/style/etc., return the
 * largest main/article block's text (or body fallback). Caller should handle
 * EmptyExtractionError gracefully — many CMS-rendered pages need a headless
 * browser, which we don't run here.
 */
export async function extractFromUrl(url: string): Promise<{ text: string; title?: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let resp: Response;
  try {
    resp = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        // A browser-like UA reduces the chance of being blocked by CDNs that
        // reject the default node fetch UA.
        'user-agent':
          'Mozilla/5.0 (compatible; DoralCitizenBot/1.0; +https://doral-citizen-app.vercel.app)',
        accept: 'text/html,application/xhtml+xml'
      }
    });
  } finally {
    clearTimeout(timeoutId);
  }
  if (!resp.ok) {
    throw new Error(`fetch failed: HTTP ${resp.status}`);
  }
  const ctype = resp.headers.get('content-type') ?? '';
  if (!/html|xml/i.test(ctype)) {
    throw new Error(`unsupported content-type: ${ctype || 'unknown'}`);
  }
  const html = await resp.text();
  const $ = cheerio.load(html);

  const title = $('title').first().text().trim() || undefined;

  // Strip chrome and decorative content.
  $('nav, header, footer, aside, script, style, noscript, form, iframe, svg, button').remove();

  // Prefer the largest main/article block; fall back to body.
  let bestText = '';
  $('main, article').each((_i, el) => {
    const txt = $(el).text();
    if (txt.length > bestText.length) bestText = txt;
  });
  if (!bestText) bestText = $('body').text();

  return { text: capAndClean(bestText), title };
}

export async function extractFromPdfBuffer(buf: Buffer): Promise<string> {
  // pdf-parse v2 uses a class-based API. Pass the buffer as a Uint8Array.
  const parser = new PDFParse({ data: new Uint8Array(buf) });
  try {
    const result = await parser.getText();
    return capAndClean(result.text);
  } finally {
    await parser.destroy();
  }
}

export async function extractFromDocxBuffer(buf: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer: buf });
  return capAndClean(result.value);
}
