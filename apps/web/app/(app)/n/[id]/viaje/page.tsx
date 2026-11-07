import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { misTarjetas } from "@/lib/cobros";
import { pasarela } from "@/lib/pagos/pasarela";
import { bookingViaje } from "@/lib/viajes";
import { ViajeBooking } from "./ViajeBooking";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Reservar · To'Latino" };

/* APP-NEG-TRANS-RESERVA (neg-trans-flow.js bookVals): llega desde la hoja del servicio con ?s=servicio. 1 Tu viaje → 2 Día y hora →
   3 Revisa y envía. Solo por asiento o vehículo completo (la caja y el precio cerrado con fotos, 4y-2). Sin licencia válida → la ficha. */
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ s?: string }> }) {
  const [{ id }, sp, lang, u] = await Promise.all([params, searchParams, idioma(), yo()]);
  if (!sp.s || !/^\d{1,18}$/.test(sp.s)) redirect(`/n/${id}?tab=svc`);
  const b = await bookingViaje(id, sp.s, u?.id ?? null);
  if (!b) notFound();
  if (!b.booking || (b.svc.k !== "asiento" && b.svc.k !== "priv")) redirect(`/n/${id}?tab=svc`);
  const modo = pasarela.modo();
  const pago = modo !== "apagado" ? { modo, pk: process.env.STRIPE_PUBLISHABLE_KEY ?? null, tarjetas: u ? await misTarjetas(u.id) : [] } : null;
  return <ViajeBooking b={b} es={lang === "es"} pago={pago} yo={!!u} />;
}
