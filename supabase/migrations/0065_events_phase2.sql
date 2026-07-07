-- 0065_events_phase2.sql — To'Latino Eventos Phase 2 (Eventbrite-grade run-the-event core).
-- ONE idempotent migration merging four DB areas (QR needs no SQL):
--   A) INDIVIDUAL ADMISSIONS — event_tickets.admitted + redesigned checkin_ticket
--      (admit N guests of a group ticket per scan, not all-or-nothing).
--   B) WAITLIST — event_waitlist + RLS + join/leave/notify RPCs + auto seat-freed
--      trigger (dormant until a ticket-refund flow ships) + convert trigger.
--   C) PROMO CODES — event_promo_codes + RLS + validate_promo + buy_event_tickets_multi
--      gains in_promo (access-codes unlock hidden tiers = REAL now; %/$ discounts =
--      snapshot-only until payments). Adds event_tickets.promo_code (per-line audit)
--      and CLOSES a latent hole: buy_event_tickets_multi never checked tier.visible.
--   D) MAP + ORGANIZER — event_by_slug gains organizer_slug; events_by_owner RPC.
-- Portable vanilla Postgres. Idempotent (re-runnable). Payments still DEFERRED:
-- tickets are RESERVED, unit_price/total snapshotted; no money moves.
-- Apply: paste this WHOLE file into the Supabase SQL Editor and Run.

-- ===========================================================================
-- A) INDIVIDUAL ADMISSIONS
-- ===========================================================================

-- admitted counter (0..qty). Constant default = metadata-only (no table rewrite, PG11+).
alter table public.event_tickets add column if not exists admitted int not null default 0;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'event_tickets_admitted_chk') then
    alter table public.event_tickets add constraint event_tickets_admitted_chk
      check (admitted >= 0 and admitted <= qty);
  end if;
end $$;
-- backfill: tickets already flipped to 'used' by the old all-or-nothing check-in are fully inside.
update public.event_tickets set admitted = qty where status = 'used' and admitted <> qty;

-- per-line audit: which promo code a ticket used (aggregate count lives on event_promo_codes.used).
alter table public.event_tickets add column if not exists promo_code text;

-- Redesigned check-in: admit in_qty guests of a (possibly group) ticket per scan.
-- Return signature changed → DROP the old 1-arg overload first (PG refuses to change
-- RETURNS TABLE cols of a live function; and 1-arg vs 2-arg would be an ambiguous overload).
drop function if exists public.checkin_ticket(text);
create or replace function public.checkin_ticket(in_code text, in_qty int default 1)
returns table (ok boolean, msg text, buyer text, tier text, admitted int, qty int, already boolean)
language plpgsql security definer set search_path = public as $$
declare v_tk record; v_tier text; v_n int; v_new int;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  -- lock the matched ticket row so concurrent scans of the same code serialize (no over-admit).
  -- FOR UPDATE OF k locks only event_tickets (not the joined events row). Codes are
  -- "unique-ish" (non-unique index) → ORDER BY created_at LIMIT 1 deterministically
  -- picks the oldest (matches 0061's original LIMIT 1).
  select k.*, e.owner_id as ev_owner into v_tk
    from public.event_tickets k join public.events e on e.id = k.event_id
    where upper(k.code) = upper(btrim(in_code))
    order by k.created_at
    limit 1
    for update of k;
  if v_tk is null then
    return query select false, 'no encontrado', null::text, null::text, null::int, null::int, false; return;
  end if;
  if v_tk.ev_owner is distinct from auth.uid() then raise exception 'not your event'; end if;
  select coalesce(nullif(btrim(name_es), ''), '') into v_tier
    from public.event_tiers where id = v_tk.tier_id;
  if v_tk.status = 'refunded' then
    return query select false, 'reembolsado', v_tk.customer_name, v_tier, v_tk.admitted, v_tk.qty, false; return;
  end if;
  -- already fully inside → idempotent no-op
  if v_tk.admitted >= v_tk.qty then
    return query select false, 'ya usado', v_tk.customer_name, v_tier, v_tk.qty, v_tk.qty, true; return;
  end if;
  v_n   := greatest(1, least(coalesce(in_qty, 1), v_tk.qty - v_tk.admitted));  -- 1..remaining
  v_new := v_tk.admitted + v_n;
  update public.event_tickets
     set admitted = v_new,
         status   = case when v_new >= v_tk.qty then 'used' else status  end,   -- flip only on last guest
         used_at  = case when v_new >= v_tk.qty then now() else used_at end
   where id = v_tk.id;
  -- triggers: tg_event_tier_sold re-sums (confirmed+used both count, unchanged);
  -- tg_notify_ticket pings buyer ONCE only when status→'used' (partial admits silent).
  return query select true, 'admitido', v_tk.customer_name, v_tier, v_new, v_tk.qty, false;
end $$;
grant execute on function public.checkin_ticket(text, int) to authenticated;

-- ===========================================================================
-- B) WAITLIST ("Avísame si se libera")
-- ===========================================================================

create table if not exists public.event_waitlist (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references public.events(id)     on delete cascade,
  tier_id       uuid         references public.event_tiers(id) on delete cascade, -- null = any tier
  user_id       uuid not null references auth.users(id)        on delete cascade,
  customer_name text,                          -- snapshot (organizer roster needs no cross-profile read)
  status        text not null default 'active',
  created_at    timestamptz not null default now(),
  notified_at   timestamptz
);
do $$ begin
  if not exists (select 1 from pg_constraint where conname='event_waitlist_status_chk') then
    alter table public.event_waitlist add constraint event_waitlist_status_chk
      check (status in ('active','notified','converted'));
  end if;
end $$;

-- tier_id nullable → NULLs are DISTINCT in a plain unique constraint (user could join
-- the "any" list twice). Collapse null → sentinel uuid in ONE expression index.
create unique index if not exists event_waitlist_uniq on public.event_waitlist
  (event_id, coalesce(tier_id,'00000000-0000-0000-0000-000000000000'::uuid), user_id);
create index if not exists event_waitlist_active_idx on public.event_waitlist
  (event_id, tier_id, created_at) where status='active';
create index if not exists event_waitlist_event_idx on public.event_waitlist
  (event_id, created_at desc);

alter table public.event_waitlist enable row level security;
drop policy if exists "waitlist read own or owner" on public.event_waitlist;
create policy "waitlist read own or owner" on public.event_waitlist for select
  using (user_id = auth.uid()
         or exists (select 1 from public.events e where e.id=event_id and e.owner_id=auth.uid()));
drop policy if exists "waitlist insert own" on public.event_waitlist;
create policy "waitlist insert own" on public.event_waitlist for insert
  with check (user_id = auth.uid());
drop policy if exists "waitlist delete own" on public.event_waitlist;
create policy "waitlist delete own" on public.event_waitlist for delete
  using (user_id = auth.uid());
-- no UPDATE policy: status moves only inside the SECURITY DEFINER fns/triggers.

create or replace function public.join_waitlist(in_slug text, in_tier_id uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_ev uuid; v_status text; v_name text;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  select id, status into v_ev, v_status from public.events where slug=in_slug;
  if v_ev is null then raise exception 'event not found'; end if;
  if v_status <> 'published' then raise exception 'event not open'; end if;
  if in_tier_id is not null and not exists
     (select 1 from public.event_tiers where id=in_tier_id and event_id=v_ev)
  then raise exception 'tier not found'; end if;
  select coalesce(nullif(btrim(display_name),''),'Cliente') into v_name
    from public.profiles where id=auth.uid();
  insert into public.event_waitlist (event_id, tier_id, user_id, customer_name, status)
  values (v_ev, in_tier_id, auth.uid(), coalesce(v_name,'Cliente'), 'active')
  on conflict (event_id, coalesce(tier_id,'00000000-0000-0000-0000-000000000000'::uuid), user_id)
  do update set status='active', notified_at=null, customer_name=excluded.customer_name;
end $$;
grant execute on function public.join_waitlist(text, uuid) to authenticated;

create or replace function public.leave_waitlist(in_slug text, in_tier_id uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_ev uuid;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  select id into v_ev from public.events where slug=in_slug;
  if v_ev is null then raise exception 'event not found'; end if;
  delete from public.event_waitlist
   where event_id=v_ev and user_id=auth.uid()
     and coalesce(tier_id,'00000000-0000-0000-0000-000000000000'::uuid)
       = coalesce(in_tier_id,'00000000-0000-0000-0000-000000000000'::uuid);
end $$;
grant execute on function public.leave_waitlist(text, uuid) to authenticated;

-- a ticket → 'refunded' frees its qty; ping the oldest `qty` active waiters (FIFO),
-- tier-specific + any/null waiters, only while the event is still published.
-- DORMANT until a ticket-refund flow exists (checkin sets 'used', buys set 'confirmed',
-- cancel_event cancels the whole event) — the organizer manual blast is the live path today.
create or replace function public.tg_waitlist_seat_freed() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_slug text; v_title text; v_ev_status text; v_freed int; r record;
begin
  if new.status='refunded' and old.status is distinct from 'refunded' then
    select slug, title_es, status into v_slug, v_title, v_ev_status
      from public.events where id=new.event_id;
    if v_ev_status <> 'published' then return new; end if;
    v_freed := greatest(coalesce(new.qty,1),1);
    for r in
      update public.event_waitlist w set status='notified', notified_at=now()
      where w.id in (
        select id from public.event_waitlist
         where event_id=new.event_id and status='active'
           and (tier_id is null or (new.tier_id is not null and tier_id=new.tier_id))
         order by created_at limit v_freed)
      returning w.user_id
    loop
      perform public.notify_user(r.user_id,'waitlist_open',
        jsonb_build_object('event',v_title),'/eventos/?e='||v_slug);
    end loop;
  end if;
  return new;
end $$;
drop trigger if exists trg_waitlist_seat_freed on public.event_tickets;
create trigger trg_waitlist_seat_freed after update on public.event_tickets
  for each row execute function public.tg_waitlist_seat_freed();

-- a waitlisted buyer who purchases → 'converted' (self-contained; no edit to the buy RPC needed).
create or replace function public.tg_waitlist_convert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.event_waitlist set status='converted'
   where event_id=new.event_id and user_id=new.user_id and status in ('active','notified')
     and (tier_id is null or (new.tier_id is not null and tier_id=new.tier_id));
  return new;
end $$;
drop trigger if exists trg_waitlist_convert on public.event_tickets;
create trigger trg_waitlist_convert after insert on public.event_tickets
  for each row execute function public.tg_waitlist_convert();

-- organizer manual blast: notify everyone still active for a tier/event.
create or replace function public.notify_waitlist(in_event_id uuid, in_tier_id uuid default null)
returns int language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_slug text; v_title text; n int := 0; r record;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  select owner_id, slug, title_es into v_owner, v_slug, v_title
    from public.events where id=in_event_id;
  if v_owner is null then raise exception 'event not found'; end if;
  if v_owner is distinct from auth.uid() then raise exception 'not your event'; end if;
  for r in
    update public.event_waitlist w set status='notified', notified_at=now()
    where w.event_id=in_event_id and w.status='active'
      and (in_tier_id is null or w.tier_id=in_tier_id or w.tier_id is null)
    returning w.user_id
  loop
    perform public.notify_user(r.user_id,'waitlist_open',
      jsonb_build_object('event',v_title),'/eventos/?e='||v_slug);
    n := n+1;
  end loop;
  return n;
end $$;
grant execute on function public.notify_waitlist(uuid, uuid) to authenticated;

-- ===========================================================================
-- C) PROMO CODES (access = real now; %/$ discounts = snapshot-only until payments)
-- ===========================================================================

create table if not exists public.event_promo_codes (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  code       text not null,
  kind       text not null check (kind in ('percent','amount','access')),
  value      numeric not null default 0,
  tier_id    uuid references public.event_tiers(id) on delete cascade, -- access: tier it unlocks; discount: optional scope (null=whole order)
  max_uses   int,                                    -- null = unlimited
  used       int not null default 0,                 -- redemptions (bumped by buy RPC)
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  constraint event_promo_access_needs_tier check (kind <> 'access' or tier_id is not null),
  constraint event_promo_percent_range     check (kind <> 'percent' or (value > 0 and value <= 100)),
  constraint event_promo_amount_positive   check (kind <> 'amount'  or value > 0)
);
-- one code per event (case-insensitive) AND the validate lookup index (scales to 1M+).
create unique index if not exists event_promo_codes_event_code_uidx
  on public.event_promo_codes (event_id, upper(code));

alter table public.event_promo_codes enable row level security;
-- OWNER-ONLY. No public/anon select: buyers never enumerate codes; they validate ONE
-- code via validate_promo (security definer) below.
drop policy if exists "owner read promo"   on public.event_promo_codes;
create policy "owner read promo"   on public.event_promo_codes for select
  using (exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid()));
drop policy if exists "owner insert promo" on public.event_promo_codes;
create policy "owner insert promo" on public.event_promo_codes for insert
  with check (exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid()));
drop policy if exists "owner update promo" on public.event_promo_codes;
create policy "owner update promo" on public.event_promo_codes for update
  using (exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid()))
  with check (exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid()));
drop policy if exists "owner delete promo" on public.event_promo_codes;
create policy "owner delete promo" on public.event_promo_codes for delete
  using (exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid()));

-- validate_promo — public single-code check; access returns the hidden tier jsonb
-- in the SAME shape event_by_slug emits (client appends it to the tier list).
create or replace function public.validate_promo(in_slug text, in_code text)
returns table (ok boolean, kind text, value numeric, tier_id uuid, msg text, tier jsonb)
language plpgsql stable security definer set search_path = public as $$
declare v_ev uuid; v_status text; v_code text; p record;
begin
  v_code := upper(btrim(coalesce(in_code, '')));
  if v_code = '' then
    return query select false, null::text, null::numeric, null::uuid, 'Ingresa un código'::text, null::jsonb; return;
  end if;
  select id, status into v_ev, v_status from public.events where slug = in_slug;
  if v_ev is null or v_status <> 'published' then
    return query select false, null::text, null::numeric, null::uuid, 'Evento no disponible'::text, null::jsonb; return;
  end if;
  select * into p from public.event_promo_codes
    where event_id = v_ev and upper(code) = v_code and active limit 1;
  if not found then
    return query select false, null::text, null::numeric, null::uuid, 'Código no válido'::text, null::jsonb; return;
  end if;
  if p.max_uses is not null and p.used >= p.max_uses then
    return query select false, null::text, null::numeric, null::uuid, 'Código agotado'::text, null::jsonb; return;
  end if;
  if p.kind = 'access' then
    return query select true, 'access'::text, 0::numeric, p.tier_id, 'Boleto desbloqueado'::text,
      (select jsonb_build_object('id', t.id, 'name_es', t.name_es, 'name_en', t.name_en,
              'price', t.price, 'capacity', t.capacity, 'sold', t.sold,
              'remaining', case when t.capacity is null then null else greatest(0, t.capacity - t.sold) end,
              'sales_start', t.sales_start, 'sales_end', t.sales_end)
       from public.event_tiers t where t.id = p.tier_id and t.event_id = v_ev);
    return;
  end if;
  return query select true, p.kind, p.value, p.tier_id, 'Código aplicado'::text, null::jsonb;
end $$;
grant execute on function public.validate_promo(text, text) to anon, authenticated;

-- buy_event_tickets_multi + optional in_promo. Existing {in_slug,in_items} PostgREST
-- calls still resolve (in_promo defaults null). DROP the 2-arg first: adding a
-- defaulted 3rd arg via CREATE OR REPLACE would leave TWO overloads (PostgREST ambiguity).
drop function if exists public.buy_event_tickets_multi(text, jsonb);
create or replace function public.buy_event_tickets_multi(in_slug text, in_items jsonb, in_promo text default null)
returns table (ticket_id uuid, code text, tier_id uuid)
language plpgsql security definer set search_path = public as $$
declare
  v_ev uuid; v_status text; v_owner uuid; v_title text; v_name text;
  v_tier record; v_matched int := 0; v_req int; v_total_qty int := 0;
  v_code text; p record;
  v_kind text := null; v_pvalue numeric := 0; v_scope uuid := null;
  v_promo_id uuid := null; v_access_tier uuid := null;
  v_factor numeric := 1; v_gross numeric := 0;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  if in_items is null or jsonb_typeof(in_items) <> 'array' then raise exception 'no tickets selected'; end if;
  select id, status into v_ev, v_status from public.events where slug = in_slug;
  if v_ev is null then raise exception 'event not found'; end if;
  if v_status = 'cancelled' then raise exception 'event cancelled'; end if;
  if v_status <> 'published' then raise exception 'event not on sale'; end if;

  -- resolve promo under a row lock → max_uses is race-safe (promo-first, then tiers by id = no deadlock).
  v_code := nullif(upper(btrim(coalesce(in_promo, ''))), '');
  if v_code is not null then
    select * into p from public.event_promo_codes
      where event_id = v_ev and upper(code) = v_code and active for update;
    if not found then raise exception 'promo invalid' using errcode = 'check_violation'; end if;
    if p.max_uses is not null and p.used >= p.max_uses then
      raise exception 'promo exhausted' using errcode = 'check_violation'; end if;
    v_promo_id := p.id; v_kind := p.kind; v_pvalue := p.value; v_scope := p.tier_id;
    if v_kind = 'access'  then v_access_tier := p.tier_id;
    elsif v_kind = 'percent' then v_factor := greatest(0, 1 - v_pvalue/100.0); end if;
    -- 'amount' factor computed after we know the discountable gross (below)
  end if;

  select count(*) into v_req from (
    select distinct (i->>'tier_id')::uuid from jsonb_array_elements(in_items) i
    where coalesce((i->>'qty')::int, 0) > 0) s;
  if v_req = 0 then raise exception 'no tickets selected'; end if;

  -- PHASE 1 — lock + validate every tier; ENFORCE visibility (hidden tier only if this
  -- order's access code unlocked exactly it) and accumulate discountable gross.
  for v_tier in
    with req as (
      select (i->>'tier_id')::uuid as tier_id,
             least(greatest(sum((i->>'qty')::int), 1), 10) as qty
      from jsonb_array_elements(in_items) i
      where coalesce((i->>'qty')::int, 0) > 0 group by 1)
    select t.id, coalesce(nullif(btrim(t.name_es), ''), 'Boleto') as name_es,
           t.capacity, t.sold, t.sales_start, t.sales_end, t.visible, t.price, r.qty
    from req r join public.event_tiers t on t.id = r.tier_id and t.event_id = v_ev
    order by t.id for update of t
  loop
    if not v_tier.visible and v_tier.id is distinct from v_access_tier then
      raise exception 'tier not found';                 -- never reveal a locked tier
    end if;
    if v_tier.sales_start is not null and now() < v_tier.sales_start then
      raise exception 'not on sale yet: %', v_tier.name_es using errcode = 'check_violation'; end if;
    if v_tier.sales_end is not null and now() > v_tier.sales_end then
      raise exception 'sales closed: %', v_tier.name_es using errcode = 'check_violation'; end if;
    if v_tier.capacity is not null and v_tier.sold + v_tier.qty > v_tier.capacity then
      raise exception 'sold out: %', v_tier.name_es using errcode = 'check_violation'; end if;
    v_matched := v_matched + 1; v_total_qty := v_total_qty + v_tier.qty;
    if v_kind in ('percent','amount') and (v_scope is null or v_scope = v_tier.id) then
      v_gross := v_gross + v_tier.price * v_tier.qty;
    end if;
  end loop;
  if v_matched <> v_req then raise exception 'tier not found'; end if;

  if v_kind = 'amount' then
    v_factor := case when v_gross > 0 then greatest(0, (v_gross - v_pvalue) / v_gross) else 1 end;
  end if;

  select coalesce(nullif(btrim(display_name), ''), 'Cliente') into v_name
    from public.profiles where id = auth.uid();
  perform set_config('tolatino.bulk_ticket', 'on', true);

  -- PHASE 2 — issue all tickets atomically; snapshot the (maybe discounted) price on
  -- scoped lines only; access leaves price untouched; record the code used.
  return query
    with req as (
      select (i->>'tier_id')::uuid as tier_id,
             least(greatest(sum((i->>'qty')::int), 1), 10) as qty
      from jsonb_array_elements(in_items) i
      where coalesce((i->>'qty')::int, 0) > 0 group by 1)
    insert into public.event_tickets
      (event_id, user_id, customer_name, tier_id, qty, unit_price, total, status, promo_code)
    select v_ev, auth.uid(), coalesce(v_name, 'Cliente'), t.id, r.qty,
           round(t.price * case when v_kind in ('percent','amount')
                                     and (v_scope is null or v_scope = t.id)
                                then v_factor else 1 end, 2),
           round(t.price * r.qty * case when v_kind in ('percent','amount')
                                             and (v_scope is null or v_scope = t.id)
                                        then v_factor else 1 end, 2),
           'confirmed', v_code
    from req r join public.event_tiers t on t.id = r.tier_id and t.event_id = v_ev
    order by t.id
    returning event_tickets.id, event_tickets.code, event_tickets.tier_id;

  if v_promo_id is not null then
    update public.event_promo_codes set used = used + 1 where id = v_promo_id;
  end if;

  select owner_id, title_es into v_owner, v_title from public.events where id = v_ev;
  perform public.notify_user(v_owner, 'ticket_new',
    jsonb_build_object('event', v_title, 'qty', v_total_qty, 'name', coalesce(v_name, 'Cliente'), 'promo', v_code), '/negocio');
end $$;
grant execute on function public.buy_event_tickets_multi(text, jsonb, text) to authenticated;

-- ===========================================================================
-- D) MAP EMBED (client-only, no SQL) + ORGANIZER PROFILE
-- ===========================================================================

-- event_by_slug: ADD organizer_slug (business slug when the owner owns a business).
-- MUST drop first — RETURNS TABLE column list is changing. Body preserves 0063
-- (drafts 404, cancelled resolve, lat/lng, visible tiers) + one new column.
drop function if exists public.event_by_slug(text);
create function public.event_by_slug(in_slug text)
returns table (
  slug text, title_es text, title_en text, venue_es text, venue_en text,
  cat text, city text, starts_at timestamptz, ends_at timestamptz,
  time_label_es text, time_label_en text, price_label text,
  desc_es text, desc_en text, tile_a text, tile_b text, cover_url text,
  status text, going_count int, lat double precision, lng double precision,
  organizer text, organizer_slug text, tiers jsonb
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
         (select b.slug from public.businesses b where b.owner_id = e.owner_id order by b.created_at limit 1),
         coalesce((
           select jsonb_agg(jsonb_build_object(
             'id', t.id, 'name_es', t.name_es, 'name_en', t.name_en,
             'price', t.price, 'capacity', t.capacity, 'sold', t.sold,
             'remaining', case when t.capacity is null then null else greatest(0, t.capacity - t.sold) end,
             'sales_start', t.sales_start, 'sales_end', t.sales_end
           ) order by t.sort, t.created_at)
           from public.event_tiers t where t.event_id = e.id and t.visible), '[]'::jsonb)
  from public.events e
  where e.slug = in_slug and e.status <> 'draft'
  limit 1;
$$;
grant execute on function public.event_by_slug(text) to anon, authenticated;

-- events_by_owner: the organizer's OTHER published+upcoming events (same 15 cols as
-- events_near → client reuses mapEventRow). Owner resolved from the anchor slug
-- server-side; no auth UID leaves the DB. Guards against null owner (ON DELETE SET NULL).
create or replace function public.events_by_owner(in_slug text, max_results int default 12)
returns table (
  slug text, title_es text, title_en text, venue_es text, venue_en text,
  cat text, starts_at timestamptz, time_label_es text, time_label_en text,
  price_label text, going_count int, desc_es text, desc_en text,
  tile_a text, tile_b text
) language sql stable security definer set search_path = public as $$
  with anchor as (
    select owner_id from public.events
     where slug = in_slug and status <> 'draft' limit 1
  )
  select e.slug, e.title_es, e.title_en, e.venue_es, e.venue_en,
         e.cat, e.starts_at, e.time_label_es, e.time_label_en,
         e.price_label, e.going_count, e.desc_es, e.desc_en, e.tile_a, e.tile_b
  from public.events e cross join anchor a
  where e.owner_id = a.owner_id
    and e.owner_id is not null
    and e.slug <> in_slug
    and e.status = 'published'
    and coalesce(e.ends_at, e.starts_at + interval '3 hours') >= now()
  order by e.starts_at asc
  limit greatest(1, least(max_results, 50));
$$;
grant execute on function public.events_by_owner(text, int) to anon, authenticated;

-- scale index: owner's upcoming events lookup at 1M+ rows.
create index if not exists events_owner_upcoming_idx
  on public.events (owner_id, starts_at) where status = 'published';

notify pgrst, 'reload schema';
