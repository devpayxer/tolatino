-- 0047 · Ayuda con la cita (Fase 3 · bloque 3e). La misma solicitud de ayuda que los pedidos (una por operación),
-- ahora también sobre una cita: motivos de Belleza (cobraron más, no me atendió quien reservé, no quedó como lo pedí,
-- esperé mucho, no me devolvieron el depósito), cuánto (opcional), fotos (media 'help') y la respuesta del negocio
-- con decisión: acepta, propone otra cosa (un monto) o no puede. Lo que vuelve a la tarjeta sale del depósito pagado en
-- la app; lo pagado en el local se arregla en el local. Nada se borra.
begin;

alter table help_requests drop constraint if exists help_requests_reason_check;
alter table help_requests add constraint help_requests_reason_check
  check (reason in ('falta', 'equivocado', 'frio', 'danado', 'tarde', 'nollego', 'pago', 'otro', 'cobro', 'quien', 'quedo', 'espera', 'dep'));
-- La nota de la cita llega a 500 letras (diseño: «Cuéntanos qué pasó», 15 o más).
alter table help_requests drop constraint if exists help_requests_body_check;
alter table help_requests add constraint help_requests_body_check check (char_length(body) <= 500);

alter table help_requests add column if not exists amount_cents integer check (amount_cents between 1 and 1000000);
-- La decisión del negocio al responder: ok (acepta lo que pide), alt (propone un monto), no (no puede).
alter table help_requests add column if not exists decision text check (decision in ('ok', 'alt', 'no'));
alter table help_requests add column if not exists offer_cents integer check (offer_cents between 0 and 1000000);
-- Lo que de verdad volvió a la tarjeta por esta solicitud (derivado de refunds; solo para mostrar).
alter table help_requests add column if not exists refunded_cents integer not null default 0 check (refunded_cents >= 0);
-- La persona cerró la solicitud (aceptó la respuesta o la propuesta).
alter table help_requests add column if not exists closed_by text check (closed_by in ('user', 'admin'));

insert into notif_templates (key, grp, pref, sms, title, body) values
  ('biz_help_cita', 'biz', null, true, '{"es": "Un cliente pide ayuda con una cita", "en": "A client asks for help with a booking"}', '{"es": "{cliente} pide ayuda con la cita {num}. Responde en 24 horas.", "en": "{cliente} asks for help with booking {num}. Reply within 24 hours."}'),
  ('biz_help_rev', 'biz', null, false, '{"es": "To''Latino revisa una solicitud", "en": "To''Latino reviews a request"}', '{"es": "{cliente} pidió que To''Latino revise la solicitud {num}. Te escribimos si hace falta algo.", "en": "{cliente} asked To''Latino to review request {num}. We will write if we need anything."}')
on conflict (key) do nothing;

commit;
