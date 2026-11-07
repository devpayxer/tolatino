import "server-only";
import type { Pool, PoolClient } from "pg";
import { db } from "./db";
import { herramientaEdu } from "./edu";
import { fechaCorta, type Bi } from "./inscripciones-comun";
import { esLiga, esMembresia, kindDepDe, usdD, type HerrDep } from "./deporte-comun";

/* Deporte (Fase 4 · bloque 4ec). Plan: docs/diseno/plan/fase4-edu-ninos-deporte.md §2, §4ec y §5. Diseño: dash2-cat.js L473–487
   (Liga e inscripciones · Membresías y contrato), apply L238–249 (tarjeta y filtros), neg-deporte-kind.js conL L30.
   - Una sola fuente de los precios: la mensualidad, el pase de un día, la cuota de la temporada (y su depósito) y la cancha por hora
     son los del ítem; la herramienta escribe en el ítem. Lo demás (contrato, salirse antes, inscripción, guardería, hasta cuándo,
     sueltos) vive en insc_settings.
   - Sin contrato, salirse no cuesta nada (check en la base). «Lugares que quedan» son los cupos libres del grupo de la temporada. */
type Q = Pool | PoolClient;
const HOY_SQL = `(now() at time zone ci.timezone)::date`;

export async function herramientaDeporte(negocio: string, c: Q = db()): Promise<HerrDep | null> {
  const b = (await c.query<{ subs: string[]; ov: string | null; fv: string[]; con: number | null; cxl: number | null; ins: number | null; guard: boolean | null; esp: boolean | null; hasta: string | null; sueltos: boolean | null }>(
    `select coalesce((select array_agg(sc.name->>'es') from subcategorias_vivas sc where sc.id = any(b.subcategory_ids)), '{}') as subs, s.kind_override as ov, b.filter_values as fv,
            s.contract_m as con, s.cancel_fee_cents as cxl, s.signup_cents as ins, s.childcare as guard, s.esp, s.league_until::text as hasta, s.free_agents as sueltos
       from businesses b left join insc_settings s on s.business_id = b.id where b.id = $1 and b.category_id = 'NEG-DEPORTE'`, [negocio])).rows[0];
  if (!b) return null;
  const kind = kindDepDe(b.subs, b.ov), fv = b.fv ?? [], edu = await herramientaEdu(negocio, c);
  const V = (edu?.cursos ?? []).filter((x) => x.vende), first = (k: string) => V.find((x) => x.k === k) ?? null;
  const mes = first("mes"), dia = first("clase"), temp = first("curso"), cancha = first("hora");
  const g = temp ? temp.grupos.filter((z) => z.estado === "open").sort((p, q) => p.inicio.localeCompare(q.inicio))[0] ?? null : null;
  const T = temp ? (await c.query<{ team: boolean }>(`select coalesce((svc_attrs->>'team')::boolean, false) as team from items where id = $1`, [temp.id])).rows[0] : null;
  return {
    kind, memb: esMembresia(kind), liga: esLiga(kind),
    contrato: b.con ?? 0, salir: b.cxl ?? 0, inscripcion: b.ins ?? 0, guarderia: b.guard ?? fv.includes("guarderia"), esp: b.esp ?? fv.includes("esp"),
    mes: mes ? { id: mes.id, cents: mes.cents, g1: mes.g1 } : null, dia: dia ? { id: dia.id, cents: dia.cents } : null,
    temporada: temp ? { id: temp.id, cents: temp.cents, dep: temp.mat, team: !!T?.team, sem: temp.sem, grupo: g ? { id: g.id, libres: g.libres, inicio: g.inicio } : null } : null,
    hasta: b.hasta, sueltos: b.sueltos ?? fv.includes("sueltos"), cancha: cancha ? { id: cancha.id, cents: cancha.cents } : null, edu, hoy: edu?.hoy ?? new Date().toISOString().slice(0, 10),
  };
}

/* Lo que manda el panel (un toque a la vez). Los precios van al ítem; lo demás, a insc_settings. */
export type DepIn = { contrato?: number; salir?: number; inscripcion?: number; guarderia?: boolean; esp?: boolean; sueltos?: boolean; hasta?: string | null;
  mes?: number; dia?: number; g1?: boolean; cuota?: number; deposito?: number; libres?: number; cancha?: number };
type R = { ok: true } | { ok: false; es: string; en: string };
const err = (es: string, en: string): R => ({ ok: false, es, en });
const dol = (v: unknown, lo: number, hi: number) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= lo && n <= hi && n % 100 === 0 ? n : null; };

export async function guardarDeporte(c: PoolClient, negocio: string, p: DepIn, actor: string): Promise<R> {
  const b = (await c.query<{ city: string }>(`select city_id as city from businesses where id = $1 and category_id = 'NEG-DEPORTE' for update`, [negocio])).rows[0];
  if (!b) return err("Esto es para Deporte.", "This is for sports businesses.");
  const h = (await herramientaDeporte(negocio, c))!;
  await c.query(`insert into insc_settings (business_id, city_id, rubro, updated_by) values ($1, $2, 'dep', $3) on conflict (business_id) do nothing`, [negocio, b.city, actor]);
  const set = (sql: string, v: unknown[]) => c.query(`update insc_settings set ${sql}, updated_by = $${v.length + 2}, updated_at = now() where business_id = $1`, [negocio, ...v, actor]);
  const precio = (id: string, cents: number) => c.query(`update items set price_cents = $2, updated_at = now() where id = $1 and business_id = $3`, [id, cents, negocio]);
  if (p.contrato !== undefined) {
    const m = Math.round(Number(p.contrato));
    if (![0, 3, 6, 12].includes(m)) return err("El contrato es sin contrato, 6 o 12 meses.", "The contract is none, 6 or 12 months.");
    // Sin contrato, salirse no cuesta nada (check); con contrato, lo que cuesta se dice siempre (aunque sea $0).
    await set(m ? `contract_m = $2` : `contract_m = $2, cancel_fee_cents = 0`, [m]); return { ok: true };
  }
  if (p.salir !== undefined) {
    if (!h.contrato) return err("Sin contrato, salirse no cuesta nada.", "With no contract, leaving costs nothing.");
    const v = dol(p.salir, 0, 50000); if (v == null) return err("Lo que cuesta cancelar va de $0 a $500.", "The cancellation cost goes from $0 to $500.");
    await set(`cancel_fee_cents = $2`, [v]); return { ok: true };
  }
  if (p.inscripcion !== undefined) { const v = dol(p.inscripcion, 0, 20000); if (v == null) return err("La cuota de inscripción va de $0 a $200.", "The signup fee goes from $0 to $200."); await set(`signup_cents = $2`, [v]); return { ok: true }; }
  if (p.guarderia !== undefined) { await set(`childcare = $2`, [p.guarderia === true]); return { ok: true }; }
  if (p.esp !== undefined) { await set(`esp = $2`, [p.esp === true]); return { ok: true }; }
  if (p.sueltos !== undefined) { await set(`free_agents = $2`, [p.sueltos === true]); return { ok: true }; }
  if (p.hasta !== undefined) {
    if (p.hasta !== null && (!/^\d{4}-\d{2}-\d{2}$/.test(String(p.hasta)) || String(p.hasta) < h.hoy)) return err("La fecha límite es hoy o después.", "The deadline is today or later.");
    if (p.hasta && h.temporada?.grupo && p.hasta > h.temporada.grupo.inicio) return err("La inscripción cierra antes de que empiece la temporada.", "Signups close before the season starts.");
    await set(`league_until = $2::date`, [p.hasta]); return { ok: true };
  }
  if (p.mes !== undefined) { if (!h.mes) return err("Primero agrega la membresía en Servicios.", "First add the membership in Services."); const v = dol(p.mes, 500, 30000); if (v == null) return err("La mensualidad va de $5 a $300.", "The monthly fee goes from $5 to $300."); await precio(h.mes.id, v); return { ok: true }; }
  if (p.dia !== undefined) { if (!h.dia) return err("Primero agrega el pase o la clase suelta en Servicios.", "First add the day pass or drop-in class in Services."); const v = dol(p.dia, 100, 5000); if (v == null) return err("El pase va de $1 a $50.", "The pass goes from $1 to $50."); await precio(h.dia.id, v); return { ok: true }; }
  if (p.g1 !== undefined) {
    if (!h.mes) return err("Primero agrega la membresía en Servicios.", "First add the membership in Services.");
    await c.query(`update items set svc_attrs = case when $2 then coalesce(svc_attrs, '{}'::jsonb) || '{"g1":true}'::jsonb else coalesce(svc_attrs, '{}'::jsonb) - 'g1' end, updated_at = now() where id = $1`, [h.mes.id, p.g1 === true]);
    return { ok: true };
  }
  if (p.cuota !== undefined || p.deposito !== undefined) {
    const t = h.temporada; if (!t) return err("Primero agrega la temporada en Servicios.", "First add the season in Services.");
    const cuota = p.cuota !== undefined ? dol(p.cuota, 1000, 200000) : t.cents, dep = p.deposito !== undefined ? dol(p.deposito, 0, 200000) : t.dep;
    if (cuota == null) return err("La cuota va de $10 a $2,000.", "The fee goes from $10 to $2,000.");
    if (dep == null) return err("El depósito va en dólares enteros.", "The deposit goes in whole dollars.");
    // El depósito aparta el lugar y se descuenta: siempre menos que la cuota (check items_matricula_check).
    const d2 = Math.min(dep, cuota - 100);
    await c.query(`update items set price_cents = $2, deposit_cents = $3, svc_attrs = case when $3 = 0 then coalesce(svc_attrs, '{}'::jsonb) - 'dep' else coalesce(svc_attrs, '{}'::jsonb) || jsonb_build_object('dep', $3) end, updated_at = now() where id = $1`, [t.id, cuota, d2]);
    return { ok: true };
  }
  if (p.libres !== undefined) {
    const g = h.temporada?.grupo; if (!g) return err("Primero abre la temporada.", "First open the season.");
    const n = Math.round(Number(p.libres)); if (!(n >= 0 && n <= 40)) return err("Los lugares van de 0 a 40.", "Spots go from 0 to 40.");
    await c.query(`update class_groups set seats_total = seats_outside + seats_booked + $2, updated_at = now() where id = $1 and business_id = $3 and status = 'open'`, [g.id, n, negocio]);
    return { ok: true };
  }
  if (p.cancha !== undefined) { if (!h.cancha) return err("Primero agrega la cancha por hora en Servicios.", "First add the field per hour in Services."); const v = dol(p.cancha, 1000, 30000); if (v == null) return err("La cancha va de $10 a $300 la hora.", "The field goes from $10 to $300 an hour."); await precio(h.cancha.id, v); return { ok: true }; }
  return err("No hay nada que guardar.", "Nothing to save.");
}

/* Los filtros de Deporte que salen de los datos (nunca se editan a mano) y la tarjeta del buscador. Los demás (24h, techado, aire,
   gym, combate, cuerpo…) salen de las amenidades, la subcategoría o el catálogo y se conservan. */
const DER = ["sincontrato", "guarderia", "gratis1", "esp", "membresia", "visita", "ligas", "sueltos"];
export async function recalcularFiltrosDeporte(c: Q, negocio: string) {
  const b = (await c.query<{ fv: string[]; hay: boolean; hoy: string }>(
    `select b.filter_values as fv, exists (select 1 from insc_settings s where s.business_id = b.id) as hay, ${HOY_SQL}::text as hoy
       from businesses b join cities ci on ci.id = b.city_id where b.id = $1 and b.category_id = 'NEG-DEPORTE'`, [negocio])).rows[0];
  if (!b || !b.hay) return;
  const h = (await herramientaDeporte(negocio, c))!, V = (h.edu?.cursos ?? []).filter((x) => x.vende), F = new Set<string>();
  if (h.memb && !h.contrato) F.add("sincontrato");
  if (h.guarderia) F.add("guarderia");
  if (h.esp) F.add("esp");
  if (V.some((x) => x.g1)) F.add("gratis1");
  if (V.some((x) => x.k === "mes")) F.add("membresia");
  if (V.some((x) => x.k === "clase")) F.add("visita");
  if (V.some((x) => x.k === "curso")) F.add("ligas");
  if (h.liga && h.sueltos) F.add("sueltos");
  const fv = [...(b.fv ?? []).filter((x) => !DER.includes(x)), ...F];
  // La tarjeta (apply L245, L249): membresía → contrato y mensualidad; liga → hasta cuándo, cuántos quedan y la cuota.
  const tj: Record<string, Bi> = {};
  if (h.memb) {
    tj.eta = !h.contrato ? { es: "Sin contrato · cancela cuando quieras", en: "No contract · cancel any time" }
      : { es: `Contrato de ${h.contrato} meses · cancelar antes ${h.salir ? `cuesta ${usdD(h.salir)}` : "no cuesta"}`, en: `${h.contrato}-month contract · early cancellation ${h.salir ? `costs ${usdD(h.salir)}` : "is free"}` };
    if (h.mes) tj.fee = { es: `${usdD(h.mes.cents)} al mes · ${h.inscripcion ? `inscripción ${usdD(h.inscripcion)}` : "sin cuota de inscripción"}`, en: `${usdD(h.mes.cents)} a month · ${h.inscripcion ? `signup ${usdD(h.inscripcion)}` : "no signup fee"}` };
  } else if (h.liga && h.temporada) {
    const t = h.temporada, l = t.grupo?.libres ?? 0, quien = (es: boolean) => (t.team ? (es ? "equipos" : "teams") : (es ? "jugadores" : "players"));
    tj.eta = !t.grupo || !l ? { es: "Liga llena · lista de espera", en: "League full · waitlist" }
      : h.hasta && h.hasta >= b.hoy ? { es: `Inscripción de ${quien(true)} hasta el ${fechaCorta(h.hasta, true)}`, en: `${t.team ? "Team" : "Player"} signups until ${fechaCorta(h.hasta, false)}` }
      : { es: `Quedan ${l} lugares`, en: `${l} spots left` };
    tj.fee = { es: `${usdD(t.cents)} ${t.team ? "por equipo" : "por jugador"} · ${t.dep ? `depósito ${usdD(t.dep)}` : "sin depósito"}`, en: `${usdD(t.cents)} ${t.team ? "per team" : "per player"} · ${t.dep ? `deposit ${usdD(t.dep)}` : "no deposit"}` };
  }
  await c.query(
    `update businesses set filter_values = $2, category_attrs = coalesce(category_attrs, '{}'::jsonb) || jsonb_build_object('tarjeta', (coalesce(category_attrs->'tarjeta', '{}'::jsonb) - 'eta' - 'fee') || $3::jsonb), updated_at = now()
      where id = $1`, [negocio, fv, JSON.stringify(tj)]);
  await c.query(`update insc_settings set derived_on = $2::date where business_id = $1`, [negocio, b.hoy]);
}

/* El barrido (cada minuto): recalcula los lugares de Deporte cuyo día cambió (la fecha límite de la liga pasó, la temporada empezó). */
export async function barrerDeporte(): Promise<number> {
  const L = (await db().query<{ id: string }>(
    `select s.business_id as id from insc_settings s join businesses b on b.id = s.business_id join cities ci on ci.id = b.city_id
      where s.rubro = 'dep' and b.status = 'active' and s.derived_on is distinct from ${HOY_SQL} order by s.derived_on nulls first limit 500`)).rows;
  for (const x of L) await recalcularFiltrosDeporte(db(), x.id);
  return L.length;
}
