import type { Metadata } from "next";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { destacado, estaNoche, eventosCiudad, generosFiltro, misRsvpN, type FiltroFecha } from "@/lib/evt-publico";
import { misBoletosN } from "@/lib/boletos";
import { ubicacion } from "@/lib/ubicacion";
import { PantallaPronto } from "../PantallaPronto";
import { Eventos } from "./Eventos";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Eventos · To'Latino", description: "Fiestas, shows, clases, cultos y eventos de la comunidad cerca de ti. El precio que ves es el que pagas." };

const FECHAS: FiltroFecha[] = ["todos", "hoy", "finde", "prox"];

/* APP-EVT-BUSQ (prototipo «To'Latino Eventos» bqVals): Mis boletos y RSVP, Esta noche como historias, el destacado, la línea fija, chips de
   fecha y de tipo, las secciones por fecha con la tarjeta cartel, 20 por página con cursor, y «¿Tu negocio tiene un evento?». */
export default async function Page({ searchParams }: { searchParams: Promise<{ d?: string; t?: string }> }) {
  const [sp, lang, u] = await Promise.all([searchParams, idioma(), yo()]);
  const loc = await ubicacion(u);
  if (loc.c.status !== "on") return <PantallaPronto loc={loc} lang={lang} userId={u?.id ?? null} />;
  const es = lang === "es";
  const G = await generosFiltro();
  const d = FECHAS.find((x) => x === sp.d) ?? "todos";
  const t = sp.t === "gratis" || sp.t === "boleto" || sp.t === "comunidad" || G.some((g) => g.key === sp.t) ? String(sp.t) : "todo";
  const [lista, noche, feat, misRsvp, misBol] = await Promise.all([
    eventosCiudad(loc, { d, t }, null, u?.id ?? null, es), estaNoche(loc, u?.id ?? null, es), d === "todos" && t === "todo" ? destacado(loc, u?.id ?? null, es) : Promise.resolve(null), misRsvpN(u?.id ?? null), misBoletosN(u?.id ?? null),
  ]);
  return <Eventos es={es} ciudad={loc.c.name} estado={loc.c.state} d={d} t={t} generos={G.map((g) => ({ k: g.key, l: es ? g.label.es : g.label.en || g.label.es }))}
    lista={lista} noche={noche} feat={feat} mios={misRsvp} bol={misBol} conSesion={!!u} />;
}
