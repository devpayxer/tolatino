import "server-only";
import type { PoolClient } from "pg";
import sharp from "sharp";
import { db } from "./db";
import { ANCHOS, cifrasGuardadas, clavesVariantes, variantesDe } from "./fotos-variantes";
import { borrarObjeto, existeObjeto, guardarObjeto, leerObjeto, mediosListos } from "./medios";
import { Fallos, porTandas } from "./barrido-uno";

/* Fotos a la medida · F3 · Las fotos de destino PRIVADO (docs/diseno/plan/fotos-a-la-medida.md F3 y fotos-revision-automatica.md, «Fotos que van
   solo a un negocio o al equipo»): la de una cita, una visita, un viaje o una mudanza, un presupuesto, un pre-estimado, una emergencia, el recibo
   de «Ayuda con…», la balanza del mercado, el daño de una renta y la línea de un estimado. Las sube /api/medios con destino=privado y NUNCA tienen
   dirección pública:
   - el archivo vive en privado/o/<uuid>.jpg (nginx nunca sirve /medios/privado/) y sus variantes WebP en privado/o/<uuid>.w<ancho>.webp;
   - la fila de media queda con private = true y url = /api/medios/privada/<uuid> (la ruta con permiso, app/api/medios/privada/[id]); las pantallas
     que leen media.url de su operación la pintan sin cambiar nada; nadie la cachea (private, no-store);
   - quién la ve lo decide permisoFotoPrivada, desde la fila y la operación a la que quedó adjunta (una consulta; el equipo, una segunda solo si
     hace falta): quien la subió, el cliente de la operación, el negocio que la recibe (dueño o equipo activo con «Pedidos») y To'Latino con un caso
     abierto de esa operación en su cola y su ciudad (auditado por la ruta). A quien no puede: 404, nunca 403.
   Una foto de destino privado tampoco se puede adjuntar a algo público (not private / not rev_sin_c2 en cada destino; guardián fotosPrivadasConPermiso).
   Lo que ya estaba bajo n/ antes de F3 lo mueve el barrido (barrerPrivadas). */
type Q = Pick<PoolClient, "query">;
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const ES_UUID = new RegExp(`^${UUID}$`);
export const llavePrivada = (uuid: string) => `privado/o/${uuid}.jpg`;
export const llaveVariantePrivada = (uuid: string, ancho: number) => `privado/o/${uuid}.w${ancho}.webp`;
export const urlPrivada = (uuid: string) => `/api/medios/privada/${uuid}`;
export const DE_URL_PRIVADA = new RegExp(`^/api/medios/privada/(${UUID})$`);

/* La llave del almacén que corresponde a media.url (las purgas y el barrido): /medios/<llave> (lo público), privado/<…> (las privadas de antes:
   Mensajes, ayuda de Salud y Pro, entrega, reclamo) o /api/medios/privada/<uuid> (F3). Cualquier otra cosa (Pexels de la semilla, «borrada»): null. */
export function llaveDeUrl(url: string | null | undefined): string | null {
  const u = url ?? "";
  const p = DE_URL_PRIVADA.exec(u);
  if (p) return llavePrivada(p[1]!);
  if (/^\/medios\/[a-z0-9][a-z0-9/._-]{2,120}$/.test(u)) return u.slice("/medios/".length);
  if (/^privado\/[a-z0-9][a-z0-9/._-]{2,120}$/.test(u) && u !== "privado/borrada") return u;
  return null;
}

/* Las variantes de una privada: como las públicas (lib/fotos-variantes.ts variantesDe: los mismos anchos y la misma calidad), bajo privado/o/. Nunca
   lanza: si algo falla, la ruta entrega la maestra y el barrido las completa. Después de guardar se confirma que la maestra sigue (la purga de una
   cuenta pudo sacarla mientras tanto): si no, las recién guardadas también salen. */
export async function guardarVariantesPrivadas(uuid: string, maestra: Buffer, anchoMaestra?: number | null): Promise<"ok" | "ilegible" | "sin_maestra" | "fallo"> {
  if (!ES_UUID.test(uuid)) return "ilegible";
  return guardarVariantesEn(llavePrivada(uuid), maestra, anchoMaestra);
}

/* F3b (22 nov) · Las privadas de las OTRAS rutas, cada una con su propio permiso: Mensajes (privado/m/, /api/mensajes/foto/<id>), ayuda de Salud y Pro
   y casos de Soporte (privado/a/, /api/ayuda/foto/<id>), entrega (privado/e/, /api/entrega/foto/<id>) y reclamo (privado/r/, /api/admin/reclamo/<CL>).
   Sus variantes, como las de privado/o/: los mismos anchos y la misma calidad (variantesDe), al lado de su maestra con el nombre fijo
   privado/<familia>/<uuid>.w<ancho>.webp; nunca bajo n/ ni con otra ruta: las sirve SU MISMA ruta con `?w=`, después de SU permiso (llavesAEntregar).
   La id del nombre es la de la fila de media. */
const MAESTRA_PRIVADA = new RegExp(`^privado/([oamer])/(${UUID})\\.jpg$`);
export const llaveVarianteDe = (llave: string, ancho: number): string | null => {
  const m = MAESTRA_PRIVADA.exec(llave);
  return m ? `privado/${m[1]}/${m[2]}.w${ancho}.webp` : null;
};

/* Genera y guarda las variantes de una maestra privada (cualquier familia) y las anota en SU fila (la id del nombre). Nunca lanza: la subida vale
   aunque fallen (la ruta entrega la maestra). Sin el ancho, se lee de la maestra. Después de guardar se confirma que la maestra sigue (una purga pudo
   sacarla mientras tanto): si no, las recién guardadas también salen. */
export async function guardarVariantesEn(llave: string, maestra: Buffer, anchoMaestra?: number | null): Promise<"ok" | "ilegible" | "sin_maestra" | "fallo"> {
  const m = MAESTRA_PRIVADA.exec(llave);
  if (!m) return "ilegible";
  const id = m[2]!;
  let vs: { width: number; buffer: Buffer }[], ancho = anchoMaestra ?? 0;
  try {
    if (!ancho) ancho = (await sharp(maestra, { limitInputPixels: 50_000_000 }).metadata()).width ?? 0;
    vs = await variantesDe(maestra, ancho);
    if (!vs.length) return "ilegible";
  } catch { return "ilegible"; }
  try {
    await Promise.all(vs.map((v) => guardarObjeto(llaveVarianteDe(llave, v.width)!, v.buffer, "image/webp")));
    if (!(await existeObjeto(llave))) {
      await Promise.all(vs.map((v) => borrarObjeto(llaveVarianteDe(llave, v.width)!).catch(() => undefined)));
      return "sin_maestra";
    }
    await db().query(`update media set bytes = $2, var_widths = $3::smallint[], var_bytes = $4::int[], var_at = now(), w = coalesce(w, $5) where id = $1::uuid and private`,
      [id, maestra.length, vs.map((v) => v.width), vs.map((v) => v.buffer.length), ancho]);
    return "ok";
  } catch { return "fallo"; }
}

/* Lo que entrega la ruta de una privada DESPUÉS de su permiso: con `?w=` (320, 640, 1080 o 1600), si el navegador acepta WebP y esa variante está
   anotada en la fila, la variante y, si falta en el almacén, la maestra; si no, solo la maestra. Nunca decide quién la ve: eso ya lo hizo la ruta. */
export function llavesAEntregar(req: Request, llave: string, varWidths: number[] | null | undefined): { clave: string; tipo: string }[] {
  const maestra = { clave: llave, tipo: "image/jpeg" };
  if (!MAESTRA_PRIVADA.test(llave)) return [maestra];
  const wq = Number(new URL(req.url).searchParams.get("w") ?? ""), w = Number.isInteger(wq) && wq > 0 ? wq : null;
  const anchos = (varWidths ?? []).map(Number).filter((a) => a > 0).sort((a, b) => a - b);
  const a = anchoServido(anchos, w, /image\/webp/i.test(req.headers.get("accept") ?? ""));
  return a ? [{ clave: llaveVarianteDe(llave, a)!, tipo: "image/webp" }, maestra] : [maestra];
}

/* Borrar una foto privada (purga, retención, cuenta borrada): la maestra PRIMERO y después todas sus variantes que pueden existir (clavesVariantes):
   si guardarVariantesEn está generando en ese momento, al terminar ve que la maestra ya no está y saca las suyas. Un error del almacén se lanza
   (quien llama deja la foto para la próxima vuelta). */
export async function borrarConVariantes(llave: string, ancho?: number | null, hechos?: number[] | null): Promise<void> {
  await borrarObjeto(llave);
  for (const v of clavesVariantes(llave, ancho, hechos)) await borrarObjeto(v);
}

/* ── El permiso ──
   Lo que la ruta sabe de quién pide: su cuenta (o nadie) y, solo si hace falta, si es del equipo de To'Latino con sus colas y ciudades (y si dio
   el motivo de «vidrio roto» para una ayuda de Salud). Para la prueba, `equipo` es una función: así no se pregunta si no hace falta. */
export type EquipoFoto = { id: string; colas: readonly string[]; ciudades: readonly string[]; vidrio: (ayuda: string) => Promise<boolean> };
export type CasoFoto = { cola: string; ciudad: string | null; kind: string; ref: string; salud: boolean };
export type PermisoFoto =
  | { ok: false }
  | { ok: true; por: "subio" | "cliente" | "negocio"; llave: string; anchos: number[] }
  | { ok: true; por: "equipo"; llave: string; anchos: number[]; caso: CasoFoto; staff: string };

/* Los dos lados de la operación a la que quedó adjunta la foto (cliente, negocio, operación), según su dueño en media:
   appointment / trip → la operación · line → la línea del pedido del mercado · estimate_line → la línea del estimado · help → la ayuda ·
   request → la solicitud y cada negocio al que se mandó · user → todavía de quien la subió, o el daño de una renta (rentals.damage_photo).
   Todas por llave primaria o índice (owner_id numérico → bigint; rentals_dano_foto_idx de 0197): una pasada, sin N+1. */
const LADOS = `
  m as (select x.id, x.owner_kind, x.uploaded_by, x.var_widths, case when x.owner_id ~ '^[0-9]{1,18}$' then x.owner_id::bigint end as nid
          from media x where x.id = $1::uuid and x.private and x.status = 'visible' and x.purged_at is null and x.url = '/api/medios/privada/' || $1::text),
  lado as (
    select o.user_id as cliente, o.business_id as negocio, o.id as op from m join operations o on m.owner_kind in ('appointment', 'trip') and o.id = m.nid
    union all select o.user_id, o.business_id, o.id from m join operation_lines l on m.owner_kind = 'line' and l.id = m.nid join operations o on o.id = l.operation_id
    union all select o.user_id, o.business_id, o.id from m join estimate_lines e on m.owner_kind = 'estimate_line' and e.id = m.nid join operations o on o.id = e.operation_id
    union all select h.user_id, h.business_id, h.operation_id from m join help_requests h on m.owner_kind = 'help' and h.id = m.nid
    union all select r.user_id, r.business_id, r.operation_id from m join rentals r on m.owner_kind = 'user' and r.damage_photo = m.id
    union all select s.user_id, t.business_id, s.operation_id from m join service_requests s on m.owner_kind = 'request' and s.id = m.nid join request_targets t on t.request_id = s.id)`;
const COLAS_AYUDA = ["sop", "cuidado", "salir", "estafa"];

export async function permisoFotoPrivada(q: Q, id: string, quien: { userId: string | null; equipo?: () => Promise<EquipoFoto | null> }): Promise<PermisoFoto> {
  if (!ES_UUID.test(id) || !quien.userId) return { ok: false };
  const r = (await q.query<{ subio: string | null; anchos: number[] | null; cliente: boolean; negocio: boolean }>(
    `with ${LADOS}
     select m.uploaded_by::text as subio, m.var_widths as anchos,
            exists (select 1 from lado where lado.cliente = $2::uuid) as cliente,
            exists (select 1 from business_members bm join businesses b on b.id = bm.business_id
                     where bm.business_id in (select negocio from lado) and bm.user_id = $2::uuid and bm.status = 'active' and bm.panel_off_at is null
                       and b.status <> 'merged' and (bm.kind = 'owner' or 'all' = any(bm.panel_access) or 'ord' = any(bm.panel_access))) as negocio
       from m`, [id, quien.userId])).rows[0];
  if (!r) return { ok: false };
  const base = { llave: llavePrivada(id), anchos: (r.anchos ?? []).map(Number).filter((a) => a > 0).sort((a, b) => a - b) };
  if (r.subio === quien.userId) return { ok: true, por: "subio", ...base };
  if (r.cliente) return { ok: true, por: "cliente", ...base };
  if (r.negocio) return { ok: true, por: "negocio", ...base };
  // El equipo: solo con un caso ABIERTO de esa operación en una cola que ve y en su ciudad (Ayuda con… o el daño de una renta).
  const e = quien.equipo ? await quien.equipo() : null;
  if (!e || !e.colas.length) return { ok: false };
  const C = (await q.query<CasoFoto>(
    `with ${LADOS}
     select q.queue as cola, q.city_id as ciudad, q.subject_kind as kind, q.subject_id as ref,
            (q.subject_kind = 'help_request' and exists (select 1 from help_requests h join businesses b on b.id = h.business_id
                                                          where h.id::text = q.subject_id and b.category_id = 'NEG-SALUD')) as salud
       from queue_items q
      where q.status = 'open' and (
            (q.queue = any($2::text[]) and q.subject_kind = 'help_request' and q.subject_id in (select h.id::text from help_requests h where h.operation_id in (select op from lado where op is not null)))
         or (q.queue = 'renta' and q.subject_kind = 'rental' and q.subject_id in (select x.id::text from rentals x where x.operation_id in (select op from lado where op is not null))))
      order by q.id`, [id, COLAS_AYUDA])).rows;
  for (const c of C) {
    if (!e.colas.includes(c.cola) || (e.ciudades.length && !(c.ciudad && e.ciudades.includes(c.ciudad)))) continue;
    // 9j · Una ayuda de Salud: además, el motivo escrito y vigente de esta persona («vidrio roto»), como la foto de la ayuda.
    if (c.salud && !(await e.vidrio(c.ref))) continue;
    return { ok: true, por: "equipo", ...base, caso: c, staff: e.id };
  }
  return { ok: false };
}

/* La variante que pide `?w=` (el ancho de la caja × 2, como fotoSrc): la más angosta de las que existen que alcanza; si ninguna alcanza, la más
   grande. Sin `w`, sin variantes o sin WebP en Accept: la maestra. */
export function anchoServido(anchos: number[], w: number | null, aceptaWebp: boolean): number | null {
  if (!aceptaWebp || !w || !anchos.length || !(ANCHOS as readonly number[]).includes(w)) return null;
  return anchos.find((a) => a >= w) ?? anchos[anchos.length - 1]!;
}

/* ── El barrido (lib/barrido.ts, cada minuto): barrerPrivadas ──
   1) Las fotos de destino privado que quedaron bajo n/ ANTES de F3 (filas con rev_sin_c2 y sin private; 0197 marca también las de antes de la
      marca: las de una solicitud, cita, viaje, línea, estimado, ayuda o daño de renta): la maestra se copia a privado/o/<uuid>.jpg, la fila pasa a
      private con su dirección privada, la copia de su dirección en una visita (operations.details.preFotos) se reescribe, y DESPUÉS la maestra y
      sus variantes salen de n/ (el borde de Cloudflare: LAUNCH). Una retenida o rechazada (su archivo ya está en privado/rev/) solo cambia la fila.
   2) Las privadas sin variantes (un fallo al subir): se completan.
   Por tandas, con tope de tiempo; un error del almacén deja la foto para la próxima vuelta. Idempotente. */
export const TANDA_PRIVADAS = 20;
export async function barrerPrivadas(): Promise<{ movidas: number; sinArchivo: number; variantes: number; fallos: number }> {
  const out = { movidas: 0, sinArchivo: 0, variantes: 0, fallos: 0 };
  if (!mediosListos()) return out;
  const t0 = Date.now();
  const V = (await db().query<{ id: string; url: string; status: string; w: number | null; var_widths: number[] | null }>(
    `select id::text, url, status, w, var_widths from media where rev_sin_c2 and not private and purged_at is null
      order by created_at limit ${TANDA_PRIVADAS}`)).rows;
  for (const f of V) {
    if (Date.now() - t0 > 20_000) break;
    try { out[(await moverAPrivada(f)) ? "movidas" : "sinArchivo"]++; } catch { out.fallos++; }
  }
  const S = (await db().query<{ id: string; w: number | null }>(
    `select id::text, w from media where private and var_at is null and status = 'visible' and purged_at is null and url like '/api/medios/privada/%'
        and created_at < now() - interval '2 minutes' order by created_at limit ${TANDA_PRIVADAS}`)).rows;
  for (const f of S) {
    if (Date.now() - t0 > 40_000) break;
    let maestra: Buffer;
    try { maestra = await leerObjeto(llavePrivada(f.id)); }
    catch (e) {
      if (/^almacenamiento 404\b/.test(String((e as Error)?.message ?? e))) await db().query(`update media set var_widths = '{}', var_bytes = '{}', var_at = now() where id = $1::uuid and var_at is null`, [f.id]);
      else out.fallos++;
      continue;
    }
    if ((await guardarVariantesPrivadas(f.id, maestra, f.w)) === "ok") out.variantes++; else out.fallos++;
  }
  return out;
}

/* F3b (22 nov) · barrerVariantesDeRuta (lib/barrido.ts, tarea fotosVariantesRuta, cada minuto): las privadas de las OTRAS rutas (Mensajes privado/m/,
   ayuda privado/a/, entrega privado/e/, reclamo privado/r/) subidas ANTES de que se generaran sus variantes. Mientras no tengan, su ruta entrega la
   maestra (nunca una foto rota). Una en revisión (Mensajes) también: es la misma foto y la ve quien la subió.
   - La selección es el predicado del índice parcial media_privadas_ruta_sin_variantes_idx (0210), la más vieja primero: sin él recorría media entera
     cada minuto. Una con variantes (o con '{}') sale del índice: idempotente.
   - Por tandas de TANDA_PRIVADAS, hasta TANDAS_RUTA por vuelta y con tope de tiempo (lib/barrido-uno.ts porTandas + Fallos): una foto que falla (el
     almacén no contesta) no detiene a las demás ni vuelve a ocupar la tanda en la misma vuelta; al final la tarea sale fallida diciendo cuáles.
   - Nunca una variante de una foto purgada u oculta: justo antes se vuelve a leer la fila (visible o en revisión, sin purgar, con la MISMA dirección);
     guardarVariantesEn confirma que la maestra sigue después de guardar (la purga la saca primero); y si al terminar la fila quedó purgada, sus
     variantes salen. Una maestra que ya no está o no se puede leer queda con '{}' (no se reintenta cada minuto). La maestra no se toca. */
const TANDAS_RUTA = 5, PRESUPUESTO_RUTA_MS = 20_000;
const SIN_VARIANTES_RUTA = `update media set var_widths = '{}', var_bytes = '{}', var_at = now() where id = $1::uuid and var_at is null and purged_at is null`;
export async function barrerVariantesDeRuta(): Promise<{ variantes: number; sinArchivo: number }> {
  const out = { variantes: 0, sinArchivo: 0 };
  if (!mediosListos()) return out;
  const t0 = Date.now(), B = new Fallos("fotosVariantesRuta");
  await porTandas(B, TANDA_PRIVADAS, async (vistos) => (Date.now() - t0 > PRESUPUESTO_RUTA_MS ? [] : (await db().query<{ id: string; url: string; w: number | null }>(
    `select id::text, url, w from media where private and var_at is null and status in ('visible', 'review') and purged_at is null and url ~ '^privado/[amer]/'
        and created_at < now() - interval '2 minutes' and not (id = any($1::uuid[])) order by created_at limit ${TANDA_PRIVADAS}`, [vistos])).rows),
  (f) => f.id, async (f) => {
    if (Date.now() - t0 > PRESUPUESTO_RUTA_MS) return;
    const m = MAESTRA_PRIVADA.exec(f.url);
    if (!m || m[2] !== f.id) { await db().query(SIN_VARIANTES_RUTA, [f.id]); out.sinArchivo++; return; }
    const sigue = await db().query(`select 1 from media where id = $1::uuid and private and var_at is null and status in ('visible', 'review') and purged_at is null and url = $2`, [f.id, f.url]);
    if (!sigue.rowCount) return;
    let maestra: Buffer;
    try { maestra = await leerObjeto(f.url); }
    catch (e) {
      if (!/^almacenamiento 404\b/.test(String((e as Error)?.message ?? e))) throw e;
      await db().query(SIN_VARIANTES_RUTA, [f.id]); out.sinArchivo++; return;
    }
    const r = await guardarVariantesEn(f.url, maestra, f.w);
    if (r === "fallo") throw new Error("el almacén no guardó sus variantes");
    if (r !== "ok") { await db().query(SIN_VARIANTES_RUTA, [f.id]); out.sinArchivo++; return; }
    const x = (await db().query<{ purgada: boolean; w: number | null; anchos: number[] | null }>(`select purged_at is not null as purgada, w, var_widths as anchos from media where id = $1::uuid`, [f.id])).rows[0];
    if (!x || x.purgada) { for (const v of clavesVariantes(f.url, x?.w, x?.anchos)) await borrarObjeto(v); return; }
    out.variantes++;
  }, { tandas: TANDAS_RUTA });
  B.fin();
  return out;
}

/* Una foto de antes de F3: true si su archivo pasó a la llave privada; false si ya no había archivo en n/ (la fila igual queda privada). */
async function moverAPrivada(f: { id: string; url: string; status: string; w: number | null; var_widths: number[] | null }): Promise<boolean> {
  const nueva = urlPrivada(f.id), vieja = f.url;
  const publica = /^\/medios\/n\/[0-9a-f-]{36}\.jpg$/.test(vieja) ? vieja.slice("/medios/".length) : null;
  let hubo = false;
  if (f.status === "visible" && publica) {
    try { await guardarObjeto(llavePrivada(f.id), await leerObjeto(publica), "image/jpeg"); hubo = true; }
    catch (e) { if (!/^almacenamiento 404\b/.test(String((e as Error)?.message ?? e))) throw e; }
  }
  const c = await db().connect();
  try {
    await c.query("begin");
    const u = await c.query(`update media set url = $2, private = true, var_widths = null, var_bytes = null, var_at = null where id = $1::uuid and not private and purged_at is null`, [f.id, nueva]);
    // La única copia de la dirección como texto: las fotos de un pre-estimado o presupuesto que viajan a la visita (lib/visitas.ts preFotos).
    if (u.rowCount) await c.query(
      `update operations o set details = jsonb_set(o.details, '{preFotos}', (select coalesce(jsonb_agg(case when e = to_jsonb($2::text) then to_jsonb($3::text) else e end), '[]'::jsonb)
                                                                               from jsonb_array_elements(o.details->'preFotos') e))
        where o.id in (select s.operation_id from media x join service_requests s on x.owner_kind = 'request' and x.owner_id ~ '^[0-9]{1,18}$' and s.id = x.owner_id::bigint where x.id = $1::uuid)
          and jsonb_typeof(o.details->'preFotos') = 'array' and o.details->'preFotos' ? $2::text`, [f.id, vieja, nueva]);
    await c.query("commit");
  } catch (e) { await c.query("rollback").catch(() => undefined); throw e; } finally { c.release(); }
  if (publica) {
    await borrarObjeto(publica);
    for (const v of clavesVariantes(publica, f.w, f.var_widths)) await borrarObjeto(v);
  }
  if (hubo) { try { await guardarVariantesPrivadas(f.id, await leerObjeto(llavePrivada(f.id)), f.w); } catch { /* el paso 2 las completa */ } }
  return hubo || f.status !== "visible";
}

/* La lista de llaves de variantes privadas que pueden existir (la purga de una cuenta las saca con la maestra: clavesVariantes ya las conoce). */
export const llavesPrivadasDe = (uuid: string, ancho?: number | null, hechos?: number[] | null) => clavesVariantes(llavePrivada(uuid), ancho, hechos);

/* F4 · Las cifras de las fotos privadas para el Super Admin (la hermana de cifrasFotos, lib/fotos-variantes.ts, que solo cuenta las públicas): las que se
   ven (visibles, sin purgar) de destino privado (/api/medios/privada/) y, desde el 22 nov, también las de las otras rutas (Mensajes privado/m/, ayuda
   privado/a/, entrega privado/e/, reclamo privado/r/): el espejo ve todo lo que existe. Una fila por archivo (la id es la del nombre). Un derivado
   (0210 media_cifras_cache, que rehace el barrido cada 10 minutos): nunca un recorrido de media en cada carga (cifrasGuardadas). Solo números: nunca
   sale una foto, una persona ni una dirección. */
export type CifrasFotosPrivadas = { privadas: number; convertidas: number; pendientes: number; sinMaestra: number; bytesMaestras: number; bytesVariantes: number };
export async function cifrasFotosPrivadas(): Promise<CifrasFotosPrivadas> {
  const { priv: r } = await cifrasGuardadas();
  return { privadas: r.total, convertidas: r.convertidas, pendientes: r.pendientes, sinMaestra: r.sin_maestra, bytesMaestras: r.bytes_maestras, bytesVariantes: r.bytes_variantes };
}
