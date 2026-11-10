import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { estadoVecino, opsVecino } from "@/lib/compa/hoja";
import { yo } from "@/lib/cuenta";
import { contexto, evento } from "@/lib/eventos";
import { idioma } from "@/lib/idioma";
import { lineaHorario } from "@/lib/soporte";
import { CompaVecino } from "./CompaVecino";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ayuda · El Compa · To'Latino", robots: { index: false } };

/* 7d · APP-COMPA · pasos guiados (2at; `To'Latino Compa.dc.html` mode page, variante 1c), desde «Pregúntale al Compa» de Soporte. Sin sesión:
   «Entra para que El Compa vea tus pedidos y citas.». Apagado para esta persona (nivel, canal o ciudad): vuelve a Soporte, donde sale
   «Escríbenos» como siempre. Al tope sigue aquí y contestan las reglas fijas (el motor lo decide en cada turno). Sus operaciones salen de la
   sesión (lib/compa/hoja.ts; nunca las de otra persona, ni Salud, Profesionales o Niños). Si algo de El Compa falla, Soporte de siempre. */
export default async function Page() {
  const [lang, u] = await Promise.all([idioma(), yo().catch(() => null)]);
  const es = lang === "es";
  const e = await estadoVecino(u?.id ?? null).catch(() => ({ encendido: false, alTope: false }));
  if (!e.encendido) redirect("/soporte");
  const [ops, hor, ctx] = await Promise.all([u ? opsVecino(u.id).catch(() => []) : Promise.resolve([]), lineaHorario(es), contexto()]);
  after(() => evento("compa_abrir", { props: { superficie: "support_page" } }, ctx));
  return <CompaVecino modo="page" es={es} nombre={u?.first_name ?? null} ops={ops} hor={hor} conSesion={!!u} />;
}
