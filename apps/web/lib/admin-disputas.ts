import "server-only";
import type { Staff } from "./admin";
import { db } from "./db";
import { MOTIVO } from "./disputas";

/* 9k · Super Admin › Transacciones › Disputas (L357, L393): la cola de 120 h con su evidencia. Cada disputa con su plazo del banco, si ya se mandaron los
   archivos (recibo, conversación, constancia de entrega) y el caso de Colas donde se responde. Cifras del día; lista paginada por id (la más nueva primero; «Vencen pronto» separa lo urgente) («antes de»), solo
   tus ciudades. Todo de lectura: responder y aceptar están en la cola (decidirDisputa, con tx:aprobar). */
export type FiltroDisp = "abiertas" | "vencen" | "revisa" | "cerradas";
export type FilaDisp = { id: string; num: string | null; negocio: string | null; nombre: string | null; monto: number; motivo: string; estado: string; due: string | null; horas: number | null;
  archivos: number; enviados: number; caso: string | null; sim: boolean };
const CIUD = "(cardinality($1::text[]) = 0 or d.city_id = any($1::text[]))";
export async function datosDisputas(s: Staff, f: FiltroDisp, antes: string | null) {
  const W: Record<FiltroDisp, string> = {
    abiertas: "d.status = 'needs_response'",
    vencen: "d.status = 'needs_response' and d.evidence_due_by < now() + make_interval(days => cfg_int('disputa_alerta_dias'))",
    revisa: "d.status = 'under_review'",
    cerradas: "d.status in ('won', 'lost', 'accepted')",
  };
  const [K, L] = await Promise.all([
    db().query<{ abiertas: number; vencen: number; revisa: number; ganadas: number; perdidas: number }>(
      `select count(*) filter (where d.status = 'needs_response')::int as abiertas,
              count(*) filter (where d.status = 'needs_response' and d.evidence_due_by < now() + make_interval(days => cfg_int('disputa_alerta_dias')))::int as vencen,
              count(*) filter (where d.status = 'under_review')::int as revisa,
              count(*) filter (where d.status = 'won' and d.closed_at > now() - interval '90 days')::int as ganadas,
              count(*) filter (where d.status in ('lost', 'accepted') and d.closed_at > now() - interval '90 days')::int as perdidas
         from disputes d where ${CIUD}`, [s.cities]),
    db().query<FilaDisp>(
      `select d.id::text, o.number as num, d.business_id as negocio, b.name as nombre, d.amount_cents as monto, d.reason as motivo, d.status as estado, d.simulated as sim,
              to_char(d.evidence_due_by at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as due,
              case when d.evidence_due_by is null then null else floor(extract(epoch from d.evidence_due_by - now()) / 3600)::int end as horas,
              (select count(*)::int from dispute_evidence e where e.dispute_id = d.id) as archivos, (select count(*)::int from dispute_evidence e where e.dispute_id = d.id and e.sent_at is not null) as enviados,
              (select q.id::text from queue_items q where q.queue = 'disputa' and q.subject_id = d.id::text order by (q.status = 'open') desc, q.id desc limit 1) as caso
         from disputes d left join operations o on o.id = d.operation_id left join businesses b on b.id = d.business_id
        where ${CIUD} and ${W[f]} and ($2::bigint is null or d.id < $2::bigint)
        order by d.id desc limit 31`, [s.cities, antes]),
  ]);
  const filas = L.rows.slice(0, 30).map((x) => ({ ...x, motivo: MOTIVO[x.motivo]?.es ?? MOTIVO.general!.es }));
  return { kpi: K.rows[0]!, filas, sigue: L.rows.length > 30 ? filas[filas.length - 1]!.id : null, puedeDinero: s.puede("tx", "aprobar") };
}
export type DatosDisputas = Awaited<ReturnType<typeof datosDisputas>>;
