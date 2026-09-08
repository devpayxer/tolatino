-- 0160_domino_reglas.sql
-- Idempotente. Aplicar: pegar en el SQL Editor de Supabase y darle a Run.
--
-- ════════════════════════════════════════════════════════════════════════════
-- DOMINÓ: las reglas, en el servidor. Sin interfaz todavía, a propósito.
-- ════════════════════════════════════════════════════════════════════════════
-- Se construye el motor ANTES que la pantalla porque aquí es donde equivocarse
-- cuesta: unas reglas mal validadas son un juego que se puede hacer trampa, y
-- eso no se ve en una captura. La interfaz se monta después, encima de algo ya
-- probado.
--
-- ── LAS DOS COSAS QUE DEFINEN ESTE DISEÑO ───────────────────────────────────
--
-- 1. **EL NAVEGADOR NO DECIDE NADA.** Cada jugada se valida aquí: que sea tu
--    turno, que la ficha sea TUYA, y que encaje en el extremo que elegiste. El
--    cliente manda una intención; el servidor dice si vale. Es la lección que
--    ya costó una vez en este proyecto —un comprador podía ponerle el precio a
--    su propio pedido— aplicada antes de que duela.
--
-- 2. **NADIE VE LA MANO DEL OTRO.** Y esto no se resuelve con «que el front no
--    la pinte»: si la fila se puede leer, se puede leer con `curl`. Las manos
--    viven en una tabla **cerrada a cal y canto** (ninguna política de lectura,
--    ni una), y lo único que sale es lo que devuelve `domino_estado()`, que
--    enseña TU mano completa y del rival solo **cuántas fichas le quedan**.
--
-- ── QUÉ VARIANTE ────────────────────────────────────────────────────────────
-- Uno contra uno, doble seis (28 fichas), 7 cada uno y 14 en el pozo. Se
-- eligió 1v1 y no la parejas dominicana —que es la culturalmente correcta—
-- por una razón práctica: parejas necesita juntar CUATRO vecinos, y el primer
-- mes no va a haber cuatro personas conectadas a la vez. Con dos ya se juega.
-- Parejas queda para cuando haya gente; el motor está escrito para que añadirla
-- sea ampliar, no rehacer.
--
-- Sale el que tiene el doble más alto; si nadie tiene dobles, el de la ficha
-- más alta. Quien se queda sin fichas gana. Si se tranca (los dos pasan
-- seguidos y el pozo está vacío), gana quien tenga menos puntos en la mano.

-- ── 1 · las mesas ───────────────────────────────────────────────────────────
create table if not exists public.domino_partidas (
  id            uuid primary key default gen_random_uuid(),
  ciudad        text not null,
  estado        text not null default 'esperando'
                check (estado in ('esperando', 'jugando', 'terminada')),
  jugadores     uuid[] not null default '{}',
  turno         smallint not null default 0,     -- índice dentro de `jugadores`
  mesa          jsonb   not null default '[]',   -- fichas jugadas, en orden
  izq           smallint,                        -- extremo izquierdo abierto
  der           smallint,                        -- extremo derecho abierto
  pases         smallint not null default 0,     -- pases seguidos: 2 = tranque
  ganador       uuid,
  motivo_fin    text check (motivo_fin in ('domino', 'tranque', 'abandono')),
  creada_at     timestamptz not null default now(),
  movida_at     timestamptz not null default now()
);

comment on table public.domino_partidas is
  'Mesas de dominó. La mesa y los extremos son públicos (se ven en la partida); '
  'las manos NO viven aquí — ver domino_manos. Migración 0160.';

create index if not exists domino_abiertas_idx
  on public.domino_partidas (ciudad, creada_at desc)
  where estado = 'esperando';

create index if not exists domino_mias_idx on public.domino_partidas using gin (jugadores);

-- ── 2 · las manos, en su propia tabla y cerrada ─────────────────────────────
-- Separada de la partida a propósito: así la fila de la partida se puede leer
-- sin filtrar nada, y las manos quedan tras una puerta sin cerradura para
-- nadie. Ninguna política de SELECT = ninguna lectura, ni siquiera la tuya.
create table if not exists public.domino_manos (
  partida_id uuid not null references public.domino_partidas(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  fichas     jsonb not null default '[]',   -- [[a,b], …]
  primary key (partida_id, user_id)
);

comment on table public.domino_manos is
  'Las fichas de cada jugador. CERRADA: no tiene ninguna política de lectura, '
  'ni para el dueño. Lo único que sale al navegador es lo que devuelve '
  'domino_estado(), que enseña tu mano y del rival solo el número de fichas.';

-- El pozo, aparte, con la misma cerradura.
create table if not exists public.domino_pozo (
  partida_id uuid primary key references public.domino_partidas(id) on delete cascade,
  fichas     jsonb not null default '[]'
);

-- ── 3 · utilidades de reglas ────────────────────────────────────────────────

/** ¿Encaja la ficha en ese número? */
create or replace function public.dom_encaja(f jsonb, n smallint)
returns boolean language sql immutable as $$
  select n is null or (f->>0)::smallint = n or (f->>1)::smallint = n;
$$;

/** Puntos de una mano (para desempatar un tranque). */
create or replace function public.dom_puntos(fichas jsonb)
returns integer language sql immutable as $$
  select coalesce(sum((f->>0)::int + (f->>1)::int), 0)::int
    from jsonb_array_elements(coalesce(fichas, '[]'::jsonb)) f;
$$;

/** ¿Puede jugar esta mano con estos extremos? */
create or replace function public.dom_puede_jugar(fichas jsonb, izq smallint, der smallint)
returns boolean language sql immutable as $$
  select exists (
    select 1 from jsonb_array_elements(coalesce(fichas, '[]'::jsonb)) f
     where izq is null   -- mesa vacía: vale cualquiera
        or public.dom_encaja(f, izq) or public.dom_encaja(f, der)
  );
$$;

-- ── 4 · crear y unirse ──────────────────────────────────────────────────────

/** Abrir una mesa. Si ya tienes una esperando, se devuelve esa en vez de
 *  abrir otra — si no, cada toque impaciente deja una mesa muerta en el
 *  listado y la sala se llena de mesas fantasma. */
create or replace function public.domino_crear(in_ciudad text)
returns uuid language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare yo uuid := auth.uid(); p uuid;
begin
  if yo is null then raise exception 'Hay que entrar para jugar' using errcode = '42501'; end if;

  select id into p from public.domino_partidas
   where estado = 'esperando' and jugadores[1] = yo limit 1;
  if p is not null then return p; end if;

  insert into public.domino_partidas (ciudad, jugadores)
  values (coalesce(nullif(btrim(in_ciudad), ''), 'Hazleton, PA'), array[yo])
  returning id into p;
  return p;
end $$;

/** Sentarse en una mesa. Cuando se llena, reparte y arranca.
 *
 *  El reparto ocurre AQUÍ, en el servidor, con `random()` de Postgres. Si
 *  barajara el cliente, el que reparte se daría los dobles. */
create or replace function public.domino_unirme(in_partida uuid)
returns boolean language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  yo uuid := auth.uid();
  pa public.domino_partidas;
  todas jsonb; mano1 jsonb; mano2 jsonb; resto jsonb;
  mejor_doble smallint := -1; mejor_ficha smallint := -1; arranca smallint := 0;
  f jsonb;
begin
  if yo is null then raise exception 'Hay que entrar para jugar' using errcode = '42501'; end if;

  select * into pa from public.domino_partidas where id = in_partida for update;
  if pa is null then return false; end if;
  if pa.estado <> 'esperando' then return false; end if;
  if yo = any(pa.jugadores) then return true; end if;   -- ya estabas

  -- Las 28 fichas del doble seis, barajadas por el servidor.
  select jsonb_agg(jsonb_build_array(a, b) order by random())
    into todas
    from generate_series(0, 6) a, generate_series(0, 6) b
   where b >= a;

  mano1 := (select jsonb_agg(v) from (select value v from jsonb_array_elements(todas) with ordinality t(value, i) where i <= 7) s);
  mano2 := (select jsonb_agg(v) from (select value v from jsonb_array_elements(todas) with ordinality t(value, i) where i between 8 and 14) s);
  resto := (select coalesce(jsonb_agg(v), '[]'::jsonb) from (select value v from jsonb_array_elements(todas) with ordinality t(value, i) where i > 14) s);

  -- Quién sale: el doble más alto; si no hay dobles, la ficha más alta.
  for f in select * from jsonb_array_elements(mano1) loop
    if (f->>0)::smallint = (f->>1)::smallint and (f->>0)::smallint > mejor_doble then
      mejor_doble := (f->>0)::smallint; arranca := 0;
    end if;
  end loop;
  for f in select * from jsonb_array_elements(mano2) loop
    if (f->>0)::smallint = (f->>1)::smallint and (f->>0)::smallint > mejor_doble then
      mejor_doble := (f->>0)::smallint; arranca := 1;
    end if;
  end loop;
  if mejor_doble < 0 then
    for f in select * from jsonb_array_elements(mano1) loop
      if ((f->>0)::smallint + (f->>1)::smallint) > mejor_ficha then
        mejor_ficha := ((f->>0)::smallint + (f->>1)::smallint); arranca := 0;
      end if;
    end loop;
    for f in select * from jsonb_array_elements(mano2) loop
      if ((f->>0)::smallint + (f->>1)::smallint) > mejor_ficha then
        mejor_ficha := ((f->>0)::smallint + (f->>1)::smallint); arranca := 1;
      end if;
    end loop;
  end if;

  update public.domino_partidas
     set jugadores = pa.jugadores || yo,
         estado = 'jugando', turno = arranca, movida_at = now()
   where id = in_partida;

  insert into public.domino_manos (partida_id, user_id, fichas)
  values (in_partida, pa.jugadores[1], mano1), (in_partida, yo, mano2)
  on conflict (partida_id, user_id) do update set fichas = excluded.fichas;

  insert into public.domino_pozo (partida_id, fichas) values (in_partida, resto)
  on conflict (partida_id) do update set fichas = excluded.fichas;

  return true;
end $$;

-- ── 5 · jugar ───────────────────────────────────────────────────────────────

/** Poner una ficha. Devuelve false si la jugada no vale — y NO dice por qué al
 *  detalle a propósito: un mensaje que distinga «no es tu turno» de «no tienes
 *  esa ficha» le confirma al que hurga qué tiene el otro. */
create or replace function public.domino_jugar(
  in_partida uuid, in_a smallint, in_b smallint, in_lado text
) returns boolean language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  yo uuid := auth.uid();
  pa public.domino_partidas;
  mano jsonb; nueva jsonb := '[]'::jsonb; f jsonb;
  ficha jsonb; encontrada boolean := false;
  extremo smallint; otro smallint;
begin
  if yo is null then return false; end if;
  select * into pa from public.domino_partidas where id = in_partida for update;
  if pa is null or pa.estado <> 'jugando' then return false; end if;
  -- ¿es tu turno? (`jugadores` es 1-based, `turno` 0-based)
  if pa.jugadores[pa.turno + 1] is distinct from yo then return false; end if;

  select fichas into mano from public.domino_manos where partida_id = in_partida and user_id = yo;
  if mano is null then return false; end if;

  -- ¿es TUYA esa ficha? Se busca en las dos orientaciones y se saca UNA sola
  -- (una mano puede tener [3,5] una vez; quitar todas las coincidencias sería
  -- regalar fichas).
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
    -- Primera ficha de la mesa: abre los dos extremos.
    update public.domino_partidas
       set mesa = jsonb_build_array(jsonb_build_array(in_a, in_b)),
           izq = in_a, der = in_b, pases = 0, movida_at = now(),
           turno = (pa.turno + 1) % array_length(pa.jugadores, 1)
     where id = in_partida;
  else
    extremo := case when in_lado = 'izq' then pa.izq else pa.der end;
    if in_a = extremo then otro := in_b;
    elsif in_b = extremo then otro := in_a;
    else return false;   -- no encaja en ese lado
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

  update public.domino_manos set fichas = nueva where partida_id = in_partida and user_id = yo;

  -- ¿Dominó?
  if jsonb_array_length(nueva) = 0 then
    update public.domino_partidas
       set estado = 'terminada', ganador = yo, motivo_fin = 'domino' where id = in_partida;
    perform public.domino_premiar(in_partida);
  end if;
  return true;
end $$;

/** Robar del pozo. Solo si NO puedes jugar — si no, robarías para esconder
 *  fichas buenas. */
create or replace function public.domino_robar(in_partida uuid)
returns boolean language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  yo uuid := auth.uid(); pa public.domino_partidas;
  mano jsonb; pozo jsonb; ficha jsonb;
begin
  if yo is null then return false; end if;
  select * into pa from public.domino_partidas where id = in_partida for update;
  if pa is null or pa.estado <> 'jugando' then return false; end if;
  if pa.jugadores[pa.turno + 1] is distinct from yo then return false; end if;

  select fichas into mano from public.domino_manos where partida_id = in_partida and user_id = yo;
  if public.dom_puede_jugar(mano, pa.izq, pa.der) then return false; end if;

  select fichas into pozo from public.domino_pozo where partida_id = in_partida for update;
  if pozo is null or jsonb_array_length(pozo) = 0 then return false; end if;

  ficha := pozo->0;
  update public.domino_pozo set fichas = pozo - 0 where partida_id = in_partida;
  update public.domino_manos set fichas = mano || jsonb_build_array(ficha)
   where partida_id = in_partida and user_id = yo;
  update public.domino_partidas set movida_at = now() where id = in_partida;
  return true;
end $$;

/** Pasar. Solo si no puedes jugar Y el pozo está vacío. Dos pases seguidos =
 *  tranque: gana quien tenga menos puntos en la mano. */
create or replace function public.domino_pasar(in_partida uuid)
returns boolean language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  yo uuid := auth.uid(); pa public.domino_partidas;
  mano jsonb; pozo jsonb; p1 int; p2 int; gana uuid;
begin
  if yo is null then return false; end if;
  select * into pa from public.domino_partidas where id = in_partida for update;
  if pa is null or pa.estado <> 'jugando' then return false; end if;
  if pa.jugadores[pa.turno + 1] is distinct from yo then return false; end if;

  select fichas into mano from public.domino_manos where partida_id = in_partida and user_id = yo;
  if public.dom_puede_jugar(mano, pa.izq, pa.der) then return false; end if;
  select fichas into pozo from public.domino_pozo where partida_id = in_partida;
  if pozo is not null and jsonb_array_length(pozo) > 0 then return false; end if;

  if pa.pases + 1 >= array_length(pa.jugadores, 1) then
    -- Tranque. Menos puntos gana; empate → gana quien NO cerró (el otro).
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

-- ── 6 · los puntos de una victoria ──────────────────────────────────────────
insert into public.puntos_tarifa (motivo, puntos, es, en) values
  ('domino_ganada', 25, 'Ganaste una partida de dominó', 'You won a dominoes game')
on conflict (motivo) do update set puntos = excluded.puntos, es = excluded.es, en = excluded.en;

/** Premia al ganador. Con TOPE DIARIO, y aquí está el porqué: los puntos no se
 *  cambian por nada, así que quien haga trampa solo se ensucia el ranking a sí
 *  mismo — pero dos cuentas jugando toda la noche llenarían el top del barrio
 *  de humo, y ese ranking es lo que hace que el juego importe. Diez partidas
 *  premiadas al día es más de lo que juega nadie de verdad. */
create or replace function public.domino_premiar(in_partida uuid)
returns void language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare g uuid; hoy int;
begin
  select ganador into g from public.domino_partidas where id = in_partida;
  if g is null then return; end if;

  select count(*) into hoy from public.puntos_movimientos
   where user_id = g and motivo = 'domino_ganada'
     and created_at >= date_trunc('day', now()) and revocado_at is null;
  if hoy >= 10 then return; end if;

  perform public.puntos_otorgar(g, 'domino_ganada', in_partida, false);
end $$;

-- ── 7 · lo que el navegador puede ver ───────────────────────────────────────

/** El estado de la partida, YA FILTRADO.
 *
 *  Ésta es la pieza que sostiene el secreto: devuelve tu mano entera y del
 *  rival solo cuántas fichas le quedan. Como las tablas de manos no tienen
 *  ninguna política de lectura, no hay otra forma de mirar. */
create or replace function public.domino_estado(in_partida uuid)
returns jsonb language plpgsql stable security definer set search_path = public, extensions, pg_temp as $$
declare
  yo uuid := auth.uid(); pa public.domino_partidas;
  mi_mano jsonb; rival uuid; n_rival int; n_pozo int;
begin
  select * into pa from public.domino_partidas where id = in_partida;
  if pa is null then return null; end if;
  if yo is null or not (yo = any(pa.jugadores)) then
    -- Mirón: ve la mesa, nunca las manos.
    return jsonb_build_object('id', pa.id, 'estado', pa.estado, 'mesa', pa.mesa,
      'izq', pa.izq, 'der', pa.der, 'mirando', true);
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
    'me_toca', pa.jugadores[pa.turno + 1] = yo,
    'puedo_jugar', public.dom_puede_jugar(mi_mano, pa.izq, pa.der),
    'ganador', pa.ganador,
    'motivo_fin', pa.motivo_fin,
    'rival', rival
  );
end $$;

/** Mesas esperando jugador en mi ciudad. */
create or replace function public.domino_abiertas(in_ciudad text, in_limite int default 20)
returns table (id uuid, creador uuid, nombre text, iniciales text, color text, creada_at timestamptz)
language sql stable security definer set search_path = public, extensions, pg_temp as $$
  select p.id, p.jugadores[1], pr.display_name, pr.initials, pr.avatar_color, p.creada_at
    from public.domino_partidas p
    left join public.profiles pr on pr.id = p.jugadores[1]
   where p.estado = 'esperando' and p.ciudad = in_ciudad
     and p.jugadores[1] is distinct from auth.uid()
     -- Una mesa abierta hace tres horas es una mesa que nadie va a atender.
     and p.creada_at > now() - interval '2 hours'
   order by p.creada_at desc
   limit least(coalesce(in_limite, 20), 50);
$$;

-- ── 8 · permisos ────────────────────────────────────────────────────────────
alter table public.domino_partidas enable row level security;
alter table public.domino_manos    enable row level security;
alter table public.domino_pozo     enable row level security;

-- La partida se puede LEER (la mesa es pública mientras se juega); nunca escribir.
drop policy if exists domino_partidas_lectura on public.domino_partidas;
create policy domino_partidas_lectura on public.domino_partidas
  for select to anon, authenticated using (true);

revoke insert, update, delete on public.domino_partidas from anon, authenticated;

-- LAS MANOS Y EL POZO: ni una política. Nadie lee, nadie escribe. Solo las
-- funciones, que corren como dueñas. Esto es lo que hace imposible espiar.
revoke all on table public.domino_manos from anon, authenticated;
revoke all on table public.domino_pozo  from anon, authenticated;

revoke all on function public.domino_premiar(uuid) from public, anon, authenticated;

grant execute on function public.domino_crear(text)                                  to authenticated;
grant execute on function public.domino_unirme(uuid)                                 to authenticated;
grant execute on function public.domino_jugar(uuid, smallint, smallint, text)        to authenticated;
grant execute on function public.domino_robar(uuid)                                  to authenticated;
grant execute on function public.domino_pasar(uuid)                                  to authenticated;
grant execute on function public.domino_estado(uuid)                                 to anon, authenticated;
grant execute on function public.domino_abiertas(text, int)                          to authenticated;

notify pgrst, 'reload schema';
