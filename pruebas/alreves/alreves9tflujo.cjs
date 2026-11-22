// Prueba al revés de 9t · Medios en flujo (guardián mediosEnFlujo). Cada caso rompe el código a propósito y el guardián tiene que fallar con SU
// mensaje (el texto de cada caso abajo); después se restaura y los guardianes quedan limpios:
//   la ruta del video vuelve a leer el cuerpo entero · el cupo después de leer (o sin él) · el 503 sin Retry-After · el turno que no se suelta ·
//   recibirArchivo que escribe sin mirar el tope · procesarVideo sin el binario · turnoVideo sin tope por proceso · enviarArchivo que lee el
//   archivo entero · tomarCupo sin candado · el servicio que lee la entrada entera · entregarPrivado que deja salir una caché pública ·
//   abrirObjeto sin If-None-Match · abrirObjeto sin señal · esperar el cancel de un cuerpo · un cuerpo de fetch en flujo sin señal · una ruta que entrega sin el 404 del permiso antes · una con caché pública · una ruta nueva con leerObjeto.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ, G = 'mediosEnFlujo';
const VR = 'apps/web/app/api/negocio/video/route.ts', S = 'apps/web/lib/subida.ts', V = 'apps/web/lib/video-negocio.ts', M = 'apps/web/lib/medios.ts',
  T = 'apps/web/lib/topes.ts', P = 'services/video/app.py', E = 'apps/web/lib/entrega-privada.ts';
const casos = [
  [VR, '    const rec = await recibirArchivo(req, {', '    const crudo = Buffer.from(await req.arrayBuffer());\n    const rec = await recibirArchivo(req, {', 'lee el cuerpo entero en memoria'],
  [VR, '  if (!turno) return ocupado();\n', '', 'se toma ANTES de leer el cuerpo'],
  [VR, 'headers: { "Retry-After": "30" }', 'headers: {}', '503 con Retry-After'],
  [VR, '    if (dir) await borrarCarpetaVideo(dir);\n    await turno();\n', '    if (dir) await borrarCarpetaVideo(dir);\n', 'se suelta en un finally'],
  [S, '            if (escritos + hasta > o.tope) { await tirarResto(); return { ok: false, motivo: "grande" }; }\n', '', 'mira el tope ANTES de escribir'],
  [V, 'accept: "application/x-tolatino-video"', 'accept: "application/json"', 'procesarVideo manda el video desde el disco'],
  [V, '  if (enEsteProceso >= VIDEO_A_LA_VEZ_PROCESO) return null;\n', '', 'turnoVideo: tope por proceso'],
  [M, 'pipeline(createReadStream(o.ruta, { highWaterMark: 1 << 20 }), pedido).catch(no);', 'pedido.end(require("node:fs").readFileSync(o.ruta));', 'el archivo va del disco por partes'],
  [T, "      await c.query(`select pg_advisory_xact_lock(hashtext('cupo:' || $1))`, [scope]);\n", '', 'bajo el candado del cupo'],
  [P, '            if not recibir(self.rfile, n, os.path.join(tmp, "entrada")):', '            if not open(os.path.join(tmp, "entrada"), "wb").write(self.rfile.read(n)):', 'escribe la entrada a disco por partes'],
  [E, 'if (!/^private,/.test(cabeceras["cache-control"] ?? "") || ', 'if (', 'solo con caché «private»'],
  [M, 'headers: inm ? { ...headers, "if-none-match": inm } : headers', 'headers', 'abrirObjeto pasa If-None-Match'],
  [M, ', signal: corte.signal }); }', ' }); }', 'abrirObjeto pide al almacén con `signal`'],
  [M, '  if (r.status === 404) { soltar(r); return null; }', '  if (r.status === 404) { await r.body?.cancel().catch(() => undefined); return null; }', 'espera el cancel del cuerpo'],
  [E, '    const a = await abrirObjeto(l.clave, inm);', '    const x = await fetch("http://127.0.0.1:1/" + l.clave); if (x.status === 299) return new Response(x.body);\n    const a = await abrirObjeto(l.clave, inm);', 'usa en flujo el cuerpo de un fetch del servidor sin `signal`'],
  ['apps/web/app/api/entrega/foto/[id]/route.ts', '  if (!ok) return no();\n  // 9t · En flujo', '  // 9t · En flujo', 'sin antes contestar 404'],
  ['apps/web/app/api/ayuda/foto/[id]/route.ts', '{ "cache-control": "private, no-store", "x-content-type-options": "nosniff" });', '{ "cache-control": "public, max-age=3600", "x-content-type-options": "nosniff" });', 'caché «private, no-store»'],
];
const crear = [
  ['apps/web/app/api/zz-alreves-flujo/route.ts', 'import { leerObjeto } from "@/lib/medios";\nexport async function GET() {\n  return new Response(new Uint8Array(await leerObjeto("privado/x/zz.jpg")));\n}\n', 'lee un objeto del almacén entero'],
];
const soloTextos = !!process.env.ALREVES_SOLO_TEXTOS;
let bien = 0, total = 0;
const correr = () => {
  try { execSync(`node guardianes/run.mjs --solo ${G}`, { cwd: R, stdio: 'pipe' }); return []; }
  catch (e) { return String(e.stderr).split('\n').filter((x) => x.trim().startsWith(`[${G}]`)); }
};
const informe = (que, msg, lineas) => {
  total++;
  const l = soloTextos ? lineas[0] : lineas.find((x) => x.includes(msg));
  console.log(`  ${l ? '✓' : '✗'} ${G} al revés (${que}: «${msg}»)${l ? ' → ' + l.trim().slice(0, 200) : lineas.length ? ' → otro mensaje: ' + lineas[0].trim().slice(0, 160) : ' → el guardián no falló'}`);
  if (l) bien++;
};
for (const [f, a, b, msg] of casos) {
  const ruta = path.join(R, f);
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ ${G}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  try { informe(path.basename(f), msg, correr()); } finally { fs.writeFileSync(ruta, orig); }
}
for (const [f, contenido, msg] of crear) {
  const ruta = path.join(R, f);
  fs.mkdirSync(path.dirname(ruta), { recursive: true });
  fs.writeFileSync(ruta, contenido);
  try { informe(f, msg, correr()); } finally { fs.rmSync(path.dirname(ruta), { recursive: true, force: true }); }
}
let limpio = true;
if (!require('../lib/alreves-fin.cjs')(R)) limpio = false;
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
