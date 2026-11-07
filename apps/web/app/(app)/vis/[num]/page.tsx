import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { visVista } from "@/lib/visitas-inm";
import { VisEstado } from "./VisEstado";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tu visita · To'Latino" };

/* APP-NEG-EDU-ESTADO con visit (D-…). Solo la ve quien la pidió; la dirección exacta de la propiedad llega aquí cuando la confirman. */
export default async function Page({ params }: { params: Promise<{ num: string }> }) {
  const [{ num }, lang, u] = await Promise.all([params, idioma(), yo()]);
  if (!u) redirect(`/entrar?volver=${encodeURIComponent(`/vis/${num}`)}`);
  const x = await visVista(u.id, num);
  if (!x) notFound();
  return <VisEstado x={x} es={lang === "es"} />;
}
