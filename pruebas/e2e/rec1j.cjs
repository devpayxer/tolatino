const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
// 1j · Recuperar tu negocio: reclamo con código (sin dueño) y con documento (con dueño, que recibe el aviso); el equipo aplica el primero y el
// segundo espera 7 días; «Crear semilla» desde Recomendaciones; el documento privado no se ve sin permiso.
// 9b-1 · Con sus propios datos: antes reclamaba `bufete-almonte` (de la semilla: la segunda corrida ya tenía dueño), `barberia-7747` (solo en
// una base vieja) y tomaba «la primera» recomendación de la cola. Ahora: un negocio sin dueño y una barbería publicada para la corrida, dos
// vecinos nuevos (555 libres) y su propia recomendación; en la cola, cada caso por su nombre.
const { chromium } = require('playwright');
const { publicarBarberia, negocioSinDueno, entrarComo, telLibre, medios, sql } = require('../lib/negocio-nuevo.cjs');
const { quitarDelAlmacen } = require('../lib/almacen-quitar.cjs'); // 22 nov · el caso «la fila vive y el archivo no está»
const OUT = ENT.S + '/cap/', FP = ENT.rec('fotos') + '/', B = ENT.B;
const t = (p, x) => p.getByText(x, { exact: true }).last();
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓ ' + m); };
// F3b · La foto privada con un Accept dado (WebP o no): estado, tipo, caché, Vary y el peso.
const traerVar = (p, u, accept = 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8') => p.evaluate(async ([u, a]) => { const r = await fetch(u, { cache: 'no-store', headers: { accept: a } }); const b = await r.arrayBuffer(); return { st: r.status, ct: r.headers.get('content-type'), cc: r.headers.get('cache-control'), vary: r.headers.get('vary'), n: b.byteLength }; }, [u, accept]);
const shot = async (p, n, full = true) => { await p.waitForTimeout(450); await p.screenshot({ path: OUT + n, fullPage: full }); };
(async () => {
  const b = await chromium.launch(); const err = [];
  const watch = (p, tag) => { p.on('pageerror', e => err.push(tag + ' ' + e.message)); p.on('console', x => { if (x.type() === 'error' && !/Failed to load|404|pexels/.test(x.text())) err.push(tag + ' console ' + x.text()); }); };
  const mob = () => b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const SIN = negocioSinDueno('bufete-almonte', 'Bufete Reclamo'), NEG = await publicarBarberia(b), TA = telLibre(), TB = telLibre();
  console.log(`datos de la corrida: ${SIN.id} (sin dueño) · ${NEG.id} (dueño ${NEG.tel})`);
  // A. Reclamo con código (negocio sin dueño)
  const c1 = await mob(); await medios(c1); const p = await c1.newPage(); watch(p, 'reclama1'); await entrarComo(p, TA, { nombre: 'Ramón', apellido: 'Prueba' });
  await p.goto(B + '/recuperar/' + SIN.id); await p.locator('text=¿QUÉ ERES DEL NEGOCIO?').waitFor(); await shot(p, 'j1-form-m.png');
  await t(p, 'Mandarme el código').click(); await p.locator('[data-modo-pruebas] b').waitFor(); const cod = (await p.locator('[data-modo-pruebas] b').textContent()).trim();
  await p.locator('input[placeholder="000000"]').fill(cod); await shot(p, 'j2-codigo-m.png');
  await t(p, 'Verificar').click(); await p.locator('text=Lo estamos revisando').first().waitFor(); await shot(p, 'j3-estado-m.png');
  ok(true, 'reclamo con el código del teléfono del negocio: «Lo estamos revisando»');
  // B. Reclamo con documento (negocio con dueño)
  const c2 = await mob(); await medios(c2); const q = await c2.newPage(); watch(q, 'reclama2'); await entrarComo(q, TB, { nombre: 'Lucía', apellido: 'Prueba' });
  await q.goto(B + '/recuperar/' + NEG.id); await q.locator('text=ya tiene una cuenta a cargo').first().waitFor();
  const fc = q.waitForEvent('filechooser'); await t(q, 'Subir foto del documento').click(); await (await fc).setFiles(FP + 'galeria.png'); await q.locator('text=Cambiar foto').waitFor();
  await shot(q, 'j4-doc-m.png'); await t(q, 'Enviar').click(); await q.locator('text=Lo estamos revisando').first().waitFor();
  ok(true, 'con dueño: solo con documento, «Lo estamos revisando»');
  // El dueño actual ve el aviso
  const c3 = await mob(); const o = await c3.newPage(); watch(o, 'dueño'); await entrarComo(o, NEG.tel);
  await o.goto(B + '/panel/' + NEG.id); await o.locator('text=/Alguien pidió recuperar/').waitFor(); await shot(o, 'j5-panel-aviso-m.png', false);
  ok(true, 'el dueño actual ve «Alguien pidió recuperar» en su panel');
  // C. El equipo: el de con dueño no se aplica antes de 7 días; el sin dueño sí
  const ad = await b.newContext({ viewport: { width: 1440, height: 900 } }); await medios(ad); const a = await ad.newPage(); watch(a, 'admin'); await entrarComo(a, '5705550199');
  await a.goto(B + '/admin/colas?cola=cambio'); await a.getByText('Reclamo · ' + NEG.nombre, { exact: true }).first().click(); await a.locator('text=EVIDENCIAS').waitFor(); await a.waitForTimeout(800); await shot(a, 'j6-caso-doc-d.png');
  await t(a, 'Aplicar cambio').click(); await a.locator('textarea').fill('Documento coincide'); await t(a, 'Aplicar').click(); await a.locator('text=/tiene 7 días desde el aviso/').waitFor();
  ok(sql(`select count(*) from businesses b join users u on u.id = b.owner_user_id where b.id = '${NEG.id}' and u.phone = '+1${NEG.tel}'`) === '1', 'con dueño: no se aplica antes de 7 días (sigue el dueño de antes)');
  await a.goto(B + '/admin/colas?cola=cambio'); await a.getByText('Reclamo · ' + SIN.nombre, { exact: true }).first().click(); await a.locator('text=EVIDENCIAS').waitFor();
  await t(a, 'Aplicar cambio').click(); await a.locator('textarea').fill('Código correcto y llamamos al local'); await t(a, 'Aplicar').click(); await a.locator('text=Cambio aplicado. Ya es el dueño.').waitFor();
  await p.goto(B + '/recuperar/' + SIN.id); await p.locator('text=Ya es tuyo').first().waitFor(); await shot(p, 'j7-aprobado-m.png');
  await t(p, 'Abrir tu panel').click(); await p.waitForURL('**/panel/' + SIN.id);
  ok(true, 'sin dueño: aplicado, «Ya es tuyo» y su panel se abre');
  // D. Crear semilla desde Recomendaciones (su propia recomendación) → fila en la categoría
  const REC = 'Colmado Semilla ' + TA.slice(-4);
  await p.goto(B + '/recomendar'); await p.getByPlaceholder('Ej.: Pica Pollo La Vieja Fefa').fill(REC);
  await p.getByText('Comida y Bebidas', { exact: true }).click(); await p.getByPlaceholder('Calle o dirección').fill('30 E Broad St');
  await p.getByText('Soy cliente', { exact: true }).click(); await p.getByText('Enviar recomendación').click(); await p.getByText('Recomendación enviada').waitFor();
  await a.goto(B + '/admin/colas?cola=rec'); await a.getByText(REC, { exact: true }).first().click(); await t(a, 'Crear semilla').click(); await a.locator('text=/Semilla creada/').waitFor();
  ok(sql(`select count(*) from seed_listings s join recommendations r on r.seed_id = s.id where s.name = '${REC}' and r.status = 'seeded'`) === '1', `«Crear semilla»: «${REC}» queda como semilla (sin reclamar) y la recomendación como sembrada`);
  const v = await (await mob()).newPage(); watch(v, 'vecino'); await v.goto(B + '/c/comida'); await v.locator('text=SIN RECLAMAR').first().scrollIntoViewIfNeeded(); await v.waitForTimeout(500); await v.locator('text=SIN RECLAMAR').first().screenshot({ path: OUT + 'j8-semilla-m.png' }).catch(() => {});
  await shot(v, 'j8b-categoria-m.png', false);
  // El documento privado: sin permiso no se ve
  const cl = sql(`select c.id from claims c join users u on u.id = c.user_id where u.phone = '+1${TB}' order by c.created_at desc limit 1`);
  const r404 = await (await b.newContext()).request.get(B + '/api/admin/reclamo/' + cl);
  ok([401, 403, 404].includes(r404.status()), `el documento del reclamo ${cl} sin permiso → ${r404.status()}`);
  { // F3b · El equipo con «Cambios sensibles»: la caja del caso pide ?w=1080 y baja la variante; sin permiso, la variante da lo mismo que la entera.
    const U = '/api/admin/reclamo/' + cl, ent = await traerVar(a, U), mini = await traerVar(a, U + '?w=320');
    ok(sql(`select cardinality(m.var_widths) > 0 from claims c join media m on m.id = c.doc_media where c.id = '${cl}'`) === 't' && mini.st === 200 && mini.ct === 'image/webp' && mini.n > 0 && mini.n < ent.n && mini.cc === 'private, no-store',
      `F3b: el documento del reclamo tiene sus variantes; ?w=320 baja la WebP (${mini.n} B < ${ent.n} B), privada y sin caché`);
    const v404 = await (await b.newContext()).request.get(B + U + '?w=1080', { headers: { accept: 'image/webp' } }), vq = await traerVar(q, U + '?w=1080');
    ok(v404.status() === r404.status() && vq.st === 404, `F3b: la variante sin permiso (sin sesión ${v404.status()}, quien lo reclamó ${vq.st}): lo mismo que la entera`);
    // 22 nov · El documento ya purgado (la retención o la cuenta borrada dejan la fila con purged_at y «privado/borrada», que no existe en el almacén):
    // para el equipo con permiso da 404 (antes 500), la entera y la variante, y no deja renglón en la auditoría (nadie vio nada).
    const aud = () => sql(`select count(*) from audit_entries where action = 'reclamo.documento.ver' and target_id = '${cl}'`);
    // 22 nov · Un archivo que falta en el almacén con la fila VIVA (sin purgar): 404 al equipo (antes 500), entera y variante, con las mismas cabeceras que
    // «no tienes permiso», y sin renglón de «vio el documento». Con el archivo, el equipo lo ve y SÍ queda su renglón (control).
    const DOC = sql(`select doc_media from claims where id = '${cl}'`), n0 = Number(aud()), ve = await traerVar(a, U);
    ok(ve.st === 200 && Number(aud()) > n0, `control: con el archivo, el equipo ve el documento (${ve.st}) y queda su renglón en la auditoría`);
    const claves = await quitarDelAlmacen(sql, DOC), n1 = aud(), sin = await traerVar(q, U), fal = [await traerVar(a, U), await traerVar(a, U + '?w=320'), await traerVar(a, U + '?w=1080')];
    ok(claves.length >= 2 && sql(`select (purged_at is null) || '|' || status from media where id = '${DOC}'`) === 'true|visible' && sin.st === 404 && fal.every((x) => x.st === 404 && x.cc === sin.cc && x.ct === sin.ct && x.vary === sin.vary) && aud() === n1,
      `el archivo no está pero la fila vive: 404 al equipo (${fal.map((x) => x.st).join('/')}) con las cabeceras de «no tienes permiso», sin renglón en la auditoría (${claves.length} archivos sacados)`);
    ok([sin, ...fal].every((x) => x.cc === 'private, no-store'), `archivo ausente: el 404 es privado y sin caché (${[sin, ...fal].map((x) => x.cc).join(' / ')})`); // 23 nov · nunca se guarda
    sql(`update media set status = 'removed', removed_reason = 'Documento del reclamo (retención)', url = 'privado/borrada', purged_at = now() where id = (select doc_media from claims where id = '${cl}')`);
    const a0 = aud(), pe = await traerVar(a, U), pv = await traerVar(a, U + '?w=320');
    ok(pe.st === 404 && pv.st === 404 && aud() === a0, `el documento purgado da 404 al equipo (entera ${pe.st}, variante ${pv.st}), sin renglón en la auditoría`);
  }
  ok(!err.length, 'sin errores en la página: ' + (err.join(' · ') || 'ninguno'));
  await b.close();
})().catch(e => { console.error('FALLO', e.message.split('\n')[0]); process.exit(1); });
