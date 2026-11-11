import { requerir } from "@/lib/admin";
import { listar, llaveroListo, TIPOS } from "@/lib/tiendas/llavero";
import { Integraciones } from "../../Integraciones";

/* 8a · Super Admin › Sistema › Integraciones › Llaves de las tiendas (hueco #7; §10 Paquete 8-2: el fundador sube aquí, una vez, los archivos
   que Apple y Google entregan solo al dueño de la cuenta). SOLO Admin (integ:ver; los demás roles no tienen la sección). Se ve la huella,
   quién, cuándo, cuándo vence y las lecturas; el contenido nunca (ni siquiera cifrado). Subir pide el código otra vez (api/admin/llavero). */
export const dynamic = "force-dynamic";
export default async function Page() {
  const s = await requerir("integ", "ver");
  const [filas] = await Promise.all([listar()]);
  const tipos = Object.entries(TIPOS).map(([k, v]) => ({ k, es: v.es, ext: [...v.ext] }));
  return <Integraciones filas={filas} tipos={tipos} admin={s.role === "admin" && s.puede("integ", "editar")} listo={llaveroListo()} />;
}
