import "server-only";
import { randomInt } from "node:crypto";
import { auditar, type Staff } from "../admin";
import { leerRotulo } from "../app-nativa-comun";
import { db, tx } from "../db";
import { ALFABETO, CODIGO, TIPOS_ENLACE, bien, mal, rutaPropia, type Res, type TipoEnlace } from "./comun";

/* 9h · Enlaces cortos y QR de calle (fase9-apertura.md §4 9h, §6 #16): tolatino.com/q/{código} → se anota el escaneo SIN personas (ni IP, ni dispositivo, ni
   cuenta: el código, la hora, la ciudad del enlace, web o app y la clase de navegador) → redirige a una ruta PROPIA. Crear y retirar: Super Admin ›
   Crecimiento › Enlaces y QR (mkt:editar, con motivo y auditoría). Un enlace no se borra ni cambia de destino: se retira y se crea otro.
   Guardianes: enlaceSoloPropio (el destino nunca es otro origen), analiticaSinPersonas (link_scans sin IP). */

export const nuevoCodigo = () => Array.from({ length: 7 }, () => ALFABETO[randomInt(0, ALFABETO.length)]).join("");
const enCiudad = (s: Staff, c: string) => !s.cities.length || s.cities.includes(c);

/* Los robots (vistas previas de WhatsApp, Facebook, buscadores) no cuentan como escaneo. */
const ROBOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|discord|slack|curl|wget|python|headless/i;
export function claseNavegador(ua: string | null): { robot: boolean; app: "web" | "app"; ua: "telefono" | "escritorio" | "otro" } {
  const u = ua ?? "";
  return {
    robot: !u || ROBOT.test(u),
    app: leerRotulo(u) ? "app" : "web",
    ua: /iPhone|Android|Mobile|iPad/i.test(u) ? "telefono" : /Windows|Macintosh|X11|CrOS|Linux/i.test(u) ? "escritorio" : "otro",
  };
}

/* El escaneo: devuelve a dónde ir (el Inicio si el código no existe o se retiró) y la ciudad del enlace. Anota UNA fila sin personas. */
export async function escanear(code: string, ua: string | null, contar: boolean): Promise<{ destino: string; ciudad: string | null; code: string | null }> {
  const c = String(code ?? "").toUpperCase();
  if (!CODIGO.test(c)) return { destino: "/", ciudad: null, code: null };
  const l = (await db().query<{ target: string; city_id: string; vivo: boolean }>(`select target, city_id, retired_at is null as vivo from short_links where code = $1`, [c])).rows[0];
  if (!l || !l.vivo || !rutaPropia(l.target)) return { destino: "/", ciudad: null, code: null };
  const k = claseNavegador(ua);
  if (contar && !k.robot) await db().query(`insert into link_scans (code, city_id, app, ua_class) values ($1, $2, $3, $4)`, [c, l.city_id, k.app, k.ua]).catch(() => undefined);
  return { destino: l.target, ciudad: l.city_id, code: c };
}

export async function crearEnlace(s: Staff, p: { label: string; target: string; ciudad: string; tipo: string; campana?: string | null; motivo: string }): Promise<Res<{ code?: string }>> {
  if (!s.puede("mkt", "editar")) return mal("Tu rol no crea enlaces.", "Your role cannot create links.");
  const label = String(p.label ?? "").replace(/\s+/g, " ").trim(), target = String(p.target ?? "").trim(), motivo = String(p.motivo ?? "").trim();
  if (label.length < 2 || label.length > 80) return mal("Ponle un nombre de 2 a 80 letras (dónde va el QR).", "Give it a name of 2 to 80 characters (where the QR goes).");
  if (!rutaPropia(target)) return mal("El destino es una ruta de To'Latino que empieza con «/» (por ejemplo /publica). Nunca otra página.", "The destination is a To'Latino path starting with “/” (for example /publica). Never another site.");
  if (!(TIPOS_ENLACE as readonly string[]).includes(p.tipo)) return mal("Elige dónde va (calle, volante, iglesia…).", "Pick where it goes (street, flyer, church…).");
  if (!enCiudad(s, p.ciudad)) return mal("Esa ciudad no es tuya.", "That city is not yours.");
  if (motivo.length < 3) return mal("Escribe el motivo.", "Write the reason.");
  const camp = p.campana && /^\d{1,18}$/.test(p.campana) ? p.campana : null;
  return tx(async (c) => {
    if (!(await c.query(`select 1 from cities where id = $1`, [p.ciudad])).rowCount) return mal("Esa ciudad no existe.", "That city does not exist.");
    if (camp && !(await c.query(`select 1 from campaigns where id = $1::bigint and city_id = $2`, [camp, p.ciudad])).rowCount) return mal("La campaña es de otra ciudad.", "The campaign belongs to another city.");
    for (let i = 0; i < 6; i++) {
      const code = nuevoCodigo();
      const r = await c.query(`insert into short_links (code, label, target, city_id, campaign_id, kind, created_by) values ($1, $2, $3, $4, $5, $6, $7) on conflict (code) do nothing`,
        [code, label, target, p.ciudad, camp, p.tipo as TipoEnlace, s.id]);
      if (!r.rowCount) continue;
      await auditar(c, { actor: s.id, action: "mkt.enlace.crear", targetKind: "short_link", targetId: code, city: p.ciudad, after: { label, target, tipo: p.tipo, campana: camp }, reason: motivo });
      return bien("Listo: el enlace y su QR ya funcionan.", "Done: the link and its QR work now.", { code });
    }
    return mal("No se pudo crear el código. Intenta otra vez.", "Could not create the code. Try again.");
  });
}

export async function retirarEnlace(s: Staff, code: string, motivo: string): Promise<Res> {
  if (!s.puede("mkt", "editar")) return mal("Tu rol no retira enlaces.", "Your role cannot retire links.");
  const c0 = String(code ?? "").toUpperCase(), m = String(motivo ?? "").trim();
  if (!CODIGO.test(c0)) return mal("Ese enlace no existe.", "That link does not exist.");
  if (m.length < 3) return mal("Escribe el motivo.", "Write the reason.");
  return tx(async (c) => {
    const l = (await c.query<{ city_id: string; label: string; retired_at: string | null }>(`select city_id, label, retired_at from short_links where code = $1 for update`, [c0])).rows[0];
    if (!l) return mal("Ese enlace no existe.", "That link does not exist.");
    if (!enCiudad(s, l.city_id)) return mal("Esa ciudad no es tuya.", "That city is not yours.");
    if (l.retired_at) return mal("Ya estaba retirado.", "It was already retired.");
    await c.query(`update short_links set retired_at = now(), retired_by = $2, retired_reason = $3 where code = $1`, [c0, s.id, m]);
    await auditar(c, { actor: s.id, action: "mkt.enlace.retirar", targetKind: "short_link", targetId: c0, city: l.city_id, before: { vivo: true }, after: { vivo: false }, reason: m });
    return bien("Retirado: el QR ya lleva al Inicio. Nada se borró.", "Retired: the QR now goes to the Home. Nothing was deleted.");
  });
}

export type EnlaceAdm = { code: string; label: string; target: string; city: string; kind: TipoEnlace; vivo: boolean; total: number; d30: number; hoy: number; at: string; quien: string | null; campana: string | null };
/* Lista de enlaces de una ciudad con sus escaneos (de link_scan_days: un derivado por día, sin recorrer los escaneos). Paginada por cursor (created_at, code). */
export async function enlacesAdmin(s: Staff, ciudad: string | null, cursor: string | null, n = 30): Promise<{ filas: EnlaceAdm[]; mas: string | null }> {
  const [cAt, cCode] = (cursor ?? "").split("|");
  const r = await db().query<EnlaceAdm>(
    `select l.code, l.label, l.target, l.city_id as city, l.kind, l.retired_at is null as vivo, to_char(l.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as at,
            coalesce(d.total, 0)::int as total, coalesce(d.d30, 0)::int as d30, coalesce(d.hoy, 0)::int as hoy, cp.name as campana,
            nullif(trim(coalesce(u.first_name, '') || ' ' || left(coalesce(u.last_name, ''), 1)), '') as quien
       from short_links l
       left join lateral (select sum(n) as total, sum(n) filter (where dia > (now() at time zone 'America/New_York')::date - 30) as d30,
                                 sum(n) filter (where dia = (now() at time zone 'America/New_York')::date) as hoy from link_scan_days x where x.code = l.code) d on true
       left join users u on u.id = l.created_by left join campaigns cp on cp.id = l.campaign_id
      where (cardinality($1::text[]) = 0 or l.city_id = any($1::text[])) and ($2::text is null or l.city_id = $2)
        and ($3::text = '' or (l.created_at, l.code) < ($3::timestamptz, $4::text))
      order by l.created_at desc, l.code desc limit $5`, [s.cities, ciudad, cAt && cCode ? cAt : "", cCode ?? "", n + 1]);
  const filas = r.rows.slice(0, n);
  return { filas, mas: r.rows.length > n ? `${filas[n - 1]!.at}|${filas[n - 1]!.code}` : null };
}

/* Escaneos por día de un enlace (los últimos 30 días, hora de la ciudad) y por web / app y teléfono / escritorio. */
export async function escaneosDe(s: Staff, code: string) {
  const c0 = String(code ?? "").toUpperCase();
  if (!CODIGO.test(c0)) return null;
  const l = (await db().query<{ code: string; label: string; target: string; city: string; vivo: boolean; kind: TipoEnlace; razon: string | null }>(
    `select code, label, target, city_id as city, retired_at is null as vivo, kind, retired_reason as razon from short_links where code = $1 and (cardinality($2::text[]) = 0 or city_id = any($2::text[]))`, [c0, s.cities])).rows[0];
  if (!l) return null;
  const [dias, mix] = await Promise.all([
    db().query<{ dia: string; n: number }>(
      `select to_char(g.dia, 'YYYY-MM-DD') as dia, coalesce(x.n, 0)::int as n
         from generate_series((now() at time zone 'America/New_York')::date - 29, (now() at time zone 'America/New_York')::date, interval '1 day') g(dia)
         left join link_scan_days x on x.code = $1 and x.dia = g.dia::date order by g.dia`, [c0]),
    db().query<{ app: string; ua: string; n: number }>(
      `select app, ua_class as ua, count(*)::int as n from link_scans where code = $1 and at > now() - interval '30 days' group by 1, 2`, [c0]),
  ]);
  return { ...l, dias: dias.rows, mix: mix.rows };
}
