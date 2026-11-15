import "server-only";
import { alCambiarConfig } from "./cambios-config";
import type { PoolClient } from "pg";
import { db, tx } from "./db";
import { sinBloqueo, sinBloqueos } from "./comunidad";
import { leerObjeto } from "./medios";
import { revisarImagen } from "./moderacion-img";
import { LIMITES, MAX_NOTA, REP, type Limite, type ReglaKey } from "./moderacion-comun";
import { SANCIONES, type Sancion } from "./sanciones";
import { avisarOculto } from "./apelaciones";

/* 5d · Moderación de la Comunidad (fase5-comunidad.md §3 y §4 5d). El servidor decide todo:
   - reglasMod(): las reglas de Contenido › Auto-moderación (mod_rules) con sus parámetros; caché de 15 s.
   - limiteDia(): los límites del día (día local de la ciudad de la persona; la mitad las primeras 24 h de su cuenta), con candado por
     persona y tipo para que dos escrituras a la vez no se pasen. TODA escritura de la Comunidad lo pide (guardián limitesEnServidor).
   - efectoSancion(): lo que una sanción viva deja hacer en la Comunidad (lib/sanciones.ts `puede`), con hasta cuándo y por qué.
   - revisarAlEscribir(): después de guardar una publicación o un comentario, las reglas que MARCAN (nunca ocultan solas): listas de
     términos (odio · estafa · migra; autolesión siempre, con la línea del 988 para quien escribe), parecidos repetidos (spam) y
     señales de dónde vive alguien o placas (pii). Lo que marca → mod_flags (solo inserción) + caso en la cola (marcar()).
   - reportar(): motivo de REP → detalle ≤ 300 → «Ya no lo ves» (solo para quien reporta) → cola rep / repUsr. Después autoOcultar():
     N reportes de PERSONAS distintas en H horas, contando como una sola a las cuentas que comparten algún dispositivo (sus sesiones o el
     del reporte) y solo cuentas con más de edad_h horas; un Coronel vale 3 (§6 #9). Así un teléfono con cinco cuentas no oculta a nadie.
   - Fotos (`img`): revisarFotosCom() pasa las fotos nuevas de una publicación por el modelo propio; si las marca o el modelo no
     responde, se quedan en revisión (cola Medios marcados) y no se ven. Nunca se publica una foto sin revisar.
   - rafagaResenas() (rev5) y redDeCuentas() (votos y seguimientos desde un mismo dispositivo): barridos → cola repUsr. */
type Bi = { es: string; en: string };
type Q = Pick<PoolClient, "query">;
export type ResMod<T = object> = ({ ok: true } & T) | { ok: false; msg: Bi };
const no = (es: string, en: string): { ok: false; msg: Bi } => ({ ok: false, msg: { es, en } });
const ID = /^\d{1,18}$/, UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const fecha = (iso: string | null, es: boolean) => iso ? new Date(iso).toLocaleDateString(es ? "es-US" : "en-US", { day: "numeric", month: "long", timeZone: "America/New_York" }) : "";

/* ── Reglas ── */
export type Reglas = Record<ReglaKey, { on: boolean; p: Record<string, number> }>;
let cacheR: { at: number; r: Reglas } | null = null;
let escucha = false;
export async function reglasMod(c: Q = db()): Promise<Reglas> {
  if (!escucha) { escucha = true; alCambiarConfig(olvidarReglas); }
  if (cacheR && Date.now() - cacheR.at < 15_000) return cacheR.r;
  const r = (await c.query<{ key: ReglaKey; enabled: boolean; params: Record<string, number> }>(`select key, enabled, params from mod_rules`)).rows;
  const out = Object.fromEntries(r.map((x) => [x.key, { on: x.enabled, p: x.params ?? {} }])) as Reglas;
  for (const k of ["phone", "pii", "spam", "hate", "rev5", "img", "autohide"] as ReglaKey[]) out[k] ??= { on: true, p: {} };
  cacheR = { at: Date.now(), r: out };
  return out;
}
export const olvidarReglas = () => { cacheR = null; cacheT = null; };

/* ── Límites del día ── */
const CONTAR: Record<Limite, string> = {
  publicaciones: `select count(*)::int as n from com_posts where author_user_id = $1 and created_at >= $2`,
  comentarios: `select count(*)::int as n from com_comments where author_user_id = $1 and created_at >= $2`,
  votos: `select count(*)::int as n from com_votes where user_id = $1 and created_at >= $2`,
  conversaciones: `select count(*)::int as n from dm_threads where started_by = $1 and created_at >= $2`,
  reportes: `select count(*)::int as n from content_reports where reporter_user_id = $1 and created_at >= $2`,
};
export async function limiteDia(c: Q, userId: string, que: Limite): Promise<{ ok: true; tope: number } | { ok: false; msg: Bi }> {
  const L = LIMITES[que];
  await c.query(`select pg_advisory_xact_lock(hashtextextended($1, 0))`, [`lim:${que}:${userId}`]);
  const u = (await c.query<{ desde: string; nueva: boolean; tope: number }>(
    `select (date_trunc('day', now() at time zone z.tz) at time zone z.tz) as desde, u.created_at > now() - interval '24 hours' as nueva,
            cfg_int($2) as tope
       from users u left join cities ci on ci.id = u.home_city_id cross join lateral (select coalesce(ci.timezone, 'America/New_York') as tz) z where u.id = $1`,
    [userId, L.key])).rows[0];
  if (!u) return no("Entra para seguir.", "Sign in to continue.");
  const tope = u.nueva ? Math.max(1, Math.floor(u.tope / 2)) : u.tope;
  const n = (await c.query<{ n: number }>(CONTAR[que], [userId, u.desde])).rows[0]!.n;
  if (n < tope) return { ok: true, tope };
  return no(`Llegaste a ${tope} ${L.es} hoy${u.nueva ? " (la mitad el primer día de tu cuenta)" : ""}. Vuelve mañana.`,
    `You reached ${tope} ${L.en} today${u.nueva ? " (half on your account's first day)" : ""}. Come back tomorrow.`);
}

/* ── Sanción viva: qué deja hacer en la Comunidad ── */
export type Efecto = { kind: Sancion | null; hasta: string | null; motivo: string | null; sancionId: string | null } & (typeof SANCIONES)["adv"]["puede"];
export async function efectoSancion(c: Q, userId: string): Promise<Efecto> {
  const r = (await c.query<{ estado: string; hasta: string | null; motivo: string | null; kind: Sancion | null; sid: string | null; s_hasta: string | null; s_motivo: string | null }>(
    `select cuenta_estado(u.status, u.status_until) as estado, u.status_until as hasta, u.status_reason as motivo, s.kind, s.id::text as sid, s.ends_at as s_hasta, s.reason as s_motivo
       from users u left join lateral (select x.kind, x.id, x.ends_at, x.reason from sanctions x where x.target_kind = 'user' and x.target_id = u.id::text and x.lifted_at is null
                                          and (x.ends_at is null or x.ends_at > now()) and x.kind in ('mute7', 'nopub', 'susp14', 'ban') order by x.starts_at desc limit 1) s on true
      where u.id = $1`, [userId])).rows[0];
  const todo = SANCIONES.adv.puede, nada = SANCIONES.ban.puede;
  if (!r) return { kind: null, hasta: null, motivo: null, sancionId: null, ...nada };
  if (r.estado === "active") return { kind: null, hasta: null, motivo: null, sancionId: null, ...todo };
  if (r.estado === "muted") {
    const k: Sancion = r.kind === "nopub" ? "nopub" : "mute7";
    return { kind: k, hasta: r.s_hasta ?? r.hasta, motivo: r.s_motivo ?? r.motivo, sancionId: r.sid, ...SANCIONES[k].puede };
  }
  return { kind: r.kind === "ban" ? "ban" : "susp14", hasta: r.hasta, motivo: r.motivo, sancionId: r.sid, ...nada };
}
/* El mensaje de «no puedes … hasta …: motivo» (Publicar, el hilo y Mensajes dicen hasta cuándo y por qué). */
export function noPuede(e: Efecto, que: { es: string; en: string }): { ok: false; msg: Bi } {
  if (e.kind === "susp14" || e.kind === "ban" || !e.kind) return no("Tu cuenta no puede hacer esto ahora.", "Your account can't do this right now.");
  return no(`No puedes ${que.es} hasta el ${fecha(e.hasta, true)}${e.motivo ? `: ${e.motivo}` : "."}`, `You can't ${que.en} until ${fecha(e.hasta, false)}${e.motivo ? `: ${e.motivo}` : "."}`);
}

/* ── Marcar: mod_flags (solo inserción) + el caso en su cola ── */
export type Marca = { kind: "com_post" | "com_comment" | "user" | "media" | "review"; id: string; regla: string; detalle: string; autor: string | null; ciudad: string | null; prioridad?: "normal" | "alta" };
export async function marcar(c: Q, m: Marca): Promise<string | null> {
  const ciudad = m.ciudad ?? (m.autor ? (await c.query<{ c: string | null }>(`select home_city_id as c from users where id = $1`, [m.autor])).rows[0]?.c ?? null : null);
  let caso: string | null = null;
  if (ciudad) {
    const cola = m.kind === "user" ? "repUsr" : m.kind === "media" ? "medios" : "rep";
    caso = (await c.query<{ id: string }>(
      `insert into queue_items (queue, subject_kind, subject_id, city_id, priority) values ($1, $2, $3, $4, $5)
       on conflict (queue, subject_kind, subject_id) where status = 'open' do update set priority = case when excluded.priority = 'alta' then 'alta' else queue_items.priority end
       returning id::text`, [cola, m.kind, m.id, ciudad, m.prioridad ?? "normal"])).rows[0]?.id ?? null;
  }
  await c.query(`insert into mod_flags (target_kind, target_id, rule_key, detail, user_id, city_id, queue_item_id) values ($1, $2, $3, $4, $5, $6, $7::bigint)`,
    [m.kind, m.id, m.regla, m.detalle.slice(0, 500), m.autor, ciudad, caso]);
  return caso;
}

/* ── Revisar al escribir (marca; nunca oculta sola) ── */
type Termino = { kind: "odio" | "estafa" | "migra" | "autolesion"; re: RegExp; term: string };
let cacheT: { at: number; t: Termino[] } | null = null;
const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
async function terminos(c: Q): Promise<Termino[]> {
  if (!escucha) { escucha = true; alCambiarConfig(olvidarReglas); }
  if (cacheT && Date.now() - cacheT.at < 30_000) return cacheT.t;
  const r = (await c.query<{ kind: Termino["kind"]; term: string }>(`select kind, term from mod_terms where enabled`)).rows;
  const t = r.map((x) => ({ kind: x.kind, term: x.term, re: new RegExp(`(^|[^a-z0-9])${norm(x.term).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+")}($|[^a-z0-9])`) }));
  cacheT = { at: Date.now(), t };
  return t;
}
/* Una placa de Pensilvania (ABC-1234) o «vive en / lives on …»: señal de dónde vive alguien → una persona revisa. */
const PLACA = /\b[A-Z]{3}[-\s]?\d{4}\b/;
const VIVE = /\b(vive|viven|vivo|lives|live)\s+(en|on|at)\s+(la|el|the)?\s*[\wÁÉÍÓÚÑáéíóúñ'.-]+/i;
/* Mensajes entre vecinos: el equipo no los lee sin un reporte, así que aquí nada se marca; solo, si el texto habla de hacerse daño,
   quien escribe ve la línea del 988. */
export async function esCrisis(c: Q, texto: string): Promise<boolean> {
  const t = norm(texto);
  return (await terminos(c)).some((y) => y.kind === "autolesion" && y.re.test(t));
}
export type Revision = { crisis: boolean; marcas: string[] };
export async function revisarAlEscribir(c: Q, x: { kind: "com_post" | "com_comment"; id: string; autor: string; ciudad: string; texto: string }): Promise<Revision> {
  const R = await reglasMod(c), t = norm(x.texto), out: Revision = { crisis: false, marcas: [] };
  const hallados = (await terminos(c)).filter((y) => y.re.test(t));
  const de = (k: Termino["kind"]) => [...new Set(hallados.filter((y) => y.kind === k).map((y) => y.term))].slice(0, 3);
  const pon = async (regla: string, detalle: string, prioridad: "normal" | "alta" = "normal") => { out.marcas.push(regla); await marcar(c, { kind: x.kind, id: x.id, regla, detalle, autor: x.autor, ciudad: x.ciudad, prioridad }); };
  // Autolesión: siempre (seguridad), aunque la regla de listas esté apagada; quien escribe ve la línea del 988.
  if (de("autolesion").length) { out.crisis = true; await pon("autolesion", `Posible autolesión: «${de("autolesion").join("», «")}». Escríbele con cuidado; la persona vio la línea del 988.`, "alta"); }
  if (R.hate.on) {
    if (de("odio").length) await pon("hate", `Lenguaje discriminatorio: «${de("odio").join("», «")}»`);
    if (de("estafa").length) await pon("estafa", `Posible estafa: «${de("estafa").join("», «")}»`);
    if (de("migra").length) await pon("migra", `Inmigración: «${de("migra").join("», «")}». Nunca se pide ni se señala el estatus de nadie.`, "alta");
  }
  if (R.pii.on && (PLACA.test(x.texto) || VIVE.test(x.texto))) await pon("pii", PLACA.test(x.texto) ? "Parece una placa de carro" : "Parece decir dónde vive alguien");
  if (R.spam.on && x.texto.trim().length >= 10) {
    const n = Math.max(2, R.spam.p.n ?? 3), h = Math.max(1, R.spam.p.horas ?? 24), par = R.spam.p.parecido ?? 0.8;
    const k = (await c.query<{ n: number }>(
      `select count(*)::int as n from (
         select body from com_posts where author_user_id = $1 and created_at > now() - make_interval(hours => $2) and not ($5 = 'com_post' and id::text = $3)
         union all
         select body from com_comments where author_user_id = $1 and created_at > now() - make_interval(hours => $2) and not ($5 = 'com_comment' and id::text = $3)
       ) y where similarity(lower(unaccent(y.body)), lower(unaccent($4))) >= $6`, [x.autor, h, x.id, x.texto, x.kind, par])).rows[0]!.n;
    if (k + 1 >= n) await pon("spam", `${k + 1} publicaciones o comentarios parecidos en ${h} h`);
  }
  return out;
}

/* 9n-2 · Un texto que NO es una publicación de la Comunidad pero llega a mucha gente sin que nadie lo lea antes (p. ej. el aviso del organizador a quienes
   van a su evento, L848): pasa por las MISMAS listas y reglas (odio, estafa, inmigración, datos personales). A diferencia de una publicación, si lo marca NO sale:
   el organizador lo reescribe o pide revisión a Soporte, y queda una marca para el equipo (mod_flags + cola «repUsr»). Nunca lanza. */
export async function revisarTextoSuelto(c: Q, x: { texto: string; autor: string; ciudad: string | null; donde: string }): Promise<{ ok: true } | { ok: false; reglas: string[]; msg: Bi }> {
  const R = await reglasMod(c), t = norm(x.texto), reglas: string[] = [];
  const hallados = (await terminos(c)).filter((y) => y.re.test(t));
  const de = (k: Termino["kind"]) => [...new Set(hallados.filter((y) => y.kind === k).map((y) => y.term))].slice(0, 3);
  const pon = async (regla: string, detalle: string, prioridad: "normal" | "alta" = "normal") => { reglas.push(regla); await marcar(c, { kind: "user", id: x.autor, regla, detalle: `${x.donde}: ${detalle}`, autor: x.autor, ciudad: x.ciudad, prioridad }).catch(() => undefined); };
  if (R.hate.on) {
    if (de("odio").length) await pon("hate", `Lenguaje discriminatorio: «${de("odio").join("», «")}»`);
    if (de("estafa").length) await pon("estafa", `Posible estafa: «${de("estafa").join("», «")}»`);
    if (de("migra").length) await pon("migra", `Inmigración: «${de("migra").join("», «")}»`, "alta");
  }
  if (R.pii.on && (PLACA.test(x.texto) || VIVE.test(x.texto))) await pon("pii", PLACA.test(x.texto) ? "Parece una placa de carro" : "Parece decir dónde vive alguien");
  if (!reglas.length) return { ok: true };
  return { ok: false, reglas, msg: { es: "Tu aviso no se envió: tiene algo que las reglas de To'Latino no permiten (lenguaje que ofende, una estafa, el estatus migratorio de alguien o datos personales). Reescríbelo; si crees que fue un error, escríbele a Soporte.",
    en: "Your notice was not sent: it has something To'Latino's rules do not allow (offensive language, a scam, someone's immigration status or personal data). Rewrite it; if you think it was a mistake, write to Support." } };
}

/* ── Fotos de una publicación (regla img): las nuevas pasan por el modelo propio; si las marca o no responde, esperan revisión ── */
export async function revisarFotosCom(postId: string): Promise<{ revision: number }> {
  const R = await reglasMod();
  const F = (await db().query<{ id: string; url: string; autor: string | null; ciudad: string }>(
    `select m.id::text, m.url, m.uploaded_by::text as autor, p.city_id as ciudad from media m join com_posts p on p.id::text = m.owner_id
      where m.owner_kind = 'com_post' and m.owner_id = $1 and m.status = 'review'
        and not exists (select 1 from mod_flags f where f.target_kind = 'media' and f.target_id = m.id::text)`, [postId])).rows;
  let revision = 0;
  await Promise.all(F.map(async (f) => {
    if (!R.img.on) { await db().query(`update media set status = 'visible' where id = $1::uuid and status = 'review'`, [f.id]); return; }
    const datos = await leerObjeto(f.url.replace(/^\/medios\//, "")).catch(() => null);
    const r = datos ? await revisarImagen(datos, R.img.p.umbral ?? 0.6) : { estado: "sin_servicio" as const, desnudez: null, ms: null };
    if (r.estado === "ok") { await db().query(`update media set status = 'visible' where id = $1::uuid and status = 'review'`, [f.id]); return; }
    revision++;
    await tx((c) => marcar(c, { kind: "media", id: f.id, regla: "img", autor: f.autor, ciudad: f.ciudad,
      detalle: r.estado === "marcada" ? `El modelo la marcó por desnudez (${Math.round((r.desnudez ?? 0) * 100)} %). No se ve hasta que la revises.` : "El modelo no respondió: revisión manual. No se ve hasta que la revises." }));
  }));
  return { revision };
}

/* ── Reportar (publicación, comentario o persona) ── */
export type QueReporto = "post" | "comment" | "user";
export async function reportar(viewer: string, que: QueReporto, id: string, motivo: string, nota: string, device: string | null): Promise<ResMod<{ oculto: boolean }>> {
  if (!REP.some(([k]) => k === motivo)) return no("Elige por qué lo reportas.", "Pick why you're reporting it.");
  if (que === "user" ? !UUID.test(id) : !ID.test(id)) return no("Eso ya no está.", "That is gone.");
  const n = String(nota ?? "").replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim().slice(0, MAX_NOTA) || null;
  const dev = device && UUID.test(device) ? device : null;
  const r = await tx(async (c) => {
    const e = await efectoSancion(c, viewer);
    if (!e.reportar) return noPuede(e, { es: "reportar", en: "report" });
    const lim = await limiteDia(c, viewer, "reportes");
    if (!lim.ok) return lim;
    const kind = que === "post" ? "com_post" : que === "comment" ? "com_comment" : "user";
    const t = que === "post"
      ? (await c.query<{ autor: string; ciudad: string }>(`select p.author_user_id::text as autor, p.city_id as ciudad from com_posts p
          where p.id = $2::bigint and p.status = 'visible' and p.author_kind = 'user' and ${sinBloqueos("p.author_user_id", "$1")}`, [viewer, id])).rows[0]
      : que === "comment"
        ? (await c.query<{ autor: string; ciudad: string }>(`select cm.author_user_id::text as autor, cm.city_id as ciudad from com_comments cm join com_posts p on p.id = cm.post_id
            where cm.id = $2::bigint and cm.status = 'visible' and p.status = 'visible' and ${sinBloqueos("cm.author_user_id", "$1")} and ${sinBloqueos("p.author_user_id", "$1")}`, [viewer, id])).rows[0]
        : (await c.query<{ autor: string; ciudad: string }>(`select u.id::text as autor, coalesce(u.home_city_id, 'hzl') as ciudad from users u join community_profiles cp on cp.user_id = u.id
            where u.id = $2 and ${sinBloqueo("u.id", "$1")}`, [viewer, id])).rows[0];
    if (!t) return no("Eso ya no está.", "That is gone.");
    if (t.autor === viewer) return no("Lo tuyo no se reporta.", "You can't report your own.");
    const rango = (await c.query<{ r: number }>(`select coalesce((select rank_level from community_profiles where user_id = $1), 1) as r`, [viewer])).rows[0]!.r;
    const alta = motivo === "acoso" || motivo === "priv" || rango >= 8;
    // Una publicación o un comentario se reporta una vez por persona. Una persona sigue en el tiempo: si ya la habías reportado y ese
    // caso se cerró, tu reporte nuevo lo vuelve a abrir (como una conversación).
    const nuevo = (await c.query(que === "user"
      ? `insert into content_reports (target_kind, target_id, city_id, reporter_user_id, by_business, reason, note, priority, device) values ($1, $2, $3, $4, false, $5, $6, $7, $8::uuid)
         on conflict (target_kind, target_id, reporter_user_id) do update set status = 'open', reason = excluded.reason, note = excluded.note, priority = excluded.priority, device = excluded.device,
           decided_by = null, decided_at = null, created_at = now() where content_reports.status <> 'open'`
      : `insert into content_reports (target_kind, target_id, city_id, reporter_user_id, by_business, reason, note, priority, device) values ($1, $2, $3, $4, false, $5, $6, $7, $8::uuid)
         on conflict (target_kind, target_id, reporter_user_id) do nothing`, [kind, id, t.ciudad, viewer, motivo, n, rango >= 8 ? 1 : 0, dev])).rowCount;
    // «Ya no lo ves» para quien reporta (aunque ya lo hubiera reportado antes); a una persona, se la silencia para quien reporta.
    if (que === "user") await c.query(`insert into user_blocks (user_id, target_user_id, kind) select $1, $2, 'mute' where not exists (select 1 from user_blocks where user_id = $1 and target_user_id = $2 and kind = 'mute' and removed_at is null)`, [viewer, id]);
    else await c.query(`insert into com_hidden_for (user_id, target_kind, target_id) values ($1, $2, $3::bigint) on conflict do nothing`, [viewer, que, id]);
    if (!nuevo) return { ok: true as const, oculto: true, auto: null };
    await c.query(`insert into queue_items (queue, subject_kind, subject_id, city_id, priority) values ($1, $2, $3, $4, $5)
                   on conflict (queue, subject_kind, subject_id) where status = 'open' do update set priority = case when excluded.priority = 'alta' then 'alta' else queue_items.priority end`,
      [que === "user" ? "repUsr" : "rep", kind, id, t.ciudad, alta ? "alta" : "normal"]);
    const auto = que === "user" ? null : await autoOcultar(c, kind as "com_post" | "com_comment", id);
    return { ok: true as const, oculto: true, auto: auto ? { autor: t.autor, kind, motivo: auto } : null };
  });
  if (!r.ok) return r;
  // Auto-ocultada: aviso al autor con el motivo y «Apelar» (después de guardar; un aviso nunca rompe el reporte).
  if (r.auto) await avisarOculto(r.auto.autor, r.auto.kind as "com_post" | "com_comment", id, r.auto.motivo, { auto: true });
  return { ok: true, oculto: true };
}

/* ── Auto-ocultar: personas y dispositivos distintos, nunca cuentas del mismo teléfono ── */
export const MOTIVO_AUTO = "Varios vecinos la reportaron. Queda oculta mientras una persona de To'Latino la revisa.";
export async function autoOcultar(c: Q, kind: "com_post" | "com_comment", id: string): Promise<string | null> {
  const R = await reglasMod(c);
  if (!R.autohide.on) return null;
  const umbral = Math.max(2, R.autohide.p.reportes ?? 5), horas = Math.max(1, R.autohide.p.horas ?? 24), edad = Math.max(0, R.autohide.p.edad_h ?? 72);
  const tabla = kind === "com_post" ? "com_posts" : "com_comments";
  const vivo = (await c.query(`select 1 from ${tabla} where id = $1::bigint and status = 'visible' for update`, [id])).rowCount;
  if (!vivo) return null;
  const F = (await c.query<{ quien: string; device: string | null; vieja: boolean; rango: number; devs: string[] }>(
    `select cr.reporter_user_id::text as quien, cr.device::text as device, u.created_at <= now() - make_interval(hours => $3) as vieja, coalesce(cp.rank_level, 1) as rango,
            array(select distinct s.device::text from sessions s where s.user_id = cr.reporter_user_id and s.device is not null) as devs
       from content_reports cr join users u on u.id = cr.reporter_user_id left join community_profiles cp on cp.user_id = u.id
      where cr.target_kind = $1 and cr.target_id = $2 and cr.status = 'open' and cr.created_at > now() - make_interval(hours => $4)`, [kind, id, edad, horas])).rows.filter((x) => x.vieja);
  // Unión por dispositivo compartido: cada grupo de cuentas que comparte algún dispositivo cuenta como UNA persona.
  const padre = F.map((_, i) => i), raiz = (i: number): number => (padre[i] === i ? i : (padre[i] = raiz(padre[i]!)));
  const visto = new Map<string, number>();
  F.forEach((x, i) => { for (const d of new Set([...(x.devs ?? []), ...(x.device ? [x.device] : [])])) { const j = visto.get(d); if (j === undefined) visto.set(d, i); else padre[raiz(i)] = raiz(j); } });
  const grupos = new Map<number, number>();
  F.forEach((x, i) => { const g = raiz(i); grupos.set(g, Math.max(grupos.get(g) ?? 0, x.rango >= 9 ? 3 : 1)); });
  const peso = [...grupos.values()].reduce((a, b) => a + b, 0);
  if (peso < umbral) return null;
  await c.query(`update ${tabla} set status = 'hidden', hidden_by = 'auto', hidden_staff_id = null, hidden_reason = $2, hidden_at = now() where id = $1::bigint and status = 'visible'`, [id, MOTIVO_AUTO]);
  const autor = (await c.query<{ a: string; c: string }>(`select author_user_id::text as a, city_id as c from ${tabla} where id = $1::bigint`, [id])).rows[0]!;
  await marcar(c, { kind, id, regla: "autohide", autor: autor.a, ciudad: autor.c, prioridad: "alta",
    detalle: `Oculta sola: ${F.length} reportes de ${grupos.size} personas con dispositivos distintos en ${horas} h (umbral ${umbral}). Decide si vuelve.` });
  return MOTIVO_AUTO;
}

/* ── rev5: reseñas sin transacción en ráfaga → repUsr ── */
export async function rafagaResenas(userId: string): Promise<boolean> {
  const R = await reglasMod();
  if (!R.rev5.on || !UUID.test(userId)) return false;
  const n = Math.max(2, R.rev5.p.n ?? 5), min = Math.max(1, R.rev5.p.min ?? 10);
  return tx(async (c) => {
    await c.query(`select pg_advisory_xact_lock(hashtextextended($1, 0))`, [`rev5:${userId}`]);
    // Solo cuentan las reseñas posteriores a la última marca: una ráfaga ya marcada (y decidida) no se vuelve a abrir cada minuto;
    // una ráfaga nueva, sí.
    const x = (await c.query<{ n: number; ciudad: string | null }>(
      `select count(*)::int as n, max(r.city_id) as ciudad from reviews r where r.user_id = $1 and r.operation_id is null and r.status <> 'removed' and r.created_at > now() - make_interval(mins => $2)
          and r.created_at > coalesce((select max(f.created_at) from mod_flags f where f.target_kind = 'user' and f.target_id = $1::text and f.rule_key = 'rev5'), '-infinity'::timestamptz)`, [userId, min])).rows[0]!;
    if (x.n < n) return false;
    await marcar(c, { kind: "user", id: userId, regla: "rev5", autor: userId, ciudad: x.ciudad, detalle: `${x.n} reseñas sin transacción en ${min} min (regla: ${n} en ${min} min).` });
    return true;
  });
}

/* ── Red de cuentas: votos y seguimientos desde un mismo dispositivo → repUsr de quien se beneficia ── */
export async function redDeCuentas(): Promise<number> {
  const V = (await db().query<{ autor: string; device: string; cuentas: number; votos: number }>(
    `select x.autor::text as autor, x.device::text as device, count(distinct x.user_id)::int as cuentas, count(*)::int as votos from (
       select v.device, v.user_id, v.created_at as creado, coalesce(p.author_user_id, c.author_user_id) as autor
         from com_votes v left join com_posts p on v.target_kind = 'post' and p.id = v.target_id left join com_comments c on v.target_kind = 'comment' and c.id = v.target_id
        where v.created_at > now() - interval '7 days' and v.device is not null and v.v = 1) x
      where x.autor is not null and x.creado > coalesce((select max(f.created_at) from mod_flags f where f.target_kind = 'user' and f.target_id = x.autor::text and f.rule_key = 'red'), '-infinity'::timestamptz)
      group by x.autor, x.device having count(distinct x.user_id) >= 2 and count(*) >= 3 limit 200`)).rows;
  const S = (await db().query<{ autor: string; device: string; cuentas: number }>(
    `select f.target_id as autor, s.device::text as device, count(distinct f.follower_user_id)::int as cuentas
       from follows f join sessions s on s.user_id = f.follower_user_id and s.device is not null
      where f.target_kind = 'user' and f.created_at > now() - interval '7 days'
        and f.created_at > coalesce((select max(m.created_at) from mod_flags m where m.target_kind = 'user' and m.target_id = f.target_id and m.rule_key = 'red'), '-infinity'::timestamptz)
      group by f.target_id, s.device having count(distinct f.follower_user_id) >= 3 limit 200`)).rows;
  let n = 0;
  for (const [autor, detalle] of [...V.map((x) => [x.autor, `Posible red de votos: ${x.cuentas} cuentas desde un mismo dispositivo votaron a favor de lo suyo ${x.votos} veces en 7 días (esos votos no cuentan).`] as const),
    ...S.map((x) => [x.autor, `Posible red de seguidores: ${x.cuentas} cuentas que la siguen entraron desde un mismo dispositivo en 7 días.`] as const)]) {
    if (!UUID.test(autor)) continue;
    const hecho = await tx(async (c) => {
      await c.query(`select pg_advisory_xact_lock(hashtextextended($1, 0))`, [`red:${autor}`]);
      // Una marca por persona y barrido: lo de después de la última marca (la consulta ya lo filtra) abre un caso nuevo.
      if ((await c.query(`select 1 from mod_flags where target_kind = 'user' and target_id = $1 and rule_key = 'red' and created_at > now() - interval '1 minute'`, [autor])).rowCount) return false;
      await marcar(c, { kind: "user", id: autor, regla: "red", autor, ciudad: null, detalle });
      return true;
    });
    if (hecho) n++;
  }
  return n;
}

/* El barrido de cada minuto: ráfagas de reseñas (respaldo de la revisión al guardar) y redes de cuentas. */
export async function barrerModeracion() {
  const R = await reglasMod();
  if (R.rev5.on) {
    const L = (await db().query<{ u: string }>(
      `select user_id::text as u from reviews where operation_id is null and created_at > now() - make_interval(mins => $1) group by user_id having count(*) >= $2 limit 200`,
      [Math.max(1, R.rev5.p.min ?? 10), Math.max(2, R.rev5.p.n ?? 5)])).rows;
    for (const x of L) await rafagaResenas(x.u).catch(() => undefined);
  }
  await redDeCuentas();
}
