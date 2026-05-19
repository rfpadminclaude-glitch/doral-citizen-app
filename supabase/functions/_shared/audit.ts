// audit.ts — append-only audit log helper.
import { admin } from './supabase.ts';

export type AuditEntry = {
  actorType: 'resident' | 'admin' | 'system' | 'llm';
  actorId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipHash?: string;
  userAgent?: string;
};

export async function audit(entry: AuditEntry): Promise<void> {
  try {
    await admin().from('audit_log').insert({
      actor_type: entry.actorType,
      actor_id: entry.actorId ?? null,
      action: entry.action,
      entity_type: entry.entityType ?? null,
      entity_id: entry.entityId ?? null,
      metadata: entry.metadata ?? {},
      ip_hash: entry.ipHash ?? null,
      user_agent: entry.userAgent ?? null
    });
  } catch (e) {
    // Audit must never break the user path; log only.
    console.error('audit insert failed', e);
  }
}

export async function hashIp(ip: string | null | undefined): Promise<string | null> {
  if (!ip) return null;
  const salt = Deno.env.get('AUDIT_IP_SALT') ?? new Date().toISOString().slice(0, 10);
  const enc = new TextEncoder().encode(`${ip}:${salt}`);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
