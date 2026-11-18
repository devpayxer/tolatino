import "server-only";
import type { PoolClient } from "pg";
import { valores } from "./config";
import { db, tx } from "./db";
import { pasarela, type Verificar } from "./pagos/pasarela";
import { COLUMNAS, CTE, DESDE, FOTO, condiciones, conFoto, type Regla, type Resultado } from "./categoria";
import type { Punto } from "./punto";
import type { Tarjeta } from "./tarjeta";

/* C-002 · Patrocinados (canvas tolatino-master+, entrega/cambios.md C-002; migración 0173). Una sola caja para comprar un patrocinio, que usan
   los negocios (aquí) y los eventos (lib/patrocinio-evento.ts, C-003):
   - El servidor decide TODO: el precio sale de Configuración (patrocinio_*_cents), las fechas de la zona horaria de la ciudad, los puestos de la base
     (patrocinio_reglas los vuelve a revisar con candado al insertar). La pantalla manda qué duración, desde cuándo, qué tarjeta y una clave por
     intento; nunca un monto (guardián patrocinioDelServidor).
   - Un cobro por clave: la llave del cobro (idem) es negocio + clave del intento. Repetir el mismo «Pagar» devuelve lo mismo y no cobra dos veces;
     si la base cayó después de cobrar, el siguiente intento con la misma clave encuentra el cobro hecho y lo anota.
   - El cobro va dentro de la transacción que tiene el candado de la categoría y la ciudad: nadie más toma ese puesto mientras se cobra.
   - Lo pagado queda en sponsorship_payments (solo inserción), con la tarjeta y el PaymentIntent; la conciliación diaria lo compara con Stripe.
   - 3-D Secure al comprar (en sesión): se retiene en la plataforma con la verificación a nombre de quien paga; la pantalla abre la hoja del banco
     (useVerificacion, como «Volver a Pro») y vuelve a mandar lo MISMO con la MISMA clave: la pasarela encuentra lo verificado y se captura después de
     guardar el patrocinio (nunca se cobra dos veces; lo que nadie confirma lo suelta el barrido de verificaciones). La renovación sola (fuera de
     sesión) cobra directo: si el banco pide confirmar, termina y avisa con el enlace al panel para comprar otro (y confirmarlo ahí).
   - Devolver lo que no se usó (0175): al terminar, la base decide cuánto (patrocinio_devolucion) y lo escribe una vez en el patrocinio; después
     va a la pasarela (pasarela.devolver, una llave por patrocinio) y deja UNA fila 'devolucion' en el libro. Si la pasarela no responde, el barrido
     la reintenta (devolverPendientes). La conciliación lee las devoluciones del libro.
   - En las apps de las tiendas no se compra (como Pro): la compra es en la web (compraDigitalAqui, en las acciones). */

export type Bi = { es: string; en: string };
export type Dur = "week" | "month" | "until_event";
export type ResPat = { ok: true; id?: string; estado?: "activo" | "reservado"; msg?: Bi; devuelto?: number } | { ok: false; msg: Bi; sinPuestos?: boolean; verificar?: Verificar };
const no = (es: string, en: string): ResPat => ({ ok: false, msg: { es, en } });
export const money = (c: number) => `$${(c / 100).toFixed(2)}`;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
export const CLAVE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/* ── Lo común (negocios y eventos) ── */

/* Las fechas de un período en la zona de la ciudad: hoy = desde ahora; otra fecha = desde la medianoche de ese día. Termina a la medianoche del día
   que cumple (7 días o 1 mes). «hasta el evento» lo arma lib/patrocinio-evento.ts. */
export async function fechasPeriodo(c: PoolClient | null, ciudad: string, desde: "hoy" | string, dur: "week" | "month"): Promise<{ a: string; b: string; tz: string; dia: string } | null> {
  const q = (c ?? db()).query.bind(c ?? db()) as PoolClient["query"];
  const r = (await q<{ a: string; b: string; tz: string; dia: string; hoy: string }>(
    `with z as (select timezone as tz, (now() at time zone timezone)::date as hoy from cities where id = $1),
          d as (select tz, hoy, case when $2::text = 'hoy' then hoy else $2::date end as dia from z)
     select to_char((case when $2::text = 'hoy' then now() else (dia::timestamp at time zone tz) end) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as a,
            to_char((((dia + case when $3 = 'week' then interval '7 days' else interval '1 month' end)::date)::timestamp at time zone tz) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as b,
            tz, dia::text as dia, hoy::text as hoy from d`, [ciudad, desde === "hoy" ? "hoy" : desde, dur])).rows[0];
  return r ?? null;
}

/* La tarjeta guardada de quien paga (solo las suyas, vivas). */
export async function tarjetaDe(userId: string, pm: string) {
  return (await db().query<{ pm: string; marca: string; l4: string }>(
    `select stripe_pm_id as pm, brand as marca, last4 as l4 from payment_methods where user_id = $1 and stripe_pm_id = $2 and status = 'active'`, [userId, pm])).rows[0] ?? null;
}

export type Cobro = { kind: "negocio" | "evento"; negocio: string; ciudad: string; payer: string; pm: string; centavos: number; idem: string; razon: "compra" | "renovacion"; meta: Record<string, string>; enSesion?: boolean };
export type Cobrado = { ok: true; pi: string; marca: string | null; l4: string | null; retenido: boolean } | { ok: false; msg: Bi; verificar?: Verificar };
/* El cobro de un período (dentro de la transacción del candado). En sesión (comprar o «Renovar otra semana» desde el panel): se RETIENE en la
   plataforma con la verificación a nombre de quien paga; si el banco pide 3-D Secure, vuelve `verificar` (la hoja) y no se guarda nada; con lo
   retenido, quien llama guarda el patrocinio y lo captura (capturarCobro) antes de soltar el candado. Fuera de sesión (la renovación sola del
   barrido): cobro directo; si el banco pide verificar, se suelta ese intento y el patrocinio termina con su motivo (el aviso lleva al panel). */
export async function cobrar(x: Cobro): Promise<Cobrado> {
  const t = (await db().query<{ marca: string; l4: string }>(`select brand as marca, last4 as l4 from payment_methods where stripe_pm_id = $1`, [x.pm])).rows[0];
  const cliente = await pasarela.cliente(x.payer).catch(() => null);
  const meta = { ...x.meta, kind: `patrocinio_${x.kind}` };
  if (x.enSesion) {
    const r = await pasarela.retenerPlataforma({ centavos: x.centavos, pm: x.pm, cliente, idem: x.idem, grupo: `patrocinio-${x.kind}`, meta, usuario: { id: x.payer, negocio: x.negocio, ciudad: x.ciudad } });
    if (!r.ok) return { ok: false, msg: r.mensaje };
    if (r.estado === "accion") {
      const b = await (await import("./pagos/verificacion")).bancoPide(r);
      return { ok: false, msg: b.msg, ...(b.verificar ? { verificar: b.verificar } : {}) };
    }
    return { ok: true, pi: r.pi, marca: t?.marca ?? r.marca, l4: t?.l4 ?? r.ultimos4, retenido: true };
  }
  const r = await pasarela.cobrarDirecto({ centavos: x.centavos, pm: x.pm, cliente, idem: x.idem, meta });
  if (!r.ok) {
    if (r.codigo === "authentication_required" && r.pi) {
      await pasarela.liberar(r.pi).catch(() => undefined);
      return { ok: false, msg: { es: "Tu banco pide confirmar cada cobro: compra otro desde tu panel y confírmalo ahí.", en: "Your bank asks to confirm each charge: buy another from your dashboard and confirm it there." } };
    }
    return { ok: false, msg: r.mensaje };
  }
  return { ok: true, pi: r.id, marca: t?.marca ?? null, l4: t?.l4 ?? null, retenido: false };
}
/* Capturar lo retenido de una compra en sesión, ya guardado el patrocinio (en la misma transacción): si no se puede, la transacción se deshace
   (SinCaptura) y lo retenido se suelta: nada queda guardado sin cobrar ni cobrado sin guardar. */
export class SinCaptura extends Error { constructor(public pi: string) { super("patrocinio_captura"); } }
export async function capturarCobro(p: Extract<Cobrado, { ok: true }>, centavos: number) {
  if (!p.retenido) return;
  const r = await pasarela.capturarPlataforma(p.pi, centavos);
  if (!r.ok) throw new SinCaptura(p.pi);
}
/* Si la transacción se deshizo con algo retenido (no se pudo capturar, o la base dijo que ya no cabe), lo retenido se suelta: no se cobra nada. */
export async function soltarRetenido(pi: string | null, e: unknown): Promise<ResPat | null> {
  if (pi) await pasarela.liberar(pi).catch(() => undefined);
  if (!(e instanceof SinCaptura)) return null;
  return { ok: false, msg: { es: "Tu banco no aceptó el cobro. No se cobró nada: prueba otra vez o con otra tarjeta.", en: "Your bank did not accept the charge. Nothing was charged: try again or use another card." } };
}

/* El libro: un cobro, una fila (la llave idem no se repite). */
export async function anotarPago(c: PoolClient, x: Cobro & { ref: string; pi: string; marca: string | null; l4: string | null }) {
  await c.query(
    `insert into sponsorship_payments (kind, ref_id, business_id, city_id, payer_user_id, amount_cents, pi, idem_key, card_brand, card_last4, reason)
     values ($1, $2::bigint, $3, $4, $5, $6, $7, $8, $9, $10, $11) on conflict (idem_key) do nothing`,
    [x.kind, x.ref, x.negocio, x.ciudad, x.payer, x.centavos, x.pi, x.idem, x.marca, x.l4, x.razon]);
}
export async function auditarNegocio(c: PoolClient | null, actor: string, negocio: string, ciudad: string, action: string, after: unknown, reason: string | null = null, kind: "user" | "staff" = "user") {
  await (c ?? db()).query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, before, after, reason) values ($1, $2, $3, 'business', $4, $5, null, $6::jsonb, $7)`,
    [kind, actor, action, negocio, ciudad, JSON.stringify(after ?? null), reason]);
}
/* Lo que la base dice cuando no cabe (otro negocio tomó el último puesto mientras pagabas, o ya tienes uno en esas fechas). */
export function errorDePuestos(e: unknown): ResPat | null {
  const m = String((e as Error)?.message ?? "");
  if (m.includes("patrocinio_sin_puestos")) return { ok: false, sinPuestos: true, msg: { es: "Ya no quedan puestos en esas fechas. No se cobró nada.", en: "There are no slots left on those dates. Nothing was charged." } };
  if (m.includes("patrocinio_cruza")) return { ok: false, msg: { es: "Ya tienes un patrocinio en esas fechas.", en: "You already have a sponsorship on those dates." } };
  return null;
}

/* ── Devolver lo que no se usó (0175) ── */
/* Lo que se devuelve lo decide la base al terminar (patrocinio_devolucion), en el MISMO update que termina el patrocinio, y queda escrito una vez
   (refund_cents; el trigger no deja cambiarlo). `modo` y `motivo` son expresiones SQL fijas del código (nunca de la pantalla): 'todo' (una reserva
   que no empezó), 'sin_usar' (los días enteros que faltaban), 'pausa' (lo que estuvo en pausa y no se pudo devolver alargando) o 'nada'. */
export type ModoDev = "'todo'" | "'sin_usar'" | "'pausa'" | "'nada'" | `case ${string} end`;
export const DEVOLUCION = (modo: ModoDev, motivo: string, pausa: boolean, t = "") =>
  `(refund_cents, refund_days, refund_motive) = (select nullif(d.cents, 0), case when d.cents > 0 then d.dias end, case when d.cents > 0 then ${motivo} end
     from patrocinio_devolucion(${modo}, ${t}price_cents, ${t}starts_at, ${t}ends_at, ${pausa ? `${t}extended_secs, ${t}paused_secs, ${t}paused_at` : "0, 0, null"}, now()) d)`;

/* La devolución en la pasarela de lo que el patrocinio decidió al terminar: una por patrocinio (la llave de Stripe y el índice único del libro),
   nunca más que lo cobrado (y la base lo vuelve a revisar al insertar). Deja UNA fila 'devolucion' en el libro (solo inserción), la auditoría y
   el aviso. Si la pasarela no responde, devuelve 0 y el barrido la reintenta con la misma llave (devolverPendientes). */
export async function devolverPatrocinio(kind: "negocio" | "evento", id: string): Promise<number> {
  if (!/^\d{1,18}$/.test(String(id))) return 0;
  const T = kind === "negocio" ? "sponsorships" : "event_sponsorships", ev = kind === "evento";
  const s = (await db().query<{ cents: number; dias: number; motivo: string; negocio: string; ciudad: string; evento: string | null; total: number; pago: string; pi: string; marca: string | null; l4: string | null; payer: string; cobrado: number; ya: boolean }>(
    `select s.refund_cents as cents, s.refund_days as dias, s.refund_motive as motivo, s.business_id as negocio, s.city_id as ciudad, ${ev ? "s.event_id::text" : "null::text"} as evento,
            greatest(1, ceil((extract(epoch from s.ends_at - s.starts_at) - ${ev ? "s.extended_secs" : "0"}) / 86400.0 - 1 / 24.0))::int as total,
            p.id::text as pago, p.pi, p.card_brand as marca, p.card_last4 as l4, p.payer_user_id::text as payer, p.amount_cents as cobrado,
            exists (select 1 from sponsorship_payments r where r.kind = $1 and r.ref_id = s.id and r.reason = 'devolucion') as ya
       from ${T} s join sponsorship_payments p on p.kind = $1 and p.ref_id = s.id and p.reason <> 'devolucion'
      where s.id = $2::bigint and s.refund_cents is not null`, [kind, id])).rows[0];
  if (!s || s.ya) return 0;
  const cents = Math.min(s.cents, s.cobrado), idem = `pat-dev-${kind}-${id}`;
  const r = await pasarela.devolver(s.pi, cents, idem, { plataforma: true });
  if (!r.ok || !r.id) { console.error("[patrocinio] devolver", kind, id, r.codigo ?? "sin id"); return 0; }
  const nuevo = await tx(async (c) => {
    const n = await c.query(
      `insert into sponsorship_payments (kind, ref_id, business_id, city_id, payer_user_id, amount_cents, pi, idem_key, card_brand, card_last4, reason, refund_id, refund_of, refund_days, refund_motive)
       values ($1, $2::bigint, $3, $4, $5::uuid, $6, $7, $8, $9, $10, 'devolucion', $11, $12::bigint, $13, $14) on conflict do nothing`,
      [kind, id, s.negocio, s.ciudad, s.payer, cents, s.pi, idem, s.marca, s.l4, r.id, s.pago, s.dias, s.motivo]);
    if (!n.rowCount) return false;
    await c.query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, before, after, reason) values ('system', null, $1, $2, $3, $4, null, $5::jsonb, null)`,
      [ev ? "patrocinio_evento.devolver" : "patrocinio.devolver", ev ? "event" : "business", ev ? s.evento : s.negocio, s.ciudad,
        JSON.stringify({ patrocinio: id, monto: money(cents), dias: s.dias, de: s.total, motivo: s.motivo, refund: r.id, pi: s.pi })]);
    return true;
  });
  if (!nuevo) return 0;
  const v = { monto: money(cents), tarjeta: s.marca && s.l4 ? `${s.marca.toUpperCase()} ·· ${s.l4}` : "", n: String(s.dias), total: String(s.total) };
  if (ev && s.evento) await (await import("./patrocinio-evento")).avisoEvt(s.evento, "biz_patevt_devuelto", v).catch(() => undefined);
  else await avisoNeg(s.negocio, "biz_patrocinio_devuelto", v).catch(() => undefined);
  return cents;
}
/* El barrido: lo que se decidió devolver y todavía no está en el libro (la pasarela no respondió), con la misma llave. */
export async function devolverPendientes(kind: "negocio" | "evento"): Promise<number> {
  const T = kind === "negocio" ? "sponsorships" : "event_sponsorships";
  const L = (await db().query<{ id: string }>(
    `select s.id::text from ${T} s where s.refund_cents is not null and s.ended_at > now() - interval '30 days'
        and not exists (select 1 from sponsorship_payments r where r.kind = $1 and r.ref_id = s.id and r.reason = 'devolucion') order by s.ended_at limit 50`, [kind])).rows;
  let n = 0;
  for (const { id } of L) if (await devolverPatrocinio(kind, id).catch(() => 0)) n++;
  return n;
}

/* ── Negocios ── */

export type PrecioPat = { week: number; month: number; puestos: number; diasAdelante: number };
export async function preciosNegocio(): Promise<PrecioPat> {
  const v = await valores("patrocinio_semana_cents", "patrocinio_mes_cents", "patrocinio_puestos", "patrocinio_dias_adelante");
  return { week: v.patrocinio_semana_cents, month: v.patrocinio_mes_cents, puestos: v.patrocinio_puestos, diasAdelante: v.patrocinio_dias_adelante };
}

/* Puestos libres de una categoría y ciudad para un período, y si no hay, cuándo se libera uno (el primer fin de un patrocinio desde el que cabe
   uno más durante el período). */
export async function puestosLibres(ciudad: string, cat: string, a: string, b: string, puestos: number, dur: "week" | "month"): Promise<{ libres: number; libre: string | null }> {
  const r = (await db().query<{ n: number; libre: string | null }>(
    `select patrocinio_a_la_vez($1, $2, $3::timestamptz, $4::timestamptz, null) as n,
            (select to_char(min(x.t) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') from (select distinct s.ends_at as t from sponsorships s
               where s.city_id = $1 and s.category_id = $2 and s.status in ('reservado', 'activo') and s.ends_at > $3::timestamptz) x
              where patrocinio_a_la_vez($1, $2, x.t, x.t + case when $6 = 'week' then interval '7 days' else interval '1 month' end, null) < $5) as libre`,
    [ciudad, cat, a, b, puestos, dur])).rows[0]!;
  return { libres: Math.max(0, puestos - r.n), libre: r.n >= puestos ? r.libre : null };
}

/* Para la pantalla de elegir: con esa duración y desde ese día (hoy u otro, hasta patrocinio_dias_adelante), qué fechas quedan y cuántos puestos
   libres hay; sin puestos, desde qué día se libera uno. Solo lectura: al pagar se vuelve a revisar todo con candado. */
export type Consulta = { desde: string; hasta: string; a: string; b: string; libres: number; puestos: number; libre: string | null; max: string } | null;
export async function consultarPuestos(negocio: string, dur: "week" | "month", desde: string): Promise<Consulta> {
  if (desde !== "hoy" && !FECHA.test(desde)) return null;
  const n = await negocioPat(null, negocio);
  if (!n) return null;
  const P = await preciosNegocio();
  const d = (await db().query<{ hoy: string; max: string }>(`select (now() at time zone $1)::date::text as hoy, ((now() at time zone $1)::date + $2::int)::text as max`, [n.tz, P.diasAdelante])).rows[0]!;
  if (desde !== "hoy" && (desde < d.hoy || desde > d.max)) return null;
  const f = await fechasPeriodo(null, n.city_id, desde === d.hoy ? "hoy" : desde, dur);
  if (!f) return null;
  const l = await puestosLibres(n.city_id, n.category_id, f.a, f.b, P.puestos, dur);
  const fin = (await db().query<{ hasta: string; libre: string | null }>(`select ($1::timestamptz at time zone $2)::date::text as hasta, ($3::timestamptz at time zone $2)::date::text as libre`, [f.b, n.tz, l.libre])).rows[0]!;
  return { desde: f.dia, hasta: fin.hasta, a: f.a, b: f.b, libres: l.libres, puestos: P.puestos, libre: fin.libre, max: d.max };
}

type NegPat = { id: string; name: string; city_id: string; category_id: string; status: string; ciudad_on: boolean; tz: string };
async function negocioPat(c: PoolClient | null, id: string) {
  return (await (c ?? db()).query<NegPat>(
    `select b.id, b.name, b.city_id, b.category_id, b.status, ci.status = 'on' as ciudad_on, ci.timezone as tz from businesses b join cities ci on ci.id = b.city_id where b.id = $1`, [id])).rows[0] ?? null;
}

export type CompraIn = { dur: "week" | "month"; desde: "hoy" | string; pm: string; renovar: boolean; clave: string; renovarDe?: string | null };
/* Comprar (o reservar, o «Renovar otra semana»): ver arriba. `quien` = la persona del panel con permiso de Cobros (lo revisa la acción). */
export async function comprarPatrocinio(negocio: string, quien: string, x: CompraIn): Promise<ResPat> {
  if (x.dur !== "week" && x.dur !== "month") return no("Elige 1 semana o 1 mes.", "Choose 1 week or 1 month.");
  if (!CLAVE.test(String(x.clave ?? ""))) return no("Vuelve a intentarlo.", "Try again.");
  if (x.desde !== "hoy" && !FECHA.test(String(x.desde ?? ""))) return no("Elige cuándo empieza.", "Choose when it starts.");
  const card = await tarjetaDe(quien, String(x.pm ?? ""));
  if (!card) return no("Elige una tarjeta guardada.", "Choose a saved card.");
  const n = await negocioPat(null, negocio);
  if (!n || n.status !== "active") return no("Tu página tiene que estar publicada para patrocinar.", "Your page has to be live to sponsor.");
  if (!n.ciudad_on) return no("Tu ciudad todavía no abre: el patrocinio se compra cuando abra.", "Your city is not open yet: sponsorships can be bought once it opens.");
  const P = await preciosNegocio();
  // «Renovar otra semana / otro mes»: empieza cuando termina el que tienes.
  let desde = x.desde, renovarDe: string | null = null;
  if (x.renovarDe) {
    if (!/^\d{1,18}$/.test(String(x.renovarDe))) return no("Ese patrocinio ya terminó.", "That sponsorship already ended.");
    const v = (await db().query<{ fin: string; dia: string }>(
      `select to_char(s.ends_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as fin, (s.ends_at at time zone $3)::date::text as dia from sponsorships s
        where s.id = $1::bigint and s.business_id = $2 and s.status in ('activo', 'reservado')`, [x.renovarDe, negocio, n.tz])).rows[0];
    if (!v) return no("Ese patrocinio ya terminó.", "That sponsorship already ended.");
    desde = v.dia; renovarDe = String(x.renovarDe);
  }
  const f = await fechasPeriodo(null, n.city_id, desde, x.dur);
  if (!f) return no("Vuelve a intentarlo.", "Try again.");
  const hoy = (await db().query<{ hoy: string; max: string }>(`select (now() at time zone $1)::date::text as hoy, ((now() at time zone $1)::date + $2::int)::text as max`, [n.tz, P.diasAdelante])).rows[0]!;
  if (f.dia < hoy.hoy) return no("Elige hoy o un día que viene.", "Choose today or an upcoming day.");
  if (f.dia > hoy.max && !renovarDe) return no(`Se reserva hasta ${P.diasAdelante} días adelante.`, `You can book up to ${P.diasAdelante} days ahead.`);
  const centavos = x.dur === "week" ? P.week : P.month, idem = `pat-negocio-${negocio}-${x.clave}`;
  // Ya se hizo con esta clave (doble toque, o la red se cortó después de cobrar): lo mismo otra vez.
  const ya = (await db().query<{ id: string }>(`select ref_id::text as id from sponsorship_payments where idem_key = $1`, [idem])).rows[0];
  if (ya) return { ok: true, id: ya.id };
  const empiezaHoy = f.dia === hoy.hoy || (!!renovarDe && Date.parse(f.a) <= Date.now());
  let retenido: string | null = null;
  try {
    const r = await tx(async (c): Promise<ResPat & { aviso?: { hasta: string } }> => {
      await c.query(`select pg_advisory_xact_lock(hashtextextended($1, 0))`, [`pat:${n.city_id}:${n.category_id}`]);
      const cruza = (await c.query(`select 1 from sponsorships where business_id = $1 and category_id = $2 and city_id = $3 and status in ('reservado', 'activo') and starts_at < $5::timestamptz and ends_at > $4::timestamptz`,
        [negocio, n.category_id, n.city_id, f.a, f.b])).rowCount;
      if (cruza) return no("Ya tienes un patrocinio en esas fechas.", "You already have a sponsorship on those dates.");
      const vivos = (await c.query<{ n: number }>(`select patrocinio_a_la_vez($1, $2, $3::timestamptz, $4::timestamptz, null) as n`, [n.city_id, n.category_id, f.a, f.b])).rows[0]!.n;
      if (vivos >= P.puestos) return { ok: false, sinPuestos: true, msg: { es: "Ya no quedan puestos en esas fechas. No se cobró nada.", en: "There are no slots left on those dates. Nothing was charged." } };
      const cobro: Cobro = { kind: "negocio", negocio, ciudad: n.city_id, payer: quien, pm: card.pm, centavos, idem, razon: renovarDe ? "renovacion" : "compra", meta: { business_id: negocio, category_id: n.category_id }, enSesion: true };
      const p = await cobrar(cobro);
      // 3-D Secure: la hoja del banco (verificar) y la pantalla vuelve a mandar lo mismo con la misma clave; no se guardó nada.
      if (!p.ok) return { ok: false, msg: p.msg, ...(p.verificar ? { verificar: p.verificar } : {}) };
      if (p.retenido) retenido = p.pi;
      const id = (await c.query<{ id: string }>(
        `insert into sponsorships (business_id, category_id, city_id, starts_at, ends_at, duration, status, price_cents, payer_user_id, card_pm, auto_renew, renewed_from)
         values ($1, $2, $3, $4::timestamptz, $5::timestamptz, $6, $7, $8, $9, $10, $11, $12::bigint) returning id::text`,
        [negocio, n.category_id, n.city_id, f.a, f.b, x.dur, empiezaHoy ? "activo" : "reservado", centavos, quien, card.pm, !!x.renovar, renovarDe])).rows[0]!.id;
      await capturarCobro(p, centavos);
      await anotarPago(c, { ...cobro, ref: id, pi: p.pi, marca: p.marca, l4: p.l4 });
      await c.query(`update sponsorship_waits set status = 'compro' where kind = 'negocio' and business_id = $1 and status = 'espera'`, [negocio]);
      await auditarNegocio(c, quien, negocio, n.city_id, renovarDe ? "patrocinio.renovar" : "patrocinio.comprar",
        { patrocinio: id, duracion: x.dur, desde: f.a, hasta: f.b, monto: money(centavos), renovar_solo: !!x.renovar, estado: empiezaHoy ? "activo" : "reservado" });
      return { ok: true, id, estado: empiezaHoy ? "activo" : "reservado", aviso: { hasta: f.b } };
    });
    if (r.ok && r.estado === "activo" && r.aviso) await avisoNeg(negocio, "biz_patrocinio_activo", { hasta: r.aviso.hasta, monto: money(centavos) }).catch(() => undefined);
    return r;
  } catch (e) {
    const sc = await soltarRetenido(retenido, e);
    if (sc) return sc;
    const d = errorDePuestos(e);
    if (d) return d;
    throw e;
  }
}

/* «Avísame si se libera antes». */
export async function avisameLibre(negocio: string, quien: string): Promise<ResPat> {
  const n = await negocioPat(null, negocio);
  if (!n) return no("Ese negocio no existe.", "That business does not exist.");
  await db().query(`insert into sponsorship_waits (kind, business_id, category_id, city_id, user_id) values ('negocio', $1, $2, $3, $4) on conflict do nothing`, [negocio, n.category_id, n.city_id, quien]);
  return { ok: true };
}

/* Renovación sola (encendida o apagada) del patrocinio vivo. La tarjeta es la del pago. */
export async function renovarSolo(negocio: string, quien: string, id: string, on: boolean): Promise<ResPat> {
  if (!/^\d{1,18}$/.test(String(id))) return no("Ese patrocinio no existe.", "That sponsorship does not exist.");
  // 9n · El cambio y su auditoría, en la misma transacción (guardián auditoriaEnLaTransaccion).
  const r = await tx(async (c) => {
    const r = await c.query<{ city_id: string }>(`update sponsorships set auto_renew = $3 where id = $1::bigint and business_id = $2 and status in ('activo', 'reservado') and card_pm is not null returning city_id`, [id, negocio, !!on]);
    if (r.rowCount) await auditarNegocio(c, quien, negocio, r.rows[0]!.city_id, on ? "patrocinio.renovar_solo_on" : "patrocinio.renovar_solo_off", { patrocinio: id });
    return r;
  });
  if (!r.rowCount) return no("Ese patrocinio ya terminó.", "That sponsorship already ended.");
  return { ok: true };
}

/* «Terminar antes» (el dueño): deja de salir ya; lo pagado no se devuelve (lo dice la pantalla antes de confirmar). «Cancelar reserva» (no
   empezó): se devuelve todo (lo decide la base, 'todo'). */
export async function terminarPorDueno(negocio: string, quien: string, id: string): Promise<ResPat> {
  if (!/^\d{1,18}$/.test(String(id))) return no("Ese patrocinio no existe.", "That sponsorship does not exist.");
  const r = await tx(async (c) => {
    const r = await c.query<{ city_id: string; status: string; refund_cents: number | null }>(
    `update sponsorships set status = case when status = 'reservado' then 'cancelado' else 'terminado' end, end_kind = 'dueno', ended_at = now(), ended_by = $3, auto_renew = false,
            ${DEVOLUCION("case when status = 'reservado' then 'todo' else 'nada' end", "'reserva_cancelada'", false)}
      where id = $1::bigint and business_id = $2 and status in ('activo', 'reservado') returning city_id, status, refund_cents`, [id, negocio, quien]);
    const x = r.rows[0];
    if (x) await auditarNegocio(c, quien, negocio, x.city_id, "patrocinio.terminar", { patrocinio: id, estado: x.status, devolver: x.refund_cents ? money(x.refund_cents) : null });
    return r;
  });
  if (!r.rowCount) return no("Ese patrocinio ya terminó.", "That sponsorship already ended.");
  const x = r.rows[0]!;
  if (x.refund_cents) await devolverPatrocinio("negocio", id);
  return { ok: true, devuelto: x.refund_cents ?? 0 };
}

/* ── La vitrina de la página de categoría ── */
/* Los patrocinios activos de la categoría en la ciudad, con lo que pide la página (país, antojo, filtros) y en el radio de la lista: el negocio
   también sigue en su lugar normal de la lista. Rotan cada hora (nadie sale siempre primero). Una consulta; las tarjetas las arma armarTarjetas. */
export async function vitrinaCategoria(p: Punto, cat: string, sub: Regla | null, filtros: string[]): Promise<(Resultado & { sid: string })[]> {
  const params: unknown[] = [p.ciudad, cat];
  const extra = condiciones({ sub, filtros }, params);
  const r = await db().query<Resultado & { sid: string; rn?: number }>(
    `${CTE(p)},
          sp as (select id, business_id from sponsorships where city_id = $1 and category_id = $2 and status = 'activo' and starts_at <= now() and ends_at > now()),
          base as (select ${COLUMNAS}, (select sp.id from sp where sp.business_id = b.id order by sp.id limit 1) as sn ${DESDE} and b.category_id = $2 and b.id in (select business_id from sp)${extra}),
          r as (select *, sn::text as sid, (row_number() over (order by sn) - 1)::int as rk, count(*) over ()::int as nn from base)
     select r.*, ${FOTO("r")} from r order by mod(rk + (extract(epoch from now()) / 3600)::bigint, greatest(nn, 1)) limit ${cfgPuestos}`,
    params);
  return r.rows.map(({ rn: _rn, ...x }) => (void _rn, conFoto(x)));
}
const cfgPuestos = "(select cfg_int('patrocinio_puestos'))";

/* Vistas (la vitrina se mostró a alguien) y «entraron» (tocaron la tarjeta): las cuenta la base (cifras derivadas), una vez por persona (o
   dispositivo) y día. Nunca rompen la página. */
export async function contarVistas(kind: "negocio" | "evento", ids: string[], quien: string | null, dev: string | null) {
  const L = ids.filter((x) => /^\d{1,18}$/.test(x));
  if (!L.length || (!quien && !dev)) return;
  await db().query(`select patrocinio_vistas($1, $2::bigint[], $3::uuid, $4::uuid)`, [kind, L, quien, dev]).catch((e) => console.error("[patrocinio] vistas", e instanceof Error ? e.message : e));
}
export async function contarEntrada(kind: "negocio" | "evento", id: string, quien: string | null, dev: string | null) {
  if (!/^\d{1,18}$/.test(String(id))) return false;
  return (await db().query<{ ok: boolean }>(`select patrocinio_entro($1, $2::bigint, $3::uuid, $4::uuid) as ok`, [kind, id, quien, dev]).catch(() => ({ rows: [{ ok: false }] }))).rows[0]?.ok ?? false;
}

/* La tarjeta del propio negocio, tal como sale en Patrocinados (la vista previa del panel): desde el centro de su ciudad. */
export async function tarjetaPropia(negocio: string, lang: "es" | "en"): Promise<Tarjeta | null> {
  const ci = (await db().query<{ ciudad: string; lat: number; lng: number }>(
    `select b.city_id as ciudad, st_y(ci.center::geometry) as lat, st_x(ci.center::geometry) as lng from businesses b join cities ci on ci.id = b.city_id where b.id = $1`, [negocio])).rows[0];
  if (!ci) return null;
  const p: Punto = { ciudad: ci.ciudad, lat: ci.lat, lng: ci.lng, rad: 100 };
  const r = await db().query<Resultado>(`${CTE(p)} select ${COLUMNAS}, ${FOTO("b")} from businesses b join business_stats_cache s on s.business_id = b.id, c, t where b.id = $2`, [ci.ciudad, negocio]);
  if (!r.rows[0]) return null;
  const { armarTarjetas } = await import("./tarjetas");
  return (await armarTarjetas(ci.ciudad, r.rows.map((x) => conFoto(x)), lang, null))[0] ?? null;
}

/* ── El panel (Cobros y plan › Patrocinio) ── */
export type FilaPat = { id: string; estado: "reservado" | "activo" | "terminado" | "cancelado"; dur: Dur; desde: string; hasta: string; precio: number; renovar: boolean; tarjeta: string | null;
  fin: string | null; finKind: string | null; finMotivo: string | null; vistas: number; entraron: number; pedidos: number; dias: number; dia: number; devuelto: number };
export type PatPanel = {
  negocio: { id: string; nombre: string; cat: string; catL: Bi; ciudad: string; ciudadN: string; pro: boolean; tz: string };
  precios: PrecioPat; libres: { week: Consulta; month: Consulta }; hoy: string; previa: Tarjeta | null;
  vivo: FilaPat | null; siguiente: FilaPat | null; pasados: FilaPat[]; recibos: Recibo[];
  espera: boolean; tarjetas: { pm: string; marca: string; ultimos4: string; vence: string; def: boolean }[]; modo: "stripe" | "simulador" | "apagado"; pk: string | null;
};
/* Un recibo del libro: un cobro (compra o renovación) o una devolución (con sus días). */
export type Recibo = { at: string; monto: number; tarjeta: string; razon: string; dias: number | null };
const FILA = `s.id::text, s.status as estado, s.duration as dur, to_char(s.starts_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as desde,
  to_char(s.ends_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as hasta, s.price_cents as precio, s.auto_renew as renovar,
  (select upper(pm.brand) || ' ·· ' || pm.last4 from payment_methods pm where pm.stripe_pm_id = s.card_pm) as tarjeta,
  to_char(s.ended_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as fin, s.end_kind as "finKind", s.end_reason as "finMotivo",
  coalesce(st.views, 0)::int as vistas, coalesce(st.entries, 0)::int as entraron, coalesce(st.orders, 0)::int as pedidos,
  greatest(1, ceil(extract(epoch from s.ends_at - s.starts_at) / 86400))::int as dias, least(greatest(1, ceil(extract(epoch from now() - s.starts_at) / 86400))::int, greatest(1, ceil(extract(epoch from s.ends_at - s.starts_at) / 86400))::int) as dia,
  coalesce((select r.amount_cents from sponsorship_payments r where r.kind = 'negocio' and r.ref_id = s.id and r.reason = 'devolucion'), 0)::int as devuelto`;

export async function patPanel(negocio: string, userId: string, lang: "es" | "en"): Promise<PatPanel | null> {
  const n = (await db().query<PatPanel["negocio"] & { status: string }>(
    `select b.id, b.name as nombre, b.category_id as cat, c.name as "catL", b.city_id as ciudad, ci.name as "ciudadN", coalesce(st.plan = 'pro', false) as pro, ci.timezone as tz, b.status
       from businesses b join categories c on c.id = b.category_id join cities ci on ci.id = b.city_id left join business_stats_cache st on st.business_id = b.id where b.id = $1`, [negocio])).rows[0];
  if (!n) return null;
  const P = await preciosNegocio();
  const [lw, lm, filas, rec, esp, tj, hoy, previa] = await Promise.all([
    consultarPuestos(negocio, "week", "hoy"), consultarPuestos(negocio, "month", "hoy"),
    db().query<FilaPat>(`select ${FILA} from sponsorships s left join sponsorship_stats st on st.kind = 'negocio' and st.ref_id = s.id where s.business_id = $1 order by s.starts_at desc, s.id desc limit 20`, [negocio]),
    db().query<Recibo>(
      `select to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at, amount_cents as monto, coalesce(upper(card_brand) || ' ·· ' || card_last4, '—') as tarjeta, reason as razon, refund_days as dias
         from sponsorship_payments where kind = 'negocio' and business_id = $1 order by created_at desc limit 24`, [negocio]),
    db().query(`select 1 from sponsorship_waits where kind = 'negocio' and business_id = $1 and status = 'espera'`, [negocio]),
    (await import("./cobros")).misTarjetas(userId),
    db().query<{ hoy: string }>(`select (now() at time zone $1)::date::text as hoy`, [n.tz]),
    tarjetaPropia(negocio, lang),
  ]);
  const vivo = filas.rows.find((x) => x.estado === "activo") ?? null;
  const siguiente = filas.rows.filter((x) => x.estado === "reservado").sort((a, b) => a.desde.localeCompare(b.desde))[0] ?? null;
  const { status: _s, ...neg } = n;
  return { negocio: neg, precios: P, libres: { week: lw, month: lm }, hoy: hoy.rows[0]!.hoy, previa, vivo, siguiente,
    pasados: filas.rows.filter((x) => x.estado === "terminado" || x.estado === "cancelado").slice(0, 10), recibos: rec.rows, espera: !!esp.rowCount, tarjetas: tj,
    modo: pasarela.modo(), pk: process.env.STRIPE_PUBLISHABLE_KEY ?? null };
}
/* Lo poco que pide «Tu página» del panel: si hay uno vivo y hasta cuándo. */
export async function patResumen(negocio: string): Promise<{ hasta: string; estado: string } | null> {
  return (await db().query<{ hasta: string; estado: string }>(
    `select to_char(ends_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as hasta, status as estado from sponsorships where business_id = $1 and status in ('activo', 'reservado') order by starts_at limit 1`, [negocio])).rows[0] ?? null;
}

/* ── Avisos ── */
async function avisoNeg(negocio: string, tpl: string, v: { hasta?: string; monto?: string; tarjeta?: string; motivo?: string; n?: string; total?: string }) {
  const x = (await db().query<{ negocio: string; donde: string; tz: string }>(
    `select b.name as negocio, (c.name->>'es') || ' · ' || ci.name as donde, ci.timezone as tz from businesses b join categories c on c.id = b.category_id join cities ci on ci.id = b.city_id where b.id = $1`, [negocio])).rows[0];
  if (!x) return;
  const hasta = v.hasta ? new Intl.DateTimeFormat("es-US", { timeZone: x.tz, day: "numeric", month: "short" }).format(new Date(v.hasta)).replace(/\./g, "") : "";
  await (await import("./avisos")).avisarNegocio(negocio, tpl, { negocio: x.negocio, donde: x.donde, hasta, monto: v.monto ?? "", tarjeta: v.tarjeta ?? "", motivo: v.motivo ?? "", n: v.n ?? "", total: v.total ?? "" },
    { href: `/panel/${negocio}/cobros/patrocinio` });
}

/* ── El barrido (cada minuto, lib/barrido.ts) ── */
/* Empiezan los reservados que ya tocan, vencen los que terminaron (renovando los que lo piden, si cobra y si hay puesto), se termina el de un negocio
   que ya no está publicado, se avisa a quien pidió «Avísame» cuando hay puesto y se ponen al día los pedidos que llegaron por el patrocinio. */
export async function barrerPatrocinios(): Promise<{ empezaron: number; vencieron: number; renovados: number }> {
  let empezaron = 0, vencieron = 0, renovados = 0;
  // Negocio que dejó de estar publicado: su patrocinio termina (no sale en la vitrina igual; así deja libre el puesto).
  await db().query(`update sponsorships s set status = case when s.status = 'reservado' then 'cancelado' else 'terminado' end, end_kind = 'sin_negocio', ended_at = now(), auto_renew = false
                     from businesses b where b.id = s.business_id and s.status in ('activo', 'reservado') and b.status <> 'active'`);
  const emp = await db().query<{ id: string; negocio: string; hasta: string; precio: number }>(
    `update sponsorships set status = 'activo' where status = 'reservado' and starts_at <= now() and ends_at > now()
     returning id::text, business_id as negocio, to_char(ends_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as hasta, price_cents as precio`);
  for (const x of emp.rows) { empezaron++; await avisoNeg(x.negocio, "biz_patrocinio_activo", { hasta: x.hasta, monto: money(x.precio) }).catch(() => undefined); }
  // Un reservado que nunca empezó y ya pasó (el barrido no corrió a tiempo en todo el período): termina.
  await db().query(`update sponsorships set status = 'terminado', end_kind = 'vencio', ended_at = now(), auto_renew = false where status = 'reservado' and ends_at <= now()`);
  const L = (await db().query<{ id: string }>(`select id::text from sponsorships where status = 'activo' and ends_at <= now() order by ends_at limit 200`)).rows;
  for (const { id } of L) {
    const r = await vencerUno(id).catch((e) => { console.error("[patrocinio] vencer", id, e instanceof Error ? e.message : e); return null; });
    if (!r) continue;
    if (r.r === "renovado") renovados++; else vencieron++;
    await avisoNeg(r.negocio, r.tpl, r.v).catch(() => undefined);
  }
  // «Avísame si se libera antes»: hay un puesto libre esta semana en su categoría.
  const W = (await db().query<{ id: string; negocio: string }>(
    `select w.id::text, w.business_id as negocio from sponsorship_waits w where w.kind = 'negocio' and w.status = 'espera'
        and patrocinio_a_la_vez(w.city_id, w.category_id, now(), now() + interval '7 days', null) < cfg_int('patrocinio_puestos') limit 200`)).rows;
  for (const w of W) {
    const u = await db().query(`update sponsorship_waits set status = 'avisado', notified_at = now() where id = $1::bigint and status = 'espera'`, [w.id]);
    if (u.rowCount) await avisoNeg(w.negocio, "biz_patrocinio_libre", {}).catch(() => undefined);
  }
  // Lo que se decidió devolver y la pasarela todavía no hizo (no respondió): otra vez, con la misma llave.
  await devolverPendientes("negocio");
  await db().query(`select patrocinio_cifras_al_dia()`);
  // Las filas de «ya se le contó la vista hoy» solo sirven el día: se van a los 2 días (técnicas, no un historial).
  await db().query(`delete from sponsorship_views where day < (now() at time zone 'America/New_York')::date - 2`);
  return { empezaron, vencieron, renovados };
}

/* Un patrocinio que llegó a su fin: con «renovar» encendido, se cobra el siguiente período (misma duración, el precio de hoy) con la tarjeta del
   pago, si hay puesto; si no cobra o no hay puesto, termina y se avisa por qué. Una sola vez: la llave del cobro es la del período que termina. */
type Vencido = { r: "renovado" | "termino"; negocio: string; tpl: string; v: { hasta?: string; monto?: string; tarjeta?: string; motivo?: string } };
async function vencerUno(id: string): Promise<Vencido | null> {
  return tx(async (c) => {
    const s = (await c.query<{ id: string; business_id: string; category_id: string; city_id: string; duration: "week" | "month"; auto_renew: boolean; card_pm: string | null; payer_user_id: string; tz: string; fin: string; b_on: boolean }>(
      `select s.id::text, s.business_id, s.category_id, s.city_id, s.duration, s.auto_renew, s.card_pm, s.payer_user_id, ci.timezone as tz,
              ((s.ends_at at time zone ci.timezone)::date)::text as fin, b.status = 'active' as b_on
         from sponsorships s join cities ci on ci.id = s.city_id join businesses b on b.id = s.business_id where s.id = $1::bigint and s.status = 'activo' and s.ends_at <= now() for update of s`, [id])).rows[0];
    if (!s) return null;
    const terminar = async (motivo: Bi | null) => {
      await c.query(`update sponsorships set status = 'terminado', end_kind = 'vencio', ended_at = now(), renew_note = $2 where id = $1::bigint`, [id, motivo?.es ?? null]);
      return motivo;
    };
    if (!s.auto_renew || !s.card_pm || !s.b_on) { await terminar(null); return { r: "termino", negocio: s.business_id, tpl: "biz_patrocinio_termino", v: {} }; }
    await c.query(`select pg_advisory_xact_lock(hashtextextended($1, 0))`, [`pat:${s.city_id}:${s.category_id}`]);
    const P = await preciosNegocio(), f = (await fechasPeriodo(c, s.city_id, s.fin, s.duration))!;
    const vivos = (await c.query<{ n: number }>(`select patrocinio_a_la_vez($1, $2, $3::timestamptz, $4::timestamptz, $5::bigint) as n`, [s.city_id, s.category_id, f.a, f.b, id])).rows[0]!.n;
    const tarjeta = await tarjetaDe(s.payer_user_id, s.card_pm);
    let motivo: Bi | null = null;
    if (vivos >= P.puestos) motivo = { es: "no quedaba puesto", en: "there was no slot left" };
    else if (!tarjeta) motivo = { es: "la tarjeta ya no está guardada", en: "the card is no longer saved" };
    if (!motivo) {
      const centavos = s.duration === "week" ? P.week : P.month, idem = `pat-negocio-renov-${id}`;
      const cobro: Cobro = { kind: "negocio", negocio: s.business_id, ciudad: s.city_id, payer: s.payer_user_id, pm: tarjeta!.pm, centavos, idem, razon: "renovacion", meta: { business_id: s.business_id, category_id: s.category_id } };
      const p = await cobrar(cobro);
      if (p.ok) {
        await c.query(`update sponsorships set status = 'terminado', end_kind = 'vencio', ended_at = now() where id = $1::bigint`, [id]);
        const nid = (await c.query<{ id: string }>(
          `insert into sponsorships (business_id, category_id, city_id, starts_at, ends_at, duration, status, price_cents, payer_user_id, card_pm, auto_renew, renewed_from)
           values ($1, $2, $3, $4::timestamptz, $5::timestamptz, $6, 'activo', $7, $8, $9, true, $10::bigint) returning id::text`,
          [s.business_id, s.category_id, s.city_id, f.a, f.b, s.duration, centavos, s.payer_user_id, tarjeta!.pm, id])).rows[0]!.id;
        await anotarPago(c, { ...cobro, ref: nid, pi: p.pi, marca: p.marca, l4: p.l4 });
        await auditarNegocio(c, s.payer_user_id, s.business_id, s.city_id, "patrocinio.renovado_solo", { patrocinio: nid, de: id, monto: money(centavos), hasta: f.b });
        const tj = p.marca && p.l4 ? `${p.marca.toUpperCase()} ·· ${p.l4}` : "";
        return { r: "renovado", negocio: s.business_id, tpl: "biz_patrocinio_renovado", v: { hasta: f.b, monto: money(centavos), tarjeta: tj } };
      }
      motivo = { es: p.msg.es.replace(/\.$/, "").toLowerCase(), en: p.msg.en.replace(/\.$/, "").toLowerCase() };
    }
    await terminar(motivo);
    return { r: "termino", negocio: s.business_id, tpl: "biz_patrocinio_no_renovo", v: { motivo: motivo!.es } };
  });
}

/* ── Super Admin › Crecimiento › Patrocinios ── */
export type PatAdm = { id: string; kind: "negocio" | "evento"; negocio: string; nombre: string; evento: string | null; donde: string; ciudad: string; estado: string; desde: string; hasta: string;
  precio: number; pagado: number; renovar: boolean; finKind: string | null; finMotivo: string | null; vistas: number; entraron: number; pedidos: number;
  /* 0175 · Lo devuelto (del libro), lo que se devolvería si se termina ahora (lo calcula la base) y si está en pausa (solo eventos). */
  devuelto: number; aDevolver: number; pausado: boolean };
export async function patrociniosAdmin(ciudades: string[], ciudad: string | null, lang: "es" | "en", desde: string | null, estado: "vivos" | "terminados" | "todos" = "vivos"): Promise<{ filas: PatAdm[]; mas: string | null; activos: number; reservados: number }> {
  const cur = desde && /^\d{1,18}$/.test(desde) ? desde : null;
  const v: unknown[] = [ciudades, ciudad, lang];
  const w = `(cardinality($1::text[]) = 0 or s.city_id = any($1::text[])) and ($2::text is null or s.city_id = $2)`;
  const est = estado === "vivos" ? `and s.status in ('activo', 'reservado')` : estado === "terminados" ? `and s.status in ('terminado', 'cancelado')` : "";
  // Cursor por id (sin offset): lo nuevo primero. Una consulta para la página y su suma de lo pagado (sin N+1).
  const r = await db().query<PatAdm>(
    `select s.id::text, 'negocio' as kind, s.business_id as negocio, b.name as nombre, null as evento, (c.name->>$3) || ' · ' || ci.name as donde, s.city_id as ciudad, s.status as estado,
            to_char(s.starts_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as desde, to_char(s.ends_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as hasta,
            s.price_cents as precio, coalesce(pg.n, 0)::int as pagado, coalesce(pg.dev, 0)::int as devuelto, s.auto_renew as renovar,
            s.end_kind as "finKind", s.end_reason as "finMotivo", coalesce(st.views, 0)::int as vistas, coalesce(st.entries, 0)::int as entraron, coalesce(st.orders, 0)::int as pedidos,
            case when s.status in ('activo', 'reservado') then (select d.cents from patrocinio_devolucion('sin_usar', s.price_cents, s.starts_at, s.ends_at, 0, 0, null, now()) d) else 0 end as "aDevolver", false as pausado
       from sponsorships s join businesses b on b.id = s.business_id join categories c on c.id = s.category_id join cities ci on ci.id = s.city_id
       left join sponsorship_stats st on st.kind = 'negocio' and st.ref_id = s.id
       left join lateral (select sum(p.amount_cents) filter (where p.reason <> 'devolucion') as n, sum(p.amount_cents) filter (where p.reason = 'devolucion') as dev
                            from sponsorship_payments p where p.kind = 'negocio' and p.ref_id = s.id) pg on true
      where ${w} ${est} ${cur ? `and s.id < $4::bigint` : ""}
      order by s.id desc limit 41`, cur ? [...v, cur] : v);
  const filas = r.rows.slice(0, 40);
  const k = (await db().query<{ a: number; r: number }>(`select count(*) filter (where s.status = 'activo')::int as a, count(*) filter (where s.status = 'reservado')::int as r from sponsorships s where s.status in ('activo', 'reservado') and ${w}`, [ciudades, ciudad])).rows[0]!;
  return { filas, mas: r.rows.length > 40 ? filas.at(-1)!.id : null, activos: k.a, reservados: k.r };
}
/* Terminar (Super Admin, mkt:editar): con motivo, auditado y avisado al dueño. Con «Devolver lo que no se usó» (encendido de entrada), la base
   decide cuánto ('sin_usar': una reserva que no empezó, todo; uno activo, los días enteros que faltaban) y va a la pasarela. La pantalla solo dice
   sí o no: nunca un monto. */
export async function terminarPorAdmin(staffId: string, ciudades: string[], id: string, motivo: string, devolver: boolean): Promise<ResPat> {
  const m = String(motivo ?? "").replace(/\s+/g, " ").trim().slice(0, 300);
  if (!/^\d{1,18}$/.test(String(id))) return no("Ese patrocinio no existe.", "That sponsorship does not exist.");
  if (m.length < 3) return no("Escribe el motivo.", "Write the reason.");
  const r = await tx(async (c) => {
    const s = (await c.query<{ negocio: string; ciudad: string; estado: string }>(`select business_id as negocio, city_id as ciudad, status as estado from sponsorships where id = $1::bigint for update`, [id])).rows[0];
    if (!s) return no("Ese patrocinio no existe.", "That sponsorship does not exist.");
    if (ciudades.length && !ciudades.includes(s.ciudad)) return no("Esa ciudad no es tuya.", "That city is not yours.");
    if (s.estado !== "activo" && s.estado !== "reservado") return no("Ya terminó.", "It is already over.");
    const d = (await c.query<{ cents: number | null }>(
      `update sponsorships set status = case when status = 'reservado' then 'cancelado' else 'terminado' end, end_kind = 'admin', end_reason = $2, ended_at = now(), ended_by = $3, auto_renew = false,
              ${DEVOLUCION("case when $4::boolean then 'sin_usar' else 'nada' end", "'admin'", false)}
        where id = $1::bigint returning refund_cents as cents`, [id, m, staffId, devolver === true])).rows[0]!;
    await auditarNegocio(c, staffId, s.negocio, s.ciudad, "mkt.patrocinio.terminar", { patrocinio: id, antes: s.estado, despues: s.estado === "reservado" ? "cancelado" : "terminado", devolver: d.cents ? money(d.cents) : null }, m, "staff");
    return { ok: true, negocio: s.negocio, devolver: d.cents ?? 0 } as ResPat & { negocio: string; devolver: number };
  });
  if (!r.ok || !("negocio" in r)) return r;
  await avisoNeg(String(r.negocio), "biz_patrocinio_admin", { motivo: m }).catch(() => undefined);
  const quiere = (r as { devolver?: number }).devolver ?? 0, dev = quiere ? await devolverPatrocinio("negocio", id) : 0;
  return { ok: true, devuelto: dev, msg: quiere
    ? (dev ? { es: `Patrocinio terminado. Se devolvieron ${money(dev)} a su tarjeta. Quedó en la auditoría.`, en: `Sponsorship ended. ${money(dev)} was refunded to the card. It is in the audit log.` }
      : { es: "Patrocinio terminado. La devolución sigue pendiente: el barrido la reintenta. Quedó en la auditoría.", en: "Sponsorship ended. The refund is still pending: the sweep retries it. It is in the audit log." })
    : { es: "Patrocinio terminado sin devolver. Quedó en la auditoría.", en: "Sponsorship ended with no refund. It is in the audit log." } };
}
