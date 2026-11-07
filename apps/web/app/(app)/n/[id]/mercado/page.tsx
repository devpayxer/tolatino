import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { misTarjetas } from "@/lib/cobros";
import { opcionesMercado } from "@/lib/mercado";
import { pasarela } from "@/lib/pagos/pasarela";
import { PedidoMercado } from "./PedidoMercado";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tu pedido del mercado · To'Latino" };

/* APP-NEG-MERC-PEDIDO (neg-merc-flow.js): lo que agregaste en la ficha (el carrito vive en el teléfono), cómo lo recibes, si
   algo no hay, cuándo, y revisar y enviar. Las horas con cupo, el mínimo, el envío y lo que se retiene los decide el servidor.
   Ver no pide cuenta; enviar sí. */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, lang, u] = await Promise.all([params, idioma(), yo()]);
  const o = await opcionesMercado(id, u?.id ?? null);
  if (!o) redirect(`/n/${id}`);
  const modo = pasarela.modo();
  const pago = modo !== "apagado" && o.tarjeta ? { modo, pk: process.env.STRIPE_PUBLISHABLE_KEY ?? null, tarjetas: u ? await misTarjetas(u.id) : [] } : null;
  return <PedidoMercado o={o} es={lang === "es"} yo={!!u} pago={pago} />;
}
