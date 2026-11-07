import "server-only";
import { db } from "./db";
import { herramientaTrans, kindTrans, salidasDe } from "./transporte";
import { LIC_TRANS, type Bi, type HerrTrans, type KindTrans, type SvcTrans } from "./transporte-comun";

/* La ficha de un negocio de Transporte (4x · fase4-fiestas-transporte.md §4x · neg-trans-listing.js listingAdd L77–97,
   neg-trans-kind.js post). Servicios con su precio cerrado y lo que incluye, la próxima salida con asientos (por asiento), Tu
   herramienta (maletas, asiento de niño, rampa, caja), la licencia verificada y si se reserva en la app: Pro, con el módulo
   encendido y la licencia de su tipo válida (sin ella, «Licencia en revisión» y se llama). El servidor calcula. */
export type TransPublico = {
  negocio: { id: string; nombre: string; direccion: string | null; telefono: string | null; foto: string | null; ciudad: string };
  secciones: { id: string; name: Bi }[]; servicios: SvcTrans[]; kind: KindTrans; h: Omit<HerrTrans, "salidas"> | null;
  lic: { kind: string; titulo: Bi; numero: string | null }[]; licOk: boolean; licEnRevision: boolean; booking: boolean;
  tags: string[]; zone: number | null; sinLocal: boolean; h24: boolean;
};

export async function transPublico(negocio: string): Promise<TransPublico | null> {
  const b = (await db().query<{ id: string; name: string; address: string | null; phone: string | null; foto: string | null; mods: string[]; off: Record<string, unknown> | null; fv: string[];
    cat: string; zone: number | null; casa: boolean; ciudad: string; pro: boolean }>(
    `select b.id, b.name, b.address, b.phone, (select m.url from media m where m.owner_kind = 'business' and m.owner_id = b.id and m.status = 'visible' order by m.sort limit 1) as foto,
            b.modules_on as mods, b.modules_off as off, b.filter_values as fv, b.category_id as cat, b.service_radius_mi as zone, b.works_from_home as casa, ci.name as ciudad,
            coalesce(st.plan, 'free') = 'pro' as pro
       from businesses b join cities ci on ci.id = b.city_id left join business_stats_cache st on st.business_id = b.id where b.id = $1 and b.status = 'active'`, [negocio])).rows[0];
  if (!b || b.cat !== "NEG-TRANS" || (b.off ?? {}).svc) return null;
  const k = await kindTrans(negocio);
  const S = await db().query<{ id: string; name: Bi }>(`select id::text, name from item_sections where business_id = $1 and module = 'svc' and removed_at is null order by sort, id`, [negocio]);
  const I = await db().query<Omit<SvcTrans, "prox">>(
    `select i.id::text, i.section_id::text as sec, i.name, coalesce(i.descr, '{"es":"","en":""}'::jsonb) as desc, i.price_cents as cents, coalesce(i.svc_kind, 'priv') as k,
            coalesce((select array_agg(x::int order by x::int) from jsonb_array_elements_text(coalesce(i.svc_attrs->'sal', '[]'::jsonb)) x), '{}') as sal,
            (i.svc_attrs->>'pax')::int as pax, (i.svc_attrs->>'child')::int as child, i.svc_attrs->'to' as "to", i.svc_attrs->'from' as "from", (i.svc_attrs->>'dmin')::int as dmin,
            (i.svc_attrs->>'wait')::int as wait, coalesce(i.svc_attrs->'inc', '[]'::jsonb) as inc, i.photos[1] as foto
       from items i where i.business_id = $1 and i.module = 'svc' and i.removed_at is null and i.sell and i.status = 'live' and not i.is_extra order by i.sort, i.id`, [negocio]);
  if (!I.rows.length) return null;
  const L = await db().query<{ kind: string; titulo: Bi; numero: string | null; status: string }>(
    `select l.kind, coalesce(nullif(l.title, '{}'::jsonb), lk.title) as titulo, l.number as numero, l.status from licenses l join license_kinds lk on lk.key = l.kind
      where l.business_id = $1 and l.member_id is null and l.status in ('valid', 'review') order by l.sort`, [negocio]);
  const h0 = await herramientaTrans(negocio);
  // La próxima salida con asientos de cada ruta: hoy (las que faltan) o mañana.
  let prox: Record<string, { m: number; hoy: boolean; quedan: number }> = {};
  if (I.rows.some((s) => s.k === "asiento")) {
    const hoy = (await salidasDe(negocio)).filter((x) => x.futura && !x.cancelada);
    const man = (await db().query<{ d: string }>(`select ((now() at time zone ci.timezone)::date + 1)::text as d from businesses b join cities ci on ci.id = b.city_id where b.id = $1`, [negocio])).rows[0]!.d;
    const mañana = (await salidasDe(negocio, man)).filter((x) => !x.cancelada);
    prox = {};
    for (const s of I.rows.filter((z) => z.k === "asiento")) {
      const a = hoy.find((x) => x.item === s.id && x.quedan > 0), m = mañana.find((x) => x.item === s.id && x.quedan > 0);
      if (a) prox[s.id] = { m: a.m, hoy: true, quedan: a.quedan }; else if (m) prox[s.id] = { m: m.m, hoy: false, quedan: m.quedan };
    }
  }
  const h24 = (await db().query<{ ok: boolean }>(
    `select count(*) filter (where open and ranges = '[["00:00", "00:00"]]'::jsonb or ranges = '[["00:00", "24:00"]]'::jsonb) = 7 as ok from business_hours where business_id = $1 and module = ''`, [negocio])).rows[0]?.ok ?? false;
  const kind = k?.kind ?? "taxi", req = LIC_TRANS[kind] ?? [];
  const valid = L.rows.filter((x) => x.status === "valid");
  const licOk = !req.length || req.some((r) => valid.some((x) => x.kind === r));
  const usados = new Set(I.rows.map((x) => x.sec)), tags = b.fv ?? [];
  const h = h0 ? (({ salidas: _s, ...r }) => r)(h0) : null;
  return {
    negocio: { id: b.id, nombre: b.name, direccion: b.casa ? null : b.address, telefono: b.phone, foto: b.foto, ciudad: b.ciudad },
    secciones: S.rows.filter((x) => usados.has(x.id)), servicios: I.rows.map((s) => ({ ...s, prox: prox[s.id] ?? null })), kind, h,
    lic: valid.map((x) => ({ kind: x.kind, titulo: x.titulo, numero: x.numero })), licOk, licEnRevision: !licOk && L.rows.some((x) => x.status === "review" && req.includes(x.kind)),
    booking: b.pro && (b.mods ?? []).includes("citas") && !(b.off ?? {}).citas && licOk, tags, zone: b.zone,
    sinLocal: b.casa || !b.address || ["grua", "courier", "mud", "cdl"].includes(kind), h24: h24 || tags.includes("24h"),
  };
}
