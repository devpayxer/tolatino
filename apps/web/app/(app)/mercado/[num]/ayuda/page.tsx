import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ayudaDeCita } from "@/lib/ayuda-cita";
import { cabezaAyudaCompra } from "@/lib/ayuda-compra";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { AyudaCita } from "../../../cita/[num]/ayuda/AyudaCita";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ayuda con el pedido · To'Latino" };

/* APP-NEG-MERC-AYUDA → -ESTADO (neg-merc-rev.js · mhelp): el mismo motor y la misma pantalla que la ayuda con la cita
   (help_requests, 24 h para el mercado, To'Latino revisa en 48 h), con los motivos del mercado. Solo quien pidió. */
export default async function Page({ params }: { params: Promise<{ num: string }> }) {
  const [{ num }, lang, u] = await Promise.all([params, idioma(), yo()]);
  if (!u) redirect(`/entrar?volver=${encodeURIComponent(`/mercado/${num}/ayuda`)}`);
  const [c, a] = await Promise.all([cabezaAyudaCompra(u.id, num), ayudaDeCita(u.id, num)]);
  if (!c || !a) notFound();
  return <AyudaCita c={c} v={a} es={lang === "es"} />;
}
