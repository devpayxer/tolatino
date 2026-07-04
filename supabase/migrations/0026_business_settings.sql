-- To'Latino — a flexible per-business settings blob (Cuenta → Ajustes, plus the
-- Productos → Zonas de envío / Repartidores config and notification prefs). One
-- jsonb column keeps the schema simple for settings-shaped data that doesn't need
-- its own table, e.g. {"notifications":{...},"shipping":{...},"drivers":[...]}.
-- The "update own business" RLS policy (migration 0013) already covers writes.
-- Idempotent. Apply: paste into the Supabase SQL Editor and Run.

alter table public.businesses add column if not exists settings jsonb;
