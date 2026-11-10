/* 7b · Soporte: lo que el navegador y el servidor comparten (sin base). Temas (sop-store.js CAT: [en el formulario ES, EN, corto ES, EN]),
   estados como los ve la persona (RECIBIDO · LO ESTÁN VIENDO · TE RESPONDIERON · RESUELTO; más UNIDO para un duplicado) y el horario
   del equipo dicho con palabras desde los números de Configuración (soporte_dias, soporte_desde_h, soporte_hasta_h). */
export type Tema = "pedido" | "cita" | "pago" | "negocio" | "cuenta" | "tecnico" | "sugerencia" | "seguridad";
type Bi = { es: string; en: string };
export const TEMAS: Record<Tema, { form: Bi; corto: Bi }> = {
  pedido: { form: { es: "Un pedido", en: "An order" }, corto: { es: "Pedido", en: "Order" } },
  cita: { form: { es: "Una cita o reservación", en: "A booking or reservation" }, corto: { es: "Cita", en: "Booking" } },
  pago: { form: { es: "Un pago o un cobro", en: "A payment or a charge" }, corto: { es: "Pago", en: "Payment" } },
  negocio: { form: { es: "Un negocio o una reseña", en: "A business or a review" }, corto: { es: "Negocio", en: "Business" } },
  cuenta: { form: { es: "Mi cuenta", en: "My account" }, corto: { es: "Cuenta", en: "Account" } },
  tecnico: { form: { es: "La app no funciona bien", en: "The app is not working well" }, corto: { es: "Técnico", en: "Technical" } },
  sugerencia: { form: { es: "Una idea para To'Latino", en: "An idea for To'Latino" }, corto: { es: "Sugerencia", en: "Suggestion" } },
  seguridad: { form: { es: "Me siento en riesgo o alguien entró a mi cuenta", en: "I feel unsafe or someone got into my account" }, corto: { es: "Seguridad", en: "Safety" } },
};
/* Lo que se elige en el formulario: la persona (7, como el diseño) y un negocio desde su panel (hueco #8: pago · cuenta · técnico · sugerencia). */
export const TEMAS_VECINO: Tema[] = ["pedido", "cita", "pago", "negocio", "cuenta", "tecnico", "sugerencia"];
export const TEMAS_NEGOCIO: Tema[] = ["pago", "cuenta", "tecnico", "sugerencia"];
/* Temas con «¿CUÁL?» (las operaciones de la persona). */
export const CON_OPERACION: Tema[] = ["pedido", "cita", "pago"];

export type EstadoVecino = "nuevo" | "curso" | "espera" | "res" | "unido";
export const ESTADO_VECINO: Record<EstadoVecino, { l: Bi; tone: string }> = {
  nuevo: { l: { es: "RECIBIDO", en: "RECEIVED" }, tone: "neutral" },
  curso: { l: { es: "LO ESTÁN VIENDO", en: "IN REVIEW" }, tone: "action" },
  espera: { l: { es: "TE RESPONDIERON", en: "THEY REPLIED" }, tone: "action" },
  res: { l: { es: "RESUELTO", en: "RESOLVED" }, tone: "signal" },
  unido: { l: { es: "UNIDO A OTRO", en: "MERGED" }, tone: "neutral" },
};
/* Estados del equipo (Super Admin). */
export const ESTADO_EQUIPO: Record<string, Bi> = {
  new: { es: "Nuevo", en: "New" }, in_progress: { es: "En curso", en: "In progress" }, waiting: { es: "Esperando a la persona", en: "Waiting on the person" },
  resolved: { es: "Resuelto", en: "Resolved" }, reopened: { es: "Reabierto", en: "Reopened" }, merged: { es: "Unido", en: "Merged" },
};

const hora = (h: number, es: boolean) => (h === 0 || h === 24 ? (es ? "12 AM" : "12 AM") : h === 12 ? "12 PM" : h < 12 ? `${h} AM` : `${h - 12} PM`);
/* «lunes a viernes, de 9 AM a 6 PM» (la línea fija de fase7-compa §1c, con los valores de Configuración). */
export function horarioEquipo(h: { dias: number; desde: number; hasta: number }, es: boolean): string {
  const d = h.dias >= 7 ? (es ? "todos los días" : "every day") : h.dias === 6 ? (es ? "lunes a sábado" : "Monday to Saturday") : (es ? "lunes a viernes" : "Monday to Friday");
  return es ? `${d}, de ${hora(h.desde, true)} a ${hora(h.hasta, true)}` : `${d}, ${hora(h.desde, false)} to ${hora(h.hasta, false)}`;
}
/* Corto para una fila: «lun–vie 9 AM–6 PM». */
export function horarioCorto(h: { dias: number; desde: number; hasta: number }, es: boolean): string {
  const d = h.dias >= 7 ? (es ? "todos los días" : "every day") : h.dias === 6 ? (es ? "lun–sáb" : "Mon–Sat") : (es ? "lun–vie" : "Mon–Fri");
  return `${d} ${hora(h.desde, es)}–${hora(h.hasta, es)}`;
}
