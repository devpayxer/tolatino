import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { inscVista } from "@/lib/inscripciones";
import { InscEstado } from "./InscEstado";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tu inscripción · To'Latino" };

/* APP-NEG-EDU-ESTADO: una inscripción (I-…). Solo la ve quien la pidió (con los datos de su niño, si los hay). */
export default async function Page({ params }: { params: Promise<{ num: string }> }) {
  const [{ num }, lang, u] = await Promise.all([params, idioma(), yo()]);
  if (!u) redirect(`/entrar?volver=${encodeURIComponent(`/insc/${num}`)}`);
  const x = await inscVista(u.id, num);
  if (!x) notFound();
  return <InscEstado x={x} es={lang === "es"} />;
}
