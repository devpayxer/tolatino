import "server-only";
import type { Pool, PoolClient } from "pg";
import { db } from "./db";
import { etaNoche, filaTexto, FILA_VIVA_MIN, hNoche, LISTA_HORAS, MUSICA, POR_FECHA, type Bi, type EstaNoche, type FilaNoche, type HerrNoche, type KindNoche, type NocheDia, type NocheIn } from "./noche-comun";
export type { NocheIn } from "./noche-comun";

/* Noche (Fase 4 · bloque 4na). Plan: docs/diseno/plan/fase4-noche.md §2, §4na y §5. Diseño: neg-noche.js (nt), neg-noche-kind.js
   (KS), dash2-cat.js blocksC L387–396 (Tu herramienta «Esta noche»), apply L283–286 (lo que sale en la tarjeta y en Buscar).
   - «La noche» es la fecha de la tarde en que abre: lo que pasa antes de las 6 AM es de la noche anterior (nocheDe).
   - Cada toque de la herramienta se guarda en noche_settings Y deja su fila en night_posts (solo inserción) en la misma
     transacción: la Ayuda mira el cover que el local publicó esa noche a esa hora (guardián coverConHistoria).
   - La tarjeta (attrs.nt, attrs.tarjeta.eta/fee) y los filtros de Buscar se derivan de aquí; nunca se editan a mano. El barrido
     los recalcula cuando cambia la noche o la fila deja de ser «ahora» (60 min; guardián filaNoFalsa). */
type Q = Pool | PoolClient;
const KS: [string, KindNoche][] = [["DJ de discoteca", "dj"], ["Promotor de eventos nocturnos", "promo"], ["Local para fiestas privadas", "salon"], ["Comedia y espectáculos", "show"], ["Sala de conciertos", "show"],
  ["Karaoke", "karaoke"], ["Billar", "billar"], ["Bar de juegos", "billar"], ["Cervecería", "cerve"], ["Bar deportivo", "sport"], ["Noche urbana", "urbano"], ["After-hours", "urbano"],
  ["Noche de banda y norteño", "banda"], ["Cantina", "banda"], ["Club de salsa y bachata", "salsa"], ["Local de música en vivo", "salsa"], ["Discoteca", "club"], ["Lounge", "lounge"],
  ["Salón de hookah", "lounge"], ["Coctelería", "lounge"], ["Bar de vinos", "lounge"], ["Terraza", "lounge"], ["Bar", "bar"]];
/* La fecha de la noche de un instante en la zona de la ciudad (corte a las 6 AM). En SQL: */
export const NOCHE_SQL = (ts: string, tz: string) => `((${ts} at time zone ${tz}) - interval '6 hours')::date`;

export async function kindNoche(negocio: string, c: Q = db()): Promise<{ kind: KindNoche; forzado: boolean } | null> {
  const r = (await c.query<{ cat: string; ov: KindNoche | null; subs: string[] }>(
    `select b.category_id as cat, s.kind_override as ov,
            coalesce((select array_agg(sc.name->>'es' order by array_position(b.subcategory_ids, sc.id)) from subcategorias_vivas sc where sc.id = any(b.subcategory_ids)), '{}') as subs
       from businesses b left join noche_settings s on s.business_id = b.id where b.id = $1`, [negocio])).rows[0];
  if (!r || r.cat !== "NEG-NOCHE") return null;
  if (r.ov) return { kind: r.ov, forzado: true };
  for (const n of r.subs) { const m = KS.find((x) => x[0] === n); if (m) return { kind: m[1], forzado: false }; }
  return { kind: "bar", forzado: false };
}

/* «08:00»/«02:00» → minutos desde las 12 PM de esa noche (cierre después de medianoche = +1440). */
function minNoche(hhmm: string, abre?: string): number {
  const [h, m] = hhmm.split(":").map(Number) as [number, number];
  let t = h * 60 + m - 720;
  if (abre != null) { const [ah, am] = abre.split(":").map(Number) as [number, number]; if (h * 60 + m <= ah * 60 + am) t += 1440; }
  return t;
}

export async function herramientaNoche(negocio: string, c: Q = db()): Promise<HerrNoche | null> {
  const k = await kindNoche(negocio, c);
  if (!k) return null;
  const s = (await c.query<{ tz: string; hoy: string; cover: number | null; after_min: number | null; after_cents: number | null; by_dow: Record<string, number> | null; edad: 18 | 21 | null;
    list_on: boolean | null; list_until: number | null; list_cap: number | null; line_min: number | null; line_at: string | null; viva: boolean; f_noche: string | null; f_dow: number | null; f_hora: number | null;
    music: string[] | null; music_note: Bi | null; dress: Bi | null }>(
    `select ci.timezone as tz, ${NOCHE_SQL("now()", "ci.timezone")}::text as hoy, s.cover_cents as cover, s.after_min, s.after_cents, s.cover_by_dow as by_dow, s.min_age as edad,
            s.list_on, s.list_until_min as list_until, s.list_cap, s.line_min, s.line_at::text, coalesce(s.line_at > now() - make_interval(mins => ${FILA_VIVA_MIN}), false) as viva,
            ${NOCHE_SQL("s.line_at", "ci.timezone")}::text as f_noche, extract(dow from ${NOCHE_SQL("s.line_at", "ci.timezone")})::int as f_dow,
            (extract(epoch from (s.line_at at time zone ci.timezone) - (${NOCHE_SQL("s.line_at", "ci.timezone")} + time '12:00')) / 60)::int as f_hora,
            s.music, s.music_note, s.dress
       from businesses b join cities ci on ci.id = b.city_id left join noche_settings s on s.business_id = b.id where b.id = $1`, [negocio])).rows[0]!;
  const H = (await c.query<{ fecha: string; dow: number; open: boolean | null; ranges: [string, string][] | null; hay: boolean }>(
    `select d::date::text as fecha, extract(dow from d)::int as dow, h.open, h.ranges, exists (select 1 from business_hours x where x.business_id = $1 and coalesce(x.module, '') = '') as hay
       from generate_series($2::date, $2::date + 6, interval '1 day') d
       left join business_hours h on h.business_id = $1 and coalesce(h.module, '') = '' and h.weekday = extract(dow from d)::int
      order by d`, [negocio, s.hoy])).rows;
  const cover = s.cover ?? 0, byDow = s.by_dow ?? {}, edad = s.edad ?? 21;
  const noches: NocheDia[] = H.map((x) => { const v = byDow[String(x.dow)]; return { fecha: x.fecha, dow: x.dow, abre: x.hay ? !!x.open && (x.ranges?.length ?? 0) > 0 : true, cover: v ?? cover, distinto: v != null && v !== cover }; });
  const i = noches.findIndex((n) => n.abre), n0 = i >= 0 ? noches[i]! : null, h0 = i >= 0 ? H[i]! : null;
  const rg = h0?.ranges?.length ? h0.ranges[h0.ranges.length - 1]! : null;
  const prox: EstaNoche | null = n0 ? { fecha: n0.fecha, dow: n0.dow, cuando: i === 0 ? "hoy" : i === 1 ? "manana" : "dia", cover: n0.cover,
    after: s.after_min != null && s.after_cents != null && s.after_cents > n0.cover ? { min: s.after_min, cents: s.after_cents } : null, edad,
    lista: s.list_on ? s.list_until : null, cierra: rg ? minNoche(rg[1], rg[0]) : null } : null;
  const anoche = (await c.query<{ d: string }>(`select ($1::date - 1)::text as d`, [s.hoy])).rows[0]!.d;
  const fila: FilaNoche | null = s.line_at && s.line_min != null ? { min: s.line_min, at: s.line_at, viva: s.viva, hoy: s.f_noche === s.hoy, anoche: s.f_noche === anoche, dow: s.f_dow ?? 0, hora: s.f_hora ?? 0 } : null;
  return { kind: k.kind, forzado: k.forzado, porFecha: POR_FECHA.includes(k.kind), cover, afterMin: s.after_min, afterCents: s.after_cents, byDow, edad,
    lista: !!s.list_on, listaHasta: s.list_until, listaTope: s.list_cap, fila, musica: s.music ?? [], musicaNota: s.music_note, vestimenta: s.dress,
    hoy: s.hoy, abreHoy: noches[0]?.abre ?? false, noches, prox };
}

/* Lo que el local publicó en una noche (la Ayuda y el Super Admin lo leen). */
export type PostNoche = { field: string; value: unknown; at: string; quien: string | null };
export async function historialNoche(negocio: string, noche: string | null, lim = 30, c: Q = db()): Promise<PostNoche[]> {
  return (await c.query<PostNoche>(
    `select p.field, p.value, p.at::text, coalesce(u.first_name, case when p.by is null then 'To''Latino' end) as quien
       from night_posts p left join users u on u.id = p.by
      where p.business_id = $1 and ($2::date is null or p.night = $2::date) order by p.at desc limit $3`, [negocio, noche, Math.min(200, Math.max(1, lim))])).rows;
}

/* Guardar «Esta noche» (valida AQUÍ; el panel solo manda lo que tocó). Cada campo que cambia deja su fila en night_posts. */
type Err = { ok: false; es: string; en: string };
const err = (es: string, en: string): Err => ({ ok: false, es, en });
const txt = (v: unknown, n: number) => (typeof v === "string" ? v.replace(/[\u0000-\u001F\u007F]/g, "").replace(/\s+/g, " ").trim().slice(0, n) : "");
const dinero = (v: unknown, hi: number) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= 0 && n <= hi && n % 100 === 0 ? n : null; };
export async function guardarNoche(c: PoolClient, negocio: string, p: NocheIn, actor: string | null): Promise<{ ok: true } | Err> {
  const b = (await c.query<{ city: string; tz: string; noche: string }>(
    `select b.city_id as city, ci.timezone as tz, ${NOCHE_SQL("now()", "ci.timezone")}::text as noche from businesses b join cities ci on ci.id = b.city_id where b.id = $1 and b.category_id = 'NEG-NOCHE'`, [negocio])).rows[0];
  if (!b) return err("Esto es para Vida Nocturna.", "This is for nightlife businesses.");
  await c.query(`insert into noche_settings (business_id, city_id, updated_by) values ($1, $2, $3) on conflict (business_id) do nothing`, [negocio, b.city, actor]);
  const s = (await c.query<{ cover: number; after_min: number | null; after_cents: number | null; by_dow: Record<string, number>; music: string[] }>(
    `select cover_cents as cover, after_min, after_cents, cover_by_dow as by_dow, music from noche_settings where business_id = $1 for update`, [negocio])).rows[0]!;
  const set: string[] = [], v: unknown[] = [negocio, actor], posts: [string, unknown][] = [];
  const add = (col: string, val: unknown) => { v.push(val); set.push(`${col} = $${v.length}`); };
  let cover = s.cover;
  if (p.cover !== undefined) {
    const n = dinero(p.cover, 10000); if (n == null) return err("El cover va de $0 a $100, en dólares enteros.", "The cover goes from $0 to $100, in whole dollars.");
    cover = n; add("cover_cents", n); posts.push(["cover", { cents: n }]);
    // «Después de cierta hora» solo si sube: si el cover lo alcanza, se quita (MEM 164).
    if (p.after === undefined && s.after_cents != null && s.after_cents <= n) { add("after_min", null); add("after_cents", null); posts.push(["after", null]); }
  }
  if (p.after !== undefined) {
    if (p.after === null) { add("after_min", null); add("after_cents", null); posts.push(["after", null]); }
    else {
      const m = Number(p.after.min), n = dinero(p.after.cents, 15000);
      if (![660, 720].includes(m) || n == null) return err("Elige después de qué hora sube.", "Pick after what time it goes up.");
      if (n <= cover) return err("«Después de» solo si sube: ponle más que el cover.", "“After” only if it goes up: set more than the cover.");
      add("after_min", m); add("after_cents", n); posts.push(["after", { min: m, cents: n }]);
    }
  }
  if (p.byDow !== undefined) {
    const d = Number(p.byDow.d); if (!(Number.isInteger(d) && d >= 0 && d <= 6)) return err("Ese día no existe.", "That day does not exist.");
    const nv = { ...s.by_dow };
    if (p.byDow.cents == null) delete nv[String(d)];
    else { const n = dinero(p.byDow.cents, 10000); if (n == null) return err("El cover va de $0 a $100, en dólares enteros.", "The cover goes from $0 to $100, in whole dollars."); nv[String(d)] = n; }
    add("cover_by_dow", JSON.stringify(nv)); set[set.length - 1] += "::jsonb"; posts.push(["by_dow", { d, cents: p.byDow.cents == null ? null : nv[String(d)] }]);
  }
  if (p.igual) { add("cover_by_dow", "{}"); set[set.length - 1] += "::jsonb"; posts.push(["by_dow", { igual: true }]); }
  if (p.edad !== undefined) { const n = Number(p.edad); if (n !== 18 && n !== 21) return err("La edad es 18+ o 21+.", "Age is 18+ or 21+."); add("min_age", n); posts.push(["age", n]); }
  if (p.lista !== undefined) {
    if (p.lista === null) { add("list_on", false); posts.push(["list", null]); }
    else { const m = Number(p.lista); if (!LISTA_HORAS.includes(m)) return err("La lista va de las 9 PM a la 1 AM.", "The list goes from 9 PM to 1 AM."); add("list_on", true); add("list_until_min", m); posts.push(["list", { until: m }]); }
  }
  if (p.tope !== undefined) { const n = p.tope == null ? null : Math.round(Number(p.tope)); if (n != null && !(n >= 1 && n <= 2000)) return err("El tope de la lista va de 1 a 2,000.", "The list cap goes from 1 to 2,000."); add("list_cap", n); posts.push(["list", { cap: n }]); }
  if (p.fila !== undefined) {
    const n = Number(p.fila); if (![0, 10, 20, 35].includes(n)) return err("Elige cómo está la fila.", "Pick how the line is.");
    add("line_min", n); set.push("line_at = now()"); posts.push(["line", n]);
  }
  if (p.musica !== undefined) {
    const L = [...new Set((Array.isArray(p.musica) ? p.musica : []).filter((x) => MUSICA.some((m) => m[0] === x)))];
    if (!L.length) return err("Marca al menos una música.", "Pick at least one kind of music.");
    add("music", L); posts.push(["music", L]);
  }
  if (p.nota !== undefined) { const t = txt(p.nota, 60); add("music_note", t ? JSON.stringify({ es: t, en: t }) : null); if (t) set[set.length - 1] += "::jsonb"; posts.push(["music", { nota: t || null }]); }
  if (p.vestimenta !== undefined) { const t = txt(p.vestimenta, 60); add("dress", t ? JSON.stringify({ es: t, en: t }) : null); if (t) set[set.length - 1] += "::jsonb"; posts.push(["dress", t || null]); }
  if (!set.length) return { ok: true };
  await c.query(`update noche_settings set ${set.join(", ")}, updated_by = $2, updated_at = now() where business_id = $1`, v);
  // El historial de lo publicado esa noche (solo inserción; guardián coverConHistoria).
  for (const [f, val] of posts) await c.query(`insert into night_posts (business_id, city_id, night, field, value, by) values ($1, $2, $3::date, $4, $5::jsonb, $6)`, [negocio, b.city, b.noche, f, JSON.stringify(val), actor]);
  // La entrada (k cover) no tiene precio propio: sigue al cover de la herramienta.
  if (p.cover !== undefined) await c.query(`update items set price_cents = $2, updated_at = now() where business_id = $1 and module = 'svc' and svc_kind = 'cover' and removed_at is null and price_cents <> $2`, [negocio, cover]);
  return { ok: true };
}

/* Los filtros de Noche que salen de los datos (nunca se editan a mano) y la tarjeta del buscador. Los demás (terraza, karaoke,
   deportes, comida, esp, estac, y10) salen de las amenidades, la subcategoría o el catálogo y se conservan. */
const DER = ["cover", "sincover", "lista", "mesas", "fila", "e18", "e21", "vestimenta", "tarde", ...MUSICA.map((m) => m[0])];
export async function recalcularFiltrosNoche(c: Q, negocio: string) {
  const b = (await c.query<{ cat: string; fv: string[]; mods: string[]; hay: boolean }>(
    `select b.category_id as cat, b.filter_values as fv, b.modules_on as mods, exists (select 1 from noche_settings s where s.business_id = b.id) as hay from businesses b where b.id = $1`, [negocio])).rows[0];
  if (!b || b.cat !== "NEG-NOCHE" || !b.hay) return;
  const h = (await herramientaNoche(negocio, c))!;
  const S = (await c.query<{ k: string }>(`select svc_kind as k from items where business_id = $1 and module = 'svc' and removed_at is null and sell and status = 'live'`, [negocio])).rows;
  const tarde = (await c.query(`select 1 from business_hours h, jsonb_array_elements(h.ranges) r
                                  where h.business_id = $1 and coalesce(h.module, '') = '' and h.open and (r->>1) between '02:00' and '05:59' and (r->>1) < (r->>0) limit 1`, [negocio])).rowCount! > 0;
  const F = new Set<string>();
  if (!h.porFecha) {
    if (h.prox) F.add(h.prox.cover > 0 ? "cover" : "sincover");
    if (h.lista) F.add("lista");
    // «Fila corta»: la última fila que puso el local (esta noche o la última que abrió), de 10 minutos o menos.
    if (h.fila && h.fila.min <= 10 && Date.parse(h.fila.at) > Date.now() - 7 * 864e5) F.add("fila");
    F.add(h.edad === 18 ? "e18" : "e21");
    if (h.vestimenta) F.add("vestimenta");
  }
  if (S.some((x) => x.k === "mesa" || x.k === "vip") && (b.mods ?? []).includes("rsv")) F.add("mesas");
  for (const m of h.musica) F.add(m);
  if (tarde) F.add("tarde");
  const fv = [...(b.fv ?? []).filter((x) => !DER.includes(x)), ...F];
  const e = h.prox, fee = filaTexto(h.fila, true);
  const nt = h.porFecha ? null : { cover: h.prox ? h.prox.cover / 100 : h.cover / 100, after: e?.after ? [12 + e.after.min / 60, e.after.cents / 100] : null, edad: h.edad,
    mus: h.musicaNota ? [h.musicaNota.es, h.musicaNota.en] : null, dress: h.vestimenta ? [h.vestimenta.es, h.vestimenta.en] : null,
    fila: h.fila?.min ?? 0, filaH: h.fila ? hNoche(h.fila.hora) : null, list: h.lista && h.listaHasta != null ? 12 + h.listaHasta / 60 : null };
  const tj: Record<string, Bi> = {};
  if (e && !h.porFecha) tj.eta = { es: etaNoche(e, true), en: etaNoche(e, false) };
  if (fee && !h.porFecha) tj.fee = { es: fee, en: filaTexto(h.fila, false)! };
  await c.query(
    `update businesses set filter_values = $2,
            category_attrs = coalesce(category_attrs, '{}'::jsonb) || jsonb_build_object('nt', $3::jsonb, 'tarjeta', (coalesce(category_attrs->'tarjeta', '{}'::jsonb) - 'eta' - 'fee') || $4::jsonb),
            updated_at = now()
      where id = $1 and (filter_values is distinct from $2 or category_attrs->'nt' is distinct from $3::jsonb or (coalesce(category_attrs->'tarjeta', '{}'::jsonb) - 'offer') is distinct from $4::jsonb)`,
    [negocio, fv, JSON.stringify(nt), JSON.stringify(tj)]);
  await c.query(`update noche_settings set derived_night = $2::date, derived_line_live = $3 where business_id = $1`, [negocio, h.hoy, !!h.fila?.viva]);
}

/* El barrido (cada minuto): recalcula solo los locales cuya noche cambió (6 AM) o cuya fila dejó de ser «ahora» (60 min). */
export async function barrerNoche(): Promise<number> {
  const L = (await db().query<{ id: string }>(
    `select s.business_id as id from noche_settings s join businesses b on b.id = s.business_id join cities ci on ci.id = b.city_id
      where b.status = 'active' and (s.derived_night is distinct from ${NOCHE_SQL("now()", "ci.timezone")}
         or (s.derived_line_live and s.line_at <= now() - make_interval(mins => ${FILA_VIVA_MIN})))
      order by s.derived_night nulls first limit 500`)).rows;
  for (const x of L) await recalcularFiltrosNoche(db(), x.id);
  return L.length;
}
