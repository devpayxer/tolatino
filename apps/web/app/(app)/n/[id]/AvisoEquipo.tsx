"use client";
/* 9n · El aviso de «Ver como cliente» de un negocio que no está activo (solo el equipo; page.tsx decide y audita). La misma InfoCard del aviso del
   Inicio (Anuncios), sin piezas nuevas. */
import * as UI from "@tolatino/ui";
import type { ComponentType } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { InfoCard } = UI as unknown as Record<"InfoCard", ComponentType<any>>;
const EST: Record<string, [string, string]> = { hidden: ["OCULTO", "HIDDEN"], suspended: ["SUSPENDIDO", "SUSPENDED"], draft: ["BORRADOR", "DRAFT"],
  closed: ["CERRADO", "CLOSED"], temp_closed: ["CERRADO POR UN TIEMPO", "TEMPORARILY CLOSED"] };

export function AvisoEquipo({ es, estado }: { es: boolean; estado: string }) {
  const e = EST[estado] ?? [estado.toUpperCase(), estado.toUpperCase()];
  return (
    <div data-vista-equipo={estado} className="mx-auto w-full max-w-[1200px] px-4 pt-3">
      <InfoCard label={`${es ? "VISTA DEL EQUIPO" : "TEAM VIEW"} · ${es ? e[0] : e[1]}`}>
        <div className="text-pretty text-[13.5px] leading-[1.5] text-ink">{es
          ? "Este negocio no está activo: nadie más ve esta página. La ves porque eres del equipo y quedó en la auditoría. No hagas pedidos ni reservas desde aquí."
          : "This business is not active: nobody else sees this page. You see it because you are on the team, and it was logged. Do not place orders or bookings from here."}</div>
      </InfoCard>
    </div>
  );
}
