"use server";
/* 7e · Panel › El Compa (DASH-COMPA): las únicas puertas del panel al motor de El Compa. Cada una: desde nuestra página (mismoOrigen), con
   SESIÓN (la persona sale de yo(), nunca del teléfono) y con acceso al panel de ESE negocio (accesoPanel, cualquier miembro activo: el asistente
   solo explica y lleva a lo que esa persona puede abrir). Nada aquí decide: lib/compa/* decide (y vuelve a comprobar en la base que la persona es
   miembro de ese negocio) y la base vuelve a revisar.
   - compaPanelPreguntar: lo que la persona escribe → turnoPanel().
   - compaPanelPersona: «Con una persona» → caso de Soporte del negocio (turnoPanel con persona).
   - compaPanelIr: «Ir a …» = confirmar la acción go_to_panel (un uso; acciones.ts vuelve a pedir accesoPanel con la parte de esa sección).
   - compaPanelNuevo: «Empezar de nuevo» (cierra la conversación; nada se borra).
   7f · Respuestas automáticas (Pro) y «Sugerir respuesta con El Compa»: piden accesoPanel(negocio, "msg") — el dueño o quien lleva Mensajes;
   un miembro sin Mensajes no las ve ni las cambia (el servidor lo vuelve a decir aquí, no la pantalla). Pro lo revisa lib/compa (y la base).
   - compaAutoGuardar: encender/apagar, temas y la nota «Lo que El Compa debe saber» (auditoría del negocio).
   - compaAutoProbar: «Pruébalo como cliente» (no escribe en Mensajes ni en el registro del negocio).
   - compaAutoTraducir: «Traducir» la nota con el traductor propio (5h; el texto no sale de nuestros servidores).
   - compaSugerir: «Sugerir respuesta con El Compa» en una conversación: devuelve un BORRADOR; nunca envía. */
import { mismoOrigen, yo } from "@/lib/cuenta";
import { confirmar } from "@/lib/compa/acciones";
import { borradorNegocio, cerrarPanel, probarAuto, turnoPanel, type TurnoPanel } from "@/lib/compa/conversacion";
import { guardarAuto } from "@/lib/compa/respuesta-auto";
import { SinTraductor, traducirTexto } from "@/lib/traductor";
import { evento } from "@/lib/eventos";
import { idioma } from "@/lib/idioma";
import { accesoPanel } from "@/lib/panel";
import type { Res } from "./acciones";

type ResCpa = Res & { href?: string; apagado?: boolean };
const SIN: ResCpa = { ok: false, mensaje: { es: "No tienes acceso a este panel.", en: "You don’t have access to this dashboard." } };
const cp = (x: unknown) => (typeof x === "string" && /^CP-\d{4,12}$/.test(x) ? x : null);
const res = async (r: TurnoPanel): Promise<ResCpa> => {
  if (!r.ok) return { ok: false, mensaje: r.msg, apagado: !!r.apagado };
  await evento("compa_mensaje", { props: { superficie: "panel", motor: r.motor, tipo: r.tipo } });
  if (r.persona) await evento("compa_persona", { props: { superficie: "panel" } });
  return { ok: true };
};

export async function compaPanelPreguntar(id: string, texto: string, conversacion?: string | null): Promise<ResCpa> {
  if (!(await mismoOrigen())) return SIN;
  const a = typeof id === "string" ? await accesoPanel(id) : null;
  if (!a) return SIN;
  return res(await turnoPanel({ userId: a.yo.id }, { negocio: a.negocio.id, texto: String(texto ?? "").slice(0, 2000), conversacion: cp(conversacion), lang: await idioma() }));
}

export async function compaPanelPersona(id: string, conversacion?: string | null): Promise<ResCpa> {
  if (!(await mismoOrigen())) return SIN;
  const a = typeof id === "string" ? await accesoPanel(id) : null;
  if (!a) return SIN;
  return res(await turnoPanel({ userId: a.yo.id }, { negocio: a.negocio.id, persona: true, conversacion: cp(conversacion), lang: await idioma() }));
}

export async function compaPanelIr(id: string, accion: string): Promise<ResCpa> {
  if (!(await mismoOrigen())) return SIN;
  const a = typeof id === "string" ? await accesoPanel(id) : null;
  const u = await yo();
  if (!a || !u || a.yo.id !== u.id) return SIN;
  const r = await confirmar({ userId: u.id }, String(accion ?? ""), "app");
  if (!r.ok) return { ok: false, mensaje: r.msg };
  if (r.tipo !== "go_to_panel" || !r.href?.startsWith(`/panel/${a.negocio.id}`)) return SIN;
  await evento("compa_accion", { props: { tipo: r.tipo } });
  return { ok: true, href: r.href };
}

export async function compaPanelNuevo(id: string): Promise<ResCpa> {
  if (!(await mismoOrigen())) return SIN;
  const a = typeof id === "string" ? await accesoPanel(id) : null;
  if (!a) return SIN;
  await cerrarPanel(a.yo.id, a.negocio.id);
  return { ok: true };
}

const SIN_MSG: ResCpa = { ok: false, mensaje: { es: "Las respuestas automáticas las cambia el dueño o quien lleva Mensajes.", en: "Auto-replies are changed by the owner or whoever handles Messages." } };
export async function compaAutoGuardar(id: string, cambios: { enabled?: boolean; temas?: string[]; nota?: { es?: string; en?: string } }): Promise<ResCpa> {
  if (!(await mismoOrigen())) return SIN;
  const a = typeof id === "string" ? await accesoPanel(id, "msg") : null;
  if (!a) return SIN_MSG;
  const x = cambios && typeof cambios === "object" ? cambios : {};
  const r = await guardarAuto(a.yo.id, a.negocio.id, {
    enabled: typeof x.enabled === "boolean" ? x.enabled : undefined,
    temas: Array.isArray(x.temas) ? x.temas.slice(0, 4).map((t) => String(t).slice(0, 20)) : undefined,
    nota: x.nota && typeof x.nota === "object" ? { es: String(x.nota.es ?? "").slice(0, 2000), en: String(x.nota.en ?? "").slice(0, 2000) } : undefined,
  });
  return r.ok ? { ok: true } : { ok: false, mensaje: r.msg };
}
export async function compaAutoProbar(id: string, texto: string, conversacion?: string | null): Promise<ResCpa & { texto?: string; pasa?: boolean; conversacion?: string; etiqueta?: string | null }> {
  if (!(await mismoOrigen())) return SIN;
  const a = typeof id === "string" ? await accesoPanel(id, "msg") : null;
  if (!a) return SIN_MSG;
  const r = await probarAuto({ userId: a.yo.id }, { negocio: a.negocio.id, texto: String(texto ?? "").slice(0, 2000), conversacion: cp(conversacion), lang: await idioma() });
  if (!r.ok) return { ok: false, mensaje: r.msg, apagado: !!r.apagado };
  return { ok: true, texto: r.texto, pasa: r.pasa, conversacion: r.conversacion, etiqueta: r.etiqueta };
}
export async function compaAutoTraducir(id: string, texto: string): Promise<ResCpa & { en?: string }> {
  if (!(await mismoOrigen())) return SIN;
  const a = typeof id === "string" ? await accesoPanel(id, "msg") : null;
  if (!a) return SIN_MSG;
  const t = String(texto ?? "").slice(0, 400);
  if (!t.trim()) return { ok: true, en: "" };
  try { return { ok: true, en: (await traducirTexto(t, "es", "en")).texto.slice(0, 400) }; }
  catch (e) { if (e instanceof SinTraductor) return { ok: false, mensaje: { es: "La traducción no está disponible ahora. Escríbelo tú.", en: "Translation is not available right now. Type it yourself." } }; throw e; }
}
export async function compaSugerir(id: string, hilo: string): Promise<ResCpa & { texto?: string }> {
  if (!(await mismoOrigen())) return SIN;
  const a = typeof id === "string" ? await accesoPanel(id, "msg") : null;
  if (!a) return { ok: false, mensaje: { es: "No tienes acceso a Mensajes.", en: "You don’t have access to Messages." } };
  const r = await borradorNegocio({ userId: a.yo.id }, { negocio: a.negocio.id, hilo: String(hilo ?? "").slice(0, 20), lang: await idioma() });
  if (!r.ok) return { ok: false, mensaje: r.msg };
  await evento("compa_mensaje", { props: { superficie: "business_chat", motor: r.motor, tipo: "borrador" } });
  return { ok: true, texto: r.texto };
}
