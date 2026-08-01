'use client';

// Datos públicos de la landing (handoff "ToLatino Home", variante B, 2026-07-29).
//
// El handoff trae negocios, listados y testimonios de MUESTRA. Publicarlos sería
// repetir lo que se limpió el 2026-07-29: datos fabricados presentados como
// reales (regla #8) — y en la página más vista, con testimonios inventados, que
// es lo más dañino para la confianza. Aquí se traen los REALES (migración 0131);
// cuando no hay, la sección correspondiente se oculta o muestra su vacío.

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type PlatformStats = {
  businesses: number;
  verified: number;
  avg_rating: number | null;
  reviews: number;
  neighbors: number;
  posts: number;
  events_week: number;
  properties: number;
  vehicles: number;
  jobs: number;
  by_category: Record<string, number>;
};

export type Testimonial = {
  id: string;
  author: string;
  initials: string;
  rating: number;
  body_es: string | null;
  body_en: string | null;
  biz_name: string;
  biz_slug: string;
  biz_city: string | null;
};

export type MarketRow = {
  slug?: string;
  id?: string;
  name: string;
  meta: string | null;
  price: number | null;
  deal?: string | null;
  bhph?: boolean | null;
  pay?: string | null;
};

export type Marketplace = { homes: MarketRow[]; autos: MarketRow[]; jobs: MarketRow[] };

const EMPTY_MARKET: Marketplace = { homes: [], autos: [], jobs: [] };

/**
 * Una sola carga por montaje. Los tres RPCs son `stable`, así que la respuesta
 * se puede cachear; no se re-piden al teclear ni al cambiar de idioma.
 * Si algo falla, se devuelve vacío y las secciones se ocultan solas — nunca se
 * cae a datos de muestra.
 */
export function useLandingData() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [market, setMarket] = useState<Marketplace>(EMPTY_MARKET);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const [s, t, m] = await Promise.all([
          supabase!.rpc('platform_stats'),
          supabase!.rpc('landing_testimonials', { max_results: 3 }),
          supabase!.rpc('landing_marketplace', { max_each: 3 }),
        ]);
        if (cancelled) return;
        if (!s.error && s.data) setStats(s.data as unknown as PlatformStats);
        if (!t.error && Array.isArray(t.data)) setTestimonials(t.data as unknown as Testimonial[]);
        if (!m.error && m.data) {
          const mm = m.data as unknown as Partial<Marketplace>;
          setMarket({ homes: mm.homes ?? [], autos: mm.autos ?? [], jobs: mm.jobs ?? [] });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { stats, testimonials, market, loading };
}

/** 1284 → "1,284" · 48200 → "48.2k". Sin inventar: si no hay dato, guion. */
export function compact(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  if (n >= 10000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return n.toLocaleString('en-US');
}

/** $34,900 · $1,650 — sin decimales, que es como se leen los precios del mercado. */
export function money(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `$${Math.round(n).toLocaleString('en-US')}`;
}
