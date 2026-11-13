// 6h · To'Latino Puerta SIN CONEXIÓN, de punta a punta (teléfono 390; panel y Super Admin también 1360). Dos porteros de La Terraza abren
// la puerta con señal → el teléfono baja el paquete firmado y cifrado (IndexedDB: cifrado, llave no exportable, ilegible con la llave de otra
// sesión) → sin señal (Playwright setOffline) escanean con la cámara (BarcodeDetector falso que entrega el texto del QR: la cámara y jsQR ya
// se probaron en 6g) → VÁLIDO decidido por el teléfono; QR alterado, de otro entorno, de una versión vieja, devuelto, en transferencia, de
// otro día y de otro negocio → no entran, igual que en línea → los dos dejan entrar el MISMO boleto sin señal (el reloj de uno 7 min
// adelantado) → vuelve la señal → la cola sube → una sola entrada, un «duplicate» con su incidencia y el ganador por la hora corregida, el
// mismo en los dos órdenes de subida → la misma cola otra vez no cambia nada → un boleto devuelto mientras no había señal → rejected con
// incidencia → un boleto de otro negocio o de otro día metido en la cola → rechazado → la app abierta en frío sin señal (service worker) →
// la cáscara con la puerta guardada → cerrar la puerta borra lo guardado y el paquete ya no sale → «Revocar este teléfono» → lo que no subió
// no cuenta y el teléfono lo borra → el paquete vence → se borra (teléfono) y queda revocado (barrido) → Mi cuenta: el QR se ve sin señal y
// se borra al salir; otra cuenta en el mismo teléfono no ve nada → panel y Super Admin marcan lo de sin conexión. Deja los datos como estaban.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process'); const crypto = require('crypto'); const fs = require('fs');
const { S, B, sql, api, entrar, uid, firmar, otraLlave } = require('../lib/g6-comun.cjs');
const OUT = S + '/cap/';
const jsQR = require(ENT.rec('jsqr/package/dist/jsQR.js'));
let n = 0; const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const vis = async (l) => { const k = await l.count(); for (let i = 0; i < k; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 40; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
const espera = async (f, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await new Promise((r) => setTimeout(r, 300)); } return false; };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const contiene = (p, t, ms) => espera(async () => (await texto(p)).includes(t), ms);
const btn = (p, t) => p.locator('button, [role="button"]', { hasText: t });
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const RUN = Date.now().toString(36), TAG = `[e6h ${RUN}]`;
const C1 = '5705550122', C2 = '5705550299', C3 = '5705550288', TERRAZA = '5705550366', ADM = '5705550199', LUIS = '5705550422';
const P1 = '5705550541', P2 = '5705550542';
const NEG = 'la-terraza-night', PAR = 'parroquia-santa-maria';
const uuid = () => crypto.randomUUID();

async function leerQR(p, sel) {
  const d = await p.evaluate((s) => { const el = document.querySelector(s); const svg = el && el.querySelector('svg[role="img"]'); const path = svg && svg.querySelector('path'); return path ? { d: path.getAttribute('d'), vb: svg.getAttribute('viewBox') } : null; }, sel);
  if (!d) return null;
  const sz = Number(d.vb.split(' ')[2]), sc = 6, N = sz * sc, px = new Uint8ClampedArray(N * N * 4).fill(255);
  for (const m of d.d.matchAll(/M(\d+) (\d+)h1v1h-1z/g)) { const x = +m[1], y = +m[2]; for (let a = 0; a < sc; a++) for (let b = 0; b < sc; b++) { const i = ((y * sc + a) * N + (x * sc + b)) * 4; px[i] = px[i + 1] = px[i + 2] = 0; } }
  const r = jsQR(px, N, N); return r ? r.data : null;
}
// Lo que hay en IndexedDB de la puerta (crudo: lo que vería quien copie la base del teléfono).
const crudo = (p) => p.evaluate(() => new Promise((ok) => {
  const r = indexedDB.open('tl-puerta');
  r.onsuccess = () => { const d = r.result; if (!d.objectStoreNames.contains('paquetes')) { ok({ paquetes: [], cola: [], llaves: [] }); return; }
    const t = d.transaction(['paquetes', 'cola', 'llaves']), out = {};
    let k = 0; for (const s of ['paquetes', 'cola', 'llaves']) { const q = t.objectStore(s).getAll(); q.onsuccess = () => { out[s] = q.result.map((x) => ({ s: x.s, id: x.id, vence: x.vence, c: x.datos ? Array.from(new Uint8Array(x.datos.c)).slice(0, 4000) : null, iv: x.datos ? Array.from(x.datos.iv) : null, k: x.k ? { ext: x.k.extractable, alg: x.k.algorithm.name, uso: x.k.usages } : null })); if (++k === 3) { d.close(); ok(out); } }; } };
  r.onerror = () => ok(null);
}));

(async () => {
  const ADMID = uid(ADM), TERID = uid(TERRAZA);
  for (const [tel, a, b] of [[P1, 'Dora', 'Portera'], [P2, 'Eli', 'Portero']]) sql(`insert into users (phone, phone_verified_at, first_name, last_name, home_city_id) values ('+1${tel}', now(), '${a}', '${b}', 'hzl') on conflict (phone) do nothing`);
  const U1 = uid(P1), U2 = uid(P2);
  const nom = (tel) => { const [a, b] = sql(`select first_name || '|' || coalesce(last_name, '') from users where phone = '+1${tel}'`).split('|'); return b ? `${a.split(' ')[0]} ${b.slice(0, 1).toUpperCase()}.` : a; };
  const NOM1 = nom(C1), NOM2 = nom(C2);
  const limpiar = () => {
    sql(`update door_staff set status = 'removed', removed_at = now(), removed_reason = 'prueba', invite_code = null where status <> 'removed' and phone_last4 in ('${P1.slice(-4)}', '${P2.slice(-4)}')`);
    sql(`update door_sessions set ended_at = now(), ended_by = 'system' where ended_at is null and event_id in (select id from events where title->>'es' like '%[e6h %')`);
    sql(`update door_sessions set ended_at = now(), ended_by = 'system' where ended_at is null and user_id in ('${TERID}')`);
    sql(`update ticket_transfers set status = 'cancelled', ended_at = now() where status = 'pending' and event_date_id in (select d.id from event_dates d join events e on e.id = d.event_id where e.title->>'es' like '%[e6h %')`);
    sql(`update tickets set status = 'void', void_reason = 'prueba' where status in ('valid', 'used') and event_id in (select id from events where title->>'es' like '%[e6h %')`);
    sql(`update events set status = 'cancelled', cancelled_at = now(), cancelled_by = 'admin', cancel_reason = 'prueba' where title->>'es' like '%[e6h %' and status <> 'cancelled'`);
  };
  limpiar();
  // Porteros activos de La Terraza (como los deja aceptar el código en 6g; aquí directo en la base: el flujo de invitar ya lo prueba evt6g).
  const portero = (tel, nombre, u) => {
    const id = sql(`insert into door_staff (business_id, city_id, display_name, phone_enc, phone_hash, phone_last4, invite_code, invite_expires_at, scope)
      values ('${NEG}', 'hzl', '${nombre}', '\\x00'::bytea, encode(sha256('${RUN}${tel}'::bytea), 'hex'), '${tel.slice(-4)}', '${crypto.randomBytes(6).map((x) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'.charCodeAt(x % 32)).toString()}', now() + interval '7 days', 'all') returning id`).split('\n')[0];
    sql(`update door_staff set status = 'active', user_id = '${u}', accepted_at = now(), invite_code = null, invite_expires_at = null where id = ${id}`);
    return id;
  };
  portero(P1, 'Dora Portera', U1); portero(P2, 'Eli Portero', U2);
  const HNY = Number(sql(`select extract(hour from now() at time zone 'America/New_York')::int * 60 + extract(minute from now() at time zone 'America/New_York')::int`));
  const H0 = Math.min(1320, HNY + 60);
  const evento = (biz, fmt, titulo, o = {}) => {
    const tk = JSON.stringify(o.tks ?? [{ id: 'gen', n: { es: 'General', en: 'General' }, s: { es: '', en: '' }, p: 1500, cap: 40, off: false }]);
    const id = sql(`insert into events (slug, city_id, business_id, format, title, start_date, start_min, end_min, entry, status, submitted_at, approved_at, approved_by, doors_before_min, created_by, min_age, tickets_cfg, tables_cfg, rsvp_capacity, party_max, kind, span_days, day_cap)
      values ('', 'hzl', '${biz}', '${fmt}', '{"es":"${titulo} ${TAG}","en":"${titulo} ${TAG}"}', (now() at time zone 'America/New_York')::date, ${H0}, ${H0 + 180}, 'tickets', 'live', now(), now(), '${ADMID}', 0, '${ADMID}', 0,
              '${tk}'::jsonb, '[]'::jsonb, 0, 1, '${o.kind ?? 'single'}', ${o.span ?? 1}, 0) returning id`).split('\n')[0];
    sql(`select evt_sincronizar_fechas(${id})`);
    return id;
  };
  const fechas = (id) => sql(`select string_agg(id::text, ',' order by starts_at) from event_dates where event_id = ${id} and status = 'scheduled'`).split(',').filter(Boolean);
  const boleto = (eid, fid, tel, o = {}) => {
    const u = uid(tel);
    const op = sql(`insert into operations (number, kind, city_id, business_id, user_id, status, details, subtotal_cents, total_cents, pay_mode, confirmed_at, client_key, is_test, pay_status)
      select 'B-' || nextval('ticket_order_seq'), 'tickets', e.city_id, e.business_id, '${u}', 'confirmed', jsonb_build_object('event_id', e.id::text, 'event_date_id', '${fid}'), 1500, 1500, 'app', now(), gen_random_uuid(), true, 'captured'
        from events e where e.id = ${eid} returning id`).split('\n')[0];
    const tt = sql(`select id from ticket_types where event_id = ${eid} and cfg_key = '${o.tipo ?? 'gen'}'`);
    sql(`update ticket_stock set sold_n = sold_n + 1 where ticket_type_id = ${tt} and event_date_id = ${fid}`);
    return sql(`insert into tickets (event_date_id, event_id, city_id, ticket_type_id, operation_id, holder_user_id, admits, kind, price_cents, fee_cents) values (${fid}, ${eid}, 'hzl', ${tt}, ${op}, '${u}', 1, 'paid', 1500, 175) returning id`).split('\n')[0];
  };
  const qrDe = (tid) => { const [f, v, a] = sql(`select event_date_id || '|' || qr_ver || '|' || admits from tickets where id = ${tid}`).split('|'); return firmar(tid, f, Number(v), Number(a)); };
  const br = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const ctx = async (w, h, mobile) => br.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: !!mobile, hasTouch: !!mobile, serviceWorkers: 'allow' });
  const err = [];
  // La «cámara» de la prueba: un BarcodeDetector falso que entrega lo que la prueba pone en window.__qr (solo en la prueba; la app no cambia).
  const camara = (c) => c.addInitScript(() => { class BD { static async getSupportedFormats() { return ['qr_code']; } async detect() { const t = window.__qr; if (t) { window.__qr = null; return [{ rawValue: t }]; } return []; } } window.BarcodeDetector = BD; });
  const RESULTADOS = /VÁLIDO|ENTRA · REVISA|YA ENTRÓ|QR NO VÁLIDO|NO ENCONTRADO|ANULADO|DEVUELTO|QR ANULADO|SE ESTÁ TRANSFIRIENDO|ES DE OTRO DÍA|NO ES DE ESTE EVENTO|REVISA EL GRUPO|PIDE ID/;
  const escanear = async (p, qr) => {
    if (await (await vis(btn(p, /^Siguiente$/))) ) await clic(btn(p, /^Siguiente$/));
    await p.evaluate((q) => { window.__qr = q; }, qr);
    let t = '';
    await espera(async () => { const s = p.locator('[role="status"][aria-live="assertive"]'); if (!(await s.count())) return false; t = (await s.first().innerText()).replace(/\s+/g, ' '); return RESULTADOS.test(t); }, 15000);
    return t;
  };
  try {
    // ── Eventos y boletos de prueba: un evento de dos días (el pase vale los dos; «Día 2» solo el segundo) y uno de la Parroquia ──
    const EV = evento(NEG, 'noche', 'Noche sin señal', { kind: 'span', span: 2, tks: [{ id: 'pase', n: { es: 'Pase', en: 'Pass' }, s: { es: '', en: '' }, p: 3000, cap: 40, off: false }, { id: 'd2', n: { es: 'Día 2', en: 'Day 2' }, s: { es: '', en: '' }, p: 1500, cap: 20, off: false, dy: 1 }] });
    const FS = fechas(EV), ANCLA = FS[FS.length - 1], F1 = FS[0];
    const EVB = evento(PAR, 'fe', 'Retiro sin señal'); const [FB] = fechas(EVB);
    const T = {}; for (const k of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']) T[k] = boleto(EV, ANCLA, k === 'b' || k === 'd' ? C2 : C1, { tipo: 'pase' });
    T.d2 = boleto(EV, ANCLA, C3, { tipo: 'd2' }); T.par = boleto(EVB, FB, C3);
    ok(FS.length === 2 && sql(`select valid_days::text from tickets where id = ${T.d2}`) === '{1}', 'evento de dos días con pases (los dos días) y un «Día 2» (solo el segundo), y un evento de la Parroquia');
    // Antes de abrir: uno devuelto, uno reemitido (QR viejo), uno en transferencia.
    const viejoE = qrDe(T.e); sql(`update tickets set qr_ver = qr_ver + 1 where id = ${T.e}`);
    sql(`update tickets set status = 'refunded' where id = ${T.f}`);
    const viejoG = qrDe(T.g); sql(`update tickets set qr_ver = qr_ver + 1 where id = ${T.g}`);
    sql(`insert into ticket_transfers (kind, ticket_id, operation_id, event_date_id, city_id, from_user_id, to_phone_enc, to_phone_hash, to_last2, claim_hash, expires_at) select 'transfer', t.id, t.operation_id, t.event_date_id, t.city_id, t.holder_user_id, '\\x00'::bytea, md5('${RUN}a') || md5('${RUN}b'), '99', md5('${RUN}c') || md5('${RUN}d'), now() + interval '1 hour' from tickets t where t.id = ${T.g}`);

    // ── 1 · Abrir la puerta con señal → «Preparando la puerta» → paquete firmado y cifrado ──
    const ca1 = await ctx(390, 844, true), a1 = await ca1.newPage(); a1.on('pageerror', (e) => err.push('a1 ' + e.message)); await ca1.grantPermissions(['camera'], { origin: B }); await camara(ca1);
    const ca2 = await ctx(390, 844, true), a2 = await ca2.newPage(); a2.on('pageerror', (e) => err.push('a2 ' + e.message)); await ca2.grantPermissions(['camera'], { origin: B }); await camara(ca2);
    // El reloj del teléfono de Eli va 7 minutos ADELANTADO.
    await ca2.addInitScript(() => { const N = Date.now.bind(Date); Date.now = () => N() + 7 * 60 * 1000; });
    a1.on('dialog', (d) => d.accept()); a2.on('dialog', (d) => d.accept());
    await entrar(a1, P1); await entrar(a2, P2);
    const colas = { a1: [], a2: [] };
    a1.on('request', (r) => { if (r.url().endsWith('/api/puerta/escanear') && /"tipo":"cola"/.test(r.postData() || '')) colas.a1.push(r.postData()); });
    a2.on('request', (r) => { if (r.url().endsWith('/api/puerta/escanear') && /"tipo":"cola"/.test(r.postData() || '')) colas.a2.push(r.postData()); });
    const abrir = async (p, puerta) => {
      await p.goto(B + '/puerta');
      await clic(p.locator('[role="button"]', { hasText: `Noche sin señal ${TAG}` }));
      await clic(p.locator(`xpath=//span[normalize-space()="¿EN QUÉ PUERTA ESTÁS?"]/ancestor::div[1]//*[normalize-space()="${puerta}"]`));
      await clic(btn(p, 'Abrir la puerta')); await p.waitForURL(/\/puerta\/s\/\d+/);
      return p.url().split('/').pop().split('?')[0];
    };
    const SA = await abrir(a1, 'Principal');
    ok(await contiene(a1, 'EN LÍNEA', 20000) && await contiene(a1, 'en la lista'), 'Dora abre la Principal: arriba «EN LÍNEA · … en la lista · lista de las …»');
    const N0 = Number(sql(`select count(*) from tickets where event_id = ${EV}`));
    ok(await espera(async () => sql(`select count(*) from door_packages where session_id = ${SA} and revoked_at is null`) === '1'), 'la base registra el paquete de la sesión (sin el contenido)');
    ok(sql(`select rows_n || '|' || (expires_at = (select ends_at from event_dates where id = ${F1}) + interval '6 hours') || '|' || (sha256 ~ '^[a-f0-9]{64}$') from door_packages where session_id = ${SA}`) === `${N0}|true|true`, `el paquete trae los ${N0} boletos del evento, vence al final de la fecha + 6 h y queda su huella`);
    await a1.screenshot({ path: OUT + 'e6h-puerta-enlinea-390.png' });
    const SB = await abrir(a2, 'VIP');
    ok(await contiene(a2, 'EN LÍNEA', 20000), 'Eli abre la VIP (su teléfono con el reloj 7 min adelantado)');

    // ── 2 · Lo guardado en el teléfono: cifrado, llave no exportable, ilegible sin la sesión ──
    await espera(async () => { const x = await crudo(a1); return x && x.paquetes.length === 1 && x.llaves.length === 1; });
    const R1 = await crudo(a1);
    ok(R1.llaves[0].k && R1.llaves[0].k.ext === false && R1.llaves[0].k.alg === 'AES-GCM', 'la llave de la sesión es un CryptoKey AES-GCM NO exportable');
    const plano = Buffer.from(R1.paquetes[0].c).toString('latin1');
    ok(!plano.includes(NOM1.split(' ')[0]) && !plano.includes('Pase') && !plano.includes(String(T.a)), 'el paquete guardado está cifrado: ni nombres, ni tipos, ni ids de boletos a la vista');
    ok(await a1.evaluate(() => new Promise((ok) => { const r = indexedDB.open('tl-puerta'); r.onsuccess = () => { const q = r.result.transaction('llaves').objectStore('llaves').getAll(); q.onsuccess = () => crypto.subtle.exportKey('raw', q.result[0].k).then(() => ok(false), () => ok(true)); }; })), 'exportar la llave desde la página falla (no exportable)');
    // Con la llave de OTRA sesión (la de Eli, que el servidor solo le da a ella), el paquete de Dora no se abre.
    const llaveB = await a2.evaluate(async (s) => (await (await fetch('/api/puerta/paquete', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sesion: s, llave: true }) })).json()).llave, SB);
    const abre = await a1.evaluate(async ([raw, iv, c]) => { try { const k = await crypto.subtle.importKey('raw', Uint8Array.from(atob(raw), (x) => x.charCodeAt(0)), 'AES-GCM', false, ['decrypt']); await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(iv) }, k, new Uint8Array(c)); return 'abrió'; } catch { return 'no'; } }, [llaveB, R1.paquetes[0].iv, (await a1.evaluate(() => new Promise((ok) => { const r = indexedDB.open('tl-puerta'); r.onsuccess = () => { const q = r.result.transaction('paquetes').objectStore('paquetes').getAll(); q.onsuccess = () => ok(Array.from(new Uint8Array(q.result[0].datos.c))); }; })))]);
    ok(llaveB && abre === 'no', 'con la llave de otra sesión (otro portero) el paquete de Dora no se descifra');
    const ajeno = await api(a2, '/api/puerta/paquete', { sesion: SA, llave: true });
    ok(ajeno.ok === false && ajeno.cerrada === true && !ajeno.llave, 'Eli pide el paquete (y la llave) de la sesión de Dora → 403, sin llave');
    // Otro teléfono con la MISMA cuenta de Dora no recibe el paquete de esa sesión (está atado al teléfono que abrió la puerta).
    const cx = await ctx(390, 844, true), px = await cx.newPage(); await entrar(px, P1);
    const otro = await api(px, '/api/puerta/paquete', { sesion: SA, llave: true });
    ok(otro.ok === false && otro.otro === true && !otro.llave, 'otro teléfono con la misma cuenta → «Esta puerta se abrió en otro teléfono» y sin llave');
    await cx.close();
    // El paquete del servidor: solo lo que la validación necesita (descifrado aquí con la llave de Dora: sin teléfonos, correos ni montos).
    const llaveA = (await api(a1, '/api/puerta/paquete', { sesion: SA, llave: true, gz: false }));
    const dec = crypto.createDecipheriv('aes-256-gcm', Buffer.from(llaveA.llave, 'base64'), Buffer.from(llaveA.iv, 'base64')); const cc = Buffer.from(llaveA.c, 'base64');
    dec.setAuthTag(cc.subarray(-16)); const sobre = JSON.parse(Buffer.concat([dec.update(cc.subarray(0, -16)), dec.final()]).toString());
    const P = JSON.parse(sobre.j), tels = sql(`select string_agg(right(phone, 10), ',') from users where phone in ('+1${C1}', '+1${C2}', '+1${C3}')`).split(',');
    ok(!tels.some((t) => sobre.j.includes(t)) && !/"[a-z_]*(price|fee|total|amount|cents|email|phone|card|pay)[a-z_]*"/i.test(sobre.j) && !sobre.j.includes('@') && Object.keys(P).sort().join(',') === 'b,cursor,delta,di,e,emitido,ev,f,fechas,pk,r,reglas,s,sync,tipos,v,vence' && P.b[0].length === 14 && P.r !== undefined, 'el paquete no trae teléfonos, correos ni montos: por boleto 14 campos (id, versión, entradas, estado, nombre + inicial, últimos 4, huella del código, días, tipo, banderas, entraron, adentro, última puerta y hora)');
    ok(crypto.verify(null, Buffer.from(`TLPK1\n${sobre.j}`), crypto.createPublicKey({ key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), Buffer.from(sql(`select public_key from qr_keys where kid = '${sobre.kid}'`), 'base64url')]), format: 'der', type: 'spki' }), Buffer.from(sobre.sig, 'base64url')), 'el paquete viene firmado (Ed25519, prefijo TLPK1) con la llave pública publicada');
    ok(P.b.find((x) => x[0] === T.a)[4] === NOM1 && P.b.find((x) => x[0] === T.g)[3] === 'pending' && P.b.find((x) => x[0] === T.f)[3] === 'refunded' && JSON.stringify(P.b.find((x) => x[0] === T.d2)[7]) === '[1]', 'por boleto: nombre + inicial, «en transferencia», devuelto y los días que vale');

    // ── 3 · Sin señal: VÁLIDO lo decide el teléfono; lo que no vale no entra (igual que en línea) ──
    await ca1.setOffline(true); await ca2.setOffline(true);
    ok(await contiene(a1, 'SIN CONEXIÓN', 20000) && await contiene(a2, 'SIN CONEXIÓN', 20000), 'sin señal: arriba «SIN CONEXIÓN»');
    let r = await escanear(a1, qrDe(T.a));
    ok(/VÁLIDO/.test(r) && r.includes(NOM1) && r.includes('SIN CONEXIÓN'), `Dora escanea un pase sin señal → VÁLIDO (${NOM1}) · «SIN CONEXIÓN · lo decidió este teléfono»`);
    ok(await contiene(a1, '1 POR SUBIR'), 'arriba: «1 POR SUBIR»');
    await a1.screenshot({ path: OUT + 'e6h-puerta-sinconexion-valido-390.png' });
    const t0 = performance.now(); r = await escanear(a1, qrDe(T.a)); const ms = Math.round(performance.now() - t0);
    ok(/YA ENTRÓ/.test(r) && r.includes('Ya entró por Principal'), `el mismo QR otra vez en ese teléfono → YA ENTRÓ por Principal (lo sabe por su propia cola; ${ms} ms con la cámara)`);
    const QA = qrDe(T.a);
    ok(/QR NO VÁLIDO/.test(await escanear(a1, QA.replace(`.${T.a}.`, `.${Number(T.a) + 1}.`))), 'QR alterado → QR NO VÁLIDO (firma Ed25519 verificada en el teléfono)');
    ok(/QR NO VÁLIDO/.test(await escanear(a1, firmar(T.b, ANCLA, 1, 1, otraLlave))), 'QR firmado con la llave de otro entorno → QR NO VÁLIDO');
    ok(/QR ANULADO/.test(await escanear(a1, viejoE)), 'QR de una versión vieja (reemitido) → QR ANULADO');
    ok(/DEVUELTO/.test(await escanear(a1, qrDe(T.f))), 'boleto devuelto → DEVUELTO');
    ok(/QR ANULADO|SE ESTÁ TRANSFIRIENDO/.test(await escanear(a1, viejoG)) && /SE ESTÁ TRANSFIRIENDO/.test(await escanear(a1, qrDe(T.g))), 'en transferencia: el QR de antes → QR ANULADO; el de ahora → SE ESTÁ TRANSFIRIENDO');
    ok(/ES DE OTRO DÍA/.test(r = await escanear(a1, qrDe(T.d2))) && r.includes('Día 2'), 'el «Día 2» en la puerta del día 1 → ES DE OTRO DÍA · «Vale: Día 2»');
    r = await escanear(a1, qrDe(T.par));
    ok(/NO ES DE ESTE EVENTO/.test(r) && !r.includes(nom(C3)), 'un boleto de la Parroquia → NO ES DE ESTE EVENTO (sin nombre)');
    ok(/NO ENCONTRADO/.test(await escanear(a1, 'https://ejemplo.com/hola')), 'un QR que no es un boleto → NO ENCONTRADO');
    await a1.screenshot({ path: OUT + 'e6h-puerta-sinconexion-otrodia-390.png' });

    // ── 4 · Los dos porteros sin señal dejan entrar el MISMO boleto (Eli primero, con el reloj 7 min adelantado) ──
    r = await escanear(a2, qrDe(T.b));
    ok(/VÁLIDO/.test(r) && r.includes(NOM2), 'Eli (VIP, sin señal) deja entrar el pase B');
    await dormir(1500);
    r = await escanear(a1, qrDe(T.b));
    ok(/VÁLIDO/.test(r), 'Dora (Principal, sin señal) deja entrar el MISMO pase B segundos después (su teléfono no sabe del de Eli)');
    // Y el pase C: Eli primero, Dora después (para subir al revés).
    await escanear(a2, qrDe(T.c)); await dormir(1500); await escanear(a1, qrDe(T.c));
    // Un pase H que se devuelve mientras no hay señal: el teléfono no lo sabe y lo deja entrar.
    sql(`update tickets set status = 'refunded' where id = ${T.h}`);
    ok(/VÁLIDO/.test(await escanear(a1, qrDe(T.h))), 'un pase devuelto MIENTRAS no había señal: el teléfono no lo sabe → lo deja entrar');
    // Buscar sin señal (nombre o últimos 4) → entrada a mano con motivo.
    await clic(btn(a1, 'Buscar'));
    if (!(await espera(async () => !!(await vis(a1.locator('input'))), 8000))) await clic(a1.getByText('BUSCAR', { exact: true }));
    ok(await contiene(a1, 'SIN CONEXIÓN', 15000), `Buscar sin señal (${new URL(a1.url()).pathname})`);
    const c4 = sql(`select right(code, 4) from tickets where id = ${T.i}`);
    await (await vis(a1.locator('input[type="search"], input'))).fill(c4);
    ok(await contiene(a1, `··${c4}`, 10000), `buscar por los últimos 4 (${c4}) en la lista del teléfono`);
    await a1.screenshot({ path: OUT + 'e6h-puerta-buscar-sinconexion-390.png', fullPage: true });
    await clic(btn(a1, 'Dejar entrar'));
    await clic(a1.locator('xpath=//span[normalize-space()="¿POR QUÉ ENTRA SIN ESCANEAR?"]/ancestor::div[1]//*[normalize-space()="No trajo el QR"]'));
    await clic(btn(a1, /^Entró$/));
    ok(await contiene(a1, 'Listo') || await contiene(a1, 'Entró:'), 'entrada a mano sin señal con motivo → a la cola');
    ok(sql(`select count(*) from ticket_scans where ticket_id in (${T.a}, ${T.b}, ${T.c}, ${T.h}, ${T.i})`) === '0', 'nada llegó al servidor todavía');
    // La cola en el teléfono también va cifrada.
    const R2 = await crudo(a1);
    ok(R2.cola.length >= 13 && R2.cola.every((x) => x.c && !Buffer.from(x.c).toString('latin1').includes('TL1.')), `la cola (${R2.cola.length}) va cifrada: los QR no se leen en la base del teléfono`);

    // ── 5 · Vuelve la señal: Dora sube primero, después Eli (con su reloj corregido) ──
    await ca1.setOffline(false);
    ok(await espera(async () => sql(`select count(*) from ticket_scans where session_id = ${SA} and offline`) === String(R2.cola.length), 40000), `Dora sube su cola (${R2.cola.length} escaneos) al volver la señal`);
    ok(await contiene(a1, 'EN LÍNEA', 20000) && await espera(async () => !(await texto(a1)).includes('POR SUBIR'), 20000), 'arriba vuelve «EN LÍNEA» y ya no hay nada por subir');
    ok(sql(`select resolution from ticket_scans_ef where ticket_id = ${T.b} and session_id = ${SA}`) === 'accepted', 'el pase B queda aceptado por Dora (todavía no subió Eli)');
    ok(sql(`select result || '|' || resolution from ticket_scans where ticket_id = ${T.h}`) === 'refunded|rejected' && sql(`select count(*) from door_incidents where kind = 'sin_valor' and auto and ticket_id = ${T.h}`) === '1', 'el pase devuelto mientras no había señal → rejected + incidencia «entró con un boleto que ya no valía»');
    ok(sql(`select result || '|' || offline from ticket_scans where ticket_id = ${T.i}`) === 'manual|true', 'la entrada a mano sin señal queda «a mano» y marcada sin conexión');
    ok(sql(`select string_agg(distinct result, ',' order by result) from ticket_scans where session_id = ${SA} and resolution = 'rejected'`).split(',').filter((x) => ['forged', 'replaced', 'refunded', 'pending_transfer', 'wrong_day', 'wrong_event', 'not_found'].includes(x)).length === 7, 'los rechazos sin señal también quedan en la auditoría (QR no válido, anulado, devuelto, en transferencia, otro día, otro evento, no encontrado)');
    await ca2.setOffline(false);
    ok(await espera(async () => sql(`select count(*) from ticket_scans where session_id = ${SB} and offline`) === '2', 40000), 'Eli sube su cola (2 escaneos)');
    const ganaB = sql(`select door_name from ticket_scans_ef where ticket_id = ${T.b} and resolution = 'accepted'`), dupB = sql(`select door_name from ticket_scans_ef where ticket_id = ${T.b} and resolution = 'duplicate'`);
    ok(ganaB === 'VIP' && dupB === 'Principal', `pase B: gana Eli (VIP: la primera por la hora CORREGIDA, aunque subió después) y Dora queda «duplicate» (la base lo corrigió: ticket_scan_fixes)`);
    ok(sql(`select entered_n || '|' || first_door from ticket_entries where ticket_id = ${T.b}`) === '1|VIP' && sql(`select status from tickets where id = ${T.b}`) === 'used', 'una sola entrada (1 de 1), la primera por VIP');
    const off = Number(sql(`select clock_offset_ms from door_sessions where id = ${SB}`));
    ok(off < -400000 && off > -440000 && sql(`select bool_and(skew) from ticket_scans where session_id = ${SB}`) === 't', `el desfase del reloj de Eli queda medido (${Math.round(off / 1000)} s) y sus escaneos marcados «reloj desviado»`);
    const tB = sql(`select string_agg(to_char(at_eff, 'HH24:MI:SS'), ',' order by at_eff) from ticket_scans where ticket_id = ${T.b}`);
    ok(sql(`select (max(at_eff) - min(at_eff)) < interval '30 seconds' from ticket_scans where ticket_id = ${T.b}`) === 't', `las horas corregidas quedan juntas (${tB}): sin corregir, la de Eli estaría 7 min después`);
    ok(sql(`select count(*) from door_incidents where kind = 'duplicado' and auto and ticket_id = ${T.b} and status = 'open'`) === '1', 'una incidencia «duplicado» para el pase B (abierta, con las dos puertas)');
    ok(sql(`select resolution from ticket_scans_ef where ticket_id = ${T.c} and door_name = 'VIP'`) === 'accepted' && sql(`select resolution from ticket_scans_ef where ticket_id = ${T.c} and door_name = 'Principal'`) === 'duplicate', 'pase C (el mismo caso): mismo resultado — gana VIP, Principal «duplicate»');
    ok(sql(`select sum(entered_n) from door_counts where event_date_id = ${F1}`) === sql(`select entered_n from event_dates where id = ${F1}`) && sql(`select entered_n from door_counts where event_date_id = ${F1} and door_name = 'VIP'`) === '2', 'los contadores por puerta y de la fecha cuadran (VIP 2 entradas: B y C; Principal no las cuenta)');
    ok(sql(`select count(*) from door_syncs where session_id in (${SA}, ${SB})`) !== '0' && sql(`select bool_or(skew) from door_syncs where session_id = ${SB}`) === 't', 'cada subida queda en door_syncs (solo inserción) con el desfase marcado');

    // ── 6 · Determinista: la misma pareja subida en el otro orden da lo mismo (pase J: Eli sube primero, después Dora) ──
    await ca1.setOffline(true); await ca2.setOffline(true);
    await contiene(a1, 'SIN CONEXIÓN', 15000); await contiene(a2, 'SIN CONEXIÓN', 15000);
    await a2.goto(B + `/puerta/s/${SB}`).catch(() => undefined); await a1.goto(B + `/puerta/s/${SA}`).catch(() => undefined);
    ok(await contiene(a1, 'Noche sin señal', 20000) && /\/puerta\/sin-conexion/.test(a1.url()), `la app abierta en frío sin señal → el service worker lleva a la cáscara (${new URL(a1.url()).pathname}) con la puerta guardada`);
    await a1.screenshot({ path: OUT + 'e6h-puerta-cascara-390.png' });
    r = await escanear(a2, qrDe(T.j)); await dormir(1500);
    ok(/VÁLIDO/.test(r) && /VÁLIDO/.test(await escanear(a1, qrDe(T.j))), 'en la cáscara sin señal: Eli y después Dora dejan entrar el pase J');
    await ca2.setOffline(false);
    ok(await espera(async () => sql(`select count(*) from ticket_scans where ticket_id = ${T.j} and session_id = ${SB}`) === '1', 40000), 'esta vez Eli sube primero');
    await ca1.setOffline(false);
    ok(await espera(async () => sql(`select count(*) from ticket_scans where ticket_id = ${T.j}`) === '2', 40000), 'y después Dora');
    ok(sql(`select door_name from ticket_scans_ef where ticket_id = ${T.j} and resolution = 'accepted'`) === 'VIP' && sql(`select door_name from ticket_scans_ef where ticket_id = ${T.j} and resolution = 'duplicate'`) === 'Principal' && sql(`select count(*) from ticket_scan_fixes where ticket_id = ${T.j}`) === '0',
      'subidos al revés: el MISMO resultado (gana VIP, Principal «duplicate»), esta vez sin corrección');
    ok(await contiene(a1, 'Volver a la puerta', 20000), 'la cáscara: «Volvió la señal y todo está subido · Volver a la puerta»');
    await clic(btn(a1, 'Volver a la puerta')); await a1.waitForURL(new RegExp(`/puerta/s/${SA}`));

    // ── 7 · La misma cola otra vez no cambia nada; un boleto de otro negocio u otro día metido en la cola no entra ──
    const antes = sql(`select entered_n || '|' || inside_n from event_dates where id = ${F1}`) + '/' + sql(`select count(*) from ticket_scans where event_date_id = ${F1}`) + '/' + sql(`select count(*) from ticket_scan_fixes where event_date_id = ${F1}`) + '/' + sql(`select count(*) from door_incidents where event_date_id = ${F1}`);
    let rep = 0;
    for (const body of colas.a1.concat(colas.a2)) { const b = JSON.parse(body); const c = await api(b.sesion === SA ? a1 : a2, '/api/puerta/escanear', b); rep += (c.hechos || []).filter((h) => h.estado === 'repetido').length; }
    const despues = sql(`select entered_n || '|' || inside_n from event_dates where id = ${F1}`) + '/' + sql(`select count(*) from ticket_scans where event_date_id = ${F1}`) + '/' + sql(`select count(*) from ticket_scan_fixes where event_date_id = ${F1}`) + '/' + sql(`select count(*) from door_incidents where event_date_id = ${F1}`);
    ok(antes === despues && rep > 10, `las colas subidas otra vez (${rep} escaneos «repetido»): ni una entrada, escaneo, corrección ni incidencia más (${despues})`);
    const ajena = await api(a1, '/api/puerta/escanear', { tipo: 'cola', sesion: SA, ahora: Date.now(), escaneos: [
      { id: uuid(), at: Date.now(), tipo: 'boleto', boleto: T.par, motivo: 'No trajo el QR', dir: 'in', n: 1, entro: true, res: 'manual' },
      { id: uuid(), at: Date.now(), tipo: 'qr', qr: qrDe(T.par), dir: 'in', n: 1, entro: true, res: 'valid' },
      { id: uuid(), at: Date.now(), tipo: 'qr', qr: qrDe(T.d2), dir: 'in', n: 1, entro: true, res: 'valid' }] });
    ok(ajena.ok && ajena.hechos.map((h) => h.res).join(',') === 'wrong_event,wrong_event,wrong_day' && ajena.hechos.every((h) => h.resolucion === 'rejected'), 'una cola que dice que entró un boleto de la Parroquia (a mano o por QR) o el «Día 2» → wrong_event / wrong_day, rechazados');
    ok(sql(`select count(*) from ticket_entries where ticket_id in (${T.par}, ${T.d2})`) === '0' && sql(`select status from tickets where id = ${T.par}`) === 'valid' && sql(`select count(*) from ticket_scans where ticket_id = ${T.par}`) === '0', 'el boleto de la Parroquia sigue válido y sin escaneo a su nombre en La Terraza');
    const idAjeno = sql(`select id from ticket_scans where session_id = ${SB} limit 1`);
    const rj = await api(a1, '/api/puerta/escanear', { tipo: 'cola', sesion: SA, ahora: Date.now(), escaneos: [{ id: idAjeno, at: Date.now(), tipo: 'qr', qr: qrDe(T.a), dir: 'in', n: 1, entro: true, res: 'valid' }] });
    ok(rj.ok && rj.hechos[0].estado === 'ajeno' && !rj.hechos[0].res, 'un id de escaneo de OTRA puerta en la cola → «ajeno», sin devolver nada de ese escaneo');
    const rjOn = await a1.evaluate(async ([s, id, qr]) => { const r = await fetch('/api/puerta/escanear', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sesion: s, tipo: 'qr', qr, id, at: Date.now() }) }); return { st: r.status, t: await r.text() }; }, [SA, idAjeno, qrDe(T.b)]);
    ok(rjOn.st === 409 && !/"v"|"res"|nombre/.test(rjOn.t), 'y en línea igual: el id de otra puerta → 409, sin el resultado de allá');
    const ajena2 = await api(a2, '/api/puerta/escanear', { tipo: 'cola', sesion: SA, ahora: Date.now(), escaneos: [{ id: uuid(), at: Date.now(), tipo: 'qr', qr: qrDe(T.e), dir: 'in', n: 1, entro: true, res: 'valid' }] });
    ok(ajena2.ok === false && ajena2.cerrada === true, 'Eli sube una cola a la puerta de Dora → no es suya');

    // ── 8 · Panel y Super Admin: lo de sin conexión marcado, los repetidos con su incidencia, «Revocar este teléfono» ──
    const cn = await ctx(1360, 900), pn = await cn.newPage(); pn.on('pageerror', (e) => err.push('pn ' + e.message)); pn.on('dialog', (d) => d.accept()); await entrar(pn, TERRAZA);
    await pn.goto(B + `/panel/${NEG}/eventos?det=door:${EV}@${F1}`);
    ok(await contiene(pn, 'MONITOR EN VIVO', 20000) && await contiene(pn, 'sin conexión (subió') && await contiene(pn, 'Entró dos veces (sin conexión)') && await contiene(pn, 'ya había entrado por VIP'), 'panel › modo puerta: cada teléfono con «N sin conexión (subió …)» y la incidencia «Entró dos veces (sin conexión)» con las dos puertas');
    ok(await contiene(pn, 'Entró sin conexión con un boleto que ya no valía') && await contiene(pn, 'REPETIDO'), 'y «Entró sin conexión con un boleto que ya no valía»; en ÚLTIMOS, «REPETIDO · … · sin conexión»');
    ok(await contiene(pn, 'reloj adelantado 7 min'), 'el teléfono de Eli sale con «reloj adelantado 7 min»');
    await pn.screenshot({ path: OUT + 'e6h-panel-monitor-1360.png', fullPage: true });
    const ca = await ctx(1360, 900), pa = await ca.newPage(); pa.on('pageerror', (e) => err.push('pa ' + e.message)); await entrar(pa, ADM);
    await pa.goto(B + `/admin/eventos/puerta?fecha=${F1}`);
    ok(await contiene(pa, 'SESIONES DE PORTERO · CADA UNA ES UN TELÉFONO', 20000) && await contiene(pa, 'sin conexión') && await contiene(pa, 'Entró dos veces (sin conexión)'), 'Super Admin › Modo puerta: sesiones con lo subido sin conexión y la incidencia de duplicado');
    await pa.screenshot({ path: OUT + 'e6h-admin-puerta-1360.png', fullPage: true });
    await pa.goto(B + `/admin/eventos/boleto/${sql(`select code from tickets where id = ${T.b}`)}`);
    ok(await contiene(pa, 'ESCANEOS EN LA PUERTA', 20000) && await contiene(pa, 'REPETIDO · SIN CONEXIÓN') && await contiene(pa, 'HORA DEL TELÉFONO CORREGIDA') && await contiene(pa, 'RELOJ DESVIADO') && await contiene(pa, 'DECIDIDO OTRA VEZ'), 'la ficha del boleto B: VÁLIDO (VIP) y REPETIDO · SIN CONEXIÓN, con la hora corregida, el reloj desviado y «decidido otra vez»');
    await pa.screenshot({ path: OUT + 'e6h-admin-boleto-1360.png', fullPage: true });

    // ── 9 · Cerrar la puerta: sube todo y borra lo guardado; el paquete ya no sale ──
    await a2.goto(B + `/puerta/s/${SB}?t=cierre`);
    await clic(btn(a2, 'Cerrar mi puerta'));
    await a2.waitForURL(/\/puerta$/, { timeout: 20000 });
    ok(sql(`select ended_by from door_sessions where id = ${SB}`) === 'self' && sql(`select revoked_reason from door_packages where session_id = ${SB} order by id desc limit 1`) === 'self', 'Eli cierra su puerta: la sesión y su paquete quedan cerrados (revocado «self»)');
    const R3 = await crudo(a2);
    ok(R3 && !R3.paquetes.some((x) => x.s === SB) && !R3.llaves.some((x) => x.s === SB) && !R3.cola.length, 'en el teléfono de Eli no queda nada de esa puerta (paquete, llave ni cola)');
    const pc = await api(a2, '/api/puerta/paquete', { sesion: SB, llave: true });
    ok(pc.ok === false && pc.cerrada === true && !pc.c && !pc.llave, 'el paquete (y la llave) de una puerta cerrada ya no salen');

    // ── 10 · «Revocar este teléfono»: lo que no subió no cuenta y el teléfono lo borra ──
    await ca1.setOffline(true); await contiene(a1, 'SIN CONEXIÓN', 15000);
    await a1.goto(B + `/puerta/s/${SA}`).catch(() => undefined);
    ok(await contiene(a1, 'Noche sin señal', 20000) && /VÁLIDO/.test(await escanear(a1, qrDe(T.e))), 'Dora, sin señal, deja entrar el pase E (con su QR nuevo): queda en su cola');
    const enCola = (await crudo(a1)).cola.length;
    await pn.goto(B + `/panel/${NEG}/eventos?det=door:${EV}@${F1}`);
    await clic(btn(pn, 'Revocar este teléfono'));
    ok(await espera(async () => sql(`select ended_by from door_sessions where id = ${SA}`) === 'revoked'), 'el dueño toca «Revocar este teléfono» (el de Dora)');
    ok(await contiene(pn, 'REVOCADO', 15000), 'el Monitor lo muestra REVOCADO');
    const nAntes = sql(`select count(*) from ticket_scans where session_id = ${SA}`);
    await ca1.setOffline(false);
    ok(enCola >= 1 && await espera(async () => { const x = await crudo(a1).catch(() => null); return !!x && !x.paquetes.some((y) => y.s === SA) && !x.cola.length; }, 40000), `vuelve la señal: el teléfono de Dora se entera y borra el paquete, la llave y la cola (${enCola} sin subir)`);
    ok(sql(`select count(*) from ticket_scans where session_id = ${SA}`) === nAntes, 'lo que tenía sin subir NO entró (revocado)');
    ok(await contiene(a1, 'nada de ella quedó en este teléfono', 20000), 'su pantalla: «Esta puerta se cerró o se revocó: nada de ella quedó en este teléfono»');
    ok(sql(`select count(*) from ticket_scans_ef where ticket_id = ${T.e} and resolution = 'accepted'`) === '0' && sql(`select status from tickets where id = ${T.e}`) === 'valid', 'el pase E sigue válido (esa entrada no cuenta)');
    const rv = await api(a1, '/api/puerta/escanear', { tipo: 'cola', sesion: SA, ahora: Date.now(), escaneos: [{ id: uuid(), at: Date.now(), tipo: 'qr', qr: qrDe(T.e), dir: 'in', n: 1, entro: true, res: 'valid' }] });
    ok(rv.ok === false && rv.revocada === true, 'una cola de un teléfono revocado → 403 «revocado»');

    // ── 11 · El paquete vence: el teléfono lo borra; el barrido lo deja revocado ──
    const SC = await abrir(a1, 'Terraza');
    await contiene(a1, 'EN LÍNEA', 20000); await espera(async () => (await crudo(a1)).paquetes.some((x) => x.s === SC));
    await ca1.setOffline(true); await contiene(a1, 'SIN CONEXIÓN', 15000);
    await a1.evaluate(() => { const N = Date.now.bind(Date); Date.now = () => N() + 40 * 3600 * 1000; });
    await a1.goto(B + '/puerta/sin-conexion').catch(() => undefined);
    await a1.addInitScript(() => { const N = Date.now.bind(Date); Date.now = () => N() + 40 * 3600 * 1000; });
    await a1.reload().catch(() => undefined);
    ok(await contiene(a1, 'No hay puertas guardadas', 20000) && !(await crudo(a1)).paquetes.length, 'con el reloj pasado el vencimiento, la cáscara sin señal ya no muestra la puerta y la borra del teléfono');
    await ca1.setOffline(false);
    execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -c "set session_replication_role = replica; update door_packages set expires_at = now() - interval '1 minute' where session_id = ${SC}; set session_replication_role = origin;"`, { stdio: 'ignore' });
    execSync(`curl -s -X POST -H 'x-barrido-token: ${ENT.TOK}' ${B}/api/interno/barrido`, { stdio: 'ignore' });
    ok(sql(`select revoked_reason from door_packages where session_id = ${SC}`) === 'vencido', 'el barrido deja el paquete vencido revocado («vencido»): ya no se pone al día');

    // ── 12 · Mi cuenta: el QR sin señal, y nada al salir ni para otra cuenta ──
    const cc1 = await ctx(390, 844, true), c1 = await cc1.newPage(); c1.on('pageerror', (e) => err.push('c1 ' + e.message)); await entrar(c1, C1);
    const CODE = sql(`select code from tickets where id = ${T.d}`) ; // de C2: no se ve con C1
    const CODEA = sql(`select code from tickets where id = ${T.e}`), QRA = qrDe(T.e);
    await c1.goto(B + `/cuenta/boletos/${CODEA}`);
    ok(await contiene(c1, 'Guardado en este teléfono: se abre sin señal', 20000), 'C1 abre su boleto con señal: «Guardado en este teléfono: se abre sin señal»');
    await espera(async () => (await c1.evaluate(() => navigator.serviceWorker.getRegistration('/cuenta/boletos').then((r) => !!(r && r.active)))), 20000);
    await espera(async () => (await c1.evaluate(() => caches.open('tl-boletos-v1').then((c) => c.match('/cuenta/boletos/sin-conexion')).then((r) => !!r))), 20000);
    const guardado = await c1.evaluate(() => new Promise((ok) => { const r = indexedDB.open('tl-boletos'); r.onsuccess = () => { const q = r.result.transaction('b').objectStore('b').getAll(); q.onsuccess = () => ok(q.result.map((x) => ({ code: x.code, c: Array.from(new Uint8Array(x.c)).slice(0, 3000) }))); }; }));
    ok(guardado.length === 1 && guardado[0].code === CODEA && !Buffer.from(guardado[0].c).toString('latin1').includes('Noche'), 'en el teléfono queda ese boleto, cifrado');
    await cc1.setOffline(true);
    await c1.goto(B + `/cuenta/boletos/${CODEA}`).catch(() => undefined);
    ok(await contiene(c1, 'SIN CONEXIÓN', 20000) && /\/cuenta\/boletos\/sin-conexion/.test(c1.url()), 'sin señal, abrir el boleto → la cáscara de Mis boletos (service worker)');
    await espera(async () => !!(await leerQR(c1, '[data-pantalla="USR-BOLETO-SIN-SENAL"]')));
    ok(await leerQR(c1, '[data-pantalla="USR-BOLETO-SIN-SENAL"]') === QRA && await contiene(c1, CODEA), 'el QR sin señal (leído con jsQR) es el que firma el servidor, con su código');
    await c1.screenshot({ path: OUT + 'e6h-boleto-sinconexion-390.png', fullPage: true });
    await cc1.setOffline(false);
    // Otra cuenta en el MISMO teléfono (sin salir de C1): no ve el boleto de C1.
    await entrar(c1, C2);
    await cc1.setOffline(true);
    await c1.goto(B + '/cuenta/boletos/sin-conexion').catch(() => undefined);
    ok(await contiene(c1, 'No hay boletos guardados en este teléfono', 20000) && !(await texto(c1)).includes(CODEA), 'otra cuenta (C2) en el mismo teléfono, sin señal: no ve el boleto de C1');
    await cc1.setOffline(false);
    await entrar(c1, C1); await c1.goto(B + `/cuenta/boletos/${CODEA}`); await contiene(c1, 'Guardado en este teléfono', 20000);
    // Salir de la cuenta: la base y la cookie se borran.
    await c1.goto(B + '/cuenta/ajustes');
    await clic(c1.getByText('Cerrar sesión', { exact: true }).first()); await dormir(600);
    await c1.getByText('Cerrar sesión', { exact: true }).last().click();
    await c1.waitForURL(/\/entrar/, { timeout: 20000 });
    const quedan = await c1.evaluate(() => indexedDB.databases ? indexedDB.databases().then((d) => d.map((x) => x.name)) : []);
    ok(!quedan.includes('tl-boletos') && !(await cc1.cookies()).some((x) => x.name === 'tl_bk'), 'al salir de la cuenta: la base de boletos y la llave (cookie) se borran');
    await cc1.setOffline(true);
    await c1.goto(B + '/cuenta/boletos/sin-conexion').catch(() => undefined);
    ok(await contiene(c1, 'No hay boletos guardados en este teléfono', 20000), 'y sin señal ya no se ve nada');
    await c1.screenshot({ path: OUT + 'e6h-boleto-sinconexion-vacio-390.png', fullPage: true });
    await cc1.close();
    // Pantallas de escritorio (Mi cuenta y la cáscara de la puerta también se ven en 1360).
    const cd = await ctx(1360, 900), pd = await cd.newPage(); await entrar(pd, C1); await pd.goto(B + `/cuenta/boletos/${CODEA}`); await contiene(pd, 'Guardado en este teléfono', 20000);
    await pd.screenshot({ path: OUT + 'e6h-boleto-guardado-1360.png', fullPage: true });
    await espera(async () => (await pd.evaluate(() => caches.open('tl-boletos-v1').then((c) => c.match('/cuenta/boletos/sin-conexion')).then((r) => !!r))), 20000);
    await cd.setOffline(true); await pd.goto(B + `/cuenta/boletos/${CODEA}`).catch(() => undefined);
    ok(await contiene(pd, 'SIN CONEXIÓN', 20000) && await contiene(pd, CODEA), 'en escritorio, lo mismo: el boleto sin señal desde la cáscara');
    await pd.screenshot({ path: OUT + 'e6h-boleto-sinconexion-1360.png', fullPage: true }); await cd.close();
    void CODE;

    ok(!err.length, `sin errores de página (${err.length ? err.join(' | ') : 'ninguno'})`);
  } finally {
    limpiar();
    await br.close();
  }
  console.log(`\n${n} ✓ evt6h`);
})().catch((e) => { console.error(e); process.exit(1); });
