import { requerir } from "@/lib/admin";
import { listado } from "@/lib/ciudades/admin";
import { idioma } from "@/lib/idioma";
import { CiudadesLista } from "../Ciudades";

/* ADM-CIUD · Ciudades (9i): el listado con la lista de espera, la regla de apertura y el asistente de cada ciudad. Ver: ciud:ver. */
export const dynamic = "force-dynamic";
export default async function Ciudades() {
  const s = await requerir("ciud", "ver");
  const [d, l] = await Promise.all([listado(s), idioma()]);
  return <CiudadesLista d={d} l={l} />;
}
