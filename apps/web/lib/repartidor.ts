import "server-only";
import { randomInt } from "node:crypto";
import type { PoolClient } from "pg";
import { cobrarOperacion } from "./cobros";
import { cfgSql, valor } from "./config";
import { db, tx } from "./db";
import { empezar as empezarRuta, type RutaToken } from "./ruta";

/* 9n · ¿Tiene una suspensión vigente o un baneo (Super Admin › Repartidores)? Lo decide la base (repartidor_sancionado). */
export async function sancionVigente(userId: string): Promise<"suspension" | "baneo" | null> {
  return (await db().query<{ k: "suspension" | "baneo" | null }>(`select repartidor_sancionado($1::uuid) as k`, [userId])).rows[0]?.k ?? null;
}

/* App To'Latino Repartidor (bloque 2l · plan apps-delivery-checkin.md §1, v1.0 = repartidor del propio negocio).
   El servidor decide: solo el repartidor asignado mueve su pedido, un paso a la vez y en orden; el efectivo cobrado queda
   registrado para el cuadre con el negocio; cada paso queda en la línea de tiempo del pedido (y en la del cliente). */
type Bi = { es: string; en: string };
export type ResR = { ok: true } | { ok: false; msg: Bi };
const no = (es: string, en: string): ResR => ({ ok: false, msg: { es, en } });
const money = (c: number) => `$${(c / 100).toFixed(2)}`;
const ALFA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sin 0/O ni 1/I/L: se dicta por teléfono sin confundir
export const VEHICULOS = ["pie", "bici", "moto", "auto", "camioneta"] as const;
export type Vehiculo = (typeof VEHICULOS)[number];

/* ── Panel › Entrega › Tus repartidores ── */
export type RepPanel = { id: string; nombre: string; tel: string; vehiculo: Vehiculo | null; estado: "invited" | "active"; enLinea: boolean; codigo: string | null; vence: string | null;
  hoy: { entregas: number; efectivo: number; activos: number } };
export async function repartidoresDe(negocio: string): Promise<RepPanel[]> {
  const r = await db().query<{ id: string; nombre: string; tel: string; vehiculo: Vehiculo | null; estado: "invited" | "active"; online: boolean; codigo: string | null; vence: string | null; entregas: number; efectivo: number; activos: number }>(
    `select d.id::text, d.display_name as nombre, d.phone as tel, d.vehicle as vehiculo, d.status as estado, d.online, d.invite_code as codigo,
            case when d.status = 'invited' then to_char(d.invite_expires_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') end as vence,
            (select count(*)::int from operations o join cities c on c.id = o.city_id where o.driver_id = d.id and o.kind = 'order' and o.status = 'done' and (o.done_at at time zone c.timezone)::date = (now() at time zone c.timezone)::date) as entregas,
            (select coalesce(sum(o.cash_collected_cents), 0)::int from operations o join cities c on c.id = o.city_id where o.driver_id = d.id and o.kind = 'order' and (o.cash_collected_at at time zone c.timezone)::date = (now() at time zone c.timezone)::date) as efectivo,
            (select count(*)::int from operations o where o.driver_id = d.id and o.kind = 'order' and o.status = 'confirmed') as activos
       from delivery_drivers d where d.business_id = $1 and d.status in ('invited', 'active') order by d.status = 'active' desc, d.display_name`, [negocio]);
  return r.rows.map((x) => ({ id: x.id, nombre: x.nombre, tel: x.tel, vehiculo: x.vehiculo, estado: x.estado, enLinea: x.online, codigo: x.estado === "invited" ? x.codigo : null, vence: x.vence,
    hoy: { entregas: x.entregas, efectivo: x.efectivo, activos: x.activos } }));
}

export async function invitarRepartidor(negocio: string, actorId: string, nombre: string, tel: string): Promise<{ ok: true; codigo: string } | { ok: false; msg: Bi }> {
  const n = String(nombre ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
  if (n.length < 2) return { ok: false, msg: { es: "Escribe su nombre.", en: "Write their name." } };
  const hoy = (await db().query<{ n: number }>(`select count(*)::int as n from delivery_drivers where business_id = $1 and created_at > now() - interval '1 day'`, [negocio])).rows[0]!.n;
  if (hoy >= 15) return { ok: false, msg: { es: "Invitaste a muchos repartidores hoy. Prueba mañana.", en: "You invited many drivers today. Try tomorrow." } };
  for (let i = 0; i < 5; i++) {
    const codigo = Array.from({ length: 6 }, () => ALFA[randomInt(ALFA.length)]).join("");
    try {
      await db().query(`insert into delivery_drivers (business_id, display_name, phone, invite_code, invite_expires_at, invited_by) values ($1, $2, $3, $4, now() + interval '7 days', $5)`, [negocio, n, tel, codigo, actorId]);
      return { ok: true, codigo };
    } catch (e) {
      const c = e as { code?: string; constraint?: string };
      if (c.code === "23505" && c.constraint === "delivery_drivers_tel_idx") return { ok: false, msg: { es: "Ese teléfono ya está en tus repartidores.", en: "That phone is already one of your drivers." } };
      if (c.code !== "23505") throw e;
    }
  }
  return { ok: false, msg: { es: "No se pudo crear el código. Prueba de nuevo.", en: "Could not create the code. Try again." } };
}

export async function quitarRepartidor(negocio: string, id: string, motivo: string): Promise<ResR> {
  if (!/^\d{1,18}$/.test(id)) return no("Ese repartidor no existe.", "That driver does not exist.");
  return tx(async (c) => {
    const d = (await c.query<{ id: string }>(`update delivery_drivers set status = 'removed', removed_at = now(), removed_reason = $3, online = false, invite_code = null where id = $1::bigint and business_id = $2 and status <> 'removed' returning id::text`, [id, negocio, String(motivo ?? "").slice(0, 200) || null])).rows[0];
    if (!d) return no("Ese repartidor ya no está.", "That driver is no longer there.");
    // Lo que tenía asignado y no entregó vuelve a «sin repartidor» para que el negocio lo asigne a otro.
    await c.query(`update operations set driver_id = null where driver_id = $1::bigint and kind = 'order' and status = 'confirmed'`, [id]);
    // 4y-3b: y las salidas de Transporte que todavía no salieron (el negocio pone otro chofer).
    await c.query(`update trip_runs set driver_id = null, updated_at = now() where driver_id = $1::bigint and status = 'scheduled'`, [id]);
    return { ok: true } as const;
  });
}

/* Despacho: asignar (o quitar) el repartidor de un pedido de delivery con tu equipo. */
export async function asignarRepartidor(negocio: string, numero: string, driverId: string | null, actorId: string): Promise<ResR & { aviso?: { uid: string; vars: Record<string, string> } }> {
  if (!/^\d{1,12}$/.test(numero) || (driverId !== null && !/^\d{1,18}$/.test(driverId))) return no("Ese pedido no existe.", "That order does not exist.");
  return tx(async (c) => {
    const o = (await c.query<{ id: string; status: string; mode: string; who: string; stage: string | null; calle: string | null; negocio: string }>(
      `select o.id::text, o.status, coalesce(o.mode, 'pickup') as mode, coalesce(d.who, 'team') as who, o.stage, o.details->'to'->>'street' as calle, b.name as negocio
         from operations o join businesses b on b.id = o.business_id left join delivery_settings d on d.business_id = o.business_id
        where o.business_id = $1 and o.number = $2 and o.kind = 'order' for update of o`, [negocio, numero])).rows[0];
    if (!o) return no("Ese pedido no existe.", "That order does not exist.");
    if (o.mode !== "delivery" || o.status !== "confirmed" || o.stage === "delivered") return no("Solo se asigna un delivery aceptado que no se ha entregado.", "Only an accepted, undelivered delivery can be assigned.");
    if (o.who === "external") return no("Este negocio entrega con una app externa.", "This business delivers with an external app.");
    if (driverId === null) {
      await c.query(`update operations set driver_id = null, updated_at = now() where id = $1::bigint`, [o.id]);
      await c.query(`insert into operation_events (operation_id, kind, actor, actor_id) values ($1::bigint, 'driver_unassigned', 'member', $2)`, [o.id, actorId]);
      return { ok: true } as const;
    }
    const d = (await c.query<{ nombre: string; uid: string | null; sancion: string | null }>(`select display_name as nombre, user_id::text as uid, repartidor_sancionado(user_id) as sancion from delivery_drivers where id = $1::bigint and business_id = $2 and status = 'active'`, [driverId, negocio])).rows[0];
    if (!d) return no("Ese repartidor no está activo.", "That driver is not active.");
    if (d.sancion) return no("To'Latino suspendió a ese repartidor: asígnalo a otro.", "To'Latino suspended that driver: assign someone else.");
    // 9n · Asignar a mano cierra la oferta abierta del pedido (nadie más la puede aceptar).
    await c.query(`update delivery_offers set status = 'cancelled' where operation_id = $1::bigint and status = 'open'`, [o.id]);
    await c.query(`update operations set driver_id = $2::bigint, updated_at = now() where id = $1::bigint`, [o.id, driverId]);
    await c.query(`insert into operation_events (operation_id, kind, actor, actor_id, note) values ($1::bigint, 'driver_assigned', 'member', $2, $3::jsonb)`,
      [o.id, actorId, JSON.stringify({ es: `Asignado a ${d.nombre}`, en: `Assigned to ${d.nombre}` })]);
    return { ok: true, ...(d.uid ? { aviso: { uid: d.uid, vars: { negocio: o.negocio, num: numero, calle: o.calle ?? "" } } } : {}) } as const;
  });
}

/* ── La app del repartidor ── */
export type MiRep = { id: string; negocio: { id: string; nombre: string; tel: string | null }; vehiculo: Vehiculo | null; enLinea: boolean };
export async function misEquipos(userId: string): Promise<MiRep[]> {
  return (await db().query<{ id: string; nid: string; nnombre: string; ntel: string | null; vehiculo: Vehiculo | null; online: boolean }>(
    `select d.id::text, b.id as nid, b.name as nnombre, b.phone as ntel, d.vehicle as vehiculo, d.online from delivery_drivers d join businesses b on b.id = d.business_id
      where d.user_id = $1 and d.status = 'active' order by d.accepted_at`, [userId])).rows.map((x) => ({ id: x.id, negocio: { id: x.nid, nombre: x.nnombre, tel: x.ntel }, vehiculo: x.vehiculo, enLinea: x.online }));
}

export async function aceptarInvitacion(userId: string, tel: string, codigo: string, vehiculo: string): Promise<ResR & { negocio?: string }> {
  const k = String(codigo ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (k.length !== 6) return no("El código tiene 6 letras y números.", "The code has 6 letters and numbers.");
  if (!(VEHICULOS as readonly string[]).includes(vehiculo)) return no("Elige cómo repartes.", "Choose how you deliver.");
  // Tope de intentos por persona: no se adivinan códigos.
  const intentos = (await db().query<{ n: number }>(`select count(*)::int as n from audit_entries where actor_id = $1 and action = 'repartidor.codigo_malo' and at > now() - interval '1 hour'`, [userId])).rows[0]!.n;
  if (intentos >= 8) return no("Muchos intentos. Espera una hora o pídele al negocio un código nuevo.", "Too many tries. Wait an hour or ask the business for a new code.");
  if ((await sancionVigente(userId)) === "baneo") return no("Tu cuenta no puede repartir en To'Latino.", "Your account cannot deliver on To'Latino.");
  return tx(async (c) => {
    const d = (await c.query<{ id: string; phone: string; vivo: boolean; negocio: string; city: string }>(
      `select d.id::text, d.phone, d.invite_expires_at > now() as vivo, d.business_id as negocio, b.city_id as city from delivery_drivers d join businesses b on b.id = d.business_id
        where d.invite_code = $1 and d.status = 'invited' for update of d`, [k])).rows[0];
    const malo = async () => { await c.query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, after) values ('user', $1, 'repartidor.codigo_malo', 'driver', '{}'::jsonb)`, [userId]); };
    if (!d) { await malo(); return no("Ese código no existe o ya se usó. Pídele al negocio uno nuevo.", "That code does not exist or was already used. Ask the business for a new one."); }
    if (!d.vivo) return no("Ese código venció. Pídele al negocio uno nuevo.", "That code expired. Ask the business for a new one.");
    if (d.phone !== tel) { await malo(); return no("Ese código es para otro teléfono. Entra con el número que le diste al negocio.", "That code is for another phone. Sign in with the number you gave the business."); }
    await c.query(`update delivery_drivers set user_id = $2, status = 'active', vehicle = $3, invite_code = null, accepted_at = now() where id = $1::bigint`, [d.id, userId, vehiculo]);
    await c.query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, after) values ('user', $1, 'repartidor.aceptar', 'business', $2, $3, $4::jsonb)`,
      [userId, d.negocio, d.city, JSON.stringify({ vehiculo })]);
    return { ok: true, negocio: d.negocio } as const;
  });
}

export async function enLinea(userId: string, id: string, on: boolean): Promise<ResR> {
  // 9n · Con una suspensión o un baneo vigentes (Super Admin › Repartidores) no se pone en línea; apagarse siempre se puede.
  if (on && (await sancionVigente(userId))) return no("Tu cuenta de repartidor está suspendida. Te avisamos el motivo por mensaje.", "Your driver account is suspended. We sent you the reason.");
  const r = await db().query(`update delivery_drivers set online = $3, online_at = case when $3 then now() else online_at end where id = $1::bigint and user_id = $2 and status = 'active'`, [id, userId, !!on]);
  return r.rowCount ? { ok: true } : no("Ya no estás en ese equipo.", "You are no longer on that team.");
}

export type EntregaRep = {
  // 9n · Sin teléfono del cliente (§6 #20, guardián sinTelefonoAlRepartidor): se le escribe por la app o se llama al negocio.
  numero: string; negocio: { id: string; nombre: string; direccion: string | null; tel: string | null }; cliente: string;
  calle: string | null; apto: string | null; zip: string | null; mi: number | null; entrega: { drop: string; at: string[]; note: string } | null;
  lineas: { q: number; name: Bi }[]; total: number; propina: number; efectivo: number | null; pagado: boolean;
  stage: string; status: string; listo: string | null; llega: string | null; llegue: boolean; at: string; empezo: boolean;
  // 9n · Lo que pide el negocio: código de recogida (que el negocio te dice) y prueba de entrega (foto o el código que te dice el cliente).
  pideRecogida: boolean; recogido: boolean; pidePrueba: boolean; codigoAgotado: boolean; mensajes: number; foto: boolean;
};
const ESTADO_SQL = `o.kind = 'order' and coalesce(o.mode, 'pickup') = 'delivery'`;
/* Las entregas de hoy del repartidor: activas primero (con lo necesario para entregar) y las terminadas de hoy. */
export async function misEntregas(userId: string, numero?: string): Promise<EntregaRep[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = await db().query<{ number: string; bid: string; bname: string; baddr: string | null; btel: string | null; first_name: string | null; last_name: string | null; det: Record<string, any>;
    total_cents: number; tip_cents: number; pay_mode: string; stage: string | null; status: string; listo: string | null; at: string; llegue: boolean; empezo: boolean; lineas: { q: number; name: Bi }[];
    pide_rec: boolean; recogido: boolean; pide_prueba: boolean; agotado: boolean; mensajes: number; foto: boolean }>(
    `select o.number, b.id as bid, b.name as bname, b.address as baddr, b.phone as btel, u.first_name, u.last_name, o.details as det, o.total_cents, o.tip_cents, o.pay_mode, o.stage, o.status,
            coalesce(ds.pickup_code, false) as pide_rec, dc.recogido_at is not null as recogido, coalesce(ds.proof, false) as pide_prueba,
            coalesce(dc.intentos, 0) >= ${cfgSql("entrega_codigo_intentos")} as agotado,
            (select count(*)::int from delivery_messages m where m.operation_id = o.id) as mensajes,
            exists (select 1 from delivery_proofs p where p.operation_id = o.id and p.kind = 'foto') as foto,
            to_char(o.ready_at at time zone c.timezone, 'HH24:MI') as listo, to_char(coalesce(o.done_at, o.confirmed_at, o.sent_at) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at,
            exists (select 1 from operation_events e where e.operation_id = o.id and e.kind = 'driver_arrived') as llegue,
            exists (select 1 from operation_events e where e.operation_id = o.id and e.kind = 'driver_started') as empezo,
            coalesce((select json_agg(json_build_object('q', l.qty, 'name', l.name) order by l.id) from operation_lines l where l.operation_id = o.id), '[]') as lineas
       from operations o join delivery_drivers d on d.id = o.driver_id join businesses b on b.id = o.business_id join users u on u.id = o.user_id join cities c on c.id = o.city_id
            left join delivery_settings ds on ds.business_id = o.business_id left join delivery_codes dc on dc.operation_id = o.id
      where d.user_id = $1 and ${ESTADO_SQL} and ($2::text is null or o.number = $2)
        and (o.status = 'confirmed' or (o.status = 'done' and (o.done_at at time zone c.timezone)::date = (now() at time zone c.timezone)::date))
      order by (o.status = 'confirmed') desc, o.ready_at nulls last, o.id desc limit 50`, [userId, numero ?? null]);
  const h = (v: string | null) => { if (!v) return null; const [a = 0, m = 0] = v.split(":").map(Number); return `${a % 12 || 12}:${String(m).padStart(2, "0")} ${a < 12 ? "AM" : "PM"}`; };
  return r.rows.map((x) => {
    const to = x.det?.to ?? {}, eta = x.det?.eta;
    return {
      numero: x.number, negocio: { id: x.bid, nombre: x.bname, direccion: x.baddr, tel: x.btel }, cliente: [x.first_name, x.last_name ? `${x.last_name[0]}.` : ""].filter(Boolean).join(" ") || "—",
      calle: to.street ?? null, apto: to.apt ?? null, zip: to.zip ?? null, mi: to.mi ?? null, entrega: x.det?.drop ?? null,
      lineas: x.lineas, total: x.total_cents, propina: x.tip_cents, efectivo: x.pay_mode === "entrega" ? x.total_cents : null, pagado: x.pay_mode === "app",
      stage: x.stage ?? "accepted", status: x.status, listo: h(x.listo), llega: eta ? `${h(`${Math.floor(eta.d1 / 60)}:${eta.d1 % 60}`)}–${h(`${Math.floor(eta.d2 / 60)}:${eta.d2 % 60}`)}` : null,
      llegue: x.llegue, at: x.at, empezo: x.empezo,
      pideRecogida: x.pide_rec, recogido: x.recogido, pidePrueba: x.pide_prueba, codigoAgotado: x.agotado, mensajes: x.mensajes, foto: x.foto,
    };
  });
}

/* Un paso del repartidor: «Voy por el pedido» (opcional) → «Recogí, voy en camino» → «Llegué» → «Entregado» (con el efectivo cobrado si toca).
   8e · El paso que inicia la entrega («Voy por el pedido», o «Recogí» si no se tocó antes) abre la ruta en vivo y devuelve el token del teléfono
   (lib/ruta.ts): ningún otro camino la abre. El negocio la ve desde ahí; el cliente, desde «Recogí». «Entregado» (o cancelar, o quitar el
   repartidor) la cierra en la base (trigger operations_ruta). */
export type PasoRep = "empezar" | "recogi" | "llegue" | "entregado";
/* 9n · La prueba que trae el paso: el código que te dicen (de recogida en «Recogí», del cliente en «Entregado») o la foto ya subida
   (/api/repartidor/foto, id del media). El servidor la compara; nunca le manda los códigos al teléfono. */
export type PruebaRep = { codigo?: string; foto?: string };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export async function pasoRepartidor(userId: string, numero: string, paso: PasoRep, efectivo?: number, prueba: PruebaRep = {}): Promise<ResR & { aviso?: { tpl: string; numero: string }; op?: string; ruta?: RutaToken | null }> {
  if (!/^\d{1,12}$/.test(numero) || !["empezar", "recogi", "llegue", "entregado"].includes(paso)) return no("Ese pedido no existe.", "That order does not exist.");
  const codigo = String(prueba.codigo ?? "").replace(/\D/g, "").slice(0, 4), foto = UUID.test(String(prueba.foto ?? "")) ? String(prueba.foto) : null;
  const maxIntentos = await valor("entrega_codigo_intentos");
  let incidente: string | null = null;
  const r = await tx(async (c: PoolClient) => {
    const o = (await c.query<{ id: string; status: string; stage: string | null; pay: string; total: number; did: string; city: string; negocio: string; pide_rec: boolean; pide_prueba: boolean }>(
      `select o.id::text, o.status, o.stage, o.pay_mode as pay, o.total_cents as total, d.id::text as did, o.city_id as city, o.business_id as negocio,
              coalesce(ds.pickup_code, false) as pide_rec, coalesce(ds.proof, false) as pide_prueba
         from operations o join delivery_drivers d on d.id = o.driver_id left join delivery_settings ds on ds.business_id = o.business_id
        where o.number = $2 and d.user_id = $1 and d.status = 'active' and ${ESTADO_SQL} for update of o`, [userId, numero])).rows[0];
    if (!o) return no("Este pedido ya no es tuyo. Pregúntale al negocio.", "This order is no longer yours. Ask the business.");
    const ya = ((paso === "recogi" || paso === "empezar") && o.stage === "on_the_way") || (paso === "entregado" && o.status === "done");
    if (ya) return { ok: true } as const; // sin señal: el mismo paso que llega dos veces no hace nada
    if (o.status !== "confirmed") return no("Este pedido ya no está activo.", "This order is no longer active.");
    const ev = (kind: string, note?: Bi) => c.query(`insert into operation_events (operation_id, kind, actor, actor_id, note) values ($1::bigint, $2, 'member', $3, $4::jsonb)`, [o.id, kind, userId, note ? JSON.stringify(note) : null]);
    if (paso === "empezar") {
      const dos = await c.query(`select 1 from operation_events where operation_id = $1::bigint and kind = 'driver_started'`, [o.id]);
      if (!dos.rowCount) await ev("driver_started", { es: "El repartidor va por el pedido", en: "The driver is heading to pick it up" });
      return { ok: true, ruta: await empezarRuta(c, o.id, userId, "empezar") } as const;
    }
    if (paso === "recogi") {
      // 9n · Código de recogida: el negocio te lo dice al darte el pedido (o confirma en su panel que lo recogiste).
      if (o.pide_rec) {
        const k = (await c.query<{ recogida: string; n: number; ok: boolean }>(`select recogida, recogida_intentos as n, recogido_at is not null as ok from delivery_codes where operation_id = $1::bigint for update`, [o.id])).rows[0];
        if (k && !k.ok) {
          if (k.n >= maxIntentos) return no("Muchos intentos con el código. Pídele al negocio que confirme en su panel que te lo dio.", "Too many tries with the code. Ask the business to confirm in its dashboard that it handed it to you.");
          if (!codigo || codigo !== k.recogida) {
            if (codigo) await c.query(`update delivery_codes set recogida_intentos = recogida_intentos + 1 where operation_id = $1::bigint`, [o.id]);
            return no(codigo ? "Ese no es el código de recogida. Pídeselo al negocio." : "Escribe el código de recogida que te da el negocio.", codigo ? "That is not the pickup code. Ask the business for it." : "Type the pickup code the business gives you.");
          }
          await c.query(`update delivery_codes set recogido_at = now() where operation_id = $1::bigint`, [o.id]);
        }
      }
      await c.query(`update operations set stage = 'on_the_way', updated_at = now() where id = $1::bigint`, [o.id]);
      await ev("on_the_way", { es: "El repartidor recogió el pedido", en: "The driver picked up the order" });
      return { ok: true, aviso: { tpl: "ord_way", numero }, ruta: await empezarRuta(c, o.id, userId, "recogi") } as const;
    }
    if (o.stage !== "on_the_way") return no("Primero toca «Recogí, voy en camino».", "First tap “Picked up, on my way”.");
    if (paso === "llegue") {
      const dos = await c.query(`select 1 from operation_events where operation_id = $1::bigint and kind = 'driver_arrived'`, [o.id]);
      if (dos.rowCount) return { ok: true } as const;
      await ev("driver_arrived", { es: "El repartidor llegó", en: "The driver arrived" });
      return { ok: true, aviso: { tpl: "ord_here", numero } } as const;
    }
    // Entregado: en efectivo, el repartidor confirma lo cobrado (el total exacto del pedido).
    if (o.pay === "entrega" && Math.round(Number(efectivo)) !== o.total) return no(`Confirma que cobraste ${money(o.total)} en efectivo.`, `Confirm you collected ${money(o.total)} in cash.`);
    // 9n · Prueba de entrega (guardián entregaConPrueba): la foto que subiste de ESTE pedido, o el código que te dice el cliente. La base vuelve a
    // exigirla (trigger operations_prueba) si el negocio la pide.
    let probada = false;
    if (foto) {
      const m = await c.query(`select 1 from media where id = $1::uuid and owner_kind = 'delivery' and owner_id = $2 and uploaded_by = $3 and private and status = 'visible'`, [foto, o.id, userId]);
      if (!m.rowCount) return no("No encontramos tu foto. Tómala otra vez.", "We could not find your photo. Take it again.");
      await c.query(`insert into delivery_proofs (operation_id, city_id, kind, media_id, driver_id, actor_id) values ($1::bigint, $2, 'foto', $3::uuid, $4::bigint, $5) on conflict (operation_id, kind) do nothing`, [o.id, o.city, foto, o.did, userId]);
      probada = true;
    } else if (codigo) {
      const k = (await c.query<{ cliente: string; n: number }>(`select cliente, intentos as n from delivery_codes where operation_id = $1::bigint for update`, [o.id])).rows[0];
      if (!k || k.n >= maxIntentos) return no("El código ya no sirve para este pedido. Toma la foto de la entrega.", "The code no longer works for this order. Take the delivery photo.");
      if (codigo !== k.cliente) {
        const n = (await c.query<{ n: number }>(`update delivery_codes set intentos = intentos + 1 where operation_id = $1::bigint returning intentos as n`, [o.id])).rows[0]!.n;
        if (n >= maxIntentos) {
          // Al agotarse, queda una incidencia para el equipo (Super Admin › Repartidores) y la entrega se prueba con foto.
          incidente = (await c.query<{ id: string }>(
            `insert into delivery_incidents (operation_id, driver_user, driver_id, business_id, city_id, kind, note) values ($1::bigint, $2, $3::bigint, $4, $5, 'codigo', $6::jsonb)
             on conflict (operation_id, kind) where operation_id is not null and status = 'open' do nothing returning id::text`,
            [o.id, userId, o.did, o.negocio, o.city, JSON.stringify({ es: `El código del cliente falló ${n} veces en el pedido #${numero}.`, en: `The customer code failed ${n} times on order #${numero}.` })])).rows[0]?.id ?? null;
          return { ok: false, msg: { es: "El código no coincide y ya no sirve. Toma la foto de la entrega.", en: "The code does not match and no longer works. Take the delivery photo." } } as const;
        }
        return { ok: false, msg: { es: `Ese no es el código del cliente. Te quedan ${maxIntentos - n} intentos.`, en: `That is not the customer's code. ${maxIntentos - n} tries left.` } } as const;
      }
      await c.query(`insert into delivery_proofs (operation_id, city_id, kind, driver_id, actor_id) values ($1::bigint, $2, 'codigo', $3::bigint, $4) on conflict (operation_id, kind) do nothing`, [o.id, o.city, o.did, userId]);
      probada = true;
    }
    if (o.pide_prueba && !probada) return no("El negocio pide prueba: toma la foto de la entrega o escribe el código que te dice el cliente.", "The business asks for proof: take the delivery photo or type the code the customer gives you.");
    await c.query(`update operations set status = 'done', stage = 'delivered', done_at = now(), cash_collected_cents = case when pay_mode = 'entrega' then total_cents end,
                          cash_collected_at = case when pay_mode = 'entrega' then now() end, updated_at = now() where id = $1::bigint`, [o.id]);
    await ev("delivered", o.pay === "entrega" ? { es: `Entregado · cobró ${money(o.total)} en efectivo`, en: `Delivered · collected ${money(o.total)} cash` } : { es: "Entregado por el repartidor", en: "Delivered by the driver" });
    return { ok: true, op: o.id } as const;
  });
  if (incidente) await (await import("./repartidor-admin")).incidenciaACola(incidente).catch(() => undefined);
  if (r.ok && "op" in r && r.op) await cobrarOperacion(r.op as string).catch(() => undefined); // con tarjeta: ya se cobró al aceptar; esto solo repara
  if (r.ok && "op" in r && r.op) await (await import("./correo/recibos")).reciboPedido(r.op as string); // 2q: recibo por correo
  if (r.ok && "op" in r && r.op) await (await import("./avisos")).avisarEntregado(r.op as string); // 9l: «Tu pedido llegó»
  return r;
}

/* Problemas (hoja): queda en el pedido y le llega al negocio. */
export const PROBLEMAS: Record<string, Bi> = {
  noresponde: { es: "El cliente no responde", en: "Customer not answering" }, direccion: { es: "La dirección está mal", en: "Wrong address" },
  demora: { es: "El negocio se está tardando", en: "The business is running late" }, incompleto: { es: "El pedido está incompleto", en: "Order is incomplete" },
  accidente: { es: "Tuve un accidente o un problema con el vehículo", en: "Accident or vehicle problem" }, otro: { es: "Otro problema", en: "Something else" },
};
export async function problemaRepartidor(userId: string, numero: string, motivo: string, nota: string): Promise<ResR & { aviso?: { negocio: string; vars: Record<string, string> } }> {
  if (!/^\d{1,12}$/.test(numero) || !PROBLEMAS[motivo]) return no("Elige qué pasó.", "Choose what happened.");
  const o = (await db().query<{ id: string; negocio: string; rep: string }>(
    `select o.id::text, o.business_id as negocio, d.display_name as rep from operations o join delivery_drivers d on d.id = o.driver_id
      where o.number = $2 and d.user_id = $1 and d.status = 'active' and o.status = 'confirmed' and ${ESTADO_SQL}`, [userId, numero])).rows[0];
  if (!o) return no("Este pedido ya no es tuyo.", "This order is no longer yours.");
  const n = String(nota ?? "").trim().slice(0, 200), m = PROBLEMAS[motivo]!;
  await db().query(`insert into operation_events (operation_id, kind, actor, actor_id, note) values ($1::bigint, 'driver_issue', 'member', $2, $3::jsonb)`,
    [o.id, userId, JSON.stringify({ es: `Problema: ${m.es}${n ? ` · “${n}”` : ""}`, en: `Problem: ${m.en}${n ? ` · “${n}”` : ""}` })]);
  // 9n · Un accidente le llega también al equipo de To'Latino (Super Admin › Repartidores › Incidencias, cola «entrega»).
  if (motivo === "accidente") {
    const inc = (await db().query<{ id: string }>(
      `insert into delivery_incidents (operation_id, driver_user, driver_id, business_id, city_id, kind, note)
       select o.id, $2, o.driver_id, o.business_id, o.city_id, 'accidente', $3::jsonb from operations o where o.id = $1::bigint
       on conflict (operation_id, kind) where operation_id is not null and status = 'open' do nothing returning id::text`,
      [o.id, userId, JSON.stringify({ es: `Accidente o problema con el vehículo en el pedido #${numero}${n ? `: “${n}”` : ""}.`, en: `Accident or vehicle problem on order #${numero}${n ? `: “${n}”` : ""}.` })])).rows[0];
    if (inc) await (await import("./repartidor-admin")).incidenciaACola(inc.id, true).catch(() => undefined);
  }

  return { ok: true, aviso: { negocio: o.negocio, vars: { repartidor: o.rep, num: numero, motivo: m.es.toLowerCase() } } };
}

/* Ganancias (repartidor del negocio: solo registro): entregas, propinas y efectivo por día, 14 días. */
export async function misGanancias(userId: string) {
  return (await db().query<{ dia: string; entregas: number; propinas: number; efectivo: number }>(
    `select to_char((o.done_at at time zone c.timezone)::date, 'YYYY-MM-DD') as dia, count(*)::int as entregas, coalesce(sum(o.tip_cents), 0)::int as propinas, coalesce(sum(o.cash_collected_cents), 0)::int as efectivo
       from operations o join delivery_drivers d on d.id = o.driver_id join cities c on c.id = o.city_id
      where d.user_id = $1 and o.kind = 'order' and o.status = 'done' and o.done_at > now() - interval '14 days'
      group by 1 order by 1 desc`, [userId])).rows;
}

/* Salir de un equipo (perfil del repartidor). */
export async function salirEquipo(userId: string, id: string): Promise<ResR> {
  const act = (await db().query<{ n: number }>(`select count(*)::int as n from operations o join delivery_drivers d on d.id = o.driver_id where d.id = $1::bigint and d.user_id = $2 and o.status = 'confirmed'`, [id, userId])).rows[0]!.n;
  if (act) return no("Tienes entregas activas. Termínalas o pídele al negocio que las pase a otro.", "You have active deliveries. Finish them or ask the business to reassign them.");
  const r = await db().query(`update delivery_drivers set status = 'removed', removed_at = now(), removed_reason = 'salió', online = false where id = $1::bigint and user_id = $2 and status = 'active'`, [id, userId]);
  return r.rowCount ? { ok: true } : no("Ya no estás en ese equipo.", "You are no longer on that team.");
}
