/* Free y Pro: las cifras del producto (PLAN §2 «Página del negocio» y «Pro / Free»; TLOnbNeg en el prototipo).
   Un solo lugar: la ficha, el panel, Publica y el Super Admin leen de aquí. Cuando el Super Admin edite el plan
   (platform_config, Fase 2), estas son las de fábrica. */
export const PRECIO_PRO = 14.99;
export const PRUEBA_DIAS = 30;
export const TOPE_FREE = 10; // pedidos o citas en línea al mes con Free
export const FOTOS_FREE = 3; // PLAN: «Free = una página, 5 ítems, 3 fotos»
export const ITEMS_FREE = 5;
export const FOTOS_PRO = 60; // tope de lectura de la galería Pro
export const EQUIPO_FREE = 1; // con Free sale 1 persona (el dueño)
export const dinero = (n: number) => `$${n.toFixed(2)}`;
