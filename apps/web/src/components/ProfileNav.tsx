'use client';

// Profile + feed navigation card (Handoff v2 → Cliente left rail). Shows the
// user's avatar, city, and stats (Following / Followers / Posts), plus the feed
// switcher: Inicio (nearby), Guardados, Siguiendo. Reused in the desktop left
// rail and inside the mobile user sheet, so it takes an optional onNavigate to
// close the sheet after a tap.

import { useRouter, usePathname } from 'next/navigation';
import { IconBookmark as Bookmark, IconChevronDown as ChevronDown, IconHome as Home, IconMapPin as MapPin, IconUsers as Users } from '@tabler/icons-react';
import { useLang } from '@/lib/i18n';
import { useApp } from '@/lib/state';
import { useAuth } from '@/lib/auth';
import { useFollows } from '@/lib/follows';
import { Avatar, Card, YouAvatar } from '@/components/ui';
import { VIEW_PATH } from '@/data/fixtures';
import type { FeedView } from '@/lib/state';

const NAV: { key: FeedView; Icon: typeof Home; es: string; en: string }[] = [
  { key: 'home', Icon: Home, es: 'Inicio', en: 'Home' },
  { key: 'saved', Icon: Bookmark, es: 'Guardados', en: 'Saved' },
  { key: 'following', Icon: Users, es: 'Siguiendo', en: 'Following' },
];

export function ProfileNav({ onNavigate, className }: { onNavigate?: () => void; className?: string }) {
  const { L } = useLang();
  const app = useApp();
  const auth = useAuth();
  const f = useFollows();
  const router = useRouter();
  const pathname = usePathname();

  const onComunidad = pathname === VIEW_PATH.comunidad;

  const go = (view: FeedView) => {
    // Saved / Following need an account.
    if (view !== 'home' && auth.configured && !auth.user) {
      onNavigate?.();
      router.push('/entrar');
      return;
    }
    app.setFeedView(view);
    if (!onComunidad) router.push(VIEW_PATH.comunidad);
    onNavigate?.();
  };

  const stats: [number, string, string][] = [
    [f.followingCount, 'Siguiendo', 'Following'],
    [f.followersCount, 'Seguidores', 'Followers'],
    [f.postsCount, 'Posts', 'Posts'],
  ];

  return (
    <Card className={`p-[17px] ${className ?? ''}`}>
      <div className="flex items-center gap-3">
        {auth.profile ? (
          <Avatar initials={auth.profile.initials} color={auth.profile.avatar_color} src={auth.profile.avatar_url} size={44} />
        ) : (
          <YouAvatar size={44} />
        )}
        <div className="min-w-0">
          <div className="truncate text-[14.5px] font-extrabold text-ink">{auth.profile?.display_name ?? L('Invitado', 'Guest')}</div>
          <button
            onClick={() => {
              app.setCityOpen(true);
              onNavigate?.();
            }}
            className="mt-1 inline-flex max-w-full cursor-pointer items-center gap-1 rounded-full bg-lilac-2 px-2.5 py-1 text-[11.5px] font-extrabold text-ink"
          >
            <MapPin size={12} className="flex-none text-primary" stroke={2.4} />
            <span className="truncate">{app.city}</span>
            <ChevronDown size={12} stroke={2.6} className="flex-none text-muted" />
          </button>
        </div>
      </div>

      {auth.user ? (
        // Fila en flex, no en `grid-cols-3`: en el riel de 218px cada tercio
        // medía 61px y «Seguidores» necesita 70, así que las tres etiquetas se
        // desbordaban y se leían pegadas («SiguiendoSeguidores Posts»). En flex
        // cada bloque ocupa lo suyo y sobra sitio.
        <div className="mt-3.5 flex justify-between gap-2 border-t border-hair pt-3">
          {stats.map(([n, es, en]) => (
            <div key={en} className="text-center">
              <div className="text-[15px] font-extrabold text-ink">{n}</div>
              <div className="mt-0.5 text-[11px] font-bold text-muted-2">{L(es, en)}</div>
            </div>
          ))}
        </div>
      ) : auth.configured ? (
        <button
          onClick={() => {
            onNavigate?.();
            router.push('/entrar');
          }}
          className="mt-3 w-full cursor-pointer rounded-btn bg-primary py-2.5 text-[12.5px] font-extrabold text-white"
        >
          {L('Crear cuenta o iniciar sesión', 'Create account or sign in')}
        </button>
      ) : null}

      <div className="mt-3 flex flex-col gap-0.5 border-t border-hair pt-2">
        {NAV.map(({ key, Icon, es, en }) => {
          const active = onComunidad && app.feedView === key;
          return (
            <button
              key={key}
              onClick={() => go(key)}
              className={`flex w-full cursor-pointer items-center gap-2.5 rounded-[10px] px-2.5 py-2.5 text-left text-[13.5px] ${
                active ? 'bg-lilac-3 font-extrabold text-primary-dark' : 'font-bold text-ink-soft hover:bg-app'
              }`}
            >
              <Icon size={17} strokeWidth={2.2} className={active ? 'text-primary' : 'text-muted'} />
              {L(es, en)}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
