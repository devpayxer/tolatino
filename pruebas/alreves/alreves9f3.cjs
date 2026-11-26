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
  ['e2PorElCms', TC, [['+ (x.lugares && x.lugares.n > 1 ? E2(` Cambia en los', '+ (x.lugares && x.lugares.n > 99 ? E2(` Cambia en los']]],
  // cadenaConLlave (trinquete 0): una definición que vuelve a la forma vieja (flecha y useCallback); el catálogo de E2 que no es el del código
  ['cadenaConLlave', HOJA, [['=> dosIdiomas(es, a, b)', '=> (es ? a : b)']]],
  ['cadenaConLlave', PANEL, [['useCallback((a: string, b: string) => dosIdiomas(es, a, b), [es])', 'useCallback((a: string, b: string) => (es ? a : b), [es])']]],
  ['cadenaConLlave', APT, [['"TE LO GUARDAN"', '"TE LO GUARDAMOS"']]],
  ['cadenaConLlave', CAT, [['"es":"TE LO GUARDAN"', '"es":"TE LO GUARDAMOS"']]],
  // 26 nov (2) · La config de «Publica tu negocio»: datos.ts cambia sin regenerar cadenas.ts (el guardián pide correr el generador).
  ['cadenaConLlave', 'apps/web/lib/onb/datos.ts', [['No editar a mano', 'No editar a mano!']]],
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
  // 25 nov · Un ayudante que recibe los dos idiomas y llama E2(a, b), llamado con dos textos fijos (como soltado(…) del apartado): sus textos se salen del CMS.
  ['cadenaConLlave', 'apps/web/app/(app)/zz9f3.tsx', 'import { dosIdiomas } from "@/lib/dos-idiomas";\nexport function Zz({ es, ok }: { es: boolean; ok: boolean }) {\n  const E2 = (a: string, b: string) => dosIdiomas(es, a, b);\n  const dice = (a1: string, b1: string) => (ok ? E2(a1, b1) : "");\n  return <p>{dice("Se liberó lo retenido", "The hold was released")}</p>;\n}\n', /pasa dos textos fijos a un ayudante que llama E2\(a1, b1\)/],
  ['cadenaConLlave', 'apps/web/app/(app)/zz9f3.tsx', 'import { dosIdiomas } from "@/lib/dos-idiomas";\nexport function Zz({ es, ok }: { es: boolean; ok: boolean }) {\n  const E2 = (a: string, b: string) => dosIdiomas(es, a, b);\n  const dice = (x: string, y: string) => ok ? E2(x, y) : "";\n  return <p>{dice(`Se liberó`, \'Released\')}</p>;\n}\n', /dice\("…", "…"\) pasa dos textos fijos/],
  // 25 nov · La familia de las listas: pares ES/EN escritos sin E2 en una lista u objeto, que después pasan a E2(a, b) por variable (DOCS.map(([k, a, b]) => E2(a, b)),
  // E2(DS[z][0], DS[z][1])): sus textos se salen del CMS.
  ['cadenaConLlave', 'apps/web/app/(app)/zz9f3.tsx', 'import { dosIdiomas } from "@/lib/dos-idiomas";\nconst DOCS: [string, string, string][] = [["lic", "Licencia", "License"], ["otro", "Otro", "Other"]];\nexport function Zz({ es }: { es: boolean }) {\n  const E2 = (a: string, b: string) => dosIdiomas(es, a, b);\n  return <p>{DOCS.map(([k, a, b]) => <i key={k}>{E2(a, b)}</i>)}</p>;\n}\n', /DOCS guarda pares ES\/EN sin E2/],
  ['cadenaConLlave', 'apps/web/app/(app)/zz9f3.tsx', 'import { dosIdiomas } from "@/lib/dos-idiomas";\nconst DS: [string, string][] = [["Dom", "Sun"], ["Lun", "Mon"]];\nexport function Zz({ es, z }: { es: boolean; z: number }) {\n  const E2 = (a: string, b: string) => dosIdiomas(es, a, b);\n  return <p>{E2(DS[z]![0], DS[z]![1])}</p>;\n}\n', /DS guarda pares ES\/EN sin E2/],
  // 26 nov · La familia de elegir idioma por índice sin pasar por E2: una tabla de pares ES/EN fijos que se elige con T[i][es ? 0 : 1], con es ? m[0] : m[1] (m = T[i]) o con
  // es ? T[i][0] : T[i][1]; un E2(X[0], X[1]) que saca los dos textos de un dato por índice (c.cta); y el Super Admin con su E(…, …) en vez de E2.
  ['cadenaConLlave', 'apps/web/app/(app)/zz9f3.tsx', 'import { dosIdiomas } from "@/lib/dos-idiomas";\nconst MESX = [["ene", "Jan"], ["feb", "Feb"]];\nexport function Zz({ es, i }: { es: boolean; i: number }) {\n  const E2 = (a: string, b: string) => dosIdiomas(es, a, b);\n  return <p>{E2("Mes", "Month")} {MESX[i]![es ? 0 : 1]}</p>;\n}\n', /MESX guarda pares ES\/EN de textos fijos y los elige por índice/],
  ['cadenaConLlave', 'apps/web/app/(app)/zz9f3.tsx', 'import { dosIdiomas } from "@/lib/dos-idiomas";\nconst MESX: [string, string][] = [["ene", "Jan"], ["feb", "Feb"]];\nexport function Zz({ es, i }: { es: boolean; i: number }) {\n  const E2 = (a: string, b: string) => dosIdiomas(es, a, b);\n  const m = MESX[i]!;\n  return <p>{E2("Mes", "Month")} {es ? m[0] : m[1]}</p>;\n}\n', /MESX guarda pares ES\/EN de textos fijos y los elige por índice/],
  ['cadenaConLlave', 'apps/web/app/(app)/zz9f3.tsx', 'import { dosIdiomas } from "@/lib/dos-idiomas";\nconst OCCX: Record<string, [string, string]> = { a: ["A bailar", "Dancing"], b: ["Cumpleaños", "Birthday"] };\nexport function Zz({ es, k }: { es: boolean; k: string }) {\n  const E2 = (a: string, b: string) => dosIdiomas(es, a, b);\n  return <p>{E2("Ocasión", "Occasion")} {es ? OCCX[k]![0] : OCCX[k]![1]}</p>;\n}\n', /OCCX guarda pares ES\/EN de textos fijos y los elige por índice/],
  ['cadenaConLlave', 'apps/web/app/(app)/zz9f3.tsx', 'import { dosIdiomas } from "@/lib/dos-idiomas";\nexport function Zz({ es, c }: { es: boolean; c: { cta: string[] } }) {\n  const E2 = (a: string, b: string) => dosIdiomas(es, a, b);\n  return <p>{E2(c.cta[0], c.cta[1])}</p>;\n}\n', /E2\(c\.cta\[0\], c\.cta\[1\]\) saca los dos textos de un dato por índice/],
  ['cadenaConLlave', 'apps/web/app/admin/zz9f3.tsx', '"use client";\nexport function Zz({ l }: { l: string }) {\n  const E = (a: string, b: string) => (l === "es" ? a : b);\n  return <p>{E("Guardar cambios", "Save changes")}</p>;\n}\n', /el Super Admin escribe E\("…", "…"\)/],
  // 26 nov (2) · Tabla `{ es: [...], en: [...] }` elegida con DOW[es ? "es" : "en"]; tabla de tuplas [clave, es, en] elegida con .map(([k, a, b]) => … es ? a : b).
  ['cadenaConLlave', 'apps/web/app/(app)/zz9f3.tsx', 'import { dosIdiomas } from "@/lib/dos-idiomas";\nconst DOWX = { es: ["DOM", "LUN"], en: ["SUN", "MON"] };\nexport function Zz({ es, i }: { es: boolean; i: number }) {\n  const E2 = (a: string, b: string) => dosIdiomas(es, a, b);\n  return <p>{E2("Día", "Day")} {DOWX[es ? "es" : "en"][i]}</p>;\n}\n', /DOWX guarda textos fijos como \{ es: \[\.\.\.\], en: \[\.\.\.\] \}/],
  ['cadenaConLlave', 'apps/web/app/(app)/zz9f3.tsx', 'import { dosIdiomas } from "@/lib/dos-idiomas";\nconst LUZ: [string, string, string][] = [["ce", "Motor", "Engine"], ["bat", "Batería", "Battery"]];\nexport function Zz({ es }: { es: boolean }) {\n  const E2 = (a: string, b: string) => dosIdiomas(es, a, b);\n  return <p>{E2("Luces", "Lights")} {LUZ.map(([k, a, b]) => <i key={k}>{es ? a : b}</i>)}</p>;\n}\n', /LUZ guarda tuplas de textos fijos \[clave, es, en\]/],
  // 26 nov (4) · El Super Admin: las otras formas de la misma familia. Una tabla de pares elegida con [li] (li = en ? 1 : 0); una tabla y su gemela _EN elegidas con en ? X_EN : X;
  // un en ? { … } : { … } con dos objetos de textos; la tupla [k, l, lEn] elegida con en ? lEn : l; la tabla { es, en } elegida con .en/.es; y E2(X[k]![0], X[k]![1]) con el `!` del índice.
  ['cadenaConLlave', 'apps/web/app/admin/zz9f3.tsx', 'import { dosIdiomas } from "@/lib/dos-idiomas";\nconst VEHX: Record<string, [string, string]> = { a: ["Auto", "Car"], b: ["Moto", "Bike"] };\nexport function Zz({ es }: { es: boolean }) {\n  const E2 = (a: string, b: string) => dosIdiomas(es, a, b), en = !es, li = en ? 1 : 0;\n  return <p>{E2("Vehículo", "Vehicle")} {VEHX.a?.[li]}</p>;\n}\n', /VEHX guarda pares ES\/EN de textos fijos y los elige por índice/],
  ['cadenaConLlave', 'apps/web/app/admin/zz9f3.tsx', 'import { dosIdiomas } from "@/lib/dos-idiomas";\nconst STX: Record<string, string> = { a: "Pendiente" };\nconst STX_EN: Record<string, string> = { a: "Pending" };\nexport function Zz({ es }: { es: boolean }) {\n  const E2 = (a: string, b: string) => dosIdiomas(es, a, b), en = !es;\n  return <p>{E2("Estado", "Status")} {(en ? STX_EN : STX).a}</p>;\n}\n', /STX_EN guarda textos fijos en dos idiomas/],
  ['cadenaConLlave', 'apps/web/app/admin/zz9f3.tsx', 'import { dosIdiomas } from "@/lib/dos-idiomas";\nexport function Zz({ es }: { es: boolean }) {\n  const E2 = (a: string, b: string) => dosIdiomas(es, a, b), en = !es;\n  const REPX: Record<string, string> = en ? { a: "Spam" } : { a: "Correo basura" };\n  return <p>{E2("Motivo", "Reason")} {REPX.a}</p>;\n}\n', /en \? \{ … \} : \{ … \} guarda textos fijos en dos idiomas/],
  ['cadenaConLlave', 'apps/web/app/admin/zz9f3.tsx', 'import { dosIdiomas } from "@/lib/dos-idiomas";\nexport function Zz({ es }: { es: boolean }) {\n  const E2 = (a: string, b: string) => dosIdiomas(es, a, b), en = !es;\n  return <p>{E2("Filtro", "Filter")} {([["a", "Todos", "All"]] as const).map(([k, l, lEn]) => <i key={k}>{en ? lEn : l}</i>)}</p>;\n}\n', /en \? lEn : … guarda textos fijos en dos idiomas/],
  ['cadenaConLlave', 'apps/web/app/admin/zz9f3.tsx', 'import { dosIdiomas } from "@/lib/dos-idiomas";\nconst SANX: Record<string, { es: string; en: string }> = { a: { es: "Aviso", en: "Warning" } };\nexport function Zz({ es, k }: { es: boolean; k: string }) {\n  const E2 = (a: string, b: string) => dosIdiomas(es, a, b), en = !es;\n  return <p>{E2("Sanción", "Sanction")} {en ? SANX[k]!.en : SANX[k]!.es}</p>;\n}\n', /SANX guarda textos fijos en dos idiomas/],
  ['cadenaConLlave', 'apps/web/app/admin/zz9f3.tsx', 'import { dosIdiomas } from "@/lib/dos-idiomas";\nconst TIPOX: Record<string, [string, string]> = { a: ["Pedido", "Order"] };\nexport function Zz({ es, k }: { es: boolean; k: string }) {\n  const E2 = (a: string, b: string) => dosIdiomas(es, a, b);\n  return <p>{E2(TIPOX[k]![0], TIPOX[k]![1])}</p>;\n}\n', /E2\(TIPOX\[k\]!\[0\], TIPOX\[k\]!\[1\]\) saca los dos textos de un dato por índice/],
];
// 26 nov (3) · Una tabla EXPORTADA de pares ES/EN que se elige en OTRO archivo (OCASIONES en lib/…-comun.ts, elegida en la pantalla): [guardián, [[archivo, contenido], …], mensaje].
const dosArchivos = [
  ['cadenaConLlave', [['apps/web/lib/zz9f3cruce.ts', 'export const CRX: [string, string, string][] = [["a", "Uno", "One"], ["b", "Dos", "Two"]];\n'],
    ['apps/web/app/(app)/zz9f3cruce.tsx', 'import { dosIdiomas } from "@/lib/dos-idiomas";\nimport { CRX } from "@/lib/zz9f3cruce";\nexport function Zz({ es }: { es: boolean }) {\n  const E2 = (a: string, b: string) => dosIdiomas(es, a, b);\n  return <p>{E2("Lista", "List")} {CRX.map(([k, a, b]) => <i key={k}>{es ? a : b}</i>)}</p>;\n}\n']], /CRX guarda pares ES\/EN de textos fijos, se exporta y se elige el idioma en otro archivo/],
  ['cadenaConLlave', [['apps/web/lib/zz9f3cruce.ts', 'export const CRX: [string, string, string][] = [["a", "Uno", "One"], ["b", "Dos", "Two"]];\nexport const lbl = (L: [string, string, string][], k: string, es: boolean) => L.find((z) => z[0] === k)?.[es ? 1 : 2] ?? "";\n'],
    ['apps/web/app/(app)/zz9f3cruce.tsx', 'import { CRX, lbl } from "@/lib/zz9f3cruce";\nexport function Zz({ es }: { es: boolean }) {\n  return <p>{lbl(CRX, "a", es)}</p>;\n}\n']], /CRX guarda pares ES\/EN de textos fijos, se exporta y se elige el idioma en otro archivo/],
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
for (const [g, fs2, debe] of dosArchivos) {
  for (const [f, c] of fs2) fs.writeFileSync(path.join(R, f), c);
  let r; try { r = correr(g, debe); } finally { for (const [f] of fs2) fs.unlinkSync(path.join(R, f)); }
  informe(g, `crear ${fs2.map(([f]) => f.split('/').pop()).join(' + ')}`, r);
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
