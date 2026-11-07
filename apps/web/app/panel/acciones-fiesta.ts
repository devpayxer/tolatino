"use server";
/* Tu herramienta de Fiestas («Calendario y depósito») desde el panel (4t, fase4-fiestas-transporte §4t y §5): cada toque se
   guarda. Mismo sitio, miembro activo con acceso a «Lo que vendes» (parte cat), datos revisados AQUÍ, una línea en la
   auditoría y los filtros de la categoría recalculados. Una fecha con fiesta confirmada no se libera. */
import { mismoOrigen } from "@/lib/cuenta";
import { tx } from "@/lib/db";
import { marcarDia, recalcularFiltrosFiesta } from "@/lib/fiestas";
import { accesoPanel } from "@/lib/panel";
import type { Res } from "./acciones";

const no = (es: string, en: string): Res => ({ ok: false, mensaje: { es, en } });
const SIN_ACCESO = no("No tienes acceso a esta parte del panel.", "You don’t have access to this part of the dashboard.");
export type FiestaIn = { dep?: number; guests?: number | null; perDay?: number; ahead?: number; zone?: number };

export async function fiestaGuardar(negocio: string, p: FiestaIn): Promise<Res> {
  if (!(await mismoOrigen())) return SIN_ACCESO;
  const a = typeof negocio === "string" ? await accesoPanel(negocio, "cat") : null;
  if (!a) return SIN_ACCESO;
  const n = (v: unknown, lo: number, hi: number) => { const z = Math.round(Number(v)); return Number.isFinite(z) && z >= lo && z <= hi ? z : null; };
  const dep = p?.dep === undefined ? undefined : n(p.dep, 0, 300000), per = p?.perDay === undefined ? undefined : n(p.perDay, 1, 20), ahead = p?.ahead === undefined ? undefined : n(p.ahead, 30, 365);
  const guests = p?.guests === undefined ? undefined : p.guests === null ? null : n(p.guests, 10, 1000), zone = p?.zone === undefined ? undefined : n(p.zone, 0, 150);
  if (dep === null || (dep !== undefined && dep % 5000) || per === null || ahead === null || zone === null || (p?.guests !== undefined && p.guests !== null && guests === null)) return no("Revisa el valor.", "Check the value.");
  return tx(async (c) => {
    const k = (await c.query<{ cat: string }>(`select category_id as cat from businesses where id = $1 for update`, [a.negocio.id])).rows[0]?.cat;
    if (k !== "NEG-FIESTA") return no("Esto es para Fiestas.", "This is for party businesses.");
    const antes = (await c.query(`select deposit_cents, guests_max, events_per_day, book_ahead_days from fiesta_settings where business_id = $1`, [a.negocio.id])).rows[0] ?? null;
    await c.query(
      `insert into fiesta_settings (business_id, deposit_cents, guests_max, events_per_day, book_ahead_days, updated_by) values ($1, coalesce($2, 0), $3, coalesce($4, 1), coalesce($5, 180), $6)
       on conflict (business_id) do update set deposit_cents = coalesce($2, fiesta_settings.deposit_cents), guests_max = case when $7 then $3 else fiesta_settings.guests_max end,
         events_per_day = coalesce($4, fiesta_settings.events_per_day), book_ahead_days = coalesce($5, fiesta_settings.book_ahead_days), updated_by = $6, updated_at = now()`,
      [a.negocio.id, dep ?? null, guests ?? null, per ?? null, ahead ?? null, a.yo.id, guests !== undefined]);
    if (zone !== undefined) await c.query(`update businesses set service_radius_mi = nullif($2, 0), updated_at = now() where id = $1`, [a.negocio.id, zone]);
    await c.query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, before, after) values ('user', $1, 'fiesta.herramienta', 'business', $2, $3, $4::jsonb, $5::jsonb)`,
      [a.yo.id, a.negocio.id, a.negocio.city_id, antes ? JSON.stringify(antes) : null, JSON.stringify({ deposito: dep, invitados: guests, eventos_por_dia: per, dias_adelante: ahead, millas: zone })]);
    await recalcularFiltrosFiesta(c, a.negocio.id);
    return { ok: true };
  });
}

/* Marcar o liberar una fecha del calendario. */
export async function fiestaDia(negocio: string, dia: string, ocupada: boolean): Promise<Res> {
  if (!(await mismoOrigen())) return SIN_ACCESO;
  const a = typeof negocio === "string" ? await accesoPanel(negocio, "cat") : null;
  if (!a) return SIN_ACCESO;
  return tx(async (c) => {
    const k = (await c.query<{ cat: string }>(`select category_id as cat from businesses where id = $1 for update`, [a.negocio.id])).rows[0]?.cat;
    if (k !== "NEG-FIESTA") return no("Esto es para Fiestas.", "This is for party businesses.");
    const r = await marcarDia(c, a.negocio.id, String(dia ?? ""), ocupada === true, a.yo.id);
    if (!r.ok) return no(r.es, r.en);
    await c.query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, before, after) values ('user', $1, $2, 'business', $3, $4, null, $5::jsonb)`,
      [a.yo.id, ocupada ? "fiesta.fecha.ocupada" : "fiesta.fecha.libre", a.negocio.id, a.negocio.city_id, JSON.stringify({ fecha: dia })]);
    await recalcularFiltrosFiesta(c, a.negocio.id);
    return { ok: true };
  });
}
