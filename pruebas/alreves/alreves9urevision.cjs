// Prueba al revés de los guardianes de la revisión automática de las fotos públicas (decisión AJ, 20 nov): fotosRevisionAntesDePublicar,
// fotosRevisionPrivacidad, fotosRevisionFalloCerrado, fotosRevisionAuditada y fotosRevisionSinReintento. Se inyecta el defecto, el guardián debe
// fallar con SU mensaje ([guardián]); se restaura. La prueba pura de la decisión es fotos9urevision; la de punta a punta, rev9u.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const A = 'fotosRevisionAntesDePublicar', P = 'fotosRevisionPrivacidad', C = 'fotosRevisionFalloCerrado', U = 'fotosRevisionAuditada', S = 'fotosRevisionSinReintento';
const RUTA = 'apps/web/app/api/medios/route.ts', F = 'apps/web/lib/fotos-revision.ts', SO = 'apps/web/lib/fotos-segunda-opinion.ts', D = 'apps/web/lib/fotos-decision.ts';
const casos = [
  // (a) Guardar en lo público antes de decidir, devolver la dirección de una no publicada, guardar una retenida bajo n/, publicar lo retenido,
  //     u otra ruta que escriba en n/.
  [A, RUTA, '  const sha = huella(img.data);\n', '  await guardarObjeto(`n/${randomUUID()}.jpg`, img.data, "image/jpeg");\n  const sha = huella(img.data);\n'],
  [A, RUTA, 'return NextResponse.json({ ok: false, estado: v.d.estado === "rechazada" ? "rechazada" : "revision", id: v.id,', 'return NextResponse.json({ ok: false, estado: v.d.estado === "rechazada" ? "rechazada" : "revision", id: v.id, url: urlPublica(`n/${v.id}.jpg`),'],
  [A, F, '  await guardarObjeto(llave, x.datos, "image/jpeg");\n', '  await guardarObjeto(`n/${r.id}.jpg`, x.datos, "image/jpeg");\n'],
  [A, F, '  if (r.d.estado === "visible") {\n    const ok = await tx(', '  if (r.d.estado !== "rechazada") {\n    const ok = await tx('],
  [A, F, 'if (accion === "lifted") await aVisible(c, f, { capa: "persona"', 'if (accion) await aVisible(c, f, { capa: "persona"'],
  [A, 'apps/web/app/api/negocio/video/route.ts', 'cp = `v/${id}.jpg`;', 'cp = `n/${id}.jpg`;'],
  // (b) La segunda opinión desde una ruta privada, sin comprobar adentro, con un dueño privado menos, con otra llave privada, con datos de la
  //     persona o la imagen sin reducir; o la prueba que deja de mirarlo.
  [P, 'apps/web/app/api/mensajes/foto/route.ts', 'import { revisarImagen } from "@/lib/moderacion-img";\n', 'import { revisarImagen } from "@/lib/moderacion-img";\nimport { segundaOpinion } from "@/lib/fotos-segunda-opinion";\n'],
  [P, 'apps/web/lib/moderacion.ts', 'import { revisarImagen } from "./moderacion-img";\n', 'import { revisarImagen } from "./moderacion-img";\nimport { revisarSubida } from "./fotos-revision";\n'],
  [P, SO, '  if (!(await esPublica(f))) throw new Error("segunda opinión: solo fotos destinadas a lo público");\n', ''],
  [P, SO, '"chat", "dm", "help"', '"dm", "help"'],
  [P, SO, 'const LLAVE_PUBLICA = /^(n\\/|privado\\/rev\\/)', 'const LLAVE_PUBLICA = /^(n\\/|privado\\/)'],
  [P, SO, 'sistema: PAUTA, datos: {}, trozos: []', 'sistema: PAUTA, datos: { foto: f.mediaId }, trozos: []'],
  [P, SO, '.resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true })', '.resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })'],
  [P, SO, '  if (!r || r.private || r.rev_sin_c2 || (DUENOS_PRIVADOS', '  if (!r || r.rev_sin_c2 || (DUENOS_PRIVADOS'],
  [P, 'pruebas/e2e/rev9u.cjs', "'una foto privada (Mensajes) jamás llega a la segunda opinión'", "'una foto de Mensajes'"],
  // AJ · Destino «privado» (la foto va solo a un negocio o al equipo): la ruta que no lo lee, esPublica que no mira la marca (sin fila o con fila),
  //     la subida que la manda igual a la segunda opinión, el barrido que la vuelve a mandar, una pantalla privada que sube sin «privado».
  [P, RUTA, '  const sinC2 = form?.get("destino") === "privado";', '  const sinC2 = false;'],
  [P, SO, 'if (f.privada || f.sinC2 || (DUENOS_PRIVADOS', 'if (f.privada || (DUENOS_PRIVADOS'],
  [P, SO, 'if (!r || r.private || r.rev_sin_c2 || (DUENOS_PRIVADOS', 'if (!r || r.private || (DUENOS_PRIVADOS'],
  [P, F, '  if (x.sinC2) return { id: x.id,', '  if (false) return { id: x.id,'],
  [P, F, "        and (not rev_sin_c2 or rev_motivo = 'sin_servicio')\n", ''],
  [P, 'apps/web/app/(app)/n/[id]/cita/Booking.tsx', 'await subirFoto(file, "privado");', 'await subirFoto(file);'],
  [P, 'apps/web/app/panel/Rentas.tsx', 'await subirFoto(fs[0]!, "privado");', 'await subirFoto(fs[0]!);'],
  [P, 'apps/web/lib/subir-foto.ts', 'destino === "privado" ? { destino: "privado" } : {}', '{}'],
  [P, 'pruebas/e2e/rev9u.cjs', "'dudosa con destino privado → retenida y la segunda opinión no recibió nada'", "'dudosa con destino privado'"],
  // El atajo: una foto subida como «privado» que se adjunta a algo público; la decisión que no recibe el destino.
  [P, 'apps/web/lib/resenas.ts', "status = 'visible' and not rev_sin_c2 and (owner_kind = 'user' or (owner_kind = 'review'", "status = 'visible' and (owner_kind = 'user' or (owner_kind = 'review'"],
  [P, 'apps/web/app/panel/acciones.ts', "owner_id = $3 and status = 'visible' and not rev_sin_c2 returning url`", "owner_id = $3 and status = 'visible' returning url`"],
  [P, 'apps/web/lib/comunidad.ts', "uploaded_by = $2 and status = 'visible' and not rev_sin_c2)", "uploaded_by = $2 and status = 'visible')"],
  [P, F, ', privada: x.sinC2 };', ' };'],
  // (c) Un camino que publica sin un «publicar»: la capa 2 que no responde, la confianza sin puntaje, leer la respuesta sin rigor, un error que
  //     no retiene, o el final de la decisión que publica.
  [C, D, '  if (c2.estado === "sin_respuesta") return { estado: "retenida", capa: "c2", motivo: porque === "sin_servicio" ? "sin_servicio" : "no_segura", puntaje: p };', '  if (c2.estado === "sin_respuesta") return { estado: "visible", capa: "c2", motivo: null, puntaje: p };'],
  [C, D, '  else if (p === null) porque = "sin_servicio";', '  else if (p === null) { if (e.confianza) return { estado: "visible", capa: "c4", motivo: null, puntaje: p }; porque = "sin_servicio"; }'],
  [C, D, 'if (k.length !== 2 || ', 'if (k.length < 2 || '],
  [C, D, '  return { estado: "retenida", capa: "c2", motivo: "no_segura", puntaje: p };\n}\n\n/* La memoria', '  return { estado: "visible", capa: "c2", motivo: null, puntaje: p };\n}\n\n/* La memoria'],
  [C, F, '{ esperaMs: R.c2.esperaMs }).catch(() => SIN_RESPUESTA)', '{ esperaMs: R.c2.esperaMs })'],
  [C, F, '  const d = decidir({ ...e, c2: c2 ?? { estado: "apagada" } });', '  const d = decidir({ ...e, c2: c2 ?? { estado: "respuesta", json: { veredicto: "publicar", motivo: "" } } });'],
  [C, D, '  if (c2.estado === "privada") return { estado: "retenida",', '  if (c2.estado === "privada") return { estado: "visible", capa: "c2", motivo: null, puntaje: p }; if (false) return { estado: "retenida",'],
  // Destino «privado» (20 nov): su excepción fuera de su bloque, o una PÚBLICA que entra sin modelo propio.
  [C, D, '  if (e.privada === true) {\n', '  if (e.privada === true || e.confianza) {\n'],
  [C, D, '  else if (p === null) porque = "sin_servicio";', '  else if (p === null) return { estado: "visible", capa: "c1", motivo: "sin_servicio", puntaje: null };'],
  [P, F, 'if (x.sinC2) return { id: x.id, d: decidir({ ...e, c2: { estado: "privada" } })', 'if (x.sinC2) return { id: x.id, d: decidir({ ...e, privada: false, c2: { estado: "respuesta", json: { veredicto: "publicar", motivo: "" } } })'],
  [C, 'pruebas/alreves/fotos9urevision.cjs', "console.log('nada que falle publica (todas las combinaciones)');", "console.log('combinaciones');"],
  // (d) El veredicto fuera de la transacción del cambio, un cambio de estado sin veredicto, el libro que se puede cambiar o borrar.
  [U, RUTA, '    for (const x of veredictosDe(v, { mediaId: id, sha, uploader: me.id })) await anotarVeredicto(c, x);\n', ''],
  [U, F, '  await anotarVeredicto(c, { ...v, mediaId: f.id, sha: f.sha256, uploader: f.uploaded_by });\n  if (f.rev_capa === "c3") await c.query(`update photo_reports set status = \'removed\'', '  if (f.rev_capa === "c3") await c.query(`update photo_reports set status = \'removed\''],
  [U, F, '    const filas = (await c.query<{ id: string; owner_kind: string; owner_id: string }>(\n      `update media set status = \'review\'', '    const filas = (await db().query<{ id: string; owner_kind: string; owner_id: string }>(\n      `update media set status = \'review\''],
  [U, F, 'export async function cifrasRevisionFotos(desde: Date, hasta: Date): Promise<CifrasRevision> {\n', 'export async function cifrasRevisionFotos(desde: Date, hasta: Date): Promise<CifrasRevision> {\n  await db().query(`delete from photo_reviews where created_at < $1`, [desde]);\n'],
  [U, 'packages/db/migrations/0196_fotos_revision.sql', 'create trigger photo_reviews_no_cambia before update or delete on photo_reviews', 'create trigger photo_reviews_no_cambia before delete on photo_reviews'],
  // (e) Contestar 400 (el cliente reintenta), reintentar un 202, o una pantalla que calla el mensaje del servidor.
  [S, D, 'HTTP_RETENIDA = 202;', 'HTTP_RETENIDA = 400;'],
  [S, RUTA, '{ status: v.d.estado === "rechazada" ? HTTP_RECHAZADA : HTTP_RETENIDA }', '{ status: 400 }'],
  [S, 'apps/web/lib/subir-foto.ts', 'if (x.st === 0 || x.st === 400) x = await una(', 'if (x.st === 0 || x.st === 400 || x.st === 202) x = await una('],
  [S, 'apps/web/app/(app)/cuenta/perfil/Perfil.tsx', 'ui.toast(up?.mensaje ? (es ? up.mensaje.es : up.mensaje.en) : E2("No se pudo subir la foto.", "Could not upload the photo."));', 'ui.toast(E2("No se pudo subir la foto.", "Could not upload the photo."));'],
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
let limpio = true; try { execSync('node guardianes/run.mjs', { cwd: R, stdio: 'pipe' }); } catch (e) { limpio = false; console.log(String(e.stderr).slice(0, 600)); }
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
