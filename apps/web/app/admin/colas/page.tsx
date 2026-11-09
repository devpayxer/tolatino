import { escalarVencidas } from "@/lib/ayuda";
import { requerir } from "@/lib/admin";
import { caso as leerCaso, colasVisibles, listaCasos, slasColas } from "@/lib/admin-colas";
import type { Cola } from "@/lib/colas";
import { Colas } from "../Colas";
import { valor } from "@/lib/config";

/* ADM-COLAS: ?cola= una cola · ?f=mios|sin|venc · ?caso= abre el detalle. */
export default async function Page({ searchParams }: { searchParams: Promise<{ cola?: string; f?: string; caso?: string }> }) {
  const s = await requerir("colas", "ver");
  const sp = await searchParams;
  await escalarVencidas();
  const vis = colasVisibles(s);
  const cola = vis.includes(sp.cola as Cola) ? (sp.cola as Cola) : null;
  const [l, c, apelarDias, slas] = await Promise.all([
    listaCasos(s, { cola, mios: sp.f === "mios", sinAsignar: sp.f === "sin", vencidos: sp.f === "venc" }),
    sp.caso ? leerCaso(s, sp.caso) : Promise.resolve(null),
    valor("com_apelar_dias"),
    slasColas(),
  ]);
  return <Colas casos={l.casos} conteo={l.conteo} vencidos={l.vencidos} total={l.total} visibles={vis} caso={c} puedeAprobar={s.puede("colas", "aprobar")} apelarDias={apelarDias} slas={slas} />;
}
