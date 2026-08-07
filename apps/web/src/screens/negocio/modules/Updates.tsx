'use client';

// Novedades / Updates module (business dashboard) — Google-Business-posts grade,
// fully real (migration 0024 + 0094). Composer (type chips + REAL photo upload +
// Borrador/Programar/Publicar — every status persists now), sub-tab filter
// (Todas/En vivo/Programadas/Borradores/Archivadas with live counts), post cards
// with working per-status actions (publish, reschedule, pin, edit, archive,
// re-run, delete-with-confirm) and REAL stats (views bumped by the consumer tab,
// likes from business_update_likes). Scheduled posts auto-publish lazily when
// the owner opens the module past their time. The perf panel + top-posts rail
// compute from the real rows — nothing fabricated. Mobile-first; desktop moves
// the rail to a sticky side column.

import { useEffect, useMemo, useRef, useState } from 'react';
import { imgUrl, ANCHO } from '@/lib/img';
import { IconCalendar as Calendar, IconCheck as Check, IconHeartFilled as Heart, IconPhoto as ImageIcon, IconDots as MoreHorizontal, IconPin as Pin, IconPencil as Pencil, IconRefresh as RefreshCw, IconTag as Tag, IconTrash as Trash2, IconArchive as Archive, IconBolt as Zap, IconX as X } from '@tabler/icons-react';
import { Overlay, OverlayTitle, VerifiedBadge } from '@/components/ui';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { PanelCtx } from '@/screens/negocio/tabs';
import { useBizAdmin } from '@/lib/bizAdmin';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { uploadImage } from '@/lib/image';

type Kind = 'news' | 'offer' | 'event';
type Status = 'live' | 'scheduled' | 'draft' | 'archived';
type Post = {
  id: number; dbId?: string; kind: Kind; es: string; en: string; status: Status; pinned: boolean;
  createdAt?: string; scheduledAt?: string | null; views: number; likes: number; imageUrl?: string | null;
};

// A `business_updates` row (0024 + 0094 lifecycle columns) → the module's Post.
type UpdateRow = {
  id: string; kind: Kind; body_es: string; body_en: string | null; image_url: string | null;
  likes: number | null; views: number | null; created_at: string;
  status: Status | null; pinned: boolean | null; scheduled_at: string | null;
};
function rowToPost(r: UpdateRow, idx: number): Post {
  return {
    id: idx + 1,
    dbId: r.id,
    kind: r.kind === 'offer' || r.kind === 'event' ? r.kind : 'news',
    es: r.body_es,
    en: r.body_en ?? r.body_es,
    status: r.status === 'scheduled' || r.status === 'draft' || r.status === 'archived' ? r.status : 'live',
    pinned: r.pinned === true,
    createdAt: r.created_at,
    scheduledAt: r.scheduled_at,
    views: r.views ?? 0,
    likes: r.likes ?? 0,
    imageUrl: r.image_url,
  };
}
function rel(iso: string | undefined, L: (a: string, b: string) => string): string {
  if (!iso) return '';
  const min = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 1) return L('ahora', 'just now');
  if (min < 60) return L(`hace ${min} min`, `${min}m ago`);
  const h = Math.floor(min / 60);
  if (h < 24) return L(`hace ${h} h`, `${h}h ago`);
  const d = Math.floor(h / 24);
  return L(`hace ${d} d`, `${d}d ago`);
}
function schedLabel(iso: string | null | undefined, es: boolean, L: (a: string, b: string) => string): string {
  if (!iso) return L('Programado', 'Scheduled');
  const d = new Date(iso);
  if (isNaN(d.getTime())) return L('Programado', 'Scheduled');
  return `${L('Programado', 'Scheduled')} · ${d.toLocaleString(es ? 'es-US' : 'en-US', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}`;
}

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

const cardCls = 'rounded-card-sm border border-line bg-white ';

export function UpdatesModule({ ctx }: { ctx: PanelCtx }) {
  const { L, es, isFree, ci } = ctx;

  // Demo sample (explorable without signing in) — a real business loads DB rows.
  const seed = useMemo<Post[]>(
    () => [
      { id: 1, kind: 'offer', es: '🌮 Domingos de masa madre: 20% en todos los panes, todo el día.', en: '🌮 Sourdough Sundays: 20% off all loaves, all day.', status: 'live', pinned: true, createdAt: new Date(Date.now() - 2 * 3600000).toISOString(), views: 4820, likes: 312, imageUrl: null },
      { id: 2, kind: 'news', es: 'Conoce a Marisa, nuestra nueva panadera ✨ Trae 10 años de experiencia.', en: 'Meet Marisa, our new baker ✨ She brings 10 years of experience.', status: 'live', pinned: false, createdAt: new Date(Date.now() - 86400000).toISOString(), views: 1820, likes: 142, imageUrl: null },
      { id: 3, kind: 'event', es: 'Cena de Halloween · 6 tiempos · 31 de octubre. ¡Últimos boletos!', en: 'Halloween dinner · 6 courses · Oct 31. Last tickets!', status: 'scheduled', pinned: false, scheduledAt: new Date(Date.now() + 86400000).toISOString(), views: 0, likes: 0, imageUrl: null },
      { id: 4, kind: 'news', es: 'Ahora abrimos los domingos de 10 AM a 4 PM 🎉', en: "We're now open Sundays 10 AM–4 PM 🎉", status: 'draft', pinned: false, views: 0, likes: 0, imageUrl: null },
      { id: 5, kind: 'offer', es: 'Especial de maíz de verano · platillo destacado.', en: 'Summer corn special · featured item.', status: 'archived', pinned: false, createdAt: new Date(Date.now() - 20 * 86400000).toISOString(), views: 5880, likes: 96, imageUrl: null },
    ],
    [],
  );

    // El estado inicial NO puede ser de ejemplo: se pinta antes de saber si
  // hay negocio real, así que un dueño ve un instante el catálogo de otro.
  // Quien decide es el cargador de abajo. (Auditoría de Negocios, 2026-08-04.)
  const [posts, setPosts] = useState<Post[]>([]);
  const [tab, setTab] = useState<'all' | Status>('all');
  const [draft, setDraft] = useState('');
  const [kind, setKind] = useState<Kind>('news');
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoBusy, setPhotoBusy] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null); // composer edits this post
  const [schedOpen, setSchedOpen] = useState(false); // composer "Programar" picker
  const [schedAt, setSchedAt] = useState(''); // datetime-local value
  const [reschedFor, setReschedFor] = useState<Post | null>(null); // card "Reprogramar"
  const [menuFor, setMenuFor] = useState<Post | null>(null); // ⋯ action sheet
  const [confirmDel, setConfirmDel] = useState<Post | null>(null);
  const [toast, setToast] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const admin = useBizAdmin();
  const { user } = useAuth();
  const real = admin.active;
  const persistable = !admin.demo && !!real; // real signed-in business → persist to Supabase

  const flash = (m: string) => { setToast(m); window.setTimeout(() => setToast(''), 1900); };

  // Load the real business's updates — ALL statuses (owner-read policy, 0094).
  // Scheduled posts whose time already passed auto-publish here (lazy publish).
  useEffect(() => {
    if (!persistable || !real || !supabase) { setPosts([]); return; } // sin novedades fabricadas (regla #8)
    let cancelled = false;
    (async () => {
      const { data } = await supabase!
        .from('business_updates')
        .select('id,kind,body_es,body_en,image_url,likes,views,created_at,status,pinned,scheduled_at')
        .eq('business_id', real.id)
        .order('created_at', { ascending: false });
      if (cancelled || !Array.isArray(data)) return;
      let rows = (data as unknown as UpdateRow[]).map(rowToPost);
      // lazy auto-publish: scheduled_at reached → live (server cron is a deferral)
      const due = rows.filter((p) => p.status === 'scheduled' && p.scheduledAt && new Date(p.scheduledAt).getTime() <= Date.now());
      for (const p of due) {
        rows = rows.map((x) => (x.dbId === p.dbId ? { ...x, status: 'live' as Status } : x));
        supabase!.from('business_updates').update({ status: 'live' }).eq('id', p.dbId!).then(() => {});
      }
      if (due.length) flash(L(`${due.length} publicación(es) programada(s) ya está(n) en vivo`, `${due.length} scheduled post(s) went live`));
      setPosts(rows);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [real?.id, admin.demo]);

  // Persist a patch to a post's DB row (owner RLS). The builder is lazy → .then().
  const writeRow = (p: Post, patch: Record<string, unknown>) => {
    if (persistable && p.dbId && supabase) {
      supabase.from('business_updates').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', p.dbId)
        .then(({ error }) => { if (error) flash(L('No se pudo guardar', "Couldn't save")); });
    }
  };
  const patchLocal = (id: number, patch: Partial<Post>) =>
    setPosts((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const count = (s: Status) => posts.filter((p) => p.status === s).length;

  // Composer photo — same compressed-upload pipeline as the rest of the app.
  const pickPhoto = async (file: File | null | undefined) => {
    if (!file || !file.type.startsWith('image/') || photoBusy) return;
    setPhotoBusy(true);
    try {
      const url = !persistable || !user || !supabase ? URL.createObjectURL(file) : await uploadImage(file, user.id, 1200);
      setPhotoUrl(url);
    } catch { flash(L('No se pudo subir la foto.', "Couldn't upload the photo.")); }
    setPhotoBusy(false);
  };

  const resetComposer = () => { setDraft(''); setKind('news'); setPhotoUrl(''); setEditingId(null); setSchedOpen(false); setSchedAt(''); };

  // Create (or save an edit). Every status persists now — drafts/scheduled are
  // owner-private (RLS: the public only reads status='live').
  const create = async (status: Status, scheduledISO?: string) => {
    const title = draft.trim();
    if (!title) return flash(L('Escribe algo primero', 'Write something first'));
    // EDIT mode → save changes to the existing post
    if (editingId != null) {
      const target = posts.find((p) => p.id === editingId);
      if (target) {
        patchLocal(editingId, { es: title, en: title, kind, imageUrl: photoUrl || null });
        writeRow(target, { body_es: title, body_en: title, kind, image_url: photoUrl || null });
      }
      resetComposer();
      flash(L('Cambios guardados', 'Changes saved'));
      return;
    }
    const id = Math.max(0, ...posts.map((p) => p.id)) + 1;
    const post: Post = {
      id, kind, es: title, en: title, status, pinned: false,
      createdAt: new Date().toISOString(), scheduledAt: scheduledISO ?? null,
      views: 0, likes: 0, imageUrl: photoUrl || null,
    };
    setPosts([post, ...posts]);
    resetComposer();
    setTab(status === 'archived' ? 'all' : status);
    flash(
      status === 'live' ? L('Publicado en tu stream', 'Posted to your stream')
        : status === 'scheduled' ? L('Publicación programada', 'Post scheduled')
          : L('Guardado en borradores', 'Saved to drafts'),
    );
    if (persistable && real && supabase) {
      const { data } = await supabase
        .from('business_updates')
        .insert({
          business_id: real.id, kind, body_es: title, body_en: title,
          image_url: photoUrl || null, status, scheduled_at: scheduledISO ?? null,
        })
        .select('id')
        .single();
      const dbId = (data as { id: string } | null)?.id;
      if (dbId) setPosts((xs) => xs.map((x) => (x.id === id ? { ...x, dbId } : x)));
    }
  };

  // Per-card lifecycle actions — all real.
  const publishNow = (p: Post) => {
    patchLocal(p.id, { status: 'live', scheduledAt: null, createdAt: new Date().toISOString() });
    writeRow(p, { status: 'live', scheduled_at: null, created_at: new Date().toISOString() });
    flash(L('Publicado en tu stream', 'Posted to your stream'));
  };
  const archive = (p: Post) => {
    patchLocal(p.id, { status: 'archived', pinned: false });
    writeRow(p, { status: 'archived', pinned: false });
    flash(L('Publicación archivada', 'Post archived'));
  };
  const togglePin = (p: Post) => {
    const on = !p.pinned;
    // one pinned post at a time (Google Business behaviour)
    setPosts((xs) => xs.map((x) => (x.id === p.id ? { ...x, pinned: on } : on && x.pinned ? { ...x, pinned: false } : x)));
    if (on) posts.filter((x) => x.pinned && x.id !== p.id).forEach((x) => writeRow(x, { pinned: false }));
    writeRow(p, { pinned: on });
    flash(on ? L('Fijado arriba de tu stream', 'Pinned to the top') : L('Desfijado', 'Unpinned'));
  };
  const reuse = (p: Post) => {
    setDraft(p.es); setKind(p.kind); setPhotoUrl(p.imageUrl ?? ''); setEditingId(null);
    setTab('all');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    flash(L('Copiado al editor — publícalo cuando quieras', 'Copied to the composer — post when ready'));
  };
  const startEdit = (p: Post) => {
    setDraft(p.es); setKind(p.kind); setPhotoUrl(p.imageUrl ?? ''); setEditingId(p.id);
    setTab('all');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const remove = (p: Post) => {
    setPosts((xs) => xs.filter((x) => x.id !== p.id));
    if (persistable && p.dbId && supabase) supabase.from('business_updates').delete().eq('id', p.dbId).then(() => {});
    flash(L('Publicación eliminada', 'Post deleted'));
  };
  const reschedule = (p: Post, iso: string) => {
    patchLocal(p.id, { status: 'scheduled', scheduledAt: iso });
    writeRow(p, { status: 'scheduled', scheduled_at: iso });
    flash(L('Publicación reprogramada', 'Post rescheduled'));
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

  // REAL stream stats, computed from the rows (views come from the consumer tab).
  const live = posts.filter((p) => p.status === 'live');
  const totViews = live.reduce((n, p) => n + p.views, 0);
  const totLikes = live.reduce((n, p) => n + p.likes, 0);
  const engagement = totViews > 0 ? `${((totLikes / totViews) * 100).toFixed(1)}%` : '—';
  const perfStats = [
    { label: L('En vivo', 'Live posts'), value: String(live.length) },
    { label: L('Vistas', 'Views'), value: totViews.toLocaleString('en-US') },
    { label: L('Me gusta', 'Likes'), value: totLikes.toLocaleString('en-US') },
    { label: L('Interacción', 'Engagement'), value: engagement },
  ];
  const topPosts = [...live].sort((a, b) => b.views - a.views).slice(0, 3);

  const chip = (on: boolean) =>
    `tap-y flex-none cursor-pointer rounded-full px-3 py-2 text-[12.5px] ${on ? 'bg-primary font-extrabold text-white shadow-cta-sm' : 'bg-lilac-2 font-bold text-ink-soft'}`;
  const typeChip = (on: boolean) =>
    `tap-y cursor-pointer rounded-full px-2.5 py-1 text-[11px] ${on ? 'bg-primary font-extrabold text-white' : 'bg-lilac-2 font-bold text-muted'}`;
  const attach = (on: boolean) =>
    `tap-y flex cursor-pointer items-center gap-1.5 rounded-field border px-2.5 py-1.5 text-[11px] font-bold ${on ? 'border-primary bg-lilac text-primary-dark' : 'border-lilac-line bg-white text-muted'}`;

  // Default schedule suggestion: tomorrow 9:00 local, as a datetime-local value.
  const defaultSched = () => {
    const d = new Date(Date.now() + 86400000);
    d.setHours(9, 0, 0, 0);
    const p2 = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}`;
  };

  const composer = (
    <div className={`${cardCls} p-3.5`}>
      {editingId != null && (
        <div className="mb-2.5 flex items-center justify-between rounded-field bg-lilac-2 px-3 py-2">
          <span className="text-[11.5px] font-extrabold text-primary-dark">{L('Editando publicación', 'Editing post')}</span>
          <button onClick={resetComposer} className="cursor-pointer text-[11px] font-extrabold text-muted">{L('Cancelar', 'Cancel')}</button>
        </div>
      )}
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-btn bg-primary text-[12px] font-extrabold text-white">{ci.initials}</span>
        <div className="min-w-0 flex-1">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={L('¿Qué hay de nuevo en tu negocio? Oferta · evento · aviso…', "What's new? Offer · event · news…")}
            rows={2}
            maxLength={600}
            className="w-full resize-none rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2.5 text-[13px] font-medium leading-snug text-ink outline-none placeholder:text-muted focus:border-primary"
          />
          {photoUrl && (
            <div className="relative mt-2 w-fit">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imgUrl(photoUrl, ANCHO.tarjeta)} alt="" className="h-20 w-28 rounded-tile object-cover" />
              <button onClick={() => setPhotoUrl('')} aria-label={L('Quitar foto', 'Remove photo')} className="absolute -right-2 -top-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-ink text-white shadow-float"><X size={12} stroke={2.8} /></button>
            </div>
          )}
          <div className="mt-2.5 flex flex-wrap items-center gap-x-1 gap-y-[18px].5">
            <span className="text-[10.5px] font-bold text-muted">{L('Tipo:', 'Type:')}</span>
            {(['news', 'offer', 'event'] as Kind[]).map((k) => (
              <button key={k} onClick={() => setKind(k)} className={typeChip(kind === k)}>{kindLabel(k)}</button>
            ))}
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-[18px]">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { void pickPhoto(e.target.files?.[0]); e.target.value = ''; }} />
            <button onClick={() => fileRef.current?.click()} disabled={photoBusy} className={attach(!!photoUrl)}>
              <ImageIcon size={13} stroke={2} />{photoBusy ? L('Subiendo…', 'Uploading…') : L('Foto', 'Photo')}
            </button>
            <button onClick={() => setKind('offer')} className={attach(kind === 'offer')}><Tag size={13} stroke={2} />{L('Oferta', 'Offer')}</button>
          </div>
        </div>
      </div>
      <div className="mt-3 flex gap-2 border-t border-hair pt-3">
        {editingId == null ? (
          <>
            <button onClick={() => void create('draft')} className="tap-y cursor-pointer rounded-field border-[1.5px] border-lilac-line bg-white px-3.5 py-2.5 text-[11.5px] font-extrabold text-ink">
              {L('Borrador', 'Draft')}
            </button>
            <button onClick={() => { setSchedAt(defaultSched()); setSchedOpen(true); }} className="tap-y flex cursor-pointer items-center gap-1.5 rounded-field border-[1.5px] border-lilac-line bg-white px-3.5 py-2.5 text-[11.5px] font-extrabold text-primary-dark">
              <Calendar size={13} stroke={2.2} />{L('Programar', 'Schedule')}
            </button>
            <button
              onClick={() => void create('live')}
              disabled={!draft.trim()}
              className={`tap-y flex-1 rounded-field py-2.5 text-[12.5px] font-extrabold text-white ${draft.trim() ? 'cursor-pointer bg-primary shadow-cta-sm' : 'cursor-not-allowed bg-lilac-line'}`}
            >
              {L('Publicar', 'Post now')}
            </button>
          </>
        ) : (
          <button
            onClick={() => void create('live')}
            disabled={!draft.trim()}
            className={`tap-y flex-1 rounded-field py-2.5 text-[12.5px] font-extrabold text-white ${draft.trim() ? 'cursor-pointer bg-primary shadow-cta-sm' : 'cursor-not-allowed bg-lilac-line'}`}
          >
            {L('Guardar cambios', 'Save changes')}
          </button>
        )}
      </div>
    </div>
  );

  const perfCard = (
    <div className={`${cardCls} p-4`}>
      <div className="mb-3 text-[13px] font-extrabold text-ink">{L('Rendimiento del stream', 'Stream performance')}</div>
      <div className="grid grid-cols-2 gap-2.5">
        {perfStats.map((p) => (
          <div key={p.label} className="rounded-btn-lg bg-app p-3">
            <div className="text-[10px] font-bold text-muted">{p.label}</div>
            <div className="mt-0.5 text-[18px] font-extrabold text-ink">{p.value}</div>
          </div>
        ))}
      </div>
      <div className="mt-2.5 text-[10px] font-medium leading-snug text-muted-2">
        {L('Vistas y me gusta reales de tus clientes en tu página pública.', 'Real views & likes from customers on your public page.')}
      </div>
    </div>
  );

  const topCard = topPosts.length > 0 && totViews > 0 ? (
    <div className={`${cardCls} p-4`}>
      <div className="mb-3 text-[13px] font-extrabold text-ink">{L('Top publicaciones', 'Top posts')}</div>
      <div className="flex flex-col gap-2.5">
        {topPosts.map((p) => (
          <div key={p.id} className="flex items-center gap-2.5">
            <span className="h-8 w-8 flex-none overflow-hidden rounded-lg" style={{ background: `repeating-linear-gradient(135deg,${KIND_TILE[p.kind]})` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {p.imageUrl && <img src={imgUrl(p.imageUrl, ANCHO.tarjeta)} alt="" className="h-full w-full object-cover" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] font-bold text-ink">{L(p.es, p.en)}</span>
              <span className="block text-[9.5px] font-semibold text-muted-2">{p.views.toLocaleString('en-US')} {L('vistas', 'views')} · {p.likes} ♥</span>
            </span>
            <span className={`flex-none rounded px-1.5 py-px text-[8px] font-extrabold ${KIND_BADGE[p.kind]}`}>{kindLabel(p.kind)}</span>
          </div>
        ))}
      </div>
    </div>
  ) : null;

  const postList = (
    <div className="flex flex-col gap-3">
      {visible.length === 0 ? (
        <div className={`${cardCls} p-9 text-center`}>
          <div className="text-[13px] font-semibold leading-relaxed text-muted">{L('Aún no hay publicaciones aquí. Usa el editor de arriba para crear una.', 'No posts here yet. Use the composer above to create one.')}</div>
        </div>
      ) : (
        visible.map((p) => (
          <div key={p.id} className={`overflow-hidden rounded-card-sm border bg-white ${p.pinned ? 'border-[rgba(244,183,64,.4)]' : 'border-line'}`}>
            <div className="flex items-start justify-between gap-2 p-3.5 pb-0">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[10px] bg-primary text-[11px] font-extrabold text-white">{ci.initials}</span>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="text-[12px] font-extrabold text-ink">{ci.name.split(' ')[0]}</span>
                    {!isFree && <VerifiedBadge size={13} />}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-1 gap-y-[18px].5">
                    {p.pinned && <span className="rounded bg-amber-bg px-1.5 py-px text-[8px] font-extrabold text-amber-ink">📌 {L('Fijado', 'Pinned')}</span>}
                    <span className="text-[9.5px] font-semibold text-muted-2">
                      {p.status === 'scheduled' ? schedLabel(p.scheduledAt, es, L)
                        : p.status === 'draft' ? L('Borrador', 'Draft')
                          : p.status === 'archived' ? L('Archivado', 'Archived')
                            : rel(p.createdAt, L)}
                    </span>
                    <span className={`rounded px-1.5 py-px text-[8px] font-extrabold ${KIND_BADGE[p.kind]}`}>{kindLabel(p.kind)}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setMenuFor(p)} className="flex h-7 w-7 flex-none cursor-pointer items-center justify-center rounded-lg bg-app text-muted-2" aria-label={L('Opciones', 'Options')}>
                <MoreHorizontal size={15} />
              </button>
            </div>

            <div className="whitespace-pre-line px-3.5 pt-2.5 text-[13.5px] font-bold leading-snug text-ink">{L(p.es, p.en)}</div>
            {p.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imgUrl(p.imageUrl, ANCHO.ancha)} alt="" className="mx-3.5 mt-3 max-h-[220px] w-[calc(100%-28px)] rounded-tile object-cover" />
            ) : null}

            {p.status === 'live' ? (
              <div className="flex flex-wrap items-center gap-4 px-3.5 py-3 text-[10.5px] font-bold text-muted">
                <span className="flex items-center gap-1"><Eye_ /> {p.views.toLocaleString('en-US')}</span>
                <span className="flex items-center gap-1 text-pink"><Heart size={13} /> {p.likes}</span>
              </div>
            ) : (
              <div className="mt-2 flex justify-end gap-2 border-t border-hair px-3.5 py-3">
                {p.status === 'scheduled' && (
                  <>
                    <button onClick={() => { setReschedFor(p); setSchedAt(p.scheduledAt ? p.scheduledAt.slice(0, 16) : defaultSched()); }} className="tap-y cursor-pointer rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2 text-[10.5px] font-extrabold text-ink">
                      {L('Reprogramar', 'Reschedule')}
                    </button>
                    <button onClick={() => publishNow(p)} className="tap-y flex cursor-pointer items-center gap-1 rounded-field bg-primary px-3 py-2 text-[10.5px] font-extrabold text-white shadow-cta-sm"><Zap size={12} stroke={2.4} />{L('Publicar', 'Post now')}</button>
                  </>
                )}
                {p.status === 'draft' && (
                  <>
                    <button onClick={() => setConfirmDel(p)} className="tap tap-y flex cursor-pointer items-center gap-1 rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2 text-[10.5px] font-extrabold text-ink"><Trash2 size={12} stroke={2.2} />{L('Eliminar', 'Delete')}</button>
                    <button onClick={() => startEdit(p)} className="tap-y flex cursor-pointer items-center gap-1 rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2 text-[10.5px] font-extrabold text-ink"><Pencil size={12} stroke={2.2} />{L('Editar', 'Edit')}</button>
                    <button onClick={() => publishNow(p)} className="tap-y cursor-pointer rounded-field bg-primary px-3 py-2 text-[10.5px] font-extrabold text-white shadow-cta-sm">{L('Publicar', 'Publish')}</button>
                  </>
                )}
                {p.status === 'archived' && (
                  <button onClick={() => reuse(p)} className="tap-y flex cursor-pointer items-center gap-1 rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2 text-[10.5px] font-extrabold text-ink"><RefreshCw size={12} stroke={2.2} />{L('Reusar', 'Re-run')}</button>
                )}
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
      <div className="-my-1.5 py-1.5 no-scrollbar -mx-1 mb-4 flex gap-2 min-w-0 overflow-x-auto px-1">
        {tabs.map(([k, label, n]) => (
          <button key={k} onClick={() => setTab(k)} className={chip(tab === k)}>
            {label}
            {n != null && <span className={`ml-1.5 font-extrabold ${tab === k ? 'text-white/80' : 'text-muted-2'}`}>{n}</span>}
          </button>
        ))}
      </div>

      <div className="grid items-start gap-4 [&>*]:min-w-0 xl:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          {showComposer && composer}
          {postList}
        </div>
        {showPerf && (
          <div className="flex flex-col gap-4 xl:sticky xl:top-[74px]">
            {perfCard}
            {topCard}
          </div>
        )}
      </div>

      {/* schedule picker (composer "Programar" + card "Reprogramar") */}
      <Overlay open={schedOpen || reschedFor != null} onClose={() => { setSchedOpen(false); setReschedFor(null); }} width={400}>
        <OverlayTitle title={reschedFor ? L('Reprogramar publicación', 'Reschedule post') : L('Programar publicación', 'Schedule post')} onClose={() => { setSchedOpen(false); setReschedFor(null); }} />
        <div className="mb-1.5 text-[11px] font-extrabold text-ink-soft">{L('Fecha y hora de publicación', 'Publish date & time')}</div>
        <input
          type="datetime-local"
          value={schedAt}
          min={new Date().toISOString().slice(0, 16)}
          onChange={(e) => setSchedAt(e.target.value)}
          className="w-full rounded-field border-[1.5px] border-lilac-line bg-white px-3.5 py-3 text-[13px] font-semibold text-ink outline-none focus:border-primary"
        />
        <div className="mt-2 text-[10.5px] font-medium leading-snug text-muted">
          {L('Se publicará automáticamente al abrir tu panel después de esa hora.', "It publishes automatically when you open your panel after that time.")}
        </div>
        <button
          onClick={() => {
            const d = new Date(schedAt);
            if (!schedAt || isNaN(d.getTime()) || d.getTime() <= Date.now()) { flash(L('Elige una fecha futura', 'Pick a future time')); return; }
            if (reschedFor) { reschedule(reschedFor, d.toISOString()); setReschedFor(null); }
            else { void create('scheduled', d.toISOString()); setSchedOpen(false); }
          }}
          className="mt-4 w-full cursor-pointer rounded-field bg-primary py-3 text-[13px] font-extrabold text-white shadow-cta-sm"
        >
          {reschedFor ? L('Guardar nueva fecha', 'Save new time') : L('Programar', 'Schedule')}
        </button>
      </Overlay>

      {/* ⋯ actions sheet */}
      <Overlay open={menuFor != null} onClose={() => setMenuFor(null)} width={380}>
        {menuFor && (
          <>
            <OverlayTitle title={L('Opciones de la publicación', 'Post options')} onClose={() => setMenuFor(null)} />
            <div className="flex flex-col gap-2">
              {menuFor.status === 'live' && (
                <button onClick={() => { togglePin(menuFor); setMenuFor(null); }} className="flex cursor-pointer items-center gap-3 rounded-field border-[1.5px] border-lilac-line bg-white px-3.5 py-3 text-left text-[13px] font-extrabold text-ink">
                  <Pin size={16} stroke={2.2} className="text-primary-dark" />{menuFor.pinned ? L('Desfijar', 'Unpin') : L('Fijar arriba', 'Pin to top')}
                </button>
              )}
              <button onClick={() => { startEdit(menuFor); setMenuFor(null); }} className="flex cursor-pointer items-center gap-3 rounded-field border-[1.5px] border-lilac-line bg-white px-3.5 py-3 text-left text-[13px] font-extrabold text-ink">
                <Pencil size={16} stroke={2.2} className="text-primary-dark" />{L('Editar', 'Edit')}
              </button>
              {menuFor.status === 'live' && (
                <button onClick={() => { archive(menuFor); setMenuFor(null); }} className="flex cursor-pointer items-center gap-3 rounded-field border-[1.5px] border-lilac-line bg-white px-3.5 py-3 text-left text-[13px] font-extrabold text-ink">
                  <Archive size={16} stroke={2.2} className="text-primary-dark" />{L('Archivar', 'Archive')}
                </button>
              )}
              <button onClick={() => { setConfirmDel(menuFor); setMenuFor(null); }} className="flex cursor-pointer items-center gap-3 rounded-field border-[1.5px] border-pink-bg bg-white px-3.5 py-3 text-left text-[13px] font-extrabold text-pink-dark">
                <Trash2 size={16} stroke={2.2} />{L('Eliminar', 'Delete')}
              </button>
            </div>
          </>
        )}
      </Overlay>

      <ConfirmDialog
        open={confirmDel != null}
        onClose={() => setConfirmDel(null)}
        onConfirm={() => { if (confirmDel) remove(confirmDel); setConfirmDel(null); }}
        title={L('¿Eliminar publicación?', 'Delete post?')}
        message={L('Se quitará de tu página pública. Esta acción no se puede deshacer.', "It will be removed from your public page. This can't be undone.")}
        confirmLabel={L('Eliminar', 'Delete')}
        cancelLabel={L('Cancelar', 'Cancel')}
      />

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl bg-ink px-4 py-3 text-[12.5px] font-bold text-white shadow-modal">
          <Check size={14} stroke={2.6} className="text-[#7BE0A8]" />
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
