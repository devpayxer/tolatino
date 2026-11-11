import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { PoolClient } from "pg";
import { auditar, type Staff } from "./admin";
import { valores } from "./config";
import { db, tx } from "./db";

/* 8e · La ruta en vivo del repartidor (fase8-apps.md §4 8e, §6 #14). La ubicación es privada: el servidor decide todo y la base lo vuelve a
   imponer (0128: ruta_activa, delivery_positions_antes). ÚNICO archivo que escribe o lee delivery_positions y delivery_tracks (guardianes
   ubicacionSoloEntregaActiva y rutaSoloDeLosTres).
   - empezar(): SOLO dentro del paso del repartidor que inicia la entrega («Voy por el pedido» o «Recogí», lib/repartidor.ts). Abre la ruta (una
     por entrega) y da un token nuevo al teléfono (se guarda su huella; el anterior deja de servir).
   - reanudar(): la app se volvió a abrir con la entrega en curso → token nuevo, si y solo si la ruta sigue abierta para ESE repartidor.
   - guardarPosiciones(): lo que manda el teléfono (TLRuta nativo o la web). Rechaza todo si la entrega no está activa, no es de ese repartidor o
     de esa ciudad; cada posición, si es de antes de empezar, del futuro, fuera de orden, fuera de la ciudad o a una velocidad imposible.
     Contesta «activa: false» cuando la entrega terminó: el teléfono deja de compartir.
   - Quién la ve (rutaSoloDeLosTres): el cliente de ESE pedido desde «Recogí» (ubic_cliente_desde) y solo la última posición; el negocio de ese
     pedido (miembro con «Hoy y pedidos») desde que empieza, con el rastro; el Super Admin con motivo anotado (rutaAdmin). Nadie más: el SSE de
     una entrega ajena es 404.
   La entrega termina sola en la base (trigger operations_ruta): entregado, cancelado, sin repartidor u otro. */

export type Pos = { lat: number; lng: number; at: string; acc: number | null };
export type RutaToken = { token: string; numero: string; negocio: string; cadaS: number; minM: number };
const MAX_LOTE = 60;
const huella = (t: string) => createHash("sha256").update(t).digest("hex");
const ISO = (c: string) => `to_char(${c} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;

async function encendida(c?: PoolClient): Promise<boolean> {
  const r = await (c ?? db()).query<{ on: boolean }>(`select enabled as on from feature_flags where key = 'app.ubicacion_vivo'`);
  return !!r.rows[0]?.on; // una bandera que no existe cuenta como apagada
}
async function ritmo() {
  const v = await valores("ubic_cada_s", "ubic_min_m");
  return { cadaS: v.ubic_cada_s, minM: v.ubic_min_m };
}

/* Abre la ruta de una entrega (dentro de la transacción del paso; la operación ya está bloqueada por ese paso) o, si ya está abierta para este
   repartidor, le da un token nuevo. null = interruptor apagado o la entrega no es de este repartidor. */
export async function empezar(c: PoolClient, opId: string, userId: string, paso: "empezar" | "recogi"): Promise<RutaToken | null> {
  if (!(await encendida(c))) return null;
  const o = (await c.query<{ id: string; numero: string; city: string; biz: string; negocio: string; did: string; stage: string | null }>(
    `select o.id::text, o.number as numero, o.city_id as city, o.business_id as biz, b.name as negocio, d.id::text as did, o.stage
       from operations o join delivery_drivers d on d.id = o.driver_id join businesses b on b.id = o.business_id
      where o.id = $1::bigint and d.user_id = $2 and d.status = 'active' and o.kind = 'order' and coalesce(o.mode, 'pickup') = 'delivery'
        and o.status = 'confirmed' and coalesce(o.stage, '') <> 'delivered'`, [opId, userId])).rows[0];
  if (!o) return null;
  const token = randomBytes(32).toString("base64url");
  const ya = (await c.query<{ id: string; rider: string }>(`select id::text, rider_user_id::text as rider from delivery_tracks where operation_id = $1::bigint and sharing_until is null for update`, [o.id])).rows[0];
  if (ya && ya.rider !== userId) return null; // no pasa: cambiar de repartidor cierra la ruta (trigger); defensa igual
  if (ya) await c.query(`update delivery_tracks set token_hash = $2, token_at = now() where id = $1::bigint`, [ya.id, huella(token)]);
  else await c.query(
    `insert into delivery_tracks (operation_id, city_id, business_id, rider_user_id, driver_id, started_step, token_hash, token_at, customer_from)
     values ($1::bigint, $2, $3, $4, $5::bigint, $6, $7, now(), case when $8 = 'on_the_way' then now() end)`,
    [o.id, o.city, o.biz, userId, o.did, paso, huella(token), o.stage]);
  return { token, numero: o.numero, negocio: o.negocio, ...(await ritmo()) };
}

/* La app se abrió otra vez con la entrega en curso: token nuevo solo si la ruta sigue abierta para ESTE repartidor (nunca abre una). */
export async function reanudar(userId: string, numero: string): Promise<RutaToken | null> {
  if (!/^\d{1,12}$/.test(numero)) return null;
  return tx(async (c) => {
    const t = (await c.query<{ id: string; op: string; city: string }>(
      `select t.id::text, t.operation_id::text as op, t.city_id as city from delivery_tracks t join operations o on o.id = t.operation_id
        where o.number = $1 and o.kind = 'order' and t.rider_user_id = $2 and t.sharing_until is null for update of t`, [numero, userId])).rows[0];
    if (!t || !(await encendida(c))) return null;
    if (!(await c.query<{ ok: boolean }>(`select ruta_activa($1::bigint, $2::uuid, $3) as ok`, [t.op, userId, t.city])).rows[0]?.ok) return null;
    const token = randomBytes(32).toString("base64url");
    await c.query(`update delivery_tracks set token_hash = $2, token_at = now() where id = $1::bigint`, [t.id, huella(token)]);
    const n = (await c.query<{ negocio: string }>(`select b.name as negocio from businesses b join operations o on o.business_id = b.id where o.id = $1::bigint`, [t.op])).rows[0];
    return { token, numero, negocio: n?.negocio ?? "", ...(await ritmo()) };
  });
}

/* Las entregas de este repartidor con la ruta abierta (la banda «Compartiendo tu ubicación»). */
export async function misRutas(userId: string): Promise<{ numero: string; negocio: string; desde: string; ultima: string | null }[]> {
  return (await db().query<{ numero: string; negocio: string; desde: string; ultima: string | null }>(
    `select o.number as numero, b.name as negocio, ${ISO("t.sharing_from")} as desde, ${ISO("t.last_position_at")} as ultima
       from delivery_tracks t join operations o on o.id = t.operation_id join businesses b on b.id = t.business_id
      where t.rider_user_id = $1 and t.sharing_until is null order by t.sharing_from limit 10`, [userId])).rows;
}

/* ── Lo que manda el teléfono ── */
type Cruda = { t?: unknown; lat?: unknown; lng?: unknown; acc?: unknown; vel?: unknown; rumbo?: unknown };
export type ResPos = { activa: boolean; aceptadas: number; rechazadas: number; cadaS?: number; minM?: number };
const num = (v: unknown, a: number, b: number) => (typeof v === "number" && Number.isFinite(v) && v >= a && v <= b ? v : null);
const RT = 6371008.8, rad = (g: number) => (g * Math.PI) / 180;
function metros(a: [number, number], b: [number, number]) {
  const dLat = rad(b[0] - a[0]), dLng = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * RT * Math.asin(Math.min(1, Math.sqrt(h)));
}
export async function guardarPosiciones(token: string, cuerpo: unknown, fuente: "app" | "web"): Promise<ResPos | null> {
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const t = (await db().query<{ id: string; op: string; rider: string; city: string; desde: string; ultima: string | null; ulat: number | null; ulng: number | null; uacc: number | null; clat: number; clng: number }>(
    `select t.id::text, t.operation_id::text as op, t.rider_user_id::text as rider, t.city_id as city, ${ISO("t.sharing_from")} as desde, ${ISO("t.last_position_at")} as ultima,
            st_y(t.last_geom::geometry) as ulat, st_x(t.last_geom::geometry) as ulng, t.last_accuracy_m as uacc, st_y(c.center::geometry) as clat, st_x(c.center::geometry) as clng
       from delivery_tracks t join cities c on c.id = t.city_id where t.token_hash = $1 and t.sharing_until is null`, [huella(token)])).rows[0];
  if (!t) return null; // token desconocido, rotado o de una ruta terminada: el teléfono deja de compartir
  const activa = !!(await db().query<{ ok: boolean }>(`select ruta_activa($1::bigint, $2::uuid, $3) as ok`, [t.op, t.rider, t.city])).rows[0]?.ok && (await encendida());
  if (!activa) return { activa: false, aceptadas: 0, rechazadas: 0 };
  const lista = Array.isArray((cuerpo as { p?: unknown })?.p) ? ((cuerpo as { p: Cruda[] }).p).slice(0, MAX_LOTE) : [];
  const { ubic_vel_max_mps: vmax, ubic_cada_s: cadaS, ubic_min_m: minM } = await valores("ubic_vel_max_mps", "ubic_cada_s", "ubic_min_m");
  const ahora = Date.now(), desde = Date.parse(t.desde) - 5000;
  let ult = t.ultima ? { at: Date.parse(t.ultima), ll: [Number(t.ulat), Number(t.ulng)] as [number, number], acc: t.uacc ?? 0 } : null;
  const ok: { at: number; lat: number; lng: number; acc: number | null; vel: number | null; rumbo: number | null }[] = [];
  const crudas = lista.map((x) => ({ at: num(x?.t, 1e12, 1e13), lat: num(x?.lat, -90, 90), lng: num(x?.lng, -180, 180), acc: num(x?.acc, 0, 500), vel: num(x?.vel, 0, 100), rumbo: num(x?.rumbo, 0, 359.999) }))
    .sort((a, b) => (a.at ?? 0) - (b.at ?? 0));
  for (const x of crudas) {
    if (x.at == null || x.lat == null || x.lng == null) continue;
    if (x.at < desde || x.at > ahora + 60_000) continue; // de antes de empezar o del futuro
    if (metros([x.lat, x.lng], [Number(t.clat), Number(t.clng)]) > 100_000) continue; // fuera de la ciudad
    if (ult) {
      if (x.at <= ult.at) continue; // repetida o fuera de orden
      const seg = Math.max(1, (x.at - ult.at) / 1000), m = metros(ult.ll, [x.lat, x.lng]) - ult.acc - (x.acc ?? 0);
      if (m / seg > vmax) continue; // velocidad imposible
    }
    ok.push({ at: x.at, lat: x.lat, lng: x.lng, acc: x.acc, vel: x.vel, rumbo: x.rumbo });
    ult = { at: x.at, ll: [x.lat, x.lng], acc: x.acc ?? 0 };
  }
  let aceptadas = 0;
  const insertar = (L: typeof ok) => {
    const v: unknown[] = [t.op, t.rider, t.city, fuente];
    const filas = L.map((p) => { v.push(new Date(p.at).toISOString(), p.lng, p.lat, p.acc, p.vel, p.rumbo); const k = v.length;
      return `($1::bigint, $2::uuid, $3, $${k - 5}::timestamptz, st_setsrid(st_makepoint($${k - 4}, $${k - 3}), 4326)::geography, $${k - 2}::real, $${k - 1}::real, $${k}::real, $4)`; });
    return db().query(`insert into delivery_positions (operation_id, rider_user_id, city_id, at, geom, accuracy_m, speed_mps, heading, source) values ${filas.join(", ")}`, v);
  };
  if (ok.length) {
    try { await insertar(ok); aceptadas = ok.length; }
    catch { for (const p of ok) { try { await insertar([p]); aceptadas++; } catch { /* la base la rechazó (otra lectura llegó antes, o terminó) */ } } }
  }
  const rechazadas = lista.length - aceptadas;
  if (rechazadas > 0) await db().query(`update delivery_tracks set rejected_n = rejected_n + $2 where id = $1::bigint`, [t.id, rechazadas]).catch(() => undefined);
  // ¿Sigue activa después de guardar? (la entrega pudo terminar entre medio)
  const sigue = !!(await db().query<{ ok: boolean }>(`select ruta_activa($1::bigint, $2::uuid, $3) as ok`, [t.op, t.rider, t.city])).rows[0]?.ok;
  return { activa: sigue, aceptadas, rechazadas, cadaS, minM };
}

/* ── Quién la ve ── */
type Vista = { estado: "vivo"; pos: Pos | null; desde: string; rastro?: [number, number][]; destino?: [number, number] | null; viejaS: number } | { estado: "fin" };
async function vista(op: string, conRastro: boolean, desdeCliente: boolean): Promise<Vista | null> {
  const t = (await db().query<{ id: string; abierta: boolean; desde: string; cliente: string | null; lat: number | null; lng: number | null; at: string | null; acc: number | null; dlat: number | null; dlng: number | null }>(
    `select t.id::text, t.sharing_until is null as abierta, ${ISO("t.sharing_from")} as desde, ${ISO("t.customer_from")} as cliente,
            st_y(t.last_geom::geometry) as lat, st_x(t.last_geom::geometry) as lng, ${ISO("t.last_position_at")} as at, t.last_accuracy_m as acc,
            st_y(a.geo::geometry) as dlat, st_x(a.geo::geometry) as dlng
       from delivery_tracks t join operations o on o.id = t.operation_id
       left join user_addresses a on a.id::text = o.details->'to'->>'addressId' and a.user_id = o.user_id
      where t.operation_id = $1::bigint order by t.sharing_until is null desc, t.sharing_from desc limit 1`, [op])).rows[0];
  if (!t) return null;
  if (desdeCliente && !t.cliente) return null; // el cliente no ve nada antes de «Recogí»
  if (!t.abierta) return { estado: "fin" };
  const viejaS = (await valores("ubic_vieja_s")).ubic_vieja_s;
  const pos = t.lat != null && t.lng != null && t.at ? { lat: Number(t.lat), lng: Number(t.lng), at: t.at, acc: t.acc == null ? null : Math.round(Number(t.acc)) } : null;
  const destino: [number, number] | null = t.dlat != null && t.dlng != null ? [Number(t.dlat), Number(t.dlng)] : null;
  if (!conRastro) return { estado: "vivo", pos, desde: t.cliente ?? t.desde, destino, viejaS };
  const r = await db().query<{ lat: number; lng: number }>(
    `select st_y(geom::geometry) as lat, st_x(geom::geometry) as lng from (select geom, at from delivery_positions where operation_id = $1::bigint and at >= $2::timestamptz order by at desc limit 120) x order by at`,
    [op, t.desde]);
  return { estado: "vivo", pos, desde: t.desde, rastro: r.rows.map((x) => [Number(x.lat), Number(x.lng)] as [number, number]), destino, viejaS };
}

/* El cliente de ESE pedido: solo la última posición, desde «Recogí» (ubic_cliente_desde = 1). null = no la ve (el SSE contesta 404). */
export async function rutaCliente(userId: string, numero: string): Promise<Vista | null> {
  if (!/^\d{1,12}$/.test(numero) || (await valores("ubic_cliente_desde")).ubic_cliente_desde !== 1) return null;
  const o = (await db().query<{ id: string }>(`select id::text from operations where number = $1 and kind = 'order' and user_id = $2 and coalesce(mode, 'pickup') = 'delivery'`, [numero, userId])).rows[0];
  if (!o || !(await encendida())) return null;
  return vista(o.id, false, true);
}
/* ¿El cliente puede abrir el mapa ahora? (la pantalla del pedido decide si lo monta; el SSE lo vuelve a revisar). */
export async function clienteVeRuta(userId: string, numero: string): Promise<boolean> {
  const v = await rutaCliente(userId, numero);
  return v?.estado === "vivo";
}

/* El negocio de ESE pedido (la acción o el SSE ya revisaron accesoPanel con «ord»): la posición y el rastro desde que empezó. */
export async function rutaNegocio(negocioId: string, numero: string): Promise<Vista | null> {
  if (!/^\d{1,12}$/.test(numero)) return null;
  const o = (await db().query<{ id: string }>(`select id::text from operations where number = $1 and kind = 'order' and business_id = $2 and coalesce(mode, 'pickup') = 'delivery'`, [numero, negocioId])).rows[0];
  if (!o || !(await encendida())) return null;
  return vista(o.id, true, false);
}
/* El id de la operación para escuchar sus cambios (SSE), solo después de revisar quién mira. */
export async function idEntrega(numero: string): Promise<string | null> {
  if (!/^\d{1,12}$/.test(numero)) return null;
  return (await db().query<{ id: string }>(`select id::text from operations where number = $1 and kind = 'order'`, [numero])).rows[0]?.id ?? null;
}

/* El Super Admin: el recorrido completo de una entrega (todas sus rutas) mientras no se purgue. Pide permiso tx:ver, que el pedido sea de sus
   ciudades y un motivo, que queda en la auditoría ANTES de devolver nada. */
export type RutaAdmin = { numero: string; negocio: string; ciudad: string; rutas: { desde: string; hasta: string | null; fin: string | null; paso: string; distancia: number; n: number; rechazadas: number; purgada: boolean }[];
  puntos: { lat: number; lng: number; at: string; acc: number | null; src: string }[]; destino: [number, number] | null };
export async function rutaAdmin(s: Staff, numero: string, motivo: string): Promise<{ ok: true; r: RutaAdmin } | { ok: false; msg: string }> {
  if (!s.puede("tx", "ver")) return { ok: false, msg: "Tu rol no ve transacciones." };
  if (!/^\d{1,12}$/.test(String(numero ?? ""))) return { ok: false, msg: "Ese pedido no existe." };
  const m = String(motivo ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, 300);
  if (m.length < 10) return { ok: false, msg: "Escribe el motivo (al menos 10 letras): ver la ruta de una persona queda en la auditoría." };
  return tx(async (c) => {
    const o = (await c.query<{ id: string; city: string; negocio: string; dlat: number | null; dlng: number | null }>(
      `select o.id::text, o.city_id as city, b.name as negocio, st_y(a.geo::geometry) as dlat, st_x(a.geo::geometry) as dlng
         from operations o join businesses b on b.id = o.business_id left join user_addresses a on a.id::text = o.details->'to'->>'addressId' and a.user_id = o.user_id
        where o.number = $1 and o.kind = 'order' and (cardinality($2::text[]) = 0 or o.city_id = any($2::text[]))`, [numero, s.cities])).rows[0];
    if (!o) return { ok: false, msg: "Ese pedido no existe o no es de tus ciudades." } as const;
    const R = (await c.query<{ desde: string; hasta: string | null; fin: string | null; paso: string; distancia: number; n: number; rech: number; purgada: boolean }>(
      `select ${ISO("sharing_from")} as desde, ${ISO("sharing_until")} as hasta, ended_reason as fin, started_step as paso, distance_m as distancia, positions_n as n, rejected_n as rech, purged_at is not null as purgada
         from delivery_tracks where operation_id = $1::bigint order by sharing_from`, [o.id])).rows;
    if (!R.length) return { ok: false, msg: "Esta entrega no tiene ruta (no se compartió la ubicación)." } as const;
    await auditar(c, { actor: s.id, action: "ruta.ver", targetKind: "operation", targetId: numero, city: o.city, after: { pedido: numero, rutas: R.length }, reason: m });
    const P = (await c.query<{ lat: number; lng: number; at: string; acc: number | null; src: string }>(
      `select st_y(geom::geometry) as lat, st_x(geom::geometry) as lng, ${ISO("at")} as at, accuracy_m as acc, source as src from delivery_positions where operation_id = $1::bigint order by at limit 2000`, [o.id])).rows;
    return { ok: true, r: { numero, negocio: o.negocio, ciudad: o.city, destino: o.dlat != null && o.dlng != null ? [Number(o.dlat), Number(o.dlng)] : null,
      rutas: R.map((x) => ({ desde: x.desde, hasta: x.hasta, fin: x.fin, paso: x.paso, distancia: x.distancia, n: x.n, rechazadas: x.rech, purgada: x.purgada })),
      puntos: P.map((x) => ({ lat: Number(x.lat), lng: Number(x.lng), at: x.at, acc: x.acc == null ? null : Math.round(Number(x.acc)), src: x.src })) } } as const;
  });
}

/* ¿Qué pedidos de esta lista tienen ruta? (Transacciones muestra «Ver recorrido» solo ahí; nada de la ruta sale sin motivo). */
export async function conRuta(numeros: string[]): Promise<Set<string>> {
  const L = numeros.filter((n) => /^\d{1,12}$/.test(n)).slice(0, 200);
  if (!L.length) return new Set();
  const r = await db().query<{ n: string }>(`select distinct o.number as n from delivery_tracks t join operations o on o.id = t.operation_id where o.number = any($1::text[]) and o.kind = 'order'`, [L]);
  return new Set(r.rows.map((x) => x.n));
}

/* La purga (barrido central): posiciones de más de ubic_retener_dias; las entregas quedan con su resumen. */
export async function purgarRutas(): Promise<number> {
  let total = 0;
  for (let i = 0; i < 20; i++) { const n = (await db().query<{ n: number }>(`select ruta_purgar(5000) as n`)).rows[0]?.n ?? 0; total += n; if (n < 5000) break; }
  return total;
}
