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
    // El try/catch NO es decorativo: ante un fallo de red supabase-js RECHAZA la
    // promesa en vez de devolver `{ error }`, así que sin esto una conexión
    // floja tumbaba toda la función y se perdía hasta el respaldo de OSM.
    try {
      const { data, error } = await supabase.rpc('nearest_city', { user_lat: lat, user_lng: lng });
      if (!error && data && data.length) {
        const c = (data as { label: string; lat: number; lng: number }[])[0];
        return { label: c.label, lat: c.lat, lng: c.lng };
      }
    } catch {
      /* sin red o RPC caído: se sigue con OpenStreetMap */
    }
  }
  return reverseGeocode(lat, lng, signal);
}

/** ¿La etiqueta es un par de coordenadas? Pasa cuando fallan los dos
 *  geocodificadores: sirve, pero no se puede enseñar como nombre de ciudad. */
export function isCoordLabel(label: string): boolean {
  return /^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(label.trim());
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
// `city` is the address's OWN city ("Philadelphia, PA") from the geocoder — used
// to switch the app city. We derive it from address components (not nearest
// centroid) so a Philadelphia address doesn't resolve to a tiny adjacent town.
// `verified` = exact rooftop match from the US Census geocoder (official TIGER
// data). `approx` = synthesized house-number + street suggestion (coords at the
// street until the pick is snapped through the Census geocoder).
/**
 * Una dirección resuelta.
 *
 * `formatted` es la línea entera de siempre. Las PIEZAS (`line1`, `city`,
 * `state`, `postal`) se añadieron el 2026-08-05 porque el alta de negocio pide
 * un formulario de verdad — calle, ciudad, estado y código postal por separado —
 * y hasta ahora el geocodificador SÍ conocía el estado y el ZIP (los usa
 * `addrLabel` para componer la cadena) pero los tiraba después de juntarlos. Sin
 * ellas, rellenar el formulario obligaría a partir el texto con expresiones
 * regulares, que es adivinar lo que ya sabíamos.
 *
 * Son opcionales a propósito: hay fuentes que no las traen (una dirección de
 * OSM sin `postcode`), y quien las use tiene que aguantar que falten.
 */
export type Address = {
  formatted: string; lat: number; lng: number; city: string;
  verified?: boolean; approx?: boolean;
  /** Calle y número, sin ciudad ni estado. */
  line1?: string;
  /** Solo el nombre de la ciudad (`city` trae «Ciudad, ST»). */
  cityName?: string;
  /** Sigla de dos letras: PA, TX… */
  state?: string;
  /** Código postal. */
  postal?: string;
};

function stAbbr(p: Record<string, string | undefined>): string {
  return p.countrycode?.toUpperCase() === 'US' ? US_STATE_ABBR[p.state ?? ''] ?? p.state ?? '' : p.state ?? '';
}

/** Las piezas sueltas, antes de juntarlas. Es la misma lectura que hace
 *  `addrLabel`; se separó para poder rellenar un formulario con ellas. */
function addrParts(p: Record<string, string | undefined>) {
  return {
    line1: [p.housenumber, p.street || p.name].filter(Boolean).join(' ') || p.name || '',
    cityName: p.city || p.town || p.village || p.municipality || p.district || p.locality || p.suburb || p.county || '',
    state: stAbbr(p),
    postal: p.postcode || '',
  };
}

function addrLabel(p: Record<string, string | undefined>): string {
  const { line1, cityName, state, postal } = addrParts(p);
  const tail = [cityName, [state, postal].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  return [line1, tail].filter(Boolean).join(', ');
}

/** "City, ST" from the address's own components (not nearest centroid).
 *  Covers both Photon vocabulary (city/district/locality) and Nominatim's
 *  (town/village/municipality) since reverseAddress maps into this shape. */
function cityLabelOf(p: Record<string, string | undefined>): string {
  const c = p.city || p.town || p.village || p.municipality || p.district || p.locality || p.county || '';
  if (!c) return '';
  const st = stAbbr(p);
  return st ? `${c}, ${st}` : c;
}

// Metro box (~degrees) used to bias + fence address suggestions to the chosen
// city. ~0.9° ≈ 55–62 mi at US latitudes, matching the ~80 km discovery radius.
const METRO_DEG = 0.9;

type NearCtx = { lat: number; lng: number; city?: string };

/** Photon (OSM) search, biased + hard-fenced to the metro box. `layer` narrows
 *  to a feature type (e.g. 'street'). Returns [] on any failure — the merge in
 *  searchAddress must survive one source being down. */
async function photonSearch(q: string, near: NearCtx | null | undefined, signal: AbortSignal | undefined, layer?: 'street'): Promise<Address[]> {
  const params = new URLSearchParams({ q, lang: 'en', limit: '10' });
  if (near) {
    params.set('lat', String(near.lat)); // proximity bias
    params.set('lon', String(near.lng));
    // minLon,minLat,maxLon,maxLat
    params.set('bbox', `${near.lng - METRO_DEG},${near.lat - METRO_DEG},${near.lng + METRO_DEG},${near.lat + METRO_DEG}`);
  }
  if (layer) params.set('layer', layer);
  try {
    const res = await fetch(`https://photon.komoot.io/api?${params.toString()}`, { signal });
    if (!res.ok) return [];
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
      // US-only app: never suggest addresses in other countries.
      if (p.countrycode && p.countrycode.toUpperCase() !== 'US') continue;
      // Hard fence to the metro box (Photon's bbox isn't always strict).
      if (near && (Math.abs(lat - near.lat) > METRO_DEG || Math.abs(lng - near.lng) > METRO_DEG)) continue;
      const formatted = addrLabel(p);
      if (!formatted || seen.has(formatted.toLowerCase())) continue;
      seen.add(formatted.toLowerCase());
      out.push({ formatted, lat, lng, city: cityLabelOf(p), ...addrParts(p) });
      if (out.length >= 6) break;
    }
    return out;
  } catch {
    return [];
  }
}

// ── US Census Bureau geocoder — the PRECISION layer ──────────────────────────
// Free, no API key, official TIGER data: matches essentially every US street
// address to an exact house-number point (which OSM/Photon often lacks). Used
// to (a) surface an exact "verified" match while typing a full address and
// (b) snap a picked house+street suggestion to its true location + ZIP.
// The endpoint does NOT send CORS headers, so a browser fetch is blocked — we
// use its official JSONP support (format=jsonp&callback=) instead.
// Self-host Pelias/TIGER at scale (see LAUNCH-CHECKLIST).
function titleCase(s: string): string {
  return s.toLowerCase().replace(/(^|[\s-])[a-zà-ú]/g, (m) => m.toUpperCase());
}

let jsonpSeq = 0;
function jsonp<T>(src: string, timeoutMs: number): Promise<T | null> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve(null);
      return;
    }
    const name = `__tlCensus${++jsonpSeq}`;
    const w = window as unknown as Record<string, unknown>;
    const script = document.createElement('script');
    let done = false;
    const finish = (val: T | null) => {
      if (done) return;
      done = true;
      w[name] = () => {}; // a late response hits a noop, not a ReferenceError
      script.remove();
      resolve(val);
    };
    w[name] = (data: T) => finish(data);
    script.src = `${src}&format=jsonp&callback=${name}`;
    script.onerror = () => finish(null);
    setTimeout(() => finish(null), timeoutMs); // never hang the UI on a slow gov API
    document.head.appendChild(script);
  });
}

export async function censusGeocode(oneline: string, signal?: AbortSignal): Promise<Address | null> {
  if (signal?.aborted) return null;
  const url = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${encodeURIComponent(oneline)}&benchmark=Public_AR_Current`;
  const data = await jsonp<{
    result?: { addressMatches?: { matchedAddress?: string; coordinates?: { x: number; y: number }; addressComponents?: { city?: string; state?: string; zip?: string } }[] };
  }>(url, 4000);
  if (!data || signal?.aborted) return null;
  const m = data.result?.addressMatches?.[0];
  if (!m?.coordinates || !m.matchedAddress) return null;
  const comp = m.addressComponents ?? {};
  const city = comp.city ? `${titleCase(comp.city)}${comp.state ? `, ${comp.state}` : ''}` : '';
  // "762 MCNAIR ST, HAZLETON, PA, 18201" → "762 Mcnair St, Hazleton, PA 18201"
  const parts = m.matchedAddress.split(',').map((s) => s.trim());
  const formatted =
    parts.length >= 4 ? `${titleCase(parts[0])}, ${titleCase(parts[1])}, ${parts[2]} ${parts[3]}` : titleCase(m.matchedAddress);
  // Las piezas salen de `addressComponents`, que es el dato OFICIAL del censo —
  // no de partir `formatted`, que es texto ya cocinado.
  return {
    formatted, lat: m.coordinates.y, lng: m.coordinates.x, city, verified: true,
    line1: parts.length >= 1 ? titleCase(parts[0]) : undefined,
    cityName: comp.city ? titleCase(comp.city) : undefined,
    state: comp.state || undefined,
    postal: comp.zip || undefined,
  };
}

/** Did the Census match the SAME house+street the user picked? (Census can
 *  fuzzy-match a different address — never silently swap it in.) */
export function sameAddress(a: string, b: string): boolean {
  const re = /^([\d-]+)\s+([a-zà-ú]+)/i;
  const pa = re.exec(a.trim().toLowerCase());
  const pb = re.exec(b.trim().toLowerCase());
  if (!pa || !pb || pa[1] !== pb[1]) return false;
  const [sa, sb] = [pa[2], pb[2]];
  return sa.startsWith(sb.slice(0, 3)) || sb.startsWith(sa.slice(0, 3));
}

/** Resolve a city label ("Hazleton, PA") to its REAL center via our gazetteer —
 *  so "use the city center" never inherits a house's coordinates. Falls back to
 *  the given point when the gazetteer doesn't know the label. */
export async function cityCenter(label: string, fallback: { lat: number; lng: number }): Promise<{ label: string; lat: number; lng: number }> {
  try {
    const hits = await searchCities(label.split(',')[0]);
    const exact = hits.find((c) => c.label.toLowerCase() === label.toLowerCase());
    if (exact) return { label, lat: exact.lat, lng: exact.lng };
  } catch {
    /* gazetteer unreachable — keep the fallback point */
  }
  return { label, lat: fallback.lat, lng: fallback.lng };
}

// Merge the three sources: census exact first, then synthesized house+street,
// then raw Photon; dedupe by formatted, and let an exact entry replace a
// synthesized (approx) duplicate.
function collectAddresses(census: Address | null, houseNo: string | null, streets: Address[], photon: Address[]): Address[] {
  const out: Address[] = [];
  const pos = new Map<string, number>();
  const push = (a: Address) => {
    const key = a.formatted.toLowerCase();
    const i = pos.get(key);
    if (i !== undefined) {
      if (out[i].approx && !a.approx) out[i] = a;
      return;
    }
    pos.set(key, out.length);
    out.push(a);
  };
  if (census) push(census);
  if (houseNo) for (const s of streets.slice(0, 6)) push({ ...s, formatted: `${houseNo} ${s.formatted}`, approx: true });
  for (const a of photon) push(a);
  return out;
}

// Common US street-type suffixes — anything AFTER one of these (with no comma)
// is the city/state/zip the user typed, not part of the street name.
const STREET_TYPE = /^(st|street|ave|avenue|av|blvd|boulevard|rd|road|dr|drive|ln|lane|way|ct|court|pl|place|ter|terrace|cir|circle|hwy|highway|pkwy|parkway|pike|trl|trail|loop|run|row|sq|square|pass|path|walk|xing|crossing|aly|alley|plz|plaza)\.?$/i;
const US_STATES = new Set(Object.values(US_STATE_ABBR));

/** Split "22 reynolds ave. randolph ma" → {houseNo, street, locality:"randolph ma", cityToken:"randolph"}.
 *  Handles a comma ("…, randolph") and the no-comma case (city after the street type). */
function parseAddress(q: string): { houseNo: string | null; street: string; locality: string; cityToken: string } {
  const m = /^(\d{1,6}(?:-\d{1,4})?)\s+(.+)$/.exec(q);
  const rest = m ? m[2] : q;
  const houseNo = m ? m[1] : null;
  let street = rest;
  let locality = '';
  const ci = rest.indexOf(',');
  if (ci >= 0) {
    street = rest.slice(0, ci).trim();
    locality = rest.slice(ci + 1).trim();
  } else {
    const words = rest.split(/\s+/);
    let typeIdx = -1;
    for (let i = 1; i < words.length; i++) if (STREET_TYPE.test(words[i])) typeIdx = i;
    if (typeIdx >= 0 && typeIdx < words.length - 1) {
      street = words.slice(0, typeIdx + 1).join(' ');
      locality = words.slice(typeIdx + 1).join(' ');
    }
  }
  // first locality token that is a real place name (skip 2-letter states + zips)
  const cityToken = locality.toLowerCase().split(/[\s,]+/).find((t) => t.length >= 3 && !/^\d+$/.test(t) && !US_STATES.has(t.toUpperCase())) ?? '';
  return { houseNo, street: street.replace(/\.$/, ''), locality, cityToken };
}

/**
 * Professional address autocomplete. Free sources merged (no Google billing):
 *  1. US Census exact match (official; "verified").
 *  2. Synthesized house-number + Photon STREET suggestions (OSM has the streets
 *     even when it lacks the house number). Pick is snapped via Census.
 *  3. Raw Photon (POIs, streets, OSM house numbers).
 *
 * Locality-aware, like pro apps: if the query names a city that ISN'T your metro
 * ("22 reynolds ave randolph" while in PA), search NATIONALLY and prefer that
 * city; otherwise stay LOCAL (biased + fenced), and only widen when a local
 * house address isn't found.
 */
export async function searchAddress(query: string, near?: NearCtx | null, signal?: AbortSignal): Promise<Address[]> {
  const q = query.trim();
  if (q.length < 3) return [];

  const { houseNo, street, locality, cityToken } = parseAddress(q);
  const wantsCensus = !!(houseNo && (street.length >= 4 || locality));

  const localCity = near?.city?.split(',')[0]?.toLowerCase() ?? '';
  // The user is targeting somewhere other than their current metro.
  const elsewhere = !!cityToken && !localCity.startsWith(cityToken) && !cityToken.startsWith(localCity);

  // Elsewhere → don't fence to the metro; let Census parse the whole free-form
  // query. Local → complete a bare "number street" with the metro city.
  const fence = elsewhere ? null : near;
  const censusQ = !wantsCensus ? q : elsewhere || locality || q.includes(',') ? q : near?.city ? `${q}, ${near.city}` : q;

  // When the user names another city, put it IN the Photon query so Photon ranks
  // that city's streets (not globally-relevant ones). Locally, search the bare
  // street (the metro bbox handles location).
  const streetQ = elsewhere && locality ? `${street}, ${locality}` : street;
  const generalQ = elsewhere && locality ? `${street}, ${locality}` : q;

  const [census, streetsRaw, photon] = await Promise.all([
    wantsCensus ? censusGeocode(censusQ, signal) : Promise.resolve(null),
    houseNo ? photonSearch(streetQ, fence, signal, 'street') : Promise.resolve([] as Address[]),
    photonSearch(generalQ, fence, signal),
  ]);
  if (signal?.aborted) throw new DOMException('aborted', 'AbortError');

  // When a city was typed, prefer streets in THAT city.
  let streets = streetsRaw;
  if (cityToken) {
    const inCity = streetsRaw.filter((s) => s.city.toLowerCase().includes(cityToken));
    if (inCity.length) streets = inCity;
  }

  let list = collectAddresses(census, houseNo, streets, photon);

  // Widen to any city when a house address isn't found nearby (local case only —
  // the elsewhere path is already national).
  const hit = houseNo ? list.some((a) => a.verified || a.approx) : list.length > 0;
  if (!hit && !elsewhere) {
    const [censusWide, streetsWide, photonWide] = await Promise.all([
      wantsCensus ? (censusQ === q ? Promise.resolve(census) : censusGeocode(q, signal)) : Promise.resolve(null),
      houseNo ? photonSearch(street, null, signal, 'street') : Promise.resolve([] as Address[]),
      photonSearch(q, null, signal),
    ]);
    if (signal?.aborted) throw new DOMException('aborted', 'AbortError');
    list = collectAddresses(censusWide ?? census, houseNo, [...streets, ...streetsWide], [...photon, ...photonWide]);
  }

  // Real house/verified matches float to the top; keep the best 6.
  const rank = (a: Address) => (a.verified ? 0 : a.approx ? 1 : 2);
  return list.sort((a, b) => rank(a) - rank(b)).slice(0, 6);
}

/** GPS coords → a full street address (Nominatim). Fallback for "use my location". */
export async function reverseAddress(lat: number, lng: number, signal?: AbortSignal): Promise<Address> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2&zoom=18&addressdetails=1`;
  try {
    const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
    if (res.ok) {
      const data = (await res.json()) as { address?: Record<string, string>; display_name?: string };
      const a = data.address ?? {};
      const p = {
        housenumber: a.house_number,
        street: a.road,
        name: a.road,
        city: a.city || a.town || a.village || a.municipality,
        suburb: a.suburb,
        county: a.county,
        state: a.state,
        postcode: a.postcode,
        countrycode: a.country_code,
      };
      const formatted = addrLabel(p);
      if (formatted) return { formatted, lat, lng, city: cityLabelOf(p), ...addrParts(p) };
      if (data.display_name) return { formatted: data.display_name, lat, lng, city: cityLabelOf(p), ...addrParts(p) };
    }
  } catch {
    /* ignore — fall through */
  }
  return { formatted: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, lat, lng, city: '' };
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
