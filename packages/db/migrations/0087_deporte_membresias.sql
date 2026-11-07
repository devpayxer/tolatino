-- 0087 · Deporte: «Membresías y contrato» y «Liga e inscripciones» (Fase 4 · 4ec). Plan: docs/diseno/plan/fase4-edu-ninos-deporte.md
-- §2 y §4ec. Diseño: neg-deporte.js (con, cxl, ins, meet, tags), neg-deporte-kind.js (KS, conL L30), dash2-cat.js L473–487 y apply
-- L238–249. Los precios (mensualidad, pase de un día, cuota de la temporada y su depósito, cancha por hora) son los del ítem: una sola
-- fuente. Aquí va lo que no es de un ítem: el contrato y lo que cuesta salirse antes, la cuota de inscripción, la guardería, hasta
-- cuándo se inscriben equipos y si se aceptan jugadores sueltos. Sin contrato, salirse no cuesta nada (check). To'Latino nunca cobra
-- la membresía ni la penalidad: las dice antes de firmar (§6 #4 y #5). Idempotente; nada se borra.
begin;

alter table insc_settings
  add column if not exists contract_m smallint not null default 0 check (contract_m in (0, 3, 6, 12)),
  add column if not exists cancel_fee_cents integer not null default 0 check (cancel_fee_cents between 0 and 50000 and cancel_fee_cents % 100 = 0),
  add column if not exists signup_cents integer not null default 0 check (signup_cents between 0 and 20000 and signup_cents % 100 = 0),
  add column if not exists childcare boolean not null default false,
  add column if not exists league_until date,
  add column if not exists free_agents boolean not null default false;
alter table insc_settings drop constraint if exists insc_settings_contrato_check;
alter table insc_settings add constraint insc_settings_contrato_check check (contract_m > 0 or cancel_fee_cents = 0);
commit;
