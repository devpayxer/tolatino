import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { oficiosPublico } from "@/lib/oficios-publico";
import { candidatosPq } from "@/lib/solicitudes";
import { Presupuestos } from "./Presupuestos";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Presupuesto a hasta 3 · To'Latino" };

/* APP-NEG-HOGAR-PRESUPUESTOS: llega desde la hoja de un servicio «presupuesto» (?s=servicio). Ver no pide cuenta; mandar sí. */
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ s?: string }> }) {
  const [{ id }, sp, lang, u] = await Promise.all([params, searchParams, idioma(), yo()]);
  const op = await oficiosPublico(id, u?.id ?? null);
  if (!op) notFound();
  const s = op.servicios.find((x) => x.id === sp.s);
  if (!op.can || op.rubro !== "hogar" || !s || s.k !== "pres") redirect(`/n/${id}?tab=svc`);
  const cands = await candidatosPq(u?.id ?? null, id, s.id);
  return <Presupuestos op={op} svcId={s.id} cands={cands} es={lang === "es"} yo={!!u} />;
}
