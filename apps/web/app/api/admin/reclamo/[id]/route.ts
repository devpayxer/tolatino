import { NextResponse } from "next/server";
import { auditar, staff } from "@/lib/admin";
import { colasVisibles } from "@/lib/admin-colas";
import { tx } from "@/lib/db";
import { leerObjeto } from "@/lib/medios";

/* El documento de un reclamo, solo para el equipo que trabaja «Cambios sensibles» (en su ciudad). Cada vez que alguien
   lo ve queda en la auditoría. Nunca se cachea. */
export const dynamic = "force-dynamic";
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await staff();
  if (!s || !colasVisibles(s).includes("cambio") || !/^CL-\d{1,12}$/.test(id)) return new NextResponse(null, { status: 404 });
  const r = await tx(async (c) => {
    const x = (await c.query<{ url: string; city_id: string; business_id: string }>(
      `select m.url, cl.city_id, cl.business_id from claims cl join media m on m.id = cl.doc_media where cl.id = $1 and m.private`, [id])).rows[0];
    if (!x || (s.cities.length && !s.cities.includes(x.city_id))) return null;
    await auditar(c, { actor: s.id, action: "reclamo.documento.ver", targetKind: "claim", targetId: id, city: x.city_id });
    return x;
  });
  if (!r || !r.url.startsWith("privado/")) return new NextResponse(null, { status: 404 });
  const img = await leerObjeto(r.url);
  return new NextResponse(new Uint8Array(img), { headers: { "content-type": "image/jpeg", "cache-control": "private, no-store", "x-content-type-options": "nosniff" } });
}
