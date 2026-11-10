import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { articulo, audienciasDe, listaAyuda, temasAyuda, titulosVisibles } from "@/lib/compa/ayuda-indice";
import { ArticuloAyuda } from "./ArticuloAyuda";

export const dynamic = "force-dynamic";

/* 7a · Un artículo del Centro de ayuda (/ayuda/{slug}). El servidor decide si esta persona lo puede leer (su audiencia); si no, 404 —
   igual que si no existiera: un vecino nunca sabe que hay ayuda del equipo. En el idioma de la app, con «Ver en inglés / en español». */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const [{ slug }, lang, u] = await Promise.all([params, idioma(), yo().catch(() => null)]);
  const a = await articulo(slug, await audienciasDe(u?.id ?? null));
  return { title: a ? `${lang === "es" ? a.title.es : a.title.en} · To'Latino` : "Ayuda · To'Latino", robots: a && a.audience === "vecino" ? undefined : { index: false } };
}

export default async function Page({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ l?: string }> }) {
  const [{ slug }, sp, lang, u] = await Promise.all([params, searchParams, idioma(), yo().catch(() => null)]);
  const aud = await audienciasDe(u?.id ?? null);
  const a = await articulo(slug, aud);
  if (!a) notFound();
  const ver = sp.l === "en" || sp.l === "es" ? sp.l : lang;
  const [temas, mismos, vis] = await Promise.all([temasAyuda(aud), listaAyuda(aud, lang, a.topic), titulosVisibles(aud)]);
  const t = temas.find((x) => x.key === a.topic) ?? null;
  return <ArticuloAyuda es={lang === "es"} ver={ver} a={a} tema={t} mismos={mismos.filter((x) => x.slug !== a.slug).slice(0, 8)} vis={vis} conSesion={!!u} />;
}
