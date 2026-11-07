import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { bookingVisita } from "@/lib/visitas-inm";
import { Visita } from "./Visita";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pedir visita · To'Latino" };

/* APP-NEG-EDU-INSCRIPCION con visit (neg-edu-flow.js bookVals L29–55; «Para mi hijo» se quita en visitas, L45): llega desde la hoja de la
   propiedad, del carro o del servicio con ?item=. 1 Día y hora → 2 Revisa y envía. Ver no pide cuenta; enviar sí. Con una solicitud viva para
   lo mismo, se abre esa. Nada se cobra. */
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ item?: string }> }) {
  const [{ id }, sp, lang, u] = await Promise.all([params, searchParams, idioma(), yo()]);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) notFound();
  if (!sp.item || !/^\d{1,18}$/.test(sp.item)) redirect(`/n/${id}`);
  const b = await bookingVisita(id, sp.item, u?.id ?? null);
  if (!b) notFound();
  if (b.mia) redirect(`/vis/${b.mia}`);
  return <Visita b={b} es={lang === "es"} yo={!!u} />;
}
