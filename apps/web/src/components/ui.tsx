"use client";

import type { ReactNode } from "react";

/**
 * Small shared compositions built from design tokens (not duplicates of the
 * primitives in primitives.tsx). Used across the consumer tabs.
 */

/* Filter pills row — active = primary filled, rest = canvas. */
export function FilterChips<T extends string>({
  items,
  active,
  onChange,
}: {
  items: { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(({ id, label }) => {
        const on = id === active;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`rounded-pill px-3.5 py-2 text-[12px] font-extrabold transition ${
              on ? "bg-primary text-white" : "border border-hair bg-surface text-muted"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

/* Circular initials avatar. */
export function Avatar({
  initials,
  tone = "primary",
  size = 40,
  className = "",
}: {
  initials: string;
  tone?: "primary" | "gold" | "canvas" | "ink";
  size?: number;
  className?: string;
}) {
  const tones = {
    primary: "bg-primary text-white",
    gold: "bg-gold text-ink",
    canvas: "bg-canvas text-ink",
    ink: "bg-ink text-white",
  } as const;
  return (
    <span
      className={`inline-flex flex-none items-center justify-center rounded-full font-extrabold ${tones[tone]} ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.34 }}
    >
      {initials}
    </span>
  );
}

/* Small uppercase section heading with optional trailing action. */
export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-3 mt-6 flex items-center justify-between">
      <h2 className="text-[13px] font-extrabold uppercase tracking-wide text-muted">{title}</h2>
      {action}
    </div>
  );
}
