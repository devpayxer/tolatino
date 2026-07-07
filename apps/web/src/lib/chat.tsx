'use client';

// In-app chat data layer (buyer ↔ seller), migration 0053. Shared by the consumer
// (BizDetail) and the owner inbox (dashboard Messages). Conversations + messages
// live in business_conversations / business_messages; realtime keeps both sides
// live. All calls degrade to no-ops when Supabase isn't configured.

import { supabase } from '@/lib/supabase';

export type ChatMsg = { id: string; fromOwner: boolean; body: string; at: string };

const mapMsg = (r: Record<string, unknown>): ChatMsg => ({
  id: String(r.id), fromOwner: !!r.from_owner, body: String(r.body), at: String(r.created_at),
});

/** Get-or-create the signed-in customer's conversation with a business (by slug).
 *  Returns the conversation id, or null (offline / not found / not signed in). */
export async function startConversation(slug: string, name: string, initials: string, color: string): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('start_conversation', { in_slug: slug, in_name: name, in_initials: initials, in_color: color });
  if (error || !data) return null;
  return String(data);
}

export async function fetchChatMessages(conversationId: string): Promise<ChatMsg[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('business_messages')
    .select('id,from_owner,body,created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map(mapMsg);
}

/** Insert a message and return the created row, so the sender can append it
 *  immediately (its realtime echo is de-duped by id). */
export async function sendChatMessage(conversationId: string, fromOwner: boolean, body: string): Promise<ChatMsg | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('business_messages')
    .insert({ conversation_id: conversationId, from_owner: fromOwner, body })
    .select('id,from_owner,body,created_at')
    .single();
  if (error || !data) return null;
  return mapMsg(data as Record<string, unknown>);
}

/** Reset the unread counter for one side of a conversation. */
export async function markConversationRead(conversationId: string, side: 'owner' | 'customer'): Promise<void> {
  if (!supabase) return;
  const patch = side === 'owner' ? { unread: 0 } : { customer_unread: 0 };
  await supabase.from('business_conversations').update(patch).eq('id', conversationId);
}

/** Subscribe to new messages in one conversation. Returns an unsubscribe fn. */
export function subscribeChat(conversationId: string, onInsert: (m: ChatMsg) => void): () => void {
  if (!supabase) return () => {};
  const ch = supabase
    .channel(`chat-${conversationId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'business_messages', filter: `conversation_id=eq.${conversationId}` },
      (payload) => onInsert(mapMsg(payload.new as Record<string, unknown>)))
    .subscribe();
  return () => { supabase!.removeChannel(ch); };
}

/** Subscribe to ALL new messages the current user can see (owner inbox) — RLS
 *  limits the payload to the owner's own conversations. Returns an unsubscribe fn. */
export function subscribeInbox(onInsert: (m: ChatMsg & { conversationId: string }) => void): () => void {
  if (!supabase) return () => {};
  const ch = supabase
    .channel('inbox')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'business_messages' },
      (payload) => { const r = payload.new as Record<string, unknown>; onInsert({ ...mapMsg(r), conversationId: String(r.conversation_id) }); })
    .subscribe();
  return () => { supabase!.removeChannel(ch); };
}
