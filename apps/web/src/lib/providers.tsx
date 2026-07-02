'use client';

import type { ReactNode } from 'react';
import { LangProvider } from '@/lib/i18n';
import { AppProvider } from '@/lib/state';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <LangProvider>
      <AppProvider>{children}</AppProvider>
    </LangProvider>
  );
}
