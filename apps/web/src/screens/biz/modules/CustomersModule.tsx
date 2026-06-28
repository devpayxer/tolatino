"use client";

import { useState } from "react";
import { Users, Receipt, Star, Sparkles, RefreshCw, Zap } from "lucide-react";
import { useI18n } from "../../../lib/i18n";
import { Card, StatTile, StatusPill, PrimaryButton } from "../../../components/primitives";
import { Avatar } from "../../../components/ui";
import { ModuleShell, ModuleTabs, SegToggle, ModuleSearch } from "./_shell";

/**
 * Customers module — "Clientes, pedidos y reseñas". CRM + live orders + reviews.
 * Matches reference/screenshots/module-07-customers.png.
 */
type Mode = "customers" | "orders" | "reviews";
type CFilter = "all" | "vip" | "regular" | "new" | "b2b";

const CUSTOMERS = [
  { name: "Maria Lopez", initials: "ML", visits: 24, spent: "$1,824", last: { es: "2 días", en: "2 days" }, tag: { es: "VIP", en: "VIP" }, seg: "vip" },
  { name: "James Tate", initials: "JT", visits: 18, spent: "$1,420", last: { es: "1 sem", en: "1 week" }, tag: { es: "Recurrente", en: "Regular" }, seg: "regular" },
  { name: "Mission Tech", initials: "MT", visits: 12, spent: "$4,680", last: { es: "Hoy", en: "Today" }, tag: { es: "B2B", en: "B2B" }, seg: "b2b" },
  { name: "Sofía Reyes", initials: "SR", visits: 14, spent: "$840", last: { es: "Hoy", en: "Today" }, tag: { es: "Vegano", en: "Vegan" }, seg: "regular" },
  { name: "Carlos M.", initials: "CM", visits: 3, spent: "$184", last: { es: "4 días", en: "4 days" }, tag: { es: "Nuevo", en: "New" }, seg: "new" },
];

const ORDERS = [
  { id: "#2487", who: "Maria Lopez", when: { es: "ahora", en: "now" }, items: { es: "2× Pan de campo, Tiramisú, Agua", en: "2× Country loaf, Tiramisù, Water" }, total: "$48.20", urgent: true, status: "new" },
  { id: "#2486", who: "Mesa 7", when: { es: "2 min", en: "2 min" }, items: { es: "3× Pizza margherita, Vino tinto", en: "3× Margherita pizza, Red wine" }, total: "$92.00", status: "prep" },
  { id: "#2481", who: "Carlos M.", when: { es: "18 min", en: "18 min" }, items: { es: "Tiramisú, 2× Galletas", en: "Tiramisù, 2× Cookies" }, total: "$24.50", status: "ready" },
];

const REVIEWS = [
  { who: "James Tate", initials: "JT", stars: 4, src: "Google", when: { es: "14 min", en: "14 min" }, text: { es: "El servicio fue un poco lento pero la comida lo compensó. El menú degustación fue lo mejor.", en: "Service was a bit slow but the food made up for it. The tasting menu was the highlight." }, replied: false },
  { who: "Maria Lopez", initials: "ML", stars: 5, src: "Nearby", when: { es: "2 h", en: "2h" }, text: { es: "El mejor pan de masa madre de la ciudad. La pizza de los martes es una experiencia.", en: "Best sourdough in town. Tuesday pizza is an experience." }, replied: false },
  { who: "Daniel Kim", initials: "DK", stars: 5, src: "Google", when: { es: "3 días", en: "3 days" }, text: { es: "Cena de cumpleaños — trajeron una vela en el pastel. Hicieron la noche.", en: "Birthday dinner — they brought a candle on the cake. Made the night." }, replied: true },
];

export function CustomersModule({ onBack }: { onBack: () => void }) {
  const { L } = useI18n();
  const [mode, setMode] = useState<Mode>("customers");
  const [cfilter, setCfilter] = useState<CFilter>("all");

  const subtitle =
    mode === "customers" ? L("4,284 total · 62 nuevos", "4,284 total · 62 new") : mode === "orders" ? L("38 hoy · 4 en curso", "38 today · 4 in flight") : L("4.8★ · 2 sin responder", "4.8★ · 2 to reply");

  const shownCustomers = CUSTOMERS.filter((c) => (cfilter === "all" ? true : c.seg === cfilter));

  return (
    <ModuleShell title={mode === "customers" ? L("Clientes", "Customers") : mode === "orders" ? L("Pedidos", "Orders") : L("Reseñas", "Reviews")} subtitle={subtitle} onBack={onBack}>
      <div className="px-4 pb-3">
        <SegToggle
          segments={[
            { id: "customers", label: L("Clientes", "Customers"), icon: <Users size={14} /> },
            { id: "orders", label: L("Pedidos", "Orders"), icon: <Receipt size={14} />, badge: 4 },
            { id: "reviews", label: L("Reseñas", "Reviews"), icon: <Star size={14} />, badge: 2 },
          ]}
          active={mode}
          onChange={setMode}
        />
      </div>

      {mode === "customers" ? (
        <>
          <ModuleTabs
            tabs={[
              { id: "all", label: L("Todos", "All") },
              { id: "vip", label: "VIP" },
              { id: "regular", label: L("Recurrentes", "Regulars") },
              { id: "new", label: L("Nuevos", "New") },
              { id: "b2b", label: "B2B" },
            ]}
            active={cfilter}
            onChange={setCfilter}
            className="pb-3"
          />
          <div className="space-y-4 px-4">
            <div className="grid grid-cols-2 gap-2.5">
              <StatTile icon={<Users size={14} className="text-primary" />} label={L("Total", "Total")} value="4,284" sub="▲ 6%" subTone="success" />
              <StatTile icon={<Sparkles size={14} className="text-rose" />} label={L("Nuevos 30d", "New 30d")} value="62" sub="▲ 28%" subTone="success" />
              <StatTile icon={<RefreshCw size={14} className="text-success" />} label={L("Recurrencia", "Return rate")} value="72%" sub="▲ 4pp" subTone="success" />
              <StatTile icon={<span className="text-[12px]">$</span>} label={L("LTV prom.", "Avg LTV")} value="$184" sub="▲ 9%" subTone="success" />
            </div>

            <ModuleSearch placeholder={L("Buscar por nombre, teléfono…", "Search by name, phone…")} />

            <div className="space-y-2.5">
              {shownCustomers.map((c) => (
                <Card key={c.name} className="flex items-center gap-3 p-3">
                  <Avatar initials={c.initials} tone="canvas" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[13.5px] font-extrabold text-ink">{c.name}</span>
                      <StatusPill tone={c.seg === "vip" ? "warn" : c.seg === "b2b" ? "primary" : "neutral"}>{L(c.tag.es, c.tag.en)}</StatusPill>
                    </div>
                    <div className="mt-0.5 text-[11.5px] font-semibold text-muted">
                      {c.visits} {L("visitas", "visits")} · {c.spent} · {L("última", "last")} {L(c.last.es, c.last.en)}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </>
      ) : mode === "orders" ? (
        <div className="space-y-4 px-4 pt-1">
          <div className="grid grid-cols-2 gap-2.5">
            <StatTile icon={<Receipt size={14} className="text-primary" />} label={L("Pedidos hoy", "Orders today")} value="38" sub="▲ 18%" subTone="success" />
            <StatTile icon={<Zap size={14} className="text-gold" />} label={L("En curso", "In flight")} value="4" sub={L("1 urgente", "1 urgent")} subTone="rose" />
          </div>
          <div className="space-y-2.5">
            {ORDERS.map((o) => (
              <Card key={o.id} className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13.5px] font-extrabold text-ink">{o.id}</span>
                    {o.urgent ? <StatusPill tone="rose" dot>{L("Urgente", "Urgent")}</StatusPill> : null}
                  </div>
                  <span className="text-[11px] font-bold text-muted-soft">{L(o.when.es, o.when.en)}</span>
                </div>
                <div className="mt-1 text-[12px] font-bold text-muted">{o.who}</div>
                <div className="mt-1 text-[12px] font-semibold text-ink">{L(o.items.es, o.items.en)}</div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[14px] font-extrabold text-ink">{o.total}</span>
                  {o.status === "new" ? (
                    <PrimaryButton className="px-4 py-2 text-[12px]">{L("Aceptar", "Accept")}</PrimaryButton>
                  ) : o.status === "prep" ? (
                    <StatusPill tone="warn">{L("Preparando", "Preparing")}</StatusPill>
                  ) : (
                    <StatusPill tone="success">{L("Listo", "Ready")}</StatusPill>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4 px-4 pt-1">
          <Card className="flex items-center gap-4 p-4">
            <div className="text-center">
              <div className="text-[34px] font-extrabold leading-none text-ink">4.8</div>
              <div className="mt-1 text-gold">★★★★★</div>
            </div>
            <div className="flex-1 space-y-1">
              {[["5★", "78%"], ["4★", "14%"], ["3★", "5%"], ["2★", "2%"], ["1★", "1%"]].map(([s, p]) => (
                <div key={s} className="flex items-center gap-2">
                  <span className="w-6 text-[10px] font-bold text-muted">{s}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-pill bg-canvas">
                    <div className="h-full rounded-pill bg-gold" style={{ width: p }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <div className="space-y-2.5">
            {REVIEWS.map((r) => (
              <Card key={r.who} className="p-3">
                <div className="flex items-center gap-2.5">
                  <Avatar initials={r.initials} tone="canvas" size={34} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-extrabold text-ink">{r.who}</div>
                    <div className="text-[10.5px] font-bold text-muted-soft">{r.src} · {L(r.when.es, r.when.en)}</div>
                  </div>
                  <span className="flex-none text-[12px] font-extrabold text-gold">{"★".repeat(r.stars)}<span className="text-line">{"★".repeat(5 - r.stars)}</span></span>
                </div>
                <p className="mt-2 text-[12px] font-semibold leading-snug text-ink">{L(r.text.es, r.text.en)}</p>
                {r.replied ? (
                  <div className="mt-2 text-[11px] font-bold text-success">✓ {L("Respondida", "Replied")}</div>
                ) : (
                  <PrimaryButton className="mt-2.5 w-full py-2 text-[12px]">{L("Responder", "Reply")}</PrimaryButton>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}
    </ModuleShell>
  );
}
