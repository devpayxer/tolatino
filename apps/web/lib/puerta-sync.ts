import "server-only";
import { createHash } from "node:crypto";
import { db } from "./db";
import { valores } from "./config";
import { verificarFirma } from "./boletos-qr";
import type { Bi, Resultado } from "./puerta-comun";

/* 6h · La cola de escaneos sin conexión (fase6-eventos.md §3 «Sin conexión y varios porteros», pasos 1–5).
   - El teléfono manda su cola EN ORDEN, de a puerta_sync_lote, con la hora del teléfono de ahora (`ahora`): el servidor mide el desfase de
     ese reloj (hora del servidor − hora del teléfono) y la hora que cuenta de cada escaneo es la del teléfono corregida (paso 1).
   - Cada escaneo va a la base (puerta_offline): idempotente por el id del teléfono (repetir la cola no cuenta dos veces; un id de otra
     puerta = «ajeno»), la sesión de ESA persona (puerta_sesion_cola: abierta, o cerrada por ella, el panel o el barrido mientras no venza el
     paquete; revocada o portero quitado = 403 y el teléfono borra todo), la firma del QR se vuelve a verificar aquí con la llave pública,
     y el boleto se decide con su fila bloqueada: lo que no valía al subir → rejected + incidencia (paso 5); el que dejó entrar dos veces
     → el primero por la hora gana y el otro queda «duplicate» con incidencia (pasos 2–4, determinista: puerta_rehacer).
   - Un boleto de otro negocio o de otra fecha nunca entra: la sesión fija el evento y la fecha (NO ES DE ESTE EVENTO / ES DE OTRO DÍA).
   - Cada subida queda en door_syncs (solo inserción) con sus cifras y el desfase; si el reloj se aleja más de puerta_reloj_desvio_seg,
     se marca (la hora se corrige igual). Nada aquí cobra ni ve montos (D1). */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, ID = /^\d{1,18}$/;
const RES = new Set<string>(["valid", "manual", "count", "already_used", "wrong_event", "wrong_day", "not_found", "forged", "void", "refunded", "replaced", "pending_transfer", "over_capacity", "door_closed", "not_inside", "no_reentry"]);
const sha = (t: string) => createHash("sha256").update(t).digest("hex");

export type EscaneoCola = { id: string; at: number; tipo: "qr" | "boleto" | "rsvp" | "contar"; qr?: string; boleto?: string; rsvp?: string; motivo?: string; dir?: "in" | "out"; n?: number; entro: boolean; res: string };
export type Hecho = { id: string; estado: "ok" | "repetido" | "ajeno" | "cerrada" | "malo"; res?: Resultado; resolucion?: "accepted" | "duplicate" | "rejected"; k?: number };
export type ResCola = { ok: true; hechos: Hecho[]; sync: string; desfaseMs: number | null; desviado: boolean; quedan: number } | { ok: false; msg: Bi; cerrada?: boolean; revocada?: boolean; vencida?: boolean };
const no = (es: string, en: string, x: Record<string, unknown> = {}) => ({ ok: false as const, msg: { es, en }, ...x });

function limpiar(x: unknown): EscaneoCola | null {
  const o = (x ?? {}) as Record<string, unknown>, id = String(o.id ?? "");
  if (!UUID.test(id)) return null;
  const at = Number(o.at), tipo = String(o.tipo ?? "");
  if (!["qr", "boleto", "rsvp", "contar"].includes(tipo)) return null;
  const n = o.n == null ? 1 : Math.floor(Number(o.n));
  return { id: id.toLowerCase(), at: Number.isFinite(at) && at > 1.6e12 && at < 4.1e12 ? at : 0, tipo: tipo as EscaneoCola["tipo"], qr: typeof o.qr === "string" ? o.qr.trim().slice(0, 400) : undefined,
    boleto: ID.test(String(o.boleto ?? "")) ? String(o.boleto) : undefined, rsvp: ID.test(String(o.rsvp ?? "")) ? String(o.rsvp) : undefined,
    motivo: typeof o.motivo === "string" ? o.motivo.replace(/\s+/g, " ").trim().slice(0, 120) : undefined, dir: o.dir === "out" ? "out" : "in",
    n: n >= 1 && n <= 20 ? n : 1, entro: o.entro === true, res: RES.has(String(o.res)) ? String(o.res) : "already_used" };
}

const errDe = (e: unknown) => String((e as { message?: string })?.message ?? "");
/* Un escaneo de la cola en la base (con reintento si dos subidas chocan en un candado). */
async function uno(sesion: string, userId: string, x: EscaneoCola, desfase: number | null, syncId: string): Promise<Hecho> {
  const at = x.at || null;
  for (let intento = 0; ; intento++) {
    try {
      if (x.tipo === "qr" || x.tipo === "boleto") {
        let tid: string | null = null, ver: number | null = null, forged = false, hash: string | null = null;
        if (x.tipo === "qr") {
          const t = String(x.qr ?? ""), v = await verificarFirma(t);
          hash = sha(t);
          if (v.ok) { tid = v.d.id; ver = v.d.ver; } else forged = v.motivo !== "formato";
        } else {
          tid = x.boleto ?? null;
          if (!tid || !x.motivo || x.motivo.length < 2) return { id: x.id, estado: "malo" };
        }
        const r = (await db().query<{ id: string; result: Resultado; resolution: "accepted" | "duplicate" | "rejected"; admits_n: number; session_id: string; nuevo: boolean }>(
          `select (s).id::text, (s).result, (s).resolution, (s).admits_n, (s).session_id::text, (s).sync_id is not distinct from $15::bigint as nuevo
             from (select puerta_offline($1::uuid, $2::bigint, $3, $4::bigint, $5, $6, $7, $8, $9, to_timestamp($10::double precision / 1000), $11, $12, $13, $14, $15::bigint) as s) z`,
          [x.id, sesion, userId, tid, ver, hash, x.dir, x.n, x.tipo === "boleto" ? x.motivo : null, at, desfase, forged, x.entro, x.res, syncId])).rows[0]!;
        // La resolución vigente (si después otra subida la corrigió, manda la corrección).
        const ef = (await db().query<{ result: Resultado; resolution: "accepted" | "duplicate" | "rejected"; admits_n: number }>(`select result, resolution, admits_n from ticket_scans_ef where id = $1::uuid`, [r.id])).rows[0] ?? r;
        return { id: x.id, estado: r.nuevo ? "ok" : "repetido", res: ef.result, resolucion: ef.resolution, k: ef.admits_n };
      }
      // RSVP y conteo: como en línea (puerta_rsvp / puerta_contar con la marca sin conexión y la hora del teléfono). Necesitan la puerta abierta.
      const q = x.tipo === "rsvp"
        ? await db().query<{ id: string; result: Resultado; resolution: "accepted" | "duplicate" | "rejected"; admits_n: number }>(`select id::text, result, resolution, admits_n from puerta_rsvp($1::uuid, $2::bigint, $3, $4::bigint, $5, to_timestamp($6::double precision / 1000), true)`, [x.id, sesion, userId, x.rsvp ?? null, x.n, at])
        : await db().query<{ id: string; result: Resultado; resolution: "accepted" | "duplicate" | "rejected"; admits_n: number }>(`select id::text, result, resolution, admits_n from puerta_contar($1::uuid, $2::bigint, $3, $4, $5, to_timestamp($6::double precision / 1000), true)`, [x.id, sesion, userId, x.n, x.dir, at]);
      const r = q.rows[0]!;
      return { id: x.id, estado: "ok", res: r.result, resolucion: r.resolution, k: r.admits_n };
    } catch (e) {
      const m = errDe(e), code = (e as { code?: string }).code;
      if ((code === "40P01" || code === "40001") && intento < 3) continue;
      if (/puerta_id_ajeno/.test(m)) return { id: x.id, estado: "ajeno" };
      if (/puerta_revocada|puerta_vencida/.test(m)) throw e;
      if (/puerta_cerrada|puerta_sin_acceso|puerta_no_cuenta/.test(m)) return { id: x.id, estado: "cerrada" };
      if (/puerta_direccion|invalid input syntax/.test(m)) return { id: x.id, estado: "malo" };
      throw e;
    }
  }
}

/* Sube la cola de UNA sesión (de esa persona). `ahora` = la hora del teléfono al mandar. */
export async function aplicarCola(userId: string, sesion: string, device: string | null, ahora: unknown, escaneosRaw: unknown): Promise<ResCola> {
  if (!ID.test(String(sesion ?? "")) || !userId) return no("Esa puerta no existe.", "That door does not exist.", { cerrada: true });
  const s = (await db().query<{ ended_by: string | null; vence: boolean }>(
    `select s.ended_by, now() > d.ends_at + make_interval(hours => cfg_int('puerta_paquete_h')) as vence from door_sessions s join event_dates d on d.id = s.event_date_id where s.id = $1::bigint and s.user_id = $2`, [sesion, userId])).rows[0];
  if (!s) return no("Esa puerta no es tuya.", "That door is not yours.", { cerrada: true });
  if (s.ended_by === "revoked" || s.ended_by === "removed") return no("El negocio revocó este teléfono: lo que no se subió ya no cuenta.", "The business revoked this phone: anything not uploaded no longer counts.", { cerrada: true, revocada: true });
  if (s.vence) return no("Ya pasó el plazo para subir los escaneos de esa fecha.", "The deadline to upload scans for that date has passed.", { cerrada: true, vencida: true });
  const cfg = await valores("puerta_sync_lote", "puerta_reloj_desvio_seg");
  const todos = Array.isArray(escaneosRaw) ? escaneosRaw : [];
  const L = todos.slice(0, cfg.puerta_sync_lote).map(limpiar);
  const tel = Number(ahora), desfase = Number.isFinite(tel) && tel > 1.6e12 && tel < 4.1e12 ? Math.round(Date.now() - tel) : null;
  const desviado = desfase == null || Math.abs(desfase) > cfg.puerta_reloj_desvio_seg * 1000;
  const desfaseDb = desfase == null ? null : Math.max(-2_000_000_000, Math.min(2_000_000_000, desfase));
  const { id: syncId, t0 } = (await db().query<{ id: string; t0: string }>(`select nextval(pg_get_serial_sequence('door_syncs', 'id'))::text as id, clock_timestamp()::text as t0`)).rows[0]!;
  const hechos: Hecho[] = [];
  try {
    for (const x of L) {
      if (!x) { hechos.push({ id: "", estado: "malo" }); continue; }
      hechos.push(await uno(sesion, userId, x, desfaseDb, syncId));
    }
  } catch (e) {
    const m = errDe(e);
    if (/puerta_revocada/.test(m)) return no("El negocio revocó este teléfono: lo que no se subió ya no cuenta.", "The business revoked this phone: anything not uploaded no longer counts.", { cerrada: true, revocada: true });
    if (/puerta_vencida/.test(m)) return no("Ya pasó el plazo para subir los escaneos de esa fecha.", "The deadline to upload scans for that date has passed.", { cerrada: true, vencida: true });
    throw e;
  }
  const nuevos = hechos.filter((h) => h.estado === "ok");
  const cuenta = (r: string) => nuevos.filter((h) => h.resolucion === r).length;
  await db().query(`insert into door_syncs (id, session_id, event_date_id, city_id, user_id, device, n, accepted_n, duplicate_n, rejected_n, repeated_n, clock_offset_ms, skew)
    overriding system value select $1::bigint, s.id, s.event_date_id, s.city_id, s.user_id, $3::uuid, $4, $5, $6, $7, $8, $9, $10 from door_sessions s where s.id = $2::bigint`,
    [syncId, sesion, device && /^[0-9a-f-]{36}$/i.test(device) ? device : null, L.length, cuenta("accepted"), cuenta("duplicate"), cuenta("rejected"), hechos.filter((h) => h.estado === "repetido").length, desfaseDb, desviado]);
  if (desfaseDb != null) await db().query(`update door_sessions set clock_offset_ms = $2 where id = $1::bigint`, [sesion, desfaseDb]);
  // Al organizador: un aviso por subida si hubo boletos que entraron dos veces o que ya no valían (las incidencias ya están en el Monitor).
  const inc = (await db().query<{ n: number; neg: string; t: Bi; puerta: string; fid: string; eid: string }>(
    `select count(*)::int as n, min(i.business_id) as neg, min(e.title::text)::jsonb as t, min(s.door_name) as puerta, min(i.event_date_id)::text as fid, min(i.event_id)::text as eid
       from door_incidents i join door_sessions s on s.id = $1::bigint join events e on e.id = i.event_id
      where i.auto and i.event_date_id = s.event_date_id and i.at >= $2::timestamptz and i.by_user = s.user_id`, [sesion, t0])).rows[0];
  if (inc && inc.n > 0) {
    // Lo detecta To'Latino al subir la cola de ese teléfono (no lo reportó el portero).
    await (await import("./avisos")).avisarNegocio(inc.neg, "puerta_incidencia", { quien: "To'Latino", puerta: inc.puerta, evento: inc.t?.es ?? "", tipo: inc.n === 1 ? "boleto que entró sin conexión y no valía o ya había entrado" : `${inc.n} boletos que entraron sin conexión y no valían o ya habían entrado`, nota: "" },
      { href: `/panel/${inc.neg}/eventos?det=door:${inc.eid}@${inc.fid}`, ref: ["event_date", inc.fid] }).catch(() => undefined);
  }
  return { ok: true, hechos, sync: syncId, desfaseMs: desfase, desviado, quedan: Math.max(0, todos.length - L.length) };
}
