-- 9o · Las consultas de control de la restauración de prueba (fase9-apertura.md §3.4): lo que se cuenta en la base RESTAURADA para saber que es una
-- base de verdad y no un cascarón. Solo cifras (nada de una persona). Una sola fila: un objeto JSON que va a restore_drills.checks (≤ 4000 bytes).
select json_build_object(
  'usuarios', (select count(*) from users),
  'negocios', (select count(*) from businesses),
  'operaciones', (select count(*) from operations),
  'cobros', (select count(*) from payments),
  'cobrado_cents', (select coalesce(sum(amount_cents), 0) from payments where status in ('captured', 'refunded', 'partially_refunded')),
  'devuelto_cents', (select coalesce(sum(amount_cents), 0) from refunds),
  'auditoria', (select count(*) from audit_entries),
  'auditoria_ultima_min', (select coalesce(extract(epoch from now() - max(at)) / 60, -1)::int from audit_entries),
  'migraciones', (select count(*) from schema_migrations),
  'ciudades', (select count(*) from cities),
  'categorias', (select count(*) from categories)
)::text;
