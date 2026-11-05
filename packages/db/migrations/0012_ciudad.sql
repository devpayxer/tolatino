-- 0012 · Ciudad (APP-CIUDAD): pueblos cercanos de cada ciudad (para el mapa del radio: «incluye West Hazleton,
-- McAdoo…»), el orden de las zonas, la «ciudad que estoy viendo» de la cuenta y la lista de espera con estados.
begin;
alter table cities add column if not exists towns jsonb not null default '[]'::jsonb;
alter table zones add column if not exists sort smallint not null default 0;
create unique index if not exists zones_id_key on zones (id);

-- Ciudad que estoy viendo (modelo de datos, User): sigue a la persona en todos sus teléfonos. El punto GPS no se
-- guarda nunca aquí (la pantalla lo promete: «no la guardamos»); solo que mide desde su ubicación.
alter table users add column if not exists viewing_city_id text references cities (id);
alter table users add column if not exists viewing_center text;
alter table users add column if not exists viewing_radius_mi smallint;

-- Lista de espera: quitarse no borra (removed_at). Sin cuenta, el pedido queda atado al teléfono del dispositivo
-- (device: identificador aleatorio en una cookie) para que solo ese dispositivo lo pueda quitar.
alter table city_waitlist add column if not exists removed_at timestamptz;
alter table city_waitlist add column if not exists device uuid;
alter table city_waitlist add column if not exists ip inet;
create unique index if not exists city_waitlist_user_city on city_waitlist (user_id, coalesce(city_id, lower(city_name)))
  where user_id is not null and removed_at is null;
create unique index if not exists city_waitlist_device_city on city_waitlist (device, coalesce(city_id, lower(city_name)))
  where device is not null and user_id is null and removed_at is null;
create index if not exists city_waitlist_name_idx on city_waitlist (lower(city_name)) where removed_at is null;
create index if not exists city_waitlist_ip_idx on city_waitlist (ip, created_at desc);
commit;
