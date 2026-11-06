-- 0051 · Estimado / precio completo línea por línea + «algo más» (Fase 4 · bloque 4d). Diseño: neg-auto-flow.js (EST, XTRA,
-- totals, citaVals › est/xtra/ready/done) y neg-hogar-flow.js (PRECIO COMPLETO, PERMIT). Plan: docs/diseno/plan/fase4-hogar-auto.md §2–§4d.
-- Reglas: nada se hace ni se cobra sin el OK del cliente; se retiene solo lo aprobado; lo final nunca sube; los montos de
-- cada línea los calcula la base (no se pueden escribir); nada se borra (una versión nueva deja la anterior «superseded»).
begin;

-- Impuesto en datos, nunca en código: % sobre piezas/materiales y % sobre mano de obra, por ciudad y categoría.
-- PA: 6 % sobre piezas y materiales; la mano de obra de reparación no paga (validar con el contador: LAUNCH-CHECKLIST).
create table tax_rules (
  id bigint generated always as identity primary key,
  city_id text not null references cities(id),
  category_id text not null,
  parts_bp int not null check (parts_bp between 0 and 2000),
  labor_bp int not null check (labor_bp between 0 and 2000),
  effective_from timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index tax_rules_idx on tax_rules (city_id, category_id, effective_from desc);
insert into tax_rules (city_id, category_id, parts_bp, labor_bp)
  select c.id, k, 600, 0 from cities c cross join unnest(array['NEG-AUTO', 'NEG-HOGAR']) k;

create table estimates (
  id bigint generated always as identity primary key,
  operation_id bigint not null references operations(id),
  city_id text not null references cities(id),
  version smallint not null check (version between 1 and 50),
  status text not null default 'sent' check (status in ('sent', 'answered', 'superseded')),
  labor_rate_cents int not null check (labor_rate_cents between 0 and 100000),   -- copia de trade_settings al mandarlo
  parts_tax_bp int not null check (parts_tax_bp between 0 and 2000),             -- copia de tax_rules
  labor_tax_bp int not null check (labor_tax_bp between 0 and 2000),
  base_cents int not null check (base_cents >= 0),       -- lo reservado que cuenta (servicio fijo, diagnóstico o visita)
  credit_cents int not null default 0 check (credit_cents >= 0 and credit_cents <= base_cents), -- se descuenta si aprueba algo
  created_by uuid references business_members(id),
  sent_at timestamptz not null default now(),
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  unique (operation_id, version)
);
create index estimates_op_idx on estimates (operation_id, version desc);

create table estimate_lines (
  id bigint generated always as identity primary key,
  estimate_id bigint not null references estimates(id),
  operation_id bigint not null references operations(id),
  sort smallint not null default 0,
  urgency text not null check (urgency in ('now', 'soon', 'later')),
  title jsonb not null check (char_length(title->>'es') between 2 and 90),
  why jsonb not null check (char_length(why->>'es') between 2 and 240),
  parts jsonb not null default '[]'::jsonb,              -- [{n:{es,en}, cents}] (lo que ve el cliente)
  parts_cents int not null check (parts_cents between 0 and 5000000),
  labor_hours numeric(5,2) not null check (labor_hours >= 0 and labor_hours <= 200),
  photo_id uuid references media(id),
  is_extra boolean not null default false,
  decision text check (decision in ('ok', 'no')),
  decided_at timestamptz,
  final_cents int,                                       -- lo final al terminar (nunca más que line_total_cents)
  -- Derivados (los escribe el disparador; lo que mande el servidor se ignora):
  labor_cents int not null default 0,
  tax_cents int not null default 0,
  line_total_cents int not null default 0,
  created_at timestamptz not null default now(),
  check (final_cents is null or (final_cents >= 0 and final_cents <= line_total_cents)),
  check (decision is null or decided_at is not null)
);
create index estimate_lines_op_idx on estimate_lines (operation_id, estimate_id, sort);

create function estimate_line_derivados() returns trigger language plpgsql as $$
declare e estimates%rowtype;
begin
  select * into e from estimates where id = new.estimate_id;
  new.labor_cents := round(new.labor_hours * e.labor_rate_cents);
  new.tax_cents := round(new.parts_cents * e.parts_tax_bp / 10000.0) + round(new.labor_cents * e.labor_tax_bp / 10000.0);
  new.line_total_cents := new.parts_cents + new.labor_cents + new.tax_cents;
  if tg_op = 'UPDATE' then
    -- Lo que el cliente ya decidió no se cambia (salvo lo final, que solo baja).
    if old.decision is not null and (new.parts_cents <> old.parts_cents or new.labor_hours <> old.labor_hours or new.title <> old.title or new.decision is distinct from old.decision) then
      raise exception 'estimate_line % ya decidida: no se cambia', old.id;
    end if;
  end if;
  return new;
end $$;
create trigger estimate_line_derivados before insert or update on estimate_lines for each row execute function estimate_line_derivados();

-- Varias retenciones por cita: estimado (una por versión aprobada) y cada «algo más».
alter table payments drop constraint payments_kind_check;
alter table payments add constraint payments_kind_check check (kind in ('full', 'deposit', 'balance', 'tip', 'visit', 'estimate', 'extra', 'rental', 'security', 'plan'));
alter table payments add column seq smallint not null default 1 check (seq between 1 and 500);
alter table payments add column renewed_from bigint references payments(id);
-- Captura parcial: amount_cents pasa a ser lo COBRADO (lo que se puede devolver); held_cents guarda lo que se retuvo.
alter table payments add column held_cents int check (held_cents > 0);
-- Lo que hay que cobrar de esta retención al liquidar (lo fija el servidor dentro del candado; si la llamada a la pasarela
-- falla, repararPagos lo vuelve a intentar con el mismo monto).
update payments set held_cents = amount_cents where held_cents is null;
alter table payments add column capture_target_cents int check (capture_target_cents >= 0);
-- La tarjeta (referencia de Stripe, no el número) para renovar una retención que pasa de 7 días.
alter table payments add column payment_method text check (payment_method ~ '^pm_[A-Za-z0-9_]{3,200}$');
alter table payments drop constraint payments_operation_id_kind_key;
alter table payments add constraint payments_operation_kind_seq_key unique (operation_id, kind, seq);
create index payments_retenidos_idx on payments (held_at) where status = 'held';

-- Plantillas de líneas por clase de trabajo (el panel las ofrece al armar el estimado). El contenido lo carga la semilla
-- de pruebas desde el prototipo; para producción lo aprueba el fundador (LAUNCH-CHECKLIST).
create table estimate_templates (
  id bigint generated always as identity primary key,
  category_id text not null,
  cls text not null check (cls ~ '^[a-z]{2,12}$'),
  cls_name jsonb not null,
  sort smallint not null default 0,
  urgency text not null check (urgency in ('now', 'soon', 'later')),
  title jsonb not null, why jsonb not null, parts jsonb not null default '[]'::jsonb,
  parts_cents int not null check (parts_cents >= 0), labor_hours numeric(5,2) not null check (labor_hours >= 0),
  is_extra boolean not null default false,
  status text not null default 'active' check (status in ('active', 'paused')),
  created_at timestamptz not null default now()
);
create index estimate_templates_idx on estimate_templates (category_id, cls, sort) where status = 'active';

insert into notif_templates (key, grp, pref, sms, title, body) values
  ('est_listo', 'tx', null, true, '{"es": "Tu estimado está listo", "en": "Your estimate is ready"}', '{"es": "{negocio} te mandó el estimado. Nada se hace ni se cobra sin tu OK.", "en": "{negocio} sent your estimate. Nothing is done or charged without your OK."}'),
  ('est_listo_h', 'tx', null, true, '{"es": "Tu precio completo está listo", "en": "Your full price is ready"}', '{"es": "{negocio} te mandó el precio completo. Nada se hace ni se cobra sin tu OK.", "en": "{negocio} sent the full price. Nothing is done or charged without your OK."}'),
  ('xtra_pide', 'tx', null, true, '{"es": "Encontraron algo más", "en": "They found something else"}', '{"es": "{negocio} paró hasta que decidas: {que}.", "en": "{negocio} stopped until you decide: {que}."}'),
  ('cita_pagada', 'tx', null, false, '{"es": "Pagado", "en": "Paid"}', '{"es": "Cita {num}: cobrado {monto}{libre}.", "en": "Booking {num}: charged {monto}{libre}."}'),
  ('biz_est_ok', 'biz', null, true, '{"es": "El cliente respondió el estimado", "en": "The client answered the estimate"}', '{"es": "{cliente} aprobó {n} de {de} en la cita {num} ({monto}).", "en": "{cliente} approved {n} of {de} on booking {num} ({monto})."}'),
  ('biz_xtra_ok', 'biz', null, true, '{"es": "Aprobó lo que encontraste", "en": "They approved the extra"}', '{"es": "{cliente} aprobó {que} en la cita {num}. Puedes seguir.", "en": "{cliente} approved {que} on booking {num}. You can go on."}'),
  ('biz_xtra_no', 'biz', null, true, '{"es": "No aprobó lo que encontraste", "en": "They declined the extra"}', '{"es": "{cliente} no aprobó {que} en la cita {num}. No se hace ni se cobra.", "en": "{cliente} declined {que} on booking {num}. Not done or charged."}'),
  ('biz_cita_pagada', 'biz', null, false, '{"es": "Cita pagada", "en": "Booking paid"}', '{"es": "Cita {num}: cobrado {monto}.", "en": "Booking {num}: charged {monto}."}'),
  ('hold_fallo', 'tx', null, true, '{"es": "Pagas al recoger", "en": "You pay at pickup"}', '{"es": "La retención de {monto} de la cita {num} venció y tu banco no dejó renovarla. Pagas eso en el negocio.", "en": "The {monto} hold on booking {num} expired and your bank did not allow renewing it. You pay that at the business."}'),
  ('biz_hold_fallo', 'biz', null, true, '{"es": "Cóbralo en el local", "en": "Collect it in person"}', '{"es": "La retención de {monto} de la cita {num} no se pudo renovar: cóbralo en el local.", "en": "The {monto} hold on booking {num} could not be renewed: collect it in person."}')
on conflict (key) do nothing;
commit;
