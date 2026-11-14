-- 0141 · Dinero real listo (Fase 9 · 9k; fase9-apertura.md §2 «0141», §4 9k): la conciliación diaria Stripe ↔ libro propio, los pagos al banco
-- (payouts) fijos los martes, las disputas con su evidencia en archivos, 3-D Secure (en la hoja y fuera de sesión en las renovaciones de Pro), la huella
-- de la tarjeta (card.fingerprint) y las alertas del dinero que Stripe nunca hace (devolución atascada, transferencia sin saldo para revertir).
-- Reglas: nada se borra (estados); la conciliación, sus diferencias, las alertas y quién se hizo cargo son de SOLO INSERCIÓN; los montos los decide el
-- servidor y la base los vuelve a imponer; todo lo que mueve dinero es idempotente por su llave. En el sandbox, sin clave de Stripe, «Stripe» es el
-- simulador (sim_*), nunca en producción (lib/pagos/pasarela.ts). Idempotente: aplicarla dos veces no cambia nada.
begin;

-- ── Conciliación diaria (guardián del dinero, HERRAMIENTAS #20) ──
-- Una corrida por día y por vez (la del barrido o la que pide el equipo): cuántos objetos y cuánto dinero dice Stripe y cuánto dice el libro, por tipo
-- (PaymentIntents, devoluciones, transferencias, reversiones, payouts, disputas y retenciones sueltas `requires_capture` sin fila). La corrida y sus
-- diferencias se escriben juntas, en una transacción: `diffs` es exactamente el número de filas de recon_diffs de esa corrida (lo revisa la base al
-- confirmar). La última corrida de un día es la que vale.
create table if not exists recon_runs (
  id            bigint generated always as identity primary key,
  day           date not null,
  mode          text not null check (mode in ('stripe', 'simulador')),
  status        text not null check (status in ('cuadra', 'diferencias', 'fallo')),
  por           text not null check (por in ('barrido', 'equipo')),
  actor_id      uuid references users (id),
  stripe_n      integer not null default 0 check (stripe_n >= 0),
  ledger_n      integer not null default 0 check (ledger_n >= 0),
  stripe_cents  bigint not null default 0,
  ledger_cents  bigint not null default 0,
  counts        jsonb not null default '{}'::jsonb,
  diffs         integer not null default 0 check (diffs >= 0),
  diff_cents    bigint not null default 0,
  error         text check (char_length(error) <= 300),
  started_at    timestamptz not null,
  finished_at   timestamptz not null default now(),
  check ((status = 'cuadra' and diffs = 0 and error is null) or (status = 'diferencias' and diffs > 0 and error is null) or (status = 'fallo' and error is not null)),
  check ((por = 'equipo') = (actor_id is not null))
);
create index if not exists recon_runs_dia_idx on recon_runs (day desc, finished_at desc, id desc);

create table if not exists recon_diffs (
  id             bigint generated always as identity primary key,
  run_id         bigint not null references recon_runs (id),
  day            date not null,
  kind           text not null check (kind in ('payment_intent', 'refund', 'transfer', 'transfer_reversal', 'payout', 'dispute', 'hold_orphan')),
  problem        text not null check (problem in ('falta_en_libro', 'falta_en_stripe', 'monto', 'estado')),
  -- La llave estable de la diferencia (tipo:problema:objeto): la misma diferencia en otra corrida del mismo día conserva a su dueño.
  diff_key       text not null check (diff_key ~ '^[a-z_]+:[a-z_]+:[A-Za-z0-9_.:-]{1,200}$'),
  stripe_id      text check (char_length(stripe_id) <= 200),
  ledger_ref     text check (char_length(ledger_ref) <= 200),
  business_id    text references businesses (id),
  city_id        text references cities (id),
  stripe_cents   bigint,
  ledger_cents   bigint,
  diff_cents     bigint not null default 0,
  stripe_status  text check (char_length(stripe_status) <= 40),
  ledger_status  text check (char_length(ledger_status) <= 40),
  at             timestamptz not null default now(),
  unique (run_id, diff_key)
);
create index if not exists recon_diffs_llave_idx on recon_diffs (diff_key);
create index if not exists recon_diffs_dia_idx on recon_diffs (day desc, run_id);
create index if not exists recon_diffs_ciudad_idx on recon_diffs (city_id, day desc);

-- Quién se hizo cargo de una diferencia (o la resolvió, o la volvió a abrir): solo inserción; el estado es la última nota. «Sin dueño» = ninguna nota
-- o la última es «reabierta».
create table if not exists recon_diff_notes (
  id        bigint generated always as identity primary key,
  diff_key  text not null check (diff_key ~ '^[a-z_]+:[a-z_]+:[A-Za-z0-9_.:-]{1,200}$'),
  action    text not null check (action in ('me_hago_cargo', 'resuelta', 'reabierta')),
  staff_id  uuid not null references users (id),
  note      text not null check (char_length(note) between 4 and 500),
  at        timestamptz not null default now()
);
create index if not exists recon_diff_notes_llave_idx on recon_diff_notes (diff_key, at desc, id desc);

create or replace function dinero_solo_insercion() returns trigger language plpgsql as $$
begin
  raise exception '% es solo de inserción (nada se cambia ni se borra)', tg_table_name;
end $$;
drop trigger if exists recon_runs_no_cambia on recon_runs;
create trigger recon_runs_no_cambia before update or delete on recon_runs for each row execute function dinero_solo_insercion();
drop trigger if exists recon_diffs_no_cambia on recon_diffs;
create trigger recon_diffs_no_cambia before update or delete on recon_diffs for each row execute function dinero_solo_insercion();
drop trigger if exists recon_diff_notes_no_cambia on recon_diff_notes;
create trigger recon_diff_notes_no_cambia before update or delete on recon_diff_notes for each row execute function dinero_solo_insercion();

-- Al confirmar: la corrida dice exactamente cuántas diferencias tiene, la suma de sus montos y su día (derivados que no se editan).
create or replace function recon_runs_cuadra() returns trigger language plpgsql as $$
declare n integer; s bigint; otro integer;
begin
  select count(*)::int, coalesce(sum(diff_cents), 0) into n, s from recon_diffs where run_id = new.id;
  select count(*)::int into otro from recon_diffs where run_id = new.id and day <> new.day;
  if n <> new.diffs or s <> new.diff_cents or otro > 0 then
    raise exception 'recon_cuenta: la corrida % dice % diferencias por % y tiene % por %', new.id, new.diffs, new.diff_cents, n, s;
  end if;
  return null;
end $$;
drop trigger if exists recon_runs_cuadra on recon_runs;
create constraint trigger recon_runs_cuadra after insert on recon_runs deferrable initially deferred for each row execute function recon_runs_cuadra();

-- La conciliación del día (la lee el reporte diario al fundador de 9g y el Super Admin): si corrió, su estado, cuántas diferencias y cuántas SIN DUEÑO.
create or replace function conciliacion_del_dia(d date)
returns table (dia date, corrio boolean, estado text, run_id bigint, corrio_at timestamptz, diferencias integer, sin_dueno integer, diferencia_cents bigint,
               stripe_n integer, libro_n integer, stripe_cents bigint, libro_cents bigint)
language sql stable as $$
  with r as (select * from recon_runs where day = d order by finished_at desc, id desc limit 1)
  select d, r.id is not null, coalesce(r.status, 'sin_correr'), r.id, r.finished_at, coalesce(r.diffs, 0),
         coalesce((select count(*)::int from recon_diffs x
                    where x.run_id = r.id
                      and coalesce((select n.action from recon_diff_notes n where n.diff_key = x.diff_key order by n.at desc, n.id desc limit 1), 'reabierta') = 'reabierta'), 0),
         coalesce(r.diff_cents, 0), coalesce(r.stripe_n, 0), coalesce(r.ledger_n, 0), coalesce(r.stripe_cents, 0), coalesce(r.ledger_cents, 0)
    from (select 1) uno left join r on true
$$;

-- ── Alertas del dinero (lo que Stripe nunca avisa) ──
-- Una alerta por tipo y objeto (solo inserción: dos barridos no avisan dos veces). Quién se hizo cargo y cómo se resolvió va en money_alert_notes.
create table if not exists money_alerts (
  id            bigint generated always as identity primary key,
  kind          text not null check (kind in ('refund_stuck', 'transfer_reversal_stuck', 'dispute_due', 'recon_diff', 'recon_no_corrio', 'payout_failed')),
  subject_id    text not null check (char_length(subject_id) between 1 and 200),
  business_id   text references businesses (id),
  city_id       text references cities (id),
  amount_cents  bigint,
  detail        jsonb not null default '{}'::jsonb,
  at            timestamptz not null default now(),
  unique (kind, subject_id)
);
create index if not exists money_alerts_at_idx on money_alerts (at desc);
create table if not exists money_alert_notes (
  id        bigint generated always as identity primary key,
  alert_id  bigint not null references money_alerts (id),
  action    text not null check (action in ('me_hago_cargo', 'resuelta', 'resuelta_a_mano', 'reabierta')),
  staff_id  uuid not null references users (id),
  note      text not null check (char_length(note) between 4 and 500),
  at        timestamptz not null default now()
);
create index if not exists money_alert_notes_alerta_idx on money_alert_notes (alert_id, at desc, id desc);
drop trigger if exists money_alerts_no_cambia on money_alerts;
create trigger money_alerts_no_cambia before update or delete on money_alerts for each row execute function dinero_solo_insercion();
drop trigger if exists money_alert_notes_no_cambia on money_alert_notes;
create trigger money_alert_notes_no_cambia before update or delete on money_alert_notes for each row execute function dinero_solo_insercion();

-- El camino manual (L800, L821): una devolución que Stripe nunca hace (tarjeta cerrada, cuenta con disputa) o una transferencia que no se puede revertir
-- (el organizador sin saldo) se resuelve fuera de Stripe con su nota. Queda marcada y el barrido deja de reintentarla; sigue contando como devuelta o
-- revertida (nadie la vuelve a pagar). Solo una vez, con nota y quién.
alter table refunds add column if not exists manual_at timestamptz;
alter table refunds add column if not exists manual_by uuid references users (id);
alter table refunds add column if not exists manual_note text check (char_length(manual_note) between 4 and 500);
alter table event_settlement_reversals add column if not exists manual_at timestamptz;
alter table event_settlement_reversals add column if not exists manual_by uuid references users (id);
alter table event_settlement_reversals add column if not exists manual_note text check (char_length(manual_note) between 4 and 500);
create or replace function dinero_a_mano() returns trigger language plpgsql as $$
begin
  if old.manual_at is not null and (new.manual_at, new.manual_by, new.manual_note) is distinct from (old.manual_at, old.manual_by, old.manual_note) then
    raise exception 'dinero_a_mano: ya se resolvió a mano (no se cambia)';
  end if;
  if new.manual_at is not null and old.manual_at is null then
    if new.status <> 'pending' then raise exception 'dinero_a_mano: solo lo que sigue pendiente se resuelve a mano'; end if;
    if new.manual_by is null or new.manual_note is null then raise exception 'dinero_a_mano: falta quién y la nota'; end if;
    if old.attempts < 1 then raise exception 'dinero_a_mano: primero Stripe tiene que haberla rechazado'; end if;
  end if;
  if old.manual_at is not null and new.status <> old.status then raise exception 'dinero_a_mano: resuelta a mano, ya no se reintenta'; end if;
  return new;
end $$;
drop trigger if exists refunds_a_mano on refunds;
create trigger refunds_a_mano before update on refunds for each row execute function dinero_a_mano();
drop trigger if exists event_settlement_reversals_a_mano on event_settlement_reversals;
create trigger event_settlement_reversals_a_mano before update on event_settlement_reversals for each row execute function dinero_a_mano();

-- ── Pagos al banco (Payout) ──
-- El libro propio de lo que Stripe paga a la cuenta de cada negocio (webhook payout.* de la cuenta conectada; en el sandbox, el simulador los martes).
-- Nada se borra; de un pago al banco solo cambian su estado, la fecha de llegada y el código del fallo.
create table if not exists payouts (
  id                 bigint generated always as identity primary key,
  stripe_payout_id   text not null unique check (stripe_payout_id ~ '^po_[A-Za-z0-9_-]{3,250}$'),
  stripe_account_id  text not null check (stripe_account_id ~ '^acct_[A-Za-z0-9_-]{3,200}$'),
  business_id        text references businesses (id),
  city_id            text references cities (id),
  amount_cents       integer not null check (amount_cents >= 0),
  status             text not null check (status in ('pending', 'in_transit', 'paid', 'failed', 'canceled')),
  arrival_date       date,
  failure_code       text check (char_length(failure_code) <= 60),
  simulated          boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists payouts_negocio_idx on payouts (business_id, created_at desc);
create index if not exists payouts_dia_idx on payouts (created_at);
create or replace function payouts_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'un pago al banco no se borra (estados)'; end if;
  if (new.stripe_payout_id, new.stripe_account_id, new.amount_cents, new.created_at, new.simulated) is distinct from (old.stripe_payout_id, old.stripe_account_id, old.amount_cents, old.created_at, old.simulated) then
    raise exception 'de un pago al banco solo cambian su estado, la llegada y el fallo';
  end if;
  if old.status in ('paid', 'failed', 'canceled') and new.status <> old.status then raise exception 'un pago al banco terminado no vuelve'; end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists payouts_antes on payouts;
create trigger payouts_antes before update or delete on payouts for each row execute function payouts_antes();

-- Simulador (solo sandbox): los payouts de las cuentas simuladas, una vez por cuenta y fecha (como Stripe con su calendario).
create table if not exists sim_payouts (
  id            text primary key check (id ~ '^po_sim_'),
  destination   text not null check (destination ~ '^acct_sim_'),
  amount_cents  integer not null check (amount_cents > 0),
  status        text not null default 'paid' check (status in ('pending', 'paid', 'failed')),
  arrival_date  date not null,
  created_at    timestamptz not null default now()
);

-- ── Disputas con evidencia (L357, L393) ──
-- Cada archivo que se manda al banco: recibo en PDF, la conversación (sin teléfonos), la constancia de entrega y, si existe, la foto de la entrega. El
-- archivo vive en el almacén PRIVADO (privado/disputas/…, nunca por /medios) y se sube por la API de archivos de Stripe (purpose dispute_evidence).
-- De una fila solo cambia, una vez, su id de archivo en Stripe y cuándo se envió; nada se borra.
alter table disputes add column if not exists evidence_submitted_at timestamptz;
alter table disputes add column if not exists due_alert_at timestamptz;
create table if not exists dispute_evidence (
  id              bigint generated always as identity primary key,
  dispute_id      bigint not null references disputes (id),
  kind            text not null check (kind in ('recibo', 'conversacion', 'entrega', 'foto_entrega', 'constancia')),
  media_key       text check (media_key ~ '^privado/disputas/[0-9]{1,18}/[a-z_]{4,20}-[0-9a-f]{8}\.(pdf|jpg|png)$'),
  mime            text not null check (mime in ('application/pdf', 'image/jpeg', 'image/png')),
  bytes           integer not null check (bytes between 1 and 5000000),
  sha256          text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  stripe_file_id  text check (stripe_file_id ~ '^file_[A-Za-z0-9_]{3,200}$'),
  created_by      uuid references users (id),
  created_at      timestamptz not null default now(),
  sent_at         timestamptz,
  unique (dispute_id, kind, sha256)
);
create index if not exists dispute_evidence_disputa_idx on dispute_evidence (dispute_id, kind);
create or replace function dispute_evidence_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'la evidencia de una disputa no se borra'; end if;
  if (new.dispute_id, new.kind, new.media_key, new.mime, new.bytes, new.sha256, new.created_by, new.created_at) is distinct from
     (old.dispute_id, old.kind, old.media_key, old.mime, old.bytes, old.sha256, old.created_by, old.created_at) then
    raise exception 'de la evidencia solo cambia, una vez, su archivo en Stripe y cuándo se envió';
  end if;
  if (old.stripe_file_id is not null and new.stripe_file_id is distinct from old.stripe_file_id) or (old.sent_at is not null and new.sent_at is distinct from old.sent_at) then
    raise exception 'la evidencia ya se envió (no se cambia)';
  end if;
  return new;
end $$;
drop trigger if exists dispute_evidence_antes on dispute_evidence;
create trigger dispute_evidence_antes before update or delete on dispute_evidence for each row execute function dispute_evidence_antes();
-- Simulador (solo sandbox): los archivos subidos y lo que se envió al «banco» (para comprobar que la evidencia llegó).
create table if not exists sim_files (
  id          text primary key check (id ~ '^file_sim_'),
  purpose     text not null check (purpose = 'dispute_evidence'),
  bytes       integer not null check (bytes > 0),
  sha256      text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  created_at  timestamptz not null default now()
);
create table if not exists sim_disputes (
  id              text primary key check (id ~ '^dp_sim_'),
  payment_intent  text not null,
  amount_cents    integer not null check (amount_cents >= 0),
  status          text not null check (status in ('needs_response', 'under_review', 'won', 'lost')),
  created_at      timestamptz not null default now()
);
create table if not exists sim_dispute_submissions (
  id          bigint generated always as identity primary key,
  dispute_id  text not null check (dispute_id ~ '^dp_sim_'),
  evidence    jsonb not null,
  at          timestamptz not null default now()
);

-- ── 3-D Secure (L355, L382, L759) ──
-- Cuando el banco pide verificar, el cobro queda en «requires_action» y la persona lo completa en la hoja (Stripe.js handleNextAction; en el sandbox,
-- la verificación simulada). La fila guarda la llave idempotente del cobro: al volver, el mismo envío con la misma llave encuentra el cobro verificado
-- y sigue (sin cobrar dos veces). Una verificación no completada vence (verificacion_min) y el barrido suelta la retención. Las renovaciones de Pro
-- (fuera de sesión) avisan al dueño con un enlace a la misma hoja.
alter table sim_intents drop constraint if exists sim_intents_status_check;
alter table sim_intents add constraint sim_intents_status_check check (status in ('requires_capture', 'succeeded', 'canceled', 'failed', 'requires_action'));
alter table sim_intents add column if not exists capture_method text not null default 'manual' check (capture_method in ('manual', 'automatic'));
create table if not exists payment_actions (
  pi            text primary key check (pi ~ '^pi_[A-Za-z0-9_.:-]{3,250}$'),
  -- base_idem = la llave del cobro que manda el flujo; idem = la que se usó con Stripe (otra, «-vN», si una verificación anterior venció o falló).
  base_idem     text not null check (char_length(base_idem) between 4 and 240),
  idem          text not null unique check (char_length(idem) between 4 and 255),
  user_id       uuid not null references users (id),
  business_id   text references businesses (id),
  city_id       text references cities (id),
  kind          text not null check (kind in ('en_sesion', 'renovacion')),
  amount_cents  integer not null check (amount_cents > 0),
  pm            text check (pm ~ '^pm_[A-Za-z0-9_]{3,200}$'),
  status        text not null default 'pendiente' check (status in ('pendiente', 'verificada', 'fallo', 'vencida')),
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null,
  done_at       timestamptz,
  check (kind <> 'renovacion' or (business_id is not null and pm is not null))
);
create index if not exists payment_actions_usuario_idx on payment_actions (user_id, created_at desc);
create index if not exists payment_actions_base_idx on payment_actions (base_idem, created_at desc);
create index if not exists payment_actions_vivas_idx on payment_actions (expires_at) where status in ('pendiente', 'verificada');
create or replace function payment_actions_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'una verificación del banco no se borra (estados)'; end if;
  if (new.pi, new.base_idem, new.idem, new.user_id, new.business_id, new.kind, new.amount_cents, new.pm, new.created_at) is distinct from
     (old.pi, old.base_idem, old.idem, old.user_id, old.business_id, old.kind, old.amount_cents, old.pm, old.created_at) then
    raise exception 'de una verificación solo cambia su estado';
  end if;
  if new.status <> old.status and not ((old.status = 'pendiente' and new.status in ('verificada', 'fallo', 'vencida')) or (old.status = 'verificada' and new.status = 'vencida')) then
    raise exception 'verificacion_estado: de % no se pasa a %', old.status, new.status;
  end if;
  if new.status <> old.status then new.done_at := now(); end if;
  return new;
end $$;
drop trigger if exists payment_actions_antes on payment_actions;
create trigger payment_actions_antes before update or delete on payment_actions for each row execute function payment_actions_antes();

-- ── La huella de la tarjeta (L760, L938) ──
-- card.fingerprint de Stripe (la misma tarjeta da la misma huella en cualquier cuenta; un pm_… es de una sola). Sirve para el máximo de boletos por
-- persona y la señal «la misma tarjeta en varias cuentas» (Confianza). En el sandbox, la huella simulada sale de la marca y los últimos 4.
alter table payment_methods add column if not exists card_fingerprint text check (card_fingerprint ~ '^[A-Za-z0-9_]{6,64}$');
create index if not exists payment_methods_huella_idx on payment_methods (card_fingerprint) where card_fingerprint is not null and status = 'active';
alter table payments add column if not exists card_fingerprint text check (card_fingerprint ~ '^[A-Za-z0-9_]{6,64}$');
create index if not exists payments_huella_idx on payments (card_fingerprint, created_at desc) where card_fingerprint is not null;
-- Las huellas que usan varias cuentas en los últimos `dias` (de las tarjetas guardadas y de los cobros): la señal de Confianza.
create or replace function tarjetas_en_varias_cuentas(minimo integer, dias integer default 90)
returns table (huella text, cuentas integer, ultima timestamptz) language sql stable as $$
  with u as (
    select card_fingerprint as h, user_id, created_at from payment_methods where card_fingerprint is not null and created_at > now() - make_interval(days => dias)
    union all
    select card_fingerprint, user_id, created_at from payments where card_fingerprint is not null and created_at > now() - make_interval(days => dias))
  select h, count(distinct user_id)::int, max(created_at) from u group by h having count(distinct user_id) >= greatest(2, minimo) order by 2 desc, 3 desc limit 200
$$;

-- ── Configuración › Dinero ──
do $$
declare d text;
begin
  select pg_get_constraintdef(oid) into d from pg_constraint where conname = 'config_keys_section_check' and conrelid = 'config_keys'::regclass;
  -- Se agrega «dinero» a la lista que haya (otro bloque puede haber agregado su sección antes o después): nunca se pierde una.
  if d is not null and position('''dinero''' in d) = 0 then
    execute 'alter table config_keys drop constraint config_keys_section_check';
    execute 'alter table config_keys add constraint config_keys_section_check ' || replace(d, 'ARRAY[', 'ARRAY[''dinero''::text, ');
  end if;
end $$;
insert into config_keys (key, min, max, def, unit, section, label, help, editable, bloqueo, edit_in, sort) values
  ('pagos_banco_dia', 1, 5, 2, '{"es":"día de la semana (2 = martes)","en":"weekday (2 = Tuesday)"}', 'dinero', '{"es":"Pagos al banco · el día","en":"Bank payouts · the day"}',
    '{"es":"Los negocios reciben su dinero cada martes (decisión del fundador). Stripe lo hace con el calendario semanal de cada cuenta; la ayuda y el panel dicen martes.","en":"Businesses get their money every Tuesday (founder decision). Stripe does it with each account''s weekly schedule; the help and the dashboard say Tuesday."}',
    false, '{"es":"Fijo los martes por decisión del fundador.","en":"Fixed on Tuesdays by founder decision."}', null, 950),
  ('conciliacion_hora', 1, 12, 6, '{"es":"hora (Este)","en":"hour (Eastern)"}', 'dinero', '{"es":"Conciliación diaria · corre a las","en":"Daily reconciliation · runs at"}',
    '{"es":"A esta hora el barrido cuadra el día anterior: Stripe contra el libro propio. Si a las dos horas no corrió, avisa al equipo.","en":"At this hour the sweep reconciles the previous day: Stripe against our own ledger. If it has not run two hours later, the team is alerted."}',
    true, null, null, 951),
  ('dinero_alerta_intentos', 2, 50, 5, '{"es":"intentos","en":"attempts"}', 'dinero', '{"es":"Devolución o reversión atascada · alerta tras","en":"Stuck refund or reversal · alert after"}',
    '{"es":"Stripe sigue rechazando una devolución o una reversión de transferencia: pasado este número de intentos llega la alerta al equipo con su camino manual.","en":"Stripe keeps rejecting a refund or a transfer reversal: after this many attempts the team gets the alert with its manual path."}',
    true, null, null, 952),
  ('disputa_alerta_dias', 1, 7, 3, '{"es":"días antes del plazo","en":"days before the deadline"}', 'dinero', '{"es":"Disputa sin responder · alerta","en":"Unanswered dispute · alert"}',
    '{"es":"Una disputa sin evidencia enviada avisa al equipo estos días antes de que venza el plazo del banco.","en":"A dispute with no evidence sent alerts the team this many days before the bank deadline."}',
    true, null, null, 953),
  ('verificacion_min', 10, 120, 30, '{"es":"minutos","en":"minutes"}', 'dinero', '{"es":"Verificación del banco (3-D Secure) · dura","en":"Bank verification (3-D Secure) · lasts"}',
    '{"es":"Lo que tiene la persona para completar la verificación en la hoja; después se suelta lo retenido y hay que empezar otra vez.","en":"How long the person has to complete the verification in the sheet; after that the hold is released and they start again."}',
    true, null, null, 954),
  ('tarjeta_cuentas_senal', 2, 10, 3, '{"es":"cuentas","en":"accounts"}', 'dinero', '{"es":"Señal «misma tarjeta en varias cuentas» · desde","en":"Signal «same card on several accounts» · from"}',
    '{"es":"La misma tarjeta (por su huella) usada en estas cuentas o más en 90 días aparece en Confianza › Señales.","en":"The same card (by its fingerprint) used on this many accounts or more in 90 days shows up in Trust › Signals."}',
    true, null, null, 955)
on conflict (key) do nothing;

-- ── Avisos ──
insert into notif_templates (key, grp, pref, sms, title, body) values
  ('pro_verify', 'tx', null, true, '{"es":"Tu banco pide confirmar el cobro de Pro","en":"Your bank asks you to confirm the Pro charge"}',
    '{"es":"Para cobrar {monto} de Pro de {negocio}, tu banco pide que confirmes que eres tú. Ábrelo y confirma; mientras tanto, sigues con Pro.","en":"To charge {monto} for {negocio} Pro, your bank asks you to confirm it is you. Open it and confirm; meanwhile you keep Pro."}'),
  ('din_alerta', 'mod', null, false, '{"es":"Dinero: {que}","en":"Money: {que}"}',
    '{"es":"{detalle}. Míralo en Planes › Ingresos.","en":"{detalle}. See it in Plans › Revenue."}')
on conflict (key) do nothing;

commit;
