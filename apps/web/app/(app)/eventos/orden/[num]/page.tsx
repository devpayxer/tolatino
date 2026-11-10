import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { ordenBoletos } from "@/lib/boletos";
import { idioma } from "@/lib/idioma";
import { Orden } from "./Orden";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tu orden · To'Latino", robots: { index: false } };

/* APP-EVT-ORDEN (prototipo odVals L1399): solo quien compró la ve (se busca por su cuenta; la de otra persona no existe). */
export default async function Page({ params }: { params: Promise<{ num: string }> }) {
  const [{ num }, lang, u] = await Promise.all([params, idioma(), yo()]);
  if (!u) redirect(`/entrar?volver=${encodeURIComponent(`/eventos/orden/${num}`)}`);
  const o = await ordenBoletos(u.id, decodeURIComponent(num), lang === "es");
  if (!o) notFound();
  // 6e · Cancelado por el organizador, cambió de fecha (y la elección) y sus avisos.
  const cambio = await (await import("@/lib/evt-cambios")).cambioOrden(u.id, o.numero);
  return <Orden o={o} es={lang === "es"} cambio={cambio} />;
}
