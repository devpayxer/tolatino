/* 9v (25 nov, tercera tanda) · Lo que pasó con el dinero cuando el NEGOCIO cancela (la salida de un viaje, una mesa de la noche, una inscripción o el
   grupo que no abre, una fecha de fiesta), dicho como pasó y nunca como se decidió. Antes el aviso decía «Te devolvemos todo» y el panel «todos reciben
   su dinero» sin mirar a la pasarela, también cuando Stripe dijo que no o no contestó (y con «por: business» nadie del equipo se enteraba). El estado lo
   decide el servidor (cobros › devolverAlCancelar, leído de la base por la llave de la devolución); aquí solo los textos, ES/EN, para el aviso a quien
   pagó ({dinero} de viaje_cancelada, noche_biz_cx, insc_biz_cx, insc_grupo_cx y fiesta_biz_cx: 0220) y para el panel del negocio. Sin «server-only»: la
   pantalla del panel arma su línea con lo que respondió la acción. Guardián devueltoSoloSiSalio.
   25 nov (cuarta tanda) · También cuando cancela QUIEN PAGÓ (viaje_cx, noche_cx, fiesta_cx, insc_cx, evp_cancelado) y el evento privado que cancela el
   restaurante (evp_cancelado_negocio): 0221. Y lo retenido se dice aparte: «liberada» (se soltó) o «retenida» (Stripe no la soltó todavía: el barrido la
   sigue soltando y el equipo de dinero tiene la alerta); el panel ya no cuenta una retención soltada como «Le devolvimos todo». */
/* 25 nov (regla 13, LAUNCH «el dinero dice lo que pasó» g) · Y «cobrada»: la retención que se iba a soltar ya estaba COBRADA en Stripe y la base no lo
   sabía (pasarela.liberar mira el intento; cobros › soltarRetencion la anota cobrada con su monto real y alerta al equipo de dinero, cobrada:<cobro>, sin
   cerrarse sola). Nunca «No se cobró nada» ni «se soltó» de ese dinero. */
import { usd } from "./dinero-comun";
type Bi = { es: string; en: string };
export type EstadoCancelar = "hecha" | "en_camino" | "fallida" | "liberada" | "retenida" | "cobrada" | "nada";
export type DevCancelar = { e: EstadoCancelar; monto: number; regla?: ReglaTarde };
/* 25 nov (revisión de 00ac9b7) · «cobrada» en una cancelación TARDE de quien pagó: la regla se aplicó con lo cobrado (cobros › reglaTardeConLoCobrado):
   queda = lo que se quedó el negocio; dev = lo que pasó con la devolución del resto (viaje) o null (evento privado: el depósito se queda). */
export type ReglaTarde = { queda: number; dev: DevCancelar | null };
/* Lo que la acción del panel le responde a la pantalla: cuántas devoluciones salieron, cuántas van en camino y cuántas no salieron; y cuántas
   retenciones (nada cobrado) se soltaron y cuántas no se soltaron todavía. cobradas: las retenciones que Stripe ya había cobrado (solo si hay alguna). */
export type DevCuenta = { hechas: number; camino: number; fallidas: number; liberadas: number; retenidas: number; cobradas?: number };

/* El monto como lo dicen estos textos (dinero-comun › usd: «$12.50», «$45»), para quien arma su propio {dinero} (avisos › avisarPedido). */
export const usdTxt = usd;

/* {dinero} del aviso a quien pagó. */
export function dineroAlCancelar(d: DevCancelar): Bi {
  // 26 nov (revisión de 5255ce2, a) · «hecha» sin cifra (monto 0): ya se había devuelto todo lo cobrado antes de esta cancelación (cobros › devolverAlCancelar).
  if (d.e === "hecha") return d.monto > 0 ? { es: `Te devolvimos ${usd(d.monto)} a tu tarjeta; tu banco lo muestra en 3–5 días hábiles.`, en: `We refunded ${usd(d.monto)} to your card; your bank shows it in 3–5 business days.` }
    : { es: "Ya se te había devuelto todo lo cobrado.", en: "Everything charged had already been refunded to you." };
  if (d.e === "en_camino") return { es: `La devolución de ${usd(d.monto)} a tu tarjeta va en camino: la seguimos mandando sola.`, en: `The ${usd(d.monto)} refund to your card is on its way: we keep sending it automatically.` };
  if (d.e === "fallida") return { es: `La devolución de ${usd(d.monto)} no salió: el equipo de To'Latino ya tiene el aviso para resolverlo contigo.`, en: `The ${usd(d.monto)} refund did not go through: the To'Latino team already has the alert to sort it out with you.` };
  // 25 nov · Sin monto (nada que decir de él), nunca «$0.00».
  if (d.e === "liberada") return d.monto > 0 ? { es: `No se cobró nada: la retención de ${usd(d.monto)} se suelta de tu tarjeta.`, en: `Nothing was charged: the ${usd(d.monto)} hold comes off your card.` } : { es: "No se cobró nada.", en: "Nothing was charged." };
  if (d.e === "retenida") return { es: `No se cobró nada, pero la retención de ${usd(d.monto)} todavía no se soltó de tu tarjeta: la seguimos soltando sola y el equipo de To'Latino ya tiene el aviso.`,
    en: `Nothing was charged, but the ${usd(d.monto)} hold has not come off your card yet: we keep releasing it automatically and the To'Latino team already has the alert.` };
  if (d.e === "cobrada") return d.monto > 0 ? { es: `La retención no se pudo soltar: ya se habían cobrado ${usd(d.monto)} en tu tarjeta. El equipo de To'Latino ya tiene el aviso para revisarlo contigo.`,
    en: `The hold could not be released: ${usd(d.monto)} had already been charged to your card. The To'Latino team already has the alert to review it with you.` }
    : { es: "La retención no se pudo soltar: ya se había cobrado en tu tarjeta. El equipo de To'Latino ya tiene el aviso para revisarlo contigo.", en: "The hold could not be released: it had already been charged to your card. The To'Latino team already has the alert to review it with you." };
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

/* 25 nov (quinta tanda) · Lo que le pasó al dinero, dicho AL NEGOCIO cuando cancela quien pagó (biz_noche_cx, biz_fiesta_cx, biz_insc_cx: {dinero}, 0222).
   Antes decía «Se le devuelve el depósito de $X» con lo decidido, también cuando Stripe dijo que no o no contestó. Con espacio delante (la plantilla
   termina en «.{dinero}»); vacío si no había nada cobrado ni retenido. */
export function dineroAlNegocio(d: DevCancelar): Bi {
  if (d.e === "hecha") return d.monto > 0 ? { es: ` Se le devolvieron ${usd(d.monto)} a su tarjeta.`, en: ` ${usd(d.monto)} was refunded to their card.` } : { es: " Ya se le había devuelto todo lo cobrado.", en: " Everything charged had already been refunded to them." };
  if (d.e === "en_camino") return { es: ` La devolución de ${usd(d.monto)} a su tarjeta va en camino: se manda sola.`, en: ` The ${usd(d.monto)} refund to their card is on its way: it is sent automatically.` };
  if (d.e === "fallida") return { es: ` La devolución de ${usd(d.monto)} no salió: el equipo de To'Latino ya tiene el aviso y lo resuelve con el cliente.`, en: ` The ${usd(d.monto)} refund did not go through: the To'Latino team already has the alert and sorts it out with the client.` };
  if (d.e === "liberada") return d.monto > 0 ? { es: ` No se había cobrado nada: se soltó la retención de ${usd(d.monto)} de su tarjeta.`, en: ` Nothing had been charged: the ${usd(d.monto)} hold on their card was released.` } : { es: " No se había cobrado nada.", en: " Nothing had been charged." };
  if (d.e === "retenida") return sinSoltarNegocio(d.monto);
  if (d.e === "cobrada") return d.monto > 0 ? { es: ` La retención no se pudo soltar: ya se habían cobrado ${usd(d.monto)} en su tarjeta. El equipo de To'Latino ya tiene el aviso y lo revisa con el cliente.`,
    en: ` The hold could not be released: ${usd(d.monto)} had already been charged to their card. The To'Latino team already has the alert and reviews it with the client.` }
    : { es: " La retención no se pudo soltar: ya se había cobrado en su tarjeta. El equipo de To'Latino ya tiene el aviso y lo revisa con el cliente.", en: " The hold could not be released: it had already been charged to their card. The To'Latino team already has the alert and reviews it with the client." };
  return { es: "", en: "" };
}

/* 25 nov (quinta tanda) · Lo retenido que se suelta SIN cancelación con devolución (vence, «No hay mesa», «No puedo», «No me sirve», el mercado no acepta,
   el apartado se cancela): cobros › soltarRetencion dice «liberada» · «nada» · «retenida» (la pasarela no la soltó todavía: el barrido la sigue soltando y
   el equipo de dinero tiene la alerta hold_stuck). Cada aviso dice lo de «liberada» como antes; lo de «retenida» sale de aquí, nunca «Se liberó». */
export type Soltada = { e: "liberada" | "nada" | "retenida" | "cobrada"; monto: number; regla?: ReglaTarde };
/* Para quien pagó (con espacio delante: los avisos terminan en «.{dev}» / «.{dinero}»). */
export const sinSoltarCliente = (monto: number): Bi => { const t = dineroAlCancelar({ e: "retenida", monto }); return { es: ` ${t.es}`, en: ` ${t.en}` }; };
/* Para el negocio (con espacio delante). */
export const sinSoltarNegocio = (monto: number): Bi => ({ es: ` No se había cobrado nada, pero la retención de ${usd(monto)} de su tarjeta no se soltó todavía: se sigue soltando sola y el equipo de To'Latino ya tiene el aviso.`,
  en: ` Nothing had been charged, but the ${usd(monto)} hold on their card has not been released yet: it keeps being released automatically and the To'Latino team already has the alert.` });
/* La frase de lo soltado: la de siempre si se soltó (o no había nada), la de «retenida» si la pasarela no la soltó, la de «cobrada» si Stripe ya la había
   cobrado (25 nov: nunca «Se liberó tu depósito» de un dinero cobrado). */
export const soltadaO = (s: Soltada, siSalio: string | Bi, para: "cliente" | "negocio" = "cliente"): string | Bi => (s.e === "retenida" ? (para === "cliente" ? sinSoltarCliente(s.monto) : sinSoltarNegocio(s.monto))
  : s.e === "cobrada" ? (para === "cliente" ? (() => { const t = dineroAlCancelar({ e: "cobrada", monto: s.monto }); return { es: ` ${t.es}`, en: ` ${t.en}` }; })() : dineroAlNegocio({ e: "cobrada", monto: s.monto })) : siSalio);

export const sinDevoluciones = (): DevCuenta => ({ hechas: 0, camino: 0, fallidas: 0, liberadas: 0, retenidas: 0 });
export function contar(c: DevCuenta, d: DevCancelar): DevCuenta {
  const cobradas = (c.cobradas ?? 0) + (d.e === "cobrada" ? 1 : 0);
  return { hechas: c.hechas + (d.e === "hecha" ? 1 : 0), camino: c.camino + (d.e === "en_camino" ? 1 : 0), fallidas: c.fallidas + (d.e === "fallida" ? 1 : 0),
    liberadas: c.liberadas + (d.e === "liberada" ? 1 : 0), retenidas: c.retenidas + (d.e === "retenida" ? 1 : 0), ...(cobradas ? { cobradas } : {}) };
}

/* La línea del panel después de «Sí, cancelar y devolver»: lo que salió, lo que va en camino y lo que no salió (lo tiene el equipo de To'Latino); y, aparte,
   lo que solo estaba retenido (nada cobrado: se soltó, o todavía no). Una retención soltada nunca cuenta como «Le devolvimos». */
export function textoPanelCancelar(d: DevCuenta | undefined): Bi {
  const x = { ...sinDevoluciones(), ...d }, cob = x.cobradas ?? 0, dev = x.hechas + x.camino + x.fallidas, ret = x.liberadas + x.retenidas;
  // 25 nov · Las retenciones que Stripe ya había cobrado (nunca «No se había cobrado nada» de ellas): aparte, con el equipo de To'Latino.
  const cobT: Bi | null = cob ? (cob === 1 ? { es: "La retención de su tarjeta no se pudo soltar: ya se había cobrado. El equipo de To'Latino ya tiene el aviso y lo revisa con el cliente.", en: "The hold on their card could not be released: it had already been charged. The To'Latino team already has the alert and reviews it with the client." }
    : { es: `${cob} retenciones no se pudieron soltar: ya se habían cobrado. El equipo de To'Latino ya tiene el aviso.`, en: `${cob} holds could not be released: they had already been charged. The To'Latino team already has the alert.` }) : null;
  if (cobT) {
    // Con una cobrada al lado, una sola devolución hecha no es «Le devolvimos todo».
    const r0 = dev || ret ? textoPanelCancelar({ ...x, cobradas: 0 }) : null, r = r0 && dev + ret === 1 && x.hechas === 1 ? { es: "Devoluciones: 1 hecha.", en: "Refunds: 1 done." } : r0;
    return r ? { es: `${r.es} ${cobT.es}`, en: `${r.en} ${cobT.en}` } : cobT;
  }
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

/* 25 nov (lo que se dice ANTES de actuar; guardián devueltoSoloSiSalio, regla 13) · Lo que se va a INTENTAR con el dinero, dicho como un intento y según
   lo que está en la base, nunca «Te devolvemos $X» antes de intentar nada (lo que de verdad pasó lo dice la pantalla después). Pasaba: las hojas de
   cancelar de la noche, el viaje, la fiesta, la inscripción y el evento privado decían «te devolvemos el depósito» (también de una retención que solo se
   suelta, y con el monto entero aunque ya hubiera una devolución parcial), y «otra hora» prometía que «se libera» aunque no hubiera nada retenido.
   El servidor: al cancelar a tiempo, cobros › devolverAlCancelar (lo retenido se suelta; de lo cobrado se pide la devolución de lo que queda); «No me
   sirve», el vencimiento y «No hay mesa / cupo» solo sueltan la retención (cobros › soltarRetencion), nunca devuelven. */
export type PagoVisto = { st: string | null; monto: number; devuelto: number };
export const cobradoVisto = (p: PagoVisto) => p.st === "captured" || p.st === "partially_refunded";
/* Lo que queda de lo cobrado (menos lo ya devuelto): lo que se pide devolver a tiempo, o lo que se queda el negocio tarde. 0 si no está cobrado. */
export const quedaVisto = (p: PagoVisto) => (cobradoVisto(p) ? Math.max(0, p.monto - p.devuelto) : 0);
/* Al cancelar a tiempo: retenido → se pide soltarla; cobrado → se pide la devolución de lo que queda; nada que mover → vacío (la pantalla dice lo suyo). */
export function pideAlCancelar(p: PagoVisto, f: (c: number) => string = usd): Bi {
  if (p.st === "held" && p.monto > 0) return { es: `Pedimos que se suelte la retención de ${f(p.monto)} de tu tarjeta; aquí ves cuando se suelte.`, en: `We ask for the ${f(p.monto)} hold to come off your card; you see here when it does.` };
  const q = quedaVisto(p);
  if (q > 0) return { es: `Pedimos la devolución de ${f(q)} a tu tarjeta; aquí ves cuando salga.`, en: `We request a refund of ${f(q)} to your card; you see here when it goes through.` };
  return { es: "", en: "" };
}
/* Si no confirman (vence, «No hay mesa / cupo») o si la otra hora no te sirve: SOLO se suelta la retención. Con espacio delante (las pantallas y los
   avisos noche_alt, fiesta_alt y viaje_alt, que terminan en «.{dinero}»: 0224). Vacío si no hay nada retenido: no se promete nada. */
export function pideSoltarSi(si: "confirman" | "sirve", p: { st: string | null; monto: number }, f: (c: number) => string = usd): Bi {
  if (p.st !== "held" || !(p.monto > 0)) return { es: "", en: "" };
  return si === "confirman"
    ? { es: ` Si no confirman, pedimos que se suelte la retención de ${f(p.monto)} de tu tarjeta.`, en: ` If they do not confirm, we ask for the ${f(p.monto)} hold to come off your card.` }
    : { es: ` Si no te sirve, pedimos que se suelte la retención de ${f(p.monto)} de tu tarjeta.`, en: ` If it does not work for you, we ask for the ${f(p.monto)} hold to come off your card.` };
}
