// C-001 · Video de presentación del negocio (Pro) y el anillo de «Hoy en el barrio». En Sabor Dominicano: el dueño sube un video de 35 s
// desde Panel › Tu página › Fotos (escritorio 1360) → el servicio propio (services/video, ffmpeg) lo deja en 30 s → EN REVISIÓN y en público
// NO sale; el Super Admin lo aprueba en Colas › Medios → sale en la tarjeta de la página de categoría y en la portada de la ficha (teléfono 390);
// el anillo del logo abre «Hoy en el barrio» de ese negocio. Sube otro → el aprobado sigue en la página; el equipo no lo aprueba con motivo →
// el panel dice el motivo. Un archivo que no es video → 415. Quitar → la página vuelve a la foto. Free → 403 y el video no sale.
// Precondiciones propias: los videos anteriores del negocio quedan «quitado»; una novedad de esta corrida para el anillo; el plan vuelve a Pro.
const ENT = require('../lib/entorno.cjs');
const { chromium } = require('playwright'); const { execSync, spawn } = require('child_process');
const fs = require('fs');
const { entrarComo, medios, sql } = require('../lib/negocio-nuevo.cjs');
const B = ENT.B, OUT = ENT.OUT;
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const espera = async (f, ms = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await f()) return true; } catch { /* sigue */ } await new Promise((r) => setTimeout(r, 300)); } return false; };
const BIZ = 'sabor-dominicano', DUENO = '5705550133', ADMIN = '5705550199';
const MOTIVO = 'Tiene música de otros artistas.';

// El servicio de video propio (el mismo app.py del sandbox); si no está corriendo, se levanta aquí con el ffmpeg de la máquina.
const salud = () => { try { return JSON.parse(execSync('curl -s -m 3 127.0.0.1:8791/salud').toString()).ok === true; } catch { return false; } };
let svc = null;
if (!salud()) { svc = spawn('python3', ['-I', ENT.RAIZ + '/services/video/app.py'], { env: { ...process.env, PUERTO: '8791' }, detached: true, stdio: 'ignore' }); svc.unref(); }

const video = (seg, nombre) => { const f = `${ENT.S}/${nombre}`; execSync(`ffmpeg -loglevel error -y -f lavfi -i testsrc=size=320x240:rate=15 -f lavfi -i sine=frequency=440 -t ${seg} -pix_fmt yuv420p -c:v libx264 -c:a aac ${f}`); return f; };
const caso = (vid) => sql(`select id from queue_items where queue = 'medios' and subject_kind = 'business_video' and subject_id = '${vid}' and status = 'open'`);

(async () => {
  const t0 = Date.now(); while (!salud() && Date.now() - t0 < 20000) await new Promise((r) => setTimeout(r, 500));
  ok(salud(), 'el servicio de video propio responde (/salud)');
  const V1 = video(35, 'vid001-a.mp4'), V2 = video(6, 'vid001-b.mp4');
  sql(`update business_videos set status = 'quitado', ended_at = now() where business_id = '${BIZ}' and status in ('aprobado', 'revision', 'rechazado')`); // también el «No aprobado» de una vuelta anterior (dos veces seguidas, 18 nov)
  sql(`update queue_items set status = 'decided', decision = 'quitado', decided_at = now() where queue = 'medios' and subject_kind = 'business_video' and business_id = '${BIZ}' and status = 'open'`);
  sql(`update business_stats_cache set plan = 'pro' where business_id = '${BIZ}'`);
  const D0 = sql(`select id from users where phone = '+1${DUENO}'`);
  const POST = sql(`insert into business_posts (business_id, city_id, kind, title, body, ends_at, created_by)
    select '${BIZ}', city_id, 'novedad', 'Hoy hay sancocho de la casa', 'Desde las 11.', now() + interval '1 day', '${D0}' from businesses where id = '${BIZ}' returning id`).split('\n')[0]; // psql sin -q añade «INSERT 0 1»
  const b = await chromium.launch(); const abiertas = [];
  const nueva = async (w, h, tel) => { const c = await b.newContext(w < 600 ? { viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: w, height: h } }); abiertas.push(c); await medios(c); const p = await c.newPage(); if (tel) await entrarComo(p, tel); return p; };
  const subirPanel = async (p, f, boton) => {
    await p.goto(B + `/panel/${BIZ}/pagina/fotos`);
    const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.getByRole('button', { name: boton }).first().click()]);
    await fc.setFiles(f);
    ok(await espera(async () => (await texto(p)).includes('En revisión · menos de 24 h'), 120000), `«${boton}»: el panel dice «En revisión · menos de 24 h»`);
  };
  const subirApi = (p, tipo, cuerpo) => p.evaluate(async ([biz, tipo, cuerpo]) => {
    const fd = new FormData(); fd.append('video', new Blob([cuerpo], { type: tipo }), 'x');
    const r = await fetch(`/api/negocio/video?negocio=${biz}`, { method: 'POST', body: fd }); return { s: r.status, j: await r.json().catch(() => ({})) };
  }, [BIZ, tipo, cuerpo]);
  try {
    console.log('1 · El dueño sube un video de 35 s → queda en 30 s, EN REVISIÓN, y en público no sale');
    const pd = await nueva(1360, 900, DUENO);
    await pd.goto(B + `/panel/${BIZ}/pagina/fotos`);
    ok(await espera(async () => (await texto(pd)).includes('VIDEO DE PRESENTACIÓN · PRO') && (await texto(pd)).includes('Sin video')), 'Fotos: «VIDEO DE PRESENTACIÓN · PRO» y «Sin video»');
    ok((await texto(pd)).includes('HOY EN EL BARRIO · TU ANILLO'), 'y «HOY EN EL BARRIO · TU ANILLO»');
    await subirPanel(pd, V1, 'Subir video');
    const [VA, SEG] = sql(`select id || '|' || seconds from business_videos where business_id = '${BIZ}' and status = 'revision'`).split('|');
    ok(Number(SEG) <= 30.5 && Number(SEG) >= 29, `el servicio lo recortó a ${SEG} s (máximo 30)`);
    ok(!!caso(VA), 'y entró a la cola «Medios»');
    await pd.screenshot({ path: OUT + 'c001-panel-revision-1360.png' });
    const pv = await nueva(390, 844);
    await pv.goto(B + `/n/${BIZ}`);
    ok(await pv.locator('[data-portada-video]').count() === 0, 'en revisión: la ficha sigue con la foto de portada');

    console.log('2 · El Super Admin lo aprueba en Colas › Medios');
    const ad = await nueva(1360, 900, ADMIN);
    await ad.goto(B + `/admin/colas?cola=medios&caso=${caso(VA)}`);
    ok(await espera(async () => (await ad.locator('[data-video-caso]').count()) > 0), 'el caso muestra el video para verlo');
    await ad.getByRole('button', { name: 'Aprobar video' }).click();
    ok(await espera(async () => sql(`select status from business_videos where id = ${VA}`) === 'aprobado'), 'queda APROBADO (la base)');
    ok(sql(`select count(*) from audit_entries where action = 'negocio.video.aprobar' and after::text like '%${VA}%'`) !== '0', 'y queda en la auditoría');

    console.log('3 · En público: la portada, la tarjeta y el anillo');
    await pv.goto(B + `/n/${BIZ}`);
    ok(await espera(async () => (await pv.locator('[data-portada-video] video').count()) > 0), 'la ficha (teléfono) abre con el video');
    ok(await pv.getByText('SIN SONIDO').first().isVisible(), 'con «SIN SONIDO · TOCA»');
    await pv.screenshot({ path: OUT + 'c001-ficha-390.png' });
    // 21 nov · En «Relevancia» los negocios Pro ROTAN cada día (lib/categoria.ts) y la lista trae 10 por página: el negocio de la prueba no siempre
    // cae en la primera (el 21 nov no caía: CI 44866551623 y 44872463837). Se busca su tarjeta página por página, hasta la que hoy le toca.
    const tarjeta = pv.locator('article[data-vitrina] video[data-video-tarjeta]').first();
    let conVideo = false;
    for (let pg = 1; pg <= 8 && !conVideo; pg++) {
      await pv.goto(B + `/c/comida${pg > 1 ? `?p=${pg}` : ''}`);
      conVideo = await espera(async () => (await tarjeta.count()) > 0, pg === 1 ? 6000 : 4000);
    }
    ok(conVideo, 'la tarjeta de la página de categoría lleva el video');
    await tarjeta.scrollIntoViewIfNeeded();
    // Chromium de Playwright no trae H.264: se comprueba que esta es LA elegida para moverse (solo una a la vez), no que reproduzca.
    ok(await espera(async () => pv.evaluate(() => document.querySelectorAll('video[data-video-tarjeta][data-centro]').length === 1)), 'y es la única elegida para moverse (la del centro)');
    await pv.screenshot({ path: OUT + 'c001-tarjeta-390.png' });
    // Vitrina (AK): el video se mueve SOLO en la celda grande de la galería y ya no hay anillo sobre un logo: la caja «HOY» de la tarjeta (con algo
    // publicado en las últimas 24 h) es un botón que abre «Hoy en el barrio» de ese negocio.
    const cartaV = pv.locator('article[data-vitrina="pro"]', { has: pv.locator('video[data-video-tarjeta]') }).first(); // `has` se busca DENTRO de la tarjeta: no puede empezar por `article`
    ok(await cartaV.locator('[data-celda="grande"] video[data-video-tarjeta]').count() === 1 && await cartaV.locator('[data-celda="chica"] video').count() === 0, 'el video está en la celda GRANDE de la galería (y en ninguna otra)');
    ok(await cartaV.locator('[data-anillo]').count() === 0, 'la tarjeta ya no lleva el anillo del logo');
    const cajaHoy = cartaV.locator('button[data-oferta]');
    ok(await cajaHoy.count() > 0, 'la caja HOY de la tarjeta es un botón (hay novedad de hoy)');
    // La barra fija de arriba tapa la caja si se desplaza justo al borde (anchos, 18 nov): se centra antes de tocarla.
    await cajaHoy.first().evaluate((e) => e.scrollIntoView({ block: 'center' })); await cajaHoy.click();
    ok(await espera(async () => (await pv.locator('[data-visor-hoy]').count()) > 0 && (await texto(pv)).includes('Hoy hay sancocho de la casa')), 'la caja HOY abre «Hoy en el barrio» con la novedad de hoy');
    ok((await texto(pv)).includes('Ver la página'), 'con «Ver la página»');
    await pv.screenshot({ path: OUT + 'c001-visor-390.png' });
    await pv.keyboard.press('Escape');
    ok(await espera(async () => (await pv.locator('[data-visor-hoy]').count()) === 0), 'Esc lo cierra');

    console.log('4 · Sube otro: el aprobado sigue; el equipo no lo aprueba con motivo y el panel lo dice');
    await subirPanel(pd, V2, 'Cambiar video');
    const VB = sql(`select id from business_videos where business_id = '${BIZ}' and status = 'revision'`);
    ok(sql(`select status from business_videos where id = ${VA}`) === 'aprobado', 'el aprobado sigue en la página mientras el nuevo está en revisión');
    await ad.goto(B + `/admin/colas?cola=medios&caso=${caso(VB)}`);
    await ad.getByRole('button', { name: 'No aprobar' }).click();
    await ad.getByText(MOTIVO, { exact: true }).first().click();
    const conf = ad.getByRole('button', { name: /^(No aprobar|Confirmar)$/ }).last();
    await conf.click();
    ok(await espera(async () => sql(`select status || '|' || coalesce(reject_reason, '') from business_videos where id = ${VB}`) === `rechazado|${MOTIVO}`), 'queda NO APROBADO con su motivo (la base)');
    ok(sql(`select status from business_videos where id = ${VA}`) === 'aprobado', 'y el que estaba aprobado no se toca');
    await pd.goto(B + `/panel/${BIZ}/pagina/fotos`);
    ok(await espera(async () => (await texto(pd)).includes('Aprobado · se mueve en tu tarjeta')), 'el panel sigue con «Aprobado»');

    console.log('5 · Lo que no entra: un archivo que no es video; un negocio Free');
    const r415 = await subirApi(pd, 'video/mp4', 'esto no es un video');
    ok(r415.s === 415 && /no parece un video/.test(r415.j?.mensaje?.es ?? ''), `un archivo que no es video → 415 «${r415.j?.mensaje?.es}»`);
    sql(`update business_stats_cache set plan = 'free' where business_id = '${BIZ}'`);
    const r403 = await subirApi(pd, 'video/mp4', 'x');
    ok(r403.s === 403 && /es de Pro/.test(r403.j?.mensaje?.es ?? ''), `Free → 403 «${r403.j?.mensaje?.es}»`);
    await pv.goto(B + `/n/${BIZ}`);
    ok(await pv.locator('[data-portada-video]').count() === 0, 'Free: el video aprobado no sale en la ficha');
    sql(`update business_stats_cache set plan = 'pro' where business_id = '${BIZ}'`);

    console.log('6 · Quitar: la página vuelve a la foto (nada se borra)');
    await pd.goto(B + `/panel/${BIZ}/pagina/fotos`);
    await pd.getByRole('button', { name: 'Quitar' }).first().click();
    ok(await espera(async () => sql(`select status from business_videos where id = ${VA}`) === 'quitado'), 'queda QUITADO (la fila sigue, con su estado)');
    await pv.goto(B + `/n/${BIZ}`);
    ok(await pv.locator('[data-portada-video]').count() === 0, 'la ficha vuelve a la foto de portada');
    console.log(`\nvid001 · ${n} comprobaciones en verde`);
  } finally {
    sql(`update business_stats_cache set plan = 'pro' where business_id = '${BIZ}'`);
    try { sql(`update business_posts set status = 'removed' where id = ${POST}`); } catch (e) { console.error('limpieza', e.message); }
    for (const c of abiertas) await c.close().catch(() => {});
    await b.close();
    for (const f of ['vid001-a.mp4', 'vid001-b.mp4']) fs.rmSync(`${ENT.S}/${f}`, { force: true });
    if (svc) try { process.kill(-svc.pid); } catch { /* ya no está */ }
  }
})().catch((e) => { console.error('FALLO', e.message); process.exit(1); });
