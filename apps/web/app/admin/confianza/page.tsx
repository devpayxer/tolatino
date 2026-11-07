import { requerir } from "@/lib/admin";
import { confianza } from "@/lib/admin-confianza";
import { Confianza } from "../Confianza";

/* 5d · ADM-CONF · Confianza y seguridad: reportes (unidos con Colas), catálogo de sanciones, sancionados, apelaciones (segunda
   revisión), fraude y bloqueos, privacidad (solo lectura). ?tab= la pestaña. Por ciudad de quien mira. */
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const s = await requerir("conf", "ver");
  const sp = await searchParams;
  const tab = (["res", "sanc", "act", "apel", "fraud", "priv"] as const).find((x) => x === sp.tab) ?? "res";
  return <Confianza d={await confianza(s)} tab={tab} />;
}
