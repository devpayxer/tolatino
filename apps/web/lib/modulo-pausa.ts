/* 9n · Cotizaciones (cot) y Staff (staff) por ciudad (LAUNCH «Cotizaciones y Staff por ciudad»; REVISION «Cotizaciones y Staff por ciudad (18 nov)»).
   Los dos usan la misma pausa de To'Latino que el resto de los módulos: businesses.modules_off[<clave>] (la pone Negocios 360° a un negocio o el Catálogo a
   toda una ciudad con la marca {"ciudad": true}). Esta es la clave y el texto que dicen las pantallas y el servidor; la lectura de cada negocio se hace en
   su consulta (el guardián moduloPorCiudad vigila que cada clave de MODULOS_POR_CIUDAD tenga su lector).
   - cot: lo que el vecino PIDE para saber el precio antes de reservar: pre-estimado con fotos y presupuesto a hasta 3 (Auto y Hogar), «Pedir precio» de una
     mudanza (Transporte) y el total por escrito de Fiestas. Pausado, esas entradas no salen y el servidor las rechaza; lo ya pedido sigue su camino.
   - staff: la presentación del equipo en la página (la pestaña, el riel «Equipo», «Ver equipo», las tarjetas y «Quién está detrás»). Pausado, esa presentación
     no sale; reservar un servicio NO se rompe: elegir con quién sigue siendo parte de Citas (política «elegir con quién» del negocio). */
export const PAUSA_COT: { es: string; en: string } = {
  es: "Este negocio no recibe solicitudes de precio en línea por ahora: llama al negocio.",
  en: "This business is not taking price requests online right now: call the business.",
};
export const enPausa = (off: Record<string, unknown> | null | undefined, clave: string): boolean => !!off && off[clave] != null;
