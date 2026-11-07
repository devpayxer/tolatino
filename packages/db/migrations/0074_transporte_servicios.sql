-- 0074 · Transporte: servicios (por asiento con salidas fijas, vehículo completo, caja o envío, precio cerrado con fotos),
-- «Salidas y asientos» / «Disponibilidad y servicio», salidas de cada día con asientos, licencias y comisión (Fase 4 · 4w).
-- Plan: docs/diseno/plan/fase4-fiestas-transporte.md §2 y §4w. Diseño: neg-trans.js, neg-trans-listing.js (k asiento · priv · caja ·
-- cotiza; sal, pax, child, inc), dash2-cat.js TOOLS['NEG-TRANS']. «Quedan» se deriva (asientos − vendidos fuera − reservados): nunca
-- se escribe a mano. Idempotente.
begin;

alter table items drop constraint if exists items_svc_kind_check;
alter table items add constraint items_svc_kind_check check (svc_kind = any (array[
  'fijo', 'desde', 'cotiza', 'diag', 'lav', 'goma', 'insp', 'grua', 'visita', 'hora', 'area', 'pres', 'emer', 'plan',
  'cons', 'tele', 'walk', 'free', 'proc', 'pct', 'pack', 'unid', 'asiento', 'priv', 'caja']));

-- Tu herramienta de Transporte (una fila por negocio).
create table if not exists trans_settings (
  business_id text primary key references businesses (id),
  kind_override text check (kind_override in ('van', 'air', 'caja', 'mud', 'med', 'emp', 'taxi', 'courier', 'cdl', 'grua', 'renta', 'escolar')),
  bags_included smallint not null default 2 check (bags_included between 0 and 3),
  extra_bag_cents int check (extra_bag_cents is null or extra_bag_cents between 0 and 20000),
  available_today_on date,                  -- «Disponible hoy»: vale solo ese día (vence a medianoche de la ciudad)
  child_seat boolean not null default false, -- asiento de niño
  ramp boolean not null default false,       -- rampa para silla de ruedas
  ship_day text check (ship_day in ('sab', 'mie', '15d')),
  ship_weeks text check (ship_weeks in ('2-3', '3-4', '4-6')),
  cutoff_h smallint check (cutoff_h is null or cutoff_h between 6 and 20),
  cancel_free_h smallint not null default 24 check (cancel_free_h = 24),
  cancel_fee_pct smallint not null default 50 check (cancel_fee_pct = 50),
  updated_by uuid references users (id),
  updated_at timestamptz not null default now()
);

-- Cada salida de un día (se crea al primer pedido o cuando el panel la toca).
create table if not exists trip_runs (
  id bigint generated always as identity primary key,
  business_id text not null references businesses (id),
  city_id text not null references cities (id),
  item_id bigint not null references items (id),
  run_at timestamptz not null,
  seats_total smallint not null check (seats_total between 1 and 56),
  seats_outside smallint not null default 0 check (seats_outside >= 0),
  seats_booked smallint not null default 0 check (seats_booked >= 0), -- derivado: lo mantiene el servidor en la misma transacción
  status text not null default 'scheduled' check (status in ('scheduled', 'cancelled', 'departed', 'arrived')),
  cancel_reason text check (char_length(cancel_reason) <= 200),
  late_until timestamptz,
  departed_at timestamptz,
  arrived_at timestamptz,
  driver_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (item_id, run_at),
  check (seats_outside + seats_booked <= seats_total)
);
create index if not exists trip_runs_negocio_idx on trip_runs (business_id, run_at);

-- Licencias de Transporte (sin verificar la lista legal: LAUNCH-CHECKLIST). Sin la de su tipo válida, no se reserva en la app.
insert into license_kinds (key, category_id, title, can, cannot, issuer, registry_site, registry_url, number_label, sort) values
  ('pa_puc', 'NEG-TRANS', '{"es":"Autorización de la PUC de Pennsylvania","en":"Pennsylvania PUC authority"}', '{"es":"Taxi, aeropuerto, limosina, traslados y mudanzas dentro de PA","en":"Taxi, airport, limo, rides and moves within PA"}', null,
   '{"es":"Comisión de Servicios Públicos de PA (PUC)","en":"PA Public Utility Commission (PUC)"}', 'puc.pa.gov', 'https://www.puc.pa.gov/transportation/', 'A-#', 1),
  ('usdot', 'NEG-TRANS', '{"es":"Número USDOT","en":"USDOT number"}', '{"es":"Vehículos comerciales","en":"Commercial vehicles"}', null,
   '{"es":"Departamento de Transporte de EE. UU. (FMCSA)","en":"U.S. Department of Transportation (FMCSA)"}', 'safer.fmcsa.dot.gov', 'https://safer.fmcsa.dot.gov/CompanySnapshot.aspx', 'USDOT #', 2),
  ('fmcsa_mc', 'NEG-TRANS', '{"es":"Autoridad interestatal (MC)","en":"Interstate authority (MC)"}', '{"es":"Llevar pasajeros o carga entre estados","en":"Carry passengers or freight across states"}', null,
   '{"es":"FMCSA","en":"FMCSA"}', 'safer.fmcsa.dot.gov', 'https://safer.fmcsa.dot.gov/CompanySnapshot.aspx', 'MC #', 3),
  ('cdl', 'NEG-TRANS', '{"es":"Licencia de conducir comercial (CDL)","en":"Commercial driver license (CDL)"}', '{"es":"Manejar camiones y tráileres","en":"Drive trucks and trailers"}', null,
   '{"es":"PennDOT","en":"PennDOT"}', 'dmv.pa.gov', 'https://www.dmv.pa.gov/Driver-Services/Pages/default.aspx', 'CDL #', 4),
  ('seguro_carga', 'NEG-TRANS', '{"es":"Seguro de carga","en":"Cargo insurance"}', '{"es":"Llevar carga de otros","en":"Carry other people''s freight"}', null,
   '{"es":"La aseguradora del negocio","en":"The business insurer"}', 'insurance.pa.gov', 'https://www.insurance.pa.gov/Consumers/Pages/default.aspx', 'Póliza #', 5),
  ('fmc_oti', 'NEG-TRANS', '{"es":"Intermediario de envíos al extranjero (OTI)","en":"Ocean transportation intermediary (OTI)"}', '{"es":"Mandar cajas y tanques al extranjero","en":"Ship boxes and barrels abroad"}', null,
   '{"es":"Comisión Marítima Federal (FMC)","en":"Federal Maritime Commission (FMC)"}', 'fmc.gov', 'https://www2.fmc.gov/oti/', 'OTI #', 6),
  ('act_menores', 'NEG-TRANS', '{"es":"Autorización de transporte escolar","en":"School transport authorization"}', '{"es":"Llevar niños a la escuela","en":"Drive children to school"}', null,
   '{"es":"PennDOT y el distrito escolar","en":"PennDOT and the school district"}', 'dmv.pa.gov', 'https://www.dmv.pa.gov/Driver-Services/Pages/default.aspx', 'Autorización #', 7)
on conflict (key) do nothing;

-- Comisión de viajes (sobre lo cobrado en la app; Preguntas #20). Empieza igual que la de citas.
alter table fee_rules drop constraint fee_rules_kind_check;
alter table fee_rules add constraint fee_rules_kind_check check (kind = any (array['ped', 'cita', 'bol', 'apt', 'rsv', 'plan', 'renta', 'merc', 'fiesta', 'viaje']));
insert into fee_rules (kind, rate_bp, fixed_cents, effective_from, reason)
select 'viaje', 800, 0, '2026-01-01', 'Comisión inicial de un viaje o envío (igual que la de citas; Super Admin › Planes)'
 where not exists (select 1 from fee_rules where kind = 'viaje');
commit;
