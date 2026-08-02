-- 0132_onboarding.sql — lo que necesita el alta de usuario nueva (2026-08-02).
--
-- Handoff "To'Latino — Onboarding & Auth Flow": el registro pasa a ser sin
-- contraseña (código de 6 dígitos por SMS o correo) y recoge, además del
-- nombre, la ZONA y los INTERESES. Esos dos últimos no tenían dónde vivir.
--
-- Idempotente: se puede volver a ejecutar sin romper nada.

-- ════════════════════════════════════════════════════════════════════════════
-- 1 · Intereses del usuario
-- ════════════════════════════════════════════════════════════════════════════
-- Las 10 categorías del handoff. Se guardan como claves cortas y estables
-- ('food', 'serv', 'evt', 'rent', 're', 'auto', 'job', 'trans', 'health',
-- 'com') — nunca la etiqueta traducida, que cambia con el idioma.
alter table public.profiles
  add column if not exists interests text[] not null default '{}';

comment on column public.profiles.interests is
  'Categorías que el usuario eligió en el alta. Claves estables, no etiquetas.';

-- ⚠️ IMPRESCINDIBLE. La migración 0130 cerró `update` sobre `profiles` a una
-- LISTA EXPLÍCITA de columnas (para que nadie pudiera tocar `stripe_customer_id`
-- ni `suspended_until`). Un permiso por columnas NO cubre las columnas nuevas:
-- sin esta línea, guardar los intereses fallaría con "permission denied" y el
-- alta se quedaría a medias en el último paso.
grant update (interests) on public.profiles to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- 2 · Datos REALES de la zona (pantalla "¡Te encontramos!")
-- ════════════════════════════════════════════════════════════════════════════
-- El handoff pinta ahí tres cifras — vecinos, negocios y alcance — con datos de
-- muestra ("8.2k vecinos · 186 negocios"). Publicar eso sería inventarle al
-- usuario una comunidad que no existe, en el momento exacto en que decide si
-- confía o no (regla #8). Esta función devuelve las cifras de VERDAD; la
-- pantalla oculta la que venga en cero en vez de rellenarla.
--
-- ESCALA: `st_dwithin` sobre el índice GIST (migración 0130) — no `st_distance`,
-- que no puede usar el índice. A 1M+ negocios sigue siendo una búsqueda por
-- índice acotada al radio.
--
-- PRIVACIDAD: el conteo de vecinos se redondea a la baja y solo se devuelve a
-- partir de 5. Con menos, un número exacto sobre un radio pequeño diría
-- demasiado de quién vive por ahí; y `profiles` es privado por RLS (cada quien
-- ve el suyo), así que la cuenta agregada solo puede salir de aquí, con
-- `security definer` y `search_path` fijo.
create or replace function public.zone_stats(
  user_lat double precision,
  user_lng double precision,
  radius_m integer default 48280   -- 30 millas: el mismo radio del feed vecinal
)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $fn$
  with p as (
    select st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography as g,
           greatest(1000, least(coalesce(radius_m, 48280), 160000)) as r
  )
  select jsonb_build_object(
    'businesses', (select count(*) from businesses b, p
                    where b.location is not null
                      and b.suspended = false
                      and b.tile_a is not null
                      and st_dwithin(b.location, p.g, p.r)),
    'events',     (select count(*) from events e, p
                    where e.location is not null
                      and e.starts_at > now()
                      and st_dwithin(e.location, p.g, p.r)),
    'neighbors',  (select case when count(*) >= 5 then count(*) else 0 end
                     from profiles pr, p
                    where pr.location is not null
                      and st_dwithin(pr.location, p.g, p.r))
  );
$fn$;

grant execute on function public.zone_stats(double precision, double precision, integer) to anon, authenticated;

notify pgrst, 'reload schema';
