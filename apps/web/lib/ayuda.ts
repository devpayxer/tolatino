import "server-only";
import { cfgSql, valor } from "./config";
import { horasTxt } from "./plazo-txt";
import { COLA_AYUDA_SQL } from "./colas";
import { db, tx } from "./db";

/* Ayuda con el pedido (diseño Mi cuenta · hoja help; Super Admin secSop). La persona abre una solicitud sobre un pedido
   terminado (hasta 7 días); el negocio responde en las horas de Configuración (ayuda_negocio_h); si no responde, o si la persona pide que To'Latino la revise,
   pasa a la cola «Ayuda con pedidos» (sop) y To'Latino la resuelve con un mensaje. Una por pedido. */
type Bi = { es: string; en: string };
export type Motivo = "falta" | "equivocado" | "frio" | "danado" | "tarde" | "nollego" | "pago" | "otro";
export const MOTIVOS: Motivo[] = ["falta", "equivocado", "frio", "danado", "tarde", "nollego", "pago", "otro"];
export type Quiere = "reponer" | "devolver" | "avisar";
export type ItemAyuda = { n: string; q: number };
export type ResA = { ok: true; numero?: string } | { ok: false; msg: Bi };
const no = (es: string, en: string): ResA => ({ ok: false, msg: { es, en } });
const ISO = (x: string) => `to_char((${x}) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;
export type Ayuda = { id: string; number: string; reason: Motivo; items: ItemAyuda[]; wants: Quiere; body: string | null; status: "open" | "answered" | "escalated" | "resolved"; reply: string | null; replyAt: string | null; resolution: string | null; resolvedAt: string | null; at: string; vence: string; porUsuario: boolean; plazoH: number };
const COLS = `h.id::text, h.number, h.reason, h.items, h.wants, h.body, h.status, h.reply, ${ISO("h.reply_at")} as "replyAt", h.resolution, ${ISO("h.resolved_at")} as "resolvedAt", ${ISO("h.created_at")} as at,
  ${ISO(`h.created_at + make_interval(hours => ${cfgSql("ayuda_negocio_h")})`)} as vence, coalesce(h.escalated_by = 'user', false) as "porUsuario", ${cfgSql("ayuda_negocio_h")} as "plazoH"`;

/* Pasa a To'Latino lo que el negocio no respondió a tiempo (ayuda_negocio_h; barato: índice parcial de las abiertas). */
export async function escalarVencidas() {
  const hay = await db().query(`select 1 from help_requests where status = 'open' and created_at <= now() - make_interval(hours => ${cfgSql("ayuda_negocio_h")}) limit 1`);
  if (!hay.rowCount) return;
  await tx(async (c) => {
    const L = (await c.query<{ id: string; business_id: string; city_id: string }>(
      `update help_requests set status = 'escalated', escalated_at = now(), escalated_by = 'system', updated_at = now()
        where status = 'open' and created_at <= now() - make_interval(hours => ${cfgSql("ayuda_negocio_h")}) returning id::text, business_id, city_id`)).rows;
    for (const h of L) await c.query(`insert into queue_items (queue, subject_kind, subject_id, business_id, city_id, priority) select ${COLA_AYUDA_SQL}, 'help_request', $1, $2, $3, 'normal' on conflict do nothing`, [h.id, h.business_id, h.city_id]);
  });
}

/* ── La persona ── */
export async function ayudaDePedido(userId: string, numero: string) {
  await escalarVencidas();
  const r = (await db().query<{ puede: boolean; hecho: boolean; delivery: boolean; lineas: ItemAyuda[] }>(
    `select (o.status = 'done' or o.stage in ('delivered', 'picked_up')) and coalesce(o.done_at, o.updated_at) > now() - interval '7 days' as puede,
            (o.status = 'done' or o.stage in ('delivered', 'picked_up')) as hecho, o.mode = 'delivery' as delivery,
            coalesce((select jsonb_agg(jsonb_build_object('n', coalesce(l.name->>'es', ''), 'q', l.qty) order by l.id) from operation_lines l where l.operation_id = o.id), '[]') as lineas
       from operations o where o.number = $1 and o.user_id = $2 and o.kind = 'order'`, [numero, userId])).rows[0];
  if (!r) return null;
  const a = (await db().query<Ayuda>(`select ${COLS} from help_requests h join operations o on o.id = h.operation_id where o.number = $1 and h.user_id = $2`, [numero, userId])).rows[0] ?? null;
  // 9n-5 · Las horas que tiene el negocio para responder (Configuración · ayuda_negocio_h), para decirlas antes de pedir.
  return { puede: r.puede && !a, hecho: r.hecho, delivery: r.delivery, lineas: r.lineas, a, plazoH: await valor("ayuda_negocio_h") };
}
export type AyudaIn = { reason: string; items?: ItemAyuda[]; wants?: string; body?: string };
const POR_PLATO = new Set(["falta", "equivocado", "frio", "danado"]);
export async function pedirAyuda(userId: string, numero: string, p: AyudaIn): Promise<ResA> {
  if (!/^\d{1,12}$/.test(numero)) return no("Ese pedido no existe.", "That order does not exist.");
  const reason = String(p?.reason ?? "");
  if (!(MOTIVOS as string[]).includes(reason)) return no("Elige qué pasó.", "Choose what happened.");
  const txt = String(p?.body ?? "").trim().slice(0, 300) || null;
  const wants = ["reponer", "devolver", "avisar"].includes(String(p?.wants)) ? String(p.wants) : "avisar";
  if (reason === "otro" && !txt) return no("Cuéntale al negocio qué pasó.", "Tell the business what happened.");
  return tx(async (c) => {
    const o = (await c.query<{ id: string; business_id: string; city_id: string; ok: boolean }>(
      `select o.id::text, o.business_id, o.city_id, (o.status = 'done' or o.stage in ('delivered', 'picked_up')) and coalesce(o.done_at, o.updated_at) > now() - interval '7 days' as ok
         from operations o where o.number = $1 and o.user_id = $2 and o.kind = 'order' for update`, [numero, userId])).rows[0];
    if (!o) return no("Ese pedido no existe.", "That order does not exist.");
    if (!o.ok) return no("La ayuda con un pedido se pide hasta 7 días después de recibirlo.", "Order help can be asked up to 7 days after you got it.");
    // Los platos: solo los del pedido y hasta la cantidad que se pidió.
    const L = (await c.query<{ n: string; q: number }>(`select coalesce(name->>'es', '') as n, qty as q from operation_lines where operation_id = $1::bigint`, [o.id])).rows;
    const items = (Array.isArray(p?.items) ? p.items : []).map((x) => { const l = L.find((y) => y.n === String(x?.n ?? "")); return l ? { n: l.n, q: Math.max(1, Math.min(l.q, Math.round(Number(x?.q) || 1))) } : null; }).filter((x): x is ItemAyuda => !!x);
    if (POR_PLATO.has(reason) && !items.length) return no("Elige qué platos.", "Choose which dishes.");
    if (wants === "reponer" && !POR_PLATO.has(reason) && reason !== "nollego") return no("Eso no se puede reponer.", "That cannot be replaced.");
    const n = (await c.query<{ n: number }>(`select count(*)::int as n from help_requests where user_id = $1 and created_at > now() - interval '1 day'`, [userId])).rows[0]!.n;
    if (n >= 5) return no("Abriste muchas solicitudes hoy. Prueba mañana.", "You opened many requests today. Try tomorrow.");
    const r = await c.query<{ number: string }>(
      `insert into help_requests (number, operation_id, business_id, city_id, user_id, reason, items, wants, body) values ('H-' || nextval('help_request_number_seq'), $1, $2, $3, $4, $5, $7::jsonb, $8, $6)
       on conflict (operation_id) do nothing returning number`, [o.id, o.business_id, o.city_id, userId, reason, txt, JSON.stringify(items), wants]);
    if (!r.rows[0]) return no("Ya tienes una solicitud para este pedido.", "You already have a request for this order.");
    return { ok: true as const, numero: r.rows[0].number };
  });
}
/* La persona pide que To'Latino revise (después de la respuesta del negocio). */
export async function pedirRevisionAyuda(userId: string, numero: string): Promise<ResA> {
  return tx(async (c) => {
    const h = (await c.query<{ id: string; business_id: string; city_id: string }>(
      `update help_requests h set status = 'escalated', escalated_at = now(), escalated_by = 'user', updated_at = now() from operations o
        where o.id = h.operation_id and o.number = $1 and h.user_id = $2 and h.status = 'answered' returning h.id::text, h.business_id, h.city_id`, [numero, userId])).rows[0];
    if (!h) return no("Esta solicitud ya cambió. Actualiza la pantalla.", "This request already changed. Refresh the screen.");
    await c.query(`insert into queue_items (queue, subject_kind, subject_id, business_id, city_id, priority) select ${COLA_AYUDA_SQL}, 'help_request', $1, $2, $3, 'normal' on conflict do nothing`, [h.id, h.business_id, h.city_id]);
    return { ok: true as const };
  });
}

/* ── El negocio ── */
export async function ayudasNegocio(negocio: string) {
  await escalarVencidas();
  return (await db().query<Ayuda & { num: string; quien: string }>(
    `select ${COLS}, o.number as num, coalesce(u.first_name, 'Cliente') as quien from help_requests h join operations o on o.id = h.operation_id join users u on u.id = h.user_id
      where h.business_id = $1 and h.status = 'open' and o.kind = 'order' order by h.created_at limit 10`, [negocio])).rows;
}
export async function ayudaPanel(negocio: string, numero: string) {
  return (await db().query<Ayuda>(`select ${COLS} from help_requests h join operations o on o.id = h.operation_id where o.number = $1 and h.business_id = $2`, [numero, negocio])).rows[0] ?? null;
}
export async function responderAyuda(negocio: string, numero: string, texto: string, actorId: string): Promise<ResA> {
  const t = String(texto ?? "").trim();
  if (t.length < 5) return no("Escribe tu respuesta.", "Write your reply.");
  if (t.length > 500) return no("Máximo 500 letras.", "Up to 500 characters.");
  const r = await db().query(
    `update help_requests h set status = 'answered', reply = $3, reply_at = now(), reply_by = $4, updated_at = now() from operations o
      where o.id = h.operation_id and o.number = $1 and h.business_id = $2 and h.status = 'open'`, [numero, negocio, t, actorId]);
  return r.rowCount ? { ok: true } : no("Esta solicitud ya cambió (pasó a To'Latino o ya respondiste).", "This request already changed (it went to To'Latino or you already replied).");
}

/* ── 9n-4 · Reponer sin costo (LAUNCH L339): la solicitud que pide «Que me lo repongan» se contesta con un pedido NUEVO de $0 (pay_mode 'none')
   con los platos de la solicitud (o todo el pedido si no le llegó), del mismo negocio, a la misma dirección o para recoger, que sigue el flujo de
   siempre: entra aceptado a la cocina del negocio y, si es delivery, al Repartidor (su código, la oferta, la prueba). Una reposición por
   solicitud (help_requests.replacement_op_id es único); no cuenta para el tope de Free; el precio de cada plato queda en $0 (nada se cobra ni
   se devuelve: la devolución a la tarjeta es otro camino, «Devolver dinero» o «Resolver y devolver»). Lo hace el negocio (al responder, permiso
   «Hoy y pedidos») o el equipo de To'Latino (Colas, al resolver). Corre dentro de la transacción de quien llama. ── */
type NoA = { ok: false; msg: Bi };
export async function reponerEn(c: import("pg").PoolClient, x: { numero: string; negocio: string | null; texto: string; actorId: string; por: "business" | "admin" }): Promise<{ ok: true; nuevo: string; hid: string; biz: string; city: string } | NoA> {
  const t = String(x.texto ?? "").trim();
  if (t.length < 5) return no("Escribe tu respuesta.", "Write your reply.") as NoA;
  if (t.length > 500) return no("Máximo 500 letras.", "Up to 500 characters.") as NoA;
  const h = (await c.query<{ hid: string; status: string; reason: string; items: ItemAyuda[]; rep: string | null; op: string; biz: string; city: string; uid: string; mode: string; det: Record<string, unknown>; prep: number; test: boolean }>(
    `select h.id::text as hid, h.status, h.reason, h.items, h.replacement_op_id::text as rep, o.id::text as op, o.business_id as biz, o.city_id as city, o.user_id::text as uid,
            coalesce(o.mode, 'pickup') as mode, o.details as det, coalesce(d.prep_min, 20) as prep, o.is_test as test
       from help_requests h join operations o on o.id = h.operation_id left join delivery_settings d on d.business_id = o.business_id
      where o.number = $1 and o.kind = 'order' and ($2::text is null or h.business_id = $2) for update of h`, [x.numero, x.negocio])).rows[0];
  if (!h) return no("Esa solicitud no existe.", "That request does not exist.") as NoA;
  if (h.rep) return no("Este pedido ya se repuso.", "This order was already replaced.") as NoA;
  if (x.por === "business" ? h.status !== "open" : !["open", "answered", "escalated"].includes(h.status)) return no("Esta solicitud ya cambió. Actualiza la pantalla.", "This request already changed. Refresh the screen.") as NoA;
  if (!POR_PLATO.has(h.reason) && h.reason !== "nollego") return no("Eso no se repone: contesta con un mensaje.", "That is not replaced: reply with a message.") as NoA;
  // Los platos: los de la solicitud (hasta lo que se pidió) o, si no le llegó, todo el pedido. El precio, $0.
  const L = (await c.query<{ item: string | null; name: Bi; qty: number; options: unknown; nota: string | null }>(
    `select item_id::text as item, name, qty, options, instructions as nota from operation_lines where operation_id = $1::bigint order by id`, [h.op])).rows;
  const sel = h.reason === "nollego" || !h.items?.length ? L.map((l) => ({ l, q: l.qty }))
    : h.items.map((i) => { const l = L.find((y) => (y.name?.es ?? "") === i.n); return l ? { l, q: Math.max(1, Math.min(l.qty, Math.round(Number(i.q) || 1))) } : null; }).filter((z): z is { l: (typeof L)[number]; q: number } => !!z);
  if (!sel.length) return no("No encontramos esos platos en el pedido.", "We could not find those dishes in the order.") as NoA;
  const num = (await c.query<{ n: string }>(`select nextval('operations_order_seq')::text as n`)).rows[0]!.n;
  const delivery = h.mode === "delivery" && !!h.det?.to;
  const det = delivery ? { to: h.det.to, drop: h.det.drop ?? null, repone: x.numero } : { pickupNote: h.det?.pickupNote ?? null, address: h.det?.address ?? null, repone: x.numero };
  const nuevo = (await c.query<{ id: string }>(
    `insert into operations (number, kind, city_id, business_id, user_id, status, stage, mode, ready_at, customer_note, subtotal_cents, tax_cents, total_cents, pay_mode, respond_by,
                             confirmed_at, answered_at, free_quota_month, client_key, is_test, details, delivery_cents, tip_cents)
     values ($1, 'order', $2, $3, $4::uuid, 'confirmed', 'accepted', $5, now() + make_interval(mins => $6::int), $7, 0, 0, 0, 'none', now(), now(), now(), null, gen_random_uuid(), $8, $9::jsonb, 0, 0)
     returning id::text`,
    [num, h.city, h.biz, h.uid, delivery ? "delivery" : "pickup", h.prep, `Reposición sin costo del pedido #${x.numero}`, h.test, JSON.stringify(det)])).rows[0]!.id;
  for (const z of sel) await c.query(`insert into operation_lines (operation_id, item_id, name, qty, unit_price_cents, line_total_cents, tax_pct, options, instructions) values ($1::bigint, $2, $3::jsonb, $4, 0, 0, 0, $5::jsonb, $6)`,
    [nuevo, z.l.item, JSON.stringify(z.l.name), z.q, JSON.stringify(z.l.options ?? []), z.l.nota]);
  const ev = (op: string, kind: string, note: Bi) => c.query(`insert into operation_events (operation_id, kind, actor, actor_id, note) values ($1::bigint, $2, $3, $4, $5::jsonb)`, [op, kind, x.por === "admin" ? "admin" : "member", x.actorId, JSON.stringify(note)]);
  await ev(nuevo, "accepted", { es: `Reposición sin costo del pedido #${x.numero}`, en: `Free replacement of order #${x.numero}` });
  await ev(h.op, "replaced", { es: `Se repone sin costo: pedido #${num}`, en: `Replaced at no cost: order #${num}` });
  const u = await c.query(x.por === "business"
    ? `update help_requests set status = 'answered', reply = $2, reply_at = now(), reply_by = $3, replacement_op_id = $4::bigint, updated_at = now() where id = $1::bigint and status = 'open' and replacement_op_id is null`
    : `update help_requests set replacement_op_id = $4::bigint, updated_at = now() where id = $1::bigint and replacement_op_id is null and $2::text is not null and $3::uuid is not null`, [h.hid, t, x.actorId, nuevo]);
  if (!u.rowCount) return no("Esta solicitud ya cambió. Actualiza la pantalla.", "This request already changed. Refresh the screen.") as NoA;
  return { ok: true, nuevo: num, hid: h.hid, biz: h.biz, city: h.city };
}
/* El negocio responde «Te lo reponemos» (Panel › el pedido › Ayuda). */
export async function reponerPedido(negocio: string, numero: string, texto: string, actorId: string): Promise<ResA & { nuevo?: string }> {
  if (!/^\d{1,12}$/.test(numero)) return no("Ese pedido no existe.", "That order does not exist.");
  return tx(async (c) => { const r = await reponerEn(c, { numero, negocio, texto, actorId, por: "business" }); return r.ok ? { ok: true as const, numero, nuevo: r.nuevo } : r; });
}
/* El aviso al cliente con el enlace al pedido nuevo. */
export async function avisarRepuesto(numeroNuevo: string) {
  const o = (await db().query<{ uid: string; negocio: string; de: string | null }>(
    `select o.user_id::text as uid, b.name as negocio, o.details->>'repone' as de from operations o join businesses b on b.id = o.business_id where o.number = $1 and o.kind = 'order'`, [numeroNuevo])).rows[0];
  if (!o) return;
  await (await import("./avisos")).avisar(o.uid, "pedido_repuesto", { negocio: o.negocio, num: numeroNuevo, de: o.de ?? "" }, { href: `/pedido/${numeroNuevo}`, ref: ["order", numeroNuevo] });
}

/* Avisos de la ayuda: al cliente cuando responden o se resuelve; al negocio cuando se abre. */
export async function avisarAyuda(numeroPedido: string, tpl: "help_reply" | "help_done" | "biz_help") {
  const { avisar, avisarNegocio } = await import("./avisos");
  const h = (await db().query<{ uid: string; hnum: string; negocio: string; biz: string; cliente: string | null }>(
    `select h.user_id::text as uid, h.number as hnum, b.name as negocio, b.id as biz, u.first_name as cliente from help_requests h join operations o on o.id = h.operation_id join businesses b on b.id = h.business_id join users u on u.id = h.user_id where o.number = $1`, [numeroPedido])).rows[0];
  if (!h) return;
  // 9n-5 · {horas}/{hours}: el plazo del negocio (Configuración · ayuda_negocio_h), para la plantilla que lo diga con el valor.
  const ph = tpl === "biz_help" ? await valor("ayuda_negocio_h") : 0;
  if (tpl === "biz_help") await avisarNegocio(h.biz, "biz_help", { cliente: h.cliente ?? "", num: numeroPedido, horas: horasTxt(ph, true), hours: horasTxt(ph, false) }, { href: `/panel/${h.biz}/hoy?det=ped:${numeroPedido}`, ref: ["help", h.hnum] });
  else await avisar(h.uid, tpl, { negocio: h.negocio, num: h.hnum }, { href: `/pedido/${numeroPedido}`, ref: ["help", h.hnum] });
}
