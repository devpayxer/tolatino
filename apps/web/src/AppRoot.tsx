"use client";

import { useState } from "react";
import { ConsumerApp } from "./ConsumerApp";
import { Buscar } from "./screens/Buscar";
import { BusinessDetail } from "./screens/BusinessDetail";

/**
 * Top-level router across the consumer surfaces. Each surface renders its own
 * PhoneFrame (dashboard with bottom tabs, the search/discovery surface, and the
 * pushed business-detail view). Kept lightweight on purpose — swap for real
 * routing once the app grows.
 */
type Route = { name: "dashboard" } | { name: "search" } | { name: "business"; id: string };

export function AppRoot() {
  const [route, setRoute] = useState<Route>({ name: "dashboard" });

  if (route.name === "search") {
    return (
      <Buscar
        onBack={() => setRoute({ name: "dashboard" })}
        onOpenBusiness={(id) => setRoute({ name: "business", id })}
      />
    );
  }
  if (route.name === "business") {
    return <BusinessDetail id={route.id} onBack={() => setRoute({ name: "search" })} />;
  }
  return <ConsumerApp onSearch={() => setRoute({ name: "search" })} />;
}
