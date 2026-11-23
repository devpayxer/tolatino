// Prueba al revés de los guardianes de la revisión automática de las fotos públicas (decisión AJ, 20 nov): fotosRevisionAntesDePublicar,
// fotosRevisionPrivacidad, fotosRevisionFalloCerrado, fotosRevisionAuditada, fotosRevisionSinReintento y fotosRevisionAviso (R3). Se inyecta el defecto, el guardián debe
// fallar con SU mensaje ([guardián]); se restaura. La prueba pura de la decisión es fotos9urevision; la de punta a punta, rev9u.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const A = 'fotosRevisionAntesDePublicar', P = 'fotosRevisionPrivacidad', C = 'fotosRevisionFalloCerrado', U = 'fotosRevisionAuditada', S = 'fotosRevisionSinReintento', V = 'fotosRevisionAviso';
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
  [P, RUTA, '    const sinC2 = f.textos.destino === "privado";', '    const sinC2 = false;'],
  [P, SO, 'if (f.privada || f.sinC2 || (DUENOS_PRIVADOS', 'if (f.privada || (DUENOS_PRIVADOS'],
  [P, SO, 'if (!r || r.private || r.rev_sin_c2 || (DUENOS_PRIVADOS', 'if (!r || r.private || (DUENOS_PRIVADOS'],
  [P, F, '  if (x.sinC2) return { id: x.id,', '  if (false) return { id: x.id,'],
  [P, F, "        and (not rev_sin_c2 or rev_motivo = 'sin_servicio')\n", ''],
  [P, 'apps/web/app/(app)/n/[id]/cita/Booking.tsx', 'await subirFoto(file, "privado");', 'await subirFoto(file);'],
  [P, 'apps/web/app/panel/Rentas.tsx', 'await subirFoto(fs[0]!, "privado");', 'await subirFoto(fs[0]!);'],
  [P, 'apps/web/lib/subir-foto.ts', 'destino === "privado" ? { destino: "privado" } : {}', '{}'],
  [P, 'pruebas/e2e/rev9u.cjs', "'dudosa con destino privado → retenida y la segunda opinión no recibió nada'", "'dudosa con destino privado'"],
  // El atajo: una foto subida como «privado» que se adjunta a algo público; la decisión que no recibe el destino.
  [P, 'apps/web/lib/resenas.ts', "status = 'visible' and not rev_sin_c2 and not private and (owner_kind = 'user' or (owner_kind = 'review'", "status = 'visible' and not private and (owner_kind = 'user' or (owner_kind = 'review'"],
  [P, 'apps/web/app/panel/acciones.ts', "owner_id = $3 and status = 'visible' and not rev_sin_c2 and not private returning url`", "owner_id = $3 and status = 'visible' and not private returning url`"],
  [P, 'apps/web/lib/comunidad.ts', "uploaded_by = $2 and status = 'visible' and not rev_sin_c2 and not private)", "uploaded_by = $2 and status = 'visible')"],
  [P, F, ', privada: x.sinC2 };', ' };'],
  // 22 nov · Una PRIVADA de otra ruta (privado/a/, la ayuda de Salud y Pro: owner 'user', private, sin rev_sin_c2) en un destino público: una consulta
  //     de la lista sin not private (una por forma: el que toma, el que pasa al negocio, el que pasa a la reseña, la copia de la galería, el
  //     catálogo); y por CLASE: un destino público NUEVO o una toma nueva que no lo exigen (no están en la lista), o la prueba que deja de mirarlo.
  [P, 'apps/web/lib/perfil.ts', "status = 'visible' and not rev_sin_c2 and not private`", "status = 'visible' and not rev_sin_c2`"],
  [P, 'apps/web/app/(app)/publica/acciones.ts', "owner_id = $4 and status = 'visible' and not rev_sin_c2 and not private`", "owner_id = $4`"],
  [P, 'apps/web/lib/evt.ts', "status = 'visible' and not rev_sin_c2 and not private and ((owner_kind = 'user'", "status = 'visible' and not rev_sin_c2 and ((owner_kind = 'user'"],
  [P, 'apps/web/lib/resenas.ts', "status = 'visible' and not rev_sin_c2 and not private and (owner_kind = 'user'", "status = 'visible' and not rev_sin_c2 and (owner_kind = 'user'"],
  [P, 'apps/web/lib/novedades.ts', "owner_id = $2 and status = 'visible' and not rev_sin_c2 and not private`", "owner_id = $2 and status = 'visible' and not private`"],
  [P, 'apps/web/lib/fotos-catalogo.ts', "purged_at is null and not private and not rev_sin_c2", "purged_at is null and not rev_sin_c2"],
  [P, 'apps/web/lib/perfil.ts', 'export async function fotoPerfil(', 'export async function fotoPortadaPerfil(userId: string, mediaId: string) {\n  await db().query(`update media set owner_kind = \'portada_perfil\', owner_id = $2 where id = $1::uuid and owner_kind = \'user\' and uploaded_by = $2 and status = \'visible\' and not rev_sin_c2`, [mediaId, userId]);\n}\nexport async function fotoPerfil('],
  [P, 'apps/web/lib/perfil.ts', 'export async function fotoPerfil(', 'export async function fotoNueva(userId: string, mediaId: string) {\n  return (await db().query(`select url from media where id = $1::uuid and owner_kind = \'user\' and owner_id = $2 and status = \'visible\'`, [mediaId, userId])).rows[0];\n}\nexport async function fotoPerfil('],
  [P, 'pruebas/e2e/ayu4m.cjs', "'el atajo: la foto privada de una ayuda no entra en ningún destino público'", "'el atajo'"],
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
  // (f) R3 · Quien sube siempre sabe qué pasó, desde un solo lugar: la hoja que no se monta, el evento que no se manda, una pantalla que sube por su cuenta,
  //     la miniatura por una dirección pública, «Pedir revisión» que no lleva a ningún lado, Avisos de moderación sin pedir la revisión, el panel sin su aviso,
  //     o la prueba que deja de mirarlo.
  [V, 'apps/web/app/layout.tsx', '<Vitales /><AvisoFoto />', '<Vitales />'],
  [V, 'apps/web/lib/subir-foto.ts', '  window.dispatchEvent(new CustomEvent<AvisoFotoDetalle>(EVENTO_FOTO, { detail: detalle }));\n', ''],
  [V, 'apps/web/lib/subir-foto.ts', 'return x.j ? avisoDeEstado(x.j) : { ok: false };', 'return x.j ?? { ok: false };'],
  [V, 'apps/web/app/AvisoFoto.tsx', "fotoFondo(`/api/medios/revision/${a.id}`, 64)", "fotoFondo(`/medios/n/${a.id}.jpg`, 64)"],
  [V, 'apps/web/app/AvisoFoto.tsx', 'router.push(`/cuenta/moderacion?k=media&id=${encodeURIComponent(a.id!)}`)', 'router.push("/cuenta")'],
  [V, 'apps/web/app/AvisoFoto.tsx', '<Tag tone={rev ? "action" : "danger"}>', '<Tag tone="danger">'],
  [V, 'apps/web/app/(app)/publica/PasosFH.tsx', 'const r = await subirFoto(f).catch(() => null);\n      setSubiendo', 'const r = await fetch("/api/medios", { method: "POST" }).then((x) => x.json()).catch(() => null);\n      setSubiendo'],
  [V, 'apps/web/app/(app)/cuenta/moderacion/Moderacion.tsx', 'a.fotoRev ? await pedirRevisionFoto(a.id, x).catch(() => null) : await apelarAccion(a.k, a.id, x).catch(() => null)', 'await apelarAccion(a.k, a.id, x).catch(() => null)'],
  [V, 'apps/web/app/panel/Panel.tsx', 'cta: E2("Verlas", "See them"), onCta: () => window.location.assign("/cuenta/moderacion") });', '});'],
  [V, 'pruebas/e2e/rev9u2.cjs', "'la foto en revisión sale como un ESTADO (etiqueta EN REVISIÓN y la frase del servidor)'", "'la foto en revisión sale'"],
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
