import "server-only";
import { createHash, createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { leerRotulo } from "./app-nativa-comun";
import { db, tx } from "./db";
import { MODO_SMS, secretoAuth } from "./entorno";

/* Cuenta: teléfono verificado con código de 6 números, sesión persistente por dispositivo (decisión E).
   Seguridad: el código y el token solo se guardan como huella; límites de intentos por teléfono y por IP;
   comparación en tiempo constante; el servidor decide todo. */

export const COOKIE = "tl_s";
/* 6h · La llave de los boletos sin señal de la sesión (lib/boletos-sin-conexion.ts): legible por la app solo bajo /cuenta/boletos, no es una
   credencial (no abre nada en el servidor). */
export const COOKIE_BOLETOS = "tl_bk";
const SESION_DIAS = 180;
const CODIGO_MIN = 10;
const MAX_INTENTOS = 5;
const REENVIO_SEG = 30;
const MAX_POR_TELEFONO_HORA = 5;
const MAX_POR_IP_HORA = 20;

export class ErrorCuenta extends Error {
  constructor(public codigo: string, public espera?: number, public detalle?: { es: string; en: string }) {
    super(codigo);
  }
}

/* Identificador aleatorio del dispositivo (cookie tl_dev, 5 años, solo el servidor la lee): cuentas en el mismo
   dispositivo y «Bloquear dispositivo» del Super Admin. Borrar las cookies lo cambia; es una señal, no una prueba. */
export async function dispositivo(crear: boolean): Promise<string | null> {
  const jar = await cookies();
  const v = jar.get("tl_dev")?.value;
  if (v && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v)) return v;
  if (!crear) return null;
  const n = randomUUID();
  jar.set("tl_dev", n, { path: "/", maxAge: 5 * 365 * 86400, sameSite: "lax", httpOnly: true });
  return n;
}
const fechaCorta = (d: string | Date, en = false) => new Date(d).toLocaleDateString(en ? "en-US" : "es-US", { day: "numeric", month: "long", year: "numeric", timeZone: "America/New_York" });

/* (570) 555-0134 → +15705550134. Solo EE. UU. por ahora (+1, área 2–9). */
export function normalizarTelefono(entrada: string): string | null {
  const d = String(entrada || "").replace(/\D/g, "");
  const diez = d.length === 11 && d.startsWith("1") ? d.slice(1) : d;
  return /^[2-9]\d{9}$/.test(diez) ? `+1${diez}` : null;
}

const huellaCodigo = (tel: string, codigo: string) => createHmac("sha256", secretoAuth()).update(`${tel}:${codigo}`).digest("hex");
const huellaToken = (t: string) => createHash("sha256").update(t).digest("hex");
/* La huella de la sesión de esta petición (para marcar «este» en Privacidad y no cerrarla desde ahí). */
export async function sesionActual(): Promise<string | null> { const t = (await cookies()).get(COOKIE)?.value; return t ? huellaToken(t) : null; }

export async function ipCliente(): Promise<string | null> {
  const h = await headers();
  const ip = h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return ip && /^[0-9a-fA-F:.]+$/.test(ip) ? ip : null;
}

/* Paso 1: pedir el código. Devuelve el código solo en modo pruebas (sandbox). */
export async function pedirCodigo(entrada: string, proposito: "login" | "phone_change" | "account_delete" | "llavero" | "data_export" = "login"): Promise<{ reenviarEn: number; codigoPrueba?: string }> {
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

  // 8i · Una cuenta de revisión de Apple o Google (activa, con su interruptor y su secreto): su código FIJO, sin SMS y sin mostrarlo nunca en
  // pantalla (ni en el modo pruebas). Si no puede entrar ahora, sigue el camino normal (lib/tiendas/revision.ts; guardián revisionAcotada).
  if (proposito === "login") {
    const rev = await tx((c) => import("./tiendas/revision").then((m) => m.codigoParaPedir(c, tel, ip)));
    if (rev === "tope") throw new ErrorCuenta("demasiados");
    if (rev && rev !== "normal") {
      await db().query(
        `insert into otp_codes (phone, purpose, code_hash, ip, channel, expires_at) values ($1, 'login', $2, $3::inet, 'revision', now() + make_interval(mins => $4))`,
        [tel, huellaCodigo(tel, rev.codigo), ip, CODIGO_MIN],
      );
      return { reenviarEn: REENVIO_SEG };
    }
  }
  const codigo = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db().query(
    `insert into otp_codes (phone, purpose, code_hash, ip, channel, expires_at)
     values ($1, $6, $2, $3::inet, $4, now() + make_interval(mins => $5))`,
    [tel, huellaCodigo(tel, codigo), ip, MODO_SMS === "pruebas" ? "pruebas" : "sms", CODIGO_MIN, proposito],
  );
  if (MODO_SMS === "pruebas") return { reenviarEn: REENVIO_SEG, codigoPrueba: codigo };
  throw new ErrorCuenta("sin_proveedor"); // Telnyx se conecta aquí (decisión E2).
}

/* Revisa un código (cambiar teléfono, borrar la cuenta) dentro de una transacción: el último vigente de ese propósito,
   con tope de intentos y comparación de tiempo constante. */
export async function consumirCodigo(c: import("pg").PoolClient, tel: string, proposito: "phone_change" | "account_delete" | "llavero" | "data_export", codigo: string): Promise<"ok" | "codigo_incorrecto" | "codigo_vencido" | "demasiados"> {
  if (!/^\d{6}$/.test(codigo)) return "codigo_incorrecto";
  const f = (await c.query<{ id: number; code_hash: string; attempts: number }>(
    `select id, code_hash, attempts from otp_codes where phone = $1 and purpose = $2 and used_at is null and expires_at > now() order by created_at desc limit 1 for update`, [tel, proposito])).rows[0];
  if (!f) return "codigo_vencido";
  if (f.attempts >= MAX_INTENTOS) return "demasiados";
  const a = Buffer.from(f.code_hash, "hex"), b = Buffer.from(huellaCodigo(tel, codigo), "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) { await c.query("update otp_codes set attempts = attempts + 1 where id = $1", [f.id]); return "codigo_incorrecto"; }
  await c.query("update otp_codes set used_at = now() where id = $1", [f.id]);
  return "ok";
}

/* Paso 2: verificar el código → crea la cuenta si no existe y abre la sesión. */
export async function verificarCodigo(entrada: string, codigo: string): Promise<{ nuevo: boolean; nombre: string | null; id: string }> {
  const tel = normalizarTelefono(entrada);
  if (!tel || !/^\d{6}$/.test(codigo)) throw new ErrorCuenta("codigo_invalido");
  const ip = await ipCliente();
  const h = await headers();
  const dev = await dispositivo(true);

  const res = await tx(async (c) => {
    const o = await c.query<{ id: number; code_hash: string; attempts: number; channel: string }>(
      `select id, code_hash, attempts, channel from otp_codes
        where phone = $1 and purpose = 'login' and used_at is null and expires_at > now()
        order by created_at desc limit 1 for update`,
      [tel],
    );
    const fila = o.rows[0];
    if (!fila) throw new ErrorCuenta("codigo_vencido");
    if (fila.attempts >= MAX_INTENTOS) throw new ErrorCuenta("demasiados");
    // 8i · El código fijo de una cuenta de revisión vale solo si la cuenta SIGUE activa y el interruptor SIGUE encendido.
    const rev = fila.channel === "revision" ? await import("./tiendas/revision") : null;
    if (rev && !(await rev.codigoSigueValiendo(c, tel, ip))) {
      await c.query("update otp_codes set used_at = now() where id = $1", [fila.id]);
      return { error: "codigo_vencido" as const };
    }
    const a = Buffer.from(fila.code_hash, "hex");
    const b = Buffer.from(huellaCodigo(tel, codigo), "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      await c.query("update otp_codes set attempts = attempts + 1 where id = $1", [fila.id]);
      if (rev) { const r = await rev.cuentaDeTelefono(c, tel); if (r) await rev.anotar(c, r.id, "rechazado", "código incorrecto", ip); }
      return { error: "codigo_incorrecto" as const };
    }
    await c.query("update otp_codes set used_at = now() where id = $1", [fila.id]);
    if (rev) { const r = await rev.cuentaDeTelefono(c, tel); if (r) await rev.anotar(c, r.id, "entro", null, ip); }
    return abrirSesionEn(c, { dev: dev as string, ip, ua: h.get("user-agent"), via: "codigo" }, async () => (await c.query<EntradaCuenta>(
      `insert into users (phone, phone_verified_at) values ($1, now())
       on conflict (phone) do update set phone_verified_at = coalesce(users.phone_verified_at, now()), last_seen_at = now()
       returning id, first_name, cuenta_estado(status, status_until) as status, status_until as until, delete_at, (xmax = 0) as nuevo`,
      [tel],
    )).rows[0]!);
  });
  if ("error" in res) throw new ErrorCuenta(res.error!, undefined, "detalle" in res ? res.detalle : undefined);
  await ponerSesion(res.token);
  return { nuevo: res.nuevo, nombre: res.nombre, id: res.id };
}

/* 8d · LA puerta de la sesión: el código por SMS (verificarCodigo) y la llave de acceso (lib/llaves/llaves.ts entrar) abren la sesión AQUÍ,
   con las mismas revisiones y en el mismo orden, dentro de la transacción de quien llama: (1) el dispositivo no está bloqueado; (2) la cuenta
   (`cargar`: el SMS la crea o la toca; la llave solo la lee) puede entrar — suspendida, baneada, borrándose, borrada o fusionada no entra y
   la persona ve el motivo; (3) entrar antes de los 30 días cancela el borrado que pidió la persona; (4) un silencio o una suspensión vencidos
   se levantan; (5) la sesión nace igual (180 días, app y plataforma del rótulo TLApp), solo anota por dónde entró (`via`). Guardián
   passkeyNoSaltaBloqueo: nadie más inserta en sessions. */
export type EntradaCuenta = { id: string; first_name: string | null; status: string; until: string | null; delete_at: string | null; nuevo: boolean };
export type ResEntrada = { token: string; nuevo: boolean; nombre: string | null; id: string } | { error: "dispositivo_bloqueado" | "cuenta_bloqueada" | "sin_cuenta"; detalle?: { es: string; en: string } };
export async function abrirSesionEn(c: import("pg").PoolClient, ctx: { dev: string; ip: string | null; ua: string | null; via: "codigo" | "llave"; passkeyId?: string | null },
  cargar: () => Promise<EntradaCuenta | null>): Promise<ResEntrada> {
  if ((await c.query(`select 1 from blocked_devices where device = $1::uuid and lifted_at is null`, [ctx.dev])).rowCount)
    return { error: "dispositivo_bloqueado" as const };
  const user = await cargar();
  if (!user) return { error: "sin_cuenta" as const };
  // Lo que la persona ve al intentar entrar: el estado, hasta cuándo y el motivo (sanción o borrado).
  // 9d · D5: pasados los 30 días (el barrido la purga en el minuto siguiente) ya no entra: después, nada vuelve. El mismo teléfono, purgada la
  // cuenta, es una cuenta nueva (su teléfono quedó vacío).
  const vencida = !!user.delete_at && new Date(user.delete_at).getTime() <= Date.now();
  if (vencida && !["suspended", "banned"].includes(user.status))
    return { error: "cuenta_bloqueada" as const, detalle: { es: "Esta cuenta se borró. Si vuelves a entrar en unos minutos, empiezas una cuenta nueva.", en: "This account was deleted. If you sign in again in a few minutes, you start a new account." } };
  if (["suspended", "banned", "deleted_pending", "deleted", "merged"].includes(user.status)) {
    const m = (await c.query<{ reason: string }>(
      `select reason from sanctions where target_kind = 'user' and target_id = $1::text and lifted_at is null and kind in ('susp14', 'ban') order by starts_at desc limit 1`, [user.id])).rows[0]?.reason;
    const por = m ? { es: ` Motivo: ${m}.`, en: ` Reason: ${m}.` } : { es: "", en: "" };
    const det = user.status === "suspended" && user.until
      ? { es: `Tu cuenta está suspendida hasta el ${fechaCorta(user.until)}.${por.es}`, en: `Your account is suspended until ${fechaCorta(user.until, true)}.${por.en}` }
      : user.status === "deleted_pending" && user.delete_at
        ? { es: `Esta cuenta se está borrando: se borra del todo el ${fechaCorta(user.delete_at)}. Si fue un error, escríbele a Soporte antes.`, en: `This account is being deleted: it is fully erased on ${fechaCorta(user.delete_at, true)}. If this is a mistake, contact Support before then.` }
        : { es: `Esta cuenta no puede entrar.${por.es} Escríbele a Soporte.`, en: `This account can't sign in.${por.en} Contact Support.` };
    return { error: "cuenta_bloqueada" as const, detalle: det };
  }
  // Entrar antes de los 30 días cancela el borrado que pidió la persona (no el de To'Latino).
  if ((await c.query(`update users set delete_at = null, delete_reason = null where id = $1 and status = 'active' and delete_at > now() and coalesce(delete_reason, '') <> 'admin' returning 1`, [user.id])).rowCount)
    await c.query(`insert into account_changes (user_id, kind, "from", "to", by) values ($1, 'undelete', null, 'entró', 'user')`, [user.id]);
  // Un silencio o una suspensión que ya venció se levanta sola.
  await c.query(`update users set status = 'active', status_until = null where id = $1 and status in ('muted', 'suspended') and status_until <= now()`, [user.id]);

  const token = randomBytes(32).toString("base64url");
  // 8a · La sesión de una cáscara dice qué app, qué plataforma y qué versión (rótulo TLApp; solo informativo: Usuarios 360° › Sesiones,
  // Sistema › Apps). Sin rótulo: la web («cliente» / «web», como siempre).
  const ap = appDeSesion(ctx.ua);
  await c.query(
    `insert into sessions (user_id, token_hash, ip, user_agent, expires_at, device, app, platform, app_version, app_build, os_version, via, passkey_id)
     values ($1, $2, $3::inet, $4, now() + make_interval(days => $5), $6::uuid, $7, $8, $9, $10, $11, $12, $13)`,
    [user.id, huellaToken(token), ctx.ip, (ctx.ua || "").slice(0, 300), SESION_DIAS, ctx.dev, ap.app, ap.platform, ap.version, ap.build, ap.os, ctx.via, ctx.passkeyId ?? null],
  );
  return { token, nuevo: user.nuevo, nombre: user.first_name, id: user.id };
}

/* Las cookies de la sesión recién abierta (las mismas para el código y la llave). */
export async function ponerSesion(token: string): Promise<void> {
  const h = await headers();
  const seguro = (h.get("x-forwarded-proto") || "").includes("https");
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: seguro,
    path: "/",
    maxAge: SESION_DIAS * 86400,
  });
  // 6h · La llave de los boletos sin señal de ESTA sesión (nueva en cada entrada: lo guardado por otra cuenta en el teléfono no se lee).
  (await cookies()).set(COOKIE_BOLETOS, randomBytes(32).toString("base64url"), { httpOnly: false, sameSite: "strict", secure: seguro, path: "/cuenta/boletos", maxAge: SESION_DIAS * 86400 });
}

/* 8a · App, plataforma y versión de la sesión desde el rótulo TLApp (informativo). La versión del sistema sale del user-agent del WebView. */
export function appDeSesion(ua: string | null): { app: string; platform: string; version: string | null; build: number | null; os: string | null } {
  const a = leerRotulo(ua);
  if (!a) return { app: "cliente", platform: "web", version: null, build: null, os: null };
  const os = a.plataforma === "ios" ? /OS (\d{1,2})[_.](\d{1,2})/.exec(ua ?? "") : /Android (\d{1,2}(?:\.\d{1,2})?)/.exec(ua ?? "");
  return { app: a.app, platform: a.plataforma, version: a.version, build: a.build, os: os ? (os[2] ? `${os[1]}.${os[2]}` : os[1]!) : null };
}

export type Yo = { id: string; phone: string; first_name: string | null; last_name: string | null; nick: string | null; lang: string; estado: string; hasta: string | null };

export async function yo(): Promise<Yo | null> {
  const t = (await cookies()).get(COOKIE)?.value;
  if (!t || t.length > 100) return null;
  // 8a · Si la cáscara se actualizó, la sesión anota la versión nueva (solo la versión: la app y la plataforma de una sesión no cambian).
  let ua: string | null = null;
  try { ua = (await headers()).get("user-agent"); } catch { /* fuera de una petición */ }
  const ap = appDeSesion(ua);
  const r = await db().query<Yo>(
    `update sessions s set last_seen_at = now(),
            app_version = case when $2::text is not null and s.app = $4 and s.platform = $5 then $2 else s.app_version end,
            app_build = case when $3::int is not null and s.app = $4 and s.platform = $5 then $3 else s.app_build end
       from users u
      where s.token_hash = $1 and s.user_id = u.id and s.signed_out_at is null and not s.blocked
        and s.expires_at > now() and cuenta_estado(u.status, u.status_until) in ('active', 'muted')
      returning u.id, u.phone, u.first_name, u.last_name, u.nick, u.lang, cuenta_estado(u.status, u.status_until) as estado, u.status_until as hasta`,
    [huellaToken(t), ap.version, ap.build, ap.app, ap.platform],
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
  // 5f · La primera vez (cuenta nueva): si llegó por el enlace de un vecino (/i/{código}), queda como su invitado (cuenta para Capitán).
  if (!u.first_name) await (await import("./invitar")).alCrearCuenta(u.id).catch(() => undefined);
}

export async function salir(): Promise<void> {
  const jar = await cookies();
  const t = jar.get(COOKIE)?.value;
  if (t) await db().query("update sessions set signed_out_at = now() where token_hash = $1 and signed_out_at is null", [huellaToken(t)]);
  jar.delete(COOKIE);
  // 6h · Sin esta llave, los boletos guardados para verlos sin señal ya no se leen en el teléfono (además, la app borra la base al salir).
  jar.delete({ name: COOKIE_BOLETOS, path: "/cuenta/boletos" });
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
