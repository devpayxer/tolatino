"use client";
/* 9n-23 · «Panel del dueño» desde el Super Admin: el aviso fijo arriba de la vista del equipo (solo lectura). La misma InfoCard del aviso «VISTA DEL
   EQUIPO» de la ficha (app/(app)/n/[id]/AvisoEquipo.tsx), sin piezas nuevas. Lo decide el servidor (d.soloVer, lib/panel.ts accesoPanelSoloLectura). */
import * as UI from "@tolatino/ui";
import type { ComponentType } from "react";
import { dosIdiomas } from "@/lib/dos-idiomas";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { InfoCard } = UI as unknown as Record<"InfoCard", ComponentType<any>>;

export function AvisoSoloLectura({ es, negocio }: { es: boolean; negocio: string }) {
  const E2 = (a: string, b: string) => dosIdiomas(es, a, b);
  return (
    <InfoCard label={E2("VISTA DEL EQUIPO · SOLO LECTURA", "TEAM VIEW · READ ONLY")} labelColor="var(--tl-pro-ink)" padding="11px 14px">
      <div data-vista-equipo="panel" className="text-pretty text-[13px] leading-[1.45] text-ink">{E2(
        `Ves el panel de ${negocio} como lo ve su dueño. Nada se guarda desde aquí y cada sección que abres queda en la auditoría. Lo privado y cifrado (salud, trámites, niños, la dirección de una casa) no se muestra.`,
        `You see ${negocio}’s dashboard as its owner does. Nothing is saved from here, and every section you open is logged. Private, encrypted details (health, legal matters, children, a home address) are not shown.`)}</div>
    </InfoCard>
  );
}
