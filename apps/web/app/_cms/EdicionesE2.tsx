"use client";
/* 9f-3 · Lo editado de las pantallas en el navegador (lib/dos-idiomas.ts). El layout raíz lo lee en el servidor (edicionesE2, lib/cms.ts: SOLO lo editado
   y vivo, pocas filas) y lo pasa aquí; este componente lo pone ANTES de pintar a sus hijos, así el primer pintado y la hidratación de cada componente de
   cliente ven el mismo texto que salió del servidor (sin parpadeo, sin diferencias al hidratar). En el servidor no hace nada: allí el mapa lo mantiene
   lib/cms.ts. No pinta nada propio. */
import type { ReactNode } from "react";
import { ponerEdicionesE2, type EdicionE2 } from "@/lib/dos-idiomas";

export function EdicionesE2({ v, l, children }: { v: string; l: readonly EdicionE2[]; children: ReactNode }) {
  if (typeof window !== "undefined") ponerEdicionesE2(v, l);
  return <>{children}</>;
}
