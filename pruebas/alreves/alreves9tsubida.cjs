// Prueba al revés de los guardianes subidaConTope (19 nov; 22 nov: el turno de fotos, conFotoSubida), topeFotoSinNavegador, gotoDevuelveRespuesta y fotoComoPersona (20 nov) y anchoPropioRespetado (24 nov) y pruebasDevuelvenLaSemilla (26 nov): toda subida lee el formulario con tope (lib/subida.ts) y contesta 413 al archivo grande,
// aunque el navegador no avise el tamaño. Se inyecta el defecto, el guardián debe fallar con SU mensaje ([subidaConTope]); se restaura.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const L = 'apps/web/lib/subida.ts', G = 'subidaConTope';
const casos = [
  [G, 'apps/web/app/api/ayuda/foto/route.ts', 'return conFotoSubida(req, {', 'void (await req.formData().catch(() => null));\n  return conFotoSubida(req, {'],
  [G, 'apps/web/app/api/mensajes/foto/route.ts', 'grande: () => err(413,', 'grande: () => err(400,'],
  // 22 nov · Turno de fotos: la pieza común conFotoSubida (lugar antes de leer, la foto al disco, turno antes de abrirla, todo suelto en un finally).
  // 23 nov · Los rechazos en Sistema › Salud (contados antes del freno; la fila con su regla).
  [G, L, '  if (ult && ahora - ult[0] < 10_000) ult[1]++; else E.rechazos.push([ahora, 1]);\n', ''],
  [G, 'apps/web/lib/sistema/salud.ts', '    subidas: await estadoSubidas(),\n', '    subidas: { enCurso: 0, enEspera: 0, llegando: 0, tope: { aLaVez: 2, dentro: 16, esperaS: 30, deConfig: true }, rechazos10: 0, rechazosHora: 0, ultimoRechazo: null },\n'],
  [G, 'apps/web/app/admin/SistemaSalud.tsx', 'const su = d.subidas, rechSu = su.rechazos10 > 0;', 'const su = d.subidas, rechSu = su.rechazosHora > 100;'],
  [G, 'apps/web/app/admin/SistemaSalud.tsx', 'tag: rechSu ? E2("REVISAR", "CHECK") : E2("BIEN", "HEALTHY")', 'tag: E2("BIEN", "HEALTHY")'],
  [G, 'apps/web/app/admin/SistemaSalud.tsx', ' Solo este proceso del servidor.', ''],
  [G, L, 'if (E.dentro >= t.dentro) { avisarLleno(ruta, "lugar"); return fotosOcupado(); }\n', ''],
  [G, L, '    soltar = await turnoFoto(t.aLaVez, t.esperaS * 1000);\n    if (!soltar) { avisarLleno(ruta, "turno"); return fotosOcupado(); }\n    return await hacer(f);', '    return await hacer(f);'],
  [G, L, '    soltar?.();\n', ''],
  [G, L, '    if (dir) await borrarCarpetaSubida(dir);\n', ''],
  [G, L, 'const rec = await recibirArchivo(req, {', 'void (await new Response(req.body).arrayBuffer()); const rec = await recibirArchivo(req, {'],
  // 23 nov · Los topes, de Configuración (0212): los de fábrica del código y del catálogo iguales, los límites, la sección, la lectura con valores()
  // (sin consulta propia), con plazo y con los de fábrica si falla; el estado en globalThis; el turno que pasa con el tope vigente.
  [G, L, 'export const FOTOS_DEF = { aLaVez: 2,', 'export const FOTOS_DEF = { aLaVez: 3,'],
  [G, 'packages/db/migrations/0212_fotos_tope_config.sql', "('fotos_a_la_vez', 1, 4, 2,", "('fotos_a_la_vez', 1, 50, 2,"],
  [G, 'packages/db/migrations/0212_fotos_tope_config.sql', "('fotos_dentro', 6, 32, 16,", "('fotos_dentro', 6, 1000, 16,"],
  [G, 'packages/db/migrations/0212_fotos_tope_config.sql', "('fotos_dentro', 6, 32, 16,", "('fotos_dentro', 2, 32, 16,"],
  [G, 'packages/db/migrations/0212_fotos_tope_config.sql', "('fotos_espera_s', 5, 60, 30,", "('fotos_espera_s', 5, 600, 30,"],
  [G, 'packages/db/migrations/0212_fotos_tope_config.sql', "('fotos_espera_s', 5, 60, 30, '{\"es\":\"segundos\",\"en\":\"seconds\"}', 'apps',", "('fotos_espera_s', 5, 60, 30, '{\"es\":\"segundos\",\"en\":\"seconds\"}', 'despliegues',"],
  [G, L, 'import("./config").then((c) => c.valores("fotos_a_la_vez", "fotos_dentro", "fotos_espera_s")),', 'Promise.resolve({ fotos_a_la_vez: 2, fotos_dentro: 16, fotos_espera_s: 30 }),'],
  [G, L, '    E.tope = { ...FOTOS_DEF, deConfig: false };\n  } finally {', '    E.tope = { aLaVez: 1000, dentro: 1000, esperaS: 60, deConfig: false };\n  } finally {'],
  [G, L, 'new Promise<null>((listo) => { reloj = setTimeout(() => listo(null), CONFIG_ESPERA_MS); }),', 'new Promise<null>(() => { reloj = undefined; }),'],
  [G, L, 'import { NextResponse } from "next/server";\n', 'import { NextResponse } from "next/server";\nimport { db } from "./db";\nvoid db;\n'],
  [G, L, 'const E: EstadoFotos = (G.__tlSubidaFotos ??= {', 'const E: EstadoFotos = ({'],
  [G, L, 'if (E.activas < aLaVez && !E.enCola.length) { E.activas++; return', 'if (E.activas < aLaVez && !E.enCola.length) { return'],
  [G, L, 'while (E.activas < E.tope.aLaVez && E.enCola.length) if (E.enCola.shift()!()) E.activas++;', 'while (E.enCola.length) if (E.enCola.shift()!()) E.activas++;'],
  [G, L, '  const t = await topesFotos();\n  pasar();\n', '  const t = { ...FOTOS_DEF };\n  pasar();\n'],
  [G, L, 'listo(null); }, espera);', 'listo(soltador()); }, espera);'],
  [G, L, '{ status: 503, headers: { "Retry-After": "15" } }', '{ status: 500 }'],
  [G, L, 'Prueba en un momento."', 'Error."'],
  [G, L, 'if (Date.now() - E.ultimoAviso < AVISO_LLENO_MS) return;\n', ''],
  [G, L, 'void import("./errores/ingesta").then((x) => x.recibirErrorServidor(e, ruta))', 'void Promise.resolve(e)'],
  // Por clase: cada ruta que recibe un archivo, y cada forma de saltarse el turno.
  [G, 'apps/web/app/api/medios/route.ts', 'sharp(f.ruta, {', 'sharp(Buffer.from(await new Response(req.body).arrayBuffer()), {'],
  [G, 'apps/web/app/api/reclamo/documento/route.ts', 'return conFotoSubida(req, {', 'return sinTurno(req, {'],
  [G, 'apps/web/app/api/repartidor/foto/route.ts', 'return conFotoSubida(req, {', 'await sharp(Buffer.alloc(0)).metadata().catch(() => null);\n  return conFotoSubida(req, {'],
  [G, 'apps/web/app/api/ayuda/foto/route.ts', 'return conFotoSubida(req, {', 'void (await leerFormulario(req, 1));\n  return conFotoSubida(req, {'],
  [G, 'apps/web/app/api/mensajes/foto/route.ts', 'const r = await sharp(f.ruta, {', 'const r = await sharp(await readFile(f.ruta), {'],
  [G, 'apps/web/app/api/negocio/video/route.ts', 'const turno = await turnoVideo();', 'const turno = async () => undefined;'],
  [G, 'apps/web/lib/tiendas/llavero.ts', 'export const MAX_BYTES = 64 * 1024;', 'export const MAX_BYTES = 64 * 1024 * 1024;'],
  [G, 'apps/web/app/admin/acciones-sistema.ts', '"use server";\n', '"use server";\nexport async function subirAlgo(f: unknown) { return f instanceof File; }\n'],
  [G, 'pruebas/e2e/sub9t2.cjs', '/api/salud respondió durante la ráfaga', '/api/salud contestó'],
  [G, 'pruebas/e2e/sub9t2.cjs', "x.j?.mensaje?.es === 'Estamos preparando otras fotos en este momento. Prueba en un momento.' && ", ""],
  [G, 'pruebas/e2e/sub9t2.cjs', " && /^\\d+$/.test(x.ra || '')", ""],
  [G, L, '    partes.push(value);\n', ''],
  [G, L, 'if (Number(req.headers.get("content-length") ?? 0) > tope) return { ok: false, grande: true };', ''],
  [G, 'pruebas/e2e/sub9t.cjs', '13 MB por partes, sin avisar el tamaño → 413', '13 MB → algo'],
  // 20 nov (confirmación 44685003383): topeFotoSinNavegador (la app avisa antes de subir; las pruebas suben MB desde Node) y gotoDevuelveRespuesta.
  ['topeFotoSinNavegador', 'apps/web/lib/subir-foto.ts', "return b.size > TOPE_FOTO ? null : b;", "return b;"],
  ['topeFotoSinNavegador', 'apps/web/lib/subir-foto.ts', "export const TOPE_FOTO = 12 * 1024 * 1024;", "export const TOPE_FOTO = Infinity;"],
  ['topeFotoSinNavegador', 'apps/web/lib/subir-foto.ts', 'const f = await lista(file); if (!f) return PESADA;\n  const una = async', 'const f = await reducir(file); { const fd = new FormData(); fd.append("foto", await reducir(file), "foto.jpg"); }\n  const una = async'],
  // 20 nov (confirmación 44734711575): subidaReintenta.
  ['subidaReintenta', 'apps/web/lib/subir-foto.ts', "if (x.st === 0 || x.st === 400) x = await una(file.size > 0 && file.size <= TOPE_FOTO ? file : f);", ""],
  ['subidaReintenta', 'apps/web/lib/subir-foto.ts', "if (x.st === 0 || x.st === 400) x = await una(", "if (x.st !== 200) x = await una("],
  ['subidaReintenta', 'apps/web/lib/subir-foto.ts', 'export const subirFoto = (file: File, destino: DestinoFoto = "publico"): Promise<Subida> => mandar("/api/medios", file, destino === "privado" ? { destino: "privado" } : {});', 'export const subirFoto = async (file: File, destino: DestinoFoto = "publico"): Promise<Subida> => { const fd = new FormData(); fd.append("foto", file); return (await fetch("/api/medios", { method: "POST", body: fd })).json(); };'],
  ['subidaReintenta', 'apps/web/lib/subida.ts', "console.warn(`[subida] sin archivo:", "void (`[subida] sin archivo:"],
  ['subidaReintenta', 'pruebas/lib/elegir-foto.cjs', "console.log(`  · INESTABLE la primera subida de la foto no llegó", "void (`  · la primera subida"],
  ['subidaReintenta', 'pruebas/lib/subida-cruda.cjs', "for (let i = 0; i < 3; i++) { try { return await enviarUna(", "for (let i = 0; i < 1; i++) { try { return await enviarUna("],
  ['topeFotoSinNavegador', 'pruebas/e2e/msg9t.cjs', "const st = await subirCrudoNode(m, B, '/api/mensajes/foto', Buffer.alloc(13 * 1024 * 1024, 7), 'image/jpeg');", "const st = [await subirCrudo(m, 'image/jpeg', 13 * 1024 * 1024)];"],
  ['topeFotoSinNavegador', 'pruebas/e2e/dm9t.cjs', "const st = await subirCrudoNode(a, B, '/api/mensajes/foto', Buffer.alloc(13 * 1024 * 1024, 7), 'image/jpeg', { para: 'dm' });", "const st = [await subirCrudo(a, 'image/jpeg', 13 * 1024 * 1024)];"],
  ['gotoDevuelveRespuesta', 'pruebas/lib/dispositivo-precarga.cjs', "if (soloRuido) return docResp && docResp.url().split('#')[0] === page.url().split('#')[0] ? docResp : null;", "if (soloRuido) return null;"],
  ['gotoDevuelveRespuesta', 'pruebas/lib/dispositivo-precarga.cjs', "if (r.request().isNavigationRequest() && r.frame() === page.mainFrame()) docResp = r;", "if (false) docResp = r;"],
  // 24 nov (corrida de anchos 45330028847): anchoPropioRespetado.
  ['anchoPropioRespetado', 'pruebas/lib/dispositivo-precarga.cjs', "if (o.viewport && o.viewport[ANCHO_PROPIO]) {", "if (false) {"],
  ['anchoPropioRespetado', 'pruebas/lib/dispositivo-precarga.cjs', "viewport: { width, height } };\n    }\n    const w =", "viewport: o.viewport };\n    }\n    const w ="],
  ['anchoPropioRespetado', 'pruebas/lib/entorno.cjs', "[Symbol.for('tolatino.anchoPropio')]: true", "[Symbol.for('otra')]: true"],
  ['anchoPropioRespetado', 'pruebas/e2e/fic9cab.cjs', "const c3 = await ctx(320, 640, { hasTouch: true }, true),", "const c3 = await ctx(320, 640, { hasTouch: true }),"],
  ['anchoPropioRespetado', 'pruebas/e2e/fic9cab.cjs', "viewport: ENT.escritorioPropio(640, 800)", "viewport: { width: 640, height: 800 }"],
  ['anchoPropioRespetado', 'pruebas/lib/dispositivo-precarga.cjs', "if (o.viewport[ANCHO_PROPIO] === 'escritorio') return { ...o, viewport: { width, height } };", ""],
  ['anchoPropioRespetado', 'pruebas/lib/entorno.cjs', "[Symbol.for('tolatino.anchoPropio')]: 'escritorio'", "[Symbol.for('tolatino.anchoPropio')]: true"],
  ['anchoPropioRespetado', 'pruebas/e2e/fic9cab.cjs', "viewport: ENT.escritorioPropio(1280, 800)", "viewport: ENT.anchoPropio(1280, 800)"],
  ['anchoPropioRespetado', 'pruebas/e2e/tarAK.cjs', "movil ? { viewport: ENT.anchoPropio(w, h),", "movil ? { viewport: { width: w, height: h },"],
  ['anchoPropioRespetado', 'pruebas/e2e/din9t10b.cjs', "ok(w.inner === m.viewportSize().width && w.scroll <= w.inner && w.body <= w.inner, `la hoja a", "ok(w.inner === 390 && w.scroll <= w.inner && w.body <= w.inner, `la hoja a"],
  // 20 nov (CI dirigido 44707074106): fotoComoPersona.
  ['fotoComoPersona', 'pruebas/e2e/msg9t.cjs', "await m.goto(B + `/cuenta/mensajes/${BIZ}`); await elegirFoto(m, FOTO2);", "await m.goto(B + `/cuenta/mensajes/${BIZ}`); await m.locator('input[type=file]').setInputFiles(FOTO2);"],
  ['fotoComoPersona', 'pruebas/lib/elegir-foto.cjs', "await fc.setFiles(archivo);", "await p.locator('input[type=file]').setInputFiles(archivo);"],
  ['fotoComoPersona', 'pruebas/lib/elegir-foto.cjs', "if (!resps.length) throw new Error('la foto elegida no se subió: no hubo POST a la ruta de fotos');", ""],
  // 26 nov · pruebasDevuelvenLaSemilla: una prueba que escribe en los ajustes de la semilla y ya no devuelve en un finally; la que para las ofertas y no las devuelve tal cual (a11y9c, menu2b);
  // una pendiente de la lista que ya sale en un finally; una que sale de la lista sin haberse arreglado.
  ['pruebasDevuelvenLaSemilla', 'pruebas/e2e/sis9j.cjs', '  } finally {', '  } finalmente {'],
  ['pruebasDevuelvenLaSemilla', 'pruebas/e2e/menu2b.cjs', "update business_posts set status = '${est}', stopped_at = ${st ?", "update business_posts set status = '${est}', parado = ${st ?"],
  ['pruebasDevuelvenLaSemilla', 'pruebas/e2e/a11y9c.cjs', "update business_posts set status = '${est}', stopped_at = ${st ?", "update business_posts set status = '${est}', parado = ${st ?"],
  ['pruebasDevuelvenLaSemilla', 'guardianes/run.mjs', 'adm7i anfAO app8e', 'adm7i sis9j anfAO app8e'],
  ['pruebasDevuelvenLaSemilla', 'guardianes/run.mjs', 'adm7i anfAO app8e', 'anfAO app8e'],
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
