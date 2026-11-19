// 9t · Mi ciudad — lo que quedaba de 1f-2 (LAUNCH «Mi ciudad — lo que queda de 1f-2»; diseño «To'Latino Ciudad»: addrs, loginAddr, my.a). Teléfono 390 y
// escritorio 1360, ES y EN.
// 1 · Sin sesión: «Desde dónde medimos» ofrece «Entra para medir desde tu casa o tu trabajo» (lleva a Entrar y vuelve) y «Qué es Mi ciudad» abre la ayuda
//     ciudades-que-abren.
// 2 · Con sesión: Casa y Trabajo (sus direcciones con punto) salen en «Desde dónde medimos» con su calle; la quitada y la que no tiene punto no salen.
//     Elegir Casa: el encabezado dice «casa», la cookie guarda «dir:<id>» y NUNCA el punto, y la cuenta guarda lo mismo.
// 3 · Solo la dueña: otra persona con esa misma cookie mide desde el centro (sin «casa»); sin sesión, también.
// 4 · ES/EN y 390/1360 sin scroll de lado.
// Precondiciones propias: personas nuevas con teléfonos 555 libres y sus direcciones (lo que crea la prueba queda con su historial: nada se borra).
const ENT = require('../lib/entorno.cjs');
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const { entrarComo, telLibre } = require('../lib/negocio-nuevo.cjs');
const B = ENT.B, OUT = ENT.OUT;
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -qAt -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const ctxTel = (b, extra = {}) => b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, ...extra });
const ctxDesk = (b, extra = {}) => b.newContext({ viewport: { width: 1360, height: 900 }, ...extra });
const shot = (p, nom, full = false) => p.screenshot({ path: OUT + `c9t-${nom}.png`, fullPage: full });
const uid = (tel) => sql(`select id from users where phone = '+1${tel}'`);
const espera = async (f, ms = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await f()) return true; await new Promise((r) => setTimeout(r, 400)); } return false; };
const vis = async (l) => { const k = await l.count(); for (let i = 0; i < k; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l); };
const sinScroll = (p) => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const dir = (u, label, street, punto, quitada = false) => sql(`insert into user_addresses (user_id, label, street, zip, city_id, geo, geo_quality, removed_at) values ('${u}', '${label}', '${street}', '18201', 'hzl',
  ${punto ? `st_geogfromtext('POINT(${punto})')` : 'null'}, ${punto ? "'numero'" : 'null'}, ${quitada ? 'now()' : 'null'}) returning id`).split('\n')[0];
const loc = async (c) => decodeURIComponent((await c.cookies(B)).find((x) => x.name === 'tl_loc')?.value ?? '');
const abrir = async (p) => { await p.goto(B + '/?ciudad'); await p.getByText(/¿Dónde buscas\?|Where are you looking\?/).first().waitFor(); };

(async () => {
  const b = await chromium.launch(); const err = [], abiertas = [];
  const mirar = (p, tag) => { p.on('pageerror', (e) => err.push(tag + ' ' + e.message)); };
  try {
    // ── 1 · Sin sesión ──
    console.log('1 · Sin sesión: «Entra para medir desde tu casa» y «Qué es Mi ciudad»');
    const c0 = await ctxTel(b), p0 = await c0.newPage(); abiertas.push(c0); mirar(p0, 'invitado');
    await c0.addCookies([{ name: 'tl_loc', value: 'hzl|centro|5', url: B }]);
    await abrir(p0);
    ok(await espera(async () => !!(await vis(p0.getByText('Entra para medir desde tu casa o tu trabajo')))), '«Entra para medir desde tu casa o tu trabajo» en «Desde dónde medimos»');
    ok(!!(await vis(p0.getByText('Qué es Mi ciudad', { exact: true }))), '«Qué es Mi ciudad» para quien no entró');
    ok(!(await vis(p0.getByText('Casa', { exact: true }))) && !(await vis(p0.getByText('Trabajo', { exact: true }))), 'sin sesión no hay Casa ni Trabajo');
    await shot(p0, 'invitado-390-es', true);
    ok(await sinScroll(p0), '390 · sin scroll de lado');
    await clic(p0.getByText('Qué es Mi ciudad', { exact: true }));
    await p0.waitForURL(/\/ayuda\/ciudades-que-abren/);
    ok(true, '«Qué es Mi ciudad» abre la ayuda ciudades-que-abren');
    await abrir(p0);
    await clic(p0.getByText('Entra para medir desde tu casa o tu trabajo'));
    await p0.waitForURL(/\/entrar\?volver=/);
    ok(true, '«Entra para medir…» lleva a Entrar (y vuelve a donde estaba)');

    // ── 2 · Con sesión: Casa y Trabajo ──
    console.log('2 · Con sesión: Casa y Trabajo desde Mis direcciones');
    const TA = telLibre(), TB = telLibre();
    const ca = await ctxTel(b), pa = await ca.newPage(); abiertas.push(ca); mirar(pa, 'ana');
    await entrarComo(pa, TA, { nombre: 'Ana', apellido: 'Casa' });
    const A = uid(TA);
    const casa = dir(A, 'casa', '58 W Oak St', '-75.9790 40.9580'), trabajo = dir(A, 'trabajo', '125 Commerce Dr', '-75.9650 40.9480');
    dir(A, 'otra', '402 Alter St', '-75.9700 40.9500', true); dir(A, 'otra', '9 Sin Punto Rd', null);
    await ca.addCookies([{ name: 'tl_loc', value: 'hzl|centro|5', url: B }]);
    await abrir(pa);
    ok(await espera(async () => !!(await vis(pa.getByText('Casa', { exact: true })))), 'Casa sale en «Desde dónde medimos»');
    ok(!!(await vis(pa.getByText('Trabajo', { exact: true }))), 'Trabajo también');
    const t2 = await texto(pa);
    ok(/58 W OAK ST · 18201/.test(t2) && /125 COMMERCE DR · 18201/.test(t2), 'cada una con su calle');
    ok(!/402 ALTER ST/.test(t2) && !/9 SIN PUNTO RD/.test(t2), 'la quitada y la que no tiene punto no salen');
    ok(!/Entra para medir desde tu casa/.test(t2), 'con sesión no se pide entrar');
    ok(/Mi ciudad/.test(t2) && !/Qué es Mi ciudad/.test(t2), 'con sesión el enlace es «Mi ciudad»');
    await shot(pa, 'casa-390-es', true);
    await clic(pa.getByText('Casa', { exact: true }));
    await clic(pa.getByRole('button', { name: /^Ver \d+ negocios a 5 mi$/ }));
    ok(await espera(async () => (await loc(ca)) === `hzl|dir:${casa}|5`), 'la cookie guarda «dir:<id>» y nunca el punto');
    ok(sql(`select viewing_center from users where id = '${A}'`) === `dir:${casa}`, 'la cuenta guarda lo mismo (sin el punto)');
    await pa.goto(B + '/');
    ok(/5 mi · casa/.test(await texto(pa)) || /5 MI/.test(await texto(pa)), 'el encabezado mide desde casa');
    const cad = await ctxDesk(b, { storageState: await ca.storageState() }), pad = await cad.newPage(); abiertas.push(cad); mirar(pad, 'ana-1360');
    await pad.goto(B + '/');
    ok(/Hazleton, PA · 5 mi · casa/.test(await texto(pad)), '1360: «Hazleton, PA · 5 mi · casa»');
    void trabajo;

    // ── 3 · Solo la dueña ──
    console.log('3 · Otra persona con la misma cookie mide desde el centro');
    const cb = await ctxDesk(b), pb = await cb.newPage(); abiertas.push(cb); mirar(pb, 'bea');
    await entrarComo(pb, TB, { nombre: 'Bea', apellido: 'Centro' });
    await cb.addCookies([{ name: 'tl_loc', value: `hzl|dir:${casa}|5`, url: B }]);
    await pb.goto(B + '/');
    ok(!/· casa/.test(await texto(pb)), 'Bea (otra cuenta) no mide desde la casa de Ana');
    const cz = await ctxDesk(b), pz = await cz.newPage(); abiertas.push(cz);
    await cz.addCookies([{ name: 'tl_loc', value: `hzl|dir:${casa}|5`, url: B }]);
    await pz.goto(B + '/');
    ok(!/· casa/.test(await texto(pz)), 'sin sesión tampoco');

    // ── 4 · ES/EN y 390/1360 ──
    console.log('4 · ES/EN y 390/1360');
    for (const [w, lang, ses] of [[390, 'en', true], [1360, 'es', true], [1360, 'en', false], [1360, 'es', false]]) {
      const cx = await (w === 390 ? ctxTel(b, ses ? { storageState: await ca.storageState() } : {}) : ctxDesk(b, ses ? { storageState: await ca.storageState() } : {})); abiertas.push(cx);
      await cx.addCookies([{ name: 'tl_lang', value: lang, url: B }, { name: 'tl_loc', value: 'hzl|centro|5', url: B }]);
      const px = await cx.newPage(); mirar(px, `${w}-${lang}`);
      await abrir(px);
      const want = ses ? (lang === 'es' ? 'Trabajo' : 'Work') : (lang === 'es' ? 'Qué es Mi ciudad' : 'What is My city');
      ok(await espera(async () => !!(await vis(px.getByText(want, { exact: true })))), `${w} · ${lang.toUpperCase()} · ${ses ? 'con' : 'sin'} sesión: «${want}»`);
      if (!ses) ok(/Sign in to measure from home or work|Entra para medir desde tu casa o tu trabajo/.test(await texto(px)), `${w} · ${lang.toUpperCase()}: «Entra para medir…» en su idioma`);
      ok(await sinScroll(px), `${w} · ${lang.toUpperCase()}: sin scroll de lado`);
      await shot(px, `selector-${w}-${lang}-${ses ? 'sesion' : 'invitado'}`);
    }
    ok(!err.length, 'sin errores en la página' + (err.length ? ' → ' + err.join(' | ') : ''));
  } finally {
    for (const c of abiertas) await c.close().catch(() => {});
    await b.close();
  }
  console.log(`\n${n} comprobaciones ✓`);
})().catch((e) => { console.error(e); process.exit(1); });
