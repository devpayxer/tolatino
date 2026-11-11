import "server-only";
import { db } from "../db";
import { AGOTADO_SQL } from "../menu";
import type { Lang } from "./modelo";
import { tapar } from "./tapar";

/* 7f · Lo que El Compa sabe de un NEGOCIO para contestar a sus clientes (fase7-compa.md §3 «Qué datos ve · Respuesta automática»; prototipo
   datos/compa.js data()). Recibe SOLO el id del negocio y lee lo que su PÁGINA PÚBLICA ya muestra, de los temas que el dueño encendió:
   - hours (Horario y dirección): la semana, los cambios de los próximos 7 días, si cerró por hoy o por unos días, cuándo abre otra vez y la
     dirección (si atiende en un local; a domicilio, solo la zona);
   - menu (Menú, servicios y precios): hasta 30 cosas que ofrece y se ven en su página, con su precio y si están agotadas;
   - how_to_order (Cómo pedir o reservar): lo que se pide desde su página en To'Latino (pedidos, mesas, citas…), que siempre es una solicitud;
   - faq (Tus preguntas frecuentes): hasta 12, en el idioma del cliente.
   Y la nota del dueño («Lo que El Compa debe saber», ≤ 400), tapada. Nunca: clientes, mensajes de otros, teléfonos, el dueño, cobros, ni nada
   que la página no muestre. Todo lo que sale de aquí va al modelo como DATOS (bloque marcado) y pasa por tapar(). `texto` = todo junto, para que
   el verificador acepte solo los montos, horas y plazos que están en la página (nunca los que escribió el cliente). */
type Bi = { es: string; en: string };
export type Tema = "hours" | "menu" | "how_to_order" | "faq";
export const TEMAS: Tema[] = ["hours", "menu", "how_to_order", "faq"];
export const TEMA_L: Record<Tema, Bi> = {
  hours: { es: "Horario y dirección", en: "Hours and address" }, menu: { es: "Menú, servicios y precios", en: "Menu, services and prices" },
  how_to_order: { es: "Cómo pedir o reservar", en: "How to order or book" }, faq: { es: "Tus preguntas frecuentes", en: "Your FAQ" },
};
export type ContextoNegocio = {
  negocio: { id: string; nombre: string; ciudad: string }; abierto: boolean; temas: Tema[];
  horario: string | null; proxima: string | null; direccion: string | null; items: { nombre: string; precio: string; agotado: boolean }[];
  comoPedir: string[]; preguntas: { q: string; a: string }[]; nota: string;
  datos: Record<string, unknown>; texto: string;
};
type Rango = [string, string];
const NEG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DIAS: Record<Lang, string[]> = { es: ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"], en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] };
/* La hora como la ve la gente (11 AM, 9:30 PM): la misma regla que la ficha. */
const hora12 = (hm: string) => { const [h = 0, m = 0] = hm.split(":").map(Number), H = h % 24, s = H < 12 ? "AM" : "PM", h12 = H % 12 || 12; return m ? `${h12}:${String(m).padStart(2, "0")} ${s}` : `${h12} ${s}`; };
const minutos = (hm: string) => { const [h = 0, m = 0] = hm.split(":").map(Number); return h * 60 + m; };
const PEDIR: Record<string, Bi> = {
  pedidos: { es: "Pedidos en línea para recoger o delivery, desde su página en To'Latino: el negocio acepta cada pedido.", en: "Online orders for pickup or delivery, from its To'Latino page: the business accepts each order." },
  rsv: { es: "Reservaciones de mesa desde su página en To'Latino: es una solicitud que el negocio confirma.", en: "Table reservations from its To'Latino page: it is a request the business confirms." },
  citas: { es: "Citas desde su página en To'Latino: es una solicitud que el negocio confirma.", en: "Appointments from its To'Latino page: it is a request the business confirms." },
  svc: { es: "Sus servicios están en su página de To'Latino, con lo que cuesta cada uno.", en: "Its services are on its To'Latino page, with what each one costs." },
  shop: { es: "Su tienda está en su página de To'Latino.", en: "Its shop is on its To'Latino page." },
  cot: { es: "Cotizaciones: se piden desde su página en To'Latino y el negocio contesta con el precio.", en: "Quotes: you ask from its To'Latino page and the business answers with the price." },
  eventos: { es: "Sus eventos y boletos están en su página de To'Latino.", en: "Its events and tickets are on its To'Latino page." },
};
const limpio = (s: unknown, n: number) => tapar(String(s ?? "").replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, n)).texto;

export async function contextoNegocio(negocio: string, lang: Lang, temas: Tema[], nota: Bi | null): Promise<ContextoNegocio | null> {
  if (!NEG.test(String(negocio ?? "")) || negocio.length > 80) return null;
  const es = lang === "es", T = new Set(temas.filter((t) => TEMAS.includes(t)));
  const b = (await db().query<{ id: string; nombre: string; ciudad: string; tz: string; dir: string | null; casa: boolean; radio: number | null; mods: string[]; abierto: boolean;
    dow: number; hm: string; cerrado_hoy: boolean; temp: string | null }>(
    `select b.id, b.name as nombre, c.name as ciudad, c.timezone as tz, b.address as dir, b.works_from_home as casa, b.service_radius_mi as radio, b.modules_on as mods,
            coalesce(negocio_abierto(b.id, now() at time zone c.timezone), false) as abierto, extract(dow from now() at time zone c.timezone)::int as dow,
            to_char(now() at time zone c.timezone, 'HH24:MI') as hm, coalesce(b.closed_on = (now() at time zone c.timezone)::date, false) as cerrado_hoy,
            case when b.temp_closed_until > now() then to_char(b.temp_closed_until at time zone c.timezone, 'YYYY-MM-DD') end as temp
       from businesses b join cities c on c.id = b.city_id where b.id = $1 and b.status = 'active'`, [negocio])).rows[0];
  if (!b) return null;
  const [H, X, I, F] = await Promise.all([
    T.has("hours") ? db().query<{ weekday: number; open: boolean; ranges: Rango[] }>(`select weekday, open, ranges from business_hours where business_id = $1 and module = '' order by weekday`, [negocio]) : null,
    T.has("hours") ? db().query<{ desde: string; hasta: string; closed: boolean; ranges: Rango[]; label: Bi | null }>(
      `select to_char(h.date_from, 'YYYY-MM-DD') as desde, to_char(h.date_to, 'YYYY-MM-DD') as hasta, h.closed, h.ranges, h.label from special_hours h
        where h.business_id = $1 and h.date_to >= (now() at time zone $2)::date and h.date_from <= (now() at time zone $2)::date + 7 order by h.date_from limit 5`, [negocio, b.tz]) : null,
    T.has("menu") ? db().query<{ n: Bi; cents: number | null; desde: boolean; ago: boolean }>(
      `select i.name as n, i.price_cents as cents, coalesce(i.price_from, false) as desde, ${AGOTADO_SQL("i", "c.timezone")} as ago
         from items i join businesses b on b.id = i.business_id join cities c on c.id = b.city_id left join item_sections s on s.id = i.section_id
        where i.business_id = $1 and i.removed_at is null and i.status <> 'hidden' and i.module in ('menu', 'shop', 'svc')
          and (s.id is null or (s.visible and s.removed_at is null)) and (i.module <> 'svc' or i.sell) and not coalesce(i.is_extra, false)
        order by i.module, i.sort, i.id limit 30`, [negocio]) : null,
    T.has("faq") ? db().query<{ q: string; a: string }>(`select coalesce(question->>$2, question->>'es') as q, coalesce(answer->>$2, answer->>'es') as a from faqs where business_id = $1 order by sort, id limit 12`, [negocio, lang]) : null,
  ]);

  // El horario de la semana y cuándo abre otra vez (mirando hasta 7 días adelante, con los cambios de la página).
  let horario: string | null = null, proxima: string | null = null;
  if (H) {
    const dias = H.rows, rangos = (wd: number) => { const d = dias.find((x) => x.weekday === wd); return d?.open ? d.ranges : []; };
    horario = [1, 2, 3, 4, 5, 6, 0].map((wd) => `${DIAS[lang][wd]}: ${rangos(wd).length ? rangos(wd).map(([a, z]) => (a === z ? (es ? "24 horas" : "24 hours") : `${hora12(a)}–${hora12(z)}`)).join(", ") : es ? "cerrado" : "closed"}`).join("; ");
    const ahora = minutos(b.hm);
    const local = (k: number) => { const x = new Date(Date.now() + k * 86_400_000); return new Intl.DateTimeFormat("en-CA", { timeZone: b.tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(x); };
    for (let k = 0; k <= 7 && !proxima; k++) {
      const wd = (b.dow + k) % 7, dia = local(k), esp = X?.rows.find((s) => s.desde <= dia && s.hasta >= dia);
      if (b.temp && dia <= b.temp) continue;
      if (k === 0 && b.cerrado_hoy) continue;
      const R = esp ? (esp.closed ? [] : esp.ranges) : rangos(wd);
      const abre = R.map(([a]) => a).filter((a) => k > 0 || minutos(a) > ahora).sort((x, y) => minutos(x) - minutos(y))[0];
      if (abre) proxima = k === 0 ? (es ? `hoy a las ${hora12(abre)}` : `today at ${hora12(abre)}`) : k === 1 ? (es ? `mañana a las ${hora12(abre)}` : `tomorrow at ${hora12(abre)}`)
        : es ? `el ${DIAS.es[wd]} a las ${hora12(abre)}` : `on ${DIAS.en[wd]} at ${hora12(abre)}`;
    }
  }
  const direccion = T.has("hours") ? (b.casa ? (b.radio ? (es ? `Va a domicilio hasta ${b.radio} millas de ${b.ciudad}.` : `Comes to you up to ${b.radio} miles from ${b.ciudad}.`) : null) : b.dir?.replace(/, ([A-Z][a-z]+) PA$/, ", $1, PA") ?? null) : null;
  const items = (I?.rows ?? []).map((x) => ({ nombre: limpio(x.n?.[lang] || x.n?.es, 60), precio: x.cents != null ? `${x.desde ? (es ? "desde " : "from ") : ""}$${(x.cents / 100).toFixed(2)}` : "", agotado: !!x.ago })).filter((x) => x.nombre);
  const comoPedir = T.has("how_to_order") ? (b.mods ?? []).filter((m) => PEDIR[m]).map((m) => PEDIR[m]![lang]) : [];
  const preguntas = (F?.rows ?? []).map((x) => ({ q: limpio(x.q, 200), a: limpio(x.a, 400) })).filter((x) => x.q && x.a);
  const notaT = limpio(nota?.[lang] || nota?.es, 400);
  const cambios = (X?.rows ?? []).map((s) => `${s.desde === s.hasta ? s.desde : `${s.desde} – ${s.hasta}`}: ${s.closed ? (es ? "cerrado" : "closed") : s.ranges.map(([a, z]) => `${hora12(a)}–${hora12(z)}`).join(", ")}${s.label?.[lang] ? ` (${limpio(s.label[lang], 60)})` : ""}`);

  const datos: Record<string, unknown> = {
    negocio: b.nombre, ciudad: `${b.ciudad}, PA`, abierto_ahora: b.abierto, ahora: `${DIAS[lang][b.dow]} ${hora12(b.hm)}`,
    temas: [...T].map((t) => TEMA_L[t][lang]),
    ...(T.has("hours") ? { horario, ...(proxima ? { abre_otra_vez: proxima } : {}), ...(b.cerrado_hoy ? { cerrado_hoy: true } : {}), ...(b.temp ? { cerrado_hasta: b.temp } : {}),
      ...(cambios.length ? { cambios_de_horario: cambios } : {}), ...(direccion ? { direccion } : {}) } : {}),
    ...(T.has("menu") ? { lo_que_ofrece: items.map((x) => ({ nombre: x.nombre, precio: x.precio, ...(x.agotado ? { agotado_hoy: true } : {}) })) } : {}),
    ...(T.has("how_to_order") ? { como_pedir: [...comoPedir, es ? "Todo se pide desde la página del negocio en To'Latino." : "Everything is requested from the business page on To'Latino."] } : {}),
    ...(T.has("faq") && preguntas.length ? { preguntas_frecuentes: preguntas.map((x) => ({ pregunta: x.q, respuesta: x.a })) } : {}),
    ...(notaT ? { nota_del_dueno: notaT } : {}),
  };
  const texto = [b.nombre, horario ?? "", proxima ?? "", direccion ?? "", ...cambios, ...items.map((x) => `${x.nombre} ${x.precio}`), ...comoPedir, ...preguntas.map((x) => `${x.q} ${x.a}`), notaT].join("\n");
  return { negocio: { id: b.id, nombre: b.nombre, ciudad: b.ciudad }, abierto: b.abierto, temas: [...T], horario, proxima, direccion, items, comoPedir, preguntas, nota: notaT, datos, texto };
}
