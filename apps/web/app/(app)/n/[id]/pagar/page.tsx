import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { menuPublico } from "@/lib/pedir";
import { Pagar } from "./Pagar";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Finalizar pedido · To'Latino" };

/* APP-NEG-CHECKOUT (prototipo ckVals, master 1f · pantalla 3): pickup con pago en el local. Sin sesión → Entra y vuelve. */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, lang, u] = await Promise.all([params, idioma(), yo()]);
  if (!u?.first_name) redirect(`/entrar?volver=${encodeURIComponent(`/n/${id}/pagar`)}`);
  const m = await menuPublico(id, lang);
  if (!m || m.vacio) notFound();
  return <Pagar m={m} es={lang === "es"} />;
}
