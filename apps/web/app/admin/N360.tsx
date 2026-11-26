"use client";
/* ADM-NEG · 360° (Super Admin.dc.html negDetail): el negocio como lo ve el cliente, como lo edita el dueño y lo que
   hizo el equipo. Pestañas: Resumen, Ficha, Lo que vende, Operación (9n-18), Dinero (2o), Equipo, Contenido y Confianza (Operación llega con
   Analítica). Cada acción pide motivo y queda en la auditoría. */
import { SoporteDe360, type CasoSop } from "./SoporteDe360";
import * as UI from "@tolatino/ui";
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ComponentType, type ReactNode } from "react";
import type { Dinero } from "@/lib/admin-dinero";
import type { CompaNegocio } from "@/lib/compa/admin-compa";
import type { Negocio360 } from "@/lib/admin-negocios";
import type { ParDup } from "@/lib/admin-negocios-dup";
import { filasDup } from "./DupFila";
import { fmtHora } from "@/lib/panel-reglas";
import { KINDS_LOCAL } from "@/lib/noche-comun";
import { PuntoAdmin } from "./PuntoAdmin";
import { cambiarEstado, tipoNoche, cierreTemporal, editarCampo, foto, licencia, moduloPausar, nota, novedadOcultar, vacanteOcultar, platoOcultar, propiedadOcultar, mayoresRevisar, carroOcultar, reabrir, resenaOcultar, restaurar, sello, staffPagina, mensajeAlDueno, invitarReclamar, pedirCategoria, pedirTransferencia, accesoPanelEquipo } from "./acciones-negocios";
import type { ResAdm } from "./acciones-colas";
import { ConfirmarMotivo, Toast, useAncho, useToast, type Confirmar } from "./Colas";
import { N360Dinero } from "./N360Dinero";
import { N360Oper } from "./N360Oper";
import type { Oper360 } from "@/lib/admin-negocio-oper";
import { compaAutoNegocio } from "./acciones-compa";
import { destacadoFijar } from "./acciones-crecimiento";
import { accionesOrg, estadoEvt } from "./ColasEventos";
import { diaCorto, hora, type Bi } from "@/lib/evt-comun";
import { useAhora } from "@/lib/ahora";
import { useE2 } from "./idioma-admin";

import { tec } from "@/lib/tec";
import { fotoFondo } from "@tolatino/ui";
/* 6a · Contenido › Eventos: los eventos del negocio (no los borradores) y su estado de organizador. 6j: liquidaciones y cancelaciones. */
const LIQ_N = (E2: (a: string, b: string) => string): Record<string, string> => ({ pending: E2("PENDIENTES", "PENDING"), held: E2("RETENIDAS", "HELD"), paid: E2("PAGADAS", "PAID"), reversed: E2("AJUSTADAS", "ADJUSTED"), paying: E2("EN CAMINO", "ON THE WAY") });
export type Evts360 = { filas: { id: string; t: Bi; st: string; hidden: boolean; pending: string | null; dia: string; h0: number; entrada: string }[]; org: { verificado: boolean; bloqueado: string | null }; puede: { aprobar: boolean; retirar: boolean }; liq: { st: string; n: number; neto: number }[]; cx: { evento: Bi; scope: string; reason: string; by: string; ordenes: number; devuelto: number; at: string }[] };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const A = UI as unknown as Record<"AdminNote" | "AdminList" | "AuditLog" | "HBars" | "Icon", ComponentType<any>>;
type EF = (es: string, en: string) => string;
const BIZ = (E2: EF) => [E2("Varios reportes coinciden", "Several reports match"), E2("El negocio no responde a To’Latino", "The business doesn’t answer To’Latino"), E2("Datos de contacto falsos", "Fake contact details"), E2("Se resolvió con el dueño", "Resolved with the owner")];
const FOTO = (E2: EF) => [E2("No es de este negocio", "Not from this business"), E2("Contenido inapropiado", "Inappropriate content"), E2("Muestra datos personales", "Shows personal information"), E2("Es publicidad o spam", "Ads or spam")];
const SELLO_NO = (E2: EF) => [E2("La dirección no coincide con la página", "The address doesn’t match the page"), E2("No pudimos confirmar que representas el negocio", "We couldn’t confirm you represent the business"), E2("Las fotos no son del local", "The photos aren’t of the place"), E2("El nombre puede confundirse con otro negocio", "The name can be confused with another business")];
/* Verbo de cada acción en el historial (prototipo actL). */
const VERBO = (E2: EF): Record<string, string> => ({
  "negocio.ver_como_cliente": E2("vio como cliente a", "viewed as a customer the page of"),
  "negocio.ver_panel": E2("abrió en solo lectura el panel de", "opened read-only the dashboard of"),
  "negocio.video.subir": E2("subió el video de presentación de", "negocio.video.subir"),
  "negocio.video.quitar": E2("quitó el video de presentación de", "negocio.video.quitar"),
  "negocio.video.aprobar": E2("aprobó el video de presentación de", "negocio.video.aprobar"),
  "negocio.video.rechazar": E2("no aprobó el video de presentación de", "negocio.video.rechazar"),
  "negocio.equipo.quitar_acceso": E2("le quitó el acceso al panel a alguien de", "removed dashboard access for someone at"),
  "negocio.equipo.devolver_acceso": E2("devolvió el acceso al panel a alguien de", "restored dashboard access for someone at"),
  "negocio.fusion.pedir": E2("pidió fusionar un duplicado con", "requested merging a duplicate into"),
  "negocio.duplicado.no": E2("marcó que no es duplicado", "marked as not a duplicate"),
  "negocio.categoria.pedir": E2("pidió cambiar la categoría de", "requested a category change for"),
  "negocio.transferir.pedir": E2("pidió transferir", "requested transferring"),
  "negocio.fusionar": E2("fusionó un duplicado con", "merged a duplicate into"),
  "negocio.fusionado": E2("fusionó con otro negocio a", "merged into another business:"),
  "negocio.categoria.cambiar": E2("cambió la categoría de", "changed the category of"),
  "negocio.mensaje": E2("le mandó un mensaje al dueño de", "sent a message to the owner of"),
  "negocio.invitar_reclamar": E2("invitó por SMS a reclamar", "invited by SMS to claim"), "mkt.destacado.fijar": E2("destacó a", "featured"),
  "mkt.destacado.quitar": E2("sacó de la rotación a", "removed from rotation"), "resena.ocultar": E2("ocultó una reseña de", "hid a review of"),
  "resena.mostrar": E2("volvió a mostrar una reseña de", "showed again a review of"),
  "novedad.ocultar": E2("ocultó una novedad de", "hid an update from"),
  "novedad.mostrar": E2("volvió a mostrar una novedad de", "showed again an update from"),
  "vacante.ocultar": E2("ocultó una vacante de", "hid a job from"),
  "vacante.mostrar": E2("volvió a mostrar una vacante de", "showed again a job from"),
  "comentario.ocultar": E2("ocultó un comentario en", "hid a comment on"),
  "comentario.mostrar": E2("volvió a mostrar un comentario en", "showed again a comment on"),
  "negocio.modulo.pausar": E2("pausó un módulo de", "paused a module of"),
  "negocio.modulo.reanudar": E2("reanudó un módulo de", "resumed a module of"),
  "negocio.noche.tipo": E2("ajustó el tipo de local de", "adjusted the venue type of"), "negocio.ocultar": E2("ocultó", "hid"),
  "negocio.suspender": E2("suspendió", "suspended"), "negocio.cerrar": E2("cerró", "closed"), "negocio.restaurar": E2("restauró", "restored"),
  "negocio.cierre_temporal": E2("cerró temporalmente", "temporarily closed"), "negocio.reabrir": E2("reabrió", "reopened"),
  "negocio.dueno.cambiar": E2("cambió el dueño de", "changed the owner of"),
  "negocio.pagos.pausar": E2("pausó los pagos al banco de", "paused payouts for"),
  "plan.cortesia": E2("dio Pro de cortesía a", "gave Courtesy Pro to"), "plan.quitar_cortesia": E2("quitó la cortesía a", "removed the courtesy from"),
  "plan.extender_prueba": E2("extendió la prueba de", "extended the trial of"),
  "plan.reintentar_cobro": E2("reintentó el cobro de Pro de", "retried the Pro charge for"),
  "plan.anular": E2("anuló la suscripción de", "cancelled the subscription of"),
  "negocio.pagos.reanudar": E2("reanudó los pagos al banco de", "resumed payouts for"), "negocio.sello.dar": E2("dio el sello a", "gave the badge to"),
  "negocio.sello.quitar": E2("quitó el sello a", "removed the badge from"),
  "negocio.sello.aprobar": E2("aprobó el sello de", "approved the badge for"),
  "negocio.sello.pedir_dato": E2("pidió un dato a", "asked for information from"),
  "negocio.sello.rechazar": E2("no aprobó el sello de", "didn’t approve the badge for"), "negocio.editar": E2("editó", "edited"),
  "negocio.punto": E2("corrigió el punto en el mapa de", "corrected the map pin of"),
  "negocio.foto.quitar": E2("quitó una foto de", "removed a photo from"), "negocio.foto.restaurar": E2("restauró una foto de", "restored a photo of"),
  "negocio.staff.quitar": E2("quitó de la página a alguien de", "removed from the page someone at"),
  "negocio.staff.mostrar": E2("volvió a mostrar a alguien de", "showed again someone at"),
  "evt.organizador.verificar": E2("verificó como organizador de eventos a", "verified as event organizer"),
  "evt.organizador.quitar_verificado": E2("quitó el verificado de eventos a", "removed event verification from"),
  "evt.organizador.bloquear": E2("bloqueó la publicación de eventos de", "blocked event publishing for"),
  "evt.organizador.desbloquear": E2("permitió publicar eventos otra vez a", "allowed event publishing again for"),
  "negocio.nota": E2("agregó una nota a", "added a note to"), "negocio.revisado": E2("revisó", "reviewed"),
  "licencia.verificar": E2("verificó la licencia de", "verified the license of"),
  "licencia.vencida": E2("marcó vencida la licencia de", "marked as expired the license of"),
  "licencia.no_aparece": E2("no encontró la licencia de", "couldn’t find the license of")
});
const DIAS = (E2: EF) => [E2("Lunes", "Monday"), E2("Martes", "Tuesday"), E2("Miércoles", "Wednesday"), E2("Jueves", "Thursday"), E2("Viernes", "Friday"), E2("Sábado", "Saturday"), E2("Domingo", "Sunday")];
const fecha = (iso: string | null, en = false) => (iso ? new Date(iso).toLocaleDateString(en ? "en-US" : "es-US", { day: "numeric", month: "short", year: "numeric" }) : "—");
const hace = (iso: string, ahora: number, en = false) => { const h = (ahora - new Date(iso).getTime()) / 3_600_000; return en ? (h < 1 ? "just now" : h < 24 ? `${Math.floor(h)} h ago` : `${Math.floor(h / 24)} d ago`) : h < 1 ? "hace un momento" : h < 24 ? `hace ${Math.floor(h)} h` : `hace ${Math.floor(h / 24)} d`; };
const val = (x: unknown) => (x && typeof x === "object" ? Object.values(x as Record<string, unknown>).filter((v) => typeof v === "string" || typeof v === "number").join(" · ") : String(x ?? "—"));

/* Cómo cobra un servicio de Auto u Hogar (4a), para el Super Admin. */
const KIND_L = (E2: EF): Record<string, string> => ({
  fijo: E2("Precio cerrado", "Fixed price"), desde: E2("Desde · estimado", "From · estimate"), cotiza: E2("Se cotiza", "By quote"),
  diag: E2("Diagnóstico", "Diagnosis"), lav: E2("Por tamaño", "By size"), goma: E2("Por goma", "Per tire"), insp: E2("Inspección", "Inspection"),
  grua: E2("Grúa · se llama", "Tow · call"), visita: E2("Visita", "Visit"), hora: E2("Por hora", "Hourly"), area: E2("Por medida", "By measurement"),
  pres: E2("Presupuesto", "Estimate"), emer: E2("Emergencia 24/7", "24/7 emergency"), plan: "Plan", pack: E2("Paquete", "Package"),
  unid: E2("Por unidad", "Per unit"), asiento: E2("Por asiento", "Per seat"), priv: E2("Vehículo completo", "Whole vehicle"),
  caja: E2("Caja o envío", "Box or shipping"), cover: E2("Entrada (sigue al cover)", "Entry (follows the cover)"), lista: E2("Lista", "List"),
  mesa: E2("Mesa", "Table"), vip: "VIP", evento: E2("Noche especial (espera a Eventos)", "Special night (waits for Events)"),
  fecha: E2("Por fecha", "By date")
});
/* Iglesias (4ia): la forma de cada servicio (nunca un cobro en la app): gratis · donativo sugerido · precio total · curso. */
const usdN = (c: number) => `$${Math.round(c / 100).toLocaleString("en-US")}`;
const feL = (i: { k: string | null; cents: number; a: Record<string, unknown> }, E2: EF = (es) => es) => i.a?.fe === "tot" ? E2(`Precio total por escrito ${usdN(i.cents)}`, `Total price in writing ${usdN(i.cents)}`)
  : `${i.k === "curso" ? E2(`Curso · ${Number(i.a?.sem ?? 0)} semanas · `, `Course · ${Number(i.a?.sem ?? 0)} weeks · `) : ""}${i.cents ? E2(`Donativo sugerido ${usdN(i.cents)}`, `Suggested donation ${usdN(i.cents)}`) : E2("Gratis", "Free")}`;
/* Las categorías con «Lo que vende» en el 360: la pestaña y su contenido salen de la MISMA lista (guardián pestanaVende). */
const VENDE_SVC = ["NEG-BELL", "NEG-AUTO", "NEG-HOGAR", "NEG-SALUD", "NEG-PRO", "NEG-FIESTA", "NEG-TRANS", "NEG-NOCHE", "NEG-EDU", "NEG-NINOS", "NEG-DEPORTE", "NEG-FE", "NEG-INMUEBLE", "NEG-DEALER"];
const VENDE_RET = ["NEG-MERC", "NEG-TIENDA"];
/* 9n · Los tipos de negocio donde el vecino pide un precio antes de reservar (Cotizaciones): Auto y Hogar (pre-estimado, presupuesto), Transporte (mudanza), Fiestas (total por escrito). */
const COT_CATS = ["NEG-AUTO", "NEG-HOGAR", "NEG-TRANS", "NEG-FIESTA"];
const VENDE = ["NEG-FOOD", ...VENDE_SVC, ...VENDE_RET];
/* KINDS_LOCAL (Noche) en los dos idiomas (el texto en español es el mismo de lib/noche-comun.ts). */
const KL = (E2: EF): Record<string, string> => ({ club: E2("Discoteca", "Nightclub"), salsa: E2("Salsa y bachata", "Salsa and bachata"), urbano: E2("Urbano", "Urban"), banda: E2("Banda y cantina", "Banda and cantina"), bar: E2("Bar", "Bar"), sport: E2("Bar deportivo", "Sports bar"), karaoke: E2("Karaoke", "Karaoke"), billar: E2("Billar", "Pool hall"), cerve: E2("Cervecería", "Brewery"), lounge: E2("Lounge", "Lounge"), show: E2("Espectáculos", "Shows"), dj: E2("DJ (por fecha)", "DJ (by date)"), promo: E2("Promotor (por fecha)", "Promoter (by date)"), salon: E2("Salón (por fecha)", "Venue (by date)") });
export function N360({ n, tab, din, oper, operK = "all", evts = null, sop, cpa, cambios = [], cats = [], dups = null }: { n: Negocio360; tab: string; din?: Dinero | null; oper?: Oper360 | null; operK?: string; evts?: Evts360 | null; sop?: CasoSop[]; cpa?: CompaNegocio | null;
  cambios?: { id: string; type: string; caso: string | null }[]; cats?: { id: string; l: string }[]; dups?: ParDup[] | null }) {
  const ahora = useAhora(); // 9b-1 · «hace N min»: el mismo ahora en el servidor y en la hidratación (lib/ahora.tsx)
  const router = useRouter(), w = useAncho(), desk = w >= 1024, { E2 } = useE2(), en = E2("", "x") === "x";
  const bi = (x: { es: string; en?: string } | null | undefined) => (x ? (en ? x.en || x.es : x.es) : "");
  const klT = KL(E2), kl = (k: string, l: string) => klT[k] ?? l;
  const [toast, setToast] = useToast();
  const [conf, setConf] = useState<Confirmar | null>(null);
  const [pend] = useTransition();
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? E2("Listo. Quedó en la auditoría.", "Done. It’s in the audit log.")); setConf(null); router.refresh(); };
  const P = n.puede, ir = (t: string) => router.push(`/admin/negocios/${n.id}${t === "resumen" ? "" : `?tab=${t}`}`, { scroll: false });
  const malo = ["oculto", "susp", "cerrado"].includes(n.estado);
  const stL = n.estado === "susp" ? E2("SUSPENDIDO", "SUSPENDED") : n.estado === "oculto" ? E2("OCULTO", "HIDDEN") : n.estado === "cerrado" ? E2("CERRADO", "CLOSED") : n.plan === "pro" ? (n.verified ? E2("PRO · VERIFICADO", "PRO · VERIFIED") : E2("PRO · SIN SELLO", "PRO · NO BADGE")) : "FREE";
  const casosAbiertos = n.casos.filter((c) => c.status === "open");
  const cab: (Bloque | null)[] = [
    { type: "hero", t: n.name, s: `${n.cat}${n.subs ? ` · ${n.subs}` : ""} · ${n.ciudad}`, ph: n.fotos[0]?.status === "visible" ? `url("${n.fotos[0].url}")` : "", ini: n.fotos[0]?.status === "visible" ? "" : n.name.slice(0, 1),
      st: stL, stFg: malo ? "var(--tl-pro)" : "var(--tl-signal)", stDot: malo ? "var(--tl-pro)" : "var(--tl-signal)", kn: desk ? 4 : 2,
      kpis: [
        { v: n.reviews ? `${n.rating?.toFixed(1) ?? "—"} ★` : E2("Nuevo", "New"), k: E2(`${n.reviews} RESEÑAS`, `${n.reviews} REVIEWS`) },
        { v: String(n.cifras.v30), k: E2("VISTAS · 30 D", "VIEWS · 30 D") },
        { v: String(n.cifras.c30), k: E2("CONTACTOS · 30 D", "CONTACTS · 30 D") },
        { v: n.mi != null ? `${n.mi} mi` : "—", k: E2("DEL CENTRO", "FROM DOWNTOWN") },
      ],
      // 9n · Un negocio no activo (oculto, suspendido, borrador…) también se ve «como cliente», solo para el equipo: ?equipo=1 (aviso y auditoría en la ficha).
      // 9n-23 · «Panel del dueño»: su panel en SOLO LECTURA (/panel/{id}?equipo=1; el servidor decide con neg:ver, avisa arriba y audita cada sección).
      acts: n.status !== "merged" ? [{ l: E2("Ver como cliente", "View as customer"), icon: "search", onClick: () => window.open(n.status === "active" ? `/n/${n.id}` : `/n/${n.id}?equipo=1`, "_blank") },
        { l: E2("Panel del dueño", "Owner’s dashboard"), icon: "store", onClick: () => window.open(`/panel/${n.id}?equipo=1`, "_blank") }] : [] },
  ];
  const notasEstado: ReactNode[] = [];
  if (malo) notasEstado.push(<A.AdminNote key="e" tone="bad" icon="ban" cta={P.retirar ? E2("Restaurar", "Restore") : undefined} onCta={() => setConf({ titulo: E2("¿Por qué se restaura?", "Why is it being restored?"), nota: "interna", hacer: (m) => restaurar(n.id, m) })}>
    {E2(`${n.estado === "cerrado" ? "Cerrado" : n.estado === "susp" ? "Suspendido" : "Oculto"}: ${n.status_reason ?? "sin motivo"} · No sale en búsquedas ni en la categoría; el dueño ve el motivo en su panel.`,
      `${n.estado === "cerrado" ? "Closed" : n.estado === "susp" ? "Suspended" : "Hidden"}: ${n.status_reason ?? "no reason"} · It doesn’t show in search or in the category; the owner sees the reason in their dashboard.`)}</A.AdminNote>);
  else if (n.status === "merged") notasEstado.push(<A.AdminNote key="m" tone="info" icon="users" cta={n.merged_into ? E2("Ver el que queda", "See the one that stays") : undefined} onCta={() => router.push(`/admin/negocios/${n.merged_into}`)}>
    {E2(`Fusionado con ${n.merged_name ?? "otro negocio"}: sus reseñas, seguidores y guardados pasaron allá y su página lleva a ese negocio. Sus pedidos y cobros se quedan aquí.`,
      `Merged into ${n.merged_name ?? "another business"}: its reviews, followers and saves moved there and its page points to that business. Its orders and payments stay here.`)}</A.AdminNote>);
  else if (n.temp_until && new Date(n.temp_until).getTime() > Date.now()) notasEstado.push(<A.AdminNote key="t" tone="warn" icon="clock" cta={P.editar ? E2("Reabrir", "Reopen") : undefined} onCta={() => setConf({ titulo: E2("¿Por qué se reabre?", "Why is it reopening?"), nota: "interna", hacer: (m) => reabrir(n.id, m) })}>
    {E2(`Cerrado temporalmente hasta el ${fecha(n.temp_until)}: ${n.temp_reason ?? ""}. La ficha dice «Cerrado temporalmente».`, `Temporarily closed until ${fecha(n.temp_until, true)}: ${n.temp_reason ?? ""}. The page says “Temporarily closed.”`)}</A.AdminNote>);
  // 9n-8 · Lo que espera en Cambios sensibles sobre este negocio.
  const CAMBIO_N: Record<string, string> = { mergeBiz: E2("Una fusión", "A merge"), changeCategory: E2("Un cambio de categoría", "A category change"), transferOwner: E2("Una transferencia de dueño", "An owner transfer") };
  for (const c of cambios) notasEstado.push(<A.AdminNote key={`cs-${c.id}`} tone="warn" icon="lock" cta={c.caso ? E2("Ver en Colas", "See in Queues") : undefined} onCta={() => router.push(`/admin/colas?caso=${c.caso}`)}>
    {E2(`${CAMBIO_N[c.type] ?? "Un cambio sensible"} espera en Cambios sensibles (#${c.id}): lo aplica otra persona del equipo.`, `${CAMBIO_N[c.type] ?? "A sensitive change"} is waiting in Sensitive changes (#${c.id}): someone else on the team applies it.`)}</A.AdminNote>);
  const pendiente = (t: string) => cambios.some((c) => c.type === t);
  const LIC_ST: Record<string, [string, string, string]> = { valid: [E2("Verificada", "Verified"), E2("VERIFICADA", "VERIFIED"), "signal"], review: [E2("Pide revisión", "Needs review"), E2("EN REVISIÓN", "IN REVIEW"), "action"], expired: [E2("Vencida según el registro", "Expired per the registry"), E2("VENCIDA", "EXPIRED"), "danger"], not_found: [E2("No se pudo verificar", "Couldn’t verify"), "NO", "danger"], revoked: [E2("No se pudo verificar", "Couldn’t verify"), "NO", "danger"] };
  const licPeor = n.licencias.find((l) => l.status === "review") ?? n.licencias.find((l) => l.status !== "valid") ?? n.licencias[0];
  const tabs: Bloque = { type: "tabs", items: [["resumen", E2("Resumen", "Overview")], ["ficha", E2("Ficha", "Page")], ...(VENDE.includes(n.cat_id) ? [["vende", E2("Lo que vende", "What it sells")]] : []), ...(oper !== undefined ? [["oper", E2("Operación", "Operations")]] : []), ...(din !== undefined ? [["din", E2("Dinero", "Money")]] : []), ["equipo", E2("Equipo", "Team")], ["cont", E2("Contenido", "Content")], ["confianza", E2("Confianza", "Trust")], ...(sop ? [["soporte", E2("Soporte", "Support")]] : []), ...(cpa !== undefined ? [["compa", "El Compa"]] : [])].map(([k, l]) => ({ l: l!, n: k === "confianza" && casosAbiertos.length ? String(casosAbiertos.length) : undefined, on: tab === k, onClick: () => ir(k!) })) };

  const historial = (filtro?: (a: string) => boolean): ReactNode => {
    const h = n.historial.filter((x) => !filtro || filtro(x.action));
    return h.length ? <A.AuditLog rows={h.map((x) => ({ who: x.quien ?? E2("Equipo", "Team"), initials: (x.quien ?? "E").slice(0, 1), action: `${VERBO(E2)[x.action] ?? x.action} ${n.name}`, before: val(x.before), after: val(x.after), why: x.reason ?? undefined, when: hace(x.at, ahora, en) }))} />
      : <A.AdminNote tone="info" icon="folder">{E2("Nadie del equipo ha hecho cambios aquí todavía.", "No one on the team has made changes here yet.")}</A.AdminNote>;
  };

  let cuerpo: ReactNode;
  if (tab === "ficha") {
    const vis = n.fotos.filter((f) => f.status === "visible"), quit = n.fotos.filter((f) => f.status !== "visible");
    const campo = (k: "name" | "about" | "phone" | "address", t: string, v: string, area = false) => ({
      icon: "edit", title: t, sub: v || "—", tag: n.admin_edits?.[k] ? E2("EDITADO POR TO’LATINO", "EDITED BY TO’LATINO") : undefined, tone: "action",
      actions: P.editar ? [{ label: E2("Editar", "Edit"), variant: "secondary", onClick: () => setConf({ titulo: E2(`Editar en nombre del negocio · ${t}`, `Edit on behalf of the business · ${t}`), sub: E2("El dueño ve que el equipo editó su página. El motivo queda en el historial.", "The owner sees that the team edited their page. The reason stays in the history."), cta: E2("Guardar", "Save"), valor: { k: E2(`NUEVO VALOR · ${t.toUpperCase()}`, `NEW VALUE · ${t.toUpperCase()}`), ini: v, area, max: k === "about" ? 300 : k === "address" ? 160 : 80 }, nota: "interna", hacer: (m, _e, valor) => editarCampo(n.id, k, valor, m) }) }] : undefined,
    });
    cuerpo = (
      <>
        <A.AdminNote tone="info" icon="store">{E2("Así lo ve el cliente y así lo edita el negocio. Si editas en su nombre, queda en el historial y el dueño lo ve en su panel.", "This is how the customer sees it and how the business edits it. If you edit on their behalf, it stays in the history and the owner sees it in their dashboard.")}</A.AdminNote>
        {vis[0] ? <div style={{ height: 220, borderRadius: 18, backgroundImage: fotoFondo(vis[0].url, 540), backgroundSize: "cover", backgroundPosition: "center", backgroundColor: "var(--tl-photo-bg)" }} /> : null}
        <A.AdminList label={E2(`FOTOS DEL NEGOCIO · ${vis.length}${quit.length ? ` · ${quit.length} QUITADAS` : ""}`, `BUSINESS PHOTOS · ${vis.length}${quit.length ? ` · ${quit.length} REMOVED` : ""}`)} rows={n.fotos.map((f, i) => ({
          image: f.url, imageSize: 52, title: f.status === "visible" ? (i === 0 ? E2("Portada", "Cover") : E2(`Foto ${i + 1}`, `Photo ${i + 1}`)) : E2("Foto", "Photo"), sub: f.status === "visible" ? E2("La sube el negocio", "Uploaded by the business") : E2(`Quitada: ${f.removed_note ?? ""}`, `Removed: ${f.removed_note ?? ""}`),
          tag: f.status !== "visible" ? E2("QUITADA", "REMOVED") : undefined, tone: "danger",
          actions: P.retirar ? (f.status === "visible" ? (vis.length > 1 ? [{ label: E2("Quitar", "Remove"), variant: "danger", onClick: () => setConf({ titulo: E2("¿Por qué se quita esta foto?", "Why is this photo being removed?"), plantillas: FOTO(E2), peligro: true, nota: "persona", hacer: (m) => foto(n.id, f.id, true, m) }) }] : [])
            : [{ label: E2("Restaurar", "Restore"), variant: "secondary", onClick: () => setConf({ titulo: E2("¿Por qué vuelve esta foto?", "Why is this photo coming back?"), plantillas: [E2("No rompe las reglas del barrio", "It doesn’t break the neighborhood rules"), E2("El reporte no trae evidencia", "The report has no evidence")], nota: "interna", hacer: (m) => foto(n.id, f.id, false, m) }) }]) : undefined,
        }))} />
        {vis.length === 1 ? <A.AdminNote tone="info" icon="image">{E2("Es la única foto visible: para quitarla, pide al dueño que suba otra.", "It’s the only visible photo: to remove it, ask the owner to upload another.")}</A.AdminNote> : null}
        <A.AdminList label={E2("LO QUE VE EL CLIENTE", "WHAT THE CUSTOMER SEES")} rows={[campo("name", E2("Nombre", "Name"), n.name), campo("about", E2("Quiénes somos", "About us"), n.about?.es ?? "", true), { icon: "grid", title: E2("Categoría y subcategorías", "Category and subcategories"), sub: `${n.cat}${n.subs ? ` · ${n.subs}` : ""}` }, campo("phone", E2("Teléfono", "Phone"), n.phone), campo("address", E2("Dirección", "Address"), n.address ?? "")]} />
        {/* 9m · El punto en el mapa y «Corregir el punto» (con motivo; el dueño lo ve en su panel). */}
        <PuntoAdmin id={n.id} lat={n.lat} lng={n.lng} centro={[n.clat, n.clng]} fijado={n.geo_fixed} motivoFijado={n.geo_fixed_reason} puede={!!P.editar} />
        <PanelBloques bloques={[{ type: "group", k: E2("HORARIO", "HOURS") }, { type: "kv", cols: 2, items: DIAS(E2).map((d, i) => { const x = n.horas[i]!; return { k: d.toUpperCase(), v: x.on ? `${fmtHora(x.a)} – ${fmtHora(x.b)}${x.two ? ` · ${fmtHora(x.a2)} – ${fmtHora(x.b2)}` : ""}` : E2("Cerrado", "Closed"), fg: x.on ? undefined : "rgba(11,14,18,.6)" }; }) }]} />
      </>);
  } else if (tab === "vende" && n.cat_id === "NEG-FOOD") {
    const MOD: ["menu" | "pedidos" | "delivery" | "rsv", string, string][] = [["menu", E2("Menú", "Menu"), E2("La pestaña Menú de su página", "The Menu tab on their page")], ["pedidos", E2("Pedidos en línea", "Online orders"), E2(`Que se pueda pedir desde su menú · ${n.pedidosMes} este mes${n.plan === "pro" ? "" : ` (${n.pedidosFree} de ${n.pedidosCap} con Free)`}`, `Ordering from their menu · ${n.pedidosMes} this month${n.plan === "pro" ? "" : ` (${n.pedidosFree} of ${n.pedidosCap} on Free)`}`)],
      ["delivery", "Delivery", E2("Que le lleven el pedido a la casa (la página ofrece solo pickup si se pausa)", "Orders delivered to the customer’s home (the page offers pickup only if paused)")],
      ["rsv", E2("Reservaciones", "Reservations"), n.plan !== "pro" ? E2("Es de Pro: este negocio no la ofrece", "Pro only: this business doesn’t offer it") : E2(`${n.rsvOn ? "La pestaña Reservaciones de su página" : "Apagada por el dueño"} · ${n.rsvMes} este mes${n.rsvPend ? ` · ${n.rsvPend} esperan respuesta` : ""}`, `${n.rsvOn ? "The Reservations tab on their page" : "Turned off by the owner"} · ${n.rsvMes} this month${n.rsvPend ? ` · ${n.rsvPend} awaiting reply` : ""}`)]];
    const PL = [E2("Platos que no corresponden a su categoría", "Dishes that don’t fit their category"), E2("Precios o fotos engañosos", "Misleading prices or photos"), E2("Lo pidió el dueño", "The owner asked for it"), E2("Reportes de clientes", "Customer reports")];
    const ocultos = n.menu.filter((i) => i.hidden).length;
    cuerpo = (
      <>
        <A.AdminList label={E2("MÓDULOS", "MODULES")} rows={MOD.map(([k, t, sub]) => { const off = n.modsOff[k] as { reason?: string } | undefined; return {
          icon: k === "menu" ? "restaurant" : k === "rsv" ? "calendar" : k === "delivery" ? "truck" : "bag", title: t, sub: off ? E2(`Pausado por To’Latino: ${off.reason ?? ""}`, `Paused by To’Latino: ${off.reason ?? ""}`) : sub, tag: off ? E2("PAUSADO", "PAUSED") : E2("ACTIVO", "ACTIVE"), tone: off ? "danger" : "signal",
          actions: P.retirar ? [off ? { label: E2("Reanudar", "Resume"), variant: "secondary", onClick: () => setConf({ titulo: E2(`¿Por qué se reanuda ${t}?`, `Why is ${t} resuming?`), nota: "interna", hacer: (m) => moduloPausar(n.id, k, false, m) }) }
            : { label: E2("Pausar", "Pause"), variant: "danger", onClick: () => setConf({ titulo: E2(`Pausar ${t}`, `Pause ${t}`), sub: k === "menu" ? E2("La pestaña Menú deja de salir en su página. El dueño ve el motivo en su panel.", "The Menu tab stops showing on their page. The owner sees the reason in their dashboard.") : k === "delivery" ? E2("Su página ofrece solo pickup; los pedidos en curso siguen. El dueño ve el motivo en su panel.", "Their page offers pickup only; orders in progress continue. The owner sees the reason in their dashboard.") : k === "rsv" ? E2("La pestaña Reservaciones deja de salir en su página; las reservaciones hechas siguen. El dueño ve el motivo en su panel.", "The Reservations tab stops showing on their page; existing reservations continue. The owner sees the reason in their dashboard.") : E2("Su menú se ve, pero no se puede pedir. El dueño ve el motivo en su panel.", "Their menu shows, but no one can order. The owner sees the reason in their dashboard."), peligro: true, plantillas: PL, nota: "persona", hacer: (m) => moduloPausar(n.id, k, true, m) }) }] : undefined }; })} />
        {n.menu.length ? <A.AdminList label={E2(`MENÚ · ${n.menu.length} PLATOS${ocultos ? ` · ${ocultos} OCULTOS` : ""}`, `MENU · ${n.menu.length} DISHES${ocultos ? ` · ${ocultos} HIDDEN` : ""}`)} rows={n.menu.map((i) => ({
          icon: "restaurant", title: i.name, sub: `${i.sec ?? E2("Sin categoría", "No category")} · $${(i.cents / 100).toFixed(2)}${i.hidden ? E2(` · Oculto: ${i.reason ?? ""}`, ` · Hidden: ${i.reason ?? ""}`) : ""}`, tag: i.hidden ? E2("OCULTO", "HIDDEN") : undefined, tone: "danger",
          actions: P.retirar ? [i.hidden ? { label: E2("Volver a mostrar", "Show again"), variant: "secondary", onClick: () => setConf({ titulo: E2(`¿Por qué vuelve «${i.name}»?`, `Why is “${i.name}” coming back?`), nota: "interna", hacer: (m) => platoOcultar(n.id, i.id, false, m) }) }
            : { label: E2("Ocultar", "Hide"), variant: "secondary", onClick: () => setConf({ titulo: E2(`Ocultar «${i.name}»`, `Hide “${i.name}”`), sub: E2("Deja de salir en su menú. El dueño ve el motivo en su panel.", "It stops showing on their menu. The owner sees the reason in their dashboard."), peligro: true, plantillas: PL, nota: "persona", hacer: (m) => platoOcultar(n.id, i.id, true, m) }) }] : undefined,
        }))} /> : <A.AdminNote tone="info" icon="restaurant">{E2("Todavía no tiene platos en su menú.", "No dishes on their menu yet.")}</A.AdminNote>}
      </>);
  } else if (tab === "vende" && VENDE_RET.includes(n.cat_id)) {
    // Mercados y Tiendas (4n): pausar Productos o Pedidos y ocultar un producto con motivo (el dueño lo ve en su panel).
    const merc = n.cat_id === "NEG-MERC", MODR: ["menu" | "pedidos", string, string][] = [["menu", E2("Productos", "Products"), E2("La pestaña Productos de su página", "The Products tab on their page")], ["pedidos", merc ? E2("Pedidos del mercado", "Market orders") : E2("Apartados", "Holds"), merc ? E2("Que se pueda pedir pickup o envío", "Ordering for pickup or shipping") : E2("Que se pueda apartar", "Placing holds")]];
    const PLR = [E2("Producto que no corresponde a su categoría", "Product that doesn’t fit their category"), E2("Precios o fotos engañosos", "Misleading prices or photos"), E2("Venta que la ley no permite en la app", "A sale the law doesn’t allow in the app"), E2("Lo pidió el dueño", "The owner asked for it"), E2("Reportes de clientes", "Customer reports")];
    const SK: Record<string, string> = { peso: E2("Por libra", "By the pound"), unid: E2("Por unidad", "Per unit"), plato: E2("Listo para llevar", "Ready to go"), talla: E2("Con tallas", "With sizes"), plan: E2("Con plan", "With plan"), serv: E2("En la tienda", "In store") };
    const ocultos = n.productos.filter((i) => i.hidden).length;
    cuerpo = (
      <>
        <A.AdminList label={E2("MÓDULOS", "MODULES")} rows={MODR.map(([k, t, sub]) => { const off = n.modsOff[k] as { reason?: string } | undefined; return {
          icon: k === "menu" ? "grid" : "bag", title: t, sub: off ? E2(`Pausado por To’Latino: ${off.reason ?? ""}`, `Paused by To’Latino: ${off.reason ?? ""}`) : sub, tag: off ? E2("PAUSADO", "PAUSED") : E2("ACTIVO", "ACTIVE"), tone: off ? "danger" : "signal",
          actions: P.retirar ? [off ? { label: E2("Reanudar", "Resume"), variant: "secondary", onClick: () => setConf({ titulo: E2(`¿Por qué se reanuda ${t}?`, `Why is ${t} resuming?`), nota: "interna", hacer: (m) => moduloPausar(n.id, k, false, m) }) }
            : { label: E2("Pausar", "Pause"), variant: "danger", onClick: () => setConf({ titulo: E2(`Pausar ${t}`, `Pause ${t}`), sub: E2("El dueño ve el motivo en su panel; lo que ya pidieron sigue.", "The owner sees the reason in their dashboard; existing orders continue."), peligro: true, plantillas: PLR, nota: "persona", hacer: (m) => moduloPausar(n.id, k, true, m) }) }] : undefined }; })} />
        {n.productos.length ? <A.AdminList label={E2(`PRODUCTOS · ${n.productos.length}${ocultos ? ` · ${ocultos} OCULTOS` : ""}`, `PRODUCTS · ${n.productos.length}${ocultos ? ` · ${ocultos} HIDDEN` : ""}`)} rows={n.productos.map((i) => ({
          icon: i.sk === "peso" ? "scale" : "bag", title: i.name, sub: `${i.sec ?? E2("Sin sección", "No section")} · $${(i.cents / 100).toFixed(2)}${i.sk === "peso" ? "/lb" : ""} · ${SK[i.sk ?? ""] ?? E2("Producto", "Product")}${i.tallas ? ` · ${i.tallas}` : ""}${i.edad ? E2(" · 21+ · solo en la tienda", " · 21+ · in store only") : i.tienda ? E2(" · solo en la tienda", " · in store only") : ""}${i.hidden ? E2(` · Oculto: ${i.reason ?? ""}`, ` · Hidden: ${i.reason ?? ""}`) : ""}`, tag: i.hidden ? E2("OCULTO", "HIDDEN") : undefined, tone: "danger",
          actions: P.retirar ? [i.hidden ? { label: E2("Volver a mostrar", "Show again"), variant: "secondary", onClick: () => setConf({ titulo: E2(`¿Por qué vuelve «${i.name}»?`, `Why is “${i.name}” coming back?`), nota: "interna", hacer: (m) => platoOcultar(n.id, i.id, false, m) }) }
            : { label: E2("Ocultar", "Hide"), variant: "secondary", onClick: () => setConf({ titulo: E2(`Ocultar «${i.name}»`, `Hide “${i.name}”`), sub: E2("Deja de salir en su página. El dueño ve el motivo en su panel.", "It stops showing on their page. The owner sees the reason in their dashboard."), peligro: true, plantillas: PLR, nota: "persona", hacer: (m) => platoOcultar(n.id, i.id, true, m) }) }] : undefined,
        }))} /> : <A.AdminNote tone="info" icon="bag">{E2("Todavía no tiene productos.", "No products yet.")}</A.AdminNote>}
      </>);
  } else if (tab === "vende" && VENDE_SVC.includes(n.cat_id)) {
    // Servicios y citas (Fase 3 · 3a; Auto y Hogar 4a): pausar Servicios o Citas y ocultar un servicio, siempre con motivo.
    // Auto y Hogar: además, cómo cobra cada servicio y Tu herramienta en solo lectura.
    const of = n.cat_id !== "NEG-BELL", h = n.herramienta, ic = n.cat_id === "NEG-AUTO" ? "wrench" : n.cat_id === "NEG-HOGAR" ? "home" : "scissors";
    const MODB: ["svc" | "citas" | "rsv" | "cot", string, string][] = n.cat_id === "NEG-NOCHE" ? [["svc", E2("Servicios", "Services"), E2("Entrada, lista, mesas, VIP y por fecha en su página", "Entry, guest list, tables, VIP and by date on their page")], ["rsv", E2("Mesas y lista", "Tables and list"), E2("Que se pueda anotar en la lista o pedir mesa en línea (si se pausa, su página dice «llama o pasa por el local»)", "Joining the list or requesting a table online (if paused, their page says “call or stop by”)")]]
      : [["svc", E2("Servicios", "Services"), E2("La pestaña Servicios de su página", "The Services tab on their page")], ["citas", E2("Citas", "Bookings"), E2("Que se pueda pedir cita en línea (si se pausa, su página dice «llama o pasa por el local»)", "Booking online (if paused, their page says “call or stop by”)")],
        // 9n · Cotizaciones: la pausa del módulo (la misma que el Catálogo pone por ciudad) para lo que el vecino pide para saber el precio.
        ...(COT_CATS.includes(n.cat_id) ? [["cot", E2("Cotizaciones", "Quotes"), E2("Pre-estimado con fotos, presupuesto a hasta 3 o precio por escrito (según su tipo de negocio); si se pausa, su página dice «llama al negocio»", "Photo pre-estimate, quotes from up to 3 or a written price (depending on the business type); if paused, their page says “call the business”")] as ["cot", string, string]] : [])];
    const PLS = [E2("Servicios que no corresponden a su categoría", "Services that don’t fit their category"), E2("Precios o fotos engañosos", "Misleading prices or photos"), E2("Lo pidió el dueño", "The owner asked for it"), E2("Reportes de clientes", "Customer reports")];
    const ocS = n.servicios.filter((i) => i.hidden).length;
    cuerpo = (
      <>
        <A.AdminList label={E2("MÓDULOS", "MODULES")} rows={MODB.map(([k, t, sub]) => { const off = n.modsOff[k] as { reason?: string } | undefined; return {
          icon: k === "svc" ? "scissors" : k === "cot" ? "image" : "calendar", title: t, sub: off ? E2(`Pausado por To’Latino: ${off.reason ?? ""}`, `Paused by To’Latino: ${off.reason ?? ""}`) : sub, tag: off ? E2("PAUSADO", "PAUSED") : E2("ACTIVO", "ACTIVE"), tone: off ? "danger" : "signal",
          actions: P.retirar ? [off ? { label: E2("Reanudar", "Resume"), variant: "secondary", onClick: () => setConf({ titulo: E2(`¿Por qué se reanuda ${t}?`, `Why is ${t} resuming?`), nota: "interna", hacer: (m) => moduloPausar(n.id, k, false, m) }) }
            : { label: E2("Pausar", "Pause"), variant: "danger", onClick: () => setConf({ titulo: E2(`Pausar ${t}`, `Pause ${t}`), sub: k === "svc" ? E2("La pestaña Servicios deja de salir en su página. El dueño ve el motivo en su panel.", "The Services tab stops showing on their page. The owner sees the reason in their dashboard.") : k === "cot" ? E2("Su página deja de ofrecer pre-estimado, presupuesto y precio por escrito, y no se reciben pedidos nuevos; lo ya pedido sigue. El dueño ve el motivo en su panel.", "Their page stops offering pre-estimates, quotes and written prices, and no new requests come in; existing ones continue. The owner sees the reason in their dashboard.") : E2("Su página no recibe solicitudes en línea; las citas ya pedidas siguen. El dueño ve el motivo en su panel.", "Their page doesn’t take online requests; existing bookings continue. The owner sees the reason in their dashboard."), peligro: true, plantillas: PLS, nota: "persona", hacer: (m) => moduloPausar(n.id, k, true, m) }) }] : undefined }; })} />
        {n.herramientaRetail ? <A.AdminList label={E2("SU HERRAMIENTA · SOLO LECTURA", "THEIR TOOL · READ ONLY")} rows={[{ icon: n.cat_id === "NEG-MERC" ? "scale" : "bag", title: n.herramientaRetail.titulo, sub: n.herramientaRetail.resumen }]} /> : null}
        {n.herramientaTrans ? <A.AdminList label={E2("SU HERRAMIENTA · SOLO LECTURA", "THEIR TOOL · READ ONLY")} rows={[{ icon: "truck", title: n.herramientaTrans.titulo, sub: `${n.herramientaTrans.resumen}${E2(" · tipo ", " · type ")}${n.herramientaTrans.kind}${n.herramientaTrans.forzado ? E2(" (forzado)", " (forced)") : ""}` }]} /> : null}
        {n.herramientaFe ? <A.AdminList label={`${n.herramientaFe.titulo.toUpperCase()} · ${E2("SOLO LECTURA", "READ ONLY")}`} rows={[{ icon: "bell", title: n.herramientaFe.titulo, sub: `${n.herramientaFe.resumen}${E2(" · tipo ", " · type ")}${n.herramientaFe.kind}${n.herramientaFe.forzado ? E2(" (forzado)", " (forced)") : ""}` },
          ...n.herramientaFe.horarios.map((t) => ({ icon: "calendar", title: t, sub: E2("Horario de la semana", "Weekly schedule") })), { icon: "lock", title: E2("Línea fija", "Fixed line"), sub: n.herramientaFe.linea }]} /> : null}
        {n.herramientaInm ? <A.AdminList label={`${n.herramientaInm.titulo.toUpperCase()} · ${E2("SOLO LECTURA", "READ ONLY")}`} rows={[{ icon: "key", title: n.herramientaInm.titulo, sub: `${n.herramientaInm.resumen}${E2(" · tipo ", " · type ")}${n.herramientaInm.kind}${n.herramientaInm.forzado ? E2(" (forzado)", " (forced)") : ""}` },
          { icon: "lock", title: E2("Línea fija", "Fixed line"), sub: n.herramientaInm.linea },
          ...n.herramientaInm.props.map((p) => ({ icon: "home", title: p.name, sub: `${p.sub}${p.senior ? E2(` · mayores de 62: ${p.senior === "review" ? "por revisar" : p.senior === "ok" ? "confirmada" : "no confirmada"}`, ` · 62 and older: ${p.senior === "review" ? "to review" : p.senior === "ok" ? "confirmed" : "not confirmed"}`) : ""}${p.adm != null ? E2(` · Oculta: ${p.adm}`, ` · Hidden: ${p.adm}`) : ""}`,
            tag: p.adm != null ? E2("OCULTA", "HIDDEN") : p.senior === "review" ? E2("REVISAR", "REVIEW") : undefined, tone: p.adm != null ? "danger" : "warn",
            actions: P.retirar ? [...(p.senior === "review" ? [{ label: E2("Confirmar mayores", "Confirm seniors"), variant: "secondary", onClick: () => setConf({ titulo: E2(`Confirmar vivienda para mayores · «${p.name}»`, `Confirm senior housing · “${p.name}”`), sub: E2("Revisaste la declaración bajo la excepción de la ley (62 o más).", "You reviewed the declaration under the legal exemption (62 or older)."), plantillas: [E2("Declaración revisada", "Declaration reviewed")], nota: "interna", hacer: (m) => mayoresRevisar(n.id, p.id, true, m) }) },
              { label: E2("No se confirma", "Not confirmed"), variant: "danger", onClick: () => setConf({ titulo: E2(`No se confirma · «${p.name}»`, `Not confirmed · “${p.name}”`), sub: E2("La propiedad queda oculta con el motivo hasta que el dueño la corrija.", "The property stays hidden with the reason until the owner fixes it."), peligro: true, plantillas: [E2("No hay declaración de vivienda para mayores", "No senior housing declaration")], nota: "persona", hacer: (m) => mayoresRevisar(n.id, p.id, false, m) }) }] : []),
              p.adm != null ? { label: E2("Volver a mostrar", "Show again"), variant: "secondary", onClick: () => setConf({ titulo: E2(`¿Por qué vuelve «${p.name}»?`, `Why is “${p.name}” coming back?`), nota: "interna", hacer: (m) => propiedadOcultar(n.id, p.id, false, m) }) }
              : { label: E2("Ocultar", "Hide"), variant: "secondary", onClick: () => setConf({ titulo: E2(`Ocultar «${p.name}»`, `Hide “${p.name}”`), sub: E2("Deja de salir en su página y en Buscar. El dueño ve el motivo en su panel.", "It stops showing on their page and in Search. The owner sees the reason in their dashboard."), peligro: true, plantillas: [E2("Texto contra la vivienda justa", "Text against fair housing"), E2("Posible estafa: piden dinero antes de ver", "Possible scam: asks for money before viewing"), E2("Fotos o datos que no son de la propiedad", "Photos or details not of the property")], nota: "persona", hacer: (m) => propiedadOcultar(n.id, p.id, true, m) }) }] : undefined }))]} /> : null}
        {n.herramientaAutos ? <A.AdminList label={`${n.herramientaAutos.titulo.toUpperCase()} · ${E2("SOLO LECTURA", "READ ONLY")}`} rows={[{ icon: "car", title: n.herramientaAutos.titulo, sub: `${n.herramientaAutos.resumen}${E2(" · tipo ", " · type ")}${n.herramientaAutos.kind}${n.herramientaAutos.forzado ? E2(" (forzado)", " (forced)") : ""}` },
          { icon: "lock", title: E2("Línea fija", "Fixed line"), sub: n.herramientaAutos.linea }, { icon: "dollar", title: E2("En la puerta", "Out the door"), sub: n.herramientaAutos.cargo },
          ...n.herramientaAutos.carros.map((x) => ({ icon: "car", title: x.name, sub: `${x.sub}${x.adm != null ? E2(` · Oculto: ${x.adm}`, ` · Hidden: ${x.adm}`) : ""}`, tag: x.adm != null ? E2("OCULTO", "HIDDEN") : undefined, tone: "danger",
            actions: P.retirar ? [x.adm != null ? { label: E2("Volver a mostrar", "Show again"), variant: "secondary", onClick: () => setConf({ titulo: E2(`¿Por qué vuelve «${x.name}»?`, `Why is “${x.name}” coming back?`), nota: "interna", hacer: (m) => carroOcultar(n.id, x.id, false, m) }) }
              : { label: E2("Ocultar", "Hide"), variant: "secondary", onClick: () => setConf({ titulo: E2(`Ocultar «${x.name}»`, `Hide “${x.name}”`), sub: E2("Deja de salir en su página y en Buscar. El dueño ve el motivo en su panel.", "It stops showing on their page and in Search. The owner sees the reason in their dashboard."), peligro: true, plantillas: [E2("El precio en la puerta no coincide con el del lote", "The out-the-door price doesn’t match the lot’s"), E2("Posible estafa: piden dinero antes de ver el carro", "Possible scam: asks for money before seeing the car"), E2("Fotos o datos que no son del vehículo", "Photos or details not of the vehicle"), E2("Título salvage sin decirlo", "Salvage title not disclosed")], nota: "persona", hacer: (m) => carroOcultar(n.id, x.id, true, m) }) }] : undefined }))]} /> : null}
        {n.herramientaDep ? <A.AdminList label={`${n.herramientaDep.titulo.toUpperCase()} · ${E2("SOLO LECTURA", "READ ONLY")}`} rows={[{ icon: "star", title: n.herramientaDep.titulo, sub: `${n.herramientaDep.resumen}${E2(" · tipo ", " · type ")}${n.herramientaDep.kind}` },
          ...(n.herramientaDep.contrato ? [{ icon: "law", title: E2("¿Hay contrato?", "Is there a contract?"), sub: n.herramientaDep.contrato }] : [])]} /> : null}
        {n.herramientaNinos ? <A.AdminList label={n.herramientaNinos.cuidado ? E2("CUPOS Y LICENCIA · SOLO LECTURA", "SPOTS AND LICENSE · READ ONLY") : E2("GRUPOS Y CUPOS · SOLO LECTURA", "GROUPS AND SPOTS · READ ONLY")} rows={[
          { icon: n.herramientaNinos.cuidado ? "users" : "calendar", title: n.herramientaNinos.kind, sub: `${n.herramientaNinos.resumen} · ${n.herramientaNinos.edad}${n.herramientaNinos.bandas ? ` · ${n.herramientaNinos.bandas}` : ""}` },
          { icon: "law", title: n.herramientaNinos.lic, sub: n.herramientaNinos.recibe ? E2("Recibe solicitudes por la app", "Takes requests through the app") : E2("No recibe solicitudes por la app (solo contacto)", "Doesn’t take requests through the app (contact only)"), tag: n.herramientaNinos.recibe ? E2("RECIBE", "TAKES REQUESTS") : E2("SOLO CONTACTO", "CONTACT ONLY"), tone: n.herramientaNinos.recibe ? "signal" : "warn" }]} /> : null}
        {n.herramientaEdu ? <A.AdminList label={E2("GRUPOS Y CUPOS · SOLO LECTURA", "GROUPS AND SPOTS · READ ONLY")} rows={[{ icon: "calendar", title: E2("Grupos y cupos", "Groups and spots"), sub: `${n.herramientaEdu.resumen}${n.herramientaEdu.how ? ` · ${n.herramientaEdu.how}` : ""}` },
          ...n.herramientaEdu.cursos.map((x) => ({ icon: "star", title: `${x.t}${x.vende ? "" : E2(" · oculto", " · hidden")}`, sub: x.s }))]} /> : null}
        {n.herramientaNoche ? <>
          <A.AdminList label={E2("ESTA NOCHE · SOLO LECTURA", "TONIGHT · READ ONLY")} rows={[{ icon: "drink", title: E2("Esta noche", "Tonight"), sub: `${n.herramientaNoche.resumen}${E2(" · tipo ", " · type ")}${kl(n.herramientaNoche.kind, KINDS_LOCAL.find((k) => k[0] === n.herramientaNoche!.kind)?.[1] ?? n.herramientaNoche.kind)}${n.herramientaNoche.forzado ? E2(" (ajustado por To’Latino)", " (adjusted by To’Latino)") : E2(" (por subcategoría)", " (by subcategory)")}` },
            ...n.herramientaNoche.hist.map((p) => ({ icon: "clock", title: p.t, sub: `${new Date(p.at).toLocaleString(en ? "en-US" : "es-US", { weekday: "short", hour: "numeric", minute: "2-digit" })} · ${p.quien ?? "—"}` }))]} />
          {P.editar ? <PanelBloques bloques={[{ type: "chips", k: E2("TIPO DEL LOCAL · DECIDE LA PESTAÑA, EL BOTÓN Y LAS RESEÑAS", "VENUE TYPE · SETS THE TAB, THE BUTTON AND THE REVIEWS"), items: [{ l: E2("Por subcategoría", "By subcategory"), v: n.herramientaNoche.forzado ? "filter" : "selected", onClick: () => setConf({ titulo: E2("¿Por qué vuelve al tipo de sus subcategorías?", "Why is it going back to its subcategory type?"), nota: "interna", hacer: (m) => tipoNoche(n.id, null, m) }) },
            ...KINDS_LOCAL.map(([k, l]) => ({ l: kl(k, l), v: n.herramientaNoche!.forzado && n.herramientaNoche!.kind === k ? "selected" : "filter", onClick: () => setConf({ titulo: E2(`Cambiar el tipo a «${l}»`, `Change the type to “${kl(k, l)}”`), sub: E2("El dueño ve «To’Latino ajustó el tipo de tu negocio». Queda en el historial.", "The owner sees “To’Latino adjusted your business type.” It stays in the history."), nota: "interna", hacer: (m) => tipoNoche(n.id, k, m) }) }))] }]} /> : null}
        </> : null}
        {n.herramientaFiesta ? <A.AdminList label={E2("SU HERRAMIENTA · SOLO LECTURA", "THEIR TOOL · READ ONLY")} rows={[{ icon: "calendar", title: E2("Calendario y depósito", "Calendar and deposit"), sub: n.herramientaFiesta.resumen }]} /> : null}
        {n.herramientaSP ? <A.AdminList label={E2("SU HERRAMIENTA · SOLO LECTURA", "THEIR TOOL · READ ONLY")} rows={[{ icon: n.cat_id === "NEG-SALUD" ? "insurance" : "law", title: n.cat_id === "NEG-SALUD" ? E2("Seguros e idiomas", "Insurance and languages") : E2("Licencias y el total por escrito", "Licenses and the total in writing"), sub: n.herramientaSP.resumen + (n.herramientaSP.acepta ? ` · «${n.herramientaSP.acepta}»` : "") },
          ...n.herramientaSP.gov.filter((g) => g.gov > 0).map((g) => ({ icon: "law", title: bi(g.name), sub: E2(`Honorario $${(g.cents / 100).toLocaleString("en-US")} + gobierno $${(g.gov / 100).toLocaleString("en-US")} = total $${((g.cents + g.gov) / 100).toLocaleString("en-US")}`, `Fee $${(g.cents / 100).toLocaleString("en-US")} + government $${(g.gov / 100).toLocaleString("en-US")} = total $${((g.cents + g.gov) / 100).toLocaleString("en-US")}`) }))]} /> : null}
        {n.cat_id === "NEG-PRO" || n.cat_id === "NEG-SALUD" || n.cat_id === "NEG-NOCHE" || n.cat_id === "NEG-EDU" || n.cat_id === "NEG-NINOS" ? (n.licencias.length ? <A.AdminList label={E2(`LICENCIAS · ${n.licencias.length}`, `LICENSES · ${n.licencias.length}`)} rows={n.licencias.map((l) => {
          const [sub, tag, tone] = LIC_ST[l.status] ?? LIC_ST.review!;
          return { icon: "law", title: `${bi(l.title)}${l.who ? ` · ${l.who}` : ""}`, sub: `${sub}${l.number ? ` · ${l.label} ${l.number}` : E2(" · sin número", " · no number")}`, tag, tone,
            actions: P.editar && l.status === "valid" ? [
              { label: E2("Vencida", "Expired"), variant: "secondary", onClick: () => setConf({ titulo: E2(`Marcar vencida: ${l.title.es}`, `Mark expired: ${bi(l.title)}`), sub: E2("El registro oficial dice que venció. Su página lo dice y, si es la licencia de una guardería, deja de recibir solicitudes por la app.", "The official registry says it expired. Their page says so and, if it’s a daycare license, it stops taking requests through the app."), peligro: true, plantillas: [E2("El registro oficial dice que venció", "The official registry says it expired")], nota: "interna", hacer: (m) => licencia(n.id, l.id, "expired", m) }) },
              { label: E2("Retirar", "Revoke"), variant: "danger", onClick: () => setConf({ titulo: E2(`Retirar la licencia: ${l.title.es}`, `Revoke the license: ${bi(l.title)}`), sub: E2("Deja de salir «con licencia» en su página y en Buscar. El motivo queda en la auditoría.", "It stops showing “licensed” on their page and in Search. The reason stays in the audit log."), peligro: true, plantillas: [E2("No aparece en el registro oficial", "Not in the official registry"), E2("El número no coincide con el negocio", "The number doesn’t match the business")], nota: "interna", hacer: (m) => licencia(n.id, l.id, "revoked", m) }) },
            ] : P.editar && l.status !== "valid" ? [
              { label: E2("Verificar", "Verify"), variant: "secondary", onClick: () => setConf({ titulo: E2(`Verificar la licencia: ${l.title.es}`, `Verify the license: ${bi(l.title)}`), sub: E2("Confirma que el número existe en el registro oficial del estado.", "Confirm the number exists in the official state registry."), plantillas: [E2("Coincide con el registro oficial", "Matches the official registry")], nota: "interna", hacer: (m) => licencia(n.id, l.id, "valid", m) }) },
              ...(l.status === "review" ? [{ label: E2("No se pudo", "Couldn’t verify"), variant: "secondary", onClick: () => setConf({ titulo: E2(`No se pudo verificar: ${l.title.es}`, `Couldn’t verify: ${bi(l.title)}`), peligro: true, nota: "interna", hacer: (m) => licencia(n.id, l.id, "not_found", m) }) }] : []),
            ] : undefined };
        })} /> : <A.AdminNote tone="info" icon="law">{E2("No declaró licencias.", "No licenses declared.")}</A.AdminNote>) : null}
        {of && h ? <A.AdminList label={E2("SU HERRAMIENTA · SOLO LECTURA", "THEIR TOOL · READ ONLY")} rows={[{ icon: ic, title: E2(`Mano de obra $${h.rate / 100}/h`, `Labor $${h.rate / 100}/h`), sub: n.cat_id === "NEG-AUTO" ? E2(`Garantía ${h.warrM ?? "—"} meses · ${(h.warrMi ?? 0).toLocaleString("en-US")} mi · listo el mismo día si lo dejan antes de las ${h.cut ? `${h.cut % 12 || 12} ${h.cut < 12 ? "AM" : "PM"}` : "—"}`, `Warranty ${h.warrM ?? "—"} months · ${(h.warrMi ?? 0).toLocaleString("en-US")} mi · same-day if dropped off before ${h.cut ? `${h.cut % 12 || 12} ${h.cut < 12 ? "AM" : "PM"}` : "—"}`) : E2(`Hasta ${h.zone ?? "—"} mi · ${h.h24 ? "emergencias 24 h" : "sin emergencias"}`, `Up to ${h.zone ?? "—"} mi · ${h.h24 ? "24 h emergencies" : "no emergencies"}`) }]} /> : null}
        {n.servicios.length ? <A.AdminList label={E2(`SERVICIOS · ${n.servicios.length} · COMO LOS DEJÓ EL DUEÑO${ocS ? ` · ${ocS} OCULTOS` : ""}`, `SERVICES · ${n.servicios.length} · AS THE OWNER SET THEM${ocS ? ` · ${ocS} HIDDEN` : ""}`)} rows={n.servicios.map((i) => ({
          icon: i.extra ? "plus" : ic, title: i.name, sub: `${i.extra ? "Extra" : i.sec ?? E2("Sin categoría", "No category")} · ${n.cat_id === "NEG-FE" && !i.extra ? feL(i, E2) : `${of && i.k ? `${KIND_L(E2)[i.k] ?? i.k} · ` : ""}$${(i.cents / 100).toFixed(2)}${i.dur ? ` · ${i.dur} min` : ""}`}${!i.own ? E2(" · apagado por el dueño", " · turned off by the owner") : ""}${i.hidden ? E2(` · Oculto: ${i.reason ?? ""}`, ` · Hidden: ${i.reason ?? ""}`) : ""}`, tag: i.hidden ? E2("OCULTO", "HIDDEN") : undefined, tone: "danger",
          actions: P.retirar ? [i.hidden ? { label: E2("Volver a mostrar", "Show again"), variant: "secondary", onClick: () => setConf({ titulo: E2(`¿Por qué vuelve «${i.name}»?`, `Why is “${i.name}” coming back?`), nota: "interna", hacer: (m) => platoOcultar(n.id, i.id, false, m) }) }
            : { label: E2("Ocultar", "Hide"), variant: "secondary", onClick: () => setConf({ titulo: E2(`Ocultar «${i.name}»`, `Hide “${i.name}”`), sub: E2("Deja de salir en su página y no se puede reservar. El dueño ve el motivo en su panel.", "It stops showing on their page and can’t be booked. The owner sees the reason in their dashboard."), peligro: true, plantillas: PLS, nota: "persona", hacer: (m) => platoOcultar(n.id, i.id, true, m) }) }] : undefined,
        }))} /> : <A.AdminNote tone="info" icon="scissors">{E2("Todavía no tiene servicios.", "No services yet.")}</A.AdminNote>}
      </>);
  } else if (tab === "vende") {
    cuerpo = (
      <>
        {n.licencias.length ? <A.AdminList label={E2(`SU HERRAMIENTA · LICENCIAS · ${n.licencias.length}`, `THEIR TOOL · LICENSES · ${n.licencias.length}`)} rows={n.licencias.map((l) => {
          const [sub, tag, tone] = LIC_ST[l.status] ?? LIC_ST.review!;
          return { icon: "law", title: `${bi(l.title)}${l.who ? ` · ${l.who}` : ""}`, sub: `${sub}${l.number ? ` · ${l.label} ${l.number}` : E2(" · sin número", " · no number")}`, tag, tone,
            actions: P.editar && l.status !== "valid" ? [
              { label: E2("Verificar", "Verify"), variant: "secondary", onClick: () => setConf({ titulo: E2(`Verificar la licencia: ${l.title.es}`, `Verify the license: ${bi(l.title)}`), sub: E2("Confirma que el número existe en el registro oficial del estado.", "Confirm the number exists in the official state registry."), plantillas: [E2("Coincide con el registro oficial", "Matches the official registry")], nota: "interna", hacer: (m) => licencia(n.id, l.id, "valid", m) }) },
              ...(l.status === "review" ? [{ label: E2("No se pudo", "Couldn’t verify"), variant: "secondary", onClick: () => setConf({ titulo: E2(`No se pudo verificar: ${l.title.es}`, `Couldn’t verify: ${bi(l.title)}`), peligro: true, nota: "interna", hacer: (m) => licencia(n.id, l.id, "not_found", m) }) }] : []),
            ] : undefined };
        })} /> : <A.AdminNote tone="info" icon="law">{E2("No declaró licencias.", "No licenses declared.")}</A.AdminNote>}
        <A.AdminNote tone="info">{E2("Menú, servicios y lo demás que vende llegan con sus módulos.", "Menu, services and everything else it sells arrive with their modules.")}</A.AdminNote>
      </>);
  } else if (tab === "oper" && oper) {
    cuerpo = <N360Oper o={oper} id={n.id} grupo={operK} desk={desk} />;
  } else if (tab === "din" && din) {
    cuerpo = <N360Dinero d={din} id={n.id} nombre={n.name} desk={desk} setConf={setConf} />;
  } else if (tab === "equipo") {
    const dueño = n.equipo.find((m) => m.kind === "owner"), staff = n.equipo.filter((m) => m.kind !== "owner");
    cuerpo = (
      <>
        {dueño ? <A.AdminList label={E2("CUENTAS CON ACCESO AL PANEL", "ACCOUNTS WITH DASHBOARD ACCESS")} rows={[{ icon: "shield", title: n.owner ?? dueño.name, sub: E2(`Dueño · ${n.owner_phone || "—"}`, `Owner · ${n.owner_phone || "—"}`), tag: E2("DUEÑO", "OWNER"), tone: "ink", chevron: !!n.owner_id, onClick: n.owner_id ? () => router.push(`/admin/usuarios/${n.owner_id}`) : undefined }]} />
          : <A.AdminNote tone="warn" icon="lock">{E2("Nadie tiene acceso: el negocio no está reclamado.", "No one has access: the business isn’t claimed.")}</A.AdminNote>}
        {/* 9n · Staff: la pausa del módulo (la misma que el Catálogo pone por ciudad). Pausado, su página no presenta al equipo; reservar sigue igual. */}
        <A.AdminList label={E2("MÓDULO", "MODULE")} rows={[(() => { const off = n.modsOff.staff as { reason?: string } | undefined; return {
          icon: "users", title: "Staff", sub: off ? E2(`Pausado por To’Latino: ${off.reason ?? ""}`, `Paused by To’Latino: ${off.reason ?? ""}`) : E2("La pestaña y el riel del equipo en su página (reservar con quién sigue igual)", "The team tab and rail on their page (choosing who to book with stays the same)"), tag: off ? E2("PAUSADO", "PAUSED") : E2("ACTIVO", "ACTIVE"), tone: off ? "danger" : "signal",
          actions: P.retirar ? [off ? { label: E2("Reanudar", "Resume"), variant: "secondary", onClick: () => setConf({ titulo: E2("¿Por qué se reanuda Staff?", "Why is Staff resuming?"), nota: "interna", hacer: (m) => moduloPausar(n.id, "staff", false, m) }) }
            : { label: E2("Pausar", "Pause"), variant: "danger", onClick: () => setConf({ titulo: E2("Pausar Staff", "Pause Staff"), sub: E2("Su página deja de presentar al equipo (pestaña, riel y «Ver equipo»). Reservar un servicio sigue igual. El dueño ve el motivo en su panel.", "Their page stops presenting the team (tab, rail and “See team”). Booking a service stays the same. The owner sees the reason in their dashboard."), peligro: true, plantillas: BIZ(E2), nota: "persona", hacer: (m) => moduloPausar(n.id, "staff", true, m) }) }] : undefined }; })()]} />
        <A.AdminList label={E2(`STAFF · COMO LO DEJÓ EL DUEÑO · ${staff.length}`, `STAFF · AS THE OWNER SET IT · ${staff.length}`)} rows={staff.map((m) => ({
          icon: "users", title: m.name, sub: [en ? (m.role as { es: string; en?: string } | null)?.en || m.role?.es : m.role?.es, m.since ? E2(`desde ${m.since}`, `since ${m.since}`) : null, m.phone || null, m.hidden ? m.hidden_reason : null].filter(Boolean).join(" · "),
          tag: m.panel_off ? E2("SIN ACCESO", "NO ACCESS") : m.hidden ? E2("QUITADO", "REMOVED") : m.status === "invited" ? E2("INVITADO", "INVITED") : m.status === "requested" ? E2("PIDE UNIRSE", "WANTS TO JOIN") : !m.show ? E2("OCULTO POR EL DUEÑO", "HIDDEN BY THE OWNER") : n.plan !== "pro" ? E2("NO SALE CON FREE", "NOT SHOWN ON FREE") : undefined, tone: m.hidden || m.panel_off ? "danger" : "neutral",
          actions: P.retirar && m.status === "active" ? [...(m.panel ? [m.panel_off
            ? { label: E2("Devolver acceso", "Restore access"), variant: "secondary", onClick: () => setConf({ titulo: E2(`Devolver acceso a ${m.name}`, `Restore access for ${m.name}`), sub: E2("Vuelve a entrar al panel con lo que el dueño le dio. El dueño recibe el aviso.", "They can enter the dashboard again with what the owner gave them. The owner is notified."), cta: E2("Devolver", "Restore"),
                plantillas: [E2("Lo pidió el dueño por Soporte", "The owner asked through Support"), E2("Se revisó y está bien", "Reviewed and it’s fine")], nota: "interna", hacer: (x) => accesoPanelEquipo(n.id, m.id, false, x) }) }
            : { label: E2("Quitar acceso", "Remove access"), variant: "secondary", onClick: () => setConf({ titulo: E2(`Quitar acceso a ${m.name}`, `Remove access for ${m.name}`), sub: E2(`Deja de entrar al panel de ${n.name}. El dueño recibe el aviso.`, `They can no longer enter the ${n.name} dashboard. The owner is notified.`), peligro: true, cta: E2("Quitar acceso", "Remove access"),
                plantillas: [E2("Lo pidió el dueño por Soporte", "The owner asked through Support"), E2("Actividad sospechosa en el panel", "Suspicious activity in the dashboard"), E2("Ya no trabaja en el negocio", "No longer works at the business")], nota: "interna", hacer: (x) => accesoPanelEquipo(n.id, m.id, true, x) }) }] : []), m.hidden
            ? { label: E2("Volver a mostrar", "Show again"), variant: "secondary", onClick: () => setConf({ titulo: E2(`¿Por qué vuelve ${m.name}?`, `Why is ${m.name} coming back?`), nota: "interna", hacer: (x) => staffPagina(n.id, m.id, false, x) }) }
            : { label: E2("Quitar de la página", "Remove from page"), variant: "secondary", onClick: () => setConf({ titulo: E2(`Quitar a ${m.name} de la página`, `Remove ${m.name} from the page`), sub: E2("Sigue en el equipo del negocio; deja de salir en su página. El dueño ve el motivo en su panel.", "They stay on the business’s team but stop showing on its page. The owner sees the reason in their dashboard."), plantillas: BIZ(E2), peligro: true, nota: "persona", hacer: (x) => staffPagina(n.id, m.id, true, x) }) }] : undefined,
        }))} />
        {!staff.length ? <A.AdminNote tone="info" icon="users">{E2("Solo el dueño. Las personas del equipo salen aquí cuando el dueño las invita.", "Only the owner. Team members show here when the owner invites them.")}</A.AdminNote> : null}
      </>);
  } else if (tab === "cont") {
    // ADM-NEG · Contenido (prototipo tab 'cont'): reseñas con su estado, el reporte abierto y ocultar / restaurar con motivo.
    cuerpo = (
      <>
        <A.AdminList label={E2(`RESEÑAS · ${n.resenasN.n} · RESPONDIÓ ${n.resenasN.rep}`, `REVIEWS · ${n.resenasN.n} · REPLIED ${n.resenasN.rep}`)} rows={n.resenas.map((r) => ({
          icon: "star", title: `${r.name} · ${"★".repeat(r.stars)}`, sub: `${r.body.slice(0, 110)}${r.reply ? E2(" · el negocio respondió", " · the business replied") : E2(" · sin respuesta", " · no reply")}${r.status === "hidden" && r.hidden_reason ? E2(` · Oculta: ${r.hidden_reason}`, ` · Hidden: ${r.hidden_reason}`) : ""}`,
          tag: r.status === "hidden" ? E2("OCULTA", "HIDDEN") : r.caso ? E2("REPORTADA", "REPORTED") : undefined, tone: "danger",
          actions: [
            ...(r.caso ? [{ label: E2("Reporte", "Report"), variant: "secondary", onClick: () => router.push(`/admin/colas?caso=${r.caso}`) }] : []),
            ...(P.retirar ? [r.status === "hidden"
              ? { label: E2("Restaurar", "Restore"), variant: "secondary", onClick: () => setConf({ titulo: E2(`Restaurar reseña de ${r.name}`, `Restore review by ${r.name}`), plantillas: [E2("No rompe las reglas del barrio", "It doesn’t break the neighborhood rules"), E2("Es una opinión sobre el servicio", "It’s an opinion about the service"), E2("El reporte no trae evidencia", "The report has no evidence")], nota: "interna", hacer: (m) => resenaOcultar(n.id, r.id, false, m) }) }
              : { label: E2("Ocultar", "Hide"), variant: "danger", onClick: () => setConf({ titulo: E2(`Ocultar reseña de ${r.name}`, `Hide review by ${r.name}`), sub: E2("Sale de su página y de las estrellas. El autor ve el motivo.", "It leaves their page and the star rating. The author sees the reason."), peligro: true, plantillas: [E2("Tiene datos personales", "Contains personal information"), E2("Ofensiva o discriminatoria", "Offensive or discriminatory"), E2("No fue cliente: sin transacción", "Not a customer: no transaction"), E2("Spam o publicidad", "Spam or ads"), E2("Amenaza o acoso", "Threat or harassment")], nota: "persona", hacer: (m) => resenaOcultar(n.id, r.id, true, m) }) }] : []),
          ],
        }))} />
        {!n.resenas.length ? <A.AdminNote tone="info" icon="star">{E2("Sin reseñas.", "No reviews.")}</A.AdminNote> : null}
        <A.AdminList label={E2(`NOVEDADES · ${n.novedades.length}`, `UPDATES · ${n.novedades.length}`)} rows={n.novedades.map((p) => ({
          icon: "news", title: p.title, sub: `${p.body ? `${p.body.slice(0, 90)} · ` : ""}${p.kind.toUpperCase()} · +${p.up} −${p.dn} · ${E2(`hace ${p.h < 24 ? `${Math.max(0, p.h)} h` : `${Math.floor(p.h / 24)} d`}`, `${p.h < 24 ? `${Math.max(0, p.h)} h` : `${Math.floor(p.h / 24)} d`} ago`)}${p.st === "adm" && p.hidden_reason ? E2(` · Oculta: ${p.hidden_reason}`, ` · Hidden: ${p.hidden_reason}`) : ""}`,
          tag: p.st === "adm" ? E2("OCULTA", "HIDDEN") : p.st === "quitada" ? E2("QUITADA POR EL DUEÑO", "REMOVED BY THE OWNER") : p.st === "detenida" ? E2("DETENIDA POR EL DUEÑO", "STOPPED BY THE OWNER") : p.st === "programada" ? E2("PROGRAMADA", "SCHEDULED") : p.st === "terminada" ? E2("TERMINADA", "ENDED") : undefined, tone: p.st === "adm" ? "danger" : "neutral",
          actions: P.retirar && p.st !== "quitada" ? [p.st === "adm"
            ? { label: E2("Mostrar la novedad", "Show the update"), variant: "secondary", onClick: () => setConf({ titulo: E2(`¿Por qué vuelve «${p.title}»?`, `Why is “${p.title}” coming back?`), plantillas: [E2("No rompe las reglas del barrio", "It doesn’t break the neighborhood rules"), E2("El reporte no trae evidencia", "The report has no evidence")], nota: "interna", hacer: (m) => novedadOcultar(n.id, p.id, false, m) }) }
            : { label: E2("Ocultar la novedad", "Hide the update"), variant: "danger", onClick: () => setConf({ titulo: E2(`Ocultar «${p.title}»`, `Hide “${p.title}”`), sub: E2("Sale de su página. El dueño ve el motivo en su panel.", "It leaves their page. The owner sees the reason in their dashboard."), peligro: true, plantillas: [E2("Spam o publicidad", "Spam or ads"), E2("Precio engañoso", "Misleading price"), E2("Ofensiva o discriminatoria", "Offensive or discriminatory"), E2("Tiene datos personales", "Contains personal information")], nota: "persona", hacer: (m) => novedadOcultar(n.id, p.id, true, m) }) }] : undefined,
        }))} />
        {!n.novedades.length ? <A.AdminNote tone="info" icon="news">{E2("Sin novedades.", "No updates.")}</A.AdminNote> : null}
        {P.retirar && n.plan === "pro" ? (n.modsOff.nov
          ? <A.AdminNote tone="bad" icon="ban" cta={E2("Reanudar", "Resume")} onCta={() => setConf({ titulo: E2("¿Por qué se reanuda Novedades?", "Why are Updates resuming?"), nota: "interna", hacer: (m) => moduloPausar(n.id, "nov", false, m) })}>{E2(`Novedades en pausa: ${n.modsOff.nov.reason}`, `Updates paused: ${n.modsOff.nov.reason}`)}</A.AdminNote>
          : <A.AdminNote tone="info" icon="news" cta={E2("Pausar Novedades", "Pause Updates")} onCta={() => setConf({ titulo: E2("Pausar Novedades", "Pause Updates"), sub: E2("La pestaña deja de salir en la ficha hasta que la reactives. El dueño recibe el motivo.", "The tab stops showing on the page until you turn it back on. The owner gets the reason."), peligro: true, plantillas: [E2("Reportes de clientes", "Customer reports"), E2("Precios engañosos", "Misleading prices"), "Spam"], nota: "persona", hacer: (m) => moduloPausar(n.id, "nov", true, m) })}>{E2("Novedades activas en su página.", "Updates active on their page.")}</A.AdminNote>) : null}
        <A.AdminList label={E2(`VACANTES · ${n.vacantes.length}`, `JOBS · ${n.vacantes.length}`)} rows={n.vacantes.map((j) => ({
          icon: "brief", title: j.title, sub: `$${(j.pay / 100).toFixed(2).replace(/\.00$/, "")}${j.payTo && j.payTo > j.pay ? `–${(j.payTo / 100).toFixed(2).replace(/\.00$/, "")}` : ""}${E2(`/hora · ${j.apps} ${j.apps === 1 ? "solicitud" : "solicitudes"} · hace ${j.h < 24 ? `${Math.max(0, j.h)} h` : `${Math.floor(j.h / 24)} d`}`, `/hour · ${j.apps} ${j.apps === 1 ? "application" : "applications"} · ${j.h < 24 ? `${Math.max(0, j.h)} h` : `${Math.floor(j.h / 24)} d`} ago`)}${j.st === "adm" && j.hidden_reason ? E2(` · Oculta: ${j.hidden_reason}`, ` · Hidden: ${j.hidden_reason}`) : ""}`,
          tag: j.st === "adm" ? E2("OCULTA", "HIDDEN") : j.st === "removed" ? E2("QUITADA POR EL DUEÑO", "REMOVED BY THE OWNER") : j.st === "paused" ? E2("PAUSADA", "PAUSED") : j.st === "filled" ? E2("CUBIERTA", "FILLED") : j.st === "draft" ? E2("BORRADOR", "DRAFT") : undefined, tone: j.st === "adm" ? "danger" : "neutral",
          actions: P.retirar && j.st !== "removed" ? [j.st === "adm"
            ? { label: E2("Mostrar la vacante", "Show the job"), variant: "secondary", onClick: () => setConf({ titulo: E2(`¿Por qué vuelve «${j.title}»?`, `Why is “${j.title}” coming back?`), plantillas: [E2("No rompe las reglas", "It doesn’t break the rules"), E2("El reporte no trae evidencia", "The report has no evidence")], nota: "interna", hacer: (m) => vacanteOcultar(n.id, j.id, false, m) }) }
            : { label: E2("Ocultar la vacante", "Hide the job"), variant: "danger", onClick: () => setConf({ titulo: E2(`Ocultar «${j.title}»`, `Hide “${j.title}”`), sub: E2("Sale de su página y nadie nuevo aplica. El dueño ve el motivo en su panel.", "It leaves their page and no one new can apply. The owner sees the reason in their dashboard."), peligro: true, plantillas: [E2("Pide papeles, SSN o pago para aplicar", "Asks for papers, SSN or payment to apply"), E2("Pago por debajo del mínimo", "Pay below minimum wage"), E2("Vacante falsa o engañosa", "Fake or misleading job"), E2("Discriminatoria", "Discriminatory")], nota: "persona", hacer: (m) => vacanteOcultar(n.id, j.id, true, m) }) }] : undefined,
        }))} />
        {!n.vacantes.length ? <A.AdminNote tone="info" icon="brief">{E2("Sin vacantes.", "No jobs.")}</A.AdminNote> : null}
        {evts ? <>
          <A.AdminList label={E2(`EVENTOS · ${evts.filas.length}${evts.org.bloqueado ? " · ORGANIZADOR BLOQUEADO" : evts.org.verificado ? " · ORGANIZADOR VERIFICADO" : ""}`, `EVENTS · ${evts.filas.length}${evts.org.bloqueado ? " · ORGANIZER BLOCKED" : evts.org.verificado ? " · ORGANIZER VERIFIED" : ""}`)} rows={evts.filas.map((e) => { const [tag, tone] = estadoEvt(e.st, e.hidden, e.pending, E2); return {
            icon: "ticket", title: bi(e.t), sub: `${diaCorto(e.dia, !en)} · ${hora(e.h0)} · ${e.entrada === "tickets" ? E2("Boletos", "Tickets") : e.entrada === "rsvp" ? "RSVP" : E2("Libre", "Free")}`, tag, tone, chevron: true, onClick: () => router.push(`/admin/eventos/${e.id}`) }; })} />
          {!evts.filas.length ? <A.AdminNote tone="info" icon="ticket">{E2("Sin eventos enviados.", "No events submitted.")}</A.AdminNote> : null}
          {/* 6j · Liquidaciones del martes (por estado) y cancelaciones del organizador. */}
          {evts.liq.length ? <PanelBloques bloques={[{ type: "kv", cols: 3, items: evts.liq.map((x) => ({ k: `${E2("LIQUIDACIONES", "SETTLEMENTS")} · ${LIQ_N(E2)[x.st] ?? x.st.toUpperCase()}`, v: `${x.n} · $${(x.neto / 100).toFixed(2)}` })) }]} /> : null}
          {evts.cx.length ? <A.AdminList label={E2(`CANCELACIONES · ${evts.cx.length}`, `CANCELLATIONS · ${evts.cx.length}`)} rows={evts.cx.map((x) => ({ icon: "ban", title: `${bi(x.evento)} · ${x.scope === "date" ? E2("una fecha", "one date") : E2("el evento", "the event")}`,
            sub: `${x.by === "admin" ? "To’Latino" : E2("El organizador", "The organizer")} · ${new Date(x.at).toLocaleDateString(en ? "en-US" : "es-US", { day: "numeric", month: "short", year: "numeric" })} · ${E2(`${x.ordenes} órdenes · devuelto`, `${x.ordenes} orders · refunded`)} $${(x.devuelto / 100).toFixed(2)}` }))} /> : null}
          {evts.org.bloqueado ? <A.AdminNote tone="bad" icon="ban">{E2(`Bloqueado para publicar eventos: ${evts.org.bloqueado}`, `Blocked from publishing events: ${evts.org.bloqueado}`)}</A.AdminNote> : null}
          {(() => { const L = accionesOrg({ id: n.id, name: n.name, verificado: evts.org.verificado, bloqueado: evts.org.bloqueado }, { setConf, puede: evts.puede, E2 }); return L.length ? <PanelBloques bloques={[{ type: "acts", items: L }]} /> : null; })()}
          {/* 6b · Pausar el módulo Eventos de este negocio: ninguno de sus eventos sale; el dueño ve el motivo en su panel. */}
          {P.retirar ? (n.modsOff.eventos
            ? <A.AdminNote tone="bad" icon="ban" cta={E2("Reanudar", "Resume")} onCta={() => setConf({ titulo: E2("¿Por qué se reanuda Eventos?", "Why are Events resuming?"), nota: "interna", hacer: (m) => moduloPausar(n.id, "eventos", false, m) })}>{E2(`Eventos en pausa: ${n.modsOff.eventos.reason}`, `Events paused: ${n.modsOff.eventos.reason}`)}</A.AdminNote>
            : <A.AdminNote tone="info" icon="ticket" cta={E2("Pausar Eventos", "Pause Events")} onCta={() => setConf({ titulo: E2("Pausar Eventos", "Pause Events"), sub: E2("Sus eventos dejan de salir en Eventos y en su página hasta que lo reactives (no cambian de estado). El dueño ve el motivo en su panel.", "Their events stop showing in Events and on their page until you turn it back on (their status doesn’t change). The owner sees the reason in their dashboard."), peligro: true, plantillas: [E2("Eventos engañosos", "Misleading events"), E2("Reportes de vecinos", "Neighbor reports"), E2("Cancela seguido sin avisar", "Often cancels without notice")], nota: "persona", hacer: (m) => moduloPausar(n.id, "eventos", true, m) })}>{E2("Eventos activo: sus eventos publicados salen al público.", "Events active: their published events are public.")}</A.AdminNote>) : null}
        </> : null}
        {P.retirar && n.plan === "pro" ? (n.modsOff.jobs
          ? <A.AdminNote tone="bad" icon="ban" cta={E2("Reanudar", "Resume")} onCta={() => setConf({ titulo: E2("¿Por qué se reanuda Jobs?", "Why are Jobs resuming?"), nota: "interna", hacer: (m) => moduloPausar(n.id, "jobs", false, m) })}>{E2(`Jobs en pausa: ${n.modsOff.jobs.reason}`, `Jobs paused: ${n.modsOff.jobs.reason}`)}</A.AdminNote>
          : <A.AdminNote tone="info" icon="brief" cta={E2("Pausar Jobs", "Pause Jobs")} onCta={() => setConf({ titulo: E2("Pausar Jobs", "Pause Jobs"), sub: E2("La pestaña Jobs deja de salir en la ficha y nadie aplica hasta que la reactives. El dueño recibe el motivo.", "The Jobs tab stops showing on the page and no one can apply until you turn it back on. The owner gets the reason."), peligro: true, plantillas: [E2("Reportes de vecinos", "Neighbor reports"), E2("Pide papeles o pago para aplicar", "Asks for papers or payment to apply"), E2("Vacantes falsas", "Fake jobs")], nota: "persona", hacer: (m) => moduloPausar(n.id, "jobs", true, m) })}>{E2("Jobs activo en su página.", "Jobs active on their page.")}</A.AdminNote>) : null}
      </>);
  } else if (tab === "compa" && cpa) {
    // 7e · El Compa en el panel de este negocio (cifras de 30 días, sin texto ni personas). El hilo: El Compa › Conversaciones (lectura anotada).
    const RES: Record<string, string> = { open: E2("Abiertas", "Open"), self_resolved: E2("Resolvió solo", "Self-resolved"), action_done: E2("Acción confirmada", "Action confirmed"), handed_off: E2("A una persona", "To a person"), to_owner: E2("Al dueño", "To the owner") };
    cuerpo = <PanelBloques bloques={[
      { type: "kpis", cols: "repeat(4,minmax(0,1fr))", items: [
        { k: E2("PANEL · 30 D", "DASHBOARD · 30 D"), v: String(cpa.conv30), s: E2("conversaciones con El Compa", "conversations with El Compa"), bg: "var(--tl-ink)", fg: "var(--tl-white)" },
        { k: E2("«IR A …»", "“GO TO …”"), v: String(cpa.ir), s: E2("secciones que abrieron", "sections opened") },
        { k: E2("A UNA PERSONA", "TO A PERSON"), v: String(cpa.casos), s: E2("casos de Soporte del negocio", "the business’s Support cases") },
        { k: E2("SIN IA", "NO AI"), v: String(cpa.sinIa), s: E2("contestó con reglas fijas", "answered with fixed rules") }] },
      { type: "kv", cols: 3, items: Object.entries(RES).map(([k, l]) => ({ k: l.toUpperCase(), v: String(cpa.porResultado[k] ?? 0) })) },
      cpa.pausa ? { type: "note", tone: "warn", icon: "ban", t: E2(`El Compa en pausa en este negocio${cpa.pausa.uso ? " (panel)" : ""}: ${cpa.pausa.motivo}. Se levanta en El Compa › Interruptores.`, `El Compa paused for this business${cpa.pausa.uso ? " (dashboard)" : ""}: ${cpa.pausa.motivo}. Lift it in El Compa › Switches.`) }
        : { type: "note", tone: "info", icon: "info", t: E2("El Compa contesta en el panel de este negocio. Lo que se habló se lee en El Compa › Conversaciones (filtro Panel del negocio) y cada lectura queda anotada.", "El Compa answers in this business’s dashboard. Conversations are read in El Compa › Conversations (Business dashboard filter) and each read is logged.") },
      // 7f · Respuestas automáticas (Pro) de este negocio: estado, cifras de 30 días (sin texto) y «Apagar El Compa aquí» con motivo (compa:aprobar).
      { type: "group", k: E2("RESPUESTAS AUTOMÁTICAS", "AUTOMATIC REPLIES") },
      ...((): Bloque[] => {
        const a = cpa.auto;
        if (!a) return [{ type: "note", tone: "info", icon: "info", t: E2("Este negocio no tiene respuestas automáticas.", "This business has no automatic replies.") }];
        const est = a.pausa ? E2(`APAGADAS POR TO'LATINO · ${a.pausa.motivo}`, `TURNED OFF BY TO'LATINO · ${a.pausa.motivo}`) : !a.pro ? E2("SIN PRO · no contestan", "NO PRO · not answering") : a.enabled ? E2("ENCENDIDAS POR EL NEGOCIO · fuera de su horario", "TURNED ON BY THE BUSINESS · outside their hours") : E2("APAGADAS POR EL NEGOCIO", "TURNED OFF BY THE BUSINESS");
        return [
          { type: "kpis", cols: "repeat(3,minmax(0,1fr))", items: [
            { k: E2("CONTESTÓ · 30 D", "ANSWERED · 30 D"), v: String(a.contesto30), s: E2("respuestas de El Compa a clientes", "El Compa replies to customers") }, { k: E2("PASÓ AL NEGOCIO", "HANDED TO BUSINESS"), v: String(a.paso30), s: E2("lo que no podía contestar", "what it couldn’t answer") },
            { k: E2("REPORTES", "REPORTS"), v: String(a.reportes), s: E2("«una respuesta de El Compa»", "“an El Compa reply”") }] },
          { type: "note", tone: a.pausa ? "danger" : "info", icon: a.pausa ? "ban" : "help", t: est },
          ...(cpa.puedeApagar ? [{ type: "acts" as const, items: [a.pausa
            ? { l: E2("Volver a permitirlas", "Allow them again"), v: "secondary", icon: "check", onClick: () => setConf({ titulo: E2("¿Por qué se vuelven a permitir?", "Why are they allowed again?"), sub: E2("El negocio puede volver a usarlas (si las tenía encendidas, El Compa contesta otra vez). El dueño recibe un aviso.", "The business can use them again (if they were on, El Compa answers again). The owner is notified."), plantillas: [E2("Revisado: ya está bien.", "Reviewed: it’s fine now."), E2("El negocio corrigió su nota.", "The business fixed its note.")], nota: "interna", hacer: (m) => compaAutoNegocio(n.id, false, m) }) }
            : { l: E2("Apagar El Compa aquí", "Turn off El Compa here"), v: "secondary", icon: "ban", onClick: () => setConf({ titulo: E2("Apagar El Compa aquí", "Turn off El Compa here"), peligro: true, sub: E2("Las respuestas automáticas de este negocio dejan de salir; sus clientes vuelven a la respuesta de siempre. El dueño recibe el motivo y puede escribir a Soporte. Queda en el historial.", "This business’s automatic replies stop; its customers go back to the usual reply. The owner gets the reason and can write to Support. It stays in the history."),
              plantillas: [E2("Reportaron respuestas que no eran de su página.", "Replies were reported that weren’t from their page."), E2("La nota del dueño pide prometer cosas.", "The owner’s note asks to promise things."), E2("Lo pidió el dueño por Soporte.", "The owner asked through Support.")], nota: "persona", hacer: (m) => compaAutoNegocio(n.id, true, m) }) }] }] : []),
        ];
      })(),
    ]} />;
  } else if (tab === "soporte" && sop) {
    cuerpo = <SoporteDe360 casos={sop} vacio={E2("Este negocio no ha escrito a Soporte desde su panel.", "This business hasn’t written to Support from its dashboard.")} />;
  } else if (tab === "confianza") {
    const COL: Record<string, string> = { sello: E2("Sello de verificación", "Verification badge"), nuevo: E2("Negocios nuevos", "New businesses"), medios: E2("Medios marcados", "Flagged media"), rec: E2("Recomendaciones", "Recommendations"), lic: E2("Licencias", "Licenses"), cambio: E2("Reclamo (cambio sensible)", "Claim (sensitive change)") };
    const selloL = n.verified ? E2("Verificado", "Verified") : n.sello?.status === "review" ? E2("En revisión", "In review") : n.sello?.status === "info" ? E2("Te falta un dato", "Missing information") : n.sello?.status === "no" ? E2("No aprobado", "Not approved") : E2("Sin sello", "No badge");
    cuerpo = (
      <>
        {casosAbiertos.length ? <A.AdminList label={E2(`REPORTES Y CASOS ABIERTOS · ${casosAbiertos.length}`, `OPEN REPORTS AND CASES · ${casosAbiertos.length}`)} rows={casosAbiertos.map((c) => ({ icon: "bell", title: COL[c.queue] ?? c.queue, sub: `${hace(c.opened_at, ahora, en)}`, tag: E2("ABIERTO", "OPEN"), tone: "action", chevron: true, onClick: () => router.push(`/admin/colas?caso=${c.id}`) }))} />
          : <PanelBloques bloques={[{ type: "group", k: E2("REPORTES ABIERTOS · 0", "OPEN REPORTS · 0"), first: true }]} />}
        {!casosAbiertos.length ? <A.AdminNote tone="ok">{E2("Ninguno.", "None.")}</A.AdminNote> : null}
        <PanelBloques bloques={[{ type: "group", k: E2("SELLO Y LICENCIA", "BADGE AND LICENSE") }, { type: "kv", cols: 2, items: [{ k: E2("SELLO", "BADGE"), v: selloL, fg: n.verified ? "var(--tl-open-text)" : undefined }, { k: E2("LICENCIA", "LICENSE"), v: licPeor ? (LIC_ST[licPeor.status] ?? LIC_ST.review!)[0] : E2("No la necesita", "Not required"), fg: licPeor ? (licPeor.status === "valid" ? "var(--tl-open-text)" : "var(--tl-danger)") : undefined }] }, { type: "group", k: E2("ESTADO Y SANCIONES", "STATUS AND SANCTIONS") }]} />
        {dups ? <>
          <PanelBloques bloques={[{ type: "group", k: E2(`POSIBLES DUPLICADOS · ${dups.filter((d) => d.st === "open").length}`, `POSSIBLE DUPLICATES · ${dups.filter((d) => d.st === "open").length}`) }]} />
          {dups.length ? <A.AdminList rows={filasDup(dups, { desde: n.id, puede: P.editar, setConf, ir: (h) => router.push(h), E2 })} /> : <A.AdminNote tone="ok">{E2("Ninguno.", "None.")}</A.AdminNote>}
        </> : null}
        {historial((a) => /ocultar|suspender|cerrar|restaurar|sello|cierre|reabrir|fusion|duplicado|categoria|dueno|transferir/.test(a))}
      </>);
  } else {
    const selloL = n.verified ? E2("Verificado", "Verified") : n.sello?.status === "review" ? E2("En revisión", "In review") : n.sello?.status === "info" ? E2("Te falta un dato", "Missing information") : n.sello?.status === "no" ? E2("No aprobado", "Not approved") : n.sello?.status === "revoked" ? E2("Quitado por To’Latino", "Removed by To’Latino") : E2("Sin sello", "No badge");
    const viejo = ahora - new Date(n.updated).getTime() > 30 * 86_400_000;
    const acts: { l: string; v?: string; icon?: string; onClick: () => void }[] = [];
    if (P.editar && n.status === "active") {
      if (n.plan === "pro" && !n.verified) acts.push({ l: E2("Dar sello", "Give badge"), icon: "verified", onClick: () => setConf({ titulo: E2("Dar el sello Verificado", "Give the Verified badge"), sub: E2("¿Cómo lo verificaste?", "How did you verify it?"), nota: "interna", hacer: (m) => sello(n.id, true, m) }) });
      if (n.verified) acts.push({ l: E2("Quitar sello", "Remove badge"), icon: "shield", onClick: () => setConf({ titulo: E2("¿Por qué se quita el sello?", "Why is the badge being removed?"), plantillas: SELLO_NO(E2), peligro: true, nota: "interna", hacer: (m) => sello(n.id, false, m) }) });
      if (!(n.temp_until && new Date(n.temp_until).getTime() > Date.now())) acts.push({ l: E2("Cierre temporal", "Temporary closure"), icon: "clock", onClick: () => setConf({ titulo: E2(`Cerrar ${n.name} por unos días`, `Close ${n.name} for a few days`), sub: E2("La ficha dice «Cerrado temporalmente» y no recibe pedidos ni citas. Vuelve sola al vencer. El dueño ve el motivo en su panel.", "The page says “Temporarily closed” and takes no orders or bookings. It reopens on its own when it ends. The owner sees the reason in their dashboard."), elegir: { label: E2("POR CUÁNTO", "FOR HOW LONG"), items: [["1", E2("1 día", "1 day")], ["3", E2("3 días", "3 days")], ["7", E2("7 días", "7 days")], ["14", E2("14 días", "14 days")]].map(([k, l]) => ({ k: k!, l: l! })) }, plantillas: BIZ(E2), nota: "persona", hacer: (m, e) => cierreTemporal(n.id, Number(e), m) }) });
    }
    // 9n-7 · «Mensaje al dueño»: la misma pieza que «Enviar mensaje» de Usuarios 360° (app o SMS, sin enlaces, motivo interno); le llega con el enlace a su panel.
    if (P.editar && n.owner_id) acts.push({ l: E2("Mensaje al dueño", "Message the owner"), icon: "chat", onClick: () => setConf({
      titulo: E2(`Mensaje al dueño de ${n.name}`, `Message the owner of ${n.name}`), sub: E2("Lo ve en su campana y en su panel; si eliges SMS, también por texto (no sale de noche ni a quien dijo STOP). Sin enlaces. El motivo de abajo es interno: queda en la auditoría.", "They see it in their bell and dashboard; if you choose SMS, also by text (not sent at night or to anyone who replied STOP). No links. The reason below is internal: it stays in the audit log."),
      cta: E2("Enviar", "Send"), elegir: { label: E2("POR DÓNDE", "HOW"), items: [{ k: "push", l: E2("En la app (campana y push)", "In the app (bell and push)") }, ...(n.owner_phone ? [{ k: "sms", l: E2("Por SMS", "By SMS") }] : [])] },
      valor: { k: E2("MENSAJE (HASTA 280 LETRAS)", "MESSAGE (UP TO 280 CHARACTERS)"), ini: "", area: true, max: 280 }, plantillas: [E2("Aviso sobre su página", "Notice about their page"), E2("Respuesta a lo que pidió por Soporte", "Reply to their Support request"), E2("Falta un dato para el sello", "Missing information for the badge")],
      nota: "interna", hacer: (m, e, v) => mensajeAlDueno(n.id, e ?? "push", v ?? "", m) }) });
    // 9n-7 · «Invitar a reclamar»: un SMS al teléfono de un negocio sin dueño con el enlace para reclamarlo (una vez cada 30 días).
    if (P.editar && !n.owner_id && n.phone && n.status === "active") acts.push({ l: E2("Invitar a reclamar", "Invite to claim"), icon: "phone", onClick: () => setConf({ titulo: E2(`Invitar a ${n.name} a reclamar su página`, `Invite ${n.name} to claim its page`),
      sub: E2("Le llega un SMS al teléfono de su página con el enlace para reclamarla gratis. Una vez cada 30 días; respeta STOP y las horas de silencio.", "An SMS goes to the phone on their page with the link to claim it for free. Once every 30 days; respects STOP and quiet hours."), cta: E2("Enviar el SMS", "Send the SMS"),
      plantillas: [E2("Lo recomendaron vecinos", "Recommended by neighbors"), E2("Semilla de la apertura", "Launch seed"), E2("Pidió información", "Asked for information")], nota: "interna", hacer: (m) => invitarReclamar(n.id, m) }) });
    // 9n-7 · «Destacar»: lo mismo que Crecimiento › Destacados › Fijar (mkt:editar), sin salir del 360°: sale primero en Destacados de su ciudad los días de
    // Configuración (destacados_dias) y vuelve solo a la rotación; el tope por ciudad lo pone la base.
    if (P.destacar && n.status === "active") acts.push({ l: E2("Destacar", "Feature"), icon: "star", onClick: () => setConf({ titulo: E2(`Destacar ${n.name}`, `Feature ${n.name}`), sub: E2("Sale primero en Negocios › Destacados de su ciudad por los días de Configuración y vuelve solo a la rotación. Se retira en Crecimiento › Destacados.", "It shows first in Businesses › Featured in its city for the days set in Settings, then returns to rotation on its own. Remove it in Growth › Featured."),
      cta: E2("Destacar", "Feature"), plantillas: [E2("Negocio fundador", "Founding business"), E2("Campaña de la ciudad", "City campaign"), E2("Buen servicio comprobado", "Proven good service")], nota: "interna", hacer: (m) => destacadoFijar(n.city, n.id, "fijar", m) }) });
    // 9n-8 · «Cambiar categoría» y «Transferir dueño» (prototipo): se piden aquí y entran a Cambios sensibles; los aplica otra persona del equipo.
    if (P.editar && ["active", "temp_closed", "hidden", "suspended"].includes(n.status)) {
      if (!pendiente("changeCategory")) acts.push({ l: E2("Cambiar categoría", "Change category"), icon: "grid", onClick: () => setConf({ titulo: E2(`Cambiar la categoría de ${n.name}`, `Change the category of ${n.name}`), cta: E2("Enviar a la cola", "Send to queue"),
        sub: E2("Cambian sus módulos en la página, sus filtros y «lo que importa» en reseñas; el dueño vuelve a elegir sus subcategorías. Entra a Cambios sensibles; otra persona lo aprueba.", "Its page modules, filters and “what matters” in reviews change; the owner picks subcategories again. It goes to Sensitive changes; someone else approves it."),
        elegir: { label: E2("CATEGORÍA NUEVA", "NEW CATEGORY"), items: cats.filter((c) => c.id !== n.cat_id).map((c) => ({ k: c.id, l: c.l })) },
        plantillas: [E2("Lo publicaron en la categoría equivocada", "Posted in the wrong category"), E2("El dueño lo pidió por Soporte", "The owner asked through Support"), E2("Cambió lo que vende", "What it sells changed")], nota: "interna", hacer: (m, e) => pedirCategoria(n.id, e ?? "", m) }) });
      if (!pendiente("transferOwner")) acts.push({ l: E2("Transferir dueño", "Transfer owner"), icon: "users", onClick: () => setConf({ titulo: E2(`Transferir ${n.name}`, `Transfer ${n.name}`), cta: E2("Enviar a la cola", "Send to queue"),
        sub: E2("El nuevo dueño necesita una cuenta de To’Latino con el teléfono verificado. Entra a Cambios sensibles; otra persona del equipo lo aprueba (si ya tiene dueño, un Admin).", "The new owner needs a To’Latino account with a verified phone. It goes to Sensitive changes; someone else on the team approves it (an Admin if it already has an owner)."),
        valor: { k: E2("TELÉFONO DEL NUEVO DUEÑO", "NEW OWNER’S PHONE"), ini: "", max: 20 },
        plantillas: [E2("Vendió el negocio", "Sold the business"), E2("El dueño lo pidió con documento", "The owner asked with a document"), E2("Cambio de encargado a dueño", "Manager becoming owner")], nota: "interna", hacer: (m, _e, v) => pedirTransferencia(n.id, v ?? "", m) }) });
    }
    if (P.retirar && n.status === "active") {
      acts.push({ l: E2("Ocultar", "Hide"), v: "danger", icon: "ban", onClick: () => setConf({ titulo: E2(`¿Por qué se oculta ${n.name}?`, `Why is ${n.name} being hidden?`), plantillas: BIZ(E2), peligro: true, nota: "persona", hacer: (m) => cambiarEstado(n.id, "hidden", m) }) });
      acts.push({ l: E2("Suspender", "Suspend"), v: "danger", icon: "lock", onClick: () => setConf({ titulo: E2(`¿Por qué se suspende ${n.name}?`, `Why is ${n.name} being suspended?`), plantillas: BIZ(E2), peligro: true, nota: "persona", hacer: (m) => cambiarEstado(n.id, "suspended", m) }) });
    }
    if (P.cerrar && n.status === "active") acts.push({ l: E2("Cerrar el negocio", "Close the business"), v: "danger", icon: "close", onClick: () => setConf({ titulo: E2(`Cerrar ${n.name}`, `Close ${n.name}`), sub: E2("Para negocios que ya no existen. Sale de búsquedas y categoría; las reseñas se guardan. Se puede reabrir.", "For businesses that no longer exist. It leaves search and the category; reviews are kept. It can be reopened."), peligro: true, cta: E2("Cerrar", "Close"), nota: "persona", hacer: (m) => cambiarEstado(n.id, "closed", m) }) });
    cuerpo = (
      <>
        <PanelBloques bloques={[{ type: "kv", cols: desk ? 3 : 2, items: [
          { k: E2("DUEÑO", "OWNER"), v: n.owner ?? E2("Sin reclamar", "Unclaimed"), fg: n.owner ? undefined : "var(--tl-pro-ink)" },
          { k: "PLAN", v: n.trial ? E2(`Pro · prueba · quedan ${n.trial.left} d`, `Pro · trial · ${n.trial.left} d left`) : n.plan === "pro" ? "Pro" : "Free" },
          { k: E2("SELLO", "BADGE"), v: selloL, fg: n.verified ? "var(--tl-open-text)" : undefined },
          { k: E2("TELÉFONO", "PHONE"), v: n.phone || "—" },
          { k: E2("DIRECCIÓN", "ADDRESS"), v: n.address ?? (n.op === "casa" ? E2("A domicilio · zona", "At-home service · area") : "—") },
          { k: E2("EN TO’LATINO DESDE", "ON TO’LATINO SINCE"), v: fecha(n.created, en) },
          { k: E2("ÚLTIMA ACTIVIDAD", "LAST ACTIVITY"), v: fecha(n.updated, en), fg: viejo ? "var(--tl-pro-ink)" : undefined },
        ] }]} />
        <A.HBars label={E2("FUERZA DEL PERFIL", "PROFILE STRENGTH")} help={`${n.fuerza.sc} %`} items={n.fuerza.todas.map((t) => ({ label: t.t[en ? 1 : 0], width: t.ok ? "100%" : "6%", color: t.ok ? "var(--tl-open)" : "var(--tl-pro)", value: t.ok ? E2("Sí", "Yes") : E2("Falta", "Missing") }))} />
        {casosAbiertos.length ? <A.AdminNote tone="warn" cta={E2("Ver", "See")} onCta={() => ir("confianza")}>{E2(`${casosAbiertos.length} ${casosAbiertos.length === 1 ? "caso abierto" : "casos abiertos"} sobre este negocio.`, `${casosAbiertos.length} open ${casosAbiertos.length === 1 ? "case" : "cases"} about this business.`)}</A.AdminNote> : null}
        <PanelBloques bloques={[{ type: "group", k: E2("NOTAS INTERNAS", "INTERNAL NOTES"), link: P.editar ? E2("Agregar nota", "Add note") : undefined, onLink: () => setConf({ titulo: E2(`Nota sobre ${n.name}`, `Note about ${n.name}`), sub: E2("Solo la ve el equipo. El negocio nunca la ve.", "Only the team sees it. The business never does."), cta: E2("Guardar", "Save"), nota: "interna", hacer: (m) => nota(n.id, m) }) }]} />
        {n.notas.length ? <A.AdminList rows={n.notas.map((x) => ({ icon: "edit", title: x.text, sub: `${x.quien ?? E2("Equipo", "Team")} · ${fecha(x.at, en)}` }))} /> : <A.AdminNote tone="info">{E2("Sin notas.", "No notes.")}</A.AdminNote>}
        {acts.length ? <PanelBloques bloques={[{ type: "group", k: E2("ACCIONES", "ACTIONS") }, { type: "acts", items: acts.map((a) => ({ ...a, off: pend })) }]} /> : null}
      </>);
  }

  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: E2("NEGOCIO 360°", "BUSINESS 360°"), t: n.name, onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 1120 }}>
      <span role="link" onClick={() => router.push("/admin/negocios")} {...tec(() => router.push("/admin/negocios"))} style={{ display: "flex", alignItems: "center", gap: 6, font: "700 13px Manrope,sans-serif", color: "var(--tl-action)", cursor: "pointer" }}><A.Icon name="chevronLeft" size={15} color="var(--tl-action)" />{E2("Negocios", "Businesses")}</span>
      <span style={{ font: "700 9.5px 'JetBrains Mono',monospace", letterSpacing: ".14em", color: "rgba(11,14,18,.6)" }}>{E2("NEGOCIO 360°", "BUSINESS 360°")}</span>
      <PanelBloques bloques={cab} />
      {notasEstado}
      <PanelBloques bloques={[tabs]} />
      {cuerpo}
      <PanelBloques bloques={[{ type: "group", k: E2("HISTORIAL RECIENTE", "RECENT HISTORY") }]} />
      {historial()}
      <Toast t={toast} desk={desk} />
    </div>
  );
}

/* dinero fijo: super admin (cifras de contabilidad del equipo, siempre con dos decimales) */
