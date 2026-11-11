-- 0132 · Fase 8 · 8i · Fichas de las tiendas, capturas, el inventario de datos, las cuentas de revisión y lo que le toca al fundador
-- (docs/diseno/plan/fase8-apps.md §2 «0133 tiendas_fichas», §3.6, §4 8i, §6 #20 #23–#26, §10).
-- NUMERACIÓN: el plan decía 0133. La última confirmada es 0131 (8h) y 8b (que tomaría otra en el papel) espera el dominio: 8i toma 0132.
-- Nada asume números contiguos (migrar.sh registra cada archivo por su nombre). Anotado en el plan y en REVISION.
-- · store_listings: COPIA de cada ficha que se subió a App Store Connect o a Google Play como borrador (el repo es la fuente:
--   apps/mobile/tiendas/{app}/{es,en}.md; aquí queda qué texto, con qué huella del archivo, quién y qué contestó la tienda). Solo inserción.
--   Los límites de cada tienda también los revisa la base (guardián fichaEnLimites en el repo).
-- · store_screenshots: cada captura de la ficha (app, tienda, clase de dispositivo, idioma, orden), guardada en el almacén PRIVADO con su huella,
--   el commit y la corrida del CI que la hizo. Lo que se subió a la tienda se marca una vez (pushed_at, store_ref). Nada se borra.
-- · data_inventory: el inventario de datos personales (sale de apps/mobile/inventario-datos.json por la semilla repetible
--   packages/db/seeds/inventario_datos.sql; guardián privacidadCoherente). Rastreo SIEMPRE false (la base lo exige). Una categoría que sale del
--   inventario se retira (retired_at), no se borra.
-- · review_accounts: las cuentas de revisión de Apple y Google (§6 #24): un número reservado que acepta un código FIJO guardado como secreto
--   (code_ref = el NOMBRE de la variable del entorno, nunca el código), solo ese número, solo con la cuenta activa y el interruptor
--   app.revision.cuentas encendido; sin tarjeta (la base no deja guardar una; el servidor no cobra) y, para Negocios, con un negocio de revisión
--   oculto. Vacía fuera del sandbox: en producción se crean en la Fase 9 con el OK del fundador. No se borra; se desactiva.
-- · review_account_log: cada código pedido, cada entrada, cada rechazo y cada pago bloqueado de una cuenta de revisión. Solo inserción.
-- · founder_steps: lo que el fundador marca a mano en Sistema › Apps › «Lo que te toca» (lo que el sistema no puede saber solo: el D-U-N-S, la
--   cuenta de Cloudflare…). Solo inserción: el estado de un paso es su última fila. Lo demás se deriva del sistema (llavero, dominio).
-- · otp_codes.channel suma 'revision' (el código fijo de una cuenta de revisión: nunca sale por SMS ni se muestra en pantalla).
-- · Interruptor app.revision.cuentas (APAGADO). Configuración › Apps: revision_intentos_hora, fichas_subidas_dia.
-- Idempotente: se puede aplicar dos veces. Nada se borra.
begin;

-- ── Interruptor de las cuentas de revisión (apagado: el código fijo no sirve para nada) ──
insert into feature_flags (key, enabled, note) values
  ('app.revision.cuentas', false, 'Apps · las cuentas de revisión de Apple y Google entran con su código fijo (apagado: no entran). En producción, Fase 9.')
on conflict (key) do nothing;

-- ── El código de una cuenta de revisión no es un SMS ──
alter table otp_codes drop constraint if exists otp_codes_channel_check;
alter table otp_codes add constraint otp_codes_channel_check check (channel in ('sms', 'whatsapp', 'pruebas', 'revision'));

-- ── Fichas: copia de lo que se subió (solo inserción) ──
create table if not exists store_listings (
  id          bigint generated always as identity primary key,
  app         text not null check (app in ('cliente', 'negocio', 'delivery', 'checkin')),
  store       text not null check (store in ('apple', 'google')),
  locale      text not null,
  title       text not null check (char_length(title) between 2 and 30),
  subtitle    text check (char_length(subtitle) <= 30),
  short_desc  text check (char_length(short_desc) <= 80),
  description text not null check (char_length(description) between 10 and 4000),
  keywords    text check (octet_length(keywords) <= 100),
  promo       text check (char_length(promo) <= 170),
  whats_new   text check (char_length(whats_new) <= 500),
  privacy_url text not null check (privacy_url ~ '^https://[a-z0-9.-]+/privacidad$'),
  support_url text not null check (support_url ~ '^https://[a-z0-9.-]+/soporte$'),
  sha256      text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  result      text not null check (result in ('borrador', 'error')),
  detail      text check (char_length(detail) <= 300),
  pushed_at   timestamptz not null default now(),
  pushed_by   uuid references users (id),
  check ((store = 'apple' and locale in ('es-MX', 'en-US') and short_desc is null) or (store = 'google' and locale in ('es-US', 'en-US') and subtitle is null and keywords is null and promo is null))
);
create index if not exists store_listings_app on store_listings (app, store, locale, pushed_at desc);

-- ── Capturas de la ficha (en el almacén privado; nada se borra) ──
create table if not exists store_screenshots (
  id           bigint generated always as identity primary key,
  app          text not null check (app in ('cliente', 'negocio', 'delivery', 'checkin')),
  store        text not null check (store in ('apple', 'google')),
  device_class text not null check ((store = 'apple' and device_class = 'iphone_69') or (store = 'google' and device_class = 'android_phone')),
  locale       text not null check ((store = 'apple' and locale in ('es-MX', 'en-US')) or (store = 'google' and locale in ('es-US', 'en-US'))),
  ord          smallint not null check (ord between 1 and 10),
  media_key    text not null unique check (media_key ~ '^privado/capturas/[a-z0-9-]{3,120}\.png$'),
  sha256       text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  width        integer not null check (width between 320 and 3840),
  height       integer not null check (height between 320 and 3840),
  bytes        integer not null check (bytes between 1 and 8388608),
  commit_sha   text check (commit_sha ~ '^[a-f0-9]{40}$'),
  run_id       text check (run_id ~ '^[0-9]{1,20}$'),
  source       text not null check (source in ('ci', 'local')),
  created_at   timestamptz not null default now(),
  pushed_at    timestamptz,
  store_ref    text check (char_length(store_ref) <= 120)
);
create index if not exists store_screenshots_ultimas on store_screenshots (app, store, locale, ord, created_at desc);
create or replace function store_screenshots_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'una captura no se borra'; end if;
  if tg_op = 'INSERT' then new.created_at := now(); new.pushed_at := null; new.store_ref := null; return new; end if;
  if (new.app, new.store, new.device_class, new.locale, new.ord, new.media_key, new.sha256, new.width, new.height, new.bytes, new.commit_sha, new.run_id, new.source, new.created_at)
     is distinct from (old.app, old.store, old.device_class, old.locale, old.ord, old.media_key, old.sha256, old.width, old.height, old.bytes, old.commit_sha, old.run_id, old.source, old.created_at) then
    raise exception 'store_screenshots: la captura no cambia';
  end if;
  if old.pushed_at is not null and (new.pushed_at is distinct from old.pushed_at or new.store_ref is distinct from old.store_ref) then
    raise exception 'store_screenshots: lo subido a la tienda se anota una vez';
  end if;
  return new;
end $$;
drop trigger if exists store_screenshots_antes on store_screenshots;
create trigger store_screenshots_antes before insert or update or delete on store_screenshots for each row execute function store_screenshots_antes();

create or replace function store_listings_antes() returns trigger language plpgsql as $$
begin
  if tg_op <> 'INSERT' then raise exception 'store_listings es solo de inserción'; end if;
  new.pushed_at := now();
  return new;
end $$;
drop trigger if exists store_listings_antes on store_listings;
create trigger store_listings_antes before insert or update or delete on store_listings for each row execute function store_listings_antes();

-- ── El inventario de datos (de apps/mobile/inventario-datos.json; nada se borra: se retira) ──
create table if not exists data_inventory (
  key             text primary key check (key ~ '^[a-z][a-z_]{2,39}$'),
  label           jsonb not null check (label ? 'es' and label ? 'en'),
  apple_type      text not null check (apple_type ~ '^NSPrivacyCollectedDataType[A-Za-z]+$'),
  apple_category  text not null check (char_length(apple_category) between 3 and 40),
  google_category text not null check (char_length(google_category) between 3 and 40),
  google_type     text not null check (google_type ~ '^PSL_[A-Z_]+$'),
  purposes        text[] not null check (cardinality(purposes) between 1 and 6),
  linked          boolean not null,
  tracking        boolean not null default false check (tracking = false),
  optional        boolean not null,
  apps            text[] not null check (cardinality(apps) between 1 and 4 and apps <@ array['cliente', 'negocio', 'delivery', 'checkin']),
  tables          text[] not null check (cardinality(tables) >= 1),
  retention       jsonb not null check (retention ? 'es' and retention ? 'en'),
  source_sha256   text not null check (source_sha256 ~ '^[a-f0-9]{64}$'),
  updated_at      timestamptz not null default now(),
  retired_at      timestamptz
);
create or replace function data_inventory_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'una categoría del inventario no se borra: se retira (retired_at)'; end if;
  new.tracking := false;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists data_inventory_antes on data_inventory;
create trigger data_inventory_antes before insert or update or delete on data_inventory for each row execute function data_inventory_antes();

-- ── Cuentas de revisión (§6 #24) ──
create table if not exists review_accounts (
  id          bigint generated always as identity primary key,
  app         text not null check (app in ('cliente', 'negocio', 'delivery', 'checkin')),
  user_id     uuid not null unique references users (id),
  business_id text references businesses (id),
  purpose     text not null check (char_length(purpose) between 3 and 200),
  -- El NOMBRE de la variable del entorno que guarda el código (nunca el código): una por app, nada más se puede leer.
  code_ref    text not null check (code_ref ~ '^REVISION_CODIGO_(CLIENTE|NEGOCIO|REPARTIDOR|PUERTA)$'),
  active      boolean not null default false,
  created_by  uuid references users (id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  is_test     boolean not null default false,
  check ((app = 'negocio') = (business_id is not null))
);
create or replace function review_accounts_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'una cuenta de revisión no se borra: se desactiva'; end if;
  if tg_op = 'INSERT' then
    -- El negocio de revisión está oculto (nadie lo ve en la página, en Buscar ni en el mapa).
    if new.business_id is not null and coalesce((select status from businesses where id = new.business_id), '') <> 'hidden' then
      raise exception 'revision_acotada: el negocio de una cuenta de revisión tiene que estar oculto';
    end if;
    -- Una cuenta de revisión nace sin tarjetas guardadas.
    if exists (select 1 from payment_methods where user_id = new.user_id and status = 'active') then
      raise exception 'revision_acotada: una cuenta de revisión no tiene tarjetas guardadas';
    end if;
    new.created_at := now(); new.updated_at := now();
    return new;
  end if;
  if (new.app, new.user_id, new.business_id, new.code_ref, new.created_by, new.created_at, new.is_test)
     is distinct from (old.app, old.user_id, old.business_id, old.code_ref, old.created_by, old.created_at, old.is_test) then
    raise exception 'review_accounts: la app, la persona, el negocio y el secreto no cambian (se crea otra)';
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists review_accounts_antes on review_accounts;
create trigger review_accounts_antes before insert or update or delete on review_accounts for each row execute function review_accounts_antes();

-- Una cuenta de revisión no guarda tarjetas (la base lo rechaza aunque el servidor se equivocara).
create or replace function payment_methods_revision() returns trigger language plpgsql as $$
begin
  if exists (select 1 from review_accounts where user_id = new.user_id) then
    raise exception 'revision_acotada: una cuenta de revisión no paga con tarjeta';
  end if;
  return new;
end $$;
drop trigger if exists payment_methods_revision on payment_methods;
create trigger payment_methods_revision before insert on payment_methods for each row execute function payment_methods_revision();

create table if not exists review_account_log (
  id         bigint generated always as identity primary key,
  account_id bigint not null references review_accounts (id),
  kind       text not null check (kind in ('codigo', 'entro', 'rechazado', 'pago_bloqueado', 'activada', 'desactivada')),
  motivo     text check (char_length(motivo) <= 200),
  ip         inet,
  by_user    uuid references users (id),
  at         timestamptz not null default now()
);
create index if not exists review_account_log_cuenta on review_account_log (account_id, at desc);
create or replace function review_account_log_antes() returns trigger language plpgsql as $$
begin
  if tg_op <> 'INSERT' then raise exception 'review_account_log es solo de inserción'; end if;
  new.at := now();
  return new;
end $$;
drop trigger if exists review_account_log_antes on review_account_log;
create trigger review_account_log_antes before insert or update or delete on review_account_log for each row execute function review_account_log_antes();

-- ── Lo que el fundador marca a mano en «Lo que te toca» (solo inserción; el estado es la última fila del paso) ──
create table if not exists founder_steps (
  id    bigint generated always as identity primary key,
  step  text not null check (step ~ '^8-[0-3]\.[0-9]{1,2}$'),
  state text not null check (state in ('hecho', 'pendiente')),
  note  text check (char_length(note) <= 300),
  by    uuid not null references users (id),
  at    timestamptz not null default now()
);
create index if not exists founder_steps_paso on founder_steps (step, at desc);
create or replace function founder_steps_antes() returns trigger language plpgsql as $$
begin
  if tg_op <> 'INSERT' then raise exception 'founder_steps es solo de inserción'; end if;
  new.at := now();
  return new;
end $$;
drop trigger if exists founder_steps_antes on founder_steps;
create trigger founder_steps_antes before insert or update or delete on founder_steps for each row execute function founder_steps_antes();

-- ── Configuración › Apps ──
insert into config_keys (key, min, max, def, unit, section, label, help, editable, bloqueo, edit_in, sort) values
  ('revision_intentos_hora', 1, 30, 10, '{"es":"por hora","en":"per hour"}', 'apps', '{"es":"Cuentas de revisión · códigos por hora","en":"Review accounts · codes per hour"}',
    '{"es":"Cuántas veces por hora una cuenta de revisión puede pedir su código fijo. Pasado el tope, espera (además de los topes del código de entrada).","en":"How many times per hour a review account can request its fixed code. Past the cap, it waits (on top of the sign-in code caps)."}', true, null, null, 393),
  ('fichas_subidas_dia', 1, 20, 6, '{"es":"por día","en":"per day"}', 'apps', '{"es":"Fichas · subidas a las tiendas por día","en":"Listings · uploads to the stores per day"}',
    '{"es":"Cuántas veces por día el equipo puede subir las fichas y capturas como borrador a App Store Connect y Google Play.","en":"How many times per day the team can upload the listings and screenshots as drafts to App Store Connect and Google Play."}', true, null, null, 394)
on conflict (key) do update set min = excluded.min, max = excluded.max, def = excluded.def, unit = excluded.unit, section = excluded.section,
  label = excluded.label, help = excluded.help, editable = excluded.editable, bloqueo = excluded.bloqueo, edit_in = excluded.edit_in, sort = excluded.sort;

commit;
