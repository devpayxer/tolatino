import { NextResponse, type NextRequest } from "next/server";
import { mapaActivo, parte, urlset } from "@/lib/seo/mapa";

export const dynamic = "force-dynamic";

/* 9h · /mapa-del-sitio/{n}.xml: una parte del mapa del sitio (0 = lo general; 1… = los negocios). Fuera de producción no existe (404). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ parte: string }> }) {
  if (!mapaActivo()) return new NextResponse("No", { status: 404, headers: { "x-robots-tag": "noindex" } });
  const m = /^(\d{1,4})\.xml$/.exec((await params).parte ?? "");
  if (!m) return new NextResponse("No", { status: 404 });
  return new NextResponse(urlset(await parte(Number(m[1]))), { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
