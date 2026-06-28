"use client";

import { useState } from "react";
import { PhoneFrame } from "./components/primitives";
import { AppHeader } from "./components/AppHeader";
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
}: {
  onSearch: (query?: string) => void;
  onOpenBusiness: (id: string) => void;
  onPublishBusiness: () => void;
}) {
  const [tab, setTab] = useState<ConsumerTab>("home");

  return (
    <PhoneFrame tabBar={<BottomTabs active={tab} onChange={setTab} badges={{ orders: 1 }} />}>
      <AppHeader />
      {tab === "home" && <Inicio onSearch={onSearch} onOpenBusiness={onOpenBusiness} />}
      {tab === "orders" && <Pedidos />}
      {tab === "bookings" && <Reservas />}
      {tab === "tickets" && <Boletos />}
      {tab === "profile" && <Perfil onPublishBusiness={onPublishBusiness} />}
    </PhoneFrame>
  );
}
