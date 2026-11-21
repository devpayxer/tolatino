import "server-only";
import type { PoolClient } from "pg";
import { db, tx } from "./db";
import { HORAS_LLAVE_STRIPE as HORAS_LLAVE } from "./cobros";
import { pasarela } from "./pagos/pasarela";
import { SIN_RESPUESTA } from "./cobro-fuera";

/* 9t6 (21 nov, 0204) · Renovar una retención (el depósito de una renta: lib/rentas.ts › barrerRentas; lo retenido de un estimado o de «algo más»:
   lib/estimados.ts › renovarRetenciones). La tarjeta suelta una autorización a los 7 días (HORAS_VIVE); a las HORAS_RENOVAR se vuelve a retener fuera de
   sesión con la misma tarjeta. Antes, si Stripe no contestaba, se soltaba la vieja y se avisaba «el banco ya no deja», aunque Stripe pudo crear la nueva
   (quedaba suelta y el aviso era falso). Ahora, la misma clase que los cobros de 9t4/9t5:
   (1) La INTENCIÓN se anota antes de mandar (hold_renewals, una por retención vieja; la base lo impone) con su llave; al mandar, en UNA sentencia y solo la
       primera vez, «se mandó» (sent_at) y el dato buscable (gateway_ref), que va en la metadata de la retención nueva (tl_intencion).
   (2) «Sin respuesta» (SIN_RESPUESTA) NO es un «no»: no se suelta nada ni se avisa a nadie; la renovación sigue en camino y se reintenta con la MISMA llave
       solo mientras Stripe la recuerda (HORAS_LLAVE desde que se mandó) Y la vieja sigue viva (old_held_at + HORAS_VIVE). Como se renueva a las 164 h, la
       ventana real es de unas 4 h (la vieja muere antes de que Stripe olvide la llave).
   (3) Pasado eso, se le PREGUNTA a la pasarela (lib/consulta-pasarela.ts, la retención por su dato) y se cierra con esa verdad, una vez (where status =
       'pending'): retenida → la nueva queda anotada (y la vieja, soltada después); el banco dijo que no, o nunca llegó (con el dato y pasado el margen), o el
       equipo decidió que ninguna vale → no hay nueva: la vieja se suelta y se avisa con el motivo verdadero; en curso, sin respuesta, varias u otro monto →
       sigue en camino y alerta hold_stuck al equipo (una vez; las dos retenciones posibles quedan a la vista en Super Admin).
   (4) La vieja se suelta SOLO con la nueva confirmada y anotada, o con un «no» de verdad. Si la renta o la cita se cerraron mientras tanto (la vieja ya no
       está retenida en el libro), la nueva que haya salido se suelta (dropped): nunca dos retenciones vivas por lo mismo sin que quede a la vista. */
export const HORAS_RENOVAR = 164;
export const HORAS_VIVE = 168;
type Bi = { es: string; en: string };
export type Motivo = "banco" | "nunca_llego" | "devuelto" | "sin_tarjeta";
export type Renovar = {
  kind: "renta" | "estimado"; pago: string; pi: string; op: string; negocio: string; ciudad: string | null; uid: string; monto: number; fee: number;
  destino: string | null; pm: string | null; idem: string; meta: Record<string, string>;
  /* En la transacción que la cierra: la fila de la retención nueva (y su evento). Devuelve el id del pago nuevo. */
  nueva: (c: PoolClient, r: { pi: string; marca: string | null; l4: string | null }) => Promise<string>;
  /* En la transacción que la cierra sin nueva: el evento con el motivo verdadero. */
  fallo: (c: PoolClient, m: Motivo) => Promise<void>;
  /* Después: el aviso (al negocio, y en un estimado también a la persona), con el motivo verdadero. */
  avisar: (m: Motivo) => Promise<void>;
};
type Fila = { id: string; st: string; enviada: boolean; llave: boolean; viva: boolean; n: number; err: string | null; ciudad: string | null };
export type Quedo = "hecha" | "fallida" | "no_llego" | "devuelto" | "soltada" | "sigue" | "ya_no_estaba";
const money = (c: number) => `$${(c / 100).toFixed(2)}`;
const SEL = `id::text, status as st, sent_at is not null as enviada, coalesce(sent_at > now() - make_interval(hours => ${HORAS_LLAVE}), true) as llave,
             old_held_at + make_interval(hours => ${HORAS_VIVE}) > now() as viva, attempts as n, last_error as err, city_id as ciudad`;

/* Paso 1 (idempotente): la intención de renovar ESTA retención (o la que ya estaba). */
async function anotar(x: Renovar): Promise<Fila> {
  await db().query(
    `insert into hold_renewals (payment_id, kind, operation_id, business_id, city_id, amount_cents, fee_cents, idem_key, old_held_at)
     select p.id, $2, $3::bigint, $4, $5, $6, $7, $8, p.held_at from payments p where p.id = $1::bigint on conflict (payment_id) do nothing`,
    [x.pago, x.kind, x.op, x.negocio, x.ciudad, x.monto, Math.min(x.fee, x.monto), x.idem]);
  return (await db().query<Fila>(`select ${SEL} from hold_renewals where payment_id = $1::bigint`, [x.pago])).rows[0]!;
}

/* Renovar (lo llaman los barridos de rentas y estimados por cada retención vieja todavía retenida en el libro). */
export async function renovarRetencion(x: Renovar): Promise<Quedo> {
  const f = await anotar(x);
  if (f.st !== "pending") return "ya_no_estaba";
  // Nunca se mandó y la vieja ya no está retenida en el libro (la renta volvió, la cita se cerró): ya no hace falta; nada salió.
  if (!f.enviada && !(await db().query(`select 1 from payments where id = $1::bigint and status = 'held'`, [x.pago])).rowCount) {
    await db().query(`update hold_renewals set status = 'failed', last_error = 'ya_no_hacia_falta' where id = $1::bigint and status = 'pending' and sent_at is null`, [f.id]);
    return "ya_no_estaba";
  }
  // Sin tarjeta, sin cuenta de cobro o con la tarjeta apagada: nada se manda (y nunca se mandó): no hay nueva.
  if (!f.enviada && (!x.destino || !x.pm)) return cerrarSin(x, f.id, "sin_tarjeta", false);
  // (2) Se manda (o se reintenta con la MISMA llave) solo si nunca se mandó, o si Stripe todavía la recuerda Y la vieja sigue viva.
  if (!f.enviada || (f.llave && f.viva)) {
    const m = (await db().query<{ gref: string | null }>(`update hold_renewals set gateway_ref = case when sent_at is null then 'hold_renewals:' || id else gateway_ref end, sent_at = coalesce(sent_at, now()) where id = $1::bigint and status = 'pending' returning gateway_ref as gref`, [f.id])).rows[0];
    if (!m) return "ya_no_estaba";
    const cliente = await pasarela.cliente(x.uid).catch(() => null);
    const r = await pasarela.retener({ centavos: x.monto, comision: x.fee, destino: x.destino!, pm: x.pm!, cliente, idem: x.idem, meta: { ...x.meta, renews: x.pi, ...(m.gref ? { tl_intencion: m.gref } : {}) }, fuera: true })
      .catch(() => ({ ok: false as const, codigo: "error", mensaje: { es: "", en: "" } }));
    if (r.ok && r.estado === "retenido") return cerrarNueva(x, f.id, { pi: r.pi, marca: r.marca, l4: r.ultimos4 }, false);
    if (!r.ok && SIN_RESPUESTA.has(String(r.codigo))) {
      // Sin respuesta: NO es un «no». Nada se suelta ni se avisa; sigue en camino con la misma llave.
      await db().query(`update hold_renewals set attempts = least(10000, attempts + 1), last_error = left($2, 120) where id = $1::bigint and status = 'pending'`, [f.id, String(r.codigo).slice(0, 60)]);
      return "sigue";
    }
    // Un «no» de verdad (también el banco que pide verificar fuera de sesión: la persona no está; esa retención se cancela).
    if (r.ok) await pasarela.liberar(r.pi).catch(() => undefined);
    await db().query(`update hold_renewals set attempts = least(10000, attempts + 1), last_error = left($2, 120) where id = $1::bigint and status = 'pending'`, [f.id, r.ok ? "authentication_required" : String(r.codigo).slice(0, 60)]);
    return cerrarSin(x, f.id, "banco", false);
  }
  // (3) Ya no se manda con su llave: se le pregunta a la pasarela (una vez cada CADA_MIN; la decisión del equipo, si la hay, manda) y se cierra con eso.
  return (await resolverRenovacion(f.id, { origen: "barrido" }, x)).quedo;
}

/* (3) La consulta y el cierre con lo que dijo: el barrido, «Preguntar a Stripe ahora» del Super Admin o la decisión del equipo (sin x: el flujo se arma
   desde la base). La consulta va FUERA de cualquier transacción; el cierre, una vez. */
export async function resolverRenovacion(id: string, o: import("./consulta-pasarela").Origen, x0?: Renovar): Promise<{ resultado: import("./consulta-pasarela").Resultado | null; quedo: Quedo }> {
  const K = await import("./consulta-pasarela");
  const h = (await db().query<Fila & { monto: number; biz: string; pago: string; kind: "renta" | "estimado" }>(
    `select ${SEL}, amount_cents as monto, business_id as biz, payment_id::text as pago, kind from hold_renewals where id = $1::bigint`, [id])).rows[0];
  if (!h || h.st !== "pending" || !h.enviada || (h.llave && h.viva)) return { resultado: null, quedo: "ya_no_estaba" };
  const x = x0 ?? await flujoDe(h.kind, h.pago);
  if (!x) return { resultado: null, quedo: "ya_no_estaba" };
  const rev = await K.revisada("hold_renewals", id);
  let resultado: import("./consulta-pasarela").Resultado | null = null;
  if (rev) resultado = (await K.veredicto("hold_renewals", id))!.resultado;
  else if (o.origen === "equipo" || (await K.tocaConsultar("hold_renewals", id))) resultado = await K.consultar({ tabla: "hold_renewals", id, monto: h.monto, ciudad: h.ciudad, negocio: h.biz }, o);
  const v = await K.veredicto("hold_renewals", id);
  let quedo: Quedo = "sigue";
  if (v?.revisado === "ninguno") quedo = await cerrarSin(x, id, "devuelto", true);
  else if (v?.resultado === "hecho" && v.stripe) quedo = await cerrarNueva(x, id, { pi: v.stripe, marca: null, l4: null }, true);
  else if (v?.resultado === "fallido") quedo = await cerrarSin(x, id, "banco", true);
  else if (v?.noLlego) quedo = await cerrarSin(x, id, "nunca_llego", true);
  if (quedo === "sigue") await alertaSigue(x, h);
  else await K.cerrarAlertaSola("hold_stuck", id, rev ? { es: "Cerrada sola: el equipo decidió qué retención vale (gateway_review).", en: "Closed by itself: the team decided which hold counts (gateway_review)." }
    : { es: `Cerrada sola: la consulta a Stripe dijo que ${K.RESULTADO[v?.resultado ?? "sin_respuesta"].es}.`, en: `Closed by itself: the Stripe query said ${K.RESULTADO[v?.resultado ?? "sin_respuesta"].en}.` });
  return { resultado: resultado ?? v?.resultado ?? null, quedo };
}

/* La nueva quedó retenida: en UNA transacción, una vez, la vieja deja de contar en el libro y la nueva se anota; después se suelta la vieja en Stripe.
   Si la vieja ya no estaba retenida (la renta volvió o la cita se cerró mientras tanto), la nueva no hace falta: se suelta (dropped). */
async function cerrarNueva(x: Renovar, id: string, r: { pi: string; marca: string | null; l4: string | null }, porConsulta: boolean): Promise<Quedo> {
  const h = await tx(async (c) => {
    const f = (await c.query<{ ciudad: string | null }>(`select city_id as ciudad from hold_renewals where id = $1::bigint and status = 'pending' for update`, [id])).rows[0];
    if (!f) return null;
    const u = await c.query(`update payments set status = 'released', released_at = now(), updated_at = now() where id = $1::bigint and status = 'held'`, [x.pago]);
    if (!u.rowCount) {
      await c.query(`update hold_renewals set status = 'dropped', stripe_pi = $2, last_error = 'ya_no_hacia_falta' where id = $1::bigint and status = 'pending'`, [id, r.pi]);
      if (porConsulta) await (await import("./consulta-pasarela")).auditarCierre(c, "hold_renewals", id, f.ciudad, { estado: "soltada: la retención vieja ya no estaba retenida", pi: r.pi });
      return "soltada" as const;
    }
    const nuevo = await x.nueva(c, r);
    await c.query(`update hold_renewals set status = 'done', stripe_pi = $2, new_payment_id = $3::bigint, last_error = null where id = $1::bigint and status = 'pending'`, [id, r.pi, nuevo]);
    if (porConsulta) await (await import("./consulta-pasarela")).auditarCierre(c, "hold_renewals", id, f.ciudad, { estado: "renovada", pi: r.pi, pago: nuevo });
    return "hecha" as const;
  });
  if (!h) return "ya_no_estaba";
  // La vieja, DESPUÉS de anotar la nueva (o la nueva, si ya no hacía falta). Si Stripe no contesta, se suelta sola a los 7 días (horas, no días).
  await pasarela.liberar(h === "hecha" ? x.pi : r.pi).catch(() => undefined);
  return h;
}

/* No hay nueva (el banco dijo que no, nunca llegó, ninguna vale, sin tarjeta): una vez, la vieja deja de contar y se suelta; se avisa con el motivo verdadero. */
async function cerrarSin(x: Renovar, id: string, m: Motivo, porConsulta: boolean): Promise<Quedo> {
  const h = await tx(async (c) => {
    const f = (await c.query<{ ciudad: string | null }>(`update hold_renewals set status = 'failed', last_error = coalesce($2, last_error) where id = $1::bigint and status = 'pending' returning city_id as ciudad`,
      [id, m === "banco" ? (porConsulta ? "consulta_fallido" : null) : m])).rows[0];
    if (!f) return null;
    const u = await c.query(`update payments set status = 'released', released_at = now(), updated_at = now() where id = $1::bigint and status = 'held'`, [x.pago]);
    if (u.rowCount) await x.fallo(c, m);
    if (porConsulta) await (await import("./consulta-pasarela")).auditarCierre(c, "hold_renewals", id, f.ciudad, { estado: m === "banco" ? "el banco dijo que no" : m === "nunca_llego" ? "nunca llegó a Stripe" : "ninguna vale (equipo)" });
    return { soltar: !!u.rowCount };
  });
  if (!h) return "ya_no_estaba";
  if (h.soltar) { await pasarela.liberar(x.pi).catch(() => undefined); await x.avisar(m).catch(() => undefined); }
  return m === "nunca_llego" ? "no_llego" : m === "devuelto" ? "devuelto" : "fallida";
}

/* Lo que no se cierra solo: al equipo, una vez (las dos retenciones posibles quedan a la vista: la vieja en el libro y la renovación en camino). */
async function alertaSigue(x: Renovar, h: Fila) {
  await (await import("./dinero-alertas")).alertar("hold_stuck", h.id, { monto: x.monto, negocio: x.negocio, ciudad: x.ciudad, detalle: {
    es: `Renovar la retención de ${money(x.monto)} (${x.kind === "renta" ? "depósito de una renta" : "cita"}, ${x.pi}): Stripe no contestó (${h.n} intentos, ${h.err ?? "sin motivo"}) y la consulta no la cerró. No se soltó la vieja ni se avisó a nadie; se sigue preguntando.`,
    en: `Renewing the ${money(x.monto)} hold (${x.kind === "renta" ? "rental deposit" : "booking"}, ${x.pi}): Stripe did not answer (${h.n} attempts, ${h.err ?? "no reason"}) and the query did not close it. The old hold was not released and nobody was notified; it keeps being asked.` } }).catch(() => undefined);
}

/* El flujo de una renovación desde la base (para «Preguntar a Stripe ahora» y la decisión del equipo, que no vienen de un barrido). */
async function flujoDe(kind: "renta" | "estimado", pago: string): Promise<Renovar | null> {
  return kind === "renta" ? (await import("./rentas")).renovacionDeposito(pago) : (await import("./estimados")).renovacionRetencion(pago);
}

/* El barrido central: las renovaciones en camino cuya retención vieja YA NO está retenida en el libro (la renta volvió o la cita se cerró mientras tanto)
   no las recorre el barrido de su flujo (que mira las retenidas): aquí se terminan igual (con la misma llave dentro de la ventana; después, preguntando),
   y la nueva que haya salido se suelta (dropped). Las demás las recorre su propio barrido (rentas, estimados) cada minuto. */
export async function barrerRenovaciones(): Promise<number> {
  const K = await import("./consulta-pasarela");
  const L = (await db().query<{ kind: "renta" | "estimado"; pago: string }>(
    `select h.kind, h.payment_id::text as pago from hold_renewals h join payments p on p.id = h.payment_id
       left join lateral (select max(y.at) as ult from gateway_checks y where y.subject_kind = 'hold_renewals' and y.subject_id = h.id) g on true
      where h.status = 'pending' and p.status <> 'held' and h.created_at < now() - interval '2 minutes'
        and (g.ult is null or g.ult <= now() - make_interval(mins => $1::int))
      order by g.ult nulls first, h.created_at limit 20`, [K.CADA_MIN])).rows;
  let n = 0;
  // 9t9 · Cada renovación por su cuenta (lib/barrido-uno.ts): una que falla no deja a las demás sin terminar; la tarea sale fallida diciendo cuál.
  await (await import("./barrido-uno")).cadaUno("renovaciones", L, (h) => `${h.kind} ${h.pago}`, async (h) => {
    const x = await flujoDe(h.kind, h.pago);
    if (x && (await renovarRetencion(x)) === "soltada") n++;
  });
  return n;
}
export type { Bi };
