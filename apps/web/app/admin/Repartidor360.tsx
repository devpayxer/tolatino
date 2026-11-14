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
import { KIND_INC, cuandoDlv } from "./Repartidores";

const VEH: Record<string, string> = { pie: "a pie", bici: "bici", moto: "moto", auto: "auto", camioneta: "camioneta" };
const SK: Record<string, string> = { aviso: "AVISO", suspension: "SUSPENSIÓN", baneo: "BANEO" };
const PR: Record<string, string> = { foto: "foto", codigo: "código", negocio: "el negocio" };
const money = (c: number) => `$${(c / 100).toFixed(2)}`;
const tel = (p: string) => p.replace(/^\+1(\d{3})(\d{3})(\d{4})$/, "($1) $2-$3");

export function Repartidor360({ r, puede }: { r: Rep360; puede: { editar: boolean; sancionar: boolean; banear: boolean; usuarios: boolean } }) {
  const router = useRouter(), w = useAncho(), desk = w >= 1024;
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast();
  const hecho = (x: ResAdm) => { setToast(x.mensaje ?? "Listo. Quedó en la auditoría."); setConf(null); router.refresh(); };
  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: "REPARTIDOR", t: r.nombre, onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>);
  const abiertas = r.incid.filter((i) => i.status === "open");
  const sancionar = () => setConf({ titulo: "Sancionar a este repartidor", cta: "Sancionar", peligro: true,
    sub: "El motivo le llega por mensaje y queda en la auditoría. Suspendido: no se pone en línea ni recibe ofertas. Baneado: sale de todos sus equipos (solo un Admin).",
    elegir: { label: "SANCIÓN", items: [{ k: "aviso", l: "Aviso" }, { k: "suspension", l: "Suspender" }, ...(puede.banear ? [{ k: "baneo", l: "Banear" }] : [])] },
    valor: { k: "DÍAS DE SUSPENSIÓN (1 A 90; SOLO SI SUSPENDES)", ini: "7", max: 2 },
    plantillas: ["Entregas sin prueba repetidas", "Trato irrespetuoso con un cliente", "Cobró de más en efectivo", "No entregó pedidos que aceptó"],
    hacer: (m, e, v) => dlvSancionar(r.id, e ?? "", v, m, abiertas[0]?.id ?? null) });
  const B: Bloque[] = [
    { type: "head", eye: `REPARTIDOR · DESDE ${r.creado}`, t: r.nombre, s: `${tel(r.tel)}${r.equipos.length ? ` · ${r.equipos.filter((e) => e.estado === "active").map((e) => e.negocio).join(", ") || "sin equipo activo"}` : ""}`,
      onBack: () => router.push("/admin/repartidores"), h1: desk ? 26 : 22 },
  ];
  if (r.sancion) B.push({ type: "note", tone: "danger", icon: "lock", t: r.sancion === "baneo" ? "Baneado: no puede repartir en To’Latino." : "Suspendido: no se pone en línea ni recibe ofertas." });
  B.push({ type: "kpis", cols: desk ? "repeat(6,minmax(0,1fr))" : "repeat(3,minmax(0,1fr))", items: [
    { k: "ENTREGAS 30 D", v: String(r.kpi.entregas30), bg: "var(--tl-ink)", fg: "var(--tl-white)" }, { k: "EN CURSO", v: String(r.kpi.enCurso) },
    { k: "CON PRUEBA 30 D", v: String(r.kpi.conPrueba30) }, { k: "PROBLEMAS 30 D", v: String(r.kpi.problemas30) },
    { k: "OFERTAS DEL NEGOCIO 30 D", v: String(r.kpi.ofertas30) }, { k: "ACEPTADAS", v: String(r.kpi.aceptadas30) },
  ] });
  const acts = [
    ...(puede.sancionar ? [{ l: "Sancionar", v: "danger", icon: "lock", onClick: sancionar }] : []),
    ...(puede.editar ? [{ l: "Abrir incidencia", v: "secondary", icon: "warning", onClick: () => setConf({ titulo: "Abrir una incidencia", cta: "Abrir", sub: "Va a Colas (cola «Incidencias de entrega») con su plazo. El número de pedido es opcional.",
      valor: { k: "PEDIDO # (0 SI NO ES DE UN PEDIDO)", ini: "0", max: 12 }, plantillas: ["Un cliente dice que no recibió su pedido", "Un negocio reporta un problema con este repartidor"], hacer: (m, _e, v) => dlvAbrir(r.id, v, m) }) }] : []),
    ...(puede.usuarios ? [{ l: "Ver su cuenta", v: "secondary", icon: "users", onClick: () => router.push(`/admin/usuarios/${r.id}`) }] : []),
  ];
  if (acts.length) B.push({ type: "acts", items: acts });
  B.push({ type: "rows", k: "EQUIPOS", cols: desk ? "repeat(2,minmax(0,1fr))" : "1fr", items: r.equipos.map((e): Fila => ({ key: e.id, icon: "store", t: e.negocio,
    s: [e.vehiculo ? VEH[e.vehiculo] : null, e.desde ? `desde ${e.desde}` : null, e.estado === "removed" ? `salió${e.motivo ? `: ${e.motivo}` : ""}` : null].filter(Boolean).join(" · "),
    tag: e.estado === "removed" ? "FUERA" : e.enLinea ? "EN LÍNEA" : null, tone: e.estado === "removed" ? "neutral" : "signal", chev: true, onClick: () => router.push(`/admin/negocios/${e.negocioId}`) })) });
  B.push({ type: "rows", k: `INCIDENCIAS · ${abiertas.length} ${abiertas.length === 1 ? "ABIERTA" : "ABIERTAS"}`, items: r.incid.length ? r.incid.map((i): Fila => ({ key: i.id, icon: i.kind === "accidente" ? "warning" : "truck",
    t: `${KIND_INC[i.kind] ?? "INCIDENCIA"}${i.numero ? ` · #${i.numero}` : ""}${i.negocio ? ` · ${i.negocio}` : ""}`, s: [i.nota.es, cuandoDlv(i.at), i.status === "resolved" ? `Resuelta${i.quien ? ` por ${i.quien}` : ""}: ${i.resolucion ?? ""}` : null].filter(Boolean).join(" · "),
    tag: i.status === "open" ? "ABIERTA" : "RESUELTA", tone: i.status === "open" ? "action" : "neutral", chev: false,
    acts: [...(i.foto ? [{ l: "Ver foto", v: "secondary", icon: "image", onClick: () => window.open(`/api/entrega/foto/${i.foto}`, "_blank", "noopener") }] : []),
      ...(i.status === "open" && puede.editar ? [{ l: "Resolver", v: "secondary", icon: "check", onClick: () => setConf({ titulo: "¿Cómo se resolvió?", cta: "Resolver", sub: "Queda en la auditoría.",
        plantillas: ["Hablamos con el repartidor y el negocio", "La prueba de la entrega está bien", "Fue un accidente: nadie salió herido"], hacer: (m) => dlvResolver(i.id, m) }) }] : [])] }))
    : [{ icon: "check", t: "Sin incidencias", chev: false, compact: true }] });
  B.push({ type: "rows", k: "SANCIONES", items: r.sanciones.length ? r.sanciones.map((x): Fila => ({ key: x.id, icon: "lock", t: `${SK[x.kind] ?? x.kind}${x.until && x.kind === "suspension" ? ` · hasta ${cuandoDlv(x.until)}` : ""}`,
    s: [x.reason, `${x.por ?? "Equipo"} · ${cuandoDlv(x.at)}`, x.lifted ? `Levantada ${cuandoDlv(x.lifted)}: ${x.liftReason ?? ""}` : null].filter(Boolean).join(" · "),
    tag: x.vigente ? "VIGENTE" : x.lifted ? "LEVANTADA" : x.kind === "aviso" ? "AVISO" : "VENCIDA", tone: x.vigente ? "danger" : "neutral", chev: false,
    acts: x.vigente && puede.sancionar && (x.kind !== "baneo" || puede.banear) ? [{ l: "Levantar", v: "secondary", onClick: () => setConf({ titulo: "Levantar la sanción", cta: "Levantar", sub: "Le llega el aviso y queda en la auditoría.",
      plantillas: ["Se aclaró con el negocio", "Cumplió el tiempo acordado", "Fue un error"], hacer: (m) => dlvLevantar(x.id, m) }) }] : undefined }))
    : [{ icon: "check", t: "Sin sanciones", chev: false, compact: true }] });
  B.push({ type: "rows", k: "ÚLTIMAS ENTREGAS", cols: desk ? "repeat(2,minmax(0,1fr))" : "1fr", items: r.entregas.length ? r.entregas.map((e): Fila => ({ key: e.numero, icon: "bag", t: `#${e.numero} · ${e.negocio}`,
    s: [cuandoDlv(e.at), e.prueba ? `prueba: ${e.prueba.split(",").map((p) => PR[p] ?? p).join(" · ")}` : e.estado === "Entregado" ? "sin prueba" : null, e.efectivo ? `efectivo ${money(e.efectivo)}` : null].filter(Boolean).join(" · "),
    tag: e.estado.toUpperCase(), tone: e.estado === "Entregado" ? "signal" : "neutral", chev: false,
    acts: e.foto ? [{ l: "Ver foto", v: "secondary", icon: "image", onClick: () => window.open(`/api/entrega/foto/${e.foto}`, "_blank", "noopener") }] : undefined }))
    : [{ icon: "truck", t: "Todavía no tiene entregas", chev: false, compact: true }] });
  B.push({ type: "note", tone: "ink", icon: "shield", t: "El repartidor nunca ve el teléfono del cliente ni sus códigos. La foto de la entrega es privada: cada vez que alguien del equipo la abre, queda en la auditoría." });
  return <div style={{ display: "flex", flexDirection: "column", gap: 14 }}><PanelBloques bloques={B} h1={desk ? 26 : 22} /><Toast t={toast} desk={desk} /></div>;
}
