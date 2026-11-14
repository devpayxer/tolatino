import { requerir } from "@/lib/admin";
import { datosDisputas, type FiltroDisp } from "@/lib/admin-disputas";
import { DisputasTx } from "../../DisputasTx";

/* 9k · ADM-TX › Disputas: la cola de 120 h con su evidencia (L357, L393). Solo lectura aquí; se responde en el caso de Colas. */
const F = new Set<FiltroDisp>(["abiertas", "vencen", "revisa", "cerradas"]);
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await requerir("tx", "ver");
  const sp = await searchParams, f = (F.has(sp.f as FiltroDisp) ? sp.f : "abiertas") as FiltroDisp;
  const d = await datosDisputas(s, f, /^\d{1,18}$/.test(sp.antes ?? "") ? sp.antes! : null);
  return <DisputasTx d={d} f={f} />;
}
