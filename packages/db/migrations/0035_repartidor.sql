-- 0035 · App To'Latino Repartidor (bloque 2l, decisión B; plan apps-delivery-checkin.md §1). v1.0 = el repartidor del
-- propio negocio: el negocio lo invita con un código (Panel › Entrega › Tus repartidores), el repartidor entra con su
-- cuenta (el mismo teléfono que invitaron), y el negocio le asigna los pedidos de delivery (despacho). El repartidor
-- avanza los pasos (recogí, llegué, entregado), cobra el efectivo si toca y reporta problemas. El negocio cuadra el
-- efectivo por repartidor y día. Repartidores de To'Latino: más adelante (no se construye). Nada se borra.
begin;

create table if not exists delivery_drivers (
  id                 bigint generated always as identity primary key,
  business_id        text not null references businesses (id),
  user_id            uuid references users (id),                       -- al aceptar la invitación
  display_name       text not null check (char_length(display_name) between 2 and 40),
  phone              text not null,                                    -- el teléfono invitado (E.164); solo esa cuenta la acepta
  vehicle            text check (vehicle in ('pie', 'bici', 'moto', 'auto', 'camioneta')),
  status             text not null default 'invited' check (status in ('invited', 'active', 'removed')),
  invite_code        text unique,                                      -- 6 caracteres; se borra (null) al aceptar
  invite_expires_at  timestamptz,
  online             boolean not null default false,
  online_at          timestamptz,
  invited_by         uuid references users (id),
  created_at         timestamptz not null default now(),
  accepted_at        timestamptz,
  removed_at         timestamptz,
  removed_reason     text
);
create unique index if not exists delivery_drivers_tel_idx on delivery_drivers (business_id, phone) where status <> 'removed';
create index if not exists delivery_drivers_user_idx on delivery_drivers (user_id) where status = 'active';

alter table operations add column if not exists driver_id bigint references delivery_drivers (id);
alter table operations add column if not exists cash_collected_cents integer check (cash_collected_cents >= 0);
alter table operations add column if not exists cash_collected_at timestamptz;
create index if not exists operations_repartidor_idx on operations (driver_id, status) where driver_id is not null;

insert into notif_templates (key, grp, pref, sms, title, body) values
  ('drv_assigned', 'biz', null, true, '{"es": "Tienes una entrega", "en": "You have a delivery"}', '{"es": "{negocio} te asignó el pedido #{num} para {calle}.", "en": "{negocio} assigned you order #{num} to {calle}."}'),
  ('ord_here', 'tx', 'ord', true, '{"es": "Tu repartidor llegó", "en": "Your driver is here"}', '{"es": "Tu repartidor de {negocio} llegó con tu pedido #{num}.", "en": "Your {negocio} driver arrived with your order #{num}."}'),
  ('biz_dlv_issue', 'biz', null, true, '{"es": "Problema con una entrega", "en": "Delivery problem"}', '{"es": "{repartidor} reporta un problema con el pedido #{num}: {motivo}.", "en": "{repartidor} reports a problem with order #{num}: {motivo}."}')
on conflict (key) do nothing;

commit;
