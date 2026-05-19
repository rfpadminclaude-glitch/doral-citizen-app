-- After creating an Auth user via the Supabase dashboard
-- (Authentication → Users → Add user → email + password),
-- copy that user's UUID and replace YOUR_AUTH_UID below.
--
-- Run this against your project (psql or the Supabase SQL editor)
-- to grant the user admin access.

insert into public.admin_users (auth_id, email, role, display_name)
values (
  'YOUR_AUTH_UID'::uuid,
  'admin@doral.local',
  'admin',
  'Demo Admin'
)
on conflict (auth_id) do update
  set role = excluded.role,
      display_name = excluded.display_name;
