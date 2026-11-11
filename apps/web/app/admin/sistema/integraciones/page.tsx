import { requerir } from "@/lib/admin";
import { listar, llaveroListo, TIPOS } from "@/lib/tiendas/llavero";
import { Integraciones } from "../../Integraciones";
import { IntegracionesPush } from "../../IntegracionesPush";

/* 8a · Super Admin › Sistema › Integraciones › Llaves de las tiendas (hueco #7; §10 Paquete 8-2: el fundador sube aquí, una vez, los archivos
   que Apple y Google entregan solo al dueño de la cuenta). SOLO Admin (integ:ver; los demás roles no tienen la sección). Se ve la huella,
   quién, cuándo, cuándo vence y las lecturas; el contenido nunca (ni siquiera cifrado). Subir pide el código otra vez (api/admin/llavero).
   8c · ?tab=push: los canales de push, sus teléfonos, la cola, los errores, los límites y la prueba (IntegracionesPush). */
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await requerir("integ", "ver");
  const admin = s.role === "admin" && s.puede("integ", "editar");
  if ((await searchParams).tab === "push") return <IntegracionesPush d={await (await import("@/lib/push/admin")).estadoPush()} admin={admin} />;
  const [filas] = await Promise.all([listar()]);
  const tipos = Object.entries(TIPOS).map(([k, v]) => ({ k, es: v.es, ext: [...v.ext] }));
  return <Integraciones filas={filas} tipos={tipos} admin={admin} listo={llaveroListo()} />;
}
