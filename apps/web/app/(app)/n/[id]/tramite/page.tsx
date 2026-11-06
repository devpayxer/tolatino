import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { proPublico } from "@/lib/pro-publico";
import { Tramite } from "./Tramite";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Booking · To'Latino" };

/* APP-NEG-PRO-BOOKING (neg-pro-flow.js): llega desde la hoja del servicio (?s=servicio&c=profesional). Ver horas no pide
   cuenta; enviar sí. Lo que no se pide en línea (sin cita, oficina sin citas) vuelve a la ficha. */
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ s?: string; c?: string }> }) {
  const [{ id }, sp, lang, u] = await Promise.all([params, searchParams, idioma(), yo()]);
  const pp = await proPublico(id);
  if (!pp) notFound();
  const s = pp.servicios.find((x) => x.id === sp.s);
  if (!pp.booking || !s || s.k === "walk") redirect(`/n/${id}?tab=svc`);
  const con = sp.c && pp.gente.some((p) => p.id === sp.c) ? sp.c : "any";
  return <Tramite pp={pp} svcId={s.id} con0={con} es={lang === "es"} yo={!!u} />;
}
