import type { Metadata } from "next";
import { after } from "next/server";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { contexto } from "@/lib/eventos";
import { DIA_ISO, destacadosEventos, diasConEventos, estaNoche, eventosCiudad, generosFiltro, hoyDeCiudad, misRsvpN, patrocinadosEventos } from "@/lib/evt-publico";
import { sumarDias } from "@/lib/evt-comun";
import { misBoletosN } from "@/lib/boletos";
import { contarVistas } from "@/lib/patrocinio";
import { ubicacion } from "@/lib/ubicacion";
import { PantallaPronto } from "../PantallaPronto";
import { Eventos } from "./Eventos";
import { PieWeb } from "../_legal/PieWeb";
import { dosIdiomas } from "@/lib/dos-idiomas";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Eventos · To'Latino", description: "Fiestas, shows, clases, cultos y eventos de la comunidad cerca de ti, día por día." };

const WL = (es: unknown): string[] => { const E2 = (a: string, b: string) => dosIdiomas(es, a, b); return [E2("Domingo", "Sunday"), E2("Lunes", "Monday"), E2("Martes", "Tuesday"), E2("Miércoles", "Wednesday"), E2("Jueves", "Thursday"), E2("Viernes", "Friday"), E2("Sábado", "Saturday")]; };
const MS = (es: unknown): string[] => { const E2 = (a: string, b: string) => dosIdiomas(es, a, b); return [E2("ene", "Jan"), E2("feb", "Feb"), E2("mar", "Mar"), E2("abr", "Apr"), E2("may", "May"), E2("jun", "Jun"), E2("jul", "Jul"), E2("ago", "Aug"), E2("sep", "Sep"), E2("oct", "Oct"), E2("nov", "Nov"), E2("dic", "Dec")]; };
const diasEntre = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 864e5);

/* APP-EVT-BUSQ · C-003 (canvas tolatino-master+, «Eventos (variantes)» D; prototipo bqVals): Patrocinados (los de la base, pagados y activos) →
   calendario de días con hoy en el centro (zona de la ciudad) → el día elegido («Esta noche», «Mañana», «Sábado 26») con su número de eventos →
   sus historias → una fila de tipos → sus eventos (20 por página con cursor). El día va en la dirección (?dia=AAAA-MM-DD; hoy no la lleva): el
   servidor decide qué sale cada día. */
export default async function Page({ searchParams }: { searchParams: Promise<{ dia?: string; t?: string }> }) {
  const [sp, lang, u] = await Promise.all([searchParams, idioma(), yo()]);
  const loc = await ubicacion(u);
  if (loc.c.status !== "on") return <PantallaPronto loc={loc} lang={lang} userId={u?.id ?? null} />;
  const es = lang === "es", E = (a: string, b: string) => (es ? a : b);
  const [G, hoy] = await Promise.all([generosFiltro(), hoyDeCiudad(loc.ciudad)]);
  // El día: de hoy en adelante (hasta 120 días); un día pasado o mal escrito es hoy.
  const dia = typeof sp.dia === "string" && DIA_ISO.test(sp.dia) && sp.dia >= hoy && sp.dia <= sumarDias(hoy, 120) ? sp.dia : hoy;
  const t = sp.t === "gratis" || sp.t === "boleto" || sp.t === "comunidad" || G.some((g) => g.key === sp.t) ? String(sp.t) : "todo";
  // 9t · Destacados de Eventos (lo que fijó el equipo, sin cobro): la fila «Destacados en …» y, en la lista del día, primero (lo decide el servidor).
  const [lista, historias, spon, misRsvp, misBol, conEventos, ctx, dest] = await Promise.all([
    eventosCiudad(loc, { dia, t }, null, u?.id ?? null, es), estaNoche(loc, u?.id ?? null, es, 12, dia), patrocinadosEventos(loc, u?.id ?? null, es),
    misRsvpN(u?.id ?? null), misBoletosN(u?.id ?? null), diasConEventos(loc, sumarDias(hoy, 45)), contexto(), destacadosEventos(loc, u?.id ?? null, es),
  ]);
  // Vistas de Patrocinados: una por persona (o dispositivo) y día por patrocinio, después de responder; los robots no cuentan.
  if (spon.length && !ctx.robot) after(() => contarVistas("evento", spon.map((x) => x.sid), u?.id ?? null, u ? null : ctx.dev));
  // El calendario: hasta 2 días después del último día con eventos (entre 10 y 45 días), y siempre hasta el día elegido.
  const ultimo = conEventos.at(-1), fin = Math.max(10, Math.min(45, ultimo ? diasEntre(hoy, ultimo) + 2 : 0), diasEntre(hoy, dia));
  const [y, m, d] = dia.split("-").map(Number), dow = new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay();
  const titulo = dia === hoy ? E("Esta noche", "Tonight") : dia === sumarDias(hoy, 1) ? E("Mañana", "Tomorrow")
    : `${WL(es)[dow]!} ${d}${dia.slice(0, 7) !== hoy.slice(0, 7) ? ` ${MS(es)[m! - 1]!}` : ""}`;
  return (<><Eventos es={es} ciudad={loc.c.name} estado={loc.c.state} dia={dia} hoy={hoy} fin={sumarDias(hoy, fin)} conEventos={conEventos} titulo={titulo} t={t}
    generos={G.map((g) => ({ k: g.key, l: es ? g.label.es : g.label.en || g.label.es }))} lista={lista} historias={historias} spon={spon} dest={dest} mios={misRsvp} bol={misBol} /><PieWeb /></>);
}
