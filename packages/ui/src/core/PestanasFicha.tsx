"use client";
import { useEffect, useRef, type CSSProperties, type KeyboardEvent } from "react";
import { Icon as IconDS } from "../ds/index";

/* Pestañas de la ficha del negocio (23 nov, referencia del fundador): icono + palabra, grandes, y la activa en el color de acción con su raya.
   Pieza tipada que reemplaza a Tabs (variant mono) y DesktopTabs en la ficha; las portadas no se editan a mano.
   · movil: una fila que se desliza de lado (role=tablist / tab, flechas del teclado).
   · escritorio: la misma fila y, a la derecha, el estado del negocio («Abierto · cierra 8 PM») cuando la tira queda pegada arriba.
   Cada pestaña mide 44 de alto o más (objetivosTactiles). Colores = tokens.
   23 nov (fundador, en su teléfono) · La tira solo se mueve de lado: overflow-y hidden (sobraba 1 px de alto y el dedo la movía en cualquier dirección)
   y overscroll-behavior-x contain (al llegar al borde no arrastra la página). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Icon = IconDS as any;

export type PestanaFicha = { id: string; label: string; icon?: string | null };
export type PestanasFichaProps = {
  items: PestanaFicha[];
  active: string;
  onChange: (id: string) => void;
  modo: "movil" | "escritorio";
  /** Escritorio: el estado a la derecha (punto + texto), en el color del estado. */
  aside?: { label: string; dot: string; color: string } | null;
  asideWidth?: number;
  gap?: number;
  style?: CSSProperties;
};

/* 23 nov · La pestaña activa o con el foco siempre se ve: se mueve solo la tira (scrollLeft), nunca la página. Con diez pestañas, entrar por
   ?tab=… o ir con las flechas dejaba la pestaña fuera de la pantalla (pruebas/e2e/fic9cab.cjs). */
const verEnTira = (tira: HTMLElement, el: HTMLElement | null | undefined) => {
  if (!el) return;
  const t = tira.getBoundingClientRect(), b = el.getBoundingClientRect(), margen = 16;
  if (b.left < t.left + margen) tira.scrollLeft += b.left - t.left - margen;
  else if (b.right > t.right - margen) tira.scrollLeft += b.right - t.right + margen;
};

const flechas = (e: KeyboardEvent<HTMLDivElement>) => {
  if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "Home" && e.key !== "End") return;
  const todas = Array.from(e.currentTarget.querySelectorAll<HTMLElement>("[data-pestana]"));
  const i = todas.indexOf(document.activeElement as HTMLElement);
  if (i < 0) return;
  e.preventDefault();
  const j = e.key === "Home" ? 0 : e.key === "End" ? todas.length - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + todas.length) % todas.length;
  todas[j]?.focus({ preventScroll: true });
  verEnTira(e.currentTarget, todas[j]);
};

export function PestanasFicha({ items, active, onChange, modo, aside, asideWidth = 372, gap = 48, style }: PestanasFichaProps) {
  const desk = modo === "escritorio";
  const tira = useRef<HTMLDivElement>(null);
  useEffect(() => { const t = tira.current; if (t) verEnTira(t, t.querySelector<HTMLElement>('[data-pestana][aria-selected="true"],[data-pestana][aria-current="page"]')); }, [active]);
  const fila = (
    <div ref={tira} role={desk ? undefined : "tablist"} onKeyDown={flechas}
      style={{ display: "flex", gap: desk ? 30 : 22, overflowX: "auto", overflowY: "hidden", overscrollBehaviorX: "contain", scrollbarWidth: "none", padding: desk ? 0 : "0 20px", minWidth: 0 }}>
      {items.map((t) => {
        const on = t.id === active, fg = on ? "var(--tl-action)" : "rgba(11,14,18,.75)";
        return (
          <button key={t.id} type="button" data-pestana="" role={desk ? undefined : "tab"} aria-selected={desk ? undefined : on} aria-current={desk && on ? "page" : undefined}
            tabIndex={desk || on ? 0 : -1} onClick={() => onChange(t.id)}
            style={{ flex: "none", display: "flex", alignItems: "center", gap: desk ? 9 : 8, minHeight: desk ? 56 : 50, padding: desk ? "16px 0 14px" : "13px 0 11px", marginBottom: -1,
              background: "none", border: 0, borderBottom: `2.5px solid ${on ? "var(--tl-action)" : "transparent"}`, cursor: "pointer", whiteSpace: "nowrap", color: fg,
              font: `800 ${desk ? 17 : 16}px/1 Manrope, system-ui, sans-serif`, letterSpacing: "-.015em" }}>
            {t.icon ? <Icon name={t.icon} size={desk ? 19 : 18} strokeWidth={2} color={fg} /> : null}
            <span>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
  if (!desk) return <div data-pieza="pestanas-ficha" style={{ background: "var(--tl-white)", borderBottom: "1px solid rgba(11,14,18,.1)", ...style }}>{fila}</div>;
  /* 24 nov (fundador) · Escritorio sin `aside`: la tira va de esquina a esquina (el estado del negocio lo lleva la barra del nombre). */
  if (aside === undefined) return <div data-pieza="pestanas-ficha" data-ancho="completo" style={{ background: "var(--tl-white)", borderBottom: "1px solid rgba(11,14,18,.1)", ...style }}>{fila}</div>;
  return (
    <div data-pieza="pestanas-ficha" style={{ background: "var(--tl-white)", ...style }}>
      <div style={{ display: "grid", gridTemplateColumns: `minmax(0,1fr) ${asideWidth}px`, gap, borderBottom: "1px solid rgba(11,14,18,.1)" }}>
        {fila}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, font: "800 13.5px/1 Manrope, system-ui, sans-serif", color: aside?.color, whiteSpace: "nowrap", minWidth: 0 }}>
          {aside ? <><span style={{ width: 8, height: 8, borderRadius: 99, background: aside.dot, flex: "none" }} /><span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{aside.label}</span></> : null}
        </div>
      </div>
    </div>
  );
}
