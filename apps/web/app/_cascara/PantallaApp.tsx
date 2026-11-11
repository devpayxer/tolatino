"use client";
/* 8a · Las pantallas completas de la cáscara (fase8-apps.md §1b #3–#4 y §5: «pantalla completa, logo, una frase, un botón»): «Actualiza la
   app», «Esta app está en pausa», «Esto se abre en …» y «Sin señal». Huecos del diseño: compuestas con piezas del sistema (Wordmark, el
   rótulo mono de las islas sin señal, el título Sora de las pantallas de estado, Icon y Button) y anotadas en REVISION con captura. */
import * as UI from "@tolatino/ui";
import { Wordmark } from "@tolatino/ui";
import type { ComponentType, ReactNode } from "react";

type N = "Icon" | "Button";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button } = UI as unknown as Record<N, ComponentType<any>>;
type Boton = { l: string; onClick: () => void; icon?: string };

export function PantallaApp({ id, eye, icono, titulo, texto, boton, boton2, children }: {
  id: string; eye: string; icono: string; titulo: string; texto: string; boton?: Boton; boton2?: Boton; children?: ReactNode;
}) {
  return (
    <div data-pantalla={id} style={{ minHeight: "100dvh", background: "var(--tl-paper)", color: "var(--tl-ink)", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, width: "100%", maxWidth: 460, margin: "0 auto", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 18,
        padding: "calc(28px + env(safe-area-inset-top)) 20px calc(24px + env(safe-area-inset-bottom))" }}>
        <div><Wordmark size={24} /></div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 14 }}>
          <span style={{ width: 56, height: 56, borderRadius: 18, background: "var(--tl-white)", border: "1px solid rgba(11,14,18,.08)", display: "grid", placeItems: "center" }}><Icon name={icono} size={26} /></span>
          <div role="status" style={{ alignSelf: "flex-start", padding: "6px 12px", borderRadius: 99, background: "var(--tl-ink)", color: "var(--tl-white)", font: "700 10.5px 'JetBrains Mono',monospace", letterSpacing: ".12em" }}>{eye}</div>
          <h1 style={{ margin: 0, font: "800 28px/1.1 Sora,sans-serif", letterSpacing: "-.04em", textWrap: "balance" }}>{titulo}</h1>
          <p style={{ margin: 0, font: "500 15px/1.55 Manrope,sans-serif", color: "rgba(11,14,18,.7)", textWrap: "pretty" }}>{texto}</p>
          {children}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {boton ? <div style={{ display: "flex" }}><Button variant="primary" block icon={boton.icon} onClick={boton.onClick}>{boton.l}</Button></div> : null}
          {boton2 ? <div style={{ display: "flex" }}><Button variant="secondary" block icon={boton2.icon} onClick={boton2.onClick}>{boton2.l}</Button></div> : null}
        </div>
      </div>
    </div>);
}
