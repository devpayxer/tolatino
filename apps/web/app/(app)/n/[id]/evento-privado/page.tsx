import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { paginaEvp } from "@/lib/evento-privado";
import { PedirEvp } from "./PedirEvp";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Evento privado · To'Latino" };

/* APP-NEG-EVENTO-PRIVADO (To'Latino Evento privado.dc.html, 6i): desde Reservar cuando el grupo pasa del máximo («Pedir evento privado»). Móvil en
   3 pasos con StepHeader y barra fija; escritorio en una página con la columna de 372. Ver no pide cuenta; enviar sí. Nada se cobra al pedir. */
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ p?: string }> }) {
  const [{ id }, sp, lang, u] = await Promise.all([params, searchParams, idioma(), yo()]);
  const x = await paginaEvp(id, u?.id ?? null);
  if (!x) notFound();
  const p0 = /^\d{1,3}$/.test(sp.p ?? "") ? Number(sp.p) : 0;
  return <PedirEvp x={x} es={lang === "es"} p0={p0} />;
}
