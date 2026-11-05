import { requerir } from "@/lib/admin";
import { caso as leerCaso, colasVisibles, listaCasos } from "@/lib/admin-colas";
import type { Cola } from "@/lib/colas";
import { Colas } from "../Colas";

/* ADM-COLAS: ?cola= una cola · ?f=mios|sin|venc · ?caso= abre el detalle. */
export default async function Page({ searchParams }: { searchParams: Promise<{ cola?: string; f?: string; caso?: string }> }) {
  const s = await requerir("colas", "ver");
  const sp = await searchParams;
  const vis = colasVisibles(s);
  const cola = vis.includes(sp.cola as Cola) ? (sp.cola as Cola) : null;
  const [l, c] = await Promise.all([
    listaCasos(s, { cola, mios: sp.f === "mios", sinAsignar: sp.f === "sin", vencidos: sp.f === "venc" }),
    sp.caso ? leerCaso(s, sp.caso) : Promise.resolve(null),
  ]);
  return <Colas casos={l.casos} conteo={l.conteo} vencidos={l.vencidos} total={l.total} visibles={vis} caso={c} puedeAprobar={s.puede("colas", "aprobar")} />;
}
