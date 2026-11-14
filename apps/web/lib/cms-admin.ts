import "server-only";
import { auditar, type Staff } from "./admin";
import { BLOQUES, normalizarBloques, type BloqueHome } from "./cms-home";
import { db, tx } from "./db";
import { olvidarCadenas } from "./cms";

/* 9f · Super Admin › Textos y páginas › Cadenas, Rótulos por categoría y Home por ciudad (fase9-apertura.md §4 9f). Todo cambio lleva autor y motivo, queda en
   la versión de la cadena (la escribe la base: cms_string_versions, solo inserción) y en la auditoría, en la MISMA transacción. Las respuestas van en los
   dos idiomas ({es, en}): la acción elige el de quien las usa. Permisos: ver cms:ver · editar cadenas, rótulos, Home y anuncios cms:editar · marcar el
   inglés revisado cms:aprobar. El servidor decide; la pantalla solo muestra.
   Reglas que la base vuelve a imponer: una línea fija no se edita (cms_linea_fija), el largo máximo (cms_largo), las marcas {x} del código (cms_marcas),
   autor y motivo (cms_sin_autor). */
export type Par = { es: string; en: string };
export type Res = { ok: true; msg: Par } | { ok: false; msg: Par };
const bien = (es: string, en: string): Res => ({ ok: true, msg: { es, en } });
const mal = (es: string, en: string): Res => ({ ok: false, msg: { es, en } });
const limpio = (x: unknown, max: number) => String(x ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, max);
const marcas = (t: string) => [...new Set([...t.matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map((m) => m[1]!))].sort().join(",");
const ID = /^[A-Z0-9]+(-[A-Z0-9]+)*\.[A-Za-z0-9_.-]+$/;

// ─── Cadenas ───
export type CadenaAdm = {
  id: string; screen: string; es: string; en: string; code_es: string; code_en: string; status: "borrador" | "vivo"; en_state: "pendiente" | "traducido" | "revisado";
  max_len: number; locked: boolean; edited: boolean; version: number; updated_at: string; quien: string | null;
};
export type DatosCadenas = {
  kpi: { total: number; pendientes: number; traducidas: number; revisadas: number; editadas: number; fijas: number };
  pantallas: { screen: string; n: number }[]; filas: CadenaAdm[]; siguiente: string | null;
};
export const ESTADOS_CADENA = ["pendiente", "traducido", "revisado", "editadas", "fijas"] as const;
export async function cadenasAdmin(p: { q?: string; pantalla?: string | null; estado?: string | null; despues?: string | null }): Promise<DatosCadenas> {
  const q = limpio(p.q, 80), pant = p.pantalla && /^[A-Z0-9-]{3,40}$/.test(p.pantalla) ? p.pantalla : null;
  const est = (ESTADOS_CADENA as readonly string[]).includes(p.estado ?? "") ? p.estado! : null;
  const despues = p.despues && ID.test(p.despues) ? p.despues : null;
  const [k, pa, f] = await Promise.all([
    db().query<{ total: string; pendientes: string; traducidas: string; revisadas: string; editadas: string; fijas: string }>(
      `select count(*) as total, count(*) filter (where en_state = 'pendiente') as pendientes, count(*) filter (where en_state = 'traducido') as traducidas,
              count(*) filter (where en_state = 'revisado') as revisadas, count(*) filter (where edited) as editadas, count(*) filter (where locked) as fijas from cms_strings`),
    db().query<{ screen: string; n: string }>(`select screen, count(*) as n from cms_strings group by screen order by screen`),
    db().query<CadenaAdm & { code_text: Par; text: Par }>(
      `select s.id, s.screen, s.text, s.code_text, s.status, s.en_state, s.max_len, s.locked, s.edited, s.version, s.updated_at, nullif(trim(concat(u.first_name, ' ', u.last_name)), '') as quien
         from cms_strings s left join users u on u.id = s.updated_by
        where ($1::text is null or s.screen = $1) and ($4::text is null or s.id > $4)
          and ($2::text is null or case $2 when 'editadas' then s.edited when 'fijas' then s.locked else s.en_state = $2 end)
          and ($3::text = '' or s.id ilike '%' || $3 || '%' or s.text->>'es' ilike '%' || $3 || '%' or s.text->>'en' ilike '%' || $3 || '%')
        order by s.id limit 51`, [pant, est, q.replace(/[%_\\]/g, "\\$&"), despues]),
  ]);
  const kk = k.rows[0]!;
  const filas = f.rows.slice(0, 50).map((x) => ({ id: x.id, screen: x.screen, es: x.text.es, en: x.text.en, code_es: x.code_text.es, code_en: x.code_text.en, status: x.status,
    en_state: x.en_state, max_len: x.max_len, locked: x.locked, edited: x.edited, version: x.version, updated_at: x.updated_at, quien: x.quien }));
  return {
    kpi: { total: Number(kk.total), pendientes: Number(kk.pendientes), traducidas: Number(kk.traducidas), revisadas: Number(kk.revisadas), editadas: Number(kk.editadas), fijas: Number(kk.fijas) },
    pantallas: pa.rows.map((x) => ({ screen: x.screen, n: Number(x.n) })), filas, siguiente: f.rows.length > 50 ? f.rows[49]!.id : null,
  };
}
export type VersionCadena = { version: number; es: string; en: string; status: string; reason: string; at: string; quien: string | null };
export async function versionesCadena(id: string): Promise<VersionCadena[]> {
  if (!ID.test(id)) return [];
  const r = await db().query<{ version: number; text: Par; status: string; reason: string; at: string; quien: string | null }>(
    `select v.version, v.text, v.status, v.reason, v.at, nullif(trim(concat(u.first_name, ' ', u.last_name)), '') as quien
       from cms_string_versions v left join users u on u.id = v.by where v.string_id = $1 order by v.version desc limit 30`, [id]);
  return r.rows.map((x) => ({ version: x.version, es: x.text.es, en: x.text.en, status: x.status, reason: x.reason, at: x.at, quien: x.quien }));
}

/* El texto en vigor se cambia dentro de una transacción con autor y motivo (la base escribe la versión). */
async function cambiar(s: Staff, id: string, motivo: string, que: string, f: (c: import("pg").PoolClient, v: { text: Par; code_text: Par; status: string; locked: boolean; max_len: number; en_state: string }) => Promise<Res | null>): Promise<Res> {
  if (!ID.test(id)) return mal("Esa cadena no existe.", "That string does not exist.");
  const m = limpio(motivo, 500);
  if (m.length < 3) return mal("Escribe el motivo: queda en el historial.", "Write the reason: it goes in the history.");
  try {
    const r = await tx(async (c) => {
      const v = (await c.query<{ text: Par; code_text: Par; status: string; locked: boolean; max_len: number; en_state: string }>(
        `select text, code_text, status, locked, max_len, en_state from cms_strings where id = $1 for update`, [id])).rows[0];
      if (!v) return mal("Esa cadena no existe.", "That string does not exist.");
      if (v.locked) return mal("Es una línea fija: no se edita desde aquí. Cambia solo con el código.", "This is a fixed line: it cannot be edited here. It only changes with the code.");
      await c.query(`select set_config('tl.cms_por', $1, true), set_config('tl.cms_motivo', $2, true)`, [s.id, m]);
      const e = await f(c, v);
      if (e) return e;
      const d = (await c.query<{ text: Par; status: string; version: number; en_state: string }>(`select text, status, version, en_state from cms_strings where id = $1`, [id])).rows[0]!;
      await auditar(c, { actor: s.id, action: que, targetKind: "cms_string", targetId: id, before: { es: v.text.es, en: v.text.en, estado: v.status === "vivo" ? "visible" : "borrador" }, after: { es: d.text.es, en: d.text.en, estado: d.status === "vivo" ? "visible" : "borrador", version: d.version }, reason: m });
      return null;
    });
    olvidarCadenas();
    return r ?? bien("Listo. Los vecinos ya lo ven. Quedó en el historial.", "Done. Neighbors see it now. It is in the history.");
  } catch (e) {
    const t = String((e as Error).message ?? "");
    if (t.includes("cms_largo")) return mal("Se pasa del largo máximo de ese lugar.", "It is longer than that spot allows.");
    if (t.includes("cms_marcas")) return mal("Conserva las marcas {…} tal como están (por ejemplo {n}): el código las llena.", "Keep the {…} marks exactly as they are (for example {n}): the code fills them in.");
    if (t.includes("cms_vacia")) return mal("Ninguno de los dos idiomas puede quedar vacío.", "Neither language can be left empty.");
    if (t.includes("cms_linea_fija")) return mal("Es una línea fija: no se edita desde aquí.", "This is a fixed line: it cannot be edited here.");
    throw e;
  }
}

export async function editarCadena(s: Staff, id: string, es: string, en: string, motivo: string): Promise<Res> {
  if (!s.puede("cms", "editar")) return mal("Tu rol no edita textos.", "Your role cannot edit copy.");
  const E = limpio(es, 2000), N = limpio(en, 2000);
  if (!E || !N) return mal("Ninguno de los dos idiomas puede quedar vacío.", "Neither language can be left empty.");
  return cambiar(s, id, motivo, "cms.editar", async (c, v) => {
    if (E.length > v.max_len || N.length > v.max_len) return mal(`Se pasa del largo máximo (${v.max_len} caracteres).`, `It is over the maximum length (${v.max_len} characters).`);
    if (marcas(E) !== marcas(v.code_text.es) || marcas(N) !== marcas(v.code_text.en)) return mal("Conserva las marcas {…} tal como están (por ejemplo {n}): el código las llena.", "Keep the {…} marks exactly as they are (for example {n}): the code fills them in.");
    if (E === v.text.es && N === v.text.en) return mal("No cambiaste nada.", "You did not change anything.");
    // Si el inglés cambió, queda «traducido» (alguien lo escribió); revisarlo es otro paso (cms:aprobar).
    await c.query(`update cms_strings set text = jsonb_build_object('es', $2::text, 'en', $3::text), status = 'vivo', en_state = case when $3::text <> text->>'en' then 'traducido' else en_state end where id = $1`, [id, E, N]);
    return null;
  });
}
export async function volverAlCodigo(s: Staff, id: string, motivo: string): Promise<Res> {
  if (!s.puede("cms", "editar")) return mal("Tu rol no edita textos.", "Your role cannot edit copy.");
  return cambiar(s, id, motivo, "cms.restaurar", async (c, v) => {
    if (v.text.es === v.code_text.es && v.text.en === v.code_text.en && v.status === "vivo") return mal("Ya dice lo que dice el código.", "It already says what the code says.");
    await c.query(`update cms_strings set text = code_text, status = 'vivo' where id = $1`, [id]);
    return null;
  });
}
export async function ponerEstado(s: Staff, id: string, vivo: boolean, motivo: string): Promise<Res> {
  if (!s.puede("cms", "editar")) return mal("Tu rol no edita textos.", "Your role cannot edit copy.");
  return cambiar(s, id, motivo, vivo ? "cms.publicar" : "cms.borrador", async (c, v) => {
    if (vivo === (v.status === "vivo")) return mal("Ya estaba así.", "It was already like that.");
    await c.query(`update cms_strings set status = $2 where id = $1`, [id, vivo ? "vivo" : "borrador"]);
    return null;
  });
}
/* Marcar el inglés como revisado (o devolverlo a pendiente). No cambia el texto: no escribe versión, pero sí la auditoría. */
export async function revisarIngles(s: Staff, id: string, estado: "revisado" | "pendiente", motivo: string): Promise<Res> {
  if (!s.puede("cms", "aprobar")) return mal("Tu rol no revisa el inglés.", "Your role cannot review the English.");
  if (!ID.test(id)) return mal("Esa cadena no existe.", "That string does not exist.");
  const m = limpio(motivo, 500);
  if (m.length < 3) return mal("Escribe el motivo: queda en el historial.", "Write the reason: it goes in the history.");
  const r = await tx(async (c) => {
    const v = (await c.query<{ en_state: string; locked: boolean }>(`select en_state, locked from cms_strings where id = $1 for update`, [id])).rows[0];
    if (!v) return mal("Esa cadena no existe.", "That string does not exist.");
    if (v.locked) return mal("Una línea fija ya está revisada.", "A fixed line is already reviewed.");
    if (v.en_state === estado) return mal("Ya estaba así.", "It was already like that.");
    await c.query(`update cms_strings set en_state = $2 where id = $1`, [id, estado]);
    await auditar(c, { actor: s.id, action: "cms.ingles", targetKind: "cms_string", targetId: id, before: { ingles: v.en_state }, after: { ingles: estado }, reason: m });
    return null;
  });
  olvidarCadenas();
  return r ?? bien("Listo. Quedó en el historial.", "Done. It is in the history.");
}

// ─── Rótulos por categoría ───
export type RotuloAdm = { id: string; short: Par; name: Par; fixed_line: Par | null; slug_es: string };
export async function rotulosAdmin(): Promise<RotuloAdm[]> {
  const r = await db().query<{ id: string; short: Par; name: Par; fixed_line: Par | null }>(`select id, short, name, fixed_line from categories where status = 'on' order by sort`);
  return r.rows.map((x) => ({ ...x, slug_es: x.short.es }));
}
const LARGO_ROTULO = { short: 18, name: 44 } as const;
/* El nombre corto ES es la dirección de la categoría (/c/comida): no se cambia aquí (cambiaría la URL). Los otros tres textos sí. */
export async function editarRotulo(s: Staff, cat: string, es: string, en: string, campo: "short" | "name", motivo: string): Promise<Res> {
  if (!s.puede("cms", "editar")) return mal("Tu rol no edita rótulos.", "Your role cannot edit labels.");
  if (campo !== "short" && campo !== "name") return mal("Ese rótulo no existe.", "That label does not exist.");
  const m = limpio(motivo, 500), E = limpio(es, 80), N = limpio(en, 80), max = LARGO_ROTULO[campo];
  if (m.length < 3) return mal("Escribe el motivo: queda en el historial.", "Write the reason: it goes in the history.");
  if (!E || !N) return mal("Ninguno de los dos idiomas puede quedar vacío.", "Neither language can be left empty.");
  if (E.length > max || N.length > max) return mal(`Se pasa del largo máximo (${max} caracteres).`, `It is over the maximum length (${max} characters).`);
  const r = await tx(async (c) => {
    const v = (await c.query<{ short: Par; name: Par }>(`select short, name from categories where id = $1 for update`, [cat])).rows[0];
    if (!v) return mal("Esa categoría no existe.", "That category does not exist.");
    if (campo === "short" && E !== v.short.es) return mal("El nombre corto en español es la dirección de la categoría (/c/…): no se cambia aquí.", "The short Spanish name is the category address (/c/…): it is not changed here.");
    const antes = v[campo];
    if (E === antes.es && N === antes.en) return mal("No cambiaste nada.", "You did not change anything.");
    await c.query(`update categories set ${campo} = jsonb_build_object('es', $2::text, 'en', $3::text), updated_at = now() where id = $1`, [cat, E, N]);
    await auditar(c, { actor: s.id, action: "cms.rotulo", targetKind: "category", targetId: `${cat}.${campo}`, before: antes, after: { es: E, en: N }, reason: m });
    return null;
  });
  return r ?? bien("Listo. Los vecinos ya lo ven. Quedó en el historial.", "Done. Neighbors see it now. It is in the history.");
}

// ─── Home por ciudad y anuncios ───
export type AnuncioAdm = { id: string; audience: string; es: string; en: string; from_at: string; to_at: string; estado: "vivo" | "proximo" | "vencido" | "retirado"; quien: string | null; retired_reason: string | null };
export type CiudadHome = { id: string; name: string; state: string; status: string; timezone: string; aviso: Par | null; bloques: { key: BloqueHome; on: boolean }[]; editada: boolean; actualizado: string | null; quien: string | null };
export type DatosHome = { ciudades: CiudadHome[]; anuncios: AnuncioAdm[]; vivos: number };
export async function homeAdmin(ciudad: string | null): Promise<DatosHome> {
  const cs = await db().query<{ id: string; name: string; state: string; status: string; timezone: string; notice: Par | null; blocks: unknown; has: boolean; updated_at: string | null; quien: string | null }>(
    `select c.id, c.name, c.state, c.status, c.timezone, h.notice, h.blocks, h.city_id is not null as has, h.updated_at, nullif(trim(concat(u.first_name, ' ', u.last_name)), '') as quien
       from cities c left join city_home_config h on h.city_id = c.id left join users u on u.id = h.updated_by order by (c.status = 'on') desc, c.name`);
  const ciudades = cs.rows.map((c) => ({ id: c.id, name: c.name, state: c.state, status: c.status, timezone: c.timezone, aviso: c.notice, bloques: normalizarBloques(c.blocks), editada: c.has, actualizado: c.updated_at, quien: c.quien }));
  const ok = ciudad && ciudades.some((c) => c.id === ciudad) ? ciudad : null;
  const an = await db().query<{ id: string; audience: string; text: Par; from_at: string; to_at: string; retired_at: string | null; retired_reason: string | null; quien: string | null; vivo: boolean; proximo: boolean }>(
    `select a.id::text, a.audience, a.text, a.from_at, a.to_at, a.retired_at, a.retired_reason, nullif(trim(concat(u.first_name, ' ', u.last_name)), '') as quien,
            (a.retired_at is null and a.from_at <= now() and a.to_at > now()) as vivo, (a.retired_at is null and a.from_at > now()) as proximo
       from announcements a left join users u on u.id = a.by_staff_id where ($1::text is null or a.city_id = $1) order by a.to_at desc, a.id desc limit 40`, [ok]);
  const anuncios = an.rows.map((a) => ({ id: a.id, audience: a.audience, es: a.text.es, en: a.text.en, from_at: a.from_at, to_at: a.to_at, quien: a.quien, retired_reason: a.retired_reason,
    estado: a.retired_at ? "retirado" as const : a.vivo ? "vivo" as const : a.proximo ? "proximo" as const : "vencido" as const }));
  return { ciudades, anuncios, vivos: anuncios.filter((a) => a.estado === "vivo").length };
}
export async function guardarHome(s: Staff, ciudad: string, aviso: Par | null, bloques: { key: string; on: boolean }[], motivo: string): Promise<Res> {
  if (!s.puede("cms", "editar")) return mal("Tu rol no edita el Inicio de la ciudad.", "Your role cannot edit a city Home.");
  const m = limpio(motivo, 500);
  if (m.length < 3) return mal("Escribe el motivo: queda en el historial.", "Write the reason: it goes in the history.");
  const lista = Array.isArray(bloques) ? bloques : [];
  if (lista.length !== BLOQUES.length || new Set(lista.map((b) => b?.key)).size !== BLOQUES.length || lista.some((b) => !(BLOQUES as readonly string[]).includes(String(b?.key)) || typeof b?.on !== "boolean"))
    return mal("La lista de bloques no es válida.", "The block list is not valid.");
  const A = aviso ? { es: limpio(aviso.es, 160), en: limpio(aviso.en, 160) } : null;
  if (A && (!A.es || !A.en)) return mal("El aviso lleva los dos idiomas (o ninguno).", "The notice needs both languages (or neither).");
  const blq = normalizarBloques(lista);
  const r = await tx(async (c) => {
    const ci = (await c.query<{ id: string }>(`select id from cities where id = $1`, [ciudad])).rows[0];
    if (!ci) return mal("Esa ciudad no existe.", "That city does not exist.");
    const antes = (await c.query<{ notice: Par | null; blocks: unknown }>(`select notice, blocks from city_home_config where city_id = $1 for update`, [ciudad])).rows[0];
    const antesN = normalizarBloques(antes?.blocks);
    if (JSON.stringify(antesN) === JSON.stringify(blq) && JSON.stringify(antes?.notice ?? null) === JSON.stringify(A)) return mal("No cambiaste nada.", "You did not change anything.");
    await c.query(`insert into city_home_config (city_id, notice, blocks, updated_by, updated_at) values ($1, $2::jsonb, $3::jsonb, $4::uuid, now())
                   on conflict (city_id) do update set notice = excluded.notice, blocks = excluded.blocks, updated_by = excluded.updated_by, updated_at = now()`,
      [ciudad, A ? JSON.stringify(A) : null, JSON.stringify(blq), s.id]);
    await auditar(c, { actor: s.id, action: "cms.home", targetKind: "city_home", targetId: ciudad, city: ciudad, before: { aviso: antes?.notice ?? null, bloques: antesN }, after: { aviso: A, bloques: blq }, reason: m });
    return null;
  });
  return r ?? bien("Listo. El Inicio de la ciudad ya está así. Quedó en el historial.", "Done. The city Home is now like this. It is in the history.");
}
const FECHA = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
/* Crear un anuncio: las fechas se escriben en la hora de la ciudad («2026-11-20 08:00»). Un anuncio no se edita: se retira y se crea otro. */
export async function crearAnuncio(s: Staff, ciudad: string, audiencia: string, es: string, en: string, desde: string, hasta: string, motivo: string): Promise<Res> {
  if (!s.puede("cms", "editar")) return mal("Tu rol no crea anuncios.", "Your role cannot create announcements.");
  const E = limpio(es, 160), N = limpio(en, 160), m = limpio(motivo, 500);
  if (!E || !N) return mal("El anuncio lleva los dos idiomas.", "The announcement needs both languages.");
  if (audiencia !== "todos" && audiencia !== "vecinos") return mal("Elige a quién le sale.", "Choose who sees it.");
  if (!FECHA.test(desde) || !FECHA.test(hasta)) return mal("Las fechas van como AAAA-MM-DD HH:MM, en la hora de la ciudad.", "Dates go as YYYY-MM-DD HH:MM, in the city time.");
  if (m.length < 3) return mal("Escribe el motivo: queda en el historial.", "Write the reason: it goes in the history.");
  try {
    const r = await tx(async (c) => {
      const ci = (await c.query<{ timezone: string }>(`select timezone from cities where id = $1`, [ciudad])).rows[0];
      if (!ci) return mal("Esa ciudad no existe.", "That city does not exist.");
      const f = (await c.query<{ d: string; h: string; ok: boolean }>(`select ($1::timestamp at time zone $3)::text as d, ($2::timestamp at time zone $3)::text as h, ($2::timestamp > $1::timestamp and $2::timestamp <= $1::timestamp + interval '31 days') as ok`, [desde, hasta, ci.timezone])).rows[0]!;
      if (!f.ok) return mal("«Hasta» va después de «desde», con 31 días como máximo.", "“Until” must be after “from”, 31 days at most.");
      const id = (await c.query<{ id: string }>(`insert into announcements (city_id, audience, text, from_at, to_at, by_staff_id) values ($1, $2, $3::jsonb, $4::timestamptz, $5::timestamptz, $6::uuid) returning id::text`,
        [ciudad, audiencia, JSON.stringify({ es: E, en: N }), f.d, f.h, s.id])).rows[0]!.id;
      await auditar(c, { actor: s.id, action: "cms.anuncio", targetKind: "announcement", targetId: id, city: ciudad, after: { es: E, en: N, audiencia, desde, hasta }, reason: m });
      return null;
    });
    return r ?? bien("Listo. Saldrá en el Inicio de la ciudad dentro de sus fechas.", "Done. It will show on the city Home within its dates.");
  } catch (e) {
    if (String((e as Error).message).includes("announcements_check")) return mal("«Hasta» va después de «desde», con 31 días como máximo.", "“Until” must be after “from”, 31 days at most.");
    throw e;
  }
}
export async function retirarAnuncio(s: Staff, id: string, motivo: string): Promise<Res> {
  if (!s.puede("cms", "editar")) return mal("Tu rol no retira anuncios.", "Your role cannot retire announcements.");
  const m = limpio(motivo, 500);
  if (!/^\d{1,18}$/.test(id)) return mal("Ese anuncio no existe.", "That announcement does not exist.");
  if (m.length < 3) return mal("Escribe el motivo: queda en el historial.", "Write the reason: it goes in the history.");
  const r = await tx(async (c) => {
    const a = (await c.query<{ city_id: string; retired_at: string | null }>(`select city_id, retired_at from announcements where id = $1::bigint for update`, [id])).rows[0];
    if (!a) return mal("Ese anuncio no existe.", "That announcement does not exist.");
    if (a.retired_at) return mal("Ya estaba retirado.", "It was already retired.");
    await c.query(`update announcements set retired_at = now(), retired_by = $2::uuid, retired_reason = $3 where id = $1::bigint`, [id, s.id, m]);
    await auditar(c, { actor: s.id, action: "cms.anuncio.retirar", targetKind: "announcement", targetId: id, city: a.city_id, reason: m });
    return null;
  });
  return r ?? bien("Retirado: ya no sale. Nada se borra.", "Retired: it no longer shows. Nothing is deleted.");
}

// ─── 9o · El aviso del mantenimiento programado a los vecinos ───
/* Lo llama el barrido (lib/sistema/despliegues.ts · avisarMantenimiento): un anuncio por ciudad, de ahora hasta el fin de la ventana, con el texto del
   mantenimiento (ES/EN, 160 como máximo). El autor es quien programó el mantenimiento y queda en la auditoría con su motivo; una vez por ventana (la base
   lo marca en notice_at en la MISMA transacción). Si el mantenimiento se cancela, sus anuncios se retiran con el motivo de la cancelación. */
export async function anunciarMantenimiento(w: { id: string; hasta: Date; es: string; en: string; por: string; motivo: string }): Promise<number> {
  return tx(async (c) => {
    const marcado = (await c.query(`update maintenance_windows set notice_at = now() where id = $1 and notice_at is null and cancelled_at is null`, [w.id])).rowCount ?? 0;
    if (!marcado) return 0;
    const r = await c.query<{ id: string; city_id: string }>(
      `insert into announcements (city_id, audience, text, from_at, to_at, by_staff_id, maintenance_id) select id, 'todos', $1::jsonb, now(), $2, $3::uuid, $4 from cities returning id::text, city_id`,
      [JSON.stringify({ es: limpio(w.es, 160), en: limpio(w.en, 160) }), w.hasta, w.por, w.id]);
    for (const a of r.rows) await auditar(c, { actor: w.por, action: "cms.anuncio.mantenimiento", targetKind: "announcement", targetId: a.id, city: a.city_id, after: { mantenimiento: w.id }, reason: w.motivo });
    return r.rowCount ?? 0;
  });
}
export async function retirarAnunciosDeMantenimiento(): Promise<number> {
  return tx(async (c) => {
    const r = await c.query<{ id: string; city_id: string; por: string; motivo: string }>(
      `update announcements a set retired_at = now(), retired_by = w.cancelled_by, retired_reason = 'El mantenimiento se canceló: ' || w.cancel_reason
         from maintenance_windows w where a.maintenance_id = w.id and w.cancelled_at is not null and a.retired_at is null
       returning a.id::text, a.city_id, w.cancelled_by::text as por, w.cancel_reason as motivo`);
    for (const a of r.rows) await auditar(c, { actor: a.por, action: "cms.anuncio.retirar", targetKind: "announcement", targetId: a.id, city: a.city_id, reason: `El mantenimiento se canceló: ${a.motivo}` });
    return r.rowCount ?? 0;
  });
}

// ─── El pie de la web en todas las páginas ───
/* Encender o apagar el pie bajo el Inicio, la ficha y Buscar (feature_flags «web.pie_todas»). cms:aprobar: cambia lo que ve todo el que entra. */
export async function fijarPie(s: Staff, encender: boolean, motivo: string): Promise<Res> {
  if (!s.puede("cms", "aprobar")) return mal("Tu rol no cambia el pie de la web.", "Your role cannot change the web footer.");
  const m = limpio(motivo, 500);
  if (m.length < 3) return mal("Escribe el motivo: queda en el historial.", "Write the reason: it goes in the history.");
  const r = await tx(async (c) => {
    const a = (await c.query<{ enabled: boolean }>(`select enabled from feature_flags where key = 'web.pie_todas' for update`)).rows[0];
    if (!a) return mal("Falta el interruptor del pie: corre las migraciones.", "The footer switch is missing: run the migrations.");
    if (a.enabled === encender) return mal("Ya estaba así.", "It was already like that.");
    await c.query(`update feature_flags set enabled = $1, updated_at = now(), updated_by = $2 where key = 'web.pie_todas'`, [encender, s.id]);
    await auditar(c, { actor: s.id, action: "cms.pie", targetKind: "feature_flag", targetId: "web.pie_todas", before: { encendido: a.enabled }, after: { encendido: encender }, reason: m });
    return null;
  });
  return r ?? bien(encender ? "Listo. El pie de la web sale en el Inicio, la ficha y Buscar." : "Listo. El pie de la web vuelve a salir solo en las páginas legales.", encender ? "Done. The web footer shows on Home, the listing and Search." : "Done. The web footer shows only on the legal pages again.");
}
