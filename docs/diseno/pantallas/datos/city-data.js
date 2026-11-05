/* To'Latino · ciudad que estás viendo (APP-CIUDAD). Ciudades, barrios de Hazleton, pueblos cercanos y cálculo de distancias.
   "Ciudad que estoy viendo" (header) cambia libre y filtra Negocios, Eventos y Buscar. "Mi ciudad" (comunidad) va aparte, cada 30 días.
   Los negocios del prototipo solo traen `d` (millas desde el centro); aquí reciben una posición estable para recalcular `d` desde otro punto. */
(function () {
  const C0 = [40.9584, -75.9746]; // Broad St y Wyoming St
  const CITIES = [
    { k: 'hzl', n: 'Hazleton, PA', st: 'on', ll: C0, zip: ['18201', '18202'] },
    { k: 'alw', n: 'Allentown, PA', st: 'soon', ll: [40.6023, -75.4714], wait: 1284, ready: 31, goal: 50, ph: 7822978, asks: [['Comida dominicana', 'Dominican food'], ['Barbería', 'Barbershop'], ['Envíos a RD', 'Shipping to the DR'], ['Iglesia en español', 'Spanish-language church']] },
    { k: 'rdg', n: 'Reading, PA', st: 'soon', ll: [40.3356, -75.9269], wait: 932, ready: 18, goal: 50, asks: [['Comida puertorriqueña', 'Puerto Rican food'], ['Taller mecánico', 'Auto repair'], ['Impuestos e ITIN', 'Taxes & ITIN'], ['Salón de belleza', 'Beauty salon']] },
  ];
  /* El Super Admin (tl-adm-v1.city) puede abrir una ciudad o cambiar su lista de espera */
  (function adm() { let o = null; try { o = JSON.parse(localStorage.getItem('tl-adm-v1') || 'null'); } catch (e) {} const c = o && o.city || {}; CITIES.forEach(x => { const a = c[x.k]; if (!a) return; if (a.st) x.st = a.st; if (a.ready != null) x.ready = a.ready; if (a.goal != null) x.goal = a.goal; x.adm = a; }); })();
  const ZONES = [
    { k: 'centro', n: ['Centro de Hazleton', 'Downtown Hazleton'], s: ['Broad St y Wyoming St', 'Broad St & Wyoming St'], ll: C0 },
    { k: 'north', n: ['North End', 'North End'], s: ['Alrededor de N Wyoming St', 'Around N Wyoming St'], ll: [40.9706, -75.9752] },
    { k: 'alter', n: ['Alter St · South Side', 'Alter St · South Side'], s: ['Alter St y E Diamond Ave', 'Alter St & E Diamond Ave'], ll: [40.9522, -75.9688] },
    { k: 'heights', n: ['The Heights', 'The Heights'], s: ['Lado este, por Grant St', 'East side, by Grant St'], ll: [40.9603, -75.9572] },
    { k: 'west', n: ['West Hazleton', 'West Hazleton'], s: ['Broad St oeste', 'West Broad St'], ll: [40.9587, -75.9963] },
    { k: 'twp', n: ['Hazle Township', 'Hazle Township'], s: ['Route 309 y Airport Rd', 'Route 309 & Airport Rd'], ll: [40.9845, -75.9455] },
  ];
  const GPS = { ll: [40.9689, -75.9771], zone: 'north' };
  const ADDR_LL = { a1: [40.9529, -75.9790], a2: [40.9318, -76.0412], a3: [40.9531, -75.9684] };
  const TOWNS = [['Hazleton', C0], ['West Hazleton', [40.9587, -75.9963]], ['Hazle Township', [40.9845, -75.9455]], ['McAdoo', [40.9012, -75.9913]], ['Freeland', [41.0167, -75.8971]], ['Conyngham', [40.9920, -76.0574]], ['Drums', [41.0290, -75.9900]], ['Weatherly', [40.9420, -75.8285]], ['White Haven', [41.0606, -75.7746]], ['Tamaqua', [40.7973, -75.9691]], ['Shenandoah', [40.8201, -76.2008]], ['Mountain Top', [41.1695, -75.8774]], ['Nescopeck', [41.0537, -76.2205]], ['Jim Thorpe', [40.8759, -75.7324]], ['Frackville', [40.7840, -76.2302]], ['Berwick', [41.0545, -76.2333]], ['Wilkes-Barre', [41.2459, -75.8813]], ['Pottsville', [40.6856, -76.1955]]];
  const ASK = ['Bethlehem, PA', 'Lancaster, PA', 'Scranton, PA', 'Wilkes-Barre, PA', 'Philadelphia, PA', 'Lebanon, PA', 'York, PA', 'Pottsville, PA', 'Paterson, NJ', 'Passaic, NJ', 'Perth Amboy, NJ', 'Lawrence, MA', 'Providence, RI', 'Bridgeport, CT', 'Washington Heights, NY', 'Kissimmee, FL', 'Orlando, FL'];
  const RADII = [2, 5, 10, 30];
  const mi = (a, b) => { const dy = (a[0] - b[0]) * 69.05, dx = (a[1] - b[1]) * 69.05 * Math.cos((a[0] + b[0]) / 2 * Math.PI / 180); return Math.sqrt(dx * dx + dy * dy); };
  const r1 = x => Math.round(x * 10) / 10;
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967295; };
  const pos = b => { if (b._ll) return b._ll; const d0 = b._d0 != null ? b._d0 : b.d; if (d0 == null) return null; const t = hash(b.id) * Math.PI * 2; b._ll = [C0[0] + d0 * Math.sin(t) / 69.05, C0[1] + d0 * Math.cos(t) / (69.05 * Math.cos(C0[0] * Math.PI / 180))]; return b._ll; };
  const ALL = () => (window.TLAll && window.TLAll.B) || [];
  const city = k => CITIES.find(c => c.k === k) || CITIES[0];
  function center(loc) { const l = loc || {}; if (l.city && l.city !== 'hzl') return city(l.city).ll; if (l.ctr === 'gps') return GPS.ll; if (l.ctr && ADDR_LL[l.ctr]) return ADDR_LL[l.ctr]; const z = ZONES.find(x => x.k === l.ctr); return z ? z.ll : C0; }
  function apply(loc) { const c = center(loc), soon = loc && loc.city && loc.city !== 'hzl'; ALL().forEach(b => { if (b._d0 === undefined) b._d0 = b.d; if (b._d0 == null) return; const p = pos(b); b.d = soon ? b._d0 : r1(Math.max(.1, mi(p, c))); }); window.TLLoc = Object.assign({ city: 'hzl', ctr: 'centro', rad: 5 }, loc || {}); }
  const inRad = (b, rad) => b.d == null ? true : b.d <= rad; // a domicilio (sin dirección) llega a tu zona: siempre cuenta
  function counts(loc) { const l = Object.assign({ city: 'hzl', ctr: 'centro', rad: 5 }, loc || {}); if (l.city !== 'hzl') return { biz: 0, evt: 0, pro: 0 }; const c = center(l); let biz = 0, pro = 0; ALL().forEach(b => { if (b.at) return; const p = pos(b); const d = p ? mi(p, c) : null; if (d == null || d <= l.rad) { biz++; if (b.pro) pro++; } }); const ev = ((window.TLEvt && window.TLEvt.E) || []).filter(e => parseFloat(e.dist) <= l.rad + .01).length; return { biz, pro, evt: ev }; }
  function towns(loc) { const c = center(loc), rad = (loc && loc.rad) || 5; return TOWNS.map(([n, ll]) => ({ n, d: mi(ll, c) })).filter(t => t.d <= rad + .3).sort((a, b) => a.d - b.d); }
  function dots(loc) { return ALL().filter(b => !b.at).map(b => ({ b, p: pos(b) })).filter(x => x.p); }
  function find(q) { const N = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); const n = N(q).trim(); if (!n) return []; const out = [];
    CITIES.forEach(c => { if (N(c.n).includes(n) || (c.zip || []).some(z => z.startsWith(n))) out.push({ k: 'city', c }); });
    ZONES.forEach(z => { if (N(z.n[0]).includes(n) || N(z.s[0]).includes(n)) out.push({ k: 'zone', z }); });
    TOWNS.forEach(([t, ll]) => { if (t !== 'Hazleton' && t !== 'West Hazleton' && t !== 'Hazle Township' && N(t).includes(n)) out.push({ k: 'town', t, ll, d: mi(ll, C0) }); });
    ASK.forEach(a => { if (N(a).includes(n) && !CITIES.some(c => c.n === a) && !out.some(o => o.k === 'town' && a.startsWith(o.t))) out.push({ k: 'ask', a }); });
    if (!out.length && n.length >= 3) out.push({ k: 'ask', a: q.trim() });
    return out.slice(0, 7); }
  /* Mapa: teselas de Esri World Street Map a la escala exacta para que el radio mida `px` en pantalla. */
  function view(ll, rad, px) { const mpp = rad * 1609.34 / px, zf = Math.log2(156543.03392 * Math.cos(ll[0] * Math.PI / 180) / mpp), z = Math.max(3, Math.min(17, Math.floor(zf))), sc = Math.pow(2, zf - z); return { z, sc, zf }; }
  function proj(ll, z) { const n = Math.pow(2, z), la = ll[0] * Math.PI / 180; return [(ll[1] + 180) / 360 * n * 256, (1 - Math.log(Math.tan(la) + 1 / Math.cos(la)) / Math.PI) / 2 * n * 256]; }
  function tiles(ll, z, w, h, sc) { const [cx, cy] = proj(ll, z), hw = w / 2 / sc + 256, hh = h / 2 / sc + 256, x0 = Math.floor((cx - hw) / 256), x1 = Math.floor((cx + hw) / 256), y0 = Math.floor((cy - hh) / 256), y1 = Math.floor((cy + hh) / 256), out = [];
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) out.push({ key: z + '/' + x + '/' + y, src: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/' + z + '/' + y + '/' + x, left: x * 256 - cx, top: y * 256 - cy }); return out; }
  window.TLCity = { C0, CITIES, ZONES, GPS, ADDR_LL, TOWNS, RADII, ASK, city, center, apply, counts, towns, dots, find, mi, r1, pos, view, proj, tiles, inRad };
  let saved = null; try { saved = JSON.parse(localStorage.getItem('tl-loc-v1')); } catch (e) {}
  (function boot(n) { if (!ALL().length && n < 100) return setTimeout(() => boot(n + 1), 60); apply(saved || {}); })(0);
})();
