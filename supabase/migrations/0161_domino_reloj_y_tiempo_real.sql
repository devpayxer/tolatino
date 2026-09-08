-- 0161_domino_reloj_y_tiempo_real.sql
-- Idempotente. Aplicar: pegar en el SQL Editor de Supabase y darle a Run.
--
-- ════════════════════════════════════════════════════════════════════════════
-- EL RELOJ DE 60 SEGUNDOS, Y QUE LA JUGADA DEL RIVAL LLEGUE SOLA.
-- ════════════════════════════════════════════════════════════════════════════
-- Decisión del fundador (2026-09-08): 60 segundos por jugada; quien deja pasar
-- el tiempo DOS turnos seguidos pierde por abandono.
--
-- POR QUÉ EL RELOJ VIVE AQUÍ Y NO EN EL NAVEGADOR: un reloj de cliente se para
-- cerrando la pestaña. Si el tiempo lo contara el móvil, bastaría con quitar la
-- app para dejar la mesa congelada y al rival esperando para siempre. Aquí el
-- plazo es `movida_at + 60s` y lo comprueba el servidor: da igual lo que haga
-- el teléfono del otro.
--
-- Y NO HACE FALTA `pg_cron`. En vez de un trabajo que barra las mesas cada
-- minuto —que en producción ni siquiera existe todavía—, el vencimiento se
-- aplica CUANDO ALGUIEN MIRA. Quien está esperando consulta el estado cada pocos
-- segundos, así que el turno caduca solo, exactamente cuando a alguien le
-- importa. Una mesa que nadie mira no necesita que la barran.

alter table public.domino_partidas
  add column if not exists plantones jsonb not null default '{}';

comment on column public.domino_partidas.plantones is
  'Cuántas veces se le ha ido el tiempo a cada jugador EN ESTA PARTIDA, por id. '
  'A la segunda, pierde por abandono. Jugar de verdad devuelve TU cuenta a cero.';

-- Nota para quien lea el historial: la primera versión contaba plantones
-- SEGUIDOS y no se disparaba nunca. Se probó y salió: si uno se va, el rival
-- juega en medio y el contador se reiniciaba, así que la mesa se habría quedado
-- colgada igual. Se cuenta por JUGADOR, no por racha.

-- Segundos por jugada. En tabla y no en el código, para poder subirlo si el
-- primer mes dice que 60 es poco para alguien que juega desde el bus.
create table if not exists public.domino_ajustes (
  clave text primary key,
  valor integer not null
);
insert into public.domino_ajustes (clave, valor) values ('segundos_por_jugada', 60)
on conflict (clave) do nothing;

/** Aplica el vencimiento del turno si toca. Devuelve true si cambió algo.
 *
 *  Se llama desde `domino_estado`, que es lo que consulta el que espera. */
create or replace function public.domino_vencer(in_partida uuid)
returns boolean language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  pa public.domino_partidas; segs int; de_turno uuid; el_otro uuid; nuevos smallint;
begin
  select * into pa from public.domino_partidas where id = in_partida for update;
  if pa is null or pa.estado <> 'jugando' then return false; end if;

  select valor into segs from public.domino_ajustes where clave = 'segundos_por_jugada';
  segs := coalesce(segs, 60);
  if now() < pa.movida_at + make_interval(secs => segs) then return false; end if;

  de_turno := pa.jugadores[pa.turno + 1];
  el_otro  := (select j from unnest(pa.jugadores) j where j is distinct from de_turno limit 1);
  nuevos   := coalesce((pa.plantones ->> de_turno::text)::smallint, 0) + 1;

  if nuevos >= 2 then
    -- Segunda vez que no aparece: la mesa no se queda colgada para siempre.
    update public.domino_partidas
       set estado = 'terminada', ganador = el_otro, motivo_fin = 'abandono',
           plantones = pa.plantones || jsonb_build_object(de_turno::text, nuevos),
           movida_at = now()
     where id = in_partida;
    perform public.domino_premiar(in_partida);
  else
    -- Primera: se le pasa el turno y la partida sigue. Todo el mundo pierde
    -- una conexión alguna vez.
    update public.domino_partidas
       set turno = (pa.turno + 1) % array_length(pa.jugadores, 1),
           plantones = pa.plantones || jsonb_build_object(de_turno::text, nuevos),
           movida_at = now()
     where id = in_partida;
  end if;
  return true;
end $$;

-- Cualquier acción real borra el historial de plantones: quien vuelve, vuelve.
create or replace function public.domino_presente(in_partida uuid, in_quien uuid)
returns void language sql security definer set search_path = public, extensions, pg_temp as $$
  update public.domino_partidas set plantones = plantones - in_quien::text
   where id = in_partida;
$$;

-- ── `domino_estado` pasa a aplicar el vencimiento ───────────────────────────
-- DEJA DE SER `stable` a propósito: ahora puede escribir (caducar un turno).
-- Es el sitio correcto porque es justo lo que consulta quien está esperando —
-- el turno caduca cuando a alguien le importa que caduque.
create or replace function public.domino_estado(in_partida uuid)
returns jsonb language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  yo uuid := auth.uid(); pa public.domino_partidas;
  mi_mano jsonb; rival uuid; n_rival int; n_pozo int; segs int; quedan int;
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
    'rival', rival
  );
end $$;

-- Las tres acciones marcan presencia: el que juega, roba o pasa está ahí.
create or replace function public.domino_jugar(
  in_partida uuid, in_a smallint, in_b smallint, in_lado text
) returns boolean language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  yo uuid := auth.uid(); pa public.domino_partidas;
  mano jsonb; nueva jsonb := '[]'::jsonb; f jsonb; ficha jsonb;
  encontrada boolean := false; extremo smallint; otro smallint;
begin
  if yo is null then return false; end if;
  perform public.domino_vencer(in_partida);

  select * into pa from public.domino_partidas where id = in_partida for update;
  if pa is null or pa.estado <> 'jugando' then return false; end if;
  if pa.jugadores[pa.turno + 1] is distinct from yo then return false; end if;

  select fichas into mano from public.domino_manos where partida_id = in_partida and user_id = yo;
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
           plantones = pa.plantones - yo::text,
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
           pases = 0, movida_at = now(), plantones = pa.plantones - yo::text,
           turno = (pa.turno + 1) % array_length(pa.jugadores, 1)
     where id = in_partida;
  end if;

  update public.domino_manos set fichas = nueva where partida_id = in_partida and user_id = yo;

  if jsonb_array_length(nueva) = 0 then
    update public.domino_partidas
       set estado = 'terminada', ganador = yo, motivo_fin = 'domino' where id = in_partida;
    perform public.domino_premiar(in_partida);
  end if;
  return true;
end $$;

-- ── Emparejar: un solo botón ────────────────────────────────────────────────
/** «Jugar». Se sienta en la primera mesa que esté esperando en tu ciudad; si no
 *  hay ninguna, abre una y espera.
 *
 *  Un botón y no dos («crear» / «unirse») porque nadie quiere elegir eso: se
 *  quiere jugar. Y si dos personas lo tocan a la vez, el `for update` de
 *  `domino_unirme` decide quién se sienta — la otra abre su propia mesa. */
create or replace function public.domino_jugar_ya(in_ciudad text)
returns uuid language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare yo uuid := auth.uid(); p uuid;
begin
  if yo is null then raise exception 'Hay que entrar para jugar' using errcode = '42501'; end if;

  -- ¿Ya estoy en una partida viva? Se vuelve a ella en vez de abrir otra.
  select id into p from public.domino_partidas
   where estado in ('esperando', 'jugando') and yo = any(jugadores)
   order by movida_at desc limit 1;
  if p is not null then return p; end if;

  for p in
    select id from public.domino_partidas
     where estado = 'esperando' and ciudad = in_ciudad
       and jugadores[1] is distinct from yo
       and creada_at > now() - interval '2 hours'
     order by creada_at asc
  loop
    if public.domino_unirme(p) then return p; end if;
  end loop;

  return public.domino_crear(in_ciudad);
end $$;

grant execute on function public.domino_jugar_ya(text) to authenticated;
revoke all on function public.domino_vencer(uuid)    from public, anon, authenticated;
revoke all on function public.domino_presente(uuid, uuid) from public, anon, authenticated;

-- ── Tiempo real: que la jugada del rival llegue sola ────────────────────────
-- Se publica SOLO `domino_partidas`. Las manos no se publican jamás — si
-- viajaran por el canal, el secreto se acabaría ahí. El navegador recibe «algo
-- cambió en la mesa» y vuelve a pedir `domino_estado`, que es quien filtra.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'domino_partidas'
  ) then
    execute 'alter publication supabase_realtime add table public.domino_partidas';
  end if;
end $$;

notify pgrst, 'reload schema';
