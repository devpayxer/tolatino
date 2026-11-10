import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ayudaDeCita } from "@/lib/ayuda-cita";
import { cabezaAyudaBoletos } from "@/lib/ayuda-compra";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { AyudaCita } from "../../../../cita/[num]/ayuda/AyudaCita";
import { hojaAyuda } from "@/app/(app)/soporte/compa/hoja-ayuda";
import Operacion from "../page";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ayuda con la orden · To'Latino", robots: { index: false } };

/* APP-EVT-AYUDA-PAGO (hueco #3 del plan 6d, compuesto con la ayuda con el pedido 2h / la cita 3e): «Un problema con el pago» de una orden de
   boletos B-…. El mismo motor y la misma pantalla (help_requests, una por orden), con los motivos de boletos; va directo a To'Latino (cola
   «Ayuda con pedidos», sop): el cobro de boletos es de la plataforma. Solo quien compró (la de otra persona no existe). */
export default async function Page({ params, searchParams }: { params: Promise<{ num: string }>; searchParams: Promise<{ de?: string }> }) {
  const [{ num }, lang, u] = await Promise.all([params, idioma(), yo()]);
  if (!u) redirect(`/entrar?volver=${encodeURIComponent(`/eventos/orden/${num}/ayuda`)}`);
  const [c, a] = await Promise.all([cabezaAyudaBoletos(u.id, decodeURIComponent(num)), ayudaDeCita(u.id, decodeURIComponent(num))]);
  if (!c || !a) notFound();
  // 7d · El Compa primero: donde hoy se abre la «Ayuda con …», la hoja (2as) va antes, sobre la operación. Si no aplica (apagado, al tope, ya hay solicitud…) o falla: lo de siempre.
  const hoja = await hojaAyuda(u, decodeURIComponent(num), (await searchParams).de, ["tickets"], () => <Operacion params={params} />);
  if (hoja) return hoja;
  return <AyudaCita c={c} v={a} es={lang === "es"} />;
}
