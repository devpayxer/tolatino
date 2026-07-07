-- To'Latino — realtime for the two-sided transaction loop. The customer's Mi cuenta
-- (and the owner's queues) should reflect a status change the instant it happens,
-- not on the next reload. The rows already carry dual customer↔owner RLS (0032), so
-- realtime respects it — each side only receives its own rows. This just adds the
-- transaction tables to the supabase_realtime publication (idempotent, mirrors the
-- guarded pattern from 0007/0053/0054). Apply: paste into the SQL Editor + Run.

do $$
declare t text;
begin
  foreach t in array array[
    'business_orders', 'business_bookings', 'business_rentals',
    'event_tickets', 'event_attendance'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

notify pgrst, 'reload schema';
