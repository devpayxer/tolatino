-- 0137_comunidad_escala_y_bloqueo.sql — auditoría de Comunidad, parte 3
-- (2026-08-03). Cierra los puntos de ESCALA y el de CONVIVENCIA.
--
-- Los cuatro problemas de escala que traía la sección, medidos en la auditoría:
--   1. El feed traía 50 publicaciones y se acababa. No había "cargar más".
--   2. Para pintar "3 comentarios" el navegador se bajaba TODAS las filas de
--      comentarios de las 50 publicaciones y las contaba a mano. Con hilos
--      activos son miles de filas por visita, para mostrar tres números.
--   3. La búsqueda dentro de Comunidad filtraba solo lo ya cargado. Buscabas
--      algo de la semana pasada y no existía — aunque estuviera en la base.
--   4. `posts.pinned` y `featured` existían y NADIE los leía: el admin podía
--      fijar una publicación y no pasaba absolutamente nada.
--
-- Y el de convivencia: solo se podía REPORTAR a un vecino. En una app de barrio
-- —donde la gente se conoce y se cruza en la tienda— poder dejar de ver a
-- alguien sin denunciarlo es lo mínimo. Nextdoor y Facebook lo tienen desde el
-- primer día.
--
-- Idempotente.

-- ════════════════════════════════════════════════════════════════════════════
-- 1 · Bloquear a un vecino
-- ════════════════════════════════════════════════════════════════════════════
-- Bloqueo de UNA dirección y silencioso: tú dejas de verle, él no se entera.
-- Es lo contrario de reportar, que va a moderación y puede acabar en sanción.
-- La mayoría de los conflictos de barrio no necesitan un juez, solo distancia.
create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint no_autobloqueo check (blocker_id <> blocked_id)
);

comment on table public.user_blocks is
  'A quién ha bloqueado cada usuario. Solo el dueño de la fila la ve o la borra.';

alter table public.user_blocks enable row level security;
drop policy if exists "read own blocks"   on public.user_blocks;
drop policy if exists "insert own block"  on public.user_blocks;
drop policy if exists "delete own block"  on public.user_blocks;
-- Nadie puede consultar quién le ha bloqueado a él: solo se lee la propia lista.
create policy "read own blocks"  on public.user_blocks for select using (blocker_id = auth.uid());
create policy "insert own block" on public.user_blocks for insert with check (blocker_id = auth.uid());
create policy "delete own block" on public.user_blocks for delete using (blocker_id = auth.uid());

-- ════════════════════════════════════════════════════════════════════════════
-- 2 · El bloqueo se aplica en la POLÍTICA, no en cada consulta
-- ════════════════════════════════════════════════════════════════════════════
-- Se pone en la RLS y no dentro de `posts_near` a propósito: así vale para TODOS
-- los caminos de lectura a la vez — el inicio, Guardados, Siguiendo, la búsqueda,
-- el hilo de comentarios y cualquiera que se escriba mañana. Si se hiciera
-- consulta por consulta, la que se olvide sería justo por donde reaparecería la
-- persona a la que el usuario decidió no volver a ver.
drop policy if exists "public read posts" on public.posts;
create policy "public read posts" on public.posts
  for select using (
    not hidden
    and not exists (
      select 1 from public.user_blocks b
       where b.blocker_id = auth.uid() and b.blocked_id = posts.author_id
    )
  );

drop policy if exists "public read comments" on public.post_comments;
create policy "public read comments" on public.post_comments
  for select using (
    not hidden
    and not exists (
      select 1 from public.user_blocks b
       where b.blocker_id = auth.uid() and b.blocked_id = post_comments.author_id
    )
  );

-- La política corre por FILA: sin este índice, cada publicación del feed haría
-- un escaneo de la tabla de bloqueos.
create index if not exists user_blocks_lookup_idx on public.user_blocks (blocker_id, blocked_id);

-- ════════════════════════════════════════════════════════════════════════════
-- 3 · Feed paginado, y lo fijado arriba
-- ════════════════════════════════════════════════════════════════════════════
-- Paginación por CURSOR (`before_*`), no por `offset`. Con offset, si llega una
-- publicación nueva mientras alguien lee, la página 2 repite la última de la
-- página 1 — el error clásico de los feeds. El cursor apunta a una fila concreta
-- y eso no pasa. Además, a 1M de filas `offset 10000` obliga a Postgres a contar
-- 10.000 filas para tirarlas; el cursor usa el índice y no cuenta nada.
--
-- Lo FIJADO solo sale en la primera página: si saliera en todas, el usuario lo
-- vería una vez por cada vez que carga más.
-- ⚠️ La versión vieja (4 argumentos) TIENE que desaparecer. Si conviven, una
-- llamada con 4 argumentos encaja en las dos y Postgres responde "function is
-- not unique" — o sea, el feed entero deja de cargar. Verificado al aplicar
-- esta migración por primera vez en pruebas.
drop function if exists public.posts_near(double precision, double precision, double precision, integer);

create or replace function public.posts_near(
  user_lat double precision default null,
  user_lng double precision default null,
  radius_m double precision default 48280,
  max_results int default 50,
  before_created_at timestamptz default null,
  before_id uuid default null
) returns setof public.posts
language plpgsql
stable
set search_path to 'public'
as $fn$
declare
  g   geography;
  lim integer := greatest(1, least(coalesce(max_results, 50), 100));
begin
  if user_lat is not null and user_lng is not null then
    g := st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography;
  end if;

  return query
  select p.*
    from public.posts p
   where (case when g is null or radius_m is null then true
               else st_dwithin(p.location, g, radius_m) end)
     -- Cursor: estrictamente "más viejas que la última que ya tienes". El `id`
     -- desempata dos publicaciones del mismo instante.
     and (before_created_at is null
          or (p.created_at, p.id) < (before_created_at, coalesce(before_id, '00000000-0000-0000-0000-000000000000'::uuid)))
   order by
     -- Fijadas arriba, pero solo en la primera página.
     (before_created_at is null and p.pinned) desc,
     p.created_at desc, p.id desc
   limit lim;
end $fn$;

grant execute on function public.posts_near(double precision, double precision, double precision, int, timestamptz, uuid) to anon, authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- 4 · Contar comentarios en el SERVIDOR
-- ════════════════════════════════════════════════════════════════════════════
-- Antes: bajar todas las filas y contarlas en el navegador. Ahora: un `count`
-- agrupado, que es lo que las bases de datos saben hacer. Devuelve solo los
-- que tienen alguno; los que faltan son cero.
create or replace function public.post_comment_counts(ids uuid[])
returns table (post_id uuid, n bigint)
language sql
stable
set search_path to 'public'
as $fn$
  select c.post_id, count(*)
    from public.post_comments c
   where c.post_id = any((coalesce(ids, '{}'::uuid[]))[1:200])
   group by c.post_id;
$fn$;

grant execute on function public.post_comment_counts(uuid[]) to anon, authenticated;

create index if not exists post_comments_post_idx on public.post_comments (post_id);

-- ════════════════════════════════════════════════════════════════════════════
-- 5 · Buscar en TODA la comunidad, no en lo que ya se cargó
-- ════════════════════════════════════════════════════════════════════════════
-- `posts.search_vector` ya existía y no lo usaba nadie desde Comunidad. Pero
-- estaba construido con la configuración `simple`, que no sabe español: no
-- reconoce raíces (buscar "mecánicos" no encontraba "mecánico") ni ignora
-- palabras vacías. Y sin quitar acentos, "taqueria" no encuentra "taquería" —
-- y en un teclado de teléfono casi nadie pone el acento.
--
-- Se reconstruye con `spanish` + `unaccent`. Es el momento de hacerlo: la tabla
-- está prácticamente vacía. A 1M de publicaciones esto es una reescritura
-- completa de la tabla con la sección caída mientras dura.
create extension if not exists unaccent;

-- `unaccent()` es STABLE y una columna generada exige IMMUTABLE. Esta envoltura
-- fija el diccionario por nombre, que es lo que la hace inmutable de verdad.
create or replace function public.tl_unaccent(text)
returns text
language sql
immutable
parallel safe
set search_path to 'public, extensions'
as $fn$ select public.unaccent('public.unaccent', $1) $fn$;

alter table public.posts drop column if exists search_vector;
alter table public.posts add column search_vector tsvector
  generated always as (
    to_tsvector('spanish', public.tl_unaccent(
      coalesce(body_es, '') || ' ' || coalesce(body_en, '') || ' ' ||
      coalesce(author_name, '') || ' ' || coalesce(business_name, '')))
  ) stored;

create index if not exists posts_search_idx on public.posts using gin (search_vector);

-- Se busca dentro del radio del usuario: una publicación de otro estado no le
-- sirve de nada aunque contenga la palabra.
create or replace function public.search_posts(
  in_q text,
  user_lat double precision default null,
  user_lng double precision default null,
  radius_m double precision default 48280,
  max_results int default 50
) returns setof public.posts
language plpgsql
stable
set search_path to 'public'
as $fn$
declare
  g   geography;
  q   tsquery;
  lim integer := greatest(1, least(coalesce(max_results, 50), 100));
begin
  if in_q is null or btrim(in_q) = '' then return; end if;
  if user_lat is not null and user_lng is not null then
    g := st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography;
  end if;
  -- `websearch_to_tsquery` entiende lo que la gente escribe de verdad
  -- ("mecanico honesto", comillas, -palabra) sin reventar con caracteres raros.
  q := websearch_to_tsquery('spanish', public.tl_unaccent(btrim(in_q)));
  if q is null then return; end if;

  return query
  select p.*
    from public.posts p
   where p.search_vector @@ q
     and (case when g is null or radius_m is null then true
               else st_dwithin(p.location, g, radius_m) end)
   order by ts_rank(p.search_vector, q) desc, p.created_at desc
   limit lim;
end $fn$;

grant execute on function public.search_posts(text, double precision, double precision, double precision, int) to anon, authenticated;

notify pgrst, 'reload schema';

-- ════════════════════════════════════════════════════════════════════════════
-- 6 · La lista de bloqueados, con nombre
-- ════════════════════════════════════════════════════════════════════════════
-- `user_blocks` guarda ids, y `profiles` es privado (0082), así que sin esto la
-- pantalla de "Bloqueados" enseñaría una lista de códigos: el usuario no podría
-- saber a quién está desbloqueando. Devuelve SOLO la lista de quien pregunta.
create or replace function public.blocked_users()
returns table (id uuid, name text, avatar_url text, blocked_at timestamptz)
language sql
stable
security definer
set search_path to 'public'
as $fn$
  select b.blocked_id,
         coalesce(nullif(btrim(p.display_name), ''), 'Vecino'),
         p.avatar_url,
         b.created_at
    from public.user_blocks b
    left join public.profiles p on p.id = b.blocked_id
   where b.blocker_id = auth.uid()
   order by b.created_at desc;
$fn$;

grant execute on function public.blocked_users() to authenticated;

notify pgrst, 'reload schema';
