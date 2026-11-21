// Revisión automática de las fotos públicas (decisión AJ, 20 nov; docs/diseno/plan/fotos-revision-automatica.md) · De punta a punta con el
// almacén de verdad (Garage), el servidor, el modelo propio DE MENTIRA (pruebas/lib/sim-moderacion-img.cjs en :8790: el puntaje sale del ancho de
// la foto) y el simulador de la segunda opinión (lib/compa/modelo-simulador.ts: el veredicto sale del alto). Comprueba:
//   1 limpia → visible, con variantes, y su veredicto en el libro
//   2 clara → 422 rechazada, sin dirección, nada bajo /medios/n/ (404), el archivo solo en la llave privada, aviso; «Pedir revisión» (Mi cuenta ›
//     Avisos de moderación) crea la apelación; otra persona del equipo la levanta → se publica; al volver a subirla entra directo (memoria);
//     ese contenido subido por otra persona no se rechaza por memoria
//   3 dudosa: la segunda opinión publica · rechaza (documento) · no segura · respuesta que no encaja · error → visible / 422 / 202 / 202 / 202
//   4 el modelo propio no responde → la segunda opinión decide (nunca publicada sin un «publicar»)
//   5 capa 2 apagada → retenida; el barrido NO la resuelve apagada; al encenderla, sí (y el aviso «ya se puede publicar»)
//   6 confianza: alguien del equipo de un negocio verificado con 10 fotos → su dudosa entra sin la segunda opinión; su clara se rechaza igual
//   7 cuenta nueva: 10 fotos por hora (la 11 → 429 con el porqué)
//   8 capa 3: 3 reportes de cuentas distintas (la de una cuenta nueva no cuenta) → la foto y su copia se ocultan, el archivo sale de n/, aviso;
//     la segunda opinión la aprueba → vuelve (archivo, variantes, cuenta de fotos, reportes «se mantiene»)
//   9 una foto privada (Mensajes) jamás llega a la segunda opinión, y a la segunda opinión no le llega nada de quién subió la foto; una dudosa
//     con destino «privado» (va solo a un negocio: una solicitud, una cita…) queda retenida sin pasar por la segunda opinión, ni al subir ni en
//     el barrido; una limpia con ese destino entra igual y una clara se rechaza igual; con el modelo propio caído, la privada ENTRA (y queda en
//     el libro como c1 · sin_servicio) y la pública sigue retenida
// Necesita el almacén de fotos (el CI lo tiene): sin él /api/medios contesta 503 y la prueba FALLA, salvo con REV9U_SIN_ALMACEN=1 (local).
// Deja todo como estaba: las reglas foto1…foto4 y el servicio propio de imágenes (si estaba encendido, lo vuelve a encender como com5d).
// Guardianes fotosRevisionAntesDePublicar, fotosRevisionPrivacidad, fotosRevisionFalloCerrado, fotosRevisionAuditada, fotosRevisionSinReintento.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), http = require('http');
const { execSync, spawn } = require('child_process');
const { randomUUID } = require('crypto');
const { chromium } = require('playwright');
const { entrarComo, telLibre, sql, servirMedio, delAlmacen, medios, equipo } = require('../lib/negocio-nuevo.cjs');
const { multipart, LIMITE } = require('../lib/subida-cruda.cjs');
const sharp = require(ENT.RAIZ + '/apps/web/node_modules/sharp');
const B = ENT.B;
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const espera = async (f, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await new Promise((r) => setTimeout(r, 300)); } return false; };
const vis = async (l) => { const k = await l.count(); for (let i = 0; i < k; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let k = 0; k < 40; k++) { const x = await vis(l); if (x) { await x.click(); return; } await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l); };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const contiene = (p, t) => espera(async () => (await texto(p)).includes(t));

// Una foto de ese ancho y ese alto, con contenido propio (la semilla cambia el contenido: memoria por contenido).
const foto = (w, h, semilla) => {
  const b = Buffer.alloc(w * h * 3); let x = semilla * 7919 + 13;
  for (let i = 0; i < b.length; i++) { x = (x * 1103515245 + 12345) & 0x7fffffff; b[i] = 60 + ((x >> 16) % 140); }
  return sharp(b, { raw: { width: w, height: h, channels: 3 } }).jpeg({ quality: 90 }).toBuffer();
};
const subir = (cookie, bytes, ruta = '/api/medios', extra = {}) => new Promise((res, rej) => {
  const cuerpo = multipart(bytes, 'foto.jpg', 'image/jpeg', extra);
  const q = http.request(B + ruta, { method: 'POST', headers: { cookie, origin: B, 'content-type': `multipart/form-data; boundary=${LIMITE}`, 'content-length': String(cuerpo.length) } }, (r) => {
    const c = []; r.on('data', (x) => c.push(x)); r.on('end', () => { let json = null; try { json = JSON.parse(Buffer.concat(c).toString()); } catch { /* sin json */ } res({ status: r.statusCode, json }); });
  });
  q.on('error', rej); q.end(cuerpo);
});
const interno = (cuerpo) => fetch(B + '/api/interno/compa', { method: 'POST', headers: { 'x-barrido-token': ENT.TOK, 'content-type': 'application/json' }, body: JSON.stringify(cuerpo) }).then((r) => r.json());
const fotosVistas = async () => ((await interno({ op: 'simulador' })).recibidos ?? []).filter((x) => x.uso === 'foto');
const barrer = () => fetch(B + '/api/interno/barrido', { method: 'POST', headers: { 'x-barrido-token': ENT.TOK } }).then((r) => r.json());
const fila = (id) => { const [st, rr, ll, capa, mot, it] = sql(`select status, coalesce(removed_reason, ''), coalesce(rev_llave, ''), coalesce(rev_capa, ''), coalesce(rev_motivo, ''), rev_intentos from media where id = '${id}'`).split('|'); return { st, rr, ll, capa, mot, it: Number(it) }; };
const libro = (id) => sql(`select string_agg(capa || ':' || decision, ',' order by id) from photo_reviews where media_id = '${id}'`);
const uid = (tel) => sql(`select id from users where phone = '+1${tel}'`);
const corteAbajo = () => sql(`delete from rate_counters where scope in ('corte', 'corte_fallas') and key_hash = 'moderacion_img'`);
const saludImg = () => { try { return JSON.parse(execSync('curl -s -m 3 localhost:8790/salud').toString()); } catch { return null; } };

(async () => {
  const b = await chromium.launch();
  const reglas0 = sql(`select json_agg(json_build_object('k', key, 'on', enabled, 'p', params)) from mod_rules where key like 'foto_'`);
  const SVC0 = saludImg()?.ok === true && !/simulador/.test(saludImg()?.modelo ?? '');
  let sim = null;
  try {
    // ── El modelo propio de mentira en :8790 (el de verdad se apaga mientras dura) y las reglas como de fábrica ──
    try { execSync("pkill -f 'services/moderacion-img/app.py'"); } catch { /* no estaba */ }
    try { execSync("pkill -f 'pruebas/lib/sim-moderacion-img.cjs'"); } catch { /* no estaba */ }
    await espera(async () => !saludImg(), 8000);
    sim = spawn('node', [ENT.RAIZ + '/pruebas/lib/sim-moderacion-img.cjs', '8790'], { stdio: 'ignore' });
    ok(await espera(async () => /simulador/.test(saludImg()?.modelo ?? '')), 'el modelo propio de mentira responde en :8790');
    corteAbajo();
    sql(`update mod_rules set enabled = true, params = case key when 'foto1' then '{"duda_pct": 60, "rechazo_pct": 85}'::jsonb when 'foto2' then '{"tope_cents": 1000, "espera_s": 8, "intentos": 5}'::jsonb
           when 'foto3' then '{"reportes": 3, "edad_h": 72}'::jsonb else '{"fotos": 10, "dias": 90, "nueva_dias": 7, "nueva_hora": 10}'::jsonb end where key like 'foto_'`);
    await interno({ op: 'olvidar' });

    const ctx = await b.newContext(); await medios(ctx); const p = await ctx.newPage();
    const TA = telLibre(); await entrarComo(p, TA, { nombre: 'Yolotzin', apellido: 'Quetzal' });
    const A = uid(TA); sql(`update users set created_at = now() - interval '30 days' where id = '${A}'`);
    const cA = (await ctx.cookies()).map((c) => `${c.name}=${c.value}`).join('; ');

    // ── 1 · Limpia ──
    const r1 = await subir(cA, await foto(401, 300, 1));
    if (r1.status === 503 && process.env.REV9U_SIN_ALMACEN === '1') { console.log('  · sin almacén de fotos (local): /api/medios contesta 503 — esta prueba corre en el CI'); console.log(`OK (${n} comprobaciones, parcial)`); return; }
    ok(r1.status === 200 && r1.json?.ok && /^\/medios\/n\//.test(r1.json.url), `limpia → se publica (${r1.status})`);
    ok(fila(r1.json.id).st === 'visible' && libro(r1.json.id) === 'c1:publicar', 'visible y su veredicto en el libro (capa 1)');
    ok((await delAlmacen(`/n/${r1.json.id}.w320.webp`)).s === 200, 'con sus variantes');

    // ── 2 · Clara → rechazada; Pedir revisión → una persona la levanta → al volver a subirla entra directo ──
    const clara = await foto(403, 300, 2);
    const r2 = await subir(cA, clara);
    ok(r2.status === 422 && r2.json?.ok === false && r2.json.estado === 'rechazada' && !('url' in r2.json) && /No podemos publicar/.test(r2.json.mensaje?.es) && /can't publish/.test(r2.json.mensaje?.en), 'clara → 422, rechazada, el motivo ES/EN y SIN dirección');
    const F2 = r2.json.id, f2 = fila(F2);
    ok(f2.st === 'removed' && f2.rr === 'revision' && f2.ll === `privado/rev/${F2}.jpg`, 'la fila: quitada por la revisión, con su llave privada');
    ok((await delAlmacen(`/n/${F2}.jpg`)).s === 404 && (await servirMedio(`/medios/n/${F2}.jpg`)).s === 404 && (await servirMedio(`/medios/n/${F2}.w640.webp`, 'image/webp')).s === 404, 'nada bajo /medios/n/ (404, ni la maestra ni una variante)');
    ok((await delAlmacen(`/privado/rev/${F2}.jpg`)).s === 200, 'el archivo existe solo en la llave privada');
    ok(await espera(() => sql(`select count(*) from notifications where user_id = '${A}' and tpl = 'foto_rechazada' and ref_id = '${F2}'`) !== '0'), 'aviso «No publicamos tu foto»');
    ok((await p.goto(B + `/api/medios/revision/${F2}`)).status() === 200, 'quien la subió la puede ver (por la ruta privada, sin dirección pública)');
    await p.goto(B + `/cuenta/moderacion?k=media&id=${F2}`); await p.getByText('No publicamos tu foto').first().waitFor();
    await p.getByLabel('POR QUÉ ESTÁ BIEN').fill('Es la foto del mostrador de mi negocio, no tiene nada malo.');
    await clic(p.getByRole('button', { name: 'Pedir revisión' }));
    ok(await contiene(p, 'va a mirar tu foto'), 'Pedir revisión: «Una persona de To\'Latino va a mirar tu foto»');
    const AP = sql(`select id from appeals where user_id = '${A}' and target_kind = 'media' and target_id = '${F2}'`);
    const QA = sql(`select id from queue_items where queue = 'apel' and subject_id = '${AP}' and status = 'open'`);
    ok(!!AP && !!QA, 'la apelación está en la cola «apel»');
    equipo('5705550188');
    const adm = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); await entrarComo(adm, '5705550188');
    await adm.goto(B + '/admin/colas?caso=' + QA); await adm.getByText('LO QUE ESCRIBIÓ').first().waitFor();
    ok(await contiene(adm, 'mostrador de mi negocio'), 'otra persona del equipo ve la apelación');
    await clic(adm.getByRole('button', { name: 'Levantar' })); await clic(adm.getByText('Tenía razón: no rompe las reglas', { exact: true })); await clic(adm.getByRole('button', { name: 'Levantar' }));
    ok(await espera(() => sql(`select status from appeals where id = ${AP}`) === 'lifted'), 'la levanta');
    ok(await espera(() => fila(F2).st === 'visible') && fila(F2).capa === 'persona' && fila(F2).ll === '' && (await delAlmacen(`/n/${F2}.jpg`)).s === 200, 'la foto se publica: visible, su archivo en n/ y sin llave privada');
    ok(/persona:publicar/.test(libro(F2)), 'en el libro: la decidió una persona');
    ok(await espera(() => sql(`select count(*) from audit_entries where action = 'fotos.revision.ver' and target_id = '${F2}'`) !== '0'), 'que el equipo la viera (por la ruta privada, con la apelación abierta) quedó en la auditoría');
    const r2b = await subir(cA, clara);
    ok(r2b.status === 200 && fila(r2b.json.id).capa === 'memoria', 'al volver a subirla entra directo (memoria por contenido)');
    const ctxB = await b.newContext(); const pB = await ctxB.newPage(); const TB = telLibre(); await entrarComo(pB, TB, { nombre: 'Otra', apellido: 'Persona' });
    sql(`update users set created_at = now() - interval '30 days' where phone = '+1${TB}'`);
    const cB = (await ctxB.cookies()).map((c) => `${c.name}=${c.value}`).join('; ');
    const r2c = await subir(cB, clara);
    ok(r2c.status === 422 && fila(r2c.json.id).capa === 'c1', 'el mismo contenido subido por otra persona: la apelación ganada no vale para ella, pero tampoco hay rechazo por memoria (la mira la capa 1)');

    // ── 3 · Dudosa → la segunda opinión decide ──
    const casos = [[301, 200, 'visible', 'publicar'], [302, 422, 'removed', 'rechazar (documento)'], [303, 202, 'review', 'no segura'], [304, 202, 'review', 'una respuesta que no encaja'], [305, 202, 'review', 'un error del proveedor']];
    for (const [alto, st, estado, que] of casos) {
      const r = await subir(cA, await foto(402, alto, 30 + alto));
      ok(r.status === st && fila(r.json.id).st === estado && (st === 200 || (!('url' in r.json) && r.json.ok === false)), `dudosa, la segunda opinión: ${que} → ${st} (${estado})`);
      if (alto === 302) ok(fila(r.json.id).mot === 'documento' && /documento de identidad/.test(r.json.mensaje.es), 'rechazada con el motivo de la pauta (documento)');
      if (alto === 303) ok(r.json.estado === 'revision' && /en revisión/.test(r.json.mensaje.es) && libro(r.json.id) === 'c1:retener,c2:retener', 'retenida: «en revisión» y el libro con las dos capas');
    }
    ok((await fotosVistas()).some((x) => x.imagen?.ancho === 402 && x.imagen?.alto === 301), 'la segunda opinión recibió la dudosa');

    // ── 4 · El modelo propio no responde → decide la segunda opinión ──
    const r4 = await subir(cA, await foto(404, 301, 4));
    ok(r4.status === 200 && fila(r4.json.id).capa === 'c2', 'modelo propio caído → la segunda opinión la publica (c2)');
    const r4b = await subir(cA, await foto(404, 303, 5));
    ok(r4b.status === 202 && fila(r4b.json.id).st === 'review', 'modelo propio caído y la segunda opinión no está segura → retenida (nunca publicada)');
    corteAbajo();

    // ── 5 · Capa 2 apagada → retenida; el barrido la resuelve al encenderla ──
    sql(`update mod_rules set enabled = false where key = 'foto2'`);
    const r5 = await subir(cA, await foto(402, 301, 6));
    ok(r5.status === 202 && fila(r5.json.id).mot === 'apagada', 'capa 2 apagada → retenida (apagada)');
    sql(`update media set rev_siguiente = now() - interval '1 minute' where id = '${r5.json.id}'`);
    await barrer();
    ok(fila(r5.json.id).st === 'review' && fila(r5.json.id).it === 0, 'el barrido con la capa 2 apagada no la toca (ni gasta intentos)');
    sql(`update mod_rules set enabled = true where key = 'foto2'`);
    sql(`update media set rev_siguiente = now() - interval '1 minute' where id = '${r5.json.id}'`);
    ok(await espera(async () => { await barrer(); return fila(r5.json.id).st === 'visible'; }, 30000), 'encendida: el barrido la publica');
    ok((await delAlmacen(`/n/${r5.json.id}.jpg`)).s === 200 && (await delAlmacen(`/privado/rev/${r5.json.id}.jpg`)).s === 404 && (await delAlmacen(`/n/${r5.json.id}.w320.webp`)).s === 200, 'su archivo pasó a n/ (con variantes) y la copia privada salió');
    ok(await espera(() => sql(`select count(*) from notifications where user_id = '${A}' and tpl = 'foto_aprobada' and ref_id = '${r5.json.id}'`) !== '0'), 'aviso «Tu foto ya se puede publicar»');
    const r5b = await subir(cA, await foto(402, 301, 6));
    ok(r5b.status === 200 && fila(r5b.json.id).capa === 'memoria', 'y al volver a subirla entra directo');
    const r5c = await subir(cB, await foto(402, 301, 6));
    ok(r5c.status === 200 && fila(r5c.json.id).capa === 'c2', 'ese contenido subido por otra persona no entra directo: vuelve a pasar por la revisión (c2)');

    // ── 6 · Confianza ──
    const ctxC = await b.newContext(); await medios(ctxC); const pC = await ctxC.newPage(); const TC = telLibre(); await entrarComo(pC, TC, { nombre: 'Dueña', apellido: 'Confiable' });
    const C = uid(TC); sql(`update users set created_at = now() - interval '60 days' where id = '${C}'`);
    const cC = (await ctxC.cookies()).map((c) => `${c.name}=${c.value}`).join('; ');
    const NEG = `rev9u-${TC.slice(-4)}`;
    sql(`insert into businesses (id, city_id, category_id, name, status) values ('${NEG}', 'hzl', 'NEG-FOOD', 'Revisión Nueve', 'active') on conflict (id) do nothing`);
    sql(`insert into business_stats_cache (business_id, verified) values ('${NEG}', true) on conflict (business_id) do update set verified = true`);
    sql(`insert into business_members (business_id, user_id, kind, status, display_name) values ('${NEG}', '${C}', 'owner', 'active', 'Dueña')`);
    sql(`insert into media (owner_kind, owner_id, url, uploaded_by, status, sort) select 'business', '${NEG}', 'https://images.pexels.com/photos/' || g || '/rev9u.jpeg', '${C}', 'visible', g from generate_series(1, 10) g`);
    const antes6 = (await fotosVistas()).length;
    const r6 = await subir(cC, await foto(402, 303, 60));
    ok(r6.status === 200 && fila(r6.json.id).capa === 'c4' && (await fotosVistas()).length === antes6, 'del equipo de un negocio verificado con 10 fotos: su dudosa entra por la capa 4, sin la segunda opinión');
    const r6b = await subir(cC, await foto(403, 300, 61));
    ok(r6b.status === 422, 'su clara se rechaza igual');

    // ── 7 · Cuenta nueva: 10 por hora ──
    const ctxD = await b.newContext(); const pD = await ctxD.newPage(); const TD = telLibre(); await entrarComo(pD, TD, { nombre: 'Cuenta', apellido: 'Nueva' });
    const cD = (await ctxD.cookies()).map((c) => `${c.name}=${c.value}`).join('; ');
    const sts = []; for (let i = 0; i < 10; i++) sts.push((await subir(cD, await foto(120, 90, 700 + i))).status);
    const r7 = await subir(cD, await foto(120, 90, 799));
    ok(sts.every((x) => x === 200) && r7.status === 429 && /cuentas nuevas/i.test(r7.json?.mensaje?.es) && /10/.test(r7.json?.mensaje?.es), `cuenta nueva: 10 fotos en la hora y la 11 → 429 con el porqué (${sts.join(',')} · ${r7.status})`);

    // ── 8 · Capa 3: reportes ──
    const r8 = await subir(cC, await foto(401, 330, 80));
    const G = r8.json.id, URL8 = `/medios/n/${G}.jpg`;
    sql(`update media set owner_kind = 'business', owner_id = '${NEG}', sort = 0 where id = '${G}'`);
    sql(`update business_stats_cache set photo_count = (select count(*) from media where owner_kind = 'business' and owner_id = '${NEG}' and status = 'visible') where business_id = '${NEG}'`);
    const COPIA = randomUUID();
    sql(`insert into media (id, owner_kind, owner_id, url, uploaded_by, status) values ('${COPIA}', 'post', '0', '${URL8}', '${C}', 'visible')`);
    const rep = [];
    for (let i = 0; i < 4; i++) { const t = telLibre(); sql(`insert into users (phone, first_name, home_city_id, created_at) values ('+1${t}', 'Rep${i}', 'hzl', ${i === 3 ? 'now()' : "now() - interval '10 days'"})`); rep.push(uid(t)); }
    sql(`update mod_rules set enabled = false where key = 'foto2'`);   // para ver la foto oculta antes de la segunda opinión
    sql(`insert into photo_reports (media_id, reporter_user_id, reason) values ('${G}', '${rep[0]}', 'inapropiado'), ('${G}', '${rep[1]}', 'inapropiado'), ('${G}', '${rep[3]}', 'inapropiado')`);
    await barrer();
    ok(fila(G).st === 'visible', 'dos cuentas viejas y una nueva (no cuenta) → sigue visible');
    sql(`insert into photo_reports (media_id, reporter_user_id, reason) values ('${G}', '${rep[2]}', 'inapropiado')`);
    ok(await espera(async () => { await barrer(); return fila(G).st === 'review'; }, 20000), 'tres cuentas distintas → oculta');
    ok(fila(G).capa === 'c3' && fila(COPIA).st === 'review' && fila(G).ll === `privado/rev/${G}.jpg`, 'la foto y su copia (la misma dirección) dejan de verse');
    ok((await delAlmacen(`/n/${G}.jpg`)).s === 404 && (await delAlmacen(`/n/${G}.w320.webp`)).s === 404 && (await delAlmacen(`/privado/rev/${G}.jpg`)).s === 200, 'su archivo y sus variantes salieron de n/ a la llave privada');
    ok(sql(`select photo_count from business_stats_cache where business_id = '${NEG}'`) === '10', 'la cuenta de fotos del negocio bajó (10 de 11)');
    ok(await espera(() => sql(`select count(*) from notifications where user_id = '${C}' and tpl = 'foto_oculta' and ref_id = '${G}'`) !== '0'), 'aviso al dueño «Una foto tuya está en revisión»');
    sql(`update mod_rules set enabled = true where key = 'foto2'`); sql(`update media set rev_siguiente = now() - interval '1 minute' where id = '${G}'`);
    ok(await espera(async () => { await barrer(); return fila(G).st === 'visible'; }, 30000), 'la segunda opinión la aprueba → vuelve');
    ok(fila(COPIA).st === 'visible' && (await delAlmacen(`/n/${G}.jpg`)).s === 200 && (await delAlmacen(`/n/${G}.w320.webp`)).s === 200 && sql(`select photo_count from business_stats_cache where business_id = '${NEG}'`) === '11', 'con su copia, su archivo, sus variantes y la cuenta de fotos');
    ok(sql(`select count(*) from photo_reports where media_id = '${G}' and status = 'kept'`) === '4' && /c3:ocultar.*c2:publicar/.test(libro(G)), 'los reportes quedan «se mantiene» y el libro dice capa 3 → capa 2');

    // ── 9 · Una foto privada jamás llega a la segunda opinión; a la segunda opinión no le llega quién la subió ──
    const antes9 = (await fotosVistas()).length;
    const r9 = await subir(cA, await foto(402, 377, 90), '/api/mensajes/foto');
    ok(r9.status === 200 && r9.json?.revision === true, 'la foto de un mensaje (dudosa para el modelo propio) queda en revisión, como siempre');
    await barrer();
    const vistas = await fotosVistas();
    ok(vistas.length === antes9 && !vistas.some((x) => x.imagen?.alto === 377), 'una foto privada (Mensajes) jamás llega a la segunda opinión');
    const r9b = await subir(cA, await foto(402, 301, 91), '/api/medios', { destino: 'privado' });
    ok(r9b.status === 202 && r9b.json?.estado === 'revision' && fila(r9b.json.id).mot === 'privada' && sql(`select rev_sin_c2 from media where id = '${r9b.json.id}'`) === 't', 'una dudosa con destino privado queda retenida («privada»), aunque la segunda opinión la habría publicado');
    sql(`update media set rev_siguiente = now() - interval '1 minute' where id = '${r9b.json.id}'`); await barrer();
    ok((await fotosVistas()).length === antes9 && fila(r9b.json.id).st === 'review', 'dudosa con destino privado → retenida y la segunda opinión no recibió nada');
    const r9c = await subir(cA, await foto(401, 300, 92), '/api/medios', { destino: 'privado' }), r9d = await subir(cA, await foto(403, 300, 93), '/api/medios', { destino: 'privado' });
    ok(r9c.status === 200 && r9d.status === 422, 'con destino privado, una limpia entra igual y una clara se rechaza igual');
    // F3 · Una foto de destino privado nunca tiene dirección pública: privado/o/, la fila private, la dirección de la ruta con permiso (fot9uprivadas).
    const P9 = r9c.json?.id;
    ok(r9c.json?.url === `/api/medios/privada/${P9}` && sql(`select private::text || ':' || url from media where id = '${P9}'`) === `true:/api/medios/privada/${P9}`, 'F3 · con destino privado: la fila es privada y su dirección la de la ruta con permiso (nunca /medios/…)');
    ok((await delAlmacen(`/n/${P9}.jpg`)).s === 404 && (await servirMedio(`/medios/n/${P9}.jpg`)).s === 404 && (await delAlmacen(`/privado/o/${P9}.jpg`)).s === 200 && (await delAlmacen(`/privado/o/${P9}.w320.webp`)).s === 200,
      'F3 · su archivo (y sus variantes) solo en privado/o/: nada bajo n/');
    const v9 = await p.goto(B + `/api/medios/privada/${P9}`);
    ok(v9.status() === 200 && v9.headers()['cache-control'] === 'private, no-store' && v9.headers()['x-content-type-options'] === 'nosniff', 'F3 · quien la subió la ve por la ruta con permiso (private, no-store, nosniff)');
    const ctxX = await b.newContext(), pX = await ctxX.newPage();
    ok((await pX.goto(B + `/api/medios/privada/${P9}`)).status() === 404, 'F3 · sin sesión: 404');
    await entrarComo(pX, telLibre(), { nombre: 'Otra', apellido: 'Persona' });
    ok((await pX.goto(B + `/api/medios/privada/${P9}`)).status() === 404 && (await pX.goto(B + `/api/medios/privada/${P9}?w=320`)).status() === 404, 'F3 · otra persona: 404 (también la variante)');
    await ctxX.close();
    const antes9e = (await fotosVistas()).length;
    const r9e = await subir(cA, await foto(404, 301, 94), '/api/medios', { destino: 'privado' });
    ok(r9e.status === 200 && fila(r9e.json.id).st === 'visible' && sql(`select capa || ':' || decision || ':' || motivo from photo_reviews where media_id = '${r9e.json.id}'`) === 'c1:publicar:sin_servicio' && (await fotosVistas()).length === antes9e,
      'privada con el modelo propio sin respuesta → entra (como antes de AJ), queda en el libro como c1 · publicar · sin_servicio y no va a la segunda opinión');
    corteAbajo();
    const r9f = await subir(cA, await foto(404, 303, 95));
    ok(r9f.status === 202 && fila(r9f.json.id).st === 'review', 'la PÚBLICA con el modelo propio sin respuesta sigue en fallo cerrado (la segunda opinión no está segura → retenida)');
    corteAbajo();
    const ids9 = sql(`select id from media where id = '${r9e.json.id}'`);
    ok(ids9 === r9e.json.id && sql(`select rev_sin_c2 from media where id = '${r9e.json.id}'`) === 't', 'la que entró sin mirar queda marcada como privada (no se puede adjuntar a algo público)');
    const todo = JSON.stringify(vistas);
    ok(vistas.length > 0 && !todo.includes('Yolotzin') && !todo.includes('Quetzal') && !todo.includes(TA) && !todo.includes(NEG) && !todo.includes('hzl') && vistas.every((x) => x.imagen.ancho <= 640 && x.imagen.alto <= 640),
      `a la segunda opinión solo llega la imagen reducida y la pauta (${vistas.length} fotos, nada de quién, negocio ni ciudad)`);
    ok(Number(sql(`select coalesce(sum(cost_microusd), 0) from photo_reviews where created_at > now() - interval '30 minutes' and capa = 'c2'`)) > 0 && Number(sql(`select spent_microusd from photo_review_spend where month = compa_mes()`)) > 0, 'el gasto de la capa 2 quedó contado (libro y mes)');
    console.log(`OK (${n} comprobaciones)`);
  } catch (e) { console.error(e); process.exitCode = 1; } finally {
    try { sql(`update mod_rules m set enabled = (x->>'on')::boolean, params = x->'p' from json_array_elements('${reglas0}'::json) x where m.key = x->>'k'`); } catch { /* sin reglas guardadas */ }
    if (sim) sim.kill();
    if (SVC0 && fs.existsSync(ENT.rec('imgvenv/bin/python'))) spawn(ENT.rec('imgvenv/bin/python'), ['-I', ENT.RAIZ + '/services/moderacion-img/app.py'], { env: { ...process.env, PUERTO: '8790' }, detached: true, stdio: 'ignore' }).unref();
    try { corteAbajo(); } catch { /* nada */ }
    await b.close();
  }
})();
