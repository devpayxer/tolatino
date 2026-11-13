// 8g · El boleto en Apple Wallet y Google Wallet, de punta a punta (Playwright, teléfono 390 y escritorio 1360) contra el servidor de :3100
// (servir8g.sh) y los simuladores de scripts/wallet-sim (Google Wallet API + OAuth + AIA en :4405; APNs de pases con TLS de cliente en :4406).
// Cadena de PRUEBA (raíz → «WWDR de prueba») hecha con openssl en $S/wal8g/pki: el «Apple» de esta prueba firma la solicitud que genera
// NUESTRO servidor. Cubre: Super Admin › Integraciones › Wallet (falta → solicitud CSR con código → .cer → vivo → aviso de vencimiento a los
// 30 días), emitir → el .pkpass valida su firma y su manifiesto; el QR del pase = el de la pantalla del boleto = el que firma el servidor, y la
// Puerta lo escanea igual; registrar un teléfono de prueba → transferir el boleto → se pide la actualización (APNs) y el pase viejo queda
// anulado; token ajeno → 401 (y sin token, de otro pase, viejo); límites (por teléfono por hora y por dirección); Google: objeto creado contra
// el simulador (validado con el descubrimiento oficial), «Guardar» firmado, anular → INACTIVE sin código; cambio de fecha y evento cancelado
// tocan el pase; evento de Fe → genérico; nada personal; los botones (iPhone: Apple · Android: Google · computadora: los dos); Eventos › boleto ›
// WALLET. Deja los datos como estaban (eventos de prueba cancelados, llaves de prueba retiradas).
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const crypto = require('crypto'); const fs = require('fs'); const zlib = require('zlib');
const { S, B, sql, api, entrar, uid, firmar } = require('../lib/g6-comun.cjs');
const REPO = ENT.RAIZ, OUT = S + '/cap/';
const SIM = require(REPO + '/scripts/wallet-sim/sim.cjs'), PKI = require(REPO + '/scripts/wallet-sim/pki.cjs');
const jsQR = require(ENT.rec('jsqr/package/dist/jsQR.js'));
let n = 0; const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const espera = async (f, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await new Promise((r) => setTimeout(r, 250)); } return false; };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const contiene = (p, t, ms) => espera(async () => (await texto(p)).includes(t), ms);
const vis = async (l) => { const k = await l.count(); for (let i = 0; i < k; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 40; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
const btn = (p, t) => p.locator('button, [role="button"]', { hasText: t });
const RUN = Date.now().toString(36), TAG = `[w8g ${RUN}]`;
const ADM = '5705550199', C1 = '5705550122', C2 = '5705550299', TERRAZA = '5705550366', NEG = 'la-terraza-night', PAR = 'parroquia-santa-maria';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const AND = 'Mozilla/5.0 (Linux; Android 14; Pixel 6a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const BT = ENT.TOK;
const trabajar = () => fetch(B + '/api/interno/push', { method: 'POST', headers: { 'x-barrido-token': BT } }).then((r) => r.json());

function leerZip(b) {
  const fin = b.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06])), total = b.readUInt16LE(fin + 10), ini = b.readUInt32LE(fin + 16), out = {};
  for (let i = ini, k = 0; k < total; k++) {
    const metodo = b.readUInt16LE(i + 10), tam = b.readUInt32LE(i + 20), ln = b.readUInt16LE(i + 28), le = b.readUInt16LE(i + 30), lc = b.readUInt16LE(i + 32), off = b.readUInt32LE(i + 42);
    const nombre = b.subarray(i + 46, i + 46 + ln).toString('utf8'), l = off + 30 + b.readUInt16LE(off + 26) + b.readUInt16LE(off + 28), d = b.subarray(l, l + tam);
    out[nombre] = metodo === 8 ? zlib.inflateRawSync(d) : d; i += 46 + ln + le + lc;
  }
  return out;
}
async function leerQR(p, sel) {
  const d = await p.evaluate((s) => { const el = document.querySelector(s); const svg = el && el.querySelector('svg[role="img"]'); const path = svg && svg.querySelector('path'); return path ? { d: path.getAttribute('d'), vb: svg.getAttribute('viewBox') } : null; }, sel);
  if (!d) return null;
  const sz = Number(d.vb.split(' ')[2]), sc = 6, N = sz * sc, px = new Uint8ClampedArray(N * N * 4).fill(255);
  for (const m of d.d.matchAll(/M(\d+) (\d+)h1v1h-1z/g)) { const x = +m[1], y = +m[2]; for (let a = 0; a < sc; a++) for (let b = 0; b < sc; b++) { const i = ((y * sc + a) * N + (x * sc + b)) * 4; px[i] = px[i + 1] = px[i + 2] = 0; } }
  const r = jsQR(px, N, N); return r ? r.data : null;
}
// El «teléfono» de Wallet: lo que hace el iPhone con el servicio web (sin cookies).
const ws = async (metodo, ruta, token, cuerpo, extra = {}) => {
  const r = await fetch(B + '/api/pases/' + ruta, { method: metodo, headers: { ...(token ? { authorization: `ApplePass ${token}` } : {}), ...(cuerpo ? { 'content-type': 'application/json' } : {}), ...extra }, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
  const b = Buffer.from(await r.arrayBuffer());
  return { st: r.status, b, h: r.headers };
};

(async () => {
  const P = PKI.cadena({ dir: S + '/wal8g/pki', aia: 'http://127.0.0.1:4405/aia/wwdr.der' });
  const sim = await SIM.arrancar({ googlePuerto: 4405, apnsPuerto: 4406, descubrimiento: ENT.rec('walletobjects-v1.json'), tls: { key: P.srv.key, cert: P.srv.cert, ca: P.raiz + P.inter }, interDer: P.interDer });
  const ADMID = uid(ADM), U1 = uid(C1), U2 = uid(C2);
  const retirar = () => sql(`update store_secrets set retired_at = now(), retired_by = '${ADMID}', retired_reason = 'prueba wal8g' where kind in ('pass_type_cert', 'pass_type_csr', 'google_wallet_sa') and retired_at is null`);
  const limpiar = () => {
    sql(`delete from platform_config where key like 'pase_%' or key = 'bol_transferencias_dia_max'`);
    sql(`update feature_flags set enabled = true where key like 'app.wallet.%'`);
    sql(`update ticket_transfers set status = 'cancelled', ended_at = now() where status = 'pending' and event_date_id in (select d.id from event_dates d join events e on e.id = d.event_id where e.title->>'es' like '%[w8g %')`);
    sql(`update door_sessions set ended_at = now(), ended_by = 'system' where ended_at is null and event_id in (select id from events where title->>'es' like '%[w8g %')`);
    sql(`update tickets set status = 'void', void_reason = 'prueba' where status in ('valid', 'used') and event_id in (select id from events where title->>'es' like '%[w8g %')`);
    sql(`update events set status = 'cancelled', cancelled_at = now(), cancelled_by = 'admin', cancel_reason = 'prueba' where title->>'es' like '%[w8g %' and status <> 'cancelled'`);
  };
  limpiar(); retirar();
  // La base local acumula transferencias de Marisol de otras corridas (tope al día): como evt6d, un tope alto mientras corre.
  sql(`insert into platform_config (key, value, updated_by) values ('bol_transferencias_dia_max', '50', '${ADMID}') on conflict (key) do update set value = excluded.value`);
  const HNY = Number(sql(`select extract(hour from now() at time zone 'America/New_York')::int * 60 + extract(minute from now() at time zone 'America/New_York')::int`));
  const evento = (biz, fmt, titulo, dias, h0) => {
    const id = sql(`insert into events (slug, city_id, business_id, format, title, start_date, start_min, end_min, entry, status, submitted_at, approved_at, approved_by, doors_before_min, created_by, min_age, tickets_cfg, kind, span_days)
      values ('', 'hzl', '${biz}', '${fmt}', '{"es":"${titulo} ${TAG}","en":"${titulo} EN ${TAG}"}', (now() at time zone 'America/New_York')::date + ${dias}, ${h0}, ${h0 + 120}, 'tickets', 'live', now(), now(), '${ADMID}', 0, '${ADMID}', 0,
              '[{"id":"gen","n":{"es":"General","en":"General admission"},"s":{"es":"","en":""},"p":1500,"cap":30,"off":false}]'::jsonb, 'single', 1) returning id`).split('\n')[0];
    sql(`select evt_sincronizar_fechas(${id})`);
    return [id, sql(`select id from event_dates where event_id = ${id} and status = 'scheduled' order by starts_at limit 1`)];
  };
  const boleto = (eid, fid, tel, nombre = null) => {
    const u = uid(tel);
    const op = sql(`insert into operations (number, kind, city_id, business_id, user_id, status, details, subtotal_cents, total_cents, pay_mode, confirmed_at, client_key, is_test, pay_status)
      select 'B-' || nextval('ticket_order_seq'), 'tickets', e.city_id, e.business_id, '${u}', 'confirmed', jsonb_build_object('event_id', e.id::text, 'event_date_id', '${fid}'), 1500, 1500, 'app', now(), gen_random_uuid(), true, 'captured' from events e where e.id = ${eid} returning id`).split('\n')[0];
    const tt = sql(`select id from ticket_types where event_id = ${eid} and cfg_key = 'gen'`);
    sql(`update ticket_stock set sold_n = sold_n + 1 where ticket_type_id = ${tt} and event_date_id = ${fid}`);
    const t = sql(`insert into tickets (event_date_id, event_id, city_id, ticket_type_id, operation_id, holder_user_id, holder_name, admits, kind, price_cents, fee_cents) values (${fid}, ${eid}, 'hzl', ${tt}, ${op}, '${u}', ${nombre ? `'${nombre}'` : 'null'}, 1, 'paid', 1500, 175) returning id`).split('\n')[0];
    return { id: t, code: sql(`select code from tickets where id = ${t}`) };
  };
  const qrDe = (tid) => { const [f, v, a] = sql(`select event_date_id || '|' || qr_ver || '|' || admits from tickets where id = ${tid}`).split('|'); return firmar(tid, f, Number(v), Number(a)); };
  const br = await chromium.launch();
  const ctx = (w, h, ua, mobile) => br.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: !!mobile, hasTouch: !!mobile, ...(ua ? { userAgent: ua } : {}) });
  const err = [];
  try {
    // ── Eventos y boletos de prueba ──
    const [EV1, F1] = evento(NEG, 'noche', 'Noche de Wallet', 1, 1260);           // mañana 9 PM (se transfiere)
    const [EV2, F2] = evento(NEG, 'noche', 'Puerta con Wallet', 0, Math.min(1320, HNY + 60)); // hoy en 1 h (la puerta abre)
    const [EV3, F3] = evento(PAR, 'fe', 'Retiro de Wallet', 2, 600);              // Fe: texto genérico
    const T1 = boleto(EV1, F1, C1, 'Marisol Prueba Wallet'), T2 = boleto(EV2, F2, C1), T3 = boleto(EV3, F3, C1), T4 = boleto(EV1, F1, C1), TY = boleto(EV1, F1, C2);
    ok(F1 && F2 && F3 && T1.code && T4.code && TY.code, `eventos y boletos de prueba: ${T1.code}, ${T2.code}, ${T3.code}, ${T4.code} (Marisol) y ${TY.code} (Yaritza)`);

    // ── 1 · Sin certificado: el botón no sale; Super Admin › Integraciones › Wallet lo dice ──
    const cA = await ctx(1360, 900), pa = await cA.newPage(); pa.on('pageerror', (e) => err.push('admin: ' + e.message)); await entrar(pa, ADM);
    const cI = await ctx(390, 844, IOS, true), pi = await cI.newPage(); pi.on('pageerror', (e) => err.push('iphone: ' + e.message)); await entrar(pi, C1);
    await pi.goto(B + `/cuenta/boletos/${T1.code}`);
    ok(await contiene(pi, T1.code) && !(await pi.locator('[data-wallet]').count()), 'sin certificado del pase: el boleto no muestra «Agregar a Apple Wallet» (el servidor decide)');
    await pa.goto(B + '/admin/sistema/integraciones?tab=wallet');
    ok(await contiene(pa, 'Falta el certificado del pase de Apple') && await contiene(pa, 'Falta la cuenta de emisor de Google Wallet') && await contiene(pa, 'PASES EMITIDOS'), 'Integraciones › Wallet: falta el certificado y la cuenta de Google, con las cifras');
    await pa.screenshot({ path: OUT + 'w8g-integ-falta-d.png', fullPage: true });

    // ── 2 · La solicitud (CSR) con el código del Admin → «Apple» la firma → el .cer se sube → vivo ──
    await clic(btn(pa, 'Generar la solicitud (CSR)'));
    await clic(btn(pa, 'Mandar el código'));
    ok(await contiene(pa, 'MODO PRUEBAS · tu código es'), 'generar la solicitud pide el código al teléfono del Admin (modo pruebas)');
    const cod = /tu código es (\d{6})/.exec(await texto(pa))[1];
    await pa.getByPlaceholder('000000').fill(cod);
    await pa.getByPlaceholder('Primer certificado del pase').fill('Primer certificado del pase (prueba wal8g)');
    await pa.screenshot({ path: OUT + 'w8g-integ-solicitud-d.png', fullPage: true });
    await clic(btn(pa, 'Generar la solicitud'));
    ok(await contiene(pa, 'Solicitud lista desde'), 'la solicitud queda lista (la llave nace y se queda en el servidor)');
    ok(sql(`select count(*) || '|' || (meta->>'pass_type_id') from store_secrets where kind = 'pass_type_csr' and retired_at is null group by meta`) === '1|pass.com.tolatino.boletos'
      && sql(`select count(*) from audit_entries where actor_id = '${ADMID}' and action = 'llavero.subir' and after->>'llave' like 'Apple Wallet · solicitud%' and at > now() - interval '1 minute'`) !== '0', 'la llave de la solicitud va al llavero (cifrada; solo su huella) y queda en la auditoría');
    await pa.screenshot({ path: OUT + 'w8g-integ-solicitud-lista-d.png', fullPage: true });
    const csr = await pa.evaluate(async () => (await fetch('/api/admin/llavero/solicitud')).text());
    ok(/^-----BEGIN CERTIFICATE REQUEST-----/.test(csr) && !/PRIVATE/.test(csr), '«Bajar la solicitud» da el CSR (PKCS#10), sin la llave');
    const cer = P.firmar(csr);
    // Al revés: un .cer de OTRA llave no entra.
    const { privateKey: kaj } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    const cerAjeno = P.firmar(P.solicitudAjena(kaj.export({ format: 'pem', type: 'pkcs8' })));
    const subirApi = async (tipo, nombre, buf, extra = {}) => pa.evaluate(async ([tipo, nombre, b64, extra]) => {
      const c = await (await fetch('/api/admin/llavero/codigo', { method: 'POST' })).json();
      const f = new FormData(); f.set('tipo', tipo); f.set('codigo', c.codigoPrueba); f.set('motivo', 'prueba wal8g'); for (const [k, v] of Object.entries(extra)) f.set(k, v);
      f.set('archivo', new File([Uint8Array.from(atob(b64), (x) => x.charCodeAt(0))], nombre));
      const r = await fetch('/api/admin/llavero', { method: 'POST', body: f }); return { st: r.status, j: await r.json() };
    }, [tipo, nombre, buf.toString('base64'), extra]);
    const otraVez = () => sql(`delete from otp_codes where phone = '+1${ADM}'`); // el código se pide de nuevo después de 30 s: en la prueba, sin esperar
    otraVez();
    const malo = await subirApi('pass_type_cert', 'pass.cer', cerAjeno);
    ok(malo.st === 400 && /no es de la solicitud que generamos/.test(malo.j.msg), `un .cer de otra llave → 400 «${malo.j.msg}»`);
    // El de verdad, por la pantalla: Integraciones › Wallet › «Subir el certificado (.cer)».
    await pa.goto(B + '/admin/sistema/integraciones?tab=wallet');
    await clic(btn(pa, 'Subir el certificado (.cer)'));
    otraVez();
    await clic(pa.locator('[role="button"], button', { hasText: 'Mandar el código' }));
    ok(await contiene(pa, 'MODO PRUEBAS · tu código es'), 'subir el .cer: Integraciones › Llaves › Apple Wallet · certificado del pase, con el código');
    await pa.getByPlaceholder('000000').fill(/tu código es (\d{6})/.exec(await texto(pa))[1]);
    await pa.getByPlaceholder('Llave nueva de Apple').fill('Certificado del pase de Apple (prueba wal8g)');
    fs.writeFileSync(S + '/wal8g/pass.cer', cer);
    await pa.setInputFiles('input[type="file"]', S + '/wal8g/pass.cer');
    await clic(btn(pa, 'Guardar en el llavero'));
    ok(await espera(() => sql(`select count(*) from store_secrets where kind = 'pass_type_cert' and retired_at is null`) === '1', 20000), 'el .cer se guarda: el servidor junta su llave, el certificado y el intermedio que bajó del AIA (de «Apple»)');
    ok(sql(`select meta->>'pass_type_id' || '|' || (meta->>'equipo') || '|' || (meta->>'emisor') || '|' || (expires_on > current_date + 300) from store_secrets where kind = 'pass_type_cert' and retired_at is null`) === 'pass.com.tolatino.boletos|TL12345678|WWDR de prueba|true'
      && sql(`select count(*) from store_secrets where kind = 'pass_type_csr' and retired_at is null`) === '0', 'el llavero dice el Pass Type ID, el equipo, el intermedio y el vencimiento (del certificado); la solicitud se retira');
    ok(!sql(`select encode(blob_enc, 'escape') from store_secrets where kind = 'pass_type_cert' and retired_at is null`).includes('PRIVATE KEY'), 'el sobre está cifrado (ni la llave ni el certificado en claro en la base)');
    await pa.goto(B + '/admin/sistema/integraciones?tab=wallet');
    ok(await contiene(pa, 'Certificado vivo · vence el') && await contiene(pa, 'pass.com.tolatino.boletos') && await contiene(pa, 'TL12345678'), 'Integraciones › Wallet: «Certificado vivo · vence el …», el Pass Type ID y el equipo');
    await pa.screenshot({ path: OUT + 'w8g-integ-vivo-d.png', fullPage: true });
    // Google: la cuenta de servicio de prueba (su llave pública va al simulador) con el ID del emisor.
    const { publicKey: gpub, privateKey: gpriv } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    const sa = { type: 'service_account', project_id: 'tl-pruebas', private_key_id: 'w8g' + RUN, private_key: gpriv.export({ format: 'pem', type: 'pkcs8' }), client_email: `wallet-${RUN}@tl-pruebas.iam.gserviceaccount.com`, token_uri: 'https://oauth2.googleapis.com/token' };
    sim.cuentas.set(sa.client_email, gpub);
    otraVez();
    const sg = await subirApi('google_wallet_sa', 'wallet.json', Buffer.from(JSON.stringify(sa)), { emisor: '3388000000099999999' });
    ok(sg.st === 200 && sql(`select meta->>'emisor' from store_secrets where kind = 'google_wallet_sa' and retired_at is null`) === '3388000000099999999', 'la cuenta de servicio de Google Wallet se sube con el ID del emisor');

    // ── 3 · El boleto: los botones según el teléfono; emitir el .pkpass ──
    await pi.goto(B + `/cuenta/boletos/${T1.code}`);
    ok(await espera(async () => (await pi.locator('[data-wallet="apple"]').count()) === 1 && (await pi.locator('[data-wallet="google"]').count()) === 0), 'iPhone: «Agregar a Apple Wallet» (y no el de Google)');
    ok(await contiene(pi, 'GUÁRDALO EN TU TELÉFONO') && await contiene(pi, 'El mismo código de esta pantalla'), 'con la línea «El mismo código de esta pantalla. Si lo transfieres, lo devuelves o cambia el evento, se actualiza solo.»');
    await pi.locator('[data-wallet="apple"]').scrollIntoViewIfNeeded();
    await pi.screenshot({ path: OUT + 'w8g-boleto-iphone-m.png', fullPage: true });
    const QR_PANTALLA = await leerQR(pi, '[data-pantalla="USR-BOLETO"]');
    ok(QR_PANTALLA && QR_PANTALLA === qrDe(T1.id), 'el QR de la pantalla (leído con jsQR) es el que firma el servidor');
    const href = await pi.locator('[data-wallet="apple"]').getAttribute('href');
    ok(href === `/api/pases/apple/${T1.code}`, `el botón de Apple lleva al .pkpass del boleto (${href})`);
    const rp = await pi.request.get(B + href);
    const PK = Buffer.from(await rp.body());
    ok(rp.status() === 200 && rp.headers()['content-type'] === 'application/vnd.apple.pkpass' && /attachment; filename="TL-/.test(rp.headers()['content-disposition']), 'el .pkpass sale con application/vnd.apple.pkpass');
    const Z = leerZip(PK), man = JSON.parse(Z['manifest.json']), pj = JSON.parse(Z['pass.json']);
    ok(Object.entries(man).every(([k, h]) => crypto.createHash('sha1').update(Z[k]).digest('hex') === h) && Object.keys(man).length === Object.keys(Z).length - 2, `manifest.json: el SHA-1 de cada uno de los ${Object.keys(man).length} archivos coincide`);
    const vf = P.verificar(Z.signature, Z['manifest.json']);
    ok(vf.ok, 'signature: la firma separada del manifest.json verifica con openssl contra la cadena (raíz → WWDR de prueba → el certificado del pase)' + (vf.ok ? '' : ' ' + vf.err));
    ok(['icon.png', 'icon@2x.png', 'icon@3x.png', 'logo.png', 'logo@2x.png'].every((x) => Z[x] && Z[x].subarray(1, 4).toString() === 'PNG'), 'las imágenes del pase (ícono y logo del sistema de diseño) son PNG');
    const QR_PASE = pj.barcodes?.[0]?.message;
    ok(QR_PASE === QR_PANTALLA && pj.barcodes[0].format === 'PKBarcodeFormatQR' && pj.barcodes[0].altText === T1.code, 'el QR del pase es EXACTAMENTE el de la pantalla del boleto (paseMismoQr)');
    ok(pj.passTypeIdentifier === 'pass.com.tolatino.boletos' && pj.teamIdentifier === 'TL12345678' && /^[A-Z2-7]{26}$/.test(pj.serialNumber) && pj.webServiceURL.endsWith('/api/pases') && pj.authenticationToken.length >= 40, 'pass.json: el Pass Type ID y el equipo del certificado, serie al azar, el servicio web y su token');
    const PJS = Z['pass.json'].toString();
    ok(!PJS.includes('Marisol') && !PJS.includes('5705550122') && !/\$\d/.test(PJS) && !PJS.includes(U1), 'nada personal en el pase: sin el nombre (aunque el boleto lo tenga), sin teléfono, sin montos');
    ok(PJS.includes(`Noche de Wallet ${TAG}`) && Z['en.lproj/pass.strings'].subarray(2).toString('utf16le').includes(`"Noche de Wallet ${TAG}" = "Noche de Wallet EN ${TAG}";`), 'el nombre del evento en español y su traducción en en.lproj');
    const PASE1 = sql(`select id || '|' || serial || '|' || version || '|' || auth_token_hash from ticket_passes where ticket_id = ${T1.id} and platform = 'apple'`).split('|');
    ok(PASE1[1] === pj.serialNumber && PASE1[3] === crypto.createHash('sha256').update('pase:' + pj.authenticationToken).digest('hex') && !sql(`select row_to_json(p)::text from ticket_passes p where id = ${PASE1[0]}`).includes(pj.authenticationToken),
      'la base guarda el pase con su serie y SOLO la huella del token (nunca el token)');
    const rp2 = await pi.request.get(B + href), pj2 = JSON.parse(leerZip(Buffer.from(await rp2.body()))['pass.json']);
    ok(pj2.serialNumber === pj.serialNumber && pj2.authenticationToken === pj.authenticationToken && sql(`select string_agg(action, ',' order by id) from pass_log where pass_id = ${PASE1[0]}`) === 'emitido,descargado', 'volver a pedirlo da el MISMO pase (misma serie y token); el libro dice emitido y descargado');
    // De otra persona: no.
    const cY = await ctx(390, 844, IOS, true), py = await cY.newPage(); await entrar(py, C2);
    const ry = await py.request.get(B + href, { maxRedirects: 0 });
    ok(ry.status() === 303 && /wallet=no/.test(ry.headers().location), 'el .pkpass del boleto de otra persona → no (vuelve con «no se puede guardar»)');
    const rs = await (await br.newContext()).request.get(B + href, { maxRedirects: 0 });
    ok(rs.status() === 303 && /\/entrar\?volver=/.test(rs.headers().location), 'sin sesión → a entrar');

    // ── 4 · La Puerta escanea el QR del pase igual que el de la app ──
    const r2 = await pi.request.get(B + `/api/pases/apple/${T2.code}`), qr2 = JSON.parse(leerZip(Buffer.from(await r2.body()))['pass.json']).barcodes[0].message;
    await pi.goto(B + `/cuenta/boletos/${T2.code}`);
    const qr2app = await leerQR(pi, '[data-pantalla="USR-BOLETO"]');
    ok(qr2 === qr2app, 'segundo boleto (hoy): el QR del pase = el de la app');
    const UT = uid(TERRAZA);
    const SES = sql(`insert into door_sessions (event_date_id, event_id, business_id, city_id, door_staff_id, member_user_id, user_id, door_name) select d.id, d.event_id, e.business_id, d.city_id, null, '${UT}', '${UT}', 'Principal' from event_dates d join events e on e.id = d.event_id where d.id = ${F2} returning id`).split('\n')[0];
    const cT = await ctx(390, 844, null, true), pt = await cT.newPage(); await entrar(pt, TERRAZA);
    const esc = await api(pt, '/api/puerta/escanear', { sesion: SES, tipo: 'qr', qr: qr2, id: crypto.randomUUID(), at: Date.now() });
    ok(esc.ok && esc.v.res === 'valid', `la Puerta escanea el QR del PASE → VÁLIDO (${esc.v?.res})`);
    const esc2 = await api(pt, '/api/puerta/escanear', { sesion: SES, tipo: 'qr', qr: qr2app, id: crypto.randomUUID(), at: Date.now() });
    ok(esc2.ok && esc2.v.res === 'already_used', 'el de la app, después, → YA ENTRÓ: es el mismo boleto, el mismo QR');
    ok(await espera(() => sql(`select version from ticket_passes where ticket_id = ${T2.id}`) === '2'), 'el escaneo (boleto «usado») ya tocó el pase en la base: versión 2');

    // ── 5 · El servicio web: registrar un teléfono de prueba, token ajeno → 401 ──
    const TIPO = pj.passTypeIdentifier, SER = pj.serialNumber, TOK = pj.authenticationToken, DEV = 'w8g' + crypto.randomBytes(12).toString('hex'), PUSH = crypto.randomBytes(32).toString('hex');
    const rY = await py.request.get(B + `/api/pases/apple/${TY.code}`), pjY = JSON.parse(leerZip(Buffer.from(await rY.body()))['pass.json']);
    const reg = (tok, dev = DEV, ser = SER) => ws('POST', `v1/devices/${dev}/registrations/${TIPO}/${ser}`, tok, { pushToken: PUSH });
    ok((await reg(pjY.authenticationToken)).st === 401, 'registrar el pase de Marisol con el token del pase de Yaritza (otro pase) → 401');
    ok((await reg(null)).st === 401 && (await reg('x'.repeat(43))).st === 401 && (await ws('POST', `v1/devices/${DEV}/registrations/${TIPO}/${SER}`, null, { pushToken: PUSH }, { authorization: `Bearer ${TOK}` })).st === 401, 'sin token, con uno inventado o con otro esquema («Bearer») → 401');
    ok((await reg(TOK, DEV, pjY.serialNumber)).st === 401, 'el token de Marisol para la serie de Yaritza → 401 (el token es de ESE pase)');
    ok((await ws('POST', `v1/devices/${DEV}/registrations/pass.otra.cosa/${SER}`, TOK, { pushToken: PUSH })).st === 401, 'el token bueno con otro Pass Type ID → 401');
    ok((await reg(TOK)).st === 201 && (await reg(TOK)).st === 200, 'con SU token: 201 (nuevo) y 200 (ya estaba), como dice Apple');
    ok(sql(`select count(*) from pass_registrations where device_library_id = '${DEV}' and removed_at is null`) === '1' && !sql(`select encode(push_token_enc, 'hex') from pass_devices where device_library_id = '${DEV}'`).includes(PUSH), 'un registro; el token de push del teléfono va cifrado');
    const L0 = await ws('GET', `v1/devices/${DEV}/registrations/${TIPO}?passesUpdatedSince=0`);
    const lista0 = JSON.parse(L0.b.toString());
    ok(L0.st === 200 && lista0.serialNumbers.join() === SER && /^\d+$/.test(lista0.lastUpdated) && Object.keys(lista0).sort().join() === 'lastUpdated,serialNumbers', 'la lista del teléfono: solo series y la marca (sin token, como dice Apple)');
    ok((await ws('GET', `v1/devices/${DEV}/registrations/${TIPO}?passesUpdatedSince=${lista0.lastUpdated}`)).st === 204, 'nada cambió desde la marca → 204');
    ok((await ws('GET', `v1/devices/otro${DEV}/registrations/${TIPO}?passesUpdatedSince=0`)).st === 204, 'otro teléfono no ve las series de este (204)');
    const G0 = await ws('GET', `v1/passes/${TIPO}/${SER}`, TOK);
    ok(G0.st === 200 && G0.h.get('content-type') === 'application/vnd.apple.pkpass' && G0.h.get('last-modified'), 'pedir el pase al día con su token → 200 y Last-Modified');
    ok((await ws('GET', `v1/passes/${TIPO}/${SER}`, TOK, null, { 'if-modified-since': G0.h.get('last-modified') })).st === 304, 'con If-Modified-Since de esa misma hora → 304');
    ok((await ws('GET', `v1/passes/${TIPO}/${SER}`, pjY.authenticationToken)).st === 401 && (await ws('GET', `v1/passes/${TIPO}/${pjY.serialNumber}`, TOK)).st === 401, 'el pase con el token de OTRO pase → 401 (en las dos direcciones)');
    ok((await ws('DELETE', `v1/devices/${DEV}/registrations/${TIPO}/${SER}`, pjY.authenticationToken)).st === 401, 'dar de baja con un token ajeno → 401');
    ok((await ws('POST', 'v1/log', null, { logs: ['prueba wal8g: hola', 'x'.repeat(5000)] })).st === 200, 'el log de Wallet: 200 (se anota recortado en el registro del servidor, no en la base)');

    // ── 6 · Transferir el boleto → aviso a Apple (actualización) → recibir → el pase viejo ANULADO ──
    const av0 = sim.avisos.length;
    await pi.goto(B + `/cuenta/boletos/${T1.code}`);
    await clic(btn(pi, 'Transferir este boleto')); await pi.fill('input[aria-label="Teléfono de la persona"]', C2); await clic(btn(pi, 'Enviar boleto'));
    const enviado = await espera(() => sql(`select count(*) from ticket_transfers where ticket_id = ${T1.id} and status = 'pending'`) === '1', 15000);
    if (!enviado) console.log('    pantalla:', (await texto(pi)).slice(0, 600));
    ok(enviado && await contiene(pi, 'ENVIADO A ••99'), 'Marisol transfiere el boleto a Yaritza (6d): «ENVIADO A ••99 · EL QR ANTERIOR QUEDA ANULADO»');
    ok(sql(`select version || '|' || (voided_at is null) from ticket_passes where id = ${PASE1[0]}`) === '2|true' && sql(`select count(*) from pass_log where pass_id = ${PASE1[0]} and action = 'actualizado' and detail = 'qr: versión 2'`) === '1',
      'EN LA MISMA ACCIÓN: el pase sube de versión (el QR viejo quedó anulado), sin anularse todavía (la transferencia se puede deshacer)');
    ok(await espera(() => sim.avisos.length > av0, 10000), 'se pide la actualización a Apple: llega el aviso al APNs (sin esperar al barrido)');
    const a1 = sim.avisos.at(-1);
    ok(a1.token === PUSH && a1.topic === TIPO && a1.uid === TIPO && a1.cuerpo === '{}', 'el aviso: al token de ESE teléfono, tema = Pass Type ID, TLS con el certificado del pase, cuerpo «{}»');
    ok(await espera(() => sql(`select pushed_version || '|' || last_push_result from pass_registrations where device_library_id = '${DEV}' and removed_at is null`) === '2|enviado'), 'el registro queda avisado en la versión 2');
    const L1 = JSON.parse((await ws('GET', `v1/devices/${DEV}/registrations/${TIPO}?passesUpdatedSince=${lista0.lastUpdated}`)).b.toString());
    ok(L1.serialNumbers.join() === SER, 'el teléfono pregunta qué cambió desde su marca → la serie de este pase');
    const pjT = JSON.parse(leerZip((await ws('GET', `v1/passes/${TIPO}/${SER}`, TOK)).b)['pass.json']);
    ok(!pjT.barcodes && pjT.voided === false && JSON.stringify(pjT).includes('Se está transfiriendo: este código no entra'), 'el pase al día: SIN código y «Se está transfiriendo» (como la pantalla, que no muestra QR)');
    const NT = sql(`select href from notifications where user_id = '${U2}' and tpl = 'bol_transfer_in' order by id desc limit 1`);
    await py.goto(B + NT); await clic(btn(py, 'Recibir boleto')); await py.waitForURL(/\/cuenta\/boletos\/TL-/, { timeout: 15000 });
    ok(sql(`select status from tickets where id = ${T1.id}`) === 'replaced', 'Yaritza lo recibe (6d): el boleto original queda «transferido»');
    ok(sql(`select version || '|' || void_reason from ticket_passes where id = ${PASE1[0]}`) === '3|boleto' && sql(`select count(*) from pass_log where pass_id = ${PASE1[0]} and action = 'anulado' and detail = 'estado: replaced'`) === '1', 'EN LA MISMA ACCIÓN: el pase viejo queda ANULADO (versión 3, «boleto»)');
    ok(await espera(() => sim.avisos.filter((x) => x.token === PUSH).length >= 2, 10000), 'otro aviso a Apple para que el teléfono baje el pase anulado');
    const pjV = JSON.parse(leerZip((await ws('GET', `v1/passes/${TIPO}/${SER}`, TOK)).b)['pass.json']);
    ok(pjV.voided === true && !pjV.barcodes && JSON.stringify(pjV).includes('Transferido a otra persona'), 'el pase al día: voided, SIN código, «Transferido a otra persona»');
    const vf2 = leerZip((await ws('GET', `v1/passes/${TIPO}/${SER}`, TOK)).b);
    ok(P.verificar(vf2.signature, vf2['manifest.json']).ok, 'el pase actualizado también va firmado (verifica)');
    const nuevo = sql(`select t.code from tickets t where t.id = (select replaced_by from tickets where id = ${T1.id})`);
    await py.goto(B + `/cuenta/boletos/${nuevo}`);
    ok(await espera(async () => (await py.locator('[data-wallet="apple"]').count()) === 1), `Yaritza ve su boleto nuevo (${nuevo}) con su propio «Agregar a Apple Wallet» (otro pase, otra serie)`);
    const rN = await py.request.get(B + `/api/pases/apple/${nuevo}`), pjN = JSON.parse(leerZip(Buffer.from(await rN.body()))['pass.json']);
    ok(pjN.serialNumber !== SER && pjN.barcodes[0].message === qrDe(sql(`select id from tickets where code = '${nuevo}'`)), 'el pase de Yaritza: otra serie y el QR de SU boleto nuevo');
    await pi.goto(B + `/cuenta/boletos/${T1.code}`);
    ok(await contiene(pi, 'Transferiste este boleto') && !(await pi.locator('[data-wallet]').count()), 'Marisol: su boleto transferido ya no ofrece Wallet');
    const ru = await pi.request.get(B + `/api/pases/apple/${T1.code}`, { maxRedirects: 0 });
    ok(ru.status() === 303 && /wallet=no/.test(ru.headers().location), 'y pedir el .pkpass del boleto transferido → «no se puede guardar»');

    // ── 7 · Dar de baja y teléfono que ya no existe (410) ──
    ok((await ws('DELETE', `v1/devices/${DEV}/registrations/${TIPO}/${SER}`, TOK)).st === 200 && sql(`select removed_reason from pass_registrations where device_library_id = '${DEV}' order by id desc limit 1`) === 'telefono', 'el teléfono da de baja el pase con su token → 200 (estado «telefono»; la fila queda)');
    const r4 = await pi.request.get(B + `/api/pases/apple/${T4.code}`), pj4 = JSON.parse(leerZip(Buffer.from(await r4.body()))['pass.json']);
    const DEV2 = 'w8g' + crypto.randomBytes(12).toString('hex'), PUSH2 = crypto.randomBytes(32).toString('hex');
    ok((await ws('POST', `v1/devices/${DEV2}/registrations/${TIPO}/${pj4.serialNumber}`, pj4.authenticationToken, { pushToken: PUSH2 })).st === 201, 'otro boleto, otro teléfono registrado');
    sim.muertos.add(PUSH2);
    // ── 8 · Cambio de fecha (la base toca el pase en la misma transacción) ──
    sql(`update event_dates set starts_at = starts_at + interval '30 minutes', ends_at = ends_at + interval '30 minutes' where id = ${F1}`);
    ok(sql(`select version || '|' || (voided_at is null) from ticket_passes where ticket_id = ${T4.id} and platform = 'apple'`) === '2|true' && sql(`select detail from pass_log where pass_id = (select id from ticket_passes where ticket_id = ${T4.id} and platform = 'apple') order by id desc limit 1`) === 'fecha: hora',
      'mover la hora de la fecha toca el pase en la misma transacción (versión 2, «fecha: hora»)');
    await trabajar();
    ok(await espera(() => sql(`select removed_reason from pass_registrations where device_library_id = '${DEV2}' order by id desc limit 1`) === 'token_invalido' && sql(`select invalid_reason from pass_devices where device_library_id = '${DEV2}'`) === 'apns'),
      'el APNs dice 410 Unregistered → ese teléfono se marca y su registro se da de baja (estado, no se borra)');
    const pj4b = JSON.parse(leerZip((await ws('GET', `v1/passes/${TIPO}/${pj4.serialNumber}`, pj4.authenticationToken)).b)['pass.json']);
    ok(pj4b.relevantDate !== pj4.relevantDate && pj4b.relevantDate.endsWith('-05:00'), `la hora nueva sale en el pase (${pj4.relevantDate} → ${pj4b.relevantDate})`);

    // ── 9 · Google Wallet en Android: el objeto contra el simulador; «Guardar» firmado; anular → INACTIVE ──
    const cG = await ctx(390, 844, AND, true), pg = await cG.newPage(); pg.on('pageerror', (e) => err.push('android: ' + e.message)); await entrar(pg, C1);
    await pg.route('https://pay.google.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>Google Wallet (simulado)</body></html>' }));
    await pg.goto(B + `/cuenta/boletos/${T4.code}`);
    ok(await espera(async () => (await pg.locator('[data-wallet="google"]').count()) === 1 && (await pg.locator('[data-wallet="apple"]').count()) === 0), 'Android: «Agregar a Google Wallet» (y no el de Apple)');
    await pg.locator('[data-wallet="google"]').scrollIntoViewIfNeeded();
    await pg.screenshot({ path: OUT + 'w8g-boleto-android-m.png', fullPage: true });
    const QR4 = await leerQR(pg, '[data-pantalla="USR-BOLETO"]');
    await clic(pg.locator('[data-wallet="google"]'));
    await pg.waitForURL(/pay\.google\.com\/gp\/v\/save\//, { timeout: 20000 });
    const vg = sim.verificarGuardar(pg.url());
    const oid = vg.P?.payload?.eventTicketObjects?.[0]?.id, obj = sim.objetos.get(oid);
    ok(vg.ok && vg.P.aud === 'google' && vg.P.typ === 'savetowallet' && vg.P.iss === sa.client_email && vg.P.origins[0] === 'https://pruebas.tolatino.com', '«Agregar a Google Wallet» abre pay.google.com con el JWT firmado por la cuenta de servicio (aud google, typ savetowallet)');
    ok(obj && obj.barcode.value === QR4 && obj.barcode.type === 'QR_CODE' && obj.state === 'ACTIVE' && !('ticketHolderName' in obj) && sim.clases.has(obj.classId) && !sim.registro.some((x) => x.errores), 'el objeto en Google: EL MISMO QR de la pantalla, ACTIVE, sin nombre de la persona, con su clase; ninguna llave fuera del descubrimiento oficial');
    ok(sql(`select google_synced_version || '/' || version from ticket_passes where ticket_id = ${T4.id} and platform = 'google'`) === '1/1', 'la base: Google al día (versión 1)');
    // Anular desde el Super Admin (la acción que ya avisa) → el objeto de Google queda INACTIVE y sin código.
    await pa.goto(B + `/admin/eventos/boleto/${T4.code}`);
    ok(await contiene(pa, 'WALLET · 2 PASES') && await contiene(pa, 'Apple Wallet ·') && await contiene(pa, 'Google Wallet ·') && await contiene(pa, 'Google al día'), 'Super Admin › el boleto › WALLET: sus dos pases (Apple y Google) y su estado');
    await pa.screenshot({ path: OUT + 'w8g-admin-boleto-vivo-d.png', fullPage: true });
    await clic(btn(pa, 'Anular')); await clic(btn(pa, 'Boleto duplicado')); await clic(pa.locator('button, [role="button"]', { hasText: /^(Confirmar|Anular)$/ }).last());
    ok(await espera(() => sql(`select status from tickets where id = ${T4.id}`) === 'void'), 'el Super Admin anula el boleto (con motivo)');
    ok(sql(`select string_agg(platform || ':' || void_reason, ',' order by platform) from ticket_passes where ticket_id = ${T4.id}`) === 'apple:boleto,google:boleto', 'EN LA MISMA ACCIÓN: sus dos pases quedan anulados');
    ok(await espera(() => sim.objetos.get(oid)?.state === 'INACTIVE' && !sim.objetos.get(oid)?.barcode, 15000), 'Google: el objeto queda INACTIVE y SIN código (update = reemplazo; sin esperar al barrido)');
    await pa.goto(B + `/admin/eventos/boleto/${T4.code}`);
    ok(await contiene(pa, 'ANULADO') && await contiene(pa, 'el boleto ya no vale') && await contiene(pa, 'GOOGLE · Google Wallet al día') && await contiene(pa, 'APPLE · Anulado'), 'Super Admin: los pases ANULADOS, por qué, y su historia (anulado, Google al día)');
    await pa.screenshot({ path: OUT + 'w8g-admin-boleto-anulado-d.png', fullPage: true });
    const cAm = await ctx(390, 844, null, true), pam = await cAm.newPage(); await entrar(pam, ADM);
    await pam.goto(B + `/admin/eventos/boleto/${T4.code}`); await contiene(pam, 'WALLET');
    await pam.screenshot({ path: OUT + 'w8g-admin-boleto-anulado-m.png', fullPage: true });
    // Google cae → reintenta (no se pierde): el siguiente cambio entra cuando Google vuelve.
    const T5 = boleto(EV1, F1, C1);
    await pg.goto(B + `/cuenta/boletos/${T5.code}`); await clic(pg.locator('[data-wallet="google"]')); await pg.waitForURL(/pay\.google\.com/, { timeout: 20000 });
    const oid5 = sim.verificarGuardar(pg.url()).P.payload.eventTicketObjects[0].id;
    sim.fallarGoogle = 2;
    sql(`update events set title = '{"es":"Noche de Wallet cambiada ${TAG}","en":"Wallet night changed ${TAG}"}'::jsonb where id = ${EV1}`);
    await trabajar();
    ok(sql(`select google_tries || '|' || (google_synced_version < version) from ticket_passes where ticket_id = ${T5.id} and platform = 'google'`) === '1|true', 'Google no responde (503) → el pase queda pendiente con un reintento (espera creciente)');
    sql(`update ticket_passes set google_not_before = now() where ticket_id = ${T5.id}`); sim.fallarGoogle = 0; await trabajar();
    ok(sql(`select google_tries || '|' || (google_synced_version = version) from ticket_passes where ticket_id = ${T5.id} and platform = 'google'`) === '0|true' && JSON.stringify(sim.clases.get(sim.objetos.get(oid5).classId)).includes('Noche de Wallet cambiada'), 'Google vuelve → el objeto y su clase quedan al día con el nombre nuevo del evento');

    // ── 10 · Evento cancelado y evento de Fe ──
    const r3 = await pi.request.get(B + `/api/pases/apple/${T3.code}`), pj3 = JSON.parse(leerZip(Buffer.from(await r3.body()))['pass.json']), s3 = JSON.stringify(pj3);
    ok(s3.includes('Boleto de evento') && !s3.includes('Retiro de Wallet') && !s3.includes('Parroquia') && !pj3.eventTicket.secondaryFields.some((f) => f.key === 'lugar'), 'evento de Fe: el pase dice «Boleto de evento», sin nombre, lugar ni organizador');
    sql(`update events set status = 'cancelled', cancelled_at = now(), cancelled_by = 'admin', cancel_reason = 'prueba wal8g' where id = ${EV3}`);
    ok(sql(`select void_reason from ticket_passes where ticket_id = ${T3.id}`) === 'evento', 'cancelar el evento anula su pase en la misma transacción («evento»)');
    const pj3b = JSON.parse(leerZip((await ws('GET', `v1/passes/${TIPO}/${pj3.serialNumber}`, pj3.authenticationToken)).b)['pass.json']);
    ok(pj3b.voided === true && !pj3b.barcodes && JSON.stringify(pj3b).includes('Evento cancelado'), 'el pase al día: voided, sin código, «Evento cancelado»');

    // ── 11 · Escritorio: los dos botones ──
    const cD = await ctx(1360, 900), pd = await cD.newPage(); pd.on('pageerror', (e) => err.push('escritorio: ' + e.message)); await entrar(pd, C2);
    await pd.goto(B + `/cuenta/boletos/${nuevo}`);
    ok(await espera(async () => (await pd.locator('[data-wallet="apple"]').count()) === 1 && (await pd.locator('[data-wallet="google"]').count()) === 1), 'computadora: los dos botones (Apple y Google)');
    ok((await pd.locator('[data-arte="provisional"]').count()) === 2, 'las insignias están marcadas como PROVISIONALES (el arte oficial espera las licencias)');
    await pd.screenshot({ path: OUT + 'w8g-boleto-escritorio-d.png', fullPage: true });
    // Interruptor apagado: no salen pases nuevos.
    sql(`update feature_flags set enabled = false where key = 'app.wallet.apple'`); await new Promise((r) => setTimeout(r, 16000));
    await pd.goto(B + `/cuenta/boletos/${nuevo}`);
    ok(await espera(async () => (await pd.locator('[data-wallet="apple"]').count()) === 0 && (await pd.locator('[data-wallet="google"]').count()) === 1), 'app.wallet.apple apagado: el botón de Apple no sale (Google sí)');
    sql(`update feature_flags set enabled = true where key = 'app.wallet.apple'`);

    // ── 12 · Límites: por teléfono por hora (en la base) y por dirección por minuto ──
    sql(`insert into platform_config (key, value, note, updated_by) values ('pase_registros_hora', '5'::jsonb, 'prueba wal8g', 'prueba') on conflict (key) do update set value = excluded.value`);
    const DEV3 = 'w8g' + crypto.randomBytes(12).toString('hex'), regN = () => ws('POST', `v1/devices/${DEV3}/registrations/${TIPO}/${pjN.serialNumber}`, pjN.authenticationToken, { pushToken: PUSH });
    const sts = [];
    for (let i = 0; i < 6; i++) { sts.push((await regN()).st); await ws('DELETE', `v1/devices/${DEV3}/registrations/${TIPO}/${pjN.serialNumber}`, pjN.authenticationToken); }
    ok(sts.slice(0, 5).every((x) => x === 201) && sts[5] === 429, `más de pase_registros_hora (5) registros de un teléfono en una hora → la base lo rechaza: 429 (${sts.join(',')})`);
    sql(`insert into platform_config (key, value, note, updated_by) values ('pase_ws_por_minuto', '10'::jsonb, 'prueba wal8g', 'prueba') on conflict (key) do update set value = excluded.value`);
    await new Promise((r) => setTimeout(r, 16000)); // la caché de Configuración
    const L = []; for (let i = 0; i < 14; i++) L.push((await ws('POST', 'v1/log', null, { logs: ['x'] })).st);
    ok(L.includes(429), `más de pase_ws_por_minuto (10) pedidos por minuto desde una dirección → 429 (${L.join(',')})`);
    sql(`delete from platform_config where key like 'pase_%'`);

    // ── 13 · El certificado por vencer: aviso al equipo una vez; Integraciones lo dice ──
    // Renovar con el certificado vivo: una solicitud nueva (el vivo sigue firmando) → «Apple» da uno que vence en 10 días → se sube.
    sql(`delete from notifications where tpl = 'pase_cert_vence'`);
    otraVez();
    const sol2 = await pa.evaluate(async () => { const c = await (await fetch('/api/admin/llavero/codigo', { method: 'POST' })).json(); const r = await fetch('/api/admin/llavero/solicitud', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ codigo: c.codigoPrueba, motivo: 'Renovar (prueba wal8g)' }) }); return { st: r.status, j: await r.json() }; });
    ok(sol2.st === 200 && /^-----BEGIN CERTIFICATE REQUEST-----/.test(sol2.j.csr) && sql(`select count(*) from store_secrets where kind = 'pass_type_cert' and retired_at is null`) === '1', 'renovar: una solicitud nueva mientras el certificado vivo sigue firmando');
    ok((await pi.request.get(B + `/api/pases/apple/${T5.code}`)).headers()['content-type'] === 'application/vnd.apple.pkpass', 'con la solicitud nueva pendiente, los pases se siguen emitiendo con el certificado vivo');
    otraVez();
    const sub2 = await subirApi('pass_type_cert', 'pass.cer', P.firmar(sol2.j.csr, { dias: 10 }));
    const v2 = sql(`select version || '|' || (expires_on - current_date) from store_secrets where kind = 'pass_type_cert' and retired_at is null`).split('|');
    ok(sub2.st === 200 && v2[1] === '10' && sql(`select retired_reason from store_secrets where kind = 'pass_type_cert' and version = ${Number(v2[0]) - 1}`) === `Reemplazada por la versión ${v2[0]}`, `el certificado nuevo (vence en 10 días, versión ${v2[0]}) reemplaza al anterior, que queda retirado con motivo`);
    await fetch(B + '/api/interno/barrido', { method: 'POST', headers: { 'x-barrido-token': BT } }).catch(() => null);
    const admins = sql(`select count(*) from staff_members where role = 'admin' and status = 'active'`);
    ok(await espera(() => sql(`select count(*) from notifications where tpl = 'pase_cert_vence'`) === admins, 20000), `a 10 días de vencer (≤ 30), cada Admin recibe «El certificado de Apple Wallet vence en 10 días» (${admins})`);
    await fetch(B + '/api/interno/barrido', { method: 'POST', headers: { 'x-barrido-token': BT } }).catch(() => null);
    ok(sql(`select count(*) from notifications where tpl = 'pase_cert_vence'`) === admins, 'el barrido otra vez no repite el aviso (una vez por versión y etapa)');
    await pa.goto(B + '/admin/sistema/integraciones?tab=wallet');
    ok(await contiene(pa, 'El certificado vence el') && await contiene(pa, '(en 10 días)'), 'Integraciones › Wallet: «El certificado vence el … (en 10 días)»');
    await pa.screenshot({ path: OUT + 'w8g-integ-vence-d.png', fullPage: true });
    await pam.goto(B + '/admin/sistema/integraciones?tab=wallet'); await contiene(pam, 'El certificado vence el');
    await pam.screenshot({ path: OUT + 'w8g-integ-vence-m.png', fullPage: true });

    // ── 14 · Lo que queda: nada se borró; el libro no se cambia ──
    ok(/solo de inserción/.test(require('../lib/g6-comun.cjs').sqlErr(`update pass_log set detail = 'x' where id = (select max(id) from pass_log)`)) && /no se borra/.test(require('../lib/g6-comun.cjs').sqlErr(`delete from ticket_passes where id = ${PASE1[0]}`)), 'pass_log no se cambia y un pase no se borra (la base)');
    ok(/la versión y el estado los lleva la base/.test(require('../lib/g6-comun.cjs').sqlErr(`update ticket_passes set version = version + 5 where id = ${PASE1[0]}`)), 'la versión de un pase no la cambia nadie más que pase_tocar');
    ok(err.length === 0, `sin errores de página (${err.length}) ${err.slice(0, 3).join(' | ')}`);
  } finally {
    limpiar(); retirar();
    await sim.cerrar(); await br.close();
  }
  console.log(`\n✓ wal8g: ${n} comprobaciones`);
})().catch((e) => { console.error(e); process.exit(1); });
