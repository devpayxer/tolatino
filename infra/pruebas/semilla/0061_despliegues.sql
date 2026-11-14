-- 9o · Semilla del SANDBOX (is_test, nunca en producción): para que Sistema › Despliegues se vea con cada caso antes de que existan despliegues reales
-- (los del sandbox los anota su deploy.sh desde 9o): una versión que sirvió, una del ensayo que volvió atrás sola con su incidente abierto, una que no pasó
-- la puerta de salud y un incidente del monitoreo ya cerrado. Una vez cada fila (por su commit de ficción). Idempotente.
begin;
insert into deploy_releases (entorno, commit_sha, previous_sha, image_digest, color, migrations_applied, started_at, healthy_at, finished_at, result, reason, watch, rollback_s, is_test)
select v.entorno, v.c, v.p, 'sha256:' || repeat('a', 64), v.color, v.m, now() - v.hace - interval '14 minutes', now() - v.hace - interval '12 minutes', now() - v.hace, v.r, v.motivo, v.w::jsonb, v.rb, true
  from (values
    ('pruebas', 'e0a9001', 'e0a9000', 'unico', array['0145_despliegues.sql'], interval '2 days', 'ok', null, '{}', null),
    ('ensayo', 'e0a9002', 'e0a9001', 'verde', array[]::text[], interval '20 hours', 'vuelta_atras', '/api/salud falló 3 veces seguidas', '{"total": 412, "n5xx": 31, "p5xx": 7, "p95": 840, "nuevos": 2, "salud_fallos": 3, "vigilancia_s": 210}', 9),
    ('ensayo', 'e0a9003', 'e0a9001', 'verde', array[]::text[], interval '18 hours', 'ok', null, '{"total": 1280, "n5xx": 0, "p5xx": 0, "p95": 310, "nuevos": 0, "salud_fallos": 0, "vigilancia_s": 600}', null)
  ) as v (entorno, c, p, color, m, hace, r, motivo, w, rb)
 where not exists (select 1 from deploy_releases d where d.commit_sha = v.c and d.is_test);
insert into deploy_releases (entorno, commit_sha, previous_sha, color, started_at, finished_at, result, reason, is_test)
select 'ensayo', 'e0a9004', 'e0a9003', 'azul', now() - interval '6 hours 4 minutes', now() - interval '6 hours', 'fallo', 'no pasó la puerta de salud: sigue la versión anterior', true
 where not exists (select 1 from deploy_releases d where d.commit_sha = 'e0a9004' and d.is_test);
insert into incident_log (entorno, started_at, severity, kind, seen, manual_ref, source, deploy_release_id, is_test)
select 'ensayo', now() - interval '20 hours', 'alta', 'despliegue-malo', 'e0a9002: /api/salud falló 3 veces seguidas', 'docs/incidentes/despliegue-malo.md', 'despliegue',
       (select id from deploy_releases where commit_sha = 'e0a9002' and is_test), true
 where not exists (select 1 from incident_log where is_test and kind = 'despliegue-malo');
insert into incident_log (entorno, started_at, ended_at, severity, kind, seen, done, manual_ref, source, is_test)
select 'ensayo', now() - interval '3 days', now() - interval '3 days' + interval '9 minutes', 'alta', 'disco-lleno', 'DiscoLleno: un disco pasa del 85 %',
       'Se resolvió solo (el monitoreo dejó de verlo).', 'docs/incidentes/disco-lleno.md', 'monitoreo', true
 where not exists (select 1 from incident_log where is_test and kind = 'disco-lleno');
commit;
