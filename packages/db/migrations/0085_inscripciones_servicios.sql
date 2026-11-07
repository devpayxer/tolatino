-- 0085 · Inscripciones (motor común de Educación, Niños y Deporte) + Educación «Grupos y cupos» (Fase 4 · 4ea).
-- Plan: docs/diseno/plan/fase4-edu-ninos-deporte.md §2 y §4ea. Diseño: neg-edu-listing.js (k curso · mes · clase · hora; dias, start,
-- sem, hrs, mat, cert, inc, no, plan, gratis1), dash2-cat.js blocksE L449–464 y apply L225–231.
--   · items.svc_kind suma 'curso', 'mes', 'semana', 'clase' ('hora' ya existe). La matrícula que aparta el cupo es items.deposit_cents.
--   · class_groups: cada grupo (o sesión o temporada) con fecha y cupos; el patrón de trip_runs (seats_booked derivado, lo mantiene el
--     servidor con el candado del grupo en la misma transacción).
--   · insc_settings: Tu herramienta de las tres (una fila por negocio); 4eb y 4ec suman sus columnas.
--   · Licencias de escuelas (sellos; no bloquean nada; textos sin verificar, LAUNCH-CHECKLIST) y la comisión 'insc'.
-- Lo que sale en la tarjeta y en Buscar se deriva (filter_values y attrs.tarjeta): nunca se edita a mano. Idempotente; nada se borra.
begin;

alter table items drop constraint if exists items_svc_kind_check;
alter table items add constraint items_svc_kind_check check (svc_kind = any (array[
  'fijo', 'desde', 'cotiza', 'diag', 'lav', 'goma', 'insp', 'grua', 'visita', 'hora', 'area', 'pres', 'emer', 'plan',
  'cons', 'tele', 'walk', 'free', 'proc', 'pct', 'pack', 'unid', 'asiento', 'priv', 'caja',
  'cover', 'lista', 'mesa', 'vip', 'evento', 'fecha',
  'curso', 'mes', 'semana', 'clase']));

-- La matrícula de un curso aparta el cupo y se descuenta del total: siempre menos que el precio (guardián matriculaMenor).
alter table items drop constraint if exists items_matricula_check;
alter table items add constraint items_matricula_check check (svc_kind is distinct from 'curso' or deposit_cents < price_cents);

-- Grupos con fecha y cupos. Las clases sueltas y las horas (tutoría, cancha) son grupos de un día (cupo 1 en la tutoría).
create table if not exists class_groups (
  id bigint generated always as identity primary key,
  business_id text not null references businesses (id),
  city_id text not null references cities (id),
  item_id bigint not null references items (id),
  label jsonb not null check (char_length(label->>'es') between 2 and 40),
  starts_on date not null,
  ends_on date,
  dows smallint[] not null default '{}' check (dows <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]),
  start_min smallint check (start_min is null or start_min between 0 and 1439),
  dur_min smallint check (dur_min is null or dur_min between 15 and 600),
  -- La herramienta cuenta CUPOS LIBRES (0–40; 0 = lleno, no sale en la página): el servidor guarda el total = ocupados + libres.
  seats_total smallint not null check (seats_total between 0 and 120),
  seats_outside smallint not null default 0 check (seats_outside >= 0),   -- inscritos fuera de la app
  seats_booked smallint not null default 0 check (seats_booked >= 0),     -- derivado: lo mantiene el servidor con el candado del grupo
  status text not null default 'open' check (status in ('open', 'cancelled', 'started', 'finished')),
  cancel_reason text check (char_length(cancel_reason) <= 200),
  join_url text check (join_url is null or (join_url ~ '^https://' and char_length(join_url) <= 300)), -- solo a inscritos confirmados
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or ends_on >= starts_on),
  check (seats_outside + seats_booked <= seats_total)
);
create index if not exists class_groups_abiertos_idx on class_groups (business_id, starts_on) where status = 'open';
create index if not exists class_groups_item_idx on class_groups (item_id, starts_on);

-- Tu herramienta de Educación, Niños y Deporte (una fila por negocio). Cómo da las clases: al menos una forma.
create table if not exists insc_settings (
  business_id text primary key references businesses (id),
  city_id text not null references cities (id),
  rubro text not null check (rubro in ('edu', 'ninos', 'dep')),
  how_presencial boolean not null default true,
  how_linea boolean not null default false,
  how_hibrido boolean not null default false,
  esp boolean not null default false,
  reply_h smallint not null default 24 check (reply_h between 2 and 72),
  kind_override text check (kind_override is null or char_length(kind_override) <= 12),
  derived_on date, -- el día en que se recalcularon la tarjeta y los filtros (el barrido los rehace cuando cambia el día)
  updated_by uuid references users (id),
  updated_at timestamptz not null default now(),
  check (how_presencial or how_linea or how_hibrido)
);

-- Licencias de escuelas (sellos que no bloquean nada; textos y registros a verificar antes de abrir: LAUNCH-CHECKLIST).
insert into license_kinds (key, category_id, title, can, cannot, issuer, registry_site, registry_url, number_label, sort) values
  ('pa_escuela_privada', 'NEG-EDU', '{"es":"Escuela privada con licencia (PDE)","en":"Licensed private school (PDE)"}',
   '{"es":"Dar cursos con licencia del Departamento de Educación de PA","en":"Teach courses licensed by the PA Department of Education"}',
   '{"es":"No da títulos universitarios si su licencia no lo dice","en":"Does not grant college degrees unless its license says so"}',
   '{"es":"Departamento de Educación de Pennsylvania","en":"Pennsylvania Department of Education"}', 'education.pa.gov', 'https://www.education.pa.gov', 'Licencia #', 1),
  ('pa_escuela_barberia', 'NEG-EDU', '{"es":"Escuela de barbería o cosmetología aprobada","en":"Approved barber or cosmetology school"}',
   '{"es":"Dar las horas que pide la licencia estatal","en":"Provide the hours the state license requires"}',
   '{"es":"La licencia de barbero o cosmetólogo la da el estado tras el examen","en":"The barber or cosmetology license is issued by the state after the exam"}',
   '{"es":"Juntas estatales de Barbería y de Cosmetología de PA","en":"PA State Boards of Barber Examiners and Cosmetology"}', 'pals.pa.gov', 'https://www.pals.pa.gov/#/page/search', 'Licencia #', 2),
  ('fmcsa_cdl', 'NEG-EDU', '{"es":"Escuela de CDL en el registro federal (FMCSA)","en":"CDL school on the federal registry (FMCSA)"}',
   '{"es":"Dar el entrenamiento que se pide antes del examen de CDL","en":"Provide the training required before the CDL test"}',
   '{"es":"La licencia CDL la da PennDOT tras el examen","en":"The CDL is issued by PennDOT after the test"}',
   '{"es":"Registro de Proveedores de Entrenamiento (FMCSA)","en":"Training Provider Registry (FMCSA)"}', 'tpr.fmcsa.dot.gov', 'https://tpr.fmcsa.dot.gov', 'Proveedor #', 3),
  ('pa_escuela_manejo', 'NEG-EDU', '{"es":"Escuela de manejo con licencia de PennDOT","en":"PennDOT-licensed driving school"}',
   '{"es":"Dar clases de manejo","en":"Give driving lessons"}',
   '{"es":"La licencia de manejo la da PennDOT tras el examen","en":"The driver license is issued by PennDOT after the test"}',
   '{"es":"PennDOT","en":"PennDOT"}', 'dmv.pa.gov', 'https://www.dmv.pa.gov', 'Licencia #', 4)
on conflict (key) do nothing;

-- Comisión de la matrícula (igual que la de citas mientras no se decida otra; Super Admin › Planes).
alter table fee_rules drop constraint fee_rules_kind_check;
alter table fee_rules add constraint fee_rules_kind_check check (kind = any (array['ped', 'cita', 'bol', 'apt', 'rsv', 'plan', 'renta', 'merc', 'fiesta', 'viaje', 'noche', 'insc']));
insert into fee_rules (kind, rate_bp, fixed_cents, effective_from, reason)
select 'insc', 800, 0, '2026-01-01', 'Comisión inicial de la matrícula de Educación, Niños y Deporte (igual que la de citas; Super Admin › Planes)'
 where not exists (select 1 from fee_rules where kind = 'insc');
commit;
