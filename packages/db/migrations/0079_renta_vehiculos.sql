-- 0079 · Renta de vehículos (Fase 4 · 4y-4 · fase4-fiestas-transporte.md §4y, Preguntas #19): el motor de rentas de 4f-2 con
-- lo que pide un vehículo: antes de «La recogió», quién revisó la licencia y la edad (21+) y las millas al salir; al volver,
-- las millas al volver (nunca menos). Las millas incluidas por día y el precio de la milla de más van en el artículo
-- (items.svc_attrs: mpd, mi). Las millas de más se descuentan del depósito por el camino del daño (con foto del odómetro).
-- La ayuda de Fiestas y Transporte pasa a 0080.
begin;

alter table rentals add column if not exists license_checked_by uuid references users(id);
alter table rentals add column if not exists license_checked_at timestamptz;
alter table rentals add column if not exists odometer_out integer check (odometer_out between 0 and 2000000);
alter table rentals add column if not exists odometer_in integer check (odometer_in between 0 and 2000000);
alter table rentals drop constraint if exists rentals_odometro_check;
alter table rentals add constraint rentals_odometro_check check (odometer_in is null or (odometer_out is not null and odometer_in >= odometer_out));

commit;
