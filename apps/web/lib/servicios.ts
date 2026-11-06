import "server-only";
import { db } from "./db";

/* Servicios y reglas de citas (Fase 3 · 3a). Los servicios son `items` con module 'svc' (como el menú): categoría en
   item_sections, duración, tiempo entre citas (el cliente no lo ve), «desde · varía», opciones que cambian precio y
   tiempo (máx. 3 grupos) y extras. Quién hace cada uno (y su precio en una silla rentada) va en staff_services.
   El negocio trabaja con empleados, a comisión o renta sillas; las reglas de citas son del negocio y, si renta sillas,
   cada silla decide si confirma al instante, cuánto tarda en contestar y el depósito. */
export type Bi = { es: string; en: string };
export type OpcionSvc = { t: Bi; o: { n: Bi; p: number; m: number }[] };
export type Servicio = {
  id: string; sec: string | null; name: Bi; desc: Bi; cents: number; dur: number; buf: number; desde: boolean; opts: OpcionSvc[];
  extra: boolean; foto: string | null; oculto: boolean; adm: string | null; sort: number; hacen: { id: string; cents: number | null }[];
};
export type Persona = { id: string; nombre: string; kind: "owner" | "staff" | "renter"; silla: number | null; auto: boolean; resp: number | null; dep: number | null; recibe: boolean; mostrar: boolean; foto: string | null;
  cobro: "none" | "pending" | "restricted" | "enabled"; banco: string | null; invitado: boolean; usuario: boolean }; // cuenta de cobro propia (sillas rentadas, 3d)
export type Politica = { auto: boolean; resp: number; dep: number; cxh: number; tol: number; pick: boolean; exp: number };
export type SvcPanel = {
  model: "emp" | "comm" | "chair"; rent: number | null; comm: number | null;
  secciones: { id: string; name: Bi; sort: number }[]; servicios: Servicio[]; gente: Persona[]; pol: Politica;
  on: boolean; off: { svc: string | null; citas: string | null };
};
export const POL_DEF: Politica = { auto: false, resp: 30, dep: 0, cxh: 2, tol: 15, pick: true, exp: 2 };

export async function serviciosPanel(negocio: string): Promise<SvcPanel> {
  const [b, S, I, H, G, P] = await Promise.all([
    db().query<{ model: SvcPanel["model"]; rent: number | null; comm: number | null; mods: string[]; off: Record<string, { reason?: string }> | null }>(
      `select svc_model as model, svc_rent_cents as rent, svc_comm_pct as comm, modules_on as mods, modules_off as off from businesses where id = $1`, [negocio]),
    db().query<{ id: string; name: Bi; sort: number }>(`select id::text, name, sort from item_sections where business_id = $1 and module = 'svc' and removed_at is null order by sort, id`, [negocio]),
    db().query<Omit<Servicio, "hacen">>(
      `select i.id::text, i.section_id::text as sec, i.name, coalesce(i.descr, '{"es":"","en":""}'::jsonb) as desc, i.price_cents as cents, coalesce(i.duration_min, 30) as dur, i.buffer_min as buf,
              i.price_from as desde, i.svc_opts as opts, i.is_extra as extra, i.photos[1] as foto, not i.sell as oculto, case when i.status = 'hidden' then coalesce(i.hidden_reason, '') end as adm, i.sort
         from items i where i.business_id = $1 and i.module = 'svc' and i.removed_at is null order by i.is_extra, i.sort, i.id`, [negocio]),
    db().query<{ item: string; member: string; cents: number | null }>(
      `select s.item_id::text as item, s.member_id::text as member, s.price_cents as cents from staff_services s join items i on i.id = s.item_id where i.business_id = $1`, [negocio]),
    db().query<Persona>(
      `select m.id::text, m.display_name as nombre, m.kind, m.chair_seat as silla, m.chair_auto as auto, m.chair_response_min as resp, m.chair_deposit_cents as dep,
              m.takes_bookings as recibe, m.show_on_page and m.hidden_by_admin is null as mostrar, m.photo_url as foto,
              coalesce(mp.status, 'none') as cobro, mp.bank_last4 as banco, m.payout_invited_at is not null as invitado, m.user_id is not null as usuario
         from business_members m left join member_payout_accounts mp on mp.member_id = m.id where m.business_id = $1 and m.status = 'active' order by (m.kind = 'owner') desc, m.chair_seat nulls last, m.sort, m.id`, [negocio]),
    db().query<{ auto: boolean; resp: number; dep: number; cxh: number; tol: number; pick: boolean; exp: number }>(
      `select auto_approve as auto, response_min as resp, deposit_cents as dep, cancel_free_h as cxh, tolerance_min as tol, staff_pick as pick, expires_h as exp from booking_policies where business_id = $1`, [negocio]),
  ]);
  const x = b.rows[0]!, off = x.off ?? {};
  return {
    model: x.model, rent: x.rent, comm: x.comm, secciones: S.rows,
    servicios: I.rows.map((s) => ({ ...s, hacen: H.rows.filter((h) => h.item === s.id).map((h) => ({ id: h.member, cents: h.cents })) })),
    gente: G.rows, pol: P.rows[0] ?? POL_DEF, on: (x.mods ?? []).includes("citas"),
    off: { svc: off.svc ? off.svc.reason ?? "" : null, citas: off.citas ? off.citas.reason ?? "" : null },
  };
}

/* Duración y precio con las opciones elegidas (el cliente lo ve; el tiempo entre citas no). */
export function conOpciones(s: Pick<Servicio, "cents" | "dur" | "opts">, elegidas: Record<number, number>) {
  let c = s.cents, m = s.dur;
  s.opts.forEach((g, gi) => { const o = g.o[elegidas[gi] ?? -1]; if (o) { c += o.p; m += o.m; } });
  return { cents: Math.max(0, c), dur: Math.max(5, m) };
}
