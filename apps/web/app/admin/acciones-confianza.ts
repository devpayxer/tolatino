"use server";
/* 5d · Super Admin: decisiones de la Comunidad en Colas (publicación o comentario reportado o marcado, persona reportada, foto que el
   modelo marcó, apelación) y Contenido › Auto-moderación (reglas, parámetros, términos, límites). Cada una: permiso de la matriz y
   ciudad de quien actúa → cambio → caso decidido → auditoría con motivo, en una transacción; después, el aviso (toda acción que oculta
   o sanciona avisa con el motivo y abre la apelación: lib/apelaciones.ts). Nada se borra. */
import { revalidatePath } from "next/cache";
import type { PoolClient } from "pg";
import { auditar, staff, type Staff } from "@/lib/admin";
import { colasVisibles } from "@/lib/admin-colas";
import { aplicarSancion, avisarDecision, avisarOculto, avisarSancion, decidirApelacion } from "@/lib/apelaciones";
import { avisarMuchos, avisar } from "@/lib/avisos";
import type { Cola } from "@/lib/colas";
import { tx } from "@/lib/db";
import { olvidarReglas } from "@/lib/moderacion";
import { cambiarConfig } from "@/lib/config";
import { LIMITES, PARAMS, REGLAS, TIPOS_TERMINO, type Limite, type ReglaKey } from "@/lib/moderacion-comun";
import { ORDEN_SANCIONES, SANCIONES, type Sancion } from "@/lib/sanciones";
import type { ResAdm } from "./acciones-colas";

const no = (mensaje: string): ResAdm => ({ ok: false, mensaje });
const motivoOk = (m: unknown) => (typeof m === "string" ? m.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim().slice(0, 500) : "");
type Caso = { id: string; queue: Cola; subject_kind: string; subject_id: string; city_id: string | null; status: string };
async function abrir(c: PoolClient, s: Staff, id: string, cola: Cola): Promise<Caso | string> {
  if (!/^\d{1,18}$/.test(String(id))) return "Ese caso no existe.";
  const q = (await c.query<Caso>(`select id::text, queue, subject_kind, subject_id, city_id, status from queue_items where id = $1::bigint for update`, [id])).rows[0];
  if (!q || q.queue !== cola || !colasVisibles(s).includes(q.queue) || (s.cities.length && (!q.city_id || !s.cities.includes(q.city_id)))) return "Ese caso no existe.";
  if (q.status !== "open") return "Este caso ya se decidió.";
  return q;
}
const cerrar = (c: PoolClient, q: Caso, s: Staff, decision: string, motivo: string) =>
  c.query(`update queue_items set status = 'decided', decision = $2, reason = $3, decided_by = $4, decided_at = now() where id = $1::bigint`, [q.id, decision, motivo, s.id]);
async function quien(): Promise<Staff | null> { const s = await staff(); return s && s.puede("colas", "aprobar") ? s : null; }
const listo = () => { revalidatePath("/admin/colas"); revalidatePath("/admin/confianza"); revalidatePath("/admin/contenido"); revalidatePath("/admin"); };
const sancionValida = (k: unknown, s: Staff): Sancion | string | null => {
  if (!k) return null;
  if (!ORDEN_SANCIONES.includes(k as Sancion)) return "Esa sanción no existe.";
  if (SANCIONES[k as Sancion].admin && s.role !== "admin") return "Solo un Admin banea una cuenta.";
  return k as Sancion;
};

/* ── Publicación o comentario de la Comunidad (cola rep): ocultar (con sanción opcional) o «se queda» (si estaba auto-oculta, vuelve) ── */
export async function decidirRepCom(id: string, accion: "ocultar" | "mantener", motivo: string, sancion?: string | null): Promise<ResAdm> {
  const s = await quien();
  if (!s) return no("Tu rol solo puede ver esta cola.");
  const m = motivoOk(motivo);
  if (!m) return no("Escribe el motivo.");
  const sk = accion === "ocultar" ? sancionValida(sancion, s) : null;
  if (typeof sk === "string" && !ORDEN_SANCIONES.includes(sk as Sancion)) return no(sk);
  const r = await tx(async (c) => {
    const q = await abrir(c, s, id, "rep");
    if (typeof q === "string") return q;
    if (q.subject_kind !== "com_post" && q.subject_kind !== "com_comment") return "Ese caso no es de la Comunidad.";
    const tabla = q.subject_kind === "com_post" ? "com_posts" : "com_comments";
    const x = (await c.query<{ autor: string; status: string; hidden_by: string | null; ciudad: string; body: string; staff: boolean }>(
      `select t.author_user_id::text as autor, t.status, t.hidden_by, t.city_id as ciudad, t.body, exists (select 1 from staff_members m where m.user_id = t.author_user_id and m.status = 'active') as staff
         from ${tabla} t where t.id = $1::bigint for update`, [q.subject_id])).rows[0];
    if (!x) return "Eso ya no existe.";
    let sid: string | null = null, restaurada = false;
    if (accion === "ocultar") {
      if (x.status === "deleted") return "Su autor ya lo borró.";
      // Ocultar con el motivo de una persona (también si ya estaba auto-oculta: ahora lo decidió alguien; la apelación la ve otra persona).
      await c.query(`update ${tabla} set status = 'hidden', hidden_by = 'admin', hidden_staff_id = $2, hidden_reason = $3, hidden_at = now() where id = $1::bigint`, [q.subject_id, s.id, m]);
      if (sk) {
        if (x.staff) return "El autor es del equipo de To’Latino: sanciónalo desde Sistema › Equipo.";
        sid = await aplicarSancion(c, { userId: x.autor, ciudad: x.ciudad, kind: sk as Sancion, motivo: m, staffId: s.id, ref: [q.subject_kind, q.subject_id] });
      }
    } else if (x.status === "hidden" && x.hidden_by === "auto") {
      await c.query(`update ${tabla} set status = 'visible', hidden_by = null, hidden_staff_id = null, hidden_reason = null, hidden_at = null where id = $1::bigint`, [q.subject_id]);
      restaurada = true;
    }
    const rep = (await c.query<{ quien: string }>(`update content_reports set status = $3, decided_by = $4, decided_at = now() where target_kind = $1 and target_id = $2 and status = 'open' returning reporter_user_id::text as quien`,
      [q.subject_kind, q.subject_id, accion === "ocultar" ? "actioned" : "dismissed", s.id])).rows.map((y) => y.quien);
    await cerrar(c, q, s, accion, m);
    await auditar(c, { actor: s.id, action: `com.${q.subject_kind === "com_post" ? "publicacion" : "comentario"}.${accion === "ocultar" ? "ocultar" : "mantener"}`, targetKind: q.subject_kind, targetId: q.subject_id, city: x.ciudad,
      before: { texto: x.body.slice(0, 80), estado: x.status === "hidden" ? (x.hidden_by === "auto" ? "oculta por reportes" : "oculta") : "visible" },
      after: { estado: accion === "ocultar" ? "oculta" : "visible", ...(sk ? { sancion: SANCIONES[sk as Sancion].es } : {}) }, reason: m });
    return { autor: x.autor, sid, restaurada, rep, kind: q.subject_kind as "com_post" | "com_comment", tid: q.subject_id };
  });
  if (typeof r === "string") return no(r);
  if (accion === "ocultar") {
    await avisarOculto(r.autor, r.kind, r.tid, m);
    if (r.sid) await avisarSancion(r.autor, r.sid, sk as Sancion, m);
  } else if (r.restaurada) await avisar(r.autor, r.kind === "com_post" ? "com_restore" : "com_cm_restore", { motivo: m }, { href: r.kind === "com_post" ? `/comunidad/p/${r.tid}` : undefined, ref: [r.kind, r.tid], sinSms: true }).catch(() => undefined);
  // Quienes reportaron: el resultado (sin decir quién más reportó ni a quién se sancionó).
  await avisarMuchos(r.rep, accion === "ocultar" ? "com_rep_ok" : "com_rep_no", { es: {}, en: {} }, { ref: [r.kind, r.tid] }).catch(() => undefined);
  listo();
  return { ok: true, mensaje: accion === "ocultar" ? (r.sid ? "Oculto y sanción aplicada. El autor ve el motivo y puede apelar." : "Oculto. El autor ve el motivo y puede apelar.") : r.restaurada ? "Se ve otra vez. El autor recibe el aviso." : "Se queda. Quedó en la auditoría." };
}

/* ── Una persona (cola repUsr): sin acción o sancionar (el efecto en la Comunidad lo aplica efectoSancion) ── */
export async function decidirRepUsr(id: string, accion: "sin_accion" | "sancionar", motivo: string, sancion?: string | null): Promise<ResAdm> {
  const s = await quien();
  if (!s) return no("Tu rol solo puede ver esta cola.");
  const m = motivoOk(motivo);
  if (!m) return no("Escribe el motivo.");
  const sk = accion === "sancionar" ? sancionValida(sancion, s) : null;
  if (accion === "sancionar" && (!sk || !ORDEN_SANCIONES.includes(sk as Sancion))) return no(typeof sk === "string" ? sk : "Elige la sanción.");
  const r = await tx(async (c) => {
    const q = await abrir(c, s, id, "repUsr");
    if (typeof q === "string") return q;
    const u = (await c.query<{ ciudad: string | null; staff: boolean; estado: string }>(
      `select u.home_city_id as ciudad, exists (select 1 from staff_members m where m.user_id = u.id and m.status = 'active') as staff, cuenta_estado(u.status, u.status_until) as estado from users u where u.id::text = $1 for update`, [q.subject_id])).rows[0];
    if (!u) return "Esa persona ya no existe.";
    let sid: string | null = null;
    if (accion === "sancionar") {
      if (q.subject_id === s.id) return "No puedes sancionar tu propia cuenta.";
      if (u.staff) return "Es del equipo de To’Latino: quítale el rol en Sistema › Equipo antes.";
      if (u.estado === "banned") return "La cuenta ya está baneada.";
      sid = await aplicarSancion(c, { userId: q.subject_id, ciudad: u.ciudad, kind: sk as Sancion, motivo: m, staffId: s.id, ref: ["user", q.subject_id] });
    }
    await c.query(`update content_reports set status = $2, decided_by = $3, decided_at = now() where target_kind = 'user' and target_id = $1 and status = 'open'`, [q.subject_id, accion === "sancionar" ? "actioned" : "dismissed", s.id]);
    await cerrar(c, q, s, accion, m);
    await auditar(c, { actor: s.id, action: accion === "sancionar" ? "usuario.sancionar" : "usuario.reporte.sin_accion", targetKind: "user", targetId: q.subject_id, city: u.ciudad,
      before: { reportes: "abiertos" }, after: accion === "sancionar" ? { sancion: SANCIONES[sk as Sancion].es, por: "reportes de la Comunidad" } : { decision: "sin acción" }, reason: m });
    return { sid, uid: q.subject_id };
  });
  if (typeof r === "string") return no(r);
  if (r.sid) await avisarSancion(r.uid, r.sid, sk as Sancion, m);
  listo();
  return { ok: true, mensaje: accion === "sancionar" ? "Sanción aplicada. La persona ve el motivo y puede apelar." : "Sin acción. Quedó en la auditoría." };
}

/* ── Foto de la Comunidad (cola medios, sin negocio): está bien (se ve) o quitar con motivo (aviso y apelación) ── */
export async function decidirFotoCom(id: string, accion: "mantener" | "quitar", motivo: string): Promise<ResAdm> {
  const s = await quien();
  if (!s) return no("Tu rol solo puede ver esta cola.");
  const m = accion === "mantener" ? "La foto está bien" : motivoOk(motivo);
  if (!m) return no("Escribe el motivo.");
  const r = await tx(async (c) => {
    const q = await abrir(c, s, id, "medios");
    if (typeof q === "string") return q;
    const f = (await c.query<{ autor: string | null; status: string; owner: string }>(`select uploaded_by::text as autor, status, owner_kind as owner from media where id::text = $1 for update`, [q.subject_id])).rows[0];
    if (!f || f.owner !== "com_post") return "Esa foto no es de la Comunidad.";
    if (accion === "quitar") await c.query(`update media set status = 'removed', removed_reason = 'admin', removed_note = $2, removed_by = $3, removed_at = now() where id::text = $1 and status in ('visible', 'review')`, [q.subject_id, m, s.id]);
    else await c.query(`update media set status = 'visible' where id::text = $1 and status = 'review'`, [q.subject_id]);
    await cerrar(c, q, s, accion, m);
    await auditar(c, { actor: s.id, action: accion === "quitar" ? "com.foto.quitar" : "com.foto.aprobar", targetKind: "media", targetId: q.subject_id, city: q.city_id, before: { foto: f.status === "review" ? "en revisión" : "visible" }, after: { foto: accion === "quitar" ? "quitada" : "visible" }, reason: m });
    return { autor: f.autor, tid: q.subject_id };
  });
  if (typeof r === "string") return no(r);
  if (accion === "quitar" && r.autor) await avisarOculto(r.autor, "media", r.tid, m);
  listo();
  return { ok: true, mensaje: accion === "quitar" ? "Foto quitada. Su autor ve el motivo y puede apelar." : "Aprobada: ya se ve en la publicación." };
}

/* ── Apelación (cola apel): segunda revisión. Nunca quien ocultó o sancionó (la base también lo impide). ── */
export async function decidirApel(id: string, accion: "lifted" | "upheld", motivo: string): Promise<ResAdm> {
  const s = await quien();
  if (!s) return no("Tu rol solo puede ver esta cola.");
  const m = motivoOk(motivo);
  if (!m) return no("Escribe el motivo: la persona lo recibe.");
  const r = await tx(async (c) => {
    const q = await abrir(c, s, id, "apel");
    if (typeof q === "string") return q;
    const d = await decidirApelacion(c, s.id, q.subject_id, accion, m);
    if (d.err || !d.a) return d.err ?? "Esa apelación no existe.";
    await cerrar(c, q, s, accion, m);
    await auditar(c, { actor: s.id, action: accion === "lifted" ? "apelacion.levantar" : "apelacion.mantener", targetKind: "appeal", targetId: d.a.numero, city: d.a.ciudad,
      before: { apelacion: "abierta", que: d.a.k }, after: { apelacion: accion === "lifted" ? "levantada" : "se mantiene", ref: { [d.a.k]: d.a.tid } }, reason: m });
    return d.a;
  }).catch((e) => { if (/otra persona|propia apelación/.test(String(e?.message))) return "Tú ocultaste o sancionaste esto: la apelación la decide otra persona del equipo."; throw e; });
  if (typeof r === "string") return no(r);
  await avisarDecision(r, accion, m);
  listo();
  return { ok: true, mensaje: accion === "lifted" ? "Levantada: el contenido volvió (o la sanción terminó). La persona recibe el aviso." : "Se mantiene. La persona recibe el motivo; es final." };
}

/* ── Contenido › Auto-moderación (cont:editar): reglas, parámetros, términos y límites; cada cambio con motivo y auditoría ── */
/* Contenido › Auto-moderación: cont:editar (como el prototipo, can('cont','E')). */
const edita = (s: Staff | null): s is Staff => !!s && s.puede("cont", "editar");
export async function reglaCambiar(k: string, on: boolean, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!edita(s)) return no("Tu rol no edita reglas.");
  if (!(k in REGLAS)) return no("Esa regla no existe.");
  if (REGLAS[k as ReglaKey].fija && !on) return no("Esta regla no se apaga: la base la impone siempre.");
  const m = motivoOk(motivo);
  if (!m) return no("Escribe el motivo.");
  const r = await tx(async (c) => {
    const x = (await c.query<{ enabled: boolean }>(`select enabled from mod_rules where key = $1 for update`, [k])).rows[0];
    if (!x) return "Esa regla no existe.";
    if (x.enabled === on) return on ? "Ya está encendida." : "Ya está apagada.";
    await c.query(`update mod_rules set enabled = $2, updated_by = $3, updated_at = now() where key = $1`, [k, on, s.id]);
    await auditar(c, { actor: s.id, action: "moderacion.regla", targetKind: "mod_rule", targetId: k, before: { regla: REGLAS[k as ReglaKey].t, estado: x.enabled ? "encendida" : "apagada" }, after: { estado: on ? "encendida" : "apagada" }, reason: m });
    return null;
  });
  if (r) return no(r);
  olvidarReglas(); listo();
  return { ok: true, mensaje: on ? "Regla encendida." : "Regla apagada. Quedó en la auditoría." };
}
export async function reglaParams(k: string, p: Record<string, string>, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!edita(s)) return no("Tu rol no edita reglas.");
  const def = PARAMS[k as ReglaKey];
  if (!def) return no("Esta regla no tiene valores que cambiar.");
  const m = motivoOk(motivo);
  if (!m) return no("Escribe el motivo.");
  const nuevo: Record<string, number> = {};
  for (const [key, label, min, max] of def) {
    const v = Number(String(p?.[key] ?? "").replace(",", "."));
    if (!Number.isFinite(v) || v < min || v > max) return no(`${label}: entre ${min} y ${max}.`);
    nuevo[key] = key === "umbral" ? Math.round(v * 100) / 100 : Math.round(v);
  }
  const r = await tx(async (c) => {
    const x = (await c.query<{ params: Record<string, number> }>(`select params from mod_rules where key = $1 for update`, [k])).rows[0];
    if (!x) return "Esa regla no existe.";
    const despues = { ...x.params, ...nuevo };
    await c.query(`update mod_rules set params = $2, updated_by = $3, updated_at = now() where key = $1`, [k, despues, s.id]);
    await auditar(c, { actor: s.id, action: "moderacion.regla.valores", targetKind: "mod_rule", targetId: k, before: x.params, after: despues, reason: m });
    return null;
  });
  if (r) return no(r);
  olvidarReglas(); listo();
  return { ok: true, mensaje: "Valores guardados. Quedó en la auditoría." };
}
export async function terminoAgregar(lang: string, kind: string, term: string, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!edita(s)) return no("Tu rol no edita las listas.");
  if (lang !== "es" && lang !== "en") return no("Elige el idioma.");
  if (!TIPOS_TERMINO.some(([k]) => k === kind)) return no("Elige la lista.");
  const t = String(term ?? "").replace(/[\u0000-\u001F\u007F]/g, "").trim().toLowerCase().replace(/\s+/g, " ");
  if (t.length < 2 || t.length > 60) return no("El término va de 2 a 60 letras.");
  const m = motivoOk(motivo);
  if (!m) return no("Escribe el motivo.");
  const r = await tx(async (c) => {
    const x = (await c.query<{ id: string; enabled: boolean }>(`select id::text, enabled from mod_terms where lang = $1 and kind = $2 and term = $3 for update`, [lang, kind, t])).rows[0];
    if (x?.enabled) return "Ese término ya está en la lista.";
    if (x) await c.query(`update mod_terms set enabled = true, updated_at = now() where id = $1::bigint`, [x.id]);
    else await c.query(`insert into mod_terms (lang, kind, term, created_by) values ($1, $2, $3, $4)`, [lang, kind, t, s.id]);
    await auditar(c, { actor: s.id, action: "moderacion.termino.agregar", targetKind: "mod_term", targetId: `${kind}:${lang}:${t}`, before: null, after: { lista: kind, idioma: lang, termino: t }, reason: m });
    return null;
  });
  if (r) return no(r);
  olvidarReglas(); listo();
  return { ok: true, mensaje: "Término agregado. Quedó en la auditoría." };
}
export async function terminoApagar(id: string, on: boolean, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!edita(s)) return no("Tu rol no edita las listas.");
  if (!/^\d{1,18}$/.test(String(id))) return no("Ese término no existe.");
  const m = motivoOk(motivo);
  if (!m) return no("Escribe el motivo.");
  const r = await tx(async (c) => {
    const x = (await c.query<{ term: string; kind: string; lang: string; enabled: boolean }>(`select term, kind, lang, enabled from mod_terms where id = $1::bigint for update`, [id])).rows[0];
    if (!x) return "Ese término no existe.";
    if (x.enabled === on) return on ? "Ya está encendido." : "Ya está apagado.";
    await c.query(`update mod_terms set enabled = $2, updated_at = now() where id = $1::bigint`, [id, on]);
    await auditar(c, { actor: s.id, action: on ? "moderacion.termino.encender" : "moderacion.termino.apagar", targetKind: "mod_term", targetId: `${x.kind}:${x.lang}:${x.term}`, before: { estado: x.enabled ? "encendido" : "apagado" }, after: { estado: on ? "encendido" : "apagado" }, reason: m });
    return null;
  });
  if (r) return no(r);
  olvidarReglas(); listo();
  return { ok: true, mensaje: on ? "Término encendido." : "Término apagado (no se borra)." };
}
export async function limiteCambiar(k: string, valor: string, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!edita(s)) return no("Tu rol no edita los límites.");
  if (!(k in LIMITES)) return no("Ese límite no existe.");
  // 5i · Un solo camino para escribir un valor de Configuración: límites, auditoría antes → después y caché (lib/config.ts).
  const r = await cambiarConfig(s.id, LIMITES[k as Limite].key, valor, motivoOk(motivo));
  if (!r.ok) return no(r.msg);
  listo();
  return { ok: true, mensaje: "Límite guardado. Quedó en la auditoría." };
}

/* 5h · «Ver traducción»: cuántas por persona en una hora. El traductor es propio; el tope lo protege. Valor de Configuración. */
export async function traduccionTope(valor: string, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!edita(s)) return no("Tu rol no edita los límites.");
  const r = await cambiarConfig(s.id, "com_traduccion_hora", valor, motivoOk(motivo));
  if (!r.ok) return no(r.msg);
  listo();
  return { ok: true, mensaje: "Límite guardado. Quedó en la auditoría." };
}
