// Prueba al revés de 9f-3 (todas las pantallas por el CMS: cada E2 pasa por dosIdiomas y sus textos se editan en Super Admin › Cadenas). Se inyecta el
// defecto, el guardián debe fallar con SU mensaje ([nombre]); se restaura. «crear»: se crea el archivo, se corre y se borra. Además: el codemod convierte
// cada forma conocida (y deja la que no entiende), es idempotente, y dosIdiomas elige igual que antes sin ediciones y lo editado con ellas.
const ENT = require('../lib/entorno.cjs'); // rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const MOD = 'apps/web/lib/dos-idiomas.ts', CMS = 'apps/web/lib/cms.ts', LAY = 'apps/web/app/layout.tsx', PROV = 'apps/web/app/_cms/EdicionesE2.tsx',
  INS = 'apps/web/instrumentation.ts', AD = 'apps/web/lib/cms-admin.ts', TC = 'apps/web/app/admin/TextosCadenas.tsx', EX = 'scripts/cms/extraer.mjs',
  HOJA = 'apps/web/app/(app)/HojaEntrar.tsx', PANEL = 'apps/web/app/panel/Panel.tsx', APT = 'apps/web/app/(app)/apartado/[num]/ApartadoEstado.tsx',
  CAT = 'apps/web/lib/cms-cadenas-e2.json';
// [guardián, archivo, [[buscar, poner], …]]
const casos = [
  // e2PorElCms: la fábrica busca aunque no haya ediciones; la fábrica importa algo; el servidor manda todo (no solo lo editado); si la base no responde se
  // queda con lo viejo; el layout no envuelve con EdicionesE2; EdicionesE2 en un efecto; el arranque no lo carga; el Super Admin lista las huérfanas; editar no avisa
  ['e2PorElCms', MOD, [['if (c === undefined || c.m.size === 0) return es ? a : b;', 'if (c === undefined) return es ? a : b;']]],
  ['e2PorElCms', MOD, [['type Caja = {', 'import { db } from "./db";\ntype Caja = {']]],
  ['e2PorElCms', CMS, [["where edited and status = 'vivo' and id ~", "where status = 'vivo' and id ~"]]],
  ['e2PorElCms', CMS, [['siFalla: (): E2Leido => ({ v: "", l: [] }),', 'siFalla: (): E2Leido => ({ v: "", l: ultimas }),']]],
  ['e2PorElCms', CMS, [['juntar: true, releer: true,', 'juntar: true,']]],
  ['e2PorElCms', LAY, [['<EdicionesE2 v={ed.v} l={ed.l}><AhoraProvider', '<AhoraProvider'], ['</AhoraProvider></EdicionesE2>', '</AhoraProvider><EdicionesE2 v={ed.v} l={ed.l}>{null}</EdicionesE2>']]],
  ['e2PorElCms', LAY, [['const ed = await edicionesE2();', 'const ed = { v: "", l: [] as const };']]],
  ['e2PorElCms', PROV, [['if (typeof window !== "undefined") ponerEdicionesE2(v, l);', 'useEffect(() => ponerEdicionesE2(v, l), [v, l]);']]],
  ['e2PorElCms', INS, [['Promise.all([edicionesE2(), prepararLlaves()])', 'Promise.all([prepararLlaves()])']]],
  ['e2PorElCms', AD, [['and s.id <> all($5::text[])', 'and $5::text[] is not null']]],
  ['e2PorElCms', TC, [['+ (x.lugares && x.lugares.n > 1 ? E(` Cambia en los', '+ (x.lugares && x.lugares.n > 99 ? E(` Cambia en los']]],
  // cadenaConLlave (trinquete 0): una definición que vuelve a la forma vieja (flecha y useCallback); el catálogo de E2 que no es el del código
  ['cadenaConLlave', HOJA, [['=> dosIdiomas(es, a, b)', '=> (es ? a : b)']]],
  ['cadenaConLlave', PANEL, [['useCallback((a: string, b: string) => dosIdiomas(es, a, b), [es])', 'useCallback((a: string, b: string) => (es ? a : b), [es])']]],
  ['cadenaConLlave', APT, [['"TE LO GUARDAN"', '"TE LO GUARDAMOS"']]],
  ['cadenaConLlave', CAT, [['"es":"TE LO GUARDAN"', '"es":"TE LO GUARDAMOS"']]],
  // lineaFijaBloqueada: el extractor deja sin candado lo del 911 y «nadie te garantiza un resultado»
  ['lineaFijaBloqueada', EX, [['return /\\b911\\b/.test(t) ||', 'return false && /\\b911\\b/.test(t) ||']]],
  // cmsConLimite: el extractor pone a las de E2 un largo que no cabe
  ['cmsConLimite', EX, [['const max_len = locked ? Math.max(p.es.length, p.en.length) : largo(p.es, p.en);', 'const max_len = locked ? Math.max(p.es.length, p.en.length) : 5;']]],
];
const crear = [
  // cadenaConLlave y e2PorElCms: un E2 nuevo con la forma vieja, con «function», o que se salta la fábrica; alguien más toca el mapa; dosIdiomas sin importarlo
  // (el 4.º: el mensaje que tiene que salir; sin textos fijos en E2 para que el catálogo no cambie y no tape el defecto de verdad)
  ['cadenaConLlave', 'apps/web/app/(app)/zz9f3.tsx', 'export function Zz({ es, a1, b1 }: { es: boolean; a1: string; b1: string }) {\n  const E2 = (a: string, b: string) => (es ? a : b);\n  return <p>{E2(a1, b1)}</p>;\n}\n', /no pasa por dosIdiomas \(la forma vieja/],
  ['cadenaConLlave', 'apps/web/lib/zz9f3.ts', 'export function zz(es: boolean, a1: string, b1: string) {\n  function E2(a: string, b: string) { return es ? a : b; }\n  return E2(a1, b1);\n}\n', /no pasa por dosIdiomas/],
  ['e2PorElCms', 'apps/web/lib/zz9f3.ts', 'export const zz = (es: boolean, a1: string, b1: string) => {\n  const E2 = (a: string, b: string) => (es ? b : b);\n  return E2(a1, b1);\n};\n', /devuelve «b : b»/],
  ['e2PorElCms', 'apps/web/lib/zz9f3.ts', 'export function zz() { (globalThis as Record<string, unknown>).__tlEdicionesE2 = undefined; }\n', /solo lo toca lib\/dos-idiomas\.ts/],
  ['e2PorElCms', 'apps/web/lib/zz9f3.ts', 'export const zz = (es: boolean, a1: string, b1: string) => dosIdiomas(es, a1, b1);\n', /sin importarlo/],
];
let bien = 0, total = 0;
const correr = (g, debe = null) => {
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${g}]`) && (!debe || debe.test(x))) ?? ''; return [!!l, l]; }
};
const informe = (g, que, [falla, out]) => { total++; console.log(`  ${falla ? '✓' : '✗'} ${g} al revés (${que})${out ? ' → ' + out.trim().slice(0, 170) : ''}`); if (falla) bien++; };
const ok = (x, m) => { total++; if (x) bien++; console.log(`  ${x ? '✓' : '✗'} ${m}`); };

// Antes de inyectar: los guardianes de 9f-3 pasan limpios (si no, «falla» no probaría nada).
for (const g of ['e2PorElCms', 'cadenaConLlave', 'lineaFijaBloqueada', 'cmsConLimite']) ok(!correr(g)[0], `${g} pasa limpio antes de inyectar`);

for (const [g, f, cambios] of casos) {
  const ruta = path.join(R, f);
  if (!fs.existsSync(ruta)) { total++; console.log(`  ✗ ${g}: no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  const falta = cambios.find(([a]) => !orig.includes(a));
  if (falta) { total++; console.log(`  ✗ ${g}: no encontré el texto a cambiar en ${f}: ${falta[0].slice(0, 70)}`); continue; }
  let t = orig; for (const [a, b] of cambios) t = t.replace(a, () => b);
  fs.writeFileSync(ruta, t);
  let r; try { r = correr(g); } finally { fs.writeFileSync(ruta, orig); }
  informe(g, f.split('/').pop(), r);
}
for (const [g, f, c, debe] of crear) {
  const ruta = path.join(R, f);
  fs.writeFileSync(ruta, c);
  let r; try { r = correr(g, debe); } finally { fs.unlinkSync(ruta); }
  informe(g, `crear ${f.split('/').pop()}`, r);
}

// El codemod: cada forma conocida se convierte a dosIdiomas (igual palabra por palabra), lo que no entiende se queda y se lista; dos veces = nada nuevo.
{
  const f = 'apps/web/lib/zz9f3codemod.ts', ruta = path.join(R, f);
  const src = [
    '"use client";',
    '/* prueba */',
    'import { x } from "./y";',
    'export const a1 = (es: boolean) => { const E2 = (a: string, b: string) => (es ? a : b); return E2("Uno", "One"); };',
    'export const a2 = (en: boolean) => { const E2 = (a: string, b: string) => (en ? b : a); return E2("Dos", "Two"); };',
    'export const a3 = (o: { es?: boolean }) => { const E2 = (x: string, y: string) => (o.es ? x : y); return E2("Tres", "Three"); };',
    'export const a4 = (lang: string) => { const E2 = (es: string, en: string) => (lang === "es" ? es : en); return E2("Cuatro", "Four"); };',
    'export const a5 = (es: boolean) => { const E2 = (a: string, b: string) => (es ? b : b); return E2("Cinco", "Five"); };',
    'export const a6 = (c: { E2: (a: string, b: string) => string }) => { const E2 = c.E2; return E2("Seis", "Six"); };',
    'void x;',
  ].join('\n') + '\n';
  fs.writeFileSync(ruta, src);
  try {
    const o1 = execSync('node scripts/cms/e2-al-cms.mjs', { cwd: R, encoding: 'utf8' });
    const t = fs.readFileSync(ruta, 'utf8');
    ok(/4 definiciones convertidas en 1 archivos/.test(o1), 'el codemod convierte las 4 formas conocidas de este archivo (y nada más del árbol: ya estaba convertido)');
    ok(t.includes('const E2 = (a: string, b: string) => dosIdiomas(es, a, b)') && t.includes('const E2 = (a: string, b: string) => dosIdiomas(!en, a, b)')
      && t.includes('const E2 = (x: string, y: string) => dosIdiomas(o.es, x, y)') && t.includes('const E2 = (es: string, en: string) => dosIdiomas(lang === "es", es, en)'), 'es ? a : b · en ? b : a · o.es ? x : y · lang === "es" ? es : en → dosIdiomas con la misma condición');
    ok(t.includes('(es ? b : b)') && /1 sin convertir/.test(o1) && /zz9f3codemod\.ts:\d+ — devuelve «b : b»/.test(o1), 'la que no puede probar igual (es ? b : b) la deja y la lista con su razón');
    ok(t.includes('const E2 = c.E2;'), 'E2 = c.E2 (el de otro) no se toca');
    ok(t.split('\n')[3] === 'import { dosIdiomas } from "@/lib/dos-idiomas";' && t.startsWith('"use client";\n'), 'el import va después de los demás imports, con "use client" primero');
    const o2 = execSync('node scripts/cms/e2-al-cms.mjs', { cwd: R, encoding: 'utf8' });
    ok(/^e2-al-cms: 0 definiciones convertidas en 0 archivos/.test(o2) && fs.readFileSync(ruta, 'utf8') === t, 'idempotente: la segunda vez no cambia nada');
    let fallo = false; try { execSync('node scripts/cms/e2-al-cms.mjs --verificar', { cwd: R, stdio: 'pipe' }); } catch { fallo = true; }
    ok(fallo, '--verificar falla mientras quede una definición sin convertir');
  } finally { fs.unlinkSync(ruta); }
}

// dosIdiomas: sin ediciones elige igual que antes; con ediciones, solo el par exacto cambia; otra versión reemplaza el mapa.
{
  const out = execSync(`node --input-type=module -e '
    const m = await import(${JSON.stringify(path.join(R, MOD))});
    const r = [];
    r.push(m.dosIdiomas(true, "Guardar", "Save"), m.dosIdiomas(false, "Guardar", "Save"), m.dosIdiomas(0, "Guardar", "Save"));
    m.ponerEdicionesE2("v1", [["Guardar", "Save", "Guardar cambios", "Save changes"]]);
    r.push(m.dosIdiomas(true, "Guardar", "Save"), m.dosIdiomas(false, "Guardar", "Save"), m.dosIdiomas(true, "Guardar", "Keep"), m.dosIdiomas(true, "Cerrar", "Close"), m.versionEdicionesE2());
    m.ponerEdicionesE2("", []);
    r.push(m.dosIdiomas(true, "Guardar", "Save"));
    console.log(JSON.stringify(r));'`, { cwd: R, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  const r = JSON.parse(out.trim().split('\n').pop());
  ok(r[0] === 'Guardar' && r[1] === 'Save' && r[2] === 'Save', 'sin ediciones: es ? a : b (también con un valor falso que no es false)');
  ok(r[3] === 'Guardar cambios' && r[4] === 'Save changes', 'con la edición del par: el texto editado en los dos idiomas');
  ok(r[5] === 'Guardar' && r[6] === 'Cerrar' && r[7] === 'v1', 'solo el par EXACTO cambia («Guardar»/«Keep» y «Cerrar» siguen como en el código)');
  ok(r[8] === 'Guardar', 'sin ediciones otra vez: vuelve el texto del código');
}

console.log(`\nalreves9f3: ${bien}/${total}`);
if (bien !== total) process.exit(1);
