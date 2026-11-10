import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ayudaDeCita } from "@/lib/ayuda-cita";
import { citaVista } from "@/lib/citas";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { AyudaCita } from "./AyudaCita";
import { hojaAyuda } from "@/app/(app)/soporte/compa/hoja-ayuda";
import Operacion from "../page";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ayuda con la cita · To'Latino" };

/* APP-NEG-CITA-AYUDA y APP-NEG-CITA-AYUDA-ESTADO (diseño neg-cita-help.js, TLCitaHelp bhelp): si aún no hay solicitud,
   el formulario (motivo, qué pasó, fotos, qué quieres); si ya la hay, su estado. Solo quien pidió la cita. */
export default async function Page({ params, searchParams }: { params: Promise<{ num: string }>; searchParams: Promise<{ de?: string }> }) {
  const [{ num }, lang, u] = await Promise.all([params, idioma(), yo()]);
  if (!u) redirect(`/entrar?volver=${encodeURIComponent(`/cita/${num}/ayuda`)}`);
  const [c, a] = await Promise.all([citaVista(u.id, num), ayudaDeCita(u.id, num)]);
  if (!c || !a) notFound();
  // 7d · El Compa primero: donde hoy se abre la «Ayuda con …», la hoja (2as) va antes, sobre la operación. Si no aplica (apagado, al tope, ya hay solicitud…) o falla: lo de siempre.
  const hoja = await hojaAyuda(u, num, (await searchParams).de, ["appointment"], () => <Operacion params={params} searchParams={Promise.resolve({})} />);
  if (hoja) return hoja;
  return <AyudaCita c={c} v={a} es={lang === "es"} />;
}
