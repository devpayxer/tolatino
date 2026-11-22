"use client";
/* Tarjeta de negocio en cualquier lista: la «Vitrina» del sistema (TarjetaVitrina para Pro, FilaFree para Free; decisión AK, 22 nov) + lo que
   pasa al tocarla. Abrir → ficha; Llamar → teléfono; botón principal → lo que decide el servidor (botonPrincipal: ficha, llamar o mapas del
   teléfono); corazón → Guardados (sin sesión: entrar y volver); «+N FOTOS» → la galería de la ficha; el video aprobado (C-001) se mueve en
   la celda grande de la galería; la caja HOY (con algo publicado en las últimas 24 h) abre «Hoy en el barrio» de ese negocio.
   Las palabras de los botones y del estado salen del servidor (botonPrincipal, estado()); aquí solo se arman los nombres accesibles. */
import { FilaFree, TarjetaVitrina } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Accion, Tarjeta } from "@/lib/tarjeta";
import { dosIdiomas } from "@/lib/dos-idiomas";
import { guardarNegocio, registrarToque } from "./acciones";
import { abrirComoLlegar } from "@/lib/como-llegar";
import { VideoTarjeta, VisorHoy } from "./VideoNegocio";

export function TarjetaNegocio({ b, origen, textos, es = true, urgente = false }: { b: Tarjeta; origen: string; textos: { hoy: string; llamar: string }; es?: boolean; urgente?: boolean }) {
  const E2 = (a: string, c: string) => dosIdiomas(es, a, c);
  const router = useRouter();
  const [guardado, setGuardado] = useState(b.saved);
  const [hoy, setHoy] = useState(false);
  const hacer = (a: Accion) => () => {
    if (a === "ficha") return router.push(`/n/${b.id}`);
    if (a === "llamar" && b.phone) {
      void registrarToque(b.id, "call", origen);
      location.href = `tel:${b.phone}`;
      return;
    }
    if (a === "llegar" && b.lat != null && b.lng != null) {
      void registrarToque(b.id, "directions", origen);
      abrirComoLlegar({ lat: b.lat, lng: b.lng });
    }
  };
  const guardar = async () => {
    const antes = guardado;
    setGuardado(!antes);
    const r = await guardarNegocio(b.id);
    if (r.ok) return setGuardado(!!r.on);
    setGuardado(antes);
    if ("entrar" in r && r.entrar) router.push(`/entrar?volver=${encodeURIComponent(location.pathname + location.search)}`);
  };
  const llamar = b.phone ? hacer("llamar") : undefined;
  const llamarNombre = `${E2("Llamar a", "Call")} ${b.name}`;
  if (b.plan === "free")
    return <FilaFree nombre={b.name} dato={b.meta} calificacion={b.rating} resenas={b.reviews} calificacionNota={b.reviewsNote} foto={b.photo}
      llamarEtiqueta={textos.llamar} llamarNombre={llamarNombre} onLlamar={llamar} onAbrir={hacer("ficha")} />;
  // C-001 · la caja HOY: con algo publicado en las últimas 24 h (historia) abre «Hoy en el barrio» de este negocio (ya no hay anillo sobre un logo).
  const h = b.historia && b.historia.avisos.length ? b.historia : null;
  const oferta = b.offer ?? h?.avisos[0]?.texto ?? undefined;
  return (
    <>
      <TarjetaVitrina nombre={b.name} verificado={b.verified} verificadoEtiqueta={E2("Verificado", "Verified")}
        calificacion={b.rating} resenas={b.reviews} calificacionNota={b.reviewsNote} dato={b.meta}
        estado={b.status} abierto={b.open} fotos={b.fotos} fotosTotal={b.nfotos} urgente={urgente}
        masFotosEtiqueta={(n) => `+${n} ${E2("FOTOS", "PHOTOS")}`} masFotosNombre={(n) => `${E2("Ver las fotos de", "See the photos of")} ${b.name} (+${n})`}
        onMasFotos={() => router.push(`/n/${b.id}/fotos`)}
        media={b.video ? <VideoTarjeta src={b.video.src} poster={b.video.poster} nombre={b.name} es={es} solo={b.fotos.length < 2} /> : null}
        chips={b.chips} horarioNombre={(l) => `${E2("Horario", "Time")} ${l} · ${b.name}`}
        oferta={oferta} ofertaEtiqueta={textos.hoy} onOferta={h ? () => setHoy(true) : undefined}
        ofertaNombre={`${E2("Hoy en el barrio", "Today nearby")} · ${b.name}${oferta ? `: ${oferta}` : ""}`}
        cta={b.cta} ctaIcono={b.ctaIcon} onCta={hacer(b.accion)}
        llamarNombre={llamarNombre} onLlamar={llamar}
        guardado={guardado} guardarNombre={`${E2("Guardar", "Save")} ${b.name}`} quitarNombre={`${E2("Quitar de guardados", "Remove from saved")} · ${b.name}`} onGuardar={guardar}
        onAbrir={hacer("ficha")} />
      {hoy && h ? <VisorHoy h={h} es={es} onClose={() => setHoy(false)} /> : null}
    </>
  );
}
