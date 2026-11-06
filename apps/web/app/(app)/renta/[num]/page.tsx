import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { misTarjetas } from "@/lib/cobros";
import { pasarela } from "@/lib/pagos/pasarela";
import { rentaVista } from "@/lib/rentas";
import { RentaEstado } from "./RentaEstado";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tu renta · To'Latino" };

/* APP-NEG-RENTAR-ESTADO: una renta (T-…). Solo la ve quien la apartó. Al abrirla corre su barrido (vence, tarde, depósito). */
export default async function Page({ params }: { params: Promise<{ num: string }> }) {
  const [{ num }, lang, u] = await Promise.all([params, idioma(), yo()]);
  if (!u) redirect(`/entrar?volver=${encodeURIComponent(`/renta/${num}`)}`);
  const r = await rentaVista(u.id, num);
  if (!r) notFound();
  const modo = pasarela.modo();
  const pago = modo !== "apagado" ? { modo, pk: process.env.STRIPE_PUBLISHABLE_KEY ?? null, tarjetas: await misTarjetas(u.id) } : null;
  return <RentaEstado r={r} es={lang === "es"} pago={pago} />;
}
