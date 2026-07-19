-- 0102 · "Recomendado por vecinos" REAL (estilo Nextdoor). Hasta ahora
-- businesses.endorse_count era un número estático sin nada detrás y no había forma
-- de recomendar. Esto lo hace de verdad: un vecino toca "Recomendar" (una por
-- persona, con una razón corta opcional), el contador y las caritas pasan a ser
-- reales, y el dueño recibe aviso. Recomendar ≠ reseña: es un toque de confianza.
--
-- endorse_count se mantiene como el número MOSTRADO: el seed actual queda como base
-- ("recomendaciones previas al lanzamiento") y el trigger le suma/resta las reales.
-- Idempotente. Vanilla Postgres — portable a self-hosted.

create table if not exists public.business_endorsements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  note text,
  created_at timestamptz not null default now(),
  unique (business_id, user_id)          -- one per person per business
);
create index if not exists business_endorsements_biz_idx on public.business_endorsements (business_id, created_at desc);
create index if not exists business_endorsements_user_idx on public.business_endorsements (user_id);

-- Keep businesses.endorse_count in sync (seed value stays as the base floor).
create or replace function public.tg_endorse_count() returns trigger
language plpgsql security definer set search_path = public as $fn$
begin
  if tg_op = 'INSERT' then
    update public.businesses set endorse_count = coalesce(endorse_count,0) + 1 where id = new.business_id;
  elsif tg_op = 'DELETE' then
    update public.businesses set endorse_count = greatest(coalesce(endorse_count,0) - 1, 0) where id = old.business_id;
  end if;
  return null;
end $fn$;
drop trigger if exists trg_endorse_count on public.business_endorsements;
create trigger trg_endorse_count after insert or delete on public.business_endorsements
  for each row execute function public.tg_endorse_count();

-- RLS: a signed-in user manages ONLY their own endorsement row. Counts + avatars
-- are exposed through a privacy-safe SECURITY DEFINER RPC (initials only), never
-- by reading the table directly.
alter table public.business_endorsements enable row level security;
drop policy if exists "read own endorsement" on public.business_endorsements;
create policy "read own endorsement" on public.business_endorsements for select using (user_id = auth.uid());
drop policy if exists "insert own endorsement" on public.business_endorsements;
create policy "insert own endorsement" on public.business_endorsements for insert with check (user_id = auth.uid());
drop policy if exists "delete own endorsement" on public.business_endorsements;
create policy "delete own endorsement" on public.business_endorsements for delete using (user_id = auth.uid());

-- Toggle: recommend / un-recommend. One per person; can't recommend your OWN
-- business. On a new recommendation, save the (clipped) reason and notify the owner.
create or replace function public.toggle_endorsement(in_slug text, in_note text default null)
returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare v_biz uuid; v_owner uuid; v_exists uuid; v_name text; v_count int;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  select id, owner_id into v_biz, v_owner from public.businesses where slug = in_slug limit 1;
  if v_biz is null then raise exception 'business not found'; end if;
  if v_owner = auth.uid() then raise exception 'cannot endorse own business'; end if;

  select id into v_exists from public.business_endorsements where business_id = v_biz and user_id = auth.uid();
  if v_exists is not null then
    delete from public.business_endorsements where id = v_exists;
    select endorse_count into v_count from public.businesses where id = v_biz;
    return jsonb_build_object('endorsed', false, 'count', coalesce(v_count,0));
  end if;

  insert into public.business_endorsements (business_id, user_id, note)
  values (v_biz, auth.uid(), nullif(btrim(left(coalesce(in_note,''), 140)), ''));
  select coalesce(nullif(btrim(display_name), ''), 'Un vecino') into v_name from public.profiles where id = auth.uid();
  perform public.notify_user(v_owner, 'endorse_new',
    jsonb_build_object('name', coalesce(v_name,'Un vecino'), 'slug', in_slug), '/negocios/?b=' || in_slug);
  select endorse_count into v_count from public.businesses where id = v_biz;
  return jsonb_build_object('endorsed', true, 'count', coalesce(v_count,0));
end $fn$;
grant execute on function public.toggle_endorsement(text, text) to authenticated;

-- Privacy-safe read: total count, whether the caller endorsed, up to 4 recent
-- endorser avatars (initials + color only), and the latest reason as the featured
-- quote. anon sees count + avatars (mine=false).
create or replace function public.endorsements_by_slug(in_slug text)
returns jsonb
language sql stable security definer set search_path = public as $fn$
  with b as (select id, endorse_count from public.businesses where slug = in_slug limit 1)
  select jsonb_build_object(
    'count', (select coalesce(endorse_count,0) from b),
    'mine', exists (select 1 from public.business_endorsements e, b where e.business_id = b.id and e.user_id = auth.uid()),
    'avatars', coalesce((
      select jsonb_agg(jsonb_build_object('ini', coalesce(nullif(p.initials,''), left(upper(coalesce(p.display_name,'V')),2)), 'color', coalesce(p.avatar_color, '#7B61FF')) order by e.created_at desc)
      from (select e.* from public.business_endorsements e, b where e.business_id = b.id order by e.created_at desc limit 4) e
      join public.profiles p on p.id = e.user_id), '[]'::jsonb),
    'note', (select e.note from public.business_endorsements e, b where e.business_id = b.id and e.note is not null order by e.created_at desc limit 1)
  );
$fn$;
grant execute on function public.endorsements_by_slug(text) to anon, authenticated;

notify pgrst, 'reload schema';
