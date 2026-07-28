-- 0126 · Super Admin Fase 3 (parte 1) — Sistema · Catálogo · Contenido
--
-- La consola v2 del handoff añade 6 secciones nuevas. Esta migración cubre las
-- tres que se apoyan en tablas que YA existen (platform_flags/config, categories,
-- amenities, cities, *_suggestions) más la capacidad de "Destacar en
-- descubrimiento" que Contenido necesita (columna `featured`). Zonas, Analíticas,
-- Notificaciones, Stream y Módulos van en 0127.
--
-- Todo pasa por _require_admin() (rol validado en el servidor) y _admin_log()
-- (bitácora inmutable). Nada aquí confía en el cliente.

-- ════════════════════════════════════════════════════════════════════════════
-- A · COLUMNAS: destacar (featured) en descubrimiento + fijar (pinned) posts
-- ════════════════════════════════════════════════════════════════════════════
-- "Destacar" empuja el contenido arriba en su superficie de cliente. Es un flag
-- reversible del admin, distinto de la relevancia orgánica. Se añade a cada
-- superficie destacable; el descubrimiento de cada vertical lo ordenará primero
-- (el wiring de lectura se hace donde cada lista consulta — fuera de esta
-- migración; aquí solo existe la columna + índice para que sea barato ordenar).
do $$
declare t text;
begin
  foreach t in array array['businesses','posts','events','properties','vehicles','business_updates'] loop
    execute format('alter table public.%I add column if not exists featured boolean not null default false', t);
    execute format('alter table public.%I add column if not exists featured_at timestamptz', t);
    execute format('alter table public.%I add column if not exists featured_by uuid references auth.users(id) on delete set null', t);
    execute format('create index if not exists %I on public.%I (featured) where featured', t||'_featured_idx', t);
  end loop;
end $$;

-- Fijar un post en su zona (Stream). Reutiliza la ciudad/hood que el post ya trae.
alter table public.posts add column if not exists pinned boolean not null default false;
alter table public.posts add column if not exists pinned_at timestamptz;
create index if not exists posts_pinned_idx on public.posts (pinned) where pinned;

-- amenities no tenía orden; Catálogo lo reordena con flechas.
alter table public.amenities add column if not exists sort integer not null default 0;

-- ════════════════════════════════════════════════════════════════════════════
-- B · SISTEMA — kill-switches, config, equipo (todo sobre tablas existentes)
-- ════════════════════════════════════════════════════════════════════════════
-- Los flags (vertical.*, maintenance, banner.global, checkout.online) ya existen
-- y el cliente los lee (público). Aquí el admin los ve y los cambia con efecto
-- real e inmediato en la app pública.
create or replace function public.admin_flags_list()
returns table (key text, enabled boolean, label_es text, label_en text, payload jsonb, updated_at timestamptz)
language plpgsql stable security definer set search_path = public as $fn$
begin
  perform public._require_admin();
  return query select f.key, f.enabled, f.label_es, f.label_en, f.payload, f.updated_at
  from public.platform_flags f order by f.key;
end $fn$;
grant execute on function public.admin_flags_list() to authenticated;

-- Cambiar un flag. maintenance/banner/kill-switch son potentes → solo superadmin.
create or replace function public.admin_flag_set(in_key text, in_enabled boolean, in_reason text)
returns void language plpgsql security definer set search_path = public as $fn$
declare v_before boolean;
begin
  perform public._require_admin(array['superadmin']);
  if coalesce(trim(in_reason),'') = '' then raise exception 'la razón es obligatoria'; end if;
  select enabled into v_before from public.platform_flags where key = in_key;
  if v_before is null then raise exception 'flag no encontrado: %', in_key; end if;
  update public.platform_flags set enabled = in_enabled, updated_by = auth.uid(), updated_at = now() where key = in_key;
  perform public._admin_log('flag.set', 'flag', in_key,
    jsonb_build_object('enabled', v_before), jsonb_build_object('enabled', in_enabled), in_reason);
end $fn$;
grant execute on function public.admin_flag_set(text, boolean, text) to authenticated;

create or replace function public.admin_config_list()
returns table (key text, value jsonb, label_es text, updated_at timestamptz)
language plpgsql stable security definer set search_path = public as $fn$
begin
  perform public._require_admin(array['finanzas']);
  return query select c.key, c.value, c.label_es, c.updated_at from public.platform_config c order by c.key;
end $fn$;
grant execute on function public.admin_config_list() to authenticated;

create or replace function public.admin_config_set(in_key text, in_value jsonb, in_reason text)
returns void language plpgsql security definer set search_path = public as $fn$
declare v_before jsonb;
begin
  perform public._require_admin(array['finanzas']);
  if coalesce(trim(in_reason),'') = '' then raise exception 'la razón es obligatoria'; end if;
  select value into v_before from public.platform_config where key = in_key;
  if v_before is null then raise exception 'config no encontrada: %', in_key; end if;
  update public.platform_config set value = in_value, updated_by = auth.uid(), updated_at = now() where key = in_key;
  perform public._admin_log('config.set', 'config', in_key,
    jsonb_build_object('value', v_before), jsonb_build_object('value', in_value), in_reason);
end $fn$;
grant execute on function public.admin_config_set(text, jsonb, text) to authenticated;

-- Equipo admin. El dueño (superadmin más antiguo) no se puede tocar.
create or replace function public.admin_team_list()
returns table (user_id uuid, email text, role text, note text, is_owner boolean, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $fn$
declare v_owner uuid;
begin
  perform public._require_admin();
  select a.user_id into v_owner from public.admins a where a.role = 'superadmin' order by a.created_at asc limit 1;
  return query
  select a.user_id, u.email::text, a.role, a.note, (a.user_id = v_owner), a.created_at
  from public.admins a join auth.users u on u.id = a.user_id
  order by (a.role = 'superadmin') desc, a.created_at asc;
end $fn$;
grant execute on function public.admin_team_list() to authenticated;

-- Invitar = ascender a admin una cuenta que YA existe (no creamos usuarios desde
-- aquí). Si el correo no está registrado, se dice claro.
create or replace function public.admin_team_invite(in_email text, in_role text, in_reason text)
returns void language plpgsql security definer set search_path = public as $fn$
declare v_uid uuid;
begin
  perform public._require_admin(array['superadmin']);
  if in_role not in ('superadmin','finanzas','moderador','soporte') then raise exception 'rol inválido'; end if;
  if coalesce(trim(in_reason),'') = '' then raise exception 'la razón es obligatoria'; end if;
  select id into v_uid from auth.users where lower(email) = lower(trim(in_email));
  if v_uid is null then raise exception 'esa persona aún no tiene cuenta en To''Latino — que se registre primero'; end if;
  insert into public.admins (user_id, role, note, created_by)
  values (v_uid, in_role, 'invitado por admin', auth.uid())
  on conflict (user_id) do update set role = excluded.role;
  perform public._admin_log('team.invite', 'admin', v_uid::text, null,
    jsonb_build_object('email', in_email, 'role', in_role), in_reason);
end $fn$;
grant execute on function public.admin_team_invite(text, text, text) to authenticated;

create or replace function public.admin_team_set_role(in_user uuid, in_role text, in_reason text)
returns void language plpgsql security definer set search_path = public as $fn$
declare v_before text; v_owner uuid;
begin
  perform public._require_admin(array['superadmin']);
  if in_role not in ('superadmin','finanzas','moderador','soporte') then raise exception 'rol inválido'; end if;
  if coalesce(trim(in_reason),'') = '' then raise exception 'la razón es obligatoria'; end if;
  select a.user_id into v_owner from public.admins a where a.role = 'superadmin' order by a.created_at asc limit 1;
  if in_user = v_owner then raise exception 'no se puede cambiar el rol del dueño'; end if;
  select role into v_before from public.admins where user_id = in_user;
  if v_before is null then raise exception 'no es admin'; end if;
  update public.admins set role = in_role where user_id = in_user;
  perform public._admin_log('team.role', 'admin', in_user::text,
    jsonb_build_object('role', v_before), jsonb_build_object('role', in_role), in_reason);
end $fn$;
grant execute on function public.admin_team_set_role(uuid, text, text) to authenticated;

create or replace function public.admin_team_remove(in_user uuid, in_reason text)
returns void language plpgsql security definer set search_path = public as $fn$
declare v_owner uuid; v_role text;
begin
  perform public._require_admin(array['superadmin']);
  if coalesce(trim(in_reason),'') = '' then raise exception 'la razón es obligatoria'; end if;
  select a.user_id into v_owner from public.admins a where a.role = 'superadmin' order by a.created_at asc limit 1;
  if in_user = v_owner then raise exception 'no se puede quitar al dueño'; end if;
  if in_user = auth.uid() then raise exception 'no puedes quitarte a ti mismo'; end if;
  select role into v_role from public.admins where user_id = in_user;
  if v_role is null then raise exception 'no es admin'; end if;
  delete from public.admins where user_id = in_user;
  perform public._admin_log('team.remove', 'admin', in_user::text,
    jsonb_build_object('role', v_role), null, in_reason);
end $fn$;
grant execute on function public.admin_team_remove(uuid, text) to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- C · CATÁLOGO — categorías, amenidades, ciudades, sugerencias
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.admin_categories_list()
returns table (id text, name_es text, name_en text, sort integer, businesses bigint)
language plpgsql stable security definer set search_path = public as $fn$
begin
  perform public._require_admin(array['moderador']);
  return query
  select c.id, c.name_es, c.name_en, c.sort, (select count(*) from public.businesses b where b.category_id = c.id)
  from public.categories c order by c.sort, c.name_es;
end $fn$;
grant execute on function public.admin_categories_list() to authenticated;

-- Reordenar intercambiando `sort` con el vecino en la dirección pedida.
create or replace function public.admin_category_reorder(in_id text, in_dir text)
returns void language plpgsql security definer set search_path = public as $fn$
declare v_sort int; v_other_id text; v_other_sort int;
begin
  perform public._require_admin(array['moderador']);
  select sort into v_sort from public.categories where id = in_id;
  if v_sort is null then raise exception 'categoría no encontrada'; end if;
  if in_dir = 'up' then
    select id, sort into v_other_id, v_other_sort from public.categories where sort < v_sort order by sort desc limit 1;
  else
    select id, sort into v_other_id, v_other_sort from public.categories where sort > v_sort order by sort asc limit 1;
  end if;
  if v_other_id is null then return; end if; -- ya está en el extremo
  update public.categories set sort = v_other_sort where id = in_id;
  update public.categories set sort = v_sort where id = v_other_id;
  perform public._admin_log('catalog.reorder', 'category', in_id, null,
    jsonb_build_object('dir', in_dir), null);
end $fn$;
grant execute on function public.admin_category_reorder(text, text) to authenticated;

create or replace function public.admin_category_rename(in_id text, in_es text, in_en text, in_reason text)
returns void language plpgsql security definer set search_path = public as $fn$
declare v_before jsonb;
begin
  perform public._require_admin(array['moderador']);
  if coalesce(trim(in_es),'') = '' or coalesce(trim(in_en),'') = '' then raise exception 'ambos idiomas son obligatorios'; end if;
  select jsonb_build_object('es', name_es, 'en', name_en) into v_before from public.categories where id = in_id;
  if v_before is null then raise exception 'categoría no encontrada'; end if;
  update public.categories set name_es = in_es, name_en = in_en where id = in_id;
  perform public._admin_log('catalog.rename', 'category', in_id, v_before,
    jsonb_build_object('es', in_es, 'en', in_en), in_reason);
end $fn$;
grant execute on function public.admin_category_rename(text, text, text, text) to authenticated;

create or replace function public.admin_amenities_list()
returns table (id uuid, name_es text, name_en text, sort integer)
language plpgsql stable security definer set search_path = public as $fn$
begin
  perform public._require_admin(array['moderador']);
  return query select a.id, a.name_es, a.name_en, a.sort from public.amenities a order by a.sort, a.name_es;
end $fn$;
grant execute on function public.admin_amenities_list() to authenticated;

create or replace function public.admin_amenity_rename(in_id uuid, in_es text, in_en text, in_reason text)
returns void language plpgsql security definer set search_path = public as $fn$
declare v_before jsonb;
begin
  perform public._require_admin(array['moderador']);
  if coalesce(trim(in_es),'') = '' or coalesce(trim(in_en),'') = '' then raise exception 'ambos idiomas son obligatorios'; end if;
  select jsonb_build_object('es', name_es, 'en', name_en) into v_before from public.amenities where id = in_id;
  if v_before is null then raise exception 'amenidad no encontrada'; end if;
  update public.amenities set name_es = in_es, name_en = in_en where id = in_id;
  perform public._admin_log('catalog.rename', 'amenity', in_id::text, v_before,
    jsonb_build_object('es', in_es, 'en', in_en), in_reason);
end $fn$;
grant execute on function public.admin_amenity_rename(uuid, text, text, text) to authenticated;

-- Ciudades: 6,978 filas → lista buscada y paginada en servidor, con uso real.
create or replace function public.admin_cities_list(in_q text default null, max_results integer default 40)
returns table (id bigint, name text, state text, label text, population integer, businesses bigint, users bigint, total_count bigint)
language plpgsql stable security definer set search_path = public as $fn$
begin
  perform public._require_admin(array['moderador','finanzas']);
  return query
  select c.id, c.name, c.state, c.label, c.population,
         (select count(*) from public.businesses b where b.city = c.label),
         (select count(*) from public.profiles p where p.city_label = c.label),
         count(*) over ()
  from public.cities c
  where in_q is null or in_q = '' or c.label ilike '%'||in_q||'%' or c.name ilike '%'||in_q||'%'
  order by (in_q is null or in_q = '') desc, c.population desc nulls last
  limit greatest(1, least(max_results, 100));
end $fn$;
grant execute on function public.admin_cities_list(text, integer) to authenticated;

-- Sugerencias de negocios (subcategorías + features) — una cola unificada.
create or replace function public.admin_suggestions_list(in_status text default 'pending')
returns table (kind text, id uuid, label_es text, label_en text, category_id text, business_name text, status text, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $fn$
begin
  perform public._require_admin(array['moderador']);
  return query
  select 'subcategoria'::text, s.id, s.label_es, s.label_en, s.category_id,
         (select b.name from public.businesses b where b.id = s.business_id), s.status, s.created_at
  from public.subcategory_suggestions s
  where in_status is null or in_status = 'all' or s.status = in_status
  union all
  select 'amenidad'::text, f.id, f.label_es, f.label_en, f.category_id,
         (select b.name from public.businesses b where b.id = f.business_id), f.status, f.created_at
  from public.feature_suggestions f
  where in_status is null or in_status = 'all' or f.status = in_status
  order by created_at desc;
end $fn$;
grant execute on function public.admin_suggestions_list(text) to authenticated;

create or replace function public.admin_suggestion_resolve(in_kind text, in_id uuid, in_approve boolean, in_reason text)
returns void language plpgsql security definer set search_path = public as $fn$
declare v_new text;
begin
  perform public._require_admin(array['moderador']);
  v_new := case when in_approve then 'approved' else 'rejected' end;
  if in_kind = 'subcategoria' then
    update public.subcategory_suggestions set status = v_new, reviewed_at = now() where id = in_id;
  elsif in_kind = 'amenidad' then
    update public.feature_suggestions set status = v_new, reviewed_at = now() where id = in_id;
  else raise exception 'tipo inválido';
  end if;
  perform public._admin_log('catalog.suggestion', in_kind, in_id::text, null,
    jsonb_build_object('status', v_new), in_reason);
end $fn$;
grant execute on function public.admin_suggestion_resolve(text, uuid, boolean, text) to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- D · CONTENIDO — las 7 verticales de contenido en una sola lista
-- ════════════════════════════════════════════════════════════════════════════
-- Une comunidad · eventos · propiedades · autos · novedades · reseñas. Cada fila
-- lleva su estado real (según su máquina de estado o la columna hidden) y si está
-- destacada. Buscar por texto. Paginado en servidor.
create or replace function public.admin_content_list(
  in_type text default 'all', in_q text default null,
  max_results integer default 30, in_offset integer default 0
) returns table (
  ctype text, id uuid, title text, author text, meta text, cat text, loc text,
  status text, featured boolean, created_at timestamptz, total_count bigint
) language plpgsql stable security definer set search_path = public as $fn$
begin
  perform public._require_admin(array['moderador']);
  return query
  with all_content as (
    select 'post'::text ctype, p.id, left(coalesce(p.body_es,''),80) title, p.author_name author,
           p.type meta, ''::text cat, coalesce(p.hood,p.city,'') loc,
           case when p.hidden then 'oculto' else 'activo' end status, p.featured, p.created_at
      from public.posts p
    union all
    select 'evento', e.id, e.title_es, ''::text, ''::text, ''::text, coalesce(e.city,''),
           e.status, e.featured, e.created_at from public.events e
    union all
    select 'propiedad', pr.id, pr.title, ''::text, ''::text, ''::text, coalesce(pr.city,''),
           pr.status, pr.featured, pr.created_at from public.properties pr
    union all
    select 'auto', v.id, (v.year||' '||v.make||' '||v.model), ''::text, ''::text, ''::text, coalesce(v.city,''),
           v.status, v.featured, v.created_at from public.vehicles v
    union all
    select 'novedad', up.id, left(coalesce(up.body_es,''),80), ''::text, ''::text, ''::text, ''::text,
           up.status, up.featured, up.created_at from public.business_updates up
    union all
    select 'reseña', rv.id, left(coalesce(rv.body_es,''),80), rv.author_name, (rv.rating||'★'), ''::text, ''::text,
           case when rv.hidden then 'oculto' else 'activo' end, false, rv.created_at from public.reviews rv
  )
  select x.ctype, x.id, x.title, x.author, x.meta, x.cat, x.loc, x.status, x.featured, x.created_at, count(*) over ()
  from all_content x
  where (in_type is null or in_type = 'all' or x.ctype = in_type)
    and (in_q is null or in_q = '' or x.title ilike '%'||in_q||'%' or x.author ilike '%'||in_q||'%' or x.loc ilike '%'||in_q||'%')
  order by x.created_at desc
  limit greatest(1, least(max_results, 100)) offset greatest(0, in_offset);
end $fn$;
grant execute on function public.admin_content_list(text, text, integer, integer) to authenticated;

-- Destacar / quitar destacado en descubrimiento (reversible). Reseñas no se
-- destacan (no tienen superficie de descubrimiento propia).
create or replace function public.admin_content_feature(in_type text, in_id uuid, in_on boolean, in_reason text)
returns void language plpgsql security definer set search_path = public as $fn$
declare v_tbl text;
begin
  perform public._require_admin(array['moderador']);
  v_tbl := case in_type when 'post' then 'posts' when 'evento' then 'events'
    when 'propiedad' then 'properties' when 'auto' then 'vehicles'
    when 'novedad' then 'business_updates' else null end;
  if v_tbl is null then raise exception 'ese tipo no se puede destacar'; end if;
  execute format('update public.%I set featured=$1, featured_at=$2, featured_by=$3 where id=$4', v_tbl)
    using in_on, case when in_on then now() end, auth.uid(), in_id;
  perform public._admin_log('content.feature', in_type, in_id::text, null,
    jsonb_build_object('featured', in_on), in_reason);
end $fn$;
grant execute on function public.admin_content_feature(text, uuid, boolean, text) to authenticated;

-- Ocultar / mostrar / eliminar contenido desde la lista unificada. Reutiliza las
-- mismas máquinas de estado que Moderación (UGC → hidden; el resto → status).
create or replace function public.admin_content_moderate(in_type text, in_id uuid, in_action text, in_reason text)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  perform public._require_admin(array['moderador']);
  if in_action not in ('hide','unhide','remove') then raise exception 'acción inválida'; end if;
  if coalesce(trim(in_reason),'') = '' then raise exception 'la razón es obligatoria'; end if;

  if in_type = 'post' then
    if in_action = 'remove' then delete from public.posts where id = in_id;
    else update public.posts set hidden=(in_action='hide'), hidden_reason=in_reason, hidden_by=auth.uid(),
              hidden_at=case when in_action='hide' then now() end where id = in_id; end if;
  elsif in_type = 'reseña' then
    if in_action = 'remove' then delete from public.reviews where id = in_id;
    else update public.reviews set hidden=(in_action='hide'), hidden_reason=in_reason, hidden_by=auth.uid(),
              hidden_at=case when in_action='hide' then now() end where id = in_id; end if;
  elsif in_type = 'novedad' then
    update public.business_updates set status = case when in_action='hide' then 'archived' else 'live' end where id = in_id;
  elsif in_type = 'evento' then
    update public.events set status = case when in_action='hide' then 'draft' else 'published' end where id = in_id;
  elsif in_type = 'propiedad' then
    update public.properties set status = case when in_action='hide' then 'draft' else 'published' end where id = in_id;
  elsif in_type = 'auto' then
    update public.vehicles set status = case when in_action='hide' then 'draft' else 'published' end where id = in_id;
  else raise exception 'tipo inválido';
  end if;

  perform public._admin_log('content.'||in_action, in_type, in_id::text, null,
    jsonb_build_object('action', in_action), in_reason);
end $fn$;
grant execute on function public.admin_content_moderate(text, uuid, text, text) to authenticated;
