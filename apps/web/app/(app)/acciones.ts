"use server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { mismoOrigen, yo } from "@/lib/cuenta";
import { ubicacion } from "@/lib/ubicacion";
import { evento } from "@/lib/eventos";
import { cookieSegura } from "@/lib/cookie-segura";

export async function cambiarIdioma(lang: "es" | "en") {
  if (!(await mismoOrigen())) return;
  (await cookies()).set("tl_lang", lang === "en" ? "en" : "es", { path: "/", maxAge: 365 * 86400, sameSite: "lax", secure: await cookieSegura() });
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

/* Los toques de contacto (llamar, cómo llegar, compartir, escribir) ya no son una acción del servidor: salen con lib/contar-toque.ts
   (sendBeacon o fetch keepalive) a /api/toque, con las mismas reglas, ahora en lib/toques.ts. Una acción del servidor se cancelaba en Safari
   cuando la página abría tel: justo después, y el toque no se contaba (guardián toqueSobreviveSalida). */

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
  // AJ · Capa 3: con N reportes de cuentas distintas la foto se oculta sola y pasa a la segunda opinión (lib/fotos-revision.ts). Nunca rompe el reporte.
  await (await import("@/lib/fotos-revision")).revisarReportes(mediaId).catch(() => undefined);
  return { ok: true, on: true };
}

/* AJ · «Pedir revisión» de una foto que la revisión automática retuvo, rechazó u ocultó: una apelación por el camino de siempre (lib/apelaciones.ts
   apelar: una vez por foto, en com_apelar_dias, 20–500 letras, cola «apel»; la base comprueba que la foto es de quien la pide y que no se publicó).
   Una persona del equipo la decide (decidirApel → decidirFotoPorPersona). Los botones los pone R3. */
export async function pedirRevisionFoto(mediaId: string, texto: string): Promise<{ ok: true; numero: string } | { ok: false; entrar?: true; msg?: { es: string; en: string } }> {
  if (!(await mismoOrigen())) return { ok: false };
  if (typeof mediaId !== "string" || !UUID.test(mediaId)) return { ok: false };
  const u = await yo();
  if (!u) return { ok: false, entrar: true };
  const r = await (await import("@/lib/apelaciones")).apelar(u.id, "media", mediaId, String(texto ?? ""));
  return r.ok ? r : { ok: false, msg: r.msg };
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
