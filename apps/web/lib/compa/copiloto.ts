import "server-only";
import type { Staff } from "../admin";
import { borradorCopiloto, type BorradorCopiloto } from "./conversacion";
import { disponible } from "./interruptores";
import { alTope } from "./tope";

/* 7g · El copiloto del equipo hacia afuera de lib/compa (fase7-compa.md §4 7g; guardianes copilotoSoloBorrador y compaSinRutaCritica):
   - copilotoDisponible(): lectura BARATA para pintar o no «Sugerir respuesta con El Compa» en la ficha de un caso de Soporte y en la de una
     ayuda escalada: el nivel «copiloto», el canal, la ciudad del caso, el negocio y el tope. Quien la llama la usa SIEMPRE con .catch(() => false):
     apagado, al tope o con un error, la ficha es la de siempre (texto a texto).
   - borrador(): el turno del copiloto (conversacion.ts borradorCopiloto). Solo lo llama la acción de Super Admin (app/admin/acciones-copiloto.ts),
     que toma a la persona del equipo de la SESIÓN. Devuelve un borrador; nunca envía. */
export async function copilotoDisponible(x: { ciudad: string | null; negocio?: string | null }): Promise<boolean> {
  const [d, tope] = await Promise.all([disponible({ uso: "copilot", canal: "app", ciudad: x.ciudad, negocio: x.negocio ?? null }), alTope()]);
  return d.ok && !tope;
}
export async function borrador(s: Staff, x: { caso?: string | null; cola?: string | null }): Promise<BorradorCopiloto> {
  return borradorCopiloto(s, x);
}
export type { BorradorCopiloto };
