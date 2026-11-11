"use server";
/* 7e · Panel › El Compa (DASH-COMPA): las únicas puertas del panel al motor de El Compa. Cada una: desde nuestra página (mismoOrigen), con
   SESIÓN (la persona sale de yo(), nunca del teléfono) y con acceso al panel de ESE negocio (accesoPanel, cualquier miembro activo: el asistente
   solo explica y lleva a lo que esa persona puede abrir). Nada aquí decide: lib/compa/* decide (y vuelve a comprobar en la base que la persona es
   miembro de ese negocio) y la base vuelve a revisar.
   - compaPanelPreguntar: lo que la persona escribe → turnoPanel().
   - compaPanelPersona: «Con una persona» → caso de Soporte del negocio (turnoPanel con persona).
   - compaPanelIr: «Ir a …» = confirmar la acción go_to_panel (un uso; acciones.ts vuelve a pedir accesoPanel con la parte de esa sección).
   - compaPanelNuevo: «Empezar de nuevo» (cierra la conversación; nada se borra). */
import { mismoOrigen, yo } from "@/lib/cuenta";
import { confirmar } from "@/lib/compa/acciones";
import { cerrarPanel, turnoPanel, type TurnoPanel } from "@/lib/compa/conversacion";
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
