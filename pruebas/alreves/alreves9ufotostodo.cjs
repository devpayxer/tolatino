// Prueba al revés del guardián fotosAdjuntarTodoONada (22 nov): una acción que adjunta fotos por id (galería y portada del panel, la foto del equipo,
// los eventos) compara cuántas pidió con cuántas adjuntó y rechaza con su mensaje, deshaciendo todo el pedido. Se inyecta cada defecto (volver a
// contestar ok sin adjuntar, o adjuntar sin mirar el resultado) y el guardián debe fallar con SU mensaje ([guardián]); se restaura. Punta a punta: ayu4m.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const G = 'fotosAdjuntarTodoONada';
const A = 'apps/web/app/panel/acciones.ts', Q = 'apps/web/app/panel/acciones-equipo.ts', E = 'apps/web/lib/evt.ts';
const CT = 'apps/web/app/admin/acciones-catalogo.ts'; // 23 nov · la portada de una categoría (Super Admin › Catálogo)
const I = 'apps/web/lib/equipo-invitacion.ts', PB = 'apps/web/app/(app)/publica/acciones.ts'; // 23 nov · aceptar el código de equipo y Publica tu negocio
const casos = [
  // Galería y portada: no comparar, no lanzar, no decirlo, no quitar repetidas, adjuntar sin contar.
  [A, '    if (puestas !== lista.length) throw new FotoNoAdjunta();\n', ''],
  [A, 'if (puestas !== lista.length) throw new FotoNoAdjunta();', 'if (puestas > lista.length) throw new FotoNoAdjunta();'],
  [A, 'if (puestas !== lista.length) throw new FotoNoAdjunta();', 'if (puestas !== lista.length) return "tope" as const;'],
  [A, 'if (e instanceof FotoNoAdjunta) return no("Una de las fotos ya no está. Súbela otra vez.", "One of the photos is gone. Upload it again.");', 'if (e instanceof FotoNoAdjunta) return { ok: true };'],
  [A, 'if (e instanceof FotoNoAdjunta) return no("Una de las fotos ya no está. Súbela otra vez.", "One of the photos is gone. Upload it again.");', 'if (e instanceof FotoNoAdjunta) return no("Esa foto no existe.", "That photo doesn’t exist.");'],
  [A, '[...new Set(ids.filter((x) => typeof x === "string" && UUID.test(x)))]', 'ids.filter((x) => typeof x === "string" && UUID.test(x))'],
  [A, '      puestas += (await c.query(`update media set owner_kind = \'business\'', '      await c.query(`update media set owner_kind = \'business\''],
  // El logo: volver a devolver sin lanzar (el logo anterior ya quitado no se deshace), decir ok, otro texto, o adjuntar sin leer el resultado.
  [A, '    if (!m) throw new FotoNoAdjunta();\n', '    if (!m) return;\n'],
  [A, '    if (!m) throw new FotoNoAdjunta();\n', ''],
  [A, '  try { await tx(async (c) => {\n    await c.query(`update media set status = \'removed\', removed_reason = \'replaced\'', '  const ok = await tx(async (c) => {\n    await c.query(`update media set status = \'removed\', removed_reason = \'replaced\''],
  [A, 'if (e instanceof FotoNoAdjunta) return no("Esa foto no existe.", "That photo doesn’t exist."); throw e; }\n  return { ok: true };\n}\n\n/* ── Horario', 'if (e instanceof FotoNoAdjunta) return { ok: true }; throw e; }\n  return { ok: true };\n}\n\n/* ── Horario'],
  [A, 'if (e instanceof FotoNoAdjunta) return no("Esa foto no existe.", "That photo doesn’t exist."); throw e; }\n  return { ok: true };\n}\n\n/* ── Horario', 'if (e instanceof FotoNoAdjunta) return no("Una de las fotos ya no está. Súbela otra vez.", "One of the photos is gone. Upload it again."); throw e; }\n  return { ok: true };\n}\n\n/* ── Horario'],
  [A, "    const m = (await c.query<{ url: string }>(\n      `update media set owner_kind = 'logo'", "    await c.query(\n      `update media set owner_kind = 'logo'"],
  // La foto del equipo: ignorarla en silencio (la vacía), o rechazarla con otro texto.
  [Q, '        if (!photo) throw new FotoNoAdjunta();\n', ''],
  [Q, 'if (e instanceof FotoNoAdjunta) return no("Esa foto no existe.", "That photo doesn’t exist.");', 'if (e instanceof FotoNoAdjunta) return { ok: true };'],
  [Q, 'if (e instanceof FotoNoAdjunta) return no("Esa foto no existe.", "That photo doesn’t exist.");', 'if (e instanceof FotoNoAdjunta) return no("Esa foto ya no está.", "That photo is gone.");'],
  [Q, '        if (!photo) throw new FotoNoAdjunta();\n        await c.query(', '        if (photo) await c.query('],
  // Eventos.
  [E, '  if ((puestas.rowCount ?? 0) !== ids.length) throw new FotosAjenasEvt();', ''],
  [E, '  if (err instanceof FotosAjenasEvt) return no("Una de las fotos ya no está. Súbela otra vez.", "One of the photos is gone. Upload it again.");\n', ''],
  [E, '[...new Set(d.fotos.map((f) => f.id))]', 'd.fotos.map((f) => f.id)'],
  // Por clase: una función nueva que pasa fotos al negocio sin leer el resultado.
  [A, 'export async function fotosOrden(', 'export async function fotosNuevas(id: string, x: string) {\n  await tx(async (c) => {\n    await c.query(`update media set owner_kind = \'business\', owner_id = $1 where id = $2::uuid and owner_kind = \'user\' and status = \'visible\' and not rev_sin_c2 and not private`, [id, x]);\n  });\n}\nexport async function fotosOrden('],
  // Aceptar el código de equipo (23 nov): no lanzar, decir ok, otro texto, ignorar lo que no es un id, el rechazo fuera de la transacción.
  [I, '      if (!photo) throw new FotoNoAdjunta();\n', ''],
  [I, 'if (e instanceof FotoNoAdjunta) return no("Esa foto no existe.", "That photo doesn’t exist.");', 'if (e instanceof FotoNoAdjunta) return { ok: true, negocio: { id: "", nombre: "" } };'],
  [I, 'if (e instanceof FotoNoAdjunta) return no("Esa foto no existe.", "That photo doesn’t exist.");', 'if (e instanceof FotoNoAdjunta) return no("Una de las fotos ya no está. Súbela otra vez.", "One of the photos is gone. Upload it again.");'],
  [I, 'if (typeof x?.photo === "string" && x.photo) {', 'if (typeof x?.photo === "string" && UUID.test(x.photo)) {'],
  [I, '  try { r = await tx(', '  { r = await tx('],
  // Publica tu negocio: la revisión (cuenta), el tope y los ids malos, el conteo dentro de la transacción, el rechazo y el texto.
  [PB, '  if (mias.length !== fotos.length) return no("Una de las fotos ya no está. Súbela otra vez.", "One of the photos is gone. Upload it again.", "F1");\n', ''],
  [PB, 'if (mias.length !== fotos.length) return no("Una de las fotos ya no está. Súbela otra vez.", "One of the photos is gone. Upload it again.", "F1");', 'if (mias.length < 1) return no("Una de las fotos ya no está. Súbela otra vez.", "One of the photos is gone. Upload it again.", "F1");'],
  [PB, 'if (mias.length !== fotos.length) return no("Una de las fotos ya no está. Súbela otra vez.", "One of the photos is gone. Upload it again.", "F1");', 'if (mias.length !== fotos.length) return no("Vuelve a subir tu foto.", "Upload your photo again.", "F1");'],
  [PB, 'if (mias.length !== fotos.length) return no("Una de las fotos ya no está. Súbela otra vez.", "One of the photos is gone. Upload it again.", "F1");', 'if (mias.length !== fotos.length) return no("Una de las fotos ya no está. Súbela otra vez.", "One of the photos is gone. Upload it again.");'],
  [PB, '  if (fotos.length !== pedidas.length || fotos.length > 13) return no("Una de las fotos ya no está. Súbela otra vez.", "One of the photos is gone. Upload it again.", "F1");\n', ''],
  [PB, 'const fotos = pedidas.filter((x) => /^[0-9a-f-]{36}$/.test(x));', 'const fotos = pedidas.filter((x) => /^[0-9a-f-]{36}$/.test(x)).slice(0, 13);'],
  [PB, '    if (puestas !== fotos.length) throw new FotoNoAdjunta();\n', ''],
  [PB, 'if (puestas !== fotos.length) throw new FotoNoAdjunta();', 'if (puestas > fotos.length) throw new FotoNoAdjunta();'],
  [PB, "      puestas += (await c.query(`update media set owner_kind = 'business'", "      await c.query(`update media set owner_kind = 'business'"],
  [PB, 'if (e instanceof FotoNoAdjunta) return no("Una de las fotos ya no está. Súbela otra vez.", "One of the photos is gone. Upload it again.", "F1"); throw e; }', 'if (e instanceof FotoNoAdjunta) return { ok: true, negocio: { id: "", nombre: "", minutos: 0, hasta: "", items: 0, fotos: 0 } }; throw e; }'],
  [PB, 'if (e instanceof FotoNoAdjunta) return no("Una de las fotos ya no está. Súbela otra vez.", "One of the photos is gone. Upload it again.", "F1"); throw e; }', 'if (e instanceof FotoNoAdjunta) return no("Falta tu foto.", "Your photo is missing.", "F1"); throw e; }'],
  [PB, 'if (e instanceof FotoNoAdjunta) return no("Una de las fotos ya no está. Súbela otra vez.", "One of the photos is gone. Upload it again.", "F1"); throw e; }', 'if (e instanceof FotoNoAdjunta) return no("Una de las fotos ya no está. Súbela otra vez.", "One of the photos is gone. Upload it again."); throw e; }'],
  [PB, '    for (let i = 0; i < fotos.length; i++)\n', '    const orden = fotos.filter((f) => mias.includes(f));\n    for (let i = 0; i < orden.length; i++)\n'],
  // Por clase: una función nueva de Publica que pasa fotos al negocio sin leer el resultado.
  [PB, 'class FotoNoAdjunta extends Error {}', 'async function pasarFotos(c: import("pg").PoolClient, slug: string, f: string[], u: string) {\n  await c.query(`update media set owner_kind = \'business\', owner_id = $1 where id = $2::uuid and owner_kind = \'user\' and status = \'visible\' and not rev_sin_c2 and not private`, [slug, f[0], u]);\n}\nclass FotoNoAdjunta extends Error {}'],
  // Portada de una categoría (Catálogo): no lanzar, decir ok, otro texto, adjuntar sin leer el resultado, adjuntar una que no es suya, ya no pública o no visible.
  [CT, '      if (!f) throw new FotoNoAdjunta();\n', ''],
  [CT, 'if (e instanceof FotoNoAdjunta) return no("Esa foto no existe."); throw e; }', 'if (e instanceof FotoNoAdjunta) return { ok: true }; throw e; }'],
  [CT, 'if (e instanceof FotoNoAdjunta) return no("Esa foto no existe."); throw e; }', 'if (e instanceof FotoNoAdjunta) return no("Una de las fotos ya no está. Súbela otra vez."); throw e; }'],
  [CT, "      const f = (await c.query<{ url: string }>(\n        `update media set owner_kind = 'category'", "      await c.query(\n        `update media set owner_kind = 'category'"],
  [CT, "and uploaded_by = $3 and owner_id = $3::text\n            and status = 'visible' and not rev_sin_c2 and not private and purged_at is null", "and uploaded_by = $3 and owner_id = $3::text\n            and status = 'visible' and not rev_sin_c2 and purged_at is null"],
  [CT, "where id = $2::uuid and owner_kind = 'user' and uploaded_by = $3 and owner_id = $3::text\n            and status = 'visible'", "where id = $2::uuid and owner_kind = 'user'\n            and status = 'visible'"],
  [CT, "and purged_at is null and url like '/medios/n/%' returning url`", "and purged_at is null returning url`"],
];
let bien = 0, total = 0;
const correr = () => {
  try { execSync(`node guardianes/run.mjs --solo ${G}`, { cwd: R, stdio: 'pipe' }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${G}]`)) ?? ''; return [!!l, l]; }
};
for (const [f, a, b] of casos) {
  const ruta = path.join(R, f);
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r; try { r = correr(); } finally { fs.writeFileSync(ruta, orig); }
  total++; console.log(`  ${r[0] ? '✓' : '✗'} ${G} al revés (${f.split('/').pop()})${r[1] ? ' → ' + r[1].trim().slice(0, 170) : ''}`); if (r[0]) bien++;
}
const limpio = require('../lib/alreves-fin.cjs')(R, { mostrar: true });
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
