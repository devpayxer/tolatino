/* Colas del Super Admin (ADM-COLAS, adm-data.js QUEUES): las de la Fase 1. Plazo en horas (SLA) y roles que ven cada
   cola; además del rol, la matriz de permisos (colas:ver / colas:aprobar) decide. */
export type Cola = "sello" | "nuevo" | "lic" | "medios" | "rec" | "cambio" | "rep" | "sop" | "chat" | "disputa";
export const COLAS: Record<Cola, { es: string; en: string; icon: string; sla: number; roles: string[]; regla?: [string, string] }> = {
  sello: { es: "Sello de verificación", en: "Verification badge", icon: "shield", sla: 48, roles: ["admin", "verificador", "lectura"], regla: ["Nunca se piden documentos de identidad.", "Identity documents are never requested."] },
  nuevo: { es: "Negocios nuevos", en: "New businesses", icon: "store", sla: 24, roles: ["admin", "ciudad", "verificador", "lectura"] },
  lic: { es: "Licencias", en: "Licenses", icon: "law", sla: 72, roles: ["admin", "verificador", "lectura"], regla: ["Lo que decidas se ve en la ficha Licencia.", "Your decision shows on the License page."] },
  medios: { es: "Medios marcados", en: "Flagged media", icon: "image", sla: 4, roles: ["admin", "moderador", "ciudad", "lectura"] },
  cambio: { es: "Cambios sensibles", en: "Sensitive changes", icon: "edit", sla: 48, roles: ["admin", "ciudad", "soporte", "lectura"], regla: ["Reclamos de negocios y borrados de cuentas. Un reclamo sobre un negocio con dueño lo aprueba solo un Admin después de 7 días; un borrado lo aplica otra persona, no quien lo pidió.", "Business claims and account deletions. A claim on an owned business is approved only by an Admin after 7 days; a deletion is applied by another person, not the one who asked."] },
  rep: { es: "Reportes de contenido", en: "Content reports", icon: "bubble", sla: 24, roles: ["admin", "moderador", "lectura"], regla: ["Sigue visible mientras decides (regla de 48 h). Ocultar avisa al autor con el motivo; nada se borra.", "It stays visible while you decide (48 h rule). Hiding tells the author the reason; nothing is deleted."] },
  chat: { es: "Mensajes reportados", en: "Reported messages", icon: "chat", sla: 48, roles: ["admin", "moderador", "lectura"], regla: ["Solo con un reporte abierto se puede leer la conversación. Ocultar un mensaje avisa a quien lo escribió; nada se borra.", "A conversation can be read only with an open report. Hiding a message tells its author; nothing is deleted."] },
  disputa: { es: "Disputas con el banco", en: "Bank disputes", icon: "card", sla: 168, roles: ["admin", "finanzas", "lectura"], regla: ["El banco da un plazo para responder: responde con la evidencia antes de que venza. Aceptar devuelve el dinero al cliente.", "The bank sets a deadline: respond with evidence before it ends. Accepting returns the money to the customer."] },
  sop: { es: "Ayuda con pedidos", en: "Order help", icon: "help", sla: 24, roles: ["admin", "soporte", "ciudad", "lectura"], regla: ["El negocio no respondió en 24 horas o el cliente pidió que revisemos. Tu respuesta la ve el cliente en su pedido y el negocio en su panel. Si se pagó con tarjeta, devuelves dinero desde Transacciones; si se pagó en el local, la devolución la arregla el negocio.", "The business did not reply within 24 hours or the customer asked us to review. The customer sees your reply on the order and the business in its dashboard. If paid by card, refund from Transactions; if paid in store, the business settles the refund."] },
  rec: { es: "Recomendaciones de vecinos", en: "Neighbor recommendations", icon: "like", sla: 168, roles: ["admin", "ciudad", "lectura"], regla: ["Semilla = negocio no reclamado que el dueño puede reclamar.", "Seed = unclaimed business the owner can claim."] },
};
export const ORDEN_COLAS: Cola[] = ["disputa", "sop", "cambio", "sello", "nuevo", "lic", "medios", "rep", "chat", "rec"];
export const colasDelRol = (rol: string) => ORDEN_COLAS.filter((k) => COLAS[k].roles.includes(rol));
/* Envejecimiento contra el plazo (qCard / wait del prototipo). */
export function espera(abierto: string | Date, sla: number, ahora = Date.now()) {
  const ms = ahora - new Date(abierto).getTime(), h = ms / 3_600_000, r = h / sla;
  const t = h < 1 ? `${Math.max(1, Math.round(ms / 60_000))} min` : h < 24 ? `${Math.floor(h)} h` : `${Math.floor(h / 24)} d`;
  return { r, t, state: r >= 1 ? "late" : r >= 0.7 ? "soon" : "ok", label: r >= 1 ? `${t} · VENCIDO` : r >= 0.7 ? `${t} / ${sla} h` : t };
}
/* Motivos con los que se reporta una reseña (content_reports.reason), como los dice el Super Admin. */
export const MOTIVO_RESENA: Record<string, string> = { fake: "Reseña falsa", off: "Ofensiva", pii: "Datos personales", spam: "Spam o publicidad", coi: "La escribió el dueño o la competencia", otro: "Otro motivo", negocio: "El negocio pidió revisarla" };
