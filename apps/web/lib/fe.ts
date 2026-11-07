import "server-only";
import type { Pool, PoolClient } from "pg";
import { db } from "./db";
import type { Bi } from "./inscripciones-comun";
import {
  AYUDA, FREQ, NOMBRE_ATAJO, REP, atajosDe, conHorarios, etaHorarios, kindFeDe, pideUnHorario,
  type FreqFe, type HelpFe, type HerrFe, type HorarioFe, type RepFe,
} from "./fe-comun";

/* Iglesias (Fase 4 · bloque 4ia). Plan: docs/diseno/plan/fase4-iglesias-inmuebles-autos.md §2 «0091», §3, §4ia y §5. Diseño: dash2-cat.js
   L488–507 (Horarios y ayuda · La ayuda de hoy · Precios y repatriación), apply L254–267 (tarjeta y filtros), state L179–186.
   - Los horarios son filas de worship_times (los chips del panel son atajos); al menos una misa o un culto (onboarding min 1).
   - «Se acabó por hoy» = out_today_on = hoy en la ciudad: vale solo ese día; el barrido rehace la tarjeta al cambiar el día.
   - El precio total de la funeraria es el del ítem (una sola fuente). Iglesias no cobra nada en la app: ningún depósito (trigger
     items_fe_sin_deposito), el plan de pagos es texto. */
type Q = Pool | PoolClient;
const HOY_SQL = `(now() at time zone ci.timezone)::date`;
type Fila = { subs: string[]; fv: string[]; ov: string | null; hay: boolean; bil: boolean | null; help: string[] | null; sinid: boolean | null; freq: FreqFe | null; agot: string | null;
  cat: boolean | null; h24: boolean | null; plan_n: number | null; rep: RepFe | null; hoy: string; rep0: string | null };

export async function herramientaFe(negocio: string, c: Q = db()): Promise<HerrFe | null> {
  const b = (await c.query<Fila>(
    `select coalesce((select array_agg(sc.name->>'es' order by array_position(b.subcategory_ids, sc.id)) from subcategorias_vivas sc where sc.id = any(b.subcategory_ids)), '{}') as subs,
            b.filter_values as fv, s.kind_override as ov, s.business_id is not null as hay, s.bil, s.help, s.sinid, s.freq, s.out_today_on::text as agot, s.catequesis_open as cat,
            s.h24, s.plan_n, s.rep_days as rep, ${HOY_SQL}::text as hoy, b.category_attrs->>'rep' as rep0
       from businesses b join cities ci on ci.id = b.city_id left join fe_settings s on s.business_id = b.id where b.id = $1 and b.category_id = 'NEG-FE'`, [negocio])).rows[0];
  if (!b) return null;
  // Una tras otra: herramientaFe también corre dentro de la transacción del panel (guardián transaccionEnFila).
  const H = await c.query<HorarioFe>(`select id::text, dow, start_min as min, label, lang, kind from worship_times where business_id = $1 and removed_at is null order by dow, start_min, id`, [negocio]);
  const I = await c.query<{ id: string; name: Bi; k: string | null; cents: number; fe: string | null; vende: boolean }>(
    `select id::text, name, svc_kind as k, price_cents as cents, svc_attrs->>'fe' as fe, sell and status = 'live' as vende from items
      where business_id = $1 and module = 'svc' and removed_at is null and not is_extra order by sort, id`, [negocio]);
  const fv = b.fv ?? [], kind = kindFeDe(b.subs, b.ov);
  return {
    kind, forzado: !!b.ov, subs: b.subs, horarios: H.rows,
    // Sin fila todavía: lo que dice hoy la página (los tags del prototipo), como state() L183–184.
    bil: b.bil ?? fv.includes("bil"), help: (b.help ?? AYUDA.map((a) => a[0]).filter((a) => fv.includes(a))) as HelpFe[], sinid: b.sinid ?? fv.includes("sinid"),
    freq: b.freq ?? "semana", agotado: b.agot === b.hoy, catequesis: b.cat ?? true, hayCurso: I.rows.some((x) => x.k === "curso" && x.vende),
    h24: b.h24 ?? fv.includes("24h"), plan: (b.plan_n ?? 0) > 0, rep: b.rep ?? ((REP as readonly string[]).includes(b.rep0 ?? "") ? (b.rep0 as RepFe) : "5–7"),
    repatria: b.subs.includes("Repatriación de restos") || I.rows.some((x) => x.vende && /^repatriaci/i.test(x.name.es)),
    totales: I.rows.filter((x) => x.fe === "tot").map((x) => ({ id: x.id, name: x.name, cents: x.cents })), hoy: b.hoy,
  };
}

/* Lo que manda el panel (un toque a la vez). */
export type FeIn = {
  atajo?: { dow: number; min: number; on: boolean }; nuevo?: { dow: number; min: number; label: Bi; lang: string; kind: string }; quitar?: string;
  bil?: boolean; ayuda?: { k: string; on: boolean }; sinid?: boolean; freq?: string; agotado?: boolean; catequesis?: boolean;
  h24?: boolean; plan?: boolean; rep?: string; precio?: { item: string; cents: number };
};
type R = { ok: true } | { ok: false; es: string; en: string };
const err = (es: string, en: string): R => ({ ok: false, es, en });
const ID = /^\d{1,18}$/;
const txt = (v: unknown, n: number) => (typeof v === "string" ? v.replace(/[\u0000-\u001F\u007F]/g, "").replace(/\s+/g, " ").trim().slice(0, n) : "");

export async function guardarFe(c: PoolClient, negocio: string, p: FeIn, actor: string): Promise<R> {
  const b = (await c.query<{ city: string }>(`select city_id as city from businesses where id = $1 and category_id = 'NEG-FE' for update`, [negocio])).rows[0];
  if (!b) return err("Esto es para Iglesias.", "This is for churches.");
  const h = (await herramientaFe(negocio, c))!;
  if (h.kind === "tienda") return err("Tu tienda va por contacto: lo que vendes va en Servicios.", "Your store works by contact: what you sell goes in Services.");
  // La primera vez se guarda lo que ya dice la página (para no apagar nada sin querer).
  await c.query(`insert into fe_settings (business_id, city_id, bil, help, sinid, h24, plan_n, rep_days, updated_by) values ($1, $2, $3, $4, $5, $6, $7, $8, $9) on conflict (business_id) do nothing`,
    [negocio, b.city, h.bil, h.help, h.sinid, h.h24, h.plan ? 12 : 0, h.rep, actor]);
  const set = (sql: string, v: unknown[]) => c.query(`update fe_settings set ${sql}, updated_by = $${v.length + 2}, updated_at = now() where business_id = $1`, [negocio, ...v, actor]);
  const quedan = (sin: (x: HorarioFe) => boolean) => h.horarios.filter((x) => !sin(x)).length;
  const MIN1 = h.kind === "misa" ? err("Deja al menos una misa.", "Keep at least one mass.") : err("Deja al menos un culto.", "Keep at least one service.");

  if (p.atajo !== undefined) {
    if (!conHorarios(h.kind)) return err("Tu tipo de lugar no lleva horarios de la semana.", "Your kind of place has no weekly schedule.");
    const a = atajosDe(h.kind).find((x) => x[2] === Number(p.atajo!.dow) && x[3] === Number(p.atajo!.min));
    if (!a) return err("Ese horario no está en la lista. Escríbelo en «Otro horario».", "That time is not on the list. Add it under “Other time”.");
    const en = (x: HorarioFe) => x.dow === a[2] && x.min === a[3];
    if (p.atajo.on) {
      if (h.horarios.some(en)) return { ok: true };
      const k = h.kind === "misa" ? "misa" : "culto";
      await c.query(`insert into worship_times (business_id, city_id, dow, start_min, label, lang, kind, sort) values ($1, $2, $3, $4, $5::jsonb, 'es', $6, $7) on conflict do nothing`,
        [negocio, b.city, a[2], a[3], JSON.stringify(NOMBRE_ATAJO[k]), k, h.horarios.length]);
      return { ok: true };
    }
    if (pideUnHorario(h.kind) && !quedan(en)) return MIN1;
    await c.query(`update worship_times set removed_at = now(), updated_at = now() where business_id = $1 and dow = $2 and start_min = $3 and removed_at is null`, [negocio, a[2], a[3]]);
    return { ok: true };
  }
  if (p.nuevo !== undefined) {
    if (!conHorarios(h.kind)) return err("Tu tipo de lugar no lleva horarios de la semana.", "Your kind of place has no weekly schedule.");
    const n = p.nuevo, dow = Math.round(Number(n?.dow)), min = Math.round(Number(n?.min)), es = txt(n?.label?.es, 40), en = txt(n?.label?.en, 40);
    if (!(dow >= 0 && dow <= 6)) return err("Elige el día.", "Pick the day.");
    if (!(min >= 0 && min <= 1425 && min % 15 === 0)) return err("Elige la hora.", "Pick the time.");
    if (es.length < 2) return err("Escribe el nombre, por ejemplo «Jóvenes».", "Type the name, for example “Youth”.");
    if (!["es", "en", "bil", "otro"].includes(String(n?.lang))) return err("Elige el idioma.", "Pick the language.");
    if (!["misa", "culto", "grupo", "oracion"].includes(String(n?.kind))) return err("Elige qué es.", "Pick what it is.");
    if (h.horarios.length >= 21) return err("Hasta 21 horarios por semana.", "Up to 21 times a week.");
    if (h.horarios.some((x) => x.dow === dow && x.min === min && x.kind === n.kind)) return err("Ya tienes ese horario.", "You already have that time.");
    await c.query(`insert into worship_times (business_id, city_id, dow, start_min, label, lang, kind, sort) values ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)`,
      [negocio, b.city, dow, min, JSON.stringify({ es, en: en || es }), n.lang, n.kind, h.horarios.length]);
    return { ok: true };
  }
  if (p.quitar !== undefined) {
    const id = String(p.quitar);
    if (!ID.test(id) || !h.horarios.some((x) => x.id === id)) return err("Ese horario ya no está.", "That time is gone.");
    if (pideUnHorario(h.kind) && !quedan((x) => x.id === id)) return MIN1;
    await c.query(`update worship_times set removed_at = now(), updated_at = now() where id = $1 and business_id = $2 and removed_at is null`, [id, negocio]);
    return { ok: true };
  }
  if (p.bil !== undefined) { await set(`bil = $2`, [p.bil === true]); return { ok: true }; }
  if (p.ayuda !== undefined) {
    const k = String(p.ayuda?.k);
    if (!AYUDA.some((a) => a[0] === k)) return err("Esa ayuda no está en la lista.", "That help is not on the list.");
    const L = p.ayuda.on === true ? [...new Set([...h.help, k])] : h.help.filter((x) => x !== k);
    await set(`help = $2::text[]`, [AYUDA.map((a) => a[0]).filter((a) => L.includes(a))]); return { ok: true };
  }
  if (p.sinid !== undefined) { await set(`sinid = $2`, [p.sinid === true]); return { ok: true }; }
  if (p.freq !== undefined) { if (!FREQ.some((f) => f[0] === p.freq)) return err("Elige cada cuánto.", "Pick how often."); await set(`freq = $2`, [p.freq]); return { ok: true }; }
  if (p.agotado !== undefined) {
    if (h.kind !== "ayuda") return err("«Se acabó por hoy» es de la despensa.", "“Out for today” is for food pantries.");
    // Vale solo hoy (hora de la ciudad): mañana se apaga solo.
    await set(`out_today_on = $2::date`, [p.agotado === true ? h.hoy : null]); return { ok: true };
  }
  if (p.catequesis !== undefined) { if (h.kind !== "misa") return err("El catecismo es de las parroquias.", "Catechism is for parishes."); await set(`catequesis_open = $2`, [p.catequesis === true]); return { ok: true }; }
  if (p.h24 !== undefined) { if (h.kind !== "fun") return err("Esto es para funerarias.", "This is for funeral homes."); await set(`h24 = $2`, [p.h24 === true]); return { ok: true }; }
  if (p.plan !== undefined) { if (h.kind !== "fun") return err("Esto es para funerarias.", "This is for funeral homes."); await set(`plan_n = $2`, [p.plan === true ? 12 : 0]); return { ok: true }; }
  if (p.rep !== undefined) {
    if (h.kind !== "fun" || !h.repatria) return err("Primero agrega la repatriación en Servicios.", "First add repatriation in Services.");
    if (!(REP as readonly string[]).includes(String(p.rep))) return err("Elige los días.", "Pick the days.");
    await set(`rep_days = $2`, [p.rep]); return { ok: true };
  }
  if (p.precio !== undefined) {
    if (h.kind !== "fun") return err("Esto es para funerarias.", "This is for funeral homes.");
    const it = h.totales.find((x) => x.id === String(p.precio?.item)), v = Math.round(Number(p.precio?.cents));
    if (!it) return err("Ese servicio ya no está.", "That service is gone.");
    if (!(Number.isFinite(v) && v >= 50000 && v <= 3000000 && v % 100 === 0)) return err("El precio total va de $500 a $30,000.", "The total price goes from $500 to $30,000.");
    await c.query(`update items set price_cents = $2, updated_at = now() where id = $1 and business_id = $3 and removed_at is null and svc_attrs->>'fe' = 'tot'`, [it.id, v, negocio]);
    return { ok: true };
  }
  return err("No hay nada que guardar.", "Nothing to save.");
}

/* Los filtros de Iglesias que salen de los datos (nunca se editan a mano) y la tarjeta del buscador (apply L254–267). Cada variante
   deriva solo lo suyo; lo demás (catolica, y10, verified, lo de otras variantes) se conserva. */
const DER_HOR = ["misaesp", "bil", ...AYUDA.map((a) => a[0])];
const DER_AYU = ["sinid", "ropa"];
const DER_FUN = ["24h", "repatria"];
type Tj = Record<string, Bi>;
const bi = (v: unknown): v is Bi => !!v && typeof v === "object" && typeof (v as Bi).es === "string";

export async function recalcularFiltrosFe(c: Q, negocio: string) {
  const b = (await c.query<{ fv: string[]; ca: Record<string, unknown> | null; hay: boolean; hoy: string }>(
    `select b.filter_values as fv, b.category_attrs as ca, exists (select 1 from fe_settings s where s.business_id = b.id) as hay, ${HOY_SQL}::text as hoy
       from businesses b join cities ci on ci.id = b.city_id where b.id = $1 and b.category_id = 'NEG-FE'`, [negocio])).rows[0];
  if (!b || !b.hay) return;
  const h = (await herramientaFe(negocio, c))!, F = new Set<string>(), ca = b.ca ?? {}, tj0 = (ca.tarjeta && typeof ca.tarjeta === "object" ? ca.tarjeta : {}) as Record<string, unknown>;
  const tj: Tj = {}, extra: Record<string, unknown> = {};
  let DER: string[] = [];
  if (conHorarios(h.kind)) {
    DER = [...DER_HOR, ...(h.horarios.length ? ["esp"] : [])];
    if (h.kind === "misa" && h.horarios.some((x) => x.kind === "misa" && (x.lang === "es" || x.lang === "bil"))) F.add("misaesp");
    if (h.horarios.some((x) => x.lang === "es" || x.lang === "bil")) F.add("esp");
    if (h.bil) F.add("bil");
    for (const a of h.help) F.add(a);
    // La tarjeta (apply L256–261): los horarios; el catecismo (parroquia con catecismo), el transporte o los dos idiomas.
    if (h.horarios.length) tj.eta = { es: etaHorarios(h.horarios, true), en: etaHorarios(h.horarios, false) };
    if (h.kind === "misa" && h.hayCurso) tj.fee = h.catequesis ? { es: "Catecismo: inscripciones abiertas", en: "Catechism: registration open" } : { es: "Catecismo: inscripciones cerradas", en: "Catechism: registration closed" };
    else if (h.help.includes("transporte")) tj.fee = h.horarios.some((x) => x.dow === 0) ? { es: "Transporte gratis los domingos", en: "Free Sunday rides" } : { es: "Transporte gratis los días de servicio", en: "Free rides on service days" };
    else if (h.bil) tj.fee = { es: "Español e inglés", en: "Spanish and English" };
  } else if (h.kind === "ayuda") {
    DER = DER_AYU;
    if (h.sinid) F.add("sinid");
    if (h.help.includes("ropa")) F.add("ropa");
    const f = FREQ.find((x) => x[0] === h.freq) ?? FREQ[0]!, ropa = h.help.includes("ropa");
    tj.eta = h.agotado ? { es: "Se acabó por hoy", en: "Out for today" } : h.sinid ? { es: "Sin papeles ni cita", en: "No papers or appointment" } : { es: "Sin cita · trae una ID", en: "No appointment · bring an ID" };
    tj.fee = { es: f[3].replace(/\.$/, ""), en: f[4].replace(/\.$/, "") };
    extra.freq = [f[3] + (ropa ? " La ropa, cuando la necesites." : ""), f[4] + (ropa ? " Clothing whenever you need it." : "")];
    extra.agot = h.agotado ? 1 : 0;
  } else if (h.kind === "fun") {
    DER = DER_FUN;
    if (h.h24) F.add("24h");
    if (h.repatria) F.add("repatria");
    if (h.repatria) tj.eta = { es: `Repatriación a RD en ${h.rep} días`, en: `Repatriation to the DR in ${h.rep} days` };
    else if (h.h24) tj.eta = { es: "Atiende las 24 horas", en: "Open 24 hours" };
    tj.fee = { es: "Precio completo por escrito antes de firmar", en: "Full written price before signing" };
    extra.rep = h.rep;
  }
  const fv = [...(b.fv ?? []).filter((x) => !DER.includes(x)), ...F];
  // Lo que se derivó la última vez y hoy ya no aplica se quita (fe_der); lo que puso el prototipo y nadie deriva se conserva.
  const antes = Array.isArray(ca.fe_der) ? (ca.fe_der as string[]) : [], nuevo: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(tj0)) if (bi(v) && !antes.includes(k)) nuevo[k] = v;
  Object.assign(nuevo, tj);
  await c.query(`update businesses set filter_values = $2, category_attrs = coalesce(category_attrs, '{}'::jsonb) || $3::jsonb, updated_at = now() where id = $1`,
    [negocio, fv, JSON.stringify({ tarjeta: nuevo, fe_der: Object.keys(tj), ...extra })]);
  await c.query(`update fe_settings set derived_on = $2::date where business_id = $1`, [negocio, b.hoy]);
}

/* El barrido (cada minuto): rehace la tarjeta y los filtros de Iglesias cuyo día cambió («Se acabó por hoy» se apaga solo). */
export async function barrerFe(): Promise<number> {
  const L = (await db().query<{ id: string }>(
    `select s.business_id as id from fe_settings s join businesses b on b.id = s.business_id join cities ci on ci.id = b.city_id
      where b.status = 'active' and s.derived_on is distinct from ${HOY_SQL} order by s.derived_on nulls first limit 500`)).rows;
  for (const x of L) await recalcularFiltrosFe(db(), x.id);
  return L.length;
}
