import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { citaVista } from "@/lib/citas";
import { vencerCitas } from "@/lib/citas-flujo";
import { Estado } from "./Estado";
import { pasarela } from "@/lib/pagos/pasarela";
import { misTarjetas } from "@/lib/cobros";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tu cita · To'Latino" };

/* APP-NEG-CITA (prototipo citaVals): la cita de la persona. Solo la ve quien la pidió. */
export default async function Page({ params, searchParams }: { params: Promise<{ num: string }>; searchParams: Promise<{ cambio?: string }> }) {
  const [{ num }, lang, u, sp] = await Promise.all([params, idioma(), yo(), searchParams]);
  if (!u) redirect(`/entrar?volver=${encodeURIComponent(`/cita/${num}`)}`);
  if (/^C-\d{1,10}$/.test(num)) await vencerCitas({ userId: u.id, numero: num });
  const c = await citaVista(u.id, num);
  if (!c) notFound();
  // 4d: si el negocio cobra con tarjeta, el cliente elige con cuál se retiene lo que aprueba.
  const modo = pasarela.modo();
  const pago = c.est?.dinero.tarjeta && modo !== "apagado" ? { modo, pk: process.env.STRIPE_PUBLISHABLE_KEY ?? null, tarjetas: await misTarjetas(u.id) } : null;
  return <Estado c={c} yo={[u.first_name, u.last_name].filter(Boolean).join(" ")} es={lang === "es"} cambio={sp.cambio === "1"} pago={pago} />;
}
