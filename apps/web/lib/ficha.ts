import "server-only";
import { centroSQL, type Punto } from "./punto";
import { db } from "./db";
import { foto } from "./directorio";
import type { Lang } from "./idioma";
import { estado, hora12 } from "./tarjeta";
import { FOTOS_FREE, FOTOS_PRO } from "./plan";

/* Ficha del negocio (APP-NEG-LISTING), base de la Fase 1: encabezado, Resumen, horario, fotos, cómo llegar,
   preguntas y Relacionados. Todo lo calcula el servidor; los módulos (menú, servicios, reseñas…) llegan en sus fases. */

type Bi = { es: string; en: string };
type Rango = [string, string];
type Dia = { weekday: number; open: boolean; ranges: Rango[] };

export const ID_NEGOCIO = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/* PLAN §2: un Free muestra 3 fotos; un Pro, las que suba (tope de lectura 60). Las cifras viven en lib/plan.ts. */

/* Galería (APP-NEG-GALERIA): las fotos visibles del negocio con su id (para reportarlas) y cuáles ya reportó la persona. */
export async function galeria(id: string, userId: string | null) {
  if (!ID_NEGOCIO.test(id) || id.length > 80) return null;
  const b = (await db().query<{ name: string; plan: string }>(
    `select b.name, s.plan from businesses b join business_stats_cache s on s.business_id = b.id where b.id = $1 and b.status = 'active'`, [id])).rows[0];
  if (!b) return null;
  const fotos = (await db().query<{ id: string; url: string }>(
    `select id, url from media where owner_kind = 'business' and owner_id = $1 and status = 'visible' order by sort limit $2`,
    [id, b.plan === "pro" ? FOTOS_PRO : FOTOS_FREE])).rows;
  const rep = userId && fotos.length
    ? new Set((await db().query<{ id: string }>(`select media_id as id from photo_reports where reporter_user_id = $1 and media_id = any($2::uuid[])`, [userId, fotos.map((f) => f.id)])).rows.map((r) => r.id))
    : new Set<string>();
  return { id, nombre: b.name, fotos: fotos.map((f) => ({ id: f.id, chica: foto(f.url, 420)!, grande: foto(f.url, 1400)!, reportada: rep.has(f.id) })) };
}

const DIA_CORTO = { es: ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"], en: ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] };
const DIA_LARGO = { es: ["DOMINGO", "LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES", "SÁBADO"], en: ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"] };
const MES = { es: ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"], en: ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"] };
const min = (hm: string) => { const [h = 0, m = 0] = hm.split(":").map(Number); return h * 60 + m; };
const rango = ([a, b]: Rango, lang: Lang) => (a === b ? (lang === "es" ? "24 horas" : "24 hours") : `${hora12(a)} – ${hora12(b)}`);
const duracion = (m: number) => { const h = Math.floor(m / 60), r = m % 60; return h ? `${h} h${r ? ` ${r} min` : ""}` : `${r} min`; };

/* p = desde dónde mide la persona (APP-CIUDAD); sin él, desde el centro de la ciudad del negocio. */
export async function ficha(id: string, lang: Lang, p?: Punto) {
  const desde = p ? centroSQL(p) : "c.center";
  if (!ID_NEGOCIO.test(id) || id.length > 80) return null;
  const es = lang === "es", L = (a: string, b: string) => (es ? a : b);
  const r = await db().query<{
    id: string; cat: string; city: string; name: string; plan: string; verified: boolean; rating: number | null; reviews: number;
    subs: string[]; tags: string[]; attrs: Record<string, unknown>; about: Bi | null; founded: number | null; phone: string | null;
    address: string | null; radius: number | null; from_home: boolean; lat: number | null; lng: number | null; mi: number | null;
    open: boolean; ciudad: string; estado: string; dow: number; hm: string; dia: number; mes: number; logo: string | null; cerrado_hoy: boolean; cerrado_temp: boolean;
  }>(
    `select b.id, b.category_id as cat, b.city_id as city, b.name, s.plan, s.verified, s.rating_avg::float as rating, s.review_count as reviews,
            b.subcategory_ids as subs, b.filter_values as tags, b.category_attrs as attrs, b.about, b.founded_year as founded, b.phone,
            b.address, b.service_radius_mi as radius, b.works_from_home as from_home,
            st_y(b.geo::geometry) as lat, st_x(b.geo::geometry) as lng,
            case when b.geo is null then null else round((st_distance(b.geo, ${desde}) / 1609.34)::numeric, 1)::float end as mi,
            negocio_abierto(b.id, now() at time zone c.timezone) as open,
            c.name as ciudad, c.state as estado,
            extract(dow from now() at time zone c.timezone)::int as dow, to_char(now() at time zone c.timezone, 'HH24:MI') as hm,
            extract(day from now() at time zone c.timezone)::int as dia, extract(month from now() at time zone c.timezone)::int as mes,
            b.logo_url as logo, coalesce(b.closed_on = (now() at time zone c.timezone)::date, false) as cerrado_hoy, coalesce(b.temp_closed_until > now(), false) as cerrado_temp
       from businesses b join business_stats_cache s on s.business_id = b.id join cities c on c.id = b.city_id
      where b.id = $1 and b.status = 'active'`,
    [id],
  );
  const b = r.rows[0];
  if (!b) return null;

  const [fotos, horas, subs, faqs, enlaces, gente, amen] = await Promise.all([
    db().query<{ url: string }>(`select url from media where owner_kind = 'business' and owner_id = $1 and status = 'visible' order by sort limit $2`, [id, b.plan === "pro" ? FOTOS_PRO : FOTOS_FREE]),
    db().query<Dia>(`select weekday, open, ranges from business_hours where business_id = $1 and module = '' order by weekday`, [id]),
    db().query<{ n: string }>(`select name->>$2 as n from subcategories where id = any($1::text[]) order by array_position($1::text[], id)`, [b.subs, lang]),
    db().query<{ q: string; a: string }>(`select question->>$2 as q, answer->>$2 as a from faqs where business_id = $1 order by sort`, [id, lang]),
    relacionados(id, lang, desde),
    // Quién está detrás (Tu página · Equipo): solo quien aceptó y sale en la página, el dueño primero.
    db().query<{ kind: string; name: string; nick: string | null; role: Bi | null; photo: string | null; bio: Bi | null }>(
      `select kind, display_name as name, nickname as nick, role, photo_url as photo, bio from business_members
        where business_id = $1 and status = 'active' and show_on_page and hidden_by_admin is null
          and not exists (select 1 from businesses x where x.id = $1 and x.staff_hidden)
        order by (kind = 'owner') desc, sort, id limit 8`, [id]),
    // En el local (Quiénes somos · EN TU NEGOCIO): claves del catálogo.
    db().query<{ icon: string | null; l: string }>(
      `select a.icon, a.label->>$2 as l from businesses b cross join unnest(b.amenities) with ordinality u(k, o) join amenities a on a.key = u.k where b.id = $1 order by u.o`, [id, lang]),
  ]);
  const pro = b.plan === "pro", n = b.reviews, dias = horas.rows, ahora = { dow: b.dow, hm: b.hm };
  const urls = fotos.rows.map((x) => x.url);
  const st = estado(dias, ahora, b.open, lang, (b.attrs.tarjeta as { status?: Bi } | undefined)?.status ?? null, b.cerrado_hoy, b.cerrado_temp);
  const nota = st.text.replace(/^(Abierto|Cerrado|Open|Closed)( · )?/, "");
  const iniciales = b.name.split(" ").filter((w) => w.length > 2).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const fecha = `${DIA_LARGO[lang][b.dow]} ${es ? `${b.dia} ${MES.es[b.mes - 1]}` : `${MES.en[b.mes - 1]} ${b.dia}`}`;
  const hoyCorto = `${DIA_CORTO[lang][b.dow]} ${es ? `${b.dia} ${MES.es[b.mes - 1]}` : `${MES.en[b.mes - 1]} ${b.dia}`}`;
  const hoy = dias.find((d) => d.weekday === b.dow);
  const t = min(b.hm);

  // Horario Pro (HoursPro): los rangos reales de hoy, la cuenta regresiva, cambios programados y la semana.
  const rangosHoy = hoy?.open && !b.cerrado_hoy && !b.cerrado_temp ? hoy.ranges : [];
  const hpToday = rangosHoy.length
    ? rangosHoy.map((rg, i) => {
        const ahoraDentro = b.open && min(rg[0]) <= t && (min(rg[1]) > t || min(rg[1]) <= min(rg[0]));
        const pasado = min(rg[1]) > min(rg[0]) && t >= min(rg[1]);
        const ultimo = i === rangosHoy.length - 1;
        return {
          range: rango(rg, lang), label: ultimo && rg[0] !== rg[1] ? L(`Cierra a las ${hora12(rg[1])}`, `Closes at ${hora12(rg[1])}`) : "",
          op: pasado ? 0.45 : 1, dot: ahoraDentro ? "var(--tl-open)" : "var(--tl-white)", ring: ahoraDentro ? "var(--tl-open)" : "var(--tl-ink)",
          nowDisp: ahoraDentro ? "inline-block" : "none", lineDisp: ultimo ? "none" : "block",
        };
      })
    : [{ range: L("Hoy cerrado", "Closed today"), label: "", op: 1, dot: "var(--tl-white)", ring: "rgba(11,14,18,.3)", nowDisp: "none", lineDisp: "none" }];
  const prox = proximoCambio(dias, b.dow, t, b.open);
  const hpWeek = [1, 2, 3, 4, 5, 6, 0].map((wd) => {
    const d = dias.find((x) => x.weekday === wd), esHoy = wd === b.dow;
    const lineas = d?.open && d.ranges.length
      ? d.ranges.map((rg) => ({ range: rango(rg, lang), type: "", color: "var(--tl-ink)", dash: "transparent", fg: "var(--tl-ink)", weight: esHoy ? 800 : 600 }))
      : [{ range: L("Cerrado", "Closed"), type: "", color: "rgba(11,14,18,.12)", dash: "transparent", fg: "rgba(11,14,18,.45)", weight: 600 }];
    return { d: esHoy ? L("HOY", "TODAY") : DIA_CORTO[lang][wd], dc: esHoy ? (b.open ? "var(--tl-open-text)" : "var(--tl-danger)") : "rgba(11,14,18,.55)", lines: lineas, tag: "", tagDisp: "none", tagBg: "", tagFg: "" };
  });
  const cambios = await db().query<{ desde: string; hasta: string; closed: boolean; ranges: Rango[]; label: Bi | null }>(
    `select to_char(h.date_from, 'YYYY-MM-DD') as desde, to_char(h.date_to, 'YYYY-MM-DD') as hasta, h.closed, h.ranges, h.label
       from special_hours h join businesses b on b.id = h.business_id join cities c on c.id = b.city_id
      where h.business_id = $1 and h.date_to >= (now() at time zone c.timezone)::date order by h.date_from limit 3`, [id]);
  const hpChanges = cambios.rows.length
    ? cambios.rows.map((c) => ({ dateLong: c.desde === c.hasta ? c.desde : `${c.desde} – ${c.hasta}`, name: c.label?.[lang] ?? "", tagFg: c.closed ? "var(--tl-danger)" : "var(--tl-action)", text: c.closed ? L("Cerrado", "Closed") : c.ranges.map((x) => rango(x, lang)).join(" · ") }))
    : [{ dateLong: L("Sin cambios programados", "No scheduled changes"), name: L("Horario de siempre", "Regular hours"), tagFg: "rgba(11,14,18,.35)", text: "" }];

  // Hoy (TodayCard): estado en una frase + cómo atiende + hasta 3 datos reales de la tarjeta del negocio.
  const tj = (b.attrs.tarjeta ?? {}) as { eta?: Partial<Bi>; fee?: Partial<Bi>; offer?: Partial<Bi> };
  const eta = tj.eta?.[lang] ?? "", fee = tj.fee?.[lang] ?? "";
  const tag = (k: string) => b.tags.includes(k), dl = tag("delivery"), pk = tag("pickup"), di = tag("dinein");
  const tras = (pref: string) => (eta.indexOf(pref) === 0 ? eta.slice(pref.length + 1) : "");
  const cols: { k: string; v: string }[] = [];
  if (dl && tras("Delivery")) cols.push({ k: "DELIVERY", v: tras("Delivery") });
  if (pk && tras("Pickup")) cols.push({ k: "PICKUP", v: tras("Pickup") });
  if (dl && /\$/.test(fee)) cols.push({ k: L("ENVÍO", "FEE"), v: fee.replace("Delivery ", "") });
  if (di && cols.length < 3) cols.push({ k: L("EN EL LOCAL", "DINE-IN"), v: L("Para comer aquí", "Eat in") });
  if (cols.length && cols.length < 3) cols.push({ k: L("PAGO", "PAYMENT"), v: L("En el local", "In store") });
  const modos = [dl ? "delivery" : null, pk ? "pickup" : null, di ? L("para comer aquí", "dine-in") : null].filter(Boolean) as string[];
  const ms = modos.length > 1 ? `${modos.slice(0, -1).join(", ")}${L(" o ", " or ")}${modos[modos.length - 1]}` : modos[0] ?? "";
  const tituloHoy = b.cerrado_temp ? L("Cerrado temporalmente", "Temporarily closed") : b.cerrado_hoy ? L("Cerrado hoy", "Closed today") : b.open
    ? (prox.cierra ? L(`Abierto hasta las ${hora12(prox.cierra)}`, `Open until ${hora12(prox.cierra)}`) : L("Abierto las 24 horas", "Open 24 hours"))
    : prox.abre ? (prox.dias === 0 ? L(`Abre a las ${hora12(prox.abre)}`, `Opens at ${hora12(prox.abre)}`) : prox.dias === 1 ? L(`Abre mañana a las ${hora12(prox.abre)}`, `Opens tomorrow at ${hora12(prox.abre)}`) : L(`Abre el ${DIA_LARGO.es[(b.dow + prox.dias) % 7]!.toLowerCase()} a las ${hora12(prox.abre)}`, `Opens ${DIA_LARGO.en[(b.dow + prox.dias) % 7]!.charAt(0)}${DIA_LARGO.en[(b.dow + prox.dias) % 7]!.slice(1).toLowerCase()} at ${hora12(prox.abre)}`))
    : L("Cerrado", "Closed");
  const hoyCard = {
    eyebrow: `${L("HOY", "TODAY")} · ${fecha}`, title: tituloHoy, dot: b.open ? "var(--tl-open)" : "var(--tl-danger)",
    sub: `${ms ? `${ms.charAt(0).toUpperCase()}${ms.slice(1)}. ` : ""}${L("Pagas en el local.", "You pay in store.")}`, cols,
  };

  // Semana simple (Free) y el horario de cada día.
  const semana = [1, 2, 3, 4, 5, 6, 0].map((wd, i) => {
    const d = dias.find((x) => x.weekday === wd), esHoy = wd === b.dow;
    return { d: esHoy ? L("HOY", "TODAY") : DIA_CORTO[lang][wd]!, v: d?.open && d.ranges.length ? d.ranges.map((x) => rango(x, lang)).join(" · ") : L("Cerrado", "Closed"), hoy: esHoy, primero: i === 0 };
  });

  const enCasa = b.from_home || (b.cat === "NEG-HOGAR" && !!b.radius);
  return {
    id: b.id, cat: b.cat, pro, nombre: b.name, verificado: b.verified, abierto: b.open, telefono: b.phone, lat: b.lat, lng: b.lng,
    hero: foto(urls[0] ?? null, 650), mosaico: [urls[1] ?? urls[0] ?? null, urls[2] ?? urls[0] ?? null].map((u) => foto(u, 650)),
    logo: pro && b.logo ? b.logo : null, iniciales, fotos: urls.map((u) => foto(u, 350)!), nFotos: urls.length,
    subsLinea: subs.rows.map((x) => x.n).join(" · "),
    s1: n >= 5 ? (b.rating?.toFixed(1) ?? "") : n > 0 ? String(n) : L("Nuevo", "New"), s1Estrella: n >= 5,
    s1Sub: n >= 5 ? `${n} ${L("RESEÑAS", "REVIEWS")}` : n > 0 ? L("RESEÑAS", "REVIEWS") : "EN TO'LATINO",
    metaD: `${n >= 5 ? `★ ${b.rating?.toFixed(1)} (${n} ${L("RESEÑAS", "REVIEWS")})` : n > 0 ? `${n} ${L("RESEÑAS", "REVIEWS")}` : L("NUEVO EN TO'LATINO", "NEW ON TO'LATINO")} · ${b.mi ?? "—"} MI · ${b.ciudad.toUpperCase()}`,
    estado: st.text, estadoCorto: b.open ? L("Abierto", "Open") : L("Cerrado", "Closed"), estadoNota: nota.toUpperCase(), estadoResto: nota ? `· ${nota}` : "",
    dist: b.mi != null ? `${b.mi} mi` : "—", ciudad: b.ciudad.toUpperCase(),
    oferta: pro ? tj.offer?.[lang] ?? null : null,
    sobre: b.about?.[lang] || b.about?.es || null, desde: b.founded ? L(`EN ${b.ciudad.toUpperCase()} DESDE ${b.founded}`, `IN ${b.ciudad.toUpperCase()} SINCE ${b.founded}`) : null,
    hoy: hoyCard,
    horario: { data: { hpToday, hpChanges, hpWeek, hpCountdown: prox.minutos != null ? duracion(prox.minutos) : "" },
      dateLabel: `${L("HOY", "TODAY")} · ${hoyCorto}`, status: b.open ? L("Abierto", "Open") : L("Cerrado", "Closed"),
      nextLabel: prox.minutos == null ? "" : b.open ? L("Cierra en", "Closes in") : L("Abre en", "Opens in") },
    semana,
    direccion: enCasa ? null : b.address?.replace(/, ([A-Z][a-z]+) PA$/, ", $1, PA") ?? null,
    zona: enCasa && b.radius ? L(`Va a domicilio hasta ${b.radius} mi`, `Comes to you up to ${b.radius} mi`) : null,
    direccionMeta: `${b.mi ?? "—"} MI · ${b.ciudad.toUpperCase()}, ${b.estado}`,
    faqs: faqs.rows, relacionados: enlaces,
    quien: pro ? quienDetras(gente.rows, b.about?.[lang] || b.about?.es || null, b.founded, b.ciudad, b.verified, lang) : null,
    amen: pro ? amen.rows.map((a) => ({ icon: a.icon ?? "check", l: a.l })) : [],
    amenK: enCasa ? L("CÓMO TRABAJA", "HOW THEY WORK") : L("EN EL LOCAL", "AT THE PLACE"),
  };
}

/* Cuándo cierra (si está abierto) o cuándo abre (si no), mirando hasta 7 días adelante. */
function proximoCambio(dias: Dia[], dow: number, t: number, abierto: boolean): { cierra?: string; abre?: string; dias: number; minutos: number | null } {
  const de = (k: number) => dias.find((d) => d.weekday === (((dow + k) % 7) + 7) % 7);
  if (abierto) {
    const hoy = de(0), ayer = de(-1);
    const r = hoy?.ranges.find(([a, b]) => min(a) <= t && (min(b) > t || min(b) <= min(a))) ?? ayer?.ranges.find(([a, b]) => min(b) <= min(a) && t < min(b));
    if (!r || r[0] === r[1]) return { dias: 0, minutos: null };
    const fin = min(r[1]) > t ? min(r[1]) : min(r[1]) + 24 * 60;
    return { cierra: r[1], dias: 0, minutos: fin - t };
  }
  for (let k = 0; k <= 7; k++) {
    const d = de(k);
    if (!d?.open) continue;
    const a = d.ranges.map(([x]) => x).filter((x) => k > 0 || min(x) > t).sort((x, y) => min(x) - min(y))[0];
    if (a) return { abre: a, dias: k, minutos: k * 24 * 60 + min(a) - t };
  }
  return { dias: 0, minutos: null };
}

/* Relacionados: sucursales y negocios del mismo dueño que los DOS confirmaron (business_links.status = 'ok'),
   con la nota que este negocio escribió del otro. */
async function relacionados(id: string, lang: Lang, desde: string) {
  const r = await db().query<{ id: string; kind: string; nota: string | null; name: string; verified: boolean; rating: number | null; reviews: number; mi: number | null; address: string | null; open: boolean; foto: string | null; tags: string[]; subs: string | null; radius: number | null; from_home: boolean; lat: number | null; lng: number | null; phone: string | null }>(
    `select o.id, l.kind, case when l.a_id = $1 then l.note_a->>$2 else l.note_b->>$2 end as nota, o.name, s.verified, s.rating_avg::float as rating,
            s.review_count as reviews, case when o.geo is null then null else round((st_distance(o.geo, ${desde}) / 1609.34)::numeric, 1)::float end as mi,
            o.address, negocio_abierto(o.id, now() at time zone c.timezone) as open, o.filter_values as tags,
            (select m.url from media m where m.owner_kind = 'business' and m.owner_id = o.id and m.status = 'visible' order by m.sort limit 1) as foto,
            (select string_agg(sc.name->>$2, ' · ' order by array_position(o.subcategory_ids, sc.id)) from subcategories sc where sc.id = any(o.subcategory_ids[1:2])) as subs,
            o.service_radius_mi as radius, o.works_from_home as from_home, st_y(o.geo::geometry) as lat, st_x(o.geo::geometry) as lng, o.phone
       from business_links l
       join businesses o on o.id = case when l.a_id = $1 then l.b_id else l.a_id end and o.status = 'active'
       join business_stats_cache s on s.business_id = o.id
       join cities c on c.id = o.city_id
      where (l.a_id = $1 or l.b_id = $1) and l.status = 'ok' and l.hidden_by_admin is null
      order by l.kind desc, o.name`,
    [id, lang],
  );
  const es = lang === "es", L = (a: string, b: string) => (es ? a : b);
  const SV: Record<string, string> = { delivery: "Delivery", pickup: "Pickup", dinein: L("Para comer aquí", "Dine-in"), catering: "Catering" };
  return r.rows.map((x) => {
    const suc = x.kind === "sucursal", movil = x.from_home && !!x.radius;
    return {
      id: x.id, grupo: suc ? L("SUCURSALES", "LOCATIONS") : L("DEL MISMO DUEÑO", "SAME OWNER"), tag: suc ? L("SUCURSAL", "LOCATION") : L("MISMO DUEÑO", "SAME OWNER"),
      nombre: x.name, verificado: x.verified, foto: foto(x.foto, 420),
      meta: `★ ${x.rating?.toFixed(1) ?? "—"} (${x.reviews}) · ${movil ? L(`A DOMICILIO · HASTA ${x.radius}`, `MOBILE · UP TO ${x.radius}`) : x.mi ?? "—"} MI · ${suc ? (x.address ?? "").replace(/, Hazleton PA$/, "") : x.subs ?? ""}`.toUpperCase(),
      abierto: x.open, nota: x.nota ?? "", chips: x.tags.filter((k) => SV[k]).slice(0, 3).map((k) => SV[k]!),
      cta: suc ? L("Ver sucursal", "See location") : L("Ver negocio", "See business"),
      movil, telefono: x.phone, lat: x.lat, lng: x.lng,
    };
  });
}

/* Una vista de la página del negocio (las cifras del panel: «VISTAS · 7 DÍAS», «VISTAS HOY»). Día de la ciudad del
   negocio; no cuenta a la gente del propio negocio ni a los robots. Una fila por negocio y día (derivado, nadie lo edita). */
const ROBOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|facebookexternalhit|whatsapp/i;
export async function registrarVista(id: string, userId: string | null, ua: string | null) {
  if (!ID_NEGOCIO.test(id) || id.length > 80 || !ua || ROBOT.test(ua)) return;
  await db().query(
    `insert into business_views_daily (business_id, day, n)
     select b.id, (now() at time zone c.timezone)::date, 1 from businesses b join cities c on c.id = b.city_id
      where b.id = $1 and b.status = 'active'
        and not exists (select 1 from business_members m where m.business_id = b.id and m.user_id = $2::uuid and m.status = 'active')
     on conflict (business_id, day) do update set n = business_views_daily.n + 1`, [id, userId]);
}

/* Resumen · Quién está detrás (OwnerCard 15b): la persona (el dueño con sus palabras) o, sin ella, el texto del negocio;
   su equipo (hasta 3 fotos) y la franja de lo verificado. Pro (en Free se duerme, como en el prototipo freeCut). */
function quienDetras(gente: { kind: string; name: string; nick: string | null; role: Bi | null; photo: string | null; bio: Bi | null }[], about: string | null, founded: number | null, ciudad: string, verified: boolean, lang: Lang) {
  const es = lang === "es", L = (a: string, b: string) => (es ? a : b);
  const p = gente.find((x) => x.kind === "owner" && x.bio?.es), quote = p ? (p.bio?.[lang] || p.bio?.es || "") : "";
  if (!p && !about) return null;
  const otros = gente.filter((x) => x !== p).slice(0, 3);
  const corto = (n: string) => { const w = n.split(" "); return w.length > 2 ? w.slice(0, -1).join(" ") : w[0]!; };
  const nombres = otros.map((x) => corto(x.name));
  const lista = nombres.length < 2 ? nombres[0] ?? "" : `${nombres.slice(0, -1).join(", ")}${L(" y ", " and ")}${nombres[nombres.length - 1]}`;
  return {
    photo: p?.photo ?? "", name: p ? p.name : "", role: p ? (p.role?.[lang] || p.role?.es || (es ? "Dueño" : "Owner")) : "",
    nick: p?.nick ? L(`LE DICEN ${p.nick.toUpperCase()}`, `KNOWN AS ${p.nick.toUpperCase()}`) : "", quote,
    about: p ? "" : about ?? "", since: p ? "" : founded ? L(`EN ${ciudad.toUpperCase()} DESDE ${founded}`, `IN ${ciudad.toUpperCase()} SINCE ${founded}`) : "",
    team: p ? otros.filter((x) => x.photo).map((x) => x.photo!) : [], teamLabel: p && otros.length ? `${L("Con ", "With ")}${lista}` : "",
    // «Teléfono verificado» solo si el dueño entró con su teléfono (código por SMS); nada que no sea cierto.
    trust: [...(verified ? [{ icon: "verified", label: L("Sello To'Latino", "To'Latino seal"), tone: "ok" }] : gente.some((x) => x.kind === "owner") ? [{ icon: "phone", label: L("Teléfono verificado", "Phone verified"), tone: "ok" }] : []),
      ...(founded ? [{ icon: "store", label: L(`En ${ciudad} desde ${founded}`, `In ${ciudad} since ${founded}`), tone: "info" }] : [])],
  };
}
