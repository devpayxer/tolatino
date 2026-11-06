-- 0054 · Renta de herramienta (Fase 4 · bloque 4f-2). Diseño: neg-hogar-plan.js (rentForm / rentStatus) y la pestaña Tienda
-- de la ficha (neg-hogar-book.js › V.shop). Una renta es una operación (T-…, kind 'rental') con su fila en `rentals`:
--   apartada (48 h, hoy $0, baja el stock) → la tiene (se cobra la renta y se retiene el depósito) → devuelta (se libera el
--   depósito; si llegó tarde se descuenta un día por día tarde) | cancelada / vencida (vuelve el stock).
-- Un daño se enseña con foto y monto antes de descontarlo: el cliente acepta o no; si no, lo decide To'Latino.
-- El artículo es un ítem de la tienda (`items.module = 'renta'`, `unit = 'dia'`) con su depósito y sus unidades.
begin;
alter table items add column if not exists deposit_cents integer not null default 0 check (deposit_cents between 0 and 1000000);

create sequence rental_seq start 8100;
create table rentals (
  id bigint generated always as identity primary key,
  operation_id bigint not null unique references operations(id),
  business_id text not null references businesses(id),
  user_id uuid not null references users(id),
  city_id text not null references cities(id),
  item_id bigint not null references items(id),
  item_name jsonb not null,                                        -- copia al apartar ({es, en})
  price_cents int not null check (price_cents > 0),                -- por día, copia al apartar
  deposit_cents int not null check (deposit_cents >= 0),           -- copia al apartar
  days smallint not null check (days between 1 and 60),            -- días que paga (la semana paga 5, `week`)
  week boolean not null default false,
  rent_cents int not null check (rent_cents > 0),                  -- lo que se cobra al recoger (más «Un día más»)
  pick_on date not null,                                           -- el día que pasa a recoger
  due_on date not null,                                            -- el día que la devuelve
  expires_at timestamptz not null,                                 -- se guarda 48 h desde el día de recoger
  status text not null default 'held' check (status in ('held', 'out', 'back', 'cancelled', 'expired')),
  payment_method text not null check (payment_method ~ '^pm_[A-Za-z0-9_]{3,200}$'),
  card_failed boolean not null default false,                      -- al recoger, el banco no dejó: se cambia la tarjeta
  late_days smallint not null default 0 check (late_days between 0 and 365),
  late_cents int not null default 0 check (late_cents >= 0),
  late_noticed_on date,                                            -- el aviso de «se pasó del día» (una vez al día)
  damage_cents int check (damage_cents > 0),
  damage_note text check (char_length(damage_note) <= 300),
  damage_photo uuid references media(id),
  damage_status text check (damage_status in ('asked', 'accepted', 'disputed', 'charged', 'waived')),
  damage_asked_at timestamptz,
  out_at timestamptz,
  back_at timestamptz,
  cancelled_at timestamptz,
  cancelled_by text check (cancelled_by in ('user', 'business', 'system', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index rentals_negocio_idx on rentals (business_id, status, due_on);
create index rentals_usuario_idx on rentals (user_id, created_at desc);
create index rentals_vence_idx on rentals (expires_at) where status = 'held';
create index rentals_dano_idx on rentals (damage_asked_at) where damage_status in ('asked', 'disputed');

-- La cola del Super Admin «Daños de rentas»: un daño en desacuerdo o sin respuesta en 72 h.
alter table queue_items drop constraint queue_items_queue_check;
alter table queue_items add constraint queue_items_queue_check check (queue = any (array['sello', 'nuevo', 'lic', 'medios', 'rec', 'cambio', 'rep', 'sop', 'chat', 'disputa', 'renta']));
alter table queue_items drop constraint queue_items_subject_kind_check;
alter table queue_items add constraint queue_items_subject_kind_check check (subject_kind = any (array['verification_request', 'business', 'license', 'media', 'recommendation', 'claim', 'sensitive_change', 'review', 'help_request', 'chat_thread', 'dispute', 'rental']));

insert into notif_templates (key, grp, pref, sms, title, body) values
  ('renta_apartada', 'tx', null, false, '{"es": "Te la apartaron", "en": "It is on hold"}', '{"es": "{articulo} en {negocio}: recógela el {dia}. Hoy no se cobró nada.", "en": "{articulo} at {negocio}: pick it up on {dia}. Nothing was charged today."}'),
  ('renta_vence', 'tx', null, false, '{"es": "Tu apartado venció", "en": "Your hold expired"}', '{"es": "{articulo} en {negocio}: pasaron las 48 horas y volvió a la tienda. No se cobró nada.", "en": "{articulo} at {negocio}: the 48 hours passed and it went back on the shelf. Nothing was charged."}'),
  ('renta_recogida', 'tx', null, false, '{"es": "La tienes", "en": "You have it"}', '{"es": "{articulo}: se cobraron {monto} de renta y se retuvo el depósito de {deposito}. Devuélvela el {dia}.", "en": "{articulo}: {monto} rent charged and the {deposito} deposit held. Return it on {dia}."}'),
  ('renta_devuelta', 'tx', null, false, '{"es": "Devuelta", "en": "Returned"}', '{"es": "{articulo}: {que}", "en": "{articulo}: {que}"}'),
  ('renta_tarde', 'tx', null, true, '{"es": "Se pasó el día de devolver", "en": "Return date passed"}', '{"es": "{articulo} se tenía que devolver el {dia}. Cada día tarde se descuenta {monto} del depósito.", "en": "{articulo} was due on {dia}. Each late day takes {monto} from the deposit."}'),
  ('renta_tarjeta', 'tx', null, true, '{"es": "Tu tarjeta no pasó", "en": "Your card did not go through"}', '{"es": "{articulo}: el banco no dejó cobrar la renta. Cambia la tarjeta en tu renta y avísale a {negocio}.", "en": "{articulo}: the bank declined the rent. Change the card in your rental and let {negocio} know."}'),
  ('renta_dano', 'tx', null, true, '{"es": "Te enseñan un daño", "en": "They show you damage"}', '{"es": "{articulo}: {negocio} pide descontar {monto} del depósito por un daño. Mira la foto y decide.", "en": "{articulo}: {negocio} asks to take {monto} from the deposit for damage. See the photo and decide."}'),
  ('biz_renta', 'biz', null, true, '{"es": "Renta", "en": "Rental"}', '{"es": "{cliente}: {que} ({articulo}).", "en": "{cliente}: {que} ({articulo})."}')
on conflict (key) do nothing;
commit;
