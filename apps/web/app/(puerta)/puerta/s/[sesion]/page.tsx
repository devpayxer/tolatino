import { redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { accesoPuerta, aforo, cierre, equipo, incidencias, lista, listaNoche, mesas, resumenFecha, ultimos } from "@/lib/puerta";
import { Puerta, PuertaCerrada } from "../../Puerta";

export const dynamic = "force-dynamic";
const TABS = ["escanear", "buscar", "lista", "aforo", "mas", "mesas", "incid", "equipo", "cierre", "noche"] as const;
type Tab = (typeof TABS)[number];

/* /puerta/s/{sesión} · la puerta abierta: Escanear · Buscar · Lista · Aforo · Más (Mesas · Incidencias · Equipo · Cierre) y, en Noche, la
   lista de la noche. Cada carga vuelve a preguntar a la base si la persona sigue con acceso (portero quitado = «ya no tienes acceso»). */
export default async function Page({ params, searchParams }: { params: Promise<{ sesion: string }>; searchParams: Promise<{ t?: string; f?: string; c?: string }> }) {
  const [u, lang, { sesion }, sp] = await Promise.all([yo(), idioma(), params, searchParams]);
  if (!u?.first_name) redirect(`/entrar?volver=${encodeURIComponent("/puerta")}`);
  const es = lang === "es";
  const ctx = await accesoPuerta(u.id, sesion);
  if (!ctx) return <PuertaCerrada es={es} />;
  const def: Tab = ctx.entry === "rsvp" ? "lista" : "escanear";
  const t: Tab = TABS.includes(sp.t as Tab) ? (sp.t as Tab) : def;
  const [r, data] = await Promise.all([resumenFecha(ctx.fecha), (async () => {
    if (t === "lista") return { lista: await lista(ctx, String(sp.f ?? "todos"), typeof sp.c === "string" ? sp.c.slice(0, 120) : null, es) };
    if (t === "aforo") return { aforo: await aforo(ctx, es) };
    if (t === "mesas") return { mesas: await mesas(ctx, es) };
    if (t === "incid") return { incid: await incidencias(ctx.fecha, ctx.tz) };
    if (t === "equipo") return { equipo: await equipo(ctx.fecha, ctx.tz) };
    if (t === "cierre") return { cierre: await cierre(ctx.fecha, ctx.evento, ctx.dayIndex) };
    if (t === "noche") return { noche: await listaNoche(ctx, "") };
    if (t === "escanear") return { ultimos: await ultimos(ctx.fecha, ctx.tz, es, 5) };
    return {};
  })()]);
  const { userId: _u, ...c } = ctx;
  void _u;
  return <Puerta es={es} t={t} f={String(sp.f ?? "todos")} ctx={c} r0={r} {...data} />;
}
