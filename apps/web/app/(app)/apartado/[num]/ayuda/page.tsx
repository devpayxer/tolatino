import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ayudaDeCita } from "@/lib/ayuda-cita";
import { cabezaAyudaCompra } from "@/lib/ayuda-compra";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { AyudaCita } from "../../../cita/[num]/ayuda/AyudaCita";
import { hojaAyuda } from "@/app/(app)/soporte/compa/hoja-ayuda";
import Operacion from "../page";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ayuda con la compra · To'Latino" };

/* APP-NEG-TIENDA-AYUDA → -ESTADO (neg-tienda-rev.js · thelp): la ayuda con un apartado recogido o entregado (cobraron más,
   no guardaron el apartado, talla equivocada, no aceptan el cambio, llegó dañado). Mismo motor que la ayuda con la cita. */
export default async function Page({ params, searchParams }: { params: Promise<{ num: string }>; searchParams: Promise<{ de?: string }> }) {
  const [{ num }, lang, u] = await Promise.all([params, idioma(), yo()]);
  if (!u) redirect(`/entrar?volver=${encodeURIComponent(`/apartado/${num}/ayuda`)}`);
  const [c, a] = await Promise.all([cabezaAyudaCompra(u.id, num), ayudaDeCita(u.id, num)]);
  if (!c || !a) notFound();
  // 7d · El Compa primero: donde hoy se abre la «Ayuda con …», la hoja (2as) va antes, sobre la operación. Si no aplica (apagado, al tope, ya hay solicitud…) o falla: lo de siempre.
  const hoja = await hojaAyuda(u, num, (await searchParams).de, ["hold"], () => <Operacion params={params} />);
  if (hoja) return hoja;
  return <AyudaCita c={c} v={a} es={lang === "es"} />;
}
