import "server-only";
import { db, tx } from "./db";
import { devolverPago } from "./cobros";
import { escalarVencidas } from "./ayuda";

/* Ayuda con la cita (diseño neg-cita-help.js · TLCitaHelp bhelp: APP-NEG-CITA-AYUDA y su -ESTADO). La misma solicitud que
   los pedidos (help_requests, una por operación), con los motivos de Belleza. Regla A7: el negocio responde en 24 h
   (acepta, propone un monto o no puede); si no responde, o la persona no está de acuerdo, To'Latino revisa en 48 h.
   Lo que vuelve a la tarjeta sale del depósito pagado en la app (Stripe); lo pagado en el local se arregla en el local. */
type Bi = { es: string; en: string };
export type MotivoCita = "cobro" | "quien" | "quedo" | "espera" | "dep" | "otro" | "win" | "more" | "bad" | "dmg" | "who" | "tarde" | "igual" | "dano" | "piezas";
export type RubroAyuda = "belleza" | "auto" | "hogar";
/* Los motivos de cada rubro (Belleza: bhelp · Auto: ahelp · Hogar: neg-hogar-rev.js RSN). */
export const MOTIVOS: Record<RubroAyuda, MotivoCita[]> = { belleza: ["cobro", "quien", "quedo", "espera", "dep", "otro"], auto: ["cobro", "tarde", "igual", "dano", "piezas", "dep", "otro"], hogar: ["win", "more", "bad", "dmg", "who", "dep", "otro"] };
export const MOTIVOS_CITA: MotivoCita[] = MOTIVOS.belleza;
/* Los que piden foto (diseño: RSN[3] = 1; Hogar: needPh = quedó mal o dañó algo). */
export const CON_FOTO = new Set<MotivoCita>(["cobro", "quedo", "bad", "dmg", "dano"]);
const rubroDeCat = (cat: string): RubroAyuda => (cat === "NEG-AUTO" ? "auto" : cat === "NEG-HOGAR" ? "hogar" : "belleza");
/* Si la cita no se dio (cancelada, vencida o no llegó), solo cabe el depósito u otra cosa. */
export const SIN_CITA = new Set<MotivoCita>(["dep", "otro"]);
export type QuiereCita = "corr" | "rev" | "avis";
const Q2W: Record<QuiereCita, "reponer" | "devolver" | "avisar"> = { corr: "reponer", rev: "devolver", avis: "avisar" };
export const W2Q: Record<string, QuiereCita> = { reponer: "corr", devolver: "rev", avisar: "avis" };
export type ResC = { ok: true; numero?: string; mensaje?: Bi } | { ok: false; msg: Bi };
const no = (es: string, en: string): ResC => ({ ok: false, msg: { es, en } });
const ISO = (x: string) => `to_char((${x}) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;
const money = (c: number) => (c % 100 === 0 ? `$${c / 100}` : `$${(c / 100).toFixed(2)}`);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const NUM = /^C-\d{1,10}$/;

export type AyudaCita = {
  id: string; number: string; reason: MotivoCita; wants: QuiereCita; body: string; amount: number | null; status: "open" | "answered" | "escalated" | "resolved";
  decision: "ok" | "alt" | "no" | null; offer: number | null; reply: string | null; replyAt: string | null; resolution: string | null; resolvedAt: string | null;
  refunded: number; closedBy: "user" | "admin" | null; porUsuario: boolean; at: string; vence: string; fotos: string[];
};
const COLS = `h.id::text, h.number, h.reason, h.wants, coalesce(h.body, '') as body, h.amount_cents as amount, h.status, h.decision, h.offer_cents as offer, h.reply, ${ISO("h.reply_at")} as "replyAt",
  h.resolution, ${ISO("h.resolved_at")} as "resolvedAt", h.refunded_cents as refunded, h.closed_by as "closedBy", coalesce(h.escalated_by = 'user', false) as "porUsuario",
  ${ISO("h.created_at")} as at, ${ISO("h.created_at + interval '24 hours'")} as vence,
  array(select m.url from media m where m.owner_kind = 'help' and m.owner_id = h.id::text and m.status = 'visible' order by m.sort) as fotos`;
const fila = (x: Omit<AyudaCita, "wants"> & { wants: string }): AyudaCita => ({ ...x, wants: W2Q[x.wants] ?? "avis" });

/* Lo que se puede devolver a la tarjeta: el depósito cobrado en la app, menos lo ya devuelto. */
async function depositoDe(opId: string) {
  // El cobro con más por devolver (Belleza: el depósito; Auto y Hogar: también estimado, «algo más» y visita).
  return (await db().query<{ id: string; amount: number; refunded: number; status: string; brand: string | null; l4: string | null }>(
    `select id::text, amount_cents as amount, refunded_cents as refunded, status, card_brand as brand, card_last4 as l4 from payments
      where operation_id = $1::bigint and kind in ('deposit', 'estimate', 'extra', 'visit', 'full')
      order by (status in ('captured', 'partially_refunded')) desc, amount_cents - refunded_cents desc, id desc limit 1`, [opId])).rows[0] ?? null;
}
const devolvible = (p: Awaited<ReturnType<typeof depositoDe>>) => (p && ["captured", "partially_refunded"].includes(p.status) ? p.amount - p.refunded : 0);
const tarjetaL = (p: { brand: string | null; l4: string | null } | null) => (p?.l4 ? `${({ visa: "Visa", mastercard: "Mastercard", mc: "Mastercard", amex: "Amex", discover: "Discover", disc: "Discover" } as Record<string, string>)[p.brand ?? ""] ?? "Tarjeta"} ·· ${p.l4}` : null);

/* ── La persona ── */
export type CitaAyudaVista = { rubro: RubroAyuda; puede: boolean; hecho: boolean; motivo: string | null; a: AyudaCita | null; depPagado: number; devolvible: number; tarjeta: string | null };
export async function ayudaDeCita(userId: string, numero: string): Promise<CitaAyudaVista | null> {
  if (!NUM.test(numero)) return null;
  await escalarVencidas();
  const o = (await db().query<{ id: string; status: string; reciente: boolean; cat: string }>(
    `select o.id::text, case when o.status_detail = 'noshow' then 'noshow' else o.status end as status, coalesce(o.done_at, o.updated_at) > now() - interval '7 days' as reciente, b.category_id as cat
       from operations o join businesses b on b.id = o.business_id where o.number = $1 and o.user_id = $2 and o.kind = 'appointment'`, [numero, userId])).rows[0];
  if (!o) return null;
  const a = (await db().query<Parameters<typeof fila>[0]>(`select ${COLS} from help_requests h where h.operation_id = $1::bigint and h.user_id = $2`, [o.id, userId])).rows[0];
  const p = await depositoDe(o.id), hecho = o.status === "done";
  const conDep = !!p && p.status !== "failed";
  // Terminada: hasta 7 días. Sin darse: solo si hubo depósito (para reclamarlo), también hasta 7 días.
  const motivo = !o.reciente ? "tarde" : hecho ? null : ["cancelled", "expired", "declined", "noshow"].includes(o.status) && conDep ? null : "aun";
  return { rubro: rubroDeCat(o.cat), puede: !motivo && !a, hecho, motivo, a: a ? fila(a) : null, depPagado: p && ["captured", "partially_refunded", "refunded"].includes(p.status) ? p.amount : 0, devolvible: devolvible(p), tarjeta: tarjetaL(p) };
}

export type AyudaCitaIn = { reason: string; wants?: string; body?: string; amount?: string | number | null; fotos?: string[] };
export async function pedirAyudaCita(userId: string, numero: string, p: AyudaCitaIn): Promise<ResC> {
  if (!NUM.test(numero)) return no("Esa cita no existe.", "That booking does not exist.");
  const reason = String(p?.reason ?? "") as MotivoCita;
  const cat = (await db().query<{ cat: string }>(`select b.category_id as cat from operations o join businesses b on b.id = o.business_id where o.number = $1`, [numero])).rows[0]?.cat ?? "";
  if (!MOTIVOS[rubroDeCat(cat)].includes(reason)) return no("Elige qué pasó.", "Pick what happened.");
  const body = String(p?.body ?? "").trim().slice(0, 500);
  if (body.length < 15) return no("Cuéntanos qué pasó (15 letras o más).", "Tell us what happened (15+ characters).");
  const q = (["corr", "rev", "avis"].includes(String(p?.wants)) ? String(p.wants) : "corr") as QuiereCita;
  const cents = p?.amount == null || p.amount === "" ? null : Math.round((parseFloat(String(p.amount).replace(/[^0-9.]/g, "")) || 0) * 100);
  if (cents !== null && !(cents > 0 && cents <= 1000000)) return no("Escribe el monto en dólares.", "Write the amount in dollars.");
  const fotos = Array.isArray(p?.fotos) ? [...new Set(p.fotos.map(String).filter((x) => UUID.test(x)))] : [];
  if (fotos.length > 4) return no("Hasta 4 fotos.", "Up to 4 photos.");
  if (CON_FOTO.has(reason) && !fotos.length) return no("Agrega una foto.", "Add a photo.");
  const r = await tx(async (c): Promise<ResC> => {
    const o = (await c.query<{ id: string; business_id: string; city_id: string; status: string; ok: boolean; dep: boolean }>(
      `select o.id::text, o.business_id, o.city_id, case when o.status_detail = 'noshow' then 'noshow' else o.status end as status, coalesce(o.done_at, o.updated_at) > now() - interval '7 days' as ok,
              exists (select 1 from payments p where p.operation_id = o.id and p.kind = 'deposit' and p.status <> 'failed') as dep
         from operations o where o.number = $1 and o.user_id = $2 and o.kind = 'appointment' for update`, [numero, userId])).rows[0];
    if (!o) return no("Esa cita no existe.", "That booking does not exist.");
    if (!o.ok) return no("La ayuda con una cita se pide hasta 7 días después.", "Booking help can be asked up to 7 days after.");
    const dada = o.status === "done", sinDar = ["cancelled", "expired", "declined", "noshow"].includes(o.status) && o.dep;
    if (!dada && !sinDar) return no("La ayuda se pide cuando la cita ya pasó.", "Help can be asked once the booking is over.");
    if (!dada && !SIN_CITA.has(reason)) return no("Esta cita no se dio: solo puedes preguntar por el depósito u otra cosa.", "This booking did not happen: you can only ask about the deposit or something else.");
    const n = (await c.query<{ n: number }>(`select count(*)::int as n from help_requests where user_id = $1 and created_at > now() - interval '1 day'`, [userId])).rows[0]!.n;
    if (n >= 5) return no("Abriste muchas solicitudes hoy. Prueba mañana.", "You opened many requests today. Try tomorrow.");
    const h = (await c.query<{ id: string; number: string }>(
      `insert into help_requests (number, operation_id, business_id, city_id, user_id, reason, wants, body, amount_cents)
       values ('H-' || nextval('help_request_number_seq'), $1, $2, $3, $4, $5, $6, $7, $8) on conflict (operation_id) do nothing returning id::text, number`,
      [o.id, o.business_id, o.city_id, userId, reason, Q2W[q], body, cents])).rows[0];
    if (!h) return no("Ya tienes una solicitud para esta cita.", "You already have a request for this booking.");
    if (fotos.length) {
      const ok = await c.query(`update media set owner_kind = 'help', owner_id = $1, sort = array_position($3::uuid[], id)
                                 where id = any($3::uuid[]) and uploaded_by = $2 and owner_kind = 'user' and status = 'visible'`, [h.id, userId, fotos]);
      if (ok.rowCount !== fotos.length) throw new FotoPerdida();
    }
    return { ok: true, numero: h.number };
  }).catch((e) => { if (e instanceof FotoPerdida) return no("Una de las fotos ya no está. Súbela otra vez.", "One of the photos is gone. Upload it again."); throw e; });
  if (r.ok) await avisarAyudaCita(numero, "biz_help_cita");
  return r;
}
class FotoPerdida extends Error {}

/* La persona responde a lo que dijo el negocio: «Entendido» (aceptó), aceptar la propuesta (se devuelve lo propuesto)
   o pedir que To'Latino revise (no pudo, o no le sirve la propuesta). */
export async function citaAyudaCliente(userId: string, numero: string, accion: "entendido" | "aceptar" | "revisar", clave: string): Promise<ResC> {
  if (!NUM.test(numero)) return no("Esa cita no existe.", "That booking does not exist.");
  const h = (await db().query<{ id: string; op: string; status: string; decision: string | null; offer: number | null; reply_by: string | null; business_id: string; city_id: string }>(
    `select h.id::text, h.operation_id::text as op, h.status, h.decision, h.offer_cents as offer, h.reply_by::text, h.business_id, h.city_id
       from help_requests h join operations o on o.id = h.operation_id where o.number = $1 and o.kind = 'appointment' and h.user_id = $2`, [numero, userId])).rows[0];
  if (!h) return no("Esa solicitud no existe.", "That request does not exist.");
  const cambio = () => no("Esta solicitud ya cambió. Actualiza la pantalla.", "This request already changed. Refresh the screen.");
  if (h.status !== "answered") return cambio();
  if (accion === "entendido") {
    if (h.decision !== "ok") return cambio();
    const r = await db().query(`update help_requests set status = 'resolved', closed_by = 'user', resolved_at = now(), updated_at = now() where id = $1::bigint and status = 'answered'`, [h.id]);
    return r.rowCount ? { ok: true } : cambio();
  }
  if (accion === "aceptar") {
    if (h.decision !== "alt") return cambio();
    if (!/^[0-9a-f-]{36}$/.test(String(clave ?? ""))) return no("Prueba de nuevo.", "Try again.");
    let devuelto = 0;
    const p = await depositoDe(h.op), maxi = devolvible(p);
    if (h.offer && h.offer > 0 && p && maxi > 0) {
      const n = Math.min(h.offer, maxi);
      const d = await devolverPago({ paymentId: p.id, centavos: n, por: "business", actorId: h.reply_by, motivo: "Ayuda con la cita: propuesta aceptada", idem: `ayc-${h.id}` });
      if (!d.ok) return { ok: false, msg: d.msg };
      devuelto = n;
    }
    const r = await db().query(`update help_requests set status = 'resolved', closed_by = 'user', refunded_cents = refunded_cents + $2, resolved_at = now(), updated_at = now() where id = $1::bigint and status = 'answered'`, [h.id, devuelto]);
    return r.rowCount ? { ok: true, mensaje: devuelto ? { es: `Te devolvemos ${money(devuelto)} a tu tarjeta.`, en: `Refunding ${money(devuelto)} to your card.` } : undefined } : cambio();
  }
  if (h.decision !== "alt" && h.decision !== "no") return cambio();
  const ok = await tx(async (c) => {
    const u = await c.query(`update help_requests set status = 'escalated', escalated_at = now(), escalated_by = 'user', updated_at = now() where id = $1::bigint and status = 'answered'`, [h.id]);
    if (!u.rowCount) return false;
    await c.query(`insert into queue_items (queue, subject_kind, subject_id, business_id, city_id, priority) values ('sop', 'help_request', $1, $2, $3, 'normal') on conflict do nothing`, [h.id, h.business_id, h.city_id]);
    return true;
  });
  if (!ok) return cambio();
  await avisarAyudaCita(numero, "biz_help_rev");
  return { ok: true };
}

/* ── El negocio ── */
export type AyudaCitaPanel = AyudaCita & { devolvible: number; tarjeta: string | null };
export async function ayudaCitaPanel(negocio: string, numero: string): Promise<AyudaCitaPanel | null> {
  if (!NUM.test(numero)) return null;
  await escalarVencidas();
  const r = (await db().query<Parameters<typeof fila>[0] & { op: string }>(
    `select ${COLS}, h.operation_id::text as op from help_requests h join operations o on o.id = h.operation_id where o.number = $1 and o.kind = 'appointment' and h.business_id = $2`, [numero, negocio])).rows[0];
  if (!r) return null;
  const p = await depositoDe(r.op);
  return { ...fila(r), devolvible: devolvible(p), tarjeta: tarjetaL(p) };
}
/* Responder: ok (acepta lo que pide; si pide que le devuelvan y pagó el depósito en la app, se devuelve ya),
   alt (propone un monto; se devuelve cuando la persona acepta) o no (no puede; la persona puede pedir revisión).
   Devolver dinero pide el permiso de Cobros (`pagar`). */
export async function responderAyudaCita(negocio: string, numero: string, x: { decision: string; texto: string; monto?: string | null; clave: string }, actorId: string, pagar: boolean): Promise<ResC> {
  if (!NUM.test(numero)) return no("Esa cita no existe.", "That booking does not exist.");
  const dec = String(x?.decision ?? "");
  if (!["ok", "alt", "no"].includes(dec)) return no("Elige tu respuesta.", "Pick your answer.");
  const t = String(x?.texto ?? "").trim();
  if (t.length < 5) return no("Escribe tu respuesta.", "Write your reply.");
  if (t.length > 500) return no("Máximo 500 letras.", "Up to 500 characters.");
  if (!/^[0-9a-f-]{36}$/.test(String(x?.clave ?? ""))) return no("Prueba de nuevo.", "Try again.");
  const h = (await db().query<{ id: string; op: string; wants: string; amount: number | null; status: string }>(
    `select h.id::text, h.operation_id::text as op, h.wants, h.amount_cents as amount, h.status from help_requests h join operations o on o.id = h.operation_id
      where o.number = $1 and o.kind = 'appointment' and h.business_id = $2`, [numero, negocio])).rows[0];
  if (!h || h.status !== "open") return no("Esta solicitud ya cambió (pasó a To'Latino o ya respondiste).", "This request already changed (it went to To'Latino or you already replied).");
  const p = await depositoDe(h.op), maxi = devolvible(p);
  const pedido = x.monto == null || x.monto === "" ? null : Math.round((parseFloat(String(x.monto).replace(/[^0-9.]/g, "")) || 0) * 100);
  let offer: number | null = null, devolver = 0;
  if (dec === "alt") {
    if (!pedido || pedido <= 0) return no("Escribe cuánto le propones devolver.", "Write how much you propose to refund.");
    if (maxi > 0 && pedido > maxi) return no(`A su tarjeta puedes devolver hasta ${money(maxi)} (el depósito). Lo demás, en el local.`, `You can refund up to ${money(maxi)} to their card (the deposit). The rest, at the shop.`);
    if (maxi > 0 && !pagar) return no("Solo el dueño puede devolver dinero.", "Only the owner can refund money.");
    offer = pedido;
  }
  if (dec === "ok" && h.wants === "devolver" && maxi > 0) {
    if (!pagar) return no("Solo el dueño puede devolver dinero.", "Only the owner can refund money.");
    devolver = Math.min(maxi, pedido ?? h.amount ?? maxi);
    if (devolver <= 0) return no("Escribe cuánto le devuelves.", "Write how much you refund.");
    offer = devolver;
  } else if (dec === "ok" && h.wants === "devolver") offer = pedido ?? h.amount ?? null;
  // Primero se marca respondida (nadie más responde a la vez); luego, si toca, la devolución (idempotente por clave).
  const u = await db().query(
    `update help_requests set status = 'answered', decision = $3, offer_cents = $4, reply = $5, reply_at = now(), reply_by = $6, updated_at = now()
      where id = $1::bigint and business_id = $2 and status = 'open'`, [h.id, negocio, dec, offer, t, actorId]);
  if (!u.rowCount) return no("Esta solicitud ya cambió (pasó a To'Latino o ya respondiste).", "This request already changed (it went to To'Latino or you already replied).");
  if (devolver > 0 && p) {
    const d = await devolverPago({ paymentId: p.id, centavos: devolver, por: "business", actorId, motivo: `Ayuda con la cita: ${t.slice(0, 200)}`, idem: `ayb-${x.clave}` });
    if (!d.ok) {
      await db().query(`update help_requests set status = 'open', decision = null, offer_cents = null, reply = null, reply_at = null, reply_by = null, updated_at = now() where id = $1::bigint and status = 'answered'`, [h.id]);
      return { ok: false, msg: d.msg };
    }
    await db().query(`update help_requests set refunded_cents = refunded_cents + $2 where id = $1::bigint`, [h.id, devolver]);
  }
  await avisarAyudaCita(numero, "help_reply");
  return { ok: true, mensaje: devolver ? { es: `Respondida. Le devolvimos ${money(devolver)} a su tarjeta.`, en: `Replied. We refunded ${money(devolver)} to their card.` } : undefined };
}

/* Hoy · «Ayuda con citas»: las que esperan respuesta (24 h). */
export async function ayudasCitasNegocio(negocio: string) {
  await escalarVencidas();
  return (await db().query<{ num: string; quien: string; reason: MotivoCita; vence: string }>(
    `select o.number as num, coalesce(u.first_name, 'Cliente') as quien, h.reason, ${ISO("h.created_at + interval '24 hours'")} as vence
       from help_requests h join operations o on o.id = h.operation_id join users u on u.id = h.user_id
      where h.business_id = $1 and h.status = 'open' and o.kind = 'appointment' order by h.created_at limit 10`, [negocio])).rows;
}

/* Avisos de la ayuda con una cita (enlace a su solicitud o al detalle en el panel). */
export async function avisarAyudaCita(numero: string, tpl: "help_reply" | "help_done" | "biz_help_cita" | "biz_help_rev") {
  const { avisar, avisarNegocio } = await import("./avisos");
  const h = (await db().query<{ uid: string; hnum: string; negocio: string; biz: string; cliente: string | null }>(
    `select h.user_id::text as uid, h.number as hnum, b.name as negocio, b.id as biz, u.first_name as cliente from help_requests h join operations o on o.id = h.operation_id
       join businesses b on b.id = h.business_id join users u on u.id = h.user_id where o.number = $1 and o.kind = 'appointment'`, [numero])).rows[0];
  if (!h) return;
  if (tpl === "biz_help_cita" || tpl === "biz_help_rev") await avisarNegocio(h.biz, tpl, { cliente: h.cliente ?? "", num: tpl === "biz_help_cita" ? numero : h.hnum }, { href: `/panel/${h.biz}/hoy?det=cita:${numero}`, ref: ["help", h.hnum] });
  else await avisar(h.uid, tpl, { negocio: h.negocio, num: h.hnum }, { href: `/cita/${numero}/ayuda`, ref: ["help", h.hnum] });
}
