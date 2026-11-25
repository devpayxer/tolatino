/* 25 nov (LAUNCH «promete antes de actuar» d/e) · UNA regla para el dinero que ve el cliente, en las pantallas, los avisos y lo que dice el servidor:
   sin centavos si son .00 y con dos decimales si no («$45», «$52.50»; nunca «$52.5» ni «$45.00»). Sin «server-only»: la usan las pantallas. Guardián
   dineroUnDecimal (un formateador de dinero con maximumFractionDigits y sin minimumFractionDigits deja «$52.5»).
   25 nov (revisión de 8d7d0c1) · Un negativo lleva el signo delante del «$» («-$45»); el cero negativo, undefined y NaN dan «$0». */
export const usd = (c: number): string => {
  const r = Math.round(Number(c) || 0);
  const a = Math.abs(r);
  return `${r < 0 ? "-" : ""}$${(a / 100).toLocaleString("en-US", { minimumFractionDigits: a % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;
};
