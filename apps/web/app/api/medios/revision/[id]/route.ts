import { NextResponse } from "next/server";
import { auditar, staff } from "@/lib/admin";
import { colasVisibles } from "@/lib/admin-colas";
import { yo } from "@/lib/cuenta";
import { db, tx } from "@/lib/db";
import { leerObjeto } from "@/lib/medios";

/* Revisión automática de las fotos públicas (decisión AJ) · Ver una foto que NO se publicó (retenida, rechazada u oculta por reportes): su archivo
   vive solo en la llave privada (privado/rev/<uuid>.jpg; nginx nunca la sirve). La ven:
   - quien la subió (para saber qué foto es y pedir revisión);
   - el equipo de To'Latino solo con un caso abierto de esa foto en su cola y su ciudad: la apelación («apel») o el reporte («medios»). Cada vez
     queda en la auditoría («fotos.revision.ver»).
   Nunca se cachea ni se lista. Lo demás: 404 (no se dice si existe). */
export const dynamic = "force-dynamic";
const no = () => new NextResponse(null, { status: 404 });
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)) return no();
  const m = (await db().query<{ llave: string; subio: string | null }>(
    `select rev_llave as llave, uploaded_by::text as subio from media where id = $1::uuid and rev_llave is not null and purged_at is null and status in ('review', 'removed')`, [id])).rows[0];
  if (!m) return no();
  const me = await yo();
  if (!me) return no();
  let ok = me.id === m.subio;
  if (!ok) {
    const s = await staff();
    if (s) {
      const colas = colasVisibles(s), enCiudad = (c: string | null) => !s.cities.length || (!!c && s.cities.includes(c));
      const caso = (await db().query<{ q: string; city: string | null }>(
        `select q.queue as q, q.city_id as city from queue_items q
          where q.status = 'open' and ((q.queue = 'apel' and q.subject_kind = 'appeal' and q.subject_id in (select a.id::text from appeals a where a.target_kind = 'media' and a.target_id = $1 and a.status = 'open'))
                 or (q.queue = 'medios' and q.subject_kind = 'media' and q.subject_id = $1))`, [id])).rows.find((x) => colas.includes(x.q as (typeof colas)[number]) && enCiudad(x.city));
      if (caso) {
        await tx((c) => auditar(c, { actor: s.id, action: "fotos.revision.ver", targetKind: "media", targetId: id, city: caso.city, after: { por: caso.q === "apel" ? "apelación abierta" : "foto reportada" } }));
        ok = true;
      }
    }
  }
  if (!ok) return no();
  // 21 nov · Sin archivo en el almacén (una fila sin su objeto): 404 como todo lo demás, no un 500 con su traza en el registro en cada vista.
  const img = await leerObjeto(m.llave).catch(() => null);
  if (!img) return no();
  return new NextResponse(new Uint8Array(img), { headers: { "content-type": "image/jpeg", "cache-control": "private, no-store", "x-content-type-options": "nosniff", "content-disposition": "inline" } });
}
