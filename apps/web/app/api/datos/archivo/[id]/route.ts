import { NextResponse, type NextRequest } from "next/server";
import { ipCliente, mismoOrigen, yo } from "@/lib/cuenta";
import { bajarExportacion } from "@/lib/datos/exportar";

/* 9d · Bajar el archivo de «Descargar mis datos» o de «Exportar los datos del negocio». UN uso, durante 24 h, solo quien lo pidió.
   - GET (la vista previa de un enlace, un buscador, alguien que lo pega en un chat) NUNCA lo gasta: lleva a la pantalla donde está «Bajar»
     (guardián enlaceUnUsoSinGet).
   - POST del mismo sitio, con la sesión de quien lo pidió: el archivo, y desde ahí ya no se puede bajar otra vez. De otra persona: 404 (igual que
     si no existiera). Bajado o vencido: 410. */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const negocio = req.nextUrl.searchParams.get("negocio");
  const destino = negocio && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(negocio) ? `/panel/${negocio}/exportar` : "/cuenta/ajustes/privacidad/datos";
  void id;
  return NextResponse.redirect(new URL(destino, req.nextUrl.origin), { status: 303, headers: { "cache-control": "no-store" } });
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await mismoOrigen())) return new NextResponse(null, { status: 403 });
  const me = await yo();
  if (!me) return new NextResponse(null, { status: 404 });
  const r = await bajarExportacion(String(id ?? ""), me.id, await ipCliente());
  if (!r.ok) return new NextResponse(null, { status: r.status, headers: { "cache-control": "no-store" } });
  return new NextResponse(new Uint8Array(r.zip), {
    status: 200,
    headers: { "content-type": "application/zip", "content-disposition": `attachment; filename="${r.nombre}"`, "cache-control": "no-store, private", "x-robots-tag": "noindex" },
  });
}
