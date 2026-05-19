-- 0003_profile_fields.sql
-- Resident-managed profile fields, edited via the in-chat ProfileDrawer.

alter table public.conversations
  add column if not exists email text,
  add column if not exists announcement_opt_in boolean not null default false,
  add column if not exists avatar text default '🙂';
