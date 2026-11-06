-- 0064 · Mercados y Tiendas: productos, tallas, «Tu herramienta» (Fase 4 · bloque 4n). Plan: docs/diseno/plan/fase4-mercados-tiendas.md
-- §2. Diseño: neg-merc-listing.js (SVC k lb · unid · plato, cut/punto) · neg-tienda-data.js (SVC k ropa · unid · plan · serv, tallas,
-- tallaK, OPTS dev/envio/plan/planFee) · dash2-cat.js (TOOLS NEG-MERC «Balanza y pedidos», NEG-TIENDA «Tallas y apartados»).
-- Nada se borra: las tallas que se quitan quedan con removed_at; la existencia la cambia el panel y queda en la auditoría.
begin;
-- Cómo se vende cada producto de mercado o tienda. peso ⇔ unit 'lb'; talla ⇔ tiene tallas (item_variants).
alter table items add column if not exists shop_kind text check (shop_kind in ('peso', 'unid', 'plato', 'talla', 'plan', 'serv'));
alter table items add column if not exists ebt boolean not null default false;                      -- elegible EBT/SNAP (solo comida que no está caliente)
alter table items add column if not exists age_min smallint not null default 0 check (age_min in (0, 21)); -- licor, cerveza y vino, tabaco, vape
alter table items add column if not exists in_store_only boolean not null default false;             -- «SOLO EN LA TIENDA»: no se pide ni se aparta
alter table items add column if not exists size_label jsonb;                                         -- «Talla» / «Número»
alter table items drop constraint if exists items_shop_kind_unit;
alter table items add constraint items_shop_kind_unit check (shop_kind is null or (shop_kind = 'peso') = (unit = 'lb'));
-- Un producto de 21+ nunca se pide ni se aparta en la app (Preguntas #4): solo en la tienda.
alter table items drop constraint if exists items_edad_en_tienda;
alter table items add constraint items_edad_en_tienda check (age_min = 0 or in_store_only);
create index if not exists items_shop_kind_idx on items (business_id, shop_kind) where module = 'shop' and removed_at is null;

-- Tallas con existencia (una talla en 0 no se aparta: lo decide el servidor).
create table if not exists item_variants (
  id          bigint generated always as identity primary key,
  item_id     bigint not null references items (id),
  business_id text not null references businesses (id),
  label       text not null check (char_length(label) between 1 and 8),
  sort        smallint not null default 0,
  stock_left  integer not null default 0 check (stock_left between 0 and 9999),
  updated_by  uuid references users (id),
  updated_at  timestamptz not null default now(),
  removed_at  timestamptz
);
create unique index if not exists item_variants_label_idx on item_variants (item_id, label) where removed_at is null;
create index if not exists item_variants_biz_idx on item_variants (business_id) where removed_at is null;
alter table operation_lines add column if not exists variant_id bigint references item_variants (id);
alter table operation_lines add column if not exists variant_label text;

-- «Tu herramienta» de Mercados y Tiendas (una fila por negocio). Costo y mínimo del envío viven en delivery_settings.
create table if not exists retail_settings (
  business_id     text primary key references businesses (id),
  -- Mercados · «Balanza y pedidos»
  ebt             boolean not null default false,
  cash            boolean not null default true,
  weighs_front    boolean not null default true,
  sub_default     text not null default 'call' check (sub_default in ('call', 'similar', 'no')),
  slot_cap        smallint not null default 6 check (slot_cap between 1 and 30),
  -- Tiendas · «Tallas y apartados»
  hold_hours      smallint not null default 48 check (hold_hours in (24, 48, 72)),
  returns_days    smallint not null default 0 check (returns_days between 0 and 90),
  layaway         boolean not null default false,
  lay_down_pct    smallint not null default 20 check (lay_down_pct between 10 and 50),
  lay_payments    smallint not null default 4 check (lay_payments between 2 and 6),
  lay_every_days  smallint not null default 14 check (lay_every_days in (7, 14, 30)),
  lay_cancel_pct  smallint not null default 10 check (lay_cancel_pct between 0 and 10),
  updated_by      uuid references users (id),
  updated_at      timestamptz not null default now()
);

-- Envío por correo de la tienda (MD DeliverySettings «solo Tienda y Renta»).
alter table delivery_settings add column if not exists ship boolean not null default false;
alter table delivery_settings add column if not exists ship_fee_cents integer not null default 0 check (ship_fee_cents between 0 and 20000);
alter table delivery_settings add column if not exists ship_free_over_cents integer not null default 0 check (ship_free_over_cents between 0 and 500000);
alter table delivery_settings add column if not exists ship_days text not null default '3-5' check (ship_days in ('1-2', '3-5', '5-7'));
-- El envío de un mueble o de un mayorista cuesta más que el de un restaurante.
alter table delivery_settings drop constraint if exists delivery_settings_fee_cents_check;
alter table delivery_settings add constraint delivery_settings_fee_cents_check check (fee_cents between 0 and 10000);

-- Foto de la balanza por línea (4p).
alter table media drop constraint if exists media_owner_kind_check;
alter table media add constraint media_owner_kind_check check (owner_kind = any (array['business', 'logo', 'item', 'member', 'review', 'post', 'event', 'user', 'help', 'support', 'claim', 'appointment', 'estimate_line', 'request', 'line']));

-- Comisión del pedido del mercado: aparte de la de restaurantes para que el fundador la mueva sola (Preguntas #8).
alter table fee_rules drop constraint fee_rules_kind_check;
alter table fee_rules add constraint fee_rules_kind_check check (kind = any (array['ped', 'cita', 'bol', 'apt', 'rsv', 'plan', 'renta', 'merc']));
insert into fee_rules (kind, rate_bp, fixed_cents, effective_from, reason)
select 'merc', 1000, 0, '2026-01-01', 'Comisión inicial del pedido del mercado (igual que la de pedidos; Super Admin › Planes)'
 where not exists (select 1 from fee_rules where kind = 'merc');
commit;
