"use client";
/* Ficha · Tienda (diseño neg-hogar-book.js › V.shop y la pestaña «Ficha · tienda» del prototipo): la nota de cómo se
   aparta, y la cuadrícula de artículos con foto, la etiqueta RENTA, el precio por día, cuántos quedan y «Apartar».
   Por ahora lo que se renta; lo que se vende llega con el apartado de Tiendas. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import type { ComponentType } from "react";
import type { ArticuloRenta } from "@/lib/rentas";

type N = "Button" | "Tag";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Button, Tag } = UI as unknown as Record<N, ComponentType<any>>;
const dinero = (c: number) => `$${(c / 100).toFixed(2).replace(/\.00$/, "")}`;

export function TiendaTab({ L, negocio, es }: { L: ArticuloRenta[]; negocio: string; es: boolean }) {
  const E2 = (a: string, b: string) => (es ? a : b), router = useRouter(), nm = (b: { es: string; en: string }) => (es ? b.es : b.en || b.es);
  return (
    <div data-screen-label="Ficha · tienda" className="flex flex-col gap-4 px-5 pb-6 pt-5 lg:px-0 lg:pt-8">
      <div className="text-pretty text-[12.5px] font-medium leading-[1.5] text-ink/60">{E2("Apartas en la app y pagas al recoger en el local; te lo guardan 48 horas. Herramienta: pagas el día y dejas un depósito que se devuelve al traerla.", "Hold it in the app and pay at pickup; kept for 48 hours. Tools: pay the day and leave a deposit, returned when you bring it back.")}</div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-4 lg:grid-cols-4 lg:gap-x-5">
        {L.map((x) => { const pocos = x.quedan <= 3, agotado = x.quedan < 1; return (
          <div key={x.id} className="flex min-w-0 flex-col gap-2">
            <div className="aspect-square rounded-[14px] bg-photo-bg" style={x.foto ? { backgroundImage: `url(${x.foto})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined} role="img" aria-label={nm(x.n)} />
            <div className="min-w-0">
              <div className="mb-[5px] flex"><Tag tone="signal">{E2("RENTA", "RENTAL")}</Tag></div>
              <div className="text-[13.5px] font-bold leading-[1.3]">{nm(x.n)}</div>
              {nm(x.d) && <div className="mt-0.5 text-[11.5px] font-medium leading-[1.4] text-ink/55">{nm(x.d)}</div>}
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-display text-[15px] font-extrabold leading-none tracking-[-0.02em]">{`${dinero(x.precio)}${E2("/día", "/day")}`}</span>
              <span className="text-right font-mono text-[9.5px] font-bold leading-[1.2] tracking-[0.08em]" style={{ color: pocos ? "var(--tl-pro-ink)" : "var(--tl-open-text)" }}>{agotado ? E2("RENTADAS HOY", "ALL OUT") : pocos ? `${E2("QUEDAN ", "ONLY ")}${x.quedan}${E2(" PARA RENTAR", " TO RENT")}` : E2("EN EXISTENCIA", "IN STOCK")}</span>
            </div>
            <div className="grid"><Button variant="secondary" size="sm" block disabled={agotado} onClick={() => router.push(`/n/${negocio}/rentar?a=${x.id}`)}>{E2("Apartar", "Hold")}</Button></div>
          </div>); })}
      </div>
    </div>
  );
}
