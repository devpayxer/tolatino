-- 0151 · Fase 9 · 9n-7 — la vuelta a revisión de las licencias cubre todas las categorías (LAUNCH «4ig · Licencias de las demás
-- categorías»). El barrido (lib/licencias.ts: barrerLicencias, cada minuto) ya no filtra por Iglesias, Bienes Raíces y Autos: busca
-- en todas las licencias verificadas cuya revisión vence en lic_aviso_dias. Para que esa búsqueda no recorra la tabla entera a
-- escala (el índice de revisión empieza por city_id), un índice parcial solo con las verificadas que tienen fecha de revisión.
-- Idempotente.
begin;
create index if not exists licenses_vence_idx on licenses (next_review) where status = 'valid' and next_review is not null;
commit;
