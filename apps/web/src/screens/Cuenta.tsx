'use client';

// Mi cuenta — the user account hub (consumer "dashboard"). Built from the
// established design system: the same card + section-row + in-page-subview
// pattern as the business panel, only design-system tokens/components. Real,
// signed-in-user data: editable profile (name/bio/city), saved addresses (CRUD),
// notification prefs, the user's own posts, and quick links to Guardados /
// Siguiendo / Notificaciones / the business panel. No improvised UI.

import { useEffect, useState, type ReactNode } from 'react';
import { imgUrl, ANCHO } from '@/lib/img';
import { useRouter } from 'next/navigation';
import { IconBan as Ban, IconBell as Bell, IconBike as Bike, IconBookmark as Bookmark, IconCalendarCheck as CalendarCheck, IconCalendar as CalendarDays, IconCamera as Camera, IconCheck as Check, IconChevronLeft as ChevronLeft, IconChevronRight as ChevronRight, IconGlobe as Globe, IconLoader2 as Loader2, IconHelpCircle as HelpCircle, IconLayoutDashboard as LayoutDashboard, IconLogin as LogIn, IconLogout as LogOut, IconMail as Mail, IconMapPin as MapPin, IconSpeakerphone as Megaphone, IconMessageCircle as MessageCircle, IconFlag as Flag, IconPhone as Phone, IconPlus as Plus, IconReceipt as Receipt, IconRepeat as Repeat, IconShoppingBag as ShoppingBag, IconStar as Star, IconStarFilled as StarFilled, IconTicket as Ticket, IconTrash as Trash2, IconTruck as Truck, IconUser as User, IconUsers as Users } from '@tabler/icons-react';
import { useLang } from '@/lib/i18n';
import { useApp } from '@/lib/state';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useAvatarUpload } from '@/lib/avatarUpload';
import { useAddresses } from '@/lib/addresses';
import { useFollows } from '@/lib/follows';
import { useSavedBiz } from '@/lib/savedBiz';
import { useLiveData } from '@/lib/live';
import { useMyActivity, useOrderPoll, type MyOrder } from '@/lib/myActivity';
import { postReview } from '@/lib/live';
import { useUrlTab, useUrlDetail } from '@/lib/urlView';
import { startConversation, sendChatMessage } from '@/lib/chat';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Qr } from '@/components/Qr';
import { Avatar, Card, Overlay, OverlayTitle, PrimaryBtn, Switch, YouAvatar } from '@/components/ui';
import { LangToggle } from '@/components/AppHeader';
import { PostCard } from '@/components/PostCard';
import { mapPost, type PostRow } from '@/lib/posts';
import type { Post } from '@/data/fixtures';
import { enablePush, disablePush, pushState, type PushState } from '@/lib/push';
import { orderStageIdx } from '@/components/OrderSteps';
import { fetchMyClaims, createClaim, claimAddMessage, CLAIM_STATUS, CLAIM_KIND, timeAgo, type MyClaim } from '@/lib/admin';

type Sec = 'home' | 'perfil' | 'direcciones' | 'posts' | 'config' | 'pedidos' | 'reservas' | 'rentas' | 'boletos' | 'voy' | 'reclamos' | 'bloqueados';
// Valid ?sec= values restored on refresh (keep in sync with Sec).
const SEC_VALUES = new Set<string>(['home', 'perfil', 'direcciones', 'posts', 'config', 'pedidos', 'reservas', 'rentas', 'boletos', 'voy', 'reclamos', 'bloqueados']);

// Status → bilingual label + pill colors, shared across the activity lists.
const STATUS: Record<string, { es: string; en: string; bg: string; c: string }> = {
  new: { es: 'Nuevo', en: 'New', bg: '#FDE7EF', c: '#D6336C' },
  preparing: { es: 'Preparando', en: 'Preparing', bg: '#FCEFD6', c: '#9A6A12' },
  ready: { es: 'Listo', en: 'Ready', bg: '#E3F5EA', c: '#1F8A4C' },
  completed: { es: 'Completado', en: 'Completed', bg: '#F1EFFA', c: '#8A86A0' },
  pending: { es: 'Pendiente', en: 'Pending', bg: '#FCEFD6', c: '#9A6A12' },
  confirmed: { es: 'Confirmada', en: 'Confirmed', bg: '#E3F5EA', c: '#1F8A4C' },
  seated: { es: 'En sitio', en: 'Seated', bg: '#E5EFFB', c: '#2F6FED' },
  done: { es: 'Completada', en: 'Done', bg: '#F1EFFA', c: '#8A86A0' },
  out: { es: 'En uso', en: 'Out', bg: '#E5EFFB', c: '#2F6FED' },
  returned: { es: 'Devuelto', en: 'Returned', bg: '#F1EFFA', c: '#8A86A0' },
  cancelled: { es: 'Cancelado', en: 'Cancelled', bg: '#F1EFFA', c: '#8A86A0' },
  used: { es: 'Usado', en: 'Used', bg: '#F1EFFA', c: '#8A86A0' },
  refunded: { es: 'Reembolsado', en: 'Refunded', bg: '#F1EFFA', c: '#8A86A0' },
  on_the_way: { es: 'En camino', en: 'On the way', bg: '#E5EFFB', c: '#2F6FED' },
  delivered: { es: 'Entregado', en: 'Delivered', bg: '#E3F5EA', c: '#1F8A4C' },
  no_show: { es: 'No asistió', en: 'No-show', bg: '#FDE7EF', c: '#D6336C' },
};

// DoorDash-style client stage: fold order status + dispatch into ONE stage key.
const orderStageKey = (o: MyOrder): string => {
  if (o.status === 'cancelled') return 'cancelled';
  const d = o.fulfillment?.dispatch;
  if (o.status === 'completed' || d === 'delivered') return o.channel === 'delivery' ? 'delivered' : 'completed';
  if (o.channel === 'delivery' && (d === 'picked_up' || d === 'on_the_way')) return 'on_the_way';
  return o.status; // new | preparing | ready
};
type Notifs = { posts: boolean; follows: boolean; events: boolean; marketing: boolean };
const DEFAULT_NOTIFS: Notifs = { posts: true, follows: true, events: true, marketing: false };

const cardCls = 'rounded-card border border-line bg-white shadow-card';
const inputCls =
  'w-full rounded-field border-[1.5px] border-lilac-line bg-app px-3.5 py-3 text-[13.5px] font-medium text-ink outline-none placeholder:text-muted focus:border-primary';

export function CuentaScreen() {
  const { L, lang } = useLang();
  const app = useApp();
  const auth = useAuth();
  const addr = useAddresses();
  const follows = useFollows();
  const saved = useSavedBiz();
  const live = useLiveData();
  const act = useMyActivity();
  const router = useRouter();

  // Section + order-detail live in the URL (?sec= / ?order=) so a refresh keeps you
  // where you are and links are shareable (the payment-confirmation redirect deep-
  // links straight to ?sec=pedidos&order=<id>). Home omits ?sec.
  const [sec, setSec] = useUrlTab<Sec>('sec', 'home', (v) => SEC_VALUES.has(v));
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [toast, setToast] = useState('');
  const [cancelTarget, setCancelTarget] = useState<{ kind: 'order' | 'booking' | 'rental'; id: string } | null>(null);
  const flash = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(''), 1800);
  };

  // Web Push (this device): read the OS permission after mount (SSR-safe) so the
  // Settings card can offer "turn on notifications" or reflect granted/blocked.
  const [push, setPush] = useState<PushState>('unsupported');
  const [pushBusy, setPushBusy] = useState(false);
  useEffect(() => { setPush(pushState()); }, []);
  const turnOnPush = async () => {
    setPushBusy(true);
    const next = await enablePush(lang);
    setPush(next);
    setPushBusy(false);
    if (next === 'granted') flash(L('Notificaciones activadas en este dispositivo', 'Notifications on for this device'));
    else if (next === 'denied') flash(L('Bloqueadas — actívalas en tu navegador', 'Blocked — enable them in your browser'));
  };
  const turnOffPush = async () => {
    setPushBusy(true);
    await disablePush();
    setPush('default');
    setPushBusy(false);
    flash(L('Notificaciones desactivadas en este dispositivo', 'Notifications off for this device'));
  };

  // Order detail sheet (DoorDash-style tracking): selection (mirrored to ?order=)
  // + live row refresh, and the "report a problem" mini-form (real chat to biz).
  const { value: orderSelId, open: openOrder, close: closeOrder } = useUrlDetail('order');
  useOrderPoll(orderSelId); // the tracking overlay advances even without the websocket
  // Open appointment detail (Mis reservas) — ics download, reschedule, cancel.
  const [bkSelId, setBkSelId] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportText, setReportText] = useState('');
  const [reportBusy, setReportBusy] = useState(false);
  // ── Reclamos (0122/0124) — la escalada cuando el negocio no responde ──
  // Primero se le escribe al negocio (bloque de arriba). Si eso no resuelve,
  // esto abre un caso con To'Latino: hilo de 3 lados (cliente · negocio · admin)
  // que el founder atiende desde /admin → Reclamos.
  const [claims, setClaims] = useState<MyClaim[] | null>(null);
  const [claimOpen, setClaimOpen] = useState<MyClaim | null>(null);
  const [claimMsg, setClaimMsg] = useState('');
  const [claimBusy, setClaimBusy] = useState(false);
  // hoja "abrir reclamo": sobre qué compra + motivo
  const [newClaim, setNewClaim] = useState<{ kind: string; refId: string | null; refCode: string | null; businessId: string | null; bizName: string } | null>(null);
  const [claimReason, setClaimReason] = useState<string | null>(null);
  const [claimDetail, setClaimDetail] = useState('');
  const [pickPurchase, setPickPurchase] = useState(false);

  const loadClaims = async () => { setClaims(await fetchMyClaims()); };
  useEffect(() => {
    if (!auth.user) { setClaims(null); return; }
    void loadClaims();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.user]);

  const openClaims = claims?.filter((c) => c.status === 'abierto' || c.status === 'en_revision').length ?? 0;

  const sendClaim = async () => {
    if (!newClaim || !claimReason || claimBusy) return;
    setClaimBusy(true);
    const err = await createClaim({
      kind: newClaim.kind, refId: newClaim.refId, refCode: newClaim.refCode,
      businessId: newClaim.businessId, reason: claimReason, detail: claimDetail.trim() || undefined,
    });
    setClaimBusy(false);
    if (err) { flash(L('No se pudo abrir el reclamo', "Couldn't open the claim")); return; }
    setNewClaim(null); setClaimReason(null); setClaimDetail('');
    await loadClaims();
    setSec('reclamos');
    flash(L('Reclamo abierto — te responderemos aquí', "Claim opened — we'll reply here"));
  };

  const sendClaimMsg = async () => {
    if (!claimOpen || !claimMsg.trim() || claimBusy) return;
    setClaimBusy(true);
    const err = await claimAddMessage(claimOpen.id, claimMsg.trim());
    setClaimBusy(false);
    if (err) { flash(L('No se pudo enviar', "Couldn't send")); return; }
    setClaimMsg('');
    const fresh = await fetchMyClaims();
    setClaims(fresh);
    setClaimOpen(fresh.find((c) => c.id === claimOpen.id) ?? null);
  };

  // Delivered-screen extras: quick star rating + expandable receipt.
  const [rateStars, setRateStars] = useState(0);
  const [rated, setRated] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  // Reset the per-order UI when the open order changes.
  useEffect(() => { setReportOpen(false); setReportText(''); setRateStars(0); setRated(false); setShowReceipt(false); }, [orderSelId]);

  // (Deep links ?sec= / ?order= — including the payment-confirmation redirect
  // /cuenta/?sec=pedidos&order=<id> — are now restored by the useUrlTab/useUrlDetail
  // hooks above, which also keep the URL in sync as you navigate.)

  const guest = auth.configured && !auth.user;
  const p = auth.profile;
  const photo = useAvatarUpload();

  // Vecinos bloqueados. La tabla guarda ids y `profiles` es privado, así que el
  // nombre lo trae un RPC (`blocked_users`, 0137) que solo devuelve TU lista.
  type Bloqueado = { id: string; name: string; avatar_url: string | null; blocked_at: string };
  const [blocked, setBlocked] = useState<Bloqueado[]>([]);
  const [blockedLoading, setBlockedLoading] = useState(false);
  const loadBlocked = async () => {
    if (!supabase || !auth.user) return;
    setBlockedLoading(true);
    const { data } = await supabase.rpc('blocked_users');
    setBlocked(Array.isArray(data) ? (data as Bloqueado[]) : []);
    setBlockedLoading(false);
  };
  const unblock = async (id: string) => {
    if (!supabase || !auth.user) return;
    setBlocked((l) => l.filter((x) => x.id !== id));
    await supabase.from('user_blocks').delete().eq('blocker_id', auth.user.id).eq('blocked_id', id);
    live.refresh();
    flash(L('Desbloqueado', 'Unblocked'));
  };
  const notifs: Notifs = { ...DEFAULT_NOTIFS, ...((p?.settings?.notifications as Partial<Notifs>) ?? {}) };
  // «Mis publicaciones» salía del feed GEOGRÁFICO de la ciudad en la que
  // estuvieras (30 millas, 50 filas): al cambiar de ciudad tus propias
  // publicaciones desaparecían, y las que se salían de esas 50 nunca aparecían.
  // Ahora se piden por autor, que es lo que la pantalla dice que enseña.
  // (2ª auditoría de Comunidad, 2026-08-03.)
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [myPostsFailed, setMyPostsFailed] = useState(false);
  useEffect(() => {
    const uid = auth.user?.id;
    if (!supabase || !uid) { setMyPosts([]); setMyPostsFailed(false); return; }
    let cancelado = false;
    void supabase.rpc('neighbor_posts', { in_id: uid, max_results: 60 }).then(({ data, error }) => {
      if (cancelado) return;
      setMyPostsFailed(!!error);
      setMyPosts(!error && Array.isArray(data) ? (data as PostRow[]).map(mapPost) : []);
    });
    return () => { cancelado = true; };
  }, [auth.user?.id]);

  const es = L('es', 'en') === 'es';
  const dt = (iso: string) => new Date(iso).toLocaleString(es ? 'es-US' : 'en-US', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  const money = (n: number | null | undefined) => (n == null ? '' : '$' + Number(n).toFixed(2));
  const pill = (status: string) => {
    const s = STATUS[status] ?? { es: status, en: status, bg: '#F1EFFA', c: '#8A86A0' };
    return <span className="flex-none rounded-full px-2 py-0.5 text-[10px] font-extrabold" style={{ background: s.bg, color: s.c }}>{L(s.es, s.en)}</span>;
  };
  // Order pill with the STORE voice: a Tienda order "empaca", it doesn't cook.
  const orderPill = (o: MyOrder) => {
    const stage = orderStageKey(o);
    if (o.fulfillment?.kind === 'store' && stage === 'preparing') {
      const s = STATUS.preparing;
      return <span className="flex-none rounded-full px-2 py-0.5 text-[10px] font-extrabold" style={{ background: s.bg, color: s.c }}>{L('Empacando', 'Packing')}</span>;
    }
    return pill(stage);
  };
  const txEmpty = (msg: string) => <div className={`${cardCls} p-6 text-center text-[13px] font-semibold text-muted`}>{msg}</div>;
  /** «Ver más» del historial. Antes el tope de 200 cortaba en silencio y lo más
   *  viejo quedaba inalcanzable — un tope sin salida es la otra forma de mentir.
   *  (Auditoría de Negocios, 2026-08-04.) */
  const verMas = () =>
    act.hayMas ? (
      <button
        onClick={act.cargarMas}
        disabled={act.cargandoMas}
        className="tap-y mx-auto mt-3 cursor-pointer rounded-btn border border-line bg-white px-5 py-2.5 text-[13px] font-extrabold text-primary-dark shadow-card disabled:opacity-60"
      >
        {act.cargandoMas ? L('Cargando…', 'Loading…') : L('Ver más', 'Show more')}
      </button>
    ) : null;
  const txItem = (key: string, title: string, sub: string, right: ReactNode) => (
    <div key={key} className={`${cardCls} flex items-center gap-3 p-3.5`}>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-extrabold text-ink">{title}</span>
        <span className="block truncate text-[11.5px] font-semibold text-muted">{sub}</span>
      </span>
      <span className="flex flex-none flex-col items-end gap-1">{right}</span>
    </div>
  );
  const evTitle = (e: { title_es: string; title_en: string } | null) => (e ? L(e.title_es, e.title_en) : L('Evento', 'Event'));

  // Customer self-service cancel (only while the request is still early).
  const cancellable = (kind: 'order' | 'booking' | 'rental', status: string) =>
    kind === 'order' ? status === 'new' : status === 'pending' || status === 'confirmed';
  const cancelBtn = (kind: 'order' | 'booking' | 'rental', id: string, status: string) =>
    cancellable(kind, status) ? (
      <button onClick={() => setCancelTarget({ kind, id })} className="mt-0.5 cursor-pointer rounded-full border-[1.5px] border-pink-bg bg-white px-2.5 py-1 text-[10px] font-extrabold text-pink-dark">
        {L('Cancelar', 'Cancel')}
      </button>
    ) : null;
  const doCancel = async () => {
    if (!cancelTarget) return;
    const t = cancelTarget;
    setCancelTarget(null);
    const { error } = await act.cancel(t.kind, t.id);
    setToast(error ? L('No se pudo cancelar', "Couldn't cancel") : L('Cancelado', 'Cancelled'));
    window.setTimeout(() => setToast(''), 1900);
  };

  const openPerfil = () => {
    if (guest) return router.push('/entrar');
    setName(p?.display_name ?? '');
    setBio(p?.bio ?? '');
    setSec('perfil');
  };

  const saveProfile = async () => {
    if (!name.trim() || savingProfile) return;
    setSavingProfile(true);
    const { error } = await auth.updateProfile({ display_name: name.trim(), bio: bio.trim() || null });
    setSavingProfile(false);
    flash(error ? L('No se pudo guardar.', "Couldn't save.") : L('Perfil actualizado', 'Profile updated'));
    if (!error) setSec('home');
  };

  const toggleNotif = (k: keyof Notifs) => {
    auth.updateProfile({ settings: { ...(p?.settings ?? {}), notifications: { ...notifs, [k]: !notifs[k] } } });
    flash(L('Preferencias guardadas', 'Preferences saved'));
  };

  const goFeed = (view: 'saved' | 'following') => {
    app.setFeedView(view);
    router.push('/comunidad');
  };

  // ── header (avatar + name + city + stats) ──
  const header = (
    <Card className="p-[17px]">
      <div className="flex items-center gap-3">
        {p ? <Avatar initials={p.initials} color={p.avatar_color} src={p.avatar_url} size={48} /> : <YouAvatar size={48} />}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[16px] font-extrabold text-ink">{p?.display_name ?? L('Invitado', 'Guest')}</div>
          <button onClick={() => app.setCityOpen(true)} className="mt-1 inline-flex max-w-full cursor-pointer items-center gap-1 rounded-full bg-lilac-2 px-2.5 py-1 text-[11.5px] font-extrabold text-ink">
            <MapPin size={12} className="flex-none text-primary" stroke={2.4} />
            <span className="truncate">{app.city}</span>
          </button>
        </div>
        <button onClick={openPerfil} className="flex-none cursor-pointer rounded-btn bg-lilac-2 px-3 py-2 text-[12px] font-extrabold text-primary-dark">
          {L('Editar', 'Edit')}
        </button>
      </div>
      <div className="mt-3.5 grid grid-cols-3 border-t border-hair pt-3">
        {([[follows.followingCount, 'Siguiendo', 'Following'], [follows.followersCount, 'Seguidores', 'Followers'], [follows.postsCount, 'Posts', 'Posts']] as [number, string, string][]).map(([n, es, en]) => (
          <div key={en} className="text-center">
            <div className="text-[15px] font-extrabold text-ink">{n}</div>
            <div className="mt-0.5 text-[11px] font-bold text-muted-2">{L(es, en)}</div>
          </div>
        ))}
      </div>
    </Card>
  );

  const row = (Icon: typeof User, c: string, bg: string, title: string, sub: string, onClick: () => void, right?: string) => (
    <button onClick={onClick} className="flex w-full cursor-pointer items-center gap-3 px-1 py-2.5 text-left">
      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-btn" style={{ background: bg }}>
        <Icon size={17} strokeWidth={2.2} style={{ color: c }} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-extrabold text-ink">{title}</span>
        <span className="block truncate text-[11.5px] font-semibold text-muted">{sub}</span>
      </span>
      {right != null && <span className="flex-none text-[12px] font-extrabold text-muted">{right}</span>}
      <ChevronRight size={16} className="flex-none text-muted-faint" />
    </button>
  );

  const backBar = (title: string) => (
    <div className="mb-4 flex items-center gap-2.5">
      <button onClick={() => setSec('home')} aria-label={L('Volver', 'Back')} className="flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-full bg-lilac-2 text-ink">
        <ChevronLeft size={18} stroke={2.4} />
      </button>
      <h1 className="text-[19px] font-extrabold tracking-[-.02em] text-ink">{title}</h1>
    </div>
  );

  return (
    <div className="mx-auto max-w-[720px]">
      {/* ── HOME ── */}
      {sec === 'home' && (
        <div className="flex flex-col gap-4">
          {guest && (
            <div className="flex items-center gap-3 rounded-card border border-line bg-white p-3.5 shadow-card">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-lilac"><LogIn size={18} className="text-primary" stroke={2.2} /></span>
              <span className="min-w-0 flex-1 text-[12.5px] font-semibold text-ink-3">{L('Inicia sesión para editar tu perfil y guardar tu actividad.', 'Sign in to edit your profile and keep your activity.')}</span>
              <button onClick={() => router.push('/entrar/?entrar=1')} className="flex-none cursor-pointer rounded-btn bg-primary px-3.5 py-2 text-[12px] font-extrabold text-white shadow-cta-sm">{L('Entrar', 'Sign in')}</button>
            </div>
          )}
          {header}
          <div className={`${cardCls} p-2`}>
            <div className="px-2 pb-1 pt-2 text-[10.5px] font-extrabold uppercase tracking-[.05em] text-muted-2">{L('Tu actividad', 'Your activity')}</div>
            {row(Bookmark, '#6D4DF6', '#EFEBFF', L('Guardados', 'Saved'), L('Publicaciones que guardaste', 'Posts you saved'), () => goFeed('saved'))}
            {row(Star, '#B5791A', '#FCEFD6', L('Negocios guardados', 'Saved businesses'), L('Tus lugares favoritos', 'Your favorite places'), () => router.push('/negocios'), String(saved.count))}
            {row(Users, '#1F8A4C', '#E3F5EA', L('Siguiendo', 'Following'), L('Vecinos y negocios que sigues', 'Neighbors & businesses you follow'), () => goFeed('following'), String(follows.followingCount))}
            {row(Megaphone, '#2F6FED', '#E5EFFB', L('Mis publicaciones', 'My posts'), L('Lo que compartiste en la comunidad', 'What you shared in the community'), () => setSec('posts'), String(myPosts.length))}
          </div>

          <div className={`${cardCls} p-2`}>
            <div className="px-2 pb-1 pt-2 text-[10.5px] font-extrabold uppercase tracking-[.05em] text-muted-2">{L('Mis transacciones', 'My transactions')}</div>
            {row(ShoppingBag, '#6D4DF6', '#EFEBFF', L('Mis pedidos', 'My orders'), L('Comida y productos', 'Food & products'), () => setSec('pedidos'), String(act.orders.length))}
            {row(CalendarDays, '#1F8A4C', '#E3F5EA', L('Mis reservas', 'My bookings'), L('Citas y servicios', 'Appointments & services'), () => setSec('reservas'), String(act.bookings.length))}
            {row(Bike, '#B5791A', '#FCEFD6', L('Mis rentas', 'My rentals'), L('Equipo y artículos rentados', 'Rented equipment & items'), () => setSec('rentas'), String(act.rentals.length))}
            {row(Ticket, '#D6336C', '#FDE7EF', L('Mis boletos', 'My tickets'), L('Boletos de eventos', 'Event tickets'), () => setSec('boletos'), String(act.tickets.length))}
            {row(CalendarCheck, '#2F6FED', '#E5EFFB', L('Voy a asistir', "I'm going"), L('Eventos que marcaste "Voy"', 'Events you RSVP\'d'), () => setSec('voy'), String(act.going.length))}
            {row(Flag, '#D6336C', '#FDE7EF', L('Mis reclamos', 'My claims'), L('Casos abiertos con To’Latino', 'Cases open with To’Latino'), () => setSec('reclamos'), openClaims > 0 ? String(openClaims) : String(claims?.length ?? 0))}
          </div>

          <div className={`${cardCls} p-2`}>
            <div className="px-2 pb-1 pt-2 text-[10.5px] font-extrabold uppercase tracking-[.05em] text-muted-2">{L('Cuenta', 'Account')}</div>
            {row(User, '#6D4DF6', '#F1EFFA', L('Mi perfil', 'My profile'), L('Nombre, bio, ciudad', 'Name, bio, city'), openPerfil)}
            {row(MapPin, '#1F8A4C', '#E3F5EA', L('Direcciones', 'Addresses'), L('Tus direcciones guardadas', 'Your saved addresses'), () => setSec('direcciones'), String(addr.addresses.length))}
            {row(Bell, '#B5791A', '#FCEFD6', L('Notificaciones', 'Notifications'), L('Alertas y avisos', 'Alerts and updates'), () => app.setNotifOpen(true))}
            {row(Globe, '#0E9384', '#D6F3EF', L('Configuración', 'Settings'), L('Idioma, notificaciones, cuenta', 'Language, notifications, account'), () => setSec('config'))}
            {row(Ban, '#5A5570', '#F1EFFA', L('Vecinos bloqueados', 'Blocked neighbors'), L('A quién dejaste de ver', "Who you've stopped seeing"), () => { loadBlocked(); setSec('bloqueados'); })}
          </div>

          <div className={`${cardCls} p-2`}>
            {row(LayoutDashboard, '#6D4DF6', '#EFEBFF', L('Panel de negocio', 'Business dashboard'), L('Administra tu negocio', 'Manage your business'), () => router.push('/negocio'))}
            {row(HelpCircle, '#9A6A12', '#FCEFD6', L('Ayuda y soporte', 'Help & support'), L('Preguntas frecuentes', 'FAQ'), () => flash(L('Ayuda: pronto', 'Help: coming soon')))}
          </div>

          {auth.user && (
            <button
              onClick={async () => { await auth.signOut(); router.push('/comunidad'); }}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-btn border-[1.5px] border-pink-bg bg-white py-3 text-[13px] font-extrabold text-pink-dark"
            >
              <LogOut size={15} stroke={2.4} />
              {L('Cerrar sesión', 'Sign out')}
            </button>
          )}
        </div>
      )}

      {/* ── PERFIL ── */}
      {sec === 'perfil' && (
        <div>
          {backBar(L('Mi perfil', 'My profile'))}
          <div className={`${cardCls} flex flex-col gap-3.5 p-4 md:p-5`}>
            {/* Foto — la misma mecánica que el alta (useAvatarUpload): comprime
                en el teléfono antes de subir y borra la anterior al cambiarla. */}
            <div className="flex items-center gap-3.5">
              <span className="relative flex-none">
                <Avatar initials={p?.initials ?? 'TÚ'} color={p?.avatar_color} src={photo.shown} size={64} />
                {photo.busy && (
                  <span className="absolute inset-0 flex items-center justify-center rounded-full" style={{ background: 'rgba(30,27,46,.5)' }}>
                    <Loader2 size={18} className="animate-spin text-white" stroke={2.4} />
                  </span>
                )}
              </span>
              <input ref={photo.inputRef} type="file" accept="image/*" className="sr-only" tabIndex={-1}
                     onChange={(e) => photo.pick(e.target.files?.[0])} />
              <div className="min-w-0">
                <button type="button" onClick={photo.open} disabled={photo.busy}
                        className="flex cursor-pointer items-center gap-2 rounded-field border-[1.5px] border-dashed border-lilac-ring bg-app px-3.5 py-2.5 text-[12px] font-extrabold text-primary-dark disabled:cursor-default disabled:opacity-60">
                  <Camera size={15} stroke={2} aria-hidden />
                  {photo.busy ? L('Subiendo…', 'Uploading…') : photo.url ? L('Cambiar foto', 'Change photo') : L('Agregar foto', 'Add photo')}
                </button>
                {photo.url && !photo.busy && (
                  <button type="button" onClick={photo.remove} className="mt-1.5 cursor-pointer text-[11.5px] font-bold text-muted-2 underline">
                    {L('Quitar foto', 'Remove photo')}
                  </button>
                )}
              </div>
            </div>
            {photo.error && (
              <div role="alert" className="rounded-field bg-pink-bg px-3 py-2.5 text-[11.5px] font-bold text-pink-dark">{photo.error}</div>
            )}
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-extrabold text-ink">{L('Nombre', 'Name')}</span>
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-extrabold text-ink">{L('Bio', 'Bio')} <span className="font-semibold text-muted">· {L('opcional', 'optional')}</span></span>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className={`${inputCls} resize-none`} placeholder={L('Cuéntale a la comunidad sobre ti…', 'Tell the community about you…')} />
            </label>
            <div>
              <span className="mb-1.5 block text-[12px] font-extrabold text-ink">{L('Ciudad', 'City')}</span>
              <button onClick={() => app.setCityOpen(true)} className="flex w-full cursor-pointer items-center justify-between rounded-field border-[1.5px] border-lilac-line bg-app px-3.5 py-3 text-[13.5px] font-bold text-ink">
                <span className="inline-flex items-center gap-2"><MapPin size={14} className="text-primary" stroke={2.4} />{app.city}</span>
                <ChevronRight size={15} className="text-muted" />
              </button>
            </div>
            <button onClick={saveProfile} disabled={!name.trim() || savingProfile} className="mt-1 cursor-pointer rounded-btn bg-primary py-3 text-[13.5px] font-extrabold text-white shadow-cta-sm disabled:opacity-50">
              {savingProfile ? L('Guardando…', 'Saving…') : L('Guardar perfil', 'Save profile')}
            </button>
          </div>
        </div>
      )}

      {/* ── BLOQUEADOS ── */}
      {sec === 'bloqueados' && (
        <div>
          {backBar(L('Vecinos bloqueados', 'Blocked neighbors'))}
          {blockedLoading ? (
            <div className={`${cardCls} p-6 text-center text-[13px] font-semibold text-muted`}>{L('Cargando…', 'Loading…')}</div>
          ) : blocked.length === 0 ? (
            <div className={`${cardCls} p-6 text-center`}>
              <div className="text-[13.5px] font-extrabold text-ink">{L('No has bloqueado a nadie', "You haven't blocked anyone")}</div>
              <div className="mt-1.5 text-[12.5px] font-semibold leading-relaxed text-muted">
                {L('Si alguna vez lo necesitas, está en el menú “…” de sus publicaciones. No se le avisa.',
                   'If you ever need to, it\'s in the “…” menu on their posts. They are not notified.')}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {blocked.map((b) => (
                <div key={b.id} className={`${cardCls} flex items-center gap-3 p-3.5`}>
                  <Avatar initials={(b.name || 'V').slice(0, 2).toUpperCase()} color="#8A86A0" src={b.avatar_url} size={38} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-extrabold text-ink">{b.name}</span>
                    <span className="block text-[11.5px] font-semibold text-muted">{L('Bloqueado el ', 'Blocked on ')}{dt(b.blocked_at)}</span>
                  </span>
                  <button onClick={() => unblock(b.id)} className="flex-none cursor-pointer rounded-btn bg-lilac-2 px-3 py-2 text-[12px] font-extrabold text-primary-dark">
                    {L('Desbloquear', 'Unblock')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── DIRECCIONES ── */}
      {sec === 'direcciones' && (
        <div>
          {backBar(L('Direcciones', 'Addresses'))}
          <div className="flex flex-col gap-2.5">
            {addr.addresses.length === 0 && (
              <div className={`${cardCls} p-6 text-center text-[13px] font-semibold text-muted`}>{L('Aún no tienes direcciones guardadas.', 'No saved addresses yet.')}</div>
            )}
            {addr.addresses.map((a) => (
              <div key={a.id} className={`${cardCls} flex items-center gap-3 p-3.5`}>
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-btn bg-lilac-2"><MapPin size={16} className="text-primary-dark" stroke={2.2} /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[13px] font-extrabold text-ink">{a.label || L('Dirección', 'Address')}</span>
                    {a.is_default && <span className="rounded-full bg-green-bg px-2 py-0.5 text-[9.5px] font-extrabold text-green-dark">{L('Predet.', 'Default')}</span>}
                  </span>
                  <span className="block truncate text-[11.5px] font-semibold text-muted">{a.formatted}</span>
                </span>
                {!a.is_default && (
                  <button onClick={() => addr.setDefault(a.id)} className="flex-none cursor-pointer rounded-btn bg-lilac-2 px-2.5 py-1.5 text-[10.5px] font-extrabold text-primary-dark">{L('Predet.', 'Default')}</button>
                )}
                <button onClick={() => addr.remove(a.id)} aria-label={L('Eliminar', 'Delete')} className="flex h-8 w-8 flex-none cursor-pointer items-center justify-center rounded-btn text-pink-dark"><Trash2 size={14} stroke={2.2} /></button>
              </div>
            ))}
            <button onClick={() => app.setAddressOpen(true)} className="flex cursor-pointer items-center justify-center gap-2 rounded-tile border-[1.5px] border-dashed border-lilac-line bg-white py-3 text-[12.5px] font-extrabold text-primary-dark">
              <Plus size={15} stroke={2.6} />
              {L('Agregar dirección', 'Add address')}
            </button>
          </div>
        </div>
      )}

      {/* ── MIS PUBLICACIONES ── */}
      {sec === 'posts' && (
        <div>
          {backBar(L('Mis publicaciones', 'My posts'))}
          {myPostsFailed ? (
            <div className={`${cardCls} p-6 text-center text-[13px] font-semibold text-muted`}>{L('No pudimos cargar tus publicaciones. Revisa tu conexión.', "We couldn't load your posts. Check your connection.")}</div>
          ) : myPosts.length === 0 ? (
            <div className={`${cardCls} p-6 text-center text-[13px] font-semibold text-muted`}>{L('Aún no has publicado nada.', "You haven't posted anything yet.")}</div>
          ) : (
            <div className="flex flex-col gap-3">
              {myPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── CONFIGURACIÓN ── */}
      {sec === 'config' && (
        <div>
          {backBar(L('Configuración', 'Settings'))}
          <div className="flex flex-col gap-4">
            <div className={`${cardCls} p-4`}>
              <div className="mb-2.5 text-[11px] font-extrabold uppercase tracking-[.05em] text-muted">{L('Idioma', 'Language')}</div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-extrabold text-ink">{L('Idioma de la app', 'App language')}</span>
                <LangToggle />
              </div>
            </div>

            {push !== 'unsupported' && (
              <div className={`${cardCls} p-4`}>
                <div className="mb-2.5 text-[11px] font-extrabold uppercase tracking-[.05em] text-muted">{L('En este dispositivo', 'On this device')}</div>
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 flex-none items-center justify-center rounded-btn bg-amber-bg"><Bell size={18} className="text-amber-ink" stroke={2.2} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-extrabold text-ink">{L('Notificaciones push', 'Push notifications')}</div>
                    <div className="mt-0.5 text-[11.5px] font-semibold leading-snug text-muted">
                      {push === 'granted'
                        ? L('Recibes avisos de tus pedidos aunque la app esté cerrada.', 'You get order updates even when the app is closed.')
                        : push === 'denied'
                        ? L('Bloqueadas. Actívalas en los ajustes de tu navegador para este sitio.', 'Blocked. Enable them in your browser settings for this site.')
                        : L('Activa los avisos de cada paso de tu pedido: confirmado, en camino y entregado.', 'Turn on updates for each step of your order: confirmed, on the way and delivered.')}
                    </div>
                    {push === 'granted' ? (
                      <button onClick={turnOffPush} disabled={pushBusy} className="mt-2.5 cursor-pointer rounded-btn border-[1.5px] border-lilac-line bg-white px-3.5 py-2 text-[12px] font-extrabold text-ink disabled:opacity-50">{L('Desactivar', 'Turn off')}</button>
                    ) : push === 'denied' ? null : (
                      <button onClick={turnOnPush} disabled={pushBusy} className="mt-2.5 cursor-pointer rounded-btn bg-primary px-3.5 py-2 text-[12px] font-extrabold text-white shadow-cta-sm disabled:opacity-50">{pushBusy ? L('Activando…', 'Turning on…') : L('Activar notificaciones', 'Turn on notifications')}</button>
                    )}
                  </div>
                  {push === 'granted' && <span className="flex-none rounded-full bg-green-bg px-2.5 py-1 text-[10px] font-extrabold text-green-dark">{L('Activadas', 'On')}</span>}
                </div>
              </div>
            )}

            <div className={`${cardCls} p-4`}>
              <div className="mb-1 text-[11px] font-extrabold uppercase tracking-[.05em] text-muted">{L('Notificaciones', 'Notifications')}</div>
              {([['posts', L('Respuestas a mis posts', 'Replies to my posts')], ['follows', L('Nuevos seguidores', 'New followers')], ['events', L('Eventos cerca', 'Events nearby')], ['marketing', L('Novedades de To’Latino', 'To’Latino news')]] as [keyof Notifs, string][]).map(([k, label]) => (
                <div key={k} className="flex items-center gap-3 py-2">
                  <span className="min-w-0 flex-1 text-[13px] font-bold text-ink">{label}</span>
                  <Switch on={notifs[k]} onClick={() => toggleNotif(k)} label={label} big />
                </div>
              ))}
            </div>

            <div className={`${cardCls} p-4`}>
              <div className="mb-2.5 text-[11px] font-extrabold uppercase tracking-[.05em] text-muted">{L('Cuenta', 'Account')}</div>
              <div className="flex items-center gap-3 py-1">
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-btn bg-lilac-2"><Mail size={16} className="text-primary-dark" stroke={2.2} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-extrabold text-ink">{L('Correo', 'Email')}</span>
                  <span className="block truncate text-[11.5px] font-semibold text-muted">{auth.user?.email ?? '—'}</span>
                </span>
              </div>
              {auth.user && (
                <button onClick={async () => { await auth.signOut(); router.push('/comunidad'); }} className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-btn border-[1.5px] border-pink-bg bg-white py-2.5 text-[12.5px] font-extrabold text-pink-dark">
                  <LogOut size={14} stroke={2.4} />
                  {L('Cerrar sesión', 'Sign out')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MIS PEDIDOS ── */}
      {sec === 'pedidos' && (
        <div>
          {backBar(L('Mis pedidos', 'My orders'))}
          {act.orders.length === 0 ? txEmpty(L('Aún no tienes pedidos.', 'No orders yet.')) : (
            <div className="flex flex-col gap-2.5">
              {act.orders.map((o) => (
                <button key={o.id} onClick={() => { openOrder(o.id); setReportOpen(false); setReportText(''); }} className={`${cardCls} flex cursor-pointer items-center gap-3 p-3.5 text-left`}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-extrabold text-ink">{o.businesses?.name ?? L('Negocio', 'Business')}{o.code ? <span className="font-bold text-muted"> · {o.code}</span> : null}</span>
                    <span className="block truncate text-[11.5px] font-semibold text-muted">{`${(o.items ?? []).map((i) => `${i.qty}× ${i.name}`).join(', ') || '—'} · ${dt(o.created_at)}`}</span>
                  </span>
                  <span className="flex flex-none flex-col items-end gap-1">
                    {o.total != null && <span className="text-[13px] font-extrabold text-ink">{money(o.fulfillment?.paid_total ?? o.total)}</span>}
                    {orderPill(o)}
                  </span>
                  <ChevronRight size={16} className="flex-none text-muted" />
                </button>
              ))}
              {verMas()}
            </div>
          )}
        </div>
      )}

      {/* ── MIS RESERVAS (citas — Booksy-style: upcoming first, tap for detail) ── */}
      {sec === 'reservas' && (
        <div>
          {backBar(L('Mis reservas', 'My bookings'))}
          {act.bookings.length === 0 ? txEmpty(L('Aún no tienes reservas.', 'No bookings yet.')) : (() => {
            const nowMs = Date.now();
            const isUpcoming = (b: (typeof act.bookings)[number]) => new Date(b.starts_at).getTime() >= nowMs && !['cancelled', 'done', 'no_show'].includes(b.status);
            const upcoming = act.bookings.filter(isUpcoming).sort((a, x) => +new Date(a.starts_at) - +new Date(x.starts_at));
            const past = act.bookings.filter((b) => !isUpcoming(b));
            const bkCard = (b: (typeof act.bookings)[number]) => (
              <Card key={b.id} className="cursor-pointer p-3.5" onClick={() => setBkSelId(b.id)}>
                <div className="flex items-center gap-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-extrabold text-ink">{b.service_name ?? L('Servicio', 'Service')}</span>
                    <span className="block truncate text-[11.5px] font-semibold text-muted">{b.businesses?.name ?? L('Negocio', 'Business')}{b.staff_name ? ` · ${L('con', 'with')} ${b.staff_name}` : ''}</span>
                    <span className="mt-0.5 block text-[11.5px] font-bold text-primary-dark">{dt(b.starts_at)}{b.duration_min ? ` · ${b.duration_min} min` : ''}</span>
                  </span>
                  <span className="flex flex-none flex-col items-end gap-1">
                    {b.total != null && b.total > 0 && <span className="text-[13px] font-extrabold text-ink">{money(b.total)}</span>}
                    {pill(b.status)}
                  </span>
                </div>
              </Card>
            );
            return (
              <div className="flex flex-col gap-2.5">
                {upcoming.length > 0 && <div className="text-[11.5px] font-extrabold uppercase tracking-wide text-muted">{L('Próximas', 'Upcoming')}</div>}
                {upcoming.map(bkCard)}
                {past.length > 0 && <div className="mt-1 text-[11.5px] font-extrabold uppercase tracking-wide text-muted">{L('Anteriores', 'Past')}</div>}
                {past.map(bkCard)}
                {verMas()}
              </div>
            );
          })()}
        </div>
      )}

      {/* ── MIS RENTAS ── */}
      {sec === 'rentas' && (
        <div>
          {backBar(L('Mis rentas', 'My rentals'))}
          {act.rentals.length === 0 ? txEmpty(L('Aún no tienes rentas.', 'No rentals yet.')) : (
            <div className="flex flex-col gap-2.5">
              {act.rentals.map((r) => {
                const dep = r.depositStatus === 'held' ? L('depósito retenido — se libera al devolver', 'deposit held — released on return')
                  : r.depositStatus === 'released' ? L('depósito liberado', 'deposit released')
                  : r.depositStatus === 'captured' ? L(`se cobró ${money(r.depositCaptured)} por daño`, `${money(r.depositCaptured)} charged for damage`)
                  : '';
                return txItem(r.id, r.businesses?.name ?? L('Negocio', 'Business'),
                  `${r.item_count > 1 ? `${r.item_count} ${L('artículos', 'items')} · ` : ''}${r.item_name} · ${dt(r.start_at)}${r.deposit ? ` · ${L('dep.', 'dep.')} ${money(r.deposit)}` : ''}${r.paid ? ` · ${L('pagada', 'paid')}` : ''}${dep ? ` · ${dep}` : ''}`,
                  <>{r.total != null && <span className="text-[13px] font-extrabold text-ink">{money(r.total)}</span>}{pill(r.status)}{cancelBtn('rental', r.id, r.status)}</>);
              })}
              {verMas()}
            </div>
          )}
        </div>
      )}

      {/* ── MIS BOLETOS ── */}
      {sec === 'boletos' && (
        <div>
          {backBar(L('Mis boletos', 'My tickets'))}
          {act.tickets.length === 0 ? txEmpty(L('Aún no tienes boletos.', 'No tickets yet.')) : (
            <div className="flex flex-col gap-2.5">
              {act.tickets.map((t) => {
                const used = t.status === 'used';
                const tierName = t.event_tiers ? L(t.event_tiers.name_es, t.event_tiers.name_en) : null;
                return (
                  <div key={t.id} className={`${cardCls} overflow-hidden`}>
                    <div className="flex items-center gap-3 p-3.5">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-extrabold text-ink">{evTitle(t.events)}</span>
                        <span className="block truncate text-[11.5px] font-semibold text-muted">{t.events ? `${L(t.events.venue_es ?? '', t.events.venue_en ?? '')} · ${dt(t.events.starts_at)}` : ''}</span>
                        <span className="mt-0.5 block truncate text-[11px] font-bold text-muted-2">
                          {tierName ? `${tierName} · ` : ''}{t.qty} {t.qty === 1 ? L('boleto', 'ticket') : L('boletos', 'tickets')}
                          {t.total != null && Number(t.total) > 0 ? ` · ${money(t.total)}` : ''}
                        </span>
                      </span>
                      {used ? <span className="flex-none rounded-full bg-lilac-2 px-2.5 py-1 text-[10.5px] font-extrabold text-muted-2">{L('Usado', 'Used')}</span> : pill(t.status)}
                    </div>
                    {/* ticket stub: a real scannable QR of the entry code (organizer scans
                        or types it). One QR per ticket row; a group ticket admits N at the door. */}
                    <div className={`flex flex-col items-center gap-2 border-t border-dashed border-lilac-line px-3.5 py-3 ${used ? 'bg-lilac-2/40' : 'bg-lilac-3'}`}>
                      <div className={used ? 'relative opacity-40' : 'relative'}>
                        <Qr value={t.code} size={156} />
                        {used && (
                          <span className="absolute inset-0 flex items-center justify-center">
                            <span className="rounded-full bg-ink px-3 py-1 text-[11px] font-extrabold text-white">{L('Usado', 'Used')}</span>
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[15px] font-extrabold tracking-[.14em] text-primary-dark">{t.code}</span>
                      <span className="text-[10.5px] font-semibold text-muted-2">{L('Muestra este código en la entrada', 'Show this at the door')}</span>
                      {t.qty > 1 && t.admitted > 0 && (
                        <span className="text-[10.5px] font-bold text-green-dark">{t.admitted}/{t.qty} {L('ingresaron', 'checked in')}</span>
                      )}
                    </div>
                  </div>
                );
              })}
              {verMas()}
            </div>
          )}
        </div>
      )}

      {/* ── VOY (RSVP) ── */}
      {sec === 'voy' && (
        <div>
          {backBar(L('Voy a asistir', "I'm going"))}
          {act.going.length === 0 ? txEmpty(L('No has marcado "Voy" en ningún evento.', "You haven't RSVP'd to any events.")) : (
            <div className="flex flex-col gap-2.5">
              {act.going.map((g) => (
                <div key={g.event_id} className={`${cardCls} flex items-center gap-3 p-3.5`}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-extrabold text-ink">{evTitle(g.events)}</span>
                    <span className="block truncate text-[11.5px] font-semibold text-muted">{g.events ? `${L(g.events.venue_es ?? '', g.events.venue_en ?? '')} · ${dt(g.events.starts_at)}` : ''}</span>
                  </span>
                  {g.events?.slug && <button onClick={() => act.rsvp(g.events!.slug, false)} className="flex-none cursor-pointer rounded-btn bg-lilac-2 px-3 py-1.5 text-[11px] font-extrabold text-ink-2">{L('Quitar', 'Remove')}</button>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MIS RECLAMOS ── */}
      {sec === 'reclamos' && (
        <div>
          {backBar(L('Mis reclamos', 'My claims'))}
          <div className={`${cardCls} mb-2.5 flex items-start gap-3 p-3.5`}>
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-tile bg-pink-bg"><Flag size={17} stroke={2.2} className="text-pink-dark" /></span>
            <span className="min-w-0 flex-1 text-[11.5px] font-semibold leading-relaxed text-ink-3">
              {L('Si le escribiste al negocio y no se resolvió, abre un reclamo desde tu pedido, reserva, renta o boleto. Nosotros entramos a ayudar.',
                 "If you messaged the business and it wasn't resolved, open a claim from your order, booking, rental or ticket. We step in to help.")}
            </span>
          </div>
          <button onClick={() => setPickPurchase(true)}
            className="mb-2.5 min-h-[44px] w-full cursor-pointer rounded-btn-lg bg-primary text-[13px] font-extrabold text-white shadow-cta">
            {L('Abrir un reclamo', 'Open a claim')}
          </button>
          {claims === null ? txEmpty(L('Cargando…', 'Loading…'))
            : claims.length === 0 ? txEmpty(L('No tienes reclamos. Ojalá siga así.', "You have no claims. Long may it last."))
            : (
            <div className="flex flex-col gap-2.5">
              {claims.map((c) => {
                const st = CLAIM_STATUS[c.status] ?? CLAIM_STATUS.abierto;
                const kd = CLAIM_KIND[c.kind];
                return (
                  <button key={c.id} onClick={() => { setClaimOpen(c); setClaimMsg(''); }} className={`${cardCls} flex cursor-pointer flex-col p-3.5 text-left`}>
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className={`flex-none rounded px-1.5 py-px text-[9px] font-extrabold uppercase ${st.cls}`}>{L(st.es, st.en)}</span>
                      {kd && <span className="flex-none rounded px-1.5 py-px text-[9px] font-extrabold uppercase bg-lilac-2 text-primary-dark">{L(kd.es, kd.en)}</span>}
                      {c.ref_code && <span className="flex-none font-mono text-[10px] font-extrabold tracking-[.04em] text-muted-2">{c.ref_code}</span>}
                      <span className="ml-auto flex-none text-[10.5px] font-semibold text-muted-2">{timeAgo(c.created_at, lang === 'es')}</span>
                    </span>
                    <span className="mt-1.5 text-[13px] font-extrabold text-ink">{c.reason}</span>
                    <span className="mt-0.5 truncate text-[11.5px] font-semibold text-muted">{c.business_name ?? L('Negocio', 'Business')} · {c.messages?.length ?? 0} {L('mensajes', 'messages')}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* hilo del reclamo — lo mismo que ve el negocio y To'Latino */}
      <Overlay open={claimOpen != null} onClose={() => setClaimOpen(null)} width={480}>
        {claimOpen && (() => {
          const st = CLAIM_STATUS[claimOpen.status] ?? CLAIM_STATUS.abierto;
          const closed = claimOpen.status === 'resuelto' || claimOpen.status === 'rechazado';
          return (
            <>
              <OverlayTitle title={L('Mi reclamo', 'My claim')} onClose={() => setClaimOpen(null)} />
              <div className="flex flex-col gap-3">
                <div>
                  <span className={`inline-block rounded px-1.5 py-px text-[9px] font-extrabold uppercase ${st.cls}`}>{L(st.es, st.en)}</span>
                  <div className="mt-1.5 text-[15px] font-extrabold leading-snug text-ink">{claimOpen.reason}</div>
                  <div className="mt-0.5 text-[11.5px] font-semibold text-muted">{claimOpen.business_name ?? L('Negocio', 'Business')}{claimOpen.ref_code ? ` · ${claimOpen.ref_code}` : ''}</div>
                </div>
                <div className="flex flex-col gap-2">
                  {(claimOpen.messages ?? []).map((m, i) => {
                    const mine = m.side === 'cliente';
                    return (
                      <div key={i} className={`max-w-[86%] rounded-card-sm px-3 py-2 ${mine ? 'self-end bg-primary text-white' : m.side === 'admin' ? 'self-start bg-lilac-2 text-ink' : 'self-start bg-app text-ink'}`}>
                        <div className={`text-[9.5px] font-extrabold uppercase tracking-[.04em] ${mine ? 'text-white/70' : 'text-muted-2'}`}>
                          {mine ? L('Tú', 'You') : m.side === 'admin' ? 'To’Latino' : L('Negocio', 'Business')} · {timeAgo(m.at, lang === 'es')}
                        </div>
                        <div className={`mt-0.5 whitespace-pre-wrap break-words text-[12.5px] font-medium leading-relaxed ${mine ? 'text-white' : 'text-ink-2'}`}>{m.text}</div>
                      </div>
                    );
                  })}
                </div>
                {closed && claimOpen.resolution && (
                  <div className="rounded-field bg-green-bg px-3 py-2.5">
                    <div className="text-[10px] font-extrabold uppercase tracking-[.04em] text-green-dark">{L('Cómo se resolvió', 'How it was resolved')}</div>
                    <div className="mt-0.5 text-[12px] font-medium leading-relaxed text-ink-2">{claimOpen.resolution}</div>
                  </div>
                )}
                {closed ? (
                  <div className="rounded-field bg-app px-3 py-2.5 text-center text-[11.5px] font-bold text-muted">
                    {L('Este caso está cerrado. Si sigue el problema, abre uno nuevo.', 'This case is closed. If the problem persists, open a new one.')}
                  </div>
                ) : (
                  <div className="border-t border-hair pt-3">
                    <textarea value={claimMsg} onChange={(e) => setClaimMsg(e.target.value.slice(0, 800))} rows={2}
                      placeholder={L('Escribe aquí…', 'Write here…')}
                      className="w-full resize-none rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2.5 text-[13px] font-medium text-ink outline-none focus:border-primary" />
                    <PrimaryBtn className="mt-2 w-full" disabled={claimBusy || !claimMsg.trim()} onClick={sendClaimMsg}>
                      {claimBusy ? L('Enviando…', 'Sending…') : L('Enviar', 'Send')}
                    </PrimaryBtn>
                  </div>
                )}
              </div>
            </>
          );
        })()}
      </Overlay>

      {/* elegir la compra del reclamo (cubre pedidos, reservas, rentas y boletos) */}
      <Overlay open={pickPurchase} onClose={() => setPickPurchase(false)} width={440}>
        <OverlayTitle title={L('¿Sobre qué compra?', 'Which purchase?')} onClose={() => setPickPurchase(false)} />
        {(() => {
          const opts: { kind: string; refId: string; refCode: string | null; businessId: string | null; bizName: string; sub: string }[] = [
            ...act.orders.map((o) => ({ kind: 'orden', refId: o.id, refCode: o.code, businessId: o.business_id, bizName: o.businesses?.name ?? L('Negocio', 'Business'), sub: `${L('Pedido', 'Order')} · ${dt(o.created_at)}` })),
            ...act.bookings.map((b) => ({ kind: 'reserva', refId: b.id, refCode: null, businessId: b.business_id, bizName: b.businesses?.name ?? L('Negocio', 'Business'), sub: `${b.service_name ?? L('Reserva', 'Booking')} · ${dt(b.starts_at)}` })),
            ...act.rentals.map((r) => ({ kind: 'renta', refId: r.id, refCode: null, businessId: r.business_id, bizName: r.businesses?.name ?? L('Negocio', 'Business'), sub: `${r.item_name} · ${dt(r.start_at)}` })),
            ...act.tickets.map((t) => ({ kind: 'boleto', refId: t.id, refCode: t.code, businessId: null, bizName: evTitle(t.events), sub: `${L('Boleto', 'Ticket')} · ${dt(t.created_at)}` })),
          ];
          if (opts.length === 0) return (
            <div className="py-6 text-center text-[12.5px] font-semibold text-muted">
              {L('Todavía no tienes compras. Un reclamo siempre va sobre algo que compraste.', 'You have no purchases yet. A claim is always about something you bought.')}
            </div>
          );
          return (
            <div className="flex max-h-[52vh] flex-col gap-1.5 overflow-y-auto">
              {opts.map((o) => (
                <button key={`${o.kind}-${o.refId}`}
                  onClick={() => { setPickPurchase(false); setNewClaim({ kind: o.kind, refId: o.refId, refCode: o.refCode, businessId: o.businessId, bizName: o.bizName }); setClaimReason(null); setClaimDetail(''); }}
                  className="flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-field border-[1.5px] border-line px-3 py-2.5 text-left hover:border-primary">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-extrabold text-ink">{o.bizName}{o.refCode ? ` · ${o.refCode}` : ''}</span>
                    <span className="block truncate text-[11px] font-semibold text-muted">{o.sub}</span>
                  </span>
                  <ChevronRight size={15} className="flex-none text-muted-2" />
                </button>
              ))}
            </div>
          );
        })()}
      </Overlay>

      {/* abrir un reclamo sobre una compra */}
      <Overlay open={newClaim != null} onClose={() => setNewClaim(null)} width={440}>
        {newClaim && (
          <>
            <OverlayTitle title={L('Abrir un reclamo', 'Open a claim')} onClose={() => setNewClaim(null)} />
            <div className="mb-3 rounded-field bg-lilac-2 px-3 py-2.5 text-[11.5px] font-semibold leading-relaxed text-ink-soft">
              {L('To’Latino entra a mediar entre tú y el negocio. Verás las respuestas aquí en Mi cuenta.',
                 "To'Latino steps in to mediate between you and the business. You'll see replies here in My account.")}
            </div>
            <div className="mb-3 rounded-field bg-app px-3 py-2.5">
              <div className="text-[10px] font-extrabold uppercase tracking-[.04em] text-muted-2">{L('Sobre', 'About')}</div>
              <div className="mt-0.5 text-[12.5px] font-extrabold text-ink">{newClaim.bizName}{newClaim.refCode ? ` · ${newClaim.refCode}` : ''}</div>
            </div>
            <div className="mb-1.5 text-[12.5px] font-extrabold text-ink">{L('¿Qué pasó?', 'What happened?')}</div>
            <div className="flex flex-col gap-1.5">
              {[
                ['No recibí lo que pagué', "I didn't get what I paid for"],
                ['Llegó mal o incompleto', 'Arrived wrong or incomplete'],
                ['Me cobraron de más', 'I was overcharged'],
                ['El negocio no responde', "The business doesn't respond"],
                ['Pedí un reembolso y no llegó', "I asked for a refund and never got it"],
                ['Otro problema', 'Another problem'],
              ].map(([resEs, resEn]) => (
                <button key={resEn} onClick={() => setClaimReason(resEs)}
                  className={`min-h-[44px] cursor-pointer rounded-field border-[1.5px] px-3.5 py-2.5 text-left text-[13px] font-bold ${
                    claimReason === resEs ? 'border-primary bg-lilac-3 text-ink' : 'border-line text-ink-soft'}`}>
                  {L(resEs, resEn)}
                </button>
              ))}
            </div>
            <div className="mb-1.5 mt-3 text-[12.5px] font-extrabold text-ink">{L('Cuéntanos con tus palabras', 'Tell us in your own words')}</div>
            <textarea value={claimDetail} onChange={(e) => setClaimDetail(e.target.value.slice(0, 800))} rows={3}
              placeholder={L('Entre más detalles, más rápido lo resolvemos.', 'The more details, the faster we resolve it.')}
              className="w-full resize-none rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2.5 text-[13px] font-medium text-ink outline-none focus:border-primary" />
            <PrimaryBtn className="mt-3" disabled={!claimReason || claimBusy} onClick={sendClaim}>
              {claimBusy ? L('Abriendo…', 'Opening…') : L('Abrir reclamo', 'Open claim')}
            </PrimaryBtn>
          </>
        )}
      </Overlay>

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-[70] -translate-x-1/2 whitespace-nowrap rounded-xl bg-ink px-4 py-3 text-[12.5px] font-bold text-white shadow-modal">{toast}</div>
      )}

      <ConfirmDialog
        open={cancelTarget !== null}
        onClose={() => setCancelTarget(null)}
        onConfirm={doCancel}
        title={L('¿Cancelar esta solicitud?', 'Cancel this request?')}
        message={L('Se marcará como cancelada en tu actividad y en el panel del negocio. No se puede deshacer.', 'It will be marked cancelled in your activity and on the business dashboard. This can’t be undone.')}
        confirmLabel={L('Sí, cancelar', 'Yes, cancel')}
        cancelLabel={L('No', 'No')}
      />

      {/* ── appointment detail (Mis reservas) — Booksy-style card + actions ── */}
      <Overlay open={bkSelId !== null} onClose={() => setBkSelId(null)} width={440}>
        {(() => {
          const bk = act.bookings.find((x) => x.id === bkSelId); // live row → status advances
          if (!bk) return null;
          const future = new Date(bk.starts_at).getTime() > Date.now();
          const active = bk.status === 'pending' || bk.status === 'confirmed';
          const slug = bk.businesses?.slug;
          const row = (label: string, val: ReactNode) => (
            <div className="flex items-start justify-between gap-3 border-t border-hair py-2.5 first:border-t-0">
              <span className="flex-none text-[12px] font-bold text-muted">{label}</span>
              <span className="min-w-0 text-right text-[12.5px] font-extrabold text-ink">{val}</span>
            </div>
          );
          const addToCal = () => {
            const start = new Date(bk.starts_at);
            const end = new Date(start.getTime() + (bk.duration_min ?? 60) * 60000);
            const esc = (s: string) => s.replace(/([\\;,])/g, '\\$1');
            const p2 = (n: number) => String(n).padStart(2, '0');
            const stamp = (d: Date) => `${d.getUTCFullYear()}${p2(d.getUTCMonth() + 1)}${p2(d.getUTCDate())}T${p2(d.getUTCHours())}${p2(d.getUTCMinutes())}00Z`;
            const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ToLatino//Citas//ES', 'BEGIN:VEVENT',
              `UID:${bk.id}@tolatino`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`,
              `SUMMARY:${esc(`${bk.service_name ?? 'Cita'} · ${bk.businesses?.name ?? ''}`)}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
            const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
            const a = document.createElement('a');
            a.href = url; a.download = 'cita.ics'; a.click();
            URL.revokeObjectURL(url);
          };
          return (
            <>
              <OverlayTitle title={bk.service_name ?? L('Reserva', 'Booking')} onClose={() => setBkSelId(null)} />
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-[13px] font-bold text-ink-soft">{bk.businesses?.name ?? L('Negocio', 'Business')}</span>
                {pill(bk.status)}
              </div>
              <Card className="px-4 py-1.5">
                {row(L('Fecha y hora', 'Date & time'), `${dt(bk.starts_at)}${bk.duration_min ? ` · ${bk.duration_min} min` : ''}`)}
                {bk.staff_name && row(L('Profesional', 'Professional'), bk.staff_name)}
                {bk.variant && row(L('Opción', 'Option'), bk.variant)}
                {bk.party_size != null && bk.party_size > 1 && row(L('Personas', 'People'), String(bk.party_size))}
                {Array.isArray(bk.addons) && bk.addons.length > 0 && row('Extras', bk.addons.map((a) => `${a.n}${a.p ? ` (+$${a.p})` : ''}`).join(', '))}
                {bk.notes && row(L('Notas', 'Notes'), bk.notes)}
                {bk.deposit != null && bk.deposit > 0 && row(L('Pagado al reservar', 'Paid at booking'), money(bk.deposit))}
                {bk.total != null && bk.total > 0 && row('Total', <span className="text-primary-dark">{money(bk.total)}</span>)}
              </Card>
              {active && (
                <button onClick={addToCal} className="mt-3 w-full cursor-pointer rounded-field border-[1.5px] border-lilac-line bg-white py-3 text-[13px] font-extrabold text-primary-dark">
                  {L('Agregar al calendario', 'Add to calendar')}
                </button>
              )}
              {active && future && slug && (
                <PrimaryBtn className="mt-2.5" onClick={() => { setBkSelId(null); router.push(`/negocios/?b=${encodeURIComponent(slug)}&bt=services&resched=${bk.id}`); }}>
                  {L('Reagendar cita', 'Reschedule appointment')}
                </PrimaryBtn>
              )}
              {active && (
                <button
                  onClick={() => { setBkSelId(null); setCancelTarget({ kind: 'booking', id: bk.id }); }}
                  className="mt-2.5 w-full cursor-pointer rounded-field border-[1.5px] border-pink-bg bg-white py-3 text-[13px] font-extrabold text-pink-dark"
                >
                  {L('Cancelar cita', 'Cancel appointment')}
                </button>
              )}
            </>
          );
        })()}
      </Overlay>

      {/* ── order detail / tracking (DoorDash-style) ── */}
      <Overlay open={orderSelId !== null} onClose={() => closeOrder()} width={460} fullHeightSheet>
        {(() => {
          const o = act.orders.find((x) => x.id === orderSelId); // live row → advances in real time
          if (!o) return null;
          const f = o.fulfillment ?? {};
          const isDel = o.channel === 'delivery';
          // STORE order (Tienda — all lines are products) → Amazon voice: packing,
          // day-based delivery, "ready for store pickup". Food keeps DoorDash.
          const isStore = f.kind === 'store';
          const stage = orderStageKey(o); // new|preparing|ready|on_the_way|delivered|completed|cancelled
          const delivered = stage === 'delivered' || stage === 'completed';
          const bizName = o.businesses?.name ?? L('el negocio', 'the business');
          const driverIni = f.driver ? (f.driver.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'R') : '';
          // 4-step flow: 1 waiting/confirmed · 2 preparing/packing · 3 on the way/ready · 4 done.
          const s4 = orderStageIdx(o); // shared mapping — same one Cocina shows the owner
          const prepLab: [string, string] = isStore ? ['Empacando', 'Packing'] : ['Preparando', 'Preparing'];
          const stepLabels: [string, string][] = isDel
            ? [[s4 > 0 ? 'Confirmado' : 'Esperando confirmación', s4 > 0 ? 'Confirmed' : 'Awaiting confirmation'], prepLab, ['En camino', 'On the way'], ['Entregado', 'Delivered']]
            : [[s4 > 0 ? 'Confirmado' : 'Esperando confirmación', s4 > 0 ? 'Confirmed' : 'Awaiting confirmation'], prepLab, ['Listo', 'Ready'], ['Recogido', 'Picked up']];

          // Receipt (shared by tracking + the delivered screen). Store orders get
          // Amazon-style item thumbnails.
          const receipt = (
            <div className="rounded-card border border-line bg-white p-3.5 shadow-card">
              {(o.items ?? []).map((it, i) => (
                <div key={i} className="flex items-center justify-between gap-3 py-0.5 text-[12.5px] font-semibold text-ink-2">
                  {isStore && (
                    <span className="relative h-9 w-9 flex-none overflow-hidden rounded-lg bg-lilac-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {it.img && <img src={imgUrl(it.img, ANCHO.tarjeta)} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate">{it.qty}× {it.name}{it.opts ? <span className="text-muted"> · {it.opts}</span> : null}</span>
                  {it.price != null && <span className="flex-none">{money(it.price * it.qty)}</span>}
                </div>
              ))}
              <div className="mt-2 flex flex-col gap-1 border-t border-hair pt-2 text-[12px] font-semibold text-ink-2">
                {f.subtotal != null && <div className="flex justify-between"><span>{L('Subtotal', 'Subtotal')}</span><span>{money(f.subtotal)}</span></div>}
                {!!f.delivery_fee && <div className="flex justify-between"><span>{L('Entrega', 'Delivery')}</span><span>{money(f.delivery_fee)}</span></div>}
                {!!f.service_fee && <div className="flex justify-between"><span>{L('Servicio', 'Service')}</span><span>{money(f.service_fee)}</span></div>}
                {!!f.tip && <div className="flex justify-between"><span>{L('Propina', 'Tip')}</span><span>{money(f.tip)}</span></div>}
                {!!f.discount && <div className="flex justify-between text-green-dark"><span>{L('Descuento', 'Discount')}{f.promo ? ` · ${f.promo}` : ''}</span><span>−{money(f.discount)}</span></div>}
                <div className="flex justify-between text-[13.5px] font-extrabold text-ink"><span>{L('Total pagado', 'Total paid')}</span><span>{money(f.paid_total ?? o.total)}</span></div>
              </div>
            </div>
          );

          // Report / message the business (shared).
          const reportBlock = !reportOpen ? (
            <button onClick={() => setReportOpen(true)} className="flex w-full items-center gap-3 rounded-card border border-line bg-white p-3.5 text-left shadow-card">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-tile bg-pink-bg"><Flag size={17} stroke={2.2} className="text-pink-dark" /></span>
              <span className="min-w-0 flex-1"><span className="block text-[13px] font-extrabold text-ink">{L('Reportar un problema', 'Report a problem')}</span><span className="block text-[11px] font-semibold text-muted">{L('¿Algo salió mal? Te ayudamos', 'Something wrong? We can help')}</span></span>
              <ChevronRight size={16} className="flex-none text-muted-2" />
            </button>
          ) : (
            <div className="rounded-card border-[1.5px] border-lilac-line bg-white p-3">
              <div className="text-[12px] font-extrabold text-ink">{L('Escríbele al negocio sobre tu pedido', 'Message the business about your order')}</div>
              <textarea value={reportText} onChange={(e) => setReportText(e.target.value)} maxLength={500} rows={3}
                placeholder={L('Ej. faltó un platillo, llegó frío, dirección equivocada…', 'E.g. missing item, arrived cold, wrong address…')}
                className="mt-2 w-full resize-none rounded-field border-[1.5px] border-lilac-line bg-app px-3 py-2.5 text-[12.5px] font-semibold text-ink outline-none placeholder:text-muted focus:border-primary" />
              <div className="mt-2 flex gap-2">
                <button onClick={() => { setReportOpen(false); setReportText(''); }} className="flex-none cursor-pointer rounded-btn border-[1.5px] border-lilac-line bg-white px-4 py-2.5 text-[12px] font-extrabold text-ink">{L('Cerrar', 'Close')}</button>
                <PrimaryBtn disabled={!reportText.trim() || reportBusy} onClick={async () => {
                  if (!o.businesses?.slug || reportBusy) return;
                  setReportBusy(true);
                  const nm = p?.display_name?.trim() || 'Cliente';
                  const ini = (nm.split(/\s+/).map((w) => w[0]).join('').slice(0, 2) || 'CL').toUpperCase();
                  const convId = await startConversation(o.businesses.slug, nm, ini, '#7B61FF');
                  const ok = convId ? await sendChatMessage(convId, false, `⚠️ ${L('Sobre mi pedido', 'About my order')} ${o.code ?? ''}: ${reportText.trim()}`) : null;
                  setReportBusy(false);
                  if (ok) { setReportOpen(false); setReportText(''); flash(L('Mensaje enviado — el negocio te responderá', 'Message sent — the business will reply')); }
                  else flash(L('No se pudo enviar', "Couldn't send"));
                }}>{reportBusy ? L('Enviando…', 'Sending…') : L('Enviar al negocio', 'Send to business')}</PrimaryBtn>
              </div>
              {/* escalada: el negocio ya tuvo su turno y no se resolvió */}
              <button
                onClick={() => { setNewClaim({ kind: 'orden', refId: o.id, refCode: o.code, businessId: o.business_id, bizName: o.businesses?.name ?? bizName }); setClaimReason(null); setClaimDetail(''); }}
                className="mt-2.5 min-h-[44px] w-full cursor-pointer rounded-btn border-[1.5px] border-pink-dark bg-white text-[12px] font-extrabold text-pink-dark"
              >
                {L('El negocio no responde — abrir reclamo', "Business isn't responding — open a claim")}
              </button>
            </div>
          );

          // ══ DELIVERED (screen 3) ═══════════════════════════════════════════
          if (delivered) {
            return (
              <>
                <OverlayTitle title={bizName} onClose={() => closeOrder()} />
                <div className="rounded-card px-5 py-6 text-center text-white shadow-cta" style={{ background: 'linear-gradient(155deg,#22A55C,#137A44)' }}>
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/20"><Check size={28} stroke={3} /></span>
                  <div className="mt-3 text-[19px] font-extrabold">{isDel ? L('¡Pedido entregado!', 'Order delivered!') : L('¡Pedido completado!', 'Order completed!')}</div>
                  <div className="mt-1 text-[12.5px] font-semibold text-white/85">{isDel ? L(`Tu pedido de ${bizName} ya llegó.`, `Your order from ${bizName} has arrived.`) : L(`Recogiste tu pedido de ${bizName}.`, `You picked up your order from ${bizName}.`)}</div>
                </div>

                {isDel && (
                  <div className="relative mt-3 h-[118px] overflow-hidden rounded-card border border-line" style={{ background: 'repeating-linear-gradient(135deg,#EAE2F8 0 11px,#DCCEF2 11px 22px)' }}>
                    <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-muted-2">{L('[ foto de entrega ]', '[ delivery photo ]')}</span>
                    {(f.instructions || f.address_label) && <span className="absolute bottom-2 left-2 max-w-[85%] truncate rounded-md bg-ink/80 px-2 py-1 text-[10px] font-bold text-white">{f.instructions || f.address_label}</span>}
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between rounded-card border border-line bg-white p-3.5 shadow-card">
                  <div className="min-w-0">
                    <div className="text-[13px] font-extrabold text-ink">{o.code ?? L('Pedido', 'Order')}</div>
                    <div className="truncate text-[11px] font-semibold text-muted">{(o.items?.length ?? 0)} {L('artículo(s)', 'item(s)')}{f.driver ? ` · ${L('Entregado por', 'Delivered by')} ${f.driver}` : ''}</div>
                  </div>
                  <div className="flex-none text-[15px] font-extrabold text-ink">{money(f.paid_total ?? o.total)}</div>
                </div>

                {/* quick rating → posts a real review for the business */}
                <div className="mt-3 rounded-card border border-line bg-white p-3.5 text-center shadow-card">
                  {rated ? (
                    <div className="text-[12.5px] font-extrabold text-green-dark">{L('¡Gracias por tu reseña!', 'Thanks for your review!')}</div>
                  ) : (
                    <>
                      <div className="text-[12.5px] font-extrabold text-ink">{L('¿Cómo estuvo tu pedido?', 'How was your order?')}</div>
                      <div className="mt-2 flex justify-center gap-1.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button key={n} aria-label={`${n}`} onClick={async () => { setRateStars(n); if (!o.businesses?.slug) return; setRated(true); await postReview(o.businesses.slug, n, ''); flash(L('¡Gracias por calificar!', 'Thanks for rating!')); }} className="cursor-pointer">
                            {n <= rateStars ? <StarFilled size={30} className="text-amber" /> : <Star size={30} stroke={2} className="text-muted-faint" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <div className="mt-4 text-[11px] font-extrabold uppercase tracking-wider text-muted-2">{L('¿Qué deseas hacer?', 'What would you like to do?')}</div>
                <div className="mt-2 flex flex-col gap-2">
                  <button onClick={() => { closeOrder(); router.push(`/negocios/?b=${o.businesses?.slug ?? ''}&bt=${isStore ? 'shop' : 'menu'}`); }} className="flex w-full items-center gap-3 rounded-card border border-line bg-white p-3.5 text-left shadow-card">
                    <span className="flex h-9 w-9 flex-none items-center justify-center rounded-tile bg-green-bg"><Repeat size={17} stroke={2.2} className="text-green-dark" /></span>
                    <span className="min-w-0 flex-1"><span className="block text-[13px] font-extrabold text-ink">{isStore ? L('Volver a comprar', 'Buy again') : L('Volver a pedir', 'Order again')}</span><span className="block text-[11px] font-semibold text-muted">{isStore ? L('Vuelve a la tienda en un toque', 'Back to the store in one tap') : L('Repite este pedido en un toque', 'Reorder in one tap')}</span></span>
                    <ChevronRight size={16} className="flex-none text-muted-2" />
                  </button>
                  <button onClick={() => setShowReceipt((v) => !v)} className="flex w-full items-center gap-3 rounded-card border border-line bg-white p-3.5 text-left shadow-card">
                    <span className="flex h-9 w-9 flex-none items-center justify-center rounded-tile bg-lilac-2"><Receipt size={17} stroke={2.2} className="text-primary-dark" /></span>
                    <span className="min-w-0 flex-1"><span className="block text-[13px] font-extrabold text-ink">{L('Ver recibo', 'View receipt')}</span><span className="block text-[11px] font-semibold text-muted">{o.code ?? ''} · {money(f.paid_total ?? o.total)}</span></span>
                    <ChevronRight size={16} className={`flex-none text-muted-2 transition-transform ${showReceipt ? 'rotate-90' : ''}`} />
                  </button>
                  {showReceipt && receipt}
                  {reportBlock}
                </div>
              </>
            );
          }

          // ══ CANCELLED ══════════════════════════════════════════════════════
          if (stage === 'cancelled') {
            return (
              <>
                <OverlayTitle title={bizName} onClose={() => closeOrder()} />
                <div className="flex items-center justify-between"><span className="text-[11.5px] font-bold text-muted">{o.code ?? ''} · {dt(o.created_at)}</span>{pill(stage)}</div>
                <div className="mt-3 rounded-field bg-pink-bg px-3.5 py-3 text-[12.5px] font-bold text-pink-dark">{L('Este pedido fue cancelado.', 'This order was cancelled.')}</div>
                <div className="mt-3">{receipt}</div>
              </>
            );
          }

          // ══ LIVE TRACKING (screen 2) ═══════════════════════════════════════
          return (
            <>
              <OverlayTitle title={isStore ? L('Sigue tu compra', 'Track your purchase') : L('Sigue tu pedido', 'Track your order')} onClose={() => closeOrder()} />
              <div className="flex items-center justify-between">
                <span className="text-[11.5px] font-bold text-muted">{o.code ?? ''} · {bizName}</span>
                {orderPill(o)}
              </div>

              {/* map (illustrative) once a driver is on the way */}
              {stage === 'on_the_way' && (
                <div className="relative mt-3 h-[128px] overflow-hidden rounded-card border border-line" style={{ background: '#EAEEF6' }}>
                  <svg className="absolute inset-0 h-full w-full" viewBox="0 0 300 128" preserveAspectRatio="none"><path d="M40 96 C 110 96, 120 40, 210 34" fill="none" stroke="#7B61FF" strokeWidth="3" strokeDasharray="6 6" strokeLinecap="round" /></svg>
                  <span className="absolute left-[34px] top-[86px] h-3.5 w-3.5 rounded-full border-2 border-white bg-green shadow-card" />
                  <span className="absolute right-[26px] top-[22px] flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-primary text-white shadow-card">{isStore ? <Truck size={15} stroke={2.4} /> : <Bike size={15} stroke={2.4} />}</span>
                  <span className="absolute right-2 top-2 rounded-md bg-ink/85 px-2 py-1 text-[10px] font-extrabold text-white">{f.eta ? `${f.eta} · ${L('a ti', 'to you')}` : L('En ruta', 'En route')}</span>
                </div>
              )}

              {/* ETA banner — store: day-based delivery window / "we'll notify you" */}
              {f.eta_range ? (
                <div className="mt-3 rounded-field bg-lilac-3 px-3.5 py-3 text-primary-dark">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider opacity-70">
                    {isStore
                      ? isDel ? L('Entrega estimada', 'Estimated delivery') : L('Listo para recoger', 'Ready for pickup')
                      : isDel ? L('Llega en aprox.', 'Arriving in approx.') : L('Listo en aprox.', 'Ready in approx.')}
                  </div>
                  <div className="text-[18px] font-extrabold">{f.eta_range}</div>
                </div>
              ) : isStore && !isDel && s4 < 2 ? (
                <div className="mt-3 rounded-field bg-lilac-3 px-3.5 py-3 text-[12px] font-bold leading-snug text-primary-dark">
                  {L('Te avisaremos cuando tu pedido esté listo para recoger en tienda.', "We'll let you know when your order is ready for store pickup.")}
                </div>
              ) : null}
              {isStore && !isDel && s4 === 2 && (
                <div className="mt-3 rounded-field bg-green-bg px-3.5 py-3 text-[12.5px] font-extrabold text-green-dark">
                  {L('🛍️ Tu pedido está listo — pasa a recogerlo en tienda.', '🛍️ Your order is ready — come pick it up in store.')}
                </div>
              )}

              {/* 4-step horizontal progress */}
              <div className="mt-4 flex items-start">
                {stepLabels.map((lab, i) => {
                  const isDone = i < s4; const isNow = i === s4;
                  return (
                    <div key={i} className="flex flex-1 flex-col items-center">
                      <div className="flex w-full items-center">
                        <span className={`h-[3px] flex-1 rounded-full ${i === 0 ? 'opacity-0' : isDone || isNow ? 'bg-primary' : 'bg-lilac-line'}`} />
                        <span className={`flex h-7 w-7 flex-none items-center justify-center rounded-full ${isDone ? 'bg-green' : isNow ? 'bg-primary' : 'bg-lilac-line'}`}>
                          {isDone ? <Check size={14} stroke={3.4} className="text-white" /> : <span className={`h-2 w-2 rounded-full ${isNow ? 'animate-pulse bg-white' : 'bg-white/70'}`} />}
                        </span>
                        <span className={`h-[3px] flex-1 rounded-full ${i === stepLabels.length - 1 ? 'opacity-0' : isDone ? 'bg-primary' : 'bg-lilac-line'}`} />
                      </div>
                      <span className={`mt-1.5 px-0.5 text-center text-[9.5px] leading-tight ${isNow ? 'font-extrabold text-ink' : isDone ? 'font-bold text-ink-soft' : 'font-semibold text-muted-2'}`}>{L(lab[0], lab[1])}</span>
                    </div>
                  );
                })}
              </div>

              {/* driver card */}
              {f.driver && (stage === 'on_the_way' || f.dispatch === 'assigned' || f.dispatch === 'picked_up') && (
                <div className="mt-4 rounded-card border border-line bg-white p-3 shadow-card">
                  <div className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-muted-2">{L('Tu repartidor', 'Your driver')}</div>
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-lilac-2 text-[13px] font-extrabold text-primary-dark">{driverIni}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-extrabold text-ink">{f.driver}</div>
                      <div className="truncate text-[11.5px] font-semibold text-muted">{f.driver_vehicle || L('En camino a ti', 'On the way to you')}</div>
                    </div>
                    {f.driver_phone && (
                      <a href={`tel:${f.driver_phone.replace(/[^\d+]/g, '')}`} aria-label={L('Llamar', 'Call')} className="flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-full bg-green-bg text-green-dark"><Phone size={15} stroke={2.4} /></a>
                    )}
                    <button onClick={() => setReportOpen(true)} aria-label={L('Mensaje', 'Message')} className="flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-full bg-lilac-2 text-primary-dark"><MessageCircle size={15} stroke={2.4} /></button>
                  </div>
                </div>
              )}

              {/* from / to (delivery) */}
              {isDel && f.address && (
                <div className="mt-3 rounded-card border border-line bg-white p-3.5 text-[12.5px] font-semibold shadow-card">
                  <div className="flex items-start gap-2.5">
                    <span className="mt-1 block h-2.5 w-2.5 flex-none rounded-full border-[2.5px] border-primary" />
                    <div className="min-w-0"><div className="text-[9.5px] font-extrabold uppercase tracking-wider text-muted-2">{L('Desde', 'From')}</div><div className="truncate text-ink">{bizName}</div></div>
                  </div>
                  <div className="my-1 ml-[4px] h-4 w-[2px] bg-lilac-line" />
                  <div className="flex items-start gap-2.5">
                    <MapPin size={15} stroke={2.4} className="mt-0.5 flex-none text-green-dark" />
                    <div className="min-w-0"><div className="text-[9.5px] font-extrabold uppercase tracking-wider text-muted-2">{L('Hasta', 'To')}</div><div className="text-ink">{f.address_label ? `${f.address_label} · ` : ''}{f.address}</div>{f.instructions && <div className="mt-0.5 text-[11px] font-medium text-muted">{f.instructions}</div>}</div>
                  </div>
                </div>
              )}

              {/* order summary */}
              <div className="mt-3">{receipt}</div>

              {/* actions */}
              <div className="mt-3 flex flex-col gap-2">
                {o.status === 'new' && (
                  <button onClick={() => { closeOrder(); setCancelTarget({ kind: 'order', id: o.id }); }} className="w-full cursor-pointer rounded-btn border-[1.5px] border-pink-bg bg-white py-2.5 text-[12.5px] font-extrabold text-pink-dark">
                    {L('Cancelar pedido', 'Cancel order')}
                  </button>
                )}
                {reportBlock}
              </div>
            </>
          );
        })()}
      </Overlay>
    </div>
  );
}
