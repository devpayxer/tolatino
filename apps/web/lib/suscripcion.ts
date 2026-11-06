import "server-only";
import { db, tx } from "./db";
import { pasarela } from "./pagos/pasarela";
import { PRECIO_PRO } from "./plan";

/* Plan Pro de un negocio (prototipo pro-trial.js · «Prueba Pro y día 30»). El servidor decide y escribe el derivado
   business_stats_cache.plan; la ficha y el panel solo lo leen.
   - Prueba (30 días; 60 con HZL30): «Seguir con Pro» guarda la tarjeta y el primer cobro es el día 30; «No seguir» → el
     día 30 pasa a Free. Avisos: día 25 y último día. Nada se borra al pasar a Free (el contenido Pro se duerme).
   - Pro: se cobra cada mes (o año = 10 meses); «Pasar a Free» sigue con Pro hasta el fin del período pagado.
   - Cobro fallido: 3 intentos en 7 días (día 0, 3 y 7) con aviso; al tercero, Free.
   - Volver a Pro desde Free: se cobra ese día; no hay segunda prueba. Cortesía (Super Admin): Pro sin cobro hasta una fecha. */
const D = 86_400_000;
const money = (c: number) => `$${(c / 100).toFixed(2)}`;
export const PRECIO_CENTAVOS = Math.round(PRECIO_PRO * 100);
const precio = (cycle: string) => (cycle === "year" ? PRECIO_CENTAVOS * 10 : PRECIO_CENTAVOS);
type Bi = { es: string; en: string };
export type ResS = { ok: true } | { ok: false; msg: Bi };
const no = (es: string, en: string): ResS => ({ ok: false, msg: { es, en } });

type Fila = { business_id: string; status: string; cycle: string; price_cents: number; trial_started_at: string | null; trial_ends_at: string | null; trial_choice: string;
  payer_user_id: string | null; card_pm: string | null; current_period_end: string | null; failed_attempts: number; next_attempt_at: string | null; courtesy_until: string | null; ended_at: string | null };
export type Plan = {
  st: "trial" | "pro" | "free" | "courtesy"; phase: "build" | "d20" | "d25" | "last" | "pro" | "past_due" | "leaving" | "ended";
  dia: number; quedan: number; fin: string | null; proximo: string | null; ciclo: "month" | "year"; cobro: number; decision: "none" | "card" | "no_continue";
  tarjeta: { pm: string; marca: string; ultimos4: string } | null; intentos: number; desde: string | null; pruebaUsada: boolean;
};

/* El estado del plan, para la pantalla (sin efectos: lo vencido lo procesa `procesar`). */
export async function planDe(negocio: string): Promise<Plan> {
  const s = (await db().query<Fila>(`select * from subscriptions where business_id = $1`, [negocio])).rows[0];
  const stats = (await db().query<{ plan: string }>(`select plan from business_stats_cache where business_id = $1`, [negocio])).rows[0];
  const tarjeta = s?.card_pm ? (await db().query<{ pm: string; marca: string; ultimos4: string }>(
    `select stripe_pm_id as pm, brand as marca, last4 as ultimos4 from payment_methods where stripe_pm_id = $1 and status = 'active'`, [s.card_pm])).rows[0] ?? null : null;
  const base = { tarjeta, intentos: s?.failed_attempts ?? 0, ciclo: (s?.cycle ?? "month") as "month" | "year", cobro: precio(s?.cycle ?? "month"), decision: (s?.trial_choice ?? "none") as Plan["decision"],
    pruebaUsada: !!s?.trial_started_at, desde: null as string | null };
  const now = Date.now();
  if (!s) return { ...base, st: stats?.plan === "pro" ? "pro" : "free", phase: stats?.plan === "pro" ? "pro" : "ended", dia: 0, quedan: 0, fin: null, proximo: null };
  if (s.status === "courtesy") return { ...base, st: "courtesy", phase: "pro", dia: 0, quedan: 0, fin: s.courtesy_until, proximo: null };
  if (s.status === "trial") {
    const ini = Date.parse(s.trial_started_at!), fin = Date.parse(s.trial_ends_at!), dia = Math.max(0, Math.floor((now - ini) / D)), quedan = Math.max(0, Math.ceil((fin - now) / D));
    return { ...base, st: "trial", phase: quedan <= 1 ? "last" : quedan <= 5 ? "d25" : dia >= 20 ? "d20" : "build", dia, quedan, fin: s.trial_ends_at, proximo: s.trial_choice === "card" ? s.trial_ends_at : null };
  }
  if (s.status === "active" || s.status === "canceling" || s.status === "past_due")
    return { ...base, st: "pro", phase: s.status === "past_due" ? "past_due" : s.status === "canceling" ? "leaving" : "pro", dia: 0, quedan: 0, fin: s.current_period_end, proximo: s.status === "canceling" ? null : s.status === "past_due" ? s.next_attempt_at : s.current_period_end };
  return { ...base, st: "free", phase: "ended", dia: 0, quedan: 0, fin: null, proximo: null, desde: s.ended_at };
}

async function plan(c: { query: (q: string, v: unknown[]) => Promise<unknown> }, negocio: string, p: "pro" | "free") {
  await c.query(`insert into business_stats_cache (business_id, plan) values ($1, $2) on conflict (business_id) do update set plan = $2`, [negocio, p]);
}
async function evento(negocio: string, kind: string, extra: { monto?: number; note?: unknown; actor?: string | null; idem?: string } = {}): Promise<boolean> {
  return !!(await db().query(`insert into subscription_events (business_id, kind, amount_cents, note, actor_id, idem_key) values ($1, $2, $3, $4::jsonb, $5, $6) on conflict (idem_key) do nothing`,
    [negocio, kind, extra.monto ?? null, extra.note === undefined ? null : JSON.stringify(extra.note), extra.actor ?? null, extra.idem ?? null])).rowCount;
}
async function avisarDueño(negocio: string, tpl: string, vars: Record<string, string>) {
  await (await import("./avisos")).avisarNegocio(negocio, tpl, vars, { href: `/panel/${negocio}/cobros/plan` });
}
const nombre = async (negocio: string) => (await db().query<{ n: string }>(`select name as n from businesses where id = $1`, [negocio])).rows[0]?.n ?? "";

/* Cobra un período. Clave idempotente = negocio + inicio exacto del período + tarjeta + intento: repetir la misma llamada
   no cobra dos veces, pero otro período, otra tarjeta u otro intento sí es un cobro nuevo (6 nov: con la fecha sola,
   «Volver a Pro» el mismo día que otro cobro se daba por pagado sin cobrar). */
async function cobrarPeriodo(s: Fila, desde: number): Promise<{ ok: true } | { ok: false; msg: Bi }> {
  if (!s.card_pm || !s.payer_user_id) return { ok: false, msg: { es: "Falta la tarjeta.", en: "The card is missing." } };
  const monto = precio(s.cycle), idem = `sub-${s.business_id}-${new Date(desde).toISOString()}-${s.card_pm.slice(-16)}-${s.failed_attempts}`;
  const cliente = await pasarela.cliente(s.payer_user_id).catch(() => null);
  const r = await pasarela.cobrarDirecto({ centavos: monto, pm: s.card_pm, cliente, idem, meta: { business_id: s.business_id, kind: "pro" } });
  if (!r.ok) return { ok: false, msg: r.mensaje };
  const hasta = new Date(desde); hasta.setMonth(hasta.getMonth() + (s.cycle === "year" ? 12 : 1));
  await tx(async (c) => {
    await c.query(`update subscriptions set status = 'active', current_period_end = $2, failed_attempts = 0, next_attempt_at = null, trial_choice = case when status = 'trial' then 'card' else trial_choice end, updated_at = now() where business_id = $1`,
      [s.business_id, hasta.toISOString()]);
    await plan(c, s.business_id, "pro");
  });
  await evento(s.business_id, "charged", { monto, note: { pi: r.id, hasta: hasta.toISOString() }, idem });
  const t = (await db().query<{ marca: string; l4: string }>(`select brand as marca, last4 as l4 from payment_methods where stripe_pm_id = $1`, [s.card_pm])).rows[0];
  await avisarDueño(s.business_id, "pro_charged", { monto: money(monto), negocio: await nombre(s.business_id), tarjeta: t ? `${t.marca.toUpperCase()} ·· ${t.l4}` : "tarjeta" });
  await (await import("./correo/recibos")).reciboPro(s.business_id, s.payer_user_id, monto, hasta.toISOString(), t ? `${t.marca.toUpperCase()} ·· ${t.l4}` : "—", idem); // 2q
  return { ok: true };
}
async function aFree(negocio: string, por: string) {
  await tx(async (c) => {
    await c.query(`update subscriptions set status = 'ended', ended_at = now(), next_attempt_at = null, updated_at = now() where business_id = $1`, [negocio]);
    await plan(c, negocio, "free");
  });
  await evento(negocio, "ended", { note: { por } });
  await avisarDueño(negocio, "pro_free", { negocio: await nombre(negocio) });
}

/* Procesa lo vencido: fin de prueba, renovación, reintentos, cortesía y avisos del día 25. Una sola vez a la vez. */
let ultimo = 0;
export async function procesar(negocio?: string) {
  if (!negocio && Date.now() - ultimo < 5 * 60_000) return;
  if (!negocio) ultimo = Date.now();
  const L = (await db().query<Fila>(
    `select * from subscriptions where ($1::text is null or business_id = $1) and (
       (status = 'trial' and trial_ends_at <= now()) or (status = 'trial' and trial_ends_at <= now() + interval '5 days')
       or (status in ('active', 'canceling') and current_period_end <= now()) or (status = 'past_due' and next_attempt_at <= now())
       or (status = 'courtesy' and courtesy_until <= now())) limit 200`, [negocio ?? null])).rows;
  for (const s of L) {
    const lock = await db().query<{ ok: boolean }>(`select pg_try_advisory_lock(hashtext('sub:' || $1)) as ok`, [s.business_id]);
    if (!lock.rows[0]?.ok) continue;
    try {
      if (s.status === "trial" && Date.parse(s.trial_ends_at!) > Date.now()) {
        // Día 25 (quedan 5 o menos): un solo aviso.
        if (await evento(s.business_id, "notice_d25", { idem: `d25-${s.business_id}-${s.trial_ends_at}` }))
          await avisarDueño(s.business_id, "pro_d25", { negocio: await nombre(s.business_id), dia: new Date(s.trial_ends_at!).toLocaleDateString("es-US", { day: "numeric", month: "short", timeZone: "America/New_York" }).replace(/\./g, "") });
        continue;
      }
      if (s.status === "trial") {
        if (s.trial_choice === "card" && s.card_pm) {
          const r = await cobrarPeriodo(s, Date.parse(s.trial_ends_at!));
          if (!r.ok) await fallo(s);
        } else await aFree(s.business_id, s.trial_choice === "no_continue" ? "decidio" : "fin_prueba");
      } else if (s.status === "canceling") await aFree(s.business_id, "pasar_a_free");
      else if (s.status === "active") { const r = await cobrarPeriodo(s, Date.parse(s.current_period_end!)); if (!r.ok) await fallo(s); }
      else if (s.status === "past_due") { const r = await cobrarPeriodo(s, Date.parse(s.current_period_end ?? s.trial_ends_at!)); if (!r.ok) await fallo(s); }
      else if (s.status === "courtesy") await aFree(s.business_id, "fin_cortesia");
    } finally {
      await db().query(`select pg_advisory_unlock(hashtext('sub:' || $1))`, [s.business_id]);
    }
  }
}
async function fallo(s: Fila) {
  const n = s.failed_attempts + 1;
  if (n >= 3) { await evento(s.business_id, "failed", { note: { intento: n } }); await aFree(s.business_id, "cobro_fallido"); return; }
  const prox = new Date(Date.now() + (n === 1 ? 3 : 4) * D).toISOString();
  await db().query(`update subscriptions set status = 'past_due', failed_attempts = $2, next_attempt_at = $3, current_period_end = coalesce(current_period_end, trial_ends_at), updated_at = now() where business_id = $1`, [s.business_id, n, prox]);
  await evento(s.business_id, "failed", { note: { intento: n } });
  await avisarDueño(s.business_id, "pro_failed", { negocio: await nombre(s.business_id), n: String(n) });
}

/* ── Lo que hace el dueño (Cobros y plan) ── */
async function tarjetaDelDueño(userId: string, pm: string) {
  return (await db().query<{ pm: string }>(`select stripe_pm_id as pm from payment_methods where user_id = $1 and stripe_pm_id = $2 and status = 'active'`, [userId, pm])).rows[0]?.pm ?? null;
}
/* Seguir con Pro (en prueba: el cobro es el día 30) o Volver a Pro (desde Free: se cobra hoy). También cambia la tarjeta. */
export async function seguirConPro(negocio: string, userId: string, pm: string, ciclo: "month" | "year"): Promise<ResS & { cobrado?: boolean }> {
  const card = await tarjetaDelDueño(userId, String(pm ?? ""));
  if (!card) return no("Elige una tarjeta guardada.", "Choose a saved card.");
  const cyc = ciclo === "year" ? "year" : "month";
  const s = (await db().query<Fila>(`select * from subscriptions where business_id = $1`, [negocio])).rows[0];
  if (s?.status === "trial") {
    await db().query(`update subscriptions set trial_choice = 'card', card_pm = $2, payer_user_id = $3, cycle = $4, updated_at = now() where business_id = $1`, [negocio, card, userId, cyc]);
    await evento(negocio, "decided_card", { actor: userId, note: { ciclo: cyc } });
    return { ok: true };
  }
  if (s && (s.status === "active" || s.status === "canceling" || s.status === "past_due")) {
    await db().query(`update subscriptions set card_pm = $2, payer_user_id = $3, status = case when status = 'canceling' then 'active' else status end, updated_at = now() where business_id = $1`, [negocio, card, userId]);
    await evento(negocio, s.status === "canceling" ? "undo_free" : "card_changed", { actor: userId });
    if (s.status === "past_due") { await procesarYa(negocio); return { ok: true, cobrado: true }; }
    return { ok: true };
  }
  if (s?.status === "courtesy") return no("Tienes Pro de cortesía: no hace falta tarjeta hasta que termine.", "You have courtesy Pro: no card needed until it ends.");
  // Free (o sin suscripción): volver a Pro se cobra hoy; no hay segunda prueba.
  const fila: Fila = { business_id: negocio, status: "ended", cycle: cyc, price_cents: precio(cyc), trial_started_at: s?.trial_started_at ?? null, trial_ends_at: s?.trial_ends_at ?? null, trial_choice: "card",
    payer_user_id: userId, card_pm: card, current_period_end: null, failed_attempts: 0, next_attempt_at: null, courtesy_until: null, ended_at: null };
  await db().query(`insert into subscriptions (business_id, status, cycle, payer_user_id, card_pm, trial_choice) values ($1, 'ended', $2, $3, $4, 'card')
                    on conflict (business_id) do update set cycle = $2, payer_user_id = $3, card_pm = $4, updated_at = now()`, [negocio, cyc, userId, card]);
  const r = await cobrarPeriodo(fila, Math.floor(Date.now() / 60_000) * 60_000); // el mismo minuto y tarjeta = el mismo intento (doble toque)
  if (!r.ok) return { ok: false, msg: r.msg };
  await evento(negocio, "back_to_pro", { actor: userId });
  return { ok: true, cobrado: true };
}
async function procesarYa(negocio: string) {
  await db().query(`update subscriptions set next_attempt_at = now() where business_id = $1 and status = 'past_due'`, [negocio]);
  await procesar(negocio);
}
/* No seguir (en prueba) o Pasar a Free (con Pro: sigue hasta el fin del período). Deshacer con seguirConPro. */
export async function pasarAFree(negocio: string, userId: string): Promise<ResS> {
  const s = (await db().query<Fila>(`select * from subscriptions where business_id = $1`, [negocio])).rows[0];
  if (!s) return no("Tu página no tiene un plan que cambiar.", "Your page has no plan to change.");
  if (s.status === "trial") { await db().query(`update subscriptions set trial_choice = 'no_continue', updated_at = now() where business_id = $1`, [negocio]); await evento(negocio, "decided_free", { actor: userId }); return { ok: true }; }
  if (s.status === "active") { await db().query(`update subscriptions set status = 'canceling', updated_at = now() where business_id = $1`, [negocio]); await evento(negocio, "canceling", { actor: userId }); return { ok: true }; }
  return no("Ya está en Free o pasando a Free.", "It is already on Free or switching to Free.");
}
export async function deshacerFree(negocio: string, userId: string): Promise<ResS> {
  const s = (await db().query<Fila>(`select * from subscriptions where business_id = $1`, [negocio])).rows[0];
  if (s?.status === "trial" && s.trial_choice === "no_continue") { await db().query(`update subscriptions set trial_choice = case when card_pm is null then 'none' else 'card' end, updated_at = now() where business_id = $1`, [negocio]); await evento(negocio, "undo_free", { actor: userId }); return { ok: true }; }
  if (s?.status === "canceling") { await db().query(`update subscriptions set status = 'active', updated_at = now() where business_id = $1`, [negocio]); await evento(negocio, "undo_free", { actor: userId }); return { ok: true }; }
  return no("No hay nada que deshacer.", "There is nothing to undo.");
}

/* Recibos (cobros de Pro). */
export async function recibosPro(negocio: string) {
  return (await db().query<{ at: string; monto: number }>(
    `select to_char(at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at, amount_cents as monto from subscription_events where business_id = $1 and kind = 'charged' order by at desc limit 24`, [negocio])).rows;
}

/* ── Super Admin › Planes ── */
async function adminEvento(c: { query: (q: string, v: unknown[]) => Promise<unknown> }, negocio: string, kind: string, actor: string, note: unknown) {
  await c.query(`insert into subscription_events (business_id, kind, actor_id, note) values ($1, $2, $3, $4::jsonb)`, [negocio, kind, actor, JSON.stringify(note)]);
}
/* Extender la prueba N días (solo en prueba). */
export async function extenderPrueba(negocio: string, dias: number, actor: string, motivo: string): Promise<ResS> {
  const n = Math.round(dias);
  if (!(n >= 1 && n <= 60)) return no("Entre 1 y 60 días.", "Between 1 and 60 days.");
  return tx(async (c) => {
    const r = await c.query(`update subscriptions set trial_ends_at = trial_ends_at + make_interval(days => $2), updated_at = now() where business_id = $1 and status = 'trial'`, [negocio, n]);
    if (!r.rowCount) return no("Solo se extiende una prueba activa.", "Only an active trial can be extended.");
    await adminEvento(c, negocio, "trial_extended", actor, { dias: n, motivo });
    return { ok: true } as const;
  });
}
/* Cortesía: Pro sin cobro hasta una fecha (después, Free; el contenido se guarda). */
export async function darCortesia(negocio: string, dias: number, actor: string, motivo: string): Promise<ResS> {
  const n = Math.round(dias);
  if (!(n >= 1 && n <= 365)) return no("Entre 1 y 365 días.", "Between 1 and 365 days.");
  return tx(async (c) => {
    await c.query(`insert into subscriptions (business_id, status, courtesy_until, courtesy_reason) values ($1, 'courtesy', now() + make_interval(days => $2), $3)
                   on conflict (business_id) do update set status = 'courtesy', courtesy_until = now() + make_interval(days => $2), courtesy_reason = $3, failed_attempts = 0, next_attempt_at = null, updated_at = now()`, [negocio, n, motivo.slice(0, 200)]);
    await plan(c, negocio, "pro");
    await adminEvento(c, negocio, "courtesy", actor, { dias: n, motivo });
    return { ok: true } as const;
  });
}
export async function quitarCortesia(negocio: string, actor: string, motivo: string): Promise<ResS> {
  return tx(async (c) => {
    const r = await c.query(`update subscriptions set status = 'ended', ended_at = now(), courtesy_until = null, updated_at = now() where business_id = $1 and status = 'courtesy'`, [negocio]);
    if (!r.rowCount) return no("Ese negocio no tiene cortesía.", "That business has no courtesy.");
    await plan(c, negocio, "free");
    await adminEvento(c, negocio, "courtesy_removed", actor, { motivo });
    return { ok: true } as const;
  });
}
/* Reintentar ya un cobro fallido. */
export async function reintentarCobro(negocio: string, actor: string): Promise<ResS> {
  const r = await db().query(`update subscriptions set next_attempt_at = now() where business_id = $1 and status = 'past_due' returning 1`, [negocio]);
  if (!r.rowCount) return no("No hay un cobro fallido que reintentar.", "There is no failed charge to retry.");
  await evento(negocio, "retry_admin", { actor });
  await procesar(negocio);
  const s = (await db().query<{ status: string }>(`select status from subscriptions where business_id = $1`, [negocio])).rows[0];
  return s?.status === "active" ? { ok: true } : no("Se intentó y el banco volvió a rechazarla.", "We tried and the bank declined again.");
}
/* Anular la suscripción (Super Admin, prototipo subX): Pro pagado sigue hasta el fin del período y luego Free; en prueba,
   el día 30 pasa a Free; con cobro fallido, Free hoy (ese período no se pagó). No se devuelve lo cobrado; nada se borra. */
export async function anularSuscripcion(negocio: string, actor: string, motivo: string): Promise<ResS> {
  const s = (await db().query<Fila>(`select * from subscriptions where business_id = $1`, [negocio])).rows[0];
  if (s?.status === "active") {
    await tx(async (c) => { await c.query(`update subscriptions set status = 'canceling', updated_at = now() where business_id = $1 and status = 'active'`, [negocio]); await adminEvento(c, negocio, "canceled_admin", actor, { motivo }); });
    return { ok: true };
  }
  if (s?.status === "trial") {
    await tx(async (c) => { await c.query(`update subscriptions set trial_choice = 'no_continue', updated_at = now() where business_id = $1 and status = 'trial'`, [negocio]); await adminEvento(c, negocio, "canceled_admin", actor, { motivo }); });
    return { ok: true };
  }
  if (s?.status === "past_due") {
    await tx((c) => adminEvento(c, negocio, "canceled_admin", actor, { motivo }));
    await aFree(negocio, "admin");
    return { ok: true };
  }
  return no("No hay una suscripción que anular.", "There is no subscription to cancel.");
}
