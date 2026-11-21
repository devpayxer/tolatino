import "server-only";
import type { Staff } from "./admin";
import { db, tx } from "./db";
import { HORAS_LLAVE_STRIPE as HORAS_LLAVE } from "./cobros";

/* 9t7 (21 nov, 0206) · Preguntarle a la pasarela por una DEVOLUCIÓN (refunds: las de lib/cobros › ejecutarDevolucionPago y las de boletos ›
   ejecutarDevolucion), como 9t5 con los cobros y 9t6 con las renovaciones. Antes, pasadas HORAS_LLAVE sin respuesta, la devolución se quedaba en camino para
   siempre con la alerta refund_stuck y solo «Resolver a mano», que confiaba en lo que decía la persona. Ahora:
   - el barrido le PREGUNTA a la pasarela (las devoluciones de ESE cobro, por el dato que se mandó: metadata tl_intencion = 'refunds:<id>') y la cierra con
     ese veredicto, una vez, por el cierre de su flujo: hecha → hecha (cobros › cerrarDevolucionPago, boletos › cerrarDevolucionBoletos); fallida → lo que
     pasa con un «no» (cobros › fallarDevolucionPago, boletos › fallarDevolucionBoletos) y la alerta refund_failed; nunca llegó (con el dato y pasado el
     margen: veredicto().noLlego) → la MISMA devolución vuelve a valer con OTRA llave y se manda, SOLO si lo debido sigue igual (el cobro sigue cobrado, sin
     disputa y le alcanza el saldo); si cambió, queda fallida «nunca llegó» y la alerta; varias u otro monto → gateway_review (consultar) y sigue;
   - una devolución anotada antes de 0206 (sin el dato buscable) nunca se da por «no llegó»: el barrido no la pregunta (no hay cómo hallarla) y la alerta lo
     dice;
   - «Resolver a mano» (refund_stuck, transfer_reversal_stuck y extra_refund_stuck) vuelve a preguntar ANTES de dejar marcarla (antesDeAMano): si Stripe dice
     que salió, se cierra como hecha (no a mano); si no contesta, no cambia nada. */
type Res = { ok: true; msg?: string } | { ok: false; msg: string };
type Dv = { id: string; st: string; mano: boolean; amt: number; idem: string; pi: string; boletos: boolean; gref: string | null; enviada: boolean; vieja: boolean; n: number; err: string | null;
  biz: string | null; city: string | null; igual: boolean };
const money = (c: number) => `$${(c / 100).toFixed(2)}`;
/* «Lo debido sigue igual»: el cobro sigue cobrado, sin disputa abierta o perdida, y le alcanza el saldo (lo devuelto según el libro y según Stripe, más lo que
   va en camino de otras devoluciones, más esta). La base lo vuelve a imponer (refunds_tope cuenta lo pendiente y lo hecho). */
const SEL = `select r.id::text, r.status as st, r.manual_at is not null as mano, r.amount_cents as amt, r.idem_key as idem, p.stripe_payment_intent as pi,
                    exists (select 1 from ticket_refund_lines l where l.refund_id = r.id) as boletos, r.gateway_ref as gref, r.sent_at is not null as enviada,
                    coalesce(r.key_from, r.created_at) <= now() - make_interval(hours => $2::int) as vieja, r.attempts as n, r.last_error as err, p.business_id as biz, p.city_id as city,
                    (p.status in ('captured', 'partially_refunded') and not exists (select 1 from disputes d where d.payment_id = p.id and d.status <> 'won')
                     and greatest(p.refunded_cents, coalesce((select sum(x.amount_cents) from refunds x where x.payment_id = p.id and x.status = 'done'), 0))
                         + coalesce((select sum(x.amount_cents) from refunds x where x.payment_id = p.id and x.status = 'pending' and x.id <> r.id), 0) + r.amount_cents <= p.amount_cents) as igual
               from refunds r join payments p on p.id = r.payment_id where r.id = $1::bigint`;
const leer = async (id: string) => (await db().query<Dv>(SEL, [id, HORAS_LLAVE])).rows[0];

export type Quedo = "hecha" | "fallida" | "reabierta" | "no_llego" | "sigue" | "ya_no_estaba";
/* Pasada la llave: la consulta (fuera de transacción, anotada) y el cierre con su veredicto. El barrido, «Preguntar a Stripe ahora» y «Elegir cuál vale». */
export async function resolverDevolucion(id: string, o: import("./consulta-pasarela").Origen): Promise<{ resultado: import("./consulta-pasarela").Resultado | null; quedo: Quedo }> {
  const K = await import("./consulta-pasarela");
  const r = await leer(id);
  if (!r || r.st !== "pending" || r.mano || !r.enviada || !r.vieja) return { resultado: null, quedo: "ya_no_estaba" };
  if (o.origen === "barrido" && !(await K.tocaConsultar("refunds", id))) return { resultado: null, quedo: "sigue" };
  // Ya decidida por el equipo (gateway_review: cuál de las halladas vale): no se vuelve a preguntar; se cierra con la decisión.
  const resultado = (await K.revisada("refunds", id)) ? (await K.veredicto("refunds", id))!.resultado
    : await K.consultar({ tabla: "refunds", id, monto: r.amt, ciudad: r.city, negocio: r.biz, medio: "refund", objeto: r.pi }, o);
  const quedo = await cerrarConVeredicto(r);
  // Lo que no cerró: la alerta (una vez). Una que se volvió a mandar con otra llave sigue en camino: su alerta, si la había, queda abierta.
  if (quedo === "sigue") await (await import("./cobros")).alertaVieja(r, true);
  else if (quedo !== "reabierta") await K.cerrarAlertaSola("refund_stuck", id, { es: `Cerrada sola: la consulta a Stripe dijo que ${K.RESULTADO[resultado].es} (${QUEDO[quedo].es}).`, en: `Closed by itself: the Stripe query said ${K.RESULTADO[resultado].en} (${QUEDO[quedo].en}).` });
  return { resultado, quedo };
}
const QUEDO: Record<Quedo, { es: string; en: string }> = {
  hecha: { es: "quedó hecha", en: "it is done" }, fallida: { es: "quedó fallida: alerta aparte", en: "it failed: separate alert" },
  reabierta: { es: "nunca llegó: se mandó otra vez con otra llave", en: "it never arrived: sent again with another key" }, no_llego: { es: "nunca llegó y el cobro cambió: quedó fallida, alerta aparte", en: "it never arrived and the charge changed: it failed, separate alert" },
  sigue: { es: "sigue en camino", en: "still on its way" }, ya_no_estaba: { es: "ya no estaba en camino", en: "no longer on its way" },
};
/* El cierre con lo último que dijo la pasarela (veredicto), por el cierre de su flujo. «Nunca llegó» solo con veredicto().noLlego. */
async function cerrarConVeredicto(r: Dv): Promise<Quedo> {
  const K = await import("./consulta-pasarela");
  // Los boletos, solo si es de boletos (el módulo se carga cuando hace falta).
  const C = await import("./cobros"), B = () => import("./boletos-despues");
  const v = await K.veredicto("refunds", r.id);
  if (v?.resultado === "hecho" && v.stripe) {
    if (r.boletos) return (await (await B()).cerrarDevolucionBoletos(r.id, v.stripe, true)) ? "hecha" : "sigue";
    return (await C.cerrarDevolucionPago(r.id, v.stripe, undefined, true)).ok ? "hecha" : "sigue";
  }
  if (v?.resultado === "fallido") return (r.boletos ? await (await B()).fallarDevolucionBoletos(r.id, "consulta_fallido") : await C.fallarDevolucionPago(r, "consulta_fallido", "fallida")) ? "fallida" : "sigue";
  if (v?.noLlego) {
    if (!r.igual) return (r.boletos ? await (await B()).fallarDevolucionBoletos(r.id, "nunca_llego") : await C.fallarDevolucionPago(r, "nunca_llego", "fallida", true)) ? "no_llego" : "sigue";
    // La MISMA devolución vuelve a valer desde ahora con OTRA llave (key_n), una vez (la base pide que la anterior ya haya pasado HORAS_LLAVE), con su auditoría.
    const u = await tx(async (c) => {
      const x = await c.query(`update refunds set key_from = now(), key_n = key_n + 1, last_error = 'nunca_llego' where id = $1::bigint and status = 'pending' and manual_at is null
                                 and coalesce(key_from, created_at) <= now() - make_interval(hours => $2::int)`, [r.id, HORAS_LLAVE]);
      if (x.rowCount) await K.auditarCierre(c, "refunds", r.id, r.city, { estado: "nunca llegó a Stripe: se manda otra vez con otra llave", monto: money(r.amt) });
      return !!x.rowCount;
    });
    if (!u) return "sigue";
    const salio = r.boletos ? await (await B()).ejecutarDevolucion(r.id) : (await C.ejecutarDevolucionPago(r.id, { barrido: true })).ok;
    return salio ? "hecha" : "reabierta";
  }
  return "sigue";
}

/* El barrido de las viejas (cobros o boletos): las mandadas con su dato se preguntan (una vez cada CADA_MIN por devolución, hasta 20 por vuelta, las que hace
   más que no se preguntan primero); las anotadas sin el dato, la alerta de siempre (una vez). */
export async function preguntarViejas(boletos: boolean): Promise<number> {
  const K = await import("./consulta-pasarela");
  const lin = boletos ? "exists" : "not exists";
  const Q = (await db().query<{ id: string }>(
    `select r.id::text from refunds r left join lateral (select max(y.at) as ult from gateway_checks y where y.subject_kind = 'refunds' and y.subject_id = r.id) g on true
      where r.status = 'pending' and r.manual_at is null and r.gateway_ref is not null and coalesce(r.key_from, r.created_at) <= now() - make_interval(hours => $1::int)
        and ${lin} (select 1 from ticket_refund_lines l where l.refund_id = r.id) and (g.ult is null or g.ult <= now() - make_interval(mins => $2::int))
      order by g.ult nulls first, r.created_at limit 20`, [HORAS_LLAVE, K.CADA_MIN])).rows;
  let n = 0;
  for (const r of Q) if ((await resolverDevolucion(r.id, { origen: "barrido" }).catch(() => ({ quedo: "sigue" }))).quedo === "hecha") n++;
  const V = (await db().query<{ id: string; amt: number; biz: string | null; city: string | null; n: number; err: string | null }>(
    `select r.id::text, r.amount_cents as amt, p.business_id as biz, p.city_id as city, r.attempts as n, r.last_error as err from refunds r join payments p on p.id = r.payment_id
      where r.status = 'pending' and r.manual_at is null and r.gateway_ref is null and coalesce(r.key_from, r.created_at) <= now() - make_interval(hours => $1::int)
        and ${lin} (select 1 from ticket_refund_lines l where l.refund_id = r.id)
        and not exists (select 1 from money_alerts a where a.kind = 'refund_stuck' and a.subject_id = r.id::text) order by r.created_at limit 50`, [HORAS_LLAVE])).rows;
  const { alertaVieja } = await import("./cobros");
  for (const r of V) await alertaVieja(r, false);
  return n;
}

/* ── «Resolver a mano», con la pasarela antes ──
   Lo llama dinero-alertas › notaAlerta antes de marcar 'resuelta_a_mano' (fuera de su transacción). La consulta queda anotada con la auditoría de quien la
   pidió. Lo que contesta Stripe manda: hecha → se cierra como hecha por el cierre de su flujo, una vez, y NO se marca a mano; en curso o varias → no se marca
   (esperar, o «Elegir cuál vale»); no contestó → no cambia nada; no la tiene, la tiene fallida o con otro monto → se puede marcar a mano (con la nota). */
export type AMano = { sigue: true } | { sigue: false; ok: boolean; msg: string };
export async function antesDeAMano(s: Staff, alerta: string, kind: string, sujeto: string, nota: string): Promise<AMano> {
  if (!/^\d{1,18}$/.test(sujeto)) return { sigue: false, ok: false, msg: "Esta alerta no tiene camino manual." };
  const K = await import("./consulta-pasarela");
  const { auditar } = await import("./admin");
  const o: import("./consulta-pasarela").Origen = { origen: "equipo", staff: s.id, alGuardar: (c) => auditar(c, { actor: s.id, action: "dinero.alerta.preguntar", targetKind: "money_alert", targetId: alerta,
    after: { antes_de: "resolver a mano", intencion: `${kind}:${sujeto}` }, reason: nota.trim().slice(0, 500) }) };
  let resultado: import("./consulta-pasarela").Resultado, cerrar: (stripe: string) => Promise<boolean>;
  if (kind === "refund_stuck") {
    const r = await leer(sujeto);
    if (!r || r.st !== "pending" || r.mano) return { sigue: false, ok: false, msg: "Ya no está pendiente: Stripe la hizo o ya se resolvió a mano." };
    resultado = await K.consultar({ tabla: "refunds", id: r.id, monto: r.amt, ciudad: r.city, negocio: r.biz, medio: "refund", objeto: r.pi }, o);
    cerrar = async (x) => (r.boletos ? (await import("./boletos-despues")).cerrarDevolucionBoletos(r.id, x, true) : (await import("./cobros")).cerrarDevolucionPago(r.id, x, undefined, true).then((y) => y.ok));
  } else if (kind === "transfer_reversal_stuck") {
    const L = await import("./evt-liquidacion");
    const r = await L.reversionParaConsulta(sujeto);
    if (!r) return { sigue: false, ok: false, msg: "Ya no está pendiente: Stripe la hizo o ya se resolvió a mano." };
    resultado = await K.consultar({ tabla: "event_settlement_reversals", id: sujeto, monto: r.amt, ciudad: r.city, negocio: r.biz, medio: "reversal", objeto: r.tr }, o);
    cerrar = (x) => L.cerrarReversionPorConsulta(sujeto, x);
  } else if (kind === "extra_refund_stuck") {
    const RV = await import("./revision-pasarela");
    const g = await RV.sobraParaConsulta(sujeto);
    if (!g) return { sigue: false, ok: false, msg: "Ya está hecha o ya se resolvió a mano." };
    resultado = await K.consultar({ tabla: "gateway_refunds", id: sujeto, monto: g.monto, ciudad: g.ciudad, negocio: g.biz, medio: g.medio, objeto: g.stripe }, o);
    cerrar = async (x) => g.st === "pending" && (await RV.cerrarSobraPorConsulta(sujeto, x));
  } else return { sigue: false, ok: false, msg: "Esta alerta no tiene camino manual." };
  if (resultado === "sin_respuesta") return { sigue: false, ok: false, msg: "Stripe no contestó la consulta: no se cambió nada. Prueba en un momento." };
  if (resultado === "en_curso") return { sigue: false, ok: false, msg: "Stripe la tiene en curso: espera a que termine (se cierra sola) y vuelve a intentarlo." };
  if (resultado === "varios") return { sigue: false, ok: false, msg: "Stripe tiene más de una para esta intención: decide en su alerta «Lo que dijo Stripe no se cierra solo» (Elegir cuál vale)." };
  if (resultado === "hecho") {
    const v = await K.veredicto(kind === "refund_stuck" ? "refunds" : kind === "transfer_reversal_stuck" ? "event_settlement_reversals" : "gateway_refunds", sujeto);
    const hecha = !!v?.stripe && (await cerrar(v.stripe));
    return { sigue: false, ok: hecha, msg: hecha ? `Stripe dice que sí salió (${v!.stripe}): se cerró como hecha, una vez, y la alerta se cierra sola. No se marca a mano.`
      : `Stripe dice que sí salió${v?.stripe ? ` (${v.stripe})` : ""}: no se marca a mano. Míralo en Stripe.` };
  }
  return { sigue: true };
}
