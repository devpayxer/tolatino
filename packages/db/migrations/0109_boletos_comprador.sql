-- 0109 · boletos_comprador (6d · docs/diseno/plan/fase6-eventos.md §2 0109, §3 y §4 6d). Después de comprar: transferir, cancelar,
-- cortesías, lista de espera y ayuda con la orden B-.
-- · ticket_transfers: transferir un boleto a otro teléfono (o la entrega de una cortesía). El enlace lleva un token de un uso: la base
--   solo guarda su huella (sha256) y el teléfono va cifrado + su huella (HMAC). Solo lo recibe la cuenta con ESE teléfono, nunca quien
--   lo manda (trigger). Mientras está pendiente el QR del boleto ya cambió de versión (el anterior queda anulado) y nadie tiene uno
--   vigente; al recibirlo, el original queda «replaced» y nace otro boleto a nombre de quien lo recibe. Vence a inicio − bol_transferir_h.
-- · Cortesías: tickets.kind 'comp' con comp_name, comp_phone_enc, comp_by; sin dinero (check: precio, comisión y descuento en 0) y solo
--   en una orden sin cobro (pay_mode 'none'); cuentan en la existencia (la toman con el mismo update condicional que la venta).
-- · Devoluciones de boletos: refunds.initiated_by suma 'buyer'; una devolución nace 'pending' (los boletos ya quedaron devueltos) y pasa a
--   'done' cuando Stripe (o el simulador) la hace; el barrido reintenta las pendientes con la MISMA llave. La base no deja que lo pendiente
--   + lo hecho pase de lo cobrado (trigger con la fila del pago bloqueada). ticket_refund_lines: qué boleto (o extra) devolvió cada
--   devolución, cuánto y cuánto cargo se quedó To'Latino; único por boleto y por línea: nada se devuelve dos veces. Solo inserción.
-- · Existencias: al pasar un boleto a 'refunded' (o una cortesía a 'void') la base suelta su lugar (sold_n − 1) en ticket_stock / table_stock.
-- · waitlist: la lista de espera de una fecha (en orden de llegada: created_at no cambia); una oferta = un apartado (ticket_holds con
--   waitlist_id) a nombre de esa persona por espera_oferta_min; vence → la siguiente.
-- · sim_refunds: el simulador de pagos devuelve una sola vez por llave (como Stripe con Idempotency-Key).
-- · phone_messages: el SMS a un teléfono que todavía no tiene cuenta (boleto transferido o cortesía): cifrado + huella, nunca en claro.
-- · help_requests: motivos de «Un problema con el pago» (B-). Plantillas bol_* y espera_*; claves bol_* / espera_* / evt_cortesias_max.
-- Idempotente: if not exists, checks que se reemplazan, funciones y triggers que se recrean, catálogos on conflict. Nada se borra.
begin;

-- ── Cortesías en tickets ──
alter table tickets add column if not exists comp_name text check (char_length(comp_name) between 2 and 40);
alter table tickets add column if not exists comp_phone_enc bytea;
alter table tickets add column if not exists comp_by uuid references users (id);
alter table tickets drop constraint if exists tickets_cortesia_sin_dinero;
alter table tickets add constraint tickets_cortesia_sin_dinero check (kind <> 'comp' or (price_cents = 0 and fee_cents = 0 and discount_cents = 0));
alter table tickets drop constraint if exists tickets_cortesia_nombre;
alter table tickets add constraint tickets_cortesia_nombre check ((kind = 'comp') = (comp_name is not null));
create index if not exists tickets_cortesias_idx on tickets (event_date_id) where kind = 'comp';

-- tickets_antes (0108) + lo de 6d: lo de una cortesía tampoco cambia; el dueño de un boleto no cambia (se transfiere: nace otro), salvo
-- una cortesía sin dueño que alguien recibe o una cuenta borrada (queda sin persona, D5); una cortesía nunca se devuelve (se anula);
-- una cortesía solo en una orden sin cobro y un boleto pagado solo en una orden cobrada en la app.
create or replace function tickets_antes() returns trigger language plpgsql as $$
declare d event_dates; pm text;
begin
  if tg_op = 'DELETE' then raise exception 'un boleto no se borra: se anula o se devuelve (estados)'; end if;
  if tg_op = 'INSERT' then
    if new.code is null or new.code = '' then new.code := bol_codigo(); end if;
    select * into d from event_dates where id = new.event_date_id;
    if not found then raise exception 'esa fecha no existe'; end if;
    select pay_mode into pm from operations where id = new.operation_id;
    if new.kind = 'comp' and pm is distinct from 'none' then raise exception 'cortesia_sin_dinero: una cortesía va en una orden sin cobro'; end if;
    if new.kind = 'paid' and pm is distinct from 'app' then raise exception 'un boleto pagado va en una orden cobrada en la app'; end if;
    new.event_id := d.event_id; new.city_id := d.city_id; new.status := 'valid'; new.qr_ver := 1; new.replaced_by := null; new.void_reason := null;
    new.created_at := now(); new.updated_at := now();
    return new;
  end if;
  if (new.code, new.event_id, new.event_date_id, new.city_id, new.ticket_type_id, new.table_id, new.operation_id, new.admits, new.kind, new.price_cents, new.fee_cents, new.discount_cents, new.created_at, new.valid_days,
      new.comp_name, new.comp_phone_enc, new.comp_by)
     is distinct from (old.code, old.event_id, old.event_date_id, old.city_id, old.ticket_type_id, old.table_id, old.operation_id, old.admits, old.kind, old.price_cents, old.fee_cents, old.discount_cents, old.created_at, old.valid_days,
      old.comp_name, old.comp_phone_enc, old.comp_by) then
    raise exception 'lo comprado en un boleto no cambia';
  end if;
  if old.holder_user_id is not null and new.holder_user_id is not null and new.holder_user_id <> old.holder_user_id then
    raise exception 'el dueño de un boleto no cambia: se transfiere (nace otro boleto)';
  end if;
  if new.status is distinct from old.status then
    if old.status in ('void', 'refunded', 'replaced') then raise exception 'un boleto anulado, devuelto o reemplazado no vuelve'; end if;
    if old.status = 'used' and new.status not in ('refunded', 'void') then raise exception 'un boleto usado solo se devuelve o se anula'; end if;
    if new.status = 'refunded' and old.kind = 'comp' then raise exception 'cortesia_sin_dinero: una cortesía no se devuelve, se anula'; end if;
  end if;
  if new.qr_ver < old.qr_ver then raise exception 'la versión del QR solo sube'; end if;
  new.updated_at := now();
  return new;
end $$;

-- La existencia vuelve cuando un boleto se devuelve (o una cortesía se anula). La anulación por cobro fallido (0108) ya la suelta su
-- propio código: no pasa por aquí (es 'void' de un boleto pagado).
create or replace function tickets_libera() returns trigger language plpgsql as $$
begin
  if old.status in ('valid', 'used') and (new.status = 'refunded' or (new.status = 'void' and new.kind = 'comp')) then
    if new.ticket_type_id is not null then
      update ticket_stock set sold_n = sold_n - 1, updated_at = now() where ticket_type_id = new.ticket_type_id and event_date_id = new.event_date_id and sold_n >= 1;
    else
      update table_stock set sold_n = sold_n - 1, updated_at = now() where table_id = new.table_id and event_date_id = new.event_date_id and sold_n >= 1;
    end if;
  end if;
  return null;
end $$;
drop trigger if exists tickets_libera on tickets;
create trigger tickets_libera after update of status on tickets for each row execute function tickets_libera();

alter table ticket_log drop constraint if exists ticket_log_kind_check;
alter table ticket_log add constraint ticket_log_kind_check check (kind in ('emitido', 'reenviado', 'reemitido', 'anulado', 'cobro_fallido',
  'transfer_enviado', 'transfer_cancelado', 'transfer_vencido', 'transferido', 'recibido', 'cancelado', 'devuelto', 'cortesia', 'cortesia_recibida', 'nombre'));

-- ── Transferencias (y la entrega de una cortesía por SMS) ──
create table if not exists ticket_transfers (
  id            bigint generated always as identity primary key,
  kind          text not null default 'transfer' check (kind in ('transfer', 'comp')),
  ticket_id     bigint not null references tickets (id),
  operation_id  bigint not null references operations (id),
  event_date_id bigint not null references event_dates (id),
  city_id       text not null references cities (id),
  from_user_id  uuid not null references users (id),        -- quien lo manda (en una cortesía, quien la dio)
  to_phone_enc  bytea not null,
  to_phone_hash text not null check (to_phone_hash ~ '^[a-f0-9]{64}$'),
  to_last2      text not null check (to_last2 ~ '^[0-9]{2}$'),  -- lo único que ve quien lo manda («••23»)
  claim_hash    text not null unique check (claim_hash ~ '^[a-f0-9]{64}$'),
  status        text not null default 'pending' check (status in ('pending', 'claimed', 'cancelled', 'expired')),
  new_ticket_id bigint references tickets (id),
  claimed_by    uuid references users (id),
  expires_at    timestamptz not null,
  created_at    timestamptz not null default now(),
  claimed_at    timestamptz,
  ended_at      timestamptz,
  check ((status = 'claimed') = (new_ticket_id is not null and claimed_by is not null)),
  check (claimed_by is null or claimed_by <> from_user_id)
);
create unique index if not exists ticket_transfers_vivo_idx on ticket_transfers (ticket_id) where status = 'pending';
create index if not exists ticket_transfers_de_idx on ticket_transfers (from_user_id, created_at desc);
create index if not exists ticket_transfers_vencen_idx on ticket_transfers (expires_at) where status = 'pending';
create index if not exists ticket_transfers_fecha_idx on ticket_transfers (event_date_id, status);
create or replace function ticket_transfers_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'una transferencia no se borra (estados)'; end if;
  if tg_op = 'INSERT' then
    new.status := 'pending'; new.new_ticket_id := null; new.claimed_by := null; new.claimed_at := null; new.ended_at := null; new.created_at := now();
    return new;
  end if;
  if (new.kind, new.ticket_id, new.operation_id, new.event_date_id, new.city_id, new.from_user_id, new.to_phone_enc, new.to_phone_hash, new.to_last2, new.claim_hash, new.expires_at, new.created_at)
     is distinct from (old.kind, old.ticket_id, old.operation_id, old.event_date_id, old.city_id, old.from_user_id, old.to_phone_enc, old.to_phone_hash, old.to_last2, old.claim_hash, old.expires_at, old.created_at) then
    raise exception 'de una transferencia solo cambia su estado';
  end if;
  if new.status is distinct from old.status and old.status <> 'pending' then raise exception 'esa transferencia ya terminó'; end if;
  if new.status = 'claimed' and old.status = 'pending' and old.expires_at <= now() then raise exception 'esa transferencia ya venció'; end if;
  return new;
end $$;
drop trigger if exists ticket_transfers_antes on ticket_transfers;
create trigger ticket_transfers_antes before insert or update or delete on ticket_transfers for each row execute function ticket_transfers_antes();

-- ¿Este boleto entra ahora? Válido y sin una transferencia pendiente (mientras se transfiere, nadie tiene el QR vigente). La puerta (6g/6h)
-- y Buscar boleto del Super Admin preguntan esto.
create or replace function bol_vigente(tid bigint) returns boolean language sql stable as $$
  select exists (select 1 from tickets t where t.id = tid and t.status = 'valid' and not exists (select 1 from ticket_transfers x where x.ticket_id = t.id and x.status = 'pending' and x.kind = 'transfer'))
$$;

-- ── Devoluciones de boletos ──
alter table refunds drop constraint if exists refunds_initiated_by_check;
alter table refunds add constraint refunds_initiated_by_check check (initiated_by in ('business', 'admin', 'policy', 'event_cancelled', 'buyer'));
alter table refunds add column if not exists attempts smallint not null default 0 check (attempts between 0 and 10000);
alter table refunds add column if not exists last_error text check (char_length(last_error) <= 120);
alter table refunds add column if not exists done_at timestamptz;
create index if not exists refunds_pendientes_idx on refunds (created_at) where status = 'pending';
-- Lo pendiente + lo hecho de un pago nunca pasa de lo cobrado. Solo para lo que nace pendiente (las devoluciones de boletos); las que
-- nacen 'done' (devolverPago, que primero devuelve en Stripe) ya pasaron por el tope de Stripe.
create or replace function refunds_tope() returns trigger language plpgsql as $$
declare p payments; ya int;
begin
  if new.status <> 'pending' then return new; end if;
  select * into p from payments where id = new.payment_id for update;
  if not found then raise exception 'ese cobro no existe'; end if;
  if p.status not in ('captured', 'partially_refunded') then raise exception 'devolucion_sin_cobro: solo se devuelve lo que ya se cobró'; end if;
  select coalesce(sum(amount_cents), 0) into ya from refunds where payment_id = new.payment_id and status in ('pending', 'done');
  if ya + new.amount_cents > p.amount_cents then raise exception 'devolucion_de_mas: % + % pasa de lo cobrado (%)', ya, new.amount_cents, p.amount_cents; end if;
  return new;
end $$;
drop trigger if exists refunds_tope on refunds;
create trigger refunds_tope before insert on refunds for each row execute function refunds_tope();

create table if not exists ticket_refund_lines (
  id             bigint generated always as identity primary key,
  refund_id      bigint not null references refunds (id),
  operation_id   bigint not null references operations (id),
  ticket_id      bigint references tickets (id),
  line_id        bigint references operation_lines (id),          -- un extra de la orden
  city_id        text not null references cities (id),
  amount_cents   integer not null check (amount_cents >= 0),      -- lo que vuelve a la tarjeta por este boleto o extra
  fee_kept_cents integer not null default 0 check (fee_kept_cents >= 0), -- el cargo de servicio que se queda To'Latino (cancela el comprador)
  fee_waived_cents integer not null default 0 check (fee_waived_cents >= 0), -- la comisión que To'Latino deja de cobrar (devuelve el organizador)
  created_at     timestamptz not null default now(),
  check ((ticket_id is null) <> (line_id is null))
);
create unique index if not exists ticket_refund_lines_boleto_idx on ticket_refund_lines (ticket_id) where ticket_id is not null;
create unique index if not exists ticket_refund_lines_linea_idx on ticket_refund_lines (line_id) where line_id is not null;
create index if not exists ticket_refund_lines_orden_idx on ticket_refund_lines (operation_id);
create or replace function ticket_refund_lines_inmutable() returns trigger language plpgsql as $$
begin raise exception 'ticket_refund_lines es solo de inserción'; end $$;
drop trigger if exists ticket_refund_lines_no_cambia on ticket_refund_lines;
create trigger ticket_refund_lines_no_cambia before update or delete on ticket_refund_lines for each row execute function ticket_refund_lines_inmutable();
-- Una cortesía nunca entra a una devolución.
create or replace function ticket_refund_lines_antes() returns trigger language plpgsql as $$
begin
  if new.ticket_id is not null and exists (select 1 from tickets where id = new.ticket_id and kind = 'comp') then raise exception 'cortesia_sin_dinero: una cortesía no se devuelve'; end if;
  return new;
end $$;
drop trigger if exists ticket_refund_lines_antes on ticket_refund_lines;
create trigger ticket_refund_lines_antes before insert on ticket_refund_lines for each row execute function ticket_refund_lines_antes();

-- El simulador de pagos devuelve una sola vez por llave (como Stripe con Idempotency-Key).
create table if not exists sim_refunds (
  id             text primary key,
  payment_intent text not null,
  amount_cents   integer not null check (amount_cents > 0),
  created_at     timestamptz not null default now()
);

-- ── Lista de espera ──
create table if not exists waitlist (
  id               bigint generated always as identity primary key,
  event_date_id    bigint not null references event_dates (id),
  event_id         bigint not null references events (id),
  city_id          text not null references cities (id),
  user_id          uuid not null references users (id),
  party            smallint not null check (party between 1 and 20),
  status           text not null default 'waiting' check (status in ('waiting', 'offered', 'converted', 'left', 'expired')),
  hold_id          uuid references ticket_holds (id),
  offered_at       timestamptz,
  offer_expires_at timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (status <> 'offered' or (hold_id is not null and offer_expires_at is not null))
);
create unique index if not exists waitlist_vivo_idx on waitlist (event_date_id, user_id) where status in ('waiting', 'offered');
create index if not exists waitlist_fila_idx on waitlist (event_date_id, created_at, id) where status = 'waiting';
create index if not exists waitlist_ofertas_idx on waitlist (offer_expires_at) where status = 'offered';
create index if not exists waitlist_persona_idx on waitlist (user_id, created_at desc);
create or replace function waitlist_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'la lista de espera no se borra (estados)'; end if;
  if tg_op = 'INSERT' then new.status := 'waiting'; new.hold_id := null; new.offered_at := null; new.offer_expires_at := null; new.created_at := now(); new.updated_at := now(); return new; end if;
  -- El lugar en la fila es la hora en que se anotó: nadie lo cambia.
  if (new.event_date_id, new.event_id, new.city_id, new.user_id, new.party, new.created_at) is distinct from (old.event_date_id, old.event_id, old.city_id, old.user_id, old.party, old.created_at) then
    raise exception 'el lugar en la lista de espera no cambia';
  end if;
  if new.status is distinct from old.status then
    if old.status in ('converted', 'left', 'expired') then raise exception 'ese lugar en la lista ya terminó'; end if;
    if old.status = 'waiting' and new.status not in ('offered', 'left') then raise exception 'de la fila solo se pasa a una oferta o se sale'; end if;
    if old.status = 'offered' and new.status not in ('converted', 'expired', 'left') then raise exception 'una oferta se compra, vence o se suelta'; end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists waitlist_antes on waitlist;
create trigger waitlist_antes before insert or update or delete on waitlist for each row execute function waitlist_antes();
alter table ticket_holds add column if not exists waitlist_id bigint references waitlist (id);
create index if not exists ticket_holds_espera_idx on ticket_holds (waitlist_id) where waitlist_id is not null;

-- ── SMS a un teléfono sin cuenta (boleto transferido o cortesía) ──
create table if not exists phone_messages (
  id         bigint generated always as identity primary key,
  phone_enc  bytea not null,
  phone_hash text not null check (phone_hash ~ '^[a-f0-9]{64}$'),
  city_id    text references cities (id),
  tpl        text not null references notif_templates (key),
  body       text not null check (char_length(body) <= 480),
  ref_kind   text,
  ref_id     text,
  sms_status text not null check (sms_status in ('pruebas', 'pendiente', 'enviado', 'fallo', 'silencio', 'sin_proveedor')),
  sms_at     timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists phone_messages_tel_idx on phone_messages (phone_hash, created_at desc);

-- ── Ayuda con la orden de boletos (B-): «Un problema con el pago» ──
alter table help_requests drop constraint if exists help_requests_reason_check;
alter table help_requests add constraint help_requests_reason_check check (reason = any (array['falta', 'equivocado', 'frio', 'danado', 'tarde', 'nollego', 'pago', 'otro',
  'cobro', 'quien', 'quedo', 'espera', 'dep', 'win', 'more', 'bad', 'dmg', 'who', 'igual', 'dano', 'piezas', 'seguro', 'noseg', 'interp', 'trato', 'ley', 'nohizo', 'fecha',
  'contesta', 'peso', 'falto', 'fresco', 'sust', 'caja', 'apa', 'talla', 'cambio', 'nocomo', 'inseguro', 'equipaje', 'cover', 'lista', 'mesa', 'minimo',
  'cert', 'horario', 'ensena', 'lic', 'cuidado', 'salir', 'equipo',
  'idioma', 'ver', 'mudar', 'fotos', 'precio', 'titulo',
  'doble', 'monto', 'sinbol']));

-- ── Avisos (SMS solo lo crítico: el boleto que te mandan, la cortesía y el lugar de la lista de espera, §6 #7) ──
insert into notif_templates (key, grp, pref, sms, title, body) values
  ('bol_transfer_in', 'tx', null, true, '{"es":"Te mandaron un boleto","en":"Someone sent you a ticket"}',
    '{"es":"{de} te mandó {cuantos} para {evento} ({cuando}). Recíbelo en To''Latino: {enlace}","en":"{de} sent you {cuantos} for {evento} ({cuando}). Get it on To''Latino: {enlace}"}'),
  ('bol_transfer_ok', 'tx', null, false, '{"es":"Ya recibieron tu boleto","en":"Your ticket was received"}',
    '{"es":"{codigo} · {evento}: ya lo recibieron. Tu QR anterior quedó anulado.","en":"{codigo} · {evento}: it was received. Your old QR is void."}'),
  ('bol_transfer_vuelve', 'tx', null, false, '{"es":"Tu boleto volvió a ti","en":"Your ticket came back to you"}',
    '{"es":"Nadie recibió {codigo} · {evento} a tiempo. Vuelve a ser tuyo con un QR nuevo.","en":"Nobody got {codigo} · {evento} in time. It is yours again with a new QR."}'),
  ('bol_cortesia', 'tx', null, true, '{"es":"Tienes una cortesía","en":"You have a comp ticket"}',
    '{"es":"{negocio} te dio {cuantos} de cortesía para {evento} ({cuando}). Recíbela en To''Latino: {enlace}","en":"{negocio} gave you {cuantos} as a comp for {evento} ({cuando}). Get it on To''Latino: {enlace}"}'),
  ('espera_lugar', 'tx', null, true, '{"es":"Se liberó un lugar","en":"A spot opened up"}',
    '{"es":"Se liberó un lugar para {evento} ({cuando}). Lo guardamos {min} min a tu nombre: págalo aquí {enlace}","en":"A spot opened up for {evento} ({cuando}). We hold it {min} min in your name: pay here {enlace}"}'),
  ('espera_vence', 'tx', null, false, '{"es":"Tu turno venció","en":"Your turn expired"}',
    '{"es":"{evento}: no se pagó a tiempo y el lugar pasó a la siguiente persona. Puedes anotarte otra vez.","en":"{evento}: it was not paid in time and the spot went to the next person. You can join again."}'),
  ('bol_cancelado', 'tx', null, false, '{"es":"Cancelaste tus boletos","en":"You cancelled your tickets"}',
    '{"es":"{evento}: cancelaste {cuantos}. Te devolvemos {monto} a tu tarjeta (3–5 días hábiles). El cargo de servicio no se devuelve.","en":"{evento}: you cancelled {cuantos}. We refund {monto} to your card (3–5 business days). The service fee is not refunded."}'),
  ('bol_devuelto', 'tx', null, false, '{"es":"Te devolvieron tus boletos","en":"Your tickets were refunded"}',
    '{"es":"{negocio} te devolvió {monto} de {evento} ({cuantos}). Llega a tu tarjeta en 3–5 días hábiles. Esos boletos ya no entran.","en":"{negocio} refunded you {monto} for {evento} ({cuantos}). It reaches your card in 3–5 business days. Those tickets no longer get in."}'),
  ('evt_devolucion', 'biz', null, false, '{"es":"Volvieron boletos a la venta","en":"Tickets went back on sale"}',
    '{"es":"{evento}: {cuantos} de la orden {num} se cancelaron y volvieron a la venta (o a la lista de espera).","en":"{evento}: {cuantos} from order {num} were cancelled and went back on sale (or to the waitlist)."}')
on conflict (key) do nothing;

-- ── Configuración › Eventos ──
insert into config_keys (key, min, max, def, unit, section, label, help, editable, bloqueo, edit_in, sort) values
  ('bol_transferir_h', 1, 48, 2, '{"es":"h","en":"h"}', 'eventos', '{"es":"Transferir hasta antes del evento","en":"Transfer up to before the event"}',
    '{"es":"Hasta cuántas horas antes de empezar se puede transferir un boleto o cambiar su nombre. Después, el boleto se queda con quien lo tiene.","en":"Up to how many hours before the start a ticket can be transferred or its name changed. After that, the ticket stays with whoever has it."}', true, null, null, 91),
  ('bol_cancelar_h', 2, 168, 24, '{"es":"h","en":"h"}', 'eventos', '{"es":"Cancelar con devolución hasta antes del evento","en":"Cancel with refund up to before the event"}',
    '{"es":"Hasta cuántas horas antes de empezar el comprador cancela y se le devuelve lo pagado menos el cargo de servicio. Después solo transfiere.","en":"Up to how many hours before the start the buyer cancels and gets back what they paid minus the service fee. After that they can only transfer."}', true, null, null, 92),
  ('espera_oferta_min', 10, 120, 30, '{"es":"min","en":"min"}', 'eventos', '{"es":"Tiempo para pagar un lugar de la lista de espera","en":"Time to pay a waitlist spot"}',
    '{"es":"Cuando se libera un lugar, la siguiente persona de la lista lo tiene guardado este tiempo; si no paga, pasa a la siguiente.","en":"When a spot opens up, the next person on the list has it held this long; if they do not pay, it goes to the next."}', true, null, null, 93),
  ('evt_cortesias_max', 0, 500, 50, '{"es":"entradas","en":"entries"}', 'eventos', '{"es":"Cortesías por fecha","en":"Comps per date"}',
    '{"es":"Lo más que un organizador regala en una fecha. Las cortesías cuentan en el aforo y nunca se venden.","en":"The most an organizer gives away for one date. Comps count toward capacity and are never sold."}', true, null, null, 94),
  ('bol_transferencias_dia_max', 1, 50, 10, '{"es":"transferencias","en":"transfers"}', 'eventos', '{"es":"Transferencias al día por persona","en":"Transfers per day per person"}',
    '{"es":"Contra la reventa y el envío masivo de SMS. Cada transferencia manda un SMS.","en":"Against reselling and mass texting. Each transfer sends a text."}', true, null, null, 95)
on conflict (key) do update set min = excluded.min, max = excluded.max, def = excluded.def, unit = excluded.unit, section = excluded.section, label = excluded.label,
  help = excluded.help, editable = excluded.editable, bloqueo = excluded.bloqueo, edit_in = excluded.edit_in, sort = excluded.sort;

commit;
