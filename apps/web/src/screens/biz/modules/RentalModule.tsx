"use client";

import { useState } from "react";
import { Wrench, Calendar, DollarSign, AlertTriangle } from "lucide-react";
import { useI18n } from "../../../lib/i18n";
import { Card, StatTile } from "../../../components/primitives";
import { ModuleShell, ModuleTabs, ListThumb } from "./_shell";
import { AddButton, SoftPanel } from "./FoodModule";

/**
 * Rental module — "Renta". Rentable items, deposits, damage.
 * Matches reference/screenshots/module-05-rental.png.
 */
type Tab = "items" | "calendar" | "deposits" | "damage" | "pricing";

const ITEMS = [
  { name: { es: "Renta de espacio · medio día", en: "Space rental · half day" }, price: "$320/día", avail: { es: "Lun–Mar 6–11 AM · 0/1 espacio", en: "Mon–Tue 6–11 AM · 0/1 space" } },
  { name: { es: "Mesa larga · 8 lugares", en: "Long table · 8 seats" }, price: "$45/día", avail: { es: "Siempre · 4 disponibles", en: "Always · 4 available" } },
  { name: { es: "Vajilla de boda · 100", en: "Wedding plate set · 100" }, price: "$180/evento", avail: { es: "48h aviso · 2 sets", en: "48h notice · 2 sets" } },
  { name: { es: "Máquina de espresso pro", en: "Pro espresso machine" }, price: "$240/día", avail: { es: "Entre semana · 1 unidad", en: "Weekdays · 1 unit" } },
];

export function RentalModule({ onBack }: { onBack: () => void }) {
  const { L } = useI18n();
  const [tab, setTab] = useState<Tab>("items");

  return (
    <ModuleShell title={L("Renta", "Rental")} subtitle={L("Tartine · 12 artículos", "Tartine · 12 items")} onBack={onBack}>
      <ModuleTabs
        tabs={[
          { id: "items", label: L("Artículos", "Items") },
          { id: "calendar", label: L("Calendario", "Calendar") },
          { id: "deposits", label: L("Depósitos", "Deposits") },
          { id: "damage", label: L("Daños", "Damage") },
          { id: "pricing", label: L("Precios", "Pricing") },
        ]}
        active={tab}
        onChange={setTab}
        className="pb-3"
      />

      {tab === "items" ? (
        <div className="space-y-4 px-4">
          <div className="grid grid-cols-2 gap-2.5">
            <StatTile icon={<Wrench size={14} className="text-primary" />} label={L("Artículos", "Items")} value="12" sub={L("6 categorías", "6 categories")} />
            <StatTile icon={<Calendar size={14} className="text-rose" />} label={L("Rentados/mes", "Rented/mo")} value="38" sub="▲ 22%" subTone="success" />
            <StatTile icon={<DollarSign size={14} className="text-success" />} label={L("Ingresos 30d", "Revenue 30d")} value="$4,820" sub="▲ 28%" subTone="success" />
            <StatTile icon={<AlertTriangle size={14} className="text-warn" />} label={L("Depósitos", "Deposits")} value="$1,840" sub={L("6 activos", "6 active")} />
          </div>

          <div className="space-y-2.5">
            {ITEMS.map((it) => (
              <Card key={it.name.es} className="flex gap-3 p-2.5">
                <ListThumb seed={it.name.es} className="h-16 w-16" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[13px] font-extrabold text-ink">{L(it.name.es, it.name.en)}</span>
                    <span className="flex-none text-[13px] font-extrabold text-ink">{it.price}</span>
                  </div>
                  <div className="mt-1 text-[11.5px] font-semibold text-muted">{L(it.avail.es, it.avail.en)}</div>
                </div>
              </Card>
            ))}
          </div>

          <AddButton label={L("Agregar artículo", "Add item")} />
        </div>
      ) : (
        <SoftPanel
          title={tab === "calendar" ? L("Calendario de renta", "Rental calendar") : tab === "deposits" ? L("Depósitos en resguardo", "Deposits held") : tab === "damage" ? L("Reportes de daño", "Damage reports") : L("Precios por periodo", "Pricing per period")}
          sub={L("Administra esta sección de tu renta aquí.", "Manage this part of your rentals here.")}
        />
      )}
    </ModuleShell>
  );
}
