-- 0143_vecinos_cerca_de_ti.sql
-- La columna derecha de Comunidad en escritorio, con datos REALES.
-- Idempotente. Aplicar: pegar en el SQL Editor de Supabase y darle a Run.
--
-- CONTEXTO: el Handoff pide 3 columnas en escritorio (barrios / feed /
-- tendencias+vecinos). La columna derecha se RETIRÓ el 2026-07-29 porque sus dos
-- tarjetas eran inventadas: hashtags con conteos falsos y tres «vecinos
-- sugeridos» que no existían, con un botón Seguir que funcionaba. Sin ella el
-- feed quedó a 842px de ancho en escritorio — un 40% más que Nextdoor, Facebook
-- o X, que rondan los 600.
--
-- Esto devuelve la mitad que SÍ se puede sostener con datos reales: vecinos que
-- han publicado cerca de ti y a los que todavía no sigues. Los «temas en
-- tendencia» NO se hacen: no hay hashtags en el modelo de datos, así que
-- cualquier cifra sería inventada otra vez.

-- ════════════════════════════════════════════════════════════════════════════
-- Vecinos activos cerca de ti
-- ════════════════════════════════════════════════════════════════════════════
-- Sale de `posts`, no de `profiles`: el nombre, las iniciales y el color ya van
-- desnormalizados en cada publicación, así que NO hace falta tocar la tabla que
-- guarda las coordenadas de la casa de cada quien. La foto la resuelve aparte
-- `public_avatars` (0134), que solo devuelve la URL.
--
-- SECURITY DEFINER a propósito: la política de `user_blocks` solo deja ver los
-- bloqueos que UNO hizo (`blocker_id = auth.uid()`), nunca los que le hicieron a
-- uno. Una función INVOKER no podría excluir a quien te bloqueó — le seguiría
-- sugiriendo tu perfil. Por eso se comprueba aquí, en los DOS sentidos, con
-- `auth.uid()` (que sí sobrevive dentro de DEFINER) y filtrando lo oculto a
-- mano, porque DEFINER se salta la RLS de `posts`.
create or replace function public.neighbors_nearby(
  user_lat    double precision default null,
  user_lng    double precision default null,
  radius_m    double precision default 48280,
  max_results int default 4
)
returns table (
  id            uuid,
  name          text,
  initials      text,
  color         text,
  hood          text,
  posts_count   bigint
)
language plpgsql
stable
security definer
set search_path to 'public'
as $fn$
declare
  yo  uuid := auth.uid();
  g   geography;
  lim integer := greatest(1, least(coalesce(max_results, 4), 12));
begin
  -- Sugerir a quién seguir es personal: sin sesión no se devuelve nada.
  if yo is null then return; end if;
  if user_lat is not null and user_lng is not null then
    g := st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography;
  end if;

  return query
  select p.author_id,
         (array_agg(p.author_name     order by p.created_at desc))[1],
         (array_agg(p.author_initials order by p.created_at desc))[1],
         (array_agg(p.author_color    order by p.created_at desc))[1],
         (array_agg(p.hood            order by p.created_at desc))[1],
         count(*)
    from public.posts p
   where p.author_id is not null
     and p.author_id <> yo
     and not coalesce(p.hidden, false)
     and p.created_at > now() - interval '60 days'
     -- `st_dwithin` (no `st_distance <= r`): es lo único que usa el índice GIST.
     and (g is null or st_dwithin(p.location, g, radius_m))
     -- a quien ya sigues no se le sugiere
     and not exists (
       select 1 from public.follows f
        where f.follower_id = yo and f.following_id = p.author_id)
     -- ni a quien bloqueaste, NI a quien te bloqueó a ti
     and not exists (
       select 1 from public.user_blocks b
        where (b.blocker_id = yo and b.blocked_id = p.author_id)
           or (b.blocker_id = p.author_id and b.blocked_id = yo))
   group by p.author_id
   order by count(*) desc, max(p.created_at) desc
   limit lim;
end $fn$;

grant execute on function public.neighbors_nearby(double precision, double precision, double precision, int) to authenticated;
-- Sin sesión no devuelve nada, así que `anon` no la necesita.
revoke execute on function public.neighbors_nearby(double precision, double precision, double precision, int) from anon, public;

-- Para que agrupar por autor no acabe en un escaneo cuando la tabla crezca.
create index if not exists posts_author_created_live_idx
  on public.posts (author_id, created_at desc)
  where hidden = false;

notify pgrst, 'reload schema';
