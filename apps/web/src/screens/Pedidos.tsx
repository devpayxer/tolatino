"use client";

import { useState } from "react";
import { Check, MessageCircle, MapPin } from "lucide-react";
import { useI18n } from "../lib/i18n";
import { Card, StatusPill, PrimaryButton, categoryTile } from "../components/primitives";
import { FilterChips, Avatar } from "../components/ui";

/**
 * "Pedidos" (orders) tab. Live order with a delivery stepper + courier row,
 * then a filterable order history.
 * Matches docs/design-system/reference/screenshots/consumer-dashboard-02-pedidos.png.
 */
type Filter = "active" | "past";

export function Pedidos() {
  const { L } = useI18n();
  const [filter, setFilter] = useState<Filter>("active");

  const steps = [
    { es: "Hecho", en: "Made", time: "7:08", state: "done" as const },
    { es: "Listo", en: "Ready", time: "7:22", state: "done" as const },
    { es: "Recogido", en: "Picked up", time: "7:34", state: "done" as const },
    { es: "En camino", en: "On the way", time: L("ahora", "now"), state: "current" as const },
    { es: "Entregado", en: "Delivered", time: "~7:42", state: "future" as const },
  ];

  const past = [
    { name: "Taquería La Esperanza", seed: "taqueria", items: L("3× tacos, 1× agua", "3× tacos, 1× water"), when: L("Ayer · $18", "Yesterday · $18") },
    { name: "Panadería Dulce", seed: "panaderia", items: L("Pan dulce, café", "Sweet bread, coffee"), when: L("Lun · $11", "Mon · $11") },
  ];

  return (
    <div className="px-4 pb-6 pt-1">
      {/* live order */}
      <Card className="overflow-hidden">
        <div className="relative h-28" style={categoryTile("flourwater")}>
          <span className="absolute left-2.5 top-2.5">
            <StatusPill tone="rose" dot>
              {L("En camino", "On the way")}
            </StatusPill>
          </span>
          <span className="absolute right-2.5 top-2.5">
            <StatusPill tone="ink">#NRB-2487</StatusPill>
          </span>
        </div>

        <div className="p-4">
          <div className="text-lg font-extrabold text-ink">Flour + Water</div>
          <div className="mt-0.5 text-[12.5px] font-semibold text-muted">
            {L("2× margherita, 1× tiramisú, 2× bebidas", "2× margherita, 1× tiramisu, 2× drinks")}
          </div>

          {/* stepper */}
          <div className="relative mt-5">
            <div className="absolute left-[10%] right-[10%] top-[13px] h-[2px] bg-line" />
            <div className="absolute left-[10%] top-[13px] h-[2px] w-[60%] bg-success" />
            <div className="relative flex justify-between">
              {steps.map((s) => {
                const ring =
                  s.state === "done"
                    ? "bg-success text-white"
                    : s.state === "current"
                      ? "bg-rose text-white"
                      : "border border-line bg-surface text-muted-soft";
                return (
                  <div key={s.es} className="flex w-1/5 flex-col items-center">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-full ${ring}`}>
                      {s.state !== "future" ? <Check size={15} strokeWidth={3} /> : null}
                    </div>
                    <div className="mt-1.5 text-[8.5px] font-extrabold uppercase tracking-wide text-ink">{L(s.es, s.en)}</div>
                    <div className={`text-[9px] font-bold ${s.state === "current" ? "text-rose" : "text-muted-soft"}`}>{s.time}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* courier */}
          <div className="mt-5 flex items-center gap-3 border-t border-hair pt-4">
            <Avatar initials="LR" tone="primary" />
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-extrabold text-ink">
                Luis R. · <span className="text-muted">{L("Tu repartidor", "Your courier")}</span>
              </div>
              <div className="text-[11.5px] font-semibold text-muted">{L("4.9 ★ · 2,140 entregas", "4.9 ★ · 2,140 deliveries")}</div>
            </div>
            <button className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-canvas text-ink" aria-label={L("Mensaje", "Message")}>
              <MessageCircle size={18} />
            </button>
            <PrimaryButton className="flex items-center gap-1.5 px-3.5 py-2.5">
              <MapPin size={15} /> {L("Mapa", "Map")}
            </PrimaryButton>
          </div>
        </div>
      </Card>

      {/* history */}
      <div className="mt-5">
        <FilterChips<Filter>
          items={[
            { id: "active", label: L("Activos", "Active") },
            { id: "past", label: L("Pasados", "Past") },
          ]}
          active={filter}
          onChange={setFilter}
        />
      </div>

      <div className="mt-3 space-y-2.5">
        {filter === "past" ? (
          past.map((o) => (
            <Card key={o.name} className="flex items-center gap-3 p-2.5">
              <div className="h-12 w-12 flex-none rounded-tile" style={categoryTile(o.seed)} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-extrabold text-ink">{o.name}</div>
                <div className="truncate text-[11.5px] font-semibold text-muted">{o.items}</div>
              </div>
              <div className="flex-none text-[11px] font-bold text-muted-soft">{o.when}</div>
            </Card>
          ))
        ) : (
          <p className="px-1 pt-1 text-[12px] font-semibold text-muted">
            {L("Tu pedido en camino aparece arriba.", "Your in-progress order is shown above.")}
          </p>
        )}
      </div>
    </div>
  );
}
