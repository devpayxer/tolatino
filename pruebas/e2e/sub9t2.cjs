// 9t (22 nov) · Ráfaga de fotos: 30 a la vez contra el servidor (guardián subidaConTope, la pieza común conFotoSubida de lib/subida.ts). Antes,
// 50 fotos de 11,5 MB a la vez llevaban el proceso de ~0,5 GB a ~2,3 GB: cada foto juntada y copiada en memoria y sharp sin límite de cuántas a la
// vez. Ahora cada foto llega al disco, se abre con turno (2 por proceso) y con lugar (16 por proceso, llegando, esperando o abriéndose); sin lugar o
// sin turno a tiempo, 503 honesto. Se comprueba: ninguna 500 (ni conexión caída); cada aceptada quedó guardada entera con sus variantes (la maestra
// del almacén tiene el sha256 y el tamaño de su fila, y existen sus cuatro anchos WebP); cada rechazada recibió el aviso honesto (503, Retry-After,
// «Prueba en un momento.» ES/EN); hubo de las dos; y el servidor siguió contestando /api/salud durante la ráfaga.
// Precondición propia: una cuenta nueva (teléfono 555 libre), con su fecha de alta movida atrás (el tope de fotos de cuenta nueva no es lo que se
// prueba aquí). Necesita el almacén de fotos (Garage): sin él /api/medios contesta 503 antes de leer y la prueba FALLA.
// 23 nov · El tope en Configuración (0212) y la fila de Sistema › Salud: antes de la ráfaga la fila dice el tope de fábrica; después, REVISAR con los
// rechazos que vio esta prueba (contados por el servidor, de este proceso). Ana (Admin) cambia en Configuración › Apps el lugar a 6 y el turno a 1:
// la fila lo dice al momento y la ráfaga siguiente (12 a la vez) lo respeta SIN reiniciar (6 adentro como mucho: el resto, 503 al instante); de vuelta a
// los de fábrica con «Volver al de fábrica», la misma ráfaga de 12 entra entera. Capturas de la fila a 390 y 1360. Deja los de fábrica (también si falla).
const ENT = require('../lib/entorno.cjs');
const http = require('http');
const crypto = require('crypto');
const { chromium } = require('playwright');
const { entrarComo, telLibre, sql, delAlmacen } = require('../lib/negocio-nuevo.cjs');
const { multipart, LIMITE } = require('../lib/subida-cruda.cjs');
const sharp = require(ENT.RAIZ + '/apps/web/node_modules/sharp');
const B = ENT.B;
const OUT = ENT.S + '/cap/', ADM = '5705550199', TOPES = ['fotos_a_la_vez', 'fotos_dentro', 'fotos_espera_s'];
const deFabrica = () => sql(`delete from platform_config where key in (${TOPES.map((k) => `'${k}'`).join(', ')})`);
const espera = async (f, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await new Promise((r) => setTimeout(r, 300)); } return false; };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
// La fila de Salud: el texto del bloque «SUBIDAS DE FOTOS · ESTE PROCESO» (hasta el bloque siguiente).
const filaSalud = async (p) => { await p.goto(B + '/admin/sistema/salud'); const t = await texto(p); const i = t.indexOf('SUBIDAS DE FOTOS · ESTE PROCESO'); return i < 0 ? '' : t.slice(i, i + 420); };
const rechazos10 = (f) => Number((/(\d+) rechazadas en 10 min/.exec(f) || [])[1] ?? -1);
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const RAFAGA = 30;
const subir = (cab, buf) => new Promise((res) => {
  const q = http.request(B + '/api/medios', { method: 'POST', agent: false, headers: { ...cab, 'content-length': String(buf.length) } }, (r) => {
    const c = []; r.on('data', (x) => c.push(x)); r.on('end', () => { let j = null; try { j = JSON.parse(Buffer.concat(c).toString()); } catch { /* sin JSON */ } res({ s: r.statusCode, j, ra: r.headers['retry-after'] }); });
  });
  // El servidor puede contestar 503 sin leer el cuerpo: si la escritura falla DESPUÉS de la respuesta, vale la respuesta.
  q.on('error', (e) => res({ s: 0, err: e.code }));
  q.end(buf);
});
const salud = () => new Promise((res) => {
  const t0 = Date.now();
  const q = http.get(B + '/api/salud', { agent: false, timeout: 10_000 }, (r) => { r.resume(); r.on('end', () => res({ s: r.statusCode, ms: Date.now() - t0 })); });
  q.on('timeout', () => q.destroy(new Error('timeout'))); q.on('error', () => res({ s: 0, ms: Date.now() - t0 }));
});
(async () => {
  deFabrica(); // los topes de fábrica (2 a la vez, 16 de lugar, 30 s): la ráfaga de 30 los da por hechos
  const b = await chromium.launch();
  try {
    const ctx = await b.newContext(); const p = await ctx.newPage();
    const tel = telLibre();
    await entrarComo(p, tel, { nombre: 'Rafaga', apellido: 'Fotos' });
    const U = sql(`select id from users where phone = '+1${tel}'`);
    sql(`update users set created_at = now() - interval '90 days' where id = '${U}'`);
    const cookie = (await ctx.cookies()).map((c) => `${c.name}=${c.value}`).join('; ');
    const cab = { cookie, origin: B, 'content-type': `multipart/form-data; boundary=${LIMITE}` };
    // Una foto de ~11,5 MB (12 MP de ruido: lo más caro que entra por debajo del tope de 12 MB).
    const W = 4000, H = 3000, raw = Buffer.alloc(W * H * 3); let s = 12345;
    for (let i = 0; i < raw.length; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; raw[i] = (((i / 3) | 0) % W * 255 / W + (s >> 16) % 90) & 255; }
    const foto = await sharp(raw, { raw: { width: W, height: H, channels: 3 } }).jpeg({ quality: 97 }).toBuffer();
    ok(foto.length > 10 * 1048576 && foto.length <= 12 * 1048576, `una foto de ${(foto.length / 1048576).toFixed(1)} MB (por debajo del tope de 12 MB)`);
    const buf = multipart(foto, 'foto.jpg', 'image/jpeg');
    const una = await subir(cab, buf);
    ok(una.s === 200 && una.j?.ok, `hay almacén de fotos y una sola sube (${una.s}${una.s === 503 ? ': sin almacén; esta prueba necesita Garage' : ''})`);
    const actx = await b.newContext({ viewport: { width: 1360, height: 900 } }); const ad = await actx.newPage();
    await entrarComo(ad, ADM);
    const f0 = await filaSalud(ad);
    ok(f0.includes('Tope: 2 a la vez, 16 de lugar, espera 30 s') && rechazos10(f0) >= 0 && f0.includes(rechazos10(f0) > 0 ? 'REVISAR' : 'BIEN') && f0.includes('Solo este proceso del servidor.'),
      `Sistema › Salud, antes de la ráfaga: la fila de las subidas de fotos con el tope de fábrica y su estado según la regla (${f0.slice(0, 160)}…)`);
    // La ráfaga, con /api/salud cada 300 ms mientras dura.
    const pulsos = []; let sigue = true;
    const latido = (async () => { while (sigue) { pulsos.push(await salud()); await new Promise((r) => setTimeout(r, 300)); } })();
    const res = await Promise.all(Array.from({ length: RAFAGA }, () => subir(cab, buf)));
    sigue = false; await latido;
    const cuenta = {}; for (const x of res) cuenta[x.s] = (cuenta[x.s] || 0) + 1;
    console.log(`  · ${RAFAGA} a la vez: ${JSON.stringify(cuenta)}`);
    ok(res.every((x) => x.s === 200 || x.s === 503), `${RAFAGA} a la vez: ninguna 500 ni conexión caída (solo 200 o 503: ${JSON.stringify(cuenta)})`);
    const si = res.filter((x) => x.s === 200), no = res.filter((x) => x.s === 503);
    ok(si.length >= 2 && no.length >= 1, `hubo aceptadas y rechazadas (${si.length} y ${no.length}): el turno no deja entrar a todas a la vez`);
    ok(no.every((x) => x.j?.ok === false && x.j?.mensaje?.es === 'Estamos preparando otras fotos en este momento. Prueba en un momento.' && x.j?.mensaje?.en === 'We are processing other photos right now. Try again in a moment.' && /^\d+$/.test(x.ra || '')),
      'cada rechazada recibió el aviso honesto: 503, Retry-After y «Prueba en un momento.» (ES/EN)');
    for (const x of si) {
      ok(x.j?.ok && /^[0-9a-f-]{36}$/.test(x.j.id || ''), `aceptada ${x.j?.id?.slice(0, 8)}: ok con su id`);
      const f = sql(`select coalesce(sha256, '') || '|' || coalesce(bytes::text, '') || '|' || status || '|' || w || 'x' || h from media where id = '${x.j.id}'`).split('|');
      const m = await delAlmacen(`/n/${x.j.id}.jpg`);
      const sha = crypto.createHash('sha256').update(m.b).digest('hex');
      const vars = [];
      for (const w of [320, 640, 1080, 1600]) { const v = await delAlmacen(`/n/${x.j.id}.w${w}.webp`); if (v.s === 200 && (await sharp(v.b).metadata()).width === w) vars.push(w); }
      ok(m.s === 200 && sha === f[0] && String(m.b.length) === f[1] && f[2] === 'visible' && f[3] === '1600x1200' && vars.length === 4,
        `aceptada ${x.j.id.slice(0, 8)}: guardada entera con sus variantes (maestra ${m.b.length} B = su fila, sha igual, ${f[3]}, anchos ${vars.join('/')})`);
    }
    const malos = pulsos.filter((x) => x.s !== 200);
    ok(pulsos.length >= 3 && !malos.length && Math.max(...pulsos.map((x) => x.ms)) < 5000,
      `/api/salud respondió durante la ráfaga (${pulsos.length} veces, todas 200, la más lenta ${Math.max(...pulsos.map((x) => x.ms))} ms)`);
    const despues = await subir(cab, buf);
    ok(despues.s === 200 && despues.j?.ok, `pasada la ráfaga, una foto sube otra vez (${despues.s}): el turno y el lugar se soltaron`);
    // Salud: los rechazos de esta ráfaga, contados por el servidor (de este proceso), y REVISAR.
    const f1 = await filaSalud(ad);
    ok(rechazos10(f1) >= rechazos10(f0) + no.length && f1.includes('REVISAR') && /\d+ en la última hora/.test(f1),
      `Sistema › Salud, después: REVISAR con las ${no.length} rechazadas de la ráfaga (${(/\d+ rechazadas en 10 min · \d+ en la última hora/.exec(f1) || [''])[0]})`);
    await ad.screenshot({ path: OUT + 'sub9t2-salud-1360.png', fullPage: true });
    const tctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }); const tl = await tctx.newPage();
    await entrarComo(tl, ADM); await filaSalud(tl);
    await tl.getByText('SUBIDAS DE FOTOS · ESTE PROCESO', { exact: true }).scrollIntoViewIfNeeded();
    await tl.screenshot({ path: OUT + 'sub9t2-salud-390.png' });
    // Ana cambia el tope en Configuración › Apps (con motivo y auditoría) y la ráfaga siguiente lo respeta sin reiniciar el servidor.
    const cambiar = async (label, v, plantilla) => {
      await ad.goto(B + '/admin/sistema/configuracion'); await ad.getByText(label, { exact: true }).click();
      await ad.locator('input[aria-label^="VALOR NUEVO"]').fill(String(v));
      await ad.getByText(plantilla, { exact: true }).click(); await ad.getByRole('button', { name: 'Guardar', exact: true }).last().click();
    };
    ok(await espera(async () => { await ad.goto(B + '/admin/sistema/configuracion'); const t = await texto(ad); return t.includes('Fotos que se suben · lugar por proceso') && t.includes('Fotos que se suben · a la vez por proceso') && t.includes('Fotos que se suben · espera del turno'); }),
      'Configuración › Apps tiene los tres topes de las fotos');
    const au0 = Number(sql(`select count(*) from audit_entries where action = 'config.cambiar' and target_id in ('fotos_dentro', 'fotos_a_la_vez')`));
    await cambiar('Fotos que se suben · lugar por proceso', 6, 'Ajuste con datos reales');
    ok(await espera(() => sql(`select value::text from platform_config where key = 'fotos_dentro'`) === '6'), 'lugar por proceso = 6, guardado');
    await cambiar('Fotos que se suben · a la vez por proceso', 1, 'Ajuste con datos reales');
    ok(await espera(() => sql(`select value::text from platform_config where key = 'fotos_a_la_vez'`) === '1'), 'a la vez por proceso = 1, guardado');
    ok(Number(sql(`select count(*) from audit_entries where action = 'config.cambiar' and target_id in ('fotos_dentro', 'fotos_a_la_vez')`)) === au0 + 2, 'los dos cambios quedan en la auditoría');
    await cambiar('Fotos que se suben · lugar por proceso', 100, 'Ajuste con datos reales');
    ok(await espera(async () => (await texto(ad)).includes('Entre 6 fotos y 32 fotos.')) && sql(`select value::text from platform_config where key = 'fotos_dentro'`) === '6', 'fuera de los límites (100): se rechaza y nada cambia');
    const f2 = await filaSalud(ad);
    ok(f2.includes('Tope: 1 a la vez, 6 de lugar, espera 30 s'), 'Sistema › Salud dice el tope nuevo al momento (sin reiniciar)');
    const DOCE = 12;
    const rafaga = async () => {
      sql(`update media set created_at = now() - interval '3 hours' where uploaded_by = '${U}'`); // el tope de 60 fotos por hora de la cuenta no es lo que se prueba
      const r = await Promise.all(Array.from({ length: DOCE }, () => subir(cab, buf)));
      const c = {}; for (const x of r) c[x.s] = (c[x.s] || 0) + 1; return { r, c };
    };
    const conTope = await rafaga();
    console.log(`  · ${DOCE} a la vez con lugar 6 y turno 1: ${JSON.stringify(conTope.c)}`);
    ok(conTope.r.every((x) => x.s === 200 || x.s === 503) && (conTope.c[200] || 0) >= 1 && (conTope.c[200] || 0) <= 6 && (conTope.c[503] || 0) >= DOCE - 6,
      `con el tope nuevo la ráfaga de ${DOCE} lo respeta: ${conTope.c[200] || 0} aceptadas (6 de lugar como mucho), ${conTope.c[503] || 0} con «Prueba en un momento.»`);
    await cambiar('Fotos que se suben · lugar por proceso', 16, 'Volver al de fábrica');
    ok(await espera(() => sql(`select value::text from platform_config where key = 'fotos_dentro'`) === '16'), 'de vuelta: lugar 16');
    await cambiar('Fotos que se suben · a la vez por proceso', 2, 'Volver al de fábrica');
    ok(await espera(() => sql(`select value::text from platform_config where key = 'fotos_a_la_vez'`) === '2'), 'de vuelta: 2 a la vez');
    ok((await filaSalud(ad)).includes('Tope: 2 a la vez, 16 de lugar, espera 30 s'), 'Sistema › Salud dice otra vez el de fábrica');
    const sinTope = await rafaga();
    console.log(`  · ${DOCE} a la vez con los de fábrica: ${JSON.stringify(sinTope.c)}`);
    ok(sinTope.c[200] === DOCE, `con los de fábrica la misma ráfaga de ${DOCE} entra entera (${JSON.stringify(sinTope.c)}): el cambio de antes era el tope, no la carga`);
    console.log(`OK (${n} comprobaciones)`);
  } catch (e) { console.error(e); process.exitCode = 1; } finally { deFabrica(); await b.close(); }
})();
