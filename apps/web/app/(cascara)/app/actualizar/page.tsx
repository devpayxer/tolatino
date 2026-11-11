import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { compuerta } from "@/lib/app-nativa";
import { defApp } from "@/lib/app-nativa-comun";
import { evento } from "@/lib/eventos";
import { idioma } from "@/lib/idioma";
import { Actualizar } from "../Estados";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Actualiza la app · To'Latino", robots: { index: false } };

/* 8a · «Actualiza la app» (hueco #3): el build de esta cáscara está por debajo del mínimo de Sistema › Apps. El servidor lo decide en cada
   marco de entrada (compuerta()); aquí solo se muestra. Si ya no hace falta (o es la web), vuelve a la entrada. */
export default async function Page() {
  const [g, lang] = await Promise.all([compuerta(), idioma()]);
  if (g.estado !== "actualizar") redirect(g.estado === "web" ? "/" : defApp(g.app.app).entrada);
  await evento("app_actualizar", { props: { build: g.app.build } });
  return <Actualizar es={lang === "es"} nombre={lang === "es" ? g.nombre.es : g.nombre.en} tienda={g.tienda} plataforma={g.app.plataforma} />;
}
