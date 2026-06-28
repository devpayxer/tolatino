"use client";

import { useState } from "react";
import { Eye, Link2, Flame, Plus } from "lucide-react";
import { useI18n } from "../../../lib/i18n";
import { Card, StatTile } from "../../../components/primitives";
import { ModuleShell, ModuleTabs, ModuleBanner, ModuleSearch, ListThumb } from "./_shell";

/**
 * Food module — "Menú de comida". The menu that feeds the public listing.
 * Matches reference/screenshots/module-01-food.png.
 */
type Tab = "items" | "categories" | "modifiers" | "schedule";
type Filter = "all" | "bread" | "sweet" | "pizza" | "popular" | "new" | "low";

type Dish = {
  name: string;
  price: string;
  desc: { es: string; en: string };
  cat: "bread" | "sweet" | "pizza";
  popular?: boolean;
  isNew?: boolean;
  low?: boolean;
};

const DISHES: Dish[] = [
  { name: "Country Loaf", price: "$12.00", cat: "bread", popular: true, desc: { es: "Pan de campo de masa madre. Trigo integral, horneado a diario.", en: "Sourdough country loaf. Whole wheat, baked daily." } },
  { name: "Baguette Classic", price: "$8.50", cat: "bread", low: true, desc: { es: "Baguette tradicional de corteza crujiente.", en: "Traditional crusty baguette." } },
  { name: "Croissant de almendra", price: "$6.00", cat: "sweet", popular: true, isNew: true, desc: { es: "Hojaldre de mantequilla relleno de crema de almendra.", en: "Butter pastry filled with almond cream." } },
  { name: "Concha de vainilla", price: "$3.50", cat: "sweet", desc: { es: "Pan dulce mexicano con costra de vainilla.", en: "Mexican sweet bread with vanilla topping." } },
  { name: "Pizza margherita", price: "$16.00", cat: "pizza", popular: true, desc: { es: "Masa madre, tomate San Marzano, mozzarella fresca.", en: "Sourdough base, San Marzano tomato, fresh mozzarella." } },
  { name: "Pizza al pastor", price: "$18.00", cat: "pizza", isNew: true, low: true, desc: { es: "Cerdo marinado, piña y cilantro sobre masa madre.", en: "Marinated pork, pineapple and cilantro on sourdough." } },
];

const FILTERS: { id: Filter; es: string; en: string; count: number }[] = [
  { id: "all", es: "Todos", en: "All", count: DISHES.length },
  { id: "bread", es: "Pan y panes", en: "Breads", count: DISHES.filter((d) => d.cat === "bread").length },
  { id: "sweet", es: "Pan dulce", en: "Sweet", count: DISHES.filter((d) => d.cat === "sweet").length },
  { id: "pizza", es: "Pizza", en: "Pizza", count: DISHES.filter((d) => d.cat === "pizza").length },
  { id: "popular", es: "Popular", en: "Popular", count: DISHES.filter((d) => d.popular).length },
  { id: "new", es: "Nuevo", en: "New", count: DISHES.filter((d) => d.isNew).length },
  { id: "low", es: "Bajo/agotado", en: "Low/86'd", count: DISHES.filter((d) => d.low).length },
];

export function FoodModule({ onBack }: { onBack: () => void }) {
  const { L } = useI18n();
  const [tab, setTab] = useState<Tab>("items");
  const [filter, setFilter] = useState<Filter>("all");

  const shown = DISHES.filter((d) =>
    filter === "all" ? true : filter === "popular" ? d.popular : filter === "new" ? d.isNew : filter === "low" ? d.low : d.cat === filter,
  );

  return (
    <ModuleShell
      title={L("Menú de comida", "Food menu")}
      subtitle={L("9 platillos · 8 en listado · 2 86'd", "9 items · 8 listed · 2 86'd")}
      onBack={onBack}
      action={
        <button className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-canvas text-primary" aria-label={L("Vista previa", "Preview")}>
          <Eye size={17} />
        </button>
      }
    >
      <ModuleTabs
        tabs={[
          { id: "items", label: L("Platillos", "Items") },
          { id: "categories", label: L("Categorías", "Categories") },
          { id: "modifiers", label: L("Modificadores", "Modifiers") },
          { id: "schedule", label: L("Horarios", "Schedules") },
        ]}
        active={tab}
        onChange={setTab}
        className="pb-3"
      />

      {tab === "items" ? (
        <div className="space-y-4 px-4">
          <ModuleBanner
            icon={<Link2 size={18} />}
            title={L("Este menú alimenta tu listado", "This menu feeds your listing")}
            sub={L("Cada cambio aparece en tu página pública.", "Every change shows on your public page.")}
          />

          <div className="grid grid-cols-3 gap-2.5">
            <StatTile icon={<span className="text-[13px]">$</span>} label={L("Ingresos", "Revenue")} value="$48.2k" sub="▲ 18%" subTone="success" />
            <StatTile icon={<span className="text-[12px] font-extrabold">≈</span>} label={L("Precio prom.", "Avg price")} value="$14.20" sub="▲ 4%" subTone="success" />
            <StatTile icon={<Flame size={15} className="text-rose" />} label={L("Más querido", "Most loved")} value="184♥" sub={L("Country Loaf", "Country Loaf")} />
          </div>

          <ModuleSearch placeholder={L("Buscar platillos, ingredientes…", "Search dishes, ingredients…")} />

          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
            {FILTERS.map((f) => {
              const on = filter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`flex flex-none items-center gap-1.5 rounded-pill px-3 py-1.5 text-[12px] font-extrabold ${on ? "bg-primary text-white" : "border border-hair bg-surface text-muted"}`}
                >
                  {L(f.es, f.en)}
                  <span className={on ? "text-white/70" : "text-muted-soft"}>{f.count}</span>
                </button>
              );
            })}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[13px] font-extrabold text-ink">{L("Todos los platillos", "All dishes")} <span className="text-muted-soft">{shown.length}</span></h2>
              <span className="text-[11px] font-bold text-muted-soft">{L("1 bajo · 1 86'd", "1 low · 1 86'd")}</span>
            </div>
            <div className="space-y-2.5">
              {shown.map((d) => (
                <Card key={d.name} className="flex gap-3 p-2.5">
                  <ListThumb seed={d.name} className="h-16 w-16" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[13.5px] font-extrabold text-ink">{d.name}</span>
                      <span className="flex-none text-[13.5px] font-extrabold text-ink">{d.price}</span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[11.5px] font-semibold leading-snug text-muted">{L(d.desc.es, d.desc.en)}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {d.popular ? <Tag tone="rose"><Flame size={10} /> {L("Popular", "Popular")}</Tag> : null}
                      {d.isNew ? <Tag tone="primary">{L("Nuevo", "New")}</Tag> : null}
                      {d.low ? <Tag tone="warn">{L("Bajo", "Low")}</Tag> : null}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <AddButton label={L("Agregar platillo", "Add dish")} />
        </div>
      ) : (
        <SoftPanel
          title={
            tab === "categories"
              ? L("Categorías del menú", "Menu categories")
              : tab === "modifiers"
                ? L("Modificadores", "Modifiers")
                : L("Horarios del menú", "Menu schedules")
          }
          sub={
            tab === "categories"
              ? L("Organiza tus platillos en secciones (Panes, Pizza, Postres).", "Group your dishes into sections (Breads, Pizza, Desserts).")
              : tab === "modifiers"
                ? L("Crea extras y opciones (tamaño, masa, toppings).", "Create extras and options (size, dough, toppings).")
                : L("Define cuándo se muestra cada parte del menú.", "Set when each part of the menu is shown.")
          }
        />
      )}
    </ModuleShell>
  );
}

function Tag({ children, tone }: { children: React.ReactNode; tone: "rose" | "primary" | "warn" }) {
  const c = tone === "rose" ? "bg-rose-soft text-rose" : tone === "primary" ? "bg-primary/10 text-primary" : "bg-warn-soft text-warn";
  return <span className={`inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-[10px] font-extrabold ${c}`}>{children}</span>;
}

export function AddButton({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center justify-center gap-2 rounded-[14px] border border-dashed border-line bg-surface py-3 text-[13px] font-extrabold text-primary">
      <Plus size={16} /> {label}
    </button>
  );
}

export function SoftPanel({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="px-4">
      <Card className="p-5 text-center">
        <div className="text-[14px] font-extrabold text-ink">{title}</div>
        <p className="mx-auto mt-1 max-w-[260px] text-[12px] font-semibold leading-snug text-muted">{sub}</p>
      </Card>
    </div>
  );
}
