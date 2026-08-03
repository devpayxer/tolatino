-- 0138_perfil_de_vecino.sql — auditoría de Comunidad, parte 4 (2026-08-03).
--
-- EL PROBLEMA. En el feed, el nombre y la foto del autor no eran pulsables y no
-- existía ninguna pantalla suya. Se podía SEGUIR a alguien a ciegas: un botón
-- que dice "Seguir" sin poder ver antes quién es ni qué publica. En Nextdoor y
-- en Facebook, tocar el nombre es el gesto más natural que existe, y aquí no
-- pasaba nada.
--
-- POR QUÉ UN RPC Y NO ABRIR `profiles`. La tabla es privada desde la migración
-- 0082 porque guarda `lat`/`lng` — las coordenadas de la casa de cada usuario.
-- Eso no se reabre. Este RPC devuelve SOLO lo que ya es público en cualquier
-- publicación suya (nombre, iniciales, color, foto, ciudad) más dos conteos.
-- Nunca coordenadas, nunca correo, nunca teléfono, nunca la bio privada.
--
-- Idempotente.

create or replace function public.neighbor_profile(in_id uuid)
returns table (
  id uuid,
  name text,
  initials text,
  color text,
  avatar_url text,
  city text,
  bio text,
  joined_at timestamptz,
  posts_count bigint,
  followers_count bigint,
  i_follow boolean,
  i_blocked boolean
)
language sql
stable
security definer
set search_path to 'public'
as $fn$
  select
    p.id,
    coalesce(nullif(btrim(p.display_name), ''), 'Vecino'),
    coalesce(nullif(btrim(p.initials), ''), 'V'),
    coalesce(p.avatar_color, '#7B61FF'),
    p.avatar_url,
    p.city_label,
    -- La bio la escribe el propio usuario para que la lea su comunidad.
    nullif(btrim(coalesce(p.bio, '')), ''),
    p.created_at,
    (select count(*) from public.posts x where x.author_id = p.id and not x.hidden),
    (select count(*) from public.follows f where f.following_id = p.id),
    exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = p.id),
    exists (select 1 from public.user_blocks b where b.blocker_id = auth.uid() and b.blocked_id = p.id)
  from public.profiles p
  where p.id = in_id
    -- Un usuario suspendido no tiene escaparate público.
    and (p.suspended_until is null or p.suspended_until <= now());
$fn$;

grant execute on function public.neighbor_profile(uuid) to anon, authenticated;

-- Las publicaciones de ese vecino. SECURITY INVOKER a propósito: así la política
-- de `posts` sigue mandando y no se cuelan las ocultas por moderación ni las de
-- alguien a quien quien mira tiene bloqueado.
create or replace function public.neighbor_posts(in_id uuid, max_results int default 30)
returns setof public.posts
language sql
stable
set search_path to 'public'
as $fn$
  select p.* from public.posts p
   where p.author_id = in_id
   order by p.created_at desc
   limit greatest(1, least(coalesce(max_results, 30), 60));
$fn$;

grant execute on function public.neighbor_posts(uuid, int) to anon, authenticated;

-- "Sus publicaciones, las más nuevas primero" — sin esto es un escaneo por cada
-- perfil que alguien abra.
create index if not exists posts_author_idx on public.posts (author_id, created_at desc);

notify pgrst, 'reload schema';
