'use client';

// Community post card (Handoff v2 → Cliente/Comunidad): avatar + tag +
// hood·time, text, optional poll / tagged business, actions (♥ recommend,
// comments → thread, save, share). All toggles carry real state.

import { useState } from 'react';
import { Bookmark, Check, MessageCircle, Share } from 'lucide-react';
import { useLang } from '@/lib/i18n';
import { useApp } from '@/lib/state';
import { useInteractions } from '@/lib/interactions';
import { Avatar } from '@/components/ui';
import type { Post, PostType } from '@/data/fixtures';
import { tile } from '@/lib/tiles';

export type FeedPost = Post;

export function postTag(type: PostType, L: (a: string, b: string) => string) {
  switch (type) {
    case 'ask':
      return { label: L('Pregunta', 'Asking'), color: '#6D4DF6', bg: '#EFEBFF' };
    case 'rec':
      return { label: L('Recomienda', 'Recommends'), color: '#1F8A4C', bg: '#E3F5EA' };
    case 'sale':
      return { label: L('Vendo', 'For sale'), color: '#B26A00', bg: '#FCEFD6' };
    case 'poll':
      return { label: L('Encuesta', 'Poll'), color: '#0E9384', bg: '#D6F3EF' };
    default:
      return { label: L('Mi barrio', 'Local'), color: '#2F6FED', bg: '#E5EFFB' };
  }
}

export function PostCard({
  post,
  preview = false,
  commentCount,
  onOpenThread,
}: {
  post: FeedPost;
  preview?: boolean;
  commentCount?: number;
  onOpenThread?: () => void;
}) {
  const { L } = useLang();
  const app = useApp();
  const it = useInteractions();
  const tag = postTag(post.type, L);
  const [copied, setCopied] = useState(false);

  const recOn = !!it.liked[post.id];
  const saveOn = !!it.saved[post.id];
  const recCount = it.likeCount[post.id] ?? post.recommends;
  const commentTotal = commentCount ?? it.commentCount[post.id] ?? 0;
  const voteIdx = app.pollVotes[post.id];
  const voted = voteIdx !== undefined;

  const share = async () => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/comunidad` : '';
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

  const pollCounts = (post.pollBase ?? post.poll?.map(() => 0) ?? []).map((c, i) => c + (voteIdx === i ? 1 : 0));
  const pollTotal = pollCounts.reduce((a, b) => a + b, 0);

  return (
    <div className="rounded-card border border-hair bg-white p-[18px] shadow-card">
      <div className="flex items-start gap-3">
        <Avatar initials={post.initials} color={post.color} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-[7px]">
            <span className="text-[14.5px] font-extrabold text-ink">{post.name}</span>
            <span
              className="inline-flex items-center rounded-[7px] px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-[.04em]"
              style={{ background: tag.bg, color: tag.color }}
            >
              {tag.label}
            </span>
          </div>
          <div className="mt-0.5 text-[11.5px] font-semibold text-muted-2">
            {post.hoodEs} · {L(post.timeEs, post.timeEn)}
          </div>
        </div>
      </div>

      <div className="mt-[11px] text-[14px] font-medium leading-[1.55] text-ink-body">{L(post.es, post.en)}</div>

      {post.poll && post.poll.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {post.poll.map((label, i) => {
            const pct = Math.round((pollCounts[i] / (pollTotal || 1)) * 100);
            const chosen = voteIdx === i;
            return (
              <button
                key={i}
                disabled={preview}
                onClick={() => app.votePoll(post.id, i)}
                className={`relative w-full cursor-pointer overflow-hidden rounded-field border-[1.5px] bg-white px-3.5 py-[11px] text-left ${
                  chosen ? 'border-primary' : 'border-hair-strong'
                }`}
              >
                <span
                  className="absolute bottom-0 left-0 top-0 transition-[width] duration-300"
                  style={{ width: voted ? `${pct}%` : '0%', background: chosen ? '#E0D7F8' : '#F1EFFA' }}
                />
                <span className="relative flex items-center justify-between gap-2.5">
                  <span className="flex items-center gap-[7px] text-[13px] font-extrabold text-ink">
                    {chosen && <Check size={14} strokeWidth={3} className="text-primary" />}
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

      {post.business && (
        <div className="mt-[11px] inline-flex items-center gap-2 rounded-btn border border-hair bg-app px-3 py-2">
          <span className="h-8 w-8 flex-none rounded-[9px]" style={{ background: tile('#EFEBFF', '#E5DEF9', 7) }} />
          <span className="min-w-0">
            <span className="block text-[12.5px] font-extrabold text-ink">{post.business}</span>
            <span className="mt-px block text-[10.5px] font-bold text-green-dark">
              ★ {post.bizRating} · {L('Negocio etiquetado', 'Tagged business')}
            </span>
          </span>
        </div>
      )}

      <div className="mt-[13px] flex items-center gap-[18px] border-t border-hair pt-3">
        <button
          disabled={preview}
          onClick={() => it.gate() && it.toggleLike(post.id, post.recommends)}
          className={`flex cursor-pointer items-center gap-1.5 text-[13px] font-extrabold ${recOn ? 'text-pink' : 'text-muted'}`}
        >
          <span className="text-[16px] leading-none">♥</span>
          {recCount}
        </button>
        <button
          disabled={preview}
          onClick={onOpenThread}
          className="flex cursor-pointer items-center gap-1.5 text-[13px] font-extrabold text-muted"
        >
          <MessageCircle size={16} strokeWidth={2.2} />
          {commentTotal}
        </button>
        <button
          disabled={preview}
          onClick={() => it.gate() && it.toggleSave(post.id)}
          className="ml-auto flex cursor-pointer items-center"
          aria-label={L('Guardar', 'Save')}
        >
          <Bookmark size={16} strokeWidth={2.2} className={saveOn ? 'text-primary' : 'text-muted'} fill={saveOn ? '#7B61FF' : 'none'} />
        </button>
        <button
          disabled={preview}
          onClick={share}
          className={`flex cursor-pointer items-center gap-1.5 text-[12px] font-extrabold ${copied ? 'text-green-dark' : 'text-muted'}`}
          aria-label={L('Compartir', 'Share')}
        >
          <Share size={16} strokeWidth={2.2} />
          {copied && <span>{L('Copiado', 'Copied')}</span>}
        </button>
      </div>
    </div>
  );
}
