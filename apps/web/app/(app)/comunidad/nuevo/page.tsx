import { paraEditar } from "@/lib/comunidad";
import { diasEncuesta } from "@/lib/comunidad-filtro";
import { valor } from "@/lib/config";
import { conCuenta } from "../sesion";
import { Nuevo } from "./Nuevo";

export const dynamic = "force-dynamic";

/* APP-COM-NUEVO · publicar (pregunta · recomendación · encuesta · publicación) o editar la propia en sus primeros minutos
   (Configuración · com_editar_min). Cuánto dura una encuesta sale de Configuración (com_encuesta_dias_max).
   Pide sesión; el servidor revisa todo otra vez al publicar. */
export default async function Page({ searchParams }: { searchParams: Promise<{ k?: string; editar?: string; q?: string }> }) {
  const sp = await searchParams;
  // 5e · «Pregúntale al barrio» (Buscar) llega con ?k=pregunta&q=…: sin sesión, vuelve aquí con lo escrito después de entrar.
  const volver = sp.editar ? `/comunidad/nuevo?editar=${encodeURIComponent(sp.editar)}` : `/comunidad/nuevo${sp.q || sp.k ? `?${new URLSearchParams({ ...(sp.k ? { k: String(sp.k) } : {}), ...(sp.q ? { q: String(sp.q).slice(0, 300) } : {}) })}` : ""}`;
  const s = await conCuenta(volver);
  const [ed, maxDias] = await Promise.all([sp.editar ? paraEditar(s.u.id, String(sp.editar)) : null, valor("com_encuesta_dias_max")]);
  const k = (["pregunta", "recomendacion", "encuesta", "publicacion"] as const).find((x) => x === sp.k) ?? "pregunta";
  return (
    <Nuevo es={s.es} yo={s.me} ciudad={s.ciudad} abierta={s.loc.c.status === "on"} silenciado={s.perfil.silenciado} k={k} texto={typeof sp.q === "string" ? sp.q.slice(0, 300) : ""} diasEnc={diasEncuesta(maxDias)}
      editar={sp.editar ? (ed ? { id: String(sp.editar), ...ed } : { id: String(sp.editar), noEsta: true }) : null} />
  );
}
