import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { fiestaVista } from "@/lib/fiestas-reservas";
import { FiestaEstado } from "./FiestaEstado";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tu fiesta · To'Latino" };

/* APP-NEG-FIESTA-CITA: una fiesta (F-…). Solo la ve quien la pidió. Al abrirla corre su barrido (vence, otra hora, terminó). */
export default async function Page({ params }: { params: Promise<{ num: string }> }) {
  const [{ num }, lang, u] = await Promise.all([params, idioma(), yo()]);
  if (!u) redirect(`/entrar?volver=${encodeURIComponent(`/fiesta/${num}`)}`);
  const x = await fiestaVista(u.id, num);
  if (!x) notFound();
  return <FiestaEstado x={x} es={lang === "es"} />;
}
