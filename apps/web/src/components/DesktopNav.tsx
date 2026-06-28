"use client";

import { MapPin, Bell, Search } from "lucide-react";
import { useI18n } from "../lib/i18n";
import { Wordmark } from "./primitives";
import { Avatar } from "./ui";
import type { ConsumerTab } from "./BottomTabs";

/**
 * Consumer desktop top nav (sticky). Shown only on lg+ (DESIGN_SYSTEM.md §6):
 * wordmark left · search center · tab links · language + account right. On
 * mobile the AppHeader + BottomTabs handle navigation instead.
 */
const NAV: { id: ConsumerTab; es: string; en: string }[] = [
  { id: "home", es: "Inicio", en: "Home" },
  { id: "orders", es: "Pedidos", en: "Orders" },
  { id: "bookings", es: "Reservas", en: "Bookings" },
  { id: "tickets", es: "Boletos", en: "Tickets" },
  { id: "profile", es: "Perfil", en: "Profile" },
];

export function DesktopNav({
  active,
  onChange,
  onSearch,
}: {
  active: ConsumerTab;
  onChange: (t: ConsumerTab) => void;
  onSearch: (query?: string) => void;
}) {
  const { L, lang, setLang } = useI18n();
  return (
    <header className="sticky top-0 z-30 hidden border-b border-hair bg-surface/90 backdrop-blur lg:block">
      <div className="mx-auto flex h-16 w-full max-w-content items-center gap-5 px-6">
        <Wordmark className="text-xl" />

        <button className="flex items-center gap-1.5 rounded-pill bg-canvas px-3 py-2 text-[13px] font-bold text-ink">
          <MapPin size={15} className="text-primary" />
          Houston, TX
        </button>

        <button
          onClick={() => onSearch()}
          className="flex flex-1 items-center gap-2.5 rounded-pill border border-hair bg-canvas px-4 py-2.5 text-left"
        >
          <Search size={16} className="text-primary" />
          <span className="text-[13.5px] font-semibold text-muted-soft">{L("Busca tacos, mecánico, salón…", "Search tacos, mechanic, salon…")}</span>
        </button>

        <nav className="flex items-center gap-1">
          {NAV.map((n) => {
            const on = active === n.id;
            return (
              <button
                key={n.id}
                onClick={() => onChange(n.id)}
                className={`rounded-pill px-3 py-2 text-[13px] font-extrabold transition ${on ? "bg-primary/10 text-primary" : "text-muted hover:text-ink"}`}
              >
                {L(n.es, n.en)}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-pill bg-canvas text-[12px] font-extrabold">
            <button onClick={() => setLang("es")} className={`px-2.5 py-1.5 ${lang === "es" ? "bg-primary text-white" : "text-muted"}`}>ES</button>
            <button onClick={() => setLang("en")} className={`px-2.5 py-1.5 ${lang === "en" ? "bg-primary text-white" : "text-muted"}`}>EN</button>
          </div>
          <button className="relative flex h-10 w-10 items-center justify-center rounded-full bg-canvas text-ink" aria-label={L("Notificaciones", "Notifications")}>
            <Bell size={18} />
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-pill bg-rose px-1 text-[9px] font-extrabold text-white">3</span>
          </button>
          <Avatar initials="AR" tone="gold" size={40} />
        </div>
      </div>
    </header>
  );
}
