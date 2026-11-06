-- 0049 · Mi vehículo y Mi casa como el diseño (neg-auto-book.js SZ; neg-hogar-book.js PETS y AGE): el tipo de vehículo
-- incluye moto y camión o diésel; mascotas «otra»; la edad de los equipos en 5 tramos.
begin;
alter table user_vehicles drop constraint if exists user_vehicles_size_check;
alter table user_vehicles add constraint user_vehicles_size_check check (size in ('c', 's', 'v', 'm', 'd'));
alter table user_homes drop constraint if exists user_homes_pets_check;
alter table user_homes add constraint user_homes_pets_check check (pets in ('no', 'perro', 'gato', 'otra'));
alter table user_homes drop constraint if exists user_homes_heat_age_check;
alter table user_homes add constraint user_homes_heat_age_check check (heat_age in ('5', '10', '20', 'mas', 'ns'));
alter table user_homes drop constraint if exists user_homes_wh_age_check;
alter table user_homes add constraint user_homes_wh_age_check check (wh_age in ('5', '10', '20', 'mas', 'ns'));
commit;
