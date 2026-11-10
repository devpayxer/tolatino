import "server-only";
import { db } from "../db";
import { disponible } from "./interruptores";
import { alTope } from "./tope";

/* 7d · La hoja de ayuda (2as) y los pasos guiados (2at) de El Compa para vecinos — SOLO LECTURA y barata (fase7-compa.md §4 7d, §7 «abrir la hoja
   ≤ 150 ms sin esperar al modelo»). Lo que la pantalla necesita para empezar: si El Compa está para esta persona (interruptores de nivel, canal,
   ciudad y negocio, y el tope), su operación TAL CUAL la dice el servidor y las razones fijas de su tipo y su estado.
   - El servidor decide las razones: una cancelación se PREPARA solo para una solicitud pendiente y gratis (las mismas de acciones.ts CANCELABLES);
     lo demás lleva a la pantalla de siempre (la operación con su política, el formulario de «Ayuda con …» o Mi cuenta) o a una persona.
   - Nunca: la operación de otra persona (todo se busca con el id de la SESIÓN), Salud, Profesionales, inscripciones de Niños ni lo que tiene
     datos privados (op_private): para esas, la Ayuda va directo al formulario de siempre, sin El Compa.
   - Si algo falla aquí, quien llama sigue con el camino de siempre (`.catch(() => null)`): El Compa nunca rompe la Ayuda (compaSinRutaCritica). */
type Bi = { es: string; en: string };
export type Grupo = "pedido" | "cita" | "evento" | "boleto";
export type RazonK = "cancel" | "alt" | "late" | "wrong" | "money" | "pay" | "other";
export type OpHoja = {
  numero: string; kind: string; grupo: Grupo; negocio: string; negocioId: string; ciudad: string; titulo: Bi; estado: { l: Bi; tone: string }; cuando: Bi;
  vivo: boolean; cancelableGratis: boolean; retenido: boolean; opHref: string; ayudaHref: string | null; cancelarHref: string; f: boolean;
  razones?: Razon[];   // solo en la lista de los pasos guiados (las decide el servidor; se vuelven a decidir al tocar)
};
export type Razon = { k: RazonK; l: Bi; s: Bi; icon: string };
export type Hoja = { op: OpHoja; razones: Razon[] };

const GRUPO: Record<string, Grupo> = { order: "pedido", market_order: "pedido", hold: "pedido", tickets: "boleto", private_event: "evento",
  appointment: "cita", table: "cita", visit: "cita", party: "cita", trip: "cita", night: "cita", enrollment: "cita", rental: "cita" };
const BASE: Record<string, string> = { appointment: "/cita", table: "/reserva", order: "/pedido", market_order: "/mercado", hold: "/apartado", party: "/fiesta", trip: "/viaje",
  night: "/noche", visit: "/vis", private_event: "/privado", rental: "/renta", enrollment: "/insc", tickets: "/eventos/orden" };
/* El formulario de «Ayuda con …» de cada tipo (el de siempre; lib/ayuda-cita.ts hrefAyuda + el pedido). Sin formulario: mesa y renta. */
const AYUDA: Record<string, string> = { order: "/pedido", market_order: "/mercado", hold: "/apartado", party: "/fiesta", trip: "/viaje", night: "/noche", enrollment: "/insc",
  visit: "/vis", tickets: "/eventos/orden", private_event: "/privado", appointment: "/cita" };
const NOMBRE: Record<string, [string, string, boolean]> = {   // es, en, femenino
  order: ["Pedido", "Order", false], market_order: ["Pedido del mercado", "Market order", false], hold: ["Apartado", "Layaway", false], appointment: ["Cita", "Appointment", true],
  table: ["Reservación", "Reservation", true], visit: ["Visita", "Visit", true], party: ["Fiesta", "Party", true], trip: ["Viaje", "Trip", false], night: ["Noche", "Night out", true],
  enrollment: ["Inscripción", "Enrollment", true], rental: ["Renta", "Rental", true], tickets: ["Orden de boletos", "Ticket order", true], private_event: ["Evento privado", "Private event", false],
};
/* Solicitudes que El Compa puede PREPARAR para cancelar (las de acciones.ts CANCELABLES): pendientes, sin cobro. */
const CANCELABLES = new Set(["appointment", "table"]);
const VIVO = new Set(["pending", "change_proposed", "confirmed"]);

function estado(kind: string, st: string, f: boolean): { l: Bi; tone: string } {
  const o = (es: string, en: string, tone: string) => ({ l: { es, en }, tone });
  if (kind === "order" || kind === "market_order") {
    if (st === "confirmed") return o("EN CURSO", "IN PROGRESS", "action");
    if (st === "done") return o("TERMINADO", "DONE", "neutral");
  }
  const a = f ? "A" : "O";
  return ({ pending: o("PENDIENTE", "PENDING", "neutral"), change_proposed: o("TE PROPONEN UN CAMBIO", "THEY PROPOSE A CHANGE", "action"), confirmed: o(`CONFIRMAD${a}`, "CONFIRMED", "signal"),
    declined: o("NO PUDO", "COULD NOT", "danger"), expired: o("SIN RESPUESTA", "NO ANSWER", "neutral"), cancelled: o(`CANCELAD${a}`, "CANCELLED", "neutral"), done: o(`TERMINAD${a}`, "DONE", "neutral") } as Record<string, { l: Bi; tone: string }>)[st]
    ?? o(st.toUpperCase(), st.toUpperCase(), "neutral");
}
const fecha = (iso: string, tz: string, es: boolean) => {
  const d = new Date(iso);
  const dia = d.toLocaleDateString(es ? "es-US" : "en-US", { timeZone: tz, weekday: "short", day: "numeric", month: "short" }).replace(/\./g, "");
  const h = d.toLocaleTimeString(es ? "es-US" : "en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" }).replace(/\s?a\.\s?m\./i, " AM").replace(/\s?p\.\s?m\./i, " PM");
  return `${dia} · ${h}`;
};

type Fila = { id: string; number: string; kind: string; status: string; detail: string | null; pago: string | null; negocio: string; nid: string; ciudad: string; at: string; tz: string; ayuda: boolean; vigentes: number | null };
/* Las operaciones que El Compa puede tocar con esta persona: suyas y no sensibles. `extra` = más condiciones sobre «o». */
const SQL_OPS = (extra: string) => `
  select o.id::text, o.number, o.kind, o.status, o.status_detail as detail, o.pay_status as pago, b.name as negocio, b.id as nid, o.city_id as ciudad,
         to_char(coalesce(o.scheduled_at, o.sent_at) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at, coalesce(ci.timezone, 'America/New_York') as tz,
         exists (select 1 from help_requests h where h.operation_id = o.id) as ayuda,
         case when o.kind = 'tickets' then (select count(*)::int from tickets t where t.operation_id = o.id and t.status = 'valid') end as vigentes
    from operations o join businesses b on b.id = o.business_id left join cities ci on ci.id = o.city_id
   where o.user_id = $1 and o.kind <> 'plan' and o.kind <> 'quote'
     and not (o.kind = 'appointment' and (coalesce(o.details->>'rubro', '') in ('salud', 'pro') or b.category_id in ('NEG-SALUD', 'NEG-PRO')))
     and not (o.kind = 'enrollment' and b.category_id = 'NEG-NINOS')
     and not exists (select 1 from op_private p where p.operation_id = o.id)
     ${extra}`;

function vista(x: Fila): OpHoja {
  const n = NOMBRE[x.kind] ?? ["Operación", "Operation", true], num = /^\d/.test(x.number) ? `#${x.number}` : x.number;
  // Boletos: la orden queda «confirmed» para siempre; lo que vale es si le quedan boletos vigentes (un evento cancelado los anula).
  const sinBoletos = x.kind === "tickets" && !x.vigentes;
  const vivo = VIVO.has(x.status) && !sinBoletos;
  return {
    numero: x.number, kind: x.kind, grupo: GRUPO[x.kind] ?? "cita", negocio: x.negocio, negocioId: x.nid, ciudad: x.ciudad, f: n[2],
    titulo: { es: `${n[0]} ${num}`, en: `${n[1]} ${num}` }, estado: sinBoletos ? { l: { es: "SIN BOLETOS VIGENTES", en: "NO VALID TICKETS" }, tone: "neutral" } : estado(x.kind, x.status, n[2]), cuando: { es: fecha(x.at, x.tz, true), en: fecha(x.at, x.tz, false) },
    vivo, retenido: x.pago === "held", cancelableGratis: CANCELABLES.has(x.kind) && x.status === "pending" && !x.detail && (x.pago == null || x.pago === "held"),
    opHref: `${BASE[x.kind] ?? "/cuenta"}/${x.number}`, ayudaHref: AYUDA[x.kind] ? `${AYUDA[x.kind]}/${x.number}/ayuda` : null,
    cancelarHref: x.kind === "order" ? `/pedido/${x.number}/cancelar` : `${BASE[x.kind] ?? "/cuenta"}/${x.number}`,
  };
}

/* Las razones fijas de la hoja por tipo y estado (diseño `To'Latino Compa.dc.html` block 'reasons'; §0 del plan). */
export function razonesDe(op: OpHoja): Razon[] {
  const r = (k: RazonK, l: Bi, s: Bi, icon: string): Razon => ({ k, l, s, icon });
  const otra = r("other", { es: "Otra cosa", en: "Something else" }, { es: "Escríbele al Compa", en: "Write to El Compa" }, "bubble");
  const dinero = r("money", { es: "Me cobraron de más", en: "I was overcharged" }, { es: "Lo revisa una persona", en: "A person reviews it" }, "card");
  const mal = op.ayudaHref ? [op.grupo === "pedido"
    ? r("wrong", { es: "Algo no está bien", en: "Something is wrong" }, { es: "Falta algo, llegó mal o tarde", en: "Missing, wrong or late" }, "warning")
    : r("wrong", { es: "Algo no salió bien", en: "Something went wrong" }, { es: `Le pides ayuda a ${op.negocio}`, en: `You ask ${op.negocio} for help` }, "warning")] : [];
  const la = op.f;
  const cancelar = r("cancel", { es: la ? "Cancelarla" : "Cancelarlo", en: "Cancel it" },
    op.cancelableGratis ? { es: "Todavía es una solicitud: no pagas nada", en: "Still a request: you pay nothing" }
      : op.grupo === "pedido" ? { es: "Ves si todavía es gratis", en: "See if it's still free" } : { es: `Según la política de ${op.negocio}`, en: `Per the policy of ${op.negocio}` }, "close");
  if (op.grupo === "boleto")
    return [...(op.vivo ? [cancelar] : []), r("pay", { es: "Un problema con el pago", en: "A payment problem" }, { es: "Lo revisa To'Latino", en: "To'Latino reviews it" }, "card"), otra];
  if (!op.vivo) return [...mal, dinero, otra];
  if (op.grupo === "pedido" || op.grupo === "evento") return [cancelar, ...(op.grupo === "pedido" ? [dinero] : []), otra];
  const mesaOCita = op.kind === "appointment" || op.kind === "table";
  return [cancelar,
    ...(mesaOCita ? [r("alt", { es: "Pedir otra hora", en: "Ask for another time" }, { es: `Lo pides desde tu ${op.kind === "table" ? "reservación" : "cita"}`, en: `You ask from your ${op.kind === "table" ? "reservation" : "booking"}` }, "clock")] : []),
    ...(mesaOCita && op.estado.tone === "signal" ? [r("late", { es: "Voy tarde", en: "Running late" }, { es: "Le avisas al negocio", en: "You let the business know" }, "warning")] : []),
    otra];
}

/* ¿El Compa está encendido para esta persona (y este negocio)? Interruptores de nivel, canal, ciudad y negocio; y si llegó al tope. */
export async function estadoVecino(userId: string | null, negocio?: string | null, ciudadOp?: string | null): Promise<{ encendido: boolean; alTope: boolean }> {
  const ciudad = userId ? (await db().query<{ c: string }>(`select coalesce(home_city_id, 'hzl') as c from users where id = $1`, [userId])).rows[0]?.c ?? "hzl" : null;
  // La pausa de una ciudad vale para quien vive ahí y para las operaciones de ahí (una vecina de Allentown con una cita en Hazleton).
  const [d, d2, tope] = await Promise.all([disponible({ uso: "neighbor", canal: "app", ciudad, negocio: negocio ?? null }),
    ciudadOp && ciudadOp !== ciudad ? disponible({ uso: "neighbor", canal: "app", ciudad: ciudadOp, negocio: negocio ?? null }) : Promise.resolve({ ok: true as const }), alTope()]);
  return { encendido: d.ok && d2.ok, alTope: tope };
}
/* La hoja de una operación sale solo con El Compa encendido Y sin llegar al tope (al tope, la Ayuda va directo al formulario de siempre). */
export async function vecinoDisponible(userId: string, negocio?: string | null, ciudadOp?: string | null): Promise<boolean> {
  const e = await estadoVecino(userId, negocio, ciudadOp);
  return e.encendido && !e.alTope;
}

/* Una operación de ESTA persona (por número) que El Compa puede tocar, o null (ajena, sensible o inexistente). */
export async function opVecino(userId: string, numero: string): Promise<(OpHoja & { id: string; ayuda: boolean }) | null> {
  if (!/^([A-Z]{1,2}-)?\d{1,12}$/.test(String(numero ?? ""))) return null;
  const x = (await db().query<Fila>(SQL_OPS("and o.number = $2"), [userId, numero])).rows[0];
  return x ? { ...vista(x), id: x.id, ayuda: x.ayuda } : null;
}

/* La hoja de una operación, o null = el camino de siempre (apagado, al tope, sensible, ajena, o ya hay una solicitud de ayuda: se ve su estado). */
export async function hojaDe(userId: string, numero: string, kinds: string[]): Promise<Hoja | null> {
  const op = await opVecino(userId, numero);
  if (!op || op.ayuda || !kinds.includes(op.kind)) return null;
  if (!(await vecinoDisponible(userId, op.negocioId, op.ciudad))) return null;
  const { id: _id, ayuda: _a, ...v } = op; void _id; void _a;
  return { op: v, razones: razonesDe(v) };
}

/* Para los pasos guiados (2at): sus operaciones recientes (90 días) que El Compa puede tocar, sin las canceladas. */
export async function opsVecino(userId: string): Promise<OpHoja[]> {
  return (await db().query<Fila>(SQL_OPS(`and o.status <> 'cancelled' and coalesce(o.scheduled_at, o.sent_at) > now() - interval '90 days' order by o.sent_at desc limit 30`), [userId])).rows.map((x) => { const v = vista(x); return { ...v, razones: razonesDe(v) }; });
}
