import "server-only";
import { db, tx } from "./db";

/* Mis seguros (Mi cuenta, hueco #6 del plan fase4-salud-pro.md) y «Tu seguro» de la ficha de Salud (4i): el seguro de la
   persona para decirle en cada consultorio si lo aceptan y cuánto paga. Datos mínimos (REVISION 4h): tipo, aseguradora,
   plan y SOLO los últimos 4 del número de miembro; nunca historial médico. Quitar = removed_at (nada se borra). */
type Bi = { es: string; en: string };
export type Seguro = { id: string; kind: "medicaid" | "medicare" | "chip" | "priv" | "none"; insurer: string | null; plan: string | null; last4: string | null; para: "yo" | "hijo" | "otro"; principal: boolean; nombre: Bi };
export type OpcionesSeguro = { pub: { key: string; name: Bi; plans: { key: string; name: Bi }[] }[]; priv: { key: string; name: Bi }[] };
export type SeguroIn = { kind: string; plan?: string | null; num?: string | null; para?: string };

export async function opcionesSeguro(): Promise<OpcionesSeguro> {
  const r = (await db().query<{ key: string; kind: "pub" | "priv"; name: Bi; plans: { key: string; name: Bi }[] }>(`select key, kind, name, plans from insurers where state = 'PA' and not hidden order by sort, key`)).rows;
  return { pub: r.filter((x) => ["medicaid", "medicare", "chip"].includes(x.key)).map((x) => ({ key: x.key, name: x.name, plans: x.plans ?? [] })), priv: r.filter((x) => x.kind === "priv").map((x) => ({ key: x.key, name: x.name })) };
}

export async function misSeguros(userId: string): Promise<Seguro[]> {
  return (await db().query<Seguro>(
    `select u.id::text, u.kind, u.insurer, u.plan, u.member_last4 as last4, u.for_whom as para, u.is_default as principal,
            case when u.kind = 'none' then '{"es":"Sin seguro","en":"No insurance"}'::jsonb
                 when u.kind = 'priv' then coalesce(i.name, jsonb_build_object('es', u.insurer, 'en', u.insurer))
                 else jsonb_build_object('es', (i.name->>'es') || coalesce(' · ' || (select p->'name'->>'es' from jsonb_array_elements(i.plans) p where p->>'key' = u.plan), ''),
                                         'en', (i.name->>'en') || coalesce(' · ' || (select p->'name'->>'en' from jsonb_array_elements(i.plans) p where p->>'key' = u.plan), '')) end as nombre
       from user_insurances u left join insurers i on i.key = u.insurer
      where u.user_id = $1 and u.removed_at is null order by u.is_default desc, u.created_at desc limit 12`, [userId])).rows;
}

const NO = (es: string, en: string) => ({ ok: false as const, msg: { es, en } });
export async function guardarSeguro(userId: string, x: SeguroIn): Promise<{ ok: true; id: string } | { ok: false; msg: Bi }> {
  const kind = String(x?.kind ?? ""), para = ["yo", "hijo", "otro"].includes(String(x?.para)) ? String(x.para) : "yo";
  if (!["medicaid", "medicare", "chip", "priv", "none"].includes(kind)) return NO("Elige tu seguro.", "Pick your insurance.");
  const O = await opcionesSeguro();
  let insurer: string | null = null, plan: string | null = null;
  if (kind === "priv") {
    const k = String(x?.plan ?? "");
    if (!O.priv.some((p) => p.key === k)) return NO("Elige tu compañía de seguro.", "Pick your insurance company.");
    insurer = k;
  } else if (kind !== "none") {
    const P = O.pub.find((p) => p.key === kind);
    if (!P) return NO("Ese seguro ya no está en la lista.", "That insurance is no longer on the list.");
    insurer = kind;
    if (P.plans.length) { const k = String(x?.plan ?? ""); if (!P.plans.some((p) => p.key === k)) return NO("Elige tu plan.", "Pick your plan."); plan = k; }
  }
  // Del número de miembro solo se guardan los últimos 4 (lo justo para que el consultorio confirme cuál es).
  const n = typeof x?.num === "string" ? x.num.replace(/[^0-9A-Za-z]/g, "") : "";
  if (n && (n.length < 4 || n.length > 20)) return NO("El número de miembro tiene de 4 a 20 letras o números.", "The member ID has 4 to 20 letters or numbers.");
  const last4 = kind === "none" || !n ? null : n.slice(-4).toUpperCase();
  return tx(async (c) => {
    const vivos = (await c.query<{ n: number }>(`select count(*)::int as n from user_insurances where user_id = $1 and removed_at is null`, [userId])).rows[0]!.n;
    if (vivos >= 6) return NO("Ya tienes 6 seguros guardados. Quita uno para agregar otro.", "You already have 6 saved. Remove one to add another.");
    const dup = (await c.query<{ id: string }>(`select id::text from user_insurances where user_id = $1 and removed_at is null and kind = $2 and insurer is not distinct from $3 and plan is not distinct from $4 and for_whom = $5 and member_last4 is not distinct from $6`,
      [userId, kind, insurer, plan, para, last4])).rows[0];
    if (dup) return { ok: true as const, id: dup.id };
    // El primero (o uno nuevo para mí) queda como principal.
    const principal = vivos === 0;
    const id = (await c.query<{ id: string }>(`insert into user_insurances (user_id, kind, insurer, plan, member_last4, for_whom, is_default) values ($1, $2, $3, $4, $5, $6, $7) returning id::text`,
      [userId, kind, insurer, plan, last4, para, principal])).rows[0]!.id;
    return { ok: true as const, id };
  });
}

export async function seguroPrincipal(userId: string, id: string): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return false;
  return tx(async (c) => {
    const ok = (await c.query(`select 1 from user_insurances where id = $1::uuid and user_id = $2 and removed_at is null for update`, [id, userId])).rowCount;
    if (!ok) return false;
    await c.query(`update user_insurances set is_default = (id = $1::uuid) where user_id = $2 and removed_at is null`, [id, userId]);
    return true;
  });
}

export async function quitarSeguro(userId: string, id: string): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return false;
  return tx(async (c) => {
    const r = (await c.query<{ d: boolean }>(`update user_insurances set removed_at = now(), is_default = false where id = $1::uuid and user_id = $2 and removed_at is null returning (select is_default from user_insurances where id = $1::uuid) as d`, [id, userId])).rows[0];
    if (!r) return false;
    // Si era el principal, el más reciente que queda pasa a serlo.
    await c.query(`update user_insurances set is_default = true where id = (select id from user_insurances where user_id = $1 and removed_at is null order by created_at desc limit 1)
                     and not exists (select 1 from user_insurances where user_id = $1 and removed_at is null and is_default)`, [userId]);
    return true;
  });
}
