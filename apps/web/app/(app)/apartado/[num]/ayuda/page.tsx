import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ayudaDeCita } from "@/lib/ayuda-cita";
import { cabezaAyudaCompra } from "@/lib/ayuda-compra";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { AyudaCita } from "../../../cita/[num]/ayuda/AyudaCita";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ayuda con la compra · To'Latino" };

/* APP-NEG-TIENDA-AYUDA → -ESTADO (neg-tienda-rev.js · thelp): la ayuda con un apartado recogido o entregado (cobraron más,
   no guardaron el apartado, talla equivocada, no aceptan el cambio, llegó dañado). Mismo motor que la ayuda con la cita. */
export default async function Page({ params }: { params: Promise<{ num: string }> }) {
  const [{ num }, lang, u] = await Promise.all([params, idioma(), yo()]);
  if (!u) redirect(`/entrar?volver=${encodeURIComponent(`/apartado/${num}/ayuda`)}`);
  const [c, a] = await Promise.all([cabezaAyudaCompra(u.id, num), ayudaDeCita(u.id, num)]);
  if (!c || !a) notFound();
  return <AyudaCita c={c} v={a} es={lang === "es"} />;
}
