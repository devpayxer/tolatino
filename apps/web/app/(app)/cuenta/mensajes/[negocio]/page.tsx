import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { conversacionCliente } from "@/lib/mensajes";
import { yoMarco } from "../../yo";
import { Chat } from "./Chat";

export const metadata: Metadata = { title: "Mensajes · To'Latino" };
export const dynamic = "force-dynamic";

/* USR-CHAT-NEG (diseño chatV): la conversación con un negocio. ?op= el pedido o la reservación de donde vienes. */
export default async function Page({ params, searchParams }: { params: Promise<{ negocio: string }>; searchParams: Promise<{ op?: string }> }) {
  const [u, lang, { negocio }, sp] = await Promise.all([yo(), idioma(), params, searchParams]);
  const volver = `/cuenta/mensajes/${negocio}${sp.op ? `?op=${encodeURIComponent(sp.op)}` : ""}`;
  if (!u?.first_name) redirect(`/entrar?volver=${encodeURIComponent(volver)}`);
  const [c, me] = await Promise.all([conversacionCliente(u.id, negocio, sp.op ?? null), yoMarco(u, lang === "es")]);
  if (!c) notFound();
  return <Chat c={c} op={sp.op ?? null} es={lang === "es"} yo={me} />;
}
