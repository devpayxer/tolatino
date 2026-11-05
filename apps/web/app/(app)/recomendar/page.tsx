import type { Metadata } from "next";
import { yo } from "@/lib/cuenta";
import { categorias } from "@/lib/directorio";
import { idioma } from "@/lib/idioma";
import { ciudades, ubicacion } from "@/lib/ubicacion";
import { Recomendar } from "./Recomendar";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Recomienda un negocio · To'Latino" };

/* APP-NEG-RECOMENDAR (diseño «Recomendar»). ?ciudad = la ciudad «pronto» de donde viene (CitySoon); ?cat = categoría
   (desde la página de categoría); ?q = lo que buscaba en Buscar («Buscabas: …»). */
export default async function Page({ searchParams }: { searchParams: Promise<{ ciudad?: string; cat?: string; q?: string }> }) {
  const [sp, lang, u] = await Promise.all([searchParams, idioma(), yo()]);
  const [loc, cs, cats] = await Promise.all([ubicacion(u), ciudades(), categorias(lang)]);
  const c = cs.find((x) => x.id === sp.ciudad) ?? loc.c;
  const cat = cats.find((x) => x.id === sp.cat || x.slug === sp.cat)?.id ?? null;
  const q = typeof sp.q === "string" ? sp.q.replace(/\s+/g, " ").trim().slice(0, 80) : "";
  const nombre = u ? [u.first_name, u.last_name?.[0] ? `${u.last_name[0]}.` : ""].filter(Boolean).join(" ") || u.nick || null : null;
  return (
    <Recomendar v={{
      lang, ciudad: { id: c.id, n: c.name }, cat, q,
      cats: cats.map((x) => ({ id: x.id, l: x.name })),
      yo: u ? { nombre: nombre ?? (lang === "es" ? "Tú" : "You"), primero: u.first_name ?? "" } : null,
    }} />
  );
}
