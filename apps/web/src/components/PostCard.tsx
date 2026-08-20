'use client';

// Community post card (Handoff v2 → Cliente/Comunidad): avatar + tag +
// hood·time, text, optional poll / tagged business, actions (♥ recommend,
// comments → thread, save, share). All toggles carry real state.

import { useEffect, useState } from 'react';
import { imgUrl, ANCHO } from '@/lib/img';
import { IconBookmark as Bookmark, IconBookmarkFilled as BookmarkFilled, IconCheck as Check, IconChevronRight as ChevronRight, IconMessageCircle as MessageCircle, IconPin as Pin, IconShare as Share } from '@tabler/icons-react';
import { useLang } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { useInteractions } from '@/lib/interactions';
import { useFollows } from '@/lib/follows';
import { Avatar } from '@/components/ui';
import { useAvatar } from '@/lib/avatars';
import { PostMenu } from '@/components/PostMenu';
import type { Post, PostType } from '@/data/fixtures';
import { tile } from '@/lib/tiles';

export type FeedPost = Post;

export function postTag(type: PostType, L: (a: string, b: string) => string) {
  switch (type) {
    case 'ask':
      return { label: L('Pregunta', 'Asking'), color: '#C4144C', bg: '#FFECF2' };
    case 'rec':
      return { label: L('Recomienda', 'Recommends'), color: '#007A57', bg: '#E6FAF3' };
    case 'sale':
      return { label: L('Vendo', 'For sale'), color: '#B85D00', bg: '#FFF6E3' };
    case 'poll':
      return { label: L('Encuesta', 'Poll'), color: '#008489', bg: '#DAF7F7' };
    default:
      return { label: L('Mi barrio', 'Local'), color: '#007CC1', bg: '#DEF4FF' };
  }
}

export function PostCard({
  post,
  preview = false,
  commentCount,
  onOpenThread,
  onOpenAuthor,
}: {
  post: FeedPost;
  preview?: boolean;
  commentCount?: number;
  onOpenThread?: () => void;
  /** Abre el perfil del autor. Sin esto el nombre no es pulsable. */
  onOpenAuthor?: (userId: string) => void;
}) {
  const { L } = useLang();
  const auth = useAuth();
  const it = useInteractions();
  const follows = useFollows();
  const tag = postTag(post.type, L);
  const [copied, setCopied] = useState(false);

  // Follow button on posts by other users (real posts only, not your own).
  const canFollow = !preview && follows.configured && !!post.authorId && post.authorId !== auth.user?.id;
  const following = !!post.authorId && follows.isFollowing(post.authorId);

  const [slide, setSlide] = useState(0);

  // Foto del autor. La propia sale del perfil ya cargado (así se ve al instante
  // al cambiarla); la de los demás, del lote de `useAvatar`.
  const own = !!post.authorId && post.authorId === auth.user?.id;
  const otherPhoto = useAvatar(own ? null : post.authorId);
  const authorPhoto = own ? auth.profile?.avatar_url ?? null : otherPhoto;

  // La tarjeta pide sus propios datos (♥, guardado, voto, conteo). Da igual por
  // dónde haya llegado: feed, «Ver más», búsqueda, Guardados, el perfil de un
  // vecino o un enlace suelto. Antes solo se hidrataba el feed inicial y todo
  // lo demás salía apagado y con 0 comentarios. (2ª auditoría de Comunidad.)
  const ensure = it.ensure;
  useEffect(() => {
    if (!preview) ensure(post.id);
  }, [ensure, post.id, preview]);

  const recOn = !!it.liked[post.id];
  const saveOn = !!it.saved[post.id];
  const recCount = it.likeCount[post.id] ?? post.recommends;
  const commentTotal = commentCount ?? it.commentCount[post.id] ?? 0;
  const pollBase = post.pollBase ?? post.poll?.map(() => 0) ?? [];
  const voteIdx = it.pollVote[post.id];
  const voted = voteIdx !== undefined;

  const share = async () => {
    // El enlace tiene que abrir ESTA publicación, no el feed. El permalink ya
    // existía (`?post=<id>`, es lo que reabre el hilo al refrescar); simplemente
    // no se estaba usando al compartir, así que quien recibía el mensaje caía en
    // el feed y no encontraba de qué le hablaban.
    const url = typeof window !== 'undefined'
      ? `${window.location.origin}/comunidad/?post=${encodeURIComponent(post.id)}`
      : '';
    const text = `${post.name} · To'Latino: ${L(post.es, post.en)}`;
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: "To'Latino", text, url });
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(`${text} ${url}`.trim());
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }
    } catch {
      /* user cancelled the share sheet — ignore */
    }
  };

  // Authoritative per-option counts (already include everyone's votes); the
  // realtime override keeps them live.
  const pollCounts = it.pollCount[post.id] ?? pollBase;
  const pollTotal = pollCounts.reduce((a, b) => a + b, 0);

  return (
    <div className="rounded-card border border-line bg-white p-[18px]">
      <div className="flex items-start gap-3">
        {onOpenAuthor && post.authorId && !preview ? (
          <button onClick={() => onOpenAuthor(post.authorId as string)} className="flex-none cursor-pointer" aria-label={post.name}>
            <Avatar initials={post.initials} color={post.color} src={authorPhoto} size={44} />
          </button>
        ) : (
          <Avatar initials={post.initials} color={post.color} src={authorPhoto} size={44} />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-[7px]">
            {onOpenAuthor && post.authorId && !preview ? (
              <button onClick={() => onOpenAuthor(post.authorId as string)} className="relative z-[1] -my-[11px] cursor-pointer py-[11px] text-[14.5px] font-extrabold text-ink hover:underline">
                {post.name}
              </button>
            ) : (
              <span className="text-[14.5px] font-extrabold text-ink">{post.name}</span>
            )}
            {post.pinned && (
              <span className="inline-flex items-center gap-1 rounded-[7px] bg-amber-bg px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-[.04em] text-amber-ink">
                <Pin size={10} stroke={2.6} aria-hidden /> {L('Fijado', 'Pinned')}
              </span>
            )}
            <span
              className="inline-flex items-center rounded-[7px] px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-[.04em]"
              style={{ background: tag.bg, color: tag.color }}
            >
              {tag.label}
            </span>
          </div>
          <div className="mt-0.5 text-[11.5px] font-semibold text-muted-2">
            {[post.hoodEs, post.city].filter(Boolean).join(', ')} · {L(post.timeEs, post.timeEn)}
            {post.edited && <> · <span className="italic">{L('editado', 'edited')}</span></>}
          </div>
        </div>
        {!preview && (
          <div className="flex flex-none items-center gap-1.5">
            {canFollow && (
              <button
                onClick={() => follows.toggleFollow(post.authorId as string)}
                className={`tap-y inline-flex cursor-pointer items-center rounded-[7px] border px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-[.04em] ${
 following ? 'border-hair-strong text-muted' : 'border-primary text-primary-dark'
 }`}
              >
                {following ? L('Siguiendo', 'Following') : L('Seguir', 'Follow')}
              </button>
            )}
            <PostMenu post={post} />
          </div>
        )}
      </div>

      <div className="mt-[11px] text-[14px] font-medium leading-[1.55] text-ink-body">{L(post.es, post.en)}</div>

      {post.images && post.images.length > 0 && (
        <div className="relative mt-3">
          {/* Instagram-style: one regular (square) photo at a time, swipe to next */}
          <div
            onScroll={(e) => {
              const el = e.currentTarget;
              setSlide(Math.round(el.scrollLeft / el.clientWidth));
            }}
            className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-card-sm"
          >
            {post.images.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={imgUrl(src, ANCHO.ancha)}
                alt=""
                loading="lazy"
                draggable={false}
                className="aspect-square w-full flex-none snap-center bg-app object-cover"
              />
            ))}
          </div>

          {post.images.length > 1 && (
            <>
              <div className="absolute right-2.5 top-2.5 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-bold text-white">
                {Math.min(slide + 1, post.images.length)}/{post.images.length}
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-2.5 flex justify-center gap-1.5">
                {post.images.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full shadow-[0_0_2px_rgba(0,0,0,.4)] transition-all ${
 i === slide ? 'w-4 bg-white' : 'w-1.5 bg-white/60'
 }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {post.poll && post.poll.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {post.poll.map((label, i) => {
            const pct = Math.round((pollCounts[i] / (pollTotal || 1)) * 100);
            const chosen = voteIdx === i;
            return (
              <button
                key={i}
                disabled={preview || voted}
                onClick={() => it.votePoll(post.id, i, pollBase)}
                className={`relative w-full cursor-pointer overflow-hidden rounded-field border-[1.5px] bg-white px-3.5 py-[11px] text-left ${
 chosen ? 'border-primary' : 'border-hair-strong'
 }`}
              >
                <span
                  className="absolute bottom-0 left-0 top-0 transition-[width] duration-300"
                  style={{ width: voted ? `${pct}%` : '0%', background: chosen ? '#E0DAFF' : '#F1EEFA' }}
                />
                <span className="relative flex items-center justify-between gap-2.5">
                  <span className="flex items-center gap-[7px] text-[13px] font-extrabold text-ink">
                    {chosen && <Check size={14} stroke={3} className="text-primary" />}
                    {label}
                  </span>
                  {voted && <span className="text-[12.5px] font-extrabold text-ink-2">{pct}%</span>}
                </span>
              </button>
            );
          })}
          <div className="text-[11px] font-bold text-muted-2">
            {pollTotal} {L('votos', 'votes')}
          </div>
        </div>
      )}

      {/* Negocio etiquetado. Con slug es un ENLACE a la ficha — que es el punto de
          una recomendación: llevar a alguien al negocio. Las publicaciones viejas
          (etiquetadas por nombre, antes de la migración 0135) no tienen slug: se
          pintan igual pero sin enlace, en vez de un enlace que no lleva a nada. */}
      {post.business && (() => {
        const inner = (
          <>
            <span className="h-8 w-8 flex-none rounded-[9px]" style={{ background: tile('#FFECF2', '#FED2DF', 7) }} />
            <span className="min-w-0 text-left">
              <span className="block truncate text-[12.5px] font-extrabold text-ink">{post.business}</span>
              <span className="mt-px block text-[10.5px] font-bold text-green-dark">
                {post.bizRating ? `★ ${post.bizRating} · ` : ''}
                {post.businessSlug ? L('Ver el negocio', 'View business') : L('Negocio etiquetado', 'Tagged business')}
              </span>
            </span>
            {post.businessSlug && <ChevronRight size={15} stroke={2.4} className="flex-none text-muted-2" aria-hidden />}
          </>
        );
        const cls = 'mt-[11px] inline-flex max-w-full items-center gap-2 rounded-btn border border-line bg-app px-3 py-2';
        return post.businessSlug && !preview ? (
          <a href={`/negocios/?b=${encodeURIComponent(post.businessSlug)}`} className={`${cls} cursor-pointer hover:border-hair-strong`}>
            {inner}
          </a>
        ) : (
          <div className={cls}>{inner}</div>
        );
      })()}

      {/* Los cuatro botones se DIBUJAN igual que en el prototipo (el marcador y
          compartir miden 16px), pero la zona que recibe el dedo llega a 44px
          con padding + margen negativo: el margen negativo devuelve el espacio
          que el padding se llevó, así que no se mueve nada. El hueco entre el
          marcador y compartir pasa de 18 a 28px porque dos zonas de 44 pegadas
          se pisan y la segunda le roba el toque a la primera. (2ª auditoría.) */}
      <div className="mt-[13px] flex items-center gap-[18px] border-t border-hair pt-3">
        <button
          disabled={preview}
          onClick={() => it.gate() && it.toggleLike(post.id, post.recommends)}
          className={`-mx-2 -my-3 flex cursor-pointer items-center gap-1.5 px-2 py-3 text-[13px] font-extrabold ${recOn ? 'text-pink' : 'text-muted'}`}
        >
          <span className="text-[16px] leading-none">♥</span>
          {recCount}
        </button>
        <button
          disabled={preview}
          onClick={onOpenThread}
          className="-mx-2 -my-3 flex cursor-pointer items-center gap-1.5 px-2 py-3 text-[13px] font-extrabold text-muted"
        >
          <MessageCircle size={16} stroke={2.2} />
          {commentTotal}
        </button>
        <button
          disabled={preview}
          onClick={() => it.gate() && it.toggleSave(post.id)}
          className="-my-[14px] -mx-[14px] ml-auto flex cursor-pointer items-center p-[14px]"
          aria-label={L('Guardar', 'Save')}
        >
          {saveOn ? <BookmarkFilled size={16} className="text-primary" /> : <Bookmark size={16} stroke={2.2} className="text-muted" />}
        </button>
        <button
          disabled={preview}
          onClick={share}
          className={`-my-[14px] -ml-[2px] -mr-[14px] flex cursor-pointer items-center gap-1.5 p-[14px] text-[12px] font-extrabold ${copied ? 'text-green-dark' : 'text-muted'}`}
          aria-label={L('Compartir', 'Share')}
        >
          <Share size={16} stroke={2.2} />
          {copied && <span>{L('Copiado', 'Copied')}</span>}
        </button>
      </div>
    </div>
  );
}
