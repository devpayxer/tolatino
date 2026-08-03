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
type NumArr = Record<string, number[]>;

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
  pollVote: Num; // the option index this user picked, per poll post
  pollCount: NumArr; // authoritative per-option counts (override), per poll post
  votePoll: (postId: string, optionIndex: number, base: number[]) => void;
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
  const [pollVote, setPollVote] = useState<Num>({});
  const [pollCount, setPollCount] = useState<NumArr>({});
  // Comment ids already counted — dedupes a locally-inserted comment against
  // its own realtime echo, and realtime echoes against the initial DB load.
  const seen = useRef<Set<string>>(new Set());
  // Espejo del estado para leerlo dentro de los toggles sin re-crear el
  // callback en cada render. El efecto de red NO puede vivir dentro del
  // updater de `setState`: React puede ejecutar el updater dos veces y
  // entonces se dispara la escritura por duplicado.
  const likedRef = useRef<Bool>({});
  const savedRef = useRef<Bool>({});
  likedRef.current = liked;
  savedRef.current = saved;

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
      // El conteo lo hace la BASE (`post_comment_counts`, migración 0137). Antes
      // se bajaban TODAS las filas de comentarios del feed al navegador solo
      // para contarlas: con hilos activos son miles de filas por visita para
      // pintar tres números.
      const counts: Num = {};
      const cc = await supabase.rpc('post_comment_counts', { ids: postIds });
      if (!cc.error && Array.isArray(cc.data)) {
        for (const r of cc.data as { post_id: string; n: number }[]) counts[r.post_id] = Number(r.n);
      }
      if (!cancelled) setCommentCount(counts);

      if (user) {
        const [pl, sp, pv] = await Promise.all([
          supabase.from('post_likes').select('post_id').eq('user_id', user.id).in('post_id', postIds),
          supabase.from('saved_posts').select('post_id').eq('user_id', user.id).in('post_id', postIds),
          supabase.from('poll_votes').select('post_id, option_index').eq('user_id', user.id).in('post_id', postIds),
        ]);
        if (cancelled) return;
        if (!pl.error && pl.data) setLiked(Object.fromEntries((pl.data as { post_id: string }[]).map((r) => [r.post_id, true])));
        if (!sp.error && sp.data) setSaved(Object.fromEntries((sp.data as { post_id: string }[]).map((r) => [r.post_id, true])));
        if (!pv.error && pv.data) setPollVote(Object.fromEntries((pv.data as { post_id: string; option_index: number }[]).map((r) => [r.post_id, r.option_index])));
      } else {
        setLiked({});
        setSaved({});
        setPollVote({});
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
      const next = !likedRef.current[postId];
      setLiked((m) => ({ ...m, [postId]: next }));
      setLikeCount((c) => ({ ...c, [postId]: (c[postId] ?? baseCount) + (next ? 1 : -1) }));
      if (supabase && user) {
        supabase.rpc('toggle_post_like', { p_post: postId }).then(({ data, error }) => {
          if (!error && data && data[0]) {
            setLiked((mm) => ({ ...mm, [postId]: data[0].liked }));
            setLikeCount((c) => ({ ...c, [postId]: data[0].count }));
          } else if (error) {
            // Deshacer el optimismo: el servidor puede rechazarlo de verdad
            // (publicación ocultada por moderación, autor que te bloqueó).
            setLiked((mm) => ({ ...mm, [postId]: !next }));
            setLikeCount((c) => ({ ...c, [postId]: (c[postId] ?? baseCount) + (next ? -1 : 1) }));
          }
        });
      }
    },
    [user],
  );

  const toggleSave = useCallback(
    (postId: string) => {
      const next = !savedRef.current[postId];
      setSaved((m) => ({ ...m, [postId]: next }));
      if (supabase && user) {
        // El marcador FINGÍA que había guardado: se pintaba lleno y el error
        // del servidor se tiraba a la basura. Si la escritura falla (cuenta
        // suspendida, RLS, sin red), el usuario veía «guardado» y luego no
        // aparecía en Guardados. Ahora se revierte. (2ª auditoría.)
        const q = next
          ? supabase.from('saved_posts').insert({ post_id: postId, user_id: user.id })
          : supabase.from('saved_posts').delete().eq('post_id', postId).eq('user_id', user.id);
        q.then(({ error }) => {
          if (error) setSaved((mm) => ({ ...mm, [postId]: !next }));
        });
      }
    },
    [user],
  );

  const votePoll = useCallback(
    (postId: string, optionIndex: number, base: number[]) => {
      if (pollVote[postId] !== undefined) return; // one vote per user, final
      if (!gate()) return; // guests → sign in
      // optimistic: mark the choice and bump its count
      setPollVote((m) => ({ ...m, [postId]: optionIndex }));
      setPollCount((c) => {
        const cur = c[postId] ?? base;
        return { ...c, [postId]: cur.map((n, i) => (i === optionIndex ? n + 1 : n)) };
      });
      if (supabase && user && isUuid(postId)) {
        supabase.rpc('vote_poll', { p_post: postId, p_option: optionIndex }).then(({ data, error }) => {
          if (!error && data && data[0]) {
            setPollCount((c) => ({ ...c, [postId]: data[0].counts as number[] }));
            setPollVote((m) => ({ ...m, [postId]: data[0].my_option as number }));
          }
        });
      }
    },
    [pollVote, gate, user],
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
        const r = payload.new as { id: string; recommends: number; poll_votes: number[] | null };
        if (!r?.id) return;
        if (typeof r.recommends === 'number') setLikeCount((m) => ({ ...m, [r.id]: r.recommends }));
        // poll counts follow posts.poll_votes so votes update live for everyone
        if (Array.isArray(r.poll_votes)) setPollCount((m) => ({ ...m, [r.id]: r.poll_votes as number[] }));
      })
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [noteComment]);

  return (
    <C.Provider value={{ liked, saved, likeCount, commentCount, toggleLike, toggleSave, noteComment, pollVote, pollCount, votePoll, gate }}>
      {children}
    </C.Provider>
  );
}

export function useInteractions(): Ctx {
  const ctx = useContext(C);
  if (!ctx) throw new Error('useInteractions must be used inside <InteractionsProvider>');
  return ctx;
}
