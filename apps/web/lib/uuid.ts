/* Un UUID v4 también SIN contexto seguro (8c: el sandbox se sirve por HTTP en la IP, y ahí el navegador no tiene crypto.randomUUID —solo existe con
   https o localhost— pero sí crypto.getRandomValues). Las claves idempotentes de pedir, reservar, pagar o escanear salen de aquí; el servidor
   exige un UUID (guardián uuidSinContextoSeguro). Sirve en el navegador y en el servidor (Node también tiene crypto.getRandomValues). */
export function uuid(): string {
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
