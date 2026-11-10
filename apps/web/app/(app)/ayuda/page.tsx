import type { Metadata } from "next";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { audienciasDe, buscarAyuda, listaAyuda, temasAyuda } from "@/lib/compa/ayuda-indice";
import { CentroAyuda } from "./CentroAyuda";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Centro de ayuda · To'Latino", description: "Respuestas cortas a lo que más nos preguntan, en español y en inglés." };

/* 7a · Centro de ayuda (WEB-AYUDA compuesto con la plantilla de «To'Latino Página»: hueco #2 de fase7-compa.md §1b). Buscar, temas y la
   lista de artículos. Lo que se ve lo decide el servidor con la sesión: vecino (y sin cuenta) solo «vecino»; quien tiene un panel suma
   «negocio»; un portero suma «portero»; el equipo de To'Latino ve también «equipo». */
export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; t?: string }> }) {
  const [sp, lang, u] = await Promise.all([searchParams, idioma(), yo().catch(() => null)]);
  const aud = await audienciasDe(u?.id ?? null);
  const temas = await temasAyuda(aud);
  const q = String(sp.q ?? "").trim().slice(0, 120);
  const t = temas.some((x) => x.key === sp.t) ? String(sp.t) : null;
  const [lista, hallados] = await Promise.all([q ? Promise.resolve([]) : listaAyuda(aud, lang, t), q.length >= 2 ? buscarAyuda(q, lang, aud) : Promise.resolve(null)]);
  return <CentroAyuda es={lang === "es"} q={q} t={t} temas={temas} lista={lista} hallados={hallados} conSesion={!!u} equipo={aud.includes("equipo")} />;
}
