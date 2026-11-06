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
};
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)} %` : "—");

export function Analitica({ d }: { d: DatosAnalitica }) {
  const router = useRouter(), path = usePathname(), w = useAncho(), desk = w >= 1024;
  const [toast, setToast] = useToast();
  const [pend, start] = useTransition();
  const ir = (tab: string, dias = d.dias) => router.push(`${path}?${new URLSearchParams({ ...(tab !== "sum" ? { tab } : {}), ...(dias !== 30 ? { p: String(dias) } : {}) })}`, { scroll: false });
  const tabs: Bloque = { type: "tabs", items: ([["sum", "Resumen"], ["ppl", "Gente y negocios"], ["trust", "Soporte y confianza"], ["sp", "Doctores y Profesionales"], ["nosup", "Búsquedas sin oferta"], ["exp", "Exportar"]] as const).map(([k, l]) => ({ l, on: d.tab === k, onClick: () => ir(k) })) };
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
