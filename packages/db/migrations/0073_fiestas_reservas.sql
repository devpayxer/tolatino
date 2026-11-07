-- 0073 · Fiestas: pedir la fecha con depósito, confirmar, otra hora, no puedo, vence, cancelar y «Pasó la fiesta» (Fase 4 · 4v).
-- Plan: docs/diseno/plan/fase4-fiestas-transporte.md §3 y §4v. Diseño: neg-fiesta-flow.js (APP-NEG-FIESTA-BOOKING → APP-NEG-FIESTA-CITA).
-- La fiesta es una operación `party` con número F-5101…; el depósito se RETIENE al enviar y se COBRA al confirmar (§3).
-- Confirmar ocupa el día en party_days (fila 'booking') en la misma transacción. Idempotente.
begin;

create sequence if not exists party_seq start 5101;

-- Una fila de calendario por fiesta confirmada (nunca dos para la misma fiesta).
create unique index if not exists party_days_reserva_uq on party_days (operation_id) where source = 'booking' and removed_at is null;
create index if not exists operations_fiesta_idx on operations (business_id, scheduled_at) where kind = 'party';
create index if not exists operations_fiesta_cliente_idx on operations (user_id, sent_at desc) where kind = 'party';

insert into notif_templates (key, grp, pref, sms, title, body) values
  ('biz_fiesta', 'biz', null, true, '{"es":"Te piden una fecha","en":"Date requested"}', '{"es":"{cliente} pide el {dia} ({servicio}, {invitados}). Responde en 24 h; si no, se le libera el depósito.","en":"{cliente} requests {dia} ({servicio}, {invitados}). Reply within 24 h; otherwise the deposit is released."}'),
  ('biz_fiesta_visita', 'biz', null, true, '{"es":"Te piden una visita","en":"Tour requested"}', '{"es":"{cliente} quiere visitar el {dia} a las {hora}. Responde en 24 h.","en":"{cliente} wants a tour on {dia} at {hora}. Reply within 24 h."}'),
  ('fiesta_ok', 'tx', 'cit', true, '{"es":"Fecha confirmada","en":"Date confirmed"}', '{"es":"{negocio} confirmó tu fecha: {dia} a las {hora}. La fecha es tuya.{dep}","en":"{negocio} confirmed your date: {dia} at {hora}. The date is yours.{dep}"}'),
  ('fiesta_visita_ok', 'tx', 'cit', true, '{"es":"Visita confirmada","en":"Tour confirmed"}', '{"es":"{negocio} confirmó tu visita: {dia} a las {hora}. La visita no aparta la fecha.","en":"{negocio} confirmed your tour: {dia} at {hora}. The tour does not hold the date."}'),
  ('fiesta_alt', 'tx', 'cit', true, '{"es":"Te proponen otra hora","en":"Another time proposed"}', '{"es":"{negocio}: el {dia} está libre, pero a las {alt}. Acéptala o no en la app; si no te sirve, se libera tu depósito.","en":"{negocio}: {dia} is free, but at {alt}. Accept it or not in the app; if it does not work, your deposit is released."}'),
  ('fiesta_no', 'tx', 'cit', true, '{"es":"No pudieron","en":"They could not"}', '{"es":"{negocio} no pudo tomar tu fecha del {dia}.{dev} Mira sus fechas libres en la app.","en":"{negocio} could not take your date on {dia}.{dev} See their free dates in the app."}'),
  ('fiesta_exp', 'tx', 'cit', true, '{"es":"Sin respuesta","en":"No reply"}', '{"es":"{negocio} no contestó en 24 h tu solicitud del {dia}.{dev}","en":"{negocio} did not reply within 24 h to your request for {dia}.{dev}"}'),
  ('fiesta_7d', 'tx', 'cit', true, '{"es":"Tu fiesta es en una semana","en":"Your party is in a week"}', '{"es":"Tu fiesta con {negocio} es el {dia} a las {hora}. Revisa el acuerdo en la app.","en":"Your party with {negocio} is on {dia} at {hora}. Check the agreement in the app."}'),
  ('fiesta_cx', 'tx', 'cit', false, '{"es":"Cancelaste tu fecha","en":"You cancelled your date"}', '{"es":"Cancelaste tu fecha del {dia} con {negocio}.{dev}","en":"You cancelled your date on {dia} with {negocio}.{dev}"}'),
  ('fiesta_biz_cx', 'tx', 'cit', true, '{"es":"Cancelaron tu fecha","en":"Your date was cancelled"}', '{"es":"{negocio} canceló tu fecha del {dia}: {motivo}. Te devolvemos el depósito completo.","en":"{negocio} cancelled your date on {dia}: {motivo}. Your deposit is refunded in full."}'),
  ('fiesta_done', 'tx', 'cit', false, '{"es":"¿Cómo estuvo tu fiesta?","en":"How was your party?"}', '{"es":"Pasó tu fiesta con {negocio}. Cuéntale a los vecinos cómo te fue.","en":"Your party with {negocio} is over. Tell your neighbors how it went."}'),
  ('biz_fiesta_alt_ok', 'biz', null, false, '{"es":"Aceptaron la otra hora","en":"New time accepted"}', '{"es":"{cliente} aceptó la otra hora: {dia} a las {hora}. La fecha queda confirmada.","en":"{cliente} accepted the new time: {dia} at {hora}. The date is confirmed."}'),
  ('biz_fiesta_alt_no', 'biz', null, false, '{"es":"No le sirvió la otra hora","en":"New time declined"}', '{"es":"A {cliente} no le sirvió la otra hora del {dia}. Se le liberó el depósito.","en":"The new time on {dia} did not work for {cliente}. The deposit was released."}'),
  ('biz_fiesta_cx', 'biz', null, true, '{"es":"Cancelaron una fiesta","en":"Party cancelled"}', '{"es":"{cliente} canceló la fiesta del {dia}.{dep}","en":"{cliente} cancelled the party on {dia}.{dep}"}')
on conflict (key) do nothing;

commit;
