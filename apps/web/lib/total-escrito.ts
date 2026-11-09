import "server-only";
import { cfgSql } from "./config";
import type { PoolClient } from "pg";
import { db, tx } from "./db";
import { usd } from "./pro-comun";

/* «El total, por escrito» (Fase 4 · 4l-2 · fase4-salud-pro.md §4l). La consulta de un profesional (C-…, rubro 'pro'):
   confirmada → «Pasó la consulta» (status_detail 'consulted') → la oficina manda el total (versión 1, 2…; la nueva reemplaza)
   ('quote') → el cliente lo acepta con los extras que quiera ('hired', queda su acuerdo con hora, versión e IP) o no
   ('nohire', status done) → «Terminó el trámite» ('done'). El total vale 30 días. Nada se cobra en la app (Preguntas #1): se
   paga a la oficina, y lo del gobierno lo paga el cliente a la agencia; To'Latino nunca lo cobra. El servidor calcula el total. */
type Bi = { es: string; en: string };
const NUM = /^C-\d{1,10}$/;
export type Extra = { name: Bi; cents: number };
export type TotalVista = { version: number; fee: number; gov: number; credit: number; hours: string | null; extras: Extra[]; note: Bi | null; total: number; status: string; vence: string; aceptado: string | null; extrasOk: number[] };
type Res = { ok: true } | { ok: false; msg: Bi };
const no = (es: string, en: string): Res => ({ ok: false, msg: { es, en } });

export async function totalDe(opId: string, c?: PoolClient): Promise<TotalVista | null> {
  return (await (c ?? db()).query<TotalVista>(
    `select t.version, t.fee_cents as fee, t.gov_cents as gov, t.credit_cents as credit, t.hours, t.extras, t.note, t.total_cents as total, t.status,
            to_char(t.valid_until at time zone ci.timezone, 'FMDD/FMMM/YYYY') as vence, to_char(t.accepted_at at time zone ci.timezone, 'FMDD/FMMM/YYYY FMHH12:MI AM') as aceptado,
            coalesce(t.accepted_extras, '{}') as "extrasOk"
       from written_totals t join cities ci on ci.id = t.city_id where t.operation_id = $1::bigint and t.status <> 'superseded' order by t.version desc limit 1`, [opId])).rows[0] ?? null;
}

type OpPro = { id: string; number: string; status: string; detail: string | null; biz: string; city: string; uid: string; det: Record<string, unknown>; negocio: string; cliente: string };
async function leerPro(c: PoolClient, where: string, args: unknown[]) {
  return (await c.query<OpPro>(
    `select o.id::text, o.number, o.status, o.status_detail as detail, o.business_id as biz, o.city_id as city, o.user_id::text as uid, o.details as det, b.name as negocio, coalesce(u.first_name, '') as cliente
       from operations o join businesses b on b.id = o.business_id join users u on u.id = o.user_id
      where o.kind = 'appointment' and o.details->>'rubro' = 'pro' and ${where} for update of o`, args)).rows[0] ?? null;
}
const ev = (c: PoolClient, op: string, kind: string, actor: "user" | "member" | "system", actorId: string | null, note?: Bi) =>
  c.query(`insert into operation_events (operation_id, kind, actor, actor_id, note) values ($1::bigint, $2, $3, $4, $5::jsonb)`, [op, kind, actor, actorId, note ? JSON.stringify(note) : null]);
const limpio = (v: unknown, n: number) => (typeof v === "string" ? v.replace(/[\u0000-\u001F\u007F]/g, "").replace(/\s+/g, " ").trim().slice(0, n) : "");

/* El negocio: pasó la consulta · mandar el total (versión nueva) · terminó el trámite. */
export async function pasoPro(negocio: string, numero: string, paso: "consulta" | "terminado", actorId: string): Promise<Res> {
  if (!NUM.test(numero)) return no("Esa consulta no existe.", "That consultation does not exist.");
  let despues: (() => Promise<void>) | null = null;
  const r = await tx(async (c): Promise<Res> => {
    const o = await leerPro(c, "o.business_id = $1 and o.number = $2", [negocio, numero]);
    if (!o) return no("Esa consulta no existe.", "That consultation does not exist.");
    if (paso === "consulta") {
      if (o.status !== "confirmed" || o.detail) return no("Esta consulta ya cambió. Actualiza la pantalla.", "This consultation already changed. Refresh the screen.");
      await c.query(`update operations set status_detail = 'consulted', updated_at = now() where id = $1::bigint`, [o.id]);
      await ev(c, o.id, "consulted", "member", actorId, { es: "Pasó la consulta", en: "Consultation done" });
      return { ok: true };
    }
    if (o.status !== "confirmed" || !["hired", "consulted"].includes(o.detail ?? "")) return no("Primero el cliente acepta el total, o marca que pasó la consulta.", "First the client accepts the total, or mark the consultation as done.");
    await c.query(`update operations set status = 'done', status_detail = 'done', done_at = now(), updated_at = now() where id = $1::bigint`, [o.id]);
    await ev(c, o.id, "case_done", "member", actorId, { es: "Terminó el trámite", en: "Case finished" });
    despues = async () => { const { avisar } = await import("./avisos"); await avisar(o.uid, "pro_terminado", { negocio: o.negocio }, { href: `/cita/${numero}`, ref: ["appointment", numero] }); };
    return { ok: true };
  });
  if (r.ok && despues) await (despues as () => Promise<void>)();
  return r;
}

export type TotalIn = { fee: number; gov: number; hours?: string | null; extras?: { es: string; en?: string; cents: number }[]; note?: string };
export async function mandarTotal(negocio: string, numero: string, f: TotalIn, actorId: string): Promise<Res> {
  if (!NUM.test(numero)) return no("Esa consulta no existe.", "That consultation does not exist.");
  const fee = Math.round(Number(f?.fee)), gov = Math.round(Number(f?.gov ?? 0));
  if (!(fee >= 0 && fee <= 10_000_000 && fee % 100 === 0)) return no("El honorario va en dólares enteros.", "The fee goes in whole dollars.");
  if (!(gov >= 0 && gov <= 5_000_000 && gov % 100 === 0)) return no("Lo del gobierno va en dólares enteros.", "The government fee goes in whole dollars.");
  if (fee + gov <= 0) return no("Pon el honorario.", "Set the fee.");
  const hours = f?.hours ? limpio(f.hours, 9).replace("-", "–") : null;
  if (hours && !/^\d{1,3}(–\d{1,3})?$/.test(hours)) return no("Las horas estimadas van así: 8–15.", "Estimated hours go like this: 8–15.");
  const extras: Extra[] = [];
  for (const x of (Array.isArray(f?.extras) ? f.extras : []).slice(0, 3)) {
    const es = limpio(x?.es, 60), en = limpio(x?.en, 60) || es, cents = Math.round(Number(x?.cents));
    if (!es) continue;
    if (!(cents > 0 && cents <= 1_000_000 && cents % 100 === 0)) return no("Cada extra lleva su precio en dólares enteros.", "Each extra needs its price in whole dollars.");
    extras.push({ name: { es, en }, cents });
  }
  const nota = limpio(f?.note, 200);
  let despues: (() => Promise<void>) | null = null;
  const r = await tx(async (c): Promise<Res> => {
    const o = await leerPro(c, "o.business_id = $1 and o.number = $2", [negocio, numero]);
    if (!o) return no("Esa consulta no existe.", "That consultation does not exist.");
    if (o.status !== "confirmed" || !["consulted", "quote"].includes(o.detail ?? "")) return no("El total se manda después de la consulta.", "The total is sent after the consultation.");
    // Crédito: la consulta se descuenta si el servicio lo dice (y nunca más que el honorario).
    const credit = o.det?.cred && o.det?.k === "cons" ? Math.min(fee, Math.max(0, Math.round(Number(o.det?.honorario ?? 0)))) : 0;
    const total = fee - credit + gov;
    const v = (await c.query<{ v: number }>(`select coalesce(max(version), 0) + 1 as v from written_totals where operation_id = $1::bigint`, [o.id])).rows[0]!.v;
    if (v > 20) return no("Ya mandaste muchas versiones de este total.", "You already sent many versions of this total.");
    await c.query(`update written_totals set status = 'superseded' where operation_id = $1::bigint and status = 'sent'`, [o.id]);
    await c.query(
      `insert into written_totals (operation_id, business_id, city_id, version, fee_cents, gov_cents, credit_cents, hours, extras, note, total_cents, valid_until, created_by)
       values ($1::bigint, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11, now() + make_interval(days => ${cfgSql("sp_total_escrito_dias")}), $12)`,
      [o.id, o.biz, o.city, v, fee, gov, credit, hours, JSON.stringify(extras), nota ? JSON.stringify({ es: nota, en: nota }) : null, total, actorId]);
    await c.query(`update operations set status_detail = 'quote', updated_at = now() where id = $1::bigint`, [o.id]);
    await ev(c, o.id, "total_sent", "member", actorId, { es: `Mandó el total por escrito (versión ${v}): ${usd(total)}`, en: `Sent the written total (version ${v}): ${usd(total)}` });
    despues = async () => { const { avisar } = await import("./avisos"); await avisar(o.uid, "pro_total", { negocio: o.negocio, total: usd(total) }, { href: `/cita/${numero}`, ref: ["appointment", numero] }); };
    return { ok: true };
  });
  if (r.ok && despues) await (despues as () => Promise<void>)();
  return r;
}

/* El cliente: aceptar (con los extras que quiera) o no contratar. La aceptación queda con hora, versión e IP. */
export async function decidirTotal(userId: string, numero: string, acepta: boolean, version: number, extrasOk: number[], ip: string | null): Promise<Res> {
  if (!NUM.test(numero)) return no("Esa consulta no existe.", "That consultation does not exist.");
  let despues: (() => Promise<void>) | null = null;
  const r = await tx(async (c): Promise<Res> => {
    const o = await leerPro(c, "o.user_id = $1 and o.number = $2", [userId, numero]);
    if (!o) return no("Esa consulta no existe.", "That consultation does not exist.");
    if (o.status !== "confirmed" || o.detail !== "quote") return no("Este total ya cambió. Actualiza la pantalla.", "This total already changed. Refresh the screen.");
    const t = (await c.query<{ id: string; version: number; total: number; fee: number; credit: number; extras: Extra[]; vencido: boolean }>(
      `select id::text, version, total_cents as total, fee_cents as fee, credit_cents as credit, extras, valid_until < now() as vencido from written_totals
        where operation_id = $1::bigint and status = 'sent' order by version desc limit 1 for update`, [o.id])).rows[0];
    if (!t) return no("Este total ya no está vigente.", "This total is no longer valid.");
    // Aceptas lo que viste: si la oficina mandó una versión nueva mientras mirabas, la tienes que revisar.
    if (t.version !== Math.round(Number(version))) return no("La oficina mandó una versión nueva del total. Revísala.", "The office sent a new version of the total. Review it.");
    if (t.vencido) return no("Este total venció. Pídele uno nuevo a la oficina.", "This total expired. Ask the office for a new one.");
    if (!acepta) {
      await c.query(`update written_totals set status = 'declined' where id = $1::bigint`, [t.id]);
      await c.query(`update operations set status = 'done', status_detail = 'nohire', done_at = now(), updated_at = now() where id = $1::bigint`, [o.id]);
      await ev(c, o.id, "no_hire", "user", userId, { es: "No contrató: solo la consulta", en: "Did not hire: consultation only" });
      despues = async () => { const { avisarNegocio } = await import("./avisos"); await avisarNegocio(o.biz, "biz_pro_no", { cliente: o.cliente }, { href: `/panel/${o.biz}/hoy?det=cita:${numero}`, ref: ["appointment", numero] }); };
      return { ok: true };
    }
    const ok = [...new Set((Array.isArray(extrasOk) ? extrasOk : []).map(Number))].filter((i) => Number.isInteger(i) && i >= 0 && i < t.extras.length);
    const extra = ok.reduce((n, i) => n + (t.extras[i]?.cents ?? 0), 0);
    await c.query(`update written_totals set status = 'accepted', accepted_at = now(), accepted_ip = $2, accepted_extras = $3 where id = $1::bigint`, [t.id, ip ? ip.slice(0, 64) : null, ok]);
    // Lo que se paga a la oficina: honorario − crédito + extras aceptados (lo del gobierno nunca pasa por To'Latino).
    await c.query(`update operations set status_detail = 'hired', total_cents = $2, subtotal_cents = $2, updated_at = now() where id = $1::bigint`, [o.id, t.fee - t.credit + extra]);
    await ev(c, o.id, "total_accepted", "user", userId, { es: `Aceptó el total por escrito (versión ${t.version})${ok.length ? ` con ${ok.length} extra(s)` : ""}`, en: `Accepted the written total (version ${t.version})${ok.length ? ` with ${ok.length} extra(s)` : ""}` });
    despues = async () => { const { avisarNegocio } = await import("./avisos"); await avisarNegocio(o.biz, "biz_pro_ok", { cliente: o.cliente, total: usd(t.total + extra), extras: ok.length ? ` (con ${ok.length} extra)` : "" }, { href: `/panel/${o.biz}/hoy?det=cita:${numero}`, ref: ["appointment", numero] }); };
    return { ok: true };
  });
  if (r.ok && despues) await (despues as () => Promise<void>)();
  return r;
}

/* Barrido: el total que nadie aceptó en 30 días vence (la consulta queda terminada sin contratar). */
export async function vencerTotales() {
  const L = (await db().query<{ op: string }>(
    `with v as (update written_totals set status = 'expired' where status = 'sent' and valid_until < now() returning operation_id)
     update operations o set status = 'done', status_detail = 'nohire', done_at = now(), updated_at = now() from v where o.id = v.operation_id and o.status = 'confirmed' returning o.id::text as op`)).rows;
  for (const x of L) await db().query(`insert into operation_events (operation_id, kind, actor, note) values ($1::bigint, 'no_hire', 'system', $2::jsonb)`, [x.op, JSON.stringify({ es: "Venció el total sin aceptarlo", en: "The total expired without acceptance" })]);
}
