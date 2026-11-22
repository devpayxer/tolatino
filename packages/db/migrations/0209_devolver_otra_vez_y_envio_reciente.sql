-- 0209 · Dinero, lo que queda después de 9t8 (22 nov; LAUNCH «Dinero por clase: lo que queda después de 9t8» (a), (b) y (d)). Idempotente. Solo expande: columnas
-- nuevas que admiten null, un índice, triggers y evt_liq_calc con la misma firma. Nada se borra (estados).
--
-- (a) «Devolver otra vez» unos boletos desde su alerta refund_failed. La devolución fallida no se toca (queda 'failed', con su historia); la NUEVA es otra fila
--     de refunds que dice de cuál es (retry_of) y qué devolución guarda sus boletos (lines_of: ticket_refund_lines es única por boleto y se queda con la
--     original). La base impone:
--       · una sola por devolución fallida (índice único en retry_of): la misma clave dos veces o dos personas a la vez = una sola devolución;
--       · solo de una que Stripe dio por fallida (status 'failed', sin resolver a mano), del MISMO cobro y por el MISMO monto; con boletos; sin disputa;
--         la pide una persona del equipo (initiated_by 'admin' con actor_id);
--       · nunca más de lo cobrado menos lo devuelto o en camino: refunds_tope (0109), que corre en el mismo insert;
--       · una fallida que ya tiene la suya no deja de estar fallida.
--     evt_liq_calc: la comisión que To'Latino cedió en esos boletos vuelve a contar mientras la devolución de otra vez esté en camino o hecha (antes solo
--     contaba la de la fila de los boletos: con la original fallida, el organizador habría pagado esa comisión).
-- (b) La carrera de «Resolver a mano» mientras el barrido la manda: antesDeAMano le pregunta a Stripe, pero algo recién mandado puede no verse todavía. Se
--     anota el ÚLTIMO envío (last_sent_at; sent_at es solo el primero) y la base no deja marcar a mano una que sigue en camino en los minutos siguientes a
--     un envío (los de MINUTOS_ENVIO_MANO de lib/dinero-alertas; el guardián manoTrasEnvioReciente los compara). En las cuatro intenciones que se resuelven
--     a mano: refunds, event_settlement_reversals, gateway_refunds y sponsorship_refunds.
-- (d) Cuándo Stripe dio por fallida la devolución de un patrocinio (sponsorship_refunds.failed_at, la pone la base): su alerta «sin respuesta» es de una vez
--     y la fila tiene que decir lo último que dijo Stripe.
begin;

-- ── (b) El último envío ──
alter table refunds add column if not exists last_sent_at timestamptz;
alter table event_settlement_reversals add column if not exists last_sent_at timestamptz;
alter table gateway_refunds add column if not exists last_sent_at timestamptz;
alter table sponsorship_refunds add column if not exists last_sent_at timestamptz;

create or replace function dinero_envio_reciente() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then new.last_sent_at := null; return new; end if;
  if new.last_sent_at is distinct from old.last_sent_at then
    -- Solo quien la manda, en camino y sin resolver a mano, y nunca hacia atrás.
    if new.last_sent_at is null or old.status <> 'pending' or old.manual_at is not null or new.last_sent_at < coalesce(old.last_sent_at, '-infinity'::timestamptz) then
      raise exception 'dinero_envio: el último envío se anota solo en camino, sin resolver a mano y hacia adelante';
    end if;
  end if;
  if new.manual_at is not null and old.manual_at is null and old.status = 'pending' and old.last_sent_at > now() - interval '10 minutes' then
    raise exception 'dinero_a_mano_reciente: se mandó a Stripe hace menos de 10 minutos; espera y vuelve a intentarlo (Stripe puede no mostrarla todavía)';
  end if;
  return new;
end $$;
drop trigger if exists refunds_envio_reciente on refunds;
create trigger refunds_envio_reciente before insert or update on refunds for each row execute function dinero_envio_reciente();
drop trigger if exists event_settlement_reversals_envio_reciente on event_settlement_reversals;
create trigger event_settlement_reversals_envio_reciente before insert or update on event_settlement_reversals for each row execute function dinero_envio_reciente();
drop trigger if exists gateway_refunds_envio_reciente on gateway_refunds;
create trigger gateway_refunds_envio_reciente before insert or update on gateway_refunds for each row execute function dinero_envio_reciente();
drop trigger if exists sponsorship_refunds_envio_reciente on sponsorship_refunds;
create trigger sponsorship_refunds_envio_reciente before insert or update on sponsorship_refunds for each row execute function dinero_envio_reciente();

-- ── (d) Cuándo Stripe dio por fallida la devolución de un patrocinio (la alerta es de una vez: la fila muestra lo último que dijo Stripe con esto). La pone
--     la base al pasar a 'failed' y no cambia. Las fallidas de antes, con la hora de su auditoría.
alter table sponsorship_refunds add column if not exists failed_at timestamptz;
update sponsorship_refunds z set failed_at = coalesce((select max(e.at) from audit_entries e where e.action in ('patrocinio.devolucion_fallida', 'patrocinio_evento.devolucion_fallida')
                                                         and e.after->>'intencion' = 'sponsorship_refunds:' || z.id), z.created_at)
 where z.status = 'failed' and z.failed_at is null;
create or replace function sponsorship_refunds_fallida() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then new.failed_at := null; return new; end if;
  if new.status = 'failed' and old.status <> 'failed' then new.failed_at := now(); return new; end if;
  if new.failed_at is distinct from old.failed_at then raise exception 'pat_dev: failed_at lo pone la base al fallar'; end if;
  return new;
end $$;
drop trigger if exists sponsorship_refunds_fallida on sponsorship_refunds;
create trigger sponsorship_refunds_fallida before insert or update on sponsorship_refunds for each row execute function sponsorship_refunds_fallida();

-- ── (a) Devolver otra vez unos boletos ──
alter table refunds add column if not exists retry_of bigint references refunds (id);
alter table refunds add column if not exists lines_of bigint references refunds (id);
create unique index if not exists refunds_otra_vez_uq on refunds (retry_of) where retry_of is not null;
create index if not exists refunds_lines_of_idx on refunds (lines_of) where lines_of is not null;

create or replace function refunds_otra_vez() returns trigger language plpgsql as $$
declare f refunds;
begin
  if tg_op = 'INSERT' then
    new.lines_of := null;
    if new.retry_of is null then return new; end if;
    -- Con candado: «Resolver a mano» sobre la misma fila espera a que esto termine (o esto espera y ve su manual_at). Orden de candados de toda devolución
    -- nueva: el cobro (anotarDevolucionPago y refunds_tope) y DESPUÉS la fallida; «Resolver a mano» toma solo la fila de la devolución, nunca el cobro.
    select * into f from refunds where id = new.retry_of for update;
    if not found then raise exception 'otra_vez: esa devolución no existe'; end if;
    if f.status <> 'failed' or f.manual_at is not null then raise exception 'otra_vez: solo una devolución que Stripe dio por fallida (y sin resolver a mano)'; end if;
    if f.payment_id <> new.payment_id or f.amount_cents <> new.amount_cents then raise exception 'otra_vez: del mismo cobro y por el mismo monto'; end if;
    if new.initiated_by <> 'admin' or new.actor_id is null then raise exception 'otra_vez: la pide una persona del equipo'; end if;
    new.lines_of := coalesce(f.lines_of, f.id);
    if not exists (select 1 from ticket_refund_lines l where l.refund_id = new.lines_of) then raise exception 'otra_vez: solo devoluciones de boletos'; end if;
    if exists (select 1 from disputes d where d.payment_id = new.payment_id and d.status in ('needs_response', 'under_review', 'lost', 'accepted')) then
      raise exception 'otra_vez: el cobro tiene una disputa con el banco';
    end if;
    return new;
  end if;
  if (new.retry_of, new.lines_of) is distinct from (old.retry_of, old.lines_of) then raise exception 'otra_vez: de cuál es no cambia'; end if;
  -- Una que ya se devolvió otra vez (en camino o hecha) no se resuelve a mano: sería pagar dos veces. (dinero_a_mano, 0199, ya no deja marcar a mano una
  -- fallida; esto lo dice aunque esa regla cambie.)
  if new.manual_at is not null and old.manual_at is null and exists (select 1 from refunds x where x.retry_of = old.id and x.status in ('pending', 'done')) then
    raise exception 'otra_vez_a_mano: ya se devolvió otra vez desde su alerta; no se resuelve a mano';
  end if;
  if old.status = 'failed' and new.status <> 'failed' and exists (select 1 from refunds x where x.retry_of = old.id) then
    raise exception 'otra_vez: ya se devolvió otra vez; la fallida sigue fallida';
  end if;
  return new;
end $$;
drop trigger if exists refunds_otra_vez on refunds;
create trigger refunds_otra_vez before insert or update on refunds for each row execute function refunds_otra_vez();

-- La comisión cedida en esos boletos cuenta con la devolución que los tiene O con la de otra vez (una sola de la cadena está viva: la otra vez solo nace de
-- una fallida). Lo demás, igual que 0199.
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
                      where l.operation_id = p.op and r.status in ('pending', 'done')), 0)
           + coalesce((select sum(l.fee_waived_cents) from ticket_refund_lines l join refunds r on r.id = l.refund_id
                      where l.operation_id = p.op and r.status = 'failed'
                        and exists (select 1 from refunds y where y.lines_of = r.id and y.status in ('pending', 'done'))), 0) as waived,
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
