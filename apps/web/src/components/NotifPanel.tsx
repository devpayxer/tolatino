'use client';

// Notifications panel (Handoff v2): bell → panel/sheet with Todas/No-leídas
// filters, Hoy/Esta semana/Anteriores groups, read/unread state. Backed by real
// per-user notifications (lib/notifications) — signed in → live rows (realtime);
// logged out → demo fixtures.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconBell as Bell, IconCalendar as Calendar, IconHeart as Heart, IconMessageCircle as MessageCircle, IconBuildingStore as Store, IconTag as Tag, IconUser as User } from '@tabler/icons-react';
import { useLang } from '@/lib/i18n';
import { useApp } from '@/lib/state';
import { useNotifications, type NotifItem } from '@/lib/notifications';
import { Overlay, OverlayTitle } from '@/components/ui';

const ICONS = { heart: Heart, message: MessageCircle, calendar: Calendar, store: Store, user: User, tag: Tag };

export function NotifPanel() {
  const { L } = useLang();
  const B = (p: [string, string]) => L(p[0], p[1]);
  const app = useApp();
  const router = useRouter();
  const { items, unreadCount, markRead, markAllRead } = useNotifications();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filtered = items.filter((n) => filter === 'all' || !n.read);
  const groups: ['hoy' | 'semana' | 'antes', string][] = [
    ['hoy', L('Hoy', 'Today')],
    ['semana', L('Esta semana', 'This week')],
    ['antes', L('Anteriores', 'Earlier')],
  ];

  const open = (n: NotifItem) => {
    markRead(n.id);
    app.setNotifOpen(false);
    router.push(n.link);
  };

  return (
    <Overlay open={app.notifOpen} onClose={() => app.setNotifOpen(false)} align="right" width={384}>
      <OverlayTitle title={L('Notificaciones', 'Notifications')} onClose={() => app.setNotifOpen(false)} />
      <div className="mb-2 flex items-center gap-2">
        {(
          [
            ['all', L('Todas', 'All')],
            ['unread', L('No leídas', 'Unread') + (unreadCount ? ` (${unreadCount})` : '')],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`cursor-pointer rounded-full px-[13px] py-[7px] text-[12px] font-extrabold ${
              filter === k ? 'bg-primary text-white' : 'bg-lilac-2 text-ink-2'
            }`}
          >
            {label}
          </button>
        ))}
        <button
          onClick={markAllRead}
          className="ml-auto cursor-pointer text-[11.5px] font-extrabold text-primary-dark"
        >
          {L('Marcar todo leído', 'Mark all read')}
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-green-bg">
            <Bell size={20} className="text-green" stroke={2.2} />
          </span>
          <div className="mt-3 text-[14px] font-extrabold text-ink">{L('Todo al día', 'All caught up')}</div>
          <div className="mt-1 text-[12px] font-semibold text-muted">
            {L('No tienes notificaciones sin leer.', 'No unread notifications.')}
          </div>
        </div>
      ) : (
        groups.map(([g, label]) => {
          const gItems = filtered.filter((n) => n.group === g);
          if (!gItems.length) return null;
          return (
            <div key={g} className="mb-1">
              <div className="px-2 pb-1 pt-2.5 text-[10px] font-extrabold uppercase tracking-[.06em] text-muted-2">{label}</div>
              {gItems.map((n) => {
                const Icon = ICONS[n.icon];
                const unread = !n.read;
                return (
                  <button
                    key={n.id}
                    onClick={() => open(n)}
                    className={`flex w-full cursor-pointer items-center gap-[11px] rounded-btn px-2 py-2.5 text-left ${unread ? 'bg-[#F6F4FC]' : ''}`}
                  >
                    <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full" style={{ background: n.bg }}>
                      <Icon size={16} strokeWidth={2.2} style={{ color: n.color }} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-[12.5px] font-extrabold leading-snug ${unread ? 'text-ink' : 'text-ink-2'}`}>
                        {B(n.title)}
                      </span>
                      <span className="mt-px block truncate text-[11px] font-semibold text-muted">{B(n.sub)}</span>
                    </span>
                    <span className="flex flex-none flex-col items-end gap-1">
                      <span className="text-[10.5px] font-bold text-muted-2">{B(n.time)}</span>
                      {unread && <span className="h-2 w-2 rounded-full bg-primary" />}
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })
      )}
    </Overlay>
  );
}
