/* Ronda 2 · TIENDA · arma los negocios de las subcategorías 06–52 (10 por subcategoría, 2 por ciudad). Reutiliza (solo importa) los helpers del grupo A:
   armar, textos de reseñas y novedades, SQL de negocio y funciones temporales. Aquí solo van lo propio de la ronda 2: teléfonos reservados,
   numeración de operaciones (A-27000000…), catálogo por subcategoría y la historia ligera. SOLO SANDBOX. */
import { readFileSync } from "node:fs";
import { rng, q, j, bi, photoUrl, money, horario, rango, dueno, FIRST_F, FIRST_M, SURN } from "../a/comun.mjs";
import { armar, ciudadDe, anioFundado, dias, maxDiasDe } from "../a/negocio.mjs";
import { genResenas as genRes, genNovedades as genNov } from "../a/textos.mjs";
import { SUBS1 } from "./subs1.mjs";
import { SUBS2 } from "./subs2.mjs";
import { SUBS3 } from "./subs3.mjs";

const RAIZ = new URL("../../../../", import.meta.url).pathname;
export const SUBS = { ...SUBS1, ...SUBS2, ...SUBS3 };
export const CODIGOS = Object.keys(SUBS).sort();

// ── Reservas de la ronda 2 ──
export const OP_BASE = 27000000;                  // números de operación 27000000–27999999 (formato de la app: A-<dígitos>)
const TEL_DUENO = 14845553600;                    // dueños +14845553600…+14845554199
const TEL_CLI = 17175551800;                      // clientes +17175551800…+17175552099 (247 caben en 300)

export const CLIENTES2 = (() => {
  const out = [], seen = new Set();
  for (let i = 0; i < 247; i++) {
    const fem = i % 2 === 1, F = fem ? FIRST_F : FIRST_M;
    let a = (i * 5 + (fem ? 2 : 7)) % F.length, b = (i * 13 + Math.floor(i / 47) + 3) % SURN.length, k = 0;
    while (seen.has(F[a] + SURN[b])) { b = (b + 1) % SURN.length; if (++k > 70) { a = (a + 1) % F.length; k = 0; } }
    seen.add(F[a] + SURN[b]);
    out.push({ idx: i, phone: `+${TEL_CLI + i}`, first: F[a], last: SURN[b], city: ["hzl", "alw", "wbr", "scr", "rdg"][(i * 3 + 2) % 5], lang: i % 6 === 5 ? "en" : "es" });
  }
  return out;
})();

/* Igual que CLIENTES_SQL del grupo A pero con los teléfonos de esta ronda (las funciones temporales usan da_cli idx 0…246). */
export const CLIENTES_SQL2 = () => {
  const rows = CLIENTES2.map((c) => ({ p: c.phone, f: c.first, l: c.last, c: c.city, g: c.lang, i: c.idx }));
  return `insert into users (phone, phone_verified_at, first_name, last_name, home_city_id, lang, created_at)
select x->>'p', now() - interval '4 years', x->>'f', x->>'l', x->>'c', x->>'g', now() - make_interval(days => 200 + (x->>'i')::int * 7)
  from jsonb_array_elements($j$${JSON.stringify(rows)}$j$::jsonb) x
on conflict (phone) do nothing;
create temp table da_cli on commit drop as
  select (t.o - 1)::int as idx, u.id from jsonb_array_elements_text($j$${JSON.stringify(CLIENTES2.map((c) => c.phone))}$j$::jsonb) with ordinality t(p, o) join users u on u.phone = t.p;
alter table da_cli add primary key (idx);
`;
};

// ── Tallas ──
const Z = {
  m: ["S", "M", "L", "XL", "2X", "3X"], mn: ["2", "4", "6", "8", "10", "12", "14", "16"], h: ["S", "M", "L", "XL", "2X", "3X"], hp: ["30", "32", "34", "36", "38", "40", "42"],
  n: ["2T", "3T", "4T", "5", "6", "7", "8", "10", "12", "14"], z: ["7", "8", "9", "10", "11", "12", "13"], zw: ["5", "6", "7", "8", "9", "10"], zn: ["10", "11", "12", "13", "1", "2", "3", "4"],
  us: ["XS", "S", "M", "L", "XL", "2X", "3X"], hat: ["6 3/4", "7", "7 1/4", "7 3/8", "7 1/2", "7 5/8"], rg: ["6", "7", "8", "9", "10"], b: ["S", "M", "L"], mt: ["Twin", "Full", "Queen", "King"],
  bb: ["RN", "0-3 M", "3-6 M", "6-9 M", "9-12 M"],
};
const ETQ = { m: ["Talla", "Size"], mn: ["Talla", "Size"], h: ["Talla", "Size"], hp: ["Talla", "Size"], n: ["Talla", "Size"], z: ["Talla", "Size"], zw: ["Talla", "Size"], zn: ["Talla", "Size"], us: ["Talla", "Size"], hat: ["Talla de sombrero", "Hat size"], rg: ["Medida", "Ring size"], b: ["Talla de cuadro", "Frame size"], mt: ["Tamaño", "Size"], bb: ["Talla", "Size"] };
const GRANDE = /^(2X|3X|4X|5X|XXL|XXXL)$/i;

// ── Horarios (weekday 0 = domingo) ──
const HORAS = {
  A: () => horario({ 0: rango("12:00", "17:00"), 1: rango("10:00", "19:00"), 2: rango("10:00", "19:00"), 3: rango("10:00", "19:00"), 4: rango("10:00", "19:30"), 5: rango("10:00", "19:30"), 6: rango("10:00", "19:30") }),
  B: () => horario({ 1: rango("09:00", "18:00"), 2: rango("09:00", "18:00"), 3: rango("09:00", "18:00"), 4: rango("09:00", "18:00"), 5: rango("09:00", "18:00"), 6: rango("09:00", "14:00") }),
  C: () => horario({ 0: rango("12:00", "17:00"), 1: rango("11:00", "20:00"), 2: rango("11:00", "20:00"), 3: rango("11:00", "20:00"), 4: rango("11:00", "20:00"), 5: rango("11:00", "21:00"), 6: rango("11:00", "21:00") }),
  D: () => horario(Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((d) => [d, rango("06:00", "22:00")]))),
  E: () => horario({ 0: rango("10:00", "14:00"), 1: rango("09:00", "18:00"), 2: rango("09:00", "18:00"), 3: rango("09:00", "18:00"), 4: rango("09:00", "18:00"), 5: rango("09:00", "18:30"), 6: rango("09:00", "17:00") }),
  F: () => horario({ 1: rango("10:00", "18:30"), 2: rango("10:00", "18:30"), 3: rango("10:00", "18:30"), 4: rango("10:00", "18:30"), 5: rango("10:00", "18:30"), 6: rango("10:00", "16:00") }),
  G: () => horario({ 0: rango("09:00", "13:00"), 1: rango("07:30", "18:00"), 2: rango("07:30", "18:00"), 3: rango("07:30", "18:00"), 4: rango("07:30", "18:00"), 5: rango("07:30", "18:00"), 6: rango("08:00", "16:00") }),
  H: () => horario({ 0: rango("08:00", "15:00"), 5: rango("10:00", "18:00"), 6: rango("08:00", "17:00") }),
};

// ── Fotos: las de los negocios de la semilla de la misma subcategoría (ya están en el repo) ──
const FOTOS_EXTRA = { "06": [18726333, 29765480, 701771], "10": [29765480, 5560083, 701771], "11": [36883230, 29765480, 5618793], "51": [8387807, 8201205, 6764299], "52": [6068971, 6069544, 8201205], "09": [29765480, 6068971, 1020372] };
const SEED = JSON.parse(readFileSync(RAIZ + "infra/pruebas/semilla/negocios.json", "utf8"));
export const IDS_SEMILLA = new Set(SEED.map((b) => b.id));
function pool(cod) {
  const sid = `NEG-TIENDA-${cod}`, out = [];
  for (const b of SEED) if (b.subcategory_ids.includes(sid)) for (const u of b.photos) { const m = u.match(/photos\/(\d+)\//); if (m && !out.includes(+m[1])) out.push(+m[1]); }
  for (const x of FOTOS_EXTRA[cod] ?? []) if (!out.includes(x)) out.push(x);
  if (!out.length) throw new Error("sin fotos para " + cod);
  return out;
}

// ── Subcategoría relacionada (segunda etiqueta en la mitad de los negocios) ──
const REL = { 6: 7, 7: 9, 8: 7, 9: 11, 10: 11, 11: 5, 12: 13, 13: 12, 14: 15, 15: 14, 16: 14, 17: 18, 18: 17, 19: 14, 20: 21, 21: 20, 22: 23, 23: 22, 24: 25, 25: 26, 26: 25, 27: 28, 28: 27, 29: 34, 30: 31, 31: 30, 32: 33, 33: 32, 34: 35, 35: 34, 36: 50, 37: 34, 38: 16, 39: 40, 40: 39, 41: 39, 42: 41, 43: 44, 44: 39, 45: 46, 46: 45, 47: 48, 48: 34, 49: 50, 50: 49, 51: 52, 52: 51 };
const SERVICIO = new Set(["11", "12", "13", "15", "44", "46", "48"]);

function parseItems(txt) {
  const secs = [];
  for (const ln of txt.split("\n")) {
    if (ln.startsWith("# ")) { const [es, en] = ln.slice(2).split(" | "); secs.push({ n: [es.trim(), en.trim()], items: [] }); continue; }
    const [nm, pr, sz] = ln.split(" / ");
    const [es, en] = nm.split(" | ");
    secs.at(-1).items.push({ es: es.trim(), en: (en ?? es).trim(), base: Math.round(Number(pr) * 100), sz: sz ? sz.trim() : "u" });
  }
  return secs;
}
export const CATALOGOS = Object.fromEntries(CODIGOS.map((c) => [c, parseItems(SUBS[c].items)]));

const redondeaPrecio = (c) => (c >= 2000 ? Math.round(c / 100) * 100 - 100 : c >= 1000 ? Math.round(c / 100) * 100 : Math.max(100, Math.round(c / 50) * 50));

// ── Textos de reseñas por tipo de comercio ──
const RES = {
  talla: {
    es: { 5: ["Aparté {d} en la app y lo tenían listo en mi talla. {x}", "Me quedó perfecto {d}; la atención fue excelente. {x}", "Muy buen precio por {d} y la calidad se nota. {x}", "Encontré {d} tal como lo vi en la página. {x}", "Me ayudaron a encontrar mi talla de {d}. {x}"],
      4: ["Buena tienda; {d} me gustó, aunque tuve que esperar en la caja. {x}", "Lindo {d} y buen precio. {x}", "Todo bien con {d}; me gustaría más variedad. {x}"], 3: ["El {d} estaba bien pero no tenían mi talla. {x}", "Tardaron en atenderme en la caja. {x}"], 2: ["Aparté {d} y al llegar ya no estaba mi talla. {x}", "La calidad de {d} no fue la que esperaba. {x}"],
      x5: ["Los recomiendo.", "Voy a volver.", "Atención muy amable.", "Gracias por todo.", "Ya somos clientes de años."], x3: ["Espero que mejoren.", "Les doy otra oportunidad."] },
    en: { 5: ["I held {d} in the app and it was ready in my size. {x}", "{d} fit perfectly; excellent service. {x}", "Great price for {d} and the quality shows. {x}", "They helped me find my size in {d}. {x}"], 4: ["Nice store; I liked {d}, though the register line was long. {x}", "Lovely {d} and a fair price. {x}"],
      3: ["The {d} was fine but they did not have my size. {x}", "Service at the register was slow. {x}"], 2: ["I held {d} and when I arrived my size was gone. {x}", "The quality of {d} was not what I expected. {x}"], x5: ["Highly recommend.", "I will be back.", "Very friendly.", "Customers for years."], x3: ["Hope they improve.", "I will give them another chance."] },
    rEs3: ["Gracias por avisarnos. Estamos ajustando las existencias por talla; escríbenos y lo resolvemos.", "Lamentamos la espera. Tomamos nota para atender más rápido en la caja."], rEn3: ["Thank you for telling us. We are adjusting stock by size; message us and we will make it right."],
  },
  producto: {
    es: { 5: ["Aparté {d} en la app y lo tenían listo cuando llegué. {x}", "Compré {d} y funciona perfecto; muy buena atención. {x}", "Buen precio por {d} y me explicaron todo. {x}", "Encontré {d} tal como lo vi en la página. {x}", "Me ayudaron a elegir {d}. {x}"],
      4: ["Buena tienda; {d} me gustó, aunque tuve que esperar en la caja. {x}", "Buen {d} y buen precio. {x}", "Todo bien con {d}; me gustaría más variedad. {x}"], 3: ["El {d} estaba bien pero no tenían el modelo que quería. {x}", "Tardaron en atenderme en la caja. {x}"], 2: ["Aparté {d} y al llegar ya no había. {x}", "La calidad de {d} no fue la que esperaba. {x}"],
      x5: ["Los recomiendo.", "Voy a volver.", "Atención muy amable.", "Gracias por todo.", "Ya somos clientes de años."], x3: ["Espero que mejoren.", "Les doy otra oportunidad."] },
    en: { 5: ["I held {d} in the app and it was ready when I arrived. {x}", "I bought {d} and it works great; very good service. {x}", "Fair price for {d} and they explained everything. {x}", "They helped me choose {d}. {x}"], 4: ["Nice store; I liked {d}, though the register line was long. {x}", "Good {d} and a fair price. {x}"],
      3: ["The {d} was fine but they did not have the model I wanted. {x}", "Service at the register was slow. {x}"], 2: ["I held {d} and by the time I arrived it was gone. {x}", "The quality of {d} was not what I expected. {x}"], x5: ["Highly recommend.", "I will be back.", "Very friendly.", "Customers for years."], x3: ["Hope they improve.", "I will give them another chance."] },
    rEs3: ["Gracias por avisarnos. Estamos revisando las existencias; escríbenos y lo resolvemos.", "Lamentamos la espera. Tomamos nota para atender más rápido en la caja."], rEn3: ["Thank you for telling us. We are reviewing our stock; message us and we will make it right."],
  },
  servicio: {
    es: { 5: ["Dejé {d} y estuvo listo cuando dijeron. {x}", "Muy buen trabajo con {d}; precio justo. {x}", "Me atendieron rápido para {d}. {x}", "Excelente resultado en {d}. {x}", "Amables y puntuales con {d}. {x}"],
      4: ["Buen servicio; {d} quedó bien, aunque tardó un día más. {x}", "Buen precio por {d}. {x}", "Todo bien con {d}; el local es pequeño. {x}"], 3: ["{d} quedó bien pero tardó más de lo prometido. {x}", "Tardaron en atenderme en la caja. {x}"], 2: ["Dejé {d} y no estaba listo el día acordado. {x}", "El resultado de {d} no fue el que esperaba. {x}"],
      x5: ["Los recomiendo.", "Voy a volver.", "Atención muy amable.", "Gracias por todo.", "Ya somos clientes de años."], x3: ["Espero que mejoren.", "Les doy otra oportunidad."] },
    en: { 5: ["I dropped off {d} and it was ready when they said. {x}", "Very good work on {d}; fair price. {x}", "They took care of {d} quickly. {x}", "Excellent result on {d}. {x}"], 4: ["Good service; {d} turned out well, though it took a day longer. {x}", "Fair price for {d}. {x}"],
      3: ["{d} turned out fine but took longer than promised. {x}", "Service at the counter was slow. {x}"], 2: ["I dropped off {d} and it was not ready on the agreed day. {x}", "The result of {d} was not what I expected. {x}"], x5: ["Highly recommend.", "I will be back.", "Very friendly.", "Customers for years."], x3: ["Hope they improve.", "I will give them another chance."] },
    rEs3: ["Gracias por avisarnos. Tomamos nota para entregar a tiempo; escríbenos y lo resolvemos.", "Lamentamos la espera. Estamos reforzando la atención en la caja."], rEn3: ["Thank you for telling us. We are noting it to deliver on time; message us and we will make it right."],
  },
};

let CONTADOR = 0;                                   // contador global de operaciones (único en toda la ronda)
export function generarTienda() {
  const negocios = [];
  CODIGOS.forEach((cod, si) => {
    const S = SUBS[cod], secsBase = CATALOGOS[cod], fotos = pool(cod), servicio = SERVICIO.has(cod);
    const tallado = secsBase.some((s) => s.items.some((x) => x.sz !== "u")), grande = secsBase.some((s) => s.items.some((x) => Z[x.sz]?.some((t) => GRANDE.test(t))));
    const tipoRes = tallado ? "talla" : servicio ? "servicio" : "producto";
    if (S.names.length !== 10) throw new Error(`${cod}: ${S.names.length} nombres`);
    for (let k = 0; k < 10; k++) {
      const name = S.names[k], city = ciudadDe(si, k), idx = si * 10 + k;
      const r = rng(`r2tienda:${name}`);
      const founded = anioFundado(r);
      const layaway = r.chance(S.ly), ship = r.chance(S.shp), hold = r.pick([24, 48, 48, 48, 72]);
      const ret = S.ret.length === 1 && S.ret[0] === 0 ? 0 : r.pick(S.ret), disp = { hold, ret, ship, layaway };
      const rot = (k * 2) % fotos.length;
      const fotoSet = [...fotos.slice(rot), ...fotos.slice(0, rot)].slice(0, 6);
      const hours = HORAS[S.hrs]();
      const sub = `NEG-TIENDA-${cod}`, rel = REL[+cod] ? `NEG-TIENDA-${String(REL[+cod]).padStart(2, "0")}` : null;
      const filter = ["apartado", "efectivo", "estac"];
      if (grande) filter.push("tallas");
      if (layaway) filter.push("layaway");
      if (ship) filter.push("envio");
      if (hours[0].open && r.chance(0.7)) filter.push("domingo");
      if (founded <= 2016) filter.push("y10");
      const bz = armar({ n: idx + 300, cat: "NEG-TIENDA", name, subs: k % 2 && rel ? [sub, rel] : [sub], city, founded, about: null, attrs: null, filter, mods: ["shop", "pedidos", "nov", "staff"],
        amenities: ["acepta-tarjeta", "apartado", "pickup-en-tienda", ...(ship ? ["envio"] : []), "estacionamiento", "accesible"], hours, photoIds: fotoSet, faqs: [], role: bi("Dueña", "Owner"), bio: null, team: [] });
      bz.id = `${bz.id}-${city}`;
      if (IDS_SEMILLA.has(bz.id)) throw new Error("id en la semilla: " + bz.id);
      bz.owner.phone = `+${TEL_DUENO + idx}`;
      const [aEs, aEn] = S.ab.split(" ## ");
      const fill = (s) => s.replaceAll("{n}", name).replaceAll("{o}", bz.owner.first).replaceAll("{f}", String(founded)).replaceAll("{st}", bz.addr.street);
      bz.about = bi(fill(aEs), fill(aEn));
      bz.owner.role = bi(...S.role);
      bz.owner.bio = bi(`${bz.owner.first} abrió el negocio en ${founded} y sigue atendiendo en el mostrador.`, `${bz.owner.first} opened the business in ${founded} and still works the counter.`);
      bz.team = r.shuffle(["Yaritza Soto", "Marcos Peña", "Katherine Mejía", "Elvis Núñez", "Odalis Cruz", "Franklin Rosario"]).slice(0, r.int(1, 3)).map((nm, i) => ({ name: nm, role: bi(["Ventas", "Caja", "Servicio"][i % 3], ["Sales", "Register", "Service"][i % 3]), since: Math.min(2025, founded + r.int(1, 7)) }));
      const faqs = [
        [bi("¿Cómo funciona el apartado?", "How does holding an item work?"), bi(`Eliges en la app, lo guardamos por ${hold} horas y pagas en la caja cuando vengas. No se cobra nada antes.`, `Pick it in the app, we hold it for ${hold} hours and you pay at the register when you come in. Nothing is charged before.`)],
        [bi("¿Puedo cambiar o devolver?", "Can I exchange or return?"), bi(ret ? `Sí, dentro de ${ret} días con el recibo.` : "Por la naturaleza del producto o servicio, no hacemos devoluciones; si algo sale mal, lo resolvemos.", ret ? `Yes, within ${ret} days with the receipt.` : "Given the nature of the product or service we do not take returns; if something goes wrong we make it right.")],
        [bi("¿Hacen envío?", "Do you ship?"), bi(ship ? "Sí, a todo el país en 3 a 5 días." : "Por ahora solo recoges en la tienda.", ship ? "Yes, nationwide in 3 to 5 days." : "For now, pickup in store only.")],
        [bi("¿Qué formas de pago aceptan?", "What payment methods do you take?"), bi("Efectivo y tarjeta en la caja. El apartado no cobra nada hasta que recoges.", "Cash and card at the register. A hold charges nothing until you pick up.")],
      ];
      if (grande) faqs.push([bi("¿Tienen tallas grandes?", "Do you carry plus sizes?"), bi("Sí, hasta la 3X en la mayoría de la ropa.", "Yes, up to 3X on most clothing.")]);
      for (const f of S.faq) { const [a, b, c, d] = f.split("|"); faqs.push([bi(a, b), bi(c, d)]); }
      bz.faqs = faqs.map(([qq, a]) => ({ q: qq, a }));
      // catálogo completo: todas las secciones; la mayoría de los artículos (≥ 80 %), con variantes de color en la ropa
      const COL = [["negro", "black"], ["blanco", "white"], ["azul marino", "navy"], ["rojo", "red"], ["beige", "beige"], ["verde", "green"], ["vino", "burgundy"], ["gris", "gray"]];
      let pi = k;
      const sections = secsBase.map((s) => ({ n: s.n, items: s.items.filter(() => r.chance(0.94)).flatMap((x) => {
        const lista = [x];
        if (tallado && x.sz !== "u" && r.chance(0.3)) { const c1 = r.pick(COL); lista.push({ ...x, es: `${x.es} · ${c1[0]}`, en: `${x.en} · ${c1[1]}`, base: Math.round(x.base * 1.05) }); }
        return lista;
      }).map((x) => ({ es: x.es, en: x.en, p: redondeaPrecio(x.base * (0.92 + r() * 0.16)), sz: x.sz, ph: fotos[pi++ % fotos.length], u: x.sz === "u" })) })).filter((s) => s.items.length);
      const taxDe = (it) => (S.tax === "c" ? (it.u ? 6 : 0) : S.tax);
      let sql = `  insert into retail_settings (business_id, ebt, cash, weighs_front, sub_default, slot_cap, hold_hours, returns_days, layaway, lay_down_pct, lay_payments, lay_every_days, lay_cancel_pct)
  values (b, false, true, false, 'call', ${r.pick([4, 6, 8])}, ${hold}, ${ret}, ${layaway}, 20, 4, 14, 10) on conflict (business_id) do nothing;
  insert into delivery_settings (business_id, pickup, delivery, pay_card, pay_cash_pickup, ship, ship_fee_cents, ship_free_over_cents, ship_days, prep_min, pickup_note)
  values (b, true, false, true, true, ${ship}, ${ship ? 799 : 0}, ${ship ? 7500 : 0}, '3-5', 20, ${j(bi("Pasa por la caja con tu número de apartado.", "Stop by the register with your hold number."))}) on conflict (business_id) do nothing;
`;
      const flat = [];
      sections.forEach((s, ssi) => {
        sql += `  insert into item_sections (business_id, module, name, sort) values (b, 'shop', ${j(bi(s.n[0], s.n[1]))}, ${ssi}) returning id into s;\n`;
        s.items.forEach((it, ii) => {
          const tallas = it.u ? null : Z[it.sz];
          if (!it.u && !tallas) throw new Error("talla desconocida " + it.sz);
          const stock = tallas ? tallas.map(() => (r.chance(0.18) ? 0 : r.int(1, 6))) : null;
          if (stock && stock.every((x) => x === 0)) stock[Math.min(2, stock.length - 1)] = 2;
          const f = { ord: flat.length + 1, es: it.es, en: it.en, p: it.p, tallas, stock, unit: "u", tax: taxDe(it), key: "t" };
          flat.push(f);
          const et = tallas ? ETQ[it.sz] : null;
          sql += `  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort, featured, sold_out)
    values (b, 'shop', s, ${j(bi(it.es, it.en))}, ${j(bi(S.dd[0], S.dd[1]))}, ${it.p}, 'u', ${f.tax}, array[${q(photoUrl(it.ph))}]::text[], ${tallas ? "'talla'" : "'unid'"}, false, 0, false, ${et ? j(bi(et[0], et[1])) : "null"}, '{}', false, ${ii}, ${ii === 0 && r.chance(0.5)}, false) returning id into i;\n`;
          if (tallas) tallas.forEach((t, z) => { sql += `  insert into item_variants (item_id, business_id, label, sort, stock_left) values (i, b, ${q(t)}, ${z}, ${stock[z]});\n`; });
        });
      });
      bz.flat = flat; bz.sqlExtra = sql;
      const minP = Math.min(...flat.map((x) => x.p));
      bz.attrs = { m: "shop", hold_hours: hold, tarjeta: { eta: bi(`Aparta ${hold} h · pagas en la caja`, `${hold} h hold · pay at the register`), fee: bi(`${flat[0].es} desde ${money(minP)}`, `${flat[0].en} from ${money(minP)}`) } };
      const prod = !servicio;
      const posts = genNov(r, bz, flat, {
        oferta: prod ? "Hasta el domingo. Aparta en la app y pagas en la caja." : "Promoción hasta el domingo. Aparta en la app y paga en la caja.",
        hoy: (x) => (prod ? `Hoy en la tienda: ${x.es.toLowerCase()}` : `Hoy atendemos: ${x.es.toLowerCase()}`), hoyB: prod ? "Quedan pocas piezas. Apártalo en la app." : "Pasa cuando quieras en horario; también puedes apartar en la app.",
        encuesta: { t: "¿Qué quieres que traigamos?", b: "Vota y lo pedimos para la próxima temporada.", o: ["Más variedad", "Horario más largo", "Promociones de temporada"] },
        avisoT: "cerramos temprano", cupon: { t: "Cupón de seguidores: $5 en tu apartado", b: "Para quien nos sigue: $5 de descuento en compras desde $40.", pref: "TIENDA", off: 500, min: 4000 },
        nov2: prod ? [["Llegó mercancía nueva", "Pasa a verla esta semana."], ["Ahora puedes apartar desde la app", "Elige y recoge en la tienda; no se cobra nada antes."]] : [["Aparta tu servicio desde la app", "Déjalo y recoge cuando esté listo; no se cobra nada antes."], ["Atendemos sin cita", "Pasa cuando quieras en nuestro horario."]],
        nov3: ["Gracias por tantos años con ustedes", "Entre nuestros clientes más fieles sorteamos una tarjeta de regalo."],
      }).slice(0, r.int(4, 6));
      const o1 = flat.find((x) => x.ord === posts[0].it);
      bz.attrs.tarjeta.offer = bi(`${o1.es} desde ${money(posts[0].now)} hasta el domingo`, `${o1.en} from ${money(posts[0].now)} through Sunday`);
      const nOps = r.int(40, 100);
      const ops = genHolds(r, bz, flat, disp, nOps, CONTADOR);
      CONTADOR += ops.length + 3;
      const hechas = ops.filter((o) => o.st === "done").length;
      const nRev = Math.min(40, Math.max(15, Math.round(hechas * r.pick([0.3, 0.4, 0.5]))));
      const T = RES[tipoRes];
      const reviews = genRes(r, ops, nRev, {
        vale: (o) => o.st === "done", srcDe: (o) => (o.co === "envio" ? "dl" : "pk"), recDe: (o) => o.L.slice(0, 2).map((x) => x[0]), nombreDe: (o) => { const x = flat[o.L[0][0] - 1]; return { es: x.es, en: x.en }; },
        resp: (rr, s) => { const a = s >= 5 ? { trato: 1, caja: 1, tenian: 1, guardo: 1, cambio: rr.pick(["ok", "na"]) } : s === 4 ? { trato: 1, caja: 1, tenian: 1, guardo: 1, cambio: "na" } : s === 3 ? { trato: 0, caja: rr.pick([1, 0]), tenian: 0, guardo: 1, cambio: "na" } : { trato: -1, caja: 0, tenian: 0, guardo: 0, cambio: rr.pick(["no", "na"]) };
          if (tallado) a.talla = s >= 5 ? 1 : s === 4 ? rr.pick([1, 0]) : s === 3 ? 0 : -1;
          return a; },
        es: T.es, en: T.en,
        rEs5: ["Gracias por tu reseña. Aquí te esperamos.", "Un gusto atenderte. Vuelve pronto.", "Gracias por tu confianza; se la paso al equipo."], rEs3: T.rEs3, rEn5: ["Thank you for your review. See you soon.", "Our pleasure. Come back soon."], rEn3: T.rEn3,
      });
      bz.hist = { ops, reviews, posts };
      bz.fol.n = Math.min(80, Math.max(15, bz.fol.n));
      negocios.push(bz);
    }
  });
  return negocios;
}

function genHolds(r, b, flat, disp, nOps, base) {
  const maxD = maxDiasDe(b.founded);
  const pick = () => flat[r.int(0, flat.length - 1)];
  const reg = Array.from({ length: 30 }, () => r.int(0, 246));
  const ops = [];
  const MALOS = [["cancelled", "user", "Ya no la necesito."], ["cancelled", "business", "Se vendió en la tienda."], ["declined", null, null], ["expired", null, null], ["expired", null, null, "acc"], ["expired", null, null, "acc"]];
  const num = (k) => `A-${OP_BASE + base + k}`;
  for (let k = 0; k < nOps; k++) {
    let d = k < 14 ? r.int(0, 29) : dias(r, maxD), h, t = 0;
    while (t++ < 14) { const wd = ((new Date(Date.UTC(2026, 10, 17)).getUTCDay() - d) % 7 + 7) % 7; h = b.hours[wd]; if (h.open) break; d += 1; }
    const rg = h.ranges[0].map((x) => Number(x.slice(0, 2)) * 60 + Number(x.slice(3)));
    const m = r.int(rg[0] + 20, Math.max(rg[0] + 21, rg[1] - 60));
    const envio = disp.ship && r.chance(0.2);
    const nL = r.int(1, 3);
    const L = [], used = new Set();
    let sub = 0;
    for (let l = 0; l < nL; l++) {
      const it = pick();
      if (used.has(it.ord)) continue;
      used.add(it.ord);
      const qty = r.pick([1, 1, 1, 2]);
      const lab = it.tallas ? r.pick(it.tallas) : null;
      L.push([it.ord, qty, it.p, lab, it.tax]);
      sub += qty * it.p;
    }
    const tax = Math.round(L.reduce((s, x) => s + (x[1] * x[2] * x[4]) / 100, 0));
    const dlv = envio ? (sub >= 7500 ? 0 : 799) : 0;
    const bad = r.chance(0.12) ? r.pick(MALOS) : null;
    const op = { q: base + k, n: num(k), d, m, u: r.chance(0.45) ? r.pick(reg) : r.int(0, 246), co: envio ? "envio" : "tienda", st: bad ? bad[0] : "done", sub: sub + tax, dlv, tot: sub + tax + dlv, pm: envio ? "a" : "l", L };
    if (bad && bad[1]) { op.cb = bad[1]; op.cr = bad[2]; }
    if (bad && bad[3]) op.acc = true;
    if (bad && bad[0] === "declined") op.sd = "sin_existencia";
    if (bad && bad[0] === "expired" && !bad[3]) op.sd = "sin_respuesta";
    const dia = new Date(Date.UTC(2026, 10, 17) - d * 864e5).toISOString().slice(0, 10);
    if (!envio) op.det = { dia, hora: m };
    else op.det = { to: { label: "casa", street: `${r.int(2, 98) * 10 + 1} ${r.pick(["N Church St", "W 4th St", "Maple Ave", "Oak St", "Linden St"])}`, apt: null, zip: b.addr.zip }, ship: true, ship_days: "3-5", tracking: "https://tools.usps.com/go/TrackConfirmAction?tLabels=9400111" };
    if (op.pm === "a") { op.br = r.pick(["visa", "visa", "mastercard", "amex"]); op.l4 = r.pick(["4242", "4444", "0005", "1881", "9424"]); }
    ops.push(op);
  }
  for (let k = 0; k < r.int(1, 3); k++) {
    const it = pick(), idx = ops.length;
    ops.push({ q: base + idx, n: num(idx), d: 0, m: 720, fut: 1, u: r.int(0, 246), co: "tienda", st: "confirmed", sub: it.p, dlv: 0, tot: it.p, pm: "l", L: [[it.ord, 1, it.p, it.tallas ? it.tallas[Math.min(2, it.tallas.length - 1)] : null, it.tax]], det: { dia: new Date(Date.UTC(2026, 10, 18)).toISOString().slice(0, 10), hora: 720 } });
  }
  return ops;
}
