-- 0092 · Bienes Raíces: «Propiedades y visitas», propiedades con lo de mudarse completo, préstamos, licencias y vivienda justa (Fase 4 · 4ib).
-- Plan: docs/diseno/plan/fase4-iglesias-inmuebles-autos.md §2 «0092 inmuebles_propiedades», §3 y §4ib. Diseño: neg-inmueble.js (B, tags),
-- neg-inmueble-listing.js (SVC: t renta | venta | gratis | tot, cuota, inc, no, dias), neg-inm-kind.js (KS, LINE), dash2-cat.js INM0 L138,
-- apply L268–280, summary L310–318 y blocksE L508–533.
--   · Cada propiedad es un ítem (module 'svc', svc_kind 'renta' | 'venta') con su ficha en property_listings: tipo, recámaras, baños,
--     pies², renta y depósito (o precio), lo que incluye, lo que piden (solo QUÉ papeles: nunca números), desde cuándo, contrato, dirección
--     y si se muestra solo la zona. move_in_cents (para mudarte) y est_payment_cents (cuota estimada) los calcula el servidor al guardar.
--   · Horas de visita = class_groups de un día por propiedad (purpose 'visita'), generadas por el barrido 14 días adelante desde el patrón
--     semanal del ítem (svc_attrs.visit_pattern). Nada se cobra: ver es gratis.
--   · inm_settings: Tu herramienta (una fila por negocio). El tipo forzado (kind_override) solo lo pone el Super Admin.
--   · fair_housing_phrases: la lista de frases que no pueden ir en un anuncio (vivienda justa), manejada por el Super Admin en Catálogo
--     con auditoría; nada se borra (active). El servidor la junta con su lista de fábrica (lib/vivienda-justa.ts).
--   · Nunca se guarda seguro social, número de ITIN, ingresos, fecha de nacimiento, crédito, cuenta de banco ni licencia de una persona
--     (§3; guardián sinDatosDeCredito).
--   · Sellos de corredor de PA, NMLS, avaluador e inspector (no bloquean nada; textos sin verificar, LAUNCH-CHECKLIST).
-- Idempotente; nada se borra.
begin;

alter table items drop constraint if exists items_svc_kind_check;
alter table items add constraint items_svc_kind_check check (svc_kind = any (array[
  'fijo', 'desde', 'cotiza', 'diag', 'lav', 'goma', 'insp', 'grua', 'visita', 'hora', 'area', 'pres', 'emer', 'plan',
  'cons', 'tele', 'walk', 'free', 'proc', 'pct', 'pack', 'unid', 'asiento', 'priv', 'caja',
  'cover', 'lista', 'mesa', 'vip', 'evento', 'fecha',
  'curso', 'mes', 'semana', 'clase',
  'renta', 'venta']));
-- Una casa en venta pasa del tope general de un ítem ($100,000): solo las propiedades en venta llegan a $20,000,000.
alter table items drop constraint if exists items_price_cents_check;
alter table items add constraint items_price_cents_check check (price_cents >= 0 and (price_cents <= 10000000 or (svc_kind = 'venta' and price_cents <= 2000000000)));

create table if not exists property_listings (
  item_id bigint primary key references items (id),
  business_id text not null references businesses (id),
  city_id text not null references cities (id),
  kind text not null check (kind in ('apto', 'casa', 'cuarto', 'compartida', 'amueblado', 'opcion', 's8', 'mayores', 'venta_casa', 'condo', 'obra',
    'multi', 'terreno', 'rural', 'movil', 'lote_movil', 'local', 'oficina', 'bodega', 'cocina', 'salon', 'almacen', 'parqueo')),
  beds smallint check (beds between 0 and 12),
  baths numeric(3,1) check (baths between 0 and 12 and baths * 2 = floor(baths * 2)),
  sqft integer check (sqft between 20 and 2000000),
  rent_cents integer check (rent_cents between 500 and 10000000),          -- renta (al mes; la cocina por hora y el salón por fecha)
  price_cents integer check (price_cents between 100000 and 2000000000),   -- precio de venta
  deposit_cents integer not null default 0 check (deposit_cents >= 0),
  app_fee_cents integer not null default 0 check (app_fee_cents between 0 and 10000),
  fees jsonb not null default '[]'::jsonb check (jsonb_typeof(fees) = 'array' and jsonb_array_length(fees) <= 2), -- otro pago obligatorio para mudarse
  move_in_cents integer check (move_in_cents >= 0),        -- derivado: renta + depósito + solicitud + lo obligatorio (lo calcula el servidor)
  est_payment_cents integer check (est_payment_cents >= 0), -- derivado: cuota ESTIMADA al mes (venta; siempre dice «estimada»)
  est_down_pct numeric(3,1) check (est_down_pct is null or est_down_pct in (3.5, 5, 10, 15, 20)),
  available_on date,
  furnished boolean not null default false,
  pets boolean not null default false,
  assist_animals boolean not null default true check (assist_animals), -- los animales de servicio y de apoyo no son mascotas: siempre
  utilities text[] not null default '{}' check (utilities <@ array['luz', 'agua', 'gas', 'internet', 'basura', 'calefaccion']::text[]),
  parking boolean not null default false,
  laundry text not null default 'no' check (laundry in ('no', 'edificio', 'unidad')),
  s8 boolean not null default false,
  ssn_required boolean not null default false,             -- false = acepta ITIN, pasaporte o carta del trabajo (nunca se guarda un número)
  papers jsonb check (papers is null or (char_length(papers->>'es') <= 200 and char_length(coalesce(papers->>'en', '')) <= 200)),
  lease jsonb check (lease is null or (char_length(lease->>'es') <= 80 and char_length(coalesce(lease->>'en', '')) <= 80)),
  senior_62 boolean not null default false,               -- solo con la declaración de vivienda para mayores (excepción de la ley)
  senior_status text not null default 'none' check (senior_status in ('none', 'review', 'ok', 'rejected')), -- lo revisa el Super Admin
  addr_line text check (addr_line is null or char_length(addr_line) between 4 and 120),
  zip text check (zip is null or zip ~ '^\d{5}$'),
  geom geography(Point, 4326),
  addr_public boolean not null default true,              -- false: la ficha muestra la zona; la dirección llega al confirmar la visita
  status text not null default 'available' check (status in ('available', 'pending', 'rented', 'sold', 'hidden')),
  status_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((rent_cents is null) <> (price_cents is null)),
  check (rent_cents is null or deposit_cents <= 2 * rent_cents),            -- §6 #5: el depósito no pasa de 2 meses de renta
  check (rent_cents is not null or (deposit_cents = 0 and app_fee_cents = 0 and fees = '[]'::jsonb and move_in_cents is null)),
  check (price_cents is not null or (est_payment_cents is null and est_down_pct is null)),
  check (kind not in ('cuarto', 'compartida') or not addr_public),          -- cuartos: la dirección exacta solo al confirmar la visita
  check (senior_62 = (kind = 'mayores')),
  check (status <> 'rented' or rent_cents is not null),
  check (status <> 'sold' or price_cents is not null)
);
create index if not exists property_listings_geom_idx on property_listings using gist (geom);
create index if not exists property_listings_renta_idx on property_listings (city_id, kind, rent_cents) where status = 'available';
create index if not exists property_listings_venta_idx on property_listings (city_id, price_cents) where status = 'available';
create index if not exists property_listings_negocio_idx on property_listings (business_id, status);
create index if not exists property_listings_mayores_idx on property_listings (senior_status) where senior_status = 'review';

-- Horas de visita: grupos de un día con su propósito (las inscripciones no las cuentan ni las mueven).
alter table class_groups add column if not exists purpose text not null default 'insc';
alter table class_groups drop constraint if exists class_groups_purpose_check;
alter table class_groups add constraint class_groups_purpose_check check (purpose in ('insc', 'visita', 'prueba'));
create unique index if not exists class_groups_visita_uno_idx on class_groups (item_id, starts_on, start_min) where purpose = 'visita' and status <> 'cancelled';
create index if not exists class_groups_visita_idx on class_groups (business_id, starts_on) where purpose = 'visita' and status in ('open', 'started');

-- Tu herramienta de Bienes Raíces (una fila por negocio).
create table if not exists inm_settings (
  business_id text primary key references businesses (id),
  city_id text not null references cities (id),
  kind_override text check (kind_override is null or kind_override in ('rent', 'cuarto', 'venta', 'hipo', 'serv', 'derechos', 'comercial', 'alm')),
  itin boolean not null default false,
  s8 boolean not null default false,
  pets boolean not null default false,
  min_down_pct numeric(3,1) not null default 10 check (min_down_pct in (3.5, 10, 15, 20)),
  prequal_days smallint not null default 2 check (prequal_days in (1, 2, 3, 5)),
  soft_pull boolean not null default false,              -- §6 #8: «no afecta tu crédito» solo si el prestamista lo marca
  buyer_no_commission boolean not null default false,
  free_from date,                                        -- cuartos: libres desde
  util boolean not null default false,
  furnished boolean not null default false,
  derived_on date,                                       -- el día en que se rehicieron las horas de visita, la tarjeta y los filtros
  updated_by uuid references users (id),
  updated_at timestamptz not null default now()
);

-- Vivienda justa (Fair Housing Act y PHRA): frases que no pueden ir en un anuncio. El Super Admin agrega o apaga (nada se borra).
create table if not exists fair_housing_phrases (
  id bigint generated always as identity primary key,
  phrase text not null check (char_length(phrase) between 3 and 60),
  lang text not null check (lang in ('es', 'en')),
  active boolean not null default true,
  created_by uuid references users (id),
  created_at timestamptz not null default now(),
  updated_by uuid references users (id),
  updated_at timestamptz not null default now()
);
create unique index if not exists fair_housing_phrases_uno_idx on fair_housing_phrases (lower(phrase), lang);
insert into fair_housing_phrases (phrase, lang) values
  ('no niños', 'es'), ('sin niños', 'es'), ('no se aceptan niños', 'es'), ('solo adultos', 'es'), ('sin familias', 'es'), ('no familias', 'es'),
  ('ideal para pareja', 'es'), ('ideal para parejas', 'es'), ('perfecto para pareja', 'es'), ('ideal para una persona', 'es'), ('solo solteros', 'es'),
  ('solo cristianos', 'es'), ('solo católicos', 'es'), ('solo hispanos', 'es'), ('para hispanos', 'es'), ('solo latinos', 'es'),
  ('para inmigrantes', 'es'), ('solo americanos', 'es'), ('solo mujeres', 'es'), ('solo hombres', 'es'), ('solo blancos', 'es'),
  ('no discapacitados', 'es'), ('no sillas de ruedas', 'es'), ('no section 8', 'es'), ('no se acepta section 8', 'es'), ('no aceptamos section 8', 'es'),
  ('no vouchers', 'es'), ('no embarazadas', 'es'), ('debe hablar inglés', 'es'), ('solo personas maduras', 'es'),
  ('no kids', 'en'), ('no children', 'en'), ('adults only', 'en'), ('adult only', 'en'), ('no families', 'en'), ('ideal for couple', 'en'),
  ('perfect for couple', 'en'), ('ideal for single', 'en'), ('singles only', 'en'), ('christians only', 'en'), ('catholics only', 'en'),
  ('hispanics only', 'en'), ('latinos only', 'en'), ('for immigrants', 'en'), ('americans only', 'en'), ('women only', 'en'), ('men only', 'en'),
  ('female only', 'en'), ('male only', 'en'), ('whites only', 'en'), ('no disabled', 'en'), ('no wheelchairs', 'en'), ('no section 8', 'en'),
  ('no vouchers', 'en'), ('no pregnant', 'en'), ('must speak english', 'en'), ('mature person only', 'en')
on conflict do nothing;

-- Sellos de Bienes Raíces (no bloquean nada; textos y registros a verificar antes de abrir: LAUNCH-CHECKLIST, §6 #16).
insert into license_kinds (key, category_id, title, can, cannot, issuer, registry_site, registry_url, number_label, sort) values
  ('pa_corredor', 'NEG-INMUEBLE', '{"es":"Corredor o vendedor de bienes raíces de PA","en":"PA real estate broker or salesperson"}',
   '{"es":"Rentar, vender y administrar propiedades de otros con licencia del estado","en":"Rent, sell and manage other people''s property under a state license"}',
   '{"es":"La licencia es de la persona y de su oficina; no cubre a quien no esté en ella","en":"The license covers the person and their office; it does not cover anyone not on it"}',
   '{"es":"Comisión Estatal de Bienes Raíces de PA","en":"PA State Real Estate Commission"}', 'pals.pa.gov', 'https://www.pals.pa.gov/#/page/search', 'Licencia #', 1),
  ('nmls_inm', 'NEG-INMUEBLE', '{"es":"Prestamista con licencia (NMLS)","en":"Licensed mortgage lender (NMLS)"}',
   '{"es":"Precalificar y dar préstamos de casa con licencia del estado","en":"Pre-qualify and originate home loans under a state license"}',
   '{"es":"Nadie puede garantizar la aprobación antes de revisar tus papeles","en":"No one can guarantee approval before reviewing your papers"}',
   '{"es":"NMLS y Departamento de Banca y Valores de PA","en":"NMLS and PA Department of Banking and Securities"}', 'nmlsconsumeraccess.org', 'https://www.nmlsconsumeraccess.org', 'NMLS #', 2),
  ('pa_avaluador', 'NEG-INMUEBLE', '{"es":"Avaluador certificado de PA","en":"PA certified appraiser"}',
   '{"es":"Hacer avalúos para compra, refinanciamiento o herencia","en":"Appraise for purchase, refinance or inheritance"}',
   '{"es":"El avalúo no es una inspección de la casa","en":"An appraisal is not a home inspection"}',
   '{"es":"Junta Estatal de Avaluadores Certificados de PA","en":"PA State Board of Certified Real Estate Appraisers"}', 'pals.pa.gov', 'https://www.pals.pa.gov/#/page/search', 'Certificado #', 3),
  ('inspector_vivienda', 'NEG-INMUEBLE', '{"es":"Inspector de vivienda (asociación nacional)","en":"Home inspector (national association)"}',
   '{"es":"Inspeccionar una casa antes de comprarla; la ley de PA pide ser miembro de una asociación nacional","en":"Inspect a home before purchase; PA law requires membership in a national association"}',
   '{"es":"No repara lo que encuentra ni hace avalúos","en":"Does not repair what it finds nor appraise"}',
   '{"es":"Asociación nacional de inspectores (ASHI o InterNACHI)","en":"National inspector association (ASHI or InterNACHI)"}', 'homeinspector.org', 'https://www.homeinspector.org', 'Miembro #', 4)
on conflict (key) do nothing;
commit;
