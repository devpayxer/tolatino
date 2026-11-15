"use client";
/* 7c · Super Admin › El Compa (Super Admin.dc.html secCompa, pestaña «Interruptores» + el tope compuesto del hueco #3 de fase7-compa.md:
   el gasto del mes con su barra y sus cifras (rvsum), POR NIVEL, POR CANAL y REGLAS FIJAS como en el diseño, más POR CIUDAD y POR NEGOCIO,
   los modelos (kv) y el HISTORIAL). «Conversaciones» en solo lectura: cifras (kpis), chips DÓNDE y RESULTADO, la lista (AdminList) con
   cursor. Pausar, levantar y cambiar el tope piden motivo (ConfirmarMotivo, patrón 2ao) y quedan en la auditoría.
   7i · Las 4 pestañas del diseño (secCompa): RESUMEN (por defecto: KPI de 7 días, barras POR QUÉ PASÓ A UNA PERSONA · DÓNDE CONTESTA · POR DÓNDE
   ESCRIBEN (HBars), COPILOTO EN SOPORTE, MARCADAS POR EL EQUIPO, PERSONAS DEL EQUIPO y «LO QUE EL COMPA NO SUPO · PARA EL CENTRO DE AYUDA» con
   «Anotado» / «Corregido en {artículo}»), CONVERSACIONES (+ RESULTADO «Marcadas»; la ficha compaDetail con «Marcar respuesta incorrecta» con
   motivo / «Quitar la marca» y su HISTORIAL), NEGOCIOS e INTERRUPTORES Y TOPE (+ Canales de 7h). */
import * as UI from "@tolatino/ui";
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState, type ComponentType } from "react";
import type { DatosCompaAdmin, FichaConv, ResumenCompa } from "@/lib/compa/admin-compa";
import type { DatosCanales, Simulado } from "@/lib/compa/canales";
import type { AutoNegocio } from "@/lib/compa/respuesta-auto";
import { compaDesmarcar, compaInterruptor, compaLevantar, compaMarcar, compaNoSupo, compaNumero, compaNumeroRetirar, compaPausarEn, compaSimular, compaTope } from "./acciones-compa";
import type { ResAdm } from "./acciones-colas";
import { ConfirmarMotivo, Toast, useAncho, useToast, type Confirmar } from "./Colas";
import { useE } from "./idioma-admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const A = UI as unknown as Record<"AdminList" | "HBars", ComponentType<any>>;
type EF = (es: string, en: string) => string;
/* 9f-4 · Las etiquetas en el idioma de la persona del equipo: mapas(E) devuelve los mismos mapas con sus nombres. */
const mapas = (E: EF) => ({
  NIVEL: {
    neighbor: [E("Vecinos", "Neighbors"), E("Apagado: la ayuda de cada operación abre el formulario de siempre y Soporte dice «Escríbenos».", "Off: help on each operation opens the usual form and Support says “Write to us”.")],
    owner: [E("Panel del negocio", "Business dashboard"), E("Apagado: el panel muestra el aviso y lleva a Soporte.", "Off: the dashboard shows the notice and leads to Support.")],
    auto_reply: [E("Respuestas automáticas", "Auto-replies"), E("Apagado para todos: los clientes esperan al dueño. Por negocio, abajo.", "Off for everyone: customers wait for the owner. Per business, below.")],
    copilot: [E("Copiloto", "Copilot"), E("Apagado: Soporte responde solo con macros.", "Off: Support replies with macros only.")],
  } as Record<string, [string, string]>,
  CANAL: {
    app: [E("Chat de To'Latino", "To'Latino chat"), E("App y web.", "App and web."), "chat"],
    whatsapp: ["WhatsApp", E("La acción se confirma con un enlace a la app.", "The action is confirmed with a link to the app."), "phone"],
    sms: ["SMS", E("La acción se confirma con un enlace a la app.", "The action is confirmed with a link to the app."), "phone"],
  } as Record<string, [string, string, string]>,
  RESULTADO: { open: [E("ABIERTA", "OPEN"), "neutral"], self_resolved: [E("RESOLVIÓ SOLO", "RESOLVED ON ITS OWN"), "neutral"], action_done: [E("ACCIÓN CONFIRMADA", "ACTION CONFIRMED"), "signal"], handed_off: [E("A UNA PERSONA", "TO A PERSON"), "action"], to_owner: [E("AL DUEÑO", "TO THE OWNER"), "action"] } as Record<string, [string, string]>,
  MOTIVO: { money: E("dinero", "money"), account: E("cuenta", "account"), safety: E("seguridad", "safety"), asked_person: E("lo pidió", "asked for it"), unknown: E("no supo", "didn’t know"), owner: E("dueño", "owner") } as Record<string, string>,
  // 7i · Resumen: por qué pasó a una persona (secCompa compaWhy) y «Marcar respuesta incorrecta» (MD CompaReview.reason).
  POR_QUE: { money: E("Dinero", "Money"), account: E("Su cuenta", "Their account"), safety: E("Seguridad", "Safety"), asked_person: E("Pidió una persona", "Asked for a person"), unknown: E("No supo", "Didn’t know"), owner: E("Al dueño del negocio", "To the business owner") } as Record<string, string>,
  MARCA: { wrong_info: E("Dato equivocado", "Wrong information"), should_hand_off: E("Debía pasar a una persona", "Should have gone to a person"), tone: E("El tono", "The tone"), language: E("El idioma", "The language"), other: E("Otra cosa", "Something else") } as Record<string, string>,
  NO_SUPO_E: { open: E("Abiertas", "Open"), noted: E("Anotadas", "Noted"), fixed: E("Corregidas", "Fixed") } as Record<string, string>,
  SUP: { support_page: E("Soporte", "Support"), help_sheet: E("Hoja de ayuda", "Help sheet"), panel: E("Panel", "Dashboard"), business_chat: E("Chat del negocio", "Business chat"), ticket: E("Caso", "Case"), channel: E("WhatsApp o SMS", "WhatsApp or SMS") } as Record<string, string>,
  // 7h · Canales: lo que pasó con cada entrada y con cada salida (sin texto ni teléfono).
  RES_E: { respuesta: [E("CONTESTÓ", "REPLIED"), "signal"], enlace: [E("MANDÓ UN ENLACE", "SENT A LINK"), "signal"], persona: [E("A UNA PERSONA", "TO A PERSON"), "action"], fija: [E("RESPUESTA FIJA", "FIXED REPLY"), "neutral"],
    baja: ["STOP", "danger"], alta: ["START", "signal"], ayuda: ["HELP", "neutral"], en_baja: [E("DE BAJA · NADA", "OPTED OUT · NOTHING"), "neutral"], limite: [E("LÍMITE DEL DÍA", "DAILY LIMIT"), "action"], apagado: [E("APAGADO · NADA", "OFF · NOTHING"), "neutral"],
    tope: [E("AL TOPE · NADA", "AT CAP · NOTHING"), "action"], auto: [E("RESPUESTA DEL NEGOCIO", "BUSINESS REPLY"), "signal"], auto_paso: [E("PASÓ AL NEGOCIO", "PASSED TO BUSINESS"), "action"], auto_nada: [E("EL NEGOCIO CONTESTA", "THE BUSINESS REPLIES"), "neutral"], sin_ruta: [E("NO ES NUESTRO", "NOT OURS"), "neutral"],
    media: [E("SOLO TEXTO", "TEXT ONLY"), "neutral"], error: [E("FALLÓ", "FAILED"), "danger"] } as Record<string, [string, string]>,
  SAL: { simulado: E("simulado (sandbox)", "simulated (sandbox)"), pendiente: E("pendiente", "pending"), enviado: E("enviado", "sent"), fallo: E("falló", "failed"), apagado: E("no salió: canal apagado", "not sent: channel off"), baja: E("no salió: pidió STOP", "not sent: asked STOP"),
    silencio: E("no salió: horas de silencio", "not sent: quiet hours"), ventana: E("no salió: fuera de las 24 h de WhatsApp", "not sent: outside WhatsApp’s 24 h window"), sin_proveedor: E("sin proveedor", "no provider") } as Record<string, string>,
  MODO: { simulador: E("Simulador del sandbox (no sale nada)", "Sandbox simulator (nothing goes out)"), real: E("Proveedor real", "Real provider"), apagado: E("Apagado: no sale nada", "Off: nothing goes out") } as Record<string, string>,
  ACC_T: { cancel_request: E("Cancelar una solicitud", "Cancel a request"), open_screen: E("Abrir una pantalla", "Open a screen"), go_to_panel: E("Ir al panel", "Go to the dashboard") } as Record<string, string>,
  ACC_E: { proposed: E("propuesta", "proposed"), confirming: E("confirmando", "confirming"), confirmed: E("confirmada", "confirmed"), dismissed: E("la dejó", "dismissed"), expired: E("venció", "expired"), failed: E("falló", "failed") } as Record<string, string>,
  MOTOR: { claude: E("Claude (con la llave del entorno)", "Claude (with the environment key)"), simulador: E("Simulador del sandbox (todavía sin llave de Anthropic)", "Sandbox simulator (no Anthropic key yet)"), reglas: E("Reglas fijas (sin IA)", "Fixed rules (no AI)") } as Record<string, string>,
  ACCION: { "compa.pausar": E("Pausó", "Paused"), "compa.encender": E("Encendió", "Turned on"), "compa.pausar_en": E("Pausó", "Paused"), "compa.levantar": E("Levantó la pausa", "Lifted the pause"), "config.cambiar": E("Cambió", "Changed"),
    "compa.numero": E("Conectó", "Connected"), "compa.numero_retirar": E("Retiró", "Removed"), "compa.simular": E("Probó", "Tested"), "compa.marcar": E("Marcó", "Flagged"), "compa.desmarcar": E("Quitó la marca", "Removed the flag"), "compa.no_supo_anotado": E("Anotó", "Noted"),
    "compa.no_supo_corregido": E("Corrigió", "Fixed"), "compa.modelo": E("Cambió el modelo", "Changed the model") } as Record<string, string>,
});
const plata = (c: number) => `$${(c / 100).toFixed(c > 0 && c < 1 ? 4 : 2)}`;
const cuandoL = (iso: string | null, en: boolean) => (iso ? new Intl.DateTimeFormat(en ? "en-US" : "es-US", { timeZone: "America/New_York", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso)).replace(/\./g, "") : "—");
const valores = (o: Record<string, string> | null) => (o ? Object.values(o).join(" · ") : "");
const pares = (o: Record<string, string> | null) => (o ? Object.entries(o).map(([k, v]) => `${k}: ${v}`).join(" · ") : "");
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const mesL = (m: string, en = false) => { const [a, b] = m.split("-"); return en ? `${MONTHS[Number(b) - 1] ?? b} ${a}` : `${MESES[Number(b) - 1] ?? b} de ${a}`; };

export function ElCompaAdmin({ d, tab, uso, res, canal = null, buscar = null, antes, cambiar, cp = null, ficha = null, leer = false, negocios = [], canales = null, resumen = null, ns = "open" }: {
  d: DatosCompaAdmin; tab: "res" | "ctl" | "conv" | "neg" | "can"; uso: string | null; res: string | null; canal?: string | null; buscar?: string | null; antes: string | null; cambiar: boolean;
  cp?: string | null; ficha?: FichaConv | null; leer?: boolean; negocios?: AutoNegocio[]; canales?: DatosCanales | null; resumen?: ResumenCompa | null; ns?: string;
}) {
  const router = useRouter(), w = useAncho(), desk = w >= 1024, E = useE();
  const en = E("", "x") === "x", cuando = (iso: string | null) => cuandoL(iso, en);
  const { NIVEL, CANAL, RESULTADO, MOTIVO, MARCA, SUP, RES_E, SAL, MODO, ACC_T, ACC_E, MOTOR, ACCION } = mapas(E);
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast(), [q, setQ] = useState(buscar ?? "");
  const [sim, setSim] = useState<{ num: string; tel: string; txt: string; res: Simulado | null; busy: boolean }>({ num: canales?.numeros[0]?.id ?? "", tel: "", txt: "", res: null, busy: false });
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? E("Listo.", "Done.")); setConf(null); router.refresh(); };
  const ir = (p: { tab?: string; uso?: string | null; res?: string | null; canal?: string | null; buscar?: string | null; antes?: string | null; cp?: string | null; ns?: string | null }) => {
    const x = new URLSearchParams(), t = p.tab ?? tab, u = p.uso !== undefined ? p.uso : uso, r = p.res !== undefined ? p.res : res;
    const ca = p.canal !== undefined ? p.canal : canal, bq = p.buscar !== undefined ? p.buscar : buscar;
    if (t !== "res" && !(p.cp && t === "conv")) x.set("tab", t); if (t === "res" && p.ns && p.ns !== "open") x.set("ns", p.ns); if (t === "conv" && u) x.set("uso", u); if (t === "conv" && r) x.set("res", r); if (t === "conv" && ca) x.set("canal", ca);
    if (t === "conv" && bq) x.set("buscar", bq); if (p.antes) x.set("antes", p.antes); if (p.cp) x.set("cp", p.cp);
    router.push(x.size ? `/admin/compa?${x}` : "/admin/compa", { scroll: false });
  };
  // 7d · La ficha de una conversación (compaDetail): solo con permiso de leer hilos; cada apertura ya quedó anotada en el servidor.
  if (cp && !conf) {
    const f = ficha, volver = () => ir({ cp: null });
    const FB: Bloque[] = [{ type: "head", eye: E("EL COMPA · CONVERSACIONES", "EL COMPA · CONVERSATIONS"), t: f?.num ?? cp, s: f ? `${NIVEL[f.uso]?.[0] ?? f.uso} · ${cuando(f.at)}` : undefined, onBack: volver, h1: desk ? 26 : 22 }];
    if (!leer) FB.push({ type: "note", tone: "warn", t: E("Tu rol ve las cifras de El Compa, no lo que se habló. El hilo lo leen Admin y Soporte, y cada lectura queda anotada.", "Your role sees El Compa’s numbers, not what was said. Admin and Support read the thread, and every read is logged.") });
    else if (!f) FB.push({ type: "empty", icon: "chat", t: E("Esa conversación no existe", "That conversation doesn’t exist"), s: E("Revisa el número CP-.", "Check the CP- number.") });
    else {
      FB.push({ type: "kv", cols: desk ? 3 : 2, items: [
        { k: E("QUIÉN", "WHO"), v: f.quien?.nombre ?? "—" }, { k: E("NEGOCIO", "BUSINESS"), v: f.negocio?.nombre ?? "—" }, { k: E("CANAL", "CHANNEL"), v: CANAL[f.canal === "web" ? "app" : f.canal]?.[0] ?? f.canal },
        { k: E("RESULTADO", "RESULT"), v: RESULTADO[f.resultado]?.[0] ?? f.resultado, fg: f.resultado === "handed_off" ? "var(--tl-action)" : f.resultado === "action_done" ? "var(--tl-open-text)" : undefined },
        ...(f.motivo ? [{ k: E("MOTIVO", "REASON"), v: MOTIVO[f.motivo] ?? f.motivo }] : []), ...(f.caso ? [{ k: E("CASO EN SOPORTE", "SUPPORT CASE"), v: f.caso, fg: "var(--tl-action)" }] : []),
        { k: E("DÓNDE", "WHERE"), v: `${SUP[f.superficie] ?? f.superficie}${f.operacion ? ` · ${f.operacion}` : ""}` }, { k: E("CIUDAD", "CITY"), v: f.ciudad }] });
      // 7i · La marca viva («Marcar respuesta incorrecta») y la purga por retención (solo quedan las cifras).
      if (f.marca) FB.push({ type: "note", tone: "danger", icon: "warning", t: `${E("Marcada por", "Flagged by")} ${f.marca.quien ?? E("el equipo", "the team")} · ${MARCA[f.marca.motivo] ?? f.marca.motivo}${f.marca.nota ? `: ${f.marca.nota}` : ""} · ${cuando(f.marca.at)}` });
      if (f.purgada) FB.push({ type: "note", tone: "ink", icon: "lock", t: E(`El texto se borró el ${cuando(f.purgada)} por la retención (Configuración › El Compa) o porque la cuenta se cerró: quedan las cifras.`, `The text was deleted on ${cuando(f.purgada)} by retention (Settings › El Compa) or because the account was closed: the numbers remain.`) });
      if (!f.ai) FB.push({ type: "note", tone: "warn", t: E("Contestó sin IA (reglas fijas) al menos una vez: un paso fijo de la hoja, el tope, la IA lenta o una respuesta que no pasó el verificador.", "It replied without AI (fixed rules) at least once: a fixed step in the sheet, the cap, slow AI or a reply that didn’t pass the checker.") });
      FB.push({ type: "thread", items: f.msjs.map((m) => ({ t: m.t ?? E("(borrado por la retención)", "(deleted by retention)"), mine: m.de === "compa", m: m.de === "user" ? (f.quien?.nombre ?? E("Vecino", "Neighbor")) : m.de === "compa" ? `El Compa · ${m.motor === "reglas" ? E("reglas fijas", "fixed rules") : E("IA", "AI")}${m.fuente ? ` · ${m.fuente}` : ""} · ${cuando(m.at)}` : E("Sistema", "System"), soft: m.de === "system" })) });
      FB.push({ type: "note", tone: "ink", icon: "shield", t: E("El equipo solo lee lo que el vecino habló con El Compa para revisar la calidad; los chats privados entre vecinos no se leen.", "The team only reads what the neighbor said with El Compa to review quality; private chats between neighbors are never read.") });
      const marcar = () => setConf({ titulo: E("¿Qué contestó mal El Compa?", "What did El Compa get wrong?"), peligro: true, cta: E("Marcar", "Flag"), elegir: { label: E("QUÉ ESTUVO MAL", "WHAT WENT WRONG"), items: Object.entries(MARCA).map(([k, l]) => ({ k, l })) },
        sub: E("Sirve para corregir la ayuda y las reglas. No le llega al vecino. Queda en el historial.", "It helps fix the help content and the rules. The neighbor doesn’t see it. It stays in the history."), plantillas: [E("Dio un dato que no está en la ayuda.", "It gave information that isn’t in the help."), E("Tenía que pasar a una persona.", "It should have gone to a person."), E("Contestó en otro idioma.", "It replied in another language.")],
        hacer: (m, e) => compaMarcar(f.num, e ?? "", m) });
      const desmarcar = () => setConf({ titulo: E("Quitar la marca", "Remove the flag"), cta: E("Quitar la marca", "Remove the flag"), sub: E("La conversación deja de contar como marcada. Queda en el historial.", "The conversation stops counting as flagged. It stays in the history."), plantillas: [E("Revisado: la respuesta estaba bien.", "Reviewed: the reply was fine."), E("Ya se corrigió la ayuda.", "The help was already fixed.")],
        hacer: (m) => compaDesmarcar(f.num, m) });
      FB.push({ type: "acts", items: [
        ...(f.marca ? [{ l: E("Quitar la marca", "Remove the flag"), v: "secondary", icon: "check", onClick: desmarcar }] : f.purgada ? [] : [{ l: E("Marcar respuesta incorrecta", "Flag wrong answer"), v: "danger", icon: "warning", onClick: marcar }]),
        ...(f.caso ? [{ l: E(`Ver ${f.caso} en Soporte`, `View ${f.caso} in Support`), v: "secondary", onClick: () => router.push(`/admin/soporte?caso=${encodeURIComponent(f.caso!)}`) }] : []),
        ...(f.quien ? [{ l: E("Ver a la persona", "View the person"), v: "secondary", onClick: () => router.push(`/admin/usuarios/${f.quien!.id}`) }] : [])] });
      FB.push({ type: "rows", k: E("ACCIONES", "ACTIONS"), items: f.acciones.length ? f.acciones.map((a, i) => ({ key: `a${i}`, icon: a.tipo === "cancel_request" ? "close" : "right", chev: false, compact: true,
        t: `${ACC_T[a.tipo] ?? a.tipo} · ${ACC_E[a.estado] ?? a.estado}`, s: `${cuando(a.at)}${a.via ? ` · ${E("desde", "from")} ${a.via === "link" ? E("el enlace", "the link") : E("la app", "the app")}` : ""}${a.motivo ? ` · ${a.motivo}` : ""}` }))
        : [{ key: "x", icon: "folder", t: E("Ninguna acción preparada", "No action prepared"), chev: false }] });
      FB.push({ type: "rows", k: E("QUIÉN LA LEYÓ", "WHO READ IT"), items: f.lecturas.map((r, i) => ({ key: `l${i}`, icon: "users", t: r.quien ?? E("Alguien del equipo", "Someone on the team"), s: cuando(r.at), chev: false, compact: true })) });
      FB.push({ type: "rows", k: E("HISTORIAL", "HISTORY"), items: f.historial.length ? f.historial.map((h, i) => ({ key: `h${i}`, icon: h.accion === "compa.marcar" ? "warning" : "check", chev: false, compact: true,
        t: `${ACCION[h.accion] ?? h.accion} · ${pares(h.despues)}`, s: `${cuando(h.at)}${h.quien ? ` · ${h.quien}` : ""}${h.motivo ? ` · ${h.motivo}` : ""}` }))
        : [{ key: "x", icon: "folder", t: E("Sin marcas ni cambios", "No flags or changes"), chev: false }] });
    }
    return <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 820 }}><PanelBloques bloques={FB} h1={desk ? 26 : 22} /><Toast t={toast} desk={desk} /></div>;
  }
  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: cp ? `EL COMPA · ${cp}` : tab === "res" ? E("EL COMPA · RESUMEN", "EL COMPA · OVERVIEW") : E("EL COMPA · INTERRUPTORES Y TOPE", "EL COMPA · SWITCHES AND CAP"), t: conf.titulo, onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>
  );
  const I = d.interruptores, g = d.gasto;
  const pausados = [...I.niveles.filter((x) => !x.on).map((x) => NIVEL[x.uso]![0]), ...I.canales.filter((x) => !x.on).map((x) => CANAL[x.canal]![0]), ...I.pausas.map((p) => p.nombre || p.donde)];
  const sinPermiso = () => setToast(E("Tu rol no cambia interruptores.", "Your role can’t change switches."));
  const tgNivel = (clave: string, on: boolean, l: string) => !cambiar ? sinPermiso() : setConf(on
    ? { titulo: E(`Poner en pausa: ${l}`, `Pause: ${l}`), peligro: true, cta: E("Poner en pausa", "Pause"), sub: E("Mientras esté en pausa, la gente ve el camino de siempre (formularios y Soporte con personas). Queda en el historial.", "While paused, people see the usual path (forms and Support with people). It stays in the history."),
      plantillas: [E("Respuestas incorrectas: lo revisamos.", "Wrong answers: we’re reviewing it."), E("Gasto fuera de lo normal.", "Unusual spending."), E("Mantenimiento.", "Maintenance.")], hacer: (m) => compaInterruptor(clave, false, m) }
    : { titulo: E(`Encender: ${l}`, `Turn on: ${l}`), cta: E("Encender", "Turn on"), sub: E("El Compa vuelve a contestar aquí desde el mensaje siguiente.", "El Compa replies here again from the next message."), plantillas: [E("Revisado: ya está bien.", "Reviewed: it’s fine now."), E("Fin del mantenimiento.", "Maintenance done.")], hacer: (m) => compaInterruptor(clave, true, m) });
  const NIV_OPC = { label: E("QUÉ SE PAUSA", "WHAT GETS PAUSED"), items: [{ k: "todo", l: E("Todo El Compa", "All of El Compa") }, ...Object.entries(NIVEL).map(([k, v]) => ({ k, l: v[0] }))] };
  const pausarCiudad = (id: string, nombre: string) => !cambiar ? sinPermiso() : setConf({ titulo: E(`Pausar El Compa en ${nombre}`, `Pause El Compa in ${nombre}`), peligro: true, cta: E("Pausar aquí", "Pause here"), elegir: NIV_OPC,
    sub: E("En esa ciudad la gente ve el camino de siempre. Queda en el historial.", "In that city people see the usual path. It stays in the history."), plantillas: [E("Problema con la ayuda de esta ciudad.", "Problem with this city’s help."), E("Mantenimiento.", "Maintenance.")],
    hacer: (m, e) => compaPausarEn("city", id, e === "todo" ? "" : e ?? "", m) });
  const pausarNegocio = () => !cambiar ? sinPermiso() : setConf({ titulo: E("Pausar El Compa en un negocio", "Pause El Compa for a business"), peligro: true, cta: E("Pausar en ese negocio", "Pause for that business"), elegir: NIV_OPC, valor: { k: E("NEGOCIO (ID O NOMBRE EXACTO)", "BUSINESS (ID OR EXACT NAME)"), ini: "", max: 80 },
    sub: E("Por ejemplo las respuestas automáticas de un negocio que reportan. Queda en el historial.", "For example, a reported business’s auto-replies. It stays in the history."), plantillas: [E("Reportaron respuestas incorrectas.", "Wrong answers were reported."), E("Lo pidió el dueño por Soporte.", "The owner asked through Support.")],
    hacer: (m, e, v) => compaPausarEn("business", v, e === "todo" ? "" : e ?? "", m) });
  const levantar = (id: string, nombre: string) => !cambiar ? sinPermiso() : setConf({ titulo: E(`Levantar la pausa · ${nombre}`, `Lift the pause · ${nombre}`), cta: E("Levantar", "Lift"), sub: E("El Compa vuelve a contestar ahí.", "El Compa replies there again."),
    plantillas: [E("Revisado: ya está bien.", "Reviewed: it’s fine now."), E("Fin del mantenimiento.", "Maintenance done.")], hacer: (m) => compaLevantar(id, m) });
  const tope = () => !cambiar ? sinPermiso() : setConf({ titulo: E("Cambiar el tope del mes", "Change the monthly cap"), cta: E("Guardar el tope", "Save the cap"), valor: { k: E("TOPE AL MES (EN DÓLARES)", "MONTHLY CAP (IN DOLLARS)"), ini: (g.tope / 100).toFixed(0), max: 9 },
    sub: E(`Hoy: ${plata(g.tope)} al mes (gastado ${plata(g.gastado)}). Al tope, El Compa contesta con reglas fijas y ofrece «Con una persona». Entre $0 y $10,000. Queda en la auditoría.`, `Now: ${plata(g.tope)} a month (spent ${plata(g.gastado)}). At the cap, El Compa replies with fixed rules and offers “With a person”. Between $0 and $10,000. It stays in the audit log.`),
    plantillas: [E("Más vecinos usan El Compa.", "More neighbors use El Compa."), E("Bajar el gasto este mes.", "Lower spending this month.")], hacer: (m, _e, v) => compaTope(v, m) });

  const alTope = !!g.topeEn || g.pct >= 100, aviso = g.pct >= g.alertaPct;
  const porNivel = new Map(g.porNivel.map((x) => [x.uso, x]));
  const B: Bloque[] = [
    { type: "head", eye: E("OPERAR", "OPERATE"), t: E("El Compa · IA", "El Compa · AI"), s: E("Lo que contesta El Compa a vecinos y negocios, cuánto gasta y dónde está encendido. Nunca mueve dinero ni cambia cuentas: eso llega a Soporte con el resumen.", "What El Compa answers neighbors and businesses, how much it spends and where it’s on. It never moves money or changes accounts: that goes to Support with the summary."), h1: desk ? 26 : 22 },
    ...(I.candado ? [{ type: "note" as const, tone: "warn" as const, t: E("Producción: El Compa queda apagado hasta que se encienda todo (fase 9), aunque los interruptores digan otra cosa.", "Production: El Compa stays off until everything is turned on (phase 9), even if the switches say otherwise.") }] : []),
    ...(pausados.length ? [{ type: "note" as const, tone: "warn" as const, t: `${E("En pausa", "Paused")}: ${pausados.join(" · ")}.` }] : []),
    { type: "tabs", items: [{ l: E("Resumen", "Overview"), on: tab === "res", onClick: () => ir({ tab: "res" }) },
      { l: E("Conversaciones", "Conversations"), n: d.conv.total7d ? String(d.conv.total7d) : undefined, on: tab === "conv", onClick: () => ir({ tab: "conv" }) },
      { l: E("Negocios", "Businesses"), on: tab === "neg", onClick: () => ir({ tab: "neg" }) },
      { l: E("Interruptores y tope", "Switches and cap"), n: pausados.length ? String(pausados.length) : undefined, on: tab === "ctl", onClick: () => ir({ tab: "ctl" }) },
      { l: E("Canales", "Channels"), n: canales?.cifras.entradas24 ? String(canales.cifras.entradas24) : undefined, on: tab === "can", onClick: () => ir({ tab: "can" }) }] },
  ];
  if (tab === "ctl") {
    B.push(
      { type: "rvsum", icon: "wallet", t: E("Gastado este mes", "Spent this month"), s: E(`${mesL(g.mes)} · vuelve a cero el día 1 (hora del este)`, `${mesL(g.mes, true)} · resets on the 1st (Eastern time)`), tag: alTope ? E("AL TOPE", "AT CAP") : aviso ? `${g.pct} %` : E("DENTRO DEL TOPE", "WITHIN CAP"), tone: alTope ? "danger" : aviso ? "warn" : "signal",
        progT: E(`${plata(g.gastado)} de ${plata(g.tope)}`, `${plata(g.gastado)} of ${plata(g.tope)}`), progR: `${g.pct} %`, pct: `${Math.min(100, g.pct)}%`, barC: alTope ? "var(--tl-danger)" : aviso ? "var(--tl-pro)" : "var(--tl-action)",
        stats: [{ k: E("TOPE", "CAP"), v: plata(g.tope), s: E("al mes", "a month") }, { k: E("AVISO", "ALERT"), v: `${g.alertaPct} %`, s: g.alertaEn ? `${E("avisado", "alerted")} ${cuando(g.alertaEn)}` : E("al equipo Admin", "to the Admin team") }, { k: E("EN CURSO", "IN PROGRESS"), v: plata(g.reservado), s: E("reservado ahora", "reserved now") }],
        tools: cambiar ? [{ l: E("Cambiar el tope", "Change the cap"), icon: "edit", onClick: tope }] : [] },
      { type: "note", tone: alTope ? "danger" : "info", t: alTope ? E("Al tope: El Compa contesta con reglas fijas y ofrece «Con una persona» hasta el mes que viene o hasta que subas el tope. Nada se rompe.", "At the cap: El Compa replies with fixed rules and offers “With a person” until next month or until you raise the cap. Nothing breaks.")
        : E("Al tope, El Compa contesta con reglas fijas y ofrece «Con una persona». Nada se rompe: la ayuda, Soporte, los pedidos y los pagos siguen igual.", "At the cap, El Compa replies with fixed rules and offers “With a person”. Nothing breaks: help, Support, orders and payments keep working.") },
      { type: "group", k: E("POR NIVEL", "BY LEVEL") },
      { type: "rows", items: I.niveles.map((x) => { const n = porNivel.get(x.uso), l = NIVEL[x.uso]![0]; return { key: x.uso, icon: "help", t: l,
        s: E(`${NIVEL[x.uso]![1]} Este mes: ${plata(n?.costo ?? 0)} · ${n?.llamadas ?? 0} con IA · ${n?.alTope ?? 0} al tope · ${n?.aReglas ?? 0} a reglas.`, `${NIVEL[x.uso]![1]} This month: ${plata(n?.costo ?? 0)} · ${n?.llamadas ?? 0} with AI · ${n?.alTope ?? 0} at cap · ${n?.aReglas ?? 0} to rules.`), tgOn: x.on, onTg: () => tgNivel(`compa.use.${x.uso}`, x.on, l) }; }) },
      { type: "group", k: E("POR CANAL", "BY CHANNEL") },
      { type: "rows", items: I.canales.map((x) => ({ key: x.canal, icon: CANAL[x.canal]![2], t: CANAL[x.canal]![0], s: CANAL[x.canal]![1], tgOn: x.on, onTg: () => tgNivel(`compa.channel.${x.canal}`, x.on, CANAL[x.canal]![0]) })) },
      { type: "group", k: E("POR CIUDAD", "BY CITY") },
      { type: "rows", items: I.ciudades.map((ci) => { const p = I.pausas.filter((z) => z.scope === "city" && z.donde === ci.id); return { key: ci.id, icon: "pin", t: ci.nombre,
        s: p.length ? p.map((z) => `${E("En pausa", "Paused")}${z.uso ? ` · ${NIVEL[z.uso]![0]}` : ""} · ${z.motivo} · ${z.quien ?? ""} ${cuando(z.at)}`).join(" / ") : E("Encendido", "On"),
        tag: p.length ? E("EN PAUSA", "PAUSED") : null, tone: "danger", acts: cambiar ? [...p.map((z) => ({ l: E("Levantar", "Lift"), v: "secondary", onClick: () => levantar(z.id, ci.nombre) })), ...(p.some((z) => !z.uso) ? [] : [{ l: E("Pausar aquí", "Pause here"), v: "secondary", onClick: () => pausarCiudad(ci.id, ci.nombre) }])] : undefined }; }) },
      { type: "group", k: E("POR NEGOCIO", "BY BUSINESS"), ...(cambiar ? { link: E("Pausar en un negocio", "Pause for a business"), onLink: pausarNegocio } : {}) },
      { type: "rows", items: I.pausas.filter((z) => z.scope === "business").length ? I.pausas.filter((z) => z.scope === "business").map((z) => ({ key: z.id, icon: "store", t: z.nombre || z.donde,
        s: `${E("En pausa", "Paused")}${z.uso ? ` · ${NIVEL[z.uso]![0]}` : E(" · todo El Compa", " · all of El Compa")} · ${z.motivo} · ${z.quien ?? ""} ${cuando(z.at)}`, tag: E("EN PAUSA", "PAUSED"), tone: "danger",
        acts: cambiar ? [{ l: E("Levantar", "Lift"), v: "secondary", onClick: () => levantar(z.id, z.nombre || z.donde) }] : undefined })) : [{ key: "nada", icon: "store", t: E("Ningún negocio en pausa", "No business paused"), s: E("Las respuestas automáticas las enciende cada dueño Pro en su panel.", "Each Pro owner turns on auto-replies in their dashboard."), chev: false }] },
      { type: "group", k: E("MODELO", "MODEL") },
      { type: "kv", cols: desk ? 3 : 1, items: [
        ...d.modelos.map((m) => ({ k: m.role === "copiloto" ? E("COPILOTO DEL EQUIPO", "TEAM COPILOT") : m.role === "cotidiano" ? E("VECINOS, PANEL Y RESPUESTAS", "NEIGHBORS, DASHBOARD AND REPLIES") : E("SIN USO", "UNUSED"), v: E(`${m.label} · $${m.entrada.toFixed(2)} / $${m.salida.toFixed(2)} por millón de tokens (+${m.geo - 100} % EE. UU.) · precios del ${m.precioDe}`, `${m.label} · $${m.entrada.toFixed(2)} / $${m.salida.toFixed(2)} per million tokens (+${m.geo - 100}% US) · prices as of ${m.precioDe}`) })),
        { k: E("CONTESTA AHORA", "ANSWERING NOW"), v: MOTOR[d.motor] ?? d.motor, fg: d.motor === "claude" ? undefined : "var(--tl-pro-ink)" }] },
      { type: "group", k: E("REGLAS FIJAS (NO SE APAGAN)", "FIXED RULES (CAN’T BE TURNED OFF)") },
      { type: "rows", items: [[E("Siempre dice que es IA", "Always says it’s AI"), E("Y «Con una persona» siempre a la vista.", "And “With a person” always in sight.")], [E("Nunca mueve dinero ni cambia la cuenta", "Never moves money or changes the account"), E("Prepara la acción; el vecino confirma. Lo demás pasa a una persona con el resumen.", "It prepares the action; the neighbor confirms. Everything else goes to a person with the summary.")],
        [E("Nunca pide tarjeta, contraseñas, SSN ni estatus", "Never asks for card, passwords, SSN or status"), E("Y no da consejo legal, médico ni de inmigración.", "And gives no legal, medical or immigration advice.")], [E("Responde en el idioma del vecino", "Replies in the neighbor’s language"), E("Español neutro con tú, o inglés.", "Neutral Spanish with tú, or English.")]]
        .map(([t, s], i) => ({ key: `r${i}`, icon: "lock", ibg: "rgba(11,14,18,.05)", ifg: "var(--tl-ink)", t: t!, s, chev: false })) },
      { type: "rows", k: E("HISTORIAL", "HISTORY"), items: d.historial.length ? d.historial.map((h, i) => ({ key: `h${i}`, icon: h.accion === "compa.pausar" || h.accion === "compa.pausar_en" ? "ban" : h.accion === "config.cambiar" ? "edit" : "check",
        t: `${ACCION[h.accion] ?? h.accion} · ${pares(h.despues) || h.objetivo}`, s: `${cuando(h.at)}${h.quien ? ` · ${h.quien}` : ""}${h.antes ? ` · ${E("antes", "before")}: ${valores(h.antes)}` : ""}${h.motivo ? ` · ${h.motivo}` : ""}`, chev: false, compact: true }))
        : [{ key: "x", icon: "folder", t: E("Sin cambios todavía", "No changes yet"), chev: false }] },
    );
  } else if (tab === "can" && canales) {
    // 7h · Canales: WhatsApp y SMS (secCompa POR CANAL + hueco de diseño: números, registro y simulador, compuestos con piezas del sistema).
    const C2 = canales, k = C2.cifras;
    const numero = () => !cambiar ? sinPermiso() : setConf({ titulo: E("Conectar un número", "Connect a number"), cta: E("Conectar", "Connect"), elegir: { label: E("CANAL", "CHANNEL"), items: [
        { k: "whatsapp:whatsapp", l: "WhatsApp · Meta" }, { k: "sms:telnyx", l: "SMS · Telnyx" }, ...(C2.sandbox ? [{ k: "whatsapp:sim", l: E("WhatsApp · de prueba", "WhatsApp · test") }, { k: "sms:sim", l: E("SMS · de prueba", "SMS · test") }] : [])] },
      valor: { k: E("NÚMERO (Y, SI ES DE UN NEGOCIO, SU ID DESPUÉS DE UNA COMA)", "NUMBER (AND, IF IT’S A BUSINESS’S, ITS ID AFTER A COMMA)"), ini: "", max: 120 },
      sub: E("Sin negocio = el número de To'Latino (El Compa de los vecinos). Con negocio = sus respuestas automáticas por ese canal (el dueño las enciende en su panel). WhatsApp de Meta: el phone_number_id. Queda en la auditoría.", "No business = the To'Latino number (El Compa for neighbors). With a business = its auto-replies on that channel (the owner turns them on in their dashboard). Meta WhatsApp: the phone_number_id. It stays in the audit log."),
      plantillas: [E("Número del sandbox para probar.", "Sandbox number for testing."), E("Lo pidió el dueño por Soporte.", "The owner asked through Support.")], hacer: (m, e, v) => compaNumero(e ?? "", v, m) });
    const retirar = (id: string, t: string) => !cambiar ? sinPermiso() : setConf({ titulo: E(`Retirar ${t}`, `Remove ${t}`), peligro: true, cta: E("Retirar", "Remove"), sub: E("Ese número deja de recibir: lo que llegue ahí no se contesta. Queda en la auditoría.", "That number stops receiving: whatever arrives there isn’t answered. It stays in the audit log."),
      plantillas: [E("Ya no se usa.", "No longer used."), E("Lo pidió el dueño.", "The owner asked for it.")], hacer: (m) => compaNumeroRetirar(id, m) });
    const simular = async () => {
      if (sim.busy || !sim.num || !sim.tel.trim() || !sim.txt.trim()) return;
      setSim({ ...sim, busy: true });
      const r = await compaSimular(sim.num, sim.tel, sim.txt).catch(() => ({ ok: false as const, msg: E("No se pudo. Prueba otra vez.", "It didn’t work. Try again.") }));
      setSim((x) => ({ ...x, busy: false, res: r, txt: r.ok ? "" : x.txt }));
      router.refresh();
    };
    B.push(
      { type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
        { k: E("ENTRADAS · 24 H", "INBOUND · 24 H"), v: String(k.entradas24), s: E("con firma buena", "with a valid signature"), bg: "var(--tl-ink)", fg: "var(--tl-white)" },
        { k: E("RECHAZADAS · 24 H", "REJECTED · 24 H"), v: String(k.rechazadas24), s: E("firma, hora o tamaño", "signature, time or size") },
        { k: E("RESPUESTAS · 24 H", "REPLIES · 24 H"), v: String(k.respuestas24), s: E("enviadas o simuladas", "sent or simulated") },
        { k: "STOP · 30 D", v: String(k.bajas30), s: E(`${k.enlaces7} enlaces en 7 d · ${k.usados7} confirmados`, `${k.enlaces7} links in 7 d · ${k.usados7} confirmed`) }] },
      { type: "kv", cols: desk ? 2 : 1, items: [
        { k: "WHATSAPP", v: `${MODO[C2.modo.whatsapp]}${C2.on.whatsapp ? "" : E(" · el interruptor POR CANAL está en pausa", " · the BY CHANNEL switch is paused")}`, fg: C2.modo.whatsapp === "real" ? undefined : "var(--tl-pro-ink)" },
        { k: "SMS", v: `${MODO[C2.modo.sms]}${C2.on.sms ? "" : E(" · el interruptor POR CANAL está en pausa", " · the BY CHANNEL switch is paused")}`, fg: C2.modo.sms === "real" ? undefined : "var(--tl-pro-ink)" }] },
      { type: "note", tone: "ink", icon: "shield", t: E("La firma del proveedor prueba que el mensaje vino de Meta o de Telnyx, no quién lo escribe. Por eso El Compa solo contesta a ese mismo teléfono, solo a una cuenta que lo encendió en Mi cuenta › Avisos, y nunca hace nada por mensaje: manda un enlace de un uso que se confirma en la app después de entrar.", "The provider’s signature proves the message came from Meta or Telnyx, not who wrote it. That’s why El Compa only replies to that same phone, only to an account that turned it on in My account › Notifications, and never does anything by message: it sends a one-time link that’s confirmed in the app after signing in.") },
      { type: "group", k: E("NÚMEROS QUE RECIBEN", "RECEIVING NUMBERS"), ...(cambiar ? { link: E("Conectar un número", "Connect a number"), onLink: numero } : {}) },
      { type: "rows", items: C2.numeros.length ? C2.numeros.map((x) => ({ key: x.id, icon: x.canal === "whatsapp" ? "chat" : "phone", chev: false,
        t: `${x.canal === "whatsapp" ? "WhatsApp" : "SMS"} · ${x.numero}`, s: `${x.negocio ? `${x.negocio.nombre} ${E("(respuestas automáticas)", "(auto-replies)")}` : E("To'Latino (El Compa de los vecinos)", "To'Latino (El Compa for neighbors)")} · ${x.ciudad} · ${x.motivo} · ${cuando(x.at)}`,
        tag: x.proveedor === "sim" ? E("DE PRUEBA", "TEST") : x.proveedor === "telnyx" ? "TELNYX" : "META", tone: x.proveedor === "sim" ? "ink" : "neutral",
        acts: cambiar ? [{ l: E("Retirar", "Remove"), v: "secondary", onClick: () => retirar(x.id, `${x.canal === "whatsapp" ? "WhatsApp" : "SMS"} ${x.numero}`) }] : undefined }))
        : [{ key: "x", icon: "phone", t: E("Ningún número conectado", "No number connected"), s: E("Sin número, nada entra ni sale por WhatsApp o SMS.", "Without a number, nothing comes in or goes out by WhatsApp or SMS."), chev: false }] },
    );
    if (C2.sandbox && cambiar) {
      const SR = sim.res;
      B.push(
        { type: "group", k: E("SIMULADOR DEL SANDBOX", "SANDBOX SIMULATOR") },
        { type: "note", tone: "info", icon: "info", t: E("Manda un mensaje como si fueras un teléfono y mira qué contesta El Compa. Pasa por lo mismo que un mensaje de verdad (STOP, límite, identidad, el turno) y no sale nada. Queda en la auditoría.", "Send a message as if you were a phone and see what El Compa replies. It goes through the same steps as a real message (STOP, limit, identity, the turn) and nothing goes out. It stays in the audit log.") },
        ...(C2.numeros.length ? [{ type: "chips" as const, k: E("A QUÉ NÚMERO", "TO WHICH NUMBER"), items: C2.numeros.map((x) => ({ l: `${x.canal === "whatsapp" ? "WhatsApp" : "SMS"} · ${x.negocio ? x.negocio.nombre : "To'Latino"}`, v: sim.num === x.id ? "selected" : "filter", onClick: () => setSim({ ...sim, num: x.id, res: null }) })) }] : []),
        { type: "field", k: E("DESDE EL TELÉFONO", "FROM PHONE"), val: sim.tel, max: 20, ph: "570 555 0122", onChange: (v: string) => setSim({ ...sim, tel: v.slice(0, 20) }) },
        { type: "field", k: E("EL MENSAJE", "THE MESSAGE"), val: sim.txt, area: true, rows: 2, max: 300, count: `${sim.txt.length}/300`, ph: E("¿Cómo va mi reservación?", "How’s my reservation going?"), onChange: (v: string) => setSim({ ...sim, txt: v.slice(0, 300) }) },
        { type: "acts", items: [{ l: sim.busy ? E("Mandando…", "Sending…") : E("Mandar como ese teléfono", "Send as that phone"), v: "primary", icon: "chat", off: sim.busy || !sim.num || !sim.tel.trim() || !sim.txt.trim(), onClick: () => void simular() }] },
      );
      if (SR && !SR.ok) B.push({ type: "note", tone: "warn", t: SR.msg });
      if (SR && SR.ok) B.push({ type: "thread", items: [
        ...SR.salidas.map((o) => ({ t: o.texto ?? E("(sin texto)", "(no text)"), soft: true, m: `EL COMPA · ${o.tipo.toUpperCase()} · ${SAL[o.estado] ?? o.estado}` })),
        ...(SR.salidas.length ? [] : [{ t: E("No contestó nada.", "It didn’t reply."), soft: true, m: `${E("RESULTADO", "RESULT")} · ${RES_E[SR.resultado]?.[0] ?? SR.resultado}` }])] },
        { type: "kv", cols: desk ? 2 : 1, items: [{ k: E("RESULTADO", "RESULT"), v: RES_E[SR.resultado]?.[0] ?? SR.resultado }, ...(SR.cp ? [{ k: E("CONVERSACIÓN", "CONVERSATION"), v: SR.cp, fg: "var(--tl-action)" }] : [])] });
    }
    B.push({ type: "group", k: E("REGISTRO DE ENTRADA", "INBOUND LOG") });
  } else if (tab === "res" && resumen) {
    // 7i · RESUMEN (secCompa sub «res»): 7 días; las barras van aparte (HBars) entre estos bloques y los de abajo.
    const R = resumen, pct = (n: number, t: number) => (t ? `${Math.round((n / t) * 100)} %` : "—");
    B.push({ type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: E("CONVERSACIONES · 7 D", "CONVERSATIONS · 7 D"), v: String(R.total), s: E(`${R.abiertas} abiertas · ${R.sinIa} sin IA`, `${R.abiertas} open · ${R.sinIa} without AI`), bg: "var(--tl-ink)", fg: "var(--tl-white)", onClick: () => ir({ tab: "conv" }) },
      { k: E("RESOLVIÓ SOLO", "RESOLVED ON ITS OWN"), v: pct(R.solo, R.total), s: E(`${R.solo} sin pasar a nadie`, `${R.solo} without handing off`) },
      { k: E("A UNA PERSONA", "TO A PERSON"), v: String(R.persona + R.dueno), s: E(`${R.conCaso} con caso en Soporte · ${R.dueno} al dueño`, `${R.conCaso} with a Support case · ${R.dueno} to the owner`), onClick: () => ir({ tab: "conv", res: "handed_off" }) },
      { k: E("ACCIONES CONFIRMADAS", "ACTIONS CONFIRMED"), v: String(R.acciones), s: E("la persona dijo que sí", "the person said yes"), onClick: () => ir({ tab: "conv", res: "action_done" }) }] });
  } else if (tab === "neg") {
    // 7f · Respuestas automáticas por negocio (secCompa · Negocios): cifras de 30 días, sin texto ni personas. «Apagar El Compa aquí» está en la
    // ficha del negocio (Negocios 360° › El Compa), con motivo y aviso al dueño.
    B.push({ type: "note", tone: "info", icon: "help", t: E("Cada dueño Pro enciende sus respuestas automáticas en su panel; solo contestan fuera de su horario, con lo que dice su página. Aquí ves dónde están encendidas y dónde las apagó To'Latino.", "Each Pro owner turns on their auto-replies in their dashboard; they only reply outside business hours, with what their page says. Here you see where they’re on and where To'Latino turned them off.") });
  } else {
    B.push(
      // 7e · Cuántas por nivel en 7 días (vecinos, panel del negocio…): tocar uno filtra DÓNDE. (Las cifras completas y el copiloto: Resumen.)
      { type: "kv", cols: desk ? 4 : 2, items: Object.entries(NIVEL).map(([key, v]) => ({ k: `${v[0].toUpperCase()} · 7 D`, v: String(d.conv.porUso[key] ?? 0), fg: (uso ?? "") === key ? "var(--tl-action)" : undefined })) },
      { type: "chips", k: E("DÓNDE", "WHERE"), items: [["", E("Todo", "All")], ...Object.entries(NIVEL).map(([key, v]) => [key, v[0]])].map(([key, l]) => ({ l: l!, v: (uso ?? "") === key ? "selected" : "filter", onClick: () => ir({ uso: key || null }) })) },
      { type: "chips", k: E("RESULTADO", "RESULT"), items: [["", E("Todos", "All")], ...Object.entries(RESULTADO).map(([key, v]) => [key, v[0].charAt(0) + v[0].slice(1).toLowerCase()]), ["flag", E("Marcadas", "Flagged")]].map(([key, l]) => ({ l: l!, v: (res ?? "") === key ? "selected" : "filter", onClick: () => ir({ res: key || null }) })) },
      { type: "chips", k: E("CANAL", "CHANNEL"), items: [["", E("Todos", "All")], ...Object.entries(CANAL).map(([key, v]) => [key, v[0]])].map(([key, l]) => ({ l: l!, v: (canal ?? "") === key ? "selected" : "filter", onClick: () => ir({ canal: key || null }) })) },
      { type: "search", val: q, ph: E("Número CP-…", "CP- number…"), onChange: setQ, onClear: () => { setQ(""); ir({ buscar: null }); }, link: E("Buscar", "Search"), onLink: () => ir({ buscar: q.trim() || null }) },
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <PanelBloques bloques={B} h1={desk ? 26 : 22} />
      {tab === "res" && resumen ? <Resumen R={resumen} desk={desk} leer={leer} ns={ns} ir={ir} setConf={setConf} /> : null}
      {tab === "can" && canales ? (canales.entradas.length
        ? <A.AdminList label={`${canales.entradas.length}${canales.sig ? "+" : ""} ${E("ENTRADAS", "INBOUND")}`} rows={canales.entradas.map((x) => ({ icon: x.canal === "whatsapp" ? "chat" : "phone",
            onClick: x.cp && leer ? () => ir({ tab: "conv", cp: x.cp }) : undefined, chevron: !!(x.cp && leer),
            title: `${x.canal === "whatsapp" ? "WhatsApp" : "SMS"} · ${E("teléfono", "phone")} #${x.tel} · ${x.cuenta ? E("con cuenta", "with account") : E("sin cuenta", "no account")} → ${x.destino}`,
            sub: `${cuando(x.at)} · ${x.proveedor === "sim" ? E("simulador", "simulator") : x.proveedor === "telnyx" ? "Telnyx" : "Meta"}${x.tipo !== "text" ? ` · ${x.tipo.toUpperCase()}` : ""}${x.salida ? ` · ${E("salida", "outbound")}: ${SAL[x.salida] ?? x.salida}` : ""}${x.cp ? ` · ${x.cp}` : ""}${x.estado !== "hecho" ? ` · ${x.estado}` : ""}`,
            tag: RES_E[x.resultado ?? ""]?.[0] ?? (x.estado === "hecho" ? "—" : E("EN CURSO", "IN PROGRESS")), tone: RES_E[x.resultado ?? ""]?.[1] ?? "neutral" }))} />
        : <PanelBloques bloques={[{ type: "empty", icon: "chat", t: E("Todavía no entró nada", "Nothing has come in yet"), s: E("Cuando alguien escriba por WhatsApp o SMS a un número conectado, sale aquí (sin el texto ni el teléfono).", "When someone writes by WhatsApp or SMS to a connected number, it shows here (without the text or the phone).") }]} />) : null}
      {tab === "can" && canales ? <PanelBloques bloques={[
        ...(canales.sig || antes ? [{ type: "acts" as const, items: [...(antes ? [{ l: E("← Desde el principio", "← From the start"), v: "secondary", onClick: () => ir({ antes: null }) }] : []), ...(canales.sig ? [{ l: E("Siguientes →", "Next →"), v: "secondary", onClick: () => ir({ antes: canales.sig }) }] : [])] }] : []),
        { type: "note", tone: "info", t: E("El registro no guarda ni muestra el teléfono ni el texto: una huella corta para ver que es el mismo teléfono, si era una cuenta, qué pasó y la conversación. El texto se vacía a los días de Configuración › El Compa.", "The log doesn’t store or show the phone or the text: a short fingerprint to see it’s the same phone, whether it was an account, what happened and the conversation. The text is cleared after the days set in Settings › El Compa.") },
      ]} /> : null}
      {tab === "neg" ? (negocios.length
        ? <A.AdminList label={`${negocios.length} ${E("NEGOCIOS", "BUSINESSES")}`} rows={negocios.map((x) => ({ icon: x.pausa ? "ban" : "store", chevron: true, onClick: () => router.push(`/admin/negocios/${x.id}?tab=compa`),
            title: `${x.nombre} · ${x.ciudad}`, sub: E(`30 días: ${x.contesto30} respuestas · ${x.paso30} pasadas al negocio${x.reportes ? ` · ${x.reportes} reportes` : ""}${x.pausa ? ` · apagadas por To'Latino: ${x.pausa.motivo}` : ""}`, `30 days: ${x.contesto30} replies · ${x.paso30} passed to the business${x.reportes ? ` · ${x.reportes} reports` : ""}${x.pausa ? ` · turned off by To'Latino: ${x.pausa.motivo}` : ""}`),
            tag: x.pausa ? E("APAGADAS POR TO'LATINO", "OFF BY TO'LATINO") : !x.pro ? E("SIN PRO", "NO PRO") : x.enabled ? E("ENCENDIDAS", "ON") : E("APAGADAS", "OFF"), tone: x.pausa ? "danger" : x.enabled && x.pro ? "signal" : "neutral" }))} />
        : <PanelBloques bloques={[{ type: "empty", icon: "store", t: E("Ningún negocio tiene respuestas automáticas", "No business has auto-replies"), s: E("Cuando un dueño Pro las encienda en su panel, sale aquí.", "When a Pro owner turns them on in their dashboard, it shows here.") }]} />) : null}
      {tab === "conv" ? (d.conv.filas.length
        ? <A.AdminList label={`${d.conv.filas.length}${d.conv.sig ? "+" : ""} ${E("CONVERSACIONES", "CONVERSATIONS")}`} rows={d.conv.filas.map((x) => ({ icon: x.ai ? "chat" : "lock",
            onClick: () => ir({ cp: x.num }), chevron: leer,
            title: `${x.num} · ${NIVEL[x.uso]?.[0] ?? x.uso}`, sub: `${SUP[x.superficie] ?? x.superficie} · ${CANAL[x.canal]?.[0] ?? x.canal} · ${x.turnos} ${x.turnos === 1 ? E("mensaje", "message") : E("mensajes", "messages")} · ${x.ciudad} · ${cuando(x.at)}${x.motivo ? ` · ${E("motivo", "reason")}: ${MOTIVO[x.motivo] ?? x.motivo}` : ""}${x.ai ? "" : E(" · contestó sin IA (reglas fijas)", " · replied without AI (fixed rules)")}`,
            tag: RESULTADO[x.resultado]?.[0] ?? x.resultado, tone: RESULTADO[x.resultado]?.[1] ?? "neutral" }))} />
        : <PanelBloques bloques={[{ type: "empty", icon: "chat", t: E("Todavía no hay conversaciones", "No conversations yet"), s: uso || res || canal || buscar ? E("Nada con ese filtro: quita uno.", "Nothing with that filter: remove one.") : E("Cuando los vecinos o los negocios le escriban al Compa, salen aquí.", "When neighbors or businesses write to El Compa, they show here.") }]} />) : null}
      {tab === "conv" ? <PanelBloques bloques={[
        ...(d.conv.sig || antes ? [{ type: "acts" as const, items: [...(antes ? [{ l: E("← Desde el principio", "← From the start"), v: "secondary", onClick: () => ir({ antes: null }) }] : []), ...(d.conv.sig ? [{ l: E("Siguientes →", "Next →"), v: "secondary", onClick: () => ir({ antes: d.conv.sig }) }] : [])] }] : []),
        { type: "note", tone: "info", t: leer ? E("La lista no muestra lo que se habló. Al abrir una conversación ves el hilo (tapado como se guardó) y tu lectura queda anotada.", "The list doesn’t show what was said. Opening a conversation shows the thread (masked as it was stored) and your read is logged.")
          : E("Tu rol ve las cifras, sin el texto. El hilo lo leen Admin y Soporte, y cada lectura queda anotada.", "Your role sees the numbers, without the text. Admin and Support read the thread, and every read is logged.") },
      ]} /> : null}
      <Toast t={toast} desk={desk} />
    </div>
  );
}

/* 7i · RESUMEN: las barras (HBars, como el diseño: POR QUÉ PASÓ A UNA PERSONA · DÓNDE CONTESTA · POR DÓNDE ESCRIBEN), COPILOTO EN SOPORTE, MARCADAS
   POR EL EQUIPO, PERSONAS DEL EQUIPO y «LO QUE EL COMPA NO SUPO · PARA EL CENTRO DE AYUDA» (hueco #7: solo la lista; «Anotado» con motivo o
   «Corregido en {artículo}»; el texto de la ayuda se corrige en el repo). La pregunta (tapada, sin la persona) la ve solo quien lee hilos. */
const NO_SUPO_CANAL = (E: EF): Record<string, string> => ({ app: E("Chat de To'Latino", "To'Latino chat"), whatsapp: "WhatsApp", sms: "SMS" });
function Resumen({ R, desk, leer, ns, ir, setConf }: { R: ResumenCompa; desk: boolean; leer: boolean; ns: string; ir: (p: { tab?: string; res?: string | null; cp?: string | null; ns?: string | null }) => void;
  setConf: (c: Confirmar) => void }) {
  const E = useE(), en = E("", "x") === "x", cuando = (iso: string | null) => cuandoL(iso, en), { NIVEL, POR_QUE, NO_SUPO_E } = mapas(E), NSC = NO_SUPO_CANAL(E);
  const barras = (o: Record<string, number>, L: (k: string) => string, color: (k: string) => string) => {
    const e = Object.entries(o).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]), mx = Math.max(1, ...e.map(([, n]) => n));
    return e.map(([k, n]) => ({ label: L(k), width: `${Math.max(2, Math.round((n / mx) * 100))}%`, color: color(k), value: String(n) }));
  };
  const motivo = barras(R.porMotivo, (k) => POR_QUE[k] ?? k, (k) => (k === "unknown" ? "var(--tl-pro)" : "var(--tl-ink)"));
  const donde = barras(R.porUso, (k) => NIVEL[k]?.[0] ?? k, () => "var(--tl-action)");
  const canal = barras(R.porCanal, (k) => NSC[k] ?? k, () => "var(--tl-ink)");
  const c = R.copiloto, pctB = (n: number) => (c.borradores ? `${Math.round((n / c.borradores) * 100)} %` : "—");
  const h = R.horario, hora = (x: number) => (x === 0 || x === 24 ? "12 AM" : x === 12 ? "12 PM" : x < 12 ? `${x} AM` : `${x - 12} PM`);
  const dias = h.dias >= 7 ? E("todos los días", "every day") : h.dias === 6 ? E("lun–sáb", "Mon–Sat") : E("lun–vie", "Mon–Fri");
  const anotar = (id: string) => setConf({ titulo: E("Anotado", "Noted"), cta: E("Anotar", "Note"), sub: E("Queda como pendiente para corregir la ayuda en el repo. Sale de «Abiertas». Queda en el historial de la conversación.", "It stays pending to fix the help in the repo. It leaves “Open”. It stays in the conversation’s history."),
    plantillas: [E("Falta en la ayuda: se agrega en el próximo despliegue.", "Missing from the help: it’s added in the next deploy."), E("Pide datos de otra persona: El Compa hizo bien en no saber.", "Asks for someone else’s data: El Compa was right not to know."), E("Fuera de tema.", "Off topic.")], hacer: (m) => compaNoSupo(id, "noted", m, "") });
  const corregido = (id: string) => setConf({ titulo: E("Corregido en un artículo", "Fixed in an article"), cta: E("Guardar", "Save"), elegir: { label: E("ARTÍCULO DEL CENTRO DE AYUDA", "HELP CENTER ARTICLE"), items: R.articulos.map((a) => ({ k: a.slug, l: a.titulo })) },
    sub: E("El artículo ya dice lo que faltaba (se corrigió en el repo y se desplegó). Queda en el historial de la conversación.", "The article now says what was missing (fixed in the repo and deployed). It stays in the conversation’s history."), plantillas: [E("Se agregó a la ayuda.", "It was added to the help."), E("Se corrigió el dato en la ayuda.", "The information was fixed in the help.")],
    hacer: (m, e) => compaNoSupo(id, "fixed", m, e ?? "") });
  const B2: Bloque[] = [
    { type: "kv", cols: desk ? 3 : 1, items: [
      { k: E("COPILOTO EN SOPORTE", "COPILOT IN SUPPORT"), v: `${c.borradores} ${c.borradores === 1 ? E("borrador", "draft") : E("borradores", "drafts")} · 30 d` },
      { k: E("MARCADAS POR EL EQUIPO", "FLAGGED BY THE TEAM"), v: `${R.marcadas}${R.marcadas7 ? E(` · ${R.marcadas7} esta semana`, ` · ${R.marcadas7} this week`) : ""}`, fg: R.marcadas ? "var(--tl-danger)" : undefined },
      { k: E("PERSONAS DEL EQUIPO", "TEAM MEMBERS"), v: `${dias} ${hora(h.desde)}–${hora(h.hasta)}` }] },
    { type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: E("COPILOTO EN SOPORTE · 30 D", "COPILOT IN SUPPORT · 30 D"), v: `${c.borradores} ${c.borradores === 1 ? E("borrador", "draft") : E("borradores", "drafts")}`, s: E(`${c.casos} en casos · ${c.ayudas} en ayudas escaladas`, `${c.casos} in cases · ${c.ayudas} in escalated help`) },
      { k: E("ENVIADOS TAL CUAL", "SENT AS IS"), v: pctB(c.tal), s: E(`${c.tal} de ${c.borradores}`, `${c.tal} of ${c.borradores}`) }, { k: E("EDITADOS", "EDITED"), v: pctB(c.editados), s: E(`${c.tal + c.editados} enviados en total`, `${c.tal + c.editados} sent in total`) },
      { k: E("DESCARTADOS", "DISCARDED"), v: pctB(c.descartados), s: E(`${c.abiertos} sin usar todavía · ${c.sinIA} sin IA (reglas)`, `${c.abiertos} not used yet · ${c.sinIA} without AI (rules)`) }] },
    ...(R.marcadas ? [{ type: "note" as const, tone: "danger" as const, icon: "warning", t: E(`${R.marcadas} ${R.marcadas === 1 ? "conversación marcada" : "conversaciones marcadas"} como respuesta incorrecta.`, `${R.marcadas} ${R.marcadas === 1 ? "conversation" : "conversations"} flagged as a wrong answer.`), cta: E("Ver", "View"), onCta: () => ir({ tab: "conv", res: "flag" }) }] : []),
    { type: "group", k: E("LO QUE EL COMPA NO SUPO · PARA EL CENTRO DE AYUDA", "WHAT EL COMPA DIDN’T KNOW · FOR THE HELP CENTER") },
    { type: "chips", items: (["open", "noted", "fixed"] as const).map((k) => ({ l: `${NO_SUPO_E[k]}${k === "open" ? ` · ${R.noSupoAbiertos}` : ""}`, v: ns === k ? "selected" : "filter", onClick: () => ir({ tab: "res", ns: k }) })) },
    { type: "rows", items: R.noSupo.length ? R.noSupo.map((x) => ({ key: x.id, icon: x.estado === "fixed" ? "check" : "help", chev: false,
      t: x.q ? `«${x.q}»` : E(`Pregunta de ${x.audiencia === "negocio" ? "un negocio" : "un vecino"}`, `Question from ${x.audiencia === "negocio" ? "a business" : "a neighbor"}`),
      s: `${x.audiencia === "negocio" ? E("Ayuda de negocios", "Business help") : E("Ayuda de vecinos", "Neighbor help")} · ${x.lang === "en" ? E("inglés", "English") : E("español", "Spanish")} · ${x.ciudad} · ${x.num} · ${cuando(x.at)}${x.estado !== "open" ? ` · ${x.estado === "fixed" ? `${E("Corregido en", "Fixed in")} ${x.titulo ?? x.slug}` : E("Anotado", "Noted")}${x.quien ? ` ${E("por", "by")} ${x.quien}` : ""}${x.nota ? `: ${x.nota}` : ""}` : ""}`,
      tag: x.estado === "fixed" ? E("CORREGIDO", "FIXED") : x.estado === "noted" ? E("ANOTADO", "NOTED") : null, tone: x.estado === "fixed" ? "signal" : "action",
      acts: leer ? [...(x.estado === "open" ? [{ l: E("Anotado", "Noted"), v: "secondary", onClick: () => anotar(x.id) }] : []), ...(x.estado !== "fixed" ? [{ l: E("Corregido en…", "Fixed in…"), v: "secondary", onClick: () => corregido(x.id) }] : []),
        { l: E("Ver conversación", "View conversation"), v: "secondary", onClick: () => ir({ tab: "conv", cp: x.num }) }] : undefined }))
      : [{ key: "x", icon: "help", t: ns === "open" ? E("El Compa supo contestar todo", "El Compa knew how to answer everything") : E(`Nada ${ns === "noted" ? "anotado" : "corregido"} todavía`, `Nothing ${ns === "noted" ? "noted" : "fixed"} yet`), s: E("Cuando conteste «No tengo ese dato», la pregunta (tapada, sin la persona) sale aquí para mejorar la ayuda.", "When it answers “I don’t have that information”, the question (masked, without the person) shows here to improve the help."), chev: false }] },
    { type: "note", tone: "info", icon: "lock", t: leer ? E("Solo la pregunta, tapada y sin la persona. El artículo se corrige en el repo (se despliega con la app); aquí queda anotado.", "Only the question, masked and without the person. The article is fixed in the repo (deployed with the app); it’s noted here.") : E("Tu rol ve las cifras. La pregunta la leen Admin y Soporte.", "Your role sees the numbers. Admin and Support read the question.") },
  ];
  return (
    <>
      {motivo.length ? <A.HBars label={E("POR QUÉ PASÓ A UNA PERSONA · 7 D", "WHY IT WENT TO A PERSON · 7 D")} items={motivo} /> : null}
      {donde.length ? <A.HBars label={E("DÓNDE CONTESTA · 7 D", "WHERE IT ANSWERS · 7 D")} items={donde} /> : null}
      {canal.length ? <A.HBars label={E("POR DÓNDE ESCRIBEN · 7 D", "WHERE PEOPLE WRITE FROM · 7 D")} items={canal} /> : null}
      <PanelBloques bloques={B2} h1={desk ? 26 : 22} />
    </>
  );
}
