-- 0150 · Fase 9 · 9n-6 — plazos editables (segunda parte). Como 0149: cada texto que ve la persona dice el valor de Sistema ›
-- Configuración (guardián plazoAbiertoSeLee), así que la clave se puede abrir sin que la pantalla diga otra cosa que la regla.
-- · evt_pago_dia (el día de pago de eventos) se abre: el panel (Eventos y Cobros), Liquidaciones y la ayuda dicen el día de la clave
--   (diaSemanaTxt de lib/plazo-txt.ts). pagos_banco_dia sigue fijo (martes, decisión del fundador) y compa_auto_espera_min, cerrado.
-- · Hogar y Auto (LAUNCH «4g-3 · Configuración en el Super Admin»): el pre-estimado (24 h), el presupuesto a hasta 3 (48 h), la
--   emergencia 24/7 (15 min) y el apartado de Auto y Hogar (48 h) entran al catálogo, sección nueva hogar_auto. El motor los lee al
--   enviar (lib/solicitudes.ts: respond_by; lib/apartados.ts: horasApartado) y cada solicitud o apartado guarda el suyo.
-- · free_ops_cap (el techo de Free: pedidos o citas en línea al mes) entra al catálogo en Dinero: ya vivía en platform_config (0023);
--   ahora se lee con cfg_int (acotado) y el Super Admin lo cambia con motivo. Mínimo 0 (Free sin nada en línea) y máximo 1000.
-- · Los avisos que decían el número: biz_pq («responde en 48 h» → {horas} / {hours}) y em_nadie («en 15 min» → {min}).
-- Idempotente: insert … on conflict do nothing; update … solo si todavía no cambió.
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

do $$ begin perform pg_temp.ampliar_check('config_keys', 'config_keys_section_check', array['hogar_auto']); end $$;

insert into config_keys (key, min, max, def, unit, section, label, help, editable, bloqueo, edit_in, sort) values
  ('sol_pre_h', 2, 72, 24, '{"es":"horas","en":"hours"}', 'hogar_auto', '{"es":"Pre-estimado con fotos · horas para responder","en":"Photo pre-estimate · hours to reply"}',
    '{"es":"Cuánto tiene el taller o el negocio de Hogar para mandar el rango. Si no responde, queda «Sin respuesta» y la persona lo manda otra vez. Cada solicitud guarda el plazo con que se envió.","en":"How long the shop or home business has to send the range. With no reply it shows «No reply» and the person can send it again. Each request keeps the limit it was sent with."}', true, null, null, 45),
  ('sol_pq_h', 12, 120, 48, '{"es":"horas","en":"hours"}', 'hogar_auto', '{"es":"Presupuesto a hasta 3 · horas para responder","en":"Quote from up to 3 · hours to reply"}',
    '{"es":"Cuánto tienen los negocios de Hogar para responder un presupuesto. Lo dicen la pantalla, el estado y el aviso al negocio.","en":"How long home businesses have to answer a quote request. The screen, the status and the business alert say it."}', true, null, null, 46),
  ('sol_em_min', 5, 60, 15, '{"es":"minutos","en":"minutes"}', 'hogar_auto', '{"es":"Emergencia 24/7 · minutos para que alguien acepte","en":"24/7 emergency · minutes for someone to accept"}',
    '{"es":"Si nadie la acepta en este tiempo, queda «Nadie disponible» y no se cobra nada. La línea del 911 siempre se ve.","en":"If nobody accepts within this time it shows «Nobody available» and nothing is charged. The 911 line always shows."}', true, null, null, 47),
  ('apartado_h', 12, 168, 48, '{"es":"horas","en":"hours"}', 'hogar_auto', '{"es":"Apartado en Auto y Hogar · horas que se guarda","en":"Auto and Home hold · hours it is kept"}',
    '{"es":"Desde la hora que la persona eligió para pasar. Las Tiendas eligen sus horas (24, 48 o 72) en su herramienta. Cada apartado guarda las horas con que se envió.","en":"From the time the person chose to come by. Stores pick their own hours (24, 48 or 72) in their tool. Each hold keeps the hours it was sent with."}', true, null, null, 48),
  ('free_ops_cap', 0, 1000, 10, '{"es":"pedidos o citas al mes","en":"orders or bookings a month"}', 'dinero', '{"es":"Plan Free · pedidos o citas en línea al mes","en":"Free plan · online orders or bookings a month"}',
    '{"es":"El techo de un negocio Free (pedidos, citas, reservas y solicitudes en línea, por mes de su ciudad). Al llegar, su página muestra Llamar. Lo dicen el panel y el Super Admin.","en":"The cap for a Free business (online orders, bookings, reservations and requests, per month in its city). Once reached, its page shows Call. The dashboard and Super Admin say it."}', true, null, null, 949)
on conflict (key) do nothing;

-- El día de pago de eventos se abre (los textos dicen el día de la clave).
update config_keys set editable = true, bloqueo = null,
       help = '{"es":"El organizador cobra este día de la semana después de cada fecha (1 = lunes … 7 = domingo; 2 = martes). Lo dicen el panel (Eventos y Cobros), Liquidaciones y la ayuda.","en":"The organizer is paid on this weekday after each date (1 = Monday … 7 = Sunday; 2 = Tuesday). The dashboard (Events and Payouts), Settlements and help say it."}'::jsonb
 where key = 'evt_pago_dia' and not editable;

-- Los avisos que decían el número de fábrica: ahora la variable que el código manda con el valor de Configuración. Solo si todavía lo dicen.
update notif_templates set body = replace(replace(body::text, 'responde en 48 h.', 'responde en {horas}.'), 'reply within 48 h.', 'reply within {hours}.')::jsonb
 where key = 'biz_pq' and body::text like '%responde en 48 h.%';
update notif_templates set body = replace(replace(body::text, 'tu emergencia en 15 min.', 'tu emergencia en {min} min.'), 'your emergency in 15 min.', 'your emergency in {min} min.')::jsonb
 where key = 'em_nadie' and body::text like '%tu emergencia en 15 min.%';

commit;
