import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { vacanteDetalle } from "@/lib/jobs";
import { Aplicar } from "./Aplicar";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Aplicar · To'Latino" };

/* APP-NEG-JOB-APLICAR (prototipo jobApVals): perfil corto sin CV. Sin sesión → Entra y vuelve. Si ya tiene una solicitud
   viva para esta vacante → su estado. */
export default async function Page({ params }: { params: Promise<{ id: string; job: string }> }) {
  const [{ id, job }, lang, u] = await Promise.all([params, idioma(), yo()]);
  if (!u?.first_name) redirect(`/entrar?volver=${encodeURIComponent(`/n/${id}/empleo/${job}/aplicar`)}`);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) notFound();
  const v = await vacanteDetalle(id, job, u.id);
  if (!v) notFound();
  if (v.app && v.app.status !== "withdrawn") redirect(`/solicitud/${v.app.number}`);
  const nombre = [u.first_name, u.last_name].filter(Boolean).join(" ");
  return <Aplicar v={v} negocio={id} nombre={nombre} tel={u.phone} es={lang === "es"} />;
}
