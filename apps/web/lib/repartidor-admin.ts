import "server-only";
import { auditar, type Staff } from "./admin";
import { db, tx } from "./db";

/* 9n · Super Admin › Repartidores (ADM-DLV; apps-delivery-checkin.md §1.5): la lista de las personas que reparten para un negocio (por
   persona, no por equipo: una puede repartir para varios), su 360° (equipos, entregas, pruebas, incidencias, sanciones), las incidencias
   de entrega (también en Colas, cola «entrega») y las sanciones (aviso, suspensión con fecha, baneo; levantar con motivo).
   El servidor decide: sección «dlv» de la matriz (ver; editar = trabajar incidencias; retirar = sancionar; el baneo y levantarlo, solo un
   Admin) y las ciudades del rol (staff_members.cities; vacío = todas). Cada acción deja su AuditEntry. Nunca se muestra el código del cliente
   ni la foto fuera de su ruta privada (/api/entrega/foto/{id}, auditada). */
type Bi = { es: string; en: string };
export type ResD = { ok: true; mensaje?: string } | { ok: false; mensaje: string };
const UUIDRE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ciudades = (s: Staff) => (s.cities.length ? s.cities : null);

/* La incidencia entra a la cola «entrega» (una abierta por incidencia). */
export async function incidenciaACola(id: string, alta = false) {
  await db().query(
    `insert into queue_items (queue, subject_kind, subject_id, business_id, city_id, priority)
     select 'entrega', 'delivery_incident', i.id::text, i.business_id, i.city_id, $2 from delivery_incidents i where i.id = $1::bigint and i.status = 'open'
     on conflict (queue, subject_kind, subject_id) where status = 'open' do nothing`, [id, alta ? "alta" : "normal"]);
}

/* ── Lista ── */
export type FiltroDlv = { q: string; est: "" | "linea" | "sancion" | "incid"; antes: string | null };
export type FilaDlv = { id: string; nombre: string; tel: string; equipos: string[]; ciudad: string | null; enLinea: boolean; entregas30: number; problemas30: number; incid: number; sancion: string | null; desde: string; cursor: string };
export function leerFiltroDlv(sp: Record<string, string | undefined>): FiltroDlv {
  const est = (["linea", "sancion", "incid"] as const).find((x) => x === sp.est) ?? "";
  const antes = typeof sp.antes === "string" && /^\d{4}-\d\d-\d\dT[\d:.]+Z\|[0-9a-f-]{36}$/.test(sp.antes) ? sp.antes : null;
  return { q: String(sp.q ?? "").trim().slice(0, 60), est, antes };
}
export const POR_PAGINA_DLV = 30;
export async function listaRepartidores(s: Staff, f: FiltroDlv): Promise<{ filas: FilaDlv[]; mas: string | null; cab: { total: number; linea: number; sancion: number; incid: number } }> {
  const C = ciudades(s), q = f.q.replace(/[%_\\]/g, ""), dig = q.replace(/\D/g, "");
  const [ca, cid] = f.antes ? f.antes.split("|") : [null, null];
  const r = await db().query<FilaDlv & { desde_ts: string }>(
    `with p as (
       select d.user_id, min(d.accepted_at) as desde, bool_or(d.online and d.status = 'active') as en_linea,
              array_agg(distinct b.name) filter (where d.status = 'active') as equipos, (array_agg(b.city_id order by d.accepted_at desc))[1] as ciudad
         from delivery_drivers d join businesses b on b.id = d.business_id
        where d.user_id is not null and d.accepted_at is not null and ($1::text[] is null or b.city_id = any($1::text[]))
        group by d.user_id)
     select u.id::text, coalesce(nullif(trim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')), ''), '(sin nombre)') as nombre, u.phone as tel,
            coalesce(p.equipos, '{}') as equipos, ci.name as ciudad, coalesce(p.en_linea, false) as "enLinea",
            (select count(*)::int from operations o join delivery_drivers d on d.id = o.driver_id where d.user_id = u.id and o.kind = 'order' and o.status = 'done' and o.done_at > now() - interval '30 days') as "entregas30",
            (select count(*)::int from operation_events e join operations o on o.id = e.operation_id join delivery_drivers d on d.id = o.driver_id
              where d.user_id = u.id and e.kind = 'driver_issue' and e.actor_id = u.id::text and e.at > now() - interval '30 days') as "problemas30",
            (select count(*)::int from delivery_incidents i where i.driver_user = u.id and i.status = 'open') as incid,
            repartidor_sancionado(u.id) as sancion,
            to_char(p.desde at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as desde_ts, to_char(p.desde at time zone 'UTC', 'YYYY-MM-DD') as desde
       from p join users u on u.id = p.user_id left join cities ci on ci.id = p.ciudad
      where ($2 = '' or u.first_name ilike '%' || $2 || '%' or u.last_name ilike '%' || $2 || '%' or ($3 <> '' and u.phone like '%' || $3 || '%'))
        and ($4 = '' or ($4 = 'linea' and p.en_linea) or ($4 = 'sancion' and repartidor_sancionado(u.id) is not null)
             or ($4 = 'incid' and exists (select 1 from delivery_incidents i where i.driver_user = u.id and i.status = 'open')))
        and ($5::timestamptz is null or (p.desde, u.id) < ($5::timestamptz, $6::uuid))
      order by p.desde desc, u.id desc limit ${POR_PAGINA_DLV + 1}`, [C, q, dig.length >= 3 ? dig : "", f.est, ca, cid]);
  const filas = r.rows.slice(0, POR_PAGINA_DLV).map(({ desde_ts, ...x }) => ({ ...x, cursor: `${desde_ts}|${x.id}` }));
  const cab = (await db().query<{ total: number; linea: number; sancion: number; incid: number }>(
    `select count(distinct d.user_id)::int as total, count(distinct d.user_id) filter (where d.online and d.status = 'active')::int as linea,
            count(distinct d.user_id) filter (where repartidor_sancionado(d.user_id) is not null)::int as sancion,
            (select count(*)::int from delivery_incidents i where i.status = 'open' and ($1::text[] is null or i.city_id = any($1::text[]))) as incid
       from delivery_drivers d join businesses b on b.id = d.business_id where d.user_id is not null and d.accepted_at is not null and ($1::text[] is null or b.city_id = any($1::text[]))`, [C])).rows[0]!;
  return { filas, mas: r.rows.length > POR_PAGINA_DLV ? filas[filas.length - 1]!.cursor : null, cab };
}

/* ── Incidencias (la pestaña y la cola) ── */
export type Incidencia = { id: string; kind: string; nota: Bi; status: string; numero: string | null; negocio: string | null; negocioId: string | null; rep: string; repId: string;
  at: string; resolucion: string | null; quien: string | null; foto: string | null; prueba: string | null };
const INC_SQL = `select i.id::text, i.kind, i.note as nota, i.status, o.number as numero, b.name as negocio, b.id as "negocioId",
            coalesce(nullif(trim(coalesce(u.first_name, '') || ' ' || left(coalesce(u.last_name, ''), 1)), ''), 'Repartidor') as rep, u.id::text as "repId",
            to_char(i.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at, i.resolution as resolucion,
            nullif(trim(coalesce(r.first_name, '') || ' ' || left(coalesce(r.last_name, ''), 1)), '') as quien,
            (select p.media_id::text from delivery_proofs p where p.operation_id = i.operation_id and p.kind = 'foto') as foto,
            (select string_agg(p.kind, ',' order by p.kind) from delivery_proofs p where p.operation_id = i.operation_id) as prueba
       from delivery_incidents i join users u on u.id = i.driver_user left join operations o on o.id = i.operation_id left join businesses b on b.id = i.business_id
       left join users r on r.id = i.resolved_by`;
export async function incidencias(s: Staff, soloAbiertas = true): Promise<Incidencia[]> {
  return (await db().query<Incidencia>(`${INC_SQL} where ($1::text[] is null or i.city_id = any($1::text[])) and (not $2 or i.status = 'open') order by i.status = 'open' desc, i.created_at desc limit 100`,
    [ciudades(s), soloAbiertas])).rows;
}
export async function incidencia(s: Staff, id: string): Promise<Incidencia | null> {
  if (!/^\d{1,18}$/.test(id)) return null;
  return (await db().query<Incidencia>(`${INC_SQL} where i.id = $1::bigint and ($2::text[] is null or i.city_id = any($2::text[]))`, [id, ciudades(s)])).rows[0] ?? null;
}

/* ── 360° ── */
export type Rep360 = {
  id: string; nombre: string; tel: string; foto: string | null; creado: string; sancion: string | null;
  equipos: { id: string; negocio: string; negocioId: string; estado: string; vehiculo: string | null; enLinea: boolean; desde: string | null; motivo: string | null }[];
  kpi: { entregas30: number; enCurso: number; problemas30: number; conPrueba30: number; ofertas30: number; aceptadas30: number };
  entregas: { numero: string; negocio: string; estado: string; at: string; prueba: string | null; foto: string | null; efectivo: number | null }[];
  incid: Incidencia[];
  sanciones: { id: string; kind: string; until: string | null; reason: string; at: string; por: string | null; lifted: string | null; liftReason: string | null; vigente: boolean }[];
};
export async function rep360(s: Staff, uid: string): Promise<Rep360 | null> {
  if (!UUIDRE.test(uid)) return null;
  const C = ciudades(s);
  const u = (await db().query<{ id: string; nombre: string; tel: string; foto: string | null; creado: string; sancion: string | null }>(
    `select u.id::text, coalesce(nullif(trim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')), ''), '(sin nombre)') as nombre, u.phone as tel, u.photo_url as foto,
            to_char(u.created_at at time zone 'UTC', 'YYYY-MM-DD') as creado, repartidor_sancionado(u.id) as sancion
       from users u where u.id = $1 and exists (select 1 from delivery_drivers d join businesses b on b.id = d.business_id where d.user_id = u.id and ($2::text[] is null or b.city_id = any($2::text[])))`, [uid, C])).rows[0];
  if (!u) return null;
  const [eq, k, en, inc, sa] = await Promise.all([
    db().query<Rep360["equipos"][number]>(`select d.id::text, b.name as negocio, b.id as "negocioId", d.status as estado, d.vehicle as vehiculo, d.online and d.status = 'active' as "enLinea",
        to_char(d.accepted_at at time zone 'UTC', 'YYYY-MM-DD') as desde, d.removed_reason as motivo from delivery_drivers d join businesses b on b.id = d.business_id where d.user_id = $1 order by d.status = 'active' desc, d.accepted_at desc`, [uid]),
    db().query<Rep360["kpi"]>(`select
        (select count(*)::int from operations o join delivery_drivers d on d.id = o.driver_id where d.user_id = $1 and o.kind = 'order' and o.status = 'done' and o.done_at > now() - interval '30 days') as "entregas30",
        (select count(*)::int from operations o join delivery_drivers d on d.id = o.driver_id where d.user_id = $1 and o.kind = 'order' and o.status = 'confirmed') as "enCurso",
        (select count(*)::int from operation_events e where e.kind = 'driver_issue' and e.actor_id = $1::text and e.at > now() - interval '30 days') as "problemas30",
        (select count(distinct p.operation_id)::int from delivery_proofs p join delivery_drivers d on d.id = p.driver_id where d.user_id = $1 and p.at > now() - interval '30 days') as "conPrueba30",
        (select count(*)::int from delivery_offers f join delivery_drivers d on d.business_id = f.business_id and d.user_id = $1 where f.created_at > now() - interval '30 days' and (f.driver_id is null or f.driver_id = d.id)) as "ofertas30",
        (select count(*)::int from delivery_offers f join delivery_drivers d on d.id = f.accepted_driver where d.user_id = $1 and f.created_at > now() - interval '30 days') as "aceptadas30"`, [uid]),
    db().query<Rep360["entregas"][number]>(`select o.number as numero, b.name as negocio, case when o.status = 'done' then 'Entregado' when o.status = 'confirmed' then 'En curso' else 'Cancelado' end as estado,
        to_char(coalesce(o.done_at, o.confirmed_at) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at,
        (select string_agg(p.kind, ',' order by p.kind) from delivery_proofs p where p.operation_id = o.id) as prueba,
        (select p.media_id::text from delivery_proofs p where p.operation_id = o.id and p.kind = 'foto') as foto, o.cash_collected_cents as efectivo
        from operations o join delivery_drivers d on d.id = o.driver_id join businesses b on b.id = o.business_id where d.user_id = $1 and o.kind = 'order' order by o.id desc limit 20`, [uid]),
    db().query<Incidencia>(`${INC_SQL} where i.driver_user = $1 order by i.created_at desc limit 50`, [uid]),
    db().query<Rep360["sanciones"][number]>(`select s.id::text, s.kind, to_char(s.until at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as until, s.reason, to_char(s.at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at,
        nullif(trim(coalesce(p.first_name, '') || ' ' || left(coalesce(p.last_name, ''), 1)), '') as por, to_char(s.lifted_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as lifted, s.lift_reason as "liftReason",
        s.lifted_at is null and s.kind <> 'aviso' and (s.until is null or s.until > now()) as vigente
        from driver_sanctions s left join users p on p.id = s.by_user where s.user_id = $1 order by s.at desc`, [uid]),
  ]);
  return { ...u, equipos: eq.rows, kpi: k.rows[0]!, entregas: en.rows, incid: inc.rows, sanciones: sa.rows };
}

/* ── Acciones (las llama app/admin/acciones-repartidores.ts después de revisar el permiso) ── */
const motivoOk = (m: unknown) => (typeof m === "string" ? m.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim().slice(0, 500) : "");
async function ciudadDe(uid: string): Promise<string | null> {
  return (await db().query<{ c: string | null }>(`select b.city_id as c from delivery_drivers d join businesses b on b.id = d.business_id where d.user_id = $1 order by d.accepted_at desc nulls last limit 1`, [uid])).rows[0]?.c ?? null;
}
const enSusCiudades = (s: Staff, city: string | null) => !s.cities.length || (!!city && s.cities.includes(city));

export async function resolverIncidencia(s: Staff, id: string, motivo: string): Promise<ResD> {
  const m = motivoOk(motivo);
  if (m.length < 3) return { ok: false, mensaje: "Escribe cómo se resolvió." };
  if (!/^\d{1,18}$/.test(id)) return { ok: false, mensaje: "Esa incidencia no existe." };
  return tx(async (c) => {
    const i = (await c.query<{ city: string; status: string; rep: string }>(`select city_id as city, status, driver_user::text as rep from delivery_incidents where id = $1::bigint for update`, [id])).rows[0];
    if (!i || !enSusCiudades(s, i.city)) return { ok: false, mensaje: "Esa incidencia no existe." } as const;
    if (i.status !== "open") return { ok: false, mensaje: "Ya estaba resuelta." } as const;
    await c.query(`update delivery_incidents set status = 'resolved', resolution = $2, resolved_by = $3, resolved_at = now() where id = $1::bigint`, [id, m, s.id]);
    await c.query(`update queue_items set status = 'decided', decision = 'resuelta', reason = $2, decided_by = $3, decided_at = now() where queue = 'entrega' and subject_kind = 'delivery_incident' and subject_id = $1 and status = 'open'`, [id, m, s.id]);
    await auditar(c, { actor: s.id, action: "repartidor.incidencia.resolver", targetKind: "user", targetId: i.rep, city: i.city, after: { incidencia: id }, reason: m });
    return { ok: true, mensaje: "Resuelta. Quedó en la auditoría." } as const;
  });
}

export async function abrirIncidencia(s: Staff, uid: string, numero: string, nota: string): Promise<ResD> {
  const m = motivoOk(nota);
  if (!UUIDRE.test(uid)) return { ok: false, mensaje: "Ese repartidor no existe." };
  if (m.length < 3) return { ok: false, mensaje: "Escribe qué pasó." };
  const n0 = String(numero ?? "").replace(/\D/g, "").slice(0, 12), n = /^0*$/.test(n0) ? "" : n0; // «0» = sin pedido
  const o = n ? (await db().query<{ id: string; did: string; biz: string; city: string }>(
    `select o.id::text, d.id::text as did, o.business_id as biz, o.city_id as city from operations o join delivery_drivers d on d.id = o.driver_id where o.number = $1 and d.user_id = $2`, [n, uid])).rows[0] : null;
  if (n && !o) return { ok: false, mensaje: "Ese pedido no lo llevó esta persona." };
  const city = o?.city ?? (await ciudadDe(uid));
  if (!city || !enSusCiudades(s, city)) return { ok: false, mensaje: "Ese repartidor no está en tus ciudades." };
  const id = await tx(async (c) => {
    const r = (await c.query<{ id: string }>(`insert into delivery_incidents (operation_id, driver_user, driver_id, business_id, city_id, kind, note, created_by) values ($1::bigint, $2, $3::bigint, $4, $5, 'otro', $6::jsonb, $7)
      on conflict (operation_id, kind) where operation_id is not null and status = 'open' do nothing returning id::text`, [o?.id ?? null, uid, o?.did ?? null, o?.biz ?? null, city, JSON.stringify({ es: m, en: m }), s.id])).rows[0];
    if (r) await auditar(c, { actor: s.id, action: "repartidor.incidencia.abrir", targetKind: "user", targetId: uid, city, after: { incidencia: r.id, pedido: n || null }, reason: m });
    return r?.id ?? null;
  });
  if (!id) return { ok: false, mensaje: "Ese pedido ya tiene una incidencia abierta." };
  await incidenciaACola(id);
  return { ok: true, mensaje: "Incidencia abierta. Está en Colas." };
}

const QUE: Record<string, [string, string]> = { aviso: ["Te dejamos un aviso", "We left you a warning"], suspension: ["Suspendimos tu cuenta de repartidor", "We suspended your driver account"], baneo: ["Tu cuenta ya no puede repartir en To'Latino", "Your account can no longer deliver on To'Latino"] };
export async function sancionar(s: Staff, uid: string, kind: string, dias: number, motivo: string, incidente: string | null): Promise<ResD> {
  const m = motivoOk(motivo);
  if (!UUIDRE.test(uid) || !["aviso", "suspension", "baneo"].includes(kind)) return { ok: false, mensaje: "Elige la sanción." };
  if (m.length < 3) return { ok: false, mensaje: "Escribe el motivo: lo ve la persona." };
  if (kind === "baneo" && s.role !== "admin") return { ok: false, mensaje: "Solo un Admin banea a un repartidor." };
  const d = Math.round(Number(dias));
  if (kind === "suspension" && !(d >= 1 && d <= 90)) return { ok: false, mensaje: "La suspensión dura de 1 a 90 días." };
  const city = await ciudadDe(uid);
  if (!city || !enSusCiudades(s, city)) return { ok: false, mensaje: "Ese repartidor no está en tus ciudades." };
  const r = await tx(async (c): Promise<ResD & { quitados?: { biz: string; numero: string }[] }> => {
    await c.query(`select pg_advisory_xact_lock(hashtextextended($1, 0))`, [`dlv-sancion:${uid}`]);
    if (kind !== "aviso" && (await c.query(`select repartidor_sancionado($1::uuid) as k`, [uid])).rows[0]?.k === (kind === "baneo" ? "baneo" : "suspension")) return { ok: false, mensaje: "Ya tiene esa sanción vigente." };
    const inc = incidente && /^\d{1,18}$/.test(incidente) ? incidente : null;
    await c.query(`insert into driver_sanctions (user_id, city_id, kind, until, reason, incident_id, by_user) values ($1, $2, $3, case when $3 = 'suspension' then now() + make_interval(days => $4) end, $5, $6::bigint, $7)`,
      [uid, city, kind, d || 0, m, inc, s.id]);
    let quitados: { biz: string; numero: string }[] = [];
    if (kind !== "aviso") {
      // Suspendido o baneado: fuera de línea en todos sus equipos; las ofertas abiertas ya no le salen (repartidor_sancionado).
      await c.query(`update delivery_drivers set online = false where user_id = $1 and status = 'active'`, [uid]);
      if (kind === "baneo") {
        // Baneo: sale de todos sus equipos; lo que tenía asignado y no entregó vuelve a «sin repartidor» y el negocio lo sabe.
        quitados = (await c.query<{ biz: string; numero: string }>(
          `update operations o set driver_id = null, updated_at = now() from delivery_drivers d where d.id = o.driver_id and d.user_id = $1 and o.kind = 'order' and o.status = 'confirmed' and coalesce(o.stage, '') <> 'delivered'
           returning o.business_id as biz, o.number as numero`, [uid])).rows;
        await c.query(`update trip_runs r set driver_id = null, updated_at = now() from delivery_drivers d where d.id = r.driver_id and d.user_id = $1 and r.status = 'scheduled'`, [uid]);
        await c.query(`update delivery_drivers set status = 'removed', removed_at = now(), removed_reason = 'To''Latino', online = false, invite_code = null where user_id = $1 and status <> 'removed'`, [uid]);
      }
    }
    await auditar(c, { actor: s.id, action: `repartidor.sancion.${kind}`, targetKind: "user", targetId: uid, city, after: { sancion: kind, ...(kind === "suspension" ? { dias: d } : {}), ...(inc ? { incidencia: inc } : {}) }, reason: m });
    return { ok: true, mensaje: kind === "aviso" ? "Aviso dejado. Le llegó el motivo." : kind === "suspension" ? `Suspendido ${d} ${d === 1 ? "día" : "días"}. Le llegó el motivo.` : "Baneado: salió de sus equipos. Le llegó el motivo.", quitados };
  });
  if (r.ok) {
    const { avisar, avisarNegocio } = await import("./avisos");
    const q = QUE[kind]!, hasta = kind === "suspension" ? ` por ${d} ${d === 1 ? "día" : "días"}` : "", hastaEn = kind === "suspension" ? ` for ${d} ${d === 1 ? "day" : "days"}` : "";
    await avisar(uid, "drv_sancion", { que: `${q[0]}${hasta}`, que_en: `${q[1]}${hastaEn}`, motivo: m }, { href: "/repartidor?t=perfil", actor: s.id }).catch(() => undefined);
    for (const x of ("quitados" in r ? r.quitados ?? [] : [])) await avisarNegocio(x.biz, "biz_dlv_issue", { repartidor: "To'Latino", num: x.numero, motivo: "el repartidor ya no reparte en To'Latino: asígnalo a otro" }, { href: `/panel/${x.biz}/hoy?det=ped:${x.numero}`, ref: ["order", x.numero] }).catch(() => undefined);
  }
  return r.ok ? { ok: true, mensaje: r.mensaje } : r;
}

export async function levantarSancion(s: Staff, id: string, motivo: string): Promise<ResD> {
  const m = motivoOk(motivo);
  if (!/^\d{1,18}$/.test(id)) return { ok: false, mensaje: "Esa sanción no existe." };
  if (m.length < 3) return { ok: false, mensaje: "Escribe el motivo." };
  const r = await tx(async (c): Promise<ResD & { uid?: string }> => {
    const x = (await c.query<{ uid: string; kind: string; city: string | null; lifted: boolean; by: string }>(`select user_id::text as uid, kind, city_id as city, lifted_at is not null as lifted, by_user::text as by from driver_sanctions where id = $1::bigint for update`, [id])).rows[0];
    if (!x || !enSusCiudades(s, x.city)) return { ok: false, mensaje: "Esa sanción no existe." };
    if (x.lifted) return { ok: false, mensaje: "Ya estaba levantada." };
    if (x.kind === "baneo" && s.role !== "admin") return { ok: false, mensaje: "Solo un Admin levanta un baneo." };
    if (x.kind === "baneo" && x.by === s.id) return { ok: false, mensaje: "Otra persona del equipo levanta un baneo (no quien lo puso)." };
    await c.query(`update driver_sanctions set lifted_at = now(), lifted_by = $2, lift_reason = $3 where id = $1::bigint`, [id, s.id, m]);
    await auditar(c, { actor: s.id, action: "repartidor.sancion.levantar", targetKind: "user", targetId: x.uid, city: x.city, after: { sancion: ({ aviso: "aviso", suspension: "suspensión", baneo: "baneo" } as Record<string, string>)[x.kind] ?? "sanción" }, reason: m });
    return { ok: true, mensaje: x.kind === "baneo" ? "Levantado. Para volver a repartir, el negocio lo invita otra vez." : "Levantada. Ya puede ponerse en línea.", uid: x.uid };
  });
  if (r.ok && "uid" in r && r.uid) await (await import("./avisos")).avisar(r.uid, "drv_sancion", { que: "Levantamos la sanción de tu cuenta de repartidor", que_en: "We lifted the sanction on your driver account", motivo: m }, { href: "/repartidor", actor: s.id }).catch(() => undefined);
  return r.ok ? { ok: true, mensaje: r.mensaje } : r;
}
