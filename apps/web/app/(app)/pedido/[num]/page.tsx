import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { MomentoAvisos } from "@/app/_cascara/HojaPermiso";
import { idioma } from "@/lib/idioma";
import { ayudaDePedido } from "@/lib/ayuda";
import { pedidoDe } from "@/lib/pedir";
import { Pedido } from "./Pedido";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tu pedido · To'Latino" };

/* APP-NEG-PEDIDO (prototipo ordVals): el pedido que hizo la persona. Solo lo ve quien lo hizo. */
export default async function Page({ params }: { params: Promise<{ num: string }> }) {
  const [{ num }, lang, u] = await Promise.all([params, idioma(), yo()]);
  if (!u) redirect(`/entrar?volver=${encodeURIComponent(`/pedido/${num}`)}`);
  const [p, a] = await Promise.all([pedidoDe(u.id, num, lang), ayudaDePedido(u.id, num)]);
  if (!p) notFound();
  // 8c · El momento útil para ofrecer los avisos en este teléfono (una vez; nunca al abrir la app por primera vez).
  return <><Pedido p={p} es={lang === "es"} ayuda={a ? { a: a.a, puede: a.puede } : null} /><MomentoAvisos es={lang === "es"} /></>;
}
