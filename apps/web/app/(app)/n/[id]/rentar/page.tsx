import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { misTarjetas } from "@/lib/cobros";
import { pasarela } from "@/lib/pagos/pasarela";
import { opcionesRenta } from "@/lib/rentas";
import { Rentar } from "./Rentar";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Rentar · To'Latino" };

/* APP-NEG-RENTAR: llega desde la pestaña Tienda de la ficha (?a=artículo). Los días para recoger salen del horario del
   negocio (el servidor decide). Ver no pide cuenta; apartar sí. */
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ a?: string }> }) {
  const [{ id }, sp, lang, u] = await Promise.all([params, searchParams, idioma(), yo()]);
  const o = typeof sp.a === "string" ? await opcionesRenta(id, sp.a) : null;
  if (!o) redirect(`/n/${id}?tab=shop`);
  const modo = pasarela.modo();
  const pago = modo !== "apagado" ? { modo, pk: process.env.STRIPE_PUBLISHABLE_KEY ?? null, tarjetas: u ? await misTarjetas(u.id) : [] } : null;
  return <Rentar o={o} es={lang === "es"} yo={!!u} pago={pago} />;
}
