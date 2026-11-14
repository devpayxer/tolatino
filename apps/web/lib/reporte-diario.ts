import "server-only";
import { auditar, type Staff } from "./admin";
import { avisar } from "./avisos";
import { cfgSql } from "./config";
import { COLAS, slaCase, type Cola } from "./colas";
import { BASE_URL, encolar } from "./correo";
import { marco, type Fila } from "./correo/plantillas";
import { db, tx } from "./db";
import { dbAnalisis } from "./db-analisis";

/* 9g · El reporte diario al fundador (HERRAMIENTAS #31, PLAN §5 guardián «Reporte diario»; fase9-apertura.md §4 9g). A las 7:30 AM de Hazleton, por
   correo y push, a los Admins activos: negocios nuevos de ayer, operaciones, dinero, errores, vueltas atrás, colas vencidas, lo que vigilan los
   guardianes en vivo y «lo que necesita de ti» (los pasos pendientes de Sistema › Apps › «Lo que te toca»). Uno por día (founder_reports, solo
   inserción: el cuerpo y a dónde salió). Si a las 8:00 no salió (o salió tarde), queda la alerta del día y un aviso a los Admins (guardián
   reporteDiarioSale). Solo cifras, nombres de negocios y los pasos del fundador: nunca una persona (guardián analiticaSinPersonas).
   La conciliación del dinero llega con 9k; las vueltas atrás de ayer las cuenta vueltas_atras_del_dia() (0145, 9o: el azul/verde las anota en
   deploy_releases). */
export const HORA_REPORTE = { h: 7, m: 30 };       // 7:30 AM de Hazleton
export const HORA_ALERTA = { h: 8, m: 0 };         // si a las 8:00 no salió, alerta
const MIN = (x: { h: number; m: number }) => x.h * 60 + x.m;
const usd = (c: number) => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export type CuerpoReporte = {
  dia: string; ayer: string;
  negocios: { nuevos: number; nombres: string[] };
  operaciones: { enviadas: number; aceptadas: number; hechas: number; canceladas: number };
  dinero: { bruto: number; comision: number; devuelto: number; mrr: number; conciliacion: null | { ok: boolean; diferencia: number } };
  errores: { grupos_nuevos: number; eventos: number; barrido: string[] };
  vueltas: null | { n: number };
  colas: { cola: string; n: number }[]; soporte_vencidos: number;
  guardianes: { sobreventa: number; compa_pct: number | null; errores_vivos: number };
  pendientes: { paquete: string; es: string; en: string }[];
};

/* Las cifras de ayer (día de Hazleton). Lectura por la base de análisis; nada de una persona. */
export async function armarReporte(): Promise<CuerpoReporte> {
  const sla = slaCase(cfgSql);
  const AYER = `((now() at time zone 'America/New_York')::date - 1)`;
  const [dias, neg, ops, din, mrr, err, bar, colas, sop, sv, cg, vu] = await Promise.all([
    dbAnalisis().query<{ dia: string; ayer: string }>(`select (now() at time zone 'America/New_York')::date::text as dia, ${AYER}::text as ayer`),
    dbAnalisis().query<{ n: number; nombres: string[] }>(
      `select count(*)::int as n, coalesce((array_agg(b.name order by b.created_at))[1:5], '{}') as nombres from businesses b
        where (b.created_at at time zone 'America/New_York')::date = ${AYER} and b.status = 'active'`),
    dbAnalisis().query<{ enviadas: number; aceptadas: number; hechas: number; canceladas: number }>(
      `select count(*) filter (where (o.sent_at at time zone 'America/New_York')::date = ${AYER})::int as enviadas,
              count(*) filter (where (o.confirmed_at at time zone 'America/New_York')::date = ${AYER})::int as aceptadas,
              count(*) filter (where (o.done_at at time zone 'America/New_York')::date = ${AYER})::int as hechas,
              count(*) filter (where (o.cancelled_at at time zone 'America/New_York')::date = ${AYER})::int as canceladas
         from operations o where o.updated_at > now() - interval '3 days' and o.kind <> 'plan'`),   // los cobros de un plan ya contratado no son una operación nueva
    dbAnalisis().query<{ bruto: number; comision: number; devuelto: number }>(
      `select coalesce(sum(x.bruto_cents), 0)::float8 as bruto, coalesce(sum(x.comision_cents), 0)::float8 as comision, coalesce(sum(x.devuelto_cents), 0)::float8 as devuelto
         from metricas_dinero_dia x where x.dia = ${AYER}`),
    dbAnalisis().query<{ mrr: number }>(
      `select coalesce(sum(f.mrr_cents), 0)::float8 as mrr from (select distinct on (x.city_id) x.mrr_cents from metricas_pro_dia x where x.mrr_cents is not null order by x.city_id, x.dia desc) f`),
    dbAnalisis().query<{ grupos: number; eventos: number; vivos: number }>(
      `select (select count(*) from app_error_groups g where (g.first_seen at time zone 'America/New_York')::date = ${AYER})::int as grupos,
              (select count(*) from app_error_events v where (v.at at time zone 'America/New_York')::date = ${AYER} and not v.is_test)::int as eventos,
              (select count(*) from app_error_groups g where g.status = 'nuevo')::int as vivos`),
    dbAnalisis().query<{ name: string }>(`select replace(name, 'barrido.', '') as name from system_jobs where name like 'barrido.%' and last_error is not null and last_run_at > now() - interval '1 day' order by name limit 10`),
    dbAnalisis().query<{ queue: Cola; n: number }>(
      `select q.queue, count(*)::int as n from queue_items q where q.status = 'open' and extract(epoch from now() - q.opened_at) > (${sla}) * 3600 group by 1 order by 2 desc`),
    dbAnalisis().query<{ n: number }>(`select count(*)::int as n from support_cases c where c.status in ('new', 'in_progress', 'reopened') and c.first_reply_at is null and c.sla_due_at < now()`),
    dbAnalisis().query<{ n: number }>(`select count(*)::int as n from evt_sobreventa`),
    dbAnalisis().query<{ pct: number | null }>(
      `select case when cfg_int('compa_tope_mes_cents') > 0 then least(100, floor((coalesce(s.spent_microusd, 0) / 10000.0) / cfg_int('compa_tope_mes_cents') * 100))::int end as pct
         from (select 1) x left join compa_spend_month s on s.month = compa_mes()`),
    dbAnalisis().query<{ n: number }>(`select vueltas_atras_del_dia(${AYER}) as n`),
  ]);
  // Lo que necesita del fundador: los pasos pendientes de «Lo que te toca» (Sistema › Apps). Si no se puede saber (sin red), se dice.
  let pendientes: CuerpoReporte["pendientes"] = [];
  try {
    const { loQueTeToca } = await import("./tiendas/paquete");
    pendientes = (await loQueTeToca()).flatMap((p) => p.pasos.filter((x) => x.estado !== "hecho").map((x) => ({ paquete: p.k, es: x.t.es, en: x.t.en })));
  } catch { pendientes = [{ paquete: "?", es: "No se pudo leer «Lo que te toca» (míralo en Sistema › Apps)", en: "Could not read «Your part» (see System › Apps)" }]; }
  const d = din.rows[0]!;
  return {
    dia: dias.rows[0]!.dia, ayer: dias.rows[0]!.ayer,
    negocios: { nuevos: neg.rows[0]!.n, nombres: neg.rows[0]!.nombres ?? [] },
    operaciones: ops.rows[0]!,
    dinero: { bruto: d.bruto, comision: d.comision, devuelto: d.devuelto, mrr: mrr.rows[0]?.mrr ?? 0, conciliacion: null },   // 9k: conciliación diaria con Stripe
    errores: { grupos_nuevos: err.rows[0]!.grupos, eventos: err.rows[0]!.eventos, barrido: bar.rows.map((x) => x.name) },
    vueltas: { n: vu.rows[0]?.n ?? 0 },                                                                                     // 9o: vuelta atrás automática (deploy_releases)
    colas: colas.rows.map((x) => ({ cola: COLAS[x.queue]?.es ?? x.queue, n: x.n })), soporte_vencidos: sop.rows[0]!.n,
    guardianes: { sobreventa: sv.rows[0]!.n, compa_pct: cg.rows[0]?.pct ?? null, errores_vivos: err.rows[0]!.vivos },
    pendientes,
  };
}

/* El correo (y el texto del push) en el idioma de quien lo recibe. */
export function textoReporte(b: CuerpoReporte, es: boolean) {
  const E = (x: string, y: string) => (es ? x : y);
  const filas: Fila[] = [
    [E("Negocios nuevos", "New businesses"), `${b.negocios.nuevos}${b.negocios.nombres.length ? ` · ${b.negocios.nombres.join(", ")}` : ""}`, true],
    [E("Operaciones enviadas", "Transactions sent"), String(b.operaciones.enviadas)], [E("Aceptadas · hechas · canceladas", "Accepted · done · cancelled"), `${b.operaciones.aceptadas} · ${b.operaciones.hechas} · ${b.operaciones.canceladas}`],
    [E("Vendido en línea", "Sold online"), usd(b.dinero.bruto), true], [E("Comisión", "Commission"), usd(b.dinero.comision)], [E("Devuelto", "Refunded"), usd(b.dinero.devuelto)], ["MRR", usd(b.dinero.mrr)],
    [E("Conciliación con Stripe", "Stripe reconciliation"), b.dinero.conciliacion ? (b.dinero.conciliacion.ok ? E("cuadra", "matches") : usd(b.dinero.conciliacion.diferencia)) : E("llega con 9k", "arrives with 9k")],
    [E("Errores nuevos · eventos", "New errors · events"), `${b.errores.grupos_nuevos} · ${b.errores.eventos}`],
    [E("Tareas del barrido con error", "Sweep tasks with errors"), b.errores.barrido.length ? b.errores.barrido.join(", ") : E("ninguna", "none")],
    [E("Vueltas atrás", "Rollbacks"), b.vueltas ? String(b.vueltas.n) : E("llegan con 9o", "arrive with 9o")],
    [E("Colas vencidas", "Overdue queues"), b.colas.length ? b.colas.map((x) => `${x.cola} ${x.n}`).join(" · ") : E("ninguna", "none")], [E("Soporte fuera de plazo", "Support past deadline"), String(b.soporte_vencidos)],
    [E("Guardianes en vivo", "Live guardians"), E(`sobreventa ${b.guardianes.sobreventa} · errores sin revisar ${b.guardianes.errores_vivos} · El Compa ${b.guardianes.compa_pct ?? "—"} % del tope`,
      `overselling ${b.guardianes.sobreventa} · unreviewed errors ${b.guardianes.errores_vivos} · El Compa ${b.guardianes.compa_pct ?? "—"} % of the cap`)],
  ];
  const pend = b.pendientes.length ? b.pendientes.map((p) => `${p.paquete} · ${es ? p.es : p.en}`) : [E("Nada por ahora.", "Nothing for now.")];
  return { filas, pend, resumen: E(`Ayer: ${b.negocios.nuevos} negocios nuevos, ${b.operaciones.enviadas} operaciones, ${usd(b.dinero.bruto)} vendido.`, `Yesterday: ${b.negocios.nuevos} new businesses, ${b.operaciones.enviadas} transactions, ${usd(b.dinero.bruto)} sold.`) };
}

/* El correo del reporte: las cifras y, en su propio bloque, «lo que necesita de ti». */
function correoReporte(b: CuerpoReporte, es: boolean) {
  const t = textoReporte(b, es), subject = es ? `Tu reporte de hoy · ${b.dia}` : `Your report for today · ${b.dia}`;
  const { html, text } = marco({ es, pre: t.resumen, titulo: subject, intro: t.resumen, filas: t.filas,
    nota: `${es ? "Lo que necesita de ti" : "What needs you"}: ${t.pend.join(" · ")}`, cta: { l: es ? "Abrir el Super Admin" : "Open the Super Admin", href: `${BASE_URL()}/admin/analitica?tab=rep` } });
  return { subject, html, text };
}

/* «Mándamelo ahora» (Analítica › Reportes, solo Admins): el de hoy, armado en este momento, a quien lo pide (correo y push). Es una copia: no cuenta
   como el reporte del día (founder_reports no cambia) y queda en la auditoría. */
export async function mandarmeElReporte(s: Staff): Promise<{ ok: boolean; mensaje: { es: string; en: string } }> {
  if (s.role !== "admin") return { ok: false, mensaje: { es: "El reporte diario es de los Admins.", en: "The daily report is for Admins." } };
  const u = (await db().query<{ email: string | null; lang: string }>(`select email::text as email, coalesce(lang, 'es') as lang from users where id = $1`, [s.id])).rows[0];
  if (!u?.email) return { ok: false, mensaje: { es: "Agrega tu correo en Mi cuenta › Perfil para recibirlo.", en: "Add your email in My account › Profile to get it." } };
  const b = await armarReporte(), es = u.lang !== "en", t = textoReporte(b, es);
  await encolar({ userId: s.id, to: u.email, tpl: "founder_daily", ...correoReporte(b, es), ref: ["founder_report_copy", b.dia], idem: `fundador-copia-${b.dia}-${s.id}-${Date.now()}` });
  await avisar(s.id, "reporte_diario", { resumen: t.resumen, pendientes: String(b.pendientes.length) }, { href: "/admin/analitica?tab=rep", ref: ["founder_report_copy", b.dia] });
  await tx((c) => auditar(c, { actor: s.id, action: "analitica.reporte_ahora", targetKind: "report", targetId: b.dia, after: { "Reporte diario": "copia a mi correo y push" }, reason: "Mándamelo ahora (Analítica › Reportes)" }));
  return { ok: true, mensaje: { es: "Te lo mandamos a tu correo y como aviso.", en: "We sent it to your email and as a notification." } };
}

/* Arma y manda el de hoy: correo a cada Admin con correo y push a cada Admin. Queda en founder_reports con a dónde salió (por número, nunca a quién). */
export async function enviarReporteDiario(): Promise<{ id: string; created_at: string } | null> {
  const b = await armarReporte();
  const admins = (await dbAnalisis().query<{ id: string; email: string | null; lang: string }>(
    `select u.id::text, u.email::text as email, coalesce(u.lang, 'es') as lang from staff_members m join users u on u.id = m.user_id where m.role = 'admin' and m.status = 'active' order by u.id`)).rows;
  const correos: string[] = [];
  let push = 0;
  for (const a of admins) {
    const es = a.lang !== "en", t = textoReporte(b, es);
    if (a.email) {
      const r = await encolar({ userId: a.id, to: a.email, tpl: "founder_daily", ...correoReporte(b, es), ref: ["founder_report", b.dia], idem: `fundador-${b.dia}-${a.id}` });
      if (r) correos.push(r.id);
    }
    // Un push por persona y día (si el barrido se cayó a la mitad, el que ya salió no se repite).
    const ya = (await db().query(`select 1 from notifications where user_id = $1 and tpl = 'reporte_diario' and ref_kind = 'founder_report' and ref_id = $2 limit 1`, [a.id, b.dia])).rowCount;
    if (!ya) { await avisar(a.id, "reporte_diario", { resumen: t.resumen, pendientes: String(b.pendientes.length) }, { href: "/admin/analitica?tab=rep", ref: ["founder_report", b.dia] }); push++; }
  }
  return (await db().query<{ id: string; created_at: string }>(
    `insert into founder_reports (dia, kind, cifras, destinos) values ($1::date, 'diario', $2::jsonb, $3::jsonb) on conflict (kind, dia) do nothing
     returning id::text, to_char(created_at at time zone 'America/New_York', 'HH24:MI') as created_at`,
    [b.dia, JSON.stringify(b), JSON.stringify([{ canal: "correo", n: correos.length, ids: correos }, { canal: "push", n: push }])])).rows[0] ?? null;
}

/* El barrido: desde las 7:30 manda el de hoy si no salió; desde las 8:00, si no salió antes de las 8:00, deja la alerta del día (una vez) y avisa a los
   Admins. Si no salió, la tarea queda con error en system_jobs (Sistema lo ve). */
export async function barrerReporteDiario(): Promise<string> {
  // Lo que decide (¿ya salió?) se lee de la principal: la réplica puede ir unos segundos atrás.
  const f = (await db().query<{ on: boolean; min: number; dia: string; hecho: string | null }>(
    `select coalesce((select enabled from feature_flags where key = 'reporte.diario'), false) as on,
            (extract(hour from now() at time zone 'America/New_York') * 60 + extract(minute from now() at time zone 'America/New_York'))::int as min,
            (now() at time zone 'America/New_York')::date::text as dia,
            (select to_char(created_at at time zone 'America/New_York', 'HH24:MI') from founder_reports where kind = 'diario' and dia = (now() at time zone 'America/New_York')::date) as hecho`)).rows[0]!;
  if (!f.on || f.min < MIN(HORA_REPORTE)) return "fuera de hora";
  let hecho = f.hecho, error: string | null = null;
  if (!hecho) {
    try { hecho = (await enviarReporteDiario())?.created_at ?? null; } catch (e) { error = String((e as Error)?.message ?? e).slice(0, 200); }
  }
  const [hh, mm] = (hecho ?? "99:99").split(":").map(Number);
  if (f.min >= MIN(HORA_ALERTA) && (!hecho || hh! * 60 + mm! >= MIN(HORA_ALERTA))) await alertar(f.dia, hecho ? "tarde" : "no_salio", error);
  if (!hecho) throw new Error(`el reporte diario no salió${error ? `: ${error}` : ""}`);
  return hecho;
}

async function alertar(dia: string, motivo: "tarde" | "no_salio", error: string | null) {
  const r = await db().query(`insert into founder_reports (dia, kind, cifras) values ($1::date, 'alerta', $2::jsonb) on conflict (kind, dia) do nothing returning id`,
    [dia, JSON.stringify({ motivo, error, hora: HORA_ALERTA })]);
  if (!r.rowCount) return;
  const admins = (await dbAnalisis().query<{ id: string }>(`select m.user_id::text as id from staff_members m where m.role = 'admin' and m.status = 'active'`)).rows;
  for (const a of admins) await avisar(a.id, "reporte_no_salio", {}, { href: "/admin/analitica?tab=rep", ref: ["founder_report_alert", dia] });
}

/* Analítica › Reportes: los últimos 14 (con su alerta, si hubo). */
export async function reportesDiarios() {
  return (await dbAnalisis().query<{ dia: string; kind: "diario" | "alerta"; hora: string; cifras: CuerpoReporte & { motivo?: string }; destinos: { canal: string; n: number }[] }>(
    `select dia::text, kind, to_char(created_at at time zone 'America/New_York', 'HH24:MI') as hora, cifras, destinos from founder_reports
      where founder_reports.dia > (now() at time zone 'America/New_York')::date - 14 order by founder_reports.dia desc, founder_reports.kind desc`)).rows;
}
