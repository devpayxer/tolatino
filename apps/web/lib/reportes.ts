import "server-only";
import { auditar, type Staff } from "./admin";
import { compaSoporteAnalitica, contactosYVistas, dinero, embudos, eventosAnalitica, gente, retencionCohortes, busquedasSinResultado, type Alcance } from "./admin-analitica";
import { BASE_URL, encolar } from "./correo";
import { marco, type Fila } from "./correo/plantillas";
import { db, tx } from "./db";
import { dbAnalisis } from "./db-analisis";

/* 9g · Reportes programados de Analítica por correo (ADM-ANALIT «reportes programados»; prototipo secAnalit › Exportar: «Se envía cada lunes 8 AM»).
   Quien tiene analit:exportar programa una pestaña cada día, semana o mes; el barrido lo manda a las 8:00 AM de Hazleton (cada día · el lunes · el día
   1) a su correo, en su idioma, con las cifras de SUS ciudades. Solo cifras, como la pantalla (guardián analiticaSinPersonas, también aquí): el correo
   sale de las mismas funciones de lib/admin-analitica.ts, nunca de una consulta propia a personas. Se pausa; nunca se borra. */
export const TABS_REPORTE = {
  sum: { es: "Resumen", en: "Overview" },
  dinero: { es: "Dinero", en: "Money" },
  ppl: { es: "Gente y negocios", en: "People and businesses" },
  nosup: { es: "Búsquedas sin resultado", en: "Searches with no results" },
  evt: { es: "Eventos", en: "Events" },
  cpa: { es: "El Compa y Soporte", en: "El Compa and Support" },
  biz: { es: "Negocios", en: "Businesses" },
} as const;
export type TabReporte = keyof typeof TABS_REPORTE;
export type Cada = "dia" | "semana" | "mes";
export const CADA: Record<Cada, { es: string; en: string; dias: number }> = {
  dia: { es: "cada día, 8 AM", en: "every day, 8 AM", dias: 7 },
  semana: { es: "cada lunes, 8 AM", en: "every Monday, 8 AM", dias: 7 },
  mes: { es: "el día 1 de cada mes, 8 AM", en: "on the 1st of each month, 8 AM", dias: 30 },
};
const esTab = (t: string): t is TabReporte => Object.prototype.hasOwnProperty.call(TABS_REPORTE, t);
const esCada = (c: string): c is Cada => c === "dia" || c === "semana" || c === "mes";
const usd = (c: number) => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)} %` : "—");

export type Programado = { tab: TabReporte; cada: Cada; status: "activo" | "pausado"; last_sent_at: string | null };
export async function misReportes(s: Staff): Promise<Programado[]> {
  return (await db().query<Programado>(
    `select tab, cada, status, to_char(last_sent_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as last_sent_at from scheduled_reports where by_staff_id = $1 order by tab`, [s.id])).rows;
}

/* Programar (cada = dia | semana | mes) o pausar (cada = null). Analit:exportar; con auditoría (antes → después). */
export async function programarReporte(s: Staff, tab: string, cada: string | null): Promise<{ ok: boolean; mensaje: { es: string; en: string } }> {
  if (!s.puede("analit", "exportar")) return { ok: false, mensaje: { es: "Tu rol no programa reportes.", en: "Your role cannot schedule reports." } };
  if (!esTab(tab)) return { ok: false, mensaje: { es: "Ese reporte no existe.", en: "That report does not exist." } };
  if (cada !== null && !esCada(cada)) return { ok: false, mensaje: { es: "Elige cada día, cada semana o cada mes.", en: "Pick every day, every week or every month." } };
  return tx(async (c) => {
    const antes = (await c.query<{ cada: string; status: string }>(`select cada, status from scheduled_reports where by_staff_id = $1 and tab = $2 for update`, [s.id, tab])).rows[0];
    if (cada === null) {
      if (!antes || antes.status === "pausado") return { ok: true, mensaje: { es: "Ya estaba en pausa.", en: "It was already paused." } };
      await c.query(`update scheduled_reports set status = 'pausado', updated_at = now() where by_staff_id = $1 and tab = $2`, [s.id, tab]);
    } else {
      await c.query(
        `insert into scheduled_reports (by_staff_id, tab, cada) values ($1, $2, $3)
         on conflict (by_staff_id, tab) do update set cada = excluded.cada, status = 'activo', updated_at = now()`, [s.id, tab, cada]);
    }
    const desc = (x?: { cada: string; status: string }) => (!x || x.status === "pausado" ? "bajo pedido" : CADA[x.cada as Cada]?.es ?? x.cada);
    await auditar(c, { actor: s.id, action: "analitica.programar", targetKind: "report", targetId: tab, before: { [TABS_REPORTE[tab].es]: desc(antes) },
      after: { [TABS_REPORTE[tab].es]: cada === null ? "bajo pedido" : CADA[cada].es }, reason: "Programar desde Analítica" });
    return { ok: true, mensaje: cada === null ? { es: "En pausa. Ya no se envía.", en: "Paused. It no longer goes out." } : { es: `Programado: ${CADA[cada].es}.`, en: `Scheduled: ${CADA[cada].en}.` } };
  });
}

/* Las cifras de una pestaña para el correo (las mismas funciones que la pantalla; sin personas). */
export async function cifrasReporte(tab: TabReporte, a: Alcance, dias: number, es: boolean): Promise<Fila[]> {
  const E = (x: string, y: string) => (es ? x : y);
  if (tab === "dinero" || tab === "sum") {
    const d = await dinero(a, dias), bruto = d.tipos.reduce((s, x) => s + x.bruto, 0), com = d.tipos.reduce((s, x) => s + x.comision, 0), ops = d.tipos.reduce((s, x) => s + x.operaciones, 0);
    const dev = d.tipos.reduce((s, x) => s + x.devuelto, 0);
    const filas: Fila[] = [[E("Vendido en línea", "Sold online"), usd(bruto), true], [E("Comisión", "Commission"), usd(com)], [E("Operaciones cobradas", "Paid transactions"), String(ops)],
      [E("Devuelto", "Refunded"), usd(dev)], [E("Ticket promedio", "Average ticket"), ops ? usd(bruto / ops) : "—"]];
    if (tab === "dinero") return [...filas, ["MRR", usd(d.foto.mrr), true], [E("Pro pagando", "Paying Pro"), String(d.foto.pagando)], [E("En prueba", "On trial"), String(d.foto.prueba)],
      [E("Prueba → pago", "Trial → paid"), pct(d.pro.primeros, d.pro.terminadas)]];
    const [f, v] = await Promise.all([embudos(a, dias), contactosYVistas(a, dias)]);
    return [...filas, [E("Buscaron", "Searched"), String(f.operacion.buscaron)], [E("Abrieron una ficha", "Opened a page"), String(f.operacion.ficha)],
      [E("El negocio aceptó", "The business accepted"), String(f.operacion.aceptadas)], [E("Vistas sin repetidos", "Unique views"), String(v.vistas.unicos)]];
  }
  if (tab === "ppl" || tab === "biz") {
    const g = await gente(a, dias), r = (await retencionCohortes(a)).find((x) => x.base_d7 > 0);
    const filas: Fila[] = [[E("Negocios", "Businesses"), String(g.b.n), true], [E("Pro", "Pro"), String(g.b.pro)], [E("Verificados", "Verified"), String(g.b.ver)]];
    if (tab === "biz") return [...filas, ...g.cats.filter((c) => c.n).slice(0, 8).map((c): Fila => [c.short, `${c.n} · ${c.pro} Pro`])];
    return [[E("Vecinos", "Neighbors"), String(g.u.n), true], [E("Nuevos", "New"), String(g.u.nuevos)], [E("Activos", "Active"), pct(g.u.activos, g.u.n)], ...filas,
      ...(r ? [[E(`Volvieron al día 7 (semana del ${r.cohorte})`, `Came back on day 7 (week of ${r.cohorte})`), pct(r.d7, r.base_d7)] as Fila] : [])];
  }
  if (tab === "nosup") {
    const L = await busquedasSinResultado(a, dias);
    return L.length ? L.slice(0, 10).map((x): Fila => [x.q, E(`${x.personas} personas`, `${x.personas} people`)]) : [[E("Nadie buscó algo sin resultado", "Nobody searched for something with no results"), "—"]];
  }
  if (tab === "evt") {
    const t = (await eventosAnalitica(a, dias)).t;
    return [[E("Vistas de eventos", "Event views"), String(t.vistas)], ["RSVP", String(t.rsvp)], [E("Órdenes de boletos", "Ticket orders"), String(t.ordenes), true],
      [E("Bruto", "Gross"), usd(t.bruto)], [E("Comisión", "Commission"), usd(t.comision)], [E("Devuelto", "Refunded"), usd(t.devuelto)]];
  }
  const c = await compaSoporteAnalitica(a, dias);
  return [[E("Conversaciones de El Compa", "El Compa conversations"), String(c.t.conversaciones), true], [E("Resolvió solo", "Solved alone"), pct(c.t.resolvio_solo + c.t.accion, c.t.conversaciones)],
    [E("Casos de Soporte", "Support cases"), String(c.sop.casos)], [E("Plazo cumplido", "Within the deadline"), pct(c.sop.plazo_cumplido, c.sop.con_respuesta)]];
}

/* El barrido: a las 8:00 AM de Hazleton, los reportes cuyo turno ya llegó (cada día; el lunes; el día 1) y que no salieron desde ese turno. Si la persona
   ya no está en el equipo o perdió analit:ver, no sale. Sin correo, no sale (queda dicho en Analítica › Reportes). Una vez por turno (idem_key). */
const TURNO = `case r.cada
    when 'dia' then date_trunc('day', (now() at time zone 'America/New_York') - interval '8 hours') + interval '8 hours'
    when 'semana' then date_trunc('week', (now() at time zone 'America/New_York') - interval '8 hours') + interval '8 hours'
    else date_trunc('month', (now() at time zone 'America/New_York') - interval '8 hours') + interval '8 hours' end`;
export async function barrerReportes(): Promise<number> {
  const L = (await dbAnalisis().query<{ id: string; tab: string; cada: Cada; uid: string; email: string | null; lang: string; cities: string[]; turno: string }>(
    `select r.id::text, r.tab, r.cada, u.id::text as uid, u.email::text as email, coalesce(u.lang, 'es') as lang, m.cities, to_char(${TURNO}, 'YYYY-MM-DD"T"HH24:MI') as turno
       from scheduled_reports r join users u on u.id = r.by_staff_id join staff_members m on m.user_id = r.by_staff_id and m.status = 'active'
      where r.status = 'activo'
        and exists (select 1 from role_permissions p where p.role = m.role and p.section = 'analit' and p.action = 'ver' and p.allowed)
        and coalesce(r.last_sent_at, r.created_at) < (${TURNO}) at time zone 'America/New_York'
      order by r.id limit 50`)).rows;
  let n = 0;
  for (const r of L) {
    if (!esTab(r.tab)) continue;
    const es = r.lang !== "en", t = TABS_REPORTE[r.tab], dias = CADA[r.cada].dias;
    if (r.email) {
      const filas = await cifrasReporte(r.tab, { cities: r.cities ?? [] }, dias, es);
      const titulo = es ? `Analítica · ${t.es}` : `Analytics · ${t.en}`;
      const { html, text } = marco({ es, pre: titulo, titulo, intro: es ? `Las cifras de los últimos ${dias} días de tus ciudades. Solo cifras: nunca quién.` : `The figures for the last ${dias} days in your cities. Figures only: never who.`,
        filas, nota: es ? `Lo programaste ${CADA[r.cada].es}. Lo pausas en Analítica › Reportes.` : `You scheduled it ${CADA[r.cada].en}. Pause it in Analytics › Reports.`,
        cta: { l: es ? "Abrir Analítica" : "Open Analytics", href: `${BASE_URL()}/admin/analitica?tab=${r.tab === "biz" ? "ppl" : r.tab}` } });
      await encolar({ userId: r.uid, to: r.email, tpl: "report", subject: `${titulo} · ${r.turno.slice(0, 10)}`, html, text, ref: ["scheduled_report", r.id], idem: `rep-${r.id}-${r.turno}` });
      n++;
    }
    await db().query(`update scheduled_reports set last_sent_at = now() where id = $1::bigint`, [r.id]);
  }
  return n;
}
