import "server-only";
import { auditar, type Staff } from "../admin";
import { cambiarConfig } from "../config";
import { db, tx } from "../db";
import { titulosVisibles } from "./ayuda-indice";
import { estadoInterruptores, type EstadoInterruptores } from "./interruptores";
import { motorActivo, type Motor, type Uso } from "./modelo";
import { autoNegocios, type AutoNegocio } from "./respuesta-auto";
import { gastoDelMes, type GastoMes } from "./tope";

/* 7c · Super Admin › El Compa (ADM-COMPA): Interruptores y tope (hueco #3 de fase7-compa.md: GASTADO ESTE MES · TOPE · POR NIVEL · al tope pasa
   a «Con una persona») y Conversaciones en solo lectura (lista con cursor, sin el texto: la ficha con el hilo y cada lectura anotada llega con
   el Super Admin completo de El Compa). Ver = compa:ver; cambiar = compa:aprobar (lo revisa cada acción). */
export type FilaConv = { num: string; uso: Uso; canal: string; superficie: string; resultado: string; motivo: string | null; ai: boolean; turnos: number; ciudad: string; at: string; marcada: boolean; purgada: boolean };
export type Historial = { accion: string; objetivo: string; antes: Record<string, string> | null; despues: Record<string, string> | null; motivo: string | null; quien: string | null; at: string };
export type DatosCompaAdmin = {
  gasto: GastoMes; interruptores: EstadoInterruptores; motor: Motor; modelos: { id: string; label: string; role: string | null; entrada: number; salida: number; geo: number; precioDe: string }[];
  historial: Historial[]; conv: { filas: FilaConv[]; sig: string | null; total7d: number; porResultado: Record<string, number>; porUso: Record<string, number> };
  copiloto: CifrasCopiloto;
};
/* 7g · COPILOTO EN SOPORTE (secCompa · Resumen): borradores de 30 días y qué se hizo con ellos (enviado tal cual, editado, descartado, sin
   usar todavía), cuántos sin IA, en casos y en ayudas escaladas. Sin personas ni texto. */
export type CifrasCopiloto = { borradores: number; tal: number; editados: number; descartados: number; abiertos: number; sinIA: number; casos: number; ayudas: number };
const ISO = (c: string) => `to_char(${c} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;
const QUIEN = (u: string) => `nullif(trim(coalesce(${u}.first_name, '') || ' ' || left(coalesce(${u}.last_name, ''), 1)), '')`;
const USOS = new Set(["neighbor", "owner", "auto_reply", "copilot"]);
const RES = new Set(["open", "self_resolved", "action_done", "handed_off", "to_owner"]);

const CANALES = new Set(["app", "web", "whatsapp", "sms"]);
/* 7i · Lo que se ve de las conversaciones (lista, ficha, «Lo que El Compa no supo», marcas) es de las ciudades de quien mira (sin ciudades = todas),
   como Soporte. */
const SUS = (col: string, p: string) => `(cardinality(${p}::text[]) = 0 or ${col} = any(${p}::text[]))`;
export async function datosCompaAdmin(s: Staff, f: { uso: string | null; resultado: string | null; antes: string | null; canal?: string | null; numero?: string | null }): Promise<DatosCompaAdmin> {
  const uso = f.uso && USOS.has(f.uso) ? f.uso : null, res = f.resultado && (RES.has(f.resultado) || f.resultado === "flag") ? f.resultado : null;
  const canal = f.canal && CANALES.has(f.canal) ? f.canal : null, numero = f.numero && /^CP-\d{4,12}$/.test(f.numero.trim().toUpperCase()) ? f.numero.trim().toUpperCase() : null;
  // Cursor «fecha|id» (la lista va de la más nueva a la más vieja).
  const cur = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z\|\d{1,12}$/.test(f.antes ?? "") ? f.antes!.split("|") : null;
  const [gasto, inter, M, H, C, K, P] = await Promise.all([
    gastoDelMes(), estadoInterruptores(),
    db().query<DatosCompaAdmin["modelos"][number]>(
      `select id, label, role, input_per_mtok_microusd::float8 / 1000000 as entrada, output_per_mtok_microusd::float8 / 1000000 as salida, geo_pct as geo, to_char(priced_at, 'YYYY-MM-DD') as "precioDe"
         from compa_models where status = 'on' and id <> 'simulador' order by role nulls last, id`),
    db().query<Historial>(
      `select e.action as accion, coalesce(e.target_id, '') as objetivo, e.before as antes, e.after as despues, e.reason as motivo,
              nullif(trim(coalesce(u.first_name, '') || ' ' || left(coalesce(u.last_name, ''), 1)), '') as quien, ${ISO("e.at")} as at
         from audit_entries e left join users u on u.id::text = e.actor_id
        where e.action like 'compa.%' or (e.action = 'config.cambiar' and e.target_id like 'compa\\_%')
        order by e.at desc, e.id desc limit 15`),
    db().query<FilaConv & { sid: string; sat: string }>(
      `select c.number as num, c.use as uso, c.channel as canal, c.surface as superficie, c.outcome as resultado, c.handoff_reason as motivo, c.ai, c.turns_n as turnos,
              ci.name as ciudad, ${ISO("c.started_at")} as at, c.id::text as sid, c.purged_at is not null as purgada,
              exists (select 1 from compa_reviews r where r.conversation_id = c.id and r.cleared_at is null) as marcada, to_char(c.started_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as sat
         from compa_conversations c join cities ci on ci.id = c.city_id
        where ($1::text is null or c.use = $1) and ($2::text is null or c.outcome = $2 or ($2 = 'flag' and exists (select 1 from compa_reviews r where r.conversation_id = c.id and r.cleared_at is null)))
          and ($3::timestamptz is null or (c.started_at, c.id) < ($3::timestamptz, $4::bigint))
          and ($5::text is null or c.channel = $5 or ($5 = 'app' and c.channel = 'web')) and ($6::text is null or c.number = $6) and ${SUS("c.city_id", "$7")}
        order by c.started_at desc, c.id desc limit 31`, [uso, res, cur?.[0] ?? null, cur?.[1] ?? null, canal, numero, s.cities]),
    db().query<{ r: string; u: string; n: number }>(`select outcome as r, use as u, count(*)::int as n from compa_conversations where started_at > now() - interval '7 days' and ${SUS("city_id", "$1")} group by outcome, use`, [s.cities]),
    db().query<CifrasCopiloto>(
      `select count(*)::int as borradores, count(*) filter (where used = 'sent_as_is')::int as tal, count(*) filter (where used = 'edited')::int as editados,
              count(*) filter (where used = 'discarded')::int as descartados, count(*) filter (where used is null)::int as abiertos, count(*) filter (where engine = 'reglas')::int as "sinIA",
              count(*) filter (where case_id is not null)::int as casos, count(*) filter (where help_request_id is not null)::int as ayudas
         from compa_drafts where at > now() - interval '30 days'`),
  ]);
  const filas = C.rows.slice(0, 30), ult = C.rows.length > 30 ? filas[filas.length - 1]! : null;
  const porResultado: Record<string, number> = {}, porUso: Record<string, number> = {};
  // 7e · Cifras de 7 días por resultado (del filtro DÓNDE si hay uno) y por nivel (vecinos, panel…).
  for (const x of K.rows) { porUso[x.u] = (porUso[x.u] ?? 0) + x.n; if (!uso || x.u === uso) porResultado[x.r] = (porResultado[x.r] ?? 0) + x.n; }
  return {
    gasto, interruptores: inter, motor: motorActivo(), modelos: M.rows, historial: H.rows, copiloto: P.rows[0]!,
    conv: { filas: filas.map(({ sid: _a, sat: _b, ...x }) => { void _a; void _b; return x; }), sig: ult ? `${ult.sat}|${ult.sid}` : null,
      total7d: K.rows.filter((x) => !uso || x.u === uso).reduce((s, x) => s + x.n, 0), porResultado, porUso },
  };
}

/* Cambiar el tope (en dólares en la pantalla; en centavos en Configuración): la misma escritura con límites y auditoría de siempre. */
export async function cambiarTope(s: Staff, dolares: string, motivo: string): Promise<{ ok: true; msg: string } | { ok: false; msg: string }> {
  const t = String(dolares ?? "").trim().replace(/[$,\s]/g, "");
  if (!/^\d{1,5}(\.\d{1,2})?$/.test(t)) return { ok: false, msg: "Escribe el tope en dólares, por ejemplo 100 o 150.50." };
  const r = await cambiarConfig(s.id, "compa_tope_mes_cents", Math.round(Number(t) * 100), motivo);
  return r.ok ? { ok: true, msg: `Tope nuevo: $${(r.v / 100).toFixed(2)} al mes. Vale desde la próxima llamada.` } : { ok: false, msg: r.msg };
}

/* 7d · La ficha de una conversación (Super Admin.dc.html compaDetail): QUIÉN · NEGOCIO · CANAL · RESULTADO · MOTIVO · CASO EN SOPORTE, el hilo
   (tapado como se guardó), «Contestó sin IA», las acciones y quién del equipo la leyó. Solo el equipo con compa:editar (Admin y Soporte; Solo
   lectura ve cifras sin hilos) y CADA apertura queda en compa_reads ANTES de leer el hilo (si no se puede anotar, no se lee). */
export type FichaConv = {
  num: string; uso: Uso; canal: string; superficie: string; resultado: string; motivo: string | null; ai: boolean; ciudad: string; at: string; cerrada: string | null; purgada: string | null;
  marca: { motivo: string; nota: string | null; quien: string | null; at: string } | null;   // 7i · «Marcar respuesta incorrecta»
  historial: Historial[];                                                                         // 7i · marcas y lo que no supo, con quién y motivo
  quien: { id: string; nombre: string } | null; negocio: { id: string; nombre: string } | null; operacion: string | null; caso: string | null;
  msjs: { de: "user" | "compa" | "system"; t: string | null; fuente: string | null; motor: string | null; at: string }[];
  acciones: { tipo: string; estado: string; via: string | null; motivo: string | null; at: string }[];
  lecturas: { quien: string | null; at: string }[];
};
export async function fichaConversacion(s: Staff, numero: string): Promise<FichaConv | null> {
  if (!s.puede("compa", "editar")) return null;
  const n = String(numero ?? "").trim().toUpperCase();
  if (!/^CP-\d{4,12}$/.test(n)) return null;
  const c = await tx(async (q) => {
    const x = (await q.query<{ id: string; city_id: string }>(`select id::text, city_id from compa_conversations where number = $1 and ${SUS("city_id", "$2")}`, [n, s.cities])).rows[0];
    if (!x) return null;
    await q.query(`insert into compa_reads (conversation_id, staff_id, city_id) values ($1::bigint, $2, $3)`, [x.id, s.id, x.city_id]);
    return x;
  });
  if (!c) return null;
  const [K, M, A, R, MK, H] = await Promise.all([
    db().query<Omit<FichaConv, "msjs" | "acciones" | "lecturas" | "quien" | "negocio" | "marca" | "historial"> & { uid: string | null; unom: string | null; bid: string | null; bnom: string | null }>(
      `select c.number as num, c.use as uso, c.channel as canal, c.surface as superficie, c.outcome as resultado, c.handoff_reason as motivo, c.ai, ci.name as ciudad,
              ${ISO("c.started_at")} as at, ${ISO("c.closed_at")} as cerrada, ${ISO("c.purged_at")} as purgada, c.user_id::text as uid,
              nullif(trim(coalesce(u.first_name, '') || ' ' || left(coalesce(u.last_name, ''), 1)), '') as unom, b.id as bid, b.name as bnom,
              o.number as operacion, k.number as caso
         from compa_conversations c join cities ci on ci.id = c.city_id left join users u on u.id = c.user_id left join businesses b on b.id = c.business_id
         left join operations o on o.id = c.operation_id left join support_cases k on k.id = c.support_case_id
        where c.id = $1::bigint`, [c.id]),
    db().query<FichaConv["msjs"][number]>(`select sender as de, text as t, source_label as fuente, engine as motor, ${ISO("at")} as at from compa_messages where conversation_id = $1::bigint order by at, id limit 200`, [c.id]),
    db().query<FichaConv["acciones"][number]>(`select type as tipo, status as estado, confirmed_via as via, fail_reason as motivo, ${ISO("proposed_at")} as at from compa_actions where conversation_id = $1::bigint order by proposed_at`, [c.id]),
    db().query<FichaConv["lecturas"][number]>(
      `select nullif(trim(coalesce(u.first_name, '') || ' ' || left(coalesce(u.last_name, ''), 1)), '') as quien, ${ISO("r.at")} as at
         from compa_reads r left join users u on u.id = r.staff_id where r.conversation_id = $1::bigint order by r.at desc, r.id desc limit 15`, [c.id]),
    db().query<NonNullable<FichaConv["marca"]>>(
      `select r.reason as motivo, r.note as nota, ${QUIEN("u")} as quien, ${ISO("r.at")} as at
         from compa_reviews r left join users u on u.id = r.staff_id where r.conversation_id = $1::bigint and r.cleared_at is null`, [c.id]),
    db().query<Historial>(
      `select e.action as accion, coalesce(e.target_id, '') as objetivo, e.before as antes, e.after as despues, e.reason as motivo, ${QUIEN("u")} as quien, ${ISO("e.at")} as at
         from audit_entries e left join users u on u.id::text = e.actor_id
        where e.target_kind = 'compa_conversation' and e.target_id = $1 order by e.at desc, e.id desc limit 20`, [n]),
  ]);
  const k = K.rows[0];
  if (!k) return null;
  const { uid, unom, bid, bnom, ...base } = k;
  return { ...base, quien: uid ? { id: uid, nombre: unom ?? "Vecino" } : null, negocio: bid ? { id: bid, nombre: bnom ?? bid } : null, msjs: M.rows, acciones: A.rows, lecturas: R.rows,
    marca: MK.rows[0] ?? null, historial: H.rows };
}

/* 7e · Negocios 360° › El Compa (cifras, sin texto ni personas): lo que El Compa habló en el PANEL de ese negocio en 30 días — conversaciones,
   resolvió solo, a una persona (con caso de Soporte del negocio), «Ir a …» que la persona tocó, contestadas sin IA — y si El Compa está en pausa
   en ese negocio. compa:ver; el hilo sigue saliendo solo en la ficha anotada (compa:editar). */
export type CompaNegocio = { conv30: number; porResultado: Record<string, number>; ir: number; sinIa: number; casos: number; pausa: { uso: string | null; motivo: string; at: string } | null;
  auto: AutoNegocio | null; puedeApagar: boolean };   // 7f · respuestas automáticas de ese negocio y «Apagar El Compa aquí» (compa:aprobar)
export async function compaDeNegocio(s: Staff, negocio: string): Promise<CompaNegocio | null> {
  if (!s.puede("compa", "ver") || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(String(negocio ?? ""))) return null;
  const [K, A, P, AU] = await Promise.all([
    db().query<{ r: string; n: number; sin_ia: number; casos: number }>(
      `select outcome as r, count(*)::int as n, count(*) filter (where not ai)::int as sin_ia, count(support_case_id)::int as casos from compa_conversations
        where business_id = $1 and use = 'owner' and started_at > now() - interval '30 days' group by outcome`, [negocio]),
    db().query<{ n: number }>(
      `select count(*)::int as n from compa_actions a join compa_conversations c on c.id = a.conversation_id
        where c.business_id = $1 and c.use = 'owner' and a.type = 'go_to_panel' and a.status = 'confirmed' and a.proposed_at > now() - interval '30 days'`, [negocio]),
    estadoInterruptores(), autoNegocios(negocio),
  ]);
  const p = P.pausas.find((x) => x.scope === "business" && x.donde === negocio && (!x.uso || x.uso === "owner")) ?? null;
  return { conv30: K.rows.reduce((t, x) => t + x.n, 0), porResultado: Object.fromEntries(K.rows.map((x) => [x.r, x.n])), ir: A.rows[0]?.n ?? 0,
    sinIa: K.rows.reduce((t, x) => t + x.sin_ia, 0), casos: K.rows.reduce((t, x) => t + x.casos, 0), pausa: p ? { uso: p.uso, motivo: p.motivo, at: p.at } : null,
    auto: AU[0] ?? null, puedeApagar: s.puede("compa", "aprobar") };
}

/* ── 7i · Resumen (secCompa · «Resumen»): cifras de 7 días, por qué pasó a una persona, dónde contesta, por dónde escriben, el copiloto, las
   marcadas, el horario del equipo y «LO QUE EL COMPA NO SUPO · PARA EL CENTRO DE AYUDA». Cifras para compa:ver (Solo lectura incluida); la
   PREGUNTA (tapada, sin la persona) solo para quien lee hilos (compa:editar), y nunca lleva a la persona: lleva a la conversación (ficha anotada). */
export type NoSupo = { id: string; q: string | null; audiencia: "vecino" | "negocio"; lang: "es" | "en"; estado: "open" | "noted" | "fixed"; slug: string | null; titulo: string | null;
  nota: string | null; num: string; ciudad: string; at: string; quien: string | null };
export type ResumenCompa = {
  total: number; solo: number; conCaso: number; persona: number; dueno: number; acciones: number; abiertas: number; sinIa: number;
  porMotivo: Record<string, number>; porUso: Record<string, number>; porCanal: Record<string, number>;
  copiloto: CifrasCopiloto; marcadas: number; marcadas7: number; horario: { dias: number; desde: number; hasta: number };
  noSupo: NoSupo[]; noSupoAbiertos: number; noSupoTotal: number; leer: boolean; articulos: { slug: string; titulo: string }[];
};
export async function resumenCompa(s: Staff, f: { estado?: string | null } = {}): Promise<ResumenCompa> {
  const leer = s.puede("compa", "editar"), est = f.estado === "noted" || f.estado === "fixed" ? f.estado : "open";
  const [K, P, MK, NS, NN, AR, h] = await Promise.all([
    db().query<{ uso: string; canal: string; res: string; motivo: string | null; n: number; sin_ia: number; caso: number }>(
      `select use as uso, case when channel = 'web' then 'app' else channel end as canal, outcome as res, handoff_reason as motivo, count(*)::int as n,
              count(*) filter (where not ai)::int as sin_ia, count(support_case_id)::int as caso
         from compa_conversations where started_at > now() - interval '7 days' and ${SUS("city_id", "$1")} group by 1, 2, 3, 4`, [s.cities]),
    db().query<CifrasCopiloto>(
      `select count(*)::int as borradores, count(*) filter (where used = 'sent_as_is')::int as tal, count(*) filter (where used = 'edited')::int as editados,
              count(*) filter (where used = 'discarded')::int as descartados, count(*) filter (where used is null)::int as abiertos, count(*) filter (where engine = 'reglas')::int as "sinIA",
              count(*) filter (where case_id is not null)::int as casos, count(*) filter (where help_request_id is not null)::int as ayudas
         from compa_drafts where at > now() - interval '30 days' and ${SUS("city_id", "$1")}`, [s.cities]),
    db().query<{ n: number; n7: number }>(
      `select count(*)::int as n, count(*) filter (where at > now() - interval '7 days')::int as n7 from compa_reviews where cleared_at is null and ${SUS("city_id", "$1")}`, [s.cities]),
    db().query<NoSupo>(
      `select q.id::text, case when $2 then q.query_tapada end as q, q.audience as audiencia, q.lang, q.status as estado, q.fixed_slug as slug, null::text as titulo,
              case when $2 then q.note end as nota, c.number as num, ci.name as ciudad, ${ISO("q.at")} as at, ${QUIEN("u")} as quien
         from compa_unknowns q join compa_conversations c on c.id = q.conversation_id join cities ci on ci.id = q.city_id
         left join users u on u.id = q.decided_by
        where q.status = $3 and q.purged_at is null and ${SUS("q.city_id", "$1")} order by q.at desc, q.id desc limit 12`, [s.cities, leer, est]),
    db().query<{ abiertos: number; total: number }>(
      `select count(*) filter (where status = 'open')::int as abiertos, count(*)::int as total from compa_unknowns where purged_at is null and ${SUS("city_id", "$1")}`, [s.cities]),
    // Los artículos vivos de vecinos y negocios (la ayuda indexada solo se lee por ayuda-indice.ts).
    titulosVisibles(["vecino", "negocio"]),
    (await import("../soporte")).horario(),
  ]);
  const porMotivo: Record<string, number> = {}, porUso: Record<string, number> = {}, porCanal: Record<string, number> = {};
  let total = 0, solo = 0, conCaso = 0, persona = 0, dueno = 0, acciones = 0, abiertas = 0, sinIa = 0;
  for (const x of K.rows) {
    total += x.n; sinIa += x.sin_ia; porUso[x.uso] = (porUso[x.uso] ?? 0) + x.n; porCanal[x.canal] = (porCanal[x.canal] ?? 0) + x.n;
    if (x.res === "self_resolved" || x.res === "action_done") solo += x.n;
    if (x.res === "action_done") acciones += x.n;
    if (x.res === "open") abiertas += x.n;
    if (x.res === "handed_off") { persona += x.n; conCaso += x.caso; const m = x.motivo ?? "unknown"; porMotivo[m] = (porMotivo[m] ?? 0) + x.n; }
    if (x.res === "to_owner") { dueno += x.n; porMotivo.owner = (porMotivo.owner ?? 0) + x.n; }
  }
  return { total, solo, conCaso, persona, dueno, acciones, abiertas, sinIa, porMotivo, porUso, porCanal, copiloto: P.rows[0]!, marcadas: MK.rows[0]?.n ?? 0, marcadas7: MK.rows[0]?.n7 ?? 0,
    horario: h, noSupo: NS.rows.map((x) => ({ ...x, titulo: x.slug ? AR[x.slug]?.es ?? x.slug : null })), noSupoAbiertos: NN.rows[0]?.abiertos ?? 0, noSupoTotal: NN.rows[0]?.total ?? 0, leer,
    articulos: leer ? Object.entries(AR).map(([slug, t]) => ({ slug, titulo: t.es })).sort((a, b) => a.titulo.localeCompare(b.titulo, "es")) : [] };
}

/* ── 7i · «Marcar respuesta incorrecta» / «Quitar la marca» (compaDetail): compa:editar (Admin y Soporte), de una conversación de sus ciudades,
   con motivo de la lista cerrada y nota; una marca viva por conversación (la base). Auditoría en la misma transacción (target compa_conversation:
   sale en el Historial de la ficha). No le llega al vecino. */
type Res = { ok: true; msg: string } | { ok: false; msg: string };
export const MOTIVOS_MARCA = ["wrong_info", "should_hand_off", "tone", "language", "other"] as const;
const MOTIVO_MARCA: Record<string, string> = { wrong_info: "Dato equivocado", should_hand_off: "Debía pasar a una persona", tone: "El tono", language: "El idioma", other: "Otra cosa" };
const limpiaNota = (x: unknown) => String(x ?? "").replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, 300);
async function convDe(c: import("pg").PoolClient, s: Staff, numero: string) {
  const n = String(numero ?? "").trim().toUpperCase();
  if (!/^CP-\d{4,12}$/.test(n)) return null;
  return (await c.query<{ id: string; city_id: string; number: string }>(
    `select id::text, city_id, number from compa_conversations where number = $1 and ${SUS("city_id", "$2")} for update`, [n, s.cities])).rows[0] ?? null;
}
export async function marcarConversacion(s: Staff, numero: string, motivo: string, nota: string): Promise<Res> {
  if (!s.puede("compa", "editar")) return { ok: false, msg: "Tu rol no marca respuestas de El Compa." };
  if (!(MOTIVOS_MARCA as readonly string[]).includes(motivo)) return { ok: false, msg: "Elige qué contestó mal El Compa." };
  const { tapar } = await import("./tapar");
  const t = tapar(limpiaNota(nota)).texto;
  if (t.length < 3) return { ok: false, msg: "Escribe qué estuvo mal (sirve para corregir la ayuda y las reglas)." };
  return tx(async (c): Promise<Res> => {
    const k = await convDe(c, s, numero);
    if (!k) return { ok: false, msg: "Esa conversación no existe." };
    if ((await c.query(`select 1 from compa_reviews where conversation_id = $1::bigint and cleared_at is null`, [k.id])).rowCount) return { ok: false, msg: "Ya está marcada." };
    await c.query(`insert into compa_reviews (conversation_id, city_id, staff_id, reason, note) values ($1::bigint, $2, $3, $4, $5)`, [k.id, k.city_id, s.id, motivo, t]);
    await auditar(c, { actor: s.id, action: "compa.marcar", targetKind: "compa_conversation", targetId: k.number, city: k.city_id, before: { Marca: "sin marca" }, after: { Marca: MOTIVO_MARCA[motivo] }, reason: t });
    return { ok: true, msg: "Marcada. Sale en Resumen › Marcadas por el equipo." };
  });
}
export async function quitarMarca(s: Staff, numero: string, motivo: string): Promise<Res> {
  if (!s.puede("compa", "editar")) return { ok: false, msg: "Tu rol no quita marcas." };
  const { tapar } = await import("./tapar");
  const t = tapar(limpiaNota(motivo)).texto;
  if (t.length < 3) return { ok: false, msg: "Escribe el motivo." };
  return tx(async (c): Promise<Res> => {
    const k = await convDe(c, s, numero);
    if (!k) return { ok: false, msg: "Esa conversación no existe." };
    const r = (await c.query<{ reason: string }>(`update compa_reviews set cleared_at = now(), cleared_by = $2, clear_reason = $3 where conversation_id = $1::bigint and cleared_at is null returning reason`, [k.id, s.id, t])).rows[0];
    if (!r) return { ok: false, msg: "No estaba marcada." };
    await auditar(c, { actor: s.id, action: "compa.desmarcar", targetKind: "compa_conversation", targetId: k.number, city: k.city_id, before: { Marca: MOTIVO_MARCA[r.reason] ?? r.reason }, after: { Marca: "sin marca" }, reason: t });
    return { ok: true, msg: "Marca quitada. Queda en el historial." };
  });
}

/* ── 7i · «Lo que El Compa no supo»: «Anotado» (con motivo) o «Corregido en {artículo}» (un artículo vivo de la ayuda de vecinos o negocios). El
   estado solo avanza (la base). compa:editar, de sus ciudades, con auditoría. El texto del artículo se corrige en el repo (§6 #12). */
export async function decidirNoSupo(s: Staff, id: string, accion: "noted" | "fixed", x: { nota: string; slug?: string | null }): Promise<Res> {
  if (!s.puede("compa", "editar")) return { ok: false, msg: "Tu rol no cambia esta lista." };
  if (!/^\d{1,18}$/.test(String(id ?? "")) || (accion !== "noted" && accion !== "fixed")) return { ok: false, msg: "Eso ya no está en la lista." };
  const { tapar } = await import("./tapar");
  const t = tapar(limpiaNota(x.nota)).texto;
  if (t.length < 3) return { ok: false, msg: "Escribe el motivo." };
  const slug = accion === "fixed" ? String(x.slug ?? "").trim() : null;
  if (accion === "fixed" && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug ?? "")) return { ok: false, msg: "Elige el artículo donde quedó corregido." };
  return tx(async (c): Promise<Res> => {
    const q = (await c.query<{ status: string; city_id: string; num: string }>(
      `select q.status, q.city_id, c.number as num from compa_unknowns q join compa_conversations c on c.id = q.conversation_id
        where q.id = $1::bigint and q.purged_at is null and ${SUS("q.city_id", "$2")} for update of q`, [id, s.cities])).rows[0];
    if (!q) return { ok: false, msg: "Eso ya no está en la lista." };
    if (q.status === "fixed" || (q.status === "noted" && accion === "noted")) return { ok: false, msg: "Ya se marcó." };
    const titulo = slug ? (await titulosVisibles(["vecino", "negocio"]))[slug]?.es ?? null : null;
    if (slug && !titulo) return { ok: false, msg: "Ese artículo no está en el Centro de ayuda." };
    await c.query(`update compa_unknowns set status = $2, fixed_slug = $3, note = $4, decided_by = $5 where id = $1::bigint`, [id, accion, slug, t, s.id]);
    await auditar(c, { actor: s.id, action: accion === "fixed" ? "compa.no_supo_corregido" : "compa.no_supo_anotado", targetKind: "compa_conversation", targetId: q.num, city: q.city_id,
      before: { "No supo": q.status === "noted" ? "anotado" : "abierto" }, after: { "No supo": accion === "fixed" ? `corregido en ${titulo}` : "anotado" }, reason: t });
    return { ok: true, msg: accion === "fixed" ? `Corregido en «${titulo}».` : "Anotado." };
  });
}

/* ── 7i · Configuración › El Compa › MODELO DE CADA PAPEL: el modelo cotidiano (vecinos, panel y respuestas) y el del copiloto, de los modelos
   ENCENDIDOS de compa_models (el simulador nunca); solo un Admin; motivo y auditoría; un papel tiene un solo modelo (único en la base). El precio
   de cada uno sigue en compa_models (nunca en el código). Vale desde la próxima llamada. */
export type ModeloPapel = { papel: "cotidiano" | "copiloto"; id: string | null; label: string | null };
export async function modelosPorPapel(): Promise<{ papeles: ModeloPapel[]; modelos: { id: string; label: string; entrada: number; salida: number }[] }> {
  const M = (await db().query<{ id: string; label: string; role: string | null; entrada: number; salida: number }>(
    `select id, label, role, input_per_mtok_microusd::float8 / 1000000 as entrada, output_per_mtok_microusd::float8 / 1000000 as salida from compa_models where status = 'on' and id <> 'simulador' order by id`)).rows;
  return { papeles: (["cotidiano", "copiloto"] as const).map((p) => { const m = M.find((x) => x.role === p); return { papel: p, id: m?.id ?? null, label: m?.label ?? null }; }),
    modelos: M.map(({ id, label, entrada, salida }) => ({ id, label, entrada, salida })) };
}
export async function cambiarModelo(s: Staff, papel: string, id: string, motivo: string): Promise<Res> {
  if (s.role !== "admin" || !s.puede("sys", "editar")) return { ok: false, msg: "Solo un Admin cambia la configuración." };
  if (papel !== "cotidiano" && papel !== "copiloto") return { ok: false, msg: "Ese papel no existe." };
  const m = limpiaNota(motivo);
  if (m.length < 3) return { ok: false, msg: "Escribe el motivo." };
  return tx(async (c): Promise<Res> => {
    await c.query(`select pg_advisory_xact_lock(hashtextextended('compa:modelos', 0))`);
    const nuevo = (await c.query<{ id: string; label: string; role: string | null }>(`select id, label, role from compa_models where id = $1 and status = 'on' and id <> 'simulador'`, [String(id ?? "")])).rows[0];
    if (!nuevo) return { ok: false, msg: "Ese modelo no está encendido en la lista de precios." };
    if (nuevo.role === papel) return { ok: false, msg: "Ya tiene ese modelo." };
    if (nuevo.role) return { ok: false, msg: "Ese modelo ya tiene el otro papel: cambia primero ese." };
    const viejo = (await c.query<{ id: string; label: string }>(`update compa_models set role = null, updated_by = $2, updated_at = now() where role = $1 returning id, label`, [papel, s.id])).rows[0];
    await c.query(`update compa_models set role = $2, updated_by = $3, updated_at = now() where id = $1`, [nuevo.id, papel, s.id]);
    const L = papel === "copiloto" ? "Modelo del copiloto" : "Modelo de vecinos, panel y respuestas";
    await auditar(c, { actor: s.id, action: "compa.modelo", targetKind: "compa_model", targetId: papel, before: { [L]: viejo?.label ?? "ninguno" }, after: { [L]: nuevo.label }, reason: m });
    return { ok: true, msg: `${L}: ${nuevo.label}. Vale desde la próxima llamada y quedó en la auditoría.` };
  });
}

/* ── 7i · Usuarios 360° › El Compa: lo que esa persona habló con El Compa en 30 días, en cifras (por nivel y resultado, a una persona, acciones
   confirmadas, sin IA, marcadas, lo que no supo) y sus últimas conversaciones SIN texto. compa:ver; el hilo se abre en la ficha anotada (compa:editar).
   Quien llama ya revisó Usuarios (usr:ver) y la ciudad de la persona (usuario360). */
export type CompaUsuario = { conv30: number; porUso: Record<string, number>; porResultado: Record<string, number>; sinIa: number; marcadas: number; noSupo: number; acciones: number;
  filas: FilaConv[]; leer: boolean };
export async function compaDeUsuario(s: Staff, userId: string): Promise<CompaUsuario | null> {
  if (!s.puede("compa", "ver") || !/^[0-9a-f-]{36}$/.test(String(userId ?? ""))) return null;
  const [K, X, F] = await Promise.all([
    db().query<{ uso: string; res: string; n: number; sin_ia: number }>(
      `select use as uso, outcome as res, count(*)::int as n, count(*) filter (where not ai)::int as sin_ia from compa_conversations
        where user_id = $1 and use <> 'copilot' and started_at > now() - interval '30 days' and ${SUS("city_id", "$2")} group by 1, 2`, [userId, s.cities]),
    db().query<{ marcadas: number; no_supo: number; acciones: number }>(
      `select (select count(*)::int from compa_reviews r join compa_conversations c on c.id = r.conversation_id where c.user_id = $1 and r.cleared_at is null and ${SUS("c.city_id", "$2")}) as marcadas,
              (select count(*)::int from compa_unknowns q join compa_conversations c on c.id = q.conversation_id where c.user_id = $1 and q.at > now() - interval '30 days' and ${SUS("c.city_id", "$2")}) as no_supo,
              (select count(*)::int from compa_actions a join compa_conversations c on c.id = a.conversation_id where c.user_id = $1 and a.status = 'confirmed' and a.proposed_at > now() - interval '30 days' and ${SUS("c.city_id", "$2")}) as acciones`,
      [userId, s.cities]),
    db().query<FilaConv>(
      `select c.number as num, c.use as uso, c.channel as canal, c.surface as superficie, c.outcome as resultado, c.handoff_reason as motivo, c.ai, c.turns_n as turnos,
              ci.name as ciudad, ${ISO("c.started_at")} as at, c.purged_at is not null as purgada,
              exists (select 1 from compa_reviews r where r.conversation_id = c.id and r.cleared_at is null) as marcada
         from compa_conversations c join cities ci on ci.id = c.city_id
        where c.user_id = $1 and c.use <> 'copilot' and ${SUS("c.city_id", "$2")} order by c.started_at desc, c.id desc limit 15`, [userId, s.cities]),
  ]);
  const porUso: Record<string, number> = {}, porResultado: Record<string, number> = {};
  for (const x of K.rows) { porUso[x.uso] = (porUso[x.uso] ?? 0) + x.n; porResultado[x.res] = (porResultado[x.res] ?? 0) + x.n; }
  const x = X.rows[0]!;
  return { conv30: K.rows.reduce((t, y) => t + y.n, 0), porUso, porResultado, sinIa: K.rows.reduce((t, y) => t + y.sin_ia, 0), marcadas: x.marcadas, noSupo: x.no_supo, acciones: x.acciones,
    filas: F.rows, leer: s.puede("compa", "editar") };
}
