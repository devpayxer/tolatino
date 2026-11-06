import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { misTarjetas } from "@/lib/cobros";
import { oficiosPublico } from "@/lib/oficios-publico";
import { pasarela } from "@/lib/pagos/pasarela";
import { opcionesPlan } from "@/lib/planes";
import { Plan } from "./Plan";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Empezar el plan · To'Latino" };

/* APP-NEG-HOGAR-PLAN: llega desde la hoja de un servicio «plan» (?s=servicio). Los días y fechas salen del horario del
   negocio (el servidor decide). Ver no pide cuenta; empezar sí. */
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ s?: string }> }) {
  const [{ id }, sp, lang, u] = await Promise.all([params, searchParams, idioma(), yo()]);
  const op = await oficiosPublico(id, u?.id ?? null);
  if (!op) notFound();
  const s = op.servicios.find((x) => x.id === sp.s);
  const o = s && s.k === "plan" ? await opcionesPlan(id, s.id) : null;
  if (!op.can || op.rubro !== "hogar" || !s || !o) redirect(`/n/${id}?tab=svc`);
  const modo = pasarela.modo();
  const pago = modo !== "apagado" ? { modo, pk: process.env.STRIPE_PUBLISHABLE_KEY ?? null, tarjetas: u ? await misTarjetas(u.id) : [] } : null;
  return <Plan op={op} svcId={s.id} o={o} es={lang === "es"} yo={!!u} pago={pago} />;
}
