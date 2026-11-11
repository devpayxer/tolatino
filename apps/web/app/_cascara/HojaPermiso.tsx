"use client";
/* 8a · Hoja previa de un permiso (fase8-apps.md §1b #2 y §5 «Hoja previa de permisos»; hueco del diseño: compuesta como las hojas de
   confirmación de Mi cuenta —velo, hoja con asa, título, una frase, botón principal y secundario— con Icon y Button del sistema). Solo dentro
   de las cáscaras (en la web el navegador pregunta solo, como siempre). Dice POR QUÉ en una frase (la misma del texto de permiso de la tienda,
   apps/mobile/apps.json) y deja «Ahora no». Nunca imita el diálogo del sistema (Apple 5.1.1(iv)): la pregunta de verdad la hace el sistema
   después de «Continuar». Si la persona ya dijo que no, la hoja dice cómo volver a darlo y ofrece «Abrir Ajustes». */
import * as UI from "@tolatino/ui";
import { useCallback, useEffect, useState, type ComponentType, type ReactNode } from "react";
import APPS from "../../../mobile/apps.json";
import { leerRotulo, type ClaveApp } from "@/lib/app-nativa-comun";
import { activarAvisos, estadoAvisos, prepararAvisos, refrescarAvisos } from "@/lib/nativo/avisos";
import { esApp } from "@/lib/nativo/puente";
import { abrirAjustes, estadoPermiso, hojaVista, marcarHoja, type Permiso } from "@/lib/nativo/permisos";
import { anotarPermiso } from "./acciones";

type N = "Icon" | "Button";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button } = UI as unknown as Record<N, ComponentType<any>>;
type Bi = { es: string; en: string };
const TEXTOS = APPS.textos as Record<Permiso, Partial<Record<ClaveApp, Bi>>>;
const TITULO: Record<Permiso, Bi> = { camara: { es: "La cámara", en: "The camera" }, ubicacion: { es: "Tu ubicación", en: "Your location" }, avisos: { es: "Avisos en este teléfono", en: "Notifications on this phone" } };
const ICONO: Record<Permiso, string> = { camara: "image", ubicacion: "pin", avisos: "bell" };

type Hoja = { p: Permiso; negado: boolean; seguir: () => void; no: () => void };
export function HojaPermiso({ h, es, onCerrar }: { h: Hoja; es: boolean; onCerrar: () => void }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const app = (typeof navigator === "undefined" ? null : leerRotulo(navigator.userAgent))?.app ?? "cliente";
  const t = TEXTOS[h.p]?.[app] ?? TEXTOS[h.p]?.cliente;
  const frase = t ? (es ? t.es : t.en) : "";
  const enApp = esApp();
  return (
    <div data-pantalla="APP-PERMISO" style={{ position: "fixed", inset: 0, zIndex: 90 }}>
      <div onClick={() => { onCerrar(); h.no(); }} style={{ position: "absolute", inset: 0, background: "rgba(11,14,18,.5)" }} />
      <div role="dialog" aria-modal="true" aria-labelledby="hoja-permiso-t" style={{ position: "absolute", left: 0, right: 0, bottom: 0, maxWidth: 560, margin: "0 auto", borderRadius: "24px 24px 0 0",
        padding: "14px 20px calc(22px + env(safe-area-inset-bottom))", background: "var(--tl-white)", boxSizing: "border-box", color: "var(--tl-ink)" }}>
        <div style={{ width: 38, height: 4, borderRadius: 9, background: "rgba(11,14,18,.15)", margin: "0 auto 16px" }} />
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <span style={{ width: 44, height: 44, borderRadius: 14, background: "var(--tl-action-tint)", display: "grid", placeItems: "center", flex: "none" }}><Icon name={ICONO[h.p]} size={22} color="var(--tl-action)" /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div id="hoja-permiso-t" style={{ font: "800 20px/1.2 Sora,sans-serif", letterSpacing: "-.03em", textWrap: "pretty" }}>
              {h.negado ? (h.p === "avisos" ? E2("Los avisos están apagados para To'Latino", "Notifications are off for To'Latino") : E2(`${TITULO[h.p].es} está apagada para esta app`, `${TITULO[h.p].en} is off for this app`)) : es ? TITULO[h.p].es : TITULO[h.p].en}
            </div>
            <div style={{ marginTop: 6, font: "500 13.5px/1.5 Manrope,sans-serif", color: "rgba(11,14,18,.68)", textWrap: "pretty" }}>
              {h.negado ? (enApp ? E2("Para usarlos, enciéndelos en los Ajustes del teléfono, en esta app.", "To use them, turn them on in your phone Settings, under this app.")
                : E2("Para usarlos, permítelos en la configuración de este sitio en tu navegador.", "To use them, allow them in this site's settings in your browser.")) : frase}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex" }}><Button variant="primary" block onClick={() => { onCerrar(); if (h.negado) { if (enApp) void abrirAjustes(); h.no(); } else h.seguir(); }}>{h.negado ? (enApp ? E2("Abrir Ajustes", "Open Settings") : E2("Entendido", "Got it")) : E2("Continuar", "Continue")}</Button></div>
          {h.negado && !enApp ? null : <div style={{ display: "flex" }}><Button variant="secondary" block onClick={() => { void anotarPermiso(h.p, "ahora_no"); onCerrar(); h.no(); }}>{E2("Ahora no", "Not now")}</Button></div>}
        </div>
      </div>
    </div>);
}

/* El momento útil: `conPermiso(p, usar, no)` corre `usar` (que es lo que hace que el sistema pregunte) o `no` si la persona no quiere ahora.
   En la web, siempre `usar` directo. En la app: concedido → `usar`; negado → la hoja con «Abrir Ajustes»; sin preguntar todavía → la hoja
   previa una vez y, con «Continuar», `usar`. */
export function usePermiso(es: boolean): { hoja: ReactNode; conPermiso: (p: Permiso, usar: () => void, no?: () => void) => Promise<void> } {
  const [h, setH] = useState<Hoja | null>(null);
  const conPermiso = useCallback(async (p: Permiso, usar: () => void, no?: () => void) => {
    if (!esApp()) { usar(); return; }
    const e = await estadoPermiso(p);
    if (e === "concedido" || (e === "preguntar" && hojaVista(p))) { usar(); return; }
    void anotarPermiso(p, e === "negado" ? "negado" : "pedido");
    setH({ p, negado: e === "negado", seguir: () => { marcarHoja(p); void anotarPermiso(p, "continuar"); usar(); }, no: () => no?.() });
  }, []);
  return { hoja: h ? <HojaPermiso h={h} es={es} onCerrar={() => setH(null)} /> : null, conPermiso };
}

/* 8c · Los avisos en el momento útil (fase8-apps.md §4 8c «Pantallas»): el primer pedido, la primera cita, el primer boleto; en Negocios al abrir
   el panel; el Repartidor al ponerse en línea; la Puerta al aceptar una puerta. NUNCA al abrir la app por primera vez. En las cáscaras y en la
   web instalada (no en una pestaña del navegador): la hoja previa una sola vez por teléfono (con «Ahora no» no vuelve; se encienden cuando quieran en Mi cuenta › Avisos) y, con
   «Continuar», la pregunta del sistema (en el mismo toque: Safari lo exige). Sin Web Push posible (HTTP, navegador sin Push) no sale nada. Si
   ya estaban encendidos, solo refresca el registro (el token rota). */
const instalada = () => { try { return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true; } catch { return false; } };
export function useAvisos(es: boolean): { hoja: ReactNode; ofrecer: () => Promise<void> } {
  const [h, setH] = useState<Hoja | null>(null);
  const ofrecer = useCallback(async () => {
    // Solo donde el push es la forma de enterarse: dentro de una de las cuatro apps o en la web INSTALADA (la pantalla de inicio del iPhone: allí
    // Web Push es el único camino). En una pestaña del navegador no se interrumpe: se encienden en Mi cuenta › Avisos o en Panel › Tus apps.
    if (!esApp() && !instalada()) return;
    const e = await estadoAvisos();
    if (e === "concedido") { void refrescarAvisos(); return; }
    if (e !== "preguntar" || hojaVista("avisos")) return;
    void prepararAvisos();
    void anotarPermiso("avisos", "pedido");
    setH({ p: "avisos", negado: false, seguir: () => { marcarHoja("avisos"); void anotarPermiso("avisos", "continuar"); void activarAvisos(); }, no: () => marcarHoja("avisos") });
  }, []);
  return { hoja: h ? <HojaPermiso h={h} es={es} onCerrar={() => setH(null)} /> : null, ofrecer };
}
/* Montada en la pantalla del momento útil (la del pedido, la cita, el boleto, el panel): ofrece una vez al aparecer. */
export function MomentoAvisos({ es }: { es: boolean }) {
  const { hoja, ofrecer } = useAvisos(es);
  useEffect(() => { const t = setTimeout(() => { void ofrecer(); }, 1200); return () => clearTimeout(t); }, [ofrecer]);
  return <>{hoja}</>;
}
