import "server-only";
import { db } from "../db";

/* AO · El tope de costo PROPIO de los anfitriones, con la misma forma que El Compa (guardián compaPorElTope): gastar() reserva el máximo ANTES de
   llamar al modelo (anf_reservar contra anf_tope_mes_cents); anotarUso() liquida DESPUÉS con los tokens que devolvió (anf_anotar), en el camino del
   error y en el de la respuesta. Lo usan las respuestas (lib/compa/anfitriones.ts) y los resúmenes de las noticias (lib/compa/noticias.ts). */
export async function gastar(modeloId: string, entradaMax: number, salidaMax: number): Promise<string | null> {
  return (await db().query<{ id: string | null }>(`select anf_reservar($1, $2, $3)::text as id`, [modeloId, entradaMax, salidaMax])).rows[0]?.id ?? null;
}
export async function anotarUso(a: { reserva: string; modelo: string; tokens?: { entrada: number; salida: number }; cobrarReservado?: boolean }): Promise<number> {
  const t = a.tokens ?? { entrada: 0, salida: 0 };
  return Number((await db().query<{ c: string }>(`select anf_anotar($1::uuid, $2, $3, $4, $5)::text as c`,
    [a.reserva, a.modelo, Math.max(0, Math.round(t.entrada)), Math.max(0, Math.round(t.salida)), !!a.cobrarReservado])).rows[0]?.c ?? 0);
}
