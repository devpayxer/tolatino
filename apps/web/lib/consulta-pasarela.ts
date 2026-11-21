import "server-only";
import type { PoolClient } from "pg";
import { db, tx } from "./db";
import { HORAS_LLAVE_STRIPE as HORAS_LLAVE } from "./cobros";
import { pasarela, type Consulta, type Hallado } from "./pagos/pasarela";

/* 9t5 (21 nov) · Preguntarle a la pasarela (0203). Una intención de dinero (un cobro de Pro, un cobro con tarjeta guardada, una transferencia al
   organizador) que pasa HORAS_LLAVE en camino sin respuesta ya no vuelve a Stripe con su llave (podría cobrar dos veces). En vez de quedarse 'pending'
   para siempre, el servidor le PREGUNTA a la pasarela qué pasó, por el dato propio que mandó al crear (metadata tl_intencion = '<tabla>:<id>', anotado en
   la fila ANTES de la llamada: gateway_ref), y cierra con esa verdad. Nadie afirma «sí se cobró / no se cobró» de memoria.
   - consultar(): la llamada a la pasarela (FUERA de cualquier transacción) y, en una transacción, la consulta anotada (gateway_checks, solo inserción) con
     la auditoría de quien la pidió, si es una persona del equipo. Lo que no se cierra solo (varios hallados, otro monto) alerta gateway_review.
   - veredicto(): lo último que dijo la pasarela de esa intención. Lo lee el cierre de cada tabla (suscripcion.ts › terminarCobro, cobro-fuera.ts ›
     terminarCobro, evt-liquidacion.ts › pagarUna), dentro o fuera de su transacción, sin volver a llamar a la pasarela.
   - «No llegó» (no_hallado → la intención falla y el siguiente cobro del objeto vuelve a poder salir) SOLO si la intención se mandó con el dato buscable
     (gateway_ref) y la consulta se hizo cuando ya habían pasado HORAS_LLAVE + MARGEN_NO_LLEGO_H desde que se mandó por primera vez (sent_at): el último
     reintento con la llave fue, como mucho, HORAS_LLAVE después de anotarla (la fila se anota antes de mandarse), y la búsqueda de Stripe tarda en ver lo
     nuevo (~1 min, hasta una hora en un incidente). Una intención sin gateway_ref (se mandó antes de 9t5) nunca se da por «no llegó». */
export const MARGEN_NO_LLEGO_H = 1;
/* Cada cuánto el barrido vuelve a preguntar por la misma intención (la acción del Super Admin no espera). */
export const CADA_MIN = 15;
/* 9t6 (0204) · También las renovaciones de una retención (hold_renewals: lo que se busca es una retención, «requires_capture» es hecha) y la devolución de
   lo que sobró decidida desde una gateway_review (gateway_refunds: entre las devoluciones de ese cobro o las reversiones de esa transferencia). */
export type Tabla = "subscription_charges" | "offsession_charges" | "event_settlements" | "hold_renewals" | "gateway_refunds";
export type Resultado = "hecho" | "fallido" | "en_curso" | "no_hallado" | "varios" | "monto_distinto" | "sin_respuesta";
export type Origen = { origen: "barrido" } | { origen: "equipo"; staff: string; alGuardar?: (c: PoolClient) => Promise<unknown> };
/* 9t6 · revisado: una persona del equipo cerró la gateway_review de esta intención (gateway_reviews, una vez): «vale» (resultado hecho con el que eligió,
   ya comprobado contra lo que la pasarela dijo al decidir) o «ninguno» (lo hallado se devuelve y la intención falla sin contar como un «no» del banco). */
export type Veredicto = { resultado: Resultado; stripe: string | null; centavos: number | null; at: string; noLlego: boolean; marca: string | null; l4: string | null; revisado: "vale" | "ninguno" | null };
type Bi = { es: string; en: string };
const money = (c: number) => `$${(c / 100).toFixed(2)}`;
export const refDe = (t: Tabla, id: string) => `${t}:${id}`;

/* Lo que se le pregunta a la pasarela de una intención: su dato buscable, el monto esperado y (transferencias) el grupo; (devolución de lo que sobró) el
   medio y el objeto de Stripe al que se devolvió. */
export type Sujeto = { tabla: Tabla; id: string; monto: number; ciudad: string | null; negocio: string | null; grupo?: string; medio?: "refund" | "reversal"; objeto?: string };
/* 9t6 · Lo que la consulta halló (para la decisión del equipo: el servidor la compara con lo que se eligió) y la fila que la anotó. */
export type Detalle = { hallados: Hallado[]; check: string | null };

/* 9t6 (0205) · Lo hallado en orden de creación (el primero arriba; sin fecha, al final y en el orden en que llegó) y cuántos se guardan con su detalle. */
export const MAX_DETALLE = 20;
export function enOrden<T extends { creado?: string | null }>(H: T[]): T[] {
  return H.map((h, i) => ({ h, i })).sort((a, b) => (a.h.creado && b.h.creado ? (a.h.creado < b.h.creado ? -1 : a.h.creado > b.h.creado ? 1 : a.i - b.i) : a.h.creado ? -1 : b.h.creado ? 1 : a.i - b.i)).map((x) => x.h);
}

/* ¿Toca preguntar? El barrido, una vez cada CADA_MIN por intención (la búsqueda de Stripe tiene su tope); la acción del equipo, siempre. */
export async function tocaConsultar(t: Tabla, id: string): Promise<boolean> {
  return !(await db().query(`select 1 from gateway_checks where subject_kind = $1 and subject_id = $2::bigint and at > now() - make_interval(mins => $3::int) limit 1`, [t, id, CADA_MIN])).rowCount;
}

/* La consulta: la pasarela primero (sin transacción abierta), después lo que dijo, anotado (con la auditoría de quien la pidió, en la misma transacción). */
export async function consultar(x: Sujeto, o: Origen, detalle?: Detalle): Promise<Resultado> {
  const ref = refDe(x.tabla, x.id);
  const r: Consulta = await (x.tabla === "event_settlements" ? pasarela.buscarTransferencia(ref, x.grupo ?? "", x.id)
    : x.tabla === "gateway_refunds" ? pasarela.buscarDevolucion(ref, x.medio ?? "refund", x.objeto ?? "")
    : pasarela.buscarCobro(ref, { retencion: x.tabla === "hold_renewals" })).catch((): Consulta => ({ ok: false }));
  let resultado: Resultado, h: Hallado | null = null, n = 0;
  if (!r.ok) resultado = "sin_respuesta";
  else if ("varios" in r) { resultado = "varios"; n = r.varios.length; }
  else if (!r.hallado) resultado = "no_hallado";
  else { h = r.hallado; n = 1; resultado = h.centavos !== x.monto ? "monto_distinto" : h.estado; }
  // 9t6 (0205) · Lo hallado, con su detalle (estado, monto y cuándo se creó), en orden de creación y con tope: SOLO para mostrar en la hoja «Elegir cuál vale»
  // (dinero-alertas › opcionesDeAlertas). La decisión del equipo vuelve a preguntar a la pasarela y decide con ESA respuesta, nunca con esto.
  const found = !r.ok ? null : enOrden("varios" in r ? r.varios : r.hallado ? [r.hallado] : []).slice(0, MAX_DETALLE).map((v) => ({ id: v.id, estado: v.estado, centavos: v.centavos, creado: v.creado ?? null }));
  const check = await tx(async (c) => {
    const g = (await c.query<{ id: string }>(`insert into gateway_checks (subject_kind, subject_id, lookup, origin, staff_id, result, stripe_id, amount_cents, found_n, city_id, found)
                   values ($1, $2::bigint, $3, $4, $5::uuid, $6, $7, $8, $9, (select id from cities where id = $10::text), $11::jsonb) returning id::text`,
      [x.tabla, x.id, ref, o.origen, o.origen === "equipo" ? o.staff : null, resultado, h?.id ?? (r.ok && "varios" in r ? r.varios.map((v) => v.id).join(",").slice(0, 200) : null), h?.centavos ?? null, n, x.ciudad,
        found ? JSON.stringify(found) : null])).rows[0]!;
    if (o.origen === "equipo") await o.alGuardar?.(c);
    return g.id;
  });
  if (detalle) { detalle.check = check; detalle.hallados = !r.ok ? [] : "varios" in r ? r.varios : r.hallado ? [r.hallado] : []; }
  // 9t6 · Lo que no se cierra solo lo cierra una persona del equipo desde la alerta («Elegir cuál vale»: lib/revision-pasarela.ts); el servidor vuelve a
  // preguntar y devuelve (o suelta, si es una retención; o revierte, si es una transferencia) lo que sobra.
  const sobra = x.tabla === "hold_renewals" ? { es: "suelta", en: "releases" } : x.tabla === "event_settlements" ? { es: "revierte", en: "reverses" } : { es: "devuelve", en: "refunds" };
  if (resultado === "varios" || resultado === "monto_distinto") await alertaRevisar(x, ref, resultado === "varios"
    ? { es: `Stripe tiene ${n} objetos para una sola intención (${ref}, ${money(x.monto)}): no se cierra sola. Elige en la alerta cuál vale; el servidor vuelve a preguntar a Stripe y ${sobra.es} lo que sobra.`,
        en: `Stripe has ${n} objects for a single intent (${ref}, ${money(x.monto)}): it does not close by itself. Choose in the alert which one counts; the server asks Stripe again and ${sobra.en} the rest.` }
    : { es: `Stripe tiene ${h!.id} por ${money(h!.centavos)} para una intención de ${money(x.monto)} (${ref}): no se cierra sola. ${x.tabla === "event_settlements" ? "Míralo en Stripe." : `En la alerta, «Ninguno vale» lo ${sobra.es} y la intención queda fallida.`}`,
        en: `Stripe has ${h!.id} for ${money(h!.centavos)} for an intent of ${money(x.monto)} (${ref}): it does not close by itself. ${x.tabla === "event_settlements" ? "Check it in Stripe." : `In the alert, «None counts» ${sobra.en} it and the intent fails.`}` });
  return resultado;
}
export async function alertaRevisar(x: { monto: number; ciudad: string | null; negocio: string | null }, ref: string, detalle: Bi) {
  await (await import("./dinero-alertas")).alertar("gateway_review", ref, { monto: x.monto, negocio: x.negocio, ciudad: x.ciudad, detalle }).catch(() => undefined);
}

/* Lo último que dijo la pasarela de una intención, y si cuenta como «no llegó» (con el dato buscable y pasado el margen desde que se mandó; en una
   transferencia, desde que su llave volvió a valer, si volvió). `c`: la transacción del cierre, si la hay (solo lee). */
export async function veredicto(t: Tabla, id: string, c?: Pick<PoolClient, "query">): Promise<Veredicto | null> {
  // La tabla y el «desde» salen de una lista cerrada escrita aquí, nunca del parámetro tal cual (Semgrep, CI 44889132454: un nombre de tabla que
  // llega de afuera no entra al texto de una consulta, aunque hoy todos los que llaman pasen un valor fijo).
  const tabla = t === "subscription_charges" ? "subscription_charges" : t === "offsession_charges" ? "offsession_charges" : t === "event_settlements" ? "event_settlements" : t === "hold_renewals" ? "hold_renewals" : t === "gateway_refunds" ? "gateway_refunds" : null;
  if (!tabla) throw new Error("veredicto: tabla desconocida");
  const desde = tabla === "event_settlements" ? "greatest(z.sent_at, coalesce(z.key_from, z.paying_at))" : "z.sent_at";
  // 9t6 · La decisión del equipo (gateway_reviews, una vez) manda sobre la última consulta: ya se comprobó contra lo que la pasarela dijo al decidir.
  const rv = (await (c ?? db()).query<{ d: "vale" | "ninguno"; stripe: string | null; centavos: number; at: string }>(
    `select decision as d, stripe_id as stripe, amount_cents as centavos, to_char(at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at from gateway_reviews where subject_kind = $1 and subject_id = $2::bigint`, [tabla, id])).rows[0];
  // «Ninguno» no es un «no» del banco ni un «no llegó»: un cierre que no lo conoce (revisado) lo deja en camino; los que lo conocen fallan con 'devuelto'.
  if (rv) return { resultado: rv.d === "vale" ? "hecho" : "no_hallado", stripe: rv.stripe, centavos: rv.centavos, at: rv.at, noLlego: false, marca: null, l4: null, revisado: rv.d };
  const v = (await (c ?? db()).query<Veredicto>(
    `select g.result as resultado, g.stripe_id as stripe, g.amount_cents as centavos, to_char(g.at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at,
            (g.result = 'no_hallado' and z.gateway_ref is not null and z.sent_at is not null and g.at >= ${desde} + make_interval(hours => $3::int)) as "noLlego",
            null::text as marca, null::text as l4, null::text as revisado
       from gateway_checks g join ${tabla} z on z.id = g.subject_id
      where g.subject_kind = $1 and g.subject_id = $2::bigint order by g.at desc, g.id desc limit 1`, [tabla, id, HORAS_LLAVE + MARGEN_NO_LLEGO_H])).rows[0];
  return v ?? null;
}
/* 9t6 · ¿Una persona del equipo ya decidió esta intención? (Los barridos y «Preguntar a Stripe ahora» no vuelven a preguntar: cierran con la decisión.) */
export async function revisada(t: "subscription_charges" | "offsession_charges" | "event_settlements" | "hold_renewals", id: string): Promise<boolean> {
  return !!(await db().query(`select 1 from gateway_reviews where subject_kind = $1 and subject_id = $2::bigint`, [t, id])).rowCount;
}

/* Cómo lo dice la alerta del Super Admin (y el mensaje de la acción). */
export const RESULTADO: Record<Resultado, Bi> = {
  hecho: { es: "sí salió", en: "it went through" }, fallido: { es: "el banco dijo que no o se canceló", en: "the bank declined it or it was canceled" },
  en_curso: { es: "sigue en curso en Stripe (p. ej. el banco pide verificar)", en: "still in progress at Stripe (e.g. the bank asks to verify)" },
  no_hallado: { es: "no está en Stripe", en: "it is not in Stripe" }, varios: { es: "hay más de uno en Stripe: lo decide una persona", en: "there is more than one in Stripe: a person decides" },
  monto_distinto: { es: "está en Stripe con otro monto: lo decide una persona", en: "it is in Stripe with another amount: a person decides" },
  sin_respuesta: { es: "Stripe no contestó la consulta", en: "Stripe did not answer the query" },
};

/* La alerta «sin respuesta» de una intención se cierra sola cuando deja de estar en camino (las alertas las escribe solo lib/dinero-alertas.ts). */
export async function cerrarAlertaSola(kind: "charge_stuck" | "offsession_stuck" | "transfer_stuck" | "hold_stuck" | "extra_refund_stuck" | "gateway_review", sujeto: string, nota: Bi): Promise<boolean> {
  return (await import("./dinero-alertas")).cerrarAlertaSola(kind, sujeto, nota);
}

/* La auditoría del cierre por la consulta (el sistema cerró con lo que dijo Stripe), en la transacción del cierre. */
export async function auditarCierre(c: Pick<PoolClient, "query">, t: Tabla, id: string, ciudad: string | null, after: Record<string, unknown>) {
  await c.query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, after) values ('system', null, 'dinero.consulta.cerrar', $1, $2, (select id from cities where id = $3::text), $4::jsonb)`,
    [t, id, ciudad, JSON.stringify({ origen: "consulta a la pasarela", ...after })]);
}
