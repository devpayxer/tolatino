/* To'Latino · motor de búsqueda del prototipo (APP-BUSCAR). Lee los datos ya cargados (TLAll, TLMenu, *L.SVC, TLEvt, TLCom).
   Entiende intención ("sin cita", "abierto ahora", "Medicaid", "esta noche"), sinónimos ES/EN, plurales y un error de tecleo. */
(function () {
  const N = s => { s = String(s == null ? '' : s); let o = ''; for (let i = 0; i < s.length; i++) { const c = s[i].normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); o += c.length === 1 ? c : (c[0] || ' '); } return o; };
  const W = n => n.split(/[^a-z0-9]+/).filter(Boolean);
  const F = s => { const n = N(s); return { n, w: W(n) }; };
  const lev = (a, b) => { if (Math.abs(a.length - b.length) > 2) return 9; const m = []; for (let i = 0; i <= a.length; i++) m[i] = [i]; for (let j = 1; j <= b.length; j++) m[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return m[a.length][b.length]; };
  const PH = (id, h) => id ? 'https://images.pexels.com/photos/' + id + '/pexels-photo-' + id + '.jpeg?auto=compress&cs=tinysrgb&h=' + (h || 260) : '';
  const unurl = u => u ? String(u).replace(/^url\((.*)\)$/, '$1') : '';

  const CATS = [
    ['NEG-FOOD', 'TLFood', 'TLFood', 'Comida y Bebidas', 'Food and Drinks', 'restaurant', 'Comida', 'Food'],
    ['NEG-BELL', 'TLBeauty', 'TLBeauty', 'Belleza y Salud', 'Beauty and Health', 'scissors', 'Belleza', 'Beauty'],
    ['NEG-AUTO', 'TLAuto', 'TLAuto', 'Servicios de Auto', 'Auto Services', 'car', 'Auto', 'Auto'],
    ['NEG-HOGAR', 'TLHogar', 'TLHogar', 'Servicios del Hogar', 'Home Services', 'wrench', 'Hogar', 'Home'],
    ['NEG-NOCHE', 'TLNoche', 'TLNoche', 'Vida Nocturna', 'Night Life', 'drink', 'Noche', 'Nightlife'],
    ['NEG-MERC', 'TLMerc', 'TLMerc', 'Mercados y Bodegas', 'Markets and Bodegas', 'cart', 'Mercados', 'Markets'],
    ['NEG-FIESTA', 'TLFiesta', 'TLFiesta', 'Fiestas y Celebraciones', 'Party and Celebrations', 'party', 'Fiestas', 'Parties'],
    ['NEG-SALUD', 'TLSalud', 'TLSalud', 'Doctores y Medicina', 'Doctors and Medicine', 'medical', 'Salud', 'Health'],
    ['NEG-PRO', 'TLPro', 'TLPro', 'Servicios Profesionales', 'Professional Services', 'brief', 'Trámites', 'Paperwork'],
    ['NEG-TIENDA', 'TLTienda', 'TLTiendaB', 'Tiendas', 'Shops & Stores', 'bag', 'Tiendas', 'Shops'],
    ['NEG-TRANS', 'TLTrans', 'TLTrans', 'Transporte', 'Transportation', 'truck', 'Transporte', 'Transport'],
    ['NEG-EDU', 'TLEdu', 'TLEdu', 'Cursos y Educación', 'Courses & Education', 'grid', 'Cursos', 'Classes'],
    ['NEG-NINOS', 'TLNinos', 'TLNinos', 'Niños', 'Children', 'smile', 'Niños', 'Kids'],
    ['NEG-DEPORTE', 'TLDeporte', 'TLDeporte', 'Vida Activa y Deporte', 'Active Life & Sport', 'bolt', 'Deporte', 'Sports'],
    ['NEG-FE', 'TLFe', 'TLFe', 'Iglesias y Religión', 'Churches & Religion', 'building', 'Iglesias', 'Churches'],
    ['NEG-INMUEBLE', 'TLInmueble', 'TLInmueble', 'Bienes Raíces', 'Real Estate', 'key', 'Vivienda', 'Housing'],
    ['NEG-DEALER', 'TLDealer', 'TLDealer', 'Venta de Autos', 'Car Dealers', 'car', 'Carros', 'Cars'],
  ].map(([k, d, b, es, en, icon, s, se]) => ({ k, d, b, es, en, icon, s, se }));
  const CAT = {}; CATS.forEach(c => { CAT[c.k] = c; });

  const SYN = {
    nails: ['unas'], manicure: ['unas'], manicura: ['unas'], pedicure: ['unas', 'pedicura'], mani: ['unas'], pedi: ['unas'],
    barber: ['barberia', 'barbero'], barbero: ['barberia'], barbershop: ['barberia'], haircut: ['corte'], recorte: ['corte'], pelado: ['corte'], pelo: ['cabello', 'corte'], hair: ['cabello', 'corte'], peluqueria: ['salon', 'barberia'], beauty: ['belleza', 'salon'], braids: ['trenzas'], lashes: ['pestanas'], eyebrows: ['cejas'], makeup: ['maquillaje'], tattoo: ['tatuaje'],
    dentist: ['dental', 'dentista'], dentista: ['dental'], muela: ['dental', 'muela'], dientes: ['dental'], diente: ['dental'], teeth: ['dental'], doctor: ['medicina', 'medico', 'doctor'], medico: ['medicina', 'medico'], clinic: ['clinica'], pediatra: ['pediatria'], pediatrician: ['pediatria'], eye: ['optica', 'vista'], glasses: ['optica', 'lentes'], lentes: ['optica'], therapist: ['consejeria', 'terapia'], psicologo: ['consejeria', 'psicolog'],
    mechanic: ['taller', 'mecanica'], mecanico: ['taller', 'mecanica'], brakes: ['frenos'], oil: ['aceite'], tires: ['gomas', 'llantas'], tire: ['gomas', 'llantas'], llantas: ['gomas', 'llantas'], gomera: ['gomas'], carwash: ['lavado'], wash: ['lavado'], tow: ['grua'], inspection: ['inspeccion'],
    plumber: ['plomeria', 'plomero'], plomero: ['plomeria'], electrician: ['electricista'], heater: ['calentador'], boiler: ['caldera'], handyman: ['multiservicios', 'arreglos'], roof: ['techo'], cleaning: ['limpieza'], snow: ['nieve'], painter: ['pintura'], pintor: ['pintura'],
    lawyer: ['abogado', 'abogada'], attorney: ['abogado', 'abogada'], abogada: ['abogado'], immigration: ['inmigracion'], notary: ['notario', 'notaria'], taxes: ['impuestos', 'taxes'], tax: ['impuestos', 'taxes'], translation: ['traduccion'], translator: ['traduccion'],
    bakery: ['panaderia'], bread: ['pan', 'panaderia'], pan: ['panaderia'], cake: ['bizcocho', 'pastel', 'reposteria'], pastel: ['bizcocho', 'reposteria'], torta: ['bizcocho', 'torta'], cakes: ['bizcocho', 'reposteria'],
    church: ['iglesia'], mass: ['misa'], service: ['culto'], pantry: ['despensa'], funeral: ['funeraria'],
    daycare: ['guarderia'], babysitter: ['guarderia', 'ninera'], ninera: ['guarderia'], kids: ['ninos'], children: ['ninos'], swim: ['natacion'], swimming: ['natacion'],
    gym: ['gimnasio'], soccer: ['futbol'], boxing: ['boxeo'],
    apartment: ['apartamento'], apto: ['apartamento'], room: ['cuarto'], rent: ['renta'], house: ['casa'], realtor: ['bienes raices'],
    club: ['discoteca'], disco: ['discoteca'], bar: ['bar'], dance: ['baile'], nightclub: ['discoteca'],
    grocery: ['supermercado', 'bodega'], colmado: ['bodega', 'colmado'], butcher: ['carniceria'], meat: ['carne'], fish: ['pescado', 'pescaderia'], plantain: ['platano'], plantains: ['platano'],
    clothes: ['ropa'], sneakers: ['tenis'], shoes: ['zapatos', 'tenis'], phone: ['celular'], celulares: ['celular'], furniture: ['muebles'], jewelry: ['joyeria'],
    ny: ['nueva york'], airport: ['aeropuerto'], box: ['caja'], moving: ['mudanza'], movers: ['mudanza'], ride: ['viaje'],
    english: ['ingles'], citizenship: ['ciudadania'], driving: ['manejo'], tutor: ['tutoria', 'tareas'], homework: ['tareas'],
    quince: ['quinceanera'], quinceanera: ['quinceanera'], wedding: ['boda'], bounce: ['brincolin'], balloons: ['globos'], venue: ['salon'], hall: ['salon'], photographer: ['fotografo', 'fotografia'],
    chicken: ['pollo'], food: ['comida'], lunch: ['almuerzo'], breakfast: ['desayuno'], dinner: ['cena'], coffee: ['cafe', 'cafeteria'], juice: ['jugo', 'jugos'], dessert: ['postre'], seafood: ['mariscos'], pizza: ['pizza'], burger: ['hamburguesa'], burgers: ['hamburguesa'],
    dominican: ['dominicana'], dominicano: ['dominicana'], mexican: ['mexicana'], mexicano: ['mexicana'], puerto: ['puertorriquena'], boricua: ['puertorriquena'], colombian: ['colombiana'], colombiano: ['colombiana'], peruvian: ['peruana'], peruano: ['peruana'], salvadoran: ['salvadorena'], venezuelan: ['venezolana'],
    car: ['carro', 'auto'], cars: ['carro', 'auto'], carro: ['auto', 'carro'], truck: ['pickup', 'camioneta'], dealer: ['dealer', 'venta'],
  };
  const PHR = [['new york', 'nueva york'], ['car wash', 'lavado'], ['oil change', 'cambio de aceite'], ['hair cut', 'corte'], ['food pantry', 'despensa'], ['real estate', 'bienes raices'], ['check engine', 'check engine']];
  const STOP = new Set('de del la las el los en para por un una unos que y o con a al mi me lo le se hay donde busco buscando quiero necesito alguien algun alguna algo tenga tengan acepte acepten aceptan acepta the an for in of with i need want looking that takes take accepts accept to near my some any where who is are and or cerca'.split(' '));
  const INT = [
    ['open', ['abierto ahora', 'abierta ahora', 'abiertos ahora', 'abiertas ahora', 'abierto', 'abierta', 'abiertos', 'open now', 'open'], ['Abierto ahora', 'Open now'], 'bz'],
    ['near', ['cerca de mi', 'cerca de aqui', 'near me', 'nearby', 'close by'], ['A menos de 1 mi', 'Under 1 mi'], 'bz'],
    ['ver', ['verificados', 'verificado', 'verificada', 'verificadas', 'verified'], ['Verificado', 'Verified'], 'bz'],
    ['dlv', ['con delivery', 'with delivery', 'delivery'], ['Delivery', 'Delivery'], 'bz'],
    ['pk', ['para recoger', 'pickup', 'pick up'], ['Pickup', 'Pickup'], 'bz'],
    ['walk', ['sin cita', 'sin turno', 'walk in', 'walkin', 'no appointment'], ['Sin cita', 'Walk-in'], 'bz'],
    ['casa', ['a domicilio', 'a mi casa', 'en mi casa', 'at home', 'comes to you', 'mobile'], ['A domicilio', 'Comes to you'], 'bz'],
    ['h24', ['24 horas', '24 hours', '24 7', '24/7', 'emergencia', 'emergency'], ['24 horas', '24 hours'], 'bz'],
    ['esp', ['que hable espanol', 'habla espanol', 'hablan espanol', 'en espanol', 'speaks spanish', 'in spanish', 'espanol', 'spanish'], ['Habla español', 'Speaks Spanish'], 'bz'],
    ['medicaid', ['medicaid'], ['Acepta Medicaid', 'Takes Medicaid'], 'bz'],
    ['medicare', ['medicare'], ['Acepta Medicare', 'Takes Medicare'], 'bz'],
    ['chip', ['chip'], ['Acepta CHIP', 'Takes CHIP'], 'bz'],
    ['sinssn', ['sin seguro social', 'sin social', 'sin ssn', 'no ssn', 'without ssn'], ['Sin seguro social', 'No SSN'], 'bz'],
    ['sinseg', ['sin seguro', 'no insurance', 'uninsured'], ['Sin seguro', 'Uninsured'], 'bz'],
    ['tonight', ['esta noche', 'hoy en la noche', 'tonight'], ['Esta noche', 'Tonight'], 'ev'],
    ['wknd', ['este fin de semana', 'fin de semana', 'este finde', 'this weekend', 'weekend'], ['Este fin de semana', 'This weekend'], 'ev'],
    ['today', ['hoy', 'today'], ['Hoy', 'Today'], 'ev'],
    ['free', ['gratis', 'free', 'sin cover'], ['Gratis', 'Free'], 'both'],
    ['best', ['mejor calificados', 'mejores', 'mejor', 'best', 'top'], ['Mejor calificados', 'Top rated'], 'sort'],
    ['cheap', ['baratos', 'barato', 'barata', 'economico', 'cheap'], ['Más barato primero', 'Cheapest first'], 'sort'],
  ];
  const ILBL = {}; INT.forEach(i => { ILBL[i[0]] = i[2]; });
  const IPH = []; INT.forEach(i => i[1].forEach(p => IPH.push([p, i]))); IPH.sort((a, b) => b[0].length - a[0].length);
  const T = (b, ks) => ks.some(k => (b.tags || []).includes(k));
  const BZ = { open: b => !!b.open, near: b => b.d != null && b.d <= 1, ver: b => !!b.verified, dlv: b => T(b, ['delivery', 'envio']), pk: b => T(b, ['pickup']), walk: b => T(b, ['walkin', 'walk']), casa: b => T(b, ['domicilio']) || (!!b.zone && !b.d), h24: b => T(b, ['h24', '24h']), esp: b => T(b, ['esp', 'medesp']), medicaid: b => T(b, ['medicaid']), medicare: b => T(b, ['medicare']), chip: b => T(b, ['chip']), sinseg: b => T(b, ['sinseguro', 'escala']), sinssn: b => T(b, ['sinssn', 'itin']), free: b => T(b, ['gratis', 'sincover', 'gratis1', 'diagfree', 'presfree']) };
  const evFree = e => !!e.free || !(e.tks || []).some(t => t.p > 0);
  const EV = { tonight: e => e.d === 0, today: e => e.d === 0, wknd: e => e.d === 2 || e.d === 3, free: evFree };

  let IDX = null;
  function build() {
    const A = window.TLAll && window.TLAll.B; if (!A || !A.length) return null;
    const catOf = {}, catB = {}, hasTag = {};
    CATS.forEach(c => { const BB = window[c.b]; catB[c.k] = (BB && BB.B) || []; catB[c.k].forEach(b => { catOf[b.id] = c.k; }); });
    const byId = {}, biz = [];
    A.forEach(b => {
      const k = catOf[b.id] || (b.bell ? 'NEG-BELL' : b.auto ? 'NEG-AUTO' : b.hogar ? 'NEG-HOGAR' : null); if (!k || b.admHidden) return;
      const c = CAT[k];
      const e = { id: b.id, b, cat: k, c, fN: F(b.name), subs: (b.subs || []).map(s => ({ s, f: F(s) })), fC: F(c.es + ' ' + c.en + ' ' + c.s + ' ' + c.se), fX: F([b.offer, b.offerEn, b.fee, b.feeEn, b.eta, b.etaEn, b.addr, b.cat, b.catEn, (b.ins || []).join(' ')].filter(Boolean).join(' · ')), items: [], seat: !!b.at };
      if ((b.tags || []).some(t => t === 'esp' || t === 'medesp')) hasTag[k] = 1;
      byId[b.id] = e; biz.push(e);
    });
    biz.forEach(e => { if (e.b.at && byId[e.b.at]) e.parent = byId[e.b.at]; });
    const items = [];
    const addItem = (bid, it) => { const e = byId[bid]; if (!e || !it.name) return; it.biz = e; it.fN = F(it.name + (it.nameEn && it.nameEn !== it.name ? ' ' + it.nameEn : '')); it.fD = F(it.desc || ''); e.items.push(it); items.push(it); };
    const M = window.TLMenu;
    if (M && M.CATS) M.CATS.forEach(sec => (sec.items || []).forEach(it => addItem('sabor-dominicano', { id: 'm:' + it.id, name: it.es, nameEn: it.en, desc: it.ds, descEn: it.de, p: it.p, ph: it.ph, sec: [sec.es, sec.en], kind: 'dish', dish: it.id, ago: !!it.ago })));
    ['TLBellL', 'TLAutoL', 'TLHogarL', 'TLSaludL', 'TLProL', 'TLFiestaL', 'TLMercL', 'TLNocheL', 'TLTienda', 'TLTransL', 'TLEduL'].forEach(K => {
      const S = window[K] && window[K].SVC; if (!S) return;
      Object.keys(S).forEach(bid => (Array.isArray(S[bid]) ? S[bid] : []).forEach((sec, si) => (Array.isArray(sec) && Array.isArray(sec[2]) ? sec[2] : []).forEach((x, j) => {
        const it = Array.isArray(x) ? { name: x[0], desc: typeof x[1] === 'string' ? x[1] : '', p: typeof x[2] === 'number' ? x[2] : null } : { name: x.n, nameEn: x.ne, desc: x.d, descEn: x.de, p: typeof x.p === 'number' ? x.p : null, ph: x.ph, k: x.k };
        it.id = bid + ':' + si + ':' + j; it.sec = [sec[0], sec[1]]; it.kind = 'svc'; addItem(bid, it);
      })));
    });
    const EVs = ((window.TLEvt && window.TLEvt.E) || []).filter(e => !(window.TLAdm && window.TLAdm.evtHidden(e.id))).map(e => ({ id: e.id, e, fN: F(e.ti[0] + ' ' + e.ti[1]), fX: F([(e.gen || []).join(' '), e.type, e.venue, e.org && e.org.n].filter(Boolean).join(' ')) }));
    const POSTS = ((window.TLCom && window.TLCom.POSTS) || []).filter(p => !(window.TLAdm && window.TLAdm.postHidden(p.id))).map(p => ({ id: p.id, p, fN: F(p.es + ' ' + p.en), fX: F((p.cm || []).map(c => c.es).join(' ')) }));
    const subs = [];
    CATS.forEach(c => { const D = window[c.d] || {}; (D.SUBS || []).forEach(s => { const bs = catB[c.k].filter(b => (b.subs || []).includes(s)); const ph = (D.SUBPH && D.SUBPH[s]) ? PH(D.SUBPH[s], 300) : bs[0] ? unurl(bs[0].photos && bs[0].photos[0]) : ''; subs.push({ cat: c.k, c, s, f: F(s), n: bs.length, ph }); }); });
    const vocab = new Set(); const addV = f => f.w.forEach(w => { if (w.length >= 4 && !/^\d+$/.test(w)) vocab.add(w); });
    biz.forEach(e => { addV(e.fN); e.subs.forEach(x => addV(x.f)); }); items.forEach(it => addV(it.fN)); subs.forEach(x => addV(x.f)); CATS.forEach(c => addV(F(c.es + ' ' + c.en))); Object.keys(SYN).forEach(k => { if (k.length >= 4) vocab.add(k); });
    IDX = { n: A.length, biz, byId, items, EVs, POSTS, subs, catB, hasTag, vocab: Array.from(vocab) };
    return IDX;
  }
  const idx = () => (IDX && window.TLAll && IDX.n === window.TLAll.B.length) ? IDX : build();

  function clean(q) { let n = ' ' + N(q).replace(/[^a-z0-9/ ]+/g, ' ').replace(/\s+/g, ' ').trim() + ' '; PHR.forEach(([a, b]) => { n = n.split(' ' + a + ' ').join(' ' + b + ' '); }); return n; }
  const stem = w => w.length > 5 && w.endsWith('es') ? w.slice(0, -2) : w.length > 4 && w.endsWith('s') ? w.slice(0, -1) : w;
  function parse(q, live) {
    let n = clean(q); const intents = [];
    IPH.forEach(([p, it]) => { const pat = ' ' + p + ' '; let i = n.indexOf(pat); while (i >= 0) { if (!intents.some(x => x.k === it[0])) intents.push({ k: it[0], phrase: p, l: it[2], t: it[3] }); n = n.slice(0, i + 1) + n.slice(i + pat.length); i = n.indexOf(pat); } });
    const words = W(n).filter(w => !STOP.has(w));
    const groups = words.map((w, i) => { const s = stem(w), a = [w]; if (s !== w) a.push(s); const AS = (window.TLAdm && window.TLAdm.syn) ? window.TLAdm.syn() : null; const synOf = k => (AS && AS[k] !== undefined) ? (AS[k] || []) : (SYN[k] || []); (synOf(w).length ? synOf(w) : synOf(s)).forEach(x => { if (!a.includes(x)) a.push(x); }); return { w, a, pre: !!live && i === words.length - 1 && / $/.test(q) === false }; });
    return { intents, groups, words };
  }
  function m(g, f) {
    if (!f || !f.n) return 0;
    for (const a of g.a) { if (a.indexOf(' ') >= 0) { if ((' ' + f.n.replace(/[^a-z0-9]+/g, ' ') + ' ').indexOf(' ' + a) >= 0) return 2; } else if (a.length <= 2 ? f.w.includes(a) : (a.length >= 5 || g.pre) ? f.w.some(x => x.startsWith(a)) : f.w.some(x => x === a || x === a + 's' || x === a + 'es')) return 2; }
    const a = g.w; if (a.length >= 5 && f.w.some(x => x.length >= a.length - 1 && (lev(x.slice(0, a.length), a) <= 1 || lev(x, a) <= 1))) return 1;
    return 0;
  }
  function hl(orig, groups) {
    orig = String(orig || ''); const n = N(orig); let best = null;
    (groups || []).forEach(g => g.a.forEach(a => { let i = -1, from = 0; while ((i = n.indexOf(a, from)) >= 0) { if (i === 0 || !/[a-z0-9]/.test(n[i - 1])) break; from = i + 1; } if (i >= 0 && (!best || a.length > best[1])) best = [i, a.length]; }));
    if (!best) (groups || []).forEach(g => { const a = g.w; if (a.length < 5 || best) return; const re = /[a-z0-9]+/g; let mm; while ((mm = re.exec(n))) { if (mm[0].length >= a.length - 1 && (lev(mm[0].slice(0, a.length), a) <= 1 || lev(mm[0], a) <= 1)) { best = [mm.index, lev(mm[0], a) <= 1 ? mm[0].length : Math.min(a.length, mm[0].length)]; break; } } });
    return best ? [orig.slice(0, best[0]), orig.slice(best[0], best[0] + best[1]), orig.slice(best[0] + best[1])] : [orig, '', ''];
  }
  const rot = id => { let h = 2166136261; const s = id + '2026-09-24'; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967295; };

  function run(q, o) {
    o = o || {}; const X = idx(); if (!X) return null;
    const P = parse(q, o.live), G = P.groups, hasText = G.length > 0, phr = G.length > 1 ? G.map(g => g.w).join(' ') : '';
    const inP = f => phr && (' ' + f.n.replace(/[^a-z0-9]+/g, ' ') + ' ').indexOf(' ' + phr) >= 0;
    const keys = Array.from(new Set(P.intents.map(i => i.k).concat(o.qf || [])));
    const bzK = keys.filter(k => BZ[k]), evK = keys.filter(k => EV[k]), sortK = o.sort && o.sort !== 'rel' ? o.sort : keys.includes('best') ? 'best' : 'rel';
    const RAD = o.rad != null ? o.rad : (window.TLLoc && window.TLLoc.rad) || 99;
    const passB = e => (!o.cat || e.cat === o.cat) && (e.b.d == null || e.b.d <= RAD) && bzK.every(k => k === 'esp' && !X.hasTag[e.cat] ? true : BZ[k](e.b));
    const biz = [], orB = [];
    X.biz.forEach(e => {
      if (!passB(e)) return;
      if (!hasText) { biz.push({ e, sc: 1 + (e.b.open ? .5 : 0), why: null }); return; }
      let tot = 0, hit = 0, why = null, whyRank = 0;
      G.forEach(g => {
        let best = 0, w = null, wr = 0; const nm = m(g, e.fN); if (nm) { best = nm === 2 ? 10 : 6; w = null; wr = 0; }
        e.subs.forEach(x => { const r = m(g, x.f); if (r && (r === 2 ? 7 : 4) > best) { best = r === 2 ? 7 : 4; w = { k: 'sub', s: x.s }; wr = 2; } });
        if (m(g, e.fC) && 4 > best) { best = 4; w = { k: 'cat' }; wr = 1; }
        let ib = 0, iw = null; for (const it of e.items) { const r = m(g, it.fN); if (r === 2) { ib = 6; iw = it; break; } if (r === 1 && ib < 3) { ib = 3; iw = it; } }
        if (ib > best) { best = ib; w = { k: 'item', it: iw }; wr = 3; }
        if (!best && m(g, e.fX)) { best = 2; w = { k: 'x' }; wr = 1; }
        if (best) { hit++; tot += best; if (w && wr >= whyRank) { why = w; whyRank = wr; } }
      });
      if (phr) { const pi = e.items.find(it => inP(it.fN)); if (pi) { tot += 12; why = { k: 'item', it: pi }; } else if (inP(e.fN)) tot += 12; else if (inP(e.fX)) { tot += 6; why = why && why.k === 'item' ? why : { k: 'x' }; } }
      if (hit === G.length) biz.push({ e, sc: tot + (e.b.open ? .5 : 0) + (e.fN.n.startsWith(G[0].w) ? 3 : 0), why });
      else if (hit) orB.push({ e, sc: tot, hit, why, partial: true });
    });
    const items = [];
    if (hasText) X.items.forEach(it => { const e = it.biz; if (!passB(e)) return; let tot = 0, own = 0, ok = true; G.forEach(g => { const a = m(g, it.fN), d = a ? 0 : m(g, it.fD), bb = a || d ? 0 : m(g, e.fN); if (a) { tot += a === 2 ? 10 : 5; own++; } else if (d) { tot += 3; own++; } else if (bb) tot += 1; else ok = false; }); if (ok && own) items.push({ it, sc: tot + (it.p != null ? 0 : -1) + (inP(it.fN) ? 12 : 0) }); });
    let events = [];
    if (!o.cat) { if (hasText) X.EVs.forEach(v => { let ok = true, tot = 0; G.forEach(g => { const a = m(g, v.fN) || 0, b = a ? 0 : m(g, v.fX); if (a) tot += 8; else if (b) tot += 4; else ok = false; }); if (ok) events.push({ v, sc: tot }); }); else if (evK.length) X.EVs.forEach(v => events.push({ v, sc: 1 })); }
    events = events.filter(x => evK.every(k => EV[k](x.v.e))).sort((a, b) => b.sc - a.sc || a.v.e.d - b.v.e.d);
    const posts = [];
    if (hasText && !o.cat) X.POSTS.forEach(v => { let ok = true, tot = 0; G.forEach(g => { const a = m(g, v.fN), b = a ? 0 : m(g, v.fX); if (a) tot += 6; else if (b) tot += 2; else ok = false; }); if (ok) posts.push({ v, sc: tot + (v.p.up - v.p.dn) / 40 }); });
    posts.sort((a, b) => b.sc - a.sc);
    const subs = [];
    if (hasText) X.subs.forEach(x => { if (o.cat && x.cat !== o.cat) return; let own = 0, ok = true, st = 0; G.forEach((g, gi) => { if (m(g, x.f) === 2) { own++; if (gi === 0 && g.a.some(a => x.f.n.startsWith(a))) st = 5; } else if (!m(g, F(x.c.es + ' ' + x.c.en + ' ' + x.c.s))) ok = false; }); if (ok && own) subs.push({ x, sc: own * 10 + st + Math.min(x.n, 20) / 10 }); });
    subs.sort((a, b) => b.sc - a.sc);
    const emptySubs = subs.filter(x => !x.x.n); for (let i = subs.length - 1; i >= 0; i--) if (!subs[i].x.n) subs.splice(i, 1);
    const emptyFirst = !!emptySubs[0] && (!subs[0] || emptySubs[0].sc > subs[0].sc);
    const cats = hasText ? CATS.filter(c => (!o.cat || c.k === o.cat) && G.every(g => m(g, F(c.es + ' ' + c.en + ' ' + c.s + ' ' + c.se)) === 2)) : [];
    const cmp = (a, b) => sortK === 'near' ? ((a.e.b.d == null ? 99 : a.e.b.d) - (b.e.b.d == null ? 99 : b.e.b.d)) : sortK === 'best' ? (((b.e.b.n >= 5 ? b.e.b.r : 0) - (a.e.b.n >= 5 ? a.e.b.r : 0)) || b.e.b.n - a.e.b.n) : (Math.round(b.sc) - Math.round(a.sc) || rot(a.e.id) - rot(b.e.id));
    const pro = biz.filter(x => x.e.b.pro).sort(cmp), free = biz.filter(x => !x.e.b.pro).sort(cmp);
    let partial = false, bizAll = pro.concat(free);
    if (hasText && !bizAll.length && !items.length && !subs.length && orB.length) { partial = true; bizAll = orB.sort((a, b) => b.hit - a.hit || b.sc - a.sc).slice(0, 20); }
    if (keys.includes('cheap')) items.sort((a, b) => (a.it.p == null ? 1e6 : a.it.p) - (b.it.p == null ? 1e6 : b.it.p)); else items.sort((a, b) => b.sc - a.sc || (a.it.biz.b.d || 9) - (b.it.biz.b.d || 9));
    const tally = {}; bizAll.slice(0, 12).forEach(x => { tally[x.e.cat] = (tally[x.e.cat] || 0) + x.sc; }); subs.slice(0, 2).forEach(x => { tally[x.x.cat] = (tally[x.x.cat] || 0) + 30; }); if (emptyFirst) tally[emptySubs[0].x.cat] = (tally[emptySubs[0].x.cat] || 0) + 80; cats.forEach(c => { tally[c.k] = (tally[c.k] || 0) + 40; });
    const tsum = Object.keys(tally).reduce((s, k) => s + tally[k], 0); let dom = o.cat || null;
    if (!dom && hasText) Object.keys(tally).forEach(k => { if (tally[k] / tsum >= .5 && (!dom || tally[k] > tally[dom])) dom = k; });
    let dym = null;
    if (hasText && !bizAll.length && !items.length && !events.length && !posts.length) {
      const fix = P.words.map(w => { if (STOP.has(w) || X.vocab.some(v => v.startsWith(w))) return w; let bw = null, bd = 3; X.vocab.forEach(v => { if (Math.abs(v.length - w.length) > 2) return; const d = lev(v, w); if (d < bd) { bd = d; bw = v; } }); return bd <= 2 ? bw : w; });
      if (fix.join(' ') !== P.words.join(' ')) dym = fix.join(' ');
    }
    return { P, keys, hasText, emptySubs, emptyFirst, biz: bizAll, nPro: partial ? bizAll.filter(x => x.e.b.pro).length : pro.length, items, events, posts, subs, cats, dom, partial, dym, sort: sortK };
  }
  function strip(q, phrase) { const n = N(q); const re = new RegExp('(^|[^a-z0-9])' + phrase.replace(/[^a-z0-9 ]/g, '.').replace(/ /g, '[^a-z0-9]+') + '(?=$|[^a-z0-9])'); const mm = re.exec(n); if (!mm) return q; const i = mm.index + mm[1].length; return (q.slice(0, i) + q.slice(i + mm[0].length - mm[1].length)).replace(/\s+/g, ' ').trim(); }

  const TREND = [['mofongo', 'mofongo', 'NEG-FOOD'], ['barbería sin cita', 'walk-in barber', 'NEG-BELL'], ['dentista que acepte Medicaid', 'dentist that takes Medicaid', 'NEG-SALUD'], ['frenos', 'brakes', 'NEG-AUTO'], ['van a Nueva York', 'van to New York', 'NEG-TRANS'], ['bachata esta noche', 'bachata tonight', 'NEG-NOCHE'], ['impuestos ITIN', 'ITIN taxes', 'NEG-PRO'], ['pan de agua', 'pan de agua', 'NEG-FOOD']];
  const EXAMPLES = [['barbería sin cita abierta ahora', 'walk-in barber open now'], ['dentista que acepte Medicaid', 'dentist that takes Medicaid'], ['mofongo con delivery', 'mofongo with delivery'], ['plomero 24 horas', 'plumber 24 hours'], ['bachata esta noche', 'bachata tonight']];
  window.TLSearch = { N, F, PH, unurl, CATS, CAT, ILBL, BZ, idx, parse, run, hl, strip, TREND, EXAMPLES, SYN, reset: () => { IDX = null; } };
})();
