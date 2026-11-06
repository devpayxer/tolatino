import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { apartadoVista } from "@/lib/apartados";
import { ApartadoEstado } from "./ApartadoEstado";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tu apartado · To'Latino" };

/* APP-NEG-TIENDA-ESTADO: un apartado (A-…). Solo lo ve quien lo hizo. Al abrirlo corre su barrido (vence). */
export default async function Page({ params }: { params: Promise<{ num: string }> }) {
  const [{ num }, lang, u] = await Promise.all([params, idioma(), yo()]);
  if (!u) redirect(`/entrar?volver=${encodeURIComponent(`/apartado/${num}`)}`);
  const x = await apartadoVista(u.id, num);
  if (!x) notFound();
  return <ApartadoEstado x={x} es={lang === "es"} />;
}
