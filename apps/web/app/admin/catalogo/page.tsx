import { notFound } from "next/navigation";
import { requerir } from "@/lib/admin";
import { categoriaAdmin, categoriasAdmin, filtrosAdmin, frasesViviendaJusta, cargoDealer, historial, historialModulos, limitesPlan, moduloAdmin, modulosAdmin, segurosAdmin, SIN_POR_PAGINA, sinOferta, sinonimos } from "@/lib/admin-catalogo";
import { Catalogo, type DatosCatalogo } from "../Catalogo";

/* ADM-CAT · Catálogo. ?tab= cats | syn | nosup | filt | mod | seg | vj | dealer · ?c= detalle de una categoría · ?f= sus filtros · ?m= un módulo. */
const TABS = new Set(["cats", "syn", "nosup", "filt", "mod", "seg", "vj", "dealer"]);
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
  // 9n · Un módulo: activo por ciudad y sus límites del plan.
  if (sp.m) {
    const [mod, limites] = await Promise.all([moduloAdmin(sp.m), limitesPlan()]);
    if (!mod) notFound();
    return <Catalogo d={{ tab: "mod", puede, mod, limites: { filas: limites.filter((l) => l.mods.includes(mod.key)), admin: s.role === "admin" && puede } }} />;
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
  // 9n · Módulos y Free/Pro: los límites del plan se leen de Configuración (lib/config.ts) y un Admin los cambia aquí.
  if (tab === "mod") {
    const [mods, limites, h] = await Promise.all([modulosAdmin(), limitesPlan(), historialModulos()]);
    d.mods = mods; d.limites = { filas: limites, admin: s.role === "admin" && puede }; d.histMod = h;
  }
  // Vivienda justa (4ib): la lista la ve quien ve el Catálogo; solo un Admin la cambia.
  if (tab === "vj") d.vj = { ...(await frasesViviendaJusta()), admin: s.role === "admin" };
  // Cargo del dealer (4ic): el tope de PA lo ve quien ve el Catálogo; solo un Admin lo cambia.
  if (tab === "dealer") d.dealer = { ...(await cargoDealer()), admin: s.role === "admin" };
  if (tab === "seg") { const [seg, h] = await Promise.all([segurosAdmin(), historial(["insurer"], null)]); d.seg = { filas: seg, historial: h }; }
  return <Catalogo d={d} />;
}
