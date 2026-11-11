import "server-only";
import { citaCliente } from "../citas-flujo";
import { valor } from "../config";
import { db } from "../db";
import { rsvCliente } from "../reservas";
import type { OpRef } from "./contexto-vecino";
import type { Uso } from "./modelo";
import type { Respuesta } from "./verificar";

/* 7c · Lo que El Compa puede PREPARAR (fase7-compa.md §3 «Lo que puede HACER»; guardianes compaSinDinero y compaAccionConfirmada). Lista
   cerrada: cancel_request (una solicitud PENDIENTE y GRATIS), open_screen (abrir una pantalla de una lista cerrada) y go_to_panel (una
   sección del panel que esa persona puede abrir). Pasar a una persona va por persona.ts (abrir un caso no mueve nada).
   - El modelo solo PROPONE: validarAccion() la revisa contra el contexto de la sesión (la ref tiene que ser de SU mapa; nada que venga
     del modelo se usa como id) y proponer() la guarda con un id de un uso que vence a los compa_accion_min.
   - Nada se ejecuta en la petición que trae la respuesta del modelo. confirmar() es OTRA petición de la misma persona (sesión y mismo
     origen los revisa quien la llama), vuelve a leer el estado y llama a la MISMA función de siempre de su módulo (CANCELABLES), con sus
     reglas de plazo, aviso y permiso. Si cambió algo, vence («Ya cambió»); si la función dice que no, falla con su motivo.
   - Nunca: cobrar, devolver, transferir, boletos, algo confirmado o con cargo, teléfono, correo, ciudad, contraseña, plan, datos del
     negocio, aprobar o rechazar, cupones, puntos, monedas ni mandar mensajes por alguien (este archivo no importa nada de eso). */
type Bi = { es: string; en: string };
type ResModulo = { ok: true } | { ok: false; msg: Bi };
/* Solicitudes pendientes y gratis: la función de cancelar DEL CLIENTE de cada módulo (la misma que llama su pantalla). */
const CANCELABLES: Record<string, (userId: string, numero: string) => Promise<ResModulo>> = {
  appointment: async (u, n) => citaCliente(u, n, "cancelar", undefined, "compa"),
  table: async (u, n) => rsvCliente(u, n, "cancelar", "otro", "compa"),
};
export const tiposCancelables = () => Object.keys(CANCELABLES);

/* Adónde lleva cada pantalla (solo navegar; la persona hace y confirma allí, como siempre). */
const BASE: Record<string, string> = { appointment: "/cita", table: "/reserva", order: "/pedido", market_order: "/mercado", hold: "/apartado", party: "/fiesta", trip: "/viaje",
  night: "/noche", visit: "/vis", private_event: "/privado", rental: "/renta", plan: "/plan", quote: "/solicitud", tickets: "/eventos/orden" };
const CUENTA: Record<string, string> = { cuenta_telefono: "/cuenta/ajustes", cuenta_ciudad: "/cuenta/ajustes/ciudad", cuenta_privacidad: "/cuenta/ajustes/privacidad", soporte: "/soporte" };
export type Propuesta = { type: "cancel_request" | "open_screen" | "go_to_panel"; operationId: string | null; opStatus: string | null; target: Record<string, string> };
/* 7e · go_to_panel: solo una sección de `secciones` — las de la guía del panel (compa_panel_guide) que ESA persona puede abrir en ESE negocio
   (contexto-panel.ts; lo arma el servidor con la sesión). Un código que no esté ahí (de una parte que no tiene, inventado o del Super Admin) = sin acción. */
export function validarAccion(x: { uso: Uso; accion: Respuesta["accion"]; refs: Map<string, OpRef>; negocio?: string | null; secciones?: Map<string, { ruta: string; parte: string | null }> }): Propuesta | null {
  const a = x.accion;
  if (a.tipo === "ninguna") return null;
  if (a.tipo === "cancel_request") {
    if (x.uso !== "neighbor") return null;
    const op = /^op\d{1,2}$/.test(a.ref) ? x.refs.get(a.ref) : undefined;
    if (!op || !op.cancelableGratis || !CANCELABLES[op.kind]) return null;
    return { type: "cancel_request", operationId: op.id, opStatus: op.status, target: { numero: op.numero, negocio: op.negocio } };
  }
  if (a.tipo === "open_screen") {
    if (x.uso !== "neighbor") return null;
    if (a.pantalla === "operacion" || a.pantalla === "ayuda_operacion") {
      const op = /^op\d{1,2}$/.test(a.ref) ? x.refs.get(a.ref) : undefined;
      if (!op || !BASE[op.kind]) return null;
      const href = a.pantalla === "operacion" ? `${BASE[op.kind]}/${op.numero}` : `${BASE[op.kind]}/${op.numero}/ayuda`;
      return { type: "open_screen", operationId: op.id, opStatus: op.status, target: { pantalla: a.pantalla, href, numero: op.numero } };
    }
    const href = CUENTA[a.pantalla];
    return href ? { type: "open_screen", operationId: null, opStatus: null, target: { pantalla: a.pantalla, href } } : null;
  }
  if (a.tipo === "go_to_panel") {
    if (x.uso !== "owner" || !x.negocio || !x.secciones) return null;
    const s = /^[a-z]+(\/[a-z]+)?$/.test(a.ref) ? x.secciones.get(a.ref) : undefined;
    if (!s) return null;
    return { type: "go_to_panel", operationId: null, opStatus: null, target: { negocio: x.negocio, seccion: a.ref } };
  }
  return null;
}

/* Guardar la propuesta (un uso; vence a los compa_accion_min). La pantalla recibe el id y la tarjeta «Así queda». */
export async function proponer(c: import("pg").PoolClient, x: { conversacion: number; mensaje: number; userId: string; p: Propuesta }): Promise<string> {
  const min = await valor("compa_accion_min");
  return (await c.query<{ id: string }>(
    `insert into compa_actions (conversation_id, message_id, user_id, type, operation_id, op_status, target, expires_at)
     values ($1, $2, $3, $4, $5::bigint, $6, $7, now() + make_interval(mins => $8::int)) returning id::text`,
    [x.conversacion, x.mensaje, x.userId, x.p.type, x.p.operationId, x.p.opStatus, JSON.stringify(x.p.target), min])).rows[0]!.id;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export type ResAccion = { ok: true; tipo: string; href?: string; linea?: Bi } | { ok: false; estado?: "expired" | "failed" | "ya" | "no"; msg: Bi };
const NO_EXISTE: ResAccion = { ok: false, estado: "no", msg: { es: "Esa acción no existe.", en: "That action does not exist." } };

/* Confirmar: OTRA petición, de la misma persona (la sesión y el mismo origen los revisa quien llama), con el id de un uso.
   1) La toma: proposed → confirming en una sola sentencia (si llegan dos a la vez, una gana; la otra recibe «Ya lo confirmaste»).
   2) Vuelve a leer la operación de la base (de ESTA persona) y llama a la función de siempre de su módulo, sin tener ninguna conexión
      tomada mientras tanto. 3) Anota confirmed, expired («Ya cambió») o failed (el motivo del módulo). */
export async function confirmar(q: { userId: string }, id: string, via: "app" | "link"): Promise<ResAccion> {
  if (!UUID.test(String(id ?? ""))) return NO_EXISTE;
  let a: { type: string; operation_id: string | null; op_status: string | null; target: Record<string, string> } | undefined;
  try {
    a = (await db().query<NonNullable<typeof a>>(
      `update compa_actions set status = 'confirming', confirmed_via = $3 where id = $1 and user_id = $2 and status = 'proposed' and expires_at >= now()
       returning type, operation_id::text, op_status, target`, [id, q.userId, via])).rows[0];
  } catch (e) {
    if (!/compa_accion_(vencida|decidida)/.test(String((e as Error)?.message))) throw e;
  }
  if (!a) {
    const v = (await db().query<{ status: string; vencida: boolean }>(`select status, expires_at < now() as vencida from compa_actions where id = $1 and user_id = $2`, [id, q.userId])).rows[0];
    if (!v) return NO_EXISTE;
    if (v.status === "confirmed" || v.status === "confirming") return { ok: false, estado: "ya", msg: { es: "Ya lo confirmaste.", en: "You already confirmed it." } };
    if (v.status === "proposed" && v.vencida) {
      await db().query(`update compa_actions set status = 'expired', fail_reason = 'vencida' where id = $1 and status = 'proposed'`, [id]);
      return { ok: false, estado: "expired", msg: { es: "Pasó mucho tiempo. Pídeselo otra vez al Compa.", en: "Too much time passed. Ask El Compa again." } };
    }
    return { ok: false, estado: "no", msg: { es: "Esa acción ya no está.", en: "That action is no longer available." } };
  }
  const decidir = (st: "confirmed" | "expired" | "failed", motivo?: string) =>
    db().query(`update compa_actions set status = $2, fail_reason = $3 where id = $1 and status = 'confirming'`, [id, st, motivo ?? null]);
  try {
    if (a.type === "cancel_request") {
      // El estado otra vez, de la base, y de ESTA persona (no el que dijo el modelo ni el de hace unos minutos).
      const o = (await db().query<{ number: string; kind: string; status: string; detail: string | null; pago: string | null; negocio: string }>(
        `select o.number, o.kind, o.status, o.status_detail as detail, o.pay_status as pago, b.name as negocio from operations o join businesses b on b.id = o.business_id
          where o.id = $1::bigint and o.user_id = $2`, [a.operation_id, q.userId])).rows[0];
      if (!o) { await decidir("failed", "operación ajena o inexistente"); return NO_EXISTE; }
      const fn = CANCELABLES[o.kind];
      if (!fn || o.status !== a.op_status || o.status !== "pending" || o.detail || !(o.pago == null || o.pago === "held")) {
        await decidir("expired", `cambió: ${o.status}`);
        return { ok: false, estado: "expired", msg: { es: `Ya cambió: ${o.negocio} ya respondió. Mira cómo quedó.`, en: `It already changed: ${o.negocio} already answered. See where it stands.` } };
      }
      const r = await fn(q.userId, o.number);
      if (!r.ok) { await decidir("failed", r.msg.es.slice(0, 200)); return { ok: false, estado: "failed", msg: r.msg }; }
      await decidir("confirmed");
      const N = o.negocio.toUpperCase();
      return { ok: true, tipo: a.type, linea: { es: `CANCELASTE LA SOLICITUD EN ${N} · NO SE COBRÓ NADA`, en: `YOU CANCELLED THE REQUEST AT ${N} · NOTHING WAS CHARGED` } };
    }
    if (a.type === "open_screen") {
      if (a.operation_id) {
        const mia = await db().query(`select 1 from operations where id = $1::bigint and user_id = $2`, [a.operation_id, q.userId]);
        if (!mia.rowCount) { await decidir("failed", "operación ajena"); return NO_EXISTE; }
      }
      await decidir("confirmed");
      return { ok: true, tipo: a.type, href: a.target.href };
    }
    if (a.type === "go_to_panel") {
      // 7e · La sección otra vez de la guía (encendida) y el acceso otra vez con accesoPanel (la sesión de AHORA y su parte): si le quitaron
      // esa parte entre la respuesta y el toque, no entra.
      const s = (await db().query<{ ruta: string; parte: string | null }>(`select ruta, parte from compa_panel_guide where code = $1 and enabled`, [String(a.target.seccion ?? "")])).rows[0];
      if (!s) { await decidir("failed", "sección desconocida"); return NO_EXISTE; }
      const { accesoPanel } = await import("../panel");
      const acc = await accesoPanel(a.target.negocio ?? "", s.parte ?? undefined);
      if (!acc || acc.yo.id !== q.userId) {
        await decidir("failed", "sin acceso a esa parte del panel");
        return { ok: false, estado: "failed", msg: { es: "Eso lo ve el dueño del negocio.", en: "The business owner sees that." } };
      }
      await decidir("confirmed");
      return { ok: true, tipo: a.type, href: `/panel/${acc.negocio.id}${s.ruta ? `/${s.ruta}` : ""}` };
    }
    await decidir("failed", "tipo desconocido");
    return NO_EXISTE;
  } catch (e) {
    await decidir("failed", String((e as Error)?.message ?? "falla").slice(0, 200)).catch(() => undefined);
    throw e;
  }
}

export async function descartar(q: { userId: string }, id: string): Promise<ResAccion> {
  if (!UUID.test(String(id ?? ""))) return NO_EXISTE;
  const r = await db().query(`update compa_actions set status = 'dismissed' where id = $1 and user_id = $2 and status = 'proposed' returning type`, [id, q.userId]);
  return r.rowCount ? { ok: true, tipo: String(r.rows[0].type) } : NO_EXISTE;
}

/* Barrido: lo propuesto que nadie confirmó a tiempo vence.
   Una que se quedó «confirmando» (el proceso se cayó a la mitad) pasa a fallida a los 5 minutos: la persona la vuelve a pedir. */
export async function vencerAcciones(): Promise<number> {
  const a = (await db().query(`update compa_actions set status = 'expired', fail_reason = 'vencida' where status = 'proposed' and expires_at < now()`)).rowCount ?? 0;
  const b = (await db().query(`update compa_actions set status = 'failed', fail_reason = 'se quedó a la mitad' where status = 'confirming' and expires_at < now() - interval '5 minutes'`)).rowCount ?? 0;
  return a + b;
}
