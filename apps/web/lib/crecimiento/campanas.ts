import "server-only";
import { auditar, type Staff } from "../admin";
import { avisar, avisarMuchos } from "../avisos";
import { valores } from "../config";
import { BASE_URL, encolar } from "../correo";
import { marco } from "../correo/plantillas";
import { db, tx } from "../db";
import { CANALES, PLANTILLA, TIPOS_CAMPANA, bien, mal, rutaPropia, type Bi, type Canal, type Res, type Segmento } from "./comun";

/* 9h · Campañas (fase9-apertura.md §4 9h; admin-dashboard.md ADM-MKT; prototipo secMkt «Campañas»): segmento → plantilla → canal (en la app, push, SMS o
   correo). Las reglas las decide el servidor, siempre (guardián campanaConPermiso):
   - Solo a quien ENCENDIÓ «Novedades de To'Latino» (users.notif_prefs.mkt = true; apagado de fábrica): nunca a quien no lo encendió o lo apagó. Se vuelve a
     mirar al mandar cada lote (si alguien lo apaga entre que se programó y que sale, no le llega).
   - Nunca en horas de silencio de la ciudad (10 PM – 7 AM): el lote espera a las 7 AM.
   - Tope por persona: campana_por_semana campañas en 7 días; por SMS, campana_sms_por_mes en 30. Quien llegó al tope queda «tope» (no le llega).
   - Más de campana_aprobar_desde personas: la aprueba OTRA persona del equipo (mkt:aprobar; la base exige approved_by <> created_by).
   - Sale por partes (campana_lote por pasada del barrido), en orden por persona, sin repetir (campaign_sends único por campaña y persona, solo inserción).
   - No se edita lo programado ni lo enviado: se retira (con motivo; nada se borra). Todo con auditoría.
   El texto lo escribe el equipo en los dos idiomas; cada persona lo recibe en el suyo. En el sandbox el SMS y el correo quedan «en modo pruebas» (simulador). */

const ID = /^\d{1,18}$/;
const enCiudad = (s: Staff, c: string) => !s.cities.length || s.cities.includes(c);
const limpio = (x: unknown, n: number) => String(x ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const CAT = /^NEG-[A-Z]{2,12}$/;

/* El segmento, revisado: lo que no cuadra se descarta. */
export function segmentoDe(x: unknown): Segmento {
  const o = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
  const rol = o.rol === "negocios" ? "negocios" : "vecinos";
  const inact = Number(o.inactivos);
  return { rol, inactivos: Number.isInteger(inact) && inact >= 7 && inact <= 365 ? inact : null, cat: rol === "negocios" && typeof o.cat === "string" && CAT.test(o.cat) ? o.cat : null,
    plan: rol === "negocios" && (o.plan === "free" || o.plan === "pro") ? o.plan : null };
}

/* A quién llega: la consulta del segmento (parámetros desde $base). Siempre: la ciudad, «Novedades» encendido y la cuenta activa. */
function segmentoSql(seg: Segmento, base: number): { donde: string; params: unknown[] } {
  const p: unknown[] = [];
  const $ = (v: unknown) => { p.push(v); return `$${base + p.length}`; };
  let donde = `u.home_city_id = $1 and (u.notif_prefs->>'mkt') = 'true' and cuenta_estado(u.status, u.status_until) in ('active', 'muted')`;
  if (seg.inactivos) donde += ` and (u.last_seen_at is null or u.last_seen_at < now() - make_interval(days => ${$(seg.inactivos)}::int))`;
  if (seg.rol === "negocios") {
    donde += ` and exists (select 1 from businesses b join business_stats_cache st on st.business_id = b.id where b.owner_user_id = u.id and b.city_id = $1 and b.status = 'active'`;
    if (seg.cat) donde += ` and b.category_id = ${$(seg.cat)}::text`;
    if (seg.plan) donde += ` and st.plan = ${$(seg.plan)}::text`;
    donde += `)`;
  }
  return { donde, params: p };
}

export async function contarSegmento(ciudad: string, seg: Segmento): Promise<number> {
  const q = segmentoSql(seg, 1);
  return (await db().query<{ n: number }>(`select count(*)::int as n from users u where ${q.donde}`, [ciudad, ...q.params])).rows[0]?.n ?? 0;
}

type Nueva = { nombre: string; ciudad: string; tipo: string; canal: string; segmento: unknown; tituloEs: string; tituloEn: string; textoEs: string; textoEn: string; href: string; cuando: string; motivo: string };
/* Crear y programar. «cuando» = AAAA-MM-DD HH:MM en la hora de la ciudad, o vacío = ahora (sale en el próximo minuto del barrido si no es de noche). */
export async function crearCampana(s: Staff, p: Nueva): Promise<Res<{ id?: string; porAprobar?: boolean }>> {
  if (!s.puede("mkt", "editar")) return mal("Tu rol no crea campañas.", "Your role cannot create campaigns.");
  const nombre = limpio(p.nombre, 80), motivo = limpio(p.motivo, 300), href = limpio(p.href, 200);
  const canal = (CANALES as readonly string[]).includes(p.canal) ? (p.canal as Canal) : null;
  const t = { es: limpio(p.tituloEs, 60), en: limpio(p.tituloEn, 60) }, b = { es: limpio(p.textoEs, 300), en: limpio(p.textoEn, 300) };
  if (nombre.length < 3) return mal("Ponle un nombre (3 letras o más).", "Give it a name (3 characters or more).");
  if (!(TIPOS_CAMPANA as readonly string[]).includes(p.tipo)) return mal("Elige el tipo de campaña.", "Pick the campaign type.");
  if (!canal) return mal("Elige el canal.", "Pick the channel.");
  if (!enCiudad(s, p.ciudad)) return mal("Esa ciudad no es tuya.", "That city is not yours.");
  if (t.es.length < 2 || t.en.length < 2) return mal("El título va en español y en inglés.", "The title goes in Spanish and English.");
  if (b.es.length < 3 || b.en.length < 3) return mal("El texto va en español y en inglés.", "The text goes in Spanish and English.");
  if (canal === "sms" && (b.es.length > 150 || b.en.length > 150)) return mal("Para SMS el texto cabe en 150 letras.", "For SMS the text fits in 150 characters.");
  if (href && !rutaPropia(href)) return mal("El enlace es una ruta de To'Latino que empieza con «/».", "The link is a To'Latino path starting with “/”.");
  if (motivo.length < 3) return mal("Escribe el motivo.", "Write the reason.");
  const seg = segmentoDe(p.segmento), cuando = limpio(p.cuando, 16);
  if (cuando && !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(cuando)) return mal("La fecha va como AAAA-MM-DD HH:MM.", "The date goes as YYYY-MM-DD HH:MM.");
  const cfg = await valores("campana_aprobar_desde");
  return tx(async (c) => {
    const ci = (await c.query<{ tz: string; at: string; pasado: boolean; lejos: boolean }>(
      `select timezone as tz, (coalesce(nullif($2, '')::timestamp at time zone timezone, now()))::text as at,
              coalesce(nullif($2, '')::timestamp at time zone timezone < now() - interval '5 minutes', false) as pasado,
              coalesce(nullif($2, '')::timestamp at time zone timezone > now() + interval '90 days', false) as lejos
         from cities where id = $1`, [p.ciudad, cuando])).rows[0];
    if (!ci) return mal("Esa ciudad no existe.", "That city does not exist.");
    if (ci.pasado) return mal("Esa hora ya pasó.", "That time has passed.");
    if (ci.lejos) return mal("Se programa hasta 90 días adelante.", "You can schedule up to 90 days ahead.");
    const q = segmentoSql(seg, 1);
    const n = (await c.query<{ n: number }>(`select count(*)::int as n from users u where ${q.donde}`, [p.ciudad, ...q.params])).rows[0]?.n ?? 0;
    const porAprobar = n > cfg.campana_aprobar_desde;
    const id = (await c.query<{ id: string }>(
      `insert into campaigns (name, city_id, kind, segment, channel, template_key, title, body, href, scheduled_at, status, audience_n, created_by)
       values ($1, $2, $3, $4::jsonb, $5, $6, $7::jsonb, $8::jsonb, $9, $10::timestamptz, $11, $12, $13) returning id::text`,
      [nombre, p.ciudad, p.tipo, JSON.stringify(seg), canal, PLANTILLA[canal], JSON.stringify(t), JSON.stringify(b), href || null, ci.at, porAprobar ? "por_aprobar" : "programada", n, s.id])).rows[0]!.id;
    await auditar(c, { actor: s.id, action: "mkt.campana.crear", targetKind: "campaign", targetId: id, city: p.ciudad, after: { nombre, canal, segmento: seg, personas: n, estado: porAprobar ? "por_aprobar" : "programada", cuando: ci.at }, reason: motivo });
    return porAprobar
      ? bien(`Lista, pero llega a ${n} personas: la tiene que aprobar otra persona del equipo.`, `Ready, but it reaches ${n} people: another team member has to approve it.`, { id, porAprobar: true })
      : bien(`Programada: llega a ${n} personas que encendieron Novedades.`, `Scheduled: it reaches ${n} people who turned on Updates.`, { id, porAprobar: false });
  });
}

export async function aprobarCampana(s: Staff, id: string, motivo: string): Promise<Res> {
  if (!s.puede("mkt", "aprobar")) return mal("Tu rol no aprueba campañas.", "Your role cannot approve campaigns.");
  const m = limpio(motivo, 300);
  if (!ID.test(String(id))) return mal("Esa campaña no existe.", "That campaign does not exist.");
  if (m.length < 3) return mal("Escribe el motivo.", "Write the reason.");
  return tx(async (c) => {
    const x = (await c.query<{ st: string; by: string; city: string }>(`select status as st, created_by::text as by, city_id as city from campaigns where id = $1::bigint for update`, [id])).rows[0];
    if (!x) return mal("Esa campaña no existe.", "That campaign does not exist.");
    if (!enCiudad(s, x.city)) return mal("Esa ciudad no es tuya.", "That city is not yours.");
    if (x.st !== "por_aprobar") return mal("Esa campaña no espera aprobación.", "That campaign is not waiting for approval.");
    if (x.by === s.id) return mal("La aprueba otra persona del equipo, no quien la creó.", "Another team member approves it, not whoever created it.");
    await c.query(`update campaigns set status = 'programada', approved_by = $2, approved_at = now(), updated_at = now() where id = $1::bigint`, [id, s.id]);
    await auditar(c, { actor: s.id, action: "mkt.campana.aprobar", targetKind: "campaign", targetId: id, city: x.city, before: { estado: "por_aprobar" }, after: { estado: "programada" }, reason: m });
    return bien("Aprobada: sale a su hora.", "Approved: it goes out on time.");
  });
}

export async function retirarCampana(s: Staff, id: string, motivo: string): Promise<Res> {
  if (!s.puede("mkt", "editar")) return mal("Tu rol no retira campañas.", "Your role cannot retire campaigns.");
  const m = limpio(motivo, 300);
  if (!ID.test(String(id))) return mal("Esa campaña no existe.", "That campaign does not exist.");
  if (m.length < 3) return mal("Escribe el motivo.", "Write the reason.");
  return tx(async (c) => {
    const x = (await c.query<{ st: string; city: string }>(`select status as st, city_id as city from campaigns where id = $1::bigint for update`, [id])).rows[0];
    if (!x) return mal("Esa campaña no existe.", "That campaign does not exist.");
    if (!enCiudad(s, x.city)) return mal("Esa ciudad no es tuya.", "That city is not yours.");
    if (x.st === "enviada" || x.st === "retirada") return mal("Ya terminó: queda en el historial.", "It is over: it stays in the history.");
    await c.query(`update campaigns set status = 'retirada', retired_at = now(), retired_by = $2, retired_reason = $3, updated_at = now() where id = $1::bigint`, [id, s.id, m]);
    await auditar(c, { actor: s.id, action: "mkt.campana.retirar", targetKind: "campaign", targetId: id, city: x.city, before: { estado: x.st }, after: { estado: "retirada" }, reason: m });
    return bien("Retirada: no sale más. Lo que ya salió queda en el historial.", "Retired: nothing more goes out. What already went out stays in the history.");
  });
}

/* ── Mandar ── Un lote de una campaña (lo llama el barrido cada minuto). Devuelve cuántas personas se miraron. Nada de red dentro de la transacción:
   se reclaman las personas (campaign_sends) y, ya fuera, salen los avisos (pushFueraDeTx). */
export async function enviarLote(id: string): Promise<number> {
  const cfg = await valores("campana_por_semana", "campana_sms_por_mes", "campana_lote");
  const claim = await tx(async (c) => {
    const x = (await c.query<{ city: string; canal: Canal; tpl: string; seg: Segmento; cur: string | null; title: Bi; body: Bi; href: string | null; silencio: boolean }>(
      `select k.city_id as city, k.channel as canal, k.template_key as tpl, k.segment as seg, k.cursor_user::text as cur, k.title, k.body, k.href,
              extract(hour from now() at time zone ci.timezone) not between 7 and 21 as silencio
         from campaigns k join cities ci on ci.id = k.city_id
        where k.id = $1::bigint and k.status in ('programada', 'enviando') and k.scheduled_at <= now() for update of k skip locked`, [id])).rows[0];
    if (!x || x.silencio) return null;
    const seg = segmentoDe(x.seg), q = segmentoSql(seg, 3);
    const L = (await c.query<{ id: string; lang: string; email: string | null; ok_mail: boolean; semana: number; sms_mes: number }>(
      `select u.id::text, coalesce(u.lang, 'es') as lang, u.email::text as email, coalesce(u.email_verified, false) as ok_mail,
              (select count(*)::int from campaign_sends s where s.user_id = u.id and s.result = 'enviado' and s.at > now() - interval '7 days') as semana,
              (select count(*)::int from campaign_sends s where s.user_id = u.id and s.result = 'enviado' and s.channel = 'sms' and s.at > now() - interval '30 days') as sms_mes
         from users u
        where ${q.donde} and ($2::uuid is null or u.id > $2::uuid)
          and not exists (select 1 from campaign_sends s where s.campaign_id = $3::bigint and s.user_id = u.id)
        order by u.id limit ${Math.max(1, Math.min(5000, cfg.campana_lote))}`, [x.city, x.cur, id, ...q.params])).rows;
    const res = L.map((u) => (u.semana >= cfg.campana_por_semana || (x.canal === "sms" && u.sms_mes >= cfg.campana_sms_por_mes) ? "tope" : x.canal === "correo" && (!u.email || !u.ok_mail) ? "sin_correo" : "enviado"));
    // Una sola escritura por lote (sin una consulta por persona).
    const hechos = new Set((await c.query<{ uid: string }>(
      `insert into campaign_sends (campaign_id, user_id, city_id, channel, template_key, result)
       select $1::bigint, x.uid, $2, $3, $4, x.res from unnest($5::uuid[], $6::text[]) as x(uid, res)
       on conflict (campaign_id, user_id) do nothing returning user_id::text as uid`, [id, x.city, x.canal, x.tpl, L.map((u) => u.id), res])).rows.map((r) => r.uid));
    const out = L.filter((u, i) => res[i] === "enviado" && hechos.has(u.id)).map((u) => ({ id: u.id, lang: u.lang, email: u.email }));
    const ultimo = L.length ? L[L.length - 1]!.id : x.cur;
    const fin = L.length < Math.max(1, Math.min(5000, cfg.campana_lote));
    await c.query(
      `update campaigns set status = case when $3 then 'enviada' else 'enviando' end, cursor_user = $2::uuid, started_at = coalesce(started_at, now()),
              finished_at = case when $3 then now() else finished_at end, updated_at = now(),
              sent_n = (select count(*)::int from campaign_sends s where s.campaign_id = $1::bigint and s.result = 'enviado')
        where id = $1::bigint`, [id, ultimo, fin]);
    return { x, out, n: L.length };
  });
  if (!claim) return 0;
  const { x, out } = claim, ref: [string, string] = ["campaign", id];
  const v = { es: { titulo: x.title.es, texto: x.body.es }, en: { titulo: x.title.en, texto: x.body.en } };
  if (x.canal === "inapp" || x.canal === "push") await avisarMuchos(out.map((u) => u.id), x.tpl, v, { href: x.href ?? undefined, ref });
  else if (x.canal === "sms") { for (const u of out) await avisar(u.id, x.tpl, u.lang === "en" ? v.en : v.es, { href: x.href ?? undefined, ref }); }
  else for (const u of out) {
    if (!u.email) continue;
    const es = u.lang !== "en", T = es ? v.es : v.en;
    const { html, text } = marco({ es, pre: T.titulo, titulo: T.titulo, intro: T.texto, cta: x.href ? { l: es ? "Abrir To'Latino" : "Open To'Latino", href: `${BASE_URL()}${x.href}` } : undefined,
      pie: es ? "Te llega porque encendiste «Novedades de To'Latino». Para no recibir más: Mi cuenta › Avisos." : "You get this because you turned on “To'Latino updates”. To stop: My account › Notifications." });
    await encolar({ userId: u.id, city: x.city, to: u.email, tpl: "campaign", subject: T.titulo, html, text, ref, idem: `camp:${id}:${u.id}` }).catch(() => null);
  }
  return claim.n;
}

/* El barrido: las campañas que ya tocan (hasta 5 por pasada, un lote cada una). */
export async function campanasProgramadas(): Promise<number> {
  const L = (await db().query<{ id: string }>(`select id::text from campaigns where status in ('programada', 'enviando') and scheduled_at <= now() order by scheduled_at limit 5`)).rows;
  let n = 0;
  for (const c of L) n += await enviarLote(c.id);
  return n;
}

/* ── El Super Admin ── */
export type CampanaAdm = { id: string; nombre: string; city: string; tipo: string; canal: Canal; estado: string; seg: Segmento; titulo: Bi; texto: Bi; href: string | null; cuando: string | null; personas: number | null;
  enviados: number; tope: number; sinCorreo: number; abiertos: number; quien: string | null; aprobo: string | null; creadaPorMi: boolean; razon: string | null; at: string };
export async function campanasAdmin(s: Staff, ciudad: string | null, cursor: string | null, n = 20): Promise<{ filas: CampanaAdm[]; mas: string | null }> {
  const c = cursor && ID.test(cursor) ? cursor : null;
  const r = await db().query<CampanaAdm>(
    `select k.id::text, k.name as nombre, k.city_id as city, k.kind as tipo, k.channel as canal, k.status as estado, k.segment as seg, k.title as titulo, k.body as texto, k.href,
            to_char(k.scheduled_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as cuando, k.audience_n as personas, k.sent_n as enviados,
            coalesce(r.tope, 0) as tope, coalesce(r.sin, 0) as "sinCorreo", coalesce(o.n, 0) as abiertos, k.retired_reason as razon,
            to_char(k.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at, k.created_by = $4::uuid as "creadaPorMi",
            nullif(trim(coalesce(u.first_name, '') || ' ' || left(coalesce(u.last_name, ''), 1)), '') as quien,
            nullif(trim(coalesce(a.first_name, '') || ' ' || left(coalesce(a.last_name, ''), 1)), '') as aprobo
       from campaigns k left join users u on u.id = k.created_by left join users a on a.id = k.approved_by
       left join lateral (select count(*) filter (where result = 'tope')::int as tope, count(*) filter (where result = 'sin_correo')::int as sin from campaign_sends s where s.campaign_id = k.id) r on true
       left join lateral (select count(*)::int as n from notifications nt where nt.ref_kind = 'campaign' and nt.ref_id = k.id::text and nt.read_at is not null) o on true
      where (cardinality($1::text[]) = 0 or k.city_id = any($1::text[])) and ($2::text is null or k.city_id = $2) and ($3::bigint is null or k.id < $3::bigint)
      order by k.id desc limit $5`, [s.cities, ciudad, c, s.id, n + 1]);
  const filas = r.rows.slice(0, n);
  return { filas, mas: r.rows.length > n ? filas[n - 1]!.id : null };
}
