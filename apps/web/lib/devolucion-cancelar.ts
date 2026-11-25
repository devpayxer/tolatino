/* 9v (25 nov, tercera tanda) · Lo que pasó con el dinero cuando el NEGOCIO cancela (la salida de un viaje, una mesa de la noche, una inscripción o el
   grupo que no abre, una fecha de fiesta), dicho como pasó y nunca como se decidió. Antes el aviso decía «Te devolvemos todo» y el panel «todos reciben
   su dinero» sin mirar a la pasarela, también cuando Stripe dijo que no o no contestó (y con «por: business» nadie del equipo se enteraba). El estado lo
   decide el servidor (cobros › devolverAlCancelar, leído de la base por la llave de la devolución); aquí solo los textos, ES/EN, para el aviso a quien
   pagó ({dinero} de viaje_cancelada, noche_biz_cx, insc_biz_cx, insc_grupo_cx y fiesta_biz_cx: 0220) y para el panel del negocio. Sin «server-only»: la
   pantalla del panel arma su línea con lo que respondió la acción. Guardián devueltoSoloSiSalio.
   25 nov (cuarta tanda) · También cuando cancela QUIEN PAGÓ (viaje_cx, noche_cx, fiesta_cx, insc_cx, evp_cancelado) y el evento privado que cancela el
   restaurante (evp_cancelado_negocio): 0221. Y lo retenido se dice aparte: «liberada» (se soltó) o «retenida» (Stripe no la soltó todavía: el barrido la
   sigue soltando y el equipo de dinero tiene la alerta); el panel ya no cuenta una retención soltada como «Le devolvimos todo». */
type Bi = { es: string; en: string };
export type EstadoCancelar = "hecha" | "en_camino" | "fallida" | "liberada" | "retenida" | "nada";
export type DevCancelar = { e: EstadoCancelar; monto: number };
/* Lo que la acción del panel le responde a la pantalla: cuántas devoluciones salieron, cuántas van en camino y cuántas no salieron; y cuántas
   retenciones (nada cobrado) se soltaron y cuántas no se soltaron todavía. */
export type DevCuenta = { hechas: number; camino: number; fallidas: number; liberadas: number; retenidas: number };

const usd = (c: number) => `$${(c / 100).toFixed(2)}`;

/* {dinero} del aviso a quien pagó. */
export function dineroAlCancelar(d: DevCancelar): Bi {
  if (d.e === "hecha") return { es: `Te devolvimos ${usd(d.monto)} a tu tarjeta; tu banco lo muestra en 3–5 días hábiles.`, en: `We refunded ${usd(d.monto)} to your card; your bank shows it in 3–5 business days.` };
  if (d.e === "en_camino") return { es: `La devolución de ${usd(d.monto)} a tu tarjeta va en camino: la seguimos mandando sola.`, en: `The ${usd(d.monto)} refund to your card is on its way: we keep sending it automatically.` };
  if (d.e === "fallida") return { es: `La devolución de ${usd(d.monto)} no salió: el equipo de To'Latino ya tiene el aviso para resolverlo contigo.`, en: `The ${usd(d.monto)} refund did not go through: the To'Latino team already has the alert to sort it out with you.` };
  if (d.e === "liberada") return { es: `No se cobró nada: la retención de ${usd(d.monto)} se suelta de tu tarjeta.`, en: `Nothing was charged: the ${usd(d.monto)} hold comes off your card.` };
  if (d.e === "retenida") return { es: `No se cobró nada, pero la retención de ${usd(d.monto)} todavía no se soltó de tu tarjeta: la seguimos soltando sola y el equipo de To'Latino ya tiene el aviso.`,
    en: `Nothing was charged, but the ${usd(d.monto)} hold has not come off your card yet: we keep releasing it automatically and the To'Latino team already has the alert.` };
  return { es: "No se cobró nada.", en: "Nothing was charged." };
}

/* {dinero} cuando cancela QUIEN PAGÓ: lo que se queda el negocio por la regla (queda: «Se cobró la mitad…», «El depósito … se quedó con …», «Saliste de la
   lista.»), y después lo que de verdad pasó con el resto (d, de devolverAlCancelar). Sin d (no había nada que devolver), solo lo que se queda. */
export function dineroAlCancelarCliente(d: DevCancelar | null, queda?: Bi): Bi {
  if (!queda) return dineroAlCancelar(d ?? { e: "nada", monto: 0 });
  if (!d || d.e === "nada") return queda;
  const r = dineroAlCancelar(d);
  return { es: `${queda.es} ${r.es}`, en: `${queda.en} ${r.en}` };
}

export const sinDevoluciones = (): DevCuenta => ({ hechas: 0, camino: 0, fallidas: 0, liberadas: 0, retenidas: 0 });
export function contar(c: DevCuenta, d: DevCancelar): DevCuenta {
  return { hechas: c.hechas + (d.e === "hecha" ? 1 : 0), camino: c.camino + (d.e === "en_camino" ? 1 : 0), fallidas: c.fallidas + (d.e === "fallida" ? 1 : 0),
    liberadas: c.liberadas + (d.e === "liberada" ? 1 : 0), retenidas: c.retenidas + (d.e === "retenida" ? 1 : 0) };
}

/* La línea del panel después de «Sí, cancelar y devolver»: lo que salió, lo que va en camino y lo que no salió (lo tiene el equipo de To'Latino); y, aparte,
   lo que solo estaba retenido (nada cobrado: se soltó, o todavía no). Una retención soltada nunca cuenta como «Le devolvimos». */
export function textoPanelCancelar(d: DevCuenta | undefined): Bi {
  const x = { ...sinDevoluciones(), ...d }, dev = x.hechas + x.camino + x.fallidas, ret = x.liberadas + x.retenidas;
  if (!dev && !ret) return { es: "No se había cobrado nada.", en: "Nothing had been charged." };
  if (dev + ret === 1) {
    if (x.fallidas) return { es: "La devolución no salió: el equipo de To'Latino ya tiene el aviso y lo resuelve con el cliente.", en: "The refund did not go through: the To'Latino team already has the alert and sorts it out with the client." };
    if (x.camino) return { es: "La devolución va en camino: se manda sola. Le avisamos.", en: "The refund is on its way: it is sent automatically. We let them know." };
    if (x.liberadas) return { es: "No se había cobrado nada: se soltó la retención de su tarjeta. Le avisamos.", en: "Nothing had been charged: the hold on their card was released. We let them know." };
    if (x.retenidas) return { es: "No se había cobrado nada, pero la retención de su tarjeta no se soltó todavía: se sigue soltando sola y el equipo de To'Latino ya tiene el aviso.", en: "Nothing had been charged, but the hold on their card has not been released yet: it keeps being released automatically and the To'Latino team already has the alert." };
    return { es: "Le devolvimos todo. Le avisamos.", en: "We refunded everything. We let them know." };
  }
  const out: Bi[] = [];
  if (dev) {
    const es: string[] = [], en: string[] = [];
    if (x.hechas) { es.push(`${x.hechas} ${x.hechas === 1 ? "hecha" : "hechas"}`); en.push(`${x.hechas} done`); }
    if (x.camino) { es.push(`${x.camino} en camino (se ${x.camino === 1 ? "manda sola" : "mandan solas"})`); en.push(`${x.camino} on the way (sent automatically)`); }
    if (x.fallidas) { es.push(`${x.fallidas} no ${x.fallidas === 1 ? "salió" : "salieron"}: el equipo de To'Latino ya tiene el aviso`); en.push(`${x.fallidas} did not go through: the To'Latino team already has the alert`); }
    out.push({ es: `Devoluciones: ${es.join(" · ")}.`, en: `Refunds: ${en.join(" · ")}.` });
  }
  if (ret) {
    const es: string[] = [], en: string[] = [];
    if (x.liberadas) { es.push(`${x.liberadas} ${x.liberadas === 1 ? "soltada" : "soltadas"}`); en.push(`${x.liberadas} released`); }
    if (x.retenidas) { es.push(`${x.retenidas} sin soltar todavía: el equipo de To'Latino ya tiene el aviso`); en.push(`${x.retenidas} not released yet: the To'Latino team already has the alert`); }
    out.push({ es: `Retenciones (no se había cobrado): ${es.join(" · ")}.`, en: `Holds (nothing had been charged): ${en.join(" · ")}.` });
  }
  return { es: out.map((o) => o.es).join(" "), en: out.map((o) => o.en).join(" ") };
}
