import type { Metadata } from "next";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { candidatos, recuperar } from "@/lib/reclamos";
import { ubicacion } from "@/lib/ubicacion";
import { Recuperar } from "../Recuperar";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Recuperar tu negocio · To'Latino", robots: { index: false, follow: false } };

/* ONB-NEG-RECUPERAR · /recuperar/{negocio}?volver=publica. Si el negocio no existe: «¿Cuál es tu negocio?» con parecidos. */
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ volver?: string; q?: string }> }) {
  const [{ id }, sp, lang, u] = await Promise.all([params, searchParams, idioma(), yo()]);
  const r = await recuperar(id, u?.id ?? null, lang);
  const loc = r ? null : await ubicacion(u);
  const cands = r ? [] : await candidatos(sp.q ?? id.replace(/-/g, " "), loc!.c.id);
  return <Recuperar r={r} cands={cands} ciudad={r?.ciudad ?? loc!.c.name} lang={lang} conSesion={!!u?.first_name} origen={sp.volver === "publica" ? "publica" : "directo"} id={id} />;
}
