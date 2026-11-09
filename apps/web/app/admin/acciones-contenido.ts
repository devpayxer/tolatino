"use server";
/* 5i · Super Admin › Contenido: el lote «Ocultar los N reportados» (MEM 651) y «Mover de ciudad».
   - loteReportados(): lo que se ve y tiene un reporte abierto (publicaciones y comentarios de la Comunidad) en las ciudades de quien mira;
     la pantalla los manda uno por uno con loteOcultarUno() para mostrar el progreso y los fallos parciales.
   - loteOcultarUno(): el servidor decide otra vez cada uno: la cuenta oficial NUNCA se oculta en lote (guardián loteNoTocaOficial), solo
     lo que se ve y sigue reportado; oculta con el motivo, cierra sus reportes y su caso de la cola Reportes, deja la auditoría; después
     avisa al autor con el motivo y «Apelar», y a quienes reportaron el resultado (sin nombres).
   - pubMoverCiudad(): una publicación a otra ciudad de quien mira (la ubicación la vuelve a poner la base: centro del barrio o de la
     ciudad); sus comentarios van con ella. Una recomendación va con su negocio y un hilo con negocios recomendados tampoco se mueve. */
import { revalidatePath } from "next/cache";
import { auditar, staff } from "@/lib/admin";
import { avisarOculto } from "@/lib/apelaciones";
import { avisarMuchos } from "@/lib/avisos";
import { db, tx } from "@/lib/db";
import type { ResAdm } from "./acciones-colas";

const no = (mensaje: string): ResAdm => ({ ok: false, mensaje });
const motivoOk = (m: unknown) => (typeof m === "string" ? m.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim().slice(0, 500) : "");
export type ItemLote = { k: "pub" | "ccm"; id: string; texto: string; oficial: boolean };

export async function loteReportados(): Promise<{ ok: boolean; items: ItemLote[]; mensaje?: string }> {
  const s = await staff();
  if (!s || !s.puede("cont", "retirar")) return { ok: false, items: [], mensaje: "Tu rol no puede ocultar contenido." };
  const r = await db().query<ItemLote>(
    `(select 'pub' as k, p.id::text, left(p.body, 80) as texto, p.author_kind = 'official' as oficial from com_posts p
       where p.status = 'visible' and (cardinality($1::text[]) = 0 or p.city_id = any($1::text[]))
         and exists (select 1 from content_reports x where x.target_kind = 'com_post' and x.target_id = p.id::text and x.status = 'open') order by p.id limit 200)
     union all
     (select 'ccm', c.id::text, left(c.body, 80), false from com_comments c
       where c.status = 'visible' and (cardinality($1::text[]) = 0 or c.city_id = any($1::text[]))
         and exists (select 1 from content_reports x where x.target_kind = 'com_comment' and x.target_id = c.id::text and x.status = 'open') order by c.id limit 200)`, [s.cities]);
  return { ok: true, items: r.rows };
}

export async function loteOcultarUno(k: string, id: string, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || !s.puede("cont", "retirar")) return no("Tu rol no puede ocultar contenido.");
  if ((k !== "pub" && k !== "ccm") || typeof id !== "string" || !/^\d{1,18}$/.test(id)) return no("Eso no existe.");
  const m = motivoOk(motivo);
  if (!m) return no("Escribe el motivo.");
  const kind = k === "pub" ? "com_post" : "com_comment", tabla = k === "pub" ? "com_posts" : "com_comments";
  const r = await tx(async (c) => {
    const x = (await c.query<{ autor: string | null; oficial: boolean; status: string; ciudad: string; body: string }>(
      `select t.author_user_id::text as autor, ${k === "pub" ? "t.author_kind = 'official'" : "false"} as oficial, t.status, t.city_id as ciudad, t.body
         from ${tabla} t where t.id = $1::bigint and (cardinality($2::text[]) = 0 or t.city_id = any($2::text[])) for update`, [id, s.cities])).rows[0];
    if (!x) return "Ya no está.";
    // La cuenta oficial no se oculta en lote (MEM 651): si hace falta, una persona la oculta sola, desde su fila.
    if (x.oficial || !x.autor) return "Es de la cuenta oficial: no se oculta en lote.";
    if (x.status !== "visible") return x.status === "hidden" ? "Ya estaba oculto." : "Su autor lo borró.";
    const rep = (await c.query<{ quien: string }>(
      `update content_reports set status = 'actioned', decided_by = $3, decided_at = now() where target_kind = $1 and target_id = $2 and status = 'open' returning reporter_user_id::text as quien`,
      [kind, id, s.id])).rows.map((y) => y.quien);
    if (!rep.length) return "Ya no tiene reportes abiertos.";
    await c.query(`update ${tabla} set status = 'hidden', hidden_by = 'admin', hidden_staff_id = $2, hidden_reason = $3, hidden_at = now() where id = $1::bigint`, [id, s.id, m]);
    await c.query(`update queue_items set status = 'decided', decision = 'ocultar', reason = $3, decided_by = $4, decided_at = now()
                    where queue = 'rep' and subject_kind = $1 and subject_id = $2 and status = 'open'`, [kind, id, m, s.id]);
    await auditar(c, { actor: s.id, action: k === "pub" ? "com.publicacion.ocultar_lote" : "com.comentario.ocultar_lote", targetKind: kind, targetId: id, city: x.ciudad,
      before: { texto: x.body.slice(0, 80), estado: "visible y reportado" }, after: { estado: "oculto (lote de reportados)" }, reason: m });
    return { autor: x.autor, rep };
  });
  if (typeof r === "string") return no(r);
  await avisarOculto(r.autor, kind, id, m);
  await avisarMuchos(r.rep, "com_rep_ok", { es: {}, en: {} }, { ref: [kind, id] }).catch(() => undefined);
  revalidatePath("/admin/contenido");
  return { ok: true, mensaje: "Oculto." };
}

export async function pubMoverCiudad(id: string, ciudad: string, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || !s.puede("cont", "editar")) return no("Tu rol no mueve publicaciones.");
  if (typeof id !== "string" || !/^\d{1,18}$/.test(id) || typeof ciudad !== "string" || !/^[a-z0-9-]{2,20}$/.test(ciudad)) return no("Esa publicación no existe.");
  if (s.cities.length && !s.cities.includes(ciudad)) return no("Esa ciudad no es de las tuyas.");
  const m = motivoOk(motivo);
  if (!m) return no("Escribe el motivo.");
  const r = await tx(async (c) => {
    const p = (await c.query<{ city_id: string; kind: string; body: string; recs: number }>(
      `select p.city_id, p.kind, p.body, (select count(*)::int from com_comments x where x.post_id = p.id and x.business_id is not null) as recs
         from com_posts p where p.id = $1::bigint and p.status <> 'deleted' and (cardinality($2::text[]) = 0 or p.city_id = any($2::text[])) for update`, [id, s.cities])).rows[0];
    if (!p) return "Esa publicación ya no está.";
    if (p.city_id === ciudad) return "Ya está en esa ciudad.";
    if (p.kind === "recomendacion" || p.recs) return "Recomienda negocios de su ciudad: no se mueve. Si está en la ciudad equivocada, ocúltala con el motivo.";
    const to = (await c.query<{ name: string }>(`select name from cities where id = $1`, [ciudad])).rows[0];
    if (!to) return "Esa ciudad no existe.";
    const de = (await c.query<{ name: string }>(`select name from cities where id = $1`, [p.city_id])).rows[0]!;
    await c.query(`update com_posts set city_id = $2, pinned_until = null where id = $1::bigint`, [id, ciudad]);
    await c.query(`update com_comments set city_id = $2 where post_id = $1::bigint`, [id, ciudad]);
    await auditar(c, { actor: s.id, action: "com.publicacion.mover", targetKind: "com_post", targetId: id, city: ciudad,
      before: { publicacion: p.body.slice(0, 80), ciudad: de.name }, after: { ciudad: to.name }, reason: m });
    return null;
  });
  if (r) return no(r);
  revalidatePath("/admin/contenido");
  return { ok: true, mensaje: "Movida. Sale en el muro de la otra ciudad; quedó en la auditoría." };
}
