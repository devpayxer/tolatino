import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { miResena } from "@/lib/resenas";
import { Tuya } from "./Tuya";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tu reseña · To'Latino" };

/* APP-NEG-RESENA-ESTADO (prototipo revSVals): la reseña propia, su estado, hasta cuándo se edita, Editar y Borrar. */
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string }> }) {
  const [{ id }, lang, u, sp] = await Promise.all([params, idioma(), yo(), searchParams]);
  if (!u?.first_name) redirect(`/entrar?volver=${encodeURIComponent(`/n/${id}/resena/tuya`)}`);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) notFound();
  const m = await miResena(id, u.id);
  if (!m) redirect(`/n/${id}/resena`);
  return <Tuya m={m} es={lang === "es"} nombre={u.first_name} flash={sp.ok === "1" ? 1 : sp.ok === "2" ? 2 : 0} />;
}
