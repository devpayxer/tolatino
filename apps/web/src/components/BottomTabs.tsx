"use client";

import {
  Home,
  ShoppingBag,
  CalendarDays,
  Ticket,
  User,
  type LucideIcon,
} from "lucide-react";
import { useI18n } from "../lib/i18n";

/**
 * BottomTabs — consumer mobile nav (5 tabs). The active tab is purple/filled.
 * The business dashboard uses a different 5-tab set (Inicio/Pedidos/Mensajes/Reseñas/Más).
 * Desktop hides this and uses a top nav instead.
 */

export type ConsumerTab = "home" | "orders" | "bookings" | "tickets" | "profile";

const TABS: { id: ConsumerTab; icon: LucideIcon; es: string; en: string }[] = [
  { id: "home", icon: Home, es: "Inicio", en: "Home" },
  { id: "orders", icon: ShoppingBag, es: "Pedidos", en: "Orders" },
  { id: "bookings", icon: CalendarDays, es: "Reservas", en: "Bookings" },
  { id: "tickets", icon: Ticket, es: "Boletos", en: "Tickets" },
  { id: "profile", icon: User, es: "Perfil", en: "Profile" },
];

export function BottomTabs({
  active,
  onChange,
  badges = {},
}: {
  active: ConsumerTab;
  onChange: (t: ConsumerTab) => void;
  badges?: Partial<Record<ConsumerTab, number>>;
}) {
  const { L } = useI18n();
  return (
    <nav className="flex items-stretch justify-around border-t border-hair bg-surface px-2 pb-5 pt-2">
      {TABS.map(({ id, icon: Icon, es, en }) => {
        const on = active === id;
        const badge = badges[id];
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className="relative flex flex-1 flex-col items-center gap-1 py-1"
          >
            <Icon size={22} strokeWidth={on ? 2.4 : 2} className={on ? "text-primary" : "text-muted-soft"} />
            <span className={`text-[10px] font-bold ${on ? "text-primary" : "text-muted-soft"}`}>{L(es, en)}</span>
            {badge ? (
              <span className="absolute right-1/2 top-0 translate-x-3.5 rounded-pill bg-rose px-1.5 text-[9px] font-extrabold text-white">
                {badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}
