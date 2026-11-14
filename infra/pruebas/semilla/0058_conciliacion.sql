-- Semilla de pruebas · 9k · Dinero real listo (fase9-apertura.md §4 9k). SOLO SANDBOX (decisión I; regla 13): nunca corre contra producción.
-- 1) El «Stripe» del sandbox (el simulador de lib/pagos/pasarela.ts) de los cobros que las semillas anteriores escribieron directo en el libro: cada cobro
--    simulado (pi_sim_…) y cada devolución simulada (re_sim_…) sin su lado en el simulador lo recibe igual que si hubiera pasado por la pasarela (mismo
--    monto, estado y fecha). Sin esto, la conciliación de cada mañana marcaría como diferencia todo lo sembrado.
-- 2) Dos días de la conciliación para ver Planes › Ingresos: hace 3 días, uno que cuadra; hace 2 días, uno con dos diferencias (una retención suelta y un
--    pago al banco que el libro no tiene) que ya tienen dueño (Ana, del equipo), así el Inicio del Super Admin no dice «el dinero no cuadra» en las capturas
--    aprobadas. La prueba din9k crea su propio día con diferencias sin dueño.
-- Idempotente: cada fila se identifica por su id o por su día; la conciliación es de solo inserción (no se cambia, se agrega).
begin;

-- 1 · El lado del simulador de lo sembrado.
insert into sim_intents (id, amount_cents, fee_cents, destination, status, captured_cents, refunded_cents, card, created_at, capture_method)
select p.stripe_payment_intent, coalesce(p.held_cents, p.amount_cents), p.fee_cents,
       case when p.transfer_group is not null then 'tolatino' else coalesce((select a.stripe_account_id from stripe_accounts a where a.business_id = p.business_id), 'acct_sim_' || p.business_id) end,
       case p.status when 'held' then 'requires_capture' when 'released' then 'canceled' when 'failed' then 'failed' else 'succeeded' end,
       case when p.status in ('captured', 'partially_refunded', 'refunded') then p.amount_cents else 0 end,
       case when p.status in ('captured', 'partially_refunded', 'refunded') then p.refunded_cents else 0 end,
       coalesce(p.payment_method, 'pm_sim_' || coalesce(p.card_brand, 'visa') || '_' || coalesce(p.card_last4, '4242')), p.created_at, 'manual'
  from payments p
 where p.simulated and p.stripe_payment_intent like 'pi_sim_%'
   and not exists (select 1 from sim_intents s where s.id = p.stripe_payment_intent);
insert into sim_refunds (id, payment_intent, amount_cents, created_at)
select r.stripe_refund_id, p.stripe_payment_intent, r.amount_cents, coalesce(r.done_at, r.created_at)
  from refunds r join payments p on p.id = r.payment_id
 where r.status = 'done' and r.stripe_refund_id like 're_sim_%'
   and not exists (select 1 from sim_refunds s where s.id = r.stripe_refund_id);

-- 2 · Hace 3 días: la conciliación cuadra.
insert into recon_runs (day, mode, status, por, stripe_n, ledger_n, stripe_cents, ledger_cents, counts, diffs, diff_cents, started_at, finished_at)
select (now() at time zone 'UTC')::date - 3, 'simulador', 'cuadra', 'barrido', 12, 12, 48650, 48650,
       '{"payment_intent":{"stripe":9,"libro":9},"refund":{"stripe":1,"libro":1},"transfer":{"stripe":0,"libro":0},"transfer_reversal":{"stripe":0,"libro":0},"payout":{"stripe":2,"libro":2},"dispute":{"stripe":0,"libro":0}}'::jsonb,
       0, 0, now() - interval '3 days' + interval '6 hours', now() - interval '3 days' + interval '6 hours 1 minute'
 where not exists (select 1 from recon_runs where day = (now() at time zone 'UTC')::date - 3);

-- 2 · Hace 2 días: dos diferencias, cada una con su dueño.
with r as (
  insert into recon_runs (day, mode, status, por, stripe_n, ledger_n, stripe_cents, ledger_cents, counts, diffs, diff_cents, started_at, finished_at)
  select (now() at time zone 'UTC')::date - 2, 'simulador', 'diferencias', 'barrido', 11, 9, 52300, 47800,
         '{"payment_intent":{"stripe":8,"libro":7},"refund":{"stripe":0,"libro":0},"transfer":{"stripe":0,"libro":0},"transfer_reversal":{"stripe":0,"libro":0},"payout":{"stripe":3,"libro":2},"dispute":{"stripe":0,"libro":0}}'::jsonb,
         2, 4500, now() - interval '2 days' + interval '6 hours', now() - interval '2 days' + interval '6 hours 1 minute'
   where not exists (select 1 from recon_runs where day = (now() at time zone 'UTC')::date - 2)
  returning id, day)
insert into recon_diffs (run_id, day, kind, problem, diff_key, stripe_id, ledger_ref, business_id, city_id, stripe_cents, ledger_cents, diff_cents, stripe_status, ledger_status)
select r.id, r.day, x.kind, x.problem, x.llave, x.sid, null, (select id from businesses where id = 'sabor-dominicano'), 'hzl', x.monto, null, x.monto, x.st, null
  from r, (values ('hold_orphan', 'falta_en_libro', 'hold_orphan:falta_en_libro:pi_sim_semilla0058_retencion', 'pi_sim_semilla0058_retencion', 2500, 'requires_capture'),
                  ('payout', 'falta_en_libro', 'payout:falta_en_libro:po_sim_semilla0058_martes', 'po_sim_semilla0058_martes', 2000, 'paid')) x(kind, problem, llave, sid, monto, st);
insert into recon_diff_notes (diff_key, action, staff_id, note)
select k, 'me_hago_cargo', u.id, 'Semilla 9k: la reviso con Stripe y el negocio.'
  from users u, (values ('hold_orphan:falta_en_libro:pi_sim_semilla0058_retencion'), ('payout:falta_en_libro:po_sim_semilla0058_martes')) v(k)
 where u.phone = '+15705550199' and not exists (select 1 from recon_diff_notes n where n.diff_key = v.k);

commit;
