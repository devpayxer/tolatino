"use server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { dispositivo, ipCliente, mismoOrigen, normalizarTelefono, yo } from "@/lib/cuenta";
import { millas, type LL } from "@/lib/mapa-geo";
import { centroDe, ciudades, COOKIE_LOC, escribir, porDefecto, resolver, ubicacion } from "@/lib/ubicacion";
import { buscarLugar, ciudadDeTexto, cuantosPiden, masPedidas, medir, miCiudad, misPedidos, resumenCiudades, telefonoBonito } from "@/lib/ciudad";

/* Acciones de APP-CIUDAD. El servidor valida todo; la pantalla solo pide. */

const UN_ANO = 365 * 86400;
const ok = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);

/* Elegir la ciudad que estoy viendo: desde dónde (centro, barrio, mi ubicación) y hasta dónde. */
export async function elegirUbicacion(p: { c: string; z: string; r: number; g?: [number, number] | null }) {
  if (!(await mismoOrigen())) return { ok: false as const };
  const cs = await ciudades();
  const g = p.g && ok(p.g[0]) && ok(p.g[1]) ? ([p.g[0], p.g[1]] as [number, number]) : undefined;
  const u = resolver(cs, { c: String(p.c ?? ""), z: String(p.z ?? ""), r: Number(p.r), g });
  const jar = await cookies();
  jar.set(COOKIE_LOC, escribir({ ciudad: u.ciudad, ctr: u.ctr, rad: u.rad, g: u.gps ? [u.lat, u.lng] : null }),
    { path: "/", maxAge: UN_ANO, sameSite: "lax", httpOnly: true });
  const me = await yo();
  // En la cuenta se guarda que mide «desde mi ubicación», nunca el punto.
  if (me) await db().query(`update users set viewing_city_id = $2, viewing_center = $3, viewing_radius_mi = $4 where id = $1`, [me.id, u.ciudad, u.ctr, u.rad]);
  return { ok: true as const, abierta: u.c.status === "on" };
}

/* «Usar mi ubicación»: a qué ciudad y barrio corresponde el punto. No se guarda nada aquí. */
export async function dondeEstoy(lat: number, lng: number) {
  if (!ok(lat) || !ok(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  const cs = await ciudades(), p: LL = [lat, lng];
  const cerca = [...cs].map((c) => ({ c, d: millas(p, centroDe(c)) })).sort((a, b) => a.d - b.d);
  const abierta = cerca.find((x) => x.c.status === "on");
  const elegida = abierta && abierta.d <= 30 ? abierta : cerca[0]!;
  const lejos = elegida.d > 30;
  const zona = elegida.c.zonas.map((z) => ({ z, d: millas(p, [z.lat, z.lng]) })).sort((a, b) => a.d - b.d)[0];
  return { ciudad: elegida.c.id, nombre: `${elegida.c.name}, ${elegida.c.state}`, abierta: elegida.c.status === "on", d: Math.round(elegida.d * 10) / 10, lejos,
    zona: zona && zona.d <= 1.5 ? { es: zona.z.es, en: zona.z.en } : null };
}

/* Lo que entra con un punto y un radio (para el mapa del selector mientras se elige). */
export async function medirBorrador(p: { c: string; z: string; r: number; g?: [number, number] | null }) {
  const cs = await ciudades();
  const g = p.g && ok(p.g[0]) && ok(p.g[1]) ? ([p.g[0], p.g[1]] as [number, number]) : undefined;
  const u = resolver(cs, { c: String(p.c ?? ""), z: String(p.z ?? ""), r: Number(p.r), g });
  if (u.c.status !== "on") return { lat: u.lat, lng: u.lng, biz: 0, prev: null, towns: [], dots: [] };
  return { lat: u.lat, lng: u.lng, ...(await medir(u, u.c)) };
}

/* Búsqueda de lugar del selector (dirección, barrio, ciudad o código postal). Solo lectura. */
export async function lugares(q: string) {
  return buscarLugar(String(q ?? "").slice(0, 60));
}

export type RespPedir = { ok: true; c: string; n: number; mios: { id: string; t: string }[] } | { ok: false; error: "vacio" | "telefono" | "muchos" | "origen" };

/* «Avísame cuando llegue a mi zona»: ciudad o código postal que todavía no tenemos (o una nuestra que viene). */
export async function pedirCiudad(texto: string, telefono: string): Promise<RespPedir> {
  if (!(await mismoOrigen())) return { ok: false, error: "origen" };
  const v = String(texto ?? "").replace(/\s+/g, " ").trim().slice(0, 60);
  if (v.length < 2) return { ok: false, error: "vacio" };
  const me = await yo();
  const tel = me ? null : normalizarTelefono(String(telefono ?? ""));
  if (!me && !tel) return { ok: false, error: "telefono" };
  const ip = await ipCliente();
  if (ip) {
    const n = (await db().query<{ n: number }>(`select count(*)::int as n from city_waitlist where ip = $1 and created_at > now() - interval '1 hour'`, [ip])).rows[0]?.n ?? 0;
    if (n >= 10) return { ok: false, error: "muchos" };
  }
  const cs = await ciudades();
  const c = ciudadDeTexto(cs, v);
  const dev = me ? null : await dispositivo(true);
  await db().query(
    `insert into city_waitlist (city_id, city_name, user_id, contact, source, device, ip)
     select $1, $2, $3, $4, 'city', $5::uuid, $6::inet
      where not exists (select 1 from city_waitlist where removed_at is null
                          and coalesce(city_id, lower(city_name)) = coalesce($1, lower($2))
                          and (($3::uuid is not null and user_id = $3) or ($3::uuid is null and user_id is null and device = $5::uuid)))`,
    [c?.id ?? null, c ? null : v, me?.id ?? null, tel, dev, ip]);
  const nombre = c ? `${c.name}, ${c.state}` : v;
  return { ok: true, c: nombre, n: await cuantosPiden(c?.id ?? null, v), mios: (await misPedidos(me?.id ?? null, dev)).map(({ id, t }) => ({ id, t })) };
}

/* Quitar un pedido propio (no se borra: queda con removed_at). */
export async function quitarPedido(id: string) {
  if (!(await mismoOrigen()) || !/^\d{1,18}$/.test(String(id))) return { ok: false as const };
  const me = await yo(), dev = me ? null : await dispositivo(false);
  if (!me && !dev) return { ok: false as const };
  await db().query(
    `update city_waitlist set removed_at = now() where id = $1 and removed_at is null and ${me ? "user_id = $2" : "user_id is null and device = $2::uuid"}`,
    [id, me?.id ?? dev]);
  return { ok: true as const, mios: (await misPedidos(me?.id ?? null, dev)).map(({ id, t }) => ({ id, t })) };
}

/* APP-CIUDAD-PRONTO · «Avísame cuando llegue a X»: con cuenta (te escribimos al teléfono de la cuenta). Alterna. */
export async function esperarCiudad(ciudad: string): Promise<{ ok: true; on: boolean; n: number } | { ok: false; entrar?: true }> {
  if (!(await mismoOrigen())) return { ok: false };
  const me = await yo();
  if (!me) return { ok: false, entrar: true };
  const c = (await ciudades()).find((x) => x.id === ciudad && x.status === "soon");
  if (!c) return { ok: false };
  const quitado = await db().query(`update city_waitlist set removed_at = now() where user_id = $1 and city_id = $2 and removed_at is null`, [me.id, c.id]);
  if (!quitado.rowCount) await db().query(`insert into city_waitlist (city_id, user_id, source) values ($1, $2, 'coming_soon') on conflict do nothing`, [c.id, me.id]);
  return { ok: true, on: !quitado.rowCount, n: await cuantosPiden(c.id, c.name) };
}

/* Todo lo que el selector necesita al abrirse (una sola llamada). */
export async function abrirSelector() {
  const me = await yo();
  const [cs, dev] = await Promise.all([ciudades(), dispositivo(false)]);
  const [u, res, mios, sugeridas, mi] = await Promise.all([ubicacion(me), resumenCiudades(cs), misPedidos(me?.id ?? null, dev), masPedidas(), miCiudad(me?.id ?? null, cs)]);
  const def = porDefecto(cs);
  return {
    actual: { c: u.ciudad, z: u.ctr, r: u.rad, g: u.gps ? ([u.lat, u.lng] as [number, number]) : null },
    defecto: { c: def.id, n: def.name, r: def.radio },
    ciudades: cs.map((c) => ({
      id: c.id, n: `${c.name}, ${c.state}`, corto: c.name, on: c.status === "on", centro: centroDe(c), radios: c.radios, radio: c.radio,
      biz: res.get(c.id)?.biz ?? 0, espera: res.get(c.id)?.espera ?? 0,
      zonas: c.zonas.map((z) => ({ id: z.id, es: z.es, en: z.en, calleEs: z.calleEs, calleEn: z.calleEn, centro: z.id.endsWith("-centro") })),
      towns: c.status === "on" ? c.towns : [],
    })),
    sesion: me ? { tel: telefonoBonito(me.phone) } : null,
    miCiudad: mi, mios: mios.map(({ id, t }) => ({ id, t })), sugeridas,
  };
}
export type DatosSelector = Awaited<ReturnType<typeof abrirSelector>>;
