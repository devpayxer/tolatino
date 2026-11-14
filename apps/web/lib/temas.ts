import "server-only";
import { db } from "./db";

/* 9m · «Lo que más mencionan» (L280): los temas de las reseñas VISIBLES de cada negocio, contados del texto (en español y en inglés) con una lista de
   palabras propia (sin modelo ni terceros). Se cuenta cuántas reseñas mencionan cada tema; sale si lo mencionan 2 o más. Lo calcula el barrido
   (review_topics, derivado: nunca se edita a mano) solo para los negocios con reseñas nuevas, editadas u ocultadas desde la vuelta anterior
   (a 1 M de reseñas no se recuenta todo cada vez). La ficha lee los 5 primeros. */
export const TEMAS: Record<string, { es: string; en: string; re: string }> = {
  servicio: { es: "Servicio y trato", en: "Service and staff", re: "atenci[oó]n|amable|servicio|trato|atent[oa]s?|friendly|service|staff|welcoming|kind" },
  precio: { es: "Precio", en: "Price", re: "precio|barat[oa]|car[oa]s?\\y|econ[oó]mic[oa]|vale la pena|price|cheap|expensive|affordable|worth" },
  rapidez: { es: "Rapidez", en: "Speed", re: "r[aá]pid[oa]|espera|tard[oóa]|demor|fast|quick|wait|slow|on time|a tiempo|puntual" },
  sabor: { es: "Sabor", en: "Taste", re: "sabor|delicios[oa]|ric[oa]s?\\y|sabros[oa]|tasty|delicious|flavor|flavour" },
  limpieza: { es: "Limpieza", en: "Cleanliness", re: "limpi[oa]|limpieza|sucio|clean|dirty|tidy" },
  porciones: { es: "Porciones", en: "Portions", re: "porci[oó]n|porciones|abundante|grande[s]?|portion|generous|huge" },
  ambiente: { es: "Ambiente", en: "Atmosphere", re: "ambiente|m[uú]sica|ruido|acogedor|atmosphere|vibe|music|cozy|cosy" },
  calidad: { es: "Calidad", en: "Quality", re: "calidad|profesional|bien hech|quality|professional|well done" },
  espanol: { es: "Hablan español", en: "Speak Spanish", re: "espa[nñ]ol|spanish|hablan" },
  parqueo: { es: "Estacionamiento", en: "Parking", re: "parqueo|estacionamiento|parking" },
};
const MIN = 2, TOP = 5;

export async function rehacerTemas(): Promise<number> {
  // Los negocios con reseñas que cambiaron desde la última vuelta (o sin temas todavía), por partes.
  const L = (await db().query<{ id: string }>(
    `select distinct r.business_id as id from reviews r
      where greatest(r.created_at, coalesce(r.edited_at, r.created_at), coalesce(r.hidden_at, r.created_at)) >
            coalesce((select max(t.refreshed_at) from review_topics t where t.business_id = r.business_id), '-infinity'::timestamptz)
      limit 500`)).rows;
  const casos = Object.entries(TEMAS).map(([k, t]) => `count(*) filter (where lower(coalesce(body, '')) ~ '(${t.re.replace(/'/g, "''")})')::int as "${k}"`).join(", ");
  for (const { id } of L) {
    const c = (await db().query<Record<string, number>>(`select ${casos} from reviews where business_id = $1 and status = 'visible' and coalesce(body, '') <> ''`, [id])).rows[0] ?? {};
    await db().query(
      `with v (topic, n) as (select * from unnest($2::text[], $3::int[]))
       insert into review_topics (business_id, topic, n, refreshed_at) select $1, topic, n, now() from v
       on conflict (business_id, topic) do update set n = excluded.n, refreshed_at = now()`,
      [id, Object.keys(TEMAS), Object.keys(TEMAS).map((k) => Number(c[k] ?? 0))]);
  }
  return L.length;
}

export type Tema = { k: string; es: string; en: string; n: number };
export async function temasDe(negocio: string): Promise<Tema[]> {
  const r = await db().query<{ topic: string; n: number }>(`select topic, n from review_topics where business_id = $1 and n >= $2 order by n desc, topic limit $3`, [negocio, MIN, TOP]);
  return r.rows.filter((x) => TEMAS[x.topic]).map((x) => ({ k: x.topic, es: TEMAS[x.topic]!.es, en: TEMAS[x.topic]!.en, n: x.n }));
}
