import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { solicitudVista } from "@/lib/solicitudes";
import { Solicitud } from "./Solicitud";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tu pre-estimado · To'Latino" };

/* Estado de un pre-estimado, un presupuesto o una emergencia (P-, Q-, E-). Solo lo ve quien lo pidió. */
export default async function Page({ params }: { params: Promise<{ num: string }> }) {
  const [{ num }, lang, u] = await Promise.all([params, idioma(), yo()]);
  if (!u) redirect(`/entrar?volver=${encodeURIComponent(`/pre/${num}`)}`);
  const s = await solicitudVista(u.id, num);
  if (!s) notFound();
  return <Solicitud s={s} es={lang === "es"} />;
}
