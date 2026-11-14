"use client";
/* USR-AVISOS (diseño «To'Latino Mi cuenta» · notifV): lo que siempre te llega, pedidos y reservas, empleos, negocios que
   guardas, correo y horas de silencio. 8c: «En este teléfono» (hueco #8 del plan de la Fase 8: el interruptor de este teléfono o navegador,
   bloqueado → «Abrir Ajustes», no disponible → por qué) y «Tus teléfonos con avisos» (apagar uno); cada tipo vale para el push y el SMS. Comunidad (5i): respuestas y votos, resumen diario y mensajes de vecinos.
   Eventos (6j, grupo `events`): boletos y cambios, recordatorios (a la hora de Configuración) y eventos que guardas; lo crítico (tu boleto,
   una cancelación, un cambio de fecha u hora, el boleto que te mandan) no se apaga.
   Soporte (7i, grupo `support`): lo de tus casos (lo recibimos, te respondieron, quedó resuelto, El Compa te pasó con una persona) no se apaga; el
   horario del equipo sale de Configuración › Soporte. */
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { avisosDe } from "@/lib/perfil";
import type { Dispositivo } from "@/lib/push/tokens";
import { avisosApagar } from "@/app/_cascara/acciones-avisos";
import { useEsteTelefono } from "@/app/_cascara/useEsteTelefono";
import { webPushPosible } from "@/lib/nativo/avisos";
import { abrirAjustes } from "@/lib/nativo/permisos";
import { esApp } from "@/lib/nativo/puente";
import { avisoGuardar } from "../acciones-perfil";
import { Marco, useCuentaUi, type Bloque, type Yo } from "../Marco";

const hora12 = (h: number) => `${h % 12 || 12} ${h < 12 ? "AM" : "PM"}`;
type P = Awaited<ReturnType<typeof avisosDe>>;
const fecha = (iso: string, es: boolean) => new Intl.DateTimeFormat(es ? "es-US" : "en-US", { timeZone: "America/New_York", day: "numeric", month: "short", year: "numeric" }).format(new Date(iso)).replace(/\./g, "").toUpperCase();
export function Avisos({ p, es, yo, horaResumen, horaRecordatorio, horarioEquipo = null, disp = [] }: { p: P; es: boolean; yo: Yo; horaResumen: number; horaRecordatorio: number; horarioEquipo?: string | null; disp?: Dispositivo[] }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const ui = useCuentaUi(), router = useRouter();
  const [v, setV] = useState(p);
  // 8c · «En este teléfono» (useEsteTelefono: el permiso del sistema o del navegador y si ESTA sesión tiene un token vivo).
  const { est, aqui, tg: tgEste } = useEsteTelefono(es, ui.toast, () => router.refresh(), disp.some((d) => d.este));
  const apagarOtro = (d: Dispositivo) => { void avisosApagar(d.id).then((r) => { ui.toast(r.ok ? E2(`Apagados en ${d.label}.`, `Turned off on ${d.label}.`) : E2("No se pudo.", "Could not.")); router.refresh(); }); };
  const sinPush = (): string => {
    if (esApp()) return E2("Esta versión de la app todavía no recibe avisos. Te llegan en la campana y por SMS.", "This version of the app does not get notifications yet. You get them in the bell and by SMS.");
    if (typeof window !== "undefined" && !window.isSecureContext) return E2("Los avisos al teléfono necesitan una conexión segura (https). Mientras, te llegan en la campana y por SMS.", "Phone notifications need a secure connection (https). Meanwhile, you get them in the bell and by SMS.");
    if (typeof navigator !== "undefined" && /iPhone|iPad/.test(navigator.userAgent) && !webPushPosible())
      return E2("En iPhone, los avisos llegan cuando agregas To'Latino a tu pantalla de inicio: en Safari, Compartir › Agregar a inicio, y ábrela desde ahí. Mientras, te llegan en la campana y por SMS.",
        "On iPhone, notifications arrive once you add To'Latino to your home screen: in Safari, Share › Add to Home Screen, and open it from there. Meanwhile, you get them in the bell and by SMS.");
    return E2("Este navegador no recibe avisos. Te llegan en la campana y por SMS.", "This browser does not get notifications. You get them in the bell and by SMS.");
  };
  const tg = async (k: keyof P) => {
    const nv = !v[k]; setV({ ...v, [k]: nv });
    const r = await avisoGuardar(k, nv).catch(() => null);
    if (!r?.ok) { setV((x) => ({ ...x, [k]: !nv })); ui.toast(E2("No se pudo guardar. Prueba de nuevo.", "Could not save. Try again.")); }
  };
  const G: [string, [keyof P, string, string][]][] = [
    [E2("PEDIDOS Y RESERVAS", "ORDERS AND BOOKINGS"), [["ord", E2("Cómo va tu pedido", "Order updates"), E2("ACEPTADO · EN CAMINO · LISTO", "ACCEPTED · ON THE WAY · READY")], ["cit", E2("Respuesta a tus reservaciones", "Booking replies"), E2("CONFIRMADA · OTRA HORA · NO PUDO", "CONFIRMED · NEW TIME · DECLINED")]]],
    // 5i · Comunidad (prototipo notifV): respuestas y votos, un resumen al día (a la hora de Configuración) y mensajes de vecinos.
    [E2("COMUNIDAD", "COMMUNITY"), [["com", E2("Respuestas y votos", "Replies and votes"), E2("LO QUE PUBLICAS", "ON WHAT YOU POST")],
      ["dig", E2("Un resumen al día en vez de cada aviso", "One daily digest instead of each alert"), E2(`A LAS ${hora12(horaResumen)}`, `AT ${hora12(horaResumen)}`)],
      ["msg", E2("Mensajes de vecinos", "Messages from neighbors"), E2("SOLO DE QUIEN TE SIGUE", "ONLY FROM PEOPLE WHO FOLLOW YOU")]]],
    // 6j · Eventos (grupo `events`): lo que no es crítico de tus boletos y RSVP, los recordatorios y los eventos que guardas.
    [E2("EVENTOS", "EVENTS"), [["evt", E2("Boletos y cambios", "Tickets and changes"), E2("AVISOS DEL ORGANIZADOR · CAMBIO DE PROGRAMA · TU RSVP", "ORGANIZER NOTICES · PROGRAM CHANGES · YOUR RSVP")],
      ["evtR", E2("Recordatorios", "Reminders"), E2(`EL DÍA ANTES Y «¡ES HOY!» · DESDE LAS ${hora12(horaRecordatorio)}`, `THE DAY BEFORE AND «IT'S TODAY!» · FROM ${hora12(horaRecordatorio)}`)],
      ["evtG", E2("Eventos que guardas", "Events you save"), E2("UN DÍA ANTES", "ONE DAY BEFORE")]]],
    [E2("EMPLEOS", "JOBS"), [["emp", E2("Respuesta a tus solicitudes", "Replies to your applications"), E2("VISTA · TE VAN A LLAMAR · ENTREVISTA", "SEEN · THEY WILL CALL · INTERVIEW")]]],
    [E2("NEGOCIOS QUE GUARDAS", "SAVED BUSINESSES"), [["hoy", E2("Lo que traen hoy", "What they have today"), E2("SUS NOVEDADES", "THEIR UPDATES")], ["of", E2("Ofertas", "Deals"), E2("MÁXIMO 1 AL DÍA", "AT MOST 1 A DAY")]]],
    [E2("CORREO", "EMAIL"), [["mailR", E2("Recibos", "Receipts"), E2("DE CADA PEDIDO Y RESERVACIÓN", "FOR EVERY ORDER AND BOOKING")], ["mailW", E2("Resumen semanal del barrio", "Weekly neighborhood digest"), E2("LOS LUNES", "MONDAYS")]]],
    // 9h · Las campañas de Crecimiento: solo a quien lo enciende (apagado de fábrica), nunca de noche y con tope por semana.
    [E2("DE TO'LATINO", "FROM TO'LATINO"), [["mkt", E2("Novedades de To'Latino", "To'Latino updates"), E2("APAGADO DE FÁBRICA · NUNCA DE NOCHE · CON TOPE POR SEMANA", "OFF BY DEFAULT · NEVER AT NIGHT · WEEKLY LIMIT")]]],
  ];
  const B: Bloque[] = [{ type: "sec", t: E2("EN ESTE TELÉFONO", "ON THIS PHONE"), fs: "14px", mt: "4px" }];
  if (est === "no_disponible") B.push({ type: "note", tone: "warn", ic: "bell", t: E2("Los avisos al teléfono no están disponibles aquí", "Phone notifications are not available here"), s: sinPush() });
  else B.push({ type: "rows", rows: [{ key: "este", ic: "bell", t: E2("Avisos en este teléfono", "Notifications on this phone"),
    s: est === null ? E2("REVISANDO…", "CHECKING…") : aqui ? E2("ENCENDIDOS · TE LLEGAN AL MOMENTO", "ON · THEY REACH YOU RIGHT AWAY") : est === "negado" ? E2("BLOQUEADOS EN ESTE TELÉFONO", "BLOCKED ON THIS PHONE") : E2("APAGADOS · TE LLEGAN EN LA CAMPANA Y POR SMS", "OFF · YOU GET THEM IN THE BELL AND BY SMS"),
    tog: aqui, onTog: tgEste }] });
  if (est === "negado") B.push({ type: "note", tone: "danger", ic: "warning", t: E2("Los avisos están bloqueados para To'Latino", "Notifications are blocked for To'Latino"),
    s: esApp() ? E2("Para recibirlos, enciéndelos en los Ajustes del teléfono, en esta app.", "To get them, turn them on in your phone Settings, under this app.") : E2("Para recibirlos, permítelos en la configuración de este sitio en tu navegador.", "To get them, allow them in this site's settings in your browser."),
    ...(esApp() ? { a: E2("Abrir Ajustes", "Open Settings"), onA: () => { void abrirAjustes(); } } : {}) });
  if (disp.length) B.push({ type: "sec", t: E2("TUS TELÉFONOS CON AVISOS", "YOUR PHONES WITH NOTIFICATIONS"), fs: "14px", mt: "8px" }, { type: "rows", rows: disp.map((d) => ({
    key: d.id, ic: d.platform === "web" ? "globe" : "phone", t: d.label, s: `${E2("DESDE", "SINCE")} ${fecha(d.desde, es)}${d.ultimo ? ` · ${E2("ÚLTIMO AVISO", "LAST NOTICE")} ${fecha(d.ultimo, es)}` : ""}`,
    tag: d.este ? [E2("ESTE", "THIS ONE"), "ok"] as [string, string] : null, acts: [[E2("Apagar", "Turn off"), "secondary", () => apagarOtro(d)]] as [string, string, () => void][] })) });
  B.push({ type: "note", tone: "info", ic: "lock", t: E2("Esto siempre te llega", "You always get these"),
    s: E2("El código para entrar, y lo crítico (una cancelación o un cambio de fecha u hora de tu evento): aunque apagues los avisos en todos tus teléfonos, eso te llega por SMS. Lo demás, si no tienes avisos, te llega por SMS cuando aplica y siempre en la campana.",
      "Your sign-in code, and what is critical (a cancellation or a date or time change of your event): even if you turn notifications off on all your phones, those reach you by SMS. Everything else, without notifications, reaches you by SMS when it applies and always in the bell.") });
  B.push({ type: "note", tone: "info", ic: "bell", t: E2("Qué te llega", "What you get"), s: E2("Cada tipo de abajo vale para los avisos al teléfono y los SMS. Lo de Salud, Soporte y tu cuenta llega sin detalle en la pantalla bloqueada: lo lees al abrirlo.", "Each type below applies to phone notifications and SMS. Health, Support and account notices arrive without details on the lock screen: you read them when you open them.") });
  G.forEach(([t, rows], gi) => {
    B.push({ type: "sec", t, fs: "14px", mt: gi ? "8px" : "4px" }, { type: "rows", rows: rows.map(([k, l, s]) => ({ key: k, t: l, s, tog: v[k], onTog: () => void tg(k) })) });
    // 6j · Lo crítico de Eventos no se apaga (no tiene interruptor).
    if (rows[0]?.[0] === "evt") B.push({ type: "note", tone: "info", ic: "lock", t: E2("Siempre te llega", "You always get these"), s: E2("Tu boleto comprado, devuelto o anulado, el boleto que te mandan, una cortesía, un lugar de la lista de espera, una cancelación o un cambio de fecha u hora, y la propuesta de un evento privado.", "Your ticket bought, refunded or voided, a ticket sent to you, a comp, a waitlist spot, a cancellation or a date or time change, and a private event proposal.") });
  });
  // 7i · Soporte (grupo `support`): lo de tus casos siempre llega (sin interruptor), con el horario del equipo de Configuración.
  B.push({ type: "sec", t: E2("SOPORTE", "SUPPORT"), fs: "14px", mt: "8px" }, { type: "note", tone: "info", ic: "lock", t: E2("Lo de tus casos siempre te llega", "Your case updates always reach you"),
    s: E2(`Cuando recibimos tu caso, cuando te responde el equipo, cuando queda resuelto y cuando El Compa te pasa con una persona. No se apaga.${horarioEquipo ? ` El equipo atiende ${horarioEquipo}.` : ""}`,
      `When we get your case, when the team replies, when it is resolved and when El Compa passes you to a person. It cannot be turned off.${horarioEquipo ? ` The team works ${horarioEquipo}.` : ""}`) });
  // 7h · El Compa por WhatsApp y SMS (§6 #14): apagado de fábrica; solo contesta a TU teléfono verificado y lo que cambia algo se confirma en la app.
  B.push({ type: "sec", t: "EL COMPA", fs: "14px", mt: "8px" }, { type: "rows", rows: [{ key: "cpa", ic: "chat", t: E2("Hablar con El Compa por WhatsApp y SMS", "Talk to El Compa by WhatsApp and SMS"),
    s: E2("SOLO DESDE TU TELÉFONO VERIFICADO · LO QUE CAMBIA ALGO SE CONFIRMA AQUÍ · STOP PARA SALIR", "ONLY FROM YOUR VERIFIED PHONE · ANYTHING THAT CHANGES SOMETHING IS CONFIRMED HERE · STOP TO OPT OUT"), tog: v.cpa, onTog: () => void tg("cpa") }] });
  B.push({ type: "sec", t: E2("Horas de silencio", "Quiet hours"), fs: "14px", mt: "8px" }, { type: "rows", rows: [{ ic: "clock", t: E2("De 10 PM a 7 AM", "10 PM to 7 AM"), s: E2("SOLO PASA LO CRÍTICO", "ONLY CRITICAL ONES GET THROUGH"), tog: v.quiet, onTog: () => void tg("quiet") }] });
  return <Marco es={es} code="USR-AVISOS" back="/cuenta" t={E2("Avisos", "Notifications")} s={E2("QUÉ TE LLEGA Y CUÁNDO", "WHAT YOU GET AND WHEN")} blocks={B} yo={yo} ui={ui}
    rcards={[{ label: "Avisos · regla", k: E2("NUESTRA REGLA", "OUR RULE"), t: E2("Nunca publicidad por aquí.", "Never ads here."), s: E2("Agrupamos lo que se puede: un aviso con todo, no tres.", "We group what we can: one notification with everything, not three.") }]} />;
}
