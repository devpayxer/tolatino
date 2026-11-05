import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { guardados } from "@/lib/categoria";
import { ficha } from "@/lib/ficha";
import { idioma } from "@/lib/idioma";
import { T } from "@/lib/textos";
import { Ficha } from "./Ficha";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const [{ id }, lang] = await Promise.all([params, idioma()]);
  const f = await ficha(id, lang);
  return f ? { title: `${f.nombre} · To'Latino`, description: f.subsLinea } : { title: "To'Latino" };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, lang, u] = await Promise.all([params, idioma(), yo()]);
  const f = await ficha(id, lang);
  if (!f) notFound();
  const fav = await guardados(u?.id ?? null, [f.id]);
  const t = T[lang].ficha;
  return (
    <Ficha
      f={{ ...f, guardado: fav.has(f.id) }}
      t={{
        ...t,
        photosAll: f.nFotos === 1 ? t.photosOne : t.photosN.replace("{n}", String(f.nFotos)),
        photoCount: f.nFotos === 1 ? t.photoCountOne : t.photoCount.replace("{n}", String(f.nFotos)),
        relSub: t.relSub.replace("{n}", f.nombre),
      }}
    />
  );
}
