import { requerir } from "@/lib/admin";
import { ayudaAdmin, type Audiencia } from "@/lib/compa/ayuda-indice";
import { TextosAyuda } from "../TextosAyuda";

/* 7a · Super Admin › Textos y páginas (cms) › Ayuda (fase7-compa.md §4 7a): los artículos de docs/ayuda/ indexados, con su audiencia,
   versión, sha256 y cuándo se desplegaron; «Pausar» (con motivo) los quita del Centro de ayuda y de El Compa; «Volver a usar». El texto
   se corrige en el repo (§6 #12). El resto de Textos y páginas (el editor de textos) llega con el CMS. */
const AUD = new Set(["vecino", "negocio", "portero", "equipo"]);
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await requerir("cms", "ver");
  const sp = await searchParams;
  const aud = AUD.has(sp.aud ?? "") ? (sp.aud as Audiencia) : null, estado = sp.est === "paused" || sp.est === "retired" ? sp.est : null;
  const d = await ayudaAdmin({ aud, estado, q: sp.q ?? "", despues: sp.desde ?? null });
  return <TextosAyuda d={d} aud={aud} est={estado} q={sp.q ?? ""} desde={sp.desde ?? null} editar={s.puede("cms", "editar")} />;
}
