import { requerir } from "@/lib/admin";
import { leerFiltros, listaNegocios, POR_PAGINA } from "@/lib/admin-negocios";
import { Negocios } from "../Negocios";
import { idioma } from "@/lib/idioma";

/* Nombres cortos de las 17 categorías para las pestañas (adm-data.js CATS[].s). */
const CATS = [["NEG-FOOD", "Comida"], ["NEG-BELL", "Belleza"], ["NEG-AUTO", "Auto"], ["NEG-HOGAR", "Hogar"], ["NEG-NOCHE", "Noche"], ["NEG-MERC", "Mercados"], ["NEG-FIESTA", "Fiestas"],
  ["NEG-SALUD", "Salud"], ["NEG-PRO", "Trámites"], ["NEG-TIENDA", "Tiendas"], ["NEG-TRANS", "Transporte"], ["NEG-EDU", "Cursos"], ["NEG-NINOS", "Niños"], ["NEG-DEPORTE", "Deporte"],
  ["NEG-FE", "Iglesias"], ["NEG-INMUEBLE", "Vivienda"], ["NEG-DEALER", "Carros"]].map(([id, s]) => ({ id: id!, s: s! }));
const CATS_EN: Record<string, string> = { "NEG-FOOD": "Food", "NEG-BELL": "Beauty", "NEG-AUTO": "Auto", "NEG-HOGAR": "Home", "NEG-NOCHE": "Nightlife", "NEG-MERC": "Markets",
  "NEG-FIESTA": "Parties", "NEG-SALUD": "Health", "NEG-PRO": "Paperwork", "NEG-TIENDA": "Stores", "NEG-TRANS": "Transport", "NEG-EDU": "Classes", "NEG-NINOS": "Kids",
  "NEG-DEPORTE": "Sports", "NEG-FE": "Churches", "NEG-INMUEBLE": "Housing", "NEG-DEALER": "Car dealers" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await requerir("neg", "ver");
  const sp = await searchParams;
  const f = leerFiltros(sp);
  // 9n-8 · Vistas del prototipo (secNeg): Lista · Posibles duplicados · Reclamos. Cada vista lee solo lo suyo.
  const vista = sp.vista === "dup" || sp.vista === "rec" ? sp.vista : "lista";
  const D = await import("@/lib/admin-negocios-dup");
  const [r, n, dup, rec] = await Promise.all([
    listaNegocios(s, vista === "lista" ? f : { ...f, cur: null, ant: [] }),
    D.cuentasVistas(s),
    vista === "dup" ? D.paresDup(s, { cur: sp.cur ?? null }) : null,
    vista === "rec" ? D.vistaReclamos(s, sp.cur ?? null) : null,
  ]);
  return <Negocios vista={vista} cuentas={n} dup={dup} rec={rec} filas={r.filas} siguiente={r.siguiente} total={r.total} porCat={r.porCat} cab={r.cab} f={f} cats={(await idioma()) === "en" ? CATS.map((c) => ({ id: c.id, s: CATS_EN[c.id] ?? c.s })) : CATS} porPagina={POR_PAGINA}
    puedeExportar={s.puede("neg", "exportar")} puedeEditar={s.puede("neg", "editar")} />;
}
