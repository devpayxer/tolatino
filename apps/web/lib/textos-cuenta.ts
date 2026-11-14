/* 9f · El nombre de una cuenta borrada (9d). La purga a los 30 días deja en la base el texto «Cuenta borrada» (packages/db/mapa-de-datos.json: users.first_name);
   quien lo muestra (el panel del negocio, un pedido, una cita) lo pasa por nombreVisible() para verlo en el idioma de quien mira: «Cuenta borrada» /
   «Deleted account». Línea con candado en el catálogo (USR-CUENTA.borrada): lo que se guarda en la base y lo que se muestra no se separan. Sin server-only: lo usan
   los paneles (cliente). El guardián cuentaBorradaBilingue revisa que la base y este archivo digan lo mismo. */
export const CUENTA = {
  es: { borrada: "Cuenta borrada" },
  en: { borrada: "Deleted account" },
} as const;

/** El nombre guardado de la cuenta borrada, tal como lo escribe la purga. */
export const CUENTA_BORRADA_GUARDADA = CUENTA.es.borrada;

/** El nombre de alguien tal como se muestra: el de una cuenta borrada, en el idioma de quien mira; cualquier otro, igual. Acepta «Cuenta borrada» con
 *  o sin apellido (la purga lo deja sin apellido). */
export function nombreVisible(nombre: string | null | undefined, es: boolean): string {
  const n = nombre ?? "";
  return n === CUENTA_BORRADA_GUARDADA || n.startsWith(CUENTA_BORRADA_GUARDADA + " ") ? (es ? CUENTA.es.borrada : CUENTA.en.borrada) + n.slice(CUENTA_BORRADA_GUARDADA.length) : n;
}
