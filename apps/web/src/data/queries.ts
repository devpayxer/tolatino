import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { BUSINESSES, getBusiness, type Business } from "./businesses";

/**
 * Data access for discovery. Queries Supabase when configured (geo + text
 * search via the search_businesses RPC; detail via PostgREST embeds), and
 * falls back to local sample data otherwise. Both paths return the same
 * `Business` shape the screens already use.
 */

// Default search origin (Houston) until we read the device location.
const ORIGIN = { lat: 29.7604, lng: -95.3698 };

function metersToMiles(m: number | null | undefined): string {
  if (m == null) return "";
  return `${(m / 1609.34).toFixed(1)} mi`;
}

/* ---- Search (results list) ---- */
export async function searchBusinesses(query: string): Promise<Business[]> {
  const q = query.trim();

  if (!isSupabaseConfigured || !supabase) {
    // Local fallback: substring match on name/tagline; show all if no match.
    const s = q.toLowerCase();
    if (!s) return [];
    const m = BUSINESSES.filter(
      (b) =>
        b.name.toLowerCase().includes(s) ||
        b.cat.es.toLowerCase().includes(s) ||
        b.cat.en.toLowerCase().includes(s),
    );
    return m.length ? m : BUSINESSES;
  }

  const { data, error } = await supabase.rpc("search_businesses", {
    q,
    user_lat: ORIGIN.lat,
    user_lng: ORIGIN.lng,
    max_results: 20,
  });
  if (error || !data) return [];
  return (data as SearchRow[]).map(mapSearchRow);
}

/* ---- Nearby (Home "Cerca de ti") ---- */
export async function nearbyBusinesses(limit = 8): Promise<Business[]> {
  if (!isSupabaseConfigured || !supabase) return BUSINESSES.slice(0, limit);

  const { data, error } = await supabase.rpc("search_businesses", {
    q: "",
    user_lat: ORIGIN.lat,
    user_lng: ORIGIN.lng,
    max_results: limit,
  });
  if (error || !data) return [];
  return (data as SearchRow[]).map(mapSearchRow);
}

function mapSearchRow(r: SearchRow): Business {
  return {
    id: r.slug,
    name: r.name,
    cat: { es: r.tagline_es, en: r.tagline_en },
    seed: r.photo_seed,
    dist: metersToMiles(r.distance_m),
    rating: Number(r.rating),
    reviews: r.reviews_count,
    price: r.price_level ?? "",
    open: r.is_open,
    verified: r.tier !== "free",
    promo: r.promo_es ? { es: r.promo_es, en: r.promo_en ?? r.promo_es } : undefined,
  };
}

/* ---- Detail ---- */
export async function fetchBusiness(slug: string): Promise<Business | null> {
  if (!isSupabaseConfigured || !supabase) {
    return getBusiness(slug) ?? null;
  }

  const { data, error } = await supabase
    .from("businesses")
    .select(
      `slug, name, tagline_es, tagline_en, tier, price_level, is_open,
       rating, reviews_count, photo_seed, about_es, about_en, address,
       hours_es, hours_en, phone, promo_es, promo_en,
       business_amenities ( amenity:amenities ( name_es, name_en ) ),
       reviews ( author_name, author_initials, rating, body_es, body_en, featured )`,
    )
    .eq("slug", slug)
    .single();

  if (error || !data) return null;
  const row = data as unknown as DetailRow;

  return {
    id: row.slug,
    name: row.name,
    cat: { es: row.tagline_es, en: row.tagline_en },
    seed: row.photo_seed,
    dist: "",
    rating: Number(row.rating),
    reviews: row.reviews_count,
    price: row.price_level ?? "",
    open: row.is_open,
    verified: row.tier !== "free",
    promo: row.promo_es ? { es: row.promo_es, en: row.promo_en ?? row.promo_es } : undefined,
    about: row.about_es ? { es: row.about_es, en: row.about_en ?? row.about_es } : undefined,
    address: row.address ?? undefined,
    hours: row.hours_es ? { es: row.hours_es, en: row.hours_en ?? row.hours_es } : undefined,
    phone: row.phone ?? undefined,
    amenities: (row.business_amenities ?? [])
      .map((ba) => ba.amenity)
      .filter(Boolean)
      .map((a) => ({ es: a!.name_es, en: a!.name_en })),
  };
}

/* ---- Supabase row shapes (untyped tables; we map explicitly) ---- */
type SearchRow = {
  slug: string;
  name: string;
  tagline_es: string;
  tagline_en: string;
  tier: string;
  price_level: string | null;
  is_open: boolean;
  rating: number | string;
  reviews_count: number;
  photo_seed: string;
  promo_es: string | null;
  promo_en: string | null;
  distance_m: number | null;
};

type DetailRow = {
  slug: string;
  name: string;
  tagline_es: string;
  tagline_en: string;
  tier: string;
  price_level: string | null;
  is_open: boolean;
  rating: number | string;
  reviews_count: number;
  photo_seed: string;
  about_es: string | null;
  about_en: string | null;
  address: string | null;
  hours_es: string | null;
  hours_en: string | null;
  phone: string | null;
  promo_es: string | null;
  promo_en: string | null;
  business_amenities: { amenity: { name_es: string; name_en: string } | null }[] | null;
  reviews: {
    author_name: string;
    author_initials: string | null;
    rating: number;
    body_es: string | null;
    body_en: string | null;
    featured: boolean;
  }[] | null;
};
