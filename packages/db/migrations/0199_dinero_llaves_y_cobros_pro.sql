-- 0199 · Dinero por clase, lo que quedó (9t, 21 nov; LAUNCH «Dinero por clase, 21 nov · lo que quedó», puntos a, b, c y d).
-- Idempotente. Nada se borra (estados); la auditoría y las alertas, solo inserción.
begin;

-- (a)(b) Dos alertas del dinero nuevas (money_alerts, una por tipo y objeto, como las demás):
--   transfer_stuck: la transferencia al organizador (liquidación del martes) lleva 23 h en camino sin un «sí» de Stripe: ya no se le pide otra vez
--                   con la misma llave (Stripe la olvida a las 24 h y podría transferir dos veces); el equipo de dinero lo mira en Stripe.
--   charge_stuck:   un cobro de Pro anotado que lleva 23 h sin respuesta de Stripe: no se cobra otra vez; el equipo lo mira en Stripe.
alter table money_alerts drop constraint if exists money_alerts_kind_check;
alter table money_alerts add constraint money_alerts_kind_check
  check (kind in ('refund_stuck', 'transfer_reversal_stuck', 'dispute_due', 'recon_diff', 'recon_no_corrio', 'payout_failed', 'refund_failed', 'charge_unapplied',
                  'transfer_stuck', 'charge_stuck'));

-- (b) La intención de cada cobro de Pro, ANTES de llamar a la pasarela (lib/suscripcion.ts › cobrarPeriodo). La llave de Stripe es la de la fila
--     (idem_key, única); el monto, la tarjeta y el período quedan fijos. Una sola en camino por negocio (si Stripe no contestó, nadie cobra otra cosa
--     hasta que esa termine) y un solo cobro hecho por período. 'action' = el banco pidió confirmar (3-D Secure): la termina la verificación.
create table if not exists subscription_charges (
  id             bigint generated always as identity primary key,
  business_id    text not null references businesses (id),
  city_id        text references cities (id),
  period_start   timestamptz not null,
  cycle          text not null check (cycle in ('month', 'year')),
  amount_cents   integer not null check (amount_cents > 0),
  pm             text not null check (char_length(pm) between 3 and 200),
  payer_user_id  uuid not null references users (id),
  idem_key       text not null unique check (char_length(idem_key) between 8 and 200),
  status         text not null default 'pending' check (status in ('pending', 'done', 'failed', 'action')),
  stripe_pi      text check (char_length(stripe_pi) <= 200),
  attempts       smallint not null default 0 check (attempts between 0 and 10000),
  last_error     text check (char_length(last_error) <= 120),
  created_at     timestamptz not null default now(),
  done_at        timestamptz
);
create unique index if not exists subscription_charges_una_en_camino on subscription_charges (business_id) where status = 'pending';
create unique index if not exists subscription_charges_un_cobro_por_periodo on subscription_charges (business_id, period_start) where status = 'done';
create index if not exists subscription_charges_camino_idx on subscription_charges (created_at) where status = 'pending';
create index if not exists subscription_charges_pi_idx on subscription_charges (stripe_pi) where stripe_pi is not null;
create or replace function subscription_charges_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'un cobro de Pro no se borra (estados)'; end if;
  if tg_op = 'INSERT' then
    new.status := 'pending'; new.attempts := 0; new.last_error := null; new.stripe_pi := null; new.done_at := null; new.created_at := now();
    return new;
  end if;
  if (new.business_id, new.period_start, new.cycle, new.amount_cents, new.pm, new.payer_user_id, new.idem_key, new.created_at)
     is distinct from (old.business_id, old.period_start, old.cycle, old.amount_cents, old.pm, old.payer_user_id, old.idem_key, old.created_at) then
    raise exception 'de un cobro de Pro solo cambian su estado y su respuesta';
  end if;
  if new.status is distinct from old.status and not ((old.status = 'pending' and new.status in ('done', 'failed', 'action')) or (old.status = 'action' and new.status in ('done', 'failed'))) then
    raise exception 'cobro_pro_estado: % no pasa a %', old.status, new.status;
  end if;
  if new.status = 'done' and old.status <> 'done' then new.done_at := now(); end if;
  return new;
end $$;
drop trigger if exists subscription_charges_antes on subscription_charges;
create trigger subscription_charges_antes before insert or update or delete on subscription_charges for each row execute function subscription_charges_antes();

-- (c) «Resolver a mano» (refunds y event_settlement_reversals): además de lo que Stripe ya intentó, lo que lleva 23 h anotado sin un solo intento
--     (el proceso murió antes de mandarlo y el barrido ya no lo manda: Stripe olvidó la llave). Nunca antes de las 23 h sin intentos: alguien todavía
--     podría mandarlo. Las 23 h son las de lib/cobros.ts (HORAS_LLAVE; el guardián manoTrasLaLlave las compara). Reemplaza la función de 0141.
create or replace function dinero_a_mano() returns trigger language plpgsql as $$
begin
  if old.manual_at is not null and (new.manual_at, new.manual_by, new.manual_note) is distinct from (old.manual_at, old.manual_by, old.manual_note) then
    raise exception 'dinero_a_mano: ya se resolvió a mano (no se cambia)';
  end if;
  if new.manual_at is not null and old.manual_at is null then
    if new.status <> 'pending' then raise exception 'dinero_a_mano: solo lo que sigue pendiente se resuelve a mano'; end if;
    if new.manual_by is null or new.manual_note is null then raise exception 'dinero_a_mano: falta quién y la nota'; end if;
    if old.attempts < 1 and old.created_at > now() - interval '23 hours' then
      raise exception 'dinero_a_mano: primero Stripe tiene que haberla intentado (o pasar 23 h sin que nadie la mande)';
    end if;
  end if;
  if old.manual_at is not null and new.status <> old.status then raise exception 'dinero_a_mano: resuelta a mano, ya no se reintenta'; end if;
  return new;
end $$;

-- (d) Una devolución de boletos que Stripe da por fallida después: lo que To'Latino había cedido de su comisión en esos boletos
--     (ticket_refund_lines.fee_waived_cents) deja de contar, como lo devuelto (que ya solo cuenta 'pending' y 'done'). Lo demás, igual que 0110.
create or replace function evt_liq_calc(fid bigint, out gross int, out fee int, out refunded int, out disputed int, out base int,
                                        out abiertas int, out pendientes int, out retenidos int, out vivos_cx int)
language sql stable as $$
  with p as (
    select p.id, p.amount_cents as amt, p.fee_cents as fc, p.status, o.id as op
      from operations o join payments p on p.operation_id = o.id and p.kind = 'full' and p.transfer_group is not null
     where o.kind = 'tickets' and (o.details->>'event_date_id')::bigint = fid
  ), x as (
    select p.amt, p.fc,
           coalesce((select sum(r.amount_cents) from refunds r where r.payment_id = p.id and r.status in ('pending', 'done')), 0) as dev,
           coalesce((select sum(l.fee_waived_cents) from ticket_refund_lines l join refunds r on r.id = l.refund_id
                      where l.operation_id = p.op and r.status in ('pending', 'done')), 0) as waived,
           coalesce((select sum(d.amount_cents) from disputes d where d.payment_id = p.id and d.status in ('lost', 'accepted')), 0) as lost
      from p where p.status in ('captured', 'partially_refunded', 'refunded')
  ), y as (
    select amt, dev, least(lost, greatest(0, amt - dev)) as lost2,
           case when lost > 0 then 0 else least(greatest(0, fc - waived), greatest(0, amt - dev)) end as fee2
      from x
  )
  select coalesce(sum(amt), 0)::int, coalesce(sum(fee2), 0)::int, coalesce(sum(dev), 0)::int, coalesce(sum(lost2), 0)::int,
         coalesce(sum(greatest(0, amt - dev - lost2 - fee2)), 0)::int,
         (select count(*)::int from disputes d join p on p.id = d.payment_id where d.status in ('needs_response', 'under_review')),
         (select count(*)::int from refunds r join p on p.id = r.payment_id where r.status = 'pending'),
         (select count(*)::int from p where p.status = 'held'),
         (select count(*)::int from tickets t join event_dates d on d.id = t.event_date_id join events e on e.id = d.event_id
           where t.event_date_id = fid and t.kind = 'paid' and t.status in ('valid', 'used') and (d.status = 'cancelled' or e.status = 'cancelled'))
    from y
$$;

commit;
