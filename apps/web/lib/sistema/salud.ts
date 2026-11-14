import "server-only";
import { statfs } from "node:fs/promises";
import { auditar, type Staff } from "../admin";
import { db, tx } from "../db";
import { ENTORNO } from "../entorno";

/* 9j · Super Admin › Sistema › Salud (prototipo secSys «health»; ADM-SYS «errores, latencia, colas de trabajos, estado de servicios; mantenimiento
   programado»; fase9-apertura.md §3.5). En el sandbox lee el sandbox: lo que mide el barrido cada 5 minutos (health_checks: la base, el barrido, la
   cola del push, el disco y los errores), el estado de cada tarea del barrido (system_jobs), los errores de las últimas 24 h por tipo (web, apps y
   servidor), las llaves del llavero que vencen y el mantenimiento programado. 9o: los últimos despliegues y sus vueltas atrás (deploy_releases, los
   anota el deploy.sh de cada entorno), las llaves del servidor que viven fuera del llavero (server_keys: RESPALDO_LLAVE, el certificado de origen de
   Cloudflare, el token del proveedor) y, en producción, las máquinas que mide Prometheus en la réplica (PROMETHEUS_URL, por la red privada; sin él la
   fila no sale). Este tablero es el de Prometheus (HERRAMIENTAS #15: no hay Grafana aparte). Nada aquí lleva personas. */
type Bi = { es: string; en: string };
export type Servicio = "base" | "barrido" | "push" | "disco" | "errores";
export const SERVICIOS: Servicio[] = ["base", "barrido", "push", "disco", "errores"];
const CADA_MIN = 5;
export const AVISO_LLAVE_DIAS = 30;

/* ── La medición (barrido, cada 5 minutos; cada servicio en su fila, solo inserción) ── */
export async function medirSalud(): Promise<number> {
  const ultima = (await db().query<{ hace: number | null }>(`select extract(epoch from now() - max(at))::float as hace from health_checks where not is_test and service <> 'vigia'`)).rows[0]?.hace;
  if (ultima != null && ultima < CADA_MIN * 60 - 5) return 0;
  const filas: { service: Servicio; ok: boolean; latency_ms: number | null; value: number | null; detail: string }[] = [];
  const t0 = Date.now();
  await db().query(`select 1`);
  const lat = Date.now() - t0;
  filas.push({ service: "base", ok: lat < 500, latency_ms: lat, value: null, detail: `select 1 en ${lat} ms` });
  const b = (await db().query<{ fallan: number; total: number; atraso: number | null }>(
    `select count(*) filter (where last_error is not null and (last_ok_at is null or last_ok_at < last_run_at))::int as fallan, count(*)::int as total,
            extract(epoch from now() - max(last_run_at))::int as atraso from system_jobs where name like 'barrido.%'`)).rows[0];
  const atraso = b?.atraso ?? null;
  filas.push({ service: "barrido", ok: (b?.fallan ?? 0) === 0 && atraso != null && atraso < 600, latency_ms: null, value: b?.fallan ?? 0,
    detail: `${b?.fallan ?? 0} de ${b?.total ?? 0} tareas con error · última vuelta hace ${atraso ?? "—"} s` });
  const p = (await db().query<{ n: number; vieja: number | null }>(
    `select count(*)::int as n, extract(epoch from now() - min(not_before))::int as vieja from push_outbox where status = 'pendiente' and not_before <= now()`)).rows[0];
  filas.push({ service: "push", ok: (p?.vieja ?? 0) < 600, latency_ms: null, value: p?.n ?? 0, detail: `${p?.n ?? 0} en cola · la más vieja hace ${p?.vieja ?? 0} s` });
  try {
    const d = await statfs("/");
    const pct = d.blocks > 0 ? Math.round((1 - d.bavail / d.blocks) * 100) : 0;
    filas.push({ service: "disco", ok: pct < 85, latency_ms: null, value: pct, detail: `${pct} % usado` });
  } catch { filas.push({ service: "disco", ok: false, latency_ms: null, value: null, detail: "no se pudo leer el disco" }); }
  const e = (await db().query<{ n: number }>(`select count(*)::int as n from app_error_events where at > now() - interval '1 hour'`)).rows[0]?.n ?? 0;
  filas.push({ service: "errores", ok: e < 100, latency_ms: null, value: e, detail: `${e} en la última hora` });
  for (const f of filas)
    await db().query(`insert into health_checks (service, ok, latency_ms, value, detail, is_test) values ($1, $2, $3, $4, $5, false)`, [f.service, f.ok, f.latency_ms, f.value, f.detail]);
  await db().query(`select health_checks_purgar()`);
  return filas.length;
}

/* ── Lo que ve Sistema › Salud ── */
export type FilaServicio = { service: Servicio; ok: boolean | null; at: string | null; latency: number | null; value: number | null; detail: string | null; caidas24: number };
export type DatosSalud = {
  disponibilidad: number | null; p95: number | null; errores: { web: number; apps: number; servidor: number }; trabajosConError: { name: string; error: string; at: string | null }[];
  servicios: FilaServicio[]; llaves: { kind: string; version: number; vence: string; dias: number; servidor?: boolean }[];
  mantenimiento: { id: string; desde: string; hasta: string; es: string; en: string; motivo: string; por: string | null; estado: "programado" | "en_curso" | "pasado" | "cancelado" }[];
  despliegues: { id: string; commit: string; fin: string; result: "ok" | "vuelta_atras" | "fallo"; motivo: string | null; entorno: string }[] | null; entorno: string;
  maquinas: { nombre: string; cpu: number | null; memoria: number | null; disco: number | null }[] | null;
};

/* 9o · Las máquinas de producción según Prometheus (la réplica, por la red privada): CPU, memoria y disco de cada una. 2 s como mucho; si no contesta,
   la fila no sale (Salud nunca se queda esperando por el monitoreo). */
async function maquinasPrometheus(): Promise<DatosSalud["maquinas"]> {
  const base = process.env.PROMETHEUS_URL;
  if (!base || !/^http:\/\/(10|172\.(1[6-9]|2\d|3[01])|192\.168)\.[0-9.]+:9090$/.test(base)) return null;
  const q = async (expr: string) => {
    const r = await fetch(`${base}/api/v1/query?query=${encodeURIComponent(expr)}`, { signal: AbortSignal.timeout(2000), cache: "no-store" });
    const j = (await r.json()) as { data?: { result?: { metric: { maquina?: string }; value: [number, string] }[] } };
    return new Map((j.data?.result ?? []).map((x) => [x.metric.maquina ?? "?", Math.round(Number(x.value[1]))]));
  };
  try {
    const [cpu, mem, dis] = await Promise.all([
      q(`100 * (1 - avg by (maquina) (rate(node_cpu_seconds_total{mode="idle"}[5m])))`),
      q(`100 * (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)`),
      q(`100 * (1 - node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"})`),
    ]);
    return [...new Set([...cpu.keys(), ...mem.keys(), ...dis.keys()])].sort().map((n) => ({ nombre: n, cpu: cpu.get(n) ?? null, memoria: mem.get(n) ?? null, disco: dis.get(n) ?? null }));
  } catch { return null; }
}
const ISO = (c: string) => `to_char((${c}) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;

export async function saludAdmin(): Promise<DatosSalud> {
  const [k, s, e, j, ll, m, dep, maq] = await Promise.all([
    db().query<{ disp: number | null; p95: number | null }>(
      `select round(100.0 * count(*) filter (where ok) / nullif(count(*), 0), 2)::float as disp,
              (select percentile_disc(0.95) within group (order by latency_ms) from health_checks where service = 'base' and at > now() - interval '24 hours' and latency_ms is not null)::float as p95
         from health_checks where service = 'base' and at > now() - interval '30 days'`),
    db().query<FilaServicio>(
      `select x.service, h.ok, ${ISO("h.at")} as at, h.latency_ms as latency, h.value::float as value, h.detail,
              (select count(*)::int from health_checks y where y.service = x.service and not y.ok and y.at > now() - interval '24 hours') as "caidas24"
         from unnest($1::text[]) as x(service)
         left join lateral (select ok, at, latency_ms, value, detail from health_checks h where h.service = x.service order by at desc limit 1) h on true`, [SERVICIOS]),
    db().query<{ web: number; apps: number; servidor: number }>(
      `select count(*) filter (where g.kind in ('js', 'red') and g.platform = 'web')::int as web,
              count(*) filter (where g.platform <> 'web')::int as apps,
              count(*) filter (where g.kind = 'servidor')::int as servidor
         from app_error_events e join app_error_groups g on g.id = e.group_id where e.at > now() - interval '24 hours'`),
    db().query<{ name: string; error: string; at: string | null }>(
      `select replace(name, 'barrido.', '') as name, left(last_error, 160) as error, ${ISO("last_run_at")} as at from system_jobs
        where last_error is not null and (last_ok_at is null or last_ok_at < last_run_at) order by last_run_at desc nulls last limit 8`),
    db().query<{ kind: string; version: number; vence: string; dias: number; servidor: boolean }>(
      `select * from (
         select kind, version, to_char(expires_on, 'YYYY-MM-DD') as vence, (expires_on - current_date)::int as dias, false as servidor from store_secrets
          where retired_at is null and expires_on is not null
         union all
         select key_name || ' · ' || machine, 1, to_char(expires_on, 'YYYY-MM-DD'), (expires_on - current_date)::int, true from server_keys
          where retired_at is null and expires_on is not null) x order by vence limit 20`),
    db().query<DatosSalud["mantenimiento"][number]>(
      `select w.id::text, ${ISO("w.from_at")} as desde, ${ISO("w.to_at")} as hasta, w.message->>'es' as es, w.message->>'en' as en, w.reason as motivo,
              nullif(trim(coalesce(u.first_name, '') || ' ' || left(coalesce(u.last_name, ''), 1)), '') as por,
              case when w.cancelled_at is not null then 'cancelado' when w.to_at < now() then 'pasado' when w.from_at <= now() then 'en_curso' else 'programado' end as estado
         from maintenance_windows w left join users u on u.id = w.by_staff order by w.from_at desc limit 10`),
    import("./despliegues").then((x) => x.ultimosDespliegues(5)).catch(() => null),
    maquinasPrometheus(),
  ]);
  return {
    disponibilidad: k.rows[0]?.disp ?? null, p95: k.rows[0]?.p95 ?? null, errores: e.rows[0] ?? { web: 0, apps: 0, servidor: 0 }, trabajosConError: j.rows,
    servicios: s.rows, llaves: ll.rows, mantenimiento: m.rows, despliegues: dep, entorno: ENTORNO, maquinas: maq,
  };
}

/* ── Mantenimiento programado (sys:editar; con motivo; no se edita: se cancela y se programa otro) ── */
const mal = (es: string, en: string) => ({ ok: false as const, msg: { es, en } });
const limpio = (x: unknown, max: number) => String(x ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
/* «2026-11-20 02:00» en la hora de Hazleton (America/New_York) → instante. */
function enNuevaYork(t: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/.exec(t.trim());
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number) as [number, number, number, number, number];
  const utc = Date.UTC(y, mo - 1, d, h, mi);
  const parte = (z: number) => { const p = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(new Date(z));
    const g = (k: string) => Number(p.find((x) => x.type === k)?.value); return Date.UTC(g("year"), g("month") - 1, g("day"), g("hour") % 24, g("minute")); };
  const off = parte(utc) - utc;
  const r = new Date(utc - off);
  return Number.isNaN(r.getTime()) ? null : r;
}

export async function programarMantenimiento(s: Staff, x: { desde: string; hasta: string; es: string; en: string }, motivo: string): Promise<{ ok: true; msg: Bi } | { ok: false; msg: Bi }> {
  if (!s.puede("sys", "editar")) return mal("Tu rol no programa mantenimientos.", "Your role cannot schedule maintenance.");
  const m = limpio(motivo, 300), es = limpio(x.es, 200), en = limpio(x.en, 200);
  if (m.length < 3) return mal("Escribe el motivo.", "Write the reason.");
  if (es.length < 3 || en.length < 3) return mal("El aviso va en español y en inglés.", "The notice goes in Spanish and in English.");
  const d = enNuevaYork(String(x.desde ?? "")), h = enNuevaYork(String(x.hasta ?? ""));
  if (!d || !h) return mal("Las horas van como AAAA-MM-DD HH:MM (hora de Hazleton).", "Times go as YYYY-MM-DD HH:MM (Hazleton time).");
  if (d.getTime() < Date.now() + 60 * 60 * 1000) return mal("Se programa con al menos una hora de anticipación.", "Schedule it at least one hour ahead.");
  if (h.getTime() <= d.getTime() || h.getTime() - d.getTime() > 6 * 3600 * 1000) return mal("Termina después de empezar y dura 6 horas como máximo.", "It ends after it starts and lasts 6 hours at most.");
  return tx(async (c) => {
    const choca = (await c.query(`select 1 from maintenance_windows where cancelled_at is null and from_at < $2 and to_at > $1`, [d, h])).rowCount;
    if (choca) return mal("Ya hay un mantenimiento a esa hora.", "There is already maintenance at that time.");
    const id = (await c.query<{ id: string }>(`insert into maintenance_windows (from_at, to_at, message, by_staff, reason) values ($1, $2, $3, $4, $5) returning id::text`,
      [d, h, JSON.stringify({ es, en }), s.id, m])).rows[0]!.id;
    await auditar(c, { actor: s.id, action: "sistema.mantenimiento", targetKind: "maintenance", targetId: id, after: { desde: x.desde, hasta: x.hasta, aviso: es }, reason: m });
    return { ok: true as const, msg: { es: "Mantenimiento programado.", en: "Maintenance scheduled." } };
  });
}

export async function cancelarMantenimiento(s: Staff, id: string, motivo: string): Promise<{ ok: true; msg: Bi } | { ok: false; msg: Bi }> {
  if (!s.puede("sys", "editar")) return mal("Tu rol no cancela mantenimientos.", "Your role cannot cancel maintenance.");
  const m = limpio(motivo, 300);
  if (m.length < 3) return mal("Escribe el motivo.", "Write the reason.");
  if (!/^\d{1,18}$/.test(String(id))) return mal("Ese mantenimiento no existe.", "That maintenance does not exist.");
  return tx(async (c) => {
    const n = (await c.query(`update maintenance_windows set cancelled_at = now(), cancelled_by = $2, cancel_reason = $3 where id = $1 and cancelled_at is null and to_at > now()`, [id, s.id, m])).rowCount ?? 0;
    if (!n) return mal("Ese mantenimiento ya pasó o ya estaba cancelado.", "That maintenance already passed or was already cancelled.");
    await auditar(c, { actor: s.id, action: "sistema.mantenimiento.cancelar", targetKind: "maintenance", targetId: id, before: { estado: "programado" }, after: { estado: "cancelado" }, reason: m });
    return { ok: true as const, msg: { es: "Mantenimiento cancelado.", en: "Maintenance cancelled." } };
  });
}

/* ── Llaves que vencen (barrido): una llave viva del llavero que vence en 30 días o venció → un aviso a cada Admin, una vez por llave, versión y
   etapa (30 días, 7 días, vencida). El certificado del pase ya tenía el suyo (lib/pases/certificado.ts); este cubre todas las demás. ── */
const NOMBRES: Record<string, string> = { asc_api_key: "Llave de la API de App Store Connect", apns_key: "Llave de APNs", fcm_service_account: "Cuenta de servicio de Firebase",
  play_service_account: "Cuenta de servicio de Play", android_upload_keystore: "Llave de subida de Android", ios_dist_cert: "Certificado de distribución de iOS",
  google_wallet_sa: "Cuenta de Google Wallet", github_token: "Token de GitHub" };
const SERVIDOR: Record<string, string> = { respaldo_llave: "Llave de los respaldos", cloudflare_origen: "Certificado de origen de Cloudflare", proveedor_token: "Token del proveedor de servidores",
  age_servidor: "Llave del sobre sellado del servidor", recuperacion: "Llave de recuperación" };
const nombreLlave = (k: string) => NOMBRES[k] ?? (k.includes(":") ? `${SERVIDOR[k.split(":")[0]!] ?? k.split(":")[0]} (${k.split(":")[1]})` : k);
export async function avisarLlavesQueVencen(): Promise<number> {
  const r = await db().query<{ id: string; kind: string; version: number; vence: string; dias: number }>(
    `select id::text, kind, version, to_char(expires_on, 'YYYY-MM-DD') as vence, (expires_on - current_date)::int as dias from store_secrets
      where retired_at is null and expires_on is not null and kind <> 'pass_type_cert' and expires_on <= current_date + $1::int`, [AVISO_LLAVE_DIAS]);
  // 9o · Las llaves del servidor que viven fuera del llavero (server_keys: RESPALDO_LLAVE, el certificado de origen de Cloudflare, el token del
  // proveedor…): el mismo aviso, con su nombre y su máquina.
  const sk = await db().query<{ id: string; kind: string; version: number; vence: string; dias: number }>(
    `select 's' || id::text as id, key_name || ':' || machine as kind, 1 as version, to_char(expires_on, 'YYYY-MM-DD') as vence, (expires_on - current_date)::int as dias from server_keys
      where retired_at is null and expires_on is not null and expires_on <= current_date + $1::int`, [AVISO_LLAVE_DIAS]);
  r.rows.push(...sk.rows);
  if (!r.rows.length) return 0;
  const equipo = (await db().query<{ id: string }>(`select user_id::text as id from staff_members where role = 'admin' and status = 'active'`)).rows;
  const { avisar } = await import("../avisos");
  let n = 0;
  for (const k of r.rows) {
    const etapa = k.dias < 0 ? "vencida" : k.dias <= 7 ? "7d" : "30d", ref = `${k.id}:${etapa}`;
    if ((await db().query(`select 1 from notifications where ref_kind = 'llave_vence' and ref_id = $1 limit 1`, [ref])).rowCount) continue;
    const fecha = new Intl.DateTimeFormat("es-US", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" }).format(new Date(`${k.vence}T12:00:00Z`));
    for (const u of equipo) {
      await avisar(u.id, "llave_vence", { llave: nombreLlave(k.kind), version: String(k.version), fecha, cuando: k.dias < 0 ? "ya venció" : k.dias === 0 ? "hoy" : `en ${k.dias} días` },
        { href: "/admin/sistema/integraciones", ref: ["llave_vence", ref], sinSms: true }).catch(() => undefined);
      n++;
    }
  }
  return n;
}
