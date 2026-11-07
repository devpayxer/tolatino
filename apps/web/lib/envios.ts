import "server-only";
import { contexto } from "./citas";
import { descifrar } from "./cifrado";
import { cobrarOperacion, comision, registrarRetencion } from "./cobros";
import { db, tx } from "./db";
import { pasarela } from "./pagos/pasarela";
import type { Bi } from "./transporte-comun";
import { NUM_V, type Destino } from "./viajes";

/* Envío de caja y mudanza (Fase 4 · 4y-2 · fase4-fiestas-transporte.md §4y).
   - Caja confirmada (cobrada): «Recogida hecha» → «Salió del almacén» con número de rastreo → «Entregada». Desde la recogida ya
     no se cancela. El destinatario solo lo ven el cliente y el negocio, descifrado aquí; nunca va en avisos ni vistas públicas.
   - Mudanza: el negocio mira las fotos y manda el PRECIO CERRADO (written_totals, versión nueva cada vez, vale 48 h). El cliente lo
     acepta con su tarjeta: se retiene y se cobra en la misma pasada (el precio es el acordado; nada se agrega ese día) — o «No,
     gracias». Si nadie contesta, vence (barrerViajes) y no se cobra nada. */
const no = (es: string, en: string, extra?: Record<string, true>) => ({ ok: false as const, msg: { es, en } as Bi, ...extra });
const ok1 = { ok: true as const };
type ResE = { ok: true } | { ok: false; msg: Bi; tarjeta?: true };
const money = (c: number) => `$${(c / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

type OpE = { id: string; num: string; biz: string; uid: string; status: string; detail: string | null; k: string; tot: number; pay: string | null; city: string };
async function op(c: { query: ReturnType<typeof db>["query"] }, where: string, args: unknown[], lock = false): Promise<OpE | null> {
  return (await c.query<OpE>(
    `select o.id::text, o.number as num, o.business_id as biz, o.user_id::text as uid, o.status, o.status_detail as detail, o.details->>'k' as k, o.total_cents as tot, o.pay_status as pay, o.city_id as city
       from operations o where o.kind = 'trip' and ${where}${lock ? " for update" : ""}`, args)).rows[0] ?? null;
}
async function ev(c: { query: ReturnType<typeof db>["query"] }, opId: string, kind: string, actor: "user" | "member" | "system", actorId: string | null, note?: Bi) {
  await c.query(`insert into operation_events (operation_id, kind, actor, actor_id, note) values ($1::bigint, $2, $3, $4, $5::jsonb)`, [opId, kind, actor, actorId, note ? JSON.stringify(note) : null]);
}
async function avisar(numero: string, quien: "cliente" | "negocio", tpl: string, extra: Record<string, string> = {}) {
  const o = (await db().query<{ uid: string; biz: string; negocio: string; cliente: string; ymd: string; m: number; tot: number; svc: Bi }>(
    `select o.user_id::text as uid, o.business_id as biz, b.name as negocio, coalesce(nullif(u.first_name, ''), 'Cliente') as cliente, (o.scheduled_at at time zone c.timezone)::date::text as ymd,
            (extract(hour from o.scheduled_at at time zone c.timezone) * 60 + extract(minute from o.scheduled_at at time zone c.timezone))::int as m, o.total_cents as tot, o.details->'svc' as svc
       from operations o join businesses b on b.id = o.business_id join users u on u.id = o.user_id join cities c on c.id = o.city_id where o.number = $1 and o.kind = 'trip'`, [numero])).rows[0];
  if (!o) return;
  const d = new Date(`${o.ymd}T12:00:00Z`), dia = `${["dom", "lun", "mar", "mié", "jue", "vie", "sáb"][d.getUTCDay()]} ${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
  const hora = `${Math.floor(o.m / 60) % 12 || 12}:${String(o.m % 60).padStart(2, "0")} ${o.m < 720 ? "AM" : "PM"}`;
  const A = await import("./avisos"), vars = { negocio: o.negocio, cliente: o.cliente, dia, hora, total: money(o.tot), servicio: o.svc?.es ?? "", ...extra };
  if (quien === "cliente") await A.avisar(o.uid, tpl, vars, { href: `/viaje/${numero}`, ref: ["trip", numero] });
  else await A.avisarNegocio(o.biz, tpl, vars, { href: `/panel/${o.biz}/hoy?det=viaje:${numero}`, ref: ["trip", numero] });
}

/* ── Lo privado: el destinatario (descifrado) y las fotos de la mudanza. Solo para el cliente dueño y su negocio. ── */
export async function destinatarioDe(opId: string): Promise<Destino | null> {
  const r = (await db().query<{ e: Buffer | null }>(`select note_enc as e from op_private where operation_id = $1::bigint and reason = 'destinatario'`, [opId])).rows[0];
  const t = descifrar(r?.e ?? null);
  try { return t ? (JSON.parse(t) as Destino) : null; } catch { return null; }
}
export async function fotosDe(opId: string): Promise<string[]> {
  return (await db().query<{ url: string }>(`select url from media where owner_kind = 'trip' and owner_id = $1 and status = 'visible' order by sort`, [opId])).rows.map((x) => x.url);
}
export type Precio = { v: number; cents: number; inc: string | null; vence: number; st: string };
export async function precioDe(opId: string): Promise<Precio | null> {
  return (await db().query<Precio>(
    `select version as v, total_cents as cents, note->>'es' as inc, (extract(epoch from valid_until) * 1000)::float8 as vence, status as st from written_totals where operation_id = $1::bigint order by version desc limit 1`, [opId])).rows[0] ?? null;
}

/* ── El negocio manda el precio cerrado de la mudanza (Panel › detalle). ── */
export async function mandarPrecio(negocio: string, numero: string, cents: number, inc: string, actorId: string): Promise<ResE> {
  if (!NUM_V.test(numero)) return no("Esa mudanza no existe.", "That move does not exist.");
  const c0 = Math.round(Number(cents));
  if (!Number.isFinite(c0) || c0 < 2000 || c0 > 2_000_000 || c0 % 100) return no("Escribe el precio en dólares, entre $20 y $20,000.", "Write the price in dollars, between $20 and $20,000.");
  const incl = String(inc ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
  if (incl.length < 4) return no("Escribe qué incluye: camión, personas, mantas, peajes…", "Write what it includes: truck, people, blankets, tolls…");
  const r = await tx(async (c): Promise<ResE> => {
    const o = await op(c, "o.business_id = $1 and o.number = $2", [negocio, numero], true);
    if (!o || o.k !== "cotiza") return no("Esa mudanza no existe.", "That move does not exist.");
    if (o.status !== "pending") return no("Esta solicitud ya cambió. Actualiza la pantalla.", "This request already changed. Refresh the screen.");
    const v = (await c.query<{ v: number }>(`select coalesce(max(version), 0)::int + 1 as v from written_totals where operation_id = $1::bigint`, [o.id])).rows[0]!.v;
    if (v > 20) return no("Ya mandaste 20 precios para esta mudanza. Llama al cliente.", "You already sent 20 prices for this move. Call the client.");
    await c.query(`update written_totals set status = 'superseded' where operation_id = $1::bigint and status = 'sent'`, [o.id]);
    await c.query(
      `insert into written_totals (operation_id, business_id, city_id, version, fee_cents, gov_cents, credit_cents, extras, note, total_cents, valid_until, status, created_by)
       values ($1::bigint, $2, $3, $4, $5, 0, 0, '[]'::jsonb, $6::jsonb, $5, now() + interval '48 hours', 'sent', $7)`,
      [o.id, o.biz, o.city, v, c0, JSON.stringify({ es: incl, en: incl }), actorId]);
    await c.query(`update operations set status_detail = 'precio', total_cents = $2, subtotal_cents = $2, answered_at = coalesce(answered_at, now()), respond_by = now() + interval '48 hours', updated_at = now() where id = $1::bigint`, [o.id, c0]);
    await ev(c, o.id, "quote_sent", "member", actorId, { es: `Mandaste el precio cerrado: ${money(c0)}`, en: `You sent the fixed price: ${money(c0)}` });
    return ok1;
  });
  if (r.ok) await avisar(numero, "cliente", "viaje_precio").catch(() => undefined);
  return r;
}

/* ── El cliente acepta el precio cerrado: se retiene con su tarjeta y se cobra. Versión exacta (no acepta un precio viejo). ── */
export async function aceptarPrecio(userId: string, numero: string, version: number, pm: string | null, ip: string | null, clave: string): Promise<ResE> {
  if (!NUM_V.test(numero) || !/^[0-9a-f-]{36}$/.test(String(clave))) return no("No se pudo. Recarga la página.", "Could not do it. Reload the page.");
  const c = await db().connect();
  let retenido: string | null = null, opId = "";
  try {
    await c.query("begin");
    const o = await op(c, "o.user_id = $1 and o.number = $2", [userId, numero], true);
    if (!o || o.k !== "cotiza") { await c.query("rollback"); return no("Esa mudanza no existe.", "That move does not exist."); }
    opId = o.id;
    const t = (await c.query<{ id: string; v: number; cents: number; vivo: boolean; st: string }>(
      `select id::text, version as v, total_cents as cents, valid_until > now() as vivo, status as st from written_totals where operation_id = $1::bigint order by version desc limit 1 for update`, [o.id])).rows[0];
    if (o.status !== "pending" || o.detail !== "precio" || !t || t.st !== "sent") { await c.query("rollback"); return no("Este precio ya cambió. Actualiza la pantalla.", "This price already changed. Refresh the screen."); }
    if (!t.vivo) { await c.query("rollback"); return no("Este precio ya venció. Pide otro.", "This price expired. Ask for another."); }
    if (t.v !== Math.round(Number(version))) { await c.query("rollback"); return no("El negocio mandó un precio nuevo. Míralo antes de aceptar.", "The business sent a new price. Check it before accepting."); }
    const x = await contexto(c, o.biz, ["NEG-TRANS"]);
    if (!x) { await c.query("rollback"); return no("Este negocio ya no está.", "This business is no longer available."); }
    let fee = 0;
    if (x.cuenta) {
      const p = typeof pm === "string" && /^pm_[A-Za-z0-9_]{3,200}$/.test(pm) ? pm : null;
      if (!p) { await c.query("rollback"); return no("Elige la tarjeta.", "Choose the card.", { tarjeta: true }); }
      fee = Math.min(await comision(c, "viaje", t.cents), t.cents);
      const cliente = await pasarela.cliente(userId).catch(() => null);
      const ret = await pasarela.retener({ centavos: t.cents, comision: fee, destino: x.cuenta, pm: p, cliente, idem: `precio-${numero}-v${t.v}-${clave}`, meta: { trip: numero, business_id: x.id } });
      if (!ret.ok) { await c.query("rollback"); return no(`${ret.mensaje.es} No se cobró nada.`, `${ret.mensaje.en} Nothing was charged.`, { tarjeta: true }); }
      retenido = ret.pi;
      if (ret.estado === "accion") { await c.query("rollback"); await pasarela.liberar(ret.pi).catch(() => undefined); retenido = null; return no("Tu banco pide una verificación extra. Prueba con otra tarjeta.", "Your bank asks for an extra verification. Try another card.", { tarjeta: true }); }
      await registrarRetencion(c, { opId: o.id, userId, negocio: x.id, city: x.city, total: t.cents, comision: fee, r: ret, pm: p, kind: "full" });
    }
    await c.query(`update written_totals set status = 'accepted', accepted_at = now(), accepted_ip = $2, accepted_extras = '{}' where id = $1::bigint`, [t.id, ip ? String(ip).slice(0, 64) : null]);
    await c.query(`update operations set status = 'confirmed', status_detail = null, total_cents = $2, subtotal_cents = $2, pay_mode = $3, confirmed_at = now(), respond_by = null, updated_at = now() where id = $1::bigint`,
      [o.id, t.cents, x.cuenta ? "app" : "local"]);
    await ev(c, o.id, "quote_ok", "user", userId, { es: `Aceptó el precio cerrado: ${money(t.cents)} (versión ${t.v})`, en: `Accepted the fixed price: ${money(t.cents)} (version ${t.v})` });
    await c.query("commit");
    retenido = null;
  } catch (err) {
    await c.query("rollback").catch(() => undefined);
    if (retenido) await pasarela.liberar(retenido).catch(() => undefined);
    throw err;
  } finally {
    c.release();
  }
  await cobrarOperacion(opId);
  await avisar(numero, "negocio", "biz_precio_ok").catch(() => undefined);
  return ok1;
}
export async function rechazarPrecio(userId: string, numero: string): Promise<ResE> {
  if (!NUM_V.test(numero)) return no("Esa mudanza no existe.", "That move does not exist.");
  const r = await tx(async (c): Promise<ResE> => {
    const o = await op(c, "o.user_id = $1 and o.number = $2", [userId, numero], true);
    if (!o || o.k !== "cotiza" || o.status !== "pending" || o.detail !== "precio") return no("Este precio ya cambió. Actualiza la pantalla.", "This price already changed. Refresh the screen.");
    await c.query(`update written_totals set status = 'declined' where operation_id = $1::bigint and status = 'sent'`, [o.id]);
    await c.query(`update operations set status = 'cancelled', cancelled_by = 'user', cancelled_at = now(), cancel_reason = 'precio_no', updated_at = now() where id = $1::bigint`, [o.id]);
    await ev(c, o.id, "quote_no", "user", userId);
    return ok1;
  });
  if (r.ok) await avisar(numero, "negocio", "biz_precio_no").catch(() => undefined);
  return r;
}

/* ── Los pasos del envío de la caja (Panel › detalle): recogida → salió del almacén (rastreo) → entregada. ── */
export async function pasoEnvio(negocio: string, numero: string, paso: "recogida" | "salio" | "entregada", actorId: string, rastreo?: string): Promise<ResE> {
  if (!NUM_V.test(numero)) return no("Ese envío no existe.", "That shipment does not exist.");
  const code = String(rastreo ?? "").replace(/[^A-Za-z0-9-]/g, "").slice(0, 40);
  let tpl: string | null = null;
  const r = await tx(async (c): Promise<ResE> => {
    const o = await op(c, "o.business_id = $1 and o.number = $2", [negocio, numero], true);
    if (!o || o.k !== "caja") return no("Ese envío no existe.", "That shipment does not exist.");
    if (o.status !== "confirmed") return no("Este envío ya cambió. Actualiza la pantalla.", "This shipment already changed. Refresh the screen.");
    if (paso === "recogida") {
      if (o.detail) return no("Ya la recogiste.", "Already picked up.");
      await c.query(`update operations set status_detail = 'recogida', updated_at = now() where id = $1::bigint`, [o.id]);
      await ev(c, o.id, "box_picked", "member", actorId); tpl = "caja_recogida"; return ok1;
    }
    if (paso === "salio") {
      if (o.detail !== "recogida") return no("Primero marca «Recogida hecha».", "Mark “Picked up” first.");
      if (code.length < 4) return no("Escribe el número de rastreo.", "Write the tracking number.");
      await c.query(`update operations set status_detail = 'camino', details = details || $2::jsonb, updated_at = now() where id = $1::bigint`, [o.id, JSON.stringify({ tracking: { code }, departed: new Date().toISOString() })]);
      await ev(c, o.id, "box_departed", "member", actorId, { es: `Salió del almacén · rastreo ${code}`, en: `Left the warehouse · tracking ${code}` }); tpl = "caja_salio"; return ok1;
    }
    if (o.detail !== "camino") return no("Primero marca «Salió del almacén».", "Mark “Left the warehouse” first.");
    await c.query(`update operations set status = 'done', status_detail = 'entregada', done_at = now(), updated_at = now() where id = $1::bigint`, [o.id]);
    await ev(c, o.id, "box_delivered", "member", actorId); tpl = "caja_entregada";
    // El destinatario se borra a los 30 días de entregada, con las notas cifradas (borrarNotas, lib/citas-flujo.ts).
    return ok1;
  });
  if (r.ok && tpl) await avisar(numero, "cliente", tpl, { rastreo: code }).catch(() => undefined);
  return r;
}
