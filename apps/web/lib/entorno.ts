import "server-only";

/* Entorno y candados. Si algo de aquí está mal configurado, la app NO arranca (mejor caída que insegura). */
export type Entorno = "pruebas" | "produccion" | "local";
export const ENTORNO: Entorno = (process.env.TOLATINO_ENTORNO as Entorno) || "local";

/* Cómo se entrega el código de entrada (decisión E2). «pruebas» = se muestra en pantalla; solo fuera de producción. */
export type ModoSms = "pruebas" | "telnyx";
export const MODO_SMS: ModoSms = (process.env.TOLATINO_SMS_MODO as ModoSms) || "pruebas";
if (ENTORNO === "produccion" && MODO_SMS === "pruebas") {
  throw new Error("CANDADO: el modo pruebas del código de entrada no puede existir en producción.");
}

export function secretoAuth(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) {
    if (ENTORNO === "local") return "solo-local-nunca-en-servidor-0123456789abcdef"; // GUARDIAN-OK: solo dev local
    throw new Error("Falta AUTH_SECRET (mínimo 32 caracteres)");
  }
  return s;
}
