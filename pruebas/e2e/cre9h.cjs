// 9h · Crecimiento, la landing de acceso anticipado, los QR de calle y el SEO (fase9-apertura.md §4 9h). Teléfono 390 y escritorio 1360.
// 1 · la landing (/acceso) en ES y EN, a 390 y 1360, con las dos líneas fijas de §1c; anotarse con un código postal de CADA una de las cinco ciudades (la
//     cuenta queda verificada, la lista y «Avísame» con su ciudad, el número de fundador, sin el teléfono copiado) y uno de fuera («Pide tu ciudad»);
//     ya anotada; quitarse; «Tengo un negocio» → Publica tu negocio con la ciudad puesta → el panel dice cuándo se verá.
// 2 · Enlaces y QR: crear desde Super Admin › Crecimiento, escanear (contado sin personas, el navegador queda en la ciudad del enlace, un robot no cuenta),
//     el PDF para imprimir, retirar (lleva al Inicio); Solo lectura no entra.
// 3 · Campañas: a un segmento de Scranton con «Novedades» encendido; a más del umbral la aprueba OTRA persona; de noche no sale; el tope por semana; quien
//     no encendió «Novedades» no la recibe; cada quien en su idioma; retirar. La hora: Scranton se pone en un huso donde ahora es de día (o de noche) y vuelve.
// 4 · Mi cuenta › Avisos: «Novedades de To'Latino» apagado de fábrica; encenderlo enciende también su push.
// 5 · Destacados (fijar arriba de Negocios › Destacados y retirar), Promotores (nombrar uno; su código no vale para él) y la Lista de espera sin teléfonos.
// 6 · SEO del sandbox: robots.txt «Disallow: /», sin mapa del sitio, noindex en las páginas, el interruptor growth.landing apagado («/» es el Inicio).
// Precondiciones propias: la base dice «pruebas», cuentas nuevas con teléfonos 555 libres, el equipo de prueba, 60 vecinos de Scranton con «Novedades» (bloque
// 570-555-87xx, los mismos en cada corrida). Lo que la prueba cambia vuelve a como estaba (huso de Scranton, umbral de aprobación); lo creado se retira.
const ENT = require('../lib/entorno.cjs'); // rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const { entrarComo, telLibre, equipo, publicarBarberia } = require('../lib/negocio-nuevo.cjs');
const B = ENT.B, OUT = ENT.OUT;
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const sqlErr = (q) => { try { sql(q); return ''; } catch (e) { return String(e.stderr ?? e.message); } };
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const RUN = Date.now().toString(36), TAG = `c9h${RUN}`;
const ADM = '5705550199', BETO = '5705550188', LUCIA = '5705550693';
const ctxTel = (b, extra = {}) => b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, ...extra });
const ctxDesk = (b, extra = {}) => b.newContext({ viewport: { width: 1360, height: 900 }, ...extra });
// Un teléfono de verdad para los escaneos: el navegador sin pantalla de las pruebas («HeadlessChrome») cuenta como robot, igual que en la analítica.
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const shot = (p, nom, full = true) => p.screenshot({ path: OUT + `c9h-${nom}.png`, fullPage: full });
const uid = (tel) => sql(`select id from users where phone = '+1${tel}'`);
const barrer = () => execSync(`curl -s -X POST -H 'x-barrido-token: ${ENT.TOK}' ${B}/api/interno/barrido`).toString();
const motivo = async (p, t = 'Prueba cre9h') => { await p.locator('textarea').last().fill(`${t} ${RUN}`); };
const toast = (p, re) => p.getByRole('status').filter({ hasText: re }).first().waitFor({ timeout: 10000 });
const espera = async (f, ms = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await f()) return true; await new Promise((r) => setTimeout(r, 400)); } return false; };
// Un huso donde AHORA es de día (9–18 h) o de noche (1–5 h): la prueba no depende de la hora a la que corre.
const huso = (dia) => sql(`select tz from (values ('America/New_York'), ('Europe/Madrid'), ('Asia/Tokyo'), ('Pacific/Honolulu'), ('Asia/Kolkata'), ('America/Los_Angeles'), ('Australia/Sydney'), ('Asia/Dubai')) v(tz)
  where extract(hour from now() at time zone tz) ${dia ? 'between 9 and 18' : 'between 1 and 5'} order by tz limit 1`);

// La landing: código postal + teléfono → el código del modo pruebas → anotarse.
// Como entrarComo: solo los códigos de ESTE teléfono se limpian (antes y después), nunca los de otros; así la prueba no gasta el tope por dirección.
async function anotarse(p, zip, tel, negocio = null) {
  sql(`delete from otp_codes where phone = '+1${tel}'`);
  await p.goto(B + '/acceso'); await p.locator('[data-pantalla="APP-LANDING-PRE"]').waitFor();
  await p.getByLabel('TU CÓDIGO POSTAL', { exact: true }).fill(zip);
  await p.getByLabel('TU TELÉFONO', { exact: true }).fill(tel);
  if (negocio) {
    await p.getByRole('switch', { name: /Tengo un negocio/ }).click();
    await p.locator('[data-landing-negocio]').getByText(negocio.modo, { exact: true }).click();
    await p.getByLabel('NOMBRE DEL NEGOCIO', { exact: true }).fill(negocio.nombre);
  }
  await p.getByText('Enviarme el código', { exact: true }).click();
  const cod = (await p.locator('[data-modo-pruebas] b').textContent({ timeout: 10000 })).trim();
  await p.getByLabel('CÓDIGO DE 6 NÚMEROS', { exact: true }).fill(cod);
  await p.getByText('Anotarme', { exact: true }).click();
  await p.locator('[data-lista-lugar]').waitFor({ timeout: 10000 });
  sql(`delete from otp_codes where phone = '+1${tel}'`);
  return Number(await p.locator('[data-lista-lugar]').getAttribute('data-lista-lugar'));
}

(async () => {
  // ── Precondiciones propias ──
  sql(`insert into platform_config (key, value, note, updated_by) values ('entorno', '"pruebas"'::jsonb, 'Sandbox (cre9h)', 'semilla') on conflict (key) do update set value = excluded.value`);
  equipo(BETO, LUCIA);
  const tzScr = sql(`select timezone from cities where id = 'scr'`);
  const umbral0 = sql(`select value::text from platform_config where key = 'campana_aprobar_desde'`);
  const b = await chromium.launch();
  const abiertas = [], creados = { links: [], camps: [], feat: [] };
  try {
    // ── 1 · La landing ──
    console.log('1 · La landing de acceso anticipado: ES y EN, 390 y 1360, las líneas fijas, las cinco ciudades y una de fuera');
    ok(sql(`select enabled::text from feature_flags where key = 'growth.landing'`) === 'false', 'el interruptor growth.landing nace apagado: «/» sigue siendo el Inicio');
    const dk = await ctxDesk(b), pd = await dk.newPage(); abiertas.push(dk);
    const r0 = await pd.goto(B + '/acceso'); await pd.locator('[data-pantalla="APP-LANDING-PRE"]').waitFor();
    let t = await texto(pd);
    ok(r0.status() === 200 && t.includes('Alguien cerca de ti hace justo lo que buscas. Encontrarlo es lo difícil.') && t.includes('Te avisamos por mensaje de texto cuando abra tu zona. Nada más.'), 'escritorio 1360: las dos líneas fijas de §1c, palabra por palabra');
    ok(/Aquí cabe cualquier negocio/.test(t) && /Lo que viene/.test(t) && /Cómo llega a tu zona/.test(t) && /Para negocios/.test(t) && /Preguntas/.test(t) && /Comparte/.test(t), 'las secciones de la v3: cabe cualquier negocio, lo que viene, cómo llega, para negocios, preguntas, comparte');
    ok(/EJEMPLO/.test(t) && !/ABRE EL/.test(t), 'la vitrina dice que sus casos son EJEMPLOS y la fecha de apertura está oculta (v3)');
    ok(await pd.locator('meta[name="robots"][content*="noindex"]').count() === 1, 'la landing del sandbox dice noindex');
    await shot(pd, 'landing-es-1360');
    const en = await ctxDesk(b), pe = await en.newPage(); abiertas.push(en); await en.addCookies([{ name: 'tl_lang', value: 'en', url: B }]);
    await pe.goto(B + '/acceso'); await pe.locator('[data-pantalla="APP-LANDING-PRE"]').waitFor();
    t = await texto(pe);
    ok(t.includes('Someone near you does exactly what you need. Finding them is the hard part.') && t.includes('We will text you when your area opens. Nothing else.') && /Any business fits here/.test(t) && !/Aquí cabe cualquier negocio/.test(t), 'en inglés: las líneas fijas en inglés y nada en español');
    await shot(pe, 'landing-en-1360');
    const tl = await ctxTel(b), pt = await tl.newPage(); abiertas.push(tl);
    await pt.goto(B + '/acceso'); await pt.locator('[data-pantalla="APP-LANDING-PRE"]').waitFor();
    ok(await pt.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'teléfono 390: sin desbordarse a lo ancho');
    await shot(pt, 'landing-es-390');
    await pt.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await pt.waitForTimeout(600);
    ok(await pt.locator('[data-barra-avisame]').count() === 1, 'teléfono: la barra fija «Avísame» sale cuando el formulario no se ve');
    await pt.locator('[data-barra-avisame]').getByText('Avísame', { exact: true }).click(); await pt.waitForTimeout(900);
    ok(await pt.locator('[data-barra-avisame]').count() === 0, 'y al tocarla, el formulario vuelve a la vista');

    const CIUDADES = [['18201', 'hzl', 'Hazleton'], ['18102', 'alw', 'Allentown'], ['18702', 'wbr', 'Wilkes-Barre'], ['18505', 'scr', 'Scranton'], ['19611', 'rdg', 'Reading']];
    for (const [zip, ci, nom] of CIUDADES) {
      const c = await ctxTel(b), p = await c.newPage(); abiertas.push(c);
      const tel = telLibre(), antes = Number(sql(`select count(*) from early_access where city_id = '${ci}' and removed_at is null`));
      const fund = Number(sql(`select count(*) from early_access where city_id = '${ci}' and founder_vecino_n is not null`)) < Number(sql(`select cfg_int('fundadores_vecinos')`));
      const lugar = await anotarse(p, zip, tel);
      const fila = sql(`select e.city_id || '|' || e.zip || '|' || coalesce(e.founder_vecino_n::text, '-') || '|' || (u.phone_verified_at is not null) || '|' || u.founder from early_access e join users u on u.id = e.user_id where u.phone = '+1${tel}' and e.removed_at is null`);
      const [fc, fz, fn, verif, insignia] = fila.split('|');
      ok(fc === ci && fz === zip && verif === 'true' && lugar === antes + 1 && (await texto(p)).includes(`Estás en la lista · #${lugar}`) && (await texto(p)).includes(nom), `${nom} (${zip}): en la lista de su ciudad (#${lugar}), con la cuenta verificada por el código`);
      ok(fund ? fn !== '-' && insignia === 'true' && (await texto(p)).includes('llevas la insignia Fundadores') : fn === '-', fund ? `${nom}: fundador ${fn} (solo insignia)` : `${nom}: ya no quedan lugares de fundador`);
      ok(sql(`select count(*) from city_waitlist where user_id = '${uid(tel)}' and city_id = '${ci}' and source = 'coming_soon' and removed_at is null`) === '1', `${nom}: también en «Avísame» (lo que se avisa el día que abre)`);
      ok(sql(`select coalesce(notif_prefs->>'mkt', 'apagado') from users where phone = '+1${tel}'`) === 'apagado', `${nom}: anotarse NO enciende «Novedades» (la landing promete un solo mensaje)`);
      if (ci === 'hzl') {
        await p.goto(B + '/acceso'); await p.locator('[data-lista-lugar]').waitFor();
        ok((await texto(p)).includes(`Estás en la lista · #${lugar}`) || (await texto(p)).includes(`Ya estabas en la lista · #${lugar}`), 'al volver con su sesión, ve su lugar (lista ya anotada)');
        await p.getByText('Quitarme de la lista', { exact: true }).click(); await p.getByText('Te quitamos de la lista. No te vamos a escribir.').waitFor();
        ok(sql(`select (removed_at is not null)::text from early_access where user_id = '${uid(tel)}'`) === 'true' && sql(`select count(*) from city_waitlist where user_id = '${uid(tel)}' and removed_at is null`) === '0', 'quitarse: sale de la lista y de «Avísame» (nada se borra)');
      }
    }
    ok(sql(`select count(*) from information_schema.columns where table_name = 'early_access' and column_name ~ '(phone|^ip$|device|email)'`) === '0', 'la lista no copia el teléfono ni guarda IP, dispositivo o correo');
    {
      const c = await ctxTel(b), p = await c.newPage(); abiertas.push(c);
      const tel = telLibre(); await anotarse(p, '19020', tel);
      ok((await texto(p)).includes('Todavía no llegamos al 19020') && sql(`select coalesce(city_id, '-') || '|' || asked_city from early_access where user_id = '${uid(tel)}'`) === '-|CP 19020'
        && sql(`select count(*) from city_waitlist where user_id = '${uid(tel)}' and city_id is null and city_name = 'CP 19020'`) === '1', 'de fuera (19020): «Pide tu ciudad», en la lista con «CP 19020»');
      await shot(p, 'landing-fuera-390');
    }
    { // El código equivocado no anota a nadie.
      const c = await ctxTel(b), p = await c.newPage(); abiertas.push(c); const tel = telLibre();
      await p.goto(B + '/acceso'); await p.getByLabel('TU CÓDIGO POSTAL', { exact: true }).fill('18201'); await p.getByLabel('TU TELÉFONO', { exact: true }).fill(tel);
      await p.getByText('Enviarme el código', { exact: true }).click(); await p.locator('[data-modo-pruebas] b').waitFor();
      const bueno = (await p.locator('[data-modo-pruebas] b').textContent()).trim(), malo = bueno === '000000' ? '111111' : '000000';
      await p.getByLabel('CÓDIGO DE 6 NÚMEROS', { exact: true }).fill(malo); await p.getByText('Anotarme', { exact: true }).click();
      await p.getByRole('alert').filter({ hasText: /Ese código no es/ }).waitFor();
      ok(sql(`select count(*) from early_access e join users u on u.id = e.user_id where u.phone = '+1${tel}'`) === '0', 'un código equivocado: «Ese código no es» y nadie queda en la lista');
      sql(`delete from otp_codes where phone = '+1${tel}'`);
    }
    // «Tengo un negocio» en Allentown → Publica tu negocio con la ciudad puesta → el panel dice cuándo se verá.
    console.log('1b · «Tengo un negocio» (Allentown) → Publica tu negocio → el panel dice cuándo se verá');
    const telNeg = telLibre();
    {
      const c = await ctxTel(b), p = await c.newPage(); abiertas.push(c);
      await anotarse(p, '18102', telNeg, { modo: 'Desde casa', nombre: `Bizcochos ${TAG}` });
      t = await texto(p);
      ok(t.includes(`Apartaste el lugar de Bizcochos ${TAG}`) && t.includes('se ve el día que abra Allentown') && sql(`select has_business::text || '|' || business_kind || '|' || business_name from early_access where user_id = '${uid(telNeg)}'`) === `true|casa|Bizcochos ${TAG}`, 'con negocio: apartado (cómo trabaja y el nombre) y «se ve el día que abra Allentown»');
      ok(sql(`select viewing_city_id from users where phone = '+1${telNeg}'`) === 'alw', 'la ciudad (Allentown) queda puesta en la cuenta para Publicar');
      await shot(p, 'landing-negocio-390');
      await p.getByText('Publica tu negocio', { exact: true }).last().click(); await p.waitForURL(/\/publica/);
      ok(/\/publica/.test(p.url()), '«Publica tu negocio» lleva a publicar');
    }
    sql(`delete from otp_codes where phone = '+1${telNeg}'`);
    const neg = await publicarBarberia(b, { tel: telNeg, nombre: 'Rosa', apellido: 'Prueba' });
    ok(sql(`select city_id from businesses where id = '${neg.id}'`) === 'alw', `el negocio se publicó en Allentown (la ciudad de la landing), que todavía no abre`);
    {
      const c = await ctxTel(b), p = await c.newPage(); abiertas.push(c); await entrarComo(p, telNeg);
      await p.goto(B + `/panel/${neg.id}/hoy`); await p.getByText(/Tu página se ve el día que abra Allentown/).first().waitFor({ timeout: 15000 });
      ok(true, 'el panel (Hoy) dice «Tu página se ve el día que abra Allentown»');
      await shot(p, 'panel-pronto-390');
    }

    // ── 2 · Enlaces y QR ──
    console.log('2 · Enlaces y QR: crear, escanear sin personas, el PDF, retirar; Solo lectura no entra');
    const ca = await ctxDesk(b), pa = await ca.newPage(); abiertas.push(ca); await entrarComo(pa, ADM);
    await pa.goto(B + '/admin/crecimiento?t=links'); await pa.locator('[data-crecimiento="links"]').waitFor();
    for (const pest of ['Semilla', 'Promotores', 'Campañas', 'Destacados', 'Enlaces y QR', 'Lista de espera']) ok(await pa.getByText(pest, { exact: true }).count() > 0, `la pestaña «${pest}»`);
    await pa.getByLabel('DÓNDE VA (EL NOMBRE PARA EL EQUIPO)', { exact: true }).fill(`Volantes ${TAG}`);
    await pa.getByText('Volante', { exact: true }).last().click(); await pa.getByText('Allentown', { exact: true }).last().click(); await pa.getByText('Publica tu negocio', { exact: true }).last().click();
    await pa.getByText('Crear el enlace', { exact: true }).click(); await motivo(pa, 'Volantes de la campaña'); await pa.getByText('Crear', { exact: true }).last().click();
    await toast(pa, /el enlace y su QR ya funcionan/);
    const code = sql(`select code from short_links where label = 'Volantes ${TAG}'`); creados.links.push(code);
    ok(/^[ACDEFGHJKMNPQRTUVWXYZ234679]{7}$/.test(code) && sql(`select target || '|' || city_id || '|' || kind from short_links where code = '${code}'`) === '/publica|alw|volante', `creado: /q/${code} → /publica, Allentown, volante (7 letras sin las que se confunden)`);
    ok(sql(`select count(*) from audit_entries where action = 'mkt.enlace.crear' and target_id = '${code}' and reason = 'Volantes de la campaña ${RUN}'`) === '1', 'en la auditoría con su motivo');
    await shot(pa, 'enlaces-1360');
    const escaneos = () => Number(sql(`select count(*) from link_scans where code = '${code}'`));
    {
      const c = await ctxTel(b, { userAgent: IPHONE }), p = await c.newPage(); abiertas.push(c);
      const r = await p.goto(B + `/q/${code}`); await p.waitForLoadState();
      ok(/\/publica/.test(p.url()) && r.status() === 200, 'escanear lleva a Publica tu negocio');
      ok(escaneos() === 1 && sql(`select app || '|' || ua_class || '|' || city_id from link_scans where code = '${code}'`) === 'web|telefono|alw', 'el escaneo cuenta: web, teléfono, Allentown');
      ok((await c.cookies()).some((k) => k.name === 'tl_loc' && decodeURIComponent(k.value).startsWith('alw|')) && (await c.cookies()).some((k) => k.name === 'tl_src' && k.value === code), 'el navegador queda en la ciudad del enlace (Allentown) y la landing sabe de qué QR vino');
      ok(sql(`select count(*) from information_schema.columns where table_name = 'link_scans' and column_name ~ '(ip|device|user|agent|session)'`) === '0', 'un escaneo no guarda IP, dispositivo, cuenta ni navegador entero');
      const tel = telLibre(); await anotarse(p, '18102', tel);
      ok(sql(`select source_code from early_access where user_id = '${uid(tel)}'`) === code, 'quien se anota después de escanear queda con el código del QR (de dónde vino)');
    }
    { const r = execSync(`curl -s -o /dev/null -w '%{http_code}' -A 'WhatsApp/2.23 A' ${B}/q/${code}`).toString(); ok(r === '302' && escaneos() === 1, 'la vista previa de WhatsApp (un robot) no cuenta como escaneo'); }
    { const r = execSync(`curl -s -o /dev/null -w '%{redirect_url}' ${B}/q/ZZZZZZZ`).toString(); ok(/\/$/.test(r), 'un código que no existe lleva al Inicio'); }
    {
      const r = await pa.request.get(B + `/admin/crecimiento/volante/${code}?f=carta`), body = await r.body();
      ok(r.status() === 200 && r.headers()['content-type'] === 'application/pdf' && body.slice(0, 5).toString() === '%PDF-' && body.toString('latin1').includes('/MediaBox [0 0 612 792]'), 'el PDF del volante (carta) para imprimir');
      const m = await pa.request.get(B + `/admin/crecimiento/volante/${code}?f=media`);
      ok(m.status() === 200 && (await m.body()).toString('latin1').includes('/MediaBox [0 0 396 612]'), 'y el cartel en media carta');
      ok(sql(`select count(*) from audit_entries where action = 'mkt.enlace.imprimir' and target_id = '${code}'`) === '2', 'imprimir queda en la auditoría');
    }
    await pa.goto(B + `/admin/crecimiento?t=links&ver=${code}`); await pa.getByText(/ESCANEOS POR DÍA · 30 DÍAS/).first().waitFor();
    ok((await texto(pa)).includes(`/q/${code}`) && (await texto(pa)).includes('TELÉFONO · WEB'), 'los escaneos por día y por web/app del enlace');
    await pa.goto(B + '/admin/crecimiento?t=links&c=alw'); await pa.getByText(`Volantes ${TAG} · /q/${code}`).waitFor();
    await pa.getByText(`Volantes ${TAG} · /q/${code}`).locator('xpath=ancestor::div[.//div[@role="button"]][1]').getByText('Retirar', { exact: true }).click();
    await motivo(pa, 'Se quitaron los volantes'); await pa.getByText('Retirar', { exact: true }).last().click(); await toast(pa, /Retirado/);
    {
      const c = await ctxTel(b, { userAgent: IPHONE }), p = await c.newPage(); abiertas.push(c);
      await p.goto(B + `/q/${code}`); await p.waitForLoadState();
      ok(new URL(p.url()).pathname === '/' && escaneos() === 1, 'retirado: el QR lleva al Inicio y ya no cuenta');
    }
    ok(/un enlace no se borra/.test(sqlErr(`delete from short_links where code = '${code}'`)) && /retirado no vuelve/.test(sqlErr(`update short_links set target = '/x', retired_at = null where code = '${code}'`))
      && /no cambia de destino/.test(sqlErr(`update short_links set target = '/x' where code = 'HZCAPE2'`)), 'la base: un enlace no se borra, retirado no vuelve y no cambia de destino');
    ok(/short_links_target_check/.test(sqlErr(`insert into short_links (code, label, target, city_id, kind, created_by) values ('ACDEFGH', 'xx', '//otro.example', 'hzl', 'calle', '${uid(ADM)}')`)), 'la base rechaza un destino de otro origen');
    {
      const c = await ctxDesk(b), p = await c.newPage(); abiertas.push(c); await entrarComo(p, LUCIA);
      await p.goto(B + '/admin/crecimiento'); await p.waitForLoadState();
      ok(!/\/admin\/crecimiento/.test(p.url()), 'Solo lectura (sin permiso de Crecimiento) no entra');
      const r = await p.request.get(B + `/admin/crecimiento/volante/${code}`); ok(r.status() === 403, 'ni baja el PDF');
    }

    // ── 3 · Campañas ──
    console.log('3 · Campañas: segmento con «Novedades», aprobación de otra persona, silencio, tope, idioma y retirar');
    const dia = huso(true), noche = huso(false);
    ok(!!dia && !!noche, `husos para la prueba: de día ${dia}, de noche ${noche}`);
    sql(`insert into platform_config (key, value, note, updated_by) values ('campana_aprobar_desde', '50'::jsonb, 'cre9h', 'cre9h') on conflict (key) do update set value = excluded.value`);
    sql(`insert into users (phone, phone_verified_at, first_name, last_name, home_city_id, lang, is_test, notif_prefs)
         select '+157055587' || lpad(g::text, 2, '0'), now(), 'Vecino', 'Scranton', 'scr', 'es', true, '{"mkt": true, "mkt_push": true}'::jsonb from generate_series(1, 60) g on conflict (phone) do nothing`);
    const TT = telLibre(), TV = telLibre(), TU = telLibre();
    sql(`insert into users (phone, phone_verified_at, first_name, last_name, home_city_id, lang, is_test, notif_prefs) values
         ('+1${TT}', now(), 'Tope', 'Prueba', 'scr', 'es', true, '{"mkt": true}'::jsonb), ('+1${TV}', now(), 'Vera', 'English', 'scr', 'en', true, '{"mkt": true}'::jsonb), ('+1${TU}', now(), 'Uriel', 'Apagado', 'scr', 'es', true, '{}'::jsonb)`);
    // Tope: dos campañas ya recibidas esta semana.
    for (const i of [1, 2]) {
      const id = sql(`insert into campaigns (name, city_id, kind, channel, template_key, title, body, scheduled_at, status, created_by, is_test) values ('Anterior ${i} ${TAG}', 'scr', 'aviso', 'inapp', 'mkt_campana_app', '{"es":"Antes","en":"Before"}', '{"es":"Una anterior.","en":"An earlier one."}', now() - interval '2 days', 'enviada', '${uid(ADM)}', true) returning id`).split('\n')[0];
      sql(`insert into campaign_sends (campaign_id, user_id, city_id, channel, template_key, result, at) values (${id}, '${uid(TT)}', 'scr', 'inapp', 'mkt_campana_app', 'enviado', now() - interval '2 days')`);
    }
    sql(`update cities set timezone = '${dia}' where id = 'scr'`);
    await pa.goto(B + '/admin/crecimiento?t=camp'); await pa.locator('[data-crecimiento="camp"]').waitFor();
    await pa.getByLabel('NOMBRE (LO VE SOLO EL EQUIPO)', { exact: true }).fill(`Aviso ${TAG}`);
    await pa.getByText('Aviso', { exact: true }).last().click(); await pa.getByText('Scranton', { exact: true }).last().click();
    await pa.getByText(/Llega a \d+ personas que encendieron Novedades/).waitFor();
    const aud = Number(sql(`select count(*) from users u where u.home_city_id = 'scr' and (u.notif_prefs->>'mkt') = 'true' and cuenta_estado(u.status, u.status_until) in ('active', 'muted')`));
    ok((await texto(pa)).includes(`Llega a ${aud} personas que encendieron Novedades`), `la cuenta del segmento antes de mandar: ${aud} personas (solo con «Novedades»)`);
    await pa.getByLabel('TÍTULO EN ESPAÑOL', { exact: true }).fill(`Hola ${TAG}`); await pa.getByLabel('TÍTULO EN INGLÉS', { exact: true }).fill(`Hello ${TAG}`);
    await pa.getByLabel('TEXTO EN ESPAÑOL', { exact: true }).fill('Ya puedes ver los negocios de tu zona.'); await pa.getByLabel('TEXTO EN INGLÉS', { exact: true }).fill('You can now see the businesses in your area.');
    await pa.getByLabel('A DÓNDE LLEVA (OPCIONAL, UNA RUTA DE TO\'LATINO)', { exact: true }).fill('/negocios');
    await pa.getByText('Programar la campaña', { exact: true }).click(); await motivo(pa, 'Aviso a los vecinos'); await pa.getByText('Programar', { exact: true }).last().click();
    await toast(pa, /la tiene que aprobar otra persona/);
    const K = sql(`select id from campaigns where name = 'Aviso ${TAG}'`); creados.camps.push(K);
    ok(sql(`select status || '|' || audience_n from campaigns where id = ${K}`) === `por_aprobar|${aud}`, `a más de 50 personas (umbral de la prueba) queda «por aprobar» (${aud})`);
    await pa.goto(B + '/admin/crecimiento?t=camp&c=scr'); await pa.getByText(`Aviso ${TAG} · Scranton`).waitFor();
    ok(await pa.getByText(`Aviso ${TAG} · Scranton`).locator('xpath=ancestor::div[.//div[@role="button"]][1]').getByText('Aprobar', { exact: true }).count() === 0, 'quien la creó no ve «Aprobar»');
    ok(/campaigns_check/.test(sqlErr(`update campaigns set approved_by = created_by where id = ${K}`)), 'y la base no deja que la apruebe quien la creó');
    await shot(pa, 'campanas-1360');
    barrer(); ok(sql(`select count(*) from campaign_sends where campaign_id = ${K}`) === '0', 'sin aprobar no sale nada');
    {
      const c = await ctxTel(b), p = await c.newPage(); abiertas.push(c); await entrarComo(p, BETO);
      await p.goto(B + '/admin/crecimiento?t=camp&c=scr'); await p.getByText(`Aviso ${TAG} · Scranton`).waitFor();
      await p.getByText(`Aviso ${TAG} · Scranton`).locator('xpath=ancestor::div[.//div[@role="button"]][1]').getByText('Aprobar', { exact: true }).click();
      await motivo(p, 'Revisé el texto y el segmento'); await p.getByText('Aprobar', { exact: true }).last().click(); await toast(p, /Aprobada/);
      ok(sql(`select status || '|' || (approved_by = '${uid(BETO)}') from campaigns where id = ${K}`) === 'programada|true', 'otra persona del equipo (teléfono 390) la aprueba');
      await shot(p, 'campanas-390');
    }
    barrer();
    ok(await espera(() => sql(`select status from campaigns where id = ${K}`) === 'enviada'), 'de día en Scranton: el barrido la manda');
    const res = (tel) => sql(`select coalesce((select result from campaign_sends where campaign_id = ${K} and user_id = '${uid(tel)}'), 'nada')`);
    ok(res(TT) === 'tope' && res(TU) === 'nada' && res(TV) === 'enviado', 'quien ya recibió 2 esta semana queda «tope»; quien no encendió «Novedades» no está; los demás «enviado»');
    ok(sql(`select count(*) from notifications where user_id = '${uid(TU)}' and ref_kind = 'campaign' and ref_id = '${K}'`) === '0' && sql(`select count(*) from notifications where user_id = '${uid(TT)}' and ref_kind = 'campaign' and ref_id = '${K}'`) === '0', 'ni Uriel (apagado) ni Tope (tope) reciben el aviso');
    ok(sql(`select title || '|' || href from notifications where user_id = '${uid(TV)}' and ref_kind = 'campaign' and ref_id = '${K}'`) === `Hello ${TAG}|/negocios`, 'Vera lo recibe en inglés (su idioma), con su enlace');
    { // Cada persona del segmento queda UNA vez: enviado o en tope (las de corridas anteriores de esta prueba también pueden estar en tope); sent_n cuenta los enviados.
      const [env, tope, tot] = sql(`select count(*) filter (where result = 'enviado') || '|' || count(*) filter (where result = 'tope') || '|' || count(*) from campaign_sends where campaign_id = ${K}`).split('|').map(Number);
      ok(tot === aud && tope >= 1 && env === Number(sql(`select sent_n from campaigns where id = ${K}`)) && /solo de inserción/.test(sqlErr(`delete from campaign_sends where campaign_id = ${K}`)), `las ${aud} personas del segmento, una vez cada una: ${env} enviados y ${tope} en tope; los envíos son de solo inserción`);
    }
    // De noche no sale.
    sql(`update cities set timezone = '${noche}' where id = 'scr'`);
    const K2 = sql(`insert into campaigns (name, city_id, kind, channel, template_key, title, body, scheduled_at, status, audience_n, created_by, is_test) values ('Noche ${TAG}', 'scr', 'aviso', 'inapp', 'mkt_campana_app', '{"es":"Noche","en":"Night"}', '{"es":"De noche no.","en":"Not at night."}', now(), 'programada', 1, '${uid(ADM)}', true) returning id`).split('\n')[0]; creados.camps.push(K2);
    barrer();
    ok(sql(`select status from campaigns where id = ${K2}`) === 'programada' && sql(`select count(*) from campaign_sends where campaign_id = ${K2}`) === '0', `de noche en Scranton (${noche}): la campaña espera, no sale nada`);
    await pa.goto(B + '/admin/crecimiento?t=camp&c=scr'); await pa.getByText(`Noche ${TAG} · Scranton`).waitFor();
    await pa.getByText(`Noche ${TAG} · Scranton`).locator('xpath=ancestor::div[.//div[@role="button"]][1]').getByText('Retirar', { exact: true }).click();
    await motivo(pa, 'Ya no aplica'); await pa.getByText('Retirar', { exact: true }).last().click(); await toast(pa, /Retirada/);
    sql(`update cities set timezone = '${dia}' where id = 'scr'`); barrer();
    ok(sql(`select status from campaigns where id = ${K2}`) === 'retirada' && sql(`select count(*) from campaign_sends where campaign_id = ${K2}`) === '0', 'retirada: aunque ya sea de día, no sale (y queda en el historial)');

    // ── 4 · Mi cuenta › Avisos ──
    console.log('4 · Mi cuenta › Avisos: «Novedades de To\'Latino» apagado de fábrica; encenderlo enciende su push');
    {
      const c = await ctxTel(b), p = await c.newPage(); abiertas.push(c); await entrarComo(p, TU);
      await p.goto(B + '/cuenta/avisos'); const sw = p.getByRole('switch', { name: "Novedades de To'Latino" }); await sw.waitFor();
      ok(await sw.getAttribute('aria-checked') === 'false', 'apagado de fábrica');
      await sw.click();
      ok(await espera(() => sql(`select coalesce(notif_prefs->>'mkt', '') || '|' || coalesce(notif_prefs->>'mkt_push', '') from users where phone = '+1${TU}'`) === 'true|true'), 'encenderlo enciende «mkt» y su push (lo eligió la persona)');
      await shot(p, 'avisos-novedades-390');
    }

    // ── 5 · Destacados, Promotores y Lista de espera ──
    console.log('5 · Destacados, Promotores y la Lista de espera');
    const pro = sql(`select b.id || '|' || b.name from businesses b join business_stats_cache s on s.business_id = b.id where b.city_id = 'hzl' and b.status = 'active' and s.plan = 'pro'
                     and not exists (select 1 from featured f where f.business_id = b.id and f.retired_at is null and f.to_at > now()) order by b.name limit 1`).split('|');
    await pa.goto(B + '/admin/crecimiento?t=feat&c=hzl'); await pa.locator('[data-crecimiento="feat"]').waitFor();
    await pa.getByPlaceholder('Nombre del negocio').fill(pro[1].slice(0, 12));
    await pa.getByText(pro[1], { exact: true }).last().waitFor();
    await pa.getByText(pro[1], { exact: true }).last().locator('xpath=ancestor::div[.//div[@role="button"]][1]').getByText('Fijar', { exact: true }).click();
    await motivo(pa, 'Negocio nuevo de la campaña'); await pa.getByText('Fijar', { exact: true }).last().click(); await toast(pa, /sale primero en Destacados/);
    const F = sql(`select id from featured where business_id = '${pro[0]}' and retired_at is null and to_at > now()`); creados.feat.push(F);
    ok(!!F && sql(`select count(*) from audit_entries where action = 'mkt.destacado.fijar' and target_id = '${pro[0]}' and reason like '%${RUN}'`) === '1', `${pro[1]} fijado 7 días, con su auditoría`);
    {
      const c = await ctxDesk(b), p = await c.newPage(); abiertas.push(c);
      await c.addCookies([{ name: 'tl_loc', value: 'hzl|centro|30', url: B }]);
      await p.goto(B + '/negocios'); await p.waitForLoadState();
      const pos = await p.evaluate((nom) => { const t = document.body.innerText; const i = t.indexOf('Destacados'); return i < 0 ? -1 : t.indexOf(nom, i); }, pro[1]);
      ok(pos > 0, `en Negocios › Destacados de Hazleton sale ${pro[1]}`);
    }
    ok(/destacados_tope|ya tiene uno vivo/.test(sqlErr(`insert into featured (city_id, business_id, mode, to_at, by_staff_id, reason) values ('hzl', '${pro[0]}', 'fijar', now() + interval '1 day', '${uid(ADM)}', 'otra vez')`)), 'la base: un negocio no se fija dos veces');
    await pa.goto(B + '/admin/crecimiento?t=feat&c=hzl'); await pa.getByText('FIJADOS Y QUITADOS').waitFor();
    await pa.getByText(pro[1], { exact: true }).first().locator('xpath=ancestor::div[.//div[@role="button"]][1]').getByText('Retirar', { exact: true }).first().click();
    await motivo(pa, 'Ya no hace falta'); await pa.getByText('Retirar', { exact: true }).last().click(); await toast(pa, /vuelve a la rotación/);
    ok(sql(`select (retired_at is not null)::text from featured where id = ${F}`) === 'true', 'retirado: vuelve a la rotación (nada se borra)');
    // Promotores
    const TP = telLibre(); await (async () => { const c = await ctxTel(b), p = await c.newPage(); abiertas.push(c); await entrarComo(p, TP, { nombre: 'Promo', apellido: 'Tor' }); })();
    await pa.goto(B + '/admin/crecimiento?t=promo'); await pa.locator('[data-crecimiento="promo"]').waitFor();
    ok((await texto(pa)).includes('HZL30'), 'el código de la campaña de Fundadores (HZL30) vive en la tabla de códigos');
    await pa.getByLabel('SU TELÉFONO (TIENE CUENTA EN TO\'LATINO)', { exact: true }).fill(TP);
    await pa.getByText('Nombrar promotor', { exact: true }).click(); await motivo(pa, 'Vecino que conoce negocios del barrio'); await pa.getByText('Nombrar', { exact: true }).last().click();
    await toast(pa, /su código es/);
    const PC = sql(`select code from promo_codes where promoter_user_id = '${uid(TP)}' and retired_at is null`);
    ok(/^PROMO\d{2}$/.test(PC) && sql(`select is_promoter::text from users where phone = '+1${TP}'`) === 'true' && sql(`select count(*) from notifications where user_id = '${uid(TP)}' and tpl = 'mkt_promotor'`) === '1', `promotor nombrado: código ${PC} y su aviso`);
    { // Un negocio nuevo que se publica con su código: más días de prueba y queda como traído por el promotor.
      const N = await publicarBarberia(b, { promo: PC, nombre: 'Nico', apellido: 'Traido' });
      ok(sql(`select status || '|' || code || '|' || city_id from business_referrals where business_id = '${N.id}'`) === `traido|${PC}|hzl`
        && sql(`select promo_code || '|' || (trial_ends_at > now() + interval '59 days') from subscriptions where business_id = '${N.id}'`) === `${PC}|true`, `un negocio publicado con ${PC}: 60 días de prueba y «traído» por el promotor`);
      await pa.goto(B + '/admin/crecimiento?t=promo'); await pa.getByText(new RegExp(`· ${PC}`)).first().waitFor();
      ok(/1 negocios traídos/.test(await texto(pa)), 'Promotores lo cuenta (1 negocio traído)');
    }
    await pa.goto(B + '/admin/crecimiento?t=promo'); await pa.getByText(new RegExp(`· ${PC}$`)).first().waitFor().catch(() => {});
    await pa.getByText(new RegExp(`${PC}`)).first().locator('xpath=ancestor::div[.//div[@role="button"]][1]').getByText('Retirar', { exact: true }).click();
    await motivo(pa, 'Terminó la campaña'); await pa.getByText('Retirar', { exact: true }).last().click(); await toast(pa, /ya no da días de prueba/);
    ok(sql(`select (retired_at is not null)::text || '|' || (select is_promoter::text from users where phone = '+1${TP}') from promo_codes where code = '${PC}'`) === 'true|false', 'retirar el código: ya no es promotor (nada se borra)');
    // Lista de espera
    await pa.goto(B + '/admin/crecimiento?t=lista'); await pa.getByText('POR CIUDAD').waitFor();
    t = await texto(pa);
    ok(/Allentown · \d+/.test(t) && /NEGOCIOS APARTADOS POR TIPO/.test(t) && /Desde casa · \d+/.test(t) && /CP 19020 · \d+/.test(t) && /Oculta \(como el diseño v3\)/.test(t), 'Lista de espera: por ciudad, negocios por tipo, «Pide tu ciudad» y la fecha oculta');
    ok(!t.includes(TT) && !t.includes(telNeg) && !t.includes(`(${telNeg.slice(0, 3)}) ${telNeg.slice(3, 6)}`) && !/\+1570555\d{4}/.test(t), 'sin un solo teléfono');
    await shot(pa, 'lista-1360');
    {
      const c = await ctxTel(b), p = await c.newPage(); abiertas.push(c); await entrarComo(p, ADM);
      await p.goto(B + '/admin/crecimiento?t=lista'); await p.getByText('POR CIUDAD').waitFor();
      ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'Crecimiento en el teléfono (390): sin desbordarse');
      await shot(p, 'lista-390');
    }

    // ── 6 · SEO del sandbox ──
    console.log('6 · SEO: el sandbox no se indexa');
    ok(/Disallow: \//.test(execSync(`curl -s ${B}/robots.txt`).toString()) && !/Sitemap:/i.test(execSync(`curl -s ${B}/robots.txt`).toString()), 'robots.txt del sandbox: «Disallow: /» y sin mapa del sitio');
    { const s = execSync(`curl -s -o /dev/null -w '%{http_code}' ${B}/sitemap.xml`).toString(), p0 = execSync(`curl -s -o /dev/null -w '%{http_code}' ${B}/mapa-del-sitio/0.xml`).toString(); ok(s === '404' && p0 === '404', 'el sandbox no tiene mapa del sitio (404)'); }
    { const h = execSync(`curl -s ${B}/n/sabor-dominicano`).toString(); ok(/<meta name="robots" content="noindex, nofollow"/.test(h) && /"@type":"LocalBusiness"/.test(h) && /<link rel="canonical"/.test(h), 'la ficha: noindex en el sandbox, su canónico y schema.org/LocalBusiness'); }
    { const c = await ctxDesk(b), p = await c.newPage(); abiertas.push(c); await p.goto(B + '/'); ok(await p.locator('[data-pantalla="APP-LANDING-PRE"]').count() === 0, 'con growth.landing apagado, «/» no es la landing'); }
  } finally {
    // Volver a como estaba: el huso de Scranton, el umbral de aprobación; lo creado se retira (nada se borra).
    try { sql(`update cities set timezone = '${tzScr}' where id = 'scr'`); } catch { /* */ }
    try { if (umbral0) sql(`update platform_config set value = '${umbral0}'::jsonb where key = 'campana_aprobar_desde'`); else sql(`delete from platform_config where key = 'campana_aprobar_desde'`); } catch { /* */ }
    for (const k of creados.camps) try { sql(`update campaigns set status = 'retirada', retired_at = now(), retired_by = '${uid(ADM)}', retired_reason = 'limpieza cre9h' where id = ${k} and status not in ('enviada', 'retirada')`); } catch { /* */ }
    for (const f of creados.feat) try { sql(`update featured set retired_at = now(), retired_by = '${uid(ADM)}', retired_reason = 'limpieza cre9h' where id = ${f} and retired_at is null`); } catch { /* */ }
    for (const l of creados.links) try { sql(`update short_links set retired_at = now(), retired_by = '${uid(ADM)}', retired_reason = 'limpieza cre9h' where code = '${l}' and retired_at is null`); } catch { /* */ }
    for (const c of abiertas) await c.close().catch(() => {});
    await b.close();
  }
  console.log(`\ncre9h: ${n} comprobaciones ✓`);
})().catch((e) => { console.error('✗', e.message); process.exit(1); });
