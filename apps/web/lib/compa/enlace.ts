import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { valor } from "../config";
import { db, tx } from "../db";
import { confirmar, descartar, type ResAccion } from "./acciones";
import { opVecino, type OpHoja } from "./hoja";

/* 7h · El enlace de UN USO de WhatsApp y SMS (fase7-compa.md §3 «Canales» y §1b #6; guardianes canalConFirma y compaAccionConfirmada).
   Por mensaje NUNCA se confirma nada: El Compa prepara la acción (como en la app) y manda un enlace que abre la confirmación en la app.
   - El token (24 bytes al azar) solo viaja en el mensaje; la base guarda su sha256 (compa_links) atado a UNA acción y a UNA cuenta, con
     vencimiento (compa_link_min). La acción vive lo mismo que el enlace.
   - Abrir el enlace NO entra a nadie: la página pide la sesión de siempre (Entrar con el código) y vuelve. Sin sesión, ni los datos ni la
     acción se ven (los robots que abren enlaces para la vista previa no ven nada ni gastan el enlace: abrir no lo usa).
   - Solo sirve para LA cuenta del teléfono: con otra sesión dice que es de otra cuenta, sin datos, y no lo gasta.
   - Se usa una vez: al confirmar o dejar la acción, con la fila del enlace tomada (dos toques a la vez = uno). Vencido = no hace nada.
   - Confirmar es confirmar() de acciones.ts con via «link»: la misma función, los mismos permisos y el estado leído otra vez. */
const TOKEN = /^[A-Za-z0-9_-]{32}$/;
const sha = (t: string) => createHash("sha256").update(t).digest("hex");
const BASE = () => (process.env.TOLATINO_URL || "https://pruebas.tolatino.com").replace(/\/$/, "");

export async function crearEnlace(x: { accion: string; userId: string; convId: number; canal: "sms" | "whatsapp"; inboundId: string | null }): Promise<string> {
  const token = randomBytes(24).toString("base64url"), min = await valor("compa_link_min");
  await db().query(
    `insert into compa_links (token_hash, action_id, user_id, conversation_id, channel, inbound_id, expires_at) values ($1, $2::uuid, $3::uuid, $4::bigint, $5, $6::bigint, now() + make_interval(mins => $7::int))`,
    [sha(token), x.accion, x.userId, x.convId, x.canal, x.inboundId, min]);
  return `${BASE()}/compa/e/${token}`;
}

type Bi = { es: string; en: string };
export type EstadoEnlace =
  | { k: "ok"; tipo: "cancel_request" | "open_screen"; canal: "sms" | "whatsapp"; vence: string; op: OpHoja | null; pantalla: Bi; negocio: string | null }
  | { k: "usado"; como: string } | { k: "vencido" } | { k: "otra" } | { k: "no" };

/* Lo que ve la página (con sesión): solo si el enlace es de ESA cuenta, sin usar y sin vencer. */
export async function leerEnlace(userId: string, token: string): Promise<EstadoEnlace> {
  if (!TOKEN.test(String(token ?? ""))) return { k: "no" };
  const l = (await db().query<{ user_id: string; usado: string | null; vencido: boolean; canal: "sms" | "whatsapp"; vence: string; tipo: string; estado: string; a_vencida: boolean; target: Record<string, string> }>(
    `select l.user_id::text, l.used_result as usado, l.expires_at < now() as vencido, l.channel as canal, to_char(l.expires_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as vence,
            a.type as tipo, a.status as estado, a.expires_at < now() as a_vencida, a.target
       from compa_links l join compa_actions a on a.id = l.action_id where l.token_hash = $1`, [sha(token)])).rows[0];
  if (!l) return { k: "no" };
  if (l.user_id !== userId) return { k: "otra" };
  if (l.usado) return { k: "usado", como: l.usado };
  if (l.vencido || l.a_vencida || l.estado !== "proposed" || (l.tipo !== "cancel_request" && l.tipo !== "open_screen")) return { k: "vencido" };
  const op = l.target?.numero ? await opVecino(userId, l.target.numero) : null;
  const opH = op ? (({ id: _i, ayuda: _a, ...v }) => { void _i; void _a; return v; })(op) : null;
  const pantalla: Bi = l.target?.numero ? { es: `Abrir ${l.target.numero}`, en: `Open ${l.target.numero}` } : { es: "Abrir Mi cuenta", en: "Open My account" };
  return { k: "ok", tipo: l.tipo, canal: l.canal, vence: l.vence, op: opH, pantalla, negocio: l.target?.negocio ?? opH?.negocio ?? null };
}

/* Usar el enlace (la acción de la página; mismo origen y sesión los revisa quien llama). «si» = confirmar; «no» = dejarla. Una vez. */
export async function usarEnlace(q: { userId: string }, token: string, decision: "si" | "no"): Promise<ResAccion & { enlace?: "usado" | "vencido" | "otra" | "no" }> {
  const NO: ResAccion & { enlace: "no" } = { ok: false, estado: "no", enlace: "no", msg: { es: "Ese enlace no existe.", en: "That link does not exist." } };
  if (!TOKEN.test(String(token ?? ""))) return NO;
  const h = sha(token);
  return tx(async (c) => {
    // La fila del enlace queda tomada mientras se decide: dos toques a la vez = una sola acción.
    const l = (await c.query<{ action_id: string; user_id: string; usado: boolean; vencido: boolean }>(
      `select action_id::text, user_id::text, used_at is not null as usado, expires_at < now() as vencido from compa_links where token_hash = $1 for update`, [h])).rows[0];
    if (!l) return NO;
    if (l.user_id !== q.userId) return { ok: false, estado: "no", enlace: "otra", msg: { es: "Este enlace es de otra cuenta. Entra con la cuenta del teléfono que recibió el mensaje.", en: "This link belongs to another account. Sign in with the account of the phone that got the message." } };
    if (l.usado) return { ok: false, estado: "ya", enlace: "usado", msg: { es: "Ya usaste este enlace.", en: "You already used this link." } };
    if (l.vencido) return { ok: false, estado: "expired", enlace: "vencido", msg: { es: "Este enlace ya venció. Pídeselo otra vez al Compa.", en: "This link has expired. Ask El Compa again." } };
    const r = decision === "si" ? await confirmar({ userId: q.userId }, l.action_id, "link") : await descartar({ userId: q.userId }, l.action_id);
    const como = r.ok ? (decision === "si" ? "confirmed" : "dismissed") : r.estado === "expired" ? "expired" : "failed";
    await c.query(`update compa_links set used_at = now(), used_result = case when expires_at < now() then 'expired' else $2 end where token_hash = $1`, [h, como]);
    return r;
  });
}
