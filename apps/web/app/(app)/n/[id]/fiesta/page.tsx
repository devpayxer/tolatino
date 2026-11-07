import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { misTarjetas } from "@/lib/cobros";
import { bookingFiesta } from "@/lib/fiestas-reservas";
import { tuFechaDe } from "@/lib/fiestas-publico";
import { pasarela } from "@/lib/pagos/pasarela";
import { BookingFiestaV } from "./Booking";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Booking · To'Latino" };

/* APP-NEG-FIESTA-BOOKING (neg-fiesta-flow.js bookVals): llega desde la hoja del servicio con ?s=servicio y, si hay, ?d=Tu fecha.
   1 Tu fiesta → 2 Fecha y hora → 3 Revisa y envía. Ver no pide cuenta; enviar sí. «Tu fecha» de la cuenta llena los datos. */
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ s?: string; d?: string }> }) {
  const [{ id }, sp, lang, u] = await Promise.all([params, searchParams, idioma(), yo()]);
  if (!sp.s || !/^\d{1,18}$/.test(sp.s)) redirect(`/n/${id}?tab=svc`);
  const b = await bookingFiesta(id, sp.s, u?.id ?? null);
  if (!b) notFound();
  if (!b.booking) redirect(`/n/${id}?tab=svc`);
  const fe = u ? await tuFechaDe(u.id) : null;
  const modo = pasarela.modo();
  const pago = modo !== "apagado" ? { modo, pk: process.env.STRIPE_PUBLISHABLE_KEY ?? null, tarjetas: u ? await misTarjetas(u.id) : [] } : null;
  const dia = sp.d && /^\d{4}-\d{2}-\d{2}$/.test(sp.d) ? sp.d : fe?.day ?? null;
  return <BookingFiestaV b={b} es={lang === "es"} pago={pago} yo={!!u} inicial={{ dia, e: fe?.e ?? "", g: fe?.g ?? null }} />;
}
