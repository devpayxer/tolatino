-- Semilla de pruebas · 9j · Super Admin › Sistema (fase9-apertura.md §2 «0140 sistema», §4 9j). SOLO SANDBOX (decisión I; regla 13). Todo is_test.
-- · staff_mfa_pruebas: el equipo de FICCIÓN de las pruebas de punta a punta (Ana 0199 Admin, Dayana 0677 Soporte, Omar 0688 Finanzas, Beto 0188 Admin,
--   Lucía 0693 Solo lectura, Sofía 0694 Soporte de Allentown) entra al Super Admin sin segundo factor MIENTRAS el código de entrada se muestra en
--   pantalla (TOLATINO_SMS_MODO=pruebas; imposible en producción). Así las pruebas de siempre siguen entrando; el segundo factor de verdad lo prueba
--   sis9j con otra persona del equipo (no está en esta lista). La base solo acepta teléfonos 570-555.
-- · backup_runs y restore_drills: respaldos de cada tipo (base, WAL, fotos, sobre de llaves; uno falló) y dos restauraciones de prueba (una buena con
--   su RTO, otra que falló) para ver Sistema › Respaldos. Las fechas son de cuando corre la semilla: en el sandbox, sin respaldos reales, el de la
--   base se ve «atrasado» pasadas 26 h (es la verdad: los reales nacen en 9o).
-- · Un error del servidor ya tapado y agrupado (Sistema › Salud y Sistema › Apps › Salud).
-- Idempotente: se puede aplicar dos veces.
begin;

insert into staff_mfa_pruebas (phone, note) values
  ('+15705550199', 'Ana · Admin de las pruebas'),
  ('+15705550677', 'Dayana · Soporte de las pruebas'),
  ('+15705550688', 'Omar · Finanzas de las pruebas'),
  ('+15705550188', 'Beto · segundo Admin de las pruebas'),
  ('+15705550693', 'Lucía · Solo lectura de las pruebas'),
  ('+15705550694', 'Sofía · Soporte de Allentown de las pruebas')
on conflict (phone) do nothing;

-- ── Respaldos (solo si la semilla no los puso antes) ──
do $$
declare base_ok bigint;
begin
  if exists (select 1 from backup_runs where is_test and destino = 'semilla 9j') then return; end if;
  insert into backup_runs (entorno, kind, started_at, finished_at, bytes, sha256, destino, result, detail, is_test) values
    ('pruebas', 'base', now() - interval '3 days 3 hours', now() - interval '3 days 2 hours 52 minutes', 2410000000, repeat('a1', 32), 'semilla 9j', 'ok', 'Completo diario', true),
    ('pruebas', 'base', now() - interval '2 days 3 hours', now() - interval '2 days 2 hours 58 minutes', null, null, 'semilla 9j', 'fallo', 'El almacén no contestó (prueba)', true),
    ('pruebas', 'base', now() - interval '1 day 3 hours', now() - interval '1 day 2 hours 51 minutes', 2420000000, repeat('b2', 32), 'semilla 9j', 'ok', 'Completo diario', true),
    ('pruebas', 'fotos', now() - interval '20 hours', now() - interval '19 hours 40 minutes', 812000000, repeat('c3', 32), 'semilla 9j', 'ok', 'Sincronización diaria del almacén', true),
    ('pruebas', 'sobre', now() - interval '6 days', now() - interval '6 days' + interval '2 seconds', 4096, repeat('d4', 32), 'semilla 9j', 'ok', 'Sobre de recuperación cifrado', true);
  insert into backup_runs (entorno, kind, started_at, finished_at, bytes, sha256, destino, result, detail, is_test) values
    ('pruebas', 'base', now() - interval '3 hours', now() - interval '2 hours 50 minutes', 2430000000, repeat('e5', 32), 'semilla 9j', 'ok', 'Completo diario', true)
    returning id into base_ok;
  insert into backup_runs (entorno, kind, started_at, finished_at, bytes, sha256, destino, result, detail, is_test) values
    ('pruebas', 'wal', now() - interval '6 minutes', now() - interval '5 minutes', 16000000, repeat('f6', 32), 'semilla 9j', 'ok', 'WAL continuo', true);
  insert into restore_drills (backup_run_id, entorno, started_at, finished_at, point_at, rto_s, checks, verify_sql, result, detail, is_test) values
    (null, 'pruebas', now() - interval '9 days', now() - interval '9 days' + interval '12 minutes', now() - interval '9 days 1 hour', null, '{}'::jsonb,
      'select count(*) from users', 'fallo', 'La máquina desechable no arrancó (prueba)', true),
    (base_ok, 'pruebas', now() - interval '2 hours', now() - interval '1 hour 19 minutes', now() - interval '3 hours', 2460,
      '{"users": 1240, "businesses": 386, "operations": 9120, "audit_entries": 15400}'::jsonb, 'select count(*) from users; select count(*) from operations', 'ok', 'Restauró y cuadró', true);
end $$;

-- ── Un error del servidor (tapado: sin el teléfono) ──
insert into app_error_groups (fingerprint, app, platform, kind, title)
values ('9a7c0e1f2b3d4c5e6f708192a3b4c5d6e7f80910', 'web', 'web', 'servidor', 'Error: no se pudo avisar al [tel] de su pedido')
on conflict (fingerprint) do nothing;
insert into app_error_events (group_id, release, route_family, message, stack, session_hash, is_test)
select g.id, 'semilla', '/api/pedidos', 'no se pudo avisar al [tel] de su pedido', 'Error: no se pudo avisar al [tel] de su pedido
    at avisar (/app/apps/web/.next/server/chunks/avisos.js:1:2)', repeat('0', 32), true
  from app_error_groups g where g.fingerprint = '9a7c0e1f2b3d4c5e6f708192a3b4c5d6e7f80910'
   and not exists (select 1 from app_error_events e where e.group_id = g.id);

commit;
