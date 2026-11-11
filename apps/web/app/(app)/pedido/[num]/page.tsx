import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { MomentoAvisos } from "@/app/_cascara/HojaPermiso";
import { idioma } from "@/lib/idioma";
import { ayudaDePedido } from "@/lib/ayuda";
import { pedidoDe } from "@/lib/pedir";
import { clienteVeRuta } from "@/lib/ruta";
import { Pedido } from "./Pedido";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tu pedido · To'Latino" };

/* APP-NEG-PEDIDO (prototipo ordVals): el pedido que hizo la persona. Solo lo ve quien lo hizo. */
export default async function Page({ params }: { params: Promise<{ num: string }> }) {
  const [{ num }, lang, u] = await Promise.all([params, idioma(), yo()]);
  if (!u) redirect(`/entrar?volver=${encodeURIComponent(`/pedido/${num}`)}`);
  const [p, a] = await Promise.all([pedidoDe(u.id, num, lang), ayudaDePedido(u.id, num)]);
  if (!p) notFound();
  // 8e · El mapa en vivo del repartidor: solo el cliente de ESTE pedido, desde «Recogí» (el SSE lo vuelve a revisar en cada cambio).
  const ruta = p.delivery && p.status === "confirmed" ? await clienteVeRuta(u.id, num) : false;
  // 8c · El momento útil para ofrecer los avisos en este teléfono (una vez; nunca al abrir la app por primera vez).
  return <><Pedido p={p} es={lang === "es"} ayuda={a ? { a: a.a, puede: a.puede } : null} ruta={ruta} /><MomentoAvisos es={lang === "es"} /></>;
}
