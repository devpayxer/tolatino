-- 0057 · Doctores y Profesionales: servicios, Tu herramienta, seguros y licencias (Fase 4 · bloque 4h).
-- Plan: docs/diseno/plan/fase4-salud-pro.md §2. Diseño: neg-salud-listing.js / neg-pro-listing.js (SVC), dash2-cat.js
-- (Tu herramienta NEG-SALUD «Seguros e idiomas» y NEG-PRO «Licencias y el total por escrito"), neg-salud.js (INS / PLANS).
-- Los servicios siguen el motor de citas por persona (3b) con su forma de cobrar en svc_kind / svc_attrs (validados en
-- lib/servicios.ts). Nada se borra; city_id en lo nuevo que lo necesita.
begin;
-- Formas de cobrar. Salud: consulta · por video · sin cita · gratis con tu seguro · precio fijo.
-- Pro: consulta · honorario fijo (+ gobierno aparte) · por hora · % solo si ganas · sin cita · se cotiza.
alter table items drop constraint items_svc_kind_check;
alter table items add constraint items_svc_kind_check check (svc_kind = any (array['fijo', 'desde', 'cotiza', 'diag', 'lav', 'goma', 'insp', 'grua',
  'visita', 'hora', 'area', 'pres', 'emer', 'plan', 'cons', 'tele', 'walk', 'free', 'proc', 'pct']));

-- Catálogo de seguros (Super Admin › Catálogo; nunca en código). Pennsylvania.
create table insurers (
  key text primary key check (key ~ '^[a-z0-9_]{2,40}$'),
  state text not null default 'PA',
  kind text not null check (kind in ('pub', 'priv')),
  name jsonb not null,                     -- {es, en}
  plans jsonb not null default '[]'::jsonb, -- [{key, name: {es, en}}]
  sort smallint not null default 0,
  hidden boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into insurers (key, kind, name, plans, sort) values
  ('medicaid', 'pub', '{"es": "Medicaid", "en": "Medicaid"}', '[{"key": "upmcfy", "name": {"es": "UPMC for You", "en": "UPMC for You"}}, {"key": "geifam", "name": {"es": "Geisinger Health Plan Family", "en": "Geisinger Health Plan Family"}}, {"key": "ahc", "name": {"es": "AmeriHealth Caritas", "en": "AmeriHealth Caritas"}}]', 0),
  ('medicare', 'pub', '{"es": "Medicare", "en": "Medicare"}', '[{"key": "orig", "name": {"es": "Medicare original", "en": "Original Medicare"}}, {"key": "adv", "name": {"es": "Medicare Advantage", "en": "Medicare Advantage"}}]', 1),
  ('chip', 'pub', '{"es": "CHIP (niños)", "en": "CHIP (children)"}', '[]', 2),
  ('highmark', 'priv', '{"es": "Highmark", "en": "Highmark"}', '[]', 10),
  ('geisinger', 'priv', '{"es": "Geisinger Health Plan", "en": "Geisinger Health Plan"}', '[]', 11),
  ('upmc', 'priv', '{"es": "UPMC", "en": "UPMC"}', '[]', 12),
  ('aetna', 'priv', '{"es": "Aetna", "en": "Aetna"}', '[]', 13),
  ('cigna', 'priv', '{"es": "Cigna", "en": "Cigna"}', '[]', 14),
  ('uhc', 'priv', '{"es": "UnitedHealthcare", "en": "UnitedHealthcare"}', '[]', 15),
  ('delta', 'priv', '{"es": "Delta Dental", "en": "Delta Dental"}', '[]', 16),
  ('vsp', 'priv', '{"es": "VSP", "en": "VSP"}', '[]', 17),
  ('eyemed', 'priv', '{"es": "EyeMed", "en": "EyeMed"}', '[]', 18),
  ('ccbh', 'pub', '{"es": "Community Care (salud mental)", "en": "Community Care (behavioral health)"}', '[]', 3)
on conflict (key) do nothing;

-- Tu herramienta de Salud («Seguros e idiomas»).
create table health_settings (
  business_id text primary key references businesses(id),
  insurers text[] not null default '{}',
  uninsured boolean not null default true,
  cash_cents int not null default 8500 check (cash_cents between 2000 and 40000 and cash_cents % 500 = 0),
  langs text[] not null default '{es,en}' check (langs <@ array['es', 'en', 'pt', 'ht'] and cardinality(langs) >= 1),
  tele boolean not null default false,
  new_patients boolean not null default true,
  walk_wait_min smallint check (walk_wait_min between 0 and 180),
  walk_wait_at timestamptz,
  sliding boolean not null default false,
  no_id boolean not null default false,
  interp boolean not null default false,
  video_url text check (video_url ~ '^https://[^\s"<>]{4,300}$'),
  updated_by uuid references users(id),
  updated_at timestamptz not null default now(),
  check (uninsured or cardinality(insurers) >= 1)
);

-- Tu herramienta de Profesionales que no son legales (seguros, reparación, imprenta, envíos, oficina…).
create table pro_settings (
  business_id text primary key references businesses(id),
  days smallint not null default 2 check (days between 1 and 90),
  warranty_days smallint not null default 0 check (warranty_days between 0 and 365 and warranty_days % 15 = 0),
  estimate_first boolean not null default true,
  insurers_n smallint check (insurers_n between 1 and 30),
  compares boolean not null default false,
  payment_plan boolean not null default false,
  urgent boolean not null default false,
  updated_by uuid references users(id),
  updated_at timestamptz not null default now()
);

-- Licencias de Salud (no había ninguna) y el Agente registrado del IRS. Emisor: las juntas de PA; buscador oficial: PALS.
insert into license_kinds (key, category_id, title, can, cannot, issuer, registry_site, registry_url, number_label, sort) values
  ('md', 'NEG-SALUD', '{"es": "Médico (MD/DO)", "en": "Physician (MD/DO)"}', '{"es": "Diagnostica, receta y trata.", "en": "Diagnoses, prescribes and treats."}', null, '{"es": "Junta de Medicina de PA", "en": "PA State Board of Medicine"}', 'pals.pa.gov', 'https://www.pals.pa.gov', 'Lic. #', 1),
  ('pac', 'NEG-SALUD', '{"es": "Asistente médico (PA-C)", "en": "Physician assistant (PA-C)"}', '{"es": "Diagnostica y trata con un médico supervisor.", "en": "Diagnoses and treats with a supervising physician."}', null, '{"es": "Junta de Medicina de PA", "en": "PA State Board of Medicine"}', 'pals.pa.gov', 'https://www.pals.pa.gov', 'Lic. #', 2),
  ('crnp', 'NEG-SALUD', '{"es": "Enfermera practicante (CRNP)", "en": "Nurse practitioner (CRNP)"}', '{"es": "Diagnostica, receta y trata.", "en": "Diagnoses, prescribes and treats."}', null, '{"es": "Junta de Enfermería de PA", "en": "PA State Board of Nursing"}', 'pals.pa.gov', 'https://www.pals.pa.gov', 'Lic. #', 3),
  ('rn', 'NEG-SALUD', '{"es": "Enfermera (RN)", "en": "Registered nurse (RN)"}', '{"es": "Cuida y da tratamientos indicados.", "en": "Provides care and ordered treatments."}', null, '{"es": "Junta de Enfermería de PA", "en": "PA State Board of Nursing"}', 'pals.pa.gov', 'https://www.pals.pa.gov', 'Lic. #', 4),
  ('dpt', 'NEG-SALUD', '{"es": "Terapeuta físico (DPT)", "en": "Physical therapist (DPT)"}', '{"es": "Evalúa y da terapia física.", "en": "Evaluates and provides physical therapy."}', null, '{"es": "Junta de Terapia Física de PA", "en": "PA State Board of Physical Therapy"}', 'pals.pa.gov', 'https://www.pals.pa.gov', 'Lic. #', 5),
  ('ot', 'NEG-SALUD', '{"es": "Terapeuta ocupacional", "en": "Occupational therapist"}', '{"es": "Da terapia ocupacional.", "en": "Provides occupational therapy."}', null, '{"es": "Junta de Terapia Ocupacional de PA", "en": "PA State Board of Occupational Therapy"}', 'pals.pa.gov', 'https://www.pals.pa.gov', 'Lic. #', 6),
  ('slp', 'NEG-SALUD', '{"es": "Terapeuta del habla (CCC-SLP)", "en": "Speech-language pathologist (CCC-SLP)"}', '{"es": "Evalúa y trata el habla y el lenguaje.", "en": "Evaluates and treats speech and language."}', null, '{"es": "Junta de Examinadores de Audiología y Habla de PA", "en": "PA State Board of Examiners in Speech-Language Pathology and Audiology"}', 'pals.pa.gov', 'https://www.pals.pa.gov', 'Lic. #', 7),
  ('psy', 'NEG-SALUD', '{"es": "Psicólogo", "en": "Psychologist"}', '{"es": "Evalúa y da terapia psicológica.", "en": "Assesses and provides psychotherapy."}', null, '{"es": "Junta de Psicología de PA", "en": "PA State Board of Psychology"}', 'pals.pa.gov', 'https://www.pals.pa.gov', 'Lic. #', 8),
  ('lpc', 'NEG-SALUD', '{"es": "Consejero profesional (LPC)", "en": "Licensed professional counselor (LPC)"}', '{"es": "Da consejería y terapia.", "en": "Provides counseling and therapy."}', null, '{"es": "Junta de Trabajo Social, Terapia Familiar y Consejería de PA", "en": "PA State Board of Social Workers, Marriage and Family Therapists and Professional Counselors"}', 'pals.pa.gov', 'https://www.pals.pa.gov', 'Lic. #', 9),
  ('lcsw', 'NEG-SALUD', '{"es": "Trabajador social clínico (LCSW)", "en": "Licensed clinical social worker (LCSW)"}', '{"es": "Da terapia y apoyo clínico.", "en": "Provides therapy and clinical support."}', null, '{"es": "Junta de Trabajo Social, Terapia Familiar y Consejería de PA", "en": "PA State Board of Social Workers, Marriage and Family Therapists and Professional Counselors"}', 'pals.pa.gov', 'https://www.pals.pa.gov', 'Lic. #', 10),
  ('dds', 'NEG-SALUD', '{"es": "Dentista (DDS/DMD)", "en": "Dentist (DDS/DMD)"}', '{"es": "Diagnostica y trata los dientes.", "en": "Diagnoses and treats teeth."}', null, '{"es": "Junta de Odontología de PA", "en": "PA State Board of Dentistry"}', 'pals.pa.gov', 'https://www.pals.pa.gov', 'Lic. #', 11),
  ('rdh', 'NEG-SALUD', '{"es": "Higienista dental", "en": "Dental hygienist"}', '{"es": "Limpieza y prevención.", "en": "Cleanings and prevention."}', null, '{"es": "Junta de Odontología de PA", "en": "PA State Board of Dentistry"}', 'pals.pa.gov', 'https://www.pals.pa.gov', 'Lic. #', 12),
  ('od', 'NEG-SALUD', '{"es": "Optometrista (OD)", "en": "Optometrist (OD)"}', '{"es": "Examina la vista y receta lentes.", "en": "Examines eyes and prescribes lenses."}', null, '{"es": "Junta de Optometría de PA", "en": "PA State Board of Optometry"}', 'pals.pa.gov', 'https://www.pals.pa.gov', 'Lic. #', 13),
  ('dc', 'NEG-SALUD', '{"es": "Quiropráctico (DC)", "en": "Chiropractor (DC)"}', '{"es": "Ajustes y tratamiento de columna.", "en": "Spinal adjustments and treatment."}', null, '{"es": "Junta de Quiropráctica de PA", "en": "PA State Board of Chiropractic"}', 'pals.pa.gov', 'https://www.pals.pa.gov', 'Lic. #', 14),
  ('rph', 'NEG-SALUD', '{"es": "Farmacia", "en": "Pharmacy"}', '{"es": "Despacha recetas y vacuna.", "en": "Fills prescriptions and vaccinates."}', null, '{"es": "Junta de Farmacia de PA", "en": "PA State Board of Pharmacy"}', 'pals.pa.gov', 'https://www.pals.pa.gov', 'Lic. #', 15),
  ('cnm', 'NEG-SALUD', '{"es": "Partera certificada (CNM)", "en": "Certified nurse midwife (CNM)"}', '{"es": "Embarazo, parto y salud de la mujer.", "en": "Pregnancy, birth and women''s health."}', null, '{"es": "Junta de Medicina de PA", "en": "PA State Board of Medicine"}', 'pals.pa.gov', 'https://www.pals.pa.gov', 'Lic. #', 16),
  ('ldn', 'NEG-SALUD', '{"es": "Nutricionista (LDN)", "en": "Licensed dietitian-nutritionist (LDN)"}', '{"es": "Planes de alimentación y nutrición.", "en": "Meal and nutrition plans."}', null, '{"es": "Junta de Enfermería de PA", "en": "PA State Board of Nursing"}', 'pals.pa.gov', 'https://www.pals.pa.gov', 'Lic. #', 17),
  ('ea', 'NEG-PRO', '{"es": "Agente registrado (EA) · IRS", "en": "Enrolled agent (EA) · IRS"}', '{"es": "Hace impuestos y te representa ante el IRS.", "en": "Does taxes and represents you before the IRS."}', null, '{"es": "IRS", "en": "IRS"}', 'irs.gov', 'https://www.irs.gov/tax-professionals/enrolled-agents', 'EA #', 30)
on conflict (key) do nothing;

-- La licencia de la persona (staff): «Licencia médica de Pennsylvania · verificada». Una viva por negocio, tipo y persona.
alter table licenses add column if not exists member_id uuid references business_members(id);
drop index if exists licenses_viva_idx;
create unique index licenses_viva_idx on licenses (business_id, kind, coalesce(member_id, '00000000-0000-0000-0000-000000000000'::uuid)) where status <> 'withdrawn';

-- «Tu seguro» en la cuenta (como Tu vehículo / Tu casa): del número del miembro solo los 4 últimos.
create table user_insurances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  kind text not null check (kind in ('medicaid', 'medicare', 'chip', 'priv', 'none')),
  insurer text references insurers(key),
  plan text check (char_length(plan) <= 40),
  member_last4 char(4) check (member_last4 ~ '^[0-9A-Za-z]{4}$'),
  for_whom text not null default 'yo' check (for_whom in ('yo', 'hijo', 'otro')),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  removed_at timestamptz
);
create index user_insurances_user_idx on user_insurances (user_id) where removed_at is null;
commit;
