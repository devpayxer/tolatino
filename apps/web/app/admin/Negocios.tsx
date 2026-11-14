"use client";
/* ADM-NEG · lista (Super Admin.dc.html secNeg / bizList): buscar, categoría, plan, estado, más filtros y orden.
   Tabla densa en escritorio, filas en el teléfono, paginador. Los filtros viven en la URL; el servidor filtra. */
import * as UI from "@tolatino/ui";
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type ComponentType } from "react";
import type { FiltrosNeg } from "@/lib/admin-negocios";
import { useAncho } from "./Colas";

import { tec } from "@/lib/tec";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const A = UI as unknown as Record<"DenseTable" | "AdminList" | "Pager" | "Icon", ComponentType<any>>;
type Fila = { id: string; name: string; cat: string; cat_id: string; subs: string | null; plan: string; trial: boolean; verified: boolean; rating: number | null; reviews: number; perfil: number; estado: string; cover: string | null };
const EST: Record<string, [string, string]> = { activo: ["ACTIVO", "neutral"], temp: ["CERRADO TEMPORAL", "action"], oculto: ["OCULTO", "danger"], susp: ["SUSPENDIDO", "danger"], cerrado: ["CERRADO", "danger"] };
const estadoDe = (r: Fila) => (r.estado === "activo" && r.verified ? ["VERIFICADO", "signal"] : EST[r.estado] ?? EST.activo!);

export function Negocios({ filas, total, porCat, cab, f, cats, porPagina }: {
  filas: Fila[]; total: number; porCat: Record<string, number>; cab: { n: number; pro: number; ver: number }; f: FiltrosNeg;
  cats: { id: string; s: string }[]; porPagina: number;
}) {
  const router = useRouter(), path = usePathname(), sp = useSearchParams();
  const w = useAncho(), desk = w >= 1024;
  const [q, setQ] = useState(f.q), [mas, setMas] = useState(f.mas.length > 0);
  const ir = (p: Record<string, string | null>) => { const u = new URLSearchParams(sp.toString()); for (const [k, v] of Object.entries(p)) { if (v) u.set(k, v); else u.delete(k); } if (!("pag" in p)) u.delete("pag"); router.push(`${path}${u.size ? `?${u}` : ""}`); };
  const toggle = (k: "plan" | "est" | "mas", v: string) => { const l = f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v]; ir({ [k]: l.join(",") || null }); };
  const chips = (k: "plan" | "est" | "mas", label: string, items: [string, string][]): Bloque => ({ type: "chips", k: label, items: items.map(([v, l]) => ({ l, v: f[k].includes(v) ? "selected" : "filter", onClick: () => toggle(k, v) })) });
  const hayFiltro = !!(f.q || f.cat || f.plan.length || f.est.length || f.mas.length);
  const bloques: (Bloque | null)[] = [
    { type: "head", eye: "TODOS LOS NEGOCIOS", t: "Negocios", s: `${cab.n} en tus ciudades · ${cab.pro} Pro · ${cab.n - cab.pro} Free · ${cab.ver} verificados`, h1: desk ? 26 : 22 },
  ];
  const despues: (Bloque | null)[] = [
    { type: "tabs", items: [{ l: "Todas", n: String(Object.values(porCat).reduce((a, b) => a + b, 0) || ""), on: !f.cat, onClick: () => ir({ cat: null }) }, ...cats.filter((c) => porCat[c.id]).map((c) => ({ l: c.s, n: String(porCat[c.id]), on: f.cat === c.id, onClick: () => ir({ cat: c.id }) }))] },
    chips("plan", "PLAN", [["pro", "Pro"], ["free", "Free"], ["prueba", "En prueba"]]),
    chips("est", "ESTADO", [["activo", "Activo"], ["temp", "Cerrado temporal"], ["oculto", "Oculto"], ["susp", "Suspendido"], ["cerrado", "Cerrado"]]),
    mas ? chips("mas", "MÁS", [["ver", "Verificado"], ["nover", "Pro sin sello"], ["rep", "Con reportes"], ["weak", "Perfil menos de 70 %"], ["norev", "Sin reseñas"], ["noown", "Sin reclamar"]]) : null,
    { type: "chips", k: "ORDENAR", items: ([["pro", "Pro primero"], ["top", "Mejor calificados"], ["new", "Más nuevos"], ["rep", "Más reportes"], ["weak", "Perfil más débil"]] as const).map(([v, l]) => ({ l, v: f.orden === v ? "selected" : "filter", onClick: () => ir({ orden: v === "pro" ? null : v }) })) },
    { type: "acts", items: [
      { l: mas ? "Menos filtros" : `Más filtros${f.mas.length ? ` (${f.mas.length})` : ""}`, icon: "grid", onClick: () => setMas(!mas) },
      ...(hayFiltro ? [{ l: "Quitar filtros", icon: "close", onClick: () => router.push(path) }] : []),
    ] },
  ];
  const a = total ? (f.pag - 1) * porPagina + 1 : 0, b = Math.min(total, f.pag * porPagina);
  const pager = { label: `${a}–${b} · ${total}`, hasPrev: f.pag > 1, hasNext: b < total, onPrev: () => ir({ pag: String(f.pag - 1) }), onNext: () => ir({ pag: String(f.pag + 1) }) };
  const abrir = (id: string) => router.push(`/admin/negocios/${id}`);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <PanelBloques bloques={bloques} h1={desk ? 26 : 22} />
      <form onSubmit={(e) => { e.preventDefault(); ir({ q: q.trim() || null }); }} style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 15, top: 14.5, display: "grid" }}><A.Icon name="search" size={17} color="rgba(11,14,18,.45)" /></span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre, id, teléfono, dirección o subcategoría" aria-label="Buscar negocio"
          style={{ width: "100%", height: 46, boxSizing: "border-box", padding: "0 40px 0 42px", borderRadius: 14, border: "1.5px solid rgba(11,14,18,.14)", background: "var(--tl-white)", font: "600 14.5px Manrope,sans-serif", outline: "none" }} />
        {q ? <span role="button" aria-label="Borrar" onClick={() => { setQ(""); ir({ q: null }); }} {...tec(() => { setQ(""); ir({ q: null }); })} style={{ position: "absolute", right: 12, top: 13, cursor: "pointer", display: "grid" }}><A.Icon name="close" size={18} color="rgba(11,14,18,.5)" /></span> : null}
      </form>
      <PanelBloques bloques={despues} />
      {!filas.length ? (
        <PanelBloques bloques={[{ type: "empty", icon: "store", t: "Ningún negocio con esos filtros", s: "Quita un filtro o busca por otro nombre." }]} />
      ) : desk ? (
        <A.DenseTable columns="minmax(0,2.2fr) minmax(0,1.3fr) 70px 90px 70px 150px"
          head={[{ label: "NEGOCIO" }, { label: "CATEGORÍA" }, { label: "PLAN" }, { label: "RESEÑAS" }, { label: "PERFIL", align: "right" }, { label: "ESTADO" }]}
          rows={filas.map((r) => {
            const [tag, tone] = estadoDe(r);
            return {
              opacity: ["oculto", "susp", "cerrado"].includes(r.estado) ? 0.6 : 1, onClick: () => abrir(r.id),
              cells: [
                { image: r.cover ?? undefined, initials: r.cover ? undefined : r.name.slice(0, 1), text: r.name, bold: true, sub: r.subs ?? r.id },
                { text: r.cat },
                { text: r.trial ? "Prueba" : r.plan === "pro" ? "Pro" : "Free", color: r.plan === "pro" ? "var(--tl-action)" : "rgba(11,14,18,.6)", bold: r.plan === "pro" },
                r.reviews ? { text: `${r.rating?.toFixed(1) ?? "—"} ★`, sub: String(r.reviews) } : { text: "Nuevo" },
                { text: `${r.perfil} %`, align: "right", color: r.perfil < 70 ? "var(--tl-pro-ink)" : undefined },
                { tag, tone },
              ],
            };
          })}
          page={pager} />
      ) : (
        <>
          <A.AdminList rows={filas.map((r) => {
            const [tag] = estadoDe(r);
            return { image: r.cover ?? undefined, initials: r.cover ? undefined : r.name.slice(0, 1), title: r.name, sub: `${r.cat} · ${r.plan === "pro" ? "Pro" : "Free"}${r.verified ? " · Verificado" : ""}`, tag: r.estado !== "activo" ? tag : undefined, tone: "danger", chevron: true, onClick: () => abrir(r.id) };
          })} />
          <A.Pager {...pager} />
        </>
      )}
    </div>
  );
}
