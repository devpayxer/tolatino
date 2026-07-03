'use client';

// Comunidad (`/comunidad`) — Nextdoor-style home of the app (Handoff v2).
// Desktop: barrios rail / feed / tendencias+vecinos. Mobile: single column.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Send, Store, X } from 'lucide-react';
import { useLang } from '@/lib/i18n';
import { useApp } from '@/lib/state';
import { useAuth } from '@/lib/auth';
import { useInteractions } from '@/lib/interactions';
import { supabase } from '@/lib/supabase';
import { Avatar, Card, EmptyState, Overlay, YouAvatar } from '@/components/ui';
import { SearchChip } from '@/components/AppHeader';
import { PostCard } from '@/components/PostCard';
import { HOODS, NEIGHBORS, SEED_COMMENTS, SEED_REPLIES, TRENDING, bizTile, type Comment, type Post } from '@/data/fixtures';
import { useLiveData } from '@/lib/live';

// Real (Supabase) posts/comments carry a UUID id; fixtures do not.
const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(id);

function relTime(iso: string): [string, string] {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return [`hace ${mins} min`, `${mins}m`];
  const h = Math.round(mins / 60);
  if (h < 24) return [`hace ${h} h`, `${h}h`];
  const d = Math.round(h / 24);
  return [`hace ${d} d`, `${d}d`];
}

type CommentRow = {
  id: string;
  parent_id: string | null;
  author_name: string;
  author_initials: string;
  author_color: string;
  body: string;
  biz_name: string | null;
  biz_rating: string | null;
  like_count: number;
  created_at: string;
};

function mapComment(r: CommentRow): Comment {
  const [tEs, tEn] = relTime(r.created_at);
  return {
    id: r.id,
    initials: r.author_initials,
    color: r.author_color,
    name: r.author_name,
    timeEs: tEs,
    timeEn: tEn,
    likes: r.like_count,
    es: r.body,
    en: r.body,
    biz: r.biz_name ? { name: r.biz_name, rating: r.biz_rating ?? '' } : undefined,
  };
}

// 30 miles — the hyperlocal community radius (matches posts_near in live.tsx).
const COMMUNITY_RADIUS_M = 48280;

type PostRow = {
  id: string;
  type: Post['type'];
  author_id: string | null;
  author_initials: string;
  author_color: string;
  author_name: string;
  hood: string | null;
  created_at: string;
  recommends: number | null;
  business_name: string | null;
  business_rating: number | null;
  poll_options: string[] | null;
  poll_votes: number[] | null;
  body_es: string;
  body_en: string;
  lat: number | null;
  lng: number | null;
};

function mapPost(r: PostRow): Post {
  const [tEs, tEn] = relTime(r.created_at);
  return {
    id: String(r.id),
    type: r.type,
    initials: r.author_initials,
    color: r.author_color,
    name: r.author_name,
    hoodEs: r.hood ?? '',
    timeEs: tEs,
    timeEn: tEn,
    recommends: Number(r.recommends ?? 0),
    business: r.business_name ?? undefined,
    bizRating: r.business_rating != null ? Number(r.business_rating).toFixed(1) : undefined,
    poll: r.poll_options ?? undefined,
    pollBase: r.poll_votes ?? undefined,
    es: r.body_es,
    en: r.body_en,
  };
}

// Great-circle distance in meters (haversine) — used to keep realtime posts
// within the user's 30-mile community radius without a round-trip.
function distMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function dedupeById(list: Post[]): Post[] {
  const seen = new Set<string>();
  return list.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
}

export function ComunidadScreen() {
  const { L } = useLang();
  const app = useApp();
  const auth = useAuth();
  const it = useInteractions();
  const { posts: POSTS, businesses: BUSINESSES } = useLiveData();
  const [hood, setHood] = useState('all');

  // thread state
  const [threadPostId, setThreadPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState<{ cid: string; name: string } | null>(null);
  const [userComments, setUserComments] = useState<Record<string, Comment[]>>({});
  const [userReplies, setUserReplies] = useState<Record<string, Comment[]>>({});
  // DB-backed comments (loaded when a real post's thread opens).
  const [dbTop, setDbTop] = useState<Record<string, Comment[]>>({});
  const [dbReplies, setDbReplies] = useState<Record<string, Comment[]>>({});
  const [commentLikes, setCommentLikes] = useState<Record<string, boolean>>({});
  const [commentLikeCount, setCommentLikeCount] = useState<Record<string, number>>({});
  const [commentBiz, setCommentBiz] = useState<string | null>(null);
  const [commentBizOpen, setCommentBizOpen] = useState(false);
  const [commentBizQuery, setCommentBizQuery] = useState('');
  const [commentSeq, setCommentSeq] = useState(0);
  const [sending, setSending] = useState(false);

  // New posts from other users arriving live: buffered in `pending` (shown as a
  // pill) until the user taps to reveal them — so the feed never jumps while
  // they're scrolling. `revealed` holds the ones they chose to show.
  const [pending, setPending] = useState<Post[]>([]);
  const [revealed, setRevealed] = useState<Post[]>([]);
  const feedIdsRef = useRef<Set<string>>(new Set());

  // Load the DB comment thread (and this user's comment-likes) when a real
  // post's thread opens. Fixture posts keep their SEED_COMMENTS.
  useEffect(() => {
    const pid = threadPostId;
    if (!pid || !supabase || !isUuid(pid)) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.from('post_comments').select('*').eq('post_id', pid).order('created_at');
      if (cancelled || error || !data) return;
      const rows = data as CommentRow[];
      const top: Comment[] = [];
      const rep: Record<string, Comment[]> = {};
      for (const r of rows) {
        const c = mapComment(r);
        if (r.parent_id) (rep[r.parent_id] ??= []).push(c);
        else top.push(c);
      }
      setDbTop((m) => ({ ...m, [pid]: top }));
      setDbReplies((m) => ({ ...m, ...rep }));
      if (auth.user && rows.length) {
        const { data: cl } = await supabase
          .from('comment_likes')
          .select('comment_id')
          .eq('user_id', auth.user.id)
          .in('comment_id', rows.map((r) => r.id));
        if (!cancelled && cl) {
          setCommentLikes((m) => ({ ...m, ...Object.fromEntries((cl as { comment_id: string }[]).map((x) => [x.comment_id, true])) }));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [threadPostId, auth.user]);

  // Live thread: while a real post's thread is open, stream new comments/replies
  // and comment-like changes from other users (no refresh). The feed-wide count
  // is handled by InteractionsProvider; here we keep the open list in sync.
  useEffect(() => {
    const pid = threadPostId;
    const sb = supabase;
    if (!pid || !sb || !isUuid(pid)) return;
    const ch = sb
      .channel(`tl-thread-${pid}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'post_comments', filter: `post_id=eq.${pid}` },
        (payload) => {
          const r = payload.new as CommentRow;
          const c = mapComment(r);
          if (r.parent_id) {
            const parent = r.parent_id;
            setDbReplies((m) => ((m[parent] ?? []).some((x) => x.id === c.id) ? m : { ...m, [parent]: [...(m[parent] ?? []), c] }));
          } else {
            setDbTop((m) => ((m[pid] ?? []).some((x) => x.id === c.id) ? m : { ...m, [pid]: [...(m[pid] ?? []), c] }));
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'post_comments', filter: `post_id=eq.${pid}` },
        (payload) => {
          const r = payload.new as CommentRow;
          if (r?.id) setCommentLikeCount((m) => ({ ...m, [r.id]: r.like_count }));
        },
      )
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [threadPostId]);

  const allPosts: Post[] = useMemo(
    () => dedupeById([...revealed, ...app.newPosts, ...POSTS]),
    [revealed, app.newPosts, POSTS],
  );

  // Keep a live set of the ids already in the feed so the realtime handler can
  // skip posts we're already showing (e.g. ones that arrived via a refresh).
  useEffect(() => {
    feedIdsRef.current = new Set(allPosts.map((p) => p.id));
  }, [allPosts]);

  // Switching city resets the buffered/revealed live posts — they belonged to
  // the old feed.
  const { lat: cLat, lng: cLng } = app.coords;
  useEffect(() => {
    setPending([]);
    setRevealed([]);
  }, [cLat, cLng]);

  // Live feed: buffer new posts from OTHER users within the 30-mile radius.
  useEffect(() => {
    const sb = supabase;
    if (!sb) return;
    const ch = sb
      .channel('tl-comunidad-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
        const r = payload.new as PostRow;
        if (!r?.id) return;
        if (auth.user && r.author_id === auth.user.id) return; // our own post arrives via refresh
        if (feedIdsRef.current.has(String(r.id))) return; // already visible
        if (r.lat != null && r.lng != null && distMeters(cLat, cLng, r.lat, r.lng) > COMMUNITY_RADIUS_M) return;
        const post = mapPost(r);
        setPending((list) => (list.some((p) => p.id === post.id) ? list : [post, ...list]));
      })
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [cLat, cLng, auth.user]);

  const showNewPosts = () => {
    setRevealed((r) => dedupeById([...pending, ...r]));
    setPending([]);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const sl = app.search.trim().toLowerCase();
  const posts = sl
    ? allPosts.filter((p) => `${p.es} ${p.en} ${p.name} ${p.business ?? ''}`.toLowerCase().includes(sl))
    : allPosts;

  const topComments = (pid: string) => [...(SEED_COMMENTS[pid] ?? []), ...(dbTop[pid] ?? []), ...(userComments[pid] ?? [])];
  const repliesFor = (cid: string) => [...(SEED_REPLIES[cid] ?? []), ...(dbReplies[cid] ?? []), ...(userReplies[cid] ?? [])];
  // Feed count: real posts use the DB total (loaded for the whole visible feed
  // and kept live via bumpComment); fixtures count their local comments.
  const commentCount = (pid: string) =>
    isUuid(pid) ? (it.commentCount[pid] ?? 0) : topComments(pid).reduce((n, c) => n + 1 + repliesFor(c.id).length, 0);

  const threadPost = allPosts.find((p) => p.id === threadPostId) ?? null;
  const canComment = commentText.trim().length > 0 || !!commentBiz;

  const closeThread = () => {
    setThreadPostId(null);
    setReplyTo(null);
    setCommentText('');
    setCommentBiz(null);
    setCommentBizOpen(false);
  };

  const resetComposer = () => {
    setCommentText('');
    setReplyTo(null);
    setCommentBiz(null);
    setCommentBizOpen(false);
  };

  const sendComment = async () => {
    const txt = commentText.trim();
    const pid = threadPostId;
    if ((!txt && !commentBiz) || !pid || sending) return;
    // Guests must sign in before commenting on a real feed.
    if (!it.gate()) return;

    // Real post + signed-in user → persist to Supabase.
    if (supabase && auth.user && auth.profile && isUuid(pid)) {
      setSending(true);
      const row = {
        post_id: pid,
        parent_id: replyTo?.cid ?? null,
        author_id: auth.user.id,
        author_name: auth.profile.display_name,
        author_initials: auth.profile.initials,
        author_color: auth.profile.avatar_color,
        body: txt,
        biz_name: commentBiz ?? null,
        biz_rating: commentBiz ? '4.9' : null,
      };
      const { data, error } = await supabase.from('post_comments').insert(row).select().single();
      setSending(false);
      if (error || !data) return;
      const c = mapComment(data as CommentRow);
      if (replyTo) setDbReplies((m) => ({ ...m, [replyTo.cid]: [...(m[replyTo.cid] ?? []), c] }));
      else setDbTop((m) => ({ ...m, [pid]: [...(m[pid] ?? []), c] }));
      it.noteComment(c.id, pid);
      resetComposer();
      return;
    }

    // Demo / not configured → optimistic local comment.
    const base: Comment = {
      id: `u${commentSeq}`,
      initials: auth.profile?.initials ?? 'TÚ',
      color: auth.profile?.avatar_color ?? '#7B61FF',
      name: auth.profile?.display_name ?? L('Tú', 'You'),
      hoodEs: 'Bellaire',
      timeEs: 'ahora',
      timeEn: 'now',
      likes: 0,
      es: txt,
      en: txt,
      biz: commentBiz ? { name: commentBiz, rating: '4.9' } : undefined,
    };
    setCommentSeq((n) => n + 1);
    if (replyTo) {
      setUserReplies((m) => ({ ...m, [replyTo.cid]: [...(m[replyTo.cid] ?? []), base] }));
    } else {
      setUserComments((m) => ({ ...m, [pid]: [...(m[pid] ?? []), base] }));
    }
    resetComposer();
  };

  const toggleCommentLike = (c: Comment) => {
    if (!it.gate()) return;
    const liked = !!commentLikes[c.id];
    const base = commentLikeCount[c.id] ?? c.likes;
    setCommentLikes((m) => ({ ...m, [c.id]: !liked }));
    setCommentLikeCount((m) => ({ ...m, [c.id]: Math.max(0, base + (liked ? -1 : 1)) }));
    if (supabase && auth.user && isUuid(c.id)) {
      supabase.rpc('toggle_comment_like', { p_comment: c.id }).then(({ data, error }) => {
        if (!error && data && (data as { liked: boolean; count: number }[])[0]) {
          const d = (data as { liked: boolean; count: number }[])[0];
          setCommentLikes((m) => ({ ...m, [c.id]: d.liked }));
          setCommentLikeCount((m) => ({ ...m, [c.id]: d.count }));
        }
      });
    }
  };

  const cbq = commentBizQuery.trim().toLowerCase();
  const commentBizResults = BUSINESSES.filter((b) => !cbq || b.name.toLowerCase().includes(cbq)).slice(0, 6);

  const commentRow = (c: Comment, isReply = false) => {
    const liked = !!commentLikes[c.id];
    const likes = commentLikeCount[c.id] ?? c.likes;
    return (
      <div key={c.id} className={`flex items-start gap-[9px] ${isReply ? 'ml-10' : ''}`}>
        <Avatar initials={c.initials} color={c.color} size={isReply ? 26 : 30} />
        <div className="min-w-0 flex-1">
          <div className="rounded-[13px] bg-[#F5F3FB] px-3 py-[9px]">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[12px] font-extrabold text-ink">{c.name}</span>
              <span className="text-[10.5px] font-semibold text-muted-2">
                {c.hoodEs ? `${c.hoodEs} · ` : ''}
                {L(c.timeEs, c.timeEn)}
              </span>
            </div>
            {(c.es || c.en) && <div className="mt-0.5 text-[12.5px] font-medium leading-[1.45] text-ink-body">{L(c.es, c.en)}</div>}
            {c.biz && (
              <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-[9px] bg-green-bg px-2 py-1 text-[11px] font-extrabold text-green-dark">
                <Store size={12} strokeWidth={2.4} />
                {c.biz.name} · ★ {c.biz.rating}
              </div>
            )}
          </div>
          <div className="mt-1 flex items-center gap-3.5 px-1">
            <button
              onClick={() => toggleCommentLike(c)}
              className={`cursor-pointer text-[11.5px] font-extrabold ${liked ? 'text-pink' : 'text-muted'}`}
            >
              ♥ {likes}
            </button>
            {!isReply && (
              <button
                onClick={() => setReplyTo({ cid: c.id, name: c.name })}
                className="cursor-pointer text-[11.5px] font-extrabold text-muted"
              >
                {L('Responder', 'Reply')}
              </button>
            )}
          </div>
          {!isReply && repliesFor(c.id).length > 0 && (
            <div className="mt-2 flex flex-col gap-2">{repliesFor(c.id).map((r) => commentRow(r, true))}</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="grid items-start gap-[22px] lg:grid-cols-[218px_1fr_264px] md:grid-cols-[1fr_252px]">
      {/* left rail — barrios (desktop only) */}
      <aside className="sticky top-[130px] hidden lg:block">
        <Card className="p-[17px]">
          <div className="mb-[11px] text-[13.5px] font-extrabold text-ink">{L('Barrios', 'Neighborhoods')}</div>
          <div className="flex flex-col gap-0.5">
            {HOODS.map(([k, label, count]) => {
              const [es, en = es] = label.split('|');
              return (
                <button
                  key={k}
                  onClick={() => setHood(k)}
                  className={`flex w-full cursor-pointer items-center justify-between rounded-[9px] px-2.5 py-2 text-left text-[12.5px] ${
                    hood === k ? 'bg-lilac-3 font-extrabold text-ink' : 'font-bold text-ink-soft'
                  }`}
                >
                  <span>{L(es, en)}</span>
                  <span className="text-[11px] font-bold text-muted-faint">{count}</span>
                </button>
              );
            })}
          </div>
        </Card>
      </aside>

      {/* feed */}
      <div className="min-w-0">
        <SearchChip count={posts.length} className="mb-3.5" />

        {/* composer */}
        <Card className="mb-4 p-[15px]">
          <div className="flex items-center gap-[11px]">
            <YouAvatar size={42} />
            <button
              onClick={() => app.openPub('post')}
              className="min-w-0 flex-1 cursor-pointer rounded-field bg-app px-3.5 py-3 text-left text-[13.5px] font-medium text-muted hover:bg-[#ECE9F6]"
            >
              {L('¿Qué pasa en tu barrio?', "What's up in your hood?")}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-[7px] border-t border-hair pt-3">
            {(
              [
                { label: L('Pregunta', 'Ask'), color: '#6D4DF6', bg: '#EFEBFF' },
                { label: L('Recomienda', 'Recommend'), color: '#1F8A4C', bg: '#E3F5EA' },
                { label: L('Evento', 'Event'), color: '#2F6FED', bg: '#E5EFFB' },
              ] as const
            ).map((c) => (
              <button
                key={c.label}
                onClick={() => app.openPub('post')}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-[9px] px-3 py-[7px] text-[11.5px] font-extrabold"
                style={{ background: c.bg, color: c.color }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.color }} />
                {c.label}
              </button>
            ))}
          </div>
        </Card>

        {/* Live alert: new posts from neighbors, buffered so the feed never jumps */}
        {pending.length > 0 && (
          <div className="pointer-events-none sticky top-[104px] z-20 -mt-1 mb-3.5 flex justify-center md:top-[120px]">
            <button
              onClick={showNewPosts}
              className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-[13px] font-extrabold text-white shadow-pop transition active:scale-95"
            >
              <span className="h-2 w-2 flex-none rounded-full bg-white" />
              {pending.length}{' '}
              {L(
                pending.length === 1 ? 'publicación nueva' : 'publicaciones nuevas',
                pending.length === 1 ? 'new post' : 'new posts',
              )}{' '}
              · {L('Ver', 'Show')}
            </button>
          </div>
        )}

        {posts.length === 0 ? (
          app.search ? (
            <EmptyState title={L('Sin resultados para tu búsqueda', 'No results for your search')} />
          ) : (
            <EmptyState
              title={L(`Todavía no hay publicaciones en ${app.cityShort}`, `No posts in ${app.cityShort} yet`)}
              sub={L('Sé el primero en compartir algo con tu barrio.', 'Be the first to share something with your neighborhood.')}
            />
          )
        ) : (
          <div className="flex flex-col gap-3.5">
            {posts.map((p) => (
              <PostCard key={p.id} post={p} commentCount={commentCount(p.id)} onOpenThread={() => setThreadPostId(p.id)} />
            ))}
          </div>
        )}
      </div>

      {/* right rail — trending + neighbors (tablet & desktop) */}
      <aside className="sticky top-[130px] hidden flex-col gap-4 md:flex">
        <Card className="p-[17px]">
          <div className="mb-3 text-[13.5px] font-extrabold text-ink">{L('Tendencias', 'Trending')}</div>
          <div className="flex flex-col gap-3">
            {TRENDING.map((x) => (
              <div key={x.tag} className="cursor-pointer">
                <div className="text-[13px] font-extrabold text-primary">{x.tag}</div>
                <div className="mt-px text-[11px] font-semibold text-muted-2">
                  {x.posts} {L('publicaciones', 'posts')}
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-[17px]">
          <div className="mb-3 text-[13.5px] font-extrabold text-ink">{L('Vecinos sugeridos', 'Suggested neighbors')}</div>
          <div className="flex flex-col gap-3">
            {NEIGHBORS.map((n, i) => {
              const on = !!app.followed[i];
              return (
                <div key={n.name} className="flex items-center gap-2.5">
                  <Avatar initials={n.initials} color={n.color} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-extrabold text-ink">{n.name}</div>
                    <div className="text-[10.5px] font-semibold text-muted-2">{n.hood}</div>
                  </div>
                  <button
                    onClick={() => app.toggleFollowed(i)}
                    className={`flex-none cursor-pointer rounded-full px-3 py-1.5 text-[11px] font-extrabold ${
                      on ? 'bg-lilac text-primary-dark' : 'bg-primary text-white'
                    }`}
                  >
                    {on ? L('Siguiendo', 'Following') : L('Seguir', 'Follow')}
                  </button>
                </div>
              );
            })}
          </div>
        </Card>
      </aside>

      {/* comment thread */}
      <Overlay open={!!threadPost} onClose={closeThread} width={520} fullHeightSheet>
        {threadPost && (
          <div className="flex h-full flex-col">
            <div className="flex items-center gap-2 pb-3">
              <div className="text-[16px] font-extrabold text-ink">{L('Comentarios', 'Comments')}</div>
              <span className="text-[12px] font-bold text-muted">
                {commentCount(threadPost.id)}{' '}
                {commentCount(threadPost.id) === 1 ? L('comentario', 'comment') : L('comentarios', 'comments')}
              </span>
              <button
                onClick={closeThread}
                className="ml-auto flex h-8 w-8 flex-none cursor-pointer items-center justify-center rounded-full bg-lilac-2 text-ink-2"
              >
                <X size={15} strokeWidth={2.8} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <PostCard post={threadPost} commentCount={commentCount(threadPost.id)} />
              <div className="mt-4 flex flex-col gap-3 pb-4">
                {topComments(threadPost.id).length === 0 ? (
                  <EmptyState
                    title={L('Aún no hay comentarios', 'No comments yet')}
                    sub={L('Sé el primero en responder a tu vecino.', 'Be the first to reply to your neighbor.')}
                  />
                ) : (
                  topComments(threadPost.id).map((c) => commentRow(c))
                )}
              </div>
            </div>
            <div className="border-t border-hair pt-3">
              {replyTo && (
                <div className="mb-2 flex items-center justify-between rounded-[9px] bg-lilac-3 px-3 py-1.5 text-[11.5px] font-extrabold text-primary-dark">
                  {L('Respondiendo a ', 'Replying to ')}
                  {replyTo.name}
                  <button onClick={() => setReplyTo(null)} className="cursor-pointer">
                    <X size={12} strokeWidth={3} />
                  </button>
                </div>
              )}
              {commentBiz && (
                <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-green-bg px-3 py-1.5 text-[11.5px] font-extrabold text-green-dark">
                  <Store size={12} strokeWidth={2.4} />
                  {commentBiz}
                  <button onClick={() => setCommentBiz(null)} className="cursor-pointer">
                    <X size={11} strokeWidth={3} />
                  </button>
                </div>
              )}
              {commentBizOpen && (
                <div className="mb-2 rounded-2xl border border-hair bg-white p-2 shadow-card">
                  <input
                    value={commentBizQuery}
                    onChange={(e) => setCommentBizQuery(e.target.value)}
                    placeholder={L('Busca un negocio…', 'Search a business…')}
                    className="mb-1 w-full rounded-[10px] bg-app px-3 py-2 text-[12.5px] font-medium outline-none placeholder:text-muted"
                  />
                  {commentBizResults.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => {
                        setCommentBiz(commentBiz === b.name ? null : b.name);
                        setCommentBizOpen(false);
                        setCommentBizQuery('');
                      }}
                      className="flex w-full cursor-pointer items-center gap-2.5 rounded-[10px] p-2 text-left hover:bg-app"
                    >
                      <span className="h-7 w-7 flex-none rounded-lg" style={{ background: bizTile(b) }} />
                      <span className="text-[12.5px] font-extrabold text-ink">{b.name}</span>
                      <span className="ml-auto text-[11px] font-bold text-muted">★ {b.rating}</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2">
                <YouAvatar size={36} />
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendComment()}
                  placeholder={replyTo ? L('Escribe tu respuesta…', 'Write your reply…') : L('Escribe un comentario…', 'Write a comment…')}
                  className="min-w-0 flex-1 rounded-full bg-app px-4 py-2.5 text-[13px] font-medium text-ink outline-none placeholder:text-muted"
                />
                <button
                  onClick={() => setCommentBizOpen(!commentBizOpen)}
                  className={`flex h-[38px] w-[38px] flex-none cursor-pointer items-center justify-center rounded-full ${
                    commentBizOpen || commentBiz ? 'bg-green text-white' : 'bg-lilac-2 text-muted'
                  }`}
                  aria-label={L('Recomendar un negocio', 'Recommend a business')}
                >
                  <Store size={17} strokeWidth={2.2} />
                </button>
                <button
                  onClick={sendComment}
                  disabled={!canComment || sending}
                  className={`flex h-[38px] w-[38px] flex-none items-center justify-center rounded-full text-white ${
                    canComment && !sending ? 'cursor-pointer bg-primary' : 'cursor-not-allowed bg-[#E3DEF2]'
                  }`}
                  aria-label={L('Enviar', 'Send')}
                >
                  <Send size={15} strokeWidth={2.4} />
                </button>
              </div>
            </div>
          </div>
        )}
      </Overlay>
    </div>
  );
}
