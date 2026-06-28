"use client";

import { useState } from "react";
import { Package, Truck, CreditCard } from "lucide-react";
import { useI18n } from "../../../lib/i18n";
import { Card, StatTile } from "../../../components/primitives";
import { ModuleShell, ModuleTabs, SegToggle, ModuleSearch, ListThumb, Toggle } from "./_shell";
import { AddButton, SoftPanel } from "./FoodModule";

/**
 * Products module — "Productos y envío". Online catalog + shipping.
 * Matches reference/screenshots/module-03-products.png.
 */
type Mode = "products" | "shipping";
type PTab = "catalog" | "inventory" | "variants" | "collections" | "discounts";
type STab = "zones" | "pickup" | "ship" | "drivers";

type Product = {
  name: string;
  price: string;
  cat: { es: string; en: string };
  sku: string;
  variants?: number;
  sold: string;
  revenue: string;
};

const PRODUCTS: Product[] = [
  { name: "Mermelada fresa–ruibarbo · 6oz", price: "$14.00", cat: { es: "Despensa", en: "Pantry" }, sku: "JAM-001", variants: 3, sold: "42", revenue: "$1,820" },
  { name: "Granola artesanal · 12oz", price: "$11.50", cat: { es: "Despensa", en: "Pantry" }, sku: "GRA-002", sold: "31", revenue: "$1,240" },
  { name: "Taza de cerámica ToLatino", price: "$18.00", cat: { es: "Mercancía", en: "Merch" }, sku: "MUG-010", variants: 2, sold: "24", revenue: "$432" },
  { name: "Galletas de mantequilla · caja", price: "$12.00", cat: { es: "Repostería", en: "Bakery" }, sku: "COO-004", sold: "58", revenue: "$696" },
];

export function ProductsModule({ onBack }: { onBack: () => void }) {
  const { L } = useI18n();
  const [mode, setMode] = useState<Mode>("products");
  const [ptab, setPtab] = useState<PTab>("catalog");
  const [stab, setStab] = useState<STab>("zones");
  const [online, setOnline] = useState(true);

  return (
    <ModuleShell
      title={mode === "products" ? L("Productos", "Products") : L("Envío", "Shipping")}
      subtitle={mode === "products" ? L("Venta online · 7 productos", "Online sales · 7 products") : L("Envío en 2 zonas · recogida", "Shipping in 2 zones · pickup")}
      onBack={onBack}
    >
      <div className="px-4 pb-3">
        <SegToggle
          segments={[
            { id: "products", label: L("Productos", "Products"), icon: <Package size={15} /> },
            { id: "shipping", label: L("Envío", "Shipping"), icon: <Truck size={15} /> },
          ]}
          active={mode}
          onChange={setMode}
        />
      </div>

      {mode === "products" ? (
        <>
          <ModuleTabs
            tabs={[
              { id: "catalog", label: L("Catálogo", "Catalog") },
              { id: "inventory", label: L("Inventario", "Inventory") },
              { id: "variants", label: L("Variantes", "Variants") },
              { id: "collections", label: L("Colecciones", "Collections") },
              { id: "discounts", label: L("Descuentos", "Discounts") },
            ]}
            active={ptab}
            onChange={setPtab}
            className="pb-3"
          />
          {ptab === "catalog" ? (
            <div className="space-y-4 px-4">
              <Card className="flex items-center gap-3 p-3.5">
                <div className="flex h-10 w-10 flex-none items-center justify-center rounded-tile bg-primary/10 text-primary">
                  <CreditCard size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-extrabold text-ink">{L("Venta en línea activa", "Online sales active")}</div>
                  <div className="text-[11.5px] font-semibold text-muted">{L("Vende con inventario, envío y checkout.", "Sell with inventory, shipping and checkout.")}</div>
                </div>
                <Toggle on={online} onChange={setOnline} />
              </Card>

              <div className="grid grid-cols-3 gap-2.5">
                <StatTile icon={<span className="text-[12px]">$</span>} label={L("Inventario", "Inventory")} value="$5,480" sub={L("7 SKU", "7 SKU")} />
                <StatTile icon={<span className="text-[12px]">↻</span>} label={L("Reorden", "Reorder")} value="2" sub={L("bajo stock", "low stock")} subTone="rose" />
                <StatTile icon={<Truck size={14} className="text-primary" />} label={L("En camino", "Incoming")} value="110" sub={L("3 órdenes", "3 POs")} />
              </div>

              <ModuleSearch placeholder={L("Buscar productos…", "Search products…")} />

              <div className="space-y-2.5">
                {PRODUCTS.map((p) => (
                  <Card key={p.sku} className="flex gap-3 p-2.5">
                    <ListThumb seed={p.sku} className="h-16 w-16" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[13.5px] font-extrabold text-ink">{p.name}</span>
                        <span className="flex-none text-[13.5px] font-extrabold text-ink">{p.price}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10.5px] font-bold text-muted-soft">
                        <span className="rounded-pill bg-canvas px-2 py-0.5 text-muted">{L(p.cat.es, p.cat.en)}</span>
                        <span>SKU {p.sku}</span>
                        {p.variants ? <span className="rounded-pill bg-primary/10 px-2 py-0.5 text-primary">{p.variants} {L("variantes", "variants")}</span> : null}
                      </div>
                      <div className="mt-1 text-[11px] font-bold text-muted">
                        <span className="text-success">● {p.sold}</span> · {p.revenue} {L("vendido", "sold")}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <AddButton label={L("Agregar producto", "Add product")} />
            </div>
          ) : (
            <SoftPanel
              title={
                ptab === "inventory"
                  ? L("Inventario y stock", "Inventory & stock")
                  : ptab === "variants"
                    ? L("Variantes", "Variants")
                    : ptab === "collections"
                      ? L("Colecciones", "Collections")
                      : L("Códigos de descuento", "Discount codes")
              }
              sub={L("Administra esta sección desde aquí. Listo cuando agregues productos.", "Manage this section here. Ready once you add products.")}
            />
          )}
        </>
      ) : (
        <>
          <ModuleTabs
            tabs={[
              { id: "zones", label: L("Zonas", "Zones") },
              { id: "pickup", label: L("Recoger", "Pickup") },
              { id: "ship", label: L("Envío", "Ship") },
              { id: "drivers", label: L("Repartidores", "Drivers") },
            ]}
            active={stab}
            onChange={setStab}
            className="pb-3"
          />
          {stab === "zones" ? (
            <div className="space-y-2.5 px-4">
              {[
                { name: L("Zona cercana", "Near zone"), radius: "3 km", eta: "25–35 min", fee: "$4.99" },
                { name: L("Zona media", "Mid zone"), radius: "6 km", eta: "35–50 min", fee: "$6.99" },
              ].map((z) => (
                <Card key={z.radius} className="flex items-center gap-3 p-3.5">
                  <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-primary/10 text-[12px] font-extrabold text-primary">{z.radius}</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-extrabold text-ink">{z.name}</div>
                    <div className="text-[11.5px] font-semibold text-muted">{z.eta}</div>
                  </div>
                  <span className="flex-none text-[13.5px] font-extrabold text-ink">{z.fee}</span>
                </Card>
              ))}
              <AddButton label={L("Agregar zona", "Add zone")} />
            </div>
          ) : (
            <SoftPanel
              title={stab === "pickup" ? L("Recogida en tienda", "In-store pickup") : stab === "ship" ? L("Envío a domicilio", "Ship anywhere") : L("Repartidores", "Drivers")}
              sub={L("Configura entrega, recogida y repartidores aquí.", "Set up delivery, pickup and drivers here.")}
            />
          )}
        </>
      )}
    </ModuleShell>
  );
}
