import "server-only";
import { valor } from "./config";
import { db } from "./db";
import { ofrecer } from "./repartidor-ofertas";

/* 9n-4 · Repartidor: la asignación automática y los pedidos programados con recordatorio (LAUNCH L1787; fase9 §6 #21; la oferta con cuenta
   regresiva es de 9n, lib/repartidor-ofertas.ts). Lo corre el barrido central cada minuto; idempotente.
   - «Ofrecer solo» (Panel › Entrega, delivery_settings.auto_offer, apagado de fábrica): un delivery aceptado y sin repartidor se ofrece SOLO a los
     repartidores en línea del negocio, la misma oferta de 9n (el primero que acepta se lo lleva). Si vence sin nadie, se ofrece otra vez, hasta
     rep_auto_intentos ofertas (Configuración › Repartidor); si nadie lo toma, o no hay nadie en línea, el negocio recibe UN aviso
     («Nadie tomó el pedido») y la asignación automática para con ese pedido (lo asigna o lo marca el negocio, como siempre).
   - Programados: el pedido programado se ofrece cuando le faltan rep_programado_min para estar listo (no al aceptarlo); a esa hora le llega al
     negocio el recordatorio «Sale a las …» y, si ya tiene repartidor, también a él. Una vez por pedido (details.rec_prog es el candado).
   - Nunca toca un negocio que entrega con una app externa ni un pedido que ya tiene repartidor; nunca le da al repartidor el teléfono del cliente
     (la oferta es la de 9n: calle, millas y el total). */
export async function asignarSolos(): Promise<number> {
  const [intentos, antes] = await Promise.all([valor("rep_auto_intentos"), valor("rep_programado_min")]);
  const { avisar, avisarNegocio } = await import("./avisos");
  // 1 · El recordatorio de los programados (al negocio y, si ya lo tiene, al repartidor).
  const P = (await db().query<{ numero: string; biz: string; hora: string; drv: string | null; negocio: string }>(
    `update operations o set details = o.details || jsonb_build_object('rec_prog', now()), updated_at = now()
       from cities ci, businesses b
      where ci.id = o.city_id and b.id = o.business_id and o.kind = 'order' and coalesce(o.mode, 'pickup') = 'delivery' and o.status = 'confirmed' and o.scheduled_at is not null
        and coalesce(o.stage, '') <> 'delivered' and not (o.details ? 'rec_prog') and o.ready_at <= now() + make_interval(mins => $1::int) and o.ready_at > now() - interval '30 minutes'
      returning o.number as numero, o.business_id as biz, to_char(o.scheduled_at at time zone ci.timezone, 'FMHH12:MI AM') as hora,
                (select d.user_id::text from delivery_drivers d where d.id = o.driver_id and d.status = 'active') as drv, b.name as negocio`, [antes])).rows;
  for (const x of P) {
    await avisarNegocio(x.biz, "biz_programado", { num: x.numero, hora: x.hora }, { href: `/panel/${x.biz}/hoy?det=ped:${x.numero}`, ref: ["order", x.numero] }).catch(() => undefined);
    if (x.drv) await avisar(x.drv, "drv_programado", { num: x.numero, hora: x.hora, negocio: x.negocio }, { href: "/repartidor", ref: ["order", x.numero] }).catch(() => undefined);
  }
  // 2 · La oferta sola: deliveries aceptados, sin repartidor, sin oferta abierta, que ya tocan (los programados, a rep_programado_min de estar listos).
  const L = (await db().query<{ numero: string; biz: string; n: number }>(
    `select o.number as numero, o.business_id as biz, (select count(*)::int from delivery_offers f where f.operation_id = o.id and f.created_by is null) as n
       from operations o join delivery_settings d on d.business_id = o.business_id
      where d.auto_offer and coalesce(d.who, 'team') <> 'external' and o.kind = 'order' and coalesce(o.mode, 'pickup') = 'delivery' and o.status = 'confirmed'
        and o.driver_id is null and coalesce(o.stage, '') <> 'delivered' and not (o.details ? 'rep_nadie')
        and (o.scheduled_at is null or o.ready_at <= now() + make_interval(mins => $1::int))
        and not exists (select 1 from delivery_offers f where f.operation_id = o.id and f.status = 'open' and f.expires_at > now())
      order by o.ready_at limit 50`, [antes])).rows;
  let n = 0;
  for (const x of L) {
    if (x.n >= intentos) { await nadie(x.biz, x.numero, avisarNegocio); continue; }
    const r = await ofrecer(x.biz, x.numero, null, null);
    if (!r.ok) { if (/en línea/.test(r.msg.es)) await nadie(x.biz, x.numero, avisarNegocio); continue; }
    n++;
    for (const a of ("avisos" in r ? r.avisos ?? [] : [])) await avisar(a.uid, "drv_oferta", a.vars, { href: "/repartidor", ref: ["order", x.numero] }).catch(() => undefined);
  }
  return n + P.length;
}

/* Nadie lo tomó (o nadie estaba en línea): un solo aviso al negocio y la asignación automática para con ese pedido. */
async function nadie(biz: string, numero: string, avisarNegocio: (typeof import("./avisos"))["avisarNegocio"]) {
  const u = await db().query(`update operations set details = details || jsonb_build_object('rep_nadie', now()), updated_at = now() where business_id = $1 and number = $2 and kind = 'order' and not (details ? 'rep_nadie')`, [biz, numero]);
  if (u.rowCount) await avisarNegocio(biz, "biz_reparto_nadie", { num: numero }, { href: `/panel/${biz}/hoy?det=ped:${numero}`, ref: ["order", numero] }).catch(() => undefined);
}
