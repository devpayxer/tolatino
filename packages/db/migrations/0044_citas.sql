-- 0044 · Citas (Fase 3 · bloque 3b). La cita es una operación de tipo 'appointment' (número C-4801…) con quién atiende
-- (member_id), el inicio (scheduled_at), lo que dura con opciones y extras (duration_min) y el tiempo entre citas que la
-- agenda deja libre después (buffer_min, el cliente no lo ve). La disponibilidad es real: el horario de la persona (o el
-- del negocio) menos sus citas vivas. El depósito es un pago 'deposit' de la operación: se retiene al enviar, se cobra
-- al confirmar y se libera si no se confirma (lib/citas.ts). Nada se borra.
begin;

create sequence if not exists operations_appt_seq start 4801;

alter table operations add column if not exists buffer_min smallint not null default 0 check (buffer_min between 0 and 60);
create index if not exists operations_cita_idx on operations (business_id, scheduled_at) where kind = 'appointment';
create index if not exists operations_cita_persona_idx on operations (member_id, scheduled_at) where kind = 'appointment';

-- La nota para el barbero o la estilista llega a 280 (Booking · Detalles); 300 deja margen al recortar en el servidor.
alter table operations drop constraint if exists operations_customer_note_check;
alter table operations add constraint operations_customer_note_check check (char_length(customer_note) <= 300);

-- Foto de referencia de la cita (Booking · Detalles, hasta 3): la ven el cliente y el negocio en la cita.
alter table media drop constraint if exists media_owner_kind_check;
alter table media add constraint media_owner_kind_check
  check (owner_kind in ('business','logo','item','member','review','post','event','user','help','support','claim','appointment'));

-- «Avísame si se libera una hora» (Booking · Día y hora, sin horas ese día). Se avisa una vez cuando una cita de ese
-- día se cae (no puede, vence, se cancela). member_id null = cualquiera del negocio.
create table if not exists appointment_alerts (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references users (id),
  business_id text not null references businesses (id),
  member_id   uuid references business_members (id),
  day         date not null,
  created_at  timestamptz not null default now(),
  notified_at timestamptz,
  removed_at  timestamptz
);
create unique index if not exists appointment_alerts_uno on appointment_alerts (user_id, business_id, coalesce(member_id, '00000000-0000-0000-0000-000000000000'::uuid), day) where removed_at is null;
create index if not exists appointment_alerts_dia on appointment_alerts (business_id, day) where removed_at is null and notified_at is null;

-- Avisos de citas (Super Admin › Notificaciones las edita). Textos del prototipo (cita_ok, cita_alt, dev).
insert into notif_templates (key, grp, pref, sms, title, body) values
  ('cita_ok', 'tx', 'cit', true, '{"es": "Cita confirmada", "en": "Booking confirmed"}', '{"es": "{negocio} confirmó tu cita: {dia} a las {hora}.", "en": "{negocio} confirmed your booking: {dia} at {hora}."}'),
  ('cita_ok_dep', 'tx', 'cit', true, '{"es": "Cita confirmada", "en": "Booking confirmed"}', '{"es": "{negocio} confirmó tu cita: {dia} a las {hora}. Depósito {dep} cobrado.", "en": "{negocio} confirmed your booking: {dia} at {hora}. Deposit {dep} charged."}'),
  ('cita_alt', 'tx', 'cit', true, '{"es": "Te proponen otra hora", "en": "Another time proposed"}', '{"es": "{negocio} no puede a las {hora}. Te propone {alt}. Tienes 2 h para aceptar.", "en": "{negocio} cannot do {hora}. They propose {alt}. You have 2 h to accept."}'),
  ('cita_no', 'tx', 'cit', true, '{"es": "Cita no confirmada", "en": "Booking not confirmed"}', '{"es": "{negocio} no pudo tomar tu cita del {dia} a las {hora}.{dev}", "en": "{negocio} could not take your booking on {dia} at {hora}.{dev}"}'),
  ('cita_libre', 'tx', 'cit', true, '{"es": "Se liberó una hora", "en": "A time opened up"}', '{"es": "Se liberó una hora en {negocio} el {dia}. Entra para pedirla.", "en": "A time opened up at {negocio} on {dia}. Open the app to book it."}'),
  ('biz_cita', 'biz', null, true, '{"es": "Nueva solicitud de cita", "en": "New booking request"}', '{"es": "{cliente} pide {servicio} el {dia} a las {hora}{con}. Responde en {min} minutos.", "en": "{cliente} requests {servicio} on {dia} at {hora}{con}. Reply within {min} minutes."}'),
  ('biz_cita_ok', 'biz', null, true, '{"es": "Nueva cita", "en": "New booking"}', '{"es": "{cliente} reservó {servicio} el {dia} a las {hora}{con}. Quedó confirmada.", "en": "{cliente} booked {servicio} on {dia} at {hora}{con}. It is confirmed."}')
on conflict (key) do nothing;

-- Los avisos de dinero (liberado, devuelto) ya no dicen «pedido» a secas: sirven para pedidos y citas.
update notif_templates set body = '{"es": "Liberamos {monto} retenidos de {num}. Tu banco lo muestra en 1 a 5 días.", "en": "We released {monto} held for {num}. Your bank shows it in 1 to 5 days."}'::jsonb
 where key = 'pay_released' and edited_by is null;
update notif_templates set body = '{"es": "Te devolvimos {monto} de {num} a tu {tarjeta}. Llega en 3 a 5 días hábiles.", "en": "We refunded {monto} for {num} to your {tarjeta}. It arrives in 3 to 5 business days."}'::jsonb
 where key = 'pay_refund' and edited_by is null;

commit;
