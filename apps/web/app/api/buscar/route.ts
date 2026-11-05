import { NextResponse, type NextRequest } from "next/server";
import { dominante, entender, negocios, resaltar, sugerirCatalogo } from "@/lib/buscar";
import { categorias } from "@/lib/directorio";
import { idioma } from "@/lib/idioma";
import { yo } from "@/lib/cuenta";
import { ubicacion } from "@/lib/ubicacion";

/* Sugerencias mientras se escribe (APP-BUSCAR · sugerencias): solo lectura, no se registra. */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").slice(0, 80);
  const catParam = req.nextUrl.searchParams.get("cat");
  const [lang, u] = await Promise.all([idioma(), yo()]);
  const loc = await ubicacion(u);
  if (loc.c.status !== "on") return NextResponse.json({ filas: [], intenciones: [], total: 0 });
  const CIUDAD = loc.ciudad;
  const es = lang === "es", L = (a: string, b: string) => (es ? a : b);
  const cats = await categorias(lang);
  const cat = cats.find((c) => c.slug === catParam)?.id ?? null;
  if (!q.trim()) return NextResponse.json({ filas: [], intenciones: [], total: 0 });
  const E = await entender(q, true);
  const [r, C] = await Promise.all([negocios(E, { punto: loc, cat, limite: 4, vivo: true }), sugerirCatalogo(E, CIUDAD, cat)]);
  const G = E.grupos;
  const catSlug = (id: string) => cats.find((c) => c.id === id)?.slug ?? "";
  const filas: { seccion: string; parts: [string, string, string]; image: string | null; icon: string | null; meta: string; right: string | null; rightColor: string | null; href: string }[] = [];
  for (const s of C.subs.slice(0, 3)) filas.push({ seccion: L("CATEGORÍAS", "CATEGORIES"), parts: resaltar(es ? s.es : s.en, G), image: s.foto, icon: s.icon, meta: `${(es ? s.catEs : s.catEn).toUpperCase()} · ${s.n} ${s.n === 1 ? L("NEGOCIO", "BUSINESS") : L("NEGOCIOS", "BUSINESSES")}`, right: null, rightColor: null, href: `/buscar?q=${encodeURIComponent(es ? s.es : s.en)}&cat=${catSlug(s.cat)}` });
  for (const c of C.cats.slice(0, 1)) filas.push({ seccion: L("CATEGORÍAS", "CATEGORIES"), parts: resaltar(es ? c.catEs : c.catEn, G), image: null, icon: c.icon, meta: L("CATEGORÍA", "CATEGORY"), right: null, rightColor: null, href: `/c/${catSlug(c.cat)}` });
  if (!C.subs.length) for (const s of C.vacias.slice(0, 1)) filas.push({ seccion: L("CATEGORÍAS", "CATEGORIES"), parts: resaltar(es ? s.es : s.en, G), image: null, icon: s.icon, meta: L(`AÚN NO HAY EN ${loc.c.name.toUpperCase()}`, `NONE IN ${loc.c.name.toUpperCase()} YET`), right: null, rightColor: null, href: `/buscar?q=${encodeURIComponent(q)}` });
  for (const b of r.items) filas.push({ seccion: L("NEGOCIOS", "BUSINESSES"), parts: resaltar(b.name, G), image: b.photo, icon: null, meta: `${b.mi != null ? `${b.mi} MI` : ""}`, right: b.open ? L("Abierto", "Open") : L("Cerrado", "Closed"), rightColor: b.open ? "var(--tl-open-text)" : "var(--tl-danger)", href: `/n/${b.id}` });
  void dominante;
  return NextResponse.json({
    filas, total: r.total, parcial: r.parcial,
    intenciones: E.intenciones.map((i) => (es ? i.label.es : i.label.en).toUpperCase()),
  }, { headers: { "Cache-Control": "no-store" } });
}
