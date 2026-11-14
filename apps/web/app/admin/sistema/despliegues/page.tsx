import { requerir } from "@/lib/admin";
import { idioma } from "@/lib/idioma";
import { desplieguesAdmin } from "@/lib/sistema/despliegues";
import { SistemaDespliegues } from "../../SistemaDespliegues";

/* 9o · Super Admin › Sistema › Despliegues: ver sys:ver · cerrar un incidente sys:editar (lo revisa la acción). Los despliegues los anota el deploy.sh
   del entorno al terminar (infra/comun/registro.sh); los incidentes, la vuelta atrás, el monitoreo y el equipo. */
export const dynamic = "force-dynamic";
export default async function Page() {
  const s = await requerir("sys", "ver");
  const [d, l] = await Promise.all([desplieguesAdmin(), idioma()]);
  return <SistemaDespliegues d={d} l={l} editar={s.puede("sys", "editar")} />;
}
