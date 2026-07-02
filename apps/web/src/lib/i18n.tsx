'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

export type Lang = 'es' | 'en';

type LangCtx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** Spanish-first bilingual pick: L('hola', 'hello') */
  L: (es: string, en: string) => string;
};

const Ctx = createContext<LangCtx | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('es');
  const L = useCallback((es: string, en: string) => (lang === 'es' ? es : en), [lang]);
  return <Ctx.Provider value={{ lang, setLang, L }}>{children}</Ctx.Provider>;
}

export function useLang(): LangCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useLang must be used inside <LangProvider>');
  return ctx;
}
