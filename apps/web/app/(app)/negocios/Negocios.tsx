"use client";
/* APP-NEG-HOME (prototipo «APP-NEG-HOME · móvil» y «· desktop»), compuesto con el sistema de diseño. 5e: Hoy en el barrio (StoryCard en
   carrusel) y «Recomendados por vecinos» (InfoCard con el puesto, el negocio y cuántos vecinos lo recomiendan; en escritorio, en el riel). */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useRef, type ComponentType } from "react";
import type { Cat } from "@/lib/directorio";
import type { Tarjeta } from "@/lib/tarjeta";
import { TarjetaNegocio } from "../TarjetaNegocio";
import { HoyCarrusel } from "../HoyCarrusel";
import type { Historia } from "@/lib/hoy-comun";
import type { Recomendado } from "@/lib/comunidad-portada";

type N = "Chip" | "Icon" | "SectionHeader" | "IconButton" | "InfoCard" | "Button" | "Tag";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Chip, Icon, SectionHeader, IconButton, InfoCard, Button, Tag } = UI as unknown as Record<N, ComponentType<any>>;

type Textos = { cats: string; dest: string; nuevos: string; hoy: string; llamar: string; forBiz: string; publishTitle: string; publishBody: string; publishCta: string };

export function Negocios({ titulo, sub, intenciones, cats, destacados, nuevos, t, es, hoy, recs }: {
  titulo: string; sub: string; intenciones: { l: string; icon: string; href: string }[];
  cats: (Cat & { n: number; linea: string })[]; destacados: Tarjeta[]; nuevos: Tarjeta[]; t: Textos; es: boolean; hoy: Historia[]; recs: Recomendado[];
}) {
  const router = useRouter();
  const E2 = (a: string, b: string) => (es ? a : b);
  const recomendados = recs.length === 0 ? null : (
    <div data-screen-label="APP-NEG-HOME · Recomendados por vecinos" className="grid">
      <InfoCard label={E2("RECOMENDADOS POR VECINOS", "RECOMMENDED BY NEIGHBORS")} padding="16px 16px 8px">
        <div className="flex flex-col">
          {recs.map((x, i) => (
            <button key={x.id} type="button" onClick={() => router.push(`/n/${x.id}`)} className="flex items-center gap-3 border-t border-ink/[.07] py-[11px] text-left">
              <span className="w-[22px] flex-none font-mono text-[13px] font-extrabold text-ink/30">{i + 1}</span>
              <span className="min-w-0 flex-1"><span className="flex items-center gap-1.5"><span className="block truncate text-[13.5px] font-bold text-ink">{x.nombre}</span>{x.destacada && <Tag tone="action">{E2("DESTACADA", "FEATURED")}</Tag>}</span>
                <span className="mt-[3px] block font-mono text-[10px] font-semibold tracking-[0.04em] text-ink/50">{`${x.rating && x.resenas ? `★ ${x.rating.toFixed(1)} · ` : ""}${x.vecinos} ${x.vecinos === 1 ? E2("VECINO LO RECOMIENDA", "NEIGHBOR RECOMMENDS") : E2("VECINOS LO RECOMIENDAN", "NEIGHBORS RECOMMEND")}`}</span></span>
              <span className="grid text-ink/30"><Icon name="chevronRight" size={16} strokeWidth={2} /></span>
            </button>
          ))}
        </div>
        <div className="border-t border-ink/[.07] pb-2 pt-2.5 text-[11.5px] font-semibold leading-[1.5] text-ink/50">{E2("Aquí nada se compra: el orden lo ponen los votos de los vecinos.", "Nothing here is bought: neighbors’ votes set the order.")}</div>
      </InfoCard>
    </div>
  );
  const publica = (
    <InfoCard label={t.forBiz}>
      <div className="font-display text-[18px] font-extrabold leading-[1.2] tracking-[-0.03em] text-ink">{t.publishTitle}</div>
      <div className="mt-2 text-pretty text-[13px] leading-[1.6] text-ink/75">{t.publishBody}</div>
      <div className="mt-3.5 flex"><Button variant="action" block onClick={() => router.push("/publica")}>{t.publishCta}</Button></div>
    </InfoCard>
  );
  return (
    <div data-pantalla="APP-NEG-HOME" className="mx-auto w-full max-w-[1440px] pb-[110px] lg:pb-12">
      {/* Encabezado + accesos */}
      <div className="flex flex-col gap-[26px] px-5 pt-[18px] lg:gap-4 lg:border-b lg:border-line lg:bg-white lg:px-[30px] lg:pb-[22px] lg:pt-7">
        <div className="lg:flex lg:flex-wrap lg:items-baseline lg:gap-4">
          <h1 className="font-display text-[26px] font-extrabold leading-[1.05] tracking-[-0.04em] lg:text-[32px]">{titulo}</h1>
          <div className="mt-[7px] font-mono text-[11px] font-semibold tracking-[0.06em] text-ink/50 lg:mt-0">{sub}</div>
        </div>
        <div className="hs -mx-5 flex gap-2 overflow-x-auto px-5 lg:-mx-[30px] lg:px-[30px]">
          {intenciones.map((c) => (
            <Chip key={c.l} onClick={() => router.push(c.href)}><Icon name={c.icon} size={15} color="var(--tl-open)" />{c.l}</Chip>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-[26px] px-5 pt-[26px] lg:gap-[34px] lg:px-[30px]">
        {/* Las 17 categorías */}
        <section className="flex flex-col gap-3">
          <SectionHeader title={t.cats} />
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-[repeat(auto-fill,minmax(250px,1fr))] lg:gap-3">
            {cats.map((c) => (
              <button key={c.id} type="button" onClick={() => router.push(`/c/${c.slug}`)}
                className="flex min-w-0 flex-col gap-2.5 rounded-[17px] border border-line bg-white p-3.5 text-left hover:border-ink/20">
                <span className="flex items-center justify-between">
                  <span className="grid size-[38px] flex-none place-items-center rounded-xl bg-open/15 text-open"><Icon name={c.icon} size={19} /></span>
                  {c.n > 0 && <span className="font-mono text-[10px] font-semibold tracking-[0.06em] text-ink/45">{c.n}</span>}
                </span>
                <span className="text-[13.5px] font-bold leading-[1.25] text-ink">{c.name}</span>
                <span className="text-pretty text-[11.5px] font-medium leading-[1.45] text-ink/55">{c.linea}</span>
              </button>
            ))}
          </div>
        </section>

        <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start xl:gap-[30px]">
          <div className="flex min-w-0 flex-col gap-[26px] lg:gap-[34px]">
            {destacados.length > 0 && <Fila titulo={t.dest} items={destacados} t={t} />}
            {hoy.length > 0 && (
              <div className="-mx-5 lg:mx-0">
              <HoyCarrusel es={es} historias={hoy} titulo={E2("Hoy en el barrio", "Today nearby")} verTodo="/comunidad/hoy" escritorio />
              </div>
            )}
            {recomendados && <div className="xl:hidden">{recomendados}</div>}
            {nuevos.length > 0 && <Fila titulo={t.nuevos} items={nuevos} t={t} />}
            <div className="xl:hidden lg:grid lg:grid-cols-[repeat(auto-fill,minmax(300px,1fr))] lg:gap-3.5">
              <div className="grid">{publica}</div>
            </div>
          </div>
          <aside className="hidden xl:block">
            <div className="sticky top-[88px] flex flex-col gap-4">{recomendados}{publica}</div>
          </aside>
        </div>
      </div>
    </div>
  );
}

/* Fila horizontal de tarjetas; en escritorio con flechas junto al título (prototipo car.featPrev/Next). */
function Fila({ titulo, items, t }: { titulo: string; items: Tarjeta[]; t: Textos }) {
  const ref = useRef<HTMLDivElement>(null);
  const mover = (d: number) => ref.current?.scrollBy({ left: d * ref.current.clientWidth * 0.8, behavior: "smooth" });
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="grid min-w-0 flex-1"><SectionHeader title={titulo} /></div>
        <span className="hidden gap-2 lg:flex">
          <IconButton icon="chevronLeft" size={36} onClick={() => mover(-1)} />
          <IconButton icon="chevronRight" size={36} onClick={() => mover(1)} />
        </span>
      </div>
      <div ref={ref} className="hs -mx-5 -mb-3.5 flex snap-x snap-mandatory items-start gap-3 overflow-x-auto px-5 pb-3.5 scroll-px-5 lg:mx-0 lg:gap-3.5 lg:px-0">
        {items.map((b) => (
          <div key={b.id} className="grid w-[300px] flex-none snap-start lg:w-[320px]">
            <TarjetaNegocio b={b} origen="negocios" textos={{ hoy: t.hoy, llamar: t.llamar }} />
          </div>
        ))}
      </div>
    </section>
  );
}
