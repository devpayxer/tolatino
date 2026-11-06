import { requerir } from "@/lib/admin";
import { datosPlanes, ingresos, type TabPlan } from "@/lib/admin-planes";
import { procesar } from "@/lib/suscripcion";
import { Planes } from "../Planes";

/* ADM-PLAN · Planes y suscripciones (Planes, Suscripciones, Comisiones, Ingresos). */
const EST = new Set(["trial", "active", "canceling", "past_due", "courtesy", "ended"]);
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await requerir("plan", "ver");
  const sp = await searchParams, tab = (sp.tab === "subs" || sp.tab === "fees" || sp.tab === "ing" ? sp.tab : "res") as TabPlan, est = EST.has(sp.est ?? "") ? sp.est! : null;
  await procesar().catch(() => undefined);
  const [d, ing] = await Promise.all([datosPlanes(s, tab, est), tab === "ing" ? ingresos(s) : Promise.resolve(null)]);
  return <Planes d={d} ing={ing} tab={tab} est={est} editar={s.puede("plan", "editar")} aprobar={s.puede("plan", "aprobar")} exportar={s.puede("tx", "exportar")} />;
}
