"use client";

import { useState } from "react";
import { PhoneFrame, Lane } from "./components/primitives";
import { AppHeader } from "./components/AppHeader";
import { DesktopNav } from "./components/DesktopNav";
import { BottomTabs, type ConsumerTab } from "./components/BottomTabs";
import { Inicio } from "./screens/Inicio";
import { Pedidos } from "./screens/Pedidos";
import { Reservas } from "./screens/Reservas";
import { Boletos } from "./screens/Boletos";
import { Perfil } from "./screens/Perfil";

/**
 * Consumer app shell. Owns the active bottom tab; renders the shared header +
 * the active tab's screen inside the 392px PhoneFrame, with the BottomTabs nav.
 * (DESIGN_SYSTEM.md §6–7 — mobile is the source of truth; desktop reflow later.)
 */
export function ConsumerApp({
  onSearch,
  onOpenBusiness,
  onPublishBusiness,
  onOpenBizDashboard,
}: {
  onSearch: (query?: string) => void;
  onOpenBusiness: (id: string) => void;
  onPublishBusiness: () => void;
  onOpenBizDashboard: () => void;
}) {
  const [tab, setTab] = useState<ConsumerTab>("home");

  return (
    <PhoneFrame tabBar={<BottomTabs active={tab} onChange={setTab} badges={{ orders: 1 }} />}>
      {/* desktop top nav (lg+) / mobile header */}
      <DesktopNav active={tab} onChange={setTab} onSearch={onSearch} />
      <div className="lg:hidden">
        <AppHeader />
      </div>

      <main className="mx-auto w-full max-w-content px-0 lg:px-6 lg:py-6">
        {tab === "home" && <Inicio onSearch={onSearch} onOpenBusiness={onOpenBusiness} />}
        {tab === "orders" && <Lane>{<Pedidos />}</Lane>}
        {tab === "bookings" && <Lane>{<Reservas />}</Lane>}
        {tab === "tickets" && <Lane>{<Boletos />}</Lane>}
        {tab === "profile" && <Lane><Perfil onPublishBusiness={onPublishBusiness} onOpenBizDashboard={onOpenBizDashboard} /></Lane>}
      </main>
    </PhoneFrame>
  );
}
