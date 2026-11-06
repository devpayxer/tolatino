import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { cobroSilla } from "@/lib/sillas";
import { yoMarco } from "../../yo";
import { Silla } from "./Silla";

export const metadata: Metadata = { title: "Tu cuenta de cobro · To'Latino" };
export const dynamic = "force-dynamic";

/* El barbero que renta una silla conecta su cuenta de cobro (3d): los depósitos de sus citas llegan a su banco. Solo esa
   persona; llega desde el aviso «Conecta tu cuenta de cobro». */
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ vuelta?: string }> }) {
  const [{ id }, u, lang, sp] = await Promise.all([params, yo(), idioma(), searchParams]);
  if (!u?.first_name) redirect(`/entrar?volver=${encodeURIComponent(`/cuenta/silla/${id}`)}`);
  const s = await cobroSilla(u.id, id);
  if (!s) notFound();
  return <Silla s={s} vuelta={sp.vuelta === "1"} es={lang === "es"} yo={await yoMarco(u, lang === "es")} />;
}
