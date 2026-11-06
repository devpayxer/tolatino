import "server-only";
import { db } from "./db";
import { pasarela } from "./pagos/pasarela";

/* La cuenta de cobro propia de una silla rentada (Fase 3 · 3d). El dueño se lo pide desde Panel › Sillas; el barbero la
   conecta desde su cuenta de To'Latino (Stripe Express: sus datos y su banco los pone él en Stripe, To'Latino no los ve).
   Con la cuenta habilitada, su silla pide el depósito que él puso y el dinero llega a su banco. */
type Bi = { es: string; en: string };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export type ResS = { ok: true; url?: string } | { ok: false; msg: Bi };
const no = (es: string, en: string): ResS => ({ ok: false, msg: { es, en } });

/* El dueño (panel) pide a la silla que conecte su cuenta: aviso al barbero con el enlace a su página de cobros. */
export async function invitarCobro(negocio: string, miembro: string): Promise<ResS & { nombre?: string }> {
  if (!UUID.test(miembro)) return no("Esa silla no existe.", "That chair does not exist.");
  const m = (await db().query<{ uid: string | null; nombre: string; kind: string; negocio: string; on: boolean }>(
    `select m.user_id::text as uid, m.display_name as nombre, m.kind, b.name as negocio, coalesce(mp.charges_enabled, false) as on
       from business_members m join businesses b on b.id = m.business_id left join member_payout_accounts mp on mp.member_id = m.id
      where m.id = $1 and m.business_id = $2 and m.status = 'active'`, [miembro, negocio])).rows[0];
  if (!m || m.kind !== "renter") return no("Esa silla no es rentada.", "That chair is not rented.");
  if (m.on) return no(`${m.nombre.split(" ")[0]} ya tiene su cuenta de cobro conectada.`, `${m.nombre.split(" ")[0]} already has a payout account.`);
  if (!m.uid) return no(`${m.nombre.split(" ")[0]} todavía no entra a To'Latino. Invítalo desde Tu página › Equipo con su teléfono y luego vuelve aquí.`, `${m.nombre.split(" ")[0]} is not on To'Latino yet. Invite them from Your page › Team with their phone, then come back.`);
  await db().query(`update business_members set payout_invited_at = now(), updated_at = now() where id = $1`, [miembro]);
  const { avisar } = await import("./avisos");
  await avisar(m.uid, "silla_cobro", { negocio: m.negocio }, { href: `/cuenta/silla/${miembro}`, ref: ["member", miembro] });
  return { ok: true, nombre: m.nombre };
}

export type CobroSilla = { miembro: string; nombre: string; silla: number | null; negocio: { id: string; nombre: string }; dep: number; estado: "none" | "pending" | "restricted" | "enabled"; banco: string | null; pide: number };
/* La página del barbero: solo quien es esa silla. */
export async function cobroSilla(userId: string, miembro: string): Promise<CobroSilla | null> {
  if (!UUID.test(miembro)) return null;
  const r = (await db().query<{ nombre: string; silla: number | null; biz: string; bname: string; dep: number | null; estado: string | null; banco: string | null; pide: number | null }>(
    `select m.display_name as nombre, m.chair_seat as silla, b.id as biz, b.name as bname, m.chair_deposit_cents as dep, mp.status as estado, mp.bank_last4 as banco, jsonb_array_length(mp.requirements) as pide
       from business_members m join businesses b on b.id = m.business_id left join member_payout_accounts mp on mp.member_id = m.id
      where m.id = $1 and m.user_id = $2 and m.kind = 'renter' and m.status = 'active'`, [miembro, userId])).rows[0];
  if (!r) return null;
  return { miembro, nombre: r.nombre, silla: r.silla, negocio: { id: r.biz, nombre: r.bname }, dep: r.dep ?? 0, estado: (r.estado as CobroSilla["estado"]) ?? "none", banco: r.banco, pide: r.pide ?? 0 };
}

/* El barbero conecta (o termina de conectar) su cuenta: se crea si no existe y se abre el alta de Stripe. */
export async function conectarSilla(userId: string, miembro: string, origen: string): Promise<ResS> {
  const s = await cobroSilla(userId, miembro);
  if (!s) return no("Esa silla no es tuya.", "That chair is not yours.");
  if (pasarela.modo() === "apagado") return no("Los cobros con tarjeta no están disponibles todavía.", "Card payouts are not available yet.");
  let acct = (await db().query<{ a: string }>(`select stripe_account_id as a from member_payout_accounts where member_id = $1`, [miembro])).rows[0]?.a ?? null;
  if (!acct) {
    acct = await pasarela.cuentaCrear(`m-${miembro}`, `${s.nombre} · ${s.negocio.nombre}`, { mcc: "7230", meta: { business_id: s.negocio.id, member_id: miembro } });
    await db().query(`insert into member_payout_accounts (member_id, business_id, stripe_account_id, simulated) values ($1, $2, $3, $4) on conflict (member_id) do nothing`,
      [miembro, s.negocio.id, acct, acct.startsWith("acct_sim_")]);
    acct = (await db().query<{ a: string }>(`select stripe_account_id as a from member_payout_accounts where member_id = $1`, [miembro])).rows[0]!.a;
  }
  // Con Stripe de verdad, direcciones completas; el simulador vuelve dentro del sandbox (relativas).
  const base = pasarela.modo() === "stripe" ? origen : "";
  const url = await pasarela.cuentaEnlace(acct, `${base}/cuenta/silla/${miembro}?vuelta=1`, `${base}/cuenta/silla/${miembro}?otra=1`);
  return { ok: true, url };
}

/* Simulador del sandbox: completar el alta de la cuenta de la silla (solo el barbero de esa silla). */
export async function simularAltaSilla(userId: string, cuenta: string): Promise<string | null> {
  const m = /^acct_sim_m-([0-9a-f-]{36})$/.exec(cuenta);
  if (!m) return null;
  const s = await cobroSilla(userId, m[1]!);
  if (!s) return null;
  const u = await db().query(`update member_payout_accounts set status = 'enabled', charges_enabled = true, payouts_enabled = true, requirements = '[]'::jsonb, bank_last4 = '2468', updated_at = now()
                               where member_id = $1 and stripe_account_id = $2 and simulated and not charges_enabled`, [m[1], cuenta]);
  if (u.rowCount) {
    const { avisarNegocio } = await import("./avisos");
    await avisarNegocio(s.negocio.id, "biz_silla_cobro", { persona: s.nombre.split(" ")[0] ?? s.nombre }, { href: `/panel/${s.negocio.id}/vendes/sillas` });
  }
  return `/cuenta/silla/${m[1]}?vuelta=1`;
}
