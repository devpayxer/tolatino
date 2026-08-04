'use client';

// Inicio (DashboardHome) — the panel home. A cockpit built on the founder's
// product truth: the LISTING is the master (be found + reputation), SELLING is
// an optional add-on. Everything here is REAL for a signed-in business
// (business_orders / reviews / business_conversations / bookings, listing
// completeness from the businesses row, page views from business_metrics 0077);
// demo mode shows a sample cockpit so the panel stays explorable. NO fabricated
// numbers for a real business (non-negotiable #8). Discovery beyond views
// (searches / directions / saves) is not tracked yet — shown as "soon".

import { useEffect, useMemo, useState } from 'react';
import {
  IconBell as Bell, IconCircleCheck as CircleCheck, IconChevronRight as ChevronRight, IconClock as Clock,
  IconCreditCard as CreditCard, IconEye as Eye, IconHeart as Heart, IconLink as Link2, IconMapPin as MapPin, IconMessageCircle as MessageCircle,
  IconNavigation as Navigation, IconPackage as Package, IconPhone as Phone, IconPhoto as Photo,
  IconPlayerPause as Pause, IconSpeakerphone as Megaphone,
  IconSparkles as Sparkles, IconStar as Star, IconShoppingBag as ShoppingBag, IconShoppingCart as Cart,
  IconTicket as Ticket, IconToolsKitchen2 as Utensils,
} from '@tabler/icons-react';
import { supabase } from '@/lib/supabase';
import { useBizAdmin } from '@/lib/bizAdmin';
import { fetchBusinessMetrics, tzDayKeys } from '@/lib/live';
import { activeMods, type PanelCtx, type TabKey } from '@/screens/negocio/tabs';

const card = 'rounded-card-sm border border-hair bg-white shadow-card';

type OrderRow = { id: string; code: string | null; customer: string | null; items: { name: string; qty: number }[]; total: number; channel: string; status: string; created_at: string };
type ReviewRow = { id: string; name: string; rating: number; replied: boolean; created_at: string };

const money = (n: number) => '$' + n.toFixed(2);
const smeDay = (d: string) => { const x = new Date(d); const t = new Date(); return x.getFullYear() === t.getFullYear() && x.getMonth() === t.getMonth() && x.getDate() === t.getDate(); };

export function DashboardHome({ ctx }: { ctx: PanelCtx }) {
  const { L, es, isFree, go, photoCount } = ctx;
  const admin = useBizAdmin();
  const real = admin.active;
  const persistable = !admin.demo && !!real;
  const am = activeMods(ctx);
  const sells = am.menu || am.services || am.products || am.rental || am.events;
  // Selling needs Stripe; until connected, the listing is catalog-only (0071).
  const canCharge = !!real?.connect_charges_enabled;

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [todayBookings, setTodayBookings] = useState(0);
  const [metrics, setMetrics] = useState<{ day: string; kind: string; count: number }[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    let cancelled = false;
    if (!persistable || !real || !supabase) {
      // demo: a believable sample cockpit (explore mode only, never a real biz)
      if (admin.demo) {
        const nowIso = new Date().toISOString();
        setOrders([
          { id: 'd1', code: '#2491', customer: 'María L.', items: [{ name: 'Quesabirria', qty: 2 }], total: 48.2, channel: 'delivery', status: 'new', created_at: nowIso },
          { id: 'd2', code: '#2492', customer: es ? 'Mesa 4' : 'Table 4', items: [{ name: 'Tacos al pastor', qty: 3 }], total: 26.5, channel: 'dinein', status: 'new', created_at: nowIso },
          { id: 'd3', code: '#2490', customer: 'Juan M.', items: [{ name: 'Combo familiar', qty: 1 }], total: 32, channel: 'pickup', status: 'preparing', created_at: nowIso },
          { id: 'd4', code: '#2489', customer: 'Ana F.', items: [{ name: 'Torta ahogada', qty: 1 }], total: 18, channel: 'dinein', status: 'completed', created_at: nowIso },
        ]);
        setReviews([{ id: 'r1', name: 'James T.', rating: 4, replied: false, created_at: nowIso }, { id: 'r2', name: 'Ana L.', rating: 5, replied: false, created_at: nowIso }, { id: 'r3', name: 'Luis R.', rating: 5, replied: false, created_at: nowIso }]);
        setUnread(1); setTodayBookings(3);
      }
      return;
    }
    (async () => {
      const since = new Date(); since.setDate(since.getDate() - 8);
      const [ord, rev, conv, book, mtr] = await Promise.all([
        supabase!.from('business_orders').select('id,code,customer_name,items,total,channel,status,created_at').eq('business_id', real.id).gte('created_at', since.toISOString()).order('created_at', { ascending: false }).limit(200),
        supabase!.from('reviews').select('id,author_name,rating,replied_at,created_at').eq('business_id', real.id).order('created_at', { ascending: false }).limit(50),
        supabase!.from('business_conversations').select('unread').eq('business_id', real.id),
        am.services ? supabase!.from('business_bookings').select('starts_at,status').eq('business_id', real.id).limit(200) : Promise.resolve({ data: [] as unknown[] }),
        fetchBusinessMetrics(real.slug, 7),
      ]);
      if (cancelled) return;
      setMetrics(mtr as { day: string; kind: string; count: number }[]);
      setOrders(((ord.data as Record<string, unknown>[]) ?? []).map((r) => ({ id: String(r.id), code: (r.code as string) ?? null, customer: (r.customer_name as string) ?? null, items: Array.isArray(r.items) ? (r.items as { name: string; qty: number }[]) : [], total: Number(r.total ?? 0), channel: String(r.channel ?? ''), status: String(r.status ?? 'new'), created_at: String(r.created_at ?? '') })));
      setReviews(((rev.data as Record<string, unknown>[]) ?? []).map((r) => ({ id: String(r.id), name: String(r.author_name ?? 'Cliente'), rating: Number(r.rating ?? 0), replied: r.replied_at != null, created_at: String(r.created_at ?? '') })));
      setUnread(((conv.data as Record<string, unknown>[]) ?? []).reduce((s, c) => s + (Number(c.unread ?? 0) > 0 ? 1 : 0), 0));
      const bk = ((book as { data?: Record<string, unknown>[] }).data) ?? [];
      setTodayBookings(bk.filter((b) => b.status !== 'cancelled' && smeDay(String(b.starts_at))).length);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [real?.id, persistable, admin.demo, am.services, es]);

  // ── derived (real math) ──────────────────────────────────────────────────
  const todayOrders = orders.filter((o) => o.status !== 'cancelled' && smeDay(o.created_at));
  const salesToday = todayOrders.reduce((s, o) => s + o.total, 0);
  const active = orders.filter((o) => ['new', 'preparing', 'ready'].includes(o.status));
  const newCount = orders.filter((o) => o.status === 'new').length;
  const unreplied = reviews.filter((r) => !r.replied).length;
  // Sin negocio real el panel ya no se dibuja (compuerta en Panel.tsx), pero los
  // respaldos fabricados se eliminan igual: '4.8' / 128 reseñas / 'Taquería La
  // Esperanza' hacían creer al dueño que tenía un negocio verificado (regla #8).
  const rating = (real?.reviews_count ?? 0) > 0 ? Number(real?.rating).toFixed(1) : '—';
  const reviewsCount = real?.reviews_count ?? 0;

  // 7-day sales series (real)
  const series = useMemo(() => {
    const days: number[] = new Array(7).fill(0);
    const base = new Date(); base.setHours(0, 0, 0, 0);
    for (const o of orders) {
      if (o.status === 'cancelled') continue;
      const d = new Date(o.created_at); d.setHours(0, 0, 0, 0);
      const diff = Math.round((base.getTime() - d.getTime()) / 86400000);
      if (diff >= 0 && diff < 7) days[6 - diff] += o.total;
    }
    return days;
  }, [orders]);
  const week = series.reduce((s, n) => s + n, 0);

  // listing completeness (real)
  const completeness = useMemo(() => {
    if (!real) return 85;
    const checks = [!!real.name, !!real.logo_url, (photoCount ?? 0) > 0, !!real.about_es, Array.isArray(real.hours) && real.hours.some((d) => d && d.length > 0), !!real.phone, !!real.address];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [real, photoCount]);

  // page views (0077 — every view counts). Bars key by the BUSINESS-local day
  // (0079) so they line up exactly with the DB's biz-tz rollup (no edge drift).
  const viewByDay = new Map(metrics.filter((m) => m.kind === 'view').map((m) => [m.day.slice(0, 10), m.count]));
  const realSeries = tzDayKeys(real?.timezone ?? 'America/Chicago', 7).map((k) => viewByDay.get(k) ?? 0);
  const viewsSeries = real ? realSeries : admin.demo ? [18, 24, 20, 31, 27, 42, 38] : realSeries;
  const views7 = real ? metrics.filter((m) => m.kind === 'view').reduce((s, m) => s + m.count, 0) : viewsSeries.reduce((s, n) => s + n, 0);
  const viewsToday = viewsSeries[6];
  const maxV = Math.max(...viewsSeries, 1);

  // Customer actions (Google-Business style): saves (♥), directions, calls —
  // real 7-day sums (0078). Demo shows a believable sample; a real biz shows only
  // what actually happened (0 until a customer acts). 'search' is still deferred.
  const sumKind = (k: string) => metrics.filter((m) => m.kind === k).reduce((s, m) => s + m.count, 0);
  const saves7 = real ? sumKind('save') : admin.demo ? 12 : 0;
  const dirs7 = real ? sumKind('direction') : admin.demo ? 7 : 0;
  const calls7 = real ? sumKind('call') : admin.demo ? 4 : 0;
  const actions: { icon: typeof Heart; label: string; n: number; bg: string; c: string }[] = [
    { icon: Heart, label: L('Guardados', 'Saves'), n: saves7, bg: 'bg-pink-bg', c: 'text-pink-dark' },
    { icon: Navigation, label: L('Cómo llegar', 'Directions'), n: dirs7, bg: 'bg-amber-bg', c: 'text-amber-ink' },
    { icon: Phone, label: L('Llamadas', 'Calls'), n: calls7, bg: 'bg-green-bg', c: 'text-green-dark' },
  ];

  const dateStr = mounted ? new Date().toLocaleDateString(es ? 'es-ES' : 'en-US', { weekday: 'long', day: 'numeric', month: 'short' }) : '';
  const name = real?.name ?? '';

  // ── attention items (real signals only) ──────────────────────────────────
  type Todo = { icon: typeof Bell; bg: string; c: string; title: string; sub: string; btn: string; tab: TabKey };
  const todos: Todo[] = [];
  if (sells && newCount > 0) todos.push({ icon: Bell, bg: 'bg-pink-bg', c: 'text-pink-dark', title: L(`${newCount} ${newCount === 1 ? 'pedido' : 'pedidos'} por confirmar`, `${newCount} order${newCount === 1 ? '' : 's'} to confirm`), sub: L('Acéptalos antes de que el cliente espere', 'Accept before the customer waits'), btn: L('Ver', 'View'), tab: 'orders' });
  if (unreplied > 0) todos.push({ icon: Star, bg: 'bg-amber-bg', c: 'text-amber-ink', title: L(`${unreplied} ${unreplied === 1 ? 'reseña' : 'reseñas'} sin responder`, `${unreplied} review${unreplied === 1 ? '' : 's'} to answer`), sub: L('Responder mejora tu posición en el directorio', 'Replying boosts your ranking'), btn: L('Responder', 'Reply'), tab: 'reviews' });
  if (unread > 0) todos.push({ icon: MessageCircle, bg: 'bg-lilac', c: 'text-primary-dark', title: L(`${unread} ${unread === 1 ? 'mensaje' : 'mensajes'} sin leer`, `${unread} unread message${unread === 1 ? '' : 's'}`), sub: L('Un cliente está esperando tu respuesta', 'A customer is waiting for you'), btn: L('Abrir', 'Open'), tab: 'messages' });

  // ── visibility prompts (real gaps) ───────────────────────────────────────
  type Grow = { icon: typeof Photo; bg: string; c: string; title: string; sub: string; tab: TabKey };
  const grows: Grow[] = [];
  // Sells but only cash → nudge (not alarm) to accept card payments online.
  if (sells && real && !canCharge) grows.push({ icon: CreditCard, bg: 'bg-blue-bg', c: 'text-blue', title: L('Acepta pagos con tarjeta', 'Accept card payments'), sub: L('Hoy cobras en efectivo · conecta Stripe para vender en línea', 'You take cash today · connect Stripe to sell online'), tab: 'payments' });
  if ((photoCount ?? 0) < 5) grows.push({ icon: Photo, bg: 'bg-blue-bg', c: 'text-blue', title: L('Agrega más fotos', 'Add more photos'), sub: L('Los negocios con 5+ fotos reciben 2× visitas', 'Listings with 5+ photos get 2× visits'), tab: 'photos' });
  if (real && !real.about_es) grows.push({ icon: Sparkles, bg: 'bg-lilac', c: 'text-primary-dark', title: L('Escribe tu descripción', 'Write your description'), sub: L('Cuenta tu historia a la comunidad', 'Tell the community your story'), tab: 'listing' });
  if (real && !(Array.isArray(real.hours) && real.hours.some((d) => d && d.length > 0))) grows.push({ icon: Clock, bg: 'bg-green-bg', c: 'text-green-dark', title: L('Configura tu horario', 'Set your hours'), sub: L('Que no lleguen cuando estás cerrado', 'So no one arrives when you’re closed'), tab: 'hours' });
  grows.push({ icon: Megaphone, bg: 'bg-amber-bg', c: 'text-amber-ink', title: L('Publica una novedad', 'Post an update'), sub: L('Mantente fresco en el feed de la comunidad', 'Stay fresh in the community feed'), tab: 'updates' });
  const growList = grows.slice(0, 3);

  // ── quick actions ─────────────────────────────────────────────────────────
  const catalog: [TabKey, typeof Utensils, string] = am.menu ? ['menu', Utensils, L('Nuevo platillo', 'New item')] : am.products ? ['products', Package, L('Nuevo producto', 'New product')] : am.services ? ['services', Utensils, L('Nuevo servicio', 'New service')] : ['photos', Photo, L('Subir foto', 'Upload photo')];
  const quick: [TabKey, typeof Utensils, string, string][] = sells
    ? [[catalog[0], catalog[1], catalog[2], 'bg-amber-bg text-amber-ink'], ['updates', Megaphone, L('Novedad', 'Update'), 'bg-lilac text-primary-dark'], am.events ? ['events', Ticket, L('Crear evento', 'New event'), 'bg-green-bg text-green-dark'] : ['photos', Photo, L('Subir fotos', 'Add photos'), 'bg-green-bg text-green-dark'], ['listing', Link2, L('Mi página', 'My page'), 'bg-blue-bg text-blue']]
    : [['photos', Photo, L('Subir fotos', 'Add photos'), 'bg-blue-bg text-blue'], ['updates', Megaphone, L('Novedad', 'Update'), 'bg-lilac text-primary-dark'], ['hours', Clock, L('Horario', 'Hours'), 'bg-green-bg text-green-dark'], ['listing', Link2, L('Mi página', 'My page'), 'bg-amber-bg text-amber-ink']];

  // recent activity (real)
  const recent = orders.slice(0, 4);

  // ── UI helpers ────────────────────────────────────────────────────────────
  const Sec = ({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) => (
    <div className="mt-1 flex items-center justify-between px-0.5">
      <h2 className="text-[14px] font-extrabold tracking-[-.01em] text-ink">{title}</h2>
      {action && <button onClick={onAction} className="tap-y cursor-pointer text-[11.5px] font-extrabold text-primary-dark">{action} ›</button>}
    </div>
  );
  const Kpi = ({ label, value, sub, subC }: { label: string; value: string; sub?: string; subC?: string }) => (
    <div className={`${card} p-3.5`}>
      <div className="text-[10px] font-bold text-muted-2">{label}</div>
      <div className="mt-0.5 text-[20px] font-extrabold tracking-[-.02em] text-ink">{value}</div>
      {sub && <div className={`mt-0.5 text-[9.5px] font-extrabold ${subC ?? 'text-muted-2'}`}>{sub}</div>}
    </div>
  );

  return (
    <div className="mx-auto flex max-w-[880px] flex-col gap-3.5">
      {/* greeting */}
      <div className="px-0.5">
        <div className="text-[12px] font-bold capitalize text-muted-2">{dateStr}</div>
        <h1 className="text-[22px] font-extrabold tracking-[-.02em] text-ink md:text-[26px]">{L('Hola', 'Hi')}, {name}</h1>
      </div>

      {/* status */}
      <div className={`${card} flex items-center gap-3 p-3.5`}>
        <span className={`flex h-11 w-11 flex-none items-center justify-center rounded-btn ${real ? (real.is_open ? 'bg-green-bg' : 'bg-amber-bg') : 'bg-green-bg'}`}>
          {sells ? <span className={`h-3.5 w-3.5 rounded-full ${real && !real.is_open ? 'bg-amber' : 'bg-green'}`} /> : <MapPin size={19} stroke={2.2} className="text-green-dark" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-extrabold text-ink">{real ? (real.is_open ? L('Abierto · recibiendo clientes', 'Open · receiving customers') : L('Cerrado ahora', 'Closed now')) : L('Publicado y visible en To’Latino', 'Published & visible on To’Latino')}</div>
          <div className="mt-0.5 text-[11px] font-semibold text-muted">{completeness < 100 ? L(`Tu página está ${completeness}% completa`, `Your page is ${completeness}% complete`) : L('Tu página está completa', 'Your page is complete')}</div>
          {completeness < 100 && <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-lilac-line"><span className="block h-full rounded-full bg-primary" style={{ width: `${completeness}%` }} /></div>}
        </div>
        {sells && real && <button className="tap-y flex-none cursor-pointer rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2 text-[11.5px] font-extrabold text-ink-soft"><Pause size={12} stroke={2.4} className="mr-1 inline" />{L('Pausar', 'Pause')}</button>}
      </div>

      {/* requiere tu atención */}
      <Sec title={L('Requiere tu atención', 'Needs your attention')} />
      {todos.length > 0 ? (
        <div className={`${card} overflow-hidden`}>
          {todos.map((t, i) => (
            <div key={i} className={`flex items-center gap-3 px-3.5 py-3 ${i < todos.length - 1 ? 'border-b border-hair' : ''}`}>
              <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-[10px] ${t.bg}`}><t.icon size={16} stroke={2.2} className={t.c} /></span>
              <div className="min-w-0 flex-1"><div className="text-[12.5px] font-extrabold text-ink">{t.title}</div><div className="mt-0.5 truncate text-[10.5px] font-semibold text-muted">{t.sub}</div></div>
              <button onClick={() => go(t.tab)} className={`flex-none cursor-pointer rounded-[9px] px-3 py-2 text-[10.5px] font-extrabold ${i === 0 ? 'bg-primary text-white shadow-cta-sm' : 'bg-lilac text-primary-dark'}`}>{t.btn}</button>
            </div>
          ))}
        </div>
      ) : (
        <div className={`${card} flex items-center gap-3 p-3.5`}><span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-green-bg"><CircleCheck size={17} stroke={2.2} className="text-green-dark" /></span><div><div className="text-[12.5px] font-extrabold text-ink">{L('Todo al día', 'All caught up')}</div><div className="text-[10.5px] font-semibold text-muted">{L('Sin pendientes por ahora', 'Nothing pending right now')}</div></div></div>
      )}

      {/* KPIs */}
      <Sec title={sells ? L('Hoy', 'Today') : L('Tu listado', 'Your listing')} action={L('Ver más', 'More')} onAction={() => go(sells ? 'orders' : 'reviews')} />
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        {sells ? (
          <>
            <Kpi label={L('Ventas de hoy', 'Sales today')} value={money(salesToday)} sub={todayOrders.length > 0 ? L(`${todayOrders.length} pedidos`, `${todayOrders.length} orders`) : L('Aún sin ventas hoy', 'No sales yet today')} />
            <Kpi label={L('Pedidos de hoy', 'Orders today')} value={String(todayOrders.length)} sub={active.length > 0 ? L(`${active.length} en curso`, `${active.length} in progress`) : undefined} subC="text-primary-dark" />
            {am.services
              ? <Kpi label={L('Reservas de hoy', 'Bookings today')} value={String(todayBookings)} />
              : <Kpi label={L('En curso', 'In progress')} value={String(active.length)} />}
            <Kpi label={L('Reseñas', 'Reviews')} value={`${rating}★`} sub={L(`${reviewsCount} en total`, `${reviewsCount} total`)} />
          </>
        ) : (
          <>
            <Kpi label={L('Vistas · 7 días', 'Views · 7 days')} value={views7.toLocaleString()} sub={views7 > 0 ? L(`${viewsToday} hoy`, `${viewsToday} today`) : L('comparte tu página', 'share your page')} subC="text-primary-dark" />
            <Kpi label={L('Calificación', 'Rating')} value={`${rating}★`} sub={L(`${reviewsCount} reseñas`, `${reviewsCount} reviews`)} />
            <Kpi label={L('Fotos', 'Photos')} value={String(photoCount ?? 0)} />
            <Kpi label={L('Perfil', 'Profile')} value={`${completeness}%`} sub={completeness < 100 ? L('completa el resto', 'finish it') : L('completo', 'complete')} subC="text-green-dark" />
          </>
        )}
      </div>

      {/* discovery — REAL page views (0077). Core value: how they find you.
          Sits high (right after KPIs) — the listing/discovery is the master. */}
      <Sec title={L('Cómo te encuentran', 'How they find you')} action={L('Ver estadísticas', 'View insights')} onAction={() => go('stats')} />
      <div className={`${card} p-3.5`}>
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-2"><Eye size={12} stroke={2.4} className="text-primary-dark" />{L('Vistas de tu página · 7 días', 'Page views · 7 days')}</div>
            <div className="mt-0.5 text-[24px] font-extrabold tracking-[-.02em] text-ink">{views7.toLocaleString()}</div>
          </div>
          {views7 > 0 && <div className="text-[10.5px] font-extrabold text-muted-2">{L(`${viewsToday} hoy`, `${viewsToday} today`)}</div>}
        </div>
        {views7 > 0 ? (
          <div className="mt-2.5 flex h-[40px] items-end gap-1.5">
            {viewsSeries.map((v, i) => <span key={i} className="flex-1 rounded-t-[3px]" style={{ height: `${Math.max(6, (v / maxV) * 100)}%`, background: i === 6 ? '#7B61FF' : '#E2DEF4' }} />)}
          </div>
        ) : (
          <div className="mt-1 text-[11px] font-semibold text-muted">{L('Aún sin vistas esta semana. Comparte tu página para que te descubran.', 'No views yet this week. Share your page so people discover you.')}</div>
        )}
        {/* customer actions (Google-Business style) — what people DO after finding you */}
        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-hair pt-3">
          {actions.map((a) => (
            <div key={a.label} className="flex flex-col items-center gap-1 text-center">
              <span className={`flex h-8 w-8 items-center justify-center rounded-[10px] ${a.bg}`}><a.icon size={15} stroke={2.3} className={a.c} /></span>
              <div className="text-[16px] font-extrabold leading-none tracking-[-.02em] text-ink">{a.n.toLocaleString()}</div>
              <div className="text-[9.5px] font-bold leading-tight text-muted-2">{a.label}</div>
            </div>
          ))}
        </div>
        <div className="mt-2.5 text-[9.5px] font-semibold text-muted-2">{L('Vistas y acciones de 7 días · tus propias visitas no cuentan · búsquedas y más en Estadísticas.', '7-day views & actions · your own visits don’t count · searches & more in Insights.')}</div>
      </div>

      {/* live queue (seller, real) */}
      {sells && active.length > 0 && (
        <>
          <Sec title={L('Pedidos en curso', 'Orders in progress')} action={L('Abrir', 'Open')} onAction={() => go('orders')} />
          <div className={`${card} p-3.5`}>
            {active.slice(0, 4).map((o, i) => (
              <div key={o.id} className={`flex items-center gap-2.5 py-2.5 ${i < Math.min(active.length, 4) - 1 ? 'border-b border-dashed border-hair' : ''}`}>
                <span className={`flex-none rounded-[7px] px-2 py-1 text-[8.5px] font-extrabold ${o.status === 'new' ? 'bg-pink-bg text-pink-dark' : o.status === 'preparing' ? 'bg-amber-bg text-amber-ink' : 'bg-green-bg text-green-dark'}`}>{o.status === 'new' ? L('NUEVO', 'NEW') : o.status === 'preparing' ? L('PREP', 'PREP') : L('LISTO', 'READY')}</span>
                <div className="min-w-0 flex-1"><div className="truncate text-[12px] font-extrabold text-ink">{o.code} · {o.customer || L('Cliente', 'Customer')}</div><div className="truncate text-[10px] font-semibold text-muted">{o.items.map((it) => `${it.qty}× ${it.name}`).join(', ')}</div></div>
                <span className="flex-none text-[12.5px] font-extrabold text-ink">{money(o.total)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 7-day sales chart (seller, real) */}
      {sells && week > 0 && (
        <div className={`${card} p-3.5`}>
          <div className="flex items-center justify-between"><h2 className="text-[13px] font-extrabold text-ink">{L('Ventas · 7 días', 'Sales · 7 days')}</h2><span className="text-[13px] font-extrabold text-ink">{money(week)}</span></div>
          <svg viewBox="0 0 320 90" preserveAspectRatio="none" className="mt-2 block h-[84px] w-full">
            <defs><linearGradient id="dhg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7B61FF" stopOpacity=".26" /><stop offset="1" stopColor="#7B61FF" stopOpacity="0" /></linearGradient></defs>
            {(() => {
              const max = Math.max(...series, 1);
              const pts = series.map((v, i) => [8 + (i * 304) / 6, 82 - (v / max) * 72]);
              const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
              return (<><path d={`${line} L312,90 L8,90 Z`} fill="url(#dhg)" /><path d={line} fill="none" stroke="#7B61FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /><circle cx={pts[6][0]} cy={pts[6][1]} r="3.5" fill="#7B61FF" stroke="#fff" strokeWidth="2" /></>);
            })()}
          </svg>
          <div className="mt-1 flex justify-between px-0.5 text-[9px] font-bold text-muted-2">{(es ? ['6d', '5d', '4d', '3d', '2d', 'ayer', 'hoy'] : ['6d', '5d', '4d', '3d', '2d', 'yest', 'today']).map((d) => <span key={d}>{d}</span>)}</div>
        </div>
      )}

      {/* mejora tu visibilidad */}
      <Sec title={L('Mejora tu visibilidad', 'Improve your visibility')} />
      <div className={`${card} px-3.5`}>
        {growList.map((g, i) => (
          <button key={i} onClick={() => go(g.tab)} className={`flex w-full cursor-pointer items-center gap-3 py-3 text-left ${i < growList.length - 1 ? 'border-b border-hair' : ''}`}>
            <span className={`flex h-8 w-8 flex-none items-center justify-center rounded-[9px] ${g.bg}`}><g.icon size={15} stroke={2.2} className={g.c} /></span>
            <div className="min-w-0 flex-1"><div className="text-[12px] font-extrabold text-ink">{g.title}</div><div className="truncate text-[10px] font-semibold text-muted">{g.sub}</div></div>
            <ChevronRight size={15} stroke={2.4} className="flex-none text-faint" />
          </button>
        ))}
      </div>

      {/* acciones rápidas */}
      <Sec title={L('Acciones rápidas', 'Quick actions')} />
      <div className="grid grid-cols-4 gap-2.5">
        {quick.map(([t, Icon, label, cls]) => (
          <button key={label} onClick={() => go(t)} className={`${card} cursor-pointer p-2.5 text-center`}>
            <span className={`mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-[10px] ${cls}`}><Icon size={15} stroke={2.2} /></span>
            <span className="block text-[9.5px] font-extrabold leading-tight text-ink-soft">{label}</span>
          </button>
        ))}
      </div>

      {/* recent activity (real) */}
      {recent.length > 0 && (
        <>
          <Sec title={L('Actividad reciente', 'Recent activity')} action={sells ? L('Ver todo', 'See all') : undefined} onAction={() => go('orders')} />
          <div className={`${card} px-3.5`}>
            {recent.map((o, i) => (
              <div key={o.id} className={`flex items-center gap-3 py-3 ${i < recent.length - 1 ? 'border-b border-hair' : ''}`}>
                <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[9px] bg-lilac"><ShoppingBag size={14} stroke={2.2} className="text-primary-dark" /></span>
                <div className="min-w-0 flex-1"><div className="truncate text-[11.5px] font-bold text-ink-2">{(o.customer || L('Cliente', 'Customer'))} · {o.items.map((it) => `${it.qty}× ${it.name}`).join(', ')}</div><div className="text-[9.5px] font-semibold text-muted-2">{o.code}</div></div>
                <span className="flex-none text-[11px] font-extrabold text-green-dark">{money(o.total)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* activar ventas (listing-only) */}
      {!sells && (
        <div className="mt-1 flex items-center gap-3 rounded-card-sm border border-lilac-line p-3.5" style={{ background: 'linear-gradient(135deg,#efe9ff,#f7f3ff)' }}>
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-btn bg-white shadow-card"><Cart size={20} stroke={2.2} className="text-primary" /></span>
          <div className="min-w-0 flex-1"><div className="text-[13px] font-extrabold text-ink">{L('¿Vendes o tomas pedidos?', 'Do you sell or take orders?')}</div><div className="text-[11px] font-semibold text-ink-2">{L('Activa menú, productos, reservas o eventos. Tu página sigue igual.', 'Turn on menu, products, bookings or events. Your page stays the same.')}</div></div>
          <button onClick={() => go('modules')} className="flex-none cursor-pointer rounded-btn bg-primary px-4 py-2.5 text-[12px] font-extrabold text-white shadow-cta-sm">{L('Activar', 'Enable')}</button>
        </div>
      )}
    </div>
  );
}
