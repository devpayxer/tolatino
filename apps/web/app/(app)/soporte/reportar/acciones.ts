"use server";
/* 8f · «Reportar un problema» › «Enviar». Solo con sesión y desde nuestra página (mismoOrigen); la persona sale SIEMPRE de la sesión (yo()), nunca
   de lo que mande el teléfono. El registro técnico y la captura llegan aquí SOLO desde el botón «Enviar» (guardián reporteConConsentimiento);
   lib/reportar.ts los vuelve a tapar y acotar y abre el caso TK- (tema técnico, origen reporte_app). El negocio lo revisa lib/soporte. */
import { mismoOrigen, yo } from "@/lib/cuenta";
import { reportarProblema, type ReporteIn } from "@/lib/reportar";
import type { ResS } from "@/lib/soporte";

const SIN: ResS = { ok: false, msg: { es: "Entra para enviar tu reporte.", en: "Sign in to send your report." } };

export async function reportar(x: ReporteIn, negocio?: string | null): Promise<ResS> {
  if (!(await mismoOrigen())) return SIN;
  const u = await yo();
  if (!u) return SIN;
  return reportarProblema({ userId: u.id, negocio: typeof negocio === "string" && negocio ? negocio.slice(0, 80) : null }, {
    texto: String(x?.texto ?? ""), foto: x?.foto ? String(x.foto) : null, registro: Array.isArray(x?.registro) ? x.registro.slice(-200) : [],
    captura: x?.captura === "agitar" ? "agitar" : "archivo", clave: x?.clave ? String(x.clave) : null,
  });
}
