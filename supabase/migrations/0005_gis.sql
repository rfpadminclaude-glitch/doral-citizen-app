-- ============================================================================
-- GIS-based service tracking — citizens master, geocode cache, geo columns
-- Migration 0005
-- ============================================================================

-- ----------------------------------------------------------------------------
-- citizens (master record per resident)
-- ----------------------------------------------------------------------------
create table public.citizens (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  address_line text not null,
  lat double precision,
  lng double precision,
  neighborhood_slug text,
  source text not null default 'seed'
    check (source in ('seed','request_form','manual')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index citizens_neighborhood_idx on public.citizens (neighborhood_slug);
create index citizens_latlng_idx on public.citizens (lat, lng);

-- Upsert key for the request-form path: match by lowercased contact.
-- Either email or phone must be present for the constraint to apply.
create unique index citizens_contact_uniq
  on public.citizens (lower(coalesce(email, phone, '')))
  where coalesce(email, phone) is not null;

create trigger citizens_updated_at before update on public.citizens
  for each row execute function public.set_updated_at();

alter table public.citizens enable row level security;
create policy citizens_admin_all on public.citizens
  for all using (public.is_admin()) with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- service_requests — add geo columns + FK to citizens
-- ----------------------------------------------------------------------------
alter table public.service_requests
  add column if not exists citizen_id uuid references public.citizens(id) on delete set null,
  add column if not exists address_line text,
  add column if not exists lat double precision,
  add column if not exists lng double precision,
  add column if not exists neighborhood_slug text;

create index if not exists sr_citizen_idx on public.service_requests (citizen_id);
create index if not exists sr_neighborhood_idx on public.service_requests (neighborhood_slug);
create index if not exists sr_latlng_idx on public.service_requests (lat, lng);

-- ----------------------------------------------------------------------------
-- geocode_cache (Nominatim results — attribution: © OpenStreetMap contributors)
-- ----------------------------------------------------------------------------
create table public.geocode_cache (
  id uuid primary key default gen_random_uuid(),
  input_address text not null,
  normalized_address text,
  lat double precision,
  lng double precision,
  display_name text,
  raw jsonb,
  provider text not null default 'nominatim',
  hit_count int not null default 0,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now()
);
create unique index geocode_cache_input_uniq
  on public.geocode_cache (lower(input_address));

alter table public.geocode_cache enable row level security;
create policy geocode_admin_all on public.geocode_cache
  for all using (public.is_admin()) with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- RPC: per-neighborhood request counts for the GIS dashboard
-- ----------------------------------------------------------------------------
create or replace function public.gis_neighborhood_stats(
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_types text[] default null,
  p_statuses text[] default null
)
returns table (
  neighborhood_slug text,
  total bigint,
  pending bigint,
  in_progress bigint,
  completed bigint
)
language sql stable as $$
  select
    sr.neighborhood_slug,
    count(*) as total,
    count(*) filter (where sr.status = 'new') as pending,
    count(*) filter (where sr.status = 'in_progress') as in_progress,
    count(*) filter (where sr.status in ('resolved','closed')) as completed
  from public.service_requests sr
  where
    (p_from is null or sr.created_at >= p_from)
    and (p_to is null or sr.created_at <= p_to)
    and (p_types is null or sr.request_type = any(p_types))
    and (p_statuses is null or sr.status = any(p_statuses))
  group by sr.neighborhood_slug;
$$;

-- ----------------------------------------------------------------------------
-- Realtime publication — let the GIS page subscribe to new citizens
-- ----------------------------------------------------------------------------
alter publication supabase_realtime add table public.citizens;
