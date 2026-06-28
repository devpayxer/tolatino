"use client";

import { useState } from "react";
import { Wrench, CalendarDays, ChevronRight } from "lucide-react";
import { useI18n } from "../../../lib/i18n";
import { Card, StatTile, StatusPill } from "../../../components/primitives";
import { ModuleShell, ModuleTabs, SegToggle, ListThumb, Toggle } from "./_shell";
import { AddButton, SoftPanel } from "./FoodModule";

/**
 * Services module — "Servicios y reservas". Bookable services + bookings.
 * Matches reference/screenshots/module-02-services.png.
 */
type Mode = "services" | "bookings";
type STab = "catalog" | "categories";

const SERVICES = [
  { name: { es: "Menú degustación", en: "Tasting menu" }, price: "$140", meta: { es: "5 tiempos · reservable", en: "5 courses · bookable" }, desc: { es: "5 tiempos con maridaje de vino opcional. Mar–Dom, solo cena.", en: "5 courses with optional wine pairing. Tue–Sun, dinner only." } },
  { name: { es: "Cata de vinos guiada", en: "Guided wine tasting" }, price: "$65", meta: { es: "90 min · reservable", en: "90 min · bookable" }, desc: { es: "6 vinos con sommelier. Grupos de hasta 8.", en: "6 wines with a sommelier. Groups up to 8." } },
  { name: { es: "Clase de panadería", en: "Baking class" }, price: "$95", meta: { es: "3 h · reservable", en: "3h · bookable" }, desc: { es: "Aprende masa madre de principio a fin.", en: "Learn sourdough from start to finish." } },
];

export function ServicesModule({ onBack }: { onBack: () => void }) {
  const { L } = useI18n();
  const [mode, setMode] = useState<Mode>("services");
  const [tab, setTab] = useState<STab>("catalog");
  const [bookable, setBookable] = useState(true);

  return (
    <ModuleShell title={mode === "services" ? L("Servicios", "Services") : L("Reservas", "Bookings")} subtitle={mode === "services" ? L("Restaurante · 6 servicios", "Restaurant · 6 services") : L("128 reservas · 12 hoy", "128 bookings · 12 today")} onBack={onBack}>
      <div className="px-4 pb-3">
        <SegToggle
          segments={[
            { id: "services", label: L("Servicios", "Services"), icon: <Wrench size={14} /> },
            { id: "bookings", label: L("Reservas", "Bookings"), icon: <CalendarDays size={14} />, badge: 12 },
          ]}
          active={mode}
          onChange={setMode}
        />
      </div>

      {mode === "services" ? (
        <>
          <ModuleTabs
            tabs={[
              { id: "catalog", label: L("Catálogo", "Catalog") },
              { id: "categories", label: L("Categorías", "Categories"), count: 4 },
            ]}
            active={tab}
            onChange={setTab}
            className="pb-3"
          />
          {tab === "catalog" ? (
            <div className="space-y-4 px-4">
              <div className="grid grid-cols-3 gap-2.5">
                <StatTile icon={<span className="text-[12px]">$</span>} label={L("Ingresos", "Revenue")} value="$24.8k" sub="▲ 38%" subTone="success" />
                <StatTile icon={<CalendarDays size={14} className="text-primary" />} label={L("Reservas", "Bookings")} value="128" sub="▲ 22%" subTone="success" />
                <StatTile icon={<span className="text-[12px]">%</span>} label={L("Conversión", "Conversion")} value="62%" sub="▲ 8pp" subTone="success" />
              </div>

              <Card className="flex items-center gap-3 p-3.5">
                <div className="flex h-10 w-10 flex-none items-center justify-center rounded-tile bg-primary/10 text-primary">
                  <CalendarDays size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-extrabold text-ink">{L("Módulo de reservas activo", "Bookings module active")}</div>
                  <div className="text-[11.5px] font-semibold text-muted">{L("Los reservables aceptan reservas y depósitos.", "Bookable items accept reservations and deposits.")}</div>
                </div>
                <button onClick={() => setMode("bookings")} className="flex flex-none items-center gap-0.5 rounded-pill bg-canvas px-2.5 py-1.5 text-[11px] font-extrabold text-primary">
                  {L("Reservas", "Bookings")} <ChevronRight size={13} />
                </button>
              </Card>

              <div className="space-y-2.5">
                {SERVICES.map((s) => (
                  <Card key={s.name.es} className="p-2.5">
                    <div className="flex gap-3">
                      <ListThumb seed={s.name.es} className="h-16 w-16" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[13.5px] font-extrabold text-ink">{L(s.name.es, s.name.en)}</span>
                          <span className="flex-none text-[13.5px] font-extrabold text-ink">{s.price}</span>
                        </div>
                        <div className="mt-0.5 text-[11px] font-bold text-muted-soft">{L(s.meta.es, s.meta.en)}</div>
                        <p className="mt-1 line-clamp-2 text-[11.5px] font-semibold leading-snug text-muted">{L(s.desc.es, s.desc.en)}</p>
                      </div>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between border-t border-hair pt-2.5">
                      <div className="flex items-center gap-2">
                        <Toggle on={bookable} onChange={setBookable} />
                        <span className="text-[11.5px] font-extrabold text-ink">{L("Reservas activas", "Bookings on")}</span>
                      </div>
                      <button onClick={() => setMode("bookings")} className="text-[11.5px] font-extrabold text-primary">{L("Ver reservas ›", "View bookings ›")}</button>
                    </div>
                  </Card>
                ))}
              </div>

              <AddButton label={L("Agregar servicio", "Add service")} />
            </div>
          ) : (
            <SoftPanel title={L("Categorías de servicio", "Service categories")} sub={L("Agrupa tus servicios (Catas, Clases, Cenas).", "Group your services (Tastings, Classes, Dinners).")} />
          )}
        </>
      ) : (
        <div className="space-y-4 px-4 pt-1">
          <div className="grid grid-cols-3 gap-2.5">
            <StatTile icon={<CalendarDays size={14} className="text-primary" />} label={L("Hoy", "Today")} value="12" />
            <StatTile icon={<span className="text-[12px]">●</span>} label={L("Confirmadas", "Confirmed")} value="9" subTone="success" sub={L("3 pendientes", "3 pending")} />
            <StatTile icon={<span className="text-[12px]">$</span>} label={L("Depósitos", "Deposits")} value="$640" />
          </div>
          <div className="space-y-2.5">
            {[
              { time: "7:00 PM", who: "Maria Lopez", meta: { es: "Mesa 8 · depósito $50", en: "Table 8 · $50 deposit" }, vip: true, status: { es: "Confirmada", en: "Confirmed" } },
              { time: "7:30 PM", who: { es: "2 personas", en: "2 people" }, meta: { es: "Mesa 12 · sin depósito", en: "Table 12 · no deposit" }, vip: false, status: { es: "Confirmada", en: "Confirmed" } },
              { time: "8:15 PM", who: "James Tate", meta: { es: "Cata de vinos · 4 pers.", en: "Wine tasting · 4 people" }, vip: false, status: { es: "Pendiente", en: "Pending" } },
            ].map((b, i) => (
              <Card key={i} className="flex items-center gap-3 p-3">
                <div className="flex-none text-center">
                  <div className="text-[13px] font-extrabold text-ink">{b.time.split(" ")[0]}</div>
                  <div className="text-[9px] font-bold text-muted-soft">{b.time.split(" ")[1]}</div>
                </div>
                <div className="h-9 w-px flex-none bg-hair" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[13px] font-extrabold text-ink">{typeof b.who === "string" ? b.who : L(b.who.es, b.who.en)}</span>
                    {b.vip ? <StatusPill tone="warn">VIP</StatusPill> : null}
                  </div>
                  <div className="text-[11px] font-semibold text-muted">{L(b.meta.es, b.meta.en)}</div>
                </div>
                <StatusPill tone={b.status.es === "Confirmada" ? "success" : "warn"}>{L(b.status.es, b.status.en)}</StatusPill>
              </Card>
            ))}
          </div>
        </div>
      )}
    </ModuleShell>
  );
}
