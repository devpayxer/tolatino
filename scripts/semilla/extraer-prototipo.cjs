// Extrae los negocios del prototipo → JSON normalizado para la semilla del sandbox (decisión I).
const vm = require("node:vm"), fs = require("node:fs"), path = require("node:path");
const [dir, orden, taxo, salida] = process.argv.slice(2);
const store = {}; const win = { localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
  addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
  matchMedia: () => ({ matches: false, addEventListener() {} }), location: { href: "", search: "", hash: "" }, navigator: { userAgent: "node" },
  console: { log() {}, warn() {}, error() {}, info() {} }, Date, Math, JSON, Object, Array, String, Number, Promise, Map, Set, Intl, RegExp, Error, parseInt, parseFloat, isNaN, encodeURIComponent, decodeURIComponent };
win.window = win; win.self = win; win.globalThis = win;
win.document = { createElement: () => ({ style: {}, appendChild() {}, setAttribute() {} }), head: { appendChild() {} }, body: { appendChild() {} }, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener() {} };
const ctx = vm.createContext(win);
for (const f of fs.readFileSync(orden, "utf8").split("\n").filter(Boolean)) vm.runInContext(fs.readFileSync(path.join(dir, f), "utf8"), ctx, { filename: f, timeout: 5000 });

const CATS = { TLFood: "NEG-FOOD", TLBeauty: "NEG-BELL", TLAuto: "NEG-AUTO", TLHogar: "NEG-HOGAR", TLSalud: "NEG-SALUD", TLPro: "NEG-PRO", TLFiesta: "NEG-FIESTA", TLMerc: "NEG-MERC", TLNoche: "NEG-NOCHE", TLTienda: "NEG-TIENDA", TLTrans: "NEG-TRANS", TLEdu: "NEG-EDU", TLNinos: "NEG-NINOS", TLDeporte: "NEG-DEPORTE", TLFe: "NEG-FE", TLInmueble: "NEG-INMUEBLE", TLDealer: "NEG-DEALER" };
const tax = JSON.parse(fs.readFileSync(taxo, "utf8"));
const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/&/g, " y ").replace(/[^a-z0-9 ]/g, " ").replace(/ y /g, " ").replace(/\s+/g, " ").trim();
const subIdx = {}; for (const c of tax) { subIdx[c.id] = c.subcategorias.map(s => ({ id: s.id, k: [norm(s.es), norm(s.en)] })); }
const findSub = (cat, name) => {
  const n = norm(name); const L = subIdx[cat] || [];
  return (L.find(s => s.k.includes(n)) || L.find(s => s.k.some(k => k.startsWith(n) || n.startsWith(k))) || L.find(s => s.k.some(k => k.includes(n) || n.includes(k))))?.id || null;
};
const llAll = {}; for (const b of win.TLAll.B) if (b._ll) llAll[b.id] = b._ll;
const C = win.TLContact, CITY = win.TLCity;
let fic = 100; const telFic = () => `+1570555${String(0 + (fic++ % 100)).padStart(4, "01")}`.replace(/^(\+1570555)0?(\d{4})$/, (m, a, b) => a + "01" + b.slice(-2));
const CORE = new Set("id name pro verified subs tags r n d open st stEn ph photos eta etaEn fee feeEn offer offerEn hrs sat sun closed days addr zone yrs catEn cat k demo at".split(" "));
const out = [], sinSub = [], vistos = new Set();
const h2t = h => { const H = Math.floor(h) % 24, M = Math.round((h - Math.floor(h)) * 60); return `${String(H).padStart(2, "0")}:${String(M).padStart(2, "0")}`; };
for (const [obj, cat] of Object.entries(CATS)) {
  for (const b of win[obj].B) {
    if (vistos.has(b.id)) continue; vistos.add(b.id);
    const subs = []; for (const s of b.subs || []) { const id = findSub(cat, s); if (id && !subs.includes(id)) subs.push(id); else if (!id) sinSub.push(`${cat} · ${b.name} · «${s}»`); }
    let ll = llAll[b.id] || b._ll || null;
    if (!ll && CITY.pos) { try { const p = CITY.pos(b); if (p && p.length === 2) ll = p; } catch (e) {} }
    const horas = []; for (let d = 0; d < 7; d++) {
      const cerrado = (b.closed || []).includes(d) || (d === 0 && b.sun === null && !b.hrs);
      const r = d === 6 && b.sat ? b.sat : d === 0 && b.sun ? b.sun : b.hrs;
      horas.push(cerrado || !r ? { weekday: d, open: false, ranges: [] } : { weekday: d, open: true, ranges: [[h2t(r[0]), h2t(r[1])]] });
    }
    const attrs = {}; for (const [k, v] of Object.entries(b)) if (!CORE.has(k) && !k.startsWith("_") && typeof v !== "function") attrs[k] = v;
    attrs.tarjeta = { eta: b.eta && { es: b.eta, en: b.etaEn || b.eta }, fee: b.fee && { es: b.fee, en: b.feeEn || b.fee }, offer: b.offer && { es: b.offer, en: b.offerEn || b.offer } };
    let addr = null; try { addr = b.addr ? `${b.addr}, Hazleton PA` : C.addr(b); } catch (e) {}
    out.push({ id: b.id, category_id: cat, name: b.name, subcategory_ids: subs, plan: b.pro ? "pro" : "free", verified: !!b.verified,
      rating_avg: b.r ?? null, review_count: b.n ?? 0, filter_values: b.tags || [], address: addr, geo: ll, phone: telFic(),
      founded_year: b.yrs ? 2026 - b.yrs : null, photos: (b.ph || []).map(id => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg`),
      hours: horas, category_attrs: attrs });
  }
}
fs.writeFileSync(salida, JSON.stringify(out, null, 1));
console.log(`negocios: ${out.length} · sin coordenadas: ${out.filter(x => !x.geo).length} · sin subcategoría: ${out.filter(x => !x.subcategory_ids.length).length} · subcategorías no encontradas: ${sinSub.length}`);
console.log(sinSub.slice(0, 25).join("\n"));
const porCat = {}; for (const x of out) porCat[x.category_id] = (porCat[x.category_id] || 0) + 1; console.log(JSON.stringify(porCat));
console.log("pro:", out.filter(x => x.plan === "pro").length, "verificados:", out.filter(x => x.verified).length, "tel muestra:", out.slice(0, 3).map(x => x.phone));
