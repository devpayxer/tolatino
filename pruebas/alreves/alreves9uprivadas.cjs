// Prueba al revés de las fotos de destino PRIVADO (Fotos a la medida F3, 21 nov): fotosPrivadasConPermiso (y los guardianes que F3 cambió:
// fotosRevisionAntesDePublicar, fotoAyudaPrivada). Se inyecta el defecto, el guardián debe fallar con SU mensaje ([guardián]); se restaura. La prueba
// de la base es pruebas/e2e/fot9uprivadas.cjs; la de nginx, pruebas/infra/medios-nginx.test.sh.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const G = 'fotosPrivadasConPermiso', A = 'fotosRevisionAntesDePublicar', AY = 'fotoAyudaPrivada', T = 'topeNuevaSoloPublicas';
const FP = 'apps/web/lib/fotos-privadas.ts', RV = 'apps/web/app/api/medios/privada/[id]/route.ts', RT = 'apps/web/app/api/medios/route.ts', FR = 'apps/web/lib/fotos-revision.ts',
  FC = 'apps/web/lib/fotos-catalogo.ts', AC = 'apps/web/lib/ayuda-cita.ts', BR = 'apps/web/lib/barrido.ts';
const casos = [
  // (a) La subida: una de destino privado bajo n/, sin private, sin sus variantes privadas, o contestando /medios/….
  [G, RT, 'clave = sinC2 ? llavePrivada(id) : `n/${id}.jpg`', 'clave = `n/${id}.jpg`'],
  [A, RT, 'clave = sinC2 ? llavePrivada(id) : `n/${id}.jpg`', 'clave = `n/${id}.jpg`'],
  [G, RT, "now(), $8, $10, $10, $9)`", "now(), $8, false, $10, $9)`"],
  [G, RT, '  if (sinC2) { await guardarVariantesPrivadas(id, img.data, img.info.width); return NextResponse.json({ ok: true, id, url }); }\n', ''],
  [G, RT, 'return NextResponse.json({ ok: true, id, url });', 'return NextResponse.json({ ok: true, id, url: urlPublica(`n/${id}.jpg`) });'],
  [G, FP, 'export const llavePrivada = (uuid: string) => `privado/o/${uuid}.jpg`;', 'export const llavePrivada = (uuid: string) => `n/${uuid}.jpg`;'],
  // (b) La revisión: una retenida de destino privado con dirección pública, o que al aprobarse sale a n/.
  [G, FR, 'x.sinC2 ? urlPrivada(r.id) : `/medios/n/${r.id}.jpg`', '`/medios/n/${r.id}.jpg`'],
  [G, FR, '  if (p) await guardarObjeto(llavePrivada(p[1]!), await leerObjeto(f.rev_llave), "image/jpeg");\n  else await guardarObjeto(', '  await guardarObjeto('],
  // (c) El permiso: sin mirar el estado o la dirección de la fila, un dueño de la operación menos, cualquier miembro, el equipo sin caso o sin ciudad.
  [G, FP, "x.private and x.status = 'visible' and x.purged_at is null and x.url = '/api/medios/privada/' || $1::text", "x.status = 'visible'"],
  [G, FP, "    union all select r.user_id, r.business_id, r.operation_id from m join rentals r on m.owner_kind = 'user' and r.damage_photo = m.id\n", ''],
  [G, FP, "bm.status = 'active' and bm.panel_off_at is null", "bm.status = 'active'"],
  [G, FP, " or 'ord' = any(bm.panel_access)))", " or true))"],
  [G, FP, "      where q.status = 'open' and (", "      where ("],
  [G, FP, '    if (!e.colas.includes(c.cola) || (e.ciudades.length && !(c.ciudad && e.ciudades.includes(c.ciudad)))) continue;\n', ''],
  [G, FP, '    if (c.salud && !(await e.vidrio(c.ref))) continue;\n', ''],
  [G, FP, '  if (!ES_UUID.test(id) || !quien.userId) return { ok: false };', '  if (!ES_UUID.test(id)) return { ok: false };'],
  // (d) La ruta: 403, con caché, sin nosniff, el equipo sin auditar, la variante sin el permiso.
  [G, RV, 'const no = () => new NextResponse(null, { status: 404 });', 'const no = () => new NextResponse(null, { status: 403 });'],
  [G, RV, '"cache-control": "private, no-store"', '"cache-control": "public, max-age=31536000, immutable"'],
  [G, RV, '"x-content-type-options": "nosniff", ', ''],
  [G, RV, 'await tx((c) => auditar(c, { actor: p.staff, action: "fotos.privada.ver"', 'await tx((c) => auditar(c, { actor: p.staff, action: "foto.ver"'],
  [G, RV, '  if (!p.ok) return no();\n', ''],
  // (e) Otro archivo que toca privado/o/ por su cuenta.
  [G, 'apps/web/lib/medios.ts', 'export const urlPublica = (clave: string) => `/medios/${clave}`;', 'export const urlPublica = (clave: string) => `/medios/${clave}`;\nexport const deOtro = (id: string) => `privado/o/${id}.jpg`;'],
  // (f) El atajo: un catálogo que no valida contra media, o la validación sin «no privada» / sin rev_sin_c2 / para cualquiera.
  [G, 'apps/web/lib/autos.ts', '  if (!(await fotosDeCatalogoOk(c, {', '  if (false && !(await fotosDeCatalogoOk(c, {'],
  [G, 'apps/web/app/panel/acciones-oficios.ts', '    if (!(await fotosDeCatalogoOk(c, {', '    if (false && !(await fotosDeCatalogoOk(c, {'],
  [G, 'apps/web/app/panel/acciones-rentas.ts', '    if (!(await fotosDeCatalogoOk(c, {', '    if (false && !(await fotosDeCatalogoOk(c, {'],
  [G, FC, "and not private and not rev_sin_c2", "and not rev_sin_c2"],
  [G, FC, "and not private and not rev_sin_c2", "and not private"],
  [G, FC, "        and ((owner_kind = 'business' and owner_id = $3) or (owner_kind = 'user' and owner_id = $4::text))", ''],
  [G, 'apps/web/app/panel/acciones-menu.ts', "and not rev_sin_c2 and not private and ((owner_kind = 'business'", "and not rev_sin_c2 and ((owner_kind = 'business'"],
  // (g) Las de antes que nadie mueve, o que salen de n/ antes de quedar privadas; la purga de una cuenta que no sabe la llave nueva; el daño ajeno.
  [G, BR, '        ["fotosPrivadas", async () => (await import("./fotos-privadas")).barrerPrivadas()],\n', ''],
  [G, FP, "where rev_sin_c2 and not private and purged_at is null", "where false"],
  [G, 'apps/web/lib/datos/purgar.ts', '    const clave = llaveDeUrl(f.url);', '    const clave = f.url.replace(/^\\/medios\\//, "");'],
  [G, 'apps/web/lib/rentas.ts', "m.uploaded_by = $2::uuid and m.owner_kind = 'user' and m.purged_at is null", "m.purged_at is null"],
  // (h) purgarFotosAyuda: sin correr, de más (sin plazo, cualquier foto de ayuda), sin almacén, sin auditoría; FOTO_AYUDA_SQL o Salud y Pro con otra privada.
  [G, BR, '        ["fotosAyudaPurga", async () => (await import("./ayuda-cita")).purgarFotosAyuda()],\n', ''],
  [G, AC, "h.status = 'resolved' and h.resolved_at < now() - make_interval(days => ${cfgSql(\"sp_fotos_ayuda_dias\")})", "h.status = 'resolved'"],
  [G, AC, "where m.private and m.status = 'visible' and m.purged_at is null and m.url like 'privado/a/%'", "where m.private and m.status = 'visible' and m.purged_at is null"],
  [G, AC, '  if (!mediosListos()) return 0;\n  const L = ', '  const L = '],
  [G, AC, "values ('system', null, 'ayuda.fotos.purga', 'media'", "values ('system', null, 'ayuda.fotos', 'media'"],
  [G, AC, "case when m.private and m.url like 'privado/a/%' then '/api/ayuda/foto/'", "case when m.private then '/api/ayuda/foto/'"],
  [AY, AC, "($4::boolean = false or (private and url like 'privado/a/%'))", '($4::boolean = false or private)'],
  // (j) 21 nov · El tope de cuenta nueva solo para las públicas: contar las privadas, frenar una privada con él, decidir sin el destino, la prueba sin el caso.
  [T, FR, '  if (!privada && t.nueva && t.publicas >= t.topeNueva) return "nueva";', '  if (t.nueva && t.publicas >= t.topeNueva) return "nueva";'],
  [T, FR, '  if (!privada && t.nueva && t.publicas >= t.topeNueva) return "nueva";', '  if (!privada && t.nueva && t.n >= t.topeNueva) return "nueva";'],
  [T, FR, 'count(*) filter (where not rev_sin_c2)::int as publicas', 'count(*)::int as publicas'],
  [T, FR, '  if (t.n >= TOPE_HORA) return "general";\n', ''],
  [T, RT, 'const frena = topeQueFrena(t, sinC2);', 'const frena = topeQueFrena(t, false);'],
  [T, 'pruebas/e2e/rev9u.cjs', 'cuenta nueva con el tope público agotado: una privada sigue subiendo', 'una privada'],
  // (i) nginx y la prueba de la base.
  [G, 'pruebas/infra/medios-nginx.test.sh', '"/medios/privado/o/$ID.jpg" ', ''],
  [G, 'pruebas/e2e/fot9uprivadas.cjs', "'el equipo sin un caso abierto → no'", "'el equipo'"],
  [G, 'pruebas/e2e/fot9uprivadas.cjs', "'un catálogo rechaza la dirección de una foto privada'", "'un catálogo'"],
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
