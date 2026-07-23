-- 0112_lock_schema_migrations.sql
-- Supabase security advisory (2026-07-20): `schema_migrations` (the migration
-- ledger, created in 0104) was left WITHOUT row-level security, and Supabase's
-- default grants gave anon/authenticated full read/write on it — anyone with the
-- project URL could tamper with the ledger. No user data lives there, but it must
-- be server-only. Enable RLS with NO policies (deny-all for API roles) and revoke
-- the grants outright; service_role/postgres bypass RLS so sbsql/migrations keep
-- working. Idempotent.
--
-- Note: the advisory also flags `spatial_ref_sys` — that's PostGIS's built-in,
-- read-only coordinate-system reference table, owned by supabase_admin. We can't
-- ALTER it (not ours), it contains no user data, and Supabase documents it as a
-- known/ignorable finding. Nothing to do there.
-- Apply: node scripts/sbsql.mjs --file supabase/migrations/0112_lock_schema_migrations.sql

alter table public.schema_migrations enable row level security;
revoke all on table public.schema_migrations from anon, authenticated;

insert into public.schema_migrations (version) values ('0112_lock_schema_migrations')
on conflict (version) do nothing;
