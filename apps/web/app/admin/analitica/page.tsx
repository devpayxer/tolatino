import { requerir } from "@/lib/admin";
import { confianza, embudo, fiestasTransporte, gente, inscripcionesAnalitica, mercadosTiendas, noche, PERIODOS, saludPro } from "@/lib/admin-analitica";
import { sinOferta } from "@/lib/admin-catalogo";
import { Analitica, type DatosAnalitica } from "../Analitica";

/* ADM-ANALIT · Analítica. ?tab= sum | ppl | trust | sp | mt | ft | no | en | nosup | exp · ?p= 7 | 30 | 90 días. */
const TABS = new Set(["sum", "ppl", "trust", "sp", "mt", "ft", "no", "en", "nosup", "exp"]);
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await requerir("analit", "ver");
  const sp = await searchParams;
  const tab = TABS.has(sp.tab ?? "") ? sp.tab! : "sum";
  const dias = (PERIODOS as readonly number[]).includes(Number(sp.p)) ? Number(sp.p) : 30;
  const d: DatosAnalitica = { tab, dias, exporta: s.puede("analit", "exportar") };
  if (tab === "sum") d.embudo = await embudo(s, dias);
  if (tab === "ppl") d.gente = await gente(s, dias);
  if (tab === "trust") d.confianza = await confianza(s, dias);
  if (tab === "nosup") d.nosup = await sinOferta(s);
  if (tab === "sp") d.sp = await saludPro(s, dias);
  if (tab === "mt") d.mt = await mercadosTiendas(s, dias);
  if (tab === "ft") d.ft = await fiestasTransporte(s, dias);
  if (tab === "no") d.no = await noche(s, dias);
  if (tab === "en") d.en = await inscripcionesAnalitica(s, dias);
  return <Analitica d={d} />;
}
