import { notFound } from "next/navigation";
import { requerir } from "@/lib/admin";
import { usuario360 } from "@/lib/admin-usuarios";
import { comunidad360 } from "@/lib/admin-vecinos";
import { monedas360, puntos360 } from "@/lib/admin-gam";
import { U360 } from "../../U360";

/* ADM-USR · 360° de una persona (pantalla completa, como el prototipo por defecto en Usuarios). ?tab= la pestaña. */
const TABS = new Set(["resumen", "act", "seguridad", "confianza", "privacidad", "comunidad", "soporte"]);
const SUBS = new Set(["pub", "cm", "seg", "pym", "cup"]);
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; sub?: string }> }) {
  const s = await requerir("usr", "ver");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const u = await usuario360(s, id);
  if (!u) notFound();
  const tab = TABS.has(sp.tab ?? "") ? sp.tab! : "resumen";
  // Comunidad (5c): solo después de usuario360() (permiso y ciudad ya revisados).
  const [com, pts, mon] = tab === "comunidad" ? await Promise.all([comunidad360(u.id), puntos360(u.id), monedas360(u.id)]) : [null, null, null];
  // 6j · Actividad: boletos, RSVP y entradas (después de usuario360(): permiso y ciudad ya revisados).
  const act = tab === "act" ? await (await import("@/lib/evt-admin")).actividadEventos(u.id) : null;
  // 7b · Soporte: sus casos con To'Latino (quien ve Soporte).
  const sop = s.puede("sop", "ver") ? (tab === "soporte" ? await (await import("@/lib/soporte-equipo")).casosDe(s, { userId: u.id }) : []) : undefined;
  return <U360 sop={sop} act={act} u={u} tab={tab} sub={SUBS.has(sp.sub ?? "") ? sp.sub! : "pub"} com={com} pts={pts} mon={mon} topeAjuste={s.role === "admin" ? 5000 : 500} topeMonedas={s.role === "admin" ? 1000 : 500} />;
}
