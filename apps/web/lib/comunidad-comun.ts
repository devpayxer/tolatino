/* Comunidad · lo que comparten la pantalla y el servidor (sin base): rangos, tipos, cuánto hace y la forma de una publicación. */
type Bi = { es: string; en: string };

/* Los 10 rangos (com-data.js RANKS). Los nombres los puede cambiar el equipo (Super Admin › Gamification › Rangos, tabla ranks): el
   servidor manda los vigentes (YoCom.rangos) y fijarRangos() los pone antes de pintar, igual en el servidor y en el navegador. */
export const RANGOS: Bi[] = [
  { es: "Recluta", en: "Recruit" }, { es: "Vecino", en: "Neighbor" }, { es: "Cabo", en: "Corporal" }, { es: "Sargento", en: "Sergeant" },
  { es: "Sargento Mayor", en: "Sergeant Major" }, { es: "Teniente", en: "Lieutenant" }, { es: "Capitán", en: "Captain" }, { es: "Comandante", en: "Commander" },
  { es: "Coronel", en: "Colonel" }, { es: "General del Barrio", en: "Neighborhood General" },
];
export const rango = (n: number) => RANGOS[Math.min(10, Math.max(1, n)) - 1]!;
export function fijarRangos(L: Bi[] | null | undefined) {
  if (!L || L.length !== 10) return;
  L.forEach((x, i) => { if (x?.es && (RANGOS[i]!.es !== x.es || RANGOS[i]!.en !== x.en)) RANGOS[i] = { es: x.es, en: x.en || x.es }; });
}

export const TIPO: Record<"pregunta" | "recomendacion" | "encuesta" | "publicacion", { es: string; en: string; ic: string; s: Bi }> = {
  pregunta: { es: "Pregunta", en: "Question", ic: "help", s: { es: "Te responden los vecinos", en: "Neighbors answer" } },
  recomendacion: { es: "Recomendación", en: "Recommendation", ic: "store", s: { es: "Cuenta a quién vas y por qué", en: "Say who you go to and why" } },
  encuesta: { es: "Encuesta", en: "Poll", ic: "check", s: { es: "Los vecinos votan", en: "Neighbors vote" } },
  publicacion: { es: "Publicación", en: "Post", ic: "news", s: { es: "Un aviso, una foto, algo del barrio", en: "A notice, a photo, local news" } },
};

/* «Ahora · 12 min · 3 h · Ayer · 4 días» (prototipo agoS). */
export function hace(iso: string, es: boolean, ahora = Date.now()) {
  const h = (ahora - new Date(iso).getTime()) / 3_600_000;
  if (h < 0.02) return es ? "Ahora" : "Now";
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`;
  if (h < 24) return `${Math.round(h)} h`;
  if (h < 48) return es ? "Ayer" : "Yesterday";
  return `${Math.round(h / 24)} ${es ? "días" : "days"}`;
}

export type Autor = { id: string | null; nombre: string; ini: string; foto: string | null; rango: number; oficial: boolean };
export type Pub = {
  id: string; kind: keyof typeof TIPO; topic: string | null; body: string; lang: "es" | "en"; at: string; editada: boolean; mia: boolean; editarHasta: string | null;
  fijada: boolean; salud: boolean; resuelta: boolean; cerrados: boolean; estado: "visible" | "hidden" | "deleted"; motivo: string | null;
  autor: Autor; lugar: Bi; invitado: boolean; mi: number | null;
  negocio: { id: string; nombre: string; meta: Bi; foto: string | null; verificado: boolean; para: string[] } | null;
  fotos: string[]; revision: number;
  encuesta: { opts: { l: string; n: number; pc: number }[]; mio: number | null; total: number; cierra: string; cerrada: boolean; ver: boolean } | null;
  up: number; dn: number; score: number; miVoto: number; guardada: boolean; comentarios: number;
};
export type Filtros = { tab: "todo" | "sig"; kind: keyof typeof TIPO | null; dist: 0 | 5 | 10 | 30; orden: "top" | "new" };
export const FILTROS0: Filtros = { tab: "todo", kind: null, dist: 0, orden: "top" };
export function leerFiltros(sp: Record<string, string | undefined>): Filtros {
  const kind = (["pregunta", "recomendacion", "encuesta", "publicacion"] as const).find((k) => k === sp.k) ?? null;
  const dist = ([5, 10, 30] as const).find((d) => String(d) === sp.d) ?? 0;
  return { tab: sp.t === "sig" ? "sig" : "todo", kind, dist, orden: sp.o === "new" ? "new" : "top" };
}

/* Porcentajes que suman 100 (mayor residuo): lo calcula el servidor; la pantalla solo los pinta. */
export function porcentajes(n: number[]): number[] {
  const t = n.reduce((a, x) => a + x, 0);
  if (!t) return n.map(() => 0);
  const raw = n.map((x) => (100 * x) / t), base = raw.map(Math.floor);
  let falta = 100 - base.reduce((a, x) => a + x, 0);
  for (const i of raw.map((x, i) => [x - Math.floor(x), i] as const).sort((a, b) => b[0] - a[0] || a[1] - b[1]).map((x) => x[1])) { if (falta <= 0) break; base[i]! += 1; falta--; }
  return base;
}
