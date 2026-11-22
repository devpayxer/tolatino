// 9t (22 nov) · El archivo de «Descargar mis datos» armado por partes (guardián exportacionEnFlujo) da EL MISMO archivo que antes. Sin servidor ni
// base: el código real (lib/datos/exportar.ts armarZip y lib/pases/zip.ts) con una base de mentira que contesta al cursor (declare / fetch / close),
// contra una copia aquí del armado de antes (partes de 20 000 filas, JSON.stringify(parte, null, 2) y el CSV como tabla, comprimidos con agregar()).
// Casos: una consulta de 45 001 filas (3 partes) con texto raro (comas, comillas, saltos, acentos, un carácter fuera del plano básico), objetos
// anidados, nulos, fechas, binarios (que no salen: cambian las columnas de algunas filas), columnas que faltan; una de 0 filas; una de 20 000 justas
// (una parte); una de 40 000 justas (dos). Se comparan los bytes del ZIP entero, con salida (el barrido, a disco) y sin ella (el equipo, en memoria).
// Y zipPorPartes().agregarPorPartes da los mismos bytes que agregar() con textos vacíos, chicos, que no se comprimen y grandes.
const { cargar, cargarApp } = require('../lib/ts-servidor.cjs');
const { leerZip } = require('../lib/zip.cjs');
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const R = path.resolve(__dirname, '..', '..');
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const MAPA = JSON.parse(fs.readFileSync(path.join(R, 'packages/db/mapa-de-datos.json'), 'utf8'));
// La base de mentira: cada consulta («Q:<nombre>») es un arreglo de filas; el cursor las entrega de a lo que pida fetch.
function base(datos) {
  const cursores = new Map();
  return {
    async query(sql) {
      let m;
      if ((m = /^declare (exp_\d+) no scroll cursor for Q:(\w+)$/.exec(sql))) { cursores.set(m[1], { filas: datos[m[2]], i: 0 }); return { rows: [] }; }
      if ((m = /^fetch forward (\d+) from (exp_\d+)$/.exec(sql))) { const c = cursores.get(m[2]); const r = c.filas.slice(c.i, c.i + +m[1]); c.i += r.length; return { rows: r.map((x) => ({ ...x })) }; }
      if ((m = /^close (exp_\d+)$/.exec(sql))) { cursores.delete(m[1]); return { rows: [] }; }
      throw new Error('consulta inesperada: ' + sql.slice(0, 80));
    },
  };
}
const RARO = ['hola, "vecino"', 'línea\r\ncon salto', 'año ñandú é', 'clave \u{1D11E} fuera del plano', '', '=1+1', null];
function filas(nombre, N) {
  const out = [];
  for (let i = 0; i < N; i++) {
    const f = { id: `${nombre}-${i}`, n: i, texto: RARO[i % RARO.length], hecho: i % 3 === 0, monto_cents: i * 7 };
    if (i % 5 === 0) f.datos = { a: [1, { b: RARO[i % 4] }], c: null };
    if (i % 11 === 0) f.foto = Buffer.from('binario'); // no sale (Buffer): esta fila trae una columna menos
    else if (i % 13 === 0) f.foto = null;
    f.at = new Date(Date.UTC(2026, 10, 1 + (i % 20), i % 24));
    if (i % 17 === 0) f.extra = `x${i}`;
    out.push(f);
  }
  return out;
}
// El armado de ANTES (copia del de lib/datos/exportar.ts hasta el 22 nov): partes de 20 000, la parte entera en texto, agregar().
function limpiarAntes(f) { const o = {}; for (const [k, v] of Object.entries(f)) { if (Buffer.isBuffer(v)) continue; o[k] = v instanceof Date ? v.toISOString() : v; } return o; }
function armarAntes(zipMod, celda, consultas, datos, leeme) {
  const z = zipMod.zipPorPartes();
  const aCsv = (fs) => { const cab = [...new Set(fs.flatMap((f) => Object.keys(f)))]; return [cab, ...fs.map((f) => cab.map((k) => f[k]))].map((l) => l.map(celda).join(',')).join('\r\n'); };
  for (const q of consultas) {
    const todas = datos[q.nombre].map(limpiarAntes), partes = [];
    for (let i = 0; i < todas.length; i += 20000) partes.push(todas.slice(i, i + 20000));
    const poner = (nom, p) => { z.agregar(`${nom}.json`, Buffer.from(JSON.stringify(p, null, 2), 'utf8')); z.agregar(`${nom}.csv`, Buffer.from(aCsv(p), 'utf8')); };
    if (partes.length <= 1) poner(q.nombre, partes[0] ?? []);
    else partes.forEach((p, i) => poner(`${q.nombre}-${i + 1}`, p));
  }
  z.agregar('LEEME.txt', leeme);
  return z.cerrar();
}
(async () => {
  const zipMod = cargar('apps/web/lib/pases/zip.ts');
  const { celda } = cargar('apps/web/lib/csv.ts');
  // (1) agregarPorPartes = agregar, byte a byte.
  const pruebas = { vacio: [], uno: [''], chico: ['{"a":1}'], ruido: [crypto.randomBytes(5000).toString('latin1')], grande: Array.from({ length: 30000 }, (_, i) => `fila ${i}, ${RARO[i % 6]}\r\n`) };
  for (const [k, trozos] of Object.entries(pruebas)) {
    const a = zipMod.zipPorPartes(), b = zipMod.zipPorPartes();
    a.agregar(`${k}.txt`, Buffer.from(trozos.join(''), 'utf8'));
    await b.agregarPorPartes(`${k}.txt`, () => trozos);
    ok(Buffer.compare(a.cerrar(), b.cerrar()) === 0, `agregarPorPartes da los mismos bytes que agregar (${k})`);
  }
  // (2) El archivo entero.
  const datos = { avisos: filas('avisos', 45001), nada: [], justas: filas('justas', 20000), dos: filas('dos', 40000) };
  const consultas = Object.keys(datos).map((k) => ({ nombre: k, sql: `Q:${k}`, args: [], fuera: new Set() }));
  const db = { db: () => { throw new Error('sin base'); }, tx: () => { throw new Error('sin base'); } };
  const x = cargarApp('apps/web/lib/datos/exportar.ts', { '../db': db, '@/lib/db': db, '../../../../packages/db/mapa-de-datos.json': MAPA });
  const trozos = [];
  const r1 = await x.armarZip(consultas, false, base(datos), (b) => trozos.push(Buffer.from(b)));
  const conSalida = Buffer.concat(trozos);
  ok(r1.zip.length === 0, 'con salida, el ZIP no se guarda en memoria (vuelve vacío)');
  const r2 = await x.armarZip(consultas, false, base(datos));
  ok(Buffer.compare(r2.zip, conSalida) === 0, 'con y sin salida, los mismos bytes');
  const nuevo = leerZip(conSalida);
  const antes = armarAntes(zipMod, celda, consultas, datos, nuevo['LEEME.txt']);
  ok(Buffer.compare(antes, conSalida) === 0, `el ZIP armado por partes es idéntico byte a byte al de antes (${conSalida.length} bytes)`);
  const viejo = leerZip(antes);
  ok(Object.keys(viejo).join() === Object.keys(nuevo).join(), `los mismos archivos dentro, en el mismo orden (${Object.keys(nuevo).length}: ${Object.keys(nuevo).filter((k) => /-\d\.json$|^(nada|justas)\./.test(k)).join(', ')})`);
  ok(Object.keys(viejo).every((k) => Buffer.compare(viejo[k], nuevo[k]) === 0), 'cada archivo, descomprimido, igual al de antes');
  const s = Object.fromEntries([...r1.secciones].map(([k, v]) => [k, `${v.filas}/${v.partes}/${v.fuera}`]));
  ok(s.avisos === '45001/3/0' && s.nada === '0/0/0' && s.justas === '20000/1/0' && s.dos === '40000/2/0', `las cuentas del LEEME (filas/partes/fuera): ${JSON.stringify(s)}`);
  ok(nuevo['avisos-3.json'] && JSON.parse(nuevo['avisos-3.json'].toString()).length === 5001 && !nuevo['justas-1.json'] && nuevo['dos-2.csv'], 'las partes llevan su número solo cuando hay más de una');
  console.log(`OK (${n} comprobaciones)`);
})().catch((e) => { console.error(e); process.exit(1); });
