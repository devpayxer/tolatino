import "server-only";
import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { auditar, type Staff } from "./admin";
import { ipCliente } from "./cuenta";
import { db, tx } from "./db";
import { ENTORNO } from "./entorno";
import { contexto } from "./eventos";

/* 9e · Las páginas legales (fase9-apertura.md §3.6 y §4 9e). ÚNICO lector y escritor de legal_pages, legal_page_log y legal_acceptances.
   EL REPO ES LA FUENTE: el texto viene de docs/legal/ (scripts/legal/indexar.mjs → legal_indexar); aquí nunca se escribe texto legal.
   - paginaPara(persona, clave): la versión vigente de la página general (us) y la adenda del estado de la persona (us-pa…). Vigente = lo publicado
     y en vigor; en el sandbox, mientras nada se publicó, la última versión viva (borrador o revisada), que la página marca como BORRADOR. La base
     decide (legal_vigente): en producción, solo lo publicado.
   - aceptar / aceptarEn: anota en legal_acceptances (solo inserción, una vez por persona, negocio y versión) lo que la persona vio y aceptó.
   - faltaAceptar(persona): Términos y Privacidad con una versión publicada que pide aceptar otra vez (force_accept) y que esta persona todavía
     no aceptó → la hoja «Aceptar los términos nuevos» en la próxima pantalla de inicio (nunca encima de una operación).
   - Super Admin › Textos y páginas › Páginas: versiones, diferencias, marcar la revisión del abogado, publicar con motivo (y pedir aceptar otra
     vez), retirar; aceptaciones por versión, solo cifras. En producción no se publica sin reviewed_by_counsel (aquí y en la base). */
type Bi = { es: string; en: string };
export const CLAVES_LEGALES = ["terminos", "privacidad", "cookies", "reglas", "verificamos", "votos", "seguridad", "ia", "dmca", "vivienda-justa", "accesibilidad"] as const;
export type ClaveLegal = (typeof CLAVES_LEGALES)[number];
/* Lo que se acepta (y lo único que puede pedir aceptar otra vez). */
export const ACEPTABLES = ["terminos", "privacidad"] as const;
export type Aceptable = (typeof ACEPTABLES)[number];
export const esClaveLegal = (k: string): k is ClaveLegal => (CLAVES_LEGALES as readonly string[]).includes(k);

export type EstadoLegal = "borrador" | "revisado" | "publicado" | "retirado";
export type VersionLegal = {
  id: string; key: ClaveLegal; jurisdiction: string; version: number; status: EstadoLegal; title: Bi; lead: Bi; body: Bi; summary: Bi;
  text_date: string; effective_at: string | null; reviewed_by_counsel: string | null; reviewed_at: string | null; force_accept: boolean;
};
export type PaginaLegal = { clave: ClaveLegal; estado: string; general: VersionLegal; adenda: VersionLegal | null };

const COLS = `id::text, key, jurisdiction, version, status, title, lead, body_md as body, summary_md as summary, text_date,
  to_char(effective_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as effective_at, reviewed_by_counsel, reviewed_at::text, force_accept`;

/* El estado de la persona: el que declaró o el de su ciudad; sin cuenta, el de la ciudad que está viendo; las cinco ciudades están en PA. */
export async function estadoDe(persona: { userId: string | null; ciudad?: string | null }): Promise<string> {
  const r = (await db().query<{ e: string | null }>(
    `select coalesce((select coalesce(u.legal_state, c.state) from users u left join cities c on c.id = u.home_city_id where u.id = $1::uuid),
                     (select state from cities where id = $2::text)) as e`, [persona.userId, persona.ciudad ?? null])).rows[0]?.e;
  return r && /^[A-Z]{2}$/.test(r) ? r : "PA";
}
const jurDe = (estado: string) => `us-${estado.toLowerCase()}`;

/* La página que ve esta persona: la general y la adenda de su estado (si hay). null = no hay nada que mostrar (en producción, nada publicado). */
export async function paginaPara(persona: { userId: string | null; ciudad?: string | null }, clave: ClaveLegal): Promise<PaginaLegal | null> {
  const estado = await estadoDe(persona);
  const r = (await db().query<VersionLegal>(
    `select ${COLS} from unnest(array['us', $2::text]) j, lateral legal_vigente($1::text, j) v where v.id is not null`, [clave, jurDe(estado)])).rows;
  const general = r.find((x) => x.jurisdiction === "us");
  if (!general) return null;
  return { clave, estado, general, adenda: r.find((x) => x.jurisdiction !== "us") ?? null };
}

/* Los títulos vigentes de todas las páginas (el pie de la web y la columna «Más en Legal»). */
export async function titulosLegales(): Promise<{ key: ClaveLegal; title: Bi }[]> {
  const r = (await db().query<{ key: ClaveLegal; title: Bi }>(
    `select v.key, v.title from unnest($1::text[]) k, lateral legal_vigente(k, 'us') v where v.id is not null`, [[...CLAVES_LEGALES]])).rows;
  return CLAVES_LEGALES.map((k) => r.find((x) => x.key === k)).filter((x): x is { key: ClaveLegal; title: Bi } => !!x);
}

export type Falta = { key: Aceptable; jurisdiction: string; version: number; title: Bi; summary: Bi };
/* Lo que esta persona tiene que volver a aceptar: la versión vigente de Términos o Privacidad (general o de su estado) cuando, desde lo último que
   aceptó, se publicó una versión con force_accept ya en vigor. */
export async function faltaAceptar(userId: string): Promise<Falta[]> {
  const estado = await estadoDe({ userId });
  return (await db().query<Falta>(
    `select v.key, v.jurisdiction, v.version, v.title, v.summary_md as summary
       from unnest($2::text[]) k cross join unnest(array['us', $3::text]) j, lateral legal_vigente(k, j) v
      where v.id is not null and v.status = 'publicado'
        and exists (select 1 from legal_pages f
                     where f.key = v.key and f.jurisdiction = v.jurisdiction and f.status = 'publicado' and f.force_accept
                       and f.version <= v.version and f.effective_at <= now()
                       and not exists (select 1 from legal_acceptances a where a.user_id = $1::uuid and a.page_key = f.key
                                          and a.jurisdiction = f.jurisdiction and a.version >= f.version))
      order by v.key, v.jurisdiction`, [userId, [...ACEPTABLES], jurDe(estado)])).rows;
}

/* ¿Le falta a esta persona aceptar la versión vigente de Términos y Privacidad? (la línea «Al enviar aceptas…» del primer pedido) */
export async function sinAceptarVigente(userId: string): Promise<boolean> {
  const estado = await estadoDe({ userId });
  return (await db().query(
    `select 1 from unnest($2::text[]) k cross join unnest(array['us', $3::text]) j, lateral legal_vigente(k, j) v
      where v.id is not null and not exists (select 1 from legal_acceptances a where a.user_id = $1::uuid and a.page_key = v.key
                                                and a.jurisdiction = v.jurisdiction and a.version >= v.version)
      limit 1`, [userId, [...ACEPTABLES], jurDe(estado)])).rowCount! > 0;
}

export type Via = "hoja" | "publica" | "primer_pedido";
type Contexto = { via: Via; businessId?: string | null; app?: string | null; ipHash?: string | null; versiones?: { key: string; jurisdiction: string; version: number }[] };

/* Quién acepta desde dónde: la app (rótulo TLApp) o la web, y la huella de la dirección (nunca la dirección). */
export async function contextoAceptar(): Promise<{ app: string; ipHash: string | null }> {
  // La app sale del contexto de la analítica (el rótulo TLApp, solo para anotar desde dónde; nunca decide nada).
  const [ctx, ip] = await Promise.all([contexto(), ipCliente()]);
  return { app: ctx.app ?? "web", ipHash: ip ? createHash("sha256").update(`ip:${ip}`).digest("hex") : null };
}

/* Anota lo aceptado, dentro de la transacción de quien llama (Publica tu negocio la usa en la suya). La versión es la vigente de cada página
   (general y la del estado); con `versiones` (la hoja), solo si sigue siendo la que la persona vio: si cambió mientras leía, no anota nada.
   Una vez por persona, negocio y versión (la base). Devuelve cuántas filas nuevas. */
export async function aceptarEn(c: PoolClient, userId: string, claves: readonly Aceptable[], x: Contexto): Promise<number> {
  const estado = await estadoDe({ userId });
  const app = ["web", "cliente", "negocio", "delivery", "checkin"].includes(x.app ?? "") ? x.app : "web";
  const vistas = x.versiones ? JSON.stringify(x.versiones.map((v) => ({ key: String(v.key), jurisdiction: String(v.jurisdiction), version: Number(v.version) }))) : null;
  const r = await c.query(
    `insert into legal_acceptances (user_id, business_id, page_key, jurisdiction, version, via, app, ip_hash)
     select $1::uuid, $2::text, v.key, v.jurisdiction, v.version, $5::text, $6::text, $7::text
       from unnest($3::text[]) k cross join unnest(array['us', $4::text]) j, lateral legal_vigente(k, j) v
      where v.id is not null
        and ($8::jsonb is null or exists (select 1 from jsonb_to_recordset($8::jsonb) as s(key text, jurisdiction text, version int)
                                          where s.key = v.key and s.jurisdiction = v.jurisdiction and s.version = v.version))
     on conflict do nothing`,
    [userId, x.businessId ?? null, [...claves], jurDe(estado), x.via, app, x.ipHash ?? null, vistas]);
  return r.rowCount ?? 0;
}
export async function aceptar(userId: string, claves: readonly Aceptable[], x: Contexto): Promise<number> {
  return tx((c) => aceptarEn(c, userId, claves, x));
}

/* ── Super Admin › Textos y páginas › Páginas ── */
export type FilaPaginaAdm = { key: ClaveLegal; jurisdiction: string; title: Bi; ultima: number; estado: EstadoLegal; vigente: number | null; vigenteDesde: string | null;
  forzar: boolean; revisada: string | null; aceptaciones: number };
export type DatosPaginasAdm = { filas: FilaPaginaAdm[]; kpi: { publicadas: number; borradores: number; revisadas: number; aceptaciones: number; produccion: boolean } };
export async function paginasAdmin(): Promise<DatosPaginasAdm> {
  const filas = (await db().query<FilaPaginaAdm>(
    `with u as (select distinct on (key, jurisdiction) key, jurisdiction, title, version, status, reviewed_by_counsel
                  from legal_pages order by key, jurisdiction, version desc),
          p as (select distinct on (key, jurisdiction) key, jurisdiction, version, effective_at, force_accept
                  from legal_pages where status = 'publicado' and effective_at <= now() order by key, jurisdiction, version desc),
          a as (select page_key, jurisdiction, count(*)::int as n from legal_acceptances group by page_key, jurisdiction)
     select u.key, u.jurisdiction, u.title, u.version as ultima, u.status as estado, p.version as vigente,
            to_char(p.effective_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as "vigenteDesde", coalesce(p.force_accept, false) as forzar,
            u.reviewed_by_counsel as revisada, coalesce(a.n, 0) as aceptaciones
       from u left join p using (key, jurisdiction) left join a on a.page_key = u.key and a.jurisdiction = u.jurisdiction
      order by array_position($1::text[], u.key), u.jurisdiction`, [[...CLAVES_LEGALES]])).rows;
  const k = (await db().query<{ publicadas: number; borradores: number; revisadas: number; aceptaciones: number }>(
    `select count(*) filter (where status = 'publicado')::int as publicadas, count(*) filter (where status = 'borrador')::int as borradores,
            count(*) filter (where status = 'revisado')::int as revisadas, (select count(*)::int from legal_acceptances) as aceptaciones from legal_pages`)).rows[0]!;
  const prod = (await db().query<{ e: string }>(`select legal_entorno() as e`)).rows[0]?.e !== "pruebas" || ENTORNO === "produccion";
  return { filas, kpi: { ...k, produccion: prod } };
}

export type VersionAdm = { id: string; version: number; status: EstadoLegal; title: Bi; summary: Bi; text_date: string; sha: string; source_path: string;
  reviewed_by_counsel: string | null; reviewed_at: string | null; revisoQuien: string | null; publicada: string | null; publicoQuien: string | null;
  publish_reason: string | null; effective_at: string | null; force_accept: boolean; retired_at: string | null; created_at: string; aceptaciones: number };
export type LogLegal = { version: number; action: string; quien: string | null; reason: string | null; at: string };
export async function versionesAdmin(key: ClaveLegal, jur: string): Promise<{ versiones: VersionAdm[]; log: LogLegal[] }> {
  const T = (c: string) => `to_char(${c} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;
  const versiones = (await db().query<VersionAdm>(
    `select p.id::text, p.version, p.status, p.title, p.summary_md as summary, p.text_date, left(p.sha256, 12) as sha, p.source_path,
            p.reviewed_by_counsel, p.reviewed_at::text, nullif(concat_ws(' ', r.first_name, r.last_name), '') as "revisoQuien",
            ${T("p.published_at")} as publicada, nullif(concat_ws(' ', q.first_name, q.last_name), '') as "publicoQuien", p.publish_reason,
            ${T("p.effective_at")} as effective_at, p.force_accept, ${T("p.retired_at")} as retired_at, ${T("p.created_at")} as created_at,
            (select count(*)::int from legal_acceptances a where a.page_key = p.key and a.jurisdiction = p.jurisdiction and a.version = p.version) as aceptaciones
       from legal_pages p left join users r on r.id = p.reviewed_by left join users q on q.id = p.published_by
      where p.key = $1::text and p.jurisdiction = $2::text order by p.version desc limit 50`, [key, jur])).rows;
  const log = (await db().query<LogLegal>(
    `select p.version, l.action, nullif(concat_ws(' ', u.first_name, u.last_name), '') as quien, l.reason, ${T("l.at")} as at
       from legal_page_log l join legal_pages p on p.id = l.page_id left join users u on u.id = l.by
      where p.key = $1::text and p.jurisdiction = $2::text order by l.at desc, l.id desc limit 50`, [key, jur])).rows;
  return { versiones, log };
}

/* Las diferencias entre dos versiones (por renglón, en un idioma): «=» igual, «+» nuevo, «-» quitado. Solo lectura. */
export type Renglon = { t: "=" | "+" | "-"; l: string };
export async function diferencias(idA: string, idB: string, lang: "es" | "en"): Promise<Renglon[] | null> {
  const r = (await db().query<{ id: string; body: string; key: string; jurisdiction: string }>(
    `select id::text, body_md->>$3::text as body, key, jurisdiction from legal_pages where id = any(array[$1::bigint, $2::bigint])`, [idA, idB, lang])).rows;
  const a = r.find((x) => x.id === idA), b = r.find((x) => x.id === idB);
  if (!a || !b || a.key !== b.key || a.jurisdiction !== b.jurisdiction) return null;
  return diff(a.body.split("\n"), b.body.split("\n"));
}
/* LCS por renglones (las páginas son cortas: ≤ unos cientos de renglones). */
function diff(x: string[], y: string[]): Renglon[] {
  const n = Math.min(x.length, 800), m = Math.min(y.length, 800), L: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i]![j] = x[i] === y[j] ? L[i + 1]![j + 1]! + 1 : Math.max(L[i + 1]![j]!, L[i]![j + 1]!);
  const out: Renglon[] = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (x[i] === y[j]) { out.push({ t: "=", l: x[i]! }); i++; j++; }
    else if (L[i + 1]![j]! >= L[i]![j + 1]!) out.push({ t: "-", l: x[i++]! });
    else out.push({ t: "+", l: y[j++]! });
  }
  while (i < n) out.push({ t: "-", l: x[i++]! });
  while (j < m) out.push({ t: "+", l: y[j++]! });
  return out;
}

type Res = { ok: true } | { ok: false; msg: string };
const limpio = (s: unknown, n: number) => String(s ?? "").replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").replace(/\s+/g, " ").trim().slice(0, n);
const DIA = /^\d{4}-\d{2}-\d{2}$/;

/* Marcar la revisión del abogado (cms:editar): el despacho y la fecha de la revisión, con el motivo. Una vez por versión. */
export async function marcarRevisada(s: Staff, id: string, despacho: string, fecha: string, motivo: string): Promise<Res> {
  const d = limpio(despacho, 200), m = limpio(motivo, 500), f = String(fecha ?? "");
  if (d.length < 3) return { ok: false, msg: "Escribe el nombre del despacho que la revisó." };
  if (!DIA.test(f) || Number.isNaN(Date.parse(f)) || Date.parse(f) > Date.now() + 864e5) return { ok: false, msg: "La fecha de la revisión no es válida." };
  if (m.length < 3) return { ok: false, msg: "Escribe el motivo: queda en el historial." };
  return tx(async (c) => {
    const v = (await c.query<{ status: string; key: string; jurisdiction: string; version: number; reviewed_by_counsel: string | null }>(
      `select status, key, jurisdiction, version, reviewed_by_counsel from legal_pages where id = $1::bigint for update`, [id])).rows[0];
    if (!v) return { ok: false, msg: "Esa versión no existe." };
    if (v.status !== "borrador" || v.reviewed_by_counsel) return { ok: false, msg: "Solo se marca la revisión de un borrador." };
    await c.query(`update legal_pages set status = 'revisado', reviewed_by_counsel = $2, reviewed_at = $3::date, reviewed_by = $4::uuid where id = $1::bigint`, [id, d, f, s.id]);
    await c.query(`insert into legal_page_log (page_id, action, by, reason) values ($1::bigint, 'revisada', $2::uuid, $3::text)`, [id, s.id, `${d} · ${f} · ${m}`]);
    await auditar(c, { actor: s.id, action: "legal.revisar", targetKind: "legal_page", targetId: `${v.key}/${v.jurisdiction}/v${v.version}`,
      before: { estado: "borrador" }, after: { estado: "revisada por el abogado", despacho: d, fecha: f }, reason: m });
    return { ok: true };
  });
}

/* Publicar una versión (cms:aprobar), con su motivo y, para Términos y Privacidad, si pide aceptar otra vez. En producción, solo revisada por el
   abogado (aquí y en la base: legalRevisado). Nunca una versión más vieja que la publicada. */
export async function publicarLegal(s: Staff, id: string, motivo: string, forzar: boolean): Promise<Res> {
  const m = limpio(motivo, 500);
  if (m.length < 3) return { ok: false, msg: "Escribe el motivo: queda en el historial." };
  try {
    return await tx(async (c) => {
      const v = (await c.query<{ status: string; key: string; jurisdiction: string; version: number; reviewed_by_counsel: string | null }>(
        `select status, key, jurisdiction, version, reviewed_by_counsel from legal_pages where id = $1::bigint for update`, [id])).rows[0];
      if (!v) return { ok: false, msg: "Esa versión no existe." };
      if (v.status !== "borrador" && v.status !== "revisado") return { ok: false, msg: "Esa versión ya se publicó o se retiró." };
      if (ENTORNO === "produccion" && !v.reviewed_by_counsel) return { ok: false, msg: "En producción, una página legal se publica solo revisada por el abogado." };
      if (forzar && !(ACEPTABLES as readonly string[]).includes(v.key)) return { ok: false, msg: "Solo Términos y Privacidad piden aceptar otra vez." };
      const mas = (await c.query(`select 1 from legal_pages where key = $1::text and jurisdiction = $2::text and status = 'publicado' and version > $3::int`, [v.key, v.jurisdiction, v.version])).rowCount;
      if (mas) return { ok: false, msg: "Ya hay una versión más nueva publicada." };
      await c.query(`update legal_pages set status = 'publicado', published_by = $2::uuid, published_at = now(), publish_reason = $3::text, effective_at = now(), force_accept = $4::boolean
                      where id = $1::bigint`, [id, s.id, m, forzar]);
      await c.query(`insert into legal_page_log (page_id, action, by, reason) values ($1::bigint, 'publicada', $2::uuid, $3::text)`, [id, s.id, forzar ? `${m} · pide aceptar otra vez` : m]);
      await auditar(c, { actor: s.id, action: "legal.publicar", targetKind: "legal_page", targetId: `${v.key}/${v.jurisdiction}/v${v.version}`,
        before: { estado: v.status === "revisado" ? "revisada" : "borrador" }, after: { estado: "publicada", "pide aceptar otra vez": forzar ? "sí" : "no", "revisada por": v.reviewed_by_counsel ?? "sin revisión del abogado" }, reason: m });
      return { ok: true };
    });
  } catch (e) {
    if (/legal_revisado/.test(String((e as Error).message))) return { ok: false, msg: "En producción, una página legal se publica solo revisada por el abogado." };
    throw e;
  }
}

/* Retirar una versión (cms:aprobar), con su motivo. Si era la publicada, vuelve a verse la publicada anterior (o el aviso de «en revisión»). */
export async function retirarLegal(s: Staff, id: string, motivo: string): Promise<Res> {
  const m = limpio(motivo, 500);
  if (m.length < 3) return { ok: false, msg: "Escribe el motivo: queda en el historial." };
  return tx(async (c) => {
    const v = (await c.query<{ status: string; key: string; jurisdiction: string; version: number }>(
      `select status, key, jurisdiction, version from legal_pages where id = $1::bigint for update`, [id])).rows[0];
    if (!v) return { ok: false, msg: "Esa versión no existe." };
    if (v.status === "retirado") return { ok: false, msg: "Ya está retirada." };
    await c.query(`update legal_pages set status = 'retirado' where id = $1::bigint`, [id]);
    await c.query(`insert into legal_page_log (page_id, action, by, reason) values ($1::bigint, 'retirada', $2::uuid, $3::text)`, [id, s.id, m]);
    await auditar(c, { actor: s.id, action: "legal.retirar", targetKind: "legal_page", targetId: `${v.key}/${v.jurisdiction}/v${v.version}`,
      before: { estado: v.status === "publicado" ? "publicada" : v.status === "revisado" ? "revisada" : "borrador" }, after: { estado: "retirada" }, reason: m });
    return { ok: true };
  });
}
