import { NextResponse } from "next/server";
import { auditar, staff } from "@/lib/admin";
import { colasVisibles } from "@/lib/admin-colas";
import { yo } from "@/lib/cuenta";
import { db, tx } from "@/lib/db";
import { leerObjeto } from "@/lib/medios";
import { accesoPanel } from "@/lib/panel";

/* Ver una foto privada de una ayuda (Salud y Pro). La ven: quien la subió; el negocio de esa solicitud (con permiso de
   citas); el equipo de To'Latino que trabaja Soporte en esa ciudad, y cada vez queda en la auditoría («vidrio roto»).
   Nunca se cachea. Lo demás: 404 (no se dice si existe). */
export const dynamic = "force-dynamic";
const no = () => new NextResponse(null, { status: 404 });
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)) return no();
  const m = (await db().query<{ url: string; uploaded_by: string | null; owner_kind: string; owner_id: string; biz: string | null; city: string | null; hnum: string | null }>(
    `select m.url, m.uploaded_by::text, m.owner_kind, m.owner_id, h.business_id as biz, h.city_id as city, h.number as hnum
       from media m left join help_requests h on m.owner_kind = 'help' and h.id::text = m.owner_id
      where m.id = $1 and m.private and m.status = 'visible' and m.url like 'privado/a/%'`, [id])).rows[0];
  if (!m) return no();
  const me = await yo();
  let ok = !!me && me.id === m.uploaded_by;
  if (!ok && m.biz) ok = !!(await accesoPanel(m.biz, "ord"));
  if (!ok && m.biz) {
    const s = await staff();
    if (s && colasVisibles(s).includes("sop") && (!s.cities.length || (m.city && s.cities.includes(m.city)))) {
      await tx((c) => auditar(c, { actor: s.id, action: "ayuda.foto.ver", targetKind: "help_request", targetId: m.hnum ?? m.owner_id, city: m.city ?? undefined }));
      ok = true;
    }
  }
  if (!ok) return no();
  const img = await leerObjeto(m.url);
  return new NextResponse(new Uint8Array(img), { headers: { "content-type": "image/jpeg", "cache-control": "private, no-store", "x-content-type-options": "nosniff" } });
}
