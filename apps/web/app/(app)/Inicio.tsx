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

type N = "ModuleTile" | "SectionHeader" | "BusinessRow" | "InfoCard" | "Button" | "Eyebrow" | "Icon" | "FeedPost";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { ModuleTile, SectionHeader, BusinessRow, InfoCard, Button, Eyebrow, Icon, FeedPost } = UI as unknown as Record<N, ComponentType<any>>;

type Textos = { allCats: string; catsTitle: string; openNow: string; seeAll: string; forBiz: string; publishTitle: string; publishBody: string; publishCta: string };

export function Inicio({ cats, inicio, abierto, t, es, hoy, oficial, conSesion, lugar }: {
  cats: Cat[]; inicio: string[]; abierto: Fila[]; t: Textos; es: boolean; hoy: Historia[]; oficial: OficialPortada | null; conSesion: boolean; lugar: string;
}) {
  const router = useRouter();
  const E2 = (a: string, b: string) => (es ? a : b);
  const deCasa = inicio.map((id) => cats.find((c) => c.id === id)).filter((c): c is Cat => !!c);
  const irCat = (c: Cat) => () => router.push(`/c/${c.slug}`);
  return (
    <div data-pantalla="APP-HOME" className="mx-auto w-full max-w-[1440px] lg:px-6 lg:pt-6">
      <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8 xl:grid-cols-[240px_minmax(0,1fr)_320px]">
        {/* Escritorio: columna de categorías (prototipo deskCols: 220 → 240 desde 1200) */}
        <aside className="hidden lg:flex lg:flex-col lg:gap-3">
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
        </aside>

        <main className="flex min-w-0 flex-col gap-[26px] lg:gap-[30px]">
          {/* Móvil: 7 categorías + Todas (17) en mosaico de 4 */}
          <div className="grid grid-cols-4 gap-2.5 px-5 pt-[18px] lg:hidden">
            {deCasa.map((c) => (
              <ModuleTile key={c.id} label={c.label} icon={c.icon} hue="var(--tl-open)" tint="rgba(0,168,143,.14)" onClick={irCat(c)} />
            ))}
            <ModuleTile dark icon="grid" label={t.allCats} onClick={() => router.push("/negocios")} />
          </div>

          {/* Hoy en el barrio: swipe en el teléfono, flechas en escritorio (prototipo homeToday). */}
          {hoy.length > 0 && (
            <div>
              <HoyCarrusel es={es} historias={hoy} titulo={E2("Hoy en el barrio", "Today nearby")} verTodo="/comunidad/hoy" escritorio />
            </div>
          )}

          {abierto.length > 0 && (
            <section className="flex flex-col gap-3 px-5 lg:px-0">
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

          {/* Comunidad: la pregunta o encuesta de la cuenta oficial de la ciudad (prototipo: FeedPost «To'Latino Hazleton · PREGUNTÓ») y la
              entrada. Las cifras son las reales; el texto de los vecinos nunca sale aquí. */}
          <section data-screen-label="APP-HOME · Comunidad" className="flex flex-col gap-3 px-5 lg:px-0">
            <SectionHeader title={E2("Comunidad", "Community")} />
            <div className="overflow-hidden rounded-[17px] border border-line bg-white">
              {oficial && (
                <FeedPost author={es ? oficial.nombre.es : oficial.nombre.en} avatar={<img src={oficial.foto} alt="" width={40} height={40} style={{ width: 40, height: 40, borderRadius: 99, flex: "none", display: "block" }} />}
                  action={oficial.kind === "pregunta" ? E2("PREGUNTÓ", "ASKED") : oficial.kind === "encuesta" ? E2("ENCUESTA", "POLL") : E2("AVISO", "NOTICE")}
                  time={hace(oficial.at, es).toUpperCase()} place={lugar} body={oficial.body} stats={[{ icon: "chat", value: oficial.cms }, { icon: "like", value: oficial.up }]} />
              )}
              <div className={`flex flex-col gap-2.5 px-5 pb-[18px] lg:flex-row lg:items-center lg:gap-4 ${oficial ? "" : "pt-[18px]"}`}>
                <div className="flex-1 text-pretty text-[12.5px] font-medium leading-[1.5] text-ink/60">{E2("La comunidad es para vecinos con cuenta. Entra para leer las respuestas y recomendar.", "Community is for neighbors with an account. Sign in to read answers and recommend.")}</div>
                <div className="flex"><Button block size="md" onClick={() => router.push(conSesion ? (oficial ? `/comunidad/p/${oficial.id}` : "/comunidad") : `/entrar?volver=${encodeURIComponent("/comunidad")}`)}>{conSesion ? E2("Ir a la comunidad", "Go to community") : E2("Entrar", "Sign in")}</Button></div>
              </div>
            </div>
          </section>

          {/* Por debajo de 1200 la tarjeta va plegada en la columna central (prototipo showFolded) */}
          <section className="px-5 pb-4 lg:px-0 xl:hidden">
            <Publica t={t} onClick={() => router.push("/publica")} />
          </section>
        </main>

        {/* Desde 1200: columna derecha fija (prototipo showRail) */}
        <aside className="hidden xl:block">
          <div className="sticky top-[88px]">
            <Publica t={t} block onClick={() => router.push("/publica")} />
          </div>
        </aside>
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
