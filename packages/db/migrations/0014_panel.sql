-- 0014 · Panel del negocio, base (1h): Tu página, Hoy, Fotos, Horario, Quiénes somos, Equipo y fuerza del perfil.
begin;

-- «Lo que hay en tu negocio»: orden del catálogo (las de la categoría primero, luego las generales).
alter table amenities add column if not exists sort smallint not null default 0;

-- Vistas de la página del negocio por día (hora de la ciudad). Derivado: lo escribe solo el servidor al servir /n/[id];
-- nadie lo edita. Una fila por negocio y día (sin N+1: el panel suma 7 filas).
create table if not exists business_views_daily (
  business_id text not null references businesses (id),
  day         date not null,
  n           integer not null default 0 check (n >= 0),
  primary key (business_id, day)
);

-- «Cerrar por hoy» (Hoy · acciones rápidas): la página dice «Cerrado hoy» y mañana abre normal. Es una fecha, no un
-- estado: al día siguiente deja de aplicar sola.
alter table businesses add column if not exists closed_on date;

-- Equipo (Tu página · Equipo): invitación por SMS con enlace que vence a los 7 días, desde qué año está, quién invitó,
-- cuántas veces se mandó, por qué salió (nada se borra: estado 'removed' + motivo).
alter table business_members add column if not exists invite_code text;
alter table business_members add column if not exists invited_by uuid references users (id);
alter table business_members add column if not exists invite_sends smallint not null default 0;
alter table business_members add column if not exists since_year smallint check (since_year between 1900 and 2100);
alter table business_members add column if not exists removed_reason text check (removed_reason in ('owner', 'declined', 'canceled', 'expired', 'left'));
alter table business_members add column if not exists removed_at timestamptz;
alter table business_members add column if not exists updated_at timestamptz not null default now();
create unique index if not exists business_members_invite_idx on business_members (invite_code) where invite_code is not null;
create index if not exists business_members_biz_idx on business_members (business_id, status, sort);
-- Un teléfono no puede estar dos veces vivo en el mismo equipo.
create unique index if not exists business_members_phone_idx on business_members (business_id, phone)
  where phone is not null and status in ('invited', 'requested', 'active');

-- Logo del negocio (Tu página · Fotos): su propia foto, aparte de la galería (no cuenta como foto de la galería).
alter table media drop constraint if exists media_owner_kind_check;
alter table media add constraint media_owner_kind_check
  check (owner_kind in ('business','logo','item','member','review','post','event','user','help','support','claim'));

-- Abierto ahora: un negocio que cerró por hoy no está abierto (lo leen tarjetas, categoría, buscar, mapa y ficha).
create or replace function negocio_abierto(bid text, t timestamp) returns boolean language sql stable as $$
  select not exists (select 1 from businesses b where b.id = bid and b.closed_on = t::date)
     and exists (
    select 1 from business_hours h, jsonb_array_elements(h.ranges) g
     where h.business_id = bid and h.module = '' and h.open
       and (
         (h.weekday = extract(dow from t)::int
           and (g->>0)::time <= t::time
           and ((g->>1)::time > t::time or (g->>1)::time <= (g->>0)::time))
         or
         (h.weekday = (extract(dow from t)::int + 6) % 7
           and (g->>1)::time <= (g->>0)::time and (g->>1)::time > '00:00'::time
           and t::time < (g->>1)::time)
       ))
$$;

commit;
