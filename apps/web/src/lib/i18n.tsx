'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export type Lang = 'es' | 'en';

const LANG_KEY = 'tl.lang';

type LangCtx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** Spanish-first bilingual pick: L('hola', 'hello') */
  L: (es: string, en: string) => string;
};

const Ctx = createContext<LangCtx | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  // Spanish-first default; the user's choice persists across reloads / PWA
  // relaunches (first paint is 'es' for SSG hydration, then the saved value).
  const [lang, setLangState] = useState<Lang>('es');
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LANG_KEY);
      if (saved === 'en' || saved === 'es') setLangState(saved);
    } catch { /* private mode / SSR */ }
  }, []);
  useEffect(() => {
    if (typeof document !== 'undefined') document.documentElement.lang = lang;
  }, [lang]);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(LANG_KEY, l); } catch { /* ignore */ }
  }, []);
  const L = useCallback((es: string, en: string) => (lang === 'es' ? es : en), [lang]);
  return <Ctx.Provider value={{ lang, setLang, L }}>{children}</Ctx.Provider>;
}

export function useLang(): LangCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useLang must be used inside <LangProvider>');
  return ctx;
}
