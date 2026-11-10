import "server-only";
import { auditar, type Staff } from "../admin";
import { db, tx } from "../db";
import { ENTORNO } from "../entorno";
import type { Canal, Uso } from "./modelo";

/* 7c · Los interruptores de El Compa (fase7-compa.md §3 «Tope e interruptores»; MD L1706; guardián compaInterruptores). ÚNICO lugar que los
   lee o los cambia:
   - Por nivel (global): feature_flags compa.use.neighbor · owner · auto_reply · copilot.
   - Por canal (global): feature_flags compa.channel.app · whatsapp · sms (la web cuenta como app).
   - Por ciudad o por negocio: compa_pauses (todo El Compa o un nivel), con motivo; se levanta, no se borra.
   Apagado = el camino de siempre (la Ayuda abre el formulario, Soporte dice «Escríbenos», el panel avisa, no hay respuestas automáticas, el
   copiloto no sale). Se lee de la base en cada turno (sin caché): un apagado vale para el mensaje siguiente.
   CANDADO: en producción El Compa no se enciende antes de la fase 9 (regla 2): sin TOLATINO_COMPA=encendido, todo responde «apagado». */
export const NIVELES: Uso[] = ["neighbor", "owner", "auto_reply", "copilot"];
export const CANALES = ["app", "whatsapp", "sms"] as const;
export type CanalFlag = (typeof CANALES)[number];
export const flagUso = (u: Uso) => `compa.use.${u}`;
export const flagCanal = (c: Canal) => `compa.channel.${c === "web" ? "app" : c}`;
export const candadoProduccion = () => ENTORNO === "produccion" && process.env.TOLATINO_COMPA !== "encendido";

export type Disponible = { ok: true } | { ok: false; por: "produccion" | "nivel" | "canal" | "ciudad" | "negocio" };
export async function disponible(x: { uso: Uso; canal: Canal; ciudad: string | null; negocio?: string | null }): Promise<Disponible> {
  if (candadoProduccion()) return { ok: false, por: "produccion" };
  const r = (await db().query<{ nivel: boolean | null; canal: boolean | null; ciudad: boolean; negocio: boolean }>(
    `select (select enabled from feature_flags where key = $1) as nivel, (select enabled from feature_flags where key = $2) as canal,
            exists (select 1 from compa_pauses where scope = 'city' and city_id = $3 and lifted_at is null and (use is null or use = $5)) as ciudad,
            exists (select 1 from compa_pauses where scope = 'business' and business_id = $4 and lifted_at is null and (use is null or use = $5)) as negocio`,
    [flagUso(x.uso), flagCanal(x.canal), x.ciudad, x.negocio ?? null, x.uso])).rows[0];
  // Una bandera que no existe cuenta como apagada (nunca encendido por accidente).
  if (!r?.nivel) return { ok: false, por: "nivel" };
  if (!r.canal) return { ok: false, por: "canal" };
  if (r.ciudad) return { ok: false, por: "ciudad" };
  if (r.negocio) return { ok: false, por: "negocio" };
  return { ok: true };
}

/* ── Super Admin › El Compa › Interruptores ── */
export type EstadoInterruptores = {
  niveles: { uso: Uso; on: boolean; nota: string | null; at: string | null }[];
  canales: { canal: CanalFlag; on: boolean; at: string | null }[];
  pausas: { id: string; scope: "city" | "business"; donde: string; nombre: string; uso: Uso | null; motivo: string; quien: string | null; at: string }[];
  ciudades: { id: string; nombre: string }[];
  candado: boolean;
};
const ISO = (c: string) => `to_char(${c} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;
export async function estadoInterruptores(): Promise<EstadoInterruptores> {
  const [F, P, C] = await Promise.all([
    db().query<{ key: string; enabled: boolean; note: string | null; at: string }>(`select key, enabled, note, ${ISO("updated_at")} as at from feature_flags where key like 'compa.%'`),
    db().query<EstadoInterruptores["pausas"][number]>(
      `select p.id::text, p.scope, coalesce(p.city_id, p.business_id) as donde, coalesce(ci.name, b.name, '') as nombre, p.use as uso, p.reason as motivo,
              nullif(trim(coalesce(u.first_name, '') || ' ' || left(coalesce(u.last_name, ''), 1)), '') as quien, ${ISO("p.paused_at")} as at
         from compa_pauses p left join cities ci on ci.id = p.city_id left join businesses b on b.id = p.business_id left join users u on u.id = p.paused_by
        where p.lifted_at is null order by p.paused_at desc limit 100`),
    db().query<{ id: string; nombre: string }>(`select id, name as nombre from cities order by name`),
  ]);
  const f = new Map(F.rows.map((x) => [x.key, x]));
  return {
    niveles: NIVELES.map((u) => ({ uso: u, on: !!f.get(flagUso(u))?.enabled, nota: f.get(flagUso(u))?.note ?? null, at: f.get(flagUso(u))?.at ?? null })),
    canales: CANALES.map((c) => ({ canal: c, on: !!f.get(`compa.channel.${c}`)?.enabled, at: f.get(`compa.channel.${c}`)?.at ?? null })),
    pausas: P.rows, ciudades: C.rows, candado: candadoProduccion(),
  };
}

type Res = { ok: true; msg: string } | { ok: false; msg: string };
const limpiar = (m: string) => String(m ?? "").replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim().slice(0, 300);
const ETQ: Record<string, string> = { "compa.use.neighbor": "vecinos", "compa.use.owner": "panel del negocio", "compa.use.auto_reply": "respuestas automáticas", "compa.use.copilot": "copiloto",
  "compa.channel.app": "app y web", "compa.channel.whatsapp": "WhatsApp", "compa.channel.sms": "SMS" };

/* Encender o pausar un nivel o un canal (compa:aprobar; lo revisa la acción). Pausar pide motivo; queda en la auditoría con antes → después. */
export async function cambiarInterruptor(s: Staff, clave: string, encender: boolean, motivo: string): Promise<Res> {
  if (!Object.hasOwn(ETQ, clave)) return { ok: false, msg: "Ese interruptor no existe." };
  const m = limpiar(motivo);
  if (m.length < 3) return { ok: false, msg: "Escribe el motivo: queda en el historial." };
  return tx(async (c): Promise<Res> => {
    const a = (await c.query<{ enabled: boolean }>(`select enabled from feature_flags where key = $1 for update`, [clave])).rows[0];
    if (!a) return { ok: false, msg: "Ese interruptor no existe." };
    if (a.enabled === encender) return { ok: false, msg: encender ? "Ya está encendido." : "Ya está en pausa." };
    await c.query(`update feature_flags set enabled = $2, updated_at = now(), updated_by = $3 where key = $1`, [clave, encender, s.id]);
    await auditar(c, { actor: s.id, action: encender ? "compa.encender" : "compa.pausar", targetKind: "feature_flag", targetId: clave,
      before: { [`El Compa · ${ETQ[clave]}`]: a.enabled ? "encendido" : "en pausa" }, after: { [`El Compa · ${ETQ[clave]}`]: encender ? "encendido" : "en pausa" }, reason: m });
    return { ok: true, msg: encender ? `Encendido: El Compa · ${ETQ[clave]}.` : `En pausa: El Compa · ${ETQ[clave]}. La gente ve el camino de siempre.` };
  });
}

/* Pausar El Compa en una ciudad o en un negocio (todo o un nivel), y levantar la pausa. Nada se borra: la pausa guarda quién, cuándo y por qué. */
export async function pausarEn(s: Staff, x: { scope: "city" | "business"; donde: string; uso: Uso | null }, motivo: string): Promise<Res> {
  const m = limpiar(motivo);
  if (m.length < 3) return { ok: false, msg: "Escribe el motivo: queda en el historial." };
  if (x.uso && !NIVELES.includes(x.uso)) return { ok: false, msg: "Ese nivel no existe." };
  const donde = String(x.donde ?? "").trim().toLowerCase().slice(0, 80);
  return tx(async (c): Promise<Res> => {
    const d = x.scope === "city"
      ? (await c.query<{ id: string; nombre: string }>(`select id, name as nombre from cities where id = $1`, [donde])).rows[0]
      : (await c.query<{ id: string; nombre: string }>(`select id, name as nombre from businesses where (id = $1 or lower(name) = $1) and status <> 'merged' order by (id = $1) desc limit 1`, [donde])).rows[0];
    if (!d) return { ok: false, msg: x.scope === "city" ? "Esa ciudad no existe." : "Ese negocio no existe (escribe su id o su nombre exacto)." };
    const ya = await c.query(`select 1 from compa_pauses where scope = $1 and coalesce(city_id, business_id) = $2 and coalesce(use, '*') = coalesce($3, '*') and lifted_at is null`, [x.scope, d.id, x.uso]);
    if (ya.rowCount) return { ok: false, msg: "Ya está en pausa ahí." };
    await c.query(`insert into compa_pauses (scope, city_id, business_id, use, reason, paused_by) values ($1, $2, $3, $4, $5, $6)`,
      [x.scope, x.scope === "city" ? d.id : null, x.scope === "business" ? d.id : null, x.uso, m, s.id]);
    await auditar(c, { actor: s.id, action: "compa.pausar_en", targetKind: x.scope === "city" ? "city" : "business", targetId: d.id, city: x.scope === "city" ? d.id : null,
      before: { [`El Compa en ${d.nombre}`]: "encendido" }, after: { [`El Compa en ${d.nombre}`]: `en pausa${x.uso ? ` (${ETQ[flagUso(x.uso)]})` : ""}` }, reason: m });
    return { ok: true, msg: `En pausa en ${d.nombre}. Ahí la gente ve el camino de siempre.` };
  });
}
export async function levantarPausa(s: Staff, id: string, motivo: string): Promise<Res> {
  const m = limpiar(motivo);
  if (m.length < 3) return { ok: false, msg: "Escribe el motivo: queda en el historial." };
  if (!/^\d{1,12}$/.test(String(id ?? ""))) return { ok: false, msg: "Esa pausa no existe." };
  return tx(async (c): Promise<Res> => {
    const p = (await c.query<{ scope: string; donde: string; city_id: string | null; nombre: string }>(
      `select p.scope, coalesce(p.city_id, p.business_id) as donde, p.city_id, coalesce(ci.name, b.name, '') as nombre
         from compa_pauses p left join cities ci on ci.id = p.city_id left join businesses b on b.id = p.business_id where p.id = $1 and p.lifted_at is null for update of p`, [id])).rows[0];
    if (!p) return { ok: false, msg: "Esa pausa ya se levantó." };
    await c.query(`update compa_pauses set lifted_at = now(), lifted_by = $2, lift_reason = $3 where id = $1`, [id, s.id, m]);
    await auditar(c, { actor: s.id, action: "compa.levantar", targetKind: p.scope === "city" ? "city" : "business", targetId: p.donde, city: p.city_id,
      before: { [`El Compa en ${p.nombre}`]: "en pausa" }, after: { [`El Compa en ${p.nombre}`]: "encendido" }, reason: m });
    return { ok: true, msg: "Pausa levantada: El Compa vuelve a contestar ahí." };
  });
}
