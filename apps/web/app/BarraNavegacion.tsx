"use client";
/* 9t · La barra de navegación (pedido del fundador, 19 nov: «el sitio se queda como enganchado cuando das un click a un enlace»). Al tocar un
   enlace interno sale al instante una barra fina arriba (--tl-action, esqueleto.css) que avanza mientras llega la página y se completa al
   cambiar la dirección. Junto con los loading.tsx (esqueletos), la pantalla responde en el mismo toque.
   Solo enlaces de este sitio a OTRA dirección, sin teclas de abrir aparte (Ctrl/⌘/Shift/Alt), sin target ni download, botón principal.
   Además, el aviso de Next de cada navegación (router.push de un botón, atrás y adelante: instrumentation-client.ts → «tl:navega»).
   Si la navegación no llega (sin señal, error), se apaga sola a los 12 s. No pinta nada mientras no hay navegación (pointer-events: none). */
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

/* La barra se mueve tocando el DOM directo (no con estado de React): Next navega dentro de una transición de React y cualquier setState de ese
   momento esperaría a que la página nueva llegue, que es justo lo que no queremos (19 nov: así se quedaba quieta con router.push). */
export function BarraNavegacion() {
  const ruta = usePathname(), q = useSearchParams()?.toString() ?? "";
  const barra = useRef<HTMLDivElement>(null);
  const tics = useRef<number[]>([]);
  const aqui = useRef(`${ruta}?${q}`);
  const va = useRef(false);

  const limpiar = () => { for (const t of tics.current) window.clearTimeout(t); tics.current = []; };
  const poner = (estado: "quieta" | "va" | "fin", avance?: number) => {
    const b = barra.current;
    if (!b) return;
    b.dataset.estado = estado;
    b.style.transform = estado === "va" && avance !== undefined ? `scaleX(${avance})` : estado === "fin" ? "scaleX(1)" : "";
  };

  useEffect(() => {
    // Empezar: sale al instante al 18 % y avanza rápido al principio y cada vez más lento (nunca llega sola al final): 45 → 65 → 80 → 88 %.
    const empezar = (url: string) => {
      // El esqueleto de la pantalla que viene (app/Pendiente.tsx) sale con el mismo aviso.
      window.dispatchEvent(new CustomEvent("tl:pendiente", { detail: { url } }));
      limpiar(); va.current = true;
      poner("va", 0.18);
      const pasos: [number, number][] = [[160, 0.45], [600, 0.65], [1500, 0.8], [3500, 0.88]];
      for (const [ms, v] of pasos) tics.current.push(window.setTimeout(() => poner("va", v), ms));
      tics.current.push(window.setTimeout(() => { va.current = false; poner("quieta"); }, 12000));
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
      empezar(u.href);
    };
    // Lo que no es un enlace (router.push de un botón, replace, atrás y adelante): el aviso de Next (instrumentation-client.ts).
    const alNavegar = (e: Event) => {
      const url = (e as CustomEvent<{ url: string }>).detail?.url;
      if (!url) return;
      try { const u = new URL(url, location.href); if (u.pathname === location.pathname && u.search === location.search) return; } catch { return; }
      empezar(url);
    };
    document.addEventListener("click", alTocar, true);
    window.addEventListener("tl:navega", alNavegar);
    return () => { document.removeEventListener("click", alTocar, true); window.removeEventListener("tl:navega", alNavegar); limpiar(); };
  }, []);

  // Terminar: cambió la dirección (la página nueva ya está).
  useEffect(() => {
    const ahora = `${ruta}?${q}`;
    if (ahora === aqui.current) return;
    aqui.current = ahora;
    limpiar();
    if (!va.current) return;
    va.current = false;
    poner("fin");
    tics.current.push(window.setTimeout(() => poner("quieta"), 450));
  }, [ruta, q]);

  return <div ref={barra} aria-hidden="true" className="tl-barra-nav" data-estado="quieta" />;
}
