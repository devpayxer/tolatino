-- 0215 · Anfitriones del barrio (decisión AO, 23 nov; docs/diseno/plan/anfitriones.md). Ocho voces de la casa que publican y responden en la
-- Comunidad para que no arranque vacía, SIEMPRE marcadas («Anfitrión»/«Anfitriona» · «Host») y que se retiran solas cuando la gente real conversa.
-- · users.kind ('person' | 'host'): un anfitrión es una fila de users con su propio tipo (no un parche por nombre): bloquear, silenciar, comentar y el
--   hilo funcionan como con cualquiera. Lo que NO puede (lo cierra la base, no la pantalla): tener teléfono o correo (nunca entra), iniciar sesión,
--   ser del equipo, ganar puntos o monedas, salir en la Tabla, tener insignias o rango (queda en 1) y mandar o recibir mensajes privados.
--   El tipo no cambia nunca (ni una persona pasa a anfitrión ni al revés).
-- · com_hosts: la persona de cada voz (nombre, marca m/f, tema, país, estilo que guía cómo habla, encendida o no). Catálogo: existe también en
--   producción, APAGADA por defecto.
-- · com_host_kinds: los tipos de publicación (empleos, eventos, negocio nuevo, pregunta del día, noticias) con su voz y su interruptor (apagados).
-- · com_host_questions: la lista editable de la pregunta del día (nada se borra: estado).
-- · com_host_cities: el control por ciudad (auto · manual · apagado; apagado por defecto) y sus cupos manuales.
-- · com_host_log: el registro por pieza (solo inserción): voz, fuente, motor, modelo, costo estimado, a qué publicación dio lugar o por qué se descartó.
-- · com_host_spend / com_host_reservations + anf_reservar / anf_anotar / anf_soltar_reservas: el tope mensual PROPIO (anf_tope_mes_cents), con la
--   misma forma que el de El Compa y el de las fotos (reservar antes, liquidar después; con varios a la vez, la suma nunca pasa del tope).
-- · config_keys (Configuración › Comunidad): minutos de espera, idas y vueltas, recién llegado, los tres tramos (actividad → cupos), el tope de costo
--   y «Pausar a todos» (anf_pausa, solo desde Super Admin › Contenido › Anfitriones).
-- Idempotente. Nada se borra.
begin;

-- ── El tipo de cuenta ──
alter table users add column if not exists kind text not null default 'person';
alter table users drop constraint if exists users_kind_check;
alter table users add constraint users_kind_check check (kind in ('person', 'host'));
alter table users drop constraint if exists users_phone_o_borrada;
alter table users add constraint users_phone_o_borrada check (phone is not null or status in ('deleted', 'merged') or kind = 'host');
alter table users drop constraint if exists users_anfitrion_sin_acceso;
alter table users add constraint users_anfitrion_sin_acceso check (kind <> 'host' or (phone is null and email is null and phone_verified_at is null and not founder));
create index if not exists users_anfitriones_idx on users (id) where kind = 'host';

create or replace function anf_es(u uuid) returns boolean language sql stable as $$
  select exists (select 1 from users x where x.id = u and x.kind = 'host')
$$;

create or replace function users_kind_fijo() returns trigger language plpgsql as $$
begin
  if new.kind is distinct from old.kind then raise exception 'anfitrion_tipo_fijo: el tipo de una cuenta no cambia'; end if;
  return new;
end $$;
drop trigger if exists users_kind_fijo on users;
create trigger users_kind_fijo before update of kind on users for each row execute function users_kind_fijo();

-- Lo que un anfitrión nunca tiene (la base lo rechaza aunque el código se equivoque). Los triggers empiezan por «anf_»: corren ANTES que los
-- demás de su tabla (orden alfabético), así el rechazo es siempre este y no otro.
create or replace function anf_no_aplica() returns trigger language plpgsql as $$
declare u uuid; v uuid;
begin
  if tg_table_name = 'dm_threads' then u := new.a_user_id; v := new.b_user_id;
  else u := new.user_id; v := null; end if;
  if anf_es(u) or (v is not null and anf_es(v)) then
    raise exception 'anfitrion_no_aplica: un anfitrión no tiene % (es una voz de la casa)', tg_table_name;
  end if;
  return new;
end $$;
drop trigger if exists anf_sessions_sin_anfitrion on sessions;
create trigger anf_sessions_sin_anfitrion before insert on sessions for each row execute function anf_no_aplica();
drop trigger if exists anf_staff_members_sin_anfitrion on staff_members;
create trigger anf_staff_members_sin_anfitrion before insert on staff_members for each row execute function anf_no_aplica();
drop trigger if exists anf_points_entries_sin_anfitrion on points_entries;
create trigger anf_points_entries_sin_anfitrion before insert on points_entries for each row execute function anf_no_aplica();
drop trigger if exists anf_coin_entries_sin_anfitrion on coin_entries;
create trigger anf_coin_entries_sin_anfitrion before insert on coin_entries for each row execute function anf_no_aplica();
drop trigger if exists anf_monthly_boards_sin_anfitrion on monthly_boards;
create trigger anf_monthly_boards_sin_anfitrion before insert on monthly_boards for each row execute function anf_no_aplica();
drop trigger if exists anf_user_badges_sin_anfitrion on user_badges;
create trigger anf_user_badges_sin_anfitrion before insert on user_badges for each row execute function anf_no_aplica();
drop trigger if exists anf_dm_threads_sin_anfitrion on dm_threads;
create trigger anf_dm_threads_sin_anfitrion before insert on dm_threads for each row execute function anf_no_aplica();

-- El rango de un anfitrión queda en 1 (no se le pinta: se pinta su marca). «zz_»: corre DESPUÉS de los demás triggers de la tabla.
create or replace function community_profiles_anfitrion() returns trigger language plpgsql as $$
begin
  if anf_es(new.user_id) then new.rank_level := 1; end if;
  return new;
end $$;
drop trigger if exists zz_community_profiles_anfitrion on community_profiles;
create trigger zz_community_profiles_anfitrion before insert or update on community_profiles for each row execute function community_profiles_anfitrion();

-- ── La persona de cada voz ──
create table if not exists com_hosts (
  user_id    uuid primary key references users (id),
  slug       text not null unique check (slug ~ '^[a-z]{3,20}$'),
  name       text not null check (char_length(name) between 2 and 40),
  gender     text not null check (gender in ('m', 'f')),
  topic      text not null check (topic in ('barrio', 'deportes', 'noticias', 'comida', 'tramites', 'musica', 'escuela', 'trabajo')),
  country    text not null check (country ~ '^[A-Z]{2}$'),
  style      text not null check (char_length(style) between 20 and 1500),
  active     boolean not null default false,
  updated_by uuid references users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create or replace function com_hosts_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'una voz no se borra: se apaga'; end if;
  if not anf_es(new.user_id) then raise exception 'anfitrion_no_es: la persona de una voz es de una cuenta de anfitrión'; end if;
  if tg_op = 'UPDATE' and (new.user_id, new.slug) is distinct from (old.user_id, old.slug) then raise exception 'una voz no cambia de cuenta ni de clave'; end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists com_hosts_antes on com_hosts;
create trigger com_hosts_antes before insert or update or delete on com_hosts for each row execute function com_hosts_antes();

-- Las ocho voces (catálogo: existen también en producción, apagadas). Cuentas sin teléfono ni correo: nunca entran.
insert into users (id, first_name, lang, status, kind, created_at)
values ('0a0f0000-0000-4000-8000-000000000001', 'Doña Milagros', 'es', 'active', 'host', '2026-11-01'),
       ('0a0f0000-0000-4000-8000-000000000002', 'Rafelito', 'es', 'active', 'host', '2026-11-01'),
       ('0a0f0000-0000-4000-8000-000000000003', 'Yadira', 'es', 'active', 'host', '2026-11-01'),
       ('0a0f0000-0000-4000-8000-000000000004', 'Tato', 'es', 'active', 'host', '2026-11-01'),
       ('0a0f0000-0000-4000-8000-000000000005', 'Carmen', 'es', 'active', 'host', '2026-11-01'),
       ('0a0f0000-0000-4000-8000-000000000006', 'Junior', 'es', 'active', 'host', '2026-11-01'),
       ('0a0f0000-0000-4000-8000-000000000007', 'Profe Manuel', 'es', 'active', 'host', '2026-11-01'),
       ('0a0f0000-0000-4000-8000-000000000008', 'Don Chepe', 'es', 'active', 'host', '2026-11-01')
on conflict (id) do nothing;
insert into community_profiles (user_id, adult, adult_ok_at, welcome_at, rules_version, rules_ok_at)
select u.id, true, now(), now(), 1, now() from users u where u.kind = 'host'
on conflict (user_id) do nothing;
insert into com_hosts (user_id, slug, name, gender, topic, country, style) values
  ('0a0f0000-0000-4000-8000-000000000001', 'milagros', 'Doña Milagros', 'f', 'barrio', 'DO',
   'Cálida y de confianza, como la vecina que conoce a todo el mundo. Da la bienvenida a quien llega, pregunta cómo está y anima a presentarse. Frases cortas, de usted o de tú según le hablen; nada de chismes.'),
  ('0a0f0000-0000-4000-8000-000000000002', 'rafelito', 'Rafelito', 'm', 'deportes', 'DO',
   'Fanático de la pelota y de los deportes, bromista y con energía. Pregunta quién ganó, a quién le van, dónde se ve el juego. Bromea sin burlarse de nadie.'),
  ('0a0f0000-0000-4000-8000-000000000003', 'yadira', 'Yadira', 'f', 'noticias', 'DO',
   'Clara y sobria. Resume en dos o tres líneas lo que dice la fuente, sin opinar, y deja una pregunta para que el barrio converse. Siempre con el enlace a la fuente.'),
  ('0a0f0000-0000-4000-8000-000000000004', 'tato', 'Tato', 'm', 'comida', 'MX',
   'Antojado y directo. Habla de comida con ganas, pregunta dónde se come rico y qué se cocina en casa. Nunca inventa precios ni recomienda un lugar que no esté en la app.'),
  ('0a0f0000-0000-4000-8000-000000000005', 'carmen', 'Carmen', 'f', 'tramites', 'CO',
   'Ordenada, explica paso a paso. Avisos útiles y trámites generales, sin dar consejo legal ni migratorio concreto: para eso, a una persona profesional.'),
  ('0a0f0000-0000-4000-8000-000000000006', 'junior', 'Junior', 'm', 'musica', 'PR',
   'Joven, corto y alegre. Música, eventos y planes del fin de semana. Mensajes breves, sin exagerar.'),
  ('0a0f0000-0000-4000-8000-000000000007', 'manuel', 'Profe Manuel', 'm', 'escuela', 'DO',
   'Paciente, de maestro. Escuela, niños y aprender inglés con calma; propone una palabra o un consejo sencillo y pregunta cómo le va a cada quien.'),
  ('0a0f0000-0000-4000-8000-000000000008', 'chepe', 'Don Chepe', 'm', 'trabajo', 'DO',
   'Franco y de experiencia. Trabajo y empleos: avisa vacantes de la app y recuerda que nadie cobra por aplicar. Directo, respetuoso, sin prometer nada.')
on conflict (user_id) do nothing;

-- ── Los tipos de publicación (cada uno con su interruptor; apagados) ──
create table if not exists com_host_kinds (
  key          text primary key check (key in ('empleos', 'eventos', 'negocio_nuevo', 'pregunta_dia', 'noticias')),
  host_user_id uuid not null references com_hosts (user_id),
  active       boolean not null default false,
  sort         smallint not null default 0,
  updated_by   uuid references users (id),
  updated_at   timestamptz not null default now()
);
insert into com_host_kinds (key, host_user_id, sort) values
  ('empleos', '0a0f0000-0000-4000-8000-000000000008', 1),
  ('eventos', '0a0f0000-0000-4000-8000-000000000006', 2),
  ('negocio_nuevo', '0a0f0000-0000-4000-8000-000000000001', 3),
  ('pregunta_dia', '0a0f0000-0000-4000-8000-000000000001', 4),
  ('noticias', '0a0f0000-0000-4000-8000-000000000003', 5)
on conflict (key) do nothing;

-- ── La pregunta del día (lista editable; nada se borra) ──
create table if not exists com_host_questions (
  id           bigint generated always as identity primary key,
  body         text not null check (char_length(body) between 10 and 300 and com_sin_datos(body)),
  lang         text not null default 'es' check (lang in ('es', 'en')),
  host_user_id uuid not null references com_hosts (user_id),
  status       text not null default 'active' check (status in ('active', 'retired')),
  created_by   uuid references users (id),
  created_at   timestamptz not null default now(),
  retired_at   timestamptz,
  check ((status = 'retired') = (retired_at is not null))
);
create index if not exists com_host_questions_vivas_idx on com_host_questions (id) where status = 'active';
insert into com_host_questions (body, host_user_id)
select x.b, x.h::uuid from (values
  ('¿De qué país es tu familia y qué es lo que más extrañas de allá?', '0a0f0000-0000-4000-8000-000000000001'),
  ('¿Cuál es el plato que siempre cocinas cuando tienes visita?', '0a0f0000-0000-4000-8000-000000000004'),
  ('¿Qué música no puede faltar en una fiesta de tu casa?', '0a0f0000-0000-4000-8000-000000000006'),
  ('¿Qué palabra en inglés te costó más aprender?', '0a0f0000-0000-4000-8000-000000000007'),
  ('¿Cuántos años llevas en el barrio y qué ha cambiado desde que llegaste?', '0a0f0000-0000-4000-8000-000000000001'),
  ('¿A qué equipo le vas y por qué?', '0a0f0000-0000-4000-8000-000000000002')
) x(b, h)
where not exists (select 1 from com_host_questions);

-- ── El control por ciudad (apagado por defecto) ──
create table if not exists com_host_cities (
  city_id        text primary key references cities (id),
  mode           text not null default 'off' check (mode in ('auto', 'manual', 'off')),
  manual_posts   smallint not null default 0 check (manual_posts between 0 and 20),
  manual_replies smallint not null default 0 check (manual_replies between 0 and 50),
  updated_by     uuid references users (id),
  updated_at     timestamptz not null default now()
);
insert into com_host_cities (city_id) select id from cities on conflict (city_id) do nothing;

-- ── El registro por pieza (solo inserción) ──
create table if not exists com_host_log (
  id             bigint generated always as identity primary key,
  city_id        text not null references cities (id),
  host_user_id   uuid references com_hosts (user_id),
  kind           text not null check (kind in ('empleos', 'eventos', 'negocio_nuevo', 'pregunta_dia', 'noticias', 'respuesta')),
  source_ref     text not null check (char_length(source_ref) between 1 and 200),
  motor          text not null check (motor in ('plantilla', 'claude', 'simulador', 'reglas', 'ninguno')),
  model          text check (model is null or char_length(model) <= 80),
  cost_microusd  bigint not null default 0 check (cost_microusd >= 0),
  input_tokens   integer not null default 0 check (input_tokens >= 0),
  output_tokens  integer not null default 0 check (output_tokens >= 0),
  post_id        bigint references com_posts (id),
  comment_id     bigint references com_comments (id),
  outcome        text not null check (outcome in ('publicada', 'descartada')),
  reason         text check (reason is null or reason in ('tope', 'motor', 'filtro', 'moderacion', 'delicado', 'bloqueo', 'limite', 'error', 'voz_apagada')),
  detail         text check (detail is null or char_length(detail) <= 300),
  local_day      date not null,
  created_at     timestamptz not null default now(),
  check ((outcome = 'publicada') = (post_id is not null or comment_id is not null)),
  check ((outcome = 'publicada') = (reason is null))
);
create index if not exists com_host_log_cupo_idx on com_host_log (city_id, local_day, kind) where outcome = 'publicada';
create unique index if not exists com_host_log_una_vez_idx on com_host_log (city_id, kind, source_ref);
create index if not exists com_host_log_lista_idx on com_host_log (created_at desc, id desc);
create or replace function com_host_log_inmutable() returns trigger language plpgsql as $$
begin raise exception 'com_host_log es solo de inserción'; end $$;
drop trigger if exists com_host_log_no_cambia on com_host_log;
create trigger com_host_log_no_cambia before update or delete on com_host_log for each row execute function com_host_log_inmutable();

-- ── El tope de costo propio (como el de El Compa y el de las fotos) ──
create table if not exists com_host_spend (
  month             text primary key check (month ~ '^[0-9]{4}-[0-9]{2}$'),
  spent_microusd    bigint not null default 0 check (spent_microusd >= 0),
  reserved_microusd bigint not null default 0 check (reserved_microusd >= 0),
  updated_at        timestamptz not null default now()
);
create table if not exists com_host_reservations (
  id           uuid primary key default gen_random_uuid(),
  month        text not null references com_host_spend (month),
  model        text not null references compa_models (id),
  max_microusd bigint not null check (max_microusd > 0),
  status       text not null default 'open' check (status in ('open', 'settled', 'released')),
  created_at   timestamptz not null default now(),
  closed_at    timestamptz
);
create index if not exists com_host_reservations_abiertas on com_host_reservations (created_at) where status = 'open';
create or replace function com_host_reservations_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'una reserva del tope de los anfitriones no se borra'; end if;
  if old.status <> 'open' or new.status = 'open'
     or (new.id, new.month, new.model, new.max_microusd, new.created_at) is distinct from (old.id, old.month, old.model, old.max_microusd, old.created_at) then
    raise exception 'una reserva del tope de los anfitriones se cierra una sola vez';
  end if;
  new.closed_at := now();
  return new;
end $$;
drop trigger if exists com_host_reservations_antes on com_host_reservations;
create trigger com_host_reservations_antes before update or delete on com_host_reservations for each row execute function com_host_reservations_antes();
create or replace function com_host_spend_no_borra() returns trigger language plpgsql as $$
begin raise exception 'el gasto de un mes no se borra'; end $$;
drop trigger if exists com_host_spend_no_borra on com_host_spend;
create trigger com_host_spend_no_borra before delete on com_host_spend for each row execute function com_host_spend_no_borra();

create or replace function anf_reservar(p_model text, p_in_max bigint, p_out_max bigint) returns uuid language plpgsql as $$
declare m text := compa_mes(); maxi bigint; tope bigint := cfg_int('anf_tope_mes_cents')::bigint * 10000; r uuid;
begin
  if not exists (select 1 from compa_models where id = p_model and status = 'on') then return null; end if;
  maxi := greatest(1, compa_costo(p_model, p_in_max, 0, 0, p_out_max));
  insert into com_host_spend (month) values (m) on conflict (month) do nothing;
  update com_host_spend set reserved_microusd = reserved_microusd + maxi, updated_at = now()
   where month = m and spent_microusd + reserved_microusd + maxi <= tope;
  if not found then return null; end if;
  insert into com_host_reservations (month, model, max_microusd) values (m, p_model, maxi) returning id into r;
  return r;
end $$;
create or replace function anf_anotar(p_reserva uuid, p_model text, p_in integer, p_out integer, p_cobrar_reservado boolean default false) returns bigint language plpgsql as $$
declare v com_host_reservations; costo bigint;
begin
  select * into v from com_host_reservations where id = p_reserva for update;
  if not found or v.status <> 'open' then raise exception 'anf_reserva_cerrada: esa reserva no existe o ya se cerró'; end if;
  costo := case when p_cobrar_reservado then v.max_microusd else coalesce(compa_costo(p_model, greatest(p_in, 0), 0, 0, greatest(p_out, 0)), 0) end;
  update com_host_reservations set status = 'settled' where id = p_reserva;
  update com_host_spend set reserved_microusd = greatest(0, reserved_microusd - v.max_microusd), spent_microusd = spent_microusd + costo, updated_at = now()
   where month = v.month;
  return costo;
end $$;
create or replace function anf_soltar_reservas(p_min integer default 10) returns integer language plpgsql as $$
declare v com_host_reservations; n integer := 0;
begin
  for v in select * from com_host_reservations where status = 'open' and created_at < now() - make_interval(mins => p_min) order by created_at limit 500 for update skip locked loop
    update com_host_reservations set status = 'released' where id = v.id;
    update com_host_spend set reserved_microusd = greatest(0, reserved_microusd - v.max_microusd), updated_at = now() where month = v.month;
    n := n + 1;
  end loop;
  return n;
end $$;

-- ── Los números (Configuración › Comunidad) ──
insert into config_keys (key, min, max, def, unit, section, label, help, editable, bloqueo, edit_in, sort) values
  ('anf_espera_min', 5, 1440, 45, '{"es":"min","en":"min"}', 'comunidad', '{"es":"Anfitriones · espera antes de responder","en":"Hosts · wait before replying"}',
    '{"es":"Minutos que una publicación de un vecino lleva sin respuesta de una persona antes de que responda una voz.","en":"Minutes a neighbor''s post goes without a reply from a person before a voice replies."}', true, null, null, 60),
  ('anf_idas_max', 1, 5, 2, '{"es":"respuestas","en":"replies"}', 'comunidad', '{"es":"Anfitriones · respuestas por hilo","en":"Hosts · replies per thread"}',
    '{"es":"Lo más que una voz contesta en un mismo hilo (la segunda solo si el vecino le contestó).","en":"The most a voice replies in one thread (the second only if the neighbor replied to it)."}', true, null, null, 61),
  ('anf_nuevo_dias', 1, 90, 14, '{"es":"días","en":"days"}', 'comunidad', '{"es":"Anfitriones · recién llegado","en":"Hosts · newcomer"}',
    '{"es":"A quien tiene la cuenta de menos días le responde Doña Milagros.","en":"Doña Milagros replies to accounts younger than this."}', true, null, null, 62),
  ('anf_t1_hasta', 1, 100000, 20, '{"es":"de actividad","en":"of activity"}', 'comunidad', '{"es":"Anfitriones · tramo 1 hasta","en":"Hosts · tier 1 up to"}',
    '{"es":"Actividad real = publicaciones y respuestas de vecinos en los últimos 7 días en la ciudad. Por debajo de este número rige el tramo 1.","en":"Real activity = neighbor posts and replies in the city in the last 7 days. Below this number, tier 1 applies."}', true, null, null, 63),
  ('anf_t1_pub', 0, 20, 3, '{"es":"al día","en":"a day"}', 'comunidad', '{"es":"Anfitriones · tramo 1 publicaciones","en":"Hosts · tier 1 posts"}', null, true, null, null, 64),
  ('anf_t1_resp', 0, 50, 10, '{"es":"al día","en":"a day"}', 'comunidad', '{"es":"Anfitriones · tramo 1 respuestas","en":"Hosts · tier 1 replies"}', null, true, null, null, 65),
  ('anf_t2_hasta', 1, 100000, 60, '{"es":"de actividad","en":"of activity"}', 'comunidad', '{"es":"Anfitriones · tramo 2 hasta","en":"Hosts · tier 2 up to"}', null, true, null, null, 66),
  ('anf_t2_pub', 0, 20, 2, '{"es":"al día","en":"a day"}', 'comunidad', '{"es":"Anfitriones · tramo 2 publicaciones","en":"Hosts · tier 2 posts"}', null, true, null, null, 67),
  ('anf_t2_resp', 0, 50, 5, '{"es":"al día","en":"a day"}', 'comunidad', '{"es":"Anfitriones · tramo 2 respuestas","en":"Hosts · tier 2 replies"}', null, true, null, null, 68),
  ('anf_t3_hasta', 1, 100000, 150, '{"es":"de actividad","en":"of activity"}', 'comunidad', '{"es":"Anfitriones · tramo 3 hasta","en":"Hosts · tier 3 up to"}',
    '{"es":"Desde este número en adelante las voces no publican ni responden en esa ciudad.","en":"From this number on, the voices neither post nor reply in that city."}', true, null, null, 69),
  ('anf_t3_pub', 0, 20, 1, '{"es":"al día","en":"a day"}', 'comunidad', '{"es":"Anfitriones · tramo 3 publicaciones","en":"Hosts · tier 3 posts"}', null, true, null, null, 70),
  ('anf_t3_resp', 0, 50, 2, '{"es":"al día","en":"a day"}', 'comunidad', '{"es":"Anfitriones · tramo 3 respuestas","en":"Hosts · tier 3 replies"}', null, true, null, null, 71),
  ('anf_tope_mes_cents', 0, 100000, 500, '{"es":"centavos al mes","en":"cents a month"}', 'comunidad', '{"es":"Anfitriones · tope de costo del modelo","en":"Hosts · model cost cap"}',
    '{"es":"Lo más que pueden gastar las voces en el modelo en un mes. Al llegar, no se publica nada que pida el modelo. Lo propio de la app no gasta.","en":"The most the voices can spend on the model in a month. When reached, nothing that needs the model is posted. App-sourced posts cost nothing."}', true, null, null, 72),
  ('anf_pausa', 0, 1, 0, '{"es":"(1 = en pausa)","en":"(1 = paused)"}', 'comunidad', '{"es":"Anfitriones · pausar a todos","en":"Hosts · pause all"}',
    '{"es":"Con 1, ninguna voz publica ni responde en ninguna ciudad. Se cambia en Contenido › Anfitriones.","en":"With 1, no voice posts or replies in any city. Changed in Content › Hosts."}', true, null, '/admin/contenido?tab=anf', 73)
on conflict (key) do nothing;

commit;
