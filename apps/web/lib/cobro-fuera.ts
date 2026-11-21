import "server-only";
import type { PoolClient } from "pg";
import { db, tx } from "./db";
import { HORAS_LLAVE_STRIPE as HORAS_LLAVE } from "./cobros";
import { pasarela } from "./pagos/pasarela";

/* 9t4 (21 nov) · Los cobros con la tarjeta guardada que To'Latino hace sin la persona delante: el plan del Hogar cada mes (lib/planes.ts), la renta al
   recoger, «un día más» y los días tarde (lib/rentas.ts), y la renovación sola de un patrocinio (lib/patrocinio.ts, lib/patrocinio-evento.ts). Una
   sola forma de hacerlo, la del cobro de Pro (lib/suscripcion.ts, 0199), en una tabla para los tres (offsession_charges, 0202):
   (1) anotarCobro: la INTENCIÓN en una transacción (la del que decide, si la hay): su llave, el monto, la comisión, la tarjeta y a qué corresponde, fijos.
       Si ese objeto ya tiene una en camino, se devuelve ESA (nunca dos en camino; la base lo impone); si ese propósito ya se cobró, la hecha (nunca dos
       cobros por lo mismo; la base lo impone).
   (2) terminarCobro: anota que se manda (sent_at) y llama a la pasarela con ESA llave. Nunca con una llave de más de HORAS_LLAVE (lo que Stripe recuerda
       una llave): pasado eso, la alerta offsession_stuck, una vez, y ningún cobro más.
   (3) El cierre, en otra transacción, una vez ('done' where status = 'pending') con lo que el flujo hace al cobrar.
   Sin respuesta de Stripe NO es un «no» del banco: la intención sigue en camino y el estado del plan, la renta o el patrocinio no cambia por eso; la
   persona lee «quedó en camino, no lo repitas» y el barrido (barrerCobrosFuera) la termina con la misma llave. Un «no» de verdad deja la intención
   rechazada (nada salió): el siguiente intento es otra intención con otra llave. */
export type TipoCobro = "plan" | "renta" | "patrocinio_negocio" | "patrocinio_evento";
type Bi = { es: string; en: string };
export type Intencion = {
  id: string; kind: TipoCobro; ref: string; para: string; op: string | null; negocio: string; ciudad: string | null; payer: string; monto: number; fee: number;
  destino: string | null; pm: string; idem: string; detalle: Record<string, unknown>; st: "pending" | "done" | "failed"; enviada: boolean; n: number; err: string | null;
  pi: string | null; hold: string | null; vieja: boolean; nueva: boolean;
};
const SEL = `id::text, kind, ref_id as ref, purpose as para, operation_id::text as op, business_id as negocio, city_id as ciudad, payer_user_id::text as payer, amount_cents as monto,
             fee_cents as fee, destination as destino, pm, idem_key as idem, detail as detalle, status as st, sent_at is not null as enviada, attempts as n, last_error as err,
             stripe_pi as pi, hold_pi as hold, created_at <= now() - make_interval(hours => ${HORAS_LLAVE}) as vieja`;
/* Lo que la pasarela contesta SIN decir si cobró (las mismas de Pro): la intención sigue en camino. Cualquier otro código es un «no» de verdad. */
export const SIN_RESPUESTA = new Set(["red", "api_error", "error", "rate_limit", "rate_limit_error", "lock_timeout", "idempotency_key_in_use", "idempotency_error", "processing"]);
export const EN_CAMINO: Bi = { es: "Stripe no contestó. El cobro quedó en camino y se termina solo en unos minutos: no lo repitas.", en: "Stripe did not answer. The charge is on its way and finishes by itself in a few minutes: do not repeat it." };
export const VIEJO: Bi = { es: "Hay un cobro de hace más de un día sin respuesta de Stripe: el equipo de dinero lo revisa. No lo repitas.", en: "There is a charge from over a day ago with no answer from Stripe: the money team reviews it. Do not repeat it." };
export const YA_RECHAZADO: Bi = { es: "Tu banco ya rechazó este cobro. Prueba con otra tarjeta.", en: "Your bank already declined this charge. Try another card." };
const money = (c: number) => `$${(c / 100).toFixed(2)}`;
const QUE: Record<TipoCobro, Bi> = {
  plan: { es: "el plan", en: "the plan" }, renta: { es: "la renta", en: "the rental" },
  patrocinio_negocio: { es: "la renovación del patrocinio", en: "the sponsorship renewal" }, patrocinio_evento: { es: "la renovación del patrocinio del evento", en: "the event sponsorship renewal" },
};

export type Anotar = {
  kind: TipoCobro; ref: string; para: string; op?: string | null; negocio: string; ciudad?: string | null; payer: string; monto: number; fee: number; destino: string | null; pm: string;
  /* La llave de Stripe de la k-ésima intención de este propósito (k = las que ya hubo: tras un «no» del banco, la siguiente es otra llave). */
  idem: (k: number) => string; detalle?: Record<string, unknown>;
};
/* Paso 1. Con el candado de los cobros de ese objeto: dos a la vez no anotan dos. `c`: la transacción del que decide (la intención entra con su decisión
   y su auditoría); sin ella, una propia. alGuardar (la auditoría de quien decide) solo con una intención nueva. */
export async function anotarCobro(x: Anotar, c?: PoolClient | null, alGuardar?: (c: PoolClient) => Promise<unknown>): Promise<Intencion> {
  const en = async (k: PoolClient): Promise<Intencion> => {
    await k.query(`select pg_advisory_xact_lock(hashtext('cobro-fuera:' || $1 || ':' || $2))`, [x.kind, x.ref]);
    const ya = (await k.query<Omit<Intencion, "nueva">>(`select ${SEL} from offsession_charges where kind = $1 and ref_id = $2 and (status = 'pending' or (status = 'done' and purpose = $3))
                                                         order by (status = 'pending') desc, id desc limit 1`, [x.kind, x.ref, x.para])).rows[0];
    if (ya) return { ...ya, nueva: false };
    const n = Number((await k.query<{ n: number }>(`select count(*)::int as n from offsession_charges where kind = $1 and ref_id = $2 and purpose = $3`, [x.kind, x.ref, x.para])).rows[0]!.n);
    const a = (await k.query<Omit<Intencion, "nueva">>(
      `insert into offsession_charges (kind, ref_id, purpose, operation_id, business_id, city_id, payer_user_id, amount_cents, fee_cents, destination, pm, idem_key, detail)
       values ($1, $2, $3, $4::bigint, $5, coalesce($6, (select city_id from businesses where id = $5)), $7::uuid, $8, $9, $10, $11, $12, $13::jsonb) returning ${SEL}`,
      [x.kind, x.ref, x.para, x.op ?? null, x.negocio, x.ciudad ?? null, x.payer, x.monto, Math.min(x.fee, x.monto), x.destino, x.pm, x.idem(n), JSON.stringify(x.detalle ?? {})])).rows[0]!;
    await alGuardar?.(k);
    return { ...a, nueva: true };
  };
  return c ? en(c) : tx(en);
}
/* La intención en camino de un objeto (para quien decide si la sigue o la suelta). */
export async function enCamino(kind: TipoCobro, ref: string): Promise<Intencion | null> {
  const a = (await db().query<Omit<Intencion, "nueva">>(`select ${SEL} from offsession_charges where kind = $1 and ref_id = $2 and status = 'pending'`, [kind, ref])).rows[0];
  return a ? { ...a, nueva: false } : null;
}
export async function intencion(id: string): Promise<Intencion | null> {
  const a = (await db().query<Omit<Intencion, "nueva">>(`select ${SEL} from offsession_charges where id = $1::bigint`, [id])).rows[0];
  return a ? { ...a, nueva: false } : null;
}
/* Una intención que nunca se mandó y ya no aplica (el patrocinio terminó, no quedaba puesto, el depósito no se pudo retener) se suelta: nada salió.
   Si ya se mandó, no: Stripe pudo cobrarla (la termina terminarCobro o, pasado el día, la alerta). */
export async function soltarSinMandar(id: string, porque: string): Promise<boolean> {
  return !!(await db().query(`update offsession_charges set status = 'failed', last_error = left($2, 120) where id = $1::bigint and status = 'pending' and sent_at is null`, [id, porque])).rowCount;
}
/* Un intento que no llegó a la pasarela del cobro (el depósito de la renta no contestó): queda anotado, la intención sigue en camino. */
export async function anotarIntento(id: string, codigo: string) {
  await db().query(`update offsession_charges set attempts = least(10000, attempts + 1), last_error = left($2, 120) where id = $1::bigint and status = 'pending'`, [id, codigo]);
}
export async function anotarRetencion(id: string, holdPi: string) {
  await db().query(`update offsession_charges set hold_pi = $2 where id = $1::bigint and status = 'pending' and hold_pi is null`, [id, holdPi]);
}
/* El cierre (paso 3) dentro de la transacción del flujo: 'done' una vez. false = otro (otra pestaña, el barrido) ya lo cerró: no se aplica nada. */
export async function marcarHecho(c: PoolClient, id: string, pi: string): Promise<boolean> {
  return !!(await c.query(`update offsession_charges set status = 'done', stripe_pi = $2, last_error = null where id = $1::bigint and status = 'pending'`, [id, pi])).rowCount;
}

export type Cobrado = { ok: true; pi: string; marca: string | null; l4: string | null; ya?: true }
  | { ok: false; enCamino: true; msg: Bi } | { ok: false; enCamino?: undefined; codigo: string; msg: Bi; pi?: string };
/* Pasos 2 y 3 (también desde el barrido). `cerrar`: lo que el flujo hace con el cobro hecho, en la MISMA transacción que lo marca 'done' (una vez); sin
   él, quien llama cierra en su propia transacción con marcarHecho. */
export async function terminarCobro(a: Intencion, cerrar?: (c: PoolClient, r: { pi: string; marca: string | null; l4: string | null }) => Promise<unknown>): Promise<Cobrado> {
  if (a.st === "done") return { ok: true, pi: a.pi ?? "", marca: null, l4: null, ya: true };
  if (a.st === "failed") return { ok: false, codigo: "ya_rechazado", msg: YA_RECHAZADO };
  if (a.vieja) { await alertaVieja(a); return { ok: false, enCamino: true, msg: VIEJO }; }
  // Se anota que se manda ANTES de la llamada (en su propia sentencia): si el proceso muere después, nadie la suelta como «nunca mandada».
  if (!(await db().query(`update offsession_charges set sent_at = coalesce(sent_at, now()) where id = $1::bigint and status = 'pending'`, [a.id])).rowCount) {
    const b = await intencion(a.id);
    return b?.st === "done" ? { ok: true, pi: b.pi ?? "", marca: null, l4: null, ya: true } : { ok: false, codigo: "ya_rechazado", msg: YA_RECHAZADO };
  }
  const cliente = await pasarela.cliente(a.payer).catch(() => null);
  const meta = { ...((a.detalle.meta as Record<string, string> | undefined) ?? {}), cobro: a.id };
  type R = { ok: true; id: string; marca?: string | null; ultimos4?: string | null } | { ok: false; codigo: string; mensaje: Bi; pi?: string };
  const caida = { ok: false as const, codigo: "error", mensaje: EN_CAMINO };
  const r: R = a.destino
    ? await pasarela.cobrarFuera({ centavos: a.monto, comision: a.fee, destino: a.destino, pm: a.pm, cliente, idem: a.idem, meta }).catch(() => caida)
    : await pasarela.cobrarDirecto({ centavos: a.monto, pm: a.pm, cliente, idem: a.idem, meta }).catch(() => caida);
  if (!r.ok) {
    const codigo = String(r.codigo ?? "error").slice(0, 60);
    if (SIN_RESPUESTA.has(codigo)) {
      await db().query(`update offsession_charges set attempts = least(10000, attempts + 1), last_error = left($2, 120) where id = $1::bigint and status = 'pending'`, [a.id, codigo]);
      return { ok: false, enCamino: true, msg: EN_CAMINO };
    }
    // Un «no» de verdad (también el banco que pide 3-D Secure fuera de sesión: no se cobró): nada salió; la intención queda rechazada.
    await db().query(`update offsession_charges set status = 'failed', attempts = least(10000, attempts + 1), last_error = left($2, 120) where id = $1::bigint and status = 'pending'`, [a.id, codigo]);
    return { ok: false, codigo, msg: r.mensaje, ...(r.pi ? { pi: r.pi } : {}) };
  }
  const hecho = { pi: r.id, marca: r.marca ?? null, l4: r.ultimos4 ?? null };
  if (!cerrar) return { ok: true, ...hecho };
  const nuevo = await tx(async (c) => {
    if (!(await marcarHecho(c, a.id, r.id))) return false;
    await cerrar(c, hecho);
    return true;
  });
  return nuevo ? { ok: true, ...hecho } : { ok: true, ...hecho, ya: true };
}

/* Lo que ya no aplica (el plan se canceló, la renta cambió, el patrocinio terminó): si nunca se mandó, se suelta; si se mandó, se le pregunta a Stripe con
   su llave y, si cobró, queda hecha con la alerta offsession_unapplied (el equipo decide si se devuelve). */
export async function noAplica(a: Intencion, porque: string, detalle: Bi, alHacer?: (c: PoolClient, r: { pi: string }) => Promise<unknown>): Promise<boolean> {
  if (a.st !== "pending") return false;
  if (!a.enviada && (await soltarSinMandar(a.id, porque))) return true;
  const r = await terminarCobro(a, async (c, h) => { await alHacer?.(c, h); });
  if (r.ok && !r.ya) await alertaSinAplicar(a, detalle);
  return r.ok;
}
export async function alertaSinAplicar(a: Intencion, detalle: Bi) {
  await (await import("./dinero-alertas")).alertar("offsession_unapplied", a.idem, { monto: a.monto, negocio: a.negocio, ciudad: a.ciudad, detalle: {
    es: `Se cobró ${QUE[a.kind].es} (${money(a.monto)}) cuando ya no aplicaba: ${detalle.es} No se aplicó. Decide si se devuelve.`,
    en: `${QUE[a.kind].en[0]!.toUpperCase()}${QUE[a.kind].en.slice(1)} was charged (${money(a.monto)}) when it no longer applied: ${detalle.en} It was not applied. Decide whether to refund it.` } }).catch(() => undefined);
}
async function alertaVieja(a: Intencion) {
  await (await import("./dinero-alertas")).alertar("offsession_stuck", a.idem, { monto: a.monto, negocio: a.negocio, ciudad: a.ciudad, detalle: {
    es: `Cobro de ${QUE[a.kind].es} de ${money(a.monto)} sin respuesta de Stripe en ${HORAS_LLAVE} h (${a.n} intentos, ${a.err ?? "sin motivo"}): no se cobra otra vez. Mira en Stripe si se cobró.${a.hold ? ` El depósito sigue retenido (${a.hold}).` : ""}`,
    en: `Charge for ${QUE[a.kind].en} of ${money(a.monto)} with no answer from Stripe in ${HORAS_LLAVE} h (${a.n} attempts, ${a.err ?? "no reason"}): it is not charged again. Check in Stripe whether it was charged.${a.hold ? ` The deposit is still held (${a.hold}).` : ""}` } }).catch(() => undefined);
}

/* El barrido: las intenciones que quedaron en camino (Stripe no contestó, o el proceso murió entre la intención y el cierre) las termina cada flujo con su
   llave, dentro de HORAS_LLAVE; las más viejas, la alerta (una vez). Los patrocinios vencidos que siguen vivos los termina su propio barrido (vencerUno). */
export async function barrerCobrosFuera(): Promise<number> {
  const L = (await db().query<{ id: string; kind: TipoCobro }>(
    `select id::text, kind from offsession_charges where status = 'pending' and created_at < now() - interval '2 minutes'
        and created_at > now() - make_interval(hours => $1::int) order by created_at limit 50`, [HORAS_LLAVE])).rows;
  let n = 0;
  for (const x of L) {
    const a = await intencion(x.id);
    if (!a || a.st !== "pending") continue;
    const termina = async (): Promise<boolean> => x.kind === "plan" ? (await import("./planes")).terminarCobroPlan(a)
      : x.kind === "renta" ? (await (await import("./rentas")).terminarCobroRenta(a, true)).ok
      : (await import("./patrocinio")).terminarRenovacionSuelta(a);
    const hecho = await termina().catch((e) => { console.error("[cobro-fuera]", x.kind, x.id, e instanceof Error ? e.message : e); return false; });
    if (hecho) n++;
  }
  const V = (await db().query<Omit<Intencion, "nueva">>(
    `select ${SEL} from offsession_charges c where status = 'pending' and created_at <= now() - make_interval(hours => $1::int)
        and not exists (select 1 from money_alerts m where m.kind = 'offsession_stuck' and m.subject_id = c.idem_key) order by created_at limit 50`, [HORAS_LLAVE])).rows;
  for (const a of V) await alertaVieja({ ...a, nueva: false });
  return n;
}
