/* 9e · La ruta pública de cada página legal (la clave de docs/legal/ es la ruta). Escritas una por una para que el guardián rutasVivas las vea
   (cada una tiene su app/(app)/{clave}/page.tsx). Sin servidor: la usan el pie, la hoja y la columna «Más en …». */
export const RUTA_LEGAL: Record<string, string> = {
  terminos: "/terminos", privacidad: "/privacidad", cookies: "/cookies", reglas: "/reglas", verificamos: "/verificamos", votos: "/votos",
  seguridad: "/seguridad", ia: "/ia", dmca: "/dmca", "vivienda-justa": "/vivienda-justa", accesibilidad: "/accesibilidad",
};
/* La ruta con el idioma pedido (?l=en solo en inglés: el español es el de siempre). */
export const rutaLegal = (k: string, en = false) => `${RUTA_LEGAL[k] ?? "/terminos"}${en ? "?l=en" : ""}`;
