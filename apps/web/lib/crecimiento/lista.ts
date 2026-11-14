import "server-only";
import { cookies } from "next/headers";
import { ErrorCuenta, pedirCodigo, verificarCodigo } from "../cuenta";
import { db, tx } from "../db";
import { ciudades, type Ciudad } from "../ubicacion";
import { CODIGO, MODOS, mal, type Bi, type Modo, type Res } from "./comun";

/* 9h · La lista de acceso anticipado (la landing, fase9-apertura.md §4 9h, §6 #14; memoria Coming Soon v3): código postal + teléfono → el código de entrada
   (el mismo de siempre, con sus topes por teléfono y por dirección: lib/cuenta.ts) → la persona queda con cuenta verificada (decisión E) y en la lista.
   - El código postal decide la ciudad (exacto, o por sus tres primeros números si son de una sola de las cinco); de fuera → «Pide tu ciudad» (city_waitlist,
     lo que ya mira Super Admin › Ciudades) con «CP xxxxx».
   - En la lista de la ciudad también queda en city_waitlist («Avísame»): es lo que 9i avisa el día que abra. La landing promete UN mensaje: «Te avisamos
     por mensaje de texto cuando abra tu zona. Nada más.» — por eso NO enciende «Novedades» (mkt): las campañas no le llegan.
   - «Tengo un negocio»: cómo trabaja y el nombre; queda la ciudad puesta para Publica tu negocio (la ciudad está en «pronto»: su página se ve el día que abra).
   - Fundadores (solo insignia): el número lo pone la base (early_access_reglas, con candado por ciudad).
   - Datos: la cuenta (user_id), el código postal y lo del negocio. El teléfono vive solo en users (no se copia); ni IP ni dispositivo aquí.
   - «Quitarme de la lista»: removed_at (nada se borra) y sale también de city_waitlist. */

const ZIP = /^\d{5}$/;
export function ciudadDeZip(cs: Ciudad[], zip: string): Ciudad | null {
  if (!ZIP.test(zip)) return null;
  const exacta = cs.find((c) => c.zips.includes(zip));
  if (exacta) return exacta;
  const p = zip.slice(0, 3), por = cs.filter((c) => c.zips.some((z) => z.startsWith(p)));
  return por.length === 1 ? por[0]! : null;
}

type Negocio = { modo: string | null; nombre: string | null } | null;
export type Lugar = { n: number; ciudad: { id: string; name: string; status: string } | null; zip: string; asked: string | null; fundadorVecino: number | null; fundadorNegocio: number | null;
  tieneNegocio: boolean; modo: Modo | null; nombreNegocio: string | null; metaVecinos: number; metaNegocios: number };

export async function miLugar(userId: string): Promise<Lugar | null> {
  const r = (await db().query<{ zip: string; city_id: string | null; asked_city: string | null; fv: number | null; fn: number | null; hb: boolean; modo: Modo | null; nombre: string | null; n: number; mv: number; mn: number }>(
    `select e.zip, e.city_id, e.asked_city, e.founder_vecino_n as fv, e.founder_negocio_n as fn, e.has_business as hb, e.business_kind as modo, e.business_name as nombre,
            (select count(*)::int from early_access x where x.removed_at is null
                and (case when e.city_id is null then x.city_id is null and lower(x.asked_city) = lower(e.asked_city) else x.city_id = e.city_id end)
                and (x.created_at, x.id) <= (e.created_at, e.id)) as n,
            cfg_int('fundadores_vecinos') as mv, cfg_int('fundadores_negocios') as mn
       from early_access e where e.user_id = $1 and e.removed_at is null`, [userId])).rows[0];
  if (!r) return null;
  const c = r.city_id ? (await ciudades()).find((x) => x.id === r.city_id) : null;
  return { n: r.n, ciudad: c ? { id: c.id, name: c.name, status: c.status } : null, zip: r.zip, asked: r.asked_city, fundadorVecino: r.fv, fundadorNegocio: r.fn, tieneNegocio: r.hb, modo: r.modo,
    nombreNegocio: r.nombre, metaVecinos: r.mv, metaNegocios: r.mn };
}

/* Paso 1: el código postal y el teléfono → el código de entrada (en el sandbox se ve en pantalla, MODO PRUEBAS). */
export async function pedirCodigoLista(zip: string, tel: string): Promise<Res<{ reenviarEn?: number; codigoPrueba?: string; ciudad?: { id: string; name: string } | null }>> {
  const z = String(zip ?? "").trim();
  if (!ZIP.test(z)) return mal("El código postal son 5 números.", "The ZIP code is 5 digits.");
  const c = ciudadDeZip(await ciudades(), z);
  try {
    const r = await pedirCodigo(String(tel ?? ""));
    return { ok: true, msg: { es: "Te mandamos el código.", en: "We sent you the code." }, reenviarEn: r.reenviarEn, codigoPrueba: r.codigoPrueba, ciudad: c ? { id: c.id, name: c.name } : null };
  } catch (e) { return { ok: false, msg: errorCuenta(e) }; }
}

/* Paso 2: el código → la cuenta (o la de siempre, si ya tenía) → la lista. */
export async function anotarse(p: { zip: string; tel: string; codigo: string; negocio: Negocio; lang: string }): Promise<Res<{ lugar?: Lugar; ya?: boolean }>> {
  const z = String(p.zip ?? "").trim();
  if (!ZIP.test(z)) return mal("El código postal son 5 números.", "The ZIP code is 5 digits.");
  const neg = p.negocio ? { modo: MODOS.includes(p.negocio.modo as Modo) ? (p.negocio.modo as Modo) : null, nombre: String(p.negocio.nombre ?? "").replace(/\s+/g, " ").trim().slice(0, 60) || null } : null;
  if (neg && neg.nombre && neg.nombre.length < 2) return mal("El nombre del negocio es muy corto.", "The business name is too short.");
  let uid: string;
  try { uid = (await verificarCodigo(String(p.tel ?? ""), String(p.codigo ?? ""))).id; } catch (e) { return { ok: false, msg: errorCuenta(e) }; }
  return ponerEnLista(uid, z, neg, p.lang === "en" ? "en" : "es");
}

/* Con sesión (ya entró): anotarse sin otro código. */
export async function anotarseConSesion(uid: string, zip: string, negocio: Negocio, lang: string): Promise<Res<{ lugar?: Lugar; ya?: boolean }>> {
  const z = String(zip ?? "").trim();
  if (!ZIP.test(z)) return mal("El código postal son 5 números.", "The ZIP code is 5 digits.");
  const neg = negocio ? { modo: MODOS.includes(negocio.modo as Modo) ? (negocio.modo as Modo) : null, nombre: String(negocio.nombre ?? "").replace(/\s+/g, " ").trim().slice(0, 60) || null } : null;
  return ponerEnLista(uid, z, neg, lang === "en" ? "en" : "es");
}

async function ponerEnLista(uid: string, zip: string, neg: { modo: Modo | null; nombre: string | null } | null, lang: "es" | "en"): Promise<Res<{ lugar?: Lugar; ya?: boolean }>> {
  const c = ciudadDeZip(await ciudades(), zip), asked = c ? null : `CP ${zip}`;
  const jar = await cookies(), src0 = (jar.get("tl_src")?.value ?? "").toUpperCase(), src = CODIGO.test(src0) ? src0 : null;
  const ya = await tx(async (q) => {
    const antes = (await q.query<{ id: string; removed: boolean }>(`select id::text, removed_at is not null as removed from early_access where user_id = $1 for update`, [uid])).rows[0];
    const fuente = src && (await q.query(`select 1 from short_links where code = $1`, [src])).rowCount ? src : null;
    if (antes && !antes.removed) {
      // Ya estaba: solo suma lo del negocio si ahora lo dice (el lugar en la fila no cambia).
      if (neg) await q.query(`update early_access set has_business = true, business_kind = coalesce($2, business_kind), business_name = coalesce($3, business_name) where id = $1::bigint`, [antes.id, neg.modo, neg.nombre]);
      return true;
    }
    if (antes) await q.query(`update early_access set removed_at = null, created_at = created_at, zip = $2, city_id = $3, asked_city = $4, has_business = $5, business_kind = $6, business_name = $7, lang = $8 where id = $1::bigint`,
      [antes.id, zip, c?.id ?? null, asked, !!neg, neg?.modo ?? null, neg?.nombre ?? null, lang]);
    else await q.query(`insert into early_access (user_id, zip, city_id, asked_city, has_business, business_kind, business_name, source_code, lang, is_test)
                        select $1, $2, $3, $4, $5, $6, $7, $8, $9, u.is_test from users u where u.id = $1`, [uid, zip, c?.id ?? null, asked, !!neg, neg?.modo ?? null, neg?.nombre ?? null, fuente, lang]);
    // «Avísame»: la lista de la ciudad que 9i avisa al abrir (o «Pide tu ciudad» con el código postal).
    if (!(await q.query(`select 1 from city_waitlist where user_id = $1 and removed_at is null and (case when $2::text is null then city_id is null and lower(city_name) = lower($3) else city_id = $2 end)`, [uid, c?.id ?? null, asked])).rowCount)
      await q.query(`insert into city_waitlist (city_id, city_name, user_id, source, wants) values ($1, $2, $3, 'coming_soon', $4)`, [c?.id ?? null, asked, uid, neg ? ["negocio"] : []]);
    // La ciudad queda puesta en la cuenta (Publica tu negocio y la pantalla «pronto» de esa ciudad).
    if (c) await q.query(`update users set viewing_city_id = $2, viewing_center = 'centro', viewing_radius_mi = $3 where id = $1`, [uid, c.id, c.radio]);
    return false;
  });
  const lugar = await miLugar(uid);
  if (!lugar) return mal("No se pudo anotar. Intenta otra vez.", "Could not sign you up. Try again.");
  return { ok: true, msg: ya ? { es: "Ya estabas en la lista.", en: "You were already on the list." } : { es: "Estás en la lista.", en: "You are on the list." }, lugar, ya };
}

export async function quitarme(uid: string): Promise<Res> {
  return tx(async (q) => {
    const r = await q.query(`update early_access set removed_at = now() where user_id = $1 and removed_at is null`, [uid]);
    if (!r.rowCount) return mal("No estabas en la lista.", "You were not on the list.");
    await q.query(`update city_waitlist set removed_at = now() where user_id = $1 and source = 'coming_soon' and removed_at is null`, [uid]);
    return { ok: true as const, msg: { es: "Te quitamos de la lista. No te vamos a escribir.", en: "We took you off the list. We will not text you." } };
  });
}

/* Cifras de la landing (sin personas): cuántos esperan en total y por ciudad, cuántos negocios apartaron. */
export async function cifrasLanding(): Promise<{ total: number; negocios: number; porCiudad: Record<string, number> }> {
  const r = await db().query<{ city_id: string | null; n: number; neg: number }>(
    `select city_id, count(*)::int as n, count(*) filter (where has_business)::int as neg from early_access where removed_at is null group by city_id`);
  const porCiudad: Record<string, number> = {};
  let total = 0, negocios = 0;
  for (const x of r.rows) { total += x.n; negocios += x.neg; if (x.city_id) porCiudad[x.city_id] = x.n; }
  return { total, negocios, porCiudad };
}

const MSG: Record<string, Bi> = {
  telefono_invalido: { es: "Revisa el número: son 10 dígitos de EE. UU.", en: "Check the number: 10 US digits." },
  codigo_invalido: { es: "El código son 6 números.", en: "The code is 6 digits." },
  codigo_incorrecto: { es: "Ese código no es. Revísalo e inténtalo otra vez.", en: "That code isn't right. Check it and try again." },
  codigo_vencido: { es: "El código venció. Pide uno nuevo.", en: "The code expired. Ask for a new one." },
  espera: { es: "Espera unos segundos para pedir otro código.", en: "Wait a few seconds to ask for another code." },
  demasiados: { es: "Demasiados intentos. Prueba otra vez en una hora.", en: "Too many tries. Try again in an hour." },
  cuenta_bloqueada: { es: "Esta cuenta no puede entrar. Escríbele a Soporte.", en: "This account can't sign in. Contact Support." },
  dispositivo_bloqueado: { es: "Desde este dispositivo no se puede. Escríbele a Soporte.", en: "You can't do this from this device. Contact Support." },
  sin_proveedor: { es: "No pudimos mandar el código ahora. Inténtalo en un rato.", en: "We couldn't send the code right now. Try again soon." },
};
function errorCuenta(e: unknown): Bi {
  if (e instanceof ErrorCuenta) return e.detalle ?? MSG[e.codigo] ?? { es: "No se pudo completar.", en: "Couldn't complete." };
  console.error("[lista]", e);
  return { es: "Algo falló de nuestro lado. Inténtalo otra vez.", en: "Something failed on our side. Try again." };
}
