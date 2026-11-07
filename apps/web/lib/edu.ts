import "server-only";
import type { Pool, PoolClient } from "pg";
import { db } from "./db";
import { etiquetaGrupo, fechaCorta, PLANES, precioInsc, usdI, type Bi, type CursoH, type GrupoH, type HerrEdu, type KindInsc } from "./inscripciones-comun";

/* Educación (Fase 4 · bloque 4ea). Plan: docs/diseno/plan/fase4-edu-ninos-deporte.md §2, §4ea y §5. Diseño: dash2-cat.js blocksE
   L449–464 (Tu herramienta «Grupos y cupos»), apply L225–231 (lo que sale en la tarjeta y en Buscar), summary L306.
   - Los cursos son items (module 'svc', svc_kind curso · mes · semana · clase · hora); cada uno con sus grupos (class_groups).
   - La herramienta cuenta CUPOS LIBRES: el servidor guarda el total = inscritos en la app + inscritos fuera + libres, así nunca
     baja de lo ya ocupado (guardián gruposSinSobreventa). Cada toque deja su línea en la auditoría.
   - La tarjeta (attrs.tarjeta.eta/fee) y los filtros de Buscar se derivan de aquí; nunca se editan a mano. El barrido los rehace
     cuando cambia el día (un grupo que empezó ya no es «el próximo»). */
type Q = Pool | PoolClient;
const HOY_SQL = `(now() at time zone ci.timezone)::date`;

export async function herramientaEdu(negocio: string, c: Q = db()): Promise<HerrEdu | null> {
  const s = (await c.query<{ p: boolean; l: boolean; h: boolean; esp: boolean; fv: string[]; hoy: string }>(
    `select ${HOY_SQL}::text as hoy, coalesce(s.how_presencial, true) as p, coalesce(s.how_linea, 'linea' = any(b.filter_values)) as l, coalesce(s.how_hibrido, 'hibrido' = any(b.filter_values)) as h,
            coalesce(s.esp, 'esp' = any(b.filter_values)) as esp, b.filter_values as fv
       from businesses b join cities ci on ci.id = b.city_id left join insc_settings s on s.business_id = b.id where b.id = $1 and b.category_id in ('NEG-EDU', 'NEG-NINOS')`, [negocio])).rows[0];
  if (!s) return null;
  const I = (await c.query<{ id: string; name: Bi; k: KindInsc; cents: number; mat: number; a: Record<string, unknown>; vende: boolean }>(
    `select i.id::text, i.name, i.svc_kind as k, i.price_cents as cents, coalesce(i.deposit_cents, 0) as mat, coalesce(i.svc_attrs, '{}'::jsonb) as a, i.sell and i.status = 'live' as vende
       from items i where i.business_id = $1 and i.module = 'svc' and i.removed_at is null and not i.is_extra and i.svc_kind in ('curso', 'mes', 'semana', 'clase', 'hora')
      order by i.sort, i.id`, [negocio])).rows;
  const G = (await c.query<GrupoH & { item: string }>(
    `select g.id::text, g.item_id::text as item, g.label, g.starts_on::text as inicio, g.ends_on::text as fin, g.dows, g.start_min as min, g.seats_total as total,
            g.seats_outside as fuera, g.seats_booked as ocupados, greatest(0, g.seats_total - g.seats_outside - g.seats_booked) as libres, g.status as estado, g.join_url is not null as "enLinea"
       from class_groups g join businesses b on b.id = g.business_id join cities ci on ci.id = b.city_id
      where g.business_id = $1 and g.status in ('open', 'started') and (g.ends_on is null or g.ends_on >= ${HOY_SQL}) order by g.starts_on, g.start_min nulls first, g.id`, [negocio])).rows;
  const cursos: CursoH[] = I.map((x) => ({
    id: x.id, name: x.name, k: x.k, cents: x.cents, mat: x.mat, plan: Number(x.a.plan_n ?? 0), g1: x.a.g1 === true, sem: x.a.sem != null ? Number(x.a.sem) : null, hrs: x.a.horas != null ? Number(x.a.horas) : null,
    cert: (x.a.cert as Bi) ?? null, oficial: x.a.oficial === true, vende: x.vende,
    grupos: G.filter((g) => g.item === x.id).map(({ item: _i, ...g }) => g),
  }));
  const abiertos = cursos.flatMap((x) => (x.vende ? x.grupos : [])).filter((g) => g.estado === "open" && g.libres > 0);
  return { hoy: s.hoy, how: { presencial: s.p, linea: s.l, hibrido: s.h, esp: s.esp }, cursos, abiertos: abiertos.length, libres: abiertos.reduce((a, g) => a + g.libres, 0), gratis: cursos.filter((x) => x.g1).length };
}

/* Lo que manda el panel (un toque a la vez). */
export type EduIn = { how?: { presencial?: boolean; linea?: boolean; hibrido?: boolean; esp?: boolean }; item?: string; precio?: number; mat?: number; plan?: number; g1?: boolean; grupo?: string; libres?: number };
type R = { ok: true } | { ok: false; es: string; en: string };
const err = (es: string, en: string): R => ({ ok: false, es, en });
const ID = /^\d{1,18}$/;

export async function guardarEdu(c: PoolClient, negocio: string, p: EduIn, actor: string): Promise<R> {
  // Educación y, fuera del cuidado, Niños (4eb) usan este mismo motor; Niños no tiene plan de pagos (NIK, L460).
  const b = (await c.query<{ city: string; rub: "edu" | "ninos" }>(`select city_id as city, case category_id when 'NEG-NINOS' then 'ninos' else 'edu' end as rub from businesses where id = $1 and category_id in ('NEG-EDU', 'NEG-NINOS') for update`, [negocio])).rows[0];
  if (!b) return err("Esto es para Educación y Niños.", "This is for education and kids businesses.");
  if (p.how) {
    const cur = (await herramientaEdu(negocio, c))!.how, h = { ...cur, ...Object.fromEntries(Object.entries(p.how).filter(([k, v]) => ["presencial", "linea", "hibrido", "esp"].includes(k) && typeof v === "boolean")) };
    if (!h.presencial && !h.linea && !h.hibrido) return err("Deja al menos una forma de dar clases.", "Keep at least one way to teach.");
    await c.query(`insert into insc_settings (business_id, city_id, rubro, how_presencial, how_linea, how_hibrido, esp, updated_by) values ($1, $2, $8, $3, $4, $5, $6, $7)
                   on conflict (business_id) do update set how_presencial = $3, how_linea = $4, how_hibrido = $5, esp = $6, updated_by = $7, updated_at = now()`,
      [negocio, b.city, h.presencial, h.linea, h.hibrido, h.esp, actor, b.rub]);
    return { ok: true };
  }
  await c.query(`insert into insc_settings (business_id, city_id, rubro, updated_by) values ($1, $2, $4, $3) on conflict (business_id) do nothing`, [negocio, b.city, actor, b.rub]);
  if (p.grupo !== undefined) {
    if (!ID.test(String(p.grupo))) return err("Ese grupo no existe.", "That group does not exist.");
    const n = Math.round(Number(p.libres));
    if (!(n >= 0 && n <= 40)) return err("Los cupos van de 0 a 40.", "Seats go from 0 to 40.");
    const g = (await c.query<{ item: string; usados: number; libres: number }>(
      `select item_id::text as item, seats_outside + seats_booked as usados, greatest(0, seats_total - seats_outside - seats_booked) as libres from class_groups where id = $1 and business_id = $2 and status = 'open' for update`, [p.grupo, negocio])).rows[0];
    if (!g) return err("Ese grupo ya no está abierto.", "That group is no longer open.");
    // «Deja al menos un grupo con cupo. Si se llenó, abre otro grupo.» (L462–463)
    if (n === 0 && g.libres > 0) {
      const otros = (await c.query(`select 1 from class_groups where item_id = $1 and id <> $2 and status = 'open' and seats_total - seats_outside - seats_booked > 0 limit 1`, [g.item, p.grupo])).rowCount;
      if (!otros) return err("Deja al menos un grupo con cupo. Si se llenó, abre otro grupo.", "Keep at least one group with seats. If it filled up, open another group.");
    }
    await c.query(`update class_groups set seats_total = $2, updated_at = now() where id = $1`, [p.grupo, g.usados + n]);
    return { ok: true };
  }
  if (!ID.test(String(p.item ?? ""))) return err("Ese curso no existe.", "That course does not exist.");
  const it = (await c.query<{ k: KindInsc; cents: number; mat: number; a: Record<string, unknown> }>(
    `select svc_kind as k, price_cents as cents, coalesce(deposit_cents, 0) as mat, coalesce(svc_attrs, '{}'::jsonb) as a from items
      where id = $1 and business_id = $2 and module = 'svc' and removed_at is null and svc_kind in ('curso', 'mes', 'semana', 'clase', 'hora') for update`, [p.item, negocio])).rows[0];
  if (!it) return err("Ese curso no existe.", "That course does not exist.");
  if (p.precio !== undefined) {
    const v = Math.round(Number(p.precio));
    // Niños: $0 = «Gratis si calificas» (Head Start, evaluaciones); un curso siempre tiene precio (la matrícula es menos).
    const min = b.rub === "ninos" && it.k !== "curso" ? 0 : 100;
    if (!(v >= min && v <= 5000000 && v % 100 === 0)) return err("El precio va en dólares enteros.", "The price goes in whole dollars.");
    if (it.k === "curso" && v <= it.mat) return err("El precio tiene que ser más que la matrícula.", "The price must be more than the registration fee.");
    await c.query(`update items set price_cents = $2, updated_at = now() where id = $1`, [p.item, v]);
    return { ok: true };
  }
  if (p.mat !== undefined) {
    const v = Math.round(Number(p.mat));
    if (it.k !== "curso") return err("La matrícula es solo de un curso.", "The registration fee is only for a course.");
    if (!(v >= 0 && v % 100 === 0 && v < it.cents)) return err("La matrícula se descuenta del total: tiene que ser menos que el precio.", "The registration fee comes off the total: it must be less than the price.");
    await c.query(`update items set deposit_cents = $2, svc_attrs = case when $2 = 0 then coalesce(svc_attrs, '{}'::jsonb) - 'dep' else coalesce(svc_attrs, '{}'::jsonb) || jsonb_build_object('dep', $2) end, updated_at = now() where id = $1`, [p.item, v]);
    return { ok: true };
  }
  if (p.plan !== undefined) {
    const v = Math.round(Number(p.plan));
    if (it.k !== "curso") return err("El plan de pagos es solo de un curso.", "The payment plan is only for a course.");
    if (b.rub === "ninos" && v) return err("Los programas de niños no llevan plan de pagos.", "Kids programs do not have a payment plan.");
    if (!(PLANES as readonly number[]).includes(v)) return err("El plan de pagos es de 3, 6 o 12 pagos.", "The payment plan is 3, 6 or 12 payments.");
    await c.query(`update items set svc_attrs = case when $2 = 0 then coalesce(svc_attrs, '{}'::jsonb) - 'plan_n' else coalesce(svc_attrs, '{}'::jsonb) || jsonb_build_object('plan_n', $2) end, updated_at = now() where id = $1`, [p.item, v]);
    return { ok: true };
  }
  if (p.g1 !== undefined) {
    if (it.k === "curso") return err("La primera clase gratis no va en un curso con matrícula.", "A free first class does not apply to a course with a registration fee.");
    await c.query(`update items set svc_attrs = case when $2 then coalesce(svc_attrs, '{}'::jsonb) || '{"g1":true}'::jsonb else coalesce(svc_attrs, '{}'::jsonb) - 'g1' end, updated_at = now() where id = $1`, [p.item, p.g1 === true]);
    return { ok: true };
  }
  return err("No hay nada que guardar.", "Nothing to save.");
}

/* Abrir un grupo: etiqueta, fecha de inicio, días y hora, cupos libres y, si es en línea, el enlace (solo lo ven los inscritos). */
export type GrupoIn = { item: string; label?: string; labelEn?: string; inicio: string; dows?: number[]; min?: number | null; dur?: number | null; libres: number; url?: string | null };
export async function abrirGrupo(c: PoolClient, negocio: string, p: GrupoIn): Promise<R & { id?: string }> {
  if (!ID.test(String(p?.item ?? ""))) return err("Ese curso no existe.", "That course does not exist.");
  const it = (await c.query<{ city: string; k: KindInsc; sem: number | null; hoy: string }>(
    `select b.city_id as city, i.svc_kind as k, (i.svc_attrs->>'sem')::int as sem, ${HOY_SQL}::text as hoy from items i join businesses b on b.id = i.business_id join cities ci on ci.id = b.city_id
      where i.id = $1 and i.business_id = $2 and i.module = 'svc' and i.removed_at is null and i.svc_kind in ('curso', 'mes', 'semana', 'clase', 'hora') and b.category_id in ('NEG-EDU', 'NEG-NINOS')`, [p.item, negocio])).rows[0];
  if (!it) return err("Ese curso no existe.", "That course does not exist.");
  const ini = String(p.inicio ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ini) || ini < it.hoy) return err("Elige el día en que empieza (hoy o después).", "Pick the start day (today or later).");
  if (ini > (await c.query<{ d: string }>(`select ($1::date + 400)::text as d`, [it.hoy])).rows[0]!.d) return err("El grupo empieza dentro de los próximos 13 meses.", "The group starts within the next 13 months.");
  const dows = [...new Set((Array.isArray(p.dows) ? p.dows : []).map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort((a, b) => a - b);
  const min = p.min == null ? null : Math.round(Number(p.min));
  if (min != null && !(min >= 0 && min <= 1439 && min % 15 === 0)) return err("Elige la hora.", "Pick the time.");
  const dur = p.dur == null ? null : Math.round(Number(p.dur));
  if (dur != null && !(dur >= 15 && dur <= 600)) return err("La clase dura entre 15 minutos y 10 horas.", "A class lasts 15 minutes to 10 hours.");
  const libres = Math.round(Number(p.libres));
  if (!(libres >= 1 && libres <= 40)) return err("Los cupos van de 1 a 40.", "Seats go from 1 to 40.");
  const url = typeof p.url === "string" && p.url.trim() ? p.url.trim() : null;
  if (url && (!/^https:\/\/[^\s<>"']{4,290}$/.test(url))) return err("El enlace de la clase en línea empieza con https://", "The online class link starts with https://");
  const t = (v: unknown) => (typeof v === "string" ? v.replace(/[\u0000-\u001F\u007F]/g, "").replace(/\s+/g, " ").trim().slice(0, 40) : "");
  const es = t(p.label) || etiquetaGrupo(dows, min, true) || `Empieza el ${fechaCorta(ini, true)}`, en = t(p.labelEn) || etiquetaGrupo(dows, min, false) || `Starts ${fechaCorta(ini, false)}`;
  if (es.length < 2) return err("Ponle nombre al grupo (ej. Lun y Mié 7 PM).", "Name the group (e.g. Mon & Wed 7 PM).");
  if ((await c.query(`select 1 from class_groups where item_id = $1 and status in ('open', 'started') and starts_on = $2::date and coalesce(start_min, -1) = coalesce($3::int, -1) and label->>'es' = $4`, [p.item, ini, min, es])).rowCount)
    return err("Ese grupo ya existe.", "That group already exists.");
  const fin = it.k === "curso" && it.sem ? (await c.query<{ d: string }>(`select ($1::date + $2::int * 7 - 1)::text as d`, [ini, it.sem])).rows[0]!.d : it.k === "clase" || it.k === "hora" ? ini : null;
  const g = (await c.query<{ id: string }>(
    `insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, dur_min, seats_total, join_url) values ($1, $2, $3, $4::jsonb, $5::date, $6::date, $7::smallint[], $8, $9, $10, $11) returning id::text`,
    [negocio, it.city, p.item, JSON.stringify({ es, en }), ini, fin, dows, min, dur, libres, url])).rows[0]!;
  return { ok: true, id: g.id };
}
/* Quitar un grupo que nadie ha tomado en la app (con inscritos, se cancela con devolución en 4ee). */
export async function quitarGrupo(c: PoolClient, negocio: string, grupo: string): Promise<R> {
  if (!ID.test(String(grupo))) return err("Ese grupo no existe.", "That group does not exist.");
  const g = (await c.query<{ booked: number }>(`select seats_booked as booked from class_groups where id = $1 and business_id = $2 and status = 'open' for update`, [grupo, negocio])).rows[0];
  if (!g) return err("Ese grupo ya no está abierto.", "That group is no longer open.");
  if (g.booked > 0) return err("Este grupo tiene inscritos en la app: para cancelarlo, cada uno recibe su dinero de vuelta (llega con las inscripciones).", "This group has people enrolled in the app: cancelling it refunds each of them (comes with enrollments).");
  await c.query(`update class_groups set status = 'cancelled', cancel_reason = 'Lo quitó el negocio antes de que alguien se inscribiera', updated_at = now() where id = $1`, [grupo]);
  return { ok: true };
}

/* Los filtros de Educación que salen de los datos (nunca se editan a mano) y la tarjeta del buscador. Los demás (princ, ninos, y10,
   trabajo…) salen de la subcategoría o del catálogo y se conservan. */
const DER = ["presencial", "linea", "hibrido", "esp", "cert", "plan", "gratis1", "tarde", "noche", "finde"];
export async function recalcularFiltrosEdu(c: Q, negocio: string) {
  const b = (await c.query<{ fv: string[]; hay: boolean; hoy: string }>(
    `select b.filter_values as fv, exists (select 1 from insc_settings s where s.business_id = b.id) as hay, ${HOY_SQL}::text as hoy
       from businesses b join cities ci on ci.id = b.city_id where b.id = $1 and b.category_id = 'NEG-EDU'`, [negocio])).rows[0];
  if (!b) return;
  if (!b.hay) {
    // La primera vez que la escuela tiene un curso, su herramienta nace con lo que ya decía su página (presencial, en línea, español).
    if (!(await c.query(`select 1 from items where business_id = $1 and module = 'svc' and removed_at is null and svc_kind in ('curso', 'mes', 'semana', 'clase', 'hora') limit 1`, [negocio])).rowCount) return;
    const fv = b.fv ?? [], L = fv.includes("linea"), H = fv.includes("hibrido");
    await c.query(`insert into insc_settings (business_id, city_id, rubro, how_presencial, how_linea, how_hibrido, esp) select id, city_id, 'edu', $2, $3, $4, $5 from businesses where id = $1 on conflict (business_id) do nothing`,
      [negocio, fv.includes("presencial") || (!L && !H), L, H, fv.includes("esp")]);
  }
  const h = (await herramientaEdu(negocio, c))!, V = h.cursos.filter((x) => x.vende), F = new Set<string>();
  if (h.how.presencial) F.add("presencial");
  if (h.how.linea) F.add("linea");
  if (h.how.hibrido) F.add("hibrido");
  if (h.how.esp) F.add("esp");
  if (V.some((x) => x.k === "curso" && x.cert && x.oficial)) F.add("cert");
  if (V.some((x) => x.k === "curso" && x.plan > 0)) F.add("plan");
  if (V.some((x) => x.g1)) F.add("gratis1");
  // El horario sale de los grupos abiertos (horL L24): de tarde desde las 2 PM, de noche desde las 5 PM, fines de semana.
  const G = V.flatMap((x) => x.grupos).filter((g) => g.estado === "open" && g.libres > 0);
  if (G.some((g) => g.min != null && g.min >= 840 && g.min < 1020)) F.add("tarde");
  if (G.some((g) => g.min != null && g.min >= 1020)) F.add("noche");
  if (G.some((g) => g.dows.includes(0) || g.dows.includes(6))) F.add("finde");
  const fv = [...(b.fv ?? []).filter((x) => !DER.includes(x)), ...F];
  // La tarjeta: «$80 al mes · primera clase gratis» (el primero por mes) o el curso con su precio; «Próximo grupo: 5 oct».
  const tj: Record<string, Bi> = {}, m = V.find((x) => x.k === "mes"), cu = V.find((x) => x.k === "curso"), pr = m ?? cu ?? V[0];
  if (pr) {
    const extra = (es: boolean) => (pr.g1 ? (es ? " · primera clase gratis" : " · first class free") : pr.k === "curso" && pr.plan ? (es ? " · plan de pagos" : " · payment plan") : "");
    tj.fee = pr === m ? { es: precioInsc(pr.cents, pr.k, true) + extra(true), en: precioInsc(pr.cents, pr.k, false) + extra(false) }
      : { es: `${pr.name.es} ${usdI(pr.cents)}${extra(true)}`, en: `${pr.name.en || pr.name.es} ${usdI(pr.cents)}${extra(false)}` };
  }
  const prox = V.flatMap((x) => x.grupos.filter((g) => g.estado === "open" && g.libres > 0 && g.inicio >= b.hoy).map((g) => ({ x, g }))).sort((p, q) => p.g.inicio.localeCompare(q.g.inicio))[0];
  if (prox) tj.eta = prox.x.k === "curso"
    ? { es: `${prox.x.name.es}: empieza el ${fechaCorta(prox.g.inicio, true)}`, en: `${prox.x.name.en || prox.x.name.es}: starts ${fechaCorta(prox.g.inicio, false)}` }
    : { es: `Próximo grupo: ${fechaCorta(prox.g.inicio, true)}`, en: `Next group: ${fechaCorta(prox.g.inicio, false)}` };
  await c.query(
    `update businesses set filter_values = $2, category_attrs = coalesce(category_attrs, '{}'::jsonb) || jsonb_build_object('tarjeta', (coalesce(category_attrs->'tarjeta', '{}'::jsonb) - 'eta' - 'fee') || $3::jsonb), updated_at = now()
      where id = $1 and (filter_values is distinct from $2 or (coalesce(category_attrs->'tarjeta', '{}'::jsonb) - 'offer') is distinct from $3::jsonb)`,
    [negocio, fv, JSON.stringify(tj)]);
  await c.query(`update insc_settings set derived_on = $2::date where business_id = $1`, [negocio, b.hoy]);
}

/* El barrido (cada minuto): recalcula las escuelas cuyo día cambió (un grupo que empezó ya no es «el próximo»). */
export async function barrerEdu(): Promise<number> {
  const L = (await db().query<{ id: string }>(
    `select s.business_id as id from insc_settings s join businesses b on b.id = s.business_id join cities ci on ci.id = b.city_id
      where s.rubro = 'edu' and b.status = 'active' and s.derived_on is distinct from ${HOY_SQL} order by s.derived_on nulls first limit 500`)).rows;
  for (const x of L) await recalcularFiltrosEdu(db(), x.id);
  return L.length;
}
