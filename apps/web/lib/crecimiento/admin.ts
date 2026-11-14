import "server-only";
import { auditar, type Staff } from "../admin";
import { sinOferta } from "../admin-catalogo";
import { db, tx } from "../db";
import { bien, mal, type Modo, type Res } from "./comun";

/* 9h · Super Admin › Crecimiento (ADM-MKT; prototipo secMkt): las cifras de arriba, la Semilla (recomendaciones de vecinos, búsquedas sin oferta, semillas
   creadas) y la Lista de espera de la landing (por ciudad, código postal, negocios apartados por tipo y «Pide tu ciudad»). La lista NO muestra teléfonos ni
   nombres: el código postal, la ciudad, lo que dijo del negocio, el número de fundador y la fecha. Siempre en las ciudades de quien mira. */

const scope = (col: string) => `(cardinality($1::text[]) = 0 or ${col} = any($1::text[]))`;

export async function resumen(s: Staff, ciudad: string | null) {
  const r = (await db().query<{ negocios: number; semana: number; espera: number; apartados: number; promotores: number; fijados: number; escaneos: number }>(
    `select (select count(*)::int from businesses b where b.status = 'active' and ${scope("b.city_id")} and ($2::text is null or b.city_id = $2)) as negocios,
            (select count(*)::int from businesses b where b.status = 'active' and b.created_at > now() - interval '7 days' and ${scope("b.city_id")} and ($2::text is null or b.city_id = $2)) as semana,
            (select count(*)::int from early_access e where e.removed_at is null and (e.city_id is null or ${scope("e.city_id")}) and ($2::text is null or e.city_id = $2)) as espera,
            (select count(*)::int from early_access e where e.removed_at is null and e.has_business and ${scope("e.city_id")} and ($2::text is null or e.city_id = $2)) as apartados,
            (select count(*)::int from promo_codes k where k.kind = 'promotor' and k.retired_at is null and ${scope("k.city_id")} and ($2::text is null or k.city_id = $2)) as promotores,
            (select count(*)::int from featured f where f.retired_at is null and f.to_at > now() and f.mode = 'fijar' and ${scope("f.city_id")} and ($2::text is null or f.city_id = $2)) as fijados,
            (select coalesce(sum(d.n), 0)::int from link_scan_days d join short_links l on l.code = d.code
              where d.dia > (now() at time zone 'America/New_York')::date - 30 and ${scope("l.city_id")} and ($2::text is null or l.city_id = $2)) as escaneos`, [s.cities, ciudad])).rows[0]!;
  return r;
}

export async function semilla(s: Staff, ciudad: string | null) {
  const [recs, seeds, sin] = await Promise.all([
    db().query<{ id: string; nombre: string; cat: string | null; donde: string | null; at: string }>(
      `select r.id::text, r.business_name as nombre, c.name->>'es' as cat, r."where" as donde, to_char(r.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at
         from recommendations r left join categories c on c.id = r.category_id
        where r.status = 'sent' and ${scope("r.city_id")} and ($2::text is null or r.city_id = $2) order by r.created_at desc limit 20`, [s.cities, ciudad]),
    db().query<{ id: string; nombre: string; cat: string | null; estado: string; at: string }>(
      `select x.id::text, x.name as nombre, c.name->>'es' as cat, x.status as estado, to_char(x.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at
         from seed_listings x left join categories c on c.id = x.category_id
        where ${scope("x.city_id")} and ($2::text is null or x.city_id = $2) order by x.created_at desc limit 20`, [s.cities, ciudad]),
    sinOferta(s),
  ]);
  return { recs: recs.rows, seeds: seeds.rows, sinOferta: sin.slice(0, 8) };
}

export type EntradaLista = { id: string; zip: string; ciudad: string | null; pedida: string | null; negocio: boolean; modo: Modo | null; nombreNegocio: string | null; fv: number | null; fn: number | null; at: string; prueba: boolean };
export async function listaEspera(s: Staff, ciudad: string | null, cursor: string | null) {
  const c = cursor && /^\d{1,18}$/.test(cursor) ? cursor : null;
  const [porCiudad, porModo, porZip, fuera, filas, fecha] = await Promise.all([
    db().query<{ city: string; nombre: string; status: string; n: number; neg: number; fv: number }>(
      `select ci.id as city, ci.name as nombre, ci.status, count(e.id)::int as n, count(e.id) filter (where e.has_business)::int as neg, count(e.founder_vecino_n)::int as fv
         from cities ci left join early_access e on e.city_id = ci.id and e.removed_at is null
        where ${scope("ci.id")} group by ci.id, ci.name, ci.status, ci.sort order by ci.sort`, [s.cities]),
    db().query<{ modo: Modo | null; n: number }>(
      `select business_kind as modo, count(*)::int as n from early_access e where e.removed_at is null and e.has_business and ${scope("e.city_id")} and ($2::text is null or e.city_id = $2)
        group by business_kind order by n desc`, [s.cities, ciudad]),
    db().query<{ zip: string; n: number }>(
      `select zip, count(*)::int as n from early_access e where e.removed_at is null and e.city_id is not null and ${scope("e.city_id")} and ($2::text is null or e.city_id = $2)
        group by zip order by n desc, zip limit 12`, [s.cities, ciudad]),
    db().query<{ pedida: string; n: number }>(
      `select min(asked_city) as pedida, count(*)::int as n from early_access where removed_at is null and city_id is null group by lower(asked_city) order by n desc limit 12`),
    db().query<EntradaLista>(
      `select e.id::text, e.zip, ci.name as ciudad, e.asked_city as pedida, e.has_business as negocio, e.business_kind as modo, e.business_name as "nombreNegocio",
              e.founder_vecino_n as fv, e.founder_negocio_n as fn, e.is_test as prueba, to_char(e.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at
         from early_access e left join cities ci on ci.id = e.city_id
        where e.removed_at is null and (e.city_id is null or ${scope("e.city_id")}) and ($2::text is null or e.city_id = $2) and ($3::bigint is null or e.id < $3::bigint)
        order by e.id desc limit 31`, [s.cities, ciudad, c]),
    fechaLanding(),
  ]);
  const L = filas.rows.slice(0, 30);
  return { porCiudad: porCiudad.rows, porModo: porModo.rows, porZip: porZip.rows, fuera: s.cities.length ? [] : fuera.rows, filas: L, mas: filas.rows.length > 30 ? L[29]!.id : null, fecha };
}

/* La fecha de apertura en la landing (prototipo Coming Soon v3: oculta por defecto). Una sola fecha: las cinco abren el mismo día (decisión A). */
export async function fechaLanding(): Promise<{ visible: boolean; fecha: string | null }> {
  const v = (await db().query<{ v: { visible?: boolean; fecha?: string } | null }>(`select value as v from platform_config where key = 'landing_fecha'`).catch(() => ({ rows: [] }))).rows[0]?.v;
  const fecha = typeof v?.fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v.fecha) ? v.fecha : null;
  return { visible: v?.visible === true && !!fecha, fecha };
}
export async function ponerFechaLanding(s: Staff, visible: boolean, fecha: string, motivo: string): Promise<Res> {
  if (!s.puede("mkt", "aprobar")) return mal("Tu rol no cambia la fecha de la landing.", "Your role cannot change the landing date.");
  if (s.cities.length) return mal("La fecha es de las cinco ciudades: la cambia alguien con todas las ciudades.", "The date is for all five cities: someone with all cities changes it.");
  const f = String(fecha ?? "").trim(), m = String(motivo ?? "").replace(/\s+/g, " ").trim().slice(0, 300);
  if (f && !/^\d{4}-\d{2}-\d{2}$/.test(f)) return mal("La fecha va como AAAA-MM-DD.", "The date goes as YYYY-MM-DD.");
  if (visible && !f) return mal("Para mostrarla, escribe la fecha.", "To show it, write the date.");
  if (m.length < 3) return mal("Escribe el motivo.", "Write the reason.");
  return tx(async (c) => {
    const antes = (await c.query<{ v: unknown }>(`select value as v from platform_config where key = 'landing_fecha' for update`)).rows[0]?.v ?? null;
    const v = { visible: visible === true, fecha: f || null };
    await c.query(`insert into platform_config (key, value, note, updated_by) values ('landing_fecha', $1::jsonb, 'La fecha de apertura en la landing (9h)', $2)
                   on conflict (key) do update set value = excluded.value, updated_by = excluded.updated_by, updated_at = now()`, [JSON.stringify(v), s.id]);
    await auditar(c, { actor: s.id, action: "mkt.landing.fecha", targetKind: "platform_config", targetId: "landing_fecha", before: antes, after: v, reason: m });
    return bien(v.visible ? `La landing dice «Abre el ${f}».` : "La landing no dice fecha.", v.visible ? `The landing says “Opens on ${f}”.` : "The landing shows no date.");
  });
}
