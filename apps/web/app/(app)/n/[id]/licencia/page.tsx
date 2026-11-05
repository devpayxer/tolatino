import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { idioma } from "@/lib/idioma";
import { licenciaPagina } from "@/lib/licencias";
import { Licencia } from "./Licencia";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const [{ id }, lang] = await Promise.all([params, idioma()]);
  const l = await licenciaPagina(id, lang);
  return { title: l ? `${l.nombre} · ${lang === "es" ? "Licencia" : "License"} · To'Latino` : "To'Latino" };
}

/* APP-NEG-LICENCIA (archivo de diseño «To'Latino Licencia»): ¿puede hacerlo por ley? y cómo la verificamos. */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, lang] = await Promise.all([params, idioma()]);
  const l = await licenciaPagina(id, lang);
  if (!l) notFound();
  return <Licencia l={l} lang={lang} />;
}
