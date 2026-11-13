import "server-only";
import { db } from "./db";
import { herramientaFe } from "./fe";
import {
  DONATIVO, FREQ, HELP, LANG_FE, cortoFe, horaFe, lineaFe, largoFe, DIA_FE,
  type FreqFe, type HelpFe, type HorarioFe, type KindFe, type RepFe,
} from "./fe-comun";
import type { Bi } from "./inscripciones-comun";

/* La ficha de Iglesias y Religión (Fase 4 · 4id · fase4-iglesias-inmuebles-autos.md §1c, §3, §4id; neg-fe-kind.js faq L44–62, metaOf
   L98–102, btnOf L104, tabL L105, post L108–159). Todo sale de worship_times, fe_settings (lib/fe.ts herramientaFe) y los servicios; el
   servidor decide el próximo servicio con la hora de la ciudad. Iglesias no cobra nada en la app: el donativo es sugerido y la funeraria
   da el total por escrito; «Pedir información» de la funeraria es contacto (llamar o WhatsApp), sin presión. Los sellos (funeraria de PA,
   representante del DOJ, 501(c)(3)) salen solo de una licencia «valid»; su falta nunca se muestra. */
export type FormaPub = "gratis" | "don" | "tot" | "curso";
export type GrupoFePub = { id: string; label: Bi; inicio: string; libres: number };
export type SvcFePub = { id: string; sec: string | null; name: Bi; desc: Bi; forma: FormaPub; don: boolean; cents: number; dur: Bi | null; inc: Bi[]; no: Bi[]; foto: string | null; grupos: GrupoFePub[] };
export type SelloPub = { kind: string; titulo: Bi; numero: string | null; etiqueta: string };
export type ProximoFe = { dow: number; min: number; label: Bi; lang: HorarioFe["lang"]; dias: number };
export type FePublica = {
  negocio: { id: string; nombre: string; telefono: string | null; whatsapp: boolean; foto: string | null; radio: number | null };
  kind: KindFe; subs: string[]; otra: boolean; sobria: boolean; linea: Bi; pro: boolean;
  horarios: HorarioFe[]; proximo: ProximoFe | null;
  bil: boolean; esp: boolean; help: HelpFe[]; sinid: boolean; freq: FreqFe; agotado: boolean; h24: boolean; plan: boolean; rep: RepFe; repatria: boolean; catequesis: boolean;
  secciones: { id: string; name: Bi }[]; servicios: SvcFePub[]; sellos: SelloPub[];
  booking: boolean; // 4ie: «Pedir fecha» e «Inscribirme» se piden en la app (motor de inscripciones, $0).
  td?: { k: string; v: string }[]; // las columnas de la tarjeta de Hoy (las pone la página con hoyFe)
};

const SOBRIA = ["Salón de los Testigos de Jehová", "Capilla de los Santos", "Iglesia ortodoxa"];

export async function fePublica(negocio: string): Promise<FePublica | null> {
  const b = (await db().query<{ id: string; name: string; phone: string | null; wa: boolean; foto: string | null; radio: number | null; dow: number; min: number; plan: string; off: Record<string, unknown> | null; fv: string[] }>(
    `select b.id, b.name, b.phone, b.whatsapp as wa, b.service_radius_mi as radio, b.modules_off as off, b.filter_values as fv,
            (select m.url from media m where m.owner_kind = 'business' and m.owner_id = b.id and m.status = 'visible' order by m.sort limit 1) as foto,
            extract(dow from now() at time zone ci.timezone)::int as dow,
            (extract(hour from now() at time zone ci.timezone) * 60 + extract(minute from now() at time zone ci.timezone))::int as min,
            coalesce((select st.plan from business_stats_cache st where st.business_id = b.id), 'free') as plan
       from businesses b join cities ci on ci.id = b.city_id where b.id = $1 and b.status = 'active' and b.category_id = 'NEG-FE'`, [negocio])).rows[0];
  if (!b) return null;
  const h = (await herramientaFe(negocio))!;
  // Una consulta por cosa, sin N+1: secciones, servicios a la venta, grupos del catecismo y sellos verificados.
  const [S, I, L] = await Promise.all([
    db().query<{ id: string; name: Bi }>(`select id::text, name from item_sections where business_id = $1 and module = 'svc' and removed_at is null order by sort, item_sections.id`, [negocio]),
    (b.off ?? {}).svc ? Promise.resolve({ rows: [] as (Omit<SvcFePub, "grupos" | "forma" | "don"> & { k: string | null; fe: string | null })[] }) : db().query<Omit<SvcFePub, "grupos" | "forma" | "don"> & { k: string | null; fe: string | null }>(
      `select i.id::text, i.section_id::text as sec, i.name, coalesce(i.descr, '{"es":"","en":""}'::jsonb) as desc, i.svc_kind as k, i.svc_attrs->>'fe' as fe, i.price_cents as cents,
              i.svc_attrs->'dur' as dur, coalesce(i.svc_attrs->'inc', '[]'::jsonb) as inc, coalesce(i.svc_attrs->'no', '[]'::jsonb) as no, i.photos[1] as foto
         from items i where i.business_id = $1 and i.module = 'svc' and i.removed_at is null and i.sell and i.status = 'live' and not i.is_extra order by i.sort, i.id`, [negocio]),
    db().query<{ kind: string; titulo: Bi; numero: string | null; etiqueta: string }>(
      `select l.kind, k.title as titulo, l.number as numero, k.number_label as etiqueta from licenses l join license_kinds k on k.key = l.kind
        where l.business_id = $1 and l.status = 'valid' and k.category_id = 'NEG-FE' order by k.sort, l.id`, [negocio]),
  ]);
  const cursos = I.rows.filter((x) => x.k === "curso").map((x) => x.id);
  const G = cursos.length ? (await db().query<GrupoFePub & { item: string }>(
    `select g.id::text, g.item_id::text as item, g.label, g.starts_on::text as inicio, greatest(0, g.seats_total - g.seats_outside - g.seats_booked) as libres
       from class_groups g join businesses b on b.id = g.business_id join cities ci on ci.id = b.city_id
      where g.item_id = any($1::bigint[]) and g.purpose = 'insc' and g.status = 'open' and (g.ends_on is null or g.ends_on >= (now() at time zone ci.timezone)::date)
      order by g.starts_on, g.id`, [cursos])).rows : [];
  const servicios: SvcFePub[] = I.rows.map(({ k, fe, ...x }) => ({ ...x, forma: k === "curso" ? "curso" : fe === "don" || fe === "tot" ? fe : "gratis", don: fe === "don", grupos: G.filter((g) => g.item === x.id).map(({ item: _i, ...g }) => g) }));
  const usados = new Set(servicios.map((x) => x.sec));
  const fv = b.fv ?? [];
  return {
    negocio: { id: b.id, nombre: b.name, telefono: b.phone, whatsapp: b.wa, foto: b.foto, radio: b.radio },
    kind: h.kind, subs: h.subs, otra: h.subs.some((s) => s === "Mezquita" || s === "Sinagoga"), sobria: h.subs.some((s) => s === "Mezquita" || s === "Sinagoga" || SOBRIA.includes(s)),
    linea: lineaFe(h.kind, h.subs), pro: b.plan === "pro",
    horarios: h.horarios, proximo: proximoServicio(h.horarios, h.kind, b.dow, b.min),
    bil: h.bil, esp: fv.includes("esp") || h.horarios.some((x) => x.lang === "es" || x.lang === "bil"), help: h.help, sinid: h.sinid, freq: h.freq, agotado: h.agotado, h24: h.h24, plan: h.plan,
    rep: h.rep, repatria: h.repatria, catequesis: h.catequesis,
    secciones: S.rows.filter((x) => usados.has(x.id)), servicios, sellos: L.rows, booking: true,
  };
}
/* nextCul (L34): el próximo servicio de la semana desde ahora (hora de la ciudad). En una parroquia, la próxima misa; en un culto, el
   próximo culto; en un grupo, la próxima reunión; si no hay de ese tipo, el próximo de todos. */
export function proximoServicio(H: HorarioFe[], k: KindFe, dow: number, min: number): ProximoFe | null {
  const tipo = k === "misa" ? "misa" : k === "culto" ? "culto" : k === "grupo" ? "grupo" : k === "oracion" ? "oracion" : null;
  const L = tipo && H.some((x) => x.kind === tipo) ? H.filter((x) => x.kind === tipo) : H;
  let best: ProximoFe | null = null;
  for (const x of L) {
    let d = (x.dow - dow + 7) % 7;
    if (d === 0 && x.min <= min) d = 7;
    if (!best || d < best.dias || (d === best.dias && x.min < best.min)) best = { dow: x.dow, min: x.min, label: x.label, lang: x.lang, dias: d };
  }
  return best;
}
export const proximoTexto = (n: ProximoFe | null, es: boolean) =>
  !n ? "" : n.dias === 0 ? `${es ? "Hoy" : "Today"} ${horaFe(n.min)}` : n.dias === 1 ? `${es ? "Mañana" : "Tomorrow"} ${horaFe(n.min)}` : `${DIA_FE[n.dow]![es ? 2 : 3].replace(/^./, (c) => c.toUpperCase())} ${horaFe(n.min)}`;

const lst = (L: string[], y: string) => (L.length <= 1 ? L.join("") : `${L.slice(0, -1).join(", ")} ${y} ${L[L.length - 1]}`);
export const idiomaFe = (p: Pick<FePublica, "bil" | "esp">, es: boolean) => (p.bil ? LANG_FE.bil : p.esp ? LANG_FE.es : LANG_FE.en)[es ? "es" : "en"];
export const ayudaFe = (p: Pick<FePublica, "help">, es: boolean) => HELP.filter((x) => p.help.includes(x[0] as HelpFe) && x[0] !== "sinid").map((x) => x[es ? 1 : 2]).join(" · ");
const horariosTexto = (p: FePublica, es: boolean) => lst([...p.horarios].sort((a, b) => a.dow - b.dow || a.min - b.min).map((x) => `${largoFe(x.dow, x.min, es)}${x.lang === "en" ? (es ? " (inglés)" : " (English)") : ""}`), es ? "y" : "and");
const usd = (c: number) => `$${Math.round(c / 100).toLocaleString("en-US")}`;
const tipoQue = (k: KindFe, es: boolean) => (k === "misa" ? (es ? "PRÓXIMA MISA" : "NEXT MASS") : k === "grupo" ? (es ? "PRÓXIMA REUNIÓN" : "NEXT MEETING") : es ? "PRÓXIMO SERVICIO" : "NEXT SERVICE");

/* Preguntas por tipo (faq L44–62), con los datos de verdad; la de Tu página gana (lo mezcla la página). */
export function faqFe(p: FePublica, es: boolean): { q: string; a: string }[] {
  const E2 = (a: string, b: string) => (es ? a : b), cul = horariosTexto(p, es), ay = ayudaFe(p, es), idi = idiomaFe(p, es);
  const MEM = { q: E2("¿Tengo que ser miembro?", "Do I have to be a member?"), a: E2("No. Llegas cuando quieras; nadie te pide nada en la puerta.", "No. Come whenever you like; nobody asks you for anything at the door.") };
  const HLP = { q: E2("¿Ayudan si lo necesito?", "Do you help if I need it?"), a: ay ? E2(`Sí, gratis: ${ay.toLowerCase()}. Nadie pregunta tu estatus.`, `Yes, free: ${ay.toLowerCase()}. Nobody asks about your status.`) : E2("Pregunta en la oficina; la ayuda es gratis y nadie pregunta tu estatus.", "Ask at the office; help is free and nobody asks about your status.") };
  const KIDS = { q: E2("¿Hay algo para los niños?", "Is there something for kids?"), a: p.help.includes("ninos") ? E2("Sí, escuela bíblica durante el servicio.", "Yes, Bible school during the service.") : p.help.includes("jovenes") ? E2("Hay grupo de jóvenes; los niños se quedan con sus papás.", "There is a youth group; kids stay with their parents.") : E2("Los niños se quedan con sus papás.", "Kids stay with their parents.") };
  const bau = p.servicios.find((x) => /^Bautizo/i.test(x.name.es));
  const tot = p.servicios.filter((x) => x.forma === "tot");
  const K: Record<KindFe, { q: string; a: string }[]> = {
    misa: [{ q: E2("¿Hay misa en español?", "Is there a Spanish mass?"), a: cul ? E2(`Sí: ${cul}.`, `Yes: ${cul}.`) : E2("Pregunta en la oficina.", "Ask at the office.") },
      { q: E2("¿Tengo que estar registrado en la parroquia?", "Do I have to be registered at the parish?"), a: E2("Para la misa no. Para bautizos y bodas te piden registrarte, gratis.", "Not for mass. For baptisms and weddings they ask you to register, for free.") },
      { q: E2("¿Cómo bautizo a mi hijo?", "How do I baptize my child?"), a: bau ? `${E2("Pides la fecha a la oficina; padres y padrinos van a una charla antes.", "Ask the office for the date; parents and godparents attend a talk first.")}${bau.forma === "don" && bau.cents ? E2(` El donativo de ${usd(bau.cents)} es sugerido; si no puedes, no se cobra.`, ` The ${usd(bau.cents)} donation is suggested; if you cannot, there is no charge.`) : ""}` : E2("Pregunta en la oficina parroquial.", "Ask at the parish office.") }, HLP],
    culto: [{ q: E2("¿A qué hora es el servicio?", "When is the service?"), a: cul ? `${cul.charAt(0).toUpperCase()}${cul.slice(1)}.` : E2("Pregunta por teléfono.", "Ask by phone.") }, MEM, KIDS,
      p.help.includes("transporte") ? { q: E2("¿Hay transporte?", "Are there rides?"), a: E2("Sí, gratis los días de servicio. Llama antes para que te recojan.", "Yes, free on service days. Call ahead to be picked up.") } : HLP],
    grupo: [{ q: E2("¿Quién puede ir?", "Who can come?"), a: E2("Cualquiera; no tienes que ser de la iglesia.", "Anyone; you do not have to belong to the church.") }, { q: E2("¿Cuesta algo?", "Does it cost anything?"), a: E2("No. Es gratis.", "No. It is free.") },
      { q: E2("¿Cuándo se reúnen?", "When do you meet?"), a: cul ? `${cul.charAt(0).toUpperCase()}${cul.slice(1)}.` : E2("Se avisa en el grupo.", "Announced in the group.") }, { q: E2("¿Es en español?", "Is it in Spanish?"), a: `${idi}.` }],
    sacr: [{ q: E2("¿Qué necesito para empezar?", "What do I need to start?"), a: E2("El acta de nacimiento y, si ya está bautizado, la fe de bautismo.", "The birth certificate and, if already baptized, the baptism record.") },
      { q: E2("¿Cuánto cuesta?", "How much does it cost?"), a: E2("Cada servicio dice si es gratis o el donativo sugerido. Si no puedes, no se cobra.", "Each service says if it is free or the suggested donation. If you cannot, there is no charge.") },
      { q: E2("¿Es en español?", "Is it in Spanish?"), a: `${idi}.` }, { q: E2("¿Con cuánto tiempo pido la fecha?", "How far ahead do I ask for the date?"), a: E2("Bautizo, un mes. Boda o quinceañera, seis meses.", "Baptism, one month. Wedding or quinceañera, six months.") }],
    consejo: [{ q: E2("¿Es un terapeuta?", "Is it a therapist?"), a: E2("No. Es consejería de la iglesia, no terapia médica. Si piensas hacerte daño, llama o escribe al 988.", "No. It is church counseling, not medical therapy. If you think of hurting yourself, call or text 988.") },
      { q: E2("¿Cuesta?", "Does it cost?"), a: E2("No. Es gratis.", "No. It is free.") }, { q: E2("¿Es privado?", "Is it private?"), a: E2("Sí. Lo que hablas se queda ahí.", "Yes. What you say stays there.") },
      { q: E2("¿Tengo que ser de la iglesia?", "Do I have to belong to the church?"), a: E2("No.", "No.") }],
    fun: [{ q: E2("¿Atienden a cualquier hora?", "Do you answer at any hour?"), a: p.h24 ? E2("Sí, las 24 horas, también domingos y feriados.", "Yes, 24 hours, including Sundays and holidays.") : E2("En el horario de la oficina; fuera de horario, deja un mensaje.", "During office hours; after hours, leave a message.") },
      { q: E2("¿Me dan el precio antes?", "Do I get the price first?"), a: E2("Sí, el total por escrito antes de firmar. Lo que va aparte también se dice.", "Yes, the written total before you sign. Anything extra is stated too.") },
      { q: E2("¿Cuánto tarda la repatriación?", "How long does repatriation take?"), a: p.repatria ? E2(`A República Dominicana, ${p.rep} días con los papeles del consulado.`, `To the Dominican Republic, ${p.rep} days with the consulate paperwork.`) : E2("Aquí no se hace repatriación.", "Repatriation is not done here.") },
      { q: E2("¿Hay plan de pagos?", "Is there a payment plan?"), a: p.plan && tot.length ? E2("Sí, hasta en 12 pagos, por escrito. Se arregla con la funeraria; To’Latino no cobra nada.", "Yes, up to 12 payments, in writing. Arranged with the funeral home; To’Latino does not charge anything.") : E2("Pregunta al llamar.", "Ask when you call.") }],
    oracion: [{ q: E2("¿Cuesta?", "Does it cost?"), a: E2("No. Nunca se cobra por orar.", "No. Prayer is never charged.") },
      { q: E2("¿A qué hora puedo llamar?", "When can I call?"), a: p.h24 ? E2("A cualquier hora.", "Any time.") : cul ? `${cul.charAt(0).toUpperCase()}${cul.slice(1)}.` : E2("En el horario de la página.", "During the hours on this page.") },
      { q: E2("¿Visitan el hospital o la cárcel?", "Do you visit hospitals or jail?"), a: E2("Sí, con cita; avisas el nombre y el lugar.", "Yes, by appointment; give the name and the place.") }, { q: E2("¿Es en español?", "Is it in Spanish?"), a: `${idi}.` }],
    ayuda: [{ q: E2("¿Piden papeles o seguro social?", "Do you ask for papers or SSN?"), a: p.sinid ? E2("No. Solo tu nombre y cuántos son en casa.", "No. Just your name and how many live at home.") : E2("Te piden una identificación con tu nombre, de cualquier país.", "They ask for an ID with your name, from any country.") },
      { q: E2("¿Cada cuánto puedo venir?", "How often can I come?"), a: (FREQ.find((f) => f[0] === p.freq) ?? FREQ[0]!)[es ? 3 : 4] },
      { q: E2("¿Tengo que ser de la iglesia?", "Do I have to belong to the church?"), a: E2("No. La ayuda es para cualquiera.", "No. Help is for anyone.") },
      { q: E2("¿Puedo ayudar como voluntario?", "Can I volunteer?"), a: E2("Sí; llama o pasa en el horario.", "Yes; call or stop by during hours.") }],
    tienda: [{ q: E2("¿Hacen encargos?", "Do you take orders?"), a: E2("Pregunta al llamar; te dicen cuántos días tarda.", "Ask when you call; they tell you how many days it takes.") },
      { q: E2("¿El precio es el de la caja?", "Is the price the one at the register?"), a: E2("Sí.", "Yes.") }, { q: E2("¿Es en español?", "Is it in Spanish?"), a: `${idi}.` }],
  };
  const L = [...(K[p.kind] ?? K.culto)];
  // Ayuda migratoria (§6 #18): sin sello del DOJ, «pregunta si tienen un representante acreditado»; nunca consejo legal.
  if (p.kind === "ayuda" && p.subs.includes("Ayuda migratoria de la iglesia")) {
    const doj = p.sellos.find((s) => s.kind === "fe_doj");
    L.splice(3, 1, { q: E2("¿Me ayudan con inmigración?", "Can you help with immigration?"), a: doj ? E2(`Con un representante acreditado del DOJ (${doj.etiqueta} ${doj.numero ?? ""}). No es consejo legal de un abogado.`.replace(" )", ")"), `With a DOJ-accredited representative (${doj.etiqueta} ${doj.numero ?? ""}). It is not legal advice from a lawyer.`.replace(" )", ")"))
      : E2("Orientan gratis, pero no es consejo legal. Pregunta si tienen un representante acreditado del DOJ.", "They guide you for free, but it is not legal advice. Ask whether they have a DOJ-accredited representative.") });
  }
  return L.slice(0, 4);
}

/* La tarjeta de Hoy por tipo (post L122–129): columnas con datos reales y la frase de cómo se llega + la línea fija. `hoy` = el horario
   de hoy que ya calculó la ficha («9 AM – 5 PM» o «Cerrado»). */
export function hoyFe(p: FePublica, es: boolean, hoy: string) {
  const E2 = (a: string, b: string) => (es ? a : b), k = p.kind, idi = idiomaFe(p, es), nx = proximoTexto(p.proximo, es), b = (t: Bi) => (es ? t.es : t.en);
  const cols: { k: string; v: string }[] = k === "fun" ? [{ k: E2("ATIENDE", "ANSWERS"), v: p.h24 ? E2("24 horas", "24 hours") : hoy }, { k: E2("PRECIO", "PRICE"), v: E2("Total por escrito", "Written total") },
      p.repatria ? { k: E2("REPATRIACIÓN", "REPATRIATION"), v: E2(`RD en ${p.rep} días`, `DR in ${p.rep} days`) } : { k: E2("PLAN DE PAGOS", "PAYMENT PLAN"), v: p.plan ? E2("Hasta 12 pagos", "Up to 12 payments") : "No" }]
    : k === "ayuda" ? [{ k: E2("HOY", "TODAY"), v: p.agotado ? E2("Se acabó por hoy", "Out for today") : hoy }, { k: E2("PAPELES", "PAPERS"), v: p.sinid ? E2("No piden", "Not asked") : E2("Una ID de cualquier país", "Any country ID") }, { k: E2("COSTO", "COST"), v: E2("Gratis", "Free") }]
    : k === "consejo" || k === "oracion" ? [{ k: E2("HOY", "TODAY"), v: p.h24 ? E2("24 horas", "24 hours") : hoy }, { k: E2("COSTO", "COST"), v: E2("Gratis", "Free") }, { k: E2("IDIOMA", "LANGUAGE"), v: idi }]
    : k === "tienda" ? [{ k: E2("HOY", "TODAY"), v: hoy }, { k: E2("PRECIO", "PRICE"), v: E2("El de la caja", "The register price") }, { k: E2("IDIOMA", "LANGUAGE"), v: idi }]
    : [{ k: tipoQue(k, es), v: nx || E2("Pregunta en la oficina", "Ask at the office") }, { k: E2("IDIOMA", "LANGUAGE"), v: idi }, { k: E2("AYUDA GRATIS", "FREE HELP"), v: ayudaFe(p, es) || E2("Pregunta en la oficina", "Ask at the office") }];
  const cita = p.servicios.some((x) => x.dur);
  const sub = !p.pro ? "" : k === "oracion" ? E2("Llama o escribe a cualquier hora; contesta una persona. ", "Call or text any time; a person answers. ")
    : k === "ayuda" && cita ? E2("Pasa en el horario; lo que dice «con cita» se pide a la oficina. ", "Stop by during hours; anything marked «by appointment» is requested from the office. ")
    : k === "fun" ? (p.h24 ? E2("Te atienden a cualquier hora y te explican cada paso. ", "They answer at any hour and explain each step. ") : E2("Te explican cada paso; fuera de horario deja un mensaje. ", "They explain each step; after hours leave a message. "))
    : k === "ayuda" ? E2("Ve directo en el horario: no hay que inscribirse ni pedir cita. ", "Walk in during hours: no signup or appointment needed. ")
    : k === "consejo" ? E2("Pide tu cita por teléfono. ", "Ask for your appointment by phone. ") : k === "tienda" ? "" : E2("Ven cuando quieras: no hay que inscribirse para el servicio. ", "Come whenever you like: no signup needed for the service. ");
  return { cols, sub: `${sub}${b(p.linea)}`, h24: p.h24 };
}
/* El donativo nunca se cobra: toda fila de donativo lo dice con estas palabras (guardián ayudaGratisIglesia). */
export const donativoTexto = (es: boolean) => (es ? DONATIVO.es : DONATIVO.en);
export { cortoFe };
