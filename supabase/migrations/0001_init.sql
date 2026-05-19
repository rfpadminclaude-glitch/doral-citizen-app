-- ============================================================================
-- Doral Citizen Assistant — initial schema
-- Migration 0001
-- ============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;
create extension if not exists vector;
create extension if not exists pg_trgm;

-- pgsodium for column-level encryption of PII (disabled for PoC).
-- Newer Supabase projects don't ship pgsodium enabled. We're not using its
-- functions in the PoC, so leave it off. Production roll-out can revisit
-- column-level PII encryption.
-- create extension if not exists pgsodium;

-- ============================================================================
-- Tables
-- ============================================================================

-- admin_users -----------------------------------------------------------------
create table public.admin_users (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid references auth.users(id) on delete cascade unique not null,
  email text not null,
  role text not null default 'admin' check (role in ('admin','staff','viewer')),
  display_name text,
  created_at timestamptz not null default now()
);

-- conversations ---------------------------------------------------------------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  session_id text unique not null,
  channel text not null default 'web' check (channel in ('web','sms','whatsapp','facebook')),
  lang text not null default 'en' check (lang in ('en','es')),
  resident_phone text,
  started_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  overall_sentiment text check (overall_sentiment in ('positive','neutral','negative','frustrated','urgent')),
  status text not null default 'active',
  created_at timestamptz not null default now()
);
create index conversations_channel_activity_idx on public.conversations (channel, last_activity_at desc);
create index conversations_session_idx on public.conversations (session_id);

-- messages --------------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant','system','tool')),
  content text not null,
  lang text not null default 'en',
  sentiment text check (sentiment in ('positive','neutral','negative','frustrated','urgent')),
  sentiment_score numeric(3,2),
  tokens_in int,
  tokens_out int,
  latency_ms int,
  llm_provider text check (llm_provider in ('groq','gemini','none')),
  retrieved_chunk_ids uuid[],
  pii_detected boolean not null default false,
  created_at timestamptz not null default now()
);
create index messages_conv_time_idx on public.messages (conversation_id, created_at);
create index messages_sentiment_idx on public.messages (sentiment) where sentiment is not null;

-- service_requests ------------------------------------------------------------
create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete set null,
  request_type text not null check (request_type in ('permit','code_violation','park_issue','general')),
  title text not null,
  description text,
  status text not null default 'new' check (status in ('new','in_progress','resolved','closed')),
  priority text default 'normal' check (priority in ('low','normal','high','urgent')),
  resident_name text,
  resident_contact text,
  assigned_to uuid references public.admin_users(id) on delete set null,
  mock_crm_payload jsonb,
  external_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index sr_status_created_idx on public.service_requests (status, created_at desc);

-- appointments ----------------------------------------------------------------
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete set null,
  service_request_id uuid references public.service_requests(id) on delete set null,
  appointment_type text not null check (appointment_type in ('permit_renewal','consultation','inspection')),
  slot_start timestamptz not null,
  slot_end timestamptz not null,
  resident_name text,
  resident_contact text,
  status text not null default 'booked' check (status in ('booked','cancelled','completed')),
  confirmation_code text unique not null default upper(substring(gen_random_uuid()::text from 1 for 6)),
  created_at timestamptz not null default now()
);
create index appointments_slot_idx on public.appointments (slot_start);

-- faqs ------------------------------------------------------------------------
create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  question_en text not null,
  question_es text,
  answer_en text not null,
  answer_es text,
  category text,
  tags text[] default '{}',
  is_published boolean not null default true,
  updated_by uuid references public.admin_users(id) on delete set null,
  embedding_en vector(768),
  embedding_es vector(768),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index faqs_embedding_en_idx on public.faqs using ivfflat (embedding_en vector_cosine_ops) with (lists = 50);
create index faqs_embedding_es_idx on public.faqs using ivfflat (embedding_es vector_cosine_ops) with (lists = 50);
create index faqs_category_idx on public.faqs (category);

-- documents -------------------------------------------------------------------
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  source_url text unique not null,
  source_domain text not null,
  title text,
  lang text not null default 'en',
  raw_html_path text,
  extracted_text text,
  last_scraped_at timestamptz,
  content_hash text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index documents_domain_idx on public.documents (source_domain, last_scraped_at);

-- document_chunks -------------------------------------------------------------
create table public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  lang text not null default 'en',
  embedding vector(768),
  token_count int,
  heading_path text[],
  created_at timestamptz not null default now()
);
create index chunks_embedding_idx on public.document_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index chunks_doc_order_idx on public.document_chunks (document_id, chunk_index);
create index chunks_lang_idx on public.document_chunks (lang);

-- announcements ---------------------------------------------------------------
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title_en text not null,
  title_es text not null,
  body_en text not null,
  body_es text not null,
  severity text not null default 'info' check (severity in ('info','warning','urgent')),
  publish_at timestamptz not null default now(),
  expires_at timestamptz,
  channels text[] not null default array['web']::text[],
  created_by uuid references public.admin_users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index announcements_publish_idx on public.announcements (publish_at desc);

-- feedback_ratings ------------------------------------------------------------
create table public.feedback_ratings (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade,
  message_id uuid references public.messages(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  was_resolved boolean,
  created_at timestamptz not null default now()
);
create index feedback_msg_idx on public.feedback_ratings (message_id);

-- audit_log -------------------------------------------------------------------
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_type text not null check (actor_type in ('resident','admin','system','llm')),
  actor_id text,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb default '{}'::jsonb,
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index audit_action_idx on public.audit_log (action, created_at desc);
create index audit_entity_idx on public.audit_log (entity_type, entity_id);

-- Append-only constraint on audit_log
revoke update, delete on public.audit_log from public, anon, authenticated;

-- ============================================================================
-- Trigger: keep updated_at fresh
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger sr_updated_at before update on public.service_requests
  for each row execute function public.set_updated_at();
create trigger faqs_updated_at before update on public.faqs
  for each row execute function public.set_updated_at();

-- ============================================================================
-- RAG retrieval RPC: match_chunks
-- ============================================================================
create or replace function public.match_chunks(
  query_embedding vector(768),
  match_lang text default 'en',
  match_count int default 6,
  similarity_threshold float default 0.72
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  lang text,
  heading_path text[],
  similarity float
)
language sql stable as $$
  select
    c.id,
    c.document_id,
    c.content,
    c.lang,
    c.heading_path,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.document_chunks c
  where
    c.lang = match_lang
    and c.embedding is not null
    and 1 - (c.embedding <=> query_embedding) > similarity_threshold
  order by c.embedding <=> query_embedding asc
  limit match_count;
$$;

-- ============================================================================
-- RLS
-- ============================================================================
alter table public.admin_users enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.service_requests enable row level security;
alter table public.appointments enable row level security;
alter table public.faqs enable row level security;
alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;
alter table public.announcements enable row level security;
alter table public.feedback_ratings enable row level security;
alter table public.audit_log enable row level security;

-- Helper: is current user an admin (any role)
create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.admin_users u
    where u.auth_id = auth.uid()
  );
$$;

-- admin_users
create policy admin_users_self_or_admin on public.admin_users
  for select using (auth.uid() = auth_id or public.is_admin());

-- conversations: anon inserts via Edge Function only (service role bypasses RLS).
-- Admins can select all.
create policy conversations_admin_select on public.conversations
  for select using (public.is_admin());

-- messages: same pattern.
create policy messages_admin_select on public.messages
  for select using (public.is_admin());

-- service_requests
create policy sr_admin_all on public.service_requests
  for all using (public.is_admin()) with check (public.is_admin());

-- appointments
create policy appointments_admin_all on public.appointments
  for all using (public.is_admin()) with check (public.is_admin());

-- faqs: published rows readable by anon; admins manage.
create policy faqs_public_read on public.faqs
  for select using (is_published = true);
create policy faqs_admin_write on public.faqs
  for all using (public.is_admin()) with check (public.is_admin());

-- documents: read-only for anon (it's public city content).
create policy documents_public_read on public.documents
  for select using (is_active = true);
create policy documents_admin_write on public.documents
  for all using (public.is_admin()) with check (public.is_admin());

-- document_chunks: read-only public.
create policy chunks_public_read on public.document_chunks
  for select using (true);
create policy chunks_admin_write on public.document_chunks
  for all using (public.is_admin()) with check (public.is_admin());

-- announcements: published rows public; admin write.
create policy announcements_public_read on public.announcements
  for select using (publish_at <= now() and (expires_at is null or expires_at > now()));
create policy announcements_admin_all on public.announcements
  for all using (public.is_admin()) with check (public.is_admin());

-- feedback_ratings: anon insert via Edge Function; admin select.
create policy feedback_admin_select on public.feedback_ratings
  for select using (public.is_admin());

-- audit_log: admin select only; inserts via service role only.
create policy audit_admin_select on public.audit_log
  for select using (public.is_admin());

-- ============================================================================
-- Realtime publication
-- ============================================================================
-- Enable realtime on tables the admin dashboard subscribes to.
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.service_requests;
alter publication supabase_realtime add table public.appointments;
alter publication supabase_realtime add table public.feedback_ratings;
alter publication supabase_realtime add table public.announcements;
