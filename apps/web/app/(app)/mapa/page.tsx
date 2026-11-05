import type { Metadata } from "next";
import { yo } from "@/lib/cuenta";
import { categorias } from "@/lib/directorio";
import { categoriaPorSlug, conteos, filtros, mosaicos } from "@/lib/categoria";
import { idioma } from "@/lib/idioma";
import { negociosMapa, type FiltroMapa } from "@/lib/mapa";
import { ubicacion } from "@/lib/ubicacion";
import { PantallaPronto } from "../PantallaPronto";
import { Mapa } from "./Mapa";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mapa · To'Latino" };

type SP = { cat?: string; sub?: string; f?: string; m?: string; ctx?: string };

/* APP-NEG-MAPA (diseño «Mapa»): pines + lista con los filtros de donde vienes (la categoría manda ?cat, ?sub, ?f y
   ctx=1) y los del propio mapa (?m = open · ver · pro; sin contexto, ?cat como chip de categoría). */
export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const [sp, lang, u] = await Promise.all([searchParams, idioma(), yo()]);
  const loc = await ubicacion(u);
  if (loc.c.status !== "on") return <PantallaPronto loc={loc} lang={lang} userId={u?.id ?? null} />;
  const es = lang === "es";
  const cats = await categorias(lang);
  const c = typeof sp.cat === "string" ? await categoriaPorSlug(sp.cat) : null;
  const ctx = !!c && sp.ctx === "1";
  // Del contexto de la categoría: mosaico y filtros, validados contra lo que la categoría ofrece.
  const reglas = c && ctx ? mosaicos(c.page) : null;
  const sub = reglas && typeof sp.sub === "string" && reglas.has(sp.sub) ? reglas.get(sp.sub)! : null;
  const validos = c && ctx ? new Set((await filtros(c.id, lang)).map((x) => x.key)) : new Set<string>();
  const fs = [...new Set(String(sp.f ?? "").split(",").filter((k) => validos.has(k)))];
  const m: FiltroMapa = (["open", "ver", "pro"] as const).find((x) => x === sp.m) ?? "all";
  const [res, n] = await Promise.all([negociosMapa(loc, { cat: c?.id ?? null, sub, filtros: fs, f: m }, lang), ctx ? Promise.resolve(null) : conteos(loc)]);
  const cat = c ? cats.find((x) => x.id === c.id) ?? null : null;
  return (
    <Mapa v={{
      lang, ciudad: loc.c.name, rad: loc.rad, centro: [loc.lat, loc.lng], f: m, ctx, catSlug: cat?.slug ?? null,
      // Contexto de la categoría: lo que se lleva para volver con los mismos filtros.
      volver: ctx && cat ? `/c/${cat.slug}?${new URLSearchParams({ ...(typeof sp.sub === "string" && sub ? { sub: sp.sub } : {}), ...(fs.length ? { f: fs.join(",") } : {}) })}`.replace(/\?$/, "") : null,
      titulo: cat?.name ?? (es ? "Negocios cerca de ti" : "Businesses near you"),
      cats: n ? cats.filter((x) => (n.get(x.id) ?? 0) > 0).map((x) => ({ slug: x.slug, l: x.label })) : [],
      total: res.total, adentro: res.adentro, sinPin: res.sinPin, pins: res.pins,
    }} />
  );
}
