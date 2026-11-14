// Prueba al revés de los guardianes de 8g (Wallet): paseMismoQr, paseSigueAlBoleto, tokenDePase (nuevos) y libroSoloInsercion, tokensCifrados,
// pushSoloServiciosConocidos, llavesFueraDelRepo, rutasVivas (ampliados). Se inyecta el defecto, el guardián debe fallar; se restaura.
// «crear»: se crea el archivo, se corre y se borra.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const M = 'packages/db/migrations/0129_pases_wallet.sql', P = 'apps/web/lib/pases/pases.ts', A = 'apps/web/lib/pases/apple.ts', GO = 'apps/web/lib/pases/google.ts', B = 'apps/web/lib/boletos.ts',
  BD = 'apps/web/lib/boletos-despues.ts', BA = 'apps/web/lib/boletos-admin.ts', EC = 'apps/web/lib/evt-cambios.ts', BR = 'apps/web/lib/barrido.ts', PR = 'apps/web/lib/pases/pronto.ts',
  RS = 'apps/web/app/api/pases/v1/devices/[dispositivo]/registrations/[tipo]/[serie]/route.ts', RP = 'apps/web/app/api/pases/v1/passes/[tipo]/[serie]/route.ts',
  CR = 'apps/web/lib/pases/credenciales.ts', W = 'apps/web/app/(app)/cuenta/boletos/[codigo]/Wallet.tsx';
const casos = [
  // paseMismoQr
  ['paseMismoQr', A, 'if (c.qr && !c.anulado) json.barcodes = [{ format: "PKBarcodeFormatQR", message: c.qr, messageEncoding: "iso-8859-1", altText: c.codigo }];', 'if (c.qr && !c.anulado) json.barcodes = [{ format: "PKBarcodeFormatQR", message: c.codigo, messageEncoding: "iso-8859-1", altText: c.codigo }];'],
  ['paseMismoQr', A, 'if (c.qr && !c.anulado) json.barcodes', 'if (c.qr) json.barcodes'],
  ['paseMismoQr', GO, 'if (c.qr && !c.anulado) b.barcode = { type: "QR_CODE", value: c.qr, alternateText: c.codigo };', 'if (c.qr && !c.anulado) b.barcode = { type: "QR_CODE", value: `${c.serie}`, alternateText: c.codigo };'],
  ['paseMismoQr', P, '  const qr = p.voided ? null : es.qr;', '  const qr = es.qr;'],
  ['paseMismoQr', P, 'import { boletoParaPase } from "../boletos";', 'import { boletoParaPase } from "../boletos";\nimport { firmarQR } from "../boletos-qr";\nexport const otro = firmarQR;'],
  ['paseMismoQr', B, 'es: await vistaBoleto(b, true, !es.pasado), en: await vistaBoleto(b, false, !en.pasado)', 'es: await vistaBoleto(b, true, true), en: await vistaBoleto(b, false, true)'],
  // paseSigueAlBoleto
  ['paseSigueAlBoleto', M, 'create trigger tickets_pase after update of status, qr_ver, holder_user_id, holder_name on tickets', 'create trigger tickets_pase after update of status, qr_ver, holder_user_id on tickets'],
  ['paseSigueAlBoleto', M, "case when t.status in ('void', 'refunded', 'replaced') then 'boleto'", "case when t.status in ('void', 'refunded') then 'boleto'"],
  ['paseSigueAlBoleto', M, "                when e.status = 'cancelled' then 'evento'\n", ''],
  ['paseSigueAlBoleto', M, 'create trigger event_dates_pase after update of starts_at, ends_at, doors_at, local_date, status on event_dates', 'create trigger event_dates_pase after update of status on event_dates'],
  ['paseSigueAlBoleto', M, "if (new.version, new.voided_at, new.void_reason) is distinct from (old.version, old.voided_at, old.void_reason) and coalesce(current_setting('tl.pase', true), '') <> 'si' then", "if false then"],
  ['paseSigueAlBoleto', BD, '  // 8g · El pase de Wallet ya quedó tocado en la transacción (trigger de 0129): que salga ya.\n  pasesPronto();\n', ''],
  ['paseSigueAlBoleto', BD, "      await c.query(`update tickets set holder_name = $2 where id = $1::bigint`, [t.id, nombre || null]);", "      await c.query(`update tickets set holder_name = $2, admits = admits where id = $1::bigint`, [t.id, nombre || null]);"],
  ['paseSigueAlBoleto', BA, '  if (paso !== "reenviar") pasesPronto();\n', ''],
  ['paseSigueAlBoleto', EC, '  // 8g · La fecha nueva ya está en los pases de Wallet (trigger de 0129): que salga ya, con el mismo aviso.\n  pasesPronto();\n', ''],
  ['paseSigueAlBoleto', BR, '        ["pases", async () => (await import("./pases/pases")).barrerPases()],\n', ''],
  // tokenDePase
  ['tokenDePase', P, "where p.serial = $1 and p.pass_type_id = $2 and p.platform = 'apple'`, [serie, tipo])", "where p.serial = $1 and p.platform = 'apple'`, [serie])"],
  ['tokenDePase', P, '  return a.length === b.length && timingSafeEqual(a, b) ? p : null;', '  return huellaToken(t) === p.h ? p : null;'],
  ['tokenDePase', RS, '  if (!p) return vacio(401);\n  if (Number(req.headers.get("content-length") ?? 0) > 4096) return vacio(400);', '  if (Number(req.headers.get("content-length") ?? 0) > 4096) return vacio(400);'],
  ['tokenDePase', RP, '  const p = await autorizarPase(tipo, serie, req.headers.get("authorization"));\n  if (!p) return new NextResponse(null, { status: 401, headers: { "cache-control": "no-store" } });', '  const p = (await autorizarPase(tipo, serie, req.headers.get("authorization")))!;'],
  ['tokenDePase', M, "auth_token_hash       text check (auth_token_hash ~ '^[a-f0-9]{64}$'),", "auth_token_hash       text check (auth_token_hash ~ '^[a-f0-9]{64}$'),\n  auth_token            text,"],
  ['tokenDePase', P, '  return { serialNumbers: r.map((x) => x.serial), lastUpdated:', '  return { pases: r, serialNumbers: r.map((x) => x.serial), lastUpdated:'],
  // libroSoloInsercion (8g)
  ['libroSoloInsercion', M, "create trigger pass_log_no_cambia before update or delete on pass_log", "create trigger pass_log_no_cambia before delete on pass_log"],
  ['libroSoloInsercion', P, "  if (u.rowCount) await db().query(`insert into pass_log (pass_id, city_id, action) values ($1::bigint, $2, 'baja')`, [p.id, p.city]);", "  if (u.rowCount) await db().query(`delete from pass_registrations where device_library_id = $1`, [dispositivo]);"],
  // tokensCifrados (8g)
  ['tokensCifrados', P, '[dispositivo, cifrar(token.toLowerCase()), h]', '[dispositivo, Buffer.from(token.toLowerCase()), h]'],
  // pushSoloServiciosConocidos (8g)
  ['pushSoloServiciosConocidos', CR, 'export const URL_APNS_PASE = () => env("PASES_APNS_URL") ?? "https://api.push.apple.com";', 'export const URL_APNS_PASE = () => process.env.PASES_APNS_URL ?? "https://api.push.apple.com";'],
  ['pushSoloServiciosConocidos', CR, '["certs.apple.com", "www.apple.com", ...(env("PASES_AIA_HOSTS")', '["certs.apple.com", "www.apple.com", "otro.example.com", ...(env("PASES_AIA_HOSTS")'],
  // rutasVivas (ampliado: rutas de API con [param])
  ['rutasVivas', W, '`/api/pases/apple/${code}`', '`/api/pases/manzana/${code}`'],
];
const crear = [
  ['paseSigueAlBoleto', 'apps/web/lib/pases-otro.ts', 'import "server-only";\nimport { tx } from "./db";\nexport async function anularOtro(id: string) { await tx(async (c) => { await c.query(`update tickets set status = \'void\', void_reason = \'x\' where id = $1::bigint`, [id]); }); }\n'],
  ['tokenDePase', 'apps/web/app/api/pases/v1/otra/route.ts', 'import { yo } from "@/lib/cuenta";\nexport async function GET() { const u = await yo(); return new Response(u ? "1" : "0"); }\n'],
  ['llavesFueraDelRepo', 'scripts/wallet-sim/raiz.pem', '-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----\n'],
  ['llavesFueraDelRepo', 'scripts/wallet-sim/fixture.json', '{"cert":"-----BEGIN CERTIFICATE-----\\nMIIDazCCAlOgAwIBAgIUQ2V4YW1wbGVjZXJ0aWZpY2F0ZWZvcnRlc3Rpbmc"}\n'.replace('\\n', '\n')], // GUARDIAN-OK: certificado FALSO a propósito (llavesFueraDelRepo debe cazarlo)
  ['paseMismoQr', 'apps/web/lib/pases/qr-propio.ts', 'import "server-only";\nexport const qr = (id: string) => `TL1.00000000.${id}`;\n'],
];
let bien = 0, total = 0;
// Cuenta solo si el guardián FALLÓ con su propio mensaje («[guardián] archivo — …»); un guardián que se cae (excepción) no cuenta como cazado.
const correr = (g) => { try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); return [false, '']; } catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${g}]`)); return [!!l, l || ('SE CAYÓ: ' + String(e.stderr).split('\n').find((x) => /Error/.test(x)))]; } };
for (const [g, f, a, b] of casos) {
  total++;
  const ruta = `${R}/${f}`;
  if (!fs.existsSync(ruta)) { console.log(`  ✗ ${g}: no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { console.log(`  ✗ ${g}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  const [falla, out] = correr(g); fs.writeFileSync(ruta, orig);
  console.log(`  ${falla ? '✓' : '✗'} ${g} al revés (${f.split('/').pop()})${out ? ' → ' + out.trim().slice(0, 150) : ''}`); if (falla) bien++;
}
for (const [g, f, c] of crear) {
  total++;
  const ruta = `${R}/${f}`;
  fs.mkdirSync(require('path').dirname(ruta), { recursive: true });
  fs.writeFileSync(ruta, c);
  const [falla, out] = correr(g);
  fs.unlinkSync(ruta);
  try { fs.rmdirSync(require('path').dirname(ruta)); } catch { /* no vacía */ }
  console.log(`  ${falla ? '✓' : '✗'} ${g} al revés (crear ${f.split('/').pop()})${out ? ' → ' + out.trim().slice(0, 150) : ''}`); if (falla) bien++;
}
console.log(`\n${bien}/${total} al revés`);
execSync('node guardianes/run.mjs', { cwd: R, stdio: 'inherit' });
// 9b-3 · alrevesQueFalla: un defecto sin cazar pone la prueba en rojo (antes salía con 0 y el CI la contaba en verde).
if (bien !== total) process.exit(1);
