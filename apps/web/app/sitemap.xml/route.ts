import { NextResponse } from "next/server";
import { indice, mapaActivo, partes } from "@/lib/seo/mapa";

export const dynamic = "force-dynamic";

/* 9h · /sitemap.xml: el índice del mapa del sitio, calculado al pedirlo. Fuera de producción no existe (404): el sandbox no se indexa nunca. */
export async function GET() {
  if (!mapaActivo()) return new NextResponse("No", { status: 404, headers: { "x-robots-tag": "noindex" } });
  return new NextResponse(indice(await partes()), { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
