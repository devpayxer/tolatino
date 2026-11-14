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
