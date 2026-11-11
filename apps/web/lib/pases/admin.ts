import "server-only";
import type { Staff } from "../admin";
import { db } from "../db";
import { estadoCertificado, type EstadoCert } from "./certificado";
import { encendidos, listos } from "./credenciales";

/* 8g · Super Admin (regla 8, espejo y triángulo): Eventos › el boleto › WALLET (los pases emitidos de ese boleto y su estado: vivo o anulado y por
   qué, versión, teléfonos que lo siguen, último aviso a Apple, estado en Google y su historia) y Sistema › Integraciones › Wallet (el
   certificado del pase y su vencimiento, la solicitud, la cuenta de Google, los interruptores y las cifras). Nada personal: series cortas, sin
   tokens, sin teléfonos. Las ciudades del equipo limitan lo que se ve. */
const ISO = (c: string) => `to_char(${c} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;
export type PaseAdm = {
  id: string; plat: "apple" | "google"; serie: string; version: number; anulado: string | null; por: string | null; emitido: string; telefonos: number;
  aviso: { at: string | null; res: string | null; pendientes: number }; google: { al_dia: boolean; error: string | null } | null;
  log: { id: string; a: string; d: string | null; at: string }[];
};
export async function pasesDeBoleto(s: Staff, code: string): Promise<PaseAdm[]> {
  if (!/^TL-[A-HJ-NP-Z2-9]{3}-[2-9]{4}$/.test(code)) return [];
  const P = (await db().query<Omit<PaseAdm, "log">>(
    `select p.id::text, p.platform as plat, left(p.serial, 6) || '…' as serie, p.version, ${ISO("p.voided_at")} as anulado, p.void_reason as por, ${ISO("p.created_at")} as emitido,
            (select count(*)::int from pass_registrations r where r.pass_id = p.id and r.removed_at is null) as telefonos,
            json_build_object('at', (select ${ISO("max(r.last_push_at)")} from pass_registrations r where r.pass_id = p.id),
                              'res', (select r.last_push_result from pass_registrations r where r.pass_id = p.id and r.last_push_at is not null order by r.last_push_at desc limit 1),
                              'pendientes', (select count(*)::int from pass_registrations r where r.pass_id = p.id and r.removed_at is null and r.pushed_version < p.version)) as aviso,
            case when p.platform = 'google' then json_build_object('al_dia', p.google_synced_version >= p.version, 'error', p.google_error) end as google
       from ticket_passes p join tickets t on t.id = p.ticket_id
      where t.code = $1 and (cardinality($2::text[]) = 0 or p.city_id = any($2::text[])) order by p.id`, [code, s.cities])).rows;
  if (!P.length) return [];
  const L = (await db().query<{ id: string; pid: string; a: string; d: string | null; at: string }>(
    `select id::text, pass_id::text as pid, action as a, detail as d, ${ISO("at")} as at from pass_log where pass_id = any($1::bigint[]) order by id desc limit 60`, [P.map((x) => x.id)])).rows;
  return P.map((p) => ({ ...p, log: L.filter((l) => l.pid === p.id).slice(0, 20).map(({ id, a, d, at }) => ({ id, a, d, at })) }));
}

export type EstadoWallet = {
  cert: EstadoCert; google: { listo: boolean; emisor: string | null; correo: string | null }; on: { apple: boolean; google: boolean };
  cifras: { apple: number; google: number; anulados: number; telefonos: number; pendientes: number; googleAtras: number; fallos7: number };
};
export async function estadoWallet(): Promise<EstadoWallet> {
  const [cert, on, ok, g, k] = await Promise.all([
    estadoCertificado(), encendidos(), listos(),
    db().query<{ emisor: string | null; correo: string | null }>(`select meta->>'emisor' as emisor, meta->>'correo' as correo from store_secrets where kind = 'google_wallet_sa' and retired_at is null`),
    db().query<EstadoWallet["cifras"]>(
      `select (select count(*)::int from ticket_passes where platform = 'apple') as apple, (select count(*)::int from ticket_passes where platform = 'google') as google,
              (select count(*)::int from ticket_passes where voided_at is not null) as anulados,
              (select count(distinct r.device_library_id)::int from pass_registrations r where r.removed_at is null) as telefonos,
              (select count(*)::int from pass_registrations r join ticket_passes p on p.id = r.pass_id where r.removed_at is null and r.pushed_version < p.version) as pendientes,
              (select count(*)::int from ticket_passes where platform = 'google' and google_synced_version < version) as "googleAtras",
              (select count(*)::int from pass_log where action in ('aviso_fallo', 'google_fallo') and at > now() - interval '7 days') as fallos7`),
  ]);
  return { cert, on, google: { listo: ok.google, emisor: g.rows[0]?.emisor ?? null, correo: g.rows[0]?.correo ?? null }, cifras: k.rows[0]! };
}
