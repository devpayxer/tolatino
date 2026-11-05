"use server";
import { claveAmenidad } from "@/lib/amenidades";
import { db, tx } from "@/lib/db";
import { mismoOrigen, yo } from "@/lib/cuenta";
import { ubicacion } from "@/lib/ubicacion";
import { daysOf, derive, descEs, items as itemsDe, needZone, ok as okPaso, opOf, own as ownDe, SEQ, zoneOf, type Borrador } from "./logica";

/* Publica tu negocio v2: el borrador vive en el servidor (onboarding_drafts) para seguir desde otro teléfono. La
   pantalla lo guarda solo, con pausas; el servidor valida tamaño y forma. Las fotos nunca van aquí (son media). */

const PASOS = new Set(["A1", "B1", "C1", "D1", "E1", "F1", "H1"]);
const MAX = 64 * 1024;

export async function leerBorrador() {
  const me = await yo();
  if (!me) return null;
  const r = (await db().query<{ step: string; answers: Record<string, unknown>; business_id: string | null }>(
    `select step, answers, business_id from onboarding_drafts where user_id = $1`, [me.id])).rows[0];
  return r ? { paso: r.step, d: r.answers, negocio: r.business_id } : null;
}

export async function guardarBorrador(paso: string, d: Record<string, unknown>) {
  if (!(await mismoOrigen())) return { ok: false as const };
  const me = await yo();
  if (!me) return { ok: false as const };
  if (!PASOS.has(paso) || typeof d !== "object" || d === null || Array.isArray(d)) return { ok: false as const };
  const json = JSON.stringify(d);
  // Nada de imágenes en el borrador (el prototipo guardaba data: URLs): las fotos son filas de media.
  if (json.length > MAX || /data:image\//.test(json)) return { ok: false as const };
  await db().query(
    `insert into onboarding_drafts (user_id, step, answers) values ($1, $2, $3::jsonb)
     on conflict (user_id) do update set step = excluded.step, answers = excluded.answers
      where onboarding_drafts.completed_at is null`, [me.id, paso, json]);
  return { ok: true as const };
}

/* Empezar de nuevo: el borrador se reemplaza (es trabajo en curso de la persona, no un registro publicado). */
export async function empezarDeNuevo() {
  if (!(await mismoOrigen())) return { ok: false as const };
  const me = await yo();
  if (!me) return { ok: false as const };
  await db().query(`update onboarding_drafts set step = 'B1', answers = '{}'::jsonb, started_at = now() where user_id = $1 and completed_at is null`, [me.id]);
  return { ok: true as const };
}

const N = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/* ¿Ya hay un negocio con ese nombre en la ciudad? (B1: «Ya hay un … en To'Latino. ¿Es tuyo?») */
export async function negocioIgual(nombre: string) {
  const n = N(String(nombre ?? "").slice(0, 60));
  if (n.length < 3) return null;
  const me = await yo(), loc = await ubicacion(me);
  const r = await db().query<{ id: string; name: string }>(
    `select id, name from businesses
      where city_id = $1 and status in ('active', 'temp_closed')
        and trim(regexp_replace(lower(unaccent(name)), '[^a-z0-9]+', ' ', 'g')) = $2 limit 1`, [loc.ciudad, n]);
  return r.rows[0] ?? null;
}

/* E1 · rento espacio: los negocios de la ciudad donde podría estar (por nombre; de su categoría primero). */
export async function anfitriones(q: string, cat: string | null) {
  const me = await yo(), loc = await ubicacion(me);
  const t = N(String(q ?? "").slice(0, 40));
  const r = await db().query<{ id: string; name: string; address: string | null; foto: string | null }>(
    `select b.id, b.name, b.address,
            (select m.url from media m where m.owner_kind = 'business' and m.owner_id = b.id and m.status = 'visible' order by m.sort limit 1) as foto
       from businesses b
      where b.city_id = $1 and b.status = 'active' and b.geo is not null
        and ($2 = '' or lower(unaccent(b.name)) like '%' || $2 || '%')
      order by (b.category_id = $3) desc, b.name limit $4`, [loc.ciudad, t, cat, t ? 6 : 4]);
  return r.rows.map((x) => ({ id: x.id, name: x.name, addr: (x.address ?? "").replace(/, Hazleton.*$/i, ""), foto: x.foto }));
}

/* ── Publicar ── El servidor vuelve a pasar TODAS las reglas del diseño (las mismas de la pantalla, lib/onb + logica) y
   crea el negocio en una sola transacción: negocio, plan Pro de prueba, dueño, horario, fotos (pasan de la persona al
   negocio) y, si renta espacio, la solicitud al local. Nada se borra: el borrador queda completado. */

const PROMO: Record<string, number> = { HZL30: 60 }; // código de promotor del diseño; la tabla de códigos llega con el Super Admin
const NN = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const hhmm = (h: number) => { const H = ((Math.round(h * 2) / 2) % 24 + 24) % 24; return `${String(Math.floor(H)).padStart(2, "0")}:${H % 1 ? "30" : "00"}`; };

export type RespPublicar =
  | { ok: true; negocio: { id: string; nombre: string; minutos: number; hasta: string; items: number; fotos: number } }
  | { ok: false; mensaje: { es: string; en: string }; paso?: string };

export async function publicar(dIn: Borrador): Promise<RespPublicar> {
  const no = (es: string, en: string, paso?: string): RespPublicar => ({ ok: false, mensaje: { es, en }, paso });
  if (!(await mismoOrigen())) return no("No permitido.", "Not allowed.");
  const me = await yo();
  if (!me) return no("Entra para publicar.", "Sign in to publish.", "A1");
  const prev = (await db().query<{ business_id: string | null }>(`select business_id from onboarding_drafts where user_id = $1 and completed_at is not null`, [me.id])).rows[0];
  if (prev?.business_id) return no("Este negocio ya está publicado.", "This business is already live.", "H1");
  if (!dIn || typeof dIn !== "object" || JSON.stringify(dIn).length > MAX) return no("No se pudo publicar.", "Couldn’t publish.");
  const corto = (s: unknown, n: number) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);
  const d = { ...dIn, name: corto(dIn.name, 48), addr: corto(dIn.addr, 120), ref: corto(dIn.ref, 50), joinName: corto(dIn.joinName, 60),
    subs: (Array.isArray(dIn.subs) ? dIn.subs : []).slice(0, 3).map((s) => corto(s, 80)),
    cust: (Array.isArray(dIn.cust) ? dIn.cust : []).slice(0, 60).map((c) => ({ n: corto(c?.n, 60), p: Math.max(0, Math.min(1e6, Number(c?.p) || 0)), u: "fijo", dur: 0 })).filter((c) => c.n.length >= 2),
    join: typeof dIn.join === "string" && /^[a-z0-9-]{2,80}$/.test(dIn.join) ? dIn.join : null } as Borrador;
  for (const p of SEQ) if (!okPaso(p, d)) return no("Falta algo en este paso.", "Something is missing in this step.", p);
  const loc = await ubicacion(me);
  const op = opOf(d), dv = derive(d), o = ownDe(d), its = itemsDe(d);
  // Fotos: tienen que ser de esta persona, subidas por ella y visibles.
  const fotos = [d.cover, ...(d.gallery || [])].filter((x): x is string => typeof x === "string" && /^[0-9a-f-]{36}$/.test(x)).slice(0, 13);
  if (!fotos.length || fotos[0] !== d.cover) return no("Falta tu foto.", "Your photo is missing.", "F1");
  const mias = (await db().query<{ id: string }>(`select id::text from media where id = any($1::uuid[]) and owner_kind = 'user' and owner_id = $2 and status = 'visible'`, [fotos, me.id])).rows.map((r) => r.id);
  if (!mias.includes(d.cover!)) return no("Vuelve a subir tu foto.", "Upload your photo again.", "F1");
  const subs = (await db().query<{ id: string; es: string }>(`select id, name->>'es' as es from subcategories where category_id = $1`, [d.cat])).rows;
  const subIds = d.subs.map((s) => subs.find((x) => NN(x.es) === NN(s))?.id).filter((x): x is string => !!x);
  const dias = diasPrueba(d);
  const fin = new Date(Date.now() + dias * 864e5);
  const hasta = fin.toLocaleDateString("es-US", { day: "numeric", month: "short", timeZone: "America/New_York" }).replace(".", "");
  const tel = (await db().query<{ phone: string }>(`select phone from users where id = $1`, [me.id])).rows[0]?.phone ?? null;
  const operacion = op === "casa" ? "casa" : op === "ambos" ? "ambos" : op === "rento" ? "rento" : "local";
  const productos = its.map((it) => ({ name: it.n[0], ne: it.n[1], price: Number(it.p) || 0, unit: it.u || "fijo", dur: Number(it.dur) || 0, desc: descEs(it) }));
  const attrs = { onb: { op, own: o, tool: dv.tool ?? {}, cx: dv.cx ?? {}, mods: dv.mods ?? {}, via: d.via, trial: { until: fin.toISOString(), days: dias, promo: d.promoOk ? d.promo : null } }, items: productos };
  const base = NN(d.name).replace(/ /g, "-").slice(0, 60) || "negocio";
  const nombreYo = [me.first_name, me.last_name].filter(Boolean).join(" ") || me.nick || "Dueño";
  const minutos = d.t0 ? Math.max(1, Math.round((Date.now() - Number(d.t0)) / 60000)) : 0;
  const id = await tx(async (c) => {
    let slug = base;
    for (let i = 2; (await c.query(`select 1 from businesses where id = $1`, [slug])).rowCount; i++) slug = `${base}-${i}`;
    await c.query(
      `insert into businesses (id, city_id, category_id, subcategory_ids, name, status, origin, owner_user_id, operation, hosted_at_business_id,
                               address, address_ref, works_from_home, service_radius_mi, phone, filter_values, amenities, modules_on, category_attrs)
       values ($1, $2, $3, $4, $5, 'active', 'self', $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17::jsonb)`,
      [slug, loc.ciudad, d.cat, subIds, d.name, me.id, operacion, op === "rento" && d.join ? d.join : null,
        op === "casa" ? null : d.addr.trim() || null, op === "rento" && d.joinName && !d.join ? `Dentro de ${d.joinName}` : d.ref?.trim() || null,
        op === "home", needZone(op) ? Math.max(1, Math.min(100, zoneOf(d))) : null, tel,
        (dv.tags ?? []) as string[], ((dv.amen ?? []) as string[]).map(claveAmenidad), Object.keys(dv.mods ?? {}), JSON.stringify(attrs)]);
    await c.query(`insert into business_stats_cache (business_id, plan, photo_count) values ($1, 'pro', $2)`, [slug, mias.length]);
    // Revisión ligera del equipo (Super Admin › Colas › Negocios nuevos). El negocio ya sale; esto no lo detiene.
    await c.query(`insert into queue_items (queue, subject_kind, subject_id, business_id, city_id) values ('nuevo', 'business', $1, $1, $2) on conflict do nothing`, [slug, loc.ciudad]);
    // Si vino de una semilla («Reclámalo gratis»): la semilla queda reclamada y la recomendación del vecino, enlazada.
    if (typeof d.semilla === "string" && /^\d{1,18}$/.test(d.semilla)) {
      const sd = (await c.query<{ recommendation_id: string }>(
        `update seed_listings set status = 'claimed', business_id = $2, claimed_at = now() where id = $1::bigint and status = 'shown' and city_id = $3 returning recommendation_id::text`,
        [d.semilla, slug, loc.ciudad])).rows[0];
      if (sd) {
        await c.query(`update recommendations set status = 'joined', business_id = $2 where id = $1::bigint`, [sd.recommendation_id, slug]);
        await c.query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, after) values ('user', $1, 'semilla.reclamada', 'business', $2, $3, $4::jsonb)`,
          [me.id, slug, loc.ciudad, JSON.stringify({ semilla: d.semilla })]);
      }
    }
    // Licencias que marcó (Trámites y profesionales): «en revisión» en su ficha Licencia y un caso en la cola Licencias.
    const lics = Array.isArray(dv.cx?.lic) ? (dv.cx.lic as unknown[]).filter((k): k is string => typeof k === "string" && /^[a-z]{2,12}$/.test(k)).slice(0, 10) : [];
    if (lics.length) {
      await c.query(
        `with ins as (
           insert into licenses (business_id, city_id, kind, title, can, cannot, issuer, registry_url, status, source, sort)
           select $1, $2, k.key, k.title, k.can, coalesce(k.cannot, '[]'::jsonb), k.issuer->>'es', k.registry_url, 'review', 'publica', o.n
             from unnest($3::text[]) with ordinality o(key, n) join license_kinds k on k.key = o.key and k.category_id = $4
           on conflict do nothing returning id, business_id, city_id)
         insert into queue_items (queue, subject_kind, subject_id, business_id, city_id) select 'lic', 'license', id::text, business_id, city_id from ins`,
        [slug, loc.ciudad, lics, d.cat]);
    }
    await c.query(`insert into business_members (business_id, user_id, kind, display_name, phone, panel_access) values ($1, $2, 'owner', $3, $4, '{all}')`, [slug, me.id, nombreYo, tel]);
    const D = daysOf(d);
    for (let i = 0; i < 7; i++) {
      const x = D[i]!;
      await c.query(`insert into business_hours (business_id, weekday, open, ranges) values ($1, $2, $3, $4::jsonb)`,
        [slug, (i + 1) % 7, !!x.on, JSON.stringify(x.on ? [[hhmm(x.a), hhmm(x.b)]] : [])]);
    }
    const orden = fotos.filter((f) => mias.includes(f));
    for (let i = 0; i < orden.length; i++)
      await c.query(`update media set owner_kind = 'business', owner_id = $1, sort = $2 where id = $3::uuid and owner_kind = 'user' and owner_id = $4`, [slug, i, orden[i], me.id]);
    if (op === "rento" && d.join)
      await c.query(`insert into business_members (business_id, user_id, kind, display_name, status, phone) select $1, $2, 'renter', $3, 'requested', $4 where exists (select 1 from businesses where id = $1 and status = 'active')`, [d.join, me.id, d.name, tel]);
    await c.query(
      `insert into onboarding_drafts (user_id, step, answers, promo_code, completed_at, business_id) values ($1, 'H1', $2::jsonb, $3, now(), $4)
       on conflict (user_id) do update set step = 'H1', answers = excluded.answers, promo_code = excluded.promo_code, completed_at = now(), business_id = excluded.business_id`,
      [me.id, JSON.stringify({ ...d, cover: null, gallery: [] }), d.promoOk ? d.promo : null, slug]);
    return slug;
  });
  return { ok: true, negocio: { id, nombre: d.name, minutos, hasta, items: productos.length, fotos: mias.length } };
}

const diasPrueba = (d: Pick<Borrador, "promo" | "promoOk">) => (d.promoOk && PROMO[d.promo] ? PROMO[d.promo]! : 30);
/* Código de promotor (F1): lo valida el servidor. */
export async function probarPromo(codigo: string) {
  const k = String(codigo ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
  return PROMO[k] ? { ok: true as const, dias: PROMO[k]! } : { ok: false as const };
}
