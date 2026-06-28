"use client";

import { useState } from "react";
import {
  ShoppingBag,
  CalendarDays,
  Gift,
  Wallet,
  Search,
  ShoppingCart,
  Ticket,
  MapPin,
  Globe,
  Bell,
} from "lucide-react";
import { useI18n } from "../lib/i18n";
import {
  PhoneFrame,
  Card,
  StatTile,
  StatusPill,
  Wordmark,
  SubView,
  EmptyState,
  categoryTile,
} from "../components/primitives";
import { BottomTabs, type ConsumerTab } from "../components/BottomTabs";

/**
 * Consumer app shell + "Inicio" (home) tab.
 * Built from the design-system primitives, matching
 * docs/design-system/reference/screenshots/consumer-dashboard-01-inicio.png.
 *
 * Pattern (DESIGN_SYSTEM.md §7): each tab owns a sub-view stack; the parent tab
 * stays active while a sub-view is open. This screen demonstrates it with the
 * order-tracking sub-view.
 */
export function Inicio() {
  const { L, lang, setLang } = useI18n();
  const [tab, setTab] = useState<ConsumerTab>("home");
  const [view, setView] = useState<"home" | "track">("home");

  const stats = [
    {
      icon: <ShoppingBag size={17} className="text-primary-700" />,
      label: L("Pedidos / mes", "Orders / mo"),
      value: "12",
      sub: "+32%",
      subTone: "success" as const,
      onClick: () => setTab("orders"),
    },
    {
      icon: <CalendarDays size={17} className="text-primary-700" />,
      label: L("Reservas", "Bookings"),
      value: "5",
      sub: L("Próx: Jue 7:30", "Next: Thu 7:30"),
      onClick: () => setTab("bookings"),
    },
    {
      icon: <Gift size={17} className="text-warn" />,
      label: L("Recompensas", "Rewards"),
      value: "1,420",
      sub: L("$14 en crédito", "$14 credit"),
      subTone: "rose" as const,
      onClick: () => setTab("profile"),
    },
    {
      icon: <Wallet size={17} className="text-success" />,
      label: L("Gastado / mes", "Spent / mo"),
      value: "$284",
      sub: "-8%",
      subTone: "rose" as const,
      onClick: () => setTab("profile"),
    },
  ];

  const quick = [
    { icon: <Search size={19} className="text-primary-700" />, label: L("Buscar", "Search") },
    { icon: <ShoppingCart size={19} className="text-rose" />, label: L("Pedir", "Order") },
    { icon: <CalendarDays size={19} className="text-success" />, label: L("Reservar", "Book") },
    { icon: <Ticket size={19} className="text-warn" />, label: L("Boletos", "Tickets") },
  ];

  return (
    <PhoneFrame tabBar={<BottomTabs active={tab} onChange={setTab} badges={{ orders: 1 }} />}>
      {/* header — wordmark + location + language + notifications */}
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
          <button className="relative flex h-9 w-9 items-center justify-center rounded-full bg-canvas text-ink" aria-label={L("Notificaciones", "Notifications")}>
            <Bell size={17} />
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-pill bg-rose px-1 text-[9px] font-extrabold text-white">
              3
            </span>
          </button>
        </div>
      </div>

      {view === "track" ? (
        <SubView title={L("Seguimiento", "Tracking")} subtitle="Flour + Water" onBack={() => setView("home")}>
          <Card className="overflow-hidden">
            <div className="h-24" style={categoryTile("flourwater")} />
            <div className="p-4">
              <StatusPill tone="rose" dot>
                {L("En camino", "On the way")}
              </StatusPill>
              <div className="mt-2 text-lg font-extrabold text-ink">{L("Llega 7:42 PM", "Arrives 7:42 PM")}</div>
            </div>
          </Card>
          <EmptyState title={L("Pedido en ruta", "Order en route")} sub={L("Tu repartidor está cerca.", "Your courier is close.")} />
        </SubView>
      ) : (
        <div className="px-4 pb-6">
          <h1 className="text-[22px] font-extrabold tracking-tight text-ink">{L("Hola, Ana 👋", "Hey, Ana 👋")}</h1>
          <p className="mt-1 text-[12.5px] font-semibold leading-snug text-muted">
            {L(
              "Martes, 14 de octubre · 2 reservas esta semana y 1 pedido en camino.",
              "Tuesday, Oct 14 · 2 bookings this week and 1 order on the way.",
            )}
          </p>

          {/* stat tiles */}
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            {stats.map((s) => (
              <StatTile key={s.label} {...s} />
            ))}
          </div>

          {/* quick actions */}
          <div className="mt-3 grid grid-cols-4 gap-2.5">
            {quick.map((q) => (
              <button
                key={q.label}
                className="flex flex-col items-center gap-1.5 rounded-[15px] border border-hair bg-surface px-1.5 py-3"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-tile bg-canvas">{q.icon}</div>
                <span className="text-[11px] font-extrabold text-ink">{q.label}</span>
              </button>
            ))}
          </div>

          {/* upcoming */}
          <div className="mb-3 mt-6 flex items-center justify-between">
            <h2 className="text-[15px] font-extrabold text-ink">{L("Próximo esta semana", "Upcoming this week")}</h2>
            <button className="text-[12px] font-bold text-primary">{L("Ver todo", "See all")}</button>
          </div>
          <Card onClick={() => setView("track")} className="overflow-hidden">
            <div className="relative h-20" style={categoryTile("flourwater")}>
              <span className="absolute left-2 top-2">
                <StatusPill tone="rose" dot>
                  {L("En camino", "On the way")}
                </StatusPill>
              </span>
            </div>
            <div className="p-3">
              <div className="text-sm font-extrabold text-ink">Flour + Water</div>
              <div className="mt-0.5 text-[11.5px] font-semibold text-muted">
                {L("Pedido · llega 7:42 PM", "Order · arrives 7:42 PM")}
              </div>
            </div>
          </Card>
        </div>
      )}
    </PhoneFrame>
  );
}
