'use client';

// Datos públicos de la portada (handoff "To'Latino — Official Home Page",
// 2026-08-02, que reemplaza los handoffs anteriores de Home).
//
// El handoff trae 19 publicaciones de MUESTRA para la tarjeta del feed y lo dice
// explícitamente: «The community feed is static sample data — production should
// read the real feed». Publicar las de muestra sería repetir lo que se limpió el
// 2026-07-29: personas y recomendaciones inventadas presentadas como reales, en
// la página más vista (regla #8). Aquí se lee el feed REAL; si no hay nada
// alrededor, la tarjeta simplemente no se dibuja.
//
// El mismo handoff prohíbe conteos: «No platform statistics appear anywhere; do
// not add counts (deliberate pre-launch honesty)». Por eso este archivo ya no
// expone `platform_stats` ni testimonios ni mercado: la portada no los usa. Las
// funciones SQL de la migración 0131 quedan en la base, sin llamador.
//
// ESCALA: una sola llamada a `posts_near` (índice GIST vía ST_DWithin, migración
// 0130) con un tope pequeño. La portada no pagina ni recarga: se pide una vez
// por montaje y se rota en el cliente.

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/lib/state';
import type { PostType } from '@/data/fixtures';

/** Lo mínimo que pinta la tarjeta del hero — no se traen columnas de más. */
export type FeedTeaser = {
  id: string;
  type: PostType;
  name: string;
  initials: string;
  color: string;
  hood: string;
  es: string;
  en: string;
  minutes: number; // antigüedad en minutos; el texto se arma en el idioma activo
};

// 30 millas: el mismo radio hiperlocal que usa el feed de Comunidad.
const RADIUS_M = 48280;
const MAX = 20;

const TYPES: PostType[] = ['ask', 'rec', 'local', 'sale', 'poll'];

/**
 * Publicaciones reales cerca de la ciudad elegida, para la tarjeta rotatoria del
 * hero. Devuelve `[]` mientras carga y también cuando no hay nada: la portada
 * oculta la tarjeta en ambos casos (mejor sin tarjeta que con vecinos inventados).
 */
export function useLandingFeed(): FeedTeaser[] {
  const { coords } = useApp();
  const [posts, setPosts] = useState<FeedTeaser[]>([]);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase!.rpc('posts_near', {
        user_lat: coords.lat, user_lng: coords.lng, radius_m: RADIUS_M, max_results: MAX,
      });
      if (cancelled || error || !Array.isArray(data)) return;
      const now = Date.now();
      setPosts((data as Record<string, unknown>[]).map((r): FeedTeaser => {
        const t = String(r.type);
        return {
          id: String(r.id),
          type: (TYPES.includes(t as PostType) ? t : 'local') as PostType,
          name: String(r.author_name ?? ''),
          initials: String(r.author_initials ?? ''),
          color: String(r.author_color ?? '#7B61FF'),
          hood: String(r.hood ?? ''),
          es: String(r.body_es ?? ''),
          en: String(r.body_en ?? r.body_es ?? ''),
          minutes: Math.max(1, Math.round((now - new Date(String(r.created_at)).getTime()) / 60000)),
        };
      }).filter((p) => p.es.trim().length > 0));
    })();
    return () => { cancelled = true; };
  }, [coords.lat, coords.lng]);

  return posts;
}

/** 4 → "hace 4 min" · 90 → "hace 2 h" · 3000 → "hace 2 d". */
export function agoText(minutes: number, es: boolean): string {
  if (minutes < 60) return es ? `hace ${minutes} min` : `${minutes} min ago`;
  const h = Math.round(minutes / 60);
  if (h < 24) return es ? `hace ${h} h` : `${h} h ago`;
  const d = Math.round(h / 24);
  return es ? `hace ${d} d` : `${d} d ago`;
}
