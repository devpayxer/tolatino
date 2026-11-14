// Prueba al revés de los guardianes de 8d (llaves de acceso): retoUnUso, llaveDeSuCuenta, passkeyNoSaltaBloqueo, clonSoloConFirma,
// llaveSoloDondeSePuede (nuevos) y libroSoloInsercion, nativoConRespaldo, pluginViejoNoRompe, accionesConAcceso (ampliados o que ya cubren 8d).
// Se inyecta el defecto, el guardián debe fallar con su mensaje; se restaura. «crear»: se crea el archivo, se corre y se borra.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const M = 'packages/db/migrations/0130_llaves_acceso.sql', L = 'apps/web/lib/llaves/llaves.ts', C = 'apps/web/lib/cuenta.ts', K = 'apps/web/lib/llaves/config.ts', N = 'apps/web/lib/nativo/llave.ts',
  E = 'apps/web/app/entrar/Entrar.tsx', AU = 'apps/web/app/admin/acciones-usuarios.ts', RT = 'apps/web/app/api/cuenta/llave/entrar/route.ts',
  SW = 'apps/mobile/plugins/tl-llave/ios/TLLlavePlugin.swift', JV = 'apps/mobile/plugins/tl-llave/android/com/tolatino/plugins/TLLlavePlugin.java';
const casos = [
  // retoUnUso
  ['retoUnUso', L, 'and used_at is null and expires_at > now() and device = $3::uuid', 'and expires_at > now() and device = $3::uuid'],
  ['retoUnUso', L, 'where challenge_hash = $1 and purpose = $2 and used_at is null and expires_at > now()', 'where challenge_hash = $1 and purpose = $2 and used_at is null'],
  ['retoUnUso', L, 'and device = $3::uuid and user_id is not distinct from $4::uuid', 'and user_id is not distinct from $4::uuid'],
  ['retoUnUso', L, '  if (!reto || !(await gastarReto(reto, "entrar", null))) throw await no("reto_vencido", "reto");\n', ''],
  ['retoUnUso', L, 'if (j.type !== tipo || j.crossOrigin === true || typeof j.challenge !== "string") return null;', 'if (j.type !== tipo || typeof j.challenge !== "string") return null;'],
  ['retoUnUso', M, "  if old.used_at is not null then raise exception 'reto: ya se usó (un uso)'; end if;\n", ''],
  ['retoUnUso', M, "challenge_hash text not null unique check (challenge_hash ~ '^[a-f0-9]{64}$'),", "challenge_hash text not null unique check (challenge_hash ~ '^[a-f0-9]{64}$'),\n  challenge text,"],
  ['retoUnUso', M, "check (expires_at > created_at and expires_at <= created_at + interval '10 minutes'),", "check (expires_at > created_at),"],
  // llaveDeSuCuenta
  ['llaveDeSuCuenta', L, 'delete_at, false as nuevo`, [k.user_id])', 'delete_at, false as nuevo`, [String((resp.response as { userHandle?: string }).userHandle ?? k.user_id)])'],
  ['llaveDeSuCuenta', L, 'if (uh != null && (typeof uh !== "string" || Buffer.from(uh, "base64url").compare(manejador(k.user_id)) !== 0))', 'if (uh != null && typeof uh !== "string")'],
  ['llaveDeSuCuenta', M, 'credential_id    text not null unique check', 'credential_id    text not null check'],
  ['llaveDeSuCuenta', L, 'return generateAuthenticationOptions({ rpID: r.rpId, challenge', 'return generateAuthenticationOptions({ allowCredentials: [], rpID: r.rpId, challenge'],
  ['llaveDeSuCuenta', L, 'createHmac("sha256", secretoAuth()).update(`llave:${userId}`).digest()', 'Buffer.from(userId.replace(/-/g, ""), "hex"); void createHmac; void secretoAuth; (() => 0)'],
  // passkeyNoSaltaBloqueo
  ['passkeyNoSaltaBloqueo', L, "      || (k.created_session && (await c.query(`select 1 from sessions where id = $1::uuid and blocked`, [k.created_session])).rowCount)) return { error: \"dispositivo_bloqueado\" as const };",
    ") return { error: \"dispositivo_bloqueado\" as const };"],
  ['passkeyNoSaltaBloqueo', L, "    if (!(await c.query(`select 1 from users where id = $1 and phone_verified_at is not null`, [k.user_id])).rowCount) return { error: \"verificar_sms\" as const };\n", ''],
  ['passkeyNoSaltaBloqueo', C, '  if ((await c.query(`select 1 from blocked_devices where device = $1::uuid and lifted_at is null`, [ctx.dev])).rowCount)\n    return { error: "dispositivo_bloqueado" as const };\n', ''],
  ['passkeyNoSaltaBloqueo', C, 'if (["suspended", "banned", "deleted_pending", "deleted", "merged"].includes(user.status)) {', 'if (["banned", "deleted", "merged"].includes(user.status)) {'],
  ['passkeyNoSaltaBloqueo', L, 'requireUserVerification: true, credential:', 'requireUserVerification: false, credential:'],
  ['passkeyNoSaltaBloqueo', AU, '    const llaves = await (await import("@/lib/llaves/llaves")).quitarTodasEn(c, u.id);', '    const llaves = 0;'],
  // clonSoloConFirma
  ['clonSoloConFirma', L, '      if (firmaBuena) { await quitarPorContador(k, ip, ua); throw await no("llave_desconocida", "contador", k); }', '      if (firmaBuena || true) { await quitarPorContador(k, ip, ua); throw await no("llave_desconocida", "contador", k); }'],
  ['clonSoloConFirma', L, "    if (/counter value/i.test(m)) {\n", "    if (/counter value/i.test(m)) { await quitarPorContador(k, ip, ua);\n"],
  ['clonSoloConFirma', M, "if new.sign_count < old.sign_count or", "if false or"],
  // llaveSoloDondeSePuede
  ['llaveSoloDondeSePuede', K, 'const seguro = u.protocol === "https:" || (u.protocol === "http:" && u.hostname === "localhost");', 'const seguro = u.protocol === "https:" || u.protocol === "http:";'],
  ['llaveSoloDondeSePuede', K, '  return o && r.web.includes(o) ? r : null;', '  return o ? r : null;'],
  ['llaveSoloDondeSePuede', N, 'window.isSecureContext === true && typeof window.PublicKeyCredential === "function"', 'typeof window.PublicKeyCredential === "function"'],
  ['llaveSoloDondeSePuede', E, '{llaves && cap.entrar && !enviado && (', '{llaves && !enviado && ('],
  ['llaveSoloDondeSePuede', L, 'export async function retoEntrar() {\n  const r = await llavesAqui();\n  if (!r) throw fallo("llave_no_disponible");', 'export async function retoEntrar() {\n  const r = (await llavesAqui())!;'],
  ['llaveSoloDondeSePuede', RT, '    const b = (await cuerpo(req)) as { respuesta?: unknown };', '    const b = (await req.json()) as { respuesta?: unknown };'],
  // libroSoloInsercion (8d)
  ['libroSoloInsercion', M, 'create trigger passkey_log_no_cambia before update or delete on passkey_log', 'create trigger passkey_log_no_cambia before delete on passkey_log'],
  ['libroSoloInsercion', M, "  if tg_op = 'DELETE' then raise exception 'una llave de acceso no se borra: se quita o se revoca'; end if;\n", ''],
  ['libroSoloInsercion', L, "    const k = (await c.query<{ name: string }>(`update passkeys set revoked_at = now(), revoked_by = 'user' where id = $1 and user_id = $2 and revoked_at is null returning name`, [id, u.id])).rows[0];",
    "    const k = (await c.query<{ name: string }>(`delete from passkeys where id = $1 and user_id = $2 returning name`, [id, u.id])).rows[0];"],
  // nativoConRespaldo / pluginViejoNoRompe (TLLlave)
  ['nativoConRespaldo', SW, 'CAPPluginMethod(name: "obtener", returnType: CAPPluginReturnPromise),', ''],
  ['nativoConRespaldo', JV, '    @PluginMethod\n    public void crear(PluginCall call) {', '    public void crear(PluginCall call) {'],
  ['nativoConRespaldo', N, '  if (!p) {\n    // Dentro de una cáscara sin TLLlave', '  if (p === undefined) {\n    // Dentro de una cáscara sin TLLlave'],
  ['pluginViejoNoRompe', N, '  return p.disponible().catch(() => ({ entrar: false, plataforma: false }));', '  return p.disponible();'],
  ['pluginViejoNoRompe', N, '  try { const r = await p.obtener({ opciones: JSON.stringify(o) }); return JSON.parse(r.respuesta) as J; } catch (e) { throw e instanceof Error ? e : new Error(String(e)); }', '  const r = await p.obtener({ opciones: JSON.stringify(o) }); return JSON.parse(r.respuesta) as J;'],
  // accionesConAcceso (la revocación del equipo)
  ['accionesConAcceso', AU, 'export async function llaveRevocar(id: string, llaveId: string, motivo: string): Promise<ResAdm> {\n  if (typeof llaveId !== "string" || !/^\\d{1,18}$/.test(llaveId)) return no("Esa llave no existe.");',
    'export async function llaveRevocar(id: string, llaveId: string, motivo: string): Promise<ResAdm> {\n  await tx(async (c) => { await c.query(`update passkeys set revoked_at = now(), revoked_by = \'user\' where id = $1`, [llaveId]); });\n  if (typeof llaveId !== "string" || !/^\\d{1,18}$/.test(llaveId)) return no("Esa llave no existe.");'],
];
const crear = [
  ['passkeyNoSaltaBloqueo', 'apps/web/lib/llaves/atajo.ts', 'import "server-only";\nimport { db } from "../db";\nexport async function abrir(u: string, t: string) { await db().query(`insert into sessions (user_id, token_hash, expires_at) values ($1, $2, now() + interval \'1 day\')`, [u, t]); }\n'],
  ['retoUnUso', 'apps/web/lib/llaves/retos-otro.ts', 'import "server-only";\nimport { db } from "../db";\nexport async function usar(h: string) { await db().query(`update webauthn_challenges set used_at = now() where challenge_hash = $1`, [h]); }\n'],
  ['llaveDeSuCuenta', 'apps/web/lib/llaves/otra-verificacion.ts', 'import "server-only";\nimport { verifyAuthenticationResponse } from "@simplewebauthn/server";\nexport const v = verifyAuthenticationResponse;\n'],
  ['llaveSoloDondeSePuede', 'apps/web/app/api/cuenta/llave/atajo/route.ts', 'import { NextResponse } from "next/server";\nexport async function POST(req: Request) { const b = await req.json(); return NextResponse.json(b); }\n'],
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
