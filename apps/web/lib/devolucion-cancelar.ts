/* 9v (25 nov, tercera tanda) · Lo que pasó con el dinero cuando el NEGOCIO cancela (la salida de un viaje, una mesa de la noche, una inscripción o el
   grupo que no abre, una fecha de fiesta), dicho como pasó y nunca como se decidió. Antes el aviso decía «Te devolvemos todo» y el panel «todos reciben
   su dinero» sin mirar a la pasarela, también cuando Stripe dijo que no o no contestó (y con «por: business» nadie del equipo se enteraba). El estado lo
   decide el servidor (cobros › devolverAlCancelar, leído de la base por la llave de la devolución); aquí solo los textos, ES/EN, para el aviso a quien
   pagó ({dinero} de viaje_cancelada, noche_biz_cx, insc_biz_cx, insc_grupo_cx y fiesta_biz_cx: 0220) y para el panel del negocio. Sin «server-only»: la
   pantalla del panel arma su línea con lo que respondió la acción. Guardián devueltoSoloSiSalio. */
type Bi = { es: string; en: string };
export type EstadoCancelar = "hecha" | "en_camino" | "fallida" | "liberada" | "nada";
export type DevCancelar = { e: EstadoCancelar; monto: number };
/* Lo que la acción del panel le responde a la pantalla: cuántas devoluciones salieron, cuántas van en camino y cuántas no salieron. */
export type DevCuenta = { hechas: number; camino: number; fallidas: number };

const usd = (c: number) => `$${(c / 100).toFixed(2)}`;

/* {dinero} del aviso a quien pagó. */
export function dineroAlCancelar(d: DevCancelar): Bi {
  if (d.e === "hecha") return { es: `Te devolvimos ${usd(d.monto)} a tu tarjeta; tu banco lo muestra en 3–5 días hábiles.`, en: `We refunded ${usd(d.monto)} to your card; your bank shows it in 3–5 business days.` };
  if (d.e === "en_camino") return { es: `La devolución de ${usd(d.monto)} a tu tarjeta va en camino: la seguimos mandando sola.`, en: `The ${usd(d.monto)} refund to your card is on its way: we keep sending it automatically.` };
  if (d.e === "fallida") return { es: `La devolución de ${usd(d.monto)} no salió: el equipo de To'Latino ya tiene el aviso para resolverlo contigo.`, en: `The ${usd(d.monto)} refund did not go through: the To'Latino team already has the alert to sort it out with you.` };
  if (d.e === "liberada") return { es: `No se cobró nada: la retención de ${usd(d.monto)} se suelta de tu tarjeta.`, en: `Nothing was charged: the ${usd(d.monto)} hold comes off your card.` };
  return { es: "No se cobró nada.", en: "Nothing was charged." };
}

export const sinDevoluciones = (): DevCuenta => ({ hechas: 0, camino: 0, fallidas: 0 });
export function contar(c: DevCuenta, d: DevCancelar): DevCuenta {
  return { hechas: c.hechas + (d.e === "hecha" ? 1 : 0), camino: c.camino + (d.e === "en_camino" ? 1 : 0), fallidas: c.fallidas + (d.e === "fallida" ? 1 : 0) };
}

/* La línea del panel después de «Sí, cancelar y devolver»: lo que salió, lo que va en camino y lo que no salió (lo tiene el equipo de To'Latino). */
export function textoPanelCancelar(d: DevCuenta | undefined): Bi {
  const x = d ?? sinDevoluciones(), t = x.hechas + x.camino + x.fallidas;
  if (!t) return { es: "No se había cobrado nada.", en: "Nothing had been charged." };
  if (t === 1) {
    if (x.fallidas) return { es: "La devolución no salió: el equipo de To'Latino ya tiene el aviso y lo resuelve con el cliente.", en: "The refund did not go through: the To'Latino team already has the alert and sorts it out with the client." };
    if (x.camino) return { es: "La devolución va en camino: se manda sola. Le avisamos.", en: "The refund is on its way: it is sent automatically. We let them know." };
    return { es: "Le devolvimos todo. Le avisamos.", en: "We refunded everything. We let them know." };
  }
  const es: string[] = [], en: string[] = [];
  if (x.hechas) { es.push(`${x.hechas} ${x.hechas === 1 ? "hecha" : "hechas"}`); en.push(`${x.hechas} done`); }
  if (x.camino) { es.push(`${x.camino} en camino (se ${x.camino === 1 ? "manda sola" : "mandan solas"})`); en.push(`${x.camino} on the way (sent automatically)`); }
  if (x.fallidas) { es.push(`${x.fallidas} no ${x.fallidas === 1 ? "salió" : "salieron"}: el equipo de To'Latino ya tiene el aviso`); en.push(`${x.fallidas} did not go through: the To'Latino team already has the alert`); }
  return { es: `Devoluciones: ${es.join(" · ")}.`, en: `Refunds: ${en.join(" · ")}.` };
}
