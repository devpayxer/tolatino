import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { accesoPanel } from "@/lib/panel";
import { idioma } from "@/lib/idioma";
import { yo } from "@/lib/cuenta";
import { misArchivos } from "@/lib/datos/exportar";
import { valor } from "@/lib/config";
import { Exportar } from "./Exportar";

export const metadata: Metadata = { title: "Exportar los datos del negocio · To'Latino" };
export const dynamic = "force-dynamic";

/* 9d · DASH-EXPORTAR · Panel › Más › Exportar los datos del negocio: lo que el panel ya muestra, en un ZIP (solo el dueño lo pide y lo baja). */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await yo();
  if (!me) redirect(`/entrar?volver=${encodeURIComponent(`/panel/${id}/exportar`)}`);
  const acc = await accesoPanel(id);
  if (!acc) notFound();
  const lang = await idioma();
  const [archivos, dias] = acc.kind === "owner" ? await Promise.all([misArchivos(me.id, acc.negocio.id), valor("export_cada_dias")]) : [[], 7];
  return <Exportar es={lang === "es"} negocio={{ id: acc.negocio.id, name: acc.negocio.name }} dueno={acc.kind === "owner"} tel={me.phone} archivos={archivos} dias={dias}
    pruebas={process.env.TOLATINO_SMS_MODO === "pruebas"} />;
}
