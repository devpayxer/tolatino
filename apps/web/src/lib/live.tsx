'use client';

// Live data layer: reads businesses / events / posts from Supabase
// (Postgres + PostGIS) and maps rows to the app's fixture shapes. Serves the
// local fixtures until Supabase responds (or when it isn't configured), so
// the app always works. Geo: distance comes from the `businesses_v2` RPC
// (PostGIS st_distance from the selected city's center).

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { BUSINESSES, EVENTS, POSTS, type Business, type EventItem, type Post } from '@/data/fixtures';
import { CAT, type CatKey } from '@/lib/tiles';
import { useApp } from '@/lib/state';

const MONTHS_ES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

const isCatKey = (v: string): v is CatKey => v in CAT;

function relTime(iso: string): [string, string] {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return [`hace ${mins} min`, `${mins}m`];
  const h = Math.round(mins / 60);
  if (h < 24) return [`hace ${h} h`, `${h}h`];
  const d = Math.round(h / 24);
  return [`hace ${d} d`, `${d}d`];
}

type LiveData = {
  businesses: Business[];
  events: EventItem[];
  posts: Post[];
  live: boolean;
  /** Re-fetch from Supabase (e.g. right after publishing a post). */
  refresh: () => void;
};

const Ctx = createContext<LiveData>({ businesses: BUSINESSES, events: EVENTS, posts: POSTS, live: false, refresh: () => {} });

// ~80 km radius for businesses/events: keeps a whole metro together.
const RADIUS_M = 80000;
// 30 miles for the hyperlocal community feed.
const COMMUNITY_RADIUS_M = 48280;

export function LiveDataProvider({ children }: { children: ReactNode }) {
  const { coords } = useApp();
  const [version, setVersion] = useState(0);
  const [data, setData] = useState<Omit<LiveData, 'refresh'>>({ businesses: BUSINESSES, events: EVENTS, posts: POSTS, live: false });

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    const { lat, lng } = coords; // real coords from geolocation / city pick

    (async () => {
      const [biz, ev, po] = await Promise.all([
        // businesses + events scoped to the user's metro by real distance
        supabase.rpc('businesses_v2', { user_lat: lat, user_lng: lng, in_city: null, max_results: 50, radius_m: RADIUS_M }),
        supabase.rpc('events_near', { user_lat: lat, user_lng: lng, radius_m: RADIUS_M, max_results: 50 }),
        // community feed is hyperlocal → posts within 30 miles of the user
        supabase.rpc('posts_near', { user_lat: lat, user_lng: lng, radius_m: COMMUNITY_RADIUS_M, max_results: 50 }),
      ]);
      if (cancelled) return;

      const next: Omit<LiveData, 'refresh'> = { businesses: BUSINESSES, events: EVENTS, posts: POSTS, live: false };

      // When a query SUCCEEDS we trust its result — even if empty (a city with
      // no listings genuinely shows none). Fixtures remain only if the query
      // errored (e.g. Supabase not configured, or migrations not applied yet).
      if (!biz.error && Array.isArray(biz.data)) {
        const rows = (biz.data as Record<string, unknown>[]).filter((r) => isCatKey(String(r.category_id)));
        next.businesses = rows.map((r, i): Business => {
          const distM = r.distance_m as number | null;
          return {
            id: i,
            name: String(r.name),
            cat: String(r.category_id) as CatKey,
            rating: Number(r.rating).toFixed(1),
            reviews: Number(r.reviews_count),
            dist: distM != null ? `${(distM / 1609.34).toFixed(1)} mi` : '— mi',
            price: (r.price_level as Business['price']) ?? '$',
            open: Boolean(r.is_open),
            verified: r.tier !== 'free',
            endorse: Number(r.endorse_count ?? 0),
            t: [String(r.tile_a ?? '#EFEBFF'), String(r.tile_b ?? '#E5DEF9')],
            specEs: String(r.specialty_es ?? ''),
            specEn: String(r.specialty_en ?? ''),
            amEs: (r.amenities_es as string[]) ?? [],
            amEn: (r.amenities_en as string[]) ?? [],
            revEs: String(r.review_es ?? ''),
            revEn: String(r.review_en ?? ''),
          };
        });
        next.live = true;
      }

      if (!ev.error && Array.isArray(ev.data)) {
        next.events = (ev.data as Record<string, unknown>[]).map((r, i): EventItem => {
          const d = new Date(String(r.starts_at));
          return {
            id: i,
            dEs: MONTHS_ES[d.getMonth()],
            day: String(d.getDate()).padStart(2, '0'),
            cat: r.cat as EventItem['cat'],
            tEs: String(r.title_es),
            tEn: String(r.title_en),
            lEs: String(r.venue_es),
            lEn: String(r.venue_en),
            going: Number(r.going_count ?? 0),
            free: r.price_label == null,
            price: (r.price_label as string) ?? undefined,
            t: [String(r.tile_a ?? '#EFEBFF'), String(r.tile_b ?? '#E5DEF9')],
            timeEs: String(r.time_label_es ?? ''),
            timeEn: String(r.time_label_en ?? ''),
            descEs: String(r.desc_es ?? ''),
            descEn: String(r.desc_en ?? ''),
          };
        });
        next.live = true;
      }

      if (!po.error && Array.isArray(po.data)) {
        next.posts = (po.data as Record<string, unknown>[]).map((r): Post => {
          const [tEs, tEn] = relTime(String(r.created_at));
          return {
            id: String(r.id),
            type: r.type as Post['type'],
            initials: String(r.author_initials),
            color: String(r.author_color),
            name: String(r.author_name),
            hoodEs: String(r.hood ?? ''),
            timeEs: tEs,
            timeEn: tEn,
            recommends: Number(r.recommends ?? 0),
            business: (r.business_name as string) ?? undefined,
            bizRating: r.business_rating != null ? Number(r.business_rating).toFixed(1) : undefined,
            poll: (r.poll_options as string[]) ?? undefined,
            pollBase: (r.poll_votes as number[]) ?? undefined,
            images: (r.images as string[]) ?? undefined,
            es: String(r.body_es),
            en: String(r.body_en),
          };
        });
        next.live = true;
      }

      setData(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [coords, version]);

  return <Ctx.Provider value={{ ...data, refresh: () => setVersion((v) => v + 1) }}>{children}</Ctx.Provider>;
}

export function useLiveData(): LiveData {
  return useContext(Ctx);
}
