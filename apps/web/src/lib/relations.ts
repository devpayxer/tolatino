'use client';

// Data layer for "Listados relacionados" (business_relations, migration 0044).
// Same-owner links are auto-approved; cross-owner links need the other owner to
// approve. All mutations go through security-definer RPCs that enforce the rules.
// Every call degrades gracefully to empty/offline when Supabase isn't configured.

import { supabase } from '@/lib/supabase';

export type RelStatus = 'pending' | 'approved' | 'rejected';
export type RelDirection = 'out' | 'in';

export type LinkCandidate = {
  id: string; slug: string; name: string; categoryId: string; city: string | null;
  tileA: string | null; tileB: string | null; tier: string; sameOwner: boolean;
};

export type AdminRelation = {
  relationId: string; direction: RelDirection; otherId: string; otherSlug: string; otherName: string;
  otherCategory: string; otherCity: string | null; tileA: string | null; tileB: string | null; otherTier: string;
  roleEs: string | null; roleEn: string | null; status: RelStatus; sameOwner: boolean; createdAt: string;
};

export type PublicRelation = {
  slug: string; name: string; categoryId: string; city: string | null; tileA: string | null; tileB: string | null;
  tier: string; rating: number; reviewsCount: number; roleEs: string | null; roleEn: string | null; otherIsTarget: boolean;
};

const s = (v: unknown): string | null => (v != null ? String(v) : null);

/** Name search for listings to link (own listings first), excluding the source. */
export async function searchBusinessesToLink(q: string, sourceId: string, limit = 8): Promise<LinkCandidate[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('search_businesses_link', { in_q: q, in_source: sourceId, in_limit: limit });
  if (error || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    id: String(r.id), slug: String(r.slug), name: String(r.name), categoryId: String(r.category_id),
    city: s(r.city), tileA: s(r.tile_a), tileB: s(r.tile_b), tier: String(r.tier), sameOwner: r.same_owner === true,
  }));
}

/** Every link touching a listing (approved + pending, both directions). */
export async function fetchRelationsAdmin(businessId: string): Promise<AdminRelation[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('business_relations_admin', { in_business: businessId });
  if (error || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    relationId: String(r.relation_id), direction: r.direction === 'in' ? 'in' : 'out',
    otherId: String(r.other_id), otherSlug: String(r.other_slug), otherName: String(r.other_name),
    otherCategory: String(r.other_category), otherCity: s(r.other_city),
    tileA: s(r.other_tile_a), tileB: s(r.other_tile_b), otherTier: String(r.other_tier),
    roleEs: s(r.role_es), roleEn: s(r.role_en), status: r.status as RelStatus,
    sameOwner: r.same_owner === true, createdAt: String(r.created_at),
  }));
}

/** Request a link. Same-owner → approved instantly; else pending the other owner. */
export async function requestRelation(sourceId: string, targetId: string, roleEs?: string | null, roleEn?: string | null) {
  if (!supabase) return { error: 'offline' };
  const { error } = await supabase.rpc('request_business_relation', {
    in_source: sourceId, in_target: targetId, in_role_es: roleEs ?? null, in_role_en: roleEn ?? null,
  });
  return { error: error?.message ?? null };
}

/** Approve or reject an incoming request (target owner only). */
export async function respondRelation(relationId: string, approve: boolean) {
  if (!supabase) return { error: 'offline' };
  const { error } = await supabase.rpc('respond_business_relation', { in_id: relationId, in_approve: approve });
  return { error: error?.message ?? null };
}

/** Unlink (either side's owner). */
export async function removeRelation(relationId: string) {
  if (!supabase) return { error: 'offline' };
  const { error } = await supabase.from('business_relations').delete().eq('id', relationId);
  return { error: error?.message ?? null };
}

/** Public: approved related listings for a slug (for the "Relacionados" tab). */
export async function fetchBusinessRelations(slug: string): Promise<PublicRelation[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('business_relations_by_slug', { in_slug: slug });
  if (error || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    slug: String(r.slug), name: String(r.name), categoryId: String(r.category_id), city: s(r.city),
    tileA: s(r.tile_a), tileB: s(r.tile_b), tier: String(r.tier),
    rating: Number(r.rating ?? 0), reviewsCount: Number(r.reviews_count ?? 0),
    roleEs: s(r.role_es), roleEn: s(r.role_en), otherIsTarget: r.other_is_target === true,
  }));
}
