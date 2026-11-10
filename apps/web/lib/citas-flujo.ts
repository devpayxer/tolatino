import "server-only";
import { cfgSql } from "./config";
import { db, tx } from "./db";
import { cobrarOperacion, devolverPago, liberarOperacion } from "./cobros";
import { cobrarLiquidacion, conEstimado, planLiquidar } from "./estimados";
import { contexto, fecha, gente, hm2m, horaL, huecos, ocupadas, DIAS, type Q } from "./citas";

/* La vida de una cita después de enviarla (Fase 3 · 3c; prototipo citaVals y Panel v2 reqRow/detBlocks k='cita'):
   - El negocio (o la silla) responde: Confirmar (se cobra el depósito retenido), Otra hora (el sistema propone la
     siguiente hora libre de esa persona; el cliente tiene 2 h para aceptarla) o No puedo (se libera el depósito).
   - Vence sola: sin respuesta en `expires_h` (2 h por defecto) o antes de la hora; «otra hora» sin respuesta en 2 h.
   - El cliente: cancelar (gratis si faltan ≥ `cancel_free_h`: se devuelve el depósito; si no, se queda con el negocio),
     aceptar o no la otra hora, «voy tarde», cambiar (pendiente: misma solicitud; confirmada: el negocio acepta el cambio,
     o al instante si confirma solo; el depósito pasa a la nueva hora).
   - El día de la cita: Llegó · en atención → Terminada · cobrar, o No llegó (el depósito se queda).
   - Recordatorios 24 h y 2 h antes (si los pidió) y «Avísame si se libera una hora» cuando una cita se cae.
   Nada se borra: cada paso es un estado y un evento. */
type Bi = { es: string; en: string };
export type ResC = { ok: true; numero?: string } | { ok: false; msg: Bi };
const no = (es: string, en: string): ResC => ({ ok: false, msg: { es, en } });
const NUM = /^C-\d{1,10}$/;
const money = (c: number) => `$${(c / 100).toFixed(2)}`;
type Op = {
  id: string; number: string; status: string; detail: string | null; biz: string; uid: string; mid: string | null; ymd: string; hm: string; dur: number; buf: number; tz: string;
  dep: number; pay: string | null; pid: string | null; amount: number | null; refunded: number | null; cxh: number; exp: number; mins_to: number; det: Record<string, unknown>;
};
const SEL = `select o.id::text, o.number, o.status, o.status_detail as detail, o.business_id as biz, o.user_id::text as uid, o.member_id::text as mid,
       (o.scheduled_at at time zone c.timezone)::date::text as ymd, to_char(o.scheduled_at at time zone c.timezone, 'HH24:MI') as hm, coalesce(o.duration_min, 30) as dur, o.buffer_min as buf,
       c.timezone as tz, o.deposit_cents as dep, p.status as pay, p.id::text as pid, p.amount_cents as amount, p.refunded_cents as refunded,
       coalesce(bp.cancel_free_h, 2) as cxh, coalesce(bp.expires_h, 2) as exp, floor(extract(epoch from o.scheduled_at - now()) / 60)::int as mins_to, o.details as det
  from operations o join cities c on c.id = o.city_id left join booking_policies bp on bp.business_id = o.business_id
  left join payments p on p.operation_id = o.id and p.kind = 'deposit'`;

async function leer(c: Q, where: string, args: unknown[], lock = false): Promise<Op | null> {
  return (await c.query<Op>(`${SEL} where o.kind = 'appointment' and ${where}${lock ? " for update of o" : ""}`, args)).rows[0] ?? null;
}
const ev = (c: Q, op: string, kind: string, actor: "user" | "member" | "system" | "compa", actorId: string | null, note?: Bi) =>
  c.query(`insert into operation_events (operation_id, kind, actor, actor_id, note) values ($1::bigint, $2, $3, $4, $5::jsonb)`, [op, kind, actor, actorId, note ? JSON.stringify(note) : null]);

/* ── Avisos ── */
async function datos(numero: string) {
  return (await db().query<{ uid: string; biz: string; negocio: string; dia: string; hora: string; cliente: string; servicio: string; dep: number; pay: string | null; alt_dia: string | null; alt_hora: string | null; rubro: string | null }>(
    `select o.details->>'rubro' as rubro, o.user_id::text as uid, o.business_id as biz, b.name as negocio, to_char(o.scheduled_at at time zone c.timezone, 'FMDD/FMMM') as dia, to_char(o.scheduled_at at time zone c.timezone, 'FMHH12:MI AM') as hora,
            coalesce(u.first_name, '') as cliente, coalesce(o.details #>> '{svc,es}', '') as servicio, o.deposit_cents as dep, p.status as pay,
            to_char((cp.proposed->>'ymd')::date, 'FMDD/FMMM') as alt_dia, case when cp.proposed ? 'm' then to_char(make_time(((cp.proposed->>'m')::int / 60), ((cp.proposed->>'m')::int % 60), 0), 'FMHH12:MI AM') end as alt_hora
       from operations o join businesses b on b.id = o.business_id join cities c on c.id = o.city_id join users u on u.id = o.user_id
       left join payments p on p.operation_id = o.id and p.kind = 'deposit'
       left join lateral (select proposed from change_proposals where operation_id = o.id order by id desc limit 1) cp on true
      where o.number = $1 and o.kind = 'appointment'`, [numero]).catch(() => ({ rows: [] }))).rows[0] ?? null;
}
/* Doctores (4j · §3): cada aviso tiene su versión neutra (sin consultorio, servicio ni paciente); el que no la tiene no sale. */
const SAL_C: Record<string, string> = { cita_ok: "sal_cita_ok", cita_ok_dep: "sal_cita_ok", cita_no: "sal_cita_no", cita_alt: "sal_cita_alt", cita_exp: "sal_cita_exp", cita_rec: "sal_cita_rec", cita_alt_fin: "sal_cita_alt_fin" };
const SAL_N: Record<string, string> = { biz_cita_cx: "biz_sal_cx", biz_cita_alt_ok: "biz_sal_alt_ok", biz_cita_tarde: "biz_sal_tarde" };
// Profesionales (4l): al negocio nunca el trámite (los avisos que lo nombran tienen su versión sin {servicio}).
const PRO_N: Record<string, string> = { biz_cita_cx: "biz_pro_cx" };
async function avisarCliente(numero: string, tpl: string, extra: Record<string, string> = {}) {
  const d = await datos(numero);
  if (!d) return;
  if (d.rubro === "salud") { const t = SAL_C[tpl]; if (!t) return; tpl = t; }
  const { avisar } = await import("./avisos");
  const dev = extra.dev ?? "";
  await avisar(d.uid, tpl, { negocio: d.negocio, dia: d.dia, hora: d.hora, dep: money(d.dep), alt: d.alt_dia && d.alt_hora ? `${d.alt_dia} ${d.alt_hora}` : "", ...extra, dev }, { href: `/cita/${numero}`, ref: ["appointment", numero] });
}
async function avisarNeg(numero: string, tpl: string, extra: Record<string, string | number> = {}) {
  const d = await datos(numero);
  if (!d) return;
  if (d.rubro === "salud") { const t = SAL_N[tpl]; if (!t) return; tpl = t; }
  if (d.rubro === "pro" && PRO_N[tpl]) tpl = PRO_N[tpl]!;
  const { avisarNegocio } = await import("./avisos");
  await avisarNegocio(d.biz, tpl, { cliente: d.cliente, servicio: d.servicio, dia: d.dia, hora: d.hora, dep: "", ...extra }, { href: `/panel/${d.biz}/hoy?det=cita:${numero}`, ref: ["appointment", numero] });
}
const devL = (dep: number) => (dep ? ` Te devolvemos ${money(dep)} del depósito.` : "");

/* «Avísame si se libera una hora»: una cita de ese día se cayó; se avisa una vez a quien lo pidió (con esa persona o
   con cualquiera). */
async function horaLibre(numero: string) {
  const o = (await db().query<{ biz: string; mid: string | null; ymd: string; negocio: string; rubro: string | null }>(
    `select o.business_id as biz, o.member_id::text as mid, (o.scheduled_at at time zone c.timezone)::date::text as ymd, b.name as negocio, o.details->>'rubro' as rubro
       from operations o join cities c on c.id = o.city_id join businesses b on b.id = o.business_id where o.number = $1`, [numero])).rows[0];
  if (!o || o.rubro === "salud") return;
  const L = (await db().query<{ id: string; uid: string }>(
    `update appointment_alerts set notified_at = now() where business_id = $1 and day = $2::date and removed_at is null and notified_at is null and (member_id is null or member_id::text = $3)
     returning id::text, user_id::text as uid`, [o.biz, o.ymd, o.mid])).rows;
  const { avisar } = await import("./avisos");
  const d = new Date(`${o.ymd}T12:00:00Z`);
  for (const a of L) await avisar(a.uid, "cita_libre", { negocio: o.negocio, dia: `${d.getUTCDate()}/${d.getUTCMonth() + 1}` }, { href: `/n/${o.biz}?tab=svc`, ref: ["appointment", numero] });
}

/* ── Vencer lo que nadie contestó (se llama al mirar la cita, el panel o la ficha; barato: índices parciales) ── */
let ultimoBarrido = 0;
export async function vencerCitas(f: { negocio?: string; userId?: string; numero?: string } = {}) {
  // Solicitudes sin respuesta: vencen a las `expires_h` o al llegar la hora.
  const venc = (await db().query<{ id: string; number: string }>(
    `update operations o set status = 'expired', updated_at = now()
      where o.kind = 'appointment' and o.status = 'pending' and o.respond_by < now() and coalesce(o.status_detail, '') <> 'seg'
        and ($1::text is null or o.business_id = $1) and ($2::uuid is null or o.user_id = $2) and ($3::text is null or o.number = $3)
      returning o.id::text, o.number`, [f.negocio ?? null, f.userId ?? null, f.numero ?? null])).rows;
  // Doctores · «No aceptan tu seguro»: la hora se guarda 2 h; si el paciente no elige, se libera (nunca queda tomada).
  const seg = (await db().query<{ id: string; number: string }>(
    `update operations o set status = 'cancelled', cancelled_by = 'system', cancelled_at = now(), cancel_reason = 'seg_vencida', updated_at = now()
      where o.kind = 'appointment' and o.status = 'pending' and o.status_detail = 'seg' and o.respond_by < now()
        and ($1::text is null or o.business_id = $1) and ($2::uuid is null or o.user_id = $2) and ($3::text is null or o.number = $3)
      returning o.id::text, o.number`, [f.negocio ?? null, f.userId ?? null, f.numero ?? null])).rows;
  for (const x of seg) {
    await db().query(`insert into operation_events (operation_id, kind, actor, note) values ($1::bigint, 'cancelled', 'system', $2::jsonb)`, [x.id, JSON.stringify({ es: "No eligió a tiempo: se liberó la hora", en: "Did not choose in time: the time was released" })]);
    const d = await datos(x.number);
    if (d) { const { avisar } = await import("./avisos"); await avisar(d.uid, "sal_cita_seg_fin", { dia: d.dia }, { href: `/cita/${x.number}`, ref: ["appointment", x.number] }); }
  }
  // «Otra hora» sin respuesta del cliente en 2 h (o al llegar la hora propuesta): no hay cita.
  const alt = (await db().query<{ id: string; number: string }>(
    `with v as (update change_proposals p set status = 'expired', answered_at = now() from operations o
                 where p.operation_id = o.id and o.kind = 'appointment' and o.status = 'change_proposed' and p.status = 'open' and p.side = 'business' and p.respond_by < now()
                   and ($1::text is null or o.business_id = $1) and ($2::uuid is null or o.user_id = $2) and ($3::text is null or o.number = $3) returning o.id)
     update operations o set status = 'cancelled', cancelled_by = 'system', cancelled_at = now(), cancel_reason = 'alt_vencida', updated_at = now() from v where o.id = v.id and o.kind = 'appointment'
     returning o.id::text, o.number`, [f.negocio ?? null, f.userId ?? null, f.numero ?? null])).rows;
  // Cambio pedido por el cliente sin respuesta: la cita sigue como estaba.
  const chg = (await db().query<{ number: string }>(
    `update change_proposals p set status = 'expired', answered_at = now() from operations o
      where p.operation_id = o.id and o.kind = 'appointment' and p.status = 'open' and p.side = 'customer' and p.respond_by < now()
        and ($1::text is null or o.business_id = $1) and ($2::uuid is null or o.user_id = $2) and ($3::text is null or o.number = $3)
      returning o.number`, [f.negocio ?? null, f.userId ?? null, f.numero ?? null])).rows;
  for (const x of venc) {
    await db().query(`insert into operation_events (operation_id, kind, actor, note) values ($1::bigint, 'expired', 'system', $2::jsonb)`, [x.id, JSON.stringify({ es: "Sin respuesta: venció", en: "No reply: expired" })]);
    const d = await datos(x.number); await liberarOperacion(x.id);
    await avisarCliente(x.number, "cita_exp", { dev: d?.pay === "held" ? devL(d.dep) : "" }); await horaLibre(x.number);
  }
  for (const x of alt) {
    await db().query(`insert into operation_events (operation_id, kind, actor, note) values ($1::bigint, 'alt_expired', 'system', $2::jsonb)`, [x.id, JSON.stringify({ es: "Venció la otra hora", en: "The new time expired" })]);
    const d = await datos(x.number); await liberarOperacion(x.id);
    await avisarCliente(x.number, "cita_alt_fin", { dev: d?.pay === "held" ? devL(d.dep) : "" }); await horaLibre(x.number);
  }
  for (const x of chg) await avisarCliente(x.number, "cita_chg_no");
  // Recordatorios: a lo sumo una vez por minuto por proceso.
  if (Date.now() - ultimoBarrido > 60_000) { ultimoBarrido = Date.now(); await recordatorios().catch(() => undefined); await borrarNotas().catch(() => undefined); await import("./total-escrito").then((t) => t.vencerTotales()).catch(() => undefined); await import("./ayuda-cita").then((a) => a.purgarFotosAyuda()).catch(() => undefined); }
}

/* §3: la nota cifrada de una cita (op_private) se borra a los 30 días de que la cita termina (terminada, cancelada, vencida o
   no confirmada). Lo hace el barrido de citas; el guardián privacidadSalud vigila que nadie más la toque. */
async function borrarNotas() {
  await db().query(
    `update op_private p set note_enc = null, purge_at = now() from operations o
      where o.id = p.operation_id and p.note_enc is not null and o.status in ('done', 'cancelled', 'expired', 'declined')
        and coalesce(o.done_at, o.cancelled_at, o.updated_at) < now() - make_interval(days => ${cfgSql("sp_notas_purga_dias")})`);
}

/* Recordatorios 24 h y 2 h antes, a quien lo pidió (Booking › Detalles), una vez cada uno. */
async function recordatorios() {
  for (const [k, desde, hasta, cuando] of [["rec24", "2 hours", "24 hours", { es: "mañana", en: "tomorrow" }], ["rec2", "0 minutes", "2 hours", { es: "hoy", en: "today" }]] as const) {
    const L = (await db().query<{ number: string }>(
      `update operations o set details = o.details || jsonb_build_object('${k}', now()), updated_at = now()
        where o.kind = 'appointment' and o.status = 'confirmed' and coalesce(o.status_detail, '') = '' and coalesce((o.details->>'sms')::boolean, true)
          and not (o.details ? '${k}') and o.scheduled_at > now() + interval '${desde}' and o.scheduled_at <= now() + interval '${hasta}'
          and o.confirmed_at < now() - interval '10 minutes'
        returning o.number`)).rows;
    for (const x of L) await avisarCliente(x.number, "cita_rec", { cuando: cuando.es });
  }
}

/* ── El negocio responde ── */
export type PasoCita = "confirmar" | "otra" | "nopuedo" | "llego" | "nollego" | "terminada" | "noseguro"
  // Auto y Hogar (Fase 4 · 4c): recibido · en camino · llegué · empezar · listo · entregado · no había nadie.
  | "recibido" | "camino" | "llegue" | "empezar" | "listo" | "entregado" | "nadie";
export async function citaPaso(negocio: string, numero: string, paso: PasoCita, actorId: string): Promise<ResC> {
  if (!NUM.test(numero)) return no("Esa cita no existe.", "That booking does not exist.");
  await vencerCitas({ negocio, numero });
  let despues: (() => Promise<void>) | null = null;
  const r = await tx(async (c): Promise<ResC> => {
    await c.query(`select pg_advisory_xact_lock(hashtext('cita:' || $1))`, [negocio]);
    const o = await leer(c, "o.business_id = $1 and o.number = $2", [negocio, numero], true);
    if (!o) return no("Esa cita no existe.", "That booking does not exist.");
    const ya = no("Esta cita ya cambió. Actualiza la pantalla.", "This booking already changed. Refresh the screen.");
    // Doctores: «No aceptamos su seguro» — la hora queda guardada (Configuración · sp_seguro_guardar_h) y el paciente elige (seguir sin seguro, otro seguro u otro consultorio).
    if (paso === "noseguro") {
      const sg = o.det?.seguro as { kind?: string } | undefined;
      if (o.det?.rubro !== "salud" || o.status !== "pending" || o.detail || !sg || sg.kind === "none") return ya;
      await c.query(`update operations set status_detail = 'seg', respond_by = now() + make_interval(hours => ${cfgSql("sp_seguro_guardar_h")}), answered_at = now(), updated_at = now() where id = $1::bigint`, [o.id]);
      await ev(c, o.id, "declined", "member", actorId, { es: "No aceptan su seguro: elige el paciente", en: "Insurance not accepted: the patient chooses" });
      despues = async () => { await avisarSeg(numero); };
      return { ok: true };
    }
    if (o.detail === "seg") return no("El paciente está eligiendo qué hacer (hasta 2 h).", "The patient is choosing what to do (up to 2 h).");
    if (paso === "confirmar" || paso === "nopuedo") {
      if (o.status !== "pending") return o.status === "expired" ? no("Pasó el tiempo para responder: la solicitud venció y se devolvió el depósito.", "The time to reply passed: the request expired and the deposit was returned.") : ya;
      const ok = paso === "confirmar";
      await c.query(`update operations set status = $2, answered_at = now(), confirmed_at = case when $2 = 'confirmed' then now() end, updated_at = now() where id = $1::bigint`, [o.id, ok ? "confirmed" : "declined"]);
      await ev(c, o.id, ok ? "accepted" : "declined", "member", actorId);
      despues = ok
        ? async () => { await cobrarOperacion(o.id); await avisarCliente(numero, o.dep ? "cita_ok_dep" : "cita_ok"); }
        : async () => { await liberarOperacion(o.id); await avisarCliente(numero, "cita_no", { dev: o.pay === "held" ? devL(o.dep) : "" }); await horaLibre(numero); };
      return { ok: true };
    }
    if (paso === "otra") {
      if (o.status !== "pending") return ya;
      // La siguiente hora libre de esa persona después de la pedida (prototipo: el negocio no elige la hora).
      const x = (await contexto(c, negocio))!, G = await gente(c, x), p = G.find((z) => z.id === o.mid);
      if (!p) return no("Esa persona ya no recibe citas. Usa «No puedo».", "That person no longer takes bookings. Use “Can’t”.");
      const occ = await ocupadas(c, x, o.id), i0 = Math.round((Date.parse(o.ymd) - Date.parse(x.hoy)) / 864e5), m0 = hm2m(o.hm);
      let alt: { i: number; m: number } | null = null;
      const hogar = o.det?.rubro === "hogar";
      for (let i = Math.max(0, i0); i < DIAS && !alt; i++) { const h = huecos(x, [p], i, o.dur, o.buf, occ).find((z) => z.free && (i > i0 || z.m > m0) && (!hogar || z.m % 120 === 0)); if (h) alt = { i, m: h.m }; }
      if (!alt) return no("No hay otra hora libre en los próximos 14 días. Usa «No puedo».", "There is no other open time in the next 14 days. Use “Can’t”.");
      const ymd = fecha(x.hoy, alt.i);
      await c.query(`insert into change_proposals (operation_id, kind, proposed, created_by, side, respond_by)
                     values ($1::bigint, 'time', $2::jsonb, $3, 'business', least(now() + interval '2 hours', ($4::date + make_interval(mins => $5::int)) at time zone $6))`,
        [o.id, JSON.stringify({ ymd, m: alt.m, member: o.mid }), actorId, ymd, alt.m, o.tz]);
      await c.query(`update operations set status = 'change_proposed', answered_at = now(), updated_at = now() where id = $1::bigint`, [o.id]);
      await ev(c, o.id, "change_proposed", "member", actorId, { es: `Propusiste ${ymd.slice(8)}/${Number(ymd.slice(5, 7))} a las ${horaL(alt.m)}`, en: `You proposed ${Number(ymd.slice(5, 7))}/${ymd.slice(8)} at ${horaL(alt.m)}` });
      despues = async () => { await avisarCliente(numero, "cita_alt"); };
      return { ok: true };
    }
    if (o.status !== "confirmed") return ya;
    // ── Auto y Hogar: la cita o la visita en curso (status_detail road → in → work → ready → done; noshow). ──
    const rubro = o.det?.rubro as string | undefined;
    if (["recibido", "camino", "llegue", "empezar", "listo", "entregado", "nadie"].includes(paso)) {
      if (rubro !== "auto" && rubro !== "hogar") return ya;
      const pasa = async (detalle: string, kind: string, nota?: Bi) => { await c.query(`update operations set status_detail = $2, updated_at = now() where id = $1::bigint`, [o.id, detalle]); await ev(c, o.id, kind, "member", actorId, nota); };
      const d = o.detail ?? "";
      if (paso === "camino") { if (rubro !== "hogar" || d) return ya; await pasa("road", "on_the_way"); despues = async () => { await avisarCliente(numero, "cita_camino"); }; return { ok: true }; }
      if (paso === "llegue") { if (rubro !== "hogar" || !["", "road"].includes(d)) return ya; await pasa("in", "arrived"); return { ok: true }; }
      if (paso === "recibido") { if (rubro !== "auto" || d) return ya; await pasa("in", "received"); despues = async () => { await avisarCliente(numero, "cita_recibido"); }; return { ok: true }; }
      if (paso === "empezar") {
        if (d !== "in") return ya;
        // Un servicio con estimado (diagnóstico, visita, «desde», se cotiza…) no empieza sin el OK del cliente (4d).
        const k = (await c.query<{ k: string | null }>(`select svc_kind as k from items where id::text = $1`, [o.det?.svcId ?? ""])).rows[0]?.k;
        if (conEstimado(rubro, k)) return no("Primero manda el estimado: nada se hace sin su OK.", "Send the estimate first: nothing is done without their OK.");
        await pasa("work", "started"); return { ok: true };
      }
      if (paso === "listo") { if (!["in", "work"].includes(d)) return ya; await pasa("ready", "ready"); despues = async () => { await avisarCliente(numero, rubro === "auto" ? "cita_listo_auto" : "cita_listo"); }; return { ok: true }; }
      if (paso === "entregado") {
        if (d !== "ready") return ya;
        await c.query(`update operations set status = 'done', status_detail = 'done', done_at = now(), updated_at = now() where id = $1::bigint`, [o.id]);
        await ev(c, o.id, "done", "member", actorId, rubro === "auto" ? { es: "Entregó el carro", en: "Car handed back" } : { es: "Terminó la visita", en: "Visit finished" });
        await planLiquidar(c, o.id, "member", actorId);
        despues = async () => { await cobrarLiquidacion(o.id); };
        return { ok: true };
      }
      // No había nadie (Hogar): solo desde que empieza la franja; el depósito sigue la regla de cancelar tarde.
      if (rubro !== "hogar" || !["", "road"].includes(d)) return ya;
      if (o.mins_to > 0) return no("Todavía no empieza la franja.", "The window has not started yet.");
      await c.query(`update operations set status = 'done', status_detail = 'noshow', done_at = now(), updated_at = now() where id = $1::bigint`, [o.id]);
      await ev(c, o.id, "noshow", "member", actorId, o.dep ? { es: `No había nadie · el depósito de ${money(o.dep)} se queda`, en: `Nobody home · ${money(o.dep)} deposit kept` } : { es: "No había nadie", en: "Nobody home" });
      despues = async () => { await avisarCliente(numero, "cita_nadie"); };
      return { ok: true };
    }
    if (paso === "llego") { if (o.detail) return ya; await c.query(`update operations set status_detail = 'live', updated_at = now() where id = $1::bigint`, [o.id]); await ev(c, o.id, "arrived", "member", actorId); return { ok: true }; }
    if (paso === "nollego") {
      if (o.detail) return ya;
      if (o.mins_to > 0) return no("Todavía no es la hora de la cita.", "It is not time for the booking yet.");
      await c.query(`update operations set status = 'done', status_detail = 'noshow', done_at = now(), updated_at = now() where id = $1::bigint`, [o.id]);
      await ev(c, o.id, "noshow", "member", actorId, o.dep ? { es: `No llegó · el depósito de ${money(o.dep)} se queda`, en: `No-show · ${money(o.dep)} deposit kept` } : undefined);
      return { ok: true };
    }
    if (o.detail !== "live") return ya;
    await c.query(`update operations set status = 'done', status_detail = 'done', done_at = now(), updated_at = now() where id = $1::bigint`, [o.id]);
    await ev(c, o.id, "done", "member", actorId);
    return { ok: true };
  });
  if (r.ok && despues) await (despues as () => Promise<void>)();
  return r;
}

/* El negocio responde al cambio que pidió el cliente (cita confirmada). */
export async function citaCambio(negocio: string, numero: string, que: "aceptar" | "rechazar", actorId: string): Promise<ResC> {
  if (!NUM.test(numero)) return no("Esa cita no existe.", "That booking does not exist.");
  await vencerCitas({ negocio, numero });
  const r = await tx(async (c): Promise<ResC> => {
    await c.query(`select pg_advisory_xact_lock(hashtext('cita:' || $1))`, [negocio]);
    const o = await leer(c, "o.business_id = $1 and o.number = $2", [negocio, numero], true);
    if (!o || o.status !== "confirmed") return no("Esta cita ya cambió. Actualiza la pantalla.", "This booking already changed. Refresh the screen.");
    const p = (await c.query<{ id: string; ymd: string; m: number }>(`select id::text, proposed->>'ymd' as ymd, (proposed->>'m')::int as m from change_proposals where operation_id = $1::bigint and side = 'customer' and status = 'open' order by id desc limit 1`, [o.id])).rows[0];
    if (!p) return no("Ese cambio ya no está pendiente.", "That change is no longer pending.");
    if (que === "rechazar") {
      await c.query(`update change_proposals set status = 'declined', answered_at = now() where id = $1`, [p.id]);
      await ev(c, o.id, "change_declined", "member", actorId);
      return { ok: true };
    }
    const x = (await contexto(c, negocio))!, G = await gente(c, x), per = G.find((z) => z.id === o.mid), i = Math.round((Date.parse(p.ymd) - Date.parse(x.hoy)) / 864e5);
    // La hora pedida sigue libre (sin contar esta misma cita ni su propuesta).
    const occ = (await ocupadas(c, x, o.id));
    if (!per || !huecos(x, [per], i, o.dur, o.buf, occ).some((h) => h.m === p.m && h.free)) return no("Esa hora ya no está libre. Usa «No se puede».", "That time is no longer open. Use “Can’t”.");
    await c.query(`update operations set scheduled_at = ($2::date + make_interval(mins => $3::int)) at time zone $4, late_notice_at = null, details = details - 'rec24' - 'rec2', updated_at = now() where id = $1::bigint`, [o.id, p.ymd, p.m, o.tz]);
    await c.query(`update change_proposals set status = 'accepted', answered_at = now() where id = $1`, [p.id]);
    await ev(c, o.id, "change_accepted", "member", actorId);
    return { ok: true };
  });
  if (r.ok) await avisarCliente(numero, que === "aceptar" ? "cita_chg_ok" : "cita_chg_no");
  return r;
}

/* ── El cliente ── */
export type QueCliente = "cancelar" | "aceptar" | "nogracias" | "tarde" | "recibi" | "sinseguro";
/* 7d · `por`: «compa» cuando la cancelación la preparó El Compa y la persona la confirmó (lib/compa/acciones.ts confirmar): el evento de la
   operación queda con actor 'compa' (MD L1521). Lo demás es idéntico: mismas reglas, plazo, aviso y dinero. */
export async function citaCliente(userId: string, numero: string, que: QueCliente, extra?: number, por: "user" | "compa" = "user"): Promise<ResC> {
  if (!NUM.test(numero)) return no("Esa cita no existe.", "That booking does not exist.");
  await vencerCitas({ userId, numero });
  let despues: (() => Promise<void>) | null = null;
  const biz = (await db().query<{ b: string }>(`select business_id as b from operations where number = $1 and user_id = $2 and kind = 'appointment'`, [numero, userId])).rows[0]?.b;
  if (!biz) return no("Esa cita no existe.", "That booking does not exist.");
  const r = await tx(async (c): Promise<ResC> => {
    await c.query(`select pg_advisory_xact_lock(hashtext('cita:' || $1))`, [biz]);
    const o = await leer(c, "o.user_id = $1 and o.number = $2", [userId, numero], true);
    if (!o) return no("Esa cita no existe.", "That booking does not exist.");
    const ya = no("Esta cita ya cambió. Actualiza la pantalla.", "This booking already changed. Refresh the screen.");
    // Doctores: seguir con el precio sin seguro → la cita queda confirmada (se copia el precio; nada se cobra en la app).
    if (que === "sinseguro") {
      if (o.status !== "pending" || o.detail !== "seg" || o.det?.rubro !== "salud") return ya;
      const sin = Math.max(0, Math.round(Number(o.det?.sinSeg ?? 0))), L = sin ? `$${(sin / 100).toLocaleString("en-US")}` : "";
      await c.query(`update operations set status = 'confirmed', status_detail = null, respond_by = null, confirmed_at = now(), total_cents = $2, subtotal_cents = $2,
                       details = jsonb_set(jsonb_set(details, '{seguro,acepta}', 'false'::jsonb), '{precio}', $3::jsonb), updated_at = now() where id = $1::bigint`,
        [o.id, sin, JSON.stringify({ es: L ? `${L} · SIN SEGURO` : "Gratis", en: L ? `${L} · UNINSURED` : "Free" })]);
      await ev(c, o.id, "accepted", "user", userId, { es: "Sigue con el precio sin seguro", en: "Continues at the uninsured price" });
      despues = async () => { const d = await datos(numero); if (!d) return; const { avisar, avisarNegocio } = await import("./avisos");
        await avisarNegocio(d.biz, "biz_sal_seg_ok", { dia: d.dia, hora: d.hora }, { href: `/panel/${d.biz}/hoy?det=cita:${numero}`, ref: ["appointment", numero] });
        await avisar(d.uid, "sal_cita_ok", { dia: d.dia, hora: d.hora }, { href: `/cita/${numero}`, ref: ["appointment", numero] }); };
      return { ok: true };
    }
    if (que === "cancelar") {
      if (!["pending", "change_proposed", "confirmed"].includes(o.status) || (o.detail && o.detail !== "seg")) return ya;
      const conf = o.status === "confirmed", aTiempo = !conf || o.mins_to >= o.cxh * 60, pierde = conf && !aTiempo && o.dep > 0 && o.pay === "captured";
      await c.query(`update operations set status = 'cancelled', cancelled_by = 'user', cancelled_at = now(), cancel_reason = $2, details = details || $3::jsonb, updated_at = now() where id = $1::bigint`,
        [o.id, conf ? (aTiempo ? "a_tiempo" : "tarde") : "solicitud", JSON.stringify({ perdio: pierde })]);
      await c.query(`update change_proposals set status = 'declined', answered_at = now() where operation_id = $1::bigint and status = 'open'`, [o.id]);
      await ev(c, o.id, "cancelled", por, userId, pierde ? { es: `Canceló con menos de ${o.cxh} h: el depósito se queda`, en: `Cancelled less than ${o.cxh} h before: deposit kept` } : undefined);
      despues = async () => {
        if (o.pay === "held") await liberarOperacion(o.id);
        else if (o.pay === "captured" && aTiempo && o.pid && o.amount) await devolverPago({ paymentId: o.pid, centavos: o.amount - (o.refunded ?? 0), por: "policy", actorId: userId, motivo: "Cancelación a tiempo", idem: `cx-${numero}` });
        await avisarNeg(numero, "biz_cita_cx", { dep: pierde ? ` El depósito de ${money(o.dep)} se queda contigo.` : "" });
        await horaLibre(numero);
      };
      return { ok: true };
    }
    if (que === "aceptar" || que === "nogracias") {
      if (o.status !== "change_proposed") return ya;
      const p = (await c.query<{ id: string; ymd: string; m: number }>(`select id::text, proposed->>'ymd' as ymd, (proposed->>'m')::int as m from change_proposals where operation_id = $1::bigint and side = 'business' and status = 'open' order by id desc limit 1`, [o.id])).rows[0];
      if (!p) return ya;
      if (que === "nogracias") {
        await c.query(`update change_proposals set status = 'declined', answered_at = now() where id = $1`, [p.id]);
        await c.query(`update operations set status = 'cancelled', cancelled_by = 'user', cancelled_at = now(), cancel_reason = 'alt_no', updated_at = now() where id = $1::bigint`, [o.id]);
        await ev(c, o.id, "alt_declined", "user", userId);
        despues = async () => { await liberarOperacion(o.id); await horaLibre(numero); };
        return { ok: true };
      }
      await c.query(`update operations set status = 'confirmed', scheduled_at = ($2::date + make_interval(mins => $3::int)) at time zone $4, confirmed_at = now(), updated_at = now() where id = $1::bigint`, [o.id, p.ymd, p.m, o.tz]);
      await c.query(`update change_proposals set status = 'accepted', answered_at = now() where id = $1`, [p.id]);
      await ev(c, o.id, "alt_accepted", "user", userId);
      despues = async () => { await cobrarOperacion(o.id); await avisarNeg(numero, "biz_cita_alt_ok"); };
      return { ok: true };
    }
    // Auto y Hogar: «Ya lo recogí» / «Todo bien»: la cita lista se cierra (lo pagado en el local no pasa por aquí).
    if (que === "recibi") {
      if (o.status !== "confirmed" || o.detail !== "ready") return ya;
      await c.query(`update operations set status = 'done', status_detail = 'done', done_at = now(), updated_at = now() where id = $1::bigint`, [o.id]);
      await ev(c, o.id, "done", "user", userId, o.det?.rubro === "auto" ? { es: "Recogió el carro", en: "Picked up the car" } : { es: "Revisó el trabajo: todo bien", en: "Checked the work: all good" });
      await planLiquidar(c, o.id, "user", userId);
      despues = async () => { await cobrarLiquidacion(o.id); };
      return { ok: true };
    }
    // Voy tarde: confirmada, hasta 2 h antes y hasta 15 min después de la hora.
    if (o.status !== "confirmed" || o.detail) return ya;
    if (o.mins_to > 120 || o.mins_to < -15) return no("Disponible 2 h antes de tu cita.", "Available 2 h before your booking.");
    const min = [5, 10, 15].includes(Number(extra)) ? Number(extra) : 10;
    await c.query(`update operations set late_notice_at = now(), details = details || jsonb_build_object('late', $2::int), updated_at = now() where id = $1::bigint`, [o.id, min]);
    await ev(c, o.id, "late", "user", userId, { es: `Llega ${min} min tarde`, en: `${min} min late` });
    despues = async () => { await avisarNeg(numero, "biz_cita_tarde", { min }); };
    return { ok: true };
  });
  if (r.ok && despues) await (despues as () => Promise<void>)();
  return r;
}

/* Aviso al negocio cuando el cliente pide cambiar una cita confirmada (lo llama el Booking al enviar el cambio). */
export async function avisarCambioPedido(numero: string) {
  const p = (await db().query<{ ymd: string; m: number; min: number }>(
    `select p.proposed->>'ymd' as ymd, (p.proposed->>'m')::int as m, greatest(1, ceil(extract(epoch from p.respond_by - now()) / 60))::int as min
       from change_proposals p join operations o on o.id = p.operation_id where o.number = $1 and p.side = 'customer' and p.status = 'open' order by p.id desc limit 1`, [numero])).rows[0];
  if (!p) return;
  await avisarNeg(numero, "biz_cita_chg", { dia: `${Number(p.ymd.slice(8))}/${Number(p.ymd.slice(5, 7))}`, hora: horaL(p.m), min: p.min });
}

/* Doctores · «No aceptan tu seguro» (neutro). */
async function avisarSeg(numero: string) {
  const d = await datos(numero);
  if (!d) return;
  const { avisar } = await import("./avisos");
  await avisar(d.uid, "sal_cita_seg", {}, { href: `/cita/${numero}`, ref: ["appointment", numero] });
}

