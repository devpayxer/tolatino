import "server-only";
import { valores } from "./config";
import { db, tx } from "./db";
import { diaCorto, hora, type Bi } from "./evt-comun";

/* 6d · Lista de espera de una fecha con boletos (fase6-eventos.md §4 6d; prototipo lsVals «lista de espera con oferta de 30 min»).
   - En orden de llegada (created_at, que la base no deja cambiar): cuando se libera un lugar (alguien cancela, el organizador devuelve,
     un apartado vence o sube la cantidad), la PRIMERA persona de la fila cuyo grupo cabe recibe una oferta: un apartado a su nombre
     (ticket_holds con waitlist_id) por espera_oferta_min (Configuración). Si su grupo no cabe en lo que se liberó, sigue primera y el
     lugar pasa a la siguiente que cabe. Solo ella puede pagarlo (el apartado es de su cuenta); vencido no se vuelve a apartar: pasa a la
     siguiente (barrerEspera, cada minuto).
   - Mientras haya fila, lo que se libera es primero para la fila: ofrecer() corre antes de que alguien aparte y antes de mostrar lo que queda.
   - Un candado por fecha (pg_advisory_xact_lock) hace que dos procesos nunca ofrezcan el mismo lugar ni salten a nadie. */
const ID = /^\d{1,18}$/;
type Res<T = object> = ({ ok: true } & T) | { ok: false; msg: Bi };
const falla = (es: string, en: string): { ok: false; msg: Bi } => ({ ok: false, msg: { es, en } });

export async function hayFila(fecha: string): Promise<boolean> {
  return !!(await db().query(`select 1 from waitlist where event_date_id = $1::bigint and status = 'waiting' limit 1`, [fecha])).rowCount;
}

/* Ofrecer lo libre a la fila, en orden. Devuelve cuántas ofertas hizo. */
export async function ofrecer(fecha: string): Promise<number> {
  if (!ID.test(String(fecha))) return 0;
  if (!(await hayFila(fecha))) return 0;
  const { filaVenta, estadoDe, entradasDe } = await import("./boletos");
  const cfg = await valores("espera_oferta_min", "evt_boletos_persona_fecha_max");
  const hechas = await tx(async (c) => {
    await c.query(`select pg_advisory_xact_lock(hashtext('espera:' || $1))`, [fecha]);
    const v = await filaVenta(c, fecha);
    if (!v || estadoDe(v) !== "abierta") return [];
    const W = (await c.query<{ id: string; uid: string; party: number }>(
      `select id::text, user_id::text as uid, party from waitlist where event_date_id = $1::bigint and status = 'waiting' order by created_at, waitlist.id limit 200`, [fecha])).rows;
    const out: { wid: string; uid: string; hold: string; title: Bi; dia: string; h0: number }[] = [];
    for (const w of W) {
      const T = (await c.query<{ id: string; p: number; n: Bi; quedan: number }>(
        `select t.id::text, t.price_cents as p, t.name as n, (s.quantity - s.sold_n - s.held_n)::int as quedan from ticket_types t join ticket_stock s on s.ticket_type_id = t.id and s.event_date_id = $2::bigint
          where t.event_id = $1::bigint and not t.off and (t.sales_end_at is null or t.sales_end_at > now()) order by t.sort, t.id`, [v.eid, fecha])).rows;
      if (!T.some((x) => x.quedan > 0)) break;
      const t = T.find((x) => x.quedan >= w.party);
      if (!t) continue; // su grupo no cabe: sigue primera; el lugar pasa a quien cabe
      const maxP = Math.min(cfg.evt_boletos_persona_fecha_max, v.mpp ?? 1000);
      if ((await entradasDe(c, fecha, w.uid, null, null, null)) + w.party > maxP) continue;
      const u = await c.query(`update ticket_stock set held_n = held_n + $3, updated_at = now() where ticket_type_id = $1::bigint and event_date_id = $2::bigint and sold_n + held_n + $3 <= quantity`, [t.id, fecha, w.party]);
      if (!u.rowCount) continue;
      const lines = [{ k: "t", id: t.id, q: w.party, unit: t.p, n: t.n }];
      const h = (await c.query<{ id: string; vence: string }>(
        `insert into ticket_holds (user_id, device, event_id, event_date_id, city_id, lines, subtotal_cents, discount_cents, total_cents, tickets_n, admits_n, expires_at, waitlist_id)
         values ($1, null, $2::bigint, $3::bigint, $4, $5::jsonb, $6, 0, $6, $7, $7, now() + make_interval(mins => $8::int), $9::bigint) returning id::text, expires_at::text as vence`,
        [w.uid, v.eid, fecha, v.city, JSON.stringify(lines), t.p * w.party, w.party, cfg.espera_oferta_min, w.id])).rows[0]!;
      await c.query(`update waitlist set status = 'offered', hold_id = $2::uuid, offered_at = now(), offer_expires_at = $3::timestamptz where id = $1::bigint and status = 'waiting'`, [w.id, h.id, h.vence]);
      out.push({ wid: w.id, uid: w.uid, hold: h.id, title: v.title, dia: v.ldate, h0: v.h0 });
    }
    return out;
  });
  if (hechas.length) {
    const { avisar } = await import("./avisos");
    const base = (await import("./correo")).BASE_URL();
    for (const o of hechas) await avisar(o.uid, "espera_lugar", { evento: o.title.es, cuando: `${diaCorto(o.dia, true)} · ${hora(o.h0)}`, min: cfg.espera_oferta_min, enlace: `${base}/eventos/pagar/${o.hold}` },
      { href: `/eventos/pagar/${o.hold}`, ref: ["waitlist", o.wid] });
  }
  return hechas.length;
}

/* Barrido: las ofertas que vencieron (o se soltaron) cierran y la fila avanza; las fechas con fila reciben lo que se liberó. */
export async function barrerEspera(): Promise<number> {
  const { vencerApartados } = await import("./boletos");
  const L = (await db().query<{ id: string; uid: string; fid: string; hst: string; vencido: boolean; title: Bi }>(
    `select w.id::text, w.user_id::text as uid, w.event_date_id::text as fid, h.status as hst, h.expires_at <= now() as vencido, e.title
       from waitlist w join ticket_holds h on h.id = w.hold_id join events e on e.id = w.event_id
      where w.status = 'offered' and (h.status <> 'held' or h.expires_at <= now()) order by w.offer_expires_at limit 200`)).rows;
  const fechas = new Set<string>();
  for (const w of L) {
    if (w.hst === "held") await vencerApartados({ fecha: w.fid });
    const st = w.hst === "converted" ? "converted" : w.hst === "released" ? "left" : "expired";
    const u = await db().query(`update waitlist set status = $2 where id = $1::bigint and status = 'offered'`, [w.id, st]);
    if (u.rowCount && st === "expired") await (await import("./avisos")).avisar(w.uid, "espera_vence", { evento: w.title.es }, { ref: ["waitlist", w.id] });
    fechas.add(w.fid);
  }
  for (const r of (await db().query<{ fid: string }>(`select distinct event_date_id::text as fid from waitlist where status = 'waiting' limit 100`)).rows) fechas.add(r.fid);
  let n = 0;
  for (const f of fechas) n += await ofrecer(f).catch(() => 0);
  return n;
}

/* ── La persona ── */
export type MiEspera = { estado: "waiting" | "offered"; pos: number; party: number; apartado: string | null; seg: number } | null;
export async function miEspera(userId: string | null, fecha: string): Promise<MiEspera> {
  if (!userId || !ID.test(String(fecha))) return null;
  const r = (await db().query<{ st: "waiting" | "offered"; pos: number; party: number; hold: string | null; seg: number }>(
    `select w.status as st, w.party, w.hold_id::text as hold, greatest(0, extract(epoch from coalesce(w.offer_expires_at, now()) - now()))::int as seg,
            (select count(*)::int from waitlist z where z.event_date_id = w.event_date_id and z.status = 'waiting' and (z.created_at, z.id) <= (w.created_at, w.id)) as pos
       from waitlist w where w.event_date_id = $1::bigint and w.user_id = $2 and w.status in ('waiting', 'offered')`, [fecha, userId])).rows[0];
  return r ? { estado: r.st, pos: r.pos, party: r.party, apartado: r.st === "offered" ? r.hold : null, seg: r.seg } : null;
}

/* Anotarse: solo en una fecha a la venta que se agotó (o que ya tiene fila); una vez por fecha; el grupo hasta el tope por orden y por persona. */
export async function anotar(userId: string, fecha: string, partyRaw: unknown): Promise<Res<{ pos: number }>> {
  if (!ID.test(String(fecha))) return falla("Esa fecha no existe.", "That date does not exist.");
  const party = Math.floor(Number(partyRaw));
  const cfg = await valores("evt_boletos_por_orden_max", "evt_boletos_persona_fecha_max");
  const { filaVenta, estadoDe, vencerApartados } = await import("./boletos");
  await vencerApartados({ fecha });
  const v = await filaVenta(db(), fecha);
  if (!v || estadoDe(v) !== "abierta") return falla("Esta fecha no está a la venta.", "This date is not on sale.");
  const maxP = Math.min(cfg.evt_boletos_por_orden_max, cfg.evt_boletos_persona_fecha_max, v.mpp ?? 1000);
  if (!(party >= 1 && party <= maxP)) return falla(`De 1 a ${maxP} personas.`, `1 to ${maxP} people.`);
  const libres = (await db().query<{ n: number }>(`select coalesce(max(s.quantity - s.sold_n - s.held_n), 0)::int as n from ticket_types t join ticket_stock s on s.ticket_type_id = t.id and s.event_date_id = $2::bigint
                                                   where t.event_id = $1::bigint and not t.off and (t.sales_end_at is null or t.sales_end_at > now())`, [v.eid, fecha])).rows[0]!.n;
  if (libres > 0 && !(await hayFila(fecha))) return falla("Todavía quedan boletos: cómpralos directo.", "There are tickets left: buy them directly.");
  const r = await db().query<{ id: string }>(
    `insert into waitlist (event_date_id, event_id, city_id, user_id, party) values ($1::bigint, $2::bigint, $3, $4, $5) on conflict (event_date_id, user_id) where status in ('waiting', 'offered') do nothing returning id::text`,
    [fecha, v.eid, v.city, userId, party]);
  if (!r.rowCount) return falla("Ya estás en la lista de esta fecha.", "You are already on this date's list.");
  await ofrecer(fecha).catch(() => 0);
  const m = await miEspera(userId, fecha);
  return { ok: true, pos: m?.pos ?? 0 };
}

/* «Salir de la lista» (o soltar la oferta): el lugar ofrecido vuelve y pasa a la siguiente. */
export async function salir(userId: string, fecha: string): Promise<Res> {
  if (!ID.test(String(fecha))) return falla("Esa fecha no existe.", "That date does not exist.");
  const w = (await db().query<{ id: string; st: string; hold: string | null }>(`select id::text, status as st, hold_id::text as hold from waitlist where event_date_id = $1::bigint and user_id = $2 and status in ('waiting', 'offered')`, [fecha, userId])).rows[0];
  if (!w) return falla("Ya no estás en la lista.", "You are no longer on the list.");
  if (w.hold) await (await import("./boletos")).soltarApartado(userId, w.hold);
  await db().query(`update waitlist set status = 'left' where id = $1::bigint and status in ('waiting', 'offered')`, [w.id]);
  await ofrecer(fecha).catch(() => 0);
  return { ok: true };
}

/* ── El panel: LISTA DE ESPERA · N (nombre + inicial, cuántos, estado) y «Avisar a la lista» solo si hay lugar ── */
export type EsperaPanel = { fecha: string | null; esperan: number; personas: number; ofertas: number; compraron: number; libres: number;
  filas: { quien: string; party: number; estado: string; pos: number | null; at: string }[] };
export async function esperaPanel(negocio: string, eventoId: string, fechaVer: string | null = null): Promise<EsperaPanel | null> {
  if (!ID.test(eventoId)) return null;
  // 6f · La fecha que se ve en una serie; en varios días, el ancla (la lista de espera vive donde vive la existencia).
  const d = (await db().query<{ fid: string; eid: string }>(`select d.id::text as fid, e.id::text as eid from events e join event_dates d on d.event_id = e.id where e.id = $1::bigint and e.business_id = $2 and e.entry = 'tickets'
                                                              and d.status <> 'skipped' and (e.kind <> 'span' or d.id = evt_ancla(e.id))
                                                              order by (d.id = $3::bigint) desc, (d.ends_at > now()) desc, d.starts_at limit 1`, [eventoId, negocio, fechaVer && ID.test(fechaVer) ? fechaVer : null])).rows[0];
  if (!d) return null;
  const [F, L] = await Promise.all([
    db().query<{ quien: string; party: number; estado: string; pos: number | null; at: string }>(
      `select coalesce(nullif(trim(coalesce(u.first_name, '') || ' ' || left(coalesce(u.last_name, ''), 1)), ''), 'Vecino') as quien, w.party, w.status as estado,
              case when w.status = 'waiting' then row_number() over (partition by w.status order by w.created_at, w.id)::int end as pos,
              to_char(w.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at
         from waitlist w join users u on u.id = w.user_id where w.event_date_id = $1::bigint order by (w.status in ('waiting', 'offered')) desc, w.created_at, w.id limit 100`, [d.fid]),
    db().query<{ n: number }>(`select coalesce(sum(greatest(0, s.quantity - s.sold_n - s.held_n)), 0)::int as n from ticket_stock s join ticket_types t on t.id = s.ticket_type_id where s.event_date_id = $1::bigint and not t.off`, [d.fid]),
  ]);
  const vivos = F.rows.filter((x) => x.estado === "waiting");
  return { fecha: d.fid, esperan: vivos.length, personas: vivos.reduce((s, x) => s + x.party, 0), ofertas: F.rows.filter((x) => x.estado === "offered").length,
    compraron: F.rows.filter((x) => x.estado === "converted").length, libres: L.rows[0]!.n, filas: F.rows };
}
export async function avisarLista(negocio: string, eventoId: string): Promise<Res<{ n: number }>> {
  const p = await esperaPanel(negocio, eventoId);
  if (!p?.fecha) return falla("Ese evento no existe.", "That event does not exist.");
  if (!p.esperan) return falla("Nadie está esperando.", "Nobody is waiting.");
  if (!p.libres) return falla("No hay lugar libre: sube la cantidad en el editor o devuelve un boleto.", "No free spot: raise the quantity in the editor or refund a ticket.");
  const n = await ofrecer(p.fecha);
  return n ? { ok: true, n } : falla("Lo que se liberó no alcanza para los grupos que esperan.", "What opened up is not enough for the groups waiting.");
}
