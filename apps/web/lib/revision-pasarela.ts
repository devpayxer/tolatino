import "server-only";
import type { Staff } from "./admin";
import { db, tx } from "./db";
import { HORAS_LLAVE_STRIPE as HORAS_LLAVE } from "./cobros";
import { pasarela } from "./pagos/pasarela";
import { SIN_RESPUESTA } from "./cobro-fuera";
import { elegibles, type T4 } from "./dinero-alertas";

/* 9t6 (21 nov, 0204) · Cerrar una alerta gateway_review: la consulta a la pasarela halló algo que no se cierra solo (varios objetos para una sola intención,
   uno con otro monto, o un cobro de Pro de un período que ya estaba cobrado con otro). Antes la intención quedaba en camino y bloqueaba al objeto para
   siempre. Ahora una persona del equipo de dinero (tx:aprobar, sus ciudades, con nota) elige cuál vale, o ninguno. El servidor NO confía en la pantalla:
   (1) vuelve a preguntar a la pasarela (consultar, anotada) y decide con ESA respuesta: el elegido tiene que estar entre lo hallado, hecho y con el monto de
       la intención; nada en curso; Stripe tiene que seguir diciendo lo que pide revisión (varios, otro monto, o Pro hecho con el período ya cobrado);
   (2) en UNA transacción, una vez por intención (gateway_reviews, la base lo impone): la decisión, la devolución de cada cobro que sobra (gateway_refunds,
       anotada ANTES de ir a la pasarela, con su llave), la auditoría (solo inserción) y la nota que cierra la alerta;
   (3) la intención se cierra por el MISMO cierre de su flujo (resolverCobroPro, resolverCobroFuera, resolverTransferencia, resolverRenovacion), que lee la
       decisión en veredicto(): «vale» → hecha con ese; «ninguno» → falla 'devuelto' sin contar como un «no» del banco (el objeto vuelve a poder cobrarse,
       con otra llave). Una transferencia solo se cierra con «vale» (la que sobra se revierte); una retención, lo que sobra se suelta (no movió dinero);
   (4) las devoluciones de lo que sobra se mandan con su llave (y su dato buscable, tl_intencion); «sin respuesta» no es «rechazado»: siguen en camino y el
       barrido las termina con la misma llave mientras Stripe la recuerda; pasado eso se le pregunta a la pasarela (buscarDevolucion). Un «no» de Stripe, o
       lo que no se cierra solo, alerta extra_refund_stuck al equipo. */
type Bi = { es: string; en: string };
export type { T4 };
type Res = { ok: true; msg: string } | { ok: false; msg: string };
const money = (c: number) => `$${(c / 100).toFixed(2)}`;
const REF = /^(subscription_charges|offsession_charges|event_settlements|hold_renewals|refunds|event_settlement_reversals|gateway_refunds|sponsorship_refunds):(\d{1,18})$/;
/* 9t7 · Lo que se elige puede ser una devolución (re_…) o una reversión (trr_…) cuando la intención devuelve dinero. */
const STRIPE_ID = /^(pi|tr|re|trr|pyr)_[A-Za-z0-9_]{3,200}$/;
/* 9t7 · Las intenciones que DEVUELVEN dinero (una devolución de un cobro, una reversión al organizador, la devolución de lo que sobró): con varias en Stripe
   solo se elige cuál vale; lo que salió de más no se deshace con otra devolución (queda en la auditoría). La base lo impone (gateway_reviews_devolucion_solo_vale). */
/* 9t8 · Y la devolución de lo no usado de un patrocinio (sponsorship_refunds). */
const DEVUELVE = (t: T4) => t === "refunds" || t === "event_settlement_reversals" || t === "gateway_refunds" || t === "sponsorship_refunds";

/* La intención detrás de la alerta, con lo que hace falta para decidir. Cuatro consultas fijas (nunca el nombre de la tabla en el texto). */
type Int = { t: T4; id: string; vivo: boolean; vieja: boolean; monto: number; ciudad: string | null; negocio: string | null; grupo?: string; plataforma: boolean; periodoCobrado: boolean;
  medio?: "refund" | "reversal"; objeto?: string };
async function intencionDe(t: T4, id: string): Promise<Int | null> {
  // 9t7 · Una devolución de un cobro, una reversión al organizador o la devolución de lo que sobró: viva si sigue en camino sin resolver a mano; vieja pasada
  // su llave (la que vale: key_from si volvió a valer).
  if (t === "refunds") {
    const r = (await db().query<{ vivo: boolean; vieja: boolean; monto: number; ciudad: string | null; negocio: string | null; pi: string }>(
      `select z.status = 'pending' and z.manual_at is null as vivo, coalesce(z.key_from, z.created_at) <= now() - make_interval(hours => $2::int) as vieja, z.amount_cents as monto,
              p.city_id as ciudad, p.business_id as negocio, p.stripe_payment_intent as pi from refunds z join payments p on p.id = z.payment_id where z.id = $1::bigint`, [id, HORAS_LLAVE])).rows[0];
    return r ? { t, id, vivo: r.vivo, vieja: r.vieja, monto: r.monto, ciudad: r.ciudad, negocio: r.negocio, plataforma: false, periodoCobrado: false, medio: "refund", objeto: r.pi } : null;
  }
  if (t === "event_settlement_reversals") {
    const r = (await db().query<{ vivo: boolean; vieja: boolean; monto: number; ciudad: string | null; negocio: string | null; tr: string }>(
      `select z.status = 'pending' and z.manual_at is null as vivo, coalesce(z.key_from, z.created_at) <= now() - make_interval(hours => $2::int) as vieja, z.amount_cents as monto,
              z.city_id as ciudad, z.business_id as negocio, s.transfer_id as tr from event_settlement_reversals z join event_settlements s on s.id = z.settlement_id where z.id = $1::bigint`, [id, HORAS_LLAVE])).rows[0];
    return r ? { t, id, vivo: r.vivo, vieja: r.vieja, monto: r.monto, ciudad: r.ciudad, negocio: r.negocio, plataforma: true, periodoCobrado: false, medio: "reversal", objeto: r.tr } : null;
  }
  if (t === "sponsorship_refunds") {
    const r = await (await import("./patrocinio")).leerPd(id);
    return r ? { t, id, vivo: r.st === "pending" && !r.mano, vieja: r.enviada && r.vieja, monto: r.amt, ciudad: r.city, negocio: r.biz, plataforma: true, periodoCobrado: false, medio: "refund", objeto: r.pi } : null;
  }
  if (t === "gateway_refunds") {
    const g = (await db().query<Dev>(`select ${SEL_DEV} from gateway_refunds where id = $1::bigint`, [id])).rows[0];
    return g ? { t, id, vivo: g.st === "pending" && !g.mano, vieja: g.enviada && g.vieja, monto: g.monto, ciudad: g.ciudad, negocio: g.biz, plataforma: g.plataforma, periodoCobrado: false, medio: g.medio, objeto: g.stripe } : null;
  }
  if (t === "subscription_charges") {
    const r = (await db().query<{ vivo: boolean; vieja: boolean; monto: number; ciudad: string | null; negocio: string; pc: boolean }>(
      `select z.status = 'pending' as vivo, z.created_at <= now() - make_interval(hours => $2::int) as vieja, z.amount_cents as monto, z.city_id as ciudad, z.business_id as negocio,
              exists (select 1 from subscription_charges y where y.business_id = z.business_id and y.period_start = z.period_start and y.status = 'done' and y.id <> z.id) as pc
         from subscription_charges z where z.id = $1::bigint`, [id, HORAS_LLAVE])).rows[0];
    return r ? { t, id, vivo: r.vivo, vieja: r.vieja, monto: r.monto, ciudad: r.ciudad, negocio: r.negocio, plataforma: true, periodoCobrado: r.pc } : null;
  }
  if (t === "offsession_charges") {
    const r = (await db().query<{ vivo: boolean; vieja: boolean; monto: number; ciudad: string | null; negocio: string; directo: boolean }>(
      `select z.status = 'pending' as vivo, z.created_at <= now() - make_interval(hours => $2::int) as vieja, z.amount_cents as monto, z.city_id as ciudad, z.business_id as negocio, z.destination is null as directo
         from offsession_charges z where z.id = $1::bigint`, [id, HORAS_LLAVE])).rows[0];
    return r ? { t, id, vivo: r.vivo, vieja: r.vieja, monto: r.monto, ciudad: r.ciudad, negocio: r.negocio, plataforma: r.directo, periodoCobrado: false } : null;
  }
  if (t === "event_settlements") {
    const r = (await db().query<{ vivo: boolean; vieja: boolean; monto: number; ciudad: string | null; negocio: string; eid: string }>(
      `select z.status = 'paying' as vivo, coalesce(z.key_from, z.paying_at) <= now() - make_interval(hours => $2::int) as vieja, z.net_cents as monto, z.city_id as ciudad, z.business_id as negocio, z.event_id::text as eid
         from event_settlements z where z.id = $1::bigint`, [id, HORAS_LLAVE])).rows[0];
    return r ? { t, id, vivo: r.vivo && r.monto > 0, vieja: r.vieja, monto: r.monto, ciudad: r.ciudad, negocio: r.negocio, grupo: `evt-${r.eid}`, plataforma: true, periodoCobrado: false } : null;
  }
  const { HORAS_VIVE } = await import("./renovar-retencion");
  const r = (await db().query<{ vivo: boolean; vieja: boolean; monto: number; ciudad: string | null; negocio: string }>(
    `select z.status = 'pending' as vivo, z.sent_at is not null and (z.sent_at <= now() - make_interval(hours => $2::int) or z.old_held_at <= now() - make_interval(hours => $3::int)) as vieja,
            z.amount_cents as monto, z.city_id as ciudad, z.business_id as negocio from hold_renewals z where z.id = $1::bigint`, [id, HORAS_LLAVE, HORAS_VIVE])).rows[0];
  return r ? { t, id, vivo: r.vivo, vieja: r.vieja, monto: r.monto, ciudad: r.ciudad, negocio: r.negocio, plataforma: false, periodoCobrado: false } : null;
}

/* «Elegir cuál vale» (Super Admin › Planes › Ingresos · alerta gateway_review). eleccion: el id de Stripe que vale, o «ninguno». */
export async function decidirRevision(s: Staff, alerta: string, eleccion: string, nota: string): Promise<Res> {
  const n = nota.trim().slice(0, 500);
  if (n.length < 4) return { ok: false, msg: "Escribe la nota (mínimo 4 letras)." };
  if (!/^\d{1,18}$/.test(alerta)) return { ok: false, msg: "Esa alerta no existe." };
  if (eleccion !== "ninguno" && !STRIPE_ID.test(eleccion)) return { ok: false, msg: "Elige cuál vale (o ninguno)." };
  const a = (await db().query<{ sujeto: string; city: string | null }>(
    `select a.subject_id as sujeto, a.city_id as city from money_alerts a where a.id = $2::bigint and a.kind = 'gateway_review' and (cardinality($1::text[]) = 0 or a.city_id = any($1::text[]))`, [s.cities, alerta])).rows[0];
  if (!a) return { ok: false, msg: "Esa alerta no existe (o no es de tus ciudades)." };
  const m = REF.exec(a.sujeto);
  if (!m) return { ok: false, msg: "Esta alerta no se decide aquí." };
  const t = m[1] as T4, id = m[2]!;
  const K = await import("./consulta-pasarela");
  if (await K.revisada(t, id)) return { ok: false, msg: "Ya lo decidió otra persona del equipo." };
  const x = await intencionDe(t, id);
  if (!x || !x.vivo) return { ok: false, msg: "Ya no está en camino: se cerró." };
  if (!x.vieja) return { ok: false, msg: "Todavía no pasa la ventana de la llave: se cierra sola." };
  // (1) La pasarela otra vez (fuera de cualquier transacción, anotada con quien la pidió): se decide con ESTO, no con la pantalla.
  const det: import("./consulta-pasarela").Detalle = { hallados: [], check: null };
  const resultado = await K.consultar({ tabla: t, id, monto: x.monto, ciudad: x.ciudad, negocio: x.negocio, grupo: x.grupo, medio: x.medio, objeto: x.objeto }, { origen: "equipo", staff: s.id }, det);
  if (resultado === "sin_respuesta") return { ok: false, msg: "Stripe no contestó la consulta: no se cambió nada. Prueba en un momento." };
  const E = elegibles(x, resultado, det.hallados);
  if (E.enCurso) return { ok: false, msg: "Stripe todavía tiene uno en curso: espera a que termine y vuelve a intentarlo." };
  if (!E.vale.length && !E.ninguno) return { ok: false, msg: `Stripe ahora dice que ${K.RESULTADO[resultado].es}: esto no se decide aquí (se cierra sola, o míralo en Stripe).` };
  if (eleccion === "ninguno" ? !E.ninguno : !E.vale.includes(eleccion)) {
    return { ok: false, msg: eleccion === "ninguno" ? "Aquí no se puede dejar sin ninguno." : !det.hallados.some((h) => h.id === eleccion) ? "Ese no está entre lo que Stripe tiene para esta intención." : "Ese no vale: no salió, o su monto no es el de la intención." };
  }
  const elegido = eleccion === "ninguno" ? null : eleccion;
  // Lo que sobra: lo hallado que salió y no es el elegido. De un cobro se devuelve; de una transferencia se revierte; de una retención se suelta.
  const sobra = det.hallados.filter((h) => h.estado === "hecho" && h.id !== elegido);
  // 9t7 · Una devolución (o reversión) de más no se devuelve con otra: se nombra en la auditoría y en el mensaje, y nada más.
  const medio: "refund" | "reversal" | null = t === "hold_renewals" || DEVUELVE(t) ? null : t === "event_settlements" ? "reversal" : "refund";
  const { auditar } = await import("./admin");
  // (2) Una vez, en una transacción: la intención sigue en camino (con su candado), la decisión, lo que se devuelve, la auditoría y la nota de la alerta.
  const d = await tx(async (c): Promise<{ msg: string } | { review: string; devs: { id: string; stripe: string; centavos: number }[] }> => {
    const vivo = t === "subscription_charges" ? (await c.query(`select 1 from subscription_charges where id = $1::bigint and status = 'pending' for update`, [id])).rowCount
      : t === "offsession_charges" ? (await c.query(`select 1 from offsession_charges where id = $1::bigint and status = 'pending' for update`, [id])).rowCount
      : t === "event_settlements" ? (await c.query(`select 1 from event_settlements where id = $1::bigint and status = 'paying' for update`, [id])).rowCount
      : t === "refunds" ? (await c.query(`select 1 from refunds where id = $1::bigint and status = 'pending' and manual_at is null for update`, [id])).rowCount
      : t === "event_settlement_reversals" ? (await c.query(`select 1 from event_settlement_reversals where id = $1::bigint and status = 'pending' and manual_at is null for update`, [id])).rowCount
      : t === "gateway_refunds" ? (await c.query(`select 1 from gateway_refunds where id = $1::bigint and status = 'pending' and manual_at is null for update`, [id])).rowCount
      : t === "sponsorship_refunds" ? (await c.query(`select 1 from sponsorship_refunds where id = $1::bigint and status = 'pending' and manual_at is null for update`, [id])).rowCount
      : (await c.query(`select 1 from hold_renewals where id = $1::bigint and status = 'pending' for update`, [id])).rowCount;
    // (Si la cerró la decisión de otra persona que llegó primero, se dice eso.)
    if (!vivo) return { msg: (await c.query(`select 1 from gateway_reviews where subject_kind = $1 and subject_id = $2::bigint`, [t, id])).rowCount ? "Ya lo decidió otra persona del equipo." : "Ya no está en camino: se cerró." };
    const rv = (await c.query<{ id: string }>(
      `insert into gateway_reviews (subject_kind, subject_id, alert_id, check_id, decision, stripe_id, amount_cents, staff_id, note, city_id)
       values ($1, $2::bigint, $3::bigint, $4::bigint, $5, $6, $7, $8::uuid, $9, (select id from cities where id = $10::text))
       on conflict (subject_kind, subject_id) do nothing returning id::text`,
      [t, id, alerta, det.check, elegido ? "vale" : "ninguno", elegido, x.monto, s.id, n, x.ciudad])).rows[0];
    if (!rv) return { msg: "Ya lo decidió otra persona del equipo." };
    const devs: { id: string; stripe: string; centavos: number }[] = [];
    if (medio) for (const h of sobra) {
      const g = (await c.query<{ id: string }>(
        `insert into gateway_refunds (review_id, subject_kind, subject_id, medio, plataforma, stripe_id, amount_cents, idem_key, business_id, city_id)
         values ($1::bigint, $2, $3::bigint, $4, $5, $6, $7, $8, (select id from businesses where id = $9::text), (select id from cities where id = $10::text))
         on conflict (stripe_id) where status in ('pending', 'done') do nothing returning id::text`,
        [rv.id, t, id, medio, x.plataforma, h.id, h.centavos, `gwr-${rv.id}-${h.id}`.slice(0, 200), x.negocio, x.ciudad])).rows[0];
      if (g) devs.push({ id: g.id, stripe: h.id, centavos: h.centavos });
    }
    await auditar(c, { actor: s.id, action: "dinero.alerta.decidir", targetKind: "money_alert", targetId: alerta, city: a.city, reason: n,
      after: { intencion: a.sujeto, decision: elegido ? `vale ${elegido}` : "ninguno vale", stripe_dijo: resultado, hallados: det.hallados.map((h) => `${h.id} ${money(h.centavos)} ${h.estado}`),
        [DEVUELVE(t) ? "salio_de_mas" : medio === "reversal" ? "revertir" : medio === "refund" ? "devolver" : "soltar"]: sobra.map((h) => `${h.id} ${money(h.centavos)}`), consulta: det.check } });
    await (await import("./dinero-alertas")).notaEnTx(c, alerta, s.id, n);
    return { review: rv.id, devs };
  });
  if (!("review" in d)) return { ok: false, msg: d.msg };
  // (3) La intención, por el cierre de su flujo (lee la decisión). (4) Lo que sobra: a la pasarela con su llave; una retención que sobra se suelta.
  const o: import("./consulta-pasarela").Origen = { origen: "equipo", staff: s.id };
  const q = t === "subscription_charges" ? (await (await import("./suscripcion")).resolverCobroPro(id, o)).quedo
    : t === "offsession_charges" ? (await (await import("./cobro-fuera")).resolverCobroFuera(id, o)).quedo
    : t === "event_settlements" ? (await (await import("./evt-liquidacion")).resolverTransferencia(id, o)).quedo
    : t === "refunds" ? (await (await import("./devolucion-consulta")).resolverDevolucion(id, o)).quedo
    : t === "event_settlement_reversals" ? (await (await import("./evt-liquidacion")).resolverReversion(id, o)).quedo
    : t === "gateway_refunds" ? ((await resolverDevolucionSobra(id, o)).st === "done" ? "hecha" : "sigue")
    : t === "sponsorship_refunds" ? (await (await import("./patrocinio")).resolverDevolucionPat(id, o)).quedo
    : (await (await import("./renovar-retencion")).resolverRenovacion(id, o)).quedo;
  if (DEVUELVE(t)) return { ok: true, msg: `Decidido: vale ${elegido}; ${QUEDO_DEV[q] ?? q}.${sobra.length ? ` Salió de más en Stripe: ${sobra.map((h) => `${h.id} ${money(h.centavos)}`).join(", ")} (no se deshace desde aquí; míralo con la persona).` : ""} Quedó en la auditoría.` };
  if (!medio) for (const h of sobra) await pasarela.liberar(h.id).catch(() => undefined);
  let salio = 0, camino = 0, no = 0;
  for (const g of d.devs) { const r = await ejecutarDevolucionSobra(g.id); if (r === "done") salio++; else if (r === "pending") camino++; else no++; }
  const QUEDO: Record<string, string> = { hecha: "la intención quedó hecha con ese", devuelto: "la intención quedó fallida (no cuenta como un rechazo del banco) y se puede volver a cobrar", fallida: "la intención quedó fallida",
    reabierta: "la transferencia vuelve a su flujo", sigue: "la intención sigue en camino: el barrido la cierra con la decisión", ya_no_estaba: "la intención ya se había cerrado", no_llego: "la intención quedó fallida" };
  const verbo = medio === "reversal" ? "revierte" : medio === "refund" ? "devuelve" : "suelta";
  const partes = [`Decidido: ${elegido ? `vale ${elegido}` : "ninguno vale"}; ${QUEDO[q] ?? q}.`];
  if (sobra.length) partes.push(medio ? `Se ${verbo}${sobra.length === 1 ? "" : "n"} ${sobra.length} (${money(sobra.reduce((s2, h) => s2 + h.centavos, 0))}): ${salio} hecha${salio === 1 ? "" : "s"}${camino ? `, ${camino} en camino (Stripe no contestó: se termina sola)` : ""}${no ? `, ${no} que Stripe rechazó (alerta aparte)` : ""}.` : `Se soltó ${sobra.length === 1 ? "la retención que sobra" : `${sobra.length} retenciones que sobran`}.`);
  partes.push("Quedó en la auditoría.");
  return { ok: true, msg: partes.join(" ") };
}

const QUEDO_DEV: Record<string, string> = { hecha: "quedó hecha con esa, una vez", sigue: "sigue en camino: el barrido la cierra con la decisión", ya_no_estaba: "ya se había cerrado", reabierta: "sigue en camino" };

/* ── La devolución de lo que sobró (gateway_refunds) ── */
type Dev = { id: string; st: string; mano: boolean; medio: "refund" | "reversal"; plataforma: boolean; stripe: string; monto: number; idem: string; enviada: boolean; vieja: boolean; n: number; err: string | null; biz: string | null; ciudad: string | null; review: string };
const SEL_DEV = `id::text, status as st, manual_at is not null as mano, medio, plataforma, stripe_id as stripe, amount_cents as monto, idem_key as idem, sent_at is not null as enviada,
                 coalesce(sent_at, created_at) <= now() - make_interval(hours => ${HORAS_LLAVE}) as vieja, attempts as n, last_error as err, business_id as biz, city_id as ciudad, review_id::text as review`;
/* A la pasarela con su llave (solo mientras Stripe la recuerda); el «sí» se cierra una vez; sin respuesta sigue en camino; un «no», fallida y alerta.
   9t7 · Una resuelta a mano (el dinero se devolvió fuera de Stripe) nunca se vuelve a mandar ni a preguntar. */
export async function ejecutarDevolucionSobra(id: string): Promise<"done" | "pending" | "failed"> {
  const g = (await db().query<Dev>(`select ${SEL_DEV} from gateway_refunds where id = $1::bigint`, [id])).rows[0];
  if (!g || g.st !== "pending") return (g?.st as "done" | "failed" | undefined) ?? "failed";
  if (g.mano) return "pending";
  if (g.enviada && g.vieja) return (await resolverDevolucionSobra(id, { origen: "barrido" })).st;
  const m = (await db().query<{ gref: string | null }>(`update gateway_refunds set gateway_ref = case when sent_at is null then 'gateway_refunds:' || id else gateway_ref end, sent_at = coalesce(sent_at, now()) where id = $1::bigint and status = 'pending' and manual_at is null returning gateway_ref as gref`, [id])).rows[0];
  if (!m) return "pending";
  const meta = { review: g.review, ...(m.gref ? { tl_intencion: m.gref } : {}) };
  const r = await (g.medio === "refund" ? pasarela.devolver(g.stripe, g.monto, g.idem, { plataforma: g.plataforma, meta }) : pasarela.revertirTransferencia(g.stripe, g.monto, g.idem, meta))
    .catch(() => ({ ok: false as const, id: undefined, codigo: "error" }));
  if (r.ok && r.id) return cerrarDevolucion(g, r.id, false);
  const codigo = String(r.codigo ?? "error").slice(0, 60);
  if (SIN_RESPUESTA.has(codigo)) {
    await db().query(`update gateway_refunds set attempts = least(10000, attempts + 1), last_error = left($2, 120) where id = $1::bigint and status = 'pending'`, [id, codigo]);
    return "pending";
  }
  await db().query(`update gateway_refunds set attempts = least(10000, attempts + 1), last_error = left($2, 120) where id = $1::bigint and status = 'pending'`, [id, codigo]);
  return fallar(g, codigo, false);
}
async function cerrarDevolucion(g: Dev, stripeRefund: string, porConsulta: boolean): Promise<"done"> {
  await tx(async (c) => {
    const u = await c.query(`update gateway_refunds set status = 'done', stripe_refund_id = $2, last_error = null where id = $1::bigint and status = 'pending' and manual_at is null`, [g.id, stripeRefund]);
    if (u.rowCount && porConsulta) await (await import("./consulta-pasarela")).auditarCierre(c, "gateway_refunds", g.id, g.ciudad, { estado: "hecha", devolucion: stripeRefund, de: g.stripe });
  });
  await (await import("./consulta-pasarela")).cerrarAlertaSola("extra_refund_stuck", g.id, { es: `Cerrada sola: Stripe hizo la devolución (${stripeRefund}).`, en: `Closed by itself: Stripe made the refund (${stripeRefund}).` });
  return "done";
}
async function fallar(g: Dev, codigo: string, porConsulta: boolean): Promise<"failed"> {
  const u = await tx(async (c) => {
    const x = await c.query(`update gateway_refunds set status = 'failed', last_error = left($2, 120) where id = $1::bigint and status = 'pending' and manual_at is null`, [g.id, codigo]);
    if (x.rowCount && porConsulta) await (await import("./consulta-pasarela")).auditarCierre(c, "gateway_refunds", g.id, g.ciudad, { estado: "fallida", de: g.stripe });
    return !!x.rowCount;
  });
  if (u) await alertaDev(g, { es: `Stripe dijo que no (${codigo}): no se ${g.medio === "reversal" ? "revirtió" : "devolvió"}. Hazlo desde Stripe (o por fuera) y resuélvela a mano con la nota (antes de marcarla, el servidor vuelve a preguntar).`,
    en: `Stripe said no (${codigo}): it was not ${g.medio === "reversal" ? "reversed" : "refunded"}. Do it from Stripe (or outside it) and resolve it manually with the note (the server asks again before marking it).` });
  return "failed";
}
async function alertaDev(g: Dev, porque: Bi) {
  await (await import("./dinero-alertas")).alertar("extra_refund_stuck", g.id, { monto: g.monto, negocio: g.biz, ciudad: g.ciudad, detalle: {
    es: `${g.medio === "reversal" ? "Revertir" : "Devolver"} ${money(g.monto)} que Stripe hizo de más (${g.stripe}, decidido en la revisión ${g.review}): ${porque.es}`,
    en: `${g.medio === "reversal" ? "Reverse" : "Refund"} ${money(g.monto)} that Stripe made in excess (${g.stripe}, decided in review ${g.review}): ${porque.en}` } }).catch(() => undefined);
}
/* Pasada la llave: se le pregunta a la pasarela (entre las devoluciones de ese cobro, o las reversiones de esa transferencia, por su dato) y se cierra con eso.
   Nunca llegó (con el dato y pasado el margen) → esta queda fallida «nunca llegó» y sale otra con otra llave, en la misma transacción (lo decidido sigue). */
export async function resolverDevolucionSobra(id: string, o: import("./consulta-pasarela").Origen): Promise<{ resultado: import("./consulta-pasarela").Resultado | null; st: "done" | "pending" | "failed" }> {
  const K = await import("./consulta-pasarela");
  const g = (await db().query<Dev>(`select ${SEL_DEV} from gateway_refunds where id = $1::bigint`, [id])).rows[0];
  if (!g || g.st !== "pending" || g.mano || !g.enviada || !g.vieja) return { resultado: null, st: (g?.st as "done" | "pending" | "failed" | undefined) ?? "failed" };
  if (o.origen === "barrido" && !(await K.tocaConsultar("gateway_refunds", id))) return { resultado: null, st: "pending" };
  // 9t7 · Ya decidida por el equipo (varias en Stripe: cuál vale): no se vuelve a preguntar; se cierra con la decisión.
  const resultado = (await K.revisada("gateway_refunds", id)) ? (await K.veredicto("gateway_refunds", id))!.resultado
    : await K.consultar({ tabla: "gateway_refunds", id, monto: g.monto, ciudad: g.ciudad, negocio: g.biz, medio: g.medio, objeto: g.stripe }, o);
  const v = await K.veredicto("gateway_refunds", id);
  if (v?.resultado === "hecho" && v.stripe) return { resultado, st: await cerrarDevolucion(g, v.stripe, true) };
  if (v?.resultado === "fallido") return { resultado, st: await fallar(g, "consulta_fallido", true) };
  if (v?.noLlego) {
    const nueva = await tx(async (c) => {
      const u = await c.query(`update gateway_refunds set status = 'failed', last_error = 'nunca_llego' where id = $1::bigint and status = 'pending' and manual_at is null`, [id]);
      if (!u.rowCount) return null;
      await K.auditarCierre(c, "gateway_refunds", id, g.ciudad, { estado: "nunca llegó a Stripe: sale otra con otra llave", de: g.stripe });
      const k = Number((await c.query<{ n: number }>(`select count(*)::int as n from gateway_refunds where review_id = $1::bigint and stripe_id = $2`, [g.review, g.stripe])).rows[0]!.n);
      return (await c.query<{ id: string }>(
        `insert into gateway_refunds (review_id, subject_kind, subject_id, medio, plataforma, stripe_id, amount_cents, idem_key, business_id, city_id)
         select review_id, subject_kind, subject_id, medio, plataforma, stripe_id, amount_cents, left(regexp_replace(idem_key, '-r[0-9]+$', ''), 190) || '-r' || $2::text, business_id, city_id
           from gateway_refunds where id = $1::bigint returning id::text`, [id, k])).rows[0]!.id;
    });
    await K.cerrarAlertaSola("extra_refund_stuck", id, { es: "Cerrada sola: nunca llegó a Stripe; salió otra con otra llave.", en: "Closed by itself: it never reached Stripe; another one went out with another key." });
    return { resultado, st: nueva ? await ejecutarDevolucionSobra(nueva) : "pending" };
  }
  await alertaDev(g, { es: `Stripe no contestó (${g.n} intentos, ${g.err ?? "sin motivo"}) y la consulta dijo que ${K.RESULTADO[resultado].es}: no se pide otra vez con la misma llave; se sigue preguntando.`,
    en: `Stripe did not answer (${g.n} attempts, ${g.err ?? "no reason"}) and the query said ${K.RESULTADO[resultado].en}: it is not requested again with the same key; it keeps being asked.` });
  return { resultado, st: "pending" };
}
/* El barrido: las de lo que sobró en camino, con su llave dentro de HORAS_LLAVE; las más viejas, preguntando (una vez cada CADA_MIN). */
export async function barrerDevolucionesSobra(): Promise<number> {
  // Las que todavía se mandan con su llave primero; las viejas (que solo se preguntan) después: unas no tapan a las otras.
  const L = (await db().query<{ id: string }>(
    `select id::text from gateway_refunds where status = 'pending' and manual_at is null and created_at < now() - interval '2 minutes'
      order by (sent_at is not null and sent_at <= now() - make_interval(hours => $1::int)), created_at limit 50`, [HORAS_LLAVE])).rows;
  let n = 0;
  // 9t9 · Cada devolución por su cuenta (lib/barrido-uno.ts): antes el error de una se tragaba sin rastro; ahora queda en el registro y la tarea sale fallida.
  await (await import("./barrido-uno")).cadaUno("devolucionesSobra", L, (g) => `devolucion ${g.id}`, async (g) => { if ((await ejecutarDevolucionSobra(g.id)) === "done") n++; });
  return n;
}
/* 9t7 · Para «Resolver a mano» (lib/devolucion-consulta.ts › antesDeAMano): la devolución de lo que sobró que sigue sin resolver (en camino o rechazada por
   Stripe; nunca una hecha), lo que se le pregunta a la pasarela y su cierre si Stripe dice que salió (el mismo cierre, una vez, solo si sigue en camino). */
export async function sobraParaConsulta(id: string): Promise<{ st: string; monto: number; ciudad: string | null; biz: string | null; medio: "refund" | "reversal"; stripe: string } | null> {
  const g = (await db().query<Dev>(`select ${SEL_DEV} from gateway_refunds where id = $1::bigint`, [id])).rows[0];
  return g && g.st !== "done" && !g.mano ? { st: g.st, monto: g.monto, ciudad: g.ciudad, biz: g.biz, medio: g.medio, stripe: g.stripe } : null;
}
export async function cerrarSobraPorConsulta(id: string, stripeRefund: string): Promise<boolean> {
  const g = (await db().query<Dev>(`select ${SEL_DEV} from gateway_refunds where id = $1::bigint`, [id])).rows[0];
  if (!g || g.st !== "pending" || g.mano) return false;
  await cerrarDevolucion(g, stripeRefund, true);
  return (await db().query(`select 1 from gateway_refunds where id = $1::bigint and status = 'done'`, [id])).rowCount === 1;
}
