"use client";
/* 9m · El mini mapa propio (L42, L61, L81): RadiusMap del sistema con las teselas propias, el negocio en el centro (o su zona punteada si trabaja desde
   casa: nunca la dirección exacta) y, al tocarlo, «Cómo llegar» abre el mapa del teléfono (lib/como-llegar.ts). Lo usan la ficha y el Inicio. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import type { ComponentType } from "react";
import { punto, teselas, type LL } from "@/lib/mapa-geo";
import { tec } from "@/lib/tec";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { RadiusMap } = UI as unknown as Record<"RadiusMap", ComponentType<any>>;
const W = 720, H = 220;

export function MiniMapa({ centro, z = 16, zona = false, etiqueta, lugar, pie, puntos = [], al, href, desk = false }: {
  centro: LL; z?: number; zona?: boolean; etiqueta: string; lugar?: string; pie?: string; puntos?: { ll: LL; pro?: boolean }[]; al?: () => void; href?: string; desk?: boolean;
}) {
  const router = useRouter();
  const tiles = teselas(centro, z, W, H, 1).map(({ src, left, top }) => ({ src, left: Math.round(left), top: Math.round(top) }));
  const dots = puntos.map((p) => { const q = punto(centro, p.ll, z, 1); return { x: Math.round(q.left), y: Math.round(q.top), color: p.pro ? "var(--tl-ink)" : "var(--tl-action)" }; })
    .filter((d) => Math.abs(d.x) < W / 2 && Math.abs(d.y) < H / 2);
  const tocar = al ?? (href ? () => router.push(href) : undefined);
  return (
    <div data-pieza="mini-mapa" role={tocar ? "link" : undefined} aria-label={etiqueta} onClick={tocar} {...tec(tocar)} style={{ cursor: tocar ? "pointer" : "default" }}>
      <RadiusMap desk={desk} label={etiqueta} tiles={tiles} dots={dots} circle={zona ? 120 : 0} place={lugar} towns={pie} />
    </div>
  );
}
