import "server-only";
import type { Pool, PoolClient } from "pg";
import { cobrarOperacion, comision, devolverPago, liberarOperacion, registrarRetencion } from "./cobros";
import { db, tx } from "./db";
import { etiquetaGrupo, fechaCorta, horaInsc, rubroInsc, sumarDiasI, usdI, type Bi, type KindInsc, type RubroInsc } from "./inscripciones-comun";
import { esCuidado, kindNinosDe, type KindNinos } from "./ninos-comun";
import { guardarNino, limpiarNino } from "./ninos-privado";
import { pasarela } from "./pagos/pasarela";

/* Inscribirse en un curso, programa o membresía (Fase 4 · 4ee · fase4-edu-ninos-deporte.md §3 y §4ee · neg-edu-flow.js).
   - Una inscripción es una operación `enrollment` (I-4101…). Lo que importa se COPIA al enviar (precio, matrícula, plan, certificado,
     contrato y lo que cuesta salirse, el grupo y su inicio): si el negocio cambia la herramienta después, lo enviado no cambia.
   - DINERO: en la app solo pasa la MATRÍCULA de un `curso` (si el negocio cobra con tarjeta): se RETIENE al enviar y se COBRA al
     confirmar. Mensualidad, semana, clase, hora, el resto del curso y el plan de pagos se pagan en el lugar. Ningún cobro fuera de
     sesión (guardián soloMatriculaEnLaApp). Sin respuesta, «No hay cupo» u «otro grupo» que no aceptas → se libera completo.
     Cancelar antes de empezar → devolución completa; después → la matrícula no se devuelve. El grupo no abre o el negocio cancela →
     devolución completa a todos, siempre.
   - CUPO: el grupo (class_groups.seats_booked) o la banda de edad (care_openings.openings) se mueve aquí y solo aquí, con el candado
     `insc:{negocio}` (la última plaza no se da dos veces; la base tampoco deja pasarse). Una oferta de la lista de espera aparta el cupo 48 h.
   - NIÑOS: con «Para mi hijo o hija» los datos del niño van cifrados por lib/ninos-privado.ts; nunca en avisos (guardián avisoNinosNeutro).
     Terapias y familia: avisos sin el nombre del servicio. */
type Q = Pool | PoolClient;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, ID = /^\d{1,18}$/;
export const NUM_I = /^I-\d{1,10}$/;
const VIVAS = ["pending", "change_proposed", "confirmed"];
const no = (es: string, en: string, extra?: Record<string, true>) => ({ ok: false as const, msg: { es, en } as Bi, ...extra });
export type Para = "yo" | "hijo" | "otro";
export type Nivel = "cero" | "algo" | "medio";
const NIVELES: Nivel[] = ["cero", "algo", "medio"];
const limpio = (v: unknown, n: number) => (typeof v === "string" ? v.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, n) : "");

/* ── El negocio y el servicio ── */
type Ctx = { id: string; name: string; city: string; tz: string; plan: string; mods: string[]; off: Record<string, unknown>; cuenta: string | null; hoy: string; cat: string; subs: string[];
  ov: string | null; reply: number; contrato: number; salir: number; address: string | null; phone: string | null; foto: string | null };
async function contexto(c: Q, negocio: string): Promise<(Ctx & { rubro: RubroInsc; neutro: boolean; kn: KindNinos | null }) | null> {
  const x = (await c.query<Ctx>(
    `select b.id, b.name, b.city_id as city, ci.timezone as tz, coalesce(st.plan, 'free') as plan, b.modules_on as mods, coalesce(b.modules_off, '{}'::jsonb) as off, b.category_id as cat,
            b.address, b.phone, (select m.url from media m where m.owner_kind = 'business' and m.owner_id = b.id and m.status = 'visible' order by m.sort limit 1) as foto,
            (select a.stripe_account_id from stripe_accounts a where a.business_id = b.id and a.charges_enabled and not a.payouts_paused) as cuenta,
            (now() at time zone ci.timezone)::date::text as hoy,
            coalesce((select array_agg(sc.name->>'es') from subcategorias_vivas sc where sc.id = any(b.subcategory_ids)), '{}') as subs, s.kind_override as ov,
            coalesce(s.reply_h, 24) as reply, coalesce(s.contract_m, 0) as contrato, coalesce(s.cancel_fee_cents, 0) as salir
       from businesses b join cities ci on ci.id = b.city_id left join business_stats_cache st on st.business_id = b.id left join insc_settings s on s.business_id = b.id
      where b.id = $1 and b.status = 'active'`, [negocio])).rows[0];
  const rubro = x ? rubroInsc(x.cat) : null;
  if (!x || !rubro) return null;
  const kn = rubro === "ninos" ? kindNinosDe(x.subs, x.ov) : null;
  return { ...x, rubro, kn, neutro: kn === "terapia" || kn === "familia" };
}
type Svc = { id: string; k: KindInsc; name: Bi; cents: number; mat: number; plan: number; g1: boolean; lvl: boolean; team: boolean; sem: number | null; horas: number | null;
  cert: Bi | null; certBy: Bi | null; oficial: boolean; no: Bi[]; inc: Bi[]; foto: string | null };
const SVC_SQL = `select i.id::text, i.svc_kind as k, i.name, i.price_cents as cents, coalesce(i.deposit_cents, 0) as mat, coalesce((i.svc_attrs->>'plan_n')::int, 0) as plan,
            coalesce((i.svc_attrs->>'g1')::boolean, false) as g1, coalesce((i.svc_attrs->>'lvl')::boolean, false) as lvl, coalesce((i.svc_attrs->>'team')::boolean, false) as team,
            (i.svc_attrs->>'sem')::int as sem, (i.svc_attrs->>'horas')::int as horas, i.svc_attrs->'cert' as cert, i.svc_attrs->'certBy' as "certBy",
            coalesce((i.svc_attrs->>'oficial')::boolean, false) as oficial, coalesce(i.svc_attrs->'no', '[]'::jsonb) as no, coalesce(i.svc_attrs->'inc', '[]'::jsonb) as inc, i.photos[1] as foto
       from items i where i.business_id = $1 and i.id = $2::bigint and i.module = 'svc' and i.removed_at is null and i.sell and i.status = 'live' and not i.is_extra
        and i.svc_kind in ('curso', 'mes', 'semana', 'clase', 'hora')`;
async function servicio(c: Q, negocio: string, id: string): Promise<Svc | null> {
  return (await c.query<Svc>(SVC_SQL, [negocio, id])).rows[0] ?? null;
}
/* Los grupos del servicio que todavía se pueden pedir, con sus cupos libres (menos las ofertas vivas de la lista de espera). */
export type GrupoB = { id: string; label: Bi; inicio: string; fin: string | null; dows: number[]; min: number | null; libres: number; empezo: boolean; mia: boolean };
async function grupos(c: Q, x: Ctx, s: Svc, userId: string | null): Promise<GrupoB[]> {
  const sigue = s.k === "mes" || s.k === "semana"; // una clase que sigue cada mes o semana admite gente después de empezar
  return (await c.query<GrupoB>(
    `select g.id::text, g.label, g.starts_on::text as inicio, g.ends_on::text as fin, g.dows, g.start_min as min, g.starts_on <= $2::date as empezo,
            greatest(0, g.seats_total - g.seats_outside - g.seats_booked - (select count(*)::int from waitlist_entries w where w.group_id = g.id and w.status = 'offered' and w.offered_until > now() and w.user_id is distinct from $4::uuid)) as libres,
            exists (select 1 from waitlist_entries w where w.group_id = g.id and w.status = 'offered' and w.offered_until > now() and w.user_id = $4::uuid) as mia
       from class_groups g where g.item_id = $1::bigint and g.status in ('open', 'started') and coalesce(g.ends_on, g.starts_on) >= $2::date and ($3 or g.starts_on > $2::date)
      order by g.starts_on, g.start_min nulls first, g.id`, [s.id, x.hoy, sigue, userId])).rows;
}
export type BandaB = { id: string; label: Bi; min: number; max: number; libres: number; mia: boolean };
async function bandas(c: Q, negocio: string, userId: string | null): Promise<BandaB[]> {
  return (await c.query<BandaB>(
    `select o.id::text, o.label, o.band_min as min, o.band_max as max,
            greatest(0, o.openings - (select count(*)::int from waitlist_entries w where w.band_id = o.id and w.status = 'offered' and w.offered_until > now() and w.user_id is distinct from $2::uuid)) as libres,
            exists (select 1 from waitlist_entries w where w.band_id = o.id and w.status = 'offered' and w.offered_until > now() and w.user_id = $2::uuid) as mia
       from care_openings o where o.business_id = $1 and o.removed_at is null order by o.sort, o.band_min, o.id`, [negocio, userId])).rows;
}
/* El plan de pagos por escrito: el resto del curso en N pagos sin intereses, el primero el día que empieza y luego cada 30 días. */
export function calendarioPlan(resto: number, n: number, inicio: string): { n: number; cents: number; due: string }[] {
  if (!(n > 0) || resto <= 0) return [];
  const base = Math.floor(resto / n / 100) * 100, primero = resto - base * (n - 1);
  return Array.from({ length: n }, (_, i) => ({ n: i + 1, cents: i === 0 ? primero : base, due: sumarDiasI(inicio, 30 * i) }));
}
export function textoPlan(cal: { n: number; cents: number; due: string }[], negocio: string): Bi {
  const L = (es: boolean) => cal.map((p) => `${p.n}. ${usdI(p.cents)} · ${fechaCorta(p.due, es)}`).join("; ");
  return {
    es: `Plan de pagos sin intereses con ${negocio}: ${cal.length} pagos que se pagan en la escuela (${L(true)}). To’Latino no cobra estas cuotas ni las carga a tu tarjeta. Si cancelas antes de empezar, no debes nada del plan.`,
    en: `Interest-free payment plan with ${negocio}: ${cal.length} payments made at the school (${L(false)}). To’Latino does not charge these installments or put them on your card. If you cancel before starting, you owe nothing on the plan.`,
  };
}

/* ── Lo que necesita la pantalla de inscribirse ── */
export type BookingInsc = {
  negocio: { id: string; nombre: string; foto: string | null; telefono: string | null }; rubro: RubroInsc; cuidado: boolean; neutro: boolean;
  svc: Svc; grupos: GrupoB[]; bandas: BandaB[]; necesitaGrupo: boolean; sinGrupos: boolean; mat: number; matLocal: number; plan: number; contrato: number; salir: number;
  g1: "si" | "usada" | null; para: Para[]; espera: { id: string; pos: number; estado: string; vence: string | null } | null; mias: number; free: boolean; tarjeta: boolean; hoy: string;
};
export async function bookingInsc(negocio: string, svcId: string, userId: string | null): Promise<BookingInsc | null> {
  if (!ID.test(svcId)) return null;
  const x = await contexto(db(), negocio);
  const s = x ? await servicio(db(), negocio, svcId) : null;
  if (!x || !s) return null;
  const G = await grupos(db(), x, s, userId);
  const cuidado = x.kn ? esCuidado(x.kn) : false;
  const B = cuidado && (s.k === "semana" || s.k === "mes") ? await bandas(db(), negocio, userId) : [];
  const tieneGrupos = (await db().query(`select 1 from class_groups where item_id = $1::bigint and status in ('open', 'started') limit 1`, [s.id])).rowCount! > 0;
  const g1 = s.g1 && s.k !== "curso" ? (userId && (await db().query(`select 1 from operations o join operation_events e on e.operation_id = o.id and e.kind = 'insc_g1' where o.user_id = $1::uuid and o.business_id = $2 and e.at > now() - interval '90 days' limit 1`, [userId, negocio])).rowCount ? "usada" : "si") : null;
  const espera = userId ? (await db().query<{ id: string; pos: number; estado: string; vence: string | null }>(
    `select w.id::text, w.status as estado, w.offered_until::text as vence,
            (select count(*)::int from waitlist_entries z where z.item_id = w.item_id and z.group_id is not distinct from w.group_id and z.band_id is not distinct from w.band_id and z.status = 'waiting' and z.id < w.id) as pos
       from waitlist_entries w where w.user_id = $1::uuid and w.item_id = $2::bigint and w.status in ('waiting', 'offered') order by w.id desc limit 1`, [userId, s.id])).rows[0] ?? null : null;
  const mias = userId ? ((await db().query<{ n: number }>(`select count(*)::int as n from operations where user_id = $1::uuid and kind = 'enrollment' and (details->>'item_id') = $2 and status = any($3::text[])`, [userId, s.id, VIVAS])).rows[0]?.n ?? 0) : 0;
  const tarjeta = !!x.cuenta && x.plan === "pro";
  const mat = s.k === "curso" && s.mat > 0 && tarjeta ? s.mat : 0;
  return {
    negocio: { id: x.id, nombre: x.name, foto: x.foto, telefono: x.phone }, rubro: x.rubro, cuidado, neutro: x.neutro, svc: s, grupos: G, bandas: B,
    necesitaGrupo: !B.length && (tieneGrupos || s.k === "curso" || s.k === "clase" || s.k === "hora"), sinGrupos: !tieneGrupos, mat, matLocal: s.k === "curso" && s.mat > 0 && !mat ? s.mat : 0,
    plan: s.k === "curso" ? s.plan : 0, contrato: x.rubro === "dep" && s.k === "mes" ? x.contrato : 0, salir: x.rubro === "dep" && s.k === "mes" ? x.salir : 0,
    g1, para: x.rubro === "ninos" ? ["hijo"] : ["yo", "hijo", "otro"], espera, mias, free: x.plan !== "pro", tarjeta, hoy: x.hoy,
  };
}

/* ── Inscribirme ── */
export type InscIn = { svc: string; grupo?: string | null; banda?: string | null; para: Para; tutor?: boolean; nino?: unknown; nivel?: string | null; equipo?: string | null; nota?: string;
  plan?: boolean; sms?: boolean; pm?: string | null; clave: string };
type Res = { ok: true; numero: string } | { ok: false; msg: Bi; tarjeta?: true; grupo?: true; espera?: true };
const inicioTs = (ymd: string, min: number | null, tz: string) => ({ sql: `(($1::date + make_interval(mins => $2::int)) at time zone $3)`, args: [ymd, min ?? 480, tz] });
export async function inscribirme(userId: string, negocio: string, f: InscIn, entorno: string, ip: string | null): Promise<Res> {
  if (!UUID.test(String(f?.clave)) || !ID.test(String(f?.svc))) return no("Revisa tu solicitud y vuelve a intentarlo.", "Check your request and try again.");
  const para: Para = f.para === "hijo" || f.para === "otro" ? f.para : "yo";
  const nota = limpio(f.nota, 200);
  if (/(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/.test(nota)) return no("Por seguridad, sin teléfonos en la nota.", "For safety, no phone numbers in the note.");
  // Los datos del niño se revisan ANTES de tocar el dinero (y otra vez al guardarlos, cifrados).
  if (para === "hijo") {
    if (f.tutor !== true) return no("Confirma que eres su mamá, papá o tutor legal.", "Confirm you are the parent or legal guardian.");
    const n = limpiarNino(f.nino);
    if (!n.ok) return no(n.es, n.en);
  }
  const c = await db().connect();
  let retenido: string | null = null;
  try {
    await c.query("begin");
    const ya = (await c.query<{ number: string }>(`select number from operations where user_id = $1 and client_key = $2`, [userId, f.clave])).rows[0];
    if (ya) { await c.query("rollback"); return { ok: true, numero: ya.number }; }
    // El candado del negocio: el cupo (grupo, banda u oferta) se cuenta y se toma dentro de él.
    await c.query(`select pg_advisory_xact_lock(hashtext('insc:' || $1))`, [negocio]);
    const x = await contexto(c, negocio);
    const s = x ? await servicio(c, negocio, String(f.svc)) : null;
    if (!x || !s) { await c.query("rollback"); return no("Eso no se pide en línea.", "That is not requested online."); }
    if (x.off.svc) { await c.query("rollback"); return no(`${x.name} no recibe inscripciones en línea por ahora: llama al lugar.`, `${x.name} is not taking online enrollments right now: call the place.`); }
    if (x.plan !== "pro") { await c.query("rollback"); return no(`Aquí no te inscribes por la app: llama o escribe a ${x.name}.`, `You do not enroll in the app here: call or message ${x.name}.`); }
    if (x.rubro === "ninos" && para !== "hijo") { await c.query("rollback"); return no("Los programas de niños se piden para tu hijo o hija.", "Kids programs are requested for your child."); }
    const nivel = s.lvl ? (NIVELES.includes(f.nivel as Nivel) ? (f.nivel as Nivel) : null) : null;
    if (s.lvl && !nivel) { await c.query("rollback"); return no("Elige el nivel.", "Pick the level."); }
    const equipo = s.team ? limpio(f.equipo, 40) : "";
    if (s.team && equipo.length < 2) { await c.query("rollback"); return no("Escribe el nombre del equipo.", "Write the team name."); }
    // Grupo o banda de edad.
    const cuidado = x.kn ? esCuidado(x.kn) : false;
    const G = await grupos(c, x, s, userId);
    const tieneGrupos = (await c.query(`select 1 from class_groups where item_id = $1::bigint and status in ('open', 'started') limit 1`, [s.id])).rowCount! > 0;
    let g: GrupoB | null = null, b: BandaB | null = null;
    // Guardería y cuidado en casa: el cupo es por edad (bandas); entonces no se pide grupo.
    const BB = cuidado && (s.k === "semana" || s.k === "mes") ? await bandas(c, negocio, userId) : [];
    if (!BB.length && (tieneGrupos || s.k === "curso" || s.k === "clase" || s.k === "hora")) {
      g = G.find((y) => y.id === String(f.grupo ?? "")) ?? null;
      if (!tieneGrupos) { await c.query("rollback"); return no("Todavía no hay grupos con fecha. Anótate en la lista de espera o llama al lugar.", "There are no dated groups yet. Join the waitlist or call the place.", { espera: true }); }
      if (!g) { await c.query("rollback"); return no("Elige el grupo.", "Pick the group.", { grupo: true }); }
      if (g.libres < 1 && !g.mia) { await c.query("rollback"); return no("Ese grupo se llenó. Elige otro o anótate en la lista de espera.", "That group filled up. Pick another or join the waitlist.", { grupo: true, espera: true }); }
    }
    if (BB.length) {
      {
        b = BB.find((y) => y.id === String(f.banda ?? "")) ?? null;
        if (!b) { await c.query("rollback"); return no("Elige la edad.", "Pick the age.", { grupo: true }); }
        // La edad del niño tiene que caber en la banda (la licencia del lugar es por edades).
        const ed = para === "hijo" ? limpiarNino(f.nino) : null;
        if (ed?.ok && ed.v.edad != null && !(ed.v.edad >= b.min && ed.v.edad <= b.max)) { await c.query("rollback"); return no(`Ese cupo es para ${b.label.es}: elige la edad de tu niño.`, `That opening is for ${b.label.en}: pick your child's age.`, { grupo: true }); }
        if (b.libres < 1 && !b.mia) { await c.query("rollback"); return no("No quedan cupos para esa edad. Anótate en la lista de espera.", "No openings left for that age. Join the waitlist.", { grupo: true, espera: true }); }
      }
    }
    // Una inscripción viva por persona, servicio y grupo («para mí»); para hijos u otras personas, hasta 4 en el mismo grupo.
    const vivas = (await c.query<{ n: number; yo: number }>(
      `select count(*)::int as n, count(*) filter (where details->>'for' = 'yo')::int as yo from operations where user_id = $1 and kind = 'enrollment' and status = any($2::text[])
          and details->>'item_id' = $3 and coalesce(details->>'group_id', '') = $4 and coalesce(details->>'band_id', '') = $5`, [userId, VIVAS, s.id, g?.id ?? "", b?.id ?? ""])).rows[0]!;
    if ((para === "yo" && vivas.yo > 0) || vivas.n >= 4) { await c.query("rollback"); return no("Ya tienes esta inscripción. Mírala en Mi cuenta.", "You already have this enrollment. See it in My account."); }
    if (((await c.query<{ n: number }>(`select count(*)::int as n from operations where user_id = $1 and kind = 'enrollment' and status in ('pending', 'change_proposed')`, [userId])).rows[0]?.n ?? 0) >= 5) {
      await c.query("rollback"); return no("Tienes 5 inscripciones esperando respuesta. Espera a que te contesten.", "You have 5 enrollments waiting for a reply. Wait for an answer.");
    }
    // Hasta cuándo responde el lugar: reply_h, y nunca después de 12 h antes de que empiece el grupo.
    const empieza = g && !g.empezo ? g.inicio : null;
    const resp = (await c.query<{ rb: string; ok: boolean; ini: string | null }>(
      `select least(now() + make_interval(hours => $4::int), case when $1::date is null then 'infinity'::timestamptz else ${inicioTs("", null, "").sql} - interval '12 hours' end)::text as rb,
              least(now() + make_interval(hours => $4::int), case when $1::date is null then 'infinity'::timestamptz else ${inicioTs("", null, "").sql} - interval '12 hours' end) > now() + interval '1 hour' as ok,
              case when $1::date is null then null else ${inicioTs("", null, "").sql}::text end as ini`,
      [empieza, g?.min ?? 480, x.tz, x.reply])).rows[0]!;
    if (!resp.ok) { await c.query("rollback"); return no("Ese grupo empieza muy pronto para que te confirmen: elige otro o llama al lugar.", "That group starts too soon to confirm you: pick another or call the place.", { grupo: true }); }
    // Primera clase gratis: una vez por persona y lugar cada 90 días.
    const g1 = s.g1 && s.k !== "curso" && !(await c.query(`select 1 from operations o join operation_events e on e.operation_id = o.id and e.kind = 'insc_g1' where o.user_id = $1 and o.business_id = $2 and e.at > now() - interval '90 days' limit 1`, [userId, negocio])).rowCount;
    // El dinero: solo la matrícula de un curso, y solo si el lugar cobra con tarjeta.
    const mat = s.k === "curso" && s.mat > 0 && x.cuenta ? s.mat : 0;
    const planN = f.plan === true && s.k === "curso" && s.plan > 0 && (g?.inicio ?? null) ? s.plan : 0;
    const numero = `I-${(await c.query<{ n: string }>(`select nextval('insc_seq')::text as n`)).rows[0]!.n}`;
    let ret: Awaited<ReturnType<typeof pasarela.retener>> | null = null, fee = 0;
    if (mat > 0) {
      const pm = typeof f.pm === "string" && /^pm_[A-Za-z0-9_]{3,200}$/.test(f.pm) ? f.pm : null;
      if (!pm) { await c.query("rollback"); return no("Elige la tarjeta para la matrícula.", "Choose the card for the registration fee.", { tarjeta: true }); }
      fee = Math.min(await comision(c, "insc", mat), mat);
      const cliente = await pasarela.cliente(userId).catch(() => null);
      ret = await pasarela.retener({ centavos: mat, comision: fee, destino: x.cuenta!, pm, cliente, idem: `insc-${f.clave}-${pm.slice(-24)}`, meta: { enrollment: numero, business_id: x.id } });
      if (!ret.ok) { await c.query("rollback"); return no("Tu tarjeta fue rechazada. No se cobró nada.", "Your card was declined. Nothing was charged.", { tarjeta: true }); }
      retenido = ret.pi;
      if (ret.estado === "accion") { await c.query("rollback"); await pasarela.liberar(ret.pi).catch(() => undefined); retenido = null; return no("Tu banco pide una verificación extra. Prueba con otra tarjeta.", "Your bank asks for an extra verification. Try another card.", { tarjeta: true }); }
    }
    // Lo que importa se COPIA al enviar.
    const det = { rubro: x.rubro, k: s.k, item_id: s.id, svc: s.name, group_id: g?.id ?? null, band_id: b?.id ?? null, group: g ? g.label : b ? b.label : null, starts_on: g?.inicio ?? null, ends_on: g?.fin ?? null,
      start_min: g?.min ?? null, dows: g?.dows ?? [], for: para, guardian_ok: para === "hijo", level: nivel, team_name: equipo || null, price_cents: s.cents, mat_cents: s.k === "curso" ? s.mat : 0,
      mat_app: mat, plan_n: planN, cert: s.cert, cert_by: s.certBy, oficial: s.oficial, no: s.no, contract_m: x.rubro === "dep" && s.k === "mes" ? x.contrato : 0,
      cancel_fee_cents: x.rubro === "dep" && s.k === "mes" ? x.salir : 0, g1, sms: f.sms !== false, neutro: x.neutro, cuidado };
    const op = (await c.query<{ id: string }>(
      `insert into operations (number, kind, city_id, business_id, user_id, status, scheduled_at, customer_note, details, party_size, subtotal_cents, total_cents, deposit_cents, pay_mode, respond_by, client_key, is_test)
       values ($1, 'enrollment', $2, $3, $4, 'pending', $5::timestamptz, nullif($6, ''), $7::jsonb, 1, $8, $8, $9, $10, $11::timestamptz, $12, $13) returning id::text`,
      [numero, x.city, x.id, userId, resp.ini, para === "hijo" ? "" : nota, JSON.stringify(det), s.cents, mat, mat > 0 ? "app" : s.cents > 0 ? "local" : "none", resp.rb, f.clave, entorno !== "produccion"])).rows[0]!.id;
    // El cupo, dentro del candado (la base no deja pasarse).
    if (g) {
      const u = await c.query(`update class_groups set seats_booked = seats_booked + 1, updated_at = now() where id = $1::bigint and seats_total - seats_outside - seats_booked >= 1`, [g.id]);
      if (!u.rowCount) { await c.query("rollback"); if (retenido) await pasarela.liberar(retenido).catch(() => undefined); retenido = null; return no("Ese grupo se llenó. Elige otro o anótate en la lista de espera.", "That group filled up. Pick another or join the waitlist.", { grupo: true, espera: true }); }
    }
    if (b) {
      const u = await c.query(`update care_openings set openings = openings - 1, updated_at = now() where id = $1::bigint and openings >= 1`, [b.id]);
      if (!u.rowCount) { await c.query("rollback"); if (retenido) await pasarela.liberar(retenido).catch(() => undefined); retenido = null; return no("No quedan cupos para esa edad. Anótate en la lista de espera.", "No openings left for that age. Join the waitlist.", { grupo: true, espera: true }); }
    }
    // Si venía de una oferta de la lista de espera, la oferta queda usada.
    if (g?.mia || b?.mia) await c.query(`update waitlist_entries set status = 'accepted', operation_id = $2::bigint, updated_at = now() where user_id = $1 and status = 'offered' and ${g ? "group_id = $3::bigint" : "band_id = $3::bigint"}`, [userId, op, g?.id ?? b?.id]);
    await c.query(`insert into operation_lines (operation_id, item_id, name, qty, unit_price_cents, line_total_cents, tax_pct, options) values ($1, $2, $3::jsonb, 1, $4, $4, 0, '[]'::jsonb)`, [op, s.id, JSON.stringify(s.name), s.cents]);
    if (para === "hijo") {
      const r = await guardarNino(c, op, f.nino);
      if (!r.ok) { await c.query("rollback"); if (retenido) await pasarela.liberar(retenido).catch(() => undefined); retenido = null; return no(r.es, r.en); }
    }
    if (planN && g) {
      const cal = calendarioPlan(s.cents - s.mat, planN, g.inicio);
      await c.query(`insert into plan_terms (operation_id, version, text, schedule, total_cents, ip) values ($1::bigint, 1, $2::jsonb, $3::jsonb, $4, $5)`,
        [op, JSON.stringify(textoPlan(cal, x.name)), JSON.stringify(cal), cal.reduce((a, p) => a + p.cents, 0), ip ? ip.slice(0, 64) : null]);
    }
    if (ret?.ok) await registrarRetencion(c, { opId: op, userId, negocio: x.id, city: x.city, total: mat, comision: fee, r: ret, pm: f.pm ?? undefined, kind: "deposit" });
    await c.query(`insert into operation_events (operation_id, kind, actor, actor_id) values ($1, 'insc_sent', 'user', $2)`, [op, userId]);
    if (g1) await c.query(`insert into operation_events (operation_id, kind, actor, actor_id) values ($1, 'insc_g1', 'user', $2)`, [op, userId]);
    await c.query("commit");
    retenido = null;
    return { ok: true, numero };
  } catch (err) {
    await c.query("rollback").catch(() => undefined);
    if (retenido) await pasarela.liberar(retenido).catch(() => undefined);
    throw err;
  } finally {
    c.release();
  }
}

/* ── Datos y avisos ── */
type Op = { id: string; num: string; biz: string; negocio: string; uid: string; cliente: string; status: string; detail: string | null; tz: string; city: string; det: Record<string, unknown>;
  mat: number; pay: string | null; pid: string | null; amount: number | null; refunded: number | null; hoy: string; sent: string; cxReq: string | null };
const SEL = `select o.id::text, o.number as num, o.business_id as biz, b.name as negocio, o.user_id::text as uid, coalesce(nullif(u.first_name, ''), 'Cliente') as cliente, o.status, o.status_detail as detail,
                    c.timezone as tz, o.city_id as city, o.details as det, o.deposit_cents as mat, o.pay_status as pay, p.id::text as pid, p.amount_cents as amount, p.refunded_cents as refunded,
                    (now() at time zone c.timezone)::date::text as hoy, o.sent_at::text as sent, o.details->>'cancel_req_at' as "cxReq"
               from operations o join businesses b on b.id = o.business_id join cities c on c.id = o.city_id join users u on u.id = o.user_id
               left join payments p on p.operation_id = o.id and p.kind = 'deposit'`;
async function leer(c: Q, where: string, args: unknown[], lock = false): Promise<Op | null> {
  return (await c.query<Op>(`${SEL} where o.kind = 'enrollment' and ${where}${lock ? " for update of o" : ""}`, args)).rows[0] ?? null;
}
const lockN = (c: PoolClient, negocio: string) => c.query(`select pg_advisory_xact_lock(hashtext('insc:' || $1))`, [negocio]);
/* Cuándo empieza, para los avisos y la pantalla: « · Lun y Mié 7 PM · empieza el 5 oct». */
export function cuandoInsc(det: Record<string, unknown>, es: boolean) {
  const ini = det.starts_on ? String(det.starts_on) : null, dows = (det.dows as number[]) ?? [], min = det.start_min == null ? null : Number(det.start_min);
  const lbl = dows.length || min != null ? etiquetaGrupo(dows, min, es) : "";
  return `${lbl ? ` · ${lbl}` : ""}${ini ? (es ? ` · empieza el ${fechaCorta(ini, true)}` : ` · starts ${fechaCorta(ini, false)}`) : ""}`;
}
const svcAviso = (o: Op) => (o.det.neutro ? "una inscripción" : (o.det.svc as Bi)?.es ?? "una inscripción");
async function avisarCliente(numero: string, tpl: string, extra: Record<string, string> = {}) {
  const o = await leer(db(), "o.number = $1", [numero]);
  if (!o) return;
  const { avisar } = await import("./avisos");
  await avisar(o.uid, tpl, { negocio: o.negocio, cuando: cuandoInsc(o.det, true), mat: "", dev: "", grupo: "", cert: "", ...extra }, { href: `/insc/${numero}`, ref: ["enrollment", numero], sinSms: o.det.sms === false });
}
async function avisarNeg(numero: string, tpl: string, extra: Record<string, string> = {}) {
  const o = await leer(db(), "o.number = $1", [numero]);
  if (!o) return;
  const { avisarNegocio } = await import("./avisos");
  await avisarNegocio(o.biz, tpl, { cliente: o.cliente, servicio: svcAviso(o), grupo: "", mat: "", vence: "", ...extra }, { href: `/panel/${o.biz}/hoy?det=insc:${numero}`, ref: ["enrollment", numero] });
}
export async function avisarInscNueva(numero: string) {
  const o = await leer(db(), "o.number = $1", [numero]);
  if (!o) return;
  const rb = (await db().query<{ v: string }>(`select to_char(respond_by at time zone $2, 'FMHH12:MI AM') || ' del ' || to_char(respond_by at time zone $2, 'FMDD/FMMM') as v from operations where id = $1::bigint`, [o.id, o.tz])).rows[0]?.v ?? "";
  await avisarNeg(numero, "biz_insc", { grupo: o.det.group ? ` · ${(o.det.group as Bi).es}` : "", mat: o.mat ? ` Matrícula ${usdI(o.mat)} retenida.` : "", vence: rb });
}
async function ev(c: PoolClient, op: string, kind: string, actor: "user" | "member" | "system", actorId: string | null, note?: Bi) {
  await c.query(`insert into operation_events (operation_id, kind, actor, actor_id, note) values ($1::bigint, $2, $3, $4, $5::jsonb)`, [op, kind, actor, actorId, note ? JSON.stringify(note) : null]);
}
/* Devolver el cupo (grupo o banda) de una inscripción que deja de estar viva. Solo aquí y dentro del candado. */
async function soltarCupo(c: PoolClient, det: Record<string, unknown>) {
  if (det.group_id) await c.query(`update class_groups set seats_booked = greatest(0, seats_booked - 1), updated_at = now() where id = $1::bigint`, [String(det.group_id)]);
  if (det.band_id) await c.query(`update care_openings set openings = least(20, openings + 1), updated_at = now() where id = $1::bigint`, [String(det.band_id)]);
}
/* La matrícula de vuelta: si estaba retenida se libera; si ya se cobró, se devuelve completa. */
async function devolverMat(o: Op, por: "business" | "policy", actorId: string | null, motivo: string, idem: string) {
  if (o.pay === "held") await liberarOperacion(o.id);
  else if ((o.pay === "captured" || o.pay === "partially_refunded") && o.pid && o.amount) await devolverPago({ paymentId: o.pid, centavos: o.amount - (o.refunded ?? 0), por, actorId, motivo, idem });
}
const empezo = (o: Op) => o.detail === "started" || (!!o.det.starts_on && String(o.det.starts_on) <= o.hoy);
type ResI = { ok: true } | { ok: false; msg: Bi };

/* ── El lugar responde: Confirmar · Otro grupo · No hay cupo ── */
export type PasoInsc = "confirmar" | "otro" | "nohay";
export async function responderInsc(negocio: string, numero: string, paso: PasoInsc, actorId: string, alt?: string): Promise<ResI> {
  if (!NUM_I.test(numero)) return no("Esa inscripción no existe.", "That enrollment does not exist.");
  await vencerInsc({ negocio, numero });
  let despues: (() => Promise<void>) | null = null;
  const r = await tx(async (c): Promise<ResI> => {
    await lockN(c, negocio);
    const o = await leer(c, "o.business_id = $1 and o.number = $2", [negocio, numero], true);
    if (!o) return no("Esa inscripción no existe.", "That enrollment does not exist.");
    if (o.status !== "pending") return o.status === "expired" ? no("Pasó el tiempo para responder: la inscripción venció y se liberó la matrícula.", "The time to reply passed: the enrollment expired and the fee was released.") : no("Esta inscripción ya cambió. Actualiza la pantalla.", "This enrollment already changed. Refresh the screen.");
    if (paso === "nohay") {
      await c.query(`update operations set status = 'declined', answered_at = now(), respond_by = null, updated_at = now() where id = $1::bigint`, [o.id]);
      await soltarCupo(c, o.det);
      await ev(c, o.id, "insc_no", "member", actorId);
      despues = async () => { await liberarOperacion(o.id); await avisarCliente(numero, "insc_no", { dev: o.mat ? ` Se liberó tu matrícula de ${usdI(o.mat)}.` : " No se cobró nada." }); };
      return { ok: true };
    }
    if (paso === "otro") {
      if (!ID.test(String(alt))) return no("Elige el otro grupo.", "Pick the other group.");
      if (String(alt) === String(o.det.group_id ?? "")) return no("Ese es el mismo grupo que pidieron.", "That is the same group they asked for.");
      const x = (await contexto(c, negocio))!, s = await servicio(c, negocio, String(o.det.item_id));
      const g = s ? (await grupos(c, x, s, null)).find((y) => y.id === String(alt)) : null;
      if (!g || g.libres < 1) return no("Ese grupo no tiene cupo.", "That group has no openings.");
      if (o.det.for === "yo" && (await c.query(`select 1 from operations where user_id = $1::uuid and kind = 'enrollment' and status = any($2::text[]) and details->>'for' = 'yo' and details->>'group_id' = $3 and id <> $4::bigint`, [o.uid, VIVAS, g.id, o.id])).rowCount)
        return no("Esa persona ya está inscrita en ese grupo.", "That person is already enrolled in that group.");
      // El cupo se mueve: se suelta el pedido y se aparta el propuesto mientras la persona decide.
      await soltarCupo(c, o.det);
      const u = await c.query(`update class_groups set seats_booked = seats_booked + 1, updated_at = now() where id = $1::bigint and seats_total - seats_outside - seats_booked >= 1`, [g.id]);
      if (!u.rowCount) throw new Error("cupo");
      const rb = (await c.query<{ rb: string }>(`select least(now() + interval '48 hours', (($1::date + make_interval(mins => $2::int)) at time zone $3) - interval '12 hours')::text as rb`, [g.inicio, g.min ?? 480, o.tz])).rows[0]!.rb;
      await c.query(`insert into change_proposals (operation_id, kind, proposed, created_by, side, respond_by) values ($1::bigint, 'date', $2::jsonb, $3, 'business', $4::timestamptz)`,
        [o.id, JSON.stringify({ group_id: g.id, label: g.label, starts_on: g.inicio, ends_on: g.fin, start_min: g.min, dows: g.dows, from: o.det.group_id }), actorId, rb]);
      await c.query(`update operations set status = 'change_proposed', answered_at = now(), respond_by = $2::timestamptz, details = details || $3::jsonb, updated_at = now() where id = $1::bigint`,
        [o.id, rb, JSON.stringify({ group_id: null, alt_group_id: g.id })]);
      await ev(c, o.id, "insc_alt", "member", actorId, { es: `Propusiste ${g.label.es}`, en: `You proposed ${g.label.en}` });
      despues = async () => { await avisarCliente(numero, "insc_alt", { grupo: `${g.label.es} · empieza el ${fechaCorta(g.inicio, true)}`, mat: o.mat ? ` Tu matrícula sigue retenida.` : "" }); };
      return { ok: true };
    }
    if (o.mat > 0 && o.pay !== "held") return no("La matrícula de esta inscripción ya no está retenida. Usa «No hay cupo»: la persona puede pedirla otra vez.", "This enrollment's fee is no longer held. Use “No openings”: the person can request again.");
    await c.query(`update operations set status = 'confirmed', answered_at = now(), confirmed_at = now(), respond_by = null, updated_at = now() where id = $1::bigint`, [o.id]);
    await ev(c, o.id, "insc_ok", "member", actorId);
    despues = async () => { await cobrarOperacion(o.id); await avisarCliente(numero, "insc_ok", { mat: o.mat ? ` Se cobró la matrícula de ${usdI(o.mat)}; se descuenta del total.` : "" }); };
    return { ok: true };
  });
  if (r.ok && despues) await (despues as () => Promise<void>)();
  return r;
}

/* ── La persona: cancelar (o pedir la baja de una membresía), aceptar el otro grupo o «No me sirve» ── */
export type QueInsc = "cancelar" | "aceptar" | "nogracias";
export async function inscCliente(userId: string, numero: string, que: QueInsc): Promise<ResI & { quedo?: boolean; baja?: boolean }> {
  if (!NUM_I.test(numero)) return no("Esa inscripción no existe.", "That enrollment does not exist.");
  await vencerInsc({ userId, numero });
  const o0 = await leer(db(), "o.user_id = $1 and o.number = $2", [userId, numero]);
  if (!o0) return no("Esa inscripción no existe.", "That enrollment does not exist.");
  let despues: (() => Promise<void>) | null = null, quedo = false, baja = false;
  const r = await tx(async (c): Promise<ResI> => {
    await lockN(c, o0.biz);
    const o = await leer(c, "o.user_id = $1 and o.number = $2", [userId, numero], true);
    if (!o) return no("Esa inscripción no existe.", "That enrollment does not exist.");
    const ya = no("Esta inscripción ya cambió. Actualiza la pantalla.", "This enrollment already changed. Refresh the screen.");
    if (que === "cancelar") {
      if (!VIVAS.includes(o.status)) return ya;
      const memb = o.det.k === "mes" || o.det.k === "semana";
      // Una membresía (o la semana de la guardería) ya confirmada: se pide la baja con fecha y hora; el lugar la confirma o a las 72 h queda.
      if (o.status === "confirmed" && memb) {
        if (o.detail === "cancel_req") return no("Ya pediste la cancelación. Queda cancelada cuando el lugar la confirme o a las 72 horas.", "You already asked to cancel. It is cancelled when the place confirms or after 72 hours.");
        await c.query(`update operations set status_detail = 'cancel_req', details = details || $2::jsonb, updated_at = now() where id = $1::bigint`, [o.id, JSON.stringify({ cancel_req_at: new Date().toISOString(), prev_detail: o.detail })]);
        await ev(c, o.id, "insc_cancel_req", "user", userId);
        baja = true;
        despues = async () => { await avisarNeg(numero, "biz_insc_cancel_req"); };
        return { ok: true };
      }
      // Un curso: antes de empezar, la matrícula se devuelve completa; después, se queda con la escuela.
      const tarde = o.status === "confirmed" && empezo(o);
      const pierde = tarde && o.mat > 0 && (o.pay === "captured" || o.pay === "partially_refunded");
      quedo = pierde;
      await c.query(`update operations set status = 'cancelled', cancelled_by = 'user', cancelled_at = now(), cancel_reason = $2, respond_by = null, details = details || $3::jsonb, updated_at = now() where id = $1::bigint`,
        [o.id, o.status === "confirmed" ? (tarde ? "tarde" : "a_tiempo") : "solicitud", JSON.stringify({ perdio: pierde })]);
      await c.query(`update change_proposals set status = 'declined', answered_at = now() where operation_id = $1::bigint and status = 'open'`, [o.id]);
      await soltarCupoVivo(c, o);
      await ev(c, o.id, pierde ? "insc_cx_kept" : "insc_cx", "user", userId, pierde ? { es: "Canceló después de empezar: la matrícula se queda con la escuela", en: "Cancelled after starting: the school keeps the fee" } : undefined);
      despues = async () => {
        if (!pierde) await devolverMat(o, "policy", userId, "Cancelación antes de empezar", `icx-${numero}`);
        await avisarCliente(numero, "insc_cx", { dev: o.mat ? (pierde ? ` La matrícula de ${usdI(o.mat)} se quedó con ${o.negocio}.` : ` Te devolvemos ${usdI(o.mat)}.`) : "" });
        await avisarNeg(numero, "biz_insc_cx", { mat: pierde ? ` La matrícula de ${usdI(o.mat)} se queda contigo.` : o.mat ? ` Se le devuelve la matrícula de ${usdI(o.mat)}.` : "" });
      };
      return { ok: true };
    }
    if (o.status !== "change_proposed") return ya;
    const p = (await c.query<{ id: string; v: Record<string, unknown> }>(`select id::text, proposed as v from change_proposals where operation_id = $1::bigint and side = 'business' and status = 'open' order by id desc limit 1`, [o.id])).rows[0];
    if (!p) return ya;
    if (que === "nogracias") {
      await c.query(`update change_proposals set status = 'declined', answered_at = now() where id = $1`, [p.id]);
      await c.query(`update operations set status = 'cancelled', cancelled_by = 'user', cancelled_at = now(), cancel_reason = 'alt_no', respond_by = null, updated_at = now() where id = $1::bigint`, [o.id]);
      await soltarCupo(c, { group_id: o.det.alt_group_id });
      await ev(c, o.id, "alt_declined", "user", userId);
      despues = async () => { await liberarOperacion(o.id); await avisarNeg(numero, "biz_insc_alt_no"); };
      return { ok: true };
    }
    if (o.mat > 0 && o.pay !== "held") return no("Tu matrícula ya no está retenida. Elige «No me sirve» y pide la inscripción otra vez.", "Your fee is no longer held. Choose “Doesn’t work” and request again.");
    const v = p.v;
    await c.query(`update operations set status = 'confirmed', confirmed_at = now(), respond_by = null, scheduled_at = (($2::date + make_interval(mins => $3::int)) at time zone $4), details = details || $5::jsonb, updated_at = now() where id = $1::bigint`,
      [o.id, v.starts_on, v.start_min ?? 480, o.tz, JSON.stringify({ group_id: v.group_id, alt_group_id: null, group: v.label, starts_on: v.starts_on, ends_on: v.ends_on ?? null, start_min: v.start_min ?? null, dows: v.dows ?? [] })]);
    await c.query(`update change_proposals set status = 'accepted', answered_at = now() where id = $1`, [p.id]);
    await ev(c, o.id, "alt_accepted", "user", userId);
    despues = async () => { await cobrarOperacion(o.id); await avisarNeg(numero, "biz_insc_alt_ok", { grupo: (v.label as Bi)?.es ?? "" }); };
    return { ok: true };
  });
  if (r.ok && despues) await (despues as () => Promise<void>)();
  return r.ok ? { ok: true, quedo, baja } : r;
}
/* El cupo que ocupa una inscripción viva: el del grupo pedido o, si le propusieron otro, el propuesto. */
async function soltarCupoVivo(c: PoolClient, o: Op) {
  if (o.status === "change_proposed") await soltarCupo(c, { group_id: o.det.alt_group_id });
  else await soltarCupo(c, o.det);
}

/* ── El lugar: confirmar la baja de una membresía ── */
export async function confirmarBaja(negocio: string, numero: string, actorId: string | null): Promise<ResI> {
  if (!NUM_I.test(numero)) return no("Esa inscripción no existe.", "That enrollment does not exist.");
  let despues: (() => Promise<void>) | null = null;
  const r = await tx(async (c): Promise<ResI> => {
    await lockN(c, negocio);
    const o = await leer(c, "o.business_id = $1 and o.number = $2", [negocio, numero], true);
    if (!o || o.status !== "confirmed" || o.detail !== "cancel_req") return no("Esta inscripción ya cambió. Actualiza la pantalla.", "This enrollment already changed. Refresh the screen.");
    await c.query(`update operations set status = 'cancelled', status_detail = null, cancelled_by = 'user', cancelled_at = now(), cancel_reason = 'baja', updated_at = now() where id = $1::bigint`, [o.id]);
    await soltarCupo(c, o.det);
    await ev(c, o.id, "insc_cancel_ok", actorId ? "member" : "system", actorId);
    const fecha = fechaCorta(String(o.cxReq ?? new Date().toISOString()).slice(0, 10), true);
    despues = async () => { await avisarCliente(numero, "insc_cancelada", { fecha }); };
    return { ok: true };
  });
  if (r.ok && despues) await (despues as () => Promise<void>)();
  return r;
}

/* ── El lugar cancela UNA inscripción (motivo obligatorio; devolución completa siempre) ── */
export async function cancelarInscNegocio(negocio: string, numero: string, motivo: string, actorId: string): Promise<ResI> {
  const mot = limpio(motivo, 200);
  if (!NUM_I.test(numero)) return no("Esa inscripción no existe.", "That enrollment does not exist.");
  if (mot.length < 4) return no("Escribe el motivo: la persona lo ve.", "Write the reason: the person sees it.");
  let despues: (() => Promise<void>) | null = null;
  const r = await tx(async (c): Promise<ResI> => {
    await lockN(c, negocio);
    const o = await leer(c, "o.business_id = $1 and o.number = $2", [negocio, numero], true);
    if (!o || o.status !== "confirmed") return no("Esta inscripción ya cambió. Actualiza la pantalla.", "This enrollment already changed. Refresh the screen.");
    await c.query(`update operations set status = 'cancelled', cancelled_by = 'business', cancelled_at = now(), cancel_reason = 'negocio', details = details || $2::jsonb, updated_at = now() where id = $1::bigint`, [o.id, JSON.stringify({ motivoNeg: mot })]);
    await soltarCupo(c, o.det);
    await ev(c, o.id, "insc_biz_cx", "member", actorId, { es: `Canceló el lugar: ${mot}`, en: `Cancelled by the place: ${mot}` });
    despues = async () => { await devolverMat(o, "business", actorId, "El lugar canceló", `ibx-${numero}`); await avisarCliente(numero, "insc_biz_cx", { motivo: mot }); };
    return { ok: true };
  });
  if (r.ok && despues) await (despues as () => Promise<void>)();
  return r;
}

/* ── El grupo no abre: se cancela el grupo con motivo y se devuelve TODO a todos ── */
export async function cancelarGrupo(negocio: string, grupo: string, motivo: string, actorId: string): Promise<ResI & { n?: number }> {
  const mot = limpio(motivo, 200);
  if (!ID.test(grupo)) return no("Ese grupo no existe.", "That group does not exist.");
  if (mot.length < 4) return no("Escribe el motivo: cada persona inscrita lo ve.", "Write the reason: every enrolled person sees it.");
  const L: Op[] = [];
  const r = await tx(async (c): Promise<ResI> => {
    await lockN(c, negocio);
    const g = (await c.query<{ id: string; status: string }>(`select id::text, status from class_groups where id = $1::bigint and business_id = $2 for update`, [grupo, negocio])).rows[0];
    if (!g || g.status !== "open") return no("Ese grupo ya cambió. Actualiza la pantalla.", "That group already changed. Refresh the screen.");
    await c.query(`update class_groups set status = 'cancelled', cancel_reason = $2, updated_at = now() where id = $1::bigint`, [grupo, mot]);
    const ops = (await c.query<{ num: string }>(
      `select number as num from operations where business_id = $1 and kind = 'enrollment' and status = any($3::text[]) and (details->>'group_id' = $2 or details->>'alt_group_id' = $2) for update`, [negocio, grupo, VIVAS])).rows;
    for (const x of ops) {
      const o = (await leer(c, "o.number = $1", [x.num]))!;
      await c.query(`update operations set status = 'cancelled', cancelled_by = 'business', cancelled_at = now(), cancel_reason = 'grupo', respond_by = null, details = details || $2::jsonb, updated_at = now() where id = $1::bigint`, [o.id, JSON.stringify({ motivoNeg: mot })]);
      await c.query(`update change_proposals set status = 'declined', answered_at = now() where operation_id = $1::bigint and status = 'open'`, [o.id]);
      await ev(c, o.id, "insc_group_cx", "member", actorId, { es: `El grupo no abre: ${mot}`, en: `The group will not open: ${mot}` });
      L.push(o);
    }
    // Los cupos del grupo cancelado ya no cuentan; la lista de espera de ese grupo se cierra.
    await c.query(`update class_groups set seats_booked = 0, updated_at = now() where id = $1::bigint`, [grupo]);
    await c.query(`update waitlist_entries set status = 'left', updated_at = now() where group_id = $1::bigint and status in ('waiting', 'offered')`, [grupo]);
    await c.query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, before, after, reason)
                   select 'user', $1, 'insc.grupo_cancelado', 'class_group', id::text, city_id, null, $3::jsonb, $4 from class_groups where id = $2::bigint`, [actorId, grupo, JSON.stringify({ inscritos: L.length }), mot]);
    // 4eg · «Grupos que no abrieron»: 3 o más en 90 días abren un caso para To'Latino (uno abierto por lugar).
    await c.query(`insert into queue_items (queue, subject_kind, subject_id, business_id, city_id, priority)
                   select 'grupo', 'business', b.id, b.id, b.city_id, 'normal' from businesses b
                    where b.id = $1 and (select count(*) from class_groups g where g.business_id = b.id and g.status = 'cancelled' and g.updated_at > now() - interval '90 days') >= 3
                   on conflict do nothing`, [negocio]);
    return { ok: true };
  });
  if (!r.ok) return r;
  for (const o of L) { await devolverMat(o, "business", actorId, "El grupo no abrió", `igx-${o.num}`); await avisarCliente(o.num, "insc_grupo_cx", { motivo: mot }); }
  return { ok: true, n: L.length };
}

/* ── El lugar marca: empezó · terminó (con certificado) — una inscripción o todo el grupo ── */
export async function marcarInsc(negocio: string, numero: string, que: "empezo" | "termino", actorId: string, cert?: boolean): Promise<ResI> {
  if (!NUM_I.test(numero)) return no("Esa inscripción no existe.", "That enrollment does not exist.");
  let despues: (() => Promise<void>) | null = null;
  const r = await tx(async (c): Promise<ResI> => {
    const o = await leer(c, "o.business_id = $1 and o.number = $2", [negocio, numero], true);
    if (!o || o.status !== "confirmed" || o.detail === "cancel_req") return no("Esta inscripción ya cambió. Actualiza la pantalla.", "This enrollment already changed. Refresh the screen.");
    if (que === "empezo") {
      if (o.detail === "started") return { ok: true };
      await c.query(`update operations set status_detail = 'started', updated_at = now() where id = $1::bigint`, [o.id]);
      await ev(c, o.id, "insc_start", "member", actorId);
      return { ok: true };
    }
    const dio = cert === true && !!o.det.cert;
    await c.query(`update operations set status = 'done', done_at = now(), details = details || $2::jsonb, updated_at = now() where id = $1::bigint`, [o.id, JSON.stringify({ cert_given: dio })]);
    await ev(c, o.id, dio ? "insc_cert" : "insc_done", "member", actorId);
    despues = async () => { await avisarCliente(numero, "insc_done", { cert: dio ? ` ${o.det.oficial ? "Tu certificado" : "Tu constancia"} está listo. ¡Felicidades!` : "" }); };
    return { ok: true };
  });
  if (r.ok && despues) await (despues as () => Promise<void>)();
  return r;
}
export async function marcarGrupo(negocio: string, grupo: string, que: "empezo" | "termino", actorId: string, cert?: boolean): Promise<ResI & { n?: number }> {
  if (!ID.test(grupo)) return no("Ese grupo no existe.", "That group does not exist.");
  const g = (await db().query<{ status: string; inicio: string; hoy: string }>(
    `select g.status, g.starts_on::text as inicio, (now() at time zone ci.timezone)::date::text as hoy from class_groups g join cities ci on ci.id = g.city_id where g.id = $1::bigint and g.business_id = $2`, [grupo, negocio])).rows[0];
  if (!g || g.status === "cancelled" || g.status === "finished") return no("Ese grupo ya cambió. Actualiza la pantalla.", "That group already changed. Refresh the screen.");
  if (g.inicio > g.hoy) return no(`Ese grupo empieza el ${fechaCorta(g.inicio, true)}.`, `That group starts ${fechaCorta(g.inicio, false)}.`);
  const L = (await db().query<{ num: string }>(`select number as num from operations where business_id = $1 and kind = 'enrollment' and status = 'confirmed' and details->>'group_id' = $2 and coalesce(status_detail, '') <> 'cancel_req'`, [negocio, grupo])).rows;
  for (const x of L) await marcarInsc(negocio, x.num, que, actorId, cert);
  await db().query(`update class_groups set status = $2, updated_at = now() where id = $1::bigint`, [grupo, que === "empezo" ? "started" : "finished"]);
  return { ok: true, n: L.length };
}

/* ── El plan de pagos: la escuela marca «pagó la cuota N» (solo inserción) ── */
export async function marcarCuota(negocio: string, numero: string, n: number, actorId: string): Promise<ResI> {
  const o = await leer(db(), "o.business_id = $1 and o.number = $2", [negocio, numero]);
  if (!o || !["confirmed", "done"].includes(o.status)) return no("Esta inscripción ya cambió. Actualiza la pantalla.", "This enrollment already changed. Refresh the screen.");
  const t = (await db().query<{ schedule: { n: number; cents: number }[] }>(`select schedule from plan_terms where operation_id = $1::bigint order by version desc limit 1`, [o.id])).rows[0];
  const p = t?.schedule.find((x) => x.n === Math.floor(Number(n)));
  if (!p) return no("Esa cuota no existe.", "That installment does not exist.");
  await db().query(`insert into plan_marks (operation_id, n, cents, marked_by) values ($1::bigint, $2, $3, $4) on conflict (operation_id, n) do nothing`, [o.id, p.n, p.cents, actorId]);
  return { ok: true };
}

/* ── Lista de espera ── */
export async function anotarmeEspera(userId: string, negocio: string, svcId: string, grupo: string | null, banda: string | null): Promise<ResI> {
  if (!ID.test(svcId) || (grupo && !ID.test(grupo)) || (banda && !ID.test(banda))) return no("Revisa y vuelve a intentarlo.", "Check and try again.");
  return tx(async (c): Promise<ResI> => {
    await lockN(c, negocio);
    const x = await contexto(c, negocio), s = x ? await servicio(c, negocio, svcId) : null;
    if (!x || !s || x.plan !== "pro") return no("Aquí no hay lista de espera en la app: llama al lugar.", "There is no waitlist in the app here: call the place.");
    if (grupo && !(await c.query(`select 1 from class_groups where id = $1::bigint and item_id = $2::bigint and status in ('open', 'started')`, [grupo, s.id])).rowCount) return no("Ese grupo ya no está.", "That group is gone.");
    if (banda && !(await c.query(`select 1 from care_openings where id = $1::bigint and business_id = $2 and removed_at is null`, [banda, negocio])).rowCount) return no("Esa edad ya no está.", "That age group is gone.");
    const ok = await c.query(`insert into waitlist_entries (business_id, city_id, item_id, group_id, band_id, user_id) values ($1, $2, $3::bigint, $4::bigint, $5::bigint, $6) on conflict do nothing`, [negocio, x.city, s.id, grupo, banda, userId]);
    if (!ok.rowCount) return no("Ya estás en la lista de espera.", "You are already on the waitlist.");
    return { ok: true };
  });
}
export async function salirEspera(userId: string, id: string): Promise<ResI> {
  if (!ID.test(id)) return no("Esa lista no existe.", "That waitlist does not exist.");
  const u = await db().query(`update waitlist_entries set status = 'left', updated_at = now() where id = $1::bigint and user_id = $2 and status in ('waiting', 'offered')`, [id, userId]);
  return u.rowCount ? { ok: true } : no("Ya no estás en esa lista.", "You are no longer on that list.");
}
/* Ofrecer el cupo libre a la persona de la lista: lo aparta 48 h. Lo hace el lugar, o el barrido con la siguiente cuando una oferta vence. */
export async function ofrecerCupo(negocio: string, entrada: string, actorId: string | null): Promise<ResI> {
  if (!ID.test(entrada)) return no("Esa persona ya no está en la lista.", "That person is no longer on the list.");
  let aviso: { uid: string; negocio: string; vence: string; href: string } | null = null;
  const r = await tx(async (c): Promise<ResI> => {
    await lockN(c, negocio);
    const w = (await c.query<{ id: string; uid: string; item: string; grupo: string | null; banda: string | null; status: string }>(
      `select id::text, user_id::text as uid, item_id::text as item, group_id::text as grupo, band_id::text as banda, status from waitlist_entries where id = $1::bigint and business_id = $2 for update`, [entrada, negocio])).rows[0];
    if (!w || w.status !== "waiting") return no("Esa persona ya no está esperando.", "That person is no longer waiting.");
    const libres = w.grupo
      ? (await c.query<{ n: number }>(`select greatest(0, seats_total - seats_outside - seats_booked - (select count(*)::int from waitlist_entries z where z.group_id = g.id and z.status = 'offered' and z.offered_until > now()))::int as n from class_groups g where g.id = $1::bigint and g.status in ('open', 'started')`, [w.grupo])).rows[0]?.n ?? 0
      : w.banda ? (await c.query<{ n: number }>(`select greatest(0, openings - (select count(*)::int from waitlist_entries z where z.band_id = o.id and z.status = 'offered' and z.offered_until > now()))::int as n from care_openings o where o.id = $1::bigint and o.removed_at is null`, [w.banda])).rows[0]?.n ?? 0
      : 1; // sin grupo (todavía no hay fechas): la oferta es para pedir el cupo cuando abra
    if (libres < 1) return no("No hay un cupo libre para ofrecer. Sube los cupos en Tu herramienta o espera a que se libere uno.", "There is no free spot to offer. Raise the spots in Your tool or wait for one to free up.");
    const v = (await c.query<{ until: string; neg: string; tz: string }>(
      `update waitlist_entries w set status = 'offered', offered_until = now() + interval '48 hours', offered_by = $2, updated_at = now() from businesses b join cities ci on ci.id = b.city_id
        where w.id = $1::bigint and b.id = w.business_id returning to_char(w.offered_until at time zone ci.timezone, 'FMHH12:MI AM') || ' del ' || to_char(w.offered_until at time zone ci.timezone, 'FMDD/FMMM') as until, b.name as neg, ci.timezone as tz`, [w.id, actorId])).rows[0]!;
    aviso = { uid: w.uid, negocio: v.neg, vence: v.until, href: `/n/${negocio}/inscribirme?svc=${w.item}${w.grupo ? `&grupo=${w.grupo}` : ""}${w.banda ? `&banda=${w.banda}` : ""}` };
    return { ok: true };
  });
  if (r.ok && aviso) { const a = aviso as { uid: string; negocio: string; vence: string; href: string }; await (await import("./avisos")).avisar(a.uid, "insc_oferta", { negocio: a.negocio, vence: a.vence }, { href: a.href, ref: ["waitlist", entrada] }); }
  return r;
}

/* ── El barrido (cada minuto) ── */
export async function vencerInsc(f: { negocio?: string; userId?: string; numero?: string } = {}) {
  const w: string[] = [], a: unknown[] = [];
  if (f.negocio) { a.push(f.negocio); w.push(`o.business_id = $${a.length}`); }
  if (f.userId) { a.push(f.userId); w.push(`o.user_id = $${a.length}::uuid`); }
  if (f.numero) { a.push(f.numero); w.push(`o.number = $${a.length}`); }
  const y = w.length ? ` and ${w.join(" and ")}` : "";
  let n = 0;
  // 1. Sin respuesta a tiempo → SIN RESPUESTA (se suelta el cupo y la matrícula).
  const P = (await db().query<{ num: string; biz: string }>(`select o.number as num, o.business_id as biz from operations o where o.kind = 'enrollment' and o.status in ('pending', 'change_proposed') and o.respond_by < now()${y} limit 200`, a)).rows;
  for (const p of P) {
    const o = await tx(async (c) => {
      await lockN(c, p.biz);
      const o = await leer(c, "o.number = $1", [p.num], true);
      if (!o || !["pending", "change_proposed"].includes(o.status)) return null;
      const alt = o.status === "change_proposed";
      await c.query(alt
        ? `update operations set status = 'cancelled', cancelled_by = 'system', cancelled_at = now(), cancel_reason = 'alt_vencida', respond_by = null, updated_at = now() where id = $1::bigint`
        : `update operations set status = 'expired', status_detail = 'sin_respuesta', respond_by = null, updated_at = now() where id = $1::bigint`, [o.id]);
      if (alt) await c.query(`update change_proposals set status = 'expired', answered_at = now() where operation_id = $1::bigint and status = 'open'`, [o.id]);
      await soltarCupoVivo(c, o);
      await ev(c, o.id, "insc_exp", "system", null, alt ? { es: "No respondió al otro grupo", en: "No answer to the other group" } : { es: "El lugar no contestó a tiempo", en: "The place did not reply in time" });
      return o;
    });
    if (!o) continue;
    n++;
    await liberarOperacion(o.id);
    if (o.status === "pending") await avisarCliente(o.num, "insc_exp", { dev: o.mat ? ` Se liberó tu matrícula de ${usdI(o.mat)}.` : " No se cobró nada." });
  }
  // 2. Empieza: el día de inicio, una inscripción confirmada pasa a EN CURSO (y el grupo a «empezó»).
  const E = (await db().query<{ id: string }>(
    `update operations o set status_detail = 'started', updated_at = now() from cities c where c.id = o.city_id and o.kind = 'enrollment' and o.status = 'confirmed' and o.status_detail is null
        and (o.details->>'starts_on') is not null and (o.details->>'starts_on')::date <= (now() at time zone c.timezone)::date${y} returning o.id::text`, a)).rows;
  for (const e of E) await db().query(`insert into operation_events (operation_id, kind, actor) values ($1::bigint, 'insc_start', 'system')`, [e.id]);
  n += E.length;
  if (!w.length) await db().query(`update class_groups g set status = 'started', updated_at = now() from cities c where c.id = g.city_id and g.status = 'open' and g.starts_on <= (now() at time zone c.timezone)::date`);
  // 3. Mañana empiezas: un recordatorio, una sola vez.
  const R = (await db().query<{ id: string; num: string }>(
    `select o.id::text, o.number as num from operations o join cities c on c.id = o.city_id where o.kind = 'enrollment' and o.status = 'confirmed' and o.status_detail is null
        and (o.details->>'starts_on')::date = (now() at time zone c.timezone)::date + 1 and not exists (select 1 from operation_events e where e.operation_id = o.id and e.kind = 'insc_remind')${y} limit 200`, a)).rows;
  for (const r of R) {
    const ok = await db().query(`insert into operation_events (operation_id, kind, actor) select $1::bigint, 'insc_remind', 'system' where not exists (select 1 from operation_events where operation_id = $1::bigint and kind = 'insc_remind')`, [r.id]);
    if (ok.rowCount) await avisarCliente(r.num, "insc_empieza");
  }
  // 4. Terminó: 7 días después del fin si nadie lo marcó (una sesión suelta, al día siguiente). Las membresías siguen hasta que se cancelan.
  const T = (await db().query<{ id: string; num: string }>(
    `update operations o set status = 'done', done_at = now(), status_detail = 'sin_marcar', updated_at = now() from cities c where c.id = o.city_id and o.kind = 'enrollment' and o.status = 'confirmed'
        and coalesce(o.status_detail, '') <> 'cancel_req' and o.details->>'k' in ('curso', 'clase', 'hora')
        and coalesce((o.details->>'ends_on')::date + 7, (o.details->>'starts_on')::date + 1) <= (now() at time zone c.timezone)::date${y} returning o.id::text, o.number as num`, a)).rows;
  for (const t of T) { await db().query(`insert into operation_events (operation_id, kind, actor) values ($1::bigint, 'insc_done', 'system')`, [t.id]); await avisarCliente(t.num, "insc_done"); }
  n += T.length;
  if (!w.length) await db().query(`update class_groups g set status = 'finished', updated_at = now() from cities c where c.id = g.city_id and g.status = 'started' and coalesce(g.ends_on + 7, g.starts_on + 1) <= (now() at time zone c.timezone)::date`);
  // 5. La baja pedida de una membresía: a las 72 h queda cancelada sola, con su constancia.
  const B = (await db().query<{ num: string; biz: string }>(`select o.number as num, o.business_id as biz from operations o where o.kind = 'enrollment' and o.status = 'confirmed' and o.status_detail = 'cancel_req' and (o.details->>'cancel_req_at')::timestamptz < now() - interval '72 hours'${y} limit 200`, a)).rows;
  for (const b of B) { const r = await confirmarBaja(b.biz, b.num, null); if (r.ok) n++; }
  // 6. Ofertas de la lista de espera vencidas → se ofrece a la siguiente si sigue habiendo cupo.
  if (!f.userId && !f.numero) {
    const O = (await db().query<{ biz: string; item: string; grupo: string | null; banda: string | null }>(
      `update waitlist_entries w set status = 'expired', updated_at = now() where w.status = 'offered' and w.offered_until < now()${f.negocio ? " and w.business_id = $1" : ""}
       returning w.business_id as biz, w.item_id::text as item, w.group_id::text as grupo, w.band_id::text as banda`, f.negocio ? [f.negocio] : [])).rows;
    for (const o of O) {
      const sig = (await db().query<{ id: string }>(`select id::text from waitlist_entries where item_id = $1::bigint and group_id is not distinct from $2::bigint and band_id is not distinct from $3::bigint and status = 'waiting' order by id limit 1`, [o.item, o.grupo, o.banda])).rows[0];
      if (sig) await ofrecerCupo(o.biz, sig.id, null).catch(() => undefined);
    }
    n += O.length;
  }
  return n;
}

/* ── Vistas ── */
export type InscVista = {
  numero: string; estado: string; detalle: string | null; rubro: RubroInsc; k: KindInsc; svc: Bi; grupo: Bi | null; inicio: string | null; fin: string | null; cuando: Bi;
  para: Para; nivel: Nivel | null; equipo: string | null; precio: number; mat: number; matLocal: number; pago: string | null; devuelto: number; plan: { cal: { n: number; cents: number; due: string }[]; pagadas: number[]; texto: Bi } | null;
  cert: Bi | null; oficial: boolean; certDado: boolean; contrato: number; salir: number; g1: boolean; vence: string | null; alt: { label: Bi; inicio: string } | null; perdio: boolean;
  cancelo: string | null; motivoNeg: string | null; bajaPedida: string | null; negocio: { id: string; nombre: string; foto: string | null; telefono: string | null; direccion: string | null };
  nino: { nombre: string } | null; enviada: string; pasos: { k: string; t: Bi; hecho: boolean }[]; resena: boolean; hoy: string;
};
export async function inscVista(userId: string, numero: string): Promise<InscVista | null> {
  if (!NUM_I.test(numero)) return null;
  await vencerInsc({ userId, numero });
  const o = await leer(db(), "o.user_id = $1 and o.number = $2", [userId, numero]);
  if (!o) return null;
  return vista(o, true);
}
async function vista(o: Op, cliente: boolean): Promise<InscVista> {
  const x = (await db().query<{ foto: string | null; phone: string | null; address: string | null; vence: string | null; cxr: string | null; mn: string | null; resena: boolean }>(
    `select (select m.url from media m where m.owner_kind = 'business' and m.owner_id = b.id and m.status = 'visible' order by m.sort limit 1) as foto, b.phone, b.address,
            o.respond_by::text as vence, o.cancel_reason as cxr, o.details->>'motivoNeg' as mn,
            exists (select 1 from reviews r where r.operation_id = o.id) as resena
       from operations o join businesses b on b.id = o.business_id where o.id = $1::bigint`, [o.id])).rows[0]!;
  const t = (await db().query<{ schedule: { n: number; cents: number; due: string }[]; text: Bi }>(`select schedule, text from plan_terms where operation_id = $1::bigint order by version desc limit 1`, [o.id])).rows[0];
  const pagadas = t ? (await db().query<{ n: number }>(`select n from plan_marks where operation_id = $1::bigint order by n`, [o.id])).rows.map((r) => r.n) : [];
  const alt = o.status === "change_proposed" ? (await db().query<{ v: { label: Bi; starts_on: string } }>(`select proposed as v from change_proposals where operation_id = $1::bigint and status = 'open' order by id desc limit 1`, [o.id])).rows[0]?.v : null;
  const nino = cliente && o.det.for === "hijo" ? await (await import("./ninos-privado")).leerNino(o.id, { usuario: o.uid }) : null;
  const k = o.det.k as KindInsc, memb = k === "mes" || k === "semana";
  const conf = o.status === "confirmed" || o.status === "done", enCurso = o.status === "done" || o.detail === "started";
  return {
    numero: o.num, estado: o.status, detalle: o.detail, rubro: o.det.rubro as RubroInsc, k, svc: o.det.svc as Bi, grupo: (o.det.group as Bi) ?? null, inicio: (o.det.starts_on as string) ?? null,
    fin: (o.det.ends_on as string) ?? null, cuando: { es: cuandoInsc(o.det, true).replace(/^ · /, ""), en: cuandoInsc(o.det, false).replace(/^ · /, "") },
    para: o.det.for as Para, nivel: (o.det.level as Nivel) ?? null, equipo: (o.det.team_name as string) ?? null, precio: Number(o.det.price_cents ?? 0), mat: o.mat,
    matLocal: o.mat ? 0 : Number(o.det.mat_cents ?? 0), pago: o.pay, devuelto: o.refunded ?? 0,
    plan: t ? { cal: t.schedule, pagadas, texto: t.text } : null, cert: (o.det.cert as Bi) ?? null, oficial: !!o.det.oficial, certDado: !!o.det.cert_given,
    contrato: Number(o.det.contract_m ?? 0), salir: Number(o.det.cancel_fee_cents ?? 0), g1: !!o.det.g1, vence: x.vence, alt: alt ? { label: alt.label, inicio: alt.starts_on } : null,
    perdio: !!o.det.perdio, cancelo: x.cxr, motivoNeg: x.mn, bajaPedida: o.detail === "cancel_req" ? o.cxReq : null,
    negocio: { id: o.biz, nombre: o.negocio, foto: x.foto, telefono: x.phone, direccion: x.address }, nino: nino ? { nombre: nino.nombre } : null, enviada: o.sent,
    pasos: [
      { k: "enviada", t: { es: "Enviada", en: "Sent" }, hecho: true },
      { k: "confirmada", t: { es: "Confirmada", en: "Confirmed" }, hecho: conf },
      { k: "curso", t: memb ? { es: "Activa", en: "Active" } : { es: "En curso", en: "In progress" }, hecho: enCurso },
      { k: "terminada", t: memb ? { es: "Cancelada", en: "Cancelled" } : { es: "Terminada", en: "Finished" }, hecho: memb ? o.status === "cancelled" && conf : o.status === "done" },
    ],
    resena: x.resena, hoy: o.hoy,
  };
}

/* Panel › Hoy e Inscripciones. */
export type FilaInsc = { numero: string; estado: string; detalle: string | null; cliente: string; svc: Bi; grupo: Bi | null; inicio: string | null; para: Para; nivel: Nivel | null; equipo: string | null;
  mat: number; pago: string | null; vence: string | null; libres: number | null; enviada: string; bajaPedida: string | null };
const FILA = `select o.number as numero, o.status as estado, o.status_detail as detalle, coalesce(nullif(u.first_name, ''), 'Cliente') as cliente, o.details->'svc' as svc, o.details->'group' as grupo,
                     o.details->>'starts_on' as inicio, o.details->>'for' as para, o.details->>'level' as nivel, o.details->>'team_name' as equipo, o.deposit_cents as mat, o.pay_status as pago,
                     o.respond_by::text as vence, o.sent_at::text as enviada, o.details->>'cancel_req_at' as "bajaPedida",
                     (select greatest(0, g.seats_total - g.seats_outside - g.seats_booked) from class_groups g where g.id::text = o.details->>'group_id') as libres
                from operations o join users u on u.id = o.user_id and o.kind = 'enrollment'`;
export type GrupoPanel = { id: string; svc: Bi; label: Bi; inicio: string; fin: string | null; estado: string; total: number; fuera: number; ocupados: number; libres: number; inscritos: number; espera: number };
export type EsperaPanel = { id: string; cliente: string; svc: Bi; grupo: Bi | null; estado: string; vence: string | null; desde: string; libres: number | null };
export type InscPanel = { esperan: FilaInsc[]; bajas: FilaInsc[]; activas: FilaInsc[]; grupos: GrupoPanel[]; espera: EsperaPanel[]; hoy: string };
export async function inscPanel(negocio: string): Promise<InscPanel> {
  await vencerInsc({ negocio });
  const hoy = (await db().query<{ hoy: string }>(`select (now() at time zone ci.timezone)::date::text as hoy from businesses b join cities ci on ci.id = b.city_id where b.id = $1`, [negocio])).rows[0]?.hoy ?? "";
  const F = (await db().query<FilaInsc>(`${FILA} where o.business_id = $1 and o.kind = 'enrollment' and o.status in ('pending', 'change_proposed', 'confirmed') order by o.respond_by nulls last, o.sent_at limit 300`, [negocio])).rows;
  const grupos = (await db().query<GrupoPanel>(
    `select g.id::text, i.name as svc, g.label, g.starts_on::text as inicio, g.ends_on::text as fin, g.status as estado, g.seats_total as total, g.seats_outside as fuera, g.seats_booked as ocupados,
            greatest(0, g.seats_total - g.seats_outside - g.seats_booked) as libres,
            (select count(*)::int from operations o where o.business_id = g.business_id and o.kind = 'enrollment' and o.status = 'confirmed' and o.details->>'group_id' = g.id::text) as inscritos,
            (select count(*)::int from waitlist_entries w where w.group_id = g.id and w.status in ('waiting', 'offered')) as espera
       from class_groups g join items i on i.id = g.item_id where g.business_id = $1 and g.status in ('open', 'started') order by g.starts_on, g.id limit 100`, [negocio])).rows;
  const espera = (await db().query<EsperaPanel>(
    `select w.id::text, coalesce(nullif(u.first_name, ''), 'Cliente') as cliente, i.name as svc, coalesce(g.label, o.label) as grupo, w.status as estado, w.offered_until::text as vence, w.created_at::text as desde,
            case when g.id is not null then greatest(0, g.seats_total - g.seats_outside - g.seats_booked) when o.id is not null then o.openings end as libres
       from waitlist_entries w join users u on u.id = w.user_id join items i on i.id = w.item_id left join class_groups g on g.id = w.group_id left join care_openings o on o.id = w.band_id
      where w.business_id = $1 and w.status in ('waiting', 'offered') order by w.id limit 100`, [negocio])).rows;
  return { esperan: F.filter((x) => x.estado === "pending" || x.estado === "change_proposed"), bajas: F.filter((x) => x.detalle === "cancel_req"), activas: F.filter((x) => x.estado === "confirmed" && x.detalle !== "cancel_req"), grupos, espera, hoy };
}
/* El detalle en el panel: los datos del niño SOLO aquí, para el negocio de esa inscripción, y cada vista queda en la auditoría. */
export type InscDetalle = InscVista & { cliente: string; nota: string | null; ninoPanel: { nombre: string; edad: number | null; grado: string | null; escuela: string | null; nota: string | null } | null;
  historial: { at: string; kind: string; note: Bi | null }[]; otros: { id: string; label: Bi; inicio: string; libres: number }[] };
export async function inscDetalle(negocio: string, numero: string, actorId: string): Promise<InscDetalle | null> {
  if (!NUM_I.test(numero)) return null;
  await vencerInsc({ negocio, numero });
  const o = await leer(db(), "o.business_id = $1 and o.number = $2", [negocio, numero]);
  if (!o) return null;
  const v = await vista(o, false);
  let ninoPanel: InscDetalle["ninoPanel"] = null;
  if (o.det.for === "hijo") {
    ninoPanel = await (await import("./ninos-privado")).leerNino(o.id, { negocio });
    if (ninoPanel) await db().query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, before, after) values ('user', $1, 'insc.ver_nino', 'operation', $2, $3, null, null)`, [actorId, o.num, o.city]);
  }
  const nota = (await db().query<{ n: string | null }>(`select customer_note as n from operations where id = $1::bigint`, [o.id])).rows[0]?.n ?? null;
  const historial = (await db().query<{ at: string; kind: string; note: Bi | null }>(`select at::text, kind, note from operation_events where operation_id = $1::bigint order by at, id`, [o.id])).rows;
  let otros: InscDetalle["otros"] = [];
  if (o.status === "pending" && o.det.group_id) {
    const x = (await contexto(db(), negocio))!, s = await servicio(db(), negocio, String(o.det.item_id));
    otros = s ? (await grupos(db(), x, s, null)).filter((g) => g.id !== String(o.det.group_id) && g.libres > 0 && !g.empezo).map((g) => ({ id: g.id, label: g.label, inicio: g.inicio, libres: g.libres })) : [];
  }
  return { ...v, cliente: o.cliente, nota, ninoPanel, historial, otros };
}
export const etiquetaInsc = (inicio: string | null, min: number | null, es: boolean) => (inicio ? `${fechaCorta(inicio, es)}${min != null ? ` · ${horaInsc(min)}` : ""}` : "");
