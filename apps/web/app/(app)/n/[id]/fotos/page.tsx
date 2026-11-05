import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { galeria } from "@/lib/ficha";
import { idioma } from "@/lib/idioma";
import { T } from "@/lib/textos";
import { Galeria } from "./Galeria";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const g = await galeria(id, null);
  return { title: g ? `${g.nombre} · Fotos · To'Latino` : "To'Latino" };
}

/* APP-NEG-GALERIA (archivo de diseño «To'Latino Galería»). ?at=N abre la foto N directamente. */
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ at?: string }> }) {
  const [{ id }, sp, lang, u] = await Promise.all([params, searchParams, idioma(), yo()]);
  const g = await galeria(id, u?.id ?? null);
  if (!g) notFound();
  const t = T[lang].gal, n = g.fotos.length;
  const at = Number.parseInt(String(sp.at ?? ""), 10);
  return (
    <Galeria
      g={g}
      inicial={Number.isFinite(at) && at >= 0 && at < n ? at : -1}
      conSesion={!!u}
      t={{
        ...t, motivos: undefined,
        ojo: n === 1 ? t.foto : t.fotos.replace("{n}", String(n)), titulo: t.titulo.replace("{n}", g.nombre),
        seccion: t.seccion.replace("{n}", String(n)), seccionSub: t.seccionSub.replace("{n}", g.nombre), volver: g.nombre,
      }}
      motivos={Object.entries(t.motivos).map(([k, l]) => ({ k, l }))}
    />
  );
}
