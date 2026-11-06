import "server-only";
import type { PoolClient } from "pg";
import { db, tx } from "./db";
import { comision } from "./cobros";
import { pasarela } from "./pagos/pasarela";

/* Estimado / precio completo línea por línea y «algo más» (Fase 4 · bloque 4d). Diseño: neg-auto-flow.js y
   neg-hogar-flow.js (citaVals › est, xtra, ready, done; totals). Plan: docs/diseno/plan/fase4-hogar-auto.md §3 y §4d.
   Reglas que no se apagan:
   - Nada se hace ni se cobra sin el OK del cliente: se retiene SOLO lo aprobado (cada aprobación retiene lo que falta).
   - Los montos de cada línea los calcula la base (mano de obra = horas × tarifa del panel; impuesto según tax_rules).
   - Lo final nunca sube: al terminar, cada línea puede bajar (la pieza salió más barata) y se libera la diferencia.
   - Al liquidar: lo final menos el depósito se reparte entre las retenciones vivas (estimado → algo más); lo que sobra se
     libera. Si el negocio no cobra con tarjeta, nada se retiene y el total se paga en el local.
   - Todo dentro del candado de la cita del negocio; cada movimiento de dinero es idempotente y deja su evento. */
type Q = PoolClient | ReturnType<typeof db>;
type Bi = { es: string; en: string };
type Res<T = object> = ({ ok: true } & T) | { ok: false; msg: Bi; tarjeta?: boolean };
const no = (es: string, en: string, x: { tarjeta?: boolean } = {}): { ok: false; msg: Bi; tarjeta?: boolean } => ({ ok: false, msg: { es, en }, ...x });
const NUM = /^C-\d{1,10}$/;
const money = (c: number) => `$${(c / 100).toFixed(2).replace(/\.00$/, "")}`;
const ev = (c: Q, op: string, kind: string, actor: "user" | "member" | "system", actorId: string | null, note?: Bi) =>
  c.query(`insert into operation_events (operation_id, kind, actor, actor_id, note) values ($1::bigint, $2, $3, $4, $5::jsonb)`, [op, kind, actor, actorId, note ? JSON.stringify(note) : null]);

/* ¿A qué cuenta va el dinero de la cita? La cuenta de cobro del negocio con cargos habilitados (como el depósito de
   citas.ts: una simulada solo en el sandbox; una real, solo con la clave de Stripe). Sin cuenta, todo se paga en el local. */
async function tarjetaDe(negocio: string): Promise<{ on: boolean; cuenta: string | null }> {
  const a = (await db().query<{ acct: string }>(`select stripe_account_id as acct from stripe_accounts where business_id = $1 and charges_enabled`, [negocio])).rows[0]?.acct ?? null;
  const modo = pasarela.modo(), ok = !!a && modo !== "apagado" && a.startsWith("acct_sim_") === (modo === "simulador");
  return { on: ok, cuenta: ok ? a : null };
}

/* Servicios que llevan estimado (en el diseño, isEstK): el resto tiene precio cerrado y solo admite «algo más». */
const EST_K: Record<string, string[]> = { auto: ["diag", "desde", "cotiza"], hogar: ["visita", "pres", "hora", "area"] };
export const conEstimado = (rubro: string | null | undefined, k: string | null | undefined) => !!rubro && !!k && (EST_K[rubro] ?? []).includes(k);

type Op = { id: string; numero: string; biz: string; city: string; cat: string; uid: string; status: string; detail: string | null; det: { rubro?: string; svcId?: string } | null; sub: number; k: string | null; a: { cred?: boolean; free?: boolean } | null };
const SEL = `select o.id::text, o.number as numero, o.business_id as biz, o.city_id as city, b.category_id as cat, o.user_id::text as uid, o.status, o.status_detail as detail, o.details as det,
                    o.subtotal_cents as sub, i.svc_kind as k, i.svc_attrs as a
               from operations o join businesses b on b.id = o.business_id left join items i on i.id::text = o.details->>'svcId'
              where o.kind = 'appointment'`;

/* Lo reservado que cuenta y lo que se descuenta si aprueba algo (diseño totals): diagnóstico y visita se cobran (y se
   descuentan si el servicio lo dice); «desde», «se cotiza», por hora y por medida los reemplaza el estimado; un precio
   cerrado cuenta completo. */
function regla(o: Op): { base: number; credit: number } {
  const r = o.det?.rubro, k = o.k ?? "fijo", a = o.a ?? {};
  if (r === "auto" && (k === "desde" || k === "cotiza")) return { base: 0, credit: 0 };
  if (r === "hogar" && (k === "hora" || k === "area")) return { base: 0, credit: 0 };
  if (k === "diag" || k === "visita") return { base: o.sub, credit: a.cred || a.free ? o.sub : 0 };
  return { base: o.sub, credit: 0 };
}

/* ── Lo que se muestra (cliente, panel, admin) ── */
export type LineaEst = { id: string; urg: "now" | "soon" | "later"; t: Bi; why: Bi; parts: { n: Bi; cents: number }[]; partsC: number; hrs: number; lab: number; tax: number; tot: number; final: number | null; foto: string | null; fotoId: string | null; extra: boolean; dec: "ok" | "no" | null };
export type Estimado = { v: number; st: "sent" | "answered" | "superseded"; rate: number; partsBp: number; base: number; credit: number; at: string; by: string | null; lineas: LineaEst[]; versiones: number };
export type PagoCita = { kind: string; seq: number; st: string; retenido: number; cobrado: number; tarjeta: string | null };
export type DineroCita = {
  tarjeta: boolean;          // el negocio cobra con tarjeta en la app (si no, todo se paga en el local)
  base: number; credito: number; aprobado: number; final: number; dep: number;
  objetivo: number;          // lo aprobado que falta pagar (base + aprobado − crédito − depósito)
  retenido: number; cobrado: number; liberado: number; local: number; pagos: PagoCita[];
};
export type EstadoEstimado = { estimado: Estimado | null; extras: LineaEst[]; dinero: DineroCita; conEst: boolean };

async function lineas(c: Q, opId: string, estId: string | null): Promise<LineaEst[]> {
  return (await c.query<LineaEst>(
    `select l.id::text, l.urgency as urg, l.title as t, l.why, l.parts, l.parts_cents as "partsC", l.labor_hours::float as hrs, l.labor_cents as lab, l.tax_cents as tax, l.line_total_cents as tot,
            l.final_cents as final, m.url as foto, l.photo_id::text as "fotoId", l.is_extra as extra, l.decision as dec
       from estimate_lines l left join media m on m.id = l.photo_id and m.status = 'visible'
      where l.operation_id = $1::bigint and ${estId ? "l.estimate_id = $2::bigint and not l.is_extra" : "l.is_extra"} order by l.sort, l.id`, estId ? [opId, estId] : [opId])).rows;
}

export async function estadoEstimado(c: Q, opId: string): Promise<EstadoEstimado> {
  const o = (await c.query<Op>(`${SEL} and o.id = $1::bigint`, [opId])).rows[0];
  if (!o) throw new Error("operación");
  const e = (await c.query<{ id: string; v: number; st: Estimado["st"]; rate: number; pbp: number; base: number; credit: number; at: string; by: string | null; n: number }>(
    `select e.id::text, e.version as v, e.status as st, e.labor_rate_cents as rate, e.parts_tax_bp as pbp, e.base_cents as base, e.credit_cents as credit, e.sent_at as at, m.display_name as by,
            (select count(*)::int from estimates where operation_id = e.operation_id) as n
       from estimates e left join business_members m on m.id = e.created_by
      where e.operation_id = $1::bigint and e.status <> 'superseded' order by e.version desc limit 1`, [opId])).rows[0];
  const L = e ? await lineas(c, opId, e.id) : [];
  const X = await lineas(c, opId, null);
  const est: Estimado | null = e && L.length ? { v: e.v, st: e.st, rate: e.rate, partsBp: e.pbp, base: e.base, credit: e.credit, at: e.at, by: e.by, lineas: L, versiones: e.n } : null;
  return { estimado: est, extras: X, dinero: await dineroDe(c, o, e ? { base: e.base, credit: e.credit } : regla(o), [...L, ...X]), conEst: conEstimado(o.det?.rubro, o.k) };
}

async function dineroDe(c: Q, o: Op, r: { base: number; credit: number }, L: LineaEst[]): Promise<DineroCita> {
  const P = (await c.query<{ kind: string; seq: number; st: string; held: number | null; amount: number; refunded: number; l4: string | null; brand: string | null }>(
    `select kind, seq, status as st, held_cents as held, amount_cents as amount, refunded_cents as refunded, card_last4 as l4, card_brand as brand
       from payments where operation_id = $1::bigint order by created_at, id`, [o.id])).rows;
  const ap = L.filter((l) => l.dec === "ok"), regulares = ap.filter((l) => !l.extra);
  const credito = regulares.length ? r.credit : 0;
  const aprobado = ap.reduce((n, l) => n + l.tot, 0), final = r.base - credito + ap.reduce((n, l) => n + (l.final ?? l.tot), 0);
  const dep = P.filter((p) => p.kind === "deposit" && ["captured", "partially_refunded"].includes(p.st)).reduce((n, p) => n + p.amount - p.refunded, 0);
  const vivos = P.filter((p) => ["estimate", "extra"].includes(p.kind));
  const retenido = vivos.filter((p) => p.st === "held").reduce((n, p) => n + (p.held ?? p.amount), 0);
  const cobrado = vivos.filter((p) => ["captured", "partially_refunded", "refunded"].includes(p.st)).reduce((n, p) => n + p.amount, 0);
  const liberado = vivos.reduce((n, p) => n + (p.st === "released" ? p.held ?? p.amount : ["captured", "partially_refunded", "refunded"].includes(p.st) ? Math.max(0, (p.held ?? p.amount) - p.amount) : 0), 0);
  const tarjeta = (await tarjetaDe(o.biz)).on;
  const objetivo = Math.max(0, r.base - credito + aprobado - dep);
  const local = o.status === "done" ? Math.max(0, final - dep - cobrado) : Math.max(0, objetivo - retenido - cobrado);
  return { tarjeta, base: r.base, credito, aprobado, final, dep, objetivo, retenido, cobrado, liberado, local,
    pagos: P.map((p) => ({ kind: p.kind, seq: p.seq, st: p.st, retenido: p.held ?? p.amount, cobrado: ["captured", "partially_refunded", "refunded"].includes(p.st) ? p.amount : 0, tarjeta: p.l4 ? `${p.brand ?? ""} ·· ${p.l4}` : null })) };
}

/* ── Retener lo que falta (dentro del candado). Devuelve el pago creado o un error de tarjeta. ── */
async function retenerFalta(c: PoolClient, o: Op, kind: "estimate" | "extra", seq: number, pm: string | null, falta: number): Promise<Res<{ pi: string | null }>> {
  if (falta <= 0) return { ok: true, pi: null };
  const t = await tarjetaDe(o.biz);
  if (!t.on || !t.cuenta) return { ok: true, pi: null };
  if (!pm || !/^pm_[A-Za-z0-9_]{3,200}$/.test(pm)) return no("Elige la tarjeta.", "Choose the card.", { tarjeta: true });
  const own = (await c.query(`select 1 from payment_methods where user_id = $1 and stripe_pm_id = $2 and status = 'active'`, [o.uid, pm])).rowCount;
  if (!own && pasarela.modo() !== "simulador") return no("Esa tarjeta no es tuya.", "That card is not yours.", { tarjeta: true });
  const fee = Math.min(await comision(c, "cita", falta), falta);
  const cliente = await pasarela.cliente(o.uid).catch(() => null);
  const r = await pasarela.retener({ centavos: falta, comision: fee, destino: t.cuenta, pm, cliente, idem: `${kind}-${o.id}-${seq}-${pm.slice(-24)}`, meta: { appointment: o.numero, business_id: o.biz, kind } });
  if (!r.ok) return no(r.mensaje.es, r.mensaje.en, { tarjeta: true });
  if (r.estado === "accion") { await pasarela.liberar(r.pi).catch(() => undefined); return no("Tu banco pide una verificación extra. Prueba con otra tarjeta.", "Your bank asks for an extra verification. Try another card.", { tarjeta: true }); }
  await c.query(
    `insert into payments (operation_id, user_id, business_id, city_id, kind, seq, method, stripe_payment_intent, amount_cents, held_cents, fee_cents, status, card_brand, card_last4, held_at, simulated, payment_method)
     values ($1::bigint, $2, $3, $4, $5, $6, 'card', $7, $8, $8, $9, 'held', $10, $11, now(), $12, $13)`,
    [o.id, o.uid, o.biz, o.city, kind, seq, r.pi, falta, fee, r.marca, r.ultimos4, r.pi.startsWith("pi_sim_"), pm]);
  await ev(c, o.id, "payment_held", "system", null, { es: `Se retuvieron ${money(falta)} en la tarjeta`, en: `${money(falta)} held on the card` });
  return { ok: true, pi: r.pi };
}
const vivoRetenido = async (c: Q, opId: string) => Number((await c.query<{ n: number }>(`select coalesce(sum(held_cents), 0)::int as n from payments where operation_id = $1::bigint and kind in ('estimate', 'extra') and status = 'held'`, [opId])).rows[0]!.n);

/* ── Validar las líneas que manda el negocio (el servidor decide; el cliente solo muestra) ── */
export type LineaIn = { urg: string; t: string; why: string; piezas: { n: string; cents: number }[]; horas: number; foto: string | null; tEn?: string; whyEn?: string; piezasEn?: string[] };
type LineaOk = { urg: "now" | "soon" | "later"; t: Bi; why: Bi; parts: { n: Bi; cents: number }[]; partsC: number; horas: number; foto: string | null };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
function limpiar(L: unknown, extra: boolean): LineaOk[] | Bi {
  if (!Array.isArray(L) || !L.length) return { es: "Agrega al menos una línea.", en: "Add at least one line." };
  if (L.length > 20) return { es: "Hasta 20 líneas por estimado.", en: "Up to 20 lines per estimate." };
  const out: LineaOk[] = [];
  for (const x of L as LineaIn[]) {
    const urg = extra ? "now" : x?.urg;
    if (!["now", "soon", "later"].includes(urg)) return { es: "Cada línea dice si es necesaria ahora, recomendada o puede esperar.", en: "Each line says if it is needed now, recommended or can wait." };
    const t = String(x.t ?? "").trim().replace(/\s+/g, " "), why = String(x.why ?? "").trim().replace(/\s+/g, " ");
    if (t.length < 2 || t.length > 90) return { es: "Cada línea lleva qué es (2 a 90 letras).", en: "Each line needs what it is (2 to 90 characters)." };
    if (why.length < 2 || why.length > 240) return { es: `«${t}»: di por qué hace falta (la medida o el código).`, en: `“${t}”: say why it is needed (the measurement or the code).` };
    const P = Array.isArray(x.piezas) ? x.piezas : [];
    if (P.length > 6) return { es: "Hasta 6 piezas o materiales por línea.", en: "Up to 6 parts or materials per line." };
    const parts = P.map((p, j) => ({ n: { es: String(p?.n ?? "").trim().slice(0, 60), en: String(x.piezasEn?.[j] ?? p?.n ?? "").trim().slice(0, 60) }, cents: Math.round(Number(p?.cents)) }));
    if (parts.some((p) => !p.n.es || !(p.cents >= 0) || p.cents > 2000000)) return { es: `«${t}»: cada pieza lleva nombre y precio.`, en: `“${t}”: each part needs a name and a price.` };
    const horas = Math.round(Number(x.horas) * 10) / 10;
    if (!(horas >= 0) || horas > 200) return { es: `«${t}»: las horas van de 0 a 200.`, en: `“${t}”: hours go from 0 to 200.` };
    const partsC = parts.reduce((n, p) => n + p.cents, 0);
    if (partsC + horas <= 0) return { es: `«${t}»: ponle precio (pieza o mano de obra).`, en: `“${t}”: give it a price (part or labor).` };
    const foto = typeof x.foto === "string" && UUID.test(x.foto) ? x.foto : null;
    if ((urg === "now" || extra) && !foto) return { es: `«${t}»: lo necesario ahora va con foto (el cliente la ve).`, en: `“${t}”: what is needed now goes with a photo (the client sees it).` };
    out.push({ urg: urg as LineaOk["urg"], t: { es: t, en: String(x.tEn ?? t).trim().slice(0, 90) || t }, why: { es: why, en: String(x.whyEn ?? why).trim().slice(0, 240) || why }, parts, partsC, horas, foto });
  }
  return out;
}

async function insertarLineas(c: PoolClient, o: Op, estId: string, L: LineaOk[], extra: boolean, actorId: string): Promise<boolean> {
  let i = Number((await c.query<{ n: number }>(`select coalesce(max(sort), -1)::int + 1 as n from estimate_lines where estimate_id = $1::bigint`, [estId])).rows[0]!.n);
  for (const l of L) {
    const id = (await c.query<{ id: string }>(
      `insert into estimate_lines (estimate_id, operation_id, sort, urgency, title, why, parts, parts_cents, labor_hours, photo_id, is_extra)
       values ($1::bigint, $2::bigint, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8, $9, $10::uuid, $11) returning id::text`,
      [estId, o.id, i++, l.urg, JSON.stringify(l.t), JSON.stringify(l.why), JSON.stringify(l.parts), l.partsC, l.horas, l.foto, extra])).rows[0]!.id;
    if (l.foto) {
      // La foto la subió quien arma el estimado y no está usada en otra cosa.
      const u = await c.query(`update media set owner_kind = 'estimate_line', owner_id = $1 where id = $2::uuid and uploaded_by = $3 and owner_kind = 'user' and status = 'visible'`, [id, l.foto, actorId]);
      // Una versión nueva del estimado puede reusar la foto de una línea anterior de la misma cita.
      if (!u.rowCount && !(await c.query(`select 1 from estimate_lines where photo_id = $1::uuid and operation_id = $2::bigint and id <> $3::bigint`, [l.foto, o.id, id])).rowCount) return false;
    }
  }
  return true;
}

async function abrir(c: PoolClient, negocio: string, numero: string, porCliente: string | null): Promise<Op | null> {
  await c.query(`select pg_advisory_xact_lock(hashtext('cita:' || $1))`, [negocio]);
  const o = (await c.query<Op>(`${SEL} and o.business_id = $1 and o.number = $2 ${porCliente ? "and o.user_id = $3" : ""} for update of o`, porCliente ? [negocio, numero, porCliente] : [negocio, numero])).rows[0] ?? null;
  return o && (o.det?.rubro === "auto" || o.det?.rubro === "hogar") ? o : null;
}
const YA = no("Esta cita ya cambió. Actualiza la pantalla.", "This booking already changed. Refresh the screen.");
const negocioDe = async (numero: string, userId: string) => (await db().query<{ b: string }>(`select business_id as b from operations where number = $1 and user_id = $2 and kind = 'appointment'`, [numero, userId])).rows[0]?.b ?? null;

async function avisarC(numero: string, tpl: string, v: Record<string, string>) {
  const d = (await db().query<{ uid: string; negocio: string }>(`select o.user_id::text as uid, b.name as negocio from operations o join businesses b on b.id = o.business_id where o.number = $1`, [numero])).rows[0];
  if (!d) return;
  await (await import("./avisos")).avisar(d.uid, tpl, { negocio: d.negocio, num: numero, ...v }, { href: `/cita/${numero}`, ref: ["appointment", numero] });
}
async function avisarN(numero: string, tpl: string, v: Record<string, string>) {
  const d = (await db().query<{ biz: string; cliente: string }>(`select o.business_id as biz, coalesce(u.first_name, '') as cliente from operations o join users u on u.id = o.user_id where o.number = $1`, [numero])).rows[0];
  if (!d) return;
  await (await import("./avisos")).avisarNegocio(d.biz, tpl, { cliente: d.cliente, num: numero, ...v }, { href: `/panel/${d.biz}/hoy?det=cita:${numero}`, ref: ["appointment", numero] });
}

/* ── El negocio manda el estimado (o una versión nueva mientras el cliente no responde) ── */
export async function mandarEstimado(negocio: string, numero: string, actorId: string, L: unknown): Promise<Res> {
  if (!NUM.test(numero)) return no("Esa cita no existe.", "That booking does not exist.");
  const lin = limpiar(L, false);
  if (!Array.isArray(lin)) return { ok: false, msg: lin };
  let tpl = "";
  const r = await tx(async (c): Promise<Res> => {
    const o = await abrir(c, negocio, numero, null);
    if (!o) return no("Esa cita no existe.", "That booking does not exist.");
    if (o.status !== "confirmed" || !["in", "est"].includes(o.detail ?? "")) return YA;
    if (!conEstimado(o.det?.rubro, o.k)) return no("Este servicio tiene precio cerrado: lo que encuentres va como «Algo más».", "This service has a set price: anything you find goes as “Something else”.");
    if ((await c.query(`select 1 from estimates where operation_id = $1::bigint and status = 'answered'`, [o.id])).rowCount) return no("Ya respondió el estimado: lo nuevo va como «Algo más».", "They already answered: anything new goes as “Something else”.");
    const prev = (await c.query<{ v: number }>(`update estimates set status = 'superseded' where operation_id = $1::bigint and status = 'sent' returning version as v`, [o.id])).rows[0];
    const mem = (await c.query<{ id: string }>(`select id::text from business_members where business_id = $1 and user_id = $2 and status = 'active' order by (kind = 'owner') desc limit 1`, [negocio, actorId])).rows[0]?.id ?? null;
    const rate = Number((await c.query<{ r: number }>(`select labor_rate_cents as r from trade_settings where business_id = $1`, [negocio])).rows[0]?.r ?? 0);
    const tax = (await c.query<{ p: number; l: number }>(`select parts_bp as p, labor_bp as l from tax_rules where city_id = $1 and category_id = $2 and effective_from <= now() order by effective_from desc, id desc limit 1`, [o.city, o.cat])).rows[0] ?? { p: 0, l: 0 };
    const rg = regla(o), v = (await c.query<{ v: number }>(`select coalesce(max(version), 0)::int + 1 as v from estimates where operation_id = $1::bigint`, [o.id])).rows[0]!.v;
    const est = (await c.query<{ id: string }>(
      `insert into estimates (operation_id, city_id, version, status, labor_rate_cents, parts_tax_bp, labor_tax_bp, base_cents, credit_cents, created_by) values ($1::bigint, $2, $3, 'sent', $4, $5, $6, $7, $8, $9) returning id::text`,
      [o.id, o.city, v, rate, tax.p, tax.l, rg.base, rg.credit, mem])).rows[0]!.id;
    if (!(await insertarLineas(c, o, est, lin, false, actorId))) { await c.query("rollback"); return no("Una de las fotos ya no está. Súbela otra vez.", "One of the photos is gone. Upload it again."); }
    const tot = Number((await c.query<{ n: number }>(`select coalesce(sum(line_total_cents), 0)::int as n from estimate_lines where estimate_id = $1::bigint`, [est])).rows[0]!.n);
    await c.query(`update operations set status_detail = 'est', updated_at = now() where id = $1::bigint`, [o.id]);
    await ev(c, o.id, "estimate_sent", "member", actorId, prev
      ? { es: `Mandaste la versión ${v} del estimado · ${lin.length} líneas · ${money(tot)}`, en: `You sent estimate version ${v} · ${lin.length} lines · ${money(tot)}` }
      : { es: `Mandaste el estimado · ${lin.length} líneas · ${money(tot)}`, en: `You sent the estimate · ${lin.length} lines · ${money(tot)}` });
    tpl = o.det?.rubro === "hogar" ? "est_listo_h" : "est_listo";
    return { ok: true };
  });
  if (r.ok) await avisarC(numero, tpl, {});
  return r;
}

/* ── El cliente aprueba línea por línea (ids = las que aprueba; ninguna = solo el diagnóstico o la visita) ── */
export async function decidirEstimado(userId: string, numero: string, ids: unknown, pm: string | null): Promise<Res<{ retenido: number }>> {
  if (!NUM.test(numero)) return no("Esa cita no existe.", "That booking does not exist.");
  const biz = await negocioDe(numero, userId);
  if (!biz) return no("Esa cita no existe.", "That booking does not exist.");
  const sel = Array.isArray(ids) ? [...new Set(ids.map(String).filter((x) => /^\d{1,18}$/.test(x)))] : [];
  let aviso: Record<string, string> | null = null, retenido = 0;
  const r = await tx(async (c): Promise<Res<{ retenido: number }>> => {
    const o = await abrir(c, biz, numero, userId);
    if (!o) return no("Esa cita no existe.", "That booking does not exist.");
    if (o.status !== "confirmed" || o.detail !== "est") return YA;
    const e = (await c.query<{ id: string; v: number }>(`select id::text, version as v from estimates where operation_id = $1::bigint and status = 'sent' order by version desc limit 1`, [o.id])).rows[0];
    if (!e) return YA;
    const L = (await c.query<{ id: string; tot: number }>(`select id::text, line_total_cents as tot from estimate_lines where estimate_id = $1::bigint and not is_extra`, [e.id])).rows;
    if (sel.some((x) => !L.some((l) => l.id === x))) return no("El estimado cambió. Revísalo otra vez.", "The estimate changed. Review it again.");
    await c.query(`update estimate_lines set decision = case when id = any($2::bigint[]) then 'ok' else 'no' end, decided_at = now() where estimate_id = $1::bigint`, [e.id, sel]);
    await c.query(`update estimates set status = 'answered', answered_at = now() where id = $1::bigint`, [e.id]);
    const st = await estadoEstimado(c, o.id);
    const falta = st.dinero.objetivo - (await vivoRetenido(c, o.id));
    const h = await retenerFalta(c, o, "estimate", e.v, pm, falta);
    if (!h.ok) { await c.query("rollback"); return h; }
    if (h.pi) retenido = falta;
    const n = sel.length, apr = L.filter((l) => sel.includes(l.id)).reduce((s, l) => s + l.tot, 0);
    await c.query(`update operations set status_detail = $2, updated_at = now() where id = $1::bigint`, [o.id, n ? "work" : "ready"]);
    await ev(c, o.id, "lines_approved", "user", userId, n
      ? { es: `Aprobó ${n} de ${L.length} · ${money(apr)}`, en: `Approved ${n} of ${L.length} · ${money(apr)}` }
      : { es: "No aprobó arreglos", en: "Approved no repairs" });
    aviso = { n: String(n), de: String(L.length), monto: money(apr) };
    return { ok: true, retenido };
  });
  if (r.ok && aviso) await avisarN(numero, "biz_est_ok", aviso);
  return r;
}

/* ── «Algo más»: el negocio para y pregunta (foto + precio). Una a la vez. ── */
export async function pedirExtra(negocio: string, numero: string, actorId: string, linea: unknown): Promise<Res> {
  if (!NUM.test(numero)) return no("Esa cita no existe.", "That booking does not exist.");
  const lin = limpiar([linea], true);
  if (!Array.isArray(lin)) return { ok: false, msg: lin };
  let que = "";
  const r = await tx(async (c): Promise<Res> => {
    const o = await abrir(c, negocio, numero, null);
    if (!o) return no("Esa cita no existe.", "That booking does not exist.");
    if (o.status !== "confirmed" || o.detail !== "work") return no("«Algo más» se pide mientras trabajas.", "“Something else” is asked while working.");
    if ((await c.query(`select 1 from estimate_lines where operation_id = $1::bigint and is_extra and decision is null`, [o.id])).rowCount) return no("Ya hay una pregunta esperando al cliente.", "A question is already waiting for the client.");
    // Un precio cerrado no trae estimado: «algo más» cuelga de un estimado sin líneas propias (con su tarifa e impuesto).
    let e = (await c.query<{ id: string }>(`select id::text from estimates where operation_id = $1::bigint and status = 'answered' order by version desc limit 1`, [o.id])).rows[0]?.id;
    if (!e) {
      const rate = Number((await c.query<{ r: number }>(`select labor_rate_cents as r from trade_settings where business_id = $1`, [negocio])).rows[0]?.r ?? 0);
      const tax = (await c.query<{ p: number; l: number }>(`select parts_bp as p, labor_bp as l from tax_rules where city_id = $1 and category_id = $2 and effective_from <= now() order by effective_from desc, id desc limit 1`, [o.city, o.cat])).rows[0] ?? { p: 0, l: 0 };
      const rg = regla(o);
      e = (await c.query<{ id: string }>(`insert into estimates (operation_id, city_id, version, status, labor_rate_cents, parts_tax_bp, labor_tax_bp, base_cents, credit_cents, answered_at) values ($1::bigint, $2, 1, 'answered', $3, $4, $5, $6, 0, now()) returning id::text`,
        [o.id, o.city, rate, tax.p, tax.l, rg.base])).rows[0]!.id;
    }
    if (!(await insertarLineas(c, o, e, lin, true, actorId))) { await c.query("rollback"); return no("La foto ya no está. Súbela otra vez.", "The photo is gone. Upload it again."); }
    const tot = Number((await c.query<{ n: number }>(`select line_total_cents as n from estimate_lines where operation_id = $1::bigint and is_extra and decision is null`, [o.id])).rows[0]!.n);
    await c.query(`update operations set status_detail = 'xtra', updated_at = now() where id = $1::bigint`, [o.id]);
    await ev(c, o.id, "extra_asked", "member", actorId, { es: `Preguntaste: ${lin[0]!.t.es} · ${money(tot)}`, en: `You asked: ${lin[0]!.t.en} · ${money(tot)}` });
    que = lin[0]!.t.es;
    return { ok: true };
  });
  if (r.ok) await avisarC(numero, "xtra_pide", { que });
  return r;
}

export async function decidirExtra(userId: string, numero: string, si: boolean, pm: string | null): Promise<Res<{ retenido: number }>> {
  if (!NUM.test(numero)) return no("Esa cita no existe.", "That booking does not exist.");
  const biz = await negocioDe(numero, userId);
  if (!biz) return no("Esa cita no existe.", "That booking does not exist.");
  let que = "", retenido = 0;
  const r = await tx(async (c): Promise<Res<{ retenido: number }>> => {
    const o = await abrir(c, biz, numero, userId);
    if (!o) return no("Esa cita no existe.", "That booking does not exist.");
    if (o.status !== "confirmed" || o.detail !== "xtra") return YA;
    const l = (await c.query<{ id: string; t: Bi; tot: number }>(`select id::text, title as t, line_total_cents as tot from estimate_lines where operation_id = $1::bigint and is_extra and decision is null`, [o.id])).rows[0];
    if (!l) return YA;
    await c.query(`update estimate_lines set decision = $2, decided_at = now() where id = $1::bigint`, [l.id, si ? "ok" : "no"]);
    if (si) {
      const st = await estadoEstimado(c, o.id);
      const falta = st.dinero.objetivo - (await vivoRetenido(c, o.id));
      const seq = Number((await c.query<{ n: number }>(`select coalesce(max(seq), 0)::int + 1 as n from payments where operation_id = $1::bigint and kind = 'extra'`, [o.id])).rows[0]!.n);
      const h = await retenerFalta(c, o, "extra", seq, pm, falta);
      if (!h.ok) { await c.query("rollback"); return h; }
      if (h.pi) retenido = falta;
    }
    await c.query(`update operations set status_detail = 'work', updated_at = now() where id = $1::bigint`, [o.id]);
    await ev(c, o.id, si ? "extra_ok" : "extra_no", "user", userId, si ? { es: `Aprobó: ${l.t.es} · ${money(l.tot)}`, en: `Approved: ${l.t.en} · ${money(l.tot)}` } : { es: `No aprobó: ${l.t.es}`, en: `Declined: ${l.t.en}` });
    que = l.t.es;
    return { ok: true, retenido };
  });
  if (r.ok) await avisarN(numero, si ? "biz_xtra_ok" : "biz_xtra_no", { que });
  return r;
}

/* ── Lo final: una línea aprobada puede bajar (nunca subir) antes de entregar ── */
export async function ajustarFinal(negocio: string, numero: string, actorId: string, finales: unknown): Promise<Res> {
  if (!NUM.test(numero) || !finales || typeof finales !== "object") return no("Esa cita no existe.", "That booking does not exist.");
  const F = Object.entries(finales as Record<string, unknown>).filter(([k]) => /^\d{1,18}$/.test(k)).map(([k, v]) => [k, Math.round(Number(v))] as const);
  if (!F.length || F.some(([, v]) => !(v >= 0))) return no("Revisa los montos.", "Check the amounts.");
  return tx(async (c): Promise<Res> => {
    const o = await abrir(c, negocio, numero, null);
    if (!o) return no("Esa cita no existe.", "That booking does not exist.");
    if (o.status !== "confirmed" || !["work", "ready"].includes(o.detail ?? "")) return YA;
    let baja = 0;
    for (const [id, v] of F) {
      const l = (await c.query<{ tot: number; fin: number | null }>(`select line_total_cents as tot, final_cents as fin from estimate_lines where id = $1::bigint and operation_id = $2::bigint and decision = 'ok'`, [id, o.id])).rows[0];
      if (!l) return no("Esa línea no está aprobada.", "That line is not approved.");
      if (v > l.tot) return no(`Lo final no puede pasar lo aprobado (${money(l.tot)}).`, `The final amount cannot go over what was approved (${money(l.tot)}).`);
      baja += (l.fin ?? l.tot) - v;
      await c.query(`update estimate_lines set final_cents = $2 where id = $1::bigint`, [id, v === l.tot ? null : v]);
    }
    await ev(c, o.id, "final_adjusted", "member", actorId, baja > 0 ? { es: `Lo final bajó ${money(baja)}`, en: `Final went down ${money(baja)}` } : { es: "Lo final quedó como lo aprobado", en: "Final kept as approved" });
    return { ok: true };
  });
}

/* ── Liquidar (dentro de la transacción que cierra la cita): fija cuánto se cobra de cada retención. Después de
   confirmar la transacción, `cobrarLiquidacion` hace las llamadas a la pasarela (idempotentes; repararPagos reintenta). ── */
export async function planLiquidar(c: PoolClient, opId: string, actor: "user" | "member", actorId: string): Promise<void> {
  const st = await estadoEstimado(c, opId), d = st.dinero;
  const P = (await c.query<{ id: string; held: number }>(
    `select id::text, held_cents as held from payments where operation_id = $1::bigint and kind in ('estimate', 'extra') and status = 'held' order by case kind when 'estimate' then 0 else 1 end, seq`, [opId])).rows;
  let resto = Math.max(0, d.final - d.dep);
  for (const p of P) { const t = Math.min(resto, p.held); resto -= t; await c.query(`update payments set capture_target_cents = $2, updated_at = now() where id = $1::bigint`, [p.id, t]); }
  if (!st.estimado && !st.extras.length) return;
  const tarj = Math.max(0, d.final - d.dep) - resto;
  await ev(c, opId, "settled", actor, actorId, tarj > 0
    ? { es: `Lo final: ${money(d.final)} · en tarjeta ${money(tarj)}${resto ? ` · en el local ${money(resto)}` : ""}`, en: `Final: ${money(d.final)} · on card ${money(tarj)}${resto ? ` · in person ${money(resto)}` : ""}` }
    : { es: `Lo final: ${money(d.final)} · se paga en el local${d.dep ? ` (menos el depósito de ${money(d.dep)})` : ""}`, en: `Final: ${money(d.final)} · paid in person${d.dep ? ` (minus the ${money(d.dep)} deposit)` : ""}` });
}

export async function cobrarLiquidacion(opId: string): Promise<void> {
  const P = (await db().query<{ id: string; pi: string; held: number; t: number; num: string }>(
    `select p.id::text, p.stripe_payment_intent as pi, p.held_cents as held, p.capture_target_cents as t, o.number as num from payments p join operations o on o.id = p.operation_id
      where p.operation_id = $1::bigint and p.kind in ('estimate', 'extra') and p.status = 'held' and p.capture_target_cents is not null`, [opId])).rows;
  if (!P.length) return;
  // Comisión sobre lo cobrado sin impuesto (proporcional al impuesto de lo aprobado).
  const tx0 = (await db().query<{ tax: number; tot: number }>(`select coalesce(sum(tax_cents), 0)::int as tax, coalesce(sum(line_total_cents), 0)::int as tot from estimate_lines where operation_id = $1::bigint and decision = 'ok'`, [opId])).rows[0]!;
  const sinImp = (n: number) => (tx0.tot ? Math.round(n * (1 - tx0.tax / tx0.tot)) : n);
  let cob = 0, lib = 0;
  for (const p of P) {
    if (p.t > 0) {
      const fee = Math.min(await comision(db(), "cita", sinImp(p.t)), p.t);
      const r = await pasarela.cobrar(p.pi, p.t, fee);
      if (!r.ok) { await db().query(`update payments set failure_code = $2, updated_at = now() where id = $1::bigint`, [p.id, r.codigo ?? "error"]); continue; }
      const u = await db().query(`update payments set status = 'captured', amount_cents = $2, fee_cents = $3, captured_at = now(), failure_code = null, updated_at = now() where id = $1::bigint and status = 'held'`, [p.id, p.t, fee]);
      if (u.rowCount) { cob += p.t; lib += p.held - p.t; await ev(db(), opId, "payment_captured", "system", null, { es: `Se cobraron ${money(p.t)}${p.held > p.t ? ` y se liberaron ${money(p.held - p.t)}` : ""}`, en: `${money(p.t)} charged${p.held > p.t ? ` and ${money(p.held - p.t)} released` : ""}` }); }
    } else {
      const r = await pasarela.liberar(p.pi);
      if (!r.ok) continue;
      const u = await db().query(`update payments set status = 'released', released_at = now(), updated_at = now() where id = $1::bigint and status = 'held'`, [p.id]);
      if (u.rowCount) { lib += p.held; await ev(db(), opId, "payment_released", "system", null, { es: `Se liberaron ${money(p.held)} retenidos`, en: `${money(p.held)} held was released` }); }
    }
  }
  await db().query(`update operations set pay_status = (select case when bool_or(status = 'held') then 'held' when bool_or(status = 'captured') then 'captured' else pay_status end from payments where operation_id = $1::bigint) where id = $1::bigint`, [opId]);
  const num = P[0]!.num;
  if (cob > 0) { await avisarC(num, "cita_pagada", { monto: money(cob), libre: lib > 0 ? ` · liberado ${money(lib)}` : "" }); await avisarN(num, "biz_cita_pagada", { monto: money(cob) }); }
}

/* ── Retenciones de más de 7 días (la tarjeta suelta una autorización a los 7 días): a los 6 días y 20 horas se libera y se
   vuelve a retener fuera de sesión con la misma tarjeta. Si el banco no deja, ese monto se paga en el local y se avisa. ── */
export async function renovarRetenciones(negocio: string): Promise<void> {
  const L = (await db().query<{ id: string; op: string; kind: "estimate" | "extra"; pi: string; held: number; pm: string | null; num: string; uid: string; city: string }>(
    `select p.id::text, p.operation_id::text as op, p.kind, p.stripe_payment_intent as pi, p.held_cents as held, p.payment_method as pm, o.number as num, o.user_id::text as uid, o.city_id as city
       from payments p join operations o on o.id = p.operation_id
      where p.business_id = $1 and p.status = 'held' and p.kind in ('estimate', 'extra') and p.capture_target_cents is null and o.status = 'confirmed'
        and p.held_at < now() - interval '164 hours' limit 10`, [negocio])).rows;
  for (const p of L) {
    const t = await tarjetaDe(negocio);
    const seq = Number((await db().query<{ n: number }>(`select coalesce(max(seq), 0)::int + 1 as n from payments where operation_id = $1::bigint and kind = $2`, [p.op, p.kind])).rows[0]!.n);
    const fee = Math.min(await comision(db(), "cita", p.held), p.held);
    const r = t.on && t.cuenta && p.pm ? await pasarela.retener({ centavos: p.held, comision: fee, destino: t.cuenta, pm: p.pm, cliente: await pasarela.cliente(p.uid).catch(() => null), idem: `renov-${p.id}`, meta: { appointment: p.num, business_id: negocio, kind: p.kind }, fuera: true }) : null;
    await pasarela.liberar(p.pi);
    await tx(async (c) => {
      const u = await c.query(`update payments set status = 'released', released_at = now(), updated_at = now() where id = $1::bigint and status = 'held'`, [p.id]);
      if (!u.rowCount) return;
      if (r?.ok && r.estado === "retenido") {
        await c.query(`insert into payments (operation_id, user_id, business_id, city_id, kind, seq, method, stripe_payment_intent, amount_cents, held_cents, fee_cents, status, card_brand, card_last4, held_at, simulated, payment_method, renewed_from)
                       values ($1::bigint, $2, $3, $4, $5, $6, 'card', $7, $8, $8, $9, 'held', $10, $11, now(), $12, $13, $14::bigint)`,
          [p.op, p.uid, negocio, p.city, p.kind, seq, r.pi, p.held, fee, r.marca, r.ultimos4, r.pi.startsWith("pi_sim_"), p.pm, p.id]);
        await ev(c, p.op, "hold_renewed", "system", null, { es: `Se renovó la retención de ${money(p.held)}`, en: `The ${money(p.held)} hold was renewed` });
      } else {
        if (r?.ok) await pasarela.liberar(r.pi).catch(() => undefined);
        await ev(c, p.op, "hold_failed", "system", null, { es: `La retención de ${money(p.held)} no se pudo renovar: se paga en el local`, en: `The ${money(p.held)} hold could not be renewed: paid in person` });
      }
    });
    if (!(r?.ok && r.estado === "retenido")) { await avisarC(p.num, "hold_fallo", { monto: money(p.held) }); await avisarN(p.num, "biz_hold_fallo", { monto: money(p.held) }); }
  }
}

/* Reintenta lo que quedó a medias: liquidaciones cuyo cobro falló y retenciones de citas que ya no siguen. */
export async function repararEstimados(negocio: string): Promise<void> {
  const L = (await db().query<{ op: string; st: string; t: number | null }>(
    `select distinct p.operation_id::text as op, o.status as st, p.capture_target_cents as t from payments p join operations o on o.id = p.operation_id
      where p.business_id = $1 and p.status = 'held' and p.kind in ('estimate', 'extra') and (p.capture_target_cents is not null or o.status in ('cancelled', 'declined', 'expired')) limit 20`, [negocio])).rows;
  for (const x of L) {
    if (x.st === "done" && x.t != null) await cobrarLiquidacion(x.op);
    else if (x.st !== "confirmed" && x.st !== "done") {
      await db().query(`update payments set capture_target_cents = 0 where operation_id = $1::bigint and kind in ('estimate', 'extra') and status = 'held'`, [x.op]);
      await cobrarLiquidacion(x.op);
    }
  }
  await renovarRetenciones(negocio);
}

/* ── Plantillas del panel (por clase de trabajo de la categoría) ── */
export type Plantilla = { cls: string; clsName: Bi; urg: "now" | "soon" | "later"; t: Bi; why: Bi; parts: { n: Bi; cents: number }[]; horas: number; extra: boolean };
export async function plantillas(cat: string): Promise<Plantilla[]> {
  return (await db().query<Plantilla>(
    `select cls, cls_name as "clsName", urgency as urg, title as t, why, parts, labor_hours::float as horas, is_extra as extra from estimate_templates where category_id = $1 and status = 'active' order by cls, sort, id limit 300`, [cat])).rows;
}
