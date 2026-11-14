-- 0148 · Fase 9 · 9n-4 — el dinero y los flujos que faltan (LAUNCH «→ 9n»: L339, L426, L437, L458, L487–L490, L501, L561, L1685, L1688, L1787).
-- Solo AMPLÍA: columnas nuevas, CHECK que se ensanchan sin pisar lo que haya agregado otro bloque (pg_temp.ampliar_check, como 0144), avisos y
-- claves de Configuración nuevas (on conflict do nothing). Idempotente: aplicarla dos veces no cambia nada.
--   · Ayuda con el pedido: reponer con un pedido nuevo de $0 (replacement_op_id, uno por solicitud).
--   · Ayuda con la visita (Auto y Hogar): la visita de garantía a $0 (warranty_op_id, una por solicitud).
--   · 4if «Me lo devolvieron» sin respuesta: desde cuándo espera (outside_pending_at, lo pone la base), el recordatorio (una vez) y el cierre solo
--     (outside_refund 'expired', closed_by 'system').
--   · Repartidor: «Ofrecer solo» (delivery_settings.auto_offer) y sus plazos en Configuración › Repartidor.
--   · Mercado: el OK por más se retiene como un cobro 'extra' (payments ya lo admite); lo que se cobra de un cobro nunca pasa lo retenido (CHECK).
--   · Avisos: el OK por más, el recordatorio de los 10 min, «no quiso pagar más», la reposición, los programados y «nadie tomó el pedido».
begin;

create or replace function pg_temp.ampliar_check(t regclass, nombre text, valores text[]) returns void language plpgsql as $$
declare d text; v text; nuevo text := '';
begin
  select pg_get_constraintdef(oid) into d from pg_constraint where conname = nombre and conrelid = t;
  if d is null then return; end if;
  foreach v in array valores loop
    if position(quote_literal(v) in d) = 0 then nuevo := nuevo || quote_literal(v) || '::text, '; end if;
  end loop;
  if nuevo = '' then return; end if;
  execute format('alter table %s drop constraint %I', t, nombre);
  execute format('alter table %s add constraint %I %s', t, nombre, replace(d, 'ARRAY[', 'ARRAY[' || nuevo));
end $$;

-- ════════════════════ AYUDA: REPONER, GARANTÍA Y «ME LO DEVOLVIERON» ════════════════════
alter table help_requests add column if not exists replacement_op_id bigint references operations (id);
alter table help_requests add column if not exists warranty_op_id bigint references operations (id);
alter table help_requests add column if not exists outside_pending_at timestamptz;
alter table help_requests add column if not exists outside_reminded_at timestamptz;
create unique index if not exists help_requests_repone_uno on help_requests (replacement_op_id) where replacement_op_id is not null;
create unique index if not exists help_requests_garantia_una on help_requests (warranty_op_id) where warranty_op_id is not null;
-- Lo que espera «Me lo devolvieron» (índice parcial: el barrido solo mira esas).
create index if not exists help_requests_devuelto_espera on help_requests (outside_pending_at) where status = 'answered' and outside_refund = 'pending';
do $$ begin
  perform pg_temp.ampliar_check('help_requests', 'help_requests_outside_refund_check', array['expired']);
  perform pg_temp.ampliar_check('help_requests', 'help_requests_closed_by_check', array['system']);
end $$;

-- Desde cuándo espera la confirmación: lo pone la base al pasar a 'pending' (ningún camino del código lo puede olvidar). Una reposición o una
-- garantía, una vez puestas, no se cambian ni se quitan (el pedido nuevo ya existe).
create or replace function help_requests_9n4() returns trigger language plpgsql as $$
begin
  if new.outside_refund = 'pending' and (tg_op = 'INSERT' or old.outside_refund is distinct from 'pending') then new.outside_pending_at := now(); end if;
  if tg_op = 'UPDATE' then
    if old.replacement_op_id is not null and new.replacement_op_id is distinct from old.replacement_op_id then raise exception 'help_requests: la reposición no se cambia'; end if;
    if old.warranty_op_id is not null and new.warranty_op_id is distinct from old.warranty_op_id then raise exception 'help_requests: la garantía no se cambia'; end if;
  end if;
  return new;
end $$;
drop trigger if exists help_requests_9n4 on help_requests;
create trigger help_requests_9n4 before insert or update on help_requests for each row execute function help_requests_9n4();
-- Las que ya esperaban antes de esta migración: cuentan desde su último cambio.
update help_requests set outside_pending_at = coalesce(updated_at, now()) where outside_refund = 'pending' and outside_pending_at is null;

-- ════════════════════ DINERO ════════════════════
-- Lo cobrado de un cobro nunca pasa lo retenido (el mercado cobra lo real de la retención y del OK por más; ningún camino puede cobrar más).
-- NOT VALID: vale para todo lo que se escriba desde aquí; lo viejo no se toca.
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'payments_cobro_hasta_lo_retenido' and conrelid = 'payments'::regclass) then
    alter table payments add constraint payments_cobro_hasta_lo_retenido check (held_cents is null or amount_cents <= held_cents) not valid;
  end if;
end $$;

-- ════════════════════ REPARTIDOR ════════════════════
alter table delivery_settings add column if not exists auto_offer boolean not null default false;

-- ════════════════════ CONFIGURACIÓN ════════════════════
insert into config_keys (key, min, max, def, unit, section, label, help, editable, bloqueo, edit_in, sort) values
  ('rep_auto_intentos', 1, 10, 3, '{"es":"ofertas","en":"offers"}', 'repartidor', '{"es":"Ofrecer solo · ofertas antes de avisar al negocio","en":"Auto-offer · offers before telling the business"}',
    '{"es":"Si nadie acepta tantas ofertas seguidas (o no hay nadie en línea), el negocio recibe un aviso y lo asigna él.","en":"If nobody accepts that many offers in a row (or nobody is online), the business is told and assigns it."}', true, null, null, 1004),
  ('rep_programado_min', 10, 120, 30, '{"es":"minutos","en":"minutes"}', 'repartidor', '{"es":"Pedido programado · se ofrece y se avisa antes de estar listo","en":"Scheduled order · offered and reminded before it is ready"}',
    '{"es":"A esa hora el negocio recibe el recordatorio y, con «Ofrecer solo», el pedido se ofrece a los repartidores en línea.","en":"At that time the business gets the reminder and, with auto-offer, the order is offered to online drivers."}', true, null, null, 1005),
  ('ayuda_devuelto_dias', 7, 60, 14, '{"es":"días","en":"days"}', 'fe_inm_autos', '{"es":"«Me lo devolvieron» · se cierra sola si nadie contesta en","en":"«They refunded me» · closes on its own if nobody answers within"}',
    '{"es":"A la mitad le llega un recordatorio a la persona. Al cerrarse, si no se lo devolvieron, lo pide en Soporte.","en":"Halfway, the person gets a reminder. Once closed, if they were not refunded, they ask Support."}', true, null, null, 900)
on conflict (key) do nothing;

-- ════════════════════ AVISOS ════════════════════
insert into notif_templates (key, grp, pref, sms, sms_mode, push, app, title, body) values
  ('merc_mas', 'tx', null, true, 'sin_push', true, 'cliente', '{"es":"Tu pedido pesó más","en":"Your order weighed more"}',
    '{"es":"Así lo pesaron: total real {monto}, {mas} más de lo retenido. Dinos si está bien o que corten menos.","en":"Here is the weight: real total {monto}, {mas} over the hold. Tell us if it is OK or to cut less."}'),
  ('merc_rec10', 'tx', null, true, 'sin_push', true, 'cliente', '{"es":"Tu pedido espera tu OK","en":"Your order is waiting for your OK"}',
    '{"es":"Tu pedido {num} de {negocio} ya está pesado{mas}. Toca «Está bien, cobrar» o, si no, se cobra lo real al recogerlo o entregarlo.","en":"Your order {num} from {negocio} is weighed{mas}. Tap «Looks good, charge» or the real total is charged at pickup or delivery."}'),
  ('biz_merc_mas_no', 'biz', null, true, 'sin_push', true, 'negocio', '{"es":"No quiere pagar más","en":"They do not want to pay more"}',
    '{"es":"{cliente} no quiere pagar más en el pedido {num}: corta menos y manda el peso otra vez.","en":"{cliente} does not want to pay more on order {num}: cut less and send the weight again."}'),
  ('help_devuelto_rec', 'tx', null, true, 'sin_push', true, 'cliente', '{"es":"¿Ya te lo devolvieron?","en":"Did they refund you?"}',
    '{"es":"Tu solicitud {num}: dinos si te lo devolvieron. Si no contestas en {dias} días, la cerramos.","en":"Your request {num}: tell us if you were refunded. If you do not answer within {dias} days, we close it."}'),
  ('help_devuelto_cierre', 'tx', null, false, 'nunca', true, 'cliente', '{"es":"Cerramos tu solicitud","en":"We closed your request"}',
    '{"es":"Cerramos tu solicitud {num}: pasaron {dias} días sin respuesta. Si no te lo devolvieron, escríbenos en Soporte.","en":"We closed your request {num}: {dias} days passed without an answer. If you were not refunded, write to us in Support."}'),
  ('pedido_repuesto', 'tx', null, true, 'sin_push', true, 'cliente', '{"es":"Te reponen tu pedido","en":"Your order is being replaced"}',
    '{"es":"{negocio} te repone sin costo lo del pedido #{de}: es el pedido #{num}, ya lo están preparando.","en":"{negocio} replaces order #{de} at no cost: it is order #{num}, already being prepared."}'),
  ('biz_programado', 'biz', null, false, 'nunca', true, 'negocio', '{"es":"Pedido programado","en":"Scheduled order"}',
    '{"es":"El pedido #{num} es para las {hora}: ya toca prepararlo.","en":"Order #{num} is for {hora}: time to prepare it."}'),
  ('drv_programado', 'biz', null, false, 'nunca', true, 'delivery', '{"es":"Pedido programado","en":"Scheduled order"}',
    '{"es":"El pedido #{num} de {negocio} es para las {hora}. Pasa a recogerlo a tiempo.","en":"Order #{num} from {negocio} is for {hora}. Pick it up on time."}'),
  ('biz_reparto_nadie', 'biz', null, true, 'sin_push', true, 'negocio', '{"es":"Nadie tomó el pedido","en":"Nobody took the order"}',
    '{"es":"Ningún repartidor tomó el pedido #{num}. Asígnalo a alguien o márcalo tú.","en":"No driver took order #{num}. Assign it or mark it yourself."}')
on conflict (key) do nothing;
update notif_templates set biz_pref = 'pedidos' where key in ('biz_merc_mas_no', 'biz_programado', 'biz_reparto_nadie') and biz_pref is null;

commit;
