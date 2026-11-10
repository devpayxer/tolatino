import { notFound } from "next/navigation";
import { requerir } from "@/lib/admin";
import { datosDinero } from "@/lib/admin-dinero";
import { negocio360 } from "@/lib/admin-negocios";
import { N360 } from "../../N360";

/* ADM-NEG · 360° de un negocio (pantalla completa, como el prototipo por defecto en Negocios). ?tab= la pestaña.
   Dinero solo sale a quien ve transacciones (tx:ver); sus datos se leen solo en esa pestaña. */
const TABS = new Set(["resumen", "ficha", "vende", "din", "equipo", "cont", "confianza"]);
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const s = await requerir("neg", "ver");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const n = await negocio360(s, id);
  if (!n) notFound();
  const veDinero = s.puede("tx", "ver");
  const tab = TABS.has(sp.tab ?? "") && (sp.tab !== "din" || veDinero) ? sp.tab! : "resumen";
  const din = !veDinero ? undefined : tab === "din" ? await datosDinero(s, n.id) : null;
  // 6a · Contenido › Eventos (quien ve Eventos y boletos).
  // 6j · Más las liquidaciones (por estado) y las cancelaciones del organizador.
  const evts = tab === "cont" && s.puede("evt", "ver") ? { ...(await (await import("@/lib/evt-revision")).eventosDeNegocioAdmin(n.id)), ...(await (await import("@/lib/evt-admin")).eventos360(n.id)), puede: { aprobar: s.puede("evt", "aprobar"), retirar: s.puede("evt", "retirar") } } : null;
  return <N360 n={n} tab={tab} din={din} evts={evts} />;
}
