// 9u · Cuántas consultas distintas tiene la app y cuántas ejecutó una corrida del servidor de pruebas. SIN cambiar el producto: el servidor de pruebas
// (TOLATINO_ENTORNO=pruebas) con PRUEBAS_ANOTAR_SQL=<archivo> anota cada texto de consulta distinto que manda a Postgres (apps/web/lib/db.ts); aquí se
// compara esa lista con los textos que el código puede mandar (pruebas/lib/consultas-sitios.cjs).
//   Cómo anotar: añadir la línea PRUEBAS_ANOTAR_SQL=/ruta/consultas-ejecutadas.jsonl a $PRUEBAS_SALIDA/secretos.env y servir (servir.sh la lee), correr
//   las pruebas que se quieran medir (la regresión completa, o una parte), y: node pruebas/lib/consultas-medir.cjs [archivo.jsonl]
//   (sin argumento: $PRUEBAS_SALIDA/consultas-ejecutadas.jsonl). Varias corridas se suman: se pasan varios archivos.
// Sale: los números, y la lista de lo que NO se ejecutó, por archivo y por pantalla, con las del Super Admin señaladas (también a
//   $PRUEBAS_SALIDA/consultas-no-ejecutadas.txt). Las consultas que el código arma en tiempo de ejecución no se pueden contar por su texto: se dicen aparte.
const fs = require('fs'), path = require('path');
const { sitios, grupoDe } = require('./consultas-sitios.cjs');
const RAIZ = path.resolve(__dirname, '..', '..');
const SAL = path.resolve(process.env.PRUEBAS_SALIDA || path.join(require('os').tmpdir(), 'tolatino-pruebas'));
const norm = (s) => s.replace(/\s+/g, ' ').trim().replace(/;$/, '');

const archivos = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!archivos.length) archivos.push(path.join(SAL, 'consultas-ejecutadas.jsonl'));
const ejecutadas = new Set();
for (const a of archivos) {
  if (!fs.existsSync(a)) { console.error(`✗ no existe ${a}: sirve con PRUEBAS_ANOTAR_SQL=<archivo> en secretos.env y corre pruebas antes de medir`); process.exit(2); }
  for (const l of fs.readFileSync(a, 'utf8').split('\n')) { if (!l) continue; try { ejecutadas.add(norm(JSON.parse(l))); } catch { /* línea a medias */ } }
}

const { sitios: ss } = sitios(RAIZ);
// Pantallas del Super Admin que usan cada archivo de lib (una vuelta: quién lo importa desde apps/web/app/admin).
const pantallas = new Map();
const leerTs = (f) => { try { return fs.readFileSync(path.join(RAIZ, f), 'utf8'); } catch { return ''; } };
const walk = (d) => { const o = []; for (const e of fs.readdirSync(path.join(RAIZ, d), { withFileTypes: true })) { const p = d + '/' + e.name; if (e.isDirectory()) o.push(...walk(p)); else if (/\.(ts|tsx)$/.test(e.name)) o.push(p); } return o; };
for (const f of walk('apps/web/app/admin')) {
  const pant = path.dirname(f).replace('apps/web/app/', '');
  for (const m of leerTs(f).matchAll(/from\s+["'](@\/lib\/[^"']+|\.\.?\/[^"']+)["']/g)) {
    const b = m[1].startsWith('@/') ? 'apps/web/' + m[1].slice(2) : path.join(path.dirname(f), m[1]);
    for (const ext of ['.ts', '.tsx', '/index.ts']) if (fs.existsSync(path.join(RAIZ, b + ext))) { const k = b + ext; (pantallas.get(k) ?? pantallas.set(k, new Set()).get(k)).add(pant); }
  }
}
const esAdmin = (f) => /^apps\/web\/app\/admin\//.test(f) || /^apps\/web\/lib\/admin-/.test(f) || pantallas.has(f);
const pantallaDe = (f) => /^apps\/web\/app\/admin\//.test(f) ? [path.dirname(f).replace('apps/web/app/', '')] : [...(pantallas.get(f) || [])].sort().slice(0, 4);

let nSit = 0, nSitEj = 0, nTex = 0, nTexEj = 0; const no = [];
for (const x of ss) {
  if (!x.sqls) continue;
  nSit++; nTex += x.sqls.length;
  const e = x.sqls.filter((s) => ejecutadas.has(norm(s))).length;
  nTexEj += e; if (e) nSitEj++; else no.push(x);
}
const enum_ = ss.filter((x) => x.sqls).length, fuera = ss.filter((x) => x.estado === 'armada' || x.estado === 'nombre');
const out = [];
out.push(`consultas anotadas por la corrida: ${ejecutadas.size} textos distintos (de ${archivos.length} archivo(s))`);
out.push(`sitios .query del código: ${ss.length} · de datos con texto conocido: ${enum_} · armados en ejecución (sin texto fijo): ${fuera.length} · que no son de datos o de Postgres: ${ss.length - enum_ - fuera.length}`);
out.push(`de los ${nSit} sitios con texto conocido, la corrida ejecutó ${nSitEj} (${Math.round(100 * nSitEj / nSit)} %) y NO ejecutó ${no.length}; por textos: ${nTexEj} de ${nTex}`);
const adm = no.filter((x) => esAdmin(x.f));
out.push(`NO ejecutadas del Super Admin: ${adm.length} de ${no.length}`);
const porArchivo = (lista) => { const m = {}; for (const x of lista) (m[x.f] ??= []).push(x.linea); return Object.entries(m).sort(([a], [b]) => (a < b ? -1 : 1)); };
out.push('\n## Super Admin (consulta no ejecutada → pantallas del admin que la usan)');
for (const [f, ls] of porArchivo(adm)) out.push(`  ${f} (${ls.length}): ${ls.join(', ')}  →  ${pantallaDe(f).join(', ') || '—'}`);
out.push('\n## Resto, por archivo');
for (const [f, ls] of porArchivo(no.filter((x) => !esAdmin(x.f)))) out.push(`  ${f} (${ls.length}): ${ls.join(', ')}`);
out.push('\n## Armadas en ejecución (no se cuentan por texto), por grupo');
const g = {}; for (const x of fuera) (g[grupoDe(x)] ??= []).push(`${x.f}:${x.linea}`);
for (const [k, v] of Object.entries(g)) out.push(`  ${k}: ${v.length}\n    ${v.join(' ')}`);
const txt = out.join('\n') + '\n';
try { fs.writeFileSync(path.join(SAL, 'consultas-no-ejecutadas.txt'), txt); } catch { /* sin carpeta de salida */ }
console.log(txt);
