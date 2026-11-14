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
  // 9k · Ingresos con la conciliación diaria (14 días, las diferencias del día elegido) y las alertas del dinero abiertas.
  let conc = null;
  if (tab === "ing") {
    const C = await import("@/lib/conciliacion"), A = await import("@/lib/dinero-alertas");
    const dias = await C.diasConciliacion(14);
    const dia = /^\d{4}-\d{2}-\d{2}$/.test(sp.dia ?? "") ? sp.dia! : dias.find((x) => x.sinDueno > 0)?.dia ?? dias.find((x) => x.diferencias > 0)?.dia ?? null;
    const [difs, alertas] = await Promise.all([dia ? C.diferenciasDelDia(s, dia, /^\d{1,18}$/.test(sp.antes ?? "") ? sp.antes! : null) : Promise.resolve({ filas: [], sigue: null }), A.alertasDinero(s, sp.alertas !== "todas", /^\d{1,18}$/.test(sp.aantes ?? "") ? sp.aantes! : null)]);
    conc = { dias, dia, difs, alertas, todas: sp.alertas === "todas" };
  }
  return <Planes d={d} ing={ing} conc={conc} tab={tab} est={est} editar={s.puede("plan", "editar")} aprobar={s.puede("plan", "aprobar")} exportar={s.puede("tx", "exportar")} dinero={s.puede("tx", "aprobar")} />;
}
