import "server-only";
import type { Staff } from "../admin";
import { cambiarConfig } from "../config";
import { db, tx } from "../db";
import { estadoInterruptores, type EstadoInterruptores } from "./interruptores";
import { motorActivo, type Motor, type Uso } from "./modelo";
import { autoNegocios, type AutoNegocio } from "./respuesta-auto";
import { gastoDelMes, type GastoMes } from "./tope";

/* 7c · Super Admin › El Compa (ADM-COMPA): Interruptores y tope (hueco #3 de fase7-compa.md: GASTADO ESTE MES · TOPE · POR NIVEL · al tope pasa
   a «Con una persona») y Conversaciones en solo lectura (lista con cursor, sin el texto: la ficha con el hilo y cada lectura anotada llega con
   el Super Admin completo de El Compa). Ver = compa:ver; cambiar = compa:aprobar (lo revisa cada acción). */
export type FilaConv = { num: string; uso: Uso; canal: string; superficie: string; resultado: string; motivo: string | null; ai: boolean; turnos: number; ciudad: string; at: string };
export type Historial = { accion: string; objetivo: string; antes: Record<string, string> | null; despues: Record<string, string> | null; motivo: string | null; quien: string | null; at: string };
export type DatosCompaAdmin = {
  gasto: GastoMes; interruptores: EstadoInterruptores; motor: Motor; modelos: { id: string; label: string; role: string | null; entrada: number; salida: number; geo: number; precioDe: string }[];
  historial: Historial[]; conv: { filas: FilaConv[]; sig: string | null; total7d: number; porResultado: Record<string, number>; porUso: Record<string, number> };
};
const ISO = (c: string) => `to_char(${c} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;
const USOS = new Set(["neighbor", "owner", "auto_reply", "copilot"]);
const RES = new Set(["open", "self_resolved", "action_done", "handed_off", "to_owner"]);

const CANALES = new Set(["app", "web", "whatsapp", "sms"]);
export async function datosCompaAdmin(f: { uso: string | null; resultado: string | null; antes: string | null; canal?: string | null; numero?: string | null }): Promise<DatosCompaAdmin> {
  const uso = f.uso && USOS.has(f.uso) ? f.uso : null, res = f.resultado && RES.has(f.resultado) ? f.resultado : null;
  const canal = f.canal && CANALES.has(f.canal) ? f.canal : null, numero = f.numero && /^CP-\d{4,12}$/.test(f.numero.trim().toUpperCase()) ? f.numero.trim().toUpperCase() : null;
  // Cursor «fecha|id» (la lista va de la más nueva a la más vieja).
  const cur = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z\|\d{1,12}$/.test(f.antes ?? "") ? f.antes!.split("|") : null;
  const [gasto, inter, M, H, C, K] = await Promise.all([
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
              ci.name as ciudad, ${ISO("c.started_at")} as at, c.id::text as sid, to_char(c.started_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as sat
         from compa_conversations c join cities ci on ci.id = c.city_id
        where ($1::text is null or c.use = $1) and ($2::text is null or c.outcome = $2)
          and ($3::timestamptz is null or (c.started_at, c.id) < ($3::timestamptz, $4::bigint))
          and ($5::text is null or c.channel = $5 or ($5 = 'app' and c.channel = 'web')) and ($6::text is null or c.number = $6)
        order by c.started_at desc, c.id desc limit 31`, [uso, res, cur?.[0] ?? null, cur?.[1] ?? null, canal, numero]),
    db().query<{ r: string; u: string; n: number }>(`select outcome as r, use as u, count(*)::int as n from compa_conversations where started_at > now() - interval '7 days' group by outcome, use`),
  ]);
  const filas = C.rows.slice(0, 30), ult = C.rows.length > 30 ? filas[filas.length - 1]! : null;
  const porResultado: Record<string, number> = {}, porUso: Record<string, number> = {};
  // 7e · Cifras de 7 días por resultado (del filtro DÓNDE si hay uno) y por nivel (vecinos, panel…).
  for (const x of K.rows) { porUso[x.u] = (porUso[x.u] ?? 0) + x.n; if (!uso || x.u === uso) porResultado[x.r] = (porResultado[x.r] ?? 0) + x.n; }
  return {
    gasto, interruptores: inter, motor: motorActivo(), modelos: M.rows, historial: H.rows,
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
  num: string; uso: Uso; canal: string; superficie: string; resultado: string; motivo: string | null; ai: boolean; ciudad: string; at: string; cerrada: string | null;
  quien: { id: string; nombre: string } | null; negocio: { id: string; nombre: string } | null; operacion: string | null; caso: string | null;
  msjs: { de: "user" | "compa" | "system"; t: string; fuente: string | null; motor: string | null; at: string }[];
  acciones: { tipo: string; estado: string; via: string | null; motivo: string | null; at: string }[];
  lecturas: { quien: string | null; at: string }[];
};
export async function fichaConversacion(s: Staff, numero: string): Promise<FichaConv | null> {
  if (!s.puede("compa", "editar")) return null;
  const n = String(numero ?? "").trim().toUpperCase();
  if (!/^CP-\d{4,12}$/.test(n)) return null;
  const c = await tx(async (q) => {
    const x = (await q.query<{ id: string; city_id: string }>(`select id::text, city_id from compa_conversations where number = $1`, [n])).rows[0];
    if (!x) return null;
    await q.query(`insert into compa_reads (conversation_id, staff_id, city_id) values ($1::bigint, $2, $3)`, [x.id, s.id, x.city_id]);
    return x;
  });
  if (!c) return null;
  const [K, M, A, R] = await Promise.all([
    db().query<Omit<FichaConv, "msjs" | "acciones" | "lecturas" | "quien" | "negocio"> & { uid: string | null; unom: string | null; bid: string | null; bnom: string | null }>(
      `select c.number as num, c.use as uso, c.channel as canal, c.surface as superficie, c.outcome as resultado, c.handoff_reason as motivo, c.ai, ci.name as ciudad,
              ${ISO("c.started_at")} as at, ${ISO("c.closed_at")} as cerrada, c.user_id::text as uid,
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
  ]);
  const k = K.rows[0];
  if (!k) return null;
  const { uid, unom, bid, bnom, ...base } = k;
  return { ...base, quien: uid ? { id: uid, nombre: unom ?? "Vecino" } : null, negocio: bid ? { id: bid, nombre: bnom ?? bid } : null, msjs: M.rows, acciones: A.rows, lecturas: R.rows };
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
