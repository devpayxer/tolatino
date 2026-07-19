-- 0103 · Recomendaciones: (1) my_endorsements() para el botón 👍 en la TARJETA del
-- listado (que cada tarjeta sepa si YO ya recomendé), y (2) cada recomendación
-- publica un post 'rec' en Comunidad ("[vecino] recomienda [negocio]") — social,
-- corre la voz. Al quitar la recomendación, el post se borra solo (cascade).
-- Idempotente. Vanilla Postgres — portable a self-hosted.

-- Link a Comunidad 'rec' post to the endorsement that created it → un-recommend
-- removes the post automatically.
alter table public.posts
  add column if not exists endorsement_id uuid references public.business_endorsements(id) on delete cascade;

-- Slugs the signed-in user has recommended (feeds the card 👍 state, one round-trip).
create or replace function public.my_endorsements()
returns table (slug text)
language sql stable security definer set search_path = public as $fn$
  select b.slug
  from public.business_endorsements e
  join public.businesses b on b.id = e.business_id
  where e.user_id = auth.uid();
$fn$;
grant execute on function public.my_endorsements() to authenticated;

-- toggle v3: same rules (one per person, not your own business, notify owner) PLUS
-- publish/remove the Comunidad 'rec' post in the business's neighborhood.
create or replace function public.toggle_endorsement(in_slug text, in_note text default null)
returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare
  v_biz uuid; v_owner uuid; v_exists uuid; v_endo uuid; v_count int;
  v_name text; v_ini text; v_color text; v_note text;
  v_bname text; v_rating numeric; v_city text; v_loc geography; v_lat double precision; v_lng double precision;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  select id, owner_id, name, rating, city, location
    into v_biz, v_owner, v_bname, v_rating, v_city, v_loc
    from public.businesses where slug = in_slug limit 1;
  if v_biz is null then raise exception 'business not found'; end if;
  if v_owner = auth.uid() then raise exception 'cannot endorse own business'; end if;

  select id into v_exists from public.business_endorsements where business_id = v_biz and user_id = auth.uid();
  if v_exists is not null then
    delete from public.business_endorsements where id = v_exists;  -- cascade removes the post
    select endorse_count into v_count from public.businesses where id = v_biz;
    return jsonb_build_object('endorsed', false, 'count', coalesce(v_count,0));
  end if;

  v_note := nullif(btrim(left(coalesce(in_note,''), 140)), '');
  insert into public.business_endorsements (business_id, user_id, note)
  values (v_biz, auth.uid(), v_note)
  returning id into v_endo;

  select coalesce(nullif(btrim(display_name), ''), 'Un vecino'),
         coalesce(nullif(initials,''), upper(left(coalesce(display_name,'V'),2))),
         coalesce(avatar_color, '#7B61FF')
    into v_name, v_ini, v_color
    from public.profiles where id = auth.uid();
  v_name := coalesce(v_name, 'Un vecino'); v_ini := coalesce(v_ini, 'V'); v_color := coalesce(v_color, '#7B61FF');
  if v_loc is not null then v_lat := st_y(v_loc::geometry); v_lng := st_x(v_loc::geometry); end if;

  -- location is a GENERATED column (derived from lat/lng) — never insert it directly.
  insert into public.posts
    (type, author_id, author_name, author_initials, author_color, body_es, body_en,
     business_name, business_rating, city, lat, lng, recommends, endorsement_id)
  values ('rec', auth.uid(), v_name, v_ini, v_color,
     coalesce(v_note, 'Recomiendo ' || v_bname || ' 👍'),
     coalesce(v_note, 'I recommend ' || v_bname || ' 👍'),
     v_bname, v_rating, v_city, v_lat, v_lng, 0, v_endo);

  perform public.notify_user(v_owner, 'endorse_new',
    jsonb_build_object('name', v_name, 'slug', in_slug), '/negocios/?b=' || in_slug);
  select endorse_count into v_count from public.businesses where id = v_biz;
  return jsonb_build_object('endorsed', true, 'count', coalesce(v_count,0));
end $fn$;
grant execute on function public.toggle_endorsement(text, text) to authenticated;

notify pgrst, 'reload schema';
