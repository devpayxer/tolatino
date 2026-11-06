import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { saludPublico } from "@/lib/salud-publico";
import { Consulta } from "./Consulta";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Booking · To'Latino" };

/* APP-NEG-SALUD-BOOKING (neg-salud-flow.js): llega desde la hoja del servicio (?s=servicio&c=profesional&seg=seguro).
   Ver las horas no pide cuenta; enviar sí. Lo que no se pide en línea (sin cita, consultorio sin citas) vuelve a la ficha. */
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ s?: string; c?: string; seg?: string }> }) {
  const [{ id }, sp, lang, u] = await Promise.all([params, searchParams, idioma(), yo()]);
  const sa = await saludPublico(id, u?.id ?? null);
  if (!sa) notFound();
  const s = sa.servicios.find((x) => x.id === sp.s);
  if (!sa.booking || !s || s.k === "walk") redirect(`/n/${id}?tab=svc`);
  const con = sp.c && sa.gente.some((p) => p.id === sp.c) ? sp.c : "any";
  const seg = sp.seg && sa.segs.some((x) => x.id === sp.seg) ? sp.seg : null;
  return <Consulta sa={sa} svcId={s.id} con0={con} seg0={seg} es={lang === "es"} yo={!!u} />;
}
