import { requerir } from "@/lib/admin";
import { homeAdmin } from "@/lib/cms-admin";
import { idioma } from "@/lib/idioma";
import { TextosHome } from "../../TextosHome";

/* 9f · Super Admin › Textos y páginas › Home por ciudad (y sus Anuncios): ver cms:ver · editar cms:editar. ?c=<ciudad>; por omisión, la primera abierta. */
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await requerir("cms", "ver");
  const [sp, l] = await Promise.all([searchParams, idioma()]);
  const base = await homeAdmin(null);
  const ciudad = base.ciudades.find((c) => c.id === sp.c) ?? base.ciudades[0];
  if (!ciudad) return null;
  const d = await homeAdmin(ciudad.id);
  return <TextosHome key={ciudad.id} d={d} ciudad={d.ciudades.find((c) => c.id === ciudad.id) ?? ciudad} l={l} editar={s.puede("cms", "editar")} />;
}
