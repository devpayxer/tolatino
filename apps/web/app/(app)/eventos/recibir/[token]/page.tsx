import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { verTransferencia } from "@/lib/boletos-despues";
import { Recibir } from "./Recibir";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Te mandaron un boleto · To'Latino", robots: { index: false, follow: false }, referrer: "no-referrer" };

/* /eventos/recibir/[token] (hueco #4 del plan 6d, compuesto con Entrar + TicketQR): el enlace del SMS. Sin sesión se ve qué es y se entra
   con el teléfono; con sesión, solo la cuenta con ESE teléfono lo recibe (el servidor compara la huella). Nunca se muestra un teléfono. */
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const [{ token }, lang, u] = await Promise.all([params, idioma(), yo()]);
  const t = decodeURIComponent(token);
  const x = await verTransferencia(t, u ? { id: u.id, phone: u.phone } : null, lang === "es");
  if (!x) notFound();
  return <Recibir x={x} token={t} es={lang === "es"} />;
}
