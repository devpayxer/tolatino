import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { misTarjetas } from "@/lib/cobros";
import { pasarela } from "@/lib/pagos/pasarela";
import { viajeVista } from "@/lib/viajes";
import { ViajeEstado } from "./ViajeEstado";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tu viaje · To'Latino" };

/* APP-NEG-TRANS-ESTADO: un viaje (V-…). Solo lo ve quien lo reservó. Al abrirlo corre su barrido (vence, otra salida). */
export default async function Page({ params }: { params: Promise<{ num: string }> }) {
  const [{ num }, lang, u] = await Promise.all([params, idioma(), yo()]);
  if (!u) redirect(`/entrar?volver=${encodeURIComponent(`/viaje/${num}`)}`);
  const x = await viajeVista(u.id, num);
  if (!x) notFound();
  // La mudanza con su precio cerrado: la tarjeta para aceptarlo.
  const modo = pasarela.modo();
  const pago = x.k === "cotiza" && x.precio?.st === "sent" && modo !== "apagado" ? { modo, pk: process.env.STRIPE_PUBLISHABLE_KEY ?? null, tarjetas: await misTarjetas(u.id) } : null;
  return <ViajeEstado x={x} es={lang === "es"} pago={pago} />;
}
