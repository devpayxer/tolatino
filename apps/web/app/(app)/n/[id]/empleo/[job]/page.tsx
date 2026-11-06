import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { vacanteDetalle } from "@/lib/jobs";
import { Vacante } from "./Vacante";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Vacante · To'Latino" };

/* APP-NEG-JOB (prototipo jobDetVals): la vacante con pago real por hora, lo que piden y ofrecen, tu solicitud y parecidas. */
export default async function Page({ params }: { params: Promise<{ id: string; job: string }> }) {
  const [{ id, job }, lang, u] = await Promise.all([params, idioma(), yo()]);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) notFound();
  const v = await vacanteDetalle(id, job, u?.id ?? null);
  if (!v) notFound();
  return <Vacante v={v} negocio={id} sesion={!!u} es={lang === "es"} />;
}
