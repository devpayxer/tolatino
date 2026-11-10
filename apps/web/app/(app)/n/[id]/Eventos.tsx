"use client";
/* Ficha › Eventos (prototipo «Ficha · eventos»; MEM 1360: la pestaña solo replica). Las fechas vivas del negocio con la misma tarjeta del
   sistema (EventCard); cada una abre la ficha del evento. Solo en Pro y solo si hay eventos vivos (lo decide el servidor). */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import type { ComponentType } from "react";
import { dinero } from "@/lib/evt-comun";
import type { TarjetaEvt } from "@/lib/evt-publico";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const EventCard = UI.EventCard as ComponentType<any>;

export function EventosTab({ eventos, es }: { eventos: TarjetaEvt[]; es: boolean }) {
  const router = useRouter(), E2 = (a: string, b: string) => (es ? a : b);
  const meta = (x: TarjetaEvt) => `${x.cuando} · ${x.free ? E2("GRATIS", "FREE") : x.desde != null ? `${E2("DESDE ", "FROM ")}${dinero(x.desde)}` : E2("CON BOLETOS", "TICKETED")}`;
  return (
    <div data-screen-label="Ficha · eventos" className="flex flex-col gap-3 px-5 pb-6 pt-[18px] lg:max-w-[980px] lg:px-0 lg:pt-6">
      <div className="font-display text-[18px] font-extrabold leading-none tracking-[-0.03em] lg:text-[20px]">{E2("Próximos eventos", "Upcoming events")}</div>
      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[repeat(auto-fill,minmax(240px,1fr))] lg:gap-3.5">
        {eventos.map((x) => <div key={x.fecha} className="grid" data-evento={x.id}><EventCard title={x.title} meta={meta(x)} image={x.img} tag={x.tag?.t} width="100%" onClick={() => router.push(x.href)} /></div>)}
      </div>
    </div>
  );
}
