import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { nocheVista } from "@/lib/noche-reservas";
import { NocheEstado } from "./NocheEstado";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tu noche · To'Latino" };

/* APP-NEG-NOCHE-ESTADO: una lista o una mesa (N-…). Solo la ve quien la pidió (el código de la puerta es solo suyo). */
export default async function Page({ params }: { params: Promise<{ num: string }> }) {
  const [{ num }, lang, u] = await Promise.all([params, idioma(), yo()]);
  if (!u) redirect(`/entrar?volver=${encodeURIComponent(`/noche/${num}`)}`);
  const x = await nocheVista(u.id, num);
  if (!x) notFound();
  return <NocheEstado x={x} es={lang === "es"} />;
}
