-- To'Latino — Eventos y boletos to Eventbrite parity. Today an event has ONE flat
-- price_label and "tiers" are pure UI decoration; there's no capacity, no sold-out
-- truth, no working check-in, the "N asisten" counter never moves, and buying/RSVP
-- notifies nobody. This migration adds the real spine:
--   • event_tiers (General/VIP/… — each its own price, capacity, sales window)
--   • event_tickets gains tier_id + unit_price snapshot + used_at (check-in)
--   • events gains ends_at / cover_url / status
--   • buy_event_tickets() — capacity-checked, atomic, no overselling
--   • event_by_slug() — the rich detail read (event + tiers + live availability)
--   • checkin_ticket() — organizer validates a code, flips it to used
--   • triggers keep tier.sold + events.going_count accurate, and notify the organizer
-- Payments stay deferred (tickets are reserved, unit_price snapshotted for later
-- charging). Portable vanilla Postgres. Idempotent. Apply: paste + Run.

-- ── events: end time, cover, lifecycle status ────────────────────────────────
alter table public.events add column if not exists ends_at    timestamptz;
alter table public.events add column if not exists cover_url  text;
alter table public.events add column if not exists status     text not null default 'published';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'events_status_chk') then
    alter table public.events add constraint events_status_chk check (status in ('draft', 'published', 'cancelled'));
  end if;
end $$;

-- ── ticket tiers ─────────────────────────────────────────────────────────────
create table if not exists public.event_tiers (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events(id) on delete cascade,
  name_es     text not null,
  name_en     text not null,
  price       numeric not null default 0,          -- 0 = free tier
  capacity    int,                                  -- null = unlimited
  sold        int not null default 0,               -- maintained by trigger below
  sort        int not null default 0,
  sales_start timestamptz,                           -- null = on sale now
  sales_end   timestamptz,                           -- null = until event
  visible     boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists event_tiers_event_idx on public.event_tiers (event_id, sort);

alter table public.event_tiers enable row level security;
-- public reads visible tiers of published events; the owner manages their own.
drop policy if exists "public read visible tiers" on public.event_tiers;
create policy "public read visible tiers" on public.event_tiers for select
  using (visible or exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid()));
drop policy if exists "owner insert tiers" on public.event_tiers;
create policy "owner insert tiers" on public.event_tiers for insert
  with check (exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid()));
drop policy if exists "owner update tiers" on public.event_tiers;
create policy "owner update tiers" on public.event_tiers for update
  using (exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid()))
  with check (exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid()));
drop policy if exists "owner delete tiers" on public.event_tiers;
create policy "owner delete tiers" on public.event_tiers for delete
  using (exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid()));

-- ── event_tickets: tier link + price snapshot + check-in stamp ───────────────
alter table public.event_tickets add column if not exists tier_id    uuid references public.event_tiers(id) on delete set null;
alter table public.event_tickets add column if not exists unit_price numeric;
alter table public.event_tickets add column if not exists used_at    timestamptz;
create index if not exists event_tickets_tier_idx on public.event_tickets (tier_id);
create index if not exists event_tickets_code_idx on public.event_tickets (code);

-- ── keep tier.sold accurate (recompute the touched tiers; drift-proof) ───────
-- "sold" counts active tickets (confirmed | used); refunded frees the seat.
create or replace function public.tg_event_tier_sold() returns trigger
language plpgsql security definer set search_path = public as $$
declare t uuid;
begin
  foreach t in array array[new.tier_id, old.tier_id] loop
    if t is not null then
      update public.event_tiers set sold = coalesce(
        (select sum(qty) from public.event_tickets k where k.tier_id = t and k.status in ('confirmed', 'used')), 0)
      where id = t;
    end if;
  end loop;
  return coalesce(new, old);
end $$;
drop trigger if exists trg_event_tier_sold on public.event_tickets;
create trigger trg_event_tier_sold after insert or update or delete on public.event_tickets
  for each row execute function public.tg_event_tier_sold();

-- ── keep events.going_count accurate from event_attendance (was dead) ────────
create or replace function public.tg_event_going() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_ev uuid;
begin
  v_ev := coalesce(new.event_id, old.event_id);
  update public.events set going_count =
    (select count(*) from public.event_attendance where event_id = v_ev)
  where id = v_ev;
  return coalesce(new, old);
end $$;
drop trigger if exists trg_event_going on public.event_attendance;
create trigger trg_event_going after insert or delete on public.event_attendance
  for each row execute function public.tg_event_going();
-- backfill any events whose counter drifted while the trigger didn't exist
update public.events e set going_count =
  (select count(*) from public.event_attendance a where a.event_id = e.id)
where exists (select 1 from public.event_attendance a where a.event_id = e.id);

-- ── notifications: ticket sale + RSVP → the organizer (mirrors 0054) ─────────
create or replace function public.tg_notify_ticket() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_title text;
begin
  if tg_op = 'INSERT' then
    select owner_id, title_es into v_owner, v_title from public.events where id = new.event_id;
    perform public.notify_user(v_owner, 'ticket_new',
      jsonb_build_object('event', v_title, 'qty', new.qty, 'name', new.customer_name, 'code', new.code), '/negocio');
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    select title_es into v_title from public.events where id = new.event_id;
    perform public.notify_user(new.user_id, 'ticket_status',
      jsonb_build_object('event', v_title, 'status', new.status, 'code', new.code), '/cuenta');
  end if;
  return new;
end $$;
drop trigger if exists trg_notify_ticket on public.event_tickets;
create trigger trg_notify_ticket after insert or update on public.event_tickets
  for each row execute function public.tg_notify_ticket();

create or replace function public.tg_notify_rsvp() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_title text;
begin
  select owner_id, title_es into v_owner, v_title from public.events where id = new.event_id;
  perform public.notify_user(v_owner, 'rsvp_new', jsonb_build_object('event', v_title), '/negocio');
  return new;
end $$;
drop trigger if exists trg_notify_rsvp on public.event_attendance;
create trigger trg_notify_rsvp after insert on public.event_attendance
  for each row execute function public.tg_notify_rsvp();

-- ── public: an event + its live ticket tiers, by slug (the detail read) ──────
create or replace function public.event_by_slug(in_slug text)
returns table (
  slug text, title_es text, title_en text, venue_es text, venue_en text,
  cat text, city text, starts_at timestamptz, ends_at timestamptz,
  time_label_es text, time_label_en text, price_label text,
  desc_es text, desc_en text, tile_a text, tile_b text, cover_url text,
  status text, going_count int, lat double precision, lng double precision,
  organizer text, tiers jsonb
)
language sql stable security definer set search_path = public as $$
  select e.slug, e.title_es, e.title_en, e.venue_es, e.venue_en,
         e.cat, e.city, e.starts_at, e.ends_at,
         e.time_label_es, e.time_label_en, e.price_label,
         e.desc_es, e.desc_en, e.tile_a, e.tile_b, e.cover_url,
         e.status, e.going_count,
         case when e.location is not null then st_y(e.location::geometry) end,
         case when e.location is not null then st_x(e.location::geometry) end,
         coalesce(
           (select b.name from public.businesses b where b.owner_id = e.owner_id order by b.created_at limit 1),
           (select p.display_name from public.profiles p where p.id = e.owner_id),
           'Organizador'),
         coalesce((
           select jsonb_agg(jsonb_build_object(
             'id', t.id, 'name_es', t.name_es, 'name_en', t.name_en,
             'price', t.price, 'capacity', t.capacity, 'sold', t.sold,
             'remaining', case when t.capacity is null then null else greatest(0, t.capacity - t.sold) end,
             'sales_start', t.sales_start, 'sales_end', t.sales_end
           ) order by t.sort, t.created_at)
           from public.event_tiers t where t.event_id = e.id and t.visible), '[]'::jsonb)
  from public.events e
  where e.slug = in_slug
  limit 1;
$$;
grant execute on function public.event_by_slug(text) to anon, authenticated;

-- ── buy tickets for one tier: capacity-checked, atomic, no overselling ───────
create or replace function public.buy_event_tickets(in_slug text, in_tier_id uuid, in_qty int)
returns table (ticket_id uuid, code text) language plpgsql security definer set search_path = public as $$
declare v_ev uuid; v_status text; v_name text; v_price numeric; v_cap int; v_sold int;
        v_start timestamptz; v_end timestamptz; v_id uuid; v_code text; q int;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  q := greatest(1, least(coalesce(in_qty, 1), 10));
  select id, status into v_ev, v_status from public.events where slug = in_slug;
  if v_ev is null then raise exception 'event not found'; end if;
  if v_status = 'cancelled' then raise exception 'event cancelled'; end if;
  -- lock the tier row so concurrent buys serialize on capacity
  select price, capacity, sold, sales_start, sales_end into v_price, v_cap, v_sold, v_start, v_end
    from public.event_tiers where id = in_tier_id and event_id = v_ev for update;
  if not found then raise exception 'tier not found'; end if;
  if v_start is not null and now() < v_start then raise exception 'not on sale yet'; end if;
  if v_end   is not null and now() > v_end   then raise exception 'sales closed'; end if;
  if v_cap is not null and v_sold + q > v_cap then raise exception 'sold out'; end if;
  select coalesce(nullif(btrim(display_name), ''), 'Cliente') into v_name from public.profiles where id = auth.uid();
  insert into public.event_tickets (event_id, user_id, customer_name, tier_id, qty, unit_price, total, status)
    values (v_ev, auth.uid(), coalesce(v_name, 'Cliente'), in_tier_id, q, v_price, v_price * q, 'confirmed')
    returning id, code into v_id, v_code;   -- trigger bumps tier.sold
  return query select v_id, v_code;
end $$;
grant execute on function public.buy_event_tickets(text, uuid, int) to authenticated;

-- ── organizer check-in: validate a ticket code, flip it to used (once) ───────
create or replace function public.checkin_ticket(in_code text)
returns table (ok boolean, msg text, buyer text, qty int, tier text, already boolean) language plpgsql security definer set search_path = public as $$
declare v_tk record; v_owner uuid; v_tier text;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  select k.*, e.owner_id as ev_owner into v_tk
    from public.event_tickets k join public.events e on e.id = k.event_id
    where upper(k.code) = upper(btrim(in_code)) limit 1;
  if v_tk is null then return query select false, 'no encontrado', null::text, null::int, null::text, false; return; end if;
  if v_tk.ev_owner is distinct from auth.uid() then raise exception 'not your event'; end if;
  select coalesce(name_es, '') into v_tier from public.event_tiers where id = v_tk.tier_id;
  if v_tk.status = 'used' then
    return query select false, 'ya usado', v_tk.customer_name, v_tk.qty, v_tier, true; return;
  end if;
  if v_tk.status = 'refunded' then
    return query select false, 'reembolsado', v_tk.customer_name, v_tk.qty, v_tier, false; return;
  end if;
  update public.event_tickets set status = 'used', used_at = now() where id = v_tk.id;
  return query select true, 'admitido', v_tk.customer_name, v_tk.qty, v_tier, false;
end $$;
grant execute on function public.checkin_ticket(text) to authenticated;

notify pgrst, 'reload schema';
