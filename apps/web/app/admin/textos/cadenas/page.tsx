import { requerir } from "@/lib/admin";
import { cadenasAdmin, versionesCadena } from "@/lib/cms-admin";
import { idioma } from "@/lib/idioma";
import { TextosCadenas } from "../../TextosCadenas";

/* 9f · Super Admin › Textos y páginas › Cadenas (fase9-apertura.md §4 9f): ver cms:ver · editar cms:editar · marcar el inglés revisado cms:aprobar.
   Filtros por pantalla y estado, búsqueda, cursor por llave; ?h=<llave> abre el historial de una cadena. */
const ID = /^[A-Z0-9]+(-[A-Z0-9]+)*\.[A-Za-z0-9_.-]+$/;
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await requerir("cms", "ver");
  const [sp, l] = await Promise.all([searchParams, idioma()]);
  const h = sp.h && ID.test(sp.h) ? sp.h : null;
  const [d, v] = await Promise.all([cadenasAdmin({ q: sp.q ?? "", pantalla: sp.pantalla ?? null, estado: sp.estado ?? null, despues: sp.desde ?? null }), h ? versionesCadena(h) : Promise.resolve(null)]);
  return <TextosCadenas d={d} l={l} q={(sp.q ?? "").slice(0, 80)} pantalla={sp.pantalla ?? null} estado={sp.estado ?? null} desde={sp.desde ?? null} historia={h && v ? { id: h, v } : null}
    editar={s.puede("cms", "editar")} aprobar={s.puede("cms", "aprobar")} />;
}
