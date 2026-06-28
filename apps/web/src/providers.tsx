"use client";

import type { ReactNode } from "react";
import { I18nProvider } from "./lib/i18n";
import { BizProvider } from "./lib/biz";

/**
 * Global providers. `lang`, `tier`, and `category` are wired in early — they
 * gate everything (DESIGN_SYSTEM.md §8–9). Consumer surfaces use I18n; business
 * surfaces additionally read BizProvider (tier + category).
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <BizProvider>{children}</BizProvider>
    </I18nProvider>
  );
}
