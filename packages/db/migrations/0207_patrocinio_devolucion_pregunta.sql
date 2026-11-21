-- 0207 · Dinero, octava tanda (9t8, 21 nov; LAUNCH «Preguntarle a la pasarela, lo que quedó de 9t7» (1) y «Cobros fuera de sesión, lo que quedó de 9t4» (4)).
-- Idempotente. Nada se borra (estados); las consultas, las decisiones y la auditoría, solo inserción.
--
-- (1) La devolución de lo que no se usó de un patrocinio (negocios y eventos) era la única devolución sin intención propia: el patrocinio guardaba cuánto
--     (refund_cents, una vez) y el libro (sponsorship_payments 'devolucion') se escribía DESPUÉS del «sí» de Stripe; se mandaba sin dato buscable, pasadas 23 h
--     solo quedaba una alerta informativa y un «no» de Stripe se reintentaba con la misma llave hasta las 23 h (Stripe guarda la respuesta: nunca cambiaba).
--     Ahora es una intención como las de 0206 (sponsorship_refunds, una por patrocinio):
--       · la anota la BASE en la misma transacción que decide cuánto se devuelve (el trigger de refund_cents): nadie puede terminar un patrocinio con
--         devolución sin dejar su intención;
--       · que se manda (sent_at) y su dato buscable (gateway_ref = la metadata tl_intencion 'sponsorship_refunds:<id>') en una sentencia, antes de la pasarela,
--         y solo la primera vez;
--       · pasada la ventana de la llave (23 h) se le PREGUNTA a la pasarela; «nunca llegó» vuelve a valer con OTRA llave (key_from / key_n), una vez por ventana;
--       · «fallida» = un «no» de Stripe al mandarla, o la consulta que la halla fallida. No se reintenta sola: alerta al equipo de dinero, que la hace por
--         fuera y la resuelve a mano (la base lo deja sobre una fallida, nunca sobre una hecha).
--     Lo que ya estaba: las devueltas pasan como 'done' con su devolución de Stripe; las pendientes se dan por mandadas SIN el dato (nunca «no llegó») y con
--     su fecha de verdad (la del fin del patrocinio: la ventana de la llave no vuelve a abrirse). Sus alertas viejas (refund_stuck 'pat-dev-…', sin camino)
--     se cierran solas: las sigue la de la intención (refund_stuck 'sponsorship_refunds:<id>', con «Preguntar a Stripe ahora» y «Resolver a mano»).
-- (2) «Un día más» de una renta lleva la clave del toque (detail->>'toque'): el mismo toque repetido (la red se cortó con el día ya cobrado) nunca es otro día.
begin;

-- ── (1) La intención de la devolución de un patrocinio ──
create table if not exists sponsorship_refunds (
  id                bigint generated always as identity primary key,
  kind              text not null check (kind in ('negocio', 'evento')),
  ref_id            bigint not null,                                       -- el patrocinio (sponsorships o event_sponsorships, según kind)
  payment_id        bigint not null references sponsorship_payments (id),  -- el cobro que se devuelve (su PaymentIntent)
  business_id       text not null references businesses (id),
  city_id           text not null references cities (id),
  pi                text not null check (char_length(pi) between 3 and 200),
  amount_cents      integer not null check (amount_cents > 0),
  idem_key          text not null unique check (char_length(idem_key) between 8 and 200),
  status            text not null default 'pending' check (status in ('pending', 'done', 'failed')),
  attempts          smallint not null default 0 check (attempts between 0 and 10000),
  last_error        text check (char_length(last_error) <= 120),
  stripe_refund_id  text check (char_length(stripe_refund_id) <= 200),
  sent_at           timestamptz,
  gateway_ref       text check (gateway_ref ~ '^sponsorship_refunds:[0-9]{1,18}$'),
  key_from          timestamptz,
  key_n             smallint not null default 0 check (key_n between 0 and 100),
  manual_at         timestamptz,
  manual_by         uuid references users (id),
  manual_note       text check (char_length(manual_note) between 4 and 500),
  created_at        timestamptz not null default now(),
  done_at           timestamptz,
  unique (kind, ref_id),
  check (status <> 'done' or stripe_refund_id is not null)
);
create index if not exists sponsorship_refunds_camino_idx on sponsorship_refunds ((coalesce(key_from, created_at))) where status = 'pending' and manual_at is null;
create index if not exists sponsorship_refunds_city_idx on sponsorship_refunds (city_id, created_at);

-- Lo que ya estaba (antes del trigger de reglas, que no deja insertar algo que no empiece en camino). Con su fecha de verdad: la del fin del patrocinio.
drop trigger if exists sponsorship_refunds_reglas on sponsorship_refunds;
insert into sponsorship_refunds (kind, ref_id, payment_id, business_id, city_id, pi, amount_cents, idem_key, status, stripe_refund_id, sent_at, created_at, done_at)
select r.kind, r.ref_id, r.refund_of, r.business_id, r.city_id, r.pi, r.amount_cents, r.idem_key, 'done', r.refund_id, r.created_at, coalesce(s.ended_at, r.created_at), r.created_at
  from sponsorship_payments r
  left join lateral (select x.ended_at from sponsorships x where r.kind = 'negocio' and x.id = r.ref_id
                     union all select x.ended_at from event_sponsorships x where r.kind = 'evento' and x.id = r.ref_id) s on true
 where r.reason = 'devolucion'
on conflict do nothing;
insert into sponsorship_refunds (kind, ref_id, payment_id, business_id, city_id, pi, amount_cents, idem_key, status, sent_at, created_at)
select s.kind, s.id, p.id, s.business_id, s.city_id, p.pi, least(s.refund_cents, p.amount_cents), 'pat-dev-' || s.kind || '-' || s.id, 'pending', s.ended_at, s.ended_at
  from (select 'negocio'::text as kind, x.id, x.business_id, x.city_id, x.refund_cents, x.ended_at from sponsorships x where x.refund_cents is not null
        union all select 'evento', x.id, x.business_id, x.city_id, x.refund_cents, x.ended_at from event_sponsorships x where x.refund_cents is not null) s
  join lateral (select y.id, y.pi, y.amount_cents from sponsorship_payments y where y.kind = s.kind and y.ref_id = s.id and y.reason <> 'devolucion' order by y.id limit 1) p on true
 where not exists (select 1 from sponsorship_payments r where r.kind = s.kind and r.ref_id = s.id and r.reason = 'devolucion')
on conflict do nothing;

create or replace function sponsorship_refunds_reglas() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'pat_dev: una devolución no se borra (estados)'; end if;
  if tg_op = 'INSERT' then
    -- Siempre empieza en camino, sin mandar y sin nada de Stripe: lo demás lo anota quien la manda o la cierra.
    new.status := 'pending'; new.attempts := 0; new.last_error := null; new.stripe_refund_id := null; new.done_at := null; new.sent_at := null; new.gateway_ref := null;
    new.key_from := null; new.key_n := 0; new.manual_at := null; new.manual_by := null; new.manual_note := null; new.created_at := now();
    return new;
  end if;
  if (new.kind, new.ref_id, new.payment_id, new.business_id, new.city_id, new.pi, new.amount_cents, new.idem_key, new.created_at)
     is distinct from (old.kind, old.ref_id, old.payment_id, old.business_id, old.city_id, old.pi, old.amount_cents, old.idem_key, old.created_at) then
    raise exception 'pat_dev: lo decidido no cambia (patrocinio, cobro, monto, llave)';
  end if;
  if old.status <> 'pending' and new.status is distinct from old.status then raise exception 'pat_dev: de % no se pasa a %', old.status, new.status; end if;
  if old.status <> 'pending' and (new.attempts, new.last_error, new.stripe_refund_id, new.done_at, new.sent_at, new.gateway_ref, new.key_from, new.key_n)
     is distinct from (old.attempts, old.last_error, old.stripe_refund_id, old.done_at, old.sent_at, old.gateway_ref, old.key_from, old.key_n) then
    raise exception 'pat_dev: cerrada, ya no cambia';
  end if;
  -- El dato buscable se anota una vez, en camino, y es el de esta fila.
  if old.sent_at is not null and new.sent_at is distinct from old.sent_at then raise exception 'pat_dev: sent_at se anota una vez'; end if;
  if old.gateway_ref is not null and new.gateway_ref is distinct from old.gateway_ref then raise exception 'pat_dev: gateway_ref se anota una vez'; end if;
  if new.gateway_ref is not null and new.gateway_ref <> ('sponsorship_refunds:' || new.id) then raise exception 'pat_dev: gateway_ref es el de esta fila'; end if;
  -- La llave vuelve a valer una vez por veredicto: en camino, sin resolver a mano, ya mandada y pasadas 23 h (HORAS_LLAVE de lib/cobros) de la anterior.
  if (new.key_from, new.key_n) is distinct from (old.key_from, old.key_n) then
    if old.status <> 'pending' or old.manual_at is not null or old.sent_at is null or new.key_from is null or new.key_n <> old.key_n + 1
       or new.key_from < coalesce(old.key_from, old.created_at) + interval '23 hours' then
      raise exception 'pat_dev_llave: la llave vuelve a valer solo en camino, una vez y pasadas 23 h de la anterior';
    end if;
  end if;
  -- «Resolver a mano» (la devolución se hizo fuera de Stripe): una vez, con quién y la nota; sobre una en camino que Stripe ya intentó (o que lleva 23 h sin que
  -- nadie la mande) o sobre una que Stripe rechazó; nunca sobre una hecha. Después ya no cambia de estado.
  if old.manual_at is not null and (new.manual_at, new.manual_by, new.manual_note) is distinct from (old.manual_at, old.manual_by, old.manual_note) then
    raise exception 'dinero_a_mano: ya se resolvió a mano (no se cambia)';
  end if;
  if new.manual_at is not null and old.manual_at is null then
    if old.status = 'done' or new.status = 'done' then raise exception 'dinero_a_mano: ya está hecha en Stripe'; end if;
    if new.manual_by is null or new.manual_note is null then raise exception 'dinero_a_mano: falta quién y la nota'; end if;
    if old.status = 'pending' and old.attempts < 1 and coalesce(old.sent_at, old.created_at) > now() - interval '23 hours' then
      raise exception 'dinero_a_mano: primero Stripe tiene que haberla intentado (o pasar 23 h sin que nadie la mande)';
    end if;
  end if;
  if old.manual_at is not null and new.status <> old.status then raise exception 'dinero_a_mano: resuelta a mano, ya no se reintenta'; end if;
  return new;
end $$;
create trigger sponsorship_refunds_reglas before insert or update or delete on sponsorship_refunds for each row execute function sponsorship_refunds_reglas();

-- La intención nace en la MISMA transacción que decide cuánto se devuelve (refund_cents: una vez, al terminar; 0175), con el cobro de ese patrocinio. Sin cobro
-- (nada se pagó) no hay nada que devolver.
create or replace function sponsorship_refunds_anotar() returns trigger language plpgsql as $$
declare p record; k text := tg_argv[0];
begin
  if k not in ('negocio', 'evento') then raise exception 'pat_dev: tipo desconocido'; end if;
  select y.id, y.pi, y.amount_cents into p from sponsorship_payments y where y.kind = k and y.ref_id = new.id and y.reason <> 'devolucion' order by y.id limit 1;
  if p.id is not null then
    insert into sponsorship_refunds (kind, ref_id, payment_id, business_id, city_id, pi, amount_cents, idem_key)
    values (k, new.id, p.id, new.business_id, new.city_id, p.pi, least(new.refund_cents, p.amount_cents), 'pat-dev-' || k || '-' || new.id)
    on conflict do nothing;
  end if;
  return null;
end $$;
drop trigger if exists sponsorships_devolucion_anotar on sponsorships;
create trigger sponsorships_devolucion_anotar after update of refund_cents on sponsorships for each row
  when (old.refund_cents is null and new.refund_cents is not null) execute function sponsorship_refunds_anotar('negocio');
drop trigger if exists event_sponsorships_devolucion_anotar on event_sponsorships;
create trigger event_sponsorships_devolucion_anotar after update of refund_cents on event_sponsorships for each row
  when (old.refund_cents is null and new.refund_cents is not null) execute function sponsorship_refunds_anotar('evento');

-- La consulta a la pasarela y la decisión del equipo, también para esta intención (con varias en Stripe, solo «vale», como las demás devoluciones).
alter table gateway_checks drop constraint if exists gateway_checks_subject_kind_check;
alter table gateway_checks add constraint gateway_checks_subject_kind_check
  check (subject_kind in ('subscription_charges', 'offsession_charges', 'event_settlements', 'hold_renewals', 'gateway_refunds', 'refunds', 'event_settlement_reversals', 'sponsorship_refunds'));
alter table gateway_reviews drop constraint if exists gateway_reviews_subject_kind_check;
alter table gateway_reviews add constraint gateway_reviews_subject_kind_check
  check (subject_kind in ('subscription_charges', 'offsession_charges', 'event_settlements', 'hold_renewals', 'refunds', 'event_settlement_reversals', 'gateway_refunds', 'sponsorship_refunds'));
alter table gateway_reviews drop constraint if exists gateway_reviews_devolucion_solo_vale;
alter table gateway_reviews add constraint gateway_reviews_devolucion_solo_vale
  check (subject_kind not in ('refunds', 'event_settlement_reversals', 'gateway_refunds', 'sponsorship_refunds') or decision = 'vale');

-- Las alertas viejas de estas devoluciones (refund_stuck 'pat-dev-<tipo>-<id>', solo informativas): se cierran solas, una vez; las sigue la de su intención.
insert into money_alert_notes (alert_id, action, staff_id, note)
select a.id, 'resuelta_sola', null, 'Cerrada sola: esta devolución ya es una intención que se le pregunta a Stripe (alerta sponsorship_refunds:' || z.id || '). · Closed by itself: this refund is now an intent that asks Stripe (alert sponsorship_refunds:' || z.id || ').'
  from money_alerts a join sponsorship_refunds z on a.subject_id = 'pat-dev-' || z.kind || '-' || z.ref_id
 where a.kind = 'refund_stuck'
   and coalesce((select n.action from money_alert_notes n where n.alert_id = a.id order by n.at desc, n.id desc limit 1), '') not in ('resuelta_sola', 'resuelta', 'resuelta_a_mano');

-- ── (2) «Un día más» de una renta: un toque, un día (la clave del toque, una vez por renta) ──
create unique index if not exists offsession_charges_toque on offsession_charges (kind, ref_id, (detail->>'toque')) where detail ? 'toque';

commit;
