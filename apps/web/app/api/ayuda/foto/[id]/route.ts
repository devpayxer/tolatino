import { NextResponse } from "next/server";
import { auditar, staff } from "@/lib/admin";
import { colasVisibles } from "@/lib/admin-colas";
import { yo } from "@/lib/cuenta";
import { db, tx } from "@/lib/db";
import { leerObjeto } from "@/lib/medios";
import { accesoPanel } from "@/lib/panel";
import { ayudaDeSalud, vidrioVigente } from "@/lib/sistema/vidrio";

/* Ver una foto privada de una ayuda (Salud y Pro). La ven: quien la subió; el negocio de esa solicitud (con permiso de
   citas); el equipo de To'Latino que trabaja Soporte en esa ciudad, y cada vez queda en la auditoría («vidrio roto»). 9j: si la ayuda es de Salud,
   el equipo primero escribe el motivo (break_glass, 10 minutos); sin eso, 404.
   7b · La foto de un caso de Soporte (owner_kind 'support'): quien la subió, quien abrió el caso, el dueño del negocio si el caso es de
   su negocio, y el equipo con Soporte › ver en esa ciudad (auditado). El negocio de una operación NUNCA ve la foto de un caso con To'Latino.
   Nunca se cachea. Lo demás: 404 (no se dice si existe). */
export const dynamic = "force-dynamic";
const no = () => new NextResponse(null, { status: 404 });
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)) return no();
  const m = (await db().query<{ url: string; uploaded_by: string | null; owner_kind: string; owner_id: string; biz: string | null; city: string | null; hnum: string | null;
    tk: string | null; tkuser: string | null; tkbiz: string | null; tkcity: string | null }>(
    `select m.url, m.uploaded_by::text, m.owner_kind, m.owner_id, h.business_id as biz, h.city_id as city, h.number as hnum,
            sc.number as tk, sc.user_id::text as tkuser, sc.business_id as tkbiz, sc.city_id as tkcity
       from media m left join help_requests h on m.owner_kind = 'help' and h.id::text = m.owner_id
       left join support_cases sc on m.owner_kind = 'support' and sc.id::text = m.owner_id
      where m.id = $1 and m.private and m.status = 'visible' and m.url like 'privado/a/%'`, [id])).rows[0];
  if (!m) return no();
  const me = await yo();
  let ok = !!me && me.id === m.uploaded_by;
  if (!ok && m.tk) {
    ok = !!me && me.id === m.tkuser;
    if (!ok && me && m.tkbiz) ok = (await db().query(`select 1 from business_members where business_id = $1 and user_id = $2 and status = 'active' and (kind = 'owner' or 'all' = any(panel_access))`, [m.tkbiz, me.id])).rowCount === 1;
    if (!ok) {
      const s = await staff();
      if (s && s.puede("sop", "ver") && (!s.cities.length || (m.tkcity && s.cities.includes(m.tkcity)))) {
        await tx((c) => auditar(c, { actor: s.id, action: "soporte.foto.ver", targetKind: "support_case", targetId: m.tk, city: m.tkcity ?? undefined }));
        ok = true;
      }
    }
  }
  if (!ok && m.biz) ok = !!(await accesoPanel(m.biz, "ord"));
  if (!ok && m.biz) {
    const s = await staff();
    // 9j · «Vidrio roto»: la foto de una ayuda de Salud (consultorio) solo con un motivo escrito y vigente de esta persona (lib/sistema/vidrio.ts).
    const sinMotivo = !!s && m.owner_kind === "help" && (await ayudaDeSalud(m.owner_id)) && !(await vidrioVigente(s.id, m.owner_id));
    if (s && !sinMotivo && colasVisibles(s).includes("sop") && (!s.cities.length || (m.city && s.cities.includes(m.city)))) {
      await tx((c) => auditar(c, { actor: s.id, action: "ayuda.foto.ver", targetKind: "help_request", targetId: m.hnum ?? m.owner_id, city: m.city ?? undefined }));
      ok = true;
    }
  }
  if (!ok) return no();
  const img = await leerObjeto(m.url);
  return new NextResponse(new Uint8Array(img), { headers: { "content-type": "image/jpeg", "cache-control": "private, no-store", "x-content-type-options": "nosniff" } });
}
