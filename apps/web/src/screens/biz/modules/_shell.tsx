"use client";

import type { ReactNode } from "react";
import { ChevronLeft, Search } from "lucide-react";
import { useI18n } from "../../../lib/i18n";
import { PhoneFrame, Card, categoryTile } from "../../../components/primitives";

/**
 * Shared shell for the 9 business module screens. Light header (back · title ·
 * subtitle · ES/EN · optional trailing action) inside a PhoneFrame, then the
 * module body. Matches reference/screenshots/module-01..09 — every module leads
 * with this same header, then its own tab row + content.
 */
export function ModuleShell({
  title,
  subtitle,
  onBack,
  action,
  children,
}: {
  title: string;
  subtitle: string;
  onBack: () => void;
  action?: ReactNode;
  children: ReactNode;
}) {
  const { lang, setLang } = useI18n();
  return (
    <PhoneFrame>
      <div className="flex items-center gap-3 px-4 pb-3 pt-1.5">
        <button
          onClick={onBack}
          className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-canvas text-ink"
          aria-label="Back"
        >
          <ChevronLeft size={19} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[19px] font-extrabold leading-tight tracking-tight text-ink">{title}</div>
          <div className="truncate text-[12px] font-semibold text-muted">{subtitle}</div>
        </div>
        <div className="flex flex-none overflow-hidden rounded-pill bg-canvas text-[11px] font-extrabold">
          <button onClick={() => setLang("es")} className={`px-2 py-1 ${lang === "es" ? "bg-primary text-white" : "text-muted"}`}>ES</button>
          <button onClick={() => setLang("en")} className={`px-2 py-1 ${lang === "en" ? "bg-primary text-white" : "text-muted"}`}>EN</button>
        </div>
        {action}
      </div>
      <div className="pb-6">{children}</div>
    </PhoneFrame>
  );
}

/**
 * Horizontal scrolling pill tab row (the module section tabs). Active = primary
 * filled; inactive = surface + hairline. Optional count badge per tab.
 */
export function ModuleTabs<T extends string>({
  tabs,
  active,
  onChange,
  className = "",
}: {
  tabs: { id: T; label: string; count?: number }[];
  active: T;
  onChange: (id: T) => void;
  className?: string;
}) {
  return (
    <div className={`no-scrollbar flex gap-2 overflow-x-auto px-4 ${className}`}>
      {tabs.map(({ id, label, count }) => {
        const on = id === active;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`flex flex-none items-center gap-1.5 rounded-pill px-3.5 py-2 text-[12.5px] font-extrabold transition ${
              on ? "bg-primary text-white" : "border border-hair bg-surface text-muted"
            }`}
          >
            {label}
            {count != null ? (
              <span className={`text-[11px] ${on ? "text-white/70" : "text-muted-soft"}`}>{count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Dark segmented toggle (e.g. Productos / Envío, Servicios / Reservas). Active
 * segment = ink filled; inactive = transparent muted. Sits in a canvas track.
 */
export function SegToggle<T extends string>({
  segments,
  active,
  onChange,
  className = "",
}: {
  segments: { id: T; label: string; icon?: ReactNode; badge?: number }[];
  active: T;
  onChange: (id: T) => void;
  className?: string;
}) {
  return (
    <div className={`flex gap-1.5 rounded-[14px] bg-canvas p-1.5 ${className}`}>
      {segments.map(({ id, label, icon, badge }) => {
        const on = id === active;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-[10px] px-3 py-2.5 text-[13px] font-extrabold transition ${
              on ? "bg-ink text-white shadow-card" : "text-muted"
            }`}
          >
            {icon}
            {label}
            {badge != null ? (
              <span className={`flex h-4 min-w-4 items-center justify-center rounded-pill px-1 text-[10px] ${on ? "bg-white/20 text-white" : "bg-rose text-white"}`}>
                {badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Informational callout — icon tile + title + sub, with an optional trailing
 * action (e.g. "Este menú alimenta tu listado · Cada cambio aparece en tu
 * página pública").
 */
export function ModuleBanner({
  icon,
  title,
  sub,
  action,
  tone = "primary",
}: {
  icon: ReactNode;
  title: string;
  sub: string;
  action?: ReactNode;
  tone?: "primary" | "canvas";
}) {
  return (
    <Card className="flex items-center gap-3 p-3.5">
      <div className={`flex h-10 w-10 flex-none items-center justify-center rounded-tile ${tone === "primary" ? "bg-primary/10 text-primary" : "bg-canvas text-muted"}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-extrabold text-ink">{title}</div>
        <div className="text-[11.5px] font-semibold leading-snug text-muted">{sub}</div>
      </div>
      {action ? <div className="flex-none">{action}</div> : null}
    </Card>
  );
}

/** Gradient placeholder thumbnail (imagery = categoryTile gradient, not photos). */
export function ListThumb({ seed, className = "" }: { seed: string; className?: string }) {
  return <div className={`flex-none rounded-tile ${className}`} style={categoryTile(seed)} />;
}

/** Search input row used inside several modules. */
export function ModuleSearch({ placeholder }: { placeholder: string }) {
  return (
    <div className="flex items-center gap-2 rounded-[14px] border border-line bg-surface px-3.5 py-3">
      <Search size={16} className="flex-none text-muted-soft" />
      <input
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-[13.5px] font-semibold text-ink outline-none placeholder:text-muted-soft"
      />
    </div>
  );
}

/** Pill switch (track + knob). Controlled. */
export function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`flex h-6 w-11 flex-none items-center rounded-pill p-0.5 transition ${on ? "bg-primary" : "bg-line"}`}
      role="switch"
      aria-checked={on}
    >
      <span className={`h-5 w-5 rounded-full bg-white shadow-card transition ${on ? "translate-x-5" : ""}`} />
    </button>
  );
}
