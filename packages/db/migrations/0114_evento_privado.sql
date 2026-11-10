-- 0114 · evento_privado (6i · docs/diseno/plan/fase6-eventos.md §2 0114, §4 6i, §6 #9). Diseño: To'Latino Evento privado.dc.html + evp-flow.js
-- (APP-NEG-EVENTO-PRIVADO). «Evento privado» = la solicitud de un grupo grande a un restaurante (no un evento con invitación).
-- Patrón seguido: la mudanza de 4y-2 (lib/envios.ts aceptarPrecio: propuesta versionada que vence, el cliente acepta LA VERSIÓN exacta, se
-- retiene y se cobra en la misma pasada con destino a la cuenta del negocio, como el resto de la app) + cancelar / devolver de Fiestas (4v) y
-- Noche (4nc) (plazo de cancelar gratis; el negocio cancela = devolución completa).
-- · private_event_settings: el interruptor del panel y sus reglas (personas mín. y máx., días de anticipación, % de depósito, áreas,
--   «Todo el local» con su cargo, menús con precio por persona o «que me propongan», extras con precio, «sin cargo» o «lo cotizan»).
-- · La solicitud es una operación 'private_event' con número EP-4101… (secuencia private_event_seq; el prefijo no choca con ningún otro:
--   C, M, A, F, V, N, I, D, B, R, P, Q, E, T, S, L… son de una letra y EP- no empieza por «E-»).
-- · private_event_quotes (SOLO INSERCIÓN): cada propuesta del negocio es una versión nueva (quote = su fecha · alt = otra fecha · change =
--   un cambio de un evento ya confirmado). La app manda las líneas (cantidad × precio unitario), lo incluido, la nota, la fecha, la duración
--   y las personas; LA BASE calcula cada línea, el subtotal, el impuesto de la ciudad (tax_rules NEG-FOOD), el total, el depósito (el % de
--   los ajustes del negocio en ese momento; en un cambio, el depósito ya pagado, sin cobro nuevo), el plazo para cancelar gratis
--   (evp_cancelar_h en ese momento: queda en el acuerdo) y hasta cuándo vale (evp_propuesta_h, nunca después del evento).
--   El estado NO se guarda: sale de la vista private_event_quotes_ef (aceptada · reemplazada · vencida · cerrada · enviada).
-- · private_event_acceptances (SOLO INSERCIÓN): aceptar una versión. La base revisa que sea la última versión de esa solicitud, que no
--   haya vencido y que la solicitud esté en el estado que corresponde; una sola aceptación con depósito por solicitud (índice único).
-- · private_event_asks (SOLO INSERCIÓN): lo que pide el cliente: «Pedir un cambio» a una propuesta (counter) o a un evento confirmado
--   (change); la nota también va a Mensajes con el contexto de la solicitud.
-- · Comisión 'evp' (fee_rules, Super Admin › Planes) e impuesto de Comida por ciudad (tax_rules NEG-FOOD 6 %, PA; validar con el contador).
-- · Claves evp_* (Configuración › Eventos) y plantillas evp_* (SMS solo: evp_nueva al negocio, evp_propuesta, evp_ok y
--   evp_cancelado_negocio al cliente; guardián avisoEventoSmsSoloCritico).
-- Idempotente: if not exists, funciones y triggers que se recrean, catálogos on conflict. Nada se borra.
begin;

-- ── Configuración ──
insert into config_keys (key, min, max, def, unit, section, label, help, editable, bloqueo, edit_in, sort) values
  ('evp_deposito_pct', 10, 50, 25, '{"es":"%","en":"%"}', 'eventos', '{"es":"Depósito de un evento privado (de fábrica)","en":"Private event deposit (default)"}',
    '{"es":"Porcentaje del total que se cobra al aceptar la propuesta, con el que empieza un restaurante que enciende Evento privado. Cada restaurante lo cambia en su panel entre 10 % y 50 %.","en":"Percent of the total charged when the proposal is accepted, the starting value for a restaurant that turns on Private event. Each restaurant changes it in its dashboard between 10% and 50%."}', true, null, null, 130),
  ('evp_cancelar_h', 24, 336, 72, '{"es":"h","en":"h"}', 'eventos', '{"es":"Cancelar gratis un evento privado","en":"Free private event cancellation"}',
    '{"es":"Hasta cuántas horas antes del evento el cliente cancela y se le devuelve el depósito completo. Después, el depósito se queda con el restaurante. Queda escrito en cada propuesta al mandarla.","en":"Up to how many hours before the event the client can cancel and get the full deposit back. After that, the restaurant keeps the deposit. It is written into each proposal when sent."}', true, null, null, 131),
  ('evp_responder_h', 2, 72, 24, '{"es":"h","en":"h"}', 'eventos', '{"es":"El restaurante responde en","en":"The restaurant replies within"}',
    '{"es":"Horas que tiene el restaurante para mandar su propuesta, otra fecha o «No puedo». Sin respuesta, la solicitud vence sola (no se cobró nada).","en":"Hours the restaurant has to send its proposal, another date or “I can’t”. Without a reply, the request expires on its own (nothing was charged)."}', true, null, null, 132),
  ('evp_propuesta_h', 2, 72, 24, '{"es":"h","en":"h"}', 'eventos', '{"es":"Una propuesta vale","en":"A proposal is valid for"}',
    '{"es":"Horas que el cliente tiene para aceptar una propuesta. Después vence y ya no se puede pagar.","en":"Hours the client has to accept a proposal. After that it expires and can no longer be paid."}', true, null, null, 133),
  ('evp_anticipacion_dias', 1, 30, 3, '{"es":"días","en":"days"}', 'eventos', '{"es":"Anticipación mínima de un evento privado","en":"Private event minimum notice"}',
    '{"es":"Con cuántos días o más se pide un evento privado (para que preparen la comida). El restaurante puede pedir más, nunca menos.","en":"How many days ahead, at least, a private event is requested (so they can prepare the food). The restaurant can ask for more, never less."}', true, null, null, 134),
  ('evp_dias_adelante', 30, 365, 180, '{"es":"días","en":"days"}', 'eventos', '{"es":"Hasta cuándo se pide un evento privado","en":"How far ahead a private event can be requested"}',
    '{"es":"Hasta cuántos días adelante se puede pedir.","en":"How many days ahead it can be requested."}', true, null, null, 135),
  ('evp_pendientes_max', 1, 10, 3, '{"es":"solicitudes","en":"requests"}', 'eventos', '{"es":"Solicitudes de evento privado abiertas por persona","en":"Open private event requests per person"}',
    '{"es":"Cuántas solicitudes puede tener una persona esperando respuesta o propuesta a la vez (evita acaparar fechas).","en":"How many requests a person can have waiting for a reply or a proposal at once (prevents hoarding dates)."}', true, null, null, 136),
  ('evp_propuestas_max', 2, 30, 10, '{"es":"propuestas","en":"proposals"}', 'eventos', '{"es":"Propuestas por solicitud","en":"Proposals per request"}',
    '{"es":"Cuántas versiones de propuesta (contando cambios) puede mandar un restaurante para una misma solicitud.","en":"How many proposal versions (including changes) a restaurant can send for one request."}', true, null, null, 137),
  ('evp_cambios_max', 1, 10, 3, '{"es":"pedidos","en":"asks"}', 'eventos', '{"es":"«Pedir un cambio» por solicitud","en":"“Ask for a change” per request"}',
    '{"es":"Cuántas veces el cliente puede pedir un cambio en una misma solicitud (a una propuesta o a un evento confirmado).","en":"How many times the client can ask for a change on one request (to a proposal or to a confirmed event)."}', true, null, null, 138)
on conflict (key) do update set min = excluded.min, max = excluded.max, def = excluded.def, unit = excluded.unit, section = excluded.section, label = excluded.label,
  help = excluded.help, editable = excluded.editable, bloqueo = excluded.bloqueo, edit_in = excluded.edit_in, sort = excluded.sort;

-- ── Comisión del depósito (Super Admin › Planes) e impuesto de Comida por ciudad ──
alter table fee_rules drop constraint if exists fee_rules_kind_check;
alter table fee_rules add constraint fee_rules_kind_check check (kind = any (array['ped', 'cita', 'bol', 'apt', 'rsv', 'plan', 'renta', 'merc', 'fiesta', 'viaje', 'noche', 'insc', 'evp']));
insert into fee_rules (kind, rate_bp, fixed_cents, effective_from, reason)
select 'evp', 800, 0, '2026-01-01', 'Comisión inicial del depósito de un evento privado (igual que la de Fiestas; Super Admin › Planes)'
 where not exists (select 1 from fee_rules where kind = 'evp');
insert into tax_rules (city_id, category_id, parts_bp, labor_bp)
  select c.id, 'NEG-FOOD', 600, 0 from cities c where not exists (select 1 from tax_rules t where t.city_id = c.id and t.category_id = 'NEG-FOOD');

create sequence if not exists private_event_seq start 4101;

-- ── El interruptor del panel y sus reglas ──
create table if not exists private_event_settings (
  business_id text primary key references businesses(id),
  city_id text not null references cities(id),
  is_on boolean not null default false,
  min_party smallint not null default 9 check (min_party between 2 and 200),
  capacity smallint not null default 40 check (capacity between 2 and 500),
  lead_days smallint not null default 3 check (lead_days between 1 and 60),
  deposit_pct smallint not null default 25 check (deposit_pct between 10 and 50),
  areas text[] not null default array['salon']::text[] check (areas <@ array['salon', 'terraza', 'barra']::text[] and cardinality(areas) between 1 and 3),
  whole_cents integer check (whole_cents between 0 and 1000000),           -- «Todo el local»: null = no se ofrece; 0 = sin cargo
  menus jsonb not null default '[]'::jsonb check (jsonb_typeof(menus) = 'array' and jsonb_array_length(menus) <= 8),
  extras jsonb not null default '[]'::jsonb check (jsonb_typeof(extras) = 'array' and jsonb_array_length(extras) <= 10),
  reply_h smallint not null default 2 check (reply_h between 1 and 24),     -- «suele responder en N h» (solo lo que se muestra)
  updated_by uuid references users(id),
  updated_at timestamptz not null default now(),
  check (capacity >= min_party)
);
create or replace function evp_ajustes_ok(m jsonb, e jsonb) returns boolean language sql immutable as $$
  select coalesce((select bool_and(jsonb_typeof(x) = 'object' and (x->>'k') ~ '^[a-z0-9]{2,12}$' and char_length(coalesce(x->>'es', '')) between 2 and 60 and char_length(coalesce(x->>'en', '')) <= 60
                                  and char_length(coalesce(x->>'des', '')) <= 120 and char_length(coalesce(x->>'desEn', '')) <= 120
                                  and (x->'cents' is null or jsonb_typeof(x->'cents') = 'null' or ((x->>'cents') ~ '^\d{1,6}$' and (x->>'cents')::int <= 100000)))
                     from jsonb_array_elements(m) x), true)
     and coalesce((select bool_and(jsonb_typeof(x) = 'object' and (x->>'k') ~ '^[a-z0-9]{2,12}$' and char_length(coalesce(x->>'es', '')) between 2 and 60 and char_length(coalesce(x->>'en', '')) <= 60
                                  and (x->'cents' is null or jsonb_typeof(x->'cents') = 'null' or ((x->>'cents') ~ '^\d{1,6}$' and (x->>'cents')::int <= 500000)))
                     from jsonb_array_elements(e) x), true)
$$;
alter table private_event_settings drop constraint if exists private_event_settings_listas;
alter table private_event_settings add constraint private_event_settings_listas check (evp_ajustes_ok(menus, extras));

-- ── Índices de las solicitudes ──
create index if not exists operations_evp_idx on operations (business_id, status, scheduled_at) where kind = 'private_event';
create index if not exists operations_evp_cliente_idx on operations (user_id, sent_at desc) where kind = 'private_event';

-- ── Las propuestas (solo inserción; la base calcula el dinero) ──
create table if not exists private_event_quotes (
  id bigint generated always as identity primary key,
  operation_id bigint not null references operations(id),
  business_id text not null references businesses(id),
  city_id text not null references cities(id),
  version smallint not null check (version between 1 and 30),
  kind text not null check (kind in ('quote', 'alt', 'change')),
  starts_at timestamptz not null,
  duration_min smallint not null check (duration_min between 60 and 600),
  party_size smallint not null check (party_size between 2 and 500),
  lines jsonb not null check (jsonb_typeof(lines) = 'array' and jsonb_array_length(lines) between 1 and 20),
  includes jsonb not null default '{"es":"","en":""}'::jsonb,
  note text check (char_length(note) <= 300),
  subtotal_cents integer not null check (subtotal_cents >= 0),
  tax_bp integer not null check (tax_bp between 0 and 2000),
  tax_cents integer not null check (tax_cents >= 0),
  total_cents integer not null check (total_cents between 100 and 10000000),
  deposit_pct smallint not null check (deposit_pct between 0 and 100),
  deposit_cents integer not null check (deposit_cents >= 0),
  cancel_h smallint not null check (cancel_h between 0 and 336),
  valid_until timestamptz not null,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  unique (operation_id, version),
  check (total_cents = subtotal_cents + tax_cents),
  check (deposit_cents <= total_cents)
);
create index if not exists private_event_quotes_op_idx on private_event_quotes (operation_id, version desc);

create or replace function private_event_quotes_antes() returns trigger language plpgsql as $$
declare o record; l jsonb; q int; u int; sub bigint := 0; ls jsonb := '[]'::jsonb; bp int; paid int; pct int; ph int; pp int;
begin
  if tg_op <> 'INSERT' then raise exception 'private_event_quotes es solo de inserción'; end if;
  select id, kind, business_id, city_id, status, status_detail into o from operations where id = new.operation_id for update;
  if o.id is null or o.kind <> 'private_event' then raise exception 'evp: la propuesta es de una solicitud de evento privado'; end if;
  new.business_id := o.business_id; new.city_id := o.city_id;
  if new.kind in ('quote', 'alt') and o.status not in ('pending', 'change_proposed') then raise exception 'evp: esta solicitud ya no recibe propuestas'; end if;
  if new.kind = 'change' and not (o.status = 'confirmed' and o.status_detail in ('change_req', 'change_quote')) then raise exception 'evp: un cambio solo responde a un cambio pedido'; end if;
  if new.starts_at <= now() then raise exception 'evp: la fecha ya pasó'; end if;
  new.version := coalesce((select max(version) from private_event_quotes where operation_id = new.operation_id), 0) + 1;
  if new.version > cfg_int('evp_propuestas_max') then raise exception 'evp: ya mandaste el máximo de propuestas'; end if;
  -- Cada línea: cantidad × precio unitario; lo calcula la base (nunca un total escrito).
  for l in select x from jsonb_array_elements(new.lines) x loop
    q := case when (l->>'q') ~ '^\d{1,3}$' then (l->>'q')::int else -1 end;
    u := case when (l->>'unit') ~ '^\d{1,7}$' then (l->>'unit')::int else -1 end;
    if q < 1 or q > 500 or u < 0 or u > 1000000 then raise exception 'evp: línea con cantidad o precio fuera de rango'; end if;
    if char_length(coalesce(l->'l'->>'es', '')) not between 2 and 80 or char_length(coalesce(l->'l'->>'en', '')) > 80 then raise exception 'evp: cada línea lleva su nombre'; end if;
    sub := sub + q::bigint * u;
    ls := ls || jsonb_build_object('l', jsonb_build_object('es', l->'l'->>'es', 'en', coalesce(nullif(l->'l'->>'en', ''), l->'l'->>'es')), 'q', q, 'unit', u, 'cents', q * u,
                                   'k', case when (l->>'k') ~ '^[a-z0-9_]{1,16}$' then l->>'k' else 'otro' end);
  end loop;
  if sub > 9000000 then raise exception 'evp: el total pasa del máximo'; end if;
  new.lines := ls;
  new.subtotal_cents := sub;
  bp := coalesce((select t.parts_bp from tax_rules t where t.city_id = o.city_id and t.category_id = 'NEG-FOOD' and t.effective_from <= now() order by t.effective_from desc, t.id desc limit 1), 0);
  new.tax_bp := bp;
  new.tax_cents := round(sub * bp / 10000.0);
  new.total_cents := new.subtotal_cents + new.tax_cents;
  new.valid_until := least(now() + make_interval(hours => cfg_int('evp_propuesta_h')), new.starts_at);
  if new.kind = 'change' then
    -- Un cambio de un evento confirmado: el depósito es el que ya se pagó (no se cobra otra vez) y el plazo de cancelar es el acordado.
    select q2.cancel_h, q2.deposit_pct into ph, pp from private_event_acceptances a join private_event_quotes q2 on q2.id = a.quote_id
     where a.operation_id = new.operation_id order by a.id desc limit 1;
    paid := coalesce((select p.amount_cents from payments p where p.operation_id = new.operation_id and p.kind = 'deposit' and p.status in ('captured', 'partially_refunded', 'held') limit 1), 0);
    if new.total_cents < paid then raise exception 'evp: el nuevo total no puede ser menor que el depósito ya pagado'; end if;
    new.deposit_pct := coalesce(pp, 0); new.deposit_cents := paid; new.cancel_h := coalesce(ph, cfg_int('evp_cancelar_h'));
  else
    select deposit_pct into pct from private_event_settings where business_id = o.business_id;
    new.deposit_pct := coalesce(pct, cfg_int('evp_deposito_pct'));
    new.deposit_cents := greatest(100, round(new.total_cents * new.deposit_pct / 100.0));
    if new.deposit_cents > new.total_cents then new.deposit_cents := new.total_cents; end if;
    new.cancel_h := cfg_int('evp_cancelar_h');
  end if;
  new.created_at := now();
  return new;
end $$;
drop trigger if exists private_event_quotes_antes on private_event_quotes;
create trigger private_event_quotes_antes before insert or update or delete on private_event_quotes for each row execute function private_event_quotes_antes();

-- ── Aceptar una versión (solo inserción; la base revisa última versión, vigencia y estado) ──
create table if not exists private_event_acceptances (
  id bigint generated always as identity primary key,
  quote_id bigint not null unique references private_event_quotes(id),
  operation_id bigint not null references operations(id),
  kind text not null check (kind in ('quote', 'alt', 'change')),
  user_id uuid not null references users(id),
  ip text check (char_length(ip) <= 64),
  payment_id bigint references payments(id),
  created_at timestamptz not null default now()
);
-- Una sola aceptación con depósito por solicitud (un pago por solicitud aunque llegue dos veces).
create unique index if not exists private_event_acceptances_deposito_uq on private_event_acceptances (operation_id) where kind <> 'change';

create or replace function private_event_acceptances_antes() returns trigger language plpgsql as $$
declare q record; o record; ultima int;
begin
  if tg_op <> 'INSERT' then raise exception 'private_event_acceptances es solo de inserción'; end if;
  select id, operation_id, kind, version, valid_until into q from private_event_quotes where id = new.quote_id;
  if q.id is null or q.operation_id <> new.operation_id then raise exception 'evp: esa propuesta no es de esta solicitud'; end if;
  select status, status_detail, user_id into o from operations where id = new.operation_id;
  if o.user_id <> new.user_id then raise exception 'evp: solo acepta quien pidió'; end if;
  ultima := (select max(version) from private_event_quotes where operation_id = new.operation_id);
  if q.version <> ultima then raise exception 'evp: esa propuesta ya fue reemplazada'; end if;
  if q.valid_until <= now() then raise exception 'evp: esa propuesta ya venció'; end if;
  if q.kind in ('quote', 'alt') and o.status <> 'change_proposed' then raise exception 'evp: esta solicitud ya cambió'; end if;
  if q.kind = 'change' and not (o.status = 'confirmed' and o.status_detail = 'change_quote') then raise exception 'evp: este cambio ya no está abierto'; end if;
  new.kind := q.kind; new.created_at := now();
  return new;
end $$;
drop trigger if exists private_event_acceptances_antes on private_event_acceptances;
create trigger private_event_acceptances_antes before insert or update or delete on private_event_acceptances for each row execute function private_event_acceptances_antes();

-- ── Lo que pide el cliente (solo inserción) ──
create table if not exists private_event_asks (
  id bigint generated always as identity primary key,
  operation_id bigint not null references operations(id),
  kind text not null check (kind in ('counter', 'change')),
  party_size smallint check (party_size between 2 and 500),
  starts_at timestamptz,
  note text not null check (char_length(note) between 4 and 300),
  user_id uuid not null references users(id),
  created_at timestamptz not null default now()
);
create index if not exists private_event_asks_op_idx on private_event_asks (operation_id, id desc);
create or replace function private_event_asks_antes() returns trigger language plpgsql as $$
begin
  if tg_op <> 'INSERT' then raise exception 'private_event_asks es solo de inserción'; end if;
  if (select count(*) from private_event_asks where operation_id = new.operation_id) >= cfg_int('evp_cambios_max') then raise exception 'evp: ya pediste el máximo de cambios'; end if;
  new.created_at := now();
  return new;
end $$;
drop trigger if exists private_event_asks_antes on private_event_asks;
create trigger private_event_asks_antes before insert or update or delete on private_event_asks for each row execute function private_event_asks_antes();

-- ── El estado de cada propuesta: derivado, nunca guardado ──
create or replace view private_event_quotes_ef as
  select q.*,
         case when a.id is not null then 'accepted'
              when exists (select 1 from private_event_quotes n where n.operation_id = q.operation_id and n.version > q.version) then 'superseded'
              when q.valid_until <= now() then 'expired'
              when o.status in ('declined', 'expired', 'cancelled', 'done') then 'closed'
              when q.kind = 'change' and o.status_detail is distinct from 'change_quote' then 'closed'
              else 'sent' end as status,
         a.created_at as accepted_at
    from private_event_quotes q join operations o on o.id = q.operation_id left join private_event_acceptances a on a.quote_id = q.id;

-- ── Avisos ── (SMS solo lo crítico: la solicitud nueva al negocio, la propuesta, la confirmación y la cancelación del negocio)
insert into notif_templates (key, grp, pref, sms, title, body) values
  ('evp_nueva', 'biz', null, true, '{"es":"Te piden un evento privado","en":"Private event requested"}', '{"es":"{cliente} pide un evento privado: {personas} personas, {dia} a las {hora}. Manda tu propuesta en {horas} h; si no, vence.","en":"{cliente} requests a private event: {personas} guests, {dia} at {hora}. Send your proposal within {horas} h; otherwise it expires."}'),
  ('evp_propuesta', 'tx', 'cit', true, '{"es":"Te mandaron su propuesta","en":"Proposal received"}', '{"es":"{negocio} te mandó su propuesta para tu evento del {dia}: total {total}, depósito {dep}. Vale {horas} h.","en":"{negocio} sent its proposal for your event on {dia}: total {total}, deposit {dep}. Valid {horas} h."}'),
  ('evp_otra_fecha', 'tx', 'cit', false, '{"es":"Te proponen otra fecha","en":"Another date proposed"}', '{"es":"{negocio} no puede el día que pediste y te propone el {dia} a las {hora}: total {total}. Vale {horas} h.","en":"{negocio} cannot do the day you asked and proposes {dia} at {hora}: total {total}. Valid {horas} h."}'),
  ('evp_no', 'tx', 'cit', false, '{"es":"No pudieron","en":"They could not"}', '{"es":"{negocio} no puede tu evento privado del {dia}: {motivo}. No se cobró nada.","en":"{negocio} cannot do your private event on {dia}: {motivo}. Nothing was charged."}'),
  ('evp_vence', 'tx', 'cit', false, '{"es":"Tu solicitud venció","en":"Your request expired"}', '{"es":"{que} Tu evento privado con {negocio} del {dia} no siguió. No se cobró nada.","en":"{que} Your private event with {negocio} on {dia} did not go ahead. Nothing was charged."}'),
  ('evp_ok', 'tx', 'cit', true, '{"es":"Tu evento está confirmado","en":"Your event is confirmed"}', '{"es":"Confirmado con {negocio}: {dia} a las {hora}. Depósito cobrado: {dep}. Resta {resto}: lo pagas en el local.","en":"Confirmed with {negocio}: {dia} at {hora}. Deposit charged: {dep}. {resto} left: you pay it there."}'),
  ('evp_cancelado', 'tx', 'cit', false, '{"es":"Cancelaste tu evento","en":"You cancelled your event"}', '{"es":"Cancelaste tu evento privado del {dia} con {negocio}.{dev}","en":"You cancelled your private event on {dia} with {negocio}.{dev}"}'),
  ('evp_cancelado_negocio', 'tx', 'cit', true, '{"es":"Cancelaron tu evento","en":"Your event was cancelled"}', '{"es":"{negocio} canceló tu evento privado del {dia}: {motivo}. Te devolvemos el depósito completo ({dep}).","en":"{negocio} cancelled your private event on {dia}: {motivo}. Your full deposit ({dep}) is refunded."}'),
  ('evp_cambio', 'tx', 'cit', false, '{"es":"Te responden tu cambio","en":"Reply to your change"}', '{"es":"{negocio} te manda el cambio de tu evento: {dia} a las {hora}, {personas} personas, total {total}. No se cobra nada más ahora.","en":"{negocio} sends the change to your event: {dia} at {hora}, {personas} guests, total {total}. Nothing more is charged now."}'),
  ('evp_cambio_no', 'tx', 'cit', false, '{"es":"No pueden hacer el cambio","en":"They cannot make the change"}', '{"es":"{negocio} no puede hacer el cambio: {motivo}. Tu evento sigue como lo acordaron.","en":"{negocio} cannot make the change: {motivo}. Your event stays as agreed."}'),
  ('evp_recordatorio', 'tx', 'cit', false, '{"es":"Tu evento es mañana","en":"Your event is tomorrow"}', '{"es":"Tu evento privado con {negocio} es {dia} a las {hora}. Resta {resto}: lo pagas en el local.","en":"Your private event with {negocio} is {dia} at {hora}. {resto} left: you pay it there."}'),
  ('evp_done', 'tx', 'cit', false, '{"es":"¿Cómo estuvo tu evento?","en":"How was your event?"}', '{"es":"Pasó tu evento con {negocio}. Cuéntale a los vecinos cómo te fue.","en":"Your event with {negocio} is over. Tell your neighbors how it went."}'),
  ('evp_biz_ok', 'biz', null, false, '{"es":"Aceptaron tu propuesta","en":"Proposal accepted"}', '{"es":"{cliente} aceptó tu propuesta: {dia} a las {hora}, {personas} personas. Depósito cobrado: {dep}.","en":"{cliente} accepted your proposal: {dia} at {hora}, {personas} guests. Deposit charged: {dep}."}'),
  ('evp_biz_pide', 'biz', null, false, '{"es":"Te piden un cambio","en":"Change requested"}', '{"es":"{cliente} pide un cambio a su evento privado del {dia}. Míralo y responde.","en":"{cliente} asks for a change to their private event on {dia}. Check it and reply."}'),
  ('evp_biz_no', 'biz', null, false, '{"es":"No aceptaron tu propuesta","en":"Proposal declined"}', '{"es":"{cliente} dijo «No, gracias» a tu propuesta del {dia}.","en":"{cliente} said “No, thanks” to your proposal for {dia}."}'),
  ('evp_biz_vence', 'biz', null, false, '{"es":"Venció un evento privado","en":"A private event expired"}', '{"es":"{que} La solicitud de {cliente} del {dia} venció.","en":"{que} The request from {cliente} for {dia} expired."}'),
  ('evp_biz_cx', 'biz', null, false, '{"es":"Cancelaron un evento privado","en":"Private event cancelled"}', '{"es":"{cliente} canceló el evento privado del {dia}.{dep}","en":"{cliente} cancelled the private event on {dia}.{dep}"}'),
  ('evp_biz_cambio_ok', 'biz', null, false, '{"es":"Aceptaron el cambio","en":"Change accepted"}', '{"es":"{cliente} aceptó el cambio: {dia} a las {hora}, {personas} personas.","en":"{cliente} accepted the change: {dia} at {hora}, {personas} guests."}'),
  ('evp_biz_cambio_no', 'biz', null, false, '{"es":"No aceptaron el cambio","en":"Change declined"}', '{"es":"{cliente} prefirió seguir como estaba: {dia} a las {hora}.","en":"{cliente} kept it as it was: {dia} at {hora}."}'),
  ('evp_biz_recordatorio', 'biz', null, false, '{"es":"Mañana tienes un evento privado","en":"Private event tomorrow"}', '{"es":"Mañana: el evento privado de {cliente}, {dia} a las {hora}, {personas} personas.","en":"Tomorrow: {cliente}''s private event, {dia} at {hora}, {personas} guests."}')
on conflict (key) do update set grp = excluded.grp, pref = excluded.pref, sms = excluded.sms, title = excluded.title, body = excluded.body;

commit;
