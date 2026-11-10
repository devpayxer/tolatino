import "server-only";
import type { Staff } from "../admin";
import { cambiarConfig } from "../config";
import { db } from "../db";
import { estadoInterruptores, type EstadoInterruptores } from "./interruptores";
import { motorActivo, type Motor, type Uso } from "./modelo";
import { gastoDelMes, type GastoMes } from "./tope";

/* 7c · Super Admin › El Compa (ADM-COMPA): Interruptores y tope (hueco #3 de fase7-compa.md: GASTADO ESTE MES · TOPE · POR NIVEL · al tope pasa
   a «Con una persona») y Conversaciones en solo lectura (lista con cursor, sin el texto: la ficha con el hilo y cada lectura anotada llega con
   el Super Admin completo de El Compa). Ver = compa:ver; cambiar = compa:aprobar (lo revisa cada acción). */
export type FilaConv = { num: string; uso: Uso; canal: string; superficie: string; resultado: string; motivo: string | null; ai: boolean; turnos: number; ciudad: string; at: string };
export type Historial = { accion: string; objetivo: string; antes: Record<string, string> | null; despues: Record<string, string> | null; motivo: string | null; quien: string | null; at: string };
export type DatosCompaAdmin = {
  gasto: GastoMes; interruptores: EstadoInterruptores; motor: Motor; modelos: { id: string; label: string; role: string | null; entrada: number; salida: number; geo: number; precioDe: string }[];
  historial: Historial[]; conv: { filas: FilaConv[]; sig: string | null; total7d: number; porResultado: Record<string, number> };
};
const ISO = (c: string) => `to_char(${c} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;
const USOS = new Set(["neighbor", "owner", "auto_reply", "copilot"]);
const RES = new Set(["open", "self_resolved", "action_done", "handed_off", "to_owner"]);

export async function datosCompaAdmin(f: { uso: string | null; resultado: string | null; antes: string | null }): Promise<DatosCompaAdmin> {
  const uso = f.uso && USOS.has(f.uso) ? f.uso : null, res = f.resultado && RES.has(f.resultado) ? f.resultado : null;
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
        order by c.started_at desc, c.id desc limit 31`, [uso, res, cur?.[0] ?? null, cur?.[1] ?? null]),
    db().query<{ r: string; n: number }>(`select outcome as r, count(*)::int as n from compa_conversations where started_at > now() - interval '7 days' group by outcome`),
  ]);
  const filas = C.rows.slice(0, 30), ult = C.rows.length > 30 ? filas[filas.length - 1]! : null;
  const porResultado = Object.fromEntries(K.rows.map((x) => [x.r, x.n]));
  return {
    gasto, interruptores: inter, motor: motorActivo(), modelos: M.rows, historial: H.rows,
    conv: { filas: filas.map(({ sid: _a, sat: _b, ...x }) => { void _a; void _b; return x; }), sig: ult ? `${ult.sat}|${ult.sid}` : null,
      total7d: K.rows.reduce((s, x) => s + x.n, 0), porResultado },
  };
}

/* Cambiar el tope (en dólares en la pantalla; en centavos en Configuración): la misma escritura con límites y auditoría de siempre. */
export async function cambiarTope(s: Staff, dolares: string, motivo: string): Promise<{ ok: true; msg: string } | { ok: false; msg: string }> {
  const t = String(dolares ?? "").trim().replace(/[$,\s]/g, "");
  if (!/^\d{1,5}(\.\d{1,2})?$/.test(t)) return { ok: false, msg: "Escribe el tope en dólares, por ejemplo 100 o 150.50." };
  const r = await cambiarConfig(s.id, "compa_tope_mes_cents", Math.round(Number(t) * 100), motivo);
  return r.ok ? { ok: true, msg: `Tope nuevo: $${(r.v / 100).toFixed(2)} al mes. Vale desde la próxima llamada.` } : { ok: false, msg: r.msg };
}
