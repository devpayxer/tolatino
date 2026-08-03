-- 0136_comunidad_notificaciones.sql — Comunidad deja de ser muda (2026-08-03).
--
-- EL PROBLEMA. Te comentaban, te respondían, te daban ♥ o te seguían, y no te
-- enterabas nunca. La tabla `notifications` y la campana de Alertas llevaban
-- meses funcionando — las usan pedidos, reservas, reseñas, boletos y rentas —
-- pero Comunidad no escribía ni una sola fila.
--
-- POR QUÉ IMPORTA MÁS QUE CUALQUIER OTRA COSA DE ESTA SECCIÓN. En Nextdoor y en
-- los grupos de Facebook ese aviso ES el producto: alguien publica una pregunta,
-- un vecino contesta, y si nadie le avisa, el que preguntó no vuelve nunca. El
-- feed se queda lleno de conversaciones a medias. Es la diferencia entre una
-- comunidad y un tablón de anuncios abandonado.
--
-- DE REGALO: `notifications` ya tiene un trigger de reparto a Web Push
-- (`trg_push_fanout`, migración 0089), así que estas notificaciones llegan
-- también al teléfono en cuanto el fundador configure las llaves VAPID. No hay
-- que tocar nada más.
--
-- Idempotente.

-- ════════════════════════════════════════════════════════════════════════════
-- Anti-repetición
-- ════════════════════════════════════════════════════════════════════════════
-- Un ♥ se puede quitar y volver a poner: sin freno, un vecino aburrido te llena
-- la campana con el mismo aviso. Lo mismo con seguir/dejar de seguir. Se ignora
-- un aviso idéntico (mismo tipo, mismo actor, mismo objeto) dentro de 24 h.
create or replace function public.notify_once(
  in_user uuid, in_kind text, in_data jsonb, in_link text, in_actor uuid, in_ref text
) returns void
language plpgsql
security definer
set search_path to 'public'
as $fn$
begin
  if in_user is null then return; end if;
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

-- ════════════════════════════════════════════════════════════════════════════
-- 1 · Comentarios y respuestas
-- ════════════════════════════════════════════════════════════════════════════
-- Dos avisos distintos a propósito: "comentaron TU publicación" y "te
-- respondieron a TI". Si alguien responde dentro de tu propia publicación, el
-- autor del post y el del comentario padre pueden ser la misma persona: se
-- manda UNO solo, el de la respuesta, que es el más específico.
create or replace function public.tg_notify_comment()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare
  autor_post   uuid;
  autor_padre  uuid;
  quien        text;
  extracto     text;
  enlace       text;
begin
  if new.author_id is null then return new; end if;

  select author_id into autor_post from public.posts where id = new.post_id;
  if new.parent_id is not null then
    select author_id into autor_padre from public.post_comments where id = new.parent_id;
  end if;

  quien    := coalesce(nullif(btrim(new.author_name), ''), 'Un vecino');
  extracto := left(coalesce(nullif(btrim(new.body), ''), '👍'), 90);
  enlace   := '/comunidad/?post=' || new.post_id;

  -- Respuesta a un comentario concreto.
  if autor_padre is not null and autor_padre <> new.author_id then
    perform public.notify_once(
      autor_padre, 'reply_new',
      jsonb_build_object('name', quien, 'preview', extracto, 'actor', new.author_id, 'ref', new.id::text),
      enlace, new.author_id, new.id::text);
  end if;

  -- Comentario en la publicación (si no es el mismo aviso que el de arriba).
  if autor_post is not null and autor_post <> new.author_id
     and (autor_padre is null or autor_padre <> autor_post) then
    perform public.notify_once(
      autor_post, 'comment_new',
      jsonb_build_object('name', quien, 'preview', extracto, 'actor', new.author_id, 'ref', new.id::text),
      enlace, new.author_id, new.id::text);
  end if;

  return new;
end $fn$;

drop trigger if exists notify_comment on public.post_comments;
create trigger notify_comment
  after insert on public.post_comments
  for each row execute function public.tg_notify_comment();

-- ════════════════════════════════════════════════════════════════════════════
-- 2 · ♥ en tu publicación
-- ════════════════════════════════════════════════════════════════════════════
-- El nombre de quien da el ♥ sale de `profiles`, no de la fila del like: es el
-- único sitio donde vive, y así siempre es el real.
create or replace function public.tg_notify_post_like()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare autor uuid; quien text; extracto text;
begin
  select author_id, left(coalesce(body_es, ''), 70) into autor, extracto
    from public.posts where id = new.post_id;
  if autor is null or autor = new.user_id then return new; end if;
  select coalesce(nullif(btrim(display_name), ''), 'Un vecino') into quien
    from public.profiles where id = new.user_id;
  perform public.notify_once(
    autor, 'post_like',
    jsonb_build_object('name', coalesce(quien, 'Un vecino'), 'preview', extracto,
                       'actor', new.user_id, 'ref', new.post_id::text),
    '/comunidad/?post=' || new.post_id, new.user_id, new.post_id::text);
  return new;
end $fn$;

drop trigger if exists notify_post_like on public.post_likes;
create trigger notify_post_like
  after insert on public.post_likes
  for each row execute function public.tg_notify_post_like();

-- ════════════════════════════════════════════════════════════════════════════
-- 3 · Alguien te sigue
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.tg_notify_follow()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare quien text;
begin
  if new.follower_id = new.following_id then return new; end if;
  select coalesce(nullif(btrim(display_name), ''), 'Un vecino') into quien
    from public.profiles where id = new.follower_id;
  perform public.notify_once(
    new.following_id, 'follow_new',
    jsonb_build_object('name', coalesce(quien, 'Un vecino'),
                       'actor', new.follower_id, 'ref', new.follower_id::text),
    '/comunidad/', new.follower_id, new.follower_id::text);
  return new;
end $fn$;

drop trigger if exists notify_follow on public.follows;
create trigger notify_follow
  after insert on public.follows
  for each row execute function public.tg_notify_follow();

-- Para que `notify_once` no tenga que recorrer la tabla entera comprobando si ya
-- avisó: a 1M de usuarios eso sería un escaneo por cada ♥.
create index if not exists notifications_dedupe_idx
  on public.notifications (user_id, kind, created_at desc);

notify pgrst, 'reload schema';

-- ════════════════════════════════════════════════════════════════════════════
-- 4 · "Editado" — que se vea que un mensaje cambió después de publicarse
-- ════════════════════════════════════════════════════════════════════════════
-- Sin esta marca, alguien puede publicar una cosa, recibir respuestas, y luego
-- cambiar el texto dejando a los que contestaron respondiendo a algo que ya no
-- dice eso. Facebook y Nextdoor marcan la edición por este mismo motivo.
-- La pone el SERVIDOR, no el cliente: si la pusiera el cliente, no la pondría.
alter table public.posts add column if not exists edited_at timestamptz;

create or replace function public.tg_posts_mark_edited()
returns trigger
language plpgsql
as $fn$
begin
  if new.body_es is distinct from old.body_es or new.body_en is distinct from old.body_en
     or new.images is distinct from old.images then
    new.edited_at := now();
  end if;
  return new;
end $fn$;

-- El nombre empieza por 'z' para que corra DESPUÉS del guardián de la lista
-- blanca (`posts_guard_upd`). Si corriera antes, el guardián vería `edited_at`
-- como una columna que cambió el cliente y rechazaría TODA edición — que es
-- exactamente lo que pasó al probarlo con el nombre `e_...`.
drop trigger if exists e_posts_mark_edited on public.posts;
drop trigger if exists z_posts_mark_edited on public.posts;
create trigger z_posts_mark_edited
  before update on public.posts
  for each row execute function public.tg_posts_mark_edited();

notify pgrst, 'reload schema';
