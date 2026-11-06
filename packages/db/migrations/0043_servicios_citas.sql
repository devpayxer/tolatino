-- 0043 · Servicios y reglas de citas (Fase 3 · bloque 3a; Panel v2 svcDet / citas, dash2-svc, dash2-cat «Sillas y agenda»;
-- modelo BookingPolicy · StaffService). Los servicios viven en `items` (module 'svc') como el menú: nombre ES/EN, foto,
-- categoría (item_sections), precio. Aquí se suma lo que una cita necesita: cuánto dura, el tiempo entre citas (el cliente
-- no lo ve), «desde · varía», opciones que cambian precio y tiempo, y extras. Quién hace cada servicio (y, en una silla
-- rentada, su precio) va en staff_services. Cómo trabaja el negocio: empleados, a comisión o rentan silla.
begin;

alter table items add column if not exists duration_min smallint check (duration_min between 5 and 480);
alter table items add column if not exists buffer_min smallint not null default 0 check (buffer_min between 0 and 60);
alter table items add column if not exists price_from boolean not null default false;      -- «Desde · varía»
alter table items add column if not exists svc_opts jsonb not null default '[]'::jsonb;    -- [{t:{es,en}, o:[{n:{es,en}, p:cents, m:min}]}] máx. 3
alter table items add column if not exists is_extra boolean not null default false;        -- «Extras» (se suman al tiempo)

-- Cómo trabaja la barbería o el salón (Panel «Cómo trabaja tu barbería»).
alter table businesses add column if not exists svc_model text not null default 'emp' check (svc_model in ('emp', 'comm', 'chair'));
alter table businesses add column if not exists svc_rent_cents integer check (svc_rent_cents between 0 and 500000);   -- renta semanal de la silla
alter table businesses add column if not exists svc_comm_pct smallint check (svc_comm_pct between 0 and 100);         -- a comisión: % para el barbero

-- Quién hace cada servicio. Con sillas rentadas, cada silla pone su precio (price_cents); si no, vale el del servicio.
create table if not exists staff_services (
  member_id    uuid not null references business_members (id),
  item_id      bigint not null references items (id),
  price_cents  integer check (price_cents between 0 and 1000000),
  primary key (member_id, item_id)
);
create index if not exists staff_services_item_idx on staff_services (item_id);

-- Reglas de citas del negocio (BookingPolicy). Una fila por negocio; las sillas rentadas tienen las suyas en business_members.
create table if not exists booking_policies (
  business_id       text primary key references businesses (id),
  auto_approve      boolean not null default false,                                              -- «Aprobar citas al instante»
  response_min      smallint not null default 30 check (response_min in (15, 30, 60, 180)),      -- «Tardas en contestar» (lo ve el cliente)
  expires_h         smallint not null default 2 check (expires_h between 1 and 48),              -- vence y se devuelve el depósito
  deposit_cents     integer not null default 0 check (deposit_cents between 0 and 100000),
  cancel_free_h     smallint not null default 2 check (cancel_free_h in (2, 4, 24, 72)),
  tolerance_min     smallint not null default 15 check (tolerance_min between 0 and 60),
  staff_pick        boolean not null default true,                                               -- «El cliente elige con quién»
  updated_by        uuid references users (id),
  updated_at        timestamptz not null default now()
);

-- Silla rentada: cada silla decide (lo configura el panel del dueño por silla, «Sillas y agenda»).
alter table business_members add column if not exists chair_seat smallint check (chair_seat between 1 and 30);
alter table business_members add column if not exists chair_auto boolean not null default false;
alter table business_members add column if not exists chair_response_min smallint check (chair_response_min in (15, 30, 60, 180));
alter table business_members add column if not exists chair_deposit_cents integer check (chair_deposit_cents between 0 and 100000);
alter table business_members add column if not exists takes_bookings boolean not null default true;  -- «Quién recibe citas»

commit;
