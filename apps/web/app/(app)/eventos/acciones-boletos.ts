"use server";
/* 6c · Comprar boletos (APP-EVT-BOLETOS y APP-EVT-PAGO). La pantalla manda ids y cantidades; el servidor aparta, cobra y emite
   (lib/boletos.ts). Cada escritura revisa que la llamada venga de nuestra página (mismoOrigen) y que haya sesión. */
import { mismoOrigen, yo } from "@/lib/cuenta";
import { apartar, pagarBoletos, previoCodigo, soltarApartado, type BoletosIn } from "@/lib/boletos";
import { ENTORNO } from "@/lib/entorno";
import type { Bi } from "@/lib/evt-comun";

type R<T = object> = ({ ok: true } & T) | { ok: false; msg?: Bi; entrar?: true; vencido?: true; tarjeta?: true; agotado?: true };
const RED: Bi = { es: "No se pudo. Revisa tu conexión y prueba de nuevo.", en: "Could not do it. Check your connection and try again." };

export async function evtApartar(x: BoletosIn): Promise<R<{ apartado: string }>> {
  if (!(await mismoOrigen())) return { ok: false, msg: RED };
  const u = await yo();
  if (!u) return { ok: false, entrar: true };
  return apartar(u.id, x);
}

export async function evtSoltar(apartado: string): Promise<R> {
  if (!(await mismoOrigen())) return { ok: false, msg: RED };
  const u = await yo();
  if (!u) return { ok: false, entrar: true };
  await soltarApartado(u.id, String(apartado));
  return { ok: true };
}

/* Pagar: la tarjeta (pm_… de Stripe o del simulador del sandbox) y los nombres opcionales de cada boleto. Nunca un monto. */
export async function evtPagar(apartado: string, pm: string, nombres: string[]): Promise<R<{ numero: string }>> {
  if (!(await mismoOrigen())) return { ok: false, msg: RED };
  const u = await yo();
  if (!u) return { ok: false, entrar: true };
  return pagarBoletos(u.id, String(apartado), pm, nombres, ENTORNO);
}

/* «Aplicar» un código: el servidor dice si vale y cuánto baja (cuenta como intento: hay límite). */
export async function evtCodigo(fecha: string, boletos: { id: string; q: number }[], codigo: string): Promise<R<{ codigo: string; descuento: number }>> {
  if (!(await mismoOrigen())) return { ok: false, msg: RED };
  const u = await yo();
  if (!u) return { ok: false, entrar: true };
  return previoCodigo(u.id, String(fecha), boletos, codigo);
}
