-- Expand the allowed values of service_requests.request_type so the resident
-- chat can launch dedicated intents from quick-action cards:
--   pothole     → road-surface defect report
--   inspection  → property / construction inspection request
--   complaint   → general complaint (distinct from a code_violation)
--
-- The original constraint is named by Postgres convention from the column-level
-- inline CHECK in 0001_init.sql; `drop ... if exists` keeps the migration
-- idempotent in case it's been renamed manually.

alter table public.service_requests
  drop constraint if exists service_requests_request_type_check;

alter table public.service_requests
  add constraint service_requests_request_type_check
  check (request_type in (
    'permit',
    'code_violation',
    'park_issue',
    'general',
    'pothole',
    'inspection',
    'complaint'
  ));
