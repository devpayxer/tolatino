"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { useI18n } from "../lib/i18n";
import { Card, StatusPill, categoryTile } from "../components/primitives";
import { FilterChips, Avatar } from "../components/ui";

/**
 * "Reservas" (bookings) tab. Purple next-service hero + filterable booking list.
 * Matches docs/design-system/reference/screenshots/consumer-dashboard-03-reservas.png.
 */
type Filter = "upcoming" | "past" | "recurring";

export function Reservas() {
  const { L } = useI18n();
  const [filter, setFilter] = useState<Filter>("upcoming");

  const upcoming = [
    { name: L("Corte y color", "Cut & color"), cat: L("Belleza", "Beauty"), catTone: "rose" as const, seed: "belleza", when: L("Jue · 5:30 PM", "Thu · 5:30 PM"), status: L("Confirmado", "Confirmed"), statusTone: "success" as const },
    { name: L("Masaje 60 min", "60-min massage"), cat: L("Salud", "Health"), catTone: "success" as const, seed: "masaje", when: L("Sáb · 11:00 AM", "Sat · 11:00 AM"), status: L("Pendiente", "Pending"), statusTone: "warn" as const },
  ];

  return (
    <div className="px-4 pb-6 pt-1">
      {/* next-service hero */}
      <div className="rounded-card bg-gradient-to-br from-primary to-primary-800 p-4 text-white shadow-glow">
        <div className="flex items-center gap-1.5 text-[10.5px] font-extrabold uppercase tracking-wide text-white/80">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          {L("Próximo servicio · Hoy", "Next service · Today")}
        </div>
        <div className="mt-1.5 text-[20px] font-extrabold leading-tight">{L("Limpieza dental con Dra. Chen", "Dental cleaning with Dr. Chen")}</div>
        <div className="mt-1 text-[12.5px] font-semibold text-white/80">3:00 PM · 45 min · 2890 Mission St</div>

        <div className="mt-3 flex items-center gap-3 rounded-tile bg-white/10 p-3">
          <Avatar initials="SC" tone="canvas" />
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-extrabold">Dra. Sara Chen, DDS</div>
            <div className="text-[11.5px] font-semibold text-white/75">{L("Mission Smile · 12 años", "Mission Smile · 12 yrs")}</div>
          </div>
          <div className="flex-none text-right">
            <div className="text-[15px] font-extrabold">2h 46m</div>
            <div className="text-[10px] font-bold text-white/70">{L("para tu cita", "until your visit")}</div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <button className="flex items-center justify-center gap-1.5 rounded-[14px] bg-white px-4 py-3 text-[13px] font-extrabold text-ink">
            <Check size={15} strokeWidth={3} /> {L("Registrarme", "Check in")}
          </button>
          <button className="rounded-[14px] bg-white/15 px-4 py-3 text-[13px] font-extrabold text-white">{L("Reagendar", "Reschedule")}</button>
        </div>
      </div>

      {/* filters */}
      <div className="mt-5">
        <FilterChips<Filter>
          items={[
            { id: "upcoming", label: L("Próximas", "Upcoming") },
            { id: "past", label: L("Pasadas", "Past") },
            { id: "recurring", label: L("Recurrentes", "Recurring") },
          ]}
          active={filter}
          onChange={setFilter}
        />
      </div>

      {/* list */}
      <div className="mt-3 space-y-2.5">
        {filter === "upcoming" ? (
          upcoming.map((b) => (
            <Card key={b.name} className="flex items-center gap-3 p-2.5">
              <div className="h-14 w-14 flex-none rounded-tile" style={categoryTile(b.seed)} />
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-1.5">
                  <StatusPill tone={b.catTone}>{b.cat}</StatusPill>
                </div>
                <div className="truncate text-[13px] font-extrabold text-ink">{b.name}</div>
                <div className="text-[11.5px] font-semibold text-muted">{b.when}</div>
              </div>
              <StatusPill tone={b.statusTone} dot>
                {b.status}
              </StatusPill>
            </Card>
          ))
        ) : (
          <p className="px-1 pt-1 text-[12px] font-semibold text-muted">
            {filter === "past" ? L("No tienes reservas pasadas recientes.", "No recent past bookings.") : L("Sin servicios recurrentes todavía.", "No recurring services yet.")}
          </p>
        )}
      </div>
    </div>
  );
}
