import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { flagPara } from "@/lib/sistema/flags";
import { idioma } from "@/lib/idioma";
import { accesoPanel } from "@/lib/panel";
import { horario } from "@/lib/soporte";
import { horarioEquipo } from "@/lib/soporte-comun";
import { Reportar } from "./Reportar";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Reportar un problema · To'Latino" };

/* 8f · «Reportar un problema» (fase8-apps.md §4 8f, hueco #5 de la Fase 8: el formulario de Soporte compuesto con el sistema). Se abre desde
   Mi cuenta › Ayuda y soporte, Panel › Más (?negocio=), el Perfil del Repartidor, la Puerta y, en las builds de prueba, agitando el teléfono
   (?captura=agitar: la captura de esa pantalla, que no sale del teléfono hasta «Enviar»). El caso es un TK- normal de Soporte (tema técnico).
   Con app.reportar apagado: el Soporte de siempre. El negocio lo revisa el servidor (accesoPanel), igual que /soporte. */
export default async function Page({ searchParams }: { searchParams: Promise<{ negocio?: string; captura?: string }> }) {
  const [sp, lang, u] = await Promise.all([searchParams, idioma(), yo().catch(() => null)]);
  // 9j · app.reportar se decide por la persona (por ciudad o porcentaje, Sistema › Flags); sin cuenta, solo si está para todas las ciudades.
  const on = await flagPara("app.reportar", u?.id ?? null);
  const neg = sp.negocio ? String(sp.negocio).slice(0, 80) : null;
  if (!on) redirect(`/soporte?nuevo=1&tema=tecnico${neg ? `&negocio=${encodeURIComponent(neg)}` : ""}`);
  let negocio: { id: string; name: string } | null = null;
  if (neg && u) { const a = await accesoPanel(neg); if (a) negocio = { id: a.negocio.id, name: a.negocio.name }; }
  const h = await horario();
  return <Reportar es={lang === "es"} conSesion={!!u} negocio={negocio} agitado={sp.captura === "agitar"} horario={{ es: horarioEquipo(h, true), en: horarioEquipo(h, false) }} />;
}
