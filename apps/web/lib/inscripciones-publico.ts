import "server-only";
import { db } from "./db";
import { herramientaDeporte } from "./deporte";
import { esLiga, esMembresia, type KindDep } from "./deporte-comun";
import { herramientaNinos } from "./ninos";
import { esCuidado, type KindNinos, type LicNinos } from "./ninos-comun";
import { rubroInsc, type Bi, type KindInsc, type RubroInsc } from "./inscripciones-comun";

/* La ficha de Educación, Niños y Deporte (4ed · fase4-edu-ninos-deporte.md §4ed · neg-edu-listing.js priceFor L60–65, metaOf L94–99,
   listingAdd; neg-ninos-kind.js post y tabL L104; neg-deporte-kind.js post, conL L30 y tabL L151). Todo sale de los servicios, sus grupos
   y Tu herramienta; el servidor decide. NUNCA sale aquí: el enlace de una clase en línea (solo a inscritos confirmados, §6 #21), quién
   está inscrito ni dato alguno de un niño. Inscribirse en la app llega con 4ee (booking): hasta entonces, la hoja ofrece llamar. */
export type GrupoPub = { id: string; label: Bi; inicio: string; fin: string | null; libres: number; min: number | null; dows: number[] };
export type CursoPub = { id: string; sec: string | null; name: Bi; desc: Bi; k: KindInsc; cents: number; mat: number; plan: number; g1: boolean; sem: number | null; horas: number | null;
  cert: Bi | null; certBy: Bi | null; oficial: boolean; inc: Bi[]; no: Bi[]; team: boolean; porCancha: boolean; foto: string | null; grupos: GrupoPub[] };
export type InscPublica = {
  negocio: { id: string; nombre: string; telefono: string | null; foto: string | null };
  rubro: RubroInsc; tipo: string; secciones: { id: string; name: Bi }[]; cursos: CursoPub[]; tags: string[]; hoy: string;
  how: { presencial: boolean; linea: boolean; hibrido: boolean; esp: boolean };
  ninos: { cuidado: boolean; edad: [number, number] | null; lic: LicNinos; libres: number; semana: number | null; ccis: boolean; comidas: boolean; ext: boolean; noche: boolean;
    transporte: boolean; medicaid: boolean; espera: number | null; recibe: boolean; casa: boolean } | null;
  dep: { memb: boolean; liga: boolean; contrato: number; salir: number; inscripcion: number; guarderia: boolean; hasta: string | null; sueltos: boolean } | null;
  booking: boolean; // inscribirse en la app (4ee)
};
// Tipos de Educación (neg-edu-kind.js KS L10–16) que cambian la pregunta de arriba.
const KS_EDU: [string, string][] = [["Tutoría de matemáticas", "tutor"], ["Tutoría de lectura y escritura", "tutor"], ["Ayuda con tareas", "tutor"], ["Oratoria", "coach"], ["Coaching personal y de carrera", "coach"],
  ["Clases de música", "arte"], ["Clases de salsa y bachata", "arte"], ["Danza folclórica", "arte"], ["Clases de arte", "arte"], ["Clases de cocina", "arte"], ["Clases de costura", "arte"], ["Curso de fotografía", "arte"]];

export async function inscPublica(negocio: string): Promise<InscPublica | null> {
  const b = (await db().query<{ id: string; name: string; phone: string | null; foto: string | null; off: Record<string, unknown> | null; fv: string[]; cat: string; mods: string[]; subs: string[]; hoy: string;
    p: boolean | null; l: boolean | null; h: boolean | null; esp: boolean | null }>(
    `select b.id, b.name, b.phone, (select m.url from media m where m.owner_kind = 'business' and m.owner_id = b.id and m.status = 'visible' order by m.sort limit 1) as foto,
            b.modules_off as off, b.filter_values as fv, b.category_id as cat, b.modules_on as mods, (now() at time zone ci.timezone)::date::text as hoy,
            coalesce((select array_agg(sc.name->>'es') from subcategorias_vivas sc where sc.id = any(b.subcategory_ids)), '{}') as subs,
            s.how_presencial as p, s.how_linea as l, s.how_hibrido as h, s.esp
       from businesses b join cities ci on ci.id = b.city_id left join insc_settings s on s.business_id = b.id where b.id = $1 and b.status = 'active'`, [negocio])).rows[0];
  const rubro = b ? rubroInsc(b.cat) : null;
  if (!b || !rubro) return null;
  const fv = b.fv ?? [];
  const S = await db().query<{ id: string; name: Bi }>(`select id::text, name from item_sections where business_id = $1 and module = 'svc' and removed_at is null order by sort, id`, [negocio]);
  const I = (b.off ?? {}).svc ? [] : (await db().query<Omit<CursoPub, "grupos">>(
    `select i.id::text, i.section_id::text as sec, i.name, coalesce(i.descr, '{"es":"","en":""}'::jsonb) as desc, i.svc_kind as k, i.price_cents as cents, coalesce(i.deposit_cents, 0) as mat,
            coalesce((i.svc_attrs->>'plan_n')::int, 0) as plan, coalesce((i.svc_attrs->>'g1')::boolean, false) as g1, (i.svc_attrs->>'sem')::int as sem, (i.svc_attrs->>'horas')::int as horas,
            i.svc_attrs->'cert' as cert, i.svc_attrs->'certBy' as "certBy", coalesce((i.svc_attrs->>'oficial')::boolean, false) as oficial,
            coalesce(i.svc_attrs->'inc', '[]'::jsonb) as inc, coalesce(i.svc_attrs->'no', '[]'::jsonb) as no, coalesce((i.svc_attrs->>'team')::boolean, false) as team,
            coalesce((i.svc_attrs->>'per_field')::boolean, false) as "porCancha", i.photos[1] as foto
       from items i where i.business_id = $1 and i.module = 'svc' and i.removed_at is null and i.sell and i.status = 'live' and not i.is_extra
        and i.svc_kind in ('curso', 'mes', 'semana', 'clase', 'hora') order by i.sort, i.id`, [negocio])).rows;
  // Los grupos que todavía no terminan (abiertos, aunque estén llenos: la ficha dice «Lleno»). Nunca el enlace en línea.
  const G = I.length ? (await db().query<GrupoPub & { item: string }>(
    `select g.id::text, g.item_id::text as item, g.label, g.starts_on::text as inicio, g.ends_on::text as fin, greatest(0, g.seats_total - g.seats_outside - g.seats_booked) as libres, g.start_min as min, g.dows
       from class_groups g where g.item_id = any($1::bigint[]) and g.status = 'open' and (g.ends_on is null or g.ends_on >= $2::date) order by g.starts_on, g.start_min nulls first, g.id`, [I.map((x) => x.id), b.hoy])).rows : [];
  const cursos: CursoPub[] = I.map((x) => ({ ...x, grupos: G.filter((g) => g.item === x.id).map(({ item: _i, ...g }) => g) }));
  const usados = new Set(cursos.map((x) => x.sec));
  let tipo = "", ninos: InscPublica["ninos"] = null, dep: InscPublica["dep"] = null;
  if (rubro === "edu") tipo = KS_EDU.find((k) => b.subs.includes(k[0]))?.[1] ?? "curso";
  if (rubro === "ninos") {
    const h = (await herramientaNinos(negocio))!;
    tipo = h.kind as KindNinos;
    ninos = { cuidado: esCuidado(h.kind), edad: h.edad, lic: h.lic, libres: h.bandas.reduce((a, x) => a + x.libres, 0), semana: h.semana, ccis: h.ccis, comidas: h.comidas, ext: h.ext, noche: h.noche,
      transporte: h.transporte, medicaid: h.medicaid, espera: h.espera, recibe: h.recibe, casa: h.casa };
  }
  if (rubro === "dep") {
    const h = (await herramientaDeporte(negocio))!;
    tipo = h.kind as KindDep;
    dep = { memb: esMembresia(h.kind), liga: esLiga(h.kind), contrato: h.contrato, salir: h.salir, inscripcion: h.inscripcion, guarderia: h.guarderia, hasta: h.hasta, sueltos: h.sueltos };
  }
  return {
    negocio: { id: b.id, nombre: b.name, telefono: b.phone, foto: b.foto }, rubro, tipo, secciones: S.rows.filter((x) => usados.has(x.id)), cursos, tags: fv, hoy: b.hoy,
    how: { presencial: b.p ?? (fv.includes("presencial") || !fv.includes("linea")), linea: b.l ?? fv.includes("linea"), hibrido: b.h ?? fv.includes("hibrido"), esp: b.esp ?? fv.includes("esp") },
    ninos, dep, booking: false,
  };
}
