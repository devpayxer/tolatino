"use client";

import { useState } from "react";
import { Check, Download } from "lucide-react";
import { useI18n } from "../../../lib/i18n";
import { useBiz, TIER_CAPS } from "../../../lib/biz";
import { Card, StatTile } from "../../../components/primitives";
import { ModuleShell, ModuleTabs, Toggle } from "./_shell";
import { SoftPanel } from "./FoodModule";

/**
 * Billing module — "Plan y facturación". Plan card, usage meters, add-ons,
 * invoices. Tier-aware via useBiz. Matches reference/screenshots/module-09-billing.png.
 */
type Tab = "plan" | "compare" | "payment" | "invoices";

const USAGE = [
  { label: { es: "Pedidos", en: "Orders" }, used: 284, max: 1000, txt: "284 / 1,000" },
  { label: { es: "Reservas", en: "Bookings" }, used: 128, max: 500, txt: "128 / 500" },
  { label: { es: "Fotos", en: "Photos" }, used: 34, max: Infinity, txt: "34 / ∞" },
  { label: { es: "Miembros", en: "Staff seats" }, used: 14, max: 20, txt: "14 / 20" },
];

const ADDONS = [
  { name: { es: "Posición destacada", en: "Featured placement" }, price: { es: "$15/mes", en: "$15/mo" } },
  { name: { es: "Impulso patrocinado", en: "Sponsored boost" }, price: { es: "$20/sem", en: "$20/wk" } },
  { name: { es: "5 asientos extra", en: "5 extra seats" }, price: { es: "$8/mes", en: "$8/mo" } },
  { name: { es: "500 créditos SMS", en: "500 SMS credits" }, price: { es: "$5/mes", en: "$5/mo" } },
];

const INVOICES = [
  { id: "INV-2487", date: { es: "14 Oct, 2025", en: "Oct 14, 2025" }, amount: "$19.00" },
  { id: "INV-2280", date: { es: "14 Sep, 2025", en: "Sep 14, 2025" }, amount: "$19.00" },
  { id: "INV-2102", date: { es: "14 Ago, 2025", en: "Aug 14, 2025" }, amount: "$19.00" },
];

export function BillingModule({ onBack }: { onBack: () => void }) {
  const { L } = useI18n();
  const { tier } = useBiz();
  const [tab, setTab] = useState<Tab>("plan");
  const [addons, setAddons] = useState<Record<number, boolean>>({});

  const caps = TIER_CAPS[tier];
  const price = tier === "free" ? L("Gratis", "Free") : tier === "verified" ? "$19/mes" : "$49/mes";

  return (
    <ModuleShell title={L("Plan y facturación", "Plan & billing")} subtitle={tier === "free" ? L("Plan Free · sin tarjeta", "Free plan · no card") : `${L(caps.label.es, caps.label.en)} · ${L("renueva 14 Nov", "renews Nov 14")}`} onBack={onBack}>
      <ModuleTabs
        tabs={[
          { id: "plan", label: L("Plan", "Plan") },
          { id: "compare", label: L("Comparar", "Compare") },
          { id: "payment", label: L("Pagos", "Payment") },
          { id: "invoices", label: L("Facturas", "Invoices") },
        ]}
        active={tab}
        onChange={setTab}
        className="pb-3"
      />

      {tab === "plan" ? (
        <div className="space-y-4 px-4">
          {/* current plan card */}
          <div className="relative overflow-hidden rounded-card bg-gradient-to-br from-primary to-primary-800 p-4 text-white shadow-glow">
            <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10" />
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide text-white/80"><Check size={12} /> {L("Plan actual", "Current plan")}</span>
              {tier !== "free" ? <span className="text-[10px] font-bold text-white/70">{L("Renueva 14 Nov", "Renews Nov 14")}</span> : null}
            </div>
            <div className="mt-1 text-[30px] font-extrabold leading-none tracking-tight">
              {L(caps.label.es, caps.label.en)} <span className="text-[16px] font-bold text-white/65">· {price}</span>
            </div>
            <p className="mt-1.5 text-[12px] font-semibold text-white/80">
              {tier === "free"
                ? L("Listado básico · 3 fotos. Mejora para módulos y verificación.", "Basic listing · 3 photos. Upgrade for modules & verification.")
                : L("Insignia verificada, todos los módulos y 5× visibilidad.", "Verified badge, all modules and 5× visibility.")}
            </p>
            {tier !== "premium" ? (
              <button className="mt-3.5 w-full rounded-[12px] bg-gold py-2.5 text-[13px] font-extrabold text-ink">
                {tier === "free" ? L("Mejorar a Verified · $19/mes ›", "Upgrade to Verified · $19/mo ›") : L("Mejorar a Premium · $49/mes ›", "Upgrade to Premium · $49/mo ›")}
              </button>
            ) : null}
            <button className="mt-2 w-full rounded-[12px] bg-white/15 py-2.5 text-[13px] font-extrabold text-white">{L("Cambiar plan", "Change plan")}</button>
          </div>

          {/* usage */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[13px] font-extrabold text-ink">{L("Uso este mes", "Usage this month")}</h2>
              <span className="text-[11px] font-bold text-muted-soft">Oct 2025</span>
            </div>
            <Card className="space-y-3 p-3.5">
              {USAGE.map((u) => {
                const pct = u.max === Infinity ? 30 : Math.round((u.used / u.max) * 100);
                const tone = pct > 90 ? "bg-rose" : pct > 75 ? "bg-warn" : "bg-primary";
                return (
                  <div key={u.label.es}>
                    <div className="flex items-center justify-between text-[11.5px] font-bold">
                      <span className="text-ink">{L(u.label.es, u.label.en)}</span>
                      <span className="text-muted">{u.txt}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-pill bg-canvas">
                      <div className={`h-full rounded-pill ${tone}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </Card>
          </div>

          {/* add-ons */}
          <div>
            <h2 className="mb-2 text-[13px] font-extrabold text-ink">{L("Complementos · Opcional", "Add-ons · Optional")}</h2>
            <div className="space-y-2.5">
              {ADDONS.map((a, i) => (
                <Card key={a.name.es} className="flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-extrabold text-ink">{L(a.name.es, a.name.en)}</div>
                    <div className="text-[11px] font-bold text-muted-soft">{L(a.price.es, a.price.en)}</div>
                  </div>
                  <Toggle on={!!addons[i]} onChange={(v) => setAddons((s) => ({ ...s, [i]: v }))} />
                </Card>
              ))}
            </div>
          </div>

          {tier !== "free" ? (
            <button className="w-full py-1 text-center text-[12px] font-extrabold text-rose">{L("Cancelar suscripción", "Cancel subscription")}</button>
          ) : null}
        </div>
      ) : tab === "invoices" ? (
        <div className="space-y-4 px-4">
          <div className="grid grid-cols-2 gap-2.5">
            <StatTile icon={<span className="text-[12px]">$</span>} label={L("Pagado este año", "Paid this year")} value="$190.00" />
            <StatTile icon={<span className="text-[12px]">↻</span>} label={L("Próximo cobro", "Next charge")} value="$19.00" />
          </div>
          <div className="space-y-2.5">
            {INVOICES.map((inv) => (
              <Card key={inv.id} className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-extrabold text-ink">{inv.id}</div>
                  <div className="text-[11px] font-bold text-muted-soft">{L(inv.date.es, inv.date.en)} · {L("Verified · mensual", "Verified · monthly")}</div>
                </div>
                <span className="text-[12.5px] font-extrabold text-ink">{inv.amount}</span>
                <span className="rounded-pill bg-success-soft px-2 py-0.5 text-[10px] font-extrabold text-success">{L("Pagada", "Paid")}</span>
                <button className="flex-none text-muted-soft" aria-label={L("Descargar", "Download")}><Download size={16} /></button>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <SoftPanel
          title={tab === "compare" ? L("Comparar planes", "Compare plans") : L("Métodos de pago", "Payment methods")}
          sub={tab === "compare" ? L("Free · Verified · Premium — elige lo que tu negocio necesita.", "Free · Verified · Premium — pick what your business needs.") : L("Administra tarjetas y datos de facturación. Pagos encriptados.", "Manage cards and billing details. Encrypted payments.")}
        />
      )}
    </ModuleShell>
  );
}
