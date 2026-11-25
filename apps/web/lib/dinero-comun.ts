/* 25 nov (LAUNCH «promete antes de actuar» d/e) · UNA regla para el dinero que ve el cliente, en las pantallas, los avisos y lo que dice el servidor:
   sin centavos si son .00 y con dos decimales si no («$45», «$52.50»; nunca «$52.5» ni «$45.00»). Sin «server-only»: la usan las pantallas. Guardián
   dineroUnDecimal (un formateador de dinero con maximumFractionDigits y sin minimumFractionDigits deja «$52.5»). */
export const usd = (c: number): string => {
  const r = Math.round(c);
  return `$${(r / 100).toLocaleString("en-US", { minimumFractionDigits: r % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;
};
