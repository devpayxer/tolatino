// Revisión automática de las fotos públicas (decisión AJ) · R3: las PANTALLAS. De punta a punta con el servidor y la base; NO necesita el almacén de
// fotos (las filas de fotos retenidas, rechazadas y ocultas se siembran en la base y la subida se simula SOLO en la respuesta de /api/medios con la forma
// real del servidor: lo demás —subirFoto, el evento, la hoja— es el código real). Lo que pasa con el almacén lo cubre rev9u (en el CI).
//   1 al subir: una foto «en revisión» (202) sale en la hoja como un ESTADO (etiqueta EN REVISIÓN, no un error) y una «rechazada» (422) dice el motivo;
//     las dos con «Pedir revisión» (lleva a Mi cuenta › Avisos de moderación); en inglés también
//   2 Mi cuenta › Avisos de moderación: «Tus fotos sin publicar» (retenida, rechazada, oculta por reportes) con su estado, el motivo en el idioma de la
//     persona y la miniatura (el visor privado; sin él, el marcador del sistema); «Pedir revisión» → «Una persona … va a mirar tu foto» y el caso en la cola
//   3 Panel › Fotos y portada: el aviso «Tienes N fotos sin publicar» con el enlace a (2)
//   4 Super Admin › Contenido › Auto-moderación: las cuatro capas con su interruptor, el gasto del mes contra el tope, las cifras de hoy y de la semana y
//     «Para mirar»; en inglés también
//   5 Super Admin › Colas: la apelación de una foto y la foto reportada y oculta se ven por el visor privado (solo con el caso abierto; otra persona, 404);
//     «Quitar foto» y «Mantener» deciden (la foto queda rechazada, los reportes y el libro lo dicen, quien la subió y quien reportó reciben el aviso)
//   6 el reporte diario trae el bloque «Fotos» con las cifras de ayer, el gasto del mes y las cinco al azar (miniaturas con enlace)
// Deja las reglas foto1…foto4 y el gasto del mes como estaban. Guardianes fotosRevisionPrivacidad, objetivosTactiles, fotoPorLaPieza.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs');
const { randomUUID, randomBytes } = require('crypto');
const { chromium } = require('playwright');
const { entrarComo, telLibre, sql, equipo } = require('../lib/negocio-nuevo.cjs');
const sharp = require(ENT.RAIZ + '/apps/web/node_modules/sharp');
const B = ENT.B;
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const espera = async (f, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await new Promise((r) => setTimeout(r, 300)); } return false; };
const vis = async (l) => { for (let k = 0; k < 40; k++) { const c = await l.count(); for (let i = 0; i < c; i++) if (await l.nth(i).isVisible()) return l.nth(i); await new Promise((r) => setTimeout(r, 250)); } return null; };
const clic = async (l) => { const x = await vis(l); if (!x) throw new Error('no visible: ' + l); await x.click(); };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const contiene = (p, t) => espera(async () => (await texto(p)).includes(t));
const sha = () => randomBytes(32).toString('hex');
const uid = (tel) => sql(`select id from users where phone = '+1${tel}'`);

// Las respuestas de /api/medios con la forma de app/api/medios/route.ts y los textos de lib/fotos-decision.ts mensajeSubida.
const MSG = {
  revision: { es: 'Tu foto está en revisión antes de publicarse. Te avisamos en cuanto esté lista; también puedes pedir que la revise una persona.', en: "Your photo is under review before it is published. We'll let you know as soon as it's ready; you can also ask a person to review it." },
  rechazada: { es: 'No podemos publicar esta foto: se leen un documento de identidad, una tarjeta o datos personales. Si crees que es un error, puedes pedir que la revise una persona.', en: "We can't publish this photo: an ID, a card or personal data can be read. If you think it's a mistake, you can ask a person to review it." },
};
const simularSubida = (p, estado, id) => p.route((u) => u.pathname === '/api/medios', (r) => r.request().method() === 'POST'
  ? r.fulfill({ status: estado === 'revision' ? 202 : 422, contentType: 'application/json', body: JSON.stringify({ ok: false, estado, id, mensaje: MSG[estado] }) }) : r.continue());
const media = ({ owner, uploader, st, capa, motivo, nota, rr, vis: visible = false, dias = 0 }) => {
  const id = randomUUID();
  sql(`insert into media (id, owner_kind, owner_id, url, w, h, uploaded_by, status, sha256, rev_at, rev_capa, rev_motivo, rev_nota, rev_llave, rev_siguiente, removed_reason, removed_note, removed_at, bytes)
       values ('${id}', '${owner[0]}', '${owner[1]}', '/medios/n/${id}.jpg', 1200, 800, '${uploader}', '${st}', '${sha()}', now() - interval '${dias} days', '${capa}', ${motivo ? `'${motivo}'` : 'null'}, ${nota ? `'${nota}'` : 'null'},
       ${visible ? 'null' : `'privado/rev/${id}.jpg'`}, ${st === 'review' ? "now() + interval '1 hour'" : 'null'}, ${rr ? `'${rr}'` : 'null'}, ${rr ? `'${nota}'` : 'null'}, ${rr ? 'now()' : 'null'}, 180000)`);
  return id;
};
const libro = (id, capa, decision, motivo, puntaje, dias = 0) => sql(`insert into photo_reviews (media_id, sha256, uploader_id, city_id, capa, decision, puntaje, motivo, created_at)
  values ('${id}', '${sha()}', (select uploaded_by from media where id = '${id}'), 'hzl', '${capa}', '${decision}', ${puntaje ?? 'null'}, ${motivo ? `'${motivo}'` : 'null'}, now() - interval '${dias} days')`);

(async () => {
  const b = await chromium.launch();
  const reglas0 = sql(`select json_agg(json_build_object('k', key, 'on', enabled, 'p', params)) from mod_rules where key like 'foto_'`);
  const gasto0 = sql(`select coalesce((select spent_microusd from photo_review_spend where month = compa_mes()), -1)`);
  const JPG = ENT.S + '/rev9u2-foto.jpg';
  fs.writeFileSync(JPG, await sharp({ create: { width: 120, height: 90, channels: 3, background: { r: 90, g: 120, b: 160 } } }).jpeg().toBuffer());
  try {
    sql(`update mod_rules set enabled = true, params = case key when 'foto1' then '{"duda_pct": 60, "rechazo_pct": 85}'::jsonb when 'foto2' then '{"tope_cents": 1000, "espera_s": 8, "intentos": 5}'::jsonb
           when 'foto3' then '{"reportes": 3, "edad_h": 72}'::jsonb else '{"fotos": 10, "dias": 90, "nueva_dias": 7, "nueva_hora": 10}'::jsonb end where key like 'foto_'`);
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const p = await ctx.newPage();
    const TA = telLibre(); await entrarComo(p, TA, { nombre: 'Yolotzin', apellido: 'Quetzal' });
    const A = uid(TA); sql(`update users set created_at = now() - interval '30 days' where id = '${A}'`);
    const NEG = sql(`select id from businesses where city_id = 'hzl' and status = 'active' order by created_at limit 1`);
    sql(`insert into business_members (business_id, user_id, kind, status, display_name) values ('${NEG}', '${A}', 'owner', 'active', 'Yolotzin') on conflict do nothing`);
    // Sus fotos sin publicar: retenida (capa 2 no segura), rechazada (capa 1, desnudez), rechazada con apelación en la prueba (capa 2, documento) y oculta por reportes.
    const M1 = media({ owner: ['user', A], uploader: A, st: 'review', capa: 'c2', motivo: 'no_segura', nota: 'En revisión antes de publicarse.' });
    const M2 = media({ owner: ['user', A], uploader: A, st: 'removed', rr: 'revision', capa: 'c1', motivo: 'desnudez', nota: 'No se publicó: muestra desnudez o contenido sexual.' });
    const M4 = media({ owner: ['user', A], uploader: A, st: 'removed', rr: 'revision', capa: 'c2', motivo: 'documento', nota: 'No se publicó: se leen un documento de identidad, una tarjeta o datos personales.', dias: 1 });
    const M3 = media({ owner: ['business', NEG], uploader: A, st: 'review', capa: 'c3', motivo: 'reportes', nota: 'Varias personas la reportaron: está oculta mientras se revisa.' });
    libro(M1, 'c1', 'retener', null, 0.71); libro(M1, 'c2', 'retener', 'no_segura', null); libro(M2, 'c1', 'rechazar', 'desnudez', 0.93); libro(M4, 'c2', 'rechazar', 'documento', null); libro(M3, 'c3', 'ocultar', 'reportes', null);
    const rep = [];
    for (let i = 0; i < 3; i++) { const t = telLibre(); sql(`insert into users (phone, first_name, home_city_id, created_at, is_test) values ('+1${t}', 'Rep${i}', 'hzl', now() - interval '20 days', true)`); rep.push(uid(t)); }
    for (const r of rep) sql(`insert into photo_reports (media_id, reporter_user_id, reason, status) values ('${M3}', '${r}', 'inapropiado', 'open')`);
    sql(`insert into queue_items (queue, subject_kind, subject_id, city_id, business_id, priority) values ('medios', 'media', '${M3}', 'hzl', '${NEG}', 'normal')`);
    const QM = sql(`select id from queue_items where queue = 'medios' and subject_id = '${M3}' and status = 'open'`);

    // ── 1 · Al subir: la hoja ──
    console.log('1 · Al subir: una foto en revisión es un estado; una rechazada dice el motivo');
    await simularSubida(p, 'revision', M1);
    await p.goto(B + '/cuenta/perfil'); await p.waitForLoadState('networkidle');
    await p.setInputFiles('input[type=file]', JPG);
    await p.waitForSelector('[data-pantalla="FOTO-ESTADO"]', { timeout: 20000 });
    let t = await texto(p);
    ok(t.includes('EN REVISIÓN') && t.includes('Tu foto está en revisión') && t.includes('Te avisamos en cuanto esté lista'), 'la foto en revisión sale como un ESTADO (etiqueta EN REVISIÓN y la frase del servidor)');
    ok(!t.includes('NO SE PUBLICÓ') && (await p.locator('[role="dialog"][aria-modal="true"]').count()) === 1, 'una sola hoja, con su nombre y sin la etiqueta de rechazo');
    ok(!!(await vis(p.getByRole('button', { name: 'Pedir revisión' }))) && !!(await vis(p.getByRole('button', { name: 'Entendido' }))), 'con «Pedir revisión» y «Entendido»');
    const caja = await (await vis(p.getByRole('button', { name: 'Pedir revisión' }))).boundingBox();
    ok(caja.height >= 44, `los botones son táctiles (${Math.round(caja.height)} px)`);
    await clic(p.getByRole('button', { name: 'Pedir revisión' }));
    ok(await espera(async () => p.url().includes(`/cuenta/moderacion?k=media&id=${M1}`)), '«Pedir revisión» lleva a Mi cuenta › Avisos de moderación, a esa foto');
    await p.unroute((u) => u.pathname === '/api/medios').catch(() => undefined);
    await simularSubida(p, 'rechazada', M2);
    await p.goto(B + '/cuenta/perfil'); await p.waitForLoadState('networkidle');
    await p.setInputFiles('input[type=file]', JPG);
    await p.waitForSelector('[data-pantalla="FOTO-ESTADO"]', { timeout: 20000 });
    t = await texto(p);
    ok(t.includes('NO SE PUBLICÓ') && t.includes('No pudimos publicar tu foto') && t.includes('se leen un documento de identidad') && !t.includes('EN REVISIÓN'), 'la rechazada dice NO SE PUBLICÓ y el motivo');
    await clic(p.getByRole('button', { name: 'Entendido' }));
    ok(await espera(async () => (await p.locator('[data-pantalla="FOTO-ESTADO"]').count()) === 0), '«Entendido» cierra la hoja');
    await ctx.addCookies([{ name: 'tl_lang', value: 'en', url: B }]);
    await p.goto(B + '/cuenta/perfil'); await p.waitForLoadState('networkidle');
    await p.setInputFiles('input[type=file]', JPG);
    await p.waitForSelector('[data-pantalla="FOTO-ESTADO"]', { timeout: 20000 });
    t = await texto(p);
    ok(t.includes('NOT PUBLISHED') && t.includes('We couldn’t publish your photo') && t.includes('Ask for a review') && t.includes('Got it') && t.includes("We can't publish this photo"), 'en inglés: NOT PUBLISHED, el motivo, «Ask for a review» y «Got it»');
    await clic(p.getByRole('button', { name: 'Got it' }));
    await ctx.addCookies([{ name: 'tl_lang', value: 'es', url: B }]);

    // ── 2 · Mi cuenta › Avisos de moderación ──
    console.log('2 · Mi cuenta › Avisos de moderación: tus fotos sin publicar y «Pedir revisión»');
    const pedidas = []; p.on('request', (r) => { if (r.url().includes('/api/medios/revision/')) pedidas.push(r.url()); });
    await p.goto(B + '/cuenta/moderacion'); await p.waitForLoadState('networkidle');
    t = await texto(p);
    ok(t.includes('Tus fotos sin publicar') && t.includes('EN REVISIÓN') && t.includes('NO SE PUBLICÓ') && t.includes('OCULTA POR REPORTES'), 'la lista: «Tus fotos sin publicar» con el estado de cada una (en revisión · no se publicó · oculta por reportes)');
    ok(t.includes('MUESTRA DESNUDEZ O CONTENIDO SEXUAL') && t.includes('SE LEEN UN DOCUMENTO DE IDENTIDAD'), 'el motivo de cada rechazo, en español');
    ok([M1, M2, M3, M4].every((id) => pedidas.some((u) => u.endsWith(`/api/medios/revision/${id}`))), 'cada miniatura se pide al visor privado (nunca a una dirección pública)');
    ok((await p.locator('img[src*="/medios/n/"]').count()) === 0 && !t.includes('/medios/n/'), 'ninguna foto sin publicar tiene dirección pública en la pantalla');
    await p.goto(B + `/cuenta/moderacion?k=media&id=${M4}`); await p.waitForLoadState('networkidle');
    t = await texto(p);
    ok(t.includes('No publicamos tu foto: se leen un documento de identidad') && t.includes('NO SE PUBLICÓ') && t.includes('SOLO TÚ LA VES') && t.includes('POR QUÉ ESTÁ BIEN'), 'el detalle: el estado, el motivo y el formulario de «Pedir revisión»');
    ok((await (await vis(p.getByRole('button', { name: 'Pedir revisión' })))?.isDisabled()) === true, '«Pedir revisión» espera las 20 letras');
    await p.getByLabel('POR QUÉ ESTÁ BIEN').fill('Es la foto de mi taller con el cartel del negocio; no tiene datos personales.');
    await clic(p.getByRole('button', { name: 'Pedir revisión' }));
    ok(await contiene(p, 'Una persona de To\'Latino va a mirar tu foto.'), 'después de pedirla dice que una persona la va a mirar');
    const AP = sql(`select id from appeals where user_id = '${A}' and target_kind = 'media' and target_id = '${M4}'`);
    const QA = sql(`select id from queue_items where queue = 'apel' and subject_id = '${AP}' and status = 'open'`);
    ok(!!AP && !!QA, 'la apelación quedó en la cola «apel»');
    await p.goto(B + '/cuenta/moderacion'); await p.waitForLoadState('networkidle');
    ok((await texto(p)).includes('UNA PERSONA LA VA A MIRAR'), 'en la lista, esa foto dice «una persona la va a mirar»');
    await ctx.addCookies([{ name: 'tl_lang', value: 'en', url: B }]);
    await p.goto(B + `/cuenta/moderacion?k=media&id=${M3}`); await p.waitForLoadState('networkidle');
    t = await texto(p);
    ok(t.includes('We hid your photo while we review it') && t.includes('HIDDEN BY REPORTS') && t.includes('ONLY YOU SEE IT') && t.includes('WHY IT IS FINE') && t.includes('Ask for a review'), 'en inglés: la foto oculta por reportes, su estado y «Ask for a review»');
    await p.goto(B + `/cuenta/moderacion?k=media&id=${M2}`); await p.waitForLoadState('networkidle');
    ok((await texto(p)).includes('We did not publish your photo: it shows nudity or sexual content'), 'el motivo sale en inglés para quien lo lee en inglés');
    await ctx.addCookies([{ name: 'tl_lang', value: 'es', url: B }]);

    // ── 3 · Panel › Fotos y portada ──
    console.log('3 · Panel › Fotos y portada: el aviso de las fotos sin publicar');
    await p.goto(B + `/panel/${NEG}/pagina/fotos`); await p.waitForLoadState('networkidle');
    ok(await espera(async () => /Tienes 4 fotos sin publicar/.test(await texto(p))), 'Fotos y portada dice cuántas fotos de quien mira no se publicaron');
    await clic(p.getByText('Verlas', { exact: true }));
    ok(await espera(async () => p.url().includes('/cuenta/moderacion')), '«Verlas» lleva a Avisos de moderación');
    const pb = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); const TB = telLibre(); await entrarComo(pb, TB, { nombre: 'Otra', apellido: 'Persona' });

    // ── 4 · Super Admin › Contenido › Auto-moderación ──
    console.log('4 · Super Admin › Contenido › Auto-moderación: las cuatro capas, el gasto y las cifras');
    equipo('5705550188');
    for (let i = 0; i < 3; i++) { const v = media({ owner: ['business', NEG], uploader: A, st: 'visible', capa: i === 1 ? 'c2' : 'c1', vis: true }); libro(v, i === 1 ? 'c2' : 'c1', 'publicar', null, 0.2); libro(v, i === 1 ? 'c2' : 'c1', 'publicar', null, 0.2, 1); }
    sql(`insert into photo_review_spend (month, spent_microusd) values (compa_mes(), 2310000) on conflict (month) do update set spent_microusd = 2310000`);
    const adm = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); await entrarComo(adm, '5705550188');
    await adm.goto(B + '/admin/contenido?tab=auto'); await adm.waitForLoadState('networkidle');
    t = await texto(adm);
    ok(t.includes('FOTOS PÚBLICAS · REVISIÓN AUTOMÁTICA (4 CAPAS)') && ['capa 1: modelo propio', 'capa 2: segunda opinión (IA)', 'capa 3: reportes', 'capa 4: confianza'].every((x) => t.includes(`Fotos públicas · ${x}`)), 'las cuatro capas, cada una con su fila');
    ok((await adm.locator('[role="switch"]').count()) >= 11 + 4, 'cada capa con su interruptor (más las reglas de siempre y las listas)');
    ok(t.includes('Al subir: menos de 60 % de desnudez') && t.includes('Tope de $10.00 al mes'), 'con sus valores (umbrales y tope) en el texto de la regla');
    ok(t.includes('GASTO DEL MES · SEGUNDA OPINIÓN') && t.includes('$2.31') && t.includes('de $10.00 de tope') && t.includes('TOPE AL MES'), 'el gasto del mes contra su tope');
    ok(t.includes('HOY') && t.includes('ÚLTIMOS 7 DÍAS · POR CAPA') && t.includes('PUBLICADAS') && t.includes('RETENIDAS') && t.includes('RECHAZADAS') && t.includes('OCULTAS POR REPORTES') && t.includes('Capa 1 · modelo propio'), 'las cifras de hoy y de la semana, por capa');
    ok(t.includes('PARA MIRAR · CINCO PUBLICADAS POR LOS MODELOS, AL AZAR'), 'el bloque «Para mirar»');
    // Las cinco salen de las que SIGUEN publicadas y con dirección pública (CI 44908076139: se elegían entre todas las «publicar», también las privadas y
    // las ocultadas después, y la pantalla descartaba las que no podía mostrar: salían menos de cinco, o ninguna). El número exacto, no «al menos una».
    const paraMirar = (desde, hasta) => Math.min(5, Number(sql(`select count(*) from photo_reviews r join media x on x.id = r.media_id and x.status = 'visible' and x.purged_at is null and not x.private and x.url like '/medios/n/%'
      where r.decision = 'publicar' and r.capa in ('c1', 'c2', 'c4') and r.created_at >= ((now() at time zone 'America/New_York')::date - ${desde})::timestamp at time zone 'America/New_York'
        and r.created_at < ((now() at time zone 'America/New_York')::date - (${hasta}))::timestamp at time zone 'America/New_York'`)));
    const esperadas = paraMirar(6, -1), vistas = await adm.locator('[style*="/medios/n/"]').count();
    ok(esperadas >= 1 && vistas === esperadas, `con miniaturas de fotos ya publicadas (por su dirección pública): ${vistas} de ${esperadas} que se pueden mostrar`);
    ok((await adm.getByRole('button', { name: 'Cambiar valores' }).count()) >= 8, '«Cambiar valores» en cada capa');
    sql(`update mod_rules set params = jsonb_set(params, '{tope_cents}', '0') where key = 'foto2'`);
    await adm.goto(B + '/admin/contenido?tab=auto'); await adm.waitForLoadState('networkidle');
    t = await texto(adm);
    ok(t.includes('El tope está en $0.00') && t.includes('quedan retenidas con «Pedir revisión»'), 'con el tope en $0 lo dice (las dudosas quedan retenidas)');
    sql(`update mod_rules set params = jsonb_set(params, '{tope_cents}', '1000') where key = 'foto2'`);
    await adm.context().addCookies([{ name: 'tl_lang', value: 'en', url: B }]);
    await adm.goto(B + '/admin/contenido?tab=auto'); await adm.waitForLoadState('networkidle');
    t = await texto(adm);
    ok(t.includes('PUBLIC PHOTOS · AUTOMATIC REVIEW (4 LAYERS)') && t.includes('Public photos · layer 2: second opinion (AI)') && t.includes('THIS MONTH · SECOND OPINION') && t.includes('TO LOOK AT'), 'en inglés: las capas, el gasto y «To look at»');
    await adm.context().addCookies([{ name: 'tl_lang', value: 'es', url: B }]);

    // ── 5 · Colas: la apelación y la foto reportada ──
    console.log('5 · Colas: la apelación de una foto y la foto reportada se ven por el visor privado y se deciden');
    const vA = await ctx.request.get(B + `/api/medios/revision/${M4}`), vB = await pb.context().request.get(B + `/api/medios/revision/${M4}`);
    ok([200, 410, 503].includes(vA.status()) && vB.status() === 404, `el visor: quien la subió la pide (${vA.status()}: 200 con su archivo, 410 si el archivo ya no está) y otra persona recibe 404`);
    const vAdm = await adm.context().request.get(B + `/api/medios/revision/${M3}`), vAdm2 = await adm.context().request.get(B + `/api/medios/revision/${M1}`);
    ok([200, 410, 503].includes(vAdm.status()) && vAdm2.status() === 404, 'el equipo la ve solo con un caso abierto de esa foto (la reportada sí; una retenida sin caso, 404)');
    const pedAdm = []; adm.on('request', (r) => { if (r.url().includes('/api/medios/revision/')) pedAdm.push(r.url()); });
    await adm.goto(B + '/admin/colas?caso=' + QA); await adm.getByText('LO QUE ESCRIBIÓ').first().waitFor();
    t = await texto(adm);
    ok(t.includes('LA FOTO') && t.includes('MOTIVO QUE RECIBIÓ') && t.includes('se leen un documento de identidad') && pedAdm.some((u) => u.endsWith(`/api/medios/revision/${M4}`)), 'la apelación: la foto (por el visor privado), el motivo que recibió y lo que escribió');
    ok(!!(await vis(adm.getByRole('button', { name: 'Levantar' }))) && !!(await vis(adm.getByRole('button', { name: 'Mantener' }))), 'con «Levantar» y «Mantener»');
    await adm.goto(B + '/admin/colas?caso=' + QM); await adm.getByText('Foto marcada').first().waitFor();
    t = await texto(adm);
    ok(t.includes('OCULTA MIENTRAS DECIDES') && t.includes('3 reportes') && t.includes('Está oculta (nadie la ve) mientras decides') && pedAdm.some((u) => u.endsWith(`/api/medios/revision/${M3}`)), 'la foto reportada y oculta: su foto por el visor privado, «oculta mientras decides» y los 3 reportes');
    await clic(adm.getByRole('button', { name: 'Quitar foto' })); await clic(adm.getByText('Contenido inapropiado', { exact: true })); await clic(adm.getByRole('button', { name: 'Confirmar' }));
    ok(await espera(() => sql(`select status from queue_items where id = ${QM}`) === 'decided'), '«Quitar foto» decide el caso');
    ok(sql(`select status || '|' || removed_reason from media where id = '${M3}'`) === 'removed|revision' && sql(`select count(*) from photo_reports where media_id = '${M3}' and status = 'removed'`) === '3' && /ocultar.*persona:rechazar/.test(sql(`select string_agg(capa || ':' || decision, ',' order by id) from photo_reviews where media_id = '${M3}'`).replace(/c3:/, '')),
      'la foto queda rechazada (no se publica), los 3 reportes «quitada» y el libro dice que lo decidió una persona');
    ok(await espera(() => Number(sql(`select count(*) from notifications where tpl = 'foto_rep_quitada' and user_id in ('${rep.join("','")}')`)) === 3), 'quienes reportaron reciben el resultado');
    ok(await espera(() => sql(`select count(*) from notifications where user_id = '${A}' and tpl = 'foto_rechazada' and ref_id = '${QM}'`) !== '0') || sql(`select count(*) from notifications where user_id = '${A}' and tpl = 'foto_rechazada' and href like '%${M3}%'`) !== '0', 'quien la subió recibe el aviso con su motivo');
    await adm.goto(B + '/admin/colas?caso=' + QA); await adm.getByText('LO QUE ESCRIBIÓ').first().waitFor();
    await clic(adm.getByRole('button', { name: 'Mantener' })); await clic(adm.getByText('Rompe las reglas del barrio', { exact: true })); await clic(adm.getByRole('button', { name: 'Mantener' }).last());
    ok(await espera(() => sql(`select status from appeals where id = ${AP}`) === 'upheld'), '«Mantener» decide la apelación: se mantiene el rechazo');
    ok(sql(`select status from media where id = '${M4}'`) === 'removed' && /persona:rechazar/.test(sql(`select string_agg(capa || ':' || decision, ',' order by id) from photo_reviews where media_id = '${M4}'`)), 'la foto sigue rechazada y el libro lo dice');

    // ── 6 · El reporte diario ──
    console.log('6 · El reporte diario: el bloque «Fotos»');
    sql(`update users set email = 'rev9u2-${TA}@example.test' where phone = '+15705550188'`);
    for (let i = 0; i < 3; i++) { const v = media({ owner: ['business', NEG], uploader: A, st: 'visible', capa: 'c1', vis: true, dias: 1 }); libro(v, 'c1', 'publicar', null, 0.1, 1); }
    libro(M2, 'c1', 'rechazar', 'desnudez', 0.95, 1);
    const U = uid('5705550188'), f0 = Number(sql(`select count(*) from email_outbox where tpl = 'founder_daily' and user_id = '${U}'`));
    await adm.goto(B + '/admin/analitica?tab=rep'); await adm.getByText('REPORTE DIARIO AL FUNDADOR · 7:30 AM').first().waitFor();
    await clic(adm.getByText('Mándamelo ahora', { exact: true }));
    ok(await espera(() => Number(sql(`select count(*) from email_outbox where tpl = 'founder_daily' and user_id = '${U}'`)) === f0 + 1), 'el reporte llegó al simulador de correo');
    const html = sql(`select html from email_outbox where tpl = 'founder_daily' and user_id = '${U}' order by id desc limit 1`);
    ok(html.includes('Fotos de ayer (pub. · ret. · rech. · ocultas)') && html.includes('Capa 1 · modelo propio') && html.includes('gasto del mes') && /\$\d+\.\d\d de \$10\.00/.test(html), 'el correo: las fotos de ayer por capa y el gasto del mes contra su tope');
    const enCorreo = (html.match(/<img src="[^"]*\.w320\.webp"/g) ?? []).length, deAyer = paraMirar(1, 0);
    ok(html.includes('Para mirar: cinco fotos publicadas por los modelos, al azar') && deAyer >= 3 && enCorreo === deAyer && html.includes('/medios/n/'), `y las cinco al azar, como miniaturas con su enlace (${enCorreo} de ${deAyer} que se pueden mostrar)`);
    ok(!/570555\d{4}|Yolotzin|Quetzal/.test(html), 'sin teléfonos ni nombres de personas');
    console.log(`OK (${n} comprobaciones)`);
  } catch (e) { console.error(e); process.exitCode = 1; } finally {
    try { sql(`update mod_rules m set enabled = (x->>'on')::boolean, params = x->'p' from json_array_elements('${reglas0}'::json) x where m.key = x->>'k'`); } catch { /* sin reglas guardadas */ }
    try { sql(`update photo_review_spend set spent_microusd = ${Math.max(0, Number(gasto0))} where month = compa_mes()`); } catch { /* sin gasto */ }
    await b.close();
  }
})();
