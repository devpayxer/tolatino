-- 0078_metrics_self_view.sql — don't count owner self-views + wire more kinds.
--
-- Two hardenings on 0077's discovery metrics so the numbers the owner reads are
-- trustworthy (they use them to decide if the listing is working):
--
--   1. Exclude the owner's OWN visits/actions on their listing. Before this, an
--      owner opening their own page inflated their "Vistas" — self-view noise on
--      the exact number that must reflect real customers. track_listing_view now
--      returns early when the authenticated caller owns the business.
--   2. The `kind` column already accepted any label; the app now records
--      'save' (♥), 'direction' (Cómo llegar) and 'call' (Llamar) alongside
--      'view' — the classic Google Business "customer actions" set. No schema
--      change is needed; this migration only replaces the function to add the
--      self-view guard. Bot/rate filtering and search-appearance ('search')
--      remain deferred (see docs/LAUNCH-CHECKLIST.md).
--
-- Idempotent (create or replace).

create or replace function public.track_listing_view(in_slug text, in_kind text default 'view')
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare bid uuid; bowner uuid;
begin
  select id, owner_id into bid, bowner from public.businesses where slug = in_slug limit 1;
  if bid is null then return; end if;
  -- Don't count the owner's own visits/actions on their listing (self-view
  -- inflation) — the metric must reflect real customers, not the owner testing.
  if bowner is not null and bowner = auth.uid() then return; end if;
  insert into public.business_metric_daily (business_id, day, kind, count)
  values (bid, current_date, coalesce(nullif(in_kind, ''), 'view'), 1)
  on conflict (business_id, day, kind)
  do update set count = business_metric_daily.count + 1;
end;
$function$;
grant execute on function public.track_listing_view(text, text) to anon, authenticated;

notify pgrst, 'reload schema';
