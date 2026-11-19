import { NextResponse } from "next/server";
import { auditar, staff } from "@/lib/admin";
import { colasVisibles } from "@/lib/admin-colas";
import { yo } from "@/lib/cuenta";
import { db, tx } from "@/lib/db";
import { leerObjeto } from "@/lib/medios";
import { accesoPanel } from "@/lib/panel";

/* 9t · Ver la foto de un mensaje (privada, «privado/m/»). La ven:
   - quien la subió (también antes de enviarla y mientras está en revisión);
   - con la foto ya revisada ('visible') y el mensaje sin ocultar: el vecino de esa conversación y, del negocio, quien tenga la parte «Mensajes»
     del panel (accesoPanel; la vista de solo lectura del equipo NO es miembro: no la ve);
   - el equipo de To'Latino solo si tiene la cola y la ciudad, y hay un caso abierto: la conversación reportada (cola «chat», con un reporte
     abierto) o esta foto en la cola «medios» (el modelo la marcó o no respondió). Cada vez queda en la auditoría («mensajes.foto.ver»).
   Nunca se cachea ni se lista. Lo demás: 404 (no se dice si existe). */
export const dynamic = "force-dynamic";
const no = () => new NextResponse(null, { status: 404 });
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)) return no();
  const m = (await db().query<{ url: string; subio: string | null; status: string; msg: string | null; oculto: boolean; hilo: string | null; vecino: string | null; biz: string | null; city: string | null }>(
    `select x.url, x.uploaded_by::text as subio, x.status, cm.id::text as msg, cm.hidden_at is not null as oculto,
            t.id::text as hilo, t.user_id::text as vecino, t.business_id as biz, t.city_id as city
       from media x left join chat_messages cm on cm.media_id = x.id left join chat_threads t on t.id = cm.thread_id
      where x.id = $1::uuid and x.owner_kind = 'chat' and x.private and x.purged_at is null and x.status in ('visible', 'review') and x.url like 'privado/m/%'`, [id])).rows[0];
  if (!m) return no();
  const me = await yo();
  if (!me) return no();
  let ok = me.id === m.subio;
  const lista = m.status === "visible" && !!m.msg && !m.oculto;
  if (!ok && lista && m.vecino === me.id) ok = true;
  if (!ok && lista && m.biz) ok = !!(await accesoPanel(m.biz, "msg"));
  if (!ok && m.hilo) {
    const s = await staff();
    if (s && (!s.cities.length || (m.city && s.cities.includes(m.city)))) {
      const colas = colasVisibles(s);
      const caso = (await db().query<{ q: string }>(
        `select q.queue as q from queue_items q
          where q.status = 'open' and ((q.queue = 'chat' and q.subject_kind = 'chat_thread' and q.subject_id = $1
                  and exists (select 1 from content_reports cr where cr.target_kind = 'chat' and cr.target_id = $1 and cr.status = 'open'))
             or (q.queue = 'medios' and q.subject_kind = 'media' and q.subject_id = $2))
          order by (q.queue = 'medios') desc limit 1`, [m.hilo, id])).rows[0];
      if (caso && colas.includes(caso.q as (typeof colas)[number])) {
        await tx((c) => auditar(c, { actor: s.id, action: "mensajes.foto.ver", targetKind: "chat_message", targetId: m.msg, city: m.city, after: { foto: id, por: caso.q === "medios" ? "foto en revisión" : "conversación reportada" } }));
        ok = true;
      }
    }
  }
  if (!ok) return no();
  const img = await leerObjeto(m.url);
  return new NextResponse(new Uint8Array(img), { headers: { "content-type": "image/jpeg", "cache-control": "private, no-store", "x-content-type-options": "nosniff", "content-disposition": "inline" } });
}
