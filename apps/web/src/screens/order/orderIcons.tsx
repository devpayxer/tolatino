'use client';

// Inline SVG icons for OrderFlow, reproducing the handoff prototype's exact
// stroke icons (rounded, 2–2.4px). Kept local so the ordering flow matches the
// design pixel-for-pixel without depending on the app's other icon set.

import type { ReactNode } from 'react';

type P = { w?: number; stroke?: string; sw?: number; fill?: string };
const svg = (w: number, children: ReactNode, o: { stroke?: string; sw?: number; fill?: string } = {}) => (
  <svg width={w} height={w} viewBox="0 0 24 24" fill={o.fill ?? 'none'} stroke={o.stroke ?? 'currentColor'} strokeWidth={o.sw ?? 2} strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);

export const IconBack = ({ w = 18, stroke = '#1E1B2E' }: P) => svg(w, <polyline points="15 18 9 12 15 6" />, { stroke, sw: 2.4 });
export const IconShare = ({ w = 16 }: P) => svg(w, <><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></>, { stroke: '#1E1B2E', sw: 2.2 });
export const IconHeart = ({ w = 16, fill = 'none' }: P) => svg(w, <path d="M12 21s-7-4.5-9.3-9A5 5 0 0 1 12 6.5 5 5 0 0 1 21.3 12c-2.3 4.5-9.3 9-9.3 9z" />, { stroke: '#F0466E', sw: 2.2, fill });
export const IconTruck = ({ w = 14, stroke = 'currentColor' }: P) => svg(w, <><rect x="1" y="6" width="13" height="10" rx="1.5" /><path d="M14 9h4l3 3v4h-7" /><circle cx="6" cy="18" r="2" /><circle cx="17.5" cy="18" r="2" /></>, { stroke, sw: 2.2 });
export const IconPickup = ({ w = 14, stroke = 'currentColor' }: P) => svg(w, <><path d="M6 2 4 6v13a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V6l-2-4z" /><path d="M4 6h16" /><path d="M9 10a3 3 0 0 0 6 0" /></>, { stroke, sw: 2.2 });
export const IconPin = ({ w = 15, stroke = '#6D4DF6' }: P) => svg(w, <><path d="M12 21s7-6.4 7-11.5A7 7 0 0 0 5 9.5C5 14.6 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.4" /></>, { stroke, sw: 2 });
export const IconSearch = ({ w = 15 }: P) => svg(w, <><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.5" y2="16.5" /></>, { stroke: '#9A96AE', sw: 2.2 });
export const IconX = ({ w = 15, stroke = '#1E1B2E' }: P) => svg(w, <><line x1="5" y1="5" x2="19" y2="19" /><line x1="19" y1="5" x2="5" y2="19" /></>, { stroke, sw: 2.6 });
export const IconPlus = ({ w = 16, stroke = '#7B61FF' }: P) => svg(w, <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>, { stroke, sw: 2.8 });
export const IconMinus = ({ w = 13, stroke = '#7B61FF' }: P) => svg(w, <line x1="5" y1="12" x2="19" y2="12" />, { stroke, sw: 2.8 });
export const IconCheck = ({ w = 13, stroke = '#fff', sw = 3.4 }: P) => svg(w, <polyline points="20 6 9 17 4 12" />, { stroke, sw });
export const IconChevron = ({ w = 17, stroke = '#C9C5D6' }: P) => svg(w, <polyline points="9 6 15 12 9 18" />, { stroke, sw: 2.4 });
export const IconLock = ({ w = 16, stroke = '#1F8A4C' }: P) => svg(w, <><rect x="3" y="11" width="18" height="10" rx="2" /><path d="M7 11V8a5 5 0 0 1 10 0v3" /></>, { stroke, sw: 2 });
export const IconTag = ({ w = 17, stroke = '#6D4DF6' }: P) => svg(w, <><path d="M3 11l8-8 9 9-8 8z" /><circle cx="7.5" cy="7.5" r="1.2" fill="#6D4DF6" /></>, { stroke, sw: 2 });

// Category glyph — the striped tile carries the category color; the glyph is a
// light food mark. A small keyword map gives variety; utensils is the fallback.
const GLYPHS: Record<string, ReactNode> = {
  cup: <><path d="M6 4h12l-1 16H7z" /><path d="M9 9h6" /></>,
  coffee: <><path d="M4 8h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" /><path d="M17 9h2a2 2 0 0 1 0 4h-2" /><path d="M7 4v1M10 4v1M13 4v1" /></>,
  icecream: <><path d="M8 10a4 4 0 0 1 8 0" /><path d="M8 10h8l-4 11z" /><path d="M9 14h6" /></>,
  drumstick: <><path d="M15 3a5 5 0 0 0-5 8l-1 1a3 3 0 1 0 3 3l1-1a5 5 0 0 0 8-5 5 5 0 0 0-6-6z" /><path d="M8.5 15.5 4 20" /></>,
  fish: <><path d="M3 12s3-5 9-5 9 5 9 5-3 5-9 5-9-5-9-5z" /><circle cx="16" cy="11" r="0.6" fill="currentColor" /></>,
  soup: <><path d="M4 11h16a8 8 0 0 1-16 0z" /><path d="M8 7c0-1 1-1 1-2M12 7c0-1 1-1 1-2M16 7c0-1 1-1 1-2" /></>,
  leaf: <><path d="M4 12c0 5 3 8 8 8 0-8-3-12-8-12" /><path d="M20 5c0 9-5 12-9 13" /></>,
  utensils: <><path d="M6 3v7a2 2 0 0 0 4 0V3M8 10v11" /><path d="M17 3c-1.5 0-2.5 2-2.5 5s1 4 2.5 4v9" /></>,
};
const glyphKey = (cat: string): keyof typeof GLYPHS => {
  const c = cat.toLowerCase();
  if (/(bebida|jugo|batida|drink|refresco)/.test(c)) return 'cup';
  if (/(caf|coffee|te)/.test(c)) return 'coffee';
  if (/(postre|dessert|helado|dulce)/.test(c)) return 'icecream';
  if (/(pollo|chicken|ala)/.test(c)) return 'drumstick';
  if (/(marisco|pescado|seafood|fish)/.test(c)) return 'fish';
  if (/(sopa|asopao|caldo|soup)/.test(c)) return 'soup';
  if (/(ensalada|salad|vegan|veg)/.test(c)) return 'leaf';
  return 'utensils';
};
export function Glyph({ cat, size = 30 }: { cat: string; size?: number }) {
  return svg(size, GLYPHS[glyphKey(cat)], { stroke: 'rgba(30,27,46,.34)', sw: 2 });
}
