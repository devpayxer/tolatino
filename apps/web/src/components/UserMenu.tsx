'use client';

// User menu (avatar "TÚ"): Mi perfil, Guardados (♥ count), Mis publicaciones,
// Mi negocio, Configuración, Ayuda, idioma, Cerrar sesión.

import { useRouter } from 'next/navigation';
import { HelpCircle, LogIn, LogOut, SlidersHorizontal, Store } from 'lucide-react';
import { useLang } from '@/lib/i18n';
import { useApp } from '@/lib/state';
import { useAuth } from '@/lib/auth';
import { Overlay } from '@/components/ui';
import { LangToggle } from '@/components/AppHeader';
import { ProfileNav } from '@/components/ProfileNav';

export function UserMenu() {
  const { L } = useLang();
  const app = useApp();
  const auth = useAuth();
  const router = useRouter();
  const close = () => app.setUserOpen(false);
  const go = (path: string) => {
    close();
    router.push(path);
  };
  const loggedIn = !!auth.user;

  const items = [
    { Icon: Store, color: '#1F9D57', bg: '#E3F5EA', label: L('Mi negocio', 'My business'), act: () => go('/negocio/publicar') },
    { Icon: SlidersHorizontal, color: '#8A86A0', bg: '#F1EFFA', label: L('Configuración', 'Settings'), act: close },
    { Icon: HelpCircle, color: '#9A6A12', bg: '#FCEFD6', label: L('Ayuda y soporte', 'Help & support'), act: close },
  ];

  return (
    <Overlay open={app.userOpen} onClose={close} align="right" width={320}>
      {/* profile + feed nav (Inicio / Guardados / Siguiendo) — mobile home for it */}
      <ProfileNav onNavigate={close} className="!border-0 !p-0 !shadow-none" />

      {!loggedIn && (
        <button
          onClick={() => go('/entrar')}
          className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-btn-lg bg-primary p-3 text-[13.5px] font-extrabold text-white shadow-cta-sm"
        >
          <LogIn size={16} strokeWidth={2.4} />
          {L('Crear cuenta o iniciar sesión', 'Create account or sign in')}
        </button>
      )}

      <div className="mt-2 flex flex-col py-1.5">
        {items.map(({ Icon, color, bg, label, act }) => (
          <button
            key={label}
            onClick={act}
            className="flex w-full cursor-pointer items-center gap-[11px] rounded-btn px-2 py-2.5 text-left hover:bg-app"
          >
            <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px]" style={{ background: bg }}>
              <Icon size={16} strokeWidth={2.2} style={{ color }} />
            </span>
            <span className="flex-1 text-[13.5px] font-bold text-ink">{label}</span>
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-hair pt-3">
        <span className="text-[12px] font-extrabold text-muted">{L('Idioma', 'Language')}</span>
        <LangToggle />
      </div>
      {loggedIn && (
        <button
          onClick={async () => {
            await auth.signOut();
            close();
          }}
          className="mt-3 flex w-full cursor-pointer items-center gap-[11px] rounded-btn px-2 py-2.5 text-left hover:bg-pink-bg"
        >
          <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px] bg-pink-bg">
            <LogOut size={16} strokeWidth={2.2} className="text-pink-dark" />
          </span>
          <span className="text-[13.5px] font-bold text-pink-dark">{L('Cerrar sesión', 'Log out')}</span>
        </button>
      )}
    </Overlay>
  );
}
