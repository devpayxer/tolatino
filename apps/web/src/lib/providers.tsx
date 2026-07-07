'use client';

import type { ReactNode } from 'react';
import { LangProvider } from '@/lib/i18n';
import { AppProvider } from '@/lib/state';
import { AuthProvider } from '@/lib/auth';
import { NotificationsProvider } from '@/lib/notifications';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <LangProvider>
      <AuthProvider>
        <AppProvider>
          <NotificationsProvider>{children}</NotificationsProvider>
        </AppProvider>
      </AuthProvider>
    </LangProvider>
  );
}
