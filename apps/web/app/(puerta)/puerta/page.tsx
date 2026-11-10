import { redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { misPuertas } from "@/lib/puerta";
import { valor } from "@/lib/config";
import { Inicio } from "./Inicio";

export const dynamic = "force-dynamic";

/* /puerta · CHK-ONB: entrar con su cuenta → sus puertas de hoy y las próximas (como portero o como miembro del negocio con «evt») → elegir →
   nombre de la puerta → abrir. Sin equipo: el código que le dio el negocio (hueco #2, como el Repartidor). Compuesta con el sistema. */
export default async function Page() {
  const [u, lang] = await Promise.all([yo(), idioma()]);
  if (!u?.first_name) redirect(`/entrar?volver=${encodeURIComponent("/puerta")}`);
  const [m, ventanaH] = await Promise.all([misPuertas(u.id), valor("puerta_ventana_h")]);
  return <Inicio es={lang === "es"} nombre={u.first_name} tel={u.phone} puertas={m.puertas} abiertas={m.abiertas} equipos={m.equipos} ventanaH={ventanaH} />;
}
