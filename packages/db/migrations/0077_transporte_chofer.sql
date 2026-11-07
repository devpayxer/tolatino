-- 0077 · Transporte: el chofer de cada salida y el aviso de retraso automático (Fase 4 · 4y-3b · fase4-fiestas-transporte.md §4y).
-- trip_runs.driver_id ya existe (0074); aquí: índice por chofer, la marca del aviso automático y las plantillas.
-- La ayuda de Fiestas y Transporte pasa a 0078.
begin;

-- El chofer es un repartidor del negocio (delivery_drivers, id bigint): la columna de 0074 era uuid y nadie la usaba.
alter table trip_runs drop column if exists driver_id;
alter table trip_runs add column driver_id bigint references delivery_drivers(id);
alter table trip_runs add column if not exists late_alert_at timestamptz; -- se avisó solo, a los 15 min sin «Salió» (una vez)
create index if not exists trip_runs_driver_idx on trip_runs (driver_id, run_at) where driver_id is not null and status in ('scheduled', 'departed');
create index if not exists trip_runs_sin_salir_idx on trip_runs (run_at) where status = 'scheduled' and late_alert_at is null;

insert into notif_templates (key, grp, pref, sms, title, body) values
  ('viaje_retraso', 'tx', 'cit', true, '{"es":"Tu salida todavía no sale","en":"Your departure has not left yet"}', '{"es":"Tu salida de las {hora} con {negocio} todavía no sale. El negocio ya lo sabe; te avisamos cuando salga.","en":"Your {hora} departure with {negocio} has not left yet. The business knows; we will tell you when it leaves."}'),
  ('biz_salida_sin_salir', 'biz', null, true, '{"es":"Una salida no ha salido","en":"A departure has not left"}', '{"es":"La salida de las {hora} ({servicio}) no ha salido. Marca «Salió» o «Va tarde».","en":"The {hora} departure ({servicio}) has not left. Mark “Left” or “Running late”."}'),
  ('chofer_salida', 'tx', null, true, '{"es":"Te asignaron una salida","en":"You were assigned a departure"}', '{"es":"{negocio}: la salida de las {hora} del {dia} ({servicio}) es tuya. Pasajeros en la app.","en":"{negocio}: the {hora} departure on {dia} ({servicio}) is yours. Passengers in the app."}')
on conflict (key) do nothing;

commit;
