import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { misTarjetas } from "@/lib/cobros";
import { pantallaPago } from "@/lib/boletos";
import { idioma } from "@/lib/idioma";
import { pasarela } from "@/lib/pagos/pasarela";
import { Pagar } from "./Pagar";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pagar boletos · To'Latino", robots: { index: false } };

/* APP-EVT-PAGO (prototipo pay L1337 · pyVals L1347): solo la persona que apartó lo ve (por su cuenta). Pagada → la orden. */
export default async function Page({ params }: { params: Promise<{ apartado: string }> }) {
  const [{ apartado }, lang, u] = await Promise.all([params, idioma(), yo()]);
  if (!u) redirect(`/entrar?volver=${encodeURIComponent(`/eventos/pagar/${apartado}`)}`);
  const p = await pantallaPago(u.id, apartado, lang === "es");
  if (!p) notFound();
  if (p.estado === "converted" && p.numero) redirect(`/eventos/orden/${p.numero}`);
  const modo = pasarela.modo();
  if (modo === "apagado") redirect(`/eventos/${p.evento.slug}?fecha=${p.fecha}`);
  return <Pagar p={p} es={lang === "es"} pago={{ modo, pk: process.env.STRIPE_PUBLISHABLE_KEY ?? null, tarjetas: await misTarjetas(u.id) }} />;
}
