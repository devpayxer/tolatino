"use client";
/* ADM-ANALIT · Analítica (Super Admin.dc.html secAnalit) con lo que existe en la Fase 1: Resumen (embudo del directorio),
   Gente y negocios, Soporte y confianza, Búsquedas sin oferta y Exportar. Período 7 / 30 / 90 días en la URL. */
import * as UI from "@tolatino/ui";
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { usePathname, useRouter } from "next/navigation";
import { useTransition, type ComponentType, type ReactNode } from "react";
import { exportar, programar, reporteAhora } from "./acciones-analitica";
import { motivoAyuda } from "@/lib/ayuda-motivos";
import { Toast, useAncho, useToast } from "./Colas";

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
  const E = (a: string, b: string) => (d.l === "en" ? b : a);
  const tabs: Bloque = { type: "tabs", items: ([["sum", "Resumen", "Overview"], ["ppl", "Gente y negocios", "People and businesses"], ["dinero", "Dinero", "Money"], ["trust", "Soporte y confianza", "Support and trust"],
    ["sp", "Doctores y Profesionales", "Doctors and Professionals"], ["ha", "Hogar y Auto", "Home and Auto"], ["mt", "Mercados y Tiendas", "Markets and Stores"], ["ft", "Fiestas y Transporte", "Parties and Transport"],
    ["no", "Noche", "Nightlife"], ["en", "Educación · Niños · Deporte", "Education · Kids · Sports"], ["ia", "Iglesias · Bienes Raíces · Autos", "Churches · Real Estate · Cars"], ["com", "Comunidad", "Community"],
    ["evt", "Eventos", "Events"], ["cpa", "El Compa y Soporte", "El Compa and Support"], ["apps", "Apps", "Apps"], ["nosup", "Búsquedas sin oferta", "Searches without supply"], ["rep", "Reportes", "Reports"],
    ["exp", "Exportar", "Export"]] as const).map(([k, es, en]) => ({ l: E(es, en), on: d.tab === k, onClick: () => ir(k) })) };
  const periodo: Bloque = { type: "chips", items: [7, 30, 90].map((n) => ({ l: E(`${n} días`, `${n} days`), v: d.dias === n ? "selected" : "filter", onClick: () => ir(d.tab, n) })) };
  const kpis = (items: { k: string; v: string; s?: string; dark?: boolean; onClick?: () => void }[]): Bloque => ({ type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))",
    items: items.map((x) => ({ k: x.k, v: x.v, s: x.s, onClick: x.onClick, ...(x.dark ? { bg: "var(--tl-ink)", fg: "var(--tl-white)", bd: "var(--tl-ink)", sFg: "rgba(255,255,255,.7)" } : {}) })) });

  let cuerpo: ReactNode = null;
  if (d.tab === "sum" && d.embudo) {
    const F = [["Buscaron", d.embudo.buscar], ["Abrieron una ficha", d.embudo.ficha], ["Contactaron", d.embudo.contactar]] as const;
    cuerpo = (
      <>
        <PanelBloques bloques={[periodo]} />
        {d.embudo.buscar ? <A.HBars label="EMBUDO · DE BUSCAR A CONTACTAR" help={`${d.dias} días · personas · buscar o abrir una categoría → ficha → Llamar, WhatsApp o Cómo llegar`} items={F.map(([l, n]) => ({ label: l, width: `${Math.max(2, Math.round((n / (F[0][1] || 1)) * 100))}%`, color: "var(--tl-action)", value: String(n) }))} />
          : <PanelBloques bloques={[{ type: "empty", icon: "filter", t: "Todavía no hay movimiento", s: "Cuando los vecinos busquen y abran fichas en el período, el embudo sale aquí." }]} />}
        {d.embudos ? (() => { const o = d.embudos.operacion, F = [[E("Buscaron", "Searched"), o.buscaron], [E("Abrieron una ficha", "Opened a page"), o.ficha],
            [E("Contactaron", "Contacted"), o.contactaron], [E("Pidieron", "Ordered"), o.enviaron], [E("El negocio aceptó", "Business accepted"), o.aceptadas]] as const;
          return <A.HBars label={E("EMBUDO · DE BUSCAR A ACEPTADO", "FUNNEL · FROM SEARCH TO ACCEPTED")} help={E(`${d.dias} días · personas distintas · «pidieron» = un pedido, una cita o una reserva`, `${d.dias} days · distinct people · «ordered» = an order, booking or reservation`)}
            items={F.map(([l, n]) => ({ label: l, width: `${Math.min(100, Math.max(2, Math.round((n / (F[0][1] || 1)) * 100)))}%`, color: "var(--tl-action)", value: String(n) }))} />; })() : null}
        {d.cv ? <PanelBloques bloques={[kpis([
          { k: E("VISTAS DE FICHAS", "BUSINESS PAGE VIEWS"), v: d.cv.vistas.vistas.toLocaleString("en-US"), s: E(`${d.cv.vistas.unicos.toLocaleString("en-US")} sin repetidos`, `${d.cv.vistas.unicos.toLocaleString("en-US")} unique`), dark: true },
          { k: E("«LLAMAR» EN UNA SEMILLA", "«CALL» ON A SEED"), v: String(d.cv.semillas.toques), s: E(`${d.cv.semillas.semillas} negocios sin reclamar`, `${d.cv.semillas.semillas} unclaimed businesses`) },
          { k: E("SEMILLAS RECLAMADAS", "SEEDS CLAIMED"), v: String(d.cv.semillas.reclamadas), s: E("en el período", "in the period") },
        ]), ...(d.cv.top.length ? [{ type: "rows" as const, k: E("SEMILLAS QUE MÁS LLAMAN", "MOST CALLED SEEDS"), items: d.cv.top.map((x) => ({ key: x.nombre, icon: "phone", t: x.nombre, r: String(x.toques), s: x.reclamada ? E("Ya reclamó su página", "Already claimed its page") : E("Sin reclamar · sal a buscarlo", "Unclaimed · go find them") })) }] : [])]} /> : null}
      </>);
  } else if (d.tab === "ppl" && d.gente) {
    const g = d.gente, top = g.cats[0]?.n || 1;
    cuerpo = (
      <>
        <PanelBloques bloques={[periodo, kpis([
          { k: "VECINOS", v: String(g.u.n), s: `${g.u.nuevos} nuevos en el período`, dark: true },
          { k: "ACTIVOS", v: pct(g.u.activos, g.u.n), s: "entraron en el período" },
          { k: "NEGOCIOS", v: String(g.b.n), s: `${g.b.pro} Pro · ${g.b.n - g.b.pro} Free`, onClick: () => router.push("/admin/negocios") },
          { k: "VERIFICADOS", v: pct(g.b.ver, g.b.n), s: `${g.b.ver} con sello` },
        ])]} />
        {g.retencion.some((r) => r.base) ? <A.HBars label="RETENCIÓN DE VECINOS NUEVOS" help="vuelven al día 1 · 7 · 30"
          items={g.retencion.map((r) => ({ label: `D${r.k}`, width: r.base ? `${Math.max(2, Math.round((r.vuelven / r.base) * 100))}%` : "2%", color: "var(--tl-action)", value: r.base ? `${Math.round((r.vuelven / r.base) * 100)} % · ${r.vuelven} de ${r.base}` : "—" }))} />
          : <A.AdminNote tone="info" icon="users">Retención: todavía no hay cuentas nuevas con la edad suficiente en el período.</A.AdminNote>}
        <A.HBars label="NEGOCIOS POR CATEGORÍA · PRO" items={g.cats.filter((c) => c.n).map((c) => ({ label: c.short, width: `${Math.round((c.n / top) * 100)}%`, color: "var(--tl-ink)", value: `${c.n} · ${c.pro}` }))} />
        {/* 9g · Retención por cohorte semanal (metricas_retencion) y los embudos del vecino y del negocio. */}
        <PanelBloques bloques={[{ type: "rows", k: E("RETENCIÓN POR COHORTE · SEMANA EN QUE SE REGISTRARON", "RETENTION BY COHORT · WEEK THEY SIGNED UP"),
          items: d.cohortes?.length ? d.cohortes.map((c) => ({ key: c.cohorte, icon: "users", t: E(`Semana del ${c.cohorte}`, `Week of ${c.cohorte}`), r: String(c.nuevos),
            s: `D1 ${pct(c.d1, c.base_d1)} · D7 ${pct(c.d7, c.base_d7)} · D30 ${pct(c.d30, c.base_d30)}` }))
            : [{ key: "0", icon: "users", t: E("Todavía no hay cohortes", "No cohorts yet") }] },
          { type: "note", tone: "info", icon: "info", t: E("Vecinos nuevos por semana (a la derecha) y cuántos volvieron el día 1, 7 y 30; «—» = esa semana todavía no tiene la edad.", "New neighbors per week (on the right) and how many came back on day 1, 7 and 30; «—» = that week is not that old yet.") }]} />
        {d.embudos ? (() => { const v = d.embudos.vecino, n = d.embudos.negocio;
          const FV = [[E("Se registraron", "Signed up"), v.registrados], [E("Buscaron", "Searched"), v.usaron], [E("Contactaron", "Contacted"), v.contactaron], [E("Volvieron", "Came back"), v.volvieron]] as const;
          const PN: Record<string, [string, string]> = { B1: ["Tipo de negocio", "Business type"], C1: ["Lo que hacen", "What they do"], D1: ["Precios", "Prices"], E1: ["Dónde y cuándo", "Where and when"], F1: ["Revisar", "Review"] };
          const FN = [...n.pasos.map((x) => [E(PN[x.paso]![0], PN[x.paso]![1]), x.n] as const), [E("Publicaron", "Published"), n.publicaron] as const];
          const barras = (F: readonly (readonly [string, number])[], color: string) => F.map(([l, k]) => ({ label: l, width: `${Math.min(100, Math.max(2, Math.round((k / (F[0]![1] || 1)) * 100)))}%`, color, value: String(k) }));
          return <>
            <A.HBars label={E("EMBUDO · VECINOS NUEVOS", "FUNNEL · NEW NEIGHBORS")} help={E(`${d.dias} días · cuentas nuevas · buscaron o abrieron una ficha, contactaron o pidieron, volvieron otro día`, `${d.dias} days · new accounts · searched or opened a page, contacted or ordered, came back another day`)} items={barras(FV, "var(--tl-action)")} />
            <A.HBars label={E("EMBUDO · PUBLICA TU NEGOCIO PASO A PASO", "FUNNEL · LIST YOUR BUSINESS STEP BY STEP")} help={E(`${d.dias} días · borradores que empezaron`, `${d.dias} days · drafts started`)} items={barras(FN, "var(--tl-ink)")} />
          </>; })() : null}
      </>);
  } else if (d.tab === "trust" && d.confianza) {
    const c = d.confianza, mx = Math.max(1, ...c.abiertas.map((x) => x.n));
    cuerpo = (
      <>
        <PanelBloques bloques={[periodo, kpis([
          { k: "SANCIONADOS", v: String(c.sancionados), s: "vecinos con sanción activa", onClick: () => router.push("/admin/usuarios?est=adv,mute,susp,ban") },
          { k: "SLA CUMPLIDO", v: pct(c.cumplido.a_tiempo, c.cumplido.total), s: `colas, últimos ${d.dias} días`, dark: true },
        ])]} />
        {c.abiertas.length ? <A.HBars label="COLAS ABIERTAS" help="SLA en horas" items={c.abiertas.map((x) => ({ label: x.es, width: `${Math.round((x.n / mx) * 100)}%`, color: "var(--tl-ink)", value: `${x.n} · ${x.sla} h` }))} />
          : <A.AdminNote tone="ok" icon="check">No hay casos abiertos en tus colas.</A.AdminNote>}
        {c.rep ? <PanelBloques bloques={[kpis([
          { k: E("REPORTES POR CADA 1,000 OPERACIONES", "REPORTS PER 1,000 TRANSACTIONS"), v: c.rep.operaciones ? (Math.round((10000 * c.rep.reportes) / c.rep.operaciones) / 10).toLocaleString("en-US") : "—", s: E(`${c.rep.reportes} reportes · ${c.rep.operaciones} operaciones`, `${c.rep.reportes} reports · ${c.rep.operaciones} transactions`) },
          { k: E("CASOS DE SOPORTE", "SUPPORT CASES"), v: String(c.rep.casos), s: E(`en ${d.dias} días · el detalle en El Compa y Soporte`, `in ${d.dias} days · details in El Compa and Support`), onClick: () => ir("cpa") },
        ])]} /> : null}
      </>);
  } else if (d.tab === "sp" && d.sp) {
    // Doctores y Profesionales: solo cifras (nunca motivos de consulta, notas ni seguros de nadie).
    const { sal, pro, rev, ayuda } = d.sp, min = (m: number | null) => (m == null ? "—" : m < 60 ? `${m} min` : `${Math.round(m / 60)} h`), mx = Math.max(1, ...ayuda.map((x) => x.n));
    cuerpo = (
      <>
        <PanelBloques bloques={[periodo, { type: "group", k: "DOCTORES" }, kpis([
          { k: "CITAS PEDIDAS", v: String(sal.n), s: `${sal.hechas} terminadas` },
          { k: "SEGURO ACEPTADO", v: pct(sal.segok, sal.conseg), s: `de ${sal.conseg} con seguro`, dark: true },
          { k: "«NO ACEPTAMOS SU SEGURO»", v: pct(sal.segno, sal.conseg), s: `${sal.segno} veces` },
          { k: "NO LLEGÓ", v: pct(sal.noshow, sal.hechas + sal.noshow), s: `${sal.noshow} citas` },
          { k: "RESPONDEN EN", v: min(sal.resp), s: "promedio, de pedir a la respuesta" },
        ]), { type: "group", k: "PROFESIONALES" }, kpis([
          { k: "CONSULTAS PEDIDAS", v: String(pro.n), s: `${pro.consultas} pasaron la consulta` },
          { k: "CONSULTA → CONTRATÓ", v: pct(pro.contrato, pro.consultas), s: `${pro.contrato} contrataron`, dark: true },
          { k: "CON TOTAL POR ESCRITO", v: String(pro.total), s: "consultas con total mandado" },
          { k: "«COBRÓ EL TOTAL QUE DIJO»", v: pct(rev.cobro, rev.base), s: `de ${rev.base} reseñas que contestaron` },
          { k: "RESPONDEN EN", v: min(pro.resp), s: "promedio, de pedir a la respuesta" },
        ])]} />
        {ayuda.length ? <A.HBars label="AYUDA · MOTIVOS" help={`${d.dias} días · Doctores y Profesionales`} items={ayuda.map((x) => ({ label: `${x.rub === "salud" ? "Doctores" : "Profesionales"} · ${motivoAyuda(x.reason, x.rub)[0]}`, width: `${Math.round((x.n / mx) * 100)}%`, color: "var(--tl-ink)", value: String(x.n) }))} />
          : <A.AdminNote tone="ok" icon="check">Nadie pidió ayuda con Doctores ni Profesionales en el período.</A.AdminNote>}
        <PanelBloques bloques={[{ type: "note", tone: "info", icon: "lock", t: "Solo cifras. Los motivos de consulta, las notas y los seguros de cada persona nunca salen en Analítica ni en un CSV." }]} />
      </>);
  } else if (d.tab === "mt" && d.mt) {
    // Mercados y Tiendas (4s): solo cifras.
    const { merc, tienda, rev, ayuda } = d.mt, min = (m: number | null) => (m == null ? "—" : m < 60 ? `${m} min` : `${Math.round(m / 60)} h`), mx = Math.max(1, ...ayuda.map((x) => x.n));
    const usd = (c: number) => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    cuerpo = (
      <>
        <PanelBloques bloques={[periodo, { type: "group", k: "MERCADOS" }, kpis([
          { k: "PEDIDOS", v: String(merc.n), s: `${merc.hechos} entregados o recogidos` },
          { k: "CON FOTO DE CADA PESO", v: pct(merc.confoto, merc.pesados), s: `de ${merc.pesados} pedidos con algo por peso`, dark: true },
          { k: "ESTIMADO → COBRADO", v: `${usd(merc.est)} → ${usd(merc.cob)}`, s: "pagados con tarjeta en la app" },
          { k: "SUSTITUCIONES ACEPTADAS", v: pct(merc.sustOk, merc.sustN), s: `${merc.sustN} propuestas` },
          { k: "NO ACEPTADOS O VENCIDOS", v: pct(merc.noacep, merc.n), s: `${merc.noacep} pedidos` },
          { k: "ACEPTAN EN", v: min(merc.resp), s: "promedio" },
          { k: "«COBRARON EL PESO REAL»", v: pct(rev.pes, rev.pbase), s: `de ${rev.pbase} reseñas` },
        ]), { type: "group", k: "TIENDAS" }, kpis([
          { k: "APARTADOS", v: String(tienda.n), s: `${tienda.envios} con envío` },
          { k: "RECOGIDOS", v: pct(tienda.recogidos, tienda.n), s: `${tienda.vencidos} vencieron`, dark: true },
          { k: "FALTÓ LA TALLA", v: pct(tienda.talla, tienda.n), s: `${tienda.talla} apartados` },
          { k: "PLANES", v: String(tienda.planes), s: `${tienda.pagados} terminados · ${tienda.cancelados} cancelados` },
          { k: "«PRECIO DE LA CAJA = PUBLICADO»", v: pct(rev.caja, rev.base), s: `de ${rev.base} reseñas` },
        ])]} />
        {ayuda.length ? <A.HBars label="AYUDA · MOTIVOS" help={`${d.dias} días · Mercados y Tiendas`} items={ayuda.map((x) => ({ label: `${x.rub === "merc" ? "Mercados" : "Tiendas"} · ${motivoAyuda(x.reason, x.rub)[0]}`, width: `${Math.round((x.n / mx) * 100)}%`, color: "var(--tl-ink)", value: String(x.n) }))} />
          : <A.AdminNote tone="ok" icon="check">Nadie pidió ayuda con Mercados ni Tiendas en el período.</A.AdminNote>}
      </>);
  } else if (d.tab === "ft" && d.ft) {
    // Fiestas y Transporte (4z-3): solo cifras.
    const { fi, dep, vi, sal, ayuda } = d.ft, mx = Math.max(1, ...ayuda.map((x) => x.n));
    const usd = (c: number) => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    cuerpo = (
      <>
        <PanelBloques bloques={[periodo, { type: "group", k: "FIESTAS" }, kpis([
          { k: "SOLICITUDES DE FECHA", v: String(fi.n), s: `${fi.hechas} fiestas hechas` },
          { k: "CONFIRMADAS EN 24 H", v: pct(fi.conf24, fi.n), s: `${fi.conf24} solicitudes`, dark: true },
          { k: "VENCIDAS SIN RESPUESTA", v: pct(fi.vencidas, fi.n), s: `${fi.vencidas} solicitudes` },
          { k: "FECHAS CANCELADAS POR EL NEGOCIO", v: String(fi.cxNeg), s: "con devolución completa" },
          { k: "DEPÓSITOS", v: usd(dep.cob), s: `retenido ${usd(dep.ret)} · devuelto ${usd(dep.dev)} · se quedó con el negocio ${usd(dep.quedo)}` },
        ]), { type: "group", k: "TRANSPORTE" }, kpis([
          { k: "VIAJES, ENVÍOS Y MUDANZAS", v: String(vi.n), s: `${vi.hechos} terminados` },
          { k: "SALIDAS A LA HORA", v: pct(sal.aTiempo, sal.salidas), s: `de ${sal.salidas} salidas (≤ 15 min)`, dark: true },
          { k: "OCUPACIÓN DE ASIENTOS", v: pct(sal.ocupados, sal.asientos), s: `${sal.ocupados} de ${sal.asientos}` },
          { k: "CANCELACIONES TARDÍAS", v: String(vi.mitad), s: "se cobró la mitad" },
          { k: "SALIDAS CANCELADAS", v: String(sal.canceladas), s: `${vi.cxSalida} pasajeros con devolución completa` },
          { k: "«COBRÓ MÁS» POR CADA 100", v: vi.hechos ? (Math.round((1000 * vi.cobroMas) / vi.hechos) / 10).toString() : "—", s: `${vi.cobroMas} ayudas` },
        ])]} />
        {ayuda.length ? <A.HBars label="AYUDA · MOTIVOS" help={`${d.dias} días · Fiestas y Transporte`} items={ayuda.map((x) => ({ label: `${x.rub === "fiesta" ? "Fiestas" : "Transporte"} · ${motivoAyuda(x.reason, x.rub)[0]}`, width: `${Math.round((x.n / mx) * 100)}%`, color: "var(--tl-ink)", value: String(x.n) }))} />
          : <A.AdminNote tone="ok" icon="check">Nadie pidió ayuda con Fiestas ni Transporte en el período.</A.AdminNote>}
      </>);
  } else if (d.tab === "no" && d.no) {
    // Noche (4ne): solo cifras.
    const { me, dep, li, cov, fila, ayuda, lic } = d.no, mx = Math.max(1, ...ayuda.map((x) => x.n));
    const usd = (c: number) => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const coverMas = ayuda.find((x) => x.reason === "cover")?.n ?? 0;
    cuerpo = (
      <>
        <PanelBloques bloques={[periodo, { type: "group", k: "MESAS Y VIP" }, kpis([
          { k: "SOLICITUDES DE MESA", v: String(me.n), s: "mesas y VIP pedidas" },
          { k: "CONFIRMADAS EN 60 MIN", v: pct(me.conf60, me.n), s: `${me.conf60} solicitudes`, dark: true },
          { k: "VENCIDAS SIN RESPUESTA", v: pct(me.vencidas, me.n), s: `${me.vencidas} solicitudes` },
          { k: "MESAS NO RESPETADAS", v: String(me.noResp), s: "canceló el local o el cliente pidió ayuda" },
          { k: "DEPÓSITOS", v: usd(dep.cob), s: `retenido ${usd(dep.ret)} · devuelto ${usd(dep.dev)} · se quedó con el local ${usd(dep.quedo)}` },
        ]), { type: "group", k: "LISTA, COVER Y FILA" }, kpis([
          { k: "DE LA LISTA ENTRÓ", v: pct(li.entro, li.cerradas), s: `${li.entro} de ${li.cerradas} noches cerradas · ${li.n} en la lista` , dark: true },
          { k: "EL COVER SUBIÓ DESPUÉS DE PUBLICADO", v: String(cov.sube), s: `veces · ${cov.locales} local${cov.locales === 1 ? "" : "es"}` },
          { k: "«LA FILA, COMO DECÍA»", v: pct(fila.ok, fila.n), s: `${fila.n} reseñas lo contestaron` },
          { k: "«COBRARON MÁS COVER» POR CADA 100", v: li.noches ? (Math.round((1000 * coverMas) / li.noches) / 10).toString() : "—", s: `${coverMas} ayudas · ${li.noches} noches` },
          { k: "LICENCIAS DE LICOR VENCIDAS", v: String(lic.vencidas), s: `de ${lic.total} en Licencias` },
        ])]} />
        {ayuda.length ? <A.HBars label="AYUDA · MOTIVOS" help={`${d.dias} días · Noche`} items={ayuda.map((x) => ({ label: motivoAyuda(x.reason, "noche")[0], width: `${Math.round((x.n / mx) * 100)}%`, color: "var(--tl-ink)", value: String(x.n) }))} />
          : <A.AdminNote tone="ok" icon="check">Nadie pidió ayuda con la noche en el período.</A.AdminNote>}
      </>);
  } else if (d.tab === "en" && d.en) {
    // Educación · Niños · Deporte (4eg): solo cifras; nunca datos de un niño ni de un inscrito.
    const { me, gr, mat, esp, baja, rev, ayuda, lic } = d.en, mx = Math.max(1, ...ayuda.map((x) => x.n));
    const usd = (c: number) => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const nAy = ayuda.reduce((a, x) => a + x.n, 0), RUB: Record<string, string> = { edu: "Educación", ninos: "Niños", dep: "Deporte" };
    cuerpo = (
      <>
        <PanelBloques bloques={[periodo, { type: "group", k: "INSCRIPCIONES" }, kpis([
          { k: "INSCRIPCIONES PEDIDAS", v: String(me.n), s: `Educación ${me.edu} · Niños ${me.ninos} · Deporte ${me.dep}` },
          { k: "CONFIRMADAS EN 24 H", v: pct(me.conf24, me.n), s: `${me.conf24} inscripciones`, dark: true },
          { k: "VENCIDAS SIN RESPUESTA", v: pct(me.vencidas, me.n), s: `${me.vencidas} inscripciones` },
          { k: "GRUPOS QUE NO ABRIERON", v: String(gr.cancelados), s: "cancelados con devolución a todos" },
          { k: "OCUPACIÓN DE GRUPOS", v: pct(gr.ocupados, gr.cupos), s: `${gr.ocupados} de ${gr.cupos} cupos · ${gr.vivos} grupos` },
        ]), { type: "group", k: "MATRÍCULAS, LISTA Y MEMBRESÍAS" }, kpis([
          { k: "MATRÍCULAS COBRADAS", v: usd(mat.cob), s: `retenido ${usd(mat.ret)} · devuelto ${usd(mat.dev)} · se quedó con el lugar ${usd(mat.quedo)}`, dark: true },
          { k: "EN LISTA DE ESPERA", v: String(esp.esperando), s: `${esp.dias ?? "—"} días en promedio · ${esp.tomadas} de ${esp.ofrecidas} ofertas tomadas` },
          { k: "BAJAS DE MEMBRESÍA", v: String(baja.pedidas), s: `${baja.en72} confirmadas en 72 h` },
          { k: "«COBRARON EL TOTAL»", v: pct(rev.tok, rev.tn), s: `${rev.tn} reseñas lo contestaron` },
          { k: "«CERTIFICADO PROMETIDO»", v: pct(rev.cok, rev.cn), s: `${rev.cn} reseñas lo contestaron` },
        ]), { type: "group", k: "AYUDA Y LICENCIAS" }, kpis([
          { k: "AYUDAS POR CADA 100", v: me.n ? (Math.round((1000 * nAy) / me.n) / 10).toString() : "—", s: `${nAy} ayudas · ${me.n} inscripciones` },
          { k: "GUARDERÍAS CON LICENCIA VIGENTE", v: String(lic.vigentes), s: `de ${lic.cuidado} lugares de Niños · ${lic.vencidas} vencidas` },
        ])]} />
        {ayuda.length ? <A.HBars label="AYUDA · MOTIVOS" help={`${d.dias} días · Educación, Niños y Deporte`} items={ayuda.map((x) => ({ label: `${RUB[x.rub] ?? x.rub} · ${motivoAyuda(x.reason, x.rub)[0]}`, width: `${Math.round((x.n / mx) * 100)}%`, color: "var(--tl-ink)", value: String(x.n) }))} />
          : <A.AdminNote tone="ok" icon="check">Nadie pidió ayuda con una inscripción en el período.</A.AdminNote>}
      </>);
  } else if (d.tab === "ia" && d.ia) {
    // Iglesias · Bienes Raíces · Autos (4ig): solo cifras por ciudad; nunca personas por religión ni datos de crédito.
    const { inm, dealer, dias: dd, vivos, rev, ayuda, estafa, lic, fe, vj } = d.ia, mx = Math.max(1, ...ayuda.map((x) => x.n));
    const visitas = inm.n + dealer.n, nAyV = ayuda.filter((x) => x.rub !== "fe").reduce((a, x) => a + x.n, 0), nAyF = ayuda.filter((x) => x.rub === "fe").reduce((a, x) => a + x.n, 0);
    const por = (a: number, b: number) => (b ? (Math.round((10 * a) / b) / 10).toString() : "—");
    const DIAS = (k: string) => dd.find((x) => x.que === k), RUB: Record<string, string> = { inm: "Bienes Raíces", dealer: "Autos", fe: "Iglesias" };
    const LC = (k: string) => lic.find((x) => x.cat === k) ?? { vigentes: 0, porvencer: 0, vencidas: 0, revision: 0 }, li = ["NEG-FE", "NEG-INMUEBLE", "NEG-DEALER"].map(LC);
    const tot = (f: "vigentes" | "porvencer" | "vencidas" | "revision") => li.reduce((a, x) => a + x[f], 0);
    const dTxt = (k: string) => { const x = DIAS(k); return x && x.n ? `${x.dias ?? "—"} días` : "—"; };
    cuerpo = (
      <>
        <PanelBloques bloques={[periodo, { type: "group", k: "VISITAS Y PRUEBAS DE MANEJO" }, kpis([
          { k: "SOLICITUDES DE VISITA", v: String(inm.n), s: `${por(inm.n, inm.items)} por propiedad · ${inm.items} propiedades` },
          { k: "PRUEBAS DE MANEJO Y CITAS", v: String(dealer.n), s: `${por(dealer.n, dealer.items)} por carro · ${dealer.items} carros` },
          { k: "CONFIRMADAS A TIEMPO", v: pct(inm.atiempo + dealer.atiempo, visitas), s: `${inm.atiempo + dealer.atiempo} de ${visitas} · antes de que venciera su plazo`, dark: true },
          { k: "VENCIDAS SIN RESPUESTA", v: pct(inm.vencidas + dealer.vencidas, visitas), s: `${inm.vencidas + dealer.vencidas} solicitudes` },
          { k: "PLANTONES («NO VINO»)", v: String(inm.noshow + dealer.noshow), s: `de ${inm.pasaron + dealer.pasaron + inm.noshow + dealer.noshow} visitas y pruebas que ya pasaron` },
        ]), { type: "group", k: "RENTAR, VENDER Y LO QUE SE VE" }, kpis([
          { k: "DÍAS HASTA RENTAR", v: dTxt("rented"), s: `${DIAS("rented")?.n ?? 0} rentada${DIAS("rented")?.n === 1 ? "" : "s"} en el período` },
          { k: "DÍAS HASTA VENDER UNA CASA", v: dTxt("sold"), s: `${DIAS("sold")?.n ?? 0} vendida${DIAS("sold")?.n === 1 ? "" : "s"} en el período` },
          { k: "DÍAS HASTA VENDER UN CARRO", v: dTxt("carro"), s: `${DIAS("carro")?.n ?? 0} vendido${DIAS("carro")?.n === 1 ? "" : "s"} en el período` },
          { k: "«EL TOTAL FUE EL QUE VI»", v: pct(rev.mok + rev.pok, rev.mn + rev.pn), s: `Para mudarte ${pct(rev.mok, rev.mn)} · En la puerta ${pct(rev.pok, rev.pn)} · ${rev.mn + rev.pn} reseñas`, dark: true },
        ]), { type: "rows", k: "A LA VISTA HOY POR CIUDAD", items: vivos.map((x) => ({ icon: "pin", t: x.ciudad, s: `${x.props} propiedad${x.props === 1 ? "" : "es"} · ${x.carros} carro${x.carros === 1 ? "" : "s"}` })) },
        { type: "group", k: "AYUDA, ESTAFAS Y VIVIENDA JUSTA" }, kpis([
          { k: "AYUDAS POR CADA 100 VISITAS", v: visitas ? (Math.round((1000 * nAyV) / visitas) / 10).toString() : "—", s: `${nAyV} ayudas · ${visitas} visitas y pruebas` },
          { k: "ANUNCIOS PAUSADOS POR ESTAFA", v: String(estafa.periodo), s: `${estafa.hoy} en pausa hoy · ${estafa.sancion} sancionados` },
          { k: "TEXTOS FRENADOS", v: String(vj.frenadas), s: "por la lista de vivienda justa · nada se publicó" },
          { k: "MAYORES DE 62 POR REVISAR", v: String(vj.mayores), s: "declaraciones en Colas › Vivienda justa" },
        ]), { type: "group", k: "IGLESIAS" }, kpis([
          { k: "FECHAS Y CATECISMO PEDIDOS", v: String(fe.n), s: `${fe.vencidas} vencidas sin respuesta` },
          { k: "RESPONDIDAS EN 48 H", v: pct(fe.en48, fe.n), s: `${fe.en48} solicitudes` },
          { k: "AYUDAS CON UNA FECHA", v: String(nAyF), s: "nada se cobra en la app" },
        ]), { type: "group", k: "LICENCIAS" }, kpis([
          { k: "LICENCIAS VIGENTES", v: String(tot("vigentes")), s: `Iglesias ${li[0]!.vigentes} · Bienes Raíces ${li[1]!.vigentes} · Autos ${li[2]!.vigentes}`, dark: true },
          { k: "POR VENCER EN 14 DÍAS", v: String(tot("porvencer")), s: "vuelven a Colas › Licencias" },
          { k: "VENCIDAS", v: String(tot("vencidas")), s: "vuelven a Colas › Licencias con prioridad" },
          { k: "EN REVISIÓN", v: String(tot("revision")), s: "nuevas o cambiadas" },
        ])]} />
        {ayuda.length ? <A.HBars label="AYUDA · MOTIVOS" help={`${d.dias} días · Iglesias, Bienes Raíces y Autos`} items={ayuda.map((x) => ({ label: `${RUB[x.rub] ?? x.rub} · ${motivoAyuda(x.reason, x.rub)[0]}`, width: `${Math.round((x.n / mx) * 100)}%`, color: "var(--tl-ink)", value: String(x.n) }))} />
          : <A.AdminNote tone="ok" icon="check">Nadie pidió ayuda con una visita o una fecha en el período.</A.AdminNote>}
      </>);
  } else if (d.tab === "com" && d.com) {
    // 5i · Comunidad: por ciudad, sin personas (solo las vistas de 0105 y cuántos por rango).
    const { t, ciudades, rangos, negocios } = d.com, mxR = Math.max(1, ...rangos.map((x) => x.activos)), mxN = Math.max(1, ...negocios.map((x) => x.canjes));
    const min = t.con_respuesta ? Math.round(t.min_primera / t.con_respuesta) : null;
    const tiempo = min == null ? "—" : min < 60 ? `${min} min` : min < 2880 ? `${Math.round(min / 6) / 10} h` : `${Math.round(min / 144) / 10} días`;
    cuerpo = (
      <>
        <PanelBloques bloques={[periodo, { type: "group", k: "CONVERSACIÓN" }, kpis([
          { k: "PUBLICACIONES", v: t.publicaciones.toLocaleString("en-US"), s: `${t.preguntas} preguntas` },
          { k: "COMENTARIOS", v: t.comentarios.toLocaleString("en-US"), s: t.publicaciones ? `${Math.round((10 * t.comentarios) / t.publicaciones) / 10} por publicación` : "—" },
          { k: "PREGUNTAS RESUELTAS", v: pct(t.resueltas, t.preguntas), s: `${t.resueltas} de ${t.preguntas} · con «Me sirvió»`, dark: true },
          { k: "TIEMPO A LA PRIMERA RESPUESTA", v: tiempo, s: `promedio de ${t.con_respuesta} preguntas respondidas` },
        ]), { type: "group", k: "MODERACIÓN" }, kpis([
          { k: "REPORTES POR CADA 1,000 PUBLICACIONES", v: t.publicaciones ? (Math.round((10000 * t.reportes) / t.publicaciones) / 10).toString() : "—", s: `${t.reportes} reportes de publicaciones y comentarios` },
          { k: "APELACIONES LEVANTADAS", v: String(t.levantadas), s: `${pct(t.levantadas, t.decididas)} de ${t.decididas} decididas` },
        ]), { type: "group", k: "MONEDAS Y CUPONES · SIN VALOR EN DINERO" }, kpis([
          { k: "MONEDAS EMITIDAS", v: t.emitidas.toLocaleString("en-US"), s: "bienvenida y premios del mes" },
          { k: "MONEDAS CANJEADAS", v: t.canjeadas.toLocaleString("en-US"), s: `${t.devueltas.toLocaleString("en-US")} devueltas por códigos vencidos` },
          { k: "CANJES", v: String(t.canjes), s: `${t.usados} usados en el negocio` },
        ]),
        { type: "rows", k: "VECINOS ACTIVOS POR RANGO · PUBLICARON, COMENTARON O VOTARON", items: rangos.length ? rangos.map((x) => ({ key: String(x.rango), icon: "shield", t: `${x.rango} · ${x.nombre ?? ""}`, r: String(x.activos), s: "▮".repeat(Math.max(1, Math.round((12 * x.activos) / mxR))) })) : [{ key: "0", icon: "shield", t: "Nadie activo en el período" }] },
        { type: "rows", k: "POR CIUDAD", items: ciudades.map((x) => ({ key: x.ciudad, icon: "pin", t: x.ciudad, s: `${x.publicaciones} publicaciones · ${x.comentarios} comentarios · ${pct(x.resueltas, x.preguntas)} resueltas · ${x.reportes} reportes` })) },
        { type: "rows", k: "CANJES POR NEGOCIO", items: negocios.length ? negocios.map((x) => ({ key: x.negocio + x.ciudad, icon: "ticket", t: `${x.negocio} · ${x.ciudad}`, r: String(x.canjes), s: `${x.usados} usados · ${x.monedas.toLocaleString("en-US")} monedas · ${"▮".repeat(Math.max(1, Math.round((12 * x.canjes) / mxN)))}` })) : [{ key: "0", icon: "ticket", t: "Sin canjes en el período" }] },
        { type: "note", tone: "info", icon: "lock", t: "Solo cifras por ciudad y día: nunca quién publicó, votó o canjeó." },
        ]} />
      </>);
  } else if (d.tab === "evt" && d.evt) {
    // 6j · Eventos: por ciudad, formato y día, sin personas (solo las vistas de 0115; los organizadores son negocios).
    const { t, formatos, ciudades, asistencia: a, negocios, evp } = d.evt, usd = (c: number) => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const noVinieron = Math.max(0, a.esperados - a.entraron), mxF = Math.max(1, ...formatos.map((x) => x.ordenes + x.rsvp));
    // Una conversión «de las vistas» solo si tiene sentido (las vistas se cuentan desde que existe la ficha; lo de antes no tiene vista).
    const deVistas = (x: number) => (t.vistas && x <= t.vistas ? ` · ${pct(x, t.vistas)} de las vistas` : "");
    cuerpo = (
      <>
        <PanelBloques bloques={[periodo, { type: "group", k: "DE VER A IR" }, kpis([
          { k: "VISTAS DE EVENTOS", v: t.vistas.toLocaleString("en-US"), s: `${t.guardados} guardados${t.guardados <= t.vistas ? ` · ${pct(t.guardados, t.vistas)}` : ""}` },
          { k: "RSVP", v: String(t.rsvp), s: `${t.rsvp_personas} personas${deVistas(t.rsvp)}` },
          { k: "ÓRDENES DE BOLETOS", v: String(t.ordenes), s: `${t.boletos} boletos · ${t.cortesias} cortesías${deVistas(t.ordenes)}`, dark: true },
          { k: "LISTA DE ESPERA", v: String(t.espera), s: `${t.espera_convertidos} compraron · ${pct(t.espera_convertidos, t.espera)}` },
        ]), { type: "group", k: "DINERO DE BOLETOS" }, kpis([
          { k: "BRUTO", v: usd(t.bruto), s: "cobrado (boletos, mesa y extras; cargos incluidos)" },
          { k: "COMISIÓN", v: usd(t.comision), s: "regla «bol» de Planes" },
          { k: "DEVUELTO", v: usd(t.devuelto), s: `${pct(t.devuelto, t.bruto)} del bruto` },
        ]), { type: "group", k: "EN LA PUERTA · FECHAS QUE YA PASARON" }, kpis([
          { k: "ASISTENCIA", v: pct(a.entraron, a.esperados), s: `${a.entraron} de ${a.esperados} con boleto · ${a.fechas} fechas`, dark: true },
          { k: "NO VINIERON", v: String(noVinieron), s: `${pct(noVinieron, a.esperados)} de los que tenían boleto` },
          { k: "RSVP QUE LLEGARON", v: pct(a.rsvp_llegaron, a.rsvp_van), s: `${a.rsvp_llegaron} de ${a.rsvp_van} personas` },
          { k: "INCIDENCIAS POR CADA 1,000 ENTRADAS", v: a.entraron ? (Math.round((10000 * a.incidencias) / a.entraron) / 10).toLocaleString("en-US") : "—", s: `${a.incidencias} incidencias en la puerta de esas fechas` },
        ]), { type: "group", k: "EVENTO PRIVADO" }, kpis([
          { k: "PEDIDAS", v: String(evp.pedidas), s: `${evp.con_propuesta} con propuesta · ${evp.sin_respuesta} sin respuesta` },
          { k: "ACEPTADAS", v: String(evp.aceptadas), s: `${pct(evp.aceptadas, evp.pedidas)} de las pedidas` },
          { k: "DEPÓSITOS", v: usd(evp.deposito), s: "cobrado al aceptar" },
          { k: "CANCELADAS", v: String(evp.a_tiempo + evp.tarde + evp.negocio), s: `${evp.a_tiempo} a tiempo · ${evp.tarde} tarde · ${evp.negocio} el restaurante` },
        ]),
        { type: "rows", k: "POR FORMATO", items: formatos.map((x) => ({ key: x.formato, icon: "ticket", t: x.label, r: String(x.ordenes + x.rsvp),
          s: `${x.vistas} vistas · ${x.rsvp} RSVP · ${x.ordenes} órdenes · ${usd(x.bruto)} · ${"▮".repeat(Math.max(1, Math.round((12 * (x.ordenes + x.rsvp)) / mxF)))}` })) },
        { type: "rows", k: "POR CIUDAD", items: ciudades.map((x) => ({ key: x.ciudad, icon: "pin", t: x.ciudad, s: `${x.vistas} vistas · ${x.rsvp} RSVP · ${x.ordenes} órdenes · ${usd(x.bruto)} · devuelto ${usd(x.devuelto)}` })) },
        { type: "rows", k: "POR ORGANIZADOR", items: negocios.length ? negocios.map((x) => ({ key: x.negocio + x.ciudad, icon: "store", t: `${x.negocio} · ${x.ciudad}`, r: usd(x.bruto), s: `${x.ordenes} órdenes · comisión ${usd(x.comision)} · devuelto ${usd(x.devuelto)}` })) : [{ key: "0", icon: "store", t: "Sin ventas en el período" }] },
        { type: "note", tone: "info", icon: "lock", t: "Solo cifras por ciudad, formato y día: nunca quién compró, fue o entró." },
        ]} />
      </>);
  } else if (d.tab === "cpa" && d.cpa) {
    // 7i · El Compa y Soporte: por ciudad, día, nivel, canal y tema, sin personas (solo las vistas de 0124; nada lleva a una persona).
    const { t, motivos: m, usos, canales, ciudades, sop: k, temas } = d.cpa, usd = (micro: number) => `$${(micro / 1e6).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const USO: Record<string, string> = { neighbor: "Vecinos", owner: "Panel del negocio", auto_reply: "Respuestas automáticas", copilot: "Copiloto del equipo" };
    const CANAL: Record<string, string> = { app: "Chat de To'Latino", whatsapp: "WhatsApp", sms: "SMS" };
    const TEMA: Record<string, string> = { pedido: "Pedido", cita: "Cita", pago: "Pago", negocio: "Negocio", cuenta: "Cuenta", tecnico: "Técnico", sugerencia: "Sugerencia", seguridad: "Seguridad" };
    const seg = (x: number | null) => (x == null ? "—" : x < 3600 ? `${Math.max(1, Math.round(x / 60))} min` : `${(x / 3600).toFixed(1)} h`);
    const solo = t.resolvio_solo + t.accion, mxM = Math.max(1, m.dinero, m.cuenta, m.seguridad, m.pidio, m.no_supo, m.dueno);
    cuerpo = (
      <>
        <PanelBloques bloques={[periodo, { type: "group", k: "EL COMPA" }, kpis([
          { k: "CONVERSACIONES", v: t.conversaciones.toLocaleString("en-US"), s: `${t.con_ia} respuestas con IA · ${t.sin_ia} con reglas fijas`, dark: true },
          { k: "RESOLVIÓ SOLO", v: pct(solo, t.conversaciones), s: `${t.accion} acciones confirmadas` },
          { k: "A UNA PERSONA", v: String(t.a_persona + t.al_dueno), s: `${pct(t.a_persona + t.al_dueno, t.conversaciones)} · ${t.al_dueno} al dueño` },
          { k: "GASTO DE IA", v: usd(t.gasto), s: `${t.al_tope} al tope · ${t.apagado} apagado · ${t.limite} por límite` },
        ]), kpis([
          { k: "ESPERA DE LA IA", v: t.esperas ? `${(t.espera_suma / t.esperas / 1000).toFixed(1)} s` : "—", s: `promedio · p95 del peor día ${t.p95_max != null ? `${(t.p95_max / 1000).toFixed(1)} s` : "—"}` },
          { k: "A REGLAS", v: String(t.a_reglas), s: "lenta, error, rechazo o salida que no pasó el verificador" },
          { k: "NO SUPO", v: String(t.no_supo), s: "conversaciones con «No tengo ese dato»" },
          { k: "MARCADAS", v: String(t.marcadas), s: "respuesta incorrecta según el equipo" },
        ])]} />
        <A.HBars label="POR QUÉ PASÓ A UNA PERSONA" items={([["Dinero", m.dinero], ["Su cuenta", m.cuenta], ["Seguridad", m.seguridad], ["Pidió una persona", m.pidio], ["No supo", m.no_supo], ["Al dueño del negocio", m.dueno]] as const)
          .map(([l, n]) => ({ label: l, width: `${Math.max(2, Math.round((n / mxM) * 100))}%`, color: l === "No supo" ? "var(--tl-pro)" : "var(--tl-ink)", value: String(n) }))} />
        <PanelBloques bloques={[
          { type: "rows", k: "DÓNDE CONTESTA", items: usos.length ? usos.map((x) => ({ key: x.uso, icon: "chat", t: USO[x.uso] ?? x.uso, r: String(x.conversaciones),
            s: `resolvió solo ${pct(x.resolvio_solo + x.accion, x.conversaciones)} · a una persona ${x.a_persona + x.al_dueno} · sin IA ${x.sin_ia} · ${usd(x.gasto)}` })) : [{ key: "0", icon: "chat", t: "Sin conversaciones en el período" }] },
          { type: "rows", k: "POR DÓNDE ESCRIBEN", items: canales.length ? canales.map((x) => ({ key: x.canal, icon: x.canal === "app" ? "chat" : "phone", t: CANAL[x.canal] ?? x.canal, r: String(x.conversaciones),
            s: `${x.con_ia} con IA · ${usd(x.gasto)}` })) : [{ key: "0", icon: "chat", t: "Sin conversaciones en el período" }] },
          { type: "group", k: "SOPORTE" },
          kpis([
            { k: "CASOS", v: String(k.casos), s: `${k.desde_compa} desde El Compa · ${k.de_negocios} de negocios · ${k.alta} prioridad alta`, dark: true },
            { k: "PLAZO CUMPLIDO", v: pct(k.plazo_cumplido, k.con_respuesta), s: `${k.plazo_vencido} fuera de plazo (horas hábiles del equipo)` },
            { k: "1.ª RESPUESTA", v: seg(k.con_respuesta ? k.primera_suma / k.con_respuesta : null), s: `promedio · p90 del peor día ${seg(k.primera_p90_max)}` },
            { k: "¿SE RESOLVIÓ?", v: pct(k.csat_si, k.csat_si + k.csat_no), s: `${k.csat_si} sí · ${k.csat_no} no · ${k.resueltos} resueltos` },
          ]),
          { type: "rows", k: "POR TEMA", items: temas.length ? temas.map((x) => ({ key: x.tema, icon: "help", t: TEMA[x.tema] ?? x.tema, r: String(x.casos),
            s: `plazo cumplido ${pct(x.plazo_cumplido, x.con_respuesta)} · 1.ª respuesta ${seg(x.con_respuesta ? x.primera_suma / x.con_respuesta : null)} · ¿se resolvió? ${pct(x.csat_si, x.csat_si + x.csat_no)}${x.devuelto ? ` · devuelto $${(x.devuelto / 100).toFixed(2)}` : ""}` }))
            : [{ key: "0", icon: "help", t: "Sin casos en el período" }] },
          { type: "rows", k: "POR CIUDAD", items: ciudades.map((x) => ({ key: x.ciudad, icon: "pin", t: x.ciudad,
            s: `El Compa: ${x.conversaciones} conversaciones · resolvió solo ${pct(x.resolvio_solo + x.accion, x.conversaciones)} · ${usd(x.gasto)} · Soporte: ${x.casos} casos · plazo cumplido ${pct(x.plazo_cumplido, x.con_respuesta)}` })) },
          { type: "note", tone: "info", icon: "lock", t: "Solo cifras por ciudad, día, nivel, canal y tema: nunca quién habló con El Compa ni quién abrió un caso." },
        ]} />
      </>);
  } else if (d.tab === "apps" && d.apps) {
    // 8i · Las cuatro apps por app y plataforma, sin personas (sesiones, eventos y errores contados).
    const X = d.apps, APPN: Record<string, string> = { cliente: "To'Latino", negocio: "Negocios", delivery: "Repartidor", checkin: "Puerta" }, PL: Record<string, string> = { ios: "iPhone", android: "Android" };
    const nom = (a: string, p: string) => `${APPN[a] ?? a} · ${PL[p] ?? p}`, suma = (k: "n7" | "n30") => X.instalaciones.reduce((a, x) => a + x[k], 0);
    const vacio = (t: string) => [{ key: "0", icon: "phone", t }];
    cuerpo = (
      <PanelBloques bloques={[periodo, kpis([
        { k: "INSTALACIONES ACTIVAS · 7 D", v: String(suma("n7")), s: "teléfonos con una sesión de las apps", dark: true },
        { k: "INSTALACIONES ACTIVAS · 30 D", v: String(suma("n30")) },
        { k: "AVISOS ACEPTADOS", v: String(X.avisos.reduce((a, x) => a + x.vivos, 0)), s: `${X.avisos.reduce((a, x) => a + x.negados, 0)} negados · ${X.avisos.reduce((a, x) => a + x.ahora_no, 0)} «ahora no» en el período` },
        { k: "ERRORES POR SESIÓN", v: (() => { const e = X.errores.reduce((a, x) => a + x.errores, 0), n = X.errores.reduce((a, x) => a + x.sesiones, 0); return n ? (e / n).toFixed(2) : "—"; })(), s: "errores ÷ sesiones del período" },
      ]),
        { type: "rows", k: "INSTALACIONES ACTIVAS POR APP Y PLATAFORMA", items: X.instalaciones.length ? X.instalaciones.map((x) => ({ key: `${x.app}-${x.plat}`, icon: "phone", t: nom(x.app, x.plat), r: String(x.n7), s: `${x.n7} en 7 días · ${x.n30} en 30 días` })) : vacio("Todavía no hay sesiones de las apps") },
        { type: "rows", k: "VERSIONES EN USO", items: X.versiones.length ? X.versiones.map((x) => ({ key: `${x.app}-${x.plat}-${x.version}`, icon: "phone", t: `${nom(x.app, x.plat)} · ${x.version ?? "sin versión"}`, r: String(x.n), s: `${x.n} ${x.n === 1 ? "sesión" : "sesiones"} en el período` })) : vacio("Sin sesiones en el período") },
        { type: "rows", k: "AVISOS: ACEPTADOS Y NEGADOS", items: X.avisos.length ? X.avisos.map((x) => ({ key: `${x.app}-${x.plat}`, icon: "bell", t: nom(x.app, x.plat), r: pct(x.vivos, x.vivos + x.negados), s: `${x.vivos} teléfonos con avisos · ${x.negados} negados · ${x.ahora_no} «ahora no»` })) : vacio("Sin respuestas a los avisos todavía") },
        { type: "rows", k: "ERRORES POR SESIÓN", items: X.errores.length ? X.errores.map((x) => ({ key: `${x.app}-${x.plat}`, icon: "warning", t: nom(x.app, x.plat), r: x.sesiones ? (x.errores / x.sesiones).toFixed(2) : "—", s: `${x.errores} errores · ${x.sesiones} sesiones en el período` })) : vacio("Sin errores ni sesiones en el período") },
        { type: "rows", k: "APERTURAS DE LA APP", items: X.aperturas.length ? X.aperturas.map((x) => ({ key: `${x.app}-${x.plat}`, icon: "phone", t: nom(x.app, x.plat), r: String(x.n), s: "veces que la app abrió su entrada" })) : vacio("Sin aperturas en el período") },
        { type: "note", tone: "info", icon: "info", t: "Enlaces que abren la app o la web: llegan con los enlaces universales (8b, espera el dominio con HTTPS)." },
        { type: "note", tone: "info", icon: "lock", t: "Solo cifras por app, plataforma y versión: nunca quién usa qué app." },
      ]} />);
  } else if (d.tab === "nosup" && d.nosup) {
    const L = d.nosup;
    cuerpo = (
      <>
        {L.length ? <A.HBars label="BUSCARON Y NO HABÍA · 30 DÍAS" help="pidieron aviso" items={L.slice(0, 10).map((x) => ({ label: x.q, width: `${Math.round((x.n / (L[0]!.n || 1)) * 100)}%`, color: "var(--tl-ink)", value: String(x.n) }))} />
          : <PanelBloques bloques={[{ type: "empty", icon: "search", t: "Nadie ha pedido aviso todavía", s: "Cuando un vecino busca algo que no hay y toca «Avísame cuando haya», sale aquí." }]} />}
        <PanelBloques bloques={[{ type: "acts", items: [{ l: "Abrir en Catálogo", icon: "grid", onClick: () => router.push("/admin/catalogo?tab=nosup") }] }]} />
        {/* 9g · Lo que se buscó y no encontró nada (search_logs): solo lo que buscaron 2 o más personas. */}
        {d.sinRes?.length ? <A.HBars label={E("BUSCARON Y NO HUBO RESULTADOS · 30 DÍAS", "SEARCHED WITH NO RESULTS · 30 DAYS")} help={E("personas distintas · solo lo que buscaron 2 o más", "distinct people · only what 2 or more searched")}
          items={d.sinRes.slice(0, 15).map((x) => ({ label: x.q, width: `${Math.round((x.personas / (d.sinRes![0]!.personas || 1)) * 100)}%`, color: "var(--tl-pro)", value: `${x.personas} · ${x.n}` }))} />
          : <PanelBloques bloques={[{ type: "empty", icon: "search", t: E("Ninguna búsqueda sin resultado", "No searches without results"), s: E("Cuando dos o más vecinos busquen algo y no salga nada, aparece aquí.", "When two or more neighbors search for something and nothing comes up, it shows here.") }]} />}
      </>);
  } else if (d.tab === "dinero" && d.dinero) {
    // 9g · Dinero (prototipo secAnalit «money»): de metricas_dinero_dia y metricas_pro_dia, que llena el barrido. Solo cifras.
    const D = d.dinero, usd = (c: number) => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const tot = (k: "bruto" | "comision" | "operaciones" | "devoluciones" | "devuelto" | "cerradas" | "no_llegaron") => D.tipos.reduce((a, x) => a + x[k], 0);
    const delta = (a: number, b: number) => (b ? `${a >= b ? "+" : ""}${Math.round(((a - b) / b) * 100)} % ${E("contra el período anterior", "vs. the previous period")}` : E("sin período anterior", "no previous period"));
    const TIPO: Record<string, [string, string]> = { order: ["Pedido", "Order"], market_order: ["Mercado", "Market order"], hold: ["Apartado", "Hold"], appointment: ["Cita", "Booking"], quote: ["Presupuesto", "Quote"],
      party: ["Fiesta", "Party"], private_event: ["Evento privado", "Private event"], table: ["Mesa", "Table"], night: ["Noche", "Night"], trip: ["Viaje", "Trip"], enrollment: ["Inscripción", "Enrollment"],
      visit: ["Visita", "Visit"], tickets: ["Boletos", "Tickets"], rental: ["Renta", "Rental"], plan: ["Plan", "Plan"] };
    const nom = (k: string) => (TIPO[k] ? E(TIPO[k]![0], TIPO[k]![1]) : k);
    const ticket = D.tipos.filter((x) => x.operaciones).map((x) => ({ k: x.tipo, v: x.bruto / x.operaciones })), mxT = Math.max(1, ...ticket.map((x) => x.v));
    const mxS = Math.max(1, ...D.semanas.map((x) => x.neto)), ESTADO: Record<string, [string, string]> = { captured: ["Cobrado", "Charged"], held: ["Retenido", "Held"], released: ["Liberado", "Released"],
      refunded: ["Devuelto", "Refunded"], partially_refunded: ["Devuelto en parte", "Partly refunded"], failed: ["Falló", "Failed"] };
    const mxE = Math.max(1, ...D.estados.map((x) => x.monto + x.devuelto));
    const FP = [[E("Prueba Pro", "Pro trial"), D.pro.iniciadas], [E("Dejaron tarjeta", "Left card"), D.pro.con_tarjeta], [E("Primer cobro", "First charge"), D.pro.primeros]] as const;
    cuerpo = (
      <>
        <PanelBloques bloques={[periodo, kpis([
          { k: E("VENDIDO EN LÍNEA", "SOLD ONLINE"), v: usd(tot("bruto")), s: delta(tot("bruto"), D.antes.bruto), dark: true },
          { k: E("COMISIÓN", "COMMISSION"), v: usd(tot("comision")), s: delta(tot("comision"), D.antes.comision) },
          { k: E("OPERACIONES COBRADAS", "PAID TRANSACTIONS"), v: String(tot("operaciones")), s: delta(tot("operaciones"), D.antes.operaciones) },
          { k: E("DEVOLUCIONES", "REFUNDS"), v: pct(tot("devoluciones"), tot("operaciones")), s: E(`${tot("devoluciones")} · ${usd(tot("devuelto"))} devuelto`, `${tot("devoluciones")} · ${usd(tot("devuelto"))} refunded`) },
          { k: E("TICKET PROMEDIO", "AVERAGE TICKET"), v: tot("operaciones") ? usd(tot("bruto") / tot("operaciones")) : "—", s: E("de lo cobrado", "of what was charged") },
          { k: E("NO LLEGARON", "NO-SHOWS"), v: pct(tot("no_llegaron"), tot("cerradas")), s: E(`${tot("no_llegaron")} de ${tot("cerradas")} citas, mesas y visitas`, `${tot("no_llegaron")} of ${tot("cerradas")} bookings, tables and visits`) },
        ]), { type: "chart", k: E("VENDIDO POR SEMANA · 8 SEMANAS", "SOLD PER WEEK · 8 WEEKS"), v: usd(D.semanas.reduce((a, x) => a + x.neto, 0)),
          bars: D.semanas.map((x, i) => ({ h: `${Math.max(4, Math.round((x.neto / mxS) * 100))}%`, on: i === D.semanas.length - 1, l: x.semana.slice(5) })),
          s: E("Solo lo cobrado, menos lo devuelto. La última barra es la semana en curso.", "Charged only, minus refunds. The last bar is the current week.") }]} />
        {ticket.length ? <A.HBars label={E("TICKET PROMEDIO POR TIPO", "AVERAGE TICKET BY TYPE")} items={ticket.map((x) => ({ label: nom(x.k), width: `${Math.max(2, Math.round((x.v / mxT) * 100))}%`, color: "var(--tl-ink)", value: usd(x.v) }))} />
          : <PanelBloques bloques={[{ type: "empty", icon: "card", t: E("Todavía no hay cobros en el período", "No charges in the period yet"), s: E("Cuando se cobre un pedido, una cita o boletos, sale aquí.", "When an order, booking or tickets are charged, it shows here.") }]} />}
        <PanelBloques bloques={[{ type: "rows", k: E("POR TIPO DE OPERACIÓN", "BY TRANSACTION TYPE"), items: D.tipos.length ? D.tipos.map((x) => ({ key: x.tipo, icon: "card", t: nom(x.tipo), r: usd(x.bruto),
            s: E(`${x.operaciones} cobradas · comisión ${usd(x.comision)} · devuelto ${usd(x.devuelto)}`, `${x.operaciones} paid · commission ${usd(x.comision)} · refunded ${usd(x.devuelto)}`) })) : [{ key: "0", icon: "card", t: E("Sin cobros en el período", "No charges in the period") }] },
          { type: "group", k: "PRO" }, kpis([
            { k: "MRR", v: usd(D.foto.mrr), s: E(`${D.foto.pagando} Pro pagando`, `${D.foto.pagando} paying Pro`), dark: true, onClick: () => router.push("/admin/planes") },
            { k: E("CONVERSIÓN A PRO", "PRO CONVERSION"), v: pct(D.pro.primeros, D.pro.terminadas), s: E(`${D.pro.primeros} de ${D.pro.terminadas} pruebas que terminaron`, `${D.pro.primeros} of ${D.pro.terminadas} trials that ended`) },
            { k: E("EN PRUEBA", "ON TRIAL"), v: String(D.foto.prueba), s: E(`${D.pro.a_free} pasaron a Free en el período`, `${D.pro.a_free} went to Free in the period`) },
            { k: E("COBRADO DE PRO", "PRO CHARGED"), v: usd(D.pro.cobrado), s: E("en el período", "in the period") },
          ])]} />
        <A.HBars label={E("EMBUDO · PRUEBA PRO → PAGO", "FUNNEL · PRO TRIAL → PAID")} help={E(`${d.dias} días`, `${d.dias} days`)} items={FP.map(([l, n]) => ({ label: l, width: `${Math.min(100, Math.max(2, Math.round((n / (FP[0][1] || 1)) * 100)))}%`, color: "var(--tl-pro)", value: String(n) }))} />
        {D.estados.length ? <A.HBars label={E("DINERO POR ESTADO", "MONEY BY STATE")} help={E(`${d.dias} días · cobros creados en el período`, `${d.dias} days · charges created in the period`)}
          items={D.estados.map((x) => ({ label: ESTADO[x.estado] ? E(ESTADO[x.estado]![0], ESTADO[x.estado]![1]) : x.estado, width: `${Math.max(2, Math.round(((x.monto + x.devuelto) / mxE) * 100))}%`, color: x.estado === "captured" ? "var(--tl-action)" : "var(--tl-ink)", value: usd(x.monto + x.devuelto) }))} /> : null}
        <PanelBloques bloques={[{ type: "note", tone: "info", icon: "info", t: E("La conciliación diaria con Stripe (lo cobrado aquí contra lo que dice Stripe) llega con el bloque 9k: sale aquí y en el reporte diario.", "The daily reconciliation with Stripe (what was charged here against what Stripe says) arrives with block 9k: it shows here and in the daily report.") },
          { type: "note", tone: "info", icon: "lock", t: E("Solo cifras por ciudad, día y tipo: nunca quién pagó.", "Figures only by city, day and type: never who paid.") }]} />
      </>);
  } else if (d.tab === "ha" && d.ha) {
    // 9g · Hogar y Auto (LAUNCH L452): solo cifras.
    const { sol, hogar, auto, est } = d.ha, usd = (c: number) => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    cuerpo = (
      <PanelBloques bloques={[periodo, { type: "group", k: E("PRE-ESTIMADOS, PRESUPUESTOS Y EMERGENCIAS", "PRE-ESTIMATES, QUOTES AND EMERGENCIES") }, kpis([
        { k: E("PRE-ESTIMADO → CITA", "PRE-ESTIMATE → BOOKING"), v: pct(sol.pre_cita, sol.pre), s: E(`${sol.pre_cita} de ${sol.pre} pre-estimados`, `${sol.pre_cita} of ${sol.pre} pre-estimates`), dark: true },
        { k: E("PRESUPUESTO → CITA", "QUOTE → BOOKING"), v: pct(sol.pq_cita, sol.pq), s: E(`${sol.pq_cita} de ${sol.pq} presupuestos`, `${sol.pq_cita} of ${sol.pq} quotes`) },
        { k: E("EMERGENCIAS ATENDIDAS", "EMERGENCIES ANSWERED"), v: pct(sol.em_ok, sol.em), s: E(`${sol.em_ok} de ${sol.em}`, `${sol.em_ok} of ${sol.em}`) },
        { k: E("RESPUESTA A UNA EMERGENCIA", "EMERGENCY RESPONSE"), v: sol.em_min == null ? "—" : `${sol.em_min} min`, s: E("promedio, de pedir a que un negocio acepte", "average, from request to a business accepting") },
      ]), { type: "group", k: E("VISITAS Y CITAS", "VISITS AND BOOKINGS") }, kpis([
        { k: E("HOGAR · LLEGÓ EN LA FRANJA", "HOME · ARRIVED IN THE WINDOW"), v: pct(hogar.en_franja, hogar.llegaron), s: E(`${hogar.en_franja} de ${hogar.llegaron} con «Llegué» · franja de 2 h`, `${hogar.en_franja} of ${hogar.llegaron} with «Arrived» · 2-hour window`), dark: true },
        { k: E("HOGAR · NO LLEGÓ EL CLIENTE", "HOME · CUSTOMER NO-SHOW"), v: String(hogar.no_llego), s: E(`de ${hogar.visitas} visitas que ya pasaron`, `of ${hogar.visitas} visits that already happened`) },
        { k: E("AUTO · CITAS", "AUTO · BOOKINGS"), v: String(auto.visitas), s: E(`${auto.no_llego} no llegaron`, `${auto.no_llego} no-shows`) },
      ]), { type: "group", k: E("ESTIMADOS: APROBADO CONTRA COBRADO", "ESTIMATES: APPROVED VS. CHARGED") }, kpis([
        { k: E("APROBADO", "APPROVED"), v: usd(est.aprobado), s: E(`${est.con} trabajos terminados con estimado`, `${est.con} finished jobs with an estimate`) },
        { k: E("COBRADO", "CHARGED"), v: usd(est.cobrado), s: est.aprobado ? E(`${pct(est.cobrado, est.aprobado)} de lo aprobado · nunca más`, `${pct(est.cobrado, est.aprobado)} of what was approved · never more`) : "—", dark: true },
        { k: E("EXTRAS CON SU OK", "EXTRAS WITH THEIR OK"), v: String(est.extra), s: E("algo que apareció y el cliente aprobó", "something that came up and the customer approved") },
      ]), { type: "note", tone: "info", icon: "lock", t: E("Solo cifras: nunca la casa, el carro ni quién pidió.", "Figures only: never the home, the car or who asked.") }]} />);
  } else if (d.tab === "rep") {
    // 9g · Reportes: los programados por correo (de quien mira) y el reporte diario al fundador (solo los Admins lo ven).
    const TAB: [string, string, string][] = [["sum", "Resumen", "Overview"], ["dinero", "Dinero", "Money"], ["ppl", "Gente y negocios", "People and businesses"], ["nosup", "Búsquedas sin resultado", "Searches with no results"],
      ["evt", "Eventos", "Events"], ["cpa", "El Compa y Soporte", "El Compa and Support"], ["biz", "Negocios", "Businesses"]];
    const CADA: Record<string, [string, string]> = { dia: ["Cada día, 8 AM", "Every day, 8 AM"], semana: ["Cada lunes, 8 AM", "Every Monday, 8 AM"], mes: ["El día 1, 8 AM", "On the 1st, 8 AM"] };
    const prog = (k: string) => d.programados?.find((x) => x.tab === k && x.status === "activo");
    const cambiar = (k: string, cada: string | null) => start(async () => { const r = await programar(k, cada); setToast(r.mensaje ?? ""); if (r.ok) router.refresh(); });
    const cuando = (iso: string | null) => (iso ? new Intl.DateTimeFormat(d.l === "en" ? "en-US" : "es-US", { timeZone: "America/New_York", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso)) : E("todavía no salió", "not sent yet"));
    const filas: Bloque[] = [{ type: "note", tone: d.exporta ? "info" : "warn", icon: d.exporta ? "calendar" : "lock", t: d.exporta ? E("Te llegan a tu correo con las cifras de tus ciudades. Solo cifras: nunca quién.", "They arrive in your email with the figures for your cities. Figures only: never who.") : E("Tu rol no programa reportes.", "Your role cannot schedule reports.") },
      { type: "rows", k: E("REPORTES PROGRAMADOS", "SCHEDULED REPORTS"), items: TAB.map(([k, es, en]) => { const p = prog(k); return { key: k, icon: "calendar", t: E(es, en),
        s: p ? `${E(CADA[p.cada]![0], CADA[p.cada]![1])} · ${E("último", "last")}: ${cuando(p.last_sent_at)}` : E("Bajo pedido", "On demand"),
        ...(d.exporta ? { tgOn: !!p, onTg: () => cambiar(k, p ? null : "semana") } : {}) }; }) }];
    for (const [k, es, en] of TAB) { const p = prog(k); if (p && d.exporta) filas.push({ type: "chips", k: E(`${es.toUpperCase()} · CADA CUÁNTO`, `${en.toUpperCase()} · HOW OFTEN`), items: (["dia", "semana", "mes"] as const).map((c) => ({ l: E(CADA[c]![0], CADA[c]![1]), v: p.cada === c ? "selected" : "filter", onClick: () => { if (!pend && p.cada !== c) cambiar(k, c); } })) }); }
    if (d.diarios) {
      const usd = (c: number) => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      const hoy = d.diarios.find((x) => x.kind === "diario");
      filas.push({ type: "group", k: E("REPORTE DIARIO AL FUNDADOR · 7:30 AM", "DAILY REPORT TO THE FOUNDER · 7:30 AM") },
        { type: "acts", items: [{ l: E("Mándamelo ahora", "Send it to me now"), icon: "bell", off: pend, onClick: () => start(async () => { const r = await reporteAhora(); setToast(r.mensaje ?? ""); }) }] },
        { type: "rows", items: d.diarios.length ? d.diarios.map((x) => x.kind === "alerta"
          ? { key: `a${x.dia}`, icon: "warning", ifg: "var(--tl-danger)", t: E(`${x.dia} · no salió a tiempo`, `${x.dia} · did not go out on time`), tag: E("ALERTA", "ALERT"), tone: "danger", s: x.cifras.motivo === "tarde" ? E(`Salió después de las 8:00 (${x.hora}).`, `Went out after 8:00 (${x.hora}).`) : E("A las 8:00 no había salido.", "By 8:00 it had not gone out.") }
          : { key: `d${x.dia}`, icon: "bell", t: E(`${x.dia} · salió ${x.hora}`, `${x.dia} · went out ${x.hora}`), r: usd(x.cifras.dinero?.bruto ?? 0),
              s: E(`${x.cifras.negocios?.nuevos ?? 0} negocios nuevos · ${x.cifras.operaciones?.enviadas ?? 0} operaciones · ${(x.destinos ?? []).map((z) => `${z.n} ${z.canal === "push" ? "push" : "correos"}`).join(" · ")}`,
                `${x.cifras.negocios?.nuevos ?? 0} new businesses · ${x.cifras.operaciones?.enviadas ?? 0} transactions · ${(x.destinos ?? []).map((z) => `${z.n} ${z.canal === "push" ? "push" : "emails"}`).join(" · ")}`) })
          : [{ key: "0", icon: "bell", t: E("Todavía no ha salido ninguno", "None has gone out yet"), s: E("Sale cada día a las 7:30 AM de Hazleton a los Admins.", "It goes out every day at 7:30 AM Hazleton time to the Admins.") }] });
      if (hoy) filas.push({ type: "rows", k: E("LO QUE NECESITA DE TI", "WHAT NEEDS YOU"), items: (hoy.cifras.pendientes ?? []).length ? hoy.cifras.pendientes.map((p, i) => ({ key: `p${i}`, icon: "brief", t: E(p.es, p.en), s: `${E("Paquete", "Package")} ${p.paquete}`, onClick: () => router.push("/admin/sistema/apps?v=toca") }))
        : [{ key: "0", icon: "check", t: E("Nada por ahora", "Nothing for now") }] });
    }
    filas.push({ type: "note", tone: "info", icon: "info", t: d.replica ? E("Analítica lee de la base de análisis (réplica): nunca frena la app.", "Analytics reads from the analysis database (replica): it never slows the app down.") : E("En el sandbox Analítica lee de la misma base; en producción, de la réplica de análisis.", "In the sandbox Analytics reads from the same database; in production, from the analysis replica.") });
    cuerpo = <PanelBloques bloques={filas} />;
  } else if (d.tab === "exp") {
    const R = [["biz", "Negocios"], ["audit", "Historial"], ["nosup", "Búsquedas sin oferta"]] as const;
    const bajar = (k: "biz" | "audit" | "nosup") => start(async () => {
      const r = await exportar(k);
      if (!r.ok) { setToast(r.mensaje); return; }
      if ("archivo" in r && r.archivo) {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob(["﻿" + r.archivo], { type: "text/csv;charset=utf-8" }));
        a.download = r.nombre ?? `tolatino-${k}.csv`; document.body.appendChild(a); a.click(); a.remove();
      }
      setToast(r.mensaje ?? "Descargado.");
    });
    cuerpo = (
      <>
        <PanelBloques bloques={[{ type: "note", tone: d.exporta ? "info" : "warn", icon: d.exporta ? "folder" : "lock", t: d.exporta ? "Descarga en CSV (abre en Excel o Sheets). Cada exportación queda en la auditoría." : "Tu rol no exporta datos." },
          { type: "rows", items: R.map(([k, l]) => ({ key: k, icon: "folder", t: l, s: "Bajo pedido", acts: d.exporta ? [{ l: "Descargar CSV", v: "action", icon: "folder", off: pend, onClick: () => bajar(k) }] : undefined })) }]} />
      </>);
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 1120 }}>
      <PanelBloques bloques={[{ type: "head", eye: "CONTROL", t: E("Analítica", "Analytics"), s: E("Lo que pasa en la plataforma, de los eventos propios y de la base: dinero, gente, negocios, búsquedas y confianza. Nada sale a terceros.", "What happens on the platform, from our own events and database: money, people, businesses, searches and trust. Nothing goes to third parties."), h1: desk ? 26 : 22 }, tabs]} />
      {cuerpo}
      <Toast t={toast} desk={desk} />
    </div>);
}
