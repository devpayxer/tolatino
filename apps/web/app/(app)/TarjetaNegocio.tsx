"use client";
/* Tarjeta de negocio en cualquier lista: BusinessCard del sistema + lo que pasa al tocarla. Abrir → ficha;
   Llamar → teléfono; Cómo llegar → mapas del teléfono; corazón → Guardados (sin sesión: entrar y volver). */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState, type ComponentType } from "react";
import type { Accion, Tarjeta } from "@/lib/tarjeta";
import { guardarNegocio, registrarToque } from "./acciones";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { BusinessCard } = UI as unknown as Record<"BusinessCard", ComponentType<any>>;

export function TarjetaNegocio({ b, origen, textos }: { b: Tarjeta; origen: string; textos: { hoy: string; llamar: string } }) {
  const router = useRouter();
  const [guardado, setGuardado] = useState(b.saved);
  const hacer = (a: Accion) => () => {
    if (a === "ficha") return router.push(`/n/${b.id}`);
    if (a === "llamar" && b.phone) {
      void registrarToque(b.id, "call", origen);
      location.href = `tel:${b.phone}`;
      return;
    }
    if (a === "llegar" && b.lat != null && b.lng != null) {
      void registrarToque(b.id, "directions", origen);
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lng}`, "_blank", "noopener");
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
  return (
    <BusinessCard
      plan={b.plan} name={b.name} verified={b.verified} meta={b.meta} rating={b.rating} reviews={b.reviews} reviewsNote={b.reviewsNote}
      status={b.status} open={b.open} photos={b.photo ? [b.photo] : []} chips={b.chips} offer={b.offer ?? undefined} offerTag={textos.hoy}
      cta={b.cta} ctaIcon={b.ctaIcon} contactLabel={textos.llamar} saved={guardado}
      onOpen={hacer("ficha")} onCta={hacer(b.accion)} onSave={guardar} onContact={hacer("llamar")}
    />
  );
}
