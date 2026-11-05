/* Matemática del mapa (la del prototipo, city-data.js): proyección Web Mercator, zoom a partir del radio y la
   cuadrícula de teselas a pintar. Pura: la usan el servidor y la pantalla. Las teselas son las nuestras
   (OpenStreetMap de Pensilvania servido por tileserver-gl en /teselas, infra/mapa). */
export type LL = [number, number]; // [lat, lng]
export const TESELAS = "/teselas/styles/basic-preview";

/* Zoom y escala exactos para que un radio de `rad` millas mida `px` píxeles en pantalla. */
export function vista(ll: LL, rad: number, px: number) {
  const mpp = (rad * 1609.34) / px;
  const zf = Math.log2((156543.03392 * Math.cos((ll[0] * Math.PI) / 180)) / mpp);
  const z = Math.max(3, Math.min(17, Math.floor(zf)));
  return { z, sc: Math.pow(2, zf - z), zf };
}

export function proyectar(ll: LL, z: number): [number, number] {
  const n = Math.pow(2, z), la = (ll[0] * Math.PI) / 180;
  return [((ll[1] + 180) / 360) * n * 256, ((1 - Math.log(Math.tan(la) + 1 / Math.cos(la)) / Math.PI) / 2) * n * 256];
}

/* Teselas que cubren un recuadro w×h centrado en `ll`, con su posición relativa al centro (para pintar con <img>). */
export function teselas(ll: LL, z: number, w: number, h: number, sc: number, base = TESELAS) {
  const [cx, cy] = proyectar(ll, z), hw = w / 2 / sc + 256, hh = h / 2 / sc + 256;
  const x0 = Math.floor((cx - hw) / 256), x1 = Math.floor((cx + hw) / 256), y0 = Math.floor((cy - hh) / 256), y1 = Math.floor((cy + hh) / 256);
  const out: { key: string; src: string; left: number; top: number }[] = [];
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) out.push({ key: `${z}/${x}/${y}`, src: `${base}/${z}/${x}/${y}.png`, left: x * 256 - cx, top: y * 256 - cy });
  return out;
}

/* Posición en píxeles de un punto respecto al centro, a un zoom y escala dados. */
export function punto(centro: LL, p: LL, z: number, sc: number) {
  const [cx, cy] = proyectar(centro, z), [px, py] = proyectar(p, z);
  return { left: (px - cx) * sc, top: (py - cy) * sc };
}

/* Distancia aproximada en millas (la del prototipo; para radios de pocas millas sobra precisión). */
export function millas(a: LL, b: LL) {
  const dy = (a[0] - b[0]) * 69.05, dx = (a[1] - b[1]) * 69.05 * Math.cos((((a[0] + b[0]) / 2) * Math.PI) / 180);
  return Math.sqrt(dx * dx + dy * dy);
}
