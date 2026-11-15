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

/* 9n-7 · Lo que pide un rango, escrito desde su condición (cond de ranks): cuando el equipo cambia el número en Gamification › Rangos, el
   texto «Para subir» se reescribe con el número nuevo (nunca queda el viejo). Coronel (equipo) y General (plazas) no se editan aquí. */
export type CondRango = { tipo?: string; n?: number; dias?: number };
export const COND_EDITABLE = ["post_votos", "comentarios_votados", "recs_votadas", "semanas", "resenas", "invitados", "limpio_votos"] as const;
export const COND_N_MAX = 1000, COND_DIAS = [30, 365] as const, MIN_PUNTOS_MAX = 100000;
export function reqDeCond(c: CondRango): Bi | null {
  const n = Math.max(1, Math.floor(c.n ?? 0)), uno = n === 1, d = Math.floor(c.dias ?? 180);
  switch (c.tipo) {
    case "post_votos": return { es: `Una publicación con ${n} ${uno ? "voto" : "votos"} +`, en: `One post with ${n} ${uno ? "upvote" : "upvotes"}` };
    case "comentarios_votados": return { es: `${n} ${uno ? "comentario" : "comentarios"} con votos +`, en: `${n} ${uno ? "comment" : "comments"} with upvotes` };
    case "recs_votadas": return { es: `${n} ${uno ? "recomendación" : "recomendaciones"} de negocio con votos`, en: `${n} business ${uno ? "recommendation" : "recommendations"} with votes` };
    case "semanas": return { es: `${n} ${uno ? "semana activa" : "semanas activas seguidas"}`, en: `${n} active ${uno ? "week" : "weeks in a row"}` };
    case "resenas": return { es: `Aportes constantes y ${n} ${uno ? "reseña verificada" : "reseñas verificadas"}`, en: `Steady help and ${n} verified ${uno ? "review" : "reviews"}` };
    case "invitados": return { es: `${n} ${uno ? "vecino que invitaste y participa" : "vecinos que invitaste y participan"}`, en: `${n} ${uno ? "neighbor you invited who takes" : "neighbors you invited who take"} part` };
    case "limpio_votos": return { es: `Historial limpio ${d} días y ${n} votos +`, en: `Clean record for ${d} days and ${n} upvotes` };
    default: return null;
  }
}

