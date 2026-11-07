-- 0091 · Iglesias: «Horarios y ayuda», servicios gratis · donativo · total, funerarias y licencias (Fase 4 · 4ia).
-- Plan: docs/diseno/plan/fase4-iglesias-inmuebles-autos.md §2 «0091 iglesias_horarios», §3 y §4ia. Diseño: neg-fe.js (cul, tags),
-- neg-fe-listing.js (SVC: fe gratis | don | tot, dur, inc, no), neg-fe-kind.js (KS, LINE), dash2-cat.js L132–136 (MISA, CULTO, AYUDA,
-- FREQ), apply L254–267 y blocksE L488–507.
--   · worship_times: los servicios de la semana (misa, culto, grupo, oración) con su día, hora, nombre e idioma. La tarjeta
--     («Misa en español: domingo 12 PM y sábado 6 PM») y los filtros (misaesp, esp) salen de aquí; nunca se editan a mano.
--   · fe_settings: Tu herramienta (una fila por negocio): bilingüe, ayuda gratis, sin papeles, cada cuánto viene una familia,
--     «Se acabó por hoy» (vale solo ese día: el barrido lo apaga), catecismo abierto, funeraria 24 h, plan de pagos (texto, nunca
--     un cobro) y días de la repatriación. El tipo forzado (kind_override) solo lo pone el Super Admin.
--   · Iglesias no cobra nada en la app (§3, §6 #1): ningún ítem de NEG-FE lleva depósito (trigger; guardián ayudaGratisIglesia).
--   · Sellos de funeraria, representante acreditado del DOJ y 501(c)(3) (no bloquean nada; textos sin verificar, LAUNCH-CHECKLIST).
-- Idempotente; nada se borra (removed_at).
begin;

create table if not exists worship_times (
  id bigint generated always as identity primary key,
  business_id text not null references businesses (id),
  city_id text not null references cities (id),
  dow smallint not null check (dow between 0 and 6),                 -- 0 = domingo
  start_min smallint not null check (start_min between 0 and 1439),  -- minutos desde la medianoche, hora de la ciudad
  label jsonb not null check (char_length(label->>'es') between 2 and 40 and char_length(coalesce(label->>'en', '')) <= 40),
  lang text not null default 'es' check (lang in ('es', 'en', 'bil', 'otro')),
  kind text not null default 'culto' check (kind in ('misa', 'culto', 'grupo', 'oracion')),
  sort smallint not null default 0,
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- «PRÓXIMA MISA» y «Hoy en el barrio» leen por ciudad, día y hora sin N+1.
create index if not exists worship_times_ciudad_idx on worship_times (city_id, dow, start_min) where removed_at is null;
create index if not exists worship_times_negocio_idx on worship_times (business_id) where removed_at is null;
-- Un mismo horario no se repite (el mismo día y hora pueden tener una misa y un grupo distintos).
create unique index if not exists worship_times_uno_idx on worship_times (business_id, dow, start_min, kind) where removed_at is null;

create table if not exists fe_settings (
  business_id text primary key references businesses (id),
  city_id text not null references cities (id),
  kind_override text check (kind_override is null or kind_override in ('misa', 'culto', 'grupo', 'sacr', 'consejo', 'fun', 'oracion', 'ayuda', 'tienda')),
  bil boolean not null default false,
  help text[] not null default '{}' check (help <@ array['despensa', 'ropa', 'transporte', 'jovenes', 'ninos', 'bodas']::text[]),
  sinid boolean not null default false,
  freq text not null default 'semana' check (freq in ('semana', 'quince', 'mes')),
  out_today_on date,                 -- «Se acabó por hoy»: vale solo ese día (hora de la ciudad)
  catequesis_open boolean not null default true,
  h24 boolean not null default false,
  plan_n smallint not null default 0 check (plan_n in (0, 12)), -- texto «hasta 12 pagos»: To'Latino nunca cobra el plan
  rep_days text not null default '5–7' check (rep_days in ('3–5', '5–7', '7–10')),
  derived_on date,                   -- el día en que se recalcularon la tarjeta y los filtros (el barrido los rehace al cambiar el día)
  updated_by uuid references users (id),
  updated_at timestamptz not null default now()
);

-- «Pedir fecha» y el catecismo (4ie) usan el motor de inscripciones con su rubro.
alter table insc_settings drop constraint if exists insc_settings_rubro_check;
alter table insc_settings add constraint insc_settings_rubro_check check (rubro in ('edu', 'ninos', 'dep', 'fe'));

-- Un curso gratis (catecismo o primera comunión sin donativo) no tiene matrícula: $0 de $0 vale (antes pedía matrícula < precio aunque
-- ambos fueran 0). Con matrícula, sigue siendo menos que el precio (guardián matriculaMenor).
alter table items drop constraint if exists items_matricula_check;
alter table items add constraint items_matricula_check check (svc_kind is distinct from 'curso' or deposit_cents < price_cents or deposit_cents = 0);

-- Iglesias nunca cobra en la app: ningún ítem de NEG-FE lleva depósito (el donativo es sugerido; la matrícula del catecismo se paga
-- en la parroquia). La base lo impide aunque un código futuro se equivoque.
create or replace function items_fe_sin_deposito() returns trigger language plpgsql as $$
begin
  if coalesce(new.deposit_cents, 0) > 0 and exists (select 1 from businesses b where b.id = new.business_id and b.category_id = 'NEG-FE') then
    raise exception 'Iglesias no cobra depósito (ítem de %)', new.business_id using errcode = 'check_violation';
  end if;
  return new;
end $$;
drop trigger if exists items_fe_sin_deposito on items;
create trigger items_fe_sin_deposito before insert or update of deposit_cents, business_id on items
  for each row when (coalesce(new.deposit_cents, 0) > 0) execute function items_fe_sin_deposito();

-- Sellos de Iglesias (no bloquean nada; textos y registros a verificar antes de abrir: LAUNCH-CHECKLIST, §6 #16).
insert into license_kinds (key, category_id, title, can, cannot, issuer, registry_site, registry_url, number_label, sort) values
  ('pa_funeraria', 'NEG-FE', '{"es":"Funeraria con licencia de PA","en":"PA-licensed funeral home"}',
   '{"es":"Hacer servicios funerarios, embalsamar, cremar y trasladar restos con licencia del estado","en":"Provide funeral services, embalming, cremation and transfer of remains licensed by the state"}',
   '{"es":"La licencia es del lugar y de sus directores; no cubre a quien no esté en ella","en":"The license covers the home and its directors; it does not cover anyone not on it"}',
   '{"es":"Junta Estatal de Directores de Funerarias de PA","en":"PA State Board of Funeral Directors"}', 'pals.pa.gov', 'https://www.pals.pa.gov/#/page/search', 'Licencia #', 1),
  ('fe_doj', 'NEG-FE', '{"es":"Representante acreditado (DOJ)","en":"Accredited representative (DOJ)"}',
   '{"es":"Puede aconsejarte y llenar formularios de inmigración. Trabaja en una organización reconocida.","en":"Can advise you and file immigration forms. Works at a recognized organization."}',
   '{"es":"Solo trabaja a través de su organización reconocida.","en":"Only works through its recognized organization."}',
   '{"es":"Departamento de Justicia (EOIR)","en":"Department of Justice (EOIR)"}', 'justice.gov/eoir', 'https://www.justice.gov/eoir/recognized-organizations-and-accredited-representatives-roster-state-and-city', 'DOJ #', 2),
  ('irs_501c3', 'NEG-FE', '{"es":"Organización sin fines de lucro 501(c)(3)","en":"501(c)(3) nonprofit organization"}',
   '{"es":"Recibir donativos deducibles de impuestos","en":"Receive tax-deductible donations"}',
   '{"es":"Es opcional: no tenerla no dice nada malo de la iglesia","en":"It is optional: not having it says nothing bad about the church"}',
   '{"es":"Servicio de Impuestos Internos (IRS)","en":"Internal Revenue Service (IRS)"}', 'apps.irs.gov', 'https://apps.irs.gov/app/eos/', 'EIN #', 3)
on conflict (key) do nothing;
commit;
