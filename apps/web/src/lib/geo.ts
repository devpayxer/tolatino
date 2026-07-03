// Geolocation. Primary source is OUR OWN city gazetteer in Supabase
// (public.cities + search_cities / nearest_city RPCs) — no external
// dependency, no rate limits, scales like any indexed query. We only fall
// back to OpenStreetMap (Photon autocomplete + Nominatim reverse) when
// Supabase isn't configured or returns nothing. Free/OSS end to end, no
// Google billing (per CLAUDE.md). Browser-side; CORS is open on both OSM
// services and the site origin satisfies their low-volume policies.

import { supabase } from '@/lib/supabase';

export type Place = { label: string; lat: number; lng: number };

// US state / territory → 2-letter abbreviation, so a US city reads "Houston, TX".
const US_STATE_ABBR: Record<string, string> = {
  Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA',
  Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE', 'District of Columbia': 'DC',
  Florida: 'FL', Georgia: 'GA', Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL',
  Indiana: 'IN', Iowa: 'IA', Kansas: 'KS', Kentucky: 'KY', Louisiana: 'LA',
  Maine: 'ME', Maryland: 'MD', Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN',
  Mississippi: 'MS', Missouri: 'MO', Montana: 'MT', Nebraska: 'NE', Nevada: 'NV',
  'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
  'North Carolina': 'NC', 'North Dakota': 'ND', Ohio: 'OH', Oklahoma: 'OK',
  Oregon: 'OR', Pennsylvania: 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT', Vermont: 'VT',
  Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV', Wisconsin: 'WI',
  Wyoming: 'WY', 'Puerto Rico': 'PR',
};

function label(name: string, state?: string, countryCode?: string): string {
  const cc = (countryCode || '').toUpperCase();
  if (cc === 'US' && state) return `${name}, ${US_STATE_ABBR[state] ?? state}`;
  if (state) return `${name}, ${state}`;
  return name;
}

/** Popular US Latino-heavy metros — instant picks + offline fallback (no network). */
export const POPULAR_CITIES: Place[] = [
  { label: 'Houston, TX', lat: 29.7604, lng: -95.3698 },
  { label: 'Los Ángeles, CA', lat: 34.0522, lng: -118.2437 },
  { label: 'San Antonio, TX', lat: 29.4241, lng: -98.4936 },
  { label: 'Dallas, TX', lat: 32.7767, lng: -96.797 },
  { label: 'Phoenix, AZ', lat: 33.4484, lng: -112.074 },
  { label: 'Chicago, IL', lat: 41.8781, lng: -87.6298 },
  { label: 'Miami, FL', lat: 25.7617, lng: -80.1918 },
  { label: 'Nueva York, NY', lat: 40.7128, lng: -74.006 },
  { label: 'El Paso, TX', lat: 31.7619, lng: -106.485 },
  { label: 'Fort Worth, TX', lat: 32.7555, lng: -97.3308 },
  { label: 'Austin, TX', lat: 30.2672, lng: -97.7431 },
  { label: 'Atlanta, GA', lat: 33.749, lng: -84.388 },
];

export const DEFAULT_COORDS = { lat: POPULAR_CITIES[0].lat, lng: POPULAR_CITIES[0].lng };

/** Forward autocomplete: our cities table first, OSM (Photon) as fallback. */
export async function searchCities(query: string, signal?: AbortSignal): Promise<Place[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  // 1) our own gazetteer
  if (supabase) {
    const rpc = supabase.rpc('search_cities', { q, max_results: 8 });
    const { data, error } = await (signal ? rpc.abortSignal(signal) : rpc);
    if (!error && data && data.length) {
      return (data as { label: string; lat: number; lng: number }[]).map((r) => ({ label: r.label, lat: r.lat, lng: r.lng }));
    }
  }

  // 2) fallback: OpenStreetMap / Photon
  const url = `https://photon.komoot.io/api?q=${encodeURIComponent(q)}&lang=en&limit=8&layer=city`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`photon ${res.status}`);
  const data = (await res.json()) as {
    features?: { geometry?: { coordinates?: [number, number] }; properties?: Record<string, string> }[];
  };
  const seen = new Set<string>();
  const out: Place[] = [];
  for (const f of data.features ?? []) {
    const p = f.properties ?? {};
    const coords = f.geometry?.coordinates;
    if (!coords) continue;
    const [lng, lat] = coords;
    if (typeof lat !== 'number' || typeof lng !== 'number' || !p.name) continue;
    const lb = label(p.name, p.state, p.countrycode);
    if (seen.has(lb)) continue;
    seen.add(lb);
    out.push({ label: lb, lat, lng });
  }
  return out;
}

/** GPS coords → nearest city: our gazetteer first (PostGIS KNN), OSM fallback. */
export async function nearestCity(lat: number, lng: number, signal?: AbortSignal): Promise<Place> {
  if (supabase) {
    const { data, error } = await supabase.rpc('nearest_city', { user_lat: lat, user_lng: lng });
    if (!error && data && data.length) {
      const c = (data as { label: string; lat: number; lng: number }[])[0];
      return { label: c.label, lat: c.lat, lng: c.lng };
    }
  }
  return reverseGeocode(lat, lng, signal);
}

/** Reverse geocode via OpenStreetMap (Nominatim) — fallback for nearestCity. */
export async function reverseGeocode(lat: number, lng: number, signal?: AbortSignal): Promise<Place> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2&zoom=10&addressdetails=1`;
  try {
    const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
    if (res.ok) {
      const data = (await res.json()) as { address?: Record<string, string> };
      const a = data.address ?? {};
      const name = a.city || a.town || a.village || a.municipality || a.county;
      if (name) return { label: label(name, a.state, a.country_code), lat, lng };
    }
  } catch {
    /* fall through to coord label */
  }
  // Fallback: keep the real coords, show them so "use my location" still works.
  return { label: `${lat.toFixed(3)}, ${lng.toFixed(3)}`, lat, lng };
}

// ── Precise street address (optional, for real distances + delivery) ─────────
export type Address = { formatted: string; lat: number; lng: number };

function addrLabel(p: Record<string, string | undefined>): string {
  const line1 = [p.housenumber, p.street || p.name].filter(Boolean).join(' ') || p.name || '';
  const cityPart = p.city || p.town || p.village || p.suburb || p.county || '';
  const st = p.countrycode?.toUpperCase() === 'US' ? US_STATE_ABBR[p.state ?? ''] ?? p.state ?? '' : p.state ?? '';
  const tail = [cityPart, [st, p.postcode].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  return [line1, tail].filter(Boolean).join(', ');
}

/** Address autocomplete via OpenStreetMap (Photon). Free/OSS, no Google billing. */
export async function searchAddress(query: string, signal?: AbortSignal): Promise<Address[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const url = `https://photon.komoot.io/api?q=${encodeURIComponent(q)}&lang=en&limit=6`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`photon ${res.status}`);
  const data = (await res.json()) as {
    features?: { geometry?: { coordinates?: [number, number] }; properties?: Record<string, string> }[];
  };
  const out: Address[] = [];
  const seen = new Set<string>();
  for (const f of data.features ?? []) {
    const p = f.properties ?? {};
    const c = f.geometry?.coordinates;
    if (!c) continue;
    const [lng, lat] = c;
    if (typeof lat !== 'number' || typeof lng !== 'number') continue;
    const formatted = addrLabel(p);
    if (!formatted || seen.has(formatted)) continue;
    seen.add(formatted);
    out.push({ formatted, lat, lng });
  }
  return out;
}

/** GPS coords → a full street address (Nominatim). Fallback for "use my location". */
export async function reverseAddress(lat: number, lng: number, signal?: AbortSignal): Promise<Address> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2&zoom=18&addressdetails=1`;
  try {
    const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
    if (res.ok) {
      const data = (await res.json()) as { address?: Record<string, string>; display_name?: string };
      const a = data.address ?? {};
      const formatted = addrLabel({
        housenumber: a.house_number,
        street: a.road,
        name: a.road,
        city: a.city || a.town || a.village || a.suburb || a.county,
        state: a.state,
        postcode: a.postcode,
        countrycode: a.country_code,
      });
      if (formatted) return { formatted, lat, lng };
      if (data.display_name) return { formatted: data.display_name, lat, lng };
    }
  } catch {
    /* ignore — fall through */
  }
  return { formatted: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, lat, lng };
}

/** Browser geolocation (needs HTTPS + user permission). */
export function getBrowserLocation(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('unsupported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  });
}
