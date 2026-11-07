import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ayudaDeCita } from "@/lib/ayuda-cita";
import { cabezaAyudaReserva } from "@/lib/ayuda-compra";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { AyudaCita } from "../../../cita/[num]/ayuda/AyudaCita";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ayuda con la noche · To'Latino" };

/* APP-NEG-NOCHE-AYUDA → -ESTADO (4nd): el mismo motor y la misma pantalla que la ayuda con la cita (help_requests, el local responde en
   24 h, To'Latino revisa en 48 h mirando lo que el local publicó esa noche), con los motivos de Noche. Solo quien reservó. */
export default async function Page({ params }: { params: Promise<{ num: string }> }) {
  const [{ num }, lang, u] = await Promise.all([params, idioma(), yo()]);
  if (!u) redirect(`/entrar?volver=${encodeURIComponent(`/noche/${num}/ayuda`)}`);
  const [c, a] = await Promise.all([cabezaAyudaReserva(u.id, num), ayudaDeCita(u.id, num)]);
  if (!c || !a) notFound();
  return <AyudaCita c={c} v={a} es={lang === "es"} />;
}
