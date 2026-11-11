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
const cuando = (iso: string | null) => (iso ? new Intl.DateTimeFormat("es-US", { timeZone: "America/New_York", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso)).replace(/\./g, "") : "—");
const KIND: Record<string, string> = { codigo: "pidió su código", entro: "entró", rechazado: "rechazada", pago_bloqueado: "intentó pagar (bloqueado)", activada: "activada", desactivada: "desactivada" };

export function SistemaAppsTiendas({ d, editar }: { d: DatosTiendas; editar: boolean }) {
  const router = useRouter(), w = useAncho(), desk = w >= 1024;
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast();
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? "Guardado."); setConf(null); router.refresh(); };
  const cols = desk ? "repeat(2,minmax(0,1fr))" : "1fr";
  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: "SISTEMA · APPS", t: "Apps", onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>);
  const B: Bloque[] = [
    { type: "head", eye: "SUPER ADMIN · SISTEMA", t: "Apps", s: "Las fichas de las tiendas, las cuentas de revisión, lo que le toca al fundador y las declaraciones de Apple y Google.", h1: desk ? 26 : 22 },
    { type: "tabs", items: PESTANAS_SISTEMA.map((p) => ({ l: p.l, on: p.k === "apps", onClick: () => (p.k === "apps" ? undefined : router.push(p.href)) })) },
    subApps(d.v, (h) => router.push(h)),
  ];

  if (d.v === "fichas") {
    const e = d.e, alDia = e.fichas.filter((f) => f.subido?.result === "borrador" && f.subido.sha === f.sha).length, activas = e.revision.filter((r) => r.activa).length;
    B.push({ type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: "FICHAS AL DÍA", v: `${alDia} de ${e.fichas.length}`, s: "lo subido = lo del repo" },
      { k: "CAPTURAS", v: String(e.fichas.reduce((a, f) => a + f.capturas, 0)), s: "del CI, por idioma y tienda" },
      { k: "SUBIDAS HOY", v: `${e.subidasHoy} de ${e.tope}`, s: "tope por día" },
      { k: "CUENTAS DE REVISIÓN", v: `${activas} de ${e.revision.length}`, s: e.encendida ? "encendidas" : "apagadas", bg: e.encendida ? "var(--tl-ink)" : undefined, fg: e.encendida ? "var(--tl-white)" : undefined }] });
    B.push({ type: "note", tone: "info", icon: "info", t: "La fuente de cada ficha es el repo (apps/mobile/tiendas/{app}/{es,en}.md, escrita desde la Ayuda). «Subir como borrador» la manda a App Store Connect (la versión en preparación) y a Google Play sin enviarla a revisión, con sus capturas, la clasificación por edad y las notas para la revisión. Enviar a revisión es de la Fase 9, con tu OK." });
    B.push({ type: "group", k: "LLAVES DE LAS TIENDAS" });
    B.push({ type: "rows", cols, items: ([["apple", "App Store Connect · llave de la API", "Sube la ficha, las capturas, la clasificación y las notas"], ["google", "Google Play · cuenta de servicio", "Sube la ficha y las capturas en una edición sin revisión"]] as const).map(([k, t, s]): Fila => ({
      key: k, icon: e.llaves[k] ? "key" : "lock", t, s, tag: e.llaves[k] ? "VIVA" : "FALTA", tone: e.llaves[k] ? "signal" : "neutral", ...(editar ? { onClick: () => router.push("/admin/sistema/integraciones") } : { chev: false }) })) });
    if (editar) B.push({ type: "acts", items: [{ l: "Subir como borrador", v: "primary", icon: "share", off: e.subidasHoy >= e.tope, onClick: () => setConf({ titulo: "Subir las fichas como borrador", cta: "Subir",
      sub: `Sin la llave de una tienda, esa tienda queda «sin llave» y no se toca. Nada se envía a revisión. Hoy: ${e.subidasHoy} de ${e.tope}.`,
      elegir: { label: "QUÉ APP", items: [{ k: "todas", l: "Las cuatro" }, ...Object.entries(APP).map(([k, l]) => ({ k, l }))] }, plantillas: ["Fichas nuevas en el repo", "Capturas nuevas del CI", "Primera subida"],
      hacer: (m, el) => fichasSubir(el ?? "todas", m) }) }] });
    for (const a of Object.keys(APP)) {
      B.push({ type: "group", k: `${APP[a]!.toUpperCase()} · FICHAS` });
      B.push({ type: "rows", cols, items: e.fichas.filter((f) => f.app === a).map((f): Fila => {
        const est = !f.subido ? ["SIN SUBIR", "neutral"] : f.subido.result === "error" ? ["ERROR", "danger"] : f.subido.sha === f.sha ? ["AL DÍA", "signal"] : ["CAMBIÓ", "action"];
        return { key: `${f.app}-${f.tienda}-${f.locale}`, icon: "news", t: `${TIENDA[f.tienda]} · ${f.locale} · ${f.titulo}`,
          s: [`repo ${f.sha.slice(0, 10)}…`, f.subido ? `subida ${cuando(f.subido.at)} (${f.subido.sha.slice(0, 10)}…)` : "nunca subida", `${f.capturas} ${f.capturas === 1 ? "captura" : "capturas"}`, f.subido?.detail].filter(Boolean).join(" · "),
          tag: est[0], tone: est[1], chev: false };
      }) });
    }
    B.push({ type: "group", k: "CUENTAS DE REVISIÓN DE APPLE Y GOOGLE" });
    B.push({ type: "note", tone: e.produccion && !e.encendida ? "warn" : "info", icon: "lock", t: e.produccion
      ? "En producción las cuentas de revisión se crean en la Fase 9, con tu OK, y solo entran con el envío a revisión pública encendido."
      : "Un número reservado que entra con un código fijo guardado como secreto del entorno (nunca aquí ni en el repo): solo ese número, solo con la cuenta activa y el interruptor encendido. No paga con tarjeta y solo ve su negocio de revisión, oculto para todos. Cada intento queda anotado." });
    B.push({ type: "rows", items: [{ key: "flag", icon: e.encendida ? "check" : "lock", t: e.interruptor ? "Las cuentas de revisión entran con su código" : "Las cuentas de revisión están apagadas", s: e.interruptor && !e.encendida ? "Encendido, pero este entorno no las deja entrar todavía (Fase 9)." : "Apagado: ningún código fijo sirve.",
      tag: e.encendida ? "ENCENDIDAS" : "APAGADAS", tone: e.encendida ? "signal" : "neutral",
      ...(editar ? { tgOn: e.interruptor, onTg: () => setConf({ titulo: e.interruptor ? "Apagar las cuentas de revisión" : "Encender las cuentas de revisión", cta: e.interruptor ? "Apagar" : "Encender", peligro: !e.interruptor,
        sub: e.interruptor ? "Ningún código fijo sirve desde ya (los vigentes se anulan)." : "Las cuentas activas entran con su código fijo. Para cuando Apple o Google revisen.", plantillas: e.interruptor ? ["Terminó la revisión", "Por seguridad"] : ["Revisión de Apple", "Revisión de Google", "Prueba en el sandbox"],
        hacer: (m) => revisionInterruptor(!e.interruptor, m) }) } : {}) }] });
    B.push(e.revision.length ? { type: "rows", cols, items: e.revision.map((r): Fila => ({ key: `rv${r.id}`, icon: "phone", dim: !r.activa,
      t: `${APP[r.app] ?? r.app} · ${r.tel}`, s: [r.negocio ? `negocio oculto «${r.negocio}»` : null, r.secreto ? `secreto ${r.codeRef} presente` : `falta el secreto ${r.codeRef} en el entorno`, `${r.entradas7} ${r.entradas7 === 1 ? "entrada" : "entradas"} en 7 días`,
        r.ultimo ? `último: ${KIND[r.ultimo.kind] ?? r.ultimo.kind}${r.ultimo.motivo ? ` (${r.ultimo.motivo})` : ""} ${cuando(r.ultimo.at)}` : "sin intentos"].filter(Boolean).join(" · "),
      tag: r.activa ? (r.secreto ? "ACTIVA" : "SIN SECRETO") : "DESACTIVADA", tone: r.activa ? (r.secreto ? "signal" : "action") : "neutral",
      ...(editar ? { tgOn: r.activa, onTg: () => setConf({ titulo: `${r.activa ? "Desactivar" : "Activar"} la cuenta de revisión de ${APP[r.app]}`, cta: r.activa ? "Desactivar" : "Activar", peligro: !r.activa,
        sub: r.activa ? "Su código deja de servir desde ya." : "Entra con su código fijo mientras las cuentas estén encendidas.", plantillas: r.activa ? ["Terminó la revisión", "Por seguridad"] : ["Revisión de Apple", "Revisión de Google"],
        hacer: (m) => revisionCuenta(r.id, !r.activa, m) }) } : {}) })) }
      : { type: "empty", icon: "phone", t: "Sin cuentas de revisión", s: "En el sandbox las crea la semilla; en producción se crean en la Fase 9 con tu OK." });
    B.push({ type: "group", k: "LO QUE SE DA A LAS TIENDAS" });
    B.push({ type: "rows", cols, items: [{ key: "priv", icon: "shield", t: "Política de privacidad", s: `${e.urls.privacidad} · borrador versión 0 (texto legal final en la Fase 9)`, onClick: () => window.open("/privacidad", "_blank", "noopener") },
      { key: "sop", icon: "help", t: "Soporte", s: `${e.urls.soporte} · sin sesión`, onClick: () => window.open("/soporte", "_blank", "noopener") },
      { key: "borrar", icon: "trash", t: "Borrar la cuenta (Google)", s: e.urls.borrar, onClick: () => window.open("/cuenta/ajustes/borrar", "_blank", "noopener") }] });
  } else if (d.v === "toca") {
    const todos = d.paquetes.flatMap((p) => p.pasos), hechos = todos.filter((p) => p.estado === "hecho").length;
    B.push({ type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: "HECHOS", v: `${hechos} de ${todos.length}`, bg: hechos === todos.length ? "var(--tl-ink)" : undefined, fg: hechos === todos.length ? "var(--tl-white)" : undefined },
      ...d.paquetes.slice(0, 3).map((p) => ({ k: p.k === "8-0" ? "DOMINIO" : p.k === "8-1" ? "CUENTAS" : "LLAVES", v: `${p.pasos.filter((x) => x.estado === "hecho").length} de ${p.pasos.length}` }))] });
    B.push({ type: "note", tone: "ink", icon: "shield", t: "Todo desde el teléfono, con un toque por paso. Nada se pide en el chat y ningún secreto se escribe aquí: los archivos de Apple y Google se suben en Sistema › Integraciones › Llaves. Lo que el sistema puede comprobar se marca solo." });
    for (const p of d.paquetes) {
      B.push({ type: "group", k: p.t.es.toUpperCase() });
      B.push({ type: "note", tone: "info", icon: "info", t: p.s.es });
      B.push({ type: "rows", cols, items: p.pasos.map((x): Fila => ({ key: x.k, icon: x.estado === "hecho" ? "check" : x.fuente === "sistema" ? "clock" : "edit",
        t: `${x.k} · ${x.t.es}`, s: [x.s.es, x.por ? x.por.es : x.marcadoAt ? `marcado ${cuando(x.marcadoAt)}` : null, x.copiar ? `correo: ${x.copiar}` : null].filter(Boolean).join(" · "),
        tag: x.estado === "hecho" ? "HECHO" : "PENDIENTE", tone: x.estado === "hecho" ? "signal" : "neutral", chev: false,
        acts: [...(x.consola ? [{ l: "Abrir", icon: "right", onClick: () => window.open(x.consola!, "_blank", "noopener") }] : []),
          ...(x.copiar ? [{ l: "Copiar", icon: "share", onClick: () => { void navigator.clipboard?.writeText(x.copiar!).then(() => setToast("Copiado.")).catch(() => setToast(x.copiar!)); } }] : []),
          ...(editar && !(x.fuente === "sistema" && x.estado === "hecho") ? [{ l: x.estado === "hecho" ? "Pendiente" : "Ya lo hice", icon: x.estado === "hecho" ? "close" : "check",
            onClick: () => setConf({ titulo: `${x.k} · ${x.t.es}`, cta: x.estado === "hecho" ? "Volver a pendiente" : "Marcar hecho", sub: x.fuente === "sistema" ? "El sistema lo marca solo cuando lo ve; esto lo deja marcado mientras." : "Este paso no lo puede ver el sistema: queda marcado con tu nota.",
              plantillas: x.estado === "hecho" ? ["Me equivoqué", "Hay que repetirlo"] : ["Hecho desde el teléfono", "Aprobado por Apple", "Aprobado por Google"], hacer: (m) => pasoMarcar(x.k, x.estado !== "hecho", m) }) }] : [])] })) });
    }
  } else if (d.v === "declaraciones") {
    const L = (x: Bi) => x.es;
    B.push({ type: "chips", k: "APP", items: Object.entries(APP).map(([k, l]) => ({ l, v: d.app === k ? "selected" : "filter", onClick: () => router.push(`/admin/sistema/apps?v=declaraciones&app=${k}`) })) });
    B.push({ type: "note", tone: "info", icon: "info", t: "Cada pregunta como la escribe Apple o Google, la respuesta que damos y de dónde sale. Las de privacidad salen del inventario real de datos (las mismas de /privacidad y del PrivacyInfo de iOS). Apple App Privacy y lo de Google se tocan en la consola (Paquete 8-3); la clasificación de Apple la sube el servidor con la ficha." });
    B.push({ type: "group", k: "APPLE · APP PRIVACY" });
    B.push({ type: "rows", cols, items: [
      { key: "a-track", icon: "shield", t: "Data Used to Track You", r: "Ninguno", s: "No rastreamos: sin anuncios, sin IDFA, sin compartir para publicidad · de dónde: inventario (rastreo: false)", chev: false },
      ...d.apple.map((x): Fila => ({ key: `a-${x.tipo}`, icon: "shield", t: `${x.ligado ? "Data Linked to You" : "Data Not Linked to You"} · ${x.categoria} · ${nombreApple(x.tipo)}`, r: "Sí",
        s: `Usado para: ${x.propositos.map((p) => PROP_APPLE[p] ?? p).join(", ")} · para rastrear: no · de dónde: inventario (${x.de.map((k) => L(d.etiquetas[k] ?? { es: k, en: k })).join(", ")})`, chev: false })),
    ] });
    B.push({ type: "group", k: "GOOGLE · DATA SAFETY" });
    B.push({ type: "acts", items: [{ l: "Descargar el CSV de Data safety", v: "secondary", icon: "folder", onClick: () => window.open(`/api/admin/tiendas/data-safety?app=${d.app}`, "_blank", "noopener") }] });
    B.push({ type: "rows", cols, items: [
      { key: "g-collect", icon: "shield", t: "Does your app collect or share any of the required user data types?", r: "Sí", s: "Se recoge; no se comparte con terceros · de dónde: inventario", chev: false },
      { key: "g-enc", icon: "lock", t: "Is all of the user data collected by your app encrypted in transit?", r: "Sí", s: "Todo por HTTPS · de dónde: inventario (cifradoEnTransito)", chev: false },
      { key: "g-del", icon: "trash", t: "Do you provide a way for users to request that their data is deleted?", r: "Sí", s: `Mi cuenta › Ajustes › Borrar mi cuenta · ${d.urls.borrar}`, chev: false },
      ...d.google.map((x): Fila => ({ key: `g-${x.tipo}`, icon: "shield", t: `${x.categoria} · ${nombreGoogle(x.tipo)}`, r: x.opcional ? "Opcional" : "Obligatorio",
        s: `Recogido, no compartido, no efímero · para: ${x.propositos.map((p) => PROP_GOOGLE[p] ?? p).join(", ")} · de dónde: inventario (${x.de.map((k) => L(d.etiquetas[k] ?? { es: k, en: k })).join(", ")})`, chev: false })),
    ] });
    for (const t of ["apple", "google"] as const) {
      const P = d.preguntas.filter((p) => p.tienda === t);
      B.push({ type: "group", k: t === "apple" ? "APPLE · CLASIFICACIÓN, CIFRADO Y REVISIÓN" : "GOOGLE · CLASIFICACIÓN (IARC) Y DECLARACIONES" });
      B.push({ type: "rows", cols, items: P.map((p, i): Fila => ({ key: `${t}-${i}`, icon: "info", t: `${p.seccion} · ${p.pregunta}`, s: `${p.respuesta.es} · de dónde: ${p.fuente}`, chev: false })) });
    }
  }
  return <div style={{ display: "flex", flexDirection: "column", gap: 14 }}><PanelBloques bloques={B} h1={desk ? 26 : 22} /><Toast t={toast} desk={desk} /></div>;
}
