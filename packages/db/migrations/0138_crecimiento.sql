-- 0138 · Crecimiento (fase9-apertura.md §2 0138 y §4 9h; admin-dashboard.md ADM-MKT; prototipo del Super Admin secMkt): la lista de la landing de acceso
-- anticipado, los enlaces cortos y los QR de calle con sus escaneos sin personas, las campañas con permiso, los destacados con tope por ciudad, los códigos
-- de promotor (lo que hoy era PROMO = { HZL30 } en el código) y los negocios que trae cada promotor.
-- Reglas (CLAUDE.md 5 y 12): city_id en todo; nada se borra (estados: retirado, removed_at); los libros (link_scans, campaign_sends) son de solo inserción;
-- los derivados (link_scan_days, early_access.founder_*, campaigns.sent_n / audience_n) los escribe la base o el servidor, nunca el equipo a mano;
-- solo el servidor lee y escribe (la app pasa por lib/crecimiento/*).
-- Datos personales (Opus): la lista guarda la cuenta (user_id, el teléfono ya verificado vive solo en users, decisión E), el código postal y lo que la
-- persona dijo de su negocio; NUNCA el teléfono otra vez, ni la IP ni el dispositivo. Un escaneo de QR guarda el código, la hora, la ciudad, web/app y
-- la clase de navegador (teléfono, escritorio u otro): sin IP ni dispositivo (guardián analiticaSinPersonas).
-- Idempotente: if not exists, funciones que se reemplazan, triggers que se recrean, catálogo on conflict.
begin;

-- ── Campañas (Campaign) ──
-- Segmento → plantilla → canal. Solo a quien ENCENDIÓ «Novedades de To'Latino» en Mi cuenta › Avisos (notif_prefs.mkt = true; apagado de fábrica),
-- nunca en horas de silencio (10 PM – 7 AM de la ciudad), con tope por persona y semana (campana_por_semana) y, por SMS, por mes (campana_sms_por_mes).
-- Más de campana_aprobar_desde personas: la aprueba OTRA persona del equipo (approved_by <> created_by). No se edita lo enviado: se retira.
create table if not exists campaigns (
  id             bigint generated always as identity primary key,
  name           text not null check (char_length(name) between 3 and 80),
  city_id        text not null references cities (id),
  kind           text not null check (kind in ('lanzamiento', 'promocion', 'reclutamiento', 'aviso')),
  segment        jsonb not null default '{}'::jsonb check (jsonb_typeof(segment) = 'object'),
  channel        text not null check (channel in ('push', 'correo', 'sms', 'inapp')),
  template_key   text not null check (template_key in ('mkt_campana_push', 'mkt_campana_app', 'mkt_campana_sms', 'mkt_campana_correo')),
  title          jsonb not null check (title ? 'es' and title ? 'en' and char_length(title->>'es') between 2 and 60 and char_length(title->>'en') between 2 and 60),
  body           jsonb not null check (body ? 'es' and body ? 'en' and char_length(body->>'es') between 3 and 300 and char_length(body->>'en') between 3 and 300),
  href           text check (href is null or (href ~ '^/[A-Za-z0-9/_?=&.%-]*$' and href !~ '^//')),
  scheduled_at   timestamptz,
  status         text not null default 'borrador' check (status in ('borrador', 'por_aprobar', 'programada', 'enviando', 'enviada', 'retirada')),
  audience_n     integer check (audience_n >= 0),
  sent_n         integer not null default 0 check (sent_n >= 0),
  cursor_user    uuid,
  created_by     uuid not null references users (id),
  approved_by    uuid references users (id),
  approved_at    timestamptz,
  started_at     timestamptz,
  finished_at    timestamptz,
  retired_at     timestamptz,
  retired_by     uuid references users (id),
  retired_reason text,
  is_test        boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (approved_by is null or approved_by <> created_by),
  check (channel <> 'sms' or char_length(body->>'es') <= 150 and char_length(body->>'en') <= 150),
  check ((status = 'retirada') = (retired_at is not null)),
  check (status not in ('programada', 'enviando', 'enviada') or scheduled_at is not null)
);
create index if not exists campaigns_ciudad_idx on campaigns (city_id, created_at desc, id desc);
create index if not exists campaigns_cola_idx on campaigns (scheduled_at) where status in ('programada', 'enviando');

-- Lo que salió de cada campaña, por persona (solo inserción): enviado, tope de la semana o del mes, baja de SMS, sin correo verificado.
create table if not exists campaign_sends (
  id              bigint generated always as identity primary key,
  campaign_id     bigint not null references campaigns (id),
  user_id         uuid not null references users (id),
  city_id         text not null references cities (id),
  channel         text not null check (channel in ('push', 'correo', 'sms', 'inapp')),
  template_key    text not null,
  result          text not null check (result in ('enviado', 'tope', 'sin_correo', 'apagado')),
  at              timestamptz not null default now(),
  unique (campaign_id, user_id)
);
create index if not exists campaign_sends_persona_idx on campaign_sends (user_id, at desc) where result = 'enviado';
create index if not exists campaign_sends_campana_idx on campaign_sends (campaign_id, result);
-- «Abiertos» de una campaña: los avisos que la persona abrió (ref campaign), sin recorrer la tabla de avisos.
create index if not exists notifications_campana_idx on notifications (ref_id) where ref_kind = 'campaign' and read_at is not null;

-- ── Enlaces cortos y QR de calle (ShortLink) ──
-- tolatino.com/q/{código}: 7 letras y números sin los que se confunden (0 O 1 I L B 8 5 S). El destino es SIEMPRE una ruta propia (empieza con una sola
-- «/», sin esquema ni otro origen: guardián enlaceSoloPropio). Nada se borra: se retira y el enlace lleva al Inicio.
create table if not exists short_links (
  code           text primary key check (code ~ '^[ACDEFGHJKMNPQRTUVWXYZ234679]{7}$'),
  label          text not null check (char_length(label) between 2 and 80),
  target         text not null check (target ~ '^/[A-Za-z0-9/_?=&.%-]*$' and target !~ '^//' and position('\' in target) = 0 and char_length(target) <= 200),
  city_id        text not null references cities (id),
  campaign_id    bigint references campaigns (id),
  kind           text not null check (kind in ('calle', 'volante', 'iglesia', 'negocio', 'redes', 'prensa')),
  created_by     uuid not null references users (id),
  created_at     timestamptz not null default now(),
  retired_at     timestamptz,
  retired_by     uuid references users (id),
  retired_reason text,
  is_test        boolean not null default false
);
create index if not exists short_links_ciudad_idx on short_links (city_id, created_at desc);

-- Cada escaneo (solo inserción): el código, cuándo, la ciudad del enlace, web o app y la clase de navegador. SIN IP, sin dispositivo, sin cuenta.
create table if not exists link_scans (
  id        bigint generated always as identity primary key,
  code      text not null references short_links (code),
  at        timestamptz not null default now(),
  city_id   text not null references cities (id),
  app       text not null check (app in ('web', 'app')),
  ua_class  text not null check (ua_class in ('telefono', 'escritorio', 'otro'))
);
create index if not exists link_scans_codigo_idx on link_scans (code, at desc);
create index if not exists link_scans_at_brin on link_scans using brin (at);

-- Escaneos por enlace y día (hora de la ciudad): DERIVADO, lo lleva el trigger de link_scans; nadie más lo escribe.
create table if not exists link_scan_days (
  code  text not null references short_links (code),
  dia   date not null,
  n     integer not null default 0 check (n >= 0),
  primary key (code, dia)
);

create or replace function crec_solo_insercion() returns trigger language plpgsql as $$
begin raise exception '% es solo de inserción', tg_table_name; end $$;
drop trigger if exists link_scans_no_cambia on link_scans;
create trigger link_scans_no_cambia before update or delete on link_scans for each row execute function crec_solo_insercion();
drop trigger if exists campaign_sends_no_cambia on campaign_sends;
create trigger campaign_sends_no_cambia before update or delete on campaign_sends for each row execute function crec_solo_insercion();

create or replace function link_scans_contar() returns trigger language plpgsql as $$
begin
  perform set_config('tl.crec_derivado', 'on', true);
  insert into link_scan_days (code, dia, n) values (new.code, (new.at at time zone coalesce((select timezone from cities where id = new.city_id), 'America/New_York'))::date, 1)
  on conflict (code, dia) do update set n = link_scan_days.n + 1;
  perform set_config('tl.crec_derivado', '', true);
  return null;
end $$;
drop trigger if exists link_scans_cuenta on link_scans;
create trigger link_scans_cuenta after insert on link_scans for each row execute function link_scans_contar();

create or replace function link_scan_days_derivado() returns trigger language plpgsql as $$
begin
  if coalesce(current_setting('tl.crec_derivado', true), '') <> 'on' then raise exception 'link_scan_days es un derivado: lo cuenta la base'; end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
drop trigger if exists link_scan_days_solo_base on link_scan_days;
create trigger link_scan_days_solo_base before insert or update or delete on link_scan_days for each row execute function link_scan_days_derivado();

-- Un enlace no se borra; retirado no vuelve; el destino y el código no cambian (se crea otro).
create or replace function short_links_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'un enlace no se borra: se retira'; end if;
  if old.retired_at is not null then raise exception 'un enlace retirado no vuelve'; end if;
  if new.code <> old.code or new.target <> old.target or new.city_id <> old.city_id or new.created_by <> old.created_by then raise exception 'un enlace no cambia de destino: se crea otro'; end if;
  return new;
end $$;
drop trigger if exists short_links_antes on short_links;
create trigger short_links_antes before update or delete on short_links for each row execute function short_links_antes();

-- ── Destacados (Featured) ──
-- Negocios › Destacados de la ciudad: la vitrina rota cada día entre los Pro abiertos con foto (lib/categoria.ts destacados). Aquí el equipo FIJA uno
-- arriba o lo QUITA de la rotación, por unos días (destacados_dias, 7) y con motivo; fijados a la vez por ciudad: destacados_por_ciudad (6). Nada se borra.
create table if not exists featured (
  id             bigint generated always as identity primary key,
  city_id        text not null references cities (id),
  business_id    text not null references businesses (id),
  mode           text not null check (mode in ('fijar', 'quitar')),
  placement      text not null default 'negocios' check (placement in ('negocios')),
  from_at        timestamptz not null default now(),
  to_at          timestamptz not null,
  by_staff_id    uuid not null references users (id),
  reason         text not null check (char_length(reason) between 3 and 300),
  retired_at     timestamptz,
  retired_by     uuid references users (id),
  retired_reason text,
  is_test        boolean not null default false,
  created_at     timestamptz not null default now(),
  check (to_at > from_at and to_at <= from_at + interval '30 days')
);
create index if not exists featured_vivos_idx on featured (city_id, placement, to_at) where retired_at is null;

create or replace function featured_reglas() returns trigger language plpgsql as $$
declare n integer;
begin
  if tg_op = 'DELETE' then raise exception 'un destacado no se borra: se retira'; end if;
  if tg_op = 'UPDATE' then
    if old.retired_at is not null then raise exception 'un destacado retirado no vuelve'; end if;
    if new.business_id <> old.business_id or new.mode <> old.mode or new.city_id <> old.city_id or new.from_at <> old.from_at or new.to_at <> old.to_at then
      raise exception 'un destacado no se edita: se retira y se crea otro'; end if;
    return new;
  end if;
  if not exists (select 1 from businesses b where b.id = new.business_id and b.city_id = new.city_id) then raise exception 'destacado: el negocio es de otra ciudad'; end if;
  perform pg_advisory_xact_lock(hashtextextended('destacados:' || new.city_id, 0));
  if exists (select 1 from featured f where f.business_id = new.business_id and f.retired_at is null and f.to_at > now()) then raise exception 'destacado: ese negocio ya tiene uno vivo'; end if;
  if new.mode = 'fijar' then
    select count(*) into n from featured f where f.city_id = new.city_id and f.placement = new.placement and f.mode = 'fijar' and f.retired_at is null and f.to_at > now();
    if n >= cfg_int('destacados_por_ciudad') then raise exception 'destacados_tope'; end if;
  end if;
  return new;
end $$;
drop trigger if exists featured_reglas on featured;
create trigger featured_reglas before insert or update or delete on featured for each row execute function featured_reglas();

-- ── Códigos de promoción y promotores (Referral) ──
-- El código del diseño HZL30 (Fundadores de Hazleton, 60 días de prueba Pro) pasa del código a esta tabla; un promotor tiene el suyo (su negocio traído
-- recibe promotor_dias_prueba días más de prueba). Un código no se borra: se retira.
create table if not exists promo_codes (
  code             text primary key check (code ~ '^[A-Z0-9]{4,12}$'),
  kind             text not null check (kind in ('campana', 'promotor')),
  city_id          text references cities (id),
  promoter_user_id uuid references users (id),
  trial_days       smallint not null check (trial_days between 30 and 120),
  created_by       uuid references users (id),
  created_at       timestamptz not null default now(),
  retired_at       timestamptz,
  retired_by       uuid references users (id),
  retired_reason   text,
  is_test          boolean not null default false,
  check (kind <> 'promotor' or promoter_user_id is not null)
);
create unique index if not exists promo_codes_un_promotor on promo_codes (promoter_user_id) where promoter_user_id is not null and retired_at is null;

alter table users add column if not exists is_promoter boolean not null default false;

-- El negocio que trajo un promotor: «traido» al publicarse con su código; «calificado» cuando llega a promotor_operaciones pedidos o citas hechos (lo
-- marca el barrido); «pagado» cuando el equipo paga la recompensa (llega con 9k: dinero real); «rechazado» si el dueño es el promotor o comparte
-- dispositivo con él (el antiabuso de 5d, pts_mismo_dispositivo). Un negocio cuenta para un solo promotor.
create table if not exists business_referrals (
  id               bigint generated always as identity primary key,
  promoter_user_id uuid not null references users (id),
  code             text not null references promo_codes (code),
  business_id      text not null unique references businesses (id),
  city_id          text not null references cities (id),
  status           text not null default 'traido' check (status in ('traido', 'calificado', 'pagado', 'rechazado')),
  reward_cents     integer not null default 0 check (reward_cents between 0 and 100000),
  reason           text,
  at               timestamptz not null default now(),
  qualified_at     timestamptz,
  paid_at          timestamptz,
  paid_by          uuid references users (id)
);
create index if not exists business_referrals_promotor_idx on business_referrals (promoter_user_id, at desc);
create index if not exists business_referrals_por_calificar on business_referrals (at) where status = 'traido';

create or replace function business_referrals_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'un referido no se borra'; end if;
  if tg_op = 'UPDATE' then
    if new.business_id <> old.business_id or new.promoter_user_id <> old.promoter_user_id or new.code <> old.code then raise exception 'un referido no cambia de negocio ni de promotor'; end if;
    if old.status in ('rechazado', 'pagado') and new.status <> old.status then raise exception 'un referido % no cambia', old.status; end if;
    if old.status = 'calificado' and new.status = 'traido' then raise exception 'un referido calificado no vuelve atrás'; end if;
  end if;
  return new;
end $$;
drop trigger if exists business_referrals_antes on business_referrals;
create trigger business_referrals_antes before update or delete on business_referrals for each row execute function business_referrals_antes();

-- ── La lista de acceso anticipado (la landing) ──
-- Una fila por cuenta (la persona entró con el código de su teléfono: queda con cuenta, decisión E). La ciudad sale del código postal; de fuera de las cinco:
-- asked_city («CP 19020») y también va a «Pide tu ciudad» (city_waitlist). Fundadores (solo insignia, §6 #15): los primeros fundadores_vecinos de cada ciudad
-- y, de quienes tienen negocio, los primeros fundadores_negocios: el número lo pone la base al anotarse, en orden y con candado por ciudad.
create table if not exists early_access (
  id                bigint generated always as identity primary key,
  user_id           uuid not null unique references users (id),
  zip               text not null check (zip ~ '^[0-9]{5}$'),
  city_id           text references cities (id),
  asked_city        text check (asked_city is null or char_length(asked_city) <= 40),
  has_business      boolean not null default false,
  business_kind     text check (business_kind in ('local', 'casa', 'domicilio', 'encargo', 'tiempo_libre')),
  business_name     text check (business_name is null or char_length(business_name) between 2 and 60),
  source_code       text references short_links (code),
  lang              text not null default 'es' check (lang in ('es', 'en')),
  founder_vecino_n  integer,
  founder_negocio_n integer,
  is_test           boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  notified_at       timestamptz,
  removed_at        timestamptz,
  check (city_id is not null or asked_city is not null),
  check (has_business or (business_kind is null and business_name is null))
);
create index if not exists early_access_ciudad_idx on early_access (city_id, created_at, id) where removed_at is null;
create index if not exists early_access_negocios_idx on early_access (city_id, business_kind) where has_business and removed_at is null;
create index if not exists early_access_fuera_idx on early_access (lower(asked_city)) where city_id is null and removed_at is null;

create or replace function early_access_reglas() returns trigger language plpgsql as $$
declare n integer;
begin
  -- Solo la purga de una cuenta borrada a los 30 días (lib/datos/purgar.ts, tl.purga = 'si') saca la fila (mapa de datos: early_access.user_id → borrar).
  if tg_op = 'DELETE' then
    if coalesce(current_setting('tl.purga', true), '') = 'si' then return old; end if;
    raise exception 'la lista no se borra: se quita (removed_at)';
  end if;
  if tg_op = 'UPDATE' then
    if new.user_id <> old.user_id or new.created_at <> old.created_at then raise exception 'la lista no cambia de persona ni de fecha'; end if;
    if new.founder_vecino_n is distinct from old.founder_vecino_n and old.founder_vecino_n is not null then raise exception 'el número de fundador no cambia'; end if;
    if new.founder_negocio_n is distinct from old.founder_negocio_n and old.founder_negocio_n is not null then raise exception 'el número de fundador no cambia'; end if;
    new.updated_at := now();
  else
    new.founder_vecino_n := null; new.founder_negocio_n := null; -- los pone la base, nunca quien inserta
  end if;
  if new.city_id is not null and new.removed_at is null then
    perform pg_advisory_xact_lock(hashtextextended('fundadores:' || new.city_id, 0));
    if new.founder_vecino_n is null and (tg_op = 'INSERT' or old.city_id is distinct from new.city_id or old.founder_vecino_n is null) then
      select count(*) into n from early_access e where e.city_id = new.city_id and e.founder_vecino_n is not null;
      if n < cfg_int('fundadores_vecinos') then new.founder_vecino_n := n + 1; end if;
    end if;
    if new.has_business and new.founder_negocio_n is null then
      select count(*) into n from early_access e where e.city_id = new.city_id and e.founder_negocio_n is not null;
      if n < cfg_int('fundadores_negocios') then new.founder_negocio_n := n + 1; end if;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists early_access_reglas on early_access;
create trigger early_access_reglas before insert or update or delete on early_access for each row execute function early_access_reglas();

-- La insignia Fundadores (users.founder, la entrega pts_rango) para quien tiene número de fundador vecino.
create or replace function early_access_insignia() returns trigger language plpgsql as $$
begin
  if new.founder_vecino_n is not null then update users set founder = true where id = new.user_id and not founder; end if;
  return null;
end $$;
drop trigger if exists early_access_insignia on early_access;
create trigger early_access_insignia after insert or update of founder_vecino_n on early_access for each row execute function early_access_insignia();

-- A quién llega una campaña: los que encendieron «Novedades» en su ciudad (índice parcial: la consulta del segmento no recorre a todos).
create index if not exists users_mkt_ciudad_idx on users (home_city_id, id) where (notif_prefs->>'mkt') = 'true';

-- ── Plantillas de las campañas (grupo mkt: respetan «Novedades», el push de crecimiento solo con mkt_push y las horas de silencio) ──
insert into notif_templates (key, grp, pref, sms, sms_mode, push, push_private, title, body) values
  ('mkt_campana_push', 'mkt', 'mkt', false, 'nunca', true, false, '{"es":"{titulo}","en":"{titulo}"}', '{"es":"{texto}","en":"{texto}"}'),
  ('mkt_campana_app', 'mkt', 'mkt', false, 'nunca', false, false, '{"es":"{titulo}","en":"{titulo}"}', '{"es":"{texto}","en":"{texto}"}'),
  ('mkt_campana_sms', 'mkt', 'mkt', true, 'sin_push', false, false, '{"es":"{titulo}","en":"{titulo}"}', '{"es":"{texto}","en":"{texto}"}'),
  ('mkt_promotor', 'tx', null, false, 'nunca', true, false, '{"es":"Ya eres promotor de To''Latino","en":"You are now a To''Latino promoter"}',
    '{"es":"Tu código es {codigo}: el negocio que se publique con él recibe {dias} días de prueba Pro.","en":"Your code is {codigo}: a business that lists with it gets {dias} days of Pro trial."}')
on conflict (key) do nothing;
alter table email_outbox drop constraint if exists email_outbox_tpl_check;
alter table email_outbox add constraint email_outbox_tpl_check check (tpl in ('verify', 'receipt_order', 'receipt_table', 'receipt_pro', 'receipt_tickets', 'report', 'founder_daily', 'campaign'));

-- ── El código de la campaña de Fundadores (estaba en publica/acciones.ts) ──
insert into promo_codes (code, kind, city_id, trial_days) values ('HZL30', 'campana', 'hzl', 60) on conflict (code) do nothing;

-- ── Interruptor de la landing: con él encendido, «/» es la landing de acceso anticipado (producción en acceso anticipado, 9t, OK-1). Nace APAGADO. ──
insert into feature_flags (key, enabled, note, updated_by) values ('growth.landing', false, 'La landing de acceso anticipado en «/» (se enciende en producción con el OK-1, 9t)', 'migración 0138')
on conflict (key) do nothing;

-- ── Configuración › Crecimiento ──
alter table config_keys drop constraint if exists config_keys_section_check;
alter table config_keys add constraint config_keys_section_check check (section in ('comunidad', 'gamificacion', 'salud_pro', 'noche', 'edu', 'fe_inm_autos', 'eventos', 'compa', 'soporte', 'apps', 'retencion', 'crecimiento'));
insert into config_keys (key, min, max, def, unit, section, label, help, editable, bloqueo, edit_in, sort) values
  ('campana_por_semana', 0, 7, 2, '{"es":"campañas","en":"campaigns"}', 'crecimiento', '{"es":"Campañas · por persona y semana","en":"Campaigns · per person per week"}',
    '{"es":"Ninguna persona recibe más campañas que esto en 7 días, aunque haya varias programadas.","en":"Nobody gets more campaigns than this in 7 days, even with several scheduled."}', true, null, null, 1000),
  ('campana_sms_por_mes', 0, 4, 1, '{"es":"SMS","en":"SMS"}', 'crecimiento', '{"es":"Campañas por SMS · por persona y mes","en":"SMS campaigns · per person per month"}',
    '{"es":"La regla de Notificaciones dice «máximo 1 SMS de crecimiento al mes».","en":"The Notifications rule says «max 1 growth SMS a month»."}', true, null, null, 1001),
  ('campana_aprobar_desde', 50, 100000, 1000, '{"es":"personas","en":"people"}', 'crecimiento', '{"es":"Campañas · otra persona aprueba desde","en":"Campaigns · another person approves from"}',
    '{"es":"Una campaña a más personas que esto no sale hasta que la apruebe otra persona del equipo.","en":"A campaign to more people than this does not go out until another team member approves it."}', true, null, null, 1002),
  ('campana_lote', 50, 5000, 500, '{"es":"personas","en":"people"}', 'crecimiento', '{"es":"Campañas · personas por pasada del barrido","en":"Campaigns · people per sweep pass"}',
    '{"es":"El barrido manda por partes (cada minuto) para no frenar lo demás.","en":"The sweep sends in parts (every minute) so nothing else slows down."}', true, null, null, 1003),
  ('destacados_por_ciudad', 1, 20, 6, '{"es":"negocios","en":"businesses"}', 'crecimiento', '{"es":"Destacados · fijados a la vez por ciudad","en":"Featured · pinned at once per city"}',
    '{"es":"Negocios › Destacados muestra 6: con más fijados, la rotación justa desaparece.","en":"Businesses › Featured shows 6: with more pinned, fair rotation disappears."}', true, null, null, 1004),
  ('destacados_dias', 1, 30, 7, '{"es":"días","en":"days"}', 'crecimiento', '{"es":"Destacados · días que dura fijar o quitar","en":"Featured · days a pin or removal lasts"}',
    '{"es":"Después vuelve solo a la rotación diaria.","en":"Then it returns to the daily rotation on its own."}', true, null, null, 1005),
  ('fundadores_vecinos', 0, 5000, 500, '{"es":"vecinos","en":"neighbors"}', 'crecimiento', '{"es":"Fundadores · primeros vecinos de cada ciudad","en":"Founders · first neighbors of each city"}',
    '{"es":"Solo insignia. La landing dice el número: si lo cambias, cambia la ayuda (acceso-anticipado).","en":"Badge only. The landing states the number: if you change it, change the help (acceso-anticipado)."}', true, null, null, 1006),
  ('fundadores_negocios', 0, 1000, 100, '{"es":"negocios","en":"businesses"}', 'crecimiento', '{"es":"Fundadores · primeros negocios de cada ciudad","en":"Founders · first businesses of each city"}',
    '{"es":"Solo insignia (sin Pro extendido). La landing dice el número.","en":"Badge only (no extended Pro). The landing states the number."}', true, null, null, 1007),
  ('promotor_operaciones', 1, 50, 5, '{"es":"pedidos o citas","en":"orders or bookings"}', 'crecimiento', '{"es":"Promotores · el negocio traído califica con","en":"Promoters · a brought business qualifies at"}',
    '{"es":"Pedidos o citas hechos del negocio que trajo el promotor.","en":"Completed orders or bookings of the business the promoter brought."}', true, null, null, 1008),
  ('promotor_recompensa_cents', 0, 5000, 1000, '{"es":"centavos","en":"cents"}', 'crecimiento', '{"es":"Promotores · recompensa por negocio calificado","en":"Promoters · reward per qualified business"}',
    '{"es":"Se anota al calificar; el pago a la Wallet llega con el dinero real (9k).","en":"Recorded when it qualifies; the Wallet payout comes with real money (9k)."}', true, null, null, 1009),
  ('promotor_dias_prueba', 30, 120, 60, '{"es":"días","en":"days"}', 'crecimiento', '{"es":"Promotores · días de prueba Pro con su código","en":"Promoters · Pro trial days with their code"}',
    '{"es":"Los 30 de siempre más 30 por llegar con un promotor.","en":"The usual 30 plus 30 for coming with a promoter."}', true, null, null, 1010)
on conflict (key) do nothing;

commit;
