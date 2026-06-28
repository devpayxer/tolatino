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
type Route =
  | { name: "dashboard" }
  | { name: "search"; query?: string }
  | { name: "business"; id: string; from: "dashboard" | "search" };

export function AppRoot() {
  const [route, setRoute] = useState<Route>({ name: "dashboard" });

  if (route.name === "search") {
    return (
      <Buscar
        initialQuery={route.query}
        onBack={() => setRoute({ name: "dashboard" })}
        onOpenBusiness={(id) => setRoute({ name: "business", id, from: "search" })}
      />
    );
  }
  if (route.name === "business") {
    return (
      <BusinessDetail
        id={route.id}
        onBack={() => setRoute(route.from === "search" ? { name: "search" } : { name: "dashboard" })}
      />
    );
  }
  return (
    <ConsumerApp
      onSearch={(query) => setRoute({ name: "search", query })}
      onOpenBusiness={(id) => setRoute({ name: "business", id, from: "dashboard" })}
    />
  );
}
