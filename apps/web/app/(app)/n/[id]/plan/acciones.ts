"use server";
import { mismoOrigen, yo } from "@/lib/cuenta";
import { empezarPlan, type PlanIn } from "@/lib/planes";

/* Empezar un plan recurrente. El servidor revisa el plan, la fecha, la casa, la zona y la tarjeta; hoy no se cobra nada. */
type Bi = { es: string; en: string };
export async function empezarElPlan(f: PlanIn): Promise<{ ok: true; numero: string } | { ok: false; msg: Bi; tarjeta?: boolean }> {
  if (!(await mismoOrigen())) return { ok: false, msg: { es: "No se pudo. Recarga la página.", en: "Could not do it. Reload the page." } };
  const u = await yo();
  if (!u) return { ok: false, msg: { es: "Entra para seguir.", en: "Sign in to continue." } };
  return empezarPlan(u.id, f, process.env.TOLATINO_ENTORNO ?? "pruebas");
}
