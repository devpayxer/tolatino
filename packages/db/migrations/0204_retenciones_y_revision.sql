-- 0204 · Dinero, sexta tanda (9t6, 21 nov; LAUNCH «Preguntarle a la pasarela, lo que quedó de 9t5»). Idempotente. Nada se borra (estados); las
-- decisiones del equipo y las consultas, solo inserción.
--
-- (1) Las retenciones que se renuevan (el depósito de una renta, lo retenido de un estimado o de «algo más»: la tarjeta suelta una autorización a los 7
--     días y a las 164 h se vuelve a retener fuera de sesión). Antes, si Stripe no contestaba, se soltaba la retención vieja y se avisaba «el banco ya no
--     deja», aunque Stripe pudo haber creado la nueva. Ahora la renovación es una INTENCIÓN (hold_renewals, una por retención vieja), como los cobros de
--     9t4/9t5: se anota antes de mandar, con su llave y su dato buscable (gateway_ref → metadata tl_intencion), se reintenta con la MISMA llave mientras
--     Stripe la recuerda y la vieja sigue viva, y pasado eso se le PREGUNTA a la pasarela (lib/consulta-pasarela.ts). La vieja se suelta solo con la nueva
--     confirmada o con un «no» de verdad (o «nunca llegó», con la consulta). Lo que no se cierra solo alerta hold_stuck.
-- (2) El cierre de una alerta gateway_review por una persona del equipo (varios hallados, otro monto, o Pro cobrado dos veces el mismo período): elige
--     cuál vale (o ninguno). El servidor vuelve a preguntar a la pasarela, comprueba que el elegido está entre lo hallado y que el monto cuadra, y la
--     decisión queda una sola vez por intención (gateway_reviews, solo inserción). Lo que sobra se devuelve (o, de una transferencia, se revierte) por una
--     intención de devolución propia (gateway_refunds): anotada antes, con su llave, «sin respuesta» no es «rechazado», y pasada la llave se le pregunta
--     a la pasarela. Lo que no se cierra solo alerta extra_refund_stuck.
begin;

-- ── (1) Renovaciones de retenciones ──
create table if not exists hold_renewals (
  id              bigint generated always as identity primary key,
  payment_id      bigint not null unique references payments (id),      -- la retención vieja (una renovación por retención)
  kind            text not null check (kind in ('renta', 'estimado')),
  operation_id    bigint not null references operations (id),
  business_id     text not null references businesses (id),
  city_id         text references cities (id),
  amount_cents    integer not null check (amount_cents > 0),
  fee_cents       integer not null default 0 check (fee_cents >= 0 and fee_cents <= amount_cents),
  idem_key        text not null unique check (char_length(idem_key) between 8 and 200),
  old_held_at     timestamptz not null,                                  -- cuándo se retuvo la vieja (vive hasta old_held_at + 7 días)
  gateway_ref     text check (gateway_ref ~ '^hold_renewals:[0-9]{1,18}$'),
  sent_at         timestamptz,
  attempts        smallint not null default 0 check (attempts between 0 and 10000),
  last_error      text check (char_length(last_error) <= 120),
  -- pending: en camino · done: la nueva quedó retenida y anotada (new_payment_id) · failed: no hay nueva (el banco dijo que no, nunca llegó, sin tarjeta)
  -- · dropped: la nueva existía pero ya no hacía falta (la renta o la cita se cerraron mientras tanto): se soltó.
  status          text not null default 'pending' check (status in ('pending', 'done', 'failed', 'dropped')),
  stripe_pi       text check (char_length(stripe_pi) <= 200),
  new_payment_id  bigint references payments (id),
  created_at      timestamptz not null default now(),
  done_at         timestamptz,
  check (status <> 'done' or (new_payment_id is not null and stripe_pi is not null)),
  check (status <> 'dropped' or stripe_pi is not null)
);
create index if not exists hold_renewals_camino_idx on hold_renewals (created_at) where status = 'pending';
create index if not exists hold_renewals_city_idx on hold_renewals (city_id, created_at);
create index if not exists hold_renewals_negocio_idx on hold_renewals (business_id);

create or replace function hold_renewals_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'una renovación de retención no se borra (estados)'; end if;
  if tg_op = 'INSERT' then
    new.status := 'pending'; new.attempts := 0; new.last_error := null; new.stripe_pi := null; new.new_payment_id := null; new.sent_at := null;
    new.gateway_ref := null; new.done_at := null; new.created_at := now();
    return new;
  end if;
  if (new.payment_id, new.kind, new.operation_id, new.business_id, new.city_id, new.amount_cents, new.fee_cents, new.idem_key, new.old_held_at, new.created_at)
     is distinct from (old.payment_id, old.kind, old.operation_id, old.business_id, old.city_id, old.amount_cents, old.fee_cents, old.idem_key, old.old_held_at, old.created_at) then
    raise exception 'de una renovación de retención solo cambian su estado y su respuesta';
  end if;
  if new.status is distinct from old.status and not (old.status = 'pending' and new.status in ('done', 'failed', 'dropped')) then
    raise exception 'renovacion_estado: % no pasa a %', old.status, new.status;
  end if;
  if old.status <> 'pending' and (new.attempts, new.last_error, new.stripe_pi, new.new_payment_id, new.sent_at, new.gateway_ref) is distinct from
                                 (old.attempts, old.last_error, old.stripe_pi, old.new_payment_id, old.sent_at, old.gateway_ref) then
    raise exception 'renovacion_cerrada: una renovación % ya no cambia', old.status;
  end if;
  if old.sent_at is not null and new.sent_at is distinct from old.sent_at then raise exception 'renovacion: sent_at se anota una vez'; end if;
  if old.gateway_ref is not null and new.gateway_ref is distinct from old.gateway_ref then raise exception 'renovacion: gateway_ref se anota una vez'; end if;
  if new.gateway_ref is not null and new.gateway_ref <> ('hold_renewals:' || new.id) then raise exception 'renovacion: gateway_ref es el de esta fila'; end if;
  if new.status in ('done', 'dropped') and old.status = 'pending' then
    if new.sent_at is null then raise exception 'renovacion: hecha sin mandarse'; end if;
    new.done_at := now();
  end if;
  if new.status = 'failed' and old.status = 'pending' then new.done_at := now(); end if;
  return new;
end $$;
drop trigger if exists hold_renewals_antes on hold_renewals;
create trigger hold_renewals_antes before insert or update or delete on hold_renewals for each row execute function hold_renewals_antes();

-- Lo que ve la persona cuando la renovación no salió y NO fue su banco (Stripe no la tiene, o se soltó la que salió de más): «tu banco no dejó» (hold_fallo)
-- sería falso.
insert into notif_templates (key, grp, pref, sms, title, body) values
  ('hold_no_renovada', 'tx', null, true, '{"es": "Pagas al recoger", "en": "You pay at pickup"}', '{"es": "La retención de {monto} de la cita {num} venció y no se pudo renovar. Pagas eso en el negocio.", "en": "The {monto} hold on booking {num} expired and could not be renewed. You pay that at the business."}')
on conflict (key) do nothing;

-- ── (2) La decisión del equipo sobre una gateway_review (una vez por intención) ──
create table if not exists gateway_reviews (
  id            bigint generated always as identity primary key,
  subject_kind  text not null check (subject_kind in ('subscription_charges', 'offsession_charges', 'event_settlements', 'hold_renewals')),
  subject_id    bigint not null,
  alert_id      bigint references money_alerts (id),
  check_id      bigint not null references gateway_checks (id),        -- la consulta a la pasarela que el servidor hizo AL decidir (no la de la pantalla)
  decision      text not null check (decision in ('vale', 'ninguno')),
  stripe_id     text check (char_length(stripe_id) between 3 and 200),  -- el que vale (solo con «vale»)
  amount_cents  integer not null check (amount_cents > 0),               -- el monto de la intención (el elegido cuadra con él)
  staff_id      uuid not null references users (id),
  note          text not null check (char_length(note) between 4 and 500),
  city_id       text references cities (id),
  at            timestamptz not null default now(),
  unique (subject_kind, subject_id),
  check ((decision = 'vale') = (stripe_id is not null))
);
create index if not exists gateway_reviews_city_idx on gateway_reviews (city_id, at);
drop trigger if exists gateway_reviews_no_cambia on gateway_reviews;
create trigger gateway_reviews_no_cambia before update or delete on gateway_reviews for each row execute function dinero_solo_insercion();

-- Lo que sobra: devolver un cobro (refund) o revertir una transferencia (reversal) que Stripe hizo de más. Una devolución viva por objeto de Stripe.
create table if not exists gateway_refunds (
  id                bigint generated always as identity primary key,
  review_id         bigint not null references gateway_reviews (id),
  subject_kind      text not null check (subject_kind in ('subscription_charges', 'offsession_charges', 'event_settlements', 'hold_renewals')),
  subject_id        bigint not null,
  medio             text not null check (medio in ('refund', 'reversal')),
  plataforma        boolean not null,                                     -- un cobro directo a To'Latino (Pro): sin transferencia ni comisión que revertir
  stripe_id         text not null check (char_length(stripe_id) between 3 and 200),
  amount_cents      integer not null check (amount_cents > 0),
  idem_key          text not null unique check (char_length(idem_key) between 8 and 200),
  gateway_ref       text check (gateway_ref ~ '^gateway_refunds:[0-9]{1,18}$'),
  sent_at           timestamptz,
  attempts          smallint not null default 0 check (attempts between 0 and 10000),
  last_error        text check (char_length(last_error) <= 120),
  status            text not null default 'pending' check (status in ('pending', 'done', 'failed')),
  stripe_refund_id  text check (char_length(stripe_refund_id) <= 200),
  business_id       text references businesses (id),
  city_id           text references cities (id),
  created_at        timestamptz not null default now(),
  done_at           timestamptz
);
create unique index if not exists gateway_refunds_uno_por_objeto on gateway_refunds (stripe_id) where status in ('pending', 'done');
create index if not exists gateway_refunds_camino_idx on gateway_refunds (created_at) where status = 'pending';
create index if not exists gateway_refunds_city_idx on gateway_refunds (city_id, created_at);
create index if not exists gateway_refunds_sujeto_idx on gateway_refunds (subject_kind, subject_id);

create or replace function gateway_refunds_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'una devolución de lo que sobró no se borra (estados)'; end if;
  if tg_op = 'INSERT' then
    new.status := 'pending'; new.attempts := 0; new.last_error := null; new.stripe_refund_id := null; new.sent_at := null; new.gateway_ref := null;
    new.done_at := null; new.created_at := now();
    return new;
  end if;
  if (new.review_id, new.subject_kind, new.subject_id, new.medio, new.plataforma, new.stripe_id, new.amount_cents, new.idem_key, new.business_id, new.city_id, new.created_at)
     is distinct from (old.review_id, old.subject_kind, old.subject_id, old.medio, old.plataforma, old.stripe_id, old.amount_cents, old.idem_key, old.business_id, old.city_id, old.created_at) then
    raise exception 'de una devolución de lo que sobró solo cambian su estado y su respuesta';
  end if;
  if new.status is distinct from old.status and not (old.status = 'pending' and new.status in ('done', 'failed')) then
    raise exception 'devolucion_sobra_estado: % no pasa a %', old.status, new.status;
  end if;
  if old.status <> 'pending' and (new.attempts, new.last_error, new.stripe_refund_id, new.sent_at, new.gateway_ref) is distinct from
                                 (old.attempts, old.last_error, old.stripe_refund_id, old.sent_at, old.gateway_ref) then
    raise exception 'devolucion_sobra_cerrada: una devolución % ya no cambia', old.status;
  end if;
  if old.sent_at is not null and new.sent_at is distinct from old.sent_at then raise exception 'devolucion_sobra: sent_at se anota una vez'; end if;
  if old.gateway_ref is not null and new.gateway_ref is distinct from old.gateway_ref then raise exception 'devolucion_sobra: gateway_ref se anota una vez'; end if;
  if new.gateway_ref is not null and new.gateway_ref <> ('gateway_refunds:' || new.id) then raise exception 'devolucion_sobra: gateway_ref es el de esta fila'; end if;
  if new.status = 'done' and old.status = 'pending' then
    if new.sent_at is null or new.stripe_refund_id is null then raise exception 'devolucion_sobra: hecha sin mandarse o sin su objeto de Stripe'; end if;
    new.done_at := now();
  end if;
  if new.status = 'failed' and old.status = 'pending' then new.done_at := now(); end if;
  return new;
end $$;
drop trigger if exists gateway_refunds_antes on gateway_refunds;
create trigger gateway_refunds_antes before insert or update or delete on gateway_refunds for each row execute function gateway_refunds_antes();

-- ── La consulta a la pasarela también para las renovaciones y las devoluciones de lo que sobró ──
alter table gateway_checks drop constraint if exists gateway_checks_subject_kind_check;
alter table gateway_checks add constraint gateway_checks_subject_kind_check
  check (subject_kind in ('subscription_charges', 'offsession_charges', 'event_settlements', 'hold_renewals', 'gateway_refunds'));

-- ── Dos alertas nuevas (una por tipo y objeto, como las demás) ──
--   hold_stuck: una renovación de retención sin respuesta que no se cierra sola (pasada la llave, la consulta no la cerró).
--   extra_refund_stuck: la devolución de lo que sobró (decidida desde una gateway_review) que Stripe rechazó o que no se cierra sola.
alter table money_alerts drop constraint if exists money_alerts_kind_check;
alter table money_alerts add constraint money_alerts_kind_check
  check (kind in ('refund_stuck', 'transfer_reversal_stuck', 'dispute_due', 'recon_diff', 'recon_no_corrio', 'payout_failed', 'refund_failed', 'charge_unapplied',
                  'transfer_stuck', 'charge_stuck', 'offsession_stuck', 'offsession_unapplied', 'gateway_review', 'hold_stuck', 'extra_refund_stuck'));

-- ── El simulador del sandbox guarda la metadata de devoluciones y reversiones (la consulta las busca igual que en Stripe) ──
alter table sim_refunds add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table sim_transfer_reversals add column if not exists metadata jsonb not null default '{}'::jsonb;

commit;
