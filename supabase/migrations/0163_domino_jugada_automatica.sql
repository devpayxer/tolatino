-- 0163 · Si se acaba el tiempo, se juega por ti — no se pierde la partida.
-- Idempotente. Aplicar: pegar en el SQL Editor de Supabase y darle a Run.
--
-- ════════════════════════════════════════════════════════════════════════════
-- DECISIÓN DEL FUNDADOR (2026-09-08)
-- ════════════════════════════════════════════════════════════════════════════
-- «Si se vencen los 60 segundos, en vez de terminar la partida, solo debes
--  hacer la jugada automática, porque puede ser que algo interrumpa el momento
--  y se retome en la siguiente jugada.»
--
-- Tiene razón, y la razón es el público: se juega desde el móvil, en el bus, en
-- el descanso del trabajo, con el niño llamando. Una llamada entrante de treinta
-- segundos no puede costarte la partida. Antes, el primer plantón te saltaba el
-- turno y el segundo te la quitaba; ahora el reloj JUEGA POR TI y la partida
-- sigue donde estaba.
--
-- QUÉ JUEGA POR TI, exactamente (no es aleatorio):
--   1. Si tienes alguna ficha que encaje → pone la MÁS PESADA de las que
--      encajan. Es lo que haría cualquiera: si la partida acaba en tranque gana
--      quien menos puntos tenga en la mano, así que soltar lo gordo es lo que
--      te protege. Nunca te va a jugar la peor.
--   2. Si no encaja ninguna y queda pozo → roba hasta poder poner, y pone.
--   3. Si no encaja ninguna y no hay pozo → pasa. (Que es lo único legal.)
-- O sea: exactamente lo que las reglas te obligarían a hacer de todos modos.
--
-- Y SIGUE HABIENDO UN LÍMITE, por el que SÍ está delante. Si nadie contestara
-- nunca, el que se quedó jugaría catorce turnos de sesenta segundos contra una
-- silla vacía — un cuarto de hora mirando una cuenta atrás. Así que a los
-- **3 plantones SEGUIDOS** (tres minutos sin dar señales) la mesa se cierra y
-- gana el que está. Volver a jugar, robar o pasar pone tu cuenta a cero: quien
-- vuelve, vuelve limpio. El número vive en `domino_ajustes`, no en el código.
--
-- ════════════════════════════════════════════════════════════════════════════
-- POR QUÉ ESTA MIGRACIÓN PARTE LAS FUNCIONES EN DOS
-- ════════════════════════════════════════════════════════════════════════════
-- Para jugar por alguien hace falta la misma maquinaria que usa esa persona
-- (quitar la ficha de la mano, extender la cadena, mover los extremos, ver si
-- se acabó la mano, repartir puntos) — pero con OTRO actor: `domino_jugar` saca
-- el jugador de `auth.uid()`, y el reloj no es nadie.
--
-- La tentación es copiar el cuerpo dentro del reloj. Sería el error clásico de
-- este proyecto: dos copias de la regla, y la próxima corrección se aplica solo
-- a una. Así que el movimiento se extrae a `dom_poner` / `dom_robar_una` /
-- `dom_pasar_una`, que reciben QUIÉN, y las tres funciones de siempre pasan a
-- ser envoltorios que comprueban la sesión y el turno. La persona y el reloj
-- ejecutan literalmente el mismo código.

-- ── El umbral, como ajuste ──────────────────────────────────────────────────
insert into public.domino_ajustes (clave, valor) values ('plantones_para_abandono', 3)
on conflict (clave) do nothing;

-- Marca de la última jugada automática, para poder DECIRLO en pantalla. Se
-- borra en cuanto alguien juega de verdad (ver `domino_presente`).
alter table public.domino_partidas
  add column if not exists ultimo_auto jsonb;

comment on column public.domino_partidas.ultimo_auto is
  'La última jugada que hizo el reloj por alguien: {quien, accion, ficha}. '
  'Sirve para avisar en pantalla; se borra con la siguiente jugada humana.';

comment on column public.domino_partidas.plantones is
  'Plantones SEGUIDOS de cada jugador en esta partida, por id. Cada uno hace '
  'que el reloj juegue por él; al llegar a `plantones_para_abandono` se cierra '
  'la mesa. Cualquier acción propia (jugar, robar, pasar) lo pone a cero.';

-- ════════════════════════════════════════════════════════════════════════════
-- 1 · EL MOVIMIENTO, con el actor como parámetro
-- ════════════════════════════════════════════════════════════════════════════
-- Ninguna de las tres toca `plantones`: la presencia la marca quien llama.
-- El reloj llama sin marcar presencia (por eso cuenta el plantón); la persona
-- llama y marca. Si el movimiento borrara la cuenta, el reloj se perdonaría a
-- sí mismo y el abandono no llegaría nunca.

/** Poner una ficha por `in_quien`. No comprueba turno ni sesión: eso es de
 *  quien llama. Devuelve false si la ficha no está en su mano o no encaja. */
create or replace function public.dom_poner(
  in_partida uuid, in_quien uuid, in_a smallint, in_b smallint, in_lado text
) returns boolean language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  pa public.domino_partidas; mano jsonb; nueva jsonb := '[]'::jsonb; f jsonb; ficha jsonb;
  encontrada boolean := false; extremo smallint; otro smallint;
begin
  select * into pa from public.domino_partidas where id = in_partida for update;
  if pa is null or pa.estado <> 'jugando' then return false; end if;

  select fichas into mano from public.domino_manos where partida_id = in_partida and user_id = in_quien;
  if mano is null then return false; end if;

  for f in select * from jsonb_array_elements(mano) loop
    if not encontrada and (
         ((f->>0)::smallint = in_a and (f->>1)::smallint = in_b) or
         ((f->>0)::smallint = in_b and (f->>1)::smallint = in_a)) then
      encontrada := true; ficha := f;
    else
      nueva := nueva || jsonb_build_array(f);
    end if;
  end loop;
  if not encontrada then return false; end if;

  if pa.izq is null then
    update public.domino_partidas
       set mesa = jsonb_build_array(jsonb_build_array(in_a, in_b)),
           izq = in_a, der = in_b, pases = 0, movida_at = now(),
           turno = (pa.turno + 1) % array_length(pa.jugadores, 1)
     where id = in_partida;
  else
    extremo := case when in_lado = 'izq' then pa.izq else pa.der end;
    if in_a = extremo then otro := in_b;
    elsif in_b = extremo then otro := in_a;
    else return false;
    end if;

    update public.domino_partidas
       set mesa = case when in_lado = 'izq'
                       then jsonb_build_array(jsonb_build_array(in_a, in_b)) || pa.mesa
                       else pa.mesa || jsonb_build_array(jsonb_build_array(in_a, in_b)) end,
           izq = case when in_lado = 'izq' then otro else pa.izq end,
           der = case when in_lado = 'der' then otro else pa.der end,
           pases = 0, movida_at = now(),
           turno = (pa.turno + 1) % array_length(pa.jugadores, 1)
     where id = in_partida;
  end if;

  update public.domino_manos set fichas = nueva where partida_id = in_partida and user_id = in_quien;

  if jsonb_array_length(nueva) = 0 then
    update public.domino_partidas
       set estado = 'terminada', ganador = in_quien, motivo_fin = 'domino' where id = in_partida;
    perform public.domino_premiar(in_partida);
  end if;
  return true;
end $$;

/** Robar una ficha del pozo por `in_quien`. Solo si no puede jugar y hay pozo. */
create or replace function public.dom_robar_una(in_partida uuid, in_quien uuid)
returns boolean language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare pa public.domino_partidas; mano jsonb; pozo jsonb; ficha jsonb;
begin
  select * into pa from public.domino_partidas where id = in_partida for update;
  if pa is null or pa.estado <> 'jugando' then return false; end if;

  select fichas into mano from public.domino_manos where partida_id = in_partida and user_id = in_quien;
  if public.dom_puede_jugar(mano, pa.izq, pa.der) then return false; end if;

  select fichas into pozo from public.domino_pozo where partida_id = in_partida for update;
  if pozo is null or jsonb_array_length(pozo) = 0 then return false; end if;

  ficha := pozo->0;
  update public.domino_pozo set fichas = pozo - 0 where partida_id = in_partida;
  update public.domino_manos set fichas = mano || jsonb_build_array(ficha)
   where partida_id = in_partida and user_id = in_quien;
  update public.domino_partidas set movida_at = now() where id = in_partida;
  return true;
end $$;

/** Pasar por `in_quien`. Solo si no puede jugar Y el pozo está vacío. */
create or replace function public.dom_pasar_una(in_partida uuid, in_quien uuid)
returns boolean language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare pa public.domino_partidas; mano jsonb; pozo jsonb; p1 int; p2 int; gana uuid;
begin
  select * into pa from public.domino_partidas where id = in_partida for update;
  if pa is null or pa.estado <> 'jugando' then return false; end if;

  select fichas into mano from public.domino_manos where partida_id = in_partida and user_id = in_quien;
  if public.dom_puede_jugar(mano, pa.izq, pa.der) then return false; end if;
  select fichas into pozo from public.domino_pozo where partida_id = in_partida;
  if pozo is not null and jsonb_array_length(pozo) > 0 then return false; end if;

  if pa.pases + 1 >= array_length(pa.jugadores, 1) then
    select public.dom_puntos(fichas) into p1 from public.domino_manos
     where partida_id = in_partida and user_id = pa.jugadores[1];
    select public.dom_puntos(fichas) into p2 from public.domino_manos
     where partida_id = in_partida and user_id = pa.jugadores[2];
    gana := case when p1 < p2 then pa.jugadores[1]
                 when p2 < p1 then pa.jugadores[2]
                 else pa.jugadores[(pa.turno + 2) % 2 + 1] end;
    update public.domino_partidas
       set estado = 'terminada', ganador = gana, motivo_fin = 'tranque',
           pases = pa.pases + 1, movida_at = now()
     where id = in_partida;
    perform public.domino_premiar(in_partida);
  else
    update public.domino_partidas
       set pases = pa.pases + 1, movida_at = now(),
           turno = (pa.turno + 1) % array_length(pa.jugadores, 1)
     where id = in_partida;
  end if;
  return true;
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- 2 · LAS TRES DE SIEMPRE, ahora envoltorios
-- ════════════════════════════════════════════════════════════════════════════
-- Misma firma y mismo comportamiento visto desde fuera: sesión, turno, y
-- marcar presencia. El movimiento ya no vive aquí.

create or replace function public.domino_jugar(
  in_partida uuid, in_a smallint, in_b smallint, in_lado text
) returns boolean language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare yo uuid := auth.uid(); en_turno uuid; hecho boolean;
begin
  if yo is null then return false; end if;
  perform public.domino_vencer(in_partida);

  select jugadores[turno + 1] into en_turno from public.domino_partidas
   where id = in_partida and estado = 'jugando';
  if en_turno is distinct from yo then return false; end if;

  hecho := public.dom_poner(in_partida, yo, in_a, in_b, in_lado);
  if hecho then perform public.domino_presente(in_partida, yo); end if;
  return hecho;
end $$;

create or replace function public.domino_robar(in_partida uuid)
returns boolean language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare yo uuid := auth.uid(); en_turno uuid; hecho boolean;
begin
  if yo is null then return false; end if;
  perform public.domino_vencer(in_partida);

  select jugadores[turno + 1] into en_turno from public.domino_partidas
   where id = in_partida and estado = 'jugando';
  if en_turno is distinct from yo then return false; end if;

  hecho := public.dom_robar_una(in_partida, yo);
  -- Robar también es estar. Antes no lo marcaba, así que a quien resolvía su
  -- turno robando le seguía contando un plantón viejo.
  if hecho then perform public.domino_presente(in_partida, yo); end if;
  return hecho;
end $$;

create or replace function public.domino_pasar(in_partida uuid)
returns boolean language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare yo uuid := auth.uid(); en_turno uuid; hecho boolean;
begin
  if yo is null then return false; end if;
  perform public.domino_vencer(in_partida);

  select jugadores[turno + 1] into en_turno from public.domino_partidas
   where id = in_partida and estado = 'jugando';
  if en_turno is distinct from yo then return false; end if;

  hecho := public.dom_pasar_una(in_partida, yo);
  if hecho then perform public.domino_presente(in_partida, yo); end if;
  return hecho;
end $$;

-- Volver a jugar borra también el aviso de «se jugó por ti».
create or replace function public.domino_presente(in_partida uuid, in_quien uuid)
returns void language sql security definer set search_path = public, extensions, pg_temp as $$
  update public.domino_partidas
     set plantones = plantones - in_quien::text, ultimo_auto = null
   where id = in_partida;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- 3 · QUÉ FICHA JUGARÍA POR TI
-- ════════════════════════════════════════════════════════════════════════════
/** La mejor ficha jugable de una mano: la más pesada que encaje.
 *
 *  Devuelve {a, b, lado} o null si no hay ninguna. Con la mesa vacía vale
 *  cualquiera, así que sale la más pesada de la mano. */
create or replace function public.dom_mejor_ficha(fichas jsonb, izq smallint, der smallint)
returns jsonb language sql immutable as $$
  select jsonb_build_object(
           'a', (f->>0)::smallint,
           'b', (f->>1)::smallint,
           'lado', case when izq is null then 'der'
                        when public.dom_encaja(f, izq) then 'izq'
                        else 'der' end)
    from jsonb_array_elements(coalesce(fichas, '[]'::jsonb)) f
   where izq is null or public.dom_encaja(f, izq) or public.dom_encaja(f, der)
   order by (f->>0)::int + (f->>1)::int desc,   -- suelta lo gordo primero
            (f->>0)::int desc, (f->>1)::int desc -- desempate estable
   limit 1;
$$;

comment on function public.dom_mejor_ficha(jsonb, smallint, smallint) is
  'La ficha que el reloj juega por ti: la más pesada de las que encajan. En un '
  'tranque gana quien menos puntos tenga en la mano, así que soltar lo gordo es '
  'lo que te protege.';

-- ════════════════════════════════════════════════════════════════════════════
-- 4 · EL RELOJ: jugar por quien no está
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.domino_vencer(in_partida uuid)
returns boolean language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  pa public.domino_partidas; segs int; umbral int;
  de_turno uuid; el_otro uuid; nuevos smallint;
  mano jsonb; elegida jsonb; accion text := 'paso'; guardas int := 0;
begin
  select * into pa from public.domino_partidas where id = in_partida for update;
  if pa is null or pa.estado <> 'jugando' then return false; end if;

  select valor into segs from public.domino_ajustes where clave = 'segundos_por_jugada';
  segs := coalesce(segs, 60);
  if now() < pa.movida_at + make_interval(secs => segs) then return false; end if;

  select valor into umbral from public.domino_ajustes where clave = 'plantones_para_abandono';
  umbral := coalesce(umbral, 3);

  de_turno := pa.jugadores[pa.turno + 1];
  el_otro  := (select j from unnest(pa.jugadores) j where j is distinct from de_turno limit 1);
  nuevos   := coalesce((pa.plantones ->> de_turno::text)::smallint, 0) + 1;

  update public.domino_partidas
     set plantones = pa.plantones || jsonb_build_object(de_turno::text, nuevos)
   where id = in_partida;

  -- Tres seguidos: ya no es una interrupción, es que no está. Se cierra por el
  -- que SÍ se quedó — no puede pasarse un cuarto de hora mirando el reloj.
  if nuevos >= umbral then
    update public.domino_partidas
       set estado = 'terminada', ganador = el_otro, motivo_fin = 'abandono', movida_at = now()
     where id = in_partida;
    perform public.domino_premiar(in_partida);
    return true;
  end if;

  -- Si no encaja nada, robar hasta poder (o hasta vaciar el pozo). El tope de
  -- vueltas es un seguro: 28 fichas hay en el juego, más vueltas que eso serían
  -- un fallo, y un bucle infinito aquí colgaría a quien está mirando la mesa.
  select fichas into mano from public.domino_manos where partida_id = in_partida and user_id = de_turno;
  while not public.dom_puede_jugar(mano, pa.izq, pa.der) and guardas < 30 loop
    guardas := guardas + 1;
    exit when not public.dom_robar_una(in_partida, de_turno);
    select fichas into mano from public.domino_manos where partida_id = in_partida and user_id = de_turno;
  end loop;

  elegida := public.dom_mejor_ficha(mano, pa.izq, pa.der);
  if elegida is not null then
    if public.dom_poner(in_partida, de_turno,
                        (elegida->>'a')::smallint, (elegida->>'b')::smallint, elegida->>'lado') then
      accion := 'puso';
    end if;
  end if;

  if accion <> 'puso' then
    -- Nada que poner y sin pozo: pasar es lo único legal. Si ni eso se pudiera,
    -- se cede el turno para que la mesa no se quede clavada.
    if not public.dom_pasar_una(in_partida, de_turno) then
      update public.domino_partidas
         set turno = (pa.turno + 1) % array_length(pa.jugadores, 1), movida_at = now()
       where id = in_partida;
    end if;
  end if;

  update public.domino_partidas
     set ultimo_auto = jsonb_build_object(
           'quien', de_turno, 'accion', accion,
           'ficha', case when accion = 'puso'
                         then jsonb_build_array((elegida->>'a')::int, (elegida->>'b')::int) end)
   where id = in_partida;

  return true;
end $$;

comment on function public.domino_vencer(uuid) is
  'Vencido el turno, JUEGA por quien no está (la ficha más pesada que encaje; '
  'roba si no encaja nada; pasa si no hay pozo) y le anota un plantón. A los '
  '`plantones_para_abandono` seguidos, cierra la mesa por el que sí está.';

-- ── El estado cuenta si se jugó solo ────────────────────────────────────────
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
    return jsonb_build_object('id', pa.id, 'estado', pa.estado, 'mesa', pa.mesa,
      'izq', pa.izq, 'der', pa.der, 'mirando', true, 'ganador', pa.ganador);
  end if;

  select fichas into mi_mano from public.domino_manos where partida_id = in_partida and user_id = yo;
  rival := (select j from unnest(pa.jugadores) j where j is distinct from yo limit 1);
  select jsonb_array_length(fichas) into n_rival from public.domino_manos
   where partida_id = in_partida and user_id = rival;
  select jsonb_array_length(fichas) into n_pozo from public.domino_pozo where partida_id = in_partida;

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
    'rival_color', r_color,
    -- Quién se quedó sin tiempo en la última jugada, y qué se jugó por él.
    'auto', case when pa.ultimo_auto is null then null else
            pa.ultimo_auto || jsonb_build_object('mia', (pa.ultimo_auto->>'quien')::uuid = yo) end,
    -- Para avisar «te queda un plantón» antes de perder la mesa.
    'mis_plantones', coalesce((pa.plantones ->> yo::text)::int, 0),
    'plantones_limite', (select valor from public.domino_ajustes where clave = 'plantones_para_abandono')
  );
end $$;

-- Ni el reloj ni las piezas internas se llaman desde el navegador.
revoke all on function public.dom_poner(uuid, uuid, smallint, smallint, text) from public, anon, authenticated;
revoke all on function public.dom_robar_una(uuid, uuid)  from public, anon, authenticated;
revoke all on function public.dom_pasar_una(uuid, uuid)  from public, anon, authenticated;
revoke all on function public.domino_vencer(uuid)        from public, anon, authenticated;
revoke all on function public.domino_presente(uuid, uuid) from public, anon, authenticated;

grant execute on function public.domino_jugar(uuid, smallint, smallint, text) to authenticated;
grant execute on function public.domino_robar(uuid) to authenticated;
grant execute on function public.domino_pasar(uuid) to authenticated;
grant execute on function public.domino_estado(uuid) to authenticated, anon;

notify pgrst, 'reload schema';
