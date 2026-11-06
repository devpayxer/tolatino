import { requerir } from "@/lib/admin";
import { datosPlanes, type TabPlan } from "@/lib/admin-planes";
import { procesar } from "@/lib/suscripcion";
import { Planes } from "../Planes";

/* ADM-PLAN · Planes y suscripciones. */
const EST = new Set(["trial", "active", "canceling", "past_due", "courtesy", "ended"]);
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await requerir("plan", "ver");
  const sp = await searchParams, tab = (sp.tab === "subs" || sp.tab === "fees" ? sp.tab : "res") as TabPlan, est = EST.has(sp.est ?? "") ? sp.est! : null;
  await procesar().catch(() => undefined);
  const d = await datosPlanes(s, tab, est);
  return <Planes d={d} tab={tab} est={est} editar={s.puede("plan", "editar")} aprobar={s.puede("plan", "aprobar")} />;
}
