'use client';

// Cuenta → Ajustes. Real settings for the active business + account: jump to the
// public profile editor (Listado), the ES/EN toggle, notification preferences
// (persisted to businesses.settings.notifications via bizAdmin), and the account
// (email + sign out). Demo edits stay local.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, ChevronRight, Globe, Image as ImageIcon, LogOut, Mail, Shield, Store } from 'lucide-react';
import { useBizAdmin } from '@/lib/bizAdmin';
import { useAuth } from '@/lib/auth';
import { LangToggle } from '@/components/AppHeader';
import type { PanelCtx, TabKey } from '@/screens/negocio/tabs';
import { Toast } from '@/screens/negocio/modules/_page';

type Notifs = { orders: boolean; messages: boolean; reviews: boolean; marketing: boolean };
const DEFAULT_NOTIFS: Notifs = { orders: true, messages: true, reviews: true, marketing: false };

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`relative h-[25px] w-[44px] flex-none cursor-pointer rounded-full transition-colors ${on ? 'bg-primary' : 'bg-[#D8D2E6]'}`}
    >
      <span className={`absolute top-[3px] h-[19px] w-[19px] rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-[3px]'}`} />
    </button>
  );
}

export function SettingsModule({ ctx }: { ctx: PanelCtx }) {
  const { L, go } = ctx;
  const admin = useBizAdmin();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const real = admin.active;

  const settings = (real?.settings ?? {}) as Record<string, unknown>;
  const notifs: Notifs = { ...DEFAULT_NOTIFS, ...((settings.notifications as Partial<Notifs>) ?? {}) };
  const [toast, setToast] = useState('');
  const flash = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(''), 1900);
  };

  const toggleNotif = (k: keyof Notifs) => {
    admin.update({ settings: { ...settings, notifications: { ...notifs, [k]: !notifs[k] } } });
    flash(L('Preferencias guardadas', 'Preferences saved'));
  };

  const doSignOut = async () => {
    await signOut();
    router.push('/comunidad');
  };

  const card = 'rounded-card border border-hair bg-white p-4 shadow-card';
  const sec = 'mb-2.5 text-[11px] font-extrabold uppercase tracking-[.05em] text-muted';

  const navRow = (Icon: typeof Store, c: string, bg: string, title: string, sub: string, onClick: () => void) => (
    <button onClick={onClick} className="flex w-full cursor-pointer items-center gap-3 py-2 text-left">
      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-btn" style={{ background: bg }}>
        <Icon size={16} strokeWidth={2.2} style={{ color: c }} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-extrabold text-ink">{title}</span>
        <span className="block truncate text-[11.5px] font-semibold text-muted">{sub}</span>
      </span>
      <ChevronRight size={16} className="flex-none text-muted-faint" />
    </button>
  );

  const notifRow = (k: keyof Notifs, title: string, sub: string) => (
    <div className="flex items-center gap-3 py-2">
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-extrabold text-ink">{title}</span>
        <span className="block text-[11.5px] font-semibold text-muted">{sub}</span>
      </span>
      <Toggle on={notifs[k]} onClick={() => toggleNotif(k)} label={title} />
    </div>
  );

  return (
    <>
      <div className="mx-auto flex max-w-[560px] flex-col gap-4">
        {/* profile */}
        <div className={card}>
          <div className={sec}>{L('Negocio', 'Business')}</div>
          {navRow(Store, '#6D4DF6', '#F1EFFA', L('Perfil del negocio', 'Business profile'), L('Nombre, categoría, contacto', 'Name, category, contact'), () => go('listing'))}
          {navRow(ImageIcon, '#B5791A', '#FCEFD6', L('Fotos y media', 'Photos & media'), L('Portada y galería', 'Cover & gallery'), () => go('photos'))}
        </div>

        {/* language */}
        <div className={card}>
          <div className={sec}>{L('Idioma', 'Language')}</div>
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-btn bg-blue-bg">
              <Globe size={16} strokeWidth={2.2} className="text-blue" />
            </span>
            <span className="min-w-0 flex-1 text-[13px] font-extrabold text-ink">{L('Idioma del panel', 'Dashboard language')}</span>
            <LangToggle mini />
          </div>
        </div>

        {/* notifications */}
        <div className={card}>
          <div className={sec}>{L('Notificaciones', 'Notifications')}</div>
          {notifRow('orders', L('Pedidos', 'Orders'), L('Nuevos pedidos y cambios de estado', 'New orders and status changes'))}
          {notifRow('messages', L('Mensajes', 'Messages'), L('Mensajes de clientes', 'Customer messages'))}
          {notifRow('reviews', L('Reseñas', 'Reviews'), L('Nuevas reseñas de tu negocio', 'New reviews of your business'))}
          {notifRow('marketing', L('Novedades de To’Latino', 'To’Latino news'), L('Consejos y anuncios', 'Tips and announcements'))}
        </div>

        {/* account */}
        <div className={card}>
          <div className={sec}>{L('Cuenta', 'Account')}</div>
          <div className="flex items-center gap-3 py-2">
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-btn bg-lilac-2">
              <Mail size={16} strokeWidth={2.2} className="text-primary-dark" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-extrabold text-ink">{L('Correo', 'Email')}</span>
              <span className="block truncate text-[11.5px] font-semibold text-muted">{user?.email ?? L('Modo demo — inicia sesión', 'Demo mode — sign in')}</span>
            </span>
          </div>
          <div className="flex items-center gap-3 py-2">
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-btn bg-green-bg">
              <Shield size={16} strokeWidth={2.2} className="text-green-dark" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-extrabold text-ink">{L('Plan', 'Plan')}</span>
              <span className="block text-[11.5px] font-semibold text-muted">{real ? (real.tier === 'free' ? 'Free' : real.tier === 'premium' ? '✦ Premium' : 'Verified') : '—'}</span>
            </span>
            <button onClick={() => go('billing' as TabKey)} className="cursor-pointer rounded-btn bg-lilac-2 px-3 py-1.5 text-[11.5px] font-extrabold text-primary-dark">
              {L('Ver', 'View')}
            </button>
          </div>
          {user && (
            <button onClick={doSignOut} className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-btn border-[1.5px] border-pink-bg bg-white py-2.5 text-[12.5px] font-extrabold text-pink-dark">
              <LogOut size={14} strokeWidth={2.4} />
              {L('Cerrar sesión', 'Sign out')}
            </button>
          )}
        </div>
      </div>
      <Toast msg={toast} />
    </>
  );
}
