"use client";
/* 5d · La línea del 988 (autolesión, como Iglesias): sale a quien escribió algo que habla de hacerse daño, sin juzgar. Nada más. */
import * as UI from "@tolatino/ui";
import type { ComponentType } from "react";
import { LINEA988 } from "@/lib/moderacion-comun";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Icon = UI.Icon as ComponentType<any>;

export function Linea988({ es, margen }: { es: boolean; margen?: string }) {
  return (
    <div data-screen-label="Comunidad · línea 988" role="note" style={{ margin: margen, padding: "13px 14px", borderRadius: 14, background: "rgba(75,55,245,.08)", display: "flex", gap: 10, alignItems: "flex-start" }}>
      <span style={{ display: "grid", flex: "none", paddingTop: 1 }}><Icon name="help" size={16} color="var(--tl-action)" /></span>
      <div>
        <div style={{ font: "800 14px/1.35 Sora,sans-serif", letterSpacing: "-.01em", color: "var(--tl-ink)" }}>{es ? "Aquí estamos" : "We're here"}</div>
        <div style={{ marginTop: 4, font: "600 13px/1.5 Manrope,sans-serif", color: "var(--tl-ink)", textWrap: "pretty" }}>{es ? LINEA988.es : LINEA988.en}</div>
      </div>
    </div>
  );
}
