// Geolocation via OpenStreetMap — Photon (city autocomplete) + Nominatim
// (reverse geocode). Free / OSS, no API key, no Google billing (per CLAUDE.md).
// All calls run in the user's browser: CORS is open on both services and the
// site origin (Referer) satisfies their low-volume usage policies.

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

/** Forward autocomplete: type a city → real OSM city suggestions (Photon). */
export async function searchCities(query: string, signal?: AbortSignal): Promise<Place[]> {
  const q = query.trim();
  if (q.length < 2) return [];
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

/** Reverse geocode: coords → nearest city label (Nominatim). */
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
