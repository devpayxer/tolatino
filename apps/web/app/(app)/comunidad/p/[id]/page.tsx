import { publicacion } from "@/lib/comunidad";
import { hilo } from "@/lib/comunidad-hilo";
import { conCuenta } from "../../sesion";
import { Publicacion } from "./Publicacion";

export const dynamic = "force-dynamic";

/* APP-COM-POST · la publicación y su hilo. Pide sesión (comunidadSoloConCuenta). Si no existe para ti (borrada, oculta, bloqueo), lo dice. */
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ nueva?: string; editada?: string; o?: string; ayuda?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const s = await conCuenta(`/comunidad/p/${encodeURIComponent(id)}`);
  const orden = sp.o === "new" ? "new" : "top";
  const [d, h] = await Promise.all([publicacion(id, s.u.id), hilo(id, s.u.id, null, orden)]);
  return <Publicacion es={s.es} yo={s.me} ciudad={s.ciudad} d={d} h={h} orden={orden} nueva={sp.nueva === "1"} editada={sp.editada === "1"} crisis={sp.ayuda === "988"} />;
}
