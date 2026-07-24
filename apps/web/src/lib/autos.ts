// Autos — client lib for the car-dealer vertical (migration 0119). Types +
// fetchers/creators shared by the consumer surface (/autos), the dealer panel
// module, and the BizDetail "Vehículos" tab. Reads go through SECURITY DEFINER
// RPCs (published-only); writes are auth-gated RPCs.

import { supabase } from '@/lib/supabase';

export type AuCond = 'nuevo' | 'seminuevo' | 'usado' | 'certificado';
export type AuType = 'sedan' | 'suv' | 'pickup' | 'hatchback' | 'coupe' | 'minivan' | 'moto' | 'comercial';
export type AuStatus = 'draft' | 'review' | 'published' | 'pending' | 'sold';
export type AuLeadKind = 'mensaje' | 'prueba' | 'prequal' | 'oferta';
export type AuLeadStage = 'new' | 'contacted' | 'test' | 'financing' | 'sold';
export type AuTestStatus = 'pendiente' | 'confirmada' | 'cancelada' | 'completada';

export const AU_CONDS: { id: AuCond; es: string; en: string }[] = [
  { id: 'usado', es: 'Usado', en: 'Used' },
  { id: 'seminuevo', es: 'Seminuevo', en: 'Certified pre-owned' },
  { id: 'certificado', es: 'Certificado', en: 'Certified' },
  { id: 'nuevo', es: 'Nuevo', en: 'New' },
];
export const AU_TYPES: { id: AuType; es: string; en: string }[] = [
  { id: 'sedan', es: 'Sedán', en: 'Sedan' },
  { id: 'suv', es: 'SUV', en: 'SUV' },
  { id: 'pickup', es: 'Pickup / Troca', en: 'Pickup / Truck' },
  { id: 'hatchback', es: 'Hatchback', en: 'Hatchback' },
  { id: 'coupe', es: 'Coupé', en: 'Coupe' },
  { id: 'minivan', es: 'Minivan', en: 'Minivan' },
  { id: 'moto', es: 'Moto', en: 'Motorcycle' },
  { id: 'comercial', es: 'Comercial', en: 'Commercial' },
];
export const AU_TRANS: { id: string; es: string; en: string }[] = [
  { id: 'automatica', es: 'Automática', en: 'Automatic' },
  { id: 'manual', es: 'Manual', en: 'Manual' },
  { id: 'cvt', es: 'CVT', en: 'CVT' },
];
export const AU_FUELS: { id: string; es: string; en: string }[] = [
  { id: 'gasolina', es: 'Gasolina', en: 'Gasoline' },
  { id: 'diesel', es: 'Diésel', en: 'Diesel' },
  { id: 'hibrido', es: 'Híbrido', en: 'Hybrid' },
  { id: 'electrico', es: 'Eléctrico', en: 'Electric' },
];
/** Popular makes for the brand row + filter chips. */
export const AU_MAKES = ['Toyota', 'Honda', 'Nissan', 'Ford', 'Chevrolet', 'Hyundai', 'Kia', 'Jeep', 'RAM', 'GMC', 'Mazda', 'Volkswagen'];
/** Striped placeholder tile per condition (design-system placeholder pattern). */
export const AU_TILE: Record<AuCond, [string, string]> = {
  nuevo: ['#E3F5EA', '#D6E7D0'],
  certificado: ['#E4EEFB', '#DAE5F6'],
  seminuevo: ['#E5DEF9', '#D9CEF3'],
  usado: ['#F1EFFA', '#E6E1F5'],
};

export type AuCard = {
  id: string; slug: string; cond: AuCond; vtype: AuType; make: string; model: string; year: number;
  price: number; down: number | null; miles: number | null; trans: string | null; fuel: string | null;
  mpg: number | null; colorEs: string | null; colorEn: string | null; city: string | null;
  lat: number | null; lng: number | null; photos: string[]; bhph: boolean; financing: boolean;
  apr: number | null; status: AuStatus; views: number; saves: number; createdAt: string;
  bizSlug: string | null; bizName: string | null; bizLogo: string | null; bizTier: string | null;
  bizRating: number | null; distanceM: number | null; totalCount: number;
};

export type AuHistory = { cleanTitle?: boolean; accidents?: number; owners?: number; serviced?: boolean; report?: { t: string; d: string }[] };
export type AuDetail = AuCard & {
  drivetrain: string | null; vin: string | null; descEs: string | null; descEn: string | null;
  feats: { es: string; en: string }[]; history: AuHistory; tradeIn: boolean; publishedAt: string | null;
  bizId: string | null; bizReviews: number | null; bizPhone: string | null; bizLicense: string | null; bizLangs: string | null;
};

export type AuDealer = {
  id: string; slug: string; name: string; logo: string | null; tier: string; rating: number | null;
  reviews: number; city: string | null; address: string | null; phone: string | null;
  sellerType: string | null; license: string | null; langs: string | null; bhph: boolean;
  inventory: number; totalCount: number;
};

export type AuLead = {
  id: string; vehicleId: string; name: string; phone: string | null; email: string | null;
  kind: AuLeadKind; stage: AuLeadStage; message: string | null; offerAmount: number | null;
  income: string | null; employ: string | null; credit: string | null; down: number | null; createdAt: string;
};
export type AuTest = {
  id: string; vehicleId: string; name: string; phone: string | null; at: string;
  message: string | null; status: AuTestStatus; createdAt: string;
};

const num = (v: unknown): number | null => (v == null ? null : Number(v));

function mapCard(r: Record<string, unknown>): AuCard {
  return {
    id: String(r.id), slug: String(r.slug), cond: r.cond as AuCond, vtype: r.vtype as AuType,
    make: String(r.make ?? ''), model: String(r.model ?? ''), year: Number(r.year ?? 0),
    price: Number(r.price ?? 0), down: num(r.down), miles: num(r.miles),
    trans: (r.trans as string) ?? null, fuel: (r.fuel as string) ?? null, mpg: num(r.mpg),
    colorEs: (r.color_es as string) ?? null, colorEn: (r.color_en as string) ?? null, city: (r.city as string) ?? null,
    lat: num(r.lat), lng: num(r.lng), photos: Array.isArray(r.photos) ? (r.photos as string[]) : [],
    bhph: r.bhph === true, financing: r.financing !== false, apr: num(r.apr),
    status: (r.status as AuStatus) ?? 'published', views: Number(r.views ?? 0), saves: Number(r.saves_count ?? 0),
    createdAt: String(r.created_at ?? ''),
    bizSlug: (r.biz_slug as string) ?? null, bizName: (r.biz_name as string) ?? null,
    bizLogo: (r.biz_logo as string) ?? null, bizTier: (r.biz_tier as string) ?? null,
    bizRating: num(r.biz_rating), distanceM: num(r.distance_m), totalCount: Number(r.total_count ?? 0),
  };
}

export type AuSearchParams = {
  lat?: number | null; lng?: number | null; city?: string | null; cond?: AuCond | null;
  vtype?: AuType | null; make?: string | null; min?: number | null; max?: number | null;
  yearMin?: number | null; milesMax?: number | null; bhph?: boolean | null; q?: string | null;
  business?: string | null; sort?: 'relevance' | 'price_asc' | 'price_desc' | 'miles_asc' | 'year_desc';
  limit?: number; offset?: number;
};

export async function searchVehicles(p: AuSearchParams): Promise<AuCard[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('vehicles_search', {
    user_lat: p.lat ?? null, user_lng: p.lng ?? null, in_city: p.city ?? null,
    in_cond: p.cond ?? null, in_type: p.vtype ?? null, in_make: p.make ?? null,
    in_min: p.min ?? null, in_max: p.max ?? null, in_year_min: p.yearMin ?? null,
    in_miles_max: p.milesMax ?? null, in_bhph: p.bhph ?? null, in_q: p.q ?? null,
    in_business: p.business ?? null, in_sort: p.sort ?? 'relevance', max_results: p.limit ?? 30, in_offset: p.offset ?? 0,
  });
  if (error || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map(mapCard);
}

export async function fetchVehicleBySlug(slug: string): Promise<AuDetail | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('vehicle_by_slug', { in_slug: slug });
  const r = Array.isArray(data) ? (data[0] as Record<string, unknown> | undefined) : null;
  if (error || !r) return null;
  const feats = Array.isArray(r.feats)
    ? (r.feats as unknown[]).map((f) => typeof f === 'string' ? { es: f, en: f } : (f as { es: string; en: string }))
    : [];
  return {
    ...mapCard({ ...r, total_count: 1 }),
    drivetrain: (r.drivetrain as string) ?? null, vin: (r.vin as string) ?? null,
    descEs: (r.desc_es as string) ?? null, descEn: (r.desc_en as string) ?? null,
    feats, history: (r.history as AuHistory) ?? {}, tradeIn: r.trade_in === true,
    publishedAt: (r.published_at as string) ?? null,
    bizId: (r.biz_id as string) ?? null, bizReviews: num(r.biz_reviews),
    bizPhone: (r.biz_phone as string) ?? null, bizLicense: (r.biz_license as string) ?? null, bizLangs: (r.biz_langs as string) ?? null,
  };
}

export async function trackVehicleView(id: string): Promise<void> {
  if (!supabase) return;
  await supabase.rpc('track_vehicle_view', { in_id: id }).then(() => undefined, () => undefined);
}

export async function fetchAutoDirectory(city?: string | null, q?: string | null): Promise<AuDealer[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('auto_directory', { in_city: city ?? null, in_q: q ?? null, max_results: 40, in_offset: 0 });
  if (error || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    id: String(r.id), slug: String(r.slug), name: String(r.name ?? ''), logo: (r.logo_url as string) ?? null,
    tier: String(r.tier ?? 'free'), rating: num(r.rating), reviews: Number(r.reviews_count ?? 0),
    city: (r.city as string) ?? null, address: (r.address as string) ?? null, phone: (r.phone as string) ?? null,
    sellerType: (r.seller_type as string) ?? null, license: (r.license as string) ?? null, langs: (r.langs as string) ?? null,
    bhph: r.bhph === true, inventory: Number(r.inventory ?? 0), totalCount: Number(r.total_count ?? 0),
  }));
}

/** Message / test / pre-qual / offer → dealer's lead pipeline. Error text or null. */
export async function createVehicleLead(slug: string, kind: AuLeadKind, f: {
  name: string; phone?: string; email?: string; message?: string; offer?: number;
  income?: string; employ?: string; credit?: string; down?: number;
}): Promise<string | null> {
  if (!supabase) return 'offline';
  const { error } = await supabase.rpc('create_vehicle_lead', {
    in_slug: slug, in_kind: kind, in_name: f.name, in_phone: f.phone ?? null, in_email: f.email ?? null,
    in_message: f.message ?? null, in_offer: f.offer ?? null, in_income: f.income ?? null,
    in_employ: f.employ ?? null, in_credit: f.credit ?? null, in_down: f.down ?? null,
  });
  return error ? error.message : null;
}

export async function bookVehicleTest(slug: string, at: string, name: string, phone?: string, message?: string): Promise<string | null> {
  if (!supabase) return 'offline';
  const { error } = await supabase.rpc('book_vehicle_test', { in_slug: slug, in_at: at, in_name: name, in_phone: phone ?? null, in_message: message ?? null });
  return error ? error.message : null;
}

// ── saved (♥, cross-device) ──────────────────────────────────────────────────
export async function fetchSavedVehicleIds(): Promise<Set<string>> {
  if (!supabase) return new Set();
  const { data } = await supabase.from('vehicle_saves').select('vehicle_id');
  return new Set(Array.isArray(data) ? data.map((r) => String((r as { vehicle_id: string }).vehicle_id)) : []);
}
export async function setVehicleSaved(vehicleId: string, userId: string, saved: boolean): Promise<void> {
  if (!supabase) return;
  if (saved) await supabase.from('vehicle_saves').upsert({ vehicle_id: vehicleId, user_id: userId });
  else await supabase.from('vehicle_saves').delete().eq('vehicle_id', vehicleId).eq('user_id', userId);
}
export async function fetchSavedVehicles(): Promise<AuCard[]> {
  if (!supabase) return [];
  const { data } = await supabase.from('vehicle_saves').select('vehicle_id').order('created_at', { ascending: false }).limit(100);
  const ids = Array.isArray(data) ? data.map((r) => String((r as { vehicle_id: string }).vehicle_id)) : [];
  if (!ids.length) return [];
  const { data: rows } = await supabase.from('vehicles')
    .select('id,slug,cond,vtype,make,model,year,price,down,miles,trans,fuel,mpg,color_es,color_en,city,photos,bhph,financing,apr,status,views,saves_count,created_at')
    .in('id', ids).neq('status', 'draft');
  if (!Array.isArray(rows)) return [];
  const byId = new Map(rows.map((r) => [String((r as { id: string }).id), r as Record<string, unknown>]));
  return ids.map((id) => byId.get(id)).filter(Boolean).map((r) => mapCard({ ...(r as Record<string, unknown>), lat: null, lng: null, total_count: 0 }));
}

// ── panel (dealer side — RLS-guarded reads + upsert RPC) ─────────────────────
export async function upsertVehicle(id: string | null, p: Record<string, unknown>): Promise<{ id?: string; slug?: string; error?: string }> {
  if (!supabase) return { error: 'offline' };
  const { data, error } = await supabase.rpc('upsert_vehicle', { in_id: id, p });
  if (error) return { error: error.message };
  const r = Array.isArray(data) ? (data[0] as { id: string; slug: string } | undefined) : null;
  return r ? { id: r.id, slug: r.slug } : { error: 'no result' };
}

export async function fetchMyVehicles(): Promise<(AuCard & { leadsCount: number; testsCount: number })[]> {
  if (!supabase) return [];
  const { data } = await supabase.from('vehicles')
    .select('id,slug,cond,vtype,make,model,year,price,down,miles,trans,fuel,mpg,color_es,color_en,city,photos,bhph,financing,apr,status,views,saves_count,created_at')
    .order('created_at', { ascending: false }).limit(300);
  const rows = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
  if (!rows.length) return [];
  const ids = rows.map((r) => String(r.id));
  const [leads, tests] = await Promise.all([
    supabase.from('vehicle_leads').select('vehicle_id').in('vehicle_id', ids),
    supabase.from('vehicle_tests').select('vehicle_id').in('vehicle_id', ids),
  ]);
  const lc = new Map<string, number>(); const tc = new Map<string, number>();
  (Array.isArray(leads.data) ? leads.data : []).forEach((r) => { const k = String((r as { vehicle_id: string }).vehicle_id); lc.set(k, (lc.get(k) ?? 0) + 1); });
  (Array.isArray(tests.data) ? tests.data : []).forEach((r) => { const k = String((r as { vehicle_id: string }).vehicle_id); tc.set(k, (tc.get(k) ?? 0) + 1); });
  return rows.map((r) => ({ ...mapCard({ ...r, lat: null, lng: null, total_count: 0 }), leadsCount: lc.get(String(r.id)) ?? 0, testsCount: tc.get(String(r.id)) ?? 0 }));
}

export async function fetchMyVehicleLeads(): Promise<(AuLead & { vehicleTitle: string })[]> {
  if (!supabase) return [];
  const { data } = await supabase.from('vehicle_leads')
    .select('id,vehicle_id,name,phone,email,kind,stage,message,offer_amount,income,employ,credit,down,created_at,vehicles(make,model,year,owner_id)')
    .order('created_at', { ascending: false }).limit(300);
  if (!Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((r) => {
    const v = r.vehicles as { make?: string; model?: string; year?: number } | null;
    return {
      id: String(r.id), vehicleId: String(r.vehicle_id), name: String(r.name ?? ''),
      phone: (r.phone as string) ?? null, email: (r.email as string) ?? null,
      kind: r.kind as AuLeadKind, stage: r.stage as AuLeadStage, message: (r.message as string) ?? null,
      offerAmount: num(r.offer_amount), income: (r.income as string) ?? null, employ: (r.employ as string) ?? null,
      credit: (r.credit as string) ?? null, down: num(r.down), createdAt: String(r.created_at ?? ''),
      vehicleTitle: v ? `${v.year ?? ''} ${v.make ?? ''} ${v.model ?? ''}`.trim() : '',
    };
  });
}
export async function setVehicleLeadStage(id: string, stage: AuLeadStage): Promise<string | null> {
  if (!supabase) return 'offline';
  const { error } = await supabase.from('vehicle_leads').update({ stage }).eq('id', id);
  return error ? error.message : null;
}

export async function fetchMyVehicleTests(): Promise<(AuTest & { vehicleTitle: string })[]> {
  if (!supabase) return [];
  const { data } = await supabase.from('vehicle_tests')
    .select('id,vehicle_id,name,phone,at,message,status,created_at,vehicles(make,model,year,owner_id)')
    .order('at', { ascending: true }).limit(300);
  if (!Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((r) => {
    const v = r.vehicles as { make?: string; model?: string; year?: number } | null;
    return {
      id: String(r.id), vehicleId: String(r.vehicle_id), name: String(r.name ?? ''), phone: (r.phone as string) ?? null,
      at: String(r.at ?? ''), message: (r.message as string) ?? null, status: r.status as AuTestStatus, createdAt: String(r.created_at ?? ''),
      vehicleTitle: v ? `${v.year ?? ''} ${v.make ?? ''} ${v.model ?? ''}`.trim() : '',
    };
  });
}
export async function setVehicleTestStatus(id: string, status: AuTestStatus, at?: string): Promise<string | null> {
  if (!supabase) return 'offline';
  const patch: Record<string, unknown> = { status };
  if (at) patch.at = at;
  const { error } = await supabase.from('vehicle_tests').update(patch).eq('id', id);
  return error ? error.message : null;
}

/** Published inventory for one dealer business (BizDetail "Vehículos" tab). */
export async function fetchVehiclesByBizSlug(slug: string, limit = 12): Promise<AuCard[]> {
  if (!supabase) return [];
  const { data } = await supabase.from('businesses').select('id').eq('slug', slug).maybeSingle();
  const id = (data as { id?: string } | null)?.id;
  if (!id) return [];
  return searchVehicles({ business: id, sort: 'year_desc', limit });
}

// ── finance math (client-side) ───────────────────────────────────────────────
/** Monthly auto-loan payment. loan = max(0, price - down). */
export function autoMonthly(price: number, down: number, aprPct: number, months: number): {
  monthly: number; loan: number; totalInterest: number; totalCost: number;
} {
  const loan = Math.max(0, price - down);
  const r = aprPct / 100 / 12;
  const n = Math.max(1, months);
  const monthly = r === 0 ? loan / n : (loan * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const totalCost = monthly * n;
  return { monthly, loan, totalInterest: Math.max(0, totalCost - loan), totalCost };
}
/** Quick "$NN/mes" estimate for cards (handoff defaults APR 8.9, term 72). */
export function estMonthly(price: number, down: number | null, apr = 8.9, months = 72): number {
  return autoMonthly(price, down ?? 0, apr, months).monthly;
}
/** APR band by self-reported credit (soft, illustrative — no bureau pull). */
export function aprForCredit(credit: string): number {
  switch (credit) {
    case 'excelente': return 5.9;
    case 'bueno': return 8.9;
    case 'regular': return 13.9;
    case 'malo': return 18.9;
    default: return 8.9;
  }
}

/** Trade-in estimate range (handoff formula). Returns [low, mid, high]. */
export function tradeInEstimate(year: number, miles: number, cond: 'excelente' | 'bueno' | 'regular', nowYear = 2026): [number, number, number] {
  const condFactor = cond === 'excelente' ? 1.08 : cond === 'regular' ? 0.82 : 1.0;
  const base = 30000 * Math.max(0.2, 1 - (nowYear - year) * 0.09) * Math.max(0.35, 1 - miles / 200000) * condFactor;
  const est = Math.max(800, Math.round(base / 100) * 100);
  return [Math.round(est * 0.92), est, Math.round(est * 1.08)];
}

export const fmtMiles = (m: number | null, es: boolean): string =>
  m == null ? (es ? 's/d' : 'n/a') : `${m.toLocaleString()} ${es ? 'mi' : 'mi'}`;
export const fmtAuPrice = (p: number): string => `$${Math.round(p).toLocaleString()}`;
