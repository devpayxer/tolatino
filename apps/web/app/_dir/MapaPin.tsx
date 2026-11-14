"use client";
/* 9m · El pin ajustable («la puerta está aquí», decisión AC), compuesto con RadiusMap del sistema (2ag) y las teselas propias (/teselas,
   lib/mapa-geo.ts): el pin queda fijo en el centro y la persona MUEVE EL MAPA debajo hasta que el pin cae en su puerta (como Uber y DoorDash).
   Lo que sale es el punto del centro; el servidor lo acepta solo cerca de la dirección que ubicó (PIN_MAX_M). Sin terceros. Teclado: las flechas
   mueven el mapa de a poco (accesible sin arrastrar). Pieza nueva compuesta de piezas del sistema (REVISION 9m). */
import * as UI from "@tolatino/ui";
import { useEffect, useRef, useState, type ComponentType, type KeyboardEvent, type PointerEvent as PE } from "react";
import { millas, proyectar, teselas, type LL } from "@/lib/mapa-geo";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { RadiusMap } = UI as unknown as Record<"RadiusMap", ComponentType<any>>;
const Z = 18, W = 720, H = 260;
const desproyectar = (x: number, y: number, z: number): LL => { const n = Math.pow(2, z) * 256; return [(Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI, (x / n) * 360 - 180]; };
export const metrosEntre = (a: LL, b: LL) => Math.round(millas(a, b) * 1609.34);

export function MapaPin({ origen, pin, onPin, es, maxM = 250, desk = false, etiqueta }: {
  origen: LL; pin: LL | null; onPin: (p: LL | null) => void; es: boolean; maxM?: number; desk?: boolean; etiqueta?: string;
}) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const centro = pin ?? origen;
  const g = useRef<{ x: number; y: number; c: [number, number] } | null>(null);
  const [mov, setMov] = useState(false);
  useEffect(() => { g.current = null; }, [origen[0], origen[1]]);
  const tiles = teselas(centro, Z, W, H, 1).map(({ src, left, top }) => ({ src, left: Math.round(left), top: Math.round(top) }));
  // El punto que ubicó el servidor (la dirección), como referencia, si el pin se movió.
  const o = proyectar(origen, Z), c = proyectar(centro, Z);
  const dots = pin ? [{ x: Math.round(o[0] - c[0]), y: Math.round(o[1] - c[1]), color: "var(--tl-ink)" }] : [];
  const d = pin ? metrosEntre(origen, pin) : 0, lejos = d > maxM;
  const abajo = (e: PE<HTMLDivElement>) => { g.current = { x: e.clientX, y: e.clientY, c: proyectar(centro, Z) }; try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* sin captura */ } };
  const mover = (e: PE<HTMLDivElement>) => {
    const s = g.current; if (!s) return;
    const dx = e.clientX - s.x, dy = e.clientY - s.y;
    if (Math.abs(dx) + Math.abs(dy) < 3) return;
    setMov(true);
    onPin(desproyectar(s.c[0] - dx, s.c[1] - dy, Z));
  };
  const arriba = () => { g.current = null; setMov(false); };
  const flechas = (e: KeyboardEvent<HTMLDivElement>) => {
    const k = { ArrowLeft: [-8, 0], ArrowRight: [8, 0], ArrowUp: [0, -8], ArrowDown: [0, 8] }[e.key];
    if (!k) return;
    e.preventDefault();
    const p = proyectar(centro, Z);
    onPin(desproyectar(p[0] + k[0]!, p[1] + k[1]!, Z));
  };
  return (
    <div data-pieza="mapa-pin" data-pin={pin ? `${pin[0].toFixed(6)},${pin[1].toFixed(6)}` : ""} data-lejos={lejos ? "1" : "0"}>
      <div role="application" aria-label={E2("Mapa: mueve el mapa con las flechas hasta que el pin quede en tu puerta", "Map: move it with the arrow keys until the pin is at your door")}
        tabIndex={0} onKeyDown={flechas} onPointerDown={abajo} onPointerMove={mover} onPointerUp={arriba} onPointerCancel={arriba}
        style={{ touchAction: "none", cursor: mov ? "grabbing" : "grab", userSelect: "none", outlineOffset: 3 }}>
        <RadiusMap desk={desk} label={etiqueta ?? E2("LA PUERTA ESTÁ AQUÍ", "THE DOOR IS HERE")} radius={pin ? `${d} m` : undefined} tiles={tiles} dots={dots} circle={0}
          note={lejos ? E2(`Muy lejos de la dirección (${d} m). Acércalo a la puerta: hasta ${maxM} m.`, `Too far from the address (${d} m). Bring it to the door: up to ${maxM} m.`) : undefined}
          count={undefined}
          towns={pin ? E2("Movido por ti: el repartidor llega a este punto.", "Moved by you: the driver comes to this point.") : E2("Mueve el mapa hasta que el pin quede en tu puerta.", "Move the map until the pin is at your door.")} />
      </div>
      {pin ? (
        <button type="button" onClick={() => onPin(null)} style={{ marginTop: 8, background: "none", border: 0, padding: "6px 0", font: "700 12.5px Manrope,sans-serif", color: "var(--tl-action)", cursor: "pointer" }}>
          {E2("Volver al punto de la dirección", "Back to the address point")}
        </button>
      ) : null}
    </div>
  );
}
