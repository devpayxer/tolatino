import { NextResponse, type NextRequest } from "next/server";
import { auditar, staff } from "@/lib/admin";
import { colasVisibles } from "@/lib/admin-colas";
import { yo } from "@/lib/cuenta";
import { db, tx } from "@/lib/db";
import { entregarPrivado } from "@/lib/entrega-privada";
import { llavesAEntregar } from "@/lib/fotos-privadas";
import { accesoPanel } from "@/lib/panel";
import { dmFotoConReporte } from "@/lib/admin-dm";
import { fotoDmVecino } from "@/lib/mensajes-vecinos";

/* 9t · Ver la foto de un mensaje (privada, «privado/m/»). La ven:
   - quien la subió (también antes de enviarla y mientras está en revisión);
   - con la foto ya revisada ('visible') y el mensaje sin ocultar: el vecino de esa conversación y, del negocio, quien tenga la parte «Mensajes»
     del panel (accesoPanel; la vista de solo lectura del equipo NO es miembro: no la ve);
   - el equipo de To'Latino solo si tiene la cola y la ciudad, y hay un caso abierto: la conversación reportada (cola «chat», con un reporte
     abierto) o esta foto en la cola «medios» (el modelo la marcó o no respondió). Cada vez queda en la auditoría («mensajes.foto.ver»).
   Nunca se cachea ni se lista. Lo demás: 404 (no se dice si existe).
   9t (19 nov) · Una foto de Mensajes entre vecinos (owner_kind 'dm'; fotoDeVecinos abajo). La ven:
   - quien la subió (también antes de enviarla y mientras está en revisión);
   - la otra persona de la conversación solo con la foto revisada, el mensaje sin ocultar, la conversación abierta y sin bloqueo en ningún
     sentido (lib/mensajes-vecinos.ts fotoDmVecino: con un bloqueo la conversación no existe para ninguno de los dos);
   - el equipo de To'Latino solo con un caso abierto en su cola y ciudad: la conversación reportada (cola «chat», con el reporte abierto: lib/admin-dm.ts
     dmFotoConReporte) o esta foto en «medios»; cada vez queda en la auditoría («mensajes.foto.ver»). */
export const dynamic = "force-dynamic";
const no = () => new NextResponse(null, { status: 404 });
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)) return no();
  const m = (await db().query<{ url: string; var_widths: number[] | null; subio: string | null; status: string; msg: string | null; oculto: boolean; hilo: string | null; vecino: string | null; biz: string | null; city: string | null }>(
    `select x.url, x.var_widths, x.uploaded_by::text as subio, x.status, cm.id::text as msg, cm.hidden_at is not null as oculto,
            t.id::text as hilo, t.user_id::text as vecino, t.business_id as biz, t.city_id as city
       from media x left join chat_messages cm on cm.media_id = x.id left join chat_threads t on t.id = cm.thread_id
      where x.id = $1::uuid and x.owner_kind = 'chat' and x.private and x.purged_at is null and x.status in ('visible', 'review') and x.url like 'privado/m/%'`, [id])).rows[0];
  if (!m) return fotoDeVecinos(req, id);
  const me = await yo();
  if (!me) return no();
  let ver: Ver | undefined; // el renglón del equipo se deja solo si el archivo existe y sale (entregarPrivado alEntregar)
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
        ver = () => tx((c) => auditar(c, { actor: s.id, action: "mensajes.foto.ver", targetKind: "chat_message", targetId: m.msg, city: m.city, after: { foto: id, por: caso.q === "medios" ? "foto en revisión" : "conversación reportada" } }));
        ok = true;
      }
    }
  }
  if (!ok) return no();
  return servir(req, m.url, m.var_widths, ver);
}
/* 9t · En flujo desde el almacén, con ETag y 304 a If-None-Match; solo después del permiso (lib/entrega-privada.ts).
   F3b · Con `?w=` la variante de ese ancho (lib/fotos-privadas.ts llavesAEntregar), con EL MISMO permiso que la entera (ya se decidió arriba), las mismas
   cabeceras privadas y Vary: si la variante falla en el almacén, la maestra. */
type Ver = () => Promise<unknown>;
async function servir(req: Request, url: string, anchos: number[] | null, ver?: Ver) {
  const cab = { "cache-control": "private, no-store", "x-content-type-options": "nosniff", "content-disposition": "inline", vary: "Accept, Cookie" };
  const llaves = llavesAEntregar(req, url, anchos);
  return entregarPrivado(req, llaves, cab, no, ver).catch(() => entregarPrivado(req, llaves.slice(-1), cab, no, ver));
}

/* 9t · La foto de un mensaje entre vecinos. Ninguna consulta de aquí lee los mensajes: eso lo hacen mensajes-vecinos.ts (las dos personas) y
   admin-dm.ts (el equipo, con el reporte abierto). */
async function fotoDeVecinos(req: Request, id: string) {
  const d = (await db().query<{ url: string; var_widths: number[] | null; subio: string | null; status: string }>(
    `select x.url, x.var_widths, x.uploaded_by::text as subio, x.status from media x
      where x.id = $1::uuid and x.owner_kind = 'dm' and x.private and x.purged_at is null and x.status in ('visible', 'review') and x.url like 'privado/m/%'`, [id])).rows[0];
  if (!d) return no();
  const me = await yo();
  if (!me) return no();
  let ver: Ver | undefined;
  let ok = me.id === d.subio;
  if (!ok && d.status === "visible") ok = await fotoDmVecino(me.id, id);
  if (!ok) {
    const s = await staff();
    if (s) {
      const colas = colasVisibles(s), enCiudad = (c: string | null) => !s.cities.length || (!!c && s.cities.includes(c));
      // La foto en «medios» (el modelo la marcó o no respondió) o la conversación reportada con su reporte abierto.
      const med = (await db().query<{ city: string | null }>(
        `select q.city_id as city from queue_items q where q.status = 'open' and q.queue = 'medios' and q.subject_kind = 'media' and q.subject_id = $1 limit 1`, [id])).rows[0];
      const rep = med && colas.includes("medios") && enCiudad(med.city) ? null : await dmFotoConReporte(id);
      const caso = med && colas.includes("medios") && enCiudad(med.city) ? { por: "foto en revisión", city: med.city, msg: null as string | null }
        : rep && colas.includes("chat") && enCiudad(rep.city) ? { por: "conversación reportada", city: rep.city, msg: rep.msg } : null;
      if (caso) {
        ver = () => tx((c) => auditar(c, { actor: s.id, action: "mensajes.foto.ver", targetKind: caso.msg ? "dm_message" : "media", targetId: caso.msg ?? id, city: caso.city, after: { foto: id, por: caso.por } }));
        ok = true;
      }
    }
  }
  if (!ok) return no();
  return servir(req, d.url, d.var_widths, ver);
}
