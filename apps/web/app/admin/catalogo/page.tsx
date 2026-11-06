import { notFound } from "next/navigation";
import { requerir } from "@/lib/admin";
import { categoriaAdmin, categoriasAdmin, filtrosAdmin, historial, modulosAdmin, SIN_POR_PAGINA, sinOferta, sinonimos } from "@/lib/admin-catalogo";
import { TOPE_FREE } from "@/lib/plan";
import { Catalogo, type DatosCatalogo } from "../Catalogo";

/* ADM-CAT · Catálogo. ?tab= cats | syn | nosup | filt | mod · ?c= detalle de una categoría · ?f= sus filtros. */
const TABS = new Set(["cats", "syn", "nosup", "filt", "mod"]);
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await requerir("cat", "ver");
  const sp = await searchParams;
  const puede = s.puede("cat", "editar");
  if (sp.c) {
    const cat = await categoriaAdmin(sp.c);
    if (!cat) notFound();
    return <Catalogo d={{ tab: "cats", puede, cat }} />;
  }
  if (sp.f) {
    const filt = await filtrosAdmin(sp.f);
    if (!filt) notFound();
    return <Catalogo d={{ tab: "filt", puede, filt }} />;
  }
  const tab = TABS.has(sp.tab ?? "") ? sp.tab! : "cats";
  const d: DatosCatalogo = { tab, puede };
  if (tab === "cats" || tab === "filt") d.cats = await categoriasAdmin();
  if (tab === "syn") {
    const q = (sp.q ?? "").slice(0, 60), pag = Math.min(100, Math.max(1, Number(sp.pag) || 1));
    const [r, h] = await Promise.all([sinonimos(q, pag), historial(["synonym"], null)]);
    d.sin = { ...r, q, pag, porPagina: SIN_POR_PAGINA, historial: h };
  }
  if (tab === "nosup") d.nosup = await sinOferta(s);
  if (tab === "mod") { d.mods = await modulosAdmin(); d.topeFree = TOPE_FREE; }
  return <Catalogo d={d} />;
}
