/* R2 · FOOD · armado de menús: grupos de opciones propios, lectura de los catálogos de platos (platos-a/b/c) y de las cocinas de la ronda 1,
   y una variación por negocio (precios ±6 % y algunos platos menos) para que ningún menú sea copia exacto de otro. */
import { GRUPOS, COCINAS, SEC, FOTOS } from "../a/food-menu.mjs";
import { A } from "./platos-a.mjs";
import { B } from "./platos-b.mjs";
import { C } from "./platos-c.mjs";

export const CATALOGO = { ...A, ...B, ...C };

const O = (...a) => a.map(([es, en, c]) => [es, en, c ?? 0]);
/* Grupos de opciones propios de esta ronda. n = [es, en]; o = [es, en, centavos]. */
export const CG = {
  pan: { n: ["Pan", "Bread"], req: true, max: 1, o: O(["Blanco", "White"], ["Integral", "Whole wheat", 50], ["Baguette", "Baguette", 75]) },
  leche: { n: ["Leche", "Milk"], req: false, max: 1, o: O(["Entera", "Whole"], ["De avena", "Oat", 60], ["De almendra", "Almond", 60], ["Sin lactosa", "Lactose-free", 50]) },
  tamC: { n: ["Tamaño", "Size"], req: true, max: 1, o: O(["Chico", "Small"], ["Mediano", "Medium", 100], ["Grande", "Large", 200]) },
  masa: { n: ["Masa", "Dough"], req: true, max: 1, o: O(["Maíz", "Corn"], ["Arroz", "Rice", 25]) },
  acomp: { n: ["Acompañante", "Side"], req: true, max: 1, o: O(["Papas fritas", "Fries"], ["Ensalada", "Salad"], ["Yuca frita", "Fried yuca", 100], ["Arroz y frijoles", "Rice and beans", 100]) },
  cocc: { n: ["Término", "Doneness"], req: true, max: 1, o: O(["Jugoso", "Medium rare"], ["Término medio", "Medium"], ["Tres cuartos", "Medium well"], ["Bien cocido", "Well done"]) },
  protC: { n: ["Proteína", "Protein"], req: true, max: 1, o: O(["Pollo", "Chicken"], ["Res", "Beef", 100], ["Cerdo", "Pork"], ["Camarón", "Shrimp", 300], ["Tofu", "Tofu"]) },
  salsaW: { n: ["Salsa", "Sauce"], req: true, max: 1, o: O(["BBQ", "BBQ"], ["Búfalo", "Buffalo"], ["Miel y ajo", "Honey garlic"], ["Mango picante", "Spicy mango"], ["Limón y pimienta", "Lemon pepper"]) },
  sabH: { n: ["Sabor", "Flavor"], req: true, max: 1, o: O(["Vainilla", "Vanilla"], ["Chocolate", "Chocolate"], ["Fresa", "Strawberry"], ["Coco", "Coconut"], ["Mango", "Mango"], ["Dulce de leche", "Dulce de leche", 25]) },
  topH: { n: ["Cubierta", "Toppings"], req: false, max: 3, o: O(["Salsa de chocolate", "Chocolate sauce", 50], ["Chispas de colores", "Sprinkles", 25], ["Crema batida", "Whipped cream", 50], ["Cereza", "Cherry", 25]) },
  sabJ: { n: ["Fruta", "Fruit"], req: true, max: 1, o: O(["Fresa", "Strawberry"], ["Mango", "Mango"], ["Piña", "Pineapple"], ["Maracuyá", "Passion fruit"]) },
  sabP: { n: ["Sabor del pastel", "Cake flavor"], req: true, max: 1, o: O(["Vainilla", "Vanilla"], ["Chocolate", "Chocolate"], ["Tres leches", "Tres leches", 400], ["Zanahoria", "Carrot", 300]) },
  tamP: { n: ["Tamaño del pastel", "Cake size"], req: true, max: 1, o: O(["Para 12 personas", "Serves 12"], ["Para 24 personas", "Serves 24", 3500], ["Para 40 personas", "Serves 40", 7500]) },
  rellP: { n: ["Relleno", "Filling"], req: true, max: 1, o: O(["Ganache", "Ganache"], ["Dulce de leche", "Dulce de leche"], ["Crema pastelera", "Pastry cream"], ["Fresa", "Strawberry", 200]) },
  tamP2: { n: ["Tamaño", "Size"], req: true, max: 1, o: O(["Mediana 12\"", "Medium 12\""], ["Grande 16\"", "Large 16\"", 400], ["Familiar 20\"", "Family 20\"", 900]) },
  boba: { n: ["Agrégale", "Add-ins"], req: false, max: 2, o: O(["Perlas de tapioca", "Tapioca pearls", 75], ["Gelatina de coco", "Coconut jelly", 75], ["Popping boba", "Popping boba", 75]) },
  bartInv: { n: ["Invitados", "Guests"], req: true, max: 1, o: O(["Hasta 30", "Up to 30"], ["Hasta 60", "Up to 60", 12000], ["Hasta 100", "Up to 100", 25000]) },
  bartExtra: { n: ["Extras", "Extras"], req: false, max: 3, o: O(["Cristalería", "Glassware", 6500], ["Hielo para el evento", "Event ice", 9500], ["Menú impreso", "Printed menu", 4000]) },
};

const defGrupo = (k, cocina) => CG[k] ?? (k === "carne" && cocina ? { n: GRUPOS.carne.n, req: true, max: 1, o: cocina.carne } : GRUPOS[k]);

const SECX = (s) => { const [es, en] = s.split(" / "); return [es, en ?? es]; };
const precio = (s) => Math.round(parseFloat(s) * 100);
const split = (s) => (s ? s.split(",") : []);

/* Catálogo propio → secciones { k, n, avail, items[] }. */
function deCatalogo(clave) {
  const cat = CATALOGO[clave];
  if (!cat) throw new Error("catálogo sin definir: " + clave);
  return Object.entries(cat.sec).map(([nombre, txt], si) => ({
    k: "s" + si, n: SECX(nombre), avail: "siempre",
    items: txt.split("\n").filter(Boolean).map((l, ii) => {
      const [es, en, de, den, p, ph, g, t] = l.split("|");
      if (es.length > 60) throw new Error("nombre largo: " + es);
      return { es, en, de, den, p: precio(p), ph: cat.ph[Number(ph) % cat.ph.length], g: split(g), t: split(t), feat: si < 2 && ii === 0, svc: nombre.startsWith("Servicios") };
    }),
  }));
}

/* Cocina de la ronda 1 → secciones. take = { sección: cuántos } (omitida = todas); lista de secciones en orden. */
function deCocina(ck, take) {
  const c = COCINAS[ck];
  const orden = take ? Object.keys(take) : ["des", "alm", "sop", "ant", "lad", "pos", "beb"];
  const out = [];
  for (const s of orden) {
    const its = c.platos.filter((x) => x.sec === s).slice(0, take?.[s] ?? 99);
    if (its.length) out.push({ k: s, n: SEC[s], avail: "siempre", items: its.map((x, ii) => ({ es: x.es, en: x.en, de: x.de, den: x.den, p: x.p, ph: x.ph, g: x.g.slice(), t: x.t.slice(), feat: out.length < 2 && ii === 0 })) });
  }
  return { sections: out, cocina: c };
}

/* Combos para cocina solo-entrega y camión: se arman con los platos fuertes de la propia cocina. */
function combos(sections, kind) {
  const alm = (sections.find((s) => s.k === "alm") ?? sections[0]).items;
  const a = alm[0], b = alm[1] ?? alm[0], c = alm[2] ?? alm[0];
  const r5 = (x) => Math.round(x / 5) * 5;
  if (kind === "dark") {
    return { k: "combo", n: ["Combos para compartir", "Combos to share"], avail: "siempre", items: [
      { es: "Combo para 2", en: "Combo for 2", de: `${a.es} y ${b.es}, con dos bebidas.`, den: `${a.en} and ${b.en}, with two drinks.`, p: r5((a.p + b.p) * 0.92) + 700, ph: a.ph, g: [], t: [], feat: true },
      { es: "Combo familiar para 4", en: "Family combo for 4", de: `${a.es}, ${b.es}, ${c.es} y cuatro bebidas.`, den: `${a.en}, ${b.en}, ${c.en} and four drinks.`, p: r5((a.p + b.p + c.p) * 1.35) + 900, ph: b.ph, g: [], t: [], feat: false },
      { es: "Combo oficina para 6", en: "Office combo for 6", de: "Seis platos individuales empacados, con bebida.", den: "Six individually packed meals, with a drink.", p: r5(a.p * 6 * 0.88), ph: c.ph, g: [], t: [], feat: false },
    ] };
  }
  return { k: "combo", n: ["Combo del camión", "Truck combo"], avail: "siempre", items: [
    { es: "Combo del día", en: "Combo of the day", de: `${a.es} con bebida y acompañante.`, den: `${a.en} with a drink and a side.`, p: r5(a.p + 450), ph: a.ph, g: [], t: [], feat: true },
    { es: "Combo para dos", en: "Combo for two", de: `${a.es} y ${b.es}, con dos bebidas.`, den: `${a.en} and ${b.en}, with two drinks.`, p: r5((a.p + b.p) * 0.95 + 400), ph: b.ph, g: [], t: [], feat: false },
  ] };
}

/* Variación por negocio: precios ±6 % (a múltiplos de 5 centavos) y hasta ~18 % de platos menos (nunca vacía una sección). */
function variar(sections, r) {
  const out = [];
  for (const s of sections) {
    const keep = s.items.filter((it, i) => i === 0 || it.feat || r() > 0.18);
    out.push({ ...s, items: keep.map((it) => ({ ...it, p: it.p === 0 ? 0 : Math.max(5, Math.round((it.p * (0.94 + r() * 0.12)) / 5) * 5) })) });
  }
  return out;
}

/* kind del menú: { cat } catálogo propio · { cocina, take?, combo? } cocina de la ronda 1. Devuelve { sections, defs }. */
export function armarMenu(def, ck, r) {
  let sections, cocina = null;
  if (def.cat) sections = deCatalogo(def.cat);
  else {
    const x = deCocina(ck, def.take);
    sections = x.sections; cocina = x.cocina;
    if (def.combo) sections.push(combos(sections, def.combo));
  }
  sections = variar(sections, r);
  const defs = {};
  for (const s of sections) for (const it of s.items) for (const k of it.g) { if (!defs[k]) { defs[k] = defGrupo(k, cocina); if (!defs[k]) throw new Error("grupo sin definir: " + k); } }
  return { sections, defs, cocina };
}
export { FOTOS };
