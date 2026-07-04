-- To'Latino — which dashboard modules a business has turned on (Configurar
-- módulos). Stored as jsonb, e.g. {"menu":true,"services":false,...}. null = use
-- the tier default (Free = menu only; Verified/Premium = all on). The "update own
-- business" RLS policy (migration 0013) already covers writes. Idempotent.
-- Apply: paste into the Supabase SQL Editor and Run.

alter table public.businesses add column if not exists modules jsonb;
