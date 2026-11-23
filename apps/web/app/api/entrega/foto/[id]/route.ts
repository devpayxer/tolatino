import { NextResponse, type NextRequest } from "next/server";
import { auditar, staff } from "@/lib/admin";
import { yo } from "@/lib/cuenta";
import { db, tx } from "@/lib/db";
import { entregarPrivado } from "@/lib/entrega-privada";
import { llavesAEntregar } from "@/lib/fotos-privadas";
import { accesoPanel } from "@/lib/panel";

/* 9n · Ver la foto de una entrega (privada, «privado/e/»). La ven: quien la tomó (el repartidor) mientras sea del día; el cliente de ESE
   pedido; el negocio del pedido (Hoy y pedidos o Entrega); el equipo de To'Latino con Repartidores, Transacciones o Soporte › ver en esa
   ciudad (cada vez queda en la auditoría: es la evidencia de una disputa). Lo demás: 404 (no se dice si existe). Nunca se cachea. */
export const dynamic = "force-dynamic";
// 23 nov · El MISMO 404 para «no tienes permiso», «no existe» y «el archivo no está en el almacén», y nunca se guarda (private, no-store): un
// navegador o Cloudflare no siguen dando 404 cuando el archivo vuelve. Guardián almacenPrivadoSinQuinientos.
const no = () => new NextResponse(null, { status: 404, headers: { "cache-control": "private, no-store" } });
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)) return no();
  const m = (await db().query<{ url: string; var_widths: number[] | null; uploaded_by: string | null; hoy: boolean; cliente: string; biz: string; city: string; numero: string }>(
    `select m.url, m.var_widths, m.uploaded_by::text, m.created_at > now() - interval '1 day' as hoy, o.user_id::text as cliente, o.business_id as biz, o.city_id as city, o.number as numero
       from media m join operations o on o.id::text = m.owner_id
      where m.id = $1 and m.owner_kind = 'delivery' and m.private and m.status = 'visible' and m.purged_at is null and m.url like 'privado/e/%'`, [id])).rows[0];
  if (!m) return no();
  const me = await yo();
  let ver: (() => Promise<unknown>) | undefined; // el renglón del equipo se deja solo si el archivo existe y sale (entregarPrivado alEntregar)
  let ok = !!me && ((me.id === m.uploaded_by && m.hoy) || me.id === m.cliente);
  if (!ok) ok = !!(await accesoPanel(m.biz, "ord")) || !!(await accesoPanel(m.biz, "dlv"));
  if (!ok) {
    const s = await staff();
    if (s && (s.puede("dlv", "ver") || s.puede("tx", "ver") || s.puede("sop", "ver")) && (!s.cities.length || s.cities.includes(m.city))) {
      ver = () => tx((c) => auditar(c, { actor: s.id, action: "entrega.foto.ver", targetKind: "order", targetId: m.numero, city: m.city }));
      ok = true;
    }
  }
  if (!ok) return no();
  // 9t · En flujo desde el almacén, con ETag y 304 a If-None-Match (lib/entrega-privada.ts). F3b · Con `?w=` la variante (llavesAEntregar), con el
  // MISMO permiso de arriba y las mismas cabeceras privadas; si la variante falla en el almacén, la maestra.
  const cab = { "cache-control": "private, no-store", "x-content-type-options": "nosniff", "content-disposition": "inline", vary: "Accept, Cookie" };
  const llaves = llavesAEntregar(req, m.url, m.var_widths);
  return entregarPrivado(req, llaves, cab, no, ver).catch(() => entregarPrivado(req, llaves.slice(-1), cab, no, ver));
}
