import "server-only";
import { db } from "./db";
import { herramientaNoche } from "./noche";
import { POR_FECHA, type Bi, type EstaNoche, type FilaNoche, type KindNoche, type NocheDia } from "./noche-comun";

/* La ficha de un negocio de Noche (4nb · fase4-noche.md §4nb · neg-noche-listing.js listingAdd L118–157, tonight L114–117, liveIt
   L101–106, priceFor L108–113, resAdd L172–177 y neg-noche-kind.js post). Tesis: ¿cuánto es el cover y cómo está la fila? Todo sale de
   «Esta noche» (noche_settings) y de los servicios; la fila con su hora real (nunca «hace 4 min» inventado). La Entrada sigue al cover
   y la Lista a la hora de la lista; las noches especiales con boleto no salen hasta que abra Eventos (Fase 6). El servidor decide. */
export type SvcNoche = { id: string; sec: string | null; name: Bi; desc: Bi; cents: number; k: string; until: number | null; pax: number | null; tables: number | null; hr: boolean;
  dep: number; dows: number[]; inc: Bi[]; foto: string | null };
export type NochePublica = {
  negocio: { id: string; nombre: string; telefono: string | null; foto: string | null };
  kind: KindNoche; porFecha: boolean; secciones: { id: string; name: Bi }[]; servicios: SvcNoche[];
  // Lo de la noche (la próxima que abre; hoy si abre): cover, después de, edad, lista, música, vestimenta, otras noches distintas.
  noche: EstaNoche | null; fila: FilaNoche | null; nota: Bi | null; vestimenta: Bi | null; otras: NocheDia[]; publicado: boolean;
  // Hoy: abierto ahora, aún no abre (abre a…), hoy no abre. Minutos desde las 12 PM de la noche.
  hoy: "abierto" | "aun" | "cerrado"; abre: number | null; cierra: number | null;
  lic: boolean; tags: string[]; lista: boolean; mesas: boolean;
  // Lista y mesas en la app: nacen en 4nc. Hasta entonces se llama o se escribe.
  booking: boolean;
};

const hm = (s: string) => { const [h, m] = s.split(":").map(Number) as [number, number]; return h * 60 + m; };
export async function nochePublica(negocio: string): Promise<NochePublica | null> {
  const b = (await db().query<{ id: string; name: string; phone: string | null; foto: string | null; off: Record<string, unknown> | null; fv: string[]; cat: string; mods: string[];
    ahora: number; dow: number; hay: boolean }>(
    `select b.id, b.name, b.phone, (select m.url from media m where m.owner_kind = 'business' and m.owner_id = b.id and m.status = 'visible' order by m.sort limit 1) as foto,
            b.modules_off as off, b.filter_values as fv, b.category_id as cat, b.modules_on as mods,
            (extract(hour from now() at time zone ci.timezone) * 60 + extract(minute from now() at time zone ci.timezone))::int as ahora,
            extract(dow from now() at time zone ci.timezone)::int as dow, exists (select 1 from noche_settings s where s.business_id = b.id) as hay
       from businesses b join cities ci on ci.id = b.city_id where b.id = $1 and b.status = 'active'`, [negocio])).rows[0];
  if (!b || b.cat !== "NEG-NOCHE") return null;
  const h = await herramientaNoche(negocio);
  if (!h) return null;
  const S = await db().query<{ id: string; name: Bi }>(`select id::text, name from item_sections where business_id = $1 and module = 'svc' and removed_at is null order by sort, id`, [negocio]);
  const I = (b.off ?? {}).svc ? { rows: [] as SvcNoche[] } : await db().query<SvcNoche>(
    `select i.id::text, i.section_id::text as sec, i.name, coalesce(i.descr, '{"es":"","en":""}'::jsonb) as desc, i.price_cents as cents, i.svc_kind as k,
            (i.svc_attrs->>'until')::int as until, (i.svc_attrs->>'pax')::int as pax, (i.svc_attrs->>'tables')::int as tables, coalesce((i.svc_attrs->>'hr')::boolean, false) as hr,
            coalesce(i.deposit_cents, 0) as dep, coalesce((select array_agg(x::int order by x::int) from jsonb_array_elements_text(coalesce(i.svc_attrs->'dows', '[]'::jsonb)) x), '{}') as dows,
            coalesce(i.svc_attrs->'inc', '[]'::jsonb) as inc, i.photos[1] as foto
       from items i where i.business_id = $1 and i.module = 'svc' and i.removed_at is null and i.sell and i.status = 'live' and not i.is_extra
        and i.svc_kind in ('cover', 'lista', 'mesa', 'vip', 'fecha') order by i.sort, i.id`, [negocio]);
  // La Lista sigue a «Esta noche»: sin lista esa noche, no sale; la hora es la de la herramienta.
  const servicios = I.rows.filter((s) => s.k !== "lista" || h.lista).map((s) => (s.k === "lista" && h.listaHasta != null ? { ...s, until: h.listaHasta } : s));
  const usados = new Set(servicios.map((x) => x.sec));
  const lic = (await db().query(`select 1 from licenses where business_id = $1 and kind = 'pa_plcb' and status = 'valid' and member_id is null limit 1`, [negocio])).rowCount! > 0;
  // Hoy (la fecha de la noche, corte 6 AM): ¿abrió, abre más tarde o no abre?
  const H = (await db().query<{ open: boolean; ranges: [string, string][] }>(
    `select open, ranges from business_hours where business_id = $1 and coalesce(module, '') = '' and weekday = $2`, [negocio, h.noches[0]?.dow ?? b.dow])).rows[0];
  const rg = H?.open && H.ranges?.length ? H.ranges : null;
  const abre = rg ? hm(rg[0]![0]) - 720 : null, ult = rg ? rg[rg.length - 1]! : null, cierra = ult ? (hm(ult[1]) <= hm(ult[0]) ? hm(ult[1]) + 720 : hm(ult[1]) - 720) : null;
  const ahoraN = b.ahora < 360 ? b.ahora + 720 : b.ahora - 720; // minutos desde las 12 PM de esta noche
  const hoy: NochePublica["hoy"] = !rg ? "cerrado" : abre != null && ahoraN < abre ? "aun" : "abierto";
  const tags = b.fv ?? [];
  return {
    negocio: { id: b.id, nombre: b.name, telefono: b.phone, foto: b.foto }, kind: h.kind, porFecha: h.porFecha,
    secciones: S.rows.filter((x) => usados.has(x.id)), servicios,
    noche: h.porFecha || !b.hay ? null : h.prox, fila: h.porFecha ? null : h.fila, nota: h.musicaNota, vestimenta: h.vestimenta,
    otras: h.noches.filter((n, i) => i > 0 && n.abre && n.distinto).slice(0, 3), publicado: b.hay && !h.porFecha,
    hoy, abre, cierra, lic, tags, lista: h.lista && servicios.some((s) => s.k === "lista"), mesas: servicios.some((s) => s.k === "mesa" || s.k === "vip"),
    booking: false,
  };
}
export const esPorFecha = (k: KindNoche) => POR_FECHA.includes(k);
