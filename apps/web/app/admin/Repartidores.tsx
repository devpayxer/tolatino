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
import { useE } from "./idioma-admin";

export const KIND_INC: Record<string, [string, string]> = { accidente: ["ACCIDENTE", "ACCIDENT"], codigo: ["CÓDIGO", "CODE"], reclamo: ["RECLAMO", "CLAIM"], otro: ["INCIDENCIA", "INCIDENT"] };
const SANC: Record<string, [string, string]> = { suspension: ["SUSPENDIDO", "SUSPENDED"], baneo: ["BANEADO", "BANNED"] };
export const cuandoDlv = (iso: string, en = false) => new Intl.DateTimeFormat(en ? "en-US" : "es-US", { timeZone: "America/New_York", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso)).replace(/\./g, "");

export function Repartidores({ tab, f, lista, incid, todas, puede }: {
  tab: "lista" | "incid"; f: FiltroDlv; lista: { filas: FilaDlv[]; mas: string | null; cab: { total: number; linea: number; sancion: number; incid: number } } | null;
  incid: Incidencia[] | null; todas: boolean; puede: { editar: boolean; sancionar: boolean };
}) {
  const router = useRouter(), path = usePathname(), sp = useSearchParams(), w = useAncho(), desk = w >= 1024, E = useE(), en = E("", "x") === "x", li = en ? 1 : 0;
  const [q, setQ] = useState(f.q), [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast();
  const ir = (p: Record<string, string | null>) => { const u = new URLSearchParams(sp.toString()); for (const [k, v] of Object.entries(p)) { if (v) u.set(k, v); else u.delete(k); } if (!("antes" in p)) u.delete("antes"); router.push(`${path}${u.size ? `?${u}` : ""}`); };
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? E("Listo. Quedó en la auditoría.", "Done. It’s in the audit log.")); setConf(null); router.refresh(); };
  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: E("REPARTIDORES", "DRIVERS"), t: E("Incidencias", "Incidents"), onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>);
  const cab = lista?.cab;
  const B: Bloque[] = [
    { type: "head", eye: E("OPERAR · ADM-DLV", "OPERATE · ADM-DLV"), t: E("Repartidores", "Drivers"), s: cab ? E(`${cab.total} ${cab.total === 1 ? "persona reparte" : "personas reparten"} para un negocio · ${cab.linea} en línea · ${cab.sancion} con sanción · ${cab.incid} ${cab.incid === 1 ? "incidencia abierta" : "incidencias abiertas"}`,
        `${cab.total} ${cab.total === 1 ? "person delivers" : "people deliver"} for a business · ${cab.linea} online · ${cab.sancion} sanctioned · ${cab.incid} open ${cab.incid === 1 ? "incident" : "incidents"}`)
      : E("Las personas que reparten para los negocios, sus entregas, incidencias y sanciones.", "The people who deliver for businesses, their deliveries, incidents and sanctions."), h1: desk ? 26 : 22 },
    { type: "tabs", items: [{ l: E("Repartidores", "Drivers"), on: tab === "lista", onClick: () => router.push(path) }, { l: E("Incidencias", "Incidents"), n: cab?.incid ? String(cab.incid) : undefined, on: tab === "incid", onClick: () => router.push(`${path}?tab=incid`) }] },
  ];
  if (tab === "lista" && lista) {
    B.push({ type: "search", val: q, ph: E("Nombre o teléfono", "Name or phone"), onChange: (v: string) => setQ(v.slice(0, 60)), onClear: () => { setQ(""); ir({ q: null }); }, link: E("Buscar", "Search"), onLink: () => ir({ q: q.trim() || null }) });
    B.push({ type: "chips", items: ([["", "Todos", "All"], ["linea", "En línea ahora", "Online now"], ["incid", "Con incidencias", "With incidents"], ["sancion", "Con sanción", "Sanctioned"]] as const).map(([k, l, lEn]) => ({ l: en ? lEn : l, v: f.est === k ? "selected" : "filter", onClick: () => ir({ est: k || null }) })) });
    B.push(lista.filas.length ? { type: "rows", cols: desk ? "repeat(2,minmax(0,1fr))" : "1fr", items: lista.filas.map((r): Fila => ({ key: r.id, icon: "truck", t: r.nombre,
      s: [r.equipos.length ? r.equipos.join(", ") : E("Sin equipo activo", "No active team"), r.ciudad, E(`${r.entregas30} entregas en 30 días`, `${r.entregas30} deliveries in 30 days`), r.problemas30 ? E(`${r.problemas30} problemas`, `${r.problemas30} ${r.problemas30 === 1 ? "problem" : "problems"}`) : null, r.incid ? E(`${r.incid} ${r.incid === 1 ? "incidencia" : "incidencias"}`, `${r.incid} ${r.incid === 1 ? "incident" : "incidents"}`) : null].filter(Boolean).join(" · "),
      tag: r.sancion ? SANC[r.sancion]?.[li] : r.enLinea ? E("EN LÍNEA", "ONLINE") : null, tone: r.sancion ? "danger" : "signal", chev: true, onClick: () => router.push(`/admin/repartidores/${r.id}`) })) }
      : { type: "empty", icon: "truck", t: E("Nadie con esos filtros", "No one matches those filters"), s: f.q || f.est ? E("Quita un filtro o busca por teléfono.", "Remove a filter or search by phone.") : E("Cuando un negocio invite a su primer repartidor y este acepte, sale aquí.", "When a business invites its first driver and they accept, they show here.") });
    if (lista.mas) B.push({ type: "acts", items: [{ l: E("Ver más", "See more"), v: "secondary", onClick: () => ir({ antes: lista.mas }) }] });
    if (f.antes) B.push({ type: "acts", items: [{ l: E("Volver al principio", "Back to the start"), v: "secondary", onClick: () => ir({ antes: null }) }] });
  }
  if (tab === "incid" && incid) {
    B.push({ type: "chips", items: [{ l: E("Abiertas", "Open"), v: !todas ? "selected" : "filter", onClick: () => router.push(`${path}?tab=incid`) }, { l: E("Todas", "All"), v: todas ? "selected" : "filter", onClick: () => router.push(`${path}?tab=incid&todas=1`) }] });
    B.push(incid.length ? { type: "rows", cols: desk ? "repeat(2,minmax(0,1fr))" : "1fr", items: incid.map((i): Fila => ({ key: i.id, icon: i.kind === "accidente" ? "warning" : "truck",
      t: `${i.rep}${i.numero ? ` · #${i.numero}` : ""}${i.negocio ? ` · ${i.negocio}` : ""}`, s: [en ? i.nota.en || i.nota.es : i.nota.es, cuandoDlv(i.at, en), i.status === "resolved" ? E(`Resuelta${i.quien ? ` por ${i.quien}` : ""}: ${i.resolucion ?? ""}`, `Resolved${i.quien ? ` by ${i.quien}` : ""}: ${i.resolucion ?? ""}`) : null].filter(Boolean).join(" · "),
      tag: i.status === "open" ? KIND_INC[i.kind]?.[li] ?? E("INCIDENCIA", "INCIDENT") : E("RESUELTA", "RESOLVED"), tone: i.status === "open" ? (i.kind === "accidente" ? "danger" : "action") : "neutral", chev: true,
      onClick: () => router.push(`/admin/repartidores/${i.repId}`),
      acts: i.status === "open" && puede.editar ? [{ l: E("Resolver", "Resolve"), v: "secondary", icon: "check", onClick: () => setConf({ titulo: E("¿Cómo se resolvió?", "How was it resolved?"), cta: E("Resolver", "Resolve"),
        plantillas: [E("Hablamos con el repartidor y el negocio", "We spoke with the driver and the business"), E("La prueba de la entrega está bien", "The proof of delivery checks out"), E("Fue un accidente: nadie salió herido", "It was an accident: no one was hurt")], sub: E("Queda en la auditoría.", "It stays in the audit log."), hacer: (m) => dlvResolver(i.id, m) }) }] : undefined })) }
      : { type: "empty", icon: "check", t: todas ? E("Sin incidencias todavía", "No incidents yet") : E("Ninguna incidencia abierta", "No open incidents"), s: E("Un accidente que reporta un repartidor, un código del cliente que falla varias veces o lo que abre el equipo sale aquí y en Colas.", "An accident a driver reports, a customer code that fails several times, or anything the team opens shows here and in Queues.") });
  }
  return <div style={{ display: "flex", flexDirection: "column", gap: 14 }}><PanelBloques bloques={B} h1={desk ? 26 : 22} /><Toast t={toast} desk={desk} /></div>;
}
