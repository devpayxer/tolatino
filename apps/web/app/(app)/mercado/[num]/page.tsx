import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { vistaMercado } from "@/lib/mercado";
import { pasarela } from "@/lib/pagos/pasarela";
import { clienteVeRuta } from "@/lib/ruta";
import { MercadoEstado } from "./MercadoEstado";
import { llave } from "@/lib/llaves-proveedores";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tu pedido del mercado · To'Latino" };

/* APP-NEG-MERC-ESTADO: el pedido del mercado de la persona (solo el suyo). */
export default async function Page({ params }: { params: Promise<{ num: string }> }) {
  const [{ num }, lang, u] = await Promise.all([params, idioma(), yo()]);
  if (!u) redirect(`/entrar?volver=${encodeURIComponent(`/mercado/${num}`)}`);
  const v = await vistaMercado(num, { userId: u.id });
  if (!v) notFound();
  // 9n-4 · La hoja del banco (3-D Secure) del OK por más necesita el modo de la pasarela y la llave pública.
  const modo = pasarela.modo();
  // 9n · El mapa en vivo del repartidor del mercado: solo el cliente de ESTE pedido, desde «Recogí» (el SSE lo vuelve a revisar en cada cambio).
  const ruta = v.modo === "delivery" && v.st === "confirmed" && !!v.reparto?.rep ? await clienteVeRuta(u.id, num) : false;
  return <MercadoEstado v={v} es={lang === "es"} ruta={ruta} pago={!v.local && modo !== "apagado" ? { modo, pk: await llave("STRIPE_PUBLISHABLE_KEY") } : null} />;
}
