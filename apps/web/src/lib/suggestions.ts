'use client';

// Owner-proposed taxonomy entries (moderation) — shared by subcategories and
// "Lo que ofrece" features. An owner suggests a value that isn't in the standard
// list; it's stored `pending` until an admin approves it (migrations 0038/0039).
// These helpers no-op safely when Supabase is absent (demo).

import { supabase } from '@/lib/supabase';

export type SuggestionTable = 'subcategory_suggestions' | 'feature_suggestions';
export type Suggestion = { id: string; label_es: string; status: 'pending' | 'approved' | 'rejected'; category_id: string };

export async function listSuggestions(table: SuggestionTable, businessId: string, categoryId: string): Promise<Suggestion[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from(table)
    .select('id,label_es,status,category_id')
    .eq('business_id', businessId)
    .eq('category_id', categoryId)
    .order('created_at', { ascending: true });
  if (error || !Array.isArray(data)) return [];
  return data as Suggestion[];
}

/** Propose a new value (stored pending). Returns the row, or null on failure. */
export async function proposeSuggestion(table: SuggestionTable, businessId: string, categoryId: string, label: string): Promise<Suggestion | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from(table)
    .insert({ business_id: businessId, category_id: categoryId, label_es: label })
    .select('id,label_es,status,category_id')
    .single();
  if (error || !data) return null;
  return data as Suggestion;
}

/** Cancel a still-pending suggestion. */
export async function cancelSuggestion(table: SuggestionTable, id: string): Promise<boolean> {
  if (!supabase) return true;
  const { error } = await supabase.from(table).delete().eq('id', id);
  return !error;
}
