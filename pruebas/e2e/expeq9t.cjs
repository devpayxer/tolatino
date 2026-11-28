// 9t (26 nov) · «Exportar sus datos» del equipo (Super Admin › Usuarios 360° › Privacidad) por el MISMO camino que «Descargar mis datos» de la persona
// (LAUNCH 9t; guardián exportacionEnFlujo): antes el ZIP se armaba entero en memoria y viajaba en base64 por la acción del servidor; ahora se arma a disco,
// sube al almacén privado y se baja en flujo con un POST a /api/admin/usuarios/archivo/<id> (un uso, 10 minutos, solo quien lo armó, con usr:exportar y
// la persona en sus ciudades revisados en CADA descarga). Comprueba:
//   1 · Ana (Admin) lo baja de verdad desde la pantalla (descarga real del navegador): NO vacío, del tamaño y la huella que el servidor guardó, un ZIP
//       válido con lo de siempre (perfil, JSON + CSV, LEEME ES/EN), y es el MISMO archivo que el que la persona arma en Mi cuenta: las mismas
//       partes con las mismas filas (el contenido de antes salvo el envoltorio; el orden de las filas lo pone Postgres, ver abajo). La dirección lleva solo el id del enlace. Auditoría «usuario.exportar» con su motivo, como antes.
//   2 · El enlace no sirve dos veces (410); un GET no lo gasta; tras vencer, 410 y el barrido saca el archivo del almacén (también el ya bajado).
//   3 · Sin permiso: Lucía (Solo lectura) no ve «Exportar sus datos» y, pidiendo la ruta directo, 404; Beto (Admin, pero no lo armó) 404; sin sesión
//       404; desde otro sitio 403. A Beto le quitan usr:exportar (o la ciudad de la persona) entre armarlo y bajarlo → 404 sin gastarlo; se lo
//       devuelven → lo baja.
//   4 · La persona: su archivo pedido convive con el del equipo (el índice de «uno vivo a la vez» es solo de los suyos); no ve el del equipo en Mi
//       cuenta ni puede gastarlo (404).
// Y la causa del «content-length vacío» (LAUNCH): Next 15 quita content-length de toda respuesta de una ruta; el archivo llega entero «chunked».
// Precondiciones propias: una persona nueva (teléfono 555 libre) con 3 000 avisos de prueba (solo suyos) para que el ZIP pese; Ana es de la semilla;
// Beto y Lucía, equipo(). Lo que la prueba cambia del equipo (el rol y las ciudades de Beto) vuelve como estaba en el finally.
const ENT = require('../lib/entorno.cjs'); // rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process'); const fs = require('fs'); const crypto = require('crypto');
const { leerZip } = require('../lib/zip.cjs');
const { entrarComo, telLibre, equipo, delAlmacen } = require('../lib/negocio-nuevo.cjs');
const B = ENT.B, OUT = ENT.OUT;
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const barrido = () => JSON.parse(execSync(`curl -s -X POST -H 'x-barrido-token: ${ENT.TOK}' ${B}/api/interno/barrido`).toString());
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const uid = (t) => sql(`select id from users where phone = '+1${t}'`);
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const t = (p, x) => p.getByText(x, { exact: true }).last();
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const ADM = '5705550199', BETO = '5705550188', LUCIA = '5705550693', RUTA = '/api/admin/usuarios/archivo/';
const RUN = Date.now().toString(36), TAG = `[eq9t ${RUN}]`, AVISOS = 3000;
const ctxDesk = (b) => b.newContext({ viewport: { width: 1360, height: 900 }, acceptDownloads: true });
// POST del mismo sitio al enlace del equipo (como el formulario de la pantalla), desde la página de quien lo pide: estado, cabeceras y bytes.
const postEnlace = (p, id) => p.evaluate(async ([r, id]) => { const x = await fetch(r + id, { method: 'POST' }); return { s: x.status, cl: x.headers.get('content-length'), b: x.ok ? Array.from(new Uint8Array(await x.arrayBuffer())) : [] }; }, [RUTA, id]);
// Armar uno desde la pantalla SIN bajarlo: el formulario POST que dispara la pantalla se contesta 204 aquí (la página se queda y el enlace sigue vivo).
async function armarSinBajar(p, U, motivo) {
  let url = null;
  await p.route(`**${RUTA}**`, async (r) => { if (r.request().method() === 'POST') { url = r.request().url(); await r.fulfill({ status: 204 }); } else await r.continue(); });
  await p.goto(B + `/admin/usuarios/${U}?tab=privacidad`); await t(p, 'Exportar sus datos').click(); await p.locator('textarea').last().fill(motivo); await t(p, 'Descargar').click();
  for (let i = 0; i < 100 && !url; i++) await p.waitForTimeout(100);
  await p.unroute(`**${RUTA}**`);
  if (!url) throw new Error('la pantalla no pidió el archivo');
  return new URL(url).pathname.slice(RUTA.length);
}

(async () => {
  equipo(BETO, LUCIA);
  const BETO_ANTES = sql(`select role || '|' || cities::text from staff_members where user_id = '${uid(BETO)}'`);
  const P = telLibre();
  const b = await chromium.launch();
  try {
    // ── 0 · La persona con lo suyo ──
    const cp = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }), pp = await cp.newPage();
    await entrarComo(pp, P, { nombre: 'Archivo', apellido: 'Equipo' });
    const UP = uid(P);
    sql(`update users set home_city_id = 'hzl', is_test = true where id = '${UP}'`);
    sql(`insert into favorites (user_id, kind, target_id) values ('${UP}', 'business', 'sabor-dominicano') on conflict do nothing`);
    sql(`insert into notifications (user_id, tpl, title, body) select '${UP}', (select key from notif_templates order by key limit 1), 'Aviso ' || g || ' ${TAG}', 'expeq9t' from generate_series(1, ${AVISOS}) g`);
    // La persona ya pidió SU archivo (pendiente): el del equipo no choca con él (migración 0227: «uno vivo a la vez» es solo de los suyos).
    const EP = sql(`insert into data_exports (user_id, is_test) values ('${UP}', true) returning id`).split('\n')[0];
    ok(sql(`select status from data_exports where id = '${EP}'`) === 'pendiente', 'la persona tiene su archivo pedido (pendiente)');

    // ── 1 · Ana lo baja desde la pantalla: descarga real, no vacía, del tamaño guardado, el mismo archivo que el de la persona ──
    console.log('1 · Ana: Exportar sus datos → Descargar (descarga real)');
    const ca = await ctxDesk(b), pa = await ca.newPage(); await entrarComo(pa, ADM);
    const UA = uid(ADM);
    await pa.goto(B + `/admin/usuarios/${UP}?tab=privacidad`); await pa.getByText('SUS ARCHIVOS (DESCARGAR MIS DATOS)').first().waitFor();
    await t(pa, 'Exportar sus datos').click(); await pa.locator('textarea').last().fill(`Pedido de privacidad por Soporte ${TAG}`);
    const resp = pa.waitForResponse((r) => r.url().includes(RUTA) && r.request().method() === 'POST', { timeout: 60000 });
    const dl = pa.waitForEvent('download', { timeout: 60000 });
    await t(pa, 'Descargar').click();
    const [r1, d1] = await Promise.all([resp, dl]);
    const E1 = new URL(r1.url()).pathname.slice(RUTA.length);
    ok(/^[0-9a-f-]{36}$/.test(E1) && !r1.url().includes(UP) && !r1.url().includes(P) && !new URL(r1.url()).search, `la dirección lleva solo el id del enlace (${RUTA}${E1.slice(0, 8)}…), nada de la persona`);
    ok(r1.status() === 200 && r1.headers()['content-type'] === 'application/zip' && /no-store/.test(r1.headers()['cache-control'] ?? ''), `el POST de la pantalla: ${r1.status()} application/zip, no-store`);
    // La causa del «content-length vacío»: Next 15 lo quita de toda respuesta de una ruta; el archivo sale «chunked» y llega entero.
    ok(r1.headers()['content-length'] === undefined, 'sin content-length (Next 15 lo quita de toda respuesta de una ruta; el archivo va «chunked»)');
    const f1 = await d1.path(), bajado = fs.readFileSync(f1);
    const row = sql(`select status || '|' || requested_by || '|' || sha256 || '|' || bytes || '|' || extract(epoch from expires_at - ready_at)::int || '|' || (downloaded_at is not null) || '|' || media_key from data_exports where id = '${E1}'`).split('|');
    ok(bajado.length > 0 && bajado.length === Number(row[3]), `el navegador recibe el archivo NO vacío y del tamaño guardado (${bajado.length} bytes = data_exports.bytes ${row[3]})`);
    ok(sha(bajado) === row[2], `es idéntico byte a byte al guardado (sha256 ${row[2].slice(0, 12)}…)`);
    ok(d1.suggestedFilename() === `tolatino-datos-${UP}.zip`, `el mismo nombre de siempre (${d1.suggestedFilename()})`);
    ok(row[0] === 'bajado' && row[1] === UA && row[5] === 'true' && row[4] === '600' && row[6] === `privado/exportes/${E1}.zip`, 'data_exports: lo armó Ana (requested_by), vencía a los 10 minutos, quedó «bajado»');
    const z = leerZip(bajado), J = (k) => JSON.parse(z[`${k}.json`].toString('utf8'));
    ok(J('perfil')[0]?.phone === `+1${P}` && !!z['perfil.csv'] && J('guardados').length === 1 && Array.isArray(J('sesiones')) && Array.isArray(J('sanciones')), 'un ZIP válido con lo de siempre: su perfil, guardados, sesiones y sanciones, en JSON y CSV');
    ok(J('avisos').length >= AVISOS && z['avisos.csv'].toString('utf8').split('\r\n').length - 1 === J('avisos').length, `sus ${J('avisos').length} avisos en JSON y en CSV`);
    ok(/ES · /.test(z['LEEME.txt']) && /EN · /.test(z['LEEME.txt']), 'el LEEME en español e inglés');
    ok(!/token_hash|code_hash|phone_enc/.test(Object.values(z).map((x) => x.toString('utf8')).join('\n')), 'sin huellas ni cifrados (igual que siempre)');
    const au = sql(`select count(*) || '|' || max(reason) || '|' || max(after->>'archivo') from audit_entries where actor_id = '${UA}' and action = 'usuario.exportar' and target_id = '${UP}'`).split('|');
    ok(au[0] === '1' && au[1] === `Pedido de privacidad por Soporte ${TAG}` && /^ZIP por el mapa de datos \(\d+ partes\)$/.test(au[2]), `auditoría como antes: «usuario.exportar» con su motivo y «${au[2]}»`);
    // El mismo archivo que la persona pide en Mi cuenta (lo arma el barrido): BYTE A BYTE igual, parte por parte (28 nov: cada parte sale en el orden de
    // su llave; antes el plan de Postgres cambiaba el orden entre los dos armados y la huella con él).
    for (let i = 0; i < 8 && sql(`select status from data_exports where id = '${EP}'`) !== 'listo'; i++) barrido();
    const zp = leerZip((await delAlmacen(`/privado/exportes/${EP}.zip`)).b);
    const iguales = Object.keys(z).sort().join() === Object.keys(zp).sort().join() && Object.keys(z).every((k) => sha(zp[k]) === sha(z[k]));
    ok(iguales && sql(`select sections - '_ms' = (select sections - '_ms' from data_exports where id = '${E1}') from data_exports where id = '${EP}'`) === 't',
      `es el MISMO archivo que el que la persona arma en Mi cuenta: las mismas ${Object.keys(z).length} partes, cada una idéntica byte a byte (sha256), y las mismas cuentas por parte`);
    // Ese mismo barrido ya sacó del almacén el del equipo bajado (como el de la persona).
    ok(sql(`select status || '|' || (file_gone_at is not null) from data_exports where id = '${E1}'`) === 'bajado|true' && (await delAlmacen(`/privado/exportes/${E1}.zip`)).s === 404, 'el barrido saca del almacén el archivo del equipo ya bajado');
    ok(!fs.existsSync(require('path').join(require('os').tmpdir(), 'tl-exportes', `${E1}.zip`)), 'y el temporal de disco no quedó (el servidor corre en esta máquina)');
    await pa.reload(); await pa.getByText('SUS ARCHIVOS (DESCARGAR MIS DATOS)').first().waitFor();
    { const T = await texto(pa); ok(/Lo pidió Ana [A-Z]? ?\(equipo\)/.test(T) && T.includes('Lo pidió la persona'), 'Usuarios 360° › Sus archivos: el de Ana («Lo pidió Ana… (equipo)») y el de la persona'); }
    await pa.screenshot({ path: OUT + 'expeq9t-sus-archivos-1360.png', fullPage: true });

    // ── 2 · Un uso; un GET no lo gasta; vencido; el barrido lo saca del almacén ──
    console.log('2 · Un uso, GET, vencido, purga');
    const dos = await postEnlace(pa, E1);
    ok(dos.s === 410 && !dos.b.length, `el mismo enlace otra vez → ${dos.s}`);
    const E2 = await armarSinBajar(pa, UP, `Segundo pedido ${TAG}`);
    ok(sql(`select status from data_exports where id = '${E2}'`) === 'listo', 'otro enlace, armado y sin bajar (listo)');
    const g = execSync(`curl -s -o /dev/null -w '%{http_code} %{redirect_url}' ${B}${RUTA}${E2}`).toString();
    ok(/^303 .*\/admin\/usuarios$/.test(g) && sql(`select status from data_exports where id = '${E2}'`) === 'listo', `un GET (vista previa de un enlace) lleva a Usuarios y no lo gasta: ${g}`);
    sql(`update data_exports set expires_at = now() - interval '1 second' where id = '${E2}'`);
    const venc = await postEnlace(pa, E2);
    ok(venc.s === 410, `vencido → ${venc.s}`);
    ok((await delAlmacen(`/privado/exportes/${E2}.zip`)).s === 200, 'antes del barrido, el vencido sigue en el almacén privado');
    barrido();
    ok(sql(`select status || '|' || (file_gone_at is not null) from data_exports where id = '${E2}'`) === 'vencido|true' && (await delAlmacen(`/privado/exportes/${E2}.zip`)).s === 404, 'el barrido lo purga: queda «vencido» y fuera del almacén');

    // ── 3 · Sin permiso ──
    console.log('3 · Sin permiso: Lucía, Beto, sin sesión, otro sitio, permiso quitado entre armar y bajar');
    const E3 = await armarSinBajar(pa, UP, `Tercer pedido ${TAG}`);
    const cl = await ctxDesk(b), pl = await cl.newPage(); await entrarComo(pl, LUCIA);
    await pl.goto(B + `/admin/usuarios/${UP}?tab=privacidad`); await pl.getByText('SUS ARCHIVOS (DESCARGAR MIS DATOS)').first().waitFor();
    { const T = await texto(pl); ok(T.includes('Tu rol no exporta datos.') && !(await pl.getByText('Exportar sus datos', { exact: true }).count()), 'Lucía (Solo lectura) no ve «Exportar sus datos» («Tu rol no exporta datos.»)'); }
    const lu = await postEnlace(pl, E3);
    ok(lu.s === 404 && !lu.b.length, `Lucía pide la ruta directo con el enlace de Ana → ${lu.s}`);
    const cb = await ctxDesk(b), pb = await cb.newPage(); await entrarComo(pb, BETO);
    const be = await postEnlace(pb, E3);
    ok(be.s === 404 && !be.b.length, `Beto (Admin, pero no lo armó) → ${be.s}`);
    const sin = execSync(`curl -s -o /dev/null -w '%{http_code}' -X POST -H 'origin: ${B}' ${B}${RUTA}${E3}`).toString();
    ok(sin === '404', `sin sesión → ${sin}`);
    const cookieA = (await ca.cookies()).map((c) => `${c.name}=${c.value}`).join('; ');
    const otro = execSync(`curl -s -o /dev/null -w '%{http_code}' -X POST -H 'origin: https://otro-sitio.example' -H 'cookie: ${cookieA}' ${B}${RUTA}${E3}`).toString();
    ok(otro === '403', `con la sesión de Ana pero desde otro sitio → ${otro}`);
    ok(sql(`select status || '|' || (downloaded_at is null) from data_exports where id = '${E3}'`) === 'listo|true', 'nada de eso lo gastó (sigue listo)');
    const a3 = await postEnlace(pa, E3);
    ok(a3.s === 200 && sha(Buffer.from(a3.b)) === sql(`select sha256 from data_exports where id = '${E3}'`), 'Ana (quien lo armó) sí lo baja');
    // El permiso se revisa en CADA descarga, no solo al armar.
    const E4 = await armarSinBajar(pb, UP, `Pedido de Beto ${TAG}`);
    ok(sql(`select requested_by from data_exports where id = '${E4}'`) === uid(BETO), 'Beto arma el suyo');
    sql(`update staff_members set role = 'lectura' where user_id = '${uid(BETO)}'`);
    const b1 = await postEnlace(pb, E4);
    ok(b1.s === 404, `a Beto le quitan usr:exportar (rol Solo lectura) antes de bajarlo → ${b1.s}`);
    sql(`update staff_members set role = 'admin', cities = '{alw}' where user_id = '${uid(BETO)}'`);
    const b2 = await postEnlace(pb, E4);
    ok(b2.s === 404, `Beto de vuelta Admin pero solo de Allentown (la persona es de Hazleton) → ${b2.s}`);
    ok(sql(`select status from data_exports where id = '${E4}'`) === 'listo', 'ninguno lo gastó');
    sql(`update staff_members set cities = '{}' where user_id = '${uid(BETO)}'`);
    const b3 = await postEnlace(pb, E4);
    ok(b3.s === 200 && b3.b.length > 0 && sha(Buffer.from(b3.b)) === sql(`select sha256 from data_exports where id = '${E4}'`), 'con el permiso y la ciudad otra vez, Beto lo baja (idéntico al guardado)');

    // ── 4 · La persona no ve ni gasta los del equipo ──
    console.log('4 · La persona');
    const pe = await pp.evaluate(async ([r, id]) => (await fetch(`/api/datos/archivo/${id}`, { method: 'POST' })).status, [RUTA, E4]);
    ok(pe === 404, `la persona pide un enlace del equipo por su ruta → ${pe}`);
    const pr = await postEnlace(pp, E4);
    ok(pr.s === 404, `y por la del equipo → ${pr.s}`);
    await pp.goto(B + '/cuenta/ajustes/privacidad/datos'); await pp.getByText('Tu archivo está listo').first().waitFor();
    { const T = await texto(pp); ok(!T.includes('Ya lo bajaste') && (T.match(/Tu archivo está listo/g) ?? []).length === 1, 'en Mi cuenta ve solo el suyo (listo), ningún archivo del equipo'); }
    ok(sql(`select count(*) from data_exports where user_id = '${UP}' and requested_by is not null`) === '4', 'los cuatro del equipo quedan anotados (nada se borra)');
    await cp.close(); await ca.close(); await cl.close(); await cb.close();
    console.log(`\n✓ expeq9t: ${n} comprobaciones`);
  } finally {
    // El equipo como estaba: el rol y las ciudades de Beto.
    const [rol, ci] = BETO_ANTES.split('|');
    sql(`update staff_members set role = '${rol}', cities = '${ci}' where user_id = '${uid(BETO)}'`);
    await b.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
