-- 0140_comunidad_bloqueo_y_moderacion_efectivos.sql — 2ª auditoría (2026-08-03).
--
-- Dos cosas que parecían hechas y no lo estaban. Las dos comparten una causa:
-- SE APLICABAN SOLO A LA LECTURA. Bloquear a alguien lo quitaba de tu vista, y
-- ocultar una publicación la quitaba de la vista de todos — pero ninguna de las
-- dos impedía ESCRIBIR. Y una regla que solo filtra lo que se lee no protege a
-- nadie: el que molesta sigue pudiendo actuar sobre ti, solo que a ciegas.
--
-- Idempotente.

-- ════════════════════════════════════════════════════════════════════════════
-- 1 · BLOQUEAR A ALGUIEN LE CALLA TAMBIÉN LA CAMPANA
-- ════════════════════════════════════════════════════════════════════════════
-- Lo que pasaba: bloqueabas a un vecino, dejabas de ver sus publicaciones… y él
-- seguía comentándote y dándote ♥, y cada vez te sonaba la campana con su nombre
-- y un trozo de su texto. Y con Web Push, el teléfono. El bloqueo se aplicaba en
-- la política RLS de `posts` y `post_comments`, pero los disparadores de avisos
-- (0136) escriben en `notifications`, que es otra tabla y no sabía nada.
--
-- Se arregla en `notify_once` y no en cada disparador: es el cuello de botella
-- por el que pasan los CUATRO avisos de comunidad. Un solo sitio que recordar.
create or replace function public.notify_once(
  in_user uuid, in_kind text, in_data jsonb, in_link text, in_actor uuid, in_ref text
) returns void
language plpgsql
security definer
set search_path to 'public'
as $fn$
begin
  if in_user is null then return; end if;

  -- Si el que RECIBE bloqueó al que ACTÚA, no hay aviso. Silencioso: el
  -- bloqueado no se entera de que no llegó, que es justo lo que se quiere.
  if in_actor is not null and exists (
    select 1 from public.user_blocks b
     where b.blocker_id = in_user and b.blocked_id = in_actor
  ) then return; end if;

  if exists (
    select 1 from public.notifications n
     where n.user_id = in_user
       and n.kind = in_kind
       and n.created_at > now() - interval '24 hours'
       and n.data ->> 'actor' = in_actor::text
       and coalesce(n.data ->> 'ref', '') = coalesce(in_ref, '')
  ) then return; end if;

  insert into public.notifications (user_id, kind, data, link) values (in_user, in_kind, in_data, in_link);
end $fn$;

revoke execute on function public.notify_once(uuid, text, jsonb, text, uuid, text) from public, anon, authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- 2 · UNA PUBLICACIÓN OCULTADA POR MODERACIÓN QUEDA CERRADA DE VERDAD
-- ════════════════════════════════════════════════════════════════════════════
-- Lo que pasaba: `hidden = true` la sacaba de las políticas de SELECT, pero
-- cualquiera que conservara el identificador —la tenía abierta, se la pasaron
-- por WhatsApp, salió del enlace de una notificación— podía seguir comentándola
-- y dándole ♥. Y su autor seguía recibiendo el aviso de cada uno. O sea: el
-- contenido que moderamos por dañino seguía generando actividad y ruido.
--
-- Ahora las escrituras exigen que la publicación EXISTA Y NO ESTÉ OCULTA. De
-- paso, se cierra también el otro lado del bloqueo: no puedes comentar ni dar ♥
-- a alguien que te bloqueó. Bloquear deja de ser "no le veo" para ser "no nos
-- alcanzamos".
-- ⚠️ La comprobación va en un DISPARADOR y no en la política de INSERT. Primer
-- intento: meterla en la política. Postgres respondió «infinite recursion
-- detected in policy for relation post_comments» — porque para validar la
-- respuesta había que mirar el comentario padre, o sea consultar `post_comments`
-- desde una política de `post_comments`. Un disparador no tiene ese problema, y
-- además puede dar un mensaje en español en vez de un «violates row-level
-- security policy» que el usuario no entiende.
-- ⚠️ DOS intentos fallidos antes de este, y los dos enseñan algo:
--
-- 1º SECURITY DEFINER con el filtro `current_user not in ('authenticated',
--    'anon')`. Dentro de una función DEFINER `current_user` es el DUEÑO, así que
--    el filtro se cumplía siempre y el disparador salía sin comprobar nada. Es
--    el MISMO error que hubo que corregir en 0135, repetido.
-- 2º SECURITY INVOKER apoyándose en «¿veo yo esta publicación?». No vale: la
--    política de lectura esconde las publicaciones de quien YO bloqueé, no las
--    de quien me bloqueó A MÍ. El bloqueo es de una sola dirección por diseño, y
--    aquí hace falta justo la contraria.
--
-- Solución: DEFINER (para poder leer `user_blocks`, que cada quien solo ve la
-- suya) y detectar al usuario por `auth.uid()` en vez de por `current_user`.
-- auth.uid() sí sobrevive dentro de una función DEFINER, porque lee el token de
-- la petición. Si es nulo, la llamada viene de la clave de servicio o de un
-- proceso interno y se deja pasar.
create or replace function public.tg_comments_check_target()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare yo uuid := auth.uid(); autor uuid; oculta boolean;
begin
  if yo is null then return new; end if;

  select p.author_id, p.hidden into autor, oculta from public.posts p where p.id = new.post_id;
  if autor is null then
    raise exception 'Esa publicación ya no existe.' using errcode = 'check_violation';
  end if;
  if oculta then
    raise exception 'Esta publicación ya no acepta comentarios.' using errcode = 'check_violation';
  end if;
  -- El autor me bloqueó a MÍ (dirección contraria a la de la política de lectura).
  if exists (select 1 from public.user_blocks b where b.blocker_id = autor and b.blocked_id = yo) then
    raise exception 'Esta publicación ya no acepta comentarios.' using errcode = 'check_violation';
  end if;
  -- …o yo le bloqueé a él: tampoco tiene sentido escribirle.
  if exists (select 1 from public.user_blocks b where b.blocker_id = yo and b.blocked_id = autor) then
    raise exception 'Esta publicación ya no acepta comentarios.' using errcode = 'check_violation';
  end if;

  if new.parent_id is not null
     and not exists (select 1 from public.post_comments c where c.id = new.parent_id and not c.hidden) then
    raise exception 'Ese comentario ya no está disponible.' using errcode = 'check_violation';
  end if;
  return new;
end $fn$;

drop trigger if exists a_comments_check_target on public.post_comments;
create trigger a_comments_check_target
  before insert on public.post_comments
  for each row execute function public.tg_comments_check_target();

drop policy if exists "own write post_likes" on public.post_likes;
create policy "own write post_likes" on public.post_likes
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.posts p
       where p.id = post_id
         and not p.hidden
         and not exists (
           select 1 from public.user_blocks b
            where b.blocker_id = p.author_id and b.blocked_id = auth.uid()
         )
    )
  );

-- `toggle_post_like` es SECURITY DEFINER, así que se salta la política de arriba
-- por diseño. Hay que repetirle la regla dentro, o el ♥ seguiría entrando por
-- esa puerta. (El mismo despiste que hizo falta arreglar en 0139: una función
-- con privilegios no obedece a las políticas de la tabla.)
create or replace function public.toggle_post_like(p_post uuid)
returns table (liked boolean, count integer)
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare uid uuid := auth.uid(); has boolean; puede boolean;
begin
  if uid is null then raise exception 'auth required'; end if;

  select (not p.hidden) and not exists (
           select 1 from public.user_blocks b
            where b.blocker_id = p.author_id and b.blocked_id = uid)
    into puede
    from public.posts p where p.id = p_post;

  -- Quitar un ♥ que ya diste se permite siempre: si no, alguien que te bloquea
  -- después te deja el ♥ pegado para siempre y sin forma de retirarlo.
  select exists(select 1 from public.post_likes where post_id = p_post and user_id = uid) into has;
  if not has and coalesce(puede, false) = false then
    raise exception 'Esta publicación ya no acepta reacciones.' using errcode = 'check_violation';
  end if;

  if has then
    delete from public.post_likes where post_id = p_post and user_id = uid;
    update public.posts set recommends = greatest(0, recommends - 1) where id = p_post;
  else
    insert into public.post_likes(post_id, user_id) values (p_post, uid) on conflict do nothing;
    update public.posts set recommends = recommends + 1 where id = p_post;
  end if;
  return query select (not has), coalesce((select recommends from public.posts where id = p_post), 0);
end $fn$;

-- ════════════════════════════════════════════════════════════════════════════
-- 3 · EL CONTADOR DE COMENTARIOS CUENTA LO QUE DE VERDAD SE VE
-- ════════════════════════════════════════════════════════════════════════════
-- Lo que pasaba: la tarjeta decía «1 comentario» y al abrir el hilo aparecía
-- «Aún no hay comentarios». El contador sumaba comentarios que la política de
-- lectura después escondía — los ocultados por moderación y los de gente
-- bloqueada. Un número que no cuadra con lo que hay debajo es peor que no poner
-- número: parece que la app perdió algo.
create or replace function public.post_comment_counts(ids uuid[])
returns table (post_id uuid, n bigint)
language sql
stable
security invoker
set search_path to 'public'
as $fn$
  select c.post_id, count(*)
    from public.post_comments c
   where c.post_id = any((coalesce(ids, '{}'::uuid[]))[1:200])
     and not c.hidden
     and not exists (
       select 1 from public.user_blocks b
        where b.blocker_id = auth.uid() and b.blocked_id = c.author_id
     )
   group by c.post_id;
$fn$;

grant execute on function public.post_comment_counts(uuid[]) to anon, authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- 4 · BUSCAR UNA PUBLICACIÓN POR SU IDENTIFICADOR
-- ════════════════════════════════════════════════════════════════════════════
-- Necesario para que el enlace de una notificación (y el de "Compartir") abra la
-- publicación aunque NO esté en la página del feed que el usuario tiene cargada
-- — que es el caso normal: el aviso llega horas después, o la publicación está a
-- 40 millas. Hoy el hilo se busca solo en la lista que hay en memoria, así que
-- el enlace no abría nada.
--
-- SECURITY INVOKER a propósito: así respeta la política de `posts` y no sirve
-- para leer lo oculto ni lo de alguien a quien el lector bloqueó.
create or replace function public.post_by_id(in_id uuid)
returns setof public.posts
language sql
stable
security invoker
set search_path to 'public'
as $fn$
  select p.* from public.posts p where p.id = in_id;
$fn$;

grant execute on function public.post_by_id(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
