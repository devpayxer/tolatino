"use client";
/* APP-HOME (prototipo «APP-HOME · móvil» y «· desktop»). Composición 1:1 con el sistema de diseño.
   Secciones que dependen de módulos aún no construidos (Esta semana) solo aparecen cuando tienen contenido real: nada de ejemplo
   inventado en pantalla. 5e: Hoy en el barrio (StoryCard en carrusel, de Novedades < 24 h; sin avisos no sale) y Comunidad (lo que
   la cuenta oficial de la ciudad tiene arriba, con sus cifras reales, y la entrada a la Comunidad; nunca nada de un vecino). */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import type { ComponentType } from "react";
import type { Cat, Fila } from "@/lib/directorio";
import type { Historia } from "@/lib/hoy-comun";
import type { OficialPortada } from "@/lib/comunidad-portada";
import { hace } from "@/lib/comunidad-comun";
import { HoyCarrusel } from "./HoyCarrusel";
import type { TarjetaEvt } from "@/lib/evt-publico";
import { dinero } from "@/lib/evt-comun";
import type { Anuncio, BloqueHome } from "@/lib/cms-home";

type N = "ModuleTile" | "SectionHeader" | "BusinessRow" | "InfoCard" | "Button" | "Eyebrow" | "Icon" | "FeedPost" | "EventCard";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { ModuleTile, SectionHeader, BusinessRow, InfoCard, Button, Eyebrow, Icon, FeedPost, EventCard } = UI as unknown as Record<N, ComponentType<any>>;

type Textos = { allCats: string; catsTitle: string; openNow: string; seeAll: string; forBiz: string; publishTitle: string; publishBody: string; publishCta: string };

export function Inicio({ h, bloques, aviso = null, anuncios = [], semana = [], cats, inicio, abierto, t, es, hoy, oficial, conSesion, lugar }: {
  h: Record<string, string>; bloques: { key: BloqueHome; on: boolean }[]; aviso?: string | null; anuncios?: Anuncio[]; semana?: TarjetaEvt[]; cats: Cat[]; inicio: string[]; abierto: Fila[]; t: Textos; es: boolean; hoy: Historia[]; oficial: OficialPortada | null; conSesion: boolean; lugar: string;
}) {
  const router = useRouter();
  const bloqueOn = (k: BloqueHome) => bloques.find((b) => b.key === k)?.on !== false;
  const orden = bloques.map((b) => b.key);
  const lugarDe = (k: BloqueHome) => orden.indexOf(k);
  const deCasa = inicio.map((id) => cats.find((c) => c.id === id)).filter((c): c is Cat => !!c);
  const irCat = (c: Cat) => () => router.push(`/c/${c.slug}`);
  return (
    <div data-pantalla="APP-HOME" className="mx-auto w-full max-w-[1440px] lg:px-6 lg:pt-6">
      <div className={`lg:grid lg:gap-8 ${bloqueOn("categorias") ? (bloqueOn("publica") ? "lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)_320px]" : "lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)]")
        : bloqueOn("publica") ? "lg:grid-cols-[minmax(0,1fr)] xl:grid-cols-[minmax(0,1fr)_320px]" : "lg:grid-cols-[minmax(0,1fr)]"}`}>
        {/* Escritorio: columna de categorías (prototipo deskCols: 220 → 240 desde 1200) */}
        {bloqueOn("categorias") && <aside data-bloque="categorias" className="hidden lg:flex lg:flex-col lg:gap-3">
          <Eyebrow>{t.catsTitle}</Eyebrow>
          <nav className="flex flex-col gap-0.5">
            {cats.map((c) => (
              <button key={c.id} type="button" onClick={irCat(c)}
                className="flex h-10 items-center gap-2.5 rounded-sm px-2.5 text-left text-[13.5px] font-semibold text-ink hover:bg-action-tint">
                <Icon name={c.icon} size={18} />
                <span className="truncate">{c.name}</span>
              </button>
            ))}
          </nav>
        </aside>}

        <main className="flex min-w-0 flex-col gap-[26px] lg:gap-[30px]">
          {/* 9f · Anuncios de la ciudad (announcements: dentro de sus fechas) y el aviso fijo del Inicio (city_home_config): arriba de todo. InfoCard, la pieza más cercana
              del sistema (REVISION 9f). */}
          {(anuncios.length > 0 || aviso) && (
            <div className="flex flex-col gap-2.5 px-5 pt-[18px] lg:px-0 lg:pt-0" style={{ order: -1 }}>
              {anuncios.map((a) => (<div key={a.id} data-anuncio={a.id}><InfoCard label={h.anuncioK}><div className="text-pretty text-[13.5px] font-semibold leading-[1.5] text-ink">{a.text}</div></InfoCard></div>))}
              {aviso && (<div data-aviso-ciudad><InfoCard label={h.avisoCiudadK}><div className="text-pretty text-[13.5px] leading-[1.5] text-ink">{aviso}</div></InfoCard></div>)}
            </div>
          )}
          {/* Móvil: 7 categorías + Todas (17) en mosaico de 4 */}
          {bloqueOn("categorias") && <div data-bloque="categorias-movil" className="grid grid-cols-4 gap-2.5 px-5 pt-[18px] lg:hidden" style={{ order: 0 }}>
            {deCasa.map((c) => (
              <ModuleTile key={c.id} label={c.label} icon={c.icon} hue="var(--tl-open)" tint="rgba(0,168,143,.14)" onClick={irCat(c)} />
            ))}
            <ModuleTile dark icon="grid" label={t.allCats} onClick={() => router.push("/negocios")} />
          </div>}

          {/* Hoy en el barrio: swipe en el teléfono, flechas en escritorio (prototipo homeToday). */}
          {bloqueOn("hoy") && hoy.length > 0 && (
            <div data-bloque="hoy" style={{ order: lugarDe("hoy") + 1 }}>
              <HoyCarrusel es={es} historias={hoy} titulo={h.hoy ?? ""} verTodo="/comunidad/hoy" escritorio />
            </div>
          )}

          {bloqueOn("abierto") && abierto.length > 0 && (
            <section data-bloque="abierto" style={{ order: lugarDe("abierto") + 1 }} className="flex flex-col gap-3 px-5 lg:px-0">
              <SectionHeader title={t.openNow} dot="var(--tl-open)" action={t.seeAll} onAction={() => router.push("/abierto")} />
              <div className="flex flex-col gap-2.5 lg:grid lg:gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))" }}>
                {abierto.map((o, i) => (
                  <div key={o.id} className={i >= 3 ? "hidden lg:grid" : "grid"}>
                    <BusinessRow name={o.name} meta={o.meta} verified={o.verified} slot={o.slot} image={o.image} onClick={() => router.push(`/n/${o.id}`)} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 6b · Esta semana (prototipo APP-HOME «Esta semana»): EventCard oscura para fiesta o show, con el día y la hora; abre la ficha
              del evento. Solo con eventos vivos en el radio. */}
          {bloqueOn("semana") && semana.length > 0 && (
            <section data-screen-label="APP-HOME · Esta semana" data-bloque="semana" style={{ order: lugarDe("semana") + 1 }} className="flex flex-col gap-3">
              <div className="px-5 lg:px-0"><SectionHeader title={h.semana} dot="var(--tl-mod-events)" action={t.seeAll} onAction={() => router.push("/eventos")} /></div>
              <div className="hs flex gap-3 overflow-x-auto px-5 lg:grid lg:px-0" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
                {semana.map((x) => (
                  <div key={x.fecha} data-evento={x.id} className="flex flex-none lg:grid">
                    <div className="lg:hidden"><EventCard dark={x.dark} tag={x.cuando} title={x.title} meta={`${x.free ? h.gratis : x.desde != null ? `${h.desde} ${dinero(x.desde)}` : h.conBoletos}${x.edad ? ` · ${x.edad}+` : ""}`} image={x.img} onClick={() => router.push(x.href)} /></div>
                    <div className="hidden lg:grid"><EventCard dark={x.dark} width={null} tag={x.cuando} title={x.title} meta={`${x.free ? h.gratis : x.desde != null ? `${h.desde} ${dinero(x.desde)}` : h.conBoletos}${x.edad ? ` · ${x.edad}+` : ""}`} image={x.img} onClick={() => router.push(x.href)} /></div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Comunidad: la pregunta o encuesta de la cuenta oficial de la ciudad (prototipo: FeedPost «To'Latino Hazleton · PREGUNTÓ») y la
              entrada. Las cifras son las reales; el texto de los vecinos nunca sale aquí. */}
          {bloqueOn("comunidad") && <section data-screen-label="APP-HOME · Comunidad" data-bloque="comunidad" style={{ order: lugarDe("comunidad") + 1 }} className="flex flex-col gap-3 px-5 lg:px-0">
            <SectionHeader title={h.comunidad} />
            <div className="overflow-hidden rounded-[17px] border border-line bg-white">
              {oficial && (
                <FeedPost author={es ? oficial.nombre.es : oficial.nombre.en} avatar={<img src={oficial.foto} alt="" width={40} height={40} style={{ width: 40, height: 40, borderRadius: 99, flex: "none", display: "block" }} />}
                  action={oficial.kind === "pregunta" ? h.pregunto : oficial.kind === "encuesta" ? h.encuesta : h.aviso}
                  time={hace(oficial.at, es).toUpperCase()} place={lugar} body={oficial.body} stats={[{ icon: "chat", value: oficial.cms }, { icon: "like", value: oficial.up }]} />
              )}
              <div className={`flex flex-col gap-2.5 px-5 pb-[18px] lg:flex-row lg:items-center lg:gap-4 ${oficial ? "" : "pt-[18px]"}`}>
                <div className="flex-1 text-pretty text-[12.5px] font-medium leading-[1.5] text-ink/60">{h.comunidadSub}</div>
                <div className="flex"><Button block size="md" onClick={() => router.push(conSesion ? (oficial ? `/comunidad/p/${oficial.id}` : "/comunidad") : `/entrar?volver=${encodeURIComponent("/comunidad")}`)}>{conSesion ? h.irComunidad : h.entrar}</Button></div>
              </div>
            </div>
          </section>}

          {/* Por debajo de 1200 la tarjeta va plegada en la columna central (prototipo showFolded) */}
          {bloqueOn("publica") && <section data-bloque="publica" style={{ order: 99 }} className="px-5 pb-4 lg:px-0 xl:hidden">
            <Publica t={t} onClick={() => router.push("/publica")} />
          </section>}
        </main>

        {/* Desde 1200: columna derecha fija (prototipo showRail) */}
        {bloqueOn("publica") && <aside className="hidden xl:block">
          <div className="sticky top-[88px]">
            <Publica t={t} block onClick={() => router.push("/publica")} />
          </div>
        </aside>}
      </div>
    </div>
  );
}

function Publica({ t, block, onClick }: { t: Textos; block?: boolean; onClick: () => void }) {
  return (
    <InfoCard label={t.forBiz}>
      <div className="font-display text-[19px] font-extrabold leading-[1.2] tracking-[-0.03em] text-ink">{t.publishTitle}</div>
      <div className="mt-2 text-pretty text-[13.5px] leading-[1.6] text-text-2">{t.publishBody}</div>
      <div className="mt-3.5 flex">
        <Button variant="action" block={block} onClick={onClick}>{t.publishCta}</Button>
      </div>
    </InfoCard>
  );
}
