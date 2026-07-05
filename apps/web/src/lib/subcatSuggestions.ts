'use client';

// Owner-proposed subcategories (moderation). The owner suggests a subcategory
// that isn't in the standard list; it's stored `pending` until an admin approves
// it (migration 0038). These helpers no-op safely when Supabase is absent (demo).

import { supabase } from '@/lib/supabase';

export type SubcatSuggestion = { id: string; label_es: string; status: 'pending' | 'approved' | 'rejected'; category_id: string };

export async function listSuggestions(businessId: string, categoryId: string): Promise<SubcatSuggestion[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('subcategory_suggestions')
    .select('id,label_es,status,category_id')
    .eq('business_id', businessId)
    .eq('category_id', categoryId)
    .order('created_at', { ascending: true });
  if (error || !Array.isArray(data)) return [];
  return data as SubcatSuggestion[];
}

/** Propose a new subcategory (stored pending). Returns the row, or null on failure. */
export async function proposeSubcategory(businessId: string, categoryId: string, label: string): Promise<SubcatSuggestion | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('subcategory_suggestions')
    .insert({ business_id: businessId, category_id: categoryId, label_es: label })
    .select('id,label_es,status,category_id')
    .single();
  if (error || !data) return null;
  return data as SubcatSuggestion;
}

/** Cancel a still-pending suggestion. */
export async function cancelSuggestion(id: string): Promise<boolean> {
  if (!supabase) return true;
  const { error } = await supabase.from('subcategory_suggestions').delete().eq('id', id);
  return !error;
}
