import "server-only";
import type { PoolClient } from "pg";
import { db, tx, type AlGuardar } from "./db";
import { pasarela } from "./pagos/pasarela";
import { PRECIO_PRO } from "./plan";
import { finDePeriodo } from "./periodo-pro";

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
    if (r.ok && x.status === "pendiente") {
      await db().query(`update payment_actions set status = 'vencida' where pi = $1::text and status = 'pendiente'`, [x.pi]);
      // 9t3 · La intención de ese cobro (esperaba al banco) queda fallida: nada se cobró con ella.
      await db().query(`update subscription_charges set status = 'failed', last_error = 'verificacion_vencida' where stripe_pi = $1::text and status = 'action'`, [x.pi]);
    }
  }
  return cobrado;
}
/* 9n-4 · enSesion: «Volver a Pro» desde el panel (el dueño está en Tu plan): la hoja del banco se abre ahí mismo (hoja), sin el aviso con el enlace, y la
   verificación vive lo de cualquier cobro en sesión (verificacion_min); si la cierra, el barrido la suelta y «Volver a Pro» es otro intento. */
/* 21 nov (9t3) · El cobro de Pro, como el dinero que sale (lib/cobros): (1) la INTENCIÓN se anota en una transacción (subscription_charges 'pending',
   con su llave, el monto, la tarjeta y el período fijos; y la auditoría de quien decide, si la hay: alGuardar); (2) la pasarela con ESA llave; (3) el
   cierre en otra transacción, una vez (registrarPeriodo: 'done' where status = 'pending', el período y el evento). Si Stripe no contesta (o el proceso
   muere entre (1) y (3)), la intención sigue 'pending': nadie cobra otra cosa a ese negocio (una sola en camino, la base lo impone) y procesar o el
   barrido (barrerCobrosPro) la terminan con la MISMA llave mientras Stripe la recuerda (HORAS_LLAVE). Pasado eso no se pregunta más (podría cobrar
   dos veces): el equipo de dinero recibe charge_stuck, una vez, y lo mira en Stripe. Nunca dos cobros del mismo período (un solo 'done' por período). */
const HORAS_LLAVE = 23; // las de lib/cobros.ts (HORAS_LLAVE): el guardián llaveSoloUnDia las compara
/* Lo que la pasarela contesta SIN decir si cobró: la intención sigue en camino. Cualquier otro código es un «no» de verdad. */
const SIN_RESPUESTA = new Set(["red", "api_error", "error", "rate_limit", "rate_limit_error", "lock_timeout", "idempotency_key_in_use", "idempotency_error", "processing"]);
type Intencion = { id: string; idem: string; monto: number; pm: string; payer: string; desde: number; cycle: string; st: string; vieja: boolean; n: number; err: string | null; nueva: boolean };
const EN_CAMINO: Bi = { es: "Stripe no contestó. El cobro de Pro quedó en camino y se termina solo en unos minutos: no lo repitas.", en: "Stripe did not answer. The Pro charge is on its way and finishes by itself in a few minutes: do not repeat it." };
/* 25 nov (9u) · El cobro aún no se intentó porque el proceso del plan estaba ocupado (el barrido tenía su candado): no es un «no» del banco ni Stripe callado. */
const SIN_INTENTO_AUN: Bi = { es: "El cobro se está procesando en este momento. En unos minutos lo verás en Tu plan: no lo repitas.", en: "The charge is being processed right now. You will see it in Your plan in a few minutes: do not repeat it." };
const VIEJO: Bi = { es: "Hay un cobro de Pro de hace más de un día sin respuesta de Stripe: el equipo de dinero lo revisa. No lo repitas.", en: "There is a Pro charge from over a day ago with no answer from Stripe: the money team reviews it. Do not repeat it." };
const YA_RECHAZADO: Bi = { es: "Tu banco ya rechazó este cobro. Prueba con otra tarjeta.", en: "Your bank already declined this charge. Try another card." };
const SEL_INT = `id::text, idem_key as idem, amount_cents as monto, pm, payer_user_id::text as payer, (extract(epoch from period_start) * 1000)::float8 as desde, cycle, status as st,
                 created_at <= now() - make_interval(hours => ${HORAS_LLAVE}) as vieja, attempts as n, last_error as err`;
type ResCobro = { ok: true } | { ok: false; msg: Bi; verificar?: true; hoja?: import("./pagos/pasarela").Verificar; enCamino?: true };

/* Paso 1. La intención de ESTE negocio que sigue en camino (de cualquier período) se termina primero; si no hay, la de esta llave (hecha o rechazada)
   o una nueva. Con el candado de los cobros del negocio en la transacción: dos a la vez no anotan dos. */
async function anotarCobro(s: Fila, desde: number, alGuardar?: (c: PoolClient) => Promise<unknown>): Promise<Intencion> {
  const monto = precio(s.cycle), base = `sub-${s.business_id}-${new Date(desde).toISOString()}-${s.card_pm!.slice(-16)}-${s.failed_attempts}`;
  return tx(async (c) => {
    await c.query(`select pg_advisory_xact_lock(hashtext('sub-cobro:' || $1))`, [s.business_id]);
    // 9t5 · Una intención de esta llave que la consulta dio por «nunca llegó a Stripe» no cuenta como un «no» del banco (no sube el intento): la siguiente va
    // con otra llave (-r<n>), nunca con la misma (devolvería la rechazada).
    // 9t6 · Lo mismo con la que el equipo cerró con «ninguno vale» (devuelto: Stripe la había cobrado y se devuelve): la siguiente, otra llave.
    const r = Number((await c.query<{ n: number }>(`select count(*)::int as n from subscription_charges where business_id = $1 and left(idem_key, length($2)) = $2 and status = 'failed' and last_error in ('nunca_llego', 'devuelto')`, [s.business_id, base])).rows[0]!.n);
    const idem = r ? `${base}-r${r}` : base;
    // También el cobro ya hecho de ESE período (con otra llave: otra tarjeta, otro intento, la verificación del banco): no se anota otro.
    const ya = (await c.query<Omit<Intencion, "nueva">>(`select ${SEL_INT} from subscription_charges where business_id = $1 and (status = 'pending' or idem_key = $2 or (status = 'done' and period_start = $3::timestamptz))
                                                         order by (status = 'pending') desc, id desc limit 1`, [s.business_id, idem, new Date(desde).toISOString()])).rows[0];
    if (ya) return { ...ya, nueva: false };
    const n = (await c.query<Omit<Intencion, "nueva">>(
      `insert into subscription_charges (business_id, city_id, period_start, cycle, amount_cents, pm, payer_user_id, idem_key)
       values ($1, (select city_id from businesses where id = $1), $2::timestamptz, $3, $4, $5, $6::uuid, $7) returning ${SEL_INT}`,
      [s.business_id, new Date(desde).toISOString(), s.cycle === "year" ? "year" : "month", monto, s.card_pm, s.payer_user_id, idem])).rows[0]!;
    await alGuardar?.(c);
    return { ...n, nueva: true };
  });
}
async function cobrarPeriodo(s: Fila, desde: number, enSesion = false, alGuardar?: (c: PoolClient) => Promise<unknown>): Promise<ResCobro> {
  if (!s.card_pm || !s.payer_user_id) return { ok: false, msg: { es: "Falta la tarjeta.", en: "The card is missing." } };
  if (await soltarVerificaciones(s.business_id)) return { ok: true };
  return terminarCobro(s, await anotarCobro(s, desde, alGuardar), enSesion);
}
/* Pasos 2 y 3 (también desde el barrido). Nunca con una llave de más de HORAS_LLAVE. */
async function terminarCobro(s: Fila, a: Intencion, enSesion = false): Promise<ResCobro> {
  if (a.st === "done") return { ok: true };
  if (a.st === "failed") return { ok: false, msg: YA_RECHAZADO };
  if (a.st !== "pending") return { ok: false, msg: { es: "Tu banco pide confirmar que eres tú. Confírmalo para seguir.", en: "Your bank asks you to confirm it is you. Confirm it to continue." }, verificar: true };
  // 9t5 · Pasadas HORAS_LLAVE nunca va a la pasarela con su llave: se cierra con lo que contestó la consulta (o sigue en camino con su alerta).
  if (a.vieja) return terminarViejo(s, a);
  // Un período que ya tiene su cobro hecho (otra intención, o la verificación del banco que se completó mientras esta esperaba) no va a Stripe:
  // la que nunca se mandó queda fallida (nada salió); la que ya se mandó y no contestó, alerta (Stripe pudo cobrarla también) y sigue en camino.
  // 9t5 · «Nunca se mandó» lo dice sent_at (se anota ANTES de la llamada), no attempts (se anota después: un proceso que murió en la llamada dejaba 0).
  if (await periodoYaCobrado(a.id)) {
    if ((await db().query(`update subscription_charges set status = 'failed', last_error = 'periodo_ya_cobrado' where id = $1::bigint and status = 'pending' and sent_at is null`, [a.id])).rowCount) return { ok: true };
    await alertaCobroViejo(s.business_id, a, true);
    return { ok: false, msg: VIEJO, enCamino: true };
  }
  // 9t5 · Se anota que se manda ANTES de la llamada (sent_at) con el dato buscable (gateway_ref), en una sentencia y solo la primera vez: un reintento de
  // una intención que salió sin él va sin él (la misma llave con otros parámetros, Stripe la rechaza) y esa nunca se da por «no llegó».
  const m = (await db().query<{ gref: string | null }>(`update subscription_charges set gateway_ref = case when sent_at is null then 'subscription_charges:' || id else gateway_ref end, sent_at = coalesce(sent_at, now()) where id = $1::bigint and status = 'pending' returning gateway_ref as gref`, [a.id])).rows[0];
  if (!m) return (await db().query(`select 1 from subscription_charges where id = $1::bigint and status = 'done'`, [a.id])).rowCount ? { ok: true } : { ok: false, msg: YA_RECHAZADO };
  const cliente = await pasarela.cliente(a.payer).catch(() => null);
  const r = await pasarela.cobrarDirecto({ centavos: a.monto, pm: a.pm, cliente, idem: a.idem, meta: { business_id: s.business_id, kind: "pro", ...(m.gref ? { tl_intencion: m.gref } : {}) } })
    .catch(() => ({ ok: false as const, codigo: "error", mensaje: EN_CAMINO, pi: undefined, secreto: undefined }));
  if (!r.ok && r.codigo === "authentication_required" && r.pi) {
    // 9k · 3-D Secure fuera de sesión (L382): el banco pide al dueño confirmar. Queda la verificación a su nombre (hasta el próximo intento) y le
    // llega el aviso con el enlace a la hoja; si confirma, el período se completa (completarRenovacion). Cuenta como intento para el calendario.
    await db().query(`update subscription_charges set status = 'action', stripe_pi = $2 where id = $1::bigint and status = 'pending'`, [a.id, r.pi]);
    const { registrarAccion } = await import("./pagos/pasarela");
    const city = (await db().query<{ c: string | null }>(`select city_id as c from businesses where id = $1`, [s.business_id])).rows[0]?.c ?? null;
    const hoja = await registrarAccion({ pi: r.pi, base: a.idem, idem: a.idem, quien: { id: a.payer, negocio: s.business_id, ciudad: city }, kind: "renovacion", monto: a.monto, pm: a.pm, secreto: r.secreto ?? "", minutos: enSesion ? undefined : (s.failed_attempts === 0 ? 3 : 4) * 1440 });
    const pide = await evento(s.business_id, "action_required", { monto: a.monto, note: { pi: r.pi, ...(enSesion ? { en_sesion: true } : {}) }, idem: `ver-pide-${r.pi}` });
    if (!enSesion && pide) await (await import("./avisos")).avisarNegocio(s.business_id, "pro_verify", { monto: money(a.monto), negocio: await nombre(s.business_id) }, { href: `/pago/verificar?pi=${encodeURIComponent(r.pi)}` });
    return { ok: false, msg: r.mensaje, verificar: true, ...(enSesion ? { hoja } : {}) };
  }
  if (!r.ok) {
    const codigo = String(r.codigo ?? "error").slice(0, 60);
    if (SIN_RESPUESTA.has(codigo)) {
      await db().query(`update subscription_charges set attempts = least(10000, attempts + 1), last_error = left($2, 120) where id = $1::bigint and status = 'pending'`, [a.id, codigo]);
      return { ok: false, msg: EN_CAMINO, enCamino: true };
    }
    // Un «no» de verdad: nada se cobró; la intención queda rechazada (el siguiente intento es otra llave).
    await db().query(`update subscription_charges set status = 'failed', attempts = least(10000, attempts + 1), last_error = left($2, 120) where id = $1::bigint and status = 'pending'`, [a.id, codigo]);
    return { ok: false, msg: r.mensaje };
  }
  await registrarPeriodo(s, a, r.id);
  return { ok: true };
}
const periodoYaCobrado = async (id: string) => !!(await db().query(`select 1 from subscription_charges z join subscription_charges y on y.business_id = z.business_id and y.period_start = z.period_start and y.status = 'done' and y.id <> z.id
                          where z.id = $1::bigint`, [id])).rowCount;
const NO_LLEGO: Bi = { es: "Ese cobro de Pro nunca llegó a Stripe: no se cobró nada. Se vuelve a intentar solo.", en: "That Pro charge never reached Stripe: nothing was charged. It is retried by itself." };
const DEVUELTO: Bi = { es: "Ese cobro de Pro salió de más en Stripe y se devuelve: no quedó cobrado.", en: "That Pro charge went through more than once at Stripe and is being refunded: it does not stay charged." };
/* 9t5 · Un cobro de Pro de más de HORAS_LLAVE: NUNCA a la pasarela con su llave. Se cierra con el último veredicto de la consulta (lib/consulta-pasarela.ts):
   salió → el período queda cobrado por el mismo cierre (registrarPeriodo, una vez); el banco dijo que no → rechazado (procesar hace lo de un «no»); nunca
   llegó → rechazado sin contar como intento (el siguiente va con otra llave); un período que ya estaba cobrado por otro cobro, y este también salió → no
   se cierra solo (gateway_review: devolver uno). Sin un veredicto que cierre, sigue en camino y alerta (charge_stuck, una vez). */
async function terminarViejo(s: Fila, a: Intencion): Promise<ResCobro> {
  const K = await import("./consulta-pasarela");
  const v = await K.veredicto("subscription_charges", a.id);
  // 9t6 · El equipo cerró su gateway_review con «ninguno vale» (lo cobrado de más se devuelve: lib/revision-pasarela.ts): nada de ESTA intención queda
  // cobrado. Falla 'devuelto' sin contar como un «no» del banco (no sube el intento ni pasa a Free); el siguiente cobro va con otra llave (-r<n>).
  if (v?.revisado === "ninguno") {
    if (!(await db().query(`update subscription_charges set status = 'failed', last_error = 'devuelto' where id = $1::bigint and status = 'pending'`, [a.id])).rowCount)
      return (await db().query(`select 1 from subscription_charges where id = $1::bigint and status = 'done'`, [a.id])).rowCount ? { ok: true } : { ok: false, msg: YA_RECHAZADO };
    return { ok: false, msg: DEVUELTO, enCamino: true };
  }
  if (v?.resultado === "hecho" && v.stripe) {
    if (await periodoYaCobrado(a.id)) {
      await K.alertaRevisar({ monto: a.monto, negocio: s.business_id, ciudad: null }, K.refDe("subscription_charges", a.id), {
        es: `Cobro de Pro de ${money(a.monto)} (${v.stripe}) que Stripe sí hizo, de un período que ya quedó cobrado con otro cobro: se cobró dos veces. Devuelve uno.`,
        en: `Pro charge of ${money(a.monto)} (${v.stripe}) that Stripe did make, for a period already paid by another charge: it was charged twice. Refund one.` });
      return { ok: false, msg: VIEJO, enCamino: true };
    }
    await registrarPeriodo(s, a, v.stripe);
    return { ok: true };
  }
  if (v?.resultado === "fallido" || v?.noLlego) {
    const motivo = v.resultado === "fallido" ? "consulta_fallido" : "nunca_llego";
    if (!(await db().query(`update subscription_charges set status = 'failed', last_error = $2 where id = $1::bigint and status = 'pending'`, [a.id, motivo])).rowCount)
      return (await db().query(`select 1 from subscription_charges where id = $1::bigint and status = 'done'`, [a.id])).rowCount ? { ok: true } : { ok: false, msg: YA_RECHAZADO };
    return motivo === "consulta_fallido" ? { ok: false, msg: YA_RECHAZADO } : { ok: false, msg: NO_LLEGO, enCamino: true };
  }
  await alertaCobroViejo(s.business_id, a);
  return { ok: false, msg: VIEJO, enCamino: true };
}
async function alertaCobroViejo(negocio: string, a: Intencion, doble = false) {
  const ciudad = (await db().query<{ c: string | null }>(`select city_id as c from businesses where id = $1`, [negocio])).rows[0]?.c ?? null;
  await (await import("./dinero-alertas")).alertar("charge_stuck", a.idem, { monto: a.monto, negocio, ciudad, detalle: doble ? {
    es: `Cobro de Pro de ${money(a.monto)} que Stripe no contestó (${a.n} intentos), de un período que ya quedó cobrado con otro cobro: no se pide otra vez. Mira en Stripe si también se cobró y, si es así, devuélvelo.`,
    en: `Pro charge of ${money(a.monto)} that Stripe did not answer (${a.n} attempts), for a period already paid by another charge: it is not requested again. Check in Stripe whether it was charged too and, if so, refund it.` } : {
    es: `Cobro de Pro de ${money(a.monto)} sin respuesta de Stripe en ${HORAS_LLAVE} h (${a.n} intentos, ${a.err ?? "sin motivo"}): no se cobra otra vez. Mira en Stripe si se cobró.`,
    en: `Pro charge of ${money(a.monto)} with no answer from Stripe in ${HORAS_LLAVE} h (${a.n} attempts, ${a.err ?? "no reason"}): it is not charged again. Check in Stripe whether it was charged.` } }).catch(() => undefined);
}
/* 23 nov · El fin del período que empieza en `desde`, con LA regla de lib/periodo-pro.ts (el mismo día del mes siguiente; si ese mes no lo tiene,
   su último día; el día del ANCLA, en la zona de la ciudad). Antes: Date#setMonth en la hora del proceso (31 ene → 3 mar, y la fecha corrida para
   siempre). El ancla es el inicio del primer período pagado de esta racha de Pro, sacado de lo que ya guarda la base (sin columna nueva): el cobro
   hecho (subscription_charges 'done') de inicio más antiguo entre los creados después del último paso a Free (subscriptions.ended_at). Si no hay
   ninguno, este período es el primero (fin de la prueba o «Volver a Pro») y es su propia ancla. Guardián periodoProSinDesborde. */
async function finDelPeriodo(c: PoolClient, negocio: string, desde: number, ciclo: string): Promise<string> {
  const r = (await c.query<{ tz: string; ancla: number | null }>(
    `select coalesce((select ci.timezone from businesses b join cities ci on ci.id = b.city_id where b.id = $1), 'America/New_York') as tz,
            (select (extract(epoch from min(z.period_start)) * 1000)::float8 from subscription_charges z
              where z.business_id = $1 and z.status = 'done' and z.period_start <= $2::timestamptz
                and z.created_at > coalesce((select s.ended_at from subscriptions s where s.business_id = $1), '-infinity'::timestamptz)) as ancla`,
    [negocio, new Date(desde).toISOString()])).rows[0];
  return new Date(finDePeriodo(desde, ciclo === "year" ? "year" : "month", r?.tz || "America/New_York", r?.ancla ?? null)).toISOString();
}
/* El período cobrado (paso 3): la intención 'done' (una vez: quien llegue segundo, otra pestaña o el barrido, no aplica ni avisa nada), Pro activo
   hasta la fecha y el evento, en UNA transacción; después el aviso y el recibo.
   21 nov (9t2) · Con el estado que se leyó en el `where` (y mirando rowCount): «Volver a Pro» va fuera del candado del plan, y una cortesía, «Anular»
   u otro cambio hecho en ese segundo no se pisa. Si cambió, el cobro (que ya salió) queda en el historial con el estado que encontró y el equipo de
   dinero recibe la alerta para decidir si se devuelve; al dueño no se le dice «cobrado» ni se le manda recibo de un período que no se aplicó. */
async function registrarPeriodo(s: Fila, a: Intencion, pi: string) {
  let hasta = "";
  const h = await tx(async (c) => {
    if (!(await c.query(`update subscription_charges set status = 'done', stripe_pi = $2, last_error = null where id = $1::bigint and status = 'pending'`, [a.id, pi])).rowCount) return null;
    hasta = await finDelPeriodo(c, s.business_id, a.desde, a.cycle);
    // 9t5 · El cobro que encontró la consulta a la pasarela: la auditoría lo dice (origen «consulta a la pasarela»), en esta transacción.
    if ((await c.query(`select 1 from gateway_checks where subject_kind = 'subscription_charges' and subject_id = $1::bigint and result = 'hecho' and stripe_id = $2 limit 1`, [a.id, pi])).rowCount)
      await (await import("./consulta-pasarela")).auditarCierre(c, "subscription_charges", a.id, null, { estado: "hecho", pi, negocio: s.business_id });
    const u = await c.query(`update subscriptions set status = 'active', current_period_end = $2, failed_attempts = 0, next_attempt_at = null, trial_choice = case when status = 'trial' then 'card' else trial_choice end, updated_at = now() where business_id = $1 and status = $3`,
      [s.business_id, hasta, s.status]);
    if (!u.rowCount) {
      const ahora = (await c.query<{ st: string | null }>(`select status as st from subscriptions where business_id = $1`, [s.business_id])).rows[0]?.st ?? "sin plan";
      await evento(s.business_id, "charged", { monto: a.monto, note: { pi, hasta, no_aplicado: ahora, esperaba: s.status }, idem: a.idem }, c);
      return { aplicado: false, ahora };
    }
    await plan(c, s.business_id, "pro");
    await evento(s.business_id, "charged", { monto: a.monto, note: { pi, hasta }, idem: a.idem }, c);
    // «Volver a Pro» desde Free: la vuelta queda en el historial con el cobro (la cierre la acción o el barrido).
    if (s.status === "ended") await evento(s.business_id, "back_to_pro", { actor: a.payer }, c);
    return { aplicado: true, ahora: "active" };
  });
  if (!h) return;
  if (!h.aplicado) {
    const ciudad = (await db().query<{ c: string | null }>(`select city_id as c from businesses where id = $1`, [s.business_id])).rows[0]?.c ?? null;
    await (await import("./dinero-alertas")).alertar("charge_unapplied", a.idem, { monto: a.monto, negocio: s.business_id, ciudad, detalle: {
      es: `Se cobró Pro (${money(a.monto)}) mientras el plan cambiaba (esperaba «${s.status}», ahora «${h.ahora}»): no se aplicó el período. Decide si se devuelve.`,
      en: `Pro was charged (${money(a.monto)}) while the plan was changing (expected «${s.status}», now «${h.ahora}»): the period was not applied. Decide whether to refund it.` } }).catch(() => undefined);
    return;
  }
  const t = (await db().query<{ marca: string; l4: string }>(`select brand as marca, last4 as l4 from payment_methods where stripe_pm_id = $1`, [a.pm])).rows[0];
  await avisarDueño(s.business_id, "pro_charged", { monto: money(a.monto), negocio: await nombre(s.business_id), tarjeta: t ? `${t.marca.toUpperCase()} ·· ${t.l4}` : "tarjeta" });
  await (await import("./correo/recibos")).reciboPro(s.business_id, a.payer, a.monto, hasta, t ? `${t.marca.toUpperCase()} ·· ${t.l4}` : "—", a.idem); // 2q
}
/* Barrido: los cobros de Pro que quedaron en camino (Stripe no contestó, o el proceso murió entre la intención y el cierre; también los de «Volver a
   Pro», que procesar no mira) se terminan con su llave, con el candado del plan, dentro de HORAS_LLAVE; los más viejos, la alerta (una vez). */
export async function barrerCobrosPro(): Promise<number> {
  // 9t9 · Cada cobro por su cuenta (lib/barrido-uno.ts) y por tandas sin repetirlo en la corrida: uno que falla o que Stripe no contesta no tapa a los demás.
  const U = await import("./barrido-uno"), B = new U.Fallos("cobrosPro");
  let n = 0;
  await U.porTandas(B, 50, async (vistos) => (await db().query<{ id: string; biz: string }>(
    `select id::text, business_id as biz from subscription_charges where status = 'pending' and created_at < now() - interval '2 minutes'
        and created_at > now() - make_interval(hours => $1::int) and not (id = any($2::bigint[])) order by created_at, subscription_charges.id limit 50`, [HORAS_LLAVE, vistos])).rows,
  (x) => `${x.biz} · ${x.id}`, async (x) => {
    const h = await conCandado(x.biz, async (k) => {
      const s = (await k.query<Fila>(`select * from subscriptions where business_id = $1`, [x.biz])).rows[0];
      const a = (await k.query<Omit<Intencion, "nueva">>(`select ${SEL_INT} from subscription_charges where id = $1::bigint and status = 'pending'`, [x.id])).rows[0];
      if (!s || !a) return false;
      return (await terminarCobro(s, { ...a, nueva: false })).ok;
    });
    if (h.tomado && h.r) n++;
  }, { clave: (x) => x.id });
  // 9t5 · Los de más de HORAS_LLAVE: se le pregunta a la pasarela (una vez cada CADA_MIN por intención) y se cierran con lo que dijo; si no cierra, siguen en
  // camino con su alerta charge_stuck (una vez). Nunca otra vez a la pasarela con su llave.
  const V = (await db().query<{ id: string }>(
    `select c.id::text from subscription_charges c left join lateral (select max(y.at) as ult from gateway_checks y where y.subject_kind = 'subscription_charges' and y.subject_id = c.id) g on true
      where c.status = 'pending' and c.created_at <= now() - make_interval(hours => $1::int)
        and (g.ult is null or g.ult <= now() - make_interval(mins => $2::int))
      order by g.ult nulls first, c.created_at limit 20`, [HORAS_LLAVE, (await import("./consulta-pasarela")).CADA_MIN])).rows;
  await B.cada(V, (x) => `consulta ${x.id}`, async (x) => { if ((await resolverCobroPro(x.id, { origen: "barrido" })).quedo === "hecha") n++; });
  B.fin();
  return n;
}
/* 9t5 · Preguntarle a la pasarela por un cobro de Pro de más de HORAS_LLAVE y cerrarlo con eso: el barrido, o «Preguntar a Stripe ahora» del Super Admin
   (con su auditoría en la transacción que anota la consulta). La consulta va FUERA de cualquier transacción y del candado; el cierre, con el candado del
   plan (el del barrido y procesar), una vez. Si otro tiene el candado, lo cierra él con el mismo veredicto (procesar o el siguiente barrido). */
export type QuedoPro = "hecha" | "fallida" | "no_llego" | "devuelto" | "sigue" | "ya_no_estaba";
export async function resolverCobroPro(id: string, o: import("./consulta-pasarela").Origen): Promise<{ resultado: import("./consulta-pasarela").Resultado | null; quedo: QuedoPro }> {
  const K = await import("./consulta-pasarela");
  const a = (await db().query<Omit<Intencion, "nueva"> & { biz: string; ciudad: string | null }>(
    `select ${SEL_INT}, business_id as biz, city_id as ciudad from subscription_charges where id = $1::bigint`, [id])).rows[0];
  if (!a || a.st !== "pending" || !a.vieja) return { resultado: null, quedo: "ya_no_estaba" };
  // 9t6 · Ya decidida por el equipo (gateway_review): no se vuelve a preguntar; se cierra con la decisión (veredicto la lee).
  const rev = await K.revisada("subscription_charges", a.id);
  const resultado = rev ? (await K.veredicto("subscription_charges", a.id))!.resultado : await K.consultar({ tabla: "subscription_charges", id: a.id, monto: a.monto, ciudad: a.ciudad, negocio: a.biz }, o);
  if (resultado === "hecho" || resultado === "fallido" || resultado === "no_hallado") {
    await conCandado(a.biz, async (k) => {
      const s = (await k.query<Fila>(`select * from subscriptions where business_id = $1`, [a.biz])).rows[0];
      const b = (await k.query<Omit<Intencion, "nueva">>(`select ${SEL_INT} from subscription_charges where id = $1::bigint and status = 'pending'`, [id])).rows[0];
      if (!s || !b) return;
      const r = await terminarCobro(s, { ...b, nueva: false });
      // El banco dijo que no: lo mismo que un «no» al cobrar (procesar: reintento o Free), con el estado leído con el candado.
      if (!r.ok && !r.enCamino && ["active", "past_due", "trial"].includes(s.status) && s.card_pm) await fallo(s, false);
    });
  }
  const f = (await db().query<{ st: string; err: string | null }>(`select status as st, last_error as err from subscription_charges where id = $1::bigint`, [id])).rows[0];
  const quedo: QuedoPro = f?.st === "done" ? "hecha" : f?.st === "failed" ? (f.err === "nunca_llego" ? "no_llego" : f.err === "devuelto" ? "devuelto" : "fallida") : "sigue";
  if (quedo !== "sigue") await K.cerrarAlertaSola("charge_stuck", a.idem, rev ? { es: "Cerrada sola: el equipo decidió qué cobro vale (gateway_review).", en: "Closed by itself: the team decided which charge counts (gateway_review)." }
    : { es: `Cerrada sola: la consulta a Stripe dijo que ${K.RESULTADO[resultado].es}.`, en: `Closed by itself: the Stripe query said ${K.RESULTADO[resultado].en}.` });
  else await alertaCobroViejo(a.biz, { ...a, nueva: false });
  return { resultado, quedo };
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
    const hasta = await finDelPeriodo(c, negocio, desde, s.cycle);
    // La llave del cobro es la del evento: si ya se anotó, no se anota ni se avisa otra vez.
    const ev = await c.query(`insert into subscription_events (business_id, kind, amount_cents, note, actor_id, idem_key) values ($1, 'charged', $2, $3::jsonb, null, $4) on conflict (idem_key) do nothing`,
      [negocio, a.monto, JSON.stringify({ pi, hasta, verificado: true }), a.idem]);
    if (!ev.rowCount) return null;
    // 9t3 · La intención de ese cobro (esperaba al banco) queda hecha en la misma transacción (salvo que el período ya tenga otro cobro hecho).
    await c.query(`update subscription_charges z set status = 'done', stripe_pi = coalesce(z.stripe_pi, $2::text) where z.idem_key = $1 and z.status in ('action', 'pending')
                     and not exists (select 1 from subscription_charges y where y.business_id = z.business_id and y.period_start = z.period_start and y.status = 'done')`, [a.idem, pi]);
    await c.query(`update subscriptions set status = 'active', current_period_end = $2, failed_attempts = 0, next_attempt_at = null, trial_choice = case when status = 'trial' then 'card' else trial_choice end, updated_at = now() where business_id = $1`,
      [negocio, hasta]);
    await plan(c, negocio, "pro");
    if (s.status === "ended" && a.desde_free) await c.query(`insert into subscription_events (business_id, kind, actor_id, note) values ($1, 'back_to_pro', $2, '{"verificado":true}'::jsonb)`, [negocio, s.payer_user_id]);
    return { monto: a.monto, hasta, pm: s.card_pm, payer: s.payer_user_id, idem: a.idem };
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
  // 9t9 · Lo más atrasado primero (antes sin orden: con más de 200, las pruebas que solo esperan su aviso del día 25 podían tapar cobros vencidos), por
  // tandas sin repetir el mismo negocio en la corrida, y cada negocio por su cuenta (lib/barrido-uno.ts): uno que falla no deja a los demás sin procesar.
  const U = await import("./barrido-uno"), B = new U.Fallos("planPro");
  await U.porTandas(B, 200, async (vistos) => (await db().query<{ business_id: string }>(
    `select business_id from subscriptions where ($1::text is null or business_id = $1) and ${VENCIDA} and not (business_id = any($2::text[]))
      order by case when status = 'trial' then trial_ends_at when status = 'past_due' then next_attempt_at when status = 'courtesy' then courtesy_until else current_period_end end, business_id
      limit 200`, [negocio ?? null, vistos])).rows, (x) => x.business_id, (x) => conCandado(x.business_id, async (k) => {
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
        if (!r.ok && !r.enCamino) await fallo(s, "verificar" in r);
      } else await aFree(s.business_id, s.trial_choice === "no_continue" ? "decidio" : "fin_prueba", s.status);
    } else if (s.status === "canceling") await aFree(s.business_id, "pasar_a_free", s.status);
    // 9t3 · Un cobro en camino (Stripe no contestó) no es un «no» del banco: no cuenta como intento fallido (otro intento sería otra llave: cobraría dos
    // veces); el siguiente paso de procesar o el barrido lo terminan con su llave.
    else if (s.status === "active") { const r = await cobrarPeriodo(s, Date.parse(s.current_period_end!)); if (!r.ok && !r.enCamino) await fallo(s, "verificar" in r); }
    else if (s.status === "past_due") { const r = await cobrarPeriodo(s, Date.parse(s.current_period_end ?? s.trial_ends_at!)); if (!r.ok && !r.enCamino) await fallo(s, "verificar" in r); }
    else if (s.status === "courtesy") await aFree(s.business_id, "fin_cortesia", s.status);
  }));
  B.fin();
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
    if (s.status === "past_due") {
      const desde = (await db().query<{ t: Date }>(`select now() as t`)).rows[0]?.t ?? new Date();
      await procesarYa(negocio);
      // 25 nov (9u) · Lo que dejó el cobro con la tarjeta nueva se lee de la base, nunca se supone: antes decía «ya tienes Pro» aunque el banco la rechazara.
      // «Rechazó» solo con un intento de AHORA: si el barrido tenía el candado del plan, procesarYa no cobró y el cobro con la tarjeta nueva va en camino.
      const f = (await db().query<{ st: string; camino: boolean; verificar: boolean; intento: boolean }>(
        `select status as st, exists (select 1 from subscription_charges c where c.business_id = $1 and c.status = 'pending') as camino,
                exists (select 1 from subscription_charges c where c.business_id = $1 and c.status = 'action' and c.created_at >= $2) as verificar,
                exists (select 1 from subscription_charges c where c.business_id = $1 and c.created_at >= $2) as intento from subscriptions where business_id = $1`, [negocio, desde])).rows[0];
      if (f?.st === "active") return { ok: true, cobrado: true };
      if (f?.camino) return { ok: false, msg: EN_CAMINO };
      if (!f?.intento) return { ok: false, msg: SIN_INTENTO_AUN };
      if (f?.verificar) return no("Cambiamos tu tarjeta. Tu banco pide confirmar el cobro: te mandamos un aviso con el enlace.", "We changed your card. Your bank asks to confirm the charge: we sent you a notice with the link.");
      if (f?.st === "ended") return no("Cambiamos tu tarjeta, pero el banco rechazó el cobro y tu página pasó a Free. Nada se borra.", "We changed your card, but the bank declined the charge and your page switched to Free. Nothing is deleted.");
      return no("Cambiamos tu tarjeta, pero el banco rechazó el cobro. Prueba con otra tarjeta.", "We changed your card, but the bank declined the charge. Try another card.");
    }
    return { ok: true };
  }
  if (s?.status === "courtesy") return no("Tienes Pro de cortesía: no hace falta tarjeta hasta que termine.", "You have courtesy Pro: no card needed until it ends.");
  // Free (o sin suscripción): volver a Pro se cobra hoy; no hay segunda prueba.
  const fila: Fila = { business_id: negocio, status: "ended", cycle: cyc, price_cents: precio(cyc), trial_started_at: s?.trial_started_at ?? null, trial_ends_at: s?.trial_ends_at ?? null, trial_choice: "card",
    payer_user_id: userId, card_pm: card, current_period_end: null, failed_attempts: 0, next_attempt_at: null, courtesy_until: null, ended_at: null };
  await db().query(`insert into subscriptions (business_id, status, cycle, payer_user_id, card_pm, trial_choice) values ($1, 'ended', $2, $3, $4, 'card')
                    on conflict (business_id) do update set cycle = $2, payer_user_id = $3, card_pm = $4, updated_at = now()`, [negocio, cyc, userId, card]);
  // 9t3 · La auditoría del dueño entra con la intención del cobro (en su transacción, una vez); «back_to_pro» entra con el cobro hecho (registrarPeriodo),
  // lo cierre esta acción o el barrido. Con un cobro en camino, el mismo toque otra vez no anota otro: termina ese.
  const r = await cobrarPeriodo(fila, Math.floor(Date.now() / 60_000) * 60_000, true, alGuardar ? (c) => alGuardar(c, true) : undefined); // el mismo minuto y tarjeta = el mismo intento (doble toque)
  // 9n-4 · El banco pide confirmar: la hoja se abre en Tu plan; al confirmar, la verificación completa el período (completarRenovacion), sin otro cobro.
  if (!r.ok) return { ok: false, msg: r.msg, ...(r.hoja ? { verificar: r.hoja } : {}) };
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
  const desde = (await db().query<{ t: Date }>(`select now() as t`)).rows[0]?.t ?? new Date();
  await procesar(negocio);
  // 25 nov (9u, revisión de Fable) · Como en seguirConPro: «rechazó» solo con un intento de ahora (con el candado en manos del barrido no se intentó)
  // y si el banco pide confirmar, se dice eso (antes salía «volvió a rechazarla»).
  const s = (await db().query<{ status: string; camino: boolean; verificar: boolean; intento: boolean }>(`select status, exists (select 1 from subscription_charges c where c.business_id = $1 and c.status = 'pending') as camino,
      exists (select 1 from subscription_charges c where c.business_id = $1 and c.status = 'action' and c.created_at >= $2) as verificar,
      exists (select 1 from subscription_charges c where c.business_id = $1 and c.created_at >= $2) as intento from subscriptions where business_id = $1`, [negocio, desde])).rows[0];
  if (s?.status === "active") return { ok: true };
  // 9t3 · Stripe no contestó: el cobro quedó en camino (no es un «no» del banco) y se termina solo con su llave.
  if (s?.camino) return { ok: false, msg: EN_CAMINO };
  if (!s?.intento) return { ok: false, msg: SIN_INTENTO_AUN };
  if (s?.verificar) return no("El banco pide confirmar el cobro: le mandamos al dueño un aviso con el enlace.", "The bank asks to confirm the charge: we sent the owner a notice with the link.");
  return no("Se intentó y el banco volvió a rechazarla.", "We tried and the bank declined again.");
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
