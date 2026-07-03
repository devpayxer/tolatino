'use client';

// Per-user post interactions: like (♥ recommends), save, and comment counts.
// Logged-in actions persist to Supabase (toggle_post_like RPC, saved_posts
// table); guests get an optimistic session-only toggle. Counts for the
// visible feed are loaded from the DB. Comments themselves live in the thread
// component (loaded on open); here we track only the per-post count.

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useLiveData } from '@/lib/live';

type Bool = Record<string, boolean>;
type Num = Record<string, number>;

// Real (Supabase) posts carry a UUID id; fixture / just-created local posts do
// not — only UUIDs are safe to send to a `uuid` column filter.
const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(id);

type Ctx = {
  liked: Bool;
  saved: Bool;
  likeCount: Num; // authoritative override after a toggle
  commentCount: Num;
  toggleLike: (postId: string, baseCount: number) => void;
  toggleSave: (postId: string) => void;
  /** Record a freshly-inserted comment once (dedupes our own insert vs. the
   *  realtime echo) and bump that post's live comment count. */
  noteComment: (commentId: string, postId: string) => void;
  /** True if the user may act; otherwise routes guests to sign in and returns false. */
  gate: () => boolean;
};

const C = createContext<Ctx | null>(null);

export function InteractionsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { posts } = useLiveData();
  const router = useRouter();

  const [liked, setLiked] = useState<Bool>({});
  const [saved, setSaved] = useState<Bool>({});
  const [likeCount, setLikeCount] = useState<Num>({});
  const [commentCount, setCommentCount] = useState<Num>({});
  // Comment ids already counted — dedupes a locally-inserted comment against
  // its own realtime echo, and realtime echoes against the initial DB load.
  const seen = useRef<Set<string>>(new Set());

  const ids = posts.map((p) => p.id).filter(isUuid).join(',');

  const noteComment = useCallback((commentId: string, postId: string) => {
    if (seen.current.has(commentId)) return;
    seen.current.add(commentId);
    setCommentCount((c) => ({ ...c, [postId]: (c[postId] ?? 0) + 1 }));
  }, []);

  // Load comment counts (public) + the user's likes/saves for the visible feed.
  useEffect(() => {
    if (!supabase) return;
    const postIds = ids ? ids.split(',') : [];
    if (postIds.length === 0) return;
    let cancelled = false;

    (async () => {
      const counts: Num = {};
      const cc = await supabase.from('post_comments').select('id, post_id').in('post_id', postIds);
      if (!cc.error && cc.data) {
        for (const r of cc.data as { id: string; post_id: string }[]) {
          counts[r.post_id] = (counts[r.post_id] ?? 0) + 1;
          seen.current.add(r.id);
        }
      }
      if (!cancelled) setCommentCount(counts);

      if (user) {
        const [pl, sp] = await Promise.all([
          supabase.from('post_likes').select('post_id').eq('user_id', user.id).in('post_id', postIds),
          supabase.from('saved_posts').select('post_id').eq('user_id', user.id).in('post_id', postIds),
        ]);
        if (cancelled) return;
        if (!pl.error && pl.data) setLiked(Object.fromEntries((pl.data as { post_id: string }[]).map((r) => [r.post_id, true])));
        if (!sp.error && sp.data) setSaved(Object.fromEntries((sp.data as { post_id: string }[]).map((r) => [r.post_id, true])));
      } else {
        setLiked({});
        setSaved({});
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ids, user]);

  const gate = useCallback(() => {
    if (user || !supabase) return true; // guests still work in demo mode
    router.push('/entrar');
    return false;
  }, [user, router]);

  const toggleLike = useCallback(
    (postId: string, baseCount: number) => {
      setLiked((m) => {
        const next = !m[postId];
        setLikeCount((c) => ({ ...c, [postId]: (c[postId] ?? baseCount) + (next ? 1 : -1) }));
        if (supabase && user) {
          supabase.rpc('toggle_post_like', { p_post: postId }).then(({ data, error }) => {
            if (!error && data && data[0]) {
              setLiked((mm) => ({ ...mm, [postId]: data[0].liked }));
              setLikeCount((c) => ({ ...c, [postId]: data[0].count }));
            }
          });
        }
        return { ...m, [postId]: next };
      });
    },
    [user],
  );

  const toggleSave = useCallback(
    (postId: string) => {
      setSaved((m) => {
        const next = !m[postId];
        if (supabase && user) {
          if (next) supabase.from('saved_posts').insert({ post_id: postId, user_id: user.id }).then(() => {});
          else supabase.from('saved_posts').delete().eq('post_id', postId).eq('user_id', user.id).then(() => {});
        }
        return { ...m, [postId]: next };
      });
    },
    [user],
  );

  // ── Live updates (Supabase Realtime) ──────────────────────────────────────
  // Feed-wide: new comments bump the live count for any post; a post's ♥ count
  // follows `posts.recommends` so every viewer sees likes without refreshing.
  // (At 1M+ scale this broadcast fan-out moves to per-city channels; MVP keeps
  // one global channel.)
  useEffect(() => {
    const sb = supabase;
    if (!sb) return;
    const ch = sb
      .channel('tl-social')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'post_comments' }, (payload) => {
        const r = payload.new as { id: string; post_id: string };
        if (r?.id && r?.post_id) noteComment(r.id, r.post_id);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts' }, (payload) => {
        const r = payload.new as { id: string; recommends: number };
        if (r?.id && typeof r.recommends === 'number') setLikeCount((m) => ({ ...m, [r.id]: r.recommends }));
      })
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [noteComment]);

  return (
    <C.Provider value={{ liked, saved, likeCount, commentCount, toggleLike, toggleSave, noteComment, gate }}>
      {children}
    </C.Provider>
  );
}

export function useInteractions(): Ctx {
  const ctx = useContext(C);
  if (!ctx) throw new Error('useInteractions must be used inside <InteractionsProvider>');
  return ctx;
}
