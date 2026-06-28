"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

/**
 * Bilingual helper — Spanish-first. Every user-facing string flows through L().
 *
 *   const { L, lang, setLang } = useI18n();
 *   <h1>{L("Reservas", "Bookings")}</h1>
 *
 * Default language is "es". The header language switcher toggles to "en".
 * Persisted to localStorage and seedable from a ?lang= URL param.
 */

export type Lang = "es" | "en";

type I18nValue = {
  lang: Lang;
  setLang: (l: Lang) => void;
  L: (es: string, en: string) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

function readInitialLang(): Lang {
  if (typeof window === "undefined") return "es";
  const url = new URLSearchParams(window.location.search).get("lang");
  if (url === "en" || url === "es") return url;
  const stored = window.localStorage.getItem("tl_lang");
  return stored === "en" ? "en" : "es";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readInitialLang);
  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem("tl_lang", l);
    } catch {
      /* ignore */
    }
  };
  const L = (es: string, en: string) => (lang === "es" ? es : en);
  return <I18nContext.Provider value={{ lang, setLang, L }}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
