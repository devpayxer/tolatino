-- 0206 · Dinero, séptima tanda (9t7, 21 nov; LAUNCH «Preguntarle a la pasarela, lo que quedó de 9t6»). Idempotente. Nada se borra (estados); las consultas,
-- las decisiones y la auditoría, solo inserción.
--
-- La clase: «sin respuesta» de la pasarela NO es «rechazado», y lo que una persona cierra el servidor lo comprueba con la pasarela. Las devoluciones de un
-- cobro (refunds: las de lib/cobros y las de boletos) y las reversiones de una transferencia al organizador (event_settlement_reversals) que pasaban la
-- ventana de la llave (23 h) se quedaban en camino para siempre con la alerta refund_stuck / transfer_reversal_stuck y solo «Resolver a mano», que confiaba
-- en lo que decía la persona. Ahora, como los cobros de 9t5 y las renovaciones de 9t6 (lib/consulta-pasarela.ts):
--   (1) cada una anota que se manda (sent_at) y su dato buscable (gateway_ref = la metadata tl_intencion '<tabla>:<id>') en UNA sentencia, antes de la
--       pasarela, y solo la primera vez;
--   (2) pasada la ventana, el barrido le PREGUNTA a la pasarela (las devoluciones de ESE cobro, o las reversiones de ESA transferencia, por su dato) y cierra
--       con ese veredicto, una vez: hecha → hecha; fallida → lo que pasa con un «no»; nunca llegó (con el dato y pasado el margen) → la misma intención
--       vuelve a valer con OTRA llave (key_from / key_n) solo si lo debido sigue igual; varios u otro monto → gateway_review;
--   (3) «Resolver a mano» vuelve a preguntar antes: si Stripe dice que salió, se cierra como hecha (no a mano); si no contesta, no cambia nada. La devolución
--       de lo que sobró (gateway_refunds, 9t6) también tiene su «Resolver a mano», con la misma regla.
-- Una devolución o reversión anotada antes de esto se da por mandada SIN el dato (sent_at = created_at, gateway_ref null): nunca se da por «no llegó».
begin;

-- ── (1) Devoluciones de un cobro (refunds) ──
alter table refunds add column if not exists sent_at timestamptz;
alter table refunds add column if not exists gateway_ref text check (gateway_ref ~ '^refunds:[0-9]{1,18}$');
-- key_from: desde cuándo vale otra vez la llave (la consulta dijo que nunca llegó); key_n: cuántas veces volvió a valer. La llave que va a Stripe es la de la
-- fila (idem_key) la primera vez y idem_key || '-r' || key_n después: OTRA llave (Stripe pudo guardar la respuesta de la anterior), la MISMA intención (sus
-- líneas de boletos, su caso de Soporte y su auditoría siguen con ella).
alter table refunds add column if not exists key_from timestamptz;
alter table refunds add column if not exists key_n smallint not null default 0 check (key_n between 0 and 100);
-- Lo que ya estaba en camino pudo haberse mandado (sin el dato): se da por mandado, para que nunca se dé por «no llegó».
update refunds set sent_at = created_at where sent_at is null and status = 'pending';

create or replace function refunds_consulta() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then new.sent_at := null; new.gateway_ref := null; new.key_from := null; new.key_n := 0; return new; end if;
  if old.sent_at is not null and new.sent_at is distinct from old.sent_at then raise exception 'devolucion: sent_at se anota una vez'; end if;
  if old.gateway_ref is not null and new.gateway_ref is distinct from old.gateway_ref then raise exception 'devolucion: gateway_ref se anota una vez'; end if;
  if new.gateway_ref is not null and new.gateway_ref <> ('refunds:' || new.id) then raise exception 'devolucion: gateway_ref es el de esta fila'; end if;
  if (new.sent_at, new.gateway_ref) is distinct from (old.sent_at, old.gateway_ref) and old.status <> 'pending' then raise exception 'devolucion: solo en camino se anota que se manda'; end if;
  if (new.key_from, new.key_n) is distinct from (old.key_from, old.key_n) then
    -- La llave vuelve a valer una vez por veredicto: en camino, sin resolver a mano, ya mandada y pasadas 23 h (HORAS_LLAVE de lib/cobros) de la anterior.
    if old.status <> 'pending' or old.manual_at is not null or old.sent_at is null or new.key_from is null or new.key_n <> old.key_n + 1
       or new.key_from < coalesce(old.key_from, old.created_at) + interval '23 hours' then
      raise exception 'devolucion_llave: la llave vuelve a valer solo en camino, una vez y pasadas 23 h de la anterior';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists refunds_consulta on refunds;
create trigger refunds_consulta before insert or update on refunds for each row execute function refunds_consulta();
create index if not exists refunds_camino_llave_idx on refunds ((coalesce(key_from, created_at))) where status = 'pending' and manual_at is null;

-- ── (1) Reversiones de una transferencia al organizador (event_settlement_reversals) ──
alter table event_settlement_reversals add column if not exists sent_at timestamptz;
alter table event_settlement_reversals add column if not exists gateway_ref text check (gateway_ref ~ '^event_settlement_reversals:[0-9]{1,18}$');
alter table event_settlement_reversals add column if not exists key_from timestamptz;
alter table event_settlement_reversals add column if not exists key_n smallint not null default 0 check (key_n between 0 and 100);
update event_settlement_reversals set sent_at = created_at where sent_at is null and status = 'pending';

create or replace function event_settlement_reversals_consulta() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then new.sent_at := null; new.gateway_ref := null; new.key_from := null; new.key_n := 0; return new; end if;
  if old.sent_at is not null and new.sent_at is distinct from old.sent_at then raise exception 'evt_rev: sent_at se anota una vez'; end if;
  if old.gateway_ref is not null and new.gateway_ref is distinct from old.gateway_ref then raise exception 'evt_rev: gateway_ref se anota una vez'; end if;
  if new.gateway_ref is not null and new.gateway_ref <> ('event_settlement_reversals:' || new.id) then raise exception 'evt_rev: gateway_ref es el de esta fila'; end if;
  if (new.sent_at, new.gateway_ref) is distinct from (old.sent_at, old.gateway_ref) and old.status <> 'pending' then raise exception 'evt_rev: solo en camino se anota que se manda'; end if;
  if (new.key_from, new.key_n) is distinct from (old.key_from, old.key_n) then
    if old.status <> 'pending' or old.manual_at is not null or old.sent_at is null or new.key_from is null or new.key_n <> old.key_n + 1
       or new.key_from < coalesce(old.key_from, old.created_at) + interval '23 hours' then
      raise exception 'evt_rev_llave: la llave vuelve a valer solo en camino, una vez y pasadas 23 h de la anterior';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists event_settlement_reversals_consulta on event_settlement_reversals;
create trigger event_settlement_reversals_consulta before insert or update on event_settlement_reversals for each row execute function event_settlement_reversals_consulta();

-- ── (2) La consulta a la pasarela y la decisión del equipo, también para estas intenciones ──
alter table gateway_checks drop constraint if exists gateway_checks_subject_kind_check;
alter table gateway_checks add constraint gateway_checks_subject_kind_check
  check (subject_kind in ('subscription_charges', 'offsession_charges', 'event_settlements', 'hold_renewals', 'gateway_refunds', 'refunds', 'event_settlement_reversals'));
-- «Elegir cuál vale» en una devolución o reversión (o en la devolución de lo que sobró) con varias en Stripe: solo «vale» (lo que salió de más no se deshace
-- con otra devolución; queda en la auditoría y la alerta lo dice). La base lo impone.
alter table gateway_reviews drop constraint if exists gateway_reviews_subject_kind_check;
alter table gateway_reviews add constraint gateway_reviews_subject_kind_check
  check (subject_kind in ('subscription_charges', 'offsession_charges', 'event_settlements', 'hold_renewals', 'refunds', 'event_settlement_reversals', 'gateway_refunds'));
alter table gateway_reviews drop constraint if exists gateway_reviews_devolucion_solo_vale;
alter table gateway_reviews add constraint gateway_reviews_devolucion_solo_vale
  check (subject_kind not in ('refunds', 'event_settlement_reversals', 'gateway_refunds') or decision = 'vale');

-- ── (3) «Resolver a mano» la devolución de lo que sobró (gateway_refunds) ──
alter table gateway_refunds add column if not exists manual_at timestamptz;
alter table gateway_refunds add column if not exists manual_by uuid references users (id);
alter table gateway_refunds add column if not exists manual_note text check (char_length(manual_note) between 4 and 500);
create or replace function gateway_refunds_a_mano() returns trigger language plpgsql as $$
begin
  if old.manual_at is not null and (new.manual_at, new.manual_by, new.manual_note) is distinct from (old.manual_at, old.manual_by, old.manual_note) then
    raise exception 'dinero_a_mano: ya se resolvió a mano (no se cambia)';
  end if;
  if new.manual_at is not null and old.manual_at is null then
    -- Una en camino (Stripe ya la intentó, o lleva 23 h sin que nadie la mande) o una que Stripe rechazó; nunca una hecha.
    if old.status = 'done' then raise exception 'dinero_a_mano: ya está hecha en Stripe'; end if;
    if new.manual_by is null or new.manual_note is null then raise exception 'dinero_a_mano: falta quién y la nota'; end if;
    if old.status = 'pending' and old.attempts < 1 and coalesce(old.sent_at, old.created_at) > now() - interval '23 hours' then
      raise exception 'dinero_a_mano: primero Stripe tiene que haberla intentado (o pasar 23 h sin que nadie la mande)';
    end if;
  end if;
  if old.manual_at is not null and new.status <> old.status then raise exception 'dinero_a_mano: resuelta a mano, ya no se reintenta'; end if;
  return new;
end $$;
drop trigger if exists gateway_refunds_a_mano on gateway_refunds;
create trigger gateway_refunds_a_mano before update on gateway_refunds for each row execute function gateway_refunds_a_mano();

-- ── El simulador del sandbox: buscar por el dato (como Stripe lista las devoluciones de un cobro y las reversiones de una transferencia) ──
create index if not exists sim_refunds_tl_idx on sim_refunds ((metadata->>'tl_intencion')) where metadata ? 'tl_intencion';
create index if not exists sim_transfer_reversals_tl_idx on sim_transfer_reversals ((metadata->>'tl_intencion')) where metadata ? 'tl_intencion';

commit;
