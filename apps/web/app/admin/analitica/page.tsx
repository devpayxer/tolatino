import { requerir } from "@/lib/admin";
import { appsAnalitica, busquedasSinResultado, compaSoporteAnalitica, comunidadAnalitica, confianza, contactosYVistas, dinero, embudo, embudos, eventosAnalitica, feInmAutos, fiestasTransporte,
  gente, hogarAuto, inscripcionesAnalitica, mercadosTiendas, noche, PERIODOS, retencionCohortes, saludPro } from "@/lib/admin-analitica";
import { sinOferta } from "@/lib/admin-catalogo";
import { idioma } from "@/lib/idioma";
import { analisisAparte } from "@/lib/db-analisis";
import { misReportes } from "@/lib/reportes";
import { reportesDiarios } from "@/lib/reporte-diario";
import { Analitica, type DatosAnalitica } from "../Analitica";

/* ADM-ANALIT · Analítica. ?tab= sum | ppl | dinero | trust | sp | ha | mt | ft | no | en | ia | com | evt | cpa | apps | nosup | rep | exp · ?p= 7 | 30 | 90 días.
   9g · Dinero, Hogar y Auto y Reportes (programados y el reporte diario); Resumen con el embudo hasta «el negocio aceptó», contactos desde semillas y
   vistas sin repetidos; Gente con la retención por cohorte y los embudos del vecino y del negocio; Búsquedas sin oferta con las búsquedas sin resultado.
   Todo se lee por la base de análisis (lib/db-analisis.ts). */
const TABS = new Set(["sum", "ppl", "dinero", "trust", "sp", "ha", "mt", "ft", "no", "en", "ia", "com", "evt", "cpa", "apps", "nosup", "rep", "exp"]);
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await requerir("analit", "ver");
  const [sp, l] = await Promise.all([searchParams, idioma()]);
  const tab = TABS.has(sp.tab ?? "") ? sp.tab! : "sum";
  const dias = (PERIODOS as readonly number[]).includes(Number(sp.p)) ? Number(sp.p) : 30;
  const d: DatosAnalitica = { tab, dias, l, exporta: s.puede("analit", "exportar"), replica: analisisAparte() };
  if (tab === "sum") [d.embudo, d.embudos, d.cv] = await Promise.all([embudo(s, dias), embudos(s, dias), contactosYVistas(s, dias)]);
  if (tab === "ppl") [d.gente, d.cohortes, d.embudos] = await Promise.all([gente(s, dias), retencionCohortes(s), embudos(s, dias)]);
  if (tab === "dinero") d.dinero = await dinero(s, dias);
  if (tab === "trust") d.confianza = await confianza(s, dias);
  if (tab === "nosup") [d.nosup, d.sinRes] = await Promise.all([sinOferta(s), busquedasSinResultado(s, 30)]);
  if (tab === "sp") d.sp = await saludPro(s, dias);
  if (tab === "ha") d.ha = await hogarAuto(s, dias);
  if (tab === "mt") d.mt = await mercadosTiendas(s, dias);
  if (tab === "ft") d.ft = await fiestasTransporte(s, dias);
  if (tab === "no") d.no = await noche(s, dias);
  if (tab === "en") d.en = await inscripcionesAnalitica(s, dias);
  if (tab === "ia") d.ia = await feInmAutos(s, dias);
  if (tab === "com") d.com = await comunidadAnalitica(s, dias);
  if (tab === "evt") d.evt = await eventosAnalitica(s, dias);
  if (tab === "cpa") d.cpa = await compaSoporteAnalitica(s, dias);   // 7i · El Compa y Soporte, sin personas
  if (tab === "apps") d.apps = await appsAnalitica(s, dias);         // 8i · Las cuatro apps, sin personas
  // El reporte diario es del fundador: lo ven los Admins (lleva el dinero de todas las ciudades).
  if (tab === "rep") [d.programados, d.diarios] = await Promise.all([misReportes(s), s.role === "admin" ? reportesDiarios() : Promise.resolve(null)]);
  return <Analitica d={d} />;
}
