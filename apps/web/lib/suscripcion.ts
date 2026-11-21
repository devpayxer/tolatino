import "server-only";
import type { PoolClient } from "pg";
import { db, tx, type AlGuardar } from "./db";
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
/* 9t · Un cambio del plan con su estado esperado en el `where` que no encontró ese estado: no se escribe nada (tampoco la auditoría). */
const CAMBIO_PLAN: ResS = { ok: false, msg: { es: "El plan cambió mientras tanto. Actualiza la pantalla y decide otra vez.", en: "The plan changed meanwhile. Refresh and decide again." } };

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
async function evento(negocio: string, kind: string, extra: { monto?: number; note?: unknown; actor?: string | null; idem?: string } = {}, c: PoolClient | null = null): Promise<boolean> {
  return !!(await (c ?? db()).query(`insert into subscription_events (business_id, kind, amount_cents, note, actor_id, idem_key) values ($1, $2, $3, $4::jsonb, $5, $6) on conflict (idem_key) do nothing`,
    [negocio, kind, extra.monto ?? null, extra.note === undefined ? null : JSON.stringify(extra.note), extra.actor ?? null, extra.idem ?? null])).rowCount;
}
async function avisarDueño(negocio: string, tpl: string, vars: Record<string, string>) {
  await (await import("./avisos")).avisarNegocio(negocio, tpl, vars, { href: `/panel/${negocio}/cobros/plan` });
}
const nombre = async (negocio: string) => (await db().query<{ n: string }>(`select name as n from businesses where id = $1`, [negocio])).rows[0]?.n ?? "";

/* Cobra un período. Clave idempotente = negocio + inicio exacto del período + tarjeta + intento: repetir la misma llamada
   no cobra dos veces, pero otro período, otra tarjeta u otro intento sí es un cobro nuevo (6 nov: con la fecha sola,
   «Volver a Pro» el mismo día que otro cobro se daba por pagado sin cobrar). */
/* 9k · Antes de otro intento (o al pasar a Free), la verificación del banco de un intento anterior que el dueño no completó se suelta en Stripe: un
   enlace viejo nunca cobra después de que otro intento ya cobró. */
/* Devuelve true si una verificación vieja resultó cobrada (el dueño confirmó en su banco y no volvió a la app): ese período queda pagado con ESE
   cobro y no se cobra otra vez. Se mira el estado en Stripe antes de soltar: nunca se supone. */
async function soltarVerificaciones(negocio: string): Promise<boolean> {
  let cobrado = false;
  const L = (await db().query<{ pi: string; status: string }>(
    `select a.pi, a.status from payment_actions a where a.business_id = $1::text and a.kind = 'renovacion'
        and (a.status = 'pendiente' or (a.status = 'verificada' and not exists (select 1 from subscription_events e where e.idem_key = a.idem)))`, [negocio])).rows;
  for (const x of L) {
    const st = await pasarela.intento(x.pi);
    if (st?.estado === "succeeded") {
      await db().query(`update payment_actions set status = 'verificada' where pi = $1::text and status = 'pendiente'`, [x.pi]);
      await completarRenovacion(negocio, x.pi, false);
      cobrado = true;
      continue;
    }
    const r = await pasarela.liberar(x.pi);
    if (r.ok && x.status === "pendiente") await db().query(`update payment_actions set status = 'vencida' where pi = $1::text and status = 'pendiente'`, [x.pi]);
  }
  return cobrado;
}
/* 9n-4 · enSesion: «Volver a Pro» desde el panel (el dueño está en Tu plan): la hoja del banco se abre ahí mismo (hoja), sin el aviso con el enlace, y la
   verificación vive lo de cualquier cobro en sesión (verificacion_min); si la cierra, el barrido la suelta y «Volver a Pro» es otro intento. */
async function cobrarPeriodo(s: Fila, desde: number, enSesion = false): Promise<{ ok: true } | { ok: false; msg: Bi; verificar?: true; hoja?: import("./pagos/pasarela").Verificar }> {
  if (!s.card_pm || !s.payer_user_id) return { ok: false, msg: { es: "Falta la tarjeta.", en: "The card is missing." } };
  if (await soltarVerificaciones(s.business_id)) return { ok: true };
  const monto = precio(s.cycle), idem = `sub-${s.business_id}-${new Date(desde).toISOString()}-${s.card_pm.slice(-16)}-${s.failed_attempts}`;
  const cliente = await pasarela.cliente(s.payer_user_id).catch(() => null);
  const r = await pasarela.cobrarDirecto({ centavos: monto, pm: s.card_pm, cliente, idem, meta: { business_id: s.business_id, kind: "pro" } });
  if (!r.ok && r.codigo === "authentication_required" && r.pi) {
    // 9k · 3-D Secure fuera de sesión (L382): el banco pide al dueño confirmar. Queda la verificación a su nombre (hasta el próximo intento) y le
    // llega el aviso con el enlace a la hoja; si confirma, el período se completa (completarRenovacion). Cuenta como intento para el calendario.
    const { registrarAccion } = await import("./pagos/pasarela");
    const city = (await db().query<{ c: string | null }>(`select city_id as c from businesses where id = $1`, [s.business_id])).rows[0]?.c ?? null;
    const hoja = await registrarAccion({ pi: r.pi, base: idem, idem, quien: { id: s.payer_user_id, negocio: s.business_id, ciudad: city }, kind: "renovacion", monto, pm: s.card_pm, secreto: r.secreto ?? "", minutos: enSesion ? undefined : (s.failed_attempts === 0 ? 3 : 4) * 1440 });
    const pide = await evento(s.business_id, "action_required", { monto, note: { pi: r.pi, ...(enSesion ? { en_sesion: true } : {}) }, idem: `ver-pide-${r.pi}` });
    if (!enSesion && pide) await (await import("./avisos")).avisarNegocio(s.business_id, "pro_verify", { monto: money(monto), negocio: await nombre(s.business_id) }, { href: `/pago/verificar?pi=${encodeURIComponent(r.pi)}` });
    return { ok: false, msg: r.mensaje, verificar: true, ...(enSesion ? { hoja } : {}) };
  }
  if (!r.ok) return { ok: false, msg: r.mensaje };
  await registrarPeriodo(s, desde, monto, r.id, idem);
  return { ok: true };
}
/* El período cobrado: Pro activo hasta la fecha, el evento, el aviso y el recibo. Una vez por llave (subscription_events.idem_key).
   21 nov (9t2) · Con el estado que se leyó en el `where` (y mirando rowCount): «Volver a Pro» va fuera del candado del plan, y una cortesía, «Anular»
   u otro cambio hecho en ese segundo no se pisa. Si cambió, el cobro (que ya salió) queda en el historial con el estado que encontró y el equipo de
   dinero recibe la alerta para decidir si se devuelve; al dueño no se le dice «cobrado» ni se le manda recibo de un período que no se aplicó. */
async function registrarPeriodo(s: Fila, desde: number, monto: number, pi: string, idem: string) {
  if (!s.payer_user_id || !s.card_pm) return;
  const hasta = new Date(desde); hasta.setMonth(hasta.getMonth() + (s.cycle === "year" ? 12 : 1));
  const aplicado = await tx(async (c) => {
    const u = await c.query(`update subscriptions set status = 'active', current_period_end = $2, failed_attempts = 0, next_attempt_at = null, trial_choice = case when status = 'trial' then 'card' else trial_choice end, updated_at = now() where business_id = $1 and status = $3`,
      [s.business_id, hasta.toISOString(), s.status]);
    if (!u.rowCount) return false;
    await plan(c, s.business_id, "pro");
    return true;
  });
  if (!aplicado) {
    const ahora = (await db().query<{ st: string | null }>(`select status as st from subscriptions where business_id = $1`, [s.business_id])).rows[0]?.st ?? "sin plan";
    await evento(s.business_id, "charged", { monto, note: { pi, hasta: hasta.toISOString(), no_aplicado: ahora, esperaba: s.status }, idem });
    const ciudad = (await db().query<{ c: string | null }>(`select city_id as c from businesses where id = $1`, [s.business_id])).rows[0]?.c ?? null;
    await (await import("./dinero-alertas")).alertar("charge_unapplied", idem, { monto, negocio: s.business_id, ciudad, detalle: {
      es: `Se cobró Pro (${money(monto)}) mientras el plan cambiaba (esperaba «${s.status}», ahora «${ahora}»): no se aplicó el período. Decide si se devuelve.`,
      en: `Pro was charged (${money(monto)}) while the plan was changing (expected «${s.status}», now «${ahora}»): the period was not applied. Decide whether to refund it.` } }).catch(() => undefined);
    return;
  }
  await evento(s.business_id, "charged", { monto, note: { pi, hasta: hasta.toISOString() }, idem });
  const t = (await db().query<{ marca: string; l4: string }>(`select brand as marca, last4 as l4 from payment_methods where stripe_pm_id = $1`, [s.card_pm])).rows[0];
  await avisarDueño(s.business_id, "pro_charged", { monto: money(monto), negocio: await nombre(s.business_id), tarjeta: t ? `${t.marca.toUpperCase()} ·· ${t.l4}` : "tarjeta" });
  await (await import("./correo/recibos")).reciboPro(s.business_id, s.payer_user_id, monto, hasta.toISOString(), t ? `${t.marca.toUpperCase()} ·· ${t.l4}` : "—", idem); // 2q
}

/* 9k · El dueño confirmó en su banco el cobro de Pro que pedía verificar (lib/pagos/verificacion.ts ya miró que Stripe lo cobró). Con el candado del
   plan (el mismo del barrido): el período que se estaba cobrando queda pagado, una sola vez por cobro. Si el plan ya no está esperando ese cobro
   (otro intento cobró, pasó a Free), no se toca: ese caso no llega, porque cada intento nuevo y el paso a Free sueltan la verificación vieja. */
export async function completarRenovacion(negocio: string, pi: string, candado = true) {
  const hecho = await tx(async (c) => {
    // El candado del plan en esta transacción (choca con el del barrido aunque sea de otra conexión): una sola cosa a la vez con este plan. Desde el
    // barrido (que ya tiene el candado) se llama sin él.
    if (candado) await c.query(`select pg_advisory_xact_lock(hashtext('sub:' || $1))`, [negocio]);
    const s = (await c.query<Fila>(`select * from subscriptions where business_id = $1 for update`, [negocio])).rows[0];
    if (!s || !["past_due", "active", "trial", "canceling", "ended"].includes(s.status) || !s.payer_user_id || !s.card_pm) return null;
    // 9n-4 · desde_free: la verificación es de un «Volver a Pro» (se pidió con el plan en Free, después de terminar): el período empieza ese minuto.
    const a = (await c.query<{ idem: string; monto: number; creada: string; desde_free: boolean }>(
      `select idem, amount_cents as monto, to_char(date_trunc('minute', created_at) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as creada,
              created_at > coalesce($3::timestamptz, '-infinity'::timestamptz) as desde_free
         from payment_actions where pi = $1::text and business_id = $2::text and kind = 'renovacion' and status = 'verificada'`, [pi, negocio, s.ended_at])).rows[0];
    if (!a) return null;
    // Free sin un «Volver a Pro» que se esté cobrando: no se toca (el paso a Free soltó las verificaciones viejas).
    if (s.status === "ended" && !a.desde_free) return null;
    const vuelve = s.status === "ended" && a.desde_free;
    const desde = vuelve ? Date.parse(a.creada) : Date.parse(s.current_period_end ?? s.trial_ends_at ?? new Date().toISOString());
    const hasta = new Date(desde); hasta.setMonth(hasta.getMonth() + (s.cycle === "year" ? 12 : 1));
    // La llave del cobro es la del evento: si ya se anotó, no se anota ni se avisa otra vez.
    const ev = await c.query(`insert into subscription_events (business_id, kind, amount_cents, note, actor_id, idem_key) values ($1, 'charged', $2, $3::jsonb, null, $4) on conflict (idem_key) do nothing`,
      [negocio, a.monto, JSON.stringify({ pi, hasta: hasta.toISOString(), verificado: true }), a.idem]);
    if (!ev.rowCount) return null;
    await c.query(`update subscriptions set status = 'active', current_period_end = $2, failed_attempts = 0, next_attempt_at = null, trial_choice = case when status = 'trial' then 'card' else trial_choice end, updated_at = now() where business_id = $1`,
      [negocio, hasta.toISOString()]);
    await plan(c, negocio, "pro");
    if (s.status === "ended" && a.desde_free) await c.query(`insert into subscription_events (business_id, kind, actor_id, note) values ($1, 'back_to_pro', $2, '{"verificado":true}'::jsonb)`, [negocio, s.payer_user_id]);
    return { monto: a.monto, hasta: hasta.toISOString(), pm: s.card_pm, payer: s.payer_user_id, idem: a.idem };
  });
  if (!hecho) return;
  const t = (await db().query<{ marca: string; l4: string }>(`select brand as marca, last4 as l4 from payment_methods where stripe_pm_id = $1`, [hecho.pm])).rows[0];
  await avisarDueño(negocio, "pro_charged", { monto: money(hecho.monto), negocio: await nombre(negocio), tarjeta: t ? `${t.marca.toUpperCase()} ·· ${t.l4}` : "tarjeta" });
  await (await import("./correo/recibos")).reciboPro(negocio, hecho.payer, hecho.monto, hecho.hasta, t ? `${t.marca.toUpperCase()} ·· ${t.l4}` : "—", hecho.idem);
}
/* 9t2 · esperado: el estado que leyó el barrido (con el candado del plan). Una cortesía o «Anular» hechos en ese segundo (van sin ese candado) no se
   pisan: si el estado cambió, no se toca nada ni se avisa. */
async function aFree(negocio: string, por: string, esperado: string) {
  if (await soltarVerificaciones(negocio)) return;
  const hecho = await tx(async (c) => {
    if (!(await c.query(`update subscriptions set status = 'ended', ended_at = now(), next_attempt_at = null, updated_at = now() where business_id = $1 and status = $2`, [negocio, esperado])).rowCount) return false;
    await plan(c, negocio, "free");
    return true;
  });
  if (!hecho) return;
  await evento(negocio, "ended", { note: { por } });
  await avisarDueño(negocio, "pro_free", { negocio: await nombre(negocio) });
}

/* Procesa lo vencido: fin de prueba, renovación, reintentos, cortesía y avisos del día 25. Una sola vez a la vez. */
let ultimo = 0;
const VENCIDA = `((status = 'trial' and trial_ends_at <= now()) or (status = 'trial' and trial_ends_at <= now() + interval '5 days')
       or (status in ('active', 'canceling') and current_period_end <= now()) or (status = 'past_due' and next_attempt_at <= now())
       or (status = 'courtesy' and courtesy_until <= now()))`;
/* 9t · El candado del plan es de sesión: se toma y se suelta en la MISMA conexión (antes cada consulta podía ir por otra conexión del pool:
   el desbloqueo fallaba y el candado quedaba tomado en esa conexión). */
async function conCandado<T>(negocio: string, fn: (c: PoolClient) => Promise<T>): Promise<{ tomado: false } | { tomado: true; r: T }> {
  const c = await db().connect();
  try {
    if (!(await c.query<{ ok: boolean }>(`select pg_try_advisory_lock(hashtext('sub:' || $1)) as ok`, [negocio])).rows[0]?.ok) return { tomado: false };
    try { return { tomado: true, r: await fn(c) }; } finally { await c.query(`select pg_advisory_unlock(hashtext('sub:' || $1))`, [negocio]).catch(() => undefined); }
  } finally { c.release(); }
}
export async function procesar(negocio?: string) {
  if (!negocio && Date.now() - ultimo < 5 * 60_000) return;
  if (!negocio) ultimo = Date.now();
  const L = (await db().query<{ business_id: string }>(`select business_id from subscriptions where ($1::text is null or business_id = $1) and ${VENCIDA} limit 200`, [negocio ?? null])).rows;
  for (const x of L) await conCandado(x.business_id, async (k) => {
    // 9t · La fila se lee otra vez CON el candado: lo que cambió entre la lista y el candado (Anular, otro proceso que ya cobró) no se pisa.
    const s = (await k.query<Fila>(`select * from subscriptions where business_id = $1 and ${VENCIDA}`, [x.business_id])).rows[0];
    if (!s) return;
    if (s.status === "trial" && Date.parse(s.trial_ends_at!) > Date.now()) {
      // Día 25 (quedan 5 o menos): un solo aviso.
      if (await evento(s.business_id, "notice_d25", { idem: `d25-${s.business_id}-${s.trial_ends_at}` }))
        await avisarDueño(s.business_id, "pro_d25", { negocio: await nombre(s.business_id), dia: new Date(s.trial_ends_at!).toLocaleDateString("es-US", { day: "numeric", month: "short", timeZone: "America/New_York" }).replace(/\./g, "") });
      return;
    }
    if (s.status === "trial") {
      if (s.trial_choice === "card" && s.card_pm) {
        const r = await cobrarPeriodo(s, Date.parse(s.trial_ends_at!));
        if (!r.ok) await fallo(s, "verificar" in r);
      } else await aFree(s.business_id, s.trial_choice === "no_continue" ? "decidio" : "fin_prueba", s.status);
    } else if (s.status === "canceling") await aFree(s.business_id, "pasar_a_free", s.status);
    else if (s.status === "active") { const r = await cobrarPeriodo(s, Date.parse(s.current_period_end!)); if (!r.ok) await fallo(s, "verificar" in r); }
    else if (s.status === "past_due") { const r = await cobrarPeriodo(s, Date.parse(s.current_period_end ?? s.trial_ends_at!)); if (!r.ok) await fallo(s, "verificar" in r); }
    else if (s.status === "courtesy") await aFree(s.business_id, "fin_cortesia", s.status);
  });
}
async function fallo(s: Fila, verificar = false) {
  const n = s.failed_attempts + 1;
  if (n >= 3) { await evento(s.business_id, "failed", { note: { intento: n } }); await aFree(s.business_id, "cobro_fallido", s.status); return; }
  const prox = new Date(Date.now() + (n === 1 ? 3 : 4) * D).toISOString();
  // 9t2 · Con el estado que se leyó en el where: una cortesía puesta en ese segundo no pasa a «cobro fallido».
  if (!(await db().query(`update subscriptions set status = 'past_due', failed_attempts = $2, next_attempt_at = $3, current_period_end = coalesce(current_period_end, trial_ends_at), updated_at = now() where business_id = $1 and status = $4`, [s.business_id, n, prox, s.status])).rowCount) return;
  await evento(s.business_id, "failed", { note: { intento: n, ...(verificar ? { verificar: true } : {}) } });
  // 9k · Si el banco pidió verificar, el dueño ya recibió «Tu banco pide confirmar» con su enlace: no se le manda además «cobro fallido».
  if (!verificar) await avisarDueño(s.business_id, "pro_failed", { negocio: await nombre(s.business_id), n: String(n) });
}

/* ── Lo que hace el dueño (Cobros y plan) ── */
async function tarjetaDelDueño(userId: string, pm: string) {
  return (await db().query<{ pm: string }>(`select stripe_pm_id as pm from payment_methods where user_id = $1 and stripe_pm_id = $2 and status = 'active'`, [userId, pm])).rows[0]?.pm ?? null;
}
/* Seguir con Pro (en prueba: el cobro es el día 30) o Volver a Pro (desde Free: se cobra hoy). También cambia la tarjeta. */
export async function seguirConPro(negocio: string, userId: string, pm: string, ciclo: "month" | "year", alGuardar?: AlGuardar<boolean>): Promise<ResS & { cobrado?: boolean }> {
  const card = await tarjetaDelDueño(userId, String(pm ?? ""));
  if (!card) return no("Elige una tarjeta guardada.", "Choose a saved card.");
  const cyc = ciclo === "year" ? "year" : "month";
  const s = (await db().query<Fila>(`select * from subscriptions where business_id = $1`, [negocio])).rows[0];
  if (s?.status === "trial") {
    // 9t · Con su estado esperado en el `where` (el barrido pudo terminar la prueba entre la lectura y la escritura).
    return tx(async (c) => {
      if (!(await c.query(`update subscriptions set trial_choice = 'card', card_pm = $2, payer_user_id = $3, cycle = $4, updated_at = now() where business_id = $1 and status = 'trial'`, [negocio, card, userId, cyc])).rowCount) return CAMBIO_PLAN;
      await evento(negocio, "decided_card", { actor: userId, note: { ciclo: cyc } }, c);
      await alGuardar?.(c, false);
      return { ok: true } as const;
    });
  }
  if (s && (s.status === "active" || s.status === "canceling" || s.status === "past_due")) {
    const r = await tx(async (c) => {
      if (!(await c.query(`update subscriptions set card_pm = $2, payer_user_id = $3, status = case when status = 'canceling' then 'active' else status end, updated_at = now() where business_id = $1 and status = $4`, [negocio, card, userId, s.status])).rowCount) return CAMBIO_PLAN;
      await evento(negocio, s.status === "canceling" ? "undo_free" : "card_changed", { actor: userId }, c);
      await alGuardar?.(c, s.status === "past_due");
      return { ok: true } as const;
    });
    if (!r.ok) return r;
    if (s.status === "past_due") { await procesarYa(negocio); return { ok: true, cobrado: true }; }
    return { ok: true };
  }
  if (s?.status === "courtesy") return no("Tienes Pro de cortesía: no hace falta tarjeta hasta que termine.", "You have courtesy Pro: no card needed until it ends.");
  // Free (o sin suscripción): volver a Pro se cobra hoy; no hay segunda prueba.
  const fila: Fila = { business_id: negocio, status: "ended", cycle: cyc, price_cents: precio(cyc), trial_started_at: s?.trial_started_at ?? null, trial_ends_at: s?.trial_ends_at ?? null, trial_choice: "card",
    payer_user_id: userId, card_pm: card, current_period_end: null, failed_attempts: 0, next_attempt_at: null, courtesy_until: null, ended_at: null };
  await db().query(`insert into subscriptions (business_id, status, cycle, payer_user_id, card_pm, trial_choice) values ($1, 'ended', $2, $3, $4, 'card')
                    on conflict (business_id) do update set cycle = $2, payer_user_id = $3, card_pm = $4, updated_at = now()`, [negocio, cyc, userId, card]);
  const r = await cobrarPeriodo(fila, Math.floor(Date.now() / 60_000) * 60_000, true); // el mismo minuto y tarjeta = el mismo intento (doble toque)
  // 9n-4 · El banco pide confirmar: la hoja se abre en Tu plan; al confirmar, la verificación completa el período (completarRenovacion), sin otro cobro.
  if (!r.ok) return { ok: false, msg: r.msg, ...(r.hoja ? { verificar: r.hoja } : {}) };
  // El cobro va a Stripe fuera de la base; la vuelta a Pro queda en el historial y en la auditoría juntos.
  await tx(async (c) => {
    await evento(negocio, "back_to_pro", { actor: userId }, c);
    await alGuardar?.(c, true);
  });
  return { ok: true, cobrado: true };
}
async function procesarYa(negocio: string) {
  await db().query(`update subscriptions set next_attempt_at = now() where business_id = $1 and status = 'past_due'`, [negocio]);
  await procesar(negocio);
}
/* No seguir (en prueba) o Pasar a Free (con Pro: sigue hasta el fin del período). Deshacer con seguirConPro. */
export async function pasarAFree(negocio: string, userId: string, alGuardar?: AlGuardar): Promise<ResS> {
  const s = (await db().query<Fila>(`select * from subscriptions where business_id = $1`, [negocio])).rows[0];
  if (!s) return no("Tu página no tiene un plan que cambiar.", "Your page has no plan to change.");
  // 9t · Cada cambio con su estado esperado en el `where` (el barrido o el Super Admin pudieron cambiarlo entre la lectura y la escritura).
  if (s.status === "trial") return tx(async (c) => { if (!(await c.query(`update subscriptions set trial_choice = 'no_continue', updated_at = now() where business_id = $1 and status = 'trial'`, [negocio])).rowCount) return CAMBIO_PLAN; await evento(negocio, "decided_free", { actor: userId }, c); await alGuardar?.(c); return { ok: true } as const; });
  if (s.status === "active") return tx(async (c) => { if (!(await c.query(`update subscriptions set status = 'canceling', updated_at = now() where business_id = $1 and status = 'active'`, [negocio])).rowCount) return CAMBIO_PLAN; await evento(negocio, "canceling", { actor: userId }, c); await alGuardar?.(c); return { ok: true } as const; });
  return no("Ya está en Free o pasando a Free.", "It is already on Free or switching to Free.");
}
export async function deshacerFree(negocio: string, userId: string, alGuardar?: AlGuardar): Promise<ResS> {
  const s = (await db().query<Fila>(`select * from subscriptions where business_id = $1`, [negocio])).rows[0];
  if (s?.status === "trial" && s.trial_choice === "no_continue") return tx(async (c) => { if (!(await c.query(`update subscriptions set trial_choice = case when card_pm is null then 'none' else 'card' end, updated_at = now() where business_id = $1 and status = 'trial' and trial_choice = 'no_continue'`, [negocio])).rowCount) return CAMBIO_PLAN; await evento(negocio, "undo_free", { actor: userId }, c); await alGuardar?.(c); return { ok: true } as const; });
  if (s?.status === "canceling") return tx(async (c) => { if (!(await c.query(`update subscriptions set status = 'active', updated_at = now() where business_id = $1 and status = 'canceling'`, [negocio])).rowCount) return CAMBIO_PLAN; await evento(negocio, "undo_free", { actor: userId }, c); await alGuardar?.(c); return { ok: true } as const; });
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
export async function extenderPrueba(negocio: string, dias: number, actor: string, motivo: string, alGuardar?: AlGuardar): Promise<ResS> {
  const n = Math.round(dias);
  if (!(n >= 1 && n <= 60)) return no("Entre 1 y 60 días.", "Between 1 and 60 days.");
  return tx(async (c) => {
    const r = await c.query(`update subscriptions set trial_ends_at = trial_ends_at + make_interval(days => $2), updated_at = now() where business_id = $1 and status = 'trial'`, [negocio, n]);
    if (!r.rowCount) return no("Solo se extiende una prueba activa.", "Only an active trial can be extended.");
    await adminEvento(c, negocio, "trial_extended", actor, { dias: n, motivo });
    await alGuardar?.(c);
    return { ok: true } as const;
  });
}
/* Cortesía: Pro sin cobro hasta una fecha (después, Free; el contenido se guarda). */
export async function darCortesia(negocio: string, dias: number, actor: string, motivo: string, alGuardar?: AlGuardar): Promise<ResS> {
  const n = Math.round(dias);
  if (!(n >= 1 && n <= 365)) return no("Entre 1 y 365 días.", "Between 1 and 365 days.");
  return tx(async (c) => {
    await c.query(`insert into subscriptions (business_id, status, courtesy_until, courtesy_reason) values ($1, 'courtesy', now() + make_interval(days => $2), $3)
                   on conflict (business_id) do update set status = 'courtesy', courtesy_until = now() + make_interval(days => $2), courtesy_reason = $3, failed_attempts = 0, next_attempt_at = null, updated_at = now()`, [negocio, n, motivo.slice(0, 200)]);
    await plan(c, negocio, "pro");
    await adminEvento(c, negocio, "courtesy", actor, { dias: n, motivo });
    await alGuardar?.(c);
    return { ok: true } as const;
  });
}
export async function quitarCortesia(negocio: string, actor: string, motivo: string, alGuardar?: AlGuardar): Promise<ResS> {
  return tx(async (c) => {
    const r = await c.query(`update subscriptions set status = 'ended', ended_at = now(), courtesy_until = null, updated_at = now() where business_id = $1 and status = 'courtesy'`, [negocio]);
    if (!r.rowCount) return no("Ese negocio no tiene cortesía.", "That business has no courtesy.");
    await plan(c, negocio, "free");
    await adminEvento(c, negocio, "courtesy_removed", actor, { motivo });
    await alGuardar?.(c);
    return { ok: true } as const;
  });
}
/* Reintentar ya un cobro fallido. 20 nov · La decisión (adelantar el intento + «retry_admin») y la auditoría de quien la toma van en UNA transacción
   (antes: tres escrituras sueltas, y la auditoría solo si el banco aceptaba, aparte y después). El cobro va fuera (procesar → la pasarela, con su
   llave idempotente y su candado por negocio); lo que el banco diga queda en subscription_events. */
export async function reintentarCobro(negocio: string, actor: string, alGuardar?: AlGuardar): Promise<ResS> {
  const pedido = await tx(async (c) => {
    const r = await c.query(`update subscriptions set next_attempt_at = now() where business_id = $1 and status = 'past_due' returning 1`, [negocio]);
    if (!r.rowCount) return false;
    await evento(negocio, "retry_admin", { actor }, c);
    await alGuardar?.(c);
    return true;
  });
  if (!pedido) return no("No hay un cobro fallido que reintentar.", "There is no failed charge to retry.");
  await procesar(negocio);
  const s = (await db().query<{ status: string }>(`select status from subscriptions where business_id = $1`, [negocio])).rows[0];
  return s?.status === "active" ? { ok: true } : no("Se intentó y el banco volvió a rechazarla.", "We tried and the bank declined again.");
}
/* Anular la suscripción (Super Admin, prototipo subX): Pro pagado sigue hasta el fin del período y luego Free; en prueba,
   el día 30 pasa a Free; con cobro fallido, Free hoy (ese período no se pagó). No se devuelve lo cobrado; nada se borra.
   alGuardar (20 nov): la auditoría de quien decide entra con «canceled_admin», en su transacción.
   21 nov (9t) · «Anuló» en la auditoría y el plan nunca se contradicen: todo con el candado del plan (el del barrido que cobra; si lo tiene otro,
   se dice y no se hace nada), la fila releída con él y cada cambio con su estado esperado en el `where` (si cambió, no se escribe nada, tampoco la
   auditoría). Con cobro fallido, primero la pasarela: si una verificación del banco ya pasó, el período quedó pagado y la acción lo dice (no se
   anula: decidir otra vez con el plan a la vista); si no, el paso a Free, «canceled_admin», «ended» y la auditoría van en UNA transacción. */
async function enTxDe(c: PoolClient, fn: () => Promise<ResS>): Promise<ResS> {
  await c.query("begin");
  try { const r = await fn(); await c.query(r.ok ? "commit" : "rollback"); return r; } catch (e) { await c.query("rollback").catch(() => undefined); throw e; }
}
export async function anularSuscripcion(negocio: string, actor: string, motivo: string, alGuardar?: AlGuardar): Promise<ResS> {
  let aFreeHoy = false;
  const h = await conCandado(negocio, async (c): Promise<ResS> => {
    const s = (await c.query<Fila>(`select * from subscriptions where business_id = $1`, [negocio])).rows[0];
    if (s?.status === "active") return enTxDe(c, async () => {
      if (!(await c.query(`update subscriptions set status = 'canceling', updated_at = now() where business_id = $1 and status = 'active'`, [negocio])).rowCount) return CAMBIO_PLAN;
      await adminEvento(c, negocio, "canceled_admin", actor, { motivo }); await alGuardar?.(c); return { ok: true };
    });
    if (s?.status === "trial") return enTxDe(c, async () => {
      if (!(await c.query(`update subscriptions set trial_choice = 'no_continue', updated_at = now() where business_id = $1 and status = 'trial'`, [negocio])).rowCount) return CAMBIO_PLAN;
      await adminEvento(c, negocio, "canceled_admin", actor, { motivo }); await alGuardar?.(c); return { ok: true };
    });
    if (s?.status === "past_due") {
      // La pasarela primero (sin la transacción): una verificación del banco que ya pasó completa el período (completarRenovacion, sin candado:
      // ya es nuestro); una pendiente se suelta en Stripe (nunca cobra después).
      if (await soltarVerificaciones(negocio)) {
        const f = (await c.query<{ st: string; fin: string | null }>(`select status as st, to_char(current_period_end at time zone 'America/New_York', 'YYYY-MM-DD') as fin from subscriptions where business_id = $1`, [negocio])).rows[0];
        const hasta = f?.st === "active" && f.fin ? { es: `: sigue en Pro hasta el ${f.fin}`, en: `: it stays on Pro until ${f.fin}` } : { es: "", en: "" };
        return no(`El banco ya había cobrado este período (el dueño lo confirmó en su banco)${hasta.es}. No se anuló nada; si todavía quieres anularla, toca «Anular» otra vez (pasará a Free al final del período).`,
          `The bank had already charged this period (the owner confirmed it with their bank)${hasta.en}. Nothing was cancelled; if you still want to, tap «Cancel» again (it switches to Free at the end of the period).`);
      }
      return enTxDe(c, async () => {
        if (!(await c.query(`update subscriptions set status = 'ended', ended_at = now(), next_attempt_at = null, updated_at = now() where business_id = $1 and status = 'past_due'`, [negocio])).rowCount) return CAMBIO_PLAN;
        await plan(c, negocio, "free");
        await adminEvento(c, negocio, "canceled_admin", actor, { motivo });
        await evento(negocio, "ended", { note: { por: "admin" } }, c);
        await alGuardar?.(c); aFreeHoy = true; return { ok: true };
      });
    }
    return no("No hay una suscripción que anular.", "There is no subscription to cancel.");
  });
  if (!h.tomado) return no("El plan se está procesando ahora mismo (un cobro o un cambio). Prueba en un minuto.", "The plan is being processed right now (a charge or a change). Try again in a minute.");
  // Con cobro fallido, el aviso al dueño de que quedó en Free (después del commit, como aFree).
  if (h.r.ok && aFreeHoy) await avisarDueño(negocio, "pro_free", { negocio: await nombre(negocio) }).catch(() => undefined);
  return h.r;
}
