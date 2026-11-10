import "server-only";
import { randomInt } from "node:crypto";
import { db, tx } from "./db";
import { cifrar, huella } from "./cifrado";
import { cfgSql } from "./config";
import { diaCorto, hora } from "./evt-comun";
import { equipo, incidencias, resumenFecha, ultimos } from "./puerta";
import type { Bi, Resumen } from "./puerta-comun";

/* 6g · Porteros del negocio y el lado del panel de la puerta (DASH-EVENTOS «PORTEROS · ESCANEAN EN LA PUERTA», «REGLAS DE PUERTA»,
   Monitor en vivo; doorDet del Panel v2). El patrón es el del Repartidor (2l): el negocio invita por nombre + teléfono → código de 7
   días (SMS puerta_invitado) → la persona entra a To'Latino Puerta con SU cuenta y el MISMO teléfono (huella; el teléfono se guarda
   cifrado, nunca en claro) → activo. Quitar con motivo = 'removed' y la base cierra al momento sus sesiones abiertas.
   El panel decide quién: la parte «evt» (el dueño siempre); lo comprueba app/panel/acciones-puerta.ts con accesoPanel. */
const ALFA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sin 0/O ni 1/I/L: se dicta sin confundir
const ID = /^\d{1,18}$/;
type R = { ok: true } | { ok: false; msg: Bi };
const no = (es: string, en: string) => ({ ok: false as const, msg: { es, en } });

export type PorteroPanel = { id: string; nombre: string; tel4: string; estado: "invited" | "active"; todos: boolean; eventos: string[]; codigo: string | null; vence: string | null;
  ultima: string | null; enPuerta: boolean };
/* Los porteros del negocio (los de este evento primero: los de «todos tus eventos» y los asignados a él). Sin teléfono: «··1234». */
export async function porterosDe(negocio: string): Promise<PorteroPanel[]> {
  return (await db().query<PorteroPanel>(
    `select f.id::text, f.display_name as nombre, f.phone_last4 as tel4, f.status as estado, f.scope = 'all' as todos, f.event_ids::text[] as eventos,
            case when f.status = 'invited' then f.invite_code end as codigo,
            case when f.status = 'invited' then to_char(f.invite_expires_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') end as vence,
            (select to_char(max(s.started_at) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') from door_sessions s where s.door_staff_id = f.id) as ultima,
            exists (select 1 from door_sessions s where s.door_staff_id = f.id and s.ended_at is null and puerta_acceso(s.id, s.user_id)) as "enPuerta"
       from door_staff f where f.business_id = $1 and f.status in ('invited', 'active') order by f.status = 'active' desc, f.display_name limit 100`, [negocio])).rows;
}

/* Invitar: nombre + teléfono + alcance (todos los eventos o este). Tope de invitaciones al día y de porteros (la base, Configuración). */
export async function invitarPortero(negocio: string, actorId: string, nombre: string, tel: string, eventoId: string | null): Promise<{ ok: true; codigo: string; id: string } | { ok: false; msg: Bi }> {
  const n = String(nombre ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
  if (n.length < 2) return no("Escribe su nombre.", "Write their name.");
  if (!/^\+1\d{10}$/.test(tel)) return no("Escribe su teléfono de 10 números.", "Write their 10-digit phone.");
  if (eventoId !== null && !ID.test(eventoId)) return no("Ese evento no existe.", "That event does not exist.");
  // El tope de Configuración se lee en la base al decidir (sin caché).
  const t = (await db().query<{ n: number; max: number }>(`select count(*)::int as n, ${cfgSql("puerta_invitar_dia_max")} as max from door_staff where business_id = $1 and created_at > now() - interval '1 day'`, [negocio])).rows[0]!;
  if (t.n >= t.max) return no("Invitaste a muchos porteros hoy. Prueba mañana.", "You invited many door staff today. Try tomorrow.");
  if (eventoId && !(await db().query(`select 1 from events where id = $1::bigint and business_id = $2`, [eventoId, negocio])).rowCount) return no("Ese evento no es de tu negocio.", "That event is not yours.");
  for (let i = 0; i < 5; i++) {
    const codigo = Array.from({ length: 6 }, () => ALFA[randomInt(ALFA.length)]).join("");
    try {
      const r = (await db().query<{ id: string }>(
        `insert into door_staff (business_id, city_id, display_name, phone_enc, phone_hash, phone_last4, invite_code, invite_expires_at, scope, event_ids, invited_by)
         select $1, b.city_id, $2, $3, $4, $5, $6, now() + interval '7 days', $7, $8::bigint[], $9 from businesses b where b.id = $1 returning id::text`,
        [negocio, n, cifrar(tel), huella(tel), tel.slice(-4), codigo, eventoId ? "events" : "all", eventoId ? [eventoId] : [], actorId])).rows[0];
      if (!r) return no("Ese negocio no existe.", "That business does not exist.");
      return { ok: true, codigo, id: r.id };
    } catch (e) {
      const c = e as { code?: string; constraint?: string; message?: string };
      if (c.code === "23505" && c.constraint === "door_staff_tel_idx") return no("Ese teléfono ya está en tus porteros.", "That phone is already one of your door staff.");
      if (/puerta_porteros_max/.test(String(c.message))) return no("Llegaste al máximo de porteros. Quita a uno para invitar a otro.", "You reached the door staff limit. Remove one to invite another.");
      if (c.code !== "23505") throw e;
    }
  }
  return no("No se pudo crear el código. Prueba de nuevo.", "Could not create the code. Try again.");
}
/* El SMS con el código (a una cuenta o a un número sin cuenta: avisarTelefono decide; el teléfono nunca se guarda en claro). */
export async function avisarInvitacion(negocio: string, id: string, tel: string, codigo: string) {
  const b = (await db().query<{ name: string; city: string }>(`select name, city_id as city from businesses where id = $1`, [negocio])).rows[0];
  if (!b) return;
  const { avisarTelefono } = await import("./avisos"), base = (await import("./correo")).BASE_URL();
  await avisarTelefono(tel, "puerta_invitado", { negocio: b.name, codigo, enlace: `${base}/puerta` }, { href: "/puerta", ref: ["door_staff", id], city: b.city });
}

/* Quitar con motivo: no vuelve; la base cierra sus sesiones abiertas en el acto (door_staff_despues). */
export async function quitarPortero(negocio: string, id: string, motivo: string, actorId: string): Promise<R> {
  if (!ID.test(String(id ?? ""))) return no("Ese portero no existe.", "That door staffer does not exist.");
  const m = String(motivo ?? "").replace(/\s+/g, " ").trim().slice(0, 200);
  if (m.length < 3) return no("Escribe por qué lo quitas.", "Write why you are removing them.");
  const r = await db().query(`update door_staff set status = 'removed', removed_at = now(), removed_by = $3, removed_reason = $4, invite_code = null where id = $1::bigint and business_id = $2 and status <> 'removed'`, [id, negocio, actorId, m]);
  return r.rowCount ? { ok: true } : no("Ese portero ya no está.", "That door staffer is no longer there.");
}
/* Ponerlo también en este evento (o en todos). Al portero activo le llega «Tienes una puerta». */
export async function asignarPortero(negocio: string, id: string, eventoId: string | null): Promise<R & { aviso?: { uid: string; vars: Record<string, string>; href: string } }> {
  if (!ID.test(String(id ?? "")) || (eventoId !== null && !ID.test(eventoId))) return no("Ese portero no existe.", "That door staffer does not exist.");
  return tx(async (c) => {
    const f = (await c.query<{ scope: string; ids: string[]; uid: string | null; st: string }>(`select scope, event_ids::text[] as ids, user_id::text as uid, status as st from door_staff where id = $1::bigint and business_id = $2 and status <> 'removed' for update`, [id, negocio])).rows[0];
    if (!f) return no("Ese portero ya no está.", "That door staffer is no longer there.");
    if (eventoId === null) await c.query(`update door_staff set scope = 'all', event_ids = '{}' where id = $1::bigint`, [id]);
    else {
      const e = (await c.query<{ t: Bi; dia: string; h0: number; neg: string }>(`select e.title as t, e.start_date::text as dia, e.start_min as h0, b.name as neg from events e join businesses b on b.id = e.business_id where e.id = $1::bigint and e.business_id = $2`, [eventoId, negocio])).rows[0];
      if (!e) return no("Ese evento no es de tu negocio.", "That event is not yours.");
      if (f.scope === "events" && !f.ids.includes(eventoId)) await c.query(`update door_staff set event_ids = array_append(event_ids, $2::bigint) where id = $1::bigint`, [id, eventoId]);
      if (f.uid && f.st === "active") return { ok: true as const, aviso: { uid: f.uid, vars: { negocio: e.neg, evento: e.t.es, cuando: `${diaCorto(e.dia, true)} · ${hora(e.h0)}` }, href: "/puerta" } };
    }
    return { ok: true as const };
  });
}
/* Solo este evento (quitarlo de un portero de «solo algunos»). */
export async function desasignarPortero(negocio: string, id: string, eventoId: string): Promise<R> {
  if (!ID.test(String(id ?? "")) || !ID.test(String(eventoId ?? ""))) return no("Ese portero no existe.", "That door staffer does not exist.");
  const f = (await db().query<{ scope: string; n: number }>(`select scope, cardinality(event_ids) as n from door_staff where id = $1::bigint and business_id = $2 and status <> 'removed'`, [id, negocio])).rows[0];
  if (!f) return no("Ese portero ya no está.", "That door staffer is no longer there.");
  if (f.scope === "all") return no("Este portero escanea en todos tus eventos. Para quitarlo de uno, quítalo y vuelve a invitarlo solo para los que quieras.", "This staffer scans all your events. To remove them from one, remove and re-invite them for the ones you want.");
  if (f.n <= 1) return no("Es su único evento: quítalo de tus porteros.", "It is their only event: remove them from your door staff.");
  await db().query(`update door_staff set event_ids = array_remove(event_ids, $3::bigint) where id = $1::bigint and business_id = $2`, [id, negocio, eventoId]);
  return { ok: true };
}

/* ── La persona acepta en /puerta: SU cuenta, el MISMO teléfono (huella) y el código vivo. Intentos con tope (no se adivinan códigos). ── */
export async function aceptarPortero(userId: string, tel: string, codigo: string): Promise<R & { negocio?: string }> {
  const k = String(codigo ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (k.length !== 6) return no("El código tiene 6 letras y números.", "The code has 6 letters and numbers.");
  const intentos = (await db().query<{ n: number }>(`select count(*)::int as n from audit_entries where actor_id = $1 and action = 'puerta.codigo_malo' and at > now() - interval '1 hour'`, [userId])).rows[0]!.n;
  if (intentos >= 8) return no("Muchos intentos. Espera una hora o pídele al negocio un código nuevo.", "Too many tries. Wait an hour or ask the business for a new code.");
  return tx(async (c) => {
    const d = (await c.query<{ id: string; ph: string; vivo: boolean; negocio: string; nombre: string; city: string; ya: boolean }>(
      `select f.id::text, f.phone_hash as ph, f.invite_expires_at > now() as vivo, f.business_id as negocio, b.name as nombre, b.city_id as city,
              exists (select 1 from door_staff g where g.business_id = f.business_id and g.user_id = $2 and g.status = 'active') as ya
         from door_staff f join businesses b on b.id = f.business_id where f.invite_code = $1 and f.status = 'invited' for update of f`, [k, userId])).rows[0];
    const malo = async () => { await c.query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, after) values ('user', $1, 'puerta.codigo_malo', 'door_staff', '{}'::jsonb)`, [userId]); };
    if (!d) { await malo(); return no("Ese código no existe o ya se usó. Pídele al negocio uno nuevo.", "That code does not exist or was already used. Ask the business for a new one."); }
    if (!d.vivo) return no("Ese código venció. Pídele al negocio uno nuevo.", "That code expired. Ask the business for a new one.");
    if (d.ph !== huella(tel)) { await malo(); return no("Ese código es para otro teléfono. Entra con el número que le diste al negocio.", "That code is for another phone. Sign in with the number you gave the business."); }
    if (d.ya) return no(`Ya eres portero de ${d.nombre}.`, `You are already door staff for ${d.nombre}.`);
    await c.query(`update door_staff set user_id = $2, status = 'active', invite_code = null, accepted_at = now() where id = $1::bigint`, [d.id, userId]);
    await c.query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, after) values ('user', $1, 'puerta.aceptar', 'business', $2, $3, $4::jsonb)`,
      [userId, d.negocio, d.city, JSON.stringify({ portero: d.id })]);
    return { ok: true as const, negocio: d.nombre };
  });
}
/* Salir del equipo de puertas de un negocio (desde /puerta). */
export async function salirPortero(userId: string, id: string): Promise<R> {
  if (!ID.test(String(id ?? ""))) return no("Ese equipo no existe.", "That team does not exist.");
  const r = await db().query(`update door_staff set status = 'removed', removed_at = now(), removed_by = $2, removed_reason = 'salió', invite_code = null where id = $1::bigint and user_id = $2 and status = 'active'`, [id, userId]);
  return r.rowCount ? { ok: true } : no("Ya no estás en ese equipo.", "You are no longer on that team.");
}

/* ── REGLAS DE PUERTA (reentrada, pedir ID, hora de cerrar la puerta, aforo por puerta). No pasan por revisión: no cambian lo que se
   vendió ni el día (ver «cambio que importa», 6a); quedan en la auditoría del panel. ── */
export type ReglasIn = { reentrada: boolean; pideId: boolean; cierre: number | null; caps: Record<string, number> };
export async function reglasPuerta(negocio: string, eventoId: string, r: ReglasIn): Promise<R & { antes?: unknown }> {
  if (!ID.test(String(eventoId ?? ""))) return no("Ese evento no existe.", "That event does not exist.");
  const cierre = r.cierre == null ? null : Math.floor(Number(r.cierre));
  if (cierre !== null && !(cierre >= 0 && cierre <= 720)) return no("La hora de cerrar la puerta es hasta 12 h después de empezar.", "The door closing time is up to 12 h after the start.");
  const caps: Record<string, number> = {};
  for (const [k, v] of Object.entries(r.caps ?? {}).slice(0, 6)) { const n = String(k).replace(/\s+/g, " ").trim().slice(0, 30), x = Math.floor(Number(v)); if (n && x >= 1 && x <= 20000) caps[n] = x; }
  const a = (await db().query<{ antes: unknown }>(
    `update events e set reentry = $3, id_required = $4, door_close_after_min = $5, door_caps = $6::jsonb
       from (select reentry, id_required, door_close_after_min, door_caps from events where id = $1::bigint) x
      where e.id = $1::bigint and e.business_id = $2 and e.status not in ('cancelled', 'rejected', 'done')
      returning json_build_object('reentrada', x.reentry, 'pideId', x.id_required, 'cierre', x.door_close_after_min, 'caps', x.door_caps) as antes`,
    [eventoId, negocio, !!r.reentrada, !!r.pideId, cierre, JSON.stringify(caps)])).rows[0];
  return a ? { ok: true, antes: a.antes } : no("Este evento ya no cambia.", "This event can no longer change.");
}

/* ── Panel › la ficha del evento › PUERTA: porteros, reglas, la sesión del modo puerta y el Monitor en vivo de la fecha que se ve ── */
export type PuertaPanel = {
  porteros: PorteroPanel[]; reglas: { reentrada: boolean; pideId: boolean; cierre: number | null; caps: Record<string, number> };
  fecha: string | null; abrible: boolean; r: Resumen | null; equipo: Awaited<ReturnType<typeof equipo>>; incidencias: Awaited<ReturnType<typeof incidencias>>; ultimos: Awaited<ReturnType<typeof ultimos>>;
  miSesion: string | null; tz: string;
};
export async function puertaPanel(negocio: string, eventoId: string, fecha: string | null, userId: string, es: boolean): Promise<PuertaPanel | null> {
  if (!ID.test(String(eventoId ?? ""))) return null;
  const e = (await db().query<{ reentrada: boolean; pideId: boolean; cierre: number | null; caps: Record<string, number>; tz: string }>(
    `select e.reentry as reentrada, e.id_required as "pideId", e.door_close_after_min as cierre, e.door_caps as caps, ci.timezone as tz from events e join cities ci on ci.id = e.city_id where e.id = $1::bigint and e.business_id = $2`, [eventoId, negocio])).rows[0];
  if (!e) return null;
  const f = fecha && ID.test(fecha) && (await db().query(`select 1 from event_dates where id = $1::bigint and event_id = $2::bigint`, [fecha, eventoId])).rowCount ? fecha : null;
  const [porteros, r, eq, inc, ult, s, ab] = await Promise.all([
    porterosDe(negocio), f ? resumenFecha(f) : Promise.resolve(null), f ? equipo(f, e.tz) : Promise.resolve([]), f ? incidencias(f, e.tz) : Promise.resolve([]), f ? ultimos(f, e.tz, es, 8) : Promise.resolve([]),
    f ? db().query<{ id: string }>(`select id::text from door_sessions where event_date_id = $1::bigint and user_id = $2 and ended_at is null and puerta_acceso(id, $2)`, [f, userId]) : Promise.resolve({ rows: [] as { id: string }[] }),
    f ? db().query<{ ok: boolean }>(`select puerta_puede($1::bigint, $2, null) as ok`, [f, userId]) : Promise.resolve({ rows: [{ ok: false }] }),
  ]);
  return { porteros: porteros.filter((p) => p.todos || p.eventos.includes(eventoId)).concat(porteros.filter((p) => !p.todos && !p.eventos.includes(eventoId))),
    reglas: { reentrada: e.reentrada, pideId: e.pideId, cierre: e.cierre, caps: e.caps ?? {} }, fecha: f, abrible: !!ab.rows[0]?.ok, r, equipo: eq, incidencias: inc, ultimos: ult, miSesion: s.rows[0]?.id ?? null, tz: e.tz };
}
/* Cerrar la sesión de un portero desde el panel (se le corta en la próxima acción). */
export async function cerrarSesionPanel(negocio: string, sesion: string): Promise<R> {
  if (!ID.test(String(sesion ?? ""))) return no("Esa puerta no existe.", "That door does not exist.");
  const r = await db().query(`update door_sessions set ended_at = now(), ended_by = 'business' where id = $1::bigint and business_id = $2 and ended_at is null`, [sesion, negocio]);
  return r.rowCount ? { ok: true } : no("Esa puerta ya está cerrada.", "That door is already closed.");
}
export async function cerrarIncidencia(negocio: string, id: string, nota: string, actorId: string): Promise<R> {
  if (!ID.test(String(id ?? ""))) return no("Esa incidencia no existe.", "That incident does not exist.");
  const r = await db().query(`update door_incidents set status = 'closed', closed_at = now(), closed_by = $3, closed_note = nullif($4, '') where id = $1::bigint and business_id = $2 and status = 'open'`,
    [id, negocio, actorId, String(nota ?? "").trim().slice(0, 300)]);
  return r.rowCount ? { ok: true } : no("Esa incidencia ya se cerró.", "That incident is already closed.");
}
