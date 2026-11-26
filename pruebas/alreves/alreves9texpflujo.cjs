// Prueba al revés del guardián exportacionEnFlujo (22 nov): el archivo de «Descargar mis datos» se arma a disco y se entrega en flujo (abrirObjeto),
// nunca entero en la memoria del proceso. Se inyecta el defecto, el guardián debe fallar con SU mensaje ([exportacionEnFlujo]); se restaura.
// 26 nov · Y «Exportar sus datos» del equipo por el mismo camino (acción sin base64, ruta con el permiso en cada descarga, un uso, vence en minutos,
// lo de la persona sin las filas del equipo), y ninguna ruta pone content-length (Next 15 lo quita).
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const X = 'apps/web/lib/datos/exportar.ts', RT = 'apps/web/app/api/datos/archivo/[id]/route.ts', Z = 'apps/web/lib/pases/zip.ts', G = 'exportacionEnFlujo';
const AU = 'apps/web/app/admin/acciones-usuarios.ts', RE = 'apps/web/app/api/admin/usuarios/archivo/[id]/route.ts', UI = 'apps/web/app/admin/U360.tsx', MG = 'packages/db/migrations/0227_exportar_del_equipo_en_flujo.sql';
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
  [G, RT, '"cache-control": "no-store, private", "x-robots-tag": "noindex" },', '"cache-control": "private, max-age=60", "x-robots-tag": "noindex" },'],
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
  // 26 nov · «Exportar sus datos» del equipo: la acción vuelve a armar el ZIP en memoria y a devolverlo en base64.
  [G, AU, 'ap = { enlace: await apartarParaEquipo(c, u.id, s.id), s, u, m };', 'ap = { enlace: (await (await import("@/lib/datos/exportar")).armarZip([], false, c)).zip.toString("base64"), s, u, m };'],
  // La acción ya no deja la auditoría al quedar listo.
  [G, AU, 'auditar(c, { actor: a.s.id, action: "usuario.exportar"', 'Promise.resolve({ actor: a.s.id, action: "usuario.exportar"'],
  // La pantalla vuelve al base64 → Blob.
  [G, UI, 'const f = document.createElement("form");', 'const f = document.createElement("form"); void new Blob([]);'],
  // La ruta del equipo baja sin revisar usr:exportar.
  [G, RE, ' || !s.puede("usr", "exportar")) return new NextResponse(null, { status: 404', ') return new NextResponse(null, { status: 404'],
  // Su GET gasta el enlace.
  [G, RE, '  void id;\n  return irA("/admin/usuarios"', '  await bajarExportacionEquipo(id, (await staff())!, null);\n  return irA("/admin/usuarios"'],
  // Su POST pone content-length (Next lo quita).
  [G, RE, '"cache-control": "no-store, private", "x-robots-tag": "noindex" },', '"cache-control": "no-store, private", "x-robots-tag": "noindex", "content-length": "0" },'],
  // bajarExportacionEquipo: sin la ciudad de quien baja; sin «quien lo armó» en el update; sin revisar el permiso.
  [G, X, ' and (cardinality($3::text[]) = 0 or u.home_city_id = any($3::text[]))', ''],
  [G, X, 'where id = $1::uuid and requested_by = $2::uuid and status', 'where id = $1::uuid and status'],
  [G, X, 'if (!/^[0-9a-f-]{36}$/.test(id) || !s.puede("usr", "exportar")) return { ok: false, status: 404 };', 'if (!/^[0-9a-f-]{36}$/.test(id)) return { ok: false, status: 404 };'],
  // armarParaEquipo: el ZIP entero en memoria; el temporal queda; un día en vez de minutos.
  [G, X, 'await armarADisco(await datosDeCuenta(userId), false, ruta)', '{ ...(await armarZip(await datosDeCuenta(userId), false)), sha256: "", bytes: 0 }'],
  [G, X, '  } finally {\n    if (ruta) await rm(ruta, { force: true }).catch(() => undefined);\n  }\n}\n/* Bajarlo', '  } finally {\n    void ruta;\n  }\n}\n/* Bajarlo'],
  [G, X, 'export const EQUIPO_VENCE_MIN = 10;', 'export const EQUIPO_VENCE_MIN = 1440;'],
  // Lo de la persona ve o cuenta las filas del equipo.
  [G, X, "and requested_by is null order by requested_at desc", "order by requested_at desc"],
  [G, X, "status in ('pendiente', 'armando', 'listo') and requested_by is null", "status in ('pendiente', 'armando', 'listo')"],
  [G, X, "if (!e || e.del_equipo) return { ok: false, status: 404 };", "if (!e) return { ok: false, status: 404 };"],
  [G, X, "where status = 'pendiente' and requested_by is null", "where status = 'pendiente'"],
  // El barrido devuelve a la fila uno del equipo cortado a mitad (avisaría a la persona) y no saca del almacén lo cortado.
  [G, X, "set status = 'pendiente' where status = 'armando' and requested_by is null", "set status = 'pendiente' where status = 'armando'"],
  [G, X, "status in ('bajado', 'fallo') or expires_at <= now()", "status = 'bajado' or expires_at <= now()"],
  // El índice de «uno vivo a la vez» cuenta también los del equipo.
  [G, MG, "where status in ('pendiente', 'armando', 'listo') and requested_by is null;", "where status in ('pendiente', 'armando', 'listo');"],
  // La entrega de los privados vuelve a poner content-length.
  [G, 'apps/web/lib/entrega-privada.ts', '    if (a.etag) h.etag = a.etag;\n', '    if (a.etag) h.etag = a.etag;\n    if (a.largo != null) h["content-length"] = String(a.largo);\n'],
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
