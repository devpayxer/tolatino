"use client";
/* USR-MENSAJES (diseño «To'Latino Mi cuenta» · msgsV): nota de privacidad, una fila por negocio (NUEVO si hay algo sin
   leer, el contexto y el último mensaje) y el acceso a los mensajes con vecinos (llega con Comunidad). */
import { useRouter } from "next/navigation";
import type { Hilo } from "@/lib/mensajes";
import { Marco, useCuentaUi, type Bloque, type Yo } from "../Marco";
import { diaCorto, horaDe } from "../fechas";

const TZ = "America/New_York";
/* Los avisos del sistema se guardan en los dos idiomas («es · en»): se muestra el de la pantalla. */
export const sistema = (t: string, es: boolean) => (es ? t.split(" · ")[0]! : t.split(" · ")[1] ?? t);
export function cuando(iso: string, es: boolean) {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return es ? "AHORA" : "NOW";
  if (min < 60) return es ? `HACE ${min} MIN` : `${min} MIN AGO`;
  if (min < 24 * 60) return es ? `HACE ${Math.floor(min / 60)} H` : `${Math.floor(min / 60)} H AGO`;
  return `${diaCorto(iso, TZ, es)} · ${horaDe(iso, TZ, es)}`.toUpperCase();
}

export function Mensajes({ d, es, yo, pagina }: { d: { hilos: Hilo[]; mas: string | null }; es: boolean; yo: Yo; pagina: boolean }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter(), ui = useCuentaUi();
  const T = d.hilos, nuevos = T.filter((t) => t.unread).length;
  const B: Bloque[] = [
    { type: "note", tone: "info", ic: "lock", s: E2("Aquí hablas con los negocios: les escribes desde su página, tu pedido o tu reservación. Tu número no se comparte.", "Here you talk with businesses: write to them from their page, your order or your booking. Your number is never shared.") },
    T.length ? { type: "rows", rows: T.map((t) => ({
      key: t.id, ph: t.foto, ini: t.nombre.slice(0, 1), t: t.nombre, tag: t.unread ? [E2("NUEVO", "NEW"), "action"] as [string, string] : null,
      s: `${(t.ctx ? (es ? t.ctx.es : t.ctx.en) : E2("Consulta general", "General question")).toUpperCase()} · ${cuando(t.at, es)}`,
      x: `${t.lastFrom === "user" ? E2("Tú: ", "You: ") : t.lastFrom === "auto" ? E2("Respuesta automática: ", "Auto-reply: ") : ""}${t.lastFrom === "system" ? sistema(t.last ?? "", es) : t.last ?? ""}`, chev: true,
      on: () => router.push(`/cuenta/mensajes/${t.negocio}`),
    })) } : { type: "empty", ic: "chat", t: pagina ? E2("No hay más", "No more") : E2("Sin mensajes", "No messages"), s: E2("Cuando le escribas a un negocio, la conversación sale aquí.", "When you write to a business, the conversation shows here."), cta: pagina ? E2("Volver al principio", "Back to the top") : E2("Buscar negocios", "Find businesses"), onCta: () => router.push(pagina ? "/cuenta/mensajes" : "/negocios") },
    d.mas ? { type: "more", l: E2("Ver más antiguas", "See older"), on: () => router.push(`/cuenta/mensajes?antes=${encodeURIComponent(d.mas!)}`) } : null,
    { type: "rows", rows: [{ key: "vec", ic: "users", t: E2("Mensajes con vecinos", "Messages with neighbors"), s: E2("EN LA COMUNIDAD · LLEGA PRONTO", "IN THE COMMUNITY · COMING SOON") }] },
  ].filter(Boolean) as Bloque[];
  return <Marco es={es} code="USR-MENSAJES" t={E2("Mensajes", "Messages")} s={nuevos ? `${nuevos} ${E2(nuevos === 1 ? "NUEVO" : "NUEVOS", "NEW")}` : E2("CON LOS NEGOCIOS", "WITH BUSINESSES")} blocks={B} yo={yo} ui={ui} />;
}
