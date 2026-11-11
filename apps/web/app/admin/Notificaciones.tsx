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

const G: Record<GrupoNotif, string> = { crit: "CRÍTICO · SIEMPRE LLEGA", tx: "PEDIDOS, RESERVACIONES Y SOLICITUDES", support: "SOPORTE · LO DEL CASO SIEMPRE LLEGA", events: "EVENTOS · LO QUE NO ES CRÍTICO SE APAGA", community: "COMUNIDAD · SE APAGA O VA EN EL RESUMEN DIARIO", mod: "MODERACIÓN", biz: "AL NEGOCIO", mkt: "CRECIMIENTO · RESPETA AVISOS Y SILENCIO" };
const SMS: Record<string, [string, string]> = { respaldo: ["SMS DE RESPALDO", "neutral"], ahorrado: ["SMS AHORRADO", "signal"], no: ["SOLO BANDEJA", "neutral"], pruebas: ["SMS EN PRUEBAS", "action"], pendiente: ["SMS PENDIENTE", "neutral"], enviado: ["SMS ENVIADO", "signal"], fallo: ["SMS FALLÓ", "danger"], silencio: ["HORAS DE SILENCIO", "neutral"], apagado: ["SMS APAGADO", "neutral"], sin_proveedor: ["SIN PROVEEDOR", "danger"], baja: ["PIDIÓ STOP", "neutral"] };
const PREF: Record<string, string> = { ord: "Pedidos", cit: "Citas y reservas", emp: "Empleos", hoy: "Lo que traen hoy", com: "Respuestas y votos", msg: "Mensajes de vecinos", evt: "Boletos y cambios", evtR: "Recordatorios", evtG: "Eventos que guardas" };
const cuando = (iso: string) => new Intl.DateTimeFormat("es-US", { timeZone: "America/New_York", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso)).replace(/\./g, "");

const MAIL: Record<string, [string, string]> = { pruebas: ["EN MODO PRUEBAS", "action"], pendiente: ["PENDIENTE", "neutral"], enviado: ["ENVIADO", "signal"], fallo: ["FALLÓ", "danger"], sin_proveedor: ["SIN PROVEEDOR", "danger"] };
const MAIL_TPL: Record<string, string> = { verify: "Confirma tu correo", receipt_order: "Recibo de pedido", receipt_table: "Mesa confirmada", receipt_pro: "Recibo de Pro" };
// 8c · Push: el estado de cada aviso y qué app lo abre.
const PUSH: Record<string, [string, string]> = { pendiente: ["PUSH EN COLA", "neutral"], enviado: ["PUSH ENTREGADO", "signal"], pruebas: ["PUSH EN PRUEBAS", "action"], fallo: ["PUSH FALLÓ", "danger"], silencio: ["PUSH · SILENCIO", "neutral"], apagado: ["PUSH APAGADO", "neutral"] };
const APP: Record<string, string> = { cliente: "TO'LATINO", negocio: "NEGOCIOS", delivery: "REPARTIDOR", checkin: "PUERTA" };
const SMS_MODO: Record<string, string> = { siempre: "SMS SIEMPRE", sin_push: "SMS SI NO HAY PUSH", nunca: "" };
export function Notificaciones({ d, tab, puede, com = false, evt = false, sop = false }: { d: DatosNotif; tab: "tpl" | "log" | "rules" | "mail" | "push"; puede: boolean; com?: boolean; evt?: boolean; sop?: boolean }) {
  const router = useRouter(), w = useAncho(), desk = w >= 1024;
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast(), [pend, start] = useTransition();
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? "Listo. Quedó en la auditoría."); setConf(null); router.refresh(); };
  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <PanelBloques bloques={[{ type: "head", eye: "NOTIFICACIONES", t: "Editar plantilla", onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>
  );
  const editar = (p: Plantilla, lang: "es" | "en") => setConf({
    titulo: `${p.title.es} · ${lang === "es" ? "español" : "inglés"}`, cta: "Guardar",
    sub: `Variables entre llaves, solo las que ya usa: ${[...new Set((p.body.es + p.body.en).match(/\{\w+\}/g) ?? [])].join(" ") || "ninguna"}. ${p.sms ? "Máximo 160 caracteres: también sale como SMS." : "Máximo 300 caracteres."} El motivo queda en la auditoría.`,
    valor: { k: lang === "es" ? "TEXTO EN ESPAÑOL" : "TEXTO EN INGLÉS", ini: p.body[lang], area: true, max: p.sms ? 160 : 300 },
    hacer: (m, _e, v) => plantillaEditar(p.key, lang, v, m),
  });
  // 8c · El push de una plantilla: encender/apagar, texto genérico y la app que lo abre (con motivo y auditoría).
  const cambiarPush = (p: Plantilla, campo: "push" | "priv" | "app") => setConf(campo === "app" ? {
    titulo: `${p.title.es} · qué app lo abre`, cta: "Guardar", sub: `Ahora: ${APP[p.app]}. Al tocar el push se abre esa app (si no la tiene, To'Latino; en la web, el navegador).`,
    elegir: { label: "APP", items: Object.entries(APP).map(([k, l]) => ({ k, l })) }, hacer: (m, e) => plantillaPush(p.key, "app", e ?? "", m),
  } : {
    titulo: `${p.title.es} · ${campo === "push" ? (p.push ? "apagar el push" : "encender el push") : p.priv ? "mostrar el texto en el push" : "texto genérico en el push"}`, cta: "Guardar", peligro: campo === "push" && p.push,
    sub: campo === "push" ? (p.push ? "Deja de ir por push; queda en la campana y, si la plantilla lleva SMS, sale el SMS." : "Vuelve a ir por push a los teléfonos con avisos.")
      : p.priv ? "Apple y Google verán el título y el texto del aviso." : "Por Apple y Google solo pasa «Tienes un aviso nuevo en To'Latino.»; el detalle se lee al abrirlo.",
    hacer: (m) => plantillaPush(p.key, campo, campo === "push" ? (p.push ? "no" : "si") : p.priv ? "no" : "si", m),
  });
  const probar = (p: Plantilla) => start(async () => { const r = await plantillaProbar(p.key); setToast(r.mensaje ?? "Enviada."); router.refresh(); });
  const ir = (t: string, antes?: string) => { const q = t === "tpl" && !antes ? "" : `tab=${t}${antes ? `&antes=${antes}` : ""}`; router.push(q ? `/admin/notificaciones?${q}` : "/admin/notificaciones"); };
  const k = d.kpi;
  const B: Bloque[] = [
    { type: "head", eye: "DINERO Y CRECIMIENTO", t: "Notificaciones", s: "Plantillas por evento (ES/EN), los envíos y la regla: lo crítico siempre llega; lo demás respeta los avisos de cada persona y las horas de silencio.", h1: desk ? 26 : 22 },
    { type: "kpis", cols: desk ? "repeat(5,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: "AVISOS · 24 H", v: String(k.hoy), s: `${k.leidos} ya leídos en la app`, bg: "var(--tl-ink)", fg: "var(--tl-white)", onClick: () => ir("log") },
      { k: "SMS ENVIADOS · 24 H", v: String(k.sms), s: k.pruebas ? `${k.pruebas} en modo pruebas (no salen)` : "por el proveedor" },
      { k: "SMS FRENADOS · 24 H", v: String(k.frenados), s: "por sus avisos o las horas de silencio" },
      { k: "SMS CON PROBLEMA · 24 H", v: String(k.fallos), s: k.fallos ? "fallaron o no hay proveedor" : "ninguno", sFg: k.fallos ? "var(--tl-danger)" : undefined },
      { k: "PUSH ENTREGADOS · 24 H", v: String(k.push), s: k.ahorrados ? `${k.ahorrados} SMS ahorrados` : "push primero, SMS de respaldo", onClick: () => ir("push") },
    ] },
    { type: "tabs", items: ([["tpl", "Plantillas", String(d.plantillas.length)], ["log", "Envíos"], ["push", "Push"], ["mail", "Correos", d.kmail.hoy ? String(d.kmail.hoy) : undefined], ["rules", "Reglas"]] as const).map(([t, l, n]) => ({ l, n, on: tab === t, onClick: () => ir(t) })) },
  ];
  // 5i · «Solo Comunidad»: com_*, gam_*, dm_*, mod_*, apel_* (todas sin SMS; guardián avisoComunidadSinSms) y el resumen diario.
  // 6j · «Solo Eventos»: evt_*, bol_*, rsvp_*, espera_*, puerta_*, evp_* (SMS solo lo crítico; guardián avisoEventoSmsSoloCritico).
  // 7i · «Solo Soporte y El Compa»: sop_*, compa_* (grupo support sin interruptor; al equipo y al negocio en Moderación y Al negocio).
  if (tab === "tpl") B.push({ type: "chips", items: [{ l: "Todas", v: com || evt || sop ? "filter" : "selected", onClick: () => router.push("/admin/notificaciones") },
    { l: `Solo Comunidad · ${d.plantillas.filter((p) => DE_COMUNIDAD.test(p.key)).length}`, v: com ? "selected" : "filter", onClick: () => router.push("/admin/notificaciones?com=1") },
    { l: `Solo Eventos · ${d.plantillas.filter((p) => DE_EVENTOS.test(p.key)).length}`, v: evt ? "selected" : "filter", onClick: () => router.push("/admin/notificaciones?evt=1") },
    { l: `Solo Soporte y El Compa · ${d.plantillas.filter((p) => DE_SOPORTE.test(p.key)).length}`, v: sop ? "selected" : "filter", onClick: () => router.push("/admin/notificaciones?sop=1") }] });
  if (tab === "tpl" && sop) B.push({ type: "note", tone: "info", icon: "help", t: "Soporte y El Compa: lo del caso (lo recibimos, te respondieron, quedó resuelto, El Compa te pasó con una persona y el caso del negocio) va en el grupo Soporte y siempre llega: en Mi cuenta › Avisos no tiene interruptor. Lo del tope de El Compa y del plazo de un caso va al equipo; lo de las respuestas automáticas, al negocio. Sin SMS." });
  if (tab === "tpl" && evt) B.push({ type: "note", tone: "info", icon: "ticket", t: "Eventos: solo lo crítico lleva SMS (cancelación, cambio de fecha u hora, el boleto que te mandan, una cortesía, el lugar de la lista de espera, la invitación a la puerta y la propuesta y la confirmación de un evento privado). En Mi cuenta › Avisos › Eventos la persona apaga «Boletos y cambios», «Recordatorios» y «Eventos que guardas»; lo que no tiene interruptor llega siempre." });
  if (tab === "tpl" && com) B.push({ type: "note", tone: "info", icon: "bell", t: "Los avisos de la Comunidad van sin SMS: solo la campana. En Mi cuenta › Avisos la persona apaga «Respuestas y votos» o «Mensajes de vecinos», o pide «Un resumen al día»: lo del grupo Comunidad se guarda y le llega uno a la hora de Sistema › Configuración. Lo de alguien bloqueado no se cuenta." });
  if (tab === "tpl") for (const g of Object.keys(G) as GrupoNotif[]) {
    const L = d.plantillas.filter((p) => p.grp === g && (!com || DE_COMUNIDAD.test(p.key)) && (!evt || DE_EVENTOS.test(p.key)) && (!sop || DE_SOPORTE.test(p.key)));
    if (!L.length) continue;
    B.push({ type: "group", k: G[g] }, { type: "rows", cols: desk ? "repeat(auto-fill,minmax(380px,1fr))" : undefined, items: L.map((p) => ({
      key: p.key, icon: p.sms ? "phone" : "bell", t: p.title.es, s: p.body.es,
      m: [`BANDEJA${p.push ? ` · PUSH${p.priv ? " GENÉRICO" : ""} → ${APP[p.app]}` : ""}`, SMS_MODO[p.sms_mode] || null, p.pref ? `SE APAGA EN ${PREF[p.pref]?.toUpperCase() ?? p.pref}` : null, `${p.n7} EN 7 D`, p.editada ? "EDITADA" : null].filter(Boolean).join(" · "),
      acts: puede ? [{ l: "Editar español", icon: "edit", onClick: () => editar(p, "es") }, { l: "Editar inglés", icon: "edit", onClick: () => editar(p, "en") },
        { l: p.push ? "Apagar push" : "Encender push", icon: "bell", onClick: () => cambiarPush(p, "push") },
        ...(p.fija ? [] : [{ l: p.priv ? "Mostrar texto en el push" : "Texto genérico", icon: "lock", onClick: () => cambiarPush(p, "priv") }]),
        { l: "Abre en…", icon: "phone", onClick: () => cambiarPush(p, "app") },
        { l: "Probar en mi teléfono", icon: "phone", off: pend, onClick: () => probar(p) }] : undefined,
    })) });
  }
  if (tab === "log") {
    if (!d.envios.length) B.push({ type: "empty", icon: "bell", t: "Todavía no sale ningún aviso", s: "Aparecen aquí cuando un negocio acepta un pedido, confirma una mesa o responde una solicitud." });
    else B.push({ type: "rows", items: d.envios.map((x) => ({
      key: x.id, icon: x.sms === "no" ? "bell" : "phone", t: `${x.title} · ${x.quien}`, s: x.body, m: `${cuando(x.at)}${PUSH[x.push] ? ` · ${PUSH[x.push]![0]}` : ""}${x.abierto ? " · ABIERTO DESDE EL PUSH" : x.leido ? " · LEÍDO" : ""}`,
      tag: SMS[x.sms]?.[0] ?? x.sms, tone: SMS[x.sms]?.[1] ?? "neutral", chev: true, onClick: () => router.push(`/admin/usuarios/${x.uid}`),
    })) });
  }
  if (tab === "mail") {
    const m = d.kmail;
    B.push({ type: "note", tone: "info", icon: "info", t: `Correo con plantillas propias, enviado por Amazon SES. 24 h: ${m.hoy} correos · ${m.enviados} enviados${m.pruebas ? ` · ${m.pruebas} en modo pruebas (no salen)` : ""}${m.problemas ? ` · ${m.problemas} con problema` : ""}. Solo a correos confirmados y si la persona tiene «Recibos» encendido.` });
    if (!d.correos.length) B.push({ type: "empty", icon: "info", t: "Todavía no sale ningún correo", s: "Aparecen aquí cuando alguien confirma su correo, termina un pedido, le confirman una mesa o se cobra Pro." });
    else B.push({ type: "rows", items: d.correos.map((x) => ({
      key: x.id, icon: "info", t: x.subject, s: `${MAIL_TPL[x.tpl] ?? x.tpl} · ${x.quien ?? "—"} · ${x.to}${x.error ? ` · ${x.error}` : ""}`, m: cuando(x.at),
      tag: MAIL[x.status]?.[0] ?? x.status, tone: MAIL[x.status]?.[1] ?? "neutral", chev: true, onClick: () => router.push(`/admin/notificaciones/correo/${x.id}`),
    })) });
  }
  // 8c · Notificaciones › Push: por plantilla y por app y plataforma, 7 días. Sin personas.
  if (tab === "push" && d.push) {
    const x = d.push;
    B.push({ type: "note", tone: "info", icon: "bell", t: `Push primero, SMS de respaldo. 24 h: ${x.dia.enviados} avisos llegaron por push · ${x.dia.abiertos} se abrieron desde el push · ${x.dia.ahorrados} SMS ahorrados · ${x.dia.respaldo} salieron por SMS porque el push no llegó · ${x.dia.sin_app} sin teléfono con avisos. Los canales, la cola y los errores: Sistema › Integraciones › Push.` });
    B.push({ type: "group", k: "POR APP Y PLATAFORMA · 7 DÍAS" });
    B.push(x.apps.length ? { type: "rows", cols: desk ? "repeat(3,minmax(0,1fr))" : undefined, items: x.apps.map((a) => ({ key: `${a.app}-${a.platform}`, icon: a.platform === "web" ? "globe" : "phone", t: `${APP[a.app] ?? "WEB"} · ${a.platform === "ios" ? "iPhone" : a.platform === "android" ? "Android" : "navegador"}`, s: `${a.entregados} entregados · ${a.invalidos} tokens inválidos` })) }
      : { type: "empty", icon: "bell", t: "Todavía no sale ningún push", s: "Aparecen cuando alguien con avisos encendidos recibe uno." });
    B.push({ type: "group", k: "POR PLANTILLA · 7 DÍAS" });
    if (x.plantillas.length) B.push({ type: "rows", cols: desk ? "repeat(auto-fill,minmax(380px,1fr))" : undefined, items: x.plantillas.map((p) => ({ key: p.tpl, icon: "bell", t: d.plantillas.find((q) => q.key === p.tpl)?.title.es ?? p.tpl,
      s: `${p.entregados} entregados · ${p.abiertos} abiertos · ${p.ahorrados} SMS ahorrados${p.invalidos ? ` · ${p.invalidos} inválidos` : ""}${p.fallidos ? ` · ${p.fallidos} fallidos` : ""}`, m: p.tpl.toUpperCase() })) });
  }
  if (tab === "rules") B.push({ type: "rows", items: [
    { icon: "bell", t: "Push primero, SMS de respaldo", s: "Cada aviso va por push a los teléfonos y navegadores de la persona que tienen avisos encendidos (en la app que lo abre; si no la tiene, To'Latino). El SMS: lo crítico siempre; lo demás que lleva SMS, solo si la persona no tiene avisos o el push no llegó (el SMS espera hasta que se sabe). Las mismas preferencias y horas de silencio valen para los dos." },
    { icon: "lock", t: "Texto genérico", s: "Lo de Salud, Niños, Soporte, sanciones y la cuenta pasa por Apple y Google solo como «Tienes un aviso nuevo en To'Latino.»; el detalle se lee al abrirlo con la sesión. No se puede destapar." },
    { icon: "lock", t: "Lo crítico siempre llega", s: "El código para entrar sale siempre por SMS. No se apaga ni espera las horas de silencio." },
    { icon: "clock", t: "Horas de silencio", s: "De 10 PM a 7 AM, hora de la ciudad de la persona: el SMS que no es crítico no sale; el aviso queda en su bandeja. La persona puede desactivarlas en Mi cuenta › Avisos. La solicitud nueva al negocio no espera: solo llega mientras el negocio está recibiendo." },
    { icon: "bell", t: "La bandeja siempre", s: "Cada aviso queda en la campana de la app, aunque el SMS esté apagado. Abrir la bandeja lo marca como leído." },
    { icon: "users", t: "Comunidad: se apaga o va en el resumen", s: "Respuestas y votos, y Mensajes de vecinos, se apagan en Mi cuenta › Avisos (no llegan a la campana). Con «Un resumen al día», se guardan y llega uno a la hora de Configuración (19 = 7 PM de fábrica), una vez al día; lo de alguien bloqueado no se cuenta. Sin SMS." },
    { icon: "ticket", t: "Eventos: lo crítico siempre llega", s: "«Boletos y cambios», «Recordatorios» (el día antes y «¡Es hoy!», desde la hora de Configuración) y «Eventos que guardas» se apagan en Mi cuenta › Avisos (no llegan a la campana). Tu boleto comprado, devuelto o anulado, el que te mandan, una cortesía, el lugar de la lista de espera, una cancelación y un cambio de fecha u hora llegan siempre; la cancelación y el cambio, también de noche." },
    { icon: "help", t: "Soporte: lo del caso siempre llega", s: "Cuando recibimos tu caso, cuando te responde el equipo, cuando queda resuelto y cuando El Compa te pasa con una persona: en la campana, sin interruptor (Mi cuenta › Avisos › Soporte). El horario del equipo que dicen sale de Configuración › Soporte." },
    { icon: "users", t: "Lo decide cada persona", s: "En Mi cuenta › Avisos apaga el SMS de pedidos, de citas y reservas, o de empleos. Lo que no tiene interruptor (un pedido no aceptado, la respuesta a una ayuda) llega siempre." },
    { icon: "globe", t: "En su idioma", s: "Cada aviso sale en el idioma de la cuenta de la persona: español o inglés." },
    { icon: "info", t: "Correo", s: "Plantillas propias y envío por Amazon SES. Solo a correos confirmados (enlace de un solo uso, 24 horas). Recibos de pedidos, mesas confirmadas y cobros de Pro; cada uno se manda una vez. En el sandbox ningún correo sale: queda «en modo pruebas» y se ve en Correos." },
    { icon: "phone", t: "Proveedor de SMS", s: "Telnyx, con la clave del entorno. En el sandbox ningún SMS sale: queda «en modo pruebas» y se ve en Envíos. Sin clave, queda «sin proveedor»." },
  ] });
  if (tab === "mail" && d.sig) B.push({ type: "acts", items: [{ l: "Ver más", v: "secondary", onClick: () => ir("mail", d.sig!) }] });
  if (tab === "log" && d.sig) B.push({ type: "acts", items: [{ l: "Ver más", v: "secondary", onClick: () => ir("log", d.sig!) }] });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <PanelBloques bloques={B} h1={desk ? 26 : 22} />
      <Toast t={toast} desk={desk} />
    </div>
  );
}
