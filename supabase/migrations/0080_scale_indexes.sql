-- 0080_scale_indexes.sql — scale hardening from the 2026-07-14 performance audit.
-- Pure additive B-tree indexes for hot dashboard reads that currently ride a
-- broader index and filter/sort in memory. Safe, idempotent, non-breaking — no
-- data or policy changes. Aligns with the 1M+/mo scale target (index every
-- column used in a filter/sort). At very large table sizes prefer building these
-- CONCURRENTLY off-hours; at current volume a plain build is instant.

-- reviews: the dashboard reviews list orders by created_at desc within a business
-- (Reseñas tab). Only reviews_business_idx on (business_id) exists, so a busy
-- business forces a sort of all its reviews. Composite kills the sort.
create index if not exists reviews_biz_created_idx
  on public.reviews (business_id, created_at desc);

-- business_orders: revenue (status='completed') and the Panel bell head-count
-- (status='new') filter on status, which is in no index today — they ride
-- (business_id, created_at) and filter status in memory. Composite serves every
-- per-business status filter directly.
create index if not exists business_orders_biz_status_idx
  on public.business_orders (business_id, status);

notify pgrst, 'reload schema';
