// Prueba al revés de los guardianes de 5f: se inyecta el defecto, el guardián debe fallar; se restaura.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const M = 'packages/db/migrations/0102_puntos_rangos_tabla.sql', PU = 'apps/web/lib/puntos.ts', T = 'apps/web/lib/tabla.ts', H = 'apps/web/lib/comunidad-hilo.ts', C = 'apps/web/lib/comunidad.ts';
const casos = [
  // libroSoloInsercion
  ['libroSoloInsercion', M, 'create trigger points_entries_no_cambia before update or delete on points_entries for each row execute function points_entries_inmutable();', ''],
  ['libroSoloInsercion', M, "  if coalesce(current_setting('tl.puntos', true), '') <> 'si' then raise exception 'el libro de puntos solo lo escriben sus funciones (pts_*)'; end if;\n", ''],
  ['libroSoloInsercion', M, 'on points_entries (user_id, rule_key, ref_kind, ref_id) where reverses_id is null;', 'on points_entries (user_id, rule_key, ref_kind, ref_id, id) where reverses_id is null;'],
  ['libroSoloInsercion', T, 'import "server-only";', 'import "server-only";\nexport const borra = `update points_entries set delta = 0 where user_id = $1`;'],
  ['libroSoloInsercion', PU, 'import "server-only";', 'import "server-only";\nexport const marca = `select set_config(\'tl.puntos\', \'si\', true)`;'],
  ['libroSoloInsercion', M, "if tg_op = 'UPDATE' and old.closed_at is not null then raise exception 'un mes cerrado no cambia'; end if;", ''],
  // saldoDerivado
  ['saldoDerivado', PU, 'import "server-only";', 'import "server-only";\nexport const sube = `update community_profiles set rank_level = 5 where user_id = $1`;'],
  ['saldoDerivado', T, 'import "server-only";', 'import "server-only";\nexport const tabla0 = `update monthly_boards set points = 0 where city_id = $1`;'],
  ['saldoDerivado', C, 'import "server-only";', 'import "server-only";\nexport const rango0 = `select pts_rango($1::uuid)`;'],
  ['saldoDerivado', M, "    raise exception 'los puntos y el rango son derivados: solo los escriben el libro y pts_rango';", '    null;'],
  ['saldoDerivado', M, '-- ── Rangos ──', 'update community_profiles set rank_level = 3 where rank_level < 3;\n-- ── Rangos ──'],
  ['saldoDerivado', M, '      points_total = points_total + new.delta,', '      points_total = points_total,'],
  // topeDiario
  ['topeDiario', M, "    if hoy + new.delta > pts_tope() then raise exception 'tope diario de puntos: % + % pasa de %', hoy, new.delta, pts_tope(); end if;", ''],
  ['topeDiario', M, '  d := least(r.points, pts_tope() - hoy);', '  d := r.points;'],
  ['topeDiario', M, "  perform pg_advisory_xact_lock(hashtextextended('pts:' || uid::text, 0));", ''],
  ['topeDiario', M, '  dia := (now() at time zone tz)::date;', "  dia := (now() at time zone 'UTC')::date;"],
  ['topeDiario', PU, 'import "server-only";', 'import "server-only";\nexport const hoyMas = (x: { points_today: number }) => x.points_today + 1;'],
  // votoUnico (sin puntos entre cuentas del mismo dispositivo)
  ['votoUnico', PU, 'if (o.mio !== 1 || !v?.counted || (await mismoDispositivo(c, o.voter, t.autor, o.device)))', 'if (o.mio !== 1 || (await mismoDispositivo(c, o.voter, t.autor, o.device)))'],
  ['votoUnico', PU, 'if (o.mio !== 1 || !v?.counted || (await mismoDispositivo(c, o.voter, t.autor, o.device)))', 'if (o.mio !== 1 || !v?.counted)'],
  ['votoUnico', PU, '  if (await mismoDispositivo(c, o.asker, o.autor, null)) return null;\n', ''],
  ['votoUnico', PU, 'v.counted and not pts_mismo_dispositivo(v.user_id, $3::uuid, v.device)', 'v.counted'],
  ['votoUnico', H, '    const subir = await puntosDelVoto(c, { kind, id, voter: userId, device, mio });', '    const subir = await puntosDelVoto(c, { kind, id, voter: userId, device: null, mio });'],
  ['votoUnico', M, 'from sessions s1 join sessions s2 on s2.device = s1.device where s1.user_id = a and s2.user_id = b', 'from sessions s1 join sessions s2 on s2.id = s1.id where s1.user_id = a and s2.user_id = b'],
  // oficialNoEsPersona (extendido)
  ['oficialNoEsPersona', T, 'import "server-only";', 'import "server-only";\nexport const todos = `select user_id, points from monthly_boards where city_id = $1`;'],
  ['oficialNoEsPersona', M, '  user_id     uuid not null references users (id),\n  city_id     text not null references cities (id),\n  delta', '  user_id     uuid,\n  city_id     text not null references cities (id),\n  delta'],
  ['oficialNoEsPersona', M, "  if uid is null then raise exception 'los puntos son de una persona (la cuenta oficial no gana puntos)'; end if;\n", ''],
  ['oficialNoEsPersona', PU, '  if (!t?.autor) return null;\n', ''],
  ['oficialNoEsPersona', PU, '? `select author_user_id::text as autor, kind', '? `select coalesce(author_user_id, staff_id)::text as autor, kind'],
];
let bien = 0;
for (const [g, f, a, b] of casos) {
  const ruta = `${R}/${f}`;
  if (!fs.existsSync(ruta)) { console.log(`  ✗ ${g}: no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { console.log(`  ✗ ${g}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 60)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, b));
  let falla = false, out = '';
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); } catch (e) { falla = true; out = String(e.stderr).split('\n').find((l) => l.includes('[')) || ''; }
  fs.writeFileSync(ruta, orig);
  console.log(`  ${falla ? '✓' : '✗'} ${g} al revés (${f.split('/').pop()})${out ? ' → ' + out.trim().slice(0, 130) : ''}`); if (falla) bien++;
}
let limpio = true; try { execSync('node guardianes/run.mjs', { cwd: R, stdio: 'pipe' }); } catch { limpio = false; }
console.log(`${bien}/${casos.length} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === casos.length && limpio ? 0 : 1);
