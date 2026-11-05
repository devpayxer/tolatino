import "server-only";
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { db, tx } from "./db";
import { MODO_SMS, secretoAuth } from "./entorno";

/* Cuenta: teléfono verificado con código de 6 números, sesión persistente por dispositivo (decisión E).
   Seguridad: el código y el token solo se guardan como huella; límites de intentos por teléfono y por IP;
   comparación en tiempo constante; el servidor decide todo. */

export const COOKIE = "tl_s";
const SESION_DIAS = 180;
const CODIGO_MIN = 10;
const MAX_INTENTOS = 5;
const REENVIO_SEG = 30;
const MAX_POR_TELEFONO_HORA = 5;
const MAX_POR_IP_HORA = 20;

export class ErrorCuenta extends Error {
  constructor(public codigo: string, public espera?: number) {
    super(codigo);
  }
}

/* (570) 555-0134 → +15705550134. Solo EE. UU. por ahora (+1, área 2–9). */
export function normalizarTelefono(entrada: string): string | null {
  const d = String(entrada || "").replace(/\D/g, "");
  const diez = d.length === 11 && d.startsWith("1") ? d.slice(1) : d;
  return /^[2-9]\d{9}$/.test(diez) ? `+1${diez}` : null;
}

const huellaCodigo = (tel: string, codigo: string) => createHmac("sha256", secretoAuth()).update(`${tel}:${codigo}`).digest("hex");
const huellaToken = (t: string) => createHash("sha256").update(t).digest("hex");

export async function ipCliente(): Promise<string | null> {
  const h = await headers();
  const ip = h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return ip && /^[0-9a-fA-F:.]+$/.test(ip) ? ip : null;
}

/* Paso 1: pedir el código. Devuelve el código solo en modo pruebas (sandbox). */
export async function pedirCodigo(entrada: string): Promise<{ reenviarEn: number; codigoPrueba?: string }> {
  const tel = normalizarTelefono(entrada);
  if (!tel) throw new ErrorCuenta("telefono_invalido");
  const ip = await ipCliente();
  const r = await db().query<{ ultimo: number | null; tel_hora: number; ip_hora: number }>(
    `select extract(epoch from now() - max(created_at) filter (where phone = $1))::float as ultimo,
            count(*) filter (where phone = $1 and created_at > now() - interval '1 hour')::int as tel_hora,
            count(*) filter (where ip = $2::inet and created_at > now() - interval '1 hour')::int as ip_hora
       from otp_codes where (phone = $1 or ip = $2::inet) and created_at > now() - interval '1 hour'`,
    [tel, ip],
  );
  const x = r.rows[0];
  if (x?.ultimo != null && x.ultimo < REENVIO_SEG) throw new ErrorCuenta("espera", Math.ceil(REENVIO_SEG - x.ultimo));
  if ((x?.tel_hora ?? 0) >= MAX_POR_TELEFONO_HORA || (x?.ip_hora ?? 0) >= MAX_POR_IP_HORA) throw new ErrorCuenta("demasiados");

  const codigo = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db().query(
    `insert into otp_codes (phone, purpose, code_hash, ip, channel, expires_at)
     values ($1, 'login', $2, $3::inet, $4, now() + make_interval(mins => $5))`,
    [tel, huellaCodigo(tel, codigo), ip, MODO_SMS === "pruebas" ? "pruebas" : "sms", CODIGO_MIN],
  );
  if (MODO_SMS === "pruebas") return { reenviarEn: REENVIO_SEG, codigoPrueba: codigo };
  throw new ErrorCuenta("sin_proveedor"); // Telnyx se conecta aquí (decisión E2).
}

/* Paso 2: verificar el código → crea la cuenta si no existe y abre la sesión. */
export async function verificarCodigo(entrada: string, codigo: string): Promise<{ nuevo: boolean; nombre: string | null }> {
  const tel = normalizarTelefono(entrada);
  if (!tel || !/^\d{6}$/.test(codigo)) throw new ErrorCuenta("codigo_invalido");
  const ip = await ipCliente();
  const h = await headers();

  const res = await tx(async (c) => {
    const o = await c.query<{ id: number; code_hash: string; attempts: number }>(
      `select id, code_hash, attempts from otp_codes
        where phone = $1 and purpose = 'login' and used_at is null and expires_at > now()
        order by created_at desc limit 1 for update`,
      [tel],
    );
    const fila = o.rows[0];
    if (!fila) throw new ErrorCuenta("codigo_vencido");
    if (fila.attempts >= MAX_INTENTOS) throw new ErrorCuenta("demasiados");
    const a = Buffer.from(fila.code_hash, "hex");
    const b = Buffer.from(huellaCodigo(tel, codigo), "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      await c.query("update otp_codes set attempts = attempts + 1 where id = $1", [fila.id]);
      return { error: "codigo_incorrecto" as const };
    }
    await c.query("update otp_codes set used_at = now() where id = $1", [fila.id]);

    const u = await c.query<{ id: string; first_name: string | null; status: string; nuevo: boolean }>(
      `insert into users (phone, phone_verified_at) values ($1, now())
       on conflict (phone) do update set phone_verified_at = coalesce(users.phone_verified_at, now()), last_seen_at = now()
       returning id, first_name, status, (xmax = 0) as nuevo`,
      [tel],
    );
    const user = u.rows[0]!;
    if (["suspended", "banned", "deleted", "merged"].includes(user.status)) throw new ErrorCuenta("cuenta_bloqueada");

    const token = randomBytes(32).toString("base64url");
    await c.query(
      `insert into sessions (user_id, token_hash, ip, user_agent, expires_at)
       values ($1, $2, $3::inet, $4, now() + make_interval(days => $5))`,
      [user.id, huellaToken(token), ip, (h.get("user-agent") || "").slice(0, 300), SESION_DIAS],
    );
    return { token, nuevo: user.nuevo, nombre: user.first_name };
  });
  if ("error" in res) throw new ErrorCuenta(res.error!);

  const seguro = (h.get("x-forwarded-proto") || "").includes("https");
  (await cookies()).set(COOKIE, res.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: seguro,
    path: "/",
    maxAge: SESION_DIAS * 86400,
  });
  return { nuevo: res.nuevo, nombre: res.nombre };
}

export type Yo = { id: string; phone: string; first_name: string | null; last_name: string | null; nick: string | null; lang: string };

export async function yo(): Promise<Yo | null> {
  const t = (await cookies()).get(COOKIE)?.value;
  if (!t || t.length > 100) return null;
  const r = await db().query<Yo>(
    `update sessions s set last_seen_at = now()
       from users u
      where s.token_hash = $1 and s.user_id = u.id and s.signed_out_at is null and not s.blocked
        and s.expires_at > now() and u.status in ('active', 'muted')
      returning u.id, u.phone, u.first_name, u.last_name, u.nick, u.lang`,
    [huellaToken(t)],
  );
  return r.rows[0] ?? null;
}

export async function guardarPerfil(p: { first: string; last: string; nick?: string }): Promise<void> {
  const u = await yo();
  if (!u) throw new ErrorCuenta("sin_sesion");
  const limpio = (s: string | undefined, max: number) => (s ?? "").replace(/\s+/g, " ").trim().slice(0, max);
  const first = limpio(p.first, 60), last = limpio(p.last, 60), nick = limpio(p.nick, 40);
  if (!first || !last) throw new ErrorCuenta("nombre_requerido");
  await tx(async (c) => {
    await c.query("update users set first_name = $2, last_name = $3, nick = nullif($4, '') where id = $1", [u.id, first, last, nick]);
    const antes = [u.first_name, u.last_name].filter(Boolean).join(" ");
    if (antes !== `${first} ${last}`)
      await c.query(`insert into account_changes (user_id, kind, "from", "to", by) values ($1, 'name', $2, $3, 'user')`, [u.id, antes || null, `${first} ${last}`]);
  });
}

export async function salir(): Promise<void> {
  const jar = await cookies();
  const t = jar.get(COOKIE)?.value;
  if (t) await db().query("update sessions set signed_out_at = now() where token_hash = $1 and signed_out_at is null", [huellaToken(t)]);
  jar.delete(COOKIE);
}

/* Las rutas que cambian algo solo aceptan peticiones del mismo sitio (defensa CSRF además de SameSite). */
export async function mismoOrigen(): Promise<boolean> {
  const h = await headers();
  const origen = h.get("origin");
  const host = h.get("x-forwarded-host") || h.get("host");
  if (!origen || !host) return false;
  try {
    return new URL(origen).host === host;
  } catch {
    return false;
  }
}

/* Reclamar negocio (decisión R1): código por SMS al TELÉFONO DEL NEGOCIO, mismo motor que el de entrar (huella,
   vencimiento, intentos, límites). Prueba que quien reclama tiene acceso a ese teléfono; una persona aprueba igual. */
export async function codigoReclamo(telNegocio: string): Promise<{ reenviarEn: number; codigoPrueba?: string }> {
  const tel = normalizarTelefono(telNegocio);
  if (!tel) throw new ErrorCuenta("telefono_invalido");
  const ip = await ipCliente();
  const r = await db().query<{ ultimo: number | null; tel_hora: number; tel_dia: number; ip_hora: number }>(
    `select extract(epoch from now() - max(created_at) filter (where phone = $1))::float as ultimo,
            count(*) filter (where phone = $1 and created_at > now() - interval '1 hour')::int as tel_hora,
            count(*) filter (where phone = $1 and created_at > now() - interval '1 day')::int as tel_dia,
            count(*) filter (where ip = $2::inet and created_at > now() - interval '1 hour')::int as ip_hora
       from otp_codes where purpose = 'claim_call' and (phone = $1 or ip = $2::inet) and created_at > now() - interval '1 day'`, [tel, ip]);
  const x = r.rows[0];
  if (x?.ultimo != null && x.ultimo < REENVIO_SEG) throw new ErrorCuenta("espera", Math.ceil(REENVIO_SEG - x.ultimo));
  if ((x?.tel_hora ?? 0) >= 3 || (x?.tel_dia ?? 0) >= 5 || (x?.ip_hora ?? 0) >= 5) throw new ErrorCuenta("demasiados");
  const codigo = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db().query(
    `insert into otp_codes (phone, purpose, code_hash, ip, channel, expires_at) values ($1, 'claim_call', $2, $3::inet, $4, now() + make_interval(mins => $5))`,
    [tel, huellaCodigo(tel, codigo), ip, MODO_SMS === "pruebas" ? "pruebas" : "sms", CODIGO_MIN]);
  if (MODO_SMS === "pruebas") return { reenviarEn: REENVIO_SEG, codigoPrueba: codigo };
  throw new ErrorCuenta("sin_proveedor");
}
/* Verifica el código del reclamo dentro de la transacción de quien llama (para crear el reclamo en la misma). */
export async function verificarCodigoReclamo(c: import("pg").PoolClient, telNegocio: string, codigo: string): Promise<"ok" | "codigo_incorrecto" | "codigo_vencido" | "demasiados"> {
  const tel = normalizarTelefono(telNegocio);
  if (!tel || !/^\d{6}$/.test(codigo)) return "codigo_incorrecto";
  const f = (await c.query<{ id: number; code_hash: string; attempts: number }>(
    `select id, code_hash, attempts from otp_codes where phone = $1 and purpose = 'claim_call' and used_at is null and expires_at > now()
      order by created_at desc limit 1 for update`, [tel])).rows[0];
  if (!f) return "codigo_vencido";
  if (f.attempts >= MAX_INTENTOS) return "demasiados";
  const a = Buffer.from(f.code_hash, "hex"), b = Buffer.from(huellaCodigo(tel, codigo), "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) { await c.query("update otp_codes set attempts = attempts + 1 where id = $1", [f.id]); return "codigo_incorrecto"; }
  await c.query("update otp_codes set used_at = now() where id = $1", [f.id]);
  return "ok";
}
