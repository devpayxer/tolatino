"use client";

import { X, LayoutDashboard, Plus, ArrowLeftRight, BadgeCheck, Lock } from "lucide-react";
import { useI18n } from "../../lib/i18n";
import { useBiz, CATEGORY_LABELS, TIER_CAPS, type Tier } from "../../lib/biz";
import { Avatar } from "../../components/ui";
import { MODULE_META } from "./modules";

/**
 * Business-side navigation drawer. Slides over the dashboard PhoneFrame (so it's
 * clipped to the phone). Lists the panel + all 9 modules + account actions, and
 * a plan preview switch so the owner can see locked vs unlocked states.
 *
 * Locked modules (free tier) route through `onSelect` too — the dashboard shows
 * the PRO upsell sheet, never a dead end.
 */
export function BizMenu({
  open,
  onClose,
  onHome,
  onSelect,
  onNewBusiness,
  onExit,
}: {
  open: boolean;
  onClose: () => void;
  onHome: () => void;
  onSelect: (key: string) => void;
  onNewBusiness: () => void;
  onExit: () => void;
}) {
  const { L } = useI18n();
  const { tier, setTier, category } = useBiz();
  const unlocked = TIER_CAPS[tier].modules;

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-50 flex">
      <div className="flex h-full w-[82%] max-w-[310px] flex-col bg-surface shadow-sheet">
        {/* dark header */}
        <div className="bg-ink px-4 pb-4 pt-4 text-white">
          <div className="flex items-center justify-between">
            <span className="font-extrabold tracking-tight">
              <span className="text-white">To</span>
              <span className="text-primary">Latino</span>
              <span className="ml-1.5 text-[11px] font-bold text-white/55">{L("Negocios", "Business")}</span>
            </span>
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10" aria-label={L("Cerrar", "Close")}>
              <X size={16} />
            </button>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Avatar initials="TE" tone="primary" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-[14px] font-extrabold">Taquería La Esperanza</span>
                {tier !== "free" ? <BadgeCheck size={14} className="flex-none text-primary" /> : null}
              </div>
              <div className="text-[11px] font-semibold text-white/55">{L(CATEGORY_LABELS[category].es, CATEGORY_LABELS[category].en)}</div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3">
          {/* panel */}
          <MenuRow icon={<LayoutDashboard size={17} />} label={L("Panel", "Dashboard")} onClick={onHome} />

          {/* modules */}
          <div className="mb-1.5 mt-4 px-2 text-[10.5px] font-extrabold uppercase tracking-wide text-muted-soft">{L("Módulos", "Modules")}</div>
          {MODULE_META.map((m) => {
            const Icon = m.icon;
            return (
              <MenuRow
                key={m.key}
                icon={<Icon size={17} />}
                label={L(m.es, m.en)}
                locked={!unlocked}
                onClick={() => onSelect(m.key)}
              />
            );
          })}

          {/* plan preview (owner tool) */}
          <div className="mb-1.5 mt-4 px-2 text-[10.5px] font-extrabold uppercase tracking-wide text-muted-soft">{L("Vista previa de plan", "Plan preview")}</div>
          <div className="mx-1 flex gap-1.5 rounded-[12px] bg-canvas p-1.5">
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

        {/* footer actions */}
        <div className="space-y-1 border-t border-hair px-3 py-3">
          <MenuRow icon={<Plus size={17} />} label={L("Alta de negocio", "Add a business")} onClick={onNewBusiness} />
          <MenuRow icon={<ArrowLeftRight size={17} />} label={L("Ver como cliente", "View as customer")} onClick={onExit} />
        </div>
      </div>

      {/* scrim */}
      <div className="flex-1 bg-ink/40" onClick={onClose} />
    </div>
  );
}

function MenuRow({
  icon,
  label,
  locked,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  locked?: boolean;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-tile px-3 py-2.5 text-left active:bg-canvas">
      <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-tile bg-canvas ${locked ? "text-muted-soft" : "text-primary"}`}>{icon}</span>
      <span className={`flex-1 text-[13.5px] font-extrabold ${locked ? "text-muted" : "text-ink"}`}>{label}</span>
      {locked ? <Lock size={13} className="flex-none text-muted-soft" /> : null}
    </button>
  );
}
