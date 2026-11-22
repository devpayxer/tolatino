// Prueba al revés de cacheConGeneracion (22 nov, LAUNCH «Caché de Configuración, del producto»): las copias que la base olvida por aviso se guardan solo
// con lib/cache-aviso.ts, que lleva la generación (una lectura que salió antes de un cambio y vuelve después del aviso no guarda lo viejo). Se inyecta el defecto, el guardián debe fallar con SU mensaje ([nombre]); se restaura. «crear»: se
// crea el archivo, se corre y se borra.
const ENT = require('../lib/entorno.cjs'); // rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const H = 'apps/web/lib/cache-aviso.ts', CC = 'apps/web/lib/cambios-config.ts', CF = 'apps/web/lib/config.ts',
  VI = 'apps/web/lib/vitales.ts';
const G = 'cacheConGeneracion';
const casos = [
  // (1) El ayudante: guarda sin mirar la generación; el aviso no la sube; se junta con la lectura de antes del aviso; pone (alGuardar) aunque no guarde;
  //     anota la generación al volver (no al salir); el aviso no olvida
  [H, 'if (g === gen) { copias.set(k, { hasta: Date.now() + ms, v }); o.alGuardar?.(v); }', '{ copias.set(k, { hasta: Date.now() + ms, v }); o.alGuardar?.(v); }'],
  [H, 'const olvidar = () => { gen++; copias.clear(); enVuelo.clear(); };', 'const olvidar = () => { copias.clear(); enVuelo.clear(); };'],
  [H, 'if (x && x.gen === gen) return x.p;', 'if (x) return x.p;'],
  [H, 'if (g === gen) { copias.set(k, { hasta: Date.now() + ms, v }); o.alGuardar?.(v); }', 'if (g === gen) copias.set(k, { hasta: Date.now() + ms, v });\n    o.alGuardar?.(v);'],
  [H, '    const g = gen;\n    let v: V, ms = o.ttlMs;\n    try { v = await o.cargar(...a); }', '    let v: V, ms = o.ttlMs;\n    try { v = await o.cargar(...a); }\n    const g = gen;'],
  [H, 'alCambiarConfig(() => { olvidar();', 'alCambiarConfig(() => { copias.clear();'],
  // (2) Una copia que vuelve a registrarse a mano (la de Configuración, como estaba antes)
  [CF, 'import { cacheConAviso } from "./cache-aviso";', 'import { cacheConAviso } from "./cache-aviso";\nimport { alCambiarConfig } from "./cambios-config";\nlet cache: Map<string, number> | null = null;\nalCambiarConfig(() => { cache = null; });'],
  // (3) Un interruptor guardado a mano con hora (el de app.vitals)
  [VI, 'const encendido = (): Promise<boolean> => FLAG.leer();', 'let flag: { at: number; on: boolean } | null = null;\nasync function encendido() {\n  if (flag && Date.now() - flag.at < 30_000) return flag.on;\n  const on = (await db().query<{ enabled: boolean }>(`select enabled from feature_flags where key = \'app.vitals\'`)).rows[0]?.enabled === true;\n  flag = { at: Date.now(), on };\n  return on;\n}'],
];
const crear = [
  // Una caché nueva que se registra a mano con alCambiarConfig (la forma de antes: tiene la carrera)
  ['apps/web/lib/zzcachegen.ts', 'import "server-only";\nimport { alCambiarConfig } from "./cambios-config";\nimport { db } from "./db";\nlet c: { at: number; v: unknown[] } | null = null, escucha = false;\nexport async function reglas() {\n  if (!escucha) { escucha = true; alCambiarConfig(() => { c = null; }); }\n  if (c && Date.now() - c.at < 15_000) return c.v;\n  c = { at: Date.now(), v: (await db().query(`select key from mod_rules`)).rows };\n  return c.v;\n}\n'],
  // Una copia con hora de las ciudades sin registrarse (ni a mano ni con el ayudante)
  ['apps/web/lib/zzcachegen.ts', 'import "server-only";\nimport { db } from "./db";\nlet c: { at: number; v: unknown[] } | null = null;\nexport async function barrios() {\n  if (c && Date.now() - c.at < 60_000) return c.v;\n  c = { at: Date.now(), v: (await db().query(`select id from zones`)).rows };\n  return c.v;\n}\n'],
];
let bien = 0, total = 0;
const correr = (g) => {
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${g}]`)) ?? ''; return [!!l, l]; }
};
const informe = (que, [falla, out]) => { total++; console.log(`  ${falla ? '✓' : '✗'} ${G} al revés (${que})${out ? ' → ' + out.trim().slice(0, 170) : ''}`); if (falla) bien++; };
for (const [f, a, b] of casos) {
  const ruta = path.join(R, f);
  if (!fs.existsSync(ruta)) { total++; console.log(`  ✗ ${G}: no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ ${G}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r; try { r = correr(G); } finally { fs.writeFileSync(ruta, orig); }
  informe(f.split('/').pop(), r);
}
for (const [f, c] of crear) {
  const ruta = path.join(R, f);
  fs.writeFileSync(ruta, c);
  let r; try { r = correr(G); } finally { fs.unlinkSync(ruta); }
  informe(`crear ${f.split('/').pop()}`, r);
}
let limpio = require('../lib/alreves-fin.cjs')(R, { mostrar: true });
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
if (bien !== total || !limpio) process.exit(1);
