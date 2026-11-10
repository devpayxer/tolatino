import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ayudaDeCita } from "@/lib/ayuda-cita";
import { cabezaAyudaVisita } from "@/lib/ayuda-compra";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { AyudaCita } from "../../../cita/[num]/ayuda/AyudaCita";
import { hojaAyuda } from "@/app/(app)/soporte/compa/hoja-ayuda";
import Operacion from "../page";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ayuda con la visita · To'Latino" };

/* APP-NEG-EDU-AYUDA → -ESTADO con visit (4if): el mismo motor y la misma pantalla que la ayuda con la cita y la inscripción (help_requests, el
   negocio responde en 24 h, To'Latino revisa en 48 h comparando con la COPIA del total que la persona vio al pedir). «Me cobraron por ver» y
   «Pidieron más para mudarme» van directo a To'Latino y la propiedad queda en pausa. Nada se cobra en la app: «Que me devuelvan» lo hace el
   negocio y la persona confirma «Me lo devolvieron». Solo quien pidió la visita o la prueba. */
export default async function Page({ params, searchParams }: { params: Promise<{ num: string }>; searchParams: Promise<{ de?: string }> }) {
  const [{ num }, lang, u] = await Promise.all([params, idioma(), yo()]);
  if (!u) redirect(`/entrar?volver=${encodeURIComponent(`/vis/${num}/ayuda`)}`);
  const [c, a] = await Promise.all([cabezaAyudaVisita(u.id, num), ayudaDeCita(u.id, num)]);
  if (!c || !a) notFound();
  // 7d · El Compa primero: donde hoy se abre la «Ayuda con …», la hoja (2as) va antes, sobre la operación. Si no aplica (apagado, al tope, ya hay solicitud…) o falla: lo de siempre.
  const hoja = await hojaAyuda(u, num, (await searchParams).de, ["visit"], () => <Operacion params={params} />);
  if (hoja) return hoja;
  return <AyudaCita c={c} v={a} es={lang === "es"} />;
}
