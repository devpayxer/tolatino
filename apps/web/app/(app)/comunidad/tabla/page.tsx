import { tabla } from "@/lib/tabla";
import { conCuenta } from "../sesion";
import { TablaBarrio } from "./Tabla";

export const dynamic = "force-dynamic";

/* APP-GAM-TABLA · la Tabla del Barrio (prototipo tablaV): mes en curso y el anterior (?m=anterior), pestañas General · Recomendaciones ·
   Respuestas (?t=rec · ?t=resp), tu lugar, los excluidos no salen. De la ciudad que se está viendo. Solo con cuenta. */
export default async function Page({ searchParams }: { searchParams: Promise<{ m?: string; t?: string }> }) {
  const s = await conCuenta("/comunidad/tabla");
  const sp = await searchParams;
  const mes = sp.m === "anterior" ? "anterior" : "actual", tab = sp.t === "rec" ? "rec" : sp.t === "resp" ? "resp" : "general";
  const d = await tabla(s.u.id, s.loc.c.id, mes, tab, null);
  return <TablaBarrio es={s.es} yo={s.me} ciudad={s.ciudad} d={d} />;
}
