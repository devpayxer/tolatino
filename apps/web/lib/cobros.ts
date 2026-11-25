import "server-only";
import type { PoolClient } from "pg";
import { db, tx, type AlGuardar } from "./db";
import { pasarela, type Liberacion, type Retencion } from "./pagos/pasarela";
import { soloLectura } from "./vista-equipo";

/* Cobros con tarjeta de un pedido (Payment). Reglas (Super Admin › Planes › Comisiones, dash2-pay.js):
   - Se RETIENE el total al enviar; se COBRA cuando el negocio acepta (o al instante si acepta solo); se LIBERA completo si
     no se da (no lo acepta en 10 min, lo rechaza o el cliente cancela antes); se DEVUELVE total o parcial después.
   - Comisión de To'Latino: pedidos 10 % del subtotal (envío y propina van íntegros al negocio); el cargo de la tarjeta sale
     de la comisión. La regla vigente vive en fee_rules (nunca en el código del cliente).
   - El servidor decide los montos; cada movimiento es idempotente; si una llamada a la pasarela falla, `repararPagos` lo
     vuelve a intentar la próxima vez que alguien mira ese negocio (y el guardián del dinero lo reporta). */
type Q = PoolClient | ReturnType<typeof db>;

export async function comision(c: Q, kind: "ped" | "cita" | "bol" | "apt" | "rsv" | "plan" | "renta" | "merc" | "fiesta" | "viaje" | "noche" | "insc" | "evp", subtotal: number, n = 1): Promise<number> {
  const r = (await c.query<{ rate_bp: number; fixed_cents: number }>(
    `select rate_bp, fixed_cents from fee_rules where kind = $1 and effective_from <= now() order by effective_from desc, id desc limit 1`, [kind])).rows[0];
  if (!r) return 0;
  return Math.max(0, Math.round((subtotal * r.rate_bp) / 10000) + r.fixed_cents * n);
}

/* ¿Este negocio cobra con tarjeta ahora? Cuenta de cobro habilitada + interruptor del panel + pasarela disponible. */
export async function tarjetaDe(negocio: string): Promise<{ on: boolean; cuenta: string | null }> {
  const r = (await db().query<{ acct: string; on: boolean }>(
    `select a.stripe_account_id as acct, (a.charges_enabled and coalesce(d.pay_card, false)) as on from stripe_accounts a left join delivery_settings d on d.business_id = a.business_id
      where a.business_id = $1`, [negocio])).rows[0];
  if (!r || pasarela.modo() === "apagado") return { on: false, cuenta: null };
  // Una cuenta simulada solo cobra en el sandbox; una real, solo con la clave de Stripe.
  const sim = r.acct.startsWith("acct_sim_");
  if (sim !== (pasarela.modo() === "simulador")) return { on: false, cuenta: null };
  return { on: r.on, cuenta: r.acct };
}

/* Dentro de la transacción del pedido: retiene el total en la tarjeta. Idempotente por la clave del pedido. */
export async function retenerPedido(x: { negocio: string; cuenta: string; clave: string; total: number; subtotal: number; pm: string; userId: string; numero: string; tipo?: "ped" | "merc" | "apt" }, c: Q): Promise<Retencion & { comision: number }> {
  const fee = Math.min(await comision(c, x.tipo ?? "ped", x.subtotal), x.total);
  const cliente = await pasarela.cliente(x.userId).catch(() => null);
  // 9k · Con quien paga: si el banco pide 3-D Secure, la verificación queda a su nombre y la pantalla la completa en la hoja (lib/pagos/verificacion.ts).
  const r = await pasarela.retener({ centavos: x.total, comision: fee, destino: x.cuenta, pm: x.pm, cliente, idem: `ord-${x.clave}-${x.pm.slice(-24)}` /* otra tarjeta = otro intento; la misma = idempotente */, meta: { order: x.numero, business_id: x.negocio }, usuario: { id: x.userId, negocio: x.negocio } });
  return { ...r, comision: fee };
}
export async function registrarRetencion(c: Q, x: { opId: string; userId: string; negocio: string; city: string | null; total: number; comision: number; r: Extract<Retencion, { ok: true }>; pm?: string; kind?: "full" | "deposit" | "extra" }) {
  await c.query(
    `insert into payments (operation_id, user_id, business_id, city_id, kind, method, stripe_payment_intent, amount_cents, held_cents, fee_cents, status, card_brand, card_last4, held_at, simulated, payment_method, card_fingerprint)
     values ($1::bigint, $2, $3, $4, $11, 'card', $5, $6, $6, $7, 'held', $8, $9, now(), $10, $12, $13)`,
    [x.opId, x.userId, x.negocio, x.city, x.r.pi, x.total, x.comision, x.r.marca, x.r.ultimos4, x.r.pi.startsWith("pi_sim_"), x.kind ?? "full", x.pm && /^pm_[A-Za-z0-9_]{3,200}$/.test(x.pm) ? x.pm : null,
     x.r.huella && /^[A-Za-z0-9_]{6,64}$/.test(x.r.huella) ? x.r.huella : null]);
  await c.query(`update operations set pay_status = 'held' where id = $1::bigint`, [x.opId]);
  // La última tarjeta guardada que pagó queda como predeterminada (la que se rechazó deja de serlo).
  if (x.pm) await c.query(`update payment_methods set is_default = (stripe_pm_id = $2) where user_id = $1 and status = 'active' and exists (select 1 from payment_methods where user_id = $1 and stripe_pm_id = $2)`, [x.userId, x.pm]);
}

async function evento(c: Q, opId: string, kind: string, note: { es: string; en: string }) {
  await c.query(`insert into operation_events (operation_id, kind, actor, note) values ($1::bigint, $2, 'system', $3::jsonb)`, [opId, kind, JSON.stringify(note)]);
}
const money = (c: number) => `$${(c / 100).toFixed(2)}`;
/* Cómo se nombra y a dónde lleva una operación en los avisos de dinero: pedido #1051 o cita C-4801. */
const refDe = (kind: string, num: string) => kind === "appointment"
  ? { num, href: `/cita/${num}`, ref: ["appointment", num] as [string, string] }
  : kind === "market_order" ? { num, href: `/mercado/${num}`, ref: ["order", num] as [string, string] }
  : kind === "hold" ? { num, href: `/apartado/${num}`, ref: ["apartado", num] as [string, string] }
  : kind === "party" ? { num, href: `/fiesta/${num}`, ref: ["party", num] as [string, string] }
  : kind === "trip" ? { num, href: `/viaje/${num}`, ref: ["trip", num] as [string, string] }
  : kind === "night" ? { num, href: `/noche/${num}`, ref: ["night", num] as [string, string] }
  : kind === "tickets" ? { num, href: `/eventos/orden/${num}`, ref: ["tickets", num] as [string, string] }
  : kind === "private_event" ? { num, href: `/privado/${num}`, ref: ["private_event", num] as [string, string] }
  : { num: `#${num}`, href: `/pedido/${num}`, ref: ["order", num] as [string, string] };

/* Cobrar lo retenido de una operación (el negocio aceptó).
   25 nov (regla 13) · Devuelve lo que contestó la pasarela (null: no había nada retenido), para quien tiene que decir algo si la captura no tuvo
   respuesta (la cancelación tarde del viaje y del evento privado: alertarCapturaTarde). Quien no lo mira sigue igual: el barrido la vuelve a intentar. */
export async function cobrarOperacion(opId: string): Promise<{ ok: true } | { ok: false; codigo: string } | null> {
  const p = (await db().query<{ id: string; pi: string; amount: number; fee: number }>(
    `select id::text, stripe_payment_intent as pi, amount_cents as amount, fee_cents as fee from payments where operation_id = $1::bigint and kind in ('full', 'deposit') and status = 'held'`, [opId])).rows[0];
  if (!p) return null;
  const r = await pasarela.cobrar(p.pi, p.amount, p.fee);
  if (!r.ok) {
    const codigo = r.codigo ?? "error";
    await db().query(`update payments set failure_code = $2, updated_at = now() where id = $1`, [p.id, codigo]);
    // 25 nov · Un intento que Stripe ya no deja cobrar (cancelado, vencido): no se cobró ni se va a poder; el barrido ya no lo reintenta (repararPagos) y
    // el equipo de dinero lo sabe, una vez por cobro (hold_stuck cobrar:<cobro>; se cierra sola cuando el cobro deja de estar retenido).
    // 25 nov (revisión de 483a3af) · Solo de lo aceptado (alertarNoSeCobra mira la operación): la captura tarde de una cancelación (viaje, evento privado)
    // que ya no se deja cobrar no es un problema, la retención se suelta acto seguido. Y el barrido lo deja de reintentar solo con su alerta anotada.
    if (CAPTURA_TERMINAL.has(codigo)) await alertarNoSeCobra(opId, p.id, p.amount, codigo);
    return { ok: false, codigo };
  }
  // 25 nov · Ya estaba capturado (un reintento o una respuesta perdida): se anota lo que Stripe capturó de verdad (r.cobrado), no lo que se pidió.
  const real = r.cobrado ?? p.amount;
  const tocada = await tx(async (c) => {
    const u = await c.query(`update payments set status = 'captured', amount_cents = $2, fee_cents = least(fee_cents, $2), captured_at = now(), failure_code = null, updated_at = now() where id = $1 and status = 'held'`, [p.id, real]);
    if (!u.rowCount) return false;
    await c.query(`update operations set pay_status = 'captured' where id = $1::bigint`, [opId]);
    await evento(c, opId, "payment_captured", { es: `Se cobraron ${money(real)} en la tarjeta`, en: `${money(real)} charged to the card` });
    return true;
  });
  // 25 nov (revisión de 621f214) · Otro monto que el pedido (Stripe ya lo había capturado): el equipo de dinero lo sabe (dinero-alertas › alertarOtroMonto).
  if (tocada) await (await import("./dinero-alertas")).alertarOtroMontoPago(p.id, p.amount, r.cobrado);
  return { ok: true };
}
/* 25 nov · Lo que Stripe contesta a una captura cuando el intento ya no se deja cobrar (nunca más: cancelado, sin tarjeta, la autorización venció). */
export const CAPTURA_TERMINAL = new Set(["canceled", "requires_payment_method", "charge_expired_for_capture", "no_existe"]);
/* 25 nov (revisión de 483a3af) · Solo si la operación sigue aceptada (confirmed o done): la captura tarde de una cancelación pasa por aquí con la operación
   ya cancelada, y su retención se suelta acto seguido (decir «resuélvelo» de eso confundía). Si la alerta no se anota, queda en el registro (nunca se traga)
   y repararPagos lo sigue reintentando: lo excluye solo con la alerta cobrar:<cobro> anotada. Guardián liberarMira. */
async function alertarNoSeCobra(opId: string, pid: string, amt: number, codigo: string) {
  try {
    const o = (await db().query<{ num: string; st: string; biz: string | null; city: string | null }>(`select o.number as num, o.status as st, o.business_id as biz, o.city_id as city from operations o where o.id = $1::bigint`, [opId])).rows[0];
    if (!o || !["confirmed", "done"].includes(o.st)) return;
    await (await import("./dinero-alertas")).alertar("hold_stuck", `cobrar:${pid}`, { monto: amt, negocio: o.biz, ciudad: o.city, detalle: {
      es: `${o.num}: lo retenido (${money(amt)}) ya no se deja cobrar (Stripe: ${codigo}). No se cobró nada y el barrido ya no lo reintenta: resuélvelo con el negocio y la persona.`,
      en: `${o.num}: the hold (${money(amt)}) can no longer be charged (Stripe: ${codigo}). Nothing was charged and the sweep no longer retries it: sort it out with the business and the person.` } });
  } catch (e) { console.error(`[cobrar] operación ${opId}: la alerta cobrar:${pid} no se anotó (el barrido lo reintenta): ${String((e as Error)?.message ?? e).slice(0, 200)}`); }
}
/* 25 nov · Lo que la pasarela contesta a una captura SIN decir si salió (sin respuesta, error de Stripe, en curso): no se sabe si se cobró. Cualquier
   otro código es un «no» claro (cancelado, vencido, sin clave): no se cobró. */
const CAPTURA_SIN_RESPUESTA = new Set(["red", "api_error", "error", "rate_limit", "rate_limit_error", "lock_timeout", "idempotency_key_in_use", "idempotency_error", "processing"]);
export const capturaSinRespuesta = (r: { ok: true } | { ok: false; codigo: string } | null): r is { ok: false; codigo: string } => !!r && !r.ok && CAPTURA_SIN_RESPUESTA.has(r.codigo);

/* Liberar lo retenido (el pedido no se dio). Avisa a la persona.
   25 nov (9v, cuarta tanda) · Dice qué pasó: «liberada» (se soltó, aquí o ya lo había hecho otro), «nada» (no había nada retenido) o «fallo» (la pasarela
   no la soltó: sigue retenida; el barrido, repararPagos, la vuelve a soltar). Quien tiene que decirle algo a la persona lo mira (devolverAlCancelar).
   25 nov (regla 13, LAUNCH g) · O «cobrada»: Stripe ya la había cobrado y la base no lo sabía (pasarela.liberar mira el intento). El cobro queda
   'captured' con lo que Stripe capturó de verdad, nunca 'released' con el dinero cobrado; la alerta al equipo la pone soltarRetencion. */
export async function liberarOperacion(opId: string): Promise<"liberada" | "nada" | "fallo" | "cobrada"> {
  const p = (await db().query<{ id: string; pi: string; amount: number; uid: string; num: string; kind: string }>(
    `select p.id::text, p.stripe_payment_intent as pi, p.amount_cents as amount, p.user_id::text as uid, o.number as num, o.kind from payments p join operations o on o.id = p.operation_id
      where p.operation_id = $1::bigint and p.kind in ('full', 'deposit') and p.status = 'held'`, [opId])).rows[0];
  if (!p) return "nada";
  const r = await pasarela.liberar(p.pi).catch((): Liberacion => ({ ok: false, codigo: "error" }));
  if (!r.ok && r.cobrado !== undefined) {
    const cobrado = r.cobrado;
    const tocada = await tx(async (c) => {
      const u = await c.query(`update payments set status = 'captured', amount_cents = $2, fee_cents = least(fee_cents, $2), captured_at = coalesce(captured_at, now()), failure_code = null, updated_at = now()
                                where id = $1 and status = 'held'`, [p.id, cobrado]);
      if (!u.rowCount) return false;
      await c.query(`update operations set pay_status = 'captured' where id = $1::bigint`, [opId]);
      await evento(c, opId, "payment_captured", { es: `No se pudo soltar la retención: Stripe ya había cobrado ${money(cobrado)} en la tarjeta`, en: `The hold could not be released: Stripe had already charged ${money(cobrado)} to the card` });
      return true;
    });
    if (tocada) return "cobrada";
    // Otro la cambió mientras tanto: se dice lo que dice la base ahora, nunca lo supuesto.
    const st = (await db().query<{ st: string }>(`select status as st from payments where id = $1::bigint`, [p.id])).rows[0]?.st;
    return st === "captured" || st === "partially_refunded" || st === "refunded" ? "cobrada" : st === "released" ? "liberada" : "fallo";
  }
  if (!r.ok) return "fallo";
  const hecho = await tx(async (c) => {
    const u = await c.query(`update payments set status = 'released', released_at = now(), updated_at = now() where id = $1 and status = 'held'`, [p.id]);
    if (!u.rowCount) return false;
    await c.query(`update operations set pay_status = 'released' where id = $1::bigint`, [opId]);
    await evento(c, opId, "payment_released", { es: `Se liberaron ${money(p.amount)} retenidos`, en: `${money(p.amount)} held was released` });
    return true;
  });
  const R = refDe(p.kind, p.num);
  if (hecho) await (await import("./avisos")).avisar(p.uid, "pay_released", { monto: money(p.amount), num: R.num }, { href: R.href, ref: R.ref });
  return "liberada";
}

/* 25 nov (9v, quinta tanda) · Soltar lo retenido y decir qué pasó, para TODO el que suelta (vence, «No hay mesa», «No me sirve», el mercado no acepta, el
   apartado se cancela, el barrido): «liberada» (se soltó, aquí o ya lo había hecho otro), «nada» (no había nada retenido) o «retenida» (la pasarela no la
   soltó: sigue en la tarjeta; el barrido, repararPagos, la vuelve a soltar). Si quedó retenida, UNA alerta hold_stuck al equipo de dinero por cobro (sujeto
   liberar:<cobro>; se cierra sola cuando el cobro deja de estar retenido: dinero-alertas › cerrarAlertasResueltas). Antes cada uno tiraba lo que contestaba
   liberarOperacion y el aviso decía «Se liberó tu depósito» aunque Stripe no la hubiera soltado. Quien avisa lo mira (lib/devolucion-cancelar.ts ›
   sinSoltarCliente / sinSoltarNegocio). Guardián devueltoSoloSiSalio (11). */
/* 25 nov (revisión de 00ac9b7) · La regla de la cancelación TARDE de quien pagó, cuando lo retenido resultó cobrado en Stripe (la captura tarde sí salió
   aunque no contestó, o la base falló después del «sí»): viaje → se queda la mitad (cobroMitad) y se pide la devolución del resto con la llave de la
   cancelación (vcx-<número>: la misma devolución aunque la pida otro); evento privado → el depósito se queda con el restaurante (perdio). Lo llama
   soltarRetencion, la suelte quien la suelte (la cancelación misma o el barrido). Cualquier otra cosa: null (la alerta pide revisarlo). */
/* 25 nov (revisión de 621f214) · Si la cancelación y el barrido la encuentran cobrada los dos, el segundo llega con la devolución vcx- del primero ya hecha:
   la mitad es lo que de verdad queda cobrado, hasta la mitad del total: min(floor(tot / 2), amt − ref), como reglaTardeLeida (revisión de efe56b9: contar
   la de la llave como no hecha decía «se quedó la mitad» aunque se hubiera devuelto de más), y devolverAlCancelar, sin nada más que devolver, dice lo que pasó con la de la llave
   (hecha · en camino · fallida), nunca «nada»: el aviso diría «Se cobró la mitad» sin «te devolvimos». Guardián liberarMira. */
async function reglaTardeConLoCobrado(opId: string): Promise<import("./devolucion-cancelar").ReglaTarde | null> {
  const o = (await db().query<{ kind: string; num: string; st: string; cr: string | null; by: string | null; tot: number; uid: string; pid: string; amt: number; ref: number; pst: string }>(
    `select o.kind, o.number as num, o.status as st, o.cancel_reason as cr, o.cancelled_by as by, o.total_cents as tot, o.user_id::text as uid,
            p.id::text as pid, p.amount_cents as amt, p.refunded_cents as ref, p.status as pst
       from operations o join payments p on p.operation_id = o.id and p.kind in ('full', 'deposit') where o.id = $1::bigint order by p.id desc limit 1`, [opId])).rows[0];
  if (!o || o.st !== "cancelled" || o.by !== "user" || o.cr !== "tarde" || !["captured", "partially_refunded"].includes(o.pst)) return null;
  if (o.kind === "trip") {
    const mitad = Math.min(Math.floor(o.tot / 2), Math.max(0, o.amt - o.ref));
    // 25 nov (revisión de ae940a7) · reglaCobradaAt: la marca de que la regla se empezó a aplicar por lo cobrado, ANTES de mover dinero: si el proceso muere
    // después (sin aviso ni alerta cobrada:), barrerCobradasTarde la encuentra por ella y la completa.
    await db().query(`update operations set details = details || jsonb_build_object('cobroMitad', $2::int, 'reglaCobradaAt', coalesce(details->'reglaCobradaAt', to_jsonb(now()))) where id = $1::bigint`, [opId, mitad]);
    // 25 nov (revisión de 90170a1) · Si la devolución de la llave ya se pidió, no se vuelve a pedir: la que FALLÓ se renombra «vcx-<número>~fallida-<id>»
    // (devolverPago no la reconocería y mandaría otra), la resuelta a mano conserva su llave (manual_at en su misma fila: devDeLaLlave la dice hecha), la
    // hecha ya está en lo devuelto y la que va en camino la termina su barrido. La que ni se pudo anotar (refund_stuck cancelacion:vcx-<número>) la tiene el equipo de dinero en su alerta y la puede
    // devolver a mano: pedirla otra vez la devolvería dos veces. Se dice como está, sin mover dinero. Guardián liberarMira.
    // 25 nov (revisión de 51a794d) · Lo que «no salió» se dice según lo que de verdad falta devolver (segunLoDevuelto): si el equipo ya la devolvió a mano,
    // «hecha», nunca «no salió» ni «$0.00».
    const previa = await devDeLaLlave(o.pid, `vcx-${o.num}`);
    if (previa) return { queda: mitad, dev: segunLoDevuelto(previa, o.amt - o.ref - mitad, o.ref) };
    if ((await db().query(`select 1 from money_alerts where kind = 'refund_stuck' and subject_id = $1`, [`cancelacion:vcx-${o.num}`])).rowCount)
      return { queda: mitad, dev: segunLoDevuelto({ e: "fallida", monto: Math.max(0, o.amt - o.ref - mitad) }, o.amt - o.ref - mitad, o.ref) };
    const dev = await devolverAlCancelar({ id: opId, pay: o.pst, pid: o.pid, amount: o.amt, refunded: o.ref },
      { actorId: o.uid, motivo: "Cancelación tarde: se cobra la mitad", idem: `vcx-${o.num}`, por: "policy", seQueda: mitad });
    return { queda: mitad, dev };
  }
  if (o.kind === "private_event") {
    await db().query(`update operations set details = details || jsonb_build_object('perdio', true, 'reglaCobradaAt', coalesce(details->'reglaCobradaAt', to_jsonb(now()))) where id = $1::bigint`, [opId]);
    return { queda: Math.max(0, o.amt - o.ref), dev: null };
  }
  return null;
}
/* 25 nov (revisión de 51a794d) · La devolución de la llave que «no salió» (su fila fallida, o sin fila con su refund_stuck) dicha según lo que de verdad
   falta devolver del cobro (falta = amt − ref − lo que se queda): si ya no falta nada (el equipo la devolvió a mano, fuera de su fila), «hecha» con lo devuelto
   del cobro (sin nada devuelto, «nada»), nunca «la devolución de $X no salió» ni «$0.00»; si falta, «fallida» con lo que de verdad falta (hasta lo que se
   pidió). Lo demás (hecha, en camino) tal cual. La usan la regla y su relectura. Guardián liberarMira. */
function segunLoDevuelto(dev: import("./devolucion-cancelar").DevCancelar, falta: number, ref: number): import("./devolucion-cancelar").DevCancelar {
  if (dev.e !== "fallida") return dev;
  if (falta <= 0) return ref > 0 ? { e: "hecha", monto: ref } : { e: "nada", monto: 0 };
  return { e: "fallida", monto: dev.monto > 0 ? Math.min(dev.monto, falta) : falta };
}
/* 25 nov (revisión de 483a3af) · «cobrada» por relectura (devolverAlCancelar): otro (el barrido) soltó primero, encontró la retención cobrada y aplicó la
   regla (reglaTardeConLoCobrado). Aquí se LEE lo que aplicó, sin volver a mover dinero: viaje → lo que se queda (lo que queda cobrado, amt − ref,
   hasta la mitad del total: la misma cuenta que reglaTardeConLoCobrado) y lo que pasó con la devolución de la llave vcx-<número>
   (hecha · en camino · fallida; sin fila todavía: null, su aviso pay_refund sale al cerrarla); evento privado → lo que queda cobrado. cobroMitad se vuelve
   a escribir con lo que se queda: la cancelación que perdió la carrera lo había dejado en 0 (leyó el cobro retenido). Cualquier otra cosa: null. */
async function reglaTardeLeida(opId: string): Promise<import("./devolucion-cancelar").ReglaTarde | null> {
  const o = (await db().query<{ kind: string; st: string; cr: string | null; by: string | null; tot: number; amt: number; ref: number; pst: string; rst: string | null; ramt: number | null; rmano: boolean | null; atascada: boolean }>(
    `select o.kind, o.status as st, o.cancel_reason as cr, o.cancelled_by as by, o.total_cents as tot, p.amount_cents as amt, p.refunded_cents as ref, p.status as pst,
            d.st as rst, d.amt as ramt, d.mano as rmano,
            exists (select 1 from money_alerts a where a.kind = 'refund_stuck' and a.subject_id = 'cancelacion:vcx-' || o.number) as atascada
       from operations o join payments p on p.operation_id = o.id and p.kind in ('full', 'deposit')
       left join lateral (select r.status as st, r.amount_cents as amt, r.manual_at is not null as mano from refunds r
                           where r.payment_id = p.id and split_part(r.idem_key, '~fallida-', 1) = 'vcx-' || o.number order by r.id desc limit 1) d on true
      where o.id = $1::bigint order by p.id desc limit 1`, [opId])).rows[0];
  if (!o || o.st !== "cancelled" || o.by !== "user" || o.cr !== "tarde" || !["captured", "partially_refunded"].includes(o.pst)) return null;
  if (o.kind === "private_event") return { queda: Math.max(0, o.amt - o.ref), dev: null };
  if (o.kind !== "trip") return null;
  const queda = Math.min(Math.floor(o.tot / 2), Math.max(0, o.amt - o.ref));
  await db().query(`update operations set details = details || jsonb_build_object('cobroMitad', $2::int) where id = $1::bigint`, [opId, queda]);
  const m = o.ramt ?? 0;
  // 25 nov (revisión de 90170a1) · Sin fila pero con su refund_stuck (no se pudo ni anotar): fallida, con lo que faltaba devolver.
  const dev: import("./devolucion-cancelar").DevCancelar | null = !o.rst ? (o.atascada ? { e: "fallida", monto: Math.max(0, o.amt - o.ref - queda) } : null) : o.rst === "done" || o.rmano ? { e: "hecha", monto: m } : o.rst === "pending" ? { e: "en_camino", monto: m } : { e: "fallida", monto: m };
  // 25 nov (revisión de 51a794d) · Lo que «no salió» según lo que de verdad falta devolver (segunLoDevuelto), como la regla.
  return { queda, dev: dev && segunLoDevuelto(dev, o.amt - o.ref - queda, o.ref) };
}
/* 25 nov (revisión de 483a3af) · El aviso que dice lo cobrado de una cancelación tarde (lo que se queda el negocio), UNA vez por operación: lo reclama quien
   lo va a mandar (la cancelación misma, o el barrido que aplicó la regla después); el que llega segundo no lo manda. Lo que no dice lo cobrado («No se
   cobró nada, pero la retención todavía no se soltó») no lo reclama: después de ese, el barrido todavía dice lo que pasó.
   25 nov (revisión de efe56b9) · Solo si el barrido nunca lo reclamó (sin avisoCobroAt): si ya lo reclamó, el aviso es suyo aunque haya devuelto el reclamo
   (avisoCobro false con lo que falta): la parte que ya llegó (quien pagó) no se repite y lo que falta lo reintenta él (barrerCobradasTarde). Antes la
   cancelación que llegaba después de un reclamo devuelto mandaba los dos otra vez. */
export async function reclamarAvisoCobro(opId: string): Promise<boolean> {
  return !!(await db().query(`update operations set details = details || '{"avisoCobro":true}'::jsonb
     where id = $1::bigint and not coalesce((details->>'avisoCobro')::boolean, false) and not (details ? 'avisoCobroAt')`, [opId])).rowCount;
}
/* 25 nov (revisión de efe56b9) · Cuánto espera el barrido antes de cada reintento del aviso de lo que aplicó (minutos, cada vez más: el que no llegó en un
   minuto no llega por insistir cada minuto) y cuántos reintentos hay (uno por espera). Agotados, la alerta aviso:<cobro> (alertarAvisoTarde): el equipo de
   dinero se lo dice a la persona. Guardián liberarMira. */
export const AVISO_TARDE_ESPERA_MIN = [1, 5, 15, 60, 240];
export const AVISO_TARDE_INTENTOS = AVISO_TARDE_ESPERA_MIN.length;
/* 25 nov (revisión de 621f214) · El reclamo del aviso que manda el barrido, con lo que falta mandar (avisoCobroFalta: "cli" quien pagó, "neg" el negocio;
   la primera vez, los dos) y cuándo se reclamó (avisoCobroAt). Devuelve lo que falta, o null si otro lo tiene.
   25 nov (revisión de efe56b9) · La primera vez, solo si nadie lo reclamó nunca (ni la cancelación ni el barrido). retomar (el reintento de
   barrerCobradasTarde): el reclamo devuelto (avisoCobro false) con su espera cumplida (AVISO_TARDE_ESPERA_MIN[intentos]) y reintentos por delante, o el
   reclamado hace más de 10 minutos que sigue con algo pendiente (el proceso murió entre el reclamo y el envío: cuenta como un intento). Devuelve también
   avisoCobroAt tal como quedó: la escritura del resultado (devolverReclamo) solo se aplica si sigue igual (si otro lo retomó, el resultado es suyo). */
type ReclamoAviso = { cli: boolean; neg: boolean; at: string };
async function reclamarAvisoTarde(opId: string, retomar: boolean): Promise<ReclamoAviso | null> {
  const r = (await db().query<{ falta: unknown; at: string }>(
    `update operations set details = details || jsonb_build_object('avisoCobro', true, 'avisoCobroAt', clock_timestamp(), 'avisoCobroFalta', coalesce(details->'avisoCobroFalta', '["cli","neg"]'::jsonb),
            'avisoCobroIntentos', coalesce((details->>'avisoCobroIntentos')::int, 0) + case when coalesce((details->>'avisoCobro')::boolean, false) then 1 else 0 end)
      where id = $1::bigint and ((not coalesce((details->>'avisoCobro')::boolean, false) and not (details ? 'avisoCobroAt'))
             or ($2::boolean and details ? 'avisoCobroFalta' and coalesce((details->>'avisoCobroIntentos')::int, 0) <= $3::int
                 and ((not coalesce((details->>'avisoCobro')::boolean, false)
                       and coalesce((details->>'avisoCobroAt')::timestamptz, '-infinity'::timestamptz) < now() - make_interval(mins => coalesce(($4::int[])[coalesce((details->>'avisoCobroIntentos')::int, 0)], 0)))
                   or (coalesce((details->>'avisoCobro')::boolean, false) and coalesce((details->>'avisoCobroAt')::timestamptz, '-infinity'::timestamptz) < now() - interval '10 minutes'))))
      returning details->'avisoCobroFalta' as falta, details->>'avisoCobroAt' as at`, [opId, retomar, AVISO_TARDE_INTENTOS, AVISO_TARDE_ESPERA_MIN])).rows[0];
  if (!r) return null;
  const f = Array.isArray(r.falta) ? r.falta : [];
  return { cli: f.includes("cli"), neg: f.includes("neg"), at: r.at };
}
/* 25 nov (revisión de efe56b9) · El resultado del aviso reclamado, SOLO si el reclamo sigue siendo el suyo (avisoCobroAt igual al del reclamo): todo quedó →
   sin nada pendiente; algo no quedó → devuelve el reclamo (avisoCobro false) con lo que falta y un intento más. Agotados los reintentos (o sin la regla
   para armar el aviso: sinRegla), la alerta aviso:<cobro>. Nunca tira. */
async function devolverReclamo(opId: string, num: string, c: ReclamoAviso, hecho: { cli: boolean; neg: boolean }, sinRegla = false) {
  try {
    if (hecho.cli && hecho.neg) {
      const u = await db().query(`update operations set details = details - 'avisoCobroFalta' where id = $1::bigint and details->>'avisoCobroAt' = $2::text`, [opId, c.at]);
      if (!u.rowCount) console.error(`[cobrada] ${num}: el aviso de lo que aplicó el barrido quedó, pero otro retomó el reclamo mientras tanto (no se anotó)`);
      return;
    }
    const quedan = [...(hecho.cli ? [] : ["cli"]), ...(hecho.neg ? [] : ["neg"])];
    const r = (await db().query<{ n: number }>(
      `update operations set details = details || jsonb_build_object('avisoCobro', false, 'avisoCobroFalta', $3::jsonb, 'avisoCobroIntentos', coalesce((details->>'avisoCobroIntentos')::int, 0) + 1)
        where id = $1::bigint and details->>'avisoCobroAt' = $2::text returning (details->>'avisoCobroIntentos')::int as n`, [opId, c.at, JSON.stringify(quedan)])).rows[0];
    if (!r) { console.error(`[cobrada] ${num}: el aviso de lo que aplicó el barrido no quedó (${quedan.join(", ")}) y otro retomó el reclamo mientras tanto`); return; }
    const agotado = r.n > AVISO_TARDE_INTENTOS;
    console.error(`[cobrada] ${num}: el aviso de lo que aplicó el barrido no quedó (${quedan.join(", ")}${sinRegla ? "; sin la regla para armarlo" : ""}): ${agotado ? "sin más reintentos (alerta aviso:)" : `el barrido lo vuelve a mandar en ${AVISO_TARDE_ESPERA_MIN[r.n - 1]} min`}`);
    if (agotado || sinRegla) await alertarAvisoTarde(opId, num, quedan, sinRegla ? "sin_regla" : "agotado");
  } catch (e) { console.error(`[cobrada] ${num}: lo que quedó del aviso no se anotó: ${String((e as Error)?.message ?? e).slice(0, 200)}`); }
}
/* 25 nov (revisión de efe56b9) · La alerta propia del aviso de lo aplicado que no llegó (hold_stuck aviso:<cobro>, una vez por cobro, no se cierra sola): los
   reintentos se agotaron, o el aviso ya no se puede armar porque el cobro no está como lo dejó la regla (se devolvió o cambió después). Dice a quién no le
   llegó y remite a la alerta cobrada:<cobro> (lo aplicado). Nunca tira: lo que falla queda en el registro y el barrido la vuelve a intentar
   (barrerCobradasTarde: agotado sin su alerta). */
async function alertarAvisoTarde(opId: string, num: string, quedan: string[], por: "agotado" | "sin_regla") {
  try {
    const p = (await db().query<{ id: string; amt: number; biz: string | null; city: string | null }>(
      `select y.id::text, y.amount_cents as amt, y.business_id as biz, y.city_id as city from payments y where y.operation_id = $1::bigint and y.kind in ('full', 'deposit') order by y.id desc limit 1`, [opId])).rows[0];
    if (!p) return;
    const cli = quedan.includes("cli"), neg = quedan.includes("neg");
    const a: Msg = cli && neg ? { es: "ni a quien pagó ni al negocio", en: "neither the payer nor the business" } : cli ? { es: "a quien pagó", en: "the payer" } : { es: "al negocio", en: "the business" };
    const detalle: Msg = por === "agotado" ? {
      es: `${num}: el aviso con lo que aplicó el barrido en la cancelación tarde no le llegó ${a.es} después de ${AVISO_TARDE_INTENTOS} reintentos, y el barrido ya no lo manda. Díselo tú: lo aplicado está en la alerta cobrada:${p.id}.`,
      en: `${num}: the notice with what the sweep applied to the late cancellation did not reach ${a.en} after ${AVISO_TARDE_INTENTOS} retries, and the sweep no longer sends it. Tell them yourself: what was applied is in the cobrada:${p.id} alert.` } : {
      es: `${num}: el aviso con lo que aplicó el barrido en la cancelación tarde no se pudo armar: el cobro ya no está como lo dejó la regla (se devolvió o cambió después). No le llegó ${a.es}: revisa el cobro y díselo tú (lo aplicado: alerta cobrada:${p.id}).`,
      en: `${num}: the notice with what the sweep applied to the late cancellation could not be built: the charge is no longer as the rule left it (refunded or changed later). It did not reach ${a.en}: check the charge and tell them yourself (what was applied: the cobrada:${p.id} alert).` };
    await (await import("./dinero-alertas")).alertar("hold_stuck", `aviso:${p.id}`, { monto: p.amt, negocio: p.biz, ciudad: p.city, detalle });
  } catch (e) { console.error(`[cobrada] ${num}: la alerta aviso: no se anotó (el barrido la vuelve a intentar): ${String((e as Error)?.message ?? e).slice(0, 200)}`); }
}
/* 25 nov (revisión de 483a3af) · La regla de la cancelación tarde la aplicó el BARRIDO (repararPagos: la retención resultó cobrada después de que la
   cancelación avisara «No se cobró nada, pero la retención todavía no se soltó»): quien pagó y el negocio reciben su aviso de la cancelación otra vez, con
   lo aplicado (viaje: viaje_cx y biz_viaje_cx; evento privado: evp_cancelado y evp_biz_cx; las plantillas y los campos de siempre). Una vez por operación
   (el reclamo). Nunca tira: lo que falla queda en el registro. Guardián liberarMira.
   25 nov (revisión de 621f214) · El reclamo ya no se pierde si el envío falla: lo que no quedó (avisos › avisar dice si quedó) devuelve el reclamo
   (avisoCobro false) con lo que falta (avisoCobroFalta) y su intento (avisoCobroIntentos); barrerCobradasTarde lo reintenta, solo lo que falta. Devuelve lo
   que quedó ({ cli, neg }) para la alerta cobrada:, o null si no es de aquí (otro lo manda: la cancelación).
   25 nov (revisión de efe56b9) · El resultado se escribe solo con el reclamo propio (devolverReclamo), los reintentos se espacian y, agotados, alerta. */
async function avisarTardeCobrada(opId: string, num: string, kind: string, cobrado: number, regla: import("./devolucion-cancelar").ReglaTarde, retomar = false): Promise<{ cli: boolean; neg: boolean } | null> {
  if (kind !== "trip" && kind !== "private_event") return null;
  const falta = await reclamarAvisoTarde(opId, retomar).catch((e) => { console.error(`[cobrada] ${num}: el aviso de lo que aplicó el barrido no se pudo reclamar: ${String((e as Error)?.message ?? e).slice(0, 200)}`); return null; });
  if (!falta) return null;
  let hecho = { cli: !falta.cli, neg: !falta.neg };
  try {
    const s = kind === "trip" ? await (await import("./viajes")).avisarViajeTardeCobrado(num, regla, falta) : await (await import("./evento-privado")).avisarEvpTardeCobrado(num, regla.queda, cobrado, falta);
    hecho = { cli: hecho.cli || s.cli, neg: hecho.neg || s.neg };
  } catch (e) { console.error(`[cobrada] ${num}: el aviso de lo que aplicó el barrido no salió: ${String((e as Error)?.message ?? e).slice(0, 200)}`); }
  await devolverReclamo(opId, num, falta, hecho);
  return hecho;
}
/* 25 nov (revisión de efe56b9) · El reintento cuyo aviso ya no se puede armar (reglaTardeLeida: null, el cobro ya no está como lo dejó la regla): se reclama
   como cualquier reintento, se devuelve con su intento y se abre la alerta aviso:<cobro> (antes se reintentaba cada minuto, en silencio). */
async function avisoSinRegla(opId: string, num: string) {
  const c = await reclamarAvisoTarde(opId, true).catch((e) => { console.error(`[cobrada] ${num}: el aviso sin regla no se pudo reclamar: ${String((e as Error)?.message ?? e).slice(0, 200)}`); return null; });
  if (c) await devolverReclamo(opId, num, c, { cli: !c.cli, neg: !c.neg }, true);
}
/* 25 nov (regla 13, LAUNCH g) · «cobrada»: Stripe ya la había cobrado (liberarOperacion la anotó 'captured' con su monto real). UNA alerta hold_stuck por
   cobro con sujeto cobrada:<cobro>, que NO se cierra sola (cerrarAlertasResueltas solo mira liberar:): alguien mira en Stripe si ese cobro correspondía y,
   si no, lo devuelve. Quien avisa lo dice (devolucion-cancelar › soltadaO / dineroAlCancelar). La regla, el aviso y la alerta: cobradaConSuRegla. */
export async function soltarRetencion(opId: string, motivo: Msg): Promise<import("./devolucion-cancelar").Soltada> {
  const l = await liberarOperacion(opId);
  if (l === "cobrada") return cobradaConSuRegla(opId, motivo, motivo === SWEEP ? "barrido" : "soltar");
  if (l !== "fallo") return { e: l, monto: 0 };
  // La pasarela no soltó la retención: sigue en la tarjeta (el barrido, repararPagos, la vuelve a soltar). El equipo de dinero lo sabe, una vez por cobro.
  const h = (await db().query<{ id: string; amt: number; biz: string | null; city: string | null }>(
    `select y.id::text, y.amount_cents as amt, y.business_id as biz, y.city_id as city from payments y where y.operation_id = $1::bigint and y.kind in ('full', 'deposit') and y.status = 'held' order by y.id limit 1`, [opId])).rows[0];
  if (!h) return { e: "liberada", monto: 0 };
  await (await import("./dinero-alertas")).alertar("hold_stuck", `liberar:${h.id}`, { monto: h.amt, negocio: h.biz, ciudad: h.city, detalle: {
    es: `${motivo.es}: no se pudo soltar la retención de ${money(h.amt)} (Stripe no la soltó). No se cobró nada; el barrido la sigue soltando: si no se suelta, suéltala desde Stripe.`,
    en: `${motivo.en}: the ${money(h.amt)} hold could not be released (Stripe did not release it). Nothing was charged; the sweep keeps releasing it: if it does not come off, release it from Stripe.` } }).catch(() => undefined);
  return { e: "retenida", monto: h.amt };
}

/* 25 nov (revisión de 621f214) · Lo cobrado de una retención que se iba a soltar (o de una cancelación tarde que quedó cobrada entera: «reparar»): la
   cancelación tarde de quien pagó (viaje, evento privado) sigue su regla con lo cobrado (reglaTardeConLoCobrado); lo demás lo decide el equipo. Si lo hace
   un barrido («barrido», «reparar»), quien pagó y el negocio reciben el aviso con lo aplicado ANTES de la alerta, y la alerta dice si le llegó a quien
   pagó. UNA alerta hold_stuck cobrada:<cobro>. Guardián liberarMira. */
/* 25 nov (revisión de ae940a7) · «completar»: la regla ya se había empezado a aplicar (reglaCobradaAt) y el proceso murió antes del aviso o de la alerta:
   se vuelve a aplicar (idempotente: la misma llave vcx-, perdio) y se completa lo que falta, con su propio texto. */
async function cobradaConSuRegla(opId: string, motivo: Msg, como: "soltar" | "barrido" | "reparar" | "completar"): Promise<import("./devolucion-cancelar").Soltada> {
  const c = (await db().query<{ id: string; amt: number; biz: string | null; city: string | null; num: string; kind: string }>(
    `select y.id::text, y.amount_cents as amt, y.business_id as biz, y.city_id as city, o.number as num, o.kind from payments y join operations o on o.id = y.operation_id
      where y.operation_id = $1::bigint and y.kind in ('full', 'deposit') and y.status in ('captured', 'partially_refunded', 'refunded') order by y.id desc limit 1`, [opId])).rows[0];
  if (!c) return { e: "nada", monto: 0 };
  // 25 nov (revisión de 90170a1) · «completar» con la devolución de la llave ya pedida (su fila, aunque haya fallado, o su refund_stuck): se LEE lo aplicado
  // (reglaTardeLeida), nunca se vuelve a pedir dinero.
  const pedida = como === "completar" && !!(await db().query(
    `select 1 from refunds r where r.payment_id = $1::bigint and split_part(r.idem_key, '~fallida-', 1) = $2
      union all select 1 from money_alerts a where a.kind = 'refund_stuck' and a.subject_id = 'cancelacion:' || $2`, [c.id, `vcx-${c.num}`])).rowCount;
  const regla = await (pedida ? reglaTardeLeida(opId) : reglaTardeConLoCobrado(opId)).catch((e) => { console.error(`[cobrada] ${c.num}: la regla de la cancelación tarde no se aplicó: ${String((e as Error)?.message ?? e).slice(0, 200)}`); return null; });
  // 25 nov (revisión de 90170a1) · «completar» sin regla (devolvió null o lanzó): se reintenta hasta COMPLETAR_INTENTOS veces (reglaCompletarIntentos, una por
  // pasada del barrido) y, agotadas, la alerta dice que no se pudo completar; nunca «Se completó». Antes volvía cada minuto sin fin.
  if (como === "completar" && !regla) {
    const n = (await db().query<{ n: number }>(`update operations set details = details || jsonb_build_object('reglaCompletarIntentos', coalesce((details->>'reglaCompletarIntentos')::int, 0) + 1)
      where id = $1::bigint returning (details->>'reglaCompletarIntentos')::int as n`, [opId]).catch(() => ({ rows: [] as { n: number }[] }))).rows[0]?.n ?? COMPLETAR_INTENTOS;
    if (n < COMPLETAR_INTENTOS) { console.error(`[cobrada] ${c.num}: la cancelación a medias no se pudo completar (intento ${n} de ${COMPLETAR_INTENTOS}): el barrido lo vuelve a intentar`); return { e: "cobrada", monto: c.amt }; }
  }
  const yaEs: Msg = como === "completar"
    ? { es: `${c.num} · ${motivo.es}: la cancelación tarde quedó a medias (${money(c.amt)} cobrados): el proceso se cortó mientras se aplicaba su regla, antes de su aviso o de esta alerta.${regla ? " Se completó." : ""}`,
        en: `${c.num} · ${motivo.en}: the late cancellation was left halfway (${money(c.amt)} charged): the process stopped while its rule was being applied, before its notice or this alert.${regla ? " It was completed." : ""}` }
    : como === "reparar"
    ? { es: `${c.num} · ${motivo.es}: la cancelación tarde quedó cobrada (${money(c.amt)}) sin aplicar su regla (el proceso se cortó a mitad).`,
        en: `${c.num} · ${motivo.en}: the late cancellation was left charged (${money(c.amt)}) without its rule applied (the process stopped halfway).` }
    : { es: `${c.num} · ${motivo.es}: se iba a soltar la retención, pero Stripe ya la había cobrado (${money(c.amt)}) y la base no lo sabía. La base ya la dice cobrada.`,
        en: `${c.num} · ${motivo.en}: the hold was going to be released, but Stripe had already charged it (${money(c.amt)}) and the books did not know. The books now show it as charged.` };
  const dev = regla?.dev, devT: Msg = !dev || dev.e === "nada" ? { es: "", en: "" } : dev.e === "hecha" ? { es: ` y se devolvieron ${money(dev.monto)}`, en: ` and ${money(dev.monto)} was refunded` }
    : dev.e === "en_camino" ? { es: ` y la devolución de ${money(dev.monto)} va en camino`, en: ` and the ${money(dev.monto)} refund is on its way` }
    : { es: ` y la devolución de ${money(dev.monto)} no salió (tiene su propia alerta)`, en: ` and the ${money(dev.monto)} refund did not go through (it has its own alert)` };
  // 25 nov (revisión de 483a3af) · La regla la aplicó un barrido: a quien pagó le habíamos dicho «No se cobró nada…» (o nada); el aviso dice lo aplicado (una vez).
  // 25 nov (revisión de 621f214) · Antes de la alerta, para que diga si le llegó (si no, el barrido lo reintenta: barrerCobradasTarde).
  const av = regla && como !== "soltar" ? await avisarTardeCobrada(opId, c.num, c.kind, c.amt, regla) : null;
  // 25 nov (revisión de efe56b9) · Lo que no quedó lo reintenta el barrido, cada vez más espaciado; si se agotan, se abre la alerta aviso:<cobro> y ESA dice
  // que hay que decírselo a la persona (esta no lo afirma sin saberlo).
  const sigue: Msg = { es: `el barrido lo vuelve a mandar (hasta ${AVISO_TARDE_INTENTOS} veces, cada vez más espaciado); si no llega, se abre la alerta aviso:${c.id}.`,
    en: `the sweep sends it again (up to ${AVISO_TARDE_INTENTOS} times, further apart each time); if it never arrives, the aviso:${c.id} alert opens.` };
  const avT: Msg = !av ? { es: "", en: "" } : av.cli && av.neg ? { es: " Quien pagó y el negocio ya tienen el aviso con lo aplicado.", en: " The payer and the business already have the notice with what was applied." }
    : av.cli ? { es: ` Quien pagó ya tiene el aviso con lo aplicado; el del negocio no quedó: ${sigue.es}`, en: ` The payer already has the notice with what was applied; the business notice did not go out: ${sigue.en}` }
    : { es: ` El aviso con lo aplicado NO le llegó a quien pagó: ${sigue.es}`, en: ` The notice with what was applied did NOT reach the payer: ${sigue.en}` };
  const detalle: Msg = regla ? { es: `${yaEs.es} Se aplicó la cancelación tarde: se quedó ${money(regla.queda)}${devT.es}. Revisa en Stripe que cuadre; no devuelvas nada más.${avT.es}`,
    en: `${yaEs.en} The late cancellation was applied: ${money(regla.queda)} was kept${devT.en}. Check in Stripe that it matches; do not refund anything else.${avT.en}` }
    : como === "completar" ? { es: `${yaEs.es} No se pudo completar: aplícala a mano (viaje: devuelve lo que pasa de la mitad; evento privado: el depósito se queda con el restaurante) y díselo a quien pagó y al negocio.`,
        en: `${yaEs.en} It could not be completed: apply it by hand (trip: refund what is over half; private event: the deposit stays with the restaurant) and tell the payer and the business.` }
    : { es: `${yaEs.es} Revisa en Stripe si ese cobro correspondía: si no, devuélveselo al cliente.`, en: `${yaEs.en} Check in Stripe whether that charge was due: if not, refund the client.` };
  const nueva = await (await import("./dinero-alertas")).alertar("hold_stuck", `cobrada:${c.id}`, { monto: c.amt, negocio: c.biz, ciudad: c.city, detalle })
    .catch((e) => { console.error(`[cobrada] ${c.num}: la alerta cobrada:${c.id} no se anotó: ${String((e as Error)?.message ?? e).slice(0, 200)}`); return null; });
  // 25 nov (revisión de 51a794d) · «completar» que agotó su tope sin regla: si su alerta cobrada: ya estaba (el barrido la eligió por el aviso sin reclamar),
  // alertar no la reescribe y «No se pudo completar» se perdía; con el tope cumplido el barrido ya no la elige: quien pagó y el negocio, sin aviso y sin
  // alerta. Su alerta propia completar:<cobro> lo dice. Si esa (o la cobrada:) no se anota, el tope vuelve un paso atrás: la próxima pasada lo intenta otra
  // vez (nunca en silencio). Guardián liberarMira.
  if (como === "completar" && !regla && nueva !== true) {
    const dicha = nueva === false && await (await import("./dinero-alertas")).alertar("hold_stuck", `completar:${c.id}`, { monto: c.amt, negocio: c.biz, ciudad: c.city, detalle: {
      es: `${yaEs.es} No se pudo completar después de ${COMPLETAR_INTENTOS} pasadas del barrido y nadie mandó su aviso: ni quien pagó ni el negocio saben lo aplicado (la alerta cobrada:${c.id} ya estaba abierta y no lo dice). Aplícala a mano (viaje: devuelve lo que pasa de la mitad; evento privado: el depósito se queda con el restaurante) y díselo a quien pagó y al negocio.`,
      en: `${yaEs.en} It could not be completed after ${COMPLETAR_INTENTOS} sweep passes and nobody sent its notice: neither the payer nor the business knows what was applied (the cobrada:${c.id} alert was already open and does not say so). Apply it by hand (trip: refund what is over half; private event: the deposit stays with the restaurant) and tell the payer and the business.` } })
      .then(() => true, (e) => { console.error(`[cobrada] ${c.num}: la alerta completar:${c.id} no se anotó: ${String((e as Error)?.message ?? e).slice(0, 200)}`); return false; });
    if (!dicha) await db().query(`update operations set details = details || jsonb_build_object('reglaCompletarIntentos', $2::int) where id = $1::bigint`, [opId, COMPLETAR_INTENTOS - 1])
      .catch((e) => { console.error(`[cobrada] ${c.num}: «No se pudo completar» no se anotó y el tope no volvió atrás: ${String((e as Error)?.message ?? e).slice(0, 200)}`); });
  }
  return { e: "cobrada", monto: c.amt, ...(regla ? { regla } : {}) };
}
/* 25 nov (revisión de 621f214) · El motivo de la alerta cobrada: cuando la encuentra barrerCobradasTarde (nadie la soltó: el proceso se cortó). */
const REPARA: Msg = { es: "El barrido de cobros", en: "The charges sweep" };
/* 25 nov (revisión de 90170a1) · Cuántas pasadas del barrido intenta completar una cancelación a medias sin regla antes de su alerta «no se pudo completar». */
export const COMPLETAR_INTENTOS = 3;
/* 25 nov (revisión de 621f214) · Lo que una cancelación tarde cobrada deja a medias, cada minuto (lib/barrido.ts):
   1) La cancelación tarde de quien pagó (viaje, evento privado) cuyo cobro quedó cobrado SIN su regla: el proceso murió entre que liberarOperacion (o la
      captura) lo anotó cobrado y que se aplicara la regla (viaje: sin la devolución vcx-<número> y con más de la mitad cobrada; evento privado: perdio en
      false), sin su alerta cobrada:. Se aplica la regla (idempotente por la llave vcx-), el aviso y la alerta, como si la soltara el barrido. Solo lo que
      lleva más de 5 minutos cobrado y cancelado (la cancelación que sigue en curso termina antes).
   2) El aviso de lo aplicado que no quedó (avisoCobroFalta), solo lo que falta (quien pagó, el negocio). f.negocio: solo ese negocio (la prueba din9x).
   25 nov (revisión de efe56b9) · La ventana es la de la CANCELACIÓN (o.cancelled_at, los últimos BARRIDO_TARDE_DIAS días), no la del cobro: un viaje se
   cobra al aceptarse, días antes de cancelarse tarde, y la ventana de captured_at (dos días) no lo veía nunca. Índice parcial operations_cancelada_tarde_idx
   (0225). Lo que sale de la ventana sin repararse no cae en silencio: UNA alerta hold_stuck reparar:<cobro> (hasta 30 días). El aviso (2) se busca por la
   operación (avisoCobroFalta), no por su alerta cobrada: (si la alerta no se anotó, el aviso igual se reintenta), con su espera (AVISO_TARDE_ESPERA_MIN);
   agotado sin su alerta aviso:, se vuelve a intentar la alerta; sin la regla para armarlo (reglaTardeLeida null), su alerta y su intento.
   25 nov (revisión de ae940a7) · 3) La que quedó a medias DESPUÉS de empezar a aplicar la regla (reglaCobradaAt hace más de 5 minutos): sin su alerta
   cobrada:, o sin que nadie reclamara su aviso (ni avisoCobro ni avisoCobroAt): se completa («completar»: la regla otra vez, idempotente, el aviso si
   nadie lo reclamó y la alerta si falta). La marca solo la pone la regla por lo cobrado (reglaTardeConLoCobrado): una cancelación normal no la tiene.
   Guardián liberarMira. */
export const BARRIDO_TARDE_DIAS = 7;
export async function barrerCobradasTarde(f: { negocio?: string } = {}): Promise<number> {
  const B = new (await import("./barrido-uno")).Fallos("cobradasTarde");
  const L = (await db().query<{ op: string; num: string; pid: string; amt: number; biz: string | null; city: string | null; fuera: boolean; aplicada: boolean }>(
    `select o.id::text as op, o.number as num, p.id::text as pid, p.amount_cents as amt, p.business_id as biz, p.city_id as city, o.cancelled_at <= now() - make_interval(days => $2::int) as fuera,
            o.details ? 'reglaCobradaAt' as aplicada
       from operations o join payments p on p.operation_id = o.id
      where o.cancel_reason = 'tarde' and o.kind in ('trip', 'private_event') and o.cancelled_at > now() - interval '30 days' and o.cancelled_at < now() - interval '5 minutes'
        and o.status = 'cancelled' and o.cancelled_by = 'user'
        and p.kind in ('full', 'deposit') and p.status in ('captured', 'partially_refunded') and p.captured_at < now() - interval '5 minutes'
        and ($1::text is null or p.business_id = $1::text)
        and not exists (select 1 from money_alerts a where a.kind = 'hold_stuck' and a.subject_id = 'reparar:' || p.id::text)
        and ((not exists (select 1 from money_alerts a where a.kind = 'hold_stuck' and a.subject_id = 'cobrada:' || p.id::text)
              and case when o.kind = 'trip' then p.amount_cents - p.refunded_cents > o.total_cents / 2
                         and not exists (select 1 from refunds r where r.payment_id = p.id and split_part(r.idem_key, '~fallida-', 1) = 'vcx-' || o.number)
                         and not exists (select 1 from money_alerts a where a.kind = 'refund_stuck' and a.subject_id = 'cancelacion:vcx-' || o.number)
                       else coalesce(o.details->>'perdio', '') = 'false' end)
          or (coalesce((o.details->>'reglaCobradaAt')::timestamptz, 'infinity'::timestamptz) < now() - interval '5 minutes'
              and (not exists (select 1 from money_alerts a where a.kind = 'hold_stuck' and a.subject_id = 'cobrada:' || p.id::text)
                   or (coalesce((o.details->>'reglaCompletarIntentos')::int, 0) < $3::int and not coalesce((o.details->>'avisoCobro')::boolean, false) and not (o.details ? 'avisoCobroAt')))))
      order by o.cancelled_at, o.id limit 20`, [f.negocio ?? null, BARRIDO_TARDE_DIAS, COMPLETAR_INTENTOS])).rows;
  await B.cada(L, (x) => `${x.fuera ? "fuera de la ventana" : x.aplicada ? "a medias" : "sin regla"} ${x.op}`, async (x) => {
    if (!x.fuera) { await cobradaConSuRegla(x.op, REPARA, x.aplicada ? "completar" : "reparar"); return; }
    const que: Msg = x.aplicada ? { es: "quedó a medias (su regla se empezó a aplicar, sin su aviso o su alerta)", en: "was left halfway (its rule was started, without its notice or its alert)" }
      : { es: "quedó cobrada sin aplicar su regla", en: "was left charged without its rule applied" };
    await (await import("./dinero-alertas")).alertar("hold_stuck", `reparar:${x.pid}`, { monto: x.amt, negocio: x.biz, ciudad: x.city, detalle: {
      es: `${x.num}: la cancelación tarde (${money(x.amt)} cobrados) ${que.es} y lleva más de ${BARRIDO_TARDE_DIAS} días así: el barrido ya no la repara. Revisa el cobro y aplícala a mano (viaje: devuelve lo que pasa de la mitad; evento privado: el depósito se queda con el restaurante) y díselo a quien pagó y al negocio.`,
      en: `${x.num}: the late cancellation (${money(x.amt)} charged) ${que.en} for more than ${BARRIDO_TARDE_DIAS} days: the sweep no longer repairs it. Check the charge and apply it by hand (trip: refund what is over half; private event: the deposit stays with the restaurant) and tell the payer and the business.` } });
  });
  const A = (await db().query<{ op: string; num: string; kind: string; amt: number; agotado: boolean; falta: unknown }>(
    `select o.id::text as op, o.number as num, o.kind, p.amount_cents as amt, coalesce((o.details->>'avisoCobroIntentos')::int, 0) > $2::int as agotado, o.details->'avisoCobroFalta' as falta
       from operations o join lateral (select y.id, y.amount_cents from payments y where y.operation_id = o.id and y.kind in ('full', 'deposit') order by y.id desc limit 1) p on true
      where o.cancel_reason = 'tarde' and o.kind in ('trip', 'private_event') and o.cancelled_at > now() - interval '30 days' and o.details ? 'avisoCobroFalta'
        and ($1::text is null or o.business_id = $1::text)
        and case when coalesce((o.details->>'avisoCobroIntentos')::int, 0) > $2::int
                 then not exists (select 1 from money_alerts a where a.kind = 'hold_stuck' and a.subject_id = 'aviso:' || p.id::text)
                 when coalesce((o.details->>'avisoCobro')::boolean, false)
                 then coalesce((o.details->>'avisoCobroAt')::timestamptz, '-infinity'::timestamptz) < now() - interval '10 minutes'
                 else coalesce((o.details->>'avisoCobroAt')::timestamptz, '-infinity'::timestamptz) < now() - make_interval(mins => coalesce(($3::int[])[coalesce((o.details->>'avisoCobroIntentos')::int, 0)], 0)) end
      order by o.cancelled_at, o.id limit 20`, [f.negocio ?? null, AVISO_TARDE_INTENTOS, AVISO_TARDE_ESPERA_MIN])).rows;
  await B.cada(A, (x) => `aviso ${x.num}`, async (x) => {
    if (x.agotado) { await alertarAvisoTarde(x.op, x.num, Array.isArray(x.falta) ? x.falta.map(String) : [], "agotado"); return; }
    const regla = await reglaTardeLeida(x.op);
    if (regla) await avisarTardeCobrada(x.op, x.num, x.kind, x.amt, regla, true);
    else await avisoSinRegla(x.op, x.num);
  });
  B.fin();
  return L.length + A.length;
}

/* 25 nov (regla 13) · La captura de una cancelación TARDE de lo retenido (el viaje, el evento privado) LANZÓ o NO TUVO RESPUESTA. pasarela.cobrar no
   lanza: un «no» claro de Stripe vuelve como ok:false y no pasa por aquí (no se cobró); lo que lanza es la base, y puede ser DESPUÉS de un «sí» de Stripe;
   y una captura sin respuesta (red, error de Stripe: capturaSinRespuesta) pudo salir o no. Por eso nada de esto afirma que la captura no salió: el
   llamador ya dejó su rastro en el registro (console.error), leyó la base y soltó la retención (o lo intentó: si Stripe dice que ya estaba cobrada, la
   base la anota cobrada y hay otra alerta, cobrada:<cobro>); aquí solo la alerta al equipo de dinero, una vez por cobro: hold_stuck con sujeto
   captura:<cobro>, que no se cierra sola (alguien mira en Stripe si la captura salió: si salió y la base la da por soltada, el cliente pagó y hay que
   devolverle). El cobro lo pasa el llamador (pid). causa: { err } (lanzó) o { codigo } (sin respuesta). Nunca tira. Guardián capturaTardeAlerta. */
export type CausaCaptura = { err: unknown } | { codigo: string };
export async function alertarCapturaTarde(numero: string, pid: string | null, causa: CausaCaptura, d: import("./devolucion-cancelar").DevCancelar | null) {
  const lanzo = "err" in causa, msg = (lanzo ? String((causa.err as Error)?.message ?? causa.err) : causa.codigo).slice(0, 200);
  try {
    if (!pid) { console.error(`[captura tarde] ${numero}: sin cobro para la alerta (${msg})`); return; }
    // 25 nov (revisión de 00ac9b7) · Si al soltar Stripe dijo que ya estaba cobrada, ya se sabe que la captura salió: la alerta es UNA, la cobrada:<cobro>
    // de soltarRetencion (dice lo cobrado y la regla que se aplicó); otra aquí invitaría a devolver de más.
    if (d?.e === "cobrada") { console.error(`[captura tarde] ${numero}: la captura sí salió (${msg}); la alerta es cobrada:${pid}`); return; }
    const p = (await db().query<{ id: string; amt: number; biz: string | null; city: string | null }>(
      `select y.id::text, y.amount_cents as amt, y.business_id as biz, y.city_id as city from payments y where y.id = $1::bigint`, [pid])).rows[0];
    if (!p) return;
    // Lo que pasó con la captura, dicho como se sabe: dio error (lanzó) o Stripe no contestó; en ningún caso se sabe si salió.
    const que: Msg = lanzo ? { es: `la captura tarde dio error (${msg})`, en: `the late capture failed (${msg})` }
      : { es: `Stripe no contestó a la captura tarde (${msg}): no se sabe si salió`, en: `Stripe did not answer the late capture (${msg}): it is not known whether it went through` };
    const detalle: Msg = d?.e === "liberada" ? {
      es: `${numero}: ${que.es}. Después la retención se soltó (${money(p.amt)}): la base la da por soltada y al cliente se le dijo que se soltó. Revisa en Stripe: si la captura salió, el cliente pagó y hay que devolverle.`,
      en: `${numero}: ${que.en}. The ${money(p.amt)} hold was released afterwards: the books show it as released and the client was told it was released. Check in Stripe: if the capture went through, the client paid and must be refunded.` }
      : d?.e === "retenida" ? {
      es: `${numero}: ${que.es}, y la retención de ${money(p.amt)} no se soltó todavía: el barrido la sigue soltando (mira también la alerta liberar:${p.id} del mismo cobro). Revisa el cobro en Stripe.`,
      en: `${numero}: ${que.en}, and the ${money(p.amt)} hold has not been released yet: the sweep keeps releasing it (see also the liberar:${p.id} alert for the same charge). Check the charge in Stripe.` } : {
      es: `${numero}: ${que.es}; la base dice que el cobro de ${money(p.amt)} ya no está retenido. Revisa en Stripe qué pasó con él.`,
      en: `${numero}: ${que.en}; the books say the ${money(p.amt)} charge is no longer on hold. Check in Stripe what happened to it.` };
    await (await import("./dinero-alertas")).alertar("hold_stuck", `captura:${p.id}`, { monto: p.amt, negocio: p.biz, ciudad: p.city, detalle });
  } catch (e) { console.error(`[captura tarde] ${numero}: la alerta no se anotó: ${String((e as Error)?.message ?? e).slice(0, 200)}`); }
}

/* El motivo de la alerta hold_stuck cuando la suelta un barrido (nadie la pidió en ese momento). */
export const SWEEP: Msg = { es: "El barrido de pagos", en: "The payments sweep" };

/* Repara lo que quedó a medias (una llamada a la pasarela que falló): retenido de un pedido que ya no se da → liberar;
   retenido de uno aceptado → cobrar. Una solicitud con otra hora propuesta (change_proposed) sigue VIVA: su retención no se
   toca (4v: se liberaba el depósito mientras el cliente decidía; guardián reparaVivas). Barato: índice por negocio y solo los retenidos.
   25 nov · Uno aceptado cuyo intento Stripe ya no deja cobrar (failure_code en CAPTURA_TERMINAL: tiene su alerta cobrar:) no se reintenta: antes se
   reintentaba sin fin y, con el límite de 20, dejaba sin barrer a los nuevos. Guardián liberarMira.
   25 nov (revisión de 483a3af) · Solo si su alerta cobrar:<cobro> quedó anotada: si alertar fallaba, el código terminal ya estaba escrito y el cobro quedaba
   retenido para siempre sin que nadie lo supiera; así el barrido lo vuelve a intentar (y a alertar) hasta que la alerta exista. */
export async function repararPagos(negocio: string) {
  if (soloLectura()) return; // 9n-23 · la vista del equipo (solo lectura) no cobra ni libera nada al mirar: lo hace el barrido de cada minuto
  const L = (await db().query<{ op: string; st: string }>(
    `select p.operation_id::text as op, o.status as st from payments p join operations o on o.id = p.operation_id
      where p.business_id = $1 and not (o.status in ('confirmed', 'done') and coalesce(p.failure_code, '') = any($2::text[])
                                         and exists (select 1 from money_alerts a where a.kind = 'hold_stuck' and a.subject_id = 'cobrar:' || p.id::text))
        and p.status = 'held' and o.status not in ('pending', 'change_proposed') and o.kind not in ('market_order', 'hold', 'tickets')
      order by p.held_at nulls first, p.id limit 20`, [negocio, [...CAPTURA_TERMINAL]])).rows;
  // 9t9 · Cada cobro y cada paso por su cuenta (lib/barrido-uno.ts), lo más viejo primero: uno que falla no deja a los demás (ni al mercado, la tienda o
  // los estimados) sin reparar; al final, un solo error que dice cuáles.
  const B = new (await import("./barrido-uno")).Fallos(`pagos.reparar ${negocio}`);
  await B.cada(L, (x) => `op ${x.op}`, async (x) => {
    if (x.st === "confirmed" || x.st === "done") await cobrarOperacion(x.op);
    // Sigue retenida: la alerta hold_stuck ya la tiene el equipo (soltarRetencion) y el próximo barrido la vuelve a soltar.
    else if ((await soltarRetencion(x.op, SWEEP)).e === "retenida") return;
  });
  // Pedido del mercado (4p): nunca se captura lo retenido completo; se cobra lo que pesó (liquidarMercado) o se libera.
  await B.uno("mercado", async () => (await import("./mercado")).repararMercado(negocio));
  // Envío de la tienda (4q-2): se cobra lo que se envió (cobrarApartado), nunca lo retenido completo; o se libera.
  await B.uno("apartados", async () => (await import("./apartados")).repararApartados(negocio));
  // Auto y Hogar (4d): estimado y «algo más» (liquidaciones a medias, retenciones que vencen).
  await B.uno("estimados", async () => (await import("./estimados")).repararEstimados(negocio));
  B.fin();
}

/* Devolver dinero de un cobro (total o parcial). Lo hace el negocio (desde su pedido) o To'Latino (Soporte o
   Transacciones) o una política (cancelar a tiempo). Idempotente por `idem`. La comisión baja en proporción.
   21 nov (9t) · SIEMPRE en dos pasos, como los boletos (6d) y Soporte (support_refunds): la pasarela nunca va antes que la base.
   (1) anotarDevolucionPago, en una transacción con el cobro bloqueado: la devolución queda 'pending' con su llave (la base no deja que lo
       pendiente + lo hecho pase de lo cobrado: refunds_tope) y la auditoría de quien decide (alGuardar) entra ahí mismo.
   (2) ejecutarDevolucionPago: la pasarela con la MISMA llave (la misma llave nunca devuelve dos veces). El «sí» se cierra en otra transacción
       ('done', payments, la operación, una vez: update … where status = 'pending'). Un «no» de la pasarela la deja 'failed' y su saldo libre
       (la llave queda libre para otro intento). Sin respuesta (red, error de Stripe), sigue 'pending' y el barrido la vuelve a preguntar.
   Si el proceso muere entre (1) y (2) o entre el «sí» y el cierre, barrerDevolucionesPago la termina con la misma llave. */
type Msg = { es: string; en: string };
export type ResDevolucion = { ok: true } | { ok: false; msg: Msg; enCamino?: true };
type InDevolver = { paymentId: string; centavos: number; por: "business" | "admin" | "policy"; actorId: string | null; motivo: string; idem: string;
  /* 0209 · «Devolver otra vez» unos boletos: la devolución fallida de la que es (la base lo comprueba: refunds_otra_vez). */
  otraVezDe?: string;
  /* 9v · Nadie mira una pantalla que la pueda repetir (el negocio canceló y el sistema devuelve: devolverAlCancelar): un «no» de Stripe alerta al equipo. */
  nadieMira?: boolean };
const STRIPE_NO: Msg = { es: "Stripe no pudo hacer la devolución. Prueba de nuevo en un momento.", en: "Stripe could not make the refund. Try again in a moment." };
const enCamino = (n: number): Msg => ({ es: `Stripe no contestó. La devolución de ${money(n)} quedó en camino y se termina sola en unos minutos: no la repitas.`,
  en: `Stripe did not answer. The ${money(n)} refund is on its way and finishes by itself in a few minutes: do not repeat it.` });
/* Lo que la pasarela contesta SIN decir si devolvió (sin respuesta, error de Stripe, otra llamada con la misma llave en curso): la devolución
   sigue pendiente y se vuelve a preguntar con la misma llave. Cualquier otro código es un «no» de verdad. */
const SIN_RESPUESTA = new Set(["red", "api_error", "error", "rate_limit", "rate_limit_error", "lock_timeout", "idempotency_key_in_use", "idempotency_error"]);
/* Stripe guarda la respuesta de una llave 24 h: después, preguntar con la misma llave ya no es seguro (podría devolver otra vez). */
const HORAS_LLAVE = 23;

/* Paso 1, dentro de la transacción de quien llama. Devuelve la devolución (nueva o la que ya tenía esa llave). */
export async function anotarDevolucionPago(c: PoolClient, x: InDevolver, alGuardar?: AlGuardar<{ pago: string; centavos: number }>):
  Promise<{ ok: true; id: string; monto: number; estado: "pending" | "done" | "manual" } | { ok: false; msg: Msg }> {
  // Primero el candado del cobro; lo pendiente se suma DESPUÉS, en otra consulta: la que espera el candado ve así lo que la otra acaba de anotar
  // (una subconsulta en la misma sentencia del `for update` miraría la foto de antes de esperar).
  const p0 = (await c.query<{ id: string; amount: number; refunded: number; status: string }>(
    `select p.id::text, p.amount_cents as amount, p.refunded_cents as refunded, p.status from payments p where p.id = $1::bigint for update`, [x.paymentId])).rows[0];
  if (!p0) return { ok: false, msg: { es: "Ese cobro no existe.", en: "That charge does not exist." } };
  const p = { ...p0, refunded: p0.refunded + (await c.query<{ n: number }>(`select coalesce(sum(amount_cents), 0)::int as n from refunds where payment_id = $1::bigint and status = 'pending'`, [p0.id])).rows[0]!.n };
  // La misma llave = la misma devolución (hecha, en camino o resuelta a mano): no se anota ni se audita otra vez.
  const ya = (await c.query<{ id: string; st: string; amt: number; pid: string; mano: boolean }>(
    `select id::text, status as st, amount_cents as amt, payment_id::text as pid, manual_at is not null as mano from refunds where idem_key = $1`, [x.idem])).rows[0];
  if (ya) {
    if (ya.pid !== p.id || ya.st === "failed") return { ok: false, msg: { es: "Esa devolución ya no vale. Actualiza la pantalla.", en: "That refund is no longer valid. Refresh the screen." } };
    return { ok: true, id: ya.id, monto: ya.amt, estado: ya.mano ? "manual" : ya.st === "done" ? "done" : "pending" };
  }
  if (!["captured", "partially_refunded"].includes(p.status)) return { ok: false, msg: { es: "Solo se devuelve lo que ya se cobró.", en: "Only charged money can be refunded." } };
  const n = Math.round(x.centavos);
  // 6d · Lo pendiente ya cuenta (refunded suma las pendientes, también las de boletos).
  if (!(n > 0) || n > p.amount - p.refunded) return { ok: false, msg: { es: `Puedes devolver hasta ${money(p.amount - p.refunded)}.`, en: `You can refund up to ${money(p.amount - p.refunded)}.` } };
  // Otra devolución de este cobro (no de boletos) sigue en camino: hasta que termine no sale otra con otra llave (sin respuesta de Stripe, la
  // pantalla puede repetir con otra llave: sería devolver dos veces).
  const otra = (await c.query<{ amt: number }>(
    `select r.amount_cents as amt from refunds r where r.payment_id = $1::bigint and r.status = 'pending' and r.manual_at is null
        and not exists (select 1 from ticket_refund_lines l where l.refund_id = r.id) order by r.id limit 1`, [p.id])).rows[0];
  if (otra) return { ok: false, msg: { es: `Hay una devolución de ${money(otra.amt)} en camino para este cobro. Espera a que termine y vuelve a intentarlo.`, en: `A ${money(otra.amt)} refund is on its way for this charge. Wait for it to finish and try again.` } };
  const id = (await c.query<{ id: string }>(
    `insert into refunds (payment_id, amount_cents, reason, initiated_by, actor_id, status, idem_key, retry_of) values ($1::bigint, $2, $3, $4, $5, 'pending', $6, $7::bigint) returning id::text`,
    [p.id, n, x.motivo.slice(0, 300), x.por, x.actorId, x.idem, x.otraVezDe ?? null])).rows[0]!.id;
  await alGuardar?.(c, { pago: p.id, centavos: n });
  return { ok: true, id, monto: n, estado: "pending" };
}

/* Paso 2: la pasarela con la llave de la devolución y su cierre. Lo llama devolverPago (y quien anotó en su propia transacción) y el barrido.
   21 nov (9t2) · Pasadas HORAS_LLAVE desde que se anotó, Stripe ya no recuerda la llave: preguntar otra vez podría devolver dos veces. Desde ahí
   nadie la vuelve a mandar (ni el barrido ni un segundo toque de Colas o Soporte): queda en camino y el equipo de dinero la resuelve (alerta).
   alCerrar: lo que quien la pidió escribe en la MISMA transacción que la cierra (la respuesta de Soporte). */
export type AlCerrar = (c: PoolClient) => Promise<void>;
const VIEJA: Msg = { es: "Esta devolución lleva más de un día sin respuesta de Stripe: el equipo de dinero la revisa y la resuelve. No la repitas.",
  en: "This refund has had no answer from Stripe for over a day: the money team reviews and resolves it. Do not repeat it." };
/* 9t7 (0206) · La llave que va a Stripe: la de la fila la primera vez; si la consulta dijo que nunca llegó y la llave volvió a valer (key_n), OTRA llave
   (Stripe pudo guardar la respuesta de la anterior): la misma intención, con sus líneas, su caso y su auditoría. */
export const llaveDe = (idem: string, n: number) => (n > 0 ? `${idem}-r${n}` : idem);
export async function ejecutarDevolucionPago(id: string, o: { barrido?: boolean; alCerrar?: AlCerrar; nadieMira?: boolean } = {}): Promise<ResDevolucion> {
  const r = (await db().query<{ id: string; amt: number; idem: string; kn: number; st: string; mano: boolean; vieja: boolean; pi: string; plataforma: boolean; biz: string | null; city: string | null; por: string }>(
    `select r.id::text, r.amount_cents as amt, r.idem_key as idem, r.key_n as kn, r.status as st, r.manual_at is not null as mano, coalesce(r.key_from, r.created_at) <= now() - make_interval(hours => $2::int) as vieja,
            p.stripe_payment_intent as pi, p.transfer_group is not null as plataforma, r.initiated_by as por, p.business_id as biz, p.city_id as city
       from refunds r join payments p on p.id = r.payment_id where r.id = $1::bigint`, [id, HORAS_LLAVE])).rows[0];
  if (!r) return { ok: false, msg: STRIPE_NO };
  // Resuelta a mano (el cliente recibió su dinero fuera de Stripe): nunca se vuelve a pedir a Stripe (sería pagar dos veces).
  if (r.st === "done" || r.mano) return { ok: true };
  if (r.st !== "pending") return { ok: false, msg: STRIPE_NO };
  if (r.vieja) return { ok: false, msg: VIEJA, enCamino: true };
  // 9t7 · Que se manda (sent_at) y con qué dato buscable (gateway_ref), ANTES de la llamada y en una sentencia; el dato, solo la primera vez (un reintento de
  // una que salió sin él va sin él: la misma llave con otros parámetros, Stripe la rechaza).
  const m = (await db().query<{ gref: string | null }>(`update refunds set gateway_ref = case when sent_at is null then 'refunds:' || id else gateway_ref end, sent_at = coalesce(sent_at, now()), last_sent_at = now() where id = $1::bigint and status = 'pending' and manual_at is null returning gateway_ref as gref`, [r.id])).rows[0];
  if (!m) return { ok: false, msg: STRIPE_NO };
  // Un cobro de la plataforma (boletos) no tiene transferencia ni comisión de destino que revertir.
  const g = await pasarela.devolver(r.pi, r.amt, llaveDe(r.idem, r.kn), { plataforma: r.plataforma, ...(m.gref ? { meta: { tl_intencion: m.gref } } : {}) }).catch(() => ({ ok: false as const, id: undefined, codigo: "error" }));
  if (g.ok) return cerrarDevolucionPago(r.id, g.id ?? null, o.alCerrar);
  const codigo = String(g.codigo ?? "error").slice(0, 60);
  if (SIN_RESPUESTA.has(codigo)) {
    await db().query(`update refunds set attempts = least(10000, attempts + 1), last_error = left($2, 120) where id = $1::bigint and status = 'pending' and manual_at is null`, [r.id, codigo]);
    return { ok: false, msg: enCamino(r.amt), enCamino: true };
  }
  await fallarDevolucionPago(r, codigo, o.barrido || o.nadieMira || r.por === "policy" ? "stuck" : null);
  return { ok: false, msg: STRIPE_NO };
}
/* El «no» de Stripe (al mandarla, o lo que dijo la consulta pasada la llave: 9t7), una vez: 'failed' libera el saldo (el tope cuenta solo lo pendiente y lo
   hecho) y su llave, con la fila del caso de Soporte en la misma transacción. alerta: «stuck» cuando nadie mira la pantalla (el barrido, una política);
   «fallida» cuando lo dijo la consulta (alerta refund_failed, con la auditoría del cierre). nunca: la consulta dijo que nunca llegó y el cobro cambió. */
export async function fallarDevolucionPago(r: { id: string; amt: number; idem: string; biz: string | null; city: string | null }, codigo: string, alerta: "stuck" | "fallida" | null, nunca = false): Promise<boolean> {
  const f = await tx(async (c) => {
    // 'failed' libera el saldo (el tope cuenta solo lo pendiente y lo hecho) y su llave (la fila guarda la original con «~fallida-<id>»): el
    // mismo toque otra vez es otro intento, como antes, sin una fila que diga «hecha».
    const u = (await c.query<{ op: string; otra: string | null; raiz: string | null }>(
      `update refunds r set status = 'failed', attempts = least(10000, r.attempts + 1), last_error = left($2, 120), idem_key = left(r.idem_key, 180) || '~fallida-' || r.id::text
         from payments p where r.id = $1::bigint and r.status = 'pending' and r.manual_at is null and p.id = r.payment_id
       returning p.operation_id::text as op, r.retry_of::text as otra, (select split_part(x.idem_key, '~fallida-', 1) from refunds x where x.id = r.lines_of) as raiz`, [r.id, codigo])).rows[0];
    if (u?.otra) {
      // 0209 · La de otra vez de unos boletos: lo que la cancelación del evento contaba vuelve a restarse (devolverOtraVez lo había sumado).
      const cx = /^evtcx-(\d{1,18})-\d{1,18}$/.exec(u.raiz ?? "");
      if (cx) await c.query(`update event_cancellations set refunded_cents = greatest(0, refunded_cents - $2::int) where id = $1::bigint`, [cx[1], r.amt]);
    }
    if (u) {
      await evento(c, u.op, "refund_failed", { es: `Stripe no hizo la devolución de ${money(r.amt)}`, en: `Stripe did not make the ${money(r.amt)} refund` });
      // 9t2 · La fila del caso de Soporte (la misma llave) queda fallida con ella, en la misma transacción: nadie tiene que volver a tocar.
      await c.query(`update support_refunds set status = 'failed', fail_reason = left($2, 200), done_at = now() where idem_key = $1 and status = 'pending'`, [r.idem, STRIPE_NO.es]);
      if (alerta === "fallida") await (await import("./consulta-pasarela")).auditarCierre(c, "refunds", r.id, r.city, { estado: nunca ? "nunca llegó a Stripe y el cobro cambió: no se volvió a mandar" : "fallida", monto: money(r.amt) });
    }
    return u ? { otra: u.otra } : null;
  });
  // 0209 · Una devolución de otra vez de unos boletos que falla tiene SU alerta refund_failed (desde ella se puede devolver otra vez) y la de antes se reabre.
  if (f?.otra) {
    const { alertar, reabrirOtraVez } = await import("./dinero-alertas");
    await alertar("refund_failed", r.id, { monto: r.amt, negocio: r.biz, ciudad: r.city, detalle: {
      es: `La devolución de otra vez de ${money(r.amt)} de unos boletos (la fallida de antes: ${f.otra}) también falló: Stripe dijo que no (${codigo}). Los boletos siguen devueltos y su saldo volvió al cobro: decide con la persona si se le devuelve otra vez.`,
      en: `The ${money(r.amt)} refund made again for some tickets (the earlier failed one: ${f.otra}) also failed: Stripe said no (${codigo}). The tickets stay refunded and the balance is back on the charge: decide with the person whether to refund again.` } }).catch(() => undefined);
    await reabrirOtraVez(f.otra, r.id).catch(() => false);
    if (alerta === "stuck" || alerta === "fallida") return true;
  }
  // Desde el barrido, o en una devolución por política (cancelar a tiempo: la hace el sistema), nadie está mirando la pantalla: el equipo de dinero
  // lo sabe (una vez por devolución).
  if (f && alerta === "stuck") await (await import("./dinero-alertas")).alertar("refund_stuck", r.id, { monto: r.amt, negocio: r.biz, ciudad: r.city,
    detalle: { es: `Devolución de ${money(r.amt)}: al terminarla, Stripe dijo que no (${codigo}). Quedó fallida y su saldo libre: si todavía se debe, devuélvela otra vez.`,
      en: `Refund of ${money(r.amt)}: when finishing it, Stripe said no (${codigo}). It is now failed and its balance free: if it is still owed, refund it again.` } }).catch(() => undefined);
  // 9t7 · Lo dijo la consulta a la pasarela (pasada la llave): la alerta de una devolución que Stripe dio por fallida, una vez.
  if (f && alerta === "fallida") await (await import("./dinero-alertas")).alertar("refund_failed", r.id, { monto: r.amt, negocio: r.biz, ciudad: r.city, detalle: nunca
    ? { es: `Devolución de ${money(r.amt)}: nunca llegó a Stripe y el cobro cambió mientras tanto (se devolvió por otro lado, tiene una disputa o ya no le queda saldo), así que no se volvió a mandar. Quedó fallida y su saldo libre: si todavía se debe, devuélvela otra vez.`,
        en: `Refund of ${money(r.amt)}: it never reached Stripe and the charge changed meanwhile (refunded elsewhere, disputed or no balance left), so it was not sent again. It is now failed and its balance free: if it is still owed, refund it again.` }
    : { es: `Devolución de ${money(r.amt)}: Stripe la tiene como fallida (lo dijo la consulta, pasado un día sin respuesta). Quedó fallida y su saldo libre: si todavía se debe, devuélvela otra vez.`,
        en: `Refund of ${money(r.amt)}: Stripe has it as failed (the query said so, after a day with no answer). It is now failed and its balance free: if it is still owed, refund it again.` } }).catch(() => undefined);
  return !!f;
}

/* 9v (25 nov) · Lo que de verdad pasa con las devoluciones de una operación, para que su pantalla no diga «Te devolvemos todo» sin mirar: en camino (pendiente:
   Stripe no contestó y el barrido la sigue mandando con la misma llave) y fallida (Stripe dijo que no y nadie la volvió a hacer ni la resolvió a mano). Lo
   hecho ya lo dice refunded_cents (devueltoDelLibro). Guardián devueltoSoloSiSalio. */
export async function devolucionesDe(opId: string): Promise<{ camino: number; fallida: number }> {
  return (await db().query<{ camino: number; fallida: number }>(
    `select coalesce(sum(r.amount_cents) filter (where r.status = 'pending'), 0)::int as camino,
            coalesce(sum(r.amount_cents) filter (where r.status = 'failed' and r.manual_at is null and not exists (select 1 from refunds y where y.retry_of = r.id)), 0)::int as fallida
       from refunds r join payments p on p.id = r.payment_id where p.operation_id = $1::bigint`, [opId])).rows[0] ?? { camino: 0, fallida: 0 };
}

/* Lo devuelto de un cobro sale del libro (la suma de las devoluciones hechas), nunca de sumar otra vez: si el webhook charge.refunded ya lo había
   contado (greatest), no se cuenta dos veces. La usan el cierre de aquí y el de los boletos (lib/boletos-despues.ts). */
export async function devueltoDelLibro(c: Q, pid: string): Promise<{ st: string; op: string }> {
  return (await c.query<{ st: string; op: string }>(
    `with x as (select coalesce(sum(amount_cents), 0)::int as hecho from refunds where payment_id = $1::bigint and status = 'done')
     update payments p set refunded_cents = least(p.amount_cents, greatest(p.refunded_cents, x.hecho)),
            status = case when least(p.amount_cents, greatest(p.refunded_cents, x.hecho)) >= p.amount_cents then 'refunded' else 'partially_refunded' end, updated_at = now()
       from x where p.id = $1::bigint returning p.status as st, p.operation_id::text as op`, [pid])).rows[0]!;
}

/* El «sí» de la pasarela, en su transacción y una sola vez (lo devuelto, de devueltoDelLibro). Avisa a la persona solo quien la cierra.
   9t2 · En la MISMA transacción se cierra lo que esa devolución deja hecho en su caso (cerrarDelCaso, por su llave), la cierre quien la cierre:
   quien la pidió o el barrido. Lo del caso va ANTES del cobro (el mismo orden de candados que al anotar: el caso y después el cobro). */
/* 9t7 · porConsulta: la cerró lo que dijo la consulta a la pasarela (pasada la llave): su auditoría de sistema en la misma transacción. */
export async function cerrarDevolucionPago(id: string, stripeId: string | null, alCerrar?: AlCerrar, porConsulta = false): Promise<ResDevolucion> {
  const h = await tx(async (c) => {
    const u = (await c.query<{ pid: string; amt: number; idem: string; city: string | null; otra: string | null }>(
      `update refunds set status = 'done', stripe_refund_id = coalesce(stripe_refund_id, $2), done_at = now(), last_error = null
        where id = $1::bigint and status = 'pending' and manual_at is null returning payment_id::text as pid, amount_cents as amt, idem_key as idem, (select y.city_id from payments y where y.id = payment_id) as city, retry_of::text as otra`, [id, stripeId])).rows[0];
    if (!u) return null;
    if (porConsulta) await (await import("./consulta-pasarela")).auditarCierre(c, "refunds", id, u.city, { estado: "hecha", devolucion: stripeId, monto: money(u.amt) });
    await alCerrar?.(c);
    const caso = await cerrarDelCaso(c, { idem: u.idem, amt: u.amt }, !!alCerrar);
    const l = await devueltoDelLibro(c, u.pid);
    const p = (await c.query<{ uid: string; num: string; kind: string; brand: string | null; l4: string | null }>(
      `select p.user_id::text as uid, o.number as num, o.kind, p.card_brand as brand, p.card_last4 as l4 from payments p join operations o on o.id = p.operation_id where p.id = $1::bigint`, [u.pid])).rows[0]!;
    await c.query(`update operations set pay_status = $2 where id = $1::bigint`, [l.op, l.st]);
    await evento(c, l.op, "refunded", { es: `Devolución de ${money(u.amt)}`, en: `Refund of ${money(u.amt)}` });
    return { ...p, amt: u.amt, caso, otra: u.otra };
  });
  if (!h) {
    const st = (await db().query<{ st: string; mano: boolean }>(`select status as st, manual_at is not null as mano from refunds where id = $1::bigint`, [id])).rows[0];
    return st && (st.st === "done" || st.mano) ? { ok: true } : { ok: false, msg: STRIPE_NO };
  }
  const tarjeta = h.brand && h.l4 ? `${({ visa: "Visa", mastercard: "Mastercard", mc: "Mastercard", amex: "Amex", discover: "Discover", disc: "Discover" } as Record<string, string>)[h.brand] ?? h.brand} ·· ${h.l4}` : "tarjeta";
  const R = refDe(h.kind, h.num);
  await (await import("./avisos")).avisar(h.uid, "pay_refund", { monto: money(h.amt), num: R.num, tarjeta }, { href: R.href, ref: R.ref }).catch(() => undefined);
  if (h.caso) await (await import("./soporte")).avisarCaso(h.caso, "sop_resuelto").catch(() => undefined);
  // 0209 · La devolución de otra vez de unos boletos quedó hecha: la alerta de la fallida de antes se cierra sola, ya (el barrido también la cierra).
  if (h.otra) await (await import("./dinero-alertas")).cerrarAlertaSola("refund_failed", h.otra, { es: `Cerrada sola: la devolución de otra vez quedó hecha (${money(h.amt)}).`, en: `Closed by itself: the refund made again is done (${money(h.amt)}).` }).catch(() => false);
  return { ok: true };
}

/* 9t2 · Lo que una devolución hecha cierra en su caso, por su llave, en la transacción que la marca 'done' (una sola vez, la cierre quien la cierre):
   - Soporte (`tk-<clave>`, resolverYDevolver): la fila de support_refunds pasa a hecha, el caso suma lo devuelto y queda resuelto con «Te devolvimos»
     (y la respuesta del equipo: la pone quien la pidió con alCerrar o, si la cerró el barrido, la que quedó guardada al ir en camino), y su auditoría.
   - Ayuda de la cita (`ayb-h<solicitud>-p<cobro>`, el negocio devuelve; `ayc-<solicitud>-p<cobro>`, la persona acepta lo que el negocio propuso):
     help_requests.refunded_cents suma lo que de verdad salió. Nadie más lo suma. Devuelve el número del caso de Soporte (para avisar después). */
async function cerrarDelCaso(c: PoolClient, r: { idem: string; amt: number }, conRespuesta: boolean): Promise<string | null> {
  const ay = /^(?:ayb-h|ayc-)(\d{1,18})-p\d{1,18}$/.exec(r.idem);
  if (ay) { await c.query(`update help_requests set refunded_cents = refunded_cents + $2, updated_at = now() where id = $1::bigint`, [ay[1], r.amt]); return null; }
  // Soporte: lo cierra lib/soporte-equipo (la respuesta guardada, tapada, y el caso) en esta misma transacción.
  if (/^tk-[0-9a-f-]{36}$/.test(r.idem)) return (await import("./soporte-equipo")).cerrarCasoDevuelto(c, r.idem, r.amt, conRespuesta);
  return null;
}

export async function devolverPago(x: InDevolver, alGuardar?: AlGuardar<{ pago: string; centavos: number }>): Promise<ResDevolucion> {
  const a = await tx((c) => anotarDevolucionPago(c, x, alGuardar));
  if (!a.ok) return a;
  if (a.estado !== "pending") return { ok: true };
  return ejecutarDevolucionPago(a.id, { nadieMira: x.nadieMira });
}

/* 9v (25 nov, tercera tanda) · El NEGOCIO cancela (la salida de un viaje, una mesa de la noche, una inscripción o el grupo, una fecha de fiesta) y el sistema
   devuelve todo lo cobrado. Antes se tiraba lo que devolvía devolverPago y el aviso decía «Te devolvemos todo» con lo decidido; y como la pide el negocio
   (por 'business'), un «no» de Stripe no avisaba a nadie. Ahora nadie mira una pantalla que la repita (nadieMira: el «no» alerta al equipo de dinero, como
   una política; sin respuesta, el barrido la sigue y alerta si falla) y lo que pasó se lee de la base por su llave: hecha · en camino · fallida. Si ni
   siquiera se pudo anotar (otra devolución de ese cobro sigue en camino), también alerta. Lo retenido se libera; lo que no se cobró no se devuelve. Los
   textos (aviso y panel): lib/devolucion-cancelar.ts. Guardián devueltoSoloSiSalio.
   25 nov (cuarta tanda) · También cuando cancela QUIEN PAGÓ (por la regla: por "policy") y el evento privado: por y seQueda (lo que el negocio se queda por la
   regla, p. ej. la mitad de un viaje cancelado tarde; se devuelve el resto). Y la retención se mira: si la pasarela no la soltó, «retenida» y alerta
   hold_stuck al equipo (una vez por cobro; el barrido la sigue soltando), como el resto de lo que nadie mira. */
export async function devolverAlCancelar(o: { id: string; pay: string | null; pid: string | null; amount: number | null; refunded: number | null },
  x: { actorId: string | null; motivo: string; idem: string; por?: "business" | "policy"; seQueda?: number }): Promise<import("./devolucion-cancelar").DevCancelar> {
  const por = x.por ?? "business", quien = por === "business" ? { es: "lo canceló el negocio", en: "The business cancelled" } : { es: "lo canceló el cliente", en: "The client cancelled" };
  if (o.pay === "held") {
    // La retención se mira (soltarRetencion): la que la pasarela no soltó es «retenida» y alerta hold_stuck al equipo, una vez por cobro; la que Stripe
    // ya había cobrado es «cobrada» (la base la anota cobrada y alerta cobrada:<cobro>, que no se cierra sola): nunca «liberada» con el dinero cobrado.
    const s = await soltarRetencion(o.id, { es: `${x.motivo} (${quien.es})`, en: quien.en });
    if (s.e === "retenida" || s.e === "cobrada") return { e: s.e, monto: s.monto, ...(s.regla ? { regla: s.regla } : {}) };
    // «liberada» o «nada» (otro la soltó, o la cambió, mientras tanto): se relee el cobro antes de afirmar; nunca «se soltó $0».
    const y = (await db().query<{ st: string; amt: number; ref: number }>(`select status as st, coalesce(nullif(held_cents, 0), amount_cents) as amt, refunded_cents as ref from payments where operation_id = $1::bigint and kind in ('full', 'deposit') order by id desc limit 1`, [o.id])).rows[0];
    if (!y) return { e: "nada", monto: 0 };
    if (y.st === "released") return y.amt > 0 ? { e: "liberada", monto: y.amt } : { e: "nada", monto: 0 };
    // 25 nov (revisión de 483a3af) · Si el barrido ganó la carrera y aplicó la regla de la cancelación tarde, se dice lo que aplicó (reglaTardeLeida).
    if (y.st === "captured" || y.st === "partially_refunded") {
      const regla = await reglaTardeLeida(o.id).catch((e) => { console.error(`[cobrada] operación ${o.id}: la regla aplicada no se pudo leer: ${String((e as Error)?.message ?? e).slice(0, 200)}`); return null; });
      return { e: "cobrada", monto: Math.max(0, y.amt - y.ref), ...(regla ? { regla } : {}) };
    }
    if (y.st === "held") return { e: "retenida", monto: y.amt };
    return { e: "nada", monto: 0 };
  }
  if (!o.pid || !o.amount || !["captured", "partially_refunded", "refunded"].includes(o.pay ?? "")) return { e: "nada", monto: 0 };
  const falta = o.amount - (o.refunded ?? 0) - Math.max(0, Math.round(x.seQueda ?? 0));
  // 25 nov (revisión de 621f214) · Nada más que devolver y algo se queda: si la devolución de esta llave ya existe (la pidió otro: la cancelación y el barrido
  // la encontraron cobrada los dos), se dice lo que pasó con ella; sin ella, «nada». Guardián liberarMira.
  if (falta <= 0) return x.seQueda ? (await devDeLaLlave(o.pid, x.idem)) ?? { e: "nada", monto: 0 } : { e: "hecha", monto: o.refunded ?? 0 };
  const r = await devolverPago({ paymentId: o.pid, centavos: falta, por, actorId: x.actorId, motivo: x.motivo, idem: x.idem, nadieMira: true });
  if (r.ok) return { e: "hecha", monto: falta };
  // Lo que quedó en la base con esa llave (una fallida guarda la suya con «~fallida-<id>»).
  const f = (await db().query<{ st: string; amt: number; mano: boolean }>(
    `select status as st, amount_cents as amt, manual_at is not null as mano from refunds where payment_id = $1::bigint and split_part(idem_key, '~fallida-', 1) = $2 order by id desc limit 1`, [o.pid, x.idem])).rows[0];
  if (f && (f.st === "done" || f.mano)) return { e: "hecha", monto: f.amt };
  if (f?.st === "pending") return { e: "en_camino", monto: f.amt };
  if (!f) {
    const p = (await db().query<{ biz: string | null; city: string | null }>(`select business_id as biz, city_id as city from payments where id = $1::bigint`, [o.pid])).rows[0];
    await (await import("./dinero-alertas")).alertar("refund_stuck", `cancelacion:${x.idem}`.slice(0, 200), { monto: falta, negocio: p?.biz ?? null, ciudad: p?.city ?? null, detalle: {
      es: `${x.motivo} (${quien.es}): la devolución de ${money(falta)} no se pudo anotar (${r.msg.es}). El cliente no la recibió: revisa el cobro en Stripe y devuélvela.`,
      en: `${quien.en}: the ${money(falta)} refund could not be recorded (${r.msg.en}). The client did not get it: check the charge in Stripe and refund it.` } }).catch(() => undefined);
  }
  return { e: "fallida", monto: f?.amt ?? falta };
}

/* 25 nov (revisión de 621f214) · Lo que pasó con la devolución de una llave de este cobro (una fallida guarda la suya con «~fallida-<id>»): hecha (o resuelta
   a mano) · en camino · fallida; sin fila, null. */
async function devDeLaLlave(pid: string, idem: string): Promise<import("./devolucion-cancelar").DevCancelar | null> {
  const f = (await db().query<{ st: string; amt: number; mano: boolean }>(
    `select status as st, amount_cents as amt, manual_at is not null as mano from refunds where payment_id = $1::bigint and split_part(idem_key, '~fallida-', 1) = $2 order by id desc limit 1`, [pid, idem])).rows[0];
  if (!f) return null;
  return f.st === "done" || f.mano ? { e: "hecha", monto: f.amt } : f.st === "pending" ? { e: "en_camino", monto: f.amt } : { e: "fallida", monto: f.amt };
}

/* Barrido: las devoluciones de un cobro (no de boletos: esas las termina barrerDevolucionesBoletos) que quedaron pendientes (el proceso murió
   entre la intención y la pasarela, o entre el «sí» y el cierre, o Stripe no contestó) se preguntan otra vez con la MISMA llave mientras Stripe
   la recuerda; pasado eso no se pregunta más (podría devolver dos veces): el equipo de dinero lo revisa en Stripe y la resuelve a mano. */
export async function barrerDevolucionesPago(): Promise<number> {
  // 9t7 · Desde que su llave vale (created_at, o key_from si la consulta dijo que nunca llegó y la llave volvió a valer).
  const L = (await db().query<{ id: string }>(
    `select r.id::text from refunds r where r.status = 'pending' and r.manual_at is null and r.created_at < now() - interval '2 minutes'
        and coalesce(r.key_from, r.created_at) > now() - make_interval(hours => $1::int) and not exists (select 1 from ticket_refund_lines l where l.refund_id = r.id)
      order by r.created_at limit 50`, [HORAS_LLAVE])).rows;
  let n = 0;
  // 9t9 · Cada devolución por su cuenta (lib/barrido-uno.ts): antes el error de una se tragaba sin rastro; ahora queda en el registro y la tarea sale fallida.
  const B = new (await import("./barrido-uno")).Fallos("devolucionesPago");
  await B.cada(L, (r) => `devolucion ${r.id}`, async (r) => { if ((await ejecutarDevolucionPago(r.id, { barrido: true })).ok) n++; });
  // 9t7 · Las viejas: se le pregunta a la pasarela (lib/devolucion-consulta.ts, una vez cada CADA_MIN por devolución) y se cierran con lo que dijo, sin
  // llamar a Stripe con una llave de más de HORAS_LLAVE; las que no cierran (y las anotadas sin el dato buscable), la alerta refund_stuck, una vez.
  await B.uno("viejas", async () => { n += await (await import("./devolucion-consulta")).preguntarViejas(false); });
  B.fin();
  return n;
}
/* La alerta de una devolución que pasó HORAS_LLAVE sin respuesta (la usan este barrido y el de los boletos): una vez por devolución. 9t7 · conDato: se
   mandó con su dato buscable (el servidor le sigue preguntando a Stripe y la cierra con lo que diga); sin él (anotada antes de 0206), se mira en Stripe y
   se resuelve a mano (antes de marcarla, el servidor vuelve a preguntar). */
export async function alertaVieja(r: { id: string; amt: number; biz: string | null; city: string | null; n: number; err: string | null }, conDato = false) {
  await (await import("./dinero-alertas")).alertar("refund_stuck", r.id, { monto: r.amt, negocio: r.biz, ciudad: r.city, detalle: conDato
    ? { es: `Devolución de ${money(r.amt)} sin respuesta de Stripe en ${HORAS_LLAVE} h (${r.n} intentos, ${r.err ?? "sin motivo"}): ya no se manda con esa llave. El servidor le pregunta a Stripe y la cierra con lo que diga.`,
        en: `Refund of ${money(r.amt)} with no answer from Stripe in ${HORAS_LLAVE} h (${r.n} attempts, ${r.err ?? "no reason"}): it is not sent with that key again. The server asks Stripe and closes it with the answer.` }
    : { es: `Devolución de ${money(r.amt)} sin respuesta de Stripe en ${HORAS_LLAVE} h (${r.n} intentos, ${r.err ?? "sin motivo"}): se anotó sin el dato para buscarla en Stripe. Mira en Stripe si salió y resuélvela a mano (antes de marcarla, el servidor vuelve a preguntar).`,
        en: `Refund of ${money(r.amt)} with no answer from Stripe in ${HORAS_LLAVE} h (${r.n} attempts, ${r.err ?? "no reason"}): it was recorded without the data to find it in Stripe. Check in Stripe whether it went out and resolve it by hand (the server asks again before marking it).` } }).catch(() => undefined);
}
export const HORAS_LLAVE_STRIPE = HORAS_LLAVE;

/* 9t2 · Webhook charge.refund.updated: Stripe dio por fallida una devolución que ya estaba hecha (días después: la tarjeta se cerró, el banco la
   rechazó). En UNA transacción: la devolución pasa a 'failed' (su llave queda libre, como un «no»), lo devuelto del cobro vuelve a salir del libro
   (sin bajar de lo que el libro todavía cuenta como hecho), la operación lo dice y lo que el caso había sumado se resta. Después, la alerta al
   equipo de dinero (una vez): si todavía se debe, se devuelve otra vez. Una que no está en el libro (hecha desde Stripe) solo alerta. */
export async function devolucionFallidaEnStripe(stripeRefundId: string, motivo: string, monto: number): Promise<"anotada" | "fuera" | "ya"> {
  const why = String(motivo || "failed").slice(0, 60);
  const h = await tx(async (c) => {
    const r = (await c.query<{ id: string; amt: number; pid: string; idem: string; biz: string | null; city: string | null; otra: string | null; lineas: string }>(
      `update refunds r set status = 'failed', last_error = left($2, 120), idem_key = left(r.idem_key, 180) || '~fallida-' || r.id::text
         from payments p where r.stripe_refund_id = $1 and r.status = 'done' and p.id = r.payment_id
       returning r.id::text, r.amount_cents as amt, r.payment_id::text as pid, r.retry_of::text as otra, coalesce(r.lines_of, r.id)::text as lineas,
                 -- 0209 · Una devolución de otra vez de unos boletos lleva la llave de la de los boletos (la cancelación del evento se reconoce por ella).
                 split_part(coalesce((select x.idem_key from refunds x where x.id = r.lines_of), r.idem_key), '~fallida-', 1) as idem, p.business_id as biz, p.city_id as city`, [stripeRefundId, `stripe:${why}`])).rows[0];
    if (!r) return null;
    const ay = /^(?:ayb-h|ayc-)(\d{1,18})-p\d{1,18}$/.exec(r.idem), sq = /^sop-q(\d{1,18})$/.exec(r.idem);
    if (ay) await c.query(`update help_requests set refunded_cents = greatest(0, refunded_cents - $2), updated_at = now() where id = $1::bigint`, [ay[1], r.amt]);
    if (sq) await c.query(`update help_requests set refunded_cents = greatest(0, refunded_cents - $2), updated_at = now() where id = (select q.subject_id::bigint from queue_items q where q.id = $1::bigint and q.subject_kind = 'help_request')`, [sq[1], r.amt]);
    if (/^tk-/.test(r.idem)) await c.query(`update support_cases set refunded_cents = greatest(0, refunded_cents - $2) where id = (select case_id from support_refunds where idem_key = $1)`, [r.idem, r.amt]);
    // 9t3 · Boletos: los boletos se quedan devueltos (no se reponen solos ni se devuelve otra vez solo: lo decide una persona del equipo desde la
    // alerta) y lo que la cancelación del evento contaba como devuelto lo resta, aquí mismo (la llave de esa devolución: evtcx-<cancelación>-<orden>).
    // Lo que To'Latino había cedido de su comisión en esos boletos deja de contar con la devolución fallida (evt_liq_calc, 0199).
    const cx = /^evtcx-(\d{1,18})-\d{1,18}$/.exec(r.idem);
    if (cx) await c.query(`update event_cancellations set refunded_cents = greatest(0, refunded_cents - $2) where id = $1::bigint`, [cx[1], r.amt]);
    const bol = (await c.query<{ num: string; quien: string | null; codes: string | null; titulares: string | null }>(
      `select o.number as num, nullif(trim(coalesce(u.first_name, '') || ' ' || left(coalesce(u.last_name, ''), 1)), '') as quien,
              string_agg(t.code, ', ' order by t.id) as codes,
              string_agg(distinct nullif(trim(coalesce(h.first_name, '') || ' ' || left(coalesce(h.last_name, ''), 1)), ''), ', ') as titulares
         from ticket_refund_lines l join operations o on o.id = l.operation_id left join users u on u.id = o.user_id
         left join tickets t on t.id = l.ticket_id left join users h on h.id = t.holder_user_id
        where l.refund_id = $1::bigint group by o.number, u.first_name, u.last_name`, [r.lineas])).rows[0] ?? null;
    const l = (await c.query<{ st: string; op: string }>(
      `with x as (select coalesce(sum(amount_cents), 0)::int as hecho from refunds where payment_id = $1::bigint and status = 'done'),
            y as (select p.id, least(p.amount_cents, greatest(x.hecho, p.refunded_cents - $2::int)) as dev from payments p, x where p.id = $1::bigint)
       update payments p set refunded_cents = y.dev, status = case when y.dev >= p.amount_cents then 'refunded' when y.dev > 0 then 'partially_refunded' else 'captured' end, updated_at = now()
         from y where p.id = y.id and p.status in ('captured', 'partially_refunded', 'refunded') returning p.status as st, p.operation_id::text as op`, [r.pid, r.amt])).rows[0];
    if (l) {
      await c.query(`update operations set pay_status = $2 where id = $1::bigint`, [l.op, l.st]);
      await evento(c, l.op, "refund_failed", { es: `Stripe no pudo completar la devolución de ${money(r.amt)}: el dinero no llegó a la tarjeta`, en: `Stripe could not complete the ${money(r.amt)} refund: the money did not reach the card` });
    }
    return { ...r, bol };
  });
  const { alertar } = await import("./dinero-alertas");
  if (h?.bol) {
    // 9t3 · Qué boletos y de quién: una persona del equipo decide con eso (devolver otra vez o reponer el boleto); nada de eso pasa solo.
    const b = h.bol, quien = b.quien ?? "sin nombre", tit = b.titulares && b.titulares !== b.quien ? ` (a nombre de ${b.titulares})` : "", titEn = b.titulares && b.titulares !== b.quien ? ` (held by ${b.titulares})` : "";
    await alertar("refund_failed", h.id, { monto: h.amt, negocio: h.biz, ciudad: h.city, detalle: {
      es: `Stripe dio por fallida la devolución de ${money(h.amt)} de la orden de boletos ${b.num} de ${quien} (${why}): el dinero no llegó a la tarjeta. Boletos: ${b.codes ?? "solo extras"}${tit}. Siguen devueltos (no entran) y su saldo volvió al cobro: decide con la persona si se le devuelve otra vez o se le repone el boleto.`,
      en: `Stripe marked the ${money(h.amt)} refund of ticket order ${b.num} from ${quien} as failed (${why}): the money did not reach the card. Tickets: ${b.codes ?? "extras only"}${titEn}. They stay refunded (no entry) and the balance is back on the charge: decide with the person whether to refund again or reissue the ticket.` } }).catch(() => undefined);
    // 0209 · Era la devolución de otra vez: la alerta de la fallida de antes se reabre y dice dónde sigue.
    if (h.otra) await (await import("./dinero-alertas")).reabrirOtraVez(h.otra, h.id).catch(() => false);
    return "anotada";
  }
  if (!h) {
    const ya = (await db().query(`select 1 from refunds where stripe_refund_id = $1 and status = 'failed'`, [stripeRefundId])).rowCount;
    if (ya) return "ya";
    await alertar("refund_failed", stripeRefundId, { monto, detalle: { es: `Stripe dio por fallida la devolución ${stripeRefundId} de ${money(monto)} (${why}), que no está en nuestro libro: mírala en Stripe.`,
      en: `Stripe marked refund ${stripeRefundId} of ${money(monto)} as failed (${why}); it is not in our ledger: check it in Stripe.` } }).catch(() => undefined);
    return "fuera";
  }
  await alertar("refund_failed", h.id, { monto: h.amt, negocio: h.biz, ciudad: h.city, detalle: { es: `Stripe dio por fallida una devolución de ${money(h.amt)} que ya estaba hecha (${why}): el dinero no llegó a la tarjeta. Quedó fallida y su saldo volvió al cobro: si todavía se debe, devuélvela otra vez.`,
    en: `Stripe marked an already made ${money(h.amt)} refund as failed (${why}): the money did not reach the card. It is now failed and its balance is back on the charge: if it is still owed, refund it again.` } }).catch(() => undefined);
  return "anotada";
}

/* 9k · Devolver de una operación con varios cobros (L448: estimado + «algo más» + visita; L455: planes y rentas, un cobro por período). Se reparte entre
   los cobros con saldo, del de más saldo al de menos, y cada parte va por devolverPago con su propia llave (`<idem>-p<cobro>`): reintentar con la misma
   llave no devuelve dos veces lo que ya salió (las partes hechas se saltan y cuentan). El tope es lo que queda por devolver en esos cobros: lo decide el
   servidor. Si una parte falla, lo hecho queda hecho y el mensaje lo dice; el mismo toque otra vez sigue donde quedó.
   20 nov · alGuardar: la auditoría de quien decide entra con CADA parte, en la transacción que la anota (devolverPago): cada dinero que sale tiene
   su renglón en la misma transacción; una parte ya hecha (el reintento la salta) no se vuelve a auditar porque no se vuelve a mover. */
export async function devolverOperacion(x: { opId: string; centavos: number; kinds: string[]; por: "business" | "admin" | "policy"; actorId: string | null; motivo: string; idem: string }, alGuardar?: AlGuardar<{ pago: string; centavos: number; parte: number }>): Promise<{ ok: true; partes: number } | { ok: false; msg: { es: string; en: string }; enCamino?: true }> {
  const P = (await db().query<{ id: string; resto: number }>(
    // También los ya devueltos del todo: una parte hecha con esta llave cuenta aunque su cobro ya no tenga saldo (el reintento no la repite).
    `select p.id::text, case when p.status in ('captured', 'partially_refunded')
                             then p.amount_cents - p.refunded_cents - coalesce((select sum(r.amount_cents) from refunds r where r.payment_id = p.id and r.status = 'pending'), 0)::int else 0 end as resto
       from payments p where p.operation_id = $1::bigint and p.kind = any($2::text[]) and p.status in ('captured', 'partially_refunded', 'refunded')
      order by 2 desc, p.id desc limit 200`, [x.opId, x.kinds])).rows;
  const llaves = P.map((p) => `${x.idem}-p${p.id}`);
  const hechas = (await db().query<{ k: string; n: number }>(`select idem_key as k, amount_cents as n from refunds where idem_key = any($1::text[])`, [llaves])).rows;
  const ya = hechas.reduce((s, r) => s + r.n, 0), conLlave = new Set(hechas.map((r) => r.k));
  const n = Math.round(x.centavos);
  let falta = n - ya;
  if (!(n > 0)) return { ok: false, msg: { es: "Escribe cuánto se devuelve.", en: "Write how much to refund." } };
  if (falta <= 0) return { ok: true, partes: hechas.length };
  const libre = P.filter((p) => !conLlave.has(`${x.idem}-p${p.id}`)).reduce((s, p) => s + Math.max(0, p.resto), 0);
  if (falta > libre) return { ok: false, msg: { es: `Puedes devolver hasta ${money(libre + ya)}.`, en: `You can refund up to ${money(libre + ya)}.` } };
  let partes = hechas.length;
  for (const p of P) {
    if (falta <= 0) break;
    if (conLlave.has(`${x.idem}-p${p.id}`) || p.resto <= 0) continue;
    const q = Math.min(falta, p.resto);
    const parte = partes + 1;
    const d = await devolverPago({ paymentId: p.id, centavos: q, por: x.por, actorId: x.actorId, motivo: x.motivo, idem: `${x.idem}-p${p.id}` },
      alGuardar ? (c, h) => alGuardar(c, { ...h, parte }) : undefined);
    // 9t · Sin respuesta de Stripe, esa parte sigue en camino (cuenta como hecha para la llave: el mismo toque no la repite) y el barrido la termina.
    if (!d.ok && d.enCamino) return { ok: false, enCamino: true, msg: partes ? { es: `Se devolvieron ${money(n - falta)} de ${money(n)}; ${money(q)} quedó en camino (Stripe no contestó) y se termina sola.`, en: `${money(n - falta)} of ${money(n)} refunded; ${money(q)} is on its way (Stripe did not answer) and finishes by itself.` } : d.msg };
    if (!d.ok) return { ok: false, msg: partes ? { es: `Se devolvieron ${money(n - falta)} de ${money(n)}; Stripe no pudo con el resto. Toca otra vez para seguir.`, en: `${money(n - falta)} of ${money(n)} refunded; Stripe could not do the rest. Tap again to continue.` } : d.msg };
    falta -= q; partes++;
  }
  return { ok: true, partes };
}

/* 9t2 · Lo mismo que devolverOperacion, pero SOLO el paso 1 y dentro de la transacción de quien llama (la que bloquea su caso): cada parte queda
   'pending' con su llave (`<idem>-p<cobro>`) y su auditoría, todas juntas o ninguna. Devuelve las devoluciones que falta mandar a la pasarela
   (las nuevas y las de esta llave que siguen en camino); quien llama las manda después con ejecutarDevolucionPago. Las partes ya hechas con esta
   llave cuentan (repetir no devuelve dos veces). */
export async function anotarDevolucionOperacion(c: PoolClient, x: { opId: string; centavos: number; kinds: string[]; por: "business" | "admin" | "policy"; actorId: string | null; motivo: string; idem: string },
  alGuardar?: AlGuardar<{ pago: string; centavos: number; parte: number }>): Promise<{ ok: true; ids: string[] } | { ok: false; msg: Msg }> {
  const P = (await c.query<{ id: string; resto: number }>(
    `select p.id::text, case when p.status in ('captured', 'partially_refunded')
                             then p.amount_cents - p.refunded_cents - coalesce((select sum(r.amount_cents) from refunds r where r.payment_id = p.id and r.status = 'pending'), 0)::int else 0 end as resto
       from payments p where p.operation_id = $1::bigint and p.kind = any($2::text[]) and p.status in ('captured', 'partially_refunded', 'refunded')
      order by 2 desc, p.id desc limit 200`, [x.opId, x.kinds])).rows;
  const llaves = P.map((p) => `${x.idem}-p${p.id}`);
  const hechas = (await c.query<{ id: string; k: string; n: number; pend: boolean }>(
    `select id::text, idem_key as k, amount_cents as n, status = 'pending' and manual_at is null as pend from refunds where idem_key = any($1::text[])`, [llaves])).rows;
  const ya = hechas.reduce((s, r) => s + r.n, 0), conLlave = new Set(hechas.map((r) => r.k)), ids = hechas.filter((r) => r.pend).map((r) => r.id);
  const n = Math.round(x.centavos);
  if (!(n > 0)) return { ok: false, msg: { es: "Escribe cuánto se devuelve.", en: "Write how much to refund." } };
  let falta = n - ya;
  if (falta <= 0) return { ok: true, ids };
  const libre = P.filter((p) => !conLlave.has(`${x.idem}-p${p.id}`)).reduce((s, p) => s + Math.max(0, p.resto), 0);
  if (falta > libre) return { ok: false, msg: { es: `Puedes devolver hasta ${money(libre + ya)}.`, en: `You can refund up to ${money(libre + ya)}.` } };
  let partes = hechas.length;
  for (const p of P) {
    if (falta <= 0) break;
    if (conLlave.has(`${x.idem}-p${p.id}`) || p.resto <= 0) continue;
    const q = Math.min(falta, p.resto), parte = ++partes;
    const a = await anotarDevolucionPago(c, { paymentId: p.id, centavos: q, por: x.por, actorId: x.actorId, motivo: x.motivo, idem: `${x.idem}-p${p.id}` },
      alGuardar ? (c2, h) => alGuardar(c2, { ...h, parte }) : undefined);
    if (!a.ok) return a;
    if (a.estado === "pending") ids.push(a.id);
    falta -= q;
  }
  return { ok: true, ids };
}

/* El pago de una operación, para mostrarlo (cliente, panel, admin). */
export type PagoVista = { id: string; estado: string; monto: number; devuelto: number; comision: number; marca: string | null; ultimos4: string | null; simulado: boolean };
export async function pagoDe(opId: string): Promise<PagoVista | null> {
  const r = (await db().query<PagoVista>(
    `select id::text, status as estado, amount_cents as monto, refunded_cents as devuelto, fee_cents as comision, card_brand as marca, card_last4 as ultimos4, simulated as simulado
       from payments where operation_id = $1::bigint and kind = 'full'`, [opId])).rows[0];
  return r ?? null;
}

/* Panel › Cobros (DASH-COBROS): la cuenta de cobro, lo de esta semana (lunes a domingo) y los últimos cobros con tarjeta. */
export type CobrosPanel = {
  modo: "stripe" | "simulador" | "apagado";
  cuenta: { estado: "none" | "pending" | "enabled" | "restricted"; banco: string | null; pide: string[]; pausado: boolean; motivo: string | null; simulado: boolean };
  semana: { n: number; cobrado: number; comision: number; devuelto: number; neto: number; martes: string };
  cobros: { num: string; quien: string; monto: number; comision: number; devuelto: number; estado: string; at: string; tarjeta: string | null; disputa: string | null }[];
  tasa: number;
  /* 6e · Los pagos de eventos por fecha (lib/evt-liquidacion.ts); los pone la página del panel. */
  eventos?: import("./evt-liquidacion").LiqPanel;
};
export async function cobrosPanel(negocio: string): Promise<CobrosPanel> {
  await repararPagos(negocio).catch(() => undefined);
  const [a, s, L, f] = await Promise.all([
    db().query<{ status: string; bank: string | null; req: string[]; paused: boolean; why: string | null; sim: boolean }>(
      `select status, bank_last4 as bank, requirements as req, payouts_paused as paused, paused_reason as why, simulated as sim from stripe_accounts where business_id = $1`, [negocio]),
    db().query<{ n: number; cobrado: number; comision: number; devuelto: number; martes: string }>(
      `with c as (select timezone as tz from cities where id = (select city_id from businesses where id = $1)),
            w as (select date_trunc('week', now() at time zone c.tz) as ini from c)
       select count(*)::int as n, coalesce(sum(p.amount_cents), 0)::int as cobrado, coalesce(sum(p.fee_cents::bigint * (p.amount_cents - p.refunded_cents) / p.amount_cents), 0)::int as comision,
              coalesce(sum(p.refunded_cents), 0)::int as devuelto, to_char((select ini from w) + interval '8 days', 'YYYY-MM-DD') as martes
         from payments p, c, w where p.business_id = $1 and p.status in ('captured', 'partially_refunded', 'refunded') and p.captured_at at time zone c.tz >= w.ini and p.transfer_group is null`, [negocio]),
    db().query<{ num: string; quien: string; monto: number; comision: number; devuelto: number; estado: string; at: string; brand: string | null; l4: string | null; disputa: string | null }>(
      `select o.number as num, coalesce(nullif(trim(coalesce(u.first_name, '') || ' ' || left(coalesce(u.last_name, ''), 1)), ''), '—') as quien, p.amount_cents as monto, p.fee_cents as comision,
              p.refunded_cents as devuelto, p.status as estado, to_char(p.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at, p.card_brand as brand, p.card_last4 as l4,
              (select d.status from disputes d where d.payment_id = p.id order by d.id desc limit 1) as disputa
         from payments p join operations o on o.id = p.operation_id join users u on u.id = p.user_id
        where p.business_id = $1 and p.transfer_group is null order by p.id desc limit 30`, [negocio]), // 6e: los boletos (cobro de la plataforma) van en PAGOS DE EVENTOS
    db().query<{ r: number }>(`select rate_bp as r from fee_rules where kind = 'ped' and effective_from <= now() order by effective_from desc, id desc limit 1`),
  ]);
  const x = a.rows[0], k = s.rows[0]!;
  const neto = k.cobrado - k.devuelto - k.comision;
  return {
    modo: pasarela.modo(),
    cuenta: x ? { estado: x.status as CobrosPanel["cuenta"]["estado"], banco: x.bank, pide: x.req ?? [], pausado: x.paused, motivo: x.why, simulado: x.sim } : { estado: "none", banco: null, pide: [], pausado: false, motivo: null, simulado: false },
    semana: { n: k.n, cobrado: k.cobrado, comision: k.comision, devuelto: k.devuelto, neto: Math.max(0, neto), martes: k.martes },
    cobros: L.rows.map((r) => ({ num: r.num, quien: r.quien, monto: r.monto, comision: r.comision, devuelto: r.devuelto, estado: r.estado, at: r.at, tarjeta: r.brand && r.l4 ? `${r.brand.toUpperCase()} ·· ${r.l4}` : null, disputa: r.disputa })),
    tasa: f.rows[0]?.r ?? 1000,
  };
}

/* Lee el estado real de la cuenta en Stripe y lo guarda (al volver de Stripe y desde el webhook). */
export async function actualizarCuenta(negocio: string) {
  const acct = (await db().query<{ a: string; on: boolean }>(`select stripe_account_id as a, charges_enabled as on from stripe_accounts where business_id = $1`, [negocio])).rows[0];
  if (!acct) return;
  const e = await pasarela.cuentaLeer(acct.a);
  if (!e) return;
  await db().query(`update stripe_accounts set charges_enabled = $2, payouts_enabled = $3, requirements = $4::jsonb, bank_last4 = coalesce($5, bank_last4),
                           status = case when $2 and $3 and jsonb_array_length($4::jsonb) = 0 then 'enabled' when $2 or jsonb_array_length($4::jsonb) > 0 then 'restricted' else 'pending' end, updated_at = now()
                     where business_id = $1`, [negocio, e.cargos, e.pagos, JSON.stringify(e.pide.slice(0, 20)), e.banco]);
}

/* Las tarjetas guardadas de una persona (solo las del modo que corre: simuladas en el sandbox, reales con Stripe). */
export async function misTarjetas(userId: string) {
  const sim = pasarela.modo() === "simulador";
  return (await db().query<{ pm: string; marca: string; ultimos4: string; vence: string; def: boolean }>(
    `select stripe_pm_id as pm, brand as marca, last4 as ultimos4, exp as vence, is_default as def from payment_methods where user_id = $1 and status = 'active' and simulated = $2 order by is_default desc, id desc limit 10`, [userId, sim])).rows;
}
