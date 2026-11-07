"use server";
/* 5f–5g · Super Admin › Gamification (Rangos, Puntos, Monedas, Cupones, Tabla) y Usuarios 360° › Comunidad › Puntos y Monedas. Cada acción: permiso de la matriz (gam: editar; Cerrar el mes,
   solo Admin; ajustar puntos: usr editar, con tope por rol) y ciudad de quien actúa → cambio con las funciones de la base → auditoría con
   motivo, en una transacción; después, el aviso a la persona. Nada se borra: los libros de puntos y de monedas solo reciben asientos.
   5g: el costo de un cupón (80–1,000 monedas) lo fija solo el equipo, aquí; aprobar, rechazar, pausar y activar avisan al negocio. */
import { revalidatePath } from "next/cache";
import { auditar, staff } from "@/lib/admin";
import { avisar, avisarMuchos, avisarNegocio } from "@/lib/avisos";
import { tx } from "@/lib/db";
import { olvidarRangos, recalcularRango, rangos } from "@/lib/puntos";
import { cerrarMes, excluir } from "@/lib/tabla";
import type { ResAdm } from "./acciones-colas";
import { COSTO_MAX, COSTO_MIN } from "@/lib/monedas-comun";

const no = (mensaje: string): ResAdm => ({ ok: false, mensaje });
const motivoOk = (m: unknown) => (typeof m === "string" ? m.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim().slice(0, 500) : "");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
/* Tope de un ajuste de puntos por rol (§4 5f «tope por rol»; prototipo ptsAdj): Admin hasta 5,000; quien edita Usuarios, hasta 500. */
const TOPE_AJUSTE: Record<string, number> = { admin: 5000 };
const topeAjuste = (rol: string) => TOPE_AJUSTE[rol] ?? 500;
const listo = () => { revalidatePath("/admin/gamificacion"); revalidatePath("/admin/usuarios"); revalidatePath("/comunidad"); revalidatePath("/comunidad/monedas"); };
async function quien(accion: "editar" | "aprobar" = "editar") { const s = await staff(); return s && s.puede("gam", accion) ? s : null; }
const enSusCiudades = (s: { cities: string[] }, ciudad: string | null) => !s.cities.length || (!!ciudad && s.cities.includes(ciudad));

/* Rangos · renombrar ES/EN (la Comunidad lo muestra al instante). */
export async function gamRenombrar(nivel: number, es: string, en: string, motivo: string): Promise<ResAdm> {
  const s = await quien(); if (!s) return no("Tu rol no edita rangos.");
  const m = motivoOk(motivo), a = String(es ?? "").replace(/\s+/g, " ").trim().slice(0, 30), b = String(en ?? "").replace(/\s+/g, " ").trim().slice(0, 30) || a;
  if (!Number.isInteger(nivel) || nivel < 1 || nivel > 10) return no("Ese rango no existe.");
  if (!a) return no("Escribe el nombre en español.");
  if (!m) return no("Escribe el motivo.");
  const r = await tx(async (c) => {
    const antes = (await c.query<{ name: { es: string; en: string } }>(`select name from ranks where level = $1 for update`, [nivel])).rows[0];
    if (!antes) return "Ese rango no existe.";
    if (antes.name.es === a && antes.name.en === b) return "Ese ya es su nombre.";
    await c.query(`update ranks set name = $2, updated_by = $3, updated_at = now() where level = $1`, [nivel, JSON.stringify({ es: a, en: b }), s.id]);
    await auditar(c, { actor: s.id, action: "gam.rango.renombrar", targetKind: "rank", targetId: String(nivel), before: antes.name, after: { es: a, en: b }, reason: m });
    return null;
  });
  if (r) return no(r);
  olvidarRangos(); listo();
  return { ok: true, mensaje: "Listo. La Comunidad ya lo muestra." };
}

/* Puntos · el valor de una regla (0–100) o apagarla. */
export async function gamRegla(key: string, puntos: string, on: boolean, motivo: string): Promise<ResAdm> {
  const s = await quien(); if (!s) return no("Tu rol no edita puntos.");
  const m = motivoOk(motivo), v = Number(String(puntos ?? "").replace(/[^\d]/g, ""));
  if (!m) return no("Escribe el motivo.");
  if (!Number.isInteger(v) || v < 0 || v > 100) return no("Un valor de 0 a 100.");
  const r = await tx(async (c) => {
    const antes = (await c.query<{ points: number; enabled: boolean }>(`select points, enabled from points_rules where key = $1 for update`, [String(key)])).rows[0];
    if (!antes) return "Esa regla no existe.";
    if (antes.points === v && antes.enabled === !!on) return "No cambió nada.";
    await c.query(`update points_rules set points = $2, enabled = $3, updated_by = $4, updated_at = now() where key = $1`, [key, v, !!on, s.id]);
    await auditar(c, { actor: s.id, action: "gam.puntos.regla", targetKind: "points_rule", targetId: key, before: { puntos: antes.points, encendida: antes.enabled }, after: { puntos: v, encendida: !!on }, reason: m });
    return null;
  });
  if (r) return no(r);
  listo();
  return { ok: true, mensaje: "Listo. Cuenta desde ahora; lo ya ganado no cambia." };
}

/* Puntos · el tope del día (50 · 100 · 150 · 200). */
export async function gamTope(v: number, motivo: string): Promise<ResAdm> {
  const s = await quien(); if (!s) return no("Tu rol no edita puntos.");
  const m = motivoOk(motivo);
  if (![50, 100, 150, 200].includes(Number(v))) return no("Elige 50, 100, 150 o 200.");
  if (!m) return no("Escribe el motivo.");
  await tx(async (c) => {
    const antes = (await c.query<{ t: number }>(`select pts_tope() as t`)).rows[0]!.t;
    await c.query(`insert into platform_config (key, value, note, updated_at, updated_by) values ('pts_tope_dia', to_jsonb($1::int), 'Puntos máximos por persona en un día local de su ciudad (5f)', now(), $2)
                   on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = excluded.updated_by`, [Number(v), s.id]);
    await auditar(c, { actor: s.id, action: "gam.puntos.tope", targetKind: "platform_config", targetId: "pts_tope_dia", before: { tope: antes }, after: { tope: Number(v) }, reason: m });
  });
  listo();
  return { ok: true, mensaje: "Listo. El tope nuevo cuenta desde ahora." };
}

/* Tabla del Barrio · excluir (o volver a incluir) con motivo; la persona recibe el aviso. */
export async function gamExcluir(ciudad: string, mes: string, uid: string, fuera: boolean, motivo: string): Promise<ResAdm> {
  const s = await quien(); if (!s) return no("Tu rol no edita la Tabla.");
  const m = motivoOk(motivo);
  if (!m) return no("Escribe el motivo.");
  if (!UUID.test(String(uid)) || !/^\d{4}-\d\d-01$/.test(String(mes))) return no("Esa persona no está en la tabla.");
  if (!enSusCiudades(s, ciudad)) return no("Esa ciudad no es tuya.");
  const r = await excluir(s.id, ciudad, mes, uid, !!fuera, m);
  if (!r.ok) return no(r.mensaje);
  listo();
  return { ok: true, mensaje: fuera ? "Excluido de la tabla de ese mes. Le avisamos el motivo." : "Vuelve a la tabla." };
}

/* Tabla del Barrio · «Cerrar el mes» (solo Admin): los 4 pasos; no se deshace. */
export async function gamCerrarMes(ciudad: string, mes: string, motivo: string): Promise<ResAdm> {
  const s = await quien(); if (!s || s.role !== "admin") return no("Solo un Admin cierra el mes.");
  const m = motivoOk(motivo);
  if (!m) return no("Escribe el motivo.");
  if (!enSusCiudades(s, ciudad)) return no("Esa ciudad no es tuya.");
  const r = await cerrarMes(ciudad, String(mes), s.id, m);
  if (!r.ok) return no(r.mensaje);
  listo();
  return { ok: true, mensaje: `Mes cerrado. Avisamos a ${r.top.length === 1 ? "la persona" : `los ${r.top.length}`} del podio.` };
}

/* Usuarios 360° › Comunidad › Puntos · ajustar ± con motivo y tope por rol. La persona ve el ajuste y el motivo. */
export async function usrAjustarPuntos(uid: string, signo: string | null, cantidad: string, motivo: string): Promise<ResAdm> {
  const s = await staff(); if (!s || !s.puede("usr", "editar")) return no("Tu rol no ajusta puntos.");
  const m = motivoOk(motivo), n = Number(String(cantidad ?? "").replace(/[^\d]/g, "")), tope = topeAjuste(s.role);
  if (!UUID.test(String(uid))) return no("Esa persona no existe.");
  if (signo !== "c" && signo !== "d") return no("Elige sumar o restar.");
  if (!Number.isInteger(n) || n < 1) return no("Escribe la cantidad.");
  if (n > tope) return no(`Tu rol ajusta hasta ${tope.toLocaleString("en-US")} puntos de una vez.`);
  if (!m) return no("Escribe el motivo.");
  if (uid === s.id) return no("Nadie ajusta sus propios puntos.");
  const d = signo === "d" ? -n : n;
  const r = await tx(async (c) => {
    const u = (await c.query<{ ciudad: string | null; antes: number }>(`select u.home_city_id as ciudad, coalesce(cp.points_total, 0) as antes from users u left join community_profiles cp on cp.user_id = u.id where u.id = $1`, [uid])).rows[0];
    if (!u) return "Esa persona no existe.";
    if (!enSusCiudades(s, u.ciudad)) return "Esa persona no es de tus ciudades.";
    await c.query(`select pts_ajustar($1::uuid, $2, $3::uuid, $4)`, [uid, d, s.id, m]);
    await auditar(c, { actor: s.id, action: "gam.puntos.ajustar", targetKind: "user", targetId: uid, city: u.ciudad, before: { puntos: u.antes }, after: { puntos: u.antes + d }, reason: m });
    return null;
  }).catch((e: Error) => (/negativo/.test(String(e?.message)) ? "El ajuste deja los puntos en negativo." : "No se pudo ajustar."));
  if (r) return no(r);
  await avisar(uid, "gam_ajuste", { delta: d > 0 ? `+${d}` : `−${-d}`, motivo: m.slice(0, 160) }, { href: "/comunidad/rango", ref: ["gam_ajuste", `${uid}:${Date.now()}`], sinSms: true });
  await recalcularRango(uid).catch(() => undefined);
  listo();
  return { ok: true, mensaje: "Aplicado. La persona ve el ajuste y el motivo." };
}

/* Usuarios 360° › Comunidad › Puntos · el piso del rango (solo Admin): Coronel (9) por invitación, o bajar por fraude. Con motivo y aviso. */
export async function usrPisoRango(uid: string, nivel: string | null, motivo: string): Promise<ResAdm> {
  const s = await staff(); if (!s || s.role !== "admin") return no("Solo un Admin cambia un rango.");
  const m = motivoOk(motivo), n = Number(nivel);
  if (!UUID.test(String(uid))) return no("Esa persona no existe.");
  if (!Number.isInteger(n) || n < 1 || n > 9) return no("Elige un rango del 1 al 9 (General es una plaza de la Tabla).");
  if (!m) return no("Escribe el motivo.");
  const r = await tx(async (c) => {
    const u = (await c.query<{ ciudad: string | null; antes: number; piso: number }>(`select u.home_city_id as ciudad, coalesce(cp.rank_level, 1) as antes, coalesce(cp.rank_floor, 1) as piso from users u left join community_profiles cp on cp.user_id = u.id where u.id = $1`, [uid])).rows[0];
    if (!u) return "Esa persona no existe.";
    if (!enSusCiudades(s, u.ciudad)) return "Esa persona no es de tus ciudades.";
    const ahora = (await c.query<{ n: number }>(`select pts_piso($1::uuid, $2::smallint, $3::uuid, $4) as n`, [uid, n, s.id, m])).rows[0]!.n;
    await auditar(c, { actor: s.id, action: "gam.rango.piso", targetKind: "user", targetId: uid, city: u.ciudad, before: { rango: u.antes, piso: u.piso }, after: { rango: ahora, piso: n }, reason: m });
    return ahora;
  }).catch(() => "No se pudo cambiar el rango.");
  if (typeof r === "string") return no(r);
  const R = (await rangos()).find((x) => x.n === r);
  await avisarMuchos([uid], "gam_rango_equipo", { es: { rango: R?.name.es ?? String(r), motivo: m.slice(0, 160) }, en: { rango: R?.name.en ?? String(r), motivo: m.slice(0, 160) } }, { href: "/comunidad/rango", ref: ["gam_rango_equipo", `${uid}:${Date.now()}`] });
  listo();
  return { ok: true, mensaje: "Listo. La persona ve su rango nuevo y el motivo." };
}

/* ── 5g · Monedas ── */
/* Las reglas de ganancia (bienvenida y premio del mes): el valor (0–1,000) o apagarla. Cuenta desde ahora; lo ya acreditado no cambia. */
export async function gamMonedaRegla(key: string, valor: string, on: boolean, motivo: string): Promise<ResAdm> {
  const s = await quien(); if (!s) return no("Tu rol no edita monedas.");
  const m = motivoOk(motivo), v = Number(String(valor ?? "").replace(/[^\d]/g, ""));
  if (!m) return no("Escribe el motivo.");
  if (!Number.isInteger(v) || v < 0 || v > 1000) return no("Un valor de 0 a 1,000.");
  const r = await tx(async (c) => {
    const antes = (await c.query<{ coins: number; enabled: boolean }>(`select coins, enabled from coin_rules where key = $1 for update`, [String(key)])).rows[0];
    if (!antes) return "Esa regla no existe.";
    if (antes.coins === v && antes.enabled === !!on) return "No cambió nada.";
    await c.query(`update coin_rules set coins = $2, enabled = $3, updated_by = $4, updated_at = now() where key = $1`, [key, v, !!on, s.id]);
    await auditar(c, { actor: s.id, action: "gam.monedas.regla", targetKind: "coin_rule", targetId: key, before: { monedas: antes.coins, encendida: antes.enabled }, after: { monedas: v, encendida: !!on }, reason: m });
    return null;
  });
  if (r) return no(r);
  listo();
  return { ok: true, mensaje: "Listo. Cuenta desde ahora; lo ya acreditado no cambia." };
}

/* Tope de un ajuste de monedas por rol (prototipo coinAdj: 500): Admin hasta 1,000. */
const topeMonedas = (rol: string) => (rol === "admin" ? 1000 : 500);
/* Usuarios 360° › Comunidad › Monedas · ajustar ± con motivo (nunca por debajo de 0). La persona ve el ajuste y el motivo. */
export async function usrAjustarMonedas(uid: string, signo: string | null, cantidad: string, motivo: string): Promise<ResAdm> {
  const s = await staff(); if (!s || !s.puede("usr", "editar")) return no("Tu rol no ajusta monedas.");
  const m = motivoOk(motivo), n = Number(String(cantidad ?? "").replace(/[^\d]/g, "")), tope = topeMonedas(s.role);
  if (!UUID.test(String(uid))) return no("Esa persona no existe.");
  if (signo !== "c" && signo !== "d") return no("Elige sumar o restar.");
  if (!Number.isInteger(n) || n < 1) return no("Escribe la cantidad.");
  if (n > tope) return no(`Tu rol ajusta hasta ${tope.toLocaleString("en-US")} monedas de una vez.`);
  if (!m) return no("Escribe el motivo.");
  if (uid === s.id) return no("Nadie ajusta sus propias monedas.");
  const d = signo === "d" ? -n : n;
  const r = await tx(async (c) => {
    const u = (await c.query<{ ciudad: string | null; antes: number }>(`select u.home_city_id as ciudad, coalesce(cp.coins, 0) as antes from users u left join community_profiles cp on cp.user_id = u.id where u.id = $1`, [uid])).rows[0];
    if (!u) return "Esa persona no existe.";
    if (!enSusCiudades(s, u.ciudad)) return "Esa persona no es de tus ciudades.";
    await c.query(`select mon_ajustar($1::uuid, $2, $3::uuid, $4)`, [uid, d, s.id, m]);
    await auditar(c, { actor: s.id, action: "gam.monedas.ajustar", targetKind: "user", targetId: uid, city: u.ciudad, before: { monedas: u.antes }, after: { monedas: u.antes + d }, reason: m });
    return null;
  }).catch((e: Error) => (/negativo/.test(String(e?.message)) ? "El ajuste deja las monedas en negativo." : /ciudad/.test(String(e?.message)) ? "La persona no tiene ciudad." : "No se pudo ajustar."));
  if (r) return no(r);
  await avisar(uid, "gam_monedas_ajuste", { delta: d > 0 ? `+${d}` : `−${-d}`, motivo: m.slice(0, 160) }, { href: "/comunidad/monedas", ref: ["gam_monedas_ajuste", `${uid}:${Date.now()}`], sinSms: true });
  listo();
  return { ok: true, mensaje: "Aplicado. La persona ve el ajuste y el motivo." };
}

/* ── 5g · Cupones ── */
type Cup = { id: string; status: string; cost: number | null; pb: string | null; city: string; bid: string; bname: string; title: { es: string; en: string } };
async function cupon(c: { query: (q: string, v: unknown[]) => Promise<{ rows: Cup[] }> }, id: string): Promise<Cup | null> {
  if (!/^\d{1,18}$/.test(String(id))) return null;
  return (await c.query(`select c.id::text, c.status, c.cost_coins as cost, c.paused_by as pb, c.city_id as city, b.id as bid, b.name as bname, c.title
    from coupons c join businesses b on b.id = c.business_id where c.id = $1::bigint for update of c`, [id])).rows[0] ?? null;
}
const EST: Record<string, string> = { pending: "por aprobar", live: "en la Comunidad", paused: "pausado", ended: "terminado" };
const costoOk = (x: unknown) => { const v = Number(String(x ?? "").replace(/[^\d]/g, "")); return Number.isInteger(v) && v >= COSTO_MIN && v <= COSTO_MAX ? v : null; };

/* Aprobar con su costo: sale en la Comunidad y el negocio recibe el aviso con el costo. */
export async function gamCuponAprobar(id: string, costo: string, motivo: string): Promise<ResAdm> {
  const s = await quien("aprobar"); if (!s) return no("Tu rol no aprueba cupones.");
  const m = motivoOk(motivo), v = costoOk(costo);
  if (!v) return no(`El costo va de ${COSTO_MIN} a ${COSTO_MAX.toLocaleString("en-US")} monedas.`);
  if (!m) return no("Escribe el motivo.");
  const r = await tx(async (c) => {
    const x = await cupon(c, id);
    if (!x) return "Ese cupón no existe.";
    if (!enSusCiudades(s, x.city)) return "Esa ciudad no es tuya.";
    if (x.status !== "pending") return "Ese cupón ya no está por aprobar.";
    await c.query(`update coupons set status = 'live', cost_coins = $2, approved_by = $3, approved_at = now() where id = $1::bigint`, [id, v, s.id]);
    await auditar(c, { actor: s.id, action: "gam.cupon.aprobar", targetKind: "coupon", targetId: id, city: x.city, before: { estado: EST.pending }, after: { estado: EST.live, costo: v }, reason: m });
    return x;
  });
  if (typeof r === "string") return no(r);
  await avisarNegocio(r.bid, "biz_cupon_ok", { cupon: r.title.es, costo: v }, { href: `/panel/${r.bid}/pagina/cup`, ref: ["coupon", id] });
  listo();
  return { ok: true, mensaje: `Aprobado a ${v} monedas. Ya sale en la Comunidad; avisamos al negocio.` };
}

/* Rechazar uno por aprobar (termina con motivo; el negocio recibe el aviso). */
export async function gamCuponRechazar(id: string, motivo: string): Promise<ResAdm> {
  const s = await quien("aprobar"); if (!s) return no("Tu rol no aprueba cupones.");
  const m = motivoOk(motivo);
  if (!m) return no("Escribe el motivo.");
  const r = await tx(async (c) => {
    const x = await cupon(c, id);
    if (!x) return "Ese cupón no existe.";
    if (!enSusCiudades(s, x.city)) return "Esa ciudad no es tuya.";
    if (x.status !== "pending") return "Ese cupón ya no está por aprobar.";
    await c.query(`update coupons set status = 'ended', ended_by = 'admin', ended_reason = $2, ended_at = now() where id = $1::bigint`, [id, m]);
    await auditar(c, { actor: s.id, action: "gam.cupon.rechazar", targetKind: "coupon", targetId: id, city: x.city, before: { estado: EST.pending }, after: { estado: EST.ended }, reason: m });
    return x;
  });
  if (typeof r === "string") return no(r);
  await avisarNegocio(r.bid, "biz_cupon_no", { cupon: r.title.es, motivo: m.slice(0, 160) }, { href: `/panel/${r.bid}/pagina/cup`, ref: ["coupon", id] });
  listo();
  return { ok: true, mensaje: "No sale. Le avisamos al negocio el motivo." };
}

/* Cambiar el costo (de aquí en adelante; los códigos ya canjeados guardan lo que costaron). */
export async function gamCuponCosto(id: string, costo: string, motivo: string): Promise<ResAdm> {
  const s = await quien(); if (!s) return no("Tu rol no edita cupones.");
  const m = motivoOk(motivo), v = costoOk(costo);
  if (!v) return no(`El costo va de ${COSTO_MIN} a ${COSTO_MAX.toLocaleString("en-US")} monedas.`);
  if (!m) return no("Escribe el motivo.");
  const r = await tx(async (c) => {
    const x = await cupon(c, id);
    if (!x) return "Ese cupón no existe.";
    if (!enSusCiudades(s, x.city)) return "Esa ciudad no es tuya.";
    if (x.status !== "live" && x.status !== "paused") return "Solo se cambia el costo de un cupón aprobado.";
    if (x.cost === v) return "Ese ya es su costo.";
    await c.query(`update coupons set cost_coins = $2 where id = $1::bigint`, [id, v]);
    await auditar(c, { actor: s.id, action: "gam.cupon.costo", targetKind: "coupon", targetId: id, city: x.city, before: { costo: x.cost }, after: { costo: v }, reason: m });
    return null;
  });
  if (r) return no(r);
  listo();
  return { ok: true, mensaje: "Costo cambiado. Cuenta para los canjes de aquí en adelante." };
}

/* Pausar con motivo: sale de la Comunidad al instante (los códigos ya canjeados siguen valiendo); el negocio recibe el aviso. */
export async function gamCuponPausar(id: string, motivo: string): Promise<ResAdm> {
  const s = await quien(); if (!s) return no("Tu rol no edita cupones.");
  const m = motivoOk(motivo);
  if (!m) return no("Escribe el motivo.");
  const r = await tx(async (c) => {
    const x = await cupon(c, id);
    if (!x) return "Ese cupón no existe.";
    if (!enSusCiudades(s, x.city)) return "Esa ciudad no es tuya.";
    if (x.status !== "live" && !(x.status === "paused" && x.pb === "business")) return "Solo se pausa un cupón aprobado.";
    await c.query(`update coupons set status = 'paused', paused_by = 'admin', paused_reason = $2, paused_at = now() where id = $1::bigint`, [id, m]);
    await auditar(c, { actor: s.id, action: "gam.cupon.pausar", targetKind: "coupon", targetId: id, city: x.city, before: { estado: EST[x.status] }, after: { estado: "pausado por To'Latino" }, reason: m });
    return x;
  });
  if (typeof r === "string") return no(r);
  await avisarNegocio(r.bid, "biz_cupon_pausa", { cupon: r.title.es, motivo: m.slice(0, 160) }, { href: `/panel/${r.bid}/pagina/cup`, ref: ["coupon", id] });
  listo();
  return { ok: true, mensaje: "Pausado. Ya no sale en la Comunidad; avisamos al negocio el motivo." };
}

/* Activar uno que pausó el equipo. */
export async function gamCuponActivar(id: string, motivo: string): Promise<ResAdm> {
  const s = await quien(); if (!s) return no("Tu rol no edita cupones.");
  const m = motivoOk(motivo);
  if (!m) return no("Escribe el motivo.");
  const r = await tx(async (c) => {
    const x = await cupon(c, id);
    if (!x) return "Ese cupón no existe.";
    if (!enSusCiudades(s, x.city)) return "Esa ciudad no es tuya.";
    if (x.status !== "paused" || x.pb !== "admin") return "Solo se activa un cupón que pausó el equipo.";
    await c.query(`update coupons set status = 'live', paused_by = null, paused_reason = null, paused_at = null where id = $1::bigint`, [id]);
    await auditar(c, { actor: s.id, action: "gam.cupon.activar", targetKind: "coupon", targetId: id, city: x.city, before: { estado: "pausado por To'Latino" }, after: { estado: EST.live }, reason: m });
    return x;
  });
  if (typeof r === "string") return no(r);
  await avisarNegocio(r.bid, "biz_cupon_ok", { cupon: r.title.es, costo: r.cost ?? 0 }, { href: `/panel/${r.bid}/pagina/cup`, ref: ["coupon", id] });
  listo();
  return { ok: true, mensaje: "Otra vez en la Comunidad. Avisamos al negocio." };
}
