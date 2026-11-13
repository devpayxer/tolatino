-- 0133 · Fase 9 · 9b-3 · La escala (docs/diseno/plan/fase9-apertura.md §2 «0133 escala», §4 9b).
-- · rate_counters (UNLOGGED): el contador compartido entre procesos para los topes que vivían en la memoria de cada proceso de la app
--   (errores por minuto, Wallet por dirección, los corta-circuitos del traductor y de la moderación de fotos). Si la base se cae, se pierden:
--   es lo que se quiere de un contador por minuto (no es un registro). La clave nunca es el dato (dirección, teléfono): es su huella.
--   tope_sumar() suma y devuelve la cuenta de la ventana en una sola sentencia (atómica entre procesos); corte_estado() y corte_resultado()
--   llevan un corta-circuito (cerrado · abierto · una prueba a la vez). El barrido purga las ventanas viejas (topes_purgar).
-- · Configuración e interruptores al instante en todos los procesos: platform_config, config_keys, feature_flags, cities, mod_rules, mod_terms y
--   synonyms avisan por NOTIFY (canal tl_config) y cada proceso olvida su copia (lib/cambios-config.ts). La copia con hora (15 a 60 s) queda solo
--   como respaldo si la escucha se corta.
-- · app_events PARTICIONADA POR MES (por `at`): la tabla nueva se crea, se copia, se cambia el nombre y se rehacen las vistas que la leen, en esta
--   misma transacción (en el sandbox son pocas filas; producción se enciende vacía). BRIN por fecha en cada partición; una partición por omisión
--   (app_events_otros) recibe lo que llegue fuera de los meses creados y app_events_mes() lo mueve a su mes. Sigue siendo solo de inserción.
-- · app_events_dia: el resumen por día, ciudad, nombre, app y plataforma (eventos y personas distintas de ese día). Derivado: lo rehace el barrido
--   (hoy y ayer, cada 15 min como mucho) y nadie lo edita.
-- · eventos_retener_meses (Configuración › Apps, 13 como dice el inventario de datos a las tiendas): pasado ese tiempo el barrido resume el mes y
--   suelta su partición. Después solo quedan las cifras (app_events_dia).
-- · search_vocab_refreshed_at (platform_config): el vocabulario de «¿Quisiste decir…?» se refresca cada hora en el barrido (y en cada despliegue,
--   como antes), sin bloquear a quien busca (CONCURRENTLY).
-- · com_analitica_dia_cache: Analítica › Comunidad lee un derivado por ciudad y día (com_analitica_resumir) en vez de la vista que agregaba toda la
--   historia en cada vista; el barrido lo rehace cada 10 min para los últimos 40 días. Índice de la primera respuesta por publicación.
-- · jit = off en la base (consultas cortas; el JIT sumaba ~100 ms a consultas de 5 ms con costos mal estimados).
-- Idempotente: se puede aplicar dos veces. Nada de lo que es de una persona se borra.
begin;

-- ── Sin JIT: la compilación JIT de Postgres se dispara con planes de costo alto (estimaciones de miles de filas que en verdad son pocas) y le
--    sumaba ~100 ms a consultas de 5 ms (la cuenta de la lista de Eventos en la carga de 9b-3). Para una app de consultas cortas no paga nunca.
--    Vale para las conexiones nuevas de esta base. ──
do $$ begin execute format('alter database %I set jit = off', current_database()); end $$;

-- ── Contador compartido ──
create unlogged table if not exists rate_counters (
  scope        text not null check (scope ~ '^[a-z0-9_.:]{1,40}$'),
  key_hash     text not null check (char_length(key_hash) between 1 and 64),
  window_start timestamptz not null,
  n            integer not null default 0 check (n >= 0),
  primary key (scope, key_hash, window_start)
);
-- Un solo corte abierto por nombre (dos procesos que abren a la vez no hacen dos).
create unique index if not exists rate_counters_corte_uno on rate_counters (scope, key_hash) where scope in ('corte', 'corte_fallas');
create index if not exists rate_counters_purga on rate_counters (window_start);

-- Suma p_n a la ventana actual (p_ventana_s segundos, alineada) y devuelve la cuenta. Una sola sentencia: dos procesos nunca leen lo mismo.
create or replace function tope_sumar(p_scope text, p_key text, p_ventana_s integer, p_n integer default 1) returns integer language sql as $$
  insert into rate_counters as r (scope, key_hash, window_start, n)
  values (p_scope, p_key, to_timestamp(floor(extract(epoch from clock_timestamp()) / greatest(p_ventana_s, 1)) * greatest(p_ventana_s, 1)), greatest(p_n, 0))
  on conflict (scope, key_hash, window_start) do update set n = r.n + excluded.n
  returning n
$$;
-- La cuenta de la ventana actual sin sumar.
create or replace function tope_cuenta(p_scope text, p_key text, p_ventana_s integer) returns integer language sql stable as $$
  select coalesce((select n from rate_counters where scope = p_scope and key_hash = p_key
                    and window_start = to_timestamp(floor(extract(epoch from clock_timestamp()) / greatest(p_ventana_s, 1)) * greatest(p_ventana_s, 1))), 0)
$$;
-- Lo sumado en las últimas p_horas (las ventanas que el barrido todavía no purgó).
create or replace function tope_suma(p_scope text, p_key text, p_horas integer) returns integer language sql stable as $$
  select coalesce(sum(n), 0)::integer from rate_counters where scope = p_scope and key_hash = p_key and window_start > clock_timestamp() - make_interval(hours => p_horas)
$$;

-- Corta-circuito compartido: 'cerrado' (se llama), 'abierto' (no se llama) o 'prueba' (pasó el corte: ESTE proceso prueba una vez; los demás
-- siguen viendo 'abierto' mientras tanto, porque tomar la prueba vuelve a poner la hora del corte).
create or replace function corte_estado(p_nombre text, p_corte_s integer) returns text language plpgsql as $$
declare t timestamptz;
begin
  select window_start into t from rate_counters where scope = 'corte' and key_hash = p_nombre;
  if not found then return 'cerrado'; end if;
  if t > clock_timestamp() - make_interval(secs => p_corte_s) then return 'abierto'; end if;
  update rate_counters set window_start = clock_timestamp() where scope = 'corte' and key_hash = p_nombre and window_start = t;
  return case when found then 'prueba' else 'abierto' end;
end $$;
-- Lo que pasó al llamar: bien cierra el corte; mal suma una falla seguida y, a las p_fallas, abre el corte (o, si era la prueba, otro corte entero).
create or replace function corte_resultado(p_nombre text, p_ok boolean, p_fallas integer) returns text language plpgsql as $$
declare k integer;
begin
  if p_ok then
    delete from rate_counters where scope in ('corte', 'corte_fallas') and key_hash = p_nombre;
    return 'cerrado';
  end if;
  update rate_counters set window_start = clock_timestamp() where scope = 'corte' and key_hash = p_nombre;
  if found then return 'abierto'; end if;
  insert into rate_counters as r (scope, key_hash, window_start, n) values ('corte_fallas', p_nombre, 'epoch', 1)
  on conflict (scope, key_hash) where scope in ('corte', 'corte_fallas') do update set n = r.n + 1 returning r.n into k;
  if k >= greatest(p_fallas, 1) then
    insert into rate_counters (scope, key_hash, window_start, n) values ('corte', p_nombre, clock_timestamp(), 1) on conflict do nothing;
    delete from rate_counters where scope = 'corte_fallas' and key_hash = p_nombre;
    return 'abierto';
  end if;
  return 'cerrado';
end $$;

-- ── Configuración e interruptores: cada cambio avisa a todos los procesos ──
create or replace function config_avisar() returns trigger language plpgsql as $$
begin
  perform pg_notify('tl_config', tg_table_name);
  return null;
end $$;
drop trigger if exists platform_config_avisa on platform_config;
create trigger platform_config_avisa after insert or update or delete on platform_config for each statement execute function config_avisar();
drop trigger if exists feature_flags_avisa on feature_flags;
create trigger feature_flags_avisa after insert or update or delete on feature_flags for each statement execute function config_avisar();
drop trigger if exists config_keys_avisa on config_keys;
create trigger config_keys_avisa after insert or update or delete on config_keys for each statement execute function config_avisar();
-- Lo demás que cada proceso guarda en memoria y el Super Admin cambia: ciudades (abrir, pausar), reglas y términos de moderación, sinónimos.
drop trigger if exists cities_avisa on cities;
create trigger cities_avisa after insert or update or delete on cities for each statement execute function config_avisar();
drop trigger if exists mod_rules_avisa on mod_rules;
create trigger mod_rules_avisa after insert or update or delete on mod_rules for each statement execute function config_avisar();
drop trigger if exists mod_terms_avisa on mod_terms;
create trigger mod_terms_avisa after insert or update or delete on mod_terms for each statement execute function config_avisar();
drop trigger if exists synonyms_avisa on synonyms;
create trigger synonyms_avisa after insert or update or delete on synonyms for each statement execute function config_avisar();

-- ── Configuración › Apps: cuánto se guardan los eventos de la analítica ──
insert into config_keys (key, min, max, def, unit, section, label, help, editable, bloqueo, edit_in, sort) values
  ('eventos_retener_meses', 1, 36, 13, '{"es":"meses","en":"months"}', 'apps', '{"es":"Analítica · meses que se guarda cada evento","en":"Analytics · months each event is kept"}',
    '{"es":"Pasado este tiempo, el barrido resume el mes por día y ciudad y suelta los eventos uno por uno. Las tiendas dicen 13 meses: si lo cambias, cambia también el inventario de datos.","en":"After this time, the sweep summarizes the month by day and city and drops the individual events. The stores say 13 months: if you change it, change the data inventory too."}',
    true, null, null, 347)
on conflict (key) do update set min = excluded.min, max = excluded.max, def = excluded.def, unit = excluded.unit, section = excluded.section,
  label = excluded.label, help = excluded.help, editable = excluded.editable, bloqueo = excluded.bloqueo, edit_in = excluded.edit_in, sort = excluded.sort;

-- ── app_events particionada por mes ──
do $$
declare
  ya boolean := (select c.relkind = 'p' from pg_class c where c.oid = 'app_events'::regclass);
  vistas text[][] := '{}';
  v record;
  chk record;
  d date;
  hasta date;
  n_antes bigint;
  n_despues bigint;
begin
  if ya then return; end if;
  lock table app_events in access exclusive mode;

  create table app_events_nueva (
    id      bigint generated always as identity,
    at      timestamptz not null default now(),
    day     date not null default (now() at time zone 'America/New_York')::date,
    city_id text references cities (id),
    user_id uuid references users (id),
    device  uuid,
    name    text not null,
    ref     text check (char_length(ref) <= 120),
    props   jsonb not null default '{}'::jsonb check (pg_column_size(props) <= 2000),
    app     text check (app in ('cliente', 'negocio', 'delivery', 'checkin')),
    plat    text check (plat in ('ios', 'android')),
    primary key (id, at)
  ) partition by range (at);
  -- La lista cerrada de nombres, la misma que tenía la tabla (las migraciones que la amplían la vuelven a escribir con este nombre).
  for chk in select conname, pg_get_constraintdef(oid) as def from pg_constraint where conrelid = 'app_events'::regclass and conname = 'app_events_name_check' loop
    execute format('alter table app_events_nueva add constraint app_events_nueva_name_check %s', chk.def);
  end loop;
  create table app_events_nueva_otros partition of app_events_nueva default;

  -- Un mes por partición, desde el primer evento hasta dos meses adelante.
  d := date_trunc('month', coalesce((select min(at) from app_events), now()) at time zone 'UTC')::date;
  while d <= (date_trunc('month', now() at time zone 'UTC') + interval '2 months')::date loop
    hasta := (d + interval '1 month')::date;
    execute format('create table %I partition of app_events_nueva for values from (%L) to (%L)', 'app_events_' || to_char(d, 'YYYY_MM'),
                   d::timestamp at time zone 'UTC', hasta::timestamp at time zone 'UTC');
    d := hasta;
  end loop;

  -- Las vistas que leen app_events se rehacen igual sobre la tabla nueva.
  for v in select distinct c.oid, n.nspname, c.relname from pg_depend dp join pg_rewrite r on r.oid = dp.objid join pg_class c on c.oid = r.ev_class
                join pg_namespace n on n.oid = c.relnamespace where dp.refobjid = 'app_events'::regclass and c.oid <> 'app_events'::regclass loop
    vistas := vistas || array[[format('%I.%I', v.nspname, v.relname), pg_get_viewdef(v.oid)]];
    execute format('drop view %I.%I', v.nspname, v.relname);
  end loop;

  select count(*) into n_antes from app_events;
  insert into app_events_nueva (id, at, day, city_id, user_id, device, name, ref, props, app, plat) overriding system value
    select id, at, day, city_id, user_id, device, name, ref, props, app, plat from app_events;
  select count(*) into n_despues from app_events_nueva;
  if n_antes <> n_despues then raise exception 'app_events: se copiaron % de % filas', n_despues, n_antes; end if;
  perform setval(pg_get_serial_sequence('app_events_nueva', 'id'), greatest((select max(id) from app_events), 1), (select max(id) from app_events) is not null);

  -- La tabla vieja ya está copiada entera (contada arriba): se suelta y la nueva toma su nombre.
  drop table app_events;
  alter table app_events_nueva rename to app_events;
  alter table app_events_nueva_otros rename to app_events_otros;
  alter table app_events rename constraint app_events_nueva_name_check to app_events_name_check;
  alter table app_events rename constraint app_events_nueva_pkey to app_events_pkey;
  alter sequence app_events_nueva_id_seq rename to app_events_id_seq;

  for i in 1 .. coalesce(array_length(vistas, 1), 0) loop
    execute format('create view %s as %s', vistas[i][1], vistas[i][2]);
  end loop;
end $$;

-- Índices en la tabla madre (cada partición recibe el suyo, también las que se creen después).
create index if not exists app_events_at_brin on app_events using brin (at);
create index if not exists app_events_nombre_idx on app_events (name, day);
create index if not exists app_events_user_idx on app_events (user_id, day) where user_id is not null;
create index if not exists app_events_ver_evento_idx on app_events (at) where name = 'ver_evento';
-- Solo inserción, también en cada partición (el disparador de la madre se clona en ellas).
drop trigger if exists app_events_no_cambia on app_events;
create trigger app_events_no_cambia before update on app_events for each row execute function app_events_inmutable();

-- El mes de una fecha: lo crea si no está y mueve a él lo que hubiera caído en la partición por omisión.
create or replace function app_events_mes(p date) returns text language plpgsql as $$
declare
  d date := date_trunc('month', p)::date;
  hasta date := (date_trunc('month', p) + interval '1 month')::date;
  a timestamptz := d::timestamp at time zone 'UTC';
  z timestamptz := hasta::timestamp at time zone 'UTC';
  nom text := 'app_events_' || to_char(d, 'YYYY_MM');
begin
  if to_regclass(nom) is not null then return nom; end if;
  if exists (select 1 from app_events_otros where at >= a and at < z) then
    execute format('create table %I (like app_events including defaults including constraints)', nom);
    execute format('insert into %I select * from app_events_otros where at >= $1 and at < $2', nom) using a, z;
    delete from app_events_otros where at >= a and at < z;
    execute format('alter table app_events attach partition %I for values from (%L) to (%L)', nom, a, z);
  else
    execute format('create table %I partition of app_events for values from (%L) to (%L)', nom, a, z);
  end if;
  return nom;
end $$;

-- ── El resumen por día ──
create table if not exists app_events_dia (
  day          date not null,
  city_id      text references cities (id),
  name         text not null,
  app          text,
  plat         text,
  n            integer not null check (n >= 0),
  quienes      integer not null check (quienes >= 0),
  refreshed_at timestamptz not null default now()
);
create unique index if not exists app_events_dia_uno on app_events_dia (day, coalesce(city_id, ''), name, coalesce(app, ''), coalesce(plat, ''));
create index if not exists app_events_dia_nombre on app_events_dia (name, day);

-- Rehace los días [desde, hasta] (derivado: se reemplaza entero, nunca se edita a mano). Lee solo las particiones de esas fechas.
create or replace function app_events_resumir(desde date, hasta date) returns integer language plpgsql as $$
declare n integer;
begin
  delete from app_events_dia where day between desde and hasta;
  with x as (
    insert into app_events_dia (day, city_id, name, app, plat, n, quienes)
    select day, city_id, name, app, plat, count(*)::int, count(distinct coalesce(user_id::text, device::text))::int
      from app_events
     where at >= (desde - 1)::timestamp at time zone 'UTC' and at < (hasta + 2)::timestamp at time zone 'UTC' and day between desde and hasta
     group by 1, 2, 3, 4, 5
    returning 1)
  select count(*) into n from x;
  return n;
end $$;

-- Lo que hace el barrido: los meses de ahora y los dos siguientes; el resumen de ayer y hoy (cada 15 min como mucho); los meses que pasaron
-- eventos_retener_meses se resumen enteros y su partición se suelta. Devuelve cuántas particiones soltó.
create or replace function app_events_al_dia() returns integer language plpgsql as $$
declare
  hoy date := (now() at time zone 'America/New_York')::date;
  corte date := (date_trunc('month', now() at time zone 'UTC') - make_interval(months => cfg_int('eventos_retener_meses')))::date;
  p record;
  sueltas integer := 0;
  desde date;
  hasta date;
begin
  perform app_events_mes((now() at time zone 'UTC')::date);
  perform app_events_mes((now() at time zone 'UTC' + interval '1 month')::date);
  perform app_events_mes((now() at time zone 'UTC' + interval '2 months')::date);
  if not exists (select 1 from app_events_dia where day = hoy and refreshed_at > now() - interval '15 minutes')
     or not exists (select 1 from app_events_dia where day = hoy - 1 and refreshed_at > (hoy::timestamp at time zone 'America/New_York') + interval '10 minutes') then
    perform app_events_resumir(hoy - 1, hoy);
  end if;
  -- Del más viejo al más nuevo: el último día (Nueva York) de un mes termina en la partición siguiente, que todavía está; el día anterior al
  -- primero ya se resumió cuando se soltó el mes de antes.
  for p in select c.relname, to_date(substr(c.relname, 12), 'YYYY_MM') as mes from pg_inherits i join pg_class c on c.oid = i.inhrelid
            where i.inhparent = 'app_events'::regclass and c.relname ~ '^app_events_\d{4}_\d{2}$' order by 2 loop
    if (p.mes + interval '1 month')::date <= corte then
      desde := p.mes; hasta := (p.mes + interval '1 month')::date - 1;
      perform app_events_resumir(desde, hasta);
      execute format('alter table app_events detach partition %I', p.relname);
      execute format('drop table %I', p.relname);
      sueltas := sueltas + 1;
    end if;
  end loop;
  return sueltas;
end $$;

-- ── Analítica › Comunidad: el derivado por ciudad y día (la vista de 0105 agregaba TODA la historia en cada vista: 7 s con 5 mil publicaciones
--    en la carga de 9b-3; con 1 M no termina). La misma lógica, solo desde un día; la rehace el barrido cada 10 min para los últimos 40 días
--    (lo de antes ya no cambia: una pregunta que se resuelve después de 40 días no mueve su día). Sin personas (guardián analiticaSinPersonas). ──
-- La primera respuesta de cada publicación (la vista la busca por publicación): índice por publicación y hora.
create index if not exists com_comments_post_hora_idx on com_comments (post_id, created_at) where status <> 'deleted';
create table if not exists com_analitica_dia_cache (
  city_id text not null references cities (id),
  dia date not null,
  publicaciones integer not null, preguntas integer not null, resueltas integer not null, con_respuesta integer not null, min_primera numeric not null,
  comentarios integer not null, reportes integer not null, apelaciones_levantadas integer not null, apelaciones_decididas integer not null,
  monedas_emitidas integer not null, monedas_canjeadas integer not null, monedas_devueltas integer not null, canjes integer not null, canjes_usados integer not null,
  refreshed_at timestamptz not null default now(),
  primary key (city_id, dia)
);
create or replace function com_analitica_resumir(desde date) returns integer language plpgsql as $$
declare n integer; t0 timestamptz := (desde - 1)::timestamp at time zone 'UTC';
begin
  delete from com_analitica_dia_cache where dia >= desde;
  with p as (
    select x.city_id, (x.created_at at time zone ci.timezone)::date as dia, count(*) as publicaciones, count(*) filter (where x.kind = 'pregunta') as preguntas,
           count(*) filter (where x.kind = 'pregunta' and x.solved_at is not null) as resueltas,
           count(*) filter (where x.kind = 'pregunta' and r.primera is not null) as con_respuesta,
           coalesce(sum(extract(epoch from r.primera - x.created_at) / 60) filter (where x.kind = 'pregunta'), 0) as min_primera
      from com_posts x join cities ci on ci.id = x.city_id
      left join lateral (select min(c.created_at) as primera from com_comments c where c.post_id = x.id and c.status <> 'deleted' and c.author_user_id is distinct from x.author_user_id) r on true
     where x.status <> 'deleted' and x.author_kind = 'user' and x.created_at >= t0 group by 1, 2),
  c as (select x.city_id, (x.created_at at time zone ci.timezone)::date as dia, count(*) as comentarios
          from com_comments x join cities ci on ci.id = x.city_id where x.status <> 'deleted' and x.created_at >= t0 group by 1, 2),
  r as (select x.city_id, (x.created_at at time zone ci.timezone)::date as dia, count(*) as reportes
          from content_reports x join cities ci on ci.id = x.city_id where x.target_kind in ('com_post', 'com_comment') and x.created_at >= t0 group by 1, 2),
  a as (select x.city_id, (x.decided_at at time zone ci.timezone)::date as dia, count(*) filter (where x.status = 'lifted') as levantadas, count(*) as decididas
          from appeals x join cities ci on ci.id = x.city_id where x.status <> 'open' and x.decided_at >= t0 group by 1, 2),
  m as (select x.city_id, (x.created_at at time zone ci.timezone)::date as dia,
               coalesce(sum(x.delta) filter (where x.reason_key in ('welcome', 'premio_mes')), 0) as monedas_emitidas,
               coalesce(-sum(x.delta) filter (where x.reason_key = 'canje'), 0) as monedas_canjeadas,
               coalesce(sum(x.delta) filter (where x.reason_key = 'devolucion'), 0) as monedas_devueltas
          from coin_entries x join cities ci on ci.id = x.city_id where x.created_at >= t0 group by 1, 2),
  k as (select x.city_id, (x.created_at at time zone ci.timezone)::date as dia, count(*) as canjes, count(*) filter (where x.status = 'used') as usados
          from coupon_redemptions x join cities ci on ci.id = x.city_id where x.created_at >= t0 group by 1, 2),
  d as (select city_id, dia from p union select city_id, dia from c union select city_id, dia from r union select city_id, dia from a
        union select city_id, dia from m union select city_id, dia from k),
  ins as (
    insert into com_analitica_dia_cache (city_id, dia, publicaciones, preguntas, resueltas, con_respuesta, min_primera, comentarios, reportes, apelaciones_levantadas,
                                         apelaciones_decididas, monedas_emitidas, monedas_canjeadas, monedas_devueltas, canjes, canjes_usados)
    select d.city_id, d.dia,
           coalesce(p.publicaciones, 0)::int, coalesce(p.preguntas, 0)::int, coalesce(p.resueltas, 0)::int, coalesce(p.con_respuesta, 0)::int, coalesce(p.min_primera, 0)::numeric,
           coalesce(c.comentarios, 0)::int, coalesce(r.reportes, 0)::int, coalesce(a.levantadas, 0)::int, coalesce(a.decididas, 0)::int,
           coalesce(m.monedas_emitidas, 0)::int, coalesce(m.monedas_canjeadas, 0)::int, coalesce(m.monedas_devueltas, 0)::int, coalesce(k.canjes, 0)::int, coalesce(k.usados, 0)::int
      from d left join p using (city_id, dia) left join c using (city_id, dia) left join r using (city_id, dia) left join a using (city_id, dia)
      left join m using (city_id, dia) left join k using (city_id, dia)
     where d.dia >= desde
    returning 1)
  select count(*) into n from ins;
  return n;
end $$;
-- El barrido: los últimos 40 días cada 10 minutos; la primera vez (tabla vacía), toda la historia.
create or replace function com_analitica_al_dia() returns integer language plpgsql as $$
begin
  if not exists (select 1 from com_analitica_dia_cache) then return com_analitica_resumir('2000-01-01'); end if;
  if exists (select 1 from com_analitica_dia_cache where refreshed_at > now() - interval '10 minutes') then return 0; end if;
  return com_analitica_resumir((now() at time zone 'America/New_York')::date - 40);
end $$;
select com_analitica_resumir('2000-01-01');

-- ── El vocabulario de búsqueda: se refresca sin bloquear y se anota cuándo ──
create or replace function refrescar_busqueda() returns void language plpgsql as $$
begin
  if (select ispopulated from pg_matviews where matviewname = 'search_vocab') then
    refresh materialized view concurrently search_vocab;
  else
    refresh materialized view search_vocab;
  end if;
  insert into platform_config (key, value, note, updated_by) values ('search_vocab_refreshed_at', to_jsonb(now()), 'El vocabulario de búsqueda se refrescó (barrido o despliegue).', 'sistema')
  on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = 'sistema';
end $$;
-- La hora: si pasó una hora desde el último refresco, otro. Devuelve true si refrescó.
create or replace function buscar_al_dia() returns boolean language plpgsql as $$
declare t timestamptz;
begin
  begin
    t := (select (value #>> '{}')::timestamptz from platform_config where key = 'search_vocab_refreshed_at');
  exception when others then t := null;
  end;
  if t is not null and t > now() - interval '1 hour' then return false; end if;
  perform refrescar_busqueda();
  return true;
end $$;

-- ── La purga de los contadores (el barrido): lo descartado por el tope de errores se cuenta 24 h (Super Admin › Sistema › Apps); las demás
--    ventanas (de un segundo a un minuto) solo sirven mientras corren: a los 10 minutos se purgan. Los cortes y sus fallas no (los cierra el éxito) ──
create or replace function topes_purgar() returns integer language plpgsql as $$
declare n integer;
begin
  with x as (delete from rate_counters where scope not in ('corte', 'corte_fallas')
                and window_start < clock_timestamp() - case when scope = 'errores_descartados' then interval '25 hours' else interval '10 minutes' end returning 1)
  select count(*) into n from x;
  return n;
end $$;

commit;
