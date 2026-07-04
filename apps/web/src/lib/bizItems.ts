'use client';

// Thin CRUD helpers over the shared `business_items` table (migration 0021) that
// backs the dashboard's catalog modules — menu / products / services / rental,
// discriminated by `kind`. RLS: public read, owner writes. Modules keep their own
// rich UI + local optimistic state and call these to persist; they no-op safely
// when Supabase is absent (demo). Per-kind extras live in `attrs` (jsonb).

import { supabase } from '@/lib/supabase';

export type ItemKind = 'menu' | 'product' | 'service' | 'rental';

export type BizItemRow = {
  id: string;
  business_id: string;
  kind: ItemKind;
  name: string;
  description: string | null;
  price: number | null;
  unit: string | null;
  section: string | null;
  available: boolean;
  sort: number;
  image_url: string | null;
  attrs: Record<string, unknown>;
};

/** New-row fields (no id/timestamps). */
export type NewBizItem = Omit<BizItemRow, 'id'>;

export async function listBizItems(businessId: string, kind: ItemKind): Promise<BizItemRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('business_items')
    .select('id,business_id,kind,name,description,price,unit,section,available,sort,image_url,attrs')
    .eq('business_id', businessId)
    .eq('kind', kind)
    .order('sort', { ascending: true })
    .order('created_at', { ascending: true });
  if (error || !Array.isArray(data)) return [];
  return data as BizItemRow[];
}

/** Insert a row; returns the new id (or null on failure / demo). */
export async function insertBizItem(row: NewBizItem): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('business_items').insert(row).select('id').single();
  if (error || !data) return null;
  return (data as { id: string }).id;
}

export async function updateBizItem(id: string, patch: Partial<NewBizItem>): Promise<boolean> {
  if (!supabase) return true;
  const { error } = await supabase.from('business_items').update(patch).eq('id', id);
  return !error;
}

export async function deleteBizItem(id: string): Promise<boolean> {
  if (!supabase) return true;
  const { error } = await supabase.from('business_items').delete().eq('id', id);
  return !error;
}
