-- 0173 · C-002 (canvas tolatino-master+, project/entrega/cambios.md, «LISTO PARA CÓDIGO» 10 nov) — Patrocinados de la página de categoría.
-- Un negocio (Free o Pro) compra un puesto en «Patrocinados» de su categoría y su ciudad: 6 puestos por categoría y ciudad (patrocinio_puestos),
-- por 1 semana o 1 mes, desde hoy u otra fecha (reservado). Se paga con la tarjeta guardada de quien compra (cobro directo a To'Latino, como Pro).
-- Lo decide la base:
--   · sponsorships: un patrocinio por período (reservado · activo · terminado · cancelado). Nada se borra; lo que define el período (negocio,
--     categoría, ciudad, fechas, precio, quién paga) no cambia después de pagar. Una renovación es otra fila (renewed_from).
--   · patrocinio_reglas: nunca más de patrocinio_puestos vivos a la vez en una categoría y ciudad (con candado por categoría y ciudad), y un
--     negocio no tiene dos patrocinios que se crucen en la misma categoría. Los estados solo van hacia adelante.
--   · sponsorship_payments: el libro del dinero de los patrocinios (de negocios y, desde 0174, de eventos), solo inserción.
--   · sponsorship_stats: las cifras (vistas, entraron, pedidos), derivadas: solo las escriben las funciones de la base, nunca la app a mano.
--   · sponsorship_views: a quién se le mostró hoy (para contar una vista por persona o dispositivo y día; se purga a los 2 días).
--   · sponsorship_entries: quién entró desde la tarjeta patrocinada (una vez por persona o dispositivo y día), solo inserción; de aquí salen
--     «entraron» y los pedidos que llegaron por el patrocinio.
--   · sponsorship_waits: «Avísame si se libera antes» (sin puestos libres).
-- Los precios y los puestos se cambian en Super Admin › Configuración › Crecimiento. Idempotente.
begin;

create or replace function pg_temp.ampliar_check(t regclass, nombre text, valores text[]) returns void language plpgsql as $$
declare d text; v text; nuevo text := '';
begin
  select pg_get_constraintdef(oid) into d from pg_constraint where conname = nombre and conrelid = t;
  if d is null then return; end if;
  foreach v in array valores loop
    if position(quote_literal(v) in d) = 0 then nuevo := nuevo || quote_literal(v) || '::text, '; end if;
  end loop;
  if nuevo = '' then return; end if;
  execute format('alter table %s drop constraint %I', t, nombre);
  execute format('alter table %s add constraint %I %s', t, nombre, replace(d, 'ARRAY[', 'ARRAY[' || nuevo));
end $$;

-- ── Configuración › Crecimiento ──
insert into config_keys (key, min, max, def, unit, section, label, help, editable, bloqueo, edit_in, sort) values
  ('patrocinio_puestos', 1, 12, 6, '{"es":"puestos","en":"slots"}', 'crecimiento', '{"es":"Patrocinados · puestos por categoría y ciudad","en":"Sponsored · slots per category and city"}',
    '{"es":"Cuántos negocios pueden estar en Patrocinados a la vez en una categoría de una ciudad. Bajarlo no quita a nadie: deja de vender puestos hasta que queden menos.","en":"How many businesses can be in Sponsored at once in a category of a city. Lowering it removes nobody: it stops selling slots until fewer remain."}', true, null, null, 1020),
  ('patrocinio_semana_cents', 100, 100000, 1500, '{"es":"centavos","en":"cents"}', 'crecimiento', '{"es":"Patrocinados · precio de 1 semana","en":"Sponsored · price for 1 week"}',
    '{"es":"Lo que paga un negocio por 1 semana en Patrocinados de su categoría. Lo ya pagado no cambia.","en":"What a business pays for 1 week in Sponsored of its category. What was already paid does not change."}', true, null, null, 1021),
  ('patrocinio_mes_cents', 100, 300000, 4500, '{"es":"centavos","en":"cents"}', 'crecimiento', '{"es":"Patrocinados · precio de 1 mes","en":"Sponsored · price for 1 month"}',
    '{"es":"Lo que paga un negocio por 1 mes en Patrocinados de su categoría. Lo ya pagado no cambia.","en":"What a business pays for 1 month in Sponsored of its category. What was already paid does not change."}', true, null, null, 1022),
  ('patrocinio_dias_adelante', 1, 120, 60, '{"es":"días","en":"days"}', 'crecimiento', '{"es":"Patrocinados · hasta cuántos días adelante se reserva","en":"Sponsored · how many days ahead it can be booked"}',
    '{"es":"Un negocio puede elegir que su patrocinio empiece otro día (o reservar cuando no hay puestos) hasta estos días adelante.","en":"A business can choose to start its sponsorship another day (or book ahead when there are no slots) up to this many days ahead."}', true, null, null, 1023)
on conflict (key) do nothing;

-- ── Patrocinios de negocios ──
create table if not exists sponsorships (
  id            bigint generated always as identity primary key,
  business_id   text not null references businesses (id),
  category_id   text not null references categories (id),
  city_id       text not null references cities (id),
  starts_at     timestamptz not null,
  ends_at       timestamptz not null,
  duration      text not null check (duration in ('week', 'month')),
  status        text not null check (status in ('reservado', 'activo', 'terminado', 'cancelado')),
  price_cents   integer not null check (price_cents > 0),
  payer_user_id uuid not null references users (id),
  card_pm       text,
  auto_renew    boolean not null default false,
  renewed_from  bigint references sponsorships (id),
  end_kind      text check (end_kind in ('vencio', 'dueno', 'admin', 'sin_negocio')),
  end_reason    text check (end_reason is null or length(end_reason) between 3 and 300),
  ended_at      timestamptz,
  ended_by      uuid references users (id),
  renew_note    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (ends_at > starts_at),
  check ((status in ('terminado', 'cancelado')) = (ended_at is not null)),
  check (end_kind <> 'admin' or end_reason is not null)
);
-- Lo vivo de una categoría en una ciudad (la vitrina y los puestos) y lo de cada negocio (el panel).
create index if not exists sponsorships_vivos_idx on sponsorships (city_id, category_id, starts_at, ends_at) where status in ('reservado', 'activo');
create index if not exists sponsorships_negocio_idx on sponsorships (business_id, created_at desc);
create index if not exists sponsorships_ciudad_idx on sponsorships (city_id, created_at desc, id desc);
create index if not exists sponsorships_vencen_idx on sponsorships (ends_at) where status = 'activo';
create index if not exists sponsorships_empiezan_idx on sponsorships (starts_at) where status = 'reservado';
create unique index if not exists sponsorships_una_renovacion on sponsorships (renewed_from) where renewed_from is not null;

-- Cuántos patrocinios vivos se cruzan con [a, b) en el peor momento (el máximo a la vez). `fuera` = la fila que se está revisando.
create or replace function patrocinio_a_la_vez(ciudad text, cat text, a timestamptz, b timestamptz, fuera bigint) returns integer language sql stable as $$
  select coalesce(max((select count(*) from sponsorships s2 where s2.city_id = ciudad and s2.category_id = cat and s2.status in ('reservado', 'activo')
                         and s2.id is distinct from fuera and s2.starts_at <= p.t and s2.ends_at > p.t)), 0)::int
    from (select a as t union select s.starts_at from sponsorships s where s.city_id = ciudad and s.category_id = cat and s.status in ('reservado', 'activo')
            and s.id is distinct from fuera and s.starts_at > a and s.starts_at < b) p
$$;

create or replace function patrocinio_reglas() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'sponsorships: un patrocinio no se borra (estados)'; end if;
  if tg_op = 'UPDATE' then
    if new.business_id <> old.business_id or new.category_id <> old.category_id or new.city_id <> old.city_id or new.starts_at <> old.starts_at
       or new.ends_at <> old.ends_at or new.duration <> old.duration or new.price_cents <> old.price_cents or new.payer_user_id <> old.payer_user_id
       or new.renewed_from is distinct from old.renewed_from then
      raise exception 'sponsorships: lo pagado no cambia (negocio, categoría, ciudad, fechas, precio, quién paga)';
    end if;
    if old.status in ('terminado', 'cancelado') and new.status is distinct from old.status then
      raise exception 'patrocinio_estado: de % no se pasa a %', old.status, new.status;
    end if;
    if old.status = 'activo' and new.status = 'reservado' then raise exception 'patrocinio_estado: de activo no se vuelve a reservado'; end if;
    -- El período no cambia después de pagar: los puestos se revisaron al comprarlo (bajar los puestos no quita a nadie).
    new.updated_at := now();
    return new;
  end if;
  if new.status in ('reservado', 'activo') then
    perform pg_advisory_xact_lock(hashtextextended('pat:' || new.city_id || ':' || new.category_id, 0));
    if exists (select 1 from sponsorships s where s.business_id = new.business_id and s.category_id = new.category_id and s.city_id = new.city_id
                 and s.status in ('reservado', 'activo') and s.id is distinct from new.id and s.starts_at < new.ends_at and s.ends_at > new.starts_at) then
      raise exception 'patrocinio_cruza: ese negocio ya tiene un patrocinio en esas fechas';
    end if;
    if public.patrocinio_a_la_vez(new.city_id, new.category_id, new.starts_at, new.ends_at, new.id) >= public.cfg_int('patrocinio_puestos') then
      raise exception 'patrocinio_sin_puestos: no quedan puestos en esas fechas';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists sponsorships_reglas on sponsorships;
create trigger sponsorships_reglas before insert or update or delete on sponsorships for each row execute function patrocinio_reglas();

-- ── El libro del dinero de los patrocinios (negocios y eventos), solo inserción ──
create table if not exists sponsorship_payments (
  id            bigint generated always as identity primary key,
  kind          text not null check (kind in ('negocio')),
  ref_id        bigint not null,
  business_id   text not null references businesses (id),
  city_id       text not null references cities (id),
  payer_user_id uuid not null references users (id),
  amount_cents  integer not null check (amount_cents > 0),
  pi            text not null unique,
  idem_key      text not null unique,
  card_brand    text,
  card_last4    text,
  reason        text not null check (reason in ('compra', 'renovacion')),
  created_at    timestamptz not null default now()
);
create index if not exists sponsorship_payments_ref_idx on sponsorship_payments (kind, ref_id, created_at);
create index if not exists sponsorship_payments_dia_idx on sponsorship_payments (created_at);
create or replace function patrocinio_pago_solo_insercion() returns trigger language plpgsql as $$
begin
  raise exception 'sponsorship_payments es solo de inserción';
end $$;
drop trigger if exists sponsorship_payments_no_cambia on sponsorship_payments;
create trigger sponsorship_payments_no_cambia before update or delete on sponsorship_payments for each row execute function patrocinio_pago_solo_insercion();

-- ── Quién entró desde la tarjeta patrocinada (una vez por persona o dispositivo y día), solo inserción ──
create table if not exists sponsorship_entries (
  id       bigint generated always as identity primary key,
  kind     text not null check (kind in ('negocio')),
  ref_id   bigint not null,
  user_id  uuid references users (id),
  device   uuid,
  day      date not null default (now() at time zone 'America/New_York')::date,
  at       timestamptz not null default now(),
  check (user_id is not null or device is not null)
);
create unique index if not exists sponsorship_entries_una_al_dia on sponsorship_entries (kind, ref_id, coalesce(user_id::text, device::text), day);
create index if not exists sponsorship_entries_persona_idx on sponsorship_entries (kind, ref_id, user_id, at) where user_id is not null;
-- Solo la purga de una cuenta borrada (lib/datos/purgar.ts, tl.purga en su transacción) quita sus filas; las cifras derivadas se quedan.
create or replace function patrocinio_entrada_solo_insercion() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' and coalesce(current_setting('tl.purga', true), '') = 'si' then return old; end if;
  raise exception 'sponsorship_entries es solo de inserción';
end $$;
drop trigger if exists sponsorship_entries_no_cambia on sponsorship_entries;
create trigger sponsorship_entries_no_cambia before update or delete on sponsorship_entries for each row execute function patrocinio_entrada_solo_insercion();

-- ── Las cifras (derivadas): solo las escriben las funciones de abajo ──
create table if not exists sponsorship_stats (
  kind       text not null check (kind in ('negocio')),
  ref_id     bigint not null,
  views      bigint not null default 0 check (views >= 0),
  entries    integer not null default 0 check (entries >= 0),
  orders     integer not null default 0 check (orders >= 0),
  updated_at timestamptz not null default now(),
  primary key (kind, ref_id)
);
create or replace function patrocinio_cifras_no_editables() returns trigger language plpgsql as $$
begin
  if coalesce(current_setting('tl.patrocinio_cifras', true), '') <> 'on' then
    raise exception 'derivado_no_editable: las cifras de un patrocinio las escribe solo la base (patrocinio_vistas, patrocinio_entro, patrocinio_cifras_al_dia)';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
drop trigger if exists sponsorship_stats_no_editable on sponsorship_stats;
create trigger sponsorship_stats_no_editable before insert or update or delete on sponsorship_stats for each row execute function patrocinio_cifras_no_editables();

-- Vistas: la vitrina se mostró a alguien. Una vez por persona (o dispositivo) y día por patrocinio; solo cuenta lo activo. Las filas del día
-- (sponsorship_views) solo sirven para no contar dos veces: el barrido borra las de hace más de 2 días (son técnicas, no un historial).
create table if not exists sponsorship_views (
  kind    text not null check (kind in ('negocio')),
  ref_id  bigint not null,
  who     text not null check (length(who) between 3 and 60),
  day     date not null default (now() at time zone 'America/New_York')::date,
  primary key (kind, ref_id, who, day)
);
create index if not exists sponsorship_views_dia_idx on sponsorship_views (day);
create or replace function patrocinio_vistas(k text, ids bigint[], quien uuid, dev uuid) returns integer language plpgsql as $$
declare n int;
begin
  if quien is null and dev is null then return 0; end if;
  perform set_config('tl.patrocinio_cifras', 'on', true);
  with nuevas as (
    insert into sponsorship_views (kind, ref_id, who)
      select k, s.id, coalesce('u:' || quien::text, 'd:' || dev::text) from sponsorships s where k = 'negocio' and s.id = any(ids) and s.status = 'activo'
      on conflict do nothing returning ref_id),
       sumadas as (
    insert into sponsorship_stats (kind, ref_id, views) select k, ref_id, 1 from nuevas
      on conflict (kind, ref_id) do update set views = sponsorship_stats.views + 1, updated_at = now() returning 1)
  select count(*) into n from sumadas;
  perform set_config('tl.patrocinio_cifras', 'off', true);
  return n;
end $$;

-- Entró: alguien tocó la tarjeta patrocinada. Una vez por persona (o dispositivo) y día; devuelve true si contó.
create or replace function patrocinio_entro(k text, id bigint, quien uuid, dev uuid) returns boolean language plpgsql as $$
declare nuevo bigint;
begin
  if quien is null and dev is null then return false; end if;
  if k = 'negocio' and not exists (select 1 from sponsorships s where s.id = patrocinio_entro.id and s.status = 'activo') then return false; end if;
  insert into sponsorship_entries (kind, ref_id, user_id, device) values (k, id, quien, dev) on conflict do nothing returning sponsorship_entries.id into nuevo;
  if nuevo is null then return false; end if;
  perform set_config('tl.patrocinio_cifras', 'on', true);
  insert into sponsorship_stats (kind, ref_id, entries) values (k, id, 1)
    on conflict (kind, ref_id) do update set entries = sponsorship_stats.entries + 1, updated_at = now();
  perform set_config('tl.patrocinio_cifras', 'off', true);
  return true;
end $$;

-- Pedidos: los pedidos (operaciones) del negocio que hizo, durante el patrocinio, alguien que antes entró desde la tarjeta patrocinada.
-- La corre el barrido para lo vivo y lo que terminó hace menos de 2 días.
create or replace function patrocinio_cifras_al_dia() returns integer language plpgsql as $$
declare n int := 0;
begin
  perform set_config('tl.patrocinio_cifras', 'on', true);
  with s as (select id, business_id, starts_at, ends_at from sponsorships where status = 'activo' or (status = 'terminado' and ended_at > now() - interval '2 days')),
       c as (select s.id, (select count(distinct o.id) from operations o
                            where o.business_id = s.business_id and not o.is_test and o.sent_at >= s.starts_at and o.sent_at < s.ends_at
                              and exists (select 1 from sponsorship_entries e where e.kind = 'negocio' and e.ref_id = s.id and e.user_id = o.user_id and e.at <= o.sent_at))::int as n
               from s),
       puestas as (
    insert into sponsorship_stats (kind, ref_id, orders) select 'negocio', c.id, c.n from c
      on conflict (kind, ref_id) do update set orders = excluded.orders, updated_at = now() where sponsorship_stats.orders is distinct from excluded.orders returning 1)
  select count(*) into n from puestas;
  perform set_config('tl.patrocinio_cifras', 'off', true);
  return n;
end $$;

-- ── «Avísame si se libera antes» ──
create table if not exists sponsorship_waits (
  id           bigint generated always as identity primary key,
  kind         text not null check (kind in ('negocio')),
  business_id  text not null references businesses (id),
  category_id  text references categories (id),
  city_id      text not null references cities (id),
  user_id      uuid not null references users (id),
  created_at   timestamptz not null default now(),
  notified_at  timestamptz,
  status       text not null default 'espera' check (status in ('espera', 'avisado', 'compro'))
);
create unique index if not exists sponsorship_waits_una on sponsorship_waits (kind, business_id, coalesce(category_id, '')) where status = 'espera';
create index if not exists sponsorship_waits_espera_idx on sponsorship_waits (city_id, category_id) where status = 'espera';

-- ── Avisos al dueño (bandeja y push; sin SMS: no es urgente) ──
insert into notif_templates (key, grp, pref, sms, sms_mode, push, push_private, app, title, body) values
  ('biz_patrocinio_activo', 'biz', null, false, 'nunca', true, false, 'negocio', '{"es":"Ya sales en Patrocinados","en":"You now show in Sponsored"}', '{"es":"{negocio} sale en Patrocinados de {donde} hasta el {hasta}. Pagaste {monto}.","en":"{negocio} shows in Sponsored in {donde} until {hasta}. You paid {monto}."}'),
  ('biz_patrocinio_renovado', 'biz', null, false, 'nunca', true, false, 'negocio', '{"es":"Tu patrocinio se renovó","en":"Your sponsorship renewed"}', '{"es":"{negocio} sigue en Patrocinados de {donde} hasta el {hasta}. Cobramos {monto} a {tarjeta}.","en":"{negocio} stays in Sponsored in {donde} until {hasta}. We charged {monto} to {tarjeta}."}'),
  ('biz_patrocinio_no_renovo', 'biz', null, false, 'nunca', true, false, 'negocio', '{"es":"Tu patrocinio no se renovó","en":"Your sponsorship did not renew"}', '{"es":"El patrocinio de {negocio} en {donde} terminó y no se renovó: {motivo}. Puedes comprar otro desde tu panel.","en":"The {negocio} sponsorship in {donde} ended and did not renew: {motivo}. You can buy another from your dashboard."}'),
  ('biz_patrocinio_termino', 'biz', null, false, 'nunca', true, false, 'negocio', '{"es":"Tu patrocinio terminó","en":"Your sponsorship ended"}', '{"es":"{negocio} ya no sale en Patrocinados de {donde}. Puedes volver cuando quieras desde tu panel.","en":"{negocio} no longer shows in Sponsored in {donde}. You can come back anytime from your dashboard."}'),
  ('biz_patrocinio_admin', 'biz', null, false, 'nunca', true, false, 'negocio', '{"es":"To’Latino terminó tu patrocinio","en":"To’Latino ended your sponsorship"}', '{"es":"El patrocinio de {negocio} en {donde} terminó: {motivo}. Si tienes dudas, escribe a Soporte.","en":"The {negocio} sponsorship in {donde} ended: {motivo}. If you have questions, contact Support."}'),
  ('biz_patrocinio_libre', 'biz', null, false, 'nunca', true, false, 'negocio', '{"es":"Se liberó un puesto","en":"A slot opened up"}', '{"es":"Hay un puesto libre en Patrocinados de {donde}. Cómpralo desde tu panel antes de que lo tome otro negocio.","en":"There is an open slot in Sponsored in {donde}. Buy it from your dashboard before another business takes it."}')
on conflict (key) do nothing;

-- ── La guía de El Compa del panel: la sección nueva (Cobros y plan › Patrocinio) ──
insert into compa_panel_guide (code, ruta, parte, needs, title, what, help_slugs, words, sort) values
  ('cobros/patrocinio', 'cobros/patrocinio', 'pay', 'always', '{"es":"Patrocinio","en":"Sponsorship"}',
    '{"es":"Sal en Patrocinados de tu categoría: elige 1 semana o 1 mes, paga con tu tarjeta y mira cuántos te vieron y entraron.","en":"Show up in Sponsored in your category: choose 1 week or 1 month, pay with your card and see how many saw you and came in."}',
    '{patrocinados}', '{patrocinio,patrocinar,patrocinados,anuncio,anunciar,publicidad,salir primero,destacar,sponsor,sponsored,ad,advertise,promote}', 185)
on conflict (code) do update set ruta = excluded.ruta, parte = excluded.parte, needs = excluded.needs, title = excluded.title, what = excluded.what,
  help_slugs = excluded.help_slugs, words = excluded.words, sort = excluded.sort;

commit;
