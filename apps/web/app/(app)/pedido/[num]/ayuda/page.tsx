import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ayudaDePedido } from "@/lib/ayuda";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { pedidoDe } from "@/lib/pedir";
import { Ayuda } from "./Ayuda";
import { hojaAyuda } from "@/app/(app)/soporte/compa/hoja-ayuda";
import Operacion from "../page";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ayuda con el pedido · To'Latino" };

/* APP-NEG-PEDIDO-AYUDA (prototipo helpVals, pedido entregado): qué pasó, qué platos, qué te gustaría, y la solicitud al
   negocio. Solo quien hizo el pedido; si ya hay solicitud, vuelve al pedido (ahí se ve su estado). */
export default async function Page({ params, searchParams }: { params: Promise<{ num: string }>; searchParams: Promise<{ de?: string }> }) {
  const [{ num }, lang, u] = await Promise.all([params, idioma(), yo()]);
  if (!u) redirect(`/entrar?volver=${encodeURIComponent(`/pedido/${num}/ayuda`)}`);
  const [p, a] = await Promise.all([pedidoDe(u.id, num, lang), ayudaDePedido(u.id, num)]);
  if (!p || !a) notFound();
  if (a.a) redirect(`/pedido/${num}`);
  // 7d · El Compa primero: donde hoy se abre la «Ayuda con …», la hoja (2as) va antes, sobre la operación. Si no aplica (apagado, al tope, ya hay solicitud…) o falla: lo de siempre.
  const hoja = await hojaAyuda(u, num, (await searchParams).de, ["order"], () => <Operacion params={params} />);
  if (hoja) return hoja;
  return <Ayuda p={p} puede={a.puede} delivery={a.delivery} lineas={a.lineas} es={lang === "es"} />;
}
