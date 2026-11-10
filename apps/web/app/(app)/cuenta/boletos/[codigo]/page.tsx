import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { miBoleto } from "@/lib/boletos";
import { Boleto } from "./Boleto";

export const metadata: Metadata = { title: "Tu boleto · To'Latino", robots: { index: false } };
export const dynamic = "force-dynamic";

/* USR-BOLETO: el QR grande de un boleto. Solo el de la persona (el de otra no existe para ella). */
export default async function Page({ params }: { params: Promise<{ codigo: string }> }) {
  const [{ codigo }, lang, u] = await Promise.all([params, idioma(), yo()]);
  if (!u) redirect(`/entrar?volver=${encodeURIComponent(`/cuenta/boletos/${codigo}`)}`);
  const b = await miBoleto(u.id, decodeURIComponent(codigo).toUpperCase(), lang === "es");
  if (!b) notFound();
  return <Boleto x={b} es={lang === "es"} />;
}
