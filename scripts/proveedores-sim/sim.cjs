/* 23 nov · Simulador de las LECTURAS de «Probar» (Super Admin › Sistema › Integraciones › Proveedores): lo que cada proveedor contesta a la llamada más barata
   que hace el botón, con la forma de su especificación. Un puerto por proveedor (pruebas/lib/puertos.cjs: provStripe, provTelnyx, provMeta); el servidor de
   pruebas los llama por STRIPE_API_BASE, TELNYX_API_BASE y WHATSAPP_API_BASE (pruebas/servir/servir.sh; las tres, PROHIBIDAS en producción: infra/comun/secretos.json).
   - Stripe  GET /v1/balance                      200 { object: "balance", available[], pending[], livemode } · 401 { error: { type: "invalid_request_error" } }
   - Telnyx  GET /v2/balance                      200 { data: UserBalance (spec3.json) }                     · 401 { errors: [{ code: "10009", title, detail }] }
   - Meta    GET /{versión}/{WABA}?fields=id      200 { id }                                                 · 401 { error: { type: "OAuthException", code: 190, error_subcode: 463 } }
             (la especificación fijada en scripts/contrato-canales/correr.sh: GET /{Version}/{WABA-ID}, 401 con código 190; un WABA que no es el de la cuenta: 400, código 100)
   Solo contesta con 200 a la llave que la prueba le dio con `aceptar`; cualquier otra, 401 (o el código de su especificación). Lo que se le dio vive SOLO en la
   memoria de este proceso. Registra cada llamada con la HUELLA (sha256) de lo que llegó firmado, nunca el valor, para que la prueba compare huellas sin imprimir
   la llave. Sin dependencias. Se usa desde la prueba de punta a punta (prov9v): `const sim = await require('.../proveedores-sim/sim.cjs').iniciar({ stripe: 4410, … })`. */
'use strict';
const http = require('http'), crypto = require('crypto');
const huella = (v) => crypto.createHash('sha256').update(String(v), 'utf8').digest('hex');
const fin = (res, estado, cuerpo) => { res.writeHead(estado, { 'content-type': 'application/json' }); res.end(JSON.stringify(cuerpo)); };
const bearer = (h) => { const m = /^Bearer\s+(\S+)$/i.exec(String(h ?? '')); return m ? m[1] : null; };
// Stripe también acepta la llave como usuario de Basic (curl -u sk_test_…:); Telnyx y Meta, solo Bearer.
const llaveStripe = (h) => { const b = bearer(h); if (b) return b; const m = /^Basic\s+(\S+)$/i.exec(String(h ?? '')); return m ? Buffer.from(m[1], 'base64').toString('utf8').split(':')[0] || null : null; };

async function iniciar(puertos, host = '127.0.0.1') {
  const buenas = { stripe: new Set(), telnyx: new Set(), meta: new Set() }; // huellas de las llaves que sí sirven
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
  const servidores = Object.entries({ stripe, telnyx, meta }).filter(([p]) => puertos[p] !== undefined).map(([p, f]) => [p, http.createServer(f)]);
  await Promise.all(servidores.map(([p, s]) => new Promise((ok, mal) => { s.once('error', mal); s.listen(puertos[p], host, ok); })));
  return {
    /* Esta llave sirve (prov: stripe | telnyx | meta). Para Meta, `extra.waba` es el ID de la cuenta de negocio que existe. */
    aceptar(prov, valor, extra = {}) { buenas[prov].add(huella(valor)); if (prov === 'meta' && extra.waba) wabas.add(String(extra.waba)); },
    retirar(prov, valor) { buenas[prov].delete(huella(valor)); },
    registro,
    /* Las llamadas de un proveedor, de la más vieja a la más nueva; con `h` (huella sha256 hex), solo las firmadas con esa llave. */
    llamadas(prov, h) { return registro.filter((x) => x.prov === prov && (h === undefined || x.huella === h)); },
    huella,
    cerrar() { return Promise.all(servidores.map(([, s]) => new Promise((ok) => { s.close(ok); s.closeAllConnections?.(); }))); },
  };
}

module.exports = { iniciar, huella };
