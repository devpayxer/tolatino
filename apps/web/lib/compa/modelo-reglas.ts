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

/* 7f · Las reglas fijas de la RESPUESTA AUTOMÁTICA (prototipo autoFallback), sin IA, solo con la página del negocio de los temas encendidos:
   horario y dirección («Ahora estamos cerrados. Abrimos …»), lo que ofrece con su precio (hasta 3, sin agotados), cómo pedir y una pregunta
   frecuente que se parezca. Lo demás: tipo «no_se» (pasa al negocio). Nunca prometen nada; pasan por verificar() y verificarAuto() igual que
   el modelo. `borrador` = para «Sugerir respuesta» (habla el negocio: «Abrimos…», sin presentarse). */
type CtxAuto = { temas: string[]; proxima: string | null; direccion: string | null; horario: string | null; items: { nombre: string; precio: string; agotado: boolean }[];
  comoPedir: string[]; preguntas: { q: string; a: string }[] };
const sinA = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
export function responderAutoConReglas(x: { texto: string; lang: Lang; ctx: CtxAuto }): SalidaReglas {
  const es = x.lang === "es", t = sinA(x.texto), nada = { tipo: "ninguna", ref: "", pantalla: "" }, c = x.ctx;
  const ok = (respuesta: string): SalidaReglas => ({ tipo: "respuesta", fuente: "cuenta", persona: "ninguno", chips: [], accion: nada, respuesta });
  if (c.temas.includes("hours") && /hora|abre|abren|abrir|cierr|abiert|horario|manana|domingo|sabado|open|close|hour|when|direcc|donde|ubica|llegar|where|address|located/.test(t)) {
    const a = c.proxima ? (es ? `Ahora estamos cerrados. Abrimos ${c.proxima}.` : `We are closed now. We open ${c.proxima}.`) : es ? "Ahora estamos cerrados." : "We are closed now.";
    return ok(`${a}${c.direccion ? (es ? ` Estamos en ${c.direccion}.` : ` We are at ${c.direccion}.`) : ""}`);
  }
  if (c.temas.includes("menu") && /precio|cuanto|cuesta|menu|tienen|hay |venden|servicio|plato|price|how much|cost|menu|have|sell|service/.test(t)) {
    const L = c.items.filter((i) => !i.agotado).slice(0, 3).map((i) => (i.precio ? `${i.nombre} (${i.precio})` : i.nombre));
    if (L.length) return ok(es ? `Algunas cosas que tenemos: ${L.join(", ")}. Todo está en nuestra página de To'Latino.` : `Some of what we have: ${L.join(", ")}. Everything is on our To'Latino page.`);
  }
  if (c.temas.includes("how_to_order") && c.comoPedir.length && /pedir|pido|ordenar|orden|reserv|cita|comprar|delivery|recoger|order|book|appointment|pickup|buy/.test(t))
    return ok(c.comoPedir.slice(0, 2).join(" "));
  if (c.temas.includes("faq")) {
    const pal = (s: string) => new Set(sinA(s).split(/[^a-z0-9ñ]+/).filter((w) => w.length > 3));
    const q = pal(x.texto);
    const f = c.preguntas.map((p) => ({ p, n: [...pal(p.q)].filter((w) => q.has(w)).length })).sort((a, b) => b.n - a.n)[0];
    if (f && f.n >= 2) return ok(f.p.a.length > 380 ? `${f.p.a.slice(0, 377).replace(/\s+\S*$/, "")}…` : f.p.a);
  }
  return { tipo: "no_se", fuente: "", persona: "pidio", chips: [], accion: nada, respuesta: es ? "No tengo ese dato." : "I don't have that information." };
}
