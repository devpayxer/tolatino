import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { misTarjetas } from "@/lib/cobros";
import { bookingInsc } from "@/lib/inscripciones";
import { pasarela } from "@/lib/pagos/pasarela";
import { Inscribirme } from "./Inscribirme";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Inscribirme · To'Latino" };

/* APP-NEG-EDU-INSCRIPCION (neg-edu-flow.js bookVals L29–55): llega desde la hoja del curso con ?svc= (y ?grupo= o ?banda= desde una
   oferta de la lista de espera). 1 Para quién → 2 Grupo → 3 Revisa y envía. Ver no pide cuenta; enviar sí. */
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ svc?: string; grupo?: string; banda?: string }> }) {
  const [{ id }, sp, lang, u] = await Promise.all([params, searchParams, idioma(), yo()]);
  if (!sp.svc || !/^\d{1,18}$/.test(sp.svc)) redirect(`/n/${id}?tab=svc`);
  const b = await bookingInsc(id, sp.svc, u?.id ?? null);
  if (!b) notFound();
  if (b.free) redirect(`/n/${id}?tab=svc`);
  const modo = pasarela.modo();
  const pago = modo !== "apagado" && b.mat > 0 ? { modo, pk: process.env.STRIPE_PUBLISHABLE_KEY ?? null, tarjetas: u ? await misTarjetas(u.id) : [] } : null;
  const g0 = sp.grupo && /^\d{1,18}$/.test(sp.grupo) ? sp.grupo : null, b0 = sp.banda && /^\d{1,18}$/.test(sp.banda) ? sp.banda : null;
  return <Inscribirme b={b} es={lang === "es"} pago={pago} yo={!!u} grupo0={g0} banda0={b0} />;
}
