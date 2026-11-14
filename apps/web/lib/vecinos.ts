import "server-only";
import type { PoolClient } from "pg";
import { avisar } from "./avisos";
import { db, tx } from "./db";
import { insignias } from "./puntos";
import { acreditar, avisarMonedas, saldo } from "./monedas";
import { MAX_APODO, revisarPerfil, revisarTexto } from "./comunidad-filtro";
import type { Pub } from "./comunidad-comun";
import { COLS, ISO, JOINS, UUID, armar, corto, enComunidad, ini, no, sinBloqueo, sinBloqueos, type Fila, type Res } from "./comunidad";
import { numeroVecino } from "./direcciones";
import { meEscribio } from "./mensajes-vecinos";

/* Comunidad · Vecinos (APP-COM-VECINO, Mi cuenta › Siguiendo · Seguidores · Bloqueados y silenciados, APP-COM-BIENVENIDA;
   fase5-comunidad.md §4 5c). Reglas, todas aquí y en la base (0099):
   - Bloquear es mutuo e invisible: con un bloqueo de por medio, en cualquier sentido, la otra persona no existe en ninguna
     superficie (perfil, listas, mensajes, avisos, sugerencias). Cada consulta de personas lleva sinBloqueo(persona, viewer) y la de
     contenido sinBloqueos(autor, viewer) (que además esconde a quien silenciaste). La respuesta para «te bloquearon» es la misma
     que para «no existe»: «No encontramos a este vecino».
   - Bloquear deja de seguir en los dos sentidos y cierra la conversación sin avisar (lo hace la base, user_blocks_despues); Deshacer
     lo devuelve. Silenciar: no ves lo que publica ni comenta y no te llegan sus avisos; la otra persona no se entera.
   - Seguir no da puntos. Quien te sigue te puede recibir mensajes (lib/mensajes-vecinos.ts).
   - Solo existe en la Comunidad quien hizo la bienvenida y declaró 18 años o más (nunca una fecha de nacimiento). */
type Bi = { es: string; en: string };
export { sinBloqueos, sinBloqueo };
export const POR_PAGINA_VEC = 30;
const NO_ESTA = () => no("No encontramos a este vecino.", "We could not find this neighbor.");
const ENTRA_COM = () => no("Antes de seguir, termina tu bienvenida a la Comunidad.", "Before continuing, finish your Community welcome.");

/* Una persona que quien mira puede ver: existe, su cuenta está activa (o silenciada por sanción), entró a la Comunidad (18+) y no
   hay un bloqueo de por medio. */
const VISIBLE = (u: string, viewer: string) => `cuenta_estado(${u}.status, ${u}.status_until) in ('active', 'muted')
  and exists (select 1 from community_profiles vc where vc.user_id = ${u}.id and vc.adult is true and vc.welcome_at is not null)
  and ${sinBloqueo(`${u}.id`, viewer)}`;
async function personaVisible(c: Pick<PoolClient, "query">, viewer: string, id: string) {
  if (!UUID.test(id)) return null;
  return (await c.query<{ id: string; first_name: string | null; last_name: string | null }>(
    `select u.id::text, u.first_name, u.last_name from users u where u.id = $2 and ${VISIBLE("u", "$1")}`, [viewer, id])).rows[0] ?? null;
}

/* ── El perfil (APP-COM-VECINO) ── */
export type Vecino = {
  id: string; yo: boolean; nombre: string; apodo: string | null; ini: string; foto: string | null; rango: number; zona: Bi | null; ciudad: string | null;
  desde: number | null; fundador: number | null; bio: string | null; cuentas: { seguidores: number; siguiendo: number; publicaciones: number } | null; ocultar: boolean;
  yoSigo: boolean; meSigue: boolean; silenciado: boolean; puedeEscribir: boolean; pubs: Pub[]; mas: string | null;
  insignias: { k: string; t: Bi; s: Bi }[]; puntos: number; // 5f
  monedas: number | null; // 5g · solo en mi propio perfil (las monedas de otra persona no se muestran)
};
type FilaVec = {
  id: string; first_name: string | null; last_name: string | null; nick: string | null; photo_url: string | null; rango: number; bio: string | null; since_year: number | null;
  hide_counts: boolean; seg: number; sig: number; pubs: number; zona: Bi | null; ciudad: string | null; yo_sigo: boolean; me_sigue: boolean; silenciado: boolean;
};
/* `id` = la persona o «yo». null = no existe para quien mira (o hay un bloqueo: la misma respuesta). */
export async function perfilVecino(viewer: string, id: string, cursor: string | null = null): Promise<Vecino | null> {
  const quien = id === "yo" ? viewer : id;
  if (!UUID.test(quien)) return null;
  const yo = quien === viewer;
  const r = (await db().query<FilaVec>(
    `select u.id::text, u.first_name, u.last_name, u.nick, u.photo_url, coalesce(cp.rank_level, 1) as rango, cp.bio, cp.since_year, coalesce(cp.hide_counts, false) as hide_counts,
            coalesce(cp.followers_n, 0) as seg, coalesce(cp.following_n, 0) as sig, coalesce(cp.posts_n, 0) as pubs, z.name as zona, c.name || ', ' || c.state as ciudad,
            exists (select 1 from follows f where f.follower_user_id = $1 and f.target_kind = 'user' and f.target_id = u.id::text) as yo_sigo,
            exists (select 1 from follows f where f.follower_user_id = u.id and f.target_kind = 'user' and f.target_id = $1::uuid::text) as me_sigue,
            exists (select 1 from user_blocks b where b.user_id = $1 and b.target_user_id = u.id and b.kind = 'mute' and b.removed_at is null) as silenciado
       from users u left join community_profiles cp on cp.user_id = u.id left join zones z on z.city_id = u.home_city_id and z.id = u.zone_id left join cities c on c.id = u.home_city_id
      where u.id = $2 and ${VISIBLE("u", "$1")}`, [viewer, quien])).rows[0];
  if (!r) return null;
  const n = corto(r.first_name, r.last_name), [num, escribio, ins, pts] = await Promise.all([numeroVecino(r.id), yo ? false : meEscribio(viewer, r.id), insignias(r.id),
    db().query<{ p: number; m: number }>(`select coalesce((select points_total from community_profiles where user_id = $1), 0) as p, coalesce((select coins from community_profiles where user_id = $1), 0) as m`, [r.id])]);
  const { pubs, mas } = r.silenciado && !yo ? { pubs: [], mas: null } : await publicacionesDe(viewer, r.id, cursor);
  return {
    id: r.id, yo, nombre: n, apodo: r.nick, ini: ini(n), foto: r.photo_url, rango: r.rango, zona: r.zona, ciudad: r.ciudad, desde: r.since_year,
    fundador: num?.founder ? num.n : null, bio: r.bio, ocultar: r.hide_counts,
    cuentas: r.hide_counts && !yo ? null : { seguidores: r.seg, siguiendo: r.sig, publicaciones: r.pubs },
    yoSigo: r.yo_sigo, meSigue: r.me_sigue, silenciado: r.silenciado, puedeEscribir: !yo && (r.me_sigue || escribio), pubs, mas,
    insignias: ins, puntos: pts.rows[0]!.p, monedas: yo ? pts.rows[0]!.m : null,
  };
}

/* Lo que publicó una persona, para quien mira (con bloqueos y silencios), de 20 en 20 por (created_at, id). */
export async function publicacionesDe(viewer: string, autor: string, cursor: string | null) {
  const v: unknown[] = [viewer, autor], w = ["p.author_user_id = $2", "p.author_kind = 'user'", "p.status = 'visible'", "p.publish_at <= now()", sinBloqueos("p.author_user_id", "$1"),
    "not exists (select 1 from com_hidden_for h where h.user_id = $1 and h.target_kind = 'post' and h.target_id = p.id)"];
  if (cursor && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z\|\d{1,18}$/.test(cursor)) { const [a, b] = cursor.split("|"); v.push(a, b); w.push(`(p.created_at, p.id) < ($3::timestamptz, $4::bigint)`); }
  const L = (await db().query<Fila & { cur_pf: string }>(
    `select ${COLS(null)}, to_char(p.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') || '|' || p.id as cur_pf
       from com_posts p ${JOINS} where ${w.join(" and ")} order by p.created_at desc, p.id desc limit 21`, v)).rows;
  const filas = L.slice(0, 20);
  return { pubs: await armar(filas, viewer), mas: L.length > 20 ? filas.at(-1)!.cur_pf : null };
}

/* ── Seguir ── */
export async function seguir(userId: string, target: string): Promise<Res<{ sigues: boolean }>> {
  if (!UUID.test(target) || target === userId) return NO_ESTA();
  const r = await tx(async (c) => {
    if (!(await enComunidad(userId, c)).ok) return ENTRA_COM();
    const t = await personaVisible(c, userId, target);
    if (!t) return NO_ESTA();
    const ins = await c.query(`insert into follows (follower_user_id, target_kind, target_id) values ($1, 'user', $2) on conflict do nothing`, [userId, target]);
    return { ok: true as const, sigues: true, nuevo: (ins.rowCount ?? 0) > 0 };
  }).catch((e) => { if (/bloqueo|sí mismo/.test(String(e?.message))) return NO_ESTA(); throw e; });
  if (!r.ok) return r;
  // Aviso a quien sigues (una vez cada 30 días por persona; nunca si te silenció).
  if ("nuevo" in r && r.nuevo) {
    const puede = (await db().query(
      `select 1 from users u where u.id = $2 and not exists (select 1 from user_blocks b where b.user_id = $2 and b.target_user_id = $1 and b.removed_at is null)
          and not exists (select 1 from notifications n where n.user_id = $2 and n.tpl = 'com_follow' and n.actor_user_id = $1 and n.created_at > now() - interval '30 days')`, [userId, target])).rowCount;
    if (puede) {
      const yo = (await db().query<{ f: string | null; l: string | null }>(`select first_name as f, last_name as l from users where id = $1`, [userId])).rows[0];
      await avisar(target, "com_follow", { nombre: corto(yo?.f ?? null, yo?.l ?? null) }, { href: `/comunidad/v/${userId}`, ref: ["user", userId], actor: userId });
    }
  }
  return { ok: true, sigues: true };
}
export async function dejarDeSeguir(userId: string, target: string): Promise<Res<{ sigues: boolean }>> {
  if (!UUID.test(target)) return NO_ESTA();
  await db().query(`delete from follows where follower_user_id = $1 and target_kind = 'user' and target_id = $2`, [userId, target]);
  return { ok: true, sigues: false };
}

/* ── Bloquear, silenciar y deshacer ── Bloquear funciona aunque la otra persona ya te haya bloqueado (no revela nada y el bloqueo
   queda de los dos lados). Silenciar pide que la persona exista para ti. */
export async function bloquear(userId: string, target: string): Promise<Res> {
  if (!UUID.test(target) || target === userId) return NO_ESTA();
  const u = (await db().query(`select 1 from users where id = $1`, [target])).rowCount;
  if (!u) return NO_ESTA();
  await db().query(`insert into user_blocks (user_id, target_user_id, kind) values ($1, $2, 'block') on conflict (user_id, target_user_id, kind) where removed_at is null do nothing`, [userId, target]);
  return { ok: true };
}
export async function silenciar(userId: string, target: string): Promise<Res> {
  if (!UUID.test(target) || target === userId) return NO_ESTA();
  if (!(await personaVisible(db(), userId, target))) return NO_ESTA();
  await db().query(`insert into user_blocks (user_id, target_user_id, kind) values ($1, $2, 'mute') on conflict (user_id, target_user_id, kind) where removed_at is null do nothing`, [userId, target]);
  return { ok: true };
}
export async function deshacer(userId: string, target: string, kind: "block" | "mute"): Promise<Res> {
  if (!UUID.test(target) || (kind !== "block" && kind !== "mute")) return NO_ESTA();
  await db().query(`update user_blocks set removed_at = now() where user_id = $1 and target_user_id = $2 and kind = $3 and removed_at is null`, [userId, target, kind]);
  return { ok: true };
}

/* ── Listas de Mi cuenta (cursor por (created_at, id)) ── */
export type Persona = { id: string; nombre: string; ini: string; foto: string | null; rango: number; lugar: string; yoSigo: boolean; meSigue: boolean; at: string };
type FilaP = { id: string; first_name: string | null; last_name: string | null; photo_url: string | null; rango: number; zona: Bi | null; ciudad: string | null; yo_sigo: boolean; me_sigue: boolean; at: string; cur: string };
const PERSONA = (u: string) => `${u}.id::text, ${u}.first_name, ${u}.last_name, ${u}.photo_url, coalesce(pc.rank_level, 1) as rango, pz.name as zona, pci.name || ', ' || pci.state as ciudad,
  exists (select 1 from follows a where a.follower_user_id = $1 and a.target_kind = 'user' and a.target_id = ${u}.id::text) as yo_sigo,
  exists (select 1 from follows b where b.follower_user_id = ${u}.id and b.target_kind = 'user' and b.target_id = $1::uuid::text) as me_sigue`;
const PJOIN = (u: string) => `left join community_profiles pc on pc.user_id = ${u}.id left join zones pz on pz.city_id = ${u}.home_city_id and pz.id = ${u}.zone_id left join cities pci on pci.id = ${u}.home_city_id`;
const persona = (x: FilaP, es: boolean): Persona => {
  const n = corto(x.first_name, x.last_name);
  return { id: x.id, nombre: n, ini: ini(n), foto: x.photo_url, rango: x.rango, lugar: [x.zona ? (es ? x.zona.es : x.zona.en) : null, x.ciudad].filter(Boolean).join(" · "), yoSigo: x.yo_sigo, meSigue: x.me_sigue, at: x.at };
};
const CUR = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z\|[0-9a-f-]{36}$/;
/* A quién sigues: en cualquier ciudad, con su ciudad a la vista. */
export async function siguiendo(viewer: string, cursor: string | null, es = true) {
  const c = cursor && CUR.test(cursor) ? cursor.split("|") : null;
  const L = (await db().query<FilaP>(
    `select ${PERSONA("u")}, ${ISO("f.created_at")} as at, to_char(f.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') || '|' || f.target_id as cur
       from follows f join users u on u.id = f.target_id::uuid ${PJOIN("u")}
      where f.follower_user_id = $1 and f.target_kind = 'user' and ${VISIBLE("u", "$1")}
        and ($2::timestamptz is null or (f.created_at, f.target_id) < ($2::timestamptz, $3::text))
      order by f.created_at desc, f.target_id desc limit ${POR_PAGINA_VEC + 1}`, [viewer, c?.[0] ?? null, c?.[1] ?? null])).rows;
  return { items: L.slice(0, POR_PAGINA_VEC).map((x) => persona(x, es)), mas: L.length > POR_PAGINA_VEC ? L[POR_PAGINA_VEC - 1]!.cur : null };
}
/* Quién te sigue (y a quién de ellos sigues de vuelta). */
export async function seguidores(viewer: string, cursor: string | null, es = true) {
  const c = cursor && CUR.test(cursor) ? cursor.split("|") : null;
  const L = (await db().query<FilaP>(
    `select ${PERSONA("u")}, ${ISO("f.created_at")} as at, to_char(f.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') || '|' || f.follower_user_id as cur
       from follows f join users u on u.id = f.follower_user_id ${PJOIN("u")}
      where f.target_kind = 'user' and f.target_id = $1::uuid::text and ${VISIBLE("u", "$1")}
        and ($2::timestamptz is null or (f.created_at, f.follower_user_id) < ($2::timestamptz, $3::uuid))
      order by f.created_at desc, f.follower_user_id desc limit ${POR_PAGINA_VEC + 1}`, [viewer, c?.[0] ?? null, c?.[1] ?? null])).rows;
  return { items: L.slice(0, POR_PAGINA_VEC).map((x) => persona(x, es)), mas: L.length > POR_PAGINA_VEC ? L[POR_PAGINA_VEC - 1]!.cur : null };
}
/* A quién bloqueaste o silenciaste (con Deshacer). Solo lo tuyo: nunca quién te bloqueó a ti. */
export async function bloqueadosYSilenciados(viewer: string, cursor: string | null, es = true) {
  const c = cursor && /^\d{1,18}$/.test(cursor) ? cursor : null;
  const L = (await db().query<FilaP & { kind: "block" | "mute"; bid: string }>(
    `select ${PERSONA("u")}, b.kind, b.id::text as bid, ${ISO("b.created_at")} as at, b.id::text as cur
       from user_blocks b join users u on u.id = b.target_user_id ${PJOIN("u")}
      where b.user_id = $1 and b.removed_at is null and ($2::bigint is null or b.id < $2::bigint)
      order by b.id desc limit ${POR_PAGINA_VEC + 1}`, [viewer, c])).rows;
  return { items: L.slice(0, POR_PAGINA_VEC).map((x) => ({ ...persona(x, es), kind: x.kind })), mas: L.length > POR_PAGINA_VEC ? L[POR_PAGINA_VEC - 1]!.cur : null };
}
export type PersonaB = Awaited<ReturnType<typeof bloqueadosYSilenciados>>["items"][number];

/* Vecinos para seguir (bienvenida y muro): de su ciudad, en la Comunidad, sin bloqueos, que todavía no sigue; los de más rango y
   seguidores primero. Seguir no da puntos: es solo para empezar con gente que ayuda. */
export async function sugeridos(viewer: string, ciudad: string, n = 4, es = true) {
  const L = (await db().query<FilaP>(
    `select ${PERSONA("u")}, ${ISO("u.created_at")} as at, '' as cur
       from users u join community_profiles cp on cp.user_id = u.id ${PJOIN("u")}
      where u.home_city_id = $2 and u.id <> $1 and ${VISIBLE("u", "$1")}
        and not exists (select 1 from follows f where f.follower_user_id = $1 and f.target_kind = 'user' and f.target_id = u.id::text)
        and not exists (select 1 from user_blocks m where m.user_id = $1 and m.target_user_id = u.id and m.removed_at is null)
      order by cp.rank_level desc, cp.followers_n desc, u.id limit $3`, [viewer, ciudad, Math.min(10, Math.max(1, n))])).rows;
  return L.map((x) => persona(x, es));
}

/* ── Mi perfil: presentación, cómo te dicen, desde cuándo, ocultar cuentas ── */
export type EdicionPerfil = { bio?: string | null; apodo?: string | null; desde?: number | null; ocultar?: boolean };
export async function editarPerfil(userId: string, p: EdicionPerfil): Promise<Res> {
  const f = revisarPerfil({ bio: p.bio, apodo: p.apodo });
  if (f) return { ok: false, msg: f.msg, campo: f.campo };
  const anio = new Date().getFullYear(), desde = p.desde == null || p.desde === 0 ? null : Number(p.desde);
  if (desde != null && (!Number.isInteger(desde) || desde < 1950 || desde > anio)) return no(`El año en que llegaste, entre 1950 y ${anio}.`, `The year you arrived, between 1950 and ${anio}.`);
  const bio = String(p.bio ?? "").trim() || null, apodo = String(p.apodo ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_APODO) || null;
  return tx(async (c) => {
    if (!(await enComunidad(userId, c)).ok) return ENTRA_COM();
    const lang = (await c.query<{ lang: string }>(`select coalesce(lang, 'es') as lang from users where id = $1`, [userId])).rows[0]?.lang === "en" ? "en" : "es";
    await c.query(`update community_profiles set bio = $2, bio_lang = case when $2::text is null then null else $3 end, since_year = $4, hide_counts = $5 where user_id = $1`, [userId, bio, lang, desde, !!p.ocultar]);
    await c.query(`update users set nick = $2 where id = $1`, [userId, apodo]);
    return { ok: true as const };
  }).catch((e) => {
    if (String(e?.constraint ?? "").endsWith("_datos")) return no("No pongas teléfonos ni datos de nadie.", "Don't add phone numbers or anyone's details.", "texto");
    throw e;
  });
}

/* ── Bienvenida (APP-COM-BIENVENIDA = pasos 3–5 de 2au en /entrar) ── Paso 3: tu zona (y tu ciudad, si todavía no tienes);
   paso 4: lo que te gusta (users.interests); paso 5: reglas + «Tengo 18 años o más» + vecinos para seguir. Quien declara ser menor
   termina la bienvenida pero no entra a la Comunidad (y no puede cambiarlo solo: lo revisa el equipo). */
export const CATS_INTERES = ["NEG-FOOD", "NEG-BELL", "NEG-AUTO", "NEG-HOGAR", "NEG-NOCHE", "NEG-MERC", "NEG-FIESTA", "NEG-SALUD", "NEG-PRO", "NEG-TIENDA", "NEG-TRANS", "NEG-EDU", "NEG-NINOS", "NEG-DEPORTE", "NEG-FE", "NEG-INMUEBLE", "NEG-DEALER"] as const;
export const COM_INTERES = ["preg", "rec", "evt", "nov", "avisos"] as const;
export type PasoBienvenida =
  | { paso: 3; zona: string | null; ciudad?: string | null; fuera?: string | null }
  | { paso: 4; cats: string[]; com: string[] }
  | { paso: 5; reglas: boolean; adulto: boolean | null; seguir: string[] };
export async function bienvenida(userId: string, p: PasoBienvenida): Promise<Res<{ menor?: boolean; numero?: number; fundador?: boolean; monedas?: number }>> {
  if (p.paso === 3) {
    const fuera = String(p.fuera ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
    if (fuera && revisarTexto(fuera)) return no("Escribe solo el nombre de tu ciudad.", "Write only your city's name.");
    return tx(async (c) => {
      const u = (await c.query<{ home: string | null }>(`select home_city_id as home from users where id = $1 for update`, [userId])).rows[0];
      if (!u) return no("Entra otra vez.", "Sign in again.");
      let home = u.home;
      if (!home && p.ciudad) {
        const ok = (await c.query(`select 1 from cities where id = $1 and ciudad_abierta_para(id, $2::uuid)`, [String(p.ciudad), userId])).rowCount;
        if (!ok) return no("Esa ciudad todavía no está abierta.", "That city is not open yet.");
        home = String(p.ciudad);
        await c.query(`update users set home_city_id = $2 where id = $1`, [userId, home]);
        await c.query(`insert into account_changes (user_id, kind, "from", "to", by) values ($1, 'city', null, $2, 'user')`, [userId, home]);
      }
      if (p.zona) {
        const z = (await c.query(`select 1 from zones where id = $1 and city_id = $2`, [String(p.zona), home])).rowCount;
        if (!z) return no("Esa zona no es de tu ciudad.", "That area is not in your city.");
      }
      await c.query(`update users set zone_id = $2, interests = case when $3::text = '' then interests - 'fuera' else interests || jsonb_build_object('fuera', $3::text) end where id = $1`, [userId, p.zona || null, fuera]);
      return { ok: true as const };
    });
  }
  if (p.paso === 4) {
    const cats = [...new Set((p.cats ?? []).map(String))].filter((x) => (CATS_INTERES as readonly string[]).includes(x));
    const com = [...new Set((p.com ?? []).map(String))].filter((x) => (COM_INTERES as readonly string[]).includes(x));
    await db().query(`update users set interests = interests || jsonb_build_object('cats', $2::jsonb, 'com', $3::jsonb) where id = $1`, [userId, JSON.stringify(cats), JSON.stringify(com)]);
    return { ok: true };
  }
  if (!p.reglas) return no("Acepta las reglas del barrio para seguir.", "Accept the neighborhood rules to continue.");
  if (p.adulto !== true && p.adulto !== false) return no("Dinos si tienes 18 años o más.", "Tell us if you are 18 or older.");
  const r = await tx(async (c) => {
    await c.query(`insert into community_profiles (user_id) values ($1) on conflict (user_id) do nothing`, [userId]);
    const antes = (await c.query<{ adult: boolean | null }>(`select adult from community_profiles where user_id = $1 for update`, [userId])).rows[0];
    // Quien ya declaró ser menor no cambia la declaración desde aquí.
    const adulto = antes?.adult === false ? false : p.adulto;
    await c.query(`update community_profiles set rules_version = 1, rules_ok_at = now(), adult = $2, adult_ok_at = case when adult is distinct from $2 or adult_ok_at is null then now() else adult_ok_at end,
                          welcome_at = coalesce(welcome_at, now()) where user_id = $1`, [userId, adulto]);
    // 5g · la bienvenida acredita las monedas de bienvenida (+100) una sola vez, con el libro (mon_bienvenida: idempotente por persona),
    // a quien hizo la bienvenida y declaró tener 18 años o más. Quien declaró ser menor no recibe nada.
    const monedas = adulto ? await acreditar(c, userId, "welcome") : 0;
    return { menor: !adulto, monedas };
  });
  if (r.menor) return { ok: true, menor: true };
  await avisarMonedas(userId, r.monedas, { es: "Bienvenida al barrio", en: "Welcome to the neighborhood" }, `welcome:${userId}`);
  for (const t of [...new Set(p.seguir ?? [])].filter((x) => UUID.test(x)).slice(0, 10)) await seguir(userId, t);
  const n = await numeroVecino(userId);
  return { ok: true, menor: false, numero: n?.n ?? 1, fundador: !!n?.founder, monedas: await saldo(userId) };
}

/* Lo que la bienvenida necesita mostrar: la ciudad (o las abiertas si no tiene), sus zonas, lo ya elegido y si ya la hizo. */
export async function datosBienvenida(userId: string, ciudadViendo: string) {
  const u = (await db().query<{ home: string | null; zona: string | null; interests: { cats?: string[]; com?: string[]; fuera?: string }; adult: boolean | null; welcome: boolean; first_name: string | null; nick: string | null; last_name: string | null; photo_url: string | null }>(
    `select u.home_city_id as home, u.zone_id as zona, u.interests, cp.adult, cp.welcome_at is not null as welcome, u.first_name, u.last_name, u.nick, u.photo_url
       from users u left join community_profiles cp on cp.user_id = u.id where u.id = $1`, [userId])).rows[0];
  const ciudad = u?.home ?? ciudadViendo;
  const [c, z] = await Promise.all([
    db().query<{ id: string; name: string; state: string; on: boolean }>(`select id, name, state, ciudad_abierta_para(id, $2::uuid) as on from cities where id = $1`, [ciudad, userId]),
    db().query<{ id: string; name: Bi }>(`select id, name from zones where city_id = $1 order by sort, id`, [ciudad]),
  ]);
  const n = await numeroVecino(userId);
  return {
    ciudad: c.rows[0] ?? null, tieneCiudad: !!u?.home, zonas: z.rows, zona: u?.zona ?? null, cats: u?.interests?.cats ?? [], com: u?.interests?.com ?? [], fuera: u?.interests?.fuera ?? "",
    menor: u?.adult === false, hecha: !!u?.welcome && u?.adult === true, nombre: (u?.nick || u?.first_name || "").trim(), ini: [u?.first_name?.[0], u?.last_name?.[0]].filter(Boolean).join("").toUpperCase(), foto: u?.photo_url ?? null,
    numero: n?.n ?? 1, fundador: !!n?.founder, sugeridos: await sugeridos(userId, ciudad, 4),
  };
}
export type DatosBienvenida = Awaited<ReturnType<typeof datosBienvenida>>;

/* Si quien mira bloqueó a esta persona: su nombre corto, para «Bloqueaste a … · Desbloquear» en su perfil. Solo lo ve quien
   bloqueó (a la persona bloqueada nunca se le dice nada). */
export async function bloqueoMio(viewer: string, id: string) {
  if (!UUID.test(id)) return null;
  const r = (await db().query<{ f: string | null; l: string | null }>(
    `select u.first_name as f, u.last_name as l from user_blocks b join users u on u.id = b.target_user_id
      where b.user_id = $1 and b.target_user_id = $2 and b.kind = 'block' and b.removed_at is null limit 1`, [viewer, id])).rows[0];
  return r ? { id, nombre: corto(r.f, r.l) } : null;
}
