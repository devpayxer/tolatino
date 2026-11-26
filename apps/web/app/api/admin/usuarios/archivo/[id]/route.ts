import { NextResponse, type NextRequest } from "next/server";
import { staff } from "@/lib/admin";
import { ipCliente, mismoOrigen } from "@/lib/cuenta";
import { bajarExportacionEquipo } from "@/lib/datos/exportar";
import { irA } from "@/lib/ir-a";

/* 26 nov · Bajar el archivo de «Exportar sus datos» (Super Admin › Usuarios 360° › Privacidad): el MISMO camino que «Descargar mis datos» de la
   persona (/api/datos/archivo/<id>), para el equipo. UN uso, durante EQUIPO_VENCE_MIN minutos, solo la persona del equipo que lo armó.
   - GET (la vista previa de un enlace, un buscador) NUNCA lo gasta: lleva a Usuarios (guardián enlaceUnUsoSinGet).
   - POST del mismo sitio, con la sesión y el segundo factor de quien lo armó (staff()), con usr:exportar y la persona en sus ciudades AHORA (se
     revisa en cada descarga, no solo al armarlo: bajarExportacionEquipo): el archivo, en flujo desde el almacén, y ya no se baja otra vez. Sin
     permiso, de otra persona del equipo o de otra ciudad: 404 (igual que si no existiera). Bajado o vencido: 410.
   - La dirección lleva solo el id de la fila (al azar): nada de la persona. Sin content-length (Next 15 lo quita; guardián exportacionEnFlujo). */
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  void id;
  return irA("/admin/usuarios", 303, { "cache-control": "no-store" });
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await mismoOrigen())) return new NextResponse(null, { status: 403 });
  const s = await staff();
  if (!s || !s.puede("usr", "exportar")) return new NextResponse(null, { status: 404, headers: { "cache-control": "no-store" } });
  const r = await bajarExportacionEquipo(String(id ?? ""), s, await ipCliente());
  if (!r.ok) return new NextResponse(null, { status: r.status, headers: { "cache-control": "no-store" } });
  return new NextResponse(r.cuerpo, {
    status: 200,
    headers: { "content-type": "application/zip", "content-disposition": `attachment; filename="${r.nombre}"`, "cache-control": "no-store, private", "x-robots-tag": "noindex" },
  });
}
