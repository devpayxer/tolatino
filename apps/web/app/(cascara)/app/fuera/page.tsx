import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { deLaApp } from "@/lib/app-nativa";
import { defApp, duenoDe, enAlcance } from "@/lib/app-nativa-comun";
import { idioma } from "@/lib/idioma";
import { Fuera } from "../Estados";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Se abre en otra app · To'Latino", robots: { index: false } };

/* 8a · «Esto se abre en …» (fase8-apps.md §3.1 «Alcance»): la cáscara pidió una ruta que no es suya (el middleware la manda aquí). Se abre
   FUERA de la cáscara: en la otra app si está instalada (enlace universal, 8b) o en el navegador. Una ruta del Super Admin, siempre en el
   navegador. Solo una ruta nuestra (empieza con «/» y no con «//»); cualquier otra cosa vuelve a la entrada. */
const RUTA = /^\/(?![/\\])[\w\-./?=&%,+:~]*$/;
export default async function Page({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  const [a, lang, sp] = await Promise.all([deLaApp(), idioma(), searchParams]);
  const r = typeof sp.r === "string" && RUTA.test(sp.r) && sp.r.length <= 300 ? sp.r : null;
  if (!a) redirect(r ?? "/");
  if (!r || enAlcance(a.app, r)) redirect(r ?? defApp(a.app).entrada);
  const d = duenoDe(r), es = lang === "es";
  const otra = d === "web" ? null : d === "comun" || d === "tecnico" ? null : defApp(d).nombre;
  return <Fuera es={es} ruta={r} otra={otra ? (es ? otra.es : otra.en) : null} entrada={defApp(a.app).entrada} />;
}
