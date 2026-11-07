"use client";
/* ADM-NEG · 360° (Super Admin.dc.html negDetail): el negocio como lo ve el cliente, como lo edita el dueño y lo que
   hizo el equipo. Pestañas: Resumen, Ficha, Lo que vende, Dinero (2o), Equipo, Contenido y Confianza (Operación llega con
   Analítica). Cada acción pide motivo y queda en la auditoría. */
import * as UI from "@tolatino/ui";
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ComponentType, type ReactNode } from "react";
import type { Dinero } from "@/lib/admin-dinero";
import type { Negocio360 } from "@/lib/admin-negocios";
import { fmtHora } from "@/lib/panel-reglas";
import { KINDS_LOCAL } from "@/lib/noche-comun";
import { cambiarEstado, tipoNoche, cierreTemporal, editarCampo, foto, licencia, moduloPausar, nota, novedadOcultar, vacanteOcultar, platoOcultar, reabrir, resenaOcultar, restaurar, sello, staffPagina } from "./acciones-negocios";
import type { ResAdm } from "./acciones-colas";
import { ConfirmarMotivo, Toast, useAncho, useToast, type Confirmar } from "./Colas";
import { N360Dinero } from "./N360Dinero";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const A = UI as unknown as Record<"AdminNote" | "AdminList" | "AuditLog" | "HBars" | "Icon", ComponentType<any>>;
const BIZ = ["Varios reportes coinciden", "El negocio no responde a To’Latino", "Datos de contacto falsos", "Se resolvió con el dueño"];
const FOTO = ["No es de este negocio", "Contenido inapropiado", "Muestra datos personales", "Es publicidad o spam"];
const SELLO_NO = ["La dirección no coincide con la página", "No pudimos confirmar que representas el negocio", "Las fotos no son del local", "El nombre puede confundirse con otro negocio"];
/* Verbo de cada acción en el historial (prototipo actL). */
const VERBO: Record<string, string> = {
  "resena.ocultar": "ocultó una reseña de", "resena.mostrar": "volvió a mostrar una reseña de", "novedad.ocultar": "ocultó una novedad de", "novedad.mostrar": "volvió a mostrar una novedad de",
  "vacante.ocultar": "ocultó una vacante de", "vacante.mostrar": "volvió a mostrar una vacante de", "comentario.ocultar": "ocultó un comentario en", "comentario.mostrar": "volvió a mostrar un comentario en",
  "negocio.modulo.pausar": "pausó un módulo de", "negocio.modulo.reanudar": "reanudó un módulo de", "negocio.noche.tipo": "ajustó el tipo de local de",
  "negocio.ocultar": "ocultó", "negocio.suspender": "suspendió", "negocio.cerrar": "cerró", "negocio.restaurar": "restauró", "negocio.cierre_temporal": "cerró temporalmente",
  "negocio.reabrir": "reabrió", "negocio.dueno.cambiar": "cambió el dueño de", "negocio.pagos.pausar": "pausó los pagos al banco de", "plan.cortesia": "dio Pro de cortesía a", "plan.quitar_cortesia": "quitó la cortesía a", "plan.extender_prueba": "extendió la prueba de", "plan.reintentar_cobro": "reintentó el cobro de Pro de", "plan.anular": "anuló la suscripción de",  "negocio.pagos.reanudar": "reanudó los pagos al banco de", "negocio.sello.dar": "dio el sello a", "negocio.sello.quitar": "quitó el sello a", "negocio.sello.aprobar": "aprobó el sello de",
  "negocio.sello.pedir_dato": "pidió un dato a", "negocio.sello.rechazar": "no aprobó el sello de", "negocio.editar": "editó", "negocio.foto.quitar": "quitó una foto de",
  "negocio.foto.restaurar": "restauró una foto de", "negocio.staff.quitar": "quitó de la página a alguien de", "negocio.staff.mostrar": "volvió a mostrar a alguien de",
  "negocio.nota": "agregó una nota a", "negocio.revisado": "revisó", "licencia.verificar": "verificó la licencia de", "licencia.vencida": "marcó vencida la licencia de", "licencia.no_aparece": "no encontró la licencia de",
};
const DIAS = [["Lunes", 1], ["Martes", 2], ["Miércoles", 3], ["Jueves", 4], ["Viernes", 5], ["Sábado", 6], ["Domingo", 0]] as const;
const fecha = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("es-US", { day: "numeric", month: "short", year: "numeric" }) : "—");
const hace = (iso: string) => { const h = (Date.now() - new Date(iso).getTime()) / 3_600_000; return h < 1 ? "hace un momento" : h < 24 ? `hace ${Math.floor(h)} h` : `hace ${Math.floor(h / 24)} d`; };
const val = (x: unknown) => (x && typeof x === "object" ? Object.values(x as Record<string, unknown>).filter((v) => typeof v === "string" || typeof v === "number").join(" · ") : String(x ?? "—"));

/* Cómo cobra un servicio de Auto u Hogar (4a), para el Super Admin. */
const KIND_L: Record<string, string> = { fijo: "Precio cerrado", desde: "Desde · estimado", cotiza: "Se cotiza", diag: "Diagnóstico", lav: "Por tamaño", goma: "Por goma", insp: "Inspección", grua: "Grúa · se llama",
  visita: "Visita", hora: "Por hora", area: "Por medida", pres: "Presupuesto", emer: "Emergencia 24/7", plan: "Plan", pack: "Paquete", unid: "Por unidad", asiento: "Por asiento", priv: "Vehículo completo", caja: "Caja o envío", cover: "Entrada (sigue al cover)", lista: "Lista", mesa: "Mesa", vip: "VIP", evento: "Noche especial (espera a Eventos)", fecha: "Por fecha" };
/* Las categorías con «Lo que vende» en el 360: la pestaña y su contenido salen de la MISMA lista (guardián pestanaVende). */
const VENDE_SVC = ["NEG-BELL", "NEG-AUTO", "NEG-HOGAR", "NEG-SALUD", "NEG-PRO", "NEG-FIESTA", "NEG-TRANS", "NEG-NOCHE", "NEG-EDU"];
const VENDE_RET = ["NEG-MERC", "NEG-TIENDA"];
const VENDE = ["NEG-FOOD", ...VENDE_SVC, ...VENDE_RET];
export function N360({ n, tab, din }: { n: Negocio360; tab: string; din?: Dinero | null }) {
  const router = useRouter(), w = useAncho(), desk = w >= 1024;
  const [toast, setToast] = useToast();
  const [conf, setConf] = useState<Confirmar | null>(null);
  const [pend] = useTransition();
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? "Listo. Quedó en la auditoría."); setConf(null); router.refresh(); };
  const P = n.puede, ir = (t: string) => router.push(`/admin/negocios/${n.id}${t === "resumen" ? "" : `?tab=${t}`}`, { scroll: false });
  const malo = ["oculto", "susp", "cerrado"].includes(n.estado);
  const stL = n.estado === "susp" ? "SUSPENDIDO" : n.estado === "oculto" ? "OCULTO" : n.estado === "cerrado" ? "CERRADO" : n.plan === "pro" ? (n.verified ? "PRO · VERIFICADO" : "PRO · SIN SELLO") : "FREE";
  const casosAbiertos = n.casos.filter((c) => c.status === "open");
  const cab: (Bloque | null)[] = [
    { type: "hero", t: n.name, s: `${n.cat}${n.subs ? ` · ${n.subs}` : ""} · ${n.ciudad}`, ph: n.fotos[0]?.status === "visible" ? `url("${n.fotos[0].url}")` : "", ini: n.fotos[0]?.status === "visible" ? "" : n.name.slice(0, 1),
      st: stL, stFg: malo ? "var(--tl-pro)" : "var(--tl-signal)", stDot: malo ? "var(--tl-pro)" : "var(--tl-signal)", kn: desk ? 4 : 2,
      kpis: [
        { v: n.reviews ? `${n.rating?.toFixed(1) ?? "—"} ★` : "Nuevo", k: `${n.reviews} RESEÑAS` },
        { v: String(n.cifras.v30), k: "VISTAS · 30 D" },
        { v: String(n.cifras.c30), k: "CONTACTOS · 30 D" },
        { v: n.mi != null ? `${n.mi} mi` : "—", k: "DEL CENTRO" },
      ],
      acts: n.status === "active" ? [{ l: "Ver como cliente", icon: "search", onClick: () => window.open(`/n/${n.id}`, "_blank") }] : [] },
  ];
  const notasEstado: ReactNode[] = [];
  if (malo) notasEstado.push(<A.AdminNote key="e" tone="bad" icon="ban" cta={P.retirar ? "Restaurar" : undefined} onCta={() => setConf({ titulo: "¿Por qué se restaura?", hacer: (m) => restaurar(n.id, m) })}>
    {`${n.estado === "cerrado" ? "Cerrado" : n.estado === "susp" ? "Suspendido" : "Oculto"}: ${n.status_reason ?? "sin motivo"} · No sale en búsquedas ni en la categoría; el dueño ve el motivo en su panel.`}</A.AdminNote>);
  else if (n.temp_until && new Date(n.temp_until).getTime() > Date.now()) notasEstado.push(<A.AdminNote key="t" tone="warn" icon="clock" cta={P.editar ? "Reabrir" : undefined} onCta={() => setConf({ titulo: "¿Por qué se reabre?", hacer: (m) => reabrir(n.id, m) })}>
    {`Cerrado temporalmente hasta el ${fecha(n.temp_until)}: ${n.temp_reason ?? ""}. La ficha dice «Cerrado temporalmente».`}</A.AdminNote>);
  const LIC_ST: Record<string, [string, string, string]> = { valid: ["Verificada", "VERIFICADA", "signal"], review: ["Pide revisión", "EN REVISIÓN", "action"], expired: ["Vencida según el registro", "VENCIDA", "danger"], not_found: ["No se pudo verificar", "NO", "danger"], revoked: ["No se pudo verificar", "NO", "danger"] };
  const licPeor = n.licencias.find((l) => l.status === "review") ?? n.licencias.find((l) => l.status !== "valid") ?? n.licencias[0];
  const tabs: Bloque = { type: "tabs", items: [["resumen", "Resumen"], ["ficha", "Ficha"], ...(VENDE.includes(n.cat_id) ? [["vende", "Lo que vende"]] : []), ...(din !== undefined ? [["din", "Dinero"]] : []), ["equipo", "Equipo"], ["cont", "Contenido"], ["confianza", "Confianza"]].map(([k, l]) => ({ l: l!, n: k === "confianza" && casosAbiertos.length ? String(casosAbiertos.length) : undefined, on: tab === k, onClick: () => ir(k!) })) };

  const historial = (filtro?: (a: string) => boolean): ReactNode => {
    const h = n.historial.filter((x) => !filtro || filtro(x.action));
    return h.length ? <A.AuditLog rows={h.map((x) => ({ who: x.quien ?? "Equipo", initials: (x.quien ?? "E").slice(0, 1), action: `${VERBO[x.action] ?? x.action} ${n.name}`, before: val(x.before), after: val(x.after), why: x.reason ?? undefined, when: hace(x.at) }))} />
      : <A.AdminNote tone="info" icon="folder">Nadie del equipo ha hecho cambios aquí todavía.</A.AdminNote>;
  };

  let cuerpo: ReactNode;
  if (tab === "ficha") {
    const vis = n.fotos.filter((f) => f.status === "visible"), quit = n.fotos.filter((f) => f.status !== "visible");
    const campo = (k: "name" | "about" | "phone" | "address", t: string, v: string, area = false) => ({
      icon: "edit", title: t, sub: v || "—", tag: n.admin_edits?.[k] ? "EDITADO POR TO’LATINO" : undefined, tone: "action",
      actions: P.editar ? [{ label: "Editar", variant: "secondary", onClick: () => setConf({ titulo: `Editar en nombre del negocio · ${t}`, sub: "El dueño ve el cambio y el motivo en su panel. Queda en el historial.", cta: "Guardar", valor: { k: `NUEVO VALOR · ${t.toUpperCase()}`, ini: v, area, max: k === "about" ? 300 : k === "address" ? 160 : 80 }, hacer: (m, _e, valor) => editarCampo(n.id, k, valor, m) }) }] : undefined,
    });
    cuerpo = (
      <>
        <A.AdminNote tone="info" icon="store">Así lo ve el cliente y así lo edita el negocio. Si editas en su nombre, queda en el historial y el dueño lo ve en su panel.</A.AdminNote>
        {vis[0] ? <div style={{ height: 220, borderRadius: 18, backgroundImage: `url("${vis[0].url}")`, backgroundSize: "cover", backgroundPosition: "center", backgroundColor: "var(--tl-photo-bg)" }} /> : null}
        <A.AdminList label={`FOTOS DEL NEGOCIO · ${vis.length}${quit.length ? ` · ${quit.length} QUITADAS` : ""}`} rows={n.fotos.map((f, i) => ({
          image: f.url, imageSize: 52, title: f.status === "visible" ? (i === 0 ? "Portada" : `Foto ${i + 1}`) : "Foto", sub: f.status === "visible" ? "La sube el negocio" : `Quitada: ${f.removed_note ?? ""}`,
          tag: f.status !== "visible" ? "QUITADA" : undefined, tone: "danger",
          actions: P.retirar ? (f.status === "visible" ? (vis.length > 1 ? [{ label: "Quitar", variant: "danger", onClick: () => setConf({ titulo: "¿Por qué se quita esta foto?", plantillas: FOTO, peligro: true, hacer: (m) => foto(n.id, f.id, true, m) }) }] : [])
            : [{ label: "Restaurar", variant: "secondary", onClick: () => setConf({ titulo: "¿Por qué vuelve esta foto?", plantillas: ["No rompe las reglas del barrio", "El reporte no trae evidencia"], hacer: (m) => foto(n.id, f.id, false, m) }) }]) : undefined,
        }))} />
        {vis.length === 1 ? <A.AdminNote tone="info" icon="image">Es la única foto visible: para quitarla, pide al dueño que suba otra.</A.AdminNote> : null}
        <A.AdminList label="LO QUE VE EL CLIENTE" rows={[campo("name", "Nombre", n.name), campo("about", "Quiénes somos", n.about?.es ?? "", true), { icon: "grid", title: "Categoría y subcategorías", sub: `${n.cat}${n.subs ? ` · ${n.subs}` : ""}` }, campo("phone", "Teléfono", n.phone), campo("address", "Dirección", n.address ?? "")]} />
        <PanelBloques bloques={[{ type: "group", k: "HORARIO" }, { type: "kv", cols: 2, items: DIAS.map(([d], i) => { const x = n.horas[i]!; return { k: d.toUpperCase(), v: x.on ? `${fmtHora(x.a)} – ${fmtHora(x.b)}${x.two ? ` · ${fmtHora(x.a2)} – ${fmtHora(x.b2)}` : ""}` : "Cerrado", fg: x.on ? undefined : "rgba(11,14,18,.45)" }; }) }]} />
      </>);
  } else if (tab === "vende" && n.cat_id === "NEG-FOOD") {
    const MOD: ["menu" | "pedidos" | "delivery" | "rsv", string, string][] = [["menu", "Menú", "La pestaña Menú de su página"], ["pedidos", "Pedidos en línea", `Que se pueda pedir desde su menú · ${n.pedidosMes} este mes${n.plan === "pro" ? "" : ` (${n.pedidosFree} de ${n.pedidosCap} con Free)`}`],
      ["delivery", "Delivery", "Que le lleven el pedido a la casa (la página ofrece solo pickup si se pausa)"],
      ["rsv", "Reservaciones", n.plan !== "pro" ? "Es de Pro: este negocio no la ofrece" : `${n.rsvOn ? "La pestaña Reservaciones de su página" : "Apagada por el dueño"} · ${n.rsvMes} este mes${n.rsvPend ? ` · ${n.rsvPend} esperan respuesta` : ""}`]];
    const PL = ["Platos que no corresponden a su categoría", "Precios o fotos engañosos", "Lo pidió el dueño", "Reportes de clientes"];
    const ocultos = n.menu.filter((i) => i.hidden).length;
    cuerpo = (
      <>
        <A.AdminList label="MÓDULOS" rows={MOD.map(([k, t, sub]) => { const off = n.modsOff[k] as { reason?: string } | undefined; return {
          icon: k === "menu" ? "restaurant" : k === "rsv" ? "calendar" : k === "delivery" ? "truck" : "bag", title: t, sub: off ? `Pausado por To’Latino: ${off.reason ?? ""}` : sub, tag: off ? "PAUSADO" : "ACTIVO", tone: off ? "danger" : "signal",
          actions: P.retirar ? [off ? { label: "Reanudar", variant: "secondary", onClick: () => setConf({ titulo: `¿Por qué se reanuda ${t}?`, hacer: (m) => moduloPausar(n.id, k, false, m) }) }
            : { label: "Pausar", variant: "danger", onClick: () => setConf({ titulo: `Pausar ${t}`, sub: k === "menu" ? "La pestaña Menú deja de salir en su página. El dueño ve el motivo en su panel." : k === "delivery" ? "Su página ofrece solo pickup; los pedidos en curso siguen. El dueño ve el motivo en su panel." : k === "rsv" ? "La pestaña Reservaciones deja de salir en su página; las reservaciones hechas siguen. El dueño ve el motivo en su panel." : "Su menú se ve, pero no se puede pedir. El dueño ve el motivo en su panel.", peligro: true, plantillas: PL, hacer: (m) => moduloPausar(n.id, k, true, m) }) }] : undefined }; })} />
        {n.menu.length ? <A.AdminList label={`MENÚ · ${n.menu.length} PLATOS${ocultos ? ` · ${ocultos} OCULTOS` : ""}`} rows={n.menu.map((i) => ({
          icon: "restaurant", title: i.name, sub: `${i.sec ?? "Sin categoría"} · $${(i.cents / 100).toFixed(2)}${i.hidden ? ` · Oculto: ${i.reason ?? ""}` : ""}`, tag: i.hidden ? "OCULTO" : undefined, tone: "danger",
          actions: P.retirar ? [i.hidden ? { label: "Volver a mostrar", variant: "secondary", onClick: () => setConf({ titulo: `¿Por qué vuelve «${i.name}»?`, hacer: (m) => platoOcultar(n.id, i.id, false, m) }) }
            : { label: "Ocultar", variant: "secondary", onClick: () => setConf({ titulo: `Ocultar «${i.name}»`, sub: "Deja de salir en su menú. El dueño ve el motivo en su panel.", peligro: true, plantillas: PL, hacer: (m) => platoOcultar(n.id, i.id, true, m) }) }] : undefined,
        }))} /> : <A.AdminNote tone="info" icon="restaurant">Todavía no tiene platos en su menú.</A.AdminNote>}
      </>);
  } else if (tab === "vende" && VENDE_RET.includes(n.cat_id)) {
    // Mercados y Tiendas (4n): pausar Productos o Pedidos y ocultar un producto con motivo (el dueño lo ve en su panel).
    const merc = n.cat_id === "NEG-MERC", MODR: ["menu" | "pedidos", string, string][] = [["menu", "Productos", "La pestaña Productos de su página"], ["pedidos", merc ? "Pedidos del mercado" : "Apartados", merc ? "Que se pueda pedir pickup o envío" : "Que se pueda apartar"]];
    const PLR = ["Producto que no corresponde a su categoría", "Precios o fotos engañosos", "Venta que la ley no permite en la app", "Lo pidió el dueño", "Reportes de clientes"];
    const SK: Record<string, string> = { peso: "Por libra", unid: "Por unidad", plato: "Listo para llevar", talla: "Con tallas", plan: "Con plan", serv: "En la tienda" };
    const ocultos = n.productos.filter((i) => i.hidden).length;
    cuerpo = (
      <>
        <A.AdminList label="MÓDULOS" rows={MODR.map(([k, t, sub]) => { const off = n.modsOff[k] as { reason?: string } | undefined; return {
          icon: k === "menu" ? "grid" : "bag", title: t, sub: off ? `Pausado por To’Latino: ${off.reason ?? ""}` : sub, tag: off ? "PAUSADO" : "ACTIVO", tone: off ? "danger" : "signal",
          actions: P.retirar ? [off ? { label: "Reanudar", variant: "secondary", onClick: () => setConf({ titulo: `¿Por qué se reanuda ${t}?`, hacer: (m) => moduloPausar(n.id, k, false, m) }) }
            : { label: "Pausar", variant: "danger", onClick: () => setConf({ titulo: `Pausar ${t}`, sub: "El dueño ve el motivo en su panel; lo que ya pidieron sigue.", peligro: true, plantillas: PLR, hacer: (m) => moduloPausar(n.id, k, true, m) }) }] : undefined }; })} />
        {n.productos.length ? <A.AdminList label={`PRODUCTOS · ${n.productos.length}${ocultos ? ` · ${ocultos} OCULTOS` : ""}`} rows={n.productos.map((i) => ({
          icon: i.sk === "peso" ? "scale" : "bag", title: i.name, sub: `${i.sec ?? "Sin sección"} · $${(i.cents / 100).toFixed(2)}${i.sk === "peso" ? "/lb" : ""} · ${SK[i.sk ?? ""] ?? "Producto"}${i.tallas ? ` · ${i.tallas}` : ""}${i.edad ? " · 21+ · solo en la tienda" : i.tienda ? " · solo en la tienda" : ""}${i.hidden ? ` · Oculto: ${i.reason ?? ""}` : ""}`, tag: i.hidden ? "OCULTO" : undefined, tone: "danger",
          actions: P.retirar ? [i.hidden ? { label: "Volver a mostrar", variant: "secondary", onClick: () => setConf({ titulo: `¿Por qué vuelve «${i.name}»?`, hacer: (m) => platoOcultar(n.id, i.id, false, m) }) }
            : { label: "Ocultar", variant: "secondary", onClick: () => setConf({ titulo: `Ocultar «${i.name}»`, sub: "Deja de salir en su página. El dueño ve el motivo en su panel.", peligro: true, plantillas: PLR, hacer: (m) => platoOcultar(n.id, i.id, true, m) }) }] : undefined,
        }))} /> : <A.AdminNote tone="info" icon="bag">Todavía no tiene productos.</A.AdminNote>}
      </>);
  } else if (tab === "vende" && VENDE_SVC.includes(n.cat_id)) {
    // Servicios y citas (Fase 3 · 3a; Auto y Hogar 4a): pausar Servicios o Citas y ocultar un servicio, siempre con motivo.
    // Auto y Hogar: además, cómo cobra cada servicio y Tu herramienta en solo lectura.
    const of = n.cat_id !== "NEG-BELL", h = n.herramienta, ic = n.cat_id === "NEG-AUTO" ? "wrench" : n.cat_id === "NEG-HOGAR" ? "home" : "scissors";
    const MODB: ["svc" | "citas" | "rsv", string, string][] = n.cat_id === "NEG-NOCHE" ? [["svc", "Servicios", "Entrada, lista, mesas, VIP y por fecha en su página"], ["rsv", "Mesas y lista", "Que se pueda anotar en la lista o pedir mesa en línea (si se pausa, su página dice «llama o pasa por el local»)"]]
      : [["svc", "Servicios", "La pestaña Servicios de su página"], ["citas", "Citas", "Que se pueda pedir cita en línea (si se pausa, su página dice «llama o pasa por el local»)"]];
    const PLS = ["Servicios que no corresponden a su categoría", "Precios o fotos engañosos", "Lo pidió el dueño", "Reportes de clientes"];
    const ocS = n.servicios.filter((i) => i.hidden).length;
    cuerpo = (
      <>
        <A.AdminList label="MÓDULOS" rows={MODB.map(([k, t, sub]) => { const off = n.modsOff[k] as { reason?: string } | undefined; return {
          icon: k === "svc" ? "scissors" : "calendar", title: t, sub: off ? `Pausado por To’Latino: ${off.reason ?? ""}` : sub, tag: off ? "PAUSADO" : "ACTIVO", tone: off ? "danger" : "signal",
          actions: P.retirar ? [off ? { label: "Reanudar", variant: "secondary", onClick: () => setConf({ titulo: `¿Por qué se reanuda ${t}?`, hacer: (m) => moduloPausar(n.id, k, false, m) }) }
            : { label: "Pausar", variant: "danger", onClick: () => setConf({ titulo: `Pausar ${t}`, sub: k === "svc" ? "La pestaña Servicios deja de salir en su página. El dueño ve el motivo en su panel." : "Su página no recibe solicitudes en línea; las citas ya pedidas siguen. El dueño ve el motivo en su panel.", peligro: true, plantillas: PLS, hacer: (m) => moduloPausar(n.id, k, true, m) }) }] : undefined }; })} />
        {n.herramientaRetail ? <A.AdminList label="SU HERRAMIENTA · SOLO LECTURA" rows={[{ icon: n.cat_id === "NEG-MERC" ? "scale" : "bag", title: n.herramientaRetail.titulo, sub: n.herramientaRetail.resumen }]} /> : null}
        {n.herramientaTrans ? <A.AdminList label="SU HERRAMIENTA · SOLO LECTURA" rows={[{ icon: "truck", title: n.herramientaTrans.titulo, sub: `${n.herramientaTrans.resumen} · tipo ${n.herramientaTrans.kind}${n.herramientaTrans.forzado ? " (forzado)" : ""}` }]} /> : null}
        {n.herramientaEdu ? <A.AdminList label="GRUPOS Y CUPOS · SOLO LECTURA" rows={[{ icon: "calendar", title: "Grupos y cupos", sub: `${n.herramientaEdu.resumen}${n.herramientaEdu.how ? ` · ${n.herramientaEdu.how}` : ""}` },
          ...n.herramientaEdu.cursos.map((x) => ({ icon: "star", title: `${x.t}${x.vende ? "" : " · oculto"}`, sub: x.s }))]} /> : null}
        {n.herramientaNoche ? <>
          <A.AdminList label="ESTA NOCHE · SOLO LECTURA" rows={[{ icon: "drink", title: "Esta noche", sub: `${n.herramientaNoche.resumen} · tipo ${KINDS_LOCAL.find((k) => k[0] === n.herramientaNoche!.kind)?.[1] ?? n.herramientaNoche.kind}${n.herramientaNoche.forzado ? " (ajustado por To’Latino)" : " (por subcategoría)"}` },
            ...n.herramientaNoche.hist.map((p) => ({ icon: "clock", title: p.t, sub: `${new Date(p.at).toLocaleString("es-US", { weekday: "short", hour: "numeric", minute: "2-digit" })} · ${p.quien ?? "—"}` }))]} />
          {P.editar ? <PanelBloques bloques={[{ type: "chips", k: "TIPO DEL LOCAL · DECIDE LA PESTAÑA, EL BOTÓN Y LAS RESEÑAS", items: [{ l: "Por subcategoría", v: n.herramientaNoche.forzado ? "filter" : "selected", onClick: () => setConf({ titulo: "¿Por qué vuelve al tipo de sus subcategorías?", hacer: (m) => tipoNoche(n.id, null, m) }) },
            ...KINDS_LOCAL.map(([k, l]) => ({ l, v: n.herramientaNoche!.forzado && n.herramientaNoche!.kind === k ? "selected" : "filter", onClick: () => setConf({ titulo: `Cambiar el tipo a «${l}»`, sub: "El dueño ve «To’Latino ajustó el tipo de tu negocio». Queda en el historial.", hacer: (m) => tipoNoche(n.id, k, m) }) }))] }]} /> : null}
        </> : null}
        {n.herramientaFiesta ? <A.AdminList label="SU HERRAMIENTA · SOLO LECTURA" rows={[{ icon: "calendar", title: "Calendario y depósito", sub: n.herramientaFiesta.resumen }]} /> : null}
        {n.herramientaSP ? <A.AdminList label="SU HERRAMIENTA · SOLO LECTURA" rows={[{ icon: n.cat_id === "NEG-SALUD" ? "insurance" : "law", title: n.cat_id === "NEG-SALUD" ? "Seguros e idiomas" : "Licencias y el total por escrito", sub: n.herramientaSP.resumen + (n.herramientaSP.acepta ? ` · «${n.herramientaSP.acepta}»` : "") },
          ...n.herramientaSP.gov.filter((g) => g.gov > 0).map((g) => ({ icon: "law", title: g.name.es, sub: `Honorario $${(g.cents / 100).toLocaleString("en-US")} + gobierno $${(g.gov / 100).toLocaleString("en-US")} = total $${((g.cents + g.gov) / 100).toLocaleString("en-US")}` }))]} /> : null}
        {n.cat_id === "NEG-PRO" || n.cat_id === "NEG-SALUD" || n.cat_id === "NEG-NOCHE" || n.cat_id === "NEG-EDU" ? (n.licencias.length ? <A.AdminList label={`LICENCIAS · ${n.licencias.length}`} rows={n.licencias.map((l) => {
          const [sub, tag, tone] = LIC_ST[l.status] ?? LIC_ST.review!;
          return { icon: "law", title: `${l.title.es}${l.who ? ` · ${l.who}` : ""}`, sub: `${sub}${l.number ? ` · ${l.label} ${l.number}` : " · sin número"}`, tag, tone,
            actions: P.editar && l.status !== "valid" ? [
              { label: "Verificar", variant: "secondary", onClick: () => setConf({ titulo: `Verificar la licencia: ${l.title.es}`, sub: "Confirma que el número existe en el registro oficial del estado.", plantillas: ["Coincide con el registro oficial"], hacer: (m) => licencia(n.id, l.id, "valid", m) }) },
              ...(l.status === "review" ? [{ label: "No se pudo", variant: "secondary", onClick: () => setConf({ titulo: `No se pudo verificar: ${l.title.es}`, peligro: true, hacer: (m) => licencia(n.id, l.id, "not_found", m) }) }] : []),
            ] : undefined };
        })} /> : <A.AdminNote tone="info" icon="law">No declaró licencias.</A.AdminNote>) : null}
        {of && h ? <A.AdminList label="SU HERRAMIENTA · SOLO LECTURA" rows={[{ icon: ic, title: `Mano de obra $${h.rate / 100}/h`, sub: n.cat_id === "NEG-AUTO" ? `Garantía ${h.warrM ?? "—"} meses · ${(h.warrMi ?? 0).toLocaleString("en-US")} mi · listo el mismo día si lo dejan antes de las ${h.cut ? `${h.cut % 12 || 12} ${h.cut < 12 ? "AM" : "PM"}` : "—"}` : `Hasta ${h.zone ?? "—"} mi · ${h.h24 ? "emergencias 24 h" : "sin emergencias"}` }]} /> : null}
        {n.servicios.length ? <A.AdminList label={`SERVICIOS · ${n.servicios.length} · COMO LOS DEJÓ EL DUEÑO${ocS ? ` · ${ocS} OCULTOS` : ""}`} rows={n.servicios.map((i) => ({
          icon: i.extra ? "plus" : ic, title: i.name, sub: `${i.extra ? "Extra" : i.sec ?? "Sin categoría"} · ${of && i.k ? `${KIND_L[i.k] ?? i.k} · ` : ""}$${(i.cents / 100).toFixed(2)}${i.dur ? ` · ${i.dur} min` : ""}${!i.own ? " · apagado por el dueño" : ""}${i.hidden ? ` · Oculto: ${i.reason ?? ""}` : ""}`, tag: i.hidden ? "OCULTO" : undefined, tone: "danger",
          actions: P.retirar ? [i.hidden ? { label: "Volver a mostrar", variant: "secondary", onClick: () => setConf({ titulo: `¿Por qué vuelve «${i.name}»?`, hacer: (m) => platoOcultar(n.id, i.id, false, m) }) }
            : { label: "Ocultar", variant: "secondary", onClick: () => setConf({ titulo: `Ocultar «${i.name}»`, sub: "Deja de salir en su página y no se puede reservar. El dueño ve el motivo en su panel.", peligro: true, plantillas: PLS, hacer: (m) => platoOcultar(n.id, i.id, true, m) }) }] : undefined,
        }))} /> : <A.AdminNote tone="info" icon="scissors">Todavía no tiene servicios.</A.AdminNote>}
      </>);
  } else if (tab === "vende") {
    cuerpo = (
      <>
        {n.licencias.length ? <A.AdminList label={`SU HERRAMIENTA · LICENCIAS · ${n.licencias.length}`} rows={n.licencias.map((l) => {
          const [sub, tag, tone] = LIC_ST[l.status] ?? LIC_ST.review!;
          return { icon: "law", title: `${l.title.es}${l.who ? ` · ${l.who}` : ""}`, sub: `${sub}${l.number ? ` · ${l.label} ${l.number}` : " · sin número"}`, tag, tone,
            actions: P.editar && l.status !== "valid" ? [
              { label: "Verificar", variant: "secondary", onClick: () => setConf({ titulo: `Verificar la licencia: ${l.title.es}`, sub: "Confirma que el número existe en el registro oficial del estado.", plantillas: ["Coincide con el registro oficial"], hacer: (m) => licencia(n.id, l.id, "valid", m) }) },
              ...(l.status === "review" ? [{ label: "No se pudo", variant: "secondary", onClick: () => setConf({ titulo: `No se pudo verificar: ${l.title.es}`, peligro: true, hacer: (m) => licencia(n.id, l.id, "not_found", m) }) }] : []),
            ] : undefined };
        })} /> : <A.AdminNote tone="info" icon="law">No declaró licencias.</A.AdminNote>}
        <A.AdminNote tone="info">Menú, servicios y lo demás que vende llegan con sus módulos.</A.AdminNote>
      </>);
  } else if (tab === "din" && din) {
    cuerpo = <N360Dinero d={din} id={n.id} nombre={n.name} desk={desk} setConf={setConf} />;
  } else if (tab === "equipo") {
    const dueño = n.equipo.find((m) => m.kind === "owner"), staff = n.equipo.filter((m) => m.kind !== "owner");
    cuerpo = (
      <>
        {dueño ? <A.AdminList label="CUENTAS CON ACCESO AL PANEL" rows={[{ icon: "shield", title: n.owner ?? dueño.name, sub: `Dueño · ${n.owner_phone || "—"}`, tag: "DUEÑO", tone: "ink", chevron: !!n.owner_id, onClick: n.owner_id ? () => router.push(`/admin/usuarios/${n.owner_id}`) : undefined }]} />
          : <A.AdminNote tone="warn" icon="lock">Nadie tiene acceso: el negocio no está reclamado.</A.AdminNote>}
        <A.AdminList label={`STAFF · COMO LO DEJÓ EL DUEÑO · ${staff.length}`} rows={staff.map((m) => ({
          icon: "users", title: m.name, sub: [m.role?.es, m.since ? `desde ${m.since}` : null, m.phone || null, m.hidden ? m.hidden_reason : null].filter(Boolean).join(" · "),
          tag: m.hidden ? "QUITADO" : m.status === "invited" ? "INVITADO" : m.status === "requested" ? "PIDE UNIRSE" : !m.show ? "OCULTO POR EL DUEÑO" : n.plan !== "pro" ? "NO SALE CON FREE" : undefined, tone: m.hidden ? "danger" : "neutral",
          actions: P.retirar && m.status === "active" ? [m.hidden
            ? { label: "Volver a mostrar", variant: "secondary", onClick: () => setConf({ titulo: `¿Por qué vuelve ${m.name}?`, hacer: (x) => staffPagina(n.id, m.id, false, x) }) }
            : { label: "Quitar de la página", variant: "secondary", onClick: () => setConf({ titulo: `Quitar a ${m.name} de la página`, sub: "Sigue en el equipo del negocio; deja de salir en su página. El dueño ve el motivo en su panel.", plantillas: BIZ, peligro: true, hacer: (x) => staffPagina(n.id, m.id, true, x) }) }] : undefined,
        }))} />
        {!staff.length ? <A.AdminNote tone="info" icon="users">Solo el dueño. Las personas del equipo salen aquí cuando el dueño las invita.</A.AdminNote> : null}
      </>);
  } else if (tab === "cont") {
    // ADM-NEG · Contenido (prototipo tab 'cont'): reseñas con su estado, el reporte abierto y ocultar / restaurar con motivo.
    cuerpo = (
      <>
        <A.AdminList label={`RESEÑAS · ${n.resenasN.n} · RESPONDIÓ ${n.resenasN.rep}`} rows={n.resenas.map((r) => ({
          icon: "star", title: `${r.name} · ${"★".repeat(r.stars)}`, sub: `${r.body.slice(0, 110)}${r.reply ? " · el negocio respondió" : " · sin respuesta"}${r.status === "hidden" && r.hidden_reason ? ` · Oculta: ${r.hidden_reason}` : ""}`,
          tag: r.status === "hidden" ? "OCULTA" : r.caso ? "REPORTADA" : undefined, tone: "danger",
          actions: [
            ...(r.caso ? [{ label: "Reporte", variant: "secondary", onClick: () => router.push(`/admin/colas?caso=${r.caso}`) }] : []),
            ...(P.retirar ? [r.status === "hidden"
              ? { label: "Restaurar", variant: "secondary", onClick: () => setConf({ titulo: `Restaurar reseña de ${r.name}`, plantillas: ["No rompe las reglas del barrio", "Es una opinión sobre el servicio", "El reporte no trae evidencia"], hacer: (m) => resenaOcultar(n.id, r.id, false, m) }) }
              : { label: "Ocultar", variant: "danger", onClick: () => setConf({ titulo: `Ocultar reseña de ${r.name}`, sub: "Sale de su página y de las estrellas. El autor ve el motivo.", peligro: true, plantillas: ["Tiene datos personales", "Ofensiva o discriminatoria", "No fue cliente: sin transacción", "Spam o publicidad", "Amenaza o acoso"], hacer: (m) => resenaOcultar(n.id, r.id, true, m) }) }] : []),
          ],
        }))} />
        {!n.resenas.length ? <A.AdminNote tone="info" icon="star">Sin reseñas.</A.AdminNote> : null}
        <A.AdminList label={`NOVEDADES · ${n.novedades.length}`} rows={n.novedades.map((p) => ({
          icon: "news", title: p.title, sub: `${p.body ? `${p.body.slice(0, 90)} · ` : ""}${p.kind.toUpperCase()} · +${p.up} −${p.dn} · hace ${p.h < 24 ? `${Math.max(0, p.h)} h` : `${Math.floor(p.h / 24)} d`}${p.st === "adm" && p.hidden_reason ? ` · Oculta: ${p.hidden_reason}` : ""}`,
          tag: p.st === "adm" ? "OCULTA" : p.st === "quitada" ? "QUITADA POR EL DUEÑO" : p.st === "detenida" ? "DETENIDA POR EL DUEÑO" : p.st === "programada" ? "PROGRAMADA" : p.st === "terminada" ? "TERMINADA" : undefined, tone: p.st === "adm" ? "danger" : "neutral",
          actions: P.retirar && p.st !== "quitada" ? [p.st === "adm"
            ? { label: "Mostrar la novedad", variant: "secondary", onClick: () => setConf({ titulo: `¿Por qué vuelve «${p.title}»?`, plantillas: ["No rompe las reglas del barrio", "El reporte no trae evidencia"], hacer: (m) => novedadOcultar(n.id, p.id, false, m) }) }
            : { label: "Ocultar la novedad", variant: "danger", onClick: () => setConf({ titulo: `Ocultar «${p.title}»`, sub: "Sale de su página. El dueño ve el motivo en su panel.", peligro: true, plantillas: ["Spam o publicidad", "Precio engañoso", "Ofensiva o discriminatoria", "Tiene datos personales"], hacer: (m) => novedadOcultar(n.id, p.id, true, m) }) }] : undefined,
        }))} />
        {!n.novedades.length ? <A.AdminNote tone="info" icon="news">Sin novedades.</A.AdminNote> : null}
        {P.retirar && n.plan === "pro" ? (n.modsOff.nov
          ? <A.AdminNote tone="bad" icon="ban" cta="Reanudar" onCta={() => setConf({ titulo: "¿Por qué se reanuda Novedades?", hacer: (m) => moduloPausar(n.id, "nov", false, m) })}>{`Novedades en pausa: ${n.modsOff.nov.reason}`}</A.AdminNote>
          : <A.AdminNote tone="info" icon="news" cta="Pausar Novedades" onCta={() => setConf({ titulo: "Pausar Novedades", sub: "La pestaña deja de salir en la ficha hasta que la reactives. El dueño recibe el motivo.", peligro: true, plantillas: ["Reportes de clientes", "Precios engañosos", "Spam"], hacer: (m) => moduloPausar(n.id, "nov", true, m) })}>Novedades activas en su página.</A.AdminNote>) : null}
        <A.AdminList label={`VACANTES · ${n.vacantes.length}`} rows={n.vacantes.map((j) => ({
          icon: "brief", title: j.title, sub: `$${(j.pay / 100).toFixed(2).replace(/\.00$/, "")}${j.payTo && j.payTo > j.pay ? `–${(j.payTo / 100).toFixed(2).replace(/\.00$/, "")}` : ""}/hora · ${j.apps} ${j.apps === 1 ? "solicitud" : "solicitudes"} · hace ${j.h < 24 ? `${Math.max(0, j.h)} h` : `${Math.floor(j.h / 24)} d`}${j.st === "adm" && j.hidden_reason ? ` · Oculta: ${j.hidden_reason}` : ""}`,
          tag: j.st === "adm" ? "OCULTA" : j.st === "removed" ? "QUITADA POR EL DUEÑO" : j.st === "paused" ? "PAUSADA" : j.st === "filled" ? "CUBIERTA" : j.st === "draft" ? "BORRADOR" : undefined, tone: j.st === "adm" ? "danger" : "neutral",
          actions: P.retirar && j.st !== "removed" ? [j.st === "adm"
            ? { label: "Mostrar la vacante", variant: "secondary", onClick: () => setConf({ titulo: `¿Por qué vuelve «${j.title}»?`, plantillas: ["No rompe las reglas", "El reporte no trae evidencia"], hacer: (m) => vacanteOcultar(n.id, j.id, false, m) }) }
            : { label: "Ocultar la vacante", variant: "danger", onClick: () => setConf({ titulo: `Ocultar «${j.title}»`, sub: "Sale de su página y nadie nuevo aplica. El dueño ve el motivo en su panel.", peligro: true, plantillas: ["Pide papeles, SSN o pago para aplicar", "Pago por debajo del mínimo", "Vacante falsa o engañosa", "Discriminatoria"], hacer: (m) => vacanteOcultar(n.id, j.id, true, m) }) }] : undefined,
        }))} />
        {!n.vacantes.length ? <A.AdminNote tone="info" icon="brief">Sin vacantes.</A.AdminNote> : null}
        {P.retirar && n.plan === "pro" ? (n.modsOff.jobs
          ? <A.AdminNote tone="bad" icon="ban" cta="Reanudar" onCta={() => setConf({ titulo: "¿Por qué se reanuda Jobs?", hacer: (m) => moduloPausar(n.id, "jobs", false, m) })}>{`Jobs en pausa: ${n.modsOff.jobs.reason}`}</A.AdminNote>
          : <A.AdminNote tone="info" icon="brief" cta="Pausar Jobs" onCta={() => setConf({ titulo: "Pausar Jobs", sub: "La pestaña Jobs deja de salir en la ficha y nadie aplica hasta que la reactives. El dueño recibe el motivo.", peligro: true, plantillas: ["Reportes de vecinos", "Pide papeles o pago para aplicar", "Vacantes falsas"], hacer: (m) => moduloPausar(n.id, "jobs", true, m) })}>Jobs activo en su página.</A.AdminNote>) : null}
      </>);
  } else if (tab === "confianza") {
    const COL: Record<string, string> = { sello: "Sello de verificación", nuevo: "Negocios nuevos", medios: "Medios marcados", rec: "Recomendaciones", lic: "Licencias", cambio: "Reclamo (cambio sensible)" };
    const selloL = n.verified ? "Verificado" : n.sello?.status === "review" ? "En revisión" : n.sello?.status === "info" ? "Te falta un dato" : n.sello?.status === "no" ? "No aprobado" : "Sin sello";
    cuerpo = (
      <>
        {casosAbiertos.length ? <A.AdminList label={`REPORTES Y CASOS ABIERTOS · ${casosAbiertos.length}`} rows={casosAbiertos.map((c) => ({ icon: "bell", title: COL[c.queue] ?? c.queue, sub: `${hace(c.opened_at)}`, tag: "ABIERTO", tone: "action", chevron: true, onClick: () => router.push(`/admin/colas?caso=${c.id}`) }))} />
          : <PanelBloques bloques={[{ type: "group", k: "REPORTES ABIERTOS · 0", first: true }]} />}
        {!casosAbiertos.length ? <A.AdminNote tone="ok">Ninguno.</A.AdminNote> : null}
        <PanelBloques bloques={[{ type: "group", k: "SELLO Y LICENCIA" }, { type: "kv", cols: 2, items: [{ k: "SELLO", v: selloL, fg: n.verified ? "var(--tl-open-text)" : undefined }, { k: "LICENCIA", v: licPeor ? (LIC_ST[licPeor.status] ?? LIC_ST.review!)[0] : "No la necesita", fg: licPeor ? (licPeor.status === "valid" ? "var(--tl-open-text)" : "var(--tl-danger)") : undefined }] }, { type: "group", k: "ESTADO Y SANCIONES" }]} />
        {historial((a) => /ocultar|suspender|cerrar|restaurar|sello|cierre|reabrir/.test(a))}
      </>);
  } else {
    const selloL = n.verified ? "Verificado" : n.sello?.status === "review" ? "En revisión" : n.sello?.status === "info" ? "Te falta un dato" : n.sello?.status === "no" ? "No aprobado" : n.sello?.status === "revoked" ? "Quitado por To’Latino" : "Sin sello";
    const viejo = Date.now() - new Date(n.updated).getTime() > 30 * 86_400_000;
    const acts: { l: string; v?: string; icon?: string; onClick: () => void }[] = [];
    if (P.editar && n.status === "active") {
      if (n.plan === "pro" && !n.verified) acts.push({ l: "Dar sello", icon: "verified", onClick: () => setConf({ titulo: "Dar el sello Verificado", sub: "¿Cómo lo verificaste?", hacer: (m) => sello(n.id, true, m) }) });
      if (n.verified) acts.push({ l: "Quitar sello", icon: "shield", onClick: () => setConf({ titulo: "¿Por qué se quita el sello?", plantillas: SELLO_NO, peligro: true, hacer: (m) => sello(n.id, false, m) }) });
      if (!(n.temp_until && new Date(n.temp_until).getTime() > Date.now())) acts.push({ l: "Cierre temporal", icon: "clock", onClick: () => setConf({ titulo: `Cerrar ${n.name} por unos días`, sub: "La ficha dice «Cerrado temporalmente» y no recibe pedidos ni citas. Vuelve sola al vencer. El dueño ve el motivo en su panel.", elegir: { label: "POR CUÁNTO", items: [["1", "1 día"], ["3", "3 días"], ["7", "7 días"], ["14", "14 días"]].map(([k, l]) => ({ k: k!, l: l! })) }, plantillas: BIZ, hacer: (m, e) => cierreTemporal(n.id, Number(e), m) }) });
    }
    if (P.retirar && n.status === "active") {
      acts.push({ l: "Ocultar", v: "danger", icon: "ban", onClick: () => setConf({ titulo: `¿Por qué se oculta ${n.name}?`, plantillas: BIZ, peligro: true, hacer: (m) => cambiarEstado(n.id, "hidden", m) }) });
      acts.push({ l: "Suspender", v: "danger", icon: "lock", onClick: () => setConf({ titulo: `¿Por qué se suspende ${n.name}?`, plantillas: BIZ, peligro: true, hacer: (m) => cambiarEstado(n.id, "suspended", m) }) });
    }
    if (P.cerrar && n.status === "active") acts.push({ l: "Cerrar el negocio", v: "danger", icon: "close", onClick: () => setConf({ titulo: `Cerrar ${n.name}`, sub: "Para negocios que ya no existen. Sale de búsquedas y categoría; las reseñas se guardan. Se puede reabrir.", peligro: true, cta: "Cerrar", hacer: (m) => cambiarEstado(n.id, "closed", m) }) });
    cuerpo = (
      <>
        <PanelBloques bloques={[{ type: "kv", cols: desk ? 3 : 2, items: [
          { k: "DUEÑO", v: n.owner ?? "Sin reclamar", fg: n.owner ? undefined : "var(--tl-pro-ink)" },
          { k: "PLAN", v: n.trial ? `Pro · prueba · quedan ${n.trial.left} d` : n.plan === "pro" ? "Pro" : "Free" },
          { k: "SELLO", v: selloL, fg: n.verified ? "var(--tl-open-text)" : undefined },
          { k: "TELÉFONO", v: n.phone || "—" },
          { k: "DIRECCIÓN", v: n.address ?? (n.op === "casa" ? "A domicilio · zona" : "—") },
          { k: "EN TO’LATINO DESDE", v: fecha(n.created) },
          { k: "ÚLTIMA ACTIVIDAD", v: fecha(n.updated), fg: viejo ? "var(--tl-pro-ink)" : undefined },
        ] }]} />
        <A.HBars label="FUERZA DEL PERFIL" help={`${n.fuerza.sc} %`} items={n.fuerza.todas.map((t) => ({ label: t.t[0], width: t.ok ? "100%" : "6%", color: t.ok ? "var(--tl-open)" : "var(--tl-pro)", value: t.ok ? "Sí" : "Falta" }))} />
        {casosAbiertos.length ? <A.AdminNote tone="warn" cta="Ver" onCta={() => ir("confianza")}>{`${casosAbiertos.length} ${casosAbiertos.length === 1 ? "caso abierto" : "casos abiertos"} sobre este negocio.`}</A.AdminNote> : null}
        <PanelBloques bloques={[{ type: "group", k: "NOTAS INTERNAS", link: P.editar ? "Agregar nota" : undefined, onLink: () => setConf({ titulo: `Nota sobre ${n.name}`, sub: "Solo la ve el equipo. El negocio nunca la ve.", cta: "Guardar", hacer: (m) => nota(n.id, m) }) }]} />
        {n.notas.length ? <A.AdminList rows={n.notas.map((x) => ({ icon: "edit", title: x.text, sub: `${x.quien ?? "Equipo"} · ${fecha(x.at)}` }))} /> : <A.AdminNote tone="info">Sin notas.</A.AdminNote>}
        {acts.length ? <PanelBloques bloques={[{ type: "group", k: "ACCIONES" }, { type: "acts", items: acts.map((a) => ({ ...a, off: pend })) }]} /> : null}
      </>);
  }

  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: "NEGOCIO 360°", t: n.name, onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 1120 }}>
      <span role="link" onClick={() => router.push("/admin/negocios")} style={{ display: "flex", alignItems: "center", gap: 6, font: "700 13px Manrope,sans-serif", color: "var(--tl-action)", cursor: "pointer" }}><A.Icon name="chevronLeft" size={15} color="var(--tl-action)" />Negocios</span>
      <span style={{ font: "700 9.5px 'JetBrains Mono',monospace", letterSpacing: ".14em", color: "rgba(11,14,18,.45)" }}>NEGOCIO 360°</span>
      <PanelBloques bloques={cab} />
      {notasEstado}
      <PanelBloques bloques={[tabs]} />
      {cuerpo}
      <PanelBloques bloques={[{ type: "group", k: "HISTORIAL RECIENTE" }]} />
      {historial()}
      <Toast t={toast} desk={desk} />
    </div>
  );
}
