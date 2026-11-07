import "server-only";
import { db } from "./db";
import type { Bi } from "./inscripciones-comun";
import {
  PROP, cuotaTexto, kindInmDe, lineaInm, mudarteTexto, sinPropiedades, soloZona, usd,
  type Deal, type EstadoProp, type KindInm, type KindProp, type Laundry, type Util,
} from "./inmuebles-comun";
import type { SelloPub } from "./fe-publico";

/* La ficha de Bienes Raíces (Fase 4 · 4id · fase4-iglesias-inmuebles-autos.md §1c, §3, §4id; neg-inm-kind.js faq L38–53, metaOf L84–88,
   btnOf L90, tabL L91, post L94–142). Ver una propiedad es gratis; «Para mudarte» y la cuota ESTIMADA los calculó el servidor al guardar
   (lib/inmuebles.ts) y aquí solo se leen.
   VIVIENDA JUSTA Y DIRECCIÓN (guardianes viviendaJusta y direccionAlConfirmar): esta consulta pública NUNCA lee la calle ni la ubicación
   exacta de una propiedad; de cada una sale solo la zona (ciudad y código postal). La dirección de un cuarto o de «solo la zona» llega
   al confirmar la visita (4ie, lib/visitas-inm*.ts). Nada de quien pide una visita sale aquí. Los sellos (corredor de PA, NMLS,
   avaluador, inspector) salen solo de una licencia «valid». Una consulta indexada para hasta 20 propiedades, sin N+1. */
export type PropPub = {
  id: string; kind: KindProp; deal: Deal; name: Bi; desc: Bi; fotos: string[]; beds: number | null; baths: number | null; sqft: number | null;
  rent: number | null; price: number | null; dep: number; appFee: number; fees: { label: Bi; cents: number }[]; moveIn: number | null; cuota: number | null; downPct: number | null;
  disponible: string | null; furnished: boolean; pets: boolean; s8: boolean; ssnReq: boolean; utilities: Util[]; parking: boolean; laundry: Laundry;
  papers: Bi | null; lease: Bi | null; zip: string | null; soloZona: boolean; status: EstadoProp;
};
export type SvcInmPub = { id: string; sec: string | null; name: Bi; desc: Bi; cents: number; no: Bi[]; foto: string | null };
export type InmPublica = {
  negocio: { id: string; nombre: string; telefono: string | null; foto: string | null; radio: number | null; ciudad: string };
  kind: KindInm; subs: string[]; linea: Bi; pro: boolean; hoy: string; esp: boolean;
  props: PropPub[]; secciones: { id: string; name: Bi }[]; servicios: SvcInmPub[];
  itin: boolean; s8: boolean; pets: boolean; minDown: number; prequal: number; softPull: boolean; sinCom: boolean; libre: string | null; util: boolean; mueble: boolean;
  sellos: SelloPub[]; nmls: string | null;
  booking: boolean; // 4ie: la visita, la precalificación, la oferta y la cita se piden en la app (/n/{id}/ver).
  td?: { k: string; v: string }[]; // las columnas de la tarjeta de Hoy (las pone la página)
};
export const TOPE_PROPS_FICHA = 20;

export async function inmPublica(negocio: string): Promise<InmPublica | null> {
  const b = (await db().query<{ id: string; name: string; phone: string | null; foto: string | null; radio: number | null; ciudad: string; subs: string[]; fv: string[]; ca: Record<string, any> | null; hoy: string; plan: string;
    off: Record<string, unknown> | null; ov: string | null; itin: boolean | null; s8: boolean | null; pets: boolean | null; down: number | null; pre: number | null; soft: boolean | null; com: boolean | null;
    libre: string | null; util: boolean | null; mueb: boolean | null }>(
    `select b.id, b.name, b.phone, b.service_radius_mi as radio, ci.name as ciudad, b.filter_values as fv, b.category_attrs as ca, b.modules_off as off,
            (select m.url from media m where m.owner_kind = 'business' and m.owner_id = b.id and m.status = 'visible' order by m.sort limit 1) as foto,
            coalesce((select array_agg(sc.name->>'es' order by array_position(b.subcategory_ids, sc.id)) from subcategorias_vivas sc where sc.id = any(b.subcategory_ids)), '{}') as subs,
            (now() at time zone ci.timezone)::date::text as hoy, coalesce((select st.plan from business_stats_cache st where st.business_id = b.id), 'free') as plan,
            s.kind_override as ov, s.itin, s.s8, s.pets, s.min_down_pct::float as down, s.prequal_days as pre, s.soft_pull as soft, s.buyer_no_commission as com,
            s.free_from::text as libre, s.util, s.furnished as mueb
       from businesses b join cities ci on ci.id = b.city_id left join inm_settings s on s.business_id = b.id
      where b.id = $1 and b.status = 'active' and b.category_id = 'NEG-INMUEBLE'`, [negocio])).rows[0];
  if (!b) return null;
  const [P, S, I, L] = await Promise.all([
    // Solo lo que se ve: disponibles o apartadas, a la venta y sin ocultar por el equipo; la zona es el código postal.
    db().query<PropPub>(
      `select i.id::text, pl.kind, i.svc_kind as deal, i.name, coalesce(i.descr, '{"es":"","en":""}'::jsonb) as desc, i.photos as fotos, pl.beds, pl.baths::float as baths, pl.sqft,
              pl.rent_cents as rent, pl.price_cents as price, pl.deposit_cents as dep, pl.app_fee_cents as "appFee", pl.fees, pl.move_in_cents as "moveIn", pl.est_payment_cents as cuota,
              pl.est_down_pct::float as "downPct", pl.available_on::text as disponible, pl.furnished, pl.pets, pl.s8, pl.ssn_required as "ssnReq", pl.utilities, pl.parking, pl.laundry,
              pl.papers, pl.lease, pl.zip, not pl.addr_public as "soloZona", pl.status
         from property_listings pl join items i on i.id = pl.item_id
        where pl.business_id = $1 and pl.status in ('available', 'pending') and i.removed_at is null and i.status = 'live' and i.sell
        order by (pl.status = 'available') desc, i.sort, i.id limit ${TOPE_PROPS_FICHA}`, [negocio]),
    db().query<{ id: string; name: Bi }>(`select id::text, name from item_sections where business_id = $1 and module = 'svc' and removed_at is null order by sort, id`, [negocio]),
    (b.off ?? {}).svc ? Promise.resolve({ rows: [] as SvcInmPub[] }) : db().query<SvcInmPub>(
      `select i.id::text, i.section_id::text as sec, i.name, coalesce(i.descr, '{"es":"","en":""}'::jsonb) as desc, i.price_cents as cents, coalesce(i.svc_attrs->'no', '[]'::jsonb) as no, i.photos[1] as foto
         from items i where i.business_id = $1 and i.module = 'svc' and i.removed_at is null and i.sell and i.status = 'live' and not i.is_extra
          and coalesce(i.svc_kind, '') not in ('renta', 'venta', 'auto') order by i.sort, i.id`, [negocio]),
    db().query<SelloPub>(
      `select l.kind, k.title as titulo, l.number as numero, k.number_label as etiqueta from licenses l join license_kinds k on k.key = l.kind
        where l.business_id = $1 and l.status = 'valid' and k.category_id = 'NEG-INMUEBLE' order by k.sort, l.id`, [negocio]),
  ]);
  // Un cuarto nunca muestra la dirección, aunque el dato diga otra cosa (la base ya lo exige).
  const props = P.rows.map((p) => ({ ...p, fees: p.fees ?? [], fotos: p.fotos ?? [], utilities: p.utilities ?? [], soloZona: p.soloZona || soloZona(p.kind) }));
  const fv = b.fv ?? [], onb = (b.ca?.onb ?? {}) as { tool?: Record<string, unknown>; own?: { acc?: string[] } }, acc = onb.own?.acc ?? [];
  const usados = new Set(I.rows.map((x) => x.sec));
  return {
    negocio: { id: b.id, nombre: b.name, telefono: b.phone, foto: b.foto, radio: b.radio, ciudad: b.ciudad },
    kind: kindInmDe(b.subs, b.ov), subs: b.subs, linea: lineaInm(kindInmDe(b.subs, b.ov), b.subs), pro: b.plan === "pro", hoy: b.hoy, esp: fv.includes("esp"),
    props, secciones: S.rows.filter((x) => usados.has(x.id)), servicios: I.rows,
    // Sin fila todavía: lo que dice hoy la página o lo que se dijo en Publica tu negocio (como herramientaInm).
    itin: b.itin ?? (fv.includes("itin") || onb.tool?.itin === true), s8: b.s8 ?? (fv.includes("s8") || acc.includes("s8")), pets: b.pets ?? (fv.includes("mascotas") || onb.tool?.pets === true),
    minDown: b.down ?? 10, prequal: b.pre ?? 2, softPull: b.soft ?? false, sinCom: b.com ?? fv.includes("nocom"), libre: b.libre, util: b.util ?? fv.includes("utilidades"), mueble: b.mueb ?? fv.includes("amueblado"),
    sellos: L.rows, nmls: L.rows.find((x) => x.kind === "nmls_inm")?.numero ?? null, booking: true,
  };
}

const renta = (p: InmPublica) => p.props.filter((x) => x.deal === "renta"), venta = (p: InmPublica) => p.props.filter((x) => x.deal === "venta");
const minBy = <T,>(L: T[], f: (x: T) => number) => (L.length ? L.reduce((a, c) => (f(c) < f(a) ? c : a)) : null);
/* «Sin seguro social» solo si NINGUNA propiedad de renta lo pide (o, sin propiedades, lo que dice la herramienta). */
export const sinSeguro = (p: InmPublica) => { const R = renta(p); return R.length ? R.every((x) => !x.ssnReq) : p.itin; };
const MES: [string, string][] = [["ene", "Jan"], ["feb", "Feb"], ["mar", "Mar"], ["abr", "Apr"], ["may", "May"], ["jun", "Jun"], ["jul", "Jul"], ["ago", "Aug"], ["sep", "Sep"], ["oct", "Oct"], ["nov", "Nov"], ["dic", "Dec"]];
export const desdeFecha = (iso: string, hoy: string, es: boolean) => {
  if (iso <= hoy) return es ? "Hoy" : "Today";
  const [, m, d] = iso.split("-").map(Number) as [number, number, number];
  return es ? `Desde el ${d} ${MES[m - 1]![0]}` : `From ${MES[m - 1]![1]} ${d}`;
};
const libreDe = (p: InmPublica) => p.libre ?? minBy(renta(p).filter((x) => x.disponible), (x) => Date.parse(x.disponible!))?.disponible ?? null;

/* Preguntas por tipo (faq L38–53) con los datos de verdad; la de Tu página gana (lo mezcla la página). Los papeles se llevan en persona:
   aquí solo se dice QUÉ piden. */
export function faqInm(p: InmPublica, es: boolean): { q: string; a: string }[] {
  const E2 = (a: string, b: string) => (es ? a : b), R = renta(p), V = venta(p), r0 = minBy(R.filter((x) => x.moveIn != null), (x) => x.moveIn!), v0 = minBy(V, (x) => x.price ?? 0);
  const PAP = { q: E2("¿Qué papeles piden?", "What papers do they ask for?"), a: sinSeguro(p) ? E2("No piden seguro social: aceptan ITIN, pasaporte o carta del trabajo. Cada anuncio dice qué más piden; los papeles se llevan en persona.", "No SSN: they accept ITIN, passport or a work letter. Each listing says what else they need; papers are brought in person.")
    : E2("Seguro social o ITIN. Cada anuncio dice qué papeles piden; se llevan en persona, nunca por la app.", "SSN or ITIN. Each listing says which papers they need; they are brought in person, never through the app.") };
  const lib = libreDe(p), ls = R.find((x) => x.lease?.es)?.lease ?? null, contrato = ls ? (es ? ls.es : ls.en || ls.es) : "";
  const K: Record<KindInm, { q: string; a: string }[]> = {
    rent: [{ q: E2("¿Cuánto necesito para mudarme?", "How much do I need to move in?"), a: r0 ? `${mudarteTexto(r0, es)}.${r0.appFee ? "" : E2(" Sin cuota de solicitud.", " No application fee.")}` : E2("El primer mes y el depósito; cada anuncio lo dice.", "First month and deposit; each listing says it.") }, PAP,
      { q: E2("¿Cobran por ver la propiedad?", "Do they charge to show it?"), a: E2("No. Ver es gratis y no te compromete. Nunca pagues un depósito antes de ver la propiedad y firmar el contrato.", "No. Viewing is free and commits you to nothing. Never pay a deposit before seeing the property and signing the lease.") },
      p.s8 ? { q: E2("¿Aceptan Section 8?", "Do you take Section 8?"), a: E2("Sí. Pagas tu parte según tus ingresos; la autoridad de vivienda paga el resto.", "Yes. You pay your share based on income; the housing authority pays the rest.") }
        : { q: E2("¿Aceptan mascotas?", "Are pets allowed?"), a: p.pets || R.some((x) => x.pets) ? E2("Sí, en las que lo dicen. Los animales de servicio y de apoyo no son mascotas: se aceptan siempre.", "Yes, where listed. Service and support animals are not pets: they are always accepted.") : E2("No en estas propiedades. Los animales de servicio y de apoyo no son mascotas: se aceptan siempre.", "Not in these properties. Service and support animals are not pets: they are always accepted.") }],
    cuarto: [{ q: E2("¿Qué incluye?", "What is included?"), a: p.util ? E2(`Luz, agua e internet${p.mueble ? ", y el cuarto amueblado" : ""}.`, `Power, water and internet${p.mueble ? ", and the room is furnished" : ""}.`) : E2("Cada cuarto lo dice.", "Each room says it.") },
      { q: E2("¿Hay contrato?", "Is there a lease?"), a: contrato ? `${contrato.replace(/\.$/, "")}.` : E2("Te lo dicen por escrito antes de firmar.", "They put it in writing before you sign.") }, PAP,
      { q: E2("¿Cuándo está libre?", "When is it free?"), a: lib ? `${desdeFecha(lib, p.hoy, es)}.` : E2("Pregunta al pedir la visita.", "Ask when you request the visit.") }],
    venta: [{ q: E2("¿Cuánto necesito para comprar?", "How much do I need to buy?"), a: E2("El enganche y los costos de cierre (de 3 a 5 % del precio). Todo por escrito antes de la oferta.", "The down payment and closing costs (3 to 5% of the price). All in writing before the offer.") },
      { q: E2("¿Puedo comprar con ITIN?", "Can I buy with ITIN?"), a: p.itin ? E2("Sí, con préstamos para ITIN de un prestamista con licencia.", "Yes, with ITIN loans from a licensed lender.") : E2("Pregunta; depende del prestamista.", "Ask; it depends on the lender.") },
      { q: E2("¿Pago comisión al agente?", "Do I pay the agent a commission?"), a: p.sinCom ? E2("Como comprador, no: la paga el vendedor. Te lo firman por escrito.", "As a buyer, no: the seller pays it. It is put in writing.") : E2("Se dice por escrito antes de que firmes nada.", "It is put in writing before you sign anything.") },
      { q: E2("¿La cuota es fija?", "Is the payment fixed?"), a: v0?.cuota ? E2(`No: ${cuotaTexto(v0.cuota, v0.downPct, true)} es estimada; la real depende del préstamo.`, `No: the ${cuotaTexto(v0.cuota, v0.downPct, false).toLowerCase()} is an estimate; the real one depends on the loan.`) : E2("Cada casa dice su cuota estimada; la real depende del préstamo.", "Each home shows its estimated payment; the real one depends on the loan.") }],
    hipo: [{ q: E2("¿Me garantizan la aprobación?", "Is approval guaranteed?"), a: E2("No. Nadie puede garantizarla antes de revisar tus papeles; quien te la prometa, cuidado.", "No. No one can guarantee it before reviewing your papers; be careful with anyone who promises it.") },
      { q: E2("¿Qué papeles necesito?", "What papers do I need?"), a: E2("Te los dicen al llamar y se llevan en persona; To’Latino nunca te pide seguro social, ITIN, ingresos ni estados de cuenta.", "They tell you when you call and you bring them in person; To’Latino never asks for your SSN, ITIN, income or bank statements.") },
      { q: E2("¿Cuánto tarda?", "How long does it take?"), a: E2(`La precalificación, ${p.prequal} ${p.prequal === 1 ? "día" : "días"} con los papeles completos.`, `Pre-qualification, ${p.prequal} ${p.prequal === 1 ? "day" : "days"} with complete papers.`) },
      { q: E2("¿Cuánto es el enganche?", "How much is the down payment?"), a: E2(`Desde ${String(p.minDown).replace(/\.0$/, "")} %${p.itin ? " con ITIN" : ""}. Hay programas de ayuda con el enganche en Pennsylvania.`, `From ${String(p.minDown).replace(/\.0$/, "")}%${p.itin ? " with ITIN" : ""}. There are down payment assistance programs in Pennsylvania.`) }],
    serv: [{ q: E2("¿Cuánto cuesta?", "How much does it cost?"), a: E2("Cada servicio dice el precio total; lo que va aparte se dice antes.", "Each service shows the total price; anything extra is stated first.") },
      { q: E2("¿Tienen licencia?", "Are you licensed?"), a: p.sellos.length ? E2(`Sí: ${p.sellos.map((s) => s.titulo.es).join(", ")}. Verificada por To’Latino.`, `Yes: ${p.sellos.map((s) => s.titulo.en || s.titulo.es).join(", ")}. Verified by To’Latino.`) : E2("Pregunta por la licencia al llamar.", "Ask about the license when you call.") },
      { q: E2("¿Atienden en español?", "Do you serve in Spanish?"), a: p.esp ? E2("Sí.", "Yes.") : E2("Pregunta al llamar.", "Ask when you call.") }],
    derechos: [{ q: E2("¿Son abogados?", "Are you lawyers?"), a: E2("No. Te orientan y, si hace falta, te mandan con un abogado.", "No. They guide you and, if needed, refer you to a lawyer.") }, { q: E2("¿Cuesta?", "Does it cost?"), a: E2("No. Es gratis.", "No. It is free.") },
      { q: E2("¿Me pueden sacar sin ir a la corte?", "Can they evict me without court?"), a: E2("En Pennsylvania el dueño necesita una orden de la corte para sacarte. Si te cambian la cerradura o te cortan la luz, llama.", "In Pennsylvania the landlord needs a court order to evict you. If they change the lock or cut the power, call.") },
      { q: E2("¿Me preguntan mi estatus?", "Do you ask my status?"), a: E2("No.", "No.") }],
    comercial: [{ q: E2("¿Qué incluye la renta?", "What does the rent include?"), a: E2("Cada local lo dice; lo que no está escrito, no está incluido.", "Each space says it; if it is not written, it is not included.") },
      { q: E2("¿De cuánto es el contrato?", "How long is the lease?"), a: E2("Te enseñan el contrato completo antes de firmar.", "You see the full lease before signing.") },
      { q: E2("¿Cuánto para empezar?", "How much to start?"), a: r0 ? `${mudarteTexto(r0, es)}.` : E2("El primer mes y un depósito; se dice por escrito.", "The first month and a deposit; in writing.") }],
    alm: [{ q: E2("¿Cuánto cuesta?", "How much is it?"), a: R.length ? E2(`Desde ${usd(minBy(R, (x) => x.rent ?? 0)!.rent ?? 0)} al mes.`, `From ${usd(minBy(R, (x) => x.rent ?? 0)!.rent ?? 0)} a month.`) : E2("Pregunta al llamar.", "Ask when you call.") },
      { q: E2("¿Piden depósito?", "Is there a deposit?"), a: R.some((x) => x.dep > 0) ? E2("En las que lo dicen; el total para empezar sale en cada una.", "Where listed; the total to start is shown on each.") : E2("No. Pagas el primer mes.", "No. You pay the first month.") },
      { q: E2("¿Piden papeles?", "Do you ask for papers?"), a: E2("Una identificación con tu nombre, de cualquier país.", "An ID with your name, from any country.") }],
  };
  return (K[p.kind] ?? K.rent).slice(0, 4);
}

/* La tarjeta de Hoy por tipo (post L108–117): columnas con datos reales y la frase de cómo se pide + la línea fija. */
export function hoyInm(p: InmPublica, es: boolean, hoy: string) {
  const E2 = (a: string, b: string) => (es ? a : b), k = p.kind, R = renta(p), V = venta(p), b = (t: Bi) => (es ? t.es : t.en);
  const rMin = minBy(R.filter((x) => x.moveIn != null), (x) => x.moveIn!), vMin = minBy(V, (x) => x.price ?? 0), sMin = minBy(p.servicios.filter((x) => x.cents > 0), (x) => x.cents);
  const lib = libreDe(p), idi = p.esp ? E2("Español", "Spanish") : E2("Inglés", "English");
  const nmls = p.nmls ? `NMLS ${p.nmls}` : E2("Pregunta", "Ask");
  const cols: { k: string; v: string }[] = k === "rent" ? [{ k: E2("PARA MUDARTE", "TO MOVE IN"), v: rMin ? `${E2("Desde", "From")} ${usd(rMin.moveIn!)}` : "—" },
      { k: E2("REQUISITOS", "REQUIREMENTS"), v: p.s8 || R.some((x) => x.s8) ? "Section 8" : sinSeguro(p) ? E2("Sin seguro social", "No SSN") : E2("Seguro social o ITIN", "SSN or ITIN") },
      { k: E2("DISPONIBLES", "AVAILABLE"), v: String(R.filter((x) => x.status === "available").length) }]
    : k === "cuarto" ? [{ k: E2("AL MES", "PER MONTH"), v: R.length ? `${R.length > 1 ? E2("Desde ", "From ") : ""}${usd(minBy(R, (x) => x.rent ?? 0)!.rent ?? 0)}` : "—" },
      { k: E2("INCLUYE", "INCLUDES"), v: p.util ? E2("Luz, agua e internet", "Power, water, internet") : E2("Lo dice cada cuarto", "Each room says") }, { k: E2("LIBRE", "FREE"), v: lib ? desdeFecha(lib, p.hoy, es) : E2("Pregunta", "Ask") }]
    : k === "venta" ? [{ k: E2("PRECIO", "PRICE"), v: vMin ? `${E2("Desde", "From")} ${usd(vMin.price ?? 0)}` : E2("Pregunta", "Ask") },
      // La cuota siempre «estimada» (Regulation Z): aquí solo la cifra bajo el rótulo CUOTA ESTIMADA; la hoja dice con qué enganche.
      { k: E2("CUOTA ESTIMADA", "EST. PAYMENT"), v: vMin?.cuota ? cuotaTexto(vMin.cuota, null, es).replace(/^(Cuota estimada|Estimated payment) /, "") : "—" }, { k: "ITIN", v: p.itin ? E2("Sí", "Yes") : "No" }]
    : k === "hipo" ? [{ k: E2("PRECALIFICACIÓN", "PRE-QUALIFICATION"), v: E2(`Gratis · en ${p.prequal} ${p.prequal === 1 ? "día" : "días"}`, `Free · in ${p.prequal} ${p.prequal === 1 ? "day" : "days"}`) },
      { k: E2("ENGANCHE", "DOWN PAYMENT"), v: `${E2("Desde", "From")} ${String(p.minDown).replace(/\.0$/, "")} %` }, { k: E2("LICENCIA", "LICENSE"), v: nmls }]
    : k === "serv" ? [{ k: E2("PRECIO", "PRICE"), v: sMin ? `${E2("Desde", "From")} ${usd(sMin.cents)}` : E2("Gratis", "Free") }, { k: E2("HOY", "TODAY"), v: hoy }, { k: E2("IDIOMA", "LANGUAGE"), v: idi }]
    : k === "derechos" ? [{ k: E2("HOY", "TODAY"), v: hoy }, { k: E2("COSTO", "COST"), v: E2("Gratis", "Free") }, { k: E2("IDIOMA", "LANGUAGE"), v: idi }]
    : k === "alm" ? [{ k: E2("DESDE", "FROM"), v: R.length ? `${usd(minBy(R, (x) => x.rent ?? 0)!.rent ?? 0)}${E2("/mes", "/mo")}` : E2("Pregunta", "Ask") }, { k: E2("ACCESO", "ACCESS"), v: hoy }, { k: E2("PAPELES", "PAPERS"), v: E2("Una ID", "An ID") }]
    : [{ k: E2("DESDE", "FROM"), v: R.length ? `${usd(minBy(R, (x) => x.rent ?? 0)!.rent ?? 0)}${E2("/mes", "/mo")}` : vMin ? usd(vMin.price ?? 0) : E2("Pregunta", "Ask") },
      { k: E2("CONTRATO", "LEASE"), v: E2("Completo antes de firmar", "Full lease before signing") }, { k: E2("HOY", "TODAY"), v: hoy }];
  const sub = !p.pro ? E2("Llama o escribe para ver la propiedad o pedir la cita. ", "Call or message to see the property or book. ")
    : ({ rent: E2("Ver es gratis y te dicen el total para mudarte antes de firmar. ", "Viewing is free and you get the move-in total before signing. "), cuarto: E2("Ver es gratis; la dirección te llega cuando aceptan la visita. ", "Viewing is free; the address arrives once the visit is accepted. "),
      venta: E2("Ver una casa es gratis; el agente te confirma la hora. ", "Viewing a home is free; the agent confirms the time. "), hipo: E2("Precalificar es gratis; te llaman para juntar los papeles. ", "Pre-qualifying is free; they call to gather your papers. "),
      serv: "", comercial: E2("Ver el local es gratis. ", "Viewing the space is free. "), alm: "", derechos: "" } as Record<KindInm, string>)[k];
  return { cols, sub: `${sub}${b(p.linea)}` };
}
export { sinPropiedades, PROP };
