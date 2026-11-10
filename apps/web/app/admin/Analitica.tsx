"use client";
/* ADM-ANALIT · Analítica (Super Admin.dc.html secAnalit) con lo que existe en la Fase 1: Resumen (embudo del directorio),
   Gente y negocios, Soporte y confianza, Búsquedas sin oferta y Exportar. Período 7 / 30 / 90 días en la URL. */
import * as UI from "@tolatino/ui";
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { usePathname, useRouter } from "next/navigation";
import { useTransition, type ComponentType, type ReactNode } from "react";
import { exportar } from "./acciones-analitica";
import { motivoAyuda } from "@/lib/ayuda-motivos";
import { Toast, useAncho, useToast } from "./Colas";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const A = UI as unknown as Record<"HBars" | "AdminNote" | "Icon", ComponentType<any>>;
export type DatosAnalitica = {
  tab: string; dias: number; exporta: boolean;
  gente?: { u: { n: number; nuevos: number; activos: number }; b: { n: number; pro: number; ver: number }; retencion: { k: number; base: number; vuelven: number }[]; cats: { id: string; short: string; n: number; pro: number }[] };
  embudo?: { buscar: number; ficha: number; contactar: number };
  confianza?: { sancionados: number; abiertas: { queue: string; n: number; es: string; sla: number }[]; cumplido: { total: number; a_tiempo: number } };
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
};
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)} %` : "—");

export function Analitica({ d }: { d: DatosAnalitica }) {
  const router = useRouter(), path = usePathname(), w = useAncho(), desk = w >= 1024;
  const [toast, setToast] = useToast();
  const [pend, start] = useTransition();
  const ir = (tab: string, dias = d.dias) => router.push(`${path}?${new URLSearchParams({ ...(tab !== "sum" ? { tab } : {}), ...(dias !== 30 ? { p: String(dias) } : {}) })}`, { scroll: false });
  const tabs: Bloque = { type: "tabs", items: ([["sum", "Resumen"], ["ppl", "Gente y negocios"], ["trust", "Soporte y confianza"], ["sp", "Doctores y Profesionales"], ["mt", "Mercados y Tiendas"], ["ft", "Fiestas y Transporte"], ["no", "Noche"], ["en", "Educación · Niños · Deporte"], ["ia", "Iglesias · Bienes Raíces · Autos"], ["com", "Comunidad"], ["evt", "Eventos"], ["nosup", "Búsquedas sin oferta"], ["exp", "Exportar"]] as const).map(([k, l]) => ({ l, on: d.tab === k, onClick: () => ir(k) })) };
  const periodo: Bloque = { type: "chips", items: [7, 30, 90].map((n) => ({ l: `${n} días`, v: d.dias === n ? "selected" : "filter", onClick: () => ir(d.tab, n) })) };
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
        <PanelBloques bloques={[{ type: "note", tone: "info", t: "Vendido, comisión, operaciones y citas aprobadas llegan con los pedidos y las citas." }]} />
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
        <PanelBloques bloques={[{ type: "note", tone: "info", t: "Reportes por cada mil operaciones y tickets de soporte llegan con los pedidos y con Soporte." }]} />
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
  } else if (d.tab === "nosup" && d.nosup) {
    const L = d.nosup;
    cuerpo = (
      <>
        {L.length ? <A.HBars label="BUSCARON Y NO HABÍA · 30 DÍAS" help="pidieron aviso" items={L.slice(0, 10).map((x) => ({ label: x.q, width: `${Math.round((x.n / (L[0]!.n || 1)) * 100)}%`, color: "var(--tl-ink)", value: String(x.n) }))} />
          : <PanelBloques bloques={[{ type: "empty", icon: "search", t: "Nadie ha pedido aviso todavía", s: "Cuando un vecino busca algo que no hay y toca «Avísame cuando haya», sale aquí." }]} />}
        <PanelBloques bloques={[{ type: "acts", items: [{ l: "Abrir en Catálogo", icon: "grid", onClick: () => router.push("/admin/catalogo?tab=nosup") }] }]} />
      </>);
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
      <PanelBloques bloques={[{ type: "head", eye: "CONTROL", t: "Analítica", s: "Lo que pasa en la plataforma, de los eventos propios y de la base: gente, negocios, búsquedas y confianza. Nada sale a terceros.", h1: desk ? 26 : 22 }, tabs]} />
      {cuerpo}
      <Toast t={toast} desk={desk} />
    </div>);
}
