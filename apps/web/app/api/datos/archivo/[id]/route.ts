import { NextResponse, type NextRequest } from "next/server";
import { ipCliente, mismoOrigen, yo } from "@/lib/cuenta";
import { bajarExportacion } from "@/lib/datos/exportar";
import { irA } from "@/lib/ir-a";

/* 9d · Bajar el archivo de «Descargar mis datos» o de «Exportar los datos del negocio». UN uso, durante 24 h, solo quien lo pidió.
   - GET (la vista previa de un enlace, un buscador, alguien que lo pega en un chat) NUNCA lo gasta: lleva a la pantalla donde está «Bajar»
     (guardián enlaceUnUsoSinGet).
   - POST del mismo sitio, con la sesión de quien lo pidió: el archivo, y desde ahí ya no se puede bajar otra vez. De otra persona: 404 (igual que
     si no existiera). Bajado o vencido: 410.
   - 22 nov · En flujo: el ZIP pasa del almacén a quien lo baja por partes (bajarExportacion abre el objeto con abrirObjeto); la ruta nunca lo
     tiene entero (guardián exportacionEnFlujo). Las cabeceras, las mismas; más su content-length. */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const negocio = req.nextUrl.searchParams.get("negocio");
  const destino = negocio && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(negocio) ? `/panel/${negocio}/exportar` : "/cuenta/ajustes/privacidad/datos";
  void id;
  return irA(destino, 303, { "cache-control": "no-store" });
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await mismoOrigen())) return new NextResponse(null, { status: 403 });
  const me = await yo();
  if (!me) return new NextResponse(null, { status: 404 });
  const r = await bajarExportacion(String(id ?? ""), me.id, await ipCliente());
  if (!r.ok) return new NextResponse(null, { status: r.status, headers: { "cache-control": "no-store" } });
  const largo: Record<string, string> = r.largo != null ? { "content-length": String(r.largo) } : {};
  return new NextResponse(r.cuerpo, {
    status: 200,
    headers: { "content-type": "application/zip", "content-disposition": `attachment; filename="${r.nombre}"`, "cache-control": "no-store, private", "x-robots-tag": "noindex", ...largo },
  });
}
