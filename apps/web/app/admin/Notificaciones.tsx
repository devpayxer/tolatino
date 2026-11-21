"use client";
/* ADM-NOTIF · Notificaciones (Super Admin.dc.html secNotif): cifras de hoy, Plantillas por grupo (editar ES/EN con motivo,
   probar en mi teléfono), Envíos (cada aviso con su estado de SMS, toca para ver a la persona) y Reglas. «Anuncios in-app»
   del diseño queda para cuando exista el banner del home (LAUNCH-CHECKLIST). */
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { DatosNotif, GrupoNotif, Plantilla } from "@/lib/admin-notif";

const DE_COMUNIDAD = /^(com|gam|dm|mod|apel)_/, DE_EVENTOS = /^(evt|bol|rsvp|espera|puerta|evp)_/, DE_SOPORTE = /^(sop|compa)_/;
import { plantillaEditar, plantillaProbar, plantillaPush } from "./acciones-notif";
import { ConfirmarMotivo, Toast, useAncho, useToast, type Confirmar } from "./Colas";
import type { ResAdm } from "./acciones-colas";
import { useE } from "./idioma-admin";

type EF = (es: string, en: string) => string;
const G = (E: EF): Record<GrupoNotif, string> => ({ crit: E("CRÍTICO · SIEMPRE LLEGA", "CRITICAL · ALWAYS DELIVERED"), tx: E("PEDIDOS, RESERVACIONES Y SOLICITUDES", "ORDERS, RESERVATIONS AND REQUESTS"), support: E("SOPORTE · LO DEL CASO SIEMPRE LLEGA", "SUPPORT · CASE UPDATES ALWAYS DELIVERED"), events: E("EVENTOS · LO QUE NO ES CRÍTICO SE APAGA", "EVENTS · NON-CRITICAL CAN BE TURNED OFF"), community: E("COMUNIDAD · SE APAGA O VA EN EL RESUMEN DIARIO", "COMMUNITY · CAN BE TURNED OFF OR GO IN THE DAILY DIGEST"), mod: E("MODERACIÓN", "MODERATION"), biz: E("AL NEGOCIO", "TO THE BUSINESS"), mkt: E("CRECIMIENTO · RESPETA AVISOS Y SILENCIO", "GROWTH · RESPECTS NOTIFICATION SETTINGS AND QUIET HOURS") });
const SMS = (E: EF): Record<string, [string, string]> => ({ respaldo: [E("SMS DE RESPALDO", "BACKUP SMS"), "neutral"], ahorrado: [E("SMS AHORRADO", "SMS SAVED"), "signal"], no: [E("SOLO BANDEJA", "INBOX ONLY"), "neutral"], pruebas: [E("SMS EN PRUEBAS", "SMS IN TEST MODE"), "action"], pendiente: [E("SMS PENDIENTE", "SMS PENDING"), "neutral"], enviado: [E("SMS ENVIADO", "SMS SENT"), "signal"], fallo: [E("SMS FALLÓ", "SMS FAILED"), "danger"], silencio: [E("HORAS DE SILENCIO", "QUIET HOURS"), "neutral"], apagado: [E("SMS APAGADO", "SMS OFF"), "neutral"], sin_proveedor: [E("SIN PROVEEDOR", "NO PROVIDER"), "danger"], baja: [E("PIDIÓ STOP", "SENT STOP"), "neutral"] });
const PREF = (E: EF): Record<string, string> => ({ ord: E("Pedidos", "Orders"), cit: E("Citas y reservas", "Bookings and reservations"), emp: E("Empleos", "Jobs"), hoy: E("Lo que traen hoy", "What’s in today"), com: E("Respuestas y votos", "Replies and votes"), msg: E("Mensajes de vecinos", "Messages from neighbors"), evt: E("Boletos y cambios", "Tickets and changes"), evtR: E("Recordatorios", "Reminders"), evtG: E("Eventos que guardas", "Events you save") });
const cuando = (iso: string, en = false) => new Intl.DateTimeFormat(en ? "en-US" : "es-US", { timeZone: "America/New_York", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso)).replace(/\./g, "");

const MAIL = (E: EF): Record<string, [string, string]> => ({ pruebas: [E("EN MODO PRUEBAS", "IN TEST MODE"), "action"], pendiente: [E("PENDIENTE", "PENDING"), "neutral"], enviado: [E("ENVIADO", "SENT"), "signal"], fallo: [E("FALLÓ", "FAILED"), "danger"], sin_proveedor: [E("SIN PROVEEDOR", "NO PROVIDER"), "danger"] });
const MAIL_TPL = (E: EF): Record<string, string> => ({ verify: E("Confirma tu correo", "Confirm your email"), receipt_order: E("Recibo de pedido", "Order receipt"), receipt_table: E("Mesa confirmada", "Table confirmed"), receipt_pro: E("Recibo de Pro", "Pro receipt"), receipt_tickets: E("Recibo de boletos", "Ticket receipt"), report: E("Reporte programado", "Scheduled report"), founder_daily: E("Reporte diario", "Daily report"), campaign: E("Campaña", "Campaign"), support_reply: E("Respuesta de Soporte", "Support reply"), support_ack: E("Soporte: recibimos tu correo", "Support: we got your email") });
// 8c · Push: el estado de cada aviso y qué app lo abre.
const PUSH = (E: EF): Record<string, [string, string]> => ({ pendiente: [E("PUSH EN COLA", "PUSH QUEUED"), "neutral"], enviado: [E("PUSH ENTREGADO", "PUSH DELIVERED"), "signal"], pruebas: [E("PUSH EN PRUEBAS", "PUSH IN TEST MODE"), "action"], fallo: [E("PUSH FALLÓ", "PUSH FAILED"), "danger"], silencio: [E("PUSH · SILENCIO", "PUSH · QUIET HOURS"), "neutral"], apagado: [E("PUSH APAGADO", "PUSH OFF"), "neutral"] });
const APP = (E: EF): Record<string, string> => ({ cliente: "TO'LATINO", negocio: E("NEGOCIOS", "BUSINESS"), delivery: E("REPARTIDOR", "DRIVER"), checkin: E("PUERTA", "DOOR") });
const SMS_MODO = (E: EF): Record<string, string> => ({ siempre: E("SMS SIEMPRE", "SMS ALWAYS"), sin_push: E("SMS SI NO HAY PUSH", "SMS IF NO PUSH"), nunca: "" });
export function Notificaciones({ d, tab, puede, com = false, evt = false, sop = false }: { d: DatosNotif; tab: "tpl" | "log" | "rules" | "mail" | "push"; puede: boolean; com?: boolean; evt?: boolean; sop?: boolean }) {
  const router = useRouter(), w = useAncho(), desk = w >= 1024, E = useE(), en = E("", "x") === "x";
  const tx = (x: { es: string; en?: string | null }) => (en ? x.en || x.es : x.es), ct = (iso: string) => cuando(iso, en);
  const gG = G(E), sms = SMS(E), pref = PREF(E), mail = MAIL(E), mailTpl = MAIL_TPL(E), push = PUSH(E), app = APP(E), smsModo = SMS_MODO(E);
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast(), [pend, start] = useTransition();
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? E("Listo. Quedó en la auditoría.", "Done. It’s in the audit log.")); setConf(null); router.refresh(); };
  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <PanelBloques bloques={[{ type: "head", eye: E("NOTIFICACIONES", "NOTIFICATIONS"), t: E("Editar plantilla", "Edit template"), onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>
  );
  const editar = (p: Plantilla, lang: "es" | "en") => setConf({
    titulo: `${tx(p.title)} · ${lang === "es" ? E("español", "Spanish") : E("inglés", "English")}`, cta: E("Guardar", "Save"),
    sub: `${E("Variables entre llaves, solo las que ya usa", "Variables in braces, only the ones it already uses")}: ${[...new Set((p.body.es + p.body.en).match(/\{\w+\}/g) ?? [])].join(" ") || E("ninguna", "none")}. ${p.sms ? E("Máximo 160 caracteres: también sale como SMS.", "Up to 160 characters: it also goes out as SMS.") : E("Máximo 300 caracteres.", "Up to 300 characters.")} ${E("El motivo queda en la auditoría.", "The reason stays in the audit log.")}`,
    valor: { k: lang === "es" ? E("TEXTO EN ESPAÑOL", "TEXT IN SPANISH") : E("TEXTO EN INGLÉS", "TEXT IN ENGLISH"), ini: p.body[lang], area: true, max: p.sms ? 160 : 300 },
    nota: "interna", hacer: (m, _e, v) => plantillaEditar(p.key, lang, v, m),
  });
  // 8c · El push de una plantilla: encender/apagar, texto genérico y la app que lo abre (con motivo y auditoría).
  const cambiarPush = (p: Plantilla, campo: "push" | "priv" | "app") => setConf(campo === "app" ? {
    titulo: `${tx(p.title)} · ${E("qué app lo abre", "which app opens it")}`, cta: E("Guardar", "Save"), sub: E(`Ahora: ${app[p.app]}. Al tocar el push se abre esa app (si no la tiene, To'Latino; en la web, el navegador).`, `Now: ${app[p.app]}. Tapping the push opens that app (if they don’t have it, To'Latino; on the web, the browser).`),
    elegir: { label: "APP", items: Object.entries(app).map(([k, l]) => ({ k, l })) }, nota: "interna", hacer: (m, e) => plantillaPush(p.key, "app", e ?? "", m),
  } : {
    titulo: `${tx(p.title)} · ${campo === "push" ? (p.push ? E("apagar el push", "turn push off") : E("encender el push", "turn push on")) : p.priv ? E("mostrar el texto en el push", "show the text in the push") : E("texto genérico en el push", "generic text in the push")}`, cta: E("Guardar", "Save"), peligro: campo === "push" && p.push,
    sub: campo === "push" ? (p.push ? E("Deja de ir por push; queda en la campana y, si la plantilla lleva SMS, sale el SMS.", "It stops going by push; it stays in the bell and, if the template has SMS, the SMS goes out.") : E("Vuelve a ir por push a los teléfonos con avisos.", "It goes by push again to phones with notifications on."))
      : p.priv ? E("Apple y Google verán el título y el texto del aviso.", "Apple and Google will see the notification’s title and text.") : E("Por Apple y Google solo pasa «Tienes un aviso nuevo en To'Latino.»; el detalle se lee al abrirlo.", "Only “You have a new notification on To'Latino.” goes through Apple and Google; the details are read when it’s opened."),
    nota: "interna", hacer: (m) => plantillaPush(p.key, campo, campo === "push" ? (p.push ? "no" : "si") : p.priv ? "no" : "si", m),
  });
  const probar = (p: Plantilla) => start(async () => { const r = await plantillaProbar(p.key); setToast(r.mensaje ?? E("Enviada.", "Sent.")); router.refresh(); });
  const ir = (t: string, antes?: string) => { const q = t === "tpl" && !antes ? "" : `tab=${t}${antes ? `&antes=${antes}` : ""}`; router.push(q ? `/admin/notificaciones?${q}` : "/admin/notificaciones"); };
  const k = d.kpi;
  const B: Bloque[] = [
    { type: "head", eye: E("DINERO Y CRECIMIENTO", "MONEY AND GROWTH"), t: E("Notificaciones", "Notifications"), s: E("Plantillas por evento (ES/EN), los envíos y la regla: lo crítico siempre llega; lo demás respeta los avisos de cada persona y las horas de silencio.", "Templates per event (ES/EN), sends and the rule: critical always arrives; the rest respects each person’s notification settings and quiet hours."), h1: desk ? 26 : 22 },
    { type: "kpis", cols: desk ? "repeat(5,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: E("AVISOS · 24 H", "NOTIFICATIONS · 24 H"), v: String(k.hoy), s: E(`${k.leidos} ya leídos en la app`, `${k.leidos} already read in the app`), bg: "var(--tl-ink)", fg: "var(--tl-white)", onClick: () => ir("log") },
      { k: E("SMS ENVIADOS · 24 H", "SMS SENT · 24 H"), v: String(k.sms), s: k.pruebas ? E(`${k.pruebas} en modo pruebas (no salen)`, `${k.pruebas} in test mode (not sent)`) : E("por el proveedor", "through the provider") },
      { k: E("SMS FRENADOS · 24 H", "SMS HELD BACK · 24 H"), v: String(k.frenados), s: E("por sus avisos o las horas de silencio", "by their settings or quiet hours") },
      { k: E("SMS CON PROBLEMA · 24 H", "SMS WITH ISSUES · 24 H"), v: String(k.fallos), s: k.fallos ? E("fallaron o no hay proveedor", "failed or no provider") : E("ninguno", "none"), sFg: k.fallos ? "var(--tl-danger)" : undefined },
      { k: E("PUSH ENTREGADOS · 24 H", "PUSH DELIVERED · 24 H"), v: String(k.push), s: k.ahorrados ? E(`${k.ahorrados} SMS ahorrados`, `${k.ahorrados} SMS saved`) : E("push primero, SMS de respaldo", "push first, SMS as backup"), onClick: () => ir("push") },
    ] },
    { type: "tabs", items: ([["tpl", E("Plantillas", "Templates"), String(d.plantillas.length)], ["log", E("Envíos", "Sends")], ["push", "Push"], ["canales", E("SMS y WhatsApp", "SMS and WhatsApp")], ["wa", E("Plantillas de WhatsApp", "WhatsApp templates")], ["mail", E("Correos", "Emails"), d.kmail.hoy ? String(d.kmail.hoy) : undefined], ["rules", E("Reglas", "Rules")]] as const).map(([t, l, n]) => ({ l, n, on: tab === t, onClick: () => ir(t) })) },
  ];
  // 5i · «Solo Comunidad»: com_*, gam_*, dm_*, mod_*, apel_* (todas sin SMS; guardián avisoComunidadSinSms) y el resumen diario.
  // 6j · «Solo Eventos»: evt_*, bol_*, rsvp_*, espera_*, puerta_*, evp_* (SMS solo lo crítico; guardián avisoEventoSmsSoloCritico).
  // 7i · «Solo Soporte y El Compa»: sop_*, compa_* (grupo support sin interruptor; al equipo y al negocio en Moderación y Al negocio).
  if (tab === "tpl") B.push({ type: "chips", items: [{ l: E("Todas", "All"), v: com || evt || sop ? "filter" : "selected", onClick: () => router.push("/admin/notificaciones") },
    { l: `${E("Solo Comunidad", "Community only")} · ${d.plantillas.filter((p) => DE_COMUNIDAD.test(p.key)).length}`, v: com ? "selected" : "filter", onClick: () => router.push("/admin/notificaciones?com=1") },
    { l: `${E("Solo Eventos", "Events only")} · ${d.plantillas.filter((p) => DE_EVENTOS.test(p.key)).length}`, v: evt ? "selected" : "filter", onClick: () => router.push("/admin/notificaciones?evt=1") },
    { l: `${E("Solo Soporte y El Compa", "Support and El Compa only")} · ${d.plantillas.filter((p) => DE_SOPORTE.test(p.key)).length}`, v: sop ? "selected" : "filter", onClick: () => router.push("/admin/notificaciones?sop=1") }] });
  if (tab === "tpl" && sop) B.push({ type: "note", tone: "info", icon: "help", t: E("Soporte y El Compa: lo del caso (lo recibimos, te respondieron, quedó resuelto, El Compa te pasó con una persona y el caso del negocio) va en el grupo Soporte y siempre llega: en Mi cuenta › Avisos no tiene interruptor. Lo del tope de El Compa y del plazo de un caso va al equipo; lo de las respuestas automáticas, al negocio. Sin SMS.", "Support and El Compa: case updates (we got it, they replied, it’s resolved, El Compa handed you to a person, and the business case) go in the Support group and always arrive: in My account › Notifications there’s no switch. El Compa’s cap and a case’s deadline go to the team; automatic replies go to the business. No SMS.") });
  if (tab === "tpl" && evt) B.push({ type: "note", tone: "info", icon: "ticket", t: E("Eventos: solo lo crítico lleva SMS (cancelación, cambio de fecha u hora, el boleto que te mandan, una cortesía, el lugar de la lista de espera, la invitación a la puerta y la propuesta y la confirmación de un evento privado). En Mi cuenta › Avisos › Eventos la persona apaga «Boletos y cambios», «Recordatorios» y «Eventos que guardas»; lo que no tiene interruptor llega siempre.", "Events: only critical ones carry SMS (cancellation, date or time change, a ticket sent to you, a comp ticket, a waitlist spot, the door invitation, and a private event’s proposal and confirmation). In My account › Notifications › Events the person turns off “Tickets and changes”, “Reminders” and “Events you save”; anything without a switch always arrives.") });
  if (tab === "tpl" && com) B.push({ type: "note", tone: "info", icon: "bell", t: E("Los avisos de la Comunidad van sin SMS: solo la campana. En Mi cuenta › Avisos la persona apaga «Respuestas y votos» o «Mensajes de vecinos», o pide «Un resumen al día»: lo del grupo Comunidad se guarda y le llega uno a la hora de Sistema › Configuración. Lo de alguien bloqueado no se cuenta.", "Community notifications go without SMS: just the bell. In My account › Notifications the person turns off “Replies and votes” or “Messages from neighbors”, or asks for “One digest a day”: Community items are saved and one arrives at the time set in System › Settings. Anything from a blocked person isn’t counted.") });
  if (tab === "tpl") for (const g of Object.keys(gG) as GrupoNotif[]) {
    const L = d.plantillas.filter((p) => p.grp === g && (!com || DE_COMUNIDAD.test(p.key)) && (!evt || DE_EVENTOS.test(p.key)) && (!sop || DE_SOPORTE.test(p.key)));
    if (!L.length) continue;
    B.push({ type: "group", k: gG[g] }, { type: "rows", cols: desk ? "repeat(auto-fill,minmax(380px,1fr))" : undefined, items: L.map((p) => ({
      key: p.key, icon: p.sms ? "phone" : "bell", t: tx(p.title), s: tx(p.body),
      m: [`${E("BANDEJA", "INBOX")}${p.push ? ` · PUSH${p.priv ? E(" GENÉRICO", " GENERIC") : ""} → ${app[p.app]}` : ""}`, smsModo[p.sms_mode] || null, p.pref ? `${E("SE APAGA EN", "TURNED OFF IN")} ${pref[p.pref]?.toUpperCase() ?? p.pref}` : null, E(`${p.n7} EN 7 D`, `${p.n7} IN 7 D`), p.editada ? E("EDITADA", "EDITED") : null].filter(Boolean).join(" · "),
      acts: puede ? [{ l: E("Editar español", "Edit Spanish"), icon: "edit", onClick: () => editar(p, "es") }, { l: E("Editar inglés", "Edit English"), icon: "edit", onClick: () => editar(p, "en") },
        { l: p.push ? E("Apagar push", "Turn push off") : E("Encender push", "Turn push on"), icon: "bell", onClick: () => cambiarPush(p, "push") },
        ...(p.fija ? [] : [{ l: p.priv ? E("Mostrar texto en el push", "Show text in the push") : E("Texto genérico", "Generic text"), icon: "lock", onClick: () => cambiarPush(p, "priv") }]),
        { l: E("Abre en…", "Opens in…"), icon: "phone", onClick: () => cambiarPush(p, "app") },
        { l: E("Probar en mi teléfono", "Test on my phone"), icon: "phone", off: pend, onClick: () => probar(p) }] : undefined,
    })) });
  }
  if (tab === "log") {
    if (!d.envios.length) B.push({ type: "empty", icon: "bell", t: E("Todavía no sale ningún aviso", "No notifications sent yet"), s: E("Aparecen aquí cuando un negocio acepta un pedido, confirma una mesa o responde una solicitud.", "They show here when a business accepts an order, confirms a table or answers a request.") });
    else B.push({ type: "rows", items: d.envios.map((x) => ({
      key: x.id, icon: x.sms === "no" ? "bell" : "phone", t: `${x.title} · ${x.quien}`, s: x.body, m: `${ct(x.at)}${push[x.push] ? ` · ${push[x.push]![0]}` : ""}${x.abierto ? E(" · ABIERTO DESDE EL PUSH", " · OPENED FROM PUSH") : x.leido ? E(" · LEÍDO", " · READ") : ""}`,
      tag: sms[x.sms]?.[0] ?? x.sms, tone: sms[x.sms]?.[1] ?? "neutral", chev: true, onClick: () => router.push(`/admin/usuarios/${x.uid}`),
    })) });
  }
  if (tab === "mail") {
    const m = d.kmail;
    B.push({ type: "note", tone: "info", icon: "info", t: E(`Correo con plantillas propias, enviado por Amazon SES. 24 h: ${m.hoy} correos · ${m.enviados} enviados${m.pruebas ? ` · ${m.pruebas} en modo pruebas (no salen)` : ""}${m.problemas ? ` · ${m.problemas} con problema` : ""}. Solo a correos confirmados y si la persona tiene «Recibos» encendido.`, `Email with our own templates, sent through Amazon SES. 24 h: ${m.hoy} emails · ${m.enviados} sent${m.pruebas ? ` · ${m.pruebas} in test mode (not sent)` : ""}${m.problemas ? ` · ${m.problemas} with issues` : ""}. Only to confirmed emails and if the person has “Receipts” on.`) });
    if (!d.correos.length) B.push({ type: "empty", icon: "info", t: E("Todavía no sale ningún correo", "No emails sent yet"), s: E("Aparecen aquí cuando alguien confirma su correo, termina un pedido, le confirman una mesa o se cobra Pro.", "They show here when someone confirms their email, completes an order, gets a table confirmed or is charged for Pro.") });
    else B.push({ type: "rows", items: d.correos.map((x) => ({
      key: x.id, icon: "info", t: x.subject, s: `${mailTpl[x.tpl] ?? x.tpl} · ${x.quien ?? "—"} · ${x.to}${x.error ? ` · ${x.error}` : ""}`, m: ct(x.at),
      tag: mail[x.status]?.[0] ?? x.status, tone: mail[x.status]?.[1] ?? "neutral", chev: true, onClick: () => router.push(`/admin/notificaciones/correo/${x.id}`),
    })) });
  }
  // 8c · Notificaciones › Push: por plantilla y por app y plataforma, 7 días. Sin personas.
  if (tab === "push" && d.push) {
    const x = d.push;
    B.push({ type: "note", tone: "info", icon: "bell", t: E(`Push primero, SMS de respaldo. 24 h: ${x.dia.enviados} avisos llegaron por push · ${x.dia.abiertos} se abrieron desde el push · ${x.dia.ahorrados} SMS ahorrados · ${x.dia.respaldo} salieron por SMS porque el push no llegó · ${x.dia.sin_app} sin teléfono con avisos. Los canales, la cola y los errores: Sistema › Integraciones › Push.`, `Push first, SMS as backup. 24 h: ${x.dia.enviados} notifications arrived by push · ${x.dia.abiertos} were opened from the push · ${x.dia.ahorrados} SMS saved · ${x.dia.respaldo} went out by SMS because the push didn’t arrive · ${x.dia.sin_app} with no phone with notifications on. Channels, queue and errors: System › Integrations › Push.`) });
    B.push({ type: "group", k: E("POR APP Y PLATAFORMA · 7 DÍAS", "BY APP AND PLATFORM · 7 DAYS") });
    B.push(x.apps.length ? { type: "rows", cols: desk ? "repeat(3,minmax(0,1fr))" : undefined, items: x.apps.map((a) => ({ key: `${a.app}-${a.platform}`, icon: a.platform === "web" ? "globe" : "phone", t: `${app[a.app] ?? "WEB"} · ${a.platform === "ios" ? "iPhone" : a.platform === "android" ? "Android" : E("navegador", "browser")}`, s: E(`${a.entregados} entregados · ${a.invalidos} tokens inválidos`, `${a.entregados} delivered · ${a.invalidos} invalid tokens`) })) }
      : { type: "empty", icon: "bell", t: E("Todavía no sale ningún push", "No push sent yet"), s: E("Aparecen cuando alguien con avisos encendidos recibe uno.", "They show when someone with notifications on receives one.") });
    B.push({ type: "group", k: E("POR PLANTILLA · 7 DÍAS", "BY TEMPLATE · 7 DAYS") });
    if (x.plantillas.length) B.push({ type: "rows", cols: desk ? "repeat(auto-fill,minmax(380px,1fr))" : undefined, items: x.plantillas.map((p) => { const pl = d.plantillas.find((q) => q.key === p.tpl); return { key: p.tpl, icon: "bell", t: pl ? tx(pl.title) : p.tpl,
      s: `${E(`${p.entregados} entregados · ${p.abiertos} abiertos · ${p.ahorrados} SMS ahorrados`, `${p.entregados} delivered · ${p.abiertos} opened · ${p.ahorrados} SMS saved`)}${p.invalidos ? E(` · ${p.invalidos} inválidos`, ` · ${p.invalidos} invalid`) : ""}${p.fallidos ? E(` · ${p.fallidos} fallidos`, ` · ${p.fallidos} failed`) : ""}`, m: p.tpl.toUpperCase() }; }) });
  }
  if (tab === "rules") B.push({ type: "rows", items: [
    { icon: "bell", t: E("Push primero, SMS de respaldo", "Push first, SMS as backup"), s: E("Cada aviso va por push a los teléfonos y navegadores de la persona que tienen avisos encendidos (en la app que lo abre; si no la tiene, To'Latino). El SMS: lo crítico siempre; lo demás que lleva SMS, solo si la persona no tiene avisos o el push no llegó (el SMS espera hasta que se sabe). Las mismas preferencias y horas de silencio valen para los dos.", "Each notification goes by push to the person’s phones and browsers that have notifications on (in the app that opens it; if they don’t have it, To'Latino). SMS: critical always; anything else that carries SMS, only if the person has no notifications on or the push didn’t arrive (the SMS waits until that’s known). The same preferences and quiet hours apply to both.") },
    { icon: "lock", t: E("Texto genérico", "Generic text"), s: E("Lo de Salud, Niños, Soporte, sanciones y la cuenta pasa por Apple y Google solo como «Tienes un aviso nuevo en To'Latino.»; el detalle se lee al abrirlo con la sesión. No se puede destapar.", "Health, Kids, Support, sanctions and account items go through Apple and Google only as “You have a new notification on To'Latino.”; the details are read when it’s opened with the session. It can’t be revealed.") },
    { icon: "lock", t: E("Lo crítico siempre llega", "Critical always arrives"), s: E("El código para entrar sale siempre por SMS. No se apaga ni espera las horas de silencio.", "The sign-in code always goes out by SMS. It can’t be turned off and doesn’t wait for quiet hours.") },
    { icon: "clock", t: E("Horas de silencio", "Quiet hours"), s: E("De 10 PM a 7 AM, hora de la ciudad de la persona: el SMS que no es crítico no sale; el aviso queda en su bandeja. La persona puede desactivarlas en Mi cuenta › Avisos. La solicitud nueva al negocio no espera: solo llega mientras el negocio está recibiendo.", "From 10 PM to 7 AM, the person’s city time: non-critical SMS doesn’t go out; the notification stays in their inbox. The person can turn them off in My account › Notifications. A new request to a business doesn’t wait: it only arrives while the business is accepting.") },
    { icon: "bell", t: E("La bandeja siempre", "The inbox always"), s: E("Cada aviso queda en la campana de la app, aunque el SMS esté apagado. Abrir la bandeja lo marca como leído.", "Every notification stays in the app’s bell, even if SMS is off. Opening the inbox marks it as read.") },
    { icon: "users", t: E("Comunidad: se apaga o va en el resumen", "Community: can be turned off or go in the digest"), s: E("Respuestas y votos, y Mensajes de vecinos, se apagan en Mi cuenta › Avisos (no llegan a la campana). Con «Un resumen al día», se guardan y llega uno a la hora de Configuración (19 = 7 PM de fábrica), una vez al día; lo de alguien bloqueado no se cuenta. Sin SMS.", "Replies and votes, and Messages from neighbors, are turned off in My account › Notifications (they don’t reach the bell). With “One digest a day”, they’re saved and one arrives at the time in Settings (19 = 7 PM by default), once a day; anything from a blocked person isn’t counted. No SMS.") },
    { icon: "ticket", t: E("Eventos: lo crítico siempre llega", "Events: critical always arrives"), s: E("«Boletos y cambios», «Recordatorios» (el día antes y «¡Es hoy!», desde la hora de Configuración) y «Eventos que guardas» se apagan en Mi cuenta › Avisos (no llegan a la campana). Tu boleto comprado, devuelto o anulado, el que te mandan, una cortesía, el lugar de la lista de espera, una cancelación y un cambio de fecha u hora llegan siempre; la cancelación y el cambio, también de noche.", "“Tickets and changes”, “Reminders” (the day before and “It’s today!”, from the time in Settings) and “Events you save” are turned off in My account › Notifications (they don’t reach the bell). Your ticket bought, refunded or voided, one sent to you, a comp ticket, a waitlist spot, a cancellation and a date or time change always arrive; the cancellation and the change, at night too.") },
    { icon: "help", t: E("Soporte: lo del caso siempre llega", "Support: case updates always arrive"), s: E("Cuando recibimos tu caso, cuando te responde el equipo, cuando queda resuelto y cuando El Compa te pasa con una persona: en la campana, sin interruptor (Mi cuenta › Avisos › Soporte). El horario del equipo que dicen sale de Configuración › Soporte.", "When we get your case, when the team replies, when it’s resolved and when El Compa hands you to a person: in the bell, with no switch (My account › Notifications › Support). The team hours they mention come from Settings › Support.") },
    { icon: "users", t: E("Lo decide cada persona", "Each person decides"), s: E("En Mi cuenta › Avisos apaga el SMS de pedidos, de citas y reservas, o de empleos. Lo que no tiene interruptor (un pedido no aceptado, la respuesta a una ayuda) llega siempre.", "In My account › Notifications they turn off SMS for orders, bookings and reservations, or jobs. Anything without a switch (an order not accepted, the reply to a help request) always arrives.") },
    { icon: "globe", t: E("En su idioma", "In their language"), s: E("Cada aviso sale en el idioma de la cuenta de la persona: español o inglés.", "Each notification goes out in the language of the person’s account: Spanish or English.") },
    { icon: "info", t: E("Correo", "Email"), s: E("Plantillas propias y envío por Amazon SES. Solo a correos confirmados (enlace de un solo uso, 24 horas). Recibos de pedidos, mesas confirmadas y cobros de Pro; cada uno se manda una vez. En el sandbox ningún correo sale: queda «en modo pruebas» y se ve en Correos.", "Our own templates, sent through Amazon SES. Only to confirmed emails (single-use link, 24 hours). Order receipts, confirmed tables and Pro charges; each one is sent once. In the sandbox no email goes out: it stays “in test mode” and shows in Emails.") },
    { icon: "phone", t: E("Proveedor de SMS", "SMS provider"), s: E("Telnyx, con la clave del entorno. En el sandbox ningún SMS sale: queda «en modo pruebas» y se ve en Envíos. Sin clave, queda «sin proveedor».", "Telnyx, with the environment key. In the sandbox no SMS goes out: it stays “in test mode” and shows in Sends. Without a key, it shows “no provider”.") },
  ] });
  if (tab === "mail" && d.sig) B.push({ type: "acts", items: [{ l: E("Ver más", "See more"), v: "secondary", onClick: () => ir("mail", d.sig!) }] });
  if (tab === "log" && d.sig) B.push({ type: "acts", items: [{ l: E("Ver más", "See more"), v: "secondary", onClick: () => ir("log", d.sig!) }] });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <PanelBloques bloques={B} h1={desk ? 26 : 22} />
      <Toast t={toast} desk={desk} />
    </div>
  );
}
