"use server";
/* 7d · El Compa para vecinos: las acciones de la hoja de ayuda (2as) y de los pasos guiados (2at). Las únicas puertas de verdad al motor para un
   vecino (la ruta /api/interno/compa es solo de pruebas). Cada una: desde nuestra página (mismoOrigen), con SESIÓN (la persona sale de yo(),
   nunca del teléfono), con el idioma de la persona y con los límites del motor (compa_msgs_hora / compa_msgs_dia por persona; un id de acción
   de un uso; casos por día de Soporte). Nada aquí decide: lib/compa/* decide y la base vuelve a revisar.
   - compaTurno: lo que la persona escribe → turno() (con la operación de la hoja, que tiene que ser suya).
   - compaPaso: lo que la persona toca (razón fija, opción de pago o de cuenta, «Con una persona») → paso().
   - compaConfirmar / compaDescartar: la acción preparada, en OTRA petición, con el id de un uso (acciones.ts). */
import { mismoOrigen, yo } from "@/lib/cuenta";
import { confirmar, descartar, type ResAccion } from "@/lib/compa/acciones";
import { paso, turno, type Paso, type Turno } from "@/lib/compa/conversacion";
import { evento } from "@/lib/eventos";
import { idioma } from "@/lib/idioma";

type Bi = { es: string; en: string };
const SIN: Bi = { es: "Entra para que El Compa vea tus pedidos y citas.", en: "Sign in so El Compa can see your orders and bookings." };
const cp = (x: unknown) => (typeof x === "string" && /^CP-\d{4,12}$/.test(x) ? x : null);
const num = (x: unknown) => (typeof x === "string" && /^([A-Z]{1,2}-)?\d{1,12}$/.test(x) ? x : null);

export async function compaTurno(texto: string, conversacion?: string | null, numero?: string | null): Promise<Turno> {
  if (!(await mismoOrigen())) return { ok: false, msg: SIN };
  const u = await yo();
  if (!u) return { ok: false, msg: SIN };
  const lang = await idioma(), n = num(numero);
  const r = await turno({ userId: u.id }, { texto: String(texto ?? "").slice(0, 2000), conversacion: cp(conversacion), uso: "neighbor", canal: "app",
    superficie: n ? "help_sheet" : "support_page", lang, operacion: n });
  if (r.ok) {
    await evento("compa_mensaje", { props: { superficie: n ? "help_sheet" : "support_page", motor: r.motor, tipo: r.tipo } });
    if (r.persona) await evento("compa_persona", { props: { superficie: n ? "help_sheet" : "support_page" } });
  }
  return r;
}

export async function compaPaso(que: string, numero?: string | null, conversacion?: string | null, superficie?: string | null): Promise<Paso> {
  if (!(await mismoOrigen())) return { ok: false, msg: SIN };
  const u = await yo();
  if (!u) return { ok: false, msg: SIN };
  const lang = await idioma(), sup = superficie === "help_sheet" ? "help_sheet" : "support_page";
  const r = await paso({ userId: u.id }, { conversacion: cp(conversacion), numero: num(numero), paso: String(que ?? "").slice(0, 20), superficie: sup, lang });
  if (r.ok && r.persona) await evento("compa_persona", { props: { superficie: sup } });
  return r;
}

export async function compaConfirmar(id: string): Promise<ResAccion> {
  if (!(await mismoOrigen())) return { ok: false, estado: "no", msg: SIN };
  const u = await yo();
  if (!u) return { ok: false, estado: "no", msg: SIN };
  const r = await confirmar({ userId: u.id }, String(id ?? ""), "app");
  if (r.ok) await evento("compa_accion", { props: { tipo: r.tipo } });
  return r;
}

export async function compaDescartar(id: string): Promise<ResAccion> {
  if (!(await mismoOrigen())) return { ok: false, estado: "no", msg: SIN };
  const u = await yo();
  if (!u) return { ok: false, estado: "no", msg: SIN };
  return descartar({ userId: u.id }, String(id ?? ""));
}
