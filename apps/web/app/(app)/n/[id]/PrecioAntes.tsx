/* C-008 · 9n · El precio de antes de un producto en oferta (Mercado y Tienda), como el de los platos de Comida (MenuCliente): el lector de pantalla
   oye «Antes» y la cifra lleva data-precio-antes. Solo recibe el `was` que calcula el servidor (lib/merc-publico.ts, lib/apartados.ts), ya escrito
   con el formato de la pantalla: el precio de siempre del catálogo cuando una oferta en vivo de Novedades lo baja. Nunca un número escrito a mano
   (guardián precioAntesReal).
   - Dentro de MenuTile / MenuItemRow va como su `was` (el sistema de diseño lo tacha).
   - En las filas y hojas propias de la ficha va con `tachado`: el mismo tachado del precio de una oferta en Novedades. */
export function PrecioAntes({ t, es, tachado = false }: { t: string; es: boolean; tachado?: boolean }) {
  const x = <><span className="sr-only">{es ? "Antes " : "Was "}</span><span data-precio-antes>{t}</span></>;
  return tachado ? <span className="text-[12.5px] font-medium text-ink/60 line-through">{x}</span> : x;
}
