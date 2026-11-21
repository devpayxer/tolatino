-- 0203 · Preguntarle a la pasarela (9t5, 21 nov; LAUNCH «Cobros fuera de sesión, lo que quedó de 9t4» y «Dinero por clase · lo que quedó» (2)).
-- Idempotente. Nada se borra (estados); la auditoría, las alertas, sus notas y las consultas, solo inserción.
--
-- La clase: una intención de dinero «sin respuesta» que pasa HORAS_LLAVE (23 h, lib/cobros) en camino ya no vuelve a Stripe con su llave (Stripe la
-- olvida a las 24 h y podría cobrar o transferir dos veces) y se quedaba 'pending' PARA SIEMPRE: bloqueaba los cobros siguientes de ese objeto (un plan
-- del Hogar dejaba de cobrarse, una renta apartada ni vencía ni se cancelaba, Pro no renovaba). Ahora el servidor le PREGUNTA a la pasarela qué pasó,
-- por un dato propio que se manda al crear (metadata tl_intencion = '<tabla>:<id>'), y cierra con esa verdad (lib/consulta-pasarela.ts):
--   hecho → se cierra como hecha por el mismo cierre del flujo normal, una vez; fallido → 'failed'; en curso → sigue en camino; no hallado → 'failed'
--   («nunca llegó a la pasarela»: el siguiente cobro del objeto vuelve a poder salir) SOLO si la intención se mandó con el dato buscable y ya pasó el
--   margen desde que se mandó; la pasarela no contesta la consulta → nada cambia. Nadie afirma «sí se cobró» de memoria.
begin;

-- (1) El dato buscable de cada intención (gateway_ref = el tl_intencion que se mandó en la metadata): se anota ANTES de la llamada, en la misma sentencia
--     que «se mandó» (sent_at), y una sola vez. Una intención vieja sin él (se mandó antes de 9t5) nunca se da por «no llegó»: Stripe no tiene cómo
--     encontrarla por ese dato. Pro (subscription_charges) además marca «se mandó» (sent_at) antes de la llamada, como offsession_charges: «el período ya
--     quedó cobrado» suelta sin preguntar solo una intención que nunca se mandó (antes decidía con attempts = 0, que se anota DESPUÉS de la llamada).
alter table subscription_charges add column if not exists sent_at timestamptz;
alter table subscription_charges add column if not exists gateway_ref text check (gateway_ref ~ '^subscription_charges:[0-9]{1,18}$');
alter table offsession_charges add column if not exists gateway_ref text check (gateway_ref ~ '^offsession_charges:[0-9]{1,18}$');
-- La transferencia al organizador: además, key_from = desde cuándo vale otra vez su llave. Si la consulta dice que la transferencia nunca llegó a Stripe
-- (y ya pasó el margen), la liquidación vuelve al flujo normal con la MISMA llave y el MISMO monto (ya fijos en 'paying'): se reintenta otras HORAS_LLAVE.
alter table event_settlements add column if not exists sent_at timestamptz;
alter table event_settlements add column if not exists gateway_ref text check (gateway_ref ~ '^event_settlements:[0-9]{1,18}$');
alter table event_settlements add column if not exists key_from timestamptz;

-- Lo de Pro que ya existía: lo que pudo haberse mandado se da por mandado (nunca se suelta sin preguntar algo que pudo salir). Solo una intención fallida
-- sin intentos (nunca llegó a la pasarela) queda sin sent_at.
-- (Con sus triggers apagados solo para esta corrección, dentro de esta transacción: así la migración se puede aplicar otra vez sin chocar con lo que ella
-- misma pone más abajo.)
alter table subscription_charges disable trigger subscription_charges_antes;
update subscription_charges set sent_at = created_at where sent_at is null and (attempts > 0 or status in ('pending', 'done', 'action'));
alter table subscription_charges enable trigger subscription_charges_antes;
alter table event_settlements disable trigger user;
update event_settlements set sent_at = paying_at where sent_at is null and status in ('paying', 'paid', 'reversed') and paying_at is not null;
alter table event_settlements enable trigger user;

create or replace function subscription_charges_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'un cobro de Pro no se borra (estados)'; end if;
  if tg_op = 'INSERT' then
    new.status := 'pending'; new.attempts := 0; new.last_error := null; new.stripe_pi := null; new.done_at := null; new.created_at := now();
    new.sent_at := null; new.gateway_ref := null;
    return new;
  end if;
  if (new.business_id, new.period_start, new.cycle, new.amount_cents, new.pm, new.payer_user_id, new.idem_key, new.created_at)
     is distinct from (old.business_id, old.period_start, old.cycle, old.amount_cents, old.pm, old.payer_user_id, old.idem_key, old.created_at) then
    raise exception 'de un cobro de Pro solo cambian su estado y su respuesta';
  end if;
  if new.status is distinct from old.status and not ((old.status = 'pending' and new.status in ('done', 'failed', 'action')) or (old.status = 'action' and new.status in ('done', 'failed'))) then
    raise exception 'cobro_pro_estado: % no pasa a %', old.status, new.status;
  end if;
  -- 9t5 · Lo que se anota una vez: cuándo se mandó y con qué dato buscable (y solo mientras va en camino).
  if old.sent_at is not null and new.sent_at is distinct from old.sent_at then raise exception 'cobro_pro: sent_at se anota una vez'; end if;
  if old.gateway_ref is not null and new.gateway_ref is distinct from old.gateway_ref then raise exception 'cobro_pro: gateway_ref se anota una vez'; end if;
  if new.gateway_ref is not null and new.gateway_ref <> ('subscription_charges:' || new.id) then raise exception 'cobro_pro: gateway_ref es el de esta fila'; end if;
  if old.status <> 'pending' and (new.sent_at, new.gateway_ref) is distinct from (old.sent_at, old.gateway_ref) then raise exception 'cobro_pro: solo en camino se anota que se manda'; end if;
  if new.status = 'done' and old.status <> 'done' then new.done_at := now(); end if;
  return new;
end $$;

create or replace function offsession_charges_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'un cobro fuera de sesión no se borra (estados)'; end if;
  if tg_op = 'INSERT' then
    new.status := 'pending'; new.attempts := 0; new.last_error := null; new.stripe_pi := null; new.hold_pi := null; new.sent_at := null; new.done_at := null; new.created_at := now();
    new.gateway_ref := null;
    return new;
  end if;
  if (new.kind, new.ref_id, new.purpose, new.operation_id, new.business_id, new.city_id, new.payer_user_id, new.amount_cents, new.fee_cents, new.destination, new.pm, new.idem_key, new.detail, new.created_at)
     is distinct from (old.kind, old.ref_id, old.purpose, old.operation_id, old.business_id, old.city_id, old.payer_user_id, old.amount_cents, old.fee_cents, old.destination, old.pm, old.idem_key, old.detail, old.created_at) then
    raise exception 'de un cobro fuera de sesión solo cambian su estado y su respuesta';
  end if;
  if new.status is distinct from old.status and not (old.status = 'pending' and new.status in ('done', 'failed')) then
    raise exception 'cobro_fuera_estado: % no pasa a %', old.status, new.status;
  end if;
  if old.status <> 'pending' and (new.attempts, new.last_error, new.stripe_pi, new.hold_pi, new.sent_at, new.gateway_ref) is distinct from (old.attempts, old.last_error, old.stripe_pi, old.hold_pi, old.sent_at, old.gateway_ref) then
    raise exception 'cobro_fuera_cerrado: un cobro % ya no cambia', old.status;
  end if;
  -- Lo que se anota una vez: cuándo se mandó, con qué dato buscable, el PaymentIntent y el depósito retenido.
  if old.sent_at is not null and new.sent_at is distinct from old.sent_at then raise exception 'cobro_fuera: sent_at se anota una vez'; end if;
  if old.gateway_ref is not null and new.gateway_ref is distinct from old.gateway_ref then raise exception 'cobro_fuera: gateway_ref se anota una vez'; end if;
  if new.gateway_ref is not null and new.gateway_ref <> ('offsession_charges:' || new.id) then raise exception 'cobro_fuera: gateway_ref es el de esta fila'; end if;
  if old.stripe_pi is not null and new.stripe_pi is distinct from old.stripe_pi then raise exception 'cobro_fuera: stripe_pi se anota una vez'; end if;
  if old.hold_pi is not null and new.hold_pi is distinct from old.hold_pi then raise exception 'cobro_fuera: hold_pi se anota una vez'; end if;
  -- Un cobro hecho salió por Stripe: trae su PaymentIntent y se mandó.
  if new.status = 'done' and old.status <> 'done' then
    if new.stripe_pi is null or new.sent_at is null then raise exception 'cobro_fuera: hecho sin PaymentIntent o sin mandarse'; end if;
    new.done_at := now();
  end if;
  return new;
end $$;

-- La liquidación: un trigger aparte (event_settlements_antes, de 0110, sigue igual y corre antes por su nombre). sent_at y gateway_ref se anotan una vez y
-- solo en camino; key_from solo avanza, solo en 'paying', y solo cuando la llave anterior ya pasó HORAS_LLAVE (23 h; las de lib/cobros).
create or replace function event_settlements_consulta() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then new.sent_at := null; new.gateway_ref := null; new.key_from := null; return new; end if;
  if old.sent_at is not null and new.sent_at is distinct from old.sent_at then raise exception 'evt_liq: sent_at se anota una vez'; end if;
  if old.gateway_ref is not null and new.gateway_ref is distinct from old.gateway_ref then raise exception 'evt_liq: gateway_ref se anota una vez'; end if;
  if new.gateway_ref is not null and new.gateway_ref <> ('event_settlements:' || new.id) then raise exception 'evt_liq: gateway_ref es el de esta fila'; end if;
  if (new.sent_at, new.gateway_ref) is distinct from (old.sent_at, old.gateway_ref) and old.status <> 'paying' then raise exception 'evt_liq: solo en camino se anota que se manda'; end if;
  if new.key_from is distinct from old.key_from then
    if old.status <> 'paying' or new.key_from is null or new.key_from < coalesce(old.key_from, old.paying_at) + interval '23 hours' then
      raise exception 'evt_liq_llave: la llave vuelve a valer solo en camino y pasadas 23 h de la anterior';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists event_settlements_consulta on event_settlements;
create trigger event_settlements_consulta before insert or update on event_settlements for each row execute function event_settlements_consulta();

-- (2) Lo que dijo cada consulta (solo inserción): qué se buscó (lookup = el dato buscable), quién la pidió (el barrido o una persona del equipo con
--     «Preguntar a Stripe ahora»), qué contestó la pasarela y cuándo. Lo lee el cierre (el veredicto más reciente) y la alerta del Super Admin.
--     result: hecho · fallido · en_curso (p. ej. el banco pide verificar) · no_hallado · varios (más de un objeto para una intención: no se cierra solo)
--     · monto_distinto (hallado con otro monto: no se cierra solo) · sin_respuesta (la pasarela no contestó la consulta: nada cambia).
create table if not exists gateway_checks (
  id            bigint generated always as identity primary key,
  subject_kind  text not null check (subject_kind in ('subscription_charges', 'offsession_charges', 'event_settlements')),
  subject_id    bigint not null,
  lookup        text not null check (char_length(lookup) between 3 and 200),
  origin        text not null check (origin in ('barrido', 'equipo')),
  staff_id      uuid references users (id),
  result        text not null check (result in ('hecho', 'fallido', 'en_curso', 'no_hallado', 'varios', 'monto_distinto', 'sin_respuesta')),
  stripe_id     text check (char_length(stripe_id) <= 200),
  amount_cents  integer,
  found_n       smallint not null default 0 check (found_n between 0 and 1000),
  city_id       text references cities (id),
  at            timestamptz not null default now(),
  check ((origin = 'equipo') = (staff_id is not null))
);
create index if not exists gateway_checks_sujeto_idx on gateway_checks (subject_kind, subject_id, at desc, id desc);
create index if not exists gateway_checks_city_idx on gateway_checks (city_id, at);
drop trigger if exists gateway_checks_no_cambia on gateway_checks;
create trigger gateway_checks_no_cambia before update or delete on gateway_checks for each row execute function dinero_solo_insercion();

-- (3) Una alerta nueva (money_alerts, una por tipo y objeto, como las demás):
--   gateway_review: la consulta encontró algo que NO se cierra solo (más de un cobro o transferencia para una sola intención, otro monto, o un cobro de Pro
--                   de un período que ya estaba cobrado): lo decide una persona del equipo de dinero.
alter table money_alerts drop constraint if exists money_alerts_kind_check;
alter table money_alerts add constraint money_alerts_kind_check
  check (kind in ('refund_stuck', 'transfer_reversal_stuck', 'dispute_due', 'recon_diff', 'recon_no_corrio', 'payout_failed', 'refund_failed', 'charge_unapplied',
                  'transfer_stuck', 'charge_stuck', 'offsession_stuck', 'offsession_unapplied', 'gateway_review'));

-- (4) La alerta se cierra sola cuando la intención deja de estar en camino (la consulta la cerró, o el flujo): una nota 'resuelta_sola' sin persona (la
--     escribe el sistema, con lo que dijo la consulta). Las notas de una persona siguen exigiendo quién.
alter table money_alert_notes drop constraint if exists money_alert_notes_action_check;
alter table money_alert_notes add constraint money_alert_notes_action_check check (action in ('me_hago_cargo', 'resuelta', 'resuelta_a_mano', 'reabierta', 'resuelta_sola'));
alter table money_alert_notes alter column staff_id drop not null;
alter table money_alert_notes drop constraint if exists money_alert_notes_quien;
alter table money_alert_notes add constraint money_alert_notes_quien check ((staff_id is null) = (action = 'resuelta_sola'));

-- (5) El simulador del sandbox guarda la metadata (como Stripe) para que la consulta la busque igual.
alter table sim_intents add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table sim_transfers add column if not exists metadata jsonb not null default '{}'::jsonb;
create index if not exists sim_intents_tl_idx on sim_intents ((metadata->>'tl_intencion')) where metadata ? 'tl_intencion';
create index if not exists sim_transfers_tl_idx on sim_transfers ((metadata->>'tl_intencion')) where metadata ? 'tl_intencion';

commit;
