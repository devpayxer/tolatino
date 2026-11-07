import "server-only";
import { db } from "./db";
import { diasOcupados } from "./fiestas";
import { findes, sumarDias, tuFechaValida, type Bi, type CalFiesta, type SvcFiesta, type TuFecha } from "./fiestas-comun";

/* La ficha de un negocio de Fiestas (4u · fase4-fiestas-transporte.md §4u · neg-fiesta-listing.js listingAdd L225–267).
   Servicios por sección con su forma de cobrar, el calendario real (fechas ocupadas derivadas: marcadas o llenas de
   reservas confirmadas), las próximas fechas libres, el depósito, los invitados, la zona y «Tu fecha» de la persona.
   El servidor calcula; el teléfono solo muestra. Al pedir la fecha (4v) se vuelve a comprobar todo. */
export type FiestaPublico = {
  negocio: { id: string; nombre: string; direccion: string | null; telefono: string | null; foto: string | null; ciudad: string };
  secciones: { id: string; name: Bi }[]; servicios: SvcFiesta[];
  cal: CalFiesta; dep: number; zone: number | null; cancel: number; tags: string[];
  sinLocal: boolean; soloTienda: boolean; booking: boolean; esp: boolean;
  fecha: TuFecha | null; sesion: boolean;
};

export async function fiestaPublico(negocio: string, userId: string | null): Promise<FiestaPublico | null> {
  const b = (await db().query<{ id: string; name: string; address: string | null; phone: string | null; foto: string | null; mods: string[]; off: Record<string, unknown> | null; fv: string[];
    cat: string; zone: number | null; casa: boolean; hoy: string; ciudad: string; langs: string[] }>(
    `select b.id, b.name, b.address, b.phone, (select m.url from media m where m.owner_kind = 'business' and m.owner_id = b.id and m.status = 'visible' order by m.sort limit 1) as foto,
            b.modules_on as mods, b.modules_off as off, b.filter_values as fv, b.category_id as cat, b.service_radius_mi as zone, b.works_from_home as casa,
            (now() at time zone ci.timezone)::date::text as hoy, ci.name as ciudad, b.languages as langs
       from businesses b join cities ci on ci.id = b.city_id where b.id = $1 and b.status = 'active'`, [negocio])).rows[0];
  if (!b || b.cat !== "NEG-FIESTA" || (b.off ?? {}).svc) return null;
  const s = (await db().query<{ dep: number; guests: number | null; ahead: number; cancel: number }>(
    `select deposit_cents as dep, guests_max as guests, book_ahead_days as ahead, cancel_full_days as cancel from fiesta_settings where business_id = $1`, [negocio])).rows[0];
  const ahead = s?.ahead ?? 180, hasta = sumarDias(b.hoy, ahead);
  const [S, I, D, F] = await Promise.all([
    db().query<{ id: string; name: Bi }>(`select id::text, name from item_sections where business_id = $1 and module = 'svc' and removed_at is null order by sort, id`, [negocio]),
    db().query<SvcFiesta>(
      `select i.id::text, i.section_id::text as sec, i.name, coalesce(i.descr, '{"es":"","en":""}'::jsonb) as desc, i.price_cents as cents, coalesce(i.svc_kind, 'fijo') as k,
              (i.svc_attrs->>'h')::int as h, (i.svc_attrs->>'cap')::int as cap, coalesce((i.svc_attrs->>'mont')::boolean, false) as mont,
              coalesce(i.svc_attrs->'inc', '[]'::jsonb) as inc, i.svc_attrs->'u' as u, (i.svc_attrs->>'per')::int as per, (i.svc_attrs->>'min')::int as min, i.photos[1] as foto
         from items i where i.business_id = $1 and i.module = 'svc' and i.removed_at is null and i.sell and i.status = 'live' and not i.is_extra order by i.sort, i.id`, [negocio]),
    diasOcupados(negocio, b.hoy, hasta),
    userId ? db().query<{ e: string; day: string; g: number | null; w: string }>(`select coalesce(kind, '') as e, day::text as day, guests as g, coalesce(where_kind, '') as w from user_event_plans where user_id = $1`, [userId]) : Promise.resolve({ rows: [] }),
  ]);
  if (!I.rows.length) return null;
  const ocupadas = D.filter((d) => d.ocupada).map((d) => d.day);
  // Las próximas fechas libres: sábados y domingos desde hoy dentro de lo que aparta en la app (nextFree L185).
  const libres = findes(b.hoy, 60).filter((d) => d <= hasta && !ocupadas.includes(d)).slice(0, 3);
  const usados = new Set(I.rows.map((x) => x.sec)), tags = b.fv ?? [];
  const soloTienda = tags.includes("walk") && !tags.includes("cita") && !tags.includes("visita");
  const fila = F.rows[0];
  return {
    negocio: { id: b.id, nombre: b.name, direccion: b.casa ? null : b.address, telefono: b.phone, foto: b.foto, ciudad: b.ciudad },
    secciones: S.rows.filter((x) => usados.has(x.id)), servicios: I.rows,
    cal: { hoy: b.hoy, hasta, ocupadas, libres, guests: s?.guests ?? null }, dep: s?.dep ?? 0, zone: b.zone, cancel: s?.cancel ?? 30, tags,
    sinLocal: b.casa, soloTienda, booking: (b.mods ?? []).includes("citas") && !(b.off ?? {}).citas, esp: tags.includes("esp") || (b.langs ?? []).includes("es"),
    fecha: fila ? { e: fila.e, day: fila.day, g: fila.g, w: fila.w } : null, sesion: !!userId,
  };
}

/* «Tu fecha» en la cuenta (user_event_plans): vale para todos los negocios de Fiestas. Guardarla no aparta nada. */
export async function guardarTuFecha(userId: string, f0: unknown): Promise<{ ok: true; fecha: TuFecha } | { ok: false; msg: Bi }> {
  const x = (f0 && typeof f0 === "object" ? f0 : {}) as Record<string, unknown>;
  const f: TuFecha = { e: String(x.e ?? ""), day: String(x.day ?? ""), g: x.g == null || x.g === "" ? null : Number(x.g), w: String(x.w ?? "") };
  if (!tuFechaValida(f)) return { ok: false, msg: { es: "Elige el día de tu fiesta.", en: "Pick the day of your party." } };
  const r = (await db().query<{ city: string; ok: boolean }>(
    `select coalesce(u.home_city_id, 'hzl') as city, $2::date between (now() at time zone ci.timezone)::date and (now() at time zone ci.timezone)::date + 730 as ok
       from users u join cities ci on ci.id = coalesce(u.home_city_id, 'hzl') where u.id = $1`, [userId, f.day])).rows[0];
  if (!r) return { ok: false, msg: { es: "Entra para guardarla.", en: "Sign in to save it." } };
  if (!r.ok) return { ok: false, msg: { es: "Elige una fecha de hoy en adelante (hasta 2 años).", en: "Pick a date from today on (up to 2 years)." } };
  await db().query(
    `insert into user_event_plans (user_id, city_id, kind, day, guests, where_kind) values ($1, $2, $3, $4::date, $5, $6)
     on conflict (user_id) do update set city_id = excluded.city_id, kind = excluded.kind, day = excluded.day, guests = excluded.guests, where_kind = excluded.where_kind, updated_at = now()`,
    [userId, r.city, f.e || null, f.day, f.g, f.w || null]);
  return { ok: true, fecha: f };
}

export async function tuFechaDe(userId: string): Promise<TuFecha | null> {
  const r = (await db().query<{ e: string; day: string; g: number | null; w: string }>(
    `select coalesce(kind, '') as e, day::text as day, guests as g, coalesce(where_kind, '') as w from user_event_plans where user_id = $1`, [userId])).rows[0];
  return r ?? null;
}
