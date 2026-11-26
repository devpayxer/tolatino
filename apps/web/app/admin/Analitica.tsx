"use client";
/* ADM-ANALIT · Analítica (Super Admin.dc.html secAnalit) con lo que existe en la Fase 1: Resumen (embudo del directorio),
   Gente y negocios, Soporte y confianza, Búsquedas sin oferta y Exportar. Período 7 / 30 / 90 días en la URL. */
import * as UI from "@tolatino/ui";
import { fotoFondo, PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { usePathname, useRouter } from "next/navigation";
import { useTransition, type ComponentType, type ReactNode } from "react";
import { exportar, programar, reporteAhora } from "./acciones-analitica";
import { motivoAyuda } from "@/lib/ayuda-motivos";
import { diasTxt } from "@/lib/plazo-txt";
import { COLAS, type Cola } from "@/lib/colas";
import { Toast, useAncho, useToast } from "./Colas";
import { dosIdiomas } from "@/lib/dos-idiomas";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const A = UI as unknown as Record<"HBars" | "AdminNote" | "Icon", ComponentType<any>>;
type AN = typeof import("@/lib/admin-analitica");
export type DatosAnalitica = {
  tab: string; dias: number; exporta: boolean; l?: "es" | "en"; replica?: boolean;
  // 9g · Dinero, Hogar y Auto, Reportes, retención por cohorte, embudos, búsquedas sin resultado, contactos desde semillas y vistas sin repetidos.
  dinero?: Awaited<ReturnType<AN["dinero"]>>; cohortes?: Awaited<ReturnType<AN["retencionCohortes"]>>; embudos?: Awaited<ReturnType<AN["embudos"]>>;
  cv?: Awaited<ReturnType<AN["contactosYVistas"]>>; sinRes?: Awaited<ReturnType<AN["busquedasSinResultado"]>>; ha?: Awaited<ReturnType<AN["hogarAuto"]>>;
  programados?: Awaited<ReturnType<typeof import("@/lib/reportes").misReportes>>; diarios?: Awaited<ReturnType<typeof import("@/lib/reporte-diario").reportesDiarios>> | null;
  gente?: { u: { n: number; nuevos: number; activos: number }; b: { n: number; pro: number; ver: number }; retencion: { k: number; base: number; vuelven: number }[]; cats: { id: string; short: string; n: number; pro: number }[] };
  embudo?: { buscar: number; ficha: number; contactar: number };
  confianza?: { sancionados: number; abiertas: { queue: string; n: number; es: string; sla: number }[]; cumplido: { total: number; a_tiempo: number }; rep?: { reportes: number; operaciones: number; casos: number } };
  nosup?: { q: string; cat: string | null; n: number }[];
  sp?: { sal: { n: number; conseg: number; segok: number; segno: number; hechas: number; noshow: number; resp: number | null }; pro: { n: number; consultas: number; contrato: number; total: number; resp: number | null };
    rev: { cobro: number; base: number }; ayuda: { rub: string; reason: string; n: number }[] };
  mt?: Awaited<ReturnType<typeof import("@/lib/admin-analitica").mercadosTiendas>>;
  ft?: Awaited<ReturnType<typeof import("@/lib/admin-analitica").fiestasTransporte>>;
  no?: Awaited<ReturnType<typeof import("@/lib/admin-analitica").noche>>;
  en?: Awaited<ReturnType<typeof import("@/lib/admin-analitica").inscripcionesAnalitica>>;
  ia?: Awaited<ReturnType<typeof import("@/lib/admin-analitica").feInmAutos>>;
  com?: Awaited<ReturnType<typeof import("@/lib/admin-analitica").comunidadAnalitica>>;
  evt?: Awaited<ReturnType<typeof import("@/lib/admin-analitica").eventosAnalitica>>;
  cpa?: Awaited<ReturnType<typeof import("@/lib/admin-analitica").compaSoporteAnalitica>>;
  apps?: Awaited<ReturnType<typeof import("@/lib/admin-analitica").appsAnalitica>>;
};
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)} %` : "—");

export function Analitica({ d }: { d: DatosAnalitica }) {
  const router = useRouter(), path = usePathname(), w = useAncho(), desk = w >= 1024;
  const [toast, setToast] = useToast();
  const [pend, start] = useTransition();
  const ir = (tab: string, dias = d.dias) => router.push(`${path}?${new URLSearchParams({ ...(tab !== "sum" ? { tab } : {}), ...(dias !== 30 ? { p: String(dias) } : {}) })}`, { scroll: false });
  const E2 = (a: string, b: string) => dosIdiomas(!(d.l === "en"), a, b);
  const tabs: Bloque = { type: "tabs", items: ([["sum", "Resumen", "Overview"], ["ppl", "Gente y negocios", "People and businesses"], ["dinero", "Dinero", "Money"], ["trust", "Soporte y confianza", "Support and trust"],
    ["sp", "Doctores y Profesionales", "Doctors and Professionals"], ["ha", "Hogar y Auto", "Home and Auto"], ["mt", "Mercados y Tiendas", "Markets and Stores"], ["ft", "Fiestas y Transporte", "Parties and Transport"],
    ["no", "Noche", "Nightlife"], ["en", "Educación · Niños · Deporte", "Education · Kids · Sports"], ["ia", "Iglesias · Bienes Raíces · Autos", "Churches · Real Estate · Cars"], ["com", "Comunidad", "Community"],
    ["evt", "Eventos", "Events"], ["cpa", "El Compa y Soporte", "El Compa and Support"], ["apps", "Apps", "Apps"], ["nosup", "Búsquedas sin oferta", "Searches without supply"], ["rep", "Reportes", "Reports"],
    ["exp", "Exportar", "Export"]] as const).map(([k, es, en]) => ({ l: E2(es, en), on: d.tab === k, onClick: () => ir(k) })) };
  const periodo: Bloque = { type: "chips", items: [7, 30, 90].map((n) => ({ l: E2(`${n} días`, `${n} days`), v: d.dias === n ? "selected" : "filter", onClick: () => ir(d.tab, n) })) };
  const kpis = (items: { k: string; v: string; s?: string; dark?: boolean; onClick?: () => void }[]): Bloque => ({ type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))",
    items: items.map((x) => ({ k: x.k, v: x.v, s: x.s, onClick: x.onClick, ...(x.dark ? { bg: "var(--tl-ink)", fg: "var(--tl-white)", bd: "var(--tl-ink)", sFg: "rgba(255,255,255,.7)" } : {}) })) });

  let cuerpo: ReactNode = null;
  if (d.tab === "sum" && d.embudo) {
    const F = [[E2("Buscaron", "Searched"), d.embudo.buscar], [E2("Abrieron una ficha", "Opened a page"), d.embudo.ficha], [E2("Contactaron", "Contacted"), d.embudo.contactar]] as const;
    cuerpo = (
      <>
        <PanelBloques bloques={[periodo]} />
        {d.embudo.buscar ? <A.HBars label={E2("EMBUDO · DE BUSCAR A CONTACTAR", "FUNNEL · FROM SEARCH TO CONTACT")} help={E2(`${d.dias} días · personas · buscar o abrir una categoría → ficha → Llamar, WhatsApp o Cómo llegar`, `${d.dias} days · people · search or open a category → business page → Call, WhatsApp or Directions`)} items={F.map(([l, n]) => ({ label: l, width: `${Math.max(2, Math.round((n / (F[0][1] || 1)) * 100))}%`, color: "var(--tl-action)", value: String(n) }))} />
          : <PanelBloques bloques={[{ type: "empty", icon: "filter", t: E2("Todavía no hay movimiento", "No activity yet"), s: E2("Cuando los vecinos busquen y abran fichas en el período, el embudo sale aquí.", "When neighbors search and open business pages in the period, the funnel shows here.") }]} />}
        {d.embudos ? (() => { const o = d.embudos.operacion, F = [[E2("Buscaron", "Searched"), o.buscaron], [E2("Abrieron una ficha", "Opened a page"), o.ficha],
            [E2("Contactaron", "Contacted"), o.contactaron], [E2("Pidieron", "Ordered"), o.enviaron], [E2("El negocio aceptó", "Business accepted"), o.aceptadas]] as const;
          return <A.HBars label={E2("EMBUDO · DE BUSCAR A ACEPTADO", "FUNNEL · FROM SEARCH TO ACCEPTED")} help={E2(`${d.dias} días · personas distintas · «pidieron» = un pedido, una cita o una reserva`, `${d.dias} days · distinct people · «ordered» = an order, booking or reservation`)}
            items={F.map(([l, n]) => ({ label: l, width: `${Math.min(100, Math.max(2, Math.round((n / (F[0][1] || 1)) * 100)))}%`, color: "var(--tl-action)", value: String(n) }))} />; })() : null}
        {d.cv ? <PanelBloques bloques={[kpis([
          { k: E2("VISTAS DE FICHAS", "BUSINESS PAGE VIEWS"), v: d.cv.vistas.vistas.toLocaleString("en-US"), s: E2(`${d.cv.vistas.unicos.toLocaleString("en-US")} sin repetidos`, `${d.cv.vistas.unicos.toLocaleString("en-US")} unique`), dark: true },
          { k: E2("«LLAMAR» EN UNA SEMILLA", "«CALL» ON A SEED"), v: String(d.cv.semillas.toques), s: E2(`${d.cv.semillas.semillas} negocios sin reclamar`, `${d.cv.semillas.semillas} unclaimed businesses`) },
          { k: E2("SEMILLAS RECLAMADAS", "SEEDS CLAIMED"), v: String(d.cv.semillas.reclamadas), s: E2("en el período", "in the period") },
        ]), ...(d.cv.top.length ? [{ type: "rows" as const, k: E2("SEMILLAS QUE MÁS LLAMAN", "MOST CALLED SEEDS"), items: d.cv.top.map((x) => ({ key: x.nombre, icon: "phone", t: x.nombre, r: String(x.toques), s: x.reclamada ? E2("Ya reclamó su página", "Already claimed its page") : E2("Sin reclamar · sal a buscarlo", "Unclaimed · go find them") })) }] : [])]} /> : null}
      </>);
  } else if (d.tab === "ppl" && d.gente) {
    const g = d.gente, top = g.cats[0]?.n || 1;
    cuerpo = (
      <>
        <PanelBloques bloques={[periodo, kpis([
          { k: E2("VECINOS", "NEIGHBORS"), v: String(g.u.n), s: E2(`${g.u.nuevos} nuevos en el período`, `${g.u.nuevos} new in the period`), dark: true },
          { k: E2("ACTIVOS", "ACTIVE"), v: pct(g.u.activos, g.u.n), s: E2("entraron en el período", "signed in during the period") },
          { k: E2("NEGOCIOS", "BUSINESSES"), v: String(g.b.n), s: `${g.b.pro} Pro · ${g.b.n - g.b.pro} Free`, onClick: () => router.push("/admin/negocios") },
          { k: E2("VERIFICADOS", "VERIFIED"), v: pct(g.b.ver, g.b.n), s: E2(`${g.b.ver} con sello`, `${g.b.ver} with a badge`) },
        ])]} />
        {g.retencion.some((r) => r.base) ? <A.HBars label={E2("RETENCIÓN DE VECINOS NUEVOS", "NEW NEIGHBOR RETENTION")} help={E2("vuelven al día 1 · 7 · 30", "come back on day 1 · 7 · 30")}
          items={g.retencion.map((r) => ({ label: `D${r.k}`, width: r.base ? `${Math.max(2, Math.round((r.vuelven / r.base) * 100))}%` : "2%", color: "var(--tl-action)", value: r.base ? `${Math.round((r.vuelven / r.base) * 100)} % · ${r.vuelven} ${E2("de", "of")} ${r.base}` : "—" }))} />
          : <A.AdminNote tone="info" icon="users">{E2("Retención: todavía no hay cuentas nuevas con la edad suficiente en el período.", "Retention: no new accounts are old enough in the period yet.")}</A.AdminNote>}
        <A.HBars label={E2("NEGOCIOS POR CATEGORÍA · PRO", "BUSINESSES BY CATEGORY · PRO")} items={g.cats.filter((c) => c.n).map((c) => ({ label: c.short, width: `${Math.round((c.n / top) * 100)}%`, color: "var(--tl-ink)", value: `${c.n} · ${c.pro}` }))} />
        {/* 9g · Retención por cohorte semanal (metricas_retencion) y los embudos del vecino y del negocio. */}
        <PanelBloques bloques={[{ type: "rows", k: E2("RETENCIÓN POR COHORTE · SEMANA EN QUE SE REGISTRARON", "RETENTION BY COHORT · WEEK THEY SIGNED UP"),
          items: d.cohortes?.length ? d.cohortes.map((c) => ({ key: c.cohorte, icon: "users", t: E2(`Semana del ${c.cohorte}`, `Week of ${c.cohorte}`), r: String(c.nuevos),
            s: `D1 ${pct(c.d1, c.base_d1)} · D7 ${pct(c.d7, c.base_d7)} · D30 ${pct(c.d30, c.base_d30)}` }))
            : [{ key: "0", icon: "users", t: E2("Todavía no hay cohortes", "No cohorts yet") }] },
          { type: "note", tone: "info", icon: "info", t: E2("Vecinos nuevos por semana (a la derecha) y cuántos volvieron el día 1, 7 y 30; «—» = esa semana todavía no tiene la edad.", "New neighbors per week (on the right) and how many came back on day 1, 7 and 30; «—» = that week is not that old yet.") }]} />
        {d.embudos ? (() => { const v = d.embudos.vecino, n = d.embudos.negocio;
          const FV = [[E2("Se registraron", "Signed up"), v.registrados], [E2("Buscaron", "Searched"), v.usaron], [E2("Contactaron", "Contacted"), v.contactaron], [E2("Volvieron", "Came back"), v.volvieron]] as const;
          const PN: Record<string, string> = {
            B1: E2("Tipo de negocio", "Business type"), C1: E2("Lo que hacen", "What they do"), D1: E2("Precios", "Prices"),
            E1: E2("Dónde y cuándo", "Where and when"), F1: E2("Revisar", "Review")
          };
          const FN = [...n.pasos.map((x) => [PN[x.paso]!, x.n] as const), [E2("Publicaron", "Published"), n.publicaron] as const];
          const barras = (F: readonly (readonly [string, number])[], color: string) => F.map(([l, k]) => ({ label: l, width: `${Math.min(100, Math.max(2, Math.round((k / (F[0]![1] || 1)) * 100)))}%`, color, value: String(k) }));
          return <>
            <A.HBars label={E2("EMBUDO · VECINOS NUEVOS", "FUNNEL · NEW NEIGHBORS")} help={E2(`${d.dias} días · cuentas nuevas · buscaron o abrieron una ficha, contactaron o pidieron, volvieron otro día`, `${d.dias} days · new accounts · searched or opened a page, contacted or ordered, came back another day`)} items={barras(FV, "var(--tl-action)")} />
            <A.HBars label={E2("EMBUDO · PUBLICA TU NEGOCIO PASO A PASO", "FUNNEL · LIST YOUR BUSINESS STEP BY STEP")} help={E2(`${d.dias} días · borradores que empezaron`, `${d.dias} days · drafts started`)} items={barras(FN, "var(--tl-ink)")} />
          </>; })() : null}
      </>);
  } else if (d.tab === "trust" && d.confianza) {
    const c = d.confianza, mx = Math.max(1, ...c.abiertas.map((x) => x.n));
    cuerpo = (
      <>
        <PanelBloques bloques={[periodo, kpis([
          { k: E2("SANCIONADOS", "SANCTIONED"), v: String(c.sancionados), s: E2("vecinos con sanción activa", "neighbors with an active sanction"), onClick: () => router.push("/admin/usuarios?est=adv,mute,susp,ban") },
          { k: E2("SLA CUMPLIDO", "SLA MET"), v: pct(c.cumplido.a_tiempo, c.cumplido.total), s: E2(`colas, últimos ${d.dias} días`, `queues, last ${d.dias} days`), dark: true },
        ])]} />
        {c.abiertas.length ? <A.HBars label={E2("COLAS ABIERTAS", "OPEN QUEUES")} help={E2("SLA en horas", "SLA in hours")} items={c.abiertas.map((x) => ({ label: E2(x.es, COLAS[x.queue as Cola]?.en ?? x.es), width: `${Math.round((x.n / mx) * 100)}%`, color: "var(--tl-ink)", value: `${x.n} · ${x.sla} h` }))} />
          : <A.AdminNote tone="ok" icon="check">{E2("No hay casos abiertos en tus colas.", "No open cases in your queues.")}</A.AdminNote>}
        {c.rep ? <PanelBloques bloques={[kpis([
          { k: E2("REPORTES POR CADA 1,000 OPERACIONES", "REPORTS PER 1,000 TRANSACTIONS"), v: c.rep.operaciones ? (Math.round((10000 * c.rep.reportes) / c.rep.operaciones) / 10).toLocaleString("en-US") : "—", s: E2(`${c.rep.reportes} reportes · ${c.rep.operaciones} operaciones`, `${c.rep.reportes} reports · ${c.rep.operaciones} transactions`) },
          { k: E2("CASOS DE SOPORTE", "SUPPORT CASES"), v: String(c.rep.casos), s: E2(`en ${d.dias} días · el detalle en El Compa y Soporte`, `in ${d.dias} days · details in El Compa and Support`), onClick: () => ir("cpa") },
        ])]} /> : null}
      </>);
  } else if (d.tab === "sp" && d.sp) {
    // Doctores y Profesionales: solo cifras (nunca motivos de consulta, notas ni seguros de nadie).
    const { sal, pro, rev, ayuda } = d.sp, min = (m: number | null) => (m == null ? "—" : m < 60 ? `${m} min` : `${Math.round(m / 60)} h`), mx = Math.max(1, ...ayuda.map((x) => x.n));
    cuerpo = (
      <>
        <PanelBloques bloques={[periodo, { type: "group", k: E2("DOCTORES", "DOCTORS") }, kpis([
          { k: E2("CITAS PEDIDAS", "BOOKINGS REQUESTED"), v: String(sal.n), s: E2(`${sal.hechas} terminadas`, `${sal.hechas} completed`) },
          { k: E2("SEGURO ACEPTADO", "INSURANCE ACCEPTED"), v: pct(sal.segok, sal.conseg), s: E2(`de ${sal.conseg} con seguro`, `of ${sal.conseg} with insurance`), dark: true },
          { k: E2("«NO ACEPTAMOS SU SEGURO»", "«WE DON’T ACCEPT YOUR INSURANCE»"), v: pct(sal.segno, sal.conseg), s: E2(`${sal.segno} veces`, `${sal.segno} times`) },
          { k: E2("NO LLEGÓ", "NO-SHOW"), v: pct(sal.noshow, sal.hechas + sal.noshow), s: E2(`${sal.noshow} citas`, `${sal.noshow} bookings`) },
          { k: E2("RESPONDEN EN", "RESPOND IN"), v: min(sal.resp), s: E2("promedio, de pedir a la respuesta", "average, from request to response") },
        ]), { type: "group", k: E2("PROFESIONALES", "PROFESSIONALS") }, kpis([
          { k: E2("CONSULTAS PEDIDAS", "CONSULTATIONS REQUESTED"), v: String(pro.n), s: E2(`${pro.consultas} pasaron la consulta`, `${pro.consultas} had the consultation`) },
          { k: E2("CONSULTA → CONTRATÓ", "CONSULTATION → HIRED"), v: pct(pro.contrato, pro.consultas), s: E2(`${pro.contrato} contrataron`, `${pro.contrato} hired`), dark: true },
          { k: E2("CON TOTAL POR ESCRITO", "WITH A WRITTEN TOTAL"), v: String(pro.total), s: E2("consultas con total mandado", "consultations with a total sent") },
          { k: E2("«COBRÓ EL TOTAL QUE DIJO»", "«CHARGED THE TOTAL THEY SAID»"), v: pct(rev.cobro, rev.base), s: E2(`de ${rev.base} reseñas que contestaron`, `of ${rev.base} reviews that answered`) },
          { k: E2("RESPONDEN EN", "RESPOND IN"), v: min(pro.resp), s: E2("promedio, de pedir a la respuesta", "average, from request to response") },
        ])]} />
        {ayuda.length ? <A.HBars label={E2("AYUDA · MOTIVOS", "HELP · REASONS")} help={E2(`${d.dias} días · Doctores y Profesionales`, `${d.dias} days · Doctors and Professionals`)} items={ayuda.map((x) => ({ label: E2(`${x.rub === "salud" ? "Doctores" : "Profesionales"} · ${motivoAyuda(E2, x.reason, x.rub)}`, `${x.rub === "salud" ? "Doctors" : "Professionals"} · ${motivoAyuda(E2, x.reason, x.rub)}`), width: `${Math.round((x.n / mx) * 100)}%`, color: "var(--tl-ink)", value: String(x.n) }))} />
          : <A.AdminNote tone="ok" icon="check">{E2("Nadie pidió ayuda con Doctores ni Profesionales en el período.", "Nobody asked for help with Doctors or Professionals in the period.")}</A.AdminNote>}
        <PanelBloques bloques={[{ type: "note", tone: "info", icon: "lock", t: E2("Solo cifras. Los motivos de consulta, las notas y los seguros de cada persona nunca salen en Analítica ni en un CSV.", "Figures only. Each person’s visit reasons, notes and insurance never show in Analytics or in a CSV.") }]} />
      </>);
  } else if (d.tab === "mt" && d.mt) {
    // Mercados y Tiendas (4s): solo cifras.
    const { merc, tienda, rev, ayuda } = d.mt, min = (m: number | null) => (m == null ? "—" : m < 60 ? `${m} min` : `${Math.round(m / 60)} h`), mx = Math.max(1, ...ayuda.map((x) => x.n));
    const usd = (c: number) => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    cuerpo = (
      <>
        <PanelBloques bloques={[periodo, { type: "group", k: E2("MERCADOS", "MARKETS") }, kpis([
          { k: E2("PEDIDOS", "ORDERS"), v: String(merc.n), s: E2(`${merc.hechos} entregados o recogidos`, `${merc.hechos} delivered or picked up`) },
          { k: E2("CON FOTO DE CADA PESO", "WITH A PHOTO OF EACH WEIGHT"), v: pct(merc.confoto, merc.pesados), s: E2(`de ${merc.pesados} pedidos con algo por peso`, `of ${merc.pesados} orders with items sold by weight`), dark: true },
          { k: E2("ESTIMADO → COBRADO", "ESTIMATED → CHARGED"), v: `${usd(merc.est)} → ${usd(merc.cob)}`, s: E2("pagados con tarjeta en la app", "paid by card in the app") },
          { k: E2("SUSTITUCIONES ACEPTADAS", "SUBSTITUTIONS ACCEPTED"), v: pct(merc.sustOk, merc.sustN), s: E2(`${merc.sustN} propuestas`, `${merc.sustN} proposed`) },
          { k: E2("NO ACEPTADOS O VENCIDOS", "NOT ACCEPTED OR EXPIRED"), v: pct(merc.noacep, merc.n), s: E2(`${merc.noacep} pedidos`, `${merc.noacep} orders`) },
          { k: E2("ACEPTAN EN", "ACCEPT IN"), v: min(merc.resp), s: E2("promedio", "average") },
          { k: E2("«COBRARON EL PESO REAL»", "«CHARGED THE REAL WEIGHT»"), v: pct(rev.pes, rev.pbase), s: E2(`de ${rev.pbase} reseñas`, `of ${rev.pbase} reviews`) },
        ]), { type: "group", k: E2("TIENDAS", "STORES") }, kpis([
          { k: E2("APARTADOS", "HOLDS"), v: String(tienda.n), s: E2(`${tienda.envios} con envío`, `${tienda.envios} with shipping`) },
          { k: E2("RECOGIDOS", "PICKED UP"), v: pct(tienda.recogidos, tienda.n), s: E2(`${tienda.vencidos} vencieron`, `${tienda.vencidos} expired`), dark: true },
          { k: E2("FALTÓ LA TALLA", "SIZE UNAVAILABLE"), v: pct(tienda.talla, tienda.n), s: E2(`${tienda.talla} apartados`, `${tienda.talla} holds`) },
          { k: E2("PLANES", "PLANS"), v: String(tienda.planes), s: E2(`${tienda.pagados} terminados · ${tienda.cancelados} cancelados`, `${tienda.pagados} completed · ${tienda.cancelados} cancelled`) },
          { k: E2("«PRECIO DE LA CAJA = PUBLICADO»", "«REGISTER PRICE = LISTED PRICE»"), v: pct(rev.caja, rev.base), s: E2(`de ${rev.base} reseñas`, `of ${rev.base} reviews`) },
        ])]} />
        {ayuda.length ? <A.HBars label={E2("AYUDA · MOTIVOS", "HELP · REASONS")} help={E2(`${d.dias} días · Mercados y Tiendas`, `${d.dias} days · Markets and Stores`)} items={ayuda.map((x) => ({ label: E2(`${x.rub === "merc" ? "Mercados" : "Tiendas"} · ${motivoAyuda(E2, x.reason, x.rub)}`, `${x.rub === "merc" ? "Markets" : "Stores"} · ${motivoAyuda(E2, x.reason, x.rub)}`), width: `${Math.round((x.n / mx) * 100)}%`, color: "var(--tl-ink)", value: String(x.n) }))} />
          : <A.AdminNote tone="ok" icon="check">{E2("Nadie pidió ayuda con Mercados ni Tiendas en el período.", "Nobody asked for help with Markets or Stores in the period.")}</A.AdminNote>}
      </>);
  } else if (d.tab === "ft" && d.ft) {
    // Fiestas y Transporte (4z-3): solo cifras.
    const { fi, dep, vi, sal, ayuda } = d.ft, mx = Math.max(1, ...ayuda.map((x) => x.n));
    const usd = (c: number) => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    cuerpo = (
      <>
        <PanelBloques bloques={[periodo, { type: "group", k: E2("FIESTAS", "PARTIES") }, kpis([
          { k: E2("SOLICITUDES DE FECHA", "DATE REQUESTS"), v: String(fi.n), s: E2(`${fi.hechas} fiestas hechas`, `${fi.hechas} parties held`) },
          { k: E2("CONFIRMADAS EN 24 H", "CONFIRMED WITHIN 24 H"), v: pct(fi.conf24, fi.n), s: E2(`${fi.conf24} solicitudes`, `${fi.conf24} requests`), dark: true },
          { k: E2("VENCIDAS SIN RESPUESTA", "EXPIRED WITHOUT A REPLY"), v: pct(fi.vencidas, fi.n), s: E2(`${fi.vencidas} solicitudes`, `${fi.vencidas} requests`) },
          { k: E2("FECHAS CANCELADAS POR EL NEGOCIO", "DATES CANCELLED BY THE BUSINESS"), v: String(fi.cxNeg), s: E2("con devolución completa", "with a full refund") },
          { k: E2("DEPÓSITOS", "DEPOSITS"), v: usd(dep.cob), s: E2(`retenido ${usd(dep.ret)} · devuelto ${usd(dep.dev)} · se quedó con el negocio ${usd(dep.quedo)}`, `held ${usd(dep.ret)} · refunded ${usd(dep.dev)} · kept by the business ${usd(dep.quedo)}`) },
        ]), { type: "group", k: E2("TRANSPORTE", "TRANSPORT") }, kpis([
          { k: E2("VIAJES, ENVÍOS Y MUDANZAS", "TRIPS, DELIVERIES AND MOVES"), v: String(vi.n), s: E2(`${vi.hechos} terminados`, `${vi.hechos} completed`) },
          { k: E2("SALIDAS A LA HORA", "ON-TIME DEPARTURES"), v: pct(sal.aTiempo, sal.salidas), s: E2(`de ${sal.salidas} salidas (≤ 15 min)`, `of ${sal.salidas} departures (≤ 15 min)`), dark: true },
          { k: E2("OCUPACIÓN DE ASIENTOS", "SEAT OCCUPANCY"), v: pct(sal.ocupados, sal.asientos), s: E2(`${sal.ocupados} de ${sal.asientos}`, `${sal.ocupados} of ${sal.asientos}`) },
          { k: E2("CANCELACIONES TARDÍAS", "LATE CANCELLATIONS"), v: String(vi.mitad), s: E2("se cobró la mitad", "half was charged") },
          { k: E2("SALIDAS CANCELADAS", "CANCELLED DEPARTURES"), v: String(sal.canceladas), s: E2(`${vi.cxSalida} pasajeros con devolución completa`, `${vi.cxSalida} passengers with a full refund`) },
          { k: E2("«COBRÓ MÁS» POR CADA 100", "«CHARGED MORE» PER 100"), v: vi.hechos ? (Math.round((1000 * vi.cobroMas) / vi.hechos) / 10).toString() : "—", s: E2(`${vi.cobroMas} ayudas`, `${vi.cobroMas} help requests`) },
        ])]} />
        {ayuda.length ? <A.HBars label={E2("AYUDA · MOTIVOS", "HELP · REASONS")} help={E2(`${d.dias} días · Fiestas y Transporte`, `${d.dias} days · Parties and Transport`)} items={ayuda.map((x) => ({ label: E2(`${x.rub === "fiesta" ? "Fiestas" : "Transporte"} · ${motivoAyuda(E2, x.reason, x.rub)}`, `${x.rub === "fiesta" ? "Parties" : "Transport"} · ${motivoAyuda(E2, x.reason, x.rub)}`), width: `${Math.round((x.n / mx) * 100)}%`, color: "var(--tl-ink)", value: String(x.n) }))} />
          : <A.AdminNote tone="ok" icon="check">{E2("Nadie pidió ayuda con Fiestas ni Transporte en el período.", "Nobody asked for help with Parties or Transport in the period.")}</A.AdminNote>}
      </>);
  } else if (d.tab === "no" && d.no) {
    // Noche (4ne): solo cifras.
    const { me, dep, li, cov, fila, ayuda, lic } = d.no, mx = Math.max(1, ...ayuda.map((x) => x.n));
    const usd = (c: number) => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const coverMas = ayuda.find((x) => x.reason === "cover")?.n ?? 0;
    cuerpo = (
      <>
        <PanelBloques bloques={[periodo, { type: "group", k: E2("MESAS Y VIP", "TABLES AND VIP") }, kpis([
          { k: E2("SOLICITUDES DE MESA", "TABLE REQUESTS"), v: String(me.n), s: E2("mesas y VIP pedidas", "tables and VIP requested") },
          { k: E2("CONFIRMADAS EN 60 MIN", "CONFIRMED WITHIN 60 MIN"), v: pct(me.conf60, me.n), s: E2(`${me.conf60} solicitudes`, `${me.conf60} requests`), dark: true },
          { k: E2("VENCIDAS SIN RESPUESTA", "EXPIRED WITHOUT A REPLY"), v: pct(me.vencidas, me.n), s: E2(`${me.vencidas} solicitudes`, `${me.vencidas} requests`) },
          { k: E2("MESAS NO RESPETADAS", "TABLES NOT HONORED"), v: String(me.noResp), s: E2("canceló el local o el cliente pidió ayuda", "the venue cancelled or the customer asked for help") },
          { k: E2("DEPÓSITOS", "DEPOSITS"), v: usd(dep.cob), s: E2(`retenido ${usd(dep.ret)} · devuelto ${usd(dep.dev)} · se quedó con el local ${usd(dep.quedo)}`, `held ${usd(dep.ret)} · refunded ${usd(dep.dev)} · kept by the venue ${usd(dep.quedo)}`) },
        ]), { type: "group", k: E2("LISTA, COVER Y FILA", "LIST, COVER AND LINE") }, kpis([
          { k: E2("DE LA LISTA ENTRÓ", "GOT IN FROM THE LIST"), v: pct(li.entro, li.cerradas), s: E2(`${li.entro} de ${li.cerradas} noches cerradas · ${li.n} en la lista`, `${li.entro} of ${li.cerradas} closed nights · ${li.n} on the list`) , dark: true },
          { k: E2("EL COVER SUBIÓ DESPUÉS DE PUBLICADO", "COVER WENT UP AFTER POSTING"), v: String(cov.sube), s: E2(`veces · ${cov.locales} local${cov.locales === 1 ? "" : "es"}`, `times · ${cov.locales} venue${cov.locales === 1 ? "" : "s"}`) },
          { k: E2("«LA FILA, COMO DECÍA»", "«THE LINE, AS STATED»"), v: pct(fila.ok, fila.n), s: E2(`${fila.n} reseñas lo contestaron`, `${fila.n} reviews answered it`) },
          { k: E2("«COBRARON MÁS COVER» POR CADA 100", "«CHARGED MORE COVER» PER 100"), v: li.noches ? (Math.round((1000 * coverMas) / li.noches) / 10).toString() : "—", s: E2(`${coverMas} ayudas · ${li.noches} noches`, `${coverMas} help requests · ${li.noches} nights`) },
          { k: E2("LICENCIAS DE LICOR VENCIDAS", "EXPIRED LIQUOR LICENSES"), v: String(lic.vencidas), s: E2(`de ${lic.total} en Licencias`, `of ${lic.total} in Licenses`) },
        ])]} />
        {ayuda.length ? <A.HBars label={E2("AYUDA · MOTIVOS", "HELP · REASONS")} help={E2(`${d.dias} días · Noche`, `${d.dias} days · Nightlife`)} items={ayuda.map((x) => ({ label: motivoAyuda(E2, x.reason, "noche"), width: `${Math.round((x.n / mx) * 100)}%`, color: "var(--tl-ink)", value: String(x.n) }))} />
          : <A.AdminNote tone="ok" icon="check">{E2("Nadie pidió ayuda con la noche en el período.", "Nobody asked for help with nightlife in the period.")}</A.AdminNote>}
      </>);
  } else if (d.tab === "en" && d.en) {
    // Educación · Niños · Deporte (4eg): solo cifras; nunca datos de un niño ni de un inscrito.
    const { me, gr, mat, esp, baja, rev, ayuda, lic } = d.en, mx = Math.max(1, ...ayuda.map((x) => x.n));
    const usd = (c: number) => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const nAy = ayuda.reduce((a, x) => a + x.n, 0), RUB: Record<string, string> = { edu: E2("Educación", "Education"), ninos: E2("Niños", "Kids"), dep: E2("Deporte", "Sports") };
    cuerpo = (
      <>
        <PanelBloques bloques={[periodo, { type: "group", k: E2("INSCRIPCIONES", "ENROLLMENTS") }, kpis([
          { k: E2("INSCRIPCIONES PEDIDAS", "ENROLLMENTS REQUESTED"), v: String(me.n), s: E2(`Educación ${me.edu} · Niños ${me.ninos} · Deporte ${me.dep}`, `Education ${me.edu} · Kids ${me.ninos} · Sports ${me.dep}`) },
          { k: E2("CONFIRMADAS EN 24 H", "CONFIRMED WITHIN 24 H"), v: pct(me.conf24, me.n), s: E2(`${me.conf24} inscripciones`, `${me.conf24} enrollments`), dark: true },
          { k: E2("VENCIDAS SIN RESPUESTA", "EXPIRED WITHOUT A REPLY"), v: pct(me.vencidas, me.n), s: E2(`${me.vencidas} inscripciones`, `${me.vencidas} enrollments`) },
          { k: E2("GRUPOS QUE NO ABRIERON", "GROUPS THAT DIDN’T OPEN"), v: String(gr.cancelados), s: E2("cancelados con devolución a todos", "cancelled with a refund to everyone") },
          { k: E2("OCUPACIÓN DE GRUPOS", "GROUP OCCUPANCY"), v: pct(gr.ocupados, gr.cupos), s: E2(`${gr.ocupados} de ${gr.cupos} cupos · ${gr.vivos} grupos`, `${gr.ocupados} of ${gr.cupos} spots · ${gr.vivos} groups`) },
        ]), { type: "group", k: E2("MATRÍCULAS, LISTA Y MEMBRESÍAS", "TUITION, WAITLIST AND MEMBERSHIPS") }, kpis([
          { k: E2("MATRÍCULAS COBRADAS", "TUITION CHARGED"), v: usd(mat.cob), s: E2(`retenido ${usd(mat.ret)} · devuelto ${usd(mat.dev)} · se quedó con el lugar ${usd(mat.quedo)}`, `held ${usd(mat.ret)} · refunded ${usd(mat.dev)} · kept by the provider ${usd(mat.quedo)}`), dark: true },
          { k: E2("EN LISTA DE ESPERA", "ON THE WAITLIST"), v: String(esp.esperando), s: E2(`${esp.dias ?? "—"} días en promedio · ${esp.tomadas} de ${esp.ofrecidas} ofertas tomadas`, `${esp.dias ?? "—"} days on average · ${esp.tomadas} of ${esp.ofrecidas} offers taken`) },
          { k: E2("BAJAS DE MEMBRESÍA", "MEMBERSHIP CANCELLATIONS"), v: String(baja.pedidas), s: E2(`${baja.en72} confirmadas en ${baja.h} h`, `${baja.en72} confirmed within ${baja.h} h`) },
          { k: E2("«COBRARON EL TOTAL»", "«CHARGED THE TOTAL»"), v: pct(rev.tok, rev.tn), s: E2(`${rev.tn} reseñas lo contestaron`, `${rev.tn} reviews answered it`) },
          { k: E2("«CERTIFICADO PROMETIDO»", "«PROMISED CERTIFICATE»"), v: pct(rev.cok, rev.cn), s: E2(`${rev.cn} reseñas lo contestaron`, `${rev.cn} reviews answered it`) },
        ]), { type: "group", k: E2("AYUDA Y LICENCIAS", "HELP AND LICENSES") }, kpis([
          { k: E2("AYUDAS POR CADA 100", "HELP REQUESTS PER 100"), v: me.n ? (Math.round((1000 * nAy) / me.n) / 10).toString() : "—", s: E2(`${nAy} ayudas · ${me.n} inscripciones`, `${nAy} help requests · ${me.n} enrollments`) },
          { k: E2("GUARDERÍAS CON LICENCIA VIGENTE", "DAYCARES WITH A VALID LICENSE"), v: String(lic.vigentes), s: E2(`de ${lic.cuidado} lugares de Niños · ${lic.vencidas} vencidas`, `of ${lic.cuidado} Kids places · ${lic.vencidas} expired`) },
        ])]} />
        {ayuda.length ? <A.HBars label={E2("AYUDA · MOTIVOS", "HELP · REASONS")} help={E2(`${d.dias} días · Educación, Niños y Deporte`, `${d.dias} days · Education, Kids and Sports`)} items={ayuda.map((x) => ({ label: E2(`${RUB[x.rub] ?? x.rub} · ${motivoAyuda(E2, x.reason, x.rub)}`, `${RUB[x.rub] ?? x.rub} · ${motivoAyuda(E2, x.reason, x.rub)}`), width: `${Math.round((x.n / mx) * 100)}%`, color: "var(--tl-ink)", value: String(x.n) }))} />
          : <A.AdminNote tone="ok" icon="check">{E2("Nadie pidió ayuda con una inscripción en el período.", "Nobody asked for help with an enrollment in the period.")}</A.AdminNote>}
      </>);
  } else if (d.tab === "ia" && d.ia) {
    // Iglesias · Bienes Raíces · Autos (4ig): solo cifras por ciudad; nunca personas por religión ni datos de crédito.
    const { inm, dealer, dias: dd, vivos, rev, ayuda, estafa, lic, licAvisoDias, fe, vj } = d.ia, mx = Math.max(1, ...ayuda.map((x) => x.n));
    const visitas = inm.n + dealer.n, nAyV = ayuda.filter((x) => x.rub !== "fe").reduce((a, x) => a + x.n, 0), nAyF = ayuda.filter((x) => x.rub === "fe").reduce((a, x) => a + x.n, 0);
    const por = (a: number, b: number) => (b ? (Math.round((10 * a) / b) / 10).toString() : "—");
    const DIAS = (k: string) => dd.find((x) => x.que === k), RUB: Record<string, string> = { inm: E2("Bienes Raíces", "Real Estate"), dealer: E2("Autos", "Cars"), fe: E2("Iglesias", "Churches") };
    const LC = (k: string) => lic.find((x) => x.cat === k) ?? { vigentes: 0, porvencer: 0, vencidas: 0, revision: 0 }, li = ["NEG-FE", "NEG-INMUEBLE", "NEG-DEALER"].map(LC);
    const tot = (f: "vigentes" | "porvencer" | "vencidas" | "revision") => li.reduce((a, x) => a + x[f], 0);
    const dTxt = (k: string) => { const x = DIAS(k); return x && x.n ? `${x.dias ?? "—"} ${E2("días", "days")}` : "—"; };
    cuerpo = (
      <>
        <PanelBloques bloques={[periodo, { type: "group", k: E2("VISITAS Y PRUEBAS DE MANEJO", "VISITS AND TEST DRIVES") }, kpis([
          { k: E2("SOLICITUDES DE VISITA", "VISIT REQUESTS"), v: String(inm.n), s: E2(`${por(inm.n, inm.items)} por propiedad · ${inm.items} propiedades`, `${por(inm.n, inm.items)} per property · ${inm.items} properties`) },
          { k: E2("PRUEBAS DE MANEJO Y CITAS", "TEST DRIVES AND APPOINTMENTS"), v: String(dealer.n), s: E2(`${por(dealer.n, dealer.items)} por carro · ${dealer.items} carros`, `${por(dealer.n, dealer.items)} per car · ${dealer.items} cars`) },
          { k: E2("CONFIRMADAS A TIEMPO", "CONFIRMED ON TIME"), v: pct(inm.atiempo + dealer.atiempo, visitas), s: E2(`${inm.atiempo + dealer.atiempo} de ${visitas} · antes de que venciera su plazo`, `${inm.atiempo + dealer.atiempo} of ${visitas} · before their deadline`), dark: true },
          { k: E2("VENCIDAS SIN RESPUESTA", "EXPIRED WITHOUT A REPLY"), v: pct(inm.vencidas + dealer.vencidas, visitas), s: E2(`${inm.vencidas + dealer.vencidas} solicitudes`, `${inm.vencidas + dealer.vencidas} requests`) },
          { k: E2("PLANTONES («NO VINO»)", "NO-SHOWS («DIDN’T COME»)"), v: String(inm.noshow + dealer.noshow), s: E2(`de ${inm.pasaron + dealer.pasaron + inm.noshow + dealer.noshow} visitas y pruebas que ya pasaron`, `of ${inm.pasaron + dealer.pasaron + inm.noshow + dealer.noshow} visits and test drives already past`) },
        ]), { type: "group", k: E2("RENTAR, VENDER Y LO QUE SE VE", "RENTING, SELLING AND WHAT’S LISTED") }, kpis([
          { k: E2("DÍAS HASTA RENTAR", "DAYS TO RENT"), v: dTxt("rented"), s: E2(`${DIAS("rented")?.n ?? 0} rentada${DIAS("rented")?.n === 1 ? "" : "s"} en el período`, `${DIAS("rented")?.n ?? 0} rented in the period`) },
          { k: E2("DÍAS HASTA VENDER UNA CASA", "DAYS TO SELL A HOME"), v: dTxt("sold"), s: E2(`${DIAS("sold")?.n ?? 0} vendida${DIAS("sold")?.n === 1 ? "" : "s"} en el período`, `${DIAS("sold")?.n ?? 0} sold in the period`) },
          { k: E2("DÍAS HASTA VENDER UN CARRO", "DAYS TO SELL A CAR"), v: dTxt("carro"), s: E2(`${DIAS("carro")?.n ?? 0} vendido${DIAS("carro")?.n === 1 ? "" : "s"} en el período`, `${DIAS("carro")?.n ?? 0} sold in the period`) },
          { k: E2("«EL TOTAL FUE EL QUE VI»", "«THE TOTAL WAS WHAT I SAW»"), v: pct(rev.mok + rev.pok, rev.mn + rev.pn), s: E2(`Para mudarte ${pct(rev.mok, rev.mn)} · En la puerta ${pct(rev.pok, rev.pn)} · ${rev.mn + rev.pn} reseñas`, `Move-in ${pct(rev.mok, rev.mn)} · At the door ${pct(rev.pok, rev.pn)} · ${rev.mn + rev.pn} reviews`), dark: true },
        ]), { type: "rows", k: E2("A LA VISTA HOY POR CIUDAD", "LISTED TODAY BY CITY"), items: vivos.map((x) => ({ icon: "pin", t: x.ciudad, s: E2(`${x.props} propiedad${x.props === 1 ? "" : "es"} · ${x.carros} carro${x.carros === 1 ? "" : "s"}`, `${x.props} propert${x.props === 1 ? "y" : "ies"} · ${x.carros} car${x.carros === 1 ? "" : "s"}`) })) },
        { type: "group", k: E2("AYUDA, ESTAFAS Y VIVIENDA JUSTA", "HELP, SCAMS AND FAIR HOUSING") }, kpis([
          { k: E2("AYUDAS POR CADA 100 VISITAS", "HELP REQUESTS PER 100 VISITS"), v: visitas ? (Math.round((1000 * nAyV) / visitas) / 10).toString() : "—", s: E2(`${nAyV} ayudas · ${visitas} visitas y pruebas`, `${nAyV} help requests · ${visitas} visits and test drives`) },
          { k: E2("ANUNCIOS PAUSADOS POR ESTAFA", "LISTINGS PAUSED FOR SCAMS"), v: String(estafa.periodo), s: E2(`${estafa.hoy} en pausa hoy · ${estafa.sancion} sancionados`, `${estafa.hoy} paused today · ${estafa.sancion} sanctioned`) },
          { k: E2("TEXTOS FRENADOS", "TEXTS BLOCKED"), v: String(vj.frenadas), s: E2("por la lista de vivienda justa · nada se publicó", "by the fair housing list · nothing was published") },
          { k: E2("MAYORES DE 62 POR REVISAR", "62+ TO REVIEW"), v: String(vj.mayores), s: E2("declaraciones en Colas › Vivienda justa", "declarations in Queues › Fair housing") },
        ]), { type: "group", k: E2("IGLESIAS", "CHURCHES") }, kpis([
          { k: E2("FECHAS Y CATECISMO PEDIDOS", "DATES AND CATECHISM REQUESTED"), v: String(fe.n), s: E2(`${fe.vencidas} vencidas sin respuesta`, `${fe.vencidas} expired without a reply`) },
          { k: E2(`RESPONDIDAS EN ${fe.h} H`, `ANSWERED WITHIN ${fe.h} H`), v: pct(fe.enplazo, fe.n), s: E2(`${fe.enplazo} solicitudes`, `${fe.enplazo} requests`) },
          { k: E2("AYUDAS CON UNA FECHA", "HELP WITH A DATE"), v: String(nAyF), s: E2("nada se cobra en la app", "nothing is charged in the app") },
        ]), { type: "group", k: E2("LICENCIAS", "LICENSES") }, kpis([
          { k: E2("LICENCIAS VIGENTES", "VALID LICENSES"), v: String(tot("vigentes")), s: E2(`Iglesias ${li[0]!.vigentes} · Bienes Raíces ${li[1]!.vigentes} · Autos ${li[2]!.vigentes}`, `Churches ${li[0]!.vigentes} · Real Estate ${li[1]!.vigentes} · Cars ${li[2]!.vigentes}`), dark: true },
          { k: E2(`POR VENCER EN ${diasTxt(licAvisoDias, true).toUpperCase()}`, `EXPIRING WITHIN ${diasTxt(licAvisoDias, false).toUpperCase()}`), v: String(tot("porvencer")), s: E2("vuelven a Colas › Licencias", "go back to Queues › Licenses") },
          { k: E2("VENCIDAS", "EXPIRED"), v: String(tot("vencidas")), s: E2("vuelven a Colas › Licencias con prioridad", "go back to Queues › Licenses with priority") },
          { k: E2("EN REVISIÓN", "IN REVIEW"), v: String(tot("revision")), s: E2("nuevas o cambiadas", "new or changed") },
        ])]} />
        {ayuda.length ? <A.HBars label={E2("AYUDA · MOTIVOS", "HELP · REASONS")} help={E2(`${d.dias} días · Iglesias, Bienes Raíces y Autos`, `${d.dias} days · Churches, Real Estate and Cars`)} items={ayuda.map((x) => ({ label: E2(`${RUB[x.rub] ?? x.rub} · ${motivoAyuda(E2, x.reason, x.rub)}`, `${RUB[x.rub] ?? x.rub} · ${motivoAyuda(E2, x.reason, x.rub)}`), width: `${Math.round((x.n / mx) * 100)}%`, color: "var(--tl-ink)", value: String(x.n) }))} />
          : <A.AdminNote tone="ok" icon="check">{E2("Nadie pidió ayuda con una visita o una fecha en el período.", "Nobody asked for help with a visit or a date in the period.")}</A.AdminNote>}
      </>);
  } else if (d.tab === "com" && d.com) {
    // 5i · Comunidad: por ciudad, sin personas (solo las vistas de 0105 y cuántos por rango).
    const { t, ciudades, rangos, negocios } = d.com, mxR = Math.max(1, ...rangos.map((x) => x.activos)), mxN = Math.max(1, ...negocios.map((x) => x.canjes));
    const min = t.con_respuesta ? Math.round(t.min_primera / t.con_respuesta) : null;
    const tiempo = min == null ? "—" : min < 60 ? `${min} min` : min < 2880 ? `${Math.round(min / 6) / 10} h` : `${Math.round(min / 144) / 10} ${E2("días", "days")}`;
    cuerpo = (
      <>
        <PanelBloques bloques={[periodo, { type: "group", k: E2("CONVERSACIÓN", "CONVERSATION") }, kpis([
          { k: E2("PUBLICACIONES", "POSTS"), v: t.publicaciones.toLocaleString("en-US"), s: E2(`${t.preguntas} preguntas`, `${t.preguntas} questions`) },
          { k: E2("COMENTARIOS", "COMMENTS"), v: t.comentarios.toLocaleString("en-US"), s: t.publicaciones ? `${Math.round((10 * t.comentarios) / t.publicaciones) / 10} ${E2("por publicación", "per post")}` : "—" },
          { k: E2("PREGUNTAS RESUELTAS", "QUESTIONS RESOLVED"), v: pct(t.resueltas, t.preguntas), s: E2(`${t.resueltas} de ${t.preguntas} · con «Me sirvió»`, `${t.resueltas} of ${t.preguntas} · with «Helpful»`), dark: true },
          { k: E2("TIEMPO A LA PRIMERA RESPUESTA", "TIME TO FIRST REPLY"), v: tiempo, s: E2(`promedio de ${t.con_respuesta} preguntas respondidas`, `average of ${t.con_respuesta} answered questions`) },
        ]), { type: "group", k: E2("MODERACIÓN", "MODERATION") }, kpis([
          { k: E2("REPORTES POR CADA 1,000 PUBLICACIONES", "REPORTS PER 1,000 POSTS"), v: t.publicaciones ? (Math.round((10000 * t.reportes) / t.publicaciones) / 10).toString() : "—", s: E2(`${t.reportes} reportes de publicaciones y comentarios`, `${t.reportes} reports on posts and comments`) },
          { k: E2("APELACIONES LEVANTADAS", "APPEALS GRANTED"), v: String(t.levantadas), s: E2(`${pct(t.levantadas, t.decididas)} de ${t.decididas} decididas`, `${pct(t.levantadas, t.decididas)} of ${t.decididas} decided`) },
        ]), { type: "group", k: E2("MONEDAS Y CUPONES · SIN VALOR EN DINERO", "COINS AND COUPONS · NO CASH VALUE") }, kpis([
          { k: E2("MONEDAS EMITIDAS", "COINS ISSUED"), v: t.emitidas.toLocaleString("en-US"), s: E2("bienvenida y premios del mes", "welcome and monthly rewards") },
          { k: E2("MONEDAS CANJEADAS", "COINS REDEEMED"), v: t.canjeadas.toLocaleString("en-US"), s: E2(`${t.devueltas.toLocaleString("en-US")} devueltas por códigos vencidos`, `${t.devueltas.toLocaleString("en-US")} returned from expired codes`) },
          { k: E2("CANJES", "REDEMPTIONS"), v: String(t.canjes), s: E2(`${t.usados} usados en el negocio`, `${t.usados} used at the business`) },
        ]),
        { type: "rows", k: E2("VECINOS ACTIVOS POR RANGO · PUBLICARON, COMENTARON O VOTARON", "ACTIVE NEIGHBORS BY RANK · POSTED, COMMENTED OR VOTED"), items: rangos.length ? rangos.map((x) => ({ key: String(x.rango), icon: "shield", t: `${x.rango} · ${x.nombre ?? ""}`, r: String(x.activos), s: "▮".repeat(Math.max(1, Math.round((12 * x.activos) / mxR))) })) : [{ key: "0", icon: "shield", t: E2("Nadie activo en el período", "Nobody active in the period") }] },
        { type: "rows", k: E2("POR CIUDAD", "BY CITY"), items: ciudades.map((x) => ({ key: x.ciudad, icon: "pin", t: x.ciudad, s: E2(`${x.publicaciones} publicaciones · ${x.comentarios} comentarios · ${pct(x.resueltas, x.preguntas)} resueltas · ${x.reportes} reportes`, `${x.publicaciones} posts · ${x.comentarios} comments · ${pct(x.resueltas, x.preguntas)} resolved · ${x.reportes} reports`) })) },
        { type: "rows", k: E2("CANJES POR NEGOCIO", "REDEMPTIONS BY BUSINESS"), items: negocios.length ? negocios.map((x) => ({ key: x.negocio + x.ciudad, icon: "ticket", t: `${x.negocio} · ${x.ciudad}`, r: String(x.canjes), s: E2(`${x.usados} usados · ${x.monedas.toLocaleString("en-US")} monedas · ${"▮".repeat(Math.max(1, Math.round((12 * x.canjes) / mxN)))}`, `${x.usados} used · ${x.monedas.toLocaleString("en-US")} coins · ${"▮".repeat(Math.max(1, Math.round((12 * x.canjes) / mxN)))}`) })) : [{ key: "0", icon: "ticket", t: E2("Sin canjes en el período", "No redemptions in the period") }] },
        { type: "note", tone: "info", icon: "lock", t: E2("Solo cifras por ciudad y día: nunca quién publicó, votó o canjeó.", "Figures only by city and day: never who posted, voted or redeemed.") },
        ]} />
      </>);
  } else if (d.tab === "evt" && d.evt) {
    // 6j · Eventos: por ciudad, formato y día, sin personas (solo las vistas de 0115; los organizadores son negocios).
    const { t, formatos, ciudades, asistencia: a, negocios, evp } = d.evt, usd = (c: number) => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const noVinieron = Math.max(0, a.esperados - a.entraron), mxF = Math.max(1, ...formatos.map((x) => x.ordenes + x.rsvp));
    // Una conversión «de las vistas» solo si tiene sentido (las vistas se cuentan desde que existe la ficha; lo de antes no tiene vista).
    const deVistas = (x: number) => (t.vistas && x <= t.vistas ? ` · ${pct(x, t.vistas)} ${E2("de las vistas", "of views")}` : "");
    cuerpo = (
      <>
        <PanelBloques bloques={[periodo, { type: "group", k: E2("DE VER A IR", "FROM VIEWING TO GOING") }, kpis([
          { k: E2("VISTAS DE EVENTOS", "EVENT VIEWS"), v: t.vistas.toLocaleString("en-US"), s: `${t.guardados} ${E2("guardados", "saved")}${t.guardados <= t.vistas ? ` · ${pct(t.guardados, t.vistas)}` : ""}` },
          { k: "RSVP", v: String(t.rsvp), s: E2(`${t.rsvp_personas} personas${deVistas(t.rsvp)}`, `${t.rsvp_personas} people${deVistas(t.rsvp)}`) },
          { k: E2("ÓRDENES DE BOLETOS", "TICKET ORDERS"), v: String(t.ordenes), s: E2(`${t.boletos} boletos · ${t.cortesias} cortesías${deVistas(t.ordenes)}`, `${t.boletos} tickets · ${t.cortesias} comps${deVistas(t.ordenes)}`), dark: true },
          { k: E2("LISTA DE ESPERA", "WAITLIST"), v: String(t.espera), s: E2(`${t.espera_convertidos} compraron · ${pct(t.espera_convertidos, t.espera)}`, `${t.espera_convertidos} bought · ${pct(t.espera_convertidos, t.espera)}`) },
        ]), { type: "group", k: E2("DINERO DE BOLETOS", "TICKET MONEY") }, kpis([
          { k: E2("BRUTO", "GROSS"), v: usd(t.bruto), s: E2("cobrado (boletos, mesa y extras; cargos incluidos)", "charged (tickets, table and extras; fees included)") },
          { k: E2("COMISIÓN", "COMMISSION"), v: usd(t.comision), s: E2("regla «bol» de Planes", "Plans «bol» rule") },
          { k: E2("DEVUELTO", "REFUNDED"), v: usd(t.devuelto), s: E2(`${pct(t.devuelto, t.bruto)} del bruto`, `${pct(t.devuelto, t.bruto)} of gross`) },
        ]), { type: "group", k: E2("EN LA PUERTA · FECHAS QUE YA PASARON", "AT THE DOOR · PAST DATES") }, kpis([
          { k: E2("ASISTENCIA", "ATTENDANCE"), v: pct(a.entraron, a.esperados), s: E2(`${a.entraron} de ${a.esperados} con boleto · ${a.fechas} fechas`, `${a.entraron} of ${a.esperados} with a ticket · ${a.fechas} dates`), dark: true },
          { k: E2("NO VINIERON", "NO-SHOWS"), v: String(noVinieron), s: E2(`${pct(noVinieron, a.esperados)} de los que tenían boleto`, `${pct(noVinieron, a.esperados)} of ticket holders`) },
          { k: E2("RSVP QUE LLEGARON", "RSVPS WHO CAME"), v: pct(a.rsvp_llegaron, a.rsvp_van), s: E2(`${a.rsvp_llegaron} de ${a.rsvp_van} personas`, `${a.rsvp_llegaron} of ${a.rsvp_van} people`) },
          { k: E2("INCIDENCIAS POR CADA 1,000 ENTRADAS", "INCIDENTS PER 1,000 ENTRIES"), v: a.entraron ? (Math.round((10000 * a.incidencias) / a.entraron) / 10).toLocaleString("en-US") : "—", s: E2(`${a.incidencias} incidencias en la puerta de esas fechas`, `${a.incidencias} door incidents on those dates`) },
        ]), { type: "group", k: E2("EVENTO PRIVADO", "PRIVATE EVENT") }, kpis([
          { k: E2("PEDIDAS", "REQUESTED"), v: String(evp.pedidas), s: E2(`${evp.con_propuesta} con propuesta · ${evp.sin_respuesta} sin respuesta`, `${evp.con_propuesta} with a proposal · ${evp.sin_respuesta} without a reply`) },
          { k: E2("ACEPTADAS", "ACCEPTED"), v: String(evp.aceptadas), s: E2(`${pct(evp.aceptadas, evp.pedidas)} de las pedidas`, `${pct(evp.aceptadas, evp.pedidas)} of requested`) },
          { k: E2("DEPÓSITOS", "DEPOSITS"), v: usd(evp.deposito), s: E2("cobrado al aceptar", "charged on acceptance") },
          { k: E2("CANCELADAS", "CANCELLED"), v: String(evp.a_tiempo + evp.tarde + evp.negocio), s: E2(`${evp.a_tiempo} a tiempo · ${evp.tarde} tarde · ${evp.negocio} el restaurante`, `${evp.a_tiempo} on time · ${evp.tarde} late · ${evp.negocio} by the restaurant`) },
        ]),
        { type: "rows", k: E2("POR FORMATO", "BY FORMAT"), items: formatos.map((x) => ({ key: x.formato, icon: "ticket", t: x.label, r: String(x.ordenes + x.rsvp),
          s: E2(`${x.vistas} vistas · ${x.rsvp} RSVP · ${x.ordenes} órdenes · ${usd(x.bruto)} · ${"▮".repeat(Math.max(1, Math.round((12 * (x.ordenes + x.rsvp)) / mxF)))}`, `${x.vistas} views · ${x.rsvp} RSVP · ${x.ordenes} orders · ${usd(x.bruto)} · ${"▮".repeat(Math.max(1, Math.round((12 * (x.ordenes + x.rsvp)) / mxF)))}`) })) },
        { type: "rows", k: E2("POR CIUDAD", "BY CITY"), items: ciudades.map((x) => ({ key: x.ciudad, icon: "pin", t: x.ciudad, s: E2(`${x.vistas} vistas · ${x.rsvp} RSVP · ${x.ordenes} órdenes · ${usd(x.bruto)} · devuelto ${usd(x.devuelto)}`, `${x.vistas} views · ${x.rsvp} RSVP · ${x.ordenes} orders · ${usd(x.bruto)} · refunded ${usd(x.devuelto)}`) })) },
        { type: "rows", k: E2("POR ORGANIZADOR", "BY ORGANIZER"), items: negocios.length ? negocios.map((x) => ({ key: x.negocio + x.ciudad, icon: "store", t: `${x.negocio} · ${x.ciudad}`, r: usd(x.bruto), s: E2(`${x.ordenes} órdenes · comisión ${usd(x.comision)} · devuelto ${usd(x.devuelto)}`, `${x.ordenes} orders · commission ${usd(x.comision)} · refunded ${usd(x.devuelto)}`) })) : [{ key: "0", icon: "store", t: E2("Sin ventas en el período", "No sales in the period") }] },
        { type: "note", tone: "info", icon: "lock", t: E2("Solo cifras por ciudad, formato y día: nunca quién compró, fue o entró.", "Figures only by city, format and day: never who bought, went or got in.") },
        ]} />
      </>);
  } else if (d.tab === "cpa" && d.cpa) {
    // 7i · El Compa y Soporte: por ciudad, día, nivel, canal y tema, sin personas (solo las vistas de 0124; nada lleva a una persona).
    const { t, motivos: m, usos, canales, ciudades, sop: k, temas } = d.cpa, usd = (micro: number) => `$${(micro / 1e6).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const USO: Record<string, string> = { neighbor: E2("Vecinos", "Neighbors"), owner: E2("Panel del negocio", "Business dashboard"), auto_reply: E2("Respuestas automáticas", "Auto-replies"), copilot: E2("Copiloto del equipo", "Team copilot") };
    const CANAL: Record<string, string> = { app: E2("Chat de To'Latino", "To’Latino chat"), whatsapp: "WhatsApp", sms: "SMS" };
    const TEMA: Record<string, string> = { pedido: E2("Pedido", "Order"), cita: E2("Cita", "Booking"), pago: E2("Pago", "Payment"), negocio: E2("Negocio", "Business"), cuenta: E2("Cuenta", "Account"), tecnico: E2("Técnico", "Technical"), sugerencia: E2("Sugerencia", "Suggestion"), seguridad: E2("Seguridad", "Security") };
    const seg = (x: number | null) => (x == null ? "—" : x < 3600 ? `${Math.max(1, Math.round(x / 60))} min` : `${(x / 3600).toFixed(1)} h`);
    const solo = t.resolvio_solo + t.accion, mxM = Math.max(1, m.dinero, m.cuenta, m.seguridad, m.pidio, m.no_supo, m.dueno);
    cuerpo = (
      <>
        <PanelBloques bloques={[periodo, { type: "group", k: "EL COMPA" }, kpis([
          { k: E2("CONVERSACIONES", "CONVERSATIONS"), v: t.conversaciones.toLocaleString("en-US"), s: E2(`${t.con_ia} respuestas con IA · ${t.sin_ia} con reglas fijas`, `${t.con_ia} AI answers · ${t.sin_ia} with fixed rules`), dark: true },
          { k: E2("RESOLVIÓ SOLO", "RESOLVED ON ITS OWN"), v: pct(solo, t.conversaciones), s: E2(`${t.accion} acciones confirmadas`, `${t.accion} confirmed actions`) },
          { k: E2("A UNA PERSONA", "TO A PERSON"), v: String(t.a_persona + t.al_dueno), s: E2(`${pct(t.a_persona + t.al_dueno, t.conversaciones)} · ${t.al_dueno} al dueño`, `${pct(t.a_persona + t.al_dueno, t.conversaciones)} · ${t.al_dueno} to the owner`) },
          { k: E2("GASTO DE IA", "AI SPEND"), v: usd(t.gasto), s: E2(`${t.al_tope} al tope · ${t.apagado} apagado · ${t.limite} por límite`, `${t.al_tope} at the cap · ${t.apagado} off · ${t.limite} by limit`) },
        ]), kpis([
          { k: E2("ESPERA DE LA IA", "AI WAIT"), v: t.esperas ? `${(t.espera_suma / t.esperas / 1000).toFixed(1)} s` : "—", s: `${E2("promedio · p95 del peor día", "average · p95 of the worst day")} ${t.p95_max != null ? `${(t.p95_max / 1000).toFixed(1)} s` : "—"}` },
          { k: E2("A REGLAS", "TO RULES"), v: String(t.a_reglas), s: E2("lenta, error, rechazo o salida que no pasó el verificador", "slow, error, refusal or output that failed the checker") },
          { k: E2("NO SUPO", "DIDN’T KNOW"), v: String(t.no_supo), s: E2("conversaciones con «No tengo ese dato»", "conversations with «I don’t have that information»") },
          { k: E2("MARCADAS", "FLAGGED"), v: String(t.marcadas), s: E2("respuesta incorrecta según el equipo", "wrong answer according to the team") },
        ])]} />
        <A.HBars label={E2("POR QUÉ PASÓ A UNA PERSONA", "WHY IT WENT TO A PERSON")} items={([["Dinero", "Money", m.dinero], ["Su cuenta", "Their account", m.cuenta], ["Seguridad", "Security", m.seguridad], ["Pidió una persona", "Asked for a person", m.pidio], ["No supo", "Didn’t know", m.no_supo], ["Al dueño del negocio", "To the business owner", m.dueno]] as const)
          .map(([l, en, n]) => ({ label: E2(l, en), width: `${Math.max(2, Math.round((n / mxM) * 100))}%`, color: l === "No supo" ? "var(--tl-pro)" : "var(--tl-ink)", value: String(n) }))} />
        <PanelBloques bloques={[
          { type: "rows", k: E2("DÓNDE CONTESTA", "WHERE IT ANSWERS"), items: usos.length ? usos.map((x) => ({ key: x.uso, icon: "chat", t: USO[x.uso] ?? x.uso, r: String(x.conversaciones),
            s: E2(`resolvió solo ${pct(x.resolvio_solo + x.accion, x.conversaciones)} · a una persona ${x.a_persona + x.al_dueno} · sin IA ${x.sin_ia} · ${usd(x.gasto)}`, `resolved on its own ${pct(x.resolvio_solo + x.accion, x.conversaciones)} · to a person ${x.a_persona + x.al_dueno} · without AI ${x.sin_ia} · ${usd(x.gasto)}`) })) : [{ key: "0", icon: "chat", t: E2("Sin conversaciones en el período", "No conversations in the period") }] },
          { type: "rows", k: E2("POR DÓNDE ESCRIBEN", "WHERE THEY WRITE FROM"), items: canales.length ? canales.map((x) => ({ key: x.canal, icon: x.canal === "app" ? "chat" : "phone", t: CANAL[x.canal] ?? x.canal, r: String(x.conversaciones),
            s: E2(`${x.con_ia} con IA · ${usd(x.gasto)}`, `${x.con_ia} with AI · ${usd(x.gasto)}`) })) : [{ key: "0", icon: "chat", t: E2("Sin conversaciones en el período", "No conversations in the period") }] },
          { type: "group", k: E2("SOPORTE", "SUPPORT") },
          kpis([
            { k: E2("CASOS", "CASES"), v: String(k.casos), s: E2(`${k.desde_compa} desde El Compa · ${k.de_negocios} de negocios · ${k.alta} prioridad alta`, `${k.desde_compa} from El Compa · ${k.de_negocios} from businesses · ${k.alta} high priority`), dark: true },
            { k: E2("PLAZO CUMPLIDO", "DEADLINE MET"), v: pct(k.plazo_cumplido, k.con_respuesta), s: E2(`${k.plazo_vencido} fuera de plazo (horas hábiles del equipo)`, `${k.plazo_vencido} past deadline (team business hours)`) },
            { k: E2("1.ª RESPUESTA", "1ST REPLY"), v: seg(k.con_respuesta ? k.primera_suma / k.con_respuesta : null), s: E2(`promedio · p90 del peor día ${seg(k.primera_p90_max)}`, `average · p90 of the worst day ${seg(k.primera_p90_max)}`) },
            { k: E2("¿SE RESOLVIÓ?", "RESOLVED?"), v: pct(k.csat_si, k.csat_si + k.csat_no), s: E2(`${k.csat_si} sí · ${k.csat_no} no · ${k.resueltos} resueltos`, `${k.csat_si} yes · ${k.csat_no} no · ${k.resueltos} resolved`) },
          ]),
          { type: "rows", k: E2("POR TEMA", "BY TOPIC"), items: temas.length ? temas.map((x) => ({ key: x.tema, icon: "help", t: TEMA[x.tema] ?? x.tema, r: String(x.casos),
            s: E2(`plazo cumplido ${pct(x.plazo_cumplido, x.con_respuesta)} · 1.ª respuesta ${seg(x.con_respuesta ? x.primera_suma / x.con_respuesta : null)} · ¿se resolvió? ${pct(x.csat_si, x.csat_si + x.csat_no)}${x.devuelto ? ` · devuelto $${(x.devuelto / 100).toFixed(2)}` : ""}`,
              `deadline met ${pct(x.plazo_cumplido, x.con_respuesta)} · 1st reply ${seg(x.con_respuesta ? x.primera_suma / x.con_respuesta : null)} · resolved? ${pct(x.csat_si, x.csat_si + x.csat_no)}${x.devuelto ? ` · refunded $${(x.devuelto / 100).toFixed(2)}` : ""}`) }))
            : [{ key: "0", icon: "help", t: E2("Sin casos en el período", "No cases in the period") }] },
          { type: "rows", k: E2("POR CIUDAD", "BY CITY"), items: ciudades.map((x) => ({ key: x.ciudad, icon: "pin", t: x.ciudad,
            s: E2(`El Compa: ${x.conversaciones} conversaciones · resolvió solo ${pct(x.resolvio_solo + x.accion, x.conversaciones)} · ${usd(x.gasto)} · Soporte: ${x.casos} casos · plazo cumplido ${pct(x.plazo_cumplido, x.con_respuesta)}`, `El Compa: ${x.conversaciones} conversations · resolved on its own ${pct(x.resolvio_solo + x.accion, x.conversaciones)} · ${usd(x.gasto)} · Support: ${x.casos} cases · deadline met ${pct(x.plazo_cumplido, x.con_respuesta)}`) })) },
          { type: "note", tone: "info", icon: "lock", t: E2("Solo cifras por ciudad, día, nivel, canal y tema: nunca quién habló con El Compa ni quién abrió un caso.", "Figures only by city, day, level, channel and topic: never who talked to El Compa or who opened a case.") },
        ]} />
      </>);
  } else if (d.tab === "apps" && d.apps) {
    // 8i · Las cuatro apps por app y plataforma, sin personas (sesiones, eventos y errores contados).
    const X = d.apps, APPN: Record<string, string> = { cliente: "To'Latino", negocio: "Negocios", delivery: "Repartidor", checkin: "Puerta" }, PL: Record<string, string> = { ios: "iPhone", android: "Android" };
    const nom = (a: string, p: string) => `${APPN[a] ?? a} · ${PL[p] ?? p}`, suma = (k: "n7" | "n30") => X.instalaciones.reduce((a, x) => a + x[k], 0);
    const vacio = (t: string) => [{ key: "0", icon: "phone", t }];
    cuerpo = (
      <PanelBloques bloques={[periodo, kpis([
        { k: E2("INSTALACIONES ACTIVAS · 7 D", "ACTIVE INSTALLS · 7 D"), v: String(suma("n7")), s: E2("teléfonos con una sesión de las apps", "phones with an app session"), dark: true },
        { k: E2("INSTALACIONES ACTIVAS · 30 D", "ACTIVE INSTALLS · 30 D"), v: String(suma("n30")) },
        { k: E2("AVISOS ACEPTADOS", "NOTIFICATIONS ACCEPTED"), v: String(X.avisos.reduce((a, x) => a + x.vivos, 0)), s: E2(`${X.avisos.reduce((a, x) => a + x.negados, 0)} negados · ${X.avisos.reduce((a, x) => a + x.ahora_no, 0)} «ahora no» en el período`, `${X.avisos.reduce((a, x) => a + x.negados, 0)} denied · ${X.avisos.reduce((a, x) => a + x.ahora_no, 0)} «not now» in the period`) },
        { k: E2("ERRORES POR SESIÓN", "ERRORS PER SESSION"), v: (() => { const e = X.errores.reduce((a, x) => a + x.errores, 0), n = X.errores.reduce((a, x) => a + x.sesiones, 0); return n ? (e / n).toFixed(2) : "—"; })(), s: E2("errores ÷ sesiones del período", "errors ÷ sessions in the period") },
      ]),
        { type: "rows", k: E2("INSTALACIONES ACTIVAS POR APP Y PLATAFORMA", "ACTIVE INSTALLS BY APP AND PLATFORM"), items: X.instalaciones.length ? X.instalaciones.map((x) => ({ key: `${x.app}-${x.plat}`, icon: "phone", t: nom(x.app, x.plat), r: String(x.n7), s: E2(`${x.n7} en 7 días · ${x.n30} en 30 días`, `${x.n7} in 7 days · ${x.n30} in 30 days`) })) : vacio(E2("Todavía no hay sesiones de las apps", "No app sessions yet")) },
        { type: "rows", k: E2("VERSIONES EN USO", "VERSIONS IN USE"), items: X.versiones.length ? X.versiones.map((x) => ({ key: `${x.app}-${x.plat}-${x.version}`, icon: "phone", t: E2(`${nom(x.app, x.plat)} · ${x.version ?? "sin versión"}`, `${nom(x.app, x.plat)} · ${x.version ?? "no version"}`), r: String(x.n), s: E2(`${x.n} ${x.n === 1 ? "sesión" : "sesiones"} en el período`, `${x.n} ${x.n === 1 ? "session" : "sessions"} in the period`) })) : vacio(E2("Sin sesiones en el período", "No sessions in the period")) },
        { type: "rows", k: E2("AVISOS: ACEPTADOS Y NEGADOS", "NOTIFICATIONS: ACCEPTED AND DENIED"), items: X.avisos.length ? X.avisos.map((x) => ({ key: `${x.app}-${x.plat}`, icon: "bell", t: nom(x.app, x.plat), r: pct(x.vivos, x.vivos + x.negados), s: E2(`${x.vivos} teléfonos con avisos · ${x.negados} negados · ${x.ahora_no} «ahora no»`, `${x.vivos} phones with notifications · ${x.negados} denied · ${x.ahora_no} «not now»`) })) : vacio(E2("Sin respuestas a los avisos todavía", "No responses to notifications yet")) },
        { type: "rows", k: E2("ERRORES POR SESIÓN", "ERRORS PER SESSION"), items: X.errores.length ? X.errores.map((x) => ({ key: `${x.app}-${x.plat}`, icon: "warning", t: nom(x.app, x.plat), r: x.sesiones ? (x.errores / x.sesiones).toFixed(2) : "—", s: E2(`${x.errores} errores · ${x.sesiones} sesiones en el período`, `${x.errores} errors · ${x.sesiones} sessions in the period`) })) : vacio(E2("Sin errores ni sesiones en el período", "No errors or sessions in the period")) },
        { type: "rows", k: E2("APERTURAS DE LA APP", "APP OPENS"), items: X.aperturas.length ? X.aperturas.map((x) => ({ key: `${x.app}-${x.plat}`, icon: "phone", t: nom(x.app, x.plat), r: String(x.n), s: E2("veces que la app abrió su entrada", "times the app opened its entry") })) : vacio(E2("Sin aperturas en el período", "No opens in the period")) },
        { type: "note", tone: "info", icon: "info", t: E2("Enlaces que abren la app o la web: llegan con los enlaces universales (8b, espera el dominio con HTTPS).", "Links that open the app or the web: they come with universal links (8b, waiting for the HTTPS domain).") },
        { type: "note", tone: "info", icon: "lock", t: E2("Solo cifras por app, plataforma y versión: nunca quién usa qué app.", "Figures only by app, platform and version: never who uses which app.") },
      ]} />);
  } else if (d.tab === "nosup" && d.nosup) {
    const L = d.nosup;
    cuerpo = (
      <>
        {L.length ? <A.HBars label={E2("BUSCARON Y NO HABÍA · 30 DÍAS", "SEARCHED AND FOUND NOTHING · 30 DAYS")} help={E2("pidieron aviso", "asked to be notified")} items={L.slice(0, 10).map((x) => ({ label: x.q, width: `${Math.round((x.n / (L[0]!.n || 1)) * 100)}%`, color: "var(--tl-ink)", value: String(x.n) }))} />
          : <PanelBloques bloques={[{ type: "empty", icon: "search", t: E2("Nadie ha pedido aviso todavía", "Nobody has asked to be notified yet"), s: E2("Cuando un vecino busca algo que no hay y toca «Avísame cuando haya», sale aquí.", "When a neighbor searches for something that isn’t there and taps «Notify me when available», it shows here.") }]} />}
        <PanelBloques bloques={[{ type: "acts", items: [{ l: E2("Abrir en Catálogo", "Open in Catalog"), icon: "grid", onClick: () => router.push("/admin/catalogo?tab=nosup") }] }]} />
        {/* 9g · Lo que se buscó y no encontró nada (search_logs): solo lo que buscaron 2 o más personas. */}
        {d.sinRes?.length ? <A.HBars label={E2("BUSCARON Y NO HUBO RESULTADOS · 30 DÍAS", "SEARCHED WITH NO RESULTS · 30 DAYS")} help={E2("personas distintas · solo lo que buscaron 2 o más", "distinct people · only what 2 or more searched")}
          items={d.sinRes.slice(0, 15).map((x) => ({ label: x.q, width: `${Math.round((x.personas / (d.sinRes![0]!.personas || 1)) * 100)}%`, color: "var(--tl-pro)", value: `${x.personas} · ${x.n}` }))} />
          : <PanelBloques bloques={[{ type: "empty", icon: "search", t: E2("Ninguna búsqueda sin resultado", "No searches without results"), s: E2("Cuando dos o más vecinos busquen algo y no salga nada, aparece aquí.", "When two or more neighbors search for something and nothing comes up, it shows here.") }]} />}
      </>);
  } else if (d.tab === "dinero" && d.dinero) {
    // 9g · Dinero (prototipo secAnalit «money»): de metricas_dinero_dia y metricas_pro_dia, que llena el barrido. Solo cifras.
    const D = d.dinero, usd = (c: number) => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const tot = (k: "bruto" | "comision" | "operaciones" | "devoluciones" | "devuelto" | "cerradas" | "no_llegaron") => D.tipos.reduce((a, x) => a + x[k], 0);
    const delta = (a: number, b: number) => (b ? `${a >= b ? "+" : ""}${Math.round(((a - b) / b) * 100)} % ${E2("contra el período anterior", "vs. the previous period")}` : E2("sin período anterior", "no previous period"));
    const TIPO: Record<string, string> = {
      order: E2("Pedido", "Order"), market_order: E2("Mercado", "Market order"), hold: E2("Apartado", "Hold"), appointment: E2("Cita", "Booking"),
      quote: E2("Presupuesto", "Quote"), party: E2("Fiesta", "Party"), private_event: E2("Evento privado", "Private event"),
      table: E2("Mesa", "Table"), night: E2("Noche", "Night"), trip: E2("Viaje", "Trip"), enrollment: E2("Inscripción", "Enrollment"),
      visit: E2("Visita", "Visit"), tickets: E2("Boletos", "Tickets"), rental: E2("Renta", "Rental"), plan: "Plan"
    };
    const nom = (k: string) => (TIPO[k] ?? k);
    const ticket = D.tipos.filter((x) => x.operaciones).map((x) => ({ k: x.tipo, v: x.bruto / x.operaciones })), mxT = Math.max(1, ...ticket.map((x) => x.v));
    const mxS = Math.max(1, ...D.semanas.map((x) => x.neto)), ESTADO: Record<string, string> = { captured: E2("Cobrado", "Charged"), held: E2("Retenido", "Held"), released: E2("Liberado", "Released"),
      refunded: E2("Devuelto", "Refunded"), partially_refunded: E2("Devuelto en parte", "Partly refunded"), failed: E2("Falló", "Failed") };
    const mxE = Math.max(1, ...D.estados.map((x) => x.monto + x.devuelto));
    const FP = [[E2("Prueba Pro", "Pro trial"), D.pro.iniciadas], [E2("Dejaron tarjeta", "Left card"), D.pro.con_tarjeta], [E2("Primer cobro", "First charge"), D.pro.primeros]] as const;
    cuerpo = (
      <>
        <PanelBloques bloques={[periodo, kpis([
          { k: E2("VENDIDO EN LÍNEA", "SOLD ONLINE"), v: usd(tot("bruto")), s: delta(tot("bruto"), D.antes.bruto), dark: true },
          { k: E2("COMISIÓN", "COMMISSION"), v: usd(tot("comision")), s: delta(tot("comision"), D.antes.comision) },
          { k: E2("OPERACIONES COBRADAS", "PAID TRANSACTIONS"), v: String(tot("operaciones")), s: delta(tot("operaciones"), D.antes.operaciones) },
          { k: E2("DEVOLUCIONES", "REFUNDS"), v: pct(tot("devoluciones"), tot("operaciones")), s: E2(`${tot("devoluciones")} · ${usd(tot("devuelto"))} devuelto`, `${tot("devoluciones")} · ${usd(tot("devuelto"))} refunded`) },
          { k: E2("TICKET PROMEDIO", "AVERAGE TICKET"), v: tot("operaciones") ? usd(tot("bruto") / tot("operaciones")) : "—", s: E2("de lo cobrado", "of what was charged") },
          { k: E2("NO LLEGARON", "NO-SHOWS"), v: pct(tot("no_llegaron"), tot("cerradas")), s: E2(`${tot("no_llegaron")} de ${tot("cerradas")} citas, mesas y visitas`, `${tot("no_llegaron")} of ${tot("cerradas")} bookings, tables and visits`) },
        ]), { type: "chart", k: E2("VENDIDO POR SEMANA · 8 SEMANAS", "SOLD PER WEEK · 8 WEEKS"), v: usd(D.semanas.reduce((a, x) => a + x.neto, 0)),
          bars: D.semanas.map((x, i) => ({ h: `${Math.max(4, Math.round((x.neto / mxS) * 100))}%`, on: i === D.semanas.length - 1, l: x.semana.slice(5) })),
          s: E2("Solo lo cobrado, menos lo devuelto. La última barra es la semana en curso.", "Charged only, minus refunds. The last bar is the current week.") }]} />
        {ticket.length ? <A.HBars label={E2("TICKET PROMEDIO POR TIPO", "AVERAGE TICKET BY TYPE")} items={ticket.map((x) => ({ label: nom(x.k), width: `${Math.max(2, Math.round((x.v / mxT) * 100))}%`, color: "var(--tl-ink)", value: usd(x.v) }))} />
          : <PanelBloques bloques={[{ type: "empty", icon: "card", t: E2("Todavía no hay cobros en el período", "No charges in the period yet"), s: E2("Cuando se cobre un pedido, una cita o boletos, sale aquí.", "When an order, booking or tickets are charged, it shows here.") }]} />}
        <PanelBloques bloques={[{ type: "rows", k: E2("POR TIPO DE OPERACIÓN", "BY TRANSACTION TYPE"), items: D.tipos.length ? D.tipos.map((x) => ({ key: x.tipo, icon: "card", t: nom(x.tipo), r: usd(x.bruto),
            s: E2(`${x.operaciones} cobradas · comisión ${usd(x.comision)} · devuelto ${usd(x.devuelto)}`, `${x.operaciones} paid · commission ${usd(x.comision)} · refunded ${usd(x.devuelto)}`) })) : [{ key: "0", icon: "card", t: E2("Sin cobros en el período", "No charges in the period") }] },
          { type: "group", k: "PRO" }, kpis([
            { k: "MRR", v: usd(D.foto.mrr), s: E2(`${D.foto.pagando} Pro pagando`, `${D.foto.pagando} paying Pro`), dark: true, onClick: () => router.push("/admin/planes") },
            { k: E2("CONVERSIÓN A PRO", "PRO CONVERSION"), v: pct(D.pro.primeros, D.pro.terminadas), s: E2(`${D.pro.primeros} de ${D.pro.terminadas} pruebas que terminaron`, `${D.pro.primeros} of ${D.pro.terminadas} trials that ended`) },
            { k: E2("EN PRUEBA", "ON TRIAL"), v: String(D.foto.prueba), s: E2(`${D.pro.a_free} pasaron a Free en el período`, `${D.pro.a_free} went to Free in the period`) },
            { k: E2("COBRADO DE PRO", "PRO CHARGED"), v: usd(D.pro.cobrado), s: E2("en el período", "in the period") },
          ])]} />
        <A.HBars label={E2("EMBUDO · PRUEBA PRO → PAGO", "FUNNEL · PRO TRIAL → PAID")} help={E2(`${d.dias} días`, `${d.dias} days`)} items={FP.map(([l, n]) => ({ label: l, width: `${Math.min(100, Math.max(2, Math.round((n / (FP[0][1] || 1)) * 100)))}%`, color: "var(--tl-pro)", value: String(n) }))} />
        {D.estados.length ? <A.HBars label={E2("DINERO POR ESTADO", "MONEY BY STATE")} help={E2(`${d.dias} días · cobros creados en el período`, `${d.dias} days · charges created in the period`)}
          items={D.estados.map((x) => ({ label: ESTADO[x.estado] ?? x.estado, width: `${Math.max(2, Math.round(((x.monto + x.devuelto) / mxE) * 100))}%`, color: x.estado === "captured" ? "var(--tl-action)" : "var(--tl-ink)", value: usd(x.monto + x.devuelto) }))} /> : null}
        <PanelBloques bloques={[...(D.concil ? [{ type: "group", k: E2("CONCILIACIÓN CON STRIPE", "STRIPE RECONCILIATION") }, kpis([
            { k: E2("DÍAS QUE CUADRARON", "DAYS THAT MATCHED"), v: `${D.concil.cuadra} / ${D.concil.cuadra + D.concil.diferencias + D.concil.fallo + D.concil.sin_correr}`, s: D.concil.ultimo ? E2(`la última corrió para el ${D.concil.ultimo}`, `the last one ran for ${D.concil.ultimo}`) : E2("todavía no corrió", "has not run yet"), dark: true },
            { k: E2("CON DIFERENCIAS", "WITH DIFFERENCES"), v: String(D.concil.diferencias), s: E2(`${D.concil.sin_dueno} sin dueño · ${usd(D.concil.diferencia)}`, `${D.concil.sin_dueno} unowned · ${usd(D.concil.diferencia)}`), onClick: D.concil.sin_dueno ? () => router.push("/admin/planes") : undefined },
            { k: E2("NO CORRIÓ O FALLÓ", "DID NOT RUN OR FAILED"), v: String(D.concil.sin_correr + D.concil.fallo), s: E2("días del período", "days in the period") },
          ]), { type: "note", tone: "info", icon: "info", t: E2("Cada noche se compara lo cobrado aquí contra lo que dice Stripe; las diferencias sin dueño se toman en Planes.", "Every night what was charged here is compared with what Stripe says; unowned differences are taken in Plans.") }]
          : [{ type: "note", tone: "info", icon: "info", t: E2("La conciliación con Stripe es de toda la plataforma: sale a quien ve todas las ciudades.", "The Stripe reconciliation covers the whole platform: it shows to whoever sees all cities.") }]) as Bloque[],
          { type: "note", tone: "info", icon: "lock", t: E2("Solo cifras por ciudad, día y tipo: nunca quién pagó.", "Figures only by city, day and type: never who paid.") }]} />
      </>);
  } else if (d.tab === "ha" && d.ha) {
    // 9g · Hogar y Auto (LAUNCH L452): solo cifras.
    const { sol, hogar, auto, est } = d.ha, usd = (c: number) => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    cuerpo = (
      <PanelBloques bloques={[periodo, { type: "group", k: E2("PRE-ESTIMADOS, PRESUPUESTOS Y EMERGENCIAS", "PRE-ESTIMATES, QUOTES AND EMERGENCIES") }, kpis([
        { k: E2("PRE-ESTIMADO → CITA", "PRE-ESTIMATE → BOOKING"), v: pct(sol.pre_cita, sol.pre), s: E2(`${sol.pre_cita} de ${sol.pre} pre-estimados`, `${sol.pre_cita} of ${sol.pre} pre-estimates`), dark: true },
        { k: E2("PRESUPUESTO → CITA", "QUOTE → BOOKING"), v: pct(sol.pq_cita, sol.pq), s: E2(`${sol.pq_cita} de ${sol.pq} presupuestos`, `${sol.pq_cita} of ${sol.pq} quotes`) },
        { k: E2("EMERGENCIAS ATENDIDAS", "EMERGENCIES ANSWERED"), v: pct(sol.em_ok, sol.em), s: E2(`${sol.em_ok} de ${sol.em}`, `${sol.em_ok} of ${sol.em}`) },
        { k: E2("RESPUESTA A UNA EMERGENCIA", "EMERGENCY RESPONSE"), v: sol.em_min == null ? "—" : `${sol.em_min} min`, s: E2("promedio, de pedir a que un negocio acepte", "average, from request to a business accepting") },
      ]), { type: "group", k: E2("VISITAS Y CITAS", "VISITS AND BOOKINGS") }, kpis([
        { k: E2("HOGAR · LLEGÓ EN LA FRANJA", "HOME · ARRIVED IN THE WINDOW"), v: pct(hogar.en_franja, hogar.llegaron), s: E2(`${hogar.en_franja} de ${hogar.llegaron} con «Llegué» · franja de 2 h`, `${hogar.en_franja} of ${hogar.llegaron} with «Arrived» · 2-hour window`), dark: true },
        { k: E2("HOGAR · NO LLEGÓ EL CLIENTE", "HOME · CUSTOMER NO-SHOW"), v: String(hogar.no_llego), s: E2(`de ${hogar.visitas} visitas que ya pasaron`, `of ${hogar.visitas} visits that already happened`) },
        { k: E2("AUTO · CITAS", "AUTO · BOOKINGS"), v: String(auto.visitas), s: E2(`${auto.no_llego} no llegaron`, `${auto.no_llego} no-shows`) },
      ]), { type: "group", k: E2("ESTIMADOS: APROBADO CONTRA COBRADO", "ESTIMATES: APPROVED VS. CHARGED") }, kpis([
        { k: E2("APROBADO", "APPROVED"), v: usd(est.aprobado), s: E2(`${est.con} trabajos terminados con estimado`, `${est.con} finished jobs with an estimate`) },
        { k: E2("COBRADO", "CHARGED"), v: usd(est.cobrado), s: est.aprobado ? E2(`${pct(est.cobrado, est.aprobado)} de lo aprobado · nunca más`, `${pct(est.cobrado, est.aprobado)} of what was approved · never more`) : "—", dark: true },
        { k: E2("EXTRAS CON SU OK", "EXTRAS WITH THEIR OK"), v: String(est.extra), s: E2("algo que apareció y el cliente aprobó", "something that came up and the customer approved") },
      ]), { type: "note", tone: "info", icon: "lock", t: E2("Solo cifras: nunca la casa, el carro ni quién pidió.", "Figures only: never the home, the car or who asked.") }]} />);
  } else if (d.tab === "rep") {
    // 9g · Reportes: los programados por correo (de quien mira) y el reporte diario al fundador (solo los Admins lo ven).
    const TAB: [string, string][] = [["sum", E2("Resumen", "Overview")], ["dinero", E2("Dinero", "Money")], ["ppl", E2("Gente y negocios", "People and businesses")], ["nosup", E2("Búsquedas sin resultado", "Searches with no results")],
      ["evt", E2("Eventos", "Events")], ["cpa", E2("El Compa y Soporte", "El Compa and Support")], ["biz", E2("Negocios", "Businesses")]];
    const CADA: Record<string, string> = {
      dia: E2("Cada día, 8 AM", "Every day, 8 AM"), semana: E2("Cada lunes, 8 AM", "Every Monday, 8 AM"),
      mes: E2("El día 1, 8 AM", "On the 1st, 8 AM")
    };
    const prog = (k: string) => d.programados?.find((x) => x.tab === k && x.status === "activo");
    const cambiar = (k: string, cada: string | null) => start(async () => { const r = await programar(k, cada); setToast(r.mensaje ?? ""); if (r.ok) router.refresh(); });
    const cuando = (iso: string | null) => (iso ? new Intl.DateTimeFormat(d.l === "en" ? "en-US" : "es-US", { timeZone: "America/New_York", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso)) : E2("todavía no salió", "not sent yet"));
    const filas: Bloque[] = [{ type: "note", tone: d.exporta ? "info" : "warn", icon: d.exporta ? "calendar" : "lock", t: d.exporta ? E2("Te llegan a tu correo con las cifras de tus ciudades. Solo cifras: nunca quién.", "They arrive in your email with the figures for your cities. Figures only: never who.") : E2("Tu rol no programa reportes.", "Your role cannot schedule reports.") },
      { type: "rows", k: E2("REPORTES PROGRAMADOS", "SCHEDULED REPORTS"), items: TAB.map(([k, tt]) => { const p = prog(k); return { key: k, icon: "calendar", t: tt,
        s: p ? `${CADA[p.cada]!} · ${E2("último", "last")}: ${cuando(p.last_sent_at)}` : E2("Bajo pedido", "On demand"),
        ...(d.exporta ? { tgOn: !!p, onTg: () => cambiar(k, p ? null : "semana") } : {}) }; }) }];
    for (const [k, tt] of TAB) { const p = prog(k); if (p && d.exporta) filas.push({ type: "chips", k: `${tt.toUpperCase()} · ${E2("CADA CUÁNTO", "HOW OFTEN")}`, items: (["dia", "semana", "mes"] as const).map((c) => ({ l: CADA[c]!, v: p.cada === c ? "selected" : "filter", onClick: () => { if (!pend && p.cada !== c) cambiar(k, c); } })) }); }
    if (d.diarios) {
      const usd = (c: number) => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      const hoy = d.diarios.find((x) => x.kind === "diario");
      filas.push({ type: "group", k: E2("REPORTE DIARIO AL FUNDADOR · 7:30 AM", "DAILY REPORT TO THE FOUNDER · 7:30 AM") },
        { type: "acts", items: [{ l: E2("Mándamelo ahora", "Send it to me now"), icon: "bell", off: pend, onClick: () => start(async () => { const r = await reporteAhora(); setToast(r.mensaje ?? ""); }) }] },
        { type: "rows", items: d.diarios.length ? d.diarios.map((x) => x.kind === "alerta"
          ? { key: `a${x.dia}`, icon: "warning", ifg: "var(--tl-danger)", t: E2(`${x.dia} · no salió a tiempo`, `${x.dia} · did not go out on time`), tag: E2("ALERTA", "ALERT"), tone: "danger", s: x.cifras.motivo === "tarde" ? E2(`Salió después de las 8:00 (${x.hora}).`, `Went out after 8:00 (${x.hora}).`) : E2("A las 8:00 no había salido.", "By 8:00 it had not gone out.") }
          : { key: `d${x.dia}`, icon: "bell", t: E2(`${x.dia} · salió ${x.hora}`, `${x.dia} · went out ${x.hora}`), r: usd(x.cifras.dinero?.bruto ?? 0),
              s: E2(`${x.cifras.negocios?.nuevos ?? 0} negocios nuevos · ${x.cifras.operaciones?.enviadas ?? 0} operaciones · ${(x.destinos ?? []).map((z) => `${z.n} ${z.canal === "push" ? "push" : "correos"}`).join(" · ")}`,
                `${x.cifras.negocios?.nuevos ?? 0} new businesses · ${x.cifras.operaciones?.enviadas ?? 0} transactions · ${(x.destinos ?? []).map((z) => `${z.n} ${z.canal === "push" ? "push" : "emails"}`).join(" · ")}`) })
          : [{ key: "0", icon: "bell", t: E2("Todavía no ha salido ninguno", "None has gone out yet"), s: E2("Sale cada día a las 7:30 AM de Hazleton a los Admins.", "It goes out every day at 7:30 AM Hazleton time to the Admins.") }] });
      // R3 · El bloque «Fotos» del último reporte (revisión automática de las fotos públicas): lo de ayer y cinco publicadas por los modelos, al azar, para mirar.
      const fr = hoy?.cifras.fotos;
      if (fr) {
        const tt = fr.totales, capaN: Record<string, [string, string]> = { c1: ["Capa 1 · modelo propio", "Layer 1 · own model"], c2: ["Capa 2 · segunda opinión", "Layer 2 · second opinion"], c3: ["Capa 3 · reportes", "Layer 3 · reports"], c4: ["Capa 4 · confianza", "Layer 4 · trust"], memoria: ["Memoria de contenido", "Content memory"], persona: ["Una persona del equipo", "A team member"] };
        filas.push({ type: "group", k: E2(`FOTOS · REVISIÓN AUTOMÁTICA · ${hoy!.cifras.ayer}`, `PHOTOS · AUTOMATIC REVIEW · ${hoy!.cifras.ayer}`) },
          { type: "kpis", cols: "repeat(auto-fit,minmax(110px,1fr))", items: [{ k: E2("PUBLICADAS", "PUBLISHED"), v: String(tt.publicadas) }, { k: E2("RETENIDAS", "HELD"), v: String(tt.retenidas) }, { k: E2("RECHAZADAS", "REJECTED"), v: String(tt.rechazadas) }, { k: E2("OCULTAS", "HIDDEN"), v: String(tt.ocultadas) }] },
          { type: "rows", items: [...fr.porCapa.map((x) => ({ key: `c${x.capa}`, icon: "image", t: E2(...(capaN[x.capa] ?? [x.capa, x.capa])), s: E2(`${x.publicadas} publicadas · ${x.retenidas} retenidas · ${x.rechazadas} rechazadas · ${x.ocultadas} ocultas`, `${x.publicadas} published · ${x.retenidas} held · ${x.rechazadas} rejected · ${x.ocultadas} hidden`) })),
            { key: "gasto", icon: "dollar", t: E2("Segunda opinión · gasto del mes", "Second opinion · spend this month"), s: fr.topeUsd > 0 ? E2(`$${fr.gastoUsd.toFixed(2)} de $${fr.topeUsd.toFixed(2)} de tope`, `$${fr.gastoUsd.toFixed(2)} of a $${fr.topeUsd.toFixed(2)} cap`) : E2("Apagada: el tope está en $0.00", "Off: the cap is $0.00"), chev: true, onClick: () => router.push("/admin/contenido?tab=auto") }] },
          ...(fr.muestra.length ? [{ type: "photos" as const, k: E2("PARA MIRAR · CINCO AL AZAR", "TO LOOK AT · FIVE AT RANDOM"), cols: 5, items: fr.muestra.map((x) => ({ key: x.mediaId, bg: fotoFondo(x.url, 240), onClick: () => window.open(x.url, "_blank", "noopener") })) }] : []));
      }
      if (hoy) filas.push({ type: "rows", k: E2("LO QUE NECESITA DE TI", "WHAT NEEDS YOU"), items: (hoy.cifras.pendientes ?? []).length ? hoy.cifras.pendientes.map((p, i) => ({ key: `p${i}`, icon: "brief", t: E2(p.es, p.en), s: `${E2("Paquete", "Package")} ${p.paquete}`, onClick: () => router.push("/admin/sistema/apps?v=toca") }))
        : [{ key: "0", icon: "check", t: E2("Nada por ahora", "Nothing for now") }] });
    }
    filas.push({ type: "note", tone: "info", icon: "info", t: d.replica ? E2("Analítica lee de la base de análisis (réplica): nunca frena la app.", "Analytics reads from the analysis database (replica): it never slows the app down.") : E2("En el sandbox Analítica lee de la misma base; en producción, de la réplica de análisis.", "In the sandbox Analytics reads from the same database; in production, from the analysis replica.") });
    cuerpo = <PanelBloques bloques={filas} />;
  } else if (d.tab === "exp") {
    const R = [["biz", "Negocios", "Businesses"], ["audit", "Historial", "History"], ["nosup", "Búsquedas sin oferta", "Searches without supply"]] as const;
    const bajar = (k: "biz" | "audit" | "nosup") => start(async () => {
      const r = await exportar(k);
      if (!r.ok) { setToast(r.mensaje); return; }
      if ("archivo" in r && r.archivo) {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob(["﻿" + r.archivo], { type: "text/csv;charset=utf-8" }));
        a.download = r.nombre ?? `tolatino-${k}.csv`; document.body.appendChild(a); a.click(); a.remove();
      }
      setToast(r.mensaje ?? E2("Descargado.", "Downloaded."));
    });
    cuerpo = (
      <>
        <PanelBloques bloques={[{ type: "note", tone: d.exporta ? "info" : "warn", icon: d.exporta ? "folder" : "lock", t: d.exporta ? E2("Descarga en CSV (abre en Excel o Sheets). Cada exportación queda en la auditoría.", "Download as CSV (opens in Excel or Sheets). Every export stays in the audit log.") : E2("Tu rol no exporta datos.", "Your role cannot export data.") },
          { type: "rows", items: R.map(([k, l, en]) => ({ key: k, icon: "folder", t: E2(l, en), s: E2("Bajo pedido", "On demand"), acts: d.exporta ? [{ l: E2("Descargar CSV", "Download CSV"), v: "action", icon: "folder", off: pend, onClick: () => bajar(k) }] : undefined })) }]} />
      </>);
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 1120 }}>
      <PanelBloques bloques={[{ type: "head", eye: "CONTROL", t: E2("Analítica", "Analytics"), s: E2("Lo que pasa en la plataforma, de los eventos propios y de la base: dinero, gente, negocios, búsquedas y confianza. Nada sale a terceros.", "What happens on the platform, from our own events and database: money, people, businesses, searches and trust. Nothing goes to third parties."), h1: desk ? 26 : 22 }, tabs]} />
      {cuerpo}
      <Toast t={toast} desk={desk} />
    </div>);
}

/* dinero fijo: super admin (cifras de contabilidad del equipo, siempre con dos decimales) */
