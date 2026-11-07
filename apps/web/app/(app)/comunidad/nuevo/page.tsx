import { paraEditar } from "@/lib/comunidad";
import { conCuenta } from "../sesion";
import { Nuevo } from "./Nuevo";

export const dynamic = "force-dynamic";

/* APP-COM-NUEVO · publicar (pregunta · recomendación · encuesta · publicación) o editar la propia en sus primeros 30 minutos.
   Pide sesión; el servidor revisa todo otra vez al publicar. */
export default async function Page({ searchParams }: { searchParams: Promise<{ k?: string; editar?: string; q?: string }> }) {
  const sp = await searchParams;
  const volver = sp.editar ? `/comunidad/nuevo?editar=${encodeURIComponent(sp.editar)}` : "/comunidad/nuevo";
  const s = await conCuenta(volver);
  const ed = sp.editar ? await paraEditar(s.u.id, String(sp.editar)) : null;
  const k = (["pregunta", "recomendacion", "encuesta", "publicacion"] as const).find((x) => x === sp.k) ?? "pregunta";
  return (
    <Nuevo es={s.es} yo={s.me} ciudad={s.ciudad} abierta={s.loc.c.status === "on"} silenciado={s.perfil.silenciado} k={k} texto={typeof sp.q === "string" ? sp.q.slice(0, 300) : ""}
      editar={sp.editar ? (ed ? { id: String(sp.editar), ...ed } : { id: String(sp.editar), noEsta: true }) : null} />
  );
}
