-- Semilla de pruebas · 8g · El boleto en Apple Wallet. SOLO SANDBOX (decisión I). NUMERACIÓN: el plan la llamaba 0047_pases.sql y así queda (la
-- migración sí cambió: 0129 en vez de 0131; anotado en el plan y en REVISION).
-- Para que Super Admin › Eventos › el boleto › WALLET y Sistema › Integraciones › Wallet se vean con algo:
--   · Un pase de Apple VIVO para el primer boleto de Yokasta (+1 570 555 0201) de «Jueves de Bachata en Vivo» (semilla 0036).
--   · Una cortesía de prueba para Yokasta en ese mismo evento con su pase de Apple, que luego se ANULA por la vía de verdad (el boleto pasa a
--     «void» y el trigger de 0129 anula su pase y lo anota en pass_log).
-- Los tokens del servicio web de estos pases son al azar (solo su huella): ningún teléfono los puede usar; los pases de verdad los emite el
-- servidor (lib/pases/pases.ts). Sin teléfonos registrados. Todo is_test. Idempotente: cada cosa se reconoce por su client_key o su boleto.
-- Base nueva sin equipo (CI) o con la fecha pasada: no siembra nada.
begin;

do $$
declare
  e record; d record; yok users; t1 bigint; op bigint; t2 bigint; tt bigint;
  serie text;
begin
  select * into yok from users where phone = '+15705550201';
  select ev.* into e from events ev where ev.business_id = 'la-terraza-night' and ev.title->>'es' = 'Jueves de Bachata en Vivo' order by ev.id limit 1;
  if yok.id is null or e.id is null or e.status <> 'live' then return; end if;
  select * into d from event_dates where event_id = e.id and status = 'scheduled' and ends_at > now() order by starts_at limit 1;
  if d.id is null then return; end if;

  -- 1 · El pase vivo del primer boleto de Yokasta (orden de la semilla 0036).
  select t.id into t1 from tickets t join operations o on o.id = t.operation_id
   where o.client_key = '6c000000-0000-4000-8000-000000000001' and t.holder_user_id = yok.id and t.status = 'valid' and t.event_date_id = d.id order by t.id limit 1;
  if t1 is not null and not exists (select 1 from ticket_passes where ticket_id = t1 and platform = 'apple') then
    select string_agg(substr('ABCDEFGHIJKLMNOPQRSTUVWXYZ234567', 1 + floor(random() * 32)::int, 1), '') into serie from generate_series(1, 26);
    insert into ticket_passes (ticket_id, city_id, platform, serial, auth_token_hash, pass_type_id, issued_to)
    values (t1, d.city_id, 'apple', serie, encode(sha256(convert_to('semilla-8g-' || gen_random_uuid()::text, 'UTF8')), 'hex'), 'pass.com.tolatino.boletos', yok.id);
    insert into pass_log (pass_id, city_id, action, detail) select id, city_id, 'emitido', 'apple · semilla 8g' from ticket_passes where ticket_id = t1 and platform = 'apple';
  end if;

  -- 2 · Una cortesía de prueba con su pase, anulada por la vía de verdad.
  if not exists (select 1 from operations where client_key = '8a000000-0000-4000-8000-000000000047') then
    select id into tt from ticket_types where event_id = e.id order by id limit 1;
    if tt is null then return; end if;
    insert into operations (number, kind, city_id, business_id, user_id, status, details, subtotal_cents, total_cents, pay_mode, confirmed_at, client_key, is_test)
    values ('B-' || nextval('ticket_order_seq'), 'tickets', e.city_id, e.business_id, yok.id, 'confirmed', jsonb_build_object('event_id', e.id::text, 'event_date_id', d.id::text), 0, 0, 'none', now(),
            '8a000000-0000-4000-8000-000000000047', true)
    returning id into op;
    insert into tickets (event_date_id, event_id, city_id, ticket_type_id, operation_id, holder_user_id, admits, kind, price_cents, fee_cents, comp_name, comp_by)
    values (d.id, e.id, d.city_id, tt, op, yok.id, 1, 'comp', 0, 0, 'Semilla Wallet', (select owner_user_id from businesses where id = e.business_id))
    returning id into t2;
    insert into ticket_log (ticket_id, operation_id, city_id, kind, by_kind, reason) values (t2, op, d.city_id, 'cortesia', 'system', 'Semilla 8g: para ver un pase anulado');
    select string_agg(substr('ABCDEFGHIJKLMNOPQRSTUVWXYZ234567', 1 + floor(random() * 32)::int, 1), '') into serie from generate_series(1, 26);
    insert into ticket_passes (ticket_id, city_id, platform, serial, auth_token_hash, pass_type_id, issued_to)
    values (t2, d.city_id, 'apple', serie, encode(sha256(convert_to('semilla-8g-' || gen_random_uuid()::text, 'UTF8')), 'hex'), 'pass.com.tolatino.boletos', yok.id);
    insert into pass_log (pass_id, city_id, action, detail) select id, city_id, 'emitido', 'apple · semilla 8g' from ticket_passes where ticket_id = t2;
    -- La vía de verdad: el boleto se anula y el trigger de 0129 anula su pase (pase_tocar) y lo anota.
    update tickets set status = 'void', void_reason = 'Semilla 8g: cortesía anulada para ver un pase anulado' where id = t2;
    insert into ticket_log (ticket_id, operation_id, city_id, kind, by_kind, reason) values (t2, op, d.city_id, 'anulado', 'system', 'Semilla 8g');
  end if;
end $$;

commit;
