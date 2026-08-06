'use client';

// Mobile bottom navigation (≤767px): Comunidad · Negocios · ＋ FAB (Publicar)
// · Eventos · Alertas — per Handoff v2.

import { usePathname, useRouter } from 'next/navigation';
import { IconBell as Bell, IconCalendar as Calendar, IconPlus as Plus, IconBuildingStore as Store, IconUsers as Users } from '@tabler/icons-react';
import { useLang } from '@/lib/i18n';
import { useApp } from '@/lib/state';
import { useNotifications } from '@/lib/notifications';
import { VIEW_PATH } from '@/data/fixtures';

export function BottomNav() {
  const { L } = useLang();
  const app = useApp();
  const { unreadCount } = useNotifications();
  const router = useRouter();
  const pathname = usePathname();

  const item = (path: string, Icon: typeof Users, label: string) => {
    const active = pathname?.startsWith(path);
    return (
      <button
        onClick={() => { window.dispatchEvent(new CustomEvent('tl:navtab', { detail: path })); router.push(path); }}
        className="flex flex-1 cursor-pointer flex-col items-center gap-1 py-2"
      >
        <Icon size={22} strokeWidth={2} className={active ? 'text-primary' : 'text-muted-2'} />
        <span className={`text-[10.5px] font-extrabold ${active ? 'text-primary' : 'text-muted-2'}`}>{label}</span>
      </button>
    );
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-[rgba(255,255,255,.96)] pb-[env(safe-area-inset-bottom)] backdrop-blur-[8px] md:hidden">
      <div className="flex items-center px-2">
        {item(VIEW_PATH.comunidad, Users, L('Comunidad', 'Community'))}
        {item(VIEW_PATH.negocios, Store, L('Negocios', 'Business'))}
        <div className="flex flex-1 justify-center">
          <button
            onClick={() => app.openPub()}
            className="-mt-5 flex h-[54px] w-[54px] cursor-pointer items-center justify-center rounded-full bg-primary shadow-cta"
            aria-label={L('Publicar', 'Post')}
          >
            <Plus size={26} stroke={2.6} className="text-white" />
          </button>
        </div>
        {item(VIEW_PATH.eventos, Calendar, L('Eventos', 'Events'))}
        <button
          onClick={() => app.setNotifOpen(true)}
          className="relative flex flex-1 cursor-pointer flex-col items-center gap-1 py-2"
        >
          <span className="relative">
            <Bell size={22} stroke={2} className="text-muted-2" />
            {unreadCount > 0 && (
              <span className="absolute -right-1.5 -top-1 flex h-[15px] min-w-[15px] items-center justify-center rounded-[9px] border-2 border-white bg-pink px-[3px] text-[9px] font-extrabold text-white">
                {unreadCount}
              </span>
            )}
          </span>
          <span className="text-[10.5px] font-extrabold text-muted-2">{L('Alertas', 'Alerts')}</span>
        </button>
      </div>
    </nav>
  );
}
