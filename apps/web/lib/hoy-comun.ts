/* Hoy en el barrio · lo que comparten la pantalla y el servidor (sin base): los tipos de aviso (com-data.js HOY_T), las categorías
   de los chips (HOY L169–179) y la forma de una historia (una tarjeta por negocio con hasta 3 avisos de menos de 24 h). */
type Bi = { es: string; en: string };

export const HOY_T = { of: { es: "OFERTA", en: "DEAL" }, nv: { es: "NOVEDAD", en: "NEW" }, ll: { es: "LLEGÓ", en: "JUST IN" }, av: { es: "AVISO", en: "NOTICE" } } as const;
export type HoyT = keyof typeof HOY_T;
/* Novedades → tipo de Hoy: la oferta es OFERTA; «Hoy hay / Llegó» es LLEGÓ; el aviso de horario es AVISO; la novedad y la encuesta
   salen como NOVEDAD (la encuesta se vota en la página del negocio). */
export const TIPO_HOY: Record<string, HoyT> = { oferta: "of", hoy: "ll", aviso: "av", novedad: "nv", encuesta: "nv" };

/* Chips por categoría (prototipo hoyV): Todo · Comida · Belleza · Autos · Hogar · Salud. */
export const HOY_CATS: { k: string; cat: string | null; l: Bi }[] = [
  { k: "todo", cat: null, l: { es: "Todo", en: "All" } }, { k: "comida", cat: "NEG-FOOD", l: { es: "Comida", en: "Food" } },
  { k: "belleza", cat: "NEG-BELL", l: { es: "Belleza", en: "Beauty" } }, { k: "autos", cat: "NEG-AUTO", l: { es: "Autos", en: "Cars" } },
  { k: "hogar", cat: "NEG-HOGAR", l: { es: "Hogar", en: "Home" } }, { k: "salud", cat: "NEG-SALUD", l: { es: "Salud", en: "Health" } },
];
export const catHoy = (k: string | undefined | null) => HOY_CATS.find((c) => c.k === k) ?? HOY_CATS[0]!;

export type AvisoHoy = { id: string; t: HoyT; texto: string; at: string; quedan: number; foto: string | null };
export type Historia = { id: string; nombre: string; logo: string | null; mi: number | null; domicilio: boolean; avisos: AvisoHoy[] };
export type PaginaHoy = { historias: Historia[]; mas: string | null };

/* «QUEDAN 22 H» / «22 H LEFT» (dash2-nov whenOf). */
export const quedanH = (n: number, es: boolean) => (es ? `QUEDAN ${Math.max(1, n)} H` : `${Math.max(1, n)} H LEFT`);

/* Lo que la StoryCard del sistema recibe de una historia: lo que le queda a cada aviso en Hoy («QUEDAN 22 H») va arriba a la derecha en
   las tarjetas anchas (≥ 200 px) y junto al tipo en las angostas del teléfono (así el nombre del negocio no se corta); abajo, la
   distancia (o «A DOMICILIO»). `onEnd` (lo pone la pantalla) abre la página del negocio. */
export function tarjetaHoy(h: Historia, es: boolean, angosta = false) {
  const lugar = h.mi != null ? `${h.mi} MI` : h.domicilio ? (es ? "A DOMICILIO" : "MOBILE") : "";
  return {
    name: h.nombre, logo: h.logo,
    posts: h.avisos.map((a) => { const t = es ? HOY_T[a.t].es : HOY_T[a.t].en, q = quedanH(a.quedan, es);
      return { type: angosta ? `${t} · ${q}` : t, text: a.texto, ago: angosta ? "" : q, image: a.foto }; }),
    distance: lugar,
  };
}
