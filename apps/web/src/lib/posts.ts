'use client';

// Una fila de `posts` de la base → el objeto `Post` que pinta la interfaz.
//
// Vivía dentro de `Comunidad.tsx` y no se exportaba, así que quien lo necesitaba
// fuera tenía que recibirlo por prop (`NeighborSheet`) o quedarse sin él —
// «Mis publicaciones» acabó leyendo el feed geográfico de la ciudad en la que
// estuvieras, así que tus propias publicaciones desaparecían al cambiar de
// ciudad. (2ª auditoría de Comunidad, 2026-08-03.)

import type { Post } from '@/data/fixtures';

/** 30 millas — el radio hiperlocal de la comunidad (igual que `posts_near`). */
export const COMMUNITY_RADIUS_M = 48280;

export function relTime(iso: string): [string, string] {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return [`hace ${mins} min`, `${mins}m`];
  const h = Math.round(mins / 60);
  if (h < 24) return [`hace ${h} h`, `${h}h`];
  const d = Math.round(h / 24);
  return [`hace ${d} d`, `${d}d`];
}

export type PostRow = {
  id: string;
  type: Post['type'];
  author_id: string | null;
  author_initials: string;
  author_color: string;
  author_name: string;
  hood: string | null;
  city: string | null;
  created_at: string;
  recommends: number | null;
  edited_at: string | null;
  pinned: boolean | null;
  business_name: string | null;
  business_slug: string | null;
  business_rating: number | null;
  poll_options: string[] | null;
  poll_votes: number[] | null;
  images: string[] | null;
  body_es: string;
  body_en: string;
  lat: number | null;
  lng: number | null;
};

export function mapPost(r: PostRow): Post {
  const [tEs, tEn] = relTime(r.created_at);
  return {
    id: String(r.id),
    type: r.type,
    initials: r.author_initials,
    color: r.author_color,
    name: r.author_name,
    authorId: r.author_id ?? undefined,
    hoodEs: r.hood ?? '',
    city: r.city ?? undefined,
    timeEs: tEs,
    timeEn: tEn,
    createdAt: r.created_at,
    pinned: !!r.pinned,
    recommends: Number(r.recommends ?? 0),
    edited: !!r.edited_at,
    business: r.business_name ?? undefined,
    businessSlug: r.business_slug ?? undefined,
    bizRating: r.business_rating != null ? Number(r.business_rating).toFixed(1) : undefined,
    poll: r.poll_options ?? undefined,
    pollBase: r.poll_votes ?? undefined,
    images: r.images ?? undefined,
    es: r.body_es,
    en: r.body_en,
  };
}
