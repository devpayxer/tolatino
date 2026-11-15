"use client";
/* 9j-2 · Web Vitals de teléfonos reales (L1629): lo que siente quien usa To'Latino, medido en su navegador, sin terceros. Una vez por página
   (al esconderse o cerrarse): LCP (lo grande que tarda en salir), INP (lo que tarda en responder a un toque: la interacción más lenta) y CLS
   (lo que se mueve sola la pantalla). Manda solo la ruta (el servidor la reduce a su familia), el perfil (teléfono o escritorio) y los tres
   números; nada de la persona, de la cookie ni de la URL completa. sendBeacon: no frena la salida de la página. */
import { useEffect } from "react";

export function Vitales() {
  useEffect(() => {
    if (typeof PerformanceObserver === "undefined" || !navigator.sendBeacon) return;
    let lcp: number | null = null, cls = 0, inp: number | null = null, enviado = false;
    const obs: PerformanceObserver[] = [];
    const ver = (type: string, cb: (e: PerformanceEntry) => void, extra: Record<string, unknown> = {}) => {
      try { const o = new PerformanceObserver((l) => l.getEntries().forEach(cb)); o.observe({ type, buffered: true, ...extra } as PerformanceObserverInit); obs.push(o); } catch { /* el navegador no la mide */ }
    };
    ver("largest-contentful-paint", (e) => { lcp = e.startTime; });
    ver("layout-shift", (e) => { const x = e as PerformanceEntry & { value: number; hadRecentInput: boolean }; if (!x.hadRecentInput) cls += x.value; });
    ver("event", (e) => { const x = e as PerformanceEntry & { interactionId?: number }; if (x.interactionId) inp = Math.max(inp ?? 0, e.duration); }, { durationThreshold: 40 });
    const ruta = location.pathname;
    const enviar = () => {
      if (enviado || (lcp == null && inp == null)) return;
      enviado = true;
      const cuerpo = { ruta, perfil: window.innerWidth >= 1024 ? "escritorio" : "telefono", lcp: lcp == null ? null : Math.round(lcp), inp: inp == null ? null : Math.round(inp), cls: Math.round(cls * 1000) / 1000 };
      try { navigator.sendBeacon("/api/vitales", new Blob([JSON.stringify(cuerpo)], { type: "application/json" })); } catch { /* sin red: no se insiste */ }
    };
    const oculto = () => { if (document.visibilityState === "hidden") enviar(); };
    document.addEventListener("visibilitychange", oculto);
    window.addEventListener("pagehide", enviar);
    return () => { document.removeEventListener("visibilitychange", oculto); window.removeEventListener("pagehide", enviar); obs.forEach((o) => o.disconnect()); };
  }, []);
  return null;
}
