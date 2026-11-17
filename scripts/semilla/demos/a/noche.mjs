/* Grupo A · NOCHE · 5 subcategorías principales (sort 1–5): Bar · Bar deportivo · Cantina · Lounge · Discoteca.
   «Esta noche» (cover, «después de», fila, lista, música), mesas y VIP con depósito, licencia de licor, historia de noches y reseñas de gente que sí entró. */
import { rng, q, j, arr, bi, photoUrl, money, horario } from "./comun.mjs";
import { armar, ciudadDe, anioFundado, dias, maxDiasDe } from "./negocio.mjs";
import { genResenas as genRes, genNovedades as genNov } from "./textos.mjs";

const SUBS = ["NEG-NOCHE-01", "NEG-NOCHE-02", "NEG-NOCHE-03", "NEG-NOCHE-04", "NEG-NOCHE-05"];
const NOMBRES = [
  ["Bar La Esquina del Compadre", "El Trago Dorado Bar", "Bar Los Amigos de Siempre", "Bar y Parrilla El Tamarindo", "Bar La Estrella del Norte", "Bar Casa Quisqueya", "Bar El Faro", "Bar Don Chino", "Bar La Mesita", "Bar Rincón Latino"],
  ["Sports Bar La Cancha", "Bar Deportivo El Gol", "Sports Bar Home Run", "Bar Deportivo Los Cracks", "La Tribuna Sports Bar", "Bar Deportivo Doble Play", "Sports Bar El Estadio", "Bar Deportivo La Jugada", "Sports Bar Campeones", "Bar Deportivo El Dugout"],
  ["Cantina El Mariachi", "Cantina La Hacienda", "Cantina Los Compadres", "Cantina El Tequila Feliz", "Cantina La Parranda", "Cantina Don Chuy", "Cantina El Jalisco", "Cantina Los Arrieros", "Cantina La Charreada", "Cantina El Sombrero"],
  ["Lounge Terciopelo", "Luna Lounge", "Lounge Azúcar y Ron", "Habana Lounge", "Lounge El Mirador", "Lounge Noches de Seda", "Caribe Lounge", "Lounge Dos Mundos", "Lounge Brisa", "Lounge La Perla"],
  ["Discoteca Fuego Latino", "Club Tropicana Nights", "Discoteca La Cumbre Nocturna", "Club Sabor y Ritmo", "Discoteca Ritmo Caliente", "Club Mía Nights", "Discoteca El Palacio Latino", "Club Elevate", "Discoteca Pura Vida", "Club Bachata Rosa"],
];
const GAL = [
  [39616596, 11605478, 11362556, 16763609, 14413019, 16936184], [5055433, 12832988, 7403860, 6241298, 11460325, 36055834], [16936184, 14413019, 15735064, 14364672, 7887036, 11605478],
  [2671916, 33013695, 5923459, 7518749, 7518765, 6761494], [30592863, 5152595, 8448581, 5192289, 5192273, 4306943],
];
const ITEMF = { lista: [8281148, 10063279], cover: [5192307, 6173811], mesa: [35005900, 16936184, 6241298, 7887036, 13230484, 7518765], vip: [16125869, 5152595, 6761494] };
const MUS = [["m:mixto", "m:salsa", "m:bachata"], ["m:mixto"], ["m:banda", "m:envivo"], ["m:salsa", "m:mixto", "m:bachata"], ["m:reggaeton", "m:bachata", "m:salsa"]];
const MUS_NOTA = [["Bachata y salsa de la rockola", "Bachata and salsa from the jukebox"], ["Fútbol y béisbol en pantallas", "Soccer and baseball on screens"], ["Banda y norteño en vivo los fines de semana", "Live banda and norteño on weekends"], ["Salsa suave y hookah", "Smooth salsa and hookah"], ["Reguetón, dembow y bachata · DJ residente", "Reggaeton, dembow and bachata · resident DJ"]];
const DRESS = [null, null, ["Sin chancletas", "No flip-flops"], ["Vestimenta casual elegante", "Smart casual"], ["Sin ropa deportiva ni gorras", "No athletic wear or caps"]];

const hr = (a, b) => [[a, b]];
const HORAS = [
  () => horario({ 0: hr("16:00", "00:00"), 2: hr("16:00", "02:00"), 3: hr("16:00", "02:00"), 4: hr("16:00", "02:00"), 5: hr("16:00", "02:00"), 6: hr("16:00", "02:00") }),
  () => horario({ 0: hr("12:00", "00:00"), 1: hr("17:00", "00:00"), 2: hr("17:00", "00:00"), 3: hr("17:00", "01:00"), 4: hr("12:00", "02:00"), 5: hr("12:00", "02:00"), 6: hr("12:00", "02:00") }),
  () => horario({ 0: hr("15:00", "00:00"), 3: hr("17:00", "01:00"), 4: hr("17:00", "02:00"), 5: hr("17:00", "02:00"), 6: hr("15:00", "02:00") }),
  () => horario({ 3: hr("18:00", "01:00"), 4: hr("18:00", "02:00"), 5: hr("18:00", "02:00"), 6: hr("18:00", "02:00"), 0: hr("17:00", "00:00") }),
  () => horario({ 4: hr("21:00", "02:00"), 5: hr("21:00", "03:00"), 6: hr("21:00", "03:00") }),
];
const DIAS_ABIERTO = (h) => h.filter((x) => x.open).map((x) => x.weekday);

const ABOUT = [
  (n, o, f, st) => bi(`${n} es el bar del barrio en ${st} desde ${f}. ${o} atiende detrás de la barra: tragos de siempre, cerveza bien fría, música latina y mesas para el grupo. Mayores de 21, con identificación.`, `${n} has been the neighborhood bar on ${st} since ${f}. ${o} runs the bar: classic drinks, ice-cold beer, Latin music and tables for the group. 21 and over, ID required.`),
  (n, o, f, st) => bi(`Bar deportivo en ${st} desde ${f}: fútbol, béisbol y boxeo en pantallas grandes, alitas y cerveza de barril. ${o} guarda mesas para los partidos importantes; las reservas se hacen por la app. Mayores de 21.`, `Sports bar on ${st} since ${f}: soccer, baseball and boxing on big screens, wings and draft beer. ${o} holds tables for the big games; reserve in the app. 21 and over.`),
  (n, o, f, st) => bi(`Cantina en ${st} desde ${f}: tequila, cerveza y botanas, con banda y norteño en vivo los fines de semana. ${o} reserva tu mesa y te recibe como en casa. Mayores de 21.`, `Cantina on ${st} since ${f}: tequila, beer and botanas, with live banda and norteño on weekends. ${o} reserves your table and welcomes you like home. 21 and over.`),
  (n, o, f, st) => bi(`${n} es el lounge de ${st} desde ${f}: coctelería, hookah y salsa suave para conversar. ${o} guarda mesas y mesas VIP con botella. Vestimenta casual elegante, mayores de 21.`, `${n} has been the ${st} lounge since ${f}: cocktails, hookah and smooth salsa for good conversation. ${o} holds tables and VIP bottle tables. Smart casual, 21 and over.`),
  (n, o, f, st) => bi(`Discoteca en ${st} desde ${f}: reguetón, bachata y salsa con DJ residente de jueves a sábado. ${o} maneja la lista de la noche, el cover y las mesas VIP. Mira el cover y la fila de esta noche antes de salir.`, `Nightclub on ${st} since ${f}: reggaeton, bachata and salsa with a resident DJ Thursday to Saturday. ${o} runs the night's list, the cover and VIP tables. Check tonight's cover and line before you head out.`),
];
const FAQS = [
  (b, s) => [[bi("¿Cuál es el cover?", "What is the cover?"), bi(s.cover ? `$${s.cover / 100} los fines de semana; entre semana, entrada libre. Lo que ves en la app es lo que pagas en la puerta.` : "No hay cover. Lo que ves en la app es lo que pagas en la puerta.", s.cover ? `$${s.cover / 100} on weekends; free during the week. What you see in the app is what you pay at the door.` : "No cover. What you see in the app is what you pay at the door.")],
    [bi("¿Qué edad piden?", "What is the age limit?"), bi(`Mayores de ${s.edad}, con identificación con foto vigente.`, `${s.edad} and over, with valid photo ID.`)],
    [bi("¿Puedo reservar una mesa?", "Can I reserve a table?"), bi(s.mesa ? "Sí, desde la app. Se guarda 30 minutos después de tu hora." : "Por orden de llegada; escríbenos si vienes en grupo.", s.mesa ? "Yes, from the app. It is held 30 minutes after your time." : "First come, first served; message us if you come as a group.")],
    [bi("¿Hay código de vestimenta?", "Is there a dress code?"), bi(s.dress ? s.dress[0] + "." : "Casual, sin chancletas.", s.dress ? s.dress[1] + "." : "Casual, no flip-flops.")],
    [bi("¿Hay estacionamiento?", "Is there parking?"), bi("Sí, en la calle y en el lote del frente.", "Yes, on the street and in the lot out front.")]],
];

export function generarNoche() {
  const negocios = [];
  let baseOps = 0;
  for (let si = 0; si < 5; si++) {
    for (let k = 0; k < 10; k++) {
      const name = NOMBRES[si][k];
      const city = ciudadDe(si, k);
      const r = rng(`noche:${name}`);
      const founded = anioFundado(r);
      const hours = HORAS[si]();
      const abierto = DIAS_ABIERTO(hours);
      // ajustes de «Esta noche»
      const cover = [() => (r.chance(0.3) ? 500 : 0), () => 0, () => (r.chance(0.4) ? 500 : 0), () => r.pick([0, 0, 500, 1000]), () => r.pick([1000, 1500, 2000])][si]();
      const after = si === 4 && r.chance(0.7) ? { min: r.pick([660, 720]), cents: cover + 500 } : si === 3 && cover > 0 && r.chance(0.4) ? { min: 660, cents: cover + 500 } : null;
      const edad = si === 4 && r.chance(0.35) ? 18 : 21;
      const lista = si === 4 ? { until: r.pick([660, 720]) } : si === 3 && r.chance(0.35) ? { until: 660 } : null;
      const mesa = true, vip = si >= 3 && r.chance(0.8);
      const musica = MUS[si];
      const dress = DRESS[si] ? { es: DRESS[si][0], en: DRESS[si][1] } : null;
      const fila = si >= 3 ? r.pick([0, 10, 10, 20, 35]) : 0;
      const filaMin = 480 + r.int(2, 10) * 15 + (si === 4 ? 120 : 0);
      const n = 150 + si * 10 + k;
      const filter = ["comida", ...(si === 1 ? ["deportes"] : []), ...(si === 3 && r.chance(0.5) ? ["terraza"] : []), ...(si === 2 ? ["karaoke"].slice(0, k % 2) : [])];
      if (founded <= 2016) filter.push("y10");
      const g = GAL[si], fotoSet = [...g.slice(k % g.length), ...g.slice(0, k % g.length)];
      const bz = armar({ n, cat: "NEG-NOCHE", name, subs: [SUBS[si]].concat(si === 4 ? ["NEG-NOCHE-06"].slice(0, k % 2) : si === 3 ? ["NEG-NOCHE-17"].slice(0, k % 2) : si === 0 ? ["NEG-NOCHE-18"].slice(0, k % 2) : si === 2 ? ["NEG-NOCHE-09"].slice(0, k % 3 ? 0 : 1) : []), city, founded,
        about: null, attrs: null, filter, mods: ["svc", "rsv", "nov", "staff"], amenities: ["acepta-tarjeta", ...(si === 1 ? ["deportes-en-pantalla"] : []), ...(si === 2 ? ["musica-en-vivo"] : []), ...(filter.includes("terraza") ? ["terraza"] : []), "accesible"], hours, photoIds: fotoSet, faqs: [],
        role: bi("Dueño", "Owner"), bio: null, team: [] });
      const st0 = { cover, edad, mesa, dress: DRESS[si] };
      bz.about = ABOUT[si](name, bz.owner.first, founded, bz.addr.street);
      bz.owner.role = bi("Dueño del local", "Venue owner");
      bz.owner.bio = bi(`${bz.owner.first} abrió el local en ${founded} y vigila cada noche que todo salga bien.`, `${bz.owner.first} opened the venue in ${founded} and watches over every night.`);
      bz.team = [["Gerente de noche", "Night manager"], ["Seguridad en la puerta", "Door security"], ["Bartender", "Bartender"], ["DJ residente", "Resident DJ"]].slice(0, si === 4 ? 4 : si >= 3 ? 3 : 2).map((rl, i) => ({ name: r.pick(["Kelvin", "Darío", "Marisol", "Yadira", "Franklin", "Nathalie", "Edwin", "Lisbeth"]) + " " + r.pick(["Cruz", "Mejía", "Peña", "Rosario", "Santana"]), role: bi(rl[0], rl[1]), since: Math.min(2025, founded + r.int(1, 8)) }));
      bz.faqs = FAQS[0](bz, st0).map(([qq, a]) => ({ q: qq, a }));
      // SQL estático
      let sql = `  insert into noche_settings (business_id, city_id, cover_cents, after_min, after_cents, min_age, list_on, list_until_min, list_cap, line_min, line_at, music, music_note, dress)
  values (b, ${q(city)}, ${cover}, ${after ? after.min : "null"}, ${after ? after.cents : "null"}, ${edad}, ${!!lista}, ${lista ? lista.until : "null"}, ${lista ? r.pick([150, 200, 300]) : "null"}, ${fila}, (((now() at time zone 'America/New_York')::date - 1) + time '12:00' + make_interval(mins => ${filaMin})) at time zone 'America/New_York',
          ${arr(musica)}, ${j(bi(MUS_NOTA[si][0], MUS_NOTA[si][1]))}, ${dress ? j(dress) : "null"}) on conflict (business_id) do nothing;
  insert into licenses (business_id, kind, title, issuer, number, status, city_id, source, sort, verified_at, next_review)
  values (b, 'pa_plcb', ${j(bi("Licencia de licor (PLCB)", "Liquor license (PLCB)"))}, null, ${q(`R-${10000 + (n * 137) % 9000}`)}, 'valid', ${q(city)}, 'semilla', 1, now(), now() + interval '1 year') on conflict do nothing;
  insert into item_sections (business_id, module, name, sort) values (b, 'svc', ${j(bi("Esta noche", "Tonight"))}, 0) returning id into s;
`;
      const flat = [];
      const add = (kind, es, en, de, den, price, dur, attrs, dep, ph, sort) => {
        const f = { ord: flat.length + 1, es, en, p: price, kind, unit: "u", attrs };
        flat.push(f);
        sql += `  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, price_from, photos, sort)
    values (b, 'svc', s, ${j(bi(es, en))}, ${j(bi(de, den))}, ${price}, ${dur}, ${q(kind)}, ${j(attrs)}, ${dep}, false, array[${q(photoUrl(ph))}]::text[], ${sort});\n`;
        return f;
      };
      let so = 0;
      let iLista = null, iCover = null, iMesa = null, iVip = null;
      if (lista) iLista = add("lista", "Lista de la noche", "Tonight's list", `Gratis hasta las ${lista.until === 660 ? "11 PM" : "12 AM"} con tu nombre en la lista. Después, cover de ${money(after ? after.cents : cover || 1000)}.`, `Free until ${lista.until === 660 ? "11 PM" : "12 AM"} with your name on the list. After that, ${money(after ? after.cents : cover || 1000)} cover.`, 0, 60, { until: lista.until }, 0, r.pick(ITEMF.lista), so++);
      if (cover > 0) iCover = add("cover", "Entrada", "Entry", `${money(cover)}${after ? ` hasta las ${after.min === 660 ? "11 PM" : "12 AM"}, ${money(after.cents)} después` : ""}. Se paga en la puerta.`, `${money(cover)}${after ? ` until ${after.min === 660 ? "11 PM" : "12 AM"}, ${money(after.cents)} after` : ""}. Paid at the door.`, cover, 60, {}, 0, r.pick(ITEMF.cover), so++);
      sql += `  insert into item_sections (business_id, module, name, sort) values (b, 'svc', ${j(bi("Mesas y VIP", "Tables and VIP"))}, 1) returning id into s;\n`;
      const pax = r.pick([4, 6, 8]), dep = si >= 3 ? r.pick([0, 2000, 5000]) : 0, minimo = si === 4 ? 15000 : si === 3 ? 8000 : si === 1 ? 0 : 3000;
      iMesa = add("mesa", si === 1 ? "Mesa para el juego" : si === 2 ? "Mesa para la banda" : "Mesa para el grupo", si === 1 ? "Table for the game" : si === 2 ? "Table for the band" : "Table for the group",
        minimo ? `Hasta ${pax} personas. Mínimo de ${money(minimo)} en consumo.` : `Frente a la pantalla grande. Hasta ${pax} personas, sin mínimo.`, minimo ? `Up to ${pax} people. ${money(minimo)} minimum spend.` : `In front of the big screen. Up to ${pax} people, no minimum.`, minimo, 60, { pax, tables: r.pick([4, 5, 6, 8]), ...(dep ? { dep } : {}) }, dep, r.pick(ITEMF.mesa), so++);
      if (vip) iVip = add("vip", "Mesa VIP con botella", "VIP table with bottle", "Hasta 8 personas, una botella de la casa y mezcladores.", "Up to 8 people, a house bottle and mixers.", si === 4 ? 25000 : 20000, 60, { pax: 8, tables: 2, dep: 10000 }, 10000, r.pick(ITEMF.vip), so++);
      const mesas = [iMesa], vips = iVip ? [iVip] : [];
      const EX = [
        [["mesa", "Mesa para cumpleaños (10 o más)", "Birthday table (10 or more)", "Para grupos de 10 a 14, con mesa larga y la música que pidas.", "For groups of 10 to 14, with a long table and the music you ask for.", 5000, { pax: 14, tables: 2 }, 0], ["mesa", "Barra reservada (6 sillas)", "Reserved bar seats (6 stools)", "Seis sillas en la barra para la noche.", "Six bar stools for the night.", 0, { pax: 6, tables: 3 }, 0]],
        [["mesa", "Mesa para la pelea o la final", "Table for the fight or the final", "Se guarda con depósito de $50 que se descuenta de tu cuenta.", "Held with a $50 deposit that comes off your bill.", 0, { pax: 10, tables: 3, dep: 5000 }, 5000]],
        [["mesa", "Mesa para cumpleaños con banda", "Birthday table with the band", "Para 12 personas, cerca del escenario.", "For 12 people, near the stage.", 6000, { pax: 12, tables: 2, dep: 2000 }, 2000]],
        [["mesa", "Mesa con hookah", "Table with hookah", "Hasta 4 personas. La hookah se paga aparte.", "Up to 4 people. Hookah is extra.", 6000, { pax: 4, tables: 4 }, 0], ["vip", "Sofá privado para 6", "Private sofa for 6", "Sofá reservado con servicio de mesa.", "Reserved sofa with table service.", 15000, { pax: 6, tables: 2, dep: 5000 }, 5000]],
        [["mesa", "Mesa en la pista", "Dance-floor table", "Hasta 6 personas, junto a la pista. Mínimo de $120.", "Up to 6 people, next to the dance floor. $120 minimum.", 12000, { pax: 6, tables: 6, dep: 3000 }, 3000], ["vip", "Mesa VIP Premium · 2 botellas", "VIP Premium table · 2 bottles", "Hasta 10 personas, dos botellas de la casa y mezcladores.", "Up to 10 people, two house bottles and mixers.", 40000, { pax: 10, tables: 1, dep: 15000 }, 15000]],
      ][si];
      for (const x of EX) { const f = add(x[0], x[1], x[2], x[3], x[4], x[5], 60, x[6], x[7], r.pick(ITEMF[x[0]]), so++); (x[0] === "vip" ? vips : mesas).push(f); }
      // historia de «Esta noche»: últimas 2 semanas
      sql += `  insert into night_posts (business_id, city_id, night, field, value, at)
  select b, ${q(city)}, n.d, v.f, v.val::jsonb, ((n.d + time '12:00') + make_interval(mins => v.m)) at time zone 'America/New_York'
    from (select (((now() at time zone 'America/New_York') - interval '6 hours')::date - k) as d from generate_series(1, 14) k) n
    cross join lateral (values ('cover', '{"cents":${cover}}', 480), ${after ? `('after', '{"min":${after.min},"cents":${after.cents}}', 481), ` : ""}('line', '${fila}', 570), ('line', '${r.pick([0, 10, 20])}', 630), ('line', '${fila}', 690)) v(f, val, m)
   where extract(dow from n.d)::int = any(array[${abierto.join(",")}]) and not exists (select 1 from night_posts p where p.business_id = b);\n`;
      bz.flat = flat; bz.sqlExtra = sql;
      bz.attrs = { m: "shop", tarjeta: { offer: bi(["Jueves: 2 × 1 en cervezas hasta las 8 PM", "Partido en vivo con alitas a mitad de precio", "Miércoles de banda en vivo", "Martes de coctelería a mitad de precio", "Jueves de bachata con lista gratis hasta las 11 PM"][si], ["Thursday: 2-for-1 beers until 8 PM", "Live game with half-price wings", "Live banda Wednesdays", "Half-price cocktails on Tuesdays", "Bachata Thursday with free list until 11 PM"][si]) } };
      const posts = genNov(r, bz, flat.filter((x) => x.kind !== "lista"), {
        oferta: "Hasta el domingo. Reserva tu mesa en la app.", hoy: (x) => `Esta noche: ${x.es.toLowerCase()}`, hoyB: "Quedan pocas mesas. Reserva en la app.",
        encuesta: { t: "¿Qué música quieres esta semana?", b: "Vota y armamos la noche.", o: ["Bachata", "Salsa", "Reguetón"] },
        avisoT: "abrimos más tarde", avisoH: "late", avisoHT: "Desde las 8 PM", cupon: null, sinOferta: true,
        nov2: [["Nueva noche de música en vivo", "Cada semana un invitado distinto."], ["Ya puedes reservar tu mesa en la app", "Elige la hora y te la guardamos 30 minutos."], ["Estrenamos terraza", "Más lugar para el grupo."]],
        nov3: ["Gracias por 10 años de noches", "Entre nuestros clientes más fieles sorteamos una mesa VIP."],
      });
      void posts;
      const ops = genNoches(r, bz, flat, { si, lista, iLista, mesas, vips, dep, cover, after, edad, abierto }, baseOps);
      baseOps += ops.length + 5;
      const nRev = Math.min(80, Math.max(20, Math.round(ops.filter((o) => o.sd === "entro").length * r.pick([0.28, 0.35, 0.45]))));
      const reviews = genRes(r, ops, nRev, {
        vale: (o) => o.st === "done" && o.sd === "entro", srcDe: () => "cita", recDe: () => [], nombreDe: (o) => ({ es: o.k === "lista" ? "la lista" : o.k === "vip" ? "la mesa VIP" : "la mesa", en: o.k === "lista" ? "the list" : o.k === "vip" ? "the VIP table" : "the table" }),
        resp: (rr, s) => (s >= 5 ? { coverOk: 1, filaOk: "a", reglas: 1, segura: 1, musica: 1, trato: 1 } : s === 4 ? { coverOk: 1, filaOk: rr.pick(["a", "b"]), reglas: 1, segura: 1, musica: rr.pick([1, 0]), trato: 1 } : s === 3 ? { coverOk: rr.pick([1, 0]), filaOk: "b", reglas: 1, segura: 1, musica: 0, trato: 0 } : { coverOk: 0, filaOk: "c", reglas: 0, segura: rr.pick([1, 0]), musica: 0, trato: -1 }),
        es: { 5: ["{d} lista a la hora y la música buenísima. {x}", "Excelente noche: {d} sin problemas y buen ambiente. {x}", "Nos atendieron muy bien con {d}. {x}", "El mejor ambiente del área; {d} valió la pena. {x}", "Todo claro desde la app, {d} tal cual lo pedimos. {x}"],
          4: ["Buena noche; {d} estuvo bien aunque la fila fue larga. {x}", "Muy buen ambiente, {d} cumplió. {x}", "Todo bien con {d}; la música a buen volumen. {x}"], 3: ["{d} bien, pero tardaron en atendernos. {x}", "El cover subió más de lo que decía. {x}"], 2: ["Esperamos mucho en la puerta con {d}. {x}", "La mesa no estaba lista a la hora. {x}"],
          x5: ["Volvemos el próximo sábado.", "Lo recomiendo.", "Seguridad muy amable.", "Gracias por todo.", "Buena música."], x3: ["Espero que mejoren.", "Les doy otra oportunidad."] },
        en: { 5: ["{d} was ready on time and the music was great. {x}", "Excellent night: {d} with no problems and a great vibe. {x}", "We were very well taken care of with {d}. {x}", "Best vibe in the area; {d} was worth it. {x}"], 4: ["Good night; {d} was fine though the line was long. {x}", "Great vibe, {d} delivered. {x}"], 3: ["{d} was fine but service was slow. {x}", "The cover was higher than listed. {x}"], 2: ["We waited a long time at the door with {d}. {x}", "The table was not ready on time. {x}"],
          x5: ["We will be back next Saturday.", "Recommended.", "Very friendly door staff.", "Thank you for everything."], x3: ["Hope they improve.", "I will give them another chance."] },
        rEs5: ["Gracias por venir. Aquí te esperamos.", "Un gusto tenerte. Vuelve pronto.", "Gracias por tu reseña; se la paso al equipo."], rEs3: ["Gracias por avisarnos. Ya estamos reforzando la puerta y la fila; escríbenos y lo arreglamos.", "Lamentamos la espera. Tomamos nota para atender más rápido."], rEn5: ["Thank you for coming. See you soon.", "Our pleasure. Come back soon."], rEn3: ["Thank you for telling us. We are reinforcing the door and line; message us and we will make it right."],
      });
      bz.hist = { ops, reviews, posts };
      negocios.push(bz);
    }
  }
  return negocios;
}

function genNoches(r, b, flat, o, base) {
  const maxD = maxDiasDe(b.founded);
  const reg = Array.from({ length: 30 }, () => r.int(0, 246));
  const ops = [];
  const nOps = r.int(...[[40, 100], [40, 100], [30, 80], [50, 130], [70, 160]][o.si]);
  const hoy = new Date(Date.UTC(2026, 10, 17));
  const kinds = o.si === 4 ? [["lista", 52], ["mesa", 22], ["vip", 26]] : o.si === 3 ? [["mesa", 62], ["vip", 22], ["lista", o.lista ? 16 : 0]] : [["mesa", 100]];
  const used = new Set();
  const codigo = () => { let c; do { c = String(1000 + r.int(0, 8999)); } while (used.has(c)); used.add(c); return c; };
  for (let k = 0; k < nOps; k++) {
    let nd = k < 18 ? r.int(1, 29) : dias(r, maxD), t = 0;
    while (t++ < 14 && !o.abierto.includes(new Date(hoy.getTime() - nd * 864e5).getUTCDay())) nd += 1;
    const kind = r.weighted(kinds.filter((x) => x[1] > 0));
    const it = kind === "lista" ? o.iLista : kind === "vip" ? r.pick(o.vips.length ? o.vips : o.mesas) : r.pick(o.mesas);
    const k2 = it.kind;
    const pax = k2 === "lista" ? r.int(1, 6) : k2 === "vip" ? r.int(4, 8) : r.int(2, 8);
    const ar = k2 === "lista" ? r.int(540, 660) : r.int(o.si >= 3 ? 570 : 360, o.si >= 3 ? 690 : 600);
    const dep = k2 === "mesa" || k2 === "vip" ? (it.attrs.dep ?? 0) : 0;
    const x = r.weighted([["entro", 68], ["nollegaron", k2 === "lista" ? 0 : 6], ["noid", k2 === "lista" ? 0 : 2], ["sin", 8], ["cancelled", 8], ["expired", 5], ["declined", 3]]);
    const op = { q: base + k, n: `N-${5000000 + base + k}`, nd, k: k2, it: it.ord, u: r.chance(0.4) ? r.pick(reg) : r.int(0, 246), pax, ar, dep, edad: o.edad, st: "done" };
    if (k2 === "lista") { op.dc = o.after ? o.after.cents : o.cover; }
    if (x === "entro") { op.sd = "entro"; op.inn = k2 === "lista" ? r.int(1, pax) : pax; }
    else if (x === "nollegaron" || x === "noid") op.sd = x;
    else if (x === "sin") op.sd = k2 === "lista" ? "sin_entrar" : "sin_marcar";
    else if (x === "cancelled") { op.st = "cancelled"; op.cb = r.pick(["user", "user", "business"]); op.cr = op.cb === "user" ? "Cambiamos de planes." : "Se llenó el local."; }
    else if (x === "expired") { op.st = "expired"; op.sd = "sin_respuesta"; }
    else { op.st = "declined"; op.sd = null; }
    if (op.dep > 0 && (op.st === "done" || op.st === "cancelled")) { op.br = r.pick(["visa", "visa", "mastercard", "amex"]); op.l4 = r.pick(["4242", "4444", "0005", "1881", "9424"]); }
    else op.dep = op.st === "done" || op.st === "cancelled" ? 0 : 0;
    ops.push(op);
  }
  // próximas noches: confirmadas, con código de puerta único
  for (let k = 0; k < r.int(2, 4); k++) {
    const idx = ops.length, it = r.chance(0.6) ? o.mesas[0] : (o.iLista ?? o.mesas[0]);
    let nd = -r.int(0, 8), t = 0;
    while (t++ < 14 && !o.abierto.includes(new Date(hoy.getTime() - nd * 864e5).getUTCDay())) nd -= 1;
    ops.push({ q: base + idx, n: `N-${5000000 + base + idx}`, nd, k: it.kind, it: it.ord, u: r.int(0, 246), pax: r.int(2, 6), ar: r.int(540, 660), dep: 0, edad: o.edad, st: "confirmed", code: codigo() });
  }
  return ops;
}
