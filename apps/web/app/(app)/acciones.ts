"use server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { ipCliente, mismoOrigen, yo } from "@/lib/cuenta";
import { ubicacion } from "@/lib/ubicacion";
import { evento } from "@/lib/eventos";

export async function cambiarIdioma(lang: "es" | "en") {
  if (!(await mismoOrigen())) return;
  (await cookies()).set("tl_lang", lang === "en" ? "en" : "es", { path: "/", maxAge: 365 * 86400, sameSite: "lax" });
}

/* ── Acciones de las listas de negocios. El servidor valida todo; la pantalla solo pide. ── */

const ID_NEG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export type Respuesta = { ok: true; on?: boolean } | { ok: false; entrar?: true };

/* Guardar / quitar un negocio de Guardados. Sin sesión: la pantalla manda a entrar y vuelve. */
export async function guardarNegocio(id: string): Promise<Respuesta> {
  if (!(await mismoOrigen())) return { ok: false };
  if (typeof id !== "string" || !ID_NEG.test(id) || id.length > 80) return { ok: false };
  const u = await yo();
  if (!u) return { ok: false, entrar: true };
  const r = await db().query<{ on: boolean }>(
    `with existe as (select 1 from businesses where id = $2 and status = 'active'),
          quita as (delete from favorites where user_id = $1 and kind = 'business' and target_id = $2 returning 1),
          pone as (insert into favorites (user_id, kind, target_id)
                   select $1, 'business', $2 from existe where not exists (select 1 from quita) returning 1)
     select exists (select 1 from pone) as on`,
    [u.id, id],
  );
  return { ok: true, on: !!r.rows[0]?.on };
}

/* Toque de contacto (llamar, cómo llegar): alimenta las estadísticas del negocio en su panel. */
const TOQUES = new Set(["call", "whatsapp", "directions", "share", "calendar", "copy"]);
export async function registrarToque(id: string, kind: string, origen: string): Promise<void> {
  if (!(await mismoOrigen())) return;
  if (typeof id !== "string" || !ID_NEG.test(id) || !TOQUES.has(kind)) return;
  const [u, ip] = await Promise.all([yo(), ipCliente()]);
  // Cuenta para las cifras del panel: una vez cada 10 min por persona (o red) y negocio; máx. 60 por red y hora;
  // la gente del propio negocio no cuenta. Nadie puede inflar los contactos de un negocio.
  const t = await db().query<{ city: string }>(
    `insert into contact_taps (business_id, user_id, kind, source, ip)
     select b.id, $2, $3, left($4, 60), $5::inet from businesses b where b.id = $1 and b.status = 'active'
        and not exists (select 1 from business_members m where m.business_id = b.id and m.user_id = $2::uuid and m.status = 'active')
        and not exists (select 1 from contact_taps t where t.business_id = b.id and t.at > now() - interval '10 minutes'
                         and (($2::uuid is not null and t.user_id = $2::uuid) or ($2::uuid is null and $5::inet is not null and t.ip = $5::inet and t.user_id is null)))
        and ($5::inet is null or (select count(*) from contact_taps t where t.ip = $5::inet and t.at > now() - interval '1 hour') < 60)
     returning (select city_id from businesses where id = business_id) as city`,
    [id, u?.id ?? null, kind, String(origen ?? ""), ip],
  );
  if (t.rows[0]) await evento("contactar", { ref: id, ciudad: t.rows[0].city, userId: u?.id ?? null, props: { kind } });
}

/* «Avísame cuando haya»: guarda la búsqueda; cuando llegue un negocio que encaje, se avisa (Fase 2, notificaciones). */
export async function avisame(ciudad: string, cat: string, sub: string, filtros: string[]): Promise<Respuesta> {
  if (!(await mismoOrigen())) return { ok: false };
  const u = await yo();
  if (!u) return { ok: false, entrar: true };
  if (!/^[a-z]{3}$/.test(ciudad) || !/^NEG-[A-Z]+$/.test(cat)) return { ok: false };
  const f = (Array.isArray(filtros) ? filtros : []).filter((x) => typeof x === "string" && x.length <= 40).slice(0, 20);
  const s = typeof sub === "string" ? sub.slice(0, 80) : "";
  const nuevo = await db().query(
    `insert into search_alerts (user_id, city_id, query, filters)
     select $1, $2, $3, $4::jsonb
      where exists (select 1 from categories where id = $5)
        and not exists (select 1 from search_alerts where user_id = $1 and city_id = $2 and query = $3
                          and filters = $4::jsonb and removed_at is null)`,
    [u.id, ciudad, `${cat}${s ? " · " + s : ""}`, JSON.stringify({ cat, sub: s || null, filtros: f }), cat],
  );
  if (nuevo.rowCount) await evento("pedir_aviso", { ref: cat, ciudad, userId: u.id, props: { origen: "categoria" } });
  return { ok: true, on: true };
}

/* Reportar una foto (PhotoReport). La foto sigue visible mientras To'Latino la revisa. Una vez por persona y foto. */
const MOTIVOS = new Set(["no_es", "inapropiado", "datos", "spam", "otro"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export async function reportarFoto(mediaId: string, motivo: string, nota: string): Promise<Respuesta> {
  if (!(await mismoOrigen())) return { ok: false };
  if (typeof mediaId !== "string" || !UUID.test(mediaId) || !MOTIVOS.has(motivo)) return { ok: false };
  const u = await yo();
  if (!u) return { ok: false, entrar: true };
  const n = typeof nota === "string" ? nota.replace(/\s+/g, " ").trim().slice(0, 200) : "";
  const rep = await db().query(
    // El reporte y, si es el primero abierto de esa foto, su caso en la cola «Medios marcados» (uno por foto).
    `with ins as (
       insert into photo_reports (media_id, reporter_user_id, reason, note)
       select m.id, $2, $3, nullif($4, '') from media m where m.id = $1 and m.status = 'visible' and m.owner_kind = 'business'
       on conflict (media_id, reporter_user_id) do nothing returning media_id)
     insert into queue_items (queue, subject_kind, subject_id, business_id, city_id)
     select 'medios', 'media', m.id::text, m.owner_id, b.city_id from ins join media m on m.id = ins.media_id join businesses b on b.id = m.owner_id
     on conflict do nothing`,
    [mediaId, u.id, motivo, n],
  );
  await evento("reportar_foto", { ref: mediaId, userId: u.id, props: { motivo, caso: !!rep.rowCount } });
  return { ok: true, on: true };
}

/* «Avísame cuando haya» desde Buscar: guarda la búsqueda tal como se escribió (y la categoría, si había). */
export async function avisameBusqueda(q: string, catSlug: string | null): Promise<Respuesta> {
  if (!(await mismoOrigen())) return { ok: false };
  const u = await yo();
  if (!u) return { ok: false, entrar: true };
  const texto = typeof q === "string" ? q.replace(/\s+/g, " ").trim().slice(0, 120) : "";
  if (!texto) return { ok: false };
  const slug = typeof catSlug === "string" && /^[a-z-]{2,30}$/.test(catSlug) ? catSlug : null;
  const loc = await ubicacion(u);
  const nuevo = await db().query(
    `insert into search_alerts (user_id, city_id, query, filters)
     select $1, $4, $2, $3::jsonb
      where not exists (select 1 from search_alerts where user_id = $1 and city_id = $4 and lower(query) = lower($2) and removed_at is null)`,
    [u.id, texto, JSON.stringify({ cat: slug }), loc.ciudad],
  );
  if (nuevo.rowCount) await evento("pedir_aviso", { ref: slug, ciudad: loc.ciudad, userId: u.id, props: { origen: "buscar" } });
  return { ok: true, on: true };
}
