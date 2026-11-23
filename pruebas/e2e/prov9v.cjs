// 23 nov · Las llaves de los proveedores en el llavero (Super Admin › Sistema › Integraciones › Proveedores; lib/llaves-proveedores.ts): pegar una llave
// (el código otra vez; el campo no muestra lo escrito), la forma y el entorno revisados en el servidor (una llave REAL de Stripe no entra en pruebas),
// solo la huella vuelve (HTML, RSC, respuestas, auditoría, base cifrada), el LECTOR la entrega a una pantalla de cobro (la llave pública de Stripe en
// el pago de un viaje) sin una consulta por petición, rotar (la nueva se usa al instante; la anterior, retirada), «Probar» (anotado con la huella,
// nunca el valor), retirar (deja de usarse), Salud dice de dónde viene cada una, y cualquier otro rol → 403. Teléfono 390 y escritorio 1360.
// 23 nov (§11) · «Probar» contra su contraparte (scripts/proveedores-sim: Stripe, Telnyx y Meta; el servidor las llama por STRIPE_API_BASE, TELNYX_API_BASE y
// WHATSAPP_API_BASE de servir.sh): la llave buena SIRVE, la mala es RECHAZADA, el simulador vio la llamada firmada con ESA llave (huellas, nunca el valor),
// Salud dice «probada» / «la prueba falló» y «Lo que te toca» sigue pendiente (este entorno usa el simulador). SES y Anthropic no tienen contraparte (LAUNCH).
const ENT = require('../lib/entorno.cjs'); // rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process'); const fs = require('fs'); const crypto = require('crypto');
const S = ENT.S, OUT = S + '/cap/', B = ENT.B;
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql(`delete from otp_codes`); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const boton = (p, t) => p.locator('button, [role=button]').filter({ hasText: t instanceof RegExp ? t : new RegExp(`^${t}$`) });
const ADM = '5705550199', DAYANA = '5705550677', V = 'van-express-nyc';
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';
const KINDS = "('stripe_secret_key','stripe_publishable_key','stripe_webhook_secret','telnyx_api_key','telnyx_public_key','telnyx_from','whatsapp_app_secret','whatsapp_verify_token','whatsapp_token','whatsapp_waba_id','ses_access_key_id','ses_secret_access_key','correo_sns_tema','anthropic_api_key')";
const limpiar = () => sql(`set session_replication_role = replica; delete from store_secret_reads where secret_id in (select id from store_secrets where kind in ${KINDS}); delete from store_secrets where kind in ${KINDS}; delete from store_secret_checks`);
const SIMPROV = require('../../scripts/proveedores-sim/sim.cjs');
const sha = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');
const corta = (h) => `${h.slice(0, 16).replace(/(.{4})(?=.)/g, '$1 ')} … ${h.slice(-4)}`;
const al = (n) => crypto.randomBytes(n).toString('base64').replace(/[^A-Za-z0-9]/g, '').padEnd(n, 'x').slice(0, n);
// La forma del lector: cuántas veces se leyó store_secrets (pg_stat_user_tables: lecturas por índice y secuenciales).
const lecturasTabla = () => Number(sql(`select pg_stat_force_next_flush(); select coalesce(seq_scan, 0) + coalesce(idx_scan, 0) from pg_stat_user_tables where relname = 'store_secrets'`).split('\n').pop());

(async () => {
  const T0 = sql(`select now()::text`);
  limpiar();
  process.on('exit', () => { try { limpiar(); } catch { /* sin base */ } });
  // Las contrapartes de «Probar» (el servidor las llama por las tres direcciones de servir.sh). Sin llaves aceptadas: todo lo que llegue es 401.
  const SIM = await SIMPROV.iniciar({ stripe: ENT.P.provStripe, telnyx: ENT.P.provTelnyx, meta: ENT.P.provMeta });
  const SVC = sql(`select id from items where business_id = '${V}' and name->>'es' = 'Hazleton → Washington Heights' and removed_at is null order by id limit 1`);
  ok(/^\d+$/.test(SVC), `el viaje de ${V} para ver la llave pública en el pago (${SVC})`);
  const br = await chromium.launch(), errs = [];
  const pagina = async (k, w, ua) => { const cx = await br.newContext({ viewport: { width: w, height: w > 500 ? 900 : 844 }, deviceScaleFactor: w > 500 ? 1 : 2, userAgent: ua, locale: 'es-US' });
    const p = await cx.newPage(); p.on('pageerror', (e) => errs.push(`${k}: ${e.message}`)); return p; };
  const pa = await pagina('adm', 1360, MAC); await entrar(pa, ADM);
  const respuestas = [];
  pa.on('response', async (r) => { try { if (r.request().resourceType() !== 'image') respuestas.push(await r.text()); } catch { /* sin cuerpo */ } });
  const lista = async () => { await pa.goto(B + '/admin/sistema/integraciones?tab=proveedores'); await pa.getByText(/STRIPE · COBROS CON TARJETA · \d DE 3/).waitFor({ timeout: 20000 }); };
  const pkEnPago = async () => { const r = await pa.evaluate(async (u) => (await fetch(u, { headers: { rsc: '1' } })).text(), `/n/${V}/viaje?s=${SVC}`); return r; };
  const pedirCodigo = async () => {
    sql(`delete from otp_codes where purpose in ('login', 'llavero')`); // el límite por teléfono (30 s) y por IP de la hora: esta prueba pide varios
    await pa.getByText('Mandar el código', { exact: true }).click(); await pa.getByText(/MODO PRUEBAS · tu código es \d{6}/).waitFor();
    return /tu código es (\d{6})/.exec(await texto(pa))[1];
  };
  const pegar = async (valor, motivo) => {
    await pa.locator('input[type=password]').fill(valor);
    await pa.getByRole('textbox', { name: 'MOTIVO (QUEDA EN LA AUDITORÍA)' }).fill(motivo);
    await boton(pa, 'Guardar en el llavero').click();
  };

  console.log('1 · La pestaña Proveedores: cada llave con su origen (el entorno del servidor local trae algunas); nada que no sea huella');
  await lista();
  let T = await texto(pa);
  ok(T.includes('STRIPE · COBROS CON TARJETA · 1 DE 3') && T.includes('llega por el entorno del servidor'), 'Stripe: 1 de 3 (la firma de los avisos llega por el entorno del servidor de pruebas)');
  ok(T.includes('Stripe · llave pública') && T.includes('Falta · se pega'), 'la llave pública de Stripe: Falta · se pega');
  await pa.screenshot({ path: OUT + 'v-proveedores-vacio-1360.png', fullPage: true });
  ok(!(await pkEnPago()).includes('pk_test_'), 'antes: el pago del viaje no trae ninguna llave pública de Stripe');

  console.log('2 · Pegar la llave pública: el código otra vez, el campo oculto, la forma y el entorno en el servidor');
  await pa.getByText('Poner la llave', { exact: true }).nth(4).click(); // Telnyx (3 filas) y después Stripe: secreta, PÚBLICA
  await pa.getByText('Stripe · llave pública').first().waitFor();
  ok((await texto(pa)).includes('Aquí va la llave de PRUEBA (test)'), 'la hoja dice que en este entorno va la llave de prueba');
  const cod = await pedirCodigo();
  await pa.getByRole('textbox', { name: 'CÓDIGO DE 6 NÚMEROS' }).fill(cod);
  ok(await pa.locator('input[type=password][data-oculto="1"]').count() === 1 && await pa.locator('input[type=password]').getAttribute('autocomplete') === 'off', 'el campo de la llave es de tipo contraseña, sin autocompletar');
  await pa.screenshot({ path: OUT + 'v-pegar-1360.png', fullPage: true });
  const LIVE = 'pk_live_' + al(30);
  await pegar(LIVE, 'Llave pública de prueba 9v');
  await pa.getByText('Es una llave REAL de Stripe: en el sandbox va la de prueba (test).').waitFor();
  ok(sql(`select count(*) from store_secrets where kind = 'stripe_publishable_key'`) === '0', 'una llave REAL de Stripe no entra en pruebas (y no se gasta el código)');
  await pegar('pk_test_ con espacio', 'Llave pública de prueba 9v');
  await pa.getByText('La llave no lleva espacios ni saltos de línea: cópiala otra vez, completa.').waitFor();
  await pegar('sk_test_' + al(30), 'Llave pública de prueba 9v');
  await pa.getByText(/No es una llave pública de Stripe \(empieza con pk_\)/).waitFor();
  ok(true, 'mal formada o del tipo equivocado: el mensaje dice qué falta, sin repetir lo pegado');
  const PK1 = 'pk_test_' + al(40);
  await pegar(PK1, 'Llave pública de prueba 9v');
  await pa.getByText(/STRIPE · COBROS CON TARJETA · 2 DE 3/).waitFor({ timeout: 20000 });
  T = await texto(pa);
  ok(T.includes(`v1 · SHA-256 ${corta(sha(PK1))}`) && T.includes('de prueba'), `guardada: se ve su huella (${corta(sha(PK1))}) y que es de prueba`);
  ok(sql(`select fingerprint || '|' || (meta->>'modo') || '|' || substr(encode(blob_enc, 'escape'), 1, 4) from store_secrets where kind = 'stripe_publishable_key' and retired_at is null`) === `${sha(PK1)}|prueba|TLK1`, 'la base guarda la huella y el sobre cifrado (TLK1…)');
  ok(sql(`select position(convert_to('${PK1}', 'UTF8') in blob_enc) from store_secrets where kind = 'stripe_publishable_key'`) === '0', 'en la base nunca el texto');
  await pa.screenshot({ path: OUT + 'v-proveedores-1360.png', fullPage: true });

  console.log('3 · Nunca vuelve: HTML, RSC, respuestas y auditoría');
  const html = await pa.content(), rsc = await pa.evaluate(async () => (await fetch('/admin/sistema/integraciones?tab=proveedores', { headers: { rsc: '1' } })).text());
  ok(!html.includes(PK1) && !html.includes(LIVE) && rsc.length > 1000 && !rsc.includes(PK1), 'ni el HTML ni el RSC de la pantalla traen la llave');
  ok(!respuestas.some((x) => x.includes(PK1) || x.includes(LIVE)), `ninguna respuesta del Super Admin trae lo pegado (${respuestas.length} respuestas)`);
  ok(sql(`select count(*) from audit_entries where action = 'llavero.subir' and after->>'huella' = '${sha(PK1).slice(0, 16)}' and at >= '${T0}'`) === '1'
    && sql(`select count(*) from audit_entries where at >= '${T0}' and (coalesce(after::text, '') || coalesce(before::text, '') || coalesce(reason, '')) like '%pk_%'`) === '0', 'la auditoría dice la huella, nunca la llave');

  console.log('4 · El lector la entrega: la llave pública en el pago del viaje, sin consultar la base en cada petición');
  ok((await pkEnPago()).includes(PK1), 'el pago del viaje trae la llave pública que se pegó (el lector la tomó del llavero)');
  // La medida, con su control: los procesos de la app pasan sus cifras a pg_stat cuando quedan libres (hasta ~10 s después). Primero, 15 veces la
  // pantalla del llavero (que SÍ lee store_secrets) tiene que contar; después, 15 pagos no.
  const espera = () => new Promise((r) => setTimeout(r, 12000)); // ESPERA-FIJA: las cifras de pg_stat de otro proceso llegan hasta ~10 s después
  await espera(); const c0 = lecturasTabla();
  for (let i = 0; i < 15; i++) await pa.evaluate(async () => (await fetch('/admin/sistema/integraciones?tab=proveedores', { headers: { rsc: '1' } })).text());
  await espera(); const c1 = lecturasTabla();
  ok(c1 - c0 >= 15, `control: 15 veces la pantalla del llavero = ${c1 - c0} lecturas de store_secrets (la medida cuenta)`);
  const l0 = c1;
  for (let i = 0; i < 15; i++) await pkEnPago();
  await espera(); const l1 = lecturasTabla();
  ok(l1 - l0 === 0, `15 pagos seguidos: ${l1 - l0} lecturas de store_secrets (la llave vive en la memoria del proceso)`);
  ok(sql(`select count(*) from store_secret_reads r join store_secrets s on s.id = r.secret_id where s.kind = 'stripe_publishable_key' and r.purpose like 'proveedores:%'`) === '1', 'el proceso anotó UNA lectura al abrir esa versión (no una por petición)');

  console.log('5 · Rotar: la nueva se usa al instante; la anterior queda retirada');
  await pa.getByText('Rotar', { exact: true }).first().click(); await pa.getByText('Stripe · llave pública').first().waitFor();
  await new Promise((r) => setTimeout(r, 31000)); // ESPERA-FIJA: otro código al mismo teléfono solo se manda 30 s después del anterior (como al entrar)
  const cod2 = await pedirCodigo(); await pa.getByRole('textbox', { name: 'CÓDIGO DE 6 NÚMEROS' }).fill(cod2);
  const PK2 = 'pk_test_' + al(40);
  await pegar(PK2, 'Rotación de prueba 9v');
  await pa.getByText(/Reemplazada por la versión 2/).first().waitFor({ timeout: 20000 });
  T = await texto(pa);
  ok(T.includes(`v2 · SHA-256 ${corta(sha(PK2))}`) && T.includes('RETIRADAS · 180 DÍAS'), 'rotar: la v2 viva, la v1 retirada con su motivo');
  ok(sql(`select count(*) from key_rotations where key_name = 'stripe_publishable_key' and old_fp = '${sha(PK1)}' and new_fp = '${sha(PK2)}'`) === '1', 'la rotación queda anotada con la huella vieja y la nueva');
  const pg2 = await pkEnPago();
  ok(pg2.includes(PK2) && !pg2.includes(PK1), 'el pago trae la nueva y ya no la vieja (el aviso de la base olvidó la copia)');

  console.log('6 · Probar: la llave que se usa hoy, contra su proveedor; anotado sin el valor');
  ok(await pa.getByText('Probar', { exact: true }).count() === 0, 'la llave pública no tiene «Probar» (no hay una lectura que la use sin mandar nada)');
  await pa.getByText('Poner la llave', { exact: true }).first().click(); await pa.getByText('Telnyx · llave de la API').first().waitFor(); // Telnyx · llave de la API
  await new Promise((r) => setTimeout(r, 31000)); // ESPERA-FIJA: otro código al mismo teléfono solo se manda 30 s después del anterior
  const cod3 = await pedirCodigo(); await pa.getByRole('textbox', { name: 'CÓDIGO DE 6 NÚMEROS' }).fill(cod3);
  const TK = 'KEY' + al(48);
  await pegar(TK, 'Llave de Telnyx de prueba 9v');
  await pa.getByText(/TELNYX · SMS \(EL CÓDIGO PARA ENTRAR\) · 2 DE 3/).waitFor({ timeout: 20000 });
  await pa.getByText('Probar', { exact: true }).first().click();
  await pa.getByText(/El proveedor no aceptó la llave|El proveedor no contestó|El proveedor contestó con un error|La llave sirve/).first().waitFor({ timeout: 20000 });
  const pr = sql(`select fingerprint || '|' || source || '|' || ok::text || '|' || result from store_secret_checks where kind = 'telnyx_api_key' order by id desc limit 1`).split('|');
  ok(pr[0] === sha(TK) && pr[1] === 'llavero' && /^(sirve|rechazada|sin_permiso|sin_conexion|http_\d{3})$/.test(pr[3]), `Probar: anotado con la huella de la llave en uso, de dónde vino y el resultado (${pr[2]}, ${pr[3]})`);
  ok(sql(`select count(*) from audit_entries where action = 'llavero.probar' and after->>'huella' = '${sha(TK).slice(0, 16)}'`) === '1' && sql(`select count(*) from audit_entries where at >= '${T0}' and coalesce(after::text, '') like '%${TK.slice(3, 20)}%'`) === '0', 'la auditoría de la prueba lleva la huella, nunca la llave');
  ok(!(await pa.content()).includes(TK) && !respuestas.some((x) => x.includes(TK)), 'la llave de Telnyx tampoco vuelve en ninguna respuesta');

  console.log('7 · Salud y Lo que te toca: de dónde viene cada una, sin valores');
  await pa.goto(B + '/admin/sistema/salud'); await pa.getByText('PROVEEDORES · SUS LLAVES (SIN VALORES)').waitFor({ timeout: 20000 });
  T = await texto(pa);
  ok(T.includes('2 de 3 llaves · 1 del llavero · 1 del entorno'), 'Salud: Stripe, 2 de 3 llaves, una del llavero y otra del entorno');
  ok(!T.includes(PK2) && !T.includes(TK), 'Salud no muestra ninguna llave');
  await pa.screenshot({ path: OUT + 'v-salud-1360.png', fullPage: true });

  console.log('8 · Retirar: deja de usarse al instante');
  await lista();
  await pa.getByText('Retirar', { exact: true }).nth(1).click(); // Telnyx (la primera viva), Stripe pública (la segunda)
  await pa.getByText(/Retirar Stripe · llave pública/).first().waitFor();
  await pa.getByText('Ya no se usa', { exact: true }).first().click(); await boton(pa, 'Retirar').last().click();
  await pa.getByText(/versión 2 retirada/).first().waitFor({ timeout: 20000 });
  ok(sql(`select count(*) from store_secrets where kind = 'stripe_publishable_key' and retired_at is null`) === '0', 'retirada: ninguna viva');
  ok(!(await pkEnPago()).includes(PK2), 'el pago ya no trae la llave retirada');

  console.log('9 · Teléfono 390');
  const pt = await pagina('tel', 390, IOS); await entrar(pt, ADM);
  await pt.goto(B + '/admin/sistema/integraciones?tab=proveedores'); await pt.getByText(/STRIPE · COBROS CON TARJETA · \d DE 3/).waitFor({ timeout: 20000 });
  ok(await pt.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'a 390: sin desborde horizontal');
  await pt.screenshot({ path: OUT + 'v-proveedores-390.png', fullPage: true });
  await pt.getByText('Poner la llave', { exact: true }).nth(1).click(); await pt.getByText('Mandar el código', { exact: true }).waitFor();
  await pt.screenshot({ path: OUT + 'v-pegar-390.png', fullPage: true });
  await pt.context().close();

  console.log('10 · Cualquier otro rol: 403');
  const px = await pagina('soporte', 1360, MAC); await entrar(px, DAYANA);
  const st = await px.evaluate(async () => { const f = new FormData(); f.set('tipo', 'stripe_publishable_key'); f.set('codigo', '123456'); f.set('motivo', 'intento'); f.set('valor', 'pk_test_' + 'a'.repeat(30)); return (await fetch('/api/admin/llavero', { method: 'POST', body: f })).status; });
  ok(st === 403, 'Soporte: poner una llave de proveedor → 403');
  await px.goto(B + '/admin/sistema/integraciones?tab=proveedores'); await px.waitForLoadState('networkidle');
  T = await texto(px);
  ok(!T.includes('STRIPE · COBROS CON TARJETA'), 'Soporte: no ve la pestaña Proveedores');
  await px.context().close();

  console.log('11 · Probar contra su contraparte: sirve, rechazada, la huella que vio el proveedor, Salud y «Lo que te toca»');
  const pegarApi = async (tipo, valor, motivo) => { // lo mismo que la pantalla (código al teléfono + la llave + el motivo), sin pasar por los campos
    sql(`delete from otp_codes where purpose in ('login', 'llavero')`);
    const c = await pa.evaluate(async () => (await fetch('/api/admin/llavero/codigo', { method: 'POST' })).json());
    const r = await pa.evaluate(async ([tipo, codigo, motivo, valor]) => { const f = new FormData(); f.set('tipo', tipo); f.set('codigo', codigo); f.set('motivo', motivo); f.set('valor', valor); return (await fetch('/api/admin/llavero', { method: 'POST', body: f })).json(); }, [tipo, c.codigoPrueba, motivo, valor]);
    ok(r.ok === true && r.huella === sha(valor), `${tipo}: guardada, la huella que vuelve es la de lo pegado`);
  };
  const ORDEN = ['telnyx_api_key', 'stripe_secret_key', 'whatsapp_token', 'whatsapp_waba_id']; // las filas con «Probar», en el orden de la pantalla
  const probarUI = async (pg, tipo, esperado) => {
    await pg.goto(B + '/admin/sistema/integraciones?tab=proveedores'); await pg.getByText(/STRIPE · COBROS CON TARJETA · \d DE 3/).waitFor({ timeout: 20000 });
    const vivas = sql(`select kind from store_secrets where retired_at is null`).split('\n');
    await pg.getByText('Probar', { exact: true }).nth(ORDEN.filter((k) => vivas.includes(k)).indexOf(tipo)).click();
    await pg.getByText(esperado).first().waitFor({ timeout: 20000 });
  };
  const SIRVE = 'La llave sirve: el proveedor contestó.', RECHAZA = 'El proveedor no aceptó la llave: está revocada o se copió mal.';
  const paso = async (k) => { // lo que dice «Lo que te toca» de ese paso: de su número al siguiente
    await pa.goto(B + '/admin/sistema/apps?v=toca'); await pa.getByText(new RegExp(`${k.replace('.', '\\.')} · `)).first().waitFor({ timeout: 20000 });
    const T = await texto(pa), i = T.indexOf(`${k} · `), j = T.slice(i + 6).search(/9-\d\.\d · /);
    return T.slice(i, j < 0 ? i + 700 : i + 6 + j);
  };
  const salud = async () => { await pa.goto(B + '/admin/sistema/salud'); await pa.getByText('PROVEEDORES · SUS LLAVES (SIN VALORES)').waitFor({ timeout: 20000 }); return texto(pa); };
  const ultima = (kind) => sql(`select fingerprint || '|' || source || '|' || ok::text || '|' || result from store_secret_checks where kind = '${kind}' order by id desc limit 1`).split('|');
  const claves = [];
  const ciclo = async ({ prov, nombre, paso: pk, fila, tipos, clave, faltan, otra, tambien }) => {
    const nK1 = tambien ? 2 : 1; // en WhatsApp la prueba pulsa «Probar» en el token y también en el ID de la cuenta: dos llamadas al simulador
    const K1 = clave(), K2 = clave(), n0 = SIM.llamadas(prov).length;
    claves.push(K1, K2);
    let P = await paso(pk);
    ok(/PENDIENTE/.test(P) && !/HECHO/.test(P) && P.includes(faltan), `${pk} antes de poner las llaves: pendiente («${faltan}»)`);
    for (const [tipo, v] of tipos) await pegarApi(tipo, v, `${nombre} de prueba 9v`);
    await pegarApi(fila, K1, `${nombre} de prueba 9v`); SIM.aceptar(prov, K1, otra);
    P = await paso(pk);
    ok(/PENDIENTE/.test(P) && P.includes('Las llaves están; falta que «Probar» salga bien con la que se usa hoy.'), `${pk} con las llaves y sin probar: pendiente («falta que «Probar» salga bien»)`);
    await probarUI(pa, fila, SIRVE);
    // 23 nov · Las que se prueban juntas: UNA pulsación en el token anota también el ID de la cuenta, con su huella (antes «Lo que te toca» pedía dos).
    if (tambien) ok(ultima(tambien).join('|') === `${sha(otra.waba)}|llavero|true|sirve`, `${nombre}: con una sola prueba queda anotado también el ID de la cuenta`);
    if (tambien) { await probarUI(pa, tambien, SIRVE); ok(ultima(tambien).join('|') === `${sha(otra.waba)}|llavero|true|sirve`, `${nombre}: el ID de la cuenta también se prueba aparte y sirve`); }
    await pa.screenshot({ path: `${OUT}q-${prov}-sirve-1360.png`, fullPage: true });
    ok(ultima(fila).join('|') === `${sha(K1)}|llavero|true|sirve`, `${nombre}: la pantalla dijo «La llave sirve» y quedó anotado: huella de la llave en uso, de dónde vino, sirvió, «sirve»`);
    ok(SIM.llamadas(prov, sha(K1)).length === nK1 && SIM.llamadas(prov, sha(K1)).every((x) => x.estado === 200) && SIM.llamadas(prov).length === n0 + nK1, `${nombre}: el simulador recibió ${nK1} llamada(s), firmadas con la llave pegada (misma huella), y contestó 200`);
    ok((await texto(pa)).includes('probada'), `${nombre}: la fila dice «probada»`);
    let S = await salud();
    ok(/probada/.test(S) && !/la prueba falló/.test(S), `${nombre}: Salud dice «probada»`);
    await pa.screenshot({ path: `${OUT}q-${prov}-salud-1360.png`, fullPage: true });
    P = await paso(pk);
    ok(/PENDIENTE/.test(P) && P.includes('Las llaves están y probadas, pero este entorno usa el simulador.'), `${pk} con la prueba bien: sigue pendiente y dice que este entorno usa el simulador`);
    await pa.screenshot({ path: `${OUT}q-${prov}-toca-1360.png`, fullPage: true });
    // Rotar a una llave que el proveedor no conoce
    await pegarApi(fila, K2, `Rotación de ${nombre} de prueba 9v`);
    await probarUI(pa, fila, RECHAZA);
    await pa.screenshot({ path: `${OUT}q-${prov}-rechazada-1360.png`, fullPage: true });
    ok(ultima(fila).join('|') === `${sha(K2)}|llavero|false|rechazada`, `${nombre}: la pantalla dijo «no aceptó la llave» y quedó anotado «rechazada» con la huella de la NUEVA`);
    ok(SIM.llamadas(prov, sha(K2)).length === 1 && SIM.llamadas(prov, sha(K2))[0].estado === 401 && SIM.llamadas(prov, sha(K1)).length === nK1 && SIM.llamadas(prov).length === n0 + nK1 + 1, `${nombre}: el simulador vio la llamada con la llave NUEVA (401) y no volvió a ver la anterior`);
    ok(sql(`select count(*) from audit_entries where action = 'llavero.probar' and at >= '${T0}' and after->>'huella' in ('${sha(K1).slice(0, 16)}', '${sha(K2).slice(0, 16)}')`) === (tambien ? '3' : '2'), `${nombre}: la auditoría tiene las pruebas de las dos llaves, con huella${tambien ? ' (la del ID de la cuenta anota también el token: 3)' : ''}`);
    S = await salud();
    ok(/la prueba falló \(rechazada\)/.test(S), `${nombre}: Salud dice «la prueba falló (rechazada)»`);
    P = await paso(pk);
    ok(/PENDIENTE/.test(P) && !/HECHO/.test(P) && P.includes('Las llaves están; falta que «Probar» salga bien con la que se usa hoy.'), `${pk} con la prueba fallida: pendiente («falta que «Probar» salga bien»)`);
    return { K1, K2 };
  };
  const retirarTodo = (kinds) => sql(`update store_secrets set retired_at = now(), retired_by = uploaded_by, retired_reason = 'fin de la prueba 9v' where kind in (${kinds.map((k) => `'${k}'`).join(',')}) and retired_at is null`);
  // La llave de Telnyx de la sección 6 (TK): el simulador no la conocía → «rechazada», con la huella de lo que llegó
  ok(ultima('telnyx_api_key')[3] === 'rechazada' && SIM.llamadas('telnyx', sha(TK)).length === 1 && SIM.llamadas('telnyx', sha(TK))[0].estado === 401, 'la llave de la sección 6, que el simulador no conocía: «rechazada», y el simulador vio su huella (401)');
  await ciclo({ prov: 'telnyx', nombre: 'Telnyx', paso: '9-1.2', fila: 'telnyx_api_key', tipos: [['telnyx_from', '+15705550100']], clave: () => 'KEY' + al(48), faltan: 'Faltan 1 de 3 llaves' });
  retirarTodo(['telnyx_api_key', 'telnyx_from']);
  await ciclo({ prov: 'stripe', nombre: 'Stripe', paso: '9-1.1', fila: 'stripe_secret_key', tipos: [['stripe_publishable_key', 'pk_test_' + al(40)]], clave: () => 'sk_test_' + al(40), faltan: 'Faltan 2 de 3 llaves' });
  retirarTodo(['stripe_secret_key', 'stripe_publishable_key']);
  const WABA = String(100000000000000 + Math.floor(Math.random() * 899999999999999));
  const META = await ciclo({ prov: 'meta', nombre: 'WhatsApp', paso: '9-1.3', fila: 'whatsapp_token', tipos: [['whatsapp_waba_id', WABA]], clave: () => 'EA' + al(60), faltan: 'Faltan 2 de 4 llaves', otra: { waba: WABA }, tambien: 'whatsapp_waba_id' });
  // Meta: el token es bueno pero el ID de la cuenta no existe → el proveedor contesta 400 (código 100): «contestó con un error», no «rechazó la llave»
  SIM.aceptar('meta', META.K2); await pegarApi('whatsapp_waba_id', String(Number(WABA) + 1), 'ID de otra cuenta 9v');
  await probarUI(pa, 'whatsapp_token', 'El proveedor contestó con un error (HTTP 400).');
  ok(ultima('whatsapp_token')[3] === 'http_400' && ultima('whatsapp_token')[2] === 'false', 'WhatsApp: token bueno e ID que no existe → «http_400» (el proveedor contestó con un error), no «rechazada»');
  retirarTodo(['whatsapp_token', 'whatsapp_waba_id']);

  console.log('   · Nada se escapó: ni una llave de la sección en la pantalla, las respuestas, el registro del servidor ni lo que anotó el simulador');
  const todas = [...claves, TK, WABA];
  const reg = (() => { try { return fs.readFileSync(S + '/server.log', 'utf8'); } catch { return ''; } })();
  const donde = todas.map((k, i) => `#${i}: ${respuestas.filter((x) => x.includes(k)).length} respuestas, ${reg.includes(k) ? 'server.log' : '-'}, ${k !== WABA && JSON.stringify(SIM.registro).includes(k) ? 'simulador' : '-'}`).filter((x) => !/: 0 respuestas, -, -$/.test(x));
  ok(!donde.length, `ninguna de las ${todas.length} llaves aparece en las respuestas (${respuestas.length}), en server.log (${reg.length} bytes) ni en el registro del simulador (${SIM.registro.length} llamadas, solo huellas)${donde.length ? ' — ' + donde.join(' | ') : ''}`);
  ok(sql(`select count(*) from audit_entries where at >= '${T0}' and (${todas.map((k) => `coalesce(after::text, '') || coalesce(before::text, '') || coalesce(reason, '') like '%${k}%'`).join(' or ')})`) === '0', 'ni en la auditoría');
  ok(sql(`select count(*) from store_secret_checks where ${todas.map((k) => `result like '%${k.slice(0, 12)}%'`).join(' or ')}`) === '0', 'ni en lo anotado por «Probar»');
  const S2 = await salud();
  ok(!/[1-9]\d* del llavero/.test(S2), 'retiradas al final, el servidor ya no usa ninguna del llavero (Salud)');
  const p2 = await pagina('tel2', 390, IOS); await entrar(p2, ADM);
  await p2.goto(B + '/admin/sistema/apps?v=toca'); await p2.getByText(/9-1\.1 · /).first().waitFor({ timeout: 20000 });
  ok(await p2.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'a 390: «Lo que te toca» sin desborde horizontal');
  await p2.screenshot({ path: `${OUT}q-toca-390.png`, fullPage: true });
  await p2.goto(B + '/admin/sistema/salud'); await p2.getByText('PROVEEDORES · SUS LLAVES (SIN VALORES)').waitFor({ timeout: 20000 });
  await p2.screenshot({ path: `${OUT}q-salud-390.png`, fullPage: true });
  await p2.context().close();
  await SIM.cerrar();

  ok(!errs.length, `sin errores de la página${errs.length ? ': ' + errs.join(' | ') : ''}`);
  await br.close();
  console.log(`\nprov9v ✓ (${n} comprobaciones)`);
})().catch((e) => { console.error(e); process.exit(1); });
