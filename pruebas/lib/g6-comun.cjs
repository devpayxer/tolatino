// Ayudas de las pruebas de la Puerta y de Wallet (evt6g, evt6h, llave8d, wal8g). 9a: rutas y secretos de la corrida (pruebas/lib/entorno.cjs).
const ENT = require('./entorno.cjs');
const { execSync, exec } = require('child_process'); const crypto = require('crypto'); const fs = require('fs');
const S = ENT.S, B = ENT.B;
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const sqlErr = (q) => { try { sql(q); return ''; } catch (e) { return String(e.stderr || e.message); } };
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const apiRaw = (p, u, b) => p.evaluate(async ([u, b]) => { const r = await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) }); return { st: r.status, t: await r.text() }; }, [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql(`delete from otp_codes`); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const uid = (tel) => sql(`select id from users where phone = '+1${tel}'`);
// La llave del QR del entorno local (la misma que usa el servidor): para armar QR de una versión vieja en la prueba.
const llave = crypto.createPrivateKey({ key: Buffer.from(ENT.sec('QR_LLAVE_PRIVADA'), 'base64'), format: 'der', type: 'pkcs8' });
const kidDe = (k) => { const raw = crypto.createPublicKey(k).export({ format: 'der', type: 'spki' }).subarray(-32); return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 8); };
const firmar = (id, fecha, ver, admits, k = llave) => { const m = `TL1.${kidDe(k)}.${id}.${fecha}.${ver}.${admits}`; return `${m}.${crypto.sign(null, Buffer.from(m), k).toString('base64url')}`; };
const otraLlave = crypto.generateKeyPairSync('ed25519').privateKey;
module.exports = { S, B, sql, sqlErr, api, apiRaw, entrar, uid, firmar, otraLlave, crypto, exec };
