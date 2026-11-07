/* Layaway (4r): las cuentas y el acuerdo por escrito, iguales en el teléfono y en el servidor (sin nada del servidor). Lo que la
   persona lee antes de aceptar sale de terminos(); lo que se guarda, también. */
type Bi = { es: string; en: string };
const money = (c: number) => `$${(c / 100).toFixed(2).replace(/\.00$/, "")}`;
export type ReglaPlan = { pct: number; n: number; cada: number; cargo: number };
export const VERSION_PLAN = "lay-v1";
export const DIAS_PARA_CANCELAR = 14;

/* Los montos: abono redondeado al centavo y el resto en pagos iguales (el último lleva los centavos que sobran). Σ = total. */
export function cuotas(total: number, r: ReglaPlan): { abono: number; pagos: number[] } {
  const abono = Math.max(1, Math.min(total - 1, Math.round((total * r.pct) / 100))), resto = total - abono, base = Math.floor(resto / r.n);
  const pagos = Array.from({ length: r.n }, (_, i) => (i === r.n - 1 ? resto - base * (r.n - 1) : base));
  return { abono, pagos };
}
const pagosL = (p: number[], es: boolean) => {
  const iguales = p.every((x) => x === p[0]);
  if (iguales) return es ? `${p.length} ${p.length === 1 ? "pago" : "pagos"} de ${money(p[0]!)}` : `${p.length} ${p.length === 1 ? "payment" : "payments"} of ${money(p[0]!)}`;
  return es ? `${p.length - 1} pagos de ${money(p[0]!)} y uno de ${money(p[p.length - 1]!)}` : `${p.length - 1} payments of ${money(p[0]!)} and one of ${money(p[p.length - 1]!)}`;
};
/* El acuerdo por escrito, ES/EN. Es lo que se muestra antes de aceptar y lo que se guarda: la misma función, los mismos montos. */
export function terminos(negocio: string, total: number, r: ReglaPlan): Bi {
  const { abono, pagos } = cuotas(total, r);
  return {
    es: `Plan en ${negocio}. Total: ${money(total)}, sin intereses. Hoy se retiene el abono de ${money(abono)} (${r.pct} %) en tu tarjeta y se cobra cuando la tienda confirma que lo tiene; si no lo tiene, se libera completo. El resto, ${money(total - abono)}, en ${pagosL(pagos, true)}, uno cada ${r.cada} días desde que confirman. Pagas cada pago en la app o en la tienda; nada se cobra solo. El artículo queda guardado para ti mientras pagas y te lo entregan al terminar de pagar. Si cancelas, o la tienda cancela porque llevas ${DIAS_PARA_CANCELAR} días de atraso, te devuelven lo abonado menos ${r.cargo} % de lo abonado: lo pagado en la app vuelve a tu tarjeta y lo pagado en la tienda te lo devuelve la tienda.`,
    en: `Layaway at ${negocio}. Total: ${money(total)}, no interest. Today the ${money(abono)} down payment (${r.pct}%) is held on your card and charged when the store confirms it has the item; if not, it is fully released. The rest, ${money(total - abono)}, in ${pagosL(pagos, false)}, one every ${r.cada} days from confirmation. You pay each payment in the app or at the store; nothing is charged automatically. The item is kept for you while you pay and handed over when you finish paying. If you cancel, or the store cancels after ${DIAS_PARA_CANCELAR} days late, you get back what you paid minus ${r.cargo}% of what you paid: app payments go back to your card and store payments are returned by the store.`,
  };
}

