"use client";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { Icon as IconDS, IconButton as IconButtonDS } from "../ds/index";

/* Pestañas de la ficha del negocio (23 nov, referencia del fundador): icono + palabra, grandes, y la activa en el color de acción con su raya.
   Pieza tipada que reemplaza a Tabs (variant mono) y DesktopTabs en la ficha; las portadas no se editan a mano.
   · movil: una fila que se desliza de lado (role=tablist / tab, flechas del teclado).
   · escritorio: la misma fila y, a la derecha, el estado del negocio («Abierto · cierra 8 PM») cuando la tira queda pegada arriba.
   Cada pestaña mide 44 de alto o más (objetivosTactiles). Colores = tokens.
   23 nov (fundador, en su teléfono) · La tira solo se mueve de lado: overflow-y hidden (sobraba 1 px de alto y el dedo la movía en cualquier dirección)
   y overscroll-behavior-x contain (al llegar al borde no arrastra la página). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Icon = IconDS as any, IconButton = IconButtonDS as any;

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
  /* 24 nov (fundador, en una ventana estrecha de computadora) · En modo «movil» con RATÓN no hay dedo para deslizar la tira: si las pestañas no caben,
     al pasar el cursor salen las flechas de izquierda y derecha (las mismas del escritorio). Con el dedo no salen nunca (pointerType distinto de mouse). */
  const [fl, setFl] = useState({ l: false, r: false }), [encima, setEncima] = useState(false);
  const medir = useCallback(() => { const t = tira.current; if (t) setFl({ l: t.scrollLeft > 4, r: t.scrollLeft + t.clientWidth < t.scrollWidth - 4 }); }, []);
  useEffect(() => {
    if (desk) return;
    const t = tira.current; if (!t) return;
    medir(); t.addEventListener("scroll", medir, { passive: true }); window.addEventListener("resize", medir);
    return () => { t.removeEventListener("scroll", medir); window.removeEventListener("resize", medir); };
  }, [desk, medir, items.length]);
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
  if (!desk) {
    const flecha = (lado: "l" | "r") => (
      <div data-pieza="flecha-pestanas-movil" data-lado={lado} style={{ position: "absolute", top: 0, bottom: 1, [lado === "l" ? "left" : "right"]: 0, width: 64, display: "flex", alignItems: "center",
        justifyContent: lado === "l" ? "flex-start" : "flex-end", padding: "0 6px", pointerEvents: "none",
        background: `linear-gradient(${lado === "l" ? 90 : 270}deg, var(--tl-white) 55%, rgba(255,255,255,0))` }}>
        <span style={{ pointerEvents: "auto" }}><IconButton icon={lado === "l" ? "chevronLeft" : "chevronRight"} size={34} label={lado === "l" ? "Anteriores · Previous" : "Más · More"}
          onClick={() => tira.current?.scrollBy({ left: lado === "l" ? -240 : 240, behavior: "smooth" })} /></span>
      </div>
    );
    return (
      <div data-pieza="pestanas-ficha" onPointerEnter={(e) => { if (e.pointerType === "mouse") { setEncima(true); medir(); } }} onPointerLeave={() => setEncima(false)}
        style={{ position: "relative", background: "var(--tl-white)", borderBottom: "1px solid rgba(11,14,18,.1)", ...style }}>
        {fila}
        {encima && fl.l ? flecha("l") : null}
        {encima && fl.r ? flecha("r") : null}
      </div>
    );
  }
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
