import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { pedidoDe } from "@/lib/pedir";
import { Pedido } from "./Pedido";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tu pedido · To'Latino" };

/* APP-NEG-PEDIDO (prototipo ordVals): el pedido que hizo la persona. Solo lo ve quien lo hizo. */
export default async function Page({ params }: { params: Promise<{ num: string }> }) {
  const [{ num }, lang, u] = await Promise.all([params, idioma(), yo()]);
  if (!u) redirect(`/entrar?volver=${encodeURIComponent(`/pedido/${num}`)}`);
  const p = await pedidoDe(u.id, num, lang);
  if (!p) notFound();
  return <Pedido p={p} es={lang === "es"} />;
}
