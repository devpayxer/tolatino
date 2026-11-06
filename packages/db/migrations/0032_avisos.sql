-- 0032 · Avisos (bloque 2j). Diseño Super Admin secNotif (plantillas por evento ES/EN, envíos, reglas) y la regla: lo crítico
-- siempre llega; lo demás respeta las preferencias de la persona (users.notif_prefs) y las horas de silencio (10 PM – 7 AM).
-- Cada aviso queda en `notifications`: el de la app (bandeja) siempre; el SMS sale por el proveedor cuando exista la clave
-- (Telnyx, decisión E2). En el sandbox el SMS queda «en modo pruebas» (no sale) y se ve en el Super Admin. Nada se borra.
begin;

create table if not exists notif_templates (
  key        text primary key,                                        -- ord_ok, ord_ready, rsv_ok…
  grp        text not null check (grp in ('crit', 'tx', 'mod', 'biz', 'mkt')),
  pref       text,                                                    -- la preferencia que lo apaga (users.notif_prefs), null = no se apaga
  sms        boolean not null default false,                          -- además de la bandeja, ¿va por SMS?
  title      jsonb not null,                                          -- {es, en}
  body       jsonb not null,                                          -- {es, en} con {variables}
  edited_by  uuid references users (id),
  updated_at timestamptz not null default now()
);

create table if not exists notifications (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references users (id),
  city_id     text references cities (id),
  tpl         text not null references notif_templates (key),
  title       text not null,
  body        text not null check (char_length(body) <= 480),
  href        text,                                                   -- a dónde lleva al tocarlo
  ref_kind    text,
  ref_id      text,
  read_at     timestamptz,
  sms_status  text not null default 'no' check (sms_status in ('no', 'pruebas', 'pendiente', 'enviado', 'fallo', 'silencio', 'apagado', 'sin_proveedor')),
  sms_to      text,
  sms_at      timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists notifications_user_idx on notifications (user_id, id desc);
create index if not exists notifications_unread_idx on notifications (user_id) where read_at is null;
create index if not exists notifications_dia_idx on notifications (created_at desc);

insert into notif_templates (key, grp, pref, sms, title, body) values
  ('ord_ok', 'tx', 'ord', true, '{"es": "Pedido aceptado", "en": "Order accepted"}', '{"es": "{negocio} aceptó tu pedido #{num}. Listo a las {hora}.", "en": "{negocio} accepted your order #{num}. Ready at {hora}."}'),
  ('ord_no', 'tx', null, true, '{"es": "Pedido no aceptado", "en": "Order not accepted"}', '{"es": "{negocio} no pudo aceptar tu pedido #{num}. No se te cobró nada.", "en": "{negocio} could not accept your order #{num}. You were not charged."}'),
  ('ord_ready', 'tx', 'ord', true, '{"es": "Tu pedido está listo", "en": "Your order is ready"}', '{"es": "Tu pedido #{num} en {negocio} está listo para recoger.", "en": "Your order #{num} at {negocio} is ready for pickup."}'),
  ('ord_way', 'tx', 'ord', true, '{"es": "Tu pedido va en camino", "en": "Your order is on the way"}', '{"es": "Tu pedido #{num} de {negocio} va en camino.", "en": "Your order #{num} from {negocio} is on the way."}'),
  ('rsv_ok', 'tx', 'cit', true, '{"es": "Reservación confirmada", "en": "Booking confirmed"}', '{"es": "{negocio} confirmó tu mesa: {dia} a las {hora}.", "en": "{negocio} confirmed your table: {dia} at {hora}."}'),
  ('rsv_alt', 'tx', 'cit', true, '{"es": "Te proponen otra hora", "en": "Another time proposed"}', '{"es": "{negocio} no puede a esa hora. Te propone {alt}. Tienes 15 minutos para aceptar.", "en": "{negocio} cannot do that time. They propose {alt}. You have 15 minutes to accept."}'),
  ('rsv_no', 'tx', 'cit', true, '{"es": "Reservación no confirmada", "en": "Booking not confirmed"}', '{"es": "{negocio} no pudo darte mesa el {dia} a las {hora}.", "en": "{negocio} could not give you a table on {dia} at {hora}."}'),
  ('job_reply', 'tx', 'emp', true, '{"es": "Respuesta a tu solicitud", "en": "Reply to your application"}', '{"es": "{negocio}: {estado} · {puesto}.", "en": "{negocio}: {estado} · {puesto}."}'),
  ('help_reply', 'tx', null, true, '{"es": "Respuesta a tu solicitud de ayuda", "en": "Reply to your help request"}', '{"es": "{negocio} respondió tu solicitud {num}.", "en": "{negocio} replied to your request {num}."}'),
  ('help_done', 'tx', null, true, '{"es": "Solicitud resuelta", "en": "Request resolved"}', '{"es": "To''Latino resolvió tu solicitud {num}.", "en": "To''Latino resolved your request {num}."}'),
  ('mod_hide', 'mod', null, false, '{"es": "Contenido oculto", "en": "Content hidden"}', '{"es": "Ocultamos tu {tipo}: {motivo}.", "en": "We hid your {tipo}: {motivo}."}'),
  ('biz_req', 'biz', null, true, '{"es": "Nueva solicitud", "en": "New request"}', '{"es": "Nuevo {tipo} de {cliente}. Responde en {min} minutos.", "en": "New {tipo} from {cliente}. Reply within {min} minutes."}'),
  ('biz_help', 'biz', null, true, '{"es": "Un cliente pide ayuda", "en": "A customer asks for help"}', '{"es": "{cliente} pide ayuda con el pedido #{num}. Responde en 24 horas.", "en": "{cliente} asks for help with order #{num}. Reply within 24 hours."}'),
  ('biz_job', 'biz', null, false, '{"es": "Nueva solicitud de empleo", "en": "New job application"}', '{"es": "{cliente} aplicó a {puesto}.", "en": "{cliente} applied to {puesto}."}')
on conflict (key) do nothing;

commit;
