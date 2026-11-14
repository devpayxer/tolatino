// Prueba al revés de los guardianes de 9a: pruebaSinSecretos, sinEnConstruccion, revisionVeCiudadAbierta, launchConDestino, e2eEnElRepo y la
// parte nueva de pedidoHorasOpcionales («antes de las null»). Se inyecta el defecto, el guardián debe fallar con SU mensaje ([nombre]); se
// restaura. «crear»: se crea el archivo, se corre y se borra. Los secretos de mentira se arman en el momento (este archivo no lleva ninguno).
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const LC = 'docs/LAUNCH-CHECKLIST.md', DA = 'docs/DESPUES-DE-ABRIR.md', PR = 'docs/PROGRESS.md', S48 = 'infra/pruebas/semilla/0048_revision.sql',
  S02 = 'infra/pruebas/semilla/0002_ciudad.sql', S49 = 'infra/pruebas/semilla/0049_base_nueva.sql', PED = 'apps/web/app/panel/Pedidos.tsx', AN = 'apps/web/lib/admin-nav.ts';
const hex = '0123456789abcdef'.repeat(3), b64 = 'Qk1' + 'xYzA9'.repeat(12), tel = '570' + '5547' + '747', casa = '/ho' + 'me/user/proyecto';
const casos = [
  // pruebaSinSecretos (sobre una prueba de verdad)
  ['pruebaSinSecretos', 'pruebas/e2e/webhook2d.cjs', "const crypto = require('crypto');", `const crypto = require('crypto'); const X = '${'BARRIDO_' + 'TOKEN'}=${hex}';`],
  ['pruebaSinSecretos', 'pruebas/e2e/webhook2d.cjs', "const crypto = require('crypto');", `const crypto = require('crypto'); const Y = 'abc'; // ${'REVISION_CODIGO_' + 'CLIENTE'}=123456`],
  ['pruebaSinSecretos', 'pruebas/e2e/webhook2d.cjs', "const crypto = require('crypto');", `const crypto = require('crypto'); const Z = '${hex}';`],
  ['pruebaSinSecretos', 'pruebas/e2e/webhook2d.cjs', "const crypto = require('crypto');", `const crypto = require('crypto'); const W = '${b64}';`],
  ['pruebaSinSecretos', 'pruebas/e2e/webhook2d.cjs', "const crypto = require('crypto');", `const crypto = require('crypto'); const T = '${tel}';`],
  ['pruebaSinSecretos', 'pruebas/e2e/webhook2d.cjs', "const crypto = require('crypto');", `const crypto = require('crypto'); const H = '${casa}';`],
  ['pruebaSinSecretos', 'pruebas/e2e/webhook2d.cjs', "const crypto = require('crypto');", `const crypto = require('crypto'); const K = '${'wh' + 'sec_'}${'a1B2c3D4e5'.repeat(2)}';`],
  ['pruebaSinSecretos', 'pruebas/servir/servir.sh', 'pon AUTH_SECRET "$(hex 32)"', `pon AUTH_SECRET "$(hex 32)"\n${'AUTH_' + 'SECRET'}=local-${'s'.repeat(20)}`],
  // sinEnConstruccion: con TOLATINO_FASE=9 la sección pendiente del Super Admin (mkt) rompe; sin la fase, una página que dice «EN CONSTRUCCIÓN»
  ['sinEnConstruccion', AN, '  cont: "Fase 2",\n', '  cont: "Fase 2", cms: "Fase 9", zz: "Fase 9",\n', { TOLATINO_FASE: '9' }],
  // revisionVeCiudadAbierta
  ['revisionVeCiudadAbierta', S48, "('+14845550183', 'Revisión', 'Repartidor', 'en', 'hzl'", "('+14845550183', 'Revisión', 'Repartidor', 'en', 'alw'"],
  ['revisionVeCiudadAbierta', S48, "values ('revision-tolatino', 'hzl',", "values ('revision-tolatino', 'scr',"],
  ['revisionVeCiudadAbierta', S02, "update cities set status = 'on'", "update cities set status = 'soon'"],
  ['revisionVeCiudadAbierta', S49, "('+15705550155', now(), 'Lucía', 'Prueba', 'hzl')", "('+15705550155', now(), 'Lucía', 'Prueba', 'rdg')"],
  // launchConDestino
  ['launchConDestino', LC, '## Infraestructura\n', '## Infraestructura\n- [ ] **Algo nuevo** sin destino.\n'],
  ['launchConDestino', LC, '## Infraestructura\n', '## Infraestructura\n- [ ] **→ 9z** · un bloque que no existe.\n'],
  ['launchConDestino', LC, '## Infraestructura\n', '## Infraestructura\n- [ ] **→ 9a** · 9a ya cerró.\n'],
  ['launchConDestino', LC, '## Infraestructura\n', '## Infraestructura\n- **Una viñeta suelta** sin casilla.\n'],
  ['launchConDestino', LC, '## Infraestructura\n', '## Infraestructura\n- [x] **→ después de abrir (DA-99)** · algo que no está en DESPUES.\n'],
  ['launchConDestino', DA, '## Desde LAUNCH-CHECKLIST (9a)\n', '## Desde LAUNCH-CHECKLIST (9a)\n\n- **DA-98** · algo que no está en LAUNCH.\n'],
  ['launchConDestino', LC, '- [x] **→ después de abrir (DA-01)**', '- [ ] **→ después de abrir (DA-01)**'],
  ['launchConDestino', LC, '## Infraestructura\n', '## Infraestructura\n', { TOLATINO_FASE: '9' }],
  // e2eEnElRepo
  ['e2eEnElRepo', PR, '# ', '# Prueba nueva `zzpq9q` que nadie subió.\n# '],
  // pedidoHorasOpcionales (9a): la hora de respuesta interpolada tal cual
  ['pedidoHorasOpcionales', PED, 'Si no respondes antes de las ${plazo}, se cancela solo.`', 'Si no respondes antes de las ${x.responde}, se cancela solo.`'],
];
const crear = [
  ['pruebaSinSecretos', 'pruebas/e2e/zz-secretos.env', 'X=1\n'],
  ['pruebaSinSecretos', 'pruebas/lib/zz-llave.cjs', `module.exports = '${'-----BEGIN ' + 'PRIVATE KEY-----'}\\n${'A'.repeat(64)}';\n`],
  ['sinEnConstruccion', 'apps/web/app/(app)/Pronto.tsx', 'export function Pronto() { return null; }\n'],
  ['sinEnConstruccion', 'apps/web/app/(app)/zz9a/page.tsx', 'export default function P() { return <main>EN CONSTRUCCIÓN · 9z</main>; }\n'],
];
let bien = 0, total = 0;
const correr = (g, env = {}) => {
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe', env: { ...process.env, ...env } }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${g}]`)) ?? ''; return [!!l, l]; } // un fallo de verdad (no el aviso «⚠»)
};
const informe = (g, que, [falla, out]) => { total++; console.log(`  ${falla ? '✓' : '✗'} ${g} al revés (${que})${out ? ' → ' + out.trim().slice(0, 170) : ''}`); if (falla) bien++; };
for (const [g, f, a, b, env] of casos) {
  const ruta = path.join(R, f);
  if (!fs.existsSync(ruta)) { total++; console.log(`  ✗ ${g}: no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ ${g}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r; try { r = correr(g, env); } finally { fs.writeFileSync(ruta, orig); }
  informe(g, `${f.split('/').pop()}${env ? ' con TOLATINO_FASE=9' : ''}`, r);
}
for (const [g, f, c] of crear) {
  const ruta = path.join(R, f), dir = path.dirname(ruta), nuevo = !fs.existsSync(dir);
  fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(ruta, c);
  let r; try { r = correr(g); } finally { fs.unlinkSync(ruta); if (nuevo) try { fs.rmdirSync(dir); } catch { /* no vacía */ } }
  informe(g, `crear ${f.split('/').pop()}`, r);
}
// e2eEnElRepo: quitar una prueba que PROGRESS nombra
{ const f = path.join(R, 'pruebas/e2e/evt6c.cjs'), x = f + '.zz9a'; fs.renameSync(f, x); let r; try { r = correr('e2eEnElRepo'); } finally { fs.renameSync(x, f); } informe('e2eEnElRepo', 'sin evt6c en el repo', r); }
// Y sin defectos, todos limpios (sinEnConstruccion y launchConDestino solo AVISAN fuera de la Fase 9).
let limpio = true; try { execSync('node guardianes/run.mjs', { cwd: R, stdio: 'pipe' }); } catch (e) { limpio = false; console.log(String(e.stderr).slice(0, 600)); }
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
