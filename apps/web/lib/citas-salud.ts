import "server-only";
import { cifrar } from "./cifrado";
import { contexto, fecha, gente, huecos, ocupadas, type Ctx, type Hueco, type Persona, type Q } from "./citas";
import { db } from "./db";
import { aceptan, nombreSeguro, precioSalud, type CatSeguro, type Clinica, type SeguroRef } from "./salud-compat";
import { herramientaSP } from "./salud-pro";

/* El Booking de Doctores (Fase 4 · 4j · neg-salud-flow.js APP-NEG-SALUD-BOOKING: 1 Tu seguro + para quién + motivo → 2 Día y
   hora → 3 Revisa y envía). Usa el motor de citas (agenda de cada persona, candado por negocio). Lo propio:
   - Atienden solo profesionales con licencia VERIFICADA; si el consultorio todavía no tiene ninguna verificada, la cita es
     con el consultorio («Cualquiera») y lo decide recepción (decisión reversible, REVISION 4j).
   - El seguro es obligatorio (o «No tengo seguro»); se copia a la cita con si lo aceptan. Nunca bloquea.
   - Nada se cobra en la app: pay_mode 'local', depósito 0. El precio que se copia es una vista para el paciente.
   - Motivo (solo la clave) y nota (cifrada) van a op_private; nunca a operations, avisos ni reseñas. */
type Bi = { es: string; en: string };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, ID = /^\d{1,18}$/;
export const DIAS_S = 14;
export { filtroHoy };
export const MOTIVOS = ["nuevo", "seguimiento", "receta", "papeles", "chequeo"] as const;

async function servicio(c: Q, negocio: string, id: string) {
  return (await c.query<{ id: string; name: Bi; k: string; cents: number; dur: number; esc: boolean; who: string[] }>(
    `select i.id::text, i.name, coalesce(i.svc_kind, 'cons') as k, i.price_cents as cents, coalesce(i.duration_min, 30) as dur, coalesce((i.svc_attrs->>'esc')::boolean, false) as esc,
            coalesce((select array_agg(s.member_id::text) from staff_services s where s.item_id = i.id), '{}') as who
       from items i where i.id = $1::bigint and i.business_id = $2 and i.module = 'svc' and i.removed_at is null and i.sell and i.status = 'live' and not i.is_extra`, [id, negocio])).rows[0] ?? null;
}
async function licenciados(c: Q, negocio: string) {
  return new Set((await c.query<{ id: string }>(`select distinct l.member_id::text as id from licenses l where l.business_id = $1 and l.member_id is not null and l.status = 'valid'`, [negocio])).rows.map((r) => r.id));
}
/* El motor común de Doctores y Profesionales (4l reusa este): agenda de quien tiene licencia verificada (si el negocio tiene
   alguna; si no, el negocio) y que hace ese servicio. */
export async function prepararSP(c: Q, negocio: string, svc: string, con: string, cat: "NEG-SALUD" | "NEG-PRO" = "NEG-SALUD") { return preparar(c, negocio, svc, con, cat); }
async function preparar(c: Q, negocio: string, svc: string, con: string, cat: "NEG-SALUD" | "NEG-PRO" = "NEG-SALUD") {
  const x = await contexto(c, negocio, [cat]);
  if (!x || !ID.test(svc)) return null;
  const s = await servicio(c, negocio, svc);
  if (!s || s.k === "walk") return null;
  const lic = await licenciados(c, negocio);
  let G: Persona[] = (await gente(c, x)).filter((p) => p.recibe);
  if (lic.size) G = G.filter((p) => lic.has(p.id));
  if (s.who.length) { const W = G.filter((p) => s.who.includes(p.id)); if (W.length) G = W; }
  const cand = con !== "any" && UUID.test(con) ? G.filter((p) => p.id === con) : G;
  return { x, s, G, cand, lic, occ: await ocupadas(c, x) };
}
/* Hoy, desde dentro de 1 hora (por video, 30 min). */
const filtroHoy = (x: Ctx, i: number, tele: boolean) => (h: Hueco) => i > 0 || h.m >= x.now + (tele ? 30 : 60);

export type HorasSalud = { dias: { i: number; ymd: string; dow: number; num: string; off: boolean }[]; sl: Hueco[]; sig: { i: number; m: number } | null; dur: number };
export async function horasSalud(negocio: string, svc: string, con: string, i0: number, cat: "NEG-SALUD" | "NEG-PRO" = "NEG-SALUD", remoto = false): Promise<HorasSalud | null> {
  const c = db(), P = await preparar(c, negocio, svc, con, cat);
  if (!P || !P.cand.length) return null;
  const tele = P.s.k === "tele" || remoto, dur = Math.max(15, P.s.dur);
  const L = (k: number) => huecos(P.x, P.cand, k, dur, 0, P.occ).filter(filtroHoy(P.x, k, tele));
  const i = Math.max(0, Math.min(DIAS_S - 1, Math.floor(i0) || 0));
  const dias = Array.from({ length: DIAS_S }, (_, k) => { const ymd = fecha(P.x.hoy, k); return { i: k, ymd, dow: new Date(`${ymd}T12:00:00Z`).getUTCDay(), num: String(Number(ymd.slice(8))), off: !L(k).some((h) => h.free) }; });
  const sl = L(i).map((h) => ({ ...h, who: undefined }));
  let sig: HorasSalud["sig"] = null;
  if (!sl.some((h) => h.free)) for (let k = i + 1; k < DIAS_S && !sig; k++) { const h = L(k).find((z) => z.free); if (h) sig = { i: k, m: h.m }; }
  return { dias, sl, sig, dur };
}

export type CitaSaludIn = { svc: string; con: string; i: number; m: number; seg: string; para: string; why?: string | null; nota?: string; interp?: boolean; sms?: boolean; clave: string };
type Res = { ok: true; numero: string; st: "pend" | "ok" } | { ok: false; msg: Bi; hora?: true };
const no = (es: string, en: string, extra?: { hora?: true }): Res => ({ ok: false, msg: { es, en }, ...extra });

export async function enviarCitaSalud(userId: string, negocio: string, f: CitaSaludIn, entorno: string): Promise<Res> {
  if (!UUID.test(String(f?.clave)) || !ID.test(String(f?.svc)) || !(f?.con === "any" || UUID.test(String(f?.con)))) return no("Revisa tu cita y vuelve a intentarlo.", "Check your visit and try again.");
  const para = ["yo", "hijo", "otro"].includes(String(f.para)) ? String(f.para) : null;
  if (!para) return no("Elige para quién es.", "Choose who it is for.");
  const why = f.why == null || f.why === "" ? null : (MOTIVOS as readonly string[]).includes(String(f.why)) ? String(f.why) : null;
  const nota = String(f.nota ?? "").replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim().slice(0, 300);
  if (/(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/.test(nota)) return no("Por seguridad, sin teléfonos en la nota.", "For safety, no phone numbers in the note.");
  const m = Math.floor(Number(f.m)), i = Math.floor(Number(f.i));
  if (!(m >= 0 && m < 1440 && i >= 0 && i < DIAS_S)) return no("Elige día y hora.", "Choose day and time.");
  const c = await db().connect();
  try {
    await c.query("begin");
    const ya = (await c.query<{ number: string; status: string }>(`select number, status from operations where user_id = $1 and client_key = $2`, [userId, f.clave])).rows[0];
    if (ya) { await c.query("rollback"); return { ok: true, numero: ya.number, st: ya.status === "confirmed" ? "ok" : "pend" }; }
    await c.query(`select pg_advisory_xact_lock(hashtext('cita:' || $1))`, [negocio]);
    const P = await preparar(c, negocio, f.svc, f.con);
    if (!P) { await c.query("rollback"); return no("Ese servicio no se reserva en línea.", "That service is not booked online."); }
    const { x, s } = P;
    if (!x.mods.includes("citas") || x.off.citas || x.off.svc) { await c.query("rollback"); return no(`${x.name} no toma citas en línea por ahora: llama al consultorio.`, `${x.name} is not taking online visits right now: call the clinic.`); }
    if (x.plan !== "pro") {
      const r = (await c.query<{ cap: number; usados: number }>(`select coalesce((select (value #>> '{}')::int from platform_config where key = 'free_ops_cap'), 10) as cap, (select count(*)::int from operations where business_id = $1 and kind <> 'table' and free_quota_month = $2) as usados`, [x.id, x.mes])).rows[0];
      if (r && r.usados >= r.cap) { await c.query("rollback"); return no(`${x.name} no recibe más citas en línea este mes. Llama para pedir tu cita.`, `${x.name} takes no more online visits this month. Call to book.`); }
    }
    const H = await herramientaSP(negocio, "salud", c);
    if (!H || H.rubro !== "salud") { await c.query("rollback"); return no("Ese consultorio no está disponible.", "That clinic is not available."); }
    if (!H.nuevos) {
      const antes = (await c.query(`select 1 from operations where user_id = $1 and business_id = $2 and kind = 'appointment' and status = 'done' limit 1`, [userId, negocio])).rowCount;
      if (!antes) { await c.query("rollback"); return no("Por ahora este consultorio solo atiende a sus pacientes.", "For now this clinic only sees its own patients."); }
    }
    // Tu seguro: uno guardado en tu cuenta o «No tengo seguro». El servidor decide si lo aceptan.
    let seg: (SeguroRef & { last4: string | null }) | null = null;
    if (f.seg === "none") seg = { kind: "none", insurer: null, plan: null, last4: null };
    else if (UUID.test(String(f.seg))) seg = (await c.query<SeguroRef & { last4: string | null }>(`select kind, insurer, plan, member_last4 as last4 from user_insurances where id = $1::uuid and user_id = $2 and removed_at is null`, [f.seg, userId])).rows[0] ?? null;
    if (!seg) { await c.query("rollback"); return no("Agrega tu seguro o elige «No tengo seguro».", "Add your insurance or choose “No insurance”."); }
    const cat = (await c.query<CatSeguro>(`select key, kind, name, plans from insurers where state = 'PA'`)).rows;
    const cl: Clinica = { ins: H.ins, sin: H.sin, cash: H.cash, escala: H.escala };
    const acc = aceptan(cl, seg), P0 = precioSalud({ k: s.k, cents: s.cents, esc: s.esc }, cl, seg, true), P1 = precioSalud({ k: s.k, cents: s.cents, esc: s.esc }, cl, seg, false);
    if (!acc && !H.sin && seg.kind === "none") { await c.query("rollback"); return no(`${x.name} no atiende sin seguro.`, `${x.name} does not see uninsured patients.`); }
    const dur = Math.max(15, s.dur);
    const h = huecos(x, P.cand, i, dur, 0, P.occ).filter(filtroHoy(x, i, s.k === "tele")).find((z) => z.m === m);
    if (!h?.free || !h.who) { await c.query("rollback"); return no("Esa hora ya no está libre. Elige otra.", "That time is no longer open. Pick another.", { hora: true }); }
    const pend = (await c.query<{ n: number }>(`select count(*)::int as n from operations where user_id = $1 and kind = 'appointment' and status = 'pending'`, [userId])).rows[0]?.n ?? 0;
    if (pend >= 3) { await c.query("rollback"); return no("Tienes 3 solicitudes esperando respuesta. Espera a que te contesten.", "You have 3 requests waiting for a reply. Wait for an answer."); }
    // Lo que paga sin seguro (la vista que se copia; nada se cobra en la app). Con el seguro aceptado, $0 o copago.
    const sinSeg = s.k === "free" ? (H.sin ? H.cash : 0) : s.cents;
    const total = acc ? 0 : sinSeg, auto = x.pol.auto, ymd = fecha(x.hoy, i);
    const numero = `C-${(await c.query<{ n: string }>(`select nextval('operations_appt_seq')::text as n`)).rows[0]!.n}`;
    const det = {
      rubro: "salud", svc: s.name, svcId: s.id, k: s.k, tele: s.k === "tele", para, sms: f.sms !== false, cualquiera: f.con === "any",
      seguro: { kind: seg.kind, insurer: seg.insurer, plan: seg.plan, last4: seg.last4, acepta: acc, nombre: { es: nombreSeguro(seg, cat, true), en: nombreSeguro(seg, cat, false) } },
      precio: { es: `${P0.l}${P0.s ? ` · ${P0.s}` : ""}`, en: `${P1.l}${P1.s ? ` · ${P1.s}` : ""}` }, sinSeg,
    };
    const op = (await c.query<{ id: string }>(
      `insert into operations (number, kind, city_id, business_id, user_id, member_id, status, scheduled_at, duration_min, buffer_min, customer_note, details,
                               subtotal_cents, total_cents, deposit_cents, pay_mode, respond_by, confirmed_at, answered_at, free_quota_month, client_key, is_test)
       values ($1, 'appointment', $2, $3, $4, $5, $6, ($7::date + make_interval(mins => $8::int)) at time zone $9, $10, 0, null, $11::jsonb,
               $12, $12, 0, 'local', case when $6 = 'pending' then least(now() + make_interval(hours => $13::int), ($7::date + make_interval(mins => $8::int)) at time zone $9) end,
               case when $6 = 'confirmed' then now() end, case when $6 = 'confirmed' then now() end, $14, $15, $16) returning id::text`,
      [numero, x.city, x.id, userId, h.who, auto ? "confirmed" : "pending", ymd, m, x.tz, dur, JSON.stringify(det), total, x.pol.exp, x.plan === "pro" ? null : x.mes, f.clave, entorno !== "produccion"])).rows[0]!.id;
    await c.query(`insert into operation_lines (operation_id, item_id, name, qty, unit_price_cents, line_total_cents, tax_pct, options) values ($1, $2, $3::jsonb, 1, $4, $4, 0, '[]'::jsonb)`, [op, s.id, JSON.stringify(s.name), total]);
    // Lo privado: motivo (clave) y nota cifrada. Nunca en operations.
    await c.query(`insert into op_private (operation_id, reason, note_enc, interp) values ($1::bigint, $2, $3, $4)`, [op, why, nota ? cifrar(nota) : null, f.interp === true]);
    await c.query(`insert into operation_events (operation_id, kind, actor, actor_id) values ($1, 'sent', 'user', $2)`, [op, userId]);
    if (auto) await c.query(`insert into operation_events (operation_id, kind, actor, note) values ($1, 'accepted', 'system', $2::jsonb)`, [op, JSON.stringify({ es: "Confirmada al instante", en: "Confirmed instantly" })]);
    await c.query("commit");
    return { ok: true, numero, st: auto ? "ok" : "pend" };
  } catch (e) {
    await c.query("rollback").catch(() => undefined);
    throw e;
  } finally {
    c.release();
  }
}

/* Avisos al enviar (neutros: sin consultorio ni servicio). */
export async function avisarCitaSalud(numero: string) {
  const o = (await db().query<{ biz: string; uid: string; st: string; dia: string; hora: string; resp: number }>(
    `select o.business_id as biz, o.user_id::text as uid, o.status as st, to_char(o.scheduled_at at time zone c.timezone, 'FMDD/FMMM') as dia, to_char(o.scheduled_at at time zone c.timezone, 'FMHH12:MI AM') as hora,
            coalesce(p.response_min, 30) as resp
       from operations o join cities c on c.id = o.city_id left join booking_policies p on p.business_id = o.business_id where o.number = $1 and o.kind = 'appointment'`, [numero]).catch(() => ({ rows: [] }))).rows[0];
  if (!o) return;
  const { avisar, avisarNegocio } = await import("./avisos");
  await avisarNegocio(o.biz, "biz_sal_cita", { dia: o.dia, hora: o.hora, min: o.resp }, { href: `/panel/${o.biz}/hoy?det=cita:${numero}`, ref: ["appointment", numero] });
  if (o.st === "confirmed") await avisar(o.uid, "sal_cita_ok", { dia: o.dia, hora: o.hora }, { href: `/cita/${numero}`, ref: ["appointment", numero] });
}
