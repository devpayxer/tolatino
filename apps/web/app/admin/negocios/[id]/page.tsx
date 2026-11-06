import { notFound } from "next/navigation";
import { requerir } from "@/lib/admin";
import { negocio360 } from "@/lib/admin-negocios";
import { N360 } from "../../N360";

/* ADM-NEG · 360° de un negocio (pantalla completa, como el prototipo por defecto en Negocios). ?tab= la pestaña. */
const TABS = new Set(["resumen", "ficha", "vende", "equipo", "cont", "confianza"]);
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const s = await requerir("neg", "ver");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const n = await negocio360(s, id);
  if (!n) notFound();
  return <N360 n={n} tab={TABS.has(sp.tab ?? "") ? sp.tab! : "resumen"} />;
}
