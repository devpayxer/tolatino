import "server-only";
import { resaltar, type Entendido } from "@/lib/buscar";
import type { HalladoVecino } from "@/lib/comunidad-portada";

/* Buscar › Vecinos: una publicación hallada como la pinta la pantalla (prototipo rs.po): quién, hace cuánto, el texto con la parte que
   encajó resaltada, votos y comentarios. Solo llega aquí con sesión (lib/comunidad-portada.ts buscarVecinos). */
export type FilaVecino = { id: string; who: string; foto: string | null; ini: string; oficial: boolean; when: string; parts: [string, string, string]; votes: number; cms: number };
export function filaVecino(x: HalladoVecino, E: Entendido, es: boolean): FilaVecino {
  const h = Math.max(0, Math.floor((Date.now() - new Date(x.at).getTime()) / 3_600_000));
  const when = h < 1 ? (es ? "AHORA" : "NOW") : h < 24 ? (es ? `HACE ${h} H` : `${h} H AGO`) : (es ? `HACE ${Math.floor(h / 24)} D` : `${Math.floor(h / 24)} D AGO`);
  return { id: x.id, who: x.who, foto: x.foto, ini: x.ini, oficial: x.oficial, when, parts: resaltar(x.body, E.grupos), votes: x.score, cms: x.cms };
}
