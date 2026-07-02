'use client';

// User menu (avatar "TÚ"): Mi perfil, Guardados (♥ count), Mis publicaciones,
// Mi negocio, Configuración, Ayuda, idioma, Cerrar sesión.

import { useRouter } from 'next/navigation';
import { Heart, HelpCircle, LogOut, MessageCircle, SlidersHorizontal, Store, User } from 'lucide-react';
import { useLang } from '@/lib/i18n';
import { useApp } from '@/lib/state';
import { Overlay, YouAvatar } from '@/components/ui';
import { LangToggle } from '@/components/AppHeader';
import { VIEW_PATH } from '@/data/fixtures';

export function UserMenu() {
  const { L } = useLang();
  const app = useApp();
  const router = useRouter();
  const close = () => app.setUserOpen(false);
  const go = (path: string) => {
    close();
    router.push(path);
  };

  const items = [
    { Icon: User, color: '#6D4DF6', bg: '#EFEBFF', label: L('Mi perfil', 'My profile'), act: close },
    { Icon: Heart, color: '#F0466E', bg: '#FDE7EF', label: L('Guardados', 'Saved'), meta: String(app.savedCount), act: () => go(VIEW_PATH.negocios) },
    { Icon: MessageCircle, color: '#2F6FED', bg: '#E5EFFB', label: L('Mis publicaciones', 'My posts'), act: () => go(VIEW_PATH.comunidad) },
    { Icon: Store, color: '#1F9D57', bg: '#E3F5EA', label: L('Mi negocio', 'My business'), act: () => go('/negocio/publicar') },
    { Icon: SlidersHorizontal, color: '#8A86A0', bg: '#F1EFFA', label: L('Configuración', 'Settings'), act: close },
    { Icon: HelpCircle, color: '#9A6A12', bg: '#FCEFD6', label: L('Ayuda y soporte', 'Help & support'), act: close },
  ];

  return (
    <Overlay open={app.userOpen} onClose={close} align="right" width={320}>
      <div className="flex items-center gap-3 border-b border-hair pb-3.5">
        <YouAvatar size={44} />
        <div className="min-w-0">
          <div className="text-[14.5px] font-extrabold text-ink">{L('Tú', 'You')}</div>
          <div className="text-[11.5px] font-semibold text-muted">{L(`Vecino · ${app.city}`, `Neighbor · ${app.city}`)}</div>
        </div>
      </div>
      <div className="flex flex-col py-1.5">
        {items.map(({ Icon, color, bg, label, meta, act }) => (
          <button
            key={label}
            onClick={act}
            className="flex w-full cursor-pointer items-center gap-[11px] rounded-btn px-2 py-2.5 text-left hover:bg-app"
          >
            <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px]" style={{ background: bg }}>
              <Icon size={16} strokeWidth={2.2} style={{ color }} />
            </span>
            <span className="flex-1 text-[13.5px] font-bold text-ink">{label}</span>
            {meta && <span className="text-[12px] font-extrabold text-muted">{meta}</span>}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-hair pt-3">
        <span className="text-[12px] font-extrabold text-muted">{L('Idioma', 'Language')}</span>
        <LangToggle />
      </div>
      <button
        onClick={close}
        className="mt-3 flex w-full cursor-pointer items-center gap-[11px] rounded-btn px-2 py-2.5 text-left hover:bg-pink-bg"
      >
        <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px] bg-pink-bg">
          <LogOut size={16} strokeWidth={2.2} className="text-pink-dark" />
        </span>
        <span className="text-[13.5px] font-bold text-pink-dark">{L('Cerrar sesión', 'Log out')}</span>
      </button>
    </Overlay>
  );
}
