import "server-only";
import { cifrar } from "./cifrado";
import { fecha, huecos } from "./citas";
import { DIAS_S, filtroHoy, prepararSP } from "./citas-salud";
import { db } from "./db";
import { precioPro } from "./pro-comun";
import { herramientaSP } from "./salud-pro";

/* La consulta con un profesional (Fase 4 · 4l-1 · neg-pro-flow.js APP-NEG-PRO-BOOKING: 1 Tu trámite (quién puede por ley,
   cómo quieres la consulta, tu situación, nota) → 2 Día y hora → 3 Revisa y envía). Mismo motor que Doctores (agenda de quien
   tiene licencia verificada, candado por negocio). Nada se cobra en la app (Preguntas #1): pay_mode 'local', sin tarjeta ni
   comisión. La situación (clave) y la nota (cifrada) van a op_private; los avisos al negocio no dicen el trámite. */
type Bi = { es: string; en: string };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, ID = /^\d{1,18}$/;
export const SITUACION = ["primera", "caso", "carta", "fecha"] as const;
export const MODOS = ["oficina", "video", "telefono"] as const;
export type CitaProIn = { svc: string; con: string; i: number; m: number; modo: string; sit?: string | null; nota?: string; sms?: boolean; clave: string };
type Res = { ok: true; numero: string; st: "pend" | "ok" } | { ok: false; msg: Bi; hora?: true };
const no = (es: string, en: string, extra?: { hora?: true }): Res => ({ ok: false, msg: { es, en }, ...extra });

async function attrs(negocio: string, svc: string) {
  return (await db().query<{ rem: boolean; gov: number; mes: boolean; hrs: string | null; unit: string | null; cred: boolean }>(
    `select coalesce((svc_attrs->>'rem')::boolean, false) as rem, coalesce((svc_attrs->>'gov')::int, 0) as gov, coalesce((svc_attrs->>'mes')::boolean, false) as mes,
            svc_attrs->>'hrs' as hrs, svc_attrs->>'unit' as unit, coalesce((svc_attrs->>'cred')::boolean, false) as cred
       from items where id = $1::bigint and business_id = $2`, [svc, negocio])).rows[0] ?? null;
}

export async function enviarCitaPro(userId: string, negocio: string, f: CitaProIn, entorno: string): Promise<Res> {
  if (!UUID.test(String(f?.clave)) || !ID.test(String(f?.svc)) || !(f?.con === "any" || UUID.test(String(f?.con)))) return no("Revisa tu consulta y vuelve a intentarlo.", "Check your consultation and try again.");
  const modo = (MODOS as readonly string[]).includes(String(f.modo)) ? String(f.modo) : null;
  if (!modo) return no("Elige cómo quieres la consulta.", "Choose how you want the consultation.");
  const sit = f.sit == null || f.sit === "" ? null : (SITUACION as readonly string[]).includes(String(f.sit)) ? String(f.sit) : null;
  // Nunca números de caso, A-number ni teléfonos en la nota (Preguntas #5).
  const nota = String(f.nota ?? "").replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim().slice(0, 300);
  if (/(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/.test(nota)) return no("Por seguridad, sin teléfonos en la nota.", "For safety, no phone numbers in the note.");
  if (/\bA[\s-]?\d{8,9}\b|\b[A-Z]{3}\d{10}\b/i.test(nota)) return no("No escribas números de caso, A-number ni documentos en la nota.", "Do not write case numbers, A-numbers or documents in the note.");
  const m = Math.floor(Number(f.m)), i = Math.floor(Number(f.i));
  if (!(m >= 0 && m < 1440 && i >= 0 && i < DIAS_S)) return no("Elige día y hora.", "Choose day and time.");
  const A = await attrs(negocio, String(f.svc));
  if (!A) return no("Ese servicio ya no está disponible.", "That service is no longer available.");
  if (modo !== "oficina" && !A.rem) return no("Este servicio es solo en la oficina.", "This service is in the office only.");
  const c = await db().connect();
  try {
    await c.query("begin");
    const ya = (await c.query<{ number: string; status: string }>(`select number, status from operations where user_id = $1 and client_key = $2`, [userId, f.clave])).rows[0];
    if (ya) { await c.query("rollback"); return { ok: true, numero: ya.number, st: ya.status === "confirmed" ? "ok" : "pend" }; }
    await c.query(`select pg_advisory_xact_lock(hashtext('cita:' || $1))`, [negocio]);
    const P = await prepararSP(c, negocio, f.svc, f.con, "NEG-PRO");
    if (!P || !P.cand.length) { await c.query("rollback"); return no("Ese servicio no se pide en línea.", "That service is not booked online."); }
    const { x, s } = P;
    if (!x.mods.includes("citas") || x.off.citas || x.off.svc) { await c.query("rollback"); return no(`${x.name} no toma consultas en línea por ahora: llama a la oficina.`, `${x.name} is not taking online consultations right now: call the office.`); }
    if (x.plan !== "pro") {
      const r = (await c.query<{ cap: number; usados: number }>(`select coalesce((select (value #>> '{}')::int from platform_config where key = 'free_ops_cap'), 10) as cap, (select count(*)::int from operations where business_id = $1 and kind <> 'table' and free_quota_month = $2) as usados`, [x.id, x.mes])).rows[0];
      if (r && r.usados >= r.cap) { await c.query("rollback"); return no(`${x.name} no recibe más consultas en línea este mes. Llama a la oficina.`, `${x.name} takes no more online consultations this month. Call the office.`); }
    }
    const H = await herramientaSP(negocio, "pro", c);
    const dur = Math.max(15, s.dur);
    const h = huecos(x, P.cand, i, dur, 0, P.occ).filter(filtroHoy(x, i, modo !== "oficina")).find((z) => z.m === m);
    if (!h?.free || !h.who) { await c.query("rollback"); return no("Esa hora ya no está libre. Elige otra.", "That time is no longer open. Pick another.", { hora: true }); }
    const pend = (await c.query<{ n: number }>(`select count(*)::int as n from operations where user_id = $1 and kind = 'appointment' and status = 'pending'`, [userId])).rows[0]?.n ?? 0;
    if (pend >= 3) { await c.query("rollback"); return no("Tienes 3 solicitudes esperando respuesta. Espera a que te contesten.", "You have 3 requests waiting for a reply. Wait for an answer."); }
    const pr = { k: s.k, cents: s.cents, gov: A.gov, mes: A.mes, hrs: A.hrs, unit: A.unit, cred: A.cred };
    const P0 = precioPro(pr, true), P1 = precioPro(pr, false);
    // Lo de la consulta: si es una consulta con precio, ese precio (se paga en la oficina); lo demás llega por escrito (4l-2).
    const total = s.k === "cons" || s.k === "walk" ? s.cents : 0, auto = x.pol.auto, ymd = fecha(x.hoy, i);
    const numero = `C-${(await c.query<{ n: string }>(`select nextval('operations_appt_seq')::text as n`)).rows[0]!.n}`;
    const det = {
      rubro: "pro", legal: !!(H && H.rubro === "pro" && H.legal), svc: s.name, svcId: s.id, k: s.k, modo, sms: f.sms !== false, cualquiera: f.con === "any",
      precio: { es: `${P0.l}${P0.s ? ` · ${P0.s}` : ""}`, en: `${P1.l}${P1.s ? ` · ${P1.s}` : ""}` }, honorario: s.cents, gov: A.gov, cred: A.cred, hrs: A.hrs,
    };
    const op = (await c.query<{ id: string }>(
      `insert into operations (number, kind, city_id, business_id, user_id, member_id, status, scheduled_at, duration_min, buffer_min, customer_note, details,
                               subtotal_cents, total_cents, deposit_cents, pay_mode, respond_by, confirmed_at, answered_at, free_quota_month, client_key, is_test)
       values ($1, 'appointment', $2, $3, $4, $5, $6, ($7::date + make_interval(mins => $8::int)) at time zone $9, $10, 0, null, $11::jsonb,
               $12, $12, 0, 'local', case when $6 = 'pending' then least(now() + make_interval(hours => $13::int), ($7::date + make_interval(mins => $8::int)) at time zone $9) end,
               case when $6 = 'confirmed' then now() end, case when $6 = 'confirmed' then now() end, $14, $15, $16) returning id::text`,
      [numero, x.city, x.id, userId, h.who, auto ? "confirmed" : "pending", ymd, m, x.tz, dur, JSON.stringify(det), total, x.pol.exp, x.plan === "pro" ? null : x.mes, f.clave, entorno !== "produccion"])).rows[0]!.id;
    await c.query(`insert into operation_lines (operation_id, item_id, name, qty, unit_price_cents, line_total_cents, tax_pct, options) values ($1, $2, $3::jsonb, 1, $4, $4, 0, '[]'::jsonb)`, [op, s.id, JSON.stringify(s.name), total]);
    await c.query(`insert into op_private (operation_id, reason, note_enc) values ($1::bigint, $2, $3)`, [op, sit, nota ? cifrar(nota) : null]);
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

/* Avisos al enviar: al negocio sin el trámite; al cliente, si quedó confirmada (puede llevar la oficina, nunca el trámite). */
export async function avisarCitaPro(numero: string, cliente: string) {
  const o = (await db().query<{ biz: string; uid: string; negocio: string; st: string; dia: string; hora: string; con: string | null; resp: number }>(
    `select o.business_id as biz, o.user_id::text as uid, b.name as negocio, o.status as st, to_char(o.scheduled_at at time zone c.timezone, 'FMDD/FMMM') as dia,
            to_char(o.scheduled_at at time zone c.timezone, 'FMHH12:MI AM') as hora, m.display_name as con, coalesce(p.response_min, 30) as resp
       from operations o join businesses b on b.id = o.business_id join cities c on c.id = o.city_id left join business_members m on m.id = o.member_id
       left join booking_policies p on p.business_id = o.business_id where o.number = $1 and o.kind = 'appointment'`, [numero]).catch(() => ({ rows: [] }))).rows[0];
  if (!o) return;
  const { avisar, avisarNegocio } = await import("./avisos");
  const { primerNombre } = await import("./nombre");
  await avisarNegocio(o.biz, "biz_pro_cita", { cliente, dia: o.dia, hora: o.hora, con: o.con ? ` con ${primerNombre(o.con)}` : "", min: o.resp }, { href: `/panel/${o.biz}/hoy?det=cita:${numero}`, ref: ["appointment", numero] });
  if (o.st === "confirmed") await avisar(o.uid, "cita_ok", { negocio: o.negocio, dia: o.dia, hora: o.hora }, { href: `/cita/${numero}`, ref: ["appointment", numero] });
}
