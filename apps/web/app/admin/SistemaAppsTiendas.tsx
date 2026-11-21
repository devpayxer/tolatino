"use client";
/* 8i · Super Admin › Sistema › Apps: lo de las tiendas (fase8-apps.md §4 8i, §10; huecos del diseño: no hay pantallas de esto en el diseño, se
   compone con kpis/note/group/rows/acts/chips/empty del sistema como el resto de Sistema › Apps, y se anota en REVISION).
   - Fichas y revisión (?v=fichas): las 16 fichas (4 apps × Apple/Google × ES/EN) con la huella del repo frente a lo último subido, las capturas,
     «Subir como borrador» (solo un Admin, motivo, tope por día; NADA se envía a revisión), las cuentas de revisión con su interruptor y las
     direcciones de privacidad y soporte que se dan a las tiendas.
   - Lo que te toca (?v=toca): los pasos del fundador (Paquetes 8-0 a 8-3) con su estado (del sistema cuando se puede), el botón que abre la
     consola del tercero, «Copiar» donde una consola obliga a escribir un dato (choque con «nada de copiar y pegar», §6 #25) y marcar a mano.
   - Declaraciones (?v=declaraciones&app=): cada pregunta como la escribe Apple o Google, la respuesta y de dónde sale (inventario de datos,
     declaraciones.json); el CSV de Data safety para importar en Play Console.
   Cambiar: apps:editar y rol Admin (lo revisa cada acción en el servidor). */
import { PanelBloques, type PanelBloqueT as Bloque, type PanelFila as Fila } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { EstadoFichas } from "@/lib/tiendas/fichas";
import type { Paquete } from "@/lib/tiendas/paquete";
import { fichasSubir, pasoMarcar, revisionCuenta, revisionInterruptor } from "./acciones-apps";
import type { ResAdm } from "./acciones-colas";
import { ConfirmarMotivo, Toast, useAncho, useToast, type Confirmar } from "./Colas";
import { PESTANAS_SISTEMA } from "./sistema/Pestanas";
import { subApps } from "./SistemaAppsBeta";
import { useE } from "./idioma-admin";

type Bi = { es: string; en: string };
export type ItemApple = { tipo: string; categoria: string; ligado: boolean; propositos: string[]; de: string[] };
export type ItemGoogle = { tipo: string; categoria: string; opcional: boolean; propositos: string[]; de: string[] };
export type Pregunta = { tienda: "apple" | "google"; seccion: string; pregunta: string; respuesta: Bi; fuente: string };
export type DatosTiendas =
  | { v: "fichas"; e: EstadoFichas }
  | { v: "toca"; paquetes: Paquete[] }
  | { v: "declaraciones"; app: string; apple: ItemApple[]; google: ItemGoogle[]; preguntas: Pregunta[]; etiquetas: Record<string, Bi>; urls: { privacidad: string; borrar: string } };
const APP: Record<string, string> = { cliente: "To'Latino", negocio: "Negocios", delivery: "Repartidor", checkin: "Puerta" };
const TIENDA: Record<string, string> = { apple: "App Store", google: "Google Play" };
const PROP_APPLE: Record<string, string> = { NSPrivacyCollectedDataTypePurposeAppFunctionality: "App Functionality", NSPrivacyCollectedDataTypePurposeAnalytics: "Analytics", NSPrivacyCollectedDataTypePurposeProductPersonalization: "Product Personalization" };
const PROP_GOOGLE: Record<string, string> = { PSL_APP_FUNCTIONALITY: "App functionality", PSL_ACCOUNT_MANAGEMENT: "Account management", PSL_FRAUD_PREVENTION_SECURITY: "Fraud prevention, security, and compliance", PSL_DEVELOPER_COMMUNICATIONS: "Developer communications", PSL_ANALYTICS: "Analytics", PSL_PERSONALIZATION: "Personalization" };
// El nombre de cada tipo como lo escriben Apple (App Privacy) y Google (Data safety).
const nombreApple = (t: string) => t.replace("NSPrivacyCollectedDataType", "").replace(/([a-z])([A-Z])/g, "$1 $2").replace("Photosor Videos", "Photos or Videos").replace("Emails Or Text Messages", "Emails or Text Messages").replace("User ID", "User ID");
const nombreGoogle = (t: string) => ({ PSL_PHONE: "Phone number", PSL_NAME: "Name", PSL_EMAIL: "Email address", PSL_ADDRESS: "Address", PSL_PRECISE_LOCATION: "Precise location", PSL_PHOTOS: "Photos",
  PSL_OTHER_MESSAGES: "Other in-app messages", PSL_USER_GENERATED_CONTENT: "Other user-generated content", PSL_PURCHASE_HISTORY: "Purchase history", PSL_CREDIT_DEBIT_BANK_ACCOUNT_NUMBER: "Credit card, debit card, or bank account number",
  PSL_USER_ACCOUNT: "User IDs", PSL_DEVICE_ID: "Device or other IDs", PSL_APP_INTERACTIONS: "App interactions", PSL_IN_APP_SEARCH_HISTORY: "In-app search history", PSL_CRASH_LOGS: "Crash logs", PSL_PERFORMANCE_DIAGNOSTICS: "Diagnostics" } as Record<string, string>)[t] ?? t;
type EF = (es: string, en: string) => string;
const cuandoE = (E: EF) => (iso: string | null) => (iso ? new Intl.DateTimeFormat(E("es-US", "en-US"), { timeZone: "America/New_York", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso)).replace(/\./g, "") : "—");
const KINDE = (E: EF): Record<string, string> => ({ codigo: E("pidió su código", "requested its code"), entro: E("entró", "signed in"), rechazado: E("rechazada", "rejected"), pago_bloqueado: E("intentó pagar (bloqueado)", "tried to pay (blocked)"), activada: E("activada", "activated"), desactivada: E("desactivada", "deactivated") });

export function SistemaAppsTiendas({ d, editar }: { d: DatosTiendas; editar: boolean }) {
  const router = useRouter(), w = useAncho(), desk = w >= 1024, E = useE(), cuando = cuandoE(E), KIND = KINDE(E);
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast();
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? E("Guardado.", "Saved.")); setConf(null); router.refresh(); };
  const cols = desk ? "repeat(2,minmax(0,1fr))" : "1fr";
  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: E("SISTEMA · APPS", "SYSTEM · APPS"), t: "Apps", onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>);
  const B: Bloque[] = [
    { type: "head", eye: E("SUPER ADMIN · SISTEMA", "SUPER ADMIN · SYSTEM"), t: "Apps", s: E("Las fichas de las tiendas, las cuentas de revisión, lo que le toca al fundador y las declaraciones de Apple y Google.", "The store listings, the review accounts, the founder’s steps and the Apple and Google declarations."), h1: desk ? 26 : 22 },
    { type: "tabs", items: PESTANAS_SISTEMA.map((p) => ({ l: E(p.l, p.en), on: p.k === "apps", onClick: () => (p.k === "apps" ? undefined : router.push(p.href)) })) },
    subApps(d.v, (h) => router.push(h), E),
  ];

  if (d.v === "fichas") {
    const e = d.e, alDia = e.fichas.filter((f) => f.subido?.result === "borrador" && f.subido.sha === f.sha).length, activas = e.revision.filter((r) => r.activa).length;
    B.push({ type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: E("FICHAS AL DÍA", "LISTINGS UP TO DATE"), v: E(`${alDia} de ${e.fichas.length}`, `${alDia} of ${e.fichas.length}`), s: E("lo subido = lo del repo", "uploaded = repo") },
      { k: E("CAPTURAS", "SCREENSHOTS"), v: String(e.fichas.reduce((a, f) => a + f.capturas, 0)), s: E("del CI, por idioma y tienda", "from CI, by language and store") },
      { k: E("SUBIDAS HOY", "UPLOADS TODAY"), v: E(`${e.subidasHoy} de ${e.tope}`, `${e.subidasHoy} of ${e.tope}`), s: E("tope por día", "daily cap") },
      { k: E("CUENTAS DE REVISIÓN", "REVIEW ACCOUNTS"), v: E(`${activas} de ${e.revision.length}`, `${activas} of ${e.revision.length}`), s: e.encendida ? E("encendidas", "on") : E("apagadas", "off"), bg: e.encendida ? "var(--tl-ink)" : undefined, fg: e.encendida ? "var(--tl-white)" : undefined }] });
    B.push({ type: "note", tone: "info", icon: "info", t: E("La fuente de cada ficha es el repo (apps/mobile/tiendas/{app}/{es,en}.md, escrita desde la Ayuda). «Subir como borrador» la manda a App Store Connect (la versión en preparación) y a Google Play sin enviarla a revisión, con sus capturas, la clasificación por edad y las notas para la revisión. Enviar a revisión es de la Fase 9, con tu OK.", "The source of each listing is the repo (apps/mobile/tiendas/{app}/{es,en}.md, written from the Help). “Upload as draft” sends it to App Store Connect (the version in preparation) and to Google Play without submitting it for review, with its screenshots, age rating and review notes. Submitting for review is Phase 9, with your OK.") });
    B.push({ type: "group", k: E("LLAVES DE LAS TIENDAS", "STORE KEYS") });
    B.push({ type: "rows", cols, items: ([["apple", E("App Store Connect · llave de la API", "App Store Connect · API key"), E("Sube la ficha, las capturas, la clasificación y las notas", "Uploads the listing, screenshots, rating and notes")], ["google", E("Google Play · cuenta de servicio", "Google Play · service account"), E("Sube la ficha y las capturas en una edición sin revisión", "Uploads the listing and screenshots in an edit without review")]] as const).map(([k, t, s]): Fila => ({
      key: k, icon: e.llaves[k] ? "key" : "lock", t, s, tag: e.llaves[k] ? E("VIVA", "LIVE") : E("FALTA", "MISSING"), tone: e.llaves[k] ? "signal" : "neutral", ...(editar ? { onClick: () => router.push("/admin/sistema/integraciones") } : { chev: false }) })) });
    if (editar) B.push({ type: "acts", items: [{ l: E("Subir como borrador", "Upload as draft"), v: "primary", icon: "share", off: e.subidasHoy >= e.tope, onClick: () => setConf({ titulo: E("Subir las fichas como borrador", "Upload the listings as draft"), cta: E("Subir", "Upload"),
      sub: E(`Sin la llave de una tienda, esa tienda queda «sin llave» y no se toca. Nada se envía a revisión. Hoy: ${e.subidasHoy} de ${e.tope}.`, `Without a store’s key, that store stays “no key” and is not touched. Nothing is submitted for review. Today: ${e.subidasHoy} of ${e.tope}.`),
      elegir: { label: E("QUÉ APP", "WHICH APP"), items: [{ k: "todas", l: E("Las cuatro", "All four") }, ...Object.entries(APP).map(([k, l]) => ({ k, l }))] }, plantillas: [E("Fichas nuevas en el repo", "New listings in the repo"), E("Capturas nuevas del CI", "New screenshots from CI"), E("Primera subida", "First upload")],
      nota: "interna", hacer: (m, el) => fichasSubir(el ?? "todas", m) }) }] });
    for (const a of Object.keys(APP)) {
      B.push({ type: "group", k: `${APP[a]!.toUpperCase()} · ${E("FICHAS", "LISTINGS")}` });
      B.push({ type: "rows", cols, items: e.fichas.filter((f) => f.app === a).map((f): Fila => {
        const est = !f.subido ? [E("SIN SUBIR", "NOT UPLOADED"), "neutral"] : f.subido.result === "error" ? ["ERROR", "danger"] : f.subido.sha === f.sha ? [E("AL DÍA", "UP TO DATE"), "signal"] : [E("CAMBIÓ", "CHANGED"), "action"];
        return { key: `${f.app}-${f.tienda}-${f.locale}`, icon: "news", t: `${TIENDA[f.tienda]} · ${f.locale} · ${f.titulo}`,
          s: [`repo ${f.sha.slice(0, 10)}…`, f.subido ? `${E("subida", "uploaded")} ${cuando(f.subido.at)} (${f.subido.sha.slice(0, 10)}…)` : E("nunca subida", "never uploaded"), `${f.capturas} ${f.capturas === 1 ? E("captura", "screenshot") : E("capturas", "screenshots")}`, f.subido?.detail].filter(Boolean).join(" · "),
          tag: est[0], tone: est[1], chev: false };
      }) });
    }
    B.push({ type: "group", k: E("CUENTAS DE REVISIÓN DE APPLE Y GOOGLE", "APPLE AND GOOGLE REVIEW ACCOUNTS") });
    B.push({ type: "note", tone: e.produccion && !e.encendida ? "warn" : "info", icon: "lock", t: e.produccion
      ? E("En producción las cuentas de revisión se crean en la Fase 9, con tu OK, y solo entran con el envío a revisión pública encendido.", "In production the review accounts are created in Phase 9, with your OK, and only sign in with public review submission turned on.")
      : E("Un número reservado que entra con un código fijo guardado como secreto del entorno (nunca aquí ni en el repo): solo ese número, solo con la cuenta activa y el interruptor encendido. No paga con tarjeta y solo ve su negocio de revisión, oculto para todos. Cada intento queda anotado.", "A reserved number that signs in with a fixed code stored as an environment secret (never here or in the repo): only that number, only with the account active and the switch on. It can’t pay by card and only sees its review business, hidden from everyone. Every attempt is logged.") });
    B.push({ type: "rows", items: [{ key: "flag", icon: e.encendida ? "check" : "lock", t: e.interruptor ? E("Las cuentas de revisión entran con su código", "Review accounts sign in with their code") : E("Las cuentas de revisión están apagadas", "Review accounts are off"), s: e.interruptor && !e.encendida ? E("Encendido, pero este entorno no las deja entrar todavía (Fase 9).", "On, but this environment doesn’t let them in yet (Phase 9).") : E("Apagado: ningún código fijo sirve.", "Off: no fixed code works."),
      tag: e.encendida ? E("ENCENDIDAS", "ON") : E("APAGADAS", "OFF"), tone: e.encendida ? "signal" : "neutral",
      ...(editar ? { tgOn: e.interruptor, onTg: () => setConf({ titulo: e.interruptor ? E("Apagar las cuentas de revisión", "Turn off the review accounts") : E("Encender las cuentas de revisión", "Turn on the review accounts"), cta: e.interruptor ? E("Apagar", "Turn off") : E("Encender", "Turn on"), peligro: !e.interruptor,
        sub: e.interruptor ? E("Ningún código fijo sirve desde ya (los vigentes se anulan).", "No fixed code works from now on (current ones are voided).") : E("Las cuentas activas entran con su código fijo. Para cuando Apple o Google revisen.", "Active accounts sign in with their fixed code. For when Apple or Google review."), plantillas: e.interruptor ? [E("Terminó la revisión", "Review finished"), E("Por seguridad", "For security")] : [E("Revisión de Apple", "Apple review"), E("Revisión de Google", "Google review"), E("Prueba en el sandbox", "Sandbox test")],
        nota: "interna", hacer: (m) => revisionInterruptor(!e.interruptor, m) }) } : {}) }] });
    B.push(e.revision.length ? { type: "rows", cols, items: e.revision.map((r): Fila => ({ key: `rv${r.id}`, icon: "phone", dim: !r.activa,
      t: `${APP[r.app] ?? r.app} · ${r.tel}`, s: [r.negocio ? E(`negocio oculto «${r.negocio}»`, `hidden business “${r.negocio}”`) : null, r.secreto ? E(`secreto ${r.codeRef} presente`, `secret ${r.codeRef} present`) : E(`falta el secreto ${r.codeRef} en el entorno`, `secret ${r.codeRef} missing from the environment`), E(`${r.entradas7} ${r.entradas7 === 1 ? "entrada" : "entradas"} en 7 días`, `${r.entradas7} ${r.entradas7 === 1 ? "sign-in" : "sign-ins"} in 7 days`),
        r.ultimo ? `${E("último", "last")}: ${KIND[r.ultimo.kind] ?? r.ultimo.kind}${r.ultimo.motivo ? ` (${r.ultimo.motivo})` : ""} ${cuando(r.ultimo.at)}` : E("sin intentos", "no attempts")].filter(Boolean).join(" · "),
      tag: r.activa ? (r.secreto ? E("ACTIVA", "ACTIVE") : E("SIN SECRETO", "NO SECRET")) : E("DESACTIVADA", "DEACTIVATED"), tone: r.activa ? (r.secreto ? "signal" : "action") : "neutral",
      ...(editar ? { tgOn: r.activa, onTg: () => setConf({ titulo: r.activa ? E(`Desactivar la cuenta de revisión de ${APP[r.app]}`, `Deactivate the ${APP[r.app]} review account`) : E(`Activar la cuenta de revisión de ${APP[r.app]}`, `Activate the ${APP[r.app]} review account`), cta: r.activa ? E("Desactivar", "Deactivate") : E("Activar", "Activate"), peligro: !r.activa,
        sub: r.activa ? E("Su código deja de servir desde ya.", "Its code stops working from now on.") : E("Entra con su código fijo mientras las cuentas estén encendidas.", "Signs in with its fixed code while the accounts are on."), plantillas: r.activa ? [E("Terminó la revisión", "Review finished"), E("Por seguridad", "For security")] : [E("Revisión de Apple", "Apple review"), E("Revisión de Google", "Google review")],
        nota: "interna", hacer: (m) => revisionCuenta(r.id, !r.activa, m) }) } : {}) })) }
      : { type: "empty", icon: "phone", t: E("Sin cuentas de revisión", "No review accounts"), s: E("En el sandbox las crea la semilla; en producción se crean en la Fase 9 con tu OK.", "In the sandbox the seed creates them; in production they are created in Phase 9 with your OK.") });
    B.push({ type: "group", k: E("LO QUE SE DA A LAS TIENDAS", "WHAT THE STORES GET") });
    B.push({ type: "rows", cols, items: [{ key: "priv", icon: "shield", t: E("Política de privacidad", "Privacy policy"), s: `${e.urls.privacidad} · ${E("borrador versión 0 (texto legal final en la Fase 9)", "draft version 0 (final legal text in Phase 9)")}`, onClick: () => window.open("/privacidad", "_blank", "noopener") },
      { key: "sop", icon: "help", t: E("Soporte", "Support"), s: `${e.urls.soporte} · ${E("sin sesión", "no sign-in")}`, onClick: () => window.open("/soporte", "_blank", "noopener") },
      { key: "borrar", icon: "trash", t: E("Borrar la cuenta (Google)", "Delete the account (Google)"), s: e.urls.borrar, onClick: () => window.open("/cuenta/ajustes/borrar", "_blank", "noopener") }] });
  } else if (d.v === "toca") {
    const todos = d.paquetes.flatMap((p) => p.pasos), hechos = todos.filter((p) => p.estado === "hecho").length;
    B.push({ type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: E("HECHOS", "DONE"), v: E(`${hechos} de ${todos.length}`, `${hechos} of ${todos.length}`), bg: hechos === todos.length ? "var(--tl-ink)" : undefined, fg: hechos === todos.length ? "var(--tl-white)" : undefined },
      ...d.paquetes.slice(0, 3).map((p) => ({ k: p.k === "8-0" ? E("DOMINIO", "DOMAIN") : p.k === "8-1" ? E("CUENTAS", "ACCOUNTS") : E("LLAVES", "KEYS"), v: E(`${p.pasos.filter((x) => x.estado === "hecho").length} de ${p.pasos.length}`, `${p.pasos.filter((x) => x.estado === "hecho").length} of ${p.pasos.length}`) }))] });
    B.push({ type: "note", tone: "ink", icon: "shield", t: E("Todo desde el teléfono, con un toque por paso. Nada se pide en el chat y ningún secreto se escribe aquí: los archivos de Apple y Google se suben en Sistema › Integraciones › Llaves. Lo que el sistema puede comprobar se marca solo.", "All from the phone, one tap per step. Nothing is asked in chat and no secret is typed here: the Apple and Google files are uploaded in System › Integrations › Keys. What the system can check is marked on its own.") });
    for (const p of d.paquetes) {
      B.push({ type: "group", k: E(p.t.es, p.t.en).toUpperCase() });
      B.push({ type: "note", tone: "info", icon: "info", t: E(p.s.es, p.s.en) });
      B.push({ type: "rows", cols, items: p.pasos.map((x): Fila => ({ key: x.k, icon: x.estado === "hecho" ? "check" : x.fuente === "sistema" ? "clock" : "edit",
        t: `${x.k} · ${E(x.t.es, x.t.en)}`, s: [E(x.s.es, x.s.en), x.por ? E(x.por.es, x.por.en) : x.marcadoAt ? `${E("marcado", "marked")} ${cuando(x.marcadoAt)}` : null, x.copiar ? `${E("correo", "email")}: ${x.copiar}` : null].filter(Boolean).join(" · "),
        tag: x.estado === "hecho" ? E("HECHO", "DONE") : E("PENDIENTE", "PENDING"), tone: x.estado === "hecho" ? "signal" : "neutral", chev: false,
        acts: [...(x.consola ? [{ l: E("Abrir", "Open"), icon: "right", onClick: () => window.open(x.consola!, "_blank", "noopener") }] : []),
          ...(x.copiar ? [{ l: E("Copiar", "Copy"), icon: "share", onClick: () => { void navigator.clipboard?.writeText(x.copiar!).then(() => setToast(E("Copiado.", "Copied."))).catch(() => setToast(x.copiar!)); } }] : []),
          ...(editar && !(x.fuente === "sistema" && x.estado === "hecho") ? [{ l: x.estado === "hecho" ? E("Pendiente", "Pending") : E("Ya lo hice", "I did it"), icon: x.estado === "hecho" ? "close" : "check",
            onClick: () => setConf({ titulo: `${x.k} · ${E(x.t.es, x.t.en)}`, cta: x.estado === "hecho" ? E("Volver a pendiente", "Back to pending") : E("Marcar hecho", "Mark done"), sub: x.fuente === "sistema" ? E("El sistema lo marca solo cuando lo ve; esto lo deja marcado mientras.", "The system marks it on its own when it sees it; this keeps it marked meanwhile.") : E("Este paso no lo puede ver el sistema: queda marcado con tu nota.", "The system can’t see this step: it stays marked with your note."),
              plantillas: x.estado === "hecho" ? [E("Me equivoqué", "I made a mistake"), E("Hay que repetirlo", "It needs to be redone")] : [E("Hecho desde el teléfono", "Done from the phone"), E("Aprobado por Apple", "Approved by Apple"), E("Aprobado por Google", "Approved by Google")], nota: "interna", hacer: (m) => pasoMarcar(x.k, x.estado !== "hecho", m) }) }] : [])] })) });
    }
  } else if (d.v === "declaraciones") {
    const L = (x: Bi) => E(x.es, x.en);
    B.push({ type: "chips", k: "APP", items: Object.entries(APP).map(([k, l]) => ({ l, v: d.app === k ? "selected" : "filter", onClick: () => router.push(`/admin/sistema/apps?v=declaraciones&app=${k}`) })) });
    B.push({ type: "note", tone: "info", icon: "info", t: E("Cada pregunta como la escribe Apple o Google, la respuesta que damos y de dónde sale. Las de privacidad salen del inventario real de datos (las mismas de /privacidad y del PrivacyInfo de iOS). Apple App Privacy y lo de Google se tocan en la consola (Paquete 8-3); la clasificación de Apple la sube el servidor con la ficha.", "Each question as Apple or Google writes it, the answer we give and where it comes from. The privacy ones come from the real data inventory (the same as /privacidad and the iOS PrivacyInfo). Apple App Privacy and the Google items are set in the console (Package 8-3); the server uploads the Apple rating with the listing.") });
    B.push({ type: "group", k: "APPLE · APP PRIVACY" });
    B.push({ type: "rows", cols, items: [
      { key: "a-track", icon: "shield", t: "Data Used to Track You", r: E("Ninguno", "None"), s: E("No rastreamos: sin anuncios, sin IDFA, sin compartir para publicidad · de dónde: inventario (rastreo: false)", "We don’t track: no ads, no IDFA, no sharing for advertising · source: inventory (rastreo: false)"), chev: false },
      ...d.apple.map((x): Fila => ({ key: `a-${x.tipo}`, icon: "shield", t: `${x.ligado ? "Data Linked to You" : "Data Not Linked to You"} · ${x.categoria} · ${nombreApple(x.tipo)}`, r: E("Sí", "Yes"),
        s: E(`Usado para: ${x.propositos.map((p) => PROP_APPLE[p] ?? p).join(", ")} · para rastrear: no · de dónde: inventario (${x.de.map((k) => L(d.etiquetas[k] ?? { es: k, en: k })).join(", ")})`, `Used for: ${x.propositos.map((p) => PROP_APPLE[p] ?? p).join(", ")} · for tracking: no · source: inventory (${x.de.map((k) => L(d.etiquetas[k] ?? { es: k, en: k })).join(", ")})`), chev: false })),
    ] });
    B.push({ type: "group", k: "GOOGLE · DATA SAFETY" });
    B.push({ type: "acts", items: [{ l: E("Descargar el CSV de Data safety", "Download the Data safety CSV"), v: "secondary", icon: "folder", onClick: () => window.open(`/api/admin/tiendas/data-safety?app=${d.app}`, "_blank", "noopener") }] });
    B.push({ type: "rows", cols, items: [
      { key: "g-collect", icon: "shield", t: "Does your app collect or share any of the required user data types?", r: E("Sí", "Yes"), s: E("Se recoge; no se comparte con terceros · de dónde: inventario", "Collected; not shared with third parties · source: inventory"), chev: false },
      { key: "g-enc", icon: "lock", t: "Is all of the user data collected by your app encrypted in transit?", r: E("Sí", "Yes"), s: E("Todo por HTTPS · de dónde: inventario (cifradoEnTransito)", "All over HTTPS · source: inventory (cifradoEnTransito)"), chev: false },
      { key: "g-del", icon: "trash", t: "Do you provide a way for users to request that their data is deleted?", r: E("Sí", "Yes"), s: `${E("Mi cuenta › Ajustes › Borrar mi cuenta", "My account › Settings › Delete my account")} · ${d.urls.borrar}`, chev: false },
      ...d.google.map((x): Fila => ({ key: `g-${x.tipo}`, icon: "shield", t: `${x.categoria} · ${nombreGoogle(x.tipo)}`, r: x.opcional ? E("Opcional", "Optional") : E("Obligatorio", "Required"),
        s: E(`Recogido, no compartido, no efímero · para: ${x.propositos.map((p) => PROP_GOOGLE[p] ?? p).join(", ")} · de dónde: inventario (${x.de.map((k) => L(d.etiquetas[k] ?? { es: k, en: k })).join(", ")})`, `Collected, not shared, not ephemeral · for: ${x.propositos.map((p) => PROP_GOOGLE[p] ?? p).join(", ")} · source: inventory (${x.de.map((k) => L(d.etiquetas[k] ?? { es: k, en: k })).join(", ")})`), chev: false })),
    ] });
    for (const t of ["apple", "google"] as const) {
      const P = d.preguntas.filter((p) => p.tienda === t);
      B.push({ type: "group", k: t === "apple" ? E("APPLE · CLASIFICACIÓN, CIFRADO Y REVISIÓN", "APPLE · RATING, ENCRYPTION AND REVIEW") : E("GOOGLE · CLASIFICACIÓN (IARC) Y DECLARACIONES", "GOOGLE · RATING (IARC) AND DECLARATIONS") });
      B.push({ type: "rows", cols, items: P.map((p, i): Fila => ({ key: `${t}-${i}`, icon: "info", t: `${p.seccion} · ${p.pregunta}`, s: `${E(p.respuesta.es, p.respuesta.en)} · ${E("de dónde", "source")}: ${p.fuente}`, chev: false })) });
    }
  }
  return <div style={{ display: "flex", flexDirection: "column", gap: 14 }}><PanelBloques bloques={B} h1={desk ? 26 : 22} /><Toast t={toast} desk={desk} /></div>;
}
