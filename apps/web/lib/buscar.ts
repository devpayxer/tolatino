import "server-only";
import { db } from "./db";
import { CTE, COLUMNAS, DESDE, FOTO, conFoto, POR_PAGINA, type Resultado } from "./categoria";
import type { Punto } from "./punto";
import { slugCat } from "./directorio";
import type { Lang } from "./idioma";
import DATOS from "./busqueda-datos.json";

/* Motor de Buscar (APP-BUSCAR), en el servidor. Es el del prototipo (search-engine.js) llevado a Postgres:
   1) entender: frases → «intenciones» (abierto ahora, con delivery, que acepte Medicaid…), palabras sin las vacías,
      plural → singular y sinónimos (tabla `synonyms`, editable por el admin);
   2) tolerar errores: cada palabra de 5+ letras que no existe se corrige con el vocabulario (trigramas);
   3) buscar: cada palabra (o su sinónimo) tiene que aparecer en el documento del negocio (nombre > subcategoría y
      categoría > sobre nosotros > tarjeta); si nada encaja con todas, se muestran los que encajan con alguna («parcial»).
   El servidor decide todo; la pantalla solo pinta. */

export const N = (s: string) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const W = (n: string) => n.split(/[^a-z0-9]+/).filter(Boolean);
const STOP = new Set<string>(DATOS.vacias);
const INT = new Map(DATOS.intenciones.map((i) => [i.key, i]));
const stem = (w: string) => (w.length > 5 && w.endsWith("es") ? w.slice(0, -2) : w.length > 4 && w.endsWith("s") ? w.slice(0, -1) : w);

type Dic = { syn: Map<string, string[]>; frases: [string, string][]; intenciones: [string, string][] };
let cache: { at: number; dic: Dic } | null = null;
/* Sinónimos, frases e intenciones activos (60 s en memoria: cambian solo cuando el admin los edita). */
async function diccionario(): Promise<Dic> {
  if (cache && Date.now() - cache.at < 60_000) return cache.dic;
  const r = await db().query<{ term: string; kind: string; target: string }>(
    `select lower(term) as term, target_kind as kind, lower(target) as target from synonyms where active and target_kind in ('query', 'filter')`);
  const syn = new Map<string, string[]>(), frases: [string, string][] = [], intenciones: [string, string][] = [];
  // Solo letras, números y espacios: lo que guarde el admin nunca puede romper la consulta de texto.
  const limpio = (v: string) => N(v).replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
  for (const x of r.rows) {
    const t = limpio(x.term);
    if (!t) continue;
    if (x.kind === "filter") intenciones.push([t, x.target]);
    else if (t.includes(" ")) frases.push([t, limpio(x.target)]);
    else if (limpio(x.target)) syn.set(t, [...(syn.get(t) ?? []), limpio(x.target)]);
  }
  intenciones.sort((a, b) => b[0].length - a[0].length);
  cache = { at: Date.now(), dic: { syn, frases, intenciones } };
  return cache.dic;
}

export type Grupo = { w: string; a: string[]; corregida?: string };
export type Entendido = { intenciones: { k: string; frase: string; label: { es: string; en: string }; tipo: string }[]; grupos: Grupo[]; palabras: string[] };

/* Entender la búsqueda. `vivo` = mientras se escribe: la última palabra cuenta como prefijo. */
export async function entender(q: string, vivo = false): Promise<Entendido> {
  const D = await diccionario();
  let n = ` ${N(q).replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim()} `;
  for (const [a, b] of D.frases) n = n.split(` ${a} `).join(` ${b} `);
  const intenciones: Entendido["intenciones"] = [];
  for (const [frase, k] of D.intenciones) {
    const pat = ` ${frase} `;
    let i = n.indexOf(pat);
    while (i >= 0) {
      const it = INT.get(k);
      if (it && !intenciones.some((x) => x.k === k)) intenciones.push({ k, frase, label: it.label, tipo: it.tipo });
      n = n.slice(0, i + 1) + n.slice(i + pat.length);
      i = n.indexOf(pat);
    }
  }
  const palabras = W(n).filter((w) => !STOP.has(w)).slice(0, 8);
  const grupos: Grupo[] = palabras.map((w) => {
    const s = stem(w), a = s !== w ? [w, s] : [w];
    for (const x of D.syn.get(w) ?? D.syn.get(s) ?? []) if (!a.includes(x)) a.push(x);
    return { w, a };
  });
  // Errores de escritura: palabra de 5+ letras que no es prefijo de nada del vocabulario → la más parecida.
  const dudosas = grupos.filter((g) => g.w.length >= 5);
  if (dudosas.length) {
    const r = await db().query<{ w: string; pre: string | null; fix: string | null }>(
      `select w, (select word from search_vocab v where v.word like w || '%' limit 1) as pre,
              (select word from search_vocab v where v.word % w and similarity(v.word, w) >= 0.4 order by similarity(v.word, w) desc limit 1) as fix
         from unnest($1::text[]) w`, [dudosas.map((g) => g.w)]);
    for (const x of r.rows) {
      const g = grupos.find((y) => y.w === x.w);
      if (g && !x.pre && x.fix && !g.a.includes(x.fix)) { g.a.push(x.fix); g.corregida = x.fix; }
    }
  }
  return { intenciones, grupos, palabras };
}

/* Una palabra → término de tsquery (todo ya viene normalizado a [a-z0-9]). */
const termino = (a: string, prefijo: boolean) => {
  const t = a.split(" ").filter(Boolean);
  if (t.length > 1) return `(${t.map((x, i) => (i === t.length - 1 ? `${x}:*` : x)).join(" <-> ")})`;
  if (a.length <= 2) return a;
  return prefijo || a.length >= 5 ? `${a}:*` : `(${a} | ${a}s | ${a}es)`;
};
export const tsq = (grupos: Grupo[], y: boolean, vivo = false) =>
  grupos.map((g, i) => `(${g.a.map((a) => termino(a, vivo && i === grupos.length - 1)).join(" | ")})`).join(y ? " & " : " | ");

/* Intenciones que filtran negocios (prototipo BZ). */
const FILTRO: Record<string, string> = {
  open: `negocio_abierto(b.id, t.t)`,
  near: `(b.geo is not null and st_dwithin(b.geo, c.center, 1609.34))`,
  ver: `s.verified`,
  dlv: `b.filter_values && array['delivery','envio']`,
  pk: `b.filter_values @> array['pickup']`,
  walk: `b.filter_values && array['walkin','walk']`,
  casa: `(b.filter_values && array['domicilio'] or b.works_from_home)`,
  h24: `b.filter_values && array['h24','24h']`,
  // «Habla español»: solo filtra en categorías donde algún negocio lo marca (en las demás, todos lo hablan).
  esp: `(b.filter_values && array['esp','medesp'] or not exists (select 1 from businesses x where x.category_id = b.category_id and x.filter_values && array['esp','medesp']))`,
  medicaid: `b.filter_values @> array['medicaid']`,
  medicare: `b.filter_values @> array['medicare']`,
  chip: `b.filter_values @> array['chip']`,
  sinseg: `b.filter_values && array['sinseguro','escala']`,
  sinssn: `b.filter_values && array['sinssn','itin']`,
  free: `b.filter_values && array['gratis','sincover','gratis1','diagfree','presfree']`,
};

export type Opciones = { punto: Punto; cat?: string | null; quitar?: string[]; orden?: "rel" | "near" | "best"; pagina?: number; limite?: number; vivo?: boolean };
export type Hallado = Resultado & { score: number };

/* Negocios que encajan. Pro primero; dentro, por puntaje (o distancia / calificación). */
export async function negocios(E: Entendido, o: Opciones): Promise<{ items: Hallado[]; total: number; parcial: boolean }> {
  const filtros = E.intenciones.filter((i) => FILTRO[i.k] && !(o.quitar ?? []).includes(i.k)).map((i) => FILTRO[i.k]!);
  const orden = o.orden ?? (E.intenciones.some((i) => i.k === "best") ? "best" : "rel");
  const ord = orden === "near" ? "mi asc nulls last" : orden === "best" ? "(case when reviews >= 5 then rating else 0 end) desc, reviews desc" : "score_q desc";
  const limite = o.limite ?? POR_PAGINA, off = Math.max(0, Math.min(o.pagina ?? 0, 99)) * limite;
  const correr = async (y: boolean) => {
    const params: unknown[] = [o.punto.ciudad];
    const add = (v: unknown) => { params.push(v); return `$${params.length}`; };
    const conTexto = E.grupos.length > 0;
    const q = conTexto ? add(tsq(E.grupos, y, o.vivo)) : null;
    const pre = conTexto ? add(`${E.grupos[0]!.w}%`) : null;
    const w = [...filtros, ...(o.cat ? [`b.category_id = ${add(o.cat)}`] : []), ...(q ? [`b.search_doc @@ to_tsquery('simple', ${q})`] : [])];
    const score = q
      ? `ts_rank('{0.15, 0.3, 0.7, 1.0}', b.search_doc, to_tsquery('simple', ${q}), 1) * 100 + (case when lower(unaccent(b.name)) like ${pre} then 3 else 0 end) + (case when negocio_abierto(b.id, t.t) then 0.5 else 0 end)`
      : `1 + (case when negocio_abierto(b.id, t.t) then 0.5 else 0 end)`;
    const r = await db().query<Hallado & { total: string; score_q: number }>(
      `${CTE(o.punto)}, base as (select ${COLUMNAS}, ${score} as score_q ${DESDE}${w.length ? " and " + w.join(" and ") : ""})
       select base.*, count(*) over () as total, ${FOTO("base")} from base
        order by pro desc, ${ord}, id limit ${limite} offset ${off}`, params);
    return { items: r.rows.map(({ total: _t, score_q, ...x }) => conFoto({ ...x, score: Number(score_q) }) as Hallado), total: Number(r.rows[0]?.total ?? 0) };
  };
  if (!E.grupos.length && !filtros.length) return { items: [], total: 0, parcial: false };
  const a = await correr(true);
  if (a.total || E.grupos.length < 2) return { ...a, parcial: false };
  const b = await correr(false);
  return { ...b, total: Math.min(b.total, 20), parcial: b.total > 0 };
}

/* ¿Encaja la palabra con un texto? 2 = sí, 1 = casi (un error de letra), 0 = no (prototipo m()). */
const lev = (a: string, b: string) => {
  const m = a.length, n = b.length, d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)] as number[]);
  for (let j = 1; j <= n; j++) d[0]![j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m]![n]!;
};
export function encaja(g: Grupo, texto: string, vivo = false): 0 | 1 | 2 {
  const n = N(texto), w = W(n);
  if (!w.length) return 0;
  for (const a of g.a) {
    if (a.includes(" ")) { if (` ${n.replace(/[^a-z0-9]+/g, " ")} `.includes(` ${a}`)) return 2; }
    else if (a.length <= 2 ? w.includes(a) : a.length >= 5 || vivo ? w.some((x) => x.startsWith(a)) : w.some((x) => x === a || x === `${a}s` || x === `${a}es`)) return 2;
  }
  const a = g.w;
  if (a.length >= 5 && w.some((x) => x.length >= a.length - 1 && (lev(x.slice(0, a.length), a) <= 1 || lev(x, a) <= 1))) return 1;
  return 0;
}

/* Resalta la parte que encajó: [antes, resaltado, después] (prototipo hl). */
export function resaltar(orig: string, grupos: Grupo[]): [string, string, string] {
  const n = N(orig);
  let best: [number, number] | null = null;
  for (const g of grupos) for (const a of g.a) {
    let i = -1, from = 0;
    while ((i = n.indexOf(a, from)) >= 0) { if (i === 0 || !/[a-z0-9]/.test(n[i - 1]!)) break; from = i + 1; }
    if (i >= 0 && (!best || a.length > best[1])) best = [i, a.length];
  }
  return best ? [orig.slice(0, best[0]), orig.slice(best[0], best[0] + best[1]), orig.slice(best[0] + best[1])] : [orig, "", ""];
}

type Sub = { id: string; cat: string; es: string; en: string; n: number; catEs: string; catEn: string; catCorto: string; catCortoEn: string; icon: string; foto: string | null };
let subsCache: { at: number; ciudad: string; subs: Sub[] } | null = null;
/* Subcategorías con cuántos negocios activos tienen en la ciudad (60 s en memoria). */
async function subcategorias(ciudad: string): Promise<Sub[]> {
  if (subsCache && subsCache.ciudad === ciudad && Date.now() - subsCache.at < 60_000) return subsCache.subs;
  const r = await db().query<Sub>(
    `with n as (select unnest(subcategory_ids) as id, count(*)::int as n from businesses where city_id = $1 and status = 'active' group by 1)
     select s.id, s.category_id as cat, s.name->>'es' as es, s.name->>'en' as en, coalesce(n.n, 0) as n,
            c.name->>'es' as "catEs", c.name->>'en' as "catEn", c.short->>'es' as "catCorto", c.short->>'en' as "catCortoEn", c.icon,
            (select x.photo from jsonb_to_recordset(c.page->'rows'->0->'items') as x(match jsonb, photo text) where x.match->'subs' ? s.id limit 1) as foto
       from subcategories s join categories c on c.id = s.category_id and c.status = 'on' left join n on n.id = s.id
      where s.status = 'on'`, [ciudad]);
  subsCache = { at: Date.now(), ciudad, subs: r.rows };
  return r.rows;
}

/* Subcategorías y categorías que encajan con TODAS las palabras (prototipo: subs, cats, emptySubs). */
export async function sugerirCatalogo(E: Entendido, ciudad: string, cat?: string | null) {
  if (!E.grupos.length) return { subs: [] as (Sub & { score: number })[], vacias: [] as (Sub & { score: number })[], cats: [] as Sub[] };
  const todas = (await subcategorias(ciudad)).filter((s) => !cat || s.cat === cat);
  const subs: (Sub & { score: number })[] = [];
  for (const s of todas) {
    let propias = 0, ok = true, inicio = 0;
    E.grupos.forEach((g, gi) => {
      if (encaja(g, `${s.es} ${s.en}`) === 2) { propias++; if (gi === 0 && g.a.some((a) => N(s.es).startsWith(a))) inicio = 5; }
      else if (!encaja(g, `${s.catEs} ${s.catEn} ${s.catCorto}`)) ok = false;
    });
    if (ok && propias) subs.push({ ...s, score: propias * 10 + inicio + Math.min(s.n, 20) / 10 });
  }
  subs.sort((a, b) => b.score - a.score);
  const catsVistas = new Map<string, Sub>();
  for (const s of todas) if (!catsVistas.has(s.cat)) catsVistas.set(s.cat, s);
  const cats = [...catsVistas.values()].filter((c) => E.grupos.every((g) => encaja(g, `${c.catEs} ${c.catEn} ${c.catCorto} ${c.catCortoEn}`) === 2));
  return { subs: subs.filter((s) => s.n > 0), vacias: subs.filter((s) => s.n === 0), cats };
}

/* Categoría dominante: la que reúne la mitad o más del peso de lo encontrado (para el «Entendimos» y la portada). */
export function dominante(items: Hallado[], subs: { cat: string }[], vacias: { cat: string; score: number }[], cats: { cat: string }[], primeraVaciaGana: boolean) {
  const t: Record<string, number> = {};
  items.slice(0, 12).forEach((x) => { t[x.cat] = (t[x.cat] ?? 0) + x.score; });
  subs.slice(0, 2).forEach((x) => { t[x.cat] = (t[x.cat] ?? 0) + 30; });
  if (primeraVaciaGana && vacias[0]) t[vacias[0].cat] = (t[vacias[0].cat] ?? 0) + 80;
  cats.forEach((c) => { t[c.cat] = (t[c.cat] ?? 0) + 40; });
  const suma = Object.values(t).reduce((a, b) => a + b, 0);
  let dom: string | null = null;
  for (const k of Object.keys(t)) if (t[k]! / suma >= 0.5 && (!dom || t[k]! > t[dom]!)) dom = k;
  return dom;
}

/* Lo más buscado en la ciudad en los últimos 7 días (de búsquedas reales con resultados). */
export async function tendencias(ciudad: string, lang: Lang) {
  const r = await db().query<{ q: string; veces: number; cat: string | null }>(
    `select min(query) as q, count(*)::int as veces, mode() within group (order by understood->>'cat') as cat
       from search_logs where city_id = $1 and at > now() - interval '7 days' and results > 0 and char_length(query) between 2 and 60
      group by lower(unaccent(query)) having count(*) >= 2 order by veces desc limit 8`, [ciudad]);
  const cats = r.rows.length ? (await db().query<{ id: string; c: string }>(`select id, short->>$1 as c from categories`, [lang])).rows : [];
  return r.rows.map((x) => ({ q: x.q, cat: cats.find((c) => c.id === x.cat)?.c ?? null }));
}

/* Registro de la búsqueda (SearchLog): alimenta tendencias y «búsquedas sin oferta» del admin. */
export async function registrar(ciudad: string, userId: string | null, q: string, E: Entendido, cat: string | null, resultados: number) {
  await db().query(
    `insert into search_logs (city_id, user_id, query, understood, results) values ($1, $2, left($3, 120), $4::jsonb, $5)`,
    [ciudad, userId, q, JSON.stringify({ palabras: E.palabras, intenciones: E.intenciones.map((i) => i.k), cat }), resultados]);
}

export const ejemplos = DATOS.ejemplos;
export const slugDe = (cortoEs: string) => slugCat(cortoEs);
