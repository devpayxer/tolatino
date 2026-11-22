"use client";
/* C-002 · «Patrocinados» de la página de categoría (canvas tolatino-master+, «Página de categoría (variantes)» sección D; prototipo APP-NEG-CAT ·
   «Categoría · Patrocinados (C-002)», móvil y desktop): hasta 6 tarjetas altas (232 × 286) que se deslizan. El título es el único aviso: sin texto
   que explique y sin etiqueta en cada tarjeta. Con video aprobado (Pro, C-001) la tarjeta lo lleva (VideoTarjeta: se mueve uno a la vez en toda la
   página, el que queda más cerca del centro); sin video, su foto de portada. Con algo de hoy, el anillo con el logo abre «Hoy en el barrio».
   La lista la decide el servidor (lib/patrocinio.ts · vitrinaCategoria); aquí solo se pinta y, al tocar, se cuenta «entraron» antes de abrir
   la página del negocio. El panel usa la misma tarjeta para la vista previa (TarjetaAlta, sin acciones). */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState, type ComponentType } from "react";
import type { Tarjeta } from "@/lib/tarjeta";
import { abrirComoLlegar } from "@/lib/como-llegar";
import { contarEntradaPatrocinio, contarToque } from "@/lib/contar-toque";
import { VideoTarjeta, VisorHoy } from "../../VideoNegocio";
import { fotoFondo } from "@tolatino/ui";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Button } = UI as unknown as Record<"Button", ComponentType<any>>;

export type Patrocinada = { sid: string; t: Tarjeta };

/* La tarjeta alta. `chica` = la vista previa del panel (200 × 236). Sin onOpen/onCta no hace nada al tocarla. */
export function TarjetaAlta({ b, es, onOpen, onCta, onRing, chica = false, sid }: { b: Tarjeta; es: boolean; onOpen?: () => void; onCta?: () => void; onRing?: () => void; chica?: boolean; sid?: string }) {
  const vid = b.plan === "pro" && b.video ? b.video : null, foto = vid?.poster ?? b.photo;
  const h = b.historia && b.historia.avisos.length ? b.historia : null;
  const anillo = h ? h.logo ?? b.photo : null;
  return (
    <div role={onOpen ? "link" : undefined} tabIndex={onOpen ? 0 : undefined} aria-label={b.name} onClick={onOpen} onKeyDown={onOpen ? (e) => { if (e.key === "Enter") onOpen(); } : undefined}
      data-patrocinada={sid}
      className={`relative flex-none snap-start overflow-hidden bg-dark-3 text-white ${chica ? "h-[236px] w-[200px] rounded-[20px]" : "h-[286px] w-[232px] rounded-[22px]"} ${onOpen ? "cursor-pointer" : ""}`}>
      <span className="absolute inset-0 block bg-cover bg-center" style={foto ? { backgroundImage: fotoFondo(foto, 232) } : undefined} />
      {vid && !chica ? <div className="absolute inset-0"><VideoTarjeta src={vid.src} poster={vid.poster} nombre={b.name} es={es} /></div> : null}
      {anillo != null ? (
        <button type="button" aria-label={`${es ? "Hoy en el barrio" : "Today nearby"} · ${b.name}`} data-anillo=""
          onClick={(e) => { e.stopPropagation(); onRing?.(); }}
          className={`absolute left-3 top-3 z-[3] box-border rounded-full border-0 bg-action p-[2.5px] ${chica ? "size-[38px]" : "size-11"}`}>
          <span className="block size-full rounded-full border-[2.5px] border-white bg-photo-bg bg-cover bg-center" style={anillo ? { backgroundImage: fotoFondo(anillo, 44) } : undefined} />
        </button>
      ) : null}
      <div className={`absolute inset-x-0 bottom-0 z-[2] flex flex-col bg-[linear-gradient(180deg,rgba(11,14,18,0),rgba(11,14,18,.92))] ${chica ? "gap-1 px-3 pb-3 pt-[50px]" : "gap-[5px] px-3.5 pb-3.5 pt-14"}`}>
        <span className={`truncate font-display font-extrabold leading-[1.15] tracking-[-0.03em] ${chica ? "text-[15px]" : "text-[17px]"}`}>{b.name}</span>
        <span className={`truncate font-bold ${chica ? "text-[11px]" : "text-[12px]"}`}>
          {b.reviews >= 5 ? <span className="text-pro">★ </span> : null}{b.rating} · <span className={b.open ? "text-signal" : "text-white/75"}>{b.status}</span>
        </span>
        <div className="mt-[5px] flex" onClick={(e) => e.stopPropagation()}>
          <Button variant="secondary" size="md" icon={b.ctaIcon} block onClick={onCta}>{b.cta}</Button>
        </div>
      </div>
    </div>
  );
}

export function Patrocinados({ items, titulo, es }: { items: Patrocinada[]; titulo: string; es: boolean }) {
  const router = useRouter();
  const [hoy, setHoy] = useState<Tarjeta | null>(null);
  if (!items.length) return null;
  const entrar = (p: Patrocinada) => { contarEntradaPatrocinio("negocio", p.sid); };
  const abrir = (p: Patrocinada) => () => { entrar(p); router.push(`/n/${p.t.id}`); };
  const cta = (p: Patrocinada) => () => {
    const b = p.t;
    entrar(p);
    if (b.accion === "llamar" && b.phone) { contarToque(b.id, "call", "patrocinados"); location.href = `tel:${b.phone}`; return; }
    if (b.accion === "llegar" && b.lat != null && b.lng != null) { contarToque(b.id, "directions", "patrocinados"); abrirComoLlegar({ lat: b.lat, lng: b.lng }); return; }
    router.push(`/n/${b.id}`);
  };
  return (
    <div data-screen-label="Categoría · Patrocinados (C-002)" data-patrocinados={items.length} className="flex flex-col gap-[11px] py-4 lg:gap-3.5 lg:pb-1 lg:pt-[22px]">
      <h2 className="px-5 font-display text-[16px] font-extrabold tracking-[-0.03em] lg:px-[30px] lg:text-[18px]">{titulo}</h2>
      <div className="hs flex snap-x snap-proximity gap-3 overflow-x-auto px-5 scroll-px-5 lg:gap-4 lg:px-[30px] lg:scroll-px-[30px]">
        {items.map((p) => <TarjetaAlta key={p.sid} sid={p.sid} b={p.t} es={es} onOpen={abrir(p)} onCta={cta(p)} onRing={() => { entrar(p); setHoy(p.t); }} />)}
      </div>
      {hoy?.historia ? <VisorHoy h={hoy.historia} es={es} onClose={() => setHoy(null)} /> : null}
    </div>
  );
}
