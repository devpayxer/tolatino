import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { pedidoDe } from "@/lib/pedir";
import { Cancelar } from "./Cancelar";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Cancelar pedido · To'Latino" };

/* APP-NEG-PEDIDO-CANCELAR (prototipo, plantilla de Ayuda con el pedido · paso cancelar). Solo quien hizo el pedido. */
export default async function Page({ params }: { params: Promise<{ num: string }> }) {
  const [{ num }, lang, u] = await Promise.all([params, idioma(), yo()]);
  if (!u) redirect(`/entrar?volver=${encodeURIComponent(`/pedido/${num}/cancelar`)}`);
  const p = await pedidoDe(u.id, num, lang);
  if (!p) notFound();
  return <Cancelar p={p} es={lang === "es"} />;
}
