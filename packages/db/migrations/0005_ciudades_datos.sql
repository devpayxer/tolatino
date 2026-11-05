-- 0005 · Las 5 ciudades de lanzamiento (decisión X). Son configuración real, no datos de ejemplo:
-- van igual a pruebas y a producción. Todas nacen «próximamente» (decisión A: se abre cuando esté todo).
-- Impuesto: Pennsylvania 6 % (ninguna de las 5 está en Allegheny ni Filadelfia). Centro = centro de la ciudad.
-- Idempotente: no pisa el estado que el Super Admin haya cambiado.
begin;
insert into cities (id, name, state, status, center, tax_rate, timezone, zips, sort) values
  ('hzl', 'Hazleton',     'PA', 'soon', st_geogfromtext('POINT(-75.9746 40.9584)'), 0.06, 'America/New_York', '{18201,18202}', 1),
  ('alw', 'Allentown',    'PA', 'soon', st_geogfromtext('POINT(-75.4902 40.6084)'), 0.06, 'America/New_York', '{18101,18102,18103,18104,18109}', 2),
  ('wbr', 'Wilkes-Barre', 'PA', 'soon', st_geogfromtext('POINT(-75.8813 41.2459)'), 0.06, 'America/New_York', '{18701,18702,18705,18706}', 3),
  ('scr', 'Scranton',     'PA', 'soon', st_geogfromtext('POINT(-75.6624 41.4090)'), 0.06, 'America/New_York', '{18503,18504,18505,18508,18509,18510}', 4),
  ('rdg', 'Reading',      'PA', 'soon', st_geogfromtext('POINT(-75.9269 40.3356)'), 0.06, 'America/New_York', '{19601,19602,19604,19605,19611}', 5)
on conflict (id) do update set name = excluded.name, state = excluded.state, center = excluded.center,
  tax_rate = excluded.tax_rate, timezone = excluded.timezone, zips = excluded.zips, sort = excluded.sort;
commit;
