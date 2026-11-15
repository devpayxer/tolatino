"use client";
/* 9c · Las hojas (diálogos) con teclado, en un solo lugar (WCAG 2.1.2, 2.4.3): toda hoja con role="dialog" y aria-modal="true" que aparece
   1) recibe el foco (su primer control; si no tiene, la hoja misma), 2) no deja salir el Tab (da la vuelta dentro de la hoja de arriba),
   3) se cierra con Escape (toca su fondo, el elemento de antes con onClick, o su botón «Cerrar»/«Close») y 4) al cerrarse devuelve el foco
   a quien la abrió. Las hojas que ya cierran con Escape por su cuenta llevan data-escape="propio" (no se cierra dos veces).
   Se monta una vez en el layout raíz; las pantallas solo ponen role="dialog" aria-modal="true" y un nombre (guardián hojaAccesible). */
import { useEffect } from "react";

const FOCO = 'button:not([disabled]),a[href],input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
const visible = (e: Element) => (e as HTMLElement).getClientRects().length > 0 && getComputedStyle(e).visibility !== "hidden";
const hojas = () => [...document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]')].filter(visible);
/* El fondo de una hoja: ocupa toda la pantalla (inset-0 / inset: 0); tocarlo la cierra (su onClick). */
const esFondo = (e: HTMLElement) => /(^|\s)inset-0(\s|$)|inset: 0(px)?(;|$)/.test(`${e.getAttribute("class") ?? ""} ${e.getAttribute("style") ?? ""}`);
const enfocables = (h: HTMLElement) => [...h.querySelectorAll<HTMLElement>(FOCO)].filter((e) => visible(e) && !e.closest("[inert],[aria-hidden=true]"));

export function FocoHojas() {
  useEffect(() => {
    const vuelta = new WeakMap<HTMLElement, HTMLElement | null>();
    // Si quien la abrió se desmonta mientras la hoja está abierta (la barra del pedido), se busca otra vez por su data-screen-label.
    const marca = new WeakMap<HTMLElement, string | null>();
    let abiertas: HTMLElement[] = [];
    const revisar = () => {
      const ahora = hojas();
      for (const h of ahora) if (!abiertas.includes(h)) {
        const antes = document.activeElement as HTMLElement | null;
        vuelta.set(h, antes && antes !== document.body && !h.contains(antes) ? antes : null);
        marca.set(h, antes && !h.contains(antes) ? antes.closest("[data-screen-label]")?.getAttribute("data-screen-label") ?? null : null);
        if (!h.contains(document.activeElement)) {
          const p = enfocables(h)[0];
          if (p) p.focus({ preventScroll: true });
          else { if (!h.hasAttribute("tabindex")) h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
        }
      }
      for (const h of abiertas) if (!ahora.includes(h)) {
        const foco = document.activeElement;
        if (foco && foco !== document.body && foco.isConnected) continue;
        let v = vuelta.get(h) ?? null;
        if (!v || !v.isConnected) {
          const m = marca.get(h), el = m ? document.querySelector<HTMLElement>(`[data-screen-label="${CSS.escape(m)}"]`) : null;
          v = el ? (el.matches(FOCO) ? el : enfocables(el)[0] ?? null) : null;
        }
        if (v) v.focus({ preventScroll: true });
      }
      abiertas = ahora;
    };
    const obs = new MutationObserver(() => revisar());
    obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["role", "aria-modal", "style", "class", "hidden"] });
    const tecla = (e: KeyboardEvent) => {
      const h = hojas().at(-1);
      if (!h) return;
      if (e.key === "Tab") {
        const L = enfocables(h);
        if (!L.length) { e.preventDefault(); h.focus(); return; }
        const i = L.indexOf(document.activeElement as HTMLElement);
        if (e.shiftKey && (i <= 0)) { e.preventDefault(); L[L.length - 1]!.focus(); }
        else if (!e.shiftKey && (i === -1 || i === L.length - 1)) { e.preventDefault(); L[0]!.focus(); }
      } else if (e.key === "Escape" && !e.defaultPrevented && h.getAttribute("data-escape") !== "propio") {
        const fondo = h.previousElementSibling as HTMLElement | null;
        const cerrar = [...h.querySelectorAll<HTMLElement>("button,[role=button]")].find((b) => /^(cerrar|close)$/i.test((b.getAttribute("aria-label") ?? b.textContent ?? "").trim()));
        if (cerrar) { e.preventDefault(); cerrar.click(); }
        else if (fondo && esFondo(fondo)) { e.preventDefault(); fondo.click(); }
        else if (h.parentElement && esFondo(h.parentElement)) { e.preventDefault(); h.parentElement.click(); }
      }
    };
    document.addEventListener("keydown", tecla);
    revisar();
    return () => { obs.disconnect(); document.removeEventListener("keydown", tecla); };
  }, []);
  return null;
}
