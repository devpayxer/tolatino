import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { citasPublica, sillaPublica } from "@/lib/citas";
import { ficha } from "@/lib/ficha";
import { idioma } from "@/lib/idioma";
import { resumenResenas } from "@/lib/resenas";
import { T } from "@/lib/textos";
import { ubicacion } from "@/lib/ubicacion";
import { Ficha } from "../../Ficha";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string; n: string }> }): Promise<Metadata> {
  const { id, n } = await params, s = await sillaPublica(id, Number(n));
  return s ? { title: `${s.nombre} · ${s.negocio} · To'Latino` } : { title: "To'Latino" };
}

/* La página de una silla rentada (Fase 3 · 3d; prototipo neg-bell-book.js · kind 'silla'): la persona como su propio
   negocio dentro del local: sus servicios y precios, su agenda, cómo confirma, su depósito y sus reseñas («Con Kelvin»);
   «renta su silla en» lleva al local. Es la misma ficha con los datos de la persona. */
export default async function Page({ params, searchParams }: { params: Promise<{ id: string; n: string }>; searchParams: Promise<{ tab?: string }> }) {
  const [{ id, n }, lang, u, sp] = await Promise.all([params, idioma(), yo(), searchParams]);
  const s = await sillaPublica(id, Number(n));
  if (!s) notFound();
  const loc = await ubicacion(u);
  const [f, svc, res] = await Promise.all([ficha(id, lang, loc), citasPublica(id, u?.id ?? null), resumenResenas(id, u?.id ?? null, s.id)]);
  if (!f || !svc || !svc.gente.some((p) => p.id === s.id)) notFound();
  const es = lang === "es", L = (a: string, b: string) => (es ? a : b), t = T[lang].ficha;
  const nRes = res?.n ?? 0, avg = res?.avg ?? null;
  const ini = s.nombre.split(" ").map((x) => x.charAt(0)).join("").slice(0, 2).toUpperCase();
  const puesto = es ? s.puesto.es : s.puesto.en;
  const f2 = {
    ...f, guardado: false, nombre: s.nombre, logo: s.foto, iniciales: ini, verificado: false,
    subsLinea: `${es ? s.oficio.es : s.oficio.en} · ${puesto} ${s.silla} ${L("en", "at")} ${s.negocio}`,
    s1: nRes >= 5 ? (avg?.toFixed(1) ?? "") : nRes > 0 ? String(nRes) : L("Nuevo", "New"), s1Estrella: nRes >= 5,
    s1Sub: nRes >= 5 ? `${nRes} ${L("RESEÑAS", "REVIEWS")}` : nRes > 0 ? L("RESEÑAS", "REVIEWS") : L(`EN SU ${puesto.toUpperCase()}`, `IN THE ${puesto.toUpperCase()}`),
    sobre: (s.bio ? (es ? s.bio.es : s.bio.en || s.bio.es) : null) || null, desde: s.since ? L(`EN SU ${puesto.toUpperCase()} DESDE ${s.since}`, `IN THE ${puesto.toUpperCase()} SINCE ${s.since}`) : null,
    quien: null, relacionados: [], oferta: null, ley: null, mensajes: f.mensajes,
  };
  return (
    <Ficha f={f2} menu={null} rsv={null} svc={svc} resenas={res && res.n ? res : null} novedades={null} jobs={[]} sesion={!!u} es={es} tabInicial={sp.tab === "rev" || sp.tab === "res" ? sp.tab : "svc"}
      silla={{ k: `${puesto} ${s.silla}${s.since ? ` · ${L("desde", "since")} ${s.since}` : ""}`.toUpperCase(), name: s.negocio, meta: (s.direccion ?? "").toUpperCase(), logo: s.logo, href: `/n/${id}?tab=svc`, miembro: s.id }}
      t={{ ...t, photosAll: f.nFotos === 1 ? t.photosOne : t.photosN.replace("{n}", String(f.nFotos)), photoCount: f.nFotos === 1 ? t.photoCountOne : t.photoCount.replace("{n}", String(f.nFotos)), relSub: t.relSub.replace("{n}", f.nombre) }} />
  );
}
