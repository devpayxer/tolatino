import "server-only";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { compuerta } from "@/lib/app-nativa";
import { contexto, evento } from "@/lib/eventos";
import { idioma } from "@/lib/idioma";
import { AvisoActualizar } from "./AvisoActualizar";

/* 8a · La compuerta de cada entrada (marco de To'Latino, del panel, del Repartidor y de la Puerta): dentro de una cáscara, el servidor decide
   si sigue, si avisa de una versión nueva o si manda a «Actualiza la app» / «Esta app está en pausa». En la web no hace nada (ni lee la base).
   Nunca decide qué puede hacer la persona: eso lo decide cada página con la sesión (guardián appNoAutoriza). */
export async function CompuertaApp() {
  const g = await compuerta();
  if (g.estado === "web") return null;
  if (g.estado === "actualizar") redirect("/app/actualizar");
  if (g.estado === "pausa") redirect("/app/pausa");
  const ctx = await contexto(); // antes de after(): ahí ya no hay petición
  after(() => evento("app_abrir", { props: { build: g.app.build } }, ctx));
  if (g.estado !== "aviso") return null;
  const es = (await idioma()) === "es";
  return <AvisoActualizar es={es} nombre={es ? g.nombre.es : g.nombre.en} tienda={g.tienda} build={g.app.build} />;
}
