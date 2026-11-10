import "server-only";
/* 7b · Tapar datos que nunca se guardan ni se mandan (fase7-compa.md §3 «Datos personales y tapado»): tarjetas (13–19 dígitos con
   Luhn), el código de seguridad de la tarjeta (3–4 dígitos junto a su nombre), SSN / ITIN (###-##-####), número A (inmigración), códigos de verificación junto a
   «código / code / pin», contraseñas junto a «contraseña / password / clave» y cuentas bancarias o de ruta. Queda «[tapado]» y la persona
   ve «No compartas eso aquí. Nunca te lo pedimos.». Lo usa Soporte (7b) antes de guardar un caso o un mensaje y El Compa (7c) antes de
   guardar y de mandar al modelo. Solo en el servidor. La base vuelve a rechazar tarjetas y SSN
   (texto_con_secretos en 0117) por si alguien se salta esto. Los teléfonos NO se tapan aquí: un caso de cuenta los necesita (cambié de
   número) y solo los lee el equipo. */
export const TAPADO = "[tapado]";

export function luhn(d: string): boolean {
  if (!/^\d{13,19}$/.test(d)) return false;
  let s = 0, dbl = false;
  for (let i = d.length - 1; i >= 0; i--) { let n = d.charCodeAt(i) - 48; if (dbl) { n *= 2; if (n > 9) n -= 9; } s += n; dbl = !dbl; }
  return s % 10 === 0;
}

const REGLAS: [RegExp, (m: string, ...g: string[]) => string][] = [
  // SSN / ITIN
  [/(^|[^\d])(\d{3}[- ]\d{2}[- ]\d{4})(?!\d)/g, (_m, a: string) => `${a}${TAPADO}`],
  // CVV / código de seguridad // GUARDIAN-OK: tapar() quita ese dato antes de guardar; nunca lo lee ni lo guarda
  [/\b(cvv2?|cvc|c[oó]digo de seguridad|security code)(\s*(?:es|is|:|#|=)?\s*)\d{3,4}\b/gi, (_m, a: string, b: string) => `${a}${b}${TAPADO}`], // GUARDIAN-OK: tapar() quita ese dato antes de guardar; nunca lo lee ni lo guarda
  // Códigos de verificación o de entrada (4–8 dígitos junto a la palabra)
  [/\b(c[oó]digo|code|pin|otp)((?:\s+de\s+(?:verificaci[oó]n|entrada|acceso))?\s*(?:es|is|:|=)?\s*)\d{4,8}\b/gi, (_m, a: string, b: string) => `${a}${b}${TAPADO}`],
  // Contraseñas
  [/\b(contrase[ñn]a|password|passcode|clave)(\s*(?:es|is|:|=)\s*|\s+)(\S{3,})/gi, (_m, a: string, b: string) => `${a}${b}${TAPADO}`],
  // Número A (inmigración)
  [/\bA[- ]?\d{8,9}\b/g, () => TAPADO],
  // Cuentas bancarias y de ruta
  [/\b(cuenta(?:\s+bancaria)?|account|routing|ruta|aba)((?:\s+(?:number|n[uú]mero|no\.?|#))?\s*(?:es|is|:|=|#)?\s*)\d{6,17}\b/gi, (_m, a: string, b: string) => `${a}${b}${TAPADO}`],
];

/* Devuelve el texto tapado y si hubo algo que tapar. */
export function tapar(texto: string): { texto: string; tapado: boolean } {
  let t = String(texto ?? "");
  // Tarjetas: primero (13–19 dígitos con espacios o guiones y Luhn).
  t = t.replace(/(?:\d[ -]?){12,18}\d/g, (m) => (luhn(m.replace(/\D/g, "")) ? TAPADO : m));
  for (const [re, f] of REGLAS) t = t.replace(re, f as (m: string, ...g: string[]) => string);
  return { texto: t, tapado: t !== String(texto ?? "") };
}

export const AVISO_TAPADO = { es: "No compartas eso aquí. Nunca te lo pedimos.", en: "Don't share that here. We never ask for it." };
