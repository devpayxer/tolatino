-- 0104_ledger_and_ticket_gate.sql
-- (1) Migration ledger + (2) server-side paid-ticket payment gate. Idempotente.

-- ── 1) MIGRATION LEDGER ──────────────────────────────────────────────────────
create table if not exists public.schema_migrations (
  version text primary key,
  applied_at timestamptz not null default now()
);
-- Backfill: this DB is already at 0103, so record every shipped migration as applied.
insert into public.schema_migrations (version) values
  ('0001_init'),
  ('0002_v2_multicanal'),
  ('0003_cities'),
  ('0004_geo_scope'),
  ('0005_auth_profiles'),
  ('0006_social'),
  ('0007_realtime'),
  ('0008_post_images'),
  ('0009_post_moderation'),
  ('0010_polls'),
  ('0011_follows'),
  ('0012_business_subcategories'),
  ('0013_create_business'),
  ('0014_user_addresses'),
  ('0015_address_city'),
  ('0016_business_features'),
  ('0017_saved_businesses'),
  ('0018_business_hours'),
  ('0019_business_photos'),
  ('0020_business_modules'),
  ('0021_business_items'),
  ('0022_events_owner'),
  ('0023_review_replies'),
  ('0024_business_updates'),
  ('0025_business_team'),
  ('0026_business_settings'),
  ('0027_business_bookings'),
  ('0028_business_orders'),
  ('0029_business_messages'),
  ('0030_business_customers'),
  ('0031_profile_settings'),
  ('0032_consumer_transactions'),
  ('0033_business_by_slug'),
  ('0034_listing_contact_fields'),
  ('0035_business_website'),
  ('0036_contact_by_message'),
  ('0037_message_phone'),
  ('0038_subcategory_suggestions'),
  ('0039_feature_suggestions'),
  ('0040_card_features'),
  ('0041_business_logo'),
  ('0042_business_photos_by_slug'),
  ('0043_hours_exceptions'),
  ('0044_business_relations'),
  ('0045_menu_config'),
  ('0046_service_config'),
  ('0047_service_price_in_rpc'),
  ('0048_product_config'),
  ('0049_order_fulfillment'),
  ('0050_rental_config'),
  ('0051_rental_availability'),
  ('0052_booking_capacity'),
  ('0053_customer_chat'),
  ('0054_notifications'),
  ('0055_business_search'),
  ('0056_real_reviews'),
  ('0057_reviews_reply_read'),
  ('0058_review_photos'),
  ('0059_booking_slot_capacity'),
  ('0060_transaction_realtime'),
  ('0061_events_ticketing'),
  ('0062_events_pro_create'),
  ('0063_events_discovery_integrity'),
  ('0064_events_multi_ticket_search'),
  ('0065_events_phase2'),
  ('0066_events_cover_in_lists'),
  ('0067_fix_buy_notify_and_promo_ambiguity'),
  ('0068_audit_batch_a'),
  ('0069_crm_orders_reviews'),
  ('0070_stripe_subscriptions'),
  ('0071_stripe_connect'),
  ('0072_marketplace_checkout'),
  ('0073_marketplace_booking_rental'),
  ('0074_delivery_checkout'),
  ('0075_public_delivery_info'),
  ('0076_delivery_range'),
  ('0077_listing_metrics'),
  ('0078_metrics_self_view'),
  ('0079_search_and_timezone'),
  ('0080_scale_indexes'),
  ('0081_rls_hardening'),
  ('0082_profiles_self_read'),
  ('0083_cod_insert_hardening'),
  ('0084_customer_update_scope'),
  ('0085_delivery_tips'),
  ('0086_check_promo'),
  ('0087_owner_promo_stats'),
  ('0088_promo_scopes'),
  ('0089_web_push'),
  ('0090_order_code_default'),
  ('0091_delivery_time_label'),
  ('0092_booking_pro'),
  ('0093_store_order_notify'),
  ('0094_updates_pro'),
  ('0095_booking_approval'),
  ('0096_review_notify'),
  ('0097_rental_orders'),
  ('0098_rental_approval_no_owner_exception'),
  ('0099_rental_paid_orders'),
  ('0100_rental_availability_cart'),
  ('0101_rental_deposit_hold'),
  ('0102_business_endorsements'),
  ('0103_endorse_card_and_post'),
  ('0104_ledger_and_ticket_gate')
on conflict (version) do nothing;

-- ── 2) PAID-TICKET PAYMENT GATE (#1) ─────────────────────────────────────────
-- Before this, buy_event_tickets_multi (called by any signed-in user) issued
-- tickets for ANY tier — including paid ones — without ever checking payment. A
-- user could mint confirmed paid tickets for free via a direct RPC call. Now the
-- consumer wrapper REFUSES a paid tier when the organizer accepts online payments:
-- those must go through Stripe (fulfill_event_tickets_multi, called by the webhook
-- after payment). Free tiers and cash/no-Stripe organizers are unaffected.
create or replace function public.buy_event_tickets_multi(in_slug text, in_items jsonb, in_promo text default null)
returns table(ticket_id uuid, code text, tier_id uuid)
language plpgsql security definer set search_path = public as $fn$
declare
  v_ev   uuid;
  v_pays boolean;
  v_paid boolean;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;

  -- Resolve the event and whether its organizer accepts online payments.
  select e.id,
         exists (select 1 from public.businesses b
                  where b.owner_id = e.owner_id and coalesce(b.connect_charges_enabled, false))
    into v_ev, v_pays
    from public.events e
   where e.slug = in_slug
   limit 1;
  if v_ev is null then raise exception 'event not found'; end if;

  -- Does the request include at least one PAID tier (price > 0, qty > 0)?
  select exists (
    select 1
    from jsonb_array_elements(in_items) it
    join public.event_tiers t on t.id = (it->>'tierId')::uuid
    where coalesce((it->>'qty')::int, 0) > 0
      and coalesce(t.price, 0) > 0
  ) into v_paid;

  -- SECURITY: a paid tier for a payments-enabled organizer must be paid via Stripe,
  -- never issued for free here. (The webhook path uses fulfill_event_tickets_multi.)
  if v_paid and v_pays then
    raise exception 'payment required' using errcode = 'check_violation';
  end if;

  return query select * from public._issue_tickets_multi(auth.uid(), in_slug, in_items, in_promo);
end $fn$;

notify pgrst, 'reload schema';
