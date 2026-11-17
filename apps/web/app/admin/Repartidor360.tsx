"use client";
/* 9n · ADM-DLV · 360° de un repartidor (apps-delivery-checkin.md §1.5: entregas, calificación —todavía no hay—, documentos —solo para los de
   To'Latino, después de abrir—, sanciones; aprobar / suspender / banear). Compuesta con los bloques del sistema (REVISION). Sancionar pide el
   motivo (lo ve la persona) y queda en la auditoría; el baneo, solo un Admin, y lo levanta otra persona. */
import { PanelBloques, type PanelBloqueT as Bloque, type PanelFila as Fila } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Rep360 } from "@/lib/repartidor-admin";
import { dlvAbrir, dlvLevantar, dlvResolver, dlvSancionar } from "./acciones-repartidores";
import type { ResAdm } from "./acciones-colas";
import { ConfirmarMotivo, Toast, useAncho, useToast, type Confirmar } from "./Colas";
import { KIND_INC, cuandoDlv as cuandoEs } from "./Repartidores";
import { useE } from "./idioma-admin";
import { numVisible } from "@/lib/reparto-comun";

const VEH: Record<string, [string, string]> = { pie: ["a pie", "on foot"], bici: ["bici", "bike"], moto: ["moto", "motorcycle"], auto: ["auto", "car"], camioneta: ["camioneta", "van"] };
const SK: Record<string, [string, string]> = { aviso: ["AVISO", "WARNING"], suspension: ["SUSPENSIÓN", "SUSPENSION"], baneo: ["BANEO", "BAN"] };
const PR: Record<string, [string, string]> = { foto: ["foto", "photo"], codigo: ["código", "code"], negocio: ["el negocio", "the business"] };
const EST: Record<string, string> = { Entregado: "DELIVERED", "En curso": "IN PROGRESS", Cancelado: "CANCELLED" };
const money = (c: number) => `$${(c / 100).toFixed(2)}`;
const tel = (p: string) => p.replace(/^\+1(\d{3})(\d{3})(\d{4})$/, "($1) $2-$3");

export function Repartidor360({ r, puede }: { r: Rep360; puede: { editar: boolean; sancionar: boolean; banear: boolean; usuarios: boolean } }) {
  const router = useRouter(), w = useAncho(), desk = w >= 1024, E = useE(), en = E("", "x") === "x", li = en ? 1 : 0;
  const cuandoDlv = (iso: string) => cuandoEs(iso, en);
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast();
  const hecho = (x: ResAdm) => { setToast(x.mensaje ?? E("Listo. Quedó en la auditoría.", "Done. It’s in the audit log.")); setConf(null); router.refresh(); };
  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: E("REPARTIDOR", "DRIVER"), t: r.nombre, onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>);
  const abiertas = r.incid.filter((i) => i.status === "open");
  const sancionar = () => setConf({ titulo: E("Sancionar a este repartidor", "Sanction this driver"), cta: E("Sancionar", "Sanction"), peligro: true,
    sub: E("El motivo le llega por mensaje y queda en la auditoría. Suspendido: no se pone en línea ni recibe ofertas. Baneado: sale de todos sus equipos (solo un Admin).",
      "They get the reason by message and it stays in the audit log. Suspended: can’t go online or get offers. Banned: removed from all their teams (Admins only)."),
    elegir: { label: E("SANCIÓN", "SANCTION"), items: [{ k: "aviso", l: E("Aviso", "Warning") }, { k: "suspension", l: E("Suspender", "Suspend") }, ...(puede.banear ? [{ k: "baneo", l: E("Banear", "Ban") }] : [])] },
    valor: { k: E("DÍAS DE SUSPENSIÓN (1 A 90; SOLO SI SUSPENDES)", "SUSPENSION DAYS (1 TO 90; ONLY IF SUSPENDING)"), ini: "7", max: 2 },
    plantillas: [E("Entregas sin prueba repetidas", "Repeated deliveries without proof"), E("Trato irrespetuoso con un cliente", "Disrespectful to a customer"), E("Cobró de más en efectivo", "Overcharged in cash"), E("No entregó pedidos que aceptó", "Didn’t deliver orders they accepted")],
    hacer: (m, e, v) => dlvSancionar(r.id, e ?? "", v, m, abiertas[0]?.id ?? null) });
  const B: Bloque[] = [
    { type: "head", eye: E(`REPARTIDOR · DESDE ${r.creado}`, `DRIVER · SINCE ${r.creado}`), t: r.nombre, s: `${tel(r.tel)}${r.equipos.length ? ` · ${r.equipos.filter((e) => e.estado === "active").map((e) => e.negocio).join(", ") || E("sin equipo activo", "no active team")}` : ""}`,
      onBack: () => router.push("/admin/repartidores"), h1: desk ? 26 : 22 },
  ];
  if (r.sancion) B.push({ type: "note", tone: "danger", icon: "lock", t: r.sancion === "baneo" ? E("Baneado: no puede repartir en To’Latino.", "Banned: can’t deliver on To’Latino.") : E("Suspendido: no se pone en línea ni recibe ofertas.", "Suspended: can’t go online or get offers.") });
  B.push({ type: "kpis", cols: desk ? "repeat(6,minmax(0,1fr))" : "repeat(3,minmax(0,1fr))", items: [
    { k: E("ENTREGAS 30 D", "DELIVERIES 30 D"), v: String(r.kpi.entregas30), bg: "var(--tl-ink)", fg: "var(--tl-white)" }, { k: E("EN CURSO", "IN PROGRESS"), v: String(r.kpi.enCurso) },
    { k: E("CON PRUEBA 30 D", "WITH PROOF 30 D"), v: String(r.kpi.conPrueba30) }, { k: E("PROBLEMAS 30 D", "PROBLEMS 30 D"), v: String(r.kpi.problemas30) },
    { k: E("OFERTAS DEL NEGOCIO 30 D", "BUSINESS OFFERS 30 D"), v: String(r.kpi.ofertas30) }, { k: E("ACEPTADAS", "ACCEPTED"), v: String(r.kpi.aceptadas30) },
  ] });
  const acts = [
    ...(puede.sancionar ? [{ l: E("Sancionar", "Sanction"), v: "danger", icon: "lock", onClick: sancionar }] : []),
    ...(puede.editar ? [{ l: E("Abrir incidencia", "Open incident"), v: "secondary", icon: "warning", onClick: () => setConf({ titulo: E("Abrir una incidencia", "Open an incident"), cta: E("Abrir", "Open"), sub: E("Va a Colas (cola «Incidencias de entrega») con su plazo. El número de pedido es opcional.", "It goes to Queues (the “Delivery incidents” queue) with its deadline. The order number is optional."),
      valor: { k: E("PEDIDO # (0 SI NO ES DE UN PEDIDO)", "ORDER # (0 IF NOT FROM AN ORDER)"), ini: "0", max: 12 }, plantillas: [E("Un cliente dice que no recibió su pedido", "A customer says they didn’t get their order"), E("Un negocio reporta un problema con este repartidor", "A business reports a problem with this driver")], hacer: (m, _e, v) => dlvAbrir(r.id, v, m) }) }] : []),
    ...(puede.usuarios ? [{ l: E("Ver su cuenta", "See their account"), v: "secondary", icon: "users", onClick: () => router.push(`/admin/usuarios/${r.id}`) }] : []),
  ];
  if (acts.length) B.push({ type: "acts", items: acts });
  B.push({ type: "rows", k: E("EQUIPOS", "TEAMS"), cols: desk ? "repeat(2,minmax(0,1fr))" : "1fr", items: r.equipos.map((e): Fila => ({ key: e.id, icon: "store", t: e.negocio,
    s: [e.vehiculo ? VEH[e.vehiculo]?.[li] ?? e.vehiculo : null, e.desde ? E(`desde ${e.desde}`, `since ${e.desde}`) : null, e.estado === "removed" ? E(`salió${e.motivo ? `: ${e.motivo}` : ""}`, `left${e.motivo ? `: ${e.motivo}` : ""}`) : null].filter(Boolean).join(" · "),
    tag: e.estado === "removed" ? E("FUERA", "REMOVED") : e.enLinea ? E("EN LÍNEA", "ONLINE") : null, tone: e.estado === "removed" ? "neutral" : "signal", chev: true, onClick: () => router.push(`/admin/negocios/${e.negocioId}`) })) });
  B.push({ type: "rows", k: E(`INCIDENCIAS · ${abiertas.length} ${abiertas.length === 1 ? "ABIERTA" : "ABIERTAS"}`, `INCIDENTS · ${abiertas.length} OPEN`), items: r.incid.length ? r.incid.map((i): Fila => ({ key: i.id, icon: i.kind === "accidente" ? "warning" : "truck",
    t: `${KIND_INC[i.kind]?.[li] ?? E("INCIDENCIA", "INCIDENT")}${i.numero ? ` · ${numVisible(i.numero)}` : ""}${i.negocio ? ` · ${i.negocio}` : ""}`, s: [en ? i.nota.en || i.nota.es : i.nota.es, cuandoDlv(i.at), i.status === "resolved" ? E(`Resuelta${i.quien ? ` por ${i.quien}` : ""}: ${i.resolucion ?? ""}`, `Resolved${i.quien ? ` by ${i.quien}` : ""}: ${i.resolucion ?? ""}`) : null].filter(Boolean).join(" · "),
    tag: i.status === "open" ? E("ABIERTA", "OPEN") : E("RESUELTA", "RESOLVED"), tone: i.status === "open" ? "action" : "neutral", chev: false,
    acts: [...(i.foto ? [{ l: E("Ver foto", "See photo"), v: "secondary", icon: "image", onClick: () => window.open(`/api/entrega/foto/${i.foto}`, "_blank", "noopener") }] : []),
      ...(i.status === "open" && puede.editar ? [{ l: E("Resolver", "Resolve"), v: "secondary", icon: "check", onClick: () => setConf({ titulo: E("¿Cómo se resolvió?", "How was it resolved?"), cta: E("Resolver", "Resolve"), sub: E("Queda en la auditoría.", "It stays in the audit log."),
        plantillas: [E("Hablamos con el repartidor y el negocio", "We spoke with the driver and the business"), E("La prueba de la entrega está bien", "The proof of delivery checks out"), E("Fue un accidente: nadie salió herido", "It was an accident: no one was hurt")], hacer: (m) => dlvResolver(i.id, m) }) }] : [])] }))
    : [{ icon: "check", t: E("Sin incidencias", "No incidents"), chev: false, compact: true }] });
  B.push({ type: "rows", k: E("SANCIONES", "SANCTIONS"), items: r.sanciones.length ? r.sanciones.map((x): Fila => ({ key: x.id, icon: "lock", t: `${SK[x.kind]?.[li] ?? x.kind}${x.until && x.kind === "suspension" ? E(` · hasta ${cuandoDlv(x.until)}`, ` · until ${cuandoDlv(x.until)}`) : ""}`,
    s: [x.reason, `${x.por ?? E("Equipo", "Team")} · ${cuandoDlv(x.at)}`, x.lifted ? E(`Levantada ${cuandoDlv(x.lifted)}: ${x.liftReason ?? ""}`, `Lifted ${cuandoDlv(x.lifted)}: ${x.liftReason ?? ""}`) : null].filter(Boolean).join(" · "),
    tag: x.vigente ? E("VIGENTE", "ACTIVE") : x.lifted ? E("LEVANTADA", "LIFTED") : x.kind === "aviso" ? E("AVISO", "WARNING") : E("VENCIDA", "EXPIRED"), tone: x.vigente ? "danger" : "neutral", chev: false,
    acts: x.vigente && puede.sancionar && (x.kind !== "baneo" || puede.banear) ? [{ l: E("Levantar", "Lift"), v: "secondary", onClick: () => setConf({ titulo: E("Levantar la sanción", "Lift the sanction"), cta: E("Levantar", "Lift"), sub: E("Le llega el aviso y queda en la auditoría.", "They get notified and it stays in the audit log."),
      plantillas: [E("Se aclaró con el negocio", "Cleared up with the business"), E("Cumplió el tiempo acordado", "Served the agreed time"), E("Fue un error", "It was a mistake")], hacer: (m) => dlvLevantar(x.id, m) }) }] : undefined }))
    : [{ icon: "check", t: E("Sin sanciones", "No sanctions"), chev: false, compact: true }] });
  B.push({ type: "rows", k: E("ÚLTIMAS ENTREGAS", "LATEST DELIVERIES"), cols: desk ? "repeat(2,minmax(0,1fr))" : "1fr", items: r.entregas.length ? r.entregas.map((e): Fila => ({ key: e.numero, icon: "bag", t: `${numVisible(e.numero)} · ${e.negocio}`,
    s: [cuandoDlv(e.at), e.prueba ? E("prueba: ", "proof: ") + e.prueba.split(",").map((p) => PR[p]?.[li] ?? p).join(" · ") : e.estado === "Entregado" ? E("sin prueba", "no proof") : null, e.efectivo ? E(`efectivo ${money(e.efectivo)}`, `cash ${money(e.efectivo)}`) : null].filter(Boolean).join(" · "),
    tag: en ? EST[e.estado] ?? e.estado.toUpperCase() : e.estado.toUpperCase(), tone: e.estado === "Entregado" ? "signal" : "neutral", chev: false,
    acts: e.foto ? [{ l: E("Ver foto", "See photo"), v: "secondary", icon: "image", onClick: () => window.open(`/api/entrega/foto/${e.foto}`, "_blank", "noopener") }] : undefined }))
    : [{ icon: "truck", t: E("Todavía no tiene entregas", "No deliveries yet"), chev: false, compact: true }] });
  B.push({ type: "note", tone: "ink", icon: "shield", t: E("El repartidor nunca ve el teléfono del cliente ni sus códigos. La foto de la entrega es privada: cada vez que alguien del equipo la abre, queda en la auditoría.", "The driver never sees the customer’s phone or their codes. The delivery photo is private: every time someone on the team opens it, it’s recorded in the audit log.") });
  return <div style={{ display: "flex", flexDirection: "column", gap: 14 }}><PanelBloques bloques={B} h1={desk ? 26 : 22} /><Toast t={toast} desk={desk} /></div>;
}
