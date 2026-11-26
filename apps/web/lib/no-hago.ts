/* «LO QUE NO HACES · SALE EN TU PÁGINA» (Panel v2 · Tu herramienta, dash2-cat.js DC:123): solo negocios con licencia
   legal (abogado, representante acreditado, notario). Lo usan el panel y el servidor. */
/* [español del código, inglés del código, rótulo por E2]: las dos primeras son lo que se guarda en la base (category_attrs.cant: tal cual, no se editan);
   el tercero es lo que se ve y entra al catálogo del CMS. */
export const NO_HAGO = (E2: (es: string, en: string) => string): [string, string, string][] => [
  ["No garantiza que aprueben tu caso", "Does not guarantee your case is approved", E2("No garantiza que aprueben tu caso", "Does not guarantee your case is approved")],
  ["No promete fechas que dependen del gobierno", "Does not promise dates that depend on the government", E2("No promete fechas que dependen del gobierno", "Does not promise dates that depend on the government")],
  ["No llena formularios sin revisar tu caso", "Does not fill forms without reviewing your case", E2("No llena formularios sin revisar tu caso", "Does not fill forms without reviewing your case")],
];
export const LIC_LEGAL = ["abogado", "acreditado", "notario"];
