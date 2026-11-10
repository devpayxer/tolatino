import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { misTarjetas } from "@/lib/cobros";
import { evpVista } from "@/lib/evento-privado";
import { pasarela } from "@/lib/pagos/pasarela";
import { EstadoEvp } from "./EstadoEvp";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tu evento privado · To'Latino" };

/* APP-NEG-EVENTO-PRIVADO · estado (EP-…): PENDIENTE · TE MANDARON SU PROPUESTA · TE PROPONEN UN CAMBIO · CONFIRMADO · NO PUDO · SIN RESPUESTA ·
   CANCELADO. Solo la ve quien la pidió (otra cuenta → 404). Al abrirla corre su barrido. Con una propuesta abierta, la tarjeta para el depósito. */
export default async function Page({ params }: { params: Promise<{ num: string }> }) {
  const [{ num }, lang, u] = await Promise.all([params, idioma(), yo()]);
  if (!u) redirect(`/entrar?volver=${encodeURIComponent(`/privado/${num}`)}`);
  const x = await evpVista(u.id, num);
  if (!x) notFound();
  const modo = pasarela.modo();
  const pago = x.quote && x.quote.st === "sent" && modo !== "apagado" ? { modo, pk: process.env.STRIPE_PUBLISHABLE_KEY ?? null, tarjetas: await misTarjetas(u.id) } : null;
  return <EstadoEvp x={x} es={lang === "es"} pago={pago} />;
}
