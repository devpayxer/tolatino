import "server-only";
import type { PoolClient } from "pg";
import { auditar, type Staff } from "../admin";
import { normalizarTelefono } from "../cuenta";
import { db, tx } from "../db";
import { AVISO_DESDE, AVISO_HASTA, CLAVES, PASOS, ZONAS_HORARIAS, bien, mal, nombreCategoria, type Bi, type Estado, type Res } from "./comun";
import { pendientesLaunch } from "./launch";

/* 9i · Abrir y cerrar ciudades (fase9-apertura.md §4 9i; ADM-CIUD del prototipo, asistente de 7 pasos — hueco #6; LAUNCH L41).
   - El asistente: 1 Ciudad y centro · 2 Radio y barrios · 3 Categorías de arranque · 4 Equipo local · 5 Negocios listos · 6 Comprobar (la regla de apertura,
     las líneas de LAUNCH de esa ciudad y el commit que corre) · 7 Avisar a la lista de espera (= abrir). Cada paso guarda su evidencia (lo que el servidor
     VIO al confirmarlo), quién y el motivo; solo avanza, un paso a la vez (la base lo impone: city_launch_steps_reglas); se puede cancelar con motivo y
     empezar otro. Una ciudad solo pasa a «on» por aquí: la transacción dice cuál asistente (tl.apertura) y la base revisa sus pasos (cities_estado; guardián
     ciudadConAsistente).
   - Si la regla de apertura no se cumple, un Admin puede «Abrir igual» con motivo (§6 #17: el fundador decide); las líneas de LAUNCH no se saltan.
   - «beta»: solo entran las cuentas invitadas (y las de revisión de Apple y Google); para los demás es «próximamente» (ciudad_abierta_para).
   - Bajar una ciudad abierta o en beta lo pide una persona con motivo y lo aprueba OTRA (city_close_requests; la base lo vuelve a imponer con tl.cierre).
   - Todo cambio queda en la auditoría (y cada cambio de estado en city_status_log, de solo inserción). El permiso se revisa aquí: ciud:aprobar para
     el asistente, la beta y el cierre; abrir (paso 7), «Abrir igual», la regla, la zona horaria y el impuesto, solo un Admin; barrios y radio, ciud:editar. */

const ID = /^[a-z]{3}$/;
const limpio = (x: unknown, n: number) => String(x ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const suya = (s: Staff, c: string) => !s.cities.length || s.cities.includes(c);
const esAdmin = (s: Staff) => s.role === "admin";
const mascara = (t: string) => { const d = String(t ?? "").replace(/\D/g, "").slice(-10); return d.length === 10 ? `(${d.slice(0, 3)}) ···-··${d.slice(8)}` : "—"; };
/* El rastro que lee el trigger de cities (quién y por qué); solo dentro de la transacción. */
async function rastro(c: PoolClient, s: Staff, motivo: string, extra: Record<string, string> = {}) {
  await c.query(`select set_config('tl.actor', $1, true), set_config('tl.motivo', $2, true)`, [s.id, motivo]);
  for (const [k, v] of Object.entries(extra)) await c.query(`select set_config($1, $2, true)`, [k, v]);
}

type Ciu = { id: string; name: string; state: string; status: Estado; tz: string; tax: string; radio: number; radios: number[]; zips: string[]; towns: number; lat: number; lng: number };
async function ciudad(c: PoolClient | ReturnType<typeof db>, id: string, bloquear = false): Promise<Ciu | null> {
  return (await c.query<Ciu>(
    `select id, name, state, status, timezone as tz, (tax_rate * 100)::numeric(5,2)::text as tax, default_radius as radio, radius_options as radios, zips,
            jsonb_array_length(towns) as towns, st_y(center::geometry) as lat, st_x(center::geometry) as lng
       from cities where id = $1${bloquear ? " for update" : ""}`, [id])).rows[0] ?? null;
}

/* ── La evidencia de cada paso: lo que el servidor ve AHORA (se guarda tal cual al confirmar). ── */
export type Linea = { k: Bi; v: string; ok?: boolean };
export type Evidencia = { ok: boolean; problemas: Bi[]; lineas: Linea[]; datos: Record<string, unknown>; abrirIgual?: boolean; avisos?: Bi[] };

export async function regla(ciudadId: string) {
  const [r, n] = await Promise.all([
    db().query<{ min_waitlist: number; min_ready: number; cats: Record<string, number>; ok: boolean | null; checked: string | null }>(
      `select min_waitlist, min_ready, min_por_categoria as cats, ok, to_char(checked_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as checked from city_open_rules where city_id = $1`, [ciudadId]),
    db().query<{ listos: number; espera: number; por: Record<string, number> | null }>(
      `select (select count(*)::int from businesses b where b.city_id = $1 and b.status = 'active') as listos,
              (select count(distinct coalesce(w.user_id::text, w.device::text, w.id::text))::int from city_waitlist w where w.city_id = $1 and w.removed_at is null) as espera,
              (select jsonb_object_agg(k, n) from (select b.category_id as k, count(*)::int as n from businesses b where b.city_id = $1 and b.status = 'active' group by 1) x) as por`, [ciudadId]),
  ]);
  const R = r.rows[0] ?? { min_waitlist: 300, min_ready: 30, cats: {}, ok: null, checked: null }, N = n.rows[0]!, por = N.por ?? {};
  const cats = Object.entries(R.cats ?? {}).map(([k, min]) => ({ k, nombre: nombreCategoria(k), min: Number(min), n: por[k] ?? 0 }));
  const cuenta = N.listos >= R.min_ready || N.espera >= R.min_waitlist, categorias = cats.every((x) => x.n >= x.min);
  const pct = Math.min(100, Math.round(Math.max(R.min_ready ? N.listos / R.min_ready : 1, R.min_waitlist ? N.espera / R.min_waitlist : 1) * 100));
  return { min: { listos: R.min_ready, espera: R.min_waitlist }, listos: N.listos, espera: N.espera, por, cats, cumple: cuenta && categorias, cuenta, categorias, pct, ok: R.ok, checked: R.checked };
}
export type Regla = Awaited<ReturnType<typeof regla>>;

export async function evidencia(ciudadId: string, paso: number): Promise<Evidencia> {
  const c = await ciudad(db(), ciudadId);
  if (!c) return { ok: false, problemas: [{ es: "Esa ciudad no existe.", en: "That city does not exist." }], lineas: [], datos: {} };
  const P: Bi[] = [], L: Linea[] = [];
  const nos = (es: string, en: string) => P.push({ es, en });
  if (paso === 1) {
    const ctr = (await db().query<{ es: string; calle: string; lat: number; lng: number }>(
      `select name->>'es' as es, coalesce(streets->>'es', '') as calle, st_y(center::geometry) as lat, st_x(center::geometry) as lng from zones where city_id = $1 and id = $1 || '-centro' and retired_at is null`, [c.id])).rows[0];
    L.push({ k: { es: "CIUDAD", en: "CITY" }, v: `${c.name}, ${c.state}` },
      { k: { es: "CENTRO (DESDE DONDE SE MIDE)", en: "CENTER (MEASURED FROM)" }, v: ctr ? `${ctr.es} · ${ctr.calle} · ${ctr.lat.toFixed(4)}, ${ctr.lng.toFixed(4)}` : `${c.lat.toFixed(4)}, ${c.lng.toFixed(4)}`, ok: !!ctr },
      { k: { es: "CÓDIGOS POSTALES", en: "ZIP CODES" }, v: c.zips.join(", ") || "—", ok: c.zips.length > 0 },
      { k: { es: "ZONA HORARIA", en: "TIME ZONE" }, v: c.tz }, { k: { es: "IMPUESTO", en: "TAX" }, v: `${c.tax} %`, ok: Number(c.tax) > 0 });
    if (!ctr) nos("Falta el barrio «centro» (desde donde se mide): agrégalo en Barrios.", "The «downtown» neighborhood (where distance is measured from) is missing: add it in Neighborhoods.");
    if (!c.zips.length) nos("La ciudad no tiene códigos postales.", "The city has no ZIP codes.");
    if (!(Number(c.tax) > 0)) nos("Falta el impuesto de la ciudad.", "The city tax is missing.");
    return { ok: !P.length, problemas: P, lineas: L, datos: { ciudad: `${c.name}, ${c.state}`, centro: ctr ? { barrio: ctr.es, calle: ctr.calle, lat: ctr.lat, lng: ctr.lng } : null, zips: c.zips, zona: c.tz, impuesto: c.tax } };
  }
  if (paso === 2) {
    const z = (await db().query<{ es: string }>(`select name->>'es' as es from zones where city_id = $1 and id <> $1 || '-centro' and retired_at is null order by sort, id`, [c.id])).rows.map((x) => x.es);
    L.push({ k: { es: "RADIO POR DEFECTO", en: "DEFAULT RADIUS" }, v: `${c.radio} mi` }, { k: { es: "RADIOS", en: "RADII" }, v: c.radios.map((r) => `${r} mi`).join(" · ") },
      { k: { es: "BARRIOS", en: "NEIGHBORHOODS" }, v: z.length ? z.join(" · ") : "—", ok: z.length >= 2 }, { k: { es: "PUEBLOS CERCANOS", en: "NEARBY TOWNS" }, v: String(c.towns), ok: c.towns > 0 });
    if (z.length < 2) nos("Hacen falta al menos dos barrios además del centro.", "At least two neighborhoods besides downtown are needed.");
    if (!c.towns) nos("Faltan los pueblos cercanos (el mapa del radio los nombra).", "Nearby towns are missing (the radius map names them).");
    return { ok: !P.length, problemas: P, lineas: L, datos: { radio: c.radio, radios: c.radios, barrios: z, pueblos: c.towns } };
  }
  if (paso === 3 || paso === 5) {
    const R = await regla(c.id);
    if (paso === 3) {
      for (const x of R.cats) L.push({ k: { es: x.nombre.es.toUpperCase(), en: x.nombre.en.toUpperCase() }, v: `${x.n} ${x.n === 1 ? "listo" : "listos"} · mínimo ${x.min}` });
      if (!R.cats.length) nos("La regla no tiene categorías de arranque: ponlas en la regla de apertura.", "The rule has no starting categories: set them in the opening rule.");
      return { ok: !P.length, problemas: P, lineas: L, datos: { categorias: R.cats.map((x) => ({ k: x.k, min: x.min, listos: x.n })) } };
    }
    L.push({ k: { es: "NEGOCIOS LISTOS", en: "BUSINESSES READY" }, v: `${R.listos} / ${R.min.listos}`, ok: R.listos >= R.min.listos },
      { k: { es: "EN LISTA DE ESPERA", en: "ON THE WAITLIST" }, v: `${R.espera} / ${R.min.espera}`, ok: R.espera >= R.min.espera });
    for (const [k, v] of Object.entries(R.por).sort((a, b) => b[1] - a[1]).slice(0, 8)) L.push({ k: { es: nombreCategoria(k).es.toUpperCase(), en: nombreCategoria(k).en.toUpperCase() }, v: String(v) });
    return { ok: true, problemas: P, lineas: L, datos: { listos: R.listos, espera: R.espera, meta: R.min, porCategoria: R.por } };
  }
  if (paso === 4) {
    const E = (await db().query<{ n: string; rol: string }>(
      `select trim(coalesce(u.first_name, '') || ' ' || left(coalesce(u.last_name, ''), 1)) as n, m.role as rol
         from staff_members m join users u on u.id = m.user_id where m.status = 'active' and m.role in ('ciudad', 'verificador') and $1 = any(m.cities) order by m.role, u.first_name`, [c.id])).rows;
    const cm = E.filter((x) => x.rol === "ciudad"), ver = E.filter((x) => x.rol === "verificador");
    L.push({ k: { es: "CIUDAD MANAGER", en: "CITY MANAGER" }, v: cm.map((x) => x.n).join(", ") || "—", ok: cm.length > 0 }, { k: { es: "VERIFICADOR", en: "VERIFIER" }, v: ver.map((x) => x.n).join(", ") || "—" });
    if (!cm.length) nos(`Falta un Ciudad manager de ${c.name} en el equipo (Sistema › Equipo, con la ciudad).`, `A City manager for ${c.name} is missing from the team (System › Team, with the city).`);
    return { ok: !P.length, problemas: P, lineas: L, datos: { ciudadManager: cm.map((x) => x.n), verificadores: ver.map((x) => x.n) } };
  }
  if (paso === 6) {
    // Las líneas de LAUNCH de la ciudad frenan la apertura en producción (y en cualquier base que no sea la del sandbox: ciudades_sandbox(), la misma
    // regla del trigger). En el sandbox la LAUNCH no llega a cero hasta 9v: ahí se listan como aviso y no frenan (REVISION 9i).
    const R = await regla(c.id), LA = pendientesLaunch([c.name, ...(c.name.includes("-") ? [c.name.replace(/-/g, " ")] : [])]);
    const sandbox = (await db().query<{ s: boolean }>(`select ciudades_sandbox() as s`)).rows[0]?.s === true;
    const frena = !LA.leida || (!sandbox && LA.deLaCiudad.length > 0), avisos: Bi[] = [];
    L.push({ k: { es: "REGLA DE APERTURA", en: "OPENING RULE" }, v: R.cumple ? "cumple" : "no cumple", ok: R.cumple },
      { k: { es: "NEGOCIOS LISTOS", en: "BUSINESSES READY" }, v: `${R.listos} / ${R.min.listos}`, ok: R.listos >= R.min.listos },
      { k: { es: "EN LISTA DE ESPERA", en: "ON THE WAITLIST" }, v: `${R.espera} / ${R.min.espera}`, ok: R.espera >= R.min.espera });
    for (const x of R.cats) L.push({ k: { es: x.nombre.es.toUpperCase(), en: x.nombre.en.toUpperCase() }, v: `${x.n} / ${x.min}`, ok: x.n >= x.min });
    L.push({ k: { es: `LAUNCH · PENDIENTES DE ${c.name.toUpperCase()}`, en: `LAUNCH · PENDING FOR ${c.name.toUpperCase()}` }, v: LA.leida ? String(LA.deLaCiudad.length) + (sandbox && LA.deLaCiudad.length ? " · sandbox: no frenan" : "") : "sin leer", ok: LA.leida && !LA.deLaCiudad.length },
      { k: { es: "COMMIT QUE CORRE", en: "RUNNING COMMIT" }, v: (process.env.TOLATINO_COMMIT ?? "local").slice(0, 12) });
    if (!R.cumple) nos(R.cuenta ? "Falta al menos una categoría clave." : `No llega a ${R.min.listos} negocios listos ni a ${R.min.espera} en la lista de espera.`,
      R.cuenta ? "At least one key category is missing." : `It does not reach ${R.min.listos} businesses ready nor ${R.min.espera} on the waitlist.`);
    if (!LA.leida) nos("No se pudo leer la LAUNCH-CHECKLIST del build que corre: no se abre sin mirarla.", "The LAUNCH-CHECKLIST of the running build could not be read: the city does not open without it.");
    else for (const x of LA.deLaCiudad.slice(0, 5)) (sandbox ? avisos : P).push({ es: `LAUNCH línea ${x.linea}: ${x.texto}`, en: `LAUNCH line ${x.linea}: ${x.texto}` });
    if (sandbox && LA.deLaCiudad.length) avisos.unshift({ es: `En el sandbox, las ${LA.deLaCiudad.length} líneas de LAUNCH de ${c.name} se anotan y no frenan; en producción frenan.`, en: `In the sandbox, the ${LA.deLaCiudad.length} LAUNCH lines for ${c.name} are recorded and do not block; in production they block.` });
    return { ok: !P.length, problemas: P, avisos, lineas: L, abrirIgual: !R.cumple && !frena,
      datos: { regla: { cumple: R.cumple, listos: R.listos, espera: R.espera, min: R.min, categorias: R.cats.map((x) => ({ k: x.k, n: x.n, min: x.min })) },
        launch: { leida: LA.leida, total: LA.total, deLaCiudad: LA.deLaCiudad.map((x) => x.linea), frena, sandbox }, commit: (process.env.TOLATINO_COMMIT ?? "local").slice(0, 12),
        guardianes: "los corre el CI antes de que el commit llegue a la rama que se despliega" } };
  }
  if (paso === 7) {
    const n = (await db().query<{ personas: number; sin: number; hora: number }>(
      `select (select count(distinct coalesce(w.user_id, u.id))::int from city_waitlist w left join users u on w.user_id is null and u.phone = w.contact and u.status <> 'deleted'
                where w.city_id = $1 and w.removed_at is null and w.notified_at is null and coalesce(w.user_id, u.id) is not null) as personas,
              (select count(*)::int from city_waitlist w where w.city_id = $1 and w.removed_at is null and w.notified_at is null and w.user_id is null
                  and not exists (select 1 from users u where u.phone = w.contact and u.status <> 'deleted')) as sin,
              extract(hour from now() at time zone (select timezone from cities where id = $1))::int as hora`, [c.id])).rows[0]!;
    const ea = (await db().query<{ n: number }>(
      `select count(*)::int as n from early_access e where e.city_id = $1 and e.removed_at is null and e.notified_at is null
          and not exists (select 1 from city_waitlist w where w.city_id = $1 and w.user_id = e.user_id and w.removed_at is null)`, [c.id])).rows[0]!.n;
    const ahora = n.hora >= AVISO_DESDE && n.hora <= AVISO_HASTA;
    L.push({ k: { es: "PERSONAS QUE RECIBEN EL AVISO", en: "PEOPLE WHO GET THE NOTICE" }, v: String(n.personas + ea) },
      { k: { es: "SIN CUENTA (NO SE LES ESCRIBE)", en: "NO ACCOUNT (NOT CONTACTED)" }, v: String(n.sin) },
      { k: { es: "CUÁNDO SALE", en: "WHEN IT GOES OUT" }, v: ahora ? `ahora, por partes (de ${AVISO_DESDE} AM a ${AVISO_HASTA - 11} PM)` : `a las ${AVISO_DESDE} AM de ${c.name} (ahora es de noche allá)` });
    if (c.status !== "soon" && c.status !== "beta") nos("Solo se abre una ciudad que está próximamente o en beta.", "Only a city that is coming soon or in beta can be opened.");
    return { ok: !P.length, problemas: P, lineas: L, datos: { personas: n.personas + ea, sinCuenta: n.sin, saleAhora: ahora, canales: ["en la app", "push", "SMS si no tiene la app", "correo verificado"] } };
  }
  return { ok: false, problemas: [{ es: "Ese paso no existe.", en: "That step does not exist." }], lineas: [], datos: {} };
}

/* El asistente en curso de una ciudad (o el último). */
export async function asistente(ciudadId: string) {
  const l = (await db().query<{ id: string; status: string; started: string; by: string | null }>(
    `select l.id::text, l.status, to_char(l.started_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as started,
            nullif(trim(coalesce(u.first_name, '') || ' ' || left(coalesce(u.last_name, ''), 1)), '') as by
       from city_launches l left join users u on u.id = l.started_by where l.city_id = $1 order by (l.status = 'en_curso') desc, l.id desc limit 1`, [ciudadId])).rows[0] ?? null;
  const pasos = l ? (await db().query<{ step: number; at: string; by: string | null; reason: string; evidence: Record<string, unknown> }>(
    `select s.step, to_char(s.done_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at, s.reason, s.evidence,
            nullif(trim(coalesce(u.first_name, '') || ' ' || left(coalesce(u.last_name, ''), 1)), '') as by
       from city_launch_steps s left join users u on u.id = s.done_by where s.launch_id = $1::bigint order by s.step`, [l.id])).rows : [];
  return { lanzamiento: l, pasos };
}

/* ── Confirmar un paso (y, en el 7, abrir) ── */
export async function confirmarPaso(s: Staff, ciudadId: string, paso: number, motivo: string, abrirIgual = false): Promise<Res<{ abierta?: boolean }>> {
  const m = limpio(motivo, 300);
  if (!ID.test(ciudadId)) return mal("Esa ciudad no existe.", "That city does not exist.");
  if (!s.puede("ciud", "aprobar")) return mal("Tu rol no confirma pasos del asistente.", "Your role cannot confirm wizard steps.");
  if (!suya(s, ciudadId)) return mal("Esa ciudad no es tuya.", "That city is not yours.");
  if (!(Number.isInteger(paso) && paso >= 1 && paso <= 7)) return mal("Ese paso no existe.", "That step does not exist.");
  if (m.length < 3) return mal("Escribe el motivo.", "Write the reason.");
  if ((paso === 7 || abrirIgual) && !esAdmin(s)) return mal("Abrir una ciudad lo hace un Admin.", "Opening a city is done by an Admin.");
  const ev = await evidencia(ciudadId, paso);
  if (!ev.ok && !(paso === 6 && abrirIgual && ev.abrirIgual)) return { ok: false, msg: ev.problemas[0] ?? { es: "Ese paso todavía no se puede confirmar.", en: "That step cannot be confirmed yet." } };
  try {
    return await tx(async (c) => {
      const ci = await ciudad(c, ciudadId, true);
      if (!ci) return mal("Esa ciudad no existe.", "That city does not exist.");
      if (ci.status !== "soon" && ci.status !== "beta") return mal("El asistente es para una ciudad próximamente o en beta.", "The wizard is for a city that is coming soon or in beta.");
      let l = (await c.query<{ id: string }>(`select id::text from city_launches where city_id = $1 and status = 'en_curso' for update`, [ciudadId])).rows[0]?.id ?? null;
      if (!l) {
        if (paso !== 1) return mal("Empieza por el paso 1.", "Start with step 1.");
        l = (await c.query<{ id: string }>(`insert into city_launches (city_id, started_by) values ($1, $2) returning id::text`, [ciudadId, s.id])).rows[0]!.id;
      }
      const hecho = (await c.query<{ n: number }>(`select coalesce(max(step), 0)::int as n from city_launch_steps where launch_id = $1::bigint`, [l])).rows[0]!.n;
      if (paso !== hecho + 1) return mal(`El asistente solo avanza: toca el paso ${hecho + 1}.`, `The wizard only moves forward: step ${hecho + 1} is next.`);
      const datos = { ...ev.datos, ...(paso === 6 && !ev.ok ? { abrirIgual: true, porQue: ev.problemas.map((x) => x.es) } : {}) };
      if (paso === 6) await c.query(`update city_open_rules set ok = $2, checked_at = now() where city_id = $1`, [ciudadId, ev.ok]);
      if (paso < 7) {
        await c.query(`insert into city_launch_steps (launch_id, step, city_id, done_by, evidence, reason) values ($1::bigint, $2, $3, $4, $5::jsonb, $6)`, [l, paso, ciudadId, s.id, JSON.stringify(datos), m]);
        await auditar(c, { actor: s.id, action: "ciud.paso", targetKind: "city", targetId: ciudadId, city: ciudadId, after: { paso: `${paso} · ${PASOS[paso - 1]!.es}`, ...(paso === 6 && !ev.ok ? { abrir_igual: "sí" } : {}) }, reason: m });
        return bien(`Paso ${paso} confirmado: ${PASOS[paso - 1]!.es}.`, `Step ${paso} confirmed: ${PASOS[paso - 1]!.en}.`, { abierta: false });
      }
      // Paso 7: abrir. El trigger de cities revisa que este asistente tenga sus pasos 1–6 (tl.apertura) y deja el cambio en city_status_log.
      await rastro(c, s, m, { "tl.apertura": l });
      await c.query(`insert into city_launch_steps (launch_id, step, city_id, done_by, evidence, reason) values ($1::bigint, 7, $2, $3, $4::jsonb, $5)`, [l, ciudadId, s.id, JSON.stringify(datos), m]);
      await c.query(`update cities set status = 'on', updated_at = now() where id = $1`, [ciudadId]);
      await c.query(`update city_launches set status = 'abierta' where id = $1::bigint`, [l]);
      await auditar(c, { actor: s.id, action: "ciud.abrir", targetKind: "city", targetId: ciudadId, city: ciudadId, before: { estado: ci.status === "beta" ? "en beta" : "próximamente" }, after: { estado: "abierta", aviso: `${ev.datos.personas ?? 0} personas` }, reason: m });
      return bien(`${ci.name} está abierta. El aviso a la lista de espera sale por partes, de ${AVISO_DESDE} AM a 9 PM de la ciudad.`, `${ci.name} is open. The waitlist notice goes out in parts, 9 AM to 9 PM city time.`, { abierta: true });
    });
  } catch (e) {
    const t = String((e as Error)?.message ?? e);
    if (/ciudad_(paso|apertura|asistente)/.test(t)) return mal(`La base no lo deja: ${t.replace(/^.*?: /, "")}`, "The database does not allow it: the wizard only moves forward, one step at a time.");
    throw e;
  }
}

export async function cancelarAsistente(s: Staff, ciudadId: string, motivo: string): Promise<Res> {
  const m = limpio(motivo, 300);
  if (!s.puede("ciud", "aprobar") || !suya(s, ciudadId)) return mal("Tu rol no cancela el asistente de esta ciudad.", "Your role cannot cancel this city's wizard.");
  if (m.length < 3) return mal("Escribe el motivo.", "Write the reason.");
  return tx(async (c) => {
    const l = (await c.query<{ id: string }>(`select id::text from city_launches where city_id = $1 and status = 'en_curso' for update`, [ciudadId])).rows[0];
    if (!l) return mal("No hay un asistente en curso.", "There is no wizard in progress.");
    await c.query(`update city_launches set status = 'cancelada', cancelled_by = $2, cancel_reason = $3 where id = $1::bigint`, [l.id, s.id, m]);
    await auditar(c, { actor: s.id, action: "ciud.asistente.cancelar", targetKind: "city", targetId: ciudadId, city: ciudadId, after: { asistente: "cancelado" }, reason: m });
    return bien("Asistente cancelado: lo hecho queda en el historial. Para abrir, se empieza otro.", "Wizard cancelled: what was done stays in the history. To open, start another one.");
  });
}

/* ── Beta: soon → beta (con motivo). Solo entran las cuentas invitadas y las de revisión. ── */
export async function ponerEnBeta(s: Staff, ciudadId: string, motivo: string): Promise<Res> {
  const m = limpio(motivo, 300);
  if (!s.puede("ciud", "aprobar") || !suya(s, ciudadId)) return mal("Tu rol no pone esta ciudad en beta.", "Your role cannot put this city in beta.");
  if (m.length < 3) return mal("Escribe el motivo.", "Write the reason.");
  return tx(async (c) => {
    const ci = await ciudad(c, ciudadId, true);
    if (!ci) return mal("Esa ciudad no existe.", "That city does not exist.");
    if (ci.status !== "soon" && ci.status !== "off") return mal("Solo una ciudad próximamente o cerrada pasa a beta.", "Only a coming-soon or closed city goes to beta.");
    await rastro(c, s, m);
    await c.query(`update cities set status = 'beta', updated_at = now() where id = $1`, [ciudadId]);
    await auditar(c, { actor: s.id, action: "ciud.beta", targetKind: "city", targetId: ciudadId, city: ciudadId, before: { estado: ci.status === "off" ? "cerrada" : "próximamente" }, after: { estado: "beta (solo invitados)" }, reason: m });
    return bien(`${ci.name} está en beta: solo la ven las cuentas invitadas.`, `${ci.name} is in beta: only invited accounts see it.`);
  });
}

export async function invitarBeta(s: Staff, ciudadId: string, telefono: string, motivo: string): Promise<Res> {
  const m = limpio(motivo, 300), tel = normalizarTelefono(String(telefono ?? ""));
  if (!s.puede("ciud", "aprobar") || !suya(s, ciudadId)) return mal("Tu rol no invita a la beta de esta ciudad.", "Your role cannot invite to this city's beta.");
  if (!tel) return mal("Revisa el teléfono: 10 dígitos de EE. UU.", "Check the phone: 10 US digits.");
  if (m.length < 3) return mal("Escribe el motivo.", "Write the reason.");
  return tx(async (c) => {
    const ci = await ciudad(c, ciudadId);
    if (!ci || ci.status !== "beta") return mal("Se invita a una ciudad en beta.", "You invite to a city in beta.");
    const u = (await c.query<{ id: string; n: string | null }>(`select id::text, first_name as n from users where phone = $1 and status <> 'deleted'`, [tel])).rows[0];
    if (!u) return mal("Esa persona todavía no tiene cuenta: que entre una vez con su teléfono y la invitas.", "That person has no account yet: they sign in once with their phone and you invite them.");
    const r = await c.query(`insert into city_beta_invites (city_id, user_id, invited_by, reason, is_test) select $1, $2::uuid, $3, $4, u.is_test from users u where u.id = $2::uuid on conflict do nothing`, [ciudadId, u.id, s.id, m]);
    if (!r.rowCount) return mal("Esa persona ya está invitada.", "That person is already invited.");
    await auditar(c, { actor: s.id, action: "ciud.beta.invitar", targetKind: "user", targetId: u.id, city: ciudadId, after: { ciudad: ci.name, telefono: mascara(tel) }, reason: m });
    return bien(`Invitada a la beta de ${ci.name}: la ve abierta desde ya.`, `Invited to the ${ci.name} beta: they see it open from now on.`);
  });
}

export async function quitarInvitacion(s: Staff, invitacion: string, motivo: string): Promise<Res> {
  const m = limpio(motivo, 300);
  if (!/^\d{1,18}$/.test(String(invitacion))) return mal("Esa invitación no existe.", "That invitation does not exist.");
  if (m.length < 3) return mal("Escribe el motivo.", "Write the reason.");
  return tx(async (c) => {
    const x = (await c.query<{ city: string; uid: string }>(`select city_id as city, user_id::text as uid from city_beta_invites where id = $1::bigint and revoked_at is null for update`, [invitacion])).rows[0];
    if (!x) return mal("Esa invitación ya no está.", "That invitation is gone.");
    if (!s.puede("ciud", "aprobar") || !suya(s, x.city)) return mal("Tu rol no quita invitaciones de esta ciudad.", "Your role cannot remove this city's invitations.");
    await c.query(`update city_beta_invites set revoked_at = now(), revoked_by = $2 where id = $1::bigint`, [invitacion, s.id]);
    await auditar(c, { actor: s.id, action: "ciud.beta.quitar", targetKind: "user", targetId: x.uid, city: x.city, after: { invitacion: "quitada" }, reason: m });
    return bien("Invitación quitada: vuelve a ver la ciudad «próximamente».", "Invitation removed: they see the city as «coming soon» again.");
  });
}

/* ── Cerrar (o bajar): una persona lo pide, OTRA lo aprueba ── */
const RANGO: Record<Estado, number> = { on: 3, beta: 2, soon: 1, off: 0 };
export async function pedirCierre(s: Staff, ciudadId: string, a: string, motivo: string): Promise<Res> {
  const m = limpio(motivo, 300);
  if (!s.puede("ciud", "aprobar") || !suya(s, ciudadId)) return mal("Tu rol no pide cerrar esta ciudad.", "Your role cannot ask to close this city.");
  if (!["beta", "soon", "off"].includes(a)) return mal("Elige a qué pasa la ciudad.", "Pick what the city goes to.");
  if (m.length < 3) return mal("Escribe el motivo: lo ve quien lo aprueba y queda en la auditoría.", "Write the reason: the approver sees it and it goes in the audit log.");
  try {
    return await tx(async (c) => {
      const ci = await ciudad(c, ciudadId, true);
      if (!ci || (ci.status !== "on" && ci.status !== "beta")) return mal("Solo se cierra una ciudad abierta o en beta.", "Only an open or beta city is closed.");
      if (RANGO[a as Estado] >= RANGO[ci.status]) return mal("Eso no la cierra.", "That does not close it.");
      const id = (await c.query<{ id: string }>(`insert into city_close_requests (city_id, from_status, to_status, requested_by, reason) values ($1, $2, $3, $4, $5) returning id::text`, [ciudadId, ci.status, a, s.id, m])).rows[0]!.id;
      await auditar(c, { actor: s.id, action: "ciud.cierre.pedir", targetKind: "city", targetId: ciudadId, city: ciudadId, before: { estado: ci.status === "on" ? "abierta" : "en beta" }, after: { pide: a === "off" ? "cerrada" : a === "soon" ? "próximamente" : "beta", ref: { pedido: id } }, reason: m });
      return bien("Pedido: lo aprueba otra persona del equipo. Mientras, la ciudad sigue como está.", "Requested: another team member approves it. Meanwhile the city stays as it is.");
    });
  } catch (e) {
    if (/city_close_requests_una/.test(String((e as Error)?.message))) return mal("Ya hay un cierre pendiente de esta ciudad.", "There is already a pending close for this city.");
    throw e;
  }
}

export async function decidirCierre(s: Staff, pedido: string, aprobar: boolean, motivo: string): Promise<Res> {
  const m = limpio(motivo, 300);
  if (!/^\d{1,18}$/.test(String(pedido))) return mal("Ese pedido no existe.", "That request does not exist.");
  if (m.length < 3) return mal("Escribe el motivo.", "Write the reason.");
  return tx(async (c) => {
    const x = (await c.query<{ city: string; a: Estado; de: Estado; by: string; st: string }>(
      `select city_id as city, to_status as a, from_status as de, requested_by::text as by, status as st from city_close_requests where id = $1::bigint for update`, [pedido])).rows[0];
    if (!x || x.st !== "pendiente") return mal("Ese pedido ya se decidió.", "That request was already decided.");
    if (!s.puede("ciud", "aprobar") || !suya(s, x.city)) return mal("Tu rol no decide cierres de esta ciudad.", "Your role cannot decide this city's closures.");
    if (x.by === s.id) return mal("Lo decide otra persona del equipo, no quien lo pidió.", "Another team member decides it, not whoever asked.");
    const ci = await ciudad(c, x.city, true);
    if (!ci || ci.status !== x.de) {
      await c.query(`update city_close_requests set status = 'rechazada', decided_by = $2, decision_reason = $3 where id = $1::bigint`, [pedido, s.id, "La ciudad ya no estaba como cuando se pidió"]);
      return mal("La ciudad cambió desde que se pidió: el pedido se cerró. Pídelo otra vez si hace falta.", "The city changed since the request: it was closed. Ask again if needed.");
    }
    await c.query(`update city_close_requests set status = $2, decided_by = $3, decision_reason = $4 where id = $1::bigint`, [pedido, aprobar ? "aprobada" : "rechazada", s.id, m]);
    if (aprobar) {
      await rastro(c, s, m, { "tl.cierre": pedido });
      await c.query(`update cities set status = $2, updated_at = now() where id = $1`, [x.city, x.a]);
    }
    const nom = (e: Estado) => (e === "on" ? "abierta" : e === "beta" ? "en beta" : e === "soon" ? "próximamente" : "cerrada");
    await auditar(c, { actor: s.id, action: aprobar ? "ciud.cierre.aprobar" : "ciud.cierre.rechazar", targetKind: "city", targetId: x.city, city: x.city,
      before: { estado: nom(x.de) }, after: { estado: nom(aprobar ? x.a : x.de), ref: { pedido } }, reason: m });
    return aprobar ? bien(`${ci.name} quedó ${nom(x.a)}.`, `${ci.name} is now ${x.a === "off" ? "closed" : x.a === "soon" ? "coming soon" : "in beta"}.`)
      : bien("Rechazado: la ciudad sigue como estaba.", "Rejected: the city stays as it was.");
  });
}

export async function retirarCierre(s: Staff, pedido: string, motivo: string): Promise<Res> {
  const m = limpio(motivo, 300);
  if (!/^\d{1,18}$/.test(String(pedido))) return mal("Ese pedido no existe.", "That request does not exist.");
  if (m.length < 3) return mal("Escribe el motivo.", "Write the reason.");
  return tx(async (c) => {
    const x = (await c.query<{ city: string; by: string; st: string }>(`select city_id as city, requested_by::text as by, status as st from city_close_requests where id = $1::bigint for update`, [pedido])).rows[0];
    if (!x || x.st !== "pendiente") return mal("Ese pedido ya se decidió.", "That request was already decided.");
    if (x.by !== s.id) return mal("Solo quien lo pidió lo retira.", "Only whoever asked can withdraw it.");
    await c.query(`update city_close_requests set status = 'retirada', decision_reason = $2 where id = $1::bigint`, [pedido, m]);
    await auditar(c, { actor: s.id, action: "ciud.cierre.retirar", targetKind: "city", targetId: x.city, city: x.city, after: { pedido: "retirado" }, reason: m });
    return bien("Pedido retirado.", "Request withdrawn.");
  });
}

/* ── La regla de apertura (Admin) ── */
export async function cambiarRegla(s: Staff, ciudadId: string, v: { listos: number; espera: number; cats: Record<string, number> }, motivo: string): Promise<Res> {
  const m = limpio(motivo, 300);
  if (!esAdmin(s) || !s.puede("ciud", "aprobar")) return mal("La regla de apertura la cambia un Admin.", "An Admin changes the opening rule.");
  const listos = Math.floor(Number(v.listos)), espera = Math.floor(Number(v.espera));
  if (!(listos >= 0 && listos <= 100000) || !(espera >= 0 && espera <= 1000000)) return mal("Los mínimos van de 0 en adelante.", "Minimums go from 0 up.");
  const cats: Record<string, number> = {};
  for (const [k] of CLAVES) { const n = Math.floor(Number(v.cats?.[k] ?? 0)); if (!(n >= 0 && n <= 1000)) return mal("Cada categoría pide de 0 a 1000.", "Each category asks 0 to 1000."); if (n > 0) cats[k] = n; }
  if (m.length < 3) return mal("Escribe el motivo.", "Write the reason.");
  return tx(async (c) => {
    const a = (await c.query<{ l: number; e: number; c: Record<string, number> }>(`select min_ready as l, min_waitlist as e, min_por_categoria as c from city_open_rules where city_id = $1 for update`, [ciudadId])).rows[0];
    if (!a) return mal("Esa ciudad no existe.", "That city does not exist.");
    await c.query(`update city_open_rules set min_ready = $2, min_waitlist = $3, min_por_categoria = $4::jsonb, ok = null, checked_at = null, updated_by = $5, updated_at = now() where city_id = $1`,
      [ciudadId, listos, espera, JSON.stringify(cats), s.id]);
    await auditar(c, { actor: s.id, action: "ciud.regla", targetKind: "city", targetId: ciudadId, city: ciudadId,
      before: { negocios: a.l, lista: a.e, categorias: Object.entries(a.c).map(([k, n]) => `${nombreCategoria(k).es} ${n}`).join(", ") },
      after: { negocios: listos, lista: espera, categorias: Object.entries(cats).map(([k, n]) => `${nombreCategoria(k).es} ${n}`).join(", ") }, reason: m });
    return bien("Regla guardada. El paso «Comprobar» la vuelve a mirar.", "Rule saved. The «Check» step looks at it again.");
  });
}

/* ── Ajustes de la ciudad: radio por defecto (ciud:editar), zona horaria e impuesto (Admin) ── */
export async function ajustarCiudad(s: Staff, ciudadId: string, campo: string, valor: string, motivo: string): Promise<Res> {
  const m = limpio(motivo, 300), v = limpio(valor, 40);
  if (!suya(s, ciudadId)) return mal("Esa ciudad no es tuya.", "That city is not yours.");
  if (m.length < 3) return mal("Escribe el motivo.", "Write the reason.");
  return tx(async (c) => {
    const ci = await ciudad(c, ciudadId, true);
    if (!ci) return mal("Esa ciudad no existe.", "That city does not exist.");
    if (campo === "radio") {
      if (!s.puede("ciud", "editar")) return mal("Tu rol no cambia el radio.", "Your role cannot change the radius.");
      const r = Number(v);
      if (!ci.radios.includes(r)) return mal("Elige uno de los radios de la ciudad.", "Pick one of the city's radii.");
      await c.query(`update cities set default_radius = $2, updated_at = now() where id = $1`, [ciudadId, r]);
      await auditar(c, { actor: s.id, action: "ciud.ajuste", targetKind: "city", targetId: ciudadId, city: ciudadId, before: { radio: `${ci.radio} mi` }, after: { radio: `${r} mi` }, reason: m });
      return bien(`Radio por defecto: ${r} mi (para quien llega nuevo).`, `Default radius: ${r} mi (for newcomers).`);
    }
    if (!esAdmin(s)) return mal("La zona horaria y el impuesto los cambia un Admin.", "An Admin changes the time zone and the tax.");
    if (campo === "zona") {
      if (!(ZONAS_HORARIAS as readonly string[]).includes(v)) return mal("Elige una zona horaria de la lista.", "Pick a time zone from the list.");
      await c.query(`update cities set timezone = $2, updated_at = now() where id = $1`, [ciudadId, v]);
      await auditar(c, { actor: s.id, action: "ciud.ajuste", targetKind: "city", targetId: ciudadId, city: ciudadId, before: { zona: ci.tz }, after: { zona: v }, reason: m });
      return bien("Zona horaria guardada: las horas de la ciudad (silencio, avisos, «hoy») la usan desde ya.", "Time zone saved: the city's hours (quiet hours, notices, «today») use it from now on.");
    }
    if (campo === "impuesto") {
      const p = Number(v.replace(",", "."));
      if (!(p >= 0 && p <= 15) || !/^\d{1,2}(\.\d{1,2})?$/.test(v.replace(",", "."))) return mal("El impuesto va de 0 a 15 % (hasta dos decimales).", "The tax goes from 0 to 15% (up to two decimals).");
      await c.query(`update cities set tax_rate = round($2::numeric / 100, 4), updated_at = now() where id = $1`, [ciudadId, p]);
      await auditar(c, { actor: s.id, action: "ciud.ajuste", targetKind: "city", targetId: ciudadId, city: ciudadId, before: { impuesto: `${ci.tax} %` }, after: { impuesto: `${p} %` }, reason: m });
      return bien(`Impuesto de ${ci.name}: ${p} % (lo cobrado antes no cambia).`, `${ci.name} tax: ${p}% (what was charged before does not change).`);
    }
    return mal("Ese ajuste no existe.", "That setting does not exist.");
  });
}

/* ── Barrios (L64): agregar, corregir, retirar. Nada se borra; lo que el equipo cambió, la semilla del catálogo ya no lo pisa. ── */
const slug = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30);
export async function guardarBarrio(s: Staff, ciudadId: string, b: { id?: string | null; es: string; en: string; calleEs: string; calleEn: string; lat: number; lng: number }, motivo: string): Promise<Res<{ id?: string }>> {
  const m = limpio(motivo, 300), es = limpio(b.es, 50), en = limpio(b.en, 50), ce = limpio(b.calleEs, 80), cn = limpio(b.calleEn, 80), lat = Number(b.lat), lng = Number(b.lng);
  if (!s.puede("ciud", "editar") || !suya(s, ciudadId)) return mal("Tu rol no cambia los barrios de esta ciudad.", "Your role cannot change this city's neighborhoods.");
  if (es.length < 2 || en.length < 2) return mal("El nombre va en español y en inglés.", "The name goes in Spanish and English.");
  if (ce.length < 2 || cn.length < 2) return mal("Las calles de referencia van en español y en inglés.", "The reference streets go in Spanish and English.");
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return mal("Escribe el punto (latitud y longitud).", "Write the point (latitude and longitude).");
  if (m.length < 3) return mal("Escribe el motivo.", "Write the reason.");
  return tx(async (c) => {
    const d = (await c.query<{ mi: number }>(`select st_distance(center, st_setsrid(st_makepoint($2, $3), 4326)::geography) / 1609.34 as mi from cities where id = $1`, [ciudadId, lng, lat])).rows[0];
    if (!d) return mal("Esa ciudad no existe.", "That city does not exist.");
    if (d.mi > 15) return mal("Ese punto queda a más de 15 mi de la ciudad: revísalo.", "That point is more than 15 mi from the city: check it.");
    if (b.id) {
      const z = (await c.query<{ es: string; calle: string; lat: number; lng: number }>(
        `select name->>'es' as es, coalesce(streets->>'es', '') as calle, st_y(center::geometry) as lat, st_x(center::geometry) as lng from zones where id = $1 and city_id = $2 and retired_at is null for update`, [b.id, ciudadId])).rows[0];
      if (!z) return mal("Ese barrio no existe o ya se retiró.", "That neighborhood does not exist or was retired.");
      await c.query(`update zones set name = $2::jsonb, streets = $3::jsonb, center = st_setsrid(st_makepoint($4, $5), 4326)::geography, edited_by = $6, edited_at = now() where id = $1`,
        [b.id, JSON.stringify({ es, en }), JSON.stringify({ es: ce, en: cn }), lng, lat, s.id]);
      await auditar(c, { actor: s.id, action: "ciud.barrio.editar", targetKind: "zone", targetId: b.id, city: ciudadId, before: { barrio: z.es, calles: z.calle, punto: `${z.lat.toFixed(4)}, ${z.lng.toFixed(4)}` }, after: { barrio: es, calles: ce, punto: `${lat.toFixed(4)}, ${lng.toFixed(4)}` }, reason: m });
      return bien("Barrio guardado: el selector lo muestra al momento.", "Neighborhood saved: the selector shows it right away.", { id: b.id });
    }
    const base = `${ciudadId}-${slug(en) || slug(es) || "barrio"}`;
    let id = base;
    for (let i = 2; (await c.query(`select 1 from zones where id = $1`, [id])).rowCount; i++) id = `${base}-${i}`;
    const sort = (await c.query<{ n: number }>(`select coalesce(max(sort), 0)::int + 1 as n from zones where city_id = $1`, [ciudadId])).rows[0]!.n;
    await c.query(`insert into zones (id, city_id, name, streets, center, sort, edited_by, edited_at) values ($1, $2, $3::jsonb, $4::jsonb, st_setsrid(st_makepoint($5, $6), 4326)::geography, $7, $8, now())`,
      [id, ciudadId, JSON.stringify({ es, en }), JSON.stringify({ es: ce, en: cn }), lng, lat, sort, s.id]);
    await auditar(c, { actor: s.id, action: "ciud.barrio.agregar", targetKind: "zone", targetId: id, city: ciudadId, after: { barrio: es, calles: ce, punto: `${lat.toFixed(4)}, ${lng.toFixed(4)}` }, reason: m });
    return bien(`Barrio «${es}» agregado.`, `Neighborhood «${en}» added.`, { id });
  });
}

export async function retirarBarrio(s: Staff, zona: string, motivo: string): Promise<Res> {
  const m = limpio(motivo, 300), id = limpio(zona, 60);
  if (m.length < 3) return mal("Escribe el motivo.", "Write the reason.");
  return tx(async (c) => {
    const z = (await c.query<{ city: string; es: string }>(`select city_id as city, name->>'es' as es from zones where id = $1 and retired_at is null for update`, [id])).rows[0];
    if (!z) return mal("Ese barrio ya no está.", "That neighborhood is gone.");
    if (!s.puede("ciud", "editar") || !suya(s, z.city)) return mal("Tu rol no cambia los barrios de esta ciudad.", "Your role cannot change this city's neighborhoods.");
    if (id.endsWith("-centro")) return mal("El centro no se retira (desde ahí se mide): corrígelo.", "Downtown is not retired (distance is measured from it): edit it.");
    await c.query(`update zones set retired_at = now(), retired_by = $2 where id = $1`, [id, s.id]);
    await c.query(`update users set viewing_center = 'centro' where viewing_city_id = $1 and viewing_center = $2`, [z.city, id]);
    await auditar(c, { actor: s.id, action: "ciud.barrio.retirar", targetKind: "zone", targetId: id, city: z.city, before: { barrio: z.es }, after: { barrio: "retirado" }, reason: m });
    return bien(`«${z.es}» retirado: quien medía desde ahí pasa al centro.`, `«${z.es}» retired: whoever measured from there moves to downtown.`);
  });
}
