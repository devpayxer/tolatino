import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { miBoleto } from "@/lib/boletos";
import { Boleto } from "./Boleto";

export const metadata: Metadata = { title: "Tu boleto · To'Latino", robots: { index: false } };
export const dynamic = "force-dynamic";

/* USR-BOLETO: el QR grande de un boleto. Solo el de la persona (el de otra no existe para ella). */
export default async function Page({ params, searchParams }: { params: Promise<{ codigo: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const [{ codigo }, lang, u, sp] = await Promise.all([params, idioma(), yo(), searchParams]);
  if (!u) redirect(`/entrar?volver=${encodeURIComponent(`/cuenta/boletos/${codigo}`)}`);
  const b = await miBoleto(u.id, decodeURIComponent(codigo).toUpperCase(), lang === "es");
  if (!b) notFound();
  // 8g · Qué botones de Wallet salen: lo decide el servidor (boleto vivo, sin transferencia pendiente, interruptor y llaves).
  const wallet = await (await import("@/lib/pases/pases")).disponible(u.id, b.b.code).catch(() => ({ apple: false, google: false }));
  return <Boleto x={b} es={lang === "es"} wallet={wallet} walletNo={sp.wallet === "no"} />;
}
