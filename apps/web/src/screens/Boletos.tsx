"use client";

import { useState } from "react";
import { MapPin, QrCode, Maximize2 } from "lucide-react";
import { useI18n } from "../lib/i18n";
import { Card, categoryTile } from "../components/primitives";
import { FilterChips } from "../components/ui";

/**
 * "Boletos" (tickets) tab. Dark ticket-pass card (ink surface) with a QR and a
 * perforated divider, then a filterable ticket list.
 * Matches docs/design-system/reference/screenshots/consumer-dashboard-04-boletos.png.
 */
type Filter = "mine" | "saved" | "past";

export function Boletos() {
  const { L } = useI18n();
  const [filter, setFilter] = useState<Filter>("mine");

  const saved = [
    { name: L("Noche de Cumbia", "Cumbia Night"), seed: "cumbia", when: L("Vie · 9:00 PM", "Fri · 9:00 PM") },
    { name: L("Feria Latina 2026", "Latino Fair 2026"), seed: "feria", when: L("15 nov · 12:00 PM", "Nov 15 · 12:00 PM") },
  ];

  return (
    <div className="px-4 pb-6 pt-1">
      {/* ticket pass */}
      <div className="relative rounded-card bg-ink p-4 text-white">
        <div className="flex items-start justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-white/10 px-2.5 py-1 text-[10.5px] font-extrabold text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            {L("Puertas en 2h 14m", "Doors in 2h 14m")}
          </span>
          <span className="text-[11px] font-bold text-white/70">{L("Hoy · 8:00 PM", "Today · 8:00 PM")}</span>
        </div>

        <div className="mt-2 text-[20px] font-extrabold leading-tight">Bossa Nova Night</div>
        <div className="mt-1 flex items-center gap-1 text-[12px] font-semibold text-white/70">
          <MapPin size={13} /> Bissap Baobab · Mission · 21+
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            { l: L("Sección", "Section"), v: "GA Gen" },
            { l: L("Boletos", "Tickets"), v: "2" },
            { l: "Total", v: "$36" },
          ].map((c) => (
            <div key={c.l}>
              <div className="text-[9px] font-extrabold uppercase tracking-wide text-white/45">{c.l}</div>
              <div className="mt-0.5 text-[15px] font-extrabold">{c.v}</div>
            </div>
          ))}
        </div>

        {/* perforated divider */}
        <div className="relative -mx-4 my-4">
          <div className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-canvas" />
          <div className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-canvas" />
          <div className="mx-4 border-t border-dashed border-white/25" />
        </div>

        {/* QR row */}
        <div className="flex items-center gap-3">
          <div className="flex h-[68px] w-[68px] flex-none items-center justify-center rounded-tile bg-white text-ink">
            <QrCode size={52} strokeWidth={1.5} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[10.5px] font-bold tracking-wide text-white/55">TKT-1804-A · 7XJ-29K</div>
            <div className="mt-1 text-[12px] font-semibold text-white/85">{L("Escanea en la entrada. El brillo se ajusta solo.", "Scan at the door. Brightness adjusts itself.")}</div>
          </div>
          <button className="flex h-10 w-10 flex-none items-center justify-center rounded-[12px] bg-white/10 text-white" aria-label={L("Pantalla completa", "Full screen")}>
            <Maximize2 size={18} />
          </button>
        </div>
      </div>

      {/* filters */}
      <div className="mt-5">
        <FilterChips<Filter>
          items={[
            { id: "mine", label: L("Mis boletos", "My tickets") },
            { id: "saved", label: L("Guardados", "Saved") },
            { id: "past", label: L("Pasados", "Past") },
          ]}
          active={filter}
          onChange={setFilter}
        />
      </div>

      {/* list */}
      <div className="mt-3 space-y-2.5">
        {filter === "saved" ? (
          saved.map((s) => (
            <Card key={s.name} className="flex items-center gap-3 p-2.5">
              <div className="h-12 w-12 flex-none rounded-tile" style={categoryTile(s.seed)} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-extrabold text-ink">{s.name}</div>
                <div className="text-[11.5px] font-semibold text-muted">{s.when}</div>
              </div>
              <span className="text-[11px] font-extrabold text-primary">{L("Comprar", "Buy")}</span>
            </Card>
          ))
        ) : (
          <p className="px-1 pt-1 text-[12px] font-semibold text-muted">
            {filter === "past" ? L("Aquí verás tus eventos pasados.", "Your past events will appear here.") : L("Tu boleto activo está arriba.", "Your active ticket is shown above.")}
          </p>
        )}
      </div>
    </div>
  );
}
