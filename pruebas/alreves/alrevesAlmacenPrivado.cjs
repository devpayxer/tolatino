// Prueba al revés de almacenPrivadoSinQuinientos (23 nov): ninguna ruta que sirve algo privado del almacén responde 500 cuando la fila vive y el
// archivo no está; todo 404 de esas rutas es el mismo (el de «no tienes permiso») y nunca se guarda; ninguna ruta lee el almacén por su cuenta; una
// ruta nueva que lo lea tiene que anotarse; la purga de una cuenta con el ancho nulo no deja huérfana la variante que el barrido estaba guardando.
// Cada caso mete el defecto y el guardián tiene que fallar con SU mensaje; después se restaura y los guardianes quedan limpios.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ, G = 'almacenPrivadoSinQuinientos';
const NO = 'const no = () => new NextResponse(null, { status: 404, headers: { "cache-control": "private, no-store" } });';
const MSG = 'apps/web/app/api/mensajes/foto/[id]/route.ts', AY = 'apps/web/app/api/ayuda/foto/[id]/route.ts', REC = 'apps/web/app/api/admin/reclamo/[id]/route.ts',
  PRIV = 'apps/web/app/api/medios/privada/[id]/route.ts', REV = 'apps/web/app/api/medios/revision/[id]/route.ts', TI = 'apps/web/app/api/tiendas/archivo/route.ts',
  RP = 'apps/web/app/api/repartidor/foto/route.ts', EX = 'apps/web/lib/datos/exportar.ts', EP = 'apps/web/lib/entrega-privada.ts', PU = 'apps/web/lib/datos/purgar.ts',
  FV = 'apps/web/lib/fotos-variantes.ts';
const W = '    if (f.w == null && clavesVariantes(clave).length) f.w = await anchoDeMaestra(clave);\n';
let bien = 0, total = 0;
const caso = (ok, que, extra = '') => { total++; if (ok) bien++; console.log(`  ${ok ? '✓' : '✗'} ${que}${extra ? ' → ' + extra : ''}`); };
const casos = [
  // El 404 sin «private, no-store» (se guardaría el fallo), o uno distinto armado a mano (diría que la foto existe).
  [MSG, NO, 'const no = () => new NextResponse(null, { status: 404 });', 'el 404 de la ruta (no) no es privado'],
  [REC, '  if (!r || !r.url.startsWith("privado/")) return no();', '  if (!r || !r.url.startsWith("privado/")) return new NextResponse(null, { status: 404 });', 'la ruta arma 2 respuestas 403/404 a mano'],
  [AY, '  if (!ok) return no();\n', '  if (!ok) return new NextResponse(null, { status: 403 });\n', 'la ruta arma 2 respuestas 403/404 a mano'],
  // Una entrega (también la de respaldo) sin su respuesta de «archivo ausente»: daría 500.
  [AY, 'entregarPrivado(req, llaves.slice(-1), cab, no, ver));', 'entregarPrivado(req, llaves.slice(-1), cab, undefined, ver));', 'una entrega sin su respuesta de «archivo ausente» (no)'],
  [REV, ',\n    () => new NextResponse(null, { status: 410, headers: { "cache-control": "private, no-store" } }));', ');', 'una entrega sin su respuesta de «archivo ausente» (410 privado)'],
  [REV, '() => new NextResponse(null, { status: 410, headers: { "cache-control": "private, no-store" } }));', '() => new NextResponse(null, { status: 410 }));', 'una entrega sin su respuesta de «archivo ausente» (410 privado)'],
  [PRIV, '.catch(() => no());', '.catch(() => new NextResponse(null, { status: 500 }));', 'el respaldo de la entrega no es entregarPrivado ni no()'],
  // Una ruta que lee el almacén por su cuenta, o una ruta nueva que sirve del almacén privado sin anotarse.
  [TI, 'export async function PUT(req: Request) {', 'export async function PUT(req: Request) {\n  const x = await abrirObjeto("privado/m/x.jpg");', 'la ruta lee el almacén por su cuenta'],
  [RP, 'export async function POST(req: NextRequest) {', 'export async function GET(req: NextRequest) { return entregarPrivado(req, [], { "cache-control": "private, no-store" }); }\nexport async function POST(req: NextRequest) {', 'ruta nueva que sirve del almacén privado'],
  // Un abrirObjeto que no mira su null.
  [EX, '  if (!a || a.estado !== 200) return { ok: false, status: 410 };', '  if (a.estado !== 200) return { ok: false, status: 410 };', 'abrirObjeto sin mirar su null'],
  [EX, '  if (!a || a.estado !== 200) return { ok: false, status: 410 };', '  if (a.estado !== 200) return { ok: false, status: 410 };', 'bajarExportacion: el archivo que ya no está'],
  [EP, '    if (!a) continue;\n', '', 'abrirObjeto sin mirar su null'],
  // La carrera de la purga: sin leer el ancho, o leyéndolo cuando la maestra ya salió.
  [PU, W, '', 'fotosFuera: con el ancho nulo'],
  [PU, W + '    await borrarObjeto(clave);\n', '    await borrarObjeto(clave);\n' + W, 'fotosFuera: con el ancho nulo'],
  [FV, '  try { return (await sharp(await leerObjeto(clave), { limitInputPixels: 50_000_000 }).metadata()).width ?? null; } catch { return null; }', '  return (await sharp(await leerObjeto(clave), { limitInputPixels: 50_000_000 }).metadata()).width ?? null;', 'anchoDeMaestra lee el ancho real'],
  // Las pruebas de punta a punta dejan de mirarlo.
  ['pruebas/e2e/msg9t.cjs', '`archivo ausente: el 404 es privado y sin caché (', '`archivo ausente (', 'dejó de revisar «archivo ausente: el 404 es privado y sin caché»'],
  ['pruebas/e2e/fot9uprivadas.cjs', '`la purga de una cuenta con el ancho nulo no deja huérfana', '`la purga de una cuenta no deja huérfana', 'dejó de revisar «la purga de una cuenta con el ancho nulo'],
];
const correr = () => {
  try { execSync(`node guardianes/run.mjs --solo ${G}`, { cwd: R, stdio: 'pipe' }); return []; }
  catch (e) { return String(e.stderr).split('\n').filter((x) => x.trim().startsWith(`[${G}]`)); }
};
for (const [f, a, b, msg] of casos) {
  const ruta = path.join(R, f);
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ ${G}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let lineas; try { lineas = correr(); } finally { fs.writeFileSync(ruta, orig); }
  const l = lineas.find((x) => x.includes(msg));
  caso(!!l, `${G} al revés (${path.basename(path.dirname(f))}/${path.basename(f)}: «${msg}»)`, l ? l.trim().slice(0, 200) : lineas.length ? 'otro mensaje: ' + lineas[0].trim().slice(0, 160) : 'el guardián no falló');
}
let limpio = true;
if (!require('../lib/alreves-fin.cjs')(R, { mostrar: true })) limpio = false;
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
