// Bienes Raíces — client lib for the real-estate vertical (migration 0117).
// Types + fetchers/creators shared by the consumer surface (/bienes-raices),
// the agent panel module, and the BizDetail "Propiedades" tab. All reads go
// through SECURITY DEFINER RPCs (published-only); writes are auth-gated RPCs.

import { supabase } from '@/lib/supabase';

export type ReDeal = 'venta' | 'renta' | 'cuarto' | 'comercial';
export type RePtype = 'casa' | 'condo' | 'townhouse' | 'departamento' | 'cuarto' | 'local' | 'oficina' | 'terreno';
export type ReStatus = 'draft' | 'review' | 'published' | 'pending' | 'rented' | 'sold';
export type ReLeadKind = 'mensaje' | 'oferta' | 'solicitud';
export type ReLeadStage = 'new' | 'contacted' | 'tour' | 'offer' | 'closed';
export type ReTourStatus = 'pendiente' | 'confirmada' | 'cancelada' | 'completada';

export const RE_DEALS: { id: ReDeal; es: string; en: string }[] = [
  { id: 'venta', es: 'Comprar', en: 'Buy' },
  { id: 'renta', es: 'Rentar', en: 'Rent' },
  { id: 'cuarto', es: 'Cuartos', en: 'Rooms' },
  { id: 'comercial', es: 'Comercial', en: 'Commercial' },
];
export const RE_TYPES: { id: RePtype; es: string; en: string }[] = [
  { id: 'casa', es: 'Casa', en: 'House' },
  { id: 'condo', es: 'Condo', en: 'Condo' },
  { id: 'townhouse', es: 'Townhouse', en: 'Townhouse' },
  { id: 'departamento', es: 'Depa', en: 'Apartment' },
  { id: 'cuarto', es: 'Cuarto', en: 'Room' },
  { id: 'local', es: 'Local', en: 'Storefront' },
  { id: 'oficina', es: 'Oficina', en: 'Office' },
  { id: 'terreno', es: 'Terreno', en: 'Land' },
];
/** Striped placeholder tile per deal (design-system placeholder pattern). */
export const RE_TILE: Record<ReDeal, [string, string]> = {
  venta: ['#E5DEF9', '#D9CEF3'],
  renta: ['#E3F5EA', '#D6E7D0'],
  cuarto: ['#FCEBD6', '#F6DCBF'],
  comercial: ['#E4EEFB', '#DAE5F6'],
};

export type ReCard = {
  id: string; slug: string; deal: ReDeal; ptype: RePtype; title: string; price: number;
  beds: number | null; baths: number | null; sqft: number | null;
  address: string | null; hood: string | null; city: string | null;
  lat: number | null; lng: number | null; photos: string[]; openHouse: string | null;
  status: ReStatus; views: number; saves: number; createdAt: string;
  bizSlug: string | null; bizName: string | null; bizLogo: string | null;
  bizTier: string | null; bizRating: number | null;
  distanceM: number | null; totalCount: number;
};

export type ReDetail = ReCard & {
  descEs: string | null; descEn: string | null; lotSqft: number | null;
  yearBuilt: number | null; hoa: number | null;
  feats: { es: string; en: string }[];
  policies: { pets?: boolean; noCredit?: boolean; cosigner?: boolean; visits?: boolean };
  rental: { deposit?: number; available?: string; lease?: string };
  publishedAt: string | null;
  bizId: string | null; bizReviews: number | null; bizPhone: string | null;
  bizLicense: string | null; bizLangs: string | null;
};

export type ReAgency = {
  id: string; slug: string; name: string; logo: string | null; tier: string;
  rating: number | null; reviews: number; city: string | null; address: string | null;
  phone: string | null; specialty: string | null; license: string | null;
  langs: string | null; listings: number; totalCount: number;
};

export type ReLead = {
  id: string; propertyId: string; name: string; phone: string | null; email: string | null;
  kind: ReLeadKind; stage: ReLeadStage; message: string | null; offerAmount: number | null;
  income: string | null; moveIn: string | null; createdAt: string;
};
export type ReTour = {
  id: string; propertyId: string; name: string; phone: string | null;
  mode: 'presencial' | 'video'; at: string; message: string | null;
  status: ReTourStatus; createdAt: string;
};

const num = (v: unknown): number | null => (v == null ? null : Number(v));

function mapCard(r: Record<string, unknown>): ReCard {
  return {
    id: String(r.id), slug: String(r.slug), deal: r.deal as ReDeal, ptype: r.ptype as RePtype,
    title: String(r.title ?? ''), price: Number(r.price ?? 0),
    beds: num(r.beds), baths: num(r.baths), sqft: num(r.sqft),
    address: (r.address as string) ?? null, hood: (r.hood as string) ?? null, city: (r.city as string) ?? null,
    lat: num(r.lat), lng: num(r.lng),
    photos: Array.isArray(r.photos) ? (r.photos as string[]) : [],
    openHouse: (r.open_house as string) ?? null, status: (r.status as ReStatus) ?? 'published',
    views: Number(r.views ?? 0), saves: Number(r.saves_count ?? 0), createdAt: String(r.created_at ?? ''),
    bizSlug: (r.biz_slug as string) ?? null, bizName: (r.biz_name as string) ?? null,
    bizLogo: (r.biz_logo as string) ?? null, bizTier: (r.biz_tier as string) ?? null,
    bizRating: num(r.biz_rating), distanceM: num(r.distance_m), totalCount: Number(r.total_count ?? 0),
  };
}

export type ReSearchParams = {
  lat?: number | null; lng?: number | null; city?: string | null; deal?: ReDeal | null;
  ptype?: RePtype | null; beds?: number | null; baths?: number | null;
  min?: number | null; max?: number | null; q?: string | null; hood?: string | null;
  business?: string | null; sort?: 'relevance' | 'price_asc' | 'price_desc' | 'newest';
  limit?: number; offset?: number;
};

export async function searchProperties(p: ReSearchParams): Promise<ReCard[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('properties_search', {
    user_lat: p.lat ?? null, user_lng: p.lng ?? null, in_city: p.city ?? null,
    in_deal: p.deal ?? null, in_type: p.ptype ?? null, in_beds: p.beds ?? null,
    in_baths: p.baths ?? null, in_min: p.min ?? null, in_max: p.max ?? null,
    in_q: p.q ?? null, in_hood: p.hood ?? null, in_business: p.business ?? null,
    in_sort: p.sort ?? 'relevance', max_results: p.limit ?? 30, in_offset: p.offset ?? 0,
  });
  if (error || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map(mapCard);
}

export async function fetchPropertyBySlug(slug: string): Promise<ReDetail | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('property_by_slug', { in_slug: slug });
  const r = Array.isArray(data) ? (data[0] as Record<string, unknown> | undefined) : null;
  if (error || !r) return null;
  const feats = Array.isArray(r.feats)
    ? (r.feats as unknown[]).map((f) => typeof f === 'string' ? { es: f, en: f } : (f as { es: string; en: string }))
    : [];
  return {
    ...mapCard({ ...r, total_count: 1 }),
    descEs: (r.desc_es as string) ?? null, descEn: (r.desc_en as string) ?? null,
    lotSqft: num(r.lot_sqft), yearBuilt: num(r.year_built), hoa: num(r.hoa),
    feats, policies: (r.policies as ReDetail['policies']) ?? {}, rental: (r.rental as ReDetail['rental']) ?? {},
    publishedAt: (r.published_at as string) ?? null,
    bizId: (r.biz_id as string) ?? null, bizReviews: num(r.biz_reviews),
    bizPhone: (r.biz_phone as string) ?? null, bizLicense: (r.biz_license as string) ?? null,
    bizLangs: (r.biz_langs as string) ?? null,
  };
}

export async function trackPropertyView(id: string): Promise<void> {
  if (!supabase) return;
  await supabase.rpc('track_property_view', { in_id: id }).then(() => undefined, () => undefined);
}

export async function fetchReDirectory(city?: string | null, q?: string | null): Promise<ReAgency[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('re_directory', { in_city: city ?? null, in_q: q ?? null, max_results: 40, in_offset: 0 });
  if (error || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    id: String(r.id), slug: String(r.slug), name: String(r.name ?? ''),
    logo: (r.logo_url as string) ?? null, tier: String(r.tier ?? 'free'),
    rating: num(r.rating), reviews: Number(r.reviews_count ?? 0),
    city: (r.city as string) ?? null, address: (r.address as string) ?? null,
    phone: (r.phone as string) ?? null, specialty: (r.specialty as string) ?? null,
    license: (r.license as string) ?? null, langs: (r.langs as string) ?? null,
    listings: Number(r.listings ?? 0), totalCount: Number(r.total_count ?? 0),
  }));
}

/** Published listings for one business (BizDetail "Propiedades" tab). Resolves slug → id. */
export async function fetchPropertiesByBizSlug(slug: string, limit = 12): Promise<ReCard[]> {
  if (!supabase) return [];
  const { data } = await supabase.from('businesses').select('id').eq('slug', slug).maybeSingle();
  const id = (data as { id?: string } | null)?.id;
  if (!id) return [];
  return searchProperties({ business: id, sort: 'newest', limit });
}

/** Message / offer / application → agent's lead pipeline. Returns error text or null. */
export async function createPropertyLead(slug: string, kind: ReLeadKind, f: {
  name: string; phone?: string; email?: string; message?: string;
  offer?: number; income?: string; moveIn?: string;
}): Promise<string | null> {
  if (!supabase) return 'offline';
  const { error } = await supabase.rpc('create_property_lead', {
    in_slug: slug, in_kind: kind, in_name: f.name, in_phone: f.phone ?? null,
    in_email: f.email ?? null, in_message: f.message ?? null, in_offer: f.offer ?? null,
    in_income: f.income ?? null, in_move: f.moveIn ?? null,
  });
  return error ? error.message : null;
}

export async function bookPropertyTour(slug: string, at: string, mode: 'presencial' | 'video', name: string, phone?: string, message?: string): Promise<string | null> {
  if (!supabase) return 'offline';
  const { error } = await supabase.rpc('book_property_tour', {
    in_slug: slug, in_at: at, in_mode: mode, in_name: name, in_phone: phone ?? null, in_message: message ?? null,
  });
  return error ? error.message : null;
}

// ── saved (♥, cross-device) ──────────────────────────────────────────────────
export async function fetchSavedPropertyIds(): Promise<Set<string>> {
  if (!supabase) return new Set();
  const { data } = await supabase.from('property_saves').select('property_id');
  return new Set(Array.isArray(data) ? data.map((r) => String((r as { property_id: string }).property_id)) : []);
}
export async function setPropertySaved(propertyId: string, userId: string, saved: boolean): Promise<void> {
  if (!supabase) return;
  if (saved) await supabase.from('property_saves').upsert({ property_id: propertyId, user_id: userId });
  else await supabase.from('property_saves').delete().eq('property_id', propertyId).eq('user_id', userId);
}
/** Saved cards for the Guardados view (RLS: own saves; join resolved client-side). */
export async function fetchSavedProperties(): Promise<ReCard[]> {
  if (!supabase) return [];
  const { data } = await supabase.from('property_saves').select('property_id').order('created_at', { ascending: false }).limit(100);
  const ids = Array.isArray(data) ? data.map((r) => String((r as { property_id: string }).property_id)) : [];
  if (!ids.length) return [];
  const { data: rows } = await supabase.from('properties')
    .select('id,slug,deal,ptype,title,price,beds,baths,sqft,address,hood,city,photos,open_house,status,views,saves_count,created_at')
    .in('id', ids).neq('status', 'draft');
  if (!Array.isArray(rows)) return [];
  const byId = new Map(rows.map((r) => [String((r as { id: string }).id), r as Record<string, unknown>]));
  return ids.map((id) => byId.get(id)).filter(Boolean).map((r) => mapCard({ ...(r as Record<string, unknown>), lat: null, lng: null, total_count: 0 }));
}

// ── panel (agent side — RLS-guarded direct reads + upsert RPC) ───────────────
export async function upsertProperty(id: string | null, p: Record<string, unknown>): Promise<{ id?: string; slug?: string; error?: string }> {
  if (!supabase) return { error: 'offline' };
  const { data, error } = await supabase.rpc('upsert_property', { in_id: id, p });
  if (error) return { error: error.message };
  const r = Array.isArray(data) ? (data[0] as { id: string; slug: string } | undefined) : null;
  return r ? { id: r.id, slug: r.slug } : { error: 'no result' };
}

export async function fetchMyProperties(): Promise<(ReCard & { leadsCount: number; toursCount: number })[]> {
  if (!supabase) return [];
  const { data } = await supabase.from('properties')
    .select('id,slug,deal,ptype,title,price,beds,baths,sqft,address,hood,city,photos,open_house,status,views,saves_count,created_at')
    .order('created_at', { ascending: false }).limit(200);
  const rows = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
  if (!rows.length) return [];
  const ids = rows.map((r) => String(r.id));
  const [leads, tours] = await Promise.all([
    supabase.from('property_leads').select('property_id').in('property_id', ids),
    supabase.from('property_tours').select('property_id').in('property_id', ids),
  ]);
  const lc = new Map<string, number>(); const tc = new Map<string, number>();
  (Array.isArray(leads.data) ? leads.data : []).forEach((r) => { const k = String((r as { property_id: string }).property_id); lc.set(k, (lc.get(k) ?? 0) + 1); });
  (Array.isArray(tours.data) ? tours.data : []).forEach((r) => { const k = String((r as { property_id: string }).property_id); tc.set(k, (tc.get(k) ?? 0) + 1); });
  return rows.map((r) => ({ ...mapCard({ ...r, lat: null, lng: null, total_count: 0 }), leadsCount: lc.get(String(r.id)) ?? 0, toursCount: tc.get(String(r.id)) ?? 0 }));
}

export async function fetchMyLeads(): Promise<(ReLead & { propertyTitle: string })[]> {
  if (!supabase) return [];
  const { data } = await supabase.from('property_leads')
    .select('id,property_id,name,phone,email,kind,stage,message,offer_amount,income,move_in,created_at,properties(title,owner_id)')
    .order('created_at', { ascending: false }).limit(200);
  if (!Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    id: String(r.id), propertyId: String(r.property_id), name: String(r.name ?? ''),
    phone: (r.phone as string) ?? null, email: (r.email as string) ?? null,
    kind: r.kind as ReLeadKind, stage: r.stage as ReLeadStage,
    message: (r.message as string) ?? null, offerAmount: num(r.offer_amount),
    income: (r.income as string) ?? null, moveIn: (r.move_in as string) ?? null,
    createdAt: String(r.created_at ?? ''),
    propertyTitle: String((r.properties as { title?: string } | null)?.title ?? ''),
  }));
}
export async function setLeadStage(id: string, stage: ReLeadStage): Promise<string | null> {
  if (!supabase) return 'offline';
  const { error } = await supabase.from('property_leads').update({ stage }).eq('id', id);
  return error ? error.message : null;
}

export async function fetchMyTours(): Promise<(ReTour & { propertyTitle: string })[]> {
  if (!supabase) return [];
  const { data } = await supabase.from('property_tours')
    .select('id,property_id,name,phone,mode,at,message,status,created_at,properties(title,owner_id)')
    .order('at', { ascending: true }).limit(200);
  if (!Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    id: String(r.id), propertyId: String(r.property_id), name: String(r.name ?? ''),
    phone: (r.phone as string) ?? null, mode: (r.mode as 'presencial' | 'video') ?? 'presencial',
    at: String(r.at ?? ''), message: (r.message as string) ?? null,
    status: r.status as ReTourStatus, createdAt: String(r.created_at ?? ''),
    propertyTitle: String((r.properties as { title?: string } | null)?.title ?? ''),
  }));
}
export async function setTourStatus(id: string, status: ReTourStatus, at?: string): Promise<string | null> {
  if (!supabase) return 'offline';
  const patch: Record<string, unknown> = { status };
  if (at) patch.at = at;
  const { error } = await supabase.from('property_tours').update(patch).eq('id', id);
  return error ? error.message : null;
}

// ── mortgage math (handoff formula, client-side only) ────────────────────────
export function mortgageMonthly(price: number, downPct: number, ratePct: number, years: number): {
  pi: number; tax: number; ins: number; total: number; loan: number;
} {
  const loan = price * (1 - downPct / 100);
  const r = ratePct / 100 / 12;
  const n = years * 12;
  const pi = r === 0 ? (n > 0 ? loan / n : 0) : (loan * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const tax = (price * 0.018) / 12;   // property tax ~1.8%/yr (TX estimate)
  const ins = (price * 0.004) / 12;   // insurance ~0.4%/yr
  return { pi, tax, ins, total: pi + tax + ins, loan };
}

export const fmtPrice = (p: number, deal: ReDeal, es: boolean): string => {
  const base = p >= 1_000_000 ? `$${(p / 1_000_000).toFixed(p % 1_000_000 === 0 ? 0 : 1)}M`
    : p >= 10_000 ? `$${Math.round(p / 1000)}k`
    : `$${Math.round(p).toLocaleString()}`;
  return deal === 'venta' ? base : `${base}${es ? '/mes' : '/mo'}`;
};
export const fmtPriceFull = (p: number, deal: ReDeal, es: boolean): string =>
  `$${Math.round(p).toLocaleString()}${deal === 'venta' ? '' : es ? '/mes' : '/mo'}`;
