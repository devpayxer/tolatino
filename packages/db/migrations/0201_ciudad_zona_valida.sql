-- 0201 · La zona horaria de una ciudad nunca queda vacía ni inventada (21 nov; CI 44866551623).
-- Casi todas las pantallas calculan «hoy» y «abierto ahora» con `now() at time zone cities.timezone`: con la columna vacía o con un nombre que
-- Postgres no conoce, cada una de esas consultas falla («time zone "" not recognized») y la ciudad entera deja de abrir: su página del Super Admin,
-- sus listas, sus avisos. La app ya solo deja elegir de una lista (lib/ciudades/apertura.ts, ZONAS_HORARIAS), pero la base lo aceptaba todo (una
-- prueba lo escribió vacío por SQL y la página se cayó). Ahora la base tampoco: la restricción convierte una fecha fija a esa zona, y si la zona
-- no existe la propia conversión falla. Idempotente; las filas que hay ya cumplen (todas vienen de la lista).
begin;

alter table cities drop constraint if exists cities_zona_valida;
alter table cities add constraint cities_zona_valida
  check (char_length(timezone) between 3 and 64 and (timestamptz '2000-01-01 00:00:00+00' at time zone timezone) is not null);

commit;
