"use client";

import { MapPin, Globe, Bell } from "lucide-react";
import { useI18n } from "../lib/i18n";
import { Wordmark } from "./primitives";

/**
 * Consumer app header — wordmark + location pill + ES/EN language toggle +
 * notifications. Shared across every consumer tab. Matches the reference
 * screenshots (docs/design-system/reference/screenshots/consumer-dashboard-*).
 */
export function AppHeader() {
  const { L, lang, setLang } = useI18n();
  return (
    <div className="flex items-center justify-between gap-2 px-4 pb-3 pt-1">
      <Wordmark className="text-xl" />
      <div className="flex items-center gap-2">
        <button className="flex items-center gap-1 rounded-pill bg-canvas px-2.5 py-1.5 text-[12px] font-bold text-ink">
          <MapPin size={13} className="text-primary" />
          Houston, TX
        </button>
        <button
          onClick={() => setLang(lang === "es" ? "en" : "es")}
          className="flex items-center gap-1 rounded-pill bg-canvas px-2.5 py-1.5 text-[12px] font-bold text-ink"
          aria-label={L("Cambiar idioma", "Switch language")}
        >
          <Globe size={13} className="text-primary" />
          {lang === "es" ? "ES" : "EN"}
        </button>
        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-full bg-canvas text-ink"
          aria-label={L("Notificaciones", "Notifications")}
        >
          <Bell size={17} />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-pill bg-rose px-1 text-[9px] font-extrabold text-white">
            3
          </span>
        </button>
      </div>
    </div>
  );
}
