import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  conversation_session_id: z.string().min(1),
  appointment_type: z.enum(['permit_renewal', 'consultation', 'inspection']),
  slot_start: z.string().datetime(),
  slot_end: z.string().datetime(),
  resident_name: z.string().min(1).max(160),
  resident_contact: z.string().min(3).max(160) // phone OR email
});

export async function POST(req: NextRequest) {
  let parsed;
  try {
    parsed = Body.safeParse(await req.json());
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid payload', issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const sb = createAdminClient();

  // Find the conversation so we can fk it.
  const { data: conv } = await sb
    .from('conversations')
    .select('id')
    .eq('session_id', parsed.data.conversation_session_id)
    .maybeSingle();

  const { data: appt, error } = await sb
    .from('appointments')
    .insert({
      conversation_id: conv?.id ?? null,
      appointment_type: parsed.data.appointment_type,
      slot_start: parsed.data.slot_start,
      slot_end: parsed.data.slot_end,
      resident_name: parsed.data.resident_name,
      resident_contact: parsed.data.resident_contact,
      status: 'booked'
    })
    .select('id, confirmation_code, slot_start, slot_end, appointment_type')
    .single();

  if (error || !appt) {
    return NextResponse.json({ error: error?.message ?? 'insert failed' }, { status: 500 });
  }

  await sb.from('audit_log').insert({
    actor_type: 'resident',
    action: 'appointment.booked',
    entity_type: 'appointment',
    entity_id: appt.id,
    metadata: {
      appointment_type: appt.appointment_type,
      session_id: parsed.data.conversation_session_id
    }
  });

  return NextResponse.json({
    id: appt.id,
    confirmation_code: appt.confirmation_code,
    slot_start: appt.slot_start,
    slot_end: appt.slot_end,
    appointment_type: appt.appointment_type
  });
}
