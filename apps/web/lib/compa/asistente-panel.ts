import "server-only";
import { horario } from "../soporte";
import { horarioEquipo } from "../soporte-comun";
import { contextoPanel } from "./contexto-panel";
import { hiloPanel, type HiloPanel } from "./conversacion";
import { disponible } from "./interruptores";
import type { Lang } from "./modelo";
import { alTope } from "./tope";

/* 7e · Lo que necesita la pantalla Panel › El Compa (DASH-COMPA) para empezar — SOLO LECTURA y barata. Solo la carga la página del panel
   cuando se abre esa sección, y siempre con `.catch(() => null)` (compaSinRutaCritica): si algo falla, la sección dice que El Compa no está
   y lleva a Ayuda y Soporte; ninguna otra pantalla del panel espera a El Compa.
   - on: el nivel «owner», el canal, la ciudad del negocio, la pausa del negocio y el tope (como turnoPanel).
   - hilo: la conversación abierta de ESTA persona en ESTE negocio (hiloPanel, con el id de la sesión). La «Ir a …» pendiente se muestra solo si
     la sección sigue entre las que esa persona puede abrir AHORA (si le quitaron la parte, el botón desaparece; confirmar lo vuelve a revisar).
   - chips: preguntas de partes que SÍ puede abrir (el servidor decide, máximo 3). */
type Bi = { es: string; en: string };
export type CpaPanel = {
  on: boolean; horario: string;
  hilo: (Omit<HiloPanel, "ir"> & { ir: { id: string; seccion: string; titulo: string } | null }) | null;
  chips: string[];
};
const CHIPS: { parte: string | null; code: string; t: Bi }[] = [
  { parte: "page", code: "pagina/hor", t: { es: "¿Cómo cambio mi horario?", en: "How do I change my hours?" } },
  { parte: "cat", code: "vendes", t: { es: "¿Cómo pauso los pedidos?", en: "How do I pause orders?" } },
  { parte: "pay", code: "cobros", t: { es: "¿Cuándo me pagan?", en: "When do I get paid?" } },
  { parte: "page", code: "pagina/resenas", t: { es: "¿Cómo respondo una reseña?", en: "How do I reply to a review?" } },
  { parte: "ord", code: "hoy", t: { es: "¿Dónde apruebo las solicitudes?", en: "Where do I approve requests?" } },
  { parte: "msg", code: "mensajes", t: { es: "¿Cómo contesto un mensaje?", en: "How do I answer a message?" } },
  { parte: "evt", code: "eventos", t: { es: "¿Cómo publico un evento?", en: "How do I publish an event?" } },
];

export async function asistentePanel(userId: string, negocio: string, lang: Lang): Promise<CpaPanel | null> {
  const es = lang === "es";
  const ctx = await contextoPanel(userId, negocio, lang);
  if (!ctx) return null;
  const [d, tope, h, hilo] = await Promise.all([
    disponible({ uso: "owner", canal: "app", ciudad: ctx.negocio.ciudad, negocio: ctx.negocio.id }), alTope(), horario(), hiloPanel(userId, ctx.negocio.id),
  ]);
  const ir = hilo?.ir && ctx.secciones.has(hilo.ir.seccion) ? { ...hilo.ir, titulo: ctx.secciones.get(hilo.ir.seccion)!.title[lang] } : null;
  return {
    on: d.ok && !tope, horario: horarioEquipo(h, es),
    hilo: hilo ? { ...hilo, ir } : null,
    chips: CHIPS.filter((c) => ctx.secciones.has(c.code)).slice(0, 3).map((c) => c.t[lang]),
  };
}
