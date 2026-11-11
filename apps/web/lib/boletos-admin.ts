import "server-only";
import type { PoolClient } from "pg";
import { auditar, type Staff } from "./admin";
import { verificarFirma } from "./boletos-qr";
import { db, tx } from "./db";
import { pasesPronto } from "./pases/pronto";
import type { Bi } from "./evt-comun";

/* 6c · Super Admin › Eventos y boletos › Buscar boleto (ADM-EVT secEvt L1005–1056): por código humano (TL-XXX-0000), por el texto del QR
   (se verifica la firma Ed25519 con la llave pública), por orden (B-…), por teléfono o por nombre; boleto VÁLIDO · USADO · DEVUELTO ·
   ANULADO · REEMITIDO con Reenviar (aviso en la cuenta) · Reemitir (sube qr_ver: el QR viejo deja de entrar) · Anular con motivo.
   Cada acción con el boleto bloqueado, el motivo, la auditoría y el aviso a la persona; las ciudades del equipo limitan lo que se ve.
   El teléfono completo no sale: solo los últimos 4. */
const ID = /^\d{1,18}$/, COD = /^TL-[A-HJ-NP-Z2-9]{3}-[2-9]{4}$/, NUM = /^B-\d{1,10}$/;
export type FilaBoletoAdm = { tz: string; code: string; estado: string; evento: Bi; dia: string; tipo: Bi | null; mesa: Bi | null; quien: string; tel4: string | null; num: string; precio: number; ciudad: string };
const SEL = (mas = "") => `select c.timezone as tz, ${mas} t.code, t.status as estado, e.title as evento, d.local_date::text as dia, tt.name as tipo, et.zone as mesa,
                    coalesce(nullif(trim(coalesce(u.first_name, '') || ' ' || left(coalesce(u.last_name, ''), 1)), ''), case when t.kind = 'comp' then 'Cortesía · ' || t.comp_name end, 'Vecino') as quien, right(u.phone, 4) as tel4, o.number as num, t.price_cents as precio, c.name as ciudad
               from tickets t join operations o on o.id = t.operation_id join event_dates d on d.id = t.event_date_id join events e on e.id = t.event_id join cities c on c.id = t.city_id
               left join users u on u.id = t.holder_user_id left join ticket_types tt on tt.id = t.ticket_type_id left join event_tables et on et.id = t.table_id`;
const CIUDAD = `(cardinality($1::text[]) = 0 or t.city_id = any($1::text[]))`;

export type BusquedaBoleto = { filas: FilaBoletoAdm[]; qr: null | { firma: "valida" | "mala" | "formato" | "llave"; vigente: boolean | null; motivo: string } };
export async function buscarBoletosAdmin(s: Staff, q0: string): Promise<BusquedaBoleto> {
  const q = String(q0 ?? "").trim().slice(0, 200);
  if (!q) return { filas: [], qr: null };
  if (q.startsWith("TL1.")) {
    const v = await verificarFirma(q);
    if (!v.ok) return { filas: [], qr: { firma: v.motivo === "firma" ? "mala" : v.motivo, vigente: null, motivo: v.motivo === "firma" ? "La firma no coincide: este QR fue alterado o no lo hizo To'Latino. No entra." : v.motivo === "llave" ? "La llave de este QR no es de este entorno (o está retirada). No entra." : "No es un QR de boleto de To'Latino." } };
    // 6d · bol_vigente: válido y sin una transferencia pendiente (mientras se transfiere, ningún QR entra).
    const r = await db().query<FilaBoletoAdm & { ver: number; fid: string; admits: number; vig: boolean }>(`${SEL("t.qr_ver as ver, t.event_date_id::text as fid, t.admits, bol_vigente(t.id) as vig,")} where t.id = $2::bigint and ${CIUDAD}`, [s.cities, v.d.id]);
    const b = r.rows[0];
    const vigente = !!b && b.ver === v.d.ver && b.fid === v.d.fecha && b.admits === v.d.admits && b.vig;
    return { filas: b ? [b] : [], qr: { firma: "valida", vigente, motivo: !b ? "Firma buena, pero ese boleto no está en tus ciudades." : vigente ? "Firma buena y es la versión vigente del boleto: entra." : b.ver !== v.d.ver ? "Firma buena, pero es un QR viejo (el boleto se reemitió o se transfirió): no entra." : b.estado === "replaced" ? "Firma buena, pero el boleto se transfirió: este QR no entra." : b.estado !== "valid" ? "Firma buena, pero el boleto no está válido: no entra." : !b.vig ? "Firma buena, pero el boleto se está transfiriendo: no entra hasta que lo reciban o lo deshagan." : "Firma buena, pero no coincide con la fecha o las entradas del boleto." } };
  }
  const p: unknown[] = [s.cities];
  let w: string;
  if (COD.test(q.toUpperCase())) { p.push(q.toUpperCase()); w = `t.code = $2`; }
  else if (NUM.test(q.toUpperCase())) { p.push(q.toUpperCase()); w = `o.number = $2`; }
  else if (/^[\d\s()+.-]{7,}$/.test(q)) { const dg = q.replace(/\D/g, "").slice(-10); p.push(dg); w = `right(regexp_replace(u.phone, '\\D', '', 'g'), 10) = $2`; }
  else { p.push(`%${q.replace(/[%_]/g, "")}%`); w = `(u.first_name ilike $2 or t.holder_name ilike $2 or e.title->>'es' ilike $2)`; }
  return { filas: (await db().query<FilaBoletoAdm>(`${SEL()} where ${w} and ${CIUDAD} order by t.id desc limit 30`, p)).rows, qr: null };
}

export type BoletoAdm = FilaBoletoAdm & {
  eventoId: string; ver: number; admits: number; nombre: string | null; fee: number; descuento: number; motivo: string | null; pago: { estado: string; monto: number; comision: number; devuelto: number; tarjeta: string | null; simulado: boolean } | null;
  log: { kind: string; by: string; quien: string | null; reason: string | null; at: string }[]; orden: { kind: string; at: string; note: Bi | null }[]; hermanos: { code: string; estado: string }[];
  /* 6d · Historial: transferencias (a «••23», estado; nunca el teléfono), la devolución de este boleto, si es cortesía y si entra ahora. */
  kind: string; vigente: boolean; transferencias: { kind: string; estado: string; a: string; de: string; at: string; nuevo: string | null }[];
  devolucion: { monto: number; cargo: number; cede: number; por: string; estado: string; at: string } | null; reemplazo: string | null;
};
export async function boletoAdmin(s: Staff, code: string): Promise<BoletoAdm | null> {
  if (!COD.test(String(code))) return null;
  const b = (await db().query<BoletoAdm & { tid: string; op: string }>(
    `${SEL("t.id::text as tid, t.operation_id::text as op, t.event_id::text as \"eventoId\", t.qr_ver as ver, t.admits, coalesce(t.holder_name, t.comp_name) as nombre, t.fee_cents as fee, t.discount_cents as descuento, t.void_reason as motivo, t.kind, bol_vigente(t.id) as vigente, (select r.code from tickets r where r.id = t.replaced_by) as reemplazo,")}
      where t.code = $2 and ${CIUDAD}`, [s.cities, code])).rows[0];
  if (!b) return null;
  const [P, L, O, H, X, R] = await Promise.all([
    db().query<{ estado: string; monto: number; comision: number; devuelto: number; brand: string | null; l4: string | null; simulado: boolean }>(
      `select status as estado, amount_cents as monto, fee_cents as comision, refunded_cents as devuelto, card_brand as brand, card_last4 as l4, simulated as simulado from payments where operation_id = $1::bigint and kind = 'full'`, [b.op]),
    db().query<{ kind: string; by: string; quien: string | null; reason: string | null; at: string }>(
      `select l.kind, l.by_kind as by, nullif(trim(coalesce(u.first_name, '') || ' ' || left(coalesce(u.last_name, ''), 1)), '') as quien, l.reason, to_char(l.at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at
         from ticket_log l left join users u on u.id = l.by_user where l.ticket_id = $1::bigint order by l.at desc, l.id desc limit 30`, [b.tid]),
    db().query<{ kind: string; at: string; note: Bi | null }>(`select kind, to_char(at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at, note from operation_events where operation_id = $1::bigint order by id`, [b.op]),
    db().query<{ code: string; estado: string }>(`select code, status as estado from tickets where operation_id = $1::bigint order by id`, [b.op]),
    db().query<{ kind: string; estado: string; a: string; de: string; at: string; nuevo: string | null }>(
      `select x.kind, x.status as estado, '••' || x.to_last2 as a, coalesce(nullif(trim(coalesce(u.first_name, '') || ' ' || left(coalesce(u.last_name, ''), 1)), ''), 'Vecino') as de,
              to_char(x.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at, (select n.code from tickets n where n.id = x.new_ticket_id) as nuevo
         from ticket_transfers x join users u on u.id = x.from_user_id where x.ticket_id = $1::bigint or x.new_ticket_id = $1::bigint order by x.id`, [b.tid]),
    db().query<{ monto: number; cargo: number; cede: number; por: string; estado: string; at: string }>(
      `select l.amount_cents as monto, l.fee_kept_cents as cargo, l.fee_waived_cents as cede, r.initiated_by as por, r.status as estado, to_char(r.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at
         from ticket_refund_lines l join refunds r on r.id = l.refund_id where l.ticket_id = $1::bigint`, [b.tid]),
  ]);
  const p = P.rows[0];
  return { ...b, pago: p ? { estado: p.estado, monto: p.monto, comision: p.comision, devuelto: p.devuelto, tarjeta: p.brand && p.l4 ? `${p.brand.toUpperCase()} ·· ${p.l4}` : null, simulado: p.simulado } : null, log: L.rows, orden: O.rows, hermanos: H.rows,
    transferencias: X.rows, devolucion: R.rows[0] ?? null };
}

/* Reenviar · Reemitir · Anular (con motivo). Reemitir sube qr_ver (el QR viejo deja de entrar, en línea y sin conexión: la puerta compara la
   versión). Anular deja el boleto «void» con el motivo (no devuelve dinero: las devoluciones llegan con 6d/6e). */
export async function accionBoletoAdmin(s: Staff, code: string, paso: "reenviar" | "reemitir" | "anular", motivo: string): Promise<{ err?: string }> {
  if (!COD.test(String(code))) return { err: "Ese boleto no existe." };
  if (paso !== "reenviar" && !motivo) return { err: "Escribe el motivo." };
  let aviso: { uid: string; tpl: string; vars: Record<string, string>; num: string } | null = null;
  const r = await tx(async (c: PoolClient) => {
    const b = (await c.query<{ id: string; st: string; ver: number; uid: string | null; op: string; city: string; num: string; t: Bi }>(
      `select t.id::text, t.status as st, t.qr_ver as ver, t.holder_user_id::text as uid, t.operation_id::text as op, t.city_id as city, o.number as num, e.title as t
         from tickets t join operations o on o.id = t.operation_id join events e on e.id = t.event_id
        where t.code = $1 and (cardinality($2::text[]) = 0 or t.city_id = any($2::text[])) for update of t`, [code, s.cities])).rows[0];
    if (!b) return { err: "Ese boleto no existe." };
    if (paso !== "reenviar" && b.st !== "valid") return { err: "Solo un boleto válido se reemite o se anula." };
    if (paso === "reemitir") await c.query(`update tickets set qr_ver = qr_ver + 1 where id = $1::bigint`, [b.id]);
    if (paso === "anular") {
      await c.query(`update tickets set status = 'void', void_reason = $2 where id = $1::bigint`, [b.id, motivo.slice(0, 300)]);
      // 6d · Una transferencia pendiente de ese boleto se cae (ya no hay boleto que recibir).
      await c.query(`update ticket_transfers set status = 'cancelled', ended_at = now() where ticket_id = $1::bigint and status = 'pending'`, [b.id]);
    }
    await c.query(`insert into ticket_log (ticket_id, operation_id, city_id, kind, by_user, by_kind, reason) values ($1::bigint, $2::bigint, $3, $4, $5, 'staff', $6)`,
      [b.id, b.op, b.city, paso === "reenviar" ? "reenviado" : paso === "reemitir" ? "reemitido" : "anulado", s.id, motivo.slice(0, 300) || null]);
    const L = { reenviar: ["Boleto", "Reenviado a su cuenta"], reemitir: [`QR versión ${b.ver}`, `QR versión ${b.ver + 1} (el anterior ya no entra)`], anular: ["Válido", "Anulado"] }[paso];
    await auditar(c, { actor: s.id, action: `boleto.${paso}`, targetKind: "ticket", targetId: code, city: b.city, before: { boleto: L[0] }, after: { boleto: L[1] }, reason: motivo || "Reenviar boletos" });
    if (b.uid) aviso = { uid: b.uid, num: b.num, tpl: paso === "reenviar" ? "bol_reenviado" : paso === "reemitir" ? "bol_reemitido" : "bol_anulado", vars: { evento: b.t.es, codigo: code, motivo: motivo.slice(0, 200) } };
    return {};
  });
  // 8g · Reemitir o anular ya tocó el pase de Wallet en la transacción (trigger de 0129): que salga ya.
  if (paso !== "reenviar") pasesPronto();
  if (aviso) { const a = aviso as { uid: string; tpl: string; vars: Record<string, string>; num: string }; await (await import("./avisos")).avisar(a.uid, a.tpl, a.vars, { href: `/eventos/orden/${a.num}`, ref: ["tickets", a.num] }); }
  return r;
}

/* La ficha del evento en el Super Admin: VENDIDOS · BRUTO · COMISIÓN · DEVUELTOS y las últimas órdenes. */
export async function ventasEventoAdmin(eventoId: string) {
  if (!ID.test(eventoId)) return null;
  const [k, o] = await Promise.all([
    db().query<{ vendidos: number; bruto: number; comision: number; devuelto: number; ordenes: number; cortesias: number; transferidos: number; espera: number; cancelados: number }>(
      `select (select count(*)::int from tickets where event_id = $1::bigint and status in ('valid', 'used') and kind = 'paid') as vendidos,
              -- 6d · Cortesías vivas, transferencias recibidas, personas en lista de espera y boletos devueltos.
              (select count(*)::int from tickets where event_id = $1::bigint and status in ('valid', 'used') and kind = 'comp') as cortesias,
              (select count(*)::int from ticket_transfers x join tickets t on t.id = x.ticket_id where t.event_id = $1::bigint and x.kind = 'transfer' and x.status = 'claimed') as transferidos,
              (select count(*)::int from waitlist w where w.event_id = $1::bigint and w.status in ('waiting', 'offered')) as espera,
              (select count(*)::int from tickets where event_id = $1::bigint and status = 'refunded') as cancelados,
              coalesce(sum(p.amount_cents), 0)::int as bruto, coalesce(sum(p.fee_cents), 0)::int as comision, coalesce(sum(p.refunded_cents), 0)::int as devuelto, count(o.id)::int as ordenes
         from operations o join payments p on p.operation_id = o.id and p.kind = 'full' and p.status in ('captured', 'partially_refunded', 'refunded')
        where o.kind = 'tickets' and (o.details->>'event_id')::bigint = $1::bigint`, [eventoId]),
    db().query<{ num: string; quien: string; total: number; at: string; n: number; code: string; tz: string }>(
      `select o.number as num, coalesce(nullif(trim(coalesce(u.first_name, '') || ' ' || left(coalesce(u.last_name, ''), 1)), ''), 'Vecino') as quien, o.total_cents as total,
              to_char(o.sent_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at, (select count(*)::int from tickets t where t.operation_id = o.id) as n,
              (select min(t.code) from tickets t where t.operation_id = o.id) as code, (select timezone from cities where id = o.city_id) as tz
         from operations o join users u on u.id = o.user_id where o.kind = 'tickets' and o.pay_mode = 'app' and (o.details->>'event_id')::bigint = $1::bigint and o.status = 'confirmed' order by o.id desc limit 20`, [eventoId]),
  ]);
  return { kpi: k.rows[0]!, ordenes: o.rows };
}
/* KPI de la cabecera: BOLETOS EMITIDOS · BRUTO BOLETOS (en las ciudades del equipo). */
export async function kpiBoletosAdmin(s: Staff) {
  return (await db().query<{ emitidos: number; bruto: number }>(
    `select (select count(*)::int from tickets t where t.status in ('valid', 'used') and ${CIUDAD}) as emitidos,
            (select coalesce(sum(p.amount_cents - p.refunded_cents), 0)::int from payments p join operations o on o.id = p.operation_id
              where o.kind = 'tickets' and p.status in ('captured', 'partially_refunded') and (cardinality($1::text[]) = 0 or o.city_id = any($1::text[]))) as bruto`, [s.cities])).rows[0]!;
}
