'use client';

// Mi cuenta — the user account hub (consumer "dashboard"). Built from the
// established design system: the same card + section-row + in-page-subview
// pattern as the business panel, only design-system tokens/components. Real,
// signed-in-user data: editable profile (name/bio/city), saved addresses (CRUD),
// notification prefs, the user's own posts, and quick links to Guardados /
// Siguiendo / Notificaciones / the business panel. No improvised UI.

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { IconBell as Bell, IconBike as Bike, IconBookmark as Bookmark, IconCalendarCheck as CalendarCheck, IconCalendar as CalendarDays, IconCheck as Check, IconChevronLeft as ChevronLeft, IconChevronRight as ChevronRight, IconGlobe as Globe, IconHelpCircle as HelpCircle, IconLayoutDashboard as LayoutDashboard, IconLogin as LogIn, IconLogout as LogOut, IconMail as Mail, IconMapPin as MapPin, IconSpeakerphone as Megaphone, IconMessageCircle as MessageCircle, IconFlag as Flag, IconPhone as Phone, IconPlus as Plus, IconReceipt as Receipt, IconRepeat as Repeat, IconShoppingBag as ShoppingBag, IconStar as Star, IconStarFilled as StarFilled, IconTicket as Ticket, IconTrash as Trash2, IconUser as User, IconUsers as Users } from '@tabler/icons-react';
import { useLang } from '@/lib/i18n';
import { useApp } from '@/lib/state';
import { useAuth } from '@/lib/auth';
import { useAddresses } from '@/lib/addresses';
import { useFollows } from '@/lib/follows';
import { useSavedBiz } from '@/lib/savedBiz';
import { useLiveData } from '@/lib/live';
import { useMyActivity, type MyOrder } from '@/lib/myActivity';
import { postReview } from '@/lib/live';
import { useUrlTab, useUrlDetail } from '@/lib/urlView';
import { startConversation, sendChatMessage } from '@/lib/chat';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Qr } from '@/components/Qr';
import { Avatar, Card, Overlay, OverlayTitle, PrimaryBtn, Switch, YouAvatar } from '@/components/ui';
import { LangToggle } from '@/components/AppHeader';
import { PostCard } from '@/components/PostCard';

type Sec = 'home' | 'perfil' | 'direcciones' | 'posts' | 'config' | 'pedidos' | 'reservas' | 'rentas' | 'boletos' | 'voy';
// Valid ?sec= values restored on refresh (keep in sync with Sec).
const SEC_VALUES = new Set<string>(['home', 'perfil', 'direcciones', 'posts', 'config', 'pedidos', 'reservas', 'rentas', 'boletos', 'voy']);

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

const cardCls = 'rounded-card border border-hair bg-white shadow-card';
const inputCls =
  'w-full rounded-field border-[1.5px] border-lilac-line bg-app px-3.5 py-3 text-[13.5px] font-medium text-ink outline-none placeholder:text-muted focus:border-primary';

export function CuentaScreen() {
  const { L } = useLang();
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

  // Order detail sheet (DoorDash-style tracking): selection (mirrored to ?order=)
  // + live row refresh, and the "report a problem" mini-form (real chat to biz).
  const { value: orderSelId, open: openOrder, close: closeOrder } = useUrlDetail('order');
  const [reportOpen, setReportOpen] = useState(false);
  const [reportText, setReportText] = useState('');
  const [reportBusy, setReportBusy] = useState(false);
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
  const notifs: Notifs = { ...DEFAULT_NOTIFS, ...((p?.settings?.notifications as Partial<Notifs>) ?? {}) };
  const myPosts = live.posts.filter((x) => x.authorId && x.authorId === auth.user?.id);

  const es = L('es', 'en') === 'es';
  const dt = (iso: string) => new Date(iso).toLocaleString(es ? 'es-US' : 'en-US', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  const money = (n: number | null | undefined) => (n == null ? '' : '$' + Number(n).toFixed(2));
  const pill = (status: string) => {
    const s = STATUS[status] ?? { es: status, en: status, bg: '#F1EFFA', c: '#8A86A0' };
    return <span className="flex-none rounded-full px-2 py-0.5 text-[10px] font-extrabold" style={{ background: s.bg, color: s.c }}>{L(s.es, s.en)}</span>;
  };
  const txEmpty = (msg: string) => <div className={`${cardCls} p-6 text-center text-[13px] font-semibold text-muted`}>{msg}</div>;
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
        {p ? <Avatar initials={p.initials} color={p.avatar_color} size={48} /> : <YouAvatar size={48} />}
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
            <div className="flex items-center gap-3 rounded-card border border-hair bg-white p-3.5 shadow-card">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-lilac"><LogIn size={18} className="text-primary" stroke={2.2} /></span>
              <span className="min-w-0 flex-1 text-[12.5px] font-semibold text-ink-3">{L('Inicia sesión para editar tu perfil y guardar tu actividad.', 'Sign in to edit your profile and keep your activity.')}</span>
              <button onClick={() => router.push('/entrar')} className="flex-none cursor-pointer rounded-btn bg-primary px-3.5 py-2 text-[12px] font-extrabold text-white shadow-cta-sm">{L('Entrar', 'Sign in')}</button>
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
          </div>

          <div className={`${cardCls} p-2`}>
            <div className="px-2 pb-1 pt-2 text-[10.5px] font-extrabold uppercase tracking-[.05em] text-muted-2">{L('Cuenta', 'Account')}</div>
            {row(User, '#6D4DF6', '#F1EFFA', L('Mi perfil', 'My profile'), L('Nombre, bio, ciudad', 'Name, bio, city'), openPerfil)}
            {row(MapPin, '#1F8A4C', '#E3F5EA', L('Direcciones', 'Addresses'), L('Tus direcciones guardadas', 'Your saved addresses'), () => setSec('direcciones'), String(addr.addresses.length))}
            {row(Bell, '#B5791A', '#FCEFD6', L('Notificaciones', 'Notifications'), L('Alertas y avisos', 'Alerts and updates'), () => app.setNotifOpen(true))}
            {row(Globe, '#0E9384', '#D6F3EF', L('Configuración', 'Settings'), L('Idioma, notificaciones, cuenta', 'Language, notifications, account'), () => setSec('config'))}
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
          {myPosts.length === 0 ? (
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
                    {pill(orderStageKey(o))}
                  </span>
                  <ChevronRight size={16} className="flex-none text-muted" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MIS RESERVAS ── */}
      {sec === 'reservas' && (
        <div>
          {backBar(L('Mis reservas', 'My bookings'))}
          {act.bookings.length === 0 ? txEmpty(L('Aún no tienes reservas.', 'No bookings yet.')) : (
            <div className="flex flex-col gap-2.5">
              {act.bookings.map((b) => txItem(b.id, b.businesses?.name ?? L('Negocio', 'Business'),
                `${b.service_name ?? L('Servicio', 'Service')}${b.party_size ? ` · ${b.party_size} ${L('personas', 'people')}` : ''} · ${dt(b.starts_at)}`,
                <>{pill(b.status)}{cancelBtn('booking', b.id, b.status)}</>))}
            </div>
          )}
        </div>
      )}

      {/* ── MIS RENTAS ── */}
      {sec === 'rentas' && (
        <div>
          {backBar(L('Mis rentas', 'My rentals'))}
          {act.rentals.length === 0 ? txEmpty(L('Aún no tienes rentas.', 'No rentals yet.')) : (
            <div className="flex flex-col gap-2.5">
              {act.rentals.map((r) => txItem(r.id, r.businesses?.name ?? L('Negocio', 'Business'),
                `${r.qty}× ${r.item_name} · ${dt(r.start_at)}`,
                <>{r.total != null && <span className="text-[13px] font-extrabold text-ink">{money(r.total)}</span>}{pill(r.status)}{cancelBtn('rental', r.id, r.status)}</>))}
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

      {/* ── order detail / tracking (DoorDash-style) ── */}
      <Overlay open={orderSelId !== null} onClose={() => closeOrder()} width={460} fullHeightSheet>
        {(() => {
          const o = act.orders.find((x) => x.id === orderSelId); // live row → advances in real time
          if (!o) return null;
          const f = o.fulfillment ?? {};
          const isDel = o.channel === 'delivery';
          const stage = orderStageKey(o); // new|preparing|ready|on_the_way|delivered|completed|cancelled
          const delivered = stage === 'delivered' || stage === 'completed';
          const bizName = o.businesses?.name ?? L('el negocio', 'the business');
          const driverIni = f.driver ? (f.driver.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'R') : '';
          // 4-step flow: 1 waiting/confirmed · 2 preparing · 3 on the way · 4 delivered.
          const s4 = stage === 'new' ? 0 : stage === 'preparing' || stage === 'ready' ? 1 : stage === 'on_the_way' ? 2 : 3;
          const stepLabels: [string, string][] = isDel
            ? [[s4 > 0 ? 'Confirmado' : 'Esperando confirmación', s4 > 0 ? 'Confirmed' : 'Awaiting confirmation'], ['Preparando', 'Preparing'], ['En camino', 'On the way'], ['Entregado', 'Delivered']]
            : [[s4 > 0 ? 'Confirmado' : 'Esperando confirmación', s4 > 0 ? 'Confirmed' : 'Awaiting confirmation'], ['Preparando', 'Preparing'], ['Listo', 'Ready'], ['Recogido', 'Picked up']];

          // Receipt (shared by tracking + the delivered screen).
          const receipt = (
            <div className="rounded-card border border-hair bg-white p-3.5 shadow-card">
              {(o.items ?? []).map((it, i) => (
                <div key={i} className="flex justify-between gap-3 text-[12.5px] font-semibold text-ink-2">
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
            <button onClick={() => setReportOpen(true)} className="flex w-full items-center gap-3 rounded-card border border-hair bg-white p-3.5 text-left shadow-card">
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
            </div>
          );

          // ══ DELIVERED (screen 3) ═══════════════════════════════════════════
          if (delivered) {
            return (
              <>
                <OverlayTitle title={bizName} onClose={() => closeOrder()} />
                <div className="rounded-card px-5 py-6 text-center text-white shadow-cta" style={{ background: 'linear-gradient(155deg,#22A55C,#137A44)' }}>
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/20"><Check size={28} stroke={3} /></span>
                  <div className="mt-3 text-[19px] font-extrabold">{L('¡Pedido entregado!', 'Order delivered!')}</div>
                  <div className="mt-1 text-[12.5px] font-semibold text-white/85">{L(`Tu pedido de ${bizName} ya llegó.`, `Your order from ${bizName} has arrived.`)}</div>
                </div>

                {isDel && (
                  <div className="relative mt-3 h-[118px] overflow-hidden rounded-card border border-hair" style={{ background: 'repeating-linear-gradient(135deg,#EAE2F8 0 11px,#DCCEF2 11px 22px)' }}>
                    <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-muted-2">{L('[ foto de entrega ]', '[ delivery photo ]')}</span>
                    {(f.instructions || f.address_label) && <span className="absolute bottom-2 left-2 max-w-[85%] truncate rounded-md bg-ink/80 px-2 py-1 text-[10px] font-bold text-white">{f.instructions || f.address_label}</span>}
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between rounded-card border border-hair bg-white p-3.5 shadow-card">
                  <div className="min-w-0">
                    <div className="text-[13px] font-extrabold text-ink">{o.code ?? L('Pedido', 'Order')}</div>
                    <div className="truncate text-[11px] font-semibold text-muted">{(o.items?.length ?? 0)} {L('artículo(s)', 'item(s)')}{f.driver ? ` · ${L('Entregado por', 'Delivered by')} ${f.driver}` : ''}</div>
                  </div>
                  <div className="flex-none text-[15px] font-extrabold text-ink">{money(f.paid_total ?? o.total)}</div>
                </div>

                {/* quick rating → posts a real review for the business */}
                <div className="mt-3 rounded-card border border-hair bg-white p-3.5 text-center shadow-card">
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
                  <button onClick={() => { closeOrder(); router.push(`/negocios/?b=${o.businesses?.slug ?? ''}`); }} className="flex w-full items-center gap-3 rounded-card border border-hair bg-white p-3.5 text-left shadow-card">
                    <span className="flex h-9 w-9 flex-none items-center justify-center rounded-tile bg-green-bg"><Repeat size={17} stroke={2.2} className="text-green-dark" /></span>
                    <span className="min-w-0 flex-1"><span className="block text-[13px] font-extrabold text-ink">{L('Volver a pedir', 'Order again')}</span><span className="block text-[11px] font-semibold text-muted">{L('Repite este pedido en un toque', 'Reorder in one tap')}</span></span>
                    <ChevronRight size={16} className="flex-none text-muted-2" />
                  </button>
                  <button onClick={() => setShowReceipt((v) => !v)} className="flex w-full items-center gap-3 rounded-card border border-hair bg-white p-3.5 text-left shadow-card">
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
              <OverlayTitle title={L('Sigue tu pedido', 'Track your order')} onClose={() => closeOrder()} />
              <div className="flex items-center justify-between">
                <span className="text-[11.5px] font-bold text-muted">{o.code ?? ''} · {bizName}</span>
                {pill(stage)}
              </div>

              {/* map (illustrative) once a driver is on the way */}
              {stage === 'on_the_way' && (
                <div className="relative mt-3 h-[128px] overflow-hidden rounded-card border border-hair" style={{ background: '#EAEEF6' }}>
                  <svg className="absolute inset-0 h-full w-full" viewBox="0 0 300 128" preserveAspectRatio="none"><path d="M40 96 C 110 96, 120 40, 210 34" fill="none" stroke="#7B61FF" strokeWidth="3" strokeDasharray="6 6" strokeLinecap="round" /></svg>
                  <span className="absolute left-[34px] top-[86px] h-3.5 w-3.5 rounded-full border-2 border-white bg-green shadow-card" />
                  <span className="absolute right-[26px] top-[22px] flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-primary text-white shadow-card"><Bike size={15} stroke={2.4} /></span>
                  <span className="absolute right-2 top-2 rounded-md bg-ink/85 px-2 py-1 text-[10px] font-extrabold text-white">{f.eta ? `${f.eta} · ${L('a ti', 'to you')}` : L('En ruta', 'En route')}</span>
                </div>
              )}

              {/* ETA banner */}
              {f.eta_range && (
                <div className="mt-3 rounded-field bg-lilac-3 px-3.5 py-3 text-primary-dark">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider opacity-70">{isDel ? L('Llega en aprox.', 'Arriving in approx.') : L('Listo en aprox.', 'Ready in approx.')}</div>
                  <div className="text-[18px] font-extrabold">{f.eta_range}</div>
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
                <div className="mt-4 rounded-card border border-hair bg-white p-3 shadow-card">
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
                <div className="mt-3 rounded-card border border-hair bg-white p-3.5 text-[12.5px] font-semibold shadow-card">
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
