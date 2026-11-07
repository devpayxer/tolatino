"use client";
/* Hoy en el barrio en carrusel (MEM 1179–1182, prototipo homeToday / nh.today / feed.hoy): StoryCard 8a, una tarjeta por negocio con
   hasta 3 avisos; toque derecha = siguiente, izquierda = anterior, al final abre la página del negocio. Swipe en el teléfono y flechas
   en escritorio. Lo usan Inicio, Negocios y el muro de la Comunidad. Sin historias no se pinta (nada inventado). */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType } from "react";
import { tarjetaHoy, type Historia } from "@/lib/hoy-comun";

type N = "SectionHeader" | "IconButton" | "StoryCard";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { SectionHeader, IconButton, StoryCard } = UI as unknown as Record<N, ComponentType<any>>;

/* Una historia: la StoryCard del sistema con su etiqueta para lectores de pantalla y el destino al terminar. */
export function TarjetaHoy({ h, es, w, alto, flechas }: { h: Historia; es: boolean; w: number; alto: number; flechas?: boolean }) {
  const router = useRouter(), t = tarjetaHoy(h, es, w < 200);
  return (
    <div role="group" data-hoy={h.id} aria-label={`${h.nombre}: ${t.posts.map((p) => `${p.type}, ${p.text}`).join(" · ")}`} style={{ flex: "none", width: w, scrollSnapAlign: "start" }}>
      <StoryCard name={t.name} logo={t.logo} distance={t.distance} posts={t.posts} width={w} height={alto} arrows={!!flechas} onEnd={() => router.push(`/n/${h.id}?tab=nov`)} />
    </div>
  );
}

/* `escritorio`: desde 1024 px cambia a tarjetas de 240 con flechas y sin margen propio (Inicio y Negocios, prototipo car.todayRef). */
export function HoyCarrusel({ es, historias, titulo, sub, verTodo, ancho: a0 = 230, alto = 300, flechas: f0, pad: p0 = 20, dot, escritorio }: {
  es: boolean; historias: Historia[]; titulo: string; sub?: string; verTodo?: string; ancho?: number; alto?: number; flechas?: boolean; pad?: number; dot?: string; escritorio?: boolean;
}) {
  const router = useRouter(), ref = useRef<HTMLDivElement>(null), [w, setW] = useState(390);
  useEffect(() => { if (!escritorio) return; const f = () => setW(window.innerWidth); f(); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, [escritorio]);
  const D = !!escritorio && w >= 1024, ancho = D ? 240 : a0, flechas = D || f0, pad = D ? 0 : p0;
  if (!historias.length) return null;
  const mover = (d: number) => ref.current?.scrollBy({ left: d * ref.current.clientWidth * 0.85, behavior: "smooth" });
  return (
    <section data-screen-label="Hoy en el barrio · carrusel" style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
      <div style={{ padding: `0 ${pad}px`, display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0, display: "grid" }}>
          <SectionHeader title={titulo} dot={dot} action={verTodo ? (es ? "Ver todo" : "See all") : undefined} onAction={verTodo ? () => router.push(verTodo) : undefined} />
          {sub && <div style={{ marginTop: 6, font: "600 9.5px 'JetBrains Mono',monospace", letterSpacing: ".08em", color: "rgba(11,14,18,.5)" }}>{sub}</div>}
        </div>
        {flechas && historias.length > 2 && (
          <span style={{ display: "flex", gap: 8, flex: "none" }}>
            <IconButton icon="chevronLeft" size={36} label={es ? "Anterior" : "Previous"} onClick={() => mover(-1)} />
            <IconButton icon="chevronRight" size={36} label={es ? "Siguiente" : "Next"} onClick={() => mover(1)} />
          </span>
        )}
      </div>
      <div ref={ref} className="hs" style={{ display: "flex", gap: 10, overflowX: "auto", padding: `0 ${pad}px`, scrollSnapType: "x mandatory", scrollPaddingLeft: pad }}>
        {historias.map((h) => <TarjetaHoy key={h.id} h={h} es={es} w={ancho} alto={alto} flechas={flechas} />)}
      </div>
    </section>
  );
}
