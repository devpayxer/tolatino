"use server";
import { limpiarFe, limpiarFiesta, limpiarInsc, limpiarNoche, limpiarSP, limpiarTrans, rubroSvc, type AttrsSP } from "@/lib/servicios";
import { recalcularFiltrosNoche } from "@/lib/noche";
import { recalcularFiltrosEdu } from "@/lib/edu";
import { recalcularFiltrosFiesta } from "@/lib/fiestas";
import { recalcularFiltrosTrans } from "@/lib/transporte";
import { invitarCobro } from "@/lib/sillas";
import { recalcularFiltrosSP } from "@/lib/salud-pro";
/* Servicios y reglas de citas desde el panel (Lo que vendes › Servicios, Citas y Sillas y agenda). Cada acción: mismo
   sitio, miembro activo con acceso a «Lo que vendes» (parte cat), datos revisados en el servidor y una línea en la
   auditoría. Nada se borra (removed_at). Las citas ya pedidas guardan su copia del servicio: cambiar aquí no las toca. */
import type { PoolClient } from "pg";
import { mismoOrigen } from "@/lib/cuenta";
import { tx } from "@/lib/db";
import { accesoPanel, type Acceso } from "@/lib/panel";
import type { Res } from "./acciones";

const no = (es: string, en: string): Res => ({ ok: false, mensaje: { es, en } });
const SIN_ACCESO = no("No tienes acceso a esta parte del panel.", "You don’t have access to this part of the dashboard.");
const ID = /^\d{1,18}$/, UUID = /^[0-9a-f-]{36}$/;
const txt = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").replace(/\s+/g, " ").trim().slice(0, max) : "");
const ent = (v: unknown, min: number, max: number, def: number) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : def; };

async function hacer(id: string, fn: (c: PoolClient, a: Acceso) => Promise<Res | null>): Promise<Res & { id?: string }> {
  if (!(await mismoOrigen())) return SIN_ACCESO;
  const a = typeof id === "string" ? await accesoPanel(id, "cat") : null;
  if (!a) return SIN_ACCESO;
  const r = await tx(async (c) => {
    const x = await fn(c, a);
    // Doctores y Profesionales: sus filtros salen de los servicios (sin cita, consulta gratis, por video…).
    if (!x || x.ok) { await recalcularFiltrosSP(c, a.negocio.id); await recalcularFiltrosFiesta(c, a.negocio.id); await recalcularFiltrosTrans(c, a.negocio.id); await recalcularFiltrosNoche(c, a.negocio.id); await recalcularFiltrosEdu(c, a.negocio.id); await (await import("@/lib/ninos")).recalcularFiltrosNinos(c, a.negocio.id); await (await import("@/lib/deporte")).recalcularFiltrosDeporte(c, a.negocio.id); await (await import("@/lib/fe")).recalcularFiltrosFe(c, a.negocio.id); }
    return x;
  });
  return r ?? { ok: true };
}
async function auditar(c: PoolClient, a: Acceso, action: string, before: unknown, after: unknown) {
  await c.query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, before, after) values ('user', $1, $2, 'business', $3, $4, $5::jsonb, $6::jsonb)`,
    [a.yo.id, action, a.negocio.id, a.negocio.city_id, JSON.stringify(before ?? null), JSON.stringify(after ?? null)]);
}

/* ── Servicio: crear o guardar ── */
export type ServicioIn = {
  name: string; en: string; desc: string; descEn: string; sec: string; newSec: string; price: number; desde: boolean; dur: number; buf: number;
  foto: string | null; visible: boolean; extra: boolean; hacen: Record<string, number | null>; k?: string; a?: AttrsSP; opts: { t: string; tEn: string; o: { n: string; nEn: string; p: number; m: number }[] }[];
};
export async function servicioGuardar(negocio: string, itemId: string, p: ServicioIn): Promise<Res & { id?: string }> {
  let nuevoId: string | undefined;
  const r = await hacer(negocio, async (c, a) => {
    const name = txt(p?.name, 50), en = txt(p?.en, 50), desc = txt(p?.desc, 120), descEn = txt(p?.descEn, 120), extra = !!p?.extra;
    if (name.length < 2) return no("Escribe el nombre del servicio.", "Type the service name.");
    const cents = ent(Number(p?.price) * 100, 0, 1_000_000, -1);
    // Doctores y Profesionales: la forma de cobrar decide si el precio puede ser $0 (gratis con tu seguro, consulta gratis…).
    const cat = (await c.query<{ cat: string }>(`select category_id as cat from businesses where id = $1`, [a.negocio.id])).rows[0]?.cat ?? "", rub = extra ? null : rubroSvc(cat);
    let k: string | null = null, attrs: AttrsSP | null = null, cents2 = cents;
    if (rub) {
      // Iglesias (4ia): el precio total es solo de las funerarias (el tipo sale de las subcategorías, como la herramienta) y llega a
      // $30,000, por encima del tope general; limpiarFe revisa el número sin redondearlo al tope.
      const fun = rub === "fe" ? (await (await import("@/lib/fe")).herramientaFe(a.negocio.id, c))?.kind === "fun" : false;
      const v = rub === "fe" ? limpiarFe(p?.k, Math.round(Number(p?.price) * 100), p?.a, fun) : rub === "fiesta" ? limpiarFiesta(p?.k, cents, p?.a) : rub === "trans" ? limpiarTrans(p?.k, cents, p?.a) : rub === "noche" ? limpiarNoche(p?.k, cents, p?.a) : rub === "edu" || rub === "ninos" || rub === "dep" ? limpiarInsc(p?.k, cents, p?.a, rub) : limpiarSP(rub, p?.k, rub === "pro" && p?.k === "pct" ? Math.round(Number(p?.price) * 100) : cents, p?.a);
      if (!v.ok) return no(v.es, v.en);
      k = v.k; attrs = v.a; cents2 = v.cents;
      // Noche: la entrada sigue al cover de «Esta noche» (no tiene precio propio).
      if (rub === "noche" && k === "cover") cents2 = (await c.query<{ c: number }>(`select coalesce((select cover_cents from noche_settings where business_id = $1), 0) as c`, [a.negocio.id])).rows[0]!.c;
    } else if (cents < 0 || (!extra && cents === 0 && !Object.values(p?.hacen ?? {}).some((v) => (v ?? 0) > 0))) return no("Ponle precio.", "Set a price.");
    const dur = ent(p?.dur, 5, 480, 30), buf = extra ? 0 : [0, 5, 10, 15].includes(Number(p?.buf)) ? Number(p.buf) : 0;
    const foto = typeof p?.foto === "string" && /^(https?:\/\/|\/)[^\s"']{1,500}$/.test(p.foto) ? p.foto : null;
    // Opciones: hasta 3 grupos de 2 a 5 opciones; cada una cambia el precio (−$200 a +$500) y el tiempo (−120 a +240 min).
    const opts = extra ? [] : (Array.isArray(p?.opts) ? p.opts : []).slice(0, 3).map((g) => ({
      t: { es: txt(g?.t, 30), en: txt(g?.tEn, 30) },
      o: (Array.isArray(g?.o) ? g.o : []).slice(0, 5).map((o) => ({ n: { es: txt(o?.n, 30), en: txt(o?.nEn, 30) }, p: ent(Number(o?.p) * 100, -20000, 50000, 0), m: ent(o?.m, -120, 240, 0) })).filter((o) => o.n.es),
    })).filter((g) => g.t.es && g.o.length >= 2);
    // La categoría: una que ya existe, una nueva o «Extras».
    let sec: string | null = ID.test(String(p?.sec ?? "")) ? String(p.sec) : null;
    if (sec && !(await c.query(`select 1 from item_sections where id = $1 and business_id = $2 and module = 'svc' and removed_at is null`, [sec, a.negocio.id])).rowCount) sec = null;
    const nueva = txt(p?.newSec, 30);
    if (!sec && nueva) sec = (await c.query<{ id: string }>(`insert into item_sections (business_id, module, name, sort) values ($1, 'svc', $2::jsonb, (select coalesce(max(sort), -1) + 1 from item_sections where business_id = $1 and module = 'svc')) returning id::text`,
      [a.negocio.id, JSON.stringify({ es: nueva, en: nueva })])).rows[0]!.id;
    if (!sec) return no("Elige la categoría.", "Pick the category.");
    const vals = [a.negocio.id, sec, JSON.stringify({ es: name, en }), JSON.stringify({ es: desc, en: descEn }), cents2, dur, buf, !!p?.desde && !extra, JSON.stringify(opts), extra, foto ? [foto] : [], p?.visible !== false, k, JSON.stringify(attrs ?? {})];
    let id = itemId;
    if (itemId === "new") {
      id = (await c.query<{ id: string }>(
        `insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, buffer_min, price_from, svc_opts, is_extra, photos, sell, svc_kind, svc_attrs, sort)
         values ($1, 'svc', $2, $3::jsonb, $4::jsonb, $5, $6, $7, $8, $9::jsonb, $10, $11, $12, $13, $14::jsonb, (select coalesce(max(sort), -1) + 1 from items where business_id = $1 and module = 'svc')) returning id::text`, vals)).rows[0]!.id;
      nuevoId = id;
    } else {
      if (!ID.test(itemId)) return no("Ese servicio no existe.", "That service does not exist.");
      const u = await c.query(`update items set section_id = $2, name = $3::jsonb, descr = $4::jsonb, price_cents = $5, duration_min = $6, buffer_min = $7, price_from = $8, svc_opts = $9::jsonb, is_extra = $10, photos = $11, sell = $12,
                               svc_kind = coalesce($13, svc_kind), svc_attrs = case when $13::text is null then svc_attrs else $14::jsonb end, updated_at = now()
                               where id = $15 and business_id = $1 and module = 'svc' and removed_at is null and coalesce(svc_kind, '') not in ('renta', 'venta', 'auto')`, [...vals, itemId]); // una propiedad (4ib) se edita en Propiedades
      if (!u.rowCount) return no("Ese servicio ya no está.", "That service is gone.");
    }
    // Noche: el depósito de la mesa o del VIP (lo que se retiene al pedirla en 4nc). Lo demás, sin depósito.
    if (rub === "noche" || rub === "edu" || rub === "ninos" || rub === "dep") await c.query(`update items set deposit_cents = $3 where id = $2 and business_id = $1`, [a.negocio.id, id, attrs?.dep ?? 0]);
    // Iglesias (4ia): nunca un depósito (§3); el donativo es sugerido y se da en persona.
    if (rub === "fe") await c.query(`update items set deposit_cents = 0 where id = $2 and business_id = $1 and deposit_cents <> 0`, [a.negocio.id, id]);
    // Quién lo hace (y su precio, con sillas rentadas). Solo gente activa de este negocio.
    const gente = (await c.query<{ id: string }>(`select id::text from business_members where business_id = $1 and status = 'active'`, [a.negocio.id])).rows.map((x) => x.id);
    const hacen = Object.entries(p?.hacen ?? {}).filter(([k, v]) => UUID.test(k) && gente.includes(k) && v !== undefined);
    await c.query(`delete from staff_services where item_id = $1`, [id]); // tabla de relación (no historial): se reescribe entera
    for (const [k, v] of hacen) if (v !== -1) await c.query(`insert into staff_services (member_id, item_id, price_cents) values ($1, $2, $3)`, [k, id, v == null ? null : ent(Number(v) * 100, 0, 1_000_000, 0)]);
    await auditar(c, a, itemId === "new" ? "servicio.crear" : "servicio.editar", null, { servicio: name, precio: `$${(cents / 100).toFixed(2)}`, dura: `${dur} min` });
    return null;
  });
  return { ...r, id: nuevoId };
}
export async function servicioVisible(negocio: string, itemId: string, visible: boolean): Promise<Res> {
  return hacer(negocio, async (c, a) => {
    if (!ID.test(String(itemId))) return no("Ese servicio no existe.", "That service does not exist.");
    await c.query(`update items set sell = $3, updated_at = now() where id = $2 and business_id = $1 and module = 'svc' and coalesce(svc_kind, '') not in ('renta', 'venta', 'auto')`, [a.negocio.id, itemId, !!visible]);
    await auditar(c, a, visible ? "servicio.mostrar" : "servicio.ocultar", null, { servicio: itemId });
    return null;
  });
}
export async function servicioQuitar(negocio: string, itemId: string): Promise<Res> {
  return hacer(negocio, async (c, a) => {
    if (!ID.test(String(itemId))) return no("Ese servicio no existe.", "That service does not exist.");
    const r = await c.query<{ n: string }>(`update items set removed_at = now(), updated_at = now() where id = $2 and business_id = $1 and module = 'svc' and removed_at is null and coalesce(svc_kind, '') not in ('renta', 'venta', 'auto') returning name->>'es' as n`, [a.negocio.id, itemId]);
    if (r.rows[0]) await auditar(c, a, "servicio.quitar", { servicio: r.rows[0].n }, null);
    return null;
  });
}
export async function servicioMover(negocio: string, itemId: string, dir: number): Promise<Res> {
  return hacer(negocio, async (c, a) => {
    const L = (await c.query<{ id: string; sec: string | null; extra: boolean }>(`select id::text, section_id::text as sec, is_extra as extra from items where business_id = $1 and module = 'svc' and removed_at is null order by sort, id`, [a.negocio.id])).rows;
    const i = L.findIndex((x) => x.id === String(itemId));
    if (i < 0) return no("Ese servicio no existe.", "That service does not exist.");
    let j = i + (dir < 0 ? -1 : 1);
    while (j >= 0 && j < L.length && L[j]!.sec !== L[i]!.sec) j += dir < 0 ? -1 : 1;
    if (j < 0 || j >= L.length) return null;
    const a2 = L.slice(); [a2[i], a2[j]] = [a2[j]!, a2[i]!];
    for (let k = 0; k < a2.length; k++) await c.query(`update items set sort = $2 where id = $1`, [a2[k]!.id, k]);
    return null;
  });
}

/* ── Cómo trabaja el negocio ── */
export async function modeloGuardar(negocio: string, model: string, renta: number | null, comision: number | null): Promise<Res> {
  return hacer(negocio, async (c, a) => {
    if (!["emp", "comm", "chair"].includes(model)) return no("Elige cómo trabajas.", "Pick how you work.");
    const antes = (await c.query<{ m: string }>(`select svc_model as m from businesses where id = $1`, [a.negocio.id])).rows[0]?.m;
    await c.query(`update businesses set svc_model = $2, svc_rent_cents = $3, svc_comm_pct = $4, updated_at = now() where id = $1`,
      [a.negocio.id, model, model === "chair" && renta != null ? ent(Number(renta) * 100, 0, 500000, 0) : null, model === "comm" && comision != null ? ent(comision, 0, 100, 60) : null]);
    // Con sillas rentadas cada uno tiene su número de silla.
    if (model === "chair") await c.query(`update business_members m set chair_seat = x.n from (select id, row_number() over (order by (kind = 'owner') desc, sort, id) as n from business_members where business_id = $1 and status = 'active') x
                                          where m.id = x.id and m.chair_seat is null`, [a.negocio.id]);
    const L: Record<string, string> = { emp: "Empleados", comm: "A comisión", chair: "Rentan silla" };
    await auditar(c, a, "servicios.modelo", { modelo: L[antes ?? "emp"] }, { modelo: L[model] });
    return null;
  });
}

/* ── Reglas de citas del negocio ── */
export async function citasGuardar(negocio: string, p: { auto: boolean; resp: number; dep: number; cxh: number; pick: boolean }): Promise<Res> {
  return hacer(negocio, async (c, a) => {
    const resp = [15, 30, 60, 180].includes(Number(p?.resp)) ? Number(p.resp) : 30, cxh = [2, 4, 24, 72].includes(Number(p?.cxh)) ? Number(p.cxh) : 2;
    const dep = [0, 500, 1000, 2000, 5000].includes(Number(p?.dep)) ? Number(p.dep) : 0;
    await c.query(`insert into booking_policies (business_id, auto_approve, response_min, deposit_cents, cancel_free_h, staff_pick, updated_by, updated_at) values ($1, $2, $3, $4, $5, $6, $7, now())
                   on conflict (business_id) do update set auto_approve = $2, response_min = $3, deposit_cents = $4, cancel_free_h = $5, staff_pick = $6, updated_by = $7, updated_at = now()`,
      [a.negocio.id, !!p?.auto, resp, dep, cxh, p?.pick !== false, a.yo.id]);
    await auditar(c, a, "citas.reglas", null, { al_instante: p?.auto ? "sí" : "no", contesta_en: `${resp} min`, deposito: `$${dep / 100}`, cancelar_gratis: `${cxh} h` });
    return null;
  });
}
export async function citasModulo(negocio: string, on: boolean): Promise<Res> {
  return hacer(negocio, async (c, a) => {
    await c.query(`update businesses set modules_on = case when $2 then array(select distinct unnest(modules_on || array['citas'])) else array_remove(modules_on, 'citas') end, updated_at = now() where id = $1`, [a.negocio.id, !!on]);
    await auditar(c, a, on ? "citas.encender" : "citas.apagar", null, null);
    return null;
  });
}
/* Una silla: confirma al instante, cuánto tarda en contestar, depósito y si recibe citas («Sillas y agenda»). */
export async function sillaGuardar(negocio: string, miembro: string, p: { auto: boolean; resp: number; dep: number; recibe: boolean }): Promise<Res> {
  return hacer(negocio, async (c, a) => {
    if (!UUID.test(String(miembro))) return no("Esa silla no existe.", "That chair does not exist.");
    const resp = [15, 30, 60, 180].includes(Number(p?.resp)) ? Number(p.resp) : 30, dep = [0, 500, 1000, 1500, 2000].includes(Number(p?.dep)) ? Number(p.dep) : 0;
    const r = await c.query<{ n: string }>(`update business_members set chair_auto = $3, chair_response_min = $4, chair_deposit_cents = $5, takes_bookings = $6, updated_at = now()
                                           where id = $2 and business_id = $1 and status = 'active' returning display_name as n`, [a.negocio.id, miembro, !!p?.auto, resp, dep, p?.recibe !== false]);
    if (!r.rowCount) return no("Esa silla ya no está.", "That chair is gone.");
    await auditar(c, a, "citas.silla", null, { silla: r.rows[0]!.n, al_instante: p?.auto ? "sí" : "no", deposito: `$${dep / 100}` });
    return null;
  });
}

/* Pedirle a una silla rentada que conecte su cuenta de cobro (3d): le llega el aviso con el enlace. */
export async function sillaInvitarCobro(negocio: string, miembro: string): Promise<Res> {
  return hacer(negocio, async (c, a) => {
    const r = await invitarCobro(a.negocio.id, String(miembro ?? ""));
    if (!r.ok) return no(r.msg.es, r.msg.en);
    await auditar(c, a, "citas.silla.cobro", null, { silla: r.nombre ?? "", pedido: "Conectar su cuenta de cobro" });
    return null;
  });
}
