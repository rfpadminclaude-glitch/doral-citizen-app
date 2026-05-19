-- 0002_resident_name.sql
-- Add an optional resident_name to conversations so admins can see who they're
-- looking at instead of just a session UUID. Captured via a mid-chat prompt
-- in the resident widget (POST /api/chat/identify).

alter table public.conversations
  add column if not exists resident_name text;
