-- 0141_comunidad_auditoria_media.sql
-- Segunda auditoría de Comunidad (2026-08-03) — los hallazgos de prioridad
-- MEDIA/BAJA que viven en la base. Idempotente: se puede volver a ejecutar.
-- Aplicar: pegar en el SQL Editor de Supabase y darle a Run.
--
-- Índice:
--   1 · Quién modera deja de ser público          (hallazgo 11)
--   2 · El índice que nunca se creó               (hallazgo 13)
--   3 · Ocultar un comentario oculta sus respuestas (hallazgo 16)
--   4 · Freno anti-spam en seguir y bloquear      (hallazgo 17)
--   5 · Reportar una cosa que no existe           (hallazgo 18)
--   6 · Bloquear deja de seguir, en los dos sentidos (hallazgo 22)

-- ════════════════════════════════════════════════════════════════════════════
-- 1 · QUIÉN MODERA DEJA DE SER PÚBLICO
-- ════════════════════════════════════════════════════════════════════════════
-- El problema: `featured_by` y `hidden_by` son columnas de tablas que cualquiera
-- puede leer. Una publicación DESTACADA es visible por definición y llevaba
-- pegado el uuid del moderador; y al MOSTRAR de nuevo algo oculto, `hidden_by`
-- se quedaba escrito en una fila que vuelve a ser pública. Con ese uuid y
-- `neighbor_profile()` (0138) cualquiera saca el nombre y la ciudad de quien
-- modera. En una app de barrio eso es una invitación a ir a buscarlo.
--
-- Por qué NO se arregla con permisos por columna: `authenticated` tiene SELECT a
-- nivel de TABLA, y un `revoke ... (columna)` no puede quitar lo que un permiso
-- de tabla ya concede (probado: `attacl` se queda en null y `has_column_
-- privilege` sigue diciendo true). Quitar el permiso de tabla y darlo columna a
-- columna dejaría invisible cualquier columna nueva — un fallo silencioso
-- esperando a pasar.
--
-- La solución correcta es que ese dato NO viva en la fila de contenido: quién
-- hizo qué ya está en `admin_audit` (actor_id + actor_email + razón + fecha),
-- que es de solo-admin. Así que se deja de escribir en la fila y se limpia lo
-- que hubiera.

-- 1.a · Destacar deja de firmar la fila.
create or replace function public.admin_content_feature(in_type text, in_id uuid, in_on boolean, in_reason text)
returns void language plpgsql security definer set search_path = public as $fn$
declare v_tbl text;
begin
  perform public._require_admin(array['moderador']);
  v_tbl := case in_type when 'post' then 'posts' when 'evento' then 'events'
    when 'propiedad' then 'properties' when 'auto' then 'vehicles'
    when 'novedad' then 'business_updates' else null end;
  if v_tbl is null then raise exception 'ese tipo no se puede destacar'; end if;
  -- `featured_by` ya NO se escribe: una fila destacada es pública y delataría a
  -- quien la destacó. Quién lo hizo queda en `admin_audit`, que es de admin.
  execute format('update public.%I set featured=$1, featured_at=$2, featured_by=null where id=$3', v_tbl)
    using in_on, case when in_on then now() end, in_id;
  perform public._admin_log('content.feature', in_type, in_id::text, null,
    jsonb_build_object('featured', in_on), in_reason);
end $fn$;
grant execute on function public.admin_content_feature(text, uuid, boolean, text) to authenticated;

-- 1.b · Mostrar de nuevo limpia el rastro del moderador.
create or replace function public.admin_content_moderate(in_type text, in_id uuid, in_action text, in_reason text)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  perform public._require_admin(array['moderador']);
  if in_action not in ('hide','unhide','remove') then raise exception 'acción inválida'; end if;
  if coalesce(trim(in_reason),'') = '' then raise exception 'la razón es obligatoria'; end if;

  -- Al OCULTAR sí se firma: la fila deja de ser pública, así que el dato queda
  -- disponible para el panel sin que nadie de fuera pueda verlo. Al MOSTRAR de
  -- nuevo se borra, porque la fila vuelve a ser pública.
  if in_type = 'post' then
    if in_action = 'remove' then delete from public.posts where id = in_id;
    elsif in_action = 'hide' then
      update public.posts set hidden = true, hidden_reason = in_reason,
             hidden_by = auth.uid(), hidden_at = now() where id = in_id;
    else
      update public.posts set hidden = false, hidden_reason = null,
             hidden_by = null, hidden_at = null where id = in_id;
    end if;
  elsif in_type = 'reseña' then
    if in_action = 'remove' then delete from public.reviews where id = in_id;
    elsif in_action = 'hide' then
      update public.reviews set hidden = true, hidden_reason = in_reason,
             hidden_by = auth.uid(), hidden_at = now() where id = in_id;
    else
      update public.reviews set hidden = false, hidden_reason = null,
             hidden_by = null, hidden_at = null where id = in_id;
    end if;
  elsif in_type = 'novedad' then
    update public.business_updates set status = case when in_action='hide' then 'archived' else 'live' end where id = in_id;
  elsif in_type = 'evento' then
    update public.events set status = case when in_action='hide' then 'draft' else 'published' end where id = in_id;
  elsif in_type = 'propiedad' then
    update public.properties set status = case when in_action='hide' then 'draft' else 'published' end where id = in_id;
  elsif in_type = 'auto' then
    update public.vehicles set status = case when in_action='hide' then 'draft' else 'published' end where id = in_id;
  else
    raise exception 'tipo inválido';
  end if;

  perform public._admin_log('content.' || in_action, in_type, in_id::text, null, null, in_reason);
end $fn$;
grant execute on function public.admin_content_moderate(text, uuid, text, text) to authenticated;

-- 1.c · Limpiar lo ya escrito: todo `featured_by`, y `hidden_by`/`hidden_reason`
--       en filas que hoy son visibles.
do $$
declare t text;
begin
  foreach t in array array['posts','events','properties','vehicles','business_updates','businesses'] loop
    if to_regclass('public.' || t) is not null
       and exists (select 1 from information_schema.columns
                    where table_schema='public' and table_name=t and column_name='featured_by') then
      execute format('update public.%I set featured_by = null where featured_by is not null', t);
    end if;
    if to_regclass('public.' || t) is not null
       and exists (select 1 from information_schema.columns
                    where table_schema='public' and table_name=t and column_name='hidden_by')
       and exists (select 1 from information_schema.columns
                    where table_schema='public' and table_name=t and column_name='hidden') then
      execute format('update public.%I set hidden_by = null, hidden_reason = null, hidden_at = null
                       where not coalesce(hidden,false) and hidden_by is not null', t);
    end if;
  end loop;
  -- reviews y post_comments no tienen `featured_by`, pero sí `hidden_by`.
  foreach t in array array['reviews','post_comments'] loop
    if to_regclass('public.' || t) is not null
       and exists (select 1 from information_schema.columns
                    where table_schema='public' and table_name=t and column_name='hidden_by') then
      execute format('update public.%I set hidden_by = null, hidden_reason = null, hidden_at = null
                       where not coalesce(hidden,false) and hidden_by is not null', t);
    end if;
  end loop;
end $$;

-- 1.d · Guardián: que no se vuelva a colar por otra vía.
create or replace function public.auditar_moderadores_expuestos()
returns table (tabla text, filas bigint, motivo text)
language plpgsql stable security definer set search_path = public as $fn$
declare t text; n bigint;
begin
  foreach t in array array['posts','events','properties','vehicles','business_updates','businesses','reviews','post_comments'] loop
    if to_regclass('public.' || t) is null then continue; end if;
    if exists (select 1 from information_schema.columns
                where table_schema='public' and table_name=t and column_name='featured_by') then
      execute format('select count(*) from public.%I where featured_by is not null', t) into n;
      if n > 0 then tabla := t; filas := n; motivo := 'featured_by en filas públicas'; return next; end if;
    end if;
    if exists (select 1 from information_schema.columns
                where table_schema='public' and table_name=t and column_name='hidden_by')
       and exists (select 1 from information_schema.columns
                    where table_schema='public' and table_name=t and column_name='hidden') then
      execute format('select count(*) from public.%I where not coalesce(hidden,false) and hidden_by is not null', t) into n;
      if n > 0 then tabla := t; filas := n; motivo := 'hidden_by en filas visibles'; return next; end if;
    end if;
  end loop;
end $fn$;
revoke execute on function public.auditar_moderadores_expuestos() from public, anon, authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- 2 · EL ÍNDICE QUE NUNCA SE CREÓ
-- ════════════════════════════════════════════════════════════════════════════
-- 0138 pidió `posts_author_idx on (author_id, created_at desc)` para el perfil de
-- vecino, pero 0130 ya había creado un `posts_author_idx` on (author_id) — y el
-- `if not exists` mira el NOMBRE, no las columnas, así que lo saltó en silencio.
-- El resultado: `neighbor_posts` ordena a mano las publicaciones de una persona.
-- Con 30 filas no se nota; con un vecino activo y un millón de publicaciones, sí.
create index if not exists posts_author_created_idx on public.posts (author_id, created_at desc);

-- ════════════════════════════════════════════════════════════════════════════
-- 3 · OCULTAR UN COMENTARIO OCULTA SUS RESPUESTAS
-- ════════════════════════════════════════════════════════════════════════════
-- El problema: la moderación esconde el comentario padre y sus respuestas se
-- quedan colgando — visibles, sin nada a lo que contestar, y contadas en el
-- «3 comentarios» de la tarjeta. El hilo dice una cosa y enseña otra.
create or replace function public.tg_comments_hide_replies() returns trigger
language plpgsql security definer set search_path = public as $fn$
begin
  if new.hidden and not coalesce(old.hidden, false) then
    -- Se marcan con una razón propia para poder distinguirlas de las ocultadas
    -- a mano: si el padre vuelve, estas vuelven; las otras no.
    update public.post_comments
       set hidden = true, hidden_reason = 'padre oculto', hidden_at = now()
     where parent_id = new.id and not coalesce(hidden, false);
  elsif not new.hidden and coalesce(old.hidden, false) then
    update public.post_comments
       set hidden = false, hidden_reason = null, hidden_at = null
     where parent_id = new.id and hidden_reason = 'padre oculto';
  end if;
  return new;
end $fn$;

drop trigger if exists comments_hide_replies on public.post_comments;
create trigger comments_hide_replies
  after update of hidden on public.post_comments
  for each row execute function public.tg_comments_hide_replies();

-- Poner al día lo que ya estaba colgando.
update public.post_comments r
   set hidden = true, hidden_reason = 'padre oculto', hidden_at = now()
  from public.post_comments p
 where r.parent_id = p.id and p.hidden and not coalesce(r.hidden, false);

-- ════════════════════════════════════════════════════════════════════════════
-- 4 · FRENO ANTI-SPAM EN SEGUIR Y BLOQUEAR
-- ════════════════════════════════════════════════════════════════════════════
-- 0111 puso un tope por hora a publicaciones, comentarios, ♥ y reseñas, pero
-- `follows` y `user_blocks` se quedaron fuera. Seguir a alguien le hace sonar el
-- teléfono (0136), así que una cuenta podía seguir y dejar de seguir en bucle
-- para acosar a otra. Se reutiliza el mismo limitador de 0111.
drop trigger if exists ugc_ratelimit on public.follows;
create trigger ugc_ratelimit before insert on public.follows
  for each row execute function public.tg_ugc_ratelimit('follower_id', '120');

drop trigger if exists ugc_ratelimit on public.user_blocks;
create trigger ugc_ratelimit before insert on public.user_blocks
  for each row execute function public.tg_ugc_ratelimit('blocker_id', '60');

-- ════════════════════════════════════════════════════════════════════════════
-- 5 · REPORTAR UNA COSA QUE NO EXISTE
-- ════════════════════════════════════════════════════════════════════════════
-- `create_report` aceptaba cualquier texto como tipo y cualquier uuid como
-- entidad. Un script podía llenar la bandeja de moderación de reportes contra
-- ids inventados, y el equipo se pasa el día abriendo cosas que no existen.
create or replace function public.create_report(
  in_type text, in_entity_id text, in_reason text, in_detail text default null
) returns uuid language plpgsql security definer set search_path = public as $fn$
declare v_id uuid; v_tbl text; v_existe boolean;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  if coalesce(trim(in_reason),'') = '' then raise exception 'la razón es obligatoria'; end if;

  v_tbl := case in_type
    when 'post' then 'posts' when 'comment' then 'post_comments'
    when 'business' then 'businesses' when 'event' then 'events'
    when 'review' then 'reviews' when 'user' then 'profiles'
    when 'property' then 'properties' when 'vehicle' then 'vehicles'
    else null end;
  if v_tbl is null then raise exception 'tipo de reporte inválido'; end if;

  -- El id tiene que ser un uuid de verdad Y existir. Se comprueba con permisos
  -- de la función (no del usuario) a propósito: se puede reportar algo que ya
  -- no se ve — por ejemplo, justo después de que su autor te bloquee.
  begin
    execute format('select exists (select 1 from public.%I where id = $1)', v_tbl)
      into v_existe using in_entity_id::uuid;
  exception when invalid_text_representation then
    raise exception 'ese identificador no es válido';
  end;
  if not v_existe then raise exception 'eso ya no existe'; end if;

  insert into public.reports (entity_type, entity_id, reporter_id, reason, detail)
  values (in_type, in_entity_id, auth.uid(), in_reason, in_detail)
  on conflict (entity_type, entity_id, reporter_id)
    do update set reason = excluded.reason, detail = excluded.detail
  returning id into v_id;
  return v_id;
end $fn$;
grant execute on function public.create_report(text, text, text, text) to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- 6 · BLOQUEAR DEJA DE SEGUIR, EN LOS DOS SENTIDOS
-- ════════════════════════════════════════════════════════════════════════════
-- Bloqueabas a alguien y las dos cuentas se seguían igual: la ficha decía
-- «Siguiendo» sobre una persona cuyas publicaciones ya no puedes ver, y los
-- números de seguidores contaban relaciones muertas. Bloquear tiene que cortar
-- el vínculo — en los dos sentidos, porque quien bloquea tampoco quiere que el
-- otro le siga.
create or replace function public.tg_block_unfollow() returns trigger
language plpgsql security definer set search_path = public as $fn$
begin
  delete from public.follows
   where (follower_id = new.blocker_id and following_id = new.blocked_id)
      or (follower_id = new.blocked_id and following_id = new.blocker_id);
  return new;
end $fn$;

drop trigger if exists block_unfollow on public.user_blocks;
create trigger block_unfollow
  after insert on public.user_blocks
  for each row execute function public.tg_block_unfollow();

-- Poner al día lo que ya estaba contradiciéndose.
delete from public.follows f
 using public.user_blocks b
 where (f.follower_id = b.blocker_id and f.following_id = b.blocked_id)
    or (f.follower_id = b.blocked_id and f.following_id = b.blocker_id);
