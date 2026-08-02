-- 0134_avatar_foto.sql — foto de perfil del usuario (2026-08-02).
--
-- Hasta hoy el avatar era SIEMPRE iniciales sobre un color (`initials` +
-- `avatar_color`). El alta prometía "tu foto la puedes poner después" y esa
-- pantalla no existía: una promesa sin nada detrás. Esto es lo que falta para
-- que la foto exista de verdad.
--
-- Idempotente: se puede volver a ejecutar sin romper nada.

-- ════════════════════════════════════════════════════════════════════════════
-- 1 · Dónde vive la foto
-- ════════════════════════════════════════════════════════════════════════════
-- Solo la URL pública. El archivo va al bucket `post-photos` (migración 0008),
-- dentro de la carpeta del propio usuario (`<uid>/<uuid>.webp`), que es lo que
-- exige su política de storage. La imagen ya llega comprimida desde el
-- navegador (400 px de lado, WebP, recorte cuadrado, sin EXIF).
alter table public.profiles
  add column if not exists avatar_url text;

comment on column public.profiles.avatar_url is
  'URL pública de la foto de perfil, o NULL si usa iniciales. Bucket post-photos.';

-- ⚠️ IMPRESCINDIBLE, mismo motivo que en 0132. La migración 0130 cerró `update`
-- sobre `profiles` a una LISTA EXPLÍCITA de columnas; un permiso por columnas
-- NO cubre las nuevas. Sin esta línea, guardar la foto falla con "permission
-- denied" justo al final del alta.
grant update (avatar_url) on public.profiles to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- 2 · Cómo se ve la foto de OTRA persona
-- ════════════════════════════════════════════════════════════════════════════
-- `profiles` es privado por RLS desde la migración 0082: cada quien lee SOLO su
-- fila. Se cerró a propósito, porque la tabla guarda `lat`/`lng` — las
-- coordenadas de la casa de cada usuario. No se reabre.
--
-- Pero el feed necesita pintar la cara del autor de un post, y el nombre y las
-- iniciales que ya lleva denormalizados no bastan. Esta función expone UNA sola
-- columna, la URL de una imagen que de todos modos es pública (el bucket lo es),
-- y NADA más: ni nombre, ni ciudad, ni coordenadas.
--
-- POR QUÉ UNA FUNCIÓN Y NO DENORMALIZAR la foto en `posts`, como se hizo con el
-- nombre y las iniciales: una foto se cambia, y una copia en cada post dejaría
-- la cara vieja pegada en todo lo publicado antes. Además habría que repetir la
-- copia en reseñas, chats, pedidos y reservas — cinco sitios donde olvidarse.
--
-- ESCALA: recibe los ids de UNA página del feed de golpe (nunca uno por
-- tarjeta), y busca por clave primaria. El tope de 200 evita que alguien la use
-- como escáner de la tabla entera.
create or replace function public.public_avatars(ids uuid[])
returns table (id uuid, avatar_url text)
language sql
stable
security definer
set search_path to 'public'
as $fn$
  select p.id, p.avatar_url
  from public.profiles p
  where p.id = any((coalesce(ids, '{}'::uuid[]))[1:200])
    and p.avatar_url is not null;
$fn$;

grant execute on function public.public_avatars(uuid[]) to anon, authenticated;

notify pgrst, 'reload schema';
