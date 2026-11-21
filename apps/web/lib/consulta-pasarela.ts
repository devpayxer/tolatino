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
export type Tabla = "subscription_charges" | "offsession_charges" | "event_settlements";
export type Resultado = "hecho" | "fallido" | "en_curso" | "no_hallado" | "varios" | "monto_distinto" | "sin_respuesta";
export type Origen = { origen: "barrido" } | { origen: "equipo"; staff: string; alGuardar?: (c: PoolClient) => Promise<unknown> };
export type Veredicto = { resultado: Resultado; stripe: string | null; centavos: number | null; at: string; noLlego: boolean; marca: string | null; l4: string | null };
type Bi = { es: string; en: string };
const money = (c: number) => `$${(c / 100).toFixed(2)}`;
export const refDe = (t: Tabla, id: string) => `${t}:${id}`;

/* Lo que se le pregunta a la pasarela de una intención: su dato buscable, el monto esperado y (transferencias) el grupo. */
export type Sujeto = { tabla: Tabla; id: string; monto: number; ciudad: string | null; negocio: string | null; grupo?: string };

/* ¿Toca preguntar? El barrido, una vez cada CADA_MIN por intención (la búsqueda de Stripe tiene su tope); la acción del equipo, siempre. */
export async function tocaConsultar(t: Tabla, id: string): Promise<boolean> {
  return !(await db().query(`select 1 from gateway_checks where subject_kind = $1 and subject_id = $2::bigint and at > now() - make_interval(mins => $3::int) limit 1`, [t, id, CADA_MIN])).rowCount;
}

/* La consulta: la pasarela primero (sin transacción abierta), después lo que dijo, anotado (con la auditoría de quien la pidió, en la misma transacción). */
export async function consultar(x: Sujeto, o: Origen): Promise<Resultado> {
  const ref = refDe(x.tabla, x.id);
  const r: Consulta = await (x.tabla === "event_settlements" ? pasarela.buscarTransferencia(ref, x.grupo ?? "", x.id) : pasarela.buscarCobro(ref)).catch((): Consulta => ({ ok: false }));
  let resultado: Resultado, h: Hallado | null = null, n = 0;
  if (!r.ok) resultado = "sin_respuesta";
  else if ("varios" in r) { resultado = "varios"; n = r.varios.length; }
  else if (!r.hallado) resultado = "no_hallado";
  else { h = r.hallado; n = 1; resultado = h.centavos !== x.monto ? "monto_distinto" : h.estado; }
  await tx(async (c) => {
    await c.query(`insert into gateway_checks (subject_kind, subject_id, lookup, origin, staff_id, result, stripe_id, amount_cents, found_n, city_id)
                   values ($1, $2::bigint, $3, $4, $5::uuid, $6, $7, $8, $9, (select id from cities where id = $10::text))`,
      [x.tabla, x.id, ref, o.origen, o.origen === "equipo" ? o.staff : null, resultado, h?.id ?? (r.ok && "varios" in r ? r.varios.map((v) => v.id).join(",").slice(0, 200) : null), h?.centavos ?? null, n, x.ciudad]);
    if (o.origen === "equipo") await o.alGuardar?.(c);
  });
  if (resultado === "varios" || resultado === "monto_distinto") await alertaRevisar(x, ref, resultado === "varios"
    ? { es: `Stripe tiene ${n} objetos para una sola intención (${ref}, ${money(x.monto)}): no se cierra sola. Míralos en Stripe y decide cuál vale; si se cobró de más, devuélvelo.`,
        en: `Stripe has ${n} objects for a single intent (${ref}, ${money(x.monto)}): it does not close by itself. Check them in Stripe and decide which one counts; if it was overcharged, refund it.` }
    : { es: `Stripe tiene ${h!.id} por ${money(h!.centavos)} para una intención de ${money(x.monto)} (${ref}): no se cierra sola. Míralo en Stripe.`,
        en: `Stripe has ${h!.id} for ${money(h!.centavos)} for an intent of ${money(x.monto)} (${ref}): it does not close by itself. Check it in Stripe.` });
  return resultado;
}
export async function alertaRevisar(x: { monto: number; ciudad: string | null; negocio: string | null }, ref: string, detalle: Bi) {
  await (await import("./dinero-alertas")).alertar("gateway_review", ref, { monto: x.monto, negocio: x.negocio, ciudad: x.ciudad, detalle }).catch(() => undefined);
}

/* Lo último que dijo la pasarela de una intención, y si cuenta como «no llegó» (con el dato buscable y pasado el margen desde que se mandó; en una
   transferencia, desde que su llave volvió a valer, si volvió). `c`: la transacción del cierre, si la hay (solo lee). */
export async function veredicto(t: Tabla, id: string, c?: Pick<PoolClient, "query">): Promise<Veredicto | null> {
  const desde = t === "event_settlements" ? "greatest(z.sent_at, coalesce(z.key_from, z.paying_at))" : "z.sent_at";
  const v = (await (c ?? db()).query<Veredicto>(
    `select g.result as resultado, g.stripe_id as stripe, g.amount_cents as centavos, to_char(g.at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at,
            (g.result = 'no_hallado' and z.gateway_ref is not null and z.sent_at is not null and g.at >= ${desde} + make_interval(hours => $3::int)) as "noLlego",
            null::text as marca, null::text as l4
       from gateway_checks g join ${t} z on z.id = g.subject_id
      where g.subject_kind = $1 and g.subject_id = $2::bigint order by g.at desc, g.id desc limit 1`, [t, id, HORAS_LLAVE + MARGEN_NO_LLEGO_H])).rows[0];
  return v ?? null;
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
export async function cerrarAlertaSola(kind: "charge_stuck" | "offsession_stuck" | "transfer_stuck", sujeto: string, nota: Bi): Promise<boolean> {
  return (await import("./dinero-alertas")).cerrarAlertaSola(kind, sujeto, nota);
}

/* La auditoría del cierre por la consulta (el sistema cerró con lo que dijo Stripe), en la transacción del cierre. */
export async function auditarCierre(c: Pick<PoolClient, "query">, t: Tabla, id: string, ciudad: string | null, after: Record<string, unknown>) {
  await c.query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, after) values ('system', null, 'dinero.consulta.cerrar', $1, $2, (select id from cities where id = $3::text), $4::jsonb)`,
    [t, id, ciudad, JSON.stringify({ origen: "consulta a la pasarela", ...after })]);
}
