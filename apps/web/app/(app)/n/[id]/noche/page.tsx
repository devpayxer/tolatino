import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { misTarjetas } from "@/lib/cobros";
import { bookingNoche } from "@/lib/noche-reservas";
import { pasarela } from "@/lib/pagos/pasarela";
import { ReservarNoche } from "./Reservar";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Lista y mesas · To'Latino" };

/* APP-NEG-NOCHE-RESERVA (neg-noche-flow.js bookVals): llega desde la hoja con ?s=servicio y ?p=personas. 1 Tu noche → 2 Noche y hora
   → 3 Revisa y envía. Ver no pide cuenta; enviar sí. */
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ s?: string; p?: string }> }) {
  const [{ id }, sp, lang, u] = await Promise.all([params, searchParams, idioma(), yo()]);
  if (!sp.s || !/^\d{1,18}$/.test(sp.s)) redirect(`/n/${id}?tab=svc`);
  const b = await bookingNoche(id, sp.s, u?.id ?? null);
  if (!b) notFound();
  if (!b.booking) redirect(`/n/${id}?tab=svc`);
  const modo = pasarela.modo();
  const pago = modo !== "apagado" && b.dep > 0 ? { modo, pk: process.env.STRIPE_PUBLISHABLE_KEY ?? null, tarjetas: u ? await misTarjetas(u.id) : [] } : null;
  const p = sp.p && /^\d{1,2}$/.test(sp.p) ? Number(sp.p) : 2;
  return <ReservarNoche b={b} es={lang === "es"} pago={pago} yo={!!u} pax0={p} />;
}
