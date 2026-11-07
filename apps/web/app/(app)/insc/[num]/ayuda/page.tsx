import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ayudaDeCita } from "@/lib/ayuda-cita";
import { cabezaAyudaReserva } from "@/lib/ayuda-compra";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { AyudaCita } from "../../../cita/[num]/ayuda/AyudaCita";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ayuda con la inscripción · To'Latino" };

/* APP-NEG-EDU-AYUDA → -ESTADO (4ef): el mismo motor y la misma pantalla que la ayuda con la cita (help_requests, el lugar responde en
   24 h, To'Latino revisa en 48 h con lo que se copió al inscribirse), con los motivos de Educación, Niños y Deporte. «No cuidaron bien a
   mi niño» va directo a To'Latino. Solo quien se inscribió. */
export default async function Page({ params }: { params: Promise<{ num: string }> }) {
  const [{ num }, lang, u] = await Promise.all([params, idioma(), yo()]);
  if (!u) redirect(`/entrar?volver=${encodeURIComponent(`/insc/${num}/ayuda`)}`);
  const [c, a] = await Promise.all([cabezaAyudaReserva(u.id, num), ayudaDeCita(u.id, num)]);
  if (!c || !a) notFound();
  return <AyudaCita c={c} v={a} es={lang === "es"} />;
}
