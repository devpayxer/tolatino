import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { avisoDe, misAvisos } from "@/lib/apelaciones";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { yoMarco } from "../yo";
import { Moderacion } from "./Moderacion";

export const metadata: Metadata = { title: "Avisos de moderación · To'Latino", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/* 5d · Mi cuenta › Avisos de moderación (hueco #3): lo que To'Latino ocultó de la persona y sus sanciones, con el motivo y «Apelar»
   (14 días, una vez); ?k=&id= abre uno (el aviso de la campana lleva aquí). Solo lo propio; pide sesión. */
export default async function Page({ searchParams }: { searchParams: Promise<{ k?: string; id?: string }> }) {
  const [u, lang, sp] = await Promise.all([yo(), idioma(), searchParams]);
  const volver = sp.k && sp.id ? `/cuenta/moderacion?k=${encodeURIComponent(sp.k)}&id=${encodeURIComponent(sp.id)}` : "/cuenta/moderacion";
  if (!u) redirect(`/entrar?volver=${encodeURIComponent(volver)}`);
  const es = lang === "es";
  const me = await yoMarco(u, es);
  if (sp.k && sp.id) {
    const a = await avisoDe(u.id, String(sp.k), String(sp.id));
    return <Moderacion es={es} yo={me} uno={a} buscado lista={null} />;
  }
  return <Moderacion es={es} yo={me} uno={null} buscado={false} lista={await misAvisos(u.id)} />;
}
