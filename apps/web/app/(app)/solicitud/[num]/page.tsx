import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { miSolicitud } from "@/lib/jobs";
import { Solicitud } from "./Solicitud";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tu solicitud · To'Latino" };

/* APP-NEG-JOB-ESTADO (prototipo jobStVals): la solicitud de empleo de la persona. Solo la ve quien la mandó. */
export default async function Page({ params, searchParams }: { params: Promise<{ num: string }>; searchParams: Promise<{ ok?: string }> }) {
  const [{ num }, lang, u, sp] = await Promise.all([params, idioma(), yo(), searchParams]);
  if (!u) redirect(`/entrar?volver=${encodeURIComponent(`/solicitud/${num}`)}`);
  const a = await miSolicitud(decodeURIComponent(num), u.id);
  if (!a) notFound();
  return <Solicitud a={a} es={lang === "es"} enviada={sp.ok === "1"} />;
}
