import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { misTarjetas } from "@/lib/cobros";
import { pasarela } from "@/lib/pagos/pasarela";
import { planVista } from "@/lib/planes";
import { PlanEstado } from "./PlanEstado";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tu plan · To'Latino" };

/* Estado de un plan (PL-…). Solo lo ve quien lo empezó. Al abrirlo corre su barrido (cobro del período y próxima visita). */
export default async function Page({ params }: { params: Promise<{ num: string }> }) {
  const [{ num }, lang, u] = await Promise.all([params, idioma(), yo()]);
  if (!u) redirect(`/entrar?volver=${encodeURIComponent(`/plan/${num}`)}`);
  const p = await planVista(u.id, num);
  if (!p) notFound();
  const modo = pasarela.modo();
  const pago = modo !== "apagado" ? { modo, pk: process.env.STRIPE_PUBLISHABLE_KEY ?? null, tarjetas: await misTarjetas(u.id) } : null;
  return <PlanEstado p={p} es={lang === "es"} pago={pago} />;
}
