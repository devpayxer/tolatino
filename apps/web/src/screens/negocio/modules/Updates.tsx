'use client';

// Novedades / Updates module (business dashboard). Composer (type chips +
// photo/video/offer attach + Borrador/Programar/Publicar), sub-tab filter
// (Todas/En vivo/Programadas/Borradores/Archivadas with live counts), post
// cards with per-status actions and live stats, plus a stream-performance panel
// and recent-followers list. Mobile-first; on desktop the perf/followers move
// into a sticky side rail. Real state: posting adds to the list + switches tab.

import { useMemo, useState } from 'react';
import {
  Bookmark, Calendar, Check, Heart, Image as ImageIcon, MessageCircle, MoreHorizontal,
  RefreshCw, Tag, Trash2, Video, Zap,
} from 'lucide-react';
import { VerifiedBadge } from '@/components/ui';
import type { PanelCtx } from '@/screens/negocio/tabs';

type Kind = 'news' | 'offer' | 'event';
type Status = 'live' | 'scheduled' | 'draft' | 'archived';
type Post = {
  id: number; kind: Kind; es: string; en: string; status: Status; pinned: boolean;
  when: [string, string]; views?: string; likes?: number; comments?: number; saves?: number; hasPhoto: boolean;
};

const KIND_TILE: Record<Kind, string> = {
  offer: '#F3E2CE 0 8px,#ECD3B4 8px 16px',
  event: '#F3D9E2 0 8px,#E8BFCD 8px 16px',
  news: '#FBEFD3 0 8px,#F5E1B0 8px 16px',
};
const KIND_BADGE: Record<Kind, string> = {
  offer: 'bg-pink-bg text-pink-dark',
  event: 'bg-lilac-2 text-primary-dark',
  news: 'bg-green-bg text-green-dark',
};

const cardCls = 'rounded-card-sm border border-hair bg-white shadow-card';

export function UpdatesModule({ ctx }: { ctx: PanelCtx }) {
  const { L, es, isFree, ci } = ctx;

  const seed = useMemo<Post[]>(
    () => [
      { id: 1, kind: 'offer', es: '🌮 Domingos de masa madre: 20% en todos los panes, todo el día.', en: '🌮 Sourdough Sundays: 20% off all loaves, all day.', status: 'live', pinned: true, when: ['hace 2 h', '2h ago'], views: '4,820', likes: 312, comments: 28, saves: 64, hasPhoto: true },
      { id: 2, kind: 'news', es: 'Conoce a Marisa, nuestra nueva panadera ✨ Trae 10 años de experiencia.', en: 'Meet Marisa, our new baker ✨ She brings 10 years of experience.', status: 'live', pinned: false, when: ['hace 1 d', '1d ago'], views: '1,820', likes: 142, comments: 12, saves: 21, hasPhoto: true },
      { id: 3, kind: 'event', es: 'Cena de Halloween · 6 tiempos · 31 de octubre. ¡Últimos boletos!', en: 'Halloween dinner · 6 courses · Oct 31. Last tickets!', status: 'scheduled', pinned: false, when: ['Programado · 8 AM', 'Scheduled · 8 AM'], hasPhoto: true },
      { id: 4, kind: 'news', es: 'Ahora abrimos los domingos de 10 AM a 4 PM 🎉', en: "We're now open Sundays 10 AM–4 PM 🎉", status: 'draft', pinned: false, when: ['Borrador', 'Draft'], hasPhoto: false },
      { id: 5, kind: 'offer', es: 'Especial de maíz de verano · platillo destacado.', en: 'Summer corn special · featured item.', status: 'archived', pinned: false, when: ['Archivado', 'Archived'], views: '5,880', hasPhoto: true },
    ],
    [],
  );

  const [posts, setPosts] = useState<Post[]>(seed);
  const [tab, setTab] = useState<'all' | Status>('all');
  const [draft, setDraft] = useState('');
  const [kind, setKind] = useState<Kind>('news');
  const [photo, setPhoto] = useState(false);
  const [video, setVideo] = useState(false);
  const [welcomed, setWelcomed] = useState<Record<number, boolean>>({});
  const [toast, setToast] = useState('');

  const flash = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(''), 1900);
  };

  const count = (s: Status) => posts.filter((p) => p.status === s).length;

  const create = (status: Status) => {
    const title = draft.trim();
    if (!title) return flash(L('Escribe algo primero', 'Write something first'));
    const id = Math.max(0, ...posts.map((p) => p.id)) + 1;
    const when: [string, string] =
      status === 'live' ? ['ahora', 'just now'] : status === 'scheduled' ? ['Programado · 8 AM', 'Scheduled · 8 AM'] : ['Borrador', 'Draft'];
    setPosts([{ id, kind, es: title, en: title, status, pinned: false, hasPhoto: photo, when, views: '0', likes: 0, comments: 0, saves: 0 }, ...posts]);
    setDraft(''); setKind('news'); setPhoto(false); setVideo(false);
    setTab(status === 'archived' ? 'all' : status);
    flash(
      status === 'live' ? L('Publicado en tu stream', 'Posted to your stream')
        : status === 'scheduled' ? L('Publicación programada', 'Post scheduled')
          : L('Guardado en borradores', 'Saved to drafts'),
    );
  };

  const kindLabel = (k: Kind) => ({ offer: L('Oferta', 'Offer'), event: L('Evento', 'Event'), news: L('Aviso', 'News') }[k]);

  const tabs: [('all' | Status), string, number | null][] = [
    ['all', L('Todas', 'All'), null],
    ['live', L('En vivo', 'Live'), count('live')],
    ['scheduled', L('Programadas', 'Scheduled'), count('scheduled')],
    ['draft', L('Borradores', 'Drafts'), count('draft')],
    ['archived', L('Archivadas', 'Archived'), count('archived')],
  ];

  const showComposer = tab === 'all' || tab === 'live';
  const showPerf = tab === 'all';
  const visible = [...(tab === 'all' ? posts : posts.filter((p) => p.status === tab))].sort((a, b) => Number(b.pinned) - Number(a.pinned));

  const perfStats = [
    { label: L('Seguidores', 'Followers'), value: '142', delta: '▲ 14 ' + L('nuevos', 'new') },
    { label: L('Alcance prom.', 'Avg reach'), value: '1,820', delta: '▲ 28%' },
    { label: L('Interacción', 'Engagement'), value: '8.4%', delta: '▲ 1.2pp' },
    { label: L('Clics', 'Click-through'), value: '4.2%', delta: '▲ 0.8pp' },
  ];
  const followers = [
    { i: 0, initials: 'ML', color: '#7B61FF', name: 'María L.', since: es ? 'hace 2 h' : '2h ago' },
    { i: 1, initials: 'JT', color: '#1F9D57', name: 'James T.', since: es ? 'hace 5 h' : '5h ago' },
    { i: 2, initials: 'AF', color: '#E8954A', name: 'Anna F.', since: es ? 'ayer' : 'yesterday' },
  ];

  const chip = (on: boolean) =>
    `flex-none cursor-pointer rounded-full px-3 py-2 text-[12.5px] ${on ? 'bg-primary font-extrabold text-white shadow-cta-sm' : 'bg-lilac-2 font-bold text-ink-soft'}`;
  const typeChip = (on: boolean) =>
    `cursor-pointer rounded-full px-2.5 py-1 text-[11px] ${on ? 'bg-primary font-extrabold text-white' : 'bg-lilac-2 font-bold text-muted'}`;
  const attach = (on: boolean) =>
    `flex cursor-pointer items-center gap-1.5 rounded-field border px-2.5 py-1.5 text-[11px] font-bold ${on ? 'border-primary bg-lilac text-primary-dark' : 'border-lilac-line bg-white text-muted'}`;

  const composer = (
    <div className={`${cardCls} p-3.5`}>
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-btn bg-primary text-[12px] font-extrabold text-white">{ci.initials}</span>
        <div className="min-w-0 flex-1">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={L('¿Qué hay de nuevo en tu negocio? Oferta · evento · aviso…', "What's new? Offer · event · news…")}
            rows={2}
            className="w-full resize-none rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2.5 text-[13px] font-medium leading-snug text-ink outline-none placeholder:text-muted focus:border-primary"
          />
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span className="text-[10.5px] font-bold text-muted">{L('Tipo:', 'Type:')}</span>
            {(['news', 'offer', 'event'] as Kind[]).map((k) => (
              <button key={k} onClick={() => setKind(k)} className={typeChip(kind === k)}>{kindLabel(k)}</button>
            ))}
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <button onClick={() => setPhoto((v) => !v)} className={attach(photo)}><ImageIcon size={13} strokeWidth={2} />{L('Foto', 'Photo')}</button>
            <button onClick={() => setVideo((v) => !v)} className={attach(video)}><Video size={13} strokeWidth={2} />{L('Video', 'Video')}</button>
            <button onClick={() => setKind('offer')} className={attach(kind === 'offer')}><Tag size={13} strokeWidth={2} />{L('Oferta', 'Offer')}</button>
          </div>
        </div>
      </div>
      <div className="mt-3 flex gap-2 border-t border-hair pt-3">
        <button onClick={() => create('draft')} className="cursor-pointer rounded-field border-[1.5px] border-lilac-line bg-white px-3.5 py-2.5 text-[11.5px] font-extrabold text-ink">
          {L('Borrador', 'Draft')}
        </button>
        <button onClick={() => create('scheduled')} className="flex cursor-pointer items-center gap-1.5 rounded-field border-[1.5px] border-lilac-line bg-white px-3.5 py-2.5 text-[11.5px] font-extrabold text-primary-dark">
          <Calendar size={13} strokeWidth={2.2} />{L('Programar', 'Schedule')}
        </button>
        <button
          onClick={() => create('live')}
          disabled={!draft.trim()}
          className={`flex-1 rounded-field py-2.5 text-[12.5px] font-extrabold text-white ${draft.trim() ? 'cursor-pointer bg-primary shadow-cta-sm' : 'cursor-not-allowed bg-lilac-line'}`}
        >
          {L('Publicar', 'Post now')}
        </button>
      </div>
    </div>
  );

  const perfCard = (
    <div className={`${cardCls} p-4`}>
      <div className="mb-3 text-[13px] font-extrabold text-ink">{L('Rendimiento · 30 días', 'Stream performance · 30d')}</div>
      <div className="grid grid-cols-2 gap-2.5">
        {perfStats.map((p) => (
          <div key={p.label} className="rounded-btn-lg bg-app p-3">
            <div className="text-[10px] font-bold text-muted">{p.label}</div>
            <div className="mt-0.5 text-[18px] font-extrabold text-ink">{p.value}</div>
            <div className="text-[9.5px] font-extrabold text-green">{p.delta}</div>
          </div>
        ))}
      </div>
    </div>
  );

  const followersCard = (
    <div className={`${cardCls} p-4`}>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[13px] font-extrabold text-ink">{L('Seguidores recientes', 'Recent followers')}</span>
        <span className="rounded-full bg-lilac-2 px-2 py-0.5 text-[9.5px] font-extrabold text-primary-dark">14 {L('nuevos', 'new')}</span>
      </div>
      <div className="flex flex-col gap-2.5">
        {followers.map((f) => {
          const on = welcomed[f.i];
          return (
            <div key={f.i} className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-[11px] font-extrabold text-white" style={{ background: f.color }}>{f.initials}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-extrabold text-ink">{f.name}</span>
                <span className="block text-[9.5px] font-semibold text-muted-2">{L('te siguió', 'followed')} {f.since}</span>
              </span>
              {on ? (
                <span className="flex-none text-[10px] font-extrabold text-green-dark">✓ {L('Saludado', 'Welcomed')}</span>
              ) : (
                <button
                  onClick={() => { setWelcomed((w) => ({ ...w, [f.i]: true })); flash(L('Mensaje de bienvenida enviado', 'Welcome message sent')); }}
                  className="flex-none cursor-pointer rounded-lg bg-primary px-2.5 py-1.5 text-[10px] font-extrabold text-white"
                >
                  {L('Saludar', 'Welcome')}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const actionBtn = (label: string, primary?: boolean) => (
    <button className={`cursor-pointer rounded-field px-3 py-2 text-[10.5px] font-extrabold ${primary ? 'bg-primary text-white shadow-cta-sm' : 'border-[1.5px] border-lilac-line bg-white text-ink'}`}>
      {label}
    </button>
  );

  const postList = (
    <div className="flex flex-col gap-3">
      {visible.length === 0 ? (
        <div className={`${cardCls} p-9 text-center`}>
          <div className="text-[13px] font-semibold leading-relaxed text-muted">{L('Aún no hay publicaciones aquí. Usa el editor de arriba para crear una.', 'No posts here yet. Use the composer above to create one.')}</div>
        </div>
      ) : (
        visible.map((p) => (
          <div key={p.id} className={`overflow-hidden rounded-card-sm border bg-white shadow-card ${p.pinned ? 'border-[rgba(244,183,64,.4)]' : 'border-hair'}`}>
            <div className="flex items-start justify-between gap-2 p-3.5 pb-0">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[10px] bg-primary text-[11px] font-extrabold text-white">{ci.initials}</span>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="text-[12px] font-extrabold text-ink">{ci.name.split(' ')[0]}</span>
                    {!isFree && <VerifiedBadge size={13} />}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    {p.pinned && <span className="rounded bg-amber-bg px-1.5 py-px text-[8px] font-extrabold text-amber-ink">📌 {L('Fijado', 'Pinned')}</span>}
                    <span className="text-[9.5px] font-semibold text-muted-2">{L(p.when[0], p.when[1])}</span>
                    <span className={`rounded px-1.5 py-px text-[8px] font-extrabold ${KIND_BADGE[p.kind]}`}>{kindLabel(p.kind)}</span>
                  </div>
                </div>
              </div>
              <button className="flex h-7 w-7 flex-none cursor-pointer items-center justify-center rounded-lg bg-app text-muted-2" aria-label={L('Opciones', 'Options')}>
                <MoreHorizontal size={15} />
              </button>
            </div>

            <div className="px-3.5 pt-2.5 text-[13.5px] font-bold leading-snug text-ink">{L(p.es, p.en)}</div>
            {p.hasPhoto && <div className="mx-3.5 mt-3 h-[130px] rounded-tile" style={{ background: `repeating-linear-gradient(135deg,${KIND_TILE[p.kind]})` }} />}

            {p.status === 'live' ? (
              <div className="flex flex-wrap items-center gap-4 px-3.5 py-3 text-[10.5px] font-bold text-muted">
                <span className="flex items-center gap-1"><Eye_ /> {p.views}</span>
                <span className="flex items-center gap-1 text-pink"><Heart size={13} strokeWidth={2.2} fill="#F0466E" /> {p.likes}</span>
                <span className="flex items-center gap-1"><MessageCircle size={13} strokeWidth={2.2} /> {p.comments}</span>
                <span className="flex items-center gap-1"><Bookmark size={13} strokeWidth={2.2} /> {p.saves}</span>
              </div>
            ) : (
              <div className="mt-2 flex justify-end gap-2 border-t border-hair px-3.5 py-3">
                {p.status === 'scheduled' && <>{actionBtn(L('Reprogramar', 'Reschedule'))}<button className="flex cursor-pointer items-center gap-1 rounded-field bg-primary px-3 py-2 text-[10.5px] font-extrabold text-white shadow-cta-sm"><Zap size={12} strokeWidth={2.4} />{L('Publicar', 'Post now')}</button></>}
                {p.status === 'draft' && <><button className="flex cursor-pointer items-center gap-1 rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2 text-[10.5px] font-extrabold text-ink"><Trash2 size={12} strokeWidth={2.2} />{L('Eliminar', 'Delete')}</button>{actionBtn(L('Publicar', 'Publish'), true)}</>}
                {p.status === 'archived' && <button className="flex cursor-pointer items-center gap-1 rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2 text-[10.5px] font-extrabold text-ink"><RefreshCw size={12} strokeWidth={2.2} />{L('Reusar', 'Re-run')}</button>}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="relative pb-8">
      {/* sub-tabs */}
      <div className="no-scrollbar -mx-1 mb-4 flex gap-2 overflow-x-auto px-1">
        {tabs.map(([k, label, n]) => (
          <button key={k} onClick={() => setTab(k)} className={chip(tab === k)}>
            {label}
            {n != null && <span className={`ml-1.5 font-extrabold ${tab === k ? 'text-white/80' : 'text-muted-2'}`}>{n}</span>}
          </button>
        ))}
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          {showComposer && composer}
          {postList}
        </div>
        {showPerf && (
          <div className="flex flex-col gap-4 xl:sticky xl:top-[74px]">
            {perfCard}
            {followersCard}
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl bg-ink px-4 py-3 text-[12.5px] font-bold text-white shadow-modal">
          <Check size={14} strokeWidth={2.6} className="text-[#7BE0A8]" />
          {toast}
        </div>
      )}
    </div>
  );
}

// Eye glyph (lucide Eye is fine, but keep the stat row compact/consistent).
function Eye_() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
