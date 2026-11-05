import { notFound } from "next/navigation";
import { requerir } from "@/lib/admin";
import { usuario360 } from "@/lib/admin-usuarios";
import { U360 } from "../../U360";

/* ADM-USR · 360° de una persona (pantalla completa, como el prototipo por defecto en Usuarios). ?tab= la pestaña. */
const TABS = new Set(["resumen", "seguridad", "confianza", "privacidad"]);
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const s = await requerir("usr", "ver");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const u = await usuario360(s, id);
  if (!u) notFound();
  return <U360 u={u} tab={TABS.has(sp.tab ?? "") ? sp.tab! : "resumen"} />;
}
