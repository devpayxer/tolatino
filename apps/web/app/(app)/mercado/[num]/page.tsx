import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { vistaMercado } from "@/lib/mercado";
import { pasarela } from "@/lib/pagos/pasarela";
import { MercadoEstado } from "./MercadoEstado";

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
  return <MercadoEstado v={v} es={lang === "es"} pago={!v.local && modo !== "apagado" ? { modo, pk: process.env.STRIPE_PUBLISHABLE_KEY ?? null } : null} />;
}
