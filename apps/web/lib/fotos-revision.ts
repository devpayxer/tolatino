import "server-only";
import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { avisar } from "./avisos";
import { db, tx } from "./db";
import { clavesVariantes, guardarVariantes } from "./fotos-variantes";
import { decidir, memoriaDe, MOTIVO_TEXTO, umbralesDe, type Capa, type Decision, type EntradaDecision, type Memoria, type Motivo, type MotivoRechazo, type Umbrales, type VeredictoGuardado } from "./fotos-decision";
import { segundaOpinion, type ResultadoSegunda } from "./fotos-segunda-opinion";
import { borrarObjeto, guardarObjeto, leerObjeto, mediosListos } from "./medios";
import { reglasMod } from "./moderacion";
import { revisarImagen } from "./moderacion-img";

/* Revisión automática de las fotos públicas (decisión AJ, 20 nov; docs/diseno/plan/fotos-revision-automatica.md). El servidor decide solo, en
   cuatro capas, y al fundador solo le llegan las apelaciones. La decisión es PURA (lib/fotos-decision.ts decidir); aquí se juntan sus entradas
   (memoria por contenido, modelo propio, confianza, segunda opinión) y se APLICA lo que dice:
   - visible: la maestra en n/<uuid>.jpg (+ variantes). Lo hace la subida (app/api/medios) o, más tarde, publicarDeRevision().
   - retenida o rechazada: la maestra SOLO en privado/rev/<uuid>.jpg (nginx nunca sirve /medios/privado/), la fila sin dirección pública que
     se pueda adjuntar (status 'review' o 'removed' + removed_reason 'revision'), aviso a quien la subió y «Pedir revisión» (appeals).
   - cada veredicto: una fila en photo_reviews (solo inserción) EN LA MISMA TRANSACCIÓN que el cambio de estado (anotarVeredicto con el cliente
     de la transacción; guardián fotosRevisionAuditada).
   Capa 3 (reportarFoto): con N reportes de cuentas distintas la foto (y sus copias, que comparten el archivo) deja de verse por el mismo camino
   con que una persona la quita en «Medios marcados» (status fuera de 'visible' y la cuenta de fotos del negocio), su archivo sale de n/ a la
   llave privada (las variantes se quitan: se rehacen al volver) y pasa a la capa 2 en el momento; si la capa 2 la aprueba, vuelve.
   El barrido (barrerRevision, cada minuto) reintenta las retenidas por tandas, con tope de intentos y el tope de gasto de la capa 2. */
type Q = Pick<PoolClient, "query">;
type Bi = { es: string; en: string };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const DE_URL = /^\/medios\/n\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jpg$/;
export const llaveRevision = (uuid: string) => `privado/rev/${uuid}.jpg`;
export const huella = (b: Buffer) => createHash("sha256").update(b).digest("hex");

/* ── Las reglas de las cuatro capas (Contenido › Auto-moderación: foto1…foto4), acotadas a sus límites ── */
export type ReglasFotos = {
  c1: { on: boolean; umbrales: Umbrales };
  c2: { on: boolean; esperaMs: number; intentos: number };
  c3: { on: boolean; reportes: number; edadH: number };
  c4: { on: boolean; fotos: number; dias: number; nuevaDias: number; nuevaHora: number };
};
const entre = (v: unknown, d: number, a: number, b: number) => { const n = typeof v === "number" || (typeof v === "string" && v.trim()) ? Number(v) : NaN; return Math.round(Math.min(b, Math.max(a, Number.isFinite(n) ? n : d))); };
export async function reglasFotos(c?: Q): Promise<ReglasFotos> {
  const R = await reglasMod(c);
  return {
    c1: { on: R.foto1.on, umbrales: umbralesDe(R.foto1.p) },
    c2: { on: R.foto2.on, esperaMs: entre(R.foto2.p.espera_s, 8, 3, 20) * 1000, intentos: entre(R.foto2.p.intentos, 5, 1, 10) },
    c3: { on: R.foto3.on, reportes: entre(R.foto3.p.reportes, 3, 2, 50), edadH: entre(R.foto3.p.edad_h, 72, 0, 720) },
    c4: { on: R.foto4.on, fotos: entre(R.foto4.p.fotos, 10, 1, 100), dias: entre(R.foto4.p.dias, 90, 7, 365), nuevaDias: entre(R.foto4.p.nueva_dias, 7, 0, 60), nuevaHora: entre(R.foto4.p.nueva_hora, 10, 1, 60) },
  };
}

/* ── Tope de subidas por hora: 60 para todos; una cuenta nueva (< nueva_dias), el de la capa 4 (10 por defecto). Vale aunque la capa 4 esté
   apagada (es antiabuso, no confianza). ── */
export async function topeSubidas(userId: string, R: ReglasFotos): Promise<{ n: number; tope: number; nueva: boolean }> {
  const r = (await db().query<{ n: number; nueva: boolean }>(
    `select (select count(*)::int from media where uploaded_by = $1 and created_at > now() - interval '1 hour') as n,
            coalesce((select created_at > now() - make_interval(days => $2) from users where id = $1), true) as nueva`, [userId, R.c4.nuevaDias])).rows[0]!;
  return { n: r.n, nueva: r.nueva, tope: r.nueva ? Math.min(60, R.c4.nuevaHora) : 60 };
}

/* ── Memoria por contenido (sha256 de la maestra normalizada): los veredictos que miraron ese contenido, del más nuevo al más viejo ── */
export async function memoria(sha: string, userId: string | null, c: Q = db()): Promise<Memoria> {
  const V = (await c.query<VeredictoGuardado>(
    `select decision, capa, coalesce(uploader_id = $2::uuid, false) as mio, motivo from photo_reviews
      where sha256 = $1 and decision in ('publicar', 'rechazar') and capa in ('c1', 'c2', 'persona') order by id desc limit 50`, [sha, userId])).rows;
  return memoriaDe(V);
}

/* ── Capa 4 · Confianza ganada: quien sube es dueño o equipo activo de un negocio verificado (sello, reclamo aprobado o licencia válida) con ≥ N
   fotos visibles, ninguna quitada ni oculta por reportes en D días, y a esta persona no se le rechazó ni ocultó ninguna en D días. ── */
export async function confianza(userId: string, R: ReglasFotos): Promise<boolean> {
  if (!R.c4.on) return false;
  return !!(await db().query<{ v: boolean }>(
    `select exists (
       select 1 from business_members bm join businesses b on b.id = bm.business_id
        where bm.user_id = $1 and bm.status = 'active' and bm.kind in ('owner', 'staff') and b.status = 'active'
          and (exists (select 1 from business_stats_cache s where s.business_id = b.id and s.verified)
               or exists (select 1 from claims cl where cl.business_id = b.id and cl.status = 'approved')
               or exists (select 1 from licenses l where l.business_id = b.id and l.status = 'valid'))
          and (select count(*) from media m where m.owner_kind = 'business' and m.owner_id = b.id and m.status = 'visible') >= $2
          and not exists (select 1 from media m where m.owner_kind = 'business' and m.owner_id = b.id
                            and ((m.status = 'removed' and m.removed_at > now() - make_interval(days => $3)) or (m.status = 'review' and m.rev_capa = 'c3'))))
       and not exists (select 1 from photo_reviews r where r.uploader_id = $1 and r.decision in ('rechazar', 'ocultar') and r.created_at > now() - make_interval(days => $3)) as v`,
    [userId, R.c4.fotos, R.c4.dias])).rows[0]?.v;
}

/* La segunda opinión que falló por cualquier cosa (la base, la privacidad, el almacén): fallo cerrado, la foto queda retenida. */
const SIN_RESPUESTA: ResultadoSegunda = { estado: "sin_respuesta", modelo: null, costo: 0, tokens: { entrada: 0, salida: 0 }, ms: 0 };

/* ── La revisión de una foto que alguien quiere publicar (en el mismo pedido de la subida). Nada se guarda aquí: decide. ── */
export type Revision = { id: string; d: Exclude<Decision, { estado: "pedir_c2" }>; c2: ResultadoSegunda | null; modeloC1: string | null };
export async function revisarSubida(x: { id: string; datos: Buffer; sha: string; userId: string }, R: ReglasFotos): Promise<Revision> {
  const mem = await memoria(x.sha, x.userId);
  let puntaje: number | null = null;
  if (!mem && R.c1.on) puntaje = (await revisarImagen(x.datos, R.c1.umbrales.duda)).desnudez;
  const dudosa = puntaje !== null && puntaje >= R.c1.umbrales.duda && puntaje < R.c1.umbrales.rechazo;
  const e: EntradaDecision = { memoria: mem, c1: { on: R.c1.on, puntaje }, umbrales: R.c1.umbrales, confianza: dudosa ? await confianza(x.userId, R) : false };
  const d0 = decidir(e);
  if (d0.estado !== "pedir_c2") return { id: x.id, d: d0, c2: null, modeloC1: R.c1.on && !mem ? "nudenet" : null };
  const c2 = R.c2.on ? await segundaOpinion({ mediaId: null, llave: `n/${x.id}.jpg`, privada: false, dueno: "user" }, x.datos, { esperaMs: R.c2.esperaMs }).catch(() => SIN_RESPUESTA) : null;
  const d = decidir({ ...e, c2: c2 ?? { estado: "apagada" } });
  return { id: x.id, d: d as Revision["d"], c2, modeloC1: R.c1.on ? "nudenet" : null };
}

/* La nota que lee quien subió la foto (y la apelación): en español (el aviso arma la de su idioma con MOTIVO_TEXTO). */
export function notaDe(d: { estado: string; motivo: Motivo | null }): string | null {
  if (d.estado === "rechazada" && d.motivo && d.motivo in MOTIVO_TEXTO) return `No se publicó: ${MOTIVO_TEXTO[d.motivo as MotivoRechazo].es}.`;
  if (d.motivo === "reportes") return "Varias personas la reportaron: está oculta mientras se revisa.";
  if (d.estado === "retenida") return "En revisión antes de publicarse.";
  return null;
}

/* ── El libro (solo inserción): SIEMPRE con el cliente de la transacción del cambio de estado ── */
export type Veredicto = {
  mediaId: string; sha: string | null; uploader: string | null; capa: Capa; decision: "publicar" | "retener" | "rechazar" | "ocultar";
  puntaje?: number | null; motivo?: Motivo | null; modelo?: string | null; version?: string | null; staffId?: string | null;
  costo?: number; tokens?: { entrada: number; salida: number }; ms?: number | null;
};
export async function anotarVeredicto(c: Q, v: Veredicto) {
  await c.query(
    `insert into photo_reviews (media_id, sha256, uploader_id, city_id, capa, decision, puntaje, motivo, modelo, version, staff_id, cost_microusd, input_tokens, output_tokens, ms)
     values ($1::uuid, $2, $3::uuid, (select home_city_id from users where id = $3::uuid), $4, $5, $6, $7, $8, $9, $10::uuid, $11, $12, $13, $14)`,
    [v.mediaId, v.sha, v.uploader, v.capa, v.decision, v.puntaje ?? null, v.motivo ?? null, v.modelo ?? null, v.version ?? null, v.staffId ?? null,
      Math.max(0, Math.round(v.costo ?? 0)), Math.max(0, Math.round(v.tokens?.entrada ?? 0)), Math.max(0, Math.round(v.tokens?.salida ?? 0)), v.ms ?? null]);
}
const decisionDe = (d: Revision["d"]): Veredicto["decision"] => (d.estado === "visible" ? "publicar" : d.estado === "rechazada" ? "rechazar" : "retener");
/* Los veredictos de una revisión: el de la capa 1 (si miró y no fue la que decidió) y el de la capa que decidió, con lo que costó la capa 2. */
export function veredictosDe(r: Revision, base: { mediaId: string; sha: string; uploader: string }): Veredicto[] {
  const out: Veredicto[] = [];
  const c2 = r.c2;
  if (r.d.capa !== "c1" && r.d.capa !== "memoria" && r.d.puntaje !== null)
    out.push({ ...base, capa: "c1", decision: "retener", puntaje: r.d.puntaje, motivo: null, modelo: r.modeloC1 });
  out.push({ ...base, capa: r.d.capa, decision: decisionDe(r.d), puntaje: r.d.puntaje, motivo: r.d.motivo,
    modelo: r.d.capa === "c2" ? c2?.modelo ?? null : r.d.capa === "c1" ? r.modeloC1 : null,
    costo: r.d.capa === "c2" ? c2?.costo ?? 0 : 0, tokens: r.d.capa === "c2" ? c2?.tokens : undefined, ms: r.d.capa === "c2" ? c2?.ms ?? null : null });
  // Capa 2 consultada pero sin decidir (apagada no consulta): su costo queda en el libro igual.
  if (r.d.capa !== "c2" && c2 && c2.costo > 0) out.push({ ...base, capa: "c2", decision: "retener", motivo: "no_segura", modelo: c2.modelo, costo: c2.costo, tokens: c2.tokens, ms: c2.ms });
  return out;
}

/* ── Una subida que NO se publica: la maestra solo en la llave privada, la fila retenida o rechazada, el veredicto y el aviso ── */
export async function guardarNoPublicada(x: { r: Revision; datos: Buffer; ancho: number; alto: number; sha: string; userId: string }): Promise<void> {
  const { r } = x, llave = llaveRevision(r.id), rechazada = r.d.estado === "rechazada";
  await guardarObjeto(llave, x.datos, "image/jpeg");
  await tx(async (c) => {
    await c.query(
      `insert into media (id, owner_kind, owner_id, url, w, h, uploaded_by, status, bytes, sha256, rev_at, rev_capa, rev_motivo, rev_nota, rev_llave, rev_intentos, rev_siguiente,
                          removed_reason, removed_note, removed_at)
       values ($1, 'user', $2, $3, $4, $5, $13::uuid, $6, $7, $8, now(), $9, $10, $11, $12, 0, case when $6 = 'review' then now() + interval '2 minutes' end,
               case when $6 = 'removed' then 'revision' end, case when $6 = 'removed' then $11 end, case when $6 = 'removed' then now() end)`,
      [r.id, x.userId, `/medios/n/${r.id}.jpg`, x.ancho, x.alto, rechazada ? "removed" : "review", x.datos.length, x.sha, r.d.capa, r.d.motivo, notaDe(r.d), llave, x.userId]);
    for (const v of veredictosDe(r, { mediaId: r.id, sha: x.sha, uploader: x.userId })) await anotarVeredicto(c, v);
  });
  await avisarFoto(x.userId, rechazada ? "foto_rechazada" : "foto_revision", r.id, r.d.motivo);
}

/* El aviso, con el motivo en el idioma de la persona. href: Mi cuenta › Avisos de moderación (ahí está «Pedir revisión»). */
async function avisarFoto(userId: string, tpl: "foto_rechazada" | "foto_revision" | "foto_aprobada" | "foto_oculta" | "foto_vuelve", mediaId: string, motivo: Motivo | null) {
  const en = (await db().query<{ lang: string }>(`select coalesce(lang, 'es') as lang from users where id = $1`, [userId]).catch(() => ({ rows: [] as { lang: string }[] }))).rows[0]?.lang === "en";
  const m: Bi | null = motivo && motivo in MOTIVO_TEXTO ? MOTIVO_TEXTO[motivo as MotivoRechazo] : null;
  await avisar(userId, tpl, { motivo: m ? (en ? m.en : m.es) : "" }, { href: `/cuenta/moderacion?k=media&id=${mediaId}`, ref: ["media", mediaId], sinSms: true }).catch(() => undefined);
}

/* ── Publicar lo que estaba retenido u oculto (barrido, capa 2 después de la capa 3, o una persona). La maestra vuelve a n/ ANTES de que la fila
   sea visible (una fila visible nunca apunta a un archivo que no está); las filas que comparten el archivo (copias) vuelven con ella. ── */
type Fila = { id: string; url: string; uploaded_by: string | null; rev_llave: string; rev_capa: string | null; rev_motivo: string | null; sha256: string | null; owner_kind: string; owner_id: string; w: number | null };
async function filaRev(c: Q, id: string, bloquear = false): Promise<Fila | null> {
  if (!UUID.test(id)) return null;
  return (await c.query<Fila>(`select id::text, url, uploaded_by::text, rev_llave, rev_capa, rev_motivo, sha256, owner_kind, owner_id, w from media
                               where id = $1::uuid and rev_llave is not null and purged_at is null and status in ('review', 'removed')${bloquear ? " for update" : ""}`, [id])).rows[0] ?? null;
}
const recontar = (c: Q, negocios: string[]) => negocios.length ? c.query(
  `update business_stats_cache s set photo_count = (select count(*) from media where owner_kind = 'business' and owner_id = s.business_id and status = 'visible'), updated_at = now()
    where s.business_id = any($1::text[])`, [negocios]) : Promise.resolve();
async function aVisible(c: Q, f: Fila, v: Omit<Veredicto, "mediaId" | "sha" | "uploader">): Promise<void> {
  const u = DE_URL.exec(f.url);
  if (!u) throw new Error("revisión: la foto no tiene una dirección pública nuestra");
  // La maestra vuelve a lo público primero (idempotente: mismo nombre, mismo contenido).
  await guardarObjeto(`n/${u[1]}.jpg`, await leerObjeto(f.rev_llave), "image/jpeg");
  const filas = (await c.query<{ id: string; owner_kind: string; owner_id: string }>(
    `update media set status = 'visible', rev_at = now(), rev_capa = $3, rev_motivo = null, rev_nota = null, rev_llave = null, rev_siguiente = null,
            removed_reason = null, removed_note = null, removed_by = null, removed_at = null, var_widths = null, var_bytes = null, var_at = null
      where purged_at is null and rev_llave = $2 and (id = $1::uuid or (url = $4 and status = 'review' and rev_capa = 'c3')) returning id::text, owner_kind, owner_id`,
    [f.id, f.rev_llave, v.capa, f.url])).rows;
  await recontar(c, [...new Set(filas.filter((x) => x.owner_kind === "business").map((x) => x.owner_id))]);
  await anotarVeredicto(c, { ...v, mediaId: f.id, sha: f.sha256, uploader: f.uploaded_by });
  // Los reportes que la ocultaron (de cualquiera de las filas de ese archivo) quedan como «se mantiene» y su caso de «Medios marcados» se cierra con
  // este veredicto: si no, la capa 3 la volvería a ocultar con los mismos reportes.
  if (f.rev_capa === "c3") {
    const ids = filas.map((x) => x.id);
    await c.query(`update photo_reports set status = 'kept', decided_at = now(), decision_reason = $2 where media_id = any($1::uuid[]) and status = 'open'`, [ids, v.capa === "persona" ? "Una persona la revisó: está bien" : "La segunda opinión la revisó: está bien"]);
    await c.query(`update queue_items set status = 'decided', decision = 'mantener', reason = $2, decided_by = $3::uuid, decided_at = now() where queue = 'medios' and subject_kind = 'media' and subject_id = any($1::text[]) and status = 'open'`,
      [ids, "Revisión automática: la foto está bien", v.staffId ?? null]);
  }
}
async function aRechazada(c: Q, f: Fila, v: Omit<Veredicto, "mediaId" | "sha" | "uploader">, nota: string): Promise<void> {
  const filas = (await c.query<{ id: string }>(
    `update media set status = 'removed', removed_reason = 'revision', removed_note = $3, removed_by = $4::uuid, removed_at = now(), rev_at = now(), rev_capa = $5, rev_motivo = $6, rev_nota = $3, rev_siguiente = null
      where purged_at is null and rev_llave = $2 and (id = $1::uuid or (url = $7 and status = 'review' and rev_capa = 'c3')) returning id::text`,
    [f.id, f.rev_llave, nota.slice(0, 300), v.staffId ?? null, v.capa, v.motivo ?? null, f.url])).rows;
  await anotarVeredicto(c, { ...v, mediaId: f.id, sha: f.sha256, uploader: f.uploaded_by });
  if (f.rev_capa === "c3") await c.query(`update photo_reports set status = 'removed', decided_at = now(), decision_reason = $2 where media_id = any($1::uuid[]) and status = 'open'`, [filas.map((x) => x.id), nota.slice(0, 300)]);
}
/* Después de publicar: la copia privada sale (el contenido ya está en n/), se rehacen las variantes y se avisa. Nunca lanza. */
async function despuesDePublicar(f: Fila): Promise<void> {
  const u = DE_URL.exec(f.url);
  if (!u) return;
  try {
    const maestra = await leerObjeto(`n/${u[1]}.jpg`);
    await guardarVariantes(u[1]!, maestra, f.w ?? null, [f.id, ...(f.id !== u[1] ? [u[1]!] : [])]);
  } catch { /* el barrido de variantes las completa */ }
  await borrarObjeto(f.rev_llave).catch(() => undefined);
  if (f.uploaded_by) await avisarFoto(f.uploaded_by, f.rev_capa === "c3" ? "foto_vuelve" : "foto_aprobada", f.id, null);
}

/* ── Una retenida u oculta, otra vez por las capas (el barrido; la capa 3 en el momento). Devuelve qué pasó. ── */
export async function revisarRetenida(id: string, R?: ReglasFotos): Promise<"publicada" | "rechazada" | "retenida" | "nada"> {
  if (!mediosListos()) return "nada";
  const RR = R ?? (await reglasFotos());
  const f = await filaRev(db(), id);
  if (!f || f.rev_motivo === null && f.rev_capa === null) return "nada";
  const sigue = (await db().query(`select 1 from media where id = $1::uuid and status = 'review'`, [id])).rowCount;
  if (!sigue) return "nada";
  let datos: Buffer;
  try { datos = await leerObjeto(f.rev_llave); } catch { return "nada"; }
  const reportada = f.rev_capa === "c3";
  if (reportada) await quitarDeLoPublico(f).catch(() => undefined);   // por si el borrado de n/ no terminó cuando se ocultó
  // Una foto reportada va directo a la segunda opinión (ya pasó la capa 1 al subir; los reportes son información nueva: sin memoria ni confianza).
  const mem = reportada ? null : await memoria(f.sha256 ?? "", f.uploaded_by);
  let puntaje: number | null = null;
  if (!reportada && !mem && RR.c1.on) puntaje = (await revisarImagen(datos, RR.c1.umbrales.duda)).desnudez;
  const dudosa = puntaje !== null && puntaje >= RR.c1.umbrales.duda && puntaje < RR.c1.umbrales.rechazo;
  const e: EntradaDecision = { memoria: mem, c1: { on: reportada ? false : RR.c1.on, puntaje }, umbrales: RR.c1.umbrales,
    confianza: dudosa && f.uploaded_by ? await confianza(f.uploaded_by, RR) : false };
  let d = decidir(e), c2: ResultadoSegunda | null = null;
  if (d.estado === "pedir_c2") {
    c2 = RR.c2.on ? await segundaOpinion({ mediaId: f.id, llave: f.rev_llave, privada: false, dueno: f.owner_kind }, datos, { esperaMs: RR.c2.esperaMs }).catch(() => SIN_RESPUESTA) : null;
    d = decidir({ ...e, c2: c2 ?? { estado: "apagada" } });
  }
  const r: Revision = { id: f.id, d: d as Revision["d"], c2, modeloC1: RR.c1.on && !reportada ? "nudenet" : null };
  const vs = veredictosDe(r, { mediaId: f.id, sha: f.sha256 ?? "", uploader: f.uploaded_by ?? "" }).map((v) => ({ ...v, sha: f.sha256, uploader: f.uploaded_by }));
  if (r.d.estado === "visible") {
    const ok = await tx(async (c) => {
      const g = await filaRev(c, f.id, true);
      if (!g || g.rev_llave !== f.rev_llave) return false;
      for (const v of vs.slice(0, -1)) await anotarVeredicto(c, v);
      const fin = vs[vs.length - 1]!;
      await aVisible(c, g, { capa: fin.capa, decision: "publicar", puntaje: fin.puntaje, motivo: null, modelo: fin.modelo, costo: fin.costo, tokens: fin.tokens, ms: fin.ms });
      return true;
    });
    if (ok) await despuesDePublicar(f);
    return ok ? "publicada" : "nada";
  }
  if (r.d.estado === "rechazada") {
    const nota = notaDe(r.d) ?? "No se publicó.";
    const motivo = r.d.motivo;
    const ok = await tx(async (c) => {
      const g = await filaRev(c, f.id, true);
      if (!g || g.rev_llave !== f.rev_llave) return false;
      for (const v of vs.slice(0, -1)) await anotarVeredicto(c, v);
      const fin = vs[vs.length - 1]!;
      await aRechazada(c, g, { capa: fin.capa, decision: "rechazar", puntaje: fin.puntaje, motivo, modelo: fin.modelo, costo: fin.costo, tokens: fin.tokens, ms: fin.ms }, nota);
      return true;
    });
    if (ok && f.uploaded_by) await avisarFoto(f.uploaded_by, "foto_rechazada", f.id, motivo);
    return ok ? "rechazada" : "nada";
  }
  // Sigue retenida. Sin gastar intentos si la capa 2 está apagada o sin presupuesto (vuelve a mirar en 10 min); si no, el siguiente intento más
  // tarde (2, 4, 8, 16… min) y nunca más que el tope de intentos (queda retenida, con «Pedir revisión»).
  const espera = r.d.motivo === "apagada" || r.d.motivo === "sin_presupuesto";
  await tx(async (c) => {
    await c.query(
      `update media set rev_motivo = case when rev_capa = 'c3' then rev_motivo else $2 end, rev_intentos = least(100, rev_intentos + $3),
              rev_siguiente = now() + case when $3 = 0 then interval '10 minutes' else make_interval(mins => least(720, 2 ^ least(rev_intentos + 1, 9))::int) end
        where id = $1::uuid and status = 'review'`, [f.id, r.d.motivo, espera ? 0 : 1]);
    if (!espera) for (const v of vs) await anotarVeredicto(c, v);
  });
  return "retenida";
}

/* ── El barrido (lib/barrido.ts, cada minuto): una tanda de retenidas que tocan, la más vieja primero; con la capa 2 apagada solo las que el modelo
   propio no pudo mirar. Suelta antes las reservas de la capa 2 que nunca volvieron. ── */
export const TANDA_REVISION = 10;
export async function barrerRevision(): Promise<{ publicadas: number; rechazadas: number; retenidas: number; ocultadas: number }> {
  const out = { publicadas: 0, rechazadas: 0, retenidas: 0, ocultadas: 0 };
  await db().query(`select foto2_soltar_reservas(10)`);
  if (!mediosListos()) return out;
  const R = await reglasFotos(), t0 = Date.now();
  const F = (await db().query<{ id: string }>(
    `select id::text from media where status = 'review' and rev_llave is not null and purged_at is null and (rev_siguiente is null or rev_siguiente <= now())
        and rev_intentos < $1 and ($2 or rev_motivo = 'sin_servicio')
        -- De una foto oculta por reportes se revisa la fila reportada; sus copias (mismo archivo) vuelven o salen con ella.
        and (rev_capa is distinct from 'c3' or exists (select 1 from photo_reports pr where pr.media_id = media.id))
      order by rev_siguiente nulls first limit ${TANDA_REVISION}`, [R.c2.intentos, R.c2.on])).rows;
  for (const x of F) {
    if (Date.now() - t0 > 25_000) break;
    const r = await revisarRetenida(x.id, R).catch(() => "nada" as const);
    if (r === "publicada") out.publicadas++; else if (r === "rechazada") out.rechazadas++; else if (r === "retenida") out.retenidas++;
  }
  // Capa 3 de respaldo: una foto visible con N reportes abiertos que el reporte no alcanzó a ocultar (el aviso del reporte falló, o la regla se
  // encendió después). revisarReportes vuelve a contar como siempre (cuentas viejas, un dispositivo cuenta una vez).
  if (R.c3.on) {
    const P = (await db().query<{ id: string }>(
      `select pr.media_id::text as id from photo_reports pr join media m on m.id = pr.media_id
        where pr.status = 'open' and m.status = 'visible' and m.purged_at is null group by pr.media_id having count(*) >= $1 limit ${TANDA_REVISION}`, [R.c3.reportes])).rows;
    for (const x of P) { if (Date.now() - t0 > 40_000) break; if ((await revisarReportes(x.id).catch(() => "nada")) === "oculta") out.ocultadas++; }
  }
  return out;
}

/* ── Capa 3 · Reportes: N cuentas distintas (como autohide: no cuentan las de menos de edad_h horas, y las que comparten un dispositivo cuentan
   como una sola) → la foto se oculta sola y pasa a la capa 2 en el momento. Lo llama reportarFoto después de guardar el reporte. ── */
export async function revisarReportes(mediaId: string): Promise<"oculta" | "nada"> {
  if (!UUID.test(mediaId) || !mediosListos()) return "nada";
  const R = await reglasFotos();
  if (!R.c3.on) return "nada";
  const F = (await db().query<{ devs: string[] }>(
    `select array(select distinct s.device::text from sessions s where s.user_id = pr.reporter_user_id and s.device is not null) as devs
       from photo_reports pr join users u on u.id = pr.reporter_user_id
      where pr.media_id = $1::uuid and pr.status = 'open' and u.created_at <= now() - make_interval(hours => $2)`, [mediaId, R.c3.edadH])).rows;
  // Unión por dispositivo compartido: cada grupo de cuentas que comparte algún dispositivo cuenta como UNA persona.
  const padre = F.map((_, i) => i), raiz = (i: number): number => (padre[i] === i ? i : (padre[i] = raiz(padre[i]!)));
  const visto = new Map<string, number>();
  F.forEach((x, i) => { for (const d of new Set(x.devs ?? [])) { const j = visto.get(d); if (j === undefined) visto.set(d, i); else padre[raiz(i)] = raiz(j); } });
  const personas = new Set(F.map((_, i) => raiz(i))).size;
  if (personas < R.c3.reportes) return "nada";
  const f = (await db().query<Fila & { var_widths: number[] | null; status: string }>(
    `select id::text, url, uploaded_by::text, rev_llave, rev_capa, rev_motivo, sha256, owner_kind, owner_id, w, var_widths, status from media where id = $1::uuid and purged_at is null`, [mediaId])).rows[0];
  const u = f ? DE_URL.exec(f.url) : null;
  if (!f || f.status !== "visible" || !u) return "nada";
  const llave = llaveRevision(u[1]!);
  // 1) La maestra a la llave privada (copia). 2) En una transacción: todas las filas de ese archivo dejan de verse, la cuenta de fotos del negocio,
  // el veredicto. 3) Después, el archivo y sus variantes salen de n/.
  await guardarObjeto(llave, await leerObjeto(`n/${u[1]}.jpg`), "image/jpeg");
  const hecho = await tx(async (c) => {
    const filas = (await c.query<{ id: string; owner_kind: string; owner_id: string }>(
      `update media set status = 'review', rev_at = now(), rev_capa = 'c3', rev_motivo = 'reportes', rev_nota = $3, rev_llave = $2, rev_intentos = 0, rev_siguiente = now(),
              var_widths = null, var_bytes = null, var_at = null
        where url = $1 and status = 'visible' and purged_at is null returning id::text, owner_kind, owner_id`, [f.url, llave, notaDe({ estado: "retenida", motivo: "reportes" })])).rows;
    if (!filas.some((x) => x.id === f.id)) return false;
    await recontar(c, [...new Set(filas.filter((x) => x.owner_kind === "business").map((x) => x.owner_id))]);
    await anotarVeredicto(c, { mediaId: f.id, sha: f.sha256, uploader: f.uploaded_by, capa: "c3", decision: "ocultar", motivo: "reportes" });
    return true;
  });
  if (!hecho) return "nada";
  await quitarDeLoPublico({ ...f, rev_llave: llave }, f.var_widths).catch(() => undefined);
  if (f.uploaded_by) await avisarFoto(f.uploaded_by, "foto_oculta", f.id, "reportes");
  await revisarRetenida(f.id, R).catch(() => undefined);
  return "oculta";
}
/* La maestra y todas sus variantes salen de n/ (DELETE es idempotente: lo que ya no está, no falla). */
async function quitarDeLoPublico(f: Fila, hechos?: number[] | null) {
  const u = DE_URL.exec(f.url);
  if (!u) return;
  const clave = `n/${u[1]}.jpg`;
  await borrarObjeto(clave);
  for (const v of clavesVariantes(clave, f.w, hechos ?? null)) await borrarObjeto(v);
}

/* ── Una persona del equipo decide la apelación de una foto de la revisión (lib/apelaciones.ts decidirApelacion, dentro de su transacción).
   lifted → se publica (memoria de contenido: si la vuelve a subir, entra directo); upheld → queda rechazada (memoria: se rechaza para cualquiera).
   Devuelve false si la foto no es de la revisión automática (la apelación sigue por el camino de antes). ── */
export async function decidirFotoPorPersona(c: Q, mediaId: string, staffId: string, accion: "lifted" | "upheld", motivo: string): Promise<boolean> {
  const f = await filaRev(c, mediaId, true);
  if (!f) return false;
  if (accion === "lifted") await aVisible(c, f, { capa: "persona", decision: "publicar", motivo: null, staffId });
  else await aRechazada(c, f, { capa: "persona", decision: "rechazar", motivo: f.rev_motivo && f.rev_motivo in MOTIVO_TEXTO ? (f.rev_motivo as Motivo) : "reglas", staffId },
    `Se mantiene: ${motivo}`);
  return true;
}
/* Después de guardar la decisión de una persona: variantes y la copia privada fuera (si se publicó). Nunca lanza. */
export async function despuesDePersona(mediaId: string): Promise<void> {
  if (!UUID.test(mediaId)) return;
  const f = (await db().query<Fila & { status: string }>(`select id::text, url, uploaded_by::text, rev_capa, owner_kind, owner_id, w, status from media where id = $1::uuid`, [mediaId]).catch(() => ({ rows: [] as (Fila & { status: string })[] }))).rows[0];
  if (!f || f.status !== "visible") return;
  const u = DE_URL.exec(f.url);
  if (!u) return;
  try { await guardarVariantes(u[1]!, await leerObjeto(`n/${u[1]}.jpg`), f.w ?? null, [f.id, ...(f.id !== u[1] ? [u[1]!] : [])]); } catch { /* el barrido de variantes */ }
  await borrarObjeto(llaveRevision(u[1]!)).catch(() => undefined);
}

/* ── Cifras para el Super Admin y el reporte diario (la pantalla es de R3): por capa, publicadas / retenidas / rechazadas / ocultas, el gasto de la
   capa 2 y cinco publicadas por los modelos, al azar, para que una persona las mire. Una pasada por el índice del día. ── */
export type CifrasRevision = {
  porCapa: { capa: Capa; publicadas: number; retenidas: number; rechazadas: number; ocultadas: number }[];
  gastoCapa2Usd: number; llamadasCapa2: number;
  muestra: { mediaId: string; capa: Capa; puntaje: number | null; at: string }[];
};
export async function cifrasRevisionFotos(desde: Date, hasta: Date): Promise<CifrasRevision> {
  const [a, m] = await Promise.all([
    db().query<{ capa: Capa; publicadas: number; retenidas: number; rechazadas: number; ocultadas: number; costo: string; llamadas: number }>(
      `select capa, count(*) filter (where decision = 'publicar')::int as publicadas, count(*) filter (where decision = 'retener')::int as retenidas,
              count(*) filter (where decision = 'rechazar')::int as rechazadas, count(*) filter (where decision = 'ocultar')::int as ocultadas,
              coalesce(sum(cost_microusd), 0)::text as costo, count(*) filter (where capa = 'c2' and modelo is not null)::int as llamadas
         from photo_reviews where created_at >= $1 and created_at < $2 group by capa order by capa`, [desde, hasta]),
    db().query<{ media_id: string; capa: Capa; puntaje: number | null; at: string }>(
      `select media_id::text, capa, puntaje, created_at as at from photo_reviews
        where created_at >= $1 and created_at < $2 and decision = 'publicar' and capa in ('c1', 'c2', 'c4') order by random() limit 5`, [desde, hasta]),
  ]);
  return {
    porCapa: a.rows.map((x) => ({ capa: x.capa, publicadas: x.publicadas, retenidas: x.retenidas, rechazadas: x.rechazadas, ocultadas: x.ocultadas })),
    gastoCapa2Usd: a.rows.reduce((s, x) => s + Number(x.costo), 0) / 1_000_000,
    llamadasCapa2: a.rows.reduce((s, x) => s + x.llamadas, 0),
    muestra: m.rows.map((x) => ({ mediaId: x.media_id, capa: x.capa, puntaje: x.puntaje, at: new Date(x.at).toISOString() })),
  };
}
