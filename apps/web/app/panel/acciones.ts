"use server";
import { claveAmenidad } from "@/lib/amenidades";
import { recalcularFiltrosSP } from "@/lib/salud-pro";
import { LIC_LEGAL, NO_HAGO } from "@/lib/no-hago";
import { mismoOrigen } from "@/lib/cuenta";
import { db, tx } from "@/lib/db";
import { accesoPanel, type Acceso } from "@/lib/panel";
import { aBase, diaValido, type DiaPanel } from "@/lib/panel-reglas";

/* Lo que el dueño cambia desde el panel (Tu página · Hoy · Fotos · Horario · Quiénes somos). Cada acción: mismo
   sitio, miembro activo con acceso a esa parte (decide el servidor), datos revisados, y una línea en la auditoría
   (solo inserción). La pantalla solo muestra. */
type Bi = { es: string; en: string };
export type Res = { ok: true } | { ok: false; mensaje: Bi };
const no = (es: string, en: string): Res => ({ ok: false, mensaje: { es, en } });
const SIN_ACCESO = no("No tienes acceso a esta parte del panel.", "You don’t have access to this part of the dashboard.");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

async function entrar(id: unknown, parte = "page"): Promise<Acceso | null> {
  if (!(await mismoOrigen())) return null;
  return typeof id === "string" ? accesoPanel(id, parte) : null;
}
async function auditar(a: Acceso, action: string, before: unknown, after: unknown) {
  await db().query(
    `insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, before, after) values ('user', $1, $2, 'business', $3, $4, $5::jsonb, $6::jsonb)`,
    [a.yo.id, action, a.negocio.id, a.negocio.city_id, JSON.stringify(before ?? null), JSON.stringify(after ?? null)]);
}
const esPro = async (id: string) => ((await db().query<{ plan: string }>(`select plan from business_stats_cache where business_id = $1`, [id])).rows[0]?.plan ?? "free") === "pro";
const recontarFotos = (id: string) =>
  db().query(`update business_stats_cache set photo_count = (select count(*) from media where owner_kind = 'business' and owner_id = $1 and status = 'visible'), updated_at = now() where business_id = $1`, [id]);

/* ── Hoy · «Cerrar por hoy» / «Abrir de nuevo» ── */
export async function cerrarPorHoy(id: string, cerrar: boolean): Promise<Res> {
  const a = await entrar(id, "ord");
  if (!a) return SIN_ACCESO;
  await db().query(
    `update businesses b set closed_on = case when $2 then (now() at time zone c.timezone)::date else null end, updated_at = now()
       from cities c where c.id = b.city_id and b.id = $1`, [a.negocio.id, !!cerrar]);
  await auditar(a, cerrar ? "panel.cerrar_hoy" : "panel.abrir_hoy", null, null);
  return { ok: true };
}

/* ── Fotos y portada ──
   Las fotos se suben con /api/medios (quedan a nombre de quien sube) y aquí pasan al negocio. La portada es siempre
   la primera de la galería (sort 0). El logo es una foto aparte (owner_kind 'logo'). */
export async function fotosAgregar(id: string, ids: string[], portada = false): Promise<Res> {
  const a = await entrar(id);
  if (!a) return SIN_ACCESO;
  const lista = Array.isArray(ids) ? ids.filter((x) => typeof x === "string" && UUID.test(x)).slice(0, 20) : [];
  if (!lista.length) return no("No llegó ninguna foto.", "No photo arrived.");
  const r = await tx(async (c) => {
    const n = (await c.query<{ n: number }>(`select count(*)::int as n from media where owner_kind = 'business' and owner_id = $1 and status = 'visible'`, [a.negocio.id])).rows[0]!.n;
    if (n + lista.length > 60) return "tope" as const;
    if (portada) await c.query(`update media set sort = sort + $2 where owner_kind = 'business' and owner_id = $1 and status = 'visible'`, [a.negocio.id, lista.length]);
    for (let i = 0; i < lista.length; i++) {
      await c.query(`update media set owner_kind = 'business', owner_id = $1, sort = $2 where id = $3::uuid and owner_kind = 'user' and owner_id = $4 and status = 'visible'`,
        [a.negocio.id, portada ? i : n + i, lista[i], a.yo.id]);
    }
    return "ok" as const;
  });
  if (r === "tope") return no("Tu galería llegó a 60 fotos. Quita alguna para subir más.", "Your gallery reached 60 photos. Remove some to add more.");
  await recontarFotos(a.negocio.id);
  await auditar(a, portada ? "panel.portada" : "panel.fotos_agregar", null, { media: lista });
  return { ok: true };
}

export async function fotosOrden(id: string, orden: string[]): Promise<Res> {
  const a = await entrar(id);
  if (!a) return SIN_ACCESO;
  if (!Array.isArray(orden) || orden.length > 60 || !orden.every((x) => typeof x === "string" && UUID.test(x))) return no("Ese orden no es válido.", "That order is not valid.");
  const r = await db().query(
    `update media m set sort = o.i - 1 from unnest($2::uuid[]) with ordinality o(id, i)
      where m.id = o.id and m.owner_kind = 'business' and m.owner_id = $1 and m.status = 'visible'`, [a.negocio.id, orden]);
  if (!r.rowCount) return no("No se encontraron esas fotos.", "Those photos were not found.");
  await auditar(a, "panel.fotos_orden", null, { orden });
  return { ok: true };
}

export async function fotoQuitar(id: string, mediaId: string): Promise<Res> {
  const a = await entrar(id);
  if (!a) return SIN_ACCESO;
  if (typeof mediaId !== "string" || !UUID.test(mediaId)) return no("Esa foto no existe.", "That photo doesn’t exist.");
  const n = (await db().query<{ n: number }>(`select count(*)::int as n from media where owner_kind = 'business' and owner_id = $1 and status = 'visible'`, [a.negocio.id])).rows[0]!.n;
  if (n <= 1) return no("Tu página necesita al menos una foto: sube otra antes de quitar esta.", "Your page needs at least one photo: upload another before removing this one.");
  const r = await db().query(
    `update media set status = 'removed', removed_reason = 'owner', removed_by = $3 where id = $2::uuid and owner_kind = 'business' and owner_id = $1 and status = 'visible'`,
    [a.negocio.id, mediaId, a.yo.id]);
  if (!r.rowCount) return no("Esa foto no existe.", "That photo doesn’t exist.");
  await recontarFotos(a.negocio.id);
  await auditar(a, "panel.foto_quitar", { media: mediaId }, null);
  return { ok: true };
}

export async function logoPoner(id: string, mediaId: string | null): Promise<Res> {
  const a = await entrar(id);
  if (!a) return SIN_ACCESO;
  if (mediaId !== null && (typeof mediaId !== "string" || !UUID.test(mediaId))) return no("Esa foto no existe.", "That photo doesn’t exist.");
  const antes = (await db().query<{ logo_url: string | null }>(`select logo_url from businesses where id = $1`, [a.negocio.id])).rows[0]?.logo_url ?? null;
  const ok = await tx(async (c) => {
    await c.query(`update media set status = 'removed', removed_reason = 'replaced', removed_by = $2 where owner_kind = 'logo' and owner_id = $1 and status = 'visible'`, [a.negocio.id, a.yo.id]);
    if (mediaId === null) { await c.query(`update businesses set logo_url = null, updated_at = now() where id = $1`, [a.negocio.id]); return true; }
    const m = (await c.query<{ url: string }>(
      `update media set owner_kind = 'logo', owner_id = $1, sort = 0 where id = $2::uuid and owner_kind = 'user' and owner_id = $3 and status = 'visible' returning url`,
      [a.negocio.id, mediaId, a.yo.id])).rows[0];
    if (!m) return false;
    await c.query(`update businesses set logo_url = $2, updated_at = now() where id = $1`, [a.negocio.id, m.url]);
    return true;
  });
  if (!ok) return no("Esa foto no existe.", "That photo doesn’t exist.");
  await auditar(a, mediaId ? "panel.logo" : "panel.logo_quitar", { logo: antes }, { media: mediaId });
  return { ok: true };
}

/* ── Horario ── Free: un tramo por día. Pro: dos. */
export async function horarioGuardar(id: string, dias: DiaPanel[]): Promise<Res> {
  const a = await entrar(id);
  if (!a) return SIN_ACCESO;
  if (!Array.isArray(dias) || dias.length !== 7) return no("Falta algún día.", "A day is missing.");
  const limpio: DiaPanel[] = dias.map((d) => ({ on: !!d?.on, a: Number(d?.a), b: Number(d?.b), two: !!d?.two, a2: Number(d?.a2), b2: Number(d?.b2) }));
  if (!limpio.every(diaValido)) return no("Revisa las horas: cada día cierra después de abrir.", "Check the hours: each day closes after it opens.");
  if (limpio.some((d) => d.on && d.two) && !(await esPro(a.negocio.id))) return no("Con Free: un horario por día. Dos tramos es de Pro.", "On Free: one window per day. Two windows are Pro.");
  const filas = aBase(limpio);
  const antes = (await db().query(`select weekday, open, ranges from business_hours where business_id = $1 and module = '' order by weekday`, [a.negocio.id])).rows;
  await tx(async (c) => {
    for (const f of filas) {
      await c.query(
        `insert into business_hours (business_id, module, weekday, open, ranges) values ($1, '', $2, $3, $4::jsonb)
         on conflict (business_id, module, weekday) do update set open = excluded.open, ranges = excluded.ranges`,
        [a.negocio.id, f.weekday, f.open, JSON.stringify(f.ranges)]);
    }
    await c.query(`update businesses set updated_at = now() where id = $1`, [a.negocio.id]);
  });
  await auditar(a, "panel.horario", antes, filas);
  return { ok: true };
}

/* ── Quiénes somos ── 300 caracteres por idioma; lo que hay en tu negocio = claves del catálogo de su categoría. */
export async function aboutGuardar(id: string, x: { es: string; en: string; amen: string[] }): Promise<Res> {
  const a = await entrar(id);
  if (!a) return SIN_ACCESO;
  const t = (s: unknown) => (typeof s === "string" ? s.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim() : "");
  const es = t(x?.es), en = t(x?.en);
  if (es.length > 300 || en.length > 300) return no("Máximo 300 letras.", "300 characters max.");
  const pedidas = Array.isArray(x?.amen) ? [...new Set(x.amen.filter((k) => typeof k === "string").map(claveAmenidad))].slice(0, 30) : [];
  const validas = (await db().query<{ key: string }>(
    `select key from amenities where key = any($2::text[]) and (categories = '{}' or $1 = any(categories))`, [a.negocio.category_id, pedidas])).rows.map((r) => r.key);
  const amen = pedidas.filter((k) => validas.includes(k));
  const antes = (await db().query(`select about, amenities from businesses where id = $1`, [a.negocio.id])).rows[0];
  const about = es || en ? { es, en } : null;
  // Si To'Latino lo había editado, gana lo último: lo del dueño (se quita la marca «EDITADO POR TO'LATINO»).
  await db().query(`update businesses set about = $2::jsonb, amenities = $3, admin_edits = admin_edits - 'about', updated_at = now() where id = $1`, [a.negocio.id, about ? JSON.stringify(about) : null, amen]);
  await auditar(a, "panel.about", antes, { about, amenities: amen });
  return { ok: true };
}

/* ── Verificación y sello ── Pedir el sello abre un caso en la cola «Sello de verificación» del Super Admin.
   «Ya lo mandé» (cuando To'Latino pidió un dato) lo devuelve a revisión; «Cancelar solicitud» lo saca de la cola. */
export async function selloPedir(id: string): Promise<Res> {
  const a = await entrar(id, "set");
  if (!a) return SIN_ACCESO;
  const r = await tx(async (c) => {
    const ult = (await c.query<{ id: string; status: string }>(`select id::text, status from verification_requests where business_id = $1 order by created_at desc limit 1 for update`, [a.negocio.id])).rows[0];
    if (ult && ["review", "ok"].includes(ult.status)) return ult.status === "ok" ? "ya" : "revision";
    const veces = (await c.query<{ n: number }>(`select count(*)::int as n from verification_requests where business_id = $1 and created_at > now() - interval '1 day'`, [a.negocio.id])).rows[0]!.n;
    if (veces >= 3) return "muchas";
    if (ult?.status === "info") {
      await c.query(`update verification_requests set status = 'review' where id = $1::bigint`, [ult.id]);
      await c.query(`insert into queue_items (queue, subject_kind, subject_id, business_id, city_id) values ('sello', 'verification_request', $1, $2, $3) on conflict do nothing`, [ult.id, a.negocio.id, a.negocio.city_id]);
    } else {
      const v = (await c.query<{ id: string }>(`insert into verification_requests (business_id, status) values ($1, 'review') returning id::text`, [a.negocio.id])).rows[0]!;
      await c.query(`insert into queue_items (queue, subject_kind, subject_id, business_id, city_id) values ('sello', 'verification_request', $1, $2, $3)`, [v.id, a.negocio.id, a.negocio.city_id]);
    }
    return null;
  });
  if (r === "ya") return no("Ya tienes el sello.", "You already have the badge.");
  if (r === "revision") return no("Tu solicitud ya está en revisión.", "Your request is already in review.");
  if (r === "muchas") return no("Ya pediste el sello varias veces hoy. Prueba mañana.", "You requested the badge several times today. Try tomorrow.");
  await auditar(a, "panel.sello_pedir", null, null);
  return { ok: true };
}
export async function selloCancelar(id: string): Promise<Res> {
  const a = await entrar(id, "set");
  if (!a) return SIN_ACCESO;
  await tx(async (c) => {
    const v = (await c.query<{ id: string }>(`update verification_requests set status = 'canceled' where business_id = $1 and status in ('review', 'info') returning id::text`, [a.negocio.id])).rows;
    for (const x of v) await c.query(`update queue_items set status = 'decided', decision = 'canceled', reason = 'El dueño canceló la solicitud', decided_at = now() where queue = 'sello' and subject_id = $1 and status = 'open'`, [x.id]);
  });
  await auditar(a, "panel.sello_cancelar", null, null);
  return { ok: true };
}

/* ── Tus licencias (Trámites y profesionales) ── Agregar una del catálogo (en revisión + caso en la cola Licencias),
   ponerle el número (vuelve a revisión), quitarla (retirada, nada se borra; queda al menos una) y «lo que no hago». */
export async function licenciaAgregar(id: string, kind: string, miembro?: string | null, numero?: string | null): Promise<Res> {
  const a = await entrar(id, "cat");
  if (!a) return SIN_ACCESO;
  if (typeof kind !== "string" || !/^[a-z]{2,12}$/.test(kind)) return no("Esa licencia no existe.", "That license doesn’t exist.");
  // 4h-3: la licencia de una persona del equipo (Doctores y Profesionales) lleva su número desde el principio.
  const mid = miembro == null ? null : String(miembro), num = typeof numero === "string" ? numero.trim().slice(0, 40) : "";
  if (mid !== null && !/^[0-9a-f-]{36}$/.test(mid)) return no("Esa persona ya no está en tu equipo.", "That person is no longer on your team.");
  if (mid !== null && !(a.negocio.category_id === "NEG-SALUD" || a.negocio.category_id === "NEG-PRO")) return no("Esa licencia no existe.", "That license doesn’t exist.");
  if (mid !== null && (!num || !/^[A-Za-z0-9 #./-]+$/.test(num))) return no("Escribe el número como sale en su licencia.", "Type the number as it appears on their license.");
  const r = await tx(async (c) => {
    const n = (await c.query<{ n: number }>(`select count(*)::int as n from licenses where business_id = $1 and created_at > now() - interval '1 day'`, [a.negocio.id])).rows[0]!.n;
    if (n >= 10) return "muchas";
    if (mid !== null && !(await c.query(`select 1 from business_members where id = $1::uuid and business_id = $2 and status = 'active'`, [mid, a.negocio.id])).rowCount) return "persona";
    const ins = (await c.query<{ id: string }>(
      `insert into licenses (business_id, city_id, kind, title, can, cannot, issuer, registry_url, status, source, sort, member_id, number)
       select $1, $2, k.key, k.title, k.can, coalesce(k.cannot, '[]'::jsonb), k.issuer->>'es', k.registry_url, 'review', 'panel',
              (select coalesce(max(sort), 0) + 1 from licenses where business_id = $1), $5::uuid, nullif($6, '')
         from license_kinds k where k.key = $3 and k.category_id = $4
       on conflict do nothing returning id::text`, [a.negocio.id, a.negocio.city_id, kind, a.negocio.category_id, mid, num])).rows[0];
    if (!ins) return "ya";
    await c.query(`insert into queue_items (queue, subject_kind, subject_id, business_id, city_id) values ('lic', 'license', $1, $2, $3)`, [ins.id, a.negocio.id, a.negocio.city_id]);
    return null;
  });
  if (r === "ya") return mid ? no("Esa persona ya tiene esa licencia.", "That person already has that license.") : no("Ya tienes esa licencia.", "You already have that license.");
  if (r === "persona") return no("Esa persona ya no está en tu equipo.", "That person is no longer on your team.");
  if (r === "muchas") return no("Agregaste muchas licencias hoy. Prueba mañana.", "You added many licenses today. Try tomorrow.");
  await auditar(a, "panel.licencia_agregar", null, mid ? { kind, persona: mid } : { kind });
  return { ok: true };
}
export async function licenciaNumero(id: string, licId: string, numero: string): Promise<Res> {
  const a = await entrar(id, "cat");
  if (!a) return SIN_ACCESO;
  const n = typeof numero === "string" ? numero.trim().slice(0, 40) : "";
  if (!/^\d{1,18}$/.test(String(licId))) return no("Esa licencia no existe.", "That license doesn’t exist.");
  if (!n || !/^[A-Za-z0-9 #./-]+$/.test(n)) return no("Escribe el número como sale en tu licencia.", "Type the number as it appears on your license.");
  const r = await tx(async (c) => {
    const l = (await c.query<{ id: string; number: string | null }>(`select id::text, number from licenses where id = $1::bigint and business_id = $2 and status <> 'withdrawn' for update`, [licId, a.negocio.id])).rows[0];
    if (!l) return "no";
    if (l.number === n) return null;
    // Un número nuevo se vuelve a revisar: sale «en revisión» hasta que el equipo lo confirme en el registro.
    await c.query(`update licenses set number = $2, status = 'review', updated_at = now() where id = $1::bigint`, [licId, n]);
    await c.query(`select licencias_refrescar($1)`, [a.negocio.id]);
    await recalcularFiltrosSP(c, a.negocio.id); // «El médico habla español» sale de las licencias verificadas del equipo
    await c.query(`insert into queue_items (queue, subject_kind, subject_id, business_id, city_id) values ('lic', 'license', $1, $2, $3) on conflict do nothing`, [l.id, a.negocio.id, a.negocio.city_id]);
    return null;
  });
  if (r) return no("Esa licencia no existe.", "That license doesn’t exist.");
  await auditar(a, "panel.licencia_numero", null, { licencia: licId });
  return { ok: true };
}
export async function licenciaQuitar(id: string, licId: string): Promise<Res> {
  const a = await entrar(id, "cat");
  if (!a) return SIN_ACCESO;
  if (!/^\d{1,18}$/.test(String(licId))) return no("Esa licencia no existe.", "That license doesn’t exist.");
  const r = await tx(async (c) => {
    const deP = (await c.query<{ m: string | null }>(`select member_id::text as m from licenses where id = $1::bigint and business_id = $2`, [licId, a.negocio.id])).rows[0];
    if (!deP) return "no";
    const vivas = (await c.query<{ n: number }>(`select count(*)::int as n from licenses where business_id = $1 and member_id is null and status <> 'withdrawn'`, [a.negocio.id])).rows[0]!.n;
    if (deP.m === null && vivas <= 1) return "una";
    const u = await c.query(`update licenses set status = 'withdrawn', updated_at = now() where id = $1::bigint and business_id = $2 and status <> 'withdrawn'`, [licId, a.negocio.id]);
    if (!u.rowCount) return "no";
    await c.query(`update queue_items set status = 'decided', decision = 'withdrawn', reason = 'El dueño la quitó', decided_at = now() where queue = 'lic' and subject_id = $1 and status = 'open'`, [String(licId)]);
    await c.query(`select licencias_refrescar($1)`, [a.negocio.id]);
    await recalcularFiltrosSP(c, a.negocio.id); // «El médico habla español» sale de las licencias verificadas del equipo
    return null;
  });
  if (r === "una") return no("Tu página necesita al menos una licencia aquí.", "Your page needs at least one license here.");
  if (r) return no("Esa licencia no existe.", "That license doesn’t exist.");
  await auditar(a, "panel.licencia_quitar", { licencia: licId }, null);
  return { ok: true };
}
export async function noHago(id: string, i: number): Promise<Res> {
  const a = await entrar(id, "cat");
  if (!a) return SIN_ACCESO;
  const x = NO_HAGO[Number(i)];
  if (!x) return no("Elige una opción.", "Pick an option.");
  const legal = (await db().query(`select 1 from licenses where business_id = $1 and status <> 'withdrawn' and kind = any($2::text[]) limit 1`, [a.negocio.id, LIC_LEGAL])).rowCount;
  if (!legal) return no("Esto es para negocios con licencia legal.", "This is for businesses with a legal license.");
  const antes = (await db().query(`select category_attrs->'cant' as cant from businesses where id = $1`, [a.negocio.id])).rows[0]?.cant ?? null;
  await db().query(`update businesses set category_attrs = jsonb_set(category_attrs, '{cant}', $2::jsonb), updated_at = now() where id = $1`, [a.negocio.id, JSON.stringify(x)]);
  await auditar(a, "panel.no_hace", antes, x);
  return { ok: true };
}
