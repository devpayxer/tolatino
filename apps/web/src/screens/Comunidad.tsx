'use client';

// Comunidad (`/comunidad`) — Nextdoor-style home of the app (Handoff v2).
// Desktop: barrios rail / feed / tendencias+vecinos. Mobile: single column.

import { useEffect, useMemo, useRef, useState } from 'react';
import { IconSend as Send, IconBuildingStore as Store, IconX as X } from '@tabler/icons-react';
import { ReportButton } from '@/components/ReportButton';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { NeighborSheet } from '@/components/NeighborSheet';
import { useLang } from '@/lib/i18n';
import { useApp } from '@/lib/state';
import { useAuth } from '@/lib/auth';
import { useAvatar } from '@/lib/avatars';
import { useInteractions } from '@/lib/interactions';
import { useFollows } from '@/lib/follows';
import { useUrlDetail } from '@/lib/urlView';
import { supabase } from '@/lib/supabase';
import { Avatar, Card, EmptyState, Overlay, SkeletonList, YouAvatar } from '@/components/ui';
import { SearchChip } from '@/components/AppHeader';
import { PostCard } from '@/components/PostCard';
import { ProfileNav } from '@/components/ProfileNav';
import { VecinosCerca } from '@/components/VecinosCerca';
import { useNeighborsNearby } from '@/lib/vecinos';
import { bizTile, hoodsForCity, type Comment, type Post } from '@/data/fixtures';
import { useLiveData } from '@/lib/live';
import { COMMUNITY_RADIUS_M, mapPost, relTime, type PostRow } from '@/lib/posts';

// Real (Supabase) posts/comments carry a UUID id; fixtures do not.
const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(id);

type CommentRow = {
  id: string;
  parent_id: string | null;
  author_id: string | null;
  author_name: string;
  author_initials: string;
  author_color: string;
  body: string;
  biz_name: string | null;
  biz_slug: string | null;
  biz_rating: string | null;
  like_count: number;
  created_at: string;
};

/** Avatar de un comentario: la foto propia sale del perfil ya cargado; la de
 *  los demás, del lote de `useAvatar`. Es un componente y no una función suelta
 *  porque usa hooks, y estos van dentro de una lista. */
function CommentAvatar({ c, size }: { c: Comment; size: number }) {
  const auth = useAuth();
  const own = !!c.authorId && c.authorId === auth.user?.id;
  const other = useAvatar(own ? null : c.authorId);
  return <Avatar initials={c.initials} color={c.color} src={own ? auth.profile?.avatar_url : other} size={size} />;
}

function mapComment(r: CommentRow): Comment {
  const [tEs, tEn] = relTime(r.created_at);
  return {
    id: r.id,
    initials: r.author_initials,
    color: r.author_color,
    name: r.author_name,
    authorId: r.author_id ?? undefined,
    timeEs: tEs,
    timeEn: tEn,
    likes: r.like_count,
    es: r.body,
    en: r.body,
    biz: r.biz_name ? { name: r.biz_name, slug: r.biz_slug ?? undefined, rating: r.biz_rating ?? '' } : undefined,
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
  const follows = useFollows();
  const { posts: POSTS, businesses: BUSINESSES, loading: liveLoading, failed: liveFailed } = useLiveData();
  const [hood, setHood] = useState('all');

  // thread state — the open post thread lives in the URL (?post=<id>) so a refresh
  // reopens it, the link is shareable, and Back closes it.
  const { value: threadPostId, open: openThreadUrl, close: closeThreadUrl } = useUrlDetail('post');
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState<{ cid: string; name: string } | null>(null);
  const [userComments, setUserComments] = useState<Record<string, Comment[]>>({});
  const [userReplies, setUserReplies] = useState<Record<string, Comment[]>>({});
  // DB-backed comments (loaded when a real post's thread opens).
  const [dbTop, setDbTop] = useState<Record<string, Comment[]>>({});
  const [dbReplies, setDbReplies] = useState<Record<string, Comment[]>>({});
  const [commentLikes, setCommentLikes] = useState<Record<string, boolean>>({});
  const [commentLikeCount, setCommentLikeCount] = useState<Record<string, number>>({});
  const [commentBiz, setCommentBiz] = useState<{ slug: string; name: string } | null>(null);
  const [commentBizOpen, setCommentBizOpen] = useState(false);
  const [commentBizQuery, setCommentBizQuery] = useState('');
  const [commentSeq, setCommentSeq] = useState(0);
  const [sending, setSending] = useState(false);
  const [delComment, setDelComment] = useState<{ id: string; parent: boolean } | null>(null);
  const [commentErr, setCommentErr] = useState<string | null>(null);
  // El perfil de vecino vive en la URL (?vecino=<id>) igual que el hilo: así el
  // botón Atrás del teléfono lo cierra, un refresco lo reabre y el enlace se
  // puede compartir. Antes era estado local y Atrás te sacaba de Comunidad
  // entera. (2ª auditoría de Comunidad.)
  const { value: vecino, open: setVecino, close: cerrarVecino } = useUrlDetail('vecino');
  // La publicación abierta por enlace (notificación, Compartir, refresco) puede
  // NO estar en la página del feed que hay cargada — es el caso normal: el aviso
  // llega horas después. Antes el hilo se buscaba solo en la lista en memoria,
  // así que el enlace no abría nada. (2ª auditoría, 2026-08-03.)
  const [linkedPost, setLinkedPost] = useState<Post | null>(null);
  const [linkedMissing, setLinkedMissing] = useState(false);

  // Paginación por cursor: `older` son las páginas ya traídas, `noMore` marca
  // que la base ya no tiene nada más viejo dentro del radio.
  const [older, setOlder] = useState<Post[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [noMore, setNoMore] = useState(false);
  // Búsqueda REAL contra la base (`search_posts`), no un filtro de lo cargado.
  const [found, setFound] = useState<Post[] | null>(null);
  const [searching, setSearching] = useState(false);

  // New posts from other users arriving live: buffered in `pending` (shown as a
  // pill) until the user taps to reveal them — so the feed never jumps while
  // they're scrolling. `revealed` holds the ones they chose to show.
  const [pending, setPending] = useState<Post[]>([]);
  const [revealed, setRevealed] = useState<Post[]>([]);
  // Posts deleted by their author while we're viewing — removed from the feed
  // live (via the realtime DELETE event) so nobody has to refresh.
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  // Posts edited by their author while we're viewing — the fresh version
  // overrides the one in the feed (via the realtime UPDATE event).
  const [editedPosts, setEditedPosts] = useState<Record<string, Post>>({});
  const feedIdsRef = useRef<Set<string>>(new Set());

  // The app header is `sticky top-0` and its height differs between mobile
  // (stacked brand + search + category rows ≈ 155px) and desktop (≈ 130px), so
  // we measure it live and offset the "new posts" pill by it — that keeps the
  // pill floating just under the header on every screen, no magic numbers.
  const [headerH, setHeaderH] = useState(0);
  useEffect(() => {
    const el = document.querySelector('header');
    if (!el) return;
    const update = () => setHeaderH((el as HTMLElement).offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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
    () =>
      dedupeById([...revealed, ...app.newPosts, ...POSTS, ...older])
        .filter((p) => !removedIds.has(p.id))
        .map((p) => editedPosts[p.id] ?? p),
    [revealed, app.newPosts, POSTS, older, removedIds, editedPosts],
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
    setRemovedIds(new Set());
    setEditedPosts({});
    setHood('all'); // barrios differ per city — reset the filter
    setOlder([]);
    setNoMore(false);
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
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts' }, (payload) => {
        // DELETE payload carries only the primary key (id) — enough to drop it.
        const id = (payload.old as { id?: string })?.id;
        if (!id) return;
        setRemovedIds((s) => (s.has(String(id)) ? s : new Set(s).add(String(id))));
        setPending((list) => list.filter((p) => p.id !== String(id)));
        setRevealed((list) => list.filter((p) => p.id !== String(id)));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts' }, (payload) => {
        // Author edited a post → overwrite the visible copy live. UPDATE always
        // carries the full new row. Only for posts we're already showing.
        const r = payload.new as PostRow;
        if (!r?.id || !feedIdsRef.current.has(String(r.id))) return;
        const post = mapPost(r);
        setEditedPosts((m) => ({ ...m, [post.id]: post }));
      })
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [cLat, cLng, auth.user]);

  /** Trae la siguiente página, más vieja que la última que ya tenemos. */
  const loadMore = async () => {
    if (!supabase || loadingMore || noMore) return;
    // El cursor NO puede salir de una publicación FIJADA. `posts_near` sube las
    // fijadas al principio de la primera página aunque sean de hace un año; si
    // se tomaba «la más vieja que tengo» salía esa, y la siguiente página pedía
    // «más viejas que hace un año» — o sea, se saltaba todo lo de en medio. El
    // fundador fija una publicación vieja y el feed se queda sin la mitad.
    // (2ª auditoría de Comunidad.)
    const PAGINA = 30;
    const cronologicas = allPosts.filter((p) => p.createdAt && !p.pinned);
    const last = [...cronologicas].sort((a, b) => (a.createdAt! < b.createdAt! ? 1 : -1)).pop();
    if (!last?.createdAt) return;
    setLoadingMore(true);
    const { data, error } = await supabase.rpc('posts_near', {
      user_lat: cLat, user_lng: cLng, radius_m: COMMUNITY_RADIUS_M, max_results: PAGINA,
      before_created_at: last.createdAt, before_id: last.id,
    });
    setLoadingMore(false);
    if (error || !Array.isArray(data)) return;
    const rows = (data as PostRow[]).map(mapPost);
    if (rows.length === 0) { setNoMore(true); return; }
    // Una página incompleta significa que ya no hay más detrás: así el botón
    // desaparece en vez de pedir una página vacía de más.
    if (rows.length < PAGINA) setNoMore(true);
    setOlder((prev) => dedupeById([...prev, ...rows]));
  };

  // Buscar en TODA la comunidad. El freno evita una consulta por tecla.
  useEffect(() => {
    const q = app.search.trim();
    if (!supabase || q.length < 2) { setFound(null); setSearching(false); return; }
    setSearching(true);
    const t = window.setTimeout(() => {
      supabase!.rpc('search_posts', { in_q: q, user_lat: cLat, user_lng: cLng, radius_m: COMMUNITY_RADIUS_M, max_results: 50 })
        .then(({ data, error }) => setFound(error || !Array.isArray(data) ? [] : (data as PostRow[]).map(mapPost)))
        .then(() => setSearching(false), () => setSearching(false));
    }, 260);
    return () => window.clearTimeout(t);
  }, [app.search, cLat, cLng]);

  // Si el id de la URL no está entre lo cargado, se pide a la base. `post_by_id`
  // es SECURITY INVOKER, así que respeta la moderación y el bloqueo: si no se
  // puede ver, devuelve vacío y se dice claramente en vez de dejar el hueco.
  useEffect(() => {
    const pid = threadPostId;
    if (!pid || !supabase || !isUuid(pid)) { setLinkedPost(null); setLinkedMissing(false); return; }
    // Solo se mira `allPosts`: `viewFeed` (Guardados/Siguiendo) se declara más
    // abajo, y si la publicación estuviera ahí lo único que pasa es una consulta
    // de más, que no molesta.
    if (allPosts.some((p) => p.id === pid)) { setLinkedMissing(false); return; }
    let cancelado = false;
    setLinkedMissing(false);
    void supabase.rpc('post_by_id', { in_id: pid }).then(({ data, error }) => {
      if (cancelado) return;
      const filas = !error && Array.isArray(data) ? (data as PostRow[]) : [];
      if (filas.length) setLinkedPost(mapPost(filas[0]));
      else { setLinkedPost(null); setLinkedMissing(true); }
    });
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadPostId, allPosts.length]);

  const showNewPosts = () => {
    setRevealed((r) => dedupeById([...pending, ...r]));
    setPending([]);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Feed view (profile nav): 'home' = nearby (live); 'saved' / 'following' fetch
  // their own list. Realtime applies to the home feed only.
  const homeMode = app.feedView === 'home';
  const [viewFeed, setViewFeed] = useState<Post[]>([]);
  const [viewLoading, setViewLoading] = useState(false);
  // «No pudimos cargarlo» no es lo mismo que «no tienes nada». Sin esto, una
  // consulta caída le decía al usuario que no había guardado nada — y lo que
  // tenía guardado seguía ahí. (2ª auditoría de Comunidad.)
  const [viewFailed, setViewFailed] = useState(false);
  useEffect(() => {
    if (homeMode) return;
    const sb = supabase;
    const uid = auth.user?.id;
    if (!sb || !uid) {
      setViewFeed([]);
      return;
    }
    let cancelled = false;
    setViewLoading(true);
    setViewFailed(false);
    (async () => {
      let rows: PostRow[] = [];
      let fallo = false;
      if (app.feedView === 'saved') {
        const s = await sb.from('saved_posts').select('post_id').eq('user_id', uid);
        if (s.error) fallo = true;
        const ids = ((s.data as { post_id: string }[]) ?? []).map((r) => r.post_id);
        if (!fallo && ids.length) {
          const { data, error } = await sb.from('posts').select('*').in('id', ids).order('created_at', { ascending: false });
          if (error) fallo = true;
          rows = (data as PostRow[]) ?? [];
        }
      } else if (app.feedView === 'following') {
        const ids = [...follows.following];
        if (ids.length) {
          const { data, error } = await sb.from('posts').select('*').in('author_id', ids).order('created_at', { ascending: false }).limit(50);
          if (error) fallo = true;
          rows = (data as PostRow[]) ?? [];
        }
      }
      if (!cancelled) {
        setViewFeed(rows.map(mapPost));
        setViewFailed(fallo);
        setViewLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [app.feedView, homeMode, auth.user, follows.following]);
  // Barrios for the current city: the curated list, plus any hood that actually
  // appears in the live feed (so real data always shows), deduped in order.
  const hoodOptions = useMemo(() => {
    const curated = hoodsForCity(app.cityShort);
    const fromData = allPosts.map((p) => p.hoodEs).filter(Boolean);
    return [...new Set([...curated, ...fromData])];
  }, [app.cityShort, allPosts]);
  const hoodCount = (name: string) => allPosts.filter((p) => p.hoodEs === name).length;

  // Columna derecha (escritorio ≥1280). Solo con sesión: el RPC no devuelve nada
  // a un invitado, así que ni se pregunta. Mismo radio que el feed, para no
  // sugerir a alguien a quien el usuario nunca vería publicar.
  const { vecinos, loading: vecinosCargando } = useNeighborsNearby(cLat, cLng, COMMUNITY_RADIUS_M, !!auth.user);

  const baseFeed = homeMode ? allPosts : viewFeed;
  const byHood = homeMode && hood !== 'all' ? baseFeed.filter((p) => p.hoodEs === hood) : baseFeed;
  // Con búsqueda activa manda lo que devuelve la base; sin ella, el feed local.
  // Mientras la base responde se sigue enseñando el filtro sobre lo cargado, para
  // que la lista no parpadee a vacío entre tecla y respuesta.
  const sl = app.search.trim().toLowerCase();
  const localMatch = sl
    ? byHood.filter((p) => `${p.es} ${p.en} ${p.name} ${p.business ?? ''}`.toLowerCase().includes(sl))
    : byHood;
  // Lo que devuelve la base NO venía filtrado por barrio: con una búsqueda
  // activa la pastilla del barrio se quedaba encendida y no filtraba nada, así
  // que el usuario leía «Gulfton» y veía media ciudad. (2ª auditoría.)
  const fuente = sl && found !== null ? found : localMatch;
  const posts = homeMode && hood !== 'all' ? fuente.filter((p) => p.hoodEs === hood) : fuente;

  const topComments = (pid: string) => [...(dbTop[pid] ?? []), ...(userComments[pid] ?? [])]; // solo comentarios reales
  const repliesFor = (cid: string) => [...(dbReplies[cid] ?? []), ...(userReplies[cid] ?? [])]; // solo respuestas reales
  // Feed count: real posts use the DB total (loaded for the whole visible feed
  // and kept live via bumpComment); fixtures count their local comments. The
  // Interactions provider only tracks the HOME feed, so for Saved/Following posts
  // (not in that set) fall back to the loaded thread count instead of showing 0.
  const commentCount = (pid: string) => {
    if (!isUuid(pid)) return topComments(pid).reduce((n, c) => n + 1 + repliesFor(c.id).length, 0);
    const loaded = topComments(pid).reduce((n, c) => n + 1 + repliesFor(c.id).length, 0);
    return it.commentCount[pid] ?? loaded;
  };

  const threadPost = [...allPosts, ...viewFeed].find((p) => p.id === threadPostId) ?? linkedPost;
  const canComment = commentText.trim().length > 0 || !!commentBiz;

  const closeThread = () => {
    closeThreadUrl();
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
    setCommentErr(null);
  };

  const sendComment = async () => {
    const txt = commentText.trim();
    const pid = threadPostId;
    if ((!txt && !commentBiz) || !pid || sending) return;
    // Guests must sign in before commenting on a real feed.
    if (!it.gate()) return;

    // Con base de datos configurada NUNCA se cae al camino local: un comentario
    // que se pinta y no se guarda es una mentira (regla #8), y encima se firmaba
    // con un barrio inventado. Si falta algo, se dice. (2ª auditoría.)
    if (supabase) {
      if (!isUuid(pid)) {
        setCommentErr(L('Esta publicación de ejemplo no acepta comentarios.', "This sample post doesn't take comments."));
        return;
      }
      if (!auth.user || !auth.profile) {
        setCommentErr(L('Tu perfil todavía se está cargando. Inténtalo en un momento.', 'Your profile is still loading. Try again in a moment.'));
        return;
      }
      setSending(true);
      const row = {
        post_id: pid,
        parent_id: replyTo?.cid ?? null,
        author_id: auth.user.id,
        author_name: auth.profile.display_name,
        author_initials: auth.profile.initials,
        author_color: auth.profile.avatar_color,
        body: txt,
        biz_slug: commentBiz?.slug ?? null, // el servidor resuelve nombre e id (0135)
      };
      const { data, error } = await supabase.from('post_comments').insert(row).select().single();
      setSending(false);
      // Antes: `if (error) return` — el texto se quedaba en la caja, sin aviso ni
      // pista. Y falla en casos que ocurren de verdad: cuenta suspendida, límite
      // de 30 por hora, publicación ocultada por moderación mientras escribías.
      if (error || !data) {
        setCommentErr(
          /suspend/i.test(error?.message ?? '') ? L('Tu cuenta está suspendida temporalmente.', 'Your account is temporarily suspended.')
          : /Demasiadas/i.test(error?.message ?? '') ? L('Demasiadas acciones seguidas. Espera un momento.', 'Too many actions in a row. Wait a moment.')
          : /no acepta comentarios|ya no está disponible|ya no existe/i.test(error?.message ?? '') ? (error!.message)
          : L('No pudimos publicar tu comentario. Inténtalo de nuevo.', "We couldn't post your comment. Try again."),
        );
        return;
      }
      setCommentErr(null);
      const c = mapComment(data as CommentRow);
      if (replyTo) setDbReplies((m) => ({ ...m, [replyTo.cid]: [...(m[replyTo.cid] ?? []), c] }));
      else setDbTop((m) => ({ ...m, [pid]: [...(m[pid] ?? []), c] }));
      it.noteComment(c.id, pid);
      resetComposer();
      return;
    }

    // Solo el prototipo SIN base de datos llega aquí. Sin barrio: antes se
    // firmaba «Bellaire», un barrio de Houston elegido a dedo que aparecía
    // aunque el usuario estuviera en otra ciudad.
    const base: Comment = {
      id: `u${commentSeq}`,
      initials: auth.profile?.initials ?? 'TÚ',
      color: auth.profile?.avatar_color ?? '#7B61FF',
      name: auth.profile?.display_name ?? L('Tú', 'You'),
      timeEs: 'ahora',
      timeEn: 'now',
      likes: 0,
      es: txt,
      en: txt,
      biz: commentBiz ? { name: commentBiz.name, slug: commentBiz.slug } : undefined,
    };
    setCommentSeq((n) => n + 1);
    if (replyTo) {
      setUserReplies((m) => ({ ...m, [replyTo.cid]: [...(m[replyTo.cid] ?? []), base] }));
    } else {
      setUserComments((m) => ({ ...m, [pid]: [...(m[pid] ?? []), base] }));
    }
    resetComposer();
  };

  /** Borra el propio comentario (y sus respuestas: la clave foránea es en
   *  cascada). Se quita de la lista abierta al momento, sin recargar el hilo. */
  const doDeleteComment = async () => {
    const target = delComment;
    if (!target || !supabase) return;
    setDelComment(null);
    const { error } = await supabase.from('post_comments').delete().eq('id', target.id);
    if (error) return;
    const quitar = (list: Comment[] = []) => list.filter((x) => x.id !== target.id);
    setDbTop((m) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, quitar(v)])));
    setDbReplies((m) => {
      const next = Object.fromEntries(Object.entries(m).map(([k, v]) => [k, quitar(v)]));
      delete next[target.id]; // sus respuestas se fueron con él
      return next;
    });
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
        {c.authorId ? (
          <button onClick={() => setVecino(c.authorId!)} className="flex-none cursor-pointer" aria-label={c.name}>
            <CommentAvatar c={c} size={isReply ? 26 : 30} />
          </button>
        ) : (
          <CommentAvatar c={c} size={isReply ? 26 : 30} />
        )}
        <div className="min-w-0 flex-1">
          <div className="rounded-[13px] bg-[#F5F3FB] px-3 py-[9px]">
            <div className="flex items-baseline justify-between gap-2">
              {c.authorId ? (
                <button onClick={() => setVecino(c.authorId!)} className="cursor-pointer text-[12px] font-extrabold text-ink hover:underline">{c.name}</button>
              ) : (
                <span className="text-[12px] font-extrabold text-ink">{c.name}</span>
              )}
              <span className="text-[10.5px] font-semibold text-muted-2">
                {c.hoodEs ? `${c.hoodEs} · ` : ''}
                {L(c.timeEs, c.timeEn)}
              </span>
            </div>
            {(c.es || c.en) && <div className="mt-0.5 text-[12.5px] font-medium leading-[1.45] text-ink-body">{L(c.es, c.en)}</div>}
            {c.biz && (() => {
              const cls = 'mt-1.5 inline-flex max-w-full items-center gap-1.5 rounded-[9px] bg-green-bg px-2 py-1 text-[11px] font-extrabold text-green-dark';
              const inner = <><Store size={12} stroke={2.4} className="flex-none" /><span className="truncate">{c.biz!.name}{c.biz!.rating ? ` · ★ ${c.biz!.rating}` : ''}</span></>;
              // Con slug lleva a la ficha; los comentarios viejos (etiquetados
              // solo por nombre) se pintan igual pero sin enlace.
              return c.biz.slug
                ? <a href={`/negocios/?b=${encodeURIComponent(c.biz.slug)}`} className={`${cls} cursor-pointer hover:bg-green-bg2`}>{inner}</a>
                : <div className={cls}>{inner}</div>;
            })()}
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
            {/* Borrar el propio comentario. La política de RLS ya lo permitía
                (`delete own comment`); simplemente no había botón, así que una
                errata se quedaba publicada para siempre. */}
            {c.authorId && c.authorId === auth.user?.id && isUuid(c.id) && (
              <button
                onClick={() => setDelComment({ id: c.id, parent: isReply })}
                className="cursor-pointer text-[11.5px] font-extrabold text-muted hover:text-pink-dark"
              >
                {L('Borrar', 'Delete')}
              </button>
            )}
            {c.authorId !== auth.user?.id && <ReportButton type="comment" id={c.id} className="ml-auto" />}
          </div>
          {!isReply && repliesFor(c.id).length > 0 && (
            <div className="mt-2 flex flex-col gap-2">{repliesFor(c.id).map((r) => commentRow(r, true))}</div>
          )}
        </div>
      </div>
    );
  };

  return (
    // Escritorio: el feed va TOPADO, no a todo lo ancho. Con `1fr` la foto de
    // una publicación medía 842px en un portátil de 1512 — un 40% más ancha que
    // Nextdoor, Facebook o X, que rondan los 600, y a esa medida la línea de
    // texto cansa y la foto se ve desproporcionada. En ≥1280 la tercera columna
    // del Handoff recupera ese espacio (feed ≈558); entre 1024 y 1279 no cabría
    // (dejaría el feed en ~400), así que ahí se topa con `max-w` y ya.
    <div className="grid items-start gap-[22px] lg:grid-cols-[218px_minmax(0,1fr)] min-[1180px]:grid-cols-[218px_minmax(0,1fr)_300px]">
      {/* left rail — profile nav + barrios (desktop only) */}
      <aside className="sticky top-[130px] hidden flex-col gap-[18px] lg:flex">
        <ProfileNav />
        {homeMode && (
          <Card className="p-[17px]">
            <div className="mb-[11px] text-[13.5px] font-extrabold text-ink">{L('Barrios', 'Neighborhoods')}</div>
            <div className="flex flex-col gap-0.5">
              {[{ k: 'all', label: L('Todos los barrios', 'All neighborhoods'), n: allPosts.length }, ...hoodOptions.map((h) => ({ k: h, label: h, n: hoodCount(h) }))].map(
                ({ k, label, n }) => (
                  <button
                    key={k}
                    onClick={() => setHood(k)}
                    className={`flex min-h-11 w-full cursor-pointer items-center justify-between rounded-[9px] px-2.5 py-2 text-left text-[12.5px] ${
                      hood === k ? 'bg-lilac-3 font-extrabold text-ink' : 'font-bold text-ink-soft'
                    }`}
                  >
                    <span>{label}</span>
                    {n > 0 && <span className="text-[11px] font-bold text-muted-faint">{n}</span>}
                  </button>
                ),
              )}
            </div>
          </Card>
        )}
      </aside>

      {/* feed */}
      {/* El tope de 620px vale desde tablet: sin él, a 1023px (una columna sola,
          sin rieles) el feed llegaba a 983px de ancho — todavía peor que en
          escritorio. Se centra mientras sobra sitio; a partir de 1280, con la
          columna derecha puesta, la rejilla ya reparte el ancho y el tope estorba. */}
      <div className="mx-auto w-full min-w-0 md:max-w-[620px] min-[1180px]:mx-0 min-[1180px]:max-w-none">
        {/* view title for Saved / Following (Home keeps the search chip) */}
        {homeMode ? (
          <SearchChip count={posts.length} className="mb-3.5" />
        ) : (
          <div className="mb-3.5 flex items-center gap-2">
            <h2 className="text-[17px] font-extrabold text-ink">
              {app.feedView === 'saved' ? L('Guardados', 'Saved') : L('Siguiendo', 'Following')}
            </h2>
            <span className="text-[12.5px] font-bold text-muted">{posts.length}</span>
            <button
              onClick={() => app.setFeedView('home')}
              className="ml-auto cursor-pointer text-[12.5px] font-extrabold text-primary-dark"
            >
              {L('← Inicio', '← Home')}
            </button>
          </div>
        )}

        {/* Barrios en MÓVIL y tablet. El filtro existía solo en el rail de
            escritorio (`lg:flex`), o sea invisible para el 99% del tráfico:
            una función construida que casi nadie podía usar. Aquí va como fila
            de pastillas deslizable, que es el patrón del propio handoff para
            filtros en móvil — no se inventa nada. */}
        {homeMode && hoodOptions.length > 0 && (
          <div className="no-scrollbar -mx-1 -my-1.5 mb-[8px] flex gap-2 overflow-x-auto px-1 py-1.5 lg:hidden">
            {[{ k: 'all', label: L('Todos', 'All'), n: allPosts.length }, ...hoodOptions.map((h) => ({ k: h, label: h, n: hoodCount(h) }))].map(
              ({ k, label, n }) => (
                <button
                  key={k}
                  onClick={() => setHood(k)}
                  aria-pressed={hood === k}
                  className={`tap-y flex-none cursor-pointer whitespace-nowrap rounded-full px-3.5 py-2 text-[12.5px] font-extrabold ${
                    hood === k ? 'bg-primary text-white' : 'bg-lilac-2 text-ink-2'
                  }`}
                >
                  {label}
                  {n > 0 && <span className={`ml-1.5 text-[11px] ${hood === k ? 'text-white/70' : 'text-muted'}`}>{n}</span>}
                </button>
              ),
            )}
          </div>
        )}

        {/* composer */}
        <Card className="mb-4 p-[15px]">
          <div className="flex items-center gap-[11px]">
            {auth.profile
              ? <Avatar initials={auth.profile.initials} color={auth.profile.avatar_color} src={auth.profile.avatar_url} size={42} />
              : <YouAvatar size={42} />}
            <button
              onClick={() => app.openPub('post')}
              className="min-w-0 flex-1 cursor-pointer rounded-field bg-app px-3.5 py-3 text-left text-[13.5px] font-medium text-muted hover:bg-[#ECE9F6]"
            >
              {L('¿Qué pasa en tu barrio?', "What's up in your hood?")}
            </button>
          </div>
          {/* Cada chip abre LO QUE DICE. Antes los tres abrían el mismo
              compositor sin preseleccionar nada, y "Evento" llevaba al de
              publicaciones — que no tiene tipo evento. */}
          <div className="mt-3 flex flex-wrap gap-x-[7px] gap-y-[13px] border-t border-hair pt-3">
            {(
              [
                { label: L('Pregunta', 'Ask'), color: '#6D4DF6', bg: '#EFEBFF', go: () => app.openPub('post', 'ask') },
                { label: L('Recomienda', 'Recommend'), color: '#1F8A4C', bg: '#E3F5EA', go: () => app.openPub('post', 'rec') },
                { label: L('Evento', 'Event'), color: '#2F6FED', bg: '#E5EFFB', go: () => app.openPub('evento') },
              ] as const
            ).map((c) => (
              <button
                key={c.label}
                onClick={c.go}
                className="tap-y inline-flex cursor-pointer items-center gap-1.5 rounded-[9px] px-3 py-[7px] text-[11.5px] font-extrabold"
                style={{ background: c.bg, color: c.color }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.color }} />
                {c.label}
              </button>
            ))}
          </div>
        </Card>

        {/* Live alert: new posts from neighbors, buffered so the feed never jumps.
            `fixed` (not sticky) because mobile Safari drops position:sticky inside
            a CSS grid item — this floats reliably on every device, offset just
            under the measured (variable-height) header. */}
        {homeMode && pending.length > 0 && (
          <div
            className="pointer-events-none fixed inset-x-0 z-20 flex justify-center px-4"
            style={{ top: (headerH || 120) + 8 }}
          >
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

        {homeMode && liveLoading && posts.length === 0 ? (
          <SkeletonList variant="post" count={5} className="flex flex-col gap-3.5" />
        ) : posts.length === 0 ? (
          !homeMode && viewLoading ? (
            <EmptyState title={L('Cargando…', 'Loading…')} />
          ) : viewFailed ? (
            <EmptyState
              title={app.feedView === 'saved'
                ? L('No pudimos cargar tus guardados', "We couldn't load your saved posts")
                : L('No pudimos cargar a quien sigues', "We couldn't load who you follow")}
              sub={L('Revisa tu conexión y desliza hacia abajo para reintentar.', 'Check your connection and pull down to retry.')}
            />
          ) : app.feedView === 'saved' ? (
            <EmptyState
              title={L('No tienes publicaciones guardadas', 'You have no saved posts')}
              sub={L('Toca el marcador en cualquier publicación para guardarla aquí.', 'Tap the bookmark on any post to save it here.')}
            />
          ) : app.feedView === 'following' ? (
            <EmptyState
              title={L('Aún no sigues a nadie', "You're not following anyone yet")}
              sub={L('Sigue a vecinos desde el menú “…” de sus publicaciones.', 'Follow neighbors from the “…” menu on their posts.')}
            />
          ) : app.search ? (
            <EmptyState
              title={hood !== 'all'
                ? L(`Sin resultados en ${hood}`, `No results in ${hood}`)
                : L('Sin resultados para tu búsqueda', 'No results for your search')}
              sub={hood !== 'all' ? L('Prueba en «Todos» para buscar en toda la ciudad.', 'Try “All” to search the whole city.') : undefined}
            />
          ) : hood !== 'all' ? (
            <EmptyState
              title={L(`Todavía no hay publicaciones en ${hood}`, `No posts in ${hood} yet`)}
              sub={L('Sé el primero en compartir algo con tu barrio.', 'Be the first to share something with your neighborhood.')}
            />
          ) : liveFailed ? (
            /* «No se pudo cargar» NO es «tu barrio está vacío». Sin esta rama, la
               red caída invitaba al usuario a ser «el primero en publicar» en un
               barrio que en realidad está lleno. (2ª auditoría, 2026-08-03.) */
            <EmptyState
              title={L('No pudimos cargar tu barrio', "We couldn't load your neighborhood")}
              sub={L('Revisa tu conexión y desliza hacia abajo para reintentar.', 'Check your connection and pull down to retry.')}
            />
          ) : (
            <EmptyState
              title={L(`Todavía no hay publicaciones en ${app.cityShort}`, `No posts in ${app.cityShort} yet`)}
              sub={L('Sé el primero en compartir algo con tu barrio.', 'Be the first to share something with your neighborhood.')}
            />
          )
        ) : (
          <div className="flex flex-col gap-3.5">
            {posts.map((p) => (
              <PostCard key={p.id} post={p} commentCount={commentCount(p.id)} onOpenThread={() => openThreadUrl(p.id)} onOpenAuthor={setVecino} />
            ))}

            {/* Cargar más. Solo en el inicio y sin búsqueda: Guardados,
                Siguiendo y los resultados de búsqueda traen su propia lista
                completa, así que un botón ahí prometería algo que no hay. */}
            {homeMode && !sl && !noMore && posts.length >= 20 && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="mx-auto mt-1 cursor-pointer rounded-full border border-hair bg-white px-5 py-2.5 text-[13px] font-extrabold text-primary-dark shadow-card disabled:opacity-60"
              >
                {loadingMore ? L('Cargando…', 'Loading…') : L('Ver más publicaciones', 'Show more posts')}
              </button>
            )}
            {homeMode && !sl && noMore && posts.length >= 20 && (
              <div className="py-2 text-center text-[12px] font-semibold text-muted">
                {L('Has llegado al final por ahora.', "That's everything for now.")}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Rail derecho — vuelve el 2026-08-04, con datos REALES.
          Se había retirado entero el 2026-07-29 porque sus dos tarjetas eran
          fabricadas (regla #8): "Tendencias" con hashtags y conteos inventados
          (#TaqueríasHTX · 156 publicaciones…) y "Vecinos sugeridos" con tres
          personas que no existen (Ana E., Roberto M., Sofía L.) y un botón
          Seguir funcional. Vuelve solo la mitad que se sostiene:
            · Vecinos → RPC `neighbors_nearby` (migración 0143): gente que SÍ ha
              publicado en tu radio y a la que aún no sigues.
            · Tendencias → NO se reconstruye. No hay hashtags en el modelo de
              datos; cualquier cifra sería inventada otra vez. Sigue anotado en
              docs/LAUNCH-CHECKLIST.md.
          Solo desde 1280px: por debajo, la tercera columna dejaría el feed en
          unos 400px. */}
      <aside className="sticky top-[130px] hidden flex-col gap-[18px] min-[1180px]:flex">
        {/* A un invitado no se le enseña ni siquiera el vacío: la tarjeta habla
            de «tus vecinos» y sin sesión no hay tal cosa. */}
        {auth.user && <VecinosCerca vecinos={vecinos} loading={vecinosCargando} onOpen={setVecino} />}
      </aside>

      {/* comment thread */}
      <Overlay open={!!threadPost || linkedMissing} onClose={closeThread} width={520} fullHeightSheet>
        {!threadPost && linkedMissing && (
          <div className="py-6">
            <EmptyState
              title={L('Esta publicación ya no está disponible', 'This post is no longer available')}
              sub={L('Puede que su autor la haya borrado, o que ya no esté a tu alcance.',
                     'The author may have deleted it, or it may no longer be available to you.')}
            />
            <button onClick={closeThread} className="mx-auto mt-4 block cursor-pointer rounded-btn bg-lilac-2 px-5 py-2.5 text-[13px] font-extrabold text-primary-dark">
              {L('Volver al inicio', 'Back to the feed')}
            </button>
          </div>
        )}
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
                aria-label={L('Cerrar', 'Close')}
                className="tap ml-auto flex h-8 w-8 flex-none cursor-pointer items-center justify-center rounded-full bg-lilac-2 text-ink-2"
              >
                <X size={15} stroke={2.8} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <PostCard post={threadPost} commentCount={commentCount(threadPost.id)} onOpenAuthor={setVecino} />
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
              {commentErr && (
                <div role="alert" className="mb-2 rounded-[10px] bg-pink-bg px-3 py-2 text-[11.5px] font-bold text-pink-dark">
                  {commentErr}
                </div>
              )}
              {replyTo && (
                <div className="mb-2 flex items-center justify-between rounded-[9px] bg-lilac-3 px-3 py-1.5 text-[11.5px] font-extrabold text-primary-dark">
                  {L('Respondiendo a ', 'Replying to ')}
                  {replyTo.name}
                  <button onClick={() => setReplyTo(null)} className="cursor-pointer">
                    <X size={12} stroke={3} />
                  </button>
                </div>
              )}
              {commentBiz && (
                <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-green-bg px-3 py-1.5 text-[11.5px] font-extrabold text-green-dark">
                  <Store size={12} stroke={2.4} />
                  {commentBiz.name}
                  <button onClick={() => setCommentBiz(null)} className="cursor-pointer">
                    <X size={11} stroke={3} />
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
                        setCommentBiz(commentBiz?.slug === b.slug ? null : { slug: b.slug, name: b.name });
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
                {auth.profile
                  ? <Avatar initials={auth.profile.initials} color={auth.profile.avatar_color} src={auth.profile.avatar_url} size={36} />
                  : <YouAvatar size={36} />}
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendComment()}
                  placeholder={replyTo ? L('Escribe tu respuesta…', 'Write your reply…') : L('Escribe un comentario…', 'Write a comment…')}
                  className="min-w-0 flex-1 rounded-full bg-app px-4 py-2.5 text-[13px] font-medium text-ink outline-none placeholder:text-muted"
                />
                <button
                  onClick={() => setCommentBizOpen(!commentBizOpen)}
                  className={`tap flex h-[38px] w-[38px] flex-none cursor-pointer items-center justify-center rounded-full ${
                    commentBizOpen || commentBiz ? 'bg-green text-white' : 'bg-lilac-2 text-muted'
                  }`}
                  aria-label={L('Recomendar un negocio', 'Recommend a business')}
                >
                  <Store size={17} stroke={2.2} />
                </button>
                <button
                  onClick={sendComment}
                  disabled={!canComment || sending}
                  className={`tap flex h-[38px] w-[38px] flex-none items-center justify-center rounded-full text-white ${
                    canComment && !sending ? 'cursor-pointer bg-primary' : 'cursor-not-allowed bg-[#E3DEF2]'
                  }`}
                  aria-label={L('Enviar', 'Send')}
                >
                  <Send size={15} stroke={2.4} />
                </button>
              </div>
            </div>
          </div>
        )}
      </Overlay>

      <NeighborSheet
        userId={vecino}
        onClose={cerrarVecino}
        onOpenThread={openThreadUrl}
      />

      <ConfirmDialog
        open={!!delComment}
        title={L('¿Borrar tu comentario?', 'Delete your comment?')}
        message={L('No se puede deshacer. Si tenía respuestas, también se borran.',
                   "This can't be undone. Any replies to it go too.")}
        confirmLabel={L('Borrar', 'Delete')}
        cancelLabel={L('Cancelar', 'Cancel')}
        onConfirm={doDeleteComment}
        onClose={() => setDelComment(null)}
      />
    </div>
  );
}
