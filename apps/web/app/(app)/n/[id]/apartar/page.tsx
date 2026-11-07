import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { dirEnvio, opcionesApartar } from "@/lib/apartados";
import { misTarjetas } from "@/lib/cobros";
import { pasarela } from "@/lib/pagos/pasarela";
import { Apartar } from "./Apartar";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tu apartado · To'Latino" };

/* APP-NEG-TIENDA-APARTADO: lo que apartaste en la Tienda de la ficha (el carrito vive en el teléfono), cuándo pasas y
   revisar y enviar. Los días y horas salen del horario de la tienda (el servidor decide). Enviar pide cuenta. */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, lang, u] = await Promise.all([params, idioma(), yo()]);
  const o = await opcionesApartar(id);
  if (!o) redirect(`/n/${id}`);
  // Envío de la tienda (4q-2): la tarjeta y la dirección de la persona (solo si la tienda envía y cobra con tarjeta).
  const modo = pasarela.modo();
  const pago = (o.envio || o.plan) && modo !== "apagado" ? { modo, pk: process.env.STRIPE_PUBLISHABLE_KEY ?? null, tarjetas: u ? await misTarjetas(u.id) : [] } : null;
  const dir = o.envio && u ? await dirEnvio(u.id, id) : null;
  return <Apartar o={o} es={lang === "es"} yo={!!u} pago={pago} dir={dir} />;
}
