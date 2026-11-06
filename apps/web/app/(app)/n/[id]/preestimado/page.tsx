import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { oficiosPublico } from "@/lib/oficios-publico";
import { PRE_K } from "@/lib/solicitudes";
import { PreEstimado } from "./PreEstimado";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pre-estimado · To'Latino" };

/* APP-NEG-AUTO-PREEST / APP-NEG-HOGAR-PREEST: llega desde la hoja del servicio (?s=servicio). Solo para servicios sin precio
   cerrado (Auto «desde» y «se cotiza»; Hogar visita, por hora y por medida). Ver no pide cuenta; mandar sí. */
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ s?: string }> }) {
  const [{ id }, sp, lang, u] = await Promise.all([params, searchParams, idioma(), yo()]);
  const op = await oficiosPublico(id, u?.id ?? null);
  if (!op) notFound();
  const s = op.servicios.find((x) => x.id === sp.s);
  if (!op.can || !s || !PRE_K[op.rubro]!.includes(s.k)) redirect(`/n/${id}?tab=svc`);
  return <PreEstimado op={op} svcId={s.id} es={lang === "es"} yo={!!u} />;
}
