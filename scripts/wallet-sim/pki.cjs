// 8g · Una cadena de certificados de PRUEBA, hecha en el momento con openssl en una carpeta temporal (NUNCA en el repo: el repo es público y
// el guardián llavesFueraDelRepo no deja ni un .cer/.pem/.p12). Imita la de Apple: raíz → intermedio «WWDR de prueba» → el certificado del
// Pass Type ID (UID = pass…, OU = el equipo, AIA «CA Issuers» = el simulador), firmado a partir de la SOLICITUD (CSR) que generó nuestro
// servidor. Y un certificado de servidor para el APNs simulado (127.0.0.1). Con la cadena de Apple de verdad no se usa nada de esto.
const { execFileSync } = require('child_process'), fs = require('fs'), os = require('os'), path = require('path');
const ssl = (d, ...a) => execFileSync('openssl', a, { cwd: d, stdio: ['pipe', 'pipe', 'pipe'] }).toString();

function cadena({ dir, aia = 'http://127.0.0.1:4405/aia/wwdr.der', tipo = 'pass.com.tolatino.boletos', equipo = 'TL12345678', dias = 365 } = {}) {
  const d = dir ?? fs.mkdtempSync(path.join(os.tmpdir(), 'tl-pki-'));
  // Ya hecha (otro proceso de la misma prueba la generó): se reusa tal cual.
  if (!fs.existsSync(path.join(d, 'srv.pem'))) generar(d, aia);
  return abrir(d, tipo, equipo, dias);
}
function generar(d, aia) {
  fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(d, 'ext.cnf'), [
    '[ca]', 'basicConstraints=critical,CA:TRUE', 'keyUsage=critical,keyCertSign,cRLSign', 'subjectKeyIdentifier=hash',
    '[inter]', 'basicConstraints=critical,CA:TRUE,pathlen:0', 'keyUsage=critical,keyCertSign,cRLSign', 'subjectKeyIdentifier=hash', 'authorityKeyIdentifier=keyid',
    '[pase]', 'basicConstraints=critical,CA:FALSE', 'keyUsage=critical,digitalSignature', 'extendedKeyUsage=clientAuth', 'subjectKeyIdentifier=hash', 'authorityKeyIdentifier=keyid',
    `authorityInfoAccess=caIssuers;URI:${aia}`,
    '[srv]', 'basicConstraints=critical,CA:FALSE', 'keyUsage=critical,digitalSignature,keyEncipherment', 'extendedKeyUsage=serverAuth', 'subjectAltName=IP:127.0.0.1,DNS:localhost',
  ].join('\n') + '\n');
  ssl(d, 'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', 'raiz.key', '-out', 'raiz.pem', '-days', '3650', '-subj', '/CN=Raiz de prueba To Latino/O=Pruebas/C=US', '-extensions', 'ca', '-config', 'ext.cnf');
  ssl(d, 'req', '-newkey', 'rsa:2048', '-nodes', '-keyout', 'inter.key', '-out', 'inter.csr', '-subj', '/CN=WWDR de prueba/OU=G4/O=Pruebas/C=US');
  ssl(d, 'x509', '-req', '-in', 'inter.csr', '-CA', 'raiz.pem', '-CAkey', 'raiz.key', '-CAcreateserial', '-out', 'inter.pem', '-days', '3650', '-extfile', 'ext.cnf', '-extensions', 'inter');
  ssl(d, 'x509', '-in', 'inter.pem', '-outform', 'DER', '-out', 'inter.der');
  ssl(d, 'req', '-newkey', 'rsa:2048', '-nodes', '-keyout', 'srv.key', '-out', 'srv.csr', '-subj', '/CN=127.0.0.1');
  ssl(d, 'x509', '-req', '-in', 'srv.csr', '-CA', 'inter.pem', '-CAkey', 'inter.key', '-CAcreateserial', '-out', 'srv.pem', '-days', '30', '-extfile', 'ext.cnf', '-extensions', 'srv');
}
function abrir(d, tipo, equipo, dias) {
  return {
    dir: d, tipo, equipo,
    raiz: fs.readFileSync(path.join(d, 'raiz.pem'), 'utf8'), inter: fs.readFileSync(path.join(d, 'inter.pem'), 'utf8'), interDer: fs.readFileSync(path.join(d, 'inter.der')),
    srv: { key: fs.readFileSync(path.join(d, 'srv.key'), 'utf8'), cert: fs.readFileSync(path.join(d, 'srv.pem'), 'utf8') + fs.readFileSync(path.join(d, 'inter.pem'), 'utf8') },
    // Firmar la solicitud (CSR) de nuestro servidor como lo haría Apple: subject con UID (el Pass Type ID) y OU (el equipo). Devuelve el .cer (DER).
    firmar(csrPem, o = {}) {
      fs.writeFileSync(path.join(d, 'pase.csr'), csrPem);
      ssl(d, 'req', '-in', 'pase.csr', '-verify', '-noout');
      const subj = `/UID=${o.tipo ?? tipo}/CN=Pass Type ID: ${o.tipo ?? tipo}/OU=${o.equipo ?? equipo}/O=To Latino Pruebas/C=US`;
      const ca = o.otraCa ? ['-CA', 'raiz.pem', '-CAkey', 'raiz.key'] : ['-CA', 'inter.pem', '-CAkey', 'inter.key'];
      ssl(d, 'x509', '-req', '-in', 'pase.csr', ...ca, '-CAcreateserial', '-out', 'pase.pem', '-days', String(o.dias ?? dias), '-extfile', 'ext.cnf', '-extensions', 'pase', '-subj', subj);
      ssl(d, 'x509', '-in', 'pase.pem', '-outform', 'DER', '-out', 'pase.cer');
      return fs.readFileSync(path.join(d, 'pase.cer'));
    },
    // Verificar una firma separada (signature del .pkpass) contra la cadena de prueba, como lo haría el iPhone con la de Apple.
    verificar(firmaDer, contenido) {
      fs.writeFileSync(path.join(d, 'firma.der'), firmaDer); fs.writeFileSync(path.join(d, 'contenido.bin'), contenido);
      try { ssl(d, 'smime', '-verify', '-binary', '-inform', 'DER', '-in', 'firma.der', '-content', 'contenido.bin', '-CAfile', 'raiz.pem', '-purpose', 'any', '-out', '/dev/null'); return { ok: true }; }
      catch (e) { return { ok: false, err: String(e.stderr || e.message).slice(0, 300) }; }
    },
    // Lo que dice openssl de la firma (los atributos firmados y los certificados que trae).
    leerFirma(firmaDer) { fs.writeFileSync(path.join(d, 'firma.der'), firmaDer); return ssl(d, 'cms', '-cmsout', '-print', '-inform', 'DER', '-in', 'firma.der'); },
    // Un certificado autofirmado FUERA de la cadena (para las pruebas al revés). PEM o DER.
    autofirmado(llavePem, subj, der = false) {
      const k = path.join(d, `ajena-${Date.now()}-${Math.random().toString(36).slice(2)}.key`);
      fs.writeFileSync(k, llavePem, { mode: 0o600 });
      try { return execFileSync('openssl', ['req', '-x509', '-key', k, '-subj', subj, '-days', '1', ...(der ? ['-outform', 'DER'] : [])], { cwd: d, stdio: ['pipe', 'pipe', 'pipe'] }); } finally { fs.rmSync(k, { force: true }); }
    },
    // Una solicitud (CSR) de OTRA llave (la del servidor no es): para probar que un .cer ajeno no entra.
    solicitudAjena(llavePem) {
      const k = path.join(d, `ajena-${Date.now()}.key`);
      fs.writeFileSync(k, llavePem, { mode: 0o600 });
      try { return execFileSync('openssl', ['req', '-new', '-key', k, '-subj', '/CN=ajena'], { cwd: d, stdio: ['pipe', 'pipe', 'pipe'] }).toString(); } finally { fs.rmSync(k, { force: true }); }
    },
    borrar() { fs.rmSync(d, { recursive: true, force: true }); },
  };
}
module.exports = { cadena };
