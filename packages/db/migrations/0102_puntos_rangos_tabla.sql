-- 0102 · Puntos, rangos, insignias y Tabla del Barrio (Fase 5 · 5f · docs/diseno/plan/fase5-comunidad.md §2 «0102 puntos_rangos_tabla»,
-- §3 «Votos honestos», §4 5f y §6 #7–#12, #22). Libro de puntos Opus/high.
-- · points_rules: lo que vale cada cosa (PTS de com-data.js L19–24); el equipo cambia el valor o la apaga (con auditoría).
-- · points_entries: el libro. SOLO INSERCIÓN (trigger: ni update ni delete). Solo lo escriben las funciones pts_* (marca tl.puntos):
--   pts_sumar (idempotente por persona + regla + referencia; tope del día local de la ciudad: lo que pasa del tope no se guarda),
--   pts_revertir / pts_revertir_objetivo (asiento inverso: quitar el voto, ocultar por las reglas, borrar), pts_restaurar_objetivo
--   (al levantar una apelación o deshacer el borrado vuelve lo que se restó) y pts_ajustar (el equipo, con motivo). Una cadena por
--   (persona, regla, referencia): cada asiento revierte al anterior (reverses_id único), así el neto es 0 o lo que se ganó.
-- · El tope del día también lo impone la base (antes de insertar): un asiento «regla» que pase el tope del día se rechaza.
-- · community_profiles: points_total, points_today/points_day, points_month/points_month_key, rank_level y rank_floor son derivados:
--   los escribe la base (el libro y pts_rango, el ÚNICO que escribe el rango). El rango solo sube (rank_floor); General del Barrio es
--   una plaza (los 3 primeros del mes al cierre que ya son Comandante); Coronel lo da el equipo (pts_piso).
-- · ranks (los 10 con nombre ES/EN renombrable, qué piden, qué desbloquean, puntos mínimos 0 · 100 · 300 · 800 · 1,500 · 2,300 · 3,500 ·
--   5,000 · invitación · 3 plazas y la condición de RANKS), badges (BDG + «Top del mes») y user_badges.
-- · monthly_boards (la Tabla del Barrio por ciudad y mes, derivada del libro) y board_closures (congelar el último día a medianoche de la
--   ciudad, cerrar con excluidos, posiciones, premios y plazas de General: tabla_cerrar).
-- · referral_codes («NOMBRE-N») y referrals (cuentan para Capitán; sin dinero, §6 #22).
-- · com_posts.featured_*: «Destacar 1 recomendación al mes» (Sargento Mayor, §6 #11): 7 días en Negocios › Recomendados por vecinos.
-- · La cuenta oficial no es una persona (no hay fila en users): nunca gana puntos ni sale en la Tabla (user_id not null + users).
-- Idempotente: if not exists, funciones que se reemplazan, triggers que se recrean, semillas de catálogo on conflict. Nada se borra.
begin;

-- ── Reglas de puntos (PTS) ──
create table if not exists points_rules (
  key        text primary key,
  points     smallint not null check (points between 0 and 100),
  enabled    boolean not null default true,
  label      jsonb not null,
  sort       smallint not null default 0,
  updated_by uuid references users (id),
  updated_at timestamptz not null default now()
);
insert into points_rules (key, points, label, sort) values
  ('voto_post', 2, '{"es":"Voto + en tu publicación","en":"Upvote on your post"}', 1),
  ('voto_comentario', 1, '{"es":"Voto + en tu comentario","en":"Upvote on your comment"}', 2),
  ('yo_tambien', 3, '{"es":"«Yo también» o «Sumar mi voto» en tu recomendación","en":"«Me too» or «Add my vote» on your recommendation"}', 3),
  ('me_sirvio', 10, '{"es":"Quien preguntó marca «Me sirvió»","en":"The asker marks «Helped me»"}', 4),
  ('resena_verificada', 15, '{"es":"Reseña verificada de un negocio","en":"Verified business review"}', 5),
  ('primera_rec', 50, '{"es":"Primera recomendación de un negocio, con 3 votos","en":"First recommendation of a business, with 3 votes"}', 6)
on conflict (key) do nothing;
insert into platform_config (key, value, note) values ('pts_tope_dia', '100'::jsonb, 'Puntos máximos por persona en un día local de su ciudad (5f)')
on conflict (key) do nothing;
create or replace function pts_tope() returns integer language sql stable as $$
  select coalesce((select (value #>> '{}')::int from platform_config where key = 'pts_tope_dia'), 100)
$$;

-- ── El libro ──
create table if not exists points_entries (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references users (id),
  city_id     text not null references cities (id),
  delta       integer not null check (delta <> 0 and delta between -5000 and 5000),
  rule_key    text not null,
  motive      text not null check (motive in ('regla', 'reverso', 'restaurado', 'ajuste')),
  ref_kind    text not null,
  ref_id      text not null,
  target_kind text check (target_kind in ('com_post', 'com_comment', 'review')),
  target_id   text,
  tab         text check (tab in ('rec', 'ans')),
  month_key   date not null check (extract(day from month_key) = 1),
  reverses_id bigint references points_entries (id),
  by_staff    uuid references users (id),
  reason      text check (char_length(reason) <= 500),
  local_day   date not null,
  created_at  timestamptz not null default now(),
  check (motive not in ('reverso', 'restaurado') or reverses_id is not null),
  check (motive <> 'ajuste' or (reverses_id is null and by_staff is not null and reason is not null and rule_key = 'ajuste')),
  check (motive <> 'reverso' or delta < 0),
  check (motive not in ('regla', 'restaurado') or delta > 0)
);
-- Idempotente: una sola cadena por persona, regla y referencia; cada asiento se revierte una sola vez.
create unique index if not exists points_entries_unico on points_entries (user_id, rule_key, ref_kind, ref_id) where reverses_id is null;
create unique index if not exists points_entries_reverso on points_entries (reverses_id) where reverses_id is not null;
-- «Primera recomendación de un negocio con 3 votos»: una vez por negocio y ciudad, para quien sea.
create unique index if not exists points_entries_primera_rec on points_entries (rule_key, ref_kind, ref_id) where rule_key = 'primera_rec' and reverses_id is null;
create index if not exists points_entries_persona_idx on points_entries (user_id, id desc);
create index if not exists points_entries_cadena_idx on points_entries (user_id, ref_kind, ref_id, id desc);
create index if not exists points_entries_objetivo_idx on points_entries (target_kind, target_id) where target_kind is not null;
create index if not exists points_entries_dia_idx on points_entries (user_id, local_day) where motive = 'regla';

-- Marca del libro: solo las funciones pts_* insertan (la app nunca escribe el libro directo; guardián libroSoloInsercion).
create or replace function pts_entrar() returns text language plpgsql as $$
declare p text := coalesce(current_setting('tl.puntos', true), '');
begin perform set_config('tl.puntos', 'si', true); return p; end $$;
create or replace function pts_salir(prev text) returns void language sql as $$ select set_config('tl.puntos', coalesce(prev, ''), true) $$;

create or replace function points_entries_inmutable() returns trigger language plpgsql as $$
begin raise exception 'points_entries es solo de inserción'; end $$;
drop trigger if exists points_entries_no_cambia on points_entries;
create trigger points_entries_no_cambia before update or delete on points_entries for each row execute function points_entries_inmutable();

-- Antes de insertar: solo por las funciones del libro, y el tope del día local (lo que pasa del tope no se guarda).
create or replace function points_entries_antes() returns trigger language plpgsql as $$
declare hoy int;
begin
  if coalesce(current_setting('tl.puntos', true), '') <> 'si' then raise exception 'el libro de puntos solo lo escriben sus funciones (pts_*)'; end if;
  if new.motive = 'regla' then
    select coalesce(sum(delta), 0) into hoy from points_entries where user_id = new.user_id and local_day = new.local_day and motive = 'regla' and delta > 0;
    if hoy + new.delta > pts_tope() then raise exception 'tope diario de puntos: % + % pasa de %', hoy, new.delta, pts_tope(); end if;
  end if;
  return new;
end $$;
drop trigger if exists points_entries_antes on points_entries;
create trigger points_entries_antes before insert on points_entries for each row execute function points_entries_antes();

-- ── Derivados del perfil ──
alter table community_profiles add column if not exists points_total integer not null default 0;
alter table community_profiles add column if not exists points_today integer not null default 0;
alter table community_profiles add column if not exists points_day date;
alter table community_profiles add column if not exists points_month integer not null default 0;
alter table community_profiles add column if not exists points_month_key date;
alter table community_profiles add column if not exists rank_floor smallint not null default 1;
alter table community_profiles drop constraint if exists community_profiles_puntos;
alter table community_profiles add constraint community_profiles_puntos check (points_total >= 0 and points_today >= 0 and rank_floor between 1 and 9);

-- El perfil: contadores, puntos y rango los escribe solo la base (marca tl.derivados que encienden sus funciones).
create or replace function community_profiles_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if not com_derivados_ok() then
      new.followers_n := 0; new.following_n := 0; new.posts_n := 0; new.answers_best_n := 0;
      new.points_total := 0; new.points_today := 0; new.points_day := null; new.points_month := 0; new.points_month_key := null; new.rank_level := 1; new.rank_floor := 1;
    end if;
  elsif not com_derivados_ok() and (new.followers_n, new.following_n, new.posts_n, new.answers_best_n) is distinct from (old.followers_n, old.following_n, old.posts_n, old.answers_best_n) then
    raise exception 'los contadores del perfil son derivados';
  elsif not com_derivados_ok() and (new.points_total, new.points_today, new.points_day, new.points_month, new.points_month_key, new.rank_level, new.rank_floor)
        is distinct from (old.points_total, old.points_today, old.points_day, old.points_month, old.points_month_key, old.rank_level, old.rank_floor) then
    raise exception 'los puntos y el rango son derivados: solo los escriben el libro y pts_rango';
  end if;
  new.updated_at := now();
  return new;
end $$;

-- El rango que alguien ya tenía es su piso (el rango solo sube): hasta Comandante (Coronel lo da el equipo; General es una plaza).
do $$ declare prev text; begin
  prev := com_derivados_entrar();
  update community_profiles set rank_floor = least(rank_level, 8) where rank_floor < least(rank_level, 8);
  perform com_derivados_salir(prev);
end $$;

-- ── Rangos ──
create table if not exists ranks (
  level       smallint primary key check (level between 1 and 10),
  name        jsonb not null,
  requirement jsonb not null,
  unlocks     jsonb not null,
  min_points  integer check (min_points >= 0),
  cond        jsonb not null default '{}'::jsonb,
  patio       boolean not null default false,
  updated_by  uuid references users (id),
  updated_at  timestamptz not null default now()
);
insert into ranks (level, name, requirement, unlocks, min_points, cond, patio) values
  (1, '{"es":"Recluta","en":"Recruit"}', '{"es":"Verificaste tu teléfono","en":"You verified your phone"}', '{"es":"Publicar, comentar y votar","en":"Post, comment and vote"}', 0, '{}', false),
  (2, '{"es":"Vecino","en":"Neighbor"}', '{"es":"Una publicación con 5 votos +","en":"One post with 5 upvotes"}', '{"es":"Insignia de vecino y perfil completo","en":"Neighbor badge and full profile"}', 100, '{"tipo":"post_votos","n":5}', false),
  (3, '{"es":"Cabo","en":"Corporal"}', '{"es":"5 comentarios con votos +","en":"5 comments with upvotes"}', '{"es":"Crear encuestas","en":"Create polls"}', 300, '{"tipo":"comentarios_votados","n":5}', false),
  (4, '{"es":"Sargento","en":"Sergeant"}', '{"es":"3 recomendaciones de negocio con votos","en":"3 business recommendations with votes"}', '{"es":"Tu rango se ve en tus comentarios","en":"Your rank shows on your comments"}', 800, '{"tipo":"recs_votadas","n":3}', false),
  (5, '{"es":"Sargento Mayor","en":"Sergeant Major"}', '{"es":"4 semanas activas seguidas","en":"4 active weeks in a row"}', '{"es":"Destacar 1 recomendación al mes","en":"Feature 1 recommendation a month"}', 1500, '{"tipo":"semanas","n":4}', false),
  (6, '{"es":"Teniente","en":"Lieutenant"}', '{"es":"Aportes constantes y 3 reseñas verificadas","en":"Steady help and 3 verified reviews"}', '{"es":"Mesas privadas en El Patio","en":"Private tables in El Patio"}', 2300, '{"tipo":"resenas","n":3}', true),
  (7, '{"es":"Capitán","en":"Captain"}', '{"es":"Vecinos que invitaste y participan","en":"Neighbors you invited who take part"}', '{"es":"Abrir torneos del barrio","en":"Open neighborhood tournaments"}', 3500, '{"tipo":"invitados","n":3}', true),
  (8, '{"es":"Comandante","en":"Commander"}', '{"es":"Historial limpio y muchos votos","en":"Clean record and many votes"}', '{"es":"Tus reportes se revisan primero","en":"Your reports are reviewed first"}', 5000, '{"tipo":"limpio_votos","n":200,"dias":180}', false),
  (9, '{"es":"Coronel","en":"Colonel"}', '{"es":"Por invitación del equipo","en":"By team invitation"}', '{"es":"Moderación local","en":"Local moderation"}', null, '{"tipo":"equipo"}', false),
  (10, '{"es":"General del Barrio","en":"Neighborhood General"}', '{"es":"Top de la ciudad · 3 plazas","en":"Top of the city · 3 seats"}', '{"es":"Voz en las decisiones de la ciudad","en":"A say in city decisions"}', null, '{"tipo":"plazas","n":3}', false)
on conflict (level) do nothing;

-- ── Insignias ──
create table if not exists badges (
  key   text primary key,
  name  jsonb not null,
  descr jsonb not null,
  auto  boolean not null default false,
  patio boolean not null default false,
  sort  smallint not null default 0
);
insert into badges (key, name, descr, auto, patio, sort) values
  ('fund', '{"es":"Fundador","en":"Founder"}', '{"es":"Entre los primeros 500 vecinos de su ciudad","en":"Among the first 500 neighbors of their city"}', true, false, 1),
  ('mejor', '{"es":"Mejor respuesta ×10","en":"Top answer ×10"}', '{"es":"10 respuestas marcadas «Me sirvió»","en":"10 answers marked «Helped me»"}', true, false, 2),
  ('rec50', '{"es":"50 recomendaciones votadas","en":"50 voted recommendations"}', '{"es":"Sus recomendaciones ayudan","en":"Their recommendations help"}', true, false, 3),
  ('top_mes', '{"es":"Top del mes","en":"Top of the month"}', '{"es":"Entre los 3 primeros de la Tabla del Barrio","en":"Among the top 3 of the Neighborhood Table"}', true, false, 4),
  ('avisos', '{"es":"Avisos de la ciudad","en":"City notices"}', '{"es":"Sus avisos ayudaron a más de 1,000 vecinos","en":"Notices that helped 1,000+ neighbors"}', false, false, 5),
  ('mod', '{"es":"Moderación local","en":"Local moderator"}', '{"es":"Por invitación del equipo","en":"By team invitation"}', false, false, 6),
  ('campeona', '{"es":"Campeón de dominó","en":"Dominoes champion"}', '{"es":"Copa del mes en El Patio","en":"Monthly cup in El Patio"}', false, true, 7),
  ('patio', '{"es":"100 partidas","en":"100 games"}', '{"es":"En El Patio","en":"In El Patio"}', false, true, 8)
on conflict (key) do nothing;
create table if not exists user_badges (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references users (id),
  badge_key  text not null references badges (key),
  month      date,
  by_staff   uuid references users (id),
  reason     text check (char_length(reason) <= 500),
  granted_at timestamptz not null default now(),
  unique nulls not distinct (user_id, badge_key, month)
);
create index if not exists user_badges_persona_idx on user_badges (user_id, granted_at desc);

-- ── La Tabla del Barrio ──
create table if not exists monthly_boards (
  city_id         text not null references cities (id),
  month           date not null check (extract(day from month) = 1),
  user_id         uuid not null references users (id),
  points          integer not null default 0,
  recs            integer not null default 0,
  answers         integer not null default 0,
  position        integer,
  seat            boolean not null default false,
  prize_coins     integer not null default 0 check (prize_coins >= 0),
  excluded        boolean not null default false,
  excluded_reason text check (char_length(excluded_reason) <= 500),
  excluded_by     uuid references users (id),
  excluded_at     timestamptz,
  updated_at      timestamptz not null default now(),
  primary key (city_id, month, user_id),
  check (not excluded or (excluded_reason is not null and excluded_by is not null))
);
create index if not exists monthly_boards_general_idx on monthly_boards (city_id, month, points desc, user_id) where not excluded;
create index if not exists monthly_boards_recs_idx on monthly_boards (city_id, month, recs desc, user_id) where not excluded;
create index if not exists monthly_boards_resp_idx on monthly_boards (city_id, month, answers desc, user_id) where not excluded;
create index if not exists monthly_boards_persona_idx on monthly_boards (user_id, month desc);
create table if not exists board_closures (
  city_id    text not null references cities (id),
  month      date not null check (extract(day from month) = 1),
  frozen_at  timestamptz not null default now(),
  closed_at  timestamptz,
  closed_by  uuid references users (id),
  report     jsonb not null default '{}'::jsonb,
  primary key (city_id, month)
);
-- La Tabla es derivada: solo la escriben el libro (puntos) y tabla_* (excluir, cerrar). Un mes cerrado ya no cambia.
create or replace function monthly_boards_guardia() returns trigger language plpgsql as $$
begin
  if not com_derivados_ok() then raise exception 'la Tabla del Barrio es derivada: solo la escriben el libro y tabla_*'; end if;
  if tg_op = 'DELETE' then raise exception 'la Tabla del Barrio no se borra'; end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists monthly_boards_guardia on monthly_boards;
create trigger monthly_boards_guardia before insert or update or delete on monthly_boards for each row execute function monthly_boards_guardia();
create or replace function board_closures_guardia() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'un cierre de la Tabla no se borra'; end if;
  if tg_op = 'UPDATE' and old.closed_at is not null then raise exception 'un mes cerrado no cambia'; end if;
  return new;
end $$;
drop trigger if exists board_closures_guardia on board_closures;
create trigger board_closures_guardia before update or delete on board_closures for each row execute function board_closures_guardia();

-- Después de cada asiento: el perfil (total, hoy, mes) y la Tabla de su ciudad y mes (si ese mes no está cerrado), en la misma transacción.
create or replace function points_entries_despues() returns trigger language plpgsql as $$
declare prev text;
begin
  prev := com_derivados_entrar();
  insert into community_profiles (user_id) values (new.user_id) on conflict (user_id) do nothing;
  update community_profiles set
      points_total = points_total + new.delta,
      points_today = case when new.motive = 'regla' and new.delta > 0 then
                       case when points_day = new.local_day then points_today + new.delta when points_day is null or points_day < new.local_day then new.delta else points_today end
                     else points_today end,
      points_day = case when new.motive = 'regla' and new.delta > 0 and (points_day is null or points_day < new.local_day) then new.local_day else points_day end,
      points_month = case when points_month_key = new.month_key then points_month + new.delta when points_month_key is null or points_month_key < new.month_key then new.delta else points_month end,
      points_month_key = greatest(points_month_key, new.month_key)
    where user_id = new.user_id;
  if not exists (select 1 from board_closures b where b.city_id = new.city_id and b.month = new.month_key and b.closed_at is not null) then
    insert into monthly_boards (city_id, month, user_id, points, recs, answers)
      values (new.city_id, new.month_key, new.user_id, new.delta, case when new.tab = 'rec' then new.delta else 0 end, case when new.tab = 'ans' then new.delta else 0 end)
      on conflict (city_id, month, user_id) do update set points = monthly_boards.points + excluded.points, recs = monthly_boards.recs + excluded.recs, answers = monthly_boards.answers + excluded.answers;
  end if;
  perform com_derivados_salir(prev);
  return null;
end $$;
drop trigger if exists points_entries_despues on points_entries;
create trigger points_entries_despues after insert on points_entries for each row execute function points_entries_despues();

-- ── Funciones del libro ──
-- Dos cuentas que alguna vez usaron el mismo dispositivo (o el dispositivo de este toque es de la otra): entre ellas no hay puntos.
create or replace function pts_mismo_dispositivo(a uuid, b uuid, dev uuid) returns boolean language sql stable as $$
  select a is not null and b is not null and (
       exists (select 1 from sessions s1 join sessions s2 on s2.device = s1.device where s1.user_id = a and s2.user_id = b and s1.device is not null)
    or (dev is not null and exists (select 1 from sessions s where s.user_id = b and s.device = dev)))
$$;

-- Sumar: idempotente (si la cadena ya está en positivo no hace nada), con el tope del día local (lo que pasa no se guarda). Devuelve lo
-- que se asentó (0 si nada). Candado por persona: dos sumas a la vez no se pasan del tope.
create or replace function pts_sumar(uid uuid, regla text, rk text, rid text, tk text, tid text, tb text) returns integer language plpgsql as $$
declare r record; ult record; ciudad text; tz text; dia date; hoy int; d int; prev text;
begin
  if uid is null then raise exception 'los puntos son de una persona (la cuenta oficial no gana puntos)'; end if;
  select points, enabled into r from points_rules where key = regla;
  if r is null or not r.enabled or r.points <= 0 then return 0; end if;
  select u.home_city_id, coalesce(c.timezone, 'America/New_York') into ciudad, tz from users u left join cities c on c.id = u.home_city_id where u.id = uid;
  if ciudad is null then return 0; end if;
  perform pg_advisory_xact_lock(hashtextextended('pts:' || uid::text, 0));
  select id, delta into ult from points_entries where user_id = uid and ref_kind = rk and ref_id = rid and rule_key = regla order by id desc limit 1;
  if ult.id is not null and ult.delta > 0 then return 0; end if;
  dia := (now() at time zone tz)::date;
  select coalesce(sum(delta), 0) into hoy from points_entries where user_id = uid and local_day = dia and motive = 'regla' and delta > 0;
  d := least(r.points, pts_tope() - hoy);
  if d <= 0 then return 0; end if;
  prev := pts_entrar();
  insert into points_entries (user_id, city_id, delta, rule_key, motive, ref_kind, ref_id, target_kind, target_id, tab, month_key, reverses_id, local_day)
    values (uid, ciudad, d, regla, 'regla', rk, rid, tk, tid, tb, date_trunc('month', dia)::date, ult.id, dia);
  perform pts_salir(prev);
  return d;
end $$;

-- Un asiento inverso del último positivo de una cadena (mismo mes y ciudad del original: si ese mes no se cerró, baja también en la Tabla).
create or replace function pts_inverso(e points_entries, motivo text, porque text) returns integer language plpgsql as $$
declare tz text; prev text;
begin
  select coalesce(c.timezone, 'America/New_York') into tz from cities c where c.id = e.city_id;
  prev := pts_entrar();
  insert into points_entries (user_id, city_id, delta, rule_key, motive, ref_kind, ref_id, target_kind, target_id, tab, month_key, reverses_id, reason, local_day)
    values (e.user_id, e.city_id, -e.delta, e.rule_key, motivo, e.ref_kind, e.ref_id, e.target_kind, e.target_id, e.tab, e.month_key, e.id, porque, (now() at time zone coalesce(tz, 'America/New_York'))::date);
  perform pts_salir(prev);
  return -e.delta;
end $$;

-- Revertir lo de una referencia (p. ej. el voto que se quitó o se cambió a −; la mejor respuesta que cambió): cada cadena en positivo
-- recibe su asiento inverso. Devuelve cuánto se restó (negativo o 0).
create or replace function pts_revertir(uid uuid, rk text, rid text, porque text) returns integer language plpgsql as $$
declare e points_entries; t int := 0;
begin
  if uid is null then return 0; end if;
  perform pg_advisory_xact_lock(hashtextextended('pts:' || uid::text, 0));
  for e in select distinct on (rule_key) * from points_entries where user_id = uid and ref_kind = rk and ref_id = rid order by rule_key, id desc loop
    if e.delta > 0 then t := t + pts_inverso(e, 'reverso', porque); end if;
  end loop;
  return t;
end $$;

-- Ocultar por las reglas o borrar: todo lo que ganó ese contenido se revierte (votos, «Me sirvió», primera recomendación, reseña).
create or replace function pts_revertir_objetivo(tk text, tid text, porque text) returns integer language plpgsql as $$
declare e points_entries; t int := 0;
begin
  for e in select distinct on (user_id, rule_key, ref_kind, ref_id) * from points_entries where target_kind = tk and target_id = tid order by user_id, rule_key, ref_kind, ref_id, id desc loop
    if e.delta > 0 then
      perform pg_advisory_xact_lock(hashtextextended('pts:' || e.user_id::text, 0));
      t := t + pts_inverso(e, 'reverso', porque);
    end if;
  end loop;
  return t;
end $$;

-- Vuelve a verse (apelación levantada, el equipo lo restaura, «Deshacer» del borrado): lo que se restó por ocultar o borrar vuelve.
create or replace function pts_restaurar_objetivo(tk text, tid text) returns integer language plpgsql as $$
declare e points_entries; t int := 0; tz text; prev text;
begin
  for e in select distinct on (user_id, rule_key, ref_kind, ref_id) * from points_entries where target_kind = tk and target_id = tid order by user_id, rule_key, ref_kind, ref_id, id desc loop
    if e.delta < 0 and e.motive = 'reverso' and e.reason in ('oculto', 'borrado') then
      perform pg_advisory_xact_lock(hashtextextended('pts:' || e.user_id::text, 0));
      select coalesce(c.timezone, 'America/New_York') into tz from cities c where c.id = e.city_id;
      prev := pts_entrar();
      insert into points_entries (user_id, city_id, delta, rule_key, motive, ref_kind, ref_id, target_kind, target_id, tab, month_key, reverses_id, reason, local_day)
        values (e.user_id, e.city_id, -e.delta, e.rule_key, 'restaurado', e.ref_kind, e.ref_id, e.target_kind, e.target_id, e.tab, e.month_key, e.id, 'restaurado', (now() at time zone coalesce(tz, 'America/New_York'))::date);
      perform pts_salir(prev);
      t := t - e.delta;
    end if;
  end loop;
  return t;
end $$;

-- Ajuste del equipo (± con motivo; el tope por rol lo revisa la app y el libro no deja más de 5,000). Nunca deja el total en negativo.
create or replace function pts_ajustar(uid uuid, d integer, staff uuid, porque text) returns integer language plpgsql as $$
declare ciudad text; tz text; dia date; tot int; prev text;
begin
  if uid is null or staff is null or d = 0 or porque is null or btrim(porque) = '' then raise exception 'ajuste sin persona, cantidad o motivo'; end if;
  if staff = uid then raise exception 'nadie ajusta sus propios puntos'; end if;
  select u.home_city_id, coalesce(c.timezone, 'America/New_York') into ciudad, tz from users u left join cities c on c.id = u.home_city_id where u.id = uid;
  if ciudad is null then raise exception 'la persona no tiene ciudad'; end if;
  perform pg_advisory_xact_lock(hashtextextended('pts:' || uid::text, 0));
  select coalesce((select points_total from community_profiles where user_id = uid), 0) into tot;
  if tot + d < 0 then raise exception 'el ajuste deja los puntos en negativo (tiene %)', tot; end if;
  dia := (now() at time zone tz)::date;
  prev := pts_entrar();
  insert into points_entries (user_id, city_id, delta, rule_key, motive, ref_kind, ref_id, month_key, by_staff, reason, local_day)
    values (uid, ciudad, d, 'ajuste', 'ajuste', 'equipo', gen_random_uuid()::text, date_trunc('month', dia)::date, staff, left(porque, 500), dia);
  perform pts_salir(prev);
  return d;
end $$;

-- ¿Cumple la condición de un rango? (RANKS: lo que pide además de los puntos).
create or replace function pts_condicion(uid uuid, c jsonb) returns boolean language plpgsql stable as $$
declare t text := c ->> 'tipo'; n int := coalesce((c ->> 'n')::int, 0); k int;
begin
  if t is null then return true; end if;
  if t = 'post_votos' then
    return exists (select 1 from com_posts where author_user_id = uid and author_kind = 'user' and status = 'visible' and up_n >= n);
  elsif t = 'comentarios_votados' then
    return (select count(*) from (select 1 from com_comments where author_user_id = uid and status = 'visible' and up_n > 0 limit n) x) >= n;
  elsif t = 'recs_votadas' then
    return (select count(*) from (select 1 from com_posts where author_user_id = uid and kind = 'recomendacion' and status = 'visible' and up_n > 0 limit n) x)
         + (select count(*) from (select 1 from com_comments where author_user_id = uid and business_id is not null and status = 'visible' and up_n > 0 limit n) y) >= n;
  elsif t = 'semanas' then
    select coalesce(max(m), 0) into k from (
      select count(*) as m from (
        select w, w - (row_number() over (order by w) * 7)::int as g
          from (select distinct date_trunc('week', local_day)::date as w from points_entries where user_id = uid and motive = 'regla' and delta > 0) a) b
       group by g) z;
    return k >= n;
  elsif t = 'resenas' then
    return (select count(*) from (select 1 from reviews where user_id = uid and status = 'visible' and src <> 'vis' limit n) x) >= n;
  elsif t = 'invitados' then
    return (select count(*) from (select 1 from referrals where promoter_user_id = uid and status = 'active' limit n) x) >= n;
  elsif t = 'limpio_votos' then
    if exists (select 1 from sanctions s where s.target_kind = 'user' and s.target_id = uid::text and s.kind <> 'adv' and s.lifted_at is null
                 and s.starts_at > now() - make_interval(days => coalesce((c ->> 'dias')::int, 180))) then return false; end if;
    return (select coalesce(sum(up_n), 0) from com_posts where author_user_id = uid and status = 'visible')
         + (select coalesce(sum(up_n), 0) from com_comments where author_user_id = uid and status = 'visible') >= n;
  end if;
  return false;  -- 'equipo' (Coronel) y 'plazas' (General) no se ganan solos
end $$;

-- Cuánto lleva hacia la condición de un rango (para «Para Vecino · 3 / 5»): el mismo conteo que pts_condicion, con tope en n.
create or replace function pts_avance(uid uuid, c jsonb) returns integer language plpgsql stable as $$
declare t text := c ->> 'tipo'; n int := coalesce((c ->> 'n')::int, 0); k int := 0;
begin
  if t = 'post_votos' then k := coalesce((select max(up_n) from com_posts where author_user_id = uid and author_kind = 'user' and status = 'visible'), 0);
  elsif t = 'comentarios_votados' then k := (select count(*) from (select 1 from com_comments where author_user_id = uid and status = 'visible' and up_n > 0 limit n) x);
  elsif t = 'recs_votadas' then k := (select count(*) from (select 1 from com_posts where author_user_id = uid and kind = 'recomendacion' and status = 'visible' and up_n > 0 limit n) x)
                                  + (select count(*) from (select 1 from com_comments where author_user_id = uid and business_id is not null and status = 'visible' and up_n > 0 limit n) y);
  elsif t = 'semanas' then
    select coalesce(max(m), 0) into k from (select count(*) as m from (select w, w - (row_number() over (order by w) * 7)::int as g
      from (select distinct date_trunc('week', local_day)::date as w from points_entries where user_id = uid and motive = 'regla' and delta > 0) a) b group by g) z;
  elsif t = 'resenas' then k := (select count(*) from (select 1 from reviews where user_id = uid and status = 'visible' and src <> 'vis' limit n) x);
  elsif t = 'invitados' then k := (select count(*) from (select 1 from referrals where promoter_user_id = uid and status = 'active' limit n) x);
  elsif t = 'limpio_votos' then k := (select coalesce(sum(up_n), 0) from com_posts where author_user_id = uid and status = 'visible') + (select coalesce(sum(up_n), 0) from com_comments where author_user_id = uid and status = 'visible');
  end if;
  return least(k, n);
end $$;

-- ÚNICO que escribe rank_level (y rank_floor): sube por la escalera 2–8 en orden (puntos mínimos + condición), nunca baja solo
-- (rank_floor); 9 = Coronel (lo pone el equipo con pts_piso); 10 = plaza de General del Barrio del último mes cerrado de su ciudad.
-- Las insignias automáticas (fundador, mejor respuesta ×10, 50 recomendaciones votadas) se entregan aquí, una vez.
create or replace function pts_rango(uid uuid) returns smallint language plpgsql as $$
declare p record; r record; lvl smallint := 1; fl smallint; silla boolean; prev text; nivel smallint;
begin
  if uid is null then return null; end if;
  prev := com_derivados_entrar();
  insert into community_profiles (user_id) values (uid) on conflict (user_id) do nothing;
  perform com_derivados_salir(prev);
  select points_total, rank_floor, rank_level, answers_best_n into p from community_profiles where user_id = uid for update;
  for r in select level, min_points, cond from ranks where level between 2 and 8 order by level loop
    exit when r.min_points is null or p.points_total < r.min_points or not pts_condicion(uid, r.cond);
    lvl := r.level;
  end loop;
  fl := greatest(coalesce(p.rank_floor, 1), lvl);
  silla := exists (select 1 from monthly_boards mb join board_closures bc on bc.city_id = mb.city_id and bc.month = mb.month and bc.closed_at is not null
                    where mb.user_id = uid and mb.seat
                      and bc.month = (select max(b2.month) from board_closures b2 where b2.city_id = mb.city_id and b2.closed_at is not null));
  nivel := case when silla then 10 else fl end;
  prev := com_derivados_entrar();
  update community_profiles set rank_floor = fl, rank_level = nivel where user_id = uid and (rank_floor, rank_level) is distinct from (fl, nivel);
  perform com_derivados_salir(prev);
  insert into user_badges (user_id, badge_key) select uid, 'fund' from users where id = uid and founder on conflict do nothing;
  if coalesce(p.answers_best_n, 0) >= 10 then insert into user_badges (user_id, badge_key) values (uid, 'mejor') on conflict do nothing; end if;
  if (select count(*) from (select 1 from com_posts where author_user_id = uid and kind = 'recomendacion' and status = 'visible' and up_n > 0 limit 50) x)
   + (select count(*) from (select 1 from com_comments where author_user_id = uid and business_id is not null and status = 'visible' and up_n > 0 limit 50) y) >= 50 then
    insert into user_badges (user_id, badge_key) values (uid, 'rec50') on conflict do nothing;
  end if;
  return nivel;
end $$;

-- El equipo fija el piso del rango: Coronel (9) por invitación o bajar por fraude (con motivo; la app audita). Luego recalcula.
create or replace function pts_piso(uid uuid, nivel smallint, staff uuid, porque text) returns smallint language plpgsql as $$
declare prev text;
begin
  if nivel not between 1 and 9 then raise exception 'el piso de un rango va de 1 a 9 (General es una plaza)'; end if;
  if staff is null or porque is null or btrim(porque) = '' then raise exception 'cambiar un rango pide quién y por qué'; end if;
  if staff = uid then raise exception 'nadie cambia su propio rango'; end if;
  prev := com_derivados_entrar();
  insert into community_profiles (user_id) values (uid) on conflict (user_id) do nothing;
  update community_profiles set rank_floor = nivel where user_id = uid;
  perform com_derivados_salir(prev);
  if nivel = 9 then insert into user_badges (user_id, badge_key, by_staff, reason) values (uid, 'mod', staff, left(porque, 500)) on conflict do nothing; end if;
  return pts_rango(uid);
end $$;

-- ── La Tabla: excluir y cerrar (lo llama lib/tabla.ts) ──
create or replace function tabla_excluir(ciudad text, mes date, uid uuid, fuera boolean, staff uuid, porque text) returns void language plpgsql as $$
declare prev text;
begin
  if staff is null or porque is null or btrim(porque) = '' then raise exception 'excluir pide quién y por qué'; end if;
  if exists (select 1 from board_closures where city_id = ciudad and month = mes and closed_at is not null) then raise exception 'ese mes ya se cerró'; end if;
  prev := com_derivados_entrar();
  update monthly_boards set excluded = fuera, excluded_reason = case when fuera then left(porque, 500) end, excluded_by = case when fuera then staff end,
         excluded_at = case when fuera then now() end
   where city_id = ciudad and month = mes and user_id = uid;
  perform com_derivados_salir(prev);
  if not found then raise exception 'esa persona no está en la tabla de ese mes'; end if;
end $$;

-- Cerrar un mes de una ciudad: (1) la tabla queda fija con sus posiciones, (2) los excluidos no reciben premio, (3) los 3 primeros reciben
-- la insignia del mes y el premio en monedas (se acredita con el libro de monedas, 5g) y las plazas de General del Barrio son de los
-- 3 primeros que ya son Comandante (el Coronel sigue como Coronel), (4) el reporte de canjes de cupones del mes. Devuelve los 3 primeros.
create or replace function tabla_cerrar(ciudad text, mes date, staff uuid, premio int) returns table (persona uuid, puesto int, es_general boolean) language plpgsql as $$
declare prev text; antes uuid[]; x record;
begin
  insert into board_closures (city_id, month) values (ciudad, mes) on conflict (city_id, month) do nothing;
  perform 1 from board_closures where city_id = ciudad and month = mes for update;
  if exists (select 1 from board_closures where city_id = ciudad and month = mes and closed_at is not null) then raise exception 'ese mes ya se cerró'; end if;
  if mes >= date_trunc('month', (now() at time zone coalesce((select timezone from cities where id = ciudad), 'America/New_York'))::date)::date then raise exception 'ese mes todavía no termina'; end if;
  select coalesce(array_agg(distinct mb.user_id), '{}') into antes from monthly_boards mb where mb.city_id = ciudad and mb.seat;
  prev := com_derivados_entrar();
  update monthly_boards mb set position = o.rn
    from (select b.user_id as u, row_number() over (order by b.points desc, b.user_id) as rn from monthly_boards b
           where b.city_id = ciudad and b.month = mes and not b.excluded and b.points > 0) o
   where mb.city_id = ciudad and mb.month = mes and mb.user_id = o.u;
  update monthly_boards mb set prize_coins = case when mb.position <= 3 then greatest(premio, 0) else 0 end,
         seat = mb.position <= 3 and coalesce((select cp.rank_floor from community_profiles cp where cp.user_id = mb.user_id), 1) = 8
   where mb.city_id = ciudad and mb.month = mes and mb.position is not null;
  perform com_derivados_salir(prev);
  insert into user_badges (user_id, badge_key, month, reason)
    select mb.user_id, 'top_mes', mes, 'Tabla del Barrio · #' || mb.position from monthly_boards mb where mb.city_id = ciudad and mb.month = mes and mb.position <= 3
    on conflict do nothing;
  update board_closures set closed_at = now(), closed_by = staff,
         report = jsonb_build_object('top', (select coalesce(jsonb_agg(jsonb_build_object('user', mb.user_id, 'pos', mb.position, 'puntos', mb.points, 'general', mb.seat) order by mb.position), '[]')
                                            from monthly_boards mb where mb.city_id = ciudad and mb.month = mes and mb.position <= 3),
                                     'excluidos', (select count(*) from monthly_boards mb where mb.city_id = ciudad and mb.month = mes and mb.excluded),
                                     'canjes', 0, 'premio', premio)
   where city_id = ciudad and month = mes;
  -- Las plazas cambiaron: el rango de quien la deja y de quien la toma se recalcula.
  for x in select distinct u from (select unnest(antes) as u union select mb.user_id from monthly_boards mb where mb.city_id = ciudad and mb.month = mes and mb.position <= 3) z loop
    perform pts_rango(x.u);
  end loop;
  return query select mb.user_id, mb.position, mb.seat from monthly_boards mb where mb.city_id = ciudad and mb.month = mes and mb.position <= 3 order by mb.position;
end $$;

-- ── Ocultar, borrar o volver a verse mueve los puntos (cualquier camino: el equipo, el auto-ocultar, el autor, la apelación) ──
create or replace function com_posts_puntos() returns trigger language plpgsql as $$
begin
  if old.status = 'visible' and new.status <> 'visible' then perform pts_revertir_objetivo('com_post', new.id::text, case when new.status = 'deleted' then 'borrado' else 'oculto' end);
  elsif old.status <> 'visible' and new.status = 'visible' then perform pts_restaurar_objetivo('com_post', new.id::text);
  end if;
  return null;
end $$;
drop trigger if exists com_posts_puntos on com_posts;
create trigger com_posts_puntos after update of status on com_posts for each row execute function com_posts_puntos();
create or replace function com_comments_puntos() returns trigger language plpgsql as $$
begin
  if old.status = 'visible' and new.status <> 'visible' then perform pts_revertir_objetivo('com_comment', new.id::text, case when new.status = 'deleted' then 'borrado' else 'oculto' end);
  elsif old.status <> 'visible' and new.status = 'visible' then perform pts_restaurar_objetivo('com_comment', new.id::text);
  end if;
  return null;
end $$;
drop trigger if exists com_comments_puntos on com_comments;
create trigger com_comments_puntos after update of status on com_comments for each row execute function com_comments_puntos();
create or replace function reviews_puntos() returns trigger language plpgsql as $$
begin
  if old.status = 'visible' and new.status <> 'visible' then perform pts_revertir_objetivo('review', new.id::text, case when new.status = 'removed' then 'borrado' else 'oculto' end);
  elsif old.status <> 'visible' and new.status = 'visible' then perform pts_restaurar_objetivo('review', new.id::text);
  end if;
  return null;
end $$;
drop trigger if exists reviews_puntos on reviews;
create trigger reviews_puntos after update of status on reviews for each row execute function reviews_puntos();

-- La primera recomendación de un negocio en la ciudad (publicación o comentario): índice para encontrarla sin recorrer.
create index if not exists com_comments_primera_rec_idx on com_comments (business_id, city_id, created_at, id) where business_id is not null;
create index if not exists com_posts_primera_rec_idx on com_posts (business_id, city_id, created_at, id) where kind = 'recomendacion';

-- ── Invitar (Capitán; sin dinero) ──
create table if not exists referral_codes (
  user_id    uuid primary key references users (id),
  code       text not null unique check (code ~ '^[A-Z]{1,6}-[0-9]{1,7}[A-Z]?$'),
  created_at timestamptz not null default now()
);
create table if not exists referrals (
  id               bigint generated always as identity primary key,
  promoter_user_id uuid not null references users (id),
  referred_user_id uuid not null unique references users (id),
  status           text not null default 'joined' check (status in ('joined', 'active')),
  at               timestamptz not null default now(),
  active_at        timestamptz,
  check (promoter_user_id <> referred_user_id)
);
create index if not exists referrals_promotor_idx on referrals (promoter_user_id, at desc);
create index if not exists referrals_unidos_idx on referrals (referred_user_id) where status = 'joined';

-- ── «Destacar 1 recomendación al mes» (Sargento Mayor) ──
alter table com_posts add column if not exists featured_at timestamptz;
alter table com_posts add column if not exists featured_until timestamptz;
alter table com_posts drop constraint if exists com_posts_destacada;
alter table com_posts add constraint com_posts_destacada check (featured_at is null or (kind = 'recomendacion' and featured_until is not null));
create index if not exists com_posts_destacadas_idx on com_posts (city_id, featured_until desc) where featured_until is not null;

-- ── Avisos (ES/EN, sin SMS) ──
insert into notif_templates (key, grp, pref, sms, title, body) values
  ('gam_rank', 'tx', null, false, '{"es":"Subiste de rango","en":"You moved up"}', '{"es":"Ahora eres {rango}. Ya puedes: {puede}.","en":"You are now {rango}. Now you can: {puede}."}'),
  ('gam_top3', 'tx', null, false, '{"es":"Quedaste entre los 3 primeros","en":"You made the top 3"}', '{"es":"Quedaste #{pos} en la Tabla del Barrio de {mes}. Ganaste la insignia «Top del mes».{general}","en":"You finished #{pos} on the {mes} Neighborhood Table. You earned the «Top of the month» badge.{general}"}'),
  ('gam_ajuste', 'tx', null, false, '{"es":"Ajustamos tus puntos","en":"We adjusted your points"}', '{"es":"El equipo de To''Latino ajustó tus puntos: {delta}. Motivo: {motivo}","en":"The To''Latino team adjusted your points: {delta}. Reason: {motivo}"}'),
  ('gam_excluido', 'mod', null, false, '{"es":"No sales en la Tabla de este mes","en":"You are off this month''s Table"}', '{"es":"Te sacamos de la Tabla del Barrio de {mes}: {motivo}. Tus puntos y tu rango siguen igual.","en":"We took you off the {mes} Neighborhood Table: {motivo}. Your points and rank stay the same."}'),
  ('gam_rango_equipo', 'mod', null, false, '{"es":"Cambió tu rango","en":"Your rank changed"}', '{"es":"El equipo de To''Latino cambió tu rango a {rango}. Motivo: {motivo}","en":"The To''Latino team changed your rank to {rango}. Reason: {motivo}"}')
on conflict (key) do nothing;

commit;
