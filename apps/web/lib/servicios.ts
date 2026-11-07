import "server-only";
import { db } from "./db";
import { herramientaSP } from "./salud-pro";
import type { HerrSP } from "./salud-pro-comun";

/* Servicios y reglas de citas (Fase 3 · 3a). Los servicios son `items` con module 'svc' (como el menú): categoría en
   item_sections, duración, tiempo entre citas (el cliente no lo ve), «desde · varía», opciones que cambian precio y
   tiempo (máx. 3 grupos) y extras. Quién hace cada uno (y su precio en una silla rentada) va en staff_services.
   El negocio trabaja con empleados, a comisión o renta sillas; las reglas de citas son del negocio y, si renta sillas,
   cada silla decide si confirma al instante, cuánto tarda en contestar y el depósito. */
export type Bi = { es: string; en: string };
export type OpcionSvc = { t: Bi; o: { n: Bi; p: number; m: number }[] };
/* Doctores y Profesionales (4h · fase4-salud-pro.md §2): cada servicio con su forma de cobrar (svc_kind) y lo propio en
   svc_attrs. Salud: consulta · por video · sin cita · gratis con tu seguro · precio fijo (esc = «según tus ingresos»).
   Pro: consulta (cred = se descuenta si lo contratas) · honorario fijo (gov = tarifa del gobierno aparte; mes = por mes) ·
   por hora (hrs = horas estimadas) · % solo si ganas (price_cents = % × 100, nunca dinero; unit = de qué) · sin cita ·
   se cotiza. rem = por video o teléfono. no = «IMPORTANTE» / lo que no hacen (hasta 2 líneas). Se valida AQUÍ. */
export type RubroSP = "salud" | "pro";
export const rubroSP = (cat: string): RubroSP | null => (cat === "NEG-SALUD" ? "salud" : cat === "NEG-PRO" ? "pro" : null);
export const KINDS_SP: Record<RubroSP, string[]> = { salud: ["cons", "tele", "walk", "free", "proc"], pro: ["cons", "fijo", "hora", "pct", "walk", "cotiza"] };
export type AttrsSP = { esc?: boolean; gov?: number; cred?: boolean; rem?: boolean; hrs?: string; mes?: boolean; unit?: "cheque" | "fianza" | "carga" | "caso"; no?: Bi[];
  // Fiestas (4t · neg-fiesta-listing.js): horas del paquete, lo que incluye, invitados, montaje incluido, unidad e invitados por
  // unidad, mínimo (horas o unidades).
  h?: number; inc?: Bi[]; cap?: number; mont?: boolean; u?: Bi; per?: number; min?: number;
  // Transporte (4w · neg-trans-listing.js): horas de salida (0–23), de dónde sale y a dónde va, cuánto dura, asientos o personas,
  // precio de niño y espera incluida (min).
  sal?: number[]; from?: Bi; to?: Bi; dmin?: number; pax?: number; child?: number; wait?: number;
  // Noche (4na · neg-noche-listing.js): lista hasta (min desde las 12 PM), cuántas mesas de ese tipo hay, por hora (billar),
  // noches en que vale (0 = domingo; vacío = todas las que abre) y el depósito de la mesa (también en items.deposit_cents).
  until?: number; tables?: number; hr?: boolean; dows?: number[]; dep?: number };
/* Fiestas usa el mismo editor de servicios con sus formas de cobrar. */
export type RubroSvc = RubroSP | "fiesta" | "trans" | "noche";
export const rubroSvc = (cat: string): RubroSvc | null => (cat === "NEG-FIESTA" ? "fiesta" : cat === "NEG-TRANS" ? "trans" : cat === "NEG-NOCHE" ? "noche" : rubroSP(cat));
/* Noche (4na · neg-noche-listing.js k; fase4-noche.md §2): la entrada (sigue al cover de «Esta noche», se paga en la puerta), la
   lista (hasta qué hora y su precio por persona; $0 = gratis; anotarse nunca cobra), la mesa (personas, cuántas hay, mínimo de
   consumo, depósito ≤ mínimo, o por hora), el VIP (lo mismo + lo que incluye), la noche especial (boleto: se vende en Eventos, no
   sale hasta que abra) y por fecha (DJ, promotor, salón: «desde»). La app no vende tragos, botellas ni hookah: aquí no hay
   forma de cobrar un trago (guardián alcoholNoSeVende). El servidor valida; un precio que no cuadra no se guarda. */
export const KINDS_NOCHE = ["cover", "lista", "mesa", "vip", "evento", "fecha"];
export function limpiarNoche(k0: unknown, cents: number, a0: unknown): { ok: true; k: string; a: AttrsSP; cents: number } | { ok: false; es: string; en: string } {
  const k = String(k0 ?? ""), x = (a0 && typeof a0 === "object" ? a0 : {}) as Record<string, unknown>, a: AttrsSP = {};
  if (!KINDS_NOCHE.includes(k)) return { ok: false, es: "Elige qué es.", en: "Pick what it is." };
  const t = (v: unknown, n: number) => (typeof v === "string" ? v.replace(/[\u0000-\u001F\u007F]/g, "").replace(/\s+/g, " ").trim().slice(0, n) : "");
  const n = (v: unknown, lo: number, hi: number) => { const z = Math.round(Number(v)); return Number.isFinite(z) && z >= lo && z <= hi ? z : null; };
  if (cents < 0 || cents % 100) return { ok: false, es: "El precio va en dólares enteros.", en: "The price goes in whole dollars." };
  const dows = [...new Set((Array.isArray(x.dows) ? x.dows : []).map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort((p, q) => p - q);
  if (dows.length && dows.length < 7 && k !== "fecha") a.dows = dows;
  const inc = (Array.isArray(x.inc) ? x.inc : []).slice(0, 6).map((z) => ({ es: t((z as Bi)?.es, 60), en: t((z as Bi)?.en, 60) })).filter((z) => z.es.length >= 2);
  if (inc.length && (k === "vip" || k === "mesa" || k === "fecha" || k === "evento")) a.inc = inc.map((z) => ({ es: z.es, en: z.en || z.es }));
  if (k === "cover") return { ok: true, k, a: {}, cents: 0 }; // el precio lo pone «Esta noche» (el servidor lo copia)
  if (k === "lista") {
    const u = n(x.until, 540, 780); if (u == null || u % 60) return { ok: false, es: "Marca hasta qué hora vale la lista.", en: "Pick until what time the list is valid." };
    if (cents > 5000) return { ok: false, es: "El precio de la lista va hasta $50 por persona.", en: "The list price goes up to $50 per person." };
    a.until = u; return { ok: true, k, a, cents };
  }
  if (k === "mesa" || k === "vip") {
    const pax = n(x.pax, 1, 50); if (!pax) return { ok: false, es: "¿Para cuántas personas es?", en: "How many people is it for?" };
    a.pax = pax;
    a.tables = n(x.tables, 1, 50) ?? 1;
    if (k === "mesa" && x.hr === true) { if (cents <= 0) return { ok: false, es: "Ponle el precio por hora.", en: "Set the hourly price." }; a.hr = true; }
    const dep = n(x.dep, 0, 50000);
    if (dep == null || dep % 100) return { ok: false, es: "El depósito va en dólares enteros, hasta $500.", en: "The deposit goes in whole dollars, up to $500." };
    if (dep && !a.hr && cents > 0 && dep > cents) return { ok: false, es: "El depósito no puede ser más que el mínimo: se descuenta de la cuenta.", en: "The deposit can't be more than the minimum: it comes off the bill." };
    if (dep) a.dep = dep;
    if (k === "vip" && cents <= 0 && !dep) return { ok: false, es: "Ponle el mínimo o el depósito del VIP.", en: "Set the VIP minimum or deposit." };
    return { ok: true, k, a, cents };
  }
  if (k === "evento" && cents <= 0) return { ok: false, es: "Ponle el precio del boleto.", en: "Set the ticket price." };
  if (k === "fecha") { const pax = n(x.pax, 1, 2000); if (pax) a.pax = pax; }
  return { ok: true, k, a, cents };
}
/* Transporte (4w · neg-trans-listing.js k): por asiento con salidas fijas, vehículo completo, caja o envío, precio cerrado con
   fotos. El servidor valida: un asiento sin salidas o sin asientos no se guarda. */
export const KINDS_TRANS = ["asiento", "priv", "caja", "cotiza"];
export function limpiarTrans(k0: unknown, cents: number, a0: unknown): { ok: true; k: string; a: AttrsSP; cents: number } | { ok: false; es: string; en: string } {
  const k = String(k0 ?? ""), x = (a0 && typeof a0 === "object" ? a0 : {}) as Record<string, unknown>, a: AttrsSP = {};
  if (!KINDS_TRANS.includes(k)) return { ok: false, es: "Elige cómo lo vendes.", en: "Pick how you sell it." };
  const t = (v: unknown, n: number) => (typeof v === "string" ? v.replace(/[\u0000-\u001F\u007F]/g, "").replace(/\s+/g, " ").trim().slice(0, n) : "");
  const n = (v: unknown, lo: number, hi: number) => { const z = Math.round(Number(v)); return Number.isFinite(z) && z >= lo && z <= hi ? z : null; };
  const inc = (Array.isArray(x.inc) ? x.inc : []).slice(0, 6).map((z) => ({ es: t((z as Bi)?.es, 60), en: t((z as Bi)?.en, 60) })).filter((z) => z.es.length >= 2);
  if (inc.length) a.inc = inc.map((z) => ({ es: z.es, en: z.en || z.es }));
  const bi = (v: unknown) => { const e = t((v as Bi)?.es, 40); return e.length >= 2 ? { es: e, en: t((v as Bi)?.en, 40) || e } : undefined; };
  const from = bi(x.from), to = bi(x.to);
  if (from) a.from = from;
  if (to) a.to = to;
  if (cents <= 0) return { ok: false, es: k === "cotiza" ? "Pon el «desde»: el precio más bajo." : "Ponle el precio.", en: k === "cotiza" ? "Set the “from” price." : "Set the price." };
  if (k === "asiento") {
    const sal = [...new Set((Array.isArray(x.sal) ? x.sal : []).map(Number).filter((h) => Number.isInteger(h) && h >= 0 && h <= 23))].sort((p, q) => p - q).slice(0, 12);
    if (!sal.length) return { ok: false, es: "Marca a qué hora sale.", en: "Mark the departure times." };
    a.sal = sal;
    const pax = n(x.pax, 1, 56); if (!pax) return { ok: false, es: "¿Cuántos asientos tiene?", en: "How many seats?" };
    a.pax = pax;
    if (!to) return { ok: false, es: "Escribe a dónde va.", en: "Write where it goes." };
    const ch = n(x.child, 0, 1_000_000); if (ch && ch < cents) a.child = ch;
    const dm = n(x.dmin, 10, 1440); if (dm) a.dmin = dm;
  }
  if (k === "priv") {
    const pax = n(x.pax, 1, 56); if (!pax) return { ok: false, es: "¿Hasta cuántas personas?", en: "Up to how many people?" };
    a.pax = pax;
    const w = n(x.wait, 0, 240); if (w) a.wait = w;
  }
  return { ok: true, k, a, cents };
}
export const KINDS_FIESTA = ["pack", "hora", "unid", "fijo", "visita", "cotiza"];
export function limpiarFiesta(k0: unknown, cents: number, a0: unknown): { ok: true; k: string; a: AttrsSP; cents: number } | { ok: false; es: string; en: string } {
  const k = String(k0 ?? ""), x = (a0 && typeof a0 === "object" ? a0 : {}) as Record<string, unknown>, a: AttrsSP = {};
  if (!KINDS_FIESTA.includes(k)) return { ok: false, es: "Elige cómo lo cobras.", en: "Pick how you charge." };
  const t = (v: unknown, n: number) => (typeof v === "string" ? v.replace(/[\u0000-\u001F\u007F]/g, "").replace(/\s+/g, " ").trim().slice(0, n) : "");
  const n = (v: unknown, lo: number, hi: number) => { const z = Math.round(Number(v)); return Number.isFinite(z) && z >= lo && z <= hi ? z : null; };
  const inc = (Array.isArray(x.inc) ? x.inc : []).slice(0, 6).map((z) => ({ es: t((z as Bi)?.es, 60), en: t((z as Bi)?.en, 60) })).filter((z) => z.es.length >= 2);
  if (inc.length) a.inc = inc.map((z) => ({ es: z.es, en: z.en || z.es }));
  const cap = n(x.cap, 1, 2000); if (cap) a.cap = cap;
  if (x.mont === true) a.mont = true;
  if (k === "pack") { const h = n(x.h, 0, 24); a.h = h ?? 0; if (cents <= 0) return { ok: false, es: "Ponle el precio del paquete.", en: "Set the package price." }; }
  if (k === "hora") { const m = n(x.min, 1, 12); a.min = m ?? 1; if (cents <= 0) return { ok: false, es: "Ponle el precio por hora.", en: "Set the hourly price." }; }
  if (k === "unid") {
    const u = x.u as Bi | undefined, ue = t(u?.es, 20);
    if (ue.length < 2) return { ok: false, es: "Escribe la unidad (juego, mantel, porción…).", en: "Write the unit (set, linen, slice…)." };
    a.u = { es: ue, en: t(u?.en, 20) || ue };
    const per = n(x.per, 1, 100); if (per) a.per = per;
    const m = n(x.min, 1, 1000); if (m) a.min = m;
    if (cents <= 0) return { ok: false, es: "Ponle el precio por unidad.", en: "Set the unit price." };
  }
  if (k === "fijo" && cents <= 0) return { ok: false, es: "Ponle el precio.", en: "Set the price." };
  if (k === "visita") cents = 0;
  if (k === "cotiza" && cents < 0) cents = 0;
  return { ok: true, k, a, cents };
}
export function limpiarSP(rubro: RubroSP, k0: unknown, cents: number, a0: unknown): { ok: true; k: string; a: AttrsSP; cents: number } | { ok: false; es: string; en: string } {
  const k = String(k0 ?? ""), x = (a0 && typeof a0 === "object" ? a0 : {}) as Record<string, unknown>, a: AttrsSP = {};
  if (!KINDS_SP[rubro].includes(k)) return { ok: false, es: "Elige cómo lo cobras.", en: "Pick how you charge." };
  const t = (v: unknown, n: number) => (typeof v === "string" ? v.replace(/[\u0000-\u001F\u007F]/g, "").replace(/\s+/g, " ").trim().slice(0, n) : "");
  const no = (Array.isArray(x.no) ? x.no : []).slice(0, 2).map((z) => ({ es: t((z as Bi)?.es, 90), en: t((z as Bi)?.en, 90) })).filter((z) => z.es.length >= 3);
  if (no.length) a.no = no.map((z) => ({ es: z.es, en: z.en || z.es }));
  if (rubro === "salud") {
    if (x.esc === true && k !== "free") a.esc = true;
    if (k === "free") cents = 0;
    else if (cents <= 0 && k !== "cons" && k !== "walk") return { ok: false, es: "Ponle el precio sin seguro.", en: "Set the price without insurance." };
  } else {
    if (x.rem === true) a.rem = true;
    if (k === "cons" && x.cred === true) a.cred = true;
    if (k === "fijo") {
      const g = Math.round(Number(x.gov ?? 0));
      if (g) { if (!(g >= 100 && g <= 5_000_000 && g % 100 === 0)) return { ok: false, es: "La tarifa del gobierno va en dólares enteros.", en: "The government fee goes in whole dollars." }; a.gov = g; }
      if (x.mes === true) a.mes = true;
      if (cents <= 0) return { ok: false, es: "Ponle el honorario.", en: "Set the fee." };
    }
    if (k === "hora") { const h = t(x.hrs, 10); if (h && !/^\d{1,3}(–\d{1,3})?$/.test(h.replace("-", "–"))) return { ok: false, es: "Las horas estimadas van así: 8–15.", en: "Estimated hours go like this: 8–15." }; if (h) a.hrs = h.replace("-", "–"); if (cents <= 0) return { ok: false, es: "Ponle el precio por hora.", en: "Set the hourly price." }; }
    if (k === "pct") {
      if (!(cents >= 100 && cents <= 5000 && cents % 100 === 0)) return { ok: false, es: "El porcentaje va de 1 a 50.", en: "The percentage goes from 1 to 50." };
      if (x.gov) return { ok: false, es: "Un servicio por porcentaje no lleva tarifa del gobierno.", en: "A percentage service has no government fee." };
      a.unit = (["cheque", "fianza", "carga", "caso"] as const).find((u) => u === x.unit) ?? "caso";
    }
    if (k === "cotiza" && cents < 0) cents = 0;
  }
  return { ok: true, k, a, cents };
}

export type Servicio = {
  id: string; sec: string | null; name: Bi; desc: Bi; cents: number; dur: number; buf: number; desde: boolean; opts: OpcionSvc[]; k: string | null; a: AttrsSP;
  extra: boolean; foto: string | null; oculto: boolean; adm: string | null; sort: number; hacen: { id: string; cents: number | null }[];
};
export type Persona = { id: string; nombre: string; kind: "owner" | "staff" | "renter"; silla: number | null; auto: boolean; resp: number | null; dep: number | null; recibe: boolean; mostrar: boolean; foto: string | null;
  cobro: "none" | "pending" | "restricted" | "enabled"; banco: string | null; invitado: boolean; usuario: boolean }; // cuenta de cobro propia (sillas rentadas, 3d)
export type Politica = { auto: boolean; resp: number; dep: number; cxh: number; tol: number; pick: boolean; exp: number };
export type SvcPanel = {
  rubro: RubroSvc | null;
  model: "emp" | "comm" | "chair"; rent: number | null; comm: number | null;
  secciones: { id: string; name: Bi; sort: number }[]; servicios: Servicio[]; gente: Persona[]; pol: Politica;
  on: boolean; off: { svc: string | null; citas: string | null };
  sp: HerrSP | null; // Tu herramienta de Doctores y Profesionales (4h-2)
  fiesta: import("./fiestas-comun").HerrFiesta | null; // Tu herramienta de Fiestas (4t)
  trans: import("./transporte-comun").HerrTrans | null; // Tu herramienta de Transporte (4w)
  noche: import("./noche-comun").HerrNoche | null; // «Esta noche» (4na)
};
export const POL_DEF: Politica = { auto: false, resp: 30, dep: 0, cxh: 2, tol: 15, pick: true, exp: 2 };

export async function serviciosPanel(negocio: string): Promise<SvcPanel> {
  const [b, S, I, H, G, P] = await Promise.all([
    db().query<{ model: SvcPanel["model"]; rent: number | null; comm: number | null; mods: string[]; off: Record<string, { reason?: string }> | null; cat: string }>(
      `select svc_model as model, svc_rent_cents as rent, svc_comm_pct as comm, modules_on as mods, modules_off as off, category_id as cat from businesses where id = $1`, [negocio]),
    db().query<{ id: string; name: Bi; sort: number }>(`select id::text, name, sort from item_sections where business_id = $1 and module = 'svc' and removed_at is null order by sort, id`, [negocio]),
    db().query<Omit<Servicio, "hacen">>(
      `select i.id::text, i.section_id::text as sec, i.name, coalesce(i.descr, '{"es":"","en":""}'::jsonb) as desc, i.price_cents as cents, coalesce(i.duration_min, 30) as dur, i.buffer_min as buf,
              i.price_from as desde, i.svc_opts as opts, i.svc_kind as k, coalesce(i.svc_attrs, '{}'::jsonb) as a, i.is_extra as extra, i.photos[1] as foto, not i.sell as oculto, case when i.status = 'hidden' then coalesce(i.hidden_reason, '') end as adm, i.sort
         from items i where i.business_id = $1 and i.module = 'svc' and i.removed_at is null order by i.is_extra, i.sort, i.id`, [negocio]),
    db().query<{ item: string; member: string; cents: number | null }>(
      `select s.item_id::text as item, s.member_id::text as member, s.price_cents as cents from staff_services s join items i on i.id = s.item_id where i.business_id = $1`, [negocio]),
    db().query<Persona>(
      `select m.id::text, m.display_name as nombre, m.kind, m.chair_seat as silla, m.chair_auto as auto, m.chair_response_min as resp, m.chair_deposit_cents as dep,
              m.takes_bookings as recibe, m.show_on_page and m.hidden_by_admin is null as mostrar, m.photo_url as foto,
              coalesce(mp.status, 'none') as cobro, mp.bank_last4 as banco, m.payout_invited_at is not null as invitado, m.user_id is not null as usuario
         from business_members m left join member_payout_accounts mp on mp.member_id = m.id where m.business_id = $1 and m.status = 'active' order by (m.kind = 'owner') desc, m.chair_seat nulls last, m.sort, m.id`, [negocio]),
    db().query<{ auto: boolean; resp: number; dep: number; cxh: number; tol: number; pick: boolean; exp: number }>(
      `select auto_approve as auto, response_min as resp, deposit_cents as dep, cancel_free_h as cxh, tolerance_min as tol, staff_pick as pick, expires_h as exp from booking_policies where business_id = $1`, [negocio]),
  ]);
  const x = b.rows[0]!, off = x.off ?? {}, rub = rubroSP(x.cat);
  return {
    rubro: rubroSvc(x.cat), sp: rub ? await herramientaSP(negocio, rub) : null, fiesta: x.cat === "NEG-FIESTA" ? await (await import("./fiestas")).herramientaFiesta(negocio) : null, trans: x.cat === "NEG-TRANS" ? await (await import("./transporte")).herramientaTrans(negocio) : null,
    noche: x.cat === "NEG-NOCHE" ? await (await import("./noche")).herramientaNoche(negocio) : null, model: x.model, rent: x.rent, comm: x.comm, secciones: S.rows,
    servicios: I.rows.map((s) => ({ ...s, hacen: H.rows.filter((h) => h.item === s.id).map((h) => ({ id: h.member, cents: h.cents })) })),
    gente: G.rows, pol: P.rows[0] ?? POL_DEF, on: (x.mods ?? []).includes("citas"),
    off: { svc: off.svc ? off.svc.reason ?? "" : null, citas: off.citas ? off.citas.reason ?? "" : null },
  };
}

/* Duración y precio con las opciones elegidas (el cliente lo ve; el tiempo entre citas no). */
export function conOpciones(s: Pick<Servicio, "cents" | "dur" | "opts">, elegidas: Record<number, number>) {
  let c = s.cents, m = s.dur;
  s.opts.forEach((g, gi) => { const o = g.o[elegidas[gi] ?? -1]; if (o) { c += o.p; m += o.m; } });
  return { cents: Math.max(0, c), dur: Math.max(5, m) };
}
