import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { avisosDe } from "@/lib/perfil";
import { valor } from "@/lib/config";
import { yoMarco } from "../yo";
import { Avisos } from "./Avisos";

export const metadata: Metadata = { title: "Avisos · To'Latino" };
export const dynamic = "force-dynamic";

/* USR-AVISOS (diseño notifV): qué te llega y cuándo. Se guarda hoy y se aplica cuando salgan los avisos. */
export default async function Page() {
  const [u, lang] = await Promise.all([yo(), idioma()]);
  if (!u?.first_name) redirect(`/entrar?volver=${encodeURIComponent("/cuenta/avisos")}`);
  const [p, me, hora] = await Promise.all([avisosDe(u.id), yoMarco(u, lang === "es"), valor("com_resumen_hora")]);
  return <Avisos p={p} es={lang === "es"} yo={me} horaResumen={hora} />;
}
