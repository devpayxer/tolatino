"use server";
/* Acciones del Catálogo (ADM-CAT). Permiso cat:editar; cada cambio queda en la auditoría con lo que afecta
   («afecta a N negocios»). Nada se borra: una subcategoría quitada, un sinónimo o un filtro apagado vuelven con un toque.
   Lo leen la página de categoría (al instante) y Buscar (en menos de un minuto: tiene 60 s de memoria). */
import { revalidatePath } from "next/cache";
import type { PoolClient } from "pg";
import { auditar, staff, type Staff } from "@/lib/admin";
import { tx } from "@/lib/db";
import type { ResAdm } from "./acciones-colas";

const no = (mensaje: string): ResAdm => ({ ok: false, mensaje });
const limpio = (m: unknown, max = 500) => (typeof m === "string" ? m.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").replace(/\s+/g, " ").trim().slice(0, max) : "");
const sinAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const CAT = /^NEG-[A-Z]+$/, SUB = /^NEG-[A-Z]+-\d{2,3}$/;
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
    const sig = (await c.query<{ n: number; sort: number }>(
      `select coalesce(max(substring(id from '-(\\d+)$')::int), 0) + 1 as n, coalesce(max(sort), 0) + 1 as sort from subcategories where category_id = $1`, [cat])).rows[0]!;
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
    if ((x.status === "on") === encender) return encender ? "Ya está en la página." : "Ya está quitada.";
    await c.query(`update subcategories set status = $2, status_reason = $3, status_at = now(), updated_at = now() where id = $1`, [id, encender ? "on" : "off", encender ? null : m]);
    const n = (await c.query<{ n: number }>(`select catalogo_refrescar_docs($1) as n`, [id])).rows[0]!.n;
    await auditar(c, { actor: s.id, action: encender ? "catalogo.sub.restaurar" : "catalogo.sub.quitar", targetKind: "subcategory", targetId: id,
      before: { subcategoria: x.es, estado: encender ? "quitada" : "en la página" }, after: { estado: encender ? "en la página" : "quitada", negocios: `${n} ${n === 1 ? "negocio" : "negocios"}` }, reason: m });
    return null;
  }, encender ? "Restaurada." : "Quitada. Los negocios conservan su ficha.");
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
