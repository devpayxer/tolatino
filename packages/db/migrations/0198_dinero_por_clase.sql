-- 0198 · Dinero por clase (9t, 21 nov; LAUNCH «Dinero por clase, 21 nov»).
-- (5) Pausar o reanudar los pagos al banco de un negocio (Negocio 360° › Dinero): la decisión se anota ANTES de llamar a Stripe. payouts_sync_at
--     dice desde cuándo Stripe todavía no confirmó el estado que la base ya tiene (payouts_paused); el barrido (sincronizarPausas) se lo vuelve a
--     pedir a Stripe hasta que conteste y lo limpia. Así, si el proceso muere entre la base y Stripe, los dos terminan iguales. Pedir a Stripe el
--     calendario de pagos es fijar un estado (repetirlo no mueve dinero).
-- (6)(8) Dos alertas del dinero nuevas (money_alerts, solo inserción): refund_failed (una devolución que Stripe dio por hecha y después por fallida,
--     webhook charge.refund.updated) y charge_unapplied (un cobro de Pro que salió mientras el plan cambiaba: no se pisó el cambio y el equipo de
--     dinero lo revisa). Una alerta por tipo y objeto, como las demás.
alter table stripe_accounts add column if not exists payouts_sync_at timestamptz;
create index if not exists stripe_accounts_pagos_sync_idx on stripe_accounts (payouts_sync_at) where payouts_sync_at is not null;

alter table money_alerts drop constraint if exists money_alerts_kind_check;
alter table money_alerts add constraint money_alerts_kind_check
  check (kind in ('refund_stuck', 'transfer_reversal_stuck', 'dispute_due', 'recon_diff', 'recon_no_corrio', 'payout_failed', 'refund_failed', 'charge_unapplied'));
