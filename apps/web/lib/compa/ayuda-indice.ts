import "server-only";
import { auditar, type Staff } from "../admin";
import { db, tx } from "../db";

/* 7a · La ayuda como base de conocimiento (fase7-compa.md §3 «De dónde contesta» y §4 7a). ÚNICO lector de help_articles / help_chunks.
   - audienciasDe(usuario): lo decide el servidor con la sesión. Sin cuenta o vecino → vecino. Miembro activo de un panel → + negocio.
     Portero activo (o quien abre la puerta desde el panel) → + portero. Equipo de To'Latino (staff activo) → las cuatro, equipo incluido.
   - Toda consulta pública filtra por esas audiencias en el artículo Y en el trozo (una sección solo-equipo es «equipo»), y por estado
     «live» (un artículo pausado o retirado no sale). Nada de esto se decide en el cliente (guardián compaAyudaPorAudiencia).
   - buscarAyuda(): una consulta GIN con rango (ts_rank_cd) y los sinónimos del Catálogo (ayuda_consulta); todas las palabras primero y,
     si no hay nada, cualquiera. El Compa (7c) usará la misma función con `ayuda_trozos_max` y `ayuda_umbral_rank`.
   - El Super Admin solo pausa / vuelve a usar (con motivo, help_article_log y auditoría); el texto se corrige en el repo (§6 #12). */
export type Audiencia = "vecino" | "negocio" | "portero" | "equipo";
export type Lang = "es" | "en";
type Bi = { es: string; en: string };
export type Tema = { key: string; label: Bi; lead: Bi; icon: string; audience: Audiencia; n: number };
export type FilaAyuda = { slug: string; title: Bi; topic: string; audience: Audiencia };
export type Hallado = FilaAyuda & { heading: string; snippet: string; lang: Lang };
export type Seccion = { heading: string; nivel: number; body: string; equipo: boolean };
export type Articulo = FilaAyuda & { version: string; status: "live" | "paused"; paused_reason: string | null; secciones: { es: Seccion[]; en: Seccion[] } };

const TODAS: Audiencia[] = ["vecino", "negocio", "portero", "equipo"];

/* Quién lee qué: solo con el id de la sesión (nunca una audiencia que mande el cliente). */
export async function audienciasDe(userId: string | null): Promise<Audiencia[]> {
  if (!userId) return ["vecino"];
  const r = (await db().query<{ staff: boolean; negocio: boolean; portero: boolean }>(
    `select exists (select 1 from staff_members where user_id = $1 and status = 'active') as staff,
            exists (select 1 from business_members m join businesses b on b.id = m.business_id
                     where m.user_id = $1 and m.status = 'active' and b.status <> 'merged') as negocio,
            exists (select 1 from door_staff where user_id = $1 and status = 'active')
              or exists (select 1 from business_members m where m.user_id = $1 and m.status = 'active'
                          and (m.kind = 'owner' or m.panel_access && array['all', 'evt']::text[])) as portero`, [userId])).rows[0];
  if (r?.staff) return [...TODAS];
  return ["vecino", ...(r?.negocio ? ["negocio" as const] : []), ...(r?.portero ? ["portero" as const] : [])];
}

/* Los temas que esa persona puede ver, con cuántos artículos vivos tiene cada uno. */
export async function temasAyuda(aud: Audiencia[]): Promise<Tema[]> {
  return (await db().query<Tema>(
    `select t.key, t.label, t.lead, t.icon, t.audience, count(a.slug)::int as n
       from help_topics t left join help_articles a on a.topic = t.key and a.status = 'live' and a.audience = any($1::text[])
      where t.audience = any($1::text[]) group by t.key order by t.sort`, [aud])).rows.filter((t) => t.n > 0);
}

/* La lista del Centro de ayuda (todos los artículos vivos de sus audiencias, por tema y título). */
export async function listaAyuda(aud: Audiencia[], lang: Lang, tema: string | null): Promise<FilaAyuda[]> {
  return (await db().query<FilaAyuda>(
    `select a.slug, a.title, a.topic, a.audience from help_articles a join help_topics t on t.key = a.topic
      where a.status = 'live' and a.audience = any($1::text[]) and ($2::text is null or a.topic = $2)
      order by t.sort, a.title->>$3`, [aud, tema, lang])).rows;
}

/* Buscar: ≤ n artículos, el mejor trozo de cada uno. Primero en el idioma pedido (todas las palabras, luego cualquiera); si no hay nada,
   en el otro idioma. */
export async function buscarAyuda(texto: string, lang: Lang, aud: Audiencia[], n = 20): Promise<Hallado[]> {
  const q = String(texto ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, 120);
  if (q.length < 2) return [];
  const una = async (l: Lang, modo: "and" | "or") => (await db().query<Hallado & { rank: number }>(
    `with q as (select ayuda_consulta($1, $2, $5) as tq),
          t as (select c.slug, c.heading, c.body, c.lang, ts_rank_cd(c.tsv, q.tq) as rank,
                       row_number() over (partition by c.slug order by ts_rank_cd(c.tsv, q.tq) desc, c.ord) as k
                  from help_chunks c, q
                 where q.tq is not null and c.tsv @@ q.tq and c.lang = $2 and c.audience = any($3::text[]))
     select a.slug, a.title, a.topic, a.audience, t.heading, left(t.body, 600) as snippet, t.lang, t.rank
       from t join help_articles a on a.slug = t.slug
      where t.k = 1 and a.status = 'live' and a.audience = any($3::text[])
      order by t.rank desc, a.slug limit $4`, [q, l, aud, Math.max(1, Math.min(n, 50)), modo])).rows;
  const otro: Lang = lang === "es" ? "en" : "es";
  let r = await una(lang, "and");
  if (!r.length) r = await una(lang, "or");
  if (!r.length) r = await una(otro, "and");
  return r.map(({ rank: _r, ...x }) => { void _r; return { ...x, snippet: resumen(x.snippet) }; });
}

/* 7c · Los trozos que recibe El Compa: ≤ n trozos COMPLETOS (≤ 1 800 caracteres) de artículos vivos de sus audiencias, en su idioma (o en el
   otro si no hay nada). Misma consulta GIN y sinónimos que buscarAyuda. Un trozo que trae TODAS las palabras de la pregunta vale; uno que trae
   solo algunas (la segunda vuelta) tiene que pasar el umbral (milésimas: ayuda_umbral_rank), porque ahí sale ruido («cancelar» coincide con
   boletos cuando preguntan por una mesa). Lo que no pasa no se da: El Compa dice «No tengo ese dato». */
export type Trozo = { slug: string; title: Bi; heading: string; body: string; lang: Lang; rank: number };
export async function trozosCompa(texto: string, lang: Lang, aud: Audiencia[], n: number, umbralMilesimas: number): Promise<Trozo[]> {
  const q = String(texto ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, 120);
  if (q.length < 2 || !aud.length) return [];
  const una = async (l: Lang, modo: "and" | "or") => (await db().query<Trozo>(
    `with q as (select ayuda_consulta($1, $2, $5) as tq)
     select c.slug, a.title, c.heading, c.body, c.lang, ts_rank_cd(c.tsv, q.tq)::float8 as rank
       from help_chunks c join help_articles a on a.slug = c.slug, q
      where q.tq is not null and c.tsv @@ q.tq and c.lang = $2 and c.audience = any($3::text[]) and a.status = 'live' and a.audience = any($3::text[])
        and ($5 = 'and' or ts_rank_cd(c.tsv, q.tq) >= $6::float8 / 1000)
      order by rank desc, c.slug, c.ord limit $4`, [q, l, aud, Math.max(1, Math.min(n, 10)), modo, Math.max(0, umbralMilesimas)])).rows;
  let r = await una(lang, "and");
  if (!r.length) r = await una(lang, "or");
  if (!r.length) r = await una(lang === "es" ? "en" : "es", "and");
  return r;
}

/* Un artículo, solo si es de una audiencia de la persona. Pausado: el equipo lo ve con su motivo; los demás, solo que se está revisando
   (sin texto). Retirado o de otra audiencia: null (la página dice 404, igual que si no existiera). */
export async function articulo(slug: string, aud: Audiencia[]): Promise<Articulo | null> {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(String(slug ?? "")) || slug.length > 80) return null;
  const a = (await db().query<Omit<Articulo, "secciones">>(
    `select slug, title, topic, audience, version_label as version, status, paused_reason
       from help_articles where slug = $1 and status in ('live', 'paused') and audience = any($2::text[])`, [slug, aud])).rows[0];
  if (!a) return null;
  const equipo = aud.includes("equipo");
  if (a.status === "paused" && !equipo) return { ...a, paused_reason: null, secciones: { es: [], en: [] } };
  const c = (await db().query<{ lang: Lang; sec: number; nivel: number; heading: string; body: string; audience: Audiencia }>(
    `select c.lang, c.sec, c.nivel, c.heading, c.body, c.audience from help_chunks c
      where c.slug = $1 and c.audience = any($2::text[]) order by c.ord`, [slug, aud])).rows;
  const secciones: Articulo["secciones"] = { es: [], en: [] };
  let ultimo = "";
  for (const x of c) {
    const k = `${x.lang}:${x.sec}`, lista = secciones[x.lang];
    if (k === ultimo && lista.length) lista[lista.length - 1]!.body += "\n\n" + x.body;
    else lista.push({ heading: x.heading, nivel: x.nivel, body: x.body, equipo: x.audience === "equipo" && a.audience !== "equipo" });
    ultimo = k;
  }
  return { ...a, paused_reason: equipo ? a.paused_reason : null, secciones };
}

/* Los títulos de los artículos que esa persona puede abrir (para convertir «`otro-articulo.md`» en un enlace solo si lo puede leer). */
export async function titulosVisibles(aud: Audiencia[]): Promise<Record<string, Bi>> {
  const r = await db().query<{ slug: string; title: Bi }>(`select slug, title from help_articles where status = 'live' and audience = any($1::text[])`, [aud]);
  return Object.fromEntries(r.rows.map((x) => [x.slug, x.title]));
}

/* Un párrafo sin marcas de Markdown para el resultado de la búsqueda. */
function resumen(md: string): string {
  const t = md.replace(/^\s*\|?[-:| ]+\|\s*$/gm, " ").replace(/[|*_\x60>#]/g, " ").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/\s+/g, " ").trim();
  return t.length > 180 ? t.slice(0, 177).replace(/\s+\S*$/, "") + "…" : t;
}

/* ── Super Admin › Textos y páginas › Ayuda ── */
export type FilaAdmin = FilaAyuda & { version: string; sha: string; deployed: string; status: "live" | "paused" | "retired"; motivo: string | null; quien: string | null; trozos: number; equipo: number };
export type LogAdmin = { slug: string; action: string; reason: string | null; quien: string | null; at: string; sha_old: string | null; sha_new: string | null };
export type DatosAyudaAdmin = { filas: FilaAdmin[]; siguiente: string | null; kpi: { vivos: number; pausados: number; retirados: number; vecino: number; negocio: number; portero: number; equipo: number; ultimo: string | null }; log: LogAdmin[] };
const ISO = (c: string) => `to_char(${c} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;
export async function ayudaAdmin(f: { aud: Audiencia | null; estado: "paused" | "retired" | null; q: string; despues: string | null }): Promise<DatosAyudaAdmin> {
  const q = String(f.q ?? "").trim().slice(0, 60).toLowerCase();
  const [F, K, L] = await Promise.all([
    db().query<FilaAdmin>(
      `select a.slug, a.title, a.topic, a.audience, a.version_label as version, left(a.sha256, 8) as sha, ${ISO("a.deployed_at")} as deployed, a.status,
              a.paused_reason as motivo, nullif(trim(coalesce(u.first_name, '') || ' ' || left(coalesce(u.last_name, ''), 1)), '') as quien,
              (select count(*)::int from help_chunks c where c.slug = a.slug) as trozos,
              (select count(*)::int from help_chunks c where c.slug = a.slug and c.audience = 'equipo' and a.audience <> 'equipo') as equipo
         from help_articles a left join users u on u.id = a.paused_by
        where ($1::text is null or a.audience = $1) and (case when $2::text is null then a.status <> 'retired' else a.status = $2 end)
          and ($3 = '' or a.slug like '%' || $3 || '%' or lower(a.title->>'es') like '%' || $3 || '%' or lower(a.title->>'en') like '%' || $3 || '%')
          and ($4::text is null or a.slug > $4)
        order by a.slug limit 51`, [f.aud, f.estado, q, f.despues]),
    db().query<DatosAyudaAdmin["kpi"]>(
      `select count(*) filter (where status = 'live')::int as vivos, count(*) filter (where status = 'paused')::int as pausados,
              count(*) filter (where status = 'retired')::int as retirados,
              count(*) filter (where status <> 'retired' and audience = 'vecino')::int as vecino, count(*) filter (where status <> 'retired' and audience = 'negocio')::int as negocio,
              count(*) filter (where status <> 'retired' and audience = 'portero')::int as portero, count(*) filter (where status <> 'retired' and audience = 'equipo')::int as equipo,
              ${ISO("max(deployed_at)")} as ultimo from help_articles`),
    db().query<LogAdmin>(
      `select l.slug, l.action, l.reason, nullif(trim(coalesce(u.first_name, '') || ' ' || left(coalesce(u.last_name, ''), 1)), '') as quien, ${ISO("l.at")} as at,
              left(l.sha256_old, 8) as sha_old, left(l.sha256_new, 8) as sha_new
         from help_article_log l left join users u on u.id = l.by
        where l.action <> 'indexed' or l.at > now() - interval '30 days' order by l.at desc, l.id desc limit 20`),
  ]);
  const filas = F.rows.slice(0, 50);
  return { filas, siguiente: F.rows.length > 50 ? filas[filas.length - 1]!.slug : null, kpi: K.rows[0]!, log: L.rows };
}

/* Pausar / volver a usar (cms:editar; lo revisa la acción). Motivo obligatorio, libro y auditoría en la misma transacción. */
export async function pausarAyuda(s: Staff, slug: string, motivo: string, pausar: boolean): Promise<{ ok: true } | { ok: false; msg: string }> {
  const m = String(motivo ?? "").replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim().slice(0, 300);
  if (m.length < 3) return { ok: false, msg: "Escribe el motivo: queda en el historial." };
  return tx(async (c) => {
    const a = (await c.query<{ status: string; sha256: string; title: Bi }>(`select status, sha256, title from help_articles where slug = $1 for update`, [String(slug ?? "")])).rows[0];
    if (!a) return { ok: false, msg: "Ese artículo no existe." };
    if (a.status === "retired") return { ok: false, msg: "Ese artículo ya no está en el repo." };
    if (pausar && a.status === "paused") return { ok: false, msg: "Ya está pausado." };
    if (!pausar && a.status === "live") return { ok: false, msg: "Ya está en uso." };
    await c.query(pausar
      ? `update help_articles set status = 'paused', paused_reason = $2, paused_by = $3, paused_at = now(), updated_at = now() where slug = $1`
      : `update help_articles set status = 'live', paused_reason = null, paused_by = null, paused_at = null, updated_at = now() where slug = $1`,
      pausar ? [slug, m, s.id] : [slug]);
    await c.query(`insert into help_article_log (slug, sha256_old, sha256_new, action, by, reason) values ($1, $2, $2, $3, $4, $5)`, [slug, a.sha256, pausar ? "paused" : "resumed", s.id, m]);
    await auditar(c, { actor: s.id, action: pausar ? "ayuda.pausar" : "ayuda.volver", targetKind: "help_article", targetId: slug,
      before: { estado: pausar ? "en uso" : "pausado" }, after: { estado: pausar ? "pausado" : "en uso", artículo: a.title.es }, reason: m });
    return { ok: true };
  });
}
