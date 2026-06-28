"use client";

import { useState } from "react";
import { QrCode } from "lucide-react";
import { useI18n } from "../../../lib/i18n";
import { Card, StatTile, StatusPill, PrimaryButton, GhostButton, categoryTile } from "../../../components/primitives";
import { ModuleShell, ModuleTabs } from "./_shell";
import { SoftPanel } from "./FoodModule";

/**
 * Events module — "Eventos y boletos". Ticketed events + check-in.
 * Matches reference/screenshots/module-04-events.png.
 */
type Tab = "upcoming" | "drafts" | "past" | "recurring";

const UPCOMING = [
  { month: "OCT", day: "31", title: "Cena de Halloween", time: { es: "7 PM · $140", en: "7 PM · $140" }, sold: 32, cap: 48, status: { es: "Vendiendo", en: "Selling" } },
  { month: "NOV", day: "08", title: "Noche de jazz en vivo", time: { es: "8 PM · $25", en: "8 PM · $25" }, sold: 54, cap: 80, status: { es: "Vendiendo", en: "Selling" } },
];

export function EventsModule({ onBack }: { onBack: () => void }) {
  const { L } = useI18n();
  const [tab, setTab] = useState<Tab>("upcoming");

  return (
    <ModuleShell title={L("Eventos y boletos", "Events & tickets")} subtitle={L("Tartine Manufactory · 4 próximos", "Tartine Manufactory · 4 upcoming")} onBack={onBack}>
      <ModuleTabs
        tabs={[
          { id: "upcoming", label: L("Próximos", "Upcoming") },
          { id: "drafts", label: L("Borradores", "Drafts"), count: 2 },
          { id: "past", label: L("Pasados", "Past") },
          { id: "recurring", label: L("Recurrentes", "Recurring") },
        ]}
        active={tab}
        onChange={setTab}
        className="pb-3"
      />

      {tab === "upcoming" ? (
        <div className="space-y-4 px-4">
          <div className="grid grid-cols-3 gap-2.5">
            <StatTile icon={<span className="text-[12px]">📅</span>} label={L("Próximos", "Upcoming")} value="4" />
            <StatTile icon={<span className="text-[12px]">🎫</span>} label={L("Boletos", "Tickets")} value="186" sub="▲ 24%" subTone="success" />
            <StatTile icon={<span className="text-[12px]">$</span>} label={L("Ingresos", "Revenue")} value="$14.2k" sub="▲ 18%" subTone="success" />
          </div>

          <div className="space-y-3">
            {UPCOMING.map((e) => {
              const pct = Math.round((e.sold / e.cap) * 100);
              return (
                <Card key={e.title} className="overflow-hidden">
                  <div className="relative h-28" style={categoryTile(e.title)}>
                    <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-transparent" />
                    <div className="absolute left-3 top-3 rounded-tile bg-white/95 px-2.5 py-1 text-center">
                      <div className="text-[9px] font-extrabold uppercase tracking-wide text-rose">{e.month}</div>
                      <div className="text-[16px] font-extrabold leading-none text-ink">{e.day}</div>
                    </div>
                    <span className="absolute right-3 top-3 rounded-pill bg-success-soft px-2.5 py-1 text-[10px] font-extrabold text-success">{L(e.status.es, e.status.en)}</span>
                    <div className="absolute bottom-2 left-3 text-white drop-shadow">
                      <div className="text-[16px] font-extrabold leading-tight">{e.title}</div>
                      <div className="text-[11.5px] font-bold">{L(e.time.es, e.time.en)}</div>
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="flex items-center justify-between text-[11.5px] font-bold">
                      <span className="text-muted">{e.sold}/{e.cap} {L("vendidos", "sold")}</span>
                      <span className="text-primary">{pct}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-pill bg-canvas">
                      <div className="h-full rounded-pill bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="mt-3 flex gap-2">
                      <PrimaryButton className="flex-1 py-2.5 text-[12.5px]">{L("Gestionar", "Manage")}</PrimaryButton>
                      <GhostButton className="flex items-center gap-1.5 py-2.5 text-[12.5px]">
                        <QrCode size={15} /> {L("Check-in", "Check-in")}
                      </GhostButton>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ) : (
        <SoftPanel
          title={tab === "drafts" ? L("Borradores", "Drafts") : tab === "past" ? L("Eventos pasados", "Past events") : L("Eventos recurrentes", "Recurring events")}
          sub={L("Aquí aparecen tus eventos en este estado.", "Your events in this state appear here.")}
        />
      )}
    </ModuleShell>
  );
}
