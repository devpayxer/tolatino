"use client";
/* 9t · La pantalla responde en el mismo toque (pedido del fundador, 19 nov: «el sitio se queda como enganchado cuando das un click a un enlace»).
   20 nov · Decisión del fundador: SIN la línea azul de arriba («no me gusta; prefiero algún tipo de hover al dar click a algún elemento»). Ahora
   responde el elemento que se tocó: se atenúa al instante (data-tl-tocado; el estilo está en esqueleto.css, junto al de «apretado») y se queda
   así hasta que llega la página nueva. El esqueleto de la pantalla que viene (app/Pendiente.tsx) sigue saliendo con el mismo aviso.
   (El archivo conserva el nombre de cuando pintaba una barra: lo nombran el layout, el guardián respondeAlToque y sus pruebas.)
   - Enlaces de este sitio a OTRA dirección, sin teclas de abrir aparte (Ctrl/⌘/Shift/Alt), sin target ni download, botón principal.
   - Lo que no es un enlace (router.push de un botón o de una tarjeta, atrás y adelante): el aviso de Next de cada navegación
     (instrumentation-client.ts → «tl:navega»); el elemento es el último que se apretó (hace menos de 1,5 s), si sigue en la página.
   - Si la navegación no llega (sin señal, error), se suelta sola a los 12 s. No pinta nada propio. */
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

const TOCABLE = 'a[href],button,[role="button"],[role="link"],[role="tab"],[role="menuitem"]';

/* Todo se hace tocando el DOM directo (no con estado de React): Next navega dentro de una transición de React y cualquier setState de ese
   momento esperaría a que la página nueva llegue, que es justo lo que no queremos (19 nov: así se quedaba quieta con router.push). */
export function BarraNavegacion() {
  const ruta = usePathname(), q = useSearchParams()?.toString() ?? "";
  const tics = useRef<number[]>([]);
  const aqui = useRef(`${ruta}?${q}`);
  const tocado = useRef<Element | null>(null);
  const apretado = useRef<{ el: Element; t: number } | null>(null);

  const limpiar = () => { for (const t of tics.current) window.clearTimeout(t); tics.current = []; };
  const soltar = () => { tocado.current?.removeAttribute("data-tl-tocado"); tocado.current = null; };
  const marcar = (el: Element | null) => {
    soltar();
    if (!el || !el.isConnected) return;
    el.setAttribute("data-tl-tocado", "");
    tocado.current = el;
  };

  useEffect(() => {
    const empezar = (url: string, el: Element | null) => {
      // El esqueleto de la pantalla que viene (app/Pendiente.tsx) sale con el mismo aviso.
      window.dispatchEvent(new CustomEvent("tl:pendiente", { detail: { url } }));
      limpiar();
      marcar(el);
      tics.current.push(window.setTimeout(soltar, 12000));
    };
    // Lo último que se apretó (para las navegaciones que no vienen de un enlace).
    const alApretar = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest?.(TOCABLE) ?? null;
      apretado.current = el ? { el, t: Date.now() } : null;
    };
    // Un enlace de este sitio a OTRA dirección (fase de captura: antes que cualquier otro manejador).
    const alTocar = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download") || a.dataset.sinBarra !== undefined) return;
      let u: URL;
      try { u = new URL(a.href, location.href); } catch { return; }
      if (u.origin !== location.origin) return;
      if (u.pathname === location.pathname && u.search === location.search) return; // mismo lugar (o solo #ancla)
      empezar(u.href, a);
    };
    // Lo que no es un enlace (router.push de un botón, replace, atrás y adelante): el aviso de Next (instrumentation-client.ts).
    const alNavegar = (e: Event) => {
      const url = (e as CustomEvent<{ url: string }>).detail?.url;
      if (!url) return;
      try { const u = new URL(url, location.href); if (u.pathname === location.pathname && u.search === location.search) return; } catch { return; }
      const ap = apretado.current;
      empezar(url, tocado.current ?? (ap && Date.now() - ap.t < 1500 ? ap.el : null));
    };
    document.addEventListener("pointerdown", alApretar, true);
    document.addEventListener("click", alTocar, true);
    window.addEventListener("tl:navega", alNavegar);
    return () => { document.removeEventListener("pointerdown", alApretar, true); document.removeEventListener("click", alTocar, true); window.removeEventListener("tl:navega", alNavegar); limpiar(); soltar(); };
  }, []);

  // Terminar: cambió la dirección (la página nueva ya está).
  useEffect(() => {
    const ahora = `${ruta}?${q}`;
    if (ahora === aqui.current) return;
    aqui.current = ahora;
    limpiar();
    soltar();
  }, [ruta, q]);

  return null;
}
