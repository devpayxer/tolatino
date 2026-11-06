-- 0052 · Solicitudes de servicio (Fase 4 · bloque 4e): pre-estimado con fotos (Auto y Hogar), presupuesto a hasta 3
-- (Hogar) y emergencia 24/7 (Hogar). Diseño: neg-auto-pre.js, neg-hogar-pre.js, neg-hogar-mas.js. Un solo motor: la
-- solicitud (lo que manda la persona) y sus destinos (cada negocio que la recibe y lo que responde).
-- Nada se borra: estados. Las fotos van en media (owner_kind 'request').
begin;
create sequence service_request_seq start 2100;
create table service_requests (
  id bigint generated always as identity primary key,
  number text not null unique check (number ~ '^[PQE]-\d{1,10}$'),     -- P pre-estimado · Q presupuesto · E emergencia
  mode text not null check (mode in ('pre', 'pq', 'em')),
  user_id uuid not null references users(id),
  city_id text not null references cities(id),
  category_id text not null,
  rubro text not null check (rubro in ('auto', 'hogar')),
  vehicle_id uuid references user_vehicles(id),
  home_id uuid references user_homes(id),
  form jsonb not null,                                                    -- qué pasa, luces, código, área, para cuándo, cómo entrar…
  status text not null default 'sent' check (status in ('sent', 'answered', 'used', 'expired', 'cancelled', 'nobody', 'taken')),
  respond_by timestamptz not null,
  valid_until timestamptz,
  accepted_business_id text references businesses(id),                    -- emergencia: el primero que acepta
  accepted_at timestamptz,
  operation_id bigint references operations(id),                          -- la cita que salió de aquí
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((rubro = 'auto') = (vehicle_id is not null) or mode <> 'pre'),
  check (mode = 'pre' or home_id is not null)
);
create index service_requests_user_idx on service_requests (user_id, created_at desc);
create index service_requests_vivas_idx on service_requests (respond_by) where status = 'sent';
create index service_requests_city_idx on service_requests (city_id, created_at desc);

create table request_targets (
  id bigint generated always as identity primary key,
  request_id bigint not null references service_requests(id),
  business_id text not null references businesses(id),
  item_id bigint references items(id),                                    -- el servicio de ese negocio (diagnóstico, visita, presupuesto, emergencia)
  sort smallint not null default 0,
  status text not null default 'sent' check (status in ('sent', 'rng', 'see', 'no', 'expired', 'closed', 'used', 'taken', 'lost', 'cancelled')),
  reply jsonb,                                                            -- {lo, hi, inc:[], visit, days:[a,b], note}
  notified_at timestamptz not null default now(),
  seen_at timestamptz,
  answered_at timestamptz,
  answered_by uuid references users(id),
  unique (request_id, business_id)
);
create index request_targets_negocio_idx on request_targets (business_id, status, notified_at desc);

insert into notif_templates (key, grp, pref, sms, title, body) values
  ('biz_preest', 'biz', null, true, '{"es": "Te piden un pre-estimado", "en": "A pre-estimate request"}', '{"es": "{cliente} manda fotos para un pre-estimado de {svc}. Responde con un rango.", "en": "{cliente} sent photos for a {svc} pre-estimate. Reply with a range."}'),
  ('preest_rng', 'tx', null, true, '{"es": "Tu pre-estimado está listo", "en": "Your pre-estimate is ready"}', '{"es": "{negocio}: {rango}. Reserva con un toque.", "en": "{negocio}: {rango}. Book with one tap."}'),
  ('preest_see', 'tx', null, true, '{"es": "Hay que verlo", "en": "It needs an inspection"}', '{"es": "{negocio} necesita verlo: {rango}.", "en": "{negocio} needs to see it: {rango}."}'),
  ('preest_no', 'tx', null, false, '{"es": "No lo hacen", "en": "Not a service they do"}', '{"es": "{negocio} no hace ese trabajo. Te dejamos otros que sí.", "en": "{negocio} does not do that job. Here are others that do."}'),
  ('preest_exp', 'tx', null, false, '{"es": "Sin respuesta", "en": "No reply"}', '{"es": "{negocio} no respondió tu solicitud {num}. Puedes mandarla otra vez.", "en": "{negocio} did not reply to request {num}. You can send it again."}'),
  ('biz_pq', 'biz', null, true, '{"es": "Te piden un presupuesto", "en": "A quote request"}', '{"es": "{cliente} pide presupuesto para {svc}. Lo pidió a hasta 3 negocios: responde en 48 h.", "en": "{cliente} asks for a {svc} quote from up to 3 businesses: reply within 48 h."}'),
  ('pq_resp', 'tx', null, true, '{"es": "Respondieron tu presupuesto", "en": "Quote reply"}', '{"es": "{negocio} respondió tu solicitud {num}.", "en": "{negocio} replied to request {num}."}'),
  ('pq_cerrado', 'biz', null, false, '{"es": "Eligieron a otro negocio", "en": "They chose another business"}', '{"es": "{cliente} eligió otro presupuesto para la solicitud {num}.", "en": "{cliente} chose another quote for request {num}."}'),
  ('biz_em', 'biz', null, true, '{"es": "EMERGENCIA cerca", "en": "EMERGENCY nearby"}', '{"es": "{que} a {mi} mi. El primero que acepta la toma.", "en": "{que} {mi} mi away. First to accept takes it."}'),
  ('em_ok', 'tx', null, true, '{"es": "Va en camino", "en": "On the way"}', '{"es": "{negocio} tomó tu emergencia. Llega en unos {eta} min.", "en": "{negocio} took your emergency. Arrives in about {eta} min."}'),
  ('em_nadie', 'tx', null, true, '{"es": "Nadie disponible", "en": "Nobody available"}', '{"es": "Nadie tomó tu emergencia en 15 min. No se cobró nada. Mándala otra vez o llama directo a uno.", "en": "Nobody took your emergency in 15 min. Nothing was charged. Send it again or call one directly."}'),
  ('em_tomada', 'biz', null, false, '{"es": "Ya la tomó otro negocio", "en": "Another business took it"}', '{"es": "La emergencia {num} ya la tomó otro negocio.", "en": "Emergency {num} was taken by another business."}')
on conflict (key) do nothing;
commit;
