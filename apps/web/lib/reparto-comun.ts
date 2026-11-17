/* 9n · Lo que el Repartidor puede llevar: el pedido de comida (#1051, kind 'order') y el pedido del mercado con envío (M-6101, kind 'market_order').
   Un solo lugar para el número, el tipo y a dónde lleva cada aviso (guardián mercadoConRepartidor: ninguna pieza del Repartidor vuelve a mirar
   solo los pedidos de comida). Sin «server-only»: la app del repartidor y el panel también formatean el número. */

/* El número de un pedido que el Repartidor lleva: «1051» o «M-6101». */
export const NUM_REPARTO = /^(?:\d{1,12}|M-\d{1,10})$/;
export const esNumReparto = (n: unknown): n is string => typeof n === "string" && NUM_REPARTO.test(n);
export const esMercado = (n: string) => n.startsWith("M-");
/* Los tipos de pedido que lleva el Repartidor (SQL). */
export const KIND_REPARTO = `('order', 'market_order')`;
/* Un delivery que lleva el Repartidor (SQL sobre el alias de operations). */
export const repartoSql = (a = "o") => `${a}.kind in ${KIND_REPARTO} and coalesce(${a}.mode, 'pickup') = 'delivery'`;
/* El pedido del mercado sale con el repartidor solo cuando el mercado lo marcó «Está listo» (después de pesar y del OK del cliente si hacía falta);
   el de comida, desde que se acepta (como siempre). */
export const listoParaRepartoSql = (a = "o") => `(${a}.kind = 'order' or ${a}.status_detail = 'listo')`;
/* Cómo se ve el número: el de comida con «#», el del mercado tal cual. */
export const numVisible = (n: string) => (esMercado(n) ? n : `#${n}`);
/* A dónde lleva un aviso: el pedido del cliente y el detalle en el panel. */
export const hrefCliente = (n: string) => (esMercado(n) ? `/mercado/${n}` : `/pedido/${n}`);
export const detPanel = (n: string) => (esMercado(n) ? `merc:${n}` : `ped:${n}`);
