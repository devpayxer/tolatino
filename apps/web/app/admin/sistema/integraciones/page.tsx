import { requerir } from "@/lib/admin";
import { listar, llaveroListo, TIPOS } from "@/lib/tiendas/llavero";
import { Integraciones } from "../../Integraciones";
import { IntegracionesPush } from "../../IntegracionesPush";
import { IntegracionesWallet } from "../../IntegracionesWallet";

/* 8a · Super Admin › Sistema › Integraciones › Llaves de las tiendas (hueco #7; §10 Paquete 8-2: el fundador sube aquí, una vez, los archivos
   que Apple y Google entregan solo al dueño de la cuenta). SOLO Admin (integ:ver; los demás roles no tienen la sección). Se ve la huella,
   quién, cuándo, cuándo vence y las lecturas; el contenido nunca (ni siquiera cifrado). Subir pide el código otra vez (api/admin/llavero).
   8c · ?tab=push: los canales de push, sus teléfonos, la cola, los errores, los límites y la prueba (IntegracionesPush). */
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await requerir("integ", "ver");
  const admin = s.role === "admin" && s.puede("integ", "editar");
  const sp = await searchParams;
  if (sp.tab === "push") return <IntegracionesPush d={await (await import("@/lib/push/admin")).estadoPush()} admin={admin} />;
  // 8g · ?tab=wallet: el certificado del pase de Apple (con su vencimiento y la solicitud), la cuenta de Google Wallet y las cifras.
  if (sp.tab === "wallet") return <IntegracionesWallet d={await (await import("@/lib/pases/admin")).estadoWallet()} admin={admin} listo={llaveroListo()} />;
  // 8h · Cada lectura del CI (por OIDC, con su run) y cada intento contra la tubería, debajo de las llaves.
  const [filas, ci] = await Promise.all([listar(), (await import("@/lib/tiendas/tuberia")).lecturasCi()]);
  // La llave de la solicitud del certificado del pase la genera el servidor (Wallet): no es un archivo que se suba.
  const tipos = Object.entries(TIPOS).filter(([, v]) => v.forma !== "generada").map(([k, v]) => ({ k, es: v.es, ext: [...v.ext] }));
  return <Integraciones filas={filas.filter((f) => f.kind !== "pass_type_csr" || !!f.retirada)} tipos={tipos} admin={admin} listo={llaveroListo()} subir={typeof sp.subir === "string" ? sp.subir : null} ci={ci} />;
}
