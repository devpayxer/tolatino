import "server-only";
import type { Lang, TrozoModelo } from "./modelo";
import { LINEAS } from "./reglas";

/* 7c · Las reglas fijas del prototipo (datos/compa.js `fallback`), ES/EN, apoyadas en la ayuda: El Compa SIN IA. Contestan cuando el modelo
   no puede (al tope, apagado, lento, con error, rechazo o una salida que no pasó el verificador). Misma forma de salida que el modelo, así
   que la acción que preparen pasa por la misma validación contra la sesión. Nunca dicen que hicieron algo. */
type OpCtx = { ref: string; negocio: string; cancelable_gratis: boolean };
export type SalidaReglas = { respuesta: string; tipo: "respuesta" | "pregunta" | "no_se"; fuente: string; accion: { tipo: string; ref: string; pantalla: string }; persona: string; chips: string[] };

const frases = (t: string, n: number) => t.replace(/(^|\n)\s*[-•]\s+/g, "$1").replace(/[#*_`>|]/g, " ").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/\s+/g, " ").trim()
  .split(/(?<=[.!?])\s+/).filter((x) => x.length > 3).slice(0, n).join(" ");

export function responderConReglas(x: { texto: string; lang: Lang; ops: OpCtx[]; trozos: TrozoModelo[] }): SalidaReglas {
  const es = x.lang === "es", t = x.texto.toLowerCase(), nada = { tipo: "ninguna", ref: "", pantalla: "" };
  const p = x.ops.find((o) => o.cancelable_gratis);
  if (/\b(cancel|cancela|cancelar|cancelo|anular)/.test(t) && p)
    return { tipo: "respuesta", fuente: "cuenta", persona: "ninguno", chips: [], accion: { tipo: "cancel_request", ref: p.ref, pantalla: "" },
      respuesta: es ? `Te preparé la cancelación de tu solicitud en ${p.negocio}. Como todavía no está confirmada, no pagas nada.` : `I prepared the cancellation of your request at ${p.negocio}. It isn't confirmed yet, so you pay nothing.` };
  const f = x.trozos[0];
  if (f) {
    const r = frases(f.texto, 2);
    if (r) return { tipo: "respuesta", fuente: f.fuente, persona: "ninguno", chips: [], accion: nada, respuesta: r.length > 400 ? r.slice(0, 397).replace(/\s+\S*$/, "") + "…" : r };
  }
  return { tipo: "pregunta", fuente: "", persona: "ninguno", accion: nada,
    respuesta: es ? "No estoy seguro de entenderte. ¿Es sobre una cita, un pedido o un pago? Si prefieres, te paso con una persona." : "I'm not sure I follow. Is it about a booking, an order or a payment? If you prefer, I'll pass you to a person.",
    chips: es ? ["Una cita", "Un pedido", "Un pago"] : ["A booking", "An order", "A payment"] };
}
export const lineaNoSe = (lang: Lang) => LINEAS.noSe[lang];

/* 7e · Las reglas fijas del PANEL (prototipo `ownFallback`), sin IA: la ayuda de su audiencia (vecino + negocio, sin la de partes que no tiene)
   y, si el servidor reconoció la sección y la persona la puede abrir, «Ir a …» (go_to_panel, que pasa por la misma validación). Si no hay
   nada, una pregunta corta con las secciones que SÍ puede abrir. Nunca dicen que hicieron algo. */
export function responderPanelConReglas(x: { lang: Lang; seccion: { code: string; titulo: string } | null; puede: string[]; trozos: TrozoModelo[] }): SalidaReglas {
  const es = x.lang === "es", nada = { tipo: "ninguna", ref: "", pantalla: "" };
  const ir = x.seccion ? { tipo: "go_to_panel", ref: x.seccion.code, pantalla: "" } : nada;
  const f = x.trozos[0];
  if (f) {
    const r = frases(f.texto, 2);
    if (r) return { tipo: "respuesta", fuente: f.fuente, persona: "ninguno", chips: [], accion: ir, respuesta: r.length > 400 ? r.slice(0, 397).replace(/\s+\S*$/, "") + "…" : r };
  }
  if (x.seccion) return { tipo: "respuesta", fuente: "cuenta", persona: "ninguno", chips: [], accion: ir,
    respuesta: es ? `Eso está en ${x.seccion.titulo}. Te llevo.` : `That is in ${x.seccion.titulo}. I'll take you there.` };
  return { tipo: "pregunta", fuente: "", persona: "ninguno", accion: nada, chips: x.puede.slice(0, 3),
    respuesta: es ? "No estoy seguro de entenderte. ¿Es sobre alguna de estas partes de tu panel? Si prefieres, te paso con una persona." : "I'm not sure I follow. Is it about one of these parts of your dashboard? If you prefer, I'll pass you to a person." };
}
