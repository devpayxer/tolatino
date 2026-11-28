import "server-only";
import type { PoolClient } from "pg";
import { db, tx } from "./db";
import { HORAS_LLAVE_STRIPE as HORAS_LLAVE, soltarSuelta } from "./cobros";
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
   rechazada (nada salió): el siguiente intento es otra intención con otra llave.
   9t5 (21 nov, 0203) · Pasadas HORAS_LLAVE ya no se manda con su llave, pero tampoco se queda 'pending' para siempre: el barrido (o «Preguntar a Stripe
   ahora» del Super Admin) le PREGUNTA a la pasarela por el dato buscable que se mandó al crear (gateway_ref → metadata tl_intencion) y el cierre lee lo
   que contestó (lib/consulta-pasarela.ts › veredicto): salió → se cierra hecha por este mismo cierre (marcarHecho + lo del flujo, una vez); el banco dijo
   que no → rechazada (el flujo hace lo de un «no»); no está en Stripe (y se mandó con el dato y pasó el margen) → rechazada «nunca llegó» (nada salió:
   el siguiente cobro del objeto puede salir; el flujo no lo cuenta como rechazo); en curso, varios o sin respuesta → sigue en camino con su alerta. */
export type TipoCobro = "plan" | "renta" | "patrocinio_negocio" | "patrocinio_evento";
type Bi = { es: string; en: string };
export type Intencion = {
  id: string; kind: TipoCobro; ref: string; para: string; op: string | null; negocio: string; ciudad: string | null; payer: string; monto: number; fee: number;
  destino: string | null; pm: string; idem: string; detalle: Record<string, unknown>; st: "pending" | "done" | "failed"; enviada: boolean; n: number; err: string | null;
  pi: string | null; hold: string | null; vieja: boolean; nueva: boolean; gref: string | null;
};
const SEL = `id::text, kind, ref_id as ref, purpose as para, operation_id::text as op, business_id as negocio, city_id as ciudad, payer_user_id::text as payer, amount_cents as monto,
             fee_cents as fee, destination as destino, pm, idem_key as idem, detail as detalle, status as st, sent_at is not null as enviada, attempts as n, last_error as err,
             stripe_pi as pi, hold_pi as hold, created_at <= now() - make_interval(hours => ${HORAS_LLAVE}) as vieja, gateway_ref as gref`;
/* Lo que la pasarela contesta SIN decir si cobró (las mismas de Pro): la intención sigue en camino. Cualquier otro código es un «no» de verdad. */
export const SIN_RESPUESTA = new Set(["red", "api_error", "error", "rate_limit", "rate_limit_error", "lock_timeout", "idempotency_key_in_use", "idempotency_error", "processing"]);
export const EN_CAMINO: Bi = { es: "Stripe no contestó. El cobro quedó en camino y se termina solo en unos minutos: no lo repitas.", en: "Stripe did not answer. The charge is on its way and finishes by itself in a few minutes: do not repeat it." };
export const VIEJO: Bi = { es: "Hay un cobro de hace más de un día sin respuesta de Stripe: el equipo de dinero lo revisa. No lo repitas.", en: "There is a charge from over a day ago with no answer from Stripe: the money team reviews it. Do not repeat it." };
export const YA_RECHAZADO: Bi = { es: "Tu banco ya rechazó este cobro. Prueba con otra tarjeta.", en: "Your bank already declined this charge. Try another card." };
export const NO_LLEGO: Bi = { es: "Ese cobro nunca llegó a Stripe: no se cobró nada. Vuelve a intentarlo.", en: "That charge never reached Stripe: nothing was charged. Try again." };
export const DEVUELTO: Bi = { es: "Ese cobro salió de más en Stripe y se devuelve: no quedó nada cobrado. Vuelve a intentarlo.", en: "That charge went through more than once at Stripe and is being refunded: nothing stays charged. Try again." };
import { usd as money } from "./dinero-comun";
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
/* El cierre (paso 3) dentro de la transacción del flujo: 'done' una vez. false = otro (otra pestaña, el barrido) ya lo cerró: no se aplica nada.
   9t5 · Si el PaymentIntent es el que encontró la consulta a la pasarela, la auditoría lo dice (origen «consulta a la pasarela») en ESTA transacción. */
export async function marcarHecho(c: PoolClient, id: string, pi: string): Promise<boolean> {
  const u = (await c.query<{ ciudad: string | null }>(`update offsession_charges set status = 'done', stripe_pi = $2, last_error = null where id = $1::bigint and status = 'pending' returning city_id as ciudad`, [id, pi])).rows[0];
  if (!u) return false;
  if ((await c.query(`select 1 from gateway_checks where subject_kind = 'offsession_charges' and subject_id = $1::bigint and result = 'hecho' and stripe_id = $2 limit 1`, [id, pi])).rowCount)
    await (await import("./consulta-pasarela")).auditarCierre(c, "offsession_charges", id, u.ciudad, { estado: "hecho", pi });
  return true;
}

/* noLlego (9t5): la consulta dijo que ese cobro nunca llegó a Stripe; la intención quedó rechazada sin que el banco dijera que no: el flujo no lo cuenta
   como rechazo (como enCamino) y el siguiente cobro del objeto es otra intención con otra llave. */
/* 9t6 · devuelto: el equipo decidió que ninguno de los cobros que halló Stripe vale y se devuelven (gateway_review): para el flujo es como «nunca llegó». */
/* 28 nov (LAUNCH 9q) · verificar: el banco pidió autenticar el cobro y la verificación quedó a nombre de quien paga (terminarCobro con `verif`): NO es un «no»
   (la intención sigue en camino, ya mandada, hasta que se confirme o venza: quien llama la cierra con cerrarConfirmado o rechazarSinCobro). */
export type Cobrado = { ok: true; pi: string; marca: string | null; l4: string | null; ya?: true }
  | { ok: false; enCamino: true; msg: Bi; noLlego?: true; devuelto?: true } | { ok: false; enCamino?: undefined; codigo: string; msg: Bi; pi?: string; verificar?: import("./pagos/pasarela").Verificar };
/* 28 nov (LAUNCH 9q) · De quién es la verificación si el banco pide autenticar el cobro (el de la renta al recogerla): quien paga, la operación y la base
   de la verificación. Sin esto, el banco que pide autenticar es un «no» (el plan del Hogar, un día más, los días tarde). */
export type VerifCobro = { usuario: import("./pagos/pasarela").Quien; op: string; base: string };
/* Pasos 2 y 3 (también desde el barrido). `cerrar`: lo que el flujo hace con el cobro hecho, en la MISMA transacción que lo marca 'done' (una vez); sin
   él, quien llama cierra en su propia transacción con marcarHecho. */
export async function terminarCobro(a: Intencion, cerrar?: (c: PoolClient, r: { pi: string; marca: string | null; l4: string | null }) => Promise<unknown>, o: { verif?: VerifCobro } = {}): Promise<Cobrado> {
  if (a.st === "done") return { ok: true, pi: a.pi ?? "", marca: null, l4: null, ya: true };
  if (a.st === "failed") return { ok: false, codigo: "ya_rechazado", msg: YA_RECHAZADO };
  // 9t5 · Pasadas HORAS_LLAVE nunca va a la pasarela con su llave: se cierra con lo que contestó la consulta (o sigue en camino con su alerta).
  if (a.vieja) return terminarVieja(a, cerrar);
  // Se anota que se manda ANTES de la llamada (en su propia sentencia): si el proceso muere después, nadie la suelta como «nunca mandada». 9t5 · Con el dato
  // buscable (gateway_ref) en la MISMA sentencia, solo la primera vez: un reintento de una intención que salió sin él va sin él (la misma llave con otros
  // parámetros, Stripe la rechaza), y esa nunca se da por «no llegó».
  const m = (await db().query<{ gref: string | null }>(`update offsession_charges set gateway_ref = case when sent_at is null then 'offsession_charges:' || id else gateway_ref end, sent_at = coalesce(sent_at, now()) where id = $1::bigint and status = 'pending' returning gateway_ref as gref`, [a.id])).rows[0];
  if (!m) {
    const b = await intencion(a.id);
    return b?.st === "done" ? { ok: true, pi: b.pi ?? "", marca: null, l4: null, ya: true } : { ok: false, codigo: "ya_rechazado", msg: YA_RECHAZADO };
  }
  const cliente = await pasarela.cliente(a.payer).catch(() => null);
  const meta = { ...((a.detalle.meta as Record<string, string> | undefined) ?? {}), cobro: a.id, ...(m.gref ? { tl_intencion: m.gref } : {}) };
  type R = { ok: true; id: string; marca?: string | null; ultimos4?: string | null } | { ok: false; codigo: string; mensaje: Bi; pi?: string; verificar?: import("./pagos/pasarela").Verificar };
  const caida = { ok: false as const, codigo: "error", mensaje: EN_CAMINO };
  const r: R = a.destino
    ? await pasarela.cobrarFuera({ centavos: a.monto, comision: a.fee, destino: a.destino, pm: a.pm, cliente, idem: a.idem, meta,
        ...(o.verif ? { usuario: o.verif.usuario, verif: { kind: "renta" as const, op: o.verif.op, base: o.verif.base } } : {}) }).catch(() => caida)
    : await pasarela.cobrarDirecto({ centavos: a.monto, pm: a.pm, cliente, idem: a.idem, meta }).catch(() => caida);
  if (!r.ok) {
    const codigo = String(r.codigo ?? "error").slice(0, 60);
    if (SIN_RESPUESTA.has(codigo)) {
      await db().query(`update offsession_charges set attempts = least(10000, attempts + 1), last_error = left($2, 120) where id = $1::bigint and status = 'pending'`, [a.id, codigo]);
      return { ok: false, enCamino: true, msg: EN_CAMINO };
    }
    // 28 nov (LAUNCH 9q) · El banco pide autenticar y la verificación quedó a nombre de quien paga: no es un «no». La intención sigue en camino (ya mandada)
    // con su intento anotado; nadie vuelve a la pasarela con esta llave (Stripe contestaría lo mismo): quien llama la cierra al confirmarse o vencer.
    if ("verificar" in r && r.verificar && r.pi) {
      await db().query(`update offsession_charges set attempts = least(10000, attempts + 1), last_error = 'authentication_required' where id = $1::bigint and status = 'pending'`, [a.id]);
      return { ok: false, codigo, msg: r.mensaje, pi: r.pi, verificar: r.verificar };
    }
    // Un «no» de verdad (también el banco que pide 3-D Secure fuera de sesión sin una verificación a nombre de quien paga: no se cobró): nada salió; la
    // intención queda rechazada.
    await db().query(`update offsession_charges set status = 'failed', attempts = least(10000, attempts + 1), last_error = left($2, 120) where id = $1::bigint and status = 'pending'`, [a.id, codigo]);
    return { ok: false, codigo, msg: r.mensaje, ...(r.pi ? { pi: r.pi } : {}) };
  }
  return cerrarHecho(a, { pi: r.id, marca: r.marca ?? null, l4: r.ultimos4 ?? null }, cerrar);
}
type Cerrar = (c: PoolClient, r: { pi: string; marca: string | null; l4: string | null }) => Promise<unknown>;
/* 28 nov (LAUNCH 9q) · El cobro que el banco pidió autenticar y quien paga confirmó (Stripe dice cobrado: se mira, nunca se supone): se cierra por el MISMO
   cierre que un cobro contestado ('done' una vez, con lo del flujo en su transacción). Quien llega segundo (la hoja, el webhook, el barrido) lee `ya`. */
export const cerrarConfirmado = (a: Intencion, hecho: { pi: string; marca: string | null; l4: string | null }, cerrar: Cerrar) => cerrarHecho(a, hecho, cerrar);
/* 28 nov (LAUNCH 9q) · El cobro que el banco pidió autenticar y nadie confirmó: su intento ya se canceló en Stripe (nada salió ni puede salir). La intención,
   ya mandada, queda rechazada UNA vez: true solo para quien la cierra (y suelta lo que se retuvo para ella); el siguiente intento es otra llave. */
export async function rechazarSinCobro(id: string, porque: string): Promise<boolean> {
  return !!(await db().query(`update offsession_charges set status = 'failed', last_error = left($2, 120) where id = $1::bigint and status = 'pending'`, [id, porque])).rowCount;
}
/* El cierre de un cobro hecho, el mismo para la respuesta de la pasarela y para lo que encontró la consulta: 'done' una vez y lo del flujo en la MISMA
   transacción. Sin `cerrar`, quien llama cierra en su propia transacción con marcarHecho. */
async function cerrarHecho(a: Intencion, hecho: { pi: string; marca: string | null; l4: string | null }, cerrar?: Cerrar): Promise<Cobrado> {
  if (!cerrar) return { ok: true, ...hecho };
  const nuevo = await tx(async (c) => {
    if (!(await marcarHecho(c, a.id, hecho.pi))) return false;
    await cerrar(c, hecho);
    return true;
  });
  return nuevo ? { ok: true, ...hecho } : { ok: true, ...hecho, ya: true };
}
/* 26 nov (LAUNCH «el dinero dice lo que pasó» (1)) · El depósito que se retuvo para esta intención (hold_pi) se suelta por cobros › soltarSuelta: nadie más lo
   va a soltar, así que si Stripe no lo suelta (o ya lo había cobrado) el equipo de dinero tiene su alerta (hold_stuck suelta:<pi>). Antes se tiraba lo que
   contestaba la pasarela. Guardián liberarSoloPorLaRegla. */
export async function soltarDeposito(a: Intencion, por: Bi) {
  if (!a.hold) return;
  const dep = typeof a.detalle.dep === "number" ? a.detalle.dep : 0, q = QUE[a.kind];
  await soltarSuelta(a.hold, { que: { es: `Depósito de ${q.es} (cobro ${a.idem}; ${por.es})`, en: `Deposit for ${q.en} (charge ${a.idem}; ${por.en})` }, monto: dep, persona: a.payer, negocio: a.negocio, ciudad: a.ciudad });
}
/* 9t5 · Una intención de más de HORAS_LLAVE: NUNCA a la pasarela con su llave. Se cierra con el último veredicto de la consulta (lib/consulta-pasarela.ts),
   cada cambio una vez (where status = 'pending'); sin un veredicto que cierre, sigue en camino y alerta (offsession_stuck, una vez). */
async function terminarVieja(a: Intencion, cerrar?: Cerrar): Promise<Cobrado> {
  const v = await (await import("./consulta-pasarela")).veredicto("offsession_charges", a.id);
  // 9t6 · El equipo cerró su gateway_review con «ninguno vale» (lo hallado se devuelve: lib/revision-pasarela.ts): nada quedó cobrado. Falla 'devuelto', sin
  // contar como un «no» del banco (como «nunca llegó»): el siguiente cobro del objeto es otra intención con otra llave.
  if (v?.revisado === "ninguno") {
    if (!(await db().query(`update offsession_charges set status = 'failed', last_error = 'devuelto' where id = $1::bigint and status = 'pending'`, [a.id])).rowCount) {
      const b = await intencion(a.id);
      return b?.st === "done" ? { ok: true, pi: b.pi ?? "", marca: null, l4: null, ya: true } : { ok: false, codigo: "ya_rechazado", msg: YA_RECHAZADO };
    }
    await soltarDeposito(a, { es: "ninguno de los cobros que halló Stripe valía (se devuelve)", en: "none of the charges Stripe found was valid (it is refunded)" });
    return { ok: false, enCamino: true, noLlego: true, devuelto: true, msg: DEVUELTO };
  }
  if (v?.resultado === "hecho" && v.stripe) return cerrarHecho(a, { pi: v.stripe, marca: null, l4: null }, cerrar);
  if (v?.resultado === "fallido" || v?.noLlego) {
    const motivo = v.resultado === "fallido" ? "consulta_fallido" : "nunca_llego";
    if (!(await db().query(`update offsession_charges set status = 'failed', last_error = $2 where id = $1::bigint and status = 'pending'`, [a.id, motivo])).rowCount) {
      const b = await intencion(a.id);
      return b?.st === "done" ? { ok: true, pi: b.pi ?? "", marca: null, l4: null, ya: true } : { ok: false, codigo: "ya_rechazado", msg: YA_RECHAZADO };
    }
    if (motivo === "consulta_fallido") return { ok: false, codigo: motivo, msg: YA_RECHAZADO };
    // Nunca llegó: nada salió. El depósito que se retuvo para esta renta se suelta (el siguiente toque retiene con su propia llave).
    await soltarDeposito(a, { es: "el cobro nunca llegó a Stripe", en: "the charge never reached Stripe" });
    return { ok: false, enCamino: true, noLlego: true, msg: NO_LLEGO };
  }
  await alertaVieja(a);
  return { ok: false, enCamino: true, msg: VIEJO };
}
/* 9t5 · Otra intención igual a una que nunca llegó a Stripe (los días tarde de una renta: nadie más la vuelve a anotar). Otra llave (-r<n>). */
export async function reanotar(a: Intencion): Promise<Intencion> {
  const base = a.idem.replace(/-r\d+$/, "");
  return anotarCobro({ kind: a.kind, ref: a.ref, para: a.para, op: a.op, negocio: a.negocio, ciudad: a.ciudad, payer: a.payer, monto: a.monto, fee: a.fee, destino: a.destino, pm: a.pm,
    idem: (k) => `${base}-r${k}`, detalle: a.detalle });
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
  // 9t9 · Cada intención por su cuenta (lib/barrido-uno.ts): antes el error de una se tragaba (solo el registro); ahora la tarea sale fallida diciendo cuál.
  // Las que Stripe no contesta siguen en camino (y tocando): por tandas sin repetirlas en la corrida, para que no tapen a las de detrás.
  const U = await import("./barrido-uno"), B = new U.Fallos("cobrosFuera");
  let n = 0;
  await U.porTandas(B, 50, async (vistos) => (await db().query<{ id: string; kind: TipoCobro }>(
    `select id::text, kind from offsession_charges where status = 'pending' and created_at < now() - interval '2 minutes'
        and created_at > now() - make_interval(hours => $1::int) and not (id = any($2::bigint[])) order by created_at, offsession_charges.id limit 50`, [HORAS_LLAVE, vistos])).rows,
  (x) => `${x.kind} ${x.id}`, async (x) => {
    const a = await intencion(x.id);
    if (!a || a.st !== "pending") return;
    if (await termina(a, true)) n++;
  }, { clave: (x) => x.id });
  // 9t5 · Las de más de HORAS_LLAVE: se le pregunta a la pasarela (una vez cada CADA_MIN por intención) y el flujo cierra con lo que dijo; si no cierra,
  // sigue en camino con su alerta offsession_stuck (una vez). Nunca otra vez a la pasarela con su llave.
  const V = (await db().query<{ id: string }>(
    `select c.id::text from offsession_charges c left join lateral (select max(y.at) as ult from gateway_checks y where y.subject_kind = 'offsession_charges' and y.subject_id = c.id) g on true
      where c.status = 'pending' and c.created_at <= now() - make_interval(hours => $1::int)
        and (g.ult is null or g.ult <= now() - make_interval(mins => $2::int))
      order by g.ult nulls first, c.created_at limit 20`, [HORAS_LLAVE, (await import("./consulta-pasarela")).CADA_MIN])).rows;
  await B.cada(V, (x) => `consulta ${x.id}`, async (x) => { if ((await resolverCobroFuera(x.id, { origen: "barrido" })).quedo === "hecha") n++; });
  B.fin();
  return n;
}
/* Pasos 2 y 3 de una intención, por el flujo que la anotó (también con lo que contestó la consulta). true = quedó hecha. 9t9 · El barrido (lanzar) deja que
   el error llegue a su ayudante (la tarea sale fallida); la consulta lo anota y sigue, como siempre. */
async function termina(a: Intencion, lanzar = false): Promise<boolean> {
  const f = async (): Promise<boolean> => a.kind === "plan" ? (await import("./planes")).terminarCobroPlan(a)
    : a.kind === "renta" ? (await (await import("./rentas")).terminarCobroRenta(a, true)).ok
    : (await import("./patrocinio")).terminarRenovacionSuelta(a);
  if (lanzar) return f();
  return f().catch((e) => { console.error("[cobro-fuera]", a.kind, a.id, e instanceof Error ? e.message : e); return false; });
}
/* 9t5 · Preguntarle a la pasarela por una intención de más de HORAS_LLAVE y cerrarla con eso, por su flujo: el barrido, o «Preguntar a Stripe ahora» del
   Super Admin (con su auditoría en la transacción que anota la consulta). La consulta va FUERA de cualquier transacción; el cierre, por el flujo, una vez.
   La renovación de un patrocinio vivo y vencido la cierra su propio vencimiento (renovacionConsultada), con el mismo veredicto. */
export type Quedo = "hecha" | "fallida" | "no_llego" | "devuelto" | "sigue" | "ya_no_estaba";
export async function resolverCobroFuera(id: string, o: import("./consulta-pasarela").Origen): Promise<{ resultado: import("./consulta-pasarela").Resultado | null; quedo: Quedo }> {
  const K = await import("./consulta-pasarela");
  const a = await intencion(id);
  if (!a || a.st !== "pending" || !a.vieja) return { resultado: null, quedo: "ya_no_estaba" };
  // 9t6 · Ya decidida por el equipo (gateway_review): no se vuelve a preguntar; se cierra con la decisión (veredicto la lee).
  const rev = await K.revisada("offsession_charges", a.id);
  const resultado = rev ? (await K.veredicto("offsession_charges", a.id))!.resultado : await K.consultar({ tabla: "offsession_charges", id: a.id, monto: a.monto, ciudad: a.ciudad, negocio: a.negocio }, o);
  if (resultado === "hecho" || resultado === "fallido" || resultado === "no_hallado") {
    if (a.kind === "patrocinio_negocio") await (await import("./patrocinio")).renovacionConsultada(a.ref).catch(() => undefined);
    if (a.kind === "patrocinio_evento") await (await import("./patrocinio-evento")).renovacionConsultadaEvt(a.ref).catch(() => undefined);
    const b = await intencion(id);
    if (b?.st === "pending") await termina(b);
  }
  const b = await intencion(id);
  const quedo: Quedo = b?.st === "done" ? "hecha" : b?.st === "failed" ? (b.err === "nunca_llego" ? "no_llego" : b.err === "devuelto" ? "devuelto" : "fallida") : "sigue";
  if (quedo !== "sigue") await K.cerrarAlertaSola("offsession_stuck", a.idem, rev ? { es: "Cerrada sola: el equipo decidió qué cobro vale (gateway_review).", en: "Closed by itself: the team decided which charge counts (gateway_review)." }
    : { es: `Cerrada sola: la consulta a Stripe dijo que ${K.RESULTADO[resultado].es}.`, en: `Closed by itself: the Stripe query said ${K.RESULTADO[resultado].en}.` });
  else await alertaVieja(a);
  return { resultado, quedo };
}
