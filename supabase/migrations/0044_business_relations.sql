-- To'Latino — "Listados relacionados": link two listings, whether the SAME owner
-- or across owners (a salon ↔ its independent barbers, a nightclub ↔ its DJ, an
-- owner's own sister listings, etc.). Same-owner links are auto-approved; a
-- cross-owner link stays `pending` until the OTHER owner approves it, then it goes
-- live on both listings' "Relacionados". Powers the dashboard module + the public
-- listing tab. Idempotent. Apply: paste into the Supabase SQL Editor + Run.

create table if not exists public.business_relations (
  id           uuid primary key default gen_random_uuid(),
  source_id    uuid not null references public.businesses(id) on delete cascade,  -- who added the link
  target_id    uuid not null references public.businesses(id) on delete cascade,  -- who is being linked
  requested_by uuid not null default auth.uid(),
  role_es      text,   -- optional label describing the target ("Barbero", "DJ", "Sucursal")
  role_en      text,
  status       text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at   timestamptz not null default now(),
  decided_at   timestamptz,
  constraint business_relations_not_self check (source_id <> target_id),
  unique (source_id, target_id)
);
create index if not exists business_relations_source_idx on public.business_relations (source_id, status);
create index if not exists business_relations_target_idx on public.business_relations (target_id, status);

alter table public.business_relations enable row level security;

-- Either side's owner can read + unlink. Inserts and approve/reject go through the
-- security-definer RPCs below (which enforce the same-owner / approval rules) — no
-- direct insert/update policy, so nobody can self-approve a cross-owner link.
drop policy if exists "read own relations"   on public.business_relations;
drop policy if exists "delete own relations" on public.business_relations;
create policy "read own relations" on public.business_relations for select using (
  exists (select 1 from public.businesses b where b.id = source_id and b.owner_id = auth.uid())
  or exists (select 1 from public.businesses b where b.id = target_id and b.owner_id = auth.uid())
);
create policy "delete own relations" on public.business_relations for delete using (
  exists (select 1 from public.businesses b where b.id = source_id and b.owner_id = auth.uid())
  or exists (select 1 from public.businesses b where b.id = target_id and b.owner_id = auth.uid())
);

-- ── request a link ──────────────────────────────────────────────────────────
-- Caller must own the SOURCE listing. If they also own the TARGET → auto-approved;
-- otherwise it's stored `pending` for the target owner to decide. Re-requesting a
-- rejected/pending link updates it; an already-approved link is never downgraded.
create or replace function public.request_business_relation(
  in_source uuid, in_target uuid, in_role_es text default null, in_role_en text default null
) returns table (rel_id uuid, rel_status text)
language plpgsql security definer set search_path = public as $$
declare
  v_uid       uuid := auth.uid();
  v_src_owner uuid;
  v_tgt_owner uuid;
  v_status    text;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if in_source = in_target then raise exception 'cannot relate a listing to itself'; end if;
  select owner_id into v_src_owner from public.businesses where id = in_source;
  select owner_id into v_tgt_owner from public.businesses where id = in_target;
  if v_src_owner is null or v_tgt_owner is null then raise exception 'listing not found'; end if;
  if v_src_owner <> v_uid then raise exception 'you do not own the source listing'; end if;
  v_status := case when v_tgt_owner = v_uid then 'approved' else 'pending' end;

  insert into public.business_relations as r (source_id, target_id, requested_by, role_es, role_en, status, decided_at)
  values (in_source, in_target, v_uid, nullif(btrim(in_role_es), ''), nullif(btrim(in_role_en), ''),
          v_status, case when v_status = 'approved' then now() else null end)
  on conflict (source_id, target_id) do update
    set role_es    = excluded.role_es,
        role_en    = excluded.role_en,
        status     = case when r.status = 'approved' then 'approved' else excluded.status end,
        decided_at = case when r.status = 'approved' then r.decided_at
                          when excluded.status = 'approved' then now() else null end
  returning r.id, r.status into rel_id, rel_status;
  return next;
end $$;
grant execute on function public.request_business_relation(uuid, uuid, text, text) to authenticated;

-- ── approve / reject an incoming link ───────────────────────────────────────
-- Only the TARGET listing's owner can decide.
create or replace function public.respond_business_relation(in_id uuid, in_approve boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_tgt_owner uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select b.owner_id into v_tgt_owner
    from public.business_relations r join public.businesses b on b.id = r.target_id
   where r.id = in_id;
  if v_tgt_owner is null then raise exception 'relation not found'; end if;
  if v_tgt_owner <> v_uid then raise exception 'only the linked listing owner can decide'; end if;
  update public.business_relations
     set status = case when in_approve then 'approved' else 'rejected' end, decided_at = now()
   where id = in_id;
end $$;
grant execute on function public.respond_business_relation(uuid, boolean) to authenticated;

-- ── search listings to link ─────────────────────────────────────────────────
-- Name search over all listings (own first), excluding the source and anything
-- already linked (unless previously rejected). `same_owner` drives the UI's
-- "instant vs needs approval" hint without exposing owner ids.
create or replace function public.search_businesses_link(in_q text, in_source uuid, in_limit int default 8)
returns table (id uuid, slug text, name text, category_id text, city text,
               tile_a text, tile_b text, tier text, same_owner boolean)
language sql stable security definer set search_path = public as $$
  select b.id, b.slug, b.name, b.category_id, b.city, b.tile_a, b.tile_b, b.tier,
         (b.owner_id = auth.uid()) as same_owner
  from public.businesses b
  where b.id <> in_source
    and b.tile_a is not null
    and (in_q is null or btrim(in_q) = '' or b.name ilike '%' || in_q || '%')
    and not exists (
      select 1 from public.business_relations r
      where r.source_id = in_source and r.target_id = b.id and r.status <> 'rejected'
    )
  order by (b.owner_id = auth.uid()) desc, b.rating desc, b.name
  limit greatest(1, least(in_limit, 20));
$$;
grant execute on function public.search_businesses_link(text, uuid, int) to authenticated;

-- ── dashboard: every link touching a listing (both directions) ──────────────
-- Caller must own `in_business`. Returns the OTHER listing's card fields plus the
-- direction ('out' = this listing added it, 'in' = someone linked toward it) and
-- status, so the module can show approved links + pending outgoing + incoming
-- requests to approve.
create or replace function public.business_relations_admin(in_business uuid)
returns table (relation_id uuid, direction text, other_id uuid, other_slug text, other_name text,
               other_category text, other_city text, other_tile_a text, other_tile_b text, other_tier text,
               role_es text, role_en text, status text, same_owner boolean, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_owner uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select owner_id into v_owner from public.businesses where id = in_business;
  if v_owner is null or v_owner <> v_uid then raise exception 'not your listing'; end if;
  return query
    select r.id, 'out'::text, t.id, t.slug, t.name, t.category_id, t.city, t.tile_a, t.tile_b, t.tier,
           r.role_es, r.role_en, r.status, (t.owner_id = v_uid), r.created_at
      from public.business_relations r join public.businesses t on t.id = r.target_id
     where r.source_id = in_business
    union all
    select r.id, 'in'::text, s.id, s.slug, s.name, s.category_id, s.city, s.tile_a, s.tile_b, s.tier,
           r.role_es, r.role_en, r.status, (s.owner_id = v_uid), r.created_at
      from public.business_relations r join public.businesses s on s.id = r.source_id
     where r.target_id = in_business
     order by 15 desc;
end $$;
grant execute on function public.business_relations_admin(uuid) to authenticated;

-- ── public listing: approved links (either direction) for a slug ────────────
create or replace function public.business_relations_by_slug(in_slug text)
returns table (slug text, name text, category_id text, city text,
               tile_a text, tile_b text, tier text, rating numeric, reviews_count int,
               role_es text, role_en text, other_is_target boolean)
language sql stable security definer set search_path = public as $$
  with me as (select id from public.businesses where slug = in_slug)
  select o.slug, o.name, o.category_id, o.city, o.tile_a, o.tile_b, o.tier, o.rating, o.reviews_count,
         r.role_es, r.role_en, (o.id = r.target_id) as other_is_target
  from public.business_relations r
  cross join me
  join public.businesses o
    on o.id = case when r.source_id = me.id then r.target_id else r.source_id end
  where r.status = 'approved'
    and (r.source_id = me.id or r.target_id = me.id)
  order by o.rating desc
  limit 20;
$$;
grant execute on function public.business_relations_by_slug(text) to anon, authenticated;

notify pgrst, 'reload schema';
