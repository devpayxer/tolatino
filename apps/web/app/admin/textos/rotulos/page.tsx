import { requerir } from "@/lib/admin";
import { rotulosAdmin } from "@/lib/cms-admin";
import { idioma } from "@/lib/idioma";
import { TextosRotulos } from "../../TextosRotulos";

/* 9f · Super Admin › Textos y páginas › Rótulos por categoría: ver cms:ver · editar cms:editar. */
export default async function Page() {
  const s = await requerir("cms", "ver");
  const [filas, l] = await Promise.all([rotulosAdmin(), idioma()]);
  return <TextosRotulos filas={filas} l={l} editar={s.puede("cms", "editar")} />;
}
