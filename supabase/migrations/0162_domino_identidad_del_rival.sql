-- 0162 · Quién es el que tienes enfrente.
--
-- EL PROBLEMA: la mesa decía «Tu rival» con un avatar «?». No era un fallo de
-- la pantalla: `profiles` tiene una sola política de lectura, «self read
-- profiles» (`id = auth.uid()`), así que el navegador NO puede leer el perfil de
-- nadie más. Correcto — los perfiles no son públicos — pero deja la mesa sin
-- cara, y jugar contra un «?» es exactamente lo contrario de lo que hace una
-- sala de juegos del barrio.
--
-- LA DECISIÓN: no se abre `profiles`. Esa política se queda como está. Lo que
-- cambia es que el SERVIDOR devuelve la identidad pública del rival dentro del
-- mismo estado que ya filtra — `domino_estado` es `security definer`, ya decide
-- qué puedes ver de la partida, y este es el mismo tipo de decisión.
--
-- CUÁNTO se revela: solo nombre, iniciales y color, y solo del jugador que está
-- sentado en TU mesa. Ni correo, ni ciudad, ni nada más; y a un mirón, nada.
-- Es lo mínimo para que la mesa tenga cara.
--
-- Idempotente: `create or replace`.

create or replace function public.domino_estado(in_partida uuid)
returns jsonb language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  yo uuid := auth.uid(); pa public.domino_partidas;
  mi_mano jsonb; rival uuid; n_rival int; n_pozo int; segs int; quedan int;
  r_nombre text; r_iniciales text; r_color text;
begin
  perform public.domino_vencer(in_partida);

  select * into pa from public.domino_partidas where id = in_partida;
  if pa is null then return null; end if;

  select valor into segs from public.domino_ajustes where clave = 'segundos_por_jugada';
  segs := coalesce(segs, 60);
  quedan := greatest(0, segs - floor(extract(epoch from (now() - pa.movida_at)))::int);

  if yo is null or not (yo = any(pa.jugadores)) then
    -- Mirón: la mesa, nunca las manos — y tampoco quién juega.
    return jsonb_build_object('id', pa.id, 'estado', pa.estado, 'mesa', pa.mesa,
      'izq', pa.izq, 'der', pa.der, 'mirando', true, 'ganador', pa.ganador);
  end if;

  select fichas into mi_mano from public.domino_manos where partida_id = in_partida and user_id = yo;
  rival := (select j from unnest(pa.jugadores) j where j is distinct from yo limit 1);
  select jsonb_array_length(fichas) into n_rival from public.domino_manos
   where partida_id = in_partida and user_id = rival;
  select jsonb_array_length(fichas) into n_pozo from public.domino_pozo where partida_id = in_partida;

  -- La cara del rival: tres campos, nada más.
  select pr.display_name, pr.initials, pr.avatar_color
    into r_nombre, r_iniciales, r_color
    from public.profiles pr where pr.id = rival;

  return jsonb_build_object(
    'id', pa.id,
    'estado', pa.estado,
    'mesa', pa.mesa,
    'izq', pa.izq,
    'der', pa.der,
    'mi_mano', coalesce(mi_mano, '[]'::jsonb),
    'fichas_rival', coalesce(n_rival, 0),
    'pozo', coalesce(n_pozo, 0),
    'me_toca', pa.estado = 'jugando' and pa.jugadores[pa.turno + 1] = yo,
    'puedo_jugar', public.dom_puede_jugar(mi_mano, pa.izq, pa.der),
    'segundos', quedan,
    'ganador', pa.ganador,
    'motivo_fin', pa.motivo_fin,
    'rival', rival,
    'rival_nombre', r_nombre,
    'rival_iniciales', r_iniciales,
    'rival_color', r_color
  );
end $$;

comment on function public.domino_estado(uuid) is
  'domino_estado(): tu mano completa, del rival solo cuántas fichas le quedan y '
  'su identidad pública (nombre, iniciales, color) — nada más, y a un mirón nada.';
