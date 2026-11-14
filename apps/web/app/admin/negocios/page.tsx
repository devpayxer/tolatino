import { requerir } from "@/lib/admin";
import { leerFiltros, listaNegocios, POR_PAGINA } from "@/lib/admin-negocios";
import { Negocios } from "../Negocios";

/* Nombres cortos de las 17 categorías para las pestañas (adm-data.js CATS[].s). */
const CATS = [["NEG-FOOD", "Comida"], ["NEG-BELL", "Belleza"], ["NEG-AUTO", "Auto"], ["NEG-HOGAR", "Hogar"], ["NEG-NOCHE", "Noche"], ["NEG-MERC", "Mercados"], ["NEG-FIESTA", "Fiestas"],
  ["NEG-SALUD", "Salud"], ["NEG-PRO", "Trámites"], ["NEG-TIENDA", "Tiendas"], ["NEG-TRANS", "Transporte"], ["NEG-EDU", "Cursos"], ["NEG-NINOS", "Niños"], ["NEG-DEPORTE", "Deporte"],
  ["NEG-FE", "Iglesias"], ["NEG-INMUEBLE", "Vivienda"], ["NEG-DEALER", "Carros"]].map(([id, s]) => ({ id: id!, s: s! }));

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await requerir("neg", "ver");
  const f = leerFiltros(await searchParams);
  const r = await listaNegocios(s, f);
  return <Negocios filas={r.filas} siguiente={r.siguiente} total={r.total} porCat={r.porCat} cab={r.cab} f={f} cats={CATS} porPagina={POR_PAGINA} puedeExportar={s.puede("neg", "exportar")} />;
}
