/* Contrato de los canales (7h): el código real de canales-proveedor.ts contra la especificación OFICIAL de Telnyx y de Meta. Un servidor
   local hace de proveedor: recibe la llamada real (método, ruta, encabezados y cuerpo) y la valida con el esquema del pedido de la
   especificación (tipos, obligatorios, enumerados, $ref). Si mandamos un campo que el proveedor no acepta o falta uno obligatorio, falla. */
const http = require('http'), fs = require('fs'), crypto = require('crypto');
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const TX = JSON.parse(fs.readFileSync(process.env.TELNYX_SPEC, 'utf8')), META = JSON.parse(fs.readFileSync(process.env.META_SPEC, 'utf8'));
const ref = (spec, r) => r.replace(/^#\//, '').split('/').reduce((o, k) => o[k.replace(/~1/g, '/').replace(/~0/g, '~')], spec);
// Validador mínimo de JSON Schema (lo que usan estas dos especificaciones para el cuerpo de un pedido).
function validar(spec, s, v, ruta = '$', err = []) {
  if (!s) return err;
  if (s.$ref) return validar(spec, ref(spec, s.$ref), v, ruta, err);
  // allOf (Meta: BaseMessageProperties + TextMessage): se unen las propiedades y los obligatorios de todas las partes; «sin más campos» vale
  // para la unión (así lo lee el proveedor: los campos de la base siguen permitidos).
  if (s.allOf) {
    const partes = s.allOf.map((x) => (x.$ref ? ref(spec, x.$ref) : x)), props = {}, req = [];
    let cerrado = false;
    for (const x of partes) { Object.assign(props, x.properties ?? {}); req.push(...(x.required ?? [])); if (x.additionalProperties === false) cerrado = true; if (x.allOf || x.oneOf) validar(spec, x, v, ruta, err); }
    return validar(spec, { type: 'object', properties: props, required: req, additionalProperties: cerrado ? false : undefined }, v, ruta, err);
  }
  // Con discriminador (Meta: «type» → TextMessage…): se valida contra la opción que nombra, con sus errores.
  if (s.discriminator?.mapping && v && typeof v === 'object' && s.discriminator.mapping[v[s.discriminator.propertyName]]) validar(spec, { $ref: s.discriminator.mapping[v[s.discriminator.propertyName]] }, v, ruta, err);
  else if (s.oneOf || s.anyOf) { const L = s.oneOf || s.anyOf; if (!L.some((x) => !validar(spec, x, v, ruta, []).length)) err.push(`${ruta}: no cumple ninguna opción`); }
  const tipo = Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v === 'number' ? (Number.isInteger(v) ? 'integer' : 'number') : typeof v;
  if (s.type && !(s.type === tipo || (s.type === 'number' && tipo === 'integer'))) { err.push(`${ruta}: es ${tipo}, se esperaba ${s.type}`); return err; }
  if (s.enum && !s.enum.includes(v)) err.push(`${ruta}: «${v}» no está en ${JSON.stringify(s.enum)}`);
  if (tipo === 'object') {
    for (const k of s.required ?? []) if (!(k in v)) err.push(`${ruta}.${k}: falta (obligatorio)`);
    const props = s.properties ?? {};
    for (const [k, x] of Object.entries(v)) {
      if (props[k]) validar(spec, props[k], x, `${ruta}.${k}`, err);
      else if (s.additionalProperties === false) err.push(`${ruta}.${k}: el proveedor no acepta este campo`);
    }
  }
  if (tipo === 'array' && s.items) v.forEach((x, i) => validar(spec, s.items, x, `${ruta}[${i}]`, err));
  return err;
}
const cuerpoDe = (spec, ruta, metodo) => { const op = spec.paths[ruta]?.[metodo]; const b = op?.requestBody?.$ref ? ref(spec, op.requestBody.$ref) : op?.requestBody; return b?.content?.['application/json']?.schema; };

(async () => {
  let ultimo = null;
  const srv = http.createServer((req, res) => { let b = ''; req.on('data', (d) => (b += d)); req.on('end', () => {
    ultimo = { metodo: req.method, ruta: req.url, h: req.headers, cuerpo: b ? JSON.parse(b) : null };
    res.setHeader('content-type', 'application/json');
    res.end(req.url.startsWith('/v2/') ? JSON.stringify({ data: { id: crypto.randomUUID(), record_type: 'message' } }) : JSON.stringify({ messaging_product: 'whatsapp', contacts: [{ input: '15705550122', wa_id: '15705550122' }], messages: [{ id: 'wamid.PRUEBA' }] }));
  }); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  Object.assign(process.env, { TELNYX_API_KEY: 'KEY_PRUEBA', TOLATINO_SMS_MODO: 'telnyx', TELNYX_API_BASE: base, WHATSAPP_TOKEN: 'EAAPRUEBA', WHATSAPP_API_BASE: base });
  const P = require(process.env.CONTRATO_OUT + '/compa/canales-proveedor.js');

  // ── Telnyx: POST /v2/messages (servidor https://api.telnyx.com/v2 + ruta /messages) ──
  ok(TX.servers.some((s) => s.url === 'https://api.telnyx.com/v2') && TX.paths['/messages']?.post, 'Telnyx: la especificación publica POST /messages en https://api.telnyx.com/v2');
  const r1 = await P.mandar('telnyx', '+15705559001', '+15705550122', 'Hola. Más: https://pruebas.tolatino.com/ayuda/reservar-mesa');
  ok(r1.ok && /^[0-9a-f-]{36}$/.test(r1.id), 'mandar (Telnyx): leyó el id del mensaje de la respuesta (data.id)');
  ok(ultimo.metodo === 'POST' && ultimo.ruta === '/v2/messages' && ultimo.h.authorization === 'Bearer KEY_PRUEBA' && /application\/json/.test(ultimo.h['content-type']), 'Telnyx: POST /v2/messages con Bearer y JSON');
  const e1 = validar(TX, cuerpoDe(TX, '/messages', 'post'), ultimo.cuerpo);
  ok(!e1.length, `Telnyx: el cuerpo cumple CreateMessageRequest${e1.length ? ' — ' + e1.join('; ') : ''}`);
  // ── La entrada de Telnyx: un message.received con el esquema publicado (InboundMessagePayload) ──
  const S = TX.components.schemas, pl = S.InboundMessagePayload ?? S.MessagingInboundMessagePayload;
  ok(pl?.properties?.from && pl.properties.to?.type === 'array' && pl.properties.text && pl.properties.id && pl.properties.direction?.enum?.includes('inbound'), 'Telnyx: InboundMessagePayload trae id, direction, from, to[] y text');
  const ej = { data: { event_type: 'message.received', id: crypto.randomUUID(), occurred_at: new Date().toISOString(), record_type: 'event',
    payload: { record_type: 'message', direction: 'inbound', id: crypto.randomUUID(), type: 'SMS', from: { phone_number: '+15705550122', carrier: 'X', line_type: 'Wireless' }, to: [{ phone_number: '+15705559001', status: 'webhook_delivered' }], text: 'hola', media: [], received_at: new Date().toISOString() } } };
  const e2 = validar(TX, pl, ej.data.payload);
  ok(!e2.length, `Telnyx: el ejemplo de entrada cumple el esquema${e2.length ? ' — ' + e2.join('; ') : ''}`);
  const L = P.leerTelnyx(ej);
  ok(L.length === 1 && L[0].de === '+15705550122' && L[0].para === '+15705559001' && L[0].texto === 'hola' && L[0].id === ej.data.payload.id, 'leerTelnyx: el id del mensaje, de, para y el texto');
  ok(!P.leerTelnyx({ data: { ...ej.data, event_type: 'message.finalized' } }).length, 'leerTelnyx: un aviso de entrega no es un mensaje');
  // ── Meta: POST /{Version}/{Phone-Number-ID}/messages ──
  const RM = '/{Version}/{Phone-Number-ID}/messages';
  ok(!!META.paths[RM]?.post && META.servers.some((s) => s.url === 'https://graph.facebook.com'), 'Meta: la especificación publica POST /{Version}/{Phone-Number-ID}/messages en https://graph.facebook.com');
  const r2 = await P.mandar('whatsapp', '100200300400', '+15705550122', 'Hola. Más: https://pruebas.tolatino.com/ayuda/reservar-mesa');
  ok(r2.ok && r2.id === 'wamid.PRUEBA', 'mandar (WhatsApp): leyó el wamid de la respuesta');
  ok(ultimo.metodo === 'POST' && /^\/v\d+\.\d+\/100200300400\/messages$/.test(ultimo.ruta) && ultimo.h.authorization === 'Bearer EAAPRUEBA', `Meta: POST ${ultimo.ruta} con Bearer`);
  ok(ultimo.ruta.startsWith('/v23.0/'), 'Meta: la versión es la de la especificación (v23.0)');
  const e3 = validar(META, cuerpoDe(META, RM, 'post'), ultimo.cuerpo);
  ok(!e3.length, `Meta: el cuerpo cumple Message${e3.length ? ' — ' + e3.join('; ') : ''}`);
  ok(ultimo.cuerpo.type === 'text' && ultimo.cuerpo.text.preview_url === false && ultimo.cuerpo.to === '15705550122', 'Meta: texto sin vista previa del enlace, «to» sin «+»');
  ok(!(await P.mandar('whatsapp', 'no-es-un-id', '+15705550122', 'x')).ok, 'Meta: un phone_number_id que no es número no se llama');
  // ── Firmas: las mismas reglas que publica cada proveedor ──
  const kp = crypto.generateKeyPairSync('ed25519'); process.env.TELNYX_PUBLIC_KEY = kp.publicKey.export({ type: 'spki', format: 'der' }).subarray(12).toString('base64');
  const cuerpo = Buffer.from(JSON.stringify(ej)), ts = String(Math.floor(Date.now() / 1000)), sig = crypto.sign(null, Buffer.from(`${ts}|${cuerpo}`), kp.privateKey).toString('base64');
  ok(P.firmaTelnyx(cuerpo, sig, ts, Number(ts), 300).ok, 'Telnyx: Ed25519 sobre «telnyx-timestamp|cuerpo» con la llave pública');
  ok(!P.firmaTelnyx(cuerpo, sig, String(Number(ts) - 1), Number(ts), 300).ok && P.firmaTelnyx(cuerpo, sig, ts, Number(ts) + 400, 300).motivo === 'hora', 'Telnyx: otra hora o fuera de la ventana → no');
  const SECRETO_PRUEBA = crypto.randomBytes(16).toString('hex'); process.env.WHATSAPP_APP_SECRET = SECRETO_PRUEBA;   // al azar en cada corrida
  ok(P.firmaWhatsApp(cuerpo, 'sha256=' + crypto.createHmac('sha256', SECRETO_PRUEBA).update(cuerpo).digest('hex')).ok, 'Meta: X-Hub-Signature-256 = sha256=HMAC(secreto de la app, cuerpo)');
  ok(!P.firmaWhatsApp(cuerpo, 'sha256=' + crypto.createHmac('sha256', 'otro').update(cuerpo).digest('hex')).ok, 'Meta: con otro secreto → no');
  srv.close();
  console.log('\ncontrato de los canales ✓');
})().catch((e) => { console.error(e); process.exit(1); });
