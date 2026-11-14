// 8i · Fichas, privacidad, reglas de las tiendas, cuentas de revisión, «Lo que te toca», Declaraciones y Analítica › Apps, de punta a punta contra
// el servidor de :3100 (servir8i.sh: con los códigos fijos de las cuentas de revisión en el entorno de ESTE proceso) y los simuladores de App Store
// Connect (:4404) y Google Play (:4408). A 390 y 1360, con y sin el rótulo TLApp/{app}/{plat}.
// 1 · /privacidad y /soporte sin sesión (ES y EN). 2 · Pro: la web lo ofrece y dentro de Negocios (iOS y Android) ninguna pantalla; el servidor
//     rechaza volver a Pro desde la app aunque se llame la acción. 3 · Borrar mi cuenta alcanzable en las 4 apps (con sus cuentas de revisión).
// 4 · Cuentas de revisión: entran con su código, nunca se ve el código, código malo, no pagan (la base y el servidor), ven solo lo suyo (el negocio
//     oculto), dejan de servir al desactivarse o con el interruptor apagado (también con un código ya pedido). 5 · Super Admin: Fichas y revisión
//     (sin llaves → sin llave; con llaves → borrador en los simuladores, nada a revisión), Lo que te toca, Declaraciones, el CSV, Analítica › Apps.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process'); const fs = require('fs'); const crypto = require('crypto');
const S = ENT.S, OUT = S + '/cap/', B = 'http://localhost:3100', REPO = ENT.RAIZ;
const ASC = require(REPO + '/scripts/tiendas-sim/sim.cjs'), PLAY = require(REPO + '/scripts/tiendas-sim/play.cjs');
const APPS = JSON.parse(fs.readFileSync(REPO + '/apps/mobile/apps.json', 'utf8')), V = APPS.version;
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const sqlFalla = (q) => { try { sql(q); return null; } catch (e) { return String(e.stderr); } };
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const limpiarCodigos = (tel) => sql(`delete from otp_codes where (phone = '+1${tel}' or ip in ('127.0.0.1', '::1', '::ffff:127.0.0.1')) and created_at > now() - interval '3 hours'`);
const entrar = async (p, tel) => { await p.goto(B + '/ayuda'); limpiarCodigos(tel); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); const r = await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); if (!r.ok) throw new Error('no entró ' + tel + JSON.stringify(a)); };
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const espera = async (f, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await new Promise((r) => setTimeout(r, 250)); } return false; };
const boton = (p, t) => p.locator('button, [role=button]').filter({ hasText: t instanceof RegExp ? t : new RegExp(`^${t}$`) });
const ADM = '5705550199', REV = { cliente: '4845550181', negocio: '4845550182', delivery: '4845550183', checkin: '4845550184' };
const COD = { cliente: ENT.sec('REVISION_CODIGO_CLIENTE'), negocio: ENT.sec('REVISION_CODIGO_NEGOCIO'), delivery: ENT.sec('REVISION_CODIGO_REPARTIDOR'), checkin: ENT.sec('REVISION_CODIGO_PUERTA') }; // los de la corrida (pruebas/servir/servir.sh, al azar)
const UA_IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148', UA_AND = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const rotulo = (app, plat) => `${plat === 'ios' ? UA_IOS : UA_AND} TLApp/${app}/${plat}/${V} (101)`;
const env = ENT.env; // los secretos de la corrida (pruebas/servir/servir.sh)

(async () => {
  // ── Preparar (solo esta base local; las tablas solo de inserción se limpian en modo réplica) ──
  const limpiarTiendas = () => sql(`set session_replication_role = replica; delete from store_listings; delete from store_screenshots; delete from founder_steps; delete from review_account_log;
    delete from store_secret_reads where secret_id in (select id from store_secrets where kind in ('asc_api_key', 'play_service_account')); delete from store_secrets where kind in ('asc_api_key', 'play_service_account');
    delete from audit_entries where action like 'fichas.%' or action like 'revision.%' or action like 'paquete.%'`);
  limpiarTiendas();
  sql(`update feature_flags set enabled = false where key = 'app.revision.cuentas'`); sql(`update review_accounts set active = true`);
  sql(`delete from platform_config where key in ('revision_intentos_hora', 'fichas_subidas_dia')`);
  sql(`update business_stats_cache set plan = 'free' where business_id = 'revision-tolatino'`); // Free: para ver los «Ver Pro» (se devuelve al final)
  const kp = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' }), KID = 'ZX9Y8W7V6U', EMISOR = '57246542-96fe-1a63-e053-0824d011072a';
  const asc = await ASC.arrancar({ puerto: 4404, publica: kp.publicKey, emisor: EMISOR, kid: KID, apps: APPS.apps.map((a, i) => ({ bundle: a.ios, id: 6400000001 + i })) });
  const cuenta = PLAY.cuentaDePrueba(), desc = JSON.parse(fs.readFileSync(ENT.rec('androidpublisher-v3.json'), 'utf8'));
  const play = await PLAY.arrancar({ puerto: 4408, descubrimiento: desc, cuenta, paquetes: APPS.apps.map((a) => a.android) });
  const br = await chromium.launch(), errs = [];
  const pagina = async (k, w, ua) => { const cx = await br.newContext({ viewport: { width: w, height: w > 500 ? 900 : 844 }, deviceScaleFactor: 1, locale: 'es-US', ...(ua ? { userAgent: ua } : {}) }); const p = await cx.newPage(); p.on('pageerror', (e) => errs.push(`${k}: ${e.message}`)); return p; };
  const subirLlave = async (p, tipo, nombre, contenido, extra = {}) => {
    sql(`delete from otp_codes where created_at > now() - interval '3 hours' and (phone = '+1${ADM}' or ip in ('127.0.0.1', '::1', '::ffff:127.0.0.1'))`);
    const c = await p.evaluate(async () => (await fetch('/api/admin/llavero/codigo', { method: 'POST' })).json());
    return p.evaluate(async ([tipo, nombre, b64, cod, extra]) => { const f = new FormData(); f.set('tipo', tipo); f.set('codigo', cod); f.set('motivo', 'Prueba 8i de las fichas'); for (const [k, v] of Object.entries(extra)) f.set(k, v); f.set('archivo', new File([Uint8Array.from(atob(b64), (x) => x.charCodeAt(0))], nombre)); return (await fetch('/api/admin/llavero', { method: 'POST', body: f })).json(); }, [tipo, nombre, Buffer.from(contenido).toString('base64'), c.codigoPrueba, extra]);
  };
  // Una entrada de la cuenta de revisión por la API (lo que hace la pantalla de Entrar).
  const pedirRev = async (p, app) => { if (!p.url().startsWith(B)) await p.goto(B + '/ayuda'); limpiarCodigos(REV[app]); return api(p, '/api/cuenta/codigo', { telefono: REV[app] }); };
  const entrarRev = async (p, app, codigo = COD[app]) => { const a = await pedirRev(p, app); const r = await api(p, '/api/cuenta/verificar', { telefono: REV[app], codigo }); return { a, r }; };
  try {
    console.log('1 · /privacidad y /soporte sin sesión');
    for (const w of [390, 1360]) {
      const p = await pagina(`pub${w}`, w);
      await p.goto(B + '/privacidad');
      let t = await texto(p);
      // 9e · El texto sale de docs/legal/us/privacidad.es.md (BORRADOR hasta que el abogado lo revisa); los datos, del inventario como en 8i.
      ok(/BORRADOR · VERSIÓN \d+/.test(t) && /^Privacidad$/.test((await p.locator('h1').first().innerText()).trim()) && /No te rastreamos entre apps ni sitios/.test(t), `${w} · /privacidad sin sesión: borrador con su versión, sin rastreo`);
      const inv = JSON.parse(fs.readFileSync(REPO + '/apps/mobile/inventario-datos.json', 'utf8'));
      ok(await p.locator('[data-dato]').count() === inv.categorias.length && inv.categorias.every((c) => t.includes(c.label.es)), `${w} · la sección de datos sale del inventario (${inv.categorias.length} categorías, cada una con su nombre)`);
      ok(/Mi cuenta › Ajustes › Borrar mi cuenta/.test(t) && await p.locator('a[href="/soporte"]').count() >= 1, `${w} · dónde se borra la cuenta y el enlace a Soporte`);
      await p.screenshot({ path: `${OUT}f8i-privacidad-${w}.png`, fullPage: w === 390 });
      await p.locator('[data-idioma="en"]').first().click(); await p.waitForURL(/l=en/); await p.getByText('Privacy policy').first().waitFor();
      t = await texto(p);
      ok(/DRAFT · VERSION \d+/.test(t) && /The data we use and why/.test(t) && inv.categorias.every((c) => t.includes(c.label.en)), `${w} · en inglés (?l=en), con cada categoría en inglés`);
      await p.goto(B + '/soporte');
      t = await texto(p);
      ok(!/\/entrar/.test(p.url()) && /Soporte|Support/.test(t) && /Escríbenos|Escr[ií]benos|Entrar y enviar|Caso nuevo/i.test(t), `${w} · /soporte sin sesión: cómo escribir a Soporte (${p.url().replace(B, '')})`);
      await p.screenshot({ path: `${OUT}f8i-soporte-${w}.png` });
      await p.context().close();
    }

    console.log('2 · Pro: la web lo ofrece; dentro de Negocios, ninguna pantalla');
    sql(`update feature_flags set enabled = true where key = 'app.revision.cuentas'`);
    const PANT = ['/pagina/resenas', '/pagina/nov', '/pagina/cup', '/eventos', '/compa', '/cobros/plan', '/hoy', '', '/mas'];
    const ofrecePro = (t) => /Ver Pro|See Pro|Volver a Pro|Back to Pro|Seguir con Pro|Keep Pro|\$14\.99|Pro · \$/.test(t);
    const web = await pagina('web-neg', 390);
    ok((await entrarRev(web, 'negocio')).r.ok, 'la cuenta de revisión de Negocios entra con su código (en la web)');
    let webPro = 0;
    for (const r of PANT) { await web.goto(`${B}/panel/revision-tolatino${r}`); await web.waitForLoadState('networkidle'); if (ofrecePro(await texto(web))) webPro++; }
    ok(webPro >= 3, `en la web, el panel ofrece Pro (${webPro} de ${PANT.length} pantallas con «Ver Pro» o el precio)`);
    await web.goto(`${B}/panel/revision-tolatino/cobros/plan`); await web.waitForLoadState('networkidle');
    ok(/Pro · \$14\.99\/mes|Volver a Pro|Pro · \$14/.test(await texto(web)), 'web · Tu plan: comprar Pro ($14.99/mes)');
    await web.screenshot({ path: `${OUT}f8i-plan-web-390.png` });
    const cookiesNeg = await web.context().cookies();
    for (const [plat, w] of [['ios', 390], ['android', 390], ['ios', 1360]]) {
      const p = await pagina(`app-neg-${plat}-${w}`, w, rotulo('negocio', plat));
      await p.context().addCookies(cookiesNeg);
      const con = [];
      for (const r of PANT) { await p.goto(`${B}/panel/revision-tolatino${r}`); await p.waitForLoadState('networkidle'); const t = await texto(p); if (/\/app\//.test(p.url())) con.push(`${r}: ${p.url()}`); if (ofrecePro(t)) con.push(r || '/'); }
      ok(con.length === 0, `Negocios ${plat} ${w} · ninguna de ${PANT.length} pantallas ofrece Pro ni su precio${con.length ? ` (${con.join(', ')})` : ''}`);
      await p.goto(`${B}/panel/revision-tolatino/cobros/plan`); await p.waitForLoadState('networkidle');
      const t = await texto(p);
      ok(/FREE/.test(t) && /Pasar a Free nunca borra nada/.test(t) && !/Volver a Pro/.test(t), `Negocios ${plat} ${w} · Tu plan es solo su estado (FREE)`);
      if (w === 390 || plat === 'ios') await p.screenshot({ path: `${OUT}f8i-plan-app-${plat}-${w}.png` });
      await p.goto(`${B}/panel/revision-tolatino/pagina/nov`); await p.waitForLoadState('networkidle');
      ok(/Publica ofertas y avisos/.test(await texto(p)) && /PRO/.test(await texto(p)) && await boton(p, /Ver Pro/).count() === 0, `Negocios ${plat} ${w} · el aviso PRO se ve, sin botón para comprarlo`);
      if (plat === 'ios' && w === 390) await p.screenshot({ path: `${OUT}f8i-pro-sin-boton-390.png` });
      await p.context().close();
    }
    // El servidor decide: volver a Pro desde la app se rechaza aunque alguien llame la acción (se cambia el user-agent SOLO del POST).
    // 9b-1 · Un negocio recién publicado (con su prueba Pro) hecho para la corrida (antes `barberia-7747`, que solo existía en una base vieja).
    const NTRI = await require('../lib/negocio-nuevo.cjs').publicarBarberia(br), TRI = NTRI.id, TEL_TRI = NTRI.tel;
    if (sql(`select count(*) from subscriptions where business_id = '${TRI}'`) === '0') throw new Error(`${TRI} no tiene su prueba Pro (subscriptions) al publicarse`);
    sql(`update subscriptions set trial_choice = 'no_continue' where business_id = '${TRI}'`);
    const pt = await pagina('trial', 390); await entrar(pt, TEL_TRI);
    await pt.goto(`${B}/panel/${TRI}/cobros/plan`); await pt.waitForLoadState('networkidle');
    ok(/Decidiste no seguir/.test(await texto(pt)) && await boton(pt, 'Seguir con Pro').count() === 1, 'web · prueba con «No seguir»: el botón «Seguir con Pro» (planDeshacer)');
    await pt.route('**/panel/**', (rt) => (rt.request().method() === 'POST' ? rt.continue({ headers: { ...rt.request().headers(), 'user-agent': rotulo('negocio', 'ios') } }) : rt.continue()));
    await boton(pt, 'Seguir con Pro').first().click();
    ok(await espera(async () => /Esto no está disponible en la app/.test(await texto(pt))), 'con el rótulo de la app en el pedido: «Esto no está disponible en la app»');
    ok(sql(`select trial_choice from subscriptions where business_id = '${TRI}'`) === 'no_continue', 'y en la base no cambió nada');
    await pt.unroute('**/panel/**'); await pt.reload(); await pt.waitForLoadState('networkidle');
    await boton(pt, 'Seguir con Pro').first().click();
    ok(await espera(() => sql(`select trial_choice from subscriptions where business_id = '${TRI}'`) === 'none'), 'sin el rótulo (la web): sí vuelve a Pro');
    await pt.context().close();

    console.log('3 · Borrar mi cuenta alcanzable en las cuatro apps (con las cuentas de revisión)');
    const CAMINO = { cliente: ['/cuenta', /^Ajustes/], negocio: ['/panel/revision-tolatino/mas', /^Mi cuenta y ajustes/], delivery: ['/repartidor?t=perfil', /^Idioma y cuenta/], checkin: ['/puerta', /^Mi cuenta y ajustes/] };
    for (const app of ['cliente', 'negocio', 'delivery', 'checkin']) for (const [plat, w] of [['ios', 390], ['android', 1360]]) {
      const p = await pagina(`borrar-${app}-${w}`, w, rotulo(app, plat));
      ok((await entrarRev(p, app)).r.ok, `${app} ${plat} ${w} · entra con su cuenta de revisión`);
      const [ruta, fila] = CAMINO[app];
      await p.goto(B + ruta); await p.waitForLoadState('networkidle');
      const f = p.locator('[role=button], button, a, div').filter({ hasText: fila }).last();
      await f.click();
      ok(await espera(() => /\/cuenta\/ajustes$/.test(new URL(p.url()).pathname)), `${app} ${plat} ${w} · desde ${ruta} se llega a Mi cuenta › Ajustes (dentro de la app)`);
      await p.waitForLoadState('networkidle');
      const borrar = p.getByText(/Borrar mi cuenta|Delete my account/).first();
      if (await borrar.count()) await borrar.click(); else { await p.getByText(/Privacidad|Privacy/).first().click(); await p.waitForLoadState('networkidle'); await p.getByText(/Borrar mi cuenta/).first().click(); }
      ok(await espera(() => /\/cuenta\/ajustes\/borrar$/.test(new URL(p.url()).pathname)) && /Borrar|Delete/.test(await texto(p)), `${app} ${plat} ${w} · Borrar mi cuenta abre dentro de la app`);
      if (w === 390) await p.screenshot({ path: `${OUT}f8i-borrar-${app}-390.png` });
      await p.context().close();
    }
    // 9b-1 · Sin equipo (antes de entrar a uno o después de salir del último) el Repartidor no tiene barra ni Perfil: «Idioma y cuenta» también
    // está ahí. Con la cuenta de revisión fuera de su equipo un momento (se devuelve enseguida, también si algo falla).
    const DRV = `(select id from users where phone = '+1${REV.delivery}')`;
    sql(`update delivery_drivers set status = 'removed' where user_id = ${DRV} and business_id = 'revision-tolatino'`);
    try {
      const p = await pagina('borrar-delivery-sin-equipo', 390, rotulo('delivery', 'ios'));
      await entrarRev(p, 'delivery');
      await p.goto(B + '/repartidor'); await p.waitForLoadState('networkidle');
      ok(/CÓDIGO DEL NEGOCIO|BUSINESS CODE/.test(await texto(p)), 'delivery sin equipo · /repartidor pide el código del negocio (sin barra ni Perfil)');
      await p.screenshot({ path: `${OUT}f8i-repartidor-sin-equipo-390.png`, fullPage: true });
      await p.locator('[role=button], button, a, div').filter({ hasText: /^(Idioma y cuenta|Language and account)/ }).last().click();
      ok(await espera(() => /\/cuenta\/ajustes$/.test(new URL(p.url()).pathname)), 'delivery sin equipo · «Idioma y cuenta» lleva a Mi cuenta › Ajustes (Borrar mi cuenta)');
      await p.context().close();
    } finally { sql(`update delivery_drivers set status = 'active' where user_id = ${DRV} and business_id = 'revision-tolatino'`); }

    console.log('4 · Cuentas de revisión: acotadas');
    const pr = await pagina('rev', 390);
    let x = await pedirRev(pr, 'cliente');
    ok(x.ok && !('codigoPrueba' in x), 'pedir el código: sin SMS y SIN mostrar el código (aunque el sandbox está en modo pruebas)');
    ok(sql(`select channel from otp_codes where phone = '+1${REV.cliente}' order by id desc limit 1`) === 'revision', 'el código queda como huella del canal «revision» (nunca el código)');
    let v = await api(pr, '/api/cuenta/verificar', { telefono: REV.cliente, codigo: '000000' });
    ok(!v.ok && sql(`select l.motivo from review_account_log l join review_accounts r on r.id = l.account_id join users u on u.id = r.user_id where u.phone = '+1${REV.cliente}' order by l.id desc limit 1`) === 'código incorrecto', 'un código malo no entra y queda anotado');
    v = await api(pr, '/api/cuenta/verificar', { telefono: REV.cliente, codigo: COD.cliente });
    ok(v.ok, 'el código fijo entra');
    ok(!(await entrarRev(pr, 'cliente', COD.negocio)).r.ok, 'el código de OTRA cuenta de revisión no sirve para esta (solo ese número)');
    const otro = await pagina('otro', 390); await otro.goto(B + '/ayuda'); limpiarCodigos('5705559911');
    const xo = await api(otro, '/api/cuenta/codigo', { telefono: '5705559911' }), vo = await api(otro, '/api/cuenta/verificar', { telefono: '5705559911', codigo: COD.cliente });
    ok(xo.codigoPrueba && (!vo.ok || xo.codigoPrueba === COD.cliente), 'un número cualquiera no entra con un código fijo (solo con el suyo)');
    await otro.context().close();
    // No paga con tarjeta: guardarla la rechaza el servidor y la base.
    const uid = sql(`select id from users where phone = '+1${REV.cliente}'`);
    ok(/revision_acotada: una cuenta de revisión no paga con tarjeta/.test(sqlFalla(`insert into payment_methods (user_id, stripe_pm_id, brand, last4, exp, simulated) values ('${uid}', 'pm_sim_visa_4242_0000aaaa', 'visa', '4242', '12/30', true)`) ?? ''), 'la base no le deja guardar una tarjeta');
    // La pasarela: comprar un boleto con una tarjeta nueva (sin guardar) → la pasarela lo frena y lo anota; guardarla → el servidor lo rechaza.
    const pagarBoleto = async (guardar) => {
      // 9b-1 · El evento de la semilla por su título (antes el slug «…-2», la fecha 1 y el tipo 15 de una base vieja).
      const EV = sql(`select e.slug || '|' || (select d.id from event_dates d where d.event_id = e.id and d.status = 'scheduled' and d.listable and d.starts_at > now() order by d.starts_at limit 1) || '|' || (select t.id from ticket_types t where t.event_id = e.id order by t.id limit 1) from events e where e.title->>'es' = 'Jueves de Bachata en Vivo' and e.status = 'live' order by e.id limit 1`).split('|');
      await pr.goto(B + `/eventos/${EV[0]}/boletos?fecha=${EV[1]}`); await pr.waitForLoadState('networkidle');
      await pr.locator(`[data-tipo="${EV[2]}"] >> text="+"`).first().click();
      await boton(pr, 'Continuar').filter({ visible: true }).first().click(); await pr.waitForURL(/\/eventos\/pagar\//, { timeout: 20000 });
      await pr.getByText(/^(Elegir|Choose|Tu tarjeta)$/).filter({ visible: true }).first().click();
      const add = pr.getByText('Agregar tarjeta de crédito o débito'); if (await add.count()) await add.click();
      const campo = (ac, v) => pr.locator(`input[autocomplete="${ac}"]`).filter({ visible: true }).first().pressSequentially(v, { delay: 10 });
      await campo('cc-number', '4242424242424242'); await campo('cc-exp', '1230'); await campo('cc-csc', '123'); await campo('postal-code', '18201'); await campo('cc-name', 'Revision Tolatino');
      const sw = pr.locator('[role=switch][aria-checked]').filter({ visible: true }).last();
      if (await sw.count() && (await sw.getAttribute('aria-checked')) !== String(guardar)) await sw.click();
      const falta = await pr.getByText(/^Falta: /).filter({ visible: true }).first().innerText().catch(() => ''); if (falta) console.log('    (formulario)', falta);
      await boton(pr, /^Usar esta tarjeta$/).filter({ visible: true }).first().click();
      if (!guardar) { await espera(async () => await boton(pr, /^Pagar \$/).count() > 0); await boton(pr, /^Pagar \$/).filter({ visible: true }).first().click(); }
      return espera(async () => /cuenta de revisión/.test(await texto(pr)), 20000);
    };
    ok(await pagarBoleto(true), 'guardar la tarjeta: «Esta es una cuenta de revisión: no guarda tarjetas…»');
    ok(await pagarBoleto(false), 'pagar con una tarjeta sin guardar: «Esta es una cuenta de revisión: no paga con tarjeta…» (la pasarela)');
    await pr.screenshot({ path: `${OUT}f8i-revision-no-paga-390.png` });
    ok(sql(`select count(*) from review_account_log where kind = 'pago_bloqueado'`) === '1' && sql(`select count(*) from payment_methods where user_id = '${uid}'`) === '0' && sql(`select count(*) from sim_intents where card like 'pm_sim_visa_4242%' and created_at > now() - interval '2 minutes'`) === '0', 'anotado como pago bloqueado; ni tarjeta guardada ni cobro en el simulador');
    // Ve solo lo suyo: el negocio de revisión está oculto para todos y su panel es solo ese negocio.
    const anon = await pagina('anon', 390);
    const rn = await anon.goto(B + '/n/revision-tolatino'); const tn = await texto(anon);
    ok(rn.status() === 404 || /no existe|No encontramos|not found/i.test(tn), `el negocio de revisión no se ve en su página (${rn.status()})`);
    await anon.goto(B + '/buscar?q=Revisi%C3%B3n'); ok(!/To’Latino Revisión|To'Latino Revisión/.test(await texto(anon)), 'ni en Buscar');
    await anon.context().close();
    const pn = await pagina('rev-neg', 390, rotulo('negocio', 'ios'));
    ok((await entrarRev(pn, 'negocio')).r.ok, 'Negocios (revisión) entra');
    await pn.goto(B + '/panel'); await pn.waitForLoadState('networkidle');
    ok(/\/panel\/revision-tolatino/.test(pn.url()) || ((await texto(pn)).includes('To’Latino Revisión') && !(await texto(pn)).includes('Sabor Dominicano')), `su panel es solo el negocio de revisión (${pn.url().replace(B, '')})`);
    // Desactivar la cuenta (Super Admin) → su código deja de servir, también uno ya pedido.
    const pa = await pagina('admin', 1360); await entrar(pa, ADM);
    await pa.goto(B + '/admin/sistema/apps?v=fichas'); await pa.waitForLoadState('networkidle');
    let t = await texto(pa);
    ok(/CUENTAS DE REVISIÓN DE APPLE Y GOOGLE/.test(t) && /ENCENDIDAS/.test(t) && /secreto REVISION_CODIGO_NEGOCIO presente/.test(t) && !t.includes(COD.negocio), 'Fichas y revisión: las cuatro cuentas, el interruptor y el secreto presente (nunca el código)');
    await pa.screenshot({ path: `${OUT}f8i-fichas-1360.png`, fullPage: true });
    const prePedido = await pedirRev(pr, 'negocio'); ok(prePedido.ok, 'la cuenta de Negocios pide su código (queda vigente)');
    const fila = pa.locator('div').filter({ hasText: /^Negocios · \(•••\) •••-0182/ }).last();
    await pa.locator('[role=switch], button[aria-pressed], input[type=checkbox]').nth(2).click().catch(async () => { await fila.click(); });
    ok(await espera(async () => /Desactivar la cuenta de revisión de Negocios/.test(await texto(pa))), 'desactivar pide motivo');
    await boton(pa, 'Terminó la revisión').click().catch(() => {});
    if (await pa.locator('textarea, input[type=text]').count()) await pa.locator('textarea, input[type=text]').last().fill('Terminó la revisión de prueba 8i');
    await boton(pa, 'Desactivar').last().click();
    ok(await espera(() => sql(`select active from review_accounts where app = 'negocio'`) === 'f'), 'desactivada (con motivo y auditoría)');
    ok(sql(`select count(*) from audit_entries where action = 'revision.desactivar'`) === '1', 'en la auditoría');
    v = await api(pr, '/api/cuenta/verificar', { telefono: REV.negocio, codigo: COD.negocio });
    ok(!v.ok, 'el código que ya había pedido deja de servir al desactivarla');
    x = await pedirRev(pr, 'negocio');
    ok(x.codigoPrueba && x.codigoPrueba !== undefined, 'desactivada: el número sigue el camino normal (aquí, el código del modo pruebas al azar)');
    v = await api(pr, '/api/cuenta/verificar', { telefono: REV.negocio, codigo: COD.negocio });
    ok(!v.ok || x.codigoPrueba === COD.negocio, 'y el código fijo ya no entra');
    sql(`update review_accounts set active = true where app = 'negocio'`);
    // El interruptor apagado (Super Admin) → ningún código fijo sirve.
    await pa.reload(); await pa.waitForLoadState('networkidle');
    await pa.locator('[role=switch], button[aria-pressed], input[type=checkbox]').first().click();
    ok(await espera(async () => /Apagar las cuentas de revisión/.test(await texto(pa))), 'apagar el interruptor pide motivo');
    if (await pa.locator('textarea, input[type=text]').count()) await pa.locator('textarea, input[type=text]').last().fill('Prueba 8i: apagar');
    await boton(pa, 'Apagar').last().click();
    ok(await espera(() => sql(`select enabled from feature_flags where key = 'app.revision.cuentas'`) === 'f'), 'interruptor apagado (auditado)');
    ok(!(await entrarRev(pr, 'delivery')).r.ok, 'con el interruptor apagado, el código fijo no entra');
    ok(/interruptor apagado/.test(sql(`select string_agg(motivo, ',') from review_account_log where kind = 'rechazado'`)), 'y se anota por qué');
    sql(`update feature_flags set enabled = true where key = 'app.revision.cuentas'`);
    await pr.context().close(); await pn.context().close();

    console.log('5 · Super Admin: Fichas y revisión, Lo que te toca, Declaraciones, Analítica › Apps');
    await pa.goto(B + '/admin/sistema/apps?v=fichas'); await pa.waitForLoadState('networkidle');
    t = await texto(pa);
    ok(/FICHAS AL DÍA/.test(t) && (t.match(/SIN SUBIR/g) ?? []).length === 16 && /App Store Connect · llave de la API/.test(t), 'las 16 fichas sin subir y las llaves que faltan');
    await boton(pa, 'Subir como borrador').click();
    await pa.getByText('Las cuatro', { exact: true }).click().catch(() => {});
    if (await pa.locator('textarea, input[type=text]').count()) await pa.locator('textarea, input[type=text]').last().fill('Primera subida de prueba 8i');
    await boton(pa, 'Subir').last().click();
    ok(await espera(async () => /sin llave/.test(await texto(pa))), 'sin llaves: «sin llave» en las dos tiendas y nada se toca');
    ok(sql(`select count(*) from store_listings`) === '0' && asc.registro.length === 0 && play.registro.length === 0, 'ninguna llamada a las tiendas');
    ok((await subirLlave(pa, 'asc_api_key', `AuthKey_${KID}.p8`, kp.privateKey.export({ type: 'pkcs8', format: 'pem' }), { emisor: EMISOR })).ok, 'la llave de App Store Connect al llavero');
    ok((await subirLlave(pa, 'play_service_account', 'play.json', JSON.stringify(cuenta.json))).ok, 'la cuenta de servicio de Play al llavero');
    await pa.goto(B + '/admin/sistema/apps?v=fichas'); await pa.waitForLoadState('networkidle');
    await boton(pa, 'Subir como borrador').click();
    await pa.getByText('Las cuatro', { exact: true }).click().catch(() => {});
    if (await pa.locator('textarea, input[type=text]').count()) await pa.locator('textarea, input[type=text]').last().fill('Primera subida de prueba 8i');
    await boton(pa, 'Subir').last().click();
    ok(await espera(() => sql(`select count(*) from store_listings`) === '16', 30000), 'con llaves: las 16 fichas copiadas en store_listings');
    ok(sql(`select count(*) from store_listings where result = 'borrador'`) === '16', `las 16 como borrador (${sql(`select string_agg(distinct coalesce(detail, ''), ' | ') from store_listings`)})`);
    const FJ = JSON.parse(fs.readFileSync(REPO + '/apps/mobile/tiendas/fichas.json', 'utf8'));
    ok(FJ.fichas.every((f) => sql(`select count(*) from store_listings where app = '${f.app}' and sha256 = '${f.sha256}'`) === '2'), 'cada copia lleva la huella del .md del repo');
    ok([...asc.locV.values()].length === 8 && [...asc.locI.values()].length === 8 && [...asc.edad.keys()].length === 4, 'App Store Connect: 8 localizaciones de versión, 8 de la app y la clasificación de las 4');
    const det = [...asc.detalle.values()];
    ok(det.length === 4 && det.every((d) => d.attrs.demoAccountRequired === true) && det.some((d) => d.attrs.demoAccountName === REV.negocio && d.attrs.demoAccountPassword === COD.negocio), 'las notas para la revisión con la cuenta de revisión de cada app (el código va SOLO a Apple)');
    ok(!asc.registro.some((r) => /Submission/.test(r.ruta)) && asc.registro.filter((r) => !r.control && r.invalido && ![404, 409].includes(r.status)).length === 0, 'Apple: cada pedido en la especificación y ninguno de envío a revisión');
    ok(APPS.apps.every((a) => play.fichas.get(a.android)?.sinRevision.every(Boolean) && play.fichas.get(a.android)?.listings['es-US']), 'Google: las 4 fichas confirmadas con changesNotSentForReview=true');
    await pa.reload(); await pa.waitForLoadState('networkidle'); t = await texto(pa);
    ok((t.match(/AL DÍA/g) ?? []).length === 17 && /16 de 16/.test(t) && !/SIN SUBIR|CAMBIÓ/.test(t), 'Fichas: las 16 AL DÍA (y la cifra «16 de 16»)');
    await pa.screenshot({ path: `${OUT}f8i-fichas-subidas-1360.png`, fullPage: true });
    // Lo que te toca
    await pa.goto(B + '/admin/sistema/apps?v=toca'); await pa.waitForLoadState('networkidle'); t = await texto(pa);
    ok(/PAQUETE 8-0 · EL DOMINIO/.test(t) && /PAQUETE 8-3 · LAS DECLARACIONES/.test(t) && /no contesta por https/.test(t), 'Lo que te toca: los cuatro paquetes; el dominio dice por qué no está (sin HTTPS)');
    ok(/8-2\.1 · Llave de la API de App Store Connect[^]*?La llave está en el llavero\./.test(t) && /HECHO/.test(t), 'la llave subida se ve HECHO (lo dice el sistema)');
    ok(/correo: tuberia@tolatino-prueba\.iam\.gserviceaccount\.com/.test(t) && await boton(pa, 'Copiar').count() >= 1, '8-2.6: el correo de la cuenta de servicio con «Copiar» (el choque con «nada de copiar», dicho)');
    ok(await boton(pa, 'Abrir').count() >= 20, 'cada paso con su botón a la consola');
    await boton(pa, 'Ya lo hice').first().click();
    if (await pa.locator('textarea, input[type=text]').count()) await pa.locator('textarea, input[type=text]').last().fill('Hecho desde el teléfono');
    await boton(pa, 'Marcar hecho').last().click();
    ok(await espera(() => sql(`select count(*) from founder_steps where state = 'hecho'`) === '1'), 'marcar un paso a mano (founder_steps + auditoría)');
    await pa.screenshot({ path: `${OUT}f8i-toca-1360.png`, fullPage: true });
    // Declaraciones
    for (const w of [1360, 390]) {
      const p = w === 1360 ? pa : await pagina('adm390', 390); if (w === 390) await entrar(p, ADM);
      await p.goto(B + '/admin/sistema/apps?v=declaraciones&app=delivery'); await p.waitForLoadState('networkidle'); t = await texto(p);
      ok(/Data Used to Track You/.test(t) && /Data Linked to You · Location · Precise Location/.test(t) && /Precise location/.test(t) && /de dónde: inventario/.test(t), `${w} · Declaraciones (Repartidor): cada pregunta como la escribe Apple o Google, la respuesta y de dónde sale`);
      ok(/Foreground service \(Repartidor\)/.test(t) && /Target audience/.test(t), `${w} · y las de IARC y Play Console`);
      await p.screenshot({ path: `${OUT}f8i-declaraciones-${w}.png`, fullPage: w === 390 });
    }
    const csv = await pa.evaluate(async () => { const r = await fetch('/api/admin/tiendas/data-safety?app=cliente'); return { s: r.status, ct: r.headers.get('content-type'), t: await r.text() }; });
    ok(csv.s === 200 && /text\/csv/.test(csv.ct) && csv.t.startsWith('Question ID (machine readable)') && /PSL_PHONE/.test(csv.t), 'el CSV de Data safety para Play Console');
    const anonCsv = await (await br.newContext()).request.get(B + '/api/admin/tiendas/data-safety?app=cliente');
    ok(anonCsv.status() === 403, 'sin ser del equipo → 403');
    // Analítica › Apps
    await pa.goto(B + '/admin/analitica?tab=apps'); await pa.waitForLoadState('networkidle'); t = await texto(pa);
    ok(/INSTALACIONES ACTIVAS · 7 D/.test(t) && /AVISOS: ACEPTADOS Y NEGADOS/.test(t) && /ERRORES POR SESIÓN/.test(t) && /nunca quién usa qué app/.test(t), 'Analítica › Apps: instalaciones, versiones, avisos, errores por sesión, sin personas');
    ok(!/\+1484|\(484\)|484-555/.test(t), 'ningún teléfono en Analítica › Apps');
    await pa.screenshot({ path: `${OUT}f8i-analitica-1360.png`, fullPage: true });
    // Configuración › Apps: las claves nuevas con su tope
    await pa.goto(B + '/admin/sistema/configuracion?s=apps'); await pa.waitForLoadState('networkidle'); t = await texto(pa);
    ok(/Cuentas de revisión · códigos por hora/.test(t) && /Fichas · subidas a las tiendas por día/.test(t), 'Configuración › Apps: los topes de las cuentas de revisión y de las fichas');
    ok(errs.length === 0, `sin errores de JavaScript en las páginas (${errs.join(' | ').slice(0, 300)})`);
  } finally {
    limpiarTiendas();
    sql(`update business_stats_cache set plan = 'pro' where business_id = 'revision-tolatino'`);
    sql(`update review_accounts set active = true`); sql(`update feature_flags set enabled = false where key = 'app.revision.cuentas'`);
    sql(`delete from otp_codes where channel = 'revision'`);
    await asc.cerrar(); await play.cerrar(); await br.close();
  }
  console.log(`\n${n} comprobaciones · fich8i`);
})().catch((e) => { console.error(e); process.exit(1); });
