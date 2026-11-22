// Prueba al revés del guardián de 9t (19 nov): topeAyudaDeConfig (el tope de «Ayuda con …» por persona en 24 h sale de Configuración,
// ayuda_tope_dia de 0182, leído en la misma consulta que cuenta; la seguridad nunca se frena). Se inyecta el defecto, el guardián debe fallar
// con SU mensaje ([topeAyudaDeConfig]); se restaura. La prueba de punta a punta del sexto pedido es ayu9t.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const AY = 'apps/web/lib/ayuda.ts', AC = 'apps/web/lib/ayuda-cita.ts', MIG = 'packages/db/migrations/0182_ayuda_tope.sql', CF = 'apps/web/lib/config.ts';
const T = 'topeAyudaDeConfig';
const casos = [
  // el 5 fijo otra vez (pedido y cita)
  [T, AY, 'if (n >= tope) return', 'if (n >= 5) return'],
  [T, AC, 'if (n >= tope && !directo(reason, rubro)) return', 'if (n >= 5 && !directo(reason, rubro)) return'],
  // el tope se lee aparte (con la caché de 15 s) y no en la consulta que cuenta
  [T, AY, ', ${cfgSql("ayuda_tope_dia")} as tope from help_requests', ', 5 as tope from help_requests'],
  // cuenta las de siempre, no las de 24 h
  [T, AC, "as tope from help_requests where user_id = $1 and created_at > now() - interval '1 day'", 'as tope from help_requests where user_id = $1'],
  // un reporte de seguridad frenado por el tope
  [T, AC, 'if (n >= tope && !directo(reason, rubro)) return', 'if (n >= tope) return'],
  // la clave sin sus límites o fuera de Soporte
  [T, MIG, "('ayuda_tope_dia', 1, 50, 5,", "('ayuda_tope_dia', 0, 100000, 5,"],
  [T, MIG, "'soporte',\n", "'comunidad',\n"],
  // la clave fuera de ClaveConfig
  [T, CF, '  | "ayuda_tope_dia"', '  | "ayuda_tope_x"'],
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
let limpio = require('../lib/alreves-fin.cjs')(R, { mostrar: true });
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
