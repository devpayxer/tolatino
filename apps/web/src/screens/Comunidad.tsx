'use client';

// Comunidad (`/comunidad`) — Nextdoor-style home of the app (Handoff v2).
// Desktop: barrios rail / feed / tendencias+vecinos. Mobile: single column.

import { useMemo, useState } from 'react';
import { Send, Store, X } from 'lucide-react';
import { useLang } from '@/lib/i18n';
import { useApp } from '@/lib/state';
import { Avatar, Card, EmptyState, Overlay, YouAvatar } from '@/components/ui';
import { SearchChip } from '@/components/AppHeader';
import { PostCard } from '@/components/PostCard';
import { BUSINESSES, HOODS, NEIGHBORS, POSTS, SEED_COMMENTS, SEED_REPLIES, TRENDING, bizTile, type Comment, type Post } from '@/data/fixtures';

export function ComunidadScreen() {
  const { L } = useLang();
  const app = useApp();
  const [hood, setHood] = useState('all');

  // thread state
  const [threadPostId, setThreadPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState<{ cid: string; name: string } | null>(null);
  const [userComments, setUserComments] = useState<Record<string, Comment[]>>({});
  const [userReplies, setUserReplies] = useState<Record<string, Comment[]>>({});
  const [commentLikes, setCommentLikes] = useState<Record<string, boolean>>({});
  const [commentBiz, setCommentBiz] = useState<string | null>(null);
  const [commentBizOpen, setCommentBizOpen] = useState(false);
  const [commentBizQuery, setCommentBizQuery] = useState('');
  const [commentSeq, setCommentSeq] = useState(0);

  const allPosts: Post[] = useMemo(() => [...app.newPosts, ...POSTS], [app.newPosts]);
  const sl = app.search.trim().toLowerCase();
  const posts = sl
    ? allPosts.filter((p) => `${p.es} ${p.en} ${p.name} ${p.business ?? ''}`.toLowerCase().includes(sl))
    : allPosts;

  const topComments = (pid: string) => [...(SEED_COMMENTS[pid] ?? []), ...(userComments[pid] ?? [])];
  const repliesFor = (cid: string) => [...(SEED_REPLIES[cid] ?? []), ...(userReplies[cid] ?? [])];
  const commentCount = (pid: string) => topComments(pid).reduce((n, c) => n + 1 + repliesFor(c.id).length, 0);

  const threadPost = allPosts.find((p) => p.id === threadPostId) ?? null;
  const canComment = commentText.trim().length > 0 || !!commentBiz;

  const closeThread = () => {
    setThreadPostId(null);
    setReplyTo(null);
    setCommentText('');
    setCommentBiz(null);
    setCommentBizOpen(false);
  };

  const sendComment = () => {
    const txt = commentText.trim();
    if ((!txt && !commentBiz) || !threadPostId) return;
    const base: Comment = {
      id: `u${commentSeq}`,
      initials: 'TÚ',
      color: '#7B61FF',
      name: L('Tú', 'You'),
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
      setUserComments((m) => ({ ...m, [threadPostId]: [...(m[threadPostId] ?? []), base] }));
    }
    setCommentText('');
    setReplyTo(null);
    setCommentBiz(null);
    setCommentBizOpen(false);
  };

  const cbq = commentBizQuery.trim().toLowerCase();
  const commentBizResults = BUSINESSES.filter((b) => !cbq || b.name.toLowerCase().includes(cbq)).slice(0, 6);

  const commentRow = (c: Comment, isReply = false) => {
    const liked = !!commentLikes[c.id];
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
              onClick={() => setCommentLikes((m) => ({ ...m, [c.id]: !m[c.id] }))}
              className={`cursor-pointer text-[11.5px] font-extrabold ${liked ? 'text-pink' : 'text-muted'}`}
            >
              ♥ {c.likes + (liked ? 1 : 0)}
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

        {posts.length === 0 ? (
          <EmptyState title={L('Sin resultados para tu búsqueda', 'No results for your search')} />
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
                  disabled={!canComment}
                  className={`flex h-[38px] w-[38px] flex-none items-center justify-center rounded-full text-white ${
                    canComment ? 'cursor-pointer bg-primary' : 'cursor-not-allowed bg-[#E3DEF2]'
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
