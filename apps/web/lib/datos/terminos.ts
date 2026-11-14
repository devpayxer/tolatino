import "server-only";
import { db } from "../db";

/* 9d · Mi cuenta › Privacidad › Términos que aceptaste (L189) y Usuarios 360° › Privacidad: lo que la persona aceptó y QUEDÓ ANOTADO, con su
   versión y su fecha. Hoy se anotan: las reglas de la Comunidad (versión), la confirmación de ser mayor de edad para lo de adultos, los términos
   de un plan o membresía (plan_terms: la versión que aceptó) y la propuesta o el cambio de un evento privado. Los Términos de uso y la Privacidad
   con versión (legal_acceptances) llegan con 9e y se suman a esta misma lista. Nada se inventa: lo que no se anotó no sale aquí. */
type Bi = { es: string; en: string };
export type Aceptado = { k: string; t: Bi; s: Bi | null; at: string };
export async function terminosAceptados(userId: string): Promise<Aceptado[]> {
  const r = (await db().query<{ k: string; tipo: string; v: string | null; extra: string | null; at: string }>(
    `select 'reglas' as k, 'reglas' as tipo, rules_version::text as v, null as extra, to_char(rules_ok_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at
       from community_profiles where user_id = $1::uuid and rules_ok_at is not null
     union all
     select 'adultos', 'adultos', null, null, to_char(adult_ok_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') from community_profiles where user_id = $1::uuid and adult_ok_at is not null
     union all
     select 'plan-' || t.id, 'plan', t.version::text, b.name, to_char(t.accepted_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
       from plan_terms t join operations o on o.id = t.operation_id join businesses b on b.id = o.business_id where o.user_id = $1::uuid
     union all
     select 'evp-' || a.id, 'evp-' || a.kind, null, b.name, to_char(a.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
       from private_event_acceptances a join operations o on o.id = a.operation_id join businesses b on b.id = o.business_id where a.user_id = $1::uuid
     order by at desc limit 100`, [userId])).rows;
  return r.map((x) => {
    const t: Bi = x.tipo === "reglas" ? { es: "Reglas de la Comunidad", en: "Community rules" }
      : x.tipo === "adultos" ? { es: "Eres mayor de edad (lo de adultos en la Comunidad)", en: "You are of legal age (adult content in the Community)" }
      : x.tipo === "plan" ? { es: `Términos del plan con ${x.extra}`, en: `Plan terms with ${x.extra}` }
      : x.tipo === "evp-quote" ? { es: `Propuesta de un evento privado con ${x.extra}`, en: `Private event proposal with ${x.extra}` }
      : x.tipo === "evp-alt" ? { es: `Otra fecha para un evento privado con ${x.extra}`, en: `Another date for a private event with ${x.extra}` }
      : { es: `Cambio de un evento privado con ${x.extra}`, en: `Change to a private event with ${x.extra}` };
    return { k: x.k, t, s: x.v ? { es: `Versión ${x.v}`, en: `Version ${x.v}` } : null, at: x.at };
  });
}
