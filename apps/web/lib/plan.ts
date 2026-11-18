/* Free y Pro: las cifras del producto (PLAN §2 «Página del negocio» y «Pro / Free»; TLOnbNeg en el prototipo).
   Un solo lugar: la ficha, el panel, Publica y el Super Admin leen de aquí. Cuando el Super Admin edite el plan
   (platform_config, Fase 2), estas son las de fábrica. El techo de Free (pedidos o citas en línea al mes) ya vive en Sistema ›
   Configuración (free_ops_cap, 10 de fábrica; 9n-6): se lee con valor()/cfgSql() de lib/config.ts, nunca una copia aquí. */
export const PRECIO_PRO = 14.99;
export const PRUEBA_DIAS = 30;
// 9n · Los límites Free/Pro (ítems y fotos que se ven con Free, fotos de un Pro, personas del equipo con Free) son valores de Configuración
// (free_items, free_fotos, pro_fotos, free_equipo; 0179) que un Admin cambia en Catálogo › Módulos y Free/Pro: se leen con valor()/cfgSql()
// de lib/config.ts, nunca una copia aquí (guardián limitesDelPlan).
export const dinero = (n: number) => `$${n.toFixed(2)}`;
