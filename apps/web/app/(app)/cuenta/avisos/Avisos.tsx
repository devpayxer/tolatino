"use client";
/* USR-AVISOS (diseño «To'Latino Mi cuenta» · notifV): lo que siempre te llega, pedidos y reservas, empleos, negocios que
   guardas, correo y horas de silencio. Los avisos al teléfono todavía no salen: tus preferencias quedan guardadas y se
   aplican desde el primero (anotado en LAUNCH-CHECKLIST). Comunidad (5i): respuestas y votos, resumen diario y mensajes de vecinos.
   Eventos (6j, grupo `events`): boletos y cambios, recordatorios (a la hora de Configuración) y eventos que guardas; lo crítico (tu boleto,
   una cancelación, un cambio de fecha u hora, el boleto que te mandan) no se apaga. */
import { useState } from "react";
import type { avisosDe } from "@/lib/perfil";
import { avisoGuardar } from "../acciones-perfil";
import { Marco, useCuentaUi, type Bloque, type Yo } from "../Marco";

const hora12 = (h: number) => `${h % 12 || 12} ${h < 12 ? "AM" : "PM"}`;
type P = Awaited<ReturnType<typeof avisosDe>>;
export function Avisos({ p, es, yo, horaResumen, horaRecordatorio }: { p: P; es: boolean; yo: Yo; horaResumen: number; horaRecordatorio: number }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const ui = useCuentaUi();
  const [v, setV] = useState(p);
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
  ];
  const B: Bloque[] = [
    { type: "note", tone: "warn", ic: "bell", t: E2("Los avisos al teléfono llegan pronto", "Phone notifications are coming soon"), s: E2("Mientras, todo lo ves en Mi cuenta y en la página de cada pedido, reservación o solicitud. Lo que elijas aquí queda guardado y se aplica desde el primer aviso.", "Meanwhile you see everything in My account and on each order, booking or application page. What you choose here is saved and applies from the first notification.") },
    { type: "note", tone: "info", ic: "lock", t: E2("Esto siempre te llega", "You always get these"), s: E2("El código para entrar. No se apaga.", "Your sign-in code. It cannot be turned off.") },
  ];
  G.forEach(([t, rows], gi) => {
    B.push({ type: "sec", t, fs: "14px", mt: gi ? "8px" : "4px" }, { type: "rows", rows: rows.map(([k, l, s]) => ({ key: k, t: l, s, tog: v[k], onTog: () => void tg(k) })) });
    // 6j · Lo crítico de Eventos no se apaga (no tiene interruptor).
    if (rows[0]?.[0] === "evt") B.push({ type: "note", tone: "info", ic: "lock", t: E2("Siempre te llega", "You always get these"), s: E2("Tu boleto comprado, devuelto o anulado, el boleto que te mandan, una cortesía, un lugar de la lista de espera, una cancelación o un cambio de fecha u hora, y la propuesta de un evento privado.", "Your ticket bought, refunded or voided, a ticket sent to you, a comp, a waitlist spot, a cancellation or a date or time change, and a private event proposal.") });
  });
  // 7h · El Compa por WhatsApp y SMS (§6 #14): apagado de fábrica; solo contesta a TU teléfono verificado y lo que cambia algo se confirma en la app.
  B.push({ type: "sec", t: "EL COMPA", fs: "14px", mt: "8px" }, { type: "rows", rows: [{ key: "cpa", ic: "chat", t: E2("Hablar con El Compa por WhatsApp y SMS", "Talk to El Compa by WhatsApp and SMS"),
    s: E2("SOLO DESDE TU TELÉFONO VERIFICADO · LO QUE CAMBIA ALGO SE CONFIRMA AQUÍ · STOP PARA SALIR", "ONLY FROM YOUR VERIFIED PHONE · ANYTHING THAT CHANGES SOMETHING IS CONFIRMED HERE · STOP TO OPT OUT"), tog: v.cpa, onTog: () => void tg("cpa") }] });
  B.push({ type: "sec", t: E2("Horas de silencio", "Quiet hours"), fs: "14px", mt: "8px" }, { type: "rows", rows: [{ ic: "clock", t: E2("De 10 PM a 7 AM", "10 PM to 7 AM"), s: E2("SOLO PASA LO CRÍTICO", "ONLY CRITICAL ONES GET THROUGH"), tog: v.quiet, onTog: () => void tg("quiet") }] });
  return <Marco es={es} code="USR-AVISOS" back="/cuenta" t={E2("Avisos", "Notifications")} s={E2("QUÉ TE LLEGA Y CUÁNDO", "WHAT YOU GET AND WHEN")} blocks={B} yo={yo} ui={ui}
    rcards={[{ label: "Avisos · regla", k: E2("NUESTRA REGLA", "OUR RULE"), t: E2("Nunca publicidad por aquí.", "Never ads here."), s: E2("Agrupamos lo que se puede: un aviso con todo, no tres.", "We group what we can: one notification with everything, not three.") }]} />;
}
