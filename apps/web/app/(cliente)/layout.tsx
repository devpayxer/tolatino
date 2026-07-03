'use client';

// Shell for the authenticated client app: header + 7-category bar on top,
// bottom nav (mobile), and the global overlays (city / notifications / user
// menu / publish).

import type { ReactNode } from 'react';
import { LiveDataProvider } from '@/lib/live';
import { InteractionsProvider } from '@/lib/interactions';
import { FollowsProvider } from '@/lib/follows';
import { AddressesProvider } from '@/lib/addresses';
import { SavedBizProvider } from '@/lib/savedBiz';
import { AppHeader } from '@/components/AppHeader';
import { BottomNav } from '@/components/BottomNav';
import { CityModal } from '@/components/CityModal';
import { AddressModal } from '@/components/AddressModal';
import { NotifPanel } from '@/components/NotifPanel';
import { PublishModal } from '@/components/PublishModal';
import { UserMenu } from '@/components/UserMenu';

export default function ClienteLayout({ children }: { children: ReactNode }) {
  return (
    <LiveDataProvider>
    <FollowsProvider>
    <AddressesProvider>
    <SavedBizProvider>
    <InteractionsProvider>
    <div className="min-h-screen bg-app">
      <AppHeader />
      <main className="mx-auto max-w-[1180px] px-3.5 pb-[92px] pt-4 md:px-5 md:pb-[50px] md:pt-5 lg:px-[30px] lg:pb-[60px] lg:pt-[26px]">
        {children}
      </main>
      <BottomNav />
      <CityModal />
      <AddressModal />
      <NotifPanel />
      <UserMenu />
      <PublishModal />
    </div>
    </InteractionsProvider>
    </SavedBizProvider>
    </AddressesProvider>
    </FollowsProvider>
    </LiveDataProvider>
  );
}
