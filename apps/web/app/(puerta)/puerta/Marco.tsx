"use client";
/* To'Latino Puerta · el marco: arriba oscuro y de alto contraste (la puerta es de noche) con las cifras en vivo; abajo la hoja clara con
   los bloques del sistema (listas legibles). Compuesto con tokens y PanelBloques (hueco #1 del plan, anotado en REVISION). */
import { Icon, PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import type { ReactNode } from "react";

export function Cabeza({ eye, t, s, kpis, onBack, children }: { eye: string; t: string; s?: string; kpis?: Extract<Bloque, { type: "kpis" }>["items"]; onBack?: () => void; children?: ReactNode }) {
  return (
    <div style={{ padding: "calc(env(safe-area-inset-top, 0px) + 18px) 16px 16px", display: "flex", flexDirection: "column", gap: 12, maxWidth: 560, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        {onBack ? <span role="button" aria-label="Atrás" tabIndex={0} onClick={onBack} onKeyDown={(e) => { if (e.key === "Enter") onBack(); }} style={{ width: 40, height: 40, borderRadius: 13, border: "1px solid var(--tl-dark-line)", display: "grid", placeItems: "center", cursor: "pointer", flex: "none" }}><Icon name="chevronLeft" size={18} color="var(--tl-white)" /></span> : null}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ font: "700 9.5px 'JetBrains Mono',monospace", letterSpacing: ".12em", color: "rgba(255,255,255,.62)" }}>{eye}</span>
          <h1 style={{ margin: 0, font: "800 22px/1.15 Sora,sans-serif", letterSpacing: "-.03em", color: "var(--tl-white)", overflowWrap: "anywhere" }}>{t}</h1>
          {s ? <span style={{ font: "500 13.5px/1.45 Manrope,sans-serif", color: "rgba(255,255,255,.72)" }}>{s}</span> : null}
        </div>
      </div>
      {kpis?.length ? <PanelBloques bloques={[{ type: "kpis", cols: `repeat(${kpis.length},minmax(0,1fr))`, items: kpis }]} /> : null}
      {children}
    </div>);
}
export function Hoja({ children, pb = 40 }: { children: ReactNode; pb?: number }) {
  return (
    <div style={{ flex: 1, background: "var(--tl-paper)", color: "var(--tl-ink)", borderRadius: "24px 24px 0 0" }}>
      <div style={{ maxWidth: 560, margin: "0 auto", padding: `18px 16px ${pb}px`, display: "flex", flexDirection: "column", gap: 12, boxSizing: "border-box" }}>{children}</div>
    </div>);
}
/* Una cifra de la cabecera oscura (kpis del sistema con el fondo oscuro). */
export const kpiOscuro = (k: string, v: string, s?: string, alerta?: "warn" | "bad") => ({ k, v, s,
  bg: alerta === "bad" ? "var(--tl-danger)" : alerta === "warn" ? "var(--tl-pro)" : "var(--tl-dark-2)", fg: alerta === "warn" ? "var(--tl-ink)" : "var(--tl-white)", bd: "1px solid var(--tl-dark-line)" });
