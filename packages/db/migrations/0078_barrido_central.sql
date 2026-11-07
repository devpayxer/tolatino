-- 0078 · Barrido central (LAUNCH-CHECKLIST 7 nov): vencer solicitudes, liberar retenciones, precios y totales vencidos,
-- recordatorios y avisos corren cada minuto aunque nadie abra una página. Cada tarea deja aquí su última corrida (para el
-- Super Admin y /api/salud). Solo inserción/actualización de su propia fila; no guarda datos de personas.
-- La ayuda de Fiestas y Transporte pasa a 0079.
begin;

create table if not exists system_jobs (
  name text primary key,
  last_run_at timestamptz,
  last_ok_at timestamptz,
  last_ms integer,
  last_error text,
  runs bigint not null default 0,
  errors bigint not null default 0
);

commit;
