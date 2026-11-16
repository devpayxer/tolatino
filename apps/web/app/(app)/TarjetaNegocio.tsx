"use client";
/* Tarjeta de negocio en cualquier lista: BusinessCard del sistema + lo que pasa al tocarla. Abrir → ficha;
   Llamar → teléfono; Cómo llegar → mapas del teléfono; corazón → Guardados (sin sesión: entrar y volver). */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState, type ComponentType } from "react";
import type { Accion, Tarjeta } from "@/lib/tarjeta";
import { guardarNegocio, registrarToque } from "./acciones";
import { abrirComoLlegar } from "@/lib/como-llegar";
import { VideoTarjeta, VisorHoy } from "./VideoNegocio";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { BusinessCard } = UI as unknown as Record<"BusinessCard", ComponentType<any>>;

/* C-002 · `una`: la tarjeta Pro de la página de categoría (una línea de datos y un botón; BusinessCard oneLine). */
export function TarjetaNegocio({ b, origen, textos, es = true, una = false }: { b: Tarjeta; origen: string; textos: { hoy: string; llamar: string }; es?: boolean; una?: boolean }) {
  const router = useRouter();
  const [guardado, setGuardado] = useState(b.saved);
  const [anillo, setAnillo] = useState(false);
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
  // C-001 · Pro: el video aprobado en la foto (solo se mueve el del centro) y el anillo del logo si el negocio tiene algo de hoy.
  const h = b.historia && b.historia.avisos.length ? b.historia : null;
  return (
    <>
    <BusinessCard
      plan={b.plan} name={b.name} verified={b.verified} meta={una && b.plan === "pro" ? (b.donde ?? "").toLowerCase() : b.meta} rating={b.rating} reviews={b.reviews} reviewsNote={b.reviewsNote}
      status={b.status} open={b.open} photos={b.photo ? [b.photo] : []} chips={b.chips} offer={b.offer ?? undefined} offerTag={textos.hoy}
      cta={b.cta} ctaIcon={b.ctaIcon} contactLabel={textos.llamar} saved={guardado}
      onOpen={hacer("ficha")} onCta={hacer(b.accion)} onSave={guardar} onContact={hacer("llamar")}
      media={b.video ? <VideoTarjeta src={b.video.src} poster={b.video.poster} nombre={b.name} es={es} /> : null}
      oneLine={una || undefined}
      ring={h ? h.logo ?? b.photo ?? "" : undefined} onRing={() => setAnillo(true)} ringLabel={`${es ? "Hoy en el barrio" : "Today nearby"} · ${b.name}`}
    />
    {anillo && h ? <VisorHoy h={h} es={es} onClose={() => setAnillo(false)} /> : null}
    </>
  );
}
