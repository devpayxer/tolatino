"use client";

import { useState } from "react";
import { Menu, Bell, BadgeCheck, Zap, Lock, AlertTriangle, LayoutDashboard } from "lucide-react";
import { useI18n } from "../../lib/i18n";
import { useBiz, CATEGORY_LABELS, TIER_CAPS, type Category, type Tier } from "../../lib/biz";
import { PhoneFrame, Card, StatusPill, Sheet, PrimaryButton } from "../../components/primitives";
import { Avatar } from "../../components/ui";
import { MODULE_SCREENS, MODULE_META } from "./modules";
import { BizMenu } from "./BizMenu";

/**
 * Business dashboard hub (mobile). Matches
 * reference/screenshots/business-03-dashboard-mobile.png.
 * Tier-aware: free locks the 9 modules behind a PRO upsell Sheet (never a dead
 * end); verified/premium unlock them. The hamburger opens the BizMenu drawer.
 */
const MODULES = MODULE_META;

const BARS = [30, 26, 34, 28, 40, 52, 58, 66, 54, 70, 46, 38, 60, 50, 42, 36];

export function BizDashboard({ onExit, onNewBusiness }: { onExit: () => void; onNewBusiness: () => void }) {
  const { L, lang, setLang } = useI18n();
  const { tier, setTier, category } = useBiz();
  const [sheet, setSheet] = useState<null | "upsell">(null);
  const [openModule, setOpenModule] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const modulesUnlocked = TIER_CAPS[tier].modules;

  const onModule = (key: string) => {
    setMenuOpen(false);
    if (!modulesUnlocked) return setSheet("upsell");
    setOpenModule(key);
  };

  if (openModule) {
    const ModuleScreen = MODULE_SCREENS[openModule];
    if (ModuleScreen) return <ModuleScreen onBack={() => setOpenModule(null)} />;
  }

  return (
    <PhoneFrame>
      {/* desktop top bar (lg+) */}
      <div className="hidden border-b border-hair bg-surface lg:block">
        <div className="mx-auto flex h-16 w-full max-w-content items-center gap-4 px-6">
          <button onClick={onExit} className="font-extrabold tracking-tight" aria-label={L("Ver como cliente", "View as customer")}>
            <span className="text-ink">To</span>
            <span className="text-primary">Latino</span>
            <span className="ml-1.5 text-[12px] font-bold text-muted">{L("Negocios", "Business")}</span>
          </button>
          <div className="flex items-center gap-2 rounded-pill bg-canvas px-3 py-2">
            <Avatar initials="TE" tone="primary" size={28} />
            <span className="text-[13px] font-extrabold text-ink">Taquería La Esperanza</span>
            {tier !== "free" ? <BadgeCheck size={14} className="text-primary" /> : null}
          </div>
          <div className="flex-1" />
          <div className="flex overflow-hidden rounded-pill bg-canvas text-[12px] font-extrabold">
            <button onClick={() => setLang("es")} className={`px-2.5 py-1.5 ${lang === "es" ? "bg-primary text-white" : "text-muted"}`}>ES</button>
            <button onClick={() => setLang("en")} className={`px-2.5 py-1.5 ${lang === "en" ? "bg-primary text-white" : "text-muted"}`}>EN</button>
          </div>
          <button className="relative flex h-10 w-10 items-center justify-center rounded-full bg-canvas text-ink" aria-label={L("Notificaciones", "Notifications")}>
            <Bell size={17} />
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-pill bg-rose px-1 text-[9px] font-extrabold text-white">7</span>
          </button>
        </div>
      </div>

      {/* dark top bar (mobile) */}
      <div className="flex items-center justify-between gap-2 bg-ink px-4 py-3 text-white lg:hidden">
        <button onClick={() => setMenuOpen(true)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10" aria-label={L("Menú", "Menu")}>
          <Menu size={18} />
        </button>
        <div className="flex items-center gap-1.5">
          <span className="font-extrabold tracking-tight">
            <span className="text-white">To</span>
            <span className="text-primary">Latino</span>
          </span>
          <span className="text-[11px] font-bold text-white/55">{L("Negocios", "Business")}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-pill bg-white/10 text-[10.5px] font-extrabold">
            <button onClick={() => setLang("es")} className={`px-2 py-1 ${lang === "es" ? "bg-primary text-white" : "text-white/60"}`}>ES</button>
            <button onClick={() => setLang("en")} className={`px-2 py-1 ${lang === "en" ? "bg-primary text-white" : "text-white/60"}`}>EN</button>
          </div>
          <button className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/10" aria-label={L("Notificaciones", "Notifications")}>
            <Bell size={16} />
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-pill bg-rose px-1 text-[9px] font-extrabold text-white">7</span>
          </button>
        </div>
      </div>

      <div className="lg:mx-auto lg:flex lg:max-w-content lg:gap-6 lg:px-6 lg:py-6">
        {/* desktop sidebar */}
        <aside className="hidden lg:block lg:w-72 lg:flex-none">
          <BizSidebar tier={tier} category={category} unlocked={modulesUnlocked} onModule={onModule} setTier={setTier} onUpsell={() => setSheet("upsell")} />
        </aside>

        <div className="flex-1 px-4 pb-6 pt-3 lg:px-0 lg:pt-0">
        <h1 className="mb-4 hidden text-[26px] font-extrabold tracking-tight text-ink lg:block">{L("Resumen", "Overview")}</h1>
        {/* identity (mobile — desktop shows it in the sidebar) */}
        <Card className="flex items-center gap-3 p-3 lg:hidden">
          <Avatar initials="TE" tone="primary" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-[15px] font-extrabold text-ink">Taquería La Esperanza</span>
              {tier !== "free" ? <BadgeCheck size={15} className="flex-none text-primary" /> : null}
            </div>
            <div className="text-[11.5px] font-semibold text-muted">{L(CATEGORY_LABELS[category].es, CATEGORY_LABELS[category].en)}</div>
          </div>
          <StatusPill tone={tier === "free" ? "neutral" : tier === "premium" ? "warn" : "primary"}>
            {L(TIER_CAPS[tier].label.es, TIER_CAPS[tier].label.en)}
          </StatusPill>
        </Card>

        <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-5">
        {/* live revenue (dark) */}
        <div className="mt-3 overflow-hidden rounded-card bg-ink p-4 text-white lg:mt-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-1.5 text-[10.5px] font-extrabold uppercase tracking-wide text-white/60">
              <Zap size={13} className="text-gold" /> {L("Ingresos de hoy · En vivo", "Today's revenue · Live")}
            </div>
            <span className="text-[10px] font-bold text-white/45">{L("hace 12 seg", "12s ago")}</span>
          </div>
          <div className="mt-1 text-[32px] font-extrabold leading-none tracking-tight">
            $1,847<span className="text-[18px] text-white/55">.50</span>
          </div>
          <div className="mt-1 text-[11.5px] font-bold text-success">
            ▲ 12% <span className="font-semibold text-white/60">{L("vs. martes promedio · meta $2,400", "vs. avg Tuesday · goal $2,400")}</span>
          </div>
          {/* bar chart */}
          <div className="mt-3 flex h-16 items-end gap-1">
            {BARS.map((h, i) => (
              <div
                key={i}
                className={`flex-1 rounded-sm ${i === 9 ? "bg-gold" : i > 10 ? "bg-white/15" : "bg-primary"}`}
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
          <div className="mt-3 flex gap-6 border-t border-white/10 pt-3">
            {[
              { l: L("pedidos", "orders"), v: "68" },
              { l: L("ticket prom.", "avg ticket"), v: "$27.16" },
              { l: L("nuevos", "new"), v: "14" },
            ].map((s) => (
              <div key={s.l}>
                <div className="text-[10px] font-bold uppercase tracking-wide text-white/45">{s.l}</div>
                <div className="text-[16px] font-extrabold">{s.v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* attention */}
        <div className="mt-3 rounded-card border border-hair bg-warn-soft p-3.5 lg:mt-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[12.5px] font-extrabold text-warn">
              <AlertTriangle size={15} /> {L("Requiere tu atención", "Needs your attention")}
            </div>
            <StatusPill tone="warn">{L("3 pendientes", "3 pending")}</StatusPill>
          </div>
          <div className="mt-2 space-y-1.5 text-[12px] font-semibold text-ink">
            <div>· {L("2 pedidos sin confirmar", "2 unconfirmed orders")}</div>
            <div>· {L("1 reseña sin responder", "1 review without a reply")}</div>
          </div>
        </div>
        </div>

        {/* modules — quick-access grid (mobile; desktop uses the sidebar nav) */}
        <div className="lg:hidden">
          <div className="mb-3 mt-6 flex items-center justify-between">
            <h2 className="text-[13px] font-extrabold uppercase tracking-wide text-muted">{L("Módulos", "Modules")}</h2>
            {!modulesUnlocked ? (
              <button onClick={() => setSheet("upsell")} className="text-[12px] font-extrabold text-primary">
                {L("Desbloquear", "Unlock")}
              </button>
            ) : null}
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {MODULES.map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.key}
                  onClick={() => onModule(m.key)}
                  className="relative flex flex-col items-center gap-1.5 rounded-card border border-hair bg-surface px-1.5 py-3.5"
                >
                  {!modulesUnlocked ? (
                    <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-canvas text-muted">
                      <Lock size={10} />
                    </span>
                  ) : null}
                  <div className={`flex h-10 w-10 items-center justify-center rounded-tile bg-canvas ${modulesUnlocked ? "text-primary" : "text-muted-soft"}`}>
                    <Icon size={19} />
                  </div>
                  <span className={`text-[11px] font-extrabold ${modulesUnlocked ? "text-ink" : "text-muted"}`}>{L(m.es, m.en)}</span>
                </button>
              );
            })}
          </div>
        </div>
        </div>
      </div>

      {/* upsell sheet (free tier — modules locked) */}
      <Sheet open={sheet !== null} onClose={() => setSheet(null)}>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-[17px] font-extrabold text-ink">{L("Desbloquea los módulos", "Unlock the modules")}</span>
            <span className="rounded-pill bg-gold px-1.5 py-0.5 text-[9px] font-extrabold text-ink">PRO</span>
          </div>
          <p className="mt-1 text-[13px] font-semibold text-muted">
            {L("Con Verificado administras pedidos, reservas, productos, clientes y más.", "Verified lets you manage orders, bookings, products, customers and more.")}
          </p>
          <PrimaryButton className="mt-4 w-full" onClick={() => setSheet(null)}>
            {L("Mejorar a Verificado · $19/mo", "Upgrade to Verified · $19/mo")}
          </PrimaryButton>
        </div>
      </Sheet>

      {/* navigation drawer */}
      <BizMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onHome={() => {
          setMenuOpen(false);
          setOpenModule(null);
        }}
        onSelect={onModule}
        onNewBusiness={() => {
          setMenuOpen(false);
          onNewBusiness();
        }}
        onExit={onExit}
      />
    </PhoneFrame>
  );
}

/**
 * Desktop sidebar (lg+). Identity card + module nav (lock-aware) + plan preview.
 * Replaces bottom tabs on desktop (DESIGN_SYSTEM.md §6).
 */
function BizSidebar({
  tier,
  category,
  unlocked,
  onModule,
  setTier,
  onUpsell,
}: {
  tier: Tier;
  category: Category;
  unlocked: boolean;
  onModule: (key: string) => void;
  setTier: (t: Tier) => void;
  onUpsell: () => void;
}) {
  const { L } = useI18n();
  return (
    <div className="sticky top-[88px] space-y-4">
      {/* identity */}
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <Avatar initials="TE" tone="primary" size={44} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="truncate text-[14px] font-extrabold text-ink">Taquería La Esperanza</span>
              {tier !== "free" ? <BadgeCheck size={14} className="flex-none text-primary" /> : null}
            </div>
            <div className="text-[11.5px] font-semibold text-muted">{L(CATEGORY_LABELS[category].es, CATEGORY_LABELS[category].en)}</div>
          </div>
        </div>
        <StatusPill tone={tier === "free" ? "neutral" : tier === "premium" ? "warn" : "primary"}>
          {L(TIER_CAPS[tier].label.es, TIER_CAPS[tier].label.en)}
        </StatusPill>
      </Card>

      {/* nav */}
      <Card className="p-2">
        <div className="flex items-center gap-3 rounded-tile bg-primary/10 px-3 py-2.5">
          <LayoutDashboard size={17} className="text-primary" />
          <span className="text-[13px] font-extrabold text-primary">{L("Resumen", "Overview")}</span>
        </div>
        <div className="mt-1 mb-1.5 px-3 pt-2 text-[10px] font-extrabold uppercase tracking-wide text-muted-soft">{L("Módulos", "Modules")}</div>
        {MODULES.map((m) => {
          const Icon = m.icon;
          return (
            <button
              key={m.key}
              onClick={() => (unlocked ? onModule(m.key) : onUpsell())}
              className="flex w-full items-center gap-3 rounded-tile px-3 py-2.5 text-left hover:bg-canvas"
            >
              <Icon size={17} className={unlocked ? "text-primary" : "text-muted-soft"} />
              <span className={`flex-1 text-[13px] font-bold ${unlocked ? "text-ink" : "text-muted"}`}>{L(m.es, m.en)}</span>
              {!unlocked ? <Lock size={12} className="text-muted-soft" /> : null}
            </button>
          );
        })}
      </Card>

      {/* plan preview */}
      <div>
        <div className="mb-1.5 px-1 text-[10px] font-extrabold uppercase tracking-wide text-muted-soft">{L("Vista previa de plan", "Plan preview")}</div>
        <div className="flex gap-1.5 rounded-[12px] bg-canvas p-1.5">
          {(["free", "verified", "premium"] as Tier[]).map((t) => (
            <button
              key={t}
              onClick={() => setTier(t)}
              className={`flex-1 rounded-[9px] px-2 py-2 text-[11px] font-extrabold transition ${tier === t ? "bg-primary text-white" : "text-muted"}`}
            >
              {L(TIER_CAPS[t].label.es, TIER_CAPS[t].label.en)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
