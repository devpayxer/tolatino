/* Puntos y rangos · lo que comparten la pantalla y el servidor (sin base): las reglas fijas de los puntos (PTS_RULES de com-data.js
   L27–30, con el tope que decide el equipo) y la forma de lo que el servidor manda a APP-GAM-RANGO y APP-GAM-TABLA. */
type Bi = { es: string; en: string };

export const REGLAS_PUNTOS = (tope: number): Bi[] => [
  { es: `Máximo ${tope} puntos al día.`, en: `Up to ${tope} points a day.` },
  { es: "Estar conectado, seguir o tener seguidores no da puntos.", en: "Being online, following or having followers earns nothing." },
  { es: "Un voto − baja el orden de la publicación, no tu rango.", en: "A downvote lowers the post, not your rank." },
  { es: "Si algo se borra por las reglas, se restan sus puntos.", en: "If something is removed for breaking the rules, its points go too." },
];
export const LINEA_PUNTOS: Bi = { es: "Aquí nada se compra: los puntos salen de los votos de tus vecinos, nunca de estar conectado.", en: "Nothing is bought here: points come from your neighbors’ votes, never from being online." };
export const CUANDO_PATIO: Bi = { es: "Cuando abra El Patio", en: "When El Patio opens" };

export type Rango = { n: number; name: Bi; req: Bi; unl: Bi; min: number | null; patio: boolean };
export type MiRango = {
  n: number; puntos: number; hoy: number; tope: number; mes: number; rangos: Rango[];
  siguiente: { n: number; puntos: { cur: number; tot: number } | null; cond: { cur: number; tot: number; unidad: Bi } | null; equipo: boolean; plazas: boolean } | null;
  reglas: { key: string; label: Bi; v: number; on: boolean }[];
  log: { t: Bi; v: number; at: string }[];
  insignias: { k: string; t: Bi; s: Bi }[];
};
export type FilaTabla = { pos: number; id: string; nombre: string; ini: string; foto: string | null; rango: number; zona: Bi | null; v: number; yo: boolean };
export type Tabla = {
  mes: "actual" | "anterior"; tab: "general" | "rec" | "resp"; ciudad: string; meses: { actual: string; anterior: string };
  estado: { congelada: boolean; cerrada: boolean; ganador: string | null; cierraEl: string | null; reinicia: string };
  filas: FilaTabla[]; mas: string | null; yo: { pos: number; v: number } | null; excluido: boolean; premio: number;
};

/* La unidad de la condición de cada rango (para «3 / 5 votos»). */
export const UNIDAD: Record<string, Bi> = {
  post_votos: { es: "votos + en una publicación", en: "upvotes on one post" },
  comentarios_votados: { es: "comentarios con votos +", en: "comments with upvotes" },
  recs_votadas: { es: "recomendaciones con votos", en: "recommendations with votes" },
  semanas: { es: "semanas activas seguidas", en: "active weeks in a row" },
  resenas: { es: "reseñas verificadas", en: "verified reviews" },
  invitados: { es: "invitados que participan", en: "invitees who take part" },
  limpio_votos: { es: "votos + recibidos, con historial limpio", en: "upvotes received, with a clean record" },
};

/* «noviembre» / «November» del primer día de un mes (YYYY-MM-01). */
export function nombreMes(iso: string, es: boolean) {
  const [y, m] = iso.split("-").map(Number);
  return new Date(Date.UTC(y!, (m ?? 1) - 1, 15)).toLocaleDateString(es ? "es-US" : "en-US", { month: "long", timeZone: "UTC" });
}
