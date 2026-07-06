-- To'Latino — professional Entregas y envíos flow: give each order an operational
-- overlay so the business can run a DoorDash/Instacart-style delivery dispatch
-- board and a product-shipping queue. Per-order operational state lives on the
-- ORDER ROW (scale-aware; not a business-level blob):
--   • fulfillment jsonb — { address, dispatch, driver, eta,  ship, carrier,
--     tracking, pkg, weight, ... } — the live dispatch / shipment state.
-- Also allow a 'ship' channel (physical product shipments) alongside the existing
-- dine-in / pickup / delivery. The core `status` enum is unchanged (still
-- new·preparing·ready·completed·cancelled) so the Pedidos tab keeps working; the
-- delivery/shipment sub-state lives in `fulfillment`. RLS is inherited (owner +
-- customer can update, migration 0032). Idempotent. Apply: paste into the
-- Supabase SQL Editor + Run.

alter table public.business_orders add column if not exists fulfillment jsonb;

-- allow physical-shipment orders (channel='ship') for the shipping queue
alter table public.business_orders drop constraint if exists business_orders_channel_check;
alter table public.business_orders add constraint business_orders_channel_check
  check (channel in ('dinein', 'pickup', 'delivery', 'ship'));

notify pgrst, 'reload schema';
