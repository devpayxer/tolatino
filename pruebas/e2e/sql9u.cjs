// 9u · Toda consulta del código que se puede saber de antemano se le pasa a Postgres con PREPARE contra la base de pruebas (con todas las migraciones):
// la analiza y le pone tipos SIN ejecutarla. Caza la clase «una consulta que ninguna prueba corre llega rota al sandbox»:
//   - «Asignar a…» de Colas (14–21 nov): `… || ' · ' || r.name->>'es'` → «operator does not exist: text ->> unknown».
//   - «Mi casa», actualizar una casa en una dirección que ya tenía una: 15 valores y la consulta no usaba $1 ni $2 →
//     «could not determine data type of parameter $1» (el cliente de la app manda los parámetros sin tipo: falla igual que PREPARE).
//   - y cualquier columna, tabla, función u operador que no exista, o una coma de más.
// Qué entra (pruebas/lib/consultas-sitios.cjs, que lee el repo sin base): el primer argumento de CADA `.query(` cuando se puede saber qué texto corre:
//   un literal; uno armado SOLO con constantes de texto o de número (del mismo archivo o importadas); uno que llama a funciones de trozos con
//   argumentos fijos (`scope("u.home_city_id")`, `ISO("c.created_at")`); `cond ? \`…\` : \`…\``; objetos y listas escritos tal cual
//   (`ORDEN[sort]` = todos sus valores); y los comentarios entre el paréntesis y el literal. Si hay varios textos posibles se preparan TODOS.
// Qué NO entra: lo que el código arma en tiempo de ejecución (listas de condiciones con push/join, una columna elegida por variable). De esas no se
//   calla nada: el número por archivo está en pruebas/consultas-fuera.json, y esta prueba (y el guardián consultasSinComprobar, sin base) falla si
//   aparece una nueva o si una deja de serlo sin bajar el número. `node pruebas/lib/consultas-sitios.cjs --informe` las lista por grupo.
// No toca datos: PREPARE no ejecuta; cada una se suelta con DEALLOCATE.
const ENT = require('../lib/entorno.cjs');
const { sitios, grupoDe, fueraPorArchivo, comparar, aceptadas } = require('../lib/consultas-sitios.cjs');
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };

(async () => {
  const { sitios: ss, archivos } = sitios(ENT.RAIZ);
  const por = {}; for (const x of ss) por[x.estado] = (por[x.estado] || 0) + 1;
  const out = ss.flatMap((x) => (x.sqls || []).map((sql, i) => ({ f: x.f, linea: x.linea, sql, variante: x.sqls.length > 1 ? `${i + 1}/${x.sqls.length}` : '' })));
  // Que de verdad corrió: el código tiene miles de consultas; un extractor roto que encuentra pocas no puede dar verde.
  ok(ss.length > 6000 && (por.fija || 0) > 5300, `sitios .query en ${archivos} archivos: ${ss.length} · fijas ${por.fija} · con varios textos posibles ${por.variantes} (se preparan ${out.length} textos) · que no son de datos ${por.noDatos} · que no son de Postgres ${por.ajena} · sin enumerar ${(por.armada || 0) + (por.nombre || 0)}`);
  // La lista de lo que queda fuera: ni una nueva sin avisar, ni una que ya no lo es sin bajar el número.
  const acept = aceptadas(ENT.RAIZ); ok(acept, 'pruebas/consultas-fuera.json existe y se lee');
  const mal = comparar(fueraPorArchivo(ss), acept);
  for (const m of mal) console.log('  ✗ ' + m);
  ok(!mal.length, `las consultas sin enumerar son las de pruebas/consultas-fuera.json (${Object.values(acept).reduce((a, b) => a + b, 0)} en ${Object.keys(acept).length} archivos)${mal.length ? ' · ' + mal[0].slice(0, 300) : ''}`);
  // Para el informe: lo que queda fuera, agrupado, en la carpeta de salida.
  try {
    const g = {}; for (const x of ss) if (x.estado === 'armada' || x.estado === 'nombre') (g[grupoDe(x)] ??= []).push(`${x.f}:${x.linea}`);
    fs.writeFileSync(path.join(ENT.S, 'consultas-fuera.txt'), Object.entries(g).map(([k, v]) => `## ${k}: ${v.length}\n${v.join('\n')}`).join('\n\n') + '\n');
  } catch { /* la carpeta de salida no es obligatoria */ }
  // El guion: cada consulta en sus líneas (se anota de cuál a cuál) para saber a quién le toca cada error (psql lo da con su número de línea).
  let guion = '\\set ON_ERROR_STOP off\n', n = 1;
  for (const q of out) {
    const trozo = `deallocate all;\nprepare q as ${q.sql};\n`;
    q.desde = n + 1; n += trozo.split('\n').length - 1; q.hasta = n;
    guion += trozo;
  }
  guion += '\\echo @@sql9u-fin@@\n';
  const r = spawnSync('docker', ['exec', '-i', ENT.DB, 'psql', '-U', 'tolatino', '-d', 'tolatino', '-q', '-v', 'VERBOSITY=terse', '-f', '-'], { input: guion, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  ok(r.status === 0 && (r.stdout || '').includes('@@sql9u-fin@@'), 'psql recorrió el guion entero contra la base de pruebas');
  const errores = [...(r.stderr || '').matchAll(/^psql:<stdin>:(\d+): ERROR:\s*(.*)$/gm)].map((m) => ({ l: Number(m[1]), msg: m[2] }));
  const nErr = ((r.stderr || '').match(/ERROR:/g) || []).length;
  const malas = errores.map((e) => { const q = out.find((x) => e.l >= x.desde && e.l <= x.hasta); return `${q ? `${q.f}:${q.linea}${q.variante ? ' (texto ' + q.variante + ')' : ''}` : `línea ${e.l} del guion`} · ${e.msg}`; });
  for (const m of malas) console.log('  ✗ ' + m);
  ok(nErr === 0, `las ${out.length} consultas enumeradas preparan en Postgres (errores: ${nErr}${malas.length ? ' · ' + malas.slice(0, 5).join(' | ') : ''})`);
  console.log('SQL9U OK');
})().catch((e) => { console.error(String(e && e.message || e).slice(0, 1500)); process.exit(1); });
