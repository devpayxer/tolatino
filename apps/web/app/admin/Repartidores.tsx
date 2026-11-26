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
import { useE2 } from "./idioma-admin";
import { numVisible } from "@/lib/reparto-comun";

type EF = (es: string, en: string) => string;

export const KIND_INC = (E2: (a: string, b: string) => string): Record<string, string> => ({ accidente: E2("ACCIDENTE", "ACCIDENT"), codigo: E2("CÓDIGO", "CODE"), reclamo: E2("RECLAMO", "CLAIM"), otro: E2("INCIDENCIA", "INCIDENT") });
const SANC = (E2: EF): Record<string, string> => ({ suspension: E2("SUSPENDIDO", "SUSPENDED"), baneo: E2("BANEADO", "BANNED") });
export const cuandoDlv = (iso: string, en = false) => new Intl.DateTimeFormat(en ? "en-US" : "es-US", { timeZone: "America/New_York", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso)).replace(/\./g, "");

export function Repartidores({ tab, f, lista, incid, todas, puede }: {
  tab: "lista" | "incid"; f: FiltroDlv; lista: { filas: FilaDlv[]; mas: string | null; cab: { total: number; linea: number; sancion: number; incid: number } } | null;
  incid: Incidencia[] | null; todas: boolean; puede: { editar: boolean; sancionar: boolean };
}) {
  const router = useRouter(), path = usePathname(), sp = useSearchParams(), w = useAncho(), desk = w >= 1024, { E2 } = useE2(), en = E2("", "x") === "x", sanc = SANC(E2);
  const [q, setQ] = useState(f.q), [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast();
  const ir = (p: Record<string, string | null>) => { const u = new URLSearchParams(sp.toString()); for (const [k, v] of Object.entries(p)) { if (v) u.set(k, v); else u.delete(k); } if (!("antes" in p)) u.delete("antes"); router.push(`${path}${u.size ? `?${u}` : ""}`); };
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? E2("Listo. Quedó en la auditoría.", "Done. It’s in the audit log.")); setConf(null); router.refresh(); };
  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: E2("REPARTIDORES", "DRIVERS"), t: E2("Incidencias", "Incidents"), onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>);
  const cab = lista?.cab;
  const B: Bloque[] = [
    { type: "head", eye: E2("OPERAR · ADM-DLV", "OPERATE · ADM-DLV"), t: E2("Repartidores", "Drivers"), s: cab ? E2(`${cab.total} ${cab.total === 1 ? "persona reparte" : "personas reparten"} para un negocio · ${cab.linea} en línea · ${cab.sancion} con sanción · ${cab.incid} ${cab.incid === 1 ? "incidencia abierta" : "incidencias abiertas"}`,
        `${cab.total} ${cab.total === 1 ? "person delivers" : "people deliver"} for a business · ${cab.linea} online · ${cab.sancion} sanctioned · ${cab.incid} open ${cab.incid === 1 ? "incident" : "incidents"}`)
      : E2("Las personas que reparten para los negocios, sus entregas, incidencias y sanciones.", "The people who deliver for businesses, their deliveries, incidents and sanctions."), h1: desk ? 26 : 22 },
    { type: "tabs", items: [{ l: E2("Repartidores", "Drivers"), on: tab === "lista", onClick: () => router.push(path) }, { l: E2("Incidencias", "Incidents"), n: cab?.incid ? String(cab.incid) : undefined, on: tab === "incid", onClick: () => router.push(`${path}?tab=incid`) }] },
  ];
  if (tab === "lista" && lista) {
    B.push({ type: "search", val: q, ph: E2("Nombre o teléfono", "Name or phone"), onChange: (v: string) => setQ(v.slice(0, 60)), onClear: () => { setQ(""); ir({ q: null }); }, link: E2("Buscar", "Search"), onLink: () => ir({ q: q.trim() || null }) });
    B.push({ type: "chips", items: ([["", E2("Todos", "All")], ["linea", E2("En línea ahora", "Online now")], ["incid", E2("Con incidencias", "With incidents")], ["sancion", E2("Con sanción", "Sanctioned")]] as const).map(([k, l]) => ({ l, v: f.est === k ? "selected" : "filter", onClick: () => ir({ est: k || null }) })) });
    B.push(lista.filas.length ? { type: "rows", cols: desk ? "repeat(2,minmax(0,1fr))" : "1fr", items: lista.filas.map((r): Fila => ({ key: r.id, icon: "truck", t: r.nombre,
      s: [r.equipos.length ? r.equipos.join(", ") : E2("Sin equipo activo", "No active team"), r.ciudad, E2(`${r.entregas30} entregas en 30 días`, `${r.entregas30} deliveries in 30 days`), r.problemas30 ? E2(`${r.problemas30} problemas`, `${r.problemas30} ${r.problemas30 === 1 ? "problem" : "problems"}`) : null, r.incid ? E2(`${r.incid} ${r.incid === 1 ? "incidencia" : "incidencias"}`, `${r.incid} ${r.incid === 1 ? "incident" : "incidents"}`) : null].filter(Boolean).join(" · "),
      tag: r.sancion ? sanc[r.sancion] : r.enLinea ? E2("EN LÍNEA", "ONLINE") : null, tone: r.sancion ? "danger" : "signal", chev: true, onClick: () => router.push(`/admin/repartidores/${r.id}`) })) }
      : { type: "empty", icon: "truck", t: E2("Nadie con esos filtros", "No one matches those filters"), s: f.q || f.est ? E2("Quita un filtro o busca por teléfono.", "Remove a filter or search by phone.") : E2("Cuando un negocio invite a su primer repartidor y este acepte, sale aquí.", "When a business invites its first driver and they accept, they show here.") });
    if (lista.mas) B.push({ type: "acts", items: [{ l: E2("Ver más", "See more"), v: "secondary", onClick: () => ir({ antes: lista.mas }) }] });
    if (f.antes) B.push({ type: "acts", items: [{ l: E2("Volver al principio", "Back to the start"), v: "secondary", onClick: () => ir({ antes: null }) }] });
  }
  if (tab === "incid" && incid) {
    B.push({ type: "chips", items: [{ l: E2("Abiertas", "Open"), v: !todas ? "selected" : "filter", onClick: () => router.push(`${path}?tab=incid`) }, { l: E2("Todas", "All"), v: todas ? "selected" : "filter", onClick: () => router.push(`${path}?tab=incid&todas=1`) }] });
    B.push(incid.length ? { type: "rows", cols: desk ? "repeat(2,minmax(0,1fr))" : "1fr", items: incid.map((i): Fila => ({ key: i.id, icon: i.kind === "accidente" ? "warning" : "truck",
      t: `${i.rep}${i.numero ? ` · ${numVisible(i.numero)}` : ""}${i.negocio ? ` · ${i.negocio}` : ""}`, s: [en ? i.nota.en || i.nota.es : i.nota.es, cuandoDlv(i.at, en), i.status === "resolved" ? E2(`Resuelta${i.quien ? ` por ${i.quien}` : ""}: ${i.resolucion ?? ""}`, `Resolved${i.quien ? ` by ${i.quien}` : ""}: ${i.resolucion ?? ""}`) : null].filter(Boolean).join(" · "),
      tag: i.status === "open" ? KIND_INC(E2)[i.kind] ?? E2("INCIDENCIA", "INCIDENT") : E2("RESUELTA", "RESOLVED"), tone: i.status === "open" ? (i.kind === "accidente" ? "danger" : "action") : "neutral", chev: true,
      onClick: () => router.push(`/admin/repartidores/${i.repId}`),
      acts: i.status === "open" && puede.editar ? [{ l: E2("Resolver", "Resolve"), v: "secondary", icon: "check", onClick: () => setConf({ titulo: E2("¿Cómo se resolvió?", "How was it resolved?"), cta: E2("Resolver", "Resolve"),
        plantillas: [E2("Hablamos con el repartidor y el negocio", "We spoke with the driver and the business"), E2("La prueba de la entrega está bien", "The proof of delivery checks out"), E2("Fue un accidente: nadie salió herido", "It was an accident: no one was hurt")], sub: E2("Queda en la auditoría.", "It stays in the audit log."), nota: "interna", hacer: (m) => dlvResolver(i.id, m) }) }] : undefined })) }
      : { type: "empty", icon: "check", t: todas ? E2("Sin incidencias todavía", "No incidents yet") : E2("Ninguna incidencia abierta", "No open incidents"), s: E2("Un accidente que reporta un repartidor, un código del cliente que falla varias veces o lo que abre el equipo sale aquí y en Colas.", "An accident a driver reports, a customer code that fails several times, or anything the team opens shows here and in Queues.") });
  }
  return <div style={{ display: "flex", flexDirection: "column", gap: 14 }}><PanelBloques bloques={B} h1={desk ? 26 : 22} /><Toast t={toast} desk={desk} /></div>;
}
