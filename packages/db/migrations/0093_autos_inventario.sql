-- 0093 · Venta de Autos: «Inventario del lote», carro con total en la puerta, financiamiento por escrito y licencias (Fase 4 · 4ic).
-- Plan: docs/diseno/plan/fase4-iglesias-inmuebles-autos.md §2 «0093 autos_inventario», §3 «Precio en la puerta (Autos)», §4ic y §5.
-- Diseño: neg-dealer.js (B, tags), neg-dealer-listing.js (car(): precio + 6 % + placas $150 + cargo del dealer = en la puerta; SVC; FREE),
-- neg-dealer-kind.js (KS, LINE, faq), dash2-cat.js DL0 L137, apply L214–224, summary L321 y blocksD L429–443.
--   · Cada vehículo es un ítem (module 'svc', svc_kind 'auto') con su ficha en vehicle_listings: VIN (dígito verificador revisado aquí
--     y en el servidor), año, marca, modelo, versión, carrocería, millaje u horas de motor, transmisión, combustible, tracción, título,
--     historial (lo declara el dealer y de quién: To'Latino no compra historiales), inspección de PA, garantía, «no va por la calle», CDL.
--   · El total en la puerta lo calcula el servidor y la base lo comprueba: otd = precio + impuesto (tax_rules de la ciudad, 6 % en las
--     cinco) + placas y título (los del dealer) + cargo del dealer (≤ tope de PA en platform_config, A VERIFICAR cada año).
--   · El pago de ejemplo (Regulation Z) nunca va sin tasa (APR), meses y enganche juntos, y siempre dice «estimado, sujeto a aprobación»;
--     compre aquí pague aquí lleva el total pagado y la tasa que resulta. Todo derivado: el servidor lo rehace al cambiar algo.
--   · dealer_settings: Tu herramienta (una fila por negocio). El tipo forzado (kind_override) solo lo pone el Super Admin.
--   · Nunca se guarda seguro social, número de ITIN, ingresos, fecha de nacimiento, crédito, cuenta de banco ni licencia de una persona
--     (§3; guardián sinDatosDeCredito). Nada se cobra en la app: la prueba de manejo es gratis (4ie).
--   · Sellos de dealer de PA, vendedor, venta a plazos y NMLS (no bloquean nada; textos sin verificar, LAUNCH-CHECKLIST).
-- Idempotente; nada se borra.
begin;

alter table items drop constraint if exists items_svc_kind_check;
alter table items add constraint items_svc_kind_check check (svc_kind = any (array[
  'fijo', 'desde', 'cotiza', 'diag', 'lav', 'goma', 'insp', 'grua', 'visita', 'hora', 'area', 'pres', 'emer', 'plan',
  'cons', 'tele', 'walk', 'free', 'proc', 'pct', 'pack', 'unid', 'asiento', 'priv', 'caja',
  'cover', 'lista', 'mesa', 'vip', 'evento', 'fecha',
  'curso', 'mes', 'semana', 'clase',
  'renta', 'venta', 'auto']));
-- Un vehículo pasa del tope general de un ítem ($100,000): los carros llegan a $500,000 (lujo, casas rodantes, botes).
alter table items drop constraint if exists items_price_cents_check;
alter table items add constraint items_price_cents_check check (price_cents >= 0 and (price_cents <= 10000000 or (svc_kind = 'venta' and price_cents <= 2000000000)
  or (svc_kind = 'auto' and price_cents <= 50000000)));

-- El VIN de 17 caracteres (sin I, O ni Q) con su dígito verificador (posición 9; 49 CFR 565). La misma cuenta que vinValido() del servidor.
create or replace function vin_valido(v text) returns boolean language plpgsql immutable strict as $$
declare
  pesos constant int[] := array[8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
  letras constant text := 'ABCDEFGHJKLMNPRSTUVWXYZ';
  valores constant text := '12345678123457923456789';
  s int := 0; ch text; n int; r int;
begin
  if v !~ '^[A-HJ-NPR-Z0-9]{17}$' then return false; end if;
  for i in 1..17 loop
    ch := substr(v, i, 1);
    n := case when ch ~ '[0-9]' then ch::int else substr(valores, strpos(letras, ch), 1)::int end;
    s := s + n * pesos[i];
  end loop;
  r := s % 11;
  return substr(v, 9, 1) = case when r = 10 then 'X' else r::text end;
end $$;

create table if not exists vehicle_listings (
  item_id bigint primary key references items (id),
  business_id text not null references businesses (id),
  city_id text not null references cities (id),
  vin text check (vin is null or vin_valido(vin)),
  year smallint not null check (year between 1900 and 2100),
  make text not null check (char_length(make) between 1 and 30),
  model text not null check (char_length(model) between 1 and 40),
  trim_level text check (trim_level is null or char_length(trim_level) between 1 and 40),   -- la versión (LE, EX, XLT…)
  body text not null check (body in ('carro', 'suv', 'van', 'pickup', 'trabajo', 'caja', 'trailer', 'remolque', 'moto', 'cuatrimoto', 'scooter', 'bote', 'rv', 'golf')),
  miles integer check (miles between 0 and 2000000),
  engine_hours integer check (engine_hours between 0 and 100000),                            -- botes
  transmission text check (transmission in ('automatica', 'manual', 'cvt')),
  fuel text check (fuel in ('gasolina', 'diesel', 'hibrido', 'electrico', 'enchufable', 'flex')),
  drivetrain text check (drivetrain in ('fwd', 'rwd', 'awd', '4x4')),
  title text not null default 'limpio' check (title in ('limpio', 'reconstruido', 'salvage')),
  history_report boolean not null default false,                                           -- lo declara el dealer; To'Latino no lo compra
  history_src text check (history_src is null or char_length(history_src) between 2 and 30),
  pa_inspection boolean not null default false,
  warranty text not null default 'como_esta' check (warranty in ('como_esta', 'dealer', 'fabrica', 'certificado')),
  warranty_months smallint check (warranty_months between 1 and 120),
  warranty_miles integer check (warranty_miles between 100 and 200000),
  street_legal boolean not null default true,                                              -- cuatrimotos y carritos: no van por la calle
  cdl boolean not null default false,                                                      -- ≥ 26,001 libras
  price_cents integer not null check (price_cents between 10000 and 50000000),
  -- El total en la puerta (derivado; lo escribe el servidor y la base comprueba la suma).
  tax_bp integer not null check (tax_bp between 0 and 2000),
  tax_cents integer not null check (tax_cents >= 0),
  tags_cents integer not null check (tags_cents between 0 and 100000),
  doc_fee_cents integer not null check (doc_fee_cents between 0 and 200000),
  otd_cents integer not null,
  -- Pago de ejemplo (financiamiento del dealer): todo o nada (Regulation Z). Siempre «estimado, sujeto a aprobación».
  est_down_cents integer, est_apr_bp integer check (est_apr_bp between 0 and 3000), est_months smallint check (est_months in (12, 24, 36, 48, 60, 72)),
  est_payment_cents integer check (est_payment_cents > 0), est_total_cents integer,
  -- Compre aquí pague aquí: enganche + pago a la semana × semanas = total pagado, con la tasa que resulta.
  bhph_down_cents integer, bhph_week_cents integer check (bhph_week_cents >= 2500), bhph_weeks smallint check (bhph_weeks between 1 and 260),
  bhph_total_cents integer, bhph_apr_bp integer check (bhph_apr_bp between 0 and 20000),
  status text not null default 'lot' check (status in ('lot', 'pending', 'sold', 'hidden')),  -- en el lote · apartado en persona · vendido · oculto
  status_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (tax_cents = (price_cents::bigint * tax_bp + 5000) / 10000),
  check (otd_cents = price_cents + tax_cents + tags_cents + doc_fee_cents),
  check (vin is not null or body in ('bote', 'golf') or year < 1981),
  check (body not in ('carro', 'suv', 'van', 'pickup', 'trabajo', 'caja', 'moto', 'scooter') or miles is not null),
  check (body = 'bote' or engine_hours is null),
  check ((warranty = 'como_esta') = (warranty_months is null) and (warranty <> 'como_esta' or warranty_miles is null)),
  check (title <> 'salvage' or not street_legal),                                          -- salvage: no va por la calle hasta pasar la inspección
  check (history_report or history_src is null),
  check ((est_payment_cents is null) = (est_down_cents is null) and (est_payment_cents is null) = (est_apr_bp is null)
     and (est_payment_cents is null) = (est_months is null) and (est_payment_cents is null) = (est_total_cents is null)),
  check (est_total_cents is null or (est_down_cents < otd_cents and est_total_cents = est_down_cents + est_payment_cents * est_months)),
  check ((bhph_total_cents is null) = (bhph_down_cents is null) and (bhph_total_cents is null) = (bhph_week_cents is null)
     and (bhph_total_cents is null) = (bhph_weeks is null) and (bhph_total_cents is null) = (bhph_apr_bp is null)),
  check (bhph_total_cents is null or (bhph_total_cents = bhph_down_cents + bhph_week_cents * bhph_weeks and bhph_total_cents >= otd_cents))
);
create unique index if not exists vehicle_listings_vin_uno_idx on vehicle_listings (business_id, vin) where vin is not null and status <> 'sold';
create index if not exists vehicle_listings_body_idx on vehicle_listings (city_id, body, price_cents) where status = 'lot';
create index if not exists vehicle_listings_anio_idx on vehicle_listings (city_id, year, miles) where status = 'lot';
create index if not exists vehicle_listings_trgm_idx on vehicle_listings using gin (lower(make || ' ' || model) gin_trgm_ops) where status = 'lot';
create index if not exists vehicle_listings_negocio_idx on vehicle_listings (business_id, status);

-- Tu herramienta de Venta de Autos (una fila por negocio).
create table if not exists dealer_settings (
  business_id text primary key references businesses (id),
  city_id text not null references cities (id),
  kind_override text check (kind_override is null or kind_override in ('lot', 'new', 'bhph', 'work', 'moto', 'rv', 'lux', 'salv', 'mayor', 'broker',
    'cash', 'placas', 'fin', 'taller', 'envio')),
  doc_fee_cents integer not null default 0 check (doc_fee_cents between 0 and 200000),        -- ≤ tope de PA (trigger abajo)
  tags_cents integer not null default 15000 check (tags_cents between 0 and 100000),           -- placas y título que cobra el dealer
  fin boolean not null default false,                                                          -- financias en el lote
  itin boolean not null default false,                                                         -- también con ITIN (nunca se guarda el número)
  no_credit boolean not null default false,                                                    -- financias sin historial de crédito
  itin_down_cents integer not null default 150000 check (itin_down_cents between 50000 and 2000000), -- enganche desde (≥ $500, L435)
  apr_bp integer check (apr_bp between 0 and 3000),                                            -- tasa del pago de ejemplo
  term_m smallint check (term_m in (12, 24, 36, 48, 60, 72)),                                  -- meses del pago de ejemplo
  trade boolean not null default false,
  home_test boolean not null default false,                                                    -- prueba de manejo en casa (L434)
  reports_credit boolean not null default false,                                               -- compre aquí pague aquí reporta los pagos (L433)
  warranty_default smallint not null default 0 check (warranty_default in (0, 3, 6)),          -- motor y transmisión (L436)
  bhph_down_cents integer not null default 99900 check (bhph_down_cents between 0 and 1000000),
  bhph_week_cents integer not null default 9500 check (bhph_week_cents between 2500 and 100000), -- ≥ $25 (L431)
  bhph_months smallint not null default 18 check (bhph_months in (12, 18, 24, 36)),
  lot_total smallint not null default 0 check (lot_total between 0 and 5000),                  -- «Carros en el lote, aunque no todos estén en la app» (L438)
  derived_on date,                                                                             -- el día en que se rehicieron los totales, la tarjeta y los filtros
  updated_by uuid references users (id),
  updated_at timestamptz not null default now(),
  check ((apr_bp is null) = (term_m is null))
);

-- El tope del cargo del dealer (documentary fee de PA; se ajusta cada año). A VERIFICAR antes de abrir (LAUNCH-CHECKLIST). Solo un Admin
-- lo cambia (Catálogo › Cargo del dealer, con auditoría) y el cambio recalcula los totales por lotes.
insert into platform_config (key, value, note) values ('dealer_doc_fee_cap_cents', '47700'::jsonb,
  'Tope del cargo del dealer en PA (documentary fee con trámite electrónico). A VERIFICAR con el Board of Vehicles el valor del año.')
on conflict (key) do nothing;

-- Ningún cargo del dealer pasa del tope (además del servidor). Solo cuando el cargo cambia: bajar el tope no rompe los carros que el
-- barrido todavía no recalculó.
create or replace function autos_tope_cargo() returns trigger language plpgsql as $$
declare tope int := coalesce((select (value #>> '{}')::int from platform_config where key = 'dealer_doc_fee_cap_cents'), 0);
begin
  if (tg_op = 'INSERT' or new.doc_fee_cents is distinct from old.doc_fee_cents) and new.doc_fee_cents > tope then
    raise exception 'El cargo del dealer (%) pasa del tope de PA (%)', new.doc_fee_cents, tope using errcode = 'check_violation';
  end if;
  return new;
end $$;
drop trigger if exists vehicle_listings_tope on vehicle_listings;
create trigger vehicle_listings_tope before insert or update on vehicle_listings for each row execute function autos_tope_cargo();
drop trigger if exists dealer_settings_tope on dealer_settings;
create trigger dealer_settings_tope before insert or update on dealer_settings for each row execute function autos_tope_cargo();

-- El impuesto de la venta de un vehículo en las cinco ciudades: 6 % (PA). En datos, nunca en código (a verificar con el contador: impuesto
-- local, si el cargo del dealer paga impuesto y si el carro a cambio lo baja; LAUNCH-CHECKLIST). parts_bp = impuesto sobre el precio.
insert into tax_rules (city_id, category_id, parts_bp, labor_bp)
  select c.id, 'NEG-DEALER', 600, 0 from cities c where not exists (select 1 from tax_rules t where t.city_id = c.id and t.category_id = 'NEG-DEALER');

-- Sellos de Venta de Autos (no bloquean nada; textos y registros a verificar antes de abrir: LAUNCH-CHECKLIST, §6 #16). La clave nmls es
-- de Profesionales y nmls_inm de Bienes Raíces: aquí nmls_dealer (cada clave es de una categoría).
insert into license_kinds (key, category_id, title, can, cannot, issuer, registry_site, registry_url, number_label, sort) values
  ('pa_dealer', 'NEG-DEALER', '{"es":"Dealer con licencia de PA","en":"PA licensed dealer"}',
   '{"es":"Vender vehículos usados o nuevos al público con licencia del estado","en":"Sell used or new vehicles to the public under a state license"}',
   '{"es":"La licencia es del lote; un vendedor necesita la suya","en":"The license covers the lot; each salesperson needs their own"}',
   '{"es":"Junta Estatal de Fabricantes, Dealers y Vendedores de Vehículos de PA","en":"PA State Board of Vehicle Manufacturers, Dealers and Salespersons"}', 'pals.pa.gov', 'https://www.pals.pa.gov/#/page/search', 'Licencia #', 1),
  ('pa_vendedor_autos', 'NEG-DEALER', '{"es":"Vendedor de vehículos con licencia de PA","en":"PA licensed vehicle salesperson"}',
   '{"es":"Vender vehículos para un dealer con licencia","en":"Sell vehicles for a licensed dealer"}',
   '{"es":"Solo para el dealer que sale en su licencia","en":"Only for the dealer named on the license"}',
   '{"es":"Junta Estatal de Fabricantes, Dealers y Vendedores de Vehículos de PA","en":"PA State Board of Vehicle Manufacturers, Dealers and Salespersons"}', 'pals.pa.gov', 'https://www.pals.pa.gov/#/page/search', 'Licencia #', 2),
  ('pa_venta_plazos', 'NEG-DEALER', '{"es":"Venta a plazos de vehículos (PA)","en":"PA vehicle installment seller"}',
   '{"es":"Vender a plazos (compre aquí pague aquí o financiamiento del dealer) con licencia del estado","en":"Sell on installments (buy here pay here or dealer financing) under a state license"}',
   '{"es":"La tasa, los meses y el total van por escrito; nadie garantiza la aprobación","en":"Rate, term and total go in writing; no one guarantees approval"}',
   '{"es":"Departamento de Banca y Valores de PA","en":"PA Department of Banking and Securities"}', 'nmlsconsumeraccess.org', 'https://www.nmlsconsumeraccess.org', 'Licencia #', 3),
  ('nmls_dealer', 'NEG-DEALER', '{"es":"Prestamista con licencia (NMLS)","en":"Licensed lender (NMLS)"}',
   '{"es":"Dar préstamos de carro con licencia del estado","en":"Make auto loans under a state license"}',
   '{"es":"Nadie puede garantizar la aprobación antes de revisar tus papeles","en":"No one can guarantee approval before reviewing your papers"}',
   '{"es":"NMLS y Departamento de Banca y Valores de PA","en":"NMLS and PA Department of Banking and Securities"}', 'nmlsconsumeraccess.org', 'https://www.nmlsconsumeraccess.org', 'NMLS #', 4)
on conflict (key) do nothing;
commit;
