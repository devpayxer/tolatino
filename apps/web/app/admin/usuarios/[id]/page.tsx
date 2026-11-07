import { notFound } from "next/navigation";
import { requerir } from "@/lib/admin";
import { usuario360 } from "@/lib/admin-usuarios";
import { comunidad360 } from "@/lib/admin-vecinos";
import { puntos360 } from "@/lib/admin-gam";
import { U360 } from "../../U360";

/* ADM-USR · 360° de una persona (pantalla completa, como el prototipo por defecto en Usuarios). ?tab= la pestaña. */
const TABS = new Set(["resumen", "seguridad", "confianza", "privacidad", "comunidad"]);
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const s = await requerir("usr", "ver");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const u = await usuario360(s, id);
  if (!u) notFound();
  const tab = TABS.has(sp.tab ?? "") ? sp.tab! : "resumen";
  // Comunidad (5c): solo después de usuario360() (permiso y ciudad ya revisados).
  const [com, pts] = tab === "comunidad" ? await Promise.all([comunidad360(u.id), puntos360(u.id)]) : [null, null];
  return <U360 u={u} tab={tab} com={com} pts={pts} topeAjuste={s.role === "admin" ? 5000 : 500} />;
}
