/* «Lo que hay en tu negocio»: en la base se guarda una clave estable, no la etiqueta. La clave sale del texto en
   español sin acentos; la misma función genera el catálogo (scripts/catalogo/generar-amenidades-sql.mjs). */
export const claveAmenidad = (es: string) =>
  es.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
