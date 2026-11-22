import "server-only";
import { cacheConAviso } from "./cache-aviso";
import { cookies } from "next/headers";
import { db } from "./db";
import { millas, type LL } from "./mapa-geo";
import type { Punto } from "./punto";

/* «Ciudad que estoy viendo» (APP-CIUDAD): ciudad + desde dónde se mide (centro, barrio o «tu ubicación») + radio.
   Vive en la cookie tl_loc del dispositivo y, con sesión, en la cuenta (sin el punto GPS: ese nunca se guarda en el
   servidor). El servidor la valida siempre contra la base: una cookie vieja o tocada cae en lo de por defecto. */

export type Zona = { id: string; es: string; en: string; calleEs: string; calleEn: string; lat: number; lng: number };
export type Ciudad = {
  id: string; name: string; state: string; status: "on" | "beta" | "soon" | "off"; lat: number; lng: number;
  radios: number[]; radio: number; zips: string[]; meta: number; towns: { n: string; lat: number; lng: number }[]; zonas: Zona[];
};
export type Ubicacion = Punto & { c: Ciudad; ctr: string; gps: boolean; porDefecto: boolean; dir: "casa" | "trabajo" | "otra" | null };
/* 9t · Una dirección guardada de la persona (Mi cuenta › Direcciones) con el punto que le puso el servidor: «Desde dónde medimos» › Casa / Trabajo. */
export type DirPunto = { id: string; label: "casa" | "trabajo" | "otra"; lat: number; lng: number };

/* Ciudades y barrios (en memoria; 9b-3: un cambio en cities la olvida al momento en todos los procesos, lib/cambios-config.ts; 60 s de respaldo).
   9i · Con NOTIFY 'ciudades' (0139): abrir, cerrar, pasar a beta o cambiar un barrio se nota al instante (L71; guardián ciudadAlInstante). El estado
   «beta» sale tal cual: lo que ve cada persona lo decide vista() (invitada → abierta; el resto → próximamente). Los barrios retirados no salen. */
const CIUDADES = cacheConAviso({ ttlMs: 60_000, cargar: async (): Promise<Ciudad[]> => {
  const [c, z] = await Promise.all([
    db().query<Omit<Ciudad, "zonas">>(
      `select id, name, state, status, st_y(center::geometry) as lat, st_x(center::geometry) as lng,
              radius_options as radios, default_radius as radio, zips,
              coalesce((open_rule->>'goal')::int, 50) as meta, towns
         from cities where status <> 'off' order by sort`),
    db().query<Zona & { city: string }>(
      `select id, city_id as city, name->>'es' as es, name->>'en' as en, coalesce(streets->>'es', '') as "calleEs",
              coalesce(streets->>'en', '') as "calleEn", st_y(center::geometry) as lat, st_x(center::geometry) as lng
         from zones where center is not null and retired_at is null order by city_id, sort`),
  ]);
  return c.rows.map((x) => ({ ...x, zonas: z.rows.filter((r) => r.city === x.id).map(({ city: _c, ...r }) => (void _c, r)) }));
} });
export const ciudades = (): Promise<Ciudad[]> => CIUDADES.leer();

/* 9i · Las ciudades como las ve ESTA persona: una ciudad en «beta» es abierta para quien está invitado (o es una cuenta de revisión activa) y
   «próximamente» para todos los demás (ciudad_abierta_para de 0139, la misma regla que usan las acciones del servidor). Sin beta, no consulta nada.
   Nunca se guarda en memoria: una invitación nueva o quitada vale en la siguiente página (guardián betaSoloInvitados). */
export async function vista(cs: Ciudad[], userId: string | null | undefined): Promise<Ciudad[]> {
  if (!cs.some((c) => c.status === "beta")) return cs;
  const dentro = new Set(userId ? (await db().query<{ id: string }>(`select id from cities where status = 'beta' and ciudad_abierta_para(id, $1::uuid)`, [userId])).rows.map((r) => r.id) : []);
  return cs.map((c) => (c.status === "beta" ? { ...c, status: dentro.has(c.id) ? "on" : "soon" } : c));
}

/* El centro de la ciudad es su barrio «centro» si lo tiene (Broad St y Wyoming St), si no el centro guardado. */
export const centroDe = (c: Ciudad): LL => {
  const z = c.zonas.find((x) => x.id.endsWith("-centro"));
  return z ? [z.lat, z.lng] : [c.lat, c.lng];
};

/* La primera ciudad abierta (por orden); si ninguna lo está todavía, la primera. */
export const porDefecto = (cs: Ciudad[]) => cs.find((c) => c.status === "on") ?? cs[0]!;

export type Pedida = { c?: string; z?: string; r?: number; g?: [number, number] };
const COOKIE = "tl_loc";

/* Lee la cookie (formato corto: ciudad|centro|radio[|lat,lng]). */
function leer(v: string | undefined): Pedida {
  if (!v || v.length > 80) return {};
  const [c, z, r, g] = v.split("|");
  const out: Pedida = { c, z, r: Number(r) };
  if (g) { const [a, b] = g.split(",").map(Number); if (Number.isFinite(a) && Number.isFinite(b)) out.g = [a!, b!]; }
  return out;
}
export const escribir = (u: { ciudad: string; ctr: string; rad: number; g?: [number, number] | null }) =>
  [u.ciudad, u.ctr, u.rad, u.g ? `${u.g[0].toFixed(4)},${u.g[1].toFixed(4)}` : ""].join("|").replace(/\|$/, "");
export const COOKIE_LOC = COOKIE;

/* Valida lo pedido y devuelve la ubicación completa. Nunca falla: lo que no cuadra cae en lo de por defecto.
   9t · «dir:<id>» mide desde una dirección guardada SOLO si está en `dirs` (las de quien mira, leídas del servidor) y a ≤ 60 mi del centro; sin
   sesión o con una dirección ajena o quitada, cae en el centro. El punto nunca viene de la cookie ni de la pantalla. */
export function resolver(cs: Ciudad[], p: Pedida, dirs?: DirPunto[]): Ubicacion {
  const c = cs.find((x) => x.id === p.c) ?? porDefecto(cs);
  const rad = c.radios.includes(Number(p.r)) ? Number(p.r) : c.radio;
  let ctr = "centro", ll = centroDe(c), gps = false, dir: Ubicacion["dir"] = null;
  const z = c.zonas.find((x) => x.id === p.z && !x.id.endsWith("-centro"));
  const d = p.z?.startsWith("dir:") ? dirs?.find((x) => `dir:${x.id}` === p.z) : undefined;
  if (z) { ctr = z.id; ll = [z.lat, z.lng]; }
  else if (p.z === "gps" && p.g && millas(p.g, centroDe(c)) <= 60) { ctr = "gps"; ll = p.g; gps = true; }
  else if (d && millas([d.lat, d.lng], centroDe(c)) <= 60) { ctr = `dir:${d.id}`; ll = [d.lat, d.lng]; dir = d.label; }
  return { ciudad: c.id, lat: ll[0], lng: ll[1], rad, c, ctr, gps, porDefecto: !p.c, dir };
}

/* La ubicación de esta visita: cookie del dispositivo; si no hay, la guardada en la cuenta; si no, por defecto. */
export async function ubicacion(usuario?: { id: string } | null): Promise<Ubicacion> {
  const [cs0, jar] = await Promise.all([ciudades(), cookies()]);
  const cs = await vista(cs0, usuario?.id);
  let p = leer(jar.get(COOKIE)?.value);
  if (!p.c && usuario) {
    const r = (await db().query<{ c: string | null; z: string | null; r: number | null }>(
      `select viewing_city_id as c, viewing_center as z, viewing_radius_mi as r from users where id = $1`, [usuario.id])).rows[0];
    if (r?.c) p = { c: r.c, z: r.z ?? undefined, r: r.r ?? undefined };
  }
  // 9t · Medir desde Casa / Trabajo: el punto sale de las direcciones de ESTA persona (solo si lo pidió).
  const dirs = usuario && p.z?.startsWith("dir:") ? await (await import("./direcciones")).puntosGuardados(usuario.id) : undefined;
  return resolver(cs, p, dirs);
}

/* Nombre corto del punto para el encabezado («tú», «North End»). */
export function etiquetaCentro(u: Ubicacion, es: boolean) {
  if (u.gps) return es ? "tú" : "you";
  if (u.dir) return ({ casa: es ? "casa" : "home", trabajo: es ? "trabajo" : "work", otra: es ? "otra dirección" : "other address" })[u.dir];
  const z = u.c.zonas.find((x) => x.id === u.ctr);
  return z ? (es ? z.es : z.en) : null;
}
