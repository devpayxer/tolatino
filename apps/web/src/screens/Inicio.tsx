"use client";

import { useState } from "react";
import { ShoppingBag, CalendarDays, Gift, Wallet, Search, ShoppingCart, Ticket } from "lucide-react";
import { useI18n } from "../lib/i18n";
import { Card, StatTile, StatusPill, SubView, EmptyState, categoryTile } from "../components/primitives";
import type { ConsumerTab } from "../components/BottomTabs";

/**
 * "Inicio" (home) tab content. Rendered inside ConsumerApp's PhoneFrame + header.
 * Matches docs/design-system/reference/screenshots/consumer-dashboard-01-inicio.png.
 * `onNavigate` jumps to another bottom tab (e.g. a stat tile → Pedidos).
 */
export function Inicio({ onNavigate, onSearch }: { onNavigate: (tab: ConsumerTab) => void; onSearch: () => void }) {
  const { L } = useI18n();
  const [view, setView] = useState<"home" | "track">("home");

  const stats = [
    { icon: <ShoppingBag size={17} className="text-primary-700" />, label: L("Pedidos / mes", "Orders / mo"), value: "12", sub: "+32%", subTone: "success" as const, onClick: () => onNavigate("orders") },
    { icon: <CalendarDays size={17} className="text-primary-700" />, label: L("Reservas", "Bookings"), value: "5", sub: L("Próx: Jue 7:30", "Next: Thu 7:30"), onClick: () => onNavigate("bookings") },
    { icon: <Gift size={17} className="text-warn" />, label: L("Recompensas", "Rewards"), value: "1,420", sub: L("$14 en crédito", "$14 credit"), subTone: "rose" as const, onClick: () => onNavigate("profile") },
    { icon: <Wallet size={17} className="text-success" />, label: L("Gastado / mes", "Spent / mo"), value: "$284", sub: "-8%", subTone: "rose" as const, onClick: () => onNavigate("profile") },
  ];

  const quick = [
    { icon: <Search size={19} className="text-primary-700" />, label: L("Buscar", "Search"), onClick: onSearch },
    { icon: <ShoppingCart size={19} className="text-rose" />, label: L("Pedir", "Order"), onClick: () => onNavigate("orders") },
    { icon: <CalendarDays size={19} className="text-success" />, label: L("Reservar", "Book"), onClick: () => onNavigate("bookings") },
    { icon: <Ticket size={19} className="text-warn" />, label: L("Boletos", "Tickets"), onClick: () => onNavigate("tickets") },
  ];

  if (view === "track") {
    return (
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
    );
  }

  return (
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
            onClick={q.onClick}
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
        <button onClick={() => onNavigate("orders")} className="text-[12px] font-bold text-primary">
          {L("Ver todo", "See all")}
        </button>
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
  );
}
