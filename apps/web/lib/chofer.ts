import "server-only";
import { db, tx } from "./db";
import { abordo, pasoSalida } from "./viajes";
import type { Bi } from "./transporte-comun";

/* El chofer de una salida (Fase 4 · 4y-3b · fase4-fiestas-transporte.md §4y «App del chofer»). El chofer es un repartidor del
   negocio (delivery_drivers, la misma invitación con código de /repartidor). El negocio le asigna la salida desde el panel; en
   /repartidor ve sus salidas de hoy y mañana con la lista de pasajeros (nombre y apellido corto, cuántos, asiento de niño — nada
   de pagos ni teléfonos) y marca Abordó / No llegó, Va tarde, Salió y Llegó. El servidor revisa en cada paso que la salida sea
   suya; los pasos son los mismos del panel (pasoSalida / abordo). */
type ResC = { ok: true } | { ok: false; msg: Bi };
const no = (es: string, en: string): ResC => ({ ok: false, msg: { es, en } });
const ID = /^\d{1,18}$/;
const horaL = (m: number) => `${Math.floor(m / 60) % 12 || 12}:${String(m % 60).padStart(2, "0")} ${m < 720 ? "AM" : "PM"}`;

export type Chofer = { id: string; nombre: string };
export async function choferesDe(negocio: string): Promise<Chofer[]> {
  return (await db().query<Chofer>(`select id::text, display_name as nombre from delivery_drivers where business_id = $1 and status = 'active' order by display_name`, [negocio])).rows;
}

/* Panel › la salida › Chofer. null lo quita. */
export async function asignarChofer(negocio: string, run: string, driverId: string | null, actorId: string): Promise<ResC> {
  if (!ID.test(run) || (driverId !== null && !ID.test(driverId))) return no("Esa salida no existe.", "That departure does not exist.");
  let aviso: { uid: string; vars: Record<string, string> } | null = null;
  const r = await tx(async (c): Promise<ResC> => {
    const R = (await c.query<{ st: string; dia: string; m: number; svc: Bi; negocio: string }>(
      `select r.status as st, to_char(r.run_at at time zone ci.timezone, 'DD/MM') as dia, (extract(hour from r.run_at at time zone ci.timezone) * 60 + extract(minute from r.run_at at time zone ci.timezone))::int as m,
              i.name as svc, b.name as negocio
         from trip_runs r join cities ci on ci.id = r.city_id join items i on i.id = r.item_id join businesses b on b.id = r.business_id where r.id = $1::bigint and r.business_id = $2 for update of r`, [run, negocio])).rows[0];
    if (!R) return no("Esa salida no existe.", "That departure does not exist.");
    if (R.st !== "scheduled" && R.st !== "departed") return no("Esa salida ya terminó.", "That departure is over.");
    let uid: string | null = null;
    if (driverId) {
      const d = (await c.query<{ uid: string }>(`select user_id::text as uid from delivery_drivers where id = $1::bigint and business_id = $2 and status = 'active'`, [driverId, negocio])).rows[0];
      if (!d) return no("Ese chofer no está en tu equipo.", "That driver is not on your team.");
      uid = d.uid;
    }
    await c.query(`update trip_runs set driver_id = $2::bigint, updated_at = now() where id = $1::bigint`, [run, driverId]);
    await c.query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, before, after) select 'user', $1, 'viaje.chofer', 'trip_run', $2::text, city_id, null, $3::jsonb from trip_runs where id = $4::bigint`,
      [actorId, run, JSON.stringify({ chofer: driverId }), run]);
    if (uid) aviso = { uid, vars: { negocio: R.negocio, dia: R.dia, hora: horaL(R.m), servicio: R.svc?.es ?? "" } };
    return { ok: true };
  });
  if (r.ok && aviso) { const a = aviso as { uid: string; vars: Record<string, string> }; await (await import("./avisos")).avisar(a.uid, "chofer_salida", a.vars, { href: "/repartidor?t=salidas" }).catch(() => undefined); }
  return r;
}

/* /repartidor › Salidas: las del chofer, de hoy y mañana. */
export type PasajeroC = { numero: string; quien: string; adultos: number; ninos: number; nino: boolean; maletas: number; abordo: string | null };
export type SalidaC = { run: string; negocio: string; svc: Bi; dia: string; m: number; st: string; tarde: number | null; from: Bi | null; to: Bi | null; pasajeros: PasajeroC[] };
export async function misSalidas(userId: string): Promise<SalidaC[]> {
  const R = (await db().query<Omit<SalidaC, "pasajeros">>(
    `select r.id::text as run, b.name as negocio, i.name as svc, to_char(r.run_at at time zone ci.timezone, 'YYYY-MM-DD') as dia,
            (extract(hour from r.run_at at time zone ci.timezone) * 60 + extract(minute from r.run_at at time zone ci.timezone))::int as m, r.status as st,
            case when r.late_until is null then null else (extract(hour from r.late_until at time zone ci.timezone) * 60 + extract(minute from r.late_until at time zone ci.timezone))::int end as tarde,
            i.svc_attrs->'from' as "from", i.svc_attrs->'to' as "to"
       from trip_runs r join delivery_drivers d on d.id = r.driver_id join businesses b on b.id = r.business_id join items i on i.id = r.item_id join cities ci on ci.id = r.city_id
      where d.user_id = $1 and d.status = 'active' and r.status in ('scheduled', 'departed') and r.run_at > now() - interval '12 hours' and r.run_at < now() + interval '2 days'
      order by r.run_at limit 20`, [userId])).rows;
  if (!R.length) return [];
  const P = (await db().query<PasajeroC & { run: string }>(
    `select s.run_id::text as run, o.number as numero, coalesce(nullif(u.first_name, ''), 'Cliente') || coalesce(' ' || left(nullif(u.last_name, ''), 1) || '.', '') as quien,
            coalesce((o.details->>'adults')::int, 1) as adultos, coalesce((o.details->>'kids')::int, 0) as ninos, coalesce((o.details->>'childSeat')::boolean, false) as nino,
            coalesce((o.details->>'bagsExtra')::int, 0) as maletas, s.status as abordo
       from run_seats s join operations o on o.id = s.operation_id join users u on u.id = o.user_id
      where s.run_id = any($1::bigint[]) and s.status in ('held', 'boarded', 'noshow') and o.status = 'confirmed' order by o.id`, [R.map((x) => x.run)])).rows;
  return R.map((x) => ({ ...x, pasajeros: P.filter((p) => p.run === x.run).map(({ run: _r, ...p }) => p) }));
}

async function suya(userId: string, run: string): Promise<string | null> {
  if (!ID.test(run)) return null;
  return (await db().query<{ biz: string }>(`select r.business_id as biz from trip_runs r join delivery_drivers d on d.id = r.driver_id where r.id = $1::bigint and d.user_id = $2 and d.status = 'active'`, [run, userId])).rows[0]?.biz ?? null;
}
export async function choferPaso(userId: string, run: string, paso: "tarde" | "salio" | "llego", min?: number): Promise<ResC> {
  const biz = await suya(userId, run);
  if (!biz) return no("Esa salida no es tuya.", "That departure is not yours.");
  return pasoSalida(biz, run, paso, userId, min);
}
export async function choferAbordo(userId: string, run: string, numero: string, si: boolean): Promise<ResC> {
  const biz = await suya(userId, run);
  if (!biz) return no("Esa salida no es tuya.", "That departure is not yours.");
  const ok = (await db().query(`select 1 from run_seats s join operations o on o.id = s.operation_id where s.run_id = $1::bigint and o.number = $2`, [run, String(numero ?? "")])).rowCount;
  if (!ok) return no("Ese pasajero no va en tu salida.", "That passenger is not on your departure.");
  return abordo(biz, String(numero), si, userId);
}
