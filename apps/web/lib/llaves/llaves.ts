import "server-only";
import { createHash, createHmac, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import type { PoolClient } from "pg";
import {
  generateAuthenticationOptions, generateRegistrationOptions, verifyAuthenticationResponse, verifyRegistrationResponse,
  type AuthenticationResponseJSON, type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { abrirSesionEn, appDeSesion, dispositivo, ErrorCuenta, ipCliente, ponerSesion, sesionActual, type EntradaCuenta, type Yo } from "../cuenta";
import { valor } from "../config";
import { db, tx } from "../db";
import { secretoAuth } from "../entorno";
import { llavesAqui, type Rp } from "./config";

/* 8d · Entrar con Face ID o huella: llaves de acceso (passkeys, WebAuthn) — fase8-apps.md §3.4, §4 8d; DECISIONES E.
   La verificación criptográfica la hace @simplewebauthn/server (MIT, 14.0.3 fijo): origen, RP ID, reto, tipo de ceremonia, presencia y
   verificación de la persona (Face ID / huella / PIN: SIEMPRE requerida), firma y contador. Además, aquí:
   · El reto nace en el servidor (32 bytes al azar), se guarda solo como huella, vence a los passkey_reto_s y se CONSUME una vez, en una sola
     escritura atómica y ANTES de verificar (un intento fallido también lo gasta). Atado al dispositivo y, para registrar, a la cuenta (retoUnUso).
   · La llave se busca por su id; la sesión se abre SOLO para la cuenta dueña de esa llave, y el userHandle que manda el autenticador tiene que
     ser el de esa cuenta (llaveDeSuCuenta).
   · Entrar con llave pasa por lib/cuenta.ts abrirSesionEn: la misma sesión y las mismas revisiones que el código por SMS (dispositivo
     bloqueado, cuenta suspendida, baneada o borrándose; entrar cancela el borrado pedido). Y además: la llave no entra si el dispositivo o la
     sesión donde nació están bloqueados, ni si el equipo restableció la verificación del teléfono (esa vez se entra con el código)
     (passkeyNoSaltaBloqueo).
   · Contador que retrocede = posible clon: no entra y la llave se quita sola (aviso crit a la persona).
   · Límites: retos por dirección por hora, fallos por dirección y por llave por hora (Configuración › Apps).
   · Agregar una llave manda el aviso crit cuenta_llave_nueva (sin interruptor). Todo queda en passkey_log (solo inserción). */

const ALGS = [-8, -7, -257]; // EdDSA, ES256, RS256 (COSE). Ni más ni menos.
const huella = (x: string) => createHash("sha256").update(x).digest("hex");
const b64u = (b: Uint8Array) => Buffer.from(b).toString("base64url");
/* El userHandle de una cuenta: opaco (no dice el id ni el teléfono), estable, solo el servidor lo puede calcular. */
export const manejador = (userId: string) => createHmac("sha256", secretoAuth()).update(`llave:${userId}`).digest().subarray(0, 32);
const fallo = (codigo: string) => new ErrorCuenta(codigo);

/* ── Nombre de la llave: el dispositivo (del user-agent o la app) y, si se conoce, el administrador de llaves (AAGUID público). ── */
const AAGUID: Record<string, string> = {
  "fbfc3007-154e-4ecc-8c0b-6e020557d7bd": "iCloud Keychain", "ea9b8d66-4d01-1d21-3ce4-b6b48cb575d4": "Google Password Manager",
  "adce0002-35bc-c60a-648b-0b25f1f05503": "Chrome", "08987058-cadc-4b81-b6e1-30de50dcbe96": "Windows Hello", "9ddd1817-af5a-4672-a2b9-3e3dd95000a9": "Windows Hello",
  "6028b017-b1d4-4c02-b4b3-afcdafc96bb2": "Windows Hello", "53414d53-554e-4700-0000-000000000000": "Samsung Pass", "bada5566-a7aa-401f-bd96-45619a55120d": "1Password",
  "d548826e-79b4-db40-a3d8-11116f7e8349": "Bitwarden",
};
const APPS: Record<string, string> = { cliente: "To'Latino", negocio: "To'Latino Negocios", delivery: "To'Latino Repartidor", checkin: "To'Latino Puerta" };
export function nombreLlave(ua: string | null, aaguid: string | null): string {
  const u = ua ?? "";
  const so = /iPhone/.test(u) ? "iPhone" : /iPad/.test(u) ? "iPad" : /Android/.test(u) ? "Android" : /Mac OS X|Macintosh/.test(u) ? "Mac" : /Windows/.test(u) ? "Windows" : /CrOS/.test(u) ? "Chromebook" : /Linux/.test(u) ? "Linux" : "";
  const ap = appDeSesion(ua);
  const nav = ap.platform !== "web" ? APPS[ap.app] ?? "To'Latino"
    : /Edg\//.test(u) ? "Edge" : /SamsungBrowser/.test(u) ? "Samsung Internet" : /CriOS|Chrome\//.test(u) ? "Chrome" : /FxiOS|Firefox\//.test(u) ? "Firefox" : /Safari\//.test(u) ? "Safari" : "";
  const prov = aaguid && AAGUID[aaguid] && AAGUID[aaguid] !== nav ? AAGUID[aaguid] : "";
  return [so, nav, prov].filter(Boolean).join(" · ").slice(0, 80) || "Llave de acceso";
}

async function contexto() {
  const h = await headers();
  return { ua: h.get("user-agent"), ip: await ipCliente() };
}
async function anotar(c: PoolClient | null, x: { llave?: string | null; user?: string | null; accion: string; detalle?: string; ip?: string | null; ua?: string | null; dev?: string | null }) {
  const ap = appDeSesion(x.ua ?? null);
  const q = (await (c ?? db()).query(
    `insert into passkey_log (passkey_id, user_id, city_id, action, detail, ip, device, app, platform)
     values ($1, $2, (select home_city_id from users where id = $2), $3, $4, $5::inet, $6::uuid, $7, $8)`,
    [x.llave ?? null, x.user ?? null, x.accion, x.detalle?.slice(0, 120) ?? null, x.ip ?? null, x.dev ?? null, ap.app, ap.platform]));
  return q;
}

/* Reto nuevo: 32 bytes al azar; se guarda solo su huella, con el dispositivo, la dirección y (para registrar) la cuenta. Tope por dirección
   (o por dispositivo si no hay dirección) por hora. */
async function nuevoReto(proposito: "registro" | "entrar", userId: string | null): Promise<string> {
  const { ip } = await contexto();
  const dev = (await dispositivo(true)) as string;
  const [tope, vida] = await Promise.all([valor("passkey_retos_hora"), valor("passkey_reto_s")]);
  const n = (await db().query<{ n: number }>(
    `select count(*)::int as n from webauthn_challenges where created_at > now() - interval '1 hour' and (ip = $1::inet or ($1::inet is null and device = $2::uuid))`, [ip, dev])).rows[0]?.n ?? 0;
  if (n >= tope) throw fallo("demasiados");
  const reto = randomBytes(32).toString("base64url");
  await db().query(`insert into webauthn_challenges (purpose, challenge_hash, user_id, device, ip, expires_at) values ($1, $2, $3, $4::uuid, $5::inet, now() + make_interval(secs => $6))`,
    [proposito, huella(reto), userId, dev, ip, vida]);
  return reto;
}

/* Gasta el reto: UNA escritura atómica (de vigente y sin usar a usado). Devuelve el reto si era de este propósito, de este dispositivo (y de esta
   cuenta, al registrar), y no había vencido ni se había usado. Va FUERA de la transacción de la sesión: un intento que falla también lo gasta. */
async function gastarReto(reto: string, proposito: "registro" | "entrar", userId: string | null): Promise<boolean> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(reto)) return false;
  const dev = await dispositivo(false);
  if (!dev) return false;
  const r = await db().query(
    `update webauthn_challenges set used_at = now()
      where challenge_hash = $1 and purpose = $2 and used_at is null and expires_at > now() and device = $3::uuid and user_id is not distinct from $4::uuid
      returning id`, [huella(reto), proposito, dev, userId]);
  return (r.rowCount ?? 0) === 1;
}

/* El reto y el tipo que trae clientDataJSON (sin confiar en nada más del cliente: la biblioteca vuelve a comprobarlo todo). Un marco de otro
   origen (crossOrigin) no vale. */
function leerCliente(cdj: unknown, tipo: "webauthn.create" | "webauthn.get"): string | null {
  if (typeof cdj !== "string" || cdj.length > 4096) return null;
  try {
    const j = JSON.parse(Buffer.from(cdj, "base64url").toString("utf8")) as { type?: unknown; challenge?: unknown; crossOrigin?: unknown };
    if (j.type !== tipo || j.crossOrigin === true || typeof j.challenge !== "string") return null;
    return j.challenge;
  } catch { return null; }
}
const corto = (x: unknown, max: number) => typeof x === "string" && x.length > 0 && x.length <= max;

/* ── Registrar (con sesión) ── */
export async function retoRegistro(u: Yo) {
  const r = await llavesAqui();
  if (!r) throw fallo("llave_no_disponible");
  const vivas = (await db().query<{ credential_id: string; transports: string[] }>(`select credential_id, transports from passkeys where user_id = $1 and revoked_at is null`, [u.id])).rows;
  if (vivas.length >= (await valor("passkey_max"))) throw fallo("llave_maximo");
  const reto = await nuevoReto("registro", u.id);
  const nombre = [u.first_name, u.last_name ? `${u.last_name.slice(0, 1)}.` : ""].filter(Boolean).join(" ");
  const tel = u.phone.replace(/^\+1(\d{3})(\d{3})(\d{4})$/, "($1) $2-$3");
  return generateRegistrationOptions({
    rpName: "To'Latino", rpID: r.rpId, userID: manejador(u.id), userName: tel, userDisplayName: nombre || tel, challenge: Buffer.from(reto, "base64url"),
    timeout: (await valor("passkey_reto_s")) * 1000, attestationType: "none", supportedAlgorithmIDs: ALGS,
    excludeCredentials: vivas.map((x) => ({ id: x.credential_id, transports: x.transports })),
    authenticatorSelection: { residentKey: "required", requireResidentKey: true, userVerification: "required" },
  });
}

export async function registrar(u: Yo, cuerpo: unknown): Promise<{ id: string; nombre: string }> {
  const r = await llavesAqui();
  if (!r) throw fallo("llave_no_disponible");
  const { ua, ip } = await contexto();
  const resp = cuerpo as RegistrationResponseJSON;
  if (!resp || typeof resp !== "object" || !corto(resp.id, 1366) || resp.type !== "public-key" || !resp.response || !corto(resp.response.attestationObject, 16384)) throw fallo("llave_invalida");
  const reto = leerCliente(resp.response.clientDataJSON, "webauthn.create");
  if (!reto || !(await gastarReto(reto, "registro", u.id))) { await anotar(null, { user: u.id, accion: "registro_fallo", detalle: "reto", ip, ua }).catch(() => undefined); throw fallo("reto_vencido"); }
  let v;
  try {
    v = await verifyRegistrationResponse({ response: resp, expectedChallenge: reto, expectedOrigin: r.origenes, expectedRPID: r.rpId, expectedType: "webauthn.create",
      requireUserPresence: true, requireUserVerification: true, supportedAlgorithmIDs: ALGS });
  } catch (e) { await anotar(null, { user: u.id, accion: "registro_fallo", detalle: String((e as Error)?.message ?? e), ip, ua }).catch(() => undefined); throw fallo("llave_invalida"); }
  if (!v.verified || !v.registrationInfo.userVerified) { await anotar(null, { user: u.id, accion: "registro_fallo", detalle: "sin verificar", ip, ua }).catch(() => undefined); throw fallo("llave_invalida"); }
  const info = v.registrationInfo, cred = info.credential;
  const aaguid = /^[0-9a-f-]{36}$/.test(info.aaguid) && info.aaguid !== "00000000-0000-0000-0000-000000000000" ? info.aaguid : null;
  const nombre = nombreLlave(ua, aaguid), ap = appDeSesion(ua);
  const res = await tx(async (c) => {
    if ((await c.query(`select 1 from passkeys where credential_id = $1`, [cred.id])).rowCount) return { error: "llave_repetida" as const };
    if ((await c.query<{ n: number }>(`select count(*)::int as n from passkeys where user_id = $1 and revoked_at is null`, [u.id])).rows[0]!.n >= (await valor("passkey_max"))) return { error: "llave_maximo" as const };
    const sid = (await c.query<{ id: string; device: string | null }>(`select id::text, device::text from sessions where token_hash = $1 and user_id = $2`, [await sesionActual(), u.id])).rows[0];
    const id = (await c.query<{ id: string }>(
      `insert into passkeys (user_id, city_id, credential_id, public_key, sign_count, aaguid, transports, device_type, backed_up, name, rp_id, created_via_app, created_platform, created_session, created_device)
       values ($1, (select home_city_id from users where id = $1), $2, $3, $4, $5::uuid, $6, $7, $8, $9, $10, $11, $12, $13::uuid, $14::uuid) returning id::text`,
      [u.id, cred.id, Buffer.from(cred.publicKey), cred.counter, aaguid, (cred.transports ?? []).filter((t) => /^[a-z-]{2,20}$/.test(t)).slice(0, 8), info.credentialDeviceType,
        info.credentialBackedUp, nombre, r.rpId, ap.app, ap.platform, sid?.id ?? null, sid?.device ?? null])).rows[0]!.id;
    await c.query(`insert into account_changes (user_id, kind, "from", "to", by) values ($1, 'passkey', null, $2, 'user')`, [u.id, `agregó ${nombre}`]);
    await anotar(c, { llave: id, user: u.id, accion: "registrada", detalle: nombre, ip, ua });
    return { id };
  });
  if ("error" in res) { await anotar(null, { user: u.id, accion: "registro_fallo", detalle: res.error, ip, ua }).catch(() => undefined); throw fallo(res.error!); }
  // Aviso de seguridad (crit: sin interruptor; SMS al teléfono verificado y push privado). Nunca rompe lo que ya se guardó.
  const { avisar } = await import("../avisos");
  await avisar(u.id, "cuenta_llave_nueva", { dispositivo: nombre }, { href: "/cuenta/ajustes/privacidad", ref: ["passkey", res.id] });
  return { id: res.id, nombre };
}

/* ── Entrar (sin sesión) ── */
export async function retoEntrar() {
  const r = await llavesAqui();
  if (!r) throw fallo("llave_no_disponible");
  const reto = await nuevoReto("entrar", null);
  // Sin allowCredentials: el teléfono ofrece las llaves de To'Latino que tenga (la cuenta sale de la llave, no de lo que escriba nadie).
  return generateAuthenticationOptions({ rpID: r.rpId, challenge: Buffer.from(reto, "base64url"), timeout: (await valor("passkey_reto_s")) * 1000, userVerification: "required" });
}

type Llave = { id: string; user_id: string; credential_id: string; public_key: Buffer; sign_count: string; transports: string[]; name: string; created_session: string | null; created_device: string | null };
export async function entrar(cuerpo: unknown): Promise<{ nuevo: boolean; nombre: string | null; id: string }> {
  const r = await llavesAqui();
  if (!r) throw fallo("llave_no_disponible");
  const { ua, ip } = await contexto();
  const dev = (await dispositivo(true)) as string;
  const tope = await valor("passkey_fallos_hora");
  // Límite por dirección (o por dispositivo sin dirección): demasiados fallos en una hora → esperar o entrar con el código.
  const nIp = (await db().query<{ n: number }>(
    `select count(*)::int as n from passkey_log where action = 'entrar_fallo' and at > now() - interval '1 hour' and (ip = $1::inet or ($1::inet is null and device = $2::uuid))`, [ip, dev])).rows[0]?.n ?? 0;
  if (nIp >= tope) throw fallo("demasiados");
  const no = async (codigo: string, detalle: string, llave?: Llave, det?: { es: string; en: string }) => {
    await anotar(null, { llave: llave?.id, user: llave?.user_id, accion: "entrar_fallo", detalle, ip, ua, dev }).catch(() => undefined);
    return new ErrorCuenta(codigo, undefined, det);
  };
  const resp = cuerpo as AuthenticationResponseJSON;
  if (!resp || typeof resp !== "object" || !corto(resp.id, 1366) || resp.type !== "public-key" || !resp.response || !corto(resp.response.authenticatorData, 4096) || !corto(resp.response.signature, 2048))
    throw await no("llave_invalida", "forma");
  const reto = leerCliente(resp.response.clientDataJSON, "webauthn.get");
  if (!reto || !(await gastarReto(reto, "entrar", null))) throw await no("reto_vencido", "reto");
  const k = (await db().query<Llave>(
    `select id::text, user_id, credential_id, public_key, sign_count::text, transports, name, created_session::text, created_device::text
       from passkeys where credential_id = $1 and revoked_at is null`, [resp.id])).rows[0];
  if (!k) throw await no("llave_desconocida", "desconocida");
  const nK = (await db().query<{ n: number }>(`select count(*)::int as n from passkey_log where passkey_id = $1 and action = 'entrar_fallo' and at > now() - interval '1 hour'`, [k.id])).rows[0]?.n ?? 0;
  if (nK >= tope) throw await no("demasiados", "tope llave", k);
  // La llave es de UNA cuenta: el userHandle que firma el autenticador (si lo manda) tiene que ser el de la dueña de la llave.
  const uh = resp.response.userHandle;
  if (uh != null && (typeof uh !== "string" || Buffer.from(uh, "base64url").compare(manejador(k.user_id)) !== 0)) throw await no("llave_invalida", "otra cuenta", k);
  const verificar = (contador: number) => verifyAuthenticationResponse({ response: resp, expectedChallenge: reto, expectedOrigin: r.origenes, expectedRPID: r.rpId, expectedType: "webauthn.get",
    requireUserVerification: true, credential: { id: k.credential_id, publicKey: new Uint8Array(k.public_key), counter: contador, transports: k.transports as never } });
  let v;
  try {
    v = await verificar(Number(k.sign_count));
  } catch (e) {
    const m = String((e as Error)?.message ?? e);
    // Contador que retrocede. OJO: la biblioteca revisa el contador ANTES que la firma; cualquiera que sepa el id de una llave podría mandar
    // basura con un contador bajo. Solo si la FIRMA es buena (se verifica de nuevo sin el contador) es una copia de la llave de verdad: no
    // entra y la llave se quita sola (con aviso a la persona). Con la firma mala es un intento inválido más y la llave sigue viva.
    if (/counter value/i.test(m)) {
      const firmaBuena = await verificar(0).then((x) => x.verified && x.authenticationInfo.userVerified).catch(() => false);
      if (firmaBuena) { await quitarPorContador(k, ip, ua); throw await no("llave_desconocida", "contador", k); }
      throw await no("llave_invalida", "contador sin firma", k);
    }
    throw await no("llave_invalida", m.slice(0, 60), k);
  }
  if (!v.verified || !v.authenticationInfo.userVerified) throw await no("llave_invalida", "sin verificar", k);
  const nuevo = v.authenticationInfo.newCounter;

  const res = await tx(async (c) => {
    // Otra vez, con la llave bloqueada: sigue viva y el contador no se movió mientras tanto (dos entradas a la vez con la misma firma: una).
    const x = (await c.query<{ sign_count: string }>(`select sign_count::text from passkeys where id = $1 and revoked_at is null for update`, [k.id])).rows[0];
    if (!x || x.sign_count !== k.sign_count) return { error: "llave_desconocida" as const };
    // La llave no salta un bloqueo: el dispositivo o la sesión donde nació, bloqueados → no entra (además del de este dispositivo, en abrirSesionEn).
    if ((k.created_device && (await c.query(`select 1 from blocked_devices where device = $1::uuid and lifted_at is null`, [k.created_device])).rowCount)
      || (k.created_session && (await c.query(`select 1 from sessions where id = $1::uuid and blocked`, [k.created_session])).rowCount)) return { error: "dispositivo_bloqueado" as const };
    // El equipo restableció la verificación del teléfono (cree que alguien entró): esa vez se entra con el código por SMS; la llave no lo salta.
    if (!(await c.query(`select 1 from users where id = $1 and phone_verified_at is not null`, [k.user_id])).rowCount) return { error: "verificar_sms" as const };
    await c.query(`update passkeys set sign_count = $2, last_used_at = now(), backed_up = $3 where id = $1`, [k.id, nuevo, v.authenticationInfo.credentialBackedUp]);
    return abrirSesionEn(c, { dev, ip, ua, via: "llave", passkeyId: k.id }, async () => (await c.query<EntradaCuenta>(
      `update users set last_seen_at = now() where id = $1
       returning id, first_name, cuenta_estado(status, status_until) as status, status_until as until, delete_at, false as nuevo`, [k.user_id])).rows[0] ?? null);
  });
  if ("error" in res) throw await no(res.error, res.error, k, "detalle" in res ? res.detalle : undefined);
  await ponerSesion(res.token);
  await anotar(null, { llave: k.id, user: k.user_id, accion: "entro", ip, ua, dev }).catch(() => undefined);
  return { nuevo: false, nombre: res.nombre, id: res.id };
}

async function quitarPorContador(k: Llave, ip: string | null, ua: string | null) {
  const ok = await tx(async (c) => {
    const n = (await c.query(`update passkeys set revoked_at = now(), revoked_by = 'sistema', revoked_reason = 'contador' where id = $1 and revoked_at is null`, [k.id])).rowCount ?? 0;
    if (!n) return false;
    await c.query(`insert into account_changes (user_id, kind, "from", "to", by) values ($1, 'passkey', $2, 'quitada: posible copia', 'sistema')`, [k.user_id, k.name]);
    await anotar(c, { llave: k.id, user: k.user_id, accion: "contador", detalle: "el contador retrocedió", ip, ua });
    return true;
  });
  if (ok) await (await import("../avisos")).avisar(k.user_id, "cuenta_llave_quitada", { dispositivo: k.name, motivo: "parece que alguien usó una copia de esa llave" }, { href: "/cuenta/ajustes/privacidad", ref: ["passkey", k.id] });
}

/* ── La hoja «Entra la próxima vez con Face ID / tu huella»: UNA vez por cuenta (se marca en la misma escritura que decide mostrarla). Solo si
   aquí se ofrecen llaves y la cuenta todavía no tiene una viva. ── */
export async function ofrecerUnaVez(u: Yo): Promise<boolean> {
  if (!(await llavesAqui())) return false;
  const r = await db().query(
    `update users set llave_ofrecida_at = now() where id = $1 and llave_ofrecida_at is null
        and not exists (select 1 from passkeys p where p.user_id = users.id and p.revoked_at is null) returning 1`, [u.id]);
  return (r.rowCount ?? 0) === 1;
}

/* ── Mi cuenta › Privacidad › Llaves de acceso ── */
export async function misLlaves(userId: string) {
  return (await db().query<{ id: string; nombre: string; creada: string; usada: string | null; sync: boolean }>(
    `select id::text, name as nombre, to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as creada,
            to_char(last_used_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as usada, device_type = 'multiDevice' as sync
       from passkeys where user_id = $1 and revoked_at is null order by coalesce(last_used_at, created_at) desc limit 20`, [userId])).rows;
}
export async function quitar(u: Yo, id: string): Promise<{ ok: true } | { ok: false; msg: { es: string; en: string } }> {
  if (!/^\d{1,18}$/.test(String(id))) return { ok: false, msg: { es: "Esa llave no existe.", en: "That passkey does not exist." } };
  const { ip, ua } = await contexto();
  const ok = await tx(async (c) => {
    const k = (await c.query<{ name: string }>(`update passkeys set revoked_at = now(), revoked_by = 'user' where id = $1 and user_id = $2 and revoked_at is null returning name`, [id, u.id])).rows[0];
    if (!k) return false;
    await c.query(`insert into account_changes (user_id, kind, "from", "to", by) values ($1, 'passkey', $2, 'quitada', 'user')`, [u.id, k.name]);
    await anotar(c, { llave: id, user: u.id, accion: "quitada", detalle: "la persona", ip, ua });
    return true;
  });
  return ok ? { ok: true } : { ok: false, msg: { es: "Esa llave ya no estaba.", en: "That passkey was already removed." } };
}

/* ── Super Admin › Usuarios 360° › Seguridad: revocar una llave (usr:editar, con motivo, en la transacción de la acción, con aviso y auditoría
   en acciones-usuarios.ts). ── */
export async function revocarEn(c: PoolClient, staffId: string, userId: string, id: string, motivo: string): Promise<string | null> {
  const k = (await c.query<{ name: string }>(
    `update passkeys set revoked_at = now(), revoked_by = 'staff', revoked_staff = $3, revoked_reason = $4 where id = $1 and user_id = $2 and revoked_at is null returning name`, [id, userId, staffId, motivo])).rows[0];
  if (!k) return null;
  await c.query(`insert into account_changes (user_id, kind, "from", "to", by) values ($1, 'passkey', $2, 'revocada por el equipo', 'staff')`, [userId, k.name]);
  await anotar(c, { llave: id, user: userId, accion: "revocada", detalle: "el equipo" });
  return k.name;
}
/* Restablecer la verificación (el equipo cree que alguien entró a la cuenta): las llaves vivas se quitan también. */
export async function quitarTodasEn(c: PoolClient, userId: string): Promise<number> {
  const r = await c.query<{ id: string; name: string }>(
    `update passkeys set revoked_at = now(), revoked_by = 'sistema', revoked_reason = 'verificación restablecida' where user_id = $1 and revoked_at is null returning id::text, name`, [userId]);
  for (const k of r.rows) {
    await c.query(`insert into account_changes (user_id, kind, "from", "to", by) values ($1, 'passkey', $2, 'quitada: verificación restablecida', 'sistema')`, [userId, k.name]);
    await anotar(c, { llave: k.id, user: userId, accion: "revocada", detalle: "verificación restablecida" });
  }
  return r.rowCount ?? 0;
}
export async function llavesDe360(userId: string) {
  return (await db().query<{ id: string; nombre: string; creada: string; usada: string | null; revocada: string | null; por: string | null; motivo: string | null; plat: string; app: string; sync: boolean; usos: number }>(
    `select p.id::text, p.name as nombre, p.created_at as creada, p.last_used_at as usada, p.revoked_at as revocada, p.revoked_by as por, p.revoked_reason as motivo,
            p.created_platform as plat, p.created_via_app as app, p.device_type = 'multiDevice' as sync,
            (select count(*)::int from passkey_log l where l.passkey_id = p.id and l.action = 'entro') as usos
       from passkeys p where p.user_id = $1 order by (p.revoked_at is null) desc, coalesce(p.last_used_at, p.created_at) desc limit 20`, [userId])).rows;
}
export type { Rp };

/* El barrido: los retos vencidos hace más de un día se purgan (retención; lo único que se borra). De a 5 000 por vuelta. */
export async function purgarRetos(): Promise<number> {
  return (await db().query(`delete from webauthn_challenges where id in (select id from webauthn_challenges where expires_at < now() - interval '1 day' limit 5000)`)).rowCount ?? 0;
}
