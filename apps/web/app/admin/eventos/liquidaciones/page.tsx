import { requerir } from "@/lib/admin";
import { liquidacionesAdmin } from "@/lib/evt-liquidacion";
import { Liquidaciones } from "../../Liquidaciones";

/* 6e · Super Admin › Eventos y boletos › Liquidaciones (Dinero de eventos): lo que se le paga a cada organizador por fecha el martes
   después, retenido con su motivo, en camino o pagado; retener o soltar con motivo (tx:aprobar) y CSV (tx:exportar). Por ciudad. */
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await requerir("tx", "ver");
  const sp = await searchParams, st = sp.st ?? null, q = String(sp.q ?? "").slice(0, 60);
  const d = await liquidacionesAdmin(s, st, q);
  return <Liquidaciones d={d} st={st} q={q} puede={{ decidir: s.puede("tx", "aprobar"), exportar: s.puede("tx", "exportar") }} />;
}
