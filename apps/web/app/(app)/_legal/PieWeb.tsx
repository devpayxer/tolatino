import { pieEnTodas } from "@/lib/cms-home";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { titulosLegales, type ClaveLegal } from "@/lib/legal";
import { ubicacion } from "@/lib/ubicacion";
import { PieLegal } from "./PieLegal";

/* 9f · El pie de la web (SiteFooter con las páginas legales, la ayuda y Soporte) bajo el Inicio, la ficha y Buscar. Apagado de fábrica: agregarlo cambia las
   capturas aprobadas; se enciende en Super Admin › Textos y páginas › Páginas (interruptor «web.pie_todas»). Las páginas legales ya lo llevan siempre. */
const GRUPO: Record<ClaveLegal, "legal" | "comunidad" | "confianza"> = {
  terminos: "legal", privacidad: "legal", cookies: "legal", ia: "legal", dmca: "legal", accesibilidad: "legal",
  reglas: "comunidad", votos: "comunidad", verificamos: "confianza", seguridad: "confianza", "vivienda-justa": "confianza",
};
export async function PieWeb() {
  if (!(await pieEnTodas())) return null;
  const [lang, u] = await Promise.all([idioma(), yo().catch(() => null)]);
  const [loc, titulos] = await Promise.all([ubicacion(u).catch(() => null), titulosLegales()]);
  return <div data-pie-web><PieLegal en={lang === "en"} ciudad={loc ? `${loc.c.name}, ${loc.c.state}` : "Hazleton, PA"} paginas={titulos.map((t) => ({ k: t.key, t: t.title[lang], g: GRUPO[t.key] }))} /></div>;
}
