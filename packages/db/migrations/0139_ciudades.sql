-- 0139 · Ciudades (Fase 9 · 9i; fase9-apertura.md §2 «0139», §4 9i; LAUNCH L41, L64, L71): el asistente de apertura de 7 pasos, la regla de apertura de
-- cada ciudad, la lista de espera avisada UNA vez el día que abre, el estado «beta» (solo entran las cuentas invitadas y las de revisión), cerrar con
-- motivo y otra persona, los barrios que el equipo edita y el aviso al instante de cada cambio (NOTIFY 'ciudades').
-- Reglas:
--   · Una ciudad pasa a «on» SOLO con el asistente: la transacción que la abre dice cuál (tl.apertura) y la base revisa que ese asistente sea de esa ciudad,
--     siga en curso y tenga sus pasos 1–6. Bajar una ciudad abierta o en beta (a beta, soon u off) pide un cierre aprobado por OTRA persona (tl.cierre).
--     Solo en la base del sandbox (la que recibió la semilla de pruebas) se deja el cambio directo de las semillas y las pruebas, y queda anotado «directo».
--   · Los pasos del asistente solo avanzan, uno a la vez, y no se cambian ni se borran; el libro de estados y los avisos de apertura son de solo inserción;
--     nada se borra (estados), salvo la purga de una cuenta borrada (tl.purga) en lo que el mapa de datos dice.
--   · Sin dependencias de 0140/0141: en el sandbox esta migración corre DESPUÉS de ellas (por nombre) y en una base nueva ANTES. Las listas de los checks
--     que otros bloques amplían (config_keys.section, email_outbox.tpl) se amplían sin pisar lo que haya.
-- Idempotente: aplicarla dos veces no cambia nada.
begin;

-- ── Estados: on · beta · soon · off ──
alter table cities drop constraint if exists cities_status_check;
alter table cities add constraint cities_status_check check (status in ('on', 'beta', 'soon', 'off'));
alter table cities add column if not exists beta_at timestamptz;
alter table cities add column if not exists closed_at timestamptz;

-- ¿Es la base del sandbox? (la semilla del sandbox dice «pruebas», o ya recibió alguna semilla de pruebas: la semilla 0002 abre Hazleton antes de que
-- 0053 escriba el entorno). Producción nunca recibe la semilla de pruebas (guardián semilla), así que allí es siempre falso.
create or replace function ciudades_sandbox() returns boolean language plpgsql stable as $$
declare n boolean := false;
begin
  if legal_entorno() = 'pruebas' then return true; end if;
  if to_regclass('public.schema_seeds') is not null then
    execute $q$select exists (select 1 from schema_seeds where name like 'pruebas/%')$q$ into n;
  end if;
  return coalesce(n, false);
end $$;

-- ── La regla de apertura de cada ciudad (pantallas-iniciales.md: mínimo por categoría clave; prototipo: 300 en lista o 30 negocios listos) ──
-- Cumple = (negocios listos >= min_ready o en lista >= min_waitlist) y cada categoría clave con su mínimo. ok y checked_at los escribe el servidor al
-- comprobar (paso 6), nunca el equipo a mano. Los mínimos los cambia un Admin con motivo (auditoría).
create table if not exists city_open_rules (
  city_id           text primary key references cities (id),
  min_waitlist      integer not null default 300 check (min_waitlist between 0 and 1000000),
  min_ready         integer not null default 30 check (min_ready between 0 and 100000),
  min_por_categoria jsonb not null default '{"NEG-FOOD":1,"NEG-BELL":1,"NEG-HOGAR":1,"NEG-FIESTA":1,"NEG-FE":1}'::jsonb
                    check (jsonb_typeof(min_por_categoria) = 'object'),
  checked_at        timestamptz,
  ok                boolean,
  updated_by        uuid references users (id),
  updated_at        timestamptz not null default now()
);
insert into city_open_rules (city_id) select id from cities on conflict (city_id) do nothing;

-- ── El asistente de apertura ──
-- Un asistente por apertura (una ciudad cerrada que vuelve a abrir empieza otro). En curso → abierta (con sus 7 pasos) o cancelada (con motivo).
create table if not exists city_launches (
  id            bigint generated always as identity primary key,
  city_id       text not null references cities (id),
  status        text not null default 'en_curso' check (status in ('en_curso', 'abierta', 'cancelada')),
  started_by    uuid not null references users (id),
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  cancelled_by  uuid references users (id),
  cancel_reason text check (cancel_reason is null or char_length(cancel_reason) between 3 and 300),
  check ((status = 'cancelada') = (cancelled_by is not null and cancel_reason is not null))
);
create unique index if not exists city_launches_uno_en_curso on city_launches (city_id) where status = 'en_curso';
create index if not exists city_launches_ciudad_idx on city_launches (city_id, id desc);

-- Los 7 pasos: 1 Ciudad y centro · 2 Radio y barrios · 3 Categorías de arranque · 4 Equipo local · 5 Negocios listos · 6 Comprobar · 7 Avisar a la lista
-- (el 7 se escribe en la misma transacción que abre la ciudad). Cada paso con quién, cuándo, su evidencia (lo que el servidor vio) y el motivo.
create table if not exists city_launch_steps (
  launch_id bigint not null references city_launches (id),
  step      smallint not null check (step between 1 and 7),
  city_id   text not null references cities (id),
  done_by   uuid not null references users (id),
  done_at   timestamptz not null default now(),
  evidence  jsonb not null check (jsonb_typeof(evidence) = 'object' and evidence <> '{}'::jsonb),
  reason    text not null check (char_length(reason) between 3 and 300),
  primary key (launch_id, step)
);
create index if not exists city_launch_steps_ciudad_idx on city_launch_steps (city_id, done_at desc);

create or replace function city_launch_steps_reglas() returns trigger language plpgsql as $$
declare l record; m smallint;
begin
  if tg_op <> 'INSERT' then raise exception 'ciudad_paso: un paso del asistente no se cambia ni se borra (solo avanza)'; end if;
  select city_id, status into l from city_launches where id = new.launch_id for update;
  if not found then raise exception 'ciudad_paso: ese asistente no existe'; end if;
  if l.status <> 'en_curso' then raise exception 'ciudad_paso: ese asistente ya terminó'; end if;
  if l.city_id <> new.city_id then raise exception 'ciudad_paso: el paso es de otra ciudad'; end if;
  select coalesce(max(step), 0) into m from city_launch_steps where launch_id = new.launch_id;
  if new.step <> m + 1 then raise exception 'ciudad_paso: el asistente solo avanza, un paso a la vez (toca el paso %)', m + 1; end if;
  new.done_at := now();
  return new;
end $$;
drop trigger if exists city_launch_steps_reglas on city_launch_steps;
create trigger city_launch_steps_reglas before insert or update or delete on city_launch_steps for each row execute function city_launch_steps_reglas();

create or replace function city_launches_reglas() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'ciudad_asistente: un asistente de apertura no se borra (estados)'; end if;
  if tg_op = 'INSERT' then
    if new.status <> 'en_curso' then raise exception 'ciudad_asistente: un asistente empieza en curso'; end if;
    return new;
  end if;
  if new.city_id <> old.city_id or new.started_by <> old.started_by or new.started_at <> old.started_at then
    raise exception 'ciudad_asistente: no cambia de ciudad, de persona ni de fecha';
  end if;
  if old.status <> 'en_curso' then raise exception 'ciudad_asistente: un asistente terminado no cambia'; end if;
  if new.status = 'abierta' then
    if (select count(*) from city_launch_steps where launch_id = new.id) < 7 then raise exception 'ciudad_asistente: faltan pasos para abrir'; end if;
    if (select status from cities where id = new.city_id) <> 'on' then raise exception 'ciudad_asistente: la ciudad no quedó abierta'; end if;
  end if;
  if new.status <> 'en_curso' then new.finished_at := now(); end if;
  return new;
end $$;
drop trigger if exists city_launches_reglas on city_launches;
create trigger city_launches_reglas before insert or update or delete on city_launches for each row execute function city_launches_reglas();

-- ── Cerrar (o bajar) una ciudad abierta o en beta: lo pide una persona con motivo, lo aprueba OTRA ──
create table if not exists city_close_requests (
  id              bigint generated always as identity primary key,
  city_id         text not null references cities (id),
  from_status     text not null check (from_status in ('on', 'beta')),
  to_status       text not null check (to_status in ('beta', 'soon', 'off')),
  requested_by    uuid not null references users (id),
  reason          text not null check (char_length(reason) between 3 and 300),
  requested_at    timestamptz not null default now(),
  status          text not null default 'pendiente' check (status in ('pendiente', 'aprobada', 'rechazada', 'retirada')),
  decided_by      uuid references users (id),
  decided_at      timestamptz,
  decision_reason text check (decision_reason is null or char_length(decision_reason) between 3 and 300),
  check (from_status <> to_status),
  check (decided_by is null or decided_by <> requested_by),
  check ((status in ('aprobada', 'rechazada')) = (decided_by is not null)),
  check ((status = 'pendiente') = (decided_at is null))
);
create unique index if not exists city_close_requests_una on city_close_requests (city_id) where status = 'pendiente';

create or replace function city_close_requests_reglas() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'ciudad_cierre: un pedido de cierre no se borra (estados)'; end if;
  if tg_op = 'INSERT' then
    if new.status <> 'pendiente' then raise exception 'ciudad_cierre: un pedido empieza pendiente'; end if;
    return new;
  end if;
  if old.status <> 'pendiente' then raise exception 'ciudad_cierre: un pedido decidido no cambia'; end if;
  if new.city_id <> old.city_id or new.from_status <> old.from_status or new.to_status <> old.to_status or new.requested_by <> old.requested_by
     or new.reason <> old.reason or new.requested_at <> old.requested_at then
    raise exception 'ciudad_cierre: de un pedido solo cambia su decisión';
  end if;
  if new.status = 'aprobada' and new.decided_by = new.requested_by then raise exception 'ciudad_cierre: lo aprueba otra persona, no quien lo pidió'; end if;
  if new.status <> 'pendiente' then new.decided_at := now(); end if;
  return new;
end $$;
drop trigger if exists city_close_requests_reglas on city_close_requests;
create trigger city_close_requests_reglas before insert or update or delete on city_close_requests for each row execute function city_close_requests_reglas();

-- ── El libro de los estados (solo inserción): cada cambio de cities.status, por dónde vino, quién y por qué ──
create table if not exists city_status_log (
  id          bigint generated always as identity primary key,
  city_id     text not null references cities (id),
  from_status text not null,
  to_status   text not null,
  via         text not null check (via in ('asistente', 'cierre', 'equipo', 'directo')),
  launch_id   bigint references city_launches (id),
  close_id    bigint references city_close_requests (id),
  actor       uuid references users (id),
  reason      text check (reason is null or char_length(reason) <= 300),
  at          timestamptz not null default now()
);
create index if not exists city_status_log_ciudad_idx on city_status_log (city_id, at desc);
create or replace function city_status_log_no_cambia() returns trigger language plpgsql as $$
begin
  raise exception 'city_status_log es solo de inserción';
end $$;
drop trigger if exists city_status_log_no_cambia on city_status_log;
create trigger city_status_log_no_cambia before update or delete on city_status_log for each row execute function city_status_log_no_cambia();

-- ── Quién entra a una ciudad en beta: las invitaciones (y las cuentas de revisión de Apple y Google, review_accounts activas) ──
create table if not exists city_beta_invites (
  id          bigint generated always as identity primary key,
  city_id     text not null references cities (id),
  user_id     uuid not null references users (id),
  invited_by  uuid not null references users (id),
  reason      text not null check (char_length(reason) between 3 and 300),
  created_at  timestamptz not null default now(),
  revoked_at  timestamptz,
  revoked_by  uuid references users (id),
  is_test     boolean not null default false,
  check ((revoked_at is null) = (revoked_by is null))
);
create unique index if not exists city_beta_invites_viva on city_beta_invites (city_id, user_id) where revoked_at is null;
create index if not exists city_beta_invites_persona_idx on city_beta_invites (user_id) where revoked_at is null;
create or replace function city_beta_invites_reglas() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    if coalesce(current_setting('tl.purga', true), '') = 'si' then return old; end if;
    raise exception 'una invitación no se borra: se quita (revoked_at)';
  end if;
  if new.city_id <> old.city_id or new.user_id <> old.user_id or new.invited_by <> old.invited_by or new.created_at <> old.created_at or new.reason <> old.reason then
    raise exception 'de una invitación solo cambia que se quitó';
  end if;
  if old.revoked_at is not null then raise exception 'una invitación quitada no vuelve: se invita otra vez'; end if;
  return new;
end $$;
drop trigger if exists city_beta_invites_reglas on city_beta_invites;
create trigger city_beta_invites_reglas before update or delete on city_beta_invites for each row execute function city_beta_invites_reglas();

-- ¿Esta persona ve esta ciudad abierta? on → todos; beta → solo invitados y cuentas de revisión activas; soon / off → nadie.
create or replace function ciudad_abierta_para(p_city text, p_user uuid) returns boolean language sql stable as $$
  select coalesce((
    select c.status = 'on' or (c.status = 'beta' and p_user is not null and (
             exists (select 1 from city_beta_invites i where i.city_id = c.id and i.user_id = p_user and i.revoked_at is null)
          or exists (select 1 from review_accounts r where r.user_id = p_user and r.active)))
      from cities c where c.id = p_city), false)
$$;

-- ── El cambio de estado: la regla de la base ──
create or replace function cities_estado() returns trigger language plpgsql as $$
declare
  ap text := nullif(current_setting('tl.apertura', true), '');
  ci text := nullif(current_setting('tl.cierre', true), '');
  actor text := nullif(current_setting('tl.actor', true), '');
  motivo text := nullif(current_setting('tl.motivo', true), '');
  rk_old int; rk_new int; n int; via text; l record; r record;
begin
  if new.status is not distinct from old.status then return new; end if;
  rk_old := case old.status when 'on' then 3 when 'beta' then 2 when 'soon' then 1 else 0 end;
  rk_new := case new.status when 'on' then 3 when 'beta' then 2 when 'soon' then 1 else 0 end;
  via := case when ap is not null then 'asistente' when ci is not null then 'cierre' when actor is not null then 'equipo' else 'directo' end;
  if new.status = 'on' then
    if ap is not null then
      select id, city_id, status into l from city_launches where id = ap::bigint;
      if not found or l.city_id <> new.id or l.status <> 'en_curso' then raise exception 'ciudad_apertura: ese asistente no es de esta ciudad o ya terminó'; end if;
      select count(*) into n from city_launch_steps where launch_id = l.id and step between 1 and 6;
      if n < 6 then raise exception 'ciudad_apertura: faltan pasos del asistente (% de 6 antes de abrir)', n; end if;
    elsif not ciudades_sandbox() then
      raise exception 'ciudad_apertura: una ciudad solo abre con el asistente (Super Admin › Ciudades)';
    end if;
    new.opened_at := now(); new.closed_at := null; new.closed_reason := null;
  elsif rk_old >= 2 and rk_new < rk_old then
    if ci is not null then
      select id, city_id, status, to_status, requested_by, decided_by, reason into r from city_close_requests where id = ci::bigint;
      if not found or r.city_id <> new.id or r.status <> 'aprobada' or r.to_status <> new.status or r.decided_by is null or r.decided_by = r.requested_by then
        raise exception 'ciudad_cierre: cerrar una ciudad abierta pide un cierre aprobado por otra persona';
      end if;
      motivo := coalesce(motivo, r.reason);
    elsif not ciudades_sandbox() then
      raise exception 'ciudad_cierre: cerrar una ciudad abierta pide motivo y otra persona (Super Admin › Ciudades)';
    end if;
    new.closed_at := now(); new.closed_reason := left(coalesce(motivo, new.closed_reason), 300);
  end if;
  if new.status = 'beta' then new.beta_at := now(); end if;
  insert into city_status_log (city_id, from_status, to_status, via, launch_id, close_id, actor, reason)
  values (new.id, old.status, new.status, via, case when via = 'asistente' then ap::bigint end, case when via = 'cierre' then ci::bigint end,
          case when actor ~ '^[0-9a-f-]{36}$' then actor::uuid end, left(motivo, 300));
  return new;
end $$;
drop trigger if exists cities_estado on cities;
create trigger cities_estado before update of status on cities for each row execute function cities_estado();

-- ── Al instante en todos los procesos (L71): cada cambio de una ciudad, sus barrios o sus invitaciones avisa por NOTIFY 'ciudades' ──
create or replace function ciudades_avisar() returns trigger language plpgsql as $$
begin
  perform pg_notify('ciudades', tg_table_name);
  return null;
end $$;
drop trigger if exists cities_avisa_ciudades on cities;
create trigger cities_avisa_ciudades after insert or update or delete on cities for each statement execute function ciudades_avisar();
drop trigger if exists zones_avisa_ciudades on zones;
create trigger zones_avisa_ciudades after insert or update or delete on zones for each statement execute function ciudades_avisar();
drop trigger if exists city_beta_invites_avisa_ciudades on city_beta_invites;
create trigger city_beta_invites_avisa_ciudades after insert or update or delete on city_beta_invites for each statement execute function ciudades_avisar();

-- ── Barrios: el equipo los agrega, corrige y retira (nada se borra); la semilla del catálogo no pisa lo que el equipo cambió ──
alter table zones add column if not exists edited_by uuid references users (id);
alter table zones add column if not exists edited_at timestamptz;
alter table zones add column if not exists retired_at timestamptz;
alter table zones add column if not exists retired_by uuid references users (id);
create or replace function zones_reglas() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'un barrio no se borra: se retira (retired_at)'; end if;
  if new.city_id <> old.city_id or new.id <> old.id then raise exception 'un barrio no cambia de ciudad ni de clave'; end if;
  if old.retired_at is not null and (new.retired_at is null or new.retired_at <> old.retired_at) then raise exception 'un barrio retirado no vuelve: se agrega otro'; end if;
  return new;
end $$;
drop trigger if exists zones_reglas on zones;
create trigger zones_reglas before update or delete on zones for each row execute function zones_reglas();

-- ── La lista de espera avisada UNA vez (9h la dejó lista: city_waitlist source coming_soon y early_access.notified_at) ──
alter table city_waitlist add column if not exists notice_result text;
alter table city_waitlist drop constraint if exists city_waitlist_notice_result_check;
alter table city_waitlist add constraint city_waitlist_notice_result_check check (notice_result is null or notice_result in ('avisado', 'ya_avisado', 'sin_cuenta'));
alter table city_waitlist add column if not exists notice_launch_id bigint references city_launches (id);
create index if not exists city_waitlist_por_avisar_idx on city_waitlist (city_id, id) where notified_at is null and removed_at is null and city_id is not null;
create index if not exists early_access_por_avisar_idx on early_access (city_id, id) where notified_at is null and removed_at is null and city_id is not null;

-- Un aviso de apertura por persona y ciudad (solo inserción; la purga de una cuenta borrada se lo lleva).
create table if not exists city_notices (
  id         bigint generated always as identity primary key,
  city_id    text not null references cities (id),
  launch_id  bigint not null references city_launches (id),
  user_id    uuid not null references users (id),
  por_correo boolean not null default false,
  at         timestamptz not null default now(),
  unique (city_id, user_id)
);
create index if not exists city_notices_lanzamiento_idx on city_notices (launch_id);
create or replace function city_notices_reglas() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' and coalesce(current_setting('tl.purga', true), '') = 'si' then return old; end if;
  raise exception 'city_notices es solo de inserción';
end $$;
drop trigger if exists city_notices_reglas on city_notices;
create trigger city_notices_reglas before update or delete on city_notices for each row execute function city_notices_reglas();

-- La plantilla del aviso (push primero; SMS solo si no hay teléfono con avisos — la landing promete UN mensaje de texto; correo aparte si está verificado).
insert into notif_templates (key, grp, pref, sms, sms_mode, push, push_private, title, body) values
  ('ciudad_abierta', 'tx', null, true, 'sin_push', true, false, '{"es":"To''Latino ya abrió en {ciudad}","en":"To''Latino is now open in {ciudad}"}',
    '{"es":"Ya puedes ver los negocios, los eventos y la comunidad de {ciudad}. Te lo avisamos una sola vez, como prometimos.","en":"You can now see the businesses, events and community of {ciudad}. We tell you just once, as promised."}')
on conflict (key) do nothing;
do $$
declare d text;
begin
  select pg_get_constraintdef(oid) into d from pg_constraint where conname = 'email_outbox_tpl_check' and conrelid = 'email_outbox'::regclass;
  -- Se agrega «city_open» a la lista que haya (otro bloque puede agregar sus plantillas antes o después): nunca se pierde una.
  if d is not null and position('''city_open''' in d) = 0 then
    execute 'alter table email_outbox drop constraint email_outbox_tpl_check';
    execute 'alter table email_outbox add constraint email_outbox_tpl_check ' || replace(d, 'ARRAY[', 'ARRAY[''city_open''::text, ');
  end if;
end $$;

-- ── Configuración › Ciudades ──
do $$
declare d text;
begin
  select pg_get_constraintdef(oid) into d from pg_constraint where conname = 'config_keys_section_check' and conrelid = 'config_keys'::regclass;
  -- Se agrega «ciudades» a la lista que haya (otro bloque puede haber agregado su sección antes o después): nunca se pierde una.
  if d is not null and position('''ciudades''' in d) = 0 then
    execute 'alter table config_keys drop constraint config_keys_section_check';
    execute 'alter table config_keys add constraint config_keys_section_check ' || replace(d, 'ARRAY[', 'ARRAY[''ciudades''::text, ');
  end if;
end $$;
insert into config_keys (key, min, max, def, unit, section, label, help, editable, bloqueo, edit_in, sort) values
  ('ciudad_aviso_lote', 50, 5000, 500, '{"es":"personas por pasada","en":"people per pass"}', 'ciudades', '{"es":"Aviso de apertura · personas por pasada del barrido","en":"Opening notice · people per sweep pass"}',
    '{"es":"El día que abre una ciudad, su lista de espera recibe el aviso por partes: este número por minuto, solo de 9 AM a 9 PM de la ciudad.","en":"The day a city opens, its waitlist gets the notice in parts: this many per minute, only from 9 AM to 9 PM city time."}',
    true, null, null, 960)
on conflict (key) do update set min = excluded.min, max = excluded.max, def = excluded.def, unit = excluded.unit, section = excluded.section,
  label = excluded.label, help = excluded.help, editable = excluded.editable, bloqueo = excluded.bloqueo, edit_in = excluded.edit_in, sort = excluded.sort;

commit;
