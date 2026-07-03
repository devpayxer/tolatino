-- To'Latino — store the address's own city on saved addresses, so selecting a
-- saved address switches the app to the right city (from the geocoder, not the
-- nearest centroid). Idempotent. Apply: paste into the SQL Editor and Run.

alter table public.user_addresses add column if not exists city text;
