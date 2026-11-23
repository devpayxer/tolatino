// Prueba al revés del guardián exportacionEnFlujo (22 nov): el archivo de «Descargar mis datos» se arma a disco y se entrega en flujo (abrirObjeto),
// nunca entero en la memoria del proceso. Se inyecta el defecto, el guardián debe fallar con SU mensaje ([exportacionEnFlujo]); se restaura.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const X = 'apps/web/lib/datos/exportar.ts', RT = 'apps/web/app/api/datos/archivo/[id]/route.ts', Z = 'apps/web/lib/pases/zip.ts', G = 'exportacionEnFlujo';
const casos = [
  // Bajar: leer el ZIP entero otra vez.
  [G, X, 'const { abrirObjeto } = await import("../medios");', 'const { abrirObjeto, leerObjeto } = await import("../medios"); await leerObjeto(e.media_key);'],
  // Gastar el uso aunque el archivo no esté.
  [G, X, 'if (!a || a.estado !== 200) return { ok: false, status: 410 };', 'if (!a || a.estado !== 200) throw new Error("no está");'],
  // Quien pierde la carrera no suelta el cuerpo.
  [G, X, 'if (!r.rowCount) { void a.cuerpo.cancel().catch(() => undefined); return { ok: false, status: 410 }; }', 'if (!r.rowCount) return { ok: false, status: 410 };'],
  // Abrir el objeto DESPUÉS de gastar el uso.
  [G, X, 'const a = await abrirObjeto(e.media_key);\n', 'const a = (globalThis as any).a;\n'],
  // Otro archivo de lib/datos lee un objeto entero.
  [G, 'apps/web/lib/datos/admin.ts', '\n', '\nconst _x = () => leerObjeto("privado/x");\n'],
  // La ruta copia el cuerpo entero.
  [G, RT, 'return new NextResponse(r.cuerpo, {', 'return new NextResponse(new Uint8Array(await new Response(r.cuerpo).arrayBuffer()), {'],
  // La ruta cambia sus cabeceras.
  [G, RT, '"cache-control": "no-store, private", "x-robots-tag": "noindex", ...largo', '"cache-control": "private, max-age=60", "x-robots-tag": "noindex", ...largo'],
  // Armar: subir el ZIP entero.
  [G, X, 'await guardarArchivo(clave, ruta, "application/zip", sha256);', 'await guardarObjeto(clave, require("node:fs").readFileSync(ruta), "application/zip");'],
  // Armar: el archivo temporal queda.
  [G, X, 'if (ruta) await rm(ruta, { force: true }).catch(() => undefined);', 'void ruta;'],
  // Armar: sin salida (el ZIP entero en memoria).
  [G, X, 'const z = zipPorPartes(salida), secciones', 'const z = zipPorPartes(), secciones'],
  // Armar: el sha256 no cuenta lo escrito.
  [G, X, 'hash.update(b); bytes += b.length;', 'bytes += b.length;'],
  // zipPorPartes con salida guarda igual los trozos.
  [G, Z, 'if (salida) { salida(l); salida(nb); salida(cuerpo); } else locales.push(l, nb, cuerpo);', 'if (salida) { salida(l); salida(nb); salida(cuerpo); } locales.push(l, nb, cuerpo);'],
  // Las pruebas dejan de comparar lo bajado con lo guardado.
  // 22 nov · Armar sin el pico: el cursor de a TANDA, cada parte fila por fila al flujo de compresión, la parte 1 suelta en cuanto hay otra.
  [G, X, 'const TANDA = 2_000;', 'const TANDA = 20_000;'],
  [G, X, 'for await (const tanda of porPartes(c, q, i++, TANDA))', 'for await (const tanda of porPartes(c, q, i++))'],
  [G, X, 'await z.agregarPorPartes(json, () => jsonPorFilas(filas));', 'z.agregar(json, Buffer.from(JSON.stringify(filas, null, 2), "utf8"));'],
  [G, X, 'await z.agregarPorPartes(csv, () => csvPorFilas(filas));', 'await z.agregarPorPartes(csv, () => [[...csvPorFilas(filas)].join("")]);'],
  [G, X, 'if (espera && s.partes === 1) { await poner(`${q.nombre}-1.json`, `${q.nombre}-1.csv`, espera); p1 = null; }', 'if (espera && s.partes === 99) { await poner(`${q.nombre}-1.json`, `${q.nombre}-1.csv`, espera); p1 = null; }'],
  [G, X, 'JSON.stringify(filas.slice(i, i + GRUPO), null, 2).slice(2, -2)', 'JSON.stringify(filas, null, 2).slice(2, -2)'],
  [G, Z, 'const nb = Buffer.from(nombre, "utf8"), comp: Buffer[] = [], d = createDeflateRaw({ level: 9 });', 'const nb = Buffer.from(nombre, "utf8"), comp: Buffer[] = [], d = createDeflateRaw({ level: 1 });'],
  [G, Z, '      for (const b of enBuffers(trozos())) {\n        crc = crc32(b, crc); largo += b.length;', '      for (const b of [Buffer.concat([...enBuffers(trozos())])]) {\n        crc = crc32(b, crc); largo += b.length;'],
  [G, 'pruebas/e2e/datos9d.cjs', 'idéntico byte a byte al guardado', 'parecido al guardado'],
  [G, 'pruebas/e2e/exp9t.cjs', "select sha256 from data_exports", "select media_key from data_exports"],
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
