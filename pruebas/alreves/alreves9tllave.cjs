// Prueba al revés del guardián de 9t «Pedir el archivo con la llave de acceso»: confirmarConLlave (nuevo) y los de 8d que ahora miran la firma
// compartida firmaDeLlave (retoUnUso, llaveDeSuCuenta). Se inyecta el defecto, el guardián debe fallar con su mensaje; se restaura. «crear»: se
// crea el archivo, se corre y se borra.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const M = 'packages/db/migrations/0184_llave_confirmar.sql', L = 'apps/web/lib/llaves/llaves.ts', X = 'apps/web/lib/datos/exportar.ts', P = 'apps/web/lib/perfil.ts',
  A = 'apps/web/app/(app)/cuenta/acciones-perfil.ts', D = 'apps/web/app/(app)/cuenta/ajustes/privacidad/datos/Datos.tsx', DP = 'apps/web/app/(app)/cuenta/ajustes/privacidad/datos/page.tsx',
  BO = 'apps/web/app/(app)/cuenta/ajustes/borrar/Borrar.tsx', EX = 'apps/web/app/panel/[id]/exportar/Exportar.tsx';
const casos = [
  // La base: un propósito por cosa que se confirma, siempre con cuenta; el libro anota «confirmo».
  ['confirmarConLlave', M, "check (purpose not in ('data_export', 'account_delete') or user_id is not null);", 'check (true);'],
  ['confirmarConLlave', M, "'confirmar', 'data_export', 'account_delete'));", "'confirmar', 'data_export'));"],
  ['confirmarConLlave', M, "'contador', 'confirmo', 'confirmar_fallo'));", "'contador'));"],
  // La prueba es opaca y de un uso; es de esta cuenta y de ESTE propósito.
  ['confirmarConLlave', L, 'const FIRMADAS = new WeakMap<PruebaLlave, Firmada>();', 'export const FIRMADAS = new WeakMap<PruebaLlave, Firmada>();'],
  ['confirmarConLlave', L, '  FIRMADAS.delete(p); // un uso\n', ''],
  ['confirmarConLlave', L, 'if (!f || p.proposito !== proposito || p.userId !== u.id || f.k.user_id !== u.id) return "llave_desconocida";', 'if (!f) return "llave_desconocida";'],
  // El reto: de ESE propósito, atado a la cuenta, con verificación de la persona, solo sus llaves.
  ['confirmarConLlave', L, 'const reto = await nuevoReto(proposito, u.id);', 'const reto = await nuevoReto(proposito, null);'],
  ['confirmarConLlave', L, 'userVerification: "required",\n    allowCredentials: vivas.map', 'userVerification: "preferred",\n    allowCredentials: vivas.map'],
  ['confirmarConLlave', L, '!(await gastarReto(reto, proposito, u.id)))', '!(await gastarReto(reto, "entrar", null)))'],
  // Tope de fallos por cuenta Y por dirección.
  ['confirmarConLlave', L, "(user_id = $1 or ip = $2::inet)`, [u.id, ip]", 'user_id = $1`, [u.id]'],
  // La llave es una viva de ESTA cuenta.
  ['confirmarConLlave', L, 'from passkeys where credential_id = $1 and user_id = $2 and revoked_at is null`, [resp.id, u.id]', 'from passkeys where credential_id = $1 and revoked_at is null`, [resp.id]'],
  // Dentro del pedido: contador quieto, bloqueos, cuenta activa, teléfono verificado y el libro.
  ['confirmarConLlave', L, 'if (!x || x.sign_count !== f.k.sign_count) return mal("llave_desconocida");', 'if (!x) return mal("llave_desconocida");'],
  ['confirmarConLlave', L, '  if ((f.dev && (await c.query(`select 1 from blocked_devices where device = $1::uuid and lifted_at is null`, [f.dev])).rowCount)\n    || (f.k.created_device', '  if ((f.k.created_device'],
  ['confirmarConLlave', L, "  if (!(await c.query(`select 1 from users where id = $1 and cuenta_estado(status, status_until) in ('active', 'muted')`, [u.id])).rowCount) return mal(\"cuenta_bloqueada\");\n", ''],
  ['confirmarConLlave', L, '  if (!(await c.query(`select 1 from users where id = $1 and phone_verified_at is not null`, [u.id])).rowCount) return mal("verificar_sms");\n', ''],
  ['confirmarConLlave', L, 'accion: "confirmo", detalle: proposito', 'accion: "entro", detalle: proposito'],
  ['confirmarConLlave', L, 'export async function hayLlaveParaConfirmar(userId: string): Promise<boolean> {\n  if (!(await llavesAqui())) return false;\n', 'export async function hayLlaveParaConfirmar(userId: string): Promise<boolean> {\n'],
  // Cada pedido gasta la prueba de SU propósito; el propósito lo fija la acción del servidor.
  ['confirmarConLlave', X, 'usarConfirmacionEn(c, u, codigo, "data_export")', 'usarConfirmacionEn(c, u, codigo, "account_delete")'],
  ['confirmarConLlave', P, 'usarConfirmacionEn(c, u, codigo, "account_delete")', 'usarConfirmacionEn(c, u, codigo, "data_export")'],
  ['confirmarConLlave', A, 'confirmarConLlave(u, "account_delete", respuesta)', 'confirmarConLlave(u, "data_export", respuesta)'],
  ['confirmarConLlave', A, 'export async function archivoPedirLlave(respuesta: unknown, negocio: string | null): Promise<ResP> {\n  const u = await quien();', 'export async function archivoPedirLlave(respuesta: unknown, negocio: string | null): Promise<ResP> {\n  const u = await yo();'],
  // Las pantallas: la llave solo si la cuenta tiene una y el dispositivo puede; el código sigue ahí.
  ['confirmarConLlave', D, 'const conLlave = llave && cap, m', 'const conLlave = llave, m'],
  ['confirmarConLlave', BO, 'borrarConfirmar(code, why)', 'borrarConLlave(code, why)'],
  ['confirmarConLlave', EX, 'archivoPedir(code, negocio.id)', 'archivoPedirLlave(code, negocio.id)'],
  ['confirmarConLlave', DP, 'hayLlaveParaConfirmar(u.id)', 'Promise.resolve(true)'],
  // 8d, ahora con la firma compartida: el reto de confirmar se gasta ANTES de la firma; un solo verificador.
  ['retoUnUso', L, '  if (!reto || !(await gastarReto(reto, proposito, u.id))) throw await no("reto_vencido", "reto");\n', '  if (!reto) throw await no("reto_vencido", "reto");\n'],
  ['llaveDeSuCuenta', L, 'const info = await firmaDeLlave(r, k, resp, reto, ip, ua, no);\n  const p: PruebaLlave',
    'const info = (await verifyAuthenticationResponse({ response: resp, expectedChallenge: reto, expectedOrigin: r.origenes, expectedRPID: r.rpId, credential: { id: k.credential_id, publicKey: new Uint8Array(k.public_key), counter: 0 } })).authenticationInfo;\n  const p: PruebaLlave'],
  ['llaveDeSuCuenta', L, '  const info = await firmaDeLlave(r, k, resp, reto, ip, ua, no);\n  const nuevo = info.newCounter;', '  const info = { newCounter: 0, credentialBackedUp: false };\n  const nuevo = info.newCounter;'],
];
const crear = [
  ['confirmarConLlave', 'apps/web/lib/llaves/atajo9t.ts', 'import "server-only";\nimport type { PoolClient } from "pg";\nimport { usarConfirmacionEn, type PruebaLlave } from "./llaves";\nexport const usar = (c: PoolClient, u: { id: string }, codigo: PruebaLlave) => usarConfirmacionEn(c, u, codigo, "data_export");\n'],
  ['confirmarConLlave', 'apps/web/app/(app)/cuenta/acciones-llave9t.ts', '"use server";\nimport { mismoOrigen, yo } from "@/lib/cuenta";\nexport async function confirmar(proposito: string, respuesta: unknown) {\n  if (!(await mismoOrigen())) return null;\n  const u = await yo();\n  if (!u) return null;\n  return (await import("@/lib/llaves/llaves")).confirmarConLlave(u, proposito as never, respuesta);\n}\n'],
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
  console.log(`  ${falla ? '✓' : '✗'} ${g} al revés (crear ${f.split('/').pop()})${out ? ' → ' + out.trim().slice(0, 150) : ''}`); if (falla) bien++;
}
console.log(`\n${bien}/${total} al revés`);
execSync('node guardianes/run.mjs', { cwd: R, stdio: 'inherit' });
// 9b-3 · alrevesQueFalla: un defecto sin cazar pone la prueba en rojo.
if (bien !== total) process.exit(1);
