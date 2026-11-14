import { requerir } from "@/lib/admin";
import { idioma } from "@/lib/idioma";
import { ayudaAdmin, type Audiencia } from "@/lib/compa/ayuda-indice";
import { TextosAyuda } from "../TextosAyuda";

/* 7a · Super Admin › Textos y páginas (cms) › Ayuda (fase7-compa.md §4 7a): los artículos de docs/ayuda/ indexados, con su audiencia,
   versión, sha256 y cuándo se desplegaron; «Pausar» (con motivo) los quita del Centro de ayuda y de El Compa; «Volver a usar». El texto
   se corrige en el repo (§6 #12). 9f: el resto (Cadenas, Rótulos, Home por ciudad) vive en sus rutas hermanas y la sección sale en los dos idiomas. */
const AUD = new Set(["vecino", "negocio", "portero", "equipo"]);
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await requerir("cms", "ver");
  const [sp, l] = await Promise.all([searchParams, idioma()]);
  const aud = AUD.has(sp.aud ?? "") ? (sp.aud as Audiencia) : null, estado = sp.est === "paused" || sp.est === "retired" ? sp.est : null;
  const d = await ayudaAdmin({ aud, estado, q: sp.q ?? "", despues: sp.desde ?? null });
  return <TextosAyuda d={d} l={l} aud={aud} est={estado} q={sp.q ?? ""} desde={sp.desde ?? null} editar={s.puede("cms", "editar")} />;
}
