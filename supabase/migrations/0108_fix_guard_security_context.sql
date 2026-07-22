-- 0108_fix_guard_security_context.sql
-- FIX a regression from 0105: the two customer-update guard TRIGGERS were flipped
-- to SECURITY DEFINER (they read businesses, and 0105 restricted that table). But
-- their logic keys off `current_user in ('authenticated','anon')` to detect a
-- customer's direct write — and under SECURITY DEFINER current_user is the function
-- OWNER, so that check was always false and the guards silently stopped enforcing.
-- Revert them to SECURITY INVOKER. Their only businesses read is the owner-check
-- (a business owned by auth.uid()), which the owner-only policy still permits, so
-- they work correctly as invoker. Idempotent.
-- Apply: node scripts/sbsql.mjs --file supabase/migrations/0108_fix_guard_security_context.sql

alter function public.tg_txn_customer_update_guard() security invoker;
alter function public.tg_rental_order_guard() security invoker;

notify pgrst, 'reload schema';
