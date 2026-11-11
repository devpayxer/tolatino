import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { compuerta } from "@/lib/app-nativa";
import { defApp } from "@/lib/app-nativa-comun";
import { idioma } from "@/lib/idioma";
import { Pausa } from "../Estados";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "App en pausa · To'Latino", robots: { index: false } };

/* 8a · «Esta app está en pausa» (interruptor app.cascara.{app} de Sistema › Apps, para emergencias): la cáscara no abre su entrada y ofrece
   la web. Si la app ya está abierta otra vez (o es la web), vuelve a la entrada. */
export default async function Page() {
  const [g, lang] = await Promise.all([compuerta(), idioma()]);
  if (g.estado !== "pausa") redirect(g.estado === "web" ? "/" : defApp(g.app.app).entrada);
  return <Pausa es={lang === "es"} nombre={lang === "es" ? g.nombre.es : g.nombre.en} entrada={defApp(g.app.app).entrada} />;
}
