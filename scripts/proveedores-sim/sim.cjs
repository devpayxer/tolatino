/* 23 nov · Simulador de las LECTURAS de «Probar» (Super Admin › Sistema › Integraciones › Proveedores): lo que cada proveedor contesta a la llamada más barata
   que hace el botón, con la forma de su especificación. Un puerto por proveedor (pruebas/lib/puertos.cjs: provStripe, provTelnyx, provMeta, provSes,
   provAnthropic); el servidor de pruebas los llama por STRIPE_API_BASE, TELNYX_API_BASE, WHATSAPP_API_BASE, SES_API_BASE y ANTHROPIC_API_BASE
   (pruebas/servir/servir.sh; las cinco, PROHIBIDAS en producción: infra/comun/secretos.json).
   - Stripe  GET /v1/balance                      200 { object: "balance", available[], pending[], livemode } · 401 { error: { type: "invalid_request_error" } }
   - Telnyx  GET /v2/balance                      200 { data: UserBalance (spec3.json) }                     · 401 { errors: [{ code: "10009", title, detail }] }
   - Meta    GET /{versión}/{WABA}?fields=id      200 { id }                                                 · 401 { error: { type: "OAuthException", code: 190, error_subcode: 463 } }
             (la especificación fijada en scripts/contrato-canales/correr.sh: GET /{Version}/{WABA-ID}, 401 con código 190; un WABA que no es el de la cuenta: 400, código 100)
   - SES     GET /v2/email/account                200 GetAccount (SendQuota, SendingEnabled, ProductionAccessEnabled, EnforcementStatus…)
             · 403 { message } con x-amzn-ErrorType: UnrecognizedClientException (ID que no conoce) o SignatureDoesNotMatch (firma que no cuadra).
             La firma SigV4 se RECALCULA aquí con la llave secreta que la prueba dio para ESE ID (método, ruta, consulta, las cabeceras firmadas tal como
             llegaron —host incluido, en orden y sin repetir—, el hash del cuerpo, la fecha y el alcance región/ses): una firma hecha con otra llave o para otro host no pasa.
             (Los campos de GetAccount, de memoria de la referencia de la API v2 de SES: no se pudo leer en línea el 23 nov; la app solo lee el estado HTTP.)
   - IA      GET /v1/models                       200 { data: [{ type: "model", id, display_name, created_at }], has_more, first_id, last_id }
             · 401 { type: "error", error: { type: "authentication_error" } } · sin anthropic-version: 400 · /v1/messages NO se simula: 404 (el motor de
             pruebas de El Compa es lib/compa/modelo-simulador.ts).
   Solo contesta con 200 a la llave que la prueba le dio con `aceptar`; cualquier otra, 401 (o el código de su especificación). Lo que se le dio vive SOLO en la
   memoria de este proceso. Registra cada llamada con la HUELLA (sha256) de lo que llegó firmado, nunca el valor, para que la prueba compare huellas sin imprimir
   la llave. Sin dependencias. Se usa desde la prueba de punta a punta (prov9v): `const sim = await require('.../proveedores-sim/sim.cjs').iniciar({ stripe: 4410, … })`. */
'use strict';
const http = require('http'), crypto = require('crypto');
const huella = (v) => crypto.createHash('sha256').update(String(v), 'utf8').digest('hex');
const fin = (res, estado, cuerpo) => { res.writeHead(estado, { 'content-type': 'application/json' }); res.end(JSON.stringify(cuerpo)); };
const bearer = (h) => { const m = /^Bearer\s+(\S+)$/i.exec(String(h ?? '')); return m ? m[1] : null; };
const igual = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const hmac = (k, s) => crypto.createHmac('sha256', k).update(s, 'utf8').digest();
const cuerpoDe = (req) => new Promise((ok) => { const c = []; req.on('data', (x) => c.push(x)); req.on('end', () => ok(Buffer.concat(c))); req.on('error', () => ok(Buffer.alloc(0))); });
// SigV4, del lado del que recibe: la cadena canónica sale de lo que LLEGÓ (no de lo que la app quiso mandar).
const rfc3986 = (x) => encodeURIComponent(x).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
function firmaSigV4(req, u, cuerpo, f, secreto) {
  const consulta = [...u.searchParams].map(([k, v]) => [rfc3986(k), rfc3986(v)]).sort((a, b) => (a[0] === b[0] ? (a[1] < b[1] ? -1 : 1) : a[0] < b[0] ? -1 : 1)).map(([k, v]) => `${k}=${v}`).join('&');
  const nombres = f.firmados.split(';');
  const canon = nombres.map((k) => `${k}:${String(req.headers[k] ?? '').trim().replace(/\s+/g, ' ')}\n`).join('');
  const pedido = [req.method, u.pathname, consulta, canon, f.firmados, crypto.createHash('sha256').update(cuerpo).digest('hex')].join('\n');
  const alcance = `${f.dia}/${f.region}/${f.servicio}/aws4_request`;
  const sts = ['AWS4-HMAC-SHA256', req.headers['x-amz-date'], alcance, crypto.createHash('sha256').update(pedido, 'utf8').digest('hex')].join('\n');
  const kFirma = hmac(hmac(hmac(hmac(`AWS4${secreto}`, f.dia), f.region), f.servicio), 'aws4_request');
  return crypto.createHmac('sha256', kFirma).update(sts, 'utf8').digest('hex');
}
const credencial = (h) => { const m = /^AWS4-HMAC-SHA256 Credential=([A-Z0-9]+)\/(\d{8})\/([a-z0-9-]+)\/([a-z0-9]+)\/aws4_request, SignedHeaders=([a-z0-9;-]+), Signature=([0-9a-f]{64})$/.exec(String(h ?? '')); return m ? { id: m[1], dia: m[2], region: m[3], servicio: m[4], firmados: m[5], firma: m[6] } : null; };
// Stripe también acepta la llave como usuario de Basic (curl -u sk_test_…:); Telnyx y Meta, solo Bearer.
const llaveStripe = (h) => { const b = bearer(h); if (b) return b; const m = /^Basic\s+(\S+)$/i.exec(String(h ?? '')); return m ? Buffer.from(m[1], 'base64').toString('utf8').split(':')[0] || null : null; };

async function iniciar(puertos, host = '127.0.0.1') {
  const buenas = { stripe: new Set(), telnyx: new Set(), meta: new Set(), anthropic: new Set() }; // huellas de las llaves que sí sirven
  const ses = new Map(); // huella del ID de la llave de acceso → su llave secreta (para RECALCULAR la firma; solo en la memoria de este proceso)
  const wabas = new Set(); // los ID de cuenta de negocio de Meta que existen
  const registro = []; // { prov, metodo, ruta, huella (de lo que llegó firmado, o null), estado }
  const anota = (prov, req, h, estado) => { registro.push({ prov, metodo: req.method, ruta: req.url.split('?')[0], huella: h ? huella(h) : null, estado }); };

  const stripe = (req, res) => {
    const u = new URL(req.url, 'http://x'), k = llaveStripe(req.headers.authorization);
    let est, cuerpo;
    if (req.method !== 'GET' || u.pathname !== '/v1/balance') { est = 404; cuerpo = { error: { type: 'invalid_request_error', message: `Unrecognized request URL (${req.method}: ${u.pathname}).` } }; }
    else if (!k || !buenas.stripe.has(huella(k))) { est = 401; cuerpo = { error: { type: 'invalid_request_error', message: k ? 'Invalid API Key provided.' : 'You did not provide an API key.' } }; }
    else { est = 200; cuerpo = { object: 'balance', available: [{ amount: 0, currency: 'usd', source_types: { card: 0 } }], livemode: false, pending: [{ amount: 0, currency: 'usd', source_types: { card: 0 } }] }; }
    anota('stripe', req, k, est); fin(res, est, cuerpo);
  };
  const telnyx = (req, res) => {
    const u = new URL(req.url, 'http://x'), k = bearer(req.headers.authorization);
    let est, cuerpo;
    if (req.method !== 'GET' || u.pathname !== '/v2/balance') { est = 404; cuerpo = { errors: [{ code: '10005', title: 'Resource not found', detail: 'The requested resource or URL could not be found.' }] }; }
    else if (!k || !buenas.telnyx.has(huella(k))) { est = 401; cuerpo = { errors: [{ code: '10009', title: 'Authentication failed', detail: 'The required authentication headers were either invalid or not included in the request.' }] }; }
    else { est = 200; cuerpo = { data: { record_type: 'balance', pending: '0.00', balance: '10.00', credit_limit: '0.00', available_credit: '10.00', currency: 'USD' } }; }
    anota('telnyx', req, k, est); fin(res, est, cuerpo);
  };
  const meta = (req, res) => {
    const u = new URL(req.url, 'http://x'), k = bearer(req.headers.authorization), m = /^\/(v\d+\.\d+)\/(\d+)$/.exec(u.pathname);
    let est, cuerpo;
    if (req.method !== 'GET' || !m) { est = 404; cuerpo = { error: { message: 'Unknown path components', type: 'OAuthException', code: 2500, fbtrace_id: 'SIM' } }; }
    else if (!k || !buenas.meta.has(huella(k))) { est = 401; cuerpo = { error: { message: 'Invalid OAuth access token', type: 'OAuthException', code: 190, error_subcode: 463, fbtrace_id: 'SIM' } }; }
    else if (!wabas.has(m[2])) { est = 400; cuerpo = { error: { message: 'Unsupported get request. Object does not exist, cannot be loaded due to missing permissions, or does not support this operation.', type: 'GraphMethodException', code: 100, error_subcode: 33, fbtrace_id: 'SIM' } }; }
    else { est = 200; cuerpo = { id: m[2] }; }
    anota('meta', req, k, est); fin(res, est, cuerpo);
  };
  const sesSim = async (req, res) => {
    const u = new URL(req.url, 'http://x'), cuerpo = await cuerpoDe(req), f = credencial(req.headers.authorization);
    let est, cuerpoR, tipo = null;
    if (req.method !== 'GET' || u.pathname !== '/v2/email/account') { est = 404; tipo = 'NotFoundException'; cuerpoR = { message: 'Resource not found.' }; }
    else if (!f || !ses.has(huella(f.id))) { est = 403; tipo = 'UnrecognizedClientException'; cuerpoR = { message: 'The security token included in the request is invalid.' }; }
    else {
      const fecha = String(req.headers['x-amz-date'] ?? ''), firmados = f.firmados.split(';');
      const valida = f.servicio === 'ses' && /^\d{8}T\d{6}Z$/.test(fecha) && fecha.slice(0, 8) === f.dia && firmados.includes('host') && firmados.includes('x-amz-date') && f.firmados === [...new Set(firmados)].sort().join(';')
        && igual(firmaSigV4(req, u, cuerpo, f, ses.get(huella(f.id))), f.firma);
      if (!valida) { est = 403; tipo = 'SignatureDoesNotMatch'; cuerpoR = { message: 'The request signature we calculated does not match the signature you provided. Check your AWS Secret Access Key and signing method. Consult the service documentation for details.' }; }
      else { est = 200; cuerpoR = { DedicatedIpAutoWarmupEnabled: false, EnforcementStatus: 'HEALTHY', ProductionAccessEnabled: false, SendingEnabled: true,
        SendQuota: { Max24HourSend: 200, MaxSendRate: 1, SentLast24Hours: 0 }, SuppressionAttributes: { SuppressedReasons: ['BOUNCE', 'COMPLAINT'] } }; }
    }
    anota('ses', req, f ? f.id : null, est);
    res.writeHead(est, { 'content-type': 'application/json', ...(tipo ? { 'x-amzn-errortype': tipo } : {}) }); res.end(JSON.stringify(cuerpoR));
  };
  const anthropic = (req, res) => {
    const u = new URL(req.url, 'http://x'), k = String(req.headers['x-api-key'] ?? '') || null;
    let est, cuerpo;
    if (req.method !== 'GET' || u.pathname !== '/v1/models') { est = 404; cuerpo = { type: 'error', error: { type: 'not_found_error', message: 'Not found' } }; }
    else if (!k || !buenas.anthropic.has(huella(k))) { est = 401; cuerpo = { type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } }; }
    else if (!req.headers['anthropic-version']) { est = 400; cuerpo = { type: 'error', error: { type: 'invalid_request_error', message: 'anthropic-version: header is required' } }; }
    else { est = 200; cuerpo = { data: [{ type: 'model', id: 'modelo-del-simulador', display_name: 'Modelo del simulador', created_at: '2026-01-01T00:00:00Z' }], has_more: false, first_id: 'modelo-del-simulador', last_id: 'modelo-del-simulador' }; }
    anota('anthropic', req, k, est); fin(res, est, cuerpo);
  };
  const servidores = Object.entries({ stripe, telnyx, meta, ses: sesSim, anthropic }).filter(([p]) => puertos[p] !== undefined).map(([p, f]) => [p, http.createServer(f)]);
  await Promise.all(servidores.map(([p, s]) => new Promise((ok, mal) => { s.once('error', mal); s.listen(puertos[p], host, ok); })));
  return {
    /* Esta llave sirve (prov: stripe | telnyx | meta | ses | anthropic). Para Meta, `extra.waba` es el ID de la cuenta de negocio que existe. Para SES, `valor`
       es el ID de la llave de acceso y `extra.secreto` su llave secreta: la firma se recalcula con ella (sin secreto, el ID no se acepta). */
    aceptar(prov, valor, extra = {}) {
      if (prov === 'ses') { if (!extra.secreto) throw new Error('SES: aceptar(ID, { secreto })'); ses.set(huella(valor), String(extra.secreto)); return; }
      buenas[prov].add(huella(valor)); if (prov === 'meta' && extra.waba) wabas.add(String(extra.waba));
    },
    retirar(prov, valor) { if (prov === 'ses') ses.delete(huella(valor)); else buenas[prov].delete(huella(valor)); },
    registro,
    /* Las llamadas de un proveedor, de la más vieja a la más nueva; con `h` (huella sha256 hex), solo las firmadas con esa llave (en SES, la huella del ID que
       llegó en la credencial: el secreto nunca viaja). */
    llamadas(prov, h) { return registro.filter((x) => x.prov === prov && (h === undefined || x.huella === h)); },
    huella,
    cerrar() { return Promise.all(servidores.map(([, s]) => new Promise((ok) => { s.close(ok); s.closeAllConnections?.(); }))); },
  };
}

module.exports = { iniciar, huella };
