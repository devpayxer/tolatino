"use client";
/* ADM-CONT · Contenido (Super Admin.dc.html secCont / contRow): lo que escriben vecinos y negocios y ya existe en la app
   (reseñas, novedades, comentarios de novedades y vacantes). Cifras, pestañas, búsqueda, filtros (con reporte, ocultos,
   votos negativos), y ocultar o mostrar con motivo (el autor lo ve; queda en la auditoría). Publicaciones de la
   comunidad, «Hoy en el barrio», auto-moderación y cuenta oficial llegan con la comunidad (Fase 5). */
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { FilaCont, FiltrosCont, ListaCont } from "@/lib/admin-contenido";
import { comentarioOcultar, novedadOcultar, resenaOcultar, vacanteOcultar } from "./acciones-negocios";
import type { ResAdm } from "./acciones-colas";
import * as UI from "@tolatino/ui";
import type { ComponentType } from "react";
import { ConfirmarMotivo, PLANT, Toast, useAncho, useToast, type Confirmar } from "./Colas";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const A = UI as unknown as Record<"AdminList" | "Pager" | "Icon", ComponentType<any>>;

const TIPO: Record<FilaCont["k"], [string, string]> = { rev: ["Reseña", "star"], nov: ["Novedad", "news"], cm: ["Comentario", "chat"], vac: ["Vacante", "brief"] };
const hace = (iso: string) => { const h = (Date.now() - new Date(iso).getTime()) / 3_600_000; return h < 1 ? "HACE UN MOMENTO" : h < 24 ? `HACE ${Math.floor(h)} H` : `HACE ${Math.floor(h / 24)} D`; };

export function Contenido({ d, f, porPagina, puede }: { d: ListaCont; f: FiltrosCont; porPagina: number; puede: boolean }) {
  const router = useRouter(), path = usePathname(), sp = useSearchParams(), w = useAncho(), desk = w >= 1024;
  const [q, setQ] = useState(f.q), [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast();
  const ir = (p: Record<string, string | null>) => { const u = new URLSearchParams(sp.toString()); for (const [k, v] of Object.entries(p)) { if (v) u.set(k, v); else u.delete(k); } if (!("pag" in p)) u.delete("pag"); router.push(`${path}${u.size ? `?${u}` : ""}`); };
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? "Listo. Quedó en la auditoría."); setConf(null); router.refresh(); };
  const accion = (x: FilaCont, ocultar: boolean): Promise<ResAdm> => {
    const m = (motivo: string) => x.k === "rev" ? resenaOcultar(x.biz, x.id, ocultar, motivo) : x.k === "nov" ? novedadOcultar(x.biz, x.id, ocultar, motivo) : x.k === "cm" ? comentarioOcultar(x.biz, x.id, ocultar, motivo) : vacanteOcultar(x.biz, x.id, ocultar, motivo);
    return new Promise((ok) => setConf({
      titulo: ocultar ? `Ocultar ${TIPO[x.k][0].toLowerCase()} de ${x.bname}` : `¿Por qué vuelve esta ${TIPO[x.k][0].toLowerCase()}?`,
      sub: ocultar ? (x.k === "vac" ? "Sale de su página y nadie nuevo aplica. El dueño ve el motivo en su panel." : x.k === "rev" ? "Sale de su página y de las estrellas. El autor ve el motivo." : "Sale de su página. Queda en la auditoría.") : undefined,
      peligro: ocultar, plantillas: ocultar ? (x.k === "vac" ? ["Pide papeles, SSN o pago para aplicar", "Pago por debajo del mínimo", "Vacante falsa o engañosa", "Discriminatoria"] : PLANT.hide) : PLANT.keep,
      hacer: async (motivo) => { const r = await m(motivo); ok(r); return r; },
    }));
  };
  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: "CONTENIDO", t: "Contenido", onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>);
  const c = d.cab;
  const bloques: Bloque[] = [
    { type: "head", eye: "CONTENIDO Y OFERTA", t: "Contenido", s: "Reseñas, novedades, comentarios y vacantes: todo lo que escribe un vecino o un negocio. Ocultar avisa al autor con el motivo; nada se borra.", h1: desk ? 26 : 22 },
    { type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: "RESEÑAS", v: String(c.rev), s: `${c.cm} comentarios` }, { k: "REPORTES ABIERTOS", v: String(c.rep), s: c.rep ? "SLA 24 h" : "al día", bg: c.rep ? "var(--tl-ink)" : undefined, fg: c.rep ? "var(--tl-white)" : undefined, onClick: c.rep ? () => router.push("/admin/colas?cola=rep") : undefined },
      { k: "NOVEDADES Y VACANTES", v: String(c.nov + c.vac), s: `${c.nov} novedades · ${c.vac} vacantes` }, { k: "OCULTOS", v: String(c.hid), s: "restaurables" },
    ] },
    { type: "tabs", items: ([["all", "Todo"], ["rev", "Reseñas"], ["nov", "Novedades"], ["cm", "Comentarios"], ["vac", "Vacantes"]] as const).map(([k, l]) => ({ l, on: f.tab === k, onClick: () => ir({ tab: k === "all" ? null : k }) })) },
  ];
  const despues: Bloque[] = [{ type: "chips", items: ([["rep", "Con reporte"], ["hid", "Ocultos"], ["neg", "Votos negativos"]] as const).map(([k, l]) => ({ l, v: f[k] ? "selected" : "filter", onClick: () => ir({ [k]: f[k] ? null : "1" }) })) }];
  const a = d.total ? (f.pag - 1) * porPagina + 1 : 0, b = Math.min(d.total, f.pag * porPagina);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <PanelBloques bloques={bloques} h1={desk ? 26 : 22} />
      <form onSubmit={(e) => { e.preventDefault(); ir({ q: q.trim() || null }); }} style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 15, top: 14.5, display: "grid" }}><A.Icon name="search" size={17} color="rgba(11,14,18,.45)" /></span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Texto, autor o negocio" aria-label="Buscar contenido"
          style={{ width: "100%", height: 46, boxSizing: "border-box", padding: "0 40px 0 42px", borderRadius: 14, border: "1.5px solid rgba(11,14,18,.14)", background: "var(--tl-white)", font: "600 14.5px Manrope,sans-serif", outline: "none" }} />
      </form>
      <PanelBloques bloques={despues} />
      {!d.filas.length ? <PanelBloques bloques={[{ type: "empty", icon: "chat", t: "Nada aquí", s: "Nada coincide con ese filtro." }]} />
        : <A.AdminList rows={d.filas.map((x) => ({
          icon: TIPO[x.k][1], title: x.text || "(sin texto)",
          sub: `${TIPO[x.k][0]} · ${x.who}${x.who !== x.bname ? ` · ${x.bname}` : ""}${x.k === "rev" && x.extra ? ` · ${x.extra} ★` : x.k === "vac" && x.extra ? ` · ${x.extra}` : x.k === "cm" && x.extra ? ` · en «${x.extra}»` : ""} · ${x.k === "vac" ? `${x.up} solicitudes` : `+${x.up}${x.dn ? ` / −${x.dn}` : ""}`} · ${hace(x.at)}${x.hidden && x.why ? ` · Oculto: ${x.why}` : ""}`,
          tag: x.hidden ? "OCULTO" : x.rep ? `REPORTADO · ${x.rep}` : undefined, tone: x.hidden ? "danger" : "action",
          actions: puede ? [x.hidden ? { label: "Mostrar", variant: "secondary", onClick: () => void accion(x, false) } : { label: "Ocultar", variant: "danger", onClick: () => void accion(x, true) },
            { label: "Ver negocio", variant: "secondary", onClick: () => router.push(`/admin/negocios/${x.biz}?tab=cont`) }] : [{ label: "Ver negocio", variant: "secondary", onClick: () => router.push(`/admin/negocios/${x.biz}?tab=cont`) }],
        }))} />}
      {d.total > porPagina ? <A.Pager label={`${a}–${b} · ${d.total}`} hasPrev={f.pag > 1} hasNext={b < d.total} onPrev={() => ir({ pag: String(f.pag - 1) })} onNext={() => ir({ pag: String(f.pag + 1) })} /> : null}
      <Toast t={toast} desk={desk} />
    </div>
  );
}
