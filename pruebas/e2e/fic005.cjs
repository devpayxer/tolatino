// C-005 · Ficha nueva del negocio (canvas «Barbería El Rey», cambios.md · paquete C-005 → C-008), Belleza Pro. Barbería El Primo (Pro) abre la
// ficha nueva en teléfono (390) y escritorio (1360): «Abierto/Cerrado» una sola vez (la tarjeta de hoy no lo repite), las pestañas en su
// orden, Servicios, Equipo (con «Ver su página» de cada silla), Horario y Antes de ir. Una barbería Free sigue con la ficha de siempre.
// La reserva: la hoja nueva (1 servicio y con quién → 2 día y hora, con las horas del servidor) lleva a Booking con la hora elegida, que
// abre en «Detalles» (2 / 3); en escritorio, la tarjeta pegada a la derecha hace lo mismo. Con extras, la hoja de siempre sigue igual.
// Precondición propia: los extras del local se apagan mientras corre la parte de día y hora (sell=false) y vuelven al terminar.
const ENT = require('../lib/entorno.cjs');
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const B = ENT.B, OUT = ENT.OUT;
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -qAt -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const espera = async (f, ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await f()) return true; } catch { /* sigue */ } await new Promise((r) => setTimeout(r, 250)); } return false; };
const PRO = 'barberia-el-primo';
const HORA = /^\d{1,2}:\d{2} (AM|PM)$/;

(async () => {
  const FREE = sql(`select b.id from businesses b join business_stats_cache s on s.business_id = b.id where s.plan = 'free' and b.category_id = 'NEG-BELL' and b.status = 'active' order by b.id limit 1`);
  ok(sql(`select s.plan from business_stats_cache s where s.business_id = '${PRO}'`) === 'pro' && !!FREE, `precondición: ${PRO} es Pro y ${FREE} es Free`);
  const extras = sql(`select coalesce(string_agg(id::text, ','), '') from items where business_id = '${PRO}' and module = 'svc' and is_extra and removed_at is null and sell`);
  const b = await chromium.launch(); const abiertas = [];
  try {
    console.log('1 · Teléfono: la ficha nueva y su encabezado');
    const cm = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }), m = await cm.newPage(); abiertas.push(cm);
    const err = []; m.on('pageerror', (e) => err.push(e.message));
    await m.goto(B + `/n/${PRO}`); await m.locator('[data-ficha="nueva"]').waitFor();
    const est = m.locator('[data-screen-label="App · Ficha"] [data-estado]');
    ok(await est.count() === 1, 'el estado (Abierto/Cerrado) sale una sola vez, junto al nombre');
    const ab = (await est.innerText()).split(/\s+/)[0];
    const hoy = await m.locator('[data-screen-label="Ficha · resumen"]').innerText();
    ok(!hoy.includes(`${ab} hasta`) && !/Abre (mañana|a las)/.test(hoy), 'la tarjeta de hoy no repite el estado');
    const tabs = await m.getByRole('tab').allInnerTexts();
    ok(tabs.map((x) => x.trim()).join('|').startsWith('RESUMEN|SERVICIOS|EQUIPO|RESEÑAS'), `pestañas en orden: ${tabs.map((x) => x.trim()).join(' · ')}`);
    ok(!/undefined|null|NaN/.test(await texto(m)), 'sin «undefined», «null» ni «NaN»');
    await m.screenshot({ path: OUT + 'fic005-resumen-390.png', fullPage: false });
    await m.getByRole('tab', { name: /EQUIPO/ }).click();
    const eq = m.locator('[data-screen-label="Ficha · equipo"]'); await eq.waitFor();
    ok(await eq.getByRole('button', { name: 'Ver su página' }).count() >= 1, 'Equipo: cada silla con «Ver su página»');
    await m.getByRole('tab', { name: /HORARIO/ }).click(); await m.locator('[data-screen-label="Ficha · horario"]').waitFor();
    ok(!!(await m.locator('[data-screen-label="Ficha · horario"]').getByText(/Cómo llegar/).count()), 'Horario con «Cómo llegar»');
    ok(await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth) <= 0, 'teléfono sin scroll de lado');

    console.log('2 · La reserva: servicio y con quién → día y hora (servidor) → Booking en «Detalles»');
    if (extras) sql(`update items set sell = false where id in (${extras})`);
    await m.goto(B + `/n/${PRO}?tab=svc`); await m.locator('[data-screen-label="Ficha · servicios"]').waitFor();
    await m.locator('[data-screen-label="Ficha · barra"]').getByRole('button', { name: 'Booking' }).click();
    const h = m.locator('[data-screen-label="App · Booking"]'); await h.getByText('Servicio y con quién').waitFor();
    ok(!!(await h.getByRole('button', { name: 'Elige un servicio' }).count()), 'sin servicio: «Elige un servicio»');
    await h.getByRole('radio', { name: 'Luis' }).click(); await h.getByText('Fade', { exact: true }).click();
    await m.screenshot({ path: OUT + 'fic005-paso1-390.png', fullPage: false });
    await h.getByRole('button', { name: 'Continuar' }).click(); await h.getByText('Día y hora').waitFor();
    for (let k = 1; k < 7 && !(await espera(async () => (await h.getByText(HORA).count()) > 0, 2500)); k++) await h.getByRole('radio').nth(k).click().catch(() => {});
    const l = await h.getByText(HORA).first().textContent(); await h.getByText(HORA).first().click();
    await m.screenshot({ path: OUT + 'fic005-paso2-390.png', fullPage: false });
    await h.getByRole('button', { name: 'Continuar' }).click(); await m.waitForURL(/\/cita\?.*&i=\d+&h=\d+/);
    ok(await espera(async () => /2 \/ 3/.test(await texto(m)) && (await texto(m)).includes('Detalles'), 12000), `Booking abre en «Detalles» con la hora elegida (${l})`);
    await m.getByRole('button', { name: 'Volver' }).first().click();
    ok(await espera(async () => (await m.getByRole('radio', { name: l.trim(), checked: true }).count()) > 0, 5000), 'y al volver, la hora elegida sigue marcada');
    ok(err.length === 0, `sin errores en la página${err.length ? ': ' + err.join(' | ') : ''}`);

    console.log('3 · Escritorio: una sola página, pestañas pegadas y la tarjeta de la derecha');
    const cd = await b.newContext({ viewport: { width: 1360, height: 900 } }), d = await cd.newPage(); abiertas.push(cd);
    await d.goto(B + `/n/${PRO}`); await d.locator('[data-ficha="nueva"]').waitFor();
    for (const s of ['res', 'cat', 'staff', 'rev', 'hor']) ok(await d.locator(`#sec-${s}`).count() === 1, `sección ${s}`);
    const t = d.locator('[data-screen-label="Ficha · Booking · columna"]'); await t.waitFor();
    await d.mouse.wheel(0, 1600); await d.waitForTimeout(500);
    ok(await espera(async () => (await t.boundingBox())?.y < 400, 3000), 'la tarjeta de reservar se queda pegada a la derecha al bajar');
    await d.evaluate(() => window.scrollTo(0, 0));
    await t.getByRole('radio', { name: 'Luis' }).click(); await t.getByText('Corte clásico').click();
    for (let k = 0; k < 7 && !(await espera(async () => (await t.getByText(HORA).count()) > 0, 2500)); k++) await t.locator('[role=radio]').nth(5 + k).click().catch(() => {});
    await t.getByText(HORA).first().click();
    await d.screenshot({ path: OUT + 'fic005-1360.png', fullPage: false });
    await t.getByRole('button', { name: 'Continuar' }).click(); await d.waitForURL(/\/cita\?.*&i=\d+&h=\d+/);
    ok(true, 'escritorio: «Continuar» lleva a Booking con el día y la hora');
    if (extras) sql(`update items set sell = true where id in (${extras})`);

    console.log('4 · Con extras, la hoja de siempre; Free sigue con la ficha de siempre');
    await m.goto(B + `/n/${PRO}?tab=svc`); await m.locator('[data-screen-label="Ficha · servicios"]').getByText('Fade', { exact: true }).click();
    await h.getByRole('radio', { name: 'Luis' }).click(); await h.getByRole('button', { name: 'Continuar' }).click();
    ok(await espera(async () => (await m.locator('[data-screen-label="Servicio · opciones"]').count()) > 0), 'con extras: la hoja del servicio de siempre');
    await m.goto(B + `/n/${FREE}`); await m.locator('[data-pantalla="APP-NEG-LISTING"]').waitFor();
    ok(await m.locator('[data-ficha="nueva"]').count() === 0, `Free (${FREE}): la ficha de siempre`);
    console.log(`\n${n} ✓ · fic005`);
  } finally {
    if (extras) { try { sql(`update items set sell = true where id in (${extras})`); } catch (e) { console.error('extras:', e.message); } }
    for (const c of abiertas) await c.close().catch(() => {});
    await b.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
