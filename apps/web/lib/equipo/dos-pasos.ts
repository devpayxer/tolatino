import "server-only";
import { createHmac, randomInt } from "node:crypto";
import type { PoolClient } from "pg";
import { cifrar, descifrar } from "../cifrado";
import { ipCliente, sesionActual, type Yo } from "../cuenta";
import { db, tx } from "../db";
import { ENTORNO, MODO_SMS, secretoAuth } from "../entorno";
import { matrizTexto } from "../qr/matriz";
import { coincide, nuevoSecreto, uriOtp } from "./totp";

/* 9j · El segundo factor del equipo (fase9-apertura.md §4 9j, §6 #8; T#30; LAUNCH L35, L1319). Toda cuenta con rol del Super Admin entra con su
   teléfono Y con uno de estos dos, en ESA sesión:
   · la llave de acceso (8d): una sesión abierta con la llave ya trae los dos pasos (algo que tienes + Face ID o huella);
   · el TOTP propio (lib/equipo/totp.ts): la app de códigos del teléfono, con 10 códigos de recuperación de un solo uso.
   «Tu cuenta del equipo necesita tu llave de acceso o tu app de códigos. El SMS solo no alcanza.» Sin eso, staff() (lib/admin.ts) devuelve null:
   ninguna pantalla, acción ni ruta del Super Admin abre (guardián equipoConDosPasos).
   Estados de una sesión del equipo:
   · ok: la sesión ya dio su segundo factor (sessions.mfa_at) o entró con la llave.
   · codigo: tiene la app de códigos dada de alta → pide el código (o uno de recuperación).
   · llave: no tiene app de códigos pero sí una llave de acceso → que entre con la llave (una sesión de solo SMS no da de alta otro factor:
     así quien tiene el chip de otro no se agrega el suyo). Si perdió la llave, un Admin le restablece los dos pasos.
   · alta: no tiene ninguno → da de alta la app de códigos (QR una sola vez, primer código y los 10 de recuperación una sola vez).
   · bloqueado: 5 intentos malos en 15 minutos (códigos, repetidos o de recuperación) → espera o un Admin restablece.
   El camino de las pruebas (SOLO con el código de entrada en pantalla, TOLATINO_SMS_MODO=pruebas, que lib/entorno.ts no deja existir en producción):
   los teléfonos de FICCIÓN de staff_mfa_pruebas (los llena la semilla del sandbox) pasan como «pruebas». En producción ni se lee la tabla, y una
   sesión marcada «pruebas» no cuenta.
   Todo queda en staff_mfa_log (solo inserción) y lo que cambia un factor, en la auditoría. Nunca se debilita la entrada de siempre: esto es un paso
   MÁS, solo para el Super Admin. */
export type EstadoDosPasos = "ok" | "codigo" | "llave" | "alta" | "bloqueado";
export type Dos = { estado: EstadoDosPasos; quedan: number; espera: number };
type Bi = { es: string; en: string };
export type ResDos = { ok: true; quedan?: number; codigos?: string[] } | { ok: false; msg: Bi };

/* El camino de las pruebas existe solo si el código de entrada se muestra en pantalla y el entorno no es producción (dos candados). */
const CAMINO_PRUEBAS = MODO_SMS === "pruebas" && ENTORNO !== "produccion";
const TOPE_FALLOS = 5;
const VENTANA_MIN = 15;
const RECUPERACION_N = 10;
const LETRAS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const huellaRecuperacion = (userId: string, codigo: string) => createHmac("sha256", secretoAuth()).update(`recuperacion:${userId}:${codigo}`).digest("hex");
const limpiarRecuperacion = (x: string) => String(x ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16);
const mal = (es: string, en: string): ResDos => ({ ok: false, msg: { es, en } });

type FilaSesion = { id: string; via: string; mfa_at: string | null; mfa_via: string | null; mfa_id: string | null; enrolled: boolean | null; quedan: number | null; llaves: number };
async function leerSesion(u: Yo): Promise<FilaSesion | null> {
  const th = await sesionActual();
  if (!th) return null;
  return (await db().query<FilaSesion>(
    `select s.id::text, s.via, s.mfa_at::text, s.mfa_via, f.id::text as mfa_id, f.enrolled_at is not null as enrolled, cardinality(f.recovery_hashes) as quedan,
            (select count(*)::int from passkeys p where p.user_id = s.user_id and p.revoked_at is null) as llaves
       from sessions s left join staff_mfa f on f.user_id = s.user_id and f.revoked_at is null
      where s.token_hash = $1 and s.user_id = $2 and s.signed_out_at is null and not s.blocked and s.expires_at > now()`, [th, u.id])).rows[0] ?? null;
}

/* Minutos que faltan para que se levante el bloqueo (0 = no está bloqueado). Cuenta los fallos de los últimos 15 minutos, después del último
   «restablecido» (cuando un Admin restablece los dos pasos, la persona empieza de cero). */
async function bloqueo(q: PoolClient | ReturnType<typeof db>, userId: string): Promise<number> {
  const r = (await q.query<{ hasta: string | null }>(
    `select (at + make_interval(mins => $3::int))::text as hasta from staff_mfa_log
      where user_id = $1 and action in ('codigo_fallo', 'codigo_repetido', 'recuperacion_fallo') and at > now() - make_interval(mins => $3::int)
        and at > coalesce((select max(x.at) from staff_mfa_log x where x.user_id = $1 and x.action = 'restablecido'), '-infinity'::timestamptz)
      order by at desc offset ($2::int - 1) limit 1`, [userId, TOPE_FALLOS, VENTANA_MIN])).rows[0];
  if (!r?.hasta) return 0;
  return Math.max(1, Math.ceil((new Date(r.hasta).getTime() - Date.now()) / 60000));
}

/* LA pregunta: ¿esta sesión del equipo ya dio su segundo factor? (lib/admin.ts staff() y requerir() la hacen en cada petición del Super Admin). */
export async function estadoDosPasos(u: Yo): Promise<Dos> {
  const s = await leerSesion(u);
  if (!s) return { estado: "alta", quedan: 0, espera: 0 };
  if (s.via === "llave") return { estado: "ok", quedan: s.quedan ?? 0, espera: 0 };
  if (s.mfa_at && (s.mfa_via !== "pruebas" || CAMINO_PRUEBAS)) return { estado: "ok", quedan: s.quedan ?? 0, espera: 0 };
  if (CAMINO_PRUEBAS && MODO_SMS === "pruebas" && ENTORNO !== "produccion") {
    const exento = (await db().query(`select 1 from staff_mfa_pruebas where phone = $1`, [u.phone])).rowCount === 1;
    if (exento) {
      await tx(async (c) => {
        const n = (await c.query(`update sessions set mfa_at = now(), mfa_via = 'pruebas' where id = $1::uuid and mfa_at is null`, [s.id])).rowCount ?? 0;
        if (n) await c.query(`insert into staff_mfa_log (user_id, session_id, action, ip) values ($1, $2::uuid, 'pruebas', $3::inet)`, [u.id, s.id, await ipCliente()]);
      });
      return { estado: "ok", quedan: 0, espera: 0 };
    }
  }
  const espera = await bloqueo(db(), u.id);
  if (espera) return { estado: "bloqueado", quedan: s.quedan ?? 0, espera };
  if (s.enrolled) return { estado: "codigo", quedan: s.quedan ?? 0, espera: 0 };
  if (s.llaves > 0) return { estado: "llave", quedan: 0, espera: 0 };
  return { estado: "alta", quedan: 0, espera: 0 };
}

async function anotar(c: PoolClient, x: { user: string; mfa?: string | null; sesion?: string | null; accion: string; by?: string | null }) {
  await c.query(`insert into staff_mfa_log (user_id, mfa_id, session_id, action, by, ip) values ($1, $2::bigint, $3::uuid, $4, $5, $6::inet)`,
    [x.user, x.mfa ?? null, x.sesion ?? null, x.accion, x.by ?? null, await ipCliente()]);
}
async function marcarSesion(c: PoolClient, sesion: string, via: "totp" | "recuperacion") {
  await c.query(`update sessions set mfa_at = now(), mfa_via = $2 where id = $1::uuid and mfa_at is null`, [sesion, via]);
}
/* Un fallo cuenta para el bloqueo; el que llega al tope deja su fila «bloqueado» (y la auditoría). */
async function fallo(userId: string, mfa: string | null, sesion: string, accion: "codigo_fallo" | "codigo_repetido" | "recuperacion_fallo"): Promise<number> {
  return tx(async (c) => {
    await anotar(c, { user: userId, mfa, sesion, accion });
    const espera = await bloqueo(c, userId);
    if (espera) {
      await anotar(c, { user: userId, mfa, sesion, accion: "bloqueado" });
      const { auditar } = await import("../admin");
      await auditar(c, { actor: userId, action: "equipo.dos_pasos.bloqueo", targetKind: "staff", targetId: userId, reason: `${TOPE_FALLOS} intentos malos en ${VENTANA_MIN} minutos` });
    }
    return espera;
  });
}
const avisarCambio = async (userId: string, es: string, en: string) =>
  (await import("../avisos")).avisar(userId, "equipo_dos_pasos", { que: es, que_en: en }, { href: "/admin/dos-pasos", ref: ["staff_mfa", userId] }).catch(() => undefined);

/* ¿Es del equipo? (con el estado de sus dos pasos). Solo para la pantalla de los dos pasos y sus acciones: lo demás usa staff(). */
async function delEquipo(u: Yo): Promise<boolean> {
  return (await db().query(`select 1 from staff_members where user_id = $1 and status = 'active'`, [u.id])).rowCount === 1;
}

/* ── Alta: el secreto nuevo (el QR y el texto se muestran UNA vez; recargar empieza otra alta y la anterior queda revocada) ── */
export async function empezarAlta(u: Yo): Promise<{ ok: true; secreto: string; uri: string; matriz: boolean[][] } | { ok: false; msg: Bi }> {
  if (!(await delEquipo(u))) return { ok: false, msg: { es: "Esta zona es del equipo.", en: "This area is for the team." } };
  const d = await estadoDosPasos(u), s = await leerSesion(u);
  if (d.estado !== "alta" || !s) return { ok: false, msg: d.estado === "llave" ? { es: "Tu cuenta tiene llave de acceso: entra con ella.", en: "Your account has a passkey: sign in with it." } : { es: "Tu app de códigos ya está dada de alta.", en: "Your code app is already set up." } };
  const secreto = nuevoSecreto();
  await tx(async (c) => {
    await c.query(`select pg_advisory_xact_lock(hashtextextended($1, 0))`, [`dos-pasos:${u.id}`]);
    const viva = (await c.query<{ id: string; enrolled: boolean }>(`select id::text, enrolled_at is not null as enrolled from staff_mfa where user_id = $1 and revoked_at is null for update`, [u.id])).rows[0];
    if (viva?.enrolled) throw new Error("ya dada de alta");
    if (viva) await c.query(`update staff_mfa set revoked_at = now(), revoked_by = $2, revoked_reason = 'Alta nueva sin confirmar la anterior' where id = $1`, [viva.id, u.id]);
    const id = (await c.query<{ id: string }>(`insert into staff_mfa (user_id, kind, totp_secret_enc) values ($1, 'totp', $2) returning id::text`, [u.id, cifrar(secreto)])).rows[0]!.id;
    await anotar(c, { user: u.id, mfa: id, sesion: s.id, accion: "alta_inicio" });
  });
  const cuenta = `${u.first_name ?? "Equipo"} · ${u.phone.slice(-4)}`;
  const uri = uriOtp(secreto, cuenta);
  return { ok: true, secreto, uri, matriz: matrizTexto(uri) };
}

function codigosRecuperacion(): string[] {
  return Array.from({ length: RECUPERACION_N }, () => Array.from({ length: 8 }, () => LETRAS[randomInt(0, LETRAS.length)]).join("").replace(/^(.{4})/, "$1-"));
}

/* El primer código confirma el alta: desde ahí la sesión tiene sus dos pasos y salen los 10 códigos de recuperación (UNA vez; se guardan como huella). */
export async function confirmarAlta(u: Yo, entrada: string): Promise<ResDos> {
  if (!(await delEquipo(u))) return mal("Esta zona es del equipo.", "This area is for the team.");
  const d = await estadoDosPasos(u), s = await leerSesion(u);
  if (d.estado === "bloqueado") return mal(`Demasiados intentos. Espera ${d.espera} min o pídele a un Admin que restablezca tus dos pasos.`, `Too many attempts. Wait ${d.espera} min or ask an Admin to reset your two steps.`);
  if (d.estado !== "alta" || !s?.mfa_id) return mal("Empieza otra vez el alta.", "Start the setup again.");
  const f = (await db().query<{ enc: Buffer }>(`select totp_secret_enc as enc from staff_mfa where id = $1 and revoked_at is null and enrolled_at is null`, [s.mfa_id])).rows[0];
  const secreto = f ? descifrar(f.enc) : null;
  if (!secreto) return mal("Empieza otra vez el alta.", "Start the setup again.");
  const paso = coincide(secreto, entrada);
  if (paso == null) { await fallo(u.id, s.mfa_id, s.id, "codigo_fallo"); return mal("Ese código no es. Revisa la hora del teléfono y escribe el que se ve ahora.", "That code is not right. Check your phone's time and type the one showing now."); }
  const codigos = codigosRecuperacion();
  const ok = await tx(async (c) => {
    const n = (await c.query(`update staff_mfa set enrolled_at = now(), last_step = $2, last_used_at = now(), recovery_hashes = $3 where id = $1 and revoked_at is null and enrolled_at is null`,
      [s.mfa_id, paso, codigos.map((x) => huellaRecuperacion(u.id, limpiarRecuperacion(x)))])).rowCount ?? 0;
    if (!n) return false;
    await marcarSesion(c, s.id, "totp");
    await anotar(c, { user: u.id, mfa: s.mfa_id, sesion: s.id, accion: "alta" });
    const { auditar } = await import("../admin");
    await auditar(c, { actor: u.id, action: "equipo.dos_pasos.alta", targetKind: "staff", targetId: u.id, after: { factor: "App de códigos", recuperacion: RECUPERACION_N } });
    return true;
  });
  if (!ok) return mal("Empieza otra vez el alta.", "Start the setup again.");
  await avisarCambio(u.id, "Diste de alta tu app de códigos", "You set up your code app");
  return { ok: true, codigos, quedan: RECUPERACION_N };
}

/* Entrar con el código de la app. Un código ya usado (el mismo paso o uno anterior) no vuelve a entrar. */
export async function entrarConCodigo(u: Yo, entrada: string): Promise<ResDos> {
  if (!(await delEquipo(u))) return mal("Esta zona es del equipo.", "This area is for the team.");
  const d = await estadoDosPasos(u), s = await leerSesion(u);
  if (d.estado === "ok") return { ok: true };
  if (d.estado === "bloqueado") return mal(`Demasiados intentos. Espera ${d.espera} min o pídele a un Admin que restablezca tus dos pasos.`, `Too many attempts. Wait ${d.espera} min or ask an Admin to reset your two steps.`);
  if (d.estado !== "codigo" || !s?.mfa_id) return mal("Tu cuenta no tiene app de códigos.", "Your account has no code app.");
  const f = (await db().query<{ enc: Buffer; last_step: string | null }>(`select totp_secret_enc as enc, last_step::text from staff_mfa where id = $1 and revoked_at is null and enrolled_at is not null`, [s.mfa_id])).rows[0];
  const secreto = f ? descifrar(f.enc) : null;
  if (!f || !secreto) return mal("No pudimos leer tu app de códigos. Pídele a un Admin que restablezca tus dos pasos.", "We could not read your code app. Ask an Admin to reset your two steps.");
  const paso = coincide(secreto, entrada);
  if (paso == null) { await fallo(u.id, s.mfa_id, s.id, "codigo_fallo"); return mal("Ese código no es. Escribe el que se ve ahora en tu app.", "That code is not right. Type the one showing now in your app."); }
  const ok = await tx(async (c) => {
    // La escritura condicionada es la que decide: dos peticiones con el mismo código, una sola entra.
    const n = (await c.query(`update staff_mfa set last_step = $2, last_used_at = now() where id = $1 and revoked_at is null and enrolled_at is not null and (last_step is null or last_step < $2)`, [s.mfa_id, paso])).rowCount ?? 0;
    if (!n) return false;
    await marcarSesion(c, s.id, "totp");
    await anotar(c, { user: u.id, mfa: s.mfa_id, sesion: s.id, accion: "codigo" });
    return true;
  });
  if (!ok) { await fallo(u.id, s.mfa_id, s.id, "codigo_repetido"); return mal("Ese código ya se usó. Espera el siguiente (cambia cada 30 segundos).", "That code was already used. Wait for the next one (it changes every 30 seconds)."); }
  return { ok: true };
}

/* Entrar con un código de recuperación: sirve UNA vez (la base solo deja gastarlos). */
export async function entrarConRecuperacion(u: Yo, entrada: string): Promise<ResDos> {
  if (!(await delEquipo(u))) return mal("Esta zona es del equipo.", "This area is for the team.");
  const d = await estadoDosPasos(u), s = await leerSesion(u);
  if (d.estado === "ok") return { ok: true };
  if (d.estado === "bloqueado") return mal(`Demasiados intentos. Espera ${d.espera} min o pídele a un Admin que restablezca tus dos pasos.`, `Too many attempts. Wait ${d.espera} min or ask an Admin to reset your two steps.`);
  if (d.estado !== "codigo" || !s?.mfa_id) return mal("Tu cuenta no tiene app de códigos.", "Your account has no code app.");
  const limpio = limpiarRecuperacion(entrada);
  if (limpio.length !== 8) { await fallo(u.id, s.mfa_id, s.id, "recuperacion_fallo"); return mal("Ese código de recuperación no es.", "That recovery code is not right."); }
  const h = huellaRecuperacion(u.id, limpio);
  const quedan = await tx(async (c) => {
    const r = (await c.query<{ n: number }>(`update staff_mfa set recovery_hashes = array_remove(recovery_hashes, $2), last_used_at = now()
        where id = $1 and revoked_at is null and enrolled_at is not null and $2 = any (recovery_hashes) returning cardinality(recovery_hashes) as n`, [s.mfa_id, h])).rows[0];
    if (!r) return null;
    await marcarSesion(c, s.id, "recuperacion");
    await anotar(c, { user: u.id, mfa: s.mfa_id, sesion: s.id, accion: "recuperacion" });
    const { auditar } = await import("../admin");
    await auditar(c, { actor: u.id, action: "equipo.dos_pasos.recuperacion", targetKind: "staff", targetId: u.id, after: { quedan: r.n } });
    return r.n;
  });
  if (quedan == null) { await fallo(u.id, s.mfa_id, s.id, "recuperacion_fallo"); return mal("Ese código de recuperación no es o ya se usó.", "That recovery code is not right or was already used."); }
  await avisarCambio(u.id, `Entraste con un código de recuperación (te quedan ${quedan})`, `You signed in with a recovery code (${quedan} left)`);
  return { ok: true, quedan };
}

/* Un Admin restablece los dos pasos de OTRA persona del equipo (perdió el teléfono y los códigos): su app de códigos queda revocada y sus sesiones
   tienen que volver a dar el segundo factor. Con motivo, auditoría y aviso a la persona. Lo revisa lib/admin.ts (sys:editar) antes de llamar. */
export async function restablecerEn(c: PoolClient, actor: string, userId: string, motivo: string): Promise<boolean> {
  const viva = (await c.query<{ id: string }>(`select id::text from staff_mfa where user_id = $1 and revoked_at is null for update`, [userId])).rows[0];
  if (viva) await c.query(`update staff_mfa set revoked_at = now(), revoked_by = $2, revoked_reason = $3 where id = $1`, [viva.id, actor, motivo]);
  const n = (await c.query(`update sessions set mfa_at = null, mfa_via = null where user_id = $1 and mfa_at is not null`, [userId])).rowCount ?? 0;
  await c.query(`insert into staff_mfa_log (user_id, mfa_id, action, by, ip) values ($1, $2::bigint, 'restablecido', $3, $4::inet)`, [userId, viva?.id ?? null, actor, await ipCliente()]);
  return !!viva || n > 0;
}
export const avisarRestablecido = (userId: string) => avisarCambio(userId, "Un Admin restableció tus dos pasos: da de alta tu app de códigos otra vez", "An Admin reset your two steps: set up your code app again");

/* Sistema › Equipo: el segundo factor de cada miembro (sin secretos: solo qué tiene y desde cuándo). */
export type FactorMiembro = { userId: string; app: string | null; quedan: number; llaves: number; pruebas: boolean; ultimo: string | null };
export async function factoresDelEquipo(ids: string[]): Promise<Map<string, FactorMiembro>> {
  if (!ids.length) return new Map();
  const r = await db().query<FactorMiembro>(
    `select u.id::text as "userId", f.enrolled_at::text as app, coalesce(cardinality(f.recovery_hashes), 0) as quedan,
            (select count(*)::int from passkeys p where p.user_id = u.id and p.revoked_at is null) as llaves,
            ${CAMINO_PRUEBAS ? "exists (select 1 from staff_mfa_pruebas x where x.phone = u.phone)" : "false"} as pruebas,
            (select max(l.at)::text from staff_mfa_log l where l.user_id = u.id and l.action in ('codigo', 'recuperacion', 'alta')) as ultimo
       from users u left join staff_mfa f on f.user_id = u.id and f.revoked_at is null and f.enrolled_at is not null
      where u.id = any ($1::uuid[])`, [ids]);
  return new Map(r.rows.map((x) => [x.userId, x]));
}
