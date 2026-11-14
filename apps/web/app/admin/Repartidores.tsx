"use client";
/* 9n · ADM-DLV · Super Admin › Repartidores (apps-delivery-checkin.md §1.5; sin pantalla propia en el diseño: compuesta con los bloques del
   sistema como Usuarios, anotado en REVISION). Pestañas Repartidores (buscar, filtros, «Ver más» por cursor) e Incidencias (las abiertas,
   o todas; resolver con motivo). Cada fila abre el 360°. */
import { PanelBloques, type PanelBloqueT as Bloque, type PanelFila as Fila } from "@tolatino/ui";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { FiltroDlv, FilaDlv, Incidencia } from "@/lib/repartidor-admin";
import { dlvResolver } from "./acciones-repartidores";
import { ConfirmarMotivo, Toast, useAncho, useToast, type Confirmar } from "./Colas";
import type { ResAdm } from "./acciones-colas";

export const KIND_INC: Record<string, string> = { accidente: "ACCIDENTE", codigo: "CÓDIGO", reclamo: "RECLAMO", otro: "INCIDENCIA" };
const SANC: Record<string, string> = { suspension: "SUSPENDIDO", baneo: "BANEADO" };
export const cuandoDlv = (iso: string) => new Intl.DateTimeFormat("es-US", { timeZone: "America/New_York", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso)).replace(/\./g, "");

export function Repartidores({ tab, f, lista, incid, todas, puede }: {
  tab: "lista" | "incid"; f: FiltroDlv; lista: { filas: FilaDlv[]; mas: string | null; cab: { total: number; linea: number; sancion: number; incid: number } } | null;
  incid: Incidencia[] | null; todas: boolean; puede: { editar: boolean; sancionar: boolean };
}) {
  const router = useRouter(), path = usePathname(), sp = useSearchParams(), w = useAncho(), desk = w >= 1024;
  const [q, setQ] = useState(f.q), [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast();
  const ir = (p: Record<string, string | null>) => { const u = new URLSearchParams(sp.toString()); for (const [k, v] of Object.entries(p)) { if (v) u.set(k, v); else u.delete(k); } if (!("antes" in p)) u.delete("antes"); router.push(`${path}${u.size ? `?${u}` : ""}`); };
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? "Listo. Quedó en la auditoría."); setConf(null); router.refresh(); };
  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: "REPARTIDORES", t: "Incidencias", onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>);
  const cab = lista?.cab;
  const B: Bloque[] = [
    { type: "head", eye: "OPERAR · ADM-DLV", t: "Repartidores", s: cab ? `${cab.total} ${cab.total === 1 ? "persona reparte" : "personas reparten"} para un negocio · ${cab.linea} en línea · ${cab.sancion} con sanción · ${cab.incid} ${cab.incid === 1 ? "incidencia abierta" : "incidencias abiertas"}`
      : "Las personas que reparten para los negocios, sus entregas, incidencias y sanciones.", h1: desk ? 26 : 22 },
    { type: "tabs", items: [{ l: "Repartidores", on: tab === "lista", onClick: () => router.push(path) }, { l: "Incidencias", n: cab?.incid ? String(cab.incid) : undefined, on: tab === "incid", onClick: () => router.push(`${path}?tab=incid`) }] },
  ];
  if (tab === "lista" && lista) {
    B.push({ type: "search", val: q, ph: "Nombre o teléfono", onChange: (v: string) => setQ(v.slice(0, 60)), onClear: () => { setQ(""); ir({ q: null }); }, link: "Buscar", onLink: () => ir({ q: q.trim() || null }) });
    B.push({ type: "chips", items: ([["", "Todos"], ["linea", "En línea ahora"], ["incid", "Con incidencias"], ["sancion", "Con sanción"]] as const).map(([k, l]) => ({ l, v: f.est === k ? "selected" : "filter", onClick: () => ir({ est: k || null }) })) });
    B.push(lista.filas.length ? { type: "rows", cols: desk ? "repeat(2,minmax(0,1fr))" : "1fr", items: lista.filas.map((r): Fila => ({ key: r.id, icon: "truck", t: r.nombre,
      s: [r.equipos.length ? r.equipos.join(", ") : "Sin equipo activo", r.ciudad, `${r.entregas30} entregas en 30 días`, r.problemas30 ? `${r.problemas30} problemas` : null, r.incid ? `${r.incid} ${r.incid === 1 ? "incidencia" : "incidencias"}` : null].filter(Boolean).join(" · "),
      tag: r.sancion ? SANC[r.sancion] : r.enLinea ? "EN LÍNEA" : null, tone: r.sancion ? "danger" : "signal", chev: true, onClick: () => router.push(`/admin/repartidores/${r.id}`) })) }
      : { type: "empty", icon: "truck", t: "Nadie con esos filtros", s: f.q || f.est ? "Quita un filtro o busca por teléfono." : "Cuando un negocio invite a su primer repartidor y este acepte, sale aquí." });
    if (lista.mas) B.push({ type: "acts", items: [{ l: "Ver más", v: "secondary", onClick: () => ir({ antes: lista.mas }) }] });
    if (f.antes) B.push({ type: "acts", items: [{ l: "Volver al principio", v: "secondary", onClick: () => ir({ antes: null }) }] });
  }
  if (tab === "incid" && incid) {
    B.push({ type: "chips", items: [{ l: "Abiertas", v: !todas ? "selected" : "filter", onClick: () => router.push(`${path}?tab=incid`) }, { l: "Todas", v: todas ? "selected" : "filter", onClick: () => router.push(`${path}?tab=incid&todas=1`) }] });
    B.push(incid.length ? { type: "rows", cols: desk ? "repeat(2,minmax(0,1fr))" : "1fr", items: incid.map((i): Fila => ({ key: i.id, icon: i.kind === "accidente" ? "warning" : "truck",
      t: `${i.rep}${i.numero ? ` · #${i.numero}` : ""}${i.negocio ? ` · ${i.negocio}` : ""}`, s: [i.nota.es, cuandoDlv(i.at), i.status === "resolved" ? `Resuelta${i.quien ? ` por ${i.quien}` : ""}: ${i.resolucion ?? ""}` : null].filter(Boolean).join(" · "),
      tag: i.status === "open" ? KIND_INC[i.kind] ?? "INCIDENCIA" : "RESUELTA", tone: i.status === "open" ? (i.kind === "accidente" ? "danger" : "action") : "neutral", chev: true,
      onClick: () => router.push(`/admin/repartidores/${i.repId}`),
      acts: i.status === "open" && puede.editar ? [{ l: "Resolver", v: "secondary", icon: "check", onClick: () => setConf({ titulo: "¿Cómo se resolvió?", cta: "Resolver",
        plantillas: ["Hablamos con el repartidor y el negocio", "La prueba de la entrega está bien", "Fue un accidente: nadie salió herido"], sub: "Queda en la auditoría.", hacer: (m) => dlvResolver(i.id, m) }) }] : undefined })) }
      : { type: "empty", icon: "check", t: todas ? "Sin incidencias todavía" : "Ninguna incidencia abierta", s: "Un accidente que reporta un repartidor, un código del cliente que falla varias veces o lo que abre el equipo sale aquí y en Colas." });
  }
  return <div style={{ display: "flex", flexDirection: "column", gap: 14 }}><PanelBloques bloques={B} h1={desk ? 26 : 22} /><Toast t={toast} desk={desk} /></div>;
}
