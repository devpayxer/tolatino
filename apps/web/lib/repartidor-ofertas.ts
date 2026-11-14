import "server-only";
import type { PoolClient } from "pg";
import { valor } from "./config";
import { db, tx } from "./db";
import { empezar as empezarRuta, type RutaToken } from "./ruta";

/* 9n · La oferta con cuenta regresiva a los repartidores del negocio (fase9 §6 #21; apps-delivery-checkin.md §1.3 DLV-OFERTA) y lo que el
   repartidor le escribe al cliente (§6 #20: sin llamada directa ni enmascarada, nunca el teléfono del cliente).
   - El negocio ofrece un delivery aceptado y sin repartidor a UNO de sus repartidores o a todos los que están en línea. Vence a los
     `oferta_seg` (Configuración › Repartidor); el servidor dice cuántos segundos quedan (el reloj del teléfono no manda).
   - «Aceptar» es el paso que inicia la ruta: en la misma transacción el pedido pasa a ese repartidor, la oferta se cierra y la ruta en vivo
     empieza (lib/ruta.ts). El primero que acepta se la lleva (la fila de la oferta se bloquea); los demás ven «Ya la tomó otro».
   - Rechazar queda anotado (solo inserción). Si todos los que la vieron la rechazan, o vence, el negocio recibe el aviso.
   - Un repartidor suspendido o baneado no ve ni acepta ofertas (repartidor_sancionado). */
type Bi = { es: string; en: string };
export type ResO = { ok: true; ruta?: RutaToken | null } | { ok: false; msg: Bi };
const no = (es: string, en: string): ResO => ({ ok: false, msg: { es, en } });
const ID = /^\d{1,18}$/;

/* ── Panel: ofrecer ── */
export async function ofrecer(negocio: string, numero: string, actorId: string, driverId: string | null): Promise<ResO & { avisos?: { uid: string; vars: Record<string, string> }[] }> {
  if (!/^\d{1,12}$/.test(numero) || (driverId !== null && !ID.test(driverId))) return no("Ese pedido no existe.", "That order does not exist.");
  const seg = await valor("oferta_seg");
  return tx(async (c) => {
    const o = (await c.query<{ id: string; status: string; mode: string; stage: string | null; driver: string | null; who: string; city: string; calle: string | null; negocio: string }>(
      `select o.id::text, o.status, coalesce(o.mode, 'pickup') as mode, o.stage, o.driver_id::text as driver, coalesce(d.who, 'team') as who, o.city_id as city,
              o.details->'to'->>'street' as calle, b.name as negocio
         from operations o join businesses b on b.id = o.business_id left join delivery_settings d on d.business_id = o.business_id
        where o.business_id = $1 and o.number = $2 and o.kind = 'order' for update of o`, [negocio, numero])).rows[0];
    if (!o || o.mode !== "delivery" || o.status !== "confirmed" || o.stage === "delivered") return no("Solo se ofrece un delivery aceptado que no se ha entregado.", "Only an accepted, undelivered delivery can be offered.");
    if (o.who === "external") return no("Este negocio entrega con una app externa.", "This business delivers with an external app.");
    if (o.driver) return no("Ese pedido ya tiene repartidor.", "That order already has a driver.");
    if ((await c.query(`select 1 from delivery_offers where operation_id = $1::bigint and status = 'open' and expires_at > now()`, [o.id])).rowCount) return no("Ya hay una oferta abierta para ese pedido.", "There is already an open offer for that order.");
    // Una oferta vencida que el barrido todavía no cerró se cierra aquí (una abierta por pedido).
    await c.query(`update delivery_offers set status = 'expired' where operation_id = $1::bigint and status = 'open'`, [o.id]);
    const D = (await c.query<{ id: string; uid: string }>(
      `select id::text, user_id::text as uid from delivery_drivers where business_id = $1 and status = 'active' and user_id is not null and repartidor_sancionado(user_id) is null
          and ($2::bigint is null and online or id = $2::bigint)`, [negocio, driverId])).rows;
    if (!D.length) return driverId ? no("Ese repartidor no está activo.", "That driver is not active.") : no("Ningún repartidor está en línea ahora. Asígnalo a alguien o márcalo tú.", "No driver is online now. Assign someone or mark it yourself.");
    await c.query(`insert into delivery_offers (operation_id, business_id, city_id, driver_id, expires_at, created_by) values ($1::bigint, $2, $3, $4::bigint, now() + make_interval(secs => $5), $6)`,
      [o.id, negocio, o.city, driverId, seg, actorId]);
    await c.query(`insert into operation_events (operation_id, kind, actor, actor_id, note) values ($1::bigint, 'driver_offer', 'member', $2, $3::jsonb)`,
      [o.id, actorId, JSON.stringify(driverId ? { es: "Ofrecido a un repartidor", en: "Offered to a driver" } : { es: `Ofrecido a ${D.length} ${D.length === 1 ? "repartidor en línea" : "repartidores en línea"}`, en: `Offered to ${D.length} online ${D.length === 1 ? "driver" : "drivers"}` })]);
    return { ok: true, avisos: D.map((d) => ({ uid: d.uid, vars: { negocio: o.negocio, num: numero, calle: o.calle ?? "" } })) } as const;
  });
}
/* Panel: la oferta abierta de un pedido (para mostrar «vence en N s» y «Cancelar oferta»). */
export async function ofertaDe(negocio: string, numero: string): Promise<{ id: string; seg: number; a: string | null; rechazos: number } | null> {
  return (await db().query<{ id: string; seg: number; a: string | null; rechazos: number }>(
    `select f.id::text, greatest(0, ceil(extract(epoch from f.expires_at - now())))::int as seg, d.display_name as a,
            (select count(*)::int from delivery_offer_replies r where r.offer_id = f.id) as rechazos
       from delivery_offers f join operations o on o.id = f.operation_id left join delivery_drivers d on d.id = f.driver_id
      where o.business_id = $1 and o.number = $2 and f.status = 'open' and f.expires_at > now()`, [negocio, numero])).rows[0] ?? null;
}
export async function cancelarOferta(negocio: string, numero: string): Promise<ResO> {
  const r = await db().query(`update delivery_offers f set status = 'cancelled' from operations o where o.id = f.operation_id and o.business_id = $1 and o.number = $2 and f.status = 'open'`, [negocio, String(numero ?? "")]);
  return r.rowCount ? { ok: true } : no("Esa oferta ya no está abierta.", "That offer is no longer open.");
}

/* ── El repartidor: sus ofertas abiertas ── */
export type OfertaRep = { id: string; numero: string; negocio: { nombre: string; direccion: string | null }; calle: string | null; mi: number | null; seg: number;
  total: number; propina: number; efectivo: number | null; items: number; paraTi: boolean };
export async function misOfertas(userId: string): Promise<OfertaRep[]> {
  if (!(await db().query(`select 1 from delivery_drivers where user_id = $1 and status = 'active' limit 1`, [userId])).rowCount) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = await db().query<{ id: string; numero: string; bname: string; baddr: string | null; det: Record<string, any>; seg: number; total: number; tip: number; pay: string; items: number; para: boolean }>(
    `select f.id::text, o.number as numero, b.name as bname, b.address as baddr, o.details as det, ceil(extract(epoch from f.expires_at - now()))::int as seg,
            o.total_cents as total, o.tip_cents as tip, o.pay_mode as pay, (select coalesce(sum(l.qty), 0)::int from operation_lines l where l.operation_id = o.id) as items,
            f.driver_id is not null as para
       from delivery_offers f join delivery_drivers d on d.business_id = f.business_id and d.user_id = $1 and d.status = 'active'
       join operations o on o.id = f.operation_id join businesses b on b.id = f.business_id
      where f.status = 'open' and f.expires_at > now() and o.driver_id is null and repartidor_sancionado($1::uuid) is null
        and (f.driver_id = d.id or (f.driver_id is null and d.online))
        and not exists (select 1 from delivery_offer_replies x where x.offer_id = f.id and x.driver_id = d.id)
      order by f.expires_at limit 10`, [userId]);
  return r.rows.map((x) => ({ id: x.id, numero: x.numero, negocio: { nombre: x.bname, direccion: x.baddr }, calle: x.det?.to?.street ?? null, mi: x.det?.to?.mi ?? null, seg: Math.max(0, x.seg),
    total: x.total, propina: x.tip, efectivo: x.pay === "entrega" ? x.total : null, items: x.items, paraTi: x.para }));
}

async function cerrarSiNadie(c: PoolClient, ofertaId: string): Promise<{ negocio: string; numero: string } | null> {
  // Todos los que la podían ver la rechazaron: vence ya y el negocio lo sabe.
  const f = (await c.query<{ negocio: string; numero: string; quedan: number }>(
    `select f.business_id as negocio, o.number as numero,
            (select count(*)::int from delivery_drivers d where d.business_id = f.business_id and d.status = 'active' and (f.driver_id = d.id or (f.driver_id is null and d.online))
                and not exists (select 1 from delivery_offer_replies x where x.offer_id = f.id and x.driver_id = d.id)) as quedan
       from delivery_offers f join operations o on o.id = f.operation_id where f.id = $1::bigint and f.status = 'open'`, [ofertaId])).rows[0];
  if (!f || f.quedan > 0) return null;
  await c.query(`update delivery_offers set status = 'expired' where id = $1::bigint and status = 'open'`, [ofertaId]);
  return { negocio: f.negocio, numero: f.numero };
}

/* «Aceptar»: el paso que inicia la entrega (devuelve el token de la ruta para el teléfono). */
export async function aceptarOferta(userId: string, ofertaId: string): Promise<ResO & { aviso?: { negocio: string; vars: Record<string, string> } }> {
  if (!ID.test(ofertaId)) return no("Esa oferta no existe.", "That offer does not exist.");
  return tx(async (c) => {
    const f = (await c.query<{ id: string; op: string; negocio: string; driver: string | null; vivo: boolean; status: string }>(
      `select id::text, operation_id::text as op, business_id as negocio, driver_id::text as driver, expires_at > now() as vivo, status from delivery_offers where id = $1::bigint for update`, [ofertaId])).rows[0];
    if (!f) return no("Esa oferta no existe.", "That offer does not exist.");
    if (f.status === "accepted") return no("Ya la tomó otro repartidor.", "Another driver already took it.");
    if (f.status !== "open" || !f.vivo) return no("Esa oferta ya venció.", "That offer already expired.");
    const d = (await c.query<{ id: string; nombre: string; online: boolean; sancion: string | null }>(
      `select id::text, display_name as nombre, online, repartidor_sancionado(user_id) as sancion from delivery_drivers where business_id = $1 and user_id = $2 and status = 'active'`, [f.negocio, userId])).rows[0];
    if (!d) return no("Ya no estás en ese equipo.", "You are no longer on that team.");
    if (d.sancion) return no("Tu cuenta de repartidor está suspendida.", "Your driver account is suspended.");
    if (f.driver ? f.driver !== d.id : !d.online) return no("Esa oferta no es para ti.", "That offer is not for you.");
    if ((await c.query(`select 1 from delivery_offer_replies where offer_id = $1::bigint and driver_id = $2::bigint`, [f.id, d.id])).rowCount) return no("Ya la rechazaste.", "You already declined it.");
    const o = (await c.query<{ numero: string; driver: string | null; status: string; stage: string | null }>(
      `select number as numero, driver_id::text as driver, status, stage from operations where id = $1::bigint for update`, [f.op])).rows[0];
    if (!o || o.status !== "confirmed" || o.stage === "delivered") { await c.query(`update delivery_offers set status = 'cancelled' where id = $1::bigint`, [f.id]); return no("Ese pedido ya no está activo.", "That order is no longer active."); }
    if (o.driver) { await c.query(`update delivery_offers set status = 'cancelled' where id = $1::bigint`, [f.id]); return no("Ya la tomó otro repartidor.", "Another driver already took it."); }
    await c.query(`update delivery_offers set status = 'accepted', accepted_driver = $2::bigint where id = $1::bigint`, [f.id, d.id]);
    await c.query(`update operations set driver_id = $2::bigint, updated_at = now() where id = $1::bigint`, [f.op, d.id]);
    await c.query(`insert into operation_events (operation_id, kind, actor, actor_id, note) values ($1::bigint, 'driver_assigned', 'member', $2, $3::jsonb), ($1::bigint, 'driver_started', 'member', $2, $4::jsonb)`,
      [f.op, userId, JSON.stringify({ es: `Aceptado por ${d.nombre}`, en: `Accepted by ${d.nombre}` }), JSON.stringify({ es: "El repartidor va por el pedido", en: "The driver is heading to pick it up" })]);
    const ruta = await empezarRuta(c, f.op, userId, "empezar");
    return { ok: true, ruta, aviso: { negocio: f.negocio, vars: { repartidor: d.nombre, num: o.numero } } } as const;
  });
}
export async function rechazarOferta(userId: string, ofertaId: string, motivo: string): Promise<ResO & { vencio?: { negocio: string; numero: string } }> {
  if (!ID.test(ofertaId)) return no("Esa oferta no existe.", "That offer does not exist.");
  return tx(async (c) => {
    const f = (await c.query<{ id: string; negocio: string; driver: string | null }>(`select id::text, business_id as negocio, driver_id::text as driver from delivery_offers where id = $1::bigint and status = 'open' for update`, [ofertaId])).rows[0];
    if (!f) return { ok: true } as const; // ya venció o la tomó otro: nada que rechazar
    const d = (await c.query<{ id: string }>(`select id::text from delivery_drivers where business_id = $1 and user_id = $2 and status = 'active'`, [f.negocio, userId])).rows[0];
    if (!d || (f.driver && f.driver !== d.id)) return no("Esa oferta no es para ti.", "That offer is not for you.");
    await c.query(`insert into delivery_offer_replies (offer_id, driver_id, reply, reason) values ($1::bigint, $2::bigint, 'rechazo', $3) on conflict do nothing`, [f.id, d.id, String(motivo ?? "").trim().slice(0, 120) || null]);
    const v = await cerrarSiNadie(c, f.id);
    return { ok: true, ...(v ? { vencio: v } : {}) } as const;
  });
}

/* Barrido: las ofertas que vencieron se cierran y el negocio lo sabe (una vez por oferta: el cambio de estado es el candado). */
export async function vencerOfertas(): Promise<number> {
  const r = await db().query<{ negocio: string; numero: string }>(
    `update delivery_offers f set status = 'expired' from operations o where o.id = f.operation_id and f.status = 'open' and f.expires_at <= now()
      returning f.business_id as negocio, o.number as numero`);
  const { avisarNegocio } = await import("./avisos");
  for (const x of r.rows) await avisarNegocio(x.negocio, "biz_oferta_vencio", { num: x.numero }, { href: `/panel/${x.negocio}/hoy?det=ped:${x.numero}`, ref: ["order", x.numero] }).catch(() => undefined);
  return r.rowCount ?? 0;
}

/* ── Escribirle al cliente (dentro de la app; sin teléfonos) ── */
export const FRASES: Record<"afuera" | "puerta" | "direccion" | "cinco", Bi> = {
  afuera: { es: "Llegué, estoy afuera.", en: "I'm here, I'm outside." },
  puerta: { es: "Estoy en la puerta, ¿me abres?", en: "I'm at the door, can you open?" },
  direccion: { es: "No encuentro la dirección. ¿Me das una referencia en el chat del pedido?", en: "I can't find the address. Can you give me a landmark in the order?" },
  cinco: { es: "Voy en camino, llego en unos 5 minutos.", en: "On my way, about 5 minutes out." },
};
/* Un texto libre corto: sin teléfonos, correos ni enlaces (que nadie cambie el número por aquí). */
export const textoLimpio = (t: string) => {
  const s = String(t ?? "").replace(/\s+/g, " ").trim().slice(0, 140);
  if (s.length < 2) return null;
  if ((s.match(/\d/g) ?? []).length >= 7 || /@|https?:|www\.|\.com\b/i.test(s)) return null;
  return s;
};
export async function escribirCliente(userId: string, numero: string, kind: string, texto: string): Promise<ResO & { aviso?: { uid: string; vars: Record<string, string> } }> {
  if (!/^\d{1,12}$/.test(numero) || !(kind in FRASES || kind === "texto")) return no("Elige qué decirle.", "Choose what to say.");
  const body = kind === "texto" ? textoLimpio(texto) : null;
  if (kind === "texto" && !body) return no("Escribe un mensaje corto, sin números de teléfono ni enlaces.", "Write a short message, without phone numbers or links.");
  const max = await valor("rep_mensajes_max");
  return tx(async (c) => {
    const o = (await c.query<{ id: string; city: string; did: string; nombre: string; uid: string }>(
      `select o.id::text, o.city_id as city, d.id::text as did, d.display_name as nombre, o.user_id::text as uid from operations o join delivery_drivers d on d.id = o.driver_id
        where o.number = $2 and d.user_id = $1 and d.status = 'active' and o.kind = 'order' and o.status = 'confirmed' for update of o`, [userId, numero])).rows[0];
    if (!o) return no("Este pedido ya no es tuyo.", "This order is no longer yours.");
    const n = (await c.query<{ n: number }>(`select count(*)::int as n from delivery_messages where operation_id = $1::bigint`, [o.id])).rows[0]!.n;
    if (n >= max) return no("Ya le escribiste varias veces. Si no responde, avísale al negocio.", "You already wrote several times. If they do not answer, tell the business.");
    await c.query(`insert into delivery_messages (operation_id, city_id, driver_id, kind, body) values ($1::bigint, $2, $3::bigint, $4, $5)`, [o.id, o.city, o.did, kind, body]);
    const f = kind === "texto" ? { es: body!, en: body! } : FRASES[kind as keyof typeof FRASES];
    return { ok: true, aviso: { uid: o.uid, vars: { repartidor: o.nombre.split(" ")[0] ?? o.nombre, texto: f.es, texto_en: f.en } } } as const;
  });
}
/* El pedido del cliente: lo que le escribió su repartidor (el cliente solo ve los de SU pedido: lo filtra quien llama por user_id). */
export async function mensajesDelPedido(opId: string): Promise<{ t: Bi; at: string }[]> {
  const r = await db().query<{ kind: string; body: string | null; at: string }>(
    `select kind, body, to_char(at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at from delivery_messages where operation_id = $1::bigint order by at`, [opId]);
  return r.rows.map((x) => ({ t: x.kind === "texto" ? { es: x.body ?? "", en: x.body ?? "" } : FRASES[x.kind as keyof typeof FRASES] ?? { es: "", en: "" }, at: x.at }));
}
