// Extrae del prototipo la configuración de la PÁGINA de cada categoría (APP-NEG-CAT): portada, buscador,
// filas de subcategorías, capítulos «Qué se te antoja», filtros y filtros rápidos. Es configuración del producto
// (no datos de ejemplo): va a packages/taxonomy/paginas.json → semilla repetible del catálogo (la gobierna el Super Admin).
// Uso: node scripts/catalogo/extraer-paginas.cjs <dir-prototype> <orden.txt> <Prototipo.dc.html> <categorias.json> <salida.json>
const vm = require("node:vm"), fs = require("node:fs"), path = require("node:path");
const [dir, orden, dcHtml, taxo, salida] = process.argv.slice(2);
const store = {}; const win = { localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
  addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
  matchMedia: () => ({ matches: false, addEventListener() {} }), location: { href: "", search: "", hash: "" }, navigator: { userAgent: "node" },
  console: { log() {}, warn() {}, error() {}, info() {} }, Date, Math, JSON, Object, Array, String, Number, Promise, Map, Set, Intl, RegExp, Error, parseInt, parseFloat, isNaN, encodeURIComponent, decodeURIComponent };
win.window = win; win.self = win; win.globalThis = win;
win.document = { createElement: () => ({ style: {}, appendChild() {}, setAttribute() {} }), head: { appendChild() {} }, body: { appendChild() {} }, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener() {} };
const ctx = vm.createContext(win);
for (const f of fs.readFileSync(orden, "utf8").split("\n").filter(Boolean)) vm.runInContext(fs.readFileSync(path.join(dir, f), "utf8"), ctx, { filename: f, timeout: 5000 });
// Comida vive en el script principal del prototipo (constantes NGROUPS…SUBPH).
const html = fs.readFileSync(dcHtml, "utf8"); const sc = html.slice(html.indexOf("data-dc-script"));
const a = sc.indexOf("const NGROUPS"), b = sc.indexOf(";", sc.indexOf("const SUBPH")) + 1;
const CSUB = vm.runInContext(sc.slice(sc.indexOf("const CSUB"), sc.indexOf("};", sc.indexOf("const CSUB")) + 2) + "\nCSUB", ctx);
const food = vm.runInContext(sc.slice(a, b).replace(/let subTile;/, "") + "\n({ NGROUPS, QUICK, QL, SUBG, SUBPH, SUBFL, SL })", ctx);

const CATS = { TLFood: "NEG-FOOD", TLBeauty: "NEG-BELL", TLAuto: "NEG-AUTO", TLHogar: "NEG-HOGAR", TLSalud: "NEG-SALUD", TLPro: "NEG-PRO", TLFiesta: "NEG-FIESTA", TLMerc: "NEG-MERC", TLNoche: "NEG-NOCHE", TLTienda: "NEG-TIENDA", TLTrans: "NEG-TRANS", TLEdu: "NEG-EDU", TLNinos: "NEG-NINOS", TLDeporte: "NEG-DEPORTE", TLFe: "NEG-FE", TLInmueble: "NEG-INMUEBLE", TLDealer: "NEG-DEALER" };
const tax = JSON.parse(fs.readFileSync(taxo, "utf8"));
const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/&/g, " y ").replace(/[^a-z0-9 ]/g, " ").replace(/ y /g, " ").replace(/\s+/g, " ").trim();
const subIdx = {}, subNom = {}; for (const c of tax) { subIdx[c.id] = c.subcategorias.map(s => ({ id: s.id, k: [norm(s.es), norm(s.en)] })); for (const s of c.subcategorias) subNom[s.id] = { es: s.es, en: s.en }; }
const faltan = [], sinRegla = [], sinEjemplo = [];
const findSub = (cat, name) => {
  const n = norm(name); const L = subIdx[cat] || [];
  const id = (L.find(s => s.k.includes(n)) || L.find(s => s.k.some(k => k.startsWith(n) || n.startsWith(k))) || L.find(s => s.k.some(k => k.includes(n) || n.includes(k))))?.id || null;
  if (!id) faltan.push(`${cat} · «${name}»`);
  return id;
};
const px = id => (id ? `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg` : null);
const bi = v => (Array.isArray(v) ? { es: v[0], en: v[1] ?? v[0] } : v ? { es: v, en: v } : null);
const out = [];
for (const [obj, cat] of Object.entries(CATS)) {
  const D = win[obj]; const ALT = cat !== "NEG-FOOD";
  const C = ALT ? { GROUPS: D.GROUPS, QUICK: D.QUICK, QL: D.QL, SUBG: D.SUBG, SUBPH: D.SUBPH || {}, FL: {} } : { GROUPS: D.GROUPS || food.NGROUPS, QUICK: D.QUICK || food.QUICK, QL: food.QL, SUBG: food.SUBG, SUBPH: food.SUBPH, FL: food.SUBFL };
  const LB = D.LBL || D.WHO || {};
  const subName = x => (LB[x] ? { es: LB[x][0], en: LB[x][1] } : null);
  const inSub = (b, x) => (D.inSub ? D.inSub(b, x) : cat === "NEG-BELL" && D.WHO && D.WHO[x] ? (b.who || []).includes(D.WHO[x][2]) : (b.subs || []).includes(x));
  // Cada mosaico es una REGLA de coincidencia (subcategorías, etiqueta, atributo o capacidad). Se prueban candidatas y
  // se queda la que reproduce exactamente D.inSub del prototipo sobre TODOS sus negocios; si ninguna, se detiene.
  const arrKeys = [...new Set(D.B.flatMap(b => Object.keys(b).filter(k => Array.isArray(b[k]) && !["subs", "tags", "ph", "photos", "hrs", "sat", "sun", "closed", "days"].includes(k))))];
  const evalRegla = (r, b) => {
    const subs = b.subs || [], tags = b.tags || [];
    if (r.subs && !subs.some(x => r.subs.includes(x))) return false;
    if (r.tag && !tags.includes(r.tag)) return false;
    if (r.attr && !(b[r.attr] || []).includes(r.value)) return false;
    if (r.cap_gte != null && !(b.cap == null || b.cap >= r.cap_gte)) return false;
    return true;
  };
  const regla = x => {
    const t = LB[x] ? LB[x][2] : undefined, cands = [];
    if (Array.isArray(t)) cands.push({ subs: t }, { tag: "h24", subs: t });
    if (typeof t === "string") { cands.push({ tag: t }); for (const k of arrKeys) cands.push({ attr: k, value: t }); }
    if (typeof t === "number") cands.push({ cap_gte: t });
    cands.push({ tag: x }, { subs: [x] });
    const ok = cands.find(r => D.B.every(b => evalRegla(r, b) === !!inSub(b, x)) && D.B.some(b => evalRegla(r, b)));
    const fin = ok || [{ subs: [x] }, ...cands].find(r => D.B.every(b => evalRegla(r, b) === !!inSub(b, x)));
    if (!fin) { sinRegla.push(`${cat} · ${x}`); return null; }
    if (!ok) sinEjemplo.push(`${cat} · ${x}`);
    const r = { ...fin }; if (r.subs) r.subs = r.subs.map(n => findSub(cat, n)).filter(Boolean);
    return r;
  };
  const tile = x => {
    const ph = C.SUBPH[x] || (ALT ? D.hero : 39143744);
    const m = regla(x);
    // Mosaico = una subcategoría: su nombre sale de la taxonomía (ES/EN); si no, la etiqueta del prototipo.
    const label = subName(x) || (m && m.subs && m.subs.length === 1 && Object.keys(m).length === 1 ? subNom[m.subs[0]] : null) || bi(x);
    return { key: x, label, match: m, photo: px(ph), flag: C.FL[x] || null };
  };
  const rowsSrc = D.ROWS || [[C.SUBG[0][0], cat === "NEG-BELL" ? "Para quién" : "Por país", C.SUBG[0][2], cat === "NEG-BELL" ? "For whom" : "By country", "ph"]];
  const rows = rowsSrc.map((r, i) => ({ key: r[0], title: { es: r[1], en: r[3] }, kind: r[4] === "chip" ? "chip" : "photo", all_first: i === 0 && r[4] !== "chip",
    all_photo: i === 0 && r[4] !== "chip" ? px(C.SUBPH.all || (ALT ? D.hero : 39143744)) : null,
    items: r[2].map(tile), more: r[5] ? r[5].map(tile) : [], more_label: r[6] ? bi(r[6]) : null }));
  const chapters = (D.ROWS ? C.SUBG : C.SUBG.slice(1)).map(g => ({ key: g[0], title: { es: g[1], en: g[3] }, items: g[2].map(tile) }));
  const groups = (C.GROUPS || []).map(([te, tn, kind, opts]) => ({ key: norm(te).replace(/ /g, "_"), title: { es: te, en: tn }, kind, options: opts.map(([k, le, ln]) => ({ key: k, label: { es: le, en: ln } })) }));
  const quick5 = (ALT ? D.QUICK5 : [["open", "clock"], ["delivery", "truck"], ["pickup", "bag"], ["verified", "shield"], ["r45", "star"]]).map(([k, icon]) => ({ key: k, icon, label: bi(C.QL[k]) }));
  out.push({ id: cat,
    title: ALT ? bi(D.title) : { es: "Comida y Bebidas", en: "Food and Drinks" },
    subs_line: bi(CSUB[cat]), // línea de la tarjeta de categoría en Negocios (APP-NEG-HOME)
    hero: px(ALT ? D.hero : 38330332),
    search_ph: ALT ? bi(D.searchPh) : { es: "Mofongo, pan de agua, tacos…", en: "Mofongo, pan de agua, tacos…" },
    craving: D.crav ? bi(D.crav) : cat === "NEG-BELL" ? { es: "Qué te quieres hacer", en: "What do you want done" } : { es: "Qué se te antoja", en: "What are you craving" },
    stats_tag: ALT ? D.statsTag : "delivery", stats_label: ALT ? bi(D.statsK) : { es: "CON DELIVERY", en: "WITH DELIVERY" },
    band: D.band ? { title: bi(D.band.t), sub: bi(D.band.sub), cta: bi(D.band.cta), sub_key: D.band.sub2 || null, match: D.band.sub2 ? regla(D.band.sub2) : null, code: D.band.code || null } : null,
    map_label: D.mapL ? bi(D.mapL) : { es: "negocios de comida en el mapa", en: "food businesses on the map" },
    rows, chapters, groups, quick5 });
}
fs.writeFileSync(salida, JSON.stringify(out, null, 1) + "\n");
console.log(`categorías: ${out.length} · subcategorías sin casar: ${new Set(faltan).size} · mosaicos sin regla: ${sinRegla.length}`);
console.log(`mosaicos sin ningún negocio de ejemplo (regla no comprobable): ${new Set(sinEjemplo).size}\n` + [...new Set(sinEjemplo)].join("\n"));
if (sinRegla.length) { console.log(sinRegla.join("\n")); process.exitCode = 1; }
console.log([...new Set(faltan)].join("\n"));
