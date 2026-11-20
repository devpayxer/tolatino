// Prueba al revés de los guardianes toqueEsperaLaPantalla y auditoriaDelAdminConElCambio (20 nov, CI en el ancho 1024: dep4c «$25 al mes ·
// inscripción $10» y evt6e «ASSERT en la auditoría»). Dos carreras: (1) la prueba tocaba un paso del panel con la pantalla todavía vieja (la base
// ya tenía el guardado, la pantalla no) y el toque caía en el paso de al lado; (2) el Super Admin escribía su renglón de auditoría en otra
// transacción, después de devolver. Se inyecta cada defecto, el guardián debe fallar con SU mensaje ([nombre]); se restaura.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const D = 'pruebas/e2e/dep4c.cjs', E = 'pruebas/e2e/evt6e.cjs', A = 'apps/web/app/admin/acciones-eventos.ts', L = 'apps/web/lib/evt-cambios.ts';
const T = 'toqueEsperaLaPantalla', U = 'auditoriaDelAdminConElCambio';
const casos = [
  // El defecto original: la mensualidad y la inscripción se tocan seguidas, sin esperar la pantalla.
  [T, D, "  await toque(p, 'Mensualidad', '+', '$26');\n  await toque(p, 'Cuota de inscripción', '+', '$5');\n", "  await clic(p.getByRole('button', { name: 'Mensualidad +' }));\n  await clic(p.getByRole('button', { name: 'Cuota de inscripción +' }));\n"],
  // Un solo paso tocado a mano (sin toque()).
  [T, D, "  await toque(p, 'Pase de un día', '+', '$11');\n", "  await clic(p.getByRole('button', { name: 'Pase de un día +' }));\n"],
  // Tocar la mensualidad sin esperar a que la pantalla quite «Cancelar antes de tiempo cuesta».
  [T, D, "  ok(await veo(async () => (await p.getByRole('button', { name: 'Cancelar antes de tiempo cuesta +', exact: true }).count()) === 0), 'sin contrato: la pantalla ya no pregunta lo que cuesta cancelar antes');\n", ''],
  // La pausa fija entre toques, como estaba.
  [T, D, "  for (let i = 0; i < 4 && (await valor(p, 'Equipos que faltan')) !== 'Llena'; i++) await toque(p, 'Equipos que faltan', '−');\n", "  for (let i = 0; i < 4; i++) { await clic(p.getByRole('button', { name: 'Equipos que faltan −' })); await espera(() => false, 600); }\n"],
  // Un toque() que ya no mira la pantalla.
  [T, D, 'return dice !== null && (v === undefined ? dice !== antes : dice === v); });', 'return true; });'],
  // La auditoría del admin otra vez aparte, después de devolver (como estaba).
  [U, A, '"event", null, "admin", m,\n    (c, g) => auditar(c, { actor: s.id, action: "evento.cancelar", targetKind: "event", targetId: String(id), after: { por_devolver: g.porDevolver, regla: "cancela el evento → devolución total" }, reason: m }));\n  if (!r.ok) return no(r.msg.es);\n',
    '"event", null, "admin", m);\n  if (!r.ok) return no(r.msg.es);\n  await tx((c) => auditar(c, { actor: s.id, action: "evento.cancelar", targetKind: "event", targetId: String(id), after: { devueltas: r.devueltas, pendientes: r.pendientes, regla: "cancela el evento → devolución total" }, reason: m }));\n'],
  [U, A, '!!congelar, m,\n    (c) => auditar(c, {', '!!congelar, m);\n  await tx((c) => auditar(c, {'],
  // La función de lib deja de escribir la auditoría dentro de su transacción.
  [U, L, 'if (alGuardar) await alGuardar(c, { porDevolver: ', 'if (alGuardar) void ({ porDevolver: '],
  [U, L, "      if (congelar) aviso = { biz: e.biz, t: e.t };\n      await alGuardar?.(c);\n", "      if (congelar) aviso = { biz: e.biz, t: e.t };\n"],
  // La prueba afloja: espera el renglón, o deja de decir cuántos hay.
  [U, E, "    const audX = sql(`select count(*) from audit_entries where action = 'evento.cancelar' and target_id = '${E.id}'`);\n    ok(audX === '1', ", "    const audX = '1'; ok(await espera(() => sql(`select count(*) from audit_entries where action = 'evento.cancelar' and target_id = '${E.id}'`) === '1'), "],
  [U, E, "ok(audX === '1', `en la auditoría: un renglón «evento.cancelar» escrito con la cancelación (hay ${audX})`);", "ok(audX !== '0', 'en la auditoría');"],
];
let bien = 0, total = 0;
const correr = (g) => {
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${g}]`)) ?? ''; return [!!l, l]; }
};
const informe = (g, que, [falla, out]) => { total++; console.log(`  ${falla ? '✓' : '✗'} ${g} al revés (${que})${out ? ' → ' + out.trim().slice(0, 170) : ''}`); if (falla) bien++; };
for (const [g, f, a, b] of casos) {
  const ruta = path.join(R, f);
  if (!fs.existsSync(ruta)) { total++; console.log(`  ✗ no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r; try { r = correr(g); } finally { fs.writeFileSync(ruta, orig); }
  informe(g, f.split('/').pop(), r);
}
let limpio = true; try { execSync('node guardianes/run.mjs', { cwd: R, stdio: 'pipe' }); } catch (e) { limpio = false; console.log(String(e.stderr).slice(0, 600)); }
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
