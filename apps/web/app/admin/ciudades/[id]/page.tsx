import { notFound } from "next/navigation";
import { requerir } from "@/lib/admin";
import { detalle } from "@/lib/ciudades/admin";
import { idioma } from "@/lib/idioma";
import { CiudadDetalle } from "../../Ciudades";

/* ADM-CIUD · Una ciudad (9i): estado, regla, asistente de apertura, beta, barrios, ajustes, cierre e historial. Ver: ciud:ver; cada acción revisa lo suyo. */
export const dynamic = "force-dynamic";
export default async function Ciudad({ params }: { params: Promise<{ id: string }> }) {
  const s = await requerir("ciud", "ver");
  const { id } = await params;
  const [d, l] = await Promise.all([detalle(s, id), idioma()]);
  if (!d) notFound();
  return <CiudadDetalle d={d} l={l} puede={{ editar: s.puede("ciud", "editar"), aprobar: s.puede("ciud", "aprobar"), admin: s.role === "admin" && s.puede("ciud", "aprobar") }} />;
}
