-- 0086 · Niños: «Cupos y licencia», la licencia de cuidado infantil del DHS y los datos de los niños (Fase 4 · 4eb).
-- Plan: docs/diseno/plan/fase4-edu-ninos-deporte.md §2, §3 y §4eb. Diseño: neg-ninos.js (edad, tags), neg-ninos-kind.js (KS, care),
-- dash2-cat.js L465–471 (Tu herramienta de guardería y cuidado en casa) y L449–463 con NIK (los demás).
--   · insc_settings suma lo de Niños: edades, CCIS, horario extendido, comidas, turno de noche, transporte o recogida, Medicaid y CHIP,
--     la espera de la evaluación (terapias), el precio por semana sin subsidio y si cuida en su casa.
--   · care_openings: cupos libres por banda de edad (guardería y cuidado en casa). No es una lista de niños.
--   · La licencia de cuidado infantil del DHS. «lic» (el filtro, el chip «con licencia» y la tarjeta) sale SOLO de una licencia
--     verificada de este tipo: licencias_refrescar lo pone y lo quita en la misma transacción (guardián licenciaNoSeFinge). Al aplicar
--     esta migración se rehace para todos los negocios de Niños: el «lic» que venía del prototipo sin licencia se cae.
--   · op_private admite el motivo 'nino' (los datos del niño de una inscripción, cifrados; 4ee los escribe y la purga los borra).
-- Idempotente; nada se borra.
begin;

alter table insc_settings
  add column if not exists age_min smallint check (age_min between 0 and 17),
  add column if not exists age_max smallint check (age_max between 0 and 18),
  add column if not exists ccis boolean not null default false,
  add column if not exists extended boolean not null default false,
  add column if not exists meals boolean not null default false,
  add column if not exists night boolean not null default false,
  add column if not exists transport boolean not null default false,
  add column if not exists medicaid boolean not null default false,
  add column if not exists eval_wait_w smallint check (eval_wait_w between 1 and 12),
  add column if not exists week_cents integer check (week_cents between 5000 and 60000 and week_cents % 500 = 0),
  add column if not exists home_based boolean not null default false;
alter table insc_settings drop constraint if exists insc_settings_edades_check;
alter table insc_settings add constraint insc_settings_edades_check check (age_min is null or age_max is null or age_min <= age_max);

-- Cupos libres por banda de edad (2 años · 3 años · 4 y 5 años; cuidado en casa: una sola banda, hasta 6 niños).
create table if not exists care_openings (
  id bigint generated always as identity primary key,
  business_id text not null references businesses (id),
  city_id text not null references cities (id),
  band_min smallint not null check (band_min between 0 and 17),
  band_max smallint not null check (band_max between 0 and 18),
  label jsonb not null check (char_length(label->>'es') between 2 and 30),
  openings smallint not null default 0 check (openings between 0 and 20),
  sort smallint not null default 0,
  removed_at timestamptz,
  updated_at timestamptz not null default now(),
  check (band_min <= band_max)
);
create index if not exists care_openings_negocio_idx on care_openings (business_id, sort) where removed_at is null;

insert into license_kinds (key, category_id, title, can, cannot, issuer, registry_site, registry_url, number_label, sort) values
  ('pa_dhs_childcare', 'NEG-NINOS', '{"es":"Licencia de cuidado infantil (DHS)","en":"Child care certificate (DHS)"}',
   '{"es":"Cuidar niños en un centro, un hogar de grupo o un hogar familiar con certificado del estado","en":"Care for children in a center, group home or family home certified by the state"}',
   '{"es":"El certificado no es una evaluación de la calidad: pregunta por la proporción de niños por adulto","en":"The certificate is not a quality rating: ask about the child-to-adult ratio"}',
   '{"es":"Departamento de Servicios Humanos de Pennsylvania (DHS)","en":"Pennsylvania Department of Human Services (DHS)"}', 'compass.state.pa.us', 'https://www.compass.state.pa.us/Compass.Web/ProviderSearch/pdlsrch', 'Certificado #', 1)
on conflict (key) do nothing;

alter table op_private drop constraint if exists op_private_reason_check;
alter table op_private add constraint op_private_reason_check
  check (reason in ('nuevo', 'seguimiento', 'receta', 'papeles', 'chequeo', 'primera', 'caso', 'carta', 'fecha', 'destinatario', 'nino'));

-- «lic» de Profesionales (cualquier licencia verificada) y de Niños (solo la del DHS verificada). Nunca de un toque del dueño.
create or replace function licencias_refrescar(bid text) returns void language sql as $$
  update business_stats_cache s set lic_valid = coalesce((select array_agg(l.kind order by l.sort) from licenses l where l.business_id = bid and l.status = 'valid'), '{}'), updated_at = now()
   where s.business_id = bid;
  update businesses b set filter_values = case
      when exists (select 1 from licenses l where l.business_id = bid and l.status = 'valid' and (b.category_id = 'NEG-PRO' or l.kind = 'pa_dhs_childcare'))
        then (case when 'lic' = any(b.filter_values) then b.filter_values else b.filter_values || 'lic'::text end)
      else array_remove(b.filter_values, 'lic') end
   where b.id = bid and b.category_id in ('NEG-PRO', 'NEG-NINOS');
$$;
select licencias_refrescar(id) from businesses where category_id = 'NEG-NINOS';
commit;
