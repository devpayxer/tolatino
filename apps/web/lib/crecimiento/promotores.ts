import "server-only";
import type { PoolClient } from "pg";
import { randomInt } from "node:crypto";
import { auditar, type Staff } from "../admin";
import { avisar } from "../avisos";
import { valores } from "../config";
import { normalizarTelefono } from "../cuenta";
import { db, tx } from "../db";
import { bien, mal, type Res } from "./comun";

/* 9h · Promotores y códigos (prototipo secMkt «Promotores»: «Promotor = vecino que trae negocios. Gana $10 en Wallet por cada negocio publicado que llegue a
   5 pedidos o citas; el negocio recibe 30 días extra de prueba»). Lo que hoy era PROMO = { HZL30 } en publica/acciones.ts vive en promo_codes (0138).
   - Nombrar promotor: una persona con cuenta (su teléfono verificado), un código propio (letras de su nombre y dos números), mkt:editar, con motivo.
   - Publicar con el código: el negocio recibe los días de prueba del código; si es de un promotor queda su referido («traido»). El antiabuso de 5d:
     si el dueño ES el promotor o comparte dispositivo con él, queda «rechazado» (la prueba extra igual no se da: diasDePrueba lo mira antes).
   - Calificar (barrido): con promotor_operaciones pedidos o citas hechos, «calificado» y la recompensa anotada (promotor_recompensa_cents). El PAGO a la
     Wallet llega con el dinero real (9k): hasta entonces se ve «pendiente de pago». Nada se borra. */

const CODIGO = /^[A-Z0-9]{4,12}$/;
const enCiudad = (s: Staff, c: string) => !s.cities.length || s.cities.includes(c);

export type Codigo = { code: string; kind: "campana" | "promotor"; dias: number; promotor: string | null; ciudad: string | null };
/* Un código vivo (Publica tu negocio, F1). */
export async function codigoVivo(codigo: string): Promise<Codigo | null> {
  const k = String(codigo ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
  if (!CODIGO.test(k)) return null;
  return (await db().query<Codigo>(`select code, kind, trial_days as dias, promoter_user_id::text as promotor, city_id as ciudad from promo_codes where code = $1 and retired_at is null`, [k])).rows[0] ?? null;
}

/* ¿El dueño puede usar este código? (no el suyo propio ni el de alguien de su mismo dispositivo: antiabuso de 5d). */
export async function codigoPermitido(c: PoolClient, k: Codigo, dueno: string, dev: string | null): Promise<boolean> {
  if (k.kind !== "promotor" || !k.promotor) return true;
  if (k.promotor === dueno) return false;
  // pts_mismo_dispositivo(a, b, dev): a y b compartieron un teléfono, o b (el promotor) entró desde el teléfono de esta petición (dev, el del dueño).
  return !(await c.query<{ v: boolean }>(`select pts_mismo_dispositivo($1::uuid, $2::uuid, $3::uuid) as v`, [dueno, k.promotor, dev])).rows[0]?.v;
}

/* Dentro de la transacción de publicar: el referido del promotor (o su rechazo, con motivo). */
export async function anotarReferido(c: PoolClient, k: Codigo, negocio: string, ciudad: string, dueno: string, dev: string | null): Promise<void> {
  if (k.kind !== "promotor" || !k.promotor) return;
  const ok = await codigoPermitido(c, k, dueno, dev);
  await c.query(`insert into business_referrals (promoter_user_id, code, business_id, city_id, status, reason) values ($1, $2, $3, $4, $5, $6) on conflict (business_id) do nothing`,
    [k.promotor, k.code, negocio, ciudad, ok ? "traido" : "rechazado", ok ? null : "auto_referido"]);
}

/* Barrido: los negocios traídos que ya llegaron a promotor_operaciones pedidos o citas hechos pasan a «calificado» con su recompensa anotada. */
export async function calificarReferidos(): Promise<number> {
  const cfg = await valores("promotor_operaciones", "promotor_recompensa_cents");
  const r = await db().query(
    `update business_referrals r set status = 'calificado', qualified_at = now(), reward_cents = $2
      where r.id in (select x.id from business_referrals x where x.status = 'traido' order by x.at limit 500)
        and (select count(*) from (select 1 from operations o where o.business_id = r.business_id and o.status = 'done' and o.kind in ('order', 'market_order', 'appointment') limit $1) z) >= $1`,
    [cfg.promotor_operaciones, cfg.promotor_recompensa_cents]);
  return r.rowCount ?? 0;
}

/* ── El Super Admin ── */
export async function nombrarPromotor(s: Staff, p: { telefono: string; ciudad: string; motivo: string }): Promise<Res<{ code?: string }>> {
  if (!s.puede("mkt", "editar")) return mal("Tu rol no nombra promotores.", "Your role cannot name promoters.");
  const tel = normalizarTelefono(String(p.telefono ?? "")), m = String(p.motivo ?? "").replace(/\s+/g, " ").trim().slice(0, 300);
  if (!tel) return mal("Revisa el teléfono: son 10 números.", "Check the phone: 10 digits.");
  if (!enCiudad(s, p.ciudad)) return mal("Esa ciudad no es tuya.", "That city is not yours.");
  if (m.length < 3) return mal("Escribe el motivo.", "Write the reason.");
  const cfg = await valores("promotor_dias_prueba");
  const r = await tx(async (c) => {
    const u = (await c.query<{ id: string; nombre: string | null; ya: boolean }>(
      `select u.id::text, u.first_name as nombre, exists (select 1 from promo_codes k where k.promoter_user_id = u.id and k.retired_at is null) as ya
         from users u where u.phone = $1 and cuenta_estado(u.status, u.status_until) in ('active', 'muted')`, [tel])).rows[0];
    if (!u) return mal("Ese teléfono no tiene cuenta. La persona entra primero a To'Latino con su teléfono.", "That phone has no account. The person signs in to To'Latino with their phone first.");
    if (!u.nombre) return mal("Esa cuenta todavía no tiene nombre.", "That account has no name yet.");
    if (u.ya) return mal("Ya es promotor.", "Already a promoter.");
    const base = u.nombre.normalize("NFD").replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 6) || "TL";
    for (let i = 0; i < 8; i++) {
      const code = (base.length < 2 ? `${base}TL` : base) + String(randomInt(10, 100));
      const ok = await c.query(`insert into promo_codes (code, kind, city_id, promoter_user_id, trial_days, created_by) values ($1, 'promotor', $2, $3, $4, $5) on conflict (code) do nothing`,
        [code, p.ciudad, u.id, cfg.promotor_dias_prueba, s.id]);
      if (!ok.rowCount) continue;
      await c.query(`update users set is_promoter = true where id = $1`, [u.id]);
      await auditar(c, { actor: s.id, action: "mkt.promotor.nombrar", targetKind: "user", targetId: u.id, city: p.ciudad, after: { codigo: code, dias: cfg.promotor_dias_prueba }, reason: m });
      return { ok: true as const, msg: { es: `Listo: su código es ${code}.`, en: `Done: their code is ${code}.` }, code, uid: u.id };
    }
    return mal("No se pudo crear el código. Intenta otra vez.", "Could not create the code. Try again.");
  });
  if (r.ok && "uid" in r) await avisar(r.uid, "mkt_promotor", { codigo: r.code, dias: cfg.promotor_dias_prueba }, { href: "/publica" });
  return r.ok ? bien(r.msg.es, r.msg.en, { code: "code" in r ? r.code : undefined }) : r;
}

export async function retirarCodigo(s: Staff, code: string, motivo: string): Promise<Res> {
  if (!s.puede("mkt", "editar")) return mal("Tu rol no retira códigos.", "Your role cannot retire codes.");
  const k = String(code ?? "").toUpperCase(), m = String(motivo ?? "").replace(/\s+/g, " ").trim().slice(0, 300);
  if (!CODIGO.test(k)) return mal("Ese código no existe.", "That code does not exist.");
  if (m.length < 3) return mal("Escribe el motivo.", "Write the reason.");
  return tx(async (c) => {
    const x = (await c.query<{ city: string | null; uid: string | null; vivo: boolean }>(`select city_id as city, promoter_user_id::text as uid, retired_at is null as vivo from promo_codes where code = $1 for update`, [k])).rows[0];
    if (!x) return mal("Ese código no existe.", "That code does not exist.");
    if (x.city && !enCiudad(s, x.city)) return mal("Esa ciudad no es tuya.", "That city is not yours.");
    if (!x.city && s.cities.length) return mal("Ese código es de todas las ciudades: lo retira un Admin.", "That code is for all cities: an Admin retires it.");
    if (!x.vivo) return mal("Ya estaba retirado.", "It was already retired.");
    await c.query(`update promo_codes set retired_at = now(), retired_by = $2, retired_reason = $3 where code = $1`, [k, s.id, m]);
    if (x.uid) await c.query(`update users set is_promoter = exists (select 1 from promo_codes p where p.promoter_user_id = $1 and p.retired_at is null) where id = $1`, [x.uid]);
    await auditar(c, { actor: s.id, action: "mkt.codigo.retirar", targetKind: "promo_code", targetId: k, city: x.city, before: { vivo: true }, after: { vivo: false }, reason: m });
    return bien("Retirado: ya no da días de prueba. Lo traído queda en el historial.", "Retired: it no longer gives trial days. What it brought stays in the history.");
  });
}

export type PromotorAdm = { code: string; kind: "campana" | "promotor"; ciudad: string | null; dias: number; nombre: string | null; uid: string | null; vivo: boolean;
  traidos: number; calificados: number; pagados: number; rechazados: number; pendienteCents: number };
export async function promotoresAdmin(s: Staff, ciudad: string | null): Promise<PromotorAdm[]> {
  return (await db().query<PromotorAdm>(
    `select k.code, k.kind, k.city_id as ciudad, k.trial_days as dias, k.retired_at is null as vivo, k.promoter_user_id::text as uid,
            nullif(trim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')), '') as nombre,
            coalesce(r.traidos, 0) as traidos, coalesce(r.cal, 0) as calificados, coalesce(r.pag, 0) as pagados, coalesce(r.rech, 0) as rechazados, coalesce(r.pend, 0) as "pendienteCents"
       from promo_codes k left join users u on u.id = k.promoter_user_id
       left join lateral (select count(*) filter (where status <> 'rechazado')::int as traidos, count(*) filter (where status = 'calificado')::int as cal, count(*) filter (where status = 'pagado')::int as pag,
                                 count(*) filter (where status = 'rechazado')::int as rech, coalesce(sum(reward_cents) filter (where status = 'calificado'), 0)::int as pend
                            from business_referrals b where b.code = k.code) r on true
      where (cardinality($1::text[]) = 0 or k.city_id is null or k.city_id = any($1::text[])) and ($2::text is null or k.city_id is null or k.city_id = $2)
      order by k.retired_at is null desc, k.kind desc, k.created_at desc limit 200`, [s.cities, ciudad])).rows;
}
