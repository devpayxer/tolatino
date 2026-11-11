// 8g · Contrato de Wallet: el código REAL de lib/pases (der, zip, apple, apns-pase, google) compilado aparte (correr.sh) contra:
// · Apple: el formato del pase y del servicio web fijados en apple.json (extraer-apple.mjs, de la documentación oficial con el sha256 de cada
//   página). Se arma un .pkpass con una cadena de PRUEBA hecha aquí (openssl: raíz → «WWDR de prueba» → el certificado firmado a partir de la
//   solicitud CSR que genera der.ts) y se comprueba: el ZIP, el manifest.json (SHA-1 de cada archivo), la firma CMS separada (openssl smime
//   -verify contra la cadena), cada llave de pass.json, de los códigos y de los campos contra apple.json, y los textos ES/EN.
// · Apple APNs de pases: el aviso con TLS de cliente (el certificado del pase) contra el simulador, cuerpo «{}», tema = Pass Type ID, 410.
// · Google: el documento de descubrimiento OFICIAL de walletobjects v1 (fijado a un commit de googleapis): los métodos que usamos existen, cada
//   llave de la clase y el objeto existe con su tipo (el simulador valida contra ese documento), el OAuth de la cuenta de servicio y el enlace
//   «Guardar» firmado (RS256, aud google, typ savetowallet, solo el id del objeto).
// Corre como «node prueba.cjs» con CONTRATO_OUT (lo compilado), WALLET_SPEC (el descubrimiento) y, la primera vez, se vuelve a lanzar con
// NODE_EXTRA_CA_CERTS = la raíz de prueba (para que el cliente HTTP/2 confíe en el APNs simulado).
const path = require('path'), fs = require('fs'), crypto = require('crypto'), os = require('os'), { spawnSync, execFileSync } = require('child_process'), zlib = require('zlib');
const RAIZ = path.resolve(__dirname, '../..'), PKI = require(path.join(RAIZ, 'scripts/wallet-sim/pki.cjs')), SIM = require(path.join(RAIZ, 'scripts/wallet-sim/sim.cjs'));
const GP = 4425, AP = 4426, AIA = `http://127.0.0.1:${GP}/aia/wwdr.der`;
if (!process.env.WALLET_PKI) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-contrato-wallet-'));
  try {
    PKI.cadena({ dir, aia: AIA });
    const r = spawnSync(process.execPath, [__filename], { stdio: 'inherit', env: { ...process.env, WALLET_PKI: dir, NODE_EXTRA_CA_CERTS: path.join(dir, 'raiz.pem') } });
    process.exitCode = r.status ?? 1;
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  return;
}
const OUT = process.env.CONTRATO_OUT, SPEC = JSON.parse(fs.readFileSync(process.env.WALLET_SPEC, 'utf8')), A = JSON.parse(fs.readFileSync(path.join(__dirname, 'apple.json'), 'utf8'));
const D = require(path.join(OUT, 'pases/der.js')), Z = require(path.join(OUT, 'pases/zip.js')), AP_ = require(path.join(OUT, 'pases/apple.js')), N = require(path.join(OUT, 'pases/apns-pase.js')), G = require(path.join(OUT, 'pases/google.js'));
let n = 0; const ok = (c, m) => { if (!c) { console.error('  ✗ ' + m); process.exit(1); } n++; console.log('  ✓ ' + m); };

// Un ZIP leído a mano (cabeceras centrales), para no depender de unzip.
function leerZip(b) {
  const fin = b.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06])), total = b.readUInt16LE(fin + 10), ini = b.readUInt32LE(fin + 16), out = {};
  for (let i = ini, k = 0; k < total; k++) {
    const metodo = b.readUInt16LE(i + 10), crc = b.readUInt32LE(i + 16), tam = b.readUInt32LE(i + 20), ln = b.readUInt16LE(i + 28), le = b.readUInt16LE(i + 30), lc = b.readUInt16LE(i + 32), off = b.readUInt32LE(i + 42);
    const nombre = b.subarray(i + 46, i + 46 + ln).toString('utf8'), l = off + 30 + b.readUInt16LE(off + 26) + b.readUInt16LE(off + 28), datos = b.subarray(l, l + tam);
    const crudo = metodo === 8 ? zlib.inflateRawSync(datos) : datos;
    out[nombre] = { datos: crudo, crcOk: (zlib.crc32(crudo) >>> 0) === crc };
    i += 46 + ln + le + lc;
  }
  return out;
}
const strings = (b) => { const t = b.subarray(0, 2).equals(Buffer.from([0xff, 0xfe])) ? b.subarray(2).toString('utf16le') : null; if (t === null) return null; const m = new Map(); for (const x of t.matchAll(/"((?:[^"\\]|\\.)*)" = "((?:[^"\\]|\\.)*)";/g)) m.set(JSON.parse(`"${x[1]}"`), JSON.parse(`"${x[2]}"`)); return m; };

(async () => {
  const P = PKI.cadena({ dir: process.env.WALLET_PKI, aia: AIA });
  // ── 1 · La solicitud (CSR) de der.ts: openssl la acepta y Apple (la cadena de prueba) la firma ──
  const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const csr = D.solicitudCertificado(privateKey, "To'Latino pass.com.tolatino.boletos");
  ok(/^-----BEGIN CERTIFICATE REQUEST-----\n[A-Za-z0-9+/=\n]+-----END CERTIFICATE REQUEST-----\n$/.test(csr), 'der.solicitudCertificado arma un CSR PKCS#10 en PEM');
  const cer = P.firmar(csr);
  const dc = D.datosCertificado(cer, privateKey);
  ok(dc.propia && dc.tipo === 'pass.com.tolatino.boletos' && dc.equipo === 'TL12345678' && dc.emisorUrl === AIA, 'openssl verifica el CSR y firma el certificado; datosCertificado lee el Pass Type ID (UID), el equipo (OU), el AIA y que la llave es la nuestra');
  const ajena = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
  ok(D.datosCertificado(cer, ajena).propia === false, 'un certificado con otra llave no es «propio»');

  // ── 2 · El .pkpass ──
  const cred = { tipo: dc.tipo, equipo: dc.equipo, llave: privateKey, certDer: cer, cadena: [P.interDer] };
  const png = Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000', 'hex');
  const img = { 'icon.png': png, 'icon@2x.png': png, 'icon@3x.png': png, 'logo.png': png, 'logo@2x.png': png };
  const QR = 'TL1.0a1b2c3d.123.456.2.1.' + 'A'.repeat(86);
  const c = { serie: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', version: 3, codigo: 'TL-ABC-2345', qr: QR, anulado: false, estado: null, generico: false, titulo: { es: 'Noche de bachata', en: 'Bachata night' },
    lugar: 'La Terraza', direccion: '1 N Wyoming St, Hazleton, PA', organiza: 'La Terraza', inicio: '2026-11-20T21:00:00-05:00', fin: '2026-11-21T01:00:00-05:00',
    tipo: { es: 'General', en: 'General' }, entran: 1, vale: { es: 'Vale los 3 días', en: 'Valid all 3 days' }, enlace: 'https://pruebas.tolatino.com/cuenta/boletos/TL-ABC-2345' };
  const pk = AP_.armarPkpass(c, cred, img, 'https://pruebas.tolatino.com/api/pases', 'tok_' + 'x'.repeat(40));
  const zz = leerZip(pk), nombres = Object.keys(zz).sort();
  ok(['pass.json', 'manifest.json', 'signature', 'icon.png', 'es.lproj/pass.strings', 'en.lproj/pass.strings'].every((x) => nombres.includes(x)) && Object.values(zz).every((x) => x.crcOk), `el .pkpass es un ZIP sano con ${nombres.length} archivos (pass.json, manifest.json, signature, icon.png, textos ES/EN; cada CRC-32 bien)`);
  const man = JSON.parse(zz['manifest.json'].datos.toString('utf8'));
  ok(Object.keys(man).sort().join() === nombres.filter((x) => x !== 'manifest.json' && x !== 'signature').sort().join() && Object.entries(man).every(([k, h]) => crypto.createHash('sha1').update(zz[k].datos).digest('hex') === h),
    'manifest.json: el SHA-1 de CADA archivo (salvo manifest y signature), y coinciden');
  const v = P.verificar(zz.signature.datos, zz['manifest.json'].datos);
  ok(v.ok, 'signature: firma CMS separada del manifest.json que openssl smime -verify acepta con la cadena de prueba' + (v.ok ? '' : ' — ' + v.err));
  const imp = P.leerFirma(zz.signature.datos);
  ok(/signingTime/.test(imp) && /messageDigest/.test(imp) && /contentType/.test(imp) && /WWDR de prueba/.test(imp) && /pass\.com\.tolatino\.boletos/.test(imp) && /sha256/.test(imp), 'la firma trae signingTime, messageDigest y contentType firmados, SHA-256, el certificado del pase y el intermedio');
  const malo = Buffer.from(zz['manifest.json'].datos); malo[5] ^= 1;
  ok(!P.verificar(zz.signature.datos, malo).ok, 'un manifest.json cambiado ya no verifica (al revés)');
  // Al revés: firmado con un certificado autofirmado (fuera de la cadena) → openssl lo rechaza: la cadena se comprueba de verdad.
  const kx = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
  const autoDer = Buffer.from(P.autofirmado(kx.export({ format: 'pem', type: 'pkcs8' }), '/UID=pass.com.tolatino.boletos/CN=ajeno', true));
  const pkAjeno = leerZip(AP_.armarPkpass(c, { ...cred, llave: kx, certDer: autoDer, cadena: [] }, img, 'https://x/api/pases', 'tok_' + 'x'.repeat(40)));
  ok(!P.verificar(pkAjeno.signature.datos, pkAjeno['manifest.json'].datos).ok, 'firmado con un certificado fuera de la cadena → openssl NO lo acepta (al revés: la cadena se comprueba de verdad)');

  // ── 3 · pass.json contra la documentación fijada ──
  const pj = JSON.parse(zz['pass.json'].datos.toString('utf8'));
  ok(Object.keys(pj).every((k) => k in A.pass.propiedades), `cada llave de pass.json existe en la documentación de Apple (${Object.keys(pj).length} llaves)`);
  ok(A.pass.requeridas.every((k) => k in pj) && pj.formatVersion === 1, `están las obligatorias (${A.pass.requeridas.join(', ')}) y formatVersion 1`);
  ok(pj.webServiceURL && pj.authenticationToken.length >= 16 && pj.eventTicket && pj.sharingProhibited === true && pj.voided === false, 'eventTicket, servicio web con token (≥ 16), sin compartir por AirDrop y sin anular');
  const bc = pj.barcodes?.[0];
  ok(bc && Object.keys(bc).every((k) => k in A.barcodes.propiedades) && A.barcodes.requeridas.every((k) => k in bc) && A.barcodes.permitidos.format.includes(bc.format) && bc.format === 'PKBarcodeFormatQR', 'el código: llaves de Pass.Barcodes, obligatorias, formato QR de la lista');
  ok(bc.message === QR && bc.messageEncoding === 'iso-8859-1' && bc.altText === c.codigo, 'el QR del pase es EXACTAMENTE el texto firmado que se le pasó (paseMismoQr), en iso-8859-1, con el código humano debajo');
  const grupos = Object.keys(pj.eventTicket);
  ok(grupos.every((g) => A.grupos.includes(g)), `los grupos de campos existen en PassFields (${grupos.join(', ')})`);
  const campos = grupos.flatMap((g) => pj.eventTicket[g].map((f) => [g, f]));
  ok(campos.every(([g, f]) => Object.keys(f).every((k) => k in A.campo.propiedades || (g === 'auxiliaryFields' && A.auxiliar.includes(k))) && A.campo.requeridas.every((k) => k in f)), `cada campo (${campos.length}) solo usa llaves de PassFieldContent y trae key y value`);
  ok(campos.every(([, f]) => Object.entries(A.campo.permitidos).every(([k, vals]) => !(k in f) || vals.includes(f[k]))), 'dateStyle, timeStyle y textAlignment solo con valores de la lista de Apple');
  ok(new Set(campos.map(([, f]) => f.key)).size === campos.length, 'cada campo con su key única');
  ok(!JSON.stringify(pj).match(/\+1\d{10}|\d{3}-\d{3}-\d{4}|\$\d/), 'pass.json sin teléfonos ni montos');
  const es = strings(zz['es.lproj/pass.strings'].datos), en = strings(zz['en.lproj/pass.strings'].datos);
  const loc = [pj.description, pj.logoText, ...campos.flatMap(([, f]) => [f.label, typeof f.value === 'string' && !/^\d{4}-\d\d-\d\dT/.test(f.value) && !['codigo', 'lugar', 'direccion', 'organiza'].includes(f.key) ? f.value : null])].filter(Boolean);
  const faltan = loc.filter((k) => !(es && es.has(k) && en && en.has(k)));
  if (faltan.length) console.error('    faltan:', JSON.stringify(faltan), JSON.stringify([...(es ?? new Map()).keys()].slice(0, 30)));
  ok(es && en && !faltan.length, `los textos (UTF-16 con BOM) traducen cada etiqueta y valor localizable (los nombres propios —lugar, dirección, organizador— van tal cual): ${loc.length} en ES y EN`);
  ok(en.get('EVENTO') === 'EVENT' && en.get('Noche de bachata') === 'Bachata night' && es.get('EVENTO') === 'EVENTO', 'EN dice «EVENT» y el nombre del evento en inglés; ES, el español');
  // Sin QR vigente: sin código. Anulado: voided y sin código. Genérico: sin nombre del evento ni lugar.
  const sin = JSON.parse(leerZip(AP_.armarPkpass({ ...c, qr: null, estado: { es: 'Se está transfiriendo', en: 'Being transferred' } }, cred, img, 'https://x/api/pases', 'tok_' + 'x'.repeat(40)))['pass.json'].datos);
  ok(!sin.barcodes && sin.eventTicket.auxiliaryFields.some((f) => f.key === 'estado'), 'sin QR vigente (transfiriéndose): el pase va SIN código y con el estado');
  const an = JSON.parse(leerZip(AP_.armarPkpass({ ...c, anulado: true, estado: { es: 'Transferido', en: 'Transferred' } }, cred, img, 'https://x/api/pases', 'tok_' + 'x'.repeat(40)))['pass.json'].datos);
  ok(an.voided === true && !an.barcodes, 'anulado: voided y sin código, aunque se le pase un QR');
  const ge = JSON.parse(leerZip(AP_.armarPkpass({ ...c, generico: true }, cred, img, 'https://x/api/pases', 'tok_' + 'x'.repeat(40)))['pass.json'].datos), gs = JSON.stringify(ge);
  ok(!gs.includes('Noche de bachata') && !gs.includes('La Terraza') && !gs.includes('Wyoming') && gs.includes('Boleto de evento'), 'evento sensible: «Boleto de evento», sin nombre, lugar, dirección ni organizador');
  ok(AP_.isoEnZona('2026-11-21T02:00:00Z', 'America/New_York') === '2026-11-20T21:00:00-05:00' && AP_.isoEnZona('2026-07-04T16:00:00Z', 'America/New_York') === '2026-07-04T12:00:00-04:00', 'las horas van con el desfase de la ciudad (invierno -05:00, verano -04:00)');

  // ── 4 · El servicio web: lo que la documentación fija (las rutas de app/api/pases/v1 las prueba wal8g contra el servidor) ──
  const S = A.servicio;
  ok(S['POST v1/devices/{deviceLibraryIdentifier}/registrations/{passTypeIdentifier}/{serialNumber}']?.autorizacion && S['DELETE v1/devices/{deviceLibraryIdentifier}/registrations/{passTypeIdentifier}/{serialNumber}']?.autorizacion
    && S['GET v1/passes/{passTypeIdentifier}/{serialNumber}']?.autorizacion && !S['GET v1/devices/{deviceLibraryIdentifier}/registrations/{passTypeIdentifier}']?.autorizacion && !S['POST v1/log']?.autorizacion,
    'Apple: registrar, dar de baja y pedir el pase llevan «Authorization: ApplePass»; la lista de series y el log no');
  ok(S['POST v1/devices/{deviceLibraryIdentifier}/registrations/{passTypeIdentifier}/{serialNumber}'].respuestas.join() === '200,201,401' && S['GET v1/devices/{deviceLibraryIdentifier}/registrations/{passTypeIdentifier}'].respuestas.join() === '200,204', 'Apple: registrar contesta 200/201/401 y la lista 200/204');
  const rutasApi = ['app/api/pases/v1/devices/[dispositivo]/registrations/[tipo]/[serie]/route.ts', 'app/api/pases/v1/devices/[dispositivo]/registrations/[tipo]/route.ts', 'app/api/pases/v1/passes/[tipo]/[serie]/route.ts', 'app/api/pases/v1/log/route.ts'];
  ok(rutasApi.every((r) => fs.existsSync(path.join(RAIZ, 'apps/web', r))), 'las cuatro rutas del servicio existen en el servidor (registrar/baja, lista, pase, log)');
  ok(A.aviso.mismoCertificado && A.aviso.cuerpoVacio && A.aviso.soloProduccion, 'Apple: el aviso de cambio usa el certificado del pase, cuerpo «{}» y solo producción');

  // ── 5 · Simuladores ──
  const sim = await SIM.arrancar({ googlePuerto: GP, apnsPuerto: AP, descubrimiento: process.env.WALLET_SPEC, tls: { key: P.srv.key, cert: P.srv.cert, ca: P.raiz + P.inter }, interDer: P.interDer });
  try {
    const cpem = D.pemDe(cer), lpem = privateKey.export({ format: 'pem', type: 'pkcs8' });
    const r1 = await N.avisarPase(`https://127.0.0.1:${AP}`, { tipo: dc.tipo, llavePem: lpem, certPem: cpem }, 'ab'.repeat(32));
    const av = sim.avisos.at(-1);
    ok(r1.result === 'enviado' && av.topic === dc.tipo && av.uid === dc.tipo && av.cuerpo === '{}', 'APNs: el aviso entra con TLS de cliente (el certificado del pase), tema = Pass Type ID y cuerpo «{}»');
    sim.muertos.add('cd'.repeat(32));
    ok((await N.avisarPase(`https://127.0.0.1:${AP}`, { tipo: dc.tipo, llavePem: lpem, certPem: cpem }, 'cd'.repeat(32))).result === 'invalido', 'APNs: 410 Unregistered → «invalido» (el teléfono deja de recibir)');
    const { privateKey: k2 } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    const autofirmado = P.autofirmado(k2.export({ format: 'pem', type: 'pkcs8' }), '/UID=pass.com.tolatino.boletos/CN=x').toString();
    N.cerrarApnsPase();
    ok((await N.avisarPase(`https://127.0.0.1:${AP}`, { tipo: dc.tipo, llavePem: k2.export({ format: 'pem', type: 'pkcs8' }), certPem: autofirmado }, 'ab'.repeat(32))).result !== 'enviado', 'APNs: un certificado que no es de la cadena no entra (al revés)');
    ok((await N.avisarPase(`https://127.0.0.1:${AP}`, { tipo: dc.tipo, llavePem: lpem, certPem: cpem }, 'no-hex')).result === 'invalido', 'APNs: un token que no es hexadecimal no se manda');

    // Google: el descubrimiento oficial tiene lo que usamos.
    const R = SPEC.resources;
    ok(['insert', 'get', 'update'].every((m) => R.eventticketclass.methods[m] && R.eventticketobject.methods[m]) && R.eventticketobject.methods.update.httpMethod === 'PUT' && R.eventticketobject.methods.insert.path === 'walletobjects/v1/eventTicketObject',
      `Google (revisión ${SPEC.revision}): eventTicketClass y eventTicketObject con insert (POST), get y update (PUT) en walletobjects/v1`);
    const so = SPEC.schemas.EventTicketObject.properties;
    ok(so.state.enum.includes('ACTIVE') && so.state.enum.includes('INACTIVE') && SPEC.schemas.Barcode.properties.type.enum.includes('QR_CODE') && !('ticketHolderName' in G.objeto('3388000000012345678', '1', c)), 'Google: estados ACTIVE/INACTIVE, código QR_CODE, y el objeto NO lleva ticketHolderName');
    const { publicKey: gpub, privateKey: gpriv } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    const sa = { client_email: 'wallet@tl-pruebas.iam.gserviceaccount.com', private_key: gpriv.export({ format: 'pem', type: 'pkcs8' }), project_id: 'tl-pruebas', token_uri: 'https://oauth2.googleapis.com/token', private_key_id: 'abc123' };
    sim.cuentas.set(sa.client_email, gpub);
    const cg = { sa, emisor: '3388000000012345678' }, base = `http://127.0.0.1:${GP}`;
    const g1 = await G.sincronizar(base, `${base}/token`, cg, '456', c);
    const obj = sim.objetos.get('3388000000012345678.ABCDEFGHIJKLMNOPQRSTUVWXYZ'), cls = sim.clases.get('3388000000012345678.evt_456');
    ok(g1.ok && obj && cls && !sim.registro.some((x) => x.errores), 'Google: la clase y el objeto entran y el simulador no encuentra ni una llave fuera del documento de descubrimiento');
    ok(obj.barcode.type === 'QR_CODE' && obj.barcode.value === QR && obj.state === 'ACTIVE' && obj.classId === cls.id, 'Google: el objeto lleva EL MISMO QR firmado (paseMismoQr), ACTIVE y su clase');
    ok(sim.registro.find((x) => x.oauth)?.oauth.scope === 'https://www.googleapis.com/auth/wallet_object.issuer', 'Google: OAuth con la cuenta de servicio (RS256 verificado) y el alcance wallet_object.issuer');
    const g2 = await G.sincronizar(base, `${base}/token`, cg, '456', { ...c, qr: null, anulado: true, estado: { es: 'Transferido', en: 'Transferred' } });
    const obj2 = sim.objetos.get('3388000000012345678.ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    ok(g2.ok && obj2.state === 'INACTIVE' && !obj2.barcode && sim.registro.filter((x) => x.metodo === 'PUT').length >= 2, 'Google: ya existe → update (PUT, reemplaza todo): anulado queda INACTIVE y SIN el código viejo');
    const gg = await G.sincronizar(base, `${base}/token`, cg, '457', { ...c, serie: 'ZYXWVUTSRQPONMLKJIHGFEDCBA', generico: true });
    const gcl = sim.clases.get('3388000000012345678.evt_457_g');
    ok(gg.ok && gcl && JSON.stringify(gcl).includes('Boleto de evento') && !JSON.stringify(gcl).includes('Noche de bachata') && !gcl.venue, 'Google: evento sensible → clase genérica, sin nombre ni lugar');
    const enl = G.enlaceGuardar(cg, c.serie, 'https://pruebas.tolatino.com'), vg = sim.verificarGuardar(enl);
    ok(enl.startsWith('https://pay.google.com/gp/v/save/') && vg.ok && vg.P.aud === 'google' && vg.P.typ === 'savetowallet' && vg.P.iss === sa.client_email
      && JSON.stringify(vg.P.payload) === JSON.stringify({ eventTicketObjects: [{ id: '3388000000012345678.ABCDEFGHIJKLMNOPQRSTUVWXYZ' }] }) && vg.P.origins[0] === 'https://pruebas.tolatino.com', 'Google: «Guardar» = JWT RS256 de la cuenta de servicio, aud google, typ savetowallet, SOLO el id del objeto y nuestro origen');
    // Al revés: una llave que el documento no tiene → 400.
    const val = SIM.validador(SPEC);
    ok(val('EventTicketObject', { id: 'x', inventada: 1 }).length === 1 && val('EventTicketObject', { state: 'ACTIVO' }).length === 1, 'el validador del simulador rechaza una llave inventada o un estado fuera de la lista (al revés)');
  } finally { await sim.cerrar(); N.cerrarApnsPase(); }
  console.log(`\n✓ contrato de Wallet: ${n} comprobaciones`);
})().catch((e) => { console.error(e); process.exit(1); });
