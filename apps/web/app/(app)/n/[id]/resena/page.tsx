import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { paraEscribir } from "@/lib/resenas";
import { Escribir } from "./Escribir";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Escribir reseña · To'Latino" };

/* APP-NEG-RESENA (prototipo revWVals): escribir o editar la reseña. Sin sesión → Entra y vuelve aquí. Con reseña ya
   publicada y fuera de las 48 h → su estado. ?pedido = el pedido o la mesa que la hace verificada; ?e = estrellas. */
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ pedido?: string; e?: string }> }) {
  const [{ id }, lang, u, sp] = await Promise.all([params, idioma(), yo(), searchParams]);
  const aqui = `/n/${id}/resena${sp.pedido || sp.e ? `?${new URLSearchParams({ ...(sp.pedido ? { pedido: sp.pedido } : {}), ...(sp.e ? { e: sp.e } : {}) })}` : ""}`;
  if (!u?.first_name) redirect(`/entrar?volver=${encodeURIComponent(aqui)}`);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) notFound();
  const numero = typeof sp.pedido === "string" && /^[A-Z0-9-]{1,20}$/i.test(sp.pedido) ? sp.pedido : null;
  const d = await paraEscribir(id, u.id, numero);
  if (!d) notFound();
  if (d.mia && !d.mia.puede) redirect(`/n/${id}/resena/tuya`);
  const e = Number(sp.e);
  const nombre = `${u.first_name}${u.last_name ? ` ${u.last_name.slice(0, 1).toUpperCase()}.` : ""}`;
  return <Escribir d={d} es={lang === "es"} nombre={nombre} estrellas={Number.isInteger(e) && e >= 1 && e <= 5 ? e : 0} />;
}
