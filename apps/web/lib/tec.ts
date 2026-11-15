/* 9c · Teclado para lo que es un role="button" / "link" / "tab"… hecho con un <div> o un <span>: `{...tec(clic)}` le da foco (tabIndex 0) y
   Enter / Espacio, solo con el foco en el propio elemento (para no robarle la tecla a un campo de dentro). Sin clic no devuelve nada.
   Los componentes del sistema de diseño traen lo mismo en packages/ui (__ds_scope.__btn); esto es para las pantallas. */
import type { KeyboardEvent } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function tec(fn?: ((e?: any) => unknown) | null): { tabIndex?: number; onKeyDown?: (e: KeyboardEvent<HTMLElement>) => void } {
  if (!fn) return {};
  return {
    tabIndex: 0,
    onKeyDown: (e) => {
      if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
        e.preventDefault();
        fn(e);
      }
    },
  };
}

/* 9c · Las flechas entre pestañas de un role="tablist" (lo mismo que __ds_scope.__flechas en el sistema): ← → mueven el foco en círculo,
   Inicio y Fin a la primera y la última; Enter o Espacio eligen. `<div role="tablist" onKeyDown={flechas}>`. */
export function flechas(e: KeyboardEvent<HTMLElement>) {
  const k = e.key;
  if (k !== "ArrowRight" && k !== "ArrowLeft" && k !== "Home" && k !== "End") return;
  const L = [...e.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]')], i = L.indexOf(document.activeElement as HTMLElement);
  if (i < 0 || !L.length) return;
  e.preventDefault();
  const j = k === "Home" ? 0 : k === "End" ? L.length - 1 : (i + (k === "ArrowRight" ? 1 : -1) + L.length) % L.length;
  L[j]!.focus();
  L[j]!.scrollIntoView?.({ block: "nearest", inline: "nearest" });
}
