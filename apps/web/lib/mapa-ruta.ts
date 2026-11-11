/* 8e · El mapa de una ruta con las piezas que ya existen (hueco #6 del plan: el pin del repartidor sobre el mapa propio): RadiusMap del sistema
   (2ag, el mapa de Ciudad) con las teselas propias (/teselas, lib/mapa-geo.ts). El centro del mapa es la última posición del repartidor (el pin
   de RadiusMap); los puntos son el destino (tinta) y, solo para el negocio y el Super Admin, el rastro (Action, tenue). Pura: sin red ni datos. */
import { punto, teselas, type LL } from "./mapa-geo";

export type MapaRuta = { tiles: { src: string; left: number; top: number }[]; dots: { x: number; y: number; color: string }[] };
const W = 720, H = 260;

export function mapaRuta(centro: LL, o: { rastro?: LL[]; destino?: LL | null; zoom?: number } = {}): MapaRuta {
  const z = o.zoom ?? 16, sc = 1;
  const dentro = (p: { left: number; top: number }) => Math.abs(p.left) < W / 2 && Math.abs(p.top) < H / 2;
  const dots: MapaRuta["dots"] = [];
  for (const ll of o.rastro ?? []) { const p = punto(centro, ll, z, sc); if (dentro(p)) dots.push({ x: Math.round(p.left), y: Math.round(p.top), color: "rgba(75,55,245,.55)" }); }
  if (o.destino) { const p = punto(centro, o.destino, z, sc); if (dentro(p)) dots.push({ x: Math.round(p.left), y: Math.round(p.top), color: "var(--tl-ink)" }); }
  return { tiles: teselas(centro, z, W, H, sc).map(({ src, left, top }) => ({ src, left: Math.round(left), top: Math.round(top) })), dots };
}

/* El zoom que deja ver el rastro entero (Super Admin): el mayor zoom en que todos los puntos caben en W×H alrededor del centro. */
export function zoomQueCabe(centro: LL, puntos: LL[], max = 17, min = 11): number {
  for (let z = max; z > min; z--) if (puntos.every((ll) => { const p = punto(centro, ll, z, 1); return Math.abs(p.left) < W / 2 - 12 && Math.abs(p.top) < 100; })) return z;
  return min;
}

/* «Hace N min» de la última posición (sin hora de llegada inventada: solo cuándo se vio por última vez). */
export function haceCuanto(iso: string, es: boolean, ahora = Date.now()): string {
  const s = Math.max(0, Math.round((ahora - Date.parse(iso)) / 1000));
  if (s < 60) return es ? "hace segundos" : "seconds ago";
  const m = Math.round(s / 60);
  if (m < 60) return es ? `hace ${m} min` : `${m} min ago`;
  const h = Math.round(m / 60);
  return es ? `hace ${h} h` : `${h} h ago`;
}
// La hora como en el resto de la app («8:42 AM» en los dos idiomas).
export const horaCorta = (iso: string, _es: boolean) => new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "America/New_York" }).format(new Date(iso));
