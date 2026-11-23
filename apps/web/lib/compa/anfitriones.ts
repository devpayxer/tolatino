import "server-only";
import { db } from "../db";
import { ENTORNO } from "../entorno";
import { valores } from "../config";
import { cupoCiudad } from "../anfitriones";
import { publicar } from "../comunidad";
import { comentar } from "../comunidad-hilo";
import { esCrisis } from "../moderacion";
import { MARCA_ANF } from "../comunidad-comun";
import { ESQUEMA_ANF, delicado, filtroAnfitrion, pautaAnfitrion, plantilla, temaDe, TEMA_L, type DatoApp, type Tema, type TipoAnf } from "../anfitriones-comun";
import { ErrorModelo, modelo, motorActivo, type Motor, type Salida } from "./modelo";
import { modeloDe } from "./tope";
import { tapar } from "./tapar";

/* AO · El motor de los anfitriones del barrio (docs/diseno/plan/anfitriones.md). Lo llama SOLO el barrido central (guardián anfitrionesSoloBarrido):
   nada de lo que hace un vecino espera a una voz. Si algo falla (el modelo, el tope, la moderación), simplemente no se publica y queda en el registro.
   Cada minuto, por ciudad encendida (com_host_cities.mode auto o manual; nunca con «Pausar a todos»):
   1) Cupos del día: en auto, la actividad real (publicaciones y respuestas de PERSONAS en los últimos 7 días en la ciudad) pasa por los tramos de
      Configuración; en manual, los números de la ciudad. Lo ya publicado hoy (día local) se descuenta del registro.
   2) Lo propio de la app (empleos, eventos de la semana, negocio nuevo, pregunta del día): plantillas con la fila de la app, sin IA. Cada fuente
      una sola vez por ciudad (índice único del registro).
   3) Respuestas: a la publicación de un vecino que lleva anf_espera_min sin respuesta de otra persona, UNA voz (la del tema; a los recién llegados,
      Doña Milagros), una vez por hilo; otra solo si el vecino le contestó a la voz, hasta anf_idas_max. Nunca a otra voz, a algo reportado o
      marcado, a quien la bloqueó o silenció, ni a un tema delicado. El texto lo escribe el modelo de El Compa (misma interfaz, mismo motor por llave)
      con el tope PROPIO (anf_reservar → anf_anotar); fuera de producción SIEMPRE el simulador o las reglas, nunca el proveedor real.
   Todo lo que publica una voz entra por publicar() y comentar(): la MISMA moderación, límites y antiabuso que un vecino, más filtroAnfitrion(). */

const ESPERA_MS = 8000, SALIDA_MAX = 220, ENTRADA_MAX = 2500;

/* El motor: en producción el de El Compa (claude con llave; sin llave, reglas = no responde). Fuera de producción NUNCA el proveedor real. */
export function motorAnfitriones(): Motor {
  const m = motorActivo();
  if (ENTORNO !== "produccion") return m === "reglas" ? "reglas" : "simulador";
  return m;
}

export type Ciudad = { id: string; name: string; mode: "auto" | "manual"; mp: number; mr: number; dia: string };
type Log = { ciudad: string; voz: string | null; kind: TipoAnf | "respuesta"; ref: string; motor: Motor | "plantilla" | "ninguno"; modelo?: string | null; costo?: number;
  tin?: number; tout?: number; post?: string | null; comment?: string | null; motivo?: string | null; detalle?: string | null; dia: string };
async function anotar(l: Log): Promise<boolean> {
  const r = await db().query(
    `insert into com_host_log (city_id, host_user_id, kind, source_ref, motor, model, cost_microusd, input_tokens, output_tokens, post_id, comment_id, outcome, reason, detail, local_day)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::bigint, $11::bigint, $12, $13, $14, $15::date) on conflict (city_id, kind, source_ref) do nothing`,
    [l.ciudad, l.voz, l.kind, l.ref.slice(0, 200), l.motor, l.modelo ?? null, Math.max(0, Math.round(l.costo ?? 0)), l.tin ?? 0, l.tout ?? 0, l.post ?? null, l.comment ?? null,
      l.post || l.comment ? "publicada" : "descartada", l.post || l.comment ? null : l.motivo ?? "error", l.detalle ? l.detalle.slice(0, 300) : null, l.dia]);
  return (r.rowCount ?? 0) > 0;
}

export type Voz = { id: string; slug: string; nombre: string; gender: "m" | "f"; topic: Tema; style: string };
async function voces(): Promise<Voz[]> {
  return (await db().query<Voz>(`select user_id::text as id, slug, name as nombre, gender, topic, style from com_hosts where active order by slug`)).rows;
}

/* ── Lo propio de la app ── una fuente por tipo encendido, la más reciente que todavía no se publicó en la ciudad. */
async function fuente(k: TipoAnf, c: Ciudad): Promise<{ ref: string; dato: DatoApp } | null> {
  if (k === "empleos") {
    const x = (await db().query<{ id: string; puesto: string; negocio: string }>(
      `select j.id::text, j.title->>'es' as puesto, b.name as negocio from job_postings j join businesses b on b.id = j.business_id
        where j.city_id = $1 and vacante_en_vivo(j) and coalesce(j.published_at, j.created_at) > now() - interval '7 days'
          and not exists (select 1 from com_host_log l where l.city_id = $1 and l.kind = 'empleos' and l.source_ref = 'job:' || j.id)
        order by coalesce(j.published_at, j.created_at) desc, j.id desc limit 1`, [c.id])).rows[0];
    return x ? { ref: `job:${x.id}`, dato: { tipo: "empleos", puesto: x.puesto, negocio: x.negocio, ciudad: c.name } } : null;
  }
  if (k === "eventos") {
    const x = (await db().query<{ id: string; evento: string; dia: string }>(
      `select d.id::text, e.title->>'es' as evento, to_char(d.starts_at at time zone coalesce(ci.timezone, 'America/New_York'), 'DD/MM') as dia
         from event_dates d join events e on e.id = d.event_id join cities ci on ci.id = e.city_id
        where e.city_id = $1 and e.status = 'live' and d.status = 'scheduled' and d.starts_at between now() and now() + interval '7 days'
          and not exists (select 1 from com_host_log l where l.city_id = $1 and l.kind = 'eventos' and l.source_ref = 'evt:' || d.id)
        order by d.starts_at, d.id limit 1`, [c.id])).rows[0];
    return x ? { ref: `evt:${x.id}`, dato: { tipo: "eventos", evento: x.evento, dia: x.dia, ciudad: c.name } } : null;
  }
  if (k === "negocio_nuevo") {
    const x = (await db().query<{ id: string; negocio: string; cat: string | null }>(
      `select b.id, b.name as negocio, sc.name->>'es' as cat from businesses b left join subcategorias_vivas sc on sc.id = b.subcategory_ids[1]
        where b.city_id = $1 and b.status = 'active' and b.created_at > now() - interval '7 days'
          and not exists (select 1 from com_host_log l where l.city_id = $1 and l.kind = 'negocio_nuevo' and l.source_ref = 'biz:' || b.id)
        order by b.created_at desc, b.id limit 1`, [c.id])).rows[0];
    return x ? { ref: `biz:${x.id}`, dato: { tipo: "negocio_nuevo", negocio: x.negocio, categoria: x.cat, ciudad: c.name } } : null;
  }
  if (k === "pregunta_dia") {
    // Una por ciudad y día local; la lista se recorre en orden (la del día = número del día entre las activas).
    if ((await db().query(`select 1 from com_host_log where city_id = $1 and kind = 'pregunta_dia' and source_ref = $2`, [c.id, `dia:${c.dia}`])).rowCount) return null;
    const x = (await db().query<{ id: string; body: string }>(
      `select q.id::text, q.body from com_host_questions q where q.status = 'active' and q.lang = 'es'
        order by q.id offset (($1::date - date '2026-01-01') % greatest(1, (select count(*) from com_host_questions where status = 'active' and lang = 'es'))) limit 1`, [c.dia])).rows[0];
    return x ? { ref: `dia:${c.dia}`, dato: { tipo: "pregunta_dia", pregunta: x.body } } : null;
  }
  return null; // noticias: 5b, fuera de esta parte
}

async function publicarPropio(c: Ciudad, n: number, V: Map<string, Voz>): Promise<number> {
  const tipos = (await db().query<{ key: TipoAnf; voz: string }>(`select key, host_user_id::text as voz from com_host_kinds where active and key <> 'noticias' order by sort, key`)).rows;
  let hechas = 0;
  for (const t of tipos) {
    if (hechas >= n) break;
    const voz = V.get(t.voz);
    if (!voz) continue; // la voz de ese tipo está apagada
    const f = await fuente(t.key, c);
    if (!f) continue;
    const pl = plantilla(f.dato);
    const fallo = filtroAnfitrion(pl.body);
    if (fallo) { await anotar({ ciudad: c.id, voz: voz.id, kind: t.key, ref: f.ref, motor: "plantilla", motivo: "filtro", detalle: fallo, dia: c.dia }); continue; }
    const r = await publicar(voz.id, c.id, { kind: pl.kind, body: pl.body, topic: pl.topic, fotos: [] }).catch((e) => ({ ok: false as const, msg: { es: String(e?.message ?? e).slice(0, 200), en: "" } }));
    if (!r.ok) { await anotar({ ciudad: c.id, voz: voz.id, kind: t.key, ref: f.ref, motor: "plantilla", motivo: /Llegaste a/.test(r.msg.es) ? "limite" : "moderacion", detalle: r.msg.es, dia: c.dia }); continue; }
    if (await anotar({ ciudad: c.id, voz: voz.id, kind: t.key, ref: f.ref, motor: "plantilla", post: r.id, dia: c.dia })) hechas++;
  }
  return hechas;
}

/* ── Responder ── */
export type Cand = { post: string; ref: string; autor: string; body: string; topic: string | null; salud: boolean; nuevo: boolean; parent: string | null; replyTo: string | null; voz: string | null; lang: "es" | "en" };
async function candidatos(c: Ciudad, n: number): Promise<Cand[]> {
  const L = n * 3;
  const [P, F] = await Promise.all([
    // Publicaciones de PERSONAS sin respuesta de otra persona, con anf_espera_min encima (y de menos de 3 días).
    db().query<Cand>(
      `select p.id::text as post, 'post:' || p.id as ref, p.author_user_id::text as autor, p.body, p.topic, p.health_notice as salud, p.lang,
              u.created_at > now() - make_interval(days => cfg_int('anf_nuevo_dias')) as nuevo, null::text as parent, null::text as "replyTo", null::text as voz
         from com_posts p join users u on u.id = p.author_user_id
        where p.city_id = $1 and p.status = 'visible' and p.author_kind = 'user' and u.kind = 'person' and p.comments_locked_at is null
          and p.publish_at <= now() - make_interval(mins => cfg_int('anf_espera_min')) and p.publish_at > now() - interval '3 days'
          and not exists (select 1 from com_comments x join users xu on xu.id = x.author_user_id where x.post_id = p.id and x.author_user_id <> p.author_user_id and x.status <> 'deleted' and xu.kind = 'person')
          and not exists (select 1 from com_comments x join users xu on xu.id = x.author_user_id where x.post_id = p.id and xu.kind = 'host')
          and not exists (select 1 from com_host_log l where l.city_id = $1 and l.kind = 'respuesta' and l.source_ref = 'post:' || p.id)
          and not exists (select 1 from content_reports r where r.target_kind = 'com_post' and r.target_id = p.id::text)
          and not exists (select 1 from mod_flags f where f.target_kind = 'com_post' and f.target_id = p.id::text)
        order by p.publish_at, p.id limit $2`, [c.id, L]),
    // Un vecino le contestó a una voz: esa misma voz, si el hilo no llegó a anf_idas_max respuestas de voces.
    db().query<Cand>(
      `select cm.post_id::text as post, 'cm:' || cm.id as ref, cm.author_user_id::text as autor, cm.body, p.topic, p.health_notice as salud, cm.lang, false as nuevo,
              coalesce(cm.parent_id, cm.id)::text as parent, cm.id::text as "replyTo", h.author_user_id::text as voz
         from com_comments cm join users u on u.id = cm.author_user_id and u.kind = 'person'
         join com_comments h on h.id = coalesce(cm.reply_to_id, cm.parent_id) join users hu on hu.id = h.author_user_id and hu.kind = 'host'
         join com_posts p on p.id = cm.post_id
        where cm.city_id = $1 and cm.status = 'visible' and cm.created_at > now() - interval '2 days' and p.status = 'visible' and p.comments_locked_at is null
          and (select count(*) from com_comments x join users xu on xu.id = x.author_user_id where x.post_id = cm.post_id and xu.kind = 'host' and x.status <> 'deleted') < cfg_int('anf_idas_max')
          and not exists (select 1 from com_host_log l where l.city_id = $1 and l.kind = 'respuesta' and l.source_ref = 'cm:' || cm.id)
          and not exists (select 1 from content_reports r where (r.target_kind = 'com_comment' and r.target_id = cm.id::text) or (r.target_kind = 'com_post' and r.target_id = p.id::text))
          and not exists (select 1 from mod_flags f where (f.target_kind = 'com_comment' and f.target_id = cm.id::text) or (f.target_kind = 'com_post' and f.target_id = p.id::text))
        order by cm.created_at, cm.id limit $2`, [c.id, L]),
  ]);
  return [...F.rows, ...P.rows];
}

/* El JSON del modelo, revisado aquí (nunca se confía en él). */
function leerSalida(j: unknown, refs: Map<string, string>): { texto: string; negocio: string | null } | null {
  if (!j || typeof j !== "object") return null;
  const x = j as { texto?: unknown; negocio?: unknown };
  if (typeof x.texto !== "string" || (x.negocio != null && typeof x.negocio !== "string")) return null;
  const ref = String(x.negocio ?? "").trim();
  if (ref && !refs.has(ref)) return null; // un negocio que no vino de la app
  return { texto: x.texto.replace(/\s+/g, " ").trim(), negocio: ref ? refs.get(ref)! : null };
}

/* El tope propio, con la misma forma que El Compa (guardián compaPorElTope): gastar() reserva el máximo ANTES de llamar (anf_reservar contra
   anf_tope_mes_cents); anotarUso() liquida DESPUÉS con los tokens que devolvió (anf_anotar), en el camino del error y en el de la respuesta. */
async function gastar(modeloId: string): Promise<string | null> {
  return (await db().query<{ id: string | null }>(`select anf_reservar($1, $2, $3)::text as id`, [modeloId, ENTRADA_MAX, SALIDA_MAX])).rows[0]?.id ?? null;
}
async function anotarUso(a: { reserva: string; modelo: string; tokens?: { entrada: number; salida: number }; cobrarReservado?: boolean }): Promise<number> {
  const t = a.tokens ?? { entrada: 0, salida: 0 };
  return Number((await db().query<{ c: string }>(`select anf_anotar($1::uuid, $2, $3, $4, $5)::text as c`,
    [a.reserva, a.modelo, Math.max(0, Math.round(t.entrada)), Math.max(0, Math.round(t.salida)), !!a.cobrarReservado])).rows[0]?.c ?? 0);
}

/* Una respuesta de una voz (exportada solo para que el guardián del tope la encuentre; la llama barrerAnfitriones). */
export async function responderUno(c: Ciudad, x: Cand, V: Map<string, Voz>, porSlug: Map<string, Voz>): Promise<boolean> {
  const base = { ciudad: c.id, kind: "respuesta" as const, ref: x.ref, dia: c.dia };
  // La voz: la que ya conversa en el hilo o la del tema (a los recién llegados, la del barrio); si está apagada, la del barrio; si no, ninguna.
  const tema = temaDe(x.topic, x.body, x.nuevo);
  const voz = x.voz ? V.get(x.voz) : [...V.values()].find((v) => v.topic === tema) ?? porSlug.get("milagros");
  if (!voz) return false; // ninguna voz encendida para esto: no se anota (se mira otra vez cuando haya una)
  // Quien publicó bloqueó o silenció a esa voz: nunca le contesta.
  if ((await db().query(`select 1 from user_blocks where removed_at is null and ((user_id = $1 and target_user_id = $2) or (user_id = $2 and target_user_id = $1))`, [x.autor, voz.id])).rowCount)
    return anotar({ ...base, voz: voz.id, motor: "ninguno", motivo: "bloqueo", dia: c.dia }).then(() => false);
  // Temas delicados: silencio (el 911 / 988 lo pone el flujo de siempre a quien publicó).
  const d = delicado(x.body, { salud: x.salud, crisis: await esCrisis(db(), x.body).catch(() => true) });
  if (d) return anotar({ ...base, voz: voz.id, motor: "ninguno", motivo: "delicado", detalle: d }).then(() => false);
  // El modelo (mismo motor que El Compa; fuera de producción nunca el real) con el tope propio.
  const motor = motorAnfitriones(), m = await modelo(motor);
  if (!m) return anotar({ ...base, voz: voz.id, motor, motivo: "motor", detalle: "sin modelo (reglas)" }).then(() => false);
  const modeloId = motor === "simulador" ? "simulador" : await modeloDe("neighbor");
  if (!modeloId) return anotar({ ...base, voz: voz.id, motor, motivo: "motor", detalle: "sin modelo activo" }).then(() => false);
  const reserva = await gastar(modeloId);
  if (!reserva) return anotar({ ...base, voz: voz.id, motor, modelo: modeloId, motivo: "tope" }).then(() => false);
  // Negocios de la app que la voz puede nombrar (del tema, en la ciudad; refs, nunca ids crudos).
  const busca = tema === "comida" ? "comida | restaurante" : tema === "musica" ? "musica | fiesta" : null;
  const negs = busca ? (await db().query<{ id: string; nombre: string }>(
    `select b.id, b.name as nombre from businesses b where b.city_id = $1 and b.status = 'active' and b.search_doc @@ to_tsquery('simple', $2) order by b.id limit 5`, [c.id, busca])).rows : [];
  const refs = new Map(negs.map((b, i) => [`n${i + 1}`, b.id]));
  const t0 = Date.now(), lang = x.lang === "en" ? "en" : "es";
  let sal: Salida, costo = 0;
  try {
    sal = await Promise.race([
      m.responder({ uso: "anfitrion", modelo: modeloId, lang, sistema: pautaAnfitrion({ nombre: voz.nombre, marca: MARCA_ANF[voz.gender].es.toLowerCase(), estilo: voz.style, tema: TEMA_L[voz.topic].es, ciudad: c.name }),
        datos: { voz: voz.nombre, ciudad: c.name, NEGOCIOS_DE_LA_APP: negs.map((b, i) => ({ ref: `n${i + 1}`, nombre: b.nombre })) }, trozos: [],
        mensajes: [{ de: "persona", texto: tapar(x.body).texto }], maxTokens: SALIDA_MAX, esperaMs: ESPERA_MS, esquema: ESQUEMA_ANF as unknown as Record<string, unknown> }),
      new Promise<never>((_, no) => setTimeout(() => no(new ErrorModelo("timeout", true, "tiempo agotado")), ESPERA_MS)),
    ]);
    costo = await anotarUso({ reserva, modelo: modeloId, tokens: sal.tokens });
  } catch (e) {
    const err = e instanceof ErrorModelo ? e : new ErrorModelo("error", false, "error");
    costo = await anotarUso({ reserva, modelo: modeloId, tokens: err.tokens ? { entrada: err.tokens.entrada, salida: err.tokens.salida } : undefined, cobrarReservado: err.cobrar && !err.tokens });
    return anotar({ ...base, voz: voz.id, motor, modelo: modeloId, costo, motivo: "motor", detalle: `${err.tipo} · ${Date.now() - t0} ms` }).then(() => false);
  }
  const caro = { voz: voz.id, motor, modelo: modeloId, costo, tin: sal.tokens.entrada, tout: sal.tokens.salida };
  const s = leerSalida(sal.json, refs);
  if (!s) return anotar({ ...base, ...caro, motivo: "filtro", detalle: "salida que no encaja" }).then(() => false);
  const f = filtroAnfitrion(s.texto, { negocioDeLaApp: !!s.negocio });
  if (f) return anotar({ ...base, ...caro, motivo: "filtro", detalle: f }).then(() => false);
  // La MISMA puerta que un vecino (filtro, sanción, límites, moderación al escribir y avisos).
  const r = await comentar(voz.id, x.post, { body: s.texto, business: s.negocio, parent: x.parent, replyTo: x.replyTo }).catch((e) => ({ ok: false as const, msg: { es: String(e?.message ?? e).slice(0, 200), en: "" } }));
  if (!r.ok) return anotar({ ...base, ...caro, motivo: /Llegaste a/.test(r.msg.es) ? "limite" : "moderacion", detalle: r.msg.es }).then(() => false);
  return anotar({ ...base, ...caro, comment: r.id });
}

/* ── El barrido ── */
export async function barrerAnfitriones(): Promise<{ ciudades: number; publicadas: number; respuestas: number }> {
  const out = { ciudades: 0, publicadas: 0, respuestas: 0 };
  const k = await valores("anf_pausa");
  if (k.anf_pausa === 1) return out; // «Pausar a todos»
  const V = new Map((await voces()).map((v) => [v.id, v]));
  if (!V.size) return out;
  const porSlug = new Map([...V.values()].map((v) => [v.slug, v]));
  const C = (await db().query<Ciudad>(
    `select hc.city_id as id, c.name, hc.mode, hc.manual_posts as mp, hc.manual_replies as mr, (now() at time zone coalesce(c.timezone, 'America/New_York'))::date::text as dia
       from com_host_cities hc join cities c on c.id = hc.city_id where hc.mode in ('auto', 'manual') and c.status = 'on' order by hc.city_id`)).rows;
  for (const c of C) {
    out.ciudades++;
    const q = await cupoCiudad(c.id, c.mode, { pub: c.mp, resp: c.mr }, c.dia);
    if (q.pub > q.usadasPub) out.publicadas += await publicarPropio(c, q.pub - q.usadasPub, V);
    let quedan = q.resp - q.usadasResp;
    if (quedan <= 0) continue;
    for (const x of await candidatos(c, quedan)) {
      if (quedan <= 0) break;
      if (await responderUno(c, x, V, porSlug)) { quedan--; out.respuestas++; }
    }
  }
  return out;
}
