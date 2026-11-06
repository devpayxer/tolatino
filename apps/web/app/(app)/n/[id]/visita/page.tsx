import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { misTarjetas } from "@/lib/cobros";
import { oficiosPublico } from "@/lib/oficios-publico";
import { pasarela } from "@/lib/pagos/pasarela";
import { Visita } from "./Visita";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Booking · To'Latino" };

/* APP-NEG-AUTO-BOOKING y APP-NEG-HOGAR-BOOKING (diseño neg-auto-flow.js / neg-hogar-flow.js): llega desde la hoja del
   servicio con lo elegido (?s=servicio&o=opciones&a=extras&w=espera|deja&z=tamaño). Ver las horas no pide cuenta;
   enviar sí. Lo que no se reserva en línea (grúa, sin cita, emergencia, plan) vuelve a la ficha. */
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ s?: string; o?: string; a?: string; w?: string; z?: string }> }) {
  const [{ id }, sp, lang, u] = await Promise.all([params, searchParams, idioma(), yo()]);
  const op = await oficiosPublico(id, u?.id ?? null);
  if (!op) notFound();
  const s = op.servicios.find((x) => x.id === sp.s);
  if (!op.can || !s || s.a?.walk || ["grua", "emer", "plan"].includes(s.k)) redirect(`/n/${id}?tab=svc`);
  const opts: Record<string, number> = {};
  for (const par of String(sp.o ?? "").split(",")) { const m = /^([0-2])-([0-5])$/.exec(par); if (m && s.opts[Number(m[1])]?.o[Number(m[2])]) opts[m[1]!] = Number(m[2]); }
  if (s.opts.some((_, gi) => opts[String(gi)] == null)) redirect(`/n/${id}?tab=svc`);
  const adds = [...new Set(String(sp.a ?? "").split(",").filter((x) => /^[0-5]$/.test(x)).map(Number))].filter((i) => !!s.a?.x?.[i]);
  const w = sp.w === "espera" || sp.w === "deja" ? sp.w : null, z = /^[0-2]$/.test(sp.z ?? "") ? Number(sp.z) : null;
  const modo = pasarela.modo();
  const pago = modo !== "apagado" ? { modo, pk: process.env.STRIPE_PUBLISHABLE_KEY ?? null, tarjetas: u ? await misTarjetas(u.id) : [] } : null;
  return <Visita op={op} svcId={s.id} inicial={{ opts, adds, w, z }} es={lang === "es"} pago={pago} yo={!!u} />;
}
