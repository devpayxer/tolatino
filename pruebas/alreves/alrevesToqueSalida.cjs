// Prueba al revés del guardián toqueSobreviveSalida (22 nov; CI 45042985880: en Safari «Llamar» no se contaba porque la página abría tel: justo después
// de una acción del servidor). Cada caso rompe el código a propósito y el guardián tiene que fallar con SU mensaje (el texto de cada caso); después se
// restaura y los guardianes quedan limpios:
//   la vía vieja (acción del servidor + salida de la página) en la ficha, la tarjeta (en la línea siguiente), la semilla de la categoría, el mapa y
//   compartir · la acción registrarToque que vuelve · contact_taps escrito fuera de lib/toques.ts · esperar el toque antes de tel: · la pieza sin
//   sendBeacon, sin keepalive, a otra ruta o esperando · la puerta con GET, sin tope, con otras claves, tocando la base o con otro estado · las reglas
//   sin mismo origen, sin el tope de 10 min o de 60 por hora, sin el evento, contando a la gente del negocio o sin validar el id.
// 22 nov (bandeja de salida; CI 45060882235: en WebKit el beacon llegó casi siempre, no siempre): anotar después de mandar · sin sessionStorage ·
//   sin reintento (o a los 30 s) · sin pageshow / visibilitychange · el Arranque sin la bandeja · sin tope de 10 min · confirmar sin 204 o por el
//   beacon · otra pantalla hablando con /api/toque · el «entraron» de vuelta a una acción del servidor (importada o creada) · la puerta con una
//   forma de más · las reglas sin el candado (o con uno que no es de la transacción) · entroPatrocinado sin sus reglas · tarAK sin sus casos ·
//   un envío fallido que no rearma el reintento (o sin espaciarlo) · «en camino» que no caduca (o tarda 60 s) · vaciar que no arma el siguiente
//   intento · el reintento con keepalive (o el primero sin él) · «en camino» atado a que la promesa termine (.finally) · lib/patrocinio.ts (dinero) importando ./cuenta otra vez · la puerta trayendo entroPatrocinado de lib/patrocinio (CI 45071274895).
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ, G = 'toqueSobreviveSalida';
const FI = 'apps/web/app/(app)/n/[id]/Ficha.tsx', FN = 'apps/web/app/(app)/n/[id]/FichaNueva.tsx', TN = 'apps/web/app/(app)/TarjetaNegocio.tsx',
  CA = 'apps/web/app/(app)/c/[slug]/Categoria.tsx', MA = 'apps/web/app/(app)/mapa/Mapa.tsx', AC = 'apps/web/app/(app)/acciones.ts',
  CT = 'apps/web/lib/contar-toque.ts', RT = 'apps/web/app/api/toque/route.ts', LT = 'apps/web/lib/toques.ts',
  AR = 'apps/web/app/_cascara/Arranque.tsx', PT = 'apps/web/app/(app)/c/[slug]/Patrocinados.tsx', PE = 'apps/web/app/(app)/eventos/PatrocinadosEventos.tsx',
  LP = 'apps/web/lib/patrocinio-entrada.ts', LD = 'apps/web/lib/patrocinio.ts', TK = 'pruebas/e2e/tarAK.cjs';
const BANDEJA = 'la bandeja: el toque se anota pendiente', REINT = 'la bandeja reintenta lo no confirmado a los 1–5 s', VOLVER = 'la bandeja reintenta al volver a verse la página',
  CONF = 'la bandeja solo da por confirmado un toque con el 204', PATR = 'el «entraron» del patrocinio sale por contarEntradaPatrocinio';
const VIEJA = 'cuenta el toque con una acción del servidor y sale de la página justo después';
const casos = [
  [FI, 'contarToque(f.id, "call", "ficha"); location.href = `tel:', 'void registrarToque(f.id, "call", "ficha"); location.href = `tel:', VIEJA],
  [TN, 'contarToque(b.id, "call", origen);\n      location.href', 'void registrarToque(b.id, "call", origen);\n      location.href', VIEJA],
  [CA, 'contarToqueSemilla(x.id, "categoria"); location.href', 'void registrarToqueSemilla(x.id, "categoria"); location.href', VIEJA],
  [MA, 'contarToque(b.id, "directions", "mapa"); abrirComoLlegar(', 'void registrarToque(b.id, "directions", "mapa"); abrirComoLlegar(', VIEJA],
  [FN, 'contarToque(f.id, "share", "ficha"); if ((await compartirNativo(', 'void registrarToque(f.id, "share", "ficha"); if ((await compartirNativo(', VIEJA],
  [AC, '/* «Avísame cuando haya»', 'export async function registrarToque(id: string, kind: string, origen: string): Promise<void> {\n  if (!(await mismoOrigen())) return;\n  void id; void kind; void origen;\n}\n\n/* «Avísame cuando haya»', 'vuelve a existir una acción del servidor que cuenta toques'],
  [AC, '/* «Avísame cuando haya»', 'export async function tocar(id: string): Promise<void> {\n  if (!(await mismoOrigen())) return;\n  await db().query("insert into contact_taps (business_id, kind) values ($1, \'call\')", [id]);\n}\n\n/* «Avísame cuando haya»', 'escribe contact_taps fuera de lib/toques.ts'],
  [TN, 'const hacer = (a: Accion) => () => {', 'const hacer = (a: Accion) => async () => {', 'espera a contarToque antes de seguir', TN, 'contarToque(b.id, "call", origen);\n      location.href', 'await contarToque(b.id, "call", origen);\n      location.href'],
  [CT, 'navigator.sendBeacon(RUTA, new Blob', 'navigator.vibrate?.(0) && (RUTA, new Blob', 'el toque sale con navigator.sendBeacon'],
  [CT, '  if (!enCola) enviar(p, true);', '  if (!enCola) enviar(p);', 'sin sendBeacon, el toque sale con fetch y keepalive: true'],
  [CT, 'function enviar(p: Pendiente, keepalive = false): void {', 'function enviar(p: Pendiente, _k = false): void {\n  const keepalive = true; void _k;', 'sin sendBeacon, el toque sale con fetch y keepalive: true'],
  [CT, 'const RUTA = "/api/toque";', 'const RUTA = "/api/toques";', 'el toque va a /api/toque'],
  [CT, 'function mandar(d: Cuerpo): void {', 'async function mandar(d: Cuerpo): Promise<void> {\n  await Promise.resolve();', 'lib/contar-toque.ts no espera nada'],
  // La bandeja.
  [CT, '  guardar(l.slice(-MAX_PENDIENTES));\n  let enCola = false;\n', '  let enCola = false;\n', BANDEJA, CT, '  if (!enCola) enviar(p, true);\n', '  guardar(l.slice(-MAX_PENDIENTES));\n  if (!enCola) enviar(p, true);\n'],
  [CT, 'if (l.length) sessionStorage.setItem(LLAVE, JSON.stringify(l)); else ', '', BANDEJA],
  [CT, 'const REINTENTO_MS = 1500;', 'const REINTENTO_MS = 30000;', REINT],
  [CT, '  if (!enCola) enviar(p, true);\n  programar();\n', '  if (!enCola) enviar(p, true);\n', REINT],
  [CT, '  window.addEventListener("pageshow", vaciar);\n', '', VOLVER],
  [CT, '  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") vaciar(); });\n', '', VOLVER],
  [CT, '  window.addEventListener("pageshow", vaciar);\n  vaciar();\n', '  window.addEventListener("pageshow", vaciar);\n', VOLVER],
  [AR, '  useEffect(() => iniciarBandeja(), []);\n', '  void iniciarBandeja;\n', 'el Arranque del marco raíz monta la bandeja'],
  [CT, 'const TOPE_MS = 9 * 60_000;', 'const TOPE_MS = 60 * 60_000;', 'la bandeja tira lo pendiente de más de 10 min'],
  [CT, 'v = memoria.filter((p) => ahora - p.h < TOPE_MS && p.h <= ahora + 60_000);', 'v = memoria.filter((p) => p.h <= ahora + 60_000);', 'la bandeja tira lo pendiente de más de 10 min'],
  [CT, 'if (r.status === 204) { fallos = 0; quitar(p.t); }', 'if (r.status < 600) { fallos = 0; quitar(p.t); }', CONF],
  [CT, '  if (!enCola) enviar(p, true);\n', '  if (!enCola) enviar(p, true); else quitar(p.t);\n', CONF],
  [CT, '}, () => { soltar(); otraVez(); })', '}, () => soltar())', 'un envío que falla (abortado, sin red, 5xx) rearma el reintento'],
  [CT, 'catch { soltar(); otraVez(); }', 'catch { soltar(); }', 'un envío que falla (abortado, sin red, 5xx) rearma el reintento'],
  [CT, 'if (!reloj) programar(Math.min(REINTENTO_MS * fallos, 60_000));', 'if (!reloj) programar(REINTENTO_MS);', 'un envío que falla (abortado, sin red, 5xx) rearma el reintento'],
  [CT, '  if (antes !== undefined && ahora - antes < EN_VUELO_MS) return;\n', '  if (antes !== undefined) return;\n', 'el reintento no depende de que el envío anterior termine'],
  [CT, 'const EN_VUELO_MS = 4000;', 'const EN_VUELO_MS = 60000;', 'el reintento no depende de que el envío anterior termine'],
  [CT, '  for (const p of l) enviar(p);\n  if (l.length) otraVez();\n', '  for (const p of l) enviar(p);\n', 'el reintento no depende de que el envío anterior termine'],
  [CT, 'const soltar = () => { if (enVuelo.get(p.t) === ahora) enVuelo.delete(p.t); };', 'const soltar = () => undefined;', 'el reintento no depende de que el envío anterior termine', CT, '  } catch { soltar(); otraVez(); }\n}', '  } catch { soltar(); otraVez(); }\n  void Promise.resolve().finally(() => enVuelo.delete(p.t));\n}'],
  // Una sola pieza.
  [MA, 'contarToque(b.id, "directions", "mapa"); abrirComoLlegar(', 'void fetch("/api/toque", { method: "POST", body: JSON.stringify({ id: b.id, kind: "directions", origen: "mapa" }) }); abrirComoLlegar(', 'habla con /api/toque por su cuenta'],
  [PT, 'const entrar = (p: Patrocinada) => { contarEntradaPatrocinio("negocio", p.sid); };', 'const entrar = (p: Patrocinada) => { void entroPatrocinado("negocio", p.sid); };', PATR, PT, 'import { contarEntradaPatrocinio, contarToque } from "@/lib/contar-toque";', 'import { contarToque } from "@/lib/contar-toque";\nimport { entroPatrocinado } from "../../acciones-patrocinio";'],
  [PE, 'import { contarEntradaPatrocinio } from "@/lib/contar-toque";', 'import { entroPatrocinado } from "../acciones-patrocinio";\nconst contarEntradaPatrocinio = (k: "evento", s: string) => void entroPatrocinado(k, s);', PATR],
  [AC, '/* «Avísame cuando haya»', 'export async function entroPatrocinado(kind: string, id: string): Promise<void> {\n  if (!(await mismoOrigen())) return;\n  void kind; void id;\n}\n\n/* «Avísame cuando haya»', 'vuelve a existir la acción del servidor entroPatrocinado'],
  [RT, 'export async function POST(req: NextRequest) {', 'export async function GET() { return nada(); }\nexport async function POST(req: NextRequest) {', '/api/toque solo exporta POST'],
  [RT, 'const MAX = 512;', 'const MAX = 64 * 1024;', '/api/toque acota el cuerpo a 512 bytes'],
  [RT, 'claves === "id,kind,origen"', 'claves.includes("id")', '/api/toque acepta exactamente { id, kind, origen }'],
  [RT, '(x.entro === "negocio" || x.entro === "evento") && typeof x.patrocinio === "string")', 'typeof x.entro === "string" && typeof x.patrocinio === "string")', '/api/toque acepta exactamente { id, kind, origen }'],
  [RT, '  return nada();\n}\n', '  else if (claves === "origen,ver") await contarToque(String(x.ver), "call", x.origen as string);\n  return nada();\n}\n', '/api/toque acepta exactamente { id, kind, origen }'],
  [RT, 'import { contarToque, contarToqueSemilla } from "@/lib/toques";', 'import { contarToque, contarToqueSemilla } from "@/lib/toques";\nimport { db } from "@/lib/db";\nvoid db;', '/api/toque no toca la base'],
  [RT, 'return nada();\n}\n', 'return new NextResponse(null, { status: 429 });\n}\n', '/api/toque contesta 204 siempre'],
  [LT, 'export async function contarToqueSemilla(id: string, origen: string): Promise<void> {\n  if (!(await mismoOrigen())) return;\n', 'export async function contarToqueSemilla(id: string, origen: string): Promise<void> {\n', '«contarToqueSemilla» no revisa primero el mismo origen'],
  [LT, "t.business_id = b.id and t.at > now() - interval '10 minutes'", "t.business_id = b.id and t.at > now() - interval '1 minute'", '«contarToque» perdió el tope'],
  [LT, "t.at > now() - interval '1 hour') < 60)\n     returning (select city_id from seed_listings", "t.at > now() - interval '1 hour') < 600)\n     returning (select city_id from seed_listings", '«contarToqueSemilla» perdió el tope'],
  [LT, 'if (t.rows[0]) await evento("contactar", { ref: id,', 'if (t.rows[0]) void evento; if (t.rows[0] && false) await Promise.resolve({ ref: id,', '«contarToque» ya no anota el evento «contactar»'],
  [LT, "and not exists (select 1 from business_members m where m.business_id = b.id and m.user_id = $2::uuid and m.status = 'active')\n", '', 'la gente del propio negocio no cuenta'],
  [LT, '!ID_NEG.test(id) || !TOQUES.has(kind)) return;', '!TOQUES.has(kind)) return;', 'contarToque valida el id del negocio y el tipo de toque'],
  [LT, 'await enFila(c, `toque:${id}:${u?.id ?? ip ?? ""}`); ', '', '«contarToque» cuenta sin el candado'],
  [LT, 'await enFila(c, `semilla:${id}:${u?.id ?? ip ?? ""}`); ', 'void enFila; ', '«contarToqueSemilla» cuenta sin el candado'],
  [LT, 'select pg_advisory_xact_lock(hashtextextended($1, 0))', 'select pg_advisory_lock(hashtextextended($1, 0))', 'falta el candado por toque'],
  [LP, '    if (ctx.robot) return;\n    if (u) {\n      const tabla = kind', '    if (u) {\n      const tabla = kind', 'entroPatrocinado perdió sus reglas'],
  [LP, '      if (propio.rowCount) return;\n', '', 'entroPatrocinado perdió sus reglas'],
  [LD, 'import { db, tx } from "./db";\n', 'import { db, tx } from "./db";\nimport { yo } from "./cuenta";\nvoid yo;\n', 'lib/patrocinio.ts (dinero) no lleva el «entraron»'],
  [RT, 'from "@/lib/patrocinio-entrada";', 'from "@/lib/patrocinio";', '/api/toque no toca la base'],
  [TK, "'un pendiente viejo se tira (más de 10 min)'", "'un pendiente antiguo se descarta'", 'falta la prueba (tarAK'],
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
  console.log(`  ${l ? '✓' : '✗'} ${G} al revés (${que}: «${msg}»)${l ? ' → ' + l.trim().slice(0, 200) : lineas.length ? ' → otro mensaje: ' + lineas[0].trim().slice(0, 160) : ' → el guardián NO falló'}`);
  if (l) bien++;
};
for (const [f, a, b, msg, f2, a2, b2] of casos) {
  // Un caso puede cambiar dos cosas a la vez (f2/a2/b2) en el mismo archivo o en otro.
  const cambios = [[f, a, b]].concat(f2 ? [[f2, a2, b2]] : []);
  const orig = new Map();
  let falta = null;
  for (const [ff, aa, bb] of cambios) {
    const ruta = path.join(R, ff);
    if (!orig.has(ruta)) orig.set(ruta, fs.readFileSync(ruta, 'utf8'));
    const ahora = fs.readFileSync(ruta, 'utf8');
    if (!ahora.includes(aa)) { falta = `${ff}: ${aa.slice(0, 70)}`; break; }
    fs.writeFileSync(ruta, ahora.replace(aa, () => bb));
  }
  try {
    if (falta) { total++; console.log(`  ✗ ${G}: no encontré el texto a cambiar en ${falta}`); continue; }
    informe(path.basename(f), msg, correr());
  } finally { for (const [ruta, t] of orig) fs.writeFileSync(ruta, t); }
}
let limpio = true;
if (!require('../lib/alreves-fin.cjs')(R)) limpio = false;
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
