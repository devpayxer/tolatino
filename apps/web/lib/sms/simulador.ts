import "server-only";
import { randomBytes } from "node:crypto";
import { ENTORNO } from "../entorno";

/* 9l · El simulador de SMS del sandbox (el «Telnyx» de las pruebas; como el simulador de pagos de lib/pagos/pasarela.ts). Nunca en producción:
   lib/entorno.ts no deja arrancar producción en modo pruebas y aquí se vuelve a revisar. Contesta como Telnyx: acepta (o no) el envío con un id, y
   su resultado final (entregado o falló) llega como llegaría el webhook `message.finalized` (lib/sms/index.ts → anotarEntrega).
   Números mágicos (como las tarjetas de prueba de Stripe), todos en el bloque 570-555 de las pruebas:
   - 570-555-0911 → el primer intento lo acepta pero el operador no lo entrega (falla temporal); el segundo llega.
   - 570-555-0912 → número inválido: nunca lo acepta (falla permanente, sin reintento).
   - 570-555-0913 → el primer intento el proveedor no contesta (503); el segundo llega.
   - cualquier otro → aceptado y entregado. */
export type ResSim = { aceptado: boolean; id: string | null; codigo: string | null; final: "entregado" | "fallo" | null; codigoFinal: string | null; permanente: boolean };
export const SIM_FALLA_UNA = "+15705550911", SIM_INVALIDO = "+15705550912", SIM_CAIDO_UNA = "+15705550913";

export function simularEnvio(tel: string, intento: number): ResSim {
  if (ENTORNO === "produccion") throw new Error("CANDADO: el simulador de SMS no existe en producción.");
  const id = `sim-sms-${randomBytes(9).toString("base64url")}`;
  if (tel === SIM_INVALIDO) return { aceptado: false, id: null, codigo: "sim_invalido", final: null, codigoFinal: null, permanente: true };
  if (tel === SIM_CAIDO_UNA && intento === 1) return { aceptado: false, id: null, codigo: "sim_503", final: null, codigoFinal: null, permanente: false };
  if (tel === SIM_FALLA_UNA && intento === 1) return { aceptado: true, id, codigo: null, final: "fallo", codigoFinal: "sim_temporal", permanente: false };
  return { aceptado: true, id, codigo: null, final: "entregado", codigoFinal: null, permanente: false };
}
