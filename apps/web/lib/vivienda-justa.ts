import "server-only";
import type { Pool, PoolClient } from "pg";
import { db } from "./db";

/* Vivienda justa (Fair Housing Act y Pennsylvania Human Relations Act · fase4-iglesias-inmuebles-autos.md §3). ÚNICO lugar con la lista
   de frases que no pueden ir en un anuncio (guardián viviendaJusta): la de fábrica (BASE, no se apaga) más la que maneja el Super Admin
   en Catálogo (fair_housing_phrases, con auditoría; nada se borra). Un anuncio no puede preferir ni excluir por raza, color, religión,
   sexo, orientación o identidad, discapacidad, situación familiar (niños), origen nacional, ascendencia o edad; tampoco «No Section 8»
   (fuente de ingreso). Los filtros que sí existen son de la propiedad y de los papeles que se ACEPTAN, nunca de quién vive.
   La lista y los textos legales están por verificar con un abogado (LAUNCH-CHECKLIST). */
const BASE: [string, "es" | "en"][] = [
  ["no niños", "es"], ["sin niños", "es"], ["no se aceptan niños", "es"], ["solo adultos", "es"], ["sin familias", "es"], ["ideal para pareja", "es"], ["ideal para parejas", "es"],
  ["solo cristianos", "es"], ["solo católicos", "es"], ["solo hispanos", "es"], ["para hispanos", "es"], ["solo latinos", "es"], ["para inmigrantes", "es"],
  ["solo mujeres", "es"], ["solo hombres", "es"], ["no discapacitados", "es"], ["no section 8", "es"], ["no se acepta section 8", "es"],
  ["no kids", "en"], ["no children", "en"], ["adults only", "en"], ["no families", "en"], ["ideal for couple", "en"], ["christians only", "en"],
  ["hispanics only", "en"], ["latinos only", "en"], ["for immigrants", "en"], ["women only", "en"], ["men only", "en"], ["no disabled", "en"], ["no section 8", "en"],
];
/* Sin acentos, en minúsculas y solo letras y números: «¡NO Niños!» y «no ninos» son lo mismo. */
export const normalizar = (s: string) => ` ${s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
export const esBase = (frase: string) => BASE.some(([f]) => normalizar(f) === normalizar(frase));
export const frasesBase = () => BASE.map(([f, l]) => ({ phrase: f, lang: l }));

type Q = Pool | PoolClient;
export type Frenada = { frase: string };
/* Revisa los textos de un anuncio (nombre, descripción, lo que piden, contrato; en español y en inglés). Devuelve la primera frase que no
   puede ir, tal como está en la lista, para que el panel diga cuál quitar; null si todo pasa. */
export async function revisarTexto(es: string | string[], en: string | string[], c: Q = db()): Promise<Frenada | null> {
  const T = normalizar([...[es].flat(), ...[en].flat()].filter(Boolean).join(" · "));
  const extra = (await c.query<{ phrase: string }>(`select phrase from fair_housing_phrases where active order by id`)).rows.map((x) => x.phrase);
  for (const f of [...BASE.map(([x]) => x), ...extra]) {
    const n = normalizar(f);
    if (n.trim().length >= 3 && T.includes(n)) return { frase: f };
  }
  return null;
}
