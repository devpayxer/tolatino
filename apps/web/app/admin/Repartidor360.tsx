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
import { useE2 } from "./idioma-admin";
import { numVisible } from "@/lib/reparto-comun";

type EF = (es: string, en: string) => string;

const VEH = (E2: EF): Record<string, string> => ({ pie: E2("a pie", "on foot"), bici: E2("bici", "bike"), moto: E2("moto", "motorcycle"), auto: E2("auto", "car"), camioneta: E2("camioneta", "van") });
const SK = (E2: EF): Record<string, string> => ({ aviso: E2("AVISO", "WARNING"), suspension: E2("SUSPENSIÓN", "SUSPENSION"), baneo: E2("BANEO", "BAN") });
const PR = (E2: EF): Record<string, string> => ({ foto: E2("foto", "photo"), codigo: E2("código", "code"), negocio: E2("el negocio", "the business") });
const EST = (E2: EF): Record<string, string> => ({ Entregado: E2("ENTREGADO", "DELIVERED"), "En curso": E2("EN CURSO", "IN PROGRESS"), Cancelado: E2("CANCELADO", "CANCELLED") });
const money = (c: number) => `$${(c / 100).toFixed(2)}`;
const tel = (p: string) => p.replace(/^\+1(\d{3})(\d{3})(\d{4})$/, "($1) $2-$3");

export function Repartidor360({ r, puede }: { r: Rep360; puede: { editar: boolean; sancionar: boolean; banear: boolean; usuarios: boolean } }) {
  const router = useRouter(), w = useAncho(), desk = w >= 1024, { E2 } = useE2(), en = E2("", "x") === "x", veh = VEH(E2), sk = SK(E2), pr = PR(E2), est = EST(E2);
  const cuandoDlv = (iso: string) => cuandoEs(iso, en);
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast();
  const hecho = (x: ResAdm) => { setToast(x.mensaje ?? E2("Listo. Quedó en la auditoría.", "Done. It’s in the audit log.")); setConf(null); router.refresh(); };
  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: E2("REPARTIDOR", "DRIVER"), t: r.nombre, onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>);
  const abiertas = r.incid.filter((i) => i.status === "open");
  const sancionar = () => setConf({ titulo: E2("Sancionar a este repartidor", "Sanction this driver"), cta: E2("Sancionar", "Sanction"), peligro: true,
    sub: E2("El motivo le llega por mensaje y queda en la auditoría. Suspendido: no se pone en línea ni recibe ofertas. Baneado: sale de todos sus equipos (solo un Admin).",
      "They get the reason by message and it stays in the audit log. Suspended: can’t go online or get offers. Banned: removed from all their teams (Admins only)."),
    elegir: { label: E2("SANCIÓN", "SANCTION"), items: [{ k: "aviso", l: E2("Aviso", "Warning") }, { k: "suspension", l: E2("Suspender", "Suspend") }, ...(puede.banear ? [{ k: "baneo", l: E2("Banear", "Ban") }] : [])] },
    valor: { k: E2("DÍAS DE SUSPENSIÓN (1 A 90; SOLO SI SUSPENDES)", "SUSPENSION DAYS (1 TO 90; ONLY IF SUSPENDING)"), ini: "7", max: 2 },
    plantillas: [E2("Entregas sin prueba repetidas", "Repeated deliveries without proof"), E2("Trato irrespetuoso con un cliente", "Disrespectful to a customer"), E2("Cobró de más en efectivo", "Overcharged in cash"), E2("No entregó pedidos que aceptó", "Didn’t deliver orders they accepted")],
    nota: "persona", hacer: (m, e, v) => dlvSancionar(r.id, e ?? "", v, m, abiertas[0]?.id ?? null) });
  const B: Bloque[] = [
    { type: "head", eye: E2(`REPARTIDOR · DESDE ${r.creado}`, `DRIVER · SINCE ${r.creado}`), t: r.nombre, s: `${tel(r.tel)}${r.equipos.length ? ` · ${r.equipos.filter((e) => e.estado === "active").map((e) => e.negocio).join(", ") || E2("sin equipo activo", "no active team")}` : ""}`,
      onBack: () => router.push("/admin/repartidores"), h1: desk ? 26 : 22 },
  ];
  if (r.sancion) B.push({ type: "note", tone: "danger", icon: "lock", t: r.sancion === "baneo" ? E2("Baneado: no puede repartir en To’Latino.", "Banned: can’t deliver on To’Latino.") : E2("Suspendido: no se pone en línea ni recibe ofertas.", "Suspended: can’t go online or get offers.") });
  B.push({ type: "kpis", cols: desk ? "repeat(6,minmax(0,1fr))" : "repeat(3,minmax(0,1fr))", items: [
    { k: E2("ENTREGAS 30 D", "DELIVERIES 30 D"), v: String(r.kpi.entregas30), bg: "var(--tl-ink)", fg: "var(--tl-white)" }, { k: E2("EN CURSO", "IN PROGRESS"), v: String(r.kpi.enCurso) },
    { k: E2("CON PRUEBA 30 D", "WITH PROOF 30 D"), v: String(r.kpi.conPrueba30) }, { k: E2("PROBLEMAS 30 D", "PROBLEMS 30 D"), v: String(r.kpi.problemas30) },
    { k: E2("OFERTAS DEL NEGOCIO 30 D", "BUSINESS OFFERS 30 D"), v: String(r.kpi.ofertas30) }, { k: E2("ACEPTADAS", "ACCEPTED"), v: String(r.kpi.aceptadas30) },
  ] });
  const acts = [
    ...(puede.sancionar ? [{ l: E2("Sancionar", "Sanction"), v: "danger", icon: "lock", onClick: sancionar }] : []),
    ...(puede.editar ? [{ l: E2("Abrir incidencia", "Open incident"), v: "secondary", icon: "warning", onClick: () => setConf({ titulo: E2("Abrir una incidencia", "Open an incident"), cta: E2("Abrir", "Open"), sub: E2("Va a Colas (cola «Incidencias de entrega») con su plazo. El número de pedido es opcional.", "It goes to Queues (the “Delivery incidents” queue) with its deadline. The order number is optional."),
      valor: { k: E2("PEDIDO # (0 SI NO ES DE UN PEDIDO)", "ORDER # (0 IF NOT FROM AN ORDER)"), ini: "0", max: 12 }, plantillas: [E2("Un cliente dice que no recibió su pedido", "A customer says they didn’t get their order"), E2("Un negocio reporta un problema con este repartidor", "A business reports a problem with this driver")], nota: "interna", hacer: (m, _e, v) => dlvAbrir(r.id, v, m) }) }] : []),
    ...(puede.usuarios ? [{ l: E2("Ver su cuenta", "See their account"), v: "secondary", icon: "users", onClick: () => router.push(`/admin/usuarios/${r.id}`) }] : []),
  ];
  if (acts.length) B.push({ type: "acts", items: acts });
  B.push({ type: "rows", k: E2("EQUIPOS", "TEAMS"), cols: desk ? "repeat(2,minmax(0,1fr))" : "1fr", items: r.equipos.map((e): Fila => ({ key: e.id, icon: "store", t: e.negocio,
    s: [e.vehiculo ? veh[e.vehiculo] ?? e.vehiculo : null, e.desde ? E2(`desde ${e.desde}`, `since ${e.desde}`) : null, e.estado === "removed" ? E2(`salió${e.motivo ? `: ${e.motivo}` : ""}`, `left${e.motivo ? `: ${e.motivo}` : ""}`) : null].filter(Boolean).join(" · "),
    tag: e.estado === "removed" ? E2("FUERA", "REMOVED") : e.enLinea ? E2("EN LÍNEA", "ONLINE") : null, tone: e.estado === "removed" ? "neutral" : "signal", chev: true, onClick: () => router.push(`/admin/negocios/${e.negocioId}`) })) });
  B.push({ type: "rows", k: E2(`INCIDENCIAS · ${abiertas.length} ${abiertas.length === 1 ? "ABIERTA" : "ABIERTAS"}`, `INCIDENTS · ${abiertas.length} OPEN`), items: r.incid.length ? r.incid.map((i): Fila => ({ key: i.id, icon: i.kind === "accidente" ? "warning" : "truck",
    t: `${KIND_INC(E2)[i.kind] ?? E2("INCIDENCIA", "INCIDENT")}${i.numero ? ` · ${numVisible(i.numero)}` : ""}${i.negocio ? ` · ${i.negocio}` : ""}`, s: [en ? i.nota.en || i.nota.es : i.nota.es, cuandoDlv(i.at), i.status === "resolved" ? E2(`Resuelta${i.quien ? ` por ${i.quien}` : ""}: ${i.resolucion ?? ""}`, `Resolved${i.quien ? ` by ${i.quien}` : ""}: ${i.resolucion ?? ""}`) : null].filter(Boolean).join(" · "),
    tag: i.status === "open" ? E2("ABIERTA", "OPEN") : E2("RESUELTA", "RESOLVED"), tone: i.status === "open" ? "action" : "neutral", chev: false,
    acts: [...(i.foto ? [{ l: E2("Ver foto", "See photo"), v: "secondary", icon: "image", onClick: () => window.open(`/api/entrega/foto/${i.foto}`, "_blank", "noopener") }] : []),
      ...(i.status === "open" && puede.editar ? [{ l: E2("Resolver", "Resolve"), v: "secondary", icon: "check", onClick: () => setConf({ titulo: E2("¿Cómo se resolvió?", "How was it resolved?"), cta: E2("Resolver", "Resolve"), sub: E2("Queda en la auditoría.", "It stays in the audit log."),
        plantillas: [E2("Hablamos con el repartidor y el negocio", "We spoke with the driver and the business"), E2("La prueba de la entrega está bien", "The proof of delivery checks out"), E2("Fue un accidente: nadie salió herido", "It was an accident: no one was hurt")], nota: "interna", hacer: (m) => dlvResolver(i.id, m) }) }] : [])] }))
    : [{ icon: "check", t: E2("Sin incidencias", "No incidents"), chev: false, compact: true }] });
  B.push({ type: "rows", k: E2("SANCIONES", "SANCTIONS"), items: r.sanciones.length ? r.sanciones.map((x): Fila => ({ key: x.id, icon: "lock", t: `${sk[x.kind] ?? x.kind}${x.until && x.kind === "suspension" ? E2(` · hasta ${cuandoDlv(x.until)}`, ` · until ${cuandoDlv(x.until)}`) : ""}`,
    s: [x.reason, `${x.por ?? E2("Equipo", "Team")} · ${cuandoDlv(x.at)}`, x.lifted ? E2(`Levantada ${cuandoDlv(x.lifted)}: ${x.liftReason ?? ""}`, `Lifted ${cuandoDlv(x.lifted)}: ${x.liftReason ?? ""}`) : null].filter(Boolean).join(" · "),
    tag: x.vigente ? E2("VIGENTE", "ACTIVE") : x.lifted ? E2("LEVANTADA", "LIFTED") : x.kind === "aviso" ? E2("AVISO", "WARNING") : E2("VENCIDA", "EXPIRED"), tone: x.vigente ? "danger" : "neutral", chev: false,
    acts: x.vigente && puede.sancionar && (x.kind !== "baneo" || puede.banear) ? [{ l: E2("Levantar", "Lift"), v: "secondary", onClick: () => setConf({ titulo: E2("Levantar la sanción", "Lift the sanction"), cta: E2("Levantar", "Lift"), sub: E2("Le llega el aviso y queda en la auditoría.", "They get notified and it stays in the audit log."),
      plantillas: [E2("Se aclaró con el negocio", "Cleared up with the business"), E2("Cumplió el tiempo acordado", "Served the agreed time"), E2("Fue un error", "It was a mistake")], nota: "persona", hacer: (m) => dlvLevantar(x.id, m) }) }] : undefined }))
    : [{ icon: "check", t: E2("Sin sanciones", "No sanctions"), chev: false, compact: true }] });
  B.push({ type: "rows", k: E2("ÚLTIMAS ENTREGAS", "LATEST DELIVERIES"), cols: desk ? "repeat(2,minmax(0,1fr))" : "1fr", items: r.entregas.length ? r.entregas.map((e): Fila => ({ key: e.numero, icon: "bag", t: `${numVisible(e.numero)} · ${e.negocio}`,
    s: [cuandoDlv(e.at), e.prueba ? E2("prueba: ", "proof: ") + e.prueba.split(",").map((p) => pr[p] ?? p).join(" · ") : e.estado === "Entregado" ? E2("sin prueba", "no proof") : null, e.efectivo ? E2(`efectivo ${money(e.efectivo)}`, `cash ${money(e.efectivo)}`) : null].filter(Boolean).join(" · "),
    tag: est[e.estado] ?? e.estado.toUpperCase(), tone: e.estado === "Entregado" ? "signal" : "neutral", chev: false,
    acts: e.foto ? [{ l: E2("Ver foto", "See photo"), v: "secondary", icon: "image", onClick: () => window.open(`/api/entrega/foto/${e.foto}`, "_blank", "noopener") }] : undefined }))
    : [{ icon: "truck", t: E2("Todavía no tiene entregas", "No deliveries yet"), chev: false, compact: true }] });
  B.push({ type: "note", tone: "ink", icon: "shield", t: E2("El repartidor nunca ve el teléfono del cliente ni sus códigos. La foto de la entrega es privada: cada vez que alguien del equipo la abre, queda en la auditoría.", "The driver never sees the customer’s phone or their codes. The delivery photo is private: every time someone on the team opens it, it’s recorded in the audit log.") });
  return <div style={{ display: "flex", flexDirection: "column", gap: 14 }}><PanelBloques bloques={B} h1={desk ? 26 : 22} /><Toast t={toast} desk={desk} /></div>;
}

/* dinero fijo: super admin (cifras de contabilidad del equipo, siempre con dos decimales) */
