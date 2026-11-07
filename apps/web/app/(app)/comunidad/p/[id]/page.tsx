import { publicacion } from "@/lib/comunidad";
import { conCuenta } from "../../sesion";
import { Publicacion } from "./Publicacion";

export const dynamic = "force-dynamic";

/* APP-COM-POST · la publicación. Pide sesión (comunidadSoloConCuenta). Si no existe para ti (borrada, oculta, bloqueo), lo dice. */
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ nueva?: string; editada?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const s = await conCuenta(`/comunidad/p/${encodeURIComponent(id)}`);
  const d = await publicacion(id, s.u.id);
  return <Publicacion es={s.es} yo={s.me} ciudad={s.ciudad} d={d} nueva={sp.nueva === "1"} editada={sp.editada === "1"} />;
}
