/* Ronda 2 · NOCHE · arma los 200 negocios (20 subcategorías × 10, 2 por ciudad) con la misma forma que la ronda 1 (grupo A · noche):
   «Esta noche», licencia de licor, mesas y VIP con depósito, historial publicado, noches pasadas y próximas, reseñas de gente que sí entró.
   Las 3 «por fecha» (promotor, DJ, salón) venden servicios «desde», sin «Esta noche» ni operaciones; sus reseñas son de visitante. SOLO SANDBOX. */
import { rng, q, j, arr, bi, photoUrl, money } from "../a/comun.mjs";
import { armar, ciudadDe, anioFundado, dias, maxDiasDe } from "../a/negocio.mjs";
import { genResenas as genRes, genNovedades as genNov } from "../a/textos.mjs";
import { SUBS } from "./subs.mjs";
import { duenoTel } from "./comun.mjs";

/* Fotos: solo las ya usadas por la ronda 1 de Noche (pexels, ya revisadas). */
const GAL = [39616596, 11605478, 11362556, 16763609, 14413019, 16936184, 5055433, 12832988, 7403860, 6241298, 11460325, 36055834, 15735064, 14364672, 7887036, 2671916, 33013695, 5923459, 7518749, 7518765, 6761494, 30592863, 5152595, 8448581, 5192289, 5192273, 4306943];
const ITEMF = { lista: [8281148, 10063279], cover: [5192307, 6173811], mesa: [35005900, 16936184, 6241298, 7887036, 13230484, 7518765], vip: [16125869, 5152595, 6761494], fecha: [5192289, 7887036, 6241298, 14413019] };
const hLabel = (m) => (m === 660 ? "11 PM" : m === 720 ? "12 AM" : "1 AM");
const NOMBRES_EQ = ["Kelvin", "Darío", "Marisol", "Yadira", "Franklin", "Nathalie", "Edwin", "Lisbeth", "Ismael", "Paola"];
const APELL_EQ = ["Cruz", "Mejía", "Peña", "Rosario", "Santana", "Guerrero", "Núñez", "Castillo"];

export function generarNocheR2() {
  const negocios = [];
  let baseOps = 0;
  SUBS.forEach((c, si) => {
    for (let k = 0; k < 10; k++) {
      const idx = si * 10 + k;
      negocios.push(c.tipo === "v" ? local(c, si, k, idx, baseOps) : porFecha(c, si, k, idx));
      baseOps += negocios[negocios.length - 1].hist.ops.length + 5;
    }
  });
  return negocios;
}

function galeria(c, k) {
  const s = (c.gal * 5 + k * 3) % GAL.length;
  return Array.from({ length: 6 }, (_, i) => GAL[(s + i) % GAL.length]);
}
function equipo(r, c, founded) {
  return c.team.slice(0, 4).map((rl) => ({ name: r.pick(NOMBRES_EQ) + " " + r.pick(APELL_EQ), role: bi(rl[0], rl[1]), since: Math.min(2025, founded + r.int(1, 8)) }));
}
function faqsLocal(c, s) {
  const f = [
    [bi("¿Cuál es el cover?", "What is the cover?"), bi(s.cover ? `$${s.cover / 100} las noches con cover; lo que ves en la app es lo que pagas en la puerta.` : "No hay cover. Lo que ves en la app es lo que pagas en la puerta.", s.cover ? `$${s.cover / 100} on cover nights; what you see in the app is what you pay at the door.` : "No cover. What you see in the app is what you pay at the door.")],
    [bi("¿Qué edad piden?", "What is the age limit?"), bi(`Mayores de ${s.edad}, con identificación con foto vigente.`, `${s.edad} and over, with valid photo ID.`)],
    [bi("¿Puedo reservar una mesa?", "Can I reserve a table?"), bi("Sí, desde la app. Se guarda 30 minutos después de tu hora.", "Yes, from the app. It is held 30 minutes after your time.")],
    [bi("¿Hay código de vestimenta?", "Is there a dress code?"), bi(c.dress ? c.dress[0] + "." : "Casual, sin chancletas.", c.dress ? c.dress[1] + "." : "Casual, no flip-flops.")],
    [bi("¿Hay estacionamiento?", "Is there parking?"), bi("Sí, en la calle y en el lote cercano.", "Yes, on the street and in the nearby lot.")],
  ];
  return f.map(([qq, a]) => ({ q: qq, a }));
}

function local(c, si, k, idx, baseOps) {
  const name = c.names[k], city = ciudadDe(si, k);
  const r = rng(`r2noche:${name}`);
  const founded = anioFundado(r);
  const hours = c.hrs();
  const abierto = hours.filter((x) => x.open).map((x) => x.weekday);
  const cover = r.pick(c.cov);
  const after = c.aft && cover > 0 && r.chance(c.aft) ? { min: r.pick([660, 720]), cents: cover + 500 } : null;
  const edad = c.e18 && r.chance(c.e18) ? 18 : 21;
  const lista = c.lst && cover > 0 && r.chance(c.lst) ? { until: r.pick(c.lstU ?? [660, 720]) } : null;
  const fila = r.pick(c.fila);
  const filaMin = Math.min(960, c.ar[0] + r.int(0, 6) * 15 + 60);
  const filter = [...c.filt];
  if (founded <= 2016) filter.push("y10");
  const subs = [c.id, ...(k % 2 === 0 ? [c.sec[(k >> 1) % c.sec.length]] : [])];
  const bz = armar({ n: 1000 + idx, cat: "NEG-NOCHE", name, subs, city, founded, about: null, attrs: null, filter, mods: ["svc", "rsv", "nov", "staff"],
    amenities: c.amen, hours, photoIds: galeria(c, k), faqs: [], role: bi("Dueño", "Owner"), bio: null, team: [] });
  bz.id = bz.id + "-nx";
  bz.owner.phone = duenoTel(idx);
  bz.about = c.about(name, bz.owner.first, founded, bz.addr.street);
  bz.owner.role = bi("Dueño del local", "Venue owner");
  bz.owner.bio = bi(`${bz.owner.first} abrió el local en ${founded} y vigila cada noche que todo salga bien.`, `${bz.owner.first} opened the venue in ${founded} and watches over every night.`);
  bz.team = equipo(r, c, founded);
  bz.faqs = faqsLocal({ dress: c.dress }, { cover, edad });
  bz.attrs = { m: "shop", tarjeta: { offer: bi(c.offer[0], c.offer[1]) } };

  let sql = `  insert into noche_settings (business_id, city_id, cover_cents, after_min, after_cents, min_age, list_on, list_until_min, list_cap, line_min, line_at, music, music_note, dress)
  values (b, ${q(city)}, ${cover}, ${after ? after.min : "null"}, ${after ? after.cents : "null"}, ${edad}, ${!!lista}, ${lista ? lista.until : "null"}, ${lista ? r.pick([150, 200, 300]) : "null"}, ${fila}, (((now() at time zone 'America/New_York')::date - 1) + time '12:00' + make_interval(mins => ${filaMin})) at time zone 'America/New_York',
          ${arr(c.mus)}, ${j(bi(c.musN[0], c.musN[1]))}, ${c.dress ? j(bi(c.dress[0], c.dress[1])) : "null"}) on conflict (business_id) do nothing;
`;
  if (c.lic) sql += `  insert into licenses (business_id, kind, title, issuer, number, status, city_id, source, sort, verified_at, next_review)
  values (b, 'pa_plcb', ${j(bi("Licencia de licor (PLCB)", "Liquor license (PLCB)"))}, null, ${q(`R-${10000 + ((2000 + idx) * 137) % 9000}`)}, 'valid', ${q(city)}, 'semilla', 1, now(), now() + interval '1 year') on conflict do nothing;
`;
  const flat = [];
  let so = 0, sec = 0;
  const seccion = (es, en) => { sql += `  insert into item_sections (business_id, module, name, sort) values (b, 'svc', ${j(bi(es, en))}, ${sec++}) returning id into s;\n`; };
  const add = (kind, es, en, de, den, price, dur, attrs, dep, ph, ref) => {
    const f = { ord: flat.length + 1, es, en, p: price, kind, unit: "u", attrs, ref };
    flat.push(f);
    sql += `  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, price_from, photos, sort)
    values (b, 'svc', s, ${j(bi(es, en))}, ${j(bi(de, den))}, ${price}, ${dur}, ${q(kind)}, ${j(attrs)}, ${dep}, false, array[${q(photoUrl(ph))}]::text[], ${so++});\n`;
    return f;
  };
  let iLista = null;
  if (lista || cover > 0) {
    seccion("Esta noche", "Tonight");
    if (lista) iLista = add("lista", "Lista de la noche", "Tonight's list", `Gratis hasta las ${hLabel(lista.until)} con tu nombre en la lista. Después, cover de ${money(after ? after.cents : cover)}.`, `Free until ${hLabel(lista.until)} with your name on the list. After that, ${money(after ? after.cents : cover)} cover.`, 0, 60, { until: lista.until }, 0, r.pick(ITEMF.lista), ["la lista", "the list"]);
    if (cover > 0) add("cover", "Entrada", "Entry", `${money(cover)}${after ? ` hasta las ${hLabel(after.min)}, ${money(after.cents)} después` : ""}. Se paga en la puerta.`, `${money(cover)}${after ? ` until ${hLabel(after.min)}, ${money(after.cents)} after` : ""}. Paid at the door.`, cover, 60, {}, 0, r.pick(ITEMF.cover), ["la entrada", "the entry"]);
  }
  seccion("Mesas y VIP", "Tables and VIP");
  const M = c.mesa;
  const pax = r.pick(M.pax), tables = r.pick(M.tables);
  let min = r.pick(M.min), dep = r.pick(M.dep);
  if (M.hr) dep = 0;
  else if (min === 0) dep = 0;
  else dep = Math.min(dep, min);
  const dM = M.hr ? [`Hasta ${pax} personas. ${money(min)} por hora, se paga en el local.`, `Up to ${pax} people. ${money(min)} per hour, paid at the venue.`]
    : min ? [`Hasta ${pax} personas. Mínimo de ${money(min)} en consumo.`, `Up to ${pax} people. ${money(min)} minimum spend.`]
      : [`Hasta ${pax} personas, sin mínimo.${M.note ? " " + M.note[0] : ""}`, `Up to ${pax} people, no minimum.${M.note ? " " + M.note[1] : ""}`];
  const iMesa = add("mesa", M.es, M.en, dM[0], dM[1], min, 60, { pax, tables, ...(M.hr ? { hr: true } : {}), ...(dep ? { dep } : {}) }, dep, r.pick(ITEMF.mesa), M.ref);
  const mesas = [iMesa], vips = [];
  if (c.vip && r.chance(c.vip.p)) vips.push(add("vip", c.vip.es, c.vip.en, c.vip.d[0], c.vip.d[1], c.vip.price, 60, { pax: c.vip.pax, tables: 2, dep: c.vip.dep }, c.vip.dep, r.pick(ITEMF.vip), c.vip.ref ?? ["la mesa VIP", "the VIP table"]));
  for (const x of c.ex) { const f = add(x[0], x[1], x[2], x[3], x[4], x[5], 60, x[6], x[7], r.pick(ITEMF[x[0]]), [x[8], x[9]]); (x[0] === "vip" ? vips : mesas).push(f); }
  sql += `  insert into night_posts (business_id, city_id, night, field, value, at)
  select b, ${q(city)}, n.d, v.f, v.val::jsonb, ((n.d + time '12:00') + make_interval(mins => v.m)) at time zone 'America/New_York'
    from (select (((now() at time zone 'America/New_York') - interval '6 hours')::date - k) as d from generate_series(1, 14) k) n
    cross join lateral (values ('cover', '{"cents":${cover}}', 480), ${after ? `('after', '{"min":${after.min},"cents":${after.cents}}', 481), ` : ""}('line', '${fila}', 570), ('line', '${r.pick([0, 10, 20])}', 630), ('line', '${fila}', 690)) v(f, val, m)
   where extract(dow from n.d)::int = any(array[${abierto.join(",")}]) and not exists (select 1 from night_posts p where p.business_id = b);\n`;
  bz.flat = flat; bz.sqlExtra = sql;

  const posts = genNov(r, bz, flat.filter((x) => x.kind !== "lista"), novCfg(c, bz, false));
  const ops = noches(r, bz, flat, { c, lista, iLista, mesas, vips, cover, after, edad, abierto }, baseOps);
  const entro = ops.filter((o) => o.sd === "entro").length;
  const nRev = Math.min(40, Math.max(15, Math.round(entro * r.pick([0.28, 0.35, 0.45]))));
  const reviews = genRes(r, ops, nRev, resenasCfg(c, false, (o) => ({ es: o.ref[0], en: o.ref[1] }), (o) => o.st === "done" && o.sd === "entro", () => "cita", true));
  bz.hist = { ops: ops.map(({ ref, ...x }) => x), reviews, posts };
  return bz;
}

function porFecha(c, si, k, idx) {
  const name = c.names[k], city = ciudadDe(si, k);
  const r = rng(`r2noche:${name}`);
  const founded = anioFundado(r);
  const hours = c.hrs();
  const filter = [...c.filt];
  if (founded <= 2016) filter.push("y10");
  const subs = [c.id, ...(k % 2 === 0 ? [c.sec[(k >> 1) % c.sec.length]] : [])];
  const bz = armar({ n: 1000 + idx, cat: "NEG-NOCHE", name, subs, city, founded, about: null, attrs: null, filter, mods: ["svc", "nov", "staff"],
    amenities: c.amen, hours, photoIds: galeria(c, k), faqs: [], role: bi("Dueño", "Owner"), bio: null, team: [] });
  bz.id = bz.id + "-nx";
  bz.owner.phone = duenoTel(idx);
  bz.about = c.about(name, bz.owner.first, founded, bz.addr.street);
  bz.owner.role = bi("Dueño", "Owner");
  bz.owner.bio = bi(`${bz.owner.first} empezó en ${founded} y atiende cada cotización en persona.`, `${bz.owner.first} started in ${founded} and handles every quote personally.`);
  bz.team = equipo(r, c, founded);
  bz.faqs = [
    [bi("¿Cómo pido una cotización?", "How do I ask for a quote?"), bi("Escríbenos por la app con la fecha, el lugar y cuántas personas; te contestamos el mismo día.", "Message us in the app with the date, place and number of guests; we reply the same day.")],
    [bi("¿Necesito dejar un depósito?", "Do I need to leave a deposit?"), bi("Para apartar la fecha pedimos un adelanto que se descuenta del total; lo acordamos por escrito.", "To hold the date we ask for an advance that comes off the total; we agree on it in writing.")],
    [bi("¿Atienden fuera de la ciudad?", "Do you work outside the city?"), bi("Sí, en el valle y alrededores; el traslado se cotiza aparte.", "Yes, around the valley; travel is quoted separately.")],
    [bi("¿Qué pasa si cambio la fecha?", "What if I change the date?"), bi("Avísanos con una semana y la movemos sin costo, según disponibilidad.", "Tell us a week ahead and we move it at no cost, subject to availability.")],
  ].map(([qq, a]) => ({ q: qq, a }));
  bz.attrs = { m: "shop", tarjeta: { offer: bi(c.offer[0], c.offer[1]) } };
  let sql = `  insert into item_sections (business_id, module, name, sort) values (b, 'svc', ${j(bi("Servicios", "Services"))}, 0) returning id into s;\n`;
  const flat = [];
  c.fecha.forEach((x, i) => {
    const price = Math.round((x[4] * r.pick([1, 1, 1.1, 0.95])) / 500) * 500;
    flat.push({ ord: i + 1, es: x[0], en: x[1], p: price, kind: "fecha", unit: "u", attrs: {}, ref: ["el servicio", "the service"] });
    sql += `  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, price_from, photos, sort)
    values (b, 'svc', s, ${j(bi(x[0], x[1]))}, ${j(bi(x[2], x[3]))}, ${price}, 240, 'fecha', ${j({ pax: x[5], inc: x[6].map((z) => ({ es: z[0], en: z[1] })) })}, 0, true, array[${q(photoUrl(r.pick(ITEMF.fecha)))}]::text[], ${i});\n`;
  });
  bz.flat = flat; bz.sqlExtra = sql;
  const posts = genNov(r, bz, flat, novCfg(c, bz, true));
  // Reseñas de visitante: una por persona, con su fecha.
  const maxD = maxDiasDe(founded);
  const us = r.shuffle(Array.from({ length: 247 }, (_, i) => i)).slice(0, r.int(15, 32));
  const pseudo = us.map((u, i) => ({ q: i, u, nd: Math.max(6, dias(r, maxD)), st: "done", sd: "entro", k: "fecha", ref: ["el servicio", "the service"] }));
  const reviews = genRes(r, pseudo, pseudo.length, resenasCfg(c, true, (o) => ({ es: o.ref[0], en: o.ref[1] }), () => true, () => "vis", false)).map((rv) => {
    const o = pseudo[rv.o];
    return { u: o.u, nd: o.nd, s: rv.s, l: rv.l, b: rv.b, r: rv.r, rl: rv.rl, h: rv.h };
  });
  bz.hist = { ops: [], reviews, posts };
  return bz;
}

function novCfg(c, bz, fecha) {
  return {
    oferta: "", hoy: (x) => (fecha ? `Agenda abierta: ${x.es.toLowerCase()}` : `Esta noche: ${x.es.toLowerCase()}`), hoyB: fecha ? "Pide tu cotización en la app." : "Quedan pocas mesas. Reserva en la app.",
    encuesta: c.poll, avisoT: fecha ? "cerramos temprano" : "abrimos más tarde", ...(fecha ? {} : { avisoH: "late", avisoHT: "Desde las 8 PM" }), cupon: null, sinOferta: true,
    nov2: c.nov, nov3: ["Gracias por otro año juntos", "Seguimos abriendo para ti; gracias por la confianza."],
  };
}

function resenasCfg(c, fecha, nombreDe, vale, srcDe, conRespuestas) {
  const cl5 = [...(fecha ? ["Muy recomendados.", "Gracias por todo.", "Volveremos a contratar."] : ["Volvemos pronto.", "Lo recomiendo.", "Gracias por todo."]), c.cl[0]];
  const cl5e = [...(fecha ? ["Highly recommended.", "Thank you for everything.", "We will hire again."] : ["We will be back soon.", "Recommended.", "Thank you for everything."]), c.cl[1]];
  const L = fecha
    ? { es: { 5: ["Todo salió como lo hablamos: {d} fue puntual y muy profesional. {x}", "Los invitados quedaron felices con {d}. {x}", "Respondieron rápido a la cotización y {d} fue justo lo que pedimos. {x}"],
        4: ["Muy bien en general; {d} cumplió, aunque tardaron en confirmar la fecha. {x}", "Buen trato con {d}. {x}"], 3: ["{d} estuvo bien, pero tardaron en contestar. {x}", "El precio final subió un poco frente a la cotización. {x}"], 2: ["Llegaron tarde y {d} no fue lo que esperábamos. {x}", "Costó mucho coordinar la fecha de {d}. {x}"] },
      en: { 5: ["Everything went as agreed: {d} was on time and very professional. {x}", "Our guests were thrilled with {d}. {x}", "They answered the quote quickly and {d} was exactly what we asked for. {x}"],
        4: ["Very good overall; {d} delivered, though confirming the date took a while. {x}", "Good service with {d}. {x}"], 3: ["{d} was fine, but they were slow to reply. {x}", "The final price was a bit above the quote. {x}"], 2: ["They arrived late and {d} was not what we expected. {x}", "Coordinating the date for {d} was hard. {x}"] } }
    : { es: { 5: ["{d} estaba lista a la hora y la atención fue muy buena. {x}", "Excelente noche: llegamos y {d} ya nos esperaba. {x}", "Todo claro desde la app, {d} salió tal cual lo pedimos. {x}", "Nos atendieron muy bien y {d} valió la pena. {x}", "Gran ambiente; {d} fue lo mejor de la noche. {x}"],
        4: ["Buena noche; {d} estuvo bien aunque había mucha gente. {x}", "Muy buen ambiente y {d} cumplió. {x}", "Todo bien con {d}; solo faltó algo más de espacio. {x}"], 3: ["{d} estaba bien, pero tardaron en atendernos. {x}", "La espera fue más larga de lo prometido con {d}. {x}"], 2: ["Esperamos mucho en la puerta y {d} no estaba lista a la hora. {x}", "Nos prometieron {d} y tardó demasiado. {x}"] },
      en: { 5: ["{d} was ready on time and the service was great. {x}", "Excellent night: we arrived and {d} was waiting for us. {x}", "Everything was clear in the app, {d} was just as we asked. {x}", "We were very well taken care of and {d} was worth it. {x}"],
        4: ["Good night; {d} was fine though it was crowded. {x}", "Great vibe and {d} delivered. {x}"], 3: ["{d} was fine but service was slow. {x}", "The wait was longer than promised with {d}. {x}"], 2: ["We waited a long time at the door and {d} was not ready on time. {x}", "They promised {d} and it took far too long. {x}"] } };
  return {
    vale, srcDe, recDe: () => [], nombreDe,
    resp: (rr, s) => (!conRespuestas ? {} : s >= 5 ? { coverOk: 1, filaOk: "a", reglas: 1, segura: 1, musica: 1, trato: 1 } : s === 4 ? { coverOk: 1, filaOk: rr.pick(["a", "b"]), reglas: 1, segura: 1, musica: rr.pick([1, 0]), trato: 1 } : s === 3 ? { coverOk: rr.pick([1, 0]), filaOk: "b", reglas: 1, segura: 1, musica: 0, trato: 0 } : { coverOk: 0, filaOk: "c", reglas: 0, segura: rr.pick([1, 0]), musica: 0, trato: -1 }),
    es: { ...L.es, x5: cl5, x3: ["Espero que mejoren.", "Les doy otra oportunidad."] }, en: { ...L.en, x5: cl5e, x3: ["Hope they improve.", "I will give them another chance."] },
    rEs5: fecha ? ["Gracias por confiar en nosotros. Cuando quieras otra fecha, aquí estamos.", "Un gusto servirte. Vuelve cuando quieras."] : ["Gracias por venir. Aquí te esperamos.", "Un gusto tenerte. Vuelve pronto.", "Gracias por tu reseña; se la paso al equipo."],
    rEs3: fecha ? ["Gracias por avisarnos. Estamos revisando nuestros tiempos de respuesta; escríbenos y lo arreglamos.", "Lamentamos el retraso. Tomamos nota para coordinar mejor."] : ["Gracias por avisarnos. Ya estamos reforzando la puerta y la fila; escríbenos y lo arreglamos.", "Lamentamos la espera. Tomamos nota para atender más rápido."],
    rEn5: fecha ? ["Thank you for trusting us. Whenever you need another date, we are here."] : ["Thank you for coming. See you soon.", "Our pleasure. Come back soon."],
    rEn3: fecha ? ["Thank you for telling us. We are reviewing our response times; message us and we will make it right."] : ["Thank you for telling us. We are reinforcing the door and line; message us and we will make it right."],
  };
}

function noches(r, b, flat, o, base) {
  const { c } = o;
  const maxD = maxDiasDe(b.founded);
  const reg = Array.from({ length: 30 }, () => r.int(0, 246));
  const ops = [];
  const nOps = r.int(c.ops[0], c.ops[1]);
  const hoy = new Date(Date.UTC(2026, 10, 17));
  const kinds = [["mesa", c.kw.mesa], ["vip", o.vips.length ? c.kw.vip : 0], ["lista", o.iLista ? (c.kw.lista || 16) : 0]].filter((x) => x[1] > 0);
  if (!kinds.length) kinds.push(["mesa", 100]);
  const used = new Set();
  const codigo = () => { let cd; do { cd = String(1000 + r.int(0, 8999)); } while (used.has(cd)); used.add(cd); return cd; };
  const num = (i) => `N-${28000000 + base + i}`;
  for (let k = 0; k < nOps; k++) {
    let nd = k < 18 ? r.int(1, 29) : dias(r, maxD), t = 0;
    while (t++ < 14 && !o.abierto.includes(new Date(hoy.getTime() - nd * 864e5).getUTCDay())) nd += 1;
    const kind = r.weighted(kinds);
    const it = kind === "lista" ? o.iLista : kind === "vip" ? r.pick(o.vips) : r.pick(o.mesas);
    const k2 = it.kind;
    const hr = !!it.attrs.hr;
    const pax = k2 === "lista" ? r.int(1, 6) : k2 === "vip" ? r.int(4, Math.min(8, it.attrs.pax)) : r.int(2, Math.min(8, it.attrs.pax ?? 6));
    const ar = k2 === "lista" ? r.int(...c.arL) : r.int(...c.ar);
    const dep = !hr && (k2 === "mesa" || k2 === "vip") ? (it.attrs.dep ?? 0) : 0;
    const x = r.weighted([["entro", 68], ["nollegaron", k2 === "lista" ? 0 : 6], ["noid", k2 === "lista" ? 0 : 2], ["sin", 8], ["cancelled", 8], ["expired", 5], ["declined", 3]]);
    const op = { q: base + k, n: num(k), nd, k: k2, it: it.ord, u: r.chance(0.4) ? r.pick(reg) : r.int(0, 246), pax, ar, dep, edad: o.edad, st: "done", ref: it.ref };
    if (k2 === "lista") op.dc = o.after ? o.after.cents : o.cover;
    if (x === "entro") { op.sd = "entro"; op.inn = k2 === "lista" ? r.int(1, pax) : pax; }
    else if (x === "nollegaron" || x === "noid") op.sd = x;
    else if (x === "sin") op.sd = k2 === "lista" ? "sin_entrar" : "sin_marcar";
    else if (x === "cancelled") { op.st = "cancelled"; op.cb = r.pick(["user", "user", "business"]); op.cr = op.cb === "user" ? "Cambiamos de planes." : "Se llenó el local."; }
    else if (x === "expired") { op.st = "expired"; op.sd = "sin_respuesta"; }
    else { op.st = "declined"; op.sd = null; }
    if (op.dep > 0 && (op.st === "done" || op.st === "cancelled")) { op.br = r.pick(["visa", "visa", "mastercard", "amex"]); op.l4 = r.pick(["4242", "4444", "0005", "1881", "9424"]); }
    else op.dep = 0;
    ops.push(op);
  }
  for (let k = 0, n = r.int(2, 4); k < n; k++) {
    const idx = ops.length, it = r.chance(0.6) ? o.mesas[0] : (o.iLista ?? o.mesas[0]);
    let nd = -r.int(0, 8), t = 0;
    while (t++ < 14 && !o.abierto.includes(new Date(hoy.getTime() - nd * 864e5).getUTCDay())) nd -= 1;
    ops.push({ q: base + idx, n: num(idx), nd, k: it.kind, it: it.ord, u: r.int(0, 246), pax: r.int(2, 6), ar: it.kind === "lista" ? r.int(...c.arL) : r.int(...c.ar), dep: 0, edad: o.edad, st: "confirmed", code: codigo(), ref: it.ref });
  }
  return ops;
}
