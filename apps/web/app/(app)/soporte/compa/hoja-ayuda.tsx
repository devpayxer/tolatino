import type { ReactNode } from "react";
import { after } from "next/server";
import { hojaDe } from "@/lib/compa/hoja";
import { contexto, evento } from "@/lib/eventos";
import { idioma } from "@/lib/idioma";
import { lineaHorario } from "@/lib/soporte";
import { CompaVecino } from "./CompaVecino";

/* 7d · La hoja de ayuda (2as) ANTES del formulario de siempre (LAUNCH «El Compa antes de abrir la solicitud»; prototipo: navegar a la ayuda sin
   fromCompa abre la hoja sobre la pantalla de la operación). La llama la página «Ayuda con …» de cada operación con la persona de la sesión:
   - devuelve la hoja SOBRE la pantalla de la operación (la de siempre, debajo) cuando El Compa está encendido para ella y ese negocio, no
     está al tope, la operación es suya, del tipo de esa ruta, no es sensible y todavía no tiene una solicitud de ayuda;
   - devuelve null en todo lo demás, y también si algo de El Compa falla: la página sigue EXACTAMENTE como antes (formulario o estado).
   ?de=compa = la persona ya pasó por la hoja (una razón la mandó al formulario): el formulario de siempre. */
export async function hojaAyuda(u: { id: string; first_name: string | null }, num: string, de: string | undefined, kinds: string[], debajo: () => ReactNode): Promise<ReactNode | null> {
  if (de === "compa") return null;
  let x: { h: NonNullable<Awaited<ReturnType<typeof hojaDe>>>; lang: "es" | "en"; hor: string } | null = null;
  try {
    const h = await hojaDe(u.id, num, kinds);
    if (!h) return null;
    const lang = await idioma();
    const [hor, ctx] = await Promise.all([lineaHorario(lang === "es"), contexto()]);
    after(() => evento("compa_abrir", { props: { superficie: "help_sheet", tipo: h.op.kind } }, ctx));
    x = { h, lang, hor };
  } catch (e) {
    console.error("[compa] hoja de ayuda: sigue el camino de siempre", e instanceof Error ? e.message : e);
    return null;
  }
  const { h, lang, hor } = x;
  return (
    <>
      {debajo()}
      <CompaVecino modo="sheet" es={lang === "es"} nombre={u.first_name} hoja={h} hor={hor} conSesion />
    </>
  );
}
