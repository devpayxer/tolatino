"use server";
/* Acciones del Catálogo (ADM-CAT). Permiso cat:editar; cada cambio queda en la auditoría con lo que afecta
   («afecta a N negocios»). Nada se borra: una subcategoría quitada, un sinónimo o un filtro apagado vuelven con un toque.
   Lo leen la página de categoría (al instante) y Buscar (en menos de un minuto: tiene 60 s de memoria). */
import { cambiarConfig } from "@/lib/config";
import { revalidatePath } from "next/cache";
import type { PoolClient } from "pg";
import { auditar, staff, type Staff } from "@/lib/admin";
import { tx } from "@/lib/db";
import { mismoOrigen } from "@/lib/cuenta";
import { LIMITES_PLAN, MODULOS_POR_CIUDAD, type DiaPlantilla } from "@/lib/admin-catalogo";
import { recalcularFiltrosSP } from "@/lib/salud-pro";
import { claveMosaico, mosaicosConFoto, type Pagina } from "@/lib/categoria";
import type { ResAdm } from "./acciones-colas";

const no = (mensaje: string): ResAdm => ({ ok: false, mensaje });
const limpio = (m: unknown, max = 500) => (typeof m === "string" ? m.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").replace(/\s+/g, " ").trim().slice(0, max) : "");
const sinAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const CAT = /^NEG-[A-Z]+$/, SUB = /^NEG-[A-Z]+-\d{2,3}$/, UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
class FotoNoAdjunta extends Error {} // lanzada dentro de la transacción: deshace todo el pedido (ni la portada ni la auditoría)
const listo = () => { revalidatePath("/admin/catalogo"); };

async function hacer(fn: (c: PoolClient, s: Staff) => Promise<string | null>, ok: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || !s.puede("cat", "editar")) return no("Tu rol no edita el catálogo.");
  const r = await tx((c) => fn(c, s));
  if (r) return no(r);
  listo();
  return { ok: true, mensaje: ok };
}

/* Agregar subcategoría: «Nombre en español / Name in English». Entra al final de su categoría con el código siguiente
   (NEG-<CAT>-<NN>) y Buscar la conoce. */
export async function subAgregar(cat: string, nombres: string, motivo: string): Promise<ResAdm> {
  if (typeof cat !== "string" || !CAT.test(cat)) return no("Esa categoría no existe.");
  const [es, en] = limpio(nombres, 120).split("/").map((x) => x.trim());
  const m = limpio(motivo);
  if (!es || es.length < 2 || es.length > 60) return no("Escribe el nombre en español (2 a 60 letras).");
  if (en !== undefined && (en.length < 2 || en.length > 60)) return no("El nombre en inglés va después de «/» (2 a 60 letras).");
  if (!m) return no("Escribe el motivo.");
  return hacer(async (c, s) => {
    const k = (await c.query<{ id: string }>(`select id from categories where id = $1 for update`, [cat])).rows[0];
    if (!k) return "Esa categoría no existe.";
    const ya = (await c.query(`select 1 from subcategories where category_id = $1 and (lower(unaccent(name->>'es')) = lower(unaccent($2)) or lower(unaccent(name->>'en')) = lower(unaccent($3)))`, [cat, es, en ?? es])).rowCount;
    if (ya) return "Ya existe una subcategoría con ese nombre en esta categoría.";
    // 9n · El número sigue al más alto de los códigos de esta categoría, estén donde estén: una subcategoría movida conserva su código
    // (NEG-FOOD-10 en Mercados) y el siguiente de Comida nunca lo repite.
    const sig = (await c.query<{ n: number; sort: number }>(
      `select coalesce((select max(substring(id from '-(\\d+)$')::int) from subcategories where id like $1 || '-%'), 0) + 1 as n,
              coalesce((select max(sort) from subcategories where category_id = $1), 0) + 1 as sort`, [cat])).rows[0]!;
    const id = `${cat}-${String(sig.n).padStart(2, "0")}`;
    await c.query(`insert into subcategories (id, category_id, sort, name, created_by) values ($1, $2, $3, $4::jsonb, $5)`, [id, cat, sig.sort, JSON.stringify({ es, en: en || es }), s.id]);
    await auditar(c, { actor: s.id, action: "catalogo.sub.agregar", targetKind: "subcategory", targetId: id, before: { subcategoria: "—" }, after: { subcategoria: es }, reason: m });
    return null;
  }, "Agregada. Buscar la conoce en menos de un minuto.");
}

/* Quitar / restaurar una subcategoría: los negocios pierden (o recuperan) la etiqueta, no la ficha. */
export async function subEstado(id: string, encender: boolean, motivo: string): Promise<ResAdm> {
  if (typeof id !== "string" || !SUB.test(id)) return no("Esa subcategoría no existe.");
  const m = limpio(motivo);
  if (!m) return no("Escribe el motivo.");
  return hacer(async (c, s) => {
    const x = (await c.query<{ status: string; es: string }>(`select status, name->>'es' as es from subcategories where id = $1 for update`, [id])).rows[0];
    if (!x) return "Esa subcategoría no existe.";
    if (x.status === "merged") return "Está fusionada: usa «Separar».";
    if ((x.status === "on") === encender) return encender ? "Ya está en la página." : "Ya está quitada.";
    await c.query(`update subcategories set status = $2, status_reason = $3, status_at = now(), updated_at = now() where id = $1`, [id, encender ? "on" : "off", encender ? null : m]);
    const n = (await c.query<{ n: number }>(`select catalogo_refrescar_docs($1) as n`, [id])).rows[0]!.n;
    await auditar(c, { actor: s.id, action: encender ? "catalogo.sub.restaurar" : "catalogo.sub.quitar", targetKind: "subcategory", targetId: id,
      before: { subcategoria: x.es, estado: encender ? "quitada" : "en la página" }, after: { estado: encender ? "en la página" : "quitada", negocios: `${n} ${n === 1 ? "negocio" : "negocios"}` }, reason: m });
    return null;
  }, encender ? "Restaurada." : "Quitada. Los negocios conservan su ficha.");
}

/* ── 9n · Catálogo completo (LAUNCH L214) ── Toda edición dice a cuántos negocios afecta (la pantalla lo muestra antes de confirmar y la
   auditoría lo guarda), pide motivo y escribe su renglón de audit_entries con el cliente de la misma transacción. */
const negociosTxt = (n: number) => `${n} ${n === 1 ? "negocio" : "negocios"}`;
/* «Nombre en español / Name in English» (el inglés es opcional: si falta, se usa el español). */
function dosNombres(t: unknown, max = 60): { es: string; en: string } | string {
  const [es, en, ...resto] = limpio(t, 2 * max + 10).split("/").map((x) => x.trim());
  if (resto.length) return "Escribe el nombre en español y, después de una sola «/», en inglés.";
  if (!es || es.length < 2 || es.length > max) return `Escribe el nombre en español (2 a ${max} letras).`;
  if (en !== undefined && (en.length < 2 || en.length > max)) return `El nombre en inglés va después de «/» (2 a ${max} letras).`;
  return { es, en: en || es };
}

/* Cambiar el nombre (ES/EN) de una subcategoría: el mismo código; la página, la ficha, Buscar y Publica tu negocio la llaman distinto al
   momento (los documentos de búsqueda de sus negocios se recalculan en la misma transacción). */
export async function subNombre(id: string, nombres: string, motivo: string): Promise<ResAdm> {
  if (typeof id !== "string" || !SUB.test(id)) return no("Esa subcategoría no existe.");
  const n2 = dosNombres(nombres), m = limpio(motivo);
  if (typeof n2 === "string") return no(n2);
  if (!m) return no("Escribe el motivo.");
  return hacer(async (c, s) => {
    const x = (await c.query<{ cat: string; es: string; en: string; status: string }>(`select category_id as cat, name->>'es' as es, coalesce(name->>'en', name->>'es') as en, status from subcategories where id = $1 for update`, [id])).rows[0];
    if (!x) return "Esa subcategoría no existe.";
    if (x.status === "merged") return "Está fusionada: sepárala antes de cambiarle el nombre.";
    if (x.es === n2.es && x.en === n2.en) return "Ya tiene ese nombre.";
    const ya = (await c.query(`select 1 from subcategories where category_id = $1 and id <> $2 and status <> 'merged' and (lower(unaccent(name->>'es')) = lower(unaccent($3)) or lower(unaccent(name->>'en')) = lower(unaccent($4)))`, [x.cat, id, n2.es, n2.en])).rowCount;
    if (ya) return "Ya existe una subcategoría con ese nombre en esta categoría.";
    await c.query(`update subcategories set name = $2::jsonb, updated_at = now() where id = $1`, [id, JSON.stringify(n2)]);
    const n = (await c.query<{ n: number }>(`select catalogo_refrescar_docs($1) as n`, [id])).rows[0]!.n;
    await auditar(c, { actor: s.id, action: "catalogo.sub.nombre", targetKind: "subcategory", targetId: id,
      before: { subcategoria: `${x.es} / ${x.en}` }, after: { subcategoria: `${n2.es} / ${n2.en}`, negocios: negociosTxt(n) }, reason: m });
    return null;
  }, "Nombre cambiado. Buscar lo usa en menos de un minuto.");
}

/* Mover una subcategoría a otra categoría. El código NO cambia (los negocios, los sinónimos y la página la nombran por código): solo su
   categoría. Los negocios que la tienen conservan la etiqueta y su propia categoría; la subcategoría sale en la nueva (al final). */
export async function subMover(id: string, cat: string, motivo: string): Promise<ResAdm> {
  if (typeof id !== "string" || !SUB.test(id)) return no("Esa subcategoría no existe.");
  if (typeof cat !== "string" || !CAT.test(cat)) return no("Esa categoría no existe.");
  const m = limpio(motivo);
  if (!m) return no("Escribe el motivo.");
  return hacer(async (c, s) => {
    const x = (await c.query<{ cat: string; es: string; en: string; status: string; desde: string }>(
      `select s.category_id as cat, s.name->>'es' as es, coalesce(s.name->>'en', s.name->>'es') as en, s.status, k.name->>'es' as desde
         from subcategories s join categories k on k.id = s.category_id where s.id = $1 for update of s`, [id])).rows[0];
    if (!x) return "Esa subcategoría no existe.";
    if (x.status === "merged") return "Está fusionada: sepárala antes de moverla.";
    if (x.cat === cat) return "Ya está en esa categoría.";
    const d = (await c.query<{ es: string }>(`select name->>'es' as es from categories where id = $1 for update`, [cat])).rows[0];
    if (!d) return "Esa categoría no existe.";
    const ya = (await c.query(`select 1 from subcategories where category_id = $1 and status <> 'merged' and (lower(unaccent(name->>'es')) = lower(unaccent($2)) or lower(unaccent(name->>'en')) = lower(unaccent($3)))`, [cat, x.es, x.en])).rowCount;
    if (ya) return `${d.es} ya tiene una subcategoría con ese nombre: fusiónalas en vez de moverla.`;
    await c.query(`update subcategories set category_id = $2, sort = (select coalesce(max(sort), 0) + 1 from subcategories where category_id = $2), updated_at = now() where id = $1`, [id, cat]);
    const n = (await c.query<{ n: number }>(`select count(*)::int as n from businesses where subcategory_ids @> array[$1] and status = 'active'`, [id])).rows[0]!.n;
    await auditar(c, { actor: s.id, action: "catalogo.sub.mover", targetKind: "subcategory", targetId: id,
      before: { subcategoria: x.es, categoria: x.desde }, after: { categoria: d.es, negocios: negociosTxt(n) }, reason: m });
    return null;
  }, "Movida. Sale en su categoría nueva; los negocios conservan la etiqueta.");
}

/* Fusionar A en B (de la misma categoría): los negocios con A pasan a B, los sinónimos de A llevan a B y el nombre de A queda como sinónimo
   de B. A queda «fusionada» (nada se borra) y «Separar» lo devuelve todo (catalogo_fusionar / catalogo_separar, 0179). */
export async function subFusionar(id: string, destino: string, motivo: string): Promise<ResAdm> {
  if (typeof id !== "string" || !SUB.test(id) || typeof destino !== "string" || !SUB.test(destino)) return no("Esa subcategoría no existe.");
  if (id === destino) return no("Elige otra subcategoría.");
  const m = limpio(motivo);
  if (!m) return no("Escribe el motivo.");
  return hacer(async (c, s) => {
    const r = (await c.query<{ id: string; cat: string; es: string; status: string }>(
      `select id, category_id as cat, name->>'es' as es, status from subcategories where id = any($1::text[]) order by id for update`, [[id, destino]])).rows;
    const a = r.find((x) => x.id === id), b = r.find((x) => x.id === destino);
    if (!a || !b) return "Esa subcategoría no existe.";
    if (a.status === "merged") return "Ya está fusionada.";
    if (b.status !== "on") return `«${b.es}» no está en la página: restáurala antes de fusionar.`;
    if (a.cat !== b.cat) return "Solo se fusiona con una de su misma categoría (muévela antes).";
    const fid = (await c.query<{ id: string }>(`select catalogo_fusionar($1, $2, $3::uuid, $4)::text as id`, [id, destino, s.id, m])).rows[0]!.id;
    const f = (await c.query<{ n: number; syn: number }>(`select cardinality(business_ids) as n, cardinality(syn_new) as syn from subcategory_merges where id = $1::bigint`, [fid])).rows[0]!;
    await auditar(c, { actor: s.id, action: "catalogo.sub.fusionar", targetKind: "subcategory", targetId: id,
      before: { subcategoria: a.es, negocios: negociosTxt(f.n) }, after: { fusionada_en: b.es, sinonimos: `${f.syn} nuevos` }, reason: m });
    return null;
  }, "Fusionada. Sus negocios ya salen en la otra; «Separar» la devuelve.");
}

/* Separar: deshace la fusión viva de A (A vuelve a sus negocios; los sinónimos vuelven como estaban). */
export async function subSeparar(id: string, motivo: string): Promise<ResAdm> {
  if (typeof id !== "string" || !SUB.test(id)) return no("Esa subcategoría no existe.");
  const m = limpio(motivo);
  if (!m) return no("Escribe el motivo.");
  return hacer(async (c, s) => {
    const x = (await c.query<{ es: string; into_es: string | null; viva: boolean }>(
      `select s.name->>'es' as es, d.name->>'es' as into_es, exists (select 1 from subcategory_merges m where m.from_id = s.id and m.undone_at is null) as viva
         from subcategories s left join subcategories d on d.id = s.merged_into where s.id = $1 for update of s`, [id])).rows[0];
    if (!x) return "Esa subcategoría no existe.";
    if (!x.viva) return "No está fusionada.";
    const n = (await c.query<{ n: number }>(`select catalogo_separar($1, $2::uuid, $3) as n`, [id, s.id, m])).rows[0]!.n;
    await auditar(c, { actor: s.id, action: "catalogo.sub.separar", targetKind: "subcategory", targetId: id,
      before: { subcategoria: x.es, estado: `fusionada en ${x.into_es ?? "otra"}` }, after: { estado: "en la página", negocios: negociosTxt(n) }, reason: m });
    return null;
  }, "Separada. Vuelve a sus negocios.");
}

/* Categoría activa por ciudad: apagada, no se ofrece en esa ciudad (página de la categoría, Negocios, Buscar y Publica tu negocio); las fichas
   de sus negocios se conservan y vuelven a salir al encenderla. */
export async function catCiudad(cat: string, ciudad: string, encender: boolean, motivo: string): Promise<ResAdm> {
  if (typeof cat !== "string" || !CAT.test(cat)) return no("Esa categoría no existe.");
  if (typeof ciudad !== "string" || !/^[a-z]{2,6}$/.test(ciudad)) return no("Esa ciudad no existe.");
  const m = limpio(motivo);
  if (!m) return no("Escribe el motivo.");
  return hacer(async (c, s) => {
    const k = (await c.query<{ es: string; off: string[] }>(`select name->>'es' as es, off_cities as off from categories where id = $1 for update`, [cat])).rows[0];
    const ci = (await c.query<{ name: string }>(`select name from cities where id = $1`, [ciudad])).rows[0];
    if (!k) return "Esa categoría no existe.";
    if (!ci) return "Esa ciudad no existe.";
    if (!k.off.includes(ciudad) === encender) return encender ? "Ya está activa en esa ciudad." : "Ya está apagada en esa ciudad.";
    await c.query(`update categories set off_cities = case when $3 then array_remove(off_cities, $2) else array(select distinct x from unnest(off_cities || array[$2]) x order by 1) end, updated_at = now() where id = $1`, [cat, ciudad, encender]);
    const n = (await c.query<{ n: number }>(`select count(*)::int as n from businesses where category_id = $1 and city_id = $2 and status = 'active'`, [cat, ciudad])).rows[0]!.n;
    await auditar(c, { actor: s.id, action: encender ? "catalogo.cat.ciudad_encender" : "catalogo.cat.ciudad_apagar", targetKind: "category", targetId: cat, city: ciudad,
      before: { categoria: k.es, ciudad: ci.name, estado: encender ? "apagada" : "activa" }, after: { estado: encender ? "activa" : "apagada", negocios: negociosTxt(n) }, reason: m });
    return null;
  }, encender ? "Activa otra vez en esa ciudad." : "Apagada en esa ciudad. Las fichas de sus negocios se conservan.");
}

/* Módulo activo por ciudad: apagado, sus negocios de esa ciudad lo tienen en pausa (la misma pausa de Negocios 360°, con su marca de ciudad)
   y los que lleguen después también; encenderlo quita solo esa pausa. */
export async function modCiudad(key: string, ciudad: string, encender: boolean, motivo: string): Promise<ResAdm> {
  if (typeof key !== "string" || !(MODULOS_POR_CIUDAD as readonly string[]).includes(key)) return no("Ese módulo no se apaga por ciudad.");
  if (typeof ciudad !== "string" || !/^[a-z]{2,6}$/.test(ciudad)) return no("Esa ciudad no existe.");
  const m = limpio(motivo);
  if (!m) return no("Escribe el motivo.");
  return hacer(async (c, s) => {
    const k = (await c.query<{ es: string; off: string[] }>(`select name->>'es' as es, off_cities as off from module_types where key = $1 for update`, [key])).rows[0];
    const ci = (await c.query<{ name: string }>(`select name from cities where id = $1`, [ciudad])).rows[0];
    if (!k) return "Ese módulo no existe.";
    if (!ci) return "Esa ciudad no existe.";
    if (!k.off.includes(ciudad) === encender) return encender ? "Ya está encendido en esa ciudad." : "Ya está apagado en esa ciudad.";
    const n = (await c.query<{ n: number }>(`select catalogo_modulo_ciudad($1, $2, $3, $4, $5) as n`, [key, ciudad, !encender, m, s.id])).rows[0]!.n;
    await auditar(c, { actor: s.id, action: encender ? "catalogo.modulo.ciudad_encender" : "catalogo.modulo.ciudad_apagar", targetKind: "module_type", targetId: key, city: ciudad,
      before: { modulo: k.es, ciudad: ci.name, estado: encender ? "apagado" : "encendido" }, after: { estado: encender ? "encendido" : "apagado", negocios: negociosTxt(n) }, reason: m });
    return null;
  }, encender ? "Encendido otra vez en esa ciudad." : "Apagado en esa ciudad. Los negocios ven el motivo en su panel.");
}

/* Plantilla de horario de «Publica tu negocio» (lunes primero; media hora; > 24 = pasa de medianoche). Los negocios que ya publicaron no
   cambian: es el horario con el que empieza quien publica. */
const DIAS_CORTOS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const hora = (h: number) => { const H = ((h % 24) + 24) % 24, hh = Math.floor(H), mm = Math.round((H - hh) * 60); return `${hh % 12 || 12}${mm ? ":" + String(mm).padStart(2, "0") : ""} ${hh < 12 ? "AM" : "PM"}`; };
const resumenHorario = (d: DiaPlantilla[]) => d.map((x, i) => `${DIAS_CORTOS[i]} ${x.on ? `${hora(x.a)}–${hora(x.b)}` : "cerrado"}`).join(" · ");
export async function catHorario(cat: string, dias: DiaPlantilla[], motivo: string): Promise<ResAdm> {
  if (typeof cat !== "string" || !CAT.test(cat)) return no("Esa categoría no existe.");
  if (cat === "NEG-FE") return no("Iglesias no lleva plantilla: su horario sale de los cultos que elige.");
  const media = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && Math.round(v * 2) === v * 2;
  if (!Array.isArray(dias) || dias.length !== 7 || !dias.every((x) => x && typeof x.on === "boolean" && media(x.a) && media(x.b) && x.a >= 0 && x.a < 24 && x.b >= x.a + 1 && x.b <= Math.min(x.a + 20, 30)))
    return no("El horario no es válido: cada día abre antes de cerrar (media hora, hasta 20 horas seguidas).");
  if (!dias.some((x) => x.on)) return no("Deja al menos un día abierto.");
  const d = dias.map((x) => ({ on: x.on, a: x.a, b: x.b }));
  const m = limpio(motivo);
  if (!m) return no("Escribe el motivo.");
  return hacer(async (c, s) => {
    const k = (await c.query<{ es: string; h: DiaPlantilla[] | null }>(`select name->>'es' as es, onb->'horario' as h from categories where id = $1 for update`, [cat])).rows[0];
    if (!k) return "Esa categoría no existe.";
    if (k.h && JSON.stringify(k.h.map((x) => ({ on: x.on, a: x.a, b: x.b }))) === JSON.stringify(d)) return "Ya tiene ese horario.";
    await c.query(`update categories set onb = jsonb_set(onb, '{horario}', $2::jsonb), updated_at = now() where id = $1`, [cat, JSON.stringify(d)]);
    await auditar(c, { actor: s.id, action: "catalogo.cat.horario", targetKind: "category", targetId: cat,
      before: { categoria: k.es, horario: k.h ? resumenHorario(k.h) : "—" }, after: { horario: resumenHorario(d) }, reason: m });
    return null;
  }, "Plantilla guardada. Quien publique desde ahora empieza con este horario.");
}

/* Ejemplos (placeholders) de «Publica tu negocio»: el del nombre del negocio y el del nombre de un ítem propio. «español / inglés». */
export async function catEjemplo(cat: string, campo: string, texto: string, motivo: string): Promise<ResAdm> {
  if (typeof cat !== "string" || !CAT.test(cat)) return no("Esa categoría no existe.");
  if (campo !== "ph_nombre" && campo !== "ph_item") return no("Ese ejemplo no existe.");
  const t = dosNombres(texto, 48), m = limpio(motivo);
  if (typeof t === "string") return no(t.replace("el nombre", "el ejemplo"));
  if (!m) return no("Escribe el motivo.");
  return hacer(async (c, s) => {
    const k = (await c.query<{ es: string; v: { es: string; en: string } | null }>(`select name->>'es' as es, onb->$2 as v from categories where id = $1 for update`, [cat, campo])).rows[0];
    if (!k) return "Esa categoría no existe.";
    if (k.v && k.v.es === t.es && k.v.en === t.en) return "Ya tiene ese ejemplo.";
    await c.query(`update categories set onb = jsonb_set(onb, array[$2], $3::jsonb), updated_at = now() where id = $1`, [cat, campo, JSON.stringify(t)]);
    await auditar(c, { actor: s.id, action: "catalogo.cat.ejemplo", targetKind: "category", targetId: cat,
      before: { categoria: k.es, ejemplo: `${campo === "ph_nombre" ? "Nombre del negocio" : "Ítem propio"}: ${k.v ? `${k.v.es} / ${k.v.en}` : "—"}` }, after: { ejemplo: `${t.es} / ${t.en}` }, reason: m });
    return null;
  }, "Ejemplo guardado. Sale en Publica tu negocio desde ahora.");
}

/* Portada de la página de una categoría (Catálogo › la categoría › «Portada de la página»): la foto de /c/<categoría>. La foto la sube un Admin por la misma
   ruta de las fotos públicas (/api/medios: pasa por la revisión automática, decisión AJ; una retenida o rechazada no devuelve id y no llega aquí). Aquí se
   PONE: todo o nada dentro de una transacción. La foto pedida tiene que ser de quien la pone, visible, pública y de nuestro almacén (/medios/n/…); si no se
   puede adjuntar (no es suya, ya pasó a privada o a revisión, ya se usó) se lanza y se deshace TODO («Esa foto no existe.», nunca ok sin ella: guardián
   fotosAdjuntarTodoONada). La foto pasa a ser DE LA CATEGORÍA (media.owner_kind 'category', 0214); la anterior queda «removed/replaced» (nada se borra).
   categories.page_admin solo lleva la clave «hero» (lo demás de la página sigue de fábrica; la semilla nunca lo toca) y SOLO se escribe aquí (guardián
   portadaCategoriaDelEquipo). La página lee sin memoria (force-dynamic): el cambio se ve en la siguiente carga. */
export async function catPortada(cat: string, mediaId: string, motivo: string): Promise<ResAdm> {
  if (typeof cat !== "string" || !CAT.test(cat)) return no("Esa categoría no existe.");
  if (typeof mediaId !== "string" || !UUID.test(mediaId)) return no("Esa foto no existe.");
  const m = limpio(motivo);
  if (!m) return no("Escribe el motivo.");
  if (!(await mismoOrigen())) return no("No permitido.");
  try {
    return await hacer(async (c, s) => {
      const k = (await c.query<{ es: string; fab: string | null; ya: string | null }>(
        `select name->>'es' as es, page->>'hero' as fab, page_admin->>'hero' as ya from categories where id = $1 and page ? 'title' for update`, [cat])).rows[0];
      if (!k) return "Esa categoría no existe.";
      const f = (await c.query<{ url: string }>(
        `update media set owner_kind = 'category', owner_id = $1, sort = 0 where id = $2::uuid and owner_kind = 'user' and uploaded_by = $3 and owner_id = $3::text
            and status = 'visible' and not rev_sin_c2 and not private and purged_at is null and url like '/medios/n/%' returning url`, [cat, mediaId, s.id])).rows[0];
      if (!f) throw new FotoNoAdjunta();
      await c.query(`update media set status = 'removed', removed_reason = 'replaced', removed_by = $3, removed_at = now() where owner_kind = 'category' and owner_id = $1 and status = 'visible' and id <> $2::uuid`, [cat, mediaId, s.id]);
      await c.query(`update categories set page_admin = jsonb_set(coalesce(page_admin, '{}'::jsonb), '{hero}', to_jsonb($2::text)), updated_at = now() where id = $1`, [cat, f.url]);
      await auditar(c, { actor: s.id, action: "catalogo.cat.portada", targetKind: "category", targetId: cat,
        before: { categoria: k.es, portada: k.ya ? `foto del equipo · ${k.ya}` : "de fábrica" }, after: { portada: `foto del equipo · ${f.url}` }, reason: m });
      return null;
    }, "Portada cambiada. Ya se ve en la página de la categoría.");
  } catch (e) { if (e instanceof FotoNoAdjunta) return no("Esa foto no existe."); throw e; }
}

/* Volver a la portada de fábrica: quita la clave «hero» de page_admin (la página vuelve a categories.page) y deja la foto del equipo «removed/replaced». */
export async function catPortadaFabrica(cat: string, motivo: string): Promise<ResAdm> {
  if (typeof cat !== "string" || !CAT.test(cat)) return no("Esa categoría no existe.");
  const m = limpio(motivo);
  if (!m) return no("Escribe el motivo.");
  if (!(await mismoOrigen())) return no("No permitido.");
  return hacer(async (c, s) => {
    const k = (await c.query<{ es: string; ya: string | null }>(`select name->>'es' as es, page_admin->>'hero' as ya from categories where id = $1 for update`, [cat])).rows[0];
    if (!k) return "Esa categoría no existe.";
    if (!k.ya) return "Ya tiene la portada de fábrica.";
    await c.query(`update media set status = 'removed', removed_reason = 'replaced', removed_by = $2, removed_at = now() where owner_kind = 'category' and owner_id = $1 and status = 'visible'`, [cat, s.id]);
    await c.query(`update categories set page_admin = coalesce(page_admin, '{}'::jsonb) - 'hero', updated_at = now() where id = $1`, [cat]);
    await auditar(c, { actor: s.id, action: "catalogo.cat.portada_fabrica", targetKind: "category", targetId: cat,
      before: { categoria: k.es, portada: `foto del equipo · ${k.ya}` }, after: { portada: "de fábrica" }, reason: m });
    return null;
  }, "Vuelve la portada de fábrica.");
}

/* Mosaicos de la página de una categoría (Catálogo › la categoría › «Mosaicos de la página», 0217): la foto de cada mosaico de subcategoría de
   /c/<categoría> (filas de fotos y capítulos), incluidos los que salían en gris porque su foto de origen ya no existe. Mismas
   garantías que la portada: la foto la sube un Admin por la ruta de las fotos públicas (revisión automática, AJ) y aquí se PONE, todo o nada; si no
   se puede adjuntar (no es suya, pasó a privada o a revisión, ya se usó) se lanza y se deshace TODO («Esa foto no existe.»). La clave del mosaico
   tiene que ser uno de los mosaicos con foto de ESTA página (la de ?sub=<clave>); la foto pasa a ser DE ESE MOSAICO (media.owner_kind 'category',
   owner_id '<categoría>/<clave>': no la confunde la portada, que es owner_id = la categoría) y la anterior queda «removed/replaced». En
   categories.page_admin solo se toca la clave de ese mosaico dentro de «tiles» (la base lo impone: 0217), SOLO aquí (guardián
   mosaicosCategoriaDelEquipo). La página pinta la del equipo mientras siga visible; si no, la original; sin original, el gris. */
export async function catMosaico(cat: string, clave: string, mediaId: string, motivo: string): Promise<ResAdm> {
  if (typeof cat !== "string" || !CAT.test(cat)) return no("Esa categoría no existe.");
  if (!claveMosaico(clave)) return no("Ese mosaico no existe.");
  if (typeof mediaId !== "string" || !UUID.test(mediaId)) return no("Esa foto no existe.");
  const m = limpio(motivo);
  if (!m) return no("Escribe el motivo.");
  if (!(await mismoOrigen())) return no("No permitido.");
  try {
    return await hacer(async (c, s) => {
      const k = (await c.query<{ es: string; page: Pagina; ya: string | null }>(
        `select name->>'es' as es, page, page_admin->'tiles'->>$2 as ya from categories where id = $1 and page ? 'title' for update`, [cat, clave])).rows[0];
      if (!k) return "Esa categoría no existe.";
      const t = mosaicosConFoto(k.page).find((x) => x.key === clave);
      if (!t) return "Ese mosaico no existe.";
      const f = (await c.query<{ url: string }>(
        `update media set owner_kind = 'category', owner_id = $1, sort = 0 where id = $2::uuid and owner_kind = 'user' and uploaded_by = $3 and owner_id = $3::text
            and status = 'visible' and not rev_sin_c2 and not private and purged_at is null and url like '/medios/n/%' returning url`, [`${cat}/${clave}`, mediaId, s.id])).rows[0];
      if (!f) throw new FotoNoAdjunta();
      await c.query(`update media set status = 'removed', removed_reason = 'replaced', removed_by = $3, removed_at = now() where owner_kind = 'category' and owner_id = $1 and status = 'visible' and id <> $2::uuid`, [`${cat}/${clave}`, mediaId, s.id]);
      await c.query(`update categories set page_admin = jsonb_set(coalesce(page_admin, '{}'::jsonb), '{tiles}', coalesce(page_admin->'tiles', '{}'::jsonb) || jsonb_build_object($2::text, $3::text)), updated_at = now() where id = $1`, [cat, clave, f.url]);
      await auditar(c, { actor: s.id, action: "catalogo.cat.mosaico", targetKind: "category", targetId: cat,
        before: { categoria: k.es, mosaico: t.label.es, foto: k.ya ? `foto del equipo · ${k.ya}` : t.photo ? "la original" : "sin foto" }, after: { foto: `foto del equipo · ${f.url}` }, reason: m });
      return null;
    }, "Mosaico cambiado. Ya se ve en la página de la categoría.");
  } catch (e) { if (e instanceof FotoNoAdjunta) return no("Esa foto no existe."); throw e; }
}

/* Volver a la foto original de un mosaico: quita SOLO la clave de ese mosaico de page_admin.tiles (sin mosaicos del equipo, la clave «tiles» se va
   y page_admin queda como estaba) y deja su foto del equipo «removed/replaced». Sin original, el mosaico vuelve al gris. */
export async function catMosaicoOriginal(cat: string, clave: string, motivo: string): Promise<ResAdm> {
  if (typeof cat !== "string" || !CAT.test(cat)) return no("Esa categoría no existe.");
  if (!claveMosaico(clave)) return no("Ese mosaico no existe.");
  const m = limpio(motivo);
  if (!m) return no("Escribe el motivo.");
  if (!(await mismoOrigen())) return no("No permitido.");
  return hacer(async (c, s) => {
    const k = (await c.query<{ es: string; page: Pagina | null; ya: string | null }>(
      `select name->>'es' as es, page, page_admin->'tiles'->>$2 as ya from categories where id = $1 for update`, [cat, clave])).rows[0];
    if (!k) return "Esa categoría no existe.";
    if (!k.ya) return "Ese mosaico ya tiene su foto original.";
    const t = k.page && "title" in k.page ? mosaicosConFoto(k.page).find((x) => x.key === clave) : undefined;
    await c.query(`update media set status = 'removed', removed_reason = 'replaced', removed_by = $2, removed_at = now() where owner_kind = 'category' and owner_id = $1 and status = 'visible'`, [`${cat}/${clave}`, s.id]);
    await c.query(`update categories set page_admin = case when (page_admin->'tiles') - $2::text = '{}'::jsonb then page_admin - 'tiles'
                     else jsonb_set(page_admin, '{tiles}', (page_admin->'tiles') - $2::text) end, updated_at = now() where id = $1`, [cat, clave]);
    await auditar(c, { actor: s.id, action: "catalogo.cat.mosaico_original", targetKind: "category", targetId: cat,
      before: { categoria: k.es, mosaico: t?.label.es ?? clave, foto: `foto del equipo · ${k.ya}` }, after: { foto: t?.photo ? "la original" : "sin foto" }, reason: m });
    return null;
  }, "Vuelve la foto original del mosaico.");
}

/* Límites Free/Pro por módulo: son valores de Configuración (lib/config.ts, cambiarConfig: límites, auditoría antes → después en la misma
   transacción). Solo un Admin, como en Configuración. Los leen la ficha, los pedidos, el panel y Publica tu negocio. */
export async function limiteCambiar(key: string, valorTxt: string, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || s.role !== "admin" || !s.puede("cat", "editar")) return no("Solo un Admin cambia los límites del plan.");
  if (!LIMITES_PLAN.some((l) => l.key === key)) return no("Ese límite no existe.");
  const r = await cambiarConfig(s.id, key, String(valorTxt ?? ""), limpio(motivo, 300), { desde: "/admin/catalogo?tab=mod" });
  if (!r.ok) return no(r.msg);
  listo();
  return { ok: true, mensaje: `Guardado: ${r.v}. Aplica desde ahora en todas las ciudades.` };
}

/* Sinónimo nuevo: «palabra → sinónimo1, sinónimo2». Sin acentos, en minúsculas. */
export async function sinAgregar(texto: string): Promise<ResAdm> {
  const t = limpio(texto, 300), partes = t.split(/→|->|=>/);
  if (partes.length !== 2) return no("Usa el formato palabra → sinónimos (ej.: pelado → corte, barberia).");
  const termino = sinAcento(partes[0]!).replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
  const destinos = [...new Set(partes[1]!.split(",").map((x) => sinAcento(x).replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim()).filter((x) => x.length >= 2 && x.length <= 40))].slice(0, 8);
  if (termino.length < 2 || termino.length > 40 || !destinos.length) return no("Usa el formato palabra → sinónimos (ej.: pelado → corte, barberia).");
  if (destinos.includes(termino)) return no("La palabra y su sinónimo son iguales.");
  return hacer(async (c, s) => {
    for (const d of destinos) await c.query(
      `insert into synonyms (term, lang, target_kind, target, created_by, updated_at) values ($1, 'es', 'query', $2, $3, now())
       on conflict (term, lang, target_kind, target) do update set active = true, updated_at = now()`, [termino, d, s.id]);
    await auditar(c, { actor: s.id, action: "catalogo.sinonimo.agregar", targetKind: "synonym", targetId: termino, before: { sinonimo: "—" }, after: { sinonimo: `${termino} → ${destinos.join(", ")}` }, reason: "Agregado desde Catálogo" });
    return null;
  }, "Buscar lo entiende en menos de un minuto.");
}

/* Apagar / encender un sinónimo (todas sus palabras de destino). */
export async function sinActivo(term: string, lang: string, encender: boolean): Promise<ResAdm> {
  if (typeof term !== "string" || term.length < 1 || term.length > 60 || !["es", "en"].includes(lang)) return no("Ese sinónimo no existe.");
  return hacer(async (c, s) => {
    const n = (await c.query(`update synonyms set active = $3, updated_at = now() where lower(term) = lower($1) and lang = $2 and target_kind in ('query', 'filter') and active <> $3`, [term, lang, encender])).rowCount ?? 0;
    if (!n) return encender ? "Ya está encendido." : "Ya está apagado.";
    await auditar(c, { actor: s.id, action: encender ? "catalogo.sinonimo.encender" : "catalogo.sinonimo.apagar", targetKind: "synonym", targetId: term.toLowerCase(),
      before: { sinonimo: term.toLowerCase(), estado: encender ? "apagado" : "encendido" }, after: { estado: encender ? "encendido" : "apagado" }, reason: encender ? "Encendido desde Catálogo" : "Apagado desde Catálogo" });
    return null;
  }, encender ? "Encendido." : "Apagado. Buscar deja de usarlo en menos de un minuto.");
}

/* Un filtro de la página de categoría: sale o no sale en la hoja de filtros y en los rápidos. */
export async function filtroActivo(id: string, encender: boolean): Promise<ResAdm> {
  if (typeof id !== "string" || !/^\d{1,18}$/.test(id)) return no("Ese filtro no existe.");
  return hacer(async (c, s) => {
    const f = (await c.query<{ category_id: string; es: string; active: boolean; cat: string }>(
      `select f.category_id, f.label->>'es' as es, f.active, k.name->>'es' as cat from filter_options f join categories k on k.id = f.category_id where f.id = $1::bigint for update of f`, [id])).rows[0];
    if (!f) return "Ese filtro no existe.";
    if (f.active === encender) return encender ? "Ya sale en la página." : "Ya está apagado.";
    await c.query(`update filter_options set active = $2 where id = $1::bigint`, [id, encender]);
    await auditar(c, { actor: s.id, action: encender ? "catalogo.filtro.encender" : "catalogo.filtro.apagar", targetKind: "filter", targetId: f.category_id,
      before: { filtro: `${f.cat} · ${f.es}`, estado: encender ? "apagado" : "visible" }, after: { estado: encender ? "visible" : "apagado" }, reason: encender ? "Encendido desde Catálogo" : "Apagado desde Catálogo" });
    return null;
  }, encender ? "Sale en la página." : "Apagado: ya no sale en la página.");
}

export async function filtrosTodos(cat: string): Promise<ResAdm> {
  if (typeof cat !== "string" || !CAT.test(cat)) return no("Esa categoría no existe.");
  return hacer(async (c, s) => {
    const n = (await c.query(`update filter_options set active = true where category_id = $1 and not active`, [cat])).rowCount ?? 0;
    if (!n) return "Ya están todos encendidos.";
    await auditar(c, { actor: s.id, action: "catalogo.filtro.encender", targetKind: "filter", targetId: cat, before: { estado: `${n} apagados` }, after: { estado: "todos visibles" }, reason: "Encender todos" });
    return null;
  }, "Todos salen en la página.");
}

/* Catálogo › Seguros: ocultar o volver a mostrar un seguro. Los consultorios que lo tenían lo conservan guardado y vuelve
   solo si se muestra otra vez; sus filtros (medicaid, seguro…) se recalculan ahora. */
export async function seguroVisible(key: string, mostrar: boolean, motivo: string): Promise<ResAdm> {
  if (typeof key !== "string" || !/^[a-z0-9_]{2,40}$/.test(key)) return no("Ese seguro no existe.");
  const m = limpio(motivo, 300);
  if (m.length < 3) return no("Escribe el motivo.");
  return hacer(async (c, s) => {
    const x = (await c.query<{ es: string; hidden: boolean }>(`select name->>'es' as es, hidden from insurers where key = $1 for update`, [key])).rows[0];
    if (!x) return "Ese seguro no existe.";
    if (x.hidden === !mostrar) return mostrar ? "Ya sale." : "Ya está oculto.";
    await c.query(`update insurers set hidden = $2, updated_at = now() where key = $1`, [key, !mostrar]);
    const negs = (await c.query<{ id: string }>(`select business_id as id from health_settings where $1 = any(insurers)`, [key])).rows;
    for (const b of negs) await recalcularFiltrosSP(c, b.id);
    await auditar(c, { actor: s.id, action: mostrar ? "catalogo.seguro.mostrar" : "catalogo.seguro.ocultar", targetKind: "insurer", targetId: key,
      before: { seguro: x.es, estado: mostrar ? "oculto" : "visible" }, after: { estado: mostrar ? "visible" : "oculto", consultorios: String(negs.length) }, reason: m });
    return null;
  }, mostrar ? "Sale otra vez en Tu herramienta y en las fichas." : "Oculto: ya no sale en Tu herramienta ni en las fichas.");
}


/* Catálogo › Vivienda justa (4ib · §3): solo un Admin agrega o apaga frases (cada cambio con su motivo en la auditoría; nada se borra). La
   frase nueva frena los anuncios desde el próximo guardado. Las de fábrica no se apagan (lib/vivienda-justa.ts). */
const SOLO_ADMIN = "Solo un Admin cambia la lista de vivienda justa.";
async function soloAdmin(s: Staff, fn: (c: PoolClient, s: Staff) => Promise<string | null>, ok: string): Promise<ResAdm> {
  const r = await tx((c) => fn(c, s));
  if (r) return no(r);
  revalidatePath("/admin/catalogo");
  return { ok: true, mensaje: ok };
}
export async function fraseAgregar(texto: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || s.role !== "admin") return no(SOLO_ADMIN);
  const t = limpio(texto, 80), m = /^(es|en)\s*[:·-]\s*(.+)$/i.exec(t);
  if (!m) return no("Usa el formato idioma: frase (ej.: es: solo parejas).");
  const lang = m[1]!.toLowerCase(), frase = m[2]!.toLowerCase().replace(/[^\p{L}\p{N} ]+/gu, " ").replace(/\s+/g, " ").trim();
  if (frase.length < 3 || frase.length > 60 || frase.split(" ").length < 2) return no("La frase va de 2 palabras en adelante y hasta 60 letras.");
  return soloAdmin(s, async (c, s) => {
    const r = await c.query(`insert into fair_housing_phrases (phrase, lang, created_by, updated_by) values ($1, $2, $3, $3) on conflict do nothing`, [frase, lang, s.id]);
    if (!r.rowCount) return "Esa frase ya está en la lista.";
    await auditar(c, { actor: s.id, action: "catalogo.vivienda_justa.agregar", targetKind: "fair_housing", targetId: `${lang}:${frase}`, before: { frase: "—" }, after: { frase, idioma: lang }, reason: "Agregada desde Catálogo" });
    return null;
  }, "Agregada: los anuncios con esa frase ya no se guardan.");
}
export async function fraseActiva(id: string, encender: boolean, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || s.role !== "admin") return no(SOLO_ADMIN);
  if (typeof id !== "string" || !/^\d{1,18}$/.test(id)) return no("Esa frase no existe.");
  const m = limpio(motivo, 300);
  if (m.length < 3) return no("Escribe el motivo.");
  const { esBase } = await import("@/lib/vivienda-justa");
  return soloAdmin(s, async (c, s) => {
    const x = (await c.query<{ phrase: string; lang: string; active: boolean }>(`select phrase, lang, active from fair_housing_phrases where id = $1::bigint for update`, [id])).rows[0];
    if (!x) return "Esa frase no existe.";
    if (!encender && esBase(x.phrase)) return "Es de la lista de fábrica: no se apaga.";
    if (x.active === encender) return encender ? "Ya está encendida." : "Ya está apagada.";
    await c.query(`update fair_housing_phrases set active = $2, updated_by = $3, updated_at = now() where id = $1::bigint`, [id, encender, s.id]);
    await auditar(c, { actor: s.id, action: encender ? "catalogo.vivienda_justa.encender" : "catalogo.vivienda_justa.apagar", targetKind: "fair_housing", targetId: `${x.lang}:${x.phrase}`,
      before: { frase: x.phrase, estado: encender ? "apagada" : "encendida" }, after: { estado: encender ? "encendida" : "apagada" }, reason: m });
    return null;
  }, encender ? "Encendida." : "Apagada: ya no frena anuncios.");
}

/* Catálogo › Cargo del dealer (4ic): el tope de PA. Solo un Admin, con motivo y auditoría. Los cargos que pasan bajan al tope en la misma
   transacción (cada dealer queda en la auditoría); después los totales en la puerta de todos los carros se recalculan por lotes. */
export async function topeCargoDealer(dolares: string, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || s.role !== "admin") return no("Solo un Admin cambia el tope del cargo del dealer.");
  const v = Math.round(Number(String(dolares ?? "").replace(/[^0-9.]/g, "")));
  const m = limpio(motivo, 300);
  if (!(Number.isFinite(v) && v >= 0 && v <= 2000) || !String(dolares ?? "").trim()) return no("Escribe el tope en dólares (de $0 a $2,000).");
  if (m.length < 3) return no("Escribe el motivo.");
  const A = await import("@/lib/autos");
  // 5i · El tope es un valor de Configuración: lo escribe cambiarConfig (límites del catálogo, auditoría antes → después); los dealers que
  // pasan bajan en la misma transacción (cada uno queda en la auditoría).
  let bajados: string[] = [];
  const r = await cambiarConfig(s.id, "dealer_doc_fee_cap_cents", v * 100, m, { desde: "/admin/catalogo?tab=dealer", tambien: async (c) => {
    const x = await A.cambiarTopeCargo(c, v * 100);
    if (!x) throw new Error("tope inválido");
    bajados = x.bajados;
    for (const b of x.bajados) await auditar(c, { actor: s.id, action: "autos.cargo.bajado_al_tope", targetKind: "business", targetId: b, before: { cargo: "sobre el tope" }, after: { cargo: `$${v}` }, reason: m });
  } });
  if (!r.ok) return no(r.msg);
  const n = await A.recalcularTodosPorLotes();
  revalidatePath("/admin/catalogo");
  return { ok: true, mensaje: `Tope guardado: $${v}. ${bajados.length} dealers bajaron su cargo; ${n} negocios recalculados.` };
}
