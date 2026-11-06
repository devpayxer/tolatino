import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { opcionesApartar } from "@/lib/apartados";
import { Apartar } from "./Apartar";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tu apartado · To'Latino" };

/* APP-NEG-TIENDA-APARTADO: lo que apartaste en la Tienda de la ficha (el carrito vive en el teléfono), cuándo pasas y
   revisar y enviar. Los días y horas salen del horario de la tienda (el servidor decide). Enviar pide cuenta. */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, lang, u] = await Promise.all([params, idioma(), yo()]);
  const o = await opcionesApartar(id);
  if (!o) redirect(`/n/${id}`);
  return <Apartar o={o} es={lang === "es"} yo={!!u} />;
}
